// src/components/chatbot/creatorStudioTypes.ts

export type CreatorType = "DEPT_CREATOR" | "GLOBAL_CREATOR";

/**
 * 교육 유형 (Use Case 기준)
 * - MANDATORY: 4대 법정의무교육
 * - JOB: 부서 직무교육
 * - OTHER: 기타/전사 공통
 */
export type TrainingType = "MANDATORY" | "JOB" | "OTHER";

export type CreatorStatus =
  | "DRAFT"
  | "GENERATING"
  | "REVIEW_PENDING"
  | "REJECTED"
  | "APPROVED"
  | "FAILED";

export type PipelineStage = "UPLOAD" | "SCRIPT" | "VIDEO" | "THUMBNAIL" | "DONE";
export type PipelineState = "IDLE" | "RUNNING" | "SUCCESS" | "FAILED";

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface CategoryOption {
  id: string;
  name: string;
}

export type CreatorTabId =
  | "draft"
  | "review_pending"
  | "rejected"
  | "approved"
  | "failed";

export type CreatorSortMode =
  | "updated_desc"
  | "updated_asc"
  | "created_desc"
  | "created_asc";

/**
 * 자동 생성 파이프라인 진행 상태(프론트 mock)
 */
export interface CreatorPipeline {
  state: PipelineState;
  stage: PipelineStage | null;
  progress: number; // 0~100
  startedAt?: number;
  finishedAt?: number;
  message?: string;
}

export interface CreatorAssets {
  sourceFileName?: string;
  script?: string;
  videoUrl?: string; // 추후 CDN URL
  thumbnailUrl?: string;
}

export interface CreatorWorkItem {
  id: string;

  title: string;
  trainingType: TrainingType;
  categoryId: string;
  categoryLabel: string;

  /** 교육 대상 부서(직무교육이면 보통 1개, 전사/4대교육은 전체 가능) */
  targetDeptIds: string[];

  /** UI에서 “필수” 토글용 (직무교육도 필수/선택이 가능하다는 가정) */
  isMandatory: boolean;

  /** 예상 시청 시간(분) */
  estimatedMinutes: number;

  status: CreatorStatus;

  createdAt: number;
  updatedAt: number;

  createdByName: string;

  /** 반려 코멘트(반려 상태일 때) */
  rejectedComment?: string;

  /** 실패 사유(FAILED 상태일 때) */
  failedReason?: string;

  assets: CreatorAssets;
  pipeline: CreatorPipeline;
}

export interface CreatorValidationResult {
  ok: boolean;
  issues: string[];
}
