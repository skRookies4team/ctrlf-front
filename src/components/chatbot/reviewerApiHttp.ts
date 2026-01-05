// src/components/chatbot/reviewerApiHttp.ts
import type { ReviewWorkItem } from "./reviewerDeskTypes";
import type {
  ConflictPayload,
  DecisionRequest,
  DecisionResponse,
  ReviewListParams,
  ReviewListResponse,
  ReviewStatsResponse,
  ReviewDetailResponse,
  ReviewHistoryResponse,
} from "./reviewerApiTypes";
import { ReviewerApiError, toReviewerApiError, type ReviewerApiErrorCode } from "./reviewerApiErrors";
import { getScript } from "./creatorApi";
import type { CreatorScriptDetail } from "./creatorStudioTypes";

// 교육 서비스 API Base URL (백엔드 문서 기준: http://localhost:9002)
// Vite proxy를 통해 /api-edu → http://localhost:9002로 라우팅
const DEFAULT_BASE = "/api-edu";

function getEnvString(key: string): string | undefined {
  const env = import.meta.env as unknown as Record<string, unknown>;
  const v = env[key];
  return typeof v === "string" ? v : undefined;
}

function apiBase(): string {
  const v = getEnvString("VITE_EDU_API_BASE");
  return v && v.trim() ? v.trim() : DEFAULT_BASE;
}

async function readBodySafe(res: Response): Promise<unknown> {
  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    const text = await res.text().catch(() => "");
    return text ? { message: text } : null;
  }
  return await res.json().catch(() => null);
}

function isConflictCode(x: unknown): x is ReviewerApiErrorCode {
  return x === "LOCK_CONFLICT" || x === "VERSION_CONFLICT" || x === "ALREADY_PROCESSED";
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;

  try {
    res = await fetch(`${apiBase()}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (err: unknown) {
    throw new ReviewerApiError("네트워크 오류로 요청에 실패했습니다.", {
      code: "NETWORK_ERROR",
      details: err,
    });
  }

  if (res.status === 204) return undefined as unknown as T;

  const body = await readBodySafe(res);

  if (!res.ok) {
    // 409는 body.code로 LOCK/VERSION/ALREADY를 분기하는 걸 권장
    if (res.status === 409) {
      const payload = (body ?? null) as ConflictPayload | null;
      const rawCode = typeof payload?.code === "string" ? payload.code : undefined;
      const code: ReviewerApiErrorCode = isConflictCode(rawCode) ? rawCode : "VERSION_CONFLICT";

      throw new ReviewerApiError(
        typeof payload?.message === "string" ? payload.message : "동시성 충돌이 발생했습니다.",
        {
          status: 409,
          code,
          details: payload ?? body,
        }
      );
    }

    throw toReviewerApiError({
      status: res.status,
      body,
      fallbackMessage: "요청 처리 중 오류가 발생했습니다.",
    });
  }

  return body as T;
}

/**
 * HTTP 기반 reviewer API
 * 백엔드 문서 기준: docs/education-service/video/api/video_api_spec.md
 * Base URL: /api-edu (Vite proxy를 통해 http://localhost:9002로 라우팅)
 */
export const reviewerApiHttp = {
  /**
   * 검토 목록 조회
   * GET /admin/videos/review-queue
   * 백엔드 문서: 4.1 검토 목록 조회
   */
  async listWorkItems(params: ReviewListParams): Promise<ReviewListResponse> {
    const qs = new URLSearchParams();
    
    // status: pending, approved, rejected
    // MY_ACTIVITY는 myProcessingOnly=true로 처리
    if (params.tab === "MY_ACTIVITY") {
      // 내 활동은 모든 상태에서 내가 처리한 항목만 조회
      qs.set("myProcessingOnly", "true");
      // status는 생략하거나 "pending"으로 설정 (백엔드에서 모든 상태 조회)
    } else {
      const status = params.tab === "REVIEW_PENDING" ? "pending" 
        : params.tab === "APPROVED" ? "approved"
        : params.tab === "REJECTED" ? "rejected"
        : "pending";
      qs.set("status", status);
    }
    
    // search: 제목/부서/제작자 검색
    if (params.q) qs.set("search", params.q);
    
    // myProcessingOnly: 내 처리만 필터 (MY_ACTIVITY가 아닌 경우에만)
    if (params.myProcessingOnly && params.tab !== "MY_ACTIVITY") {
      qs.set("myProcessingOnly", "true");
    }
    
    // reviewStage: first, second, document, all
    if (params.reviewStage) qs.set("reviewStage", params.reviewStage);
    
    // sort: latest, oldest, title
    if (params.sort) {
      const sortMap: Record<string, string> = {
        "NEWEST": "latest",
        "OLDEST": "oldest",
        "RISK_HIGH": "latest", // RISK_HIGH는 백엔드에서 지원하지 않으므로 latest로 매핑
      };
      qs.set("sort", sortMap[params.sort] || "latest");
    }
    
    // page, size: 페이징
    // page는 0 이상이어야 함 (0-base)
    const page = Math.max(0, params.page !== undefined ? params.page : 0);
    // size는 1 이상이어야 함
    const size = Math.max(1, params.size !== undefined ? params.size : (params.limit || 30));
    qs.set("page", String(page));
    qs.set("size", String(size));
    
    const response = await http<{
      items: Array<{
        videoId: string;
        educationId: string;
        educationTitle: string;
        videoTitle: string;
        status: string;
        reviewStage: string;
        creatorDepartment?: string;
        creatorName?: string;
        creatorUuid?: string;
        submittedAt: string;
        category?: string;
        eduType?: string;
        // 백엔드에서 제공할 수 있는 추가 필드 (optional)
        fileUrl?: string; // 영상 파일 URL (2차 검토 시 필요)
        duration?: number; // 영상 길이(초)
      }>;
      totalCount: number;
      page: number;
      size: number;
      totalPages: number;
      firstRoundCount?: number;
      secondRoundCount?: number;
      documentCount?: number;
    }>(`/admin/videos/review-queue?${qs.toString()}`, { method: "GET" });
    
    // 백엔드 응답을 ReviewWorkItem 배열로 변환
    return {
      items: response.items.map(transformQueueItemToWorkItem),
      totalCount: response.totalCount,
      page: response.page,
      size: response.size,
      totalPages: response.totalPages,
      firstRoundCount: response.firstRoundCount,
      secondRoundCount: response.secondRoundCount,
      documentCount: response.documentCount,
    };
  },

  /**
   * 검토 통계 조회
   * GET /admin/videos/review-stats
   * 백엔드 문서: 4.2 검토 통계 조회
   */
  async getReviewStats(): Promise<ReviewStatsResponse> {
    return http<ReviewStatsResponse>(`/admin/videos/review-stats`, { method: "GET" });
  },

  /**
   * 검토 상세 정보 조회
   * GET /admin/videos/{videoId}/review-detail
   * 백엔드 문서: 4.4 검토 상세 정보 조회
   */
  async getWorkItem(id: string): Promise<ReviewWorkItem> {
    const detail = await http<ReviewDetailResponse>(`/admin/videos/${encodeURIComponent(id)}/review-detail`, { 
      method: "GET" 
    });
    
    // scriptId가 있으면 스크립트를 조회하여 텍스트 추출
    let scriptText: string | undefined;
    if (detail.scriptId) {
      try {
        const script = await getScript(detail.scriptId);
        scriptText = extractScriptText(script);
      } catch (error) {
        // 스크립트 조회 실패 시 로그만 남기고 계속 진행
        console.warn(`Failed to fetch script ${detail.scriptId}:`, error);
      }
    }
    
    // ReviewDetailResponse를 ReviewWorkItem 형식으로 변환
    return transformDetailToWorkItem(detail, scriptText);
  },

  /**
   * 감사 이력 조회
   * GET /admin/videos/{videoId}/review-history
   * 백엔드 문서: 4.3 영상 감사 이력 조회
   */
  async getReviewHistory(videoId: string): Promise<ReviewHistoryResponse> {
    return http<ReviewHistoryResponse>(`/admin/videos/${encodeURIComponent(videoId)}/review-history`, { 
      method: "GET" 
    });
  },

  /**
   * 영상 승인
   * PUT /admin/videos/{videoId}/approve
   * 백엔드 문서: 1.7 검토 승인
   * - 1차 승인: SCRIPT_REVIEW_REQUESTED → SCRIPT_APPROVED
   * - 2차 승인: FINAL_REVIEW_REQUESTED → PUBLISHED
   */
  async approve(id: string, req: DecisionRequest): Promise<DecisionResponse> {
    // 백엔드 API는 body가 없음 (PUT 메서드만 사용)
    const response = await http<{
      videoId: string;
      previousStatus: string;
      currentStatus: string;
      updatedAt: string;
    }>(`/admin/videos/${encodeURIComponent(id)}/approve`, {
      method: "PUT",
    });
    
    // 응답을 DecisionResponse 형식으로 변환
    return {
      item: await this.getWorkItem(id),
    };
  },

  /**
   * 영상 반려
   * PUT /admin/videos/{videoId}/reject
   * 백엔드 문서: 1.8 검토 반려
   * - 1차 반려: SCRIPT_REVIEW_REQUESTED → SCRIPT_READY
   * - 2차 반려: FINAL_REVIEW_REQUESTED → READY
   */
  async reject(id: string, req: DecisionRequest): Promise<DecisionResponse> {
    // 백엔드 API는 reason만 body로 전송
    const response = await http<{
      videoId: string;
      previousStatus: string;
      currentStatus: string;
      updatedAt: string;
    }>(`/admin/videos/${encodeURIComponent(id)}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason: req.reason || "" }),
    });
    
    // 응답을 DecisionResponse 형식으로 변환
    return {
      item: await this.getWorkItem(id),
    };
  },

  /**
   * Lock 관련 메서드 (백엔드에서 지원하지 않으므로 빈 구현)
   * 호환성을 위해 유지
   */
  async acquireLock(id: string): Promise<import("./reviewerApiTypes").AcquireLockResponse> {
    // 백엔드 API에는 lock 기능이 없으므로 빈 구현
    return {
      lockToken: "",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      ownerId: "",
      ownerName: "",
    };
  },

  async releaseLock(id: string, lockToken: string): Promise<import("./reviewerApiTypes").ReleaseLockResponse> {
    // 백엔드 API에는 lock 기능이 없으므로 빈 구현
    return { released: true };
  },
};

/**
 * 백엔드 응답의 review-queue items를 ReviewWorkItem 형식으로 변환
 */
function transformQueueItemToWorkItem(item: {
  videoId: string;
  educationId: string;
  educationTitle: string;
  videoTitle: string;
  status: string;
  reviewStage: string;
  creatorDepartment?: string;
  creatorName?: string;
  creatorUuid?: string;
  submittedAt: string;
  category?: string;
  eduType?: string;
  fileUrl?: string; // 영상 파일 URL (2차 검토 시 필요)
  duration?: number; // 영상 길이(초)
}): ReviewWorkItem {
  // reviewStage가 "2차"이고 fileUrl이 있으면 2차 검토 단계
  const isSecondStage = item.reviewStage === "2차" || (item.fileUrl && item.fileUrl.trim().length > 0);
  
  return {
    id: item.videoId,
    contentId: item.videoId,
    title: item.videoTitle,
    department: item.creatorDepartment || "",
    creatorName: item.creatorName || "",
    creatorId: item.creatorUuid,
    contentType: "VIDEO",
    contentCategory: item.eduType === "MANDATORY" ? "MANDATORY" : "JOB",
    createdAt: item.submittedAt,
    submittedAt: item.submittedAt,
    lastUpdatedAt: item.submittedAt,
    status: item.status === "SCRIPT_REVIEW_REQUESTED" || item.status === "FINAL_REVIEW_REQUESTED" 
      ? "REVIEW_PENDING"
      : item.status === "PUBLISHED"
      ? "APPROVED"
      : "REJECTED",
    reviewStage: item.reviewStage === "1차" ? "SCRIPT" : item.reviewStage === "2차" ? "FINAL" : isSecondStage ? "FINAL" : undefined,
    // 2차 검토 단계인 경우 videoUrl 설정
    videoUrl: isSecondStage && item.fileUrl ? item.fileUrl : undefined,
    durationSec: item.duration,
    autoCheck: {
      piiRiskLevel: "none",
      piiFindings: [],
      bannedWords: [],
      qualityWarnings: [],
    },
    audit: [],
    version: 1,
  } as ReviewWorkItem;
}

/**
 * 스크립트 상세 정보에서 텍스트를 추출
 * chapters → scenes → narration 또는 caption을 합쳐서 반환
 */
function extractScriptText(script: CreatorScriptDetail): string {
  const parts: string[] = [];
  
  for (const chapter of script.chapters || []) {
    for (const scene of chapter.scenes || []) {
      // narration이 있으면 우선 사용, 없으면 caption 사용
      const text = scene.narration || scene.caption || "";
      if (text.trim()) {
        parts.push(text.trim());
      }
    }
  }
  
  return parts.join("\n\n");
}

/**
 * ReviewDetailResponse를 ReviewWorkItem 형식으로 변환
 */
function transformDetailToWorkItem(detail: ReviewDetailResponse, scriptText?: string): ReviewWorkItem {
  // reviewStage가 "2차"이거나 fileUrl이 있으면 2차 검토 단계
  const isSecondStage = detail.reviewStage === "2차" || (detail.fileUrl && detail.fileUrl.trim().length > 0);
  
  return {
    id: detail.videoId,
    contentId: detail.videoId,
    title: detail.videoTitle,
    department: detail.creatorDepartment || "",
    creatorName: detail.creatorName || "",
    creatorId: detail.creatorUuid,
    contentType: "VIDEO",
    contentCategory: detail.eduType === "MANDATORY" ? "MANDATORY" : "JOB",
    createdAt: detail.submittedAt,
    submittedAt: detail.submittedAt,
    lastUpdatedAt: detail.updatedAt,
    status: detail.status === "SCRIPT_REVIEW_REQUESTED" || detail.status === "FINAL_REVIEW_REQUESTED" 
      ? "REVIEW_PENDING"
      : detail.status === "PUBLISHED"
      ? "APPROVED"
      : "REJECTED",
    reviewStage: detail.reviewStage === "1차" ? "SCRIPT" : detail.reviewStage === "2차" ? "FINAL" : isSecondStage ? "FINAL" : undefined,
    // 2차 검토 단계인 경우 videoUrl 설정
    videoUrl: isSecondStage && detail.fileUrl ? detail.fileUrl : undefined,
    durationSec: detail.duration,
    scriptText,
    autoCheck: {
      piiRiskLevel: "none",
      piiFindings: [],
      bannedWords: [],
      qualityWarnings: [],
    },
    audit: [],
    version: detail.scriptVersion || 1,
  } as ReviewWorkItem;
}
