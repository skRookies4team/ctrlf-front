// src/components/chatbot/creatorStudioTypes.ts

export type CreatorType = "DEPT_CREATOR" | "GLOBAL_CREATOR";

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

export type CategoryKind = "JOB" | "MANDATORY";

export interface CategoryOption {
  id: string;
  name: string;
  kind: CategoryKind;
}

export interface VideoTemplateOption {
  id: string;
  name: string;
  description?: string;
}

export interface JobTrainingOption {
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
  mode?: "FULL" | "VIDEO_ONLY";
}

export interface CreatorAssets {
  sourceFileName?: string;
  sourceFileSize?: number;   // bytes
  sourceFileMime?: string;   // file.type

  script?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
}

export interface CreatorWorkItem {
  id: string;

  version: number; // v1, v2...
  versionHistory: CreatorVersionSnapshot[];

  title: string;
  categoryId: string;
  categoryLabel: string;

  /** 영상 생성 템플릿(배경/자막 스타일 등) */
  templateId: string;

  /** 직무교육인 경우 연결되는 직무교육 ID(Stub) */
  jobTrainingId?: string;

  /** 교육 대상 부서(직무교육이면 보통 1개, 전사/4대교육은 전체 가능) */
  targetDeptIds: string[];

  /** UI에서 “필수” 토글용 (직무교육도 필수/선택이 가능하다는 가정) */
  isMandatory: boolean;

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

export interface CreatorVersionSnapshot {
  version: number;
  submittedAt: number; // 검토 요청 제출 시각
  note?: string;

  // 제출 당시 상태(보통 REVIEW_PENDING으로 기록)
  status: CreatorStatus;

  // 제출 당시 메타/자산 스냅샷
  title: string;
  categoryId: string;
  categoryLabel: string;
  templateId: string;
  jobTrainingId?: string;
  targetDeptIds: string[];
  assets: CreatorAssets;
}