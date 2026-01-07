// src/components/dashboard/api/metricApi.ts
import { fetchJson } from "../../common/api/authHttp";
import { buildQueryString } from "./utils";

/**
 * Infra Service Admin Dashboard Metrics API Base URL
 * - Vite proxy를 통해 /api-infra → http://localhost:9003로 라우팅
 */
const INFRA_API_BASE =
  import.meta.env.VITE_INFRA_API_BASE?.toString() ?? "/api-infra";

/**
 * 보안 지표 응답 타입
 */
export interface SecurityMetricsResponse {
  piiBlockCount: number; // PII 차단 횟수
  externalDomainBlockCount: number; // 외부 도메인 차단 수
  piiTrend: Array<{
    bucketStart: string; // 기간 레이블 (예: "2024-01-01")
    inputDetectRate: number; // 입력 PII 감지 비율 (%)
    outputDetectRate: number; // 출력 PII 감지 비율 (%)
  }>;
}

/**
 * 성능 지표 응답 타입
 */
export interface PerformanceMetricsResponse {
  dislikeRate: number; // 답변 불만족 비율 (0.0 ~ 1.0)
  repeatRate: number; // 재질문 비율 (0.0 ~ 1.0)
  repeatDefinition: string; // 재질문률 정의 설명
  oosCount: number; // Out-of-scope 응답 수
  latencyHistogram: Array<{
    range: string; // 시간 구간 레이블 (예: "0-500ms")
    count: number; // 해당 구간 응답 건수
  }>;
  modelLatency: Array<{
    model: string; // 모델 이름
    avgLatencyMs: number; // 평균 지연시간 (ms)
  }>;
}

/**
 * 보안 지표 조회
 */
export async function getSecurityMetrics(
  period: string,
  department?: string
): Promise<SecurityMetricsResponse> {
  const query = buildQueryString({
    period, // "today" | "7d" | "30d" | "90d" (문자열 그대로 전달)
    dept: department === "ALL" || !department ? "all" : department,
  });
  return fetchJson<SecurityMetricsResponse>(
    `${INFRA_API_BASE}/admin/dashboard/metrics/security${query}`
  );
}

/**
 * 성능 지표 조회
 */
export async function getPerformanceMetrics(
  period: string,
  department?: string
): Promise<PerformanceMetricsResponse> {
  const query = buildQueryString({
    period, // "today" | "7d" | "30d" | "90d" (문자열 그대로 전달)
    dept: department === "ALL" || !department ? "all" : department,
  });
  return fetchJson<PerformanceMetricsResponse>(
    `${INFRA_API_BASE}/admin/dashboard/metrics/performance${query}`
  );
}
