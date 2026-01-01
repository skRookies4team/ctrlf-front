// src/components/dashboard/api/chatApi.ts
import { fetchJson } from "../../common/api/authHttp";
import { buildQueryString, periodToDays } from "./utils";

/**
 * Chat Service Admin Dashboard API Base URL
 * - Vite proxy를 통해 /api/chat → http://localhost:9005로 라우팅
 */
const CHAT_API_BASE =
  import.meta.env.VITE_CHAT_API_BASE?.toString() ?? "/api/chat";

/**
 * 대시보드 요약 통계 응답 타입
 */
export interface ChatSummaryResponse {
  todayQuestionCount: number; // 오늘 질문 수
  averageResponseTime: number; // 평균 응답 시간 (ms)
  piiDetectionRate: number; // PII 감지 비율 (%)
  errorRate: number; // 에러율 (%)
  last7DaysQuestionCount: number; // 최근 7일 질문 수
  activeUserCount: number; // 활성 사용자 수
  satisfactionRate: number; // 응답 만족도 (%)
  ragUsageRate: number; // RAG 사용 비율 (%)
}

/**
 * 라우트별 질문 비율 응답 타입
 */
export interface RouteRatioResponse {
  items: Array<{
    routeType: string; // "RAG", "LLM", "FAQ", "INCIDENT", "OTHER"
    routeName: string; // 라우트 이름
    ratio: number; // 비율 (%)
  }>;
}

/**
 * 최근 많이 질문된 키워드 Top 5 응답 타입
 */
export interface TopKeywordsResponse {
  items: Array<{
    keyword: string; // 키워드
    questionCount: number; // 질문 횟수
  }>;
}

/**
 * 질문 수 · 에러율 추이 응답 타입
 */
export interface QuestionTrendResponse {
  totalQuestionCount: number; // 전체 질문 수
  averageQuestionCountPerPeriod: number; // 기간별 평균 질문 수
  averageErrorRate: number; // 평균 에러율 (%)
  items: Array<{
    periodLabel: string; // 기간 레이블 (예: "1주", "2주")
    questionCount: number; // 질문 수
    errorRate: number; // 에러율 (%)
  }>;
}

/**
 * 도메인별 질문 비율 응답 타입
 */
export interface DomainRatioResponse {
  items: Array<{
    domain: string; // "SECURITY", "POLICY", "EDUCATION", "QUIZ", "OTHER"
    domainName: string; // 도메인 이름
    ratio: number; // 비율 (%)
  }>;
}

/**
 * 대시보드 요약 통계 조회
 */
export async function getChatSummary(
  period: string,
  department?: string
): Promise<ChatSummaryResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<ChatSummaryResponse>(
    `${CHAT_API_BASE}/admin/dashboard/summary${query}`
  );
}

/**
 * 라우트별 질문 비율 조회
 */
export async function getRouteRatio(
  period: string,
  department?: string
): Promise<RouteRatioResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<RouteRatioResponse>(
    `${CHAT_API_BASE}/admin/dashboard/route-ratio${query}`
  );
}

/**
 * 최근 많이 질문된 키워드 Top 5 조회
 */
export async function getTopKeywords(
  period: string,
  department?: string
): Promise<TopKeywordsResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<TopKeywordsResponse>(
    `${CHAT_API_BASE}/admin/dashboard/top-keywords${query}`
  );
}

/**
 * 질문 수 · 에러율 추이 조회
 */
export async function getQuestionTrend(
  period: string,
  department?: string
): Promise<QuestionTrendResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<QuestionTrendResponse>(
    `${CHAT_API_BASE}/admin/dashboard/question-trend${query}`
  );
}

/**
 * 도메인별 질문 비율 조회
 */
export async function getDomainRatio(
  period: string,
  department?: string
): Promise<DomainRatioResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<DomainRatioResponse>(
    `${CHAT_API_BASE}/admin/dashboard/domain-ratio${query}`
  );
}
