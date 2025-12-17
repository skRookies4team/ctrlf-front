// src/components/chatbot/creatorStudioMocks.ts

import type {
  CategoryOption,
  CreatorPipeline,
  CreatorStatus,
  CreatorWorkItem,
  DepartmentOption,
  TrainingType,
} from "./creatorStudioTypes";

/**
 * 대상 부서 옵션 (요청 반영)
 * - 총무, 기획, 마케팅, 인사, 재무, 개발, 영업, 법무팀
 */
export const CREATOR_DEPARTMENTS: DepartmentOption[] = [
  { id: "D001", name: "총무팀" },
  { id: "D002", name: "기획팀" },
  { id: "D003", name: "마케팅팀" },
  { id: "D004", name: "인사팀" },
  { id: "D005", name: "재무팀" },
  { id: "D006", name: "개발팀" },
  { id: "D007", name: "영업팀" },
  { id: "D008", name: "법무팀" },
];

/**
 * 카테고리 옵션 (요청 반영)
 * - 직무, 성희롱 예방, 개인 정보 보호, 직장 내 괴롭힘, 장애인 인식 개선
 */
export const CREATOR_CATEGORIES: CategoryOption[] = [
  { id: "C001", name: "직무" },
  { id: "C002", name: "성희롱 예방" },
  { id: "C003", name: "개인 정보 보호" },
  { id: "C004", name: "직장 내 괴롭힘" },
  { id: "C005", name: "장애인 인식 개선" },
];

export function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
}

export function labelTrainingType(t: TrainingType): string {
  switch (t) {
    case "MANDATORY":
      return "4대 의무교육";
    case "JOB":
      return "직무교육";
    case "OTHER":
      return "기타/전사";
    default:
      return "교육";
  }
}

export function labelStatus(s: CreatorStatus): string {
  switch (s) {
    case "DRAFT":
      return "초안";
    case "GENERATING":
      return "생성 중";
    case "REVIEW_PENDING":
      return "검토 대기";
    case "REJECTED":
      return "반려";
    case "APPROVED":
      return "승인/게시";
    case "FAILED":
      return "생성 실패";
    default:
      return s;
  }
}

export function defaultPipeline(): CreatorPipeline {
  return {
    state: "IDLE",
    stage: null,
    progress: 0,
  };
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(
    16
  )}`;
}

/**
 * 파이프라인에서 생성될 mock 스크립트
 */
export function mockGenerateScript(title: string, categoryLabel: string): string {
  return [
    `# ${title}`,
    ``,
    `## 1. 목적`,
    `- 본 교육은 "${categoryLabel}" 관련 주요 원칙과 실무 행동 기준을 이해시키는 것을 목표로 합니다.`,
    ``,
    `## 2. 핵심 메시지`,
    `- 원칙을 한 문장으로 정리하고, 위반 사례를 피하는 방법을 설명합니다.`,
    `- 현업에서 바로 적용 가능한 체크리스트를 제공합니다.`,
    ``,
    `## 3. 사례`,
    `- 실제 상황을 가정한 예시 2~3개`,
    `- 바람직한 대응 vs 잘못된 대응 비교`,
    ``,
    `## 4. 요약`,
    `- 오늘의 핵심 포인트 3가지`,
  ].join("\n");
}

/**
 * 비디오 URL은 실제 연동 전에는 placeholder 문자열만 제공
 * (UI에서는 "미리보기 영역"만 표시)
 */
export function mockVideoUrl(itemId: string): string {
  return `mock://video/${itemId}`;
}

export function createNewDraftItem(
  params?: Partial<CreatorWorkItem>
): CreatorWorkItem {
  const now = Date.now();
  const category = CREATOR_CATEGORIES[0]; // 기본: "직무"

  return {
    id: uid("creator"),
    title: params?.title ?? "새 교육 콘텐츠",
    trainingType: params?.trainingType ?? "JOB",
    categoryId: params?.categoryId ?? category.id,
    categoryLabel: params?.categoryLabel ?? category.name,

    // 기존 코드에서 기본값이 "D004(개발팀)"였던 의도를 유지해서,
    // 새 부서 매핑에서는 "개발(D006)"을 기본 선택으로 둠.
    targetDeptIds: params?.targetDeptIds ?? ["D006"],

    isMandatory: params?.isMandatory ?? false,
    estimatedMinutes: params?.estimatedMinutes ?? 8,
    status: params?.status ?? "DRAFT",
    createdAt: params?.createdAt ?? now,
    updatedAt: params?.updatedAt ?? now,
    createdByName: params?.createdByName ?? "VIDEO_CREATOR",
    rejectedComment: params?.rejectedComment,
    failedReason: params?.failedReason,
    assets: params?.assets ?? {
      sourceFileName: undefined,
      script: "",
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: params?.pipeline ?? defaultPipeline(),
  };
}

export function createMockCreatorWorkItems(): CreatorWorkItem[] {
  const now = Date.now();
  const d = (days: number) => now - days * 24 * 60 * 60 * 1000;

  const item1 = createNewDraftItem({
    title: "직무교육: 내부 문서 반출 금지 가이드",
    trainingType: "JOB",
    categoryId: "C001",
    categoryLabel: "직무",
    targetDeptIds: ["D006", "D008"], // 개발, 법무팀
    isMandatory: true,
    estimatedMinutes: 12,
    status: "DRAFT",
    createdAt: d(3),
    updatedAt: d(1),
    assets: {
      sourceFileName: "job_doc_export_policy.pdf",
      script: "",
      videoUrl: "",
      thumbnailUrl: "",
    },
  });

  const item2 = createNewDraftItem({
    title: "4대 의무교육: 성희롱 예방 (2026)",
    trainingType: "MANDATORY",
    categoryId: "C002",
    categoryLabel: "성희롱 예방",
    targetDeptIds: [], // 전사
    isMandatory: true,
    estimatedMinutes: 18,
    status: "REVIEW_PENDING",
    createdAt: d(10),
    updatedAt: d(4),
    assets: {
      sourceFileName: "mandatory_anti_harassment_2026.pptx",
      script: mockGenerateScript("4대 의무교육: 성희롱 예방 (2026)", "성희롱 예방"),
      videoUrl: mockVideoUrl("m-anti-harassment-2026"),
      thumbnailUrl: "mock://thumbnail/m-anti-harassment-2026",
    },
    pipeline: {
      state: "SUCCESS",
      stage: "DONE",
      progress: 100,
      startedAt: d(10) + 1000,
      finishedAt: d(10) + 120000,
      message: "생성 완료",
    },
  });

  const item3 = createNewDraftItem({
    title: "직무교육: 직장 내 괴롭힘 예방 가이드",
    trainingType: "JOB",
    categoryId: "C004",
    categoryLabel: "직장 내 괴롭힘",
    targetDeptIds: ["D004", "D002"], // 인사, 기획
    isMandatory: false,
    estimatedMinutes: 9,
    status: "REJECTED",
    createdAt: d(14),
    updatedAt: d(7),
    rejectedComment:
      "사례 파트에서 실제 내부 사례로 오해될 수 있는 표현을 수정해주세요. 용어 정의를 명확히 해주세요.",
    assets: {
      sourceFileName: "workplace_bullying_prevention.pdf",
      script: mockGenerateScript(
        "직무교육: 직장 내 괴롭힘 예방 가이드",
        "직장 내 괴롭힘"
      ),
      videoUrl: mockVideoUrl("job-bullying"),
      thumbnailUrl: "mock://thumbnail/job-bullying",
    },
    pipeline: {
      state: "SUCCESS",
      stage: "DONE",
      progress: 100,
      startedAt: d(14) + 1000,
      finishedAt: d(14) + 90000,
      message: "생성 완료",
    },
  });

  const item4 = createNewDraftItem({
    title: "기타: 신규 입사자 개인 정보 보호 온보딩",
    trainingType: "OTHER",
    categoryId: "C003",
    categoryLabel: "개인 정보 보호",
    targetDeptIds: [], // 전사
    isMandatory: true,
    estimatedMinutes: 15,
    status: "APPROVED",
    createdAt: d(30),
    updatedAt: d(22),
    assets: {
      sourceFileName: "onboarding_privacy.pdf",
      script: mockGenerateScript(
        "기타: 신규 입사자 개인 정보 보호 온보딩",
        "개인 정보 보호"
      ),
      videoUrl: mockVideoUrl("onboarding-privacy"),
      thumbnailUrl: "mock://thumbnail/onboarding-privacy",
    },
    pipeline: {
      state: "SUCCESS",
      stage: "DONE",
      progress: 100,
      startedAt: d(30) + 1000,
      finishedAt: d(30) + 150000,
      message: "생성 완료",
    },
  });

  const item5 = createNewDraftItem({
    title: "직무교육: 장애인 인식 개선 기본 수칙",
    trainingType: "JOB",
    categoryId: "C005",
    categoryLabel: "장애인 인식 개선",
    targetDeptIds: ["D001", "D007"], // 총무, 영업
    isMandatory: false,
    estimatedMinutes: 10,
    status: "FAILED",
    createdAt: d(5),
    updatedAt: d(2),
    failedReason: "TTS 엔진 오류로 음성 합성에 실패했습니다.",
    assets: {
      sourceFileName: "disability_awareness_basics.pdf",
      script: "",
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: {
      state: "FAILED",
      stage: "SCRIPT",
      progress: 38,
      startedAt: d(5) + 1000,
      finishedAt: d(5) + 40000,
      message: "생성 실패",
    },
  });

  return [item1, item2, item3, item4, item5];
}

/**
 * 타겟 부서 ID → 라벨
 */
export function deptLabel(deptId: string): string {
  return CREATOR_DEPARTMENTS.find((d) => d.id === deptId)?.name ?? deptId;
}

export function categoryLabel(categoryId: string): string {
  return CREATOR_CATEGORIES.find((c) => c.id === categoryId)?.name ?? categoryId;
}
