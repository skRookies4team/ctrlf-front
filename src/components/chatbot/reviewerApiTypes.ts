// src/components/chatbot/reviewerApiTypes.ts
import type { ReviewWorkItem } from "./reviewerDeskTypes";

export type ReviewerSortMode = "NEWEST" | "OLDEST" | "DUE_SOON" | "RISK_HIGH";
export type ReviewerTabKey = "REVIEW_PENDING" | "REJECTED" | "APPROVED" | "MY_ACTIVITY";

export interface ReviewListParams {
  tab: ReviewerTabKey;
  q?: string; // search
  sort?: ReviewerSortMode;
  limit?: number;
  cursor?: string;
}

export interface ReviewListResponse {
  items: ReviewWorkItem[];
  nextCursor?: string;
}

export interface AcquireLockResponse {
  lockToken: string;
  expiresAt: string; // ISO
  ownerId: string;
  ownerName?: string;
}

export interface ReleaseLockResponse {
  released: boolean;
}

export interface DecisionRequest {
  version: number;
  lockToken: string;
  reason?: string; // reject comment
}

export interface DecisionResponse {
  item: ReviewWorkItem;
}

/**
 * 409 충돌 payload 권장 형태
 * - code로 충돌 원인을 명확하게 내려주면 프론트 UX가 안정된다.
 */
export type ConflictCode = "LOCK_CONFLICT" | "VERSION_CONFLICT" | "ALREADY_PROCESSED";

export interface ConflictPayload {
  code: ConflictCode;
  message?: string;
  current?: Partial<ReviewWorkItem> & {
    id?: string;
    version?: number;
    status?: string;
    // lock 스키마는 reviewerDeskTypes에 맞춰서 partial로 둔다
  };
}
