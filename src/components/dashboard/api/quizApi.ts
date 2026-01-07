// src/components/dashboard/api/quizApi.ts
import { fetchJson } from "../../common/api/authHttp";
import { API_BASE, buildQueryString, periodToDays } from "./utils";

/**
 * 퀴즈 대시보드 요약 통계 응답 타입
 */
export interface QuizSummaryResponse {
  overallAverageScore: number; // 전체 평균 점수
  participantCount: number; // 응시자 수
  passRate: number; // 통과율 (80점↑) (%)
  participationRate: number; // 퀴즈 응시율 (%)
}

/**
 * 부서별 평균 점수 응답 타입
 */
export interface DepartmentScoreResponse {
  items: Array<{
    department: string;
    averageScore: number;
    participantCount: number;
  }>;
}

/**
 * 퀴즈별 통계 응답 타입
 */
export interface QuizStatsResponse {
  items: Array<{
    educationId: string;
    quizTitle: string;
    averageScore: number; // 평균 점수
    attemptCount: number; // 응시 수
    passRate: number; // 통과율 (%)
  }>;
}

/**
 * 퀴즈 대시보드 요약 통계 조회
 */
export async function getQuizSummary(
  period: string,
  department?: string
): Promise<QuizSummaryResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<QuizSummaryResponse>(
    `${API_BASE}/admin/dashboard/quiz/summary${query}`
  );
}

/**
 * 부서별 평균 점수 조회
 */
export async function getDepartmentScores(
  period: string,
  department?: string
): Promise<DepartmentScoreResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<DepartmentScoreResponse>(
    `${API_BASE}/admin/dashboard/quiz/department-scores${query}`
  );
}

/**
 * 퀴즈별 통계 조회
 */
export async function getQuizStats(
  period: string,
  department?: string
): Promise<QuizStatsResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<QuizStatsResponse>(
    `${API_BASE}/admin/dashboard/quiz/quiz-stats${query}`
  );
}
