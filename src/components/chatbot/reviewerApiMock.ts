// src/components/chatbot/reviewerApiMock.ts
import type { ReviewWorkItem, WorkItemLock } from "./reviewerDeskTypes";
import type {
  AcquireLockResponse,
  ConflictPayload,
  DecisionRequest,
  DecisionResponse,
  ReviewListParams,
  ReviewListResponse,
  ReleaseLockResponse,
} from "./reviewerApiTypes";
import {
  ReviewerApiError,
  type ReviewerApiErrorCode,
} from "./reviewerApiErrors";
import type { ReviewerApi } from "./reviewerApi";
import {
  getReviewItemSnapshot,
  hydrateReviewStoreOnce,
  listReviewItemsSnapshot,
  upsertReviewItem,
} from "./reviewFlowStore";

function nowISO() {
  return new Date().toISOString();
}
function addSecondsISO(sec: number) {
  const d = new Date();
  d.setSeconds(d.getSeconds() + sec);
  return d.toISOString();
}
function randToken() {
  return (
    Math.random().toString(16).slice(2) + Math.random().toString(16).slice(2)
  );
}
function randId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

type LockRec = {
  token: string;
  ownerId: string;
  ownerName?: string;
  expiresAt: string;
};

function isExpired(iso: string) {
  return Date.now() > new Date(iso).getTime();
}

function isFinalStage(item: ReviewWorkItem): boolean {
  return (item.videoUrl ?? "").trim().length > 0;
}

function attachDecisionCommentFields(
  item: ReviewWorkItem,
  comment?: string
): ReviewWorkItem {
  const c = (comment ?? "").trim();
  if (!c) return item;

  // Creator 쪽 reviewCommentOf가 찾는 키들을 최대한 채워준다.
  const base = item as unknown as Record<string, unknown>;
  return {
    ...base,
    comment: base.comment ?? c,
    rejectReason: base.rejectReason ?? c,
    rejectedComment: base.rejectedComment ?? c,
    reviewerComment: base.reviewerComment ?? c,
    note: base.note ?? c,
  } as unknown as ReviewWorkItem;
}

export function createReviewerApiMock(opts?: {
  initialItems?: ReviewWorkItem[];
  me?: { id: string; name?: string };
  lockTtlSec?: number;
}): ReviewerApi {
  const me = opts?.me ?? { id: "me", name: "나(로컬)" };
  const lockTtlSec = opts?.lockTtlSec ?? 90;

  const locks = new Map<string, LockRec>();

  // Creator → Reviewer 연결을 위해 전역 store에 1회 seed
  hydrateReviewStoreOnce((opts?.initialItems ?? []) as ReviewWorkItem[]);

  function getLockRec(id: string): LockRec | null {
    const l = locks.get(id);
    if (!l) return null;
    if (isExpired(l.expiresAt)) {
      locks.delete(id);
      return null;
    }
    return l;
  }

  function getLockView(id: string): WorkItemLock | undefined {
    const l = getLockRec(id);
    if (!l) return undefined;
    const owner = (l.ownerName ?? "").trim() || l.ownerId;
    return { owner, expiresAt: l.expiresAt };
  }

  function conflict(
    code: ConflictPayload["code"],
    current?: Partial<ReviewWorkItem>
  ): never {
    const payload: ConflictPayload = {
      code,
      current,
      message: "다른 사용자에 의해 변경되었습니다.",
    };

    throw new ReviewerApiError(payload.message ?? "충돌", {
      status: 409,
      code: code as ReviewerApiErrorCode,
      details: payload,
    });
  }

  return {
    async listWorkItems(params: ReviewListParams): Promise<ReviewListResponse> {
      const all = listReviewItemsSnapshot().map((it) => ({
        ...it,
        lock: getLockView(it.id),
      }));

      const byTab = all.filter((it) => {
        if (params.tab === "REVIEW_PENDING") return it.status === "REVIEW_PENDING";
        if (params.tab === "APPROVED") return it.status === "APPROVED";
        if (params.tab === "REJECTED") return it.status === "REJECTED";
        return true;
      });

      const q = (params.q ?? "").trim().toLowerCase();
      const filtered = q
        ? byTab.filter((it) => {
            const hay = `${it.title ?? ""} ${it.department ?? ""} ${
              it.creatorName ?? ""
            }`.toLowerCase();
            return hay.includes(q);
          })
        : byTab;

      return { items: filtered, nextCursor: undefined };
    },

    async getWorkItem(id: string): Promise<ReviewWorkItem> {
      const item = getReviewItemSnapshot(id);
      if (!item) {
        throw new ReviewerApiError("항목을 찾을 수 없습니다.", {
          status: 404,
          code: "NOT_FOUND",
        });
      }
      return { ...item, lock: getLockView(id) };
    },

    async acquireLock(id: string): Promise<AcquireLockResponse> {
      const item = getReviewItemSnapshot(id);
      if (!item) {
        throw new ReviewerApiError("항목을 찾을 수 없습니다.", {
          status: 404,
          code: "NOT_FOUND",
        });
      }

      const existing = getLockRec(id);
      if (existing && existing.ownerId !== me.id) {
        conflict("LOCK_CONFLICT", item);
      }

      const token = randToken();
      const lock: LockRec = {
        token,
        ownerId: me.id,
        ownerName: me.name,
        expiresAt: addSecondsISO(lockTtlSec),
      };
      locks.set(id, lock);

      return {
        lockToken: token,
        expiresAt: lock.expiresAt,
        ownerId: lock.ownerId,
        ownerName: lock.ownerName,
      };
    },

    async releaseLock(id: string, lockToken: string): Promise<ReleaseLockResponse> {
      const l = getLockRec(id);
      if (!l) return { released: true };
      if (l.token !== lockToken) return { released: false };

      locks.delete(id);
      return { released: true };
    },

    async approve(id: string, req: DecisionRequest): Promise<DecisionResponse> {
      const item = getReviewItemSnapshot(id);
      if (!item) {
        throw new ReviewerApiError("항목을 찾을 수 없습니다.", {
          status: 404,
          code: "NOT_FOUND",
        });
      }

      const l = getLockRec(id);
      if (!l || l.token !== req.lockToken) conflict("LOCK_CONFLICT", item);
      if (item.version !== req.version) conflict("VERSION_CONFLICT", item);
      if (item.status !== "REVIEW_PENDING") conflict("ALREADY_PROCESSED", item);

      const now = nowISO();
      const stageLabel = isFinalStage(item) ? "2차(최종)" : "1차(스크립트)";

      const next: ReviewWorkItem = {
        ...item,
        status: "APPROVED",
        version: item.version + 1,
        lastUpdatedAt: now,
        approvedAt: item.approvedAt ?? now,
        audit: [
          ...(item.audit ?? []),
          {
            id: randId("aud"),
            action: "APPROVED",
            actor: (me.name ?? "").trim() || me.id,
            at: now,
            detail: `${stageLabel} 승인`,
          },
        ],
      };

      upsertReviewItem(next);
      return { item: next };
    },

    async reject(id: string, req: DecisionRequest): Promise<DecisionResponse> {
      const item = getReviewItemSnapshot(id);
      if (!item) {
        throw new ReviewerApiError("항목을 찾을 수 없습니다.", {
          status: 404,
          code: "NOT_FOUND",
        });
      }

      const l = getLockRec(id);
      if (!l || l.token !== req.lockToken) conflict("LOCK_CONFLICT", item);
      if (item.version !== req.version) conflict("VERSION_CONFLICT", item);
      if (item.status !== "REVIEW_PENDING") conflict("ALREADY_PROCESSED", item);

      const now = nowISO();
      const stageLabel = isFinalStage(item) ? "2차(최종)" : "1차(스크립트)";
      const reason = (req.reason ?? "").trim();

      const baseNext: ReviewWorkItem = {
        ...item,
        status: "REJECTED",
        version: item.version + 1,
        lastUpdatedAt: now,
        rejectedAt: item.rejectedAt ?? now,
        audit: [
          ...(item.audit ?? []),
          {
            id: randId("aud"),
            action: "REJECTED",
            actor: (me.name ?? "").trim() || me.id,
            at: now,
            detail: reason ? `${stageLabel} 반려: ${reason}` : `${stageLabel} 반려`,
          },
        ],
      };

      const next = attachDecisionCommentFields(baseNext, reason);

      upsertReviewItem(next);
      return { item: next };
    },
  };
}
