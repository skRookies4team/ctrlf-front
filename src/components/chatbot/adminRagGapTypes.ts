// src/components/chatbot/adminRagGapTypes.ts

/**
 * RAG 갭 분석에서 사용하는 사용자 롤 타입
 * - Keycloak 롤과 동일한 값
 */
export type UserRole =
  | "EMPLOYEE"
  | "CONTENTS_REVIEWER"
  | "VIDEO_CREATOR"
  | "COMPLAINT_MANAGER"
  | "SYSTEM_ADMIN";

export type RagGapType = "NO_DOC" | "LOW_COVERAGE" | "NEEDS_UPDATE";
export type RagGapPriority = "HIGH" | "MEDIUM" | "LOW";

/**
 * RAG 갭 후보 아이템
 */
export interface RagGapItem {
  id: string;

  // 대표 시간 (예: 최초 또는 대표 로그 시간)
  createdAt: string;

  // 부서 정보
  deptCode: string;
  deptName: string;

  // 사용자 롤 / 인텐트
  userRole: UserRole;
  intentId: string; // 예: POLICY_QA, EDU_QA ...

  // 도메인 / 라우트 / 모델
  domainId: "POLICY" | "INCIDENT" | "EDUCATION" | "GENERAL";
  routeId: "ROUTE_RAG_INTERNAL" | "ROUTE_LLM_ONLY" | "ROUTE_INCIDENT";
  modelName: string;

  // RAG 메타
  ragGapCandidate: boolean; // 항상 true 지만, API 스펙 대비용
  ragSourceCount: number;
  ragMaxScore?: number | null;

  // 플래그
  hasPii: boolean;
  isError: boolean;

  // 발생 집계
  askedCount: number;
  lastAskedAt: string;

  // 질문 / 문서 영역
  question: string;
  category: string;

  // 갭 유형 / 우선순위 / 사유
  gapType: RagGapType;
  gapReason: string;
  priority: RagGapPriority;

  // 액션 / 담당부서
  suggestion: string;
  ownerDeptName: string;

  // 상세뷰용 부가 정보 (지금은 mock 용도)
  answerSnippet?: string;
  answerFull?: string;
  adminNotes?: string | null;
}

/**
 * 정렬/필터 타입
 */
export type SortMode = "lastAskedDesc" | "askedCountDesc";
export type RoleFilter = "ALL" | UserRole;
export type IntentFilter = "ALL" | RagGapItem["intentId"];
