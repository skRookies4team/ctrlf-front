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
import { createReviewerApiMock } from "./reviewerApiMock";

/**
 * 실무 포인트:
 * - "컨트롤러는 api 구현체를 모르면 된다"
 * - env로 http/mock 스위치 가능
 */

export interface ReviewerApi {
  listWorkItems(params: ReviewListParams): Promise<ReviewListResponse>;
  getWorkItem(id: string): Promise<ReviewWorkItem>;
  acquireLock(id: string): Promise<AcquireLockResponse>;
  releaseLock(id: string, lockToken: string): Promise<ReleaseLockResponse>;
  approve(id: string, req: DecisionRequest): Promise<DecisionResponse>;
  reject(id: string, req: DecisionRequest): Promise<DecisionResponse>;
}

type ApiMode = "mock" | "http";

function getEnvString(key: string): string | undefined {
  const env = import.meta.env as unknown as Record<string, unknown>;
  const v = env[key];
  return typeof v === "string" ? v : undefined;
}

let singleton: ReviewerApi | null = null;

export function getReviewerApi(): ReviewerApi {
  if (singleton) return singleton;

  const raw = getEnvString("VITE_REVIEWER_API_MODE");
  const mode: ApiMode = raw === "http" ? "http" : "mock";

  if (mode === "http") {
    singleton = reviewerApiHttp as ReviewerApi;
    return singleton;
  }

  singleton = createReviewerApiMock({
    initialItems: [],
    me: { id: "me", name: "나(로컬)" },
  });

  return singleton;
}
