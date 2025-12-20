// src/components/chatbot/reviewFlowStore.ts
import type { ReviewWorkItem } from "./reviewerDeskTypes";

/**
 * Mock 전용: Creator ↔ Reviewer ↔ Edu 연결 저장소
 */

export type PublishedEduVideo = {
  id: string; // "edu-<contentId>"
  sourceContentId: string; // CreatorWorkItem.id
  title: string;
  videoUrl: string;
  publishedAt: string; // ISO
  contentCategory?: string;
};

type Listener = () => void;

let hydrated = false;

const reviewItemsById = new Map<string, ReviewWorkItem>();
const reviewListeners = new Set<Listener>();

/**
 * useSyncExternalStore 호환: getSnapshot은 "항상 같은 참조"를 반환해야 한다.
 * - reviewItemsSnapshot / publishedEduVideos는 변경 시에만 새 배열로 교체한다.
 */
let reviewItemsSnapshot: ReviewWorkItem[] = [];

// let + 불변 업데이트(변경 시에만 새 배열 생성)
let publishedEduVideos: PublishedEduVideo[] = [];
const eduListeners = new Set<Listener>();

function emitReview() {
  reviewListeners.forEach((l) => l());
}

function emitEdu() {
  eduListeners.forEach((l) => l());
}

function isoNow() {
  return new Date().toISOString();
}

function randId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

function toMs(iso: unknown): number | undefined {
  if (typeof iso !== "string") return undefined;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : undefined;
}

/**
 * Creator(useCreatorStudioController)의 applyReviewStoreSync가
 * 숫자(ms) 기반 키(reviewedAt/updatedAt)를 읽을 수 있도록 보강한다.
 *
 * - ReviewWorkItem 타입을 건드리지 않고(외부 타입 의존),
 *   런타임에만 추가 필드를 주입한다.
 */
function normalizeForCreatorSync(item: ReviewWorkItem): ReviewWorkItem {
  const base = item as unknown as Record<string, unknown>;

  // 정렬/표시용 최신 시각 후보(ISO) → ms
  const lastUpdatedIso =
    (base["lastUpdatedAt"] as unknown) ??
    (base["updatedAt"] as unknown) ??
    (base["submittedAt"] as unknown) ??
    (base["createdAt"] as unknown);

  const updatedAtMs =
    typeof base["updatedAt"] === "number"
      ? (base["updatedAt"] as number)
      : toMs(lastUpdatedIso) ?? Date.now();

  // 결정 시각(승인/반려) → ms
  const decisionIso =
    (base["approvedAt"] as unknown) ??
    (base["rejectedAt"] as unknown) ??
    (base["reviewedAt"] as unknown);

  const reviewedAtMs =
    typeof base["reviewedAt"] === "number"
      ? (base["reviewedAt"] as number)
      : toMs(decisionIso);

  // Creator 쪽 reviewCommentOf가 잡을 수 있는 키들 중 하나라도 채워주면 좋음(있으면 유지)
  const comment =
    (typeof base["comment"] === "string" && (base["comment"] as string).trim()) ||
    (typeof base["rejectReason"] === "string" && (base["rejectReason"] as string).trim()) ||
    (typeof base["rejectedComment"] === "string" && (base["rejectedComment"] as string).trim()) ||
    (typeof base["reviewerComment"] === "string" && (base["reviewerComment"] as string).trim()) ||
    (typeof base["note"] === "string" && (base["note"] as string).trim()) ||
    "";

  const out: Record<string, unknown> = {
    ...base,
    updatedAt: updatedAtMs, // Creator: readNum("updatedAt")
  };

  // 결정이 있는 경우에만 reviewedAt 세팅 (Creator: readNum("reviewedAt"))
  if (typeof reviewedAtMs === "number" && reviewedAtMs > 0) {
    out.reviewedAt = reviewedAtMs;
  }

  // 코멘트가 있으면 Creator가 읽을 수 있는 키들에 “동일 값”을 한 번 더 주입
  if (comment) {
    out.comment = out.comment ?? comment;
    out.rejectReason = out.rejectReason ?? comment;
    out.rejectedComment = out.rejectedComment ?? comment;
    out.reviewerComment = out.reviewerComment ?? comment;
    out.note = out.note ?? comment;
  }

  return out as unknown as ReviewWorkItem;
}

/** 스냅샷 캐시 재빌드(변경 시에만 호출) */
function rebuildReviewSnapshot() {
  // submittedAt/createdAt 기준 내림차순
  reviewItemsSnapshot = Array.from(reviewItemsById.values()).sort((a, b) => {
    const ta = (a.submittedAt ?? a.createdAt) || "";
    const tb = (b.submittedAt ?? b.createdAt) || "";
    return tb.localeCompare(ta);
  });
}

/**
 * ReviewerApiMock 초기 seed를 1회만 적재
 */
export function hydrateReviewStoreOnce(items: ReviewWorkItem[]) {
  if (hydrated) return;

  items.forEach((it) => {
    const normalized = normalizeForCreatorSync(it);
    reviewItemsById.set(normalized.id, normalized);
  });

  hydrated = true;
  rebuildReviewSnapshot();
  emitReview();
}

export function subscribeReviewStore(listener: Listener) {
  reviewListeners.add(listener);
  return () => {
    reviewListeners.delete(listener);
  };
}

/**
 *    "매 호출마다 새 배열 생성" 금지
 */
export function listReviewItemsSnapshot(): ReviewWorkItem[] {
  return reviewItemsSnapshot;
}

export function getReviewItemSnapshot(id: string) {
  return reviewItemsById.get(id);
}

/**
 * upsert 시점에:
 * 1) Creator sync용 보강 필드 주입(updatedAt/reviewedAt/comment 등)
 * 2) 상태 전이(APPROVED + videoUrl 존재)면 Edu publish를 store에서 일원화
 */
export function upsertReviewItem(next: ReviewWorkItem) {
  const prev = reviewItemsById.get(next.id);

  const normalized = normalizeForCreatorSync(next);
  reviewItemsById.set(normalized.id, normalized);

  rebuildReviewSnapshot();
  emitReview();

  const becameApproved =
    (prev?.status ?? "") !== "APPROVED" && normalized.status === "APPROVED";

  // 최종(2차) 승인: videoUrl 존재 시 publish
  if (becameApproved && (normalized.videoUrl ?? "").trim().length > 0) {
    publishEduFromReviewItem(normalized);
  }
}

/**
 * Creator Studio → Reviewer Desk로 검토요청 전달
 * - 1차: videoUrl 빈 문자열("")로 넣어서 "영상 없음"을 표현 (타입 안정성)
 * - 2차: videoUrl 존재(실제 mp4 경로)
 */
export function submitCreatorReviewRequest(input: {
  contentId: string; // CreatorWorkItem.id
  title: string;
  department: string;
  creatorName: string;
  contentCategory: ReviewWorkItem["contentCategory"];
  scriptText: string;
  videoUrl?: string; // 2차일 때만
}): ReviewWorkItem {
  const now = isoNow();
  const hasVideo = Boolean(input.videoUrl && input.videoUrl.trim().length > 0);

  const item: ReviewWorkItem = {
    id: randId("rw"),
    contentId: input.contentId,
    title: input.title,
    department: input.department,
    creatorName: input.creatorName,
    contentType: "VIDEO",
    contentCategory: input.contentCategory,

    createdAt: now,
    submittedAt: now,
    lastUpdatedAt: now,

    status: "REVIEW_PENDING",

    videoUrl: hasVideo ? (input.videoUrl as string) : "",
    durationSec: hasVideo ? 120 : 0,

    scriptText: input.scriptText,

    autoCheck: {
      piiRiskLevel: "low",
      piiFindings: [],
      bannedWords: [],
      qualityWarnings: [],
    },

    audit: [
      {
        id: randId("aud"),
        action: "CREATED",
        actor: input.creatorName,
        at: now,
        detail: "Creator Studio에서 생성",
      },
      {
        id: randId("aud"),
        action: "SUBMITTED",
        actor: input.creatorName,
        at: now,
        detail: hasVideo ? "2차(최종) 검토 요청" : "1차(스크립트) 검토 요청",
      },
    ],

    version: 1,
    riskScore: 10,
  };

  upsertReviewItem(item);
  return item;
}

/**
 * 2차(최종) 승인 시 EduPanel 공개용 publish
 */
export function publishEduFromReviewItem(reviewItem: ReviewWorkItem) {
  const videoUrl = (reviewItem.videoUrl ?? "").trim();
  if (!videoUrl) return;

  const publishedAt = isoNow();
  const id = `edu-${reviewItem.contentId}`;

  const sourceContentId = reviewItem.contentId ?? reviewItem.id;

  const next: PublishedEduVideo = {
    id,
    sourceContentId,
    title: reviewItem.title,
    videoUrl,
    publishedAt,
    contentCategory: reviewItem.contentCategory,
  };

  // 불변 업데이트: 변경 시에만 새 배열 참조 생성
  // - 동일 id가 있으면 제거 후 맨 앞에 추가(unshift 동등)
  publishedEduVideos = [next, ...publishedEduVideos.filter((v) => v.id !== id)];
  emitEdu();
}

export function subscribePublishedEduVideos(listener: Listener) {
  eduListeners.add(listener);
  return () => {
    eduListeners.delete(listener);
  };
}

export function listPublishedEduVideosSnapshot(): PublishedEduVideo[] {
  return publishedEduVideos;
}
