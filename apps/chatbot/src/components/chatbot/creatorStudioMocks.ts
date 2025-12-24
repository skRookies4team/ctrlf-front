// src/components/chatbot/creatorStudioMocks.ts

import type {
  CategoryOption,
  CreatorPipeline,
  CreatorStatus,
  CreatorWorkItem,
  DepartmentOption,
  JobTrainingOption,
  VideoTemplateOption,
  CategoryKind,
  CreatorVersionSnapshot,
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
  { id: "C001", name: "직무", kind: "JOB" },
  { id: "C002", name: "성희롱 예방", kind: "MANDATORY" },
  { id: "C003", name: "개인 정보 보호", kind: "MANDATORY" },
  { id: "C004", name: "직장 내 괴롭힘", kind: "MANDATORY" },
  { id: "C005", name: "장애인 인식 개선", kind: "MANDATORY" },
];

/**
 * 영상 생성 템플릿 (P1: Stub)
 * - 실제 백엔드 연동 시 템플릿 ID/옵션을 API에서 내려받는 형태로 교체
 */
export const CREATOR_VIDEO_TEMPLATES: VideoTemplateOption[] = [
  { id: "T001", name: "기본(화이트)", description: "기본 배경 + 표준 자막" },
  { id: "T002", name: "자막 강조형", description: "가독성 높은 자막(굵기/하이라이트)" },
  { id: "T003", name: "미니멀(다크)", description: "다크 배경 + 미니멀 자막" },
];

/**
 * 직무교육 대상(Training ID) (P1: Stub)
 * - 실제 연동 시 '직무교육 목록'에서 선택(교육ID)하는 흐름으로 교체
 * - 표기 규칙: [ID] 스코프/부서 · 과정명 (소요시간)
 * - ID 규칙:
 *   - 공통: JT-COM-0xx
 *   - 총무(ADM), 기획(PLN), 마케팅(MKT), 인사(HR), 재무(FIN),
 *     개발(DEV), 영업(SAL), 법무(LEG)
 */
export const CREATOR_JOB_TRAININGS: JobTrainingOption[] = [
  // ===== 공통(온보딩/기본) =====
  { id: "JT-COM-001", name: "[JT-COM-001] 공통 · 직무 기본 오리엔테이션(업무 방식/용어) (60m)" },
  { id: "JT-COM-002", name: "[JT-COM-002] 공통 · 사내 문서 작성/보고 체계(템플릿/결재) (45m)" },
  { id: "JT-COM-003", name: "[JT-COM-003] 공통 · 협업툴 실무(메일/캘린더/메신저) (45m)" },
  { id: "JT-COM-004", name: "[JT-COM-004] 공통 · 정보자산/문서 반출 관리 실무(등급/반출 절차) (60m)" },

  // ===== 총무팀(ADM) =====
  { id: "JT-ADM-101", name: "[JT-ADM-101] 총무팀 · 구매/비용 집행 프로세스(품의~정산) (60m)" },
  { id: "JT-ADM-102", name: "[JT-ADM-102] 총무팀 · 자산 관리(비품/장비/재물조사) (45m)" },
  { id: "JT-ADM-103", name: "[JT-ADM-103] 총무팀 · 시설/출입/보안 운영(방문객/출입증) (45m)" },
  { id: "JT-ADM-104", name: "[JT-ADM-104] 총무팀 · 행사/회의 운영 실무(대관/의전) (45m)" },

  // ===== 기획팀(PLN) =====
  { id: "JT-PLN-201", name: "[JT-PLN-201] 기획팀 · 요구사항 정리/정의서 작성(범위/우선순위) (75m)" },
  { id: "JT-PLN-202", name: "[JT-PLN-202] 기획팀 · KPI/지표 설계(정의/수집/대시보드) (75m)" },
  { id: "JT-PLN-203", name: "[JT-PLN-203] 기획팀 · 프로젝트 계획(일정/리스크/이슈 관리) (60m)" },
  { id: "JT-PLN-204", name: "[JT-PLN-204] 기획팀 · 경영 보고/의사결정 자료 구조화(원페이저) (60m)" },

  // ===== 마케팅팀(MKT) =====
  { id: "JT-MKT-301", name: "[JT-MKT-301] 마케팅팀 · 캠페인 기획(목표/타겟/메시지) (60m)" },
  { id: "JT-MKT-302", name: "[JT-MKT-302] 마케팅팀 · 퍼포먼스 마케팅 지표(전환/ROAS) (75m)" },
  { id: "JT-MKT-303", name: "[JT-MKT-303] 마케팅팀 · 브랜드 가이드/톤앤매너(일관성) (45m)" },
  { id: "JT-MKT-304", name: "[JT-MKT-304] 마케팅팀 · 콘텐츠 제작 프로세스(기획-제작-검수) (60m)" },

  // ===== 인사팀(HR) =====
  { id: "JT-HR-401", name: "[JT-HR-401] 인사팀 · 채용 운영(서류/면접/레퍼런스) (75m)" },
  { id: "JT-HR-402", name: "[JT-HR-402] 인사팀 · 평가/보상 프로세스(캘리브레이션) (75m)" },
  { id: "JT-HR-403", name: "[JT-HR-403] 인사팀 · 인사 데이터/개인정보 취급 실무(권한/보관) (60m)" },
  { id: "JT-HR-404", name: "[JT-HR-404] 인사팀 · 교육 운영(커리큘럼/이수/리포트) (60m)" },

  // ===== 재무팀(FIN) =====
  { id: "JT-FIN-501", name: "[JT-FIN-501] 재무팀 · 비용 정산/증빙 기준(법인카드/세금계산서) (60m)" },
  { id: "JT-FIN-502", name: "[JT-FIN-502] 재무팀 · 월말 마감(전표/계정 과목) 기본 (75m)" },
  { id: "JT-FIN-503", name: "[JT-FIN-503] 재무팀 · 예산 편성/집행 관리(부서 예산) (60m)" },
  { id: "JT-FIN-504", name: "[JT-FIN-504] 재무팀 · 내부통제(승인/증빙/감사 대응) (60m)" },

  // ===== 개발팀(DEV) =====
  { id: "JT-DEV-601", name: "[JT-DEV-601] 개발팀 · 보안 코딩 기본(입력검증/권한/로깅) (75m)" },
  { id: "JT-DEV-602", name: "[JT-DEV-602] 개발팀 · 코드리뷰/브랜치 전략(Git Flow) (60m)" },
  { id: "JT-DEV-603", name: "[JT-DEV-603] 개발팀 · API 설계(버저닝/에러모델/계약) (75m)" },
  { id: "JT-DEV-604", name: "[JT-DEV-604] 개발팀 · 운영/장애 대응(모니터링/롤백) (60m)" },

  // ===== 영업팀(SAL) =====
  { id: "JT-SAL-701", name: "[JT-SAL-701] 영업팀 · 세일즈 파이프라인/CRM 운영(단계/리드) (60m)" },
  { id: "JT-SAL-702", name: "[JT-SAL-702] 영업팀 · 제안서/견적 실무(구성/산출 근거) (75m)" },
  { id: "JT-SAL-703", name: "[JT-SAL-703] 영업팀 · 고객 커뮤니케이션/협상 기본(클레임 대응) (60m)" },
  { id: "JT-SAL-704", name: "[JT-SAL-704] 영업팀 · 고객 정보 취급/보호(접근권한/공유) (60m)" },

  // ===== 법무팀(LEG) =====
  { id: "JT-LEG-801", name: "[JT-LEG-801] 법무팀 · 계약 검토 포인트(리스크/책임/해지) (75m)" },
  { id: "JT-LEG-802", name: "[JT-LEG-802] 법무팀 · 개인정보/위탁 계약(DPA) 기본 (60m)" },
  { id: "JT-LEG-803", name: "[JT-LEG-803] 법무팀 · 지식재산/라이선스(오픈소스) 기본 (60m)" },
  { id: "JT-LEG-804", name: "[JT-LEG-804] 법무팀 · 분쟁/컴플라이언스 이슈 대응(증적/기록) (60m)" },
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
    mode: "FULL" as CreatorPipeline["mode"],
    state: "IDLE",
    stage: null,
    progress: 0,
  };
}

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(16).slice(2)}-${Date.now().toString(16)}`;
}

/**
 * 파이프라인에서 생성될 mock 스크립트
 */
export function mockGenerateScript(title: string, categoryLabelText: string): string {
  return [
    `# ${title}`,
    ``,
    `## 1. 목적`,
    `- 본 교육은 "${categoryLabelText}" 관련 주요 원칙과 실무 행동 기준을 이해시키는 것을 목표로 합니다.`,
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

export function createNewDraftItem(params?: Partial<CreatorWorkItem>): CreatorWorkItem {
  const now = Date.now();
  const category = CREATOR_CATEGORIES[0]; // 기본: "직무"
  const resolvedCategoryId = params?.categoryId ?? category.id;
  const kind = getCategoryKind(resolvedCategoryId);

  const isMandatoryCategoryFlag = kind === "MANDATORY";

  const version = params?.version ?? 1;
  const versionHistory: CreatorVersionSnapshot[] = params?.versionHistory ?? [];

  return {
    id: uid("creator"),
    version,
    versionHistory,

    title: params?.title ?? "새 교육 콘텐츠",
    categoryId: resolvedCategoryId,
    categoryLabel: params?.categoryLabel ?? categoryLabel(resolvedCategoryId),

    templateId: params?.templateId ?? CREATOR_VIDEO_TEMPLATES[0].id,

    // JOB일 때만 존재
    jobTrainingId: isMandatoryCategoryFlag
      ? undefined
      : (params?.jobTrainingId ?? CREATOR_JOB_TRAININGS[0].id),

    // 4대는 전사 고정
    targetDeptIds: isMandatoryCategoryFlag ? [] : (params?.targetDeptIds ?? ["D006"]),

    // 단일 축 고정: 4대면 true, 직무면 false
    isMandatory: isMandatoryCategoryFlag,

    status: params?.status ?? "DRAFT",
    createdAt: params?.createdAt ?? now,
    updatedAt: params?.updatedAt ?? now,
    createdByName: params?.createdByName ?? "VIDEO_CREATOR",

    /**
     * 2단계 승인 플로우 표현용(선택 필드)
     * - 1차(스크립트) 승인 완료 시점(epoch ms)
     */
    scriptApprovedAt: params?.scriptApprovedAt,

    rejectedComment: params?.rejectedComment,
    failedReason: params?.failedReason,

    assets: params?.assets ?? {
      sourceFileName: undefined,
      sourceFileSize: undefined,
      sourceFileMime: undefined,
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
  const h = (hours: number) => now - hours * 60 * 60 * 1000;

  // 최종(영상 포함) 성공 파이프라인
  const success = (daysAgo: number, durMs: number, msg = "생성 완료"): CreatorPipeline => ({
    mode: "FULL" as CreatorPipeline["mode"],
    state: "SUCCESS",
    stage: "DONE",
    progress: 100,
    startedAt: d(daysAgo) + 1000,
    finishedAt: d(daysAgo) + 1000 + durMs,
    message: msg,
  });

  // 1차(스크립트만) 성공 파이프라인
  const scriptOk = (daysAgo: number, durMs: number, msg = "스크립트 생성 완료"): CreatorPipeline => ({
    mode: "FULL" as CreatorPipeline["mode"],
    state: "SUCCESS",
    stage: "SCRIPT",
    progress: 100,
    startedAt: d(daysAgo) + 1000,
    finishedAt: d(daysAgo) + 1000 + durMs,
    message: msg,
  });

  // 실패 파이프라인 공통 생성기
  const failed = (daysAgo: number, progress: number, msg: string): CreatorPipeline => ({
    mode: "FULL" as CreatorPipeline["mode"],
    state: "FAILED",
    stage: "SCRIPT",
    progress,
    startedAt: d(daysAgo) + 1000,
    finishedAt: d(daysAgo) + 1000 + 45000,
    message: msg,
  });

  /**
   * =========================
   * 1) DRAFT (초안)
   * =========================
   */

  // 공통 직무(전사 대상)
  const item1 = createNewDraftItem({
    title: "직무교육(공통): 정보자산·문서 반출 관리 실무 (JT-COM-004)",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-COM-004",
    templateId: "T002",
    targetDeptIds: [], // 전사
    status: "DRAFT",
    createdAt: d(2),
    updatedAt: d(0),
    createdByName: "이서준(기획팀)",
    assets: {
      sourceFileName: "JT-COM-004_info_asset_export_policy.pdf",
      script: "",
      videoUrl: "",
      thumbnailUrl: "",
    },
  });

  // 개발팀 — 1차 승인 완료 후 DRAFT로 되돌아온 케이스(영상 생성/재생성 활성화 시나리오)
  const item2 = createNewDraftItem({
    title: "직무교육(개발팀): 보안 코딩 기본 (JT-DEV-601)",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-DEV-601",
    templateId: "T001",
    targetDeptIds: ["D006"],
    status: "DRAFT",
    createdAt: d(1),
    updatedAt: d(1),
    createdByName: "김지훈(개발팀)",
    assets: {
      sourceFileName: "JT-DEV-601_secure_coding_basics.docx",
      script: mockGenerateScript("직무교육(개발팀): 보안 코딩 기본 (JT-DEV-601)", "직무"),
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: defaultPipeline(),
    scriptApprovedAt: h(20),
  });

  // 법무팀 — 완전 초안(업로드 전)
  const item3 = createNewDraftItem({
    title: "직무교육(법무팀): 계약 검토 포인트(리스크/책임/해지) (JT-LEG-801)",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-LEG-801",
    templateId: "T003",
    targetDeptIds: ["D008"],
    status: "DRAFT",
    createdAt: d(6),
    updatedAt: d(5),
    createdByName: "박도윤(법무팀)",
    assets: {
      sourceFileName: undefined,
      script: "",
      videoUrl: "",
      thumbnailUrl: "",
    },
  });

  /**
   * =========================
   * 2) REVIEW_PENDING (검토 대기)
   * - 1차: 스크립트만 있고 영상은 없음
   * - 2차: scriptApprovedAt 존재 + 영상 포함
   * =========================
   */

  // 1차(스크립트) — 4대 의무교육(전사) 성희롱 예방
  const item4 = createNewDraftItem({
    title: "4대 의무교육: 성희롱 예방 (2026) — 1차(스크립트) 검토 요청",
    categoryId: "C002",
    categoryLabel: "성희롱 예방",
    templateId: "T001",
    status: "REVIEW_PENDING",
    createdAt: d(9),
    updatedAt: d(4),
    createdByName: "최유나(인사팀)",
    assets: {
      sourceFileName: "mandatory_anti_harassment_2026.pptx",
      script: mockGenerateScript("4대 의무교육: 성희롱 예방 (2026)", "성희롱 예방"),
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: scriptOk(9, 45000),
  });

  // 1차(스크립트) — 총무팀 직무교육
  const item5 = createNewDraftItem({
    title: "직무교육(총무팀): 구매/비용 집행 프로세스(품의~정산) (JT-ADM-101) — 1차(스크립트) 검토 요청",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-ADM-101",
    templateId: "T002",
    targetDeptIds: ["D001"],
    status: "REVIEW_PENDING",
    createdAt: d(12),
    updatedAt: d(6),
    createdByName: "정하린(총무팀)",
    assets: {
      sourceFileName: "JT-ADM-101_purchase_expense_flow.hwp",
      script: mockGenerateScript(
        "직무교육(총무팀): 구매/비용 집행 프로세스(품의~정산) (JT-ADM-101)",
        "직무"
      ),
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: scriptOk(12, 52000),
  });

  // 2차(최종) — 마케팅팀 직무교육
  const item6 = createNewDraftItem({
    title: "직무교육(마케팅팀): 캠페인 기획(목표/타겟/메시지) (JT-MKT-301) — 2차(최종) 검토 요청",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-MKT-301",
    templateId: "T001",
    targetDeptIds: ["D003"],
    status: "REVIEW_PENDING",
    createdAt: d(8),
    updatedAt: d(3),
    createdByName: "한지민(마케팅팀)",
    assets: {
      sourceFileName: "JT-MKT-301_campaign_planning.pptx",
      script: mockGenerateScript("직무교육(마케팅팀): 캠페인 기획(목표/타겟/메시지) (JT-MKT-301)", "직무"),
      videoUrl: mockVideoUrl("jt-mkt-301"),
      thumbnailUrl: "mock://thumbnail/jt-mkt-301",
    },
    pipeline: success(8, 110000),
    scriptApprovedAt: h(72),
  });

  // 2차(최종) — 공통 직무(전사)
  const item7 = createNewDraftItem({
    title: "직무교육(공통): 사내 문서 작성/보고 체계(템플릿/결재) (JT-COM-002) — 2차(최종) 검토 요청",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-COM-002",
    templateId: "T002",
    targetDeptIds: [],
    status: "REVIEW_PENDING",
    createdAt: d(20),
    updatedAt: d(13),
    createdByName: "이서준(기획팀)",
    assets: {
      sourceFileName: "JT-COM-002_reporting_template_guides.pdf",
      script: mockGenerateScript("직무교육(공통): 사내 문서 작성/보고 체계(템플릿/결재) (JT-COM-002)", "직무"),
      videoUrl: mockVideoUrl("jt-com-002"),
      thumbnailUrl: "mock://thumbnail/jt-com-002",
    },
    pipeline: success(20, 85000),
    scriptApprovedAt: h(240),
  });

  // 추가 1차(스크립트) — 개발팀 코드리뷰
  const item16 = createNewDraftItem({
    title: "직무교육(개발팀): 코드리뷰/브랜치 전략(Git Flow) (JT-DEV-602) — 1차(스크립트) 검토 요청",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-DEV-602",
    templateId: "T003",
    targetDeptIds: ["D006"],
    status: "REVIEW_PENDING",
    createdAt: d(5),
    updatedAt: d(2),
    createdByName: "김지훈(개발팀)",
    assets: {
      sourceFileName: "JT-DEV-602_git_flow_guideline.md",
      script: mockGenerateScript("직무교육(개발팀): 코드리뷰/브랜치 전략(Git Flow) (JT-DEV-602)", "직무"),
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: scriptOk(5, 38000),
  });

  // 추가 2차(최종) — 재무팀 내부통제
  const item17 = createNewDraftItem({
    title: "직무교육(재무팀): 내부통제(승인/증빙/감사 대응) (JT-FIN-504) — 2차(최종) 검토 요청",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-FIN-504",
    templateId: "T002",
    targetDeptIds: ["D005"],
    status: "REVIEW_PENDING",
    createdAt: d(14),
    updatedAt: d(7),
    createdByName: "윤서아(재무팀)",
    assets: {
      sourceFileName: "JT-FIN-504_internal_control.pdf",
      script: mockGenerateScript("직무교육(재무팀): 내부통제(승인/증빙/감사 대응) (JT-FIN-504)", "직무"),
      videoUrl: mockVideoUrl("jt-fin-504"),
      thumbnailUrl: "mock://thumbnail/jt-fin-504",
    },
    pipeline: success(14, 98000),
    scriptApprovedAt: h(168),
  });

  /**
   * =========================
   * 3) REJECTED (반려)
   * - 1차/2차 반려가 섞이도록 구성
   * =========================
   */

  // 2차 반려 — 인사팀 평가/보상
  const item8 = createNewDraftItem({
    title: "직무교육(인사팀): 평가/보상 프로세스(캘리브레이션) (JT-HR-402) — 2차(최종) 반려",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-HR-402",
    templateId: "T001",
    targetDeptIds: ["D004"],
    status: "REJECTED",
    createdAt: d(18),
    updatedAt: d(9),
    createdByName: "최유나(인사팀)",
    rejectedComment:
      "평가 등급 산정 기준이 부서별로 다르게 해석될 수 있습니다. 용어 정의(등급/캘리브레이션)를 먼저 정리하고, 사례는 일반화된 표현으로 수정해주세요.",
    assets: {
      sourceFileName: "JT-HR-402_performance_compensation.pdf",
      script: mockGenerateScript("직무교육(인사팀): 평가/보상 프로세스(캘리브레이션) (JT-HR-402)", "직무"),
      videoUrl: mockVideoUrl("jt-hr-402"),
      thumbnailUrl: "mock://thumbnail/jt-hr-402",
    },
    pipeline: success(18, 98000),
    scriptApprovedAt: h(220),
  });

  // 1차 반려 — 4대 의무교육(전사) 직장 내 괴롭힘(스크립트만)
  const item9 = createNewDraftItem({
    title: "4대 의무교육: 직장 내 괴롭힘 예방 (2026) — 1차(스크립트) 반려",
    categoryId: "C004",
    categoryLabel: "직장 내 괴롭힘",
    templateId: "T002",
    status: "REJECTED",
    createdAt: d(25),
    updatedAt: d(15),
    createdByName: "최유나(인사팀)",
    rejectedComment:
      "사례 문장이 실제 사건으로 오해될 수 있습니다. 케이스를 익명화/일반화하고, 신고/대응 절차를 체크리스트로 보강해주세요.",
    assets: {
      sourceFileName: "mandatory_workplace_bullying_2026.pptx",
      script: mockGenerateScript("4대 의무교육: 직장 내 괴롭힘 예방 (2026)", "직장 내 괴롭힘"),
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: scriptOk(25, 60000, "스크립트 생성 완료(반려됨)"),
  });

  // 2차 반려 — 기획팀 KPI/지표 설계
  const item10 = createNewDraftItem({
    title: "직무교육(기획팀): KPI/지표 설계(정의/수집/대시보드) (JT-PLN-202) — 2차(최종) 반려",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-PLN-202",
    templateId: "T003",
    targetDeptIds: ["D002"],
    status: "REJECTED",
    createdAt: d(16),
    updatedAt: d(8),
    createdByName: "이서준(기획팀)",
    rejectedComment:
      "지표 정의가 추상적입니다. 예시 KPI 3개(정의/수식/수집 위치)를 표로 추가하고, '좋은 지표 vs 나쁜 지표' 비교를 넣어주세요.",
    assets: {
      sourceFileName: "JT-PLN-202_kpi_metric_design.pptx",
      script: mockGenerateScript("직무교육(기획팀): KPI/지표 설계(정의/수집/대시보드) (JT-PLN-202)", "직무"),
      videoUrl: mockVideoUrl("jt-pln-202"),
      thumbnailUrl: "mock://thumbnail/jt-pln-202",
    },
    pipeline: success(16, 105000),
    scriptApprovedAt: h(190),
  });

  /**
   * =========================
   * 4) APPROVED (승인/게시)
   * =========================
   */

  // 4대 의무교육(전사) — 개인정보 보호
  const item11 = createNewDraftItem({
    title: "4대 의무교육: 개인정보 보호(신규 입사자 온보딩) (2025)",
    categoryId: "C003",
    categoryLabel: "개인 정보 보호",
    templateId: "T001",
    status: "APPROVED",
    createdAt: d(40),
    updatedAt: d(22),
    createdByName: "박도윤(법무팀)",
    assets: {
      sourceFileName: "mandatory_privacy_onboarding_2025.pdf",
      script: mockGenerateScript("4대 의무교육: 개인정보 보호(신규 입사자 온보딩) (2025)", "개인 정보 보호"),
      videoUrl: mockVideoUrl("mandatory-privacy-onboarding-2025"),
      thumbnailUrl: "mock://thumbnail/mandatory-privacy-onboarding-2025",
    },
    pipeline: success(40, 150000),
    scriptApprovedAt: h(520),
  });

  // 재무팀 — 월말 마감
  const item12 = createNewDraftItem({
    title: "직무교육(재무팀): 월말 마감(전표/계정 과목) 기본 (JT-FIN-502)",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-FIN-502",
    templateId: "T002",
    targetDeptIds: ["D005"],
    status: "APPROVED",
    createdAt: d(33),
    updatedAt: d(26),
    createdByName: "윤서아(재무팀)",
    assets: {
      sourceFileName: "JT-FIN-502_month_end_closing.pdf",
      script: mockGenerateScript("직무교육(재무팀): 월말 마감(전표/계정 과목) 기본 (JT-FIN-502)", "직무"),
      videoUrl: mockVideoUrl("jt-fin-502"),
      thumbnailUrl: "mock://thumbnail/jt-fin-502",
    },
    pipeline: success(33, 140000),
    scriptApprovedAt: h(420),
  });

  // 개발팀 — API 설계
  const item13 = createNewDraftItem({
    title: "직무교육(개발팀): API 설계(버저닝/에러모델/계약) (JT-DEV-603)",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-DEV-603",
    templateId: "T003",
    targetDeptIds: ["D006", "D002"], // 개발+기획 같이 듣는 케이스
    status: "APPROVED",
    createdAt: d(28),
    updatedAt: d(21),
    createdByName: "김지훈(개발팀)",
    assets: {
      sourceFileName: "JT-DEV-603_api_contract_guideline.pptx",
      script: mockGenerateScript("직무교육(개발팀): API 설계(버저닝/에러모델/계약) (JT-DEV-603)", "직무"),
      videoUrl: mockVideoUrl("jt-dev-603"),
      thumbnailUrl: "mock://thumbnail/jt-dev-603",
    },
    pipeline: success(28, 125000),
    scriptApprovedAt: h(360),
  });

  /**
   * =========================
   * 5) FAILED (실패)
   * =========================
   */

  // 영업팀 — 고객 정보 취급(실패)
  const item14 = createNewDraftItem({
    title: "직무교육(영업팀): 고객 정보 취급/보호(접근권한/공유) (JT-SAL-704)",
    categoryId: "C001",
    categoryLabel: "직무",
    jobTrainingId: "JT-SAL-704",
    templateId: "T001",
    targetDeptIds: ["D007"],
    status: "FAILED",
    createdAt: d(7),
    updatedAt: d(2),
    createdByName: "이민호(영업팀)",
    failedReason: "TTS 엔진 오류로 음성 합성에 실패했습니다.",
    assets: {
      sourceFileName: "JT-SAL-704_customer_data_handling.pdf",
      script: "",
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: failed(7, 42, "생성 실패(TTS)"),
  });

  // 4대 의무교육(전사) — 장애인 인식 개선(실패)
  const item15 = createNewDraftItem({
    title: "4대 의무교육: 장애인 인식 개선 (2026) — 자료 변환 실패",
    categoryId: "C005",
    categoryLabel: "장애인 인식 개선",
    templateId: "T002",
    status: "FAILED",
    createdAt: d(11),
    updatedAt: d(5),
    createdByName: "정하린(총무팀)",
    failedReason: "슬라이드 변환 단계에서 폰트 임베딩 오류가 발생했습니다.",
    assets: {
      sourceFileName: "mandatory_disability_awareness_2026.pptx",
      script: "",
      videoUrl: "",
      thumbnailUrl: "",
    },
    pipeline: failed(11, 28, "생성 실패(변환)"),
  });

  return [
    // draft
    item1,
    item2,
    item3,

    // review_pending (1차/2차 섞임)
    item4,
    item5,
    item6,
    item7,
    item16,
    item17,

    // rejected (1차/2차 섞임)
    item8,
    item9,
    item10,

    // approved
    item11,
    item12,
    item13,

    // failed
    item14,
    item15,
  ];
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

export function templateLabel(templateId: string): string {
  return CREATOR_VIDEO_TEMPLATES.find((t) => t.id === templateId)?.name ?? templateId;
}

export function jobTrainingLabel(jobTrainingId: string): string {
  return CREATOR_JOB_TRAININGS.find((t) => t.id === jobTrainingId)?.name ?? jobTrainingId;
}

// 상수
export const CREATOR_JOB_CATEGORY_ID = "C001" as const;
export const CREATOR_MANDATORY_CATEGORY_IDS = ["C002", "C003", "C004", "C005"] as const;

// 헬퍼
export function getCategoryKind(categoryId: string): CategoryKind {
  return (
    CREATOR_CATEGORIES.find((c) => c.id === categoryId)?.kind ??
    (categoryId === CREATOR_JOB_CATEGORY_ID ? "JOB" : "MANDATORY")
  );
}

export function isJobCategory(categoryId: string): boolean {
  return getCategoryKind(categoryId) === "JOB";
}

export function isMandatoryCategory(categoryId: string): boolean {
  return getCategoryKind(categoryId) === "MANDATORY";
}
