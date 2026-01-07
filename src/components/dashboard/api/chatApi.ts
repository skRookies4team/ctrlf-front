// src/components/dashboard/api/chatApi.ts
import { fetchJson } from "../../common/api/authHttp";
import { buildQueryString } from "./utils";

/**
 * Chat Service Admin Dashboard API Base URL
 * - Vite proxy를 통해 /api/chat → http://localhost:9005로 라우팅
 */
const CHAT_API_BASE =
  import.meta.env.VITE_CHAT_API_BASE?.toString() ?? "/api/chat";

/**
 * 대시보드 요약 통계 응답 타입 (백엔드 실제 응답)
 */
export interface ChatSummaryResponse {
  period: string; // 기간 (today | 7d | 30d | 90d)
  dept: string; // 부서 필터
  todayQuestionCount: number; // 오늘 질문 수
  periodQuestionCount: number; // 기간 내 질문 수
  periodDailyAvgQuestionCount: number; // 기간 내 일평균 질문 수
  activeUsers: number; // 활성 사용자 수
  avgLatencyMs: number; // 평균 응답 시간 (밀리초)
  piiDetectRate: number; // PII 감지 비율 (0~1)
  errorRate: number; // 에러율 (0~1)
  satisfactionRate: number; // 만족도 (0~1)
  dislikeRate: number; // 불만족도 (0~1)
  ragUsageRate: number; // RAG 사용 비율 (0~1)
}

/**
 * 질문 수 · 에러율 추이 응답 타입 (백엔드 실제 응답)
 */
export interface TrendsResponse {
  bucket: string; // 버킷 타입 (day | week)
  series: Array<{
    bucketStart: string; // 버킷 시작일 (YYYY-MM-DD)
    questionCount: number; // 질문 수
    errorRate: number; // 에러율 (0~1)
  }>;
}

/**
 * 도메인별 질문 비율 응답 타입 (백엔드 실제 응답)
 */
export interface DomainShareResponse {
  items: Array<{
    domain: string; // "SECURITY", "POLICY", "EDUCATION", "QUIZ", "OTHER"
    label: string; // 도메인 라벨
    questionCount: number; // 질문 수
    share: number; // 비율 (0~1)
  }>;
}

/**
 * 대시보드 요약 통계 조회
 * GET /admin/dashboard/chat/summary
 */
export async function getChatSummary(
  period: string,
  department?: string,
  refresh?: boolean
): Promise<ChatSummaryResponse> {
  const query = buildQueryString({
    period, // String: "today" | "7d" | "30d" | "90d"
    dept: department === "ALL" || !department ? "all" : department,
    refresh: refresh ? "true" : undefined,
  });
  return fetchJson<ChatSummaryResponse>(
    `${CHAT_API_BASE}/admin/dashboard/chat/summary${query}`
  );
}

/**
 * 질문 수 · 에러율 추이 조회
 * GET /admin/dashboard/chat/trends
 */
export async function getTrends(
  period: string,
  department?: string,
  bucket?: string,
  refresh?: boolean
): Promise<TrendsResponse> {
  const query = buildQueryString({
    period, // String: "today" | "7d" | "30d" | "90d"
    dept: department === "ALL" || !department ? "all" : department,
    bucket: bucket || "week", // "day" | "week"
    refresh: refresh ? "true" : undefined,
  });
  return fetchJson<TrendsResponse>(
    `${CHAT_API_BASE}/admin/dashboard/chat/trends${query}`
  );
}

/**
 * 도메인별 질문 비율 조회
 * GET /admin/dashboard/chat/domain-share
 */
export async function getDomainShare(
  period: string,
  department?: string,
  refresh?: boolean
): Promise<DomainShareResponse> {
  const query = buildQueryString({
    period, // String: "today" | "7d" | "30d" | "90d"
    dept: department === "ALL" || !department ? "all" : department,
    refresh: refresh ? "true" : undefined,
  });
  return fetchJson<DomainShareResponse>(
    `${CHAT_API_BASE}/admin/dashboard/chat/domain-share${query}`
  );
}
