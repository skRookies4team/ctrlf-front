// src/components/chatbot/reviewerApi.ts
import type { ReviewWorkItem } from "./reviewerDeskTypes";
import type {
  AcquireLockResponse,
  DecisionRequest,
  DecisionResponse,
  ReviewListParams,
  ReviewListResponse,
  ReleaseLockResponse,
} from "./reviewerApiTypes";
import { reviewerApiHttp } from "./reviewerApiHttp";

/**
 * Reviewer API 인터페이스
 * 백엔드 API와 연동하여 검토 데스크 기능을 제공
 */

export interface ReviewerApi {
  listWorkItems(params: ReviewListParams): Promise<ReviewListResponse>;
  getWorkItem(id: string): Promise<ReviewWorkItem>;
  acquireLock(id: string): Promise<AcquireLockResponse>;
  releaseLock(id: string, lockToken: string): Promise<ReleaseLockResponse>;
  approve(id: string, req: DecisionRequest): Promise<DecisionResponse>;
  reject(id: string, req: DecisionRequest): Promise<DecisionResponse>;
  // 백엔드 API 추가 메서드
  getReviewStats?(): Promise<import("./reviewerApiTypes").ReviewStatsResponse>;
  getReviewHistory?(videoId: string): Promise<import("./reviewerApiTypes").ReviewHistoryResponse>;
}

let singleton: ReviewerApi | null = null;

export function getReviewerApi(): ReviewerApi {
  if (singleton) return singleton;

  // 항상 HTTP 모드 사용 (백엔드 API 연동)
  singleton = reviewerApiHttp as ReviewerApi;
  return singleton;
}
