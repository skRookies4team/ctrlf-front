// src/components/dashboard/api/educationApi.ts
import { fetchJson } from "../../common/api/authHttp";
import { API_BASE, buildQueryString, periodToDays } from "./utils";

/**
 * 교육 대시보드 요약 통계 응답 타입
 */
export interface EducationSummaryResponse {
  overallAverageCompletionRate: number; // 전체 평균 이수율 (%)
  nonCompleterCount: number; // 미이수자 수
  mandatoryEducationAverage: number; // 4대 의무교육 평균 이수율 (%)
  jobEducationAverage: number; // 직무교육 평균 이수율 (%)
}

/**
 * 4대 의무교육 이수율 응답 타입
 */
export interface MandatoryCompletionResponse {
  sexualHarassmentPrevention: number; // 성희롱 예방교육 이수율 (%)
  personalInfoProtection: number; // 개인정보보호 교육 이수율 (%)
  workplaceBullying: number; // 직장 내 괴롭힘 예방 이수율 (%)
  disabilityAwareness: number; // 장애인 인식개선 이수율 (%)
}

/**
 * 직무교육 이수 현황 응답 타입
 */
export interface JobCompletionResponse {
  items: Array<{
    educationId: string;
    title: string;
    status: "진행 중" | "이수 완료";
    learnerCount: number;
  }>;
}

/**
 * 부서별 이수율 현황 응답 타입
 */
export interface DepartmentCompletionResponse {
  items: Array<{
    department: string;
    targetCount: number;
    completerCount: number;
    completionRate: number;
    nonCompleterCount: number;
  }>;
}

/**
 * 교육 대시보드 요약 통계 조회
 */
export async function getEducationSummary(
  period: string,
  department?: string
): Promise<EducationSummaryResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<EducationSummaryResponse>(
    `${API_BASE}/admin/dashboard/education/summary${query}`
  );
}

/**
 * 4대 의무교육 이수율 조회
 */
export async function getMandatoryCompletion(
  period: string,
  department?: string
): Promise<MandatoryCompletionResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<MandatoryCompletionResponse>(
    `${API_BASE}/admin/dashboard/education/mandatory-completion${query}`
  );
}

/**
 * 직무교육 이수 현황 조회
 */
export async function getJobCompletion(
  period: string,
  department?: string
): Promise<JobCompletionResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
    department,
  });
  return fetchJson<JobCompletionResponse>(
    `${API_BASE}/admin/dashboard/education/job-completion${query}`
  );
}

/**
 * 부서별 이수율 현황 조회
 */
export async function getDepartmentCompletion(
  period: string
): Promise<DepartmentCompletionResponse> {
  const query = buildQueryString({
    period: periodToDays(period),
  });
  return fetchJson<DepartmentCompletionResponse>(
    `${API_BASE}/admin/dashboard/education/department-completion${query}`
  );
}

