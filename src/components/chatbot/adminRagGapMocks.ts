// src/components/chatbot/adminRagGapMocks.ts
import type { RagGapItem } from "./adminRagGapTypes";

/**
 * AdminRagGapView.tsx 에 있던
 * RAG 갭 분석용 Mock / 데모 데이터 상수.
 */

/**
 * RAG 갭 분석용 Mock 데이터
 * - 실제 연동 시: RAG 갭 테이블 / API 응답 구조에 맞춰 교체
 * - 다양한 부서/도메인/Route/모델/우선순위 케이스를 포함
 */
export const RAG_GAP_ITEMS_MOCK: RagGapItem[] = [
  // ===== HR / 휴가·휴직 =====
  {
    id: "gap-001",
    createdAt: "2025-12-09 10:12:03",
    lastAskedAt: "2025-12-09 10:12:03",
    askedCount: 4,
    deptCode: "HR",
    deptName: "인사팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "POLICY",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 0,
    ragMaxScore: 0.06,
    hasPii: false,
    isError: false,
    question: "육아휴직 중 급여와 복직 절차를 한 번에 정리해 주세요.",
    category: "휴가·휴직 / 복직",
    gapType: "NO_DOC",
    gapReason:
      "RAG 검색 결과 0건. 관련 규정이 여러 문서에 흩어져 있어 단일 문서로 매핑되지 않음.",
    priority: "HIGH",
    suggestion:
      "육아휴직·출산휴가·복직 절차를 통합한 '휴직·복직 가이드' 문서를 신설하고 인덱싱.",
    ownerDeptName: "인사팀",
    answerSnippet:
      "현재 휴직 및 복직 절차는 인사 규정 여러 조항에 나뉘어 있어 한 번에 조회하기 어렵습니다...",
    answerFull:
      "현재 휴직 및 복직 절차는 인사 규정 제3장, 제5장 등에 분산되어 있어 한 번에 확인하기 어렵습니다. 인사팀에 문의하면 자세한 안내를 받을 수 있지만, 전사 공지 문서로는 정리되어 있지 않은 상태입니다.",
    adminNotes: null,
  },
  {
    id: "gap-002",
    createdAt: "2025-12-09 09:41:28",
    lastAskedAt: "2025-12-09 09:50:10",
    askedCount: 3,
    deptCode: "DEV",
    deptName: "개발팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "GENERAL",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.31,
    hasPii: false,
    isError: false,
    question:
      "외주 개발자가 사내 GitLab에 접근해야 할 때 계정 발급/권한 신청 절차를 알려줘.",
    category: "계정·접근 권한",
    gapType: "LOW_COVERAGE",
    gapReason:
      "권한 신청 공지 문서 1건만 검색되어 구체적인 승인 플로우/책임자가 안내되지 않음.",
    priority: "MEDIUM",
    suggestion:
      "외주 인력 계정 발급 프로세스를 별도 가이드로 분리하고, 승인자/유효기간 예시를 추가.",
    ownerDeptName: "개발팀",
    answerSnippet:
      "외주 개발자의 GitLab 계정은 담당자의 요청으로 발급되며, 권한은 프로젝트별로 부여됩니다...",
    answerFull:
      "외주 개발자의 GitLab 계정은 내부 담당자의 요청에 따라 발급되며, 현재는 공지 사항 하나로만 절차가 안내되고 있습니다. 승인자, 계정 유효기간, 보안 서약 등의 상세 정보가 문서에 포함되어 있지 않아 반복 문의가 발생합니다.",
    adminNotes: null,
  },
  {
    id: "gap-003",
    createdAt: "2025-12-09 09:03:11",
    lastAskedAt: "2025-12-09 09:20:45",
    askedCount: 5,
    deptCode: "SALES",
    deptName: "영업팀",
    userRole: "EMPLOYEE",
    intentId: "EDU_QA",
    domainId: "INCIDENT",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 2,
    ragMaxScore: 0.42,
    hasPii: true,
    isError: false,
    question:
      "고객이 개인정보 삭제를 요청했을 때, 영업에서 무엇까지 처리하고 어디로 넘겨야 하나요?",
    category: "개인정보 파기·정정",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "보존 기간이 구 버전 기준으로 안내되고, 현재 내부 파기 접수 채널 정보가 누락되어 있음.",
    priority: "HIGH",
    suggestion:
      "개인정보 파기·정정 절차 문서를 최신화하고, 채널/처리 기한/책임 조직을 표로 정리.",
    ownerDeptName: "법무팀 · 인사팀 공통",
    answerSnippet:
      "개인정보 삭제 요청 시 영업 부서는 1차로 요청을 접수하고, 전담 부서로 이관해야 합니다...",
    answerFull:
      "개인정보 삭제 요청 시 영업 부서는 1차로 요청을 접수하고, 고객 신원 확인 후 내부 개인정보 보호 전담 부서로 이관해야 합니다. 다만 현재 문서에는 보존 기간과 예외 사항이 구 버전 기준으로만 안내되어 있고, 실제 파기 접수 채널이 최신 조직 구조와 맞지 않아 혼선이 발생하고 있습니다.",
    adminNotes: "신규 개인정보 처리방침 개정 일정과 맞춰 업데이트 필요.",
  },
  {
    id: "gap-004",
    createdAt: "2025-12-08 16:27:54",
    lastAskedAt: "2025-12-08 18:02:10",
    askedCount: 2,
    deptCode: "MKT",
    deptName: "마케팅팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "POLICY",
    routeId: "ROUTE_LLM_ONLY",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 0,
    ragMaxScore: 0.17,
    hasPii: false,
    isError: false,
    question:
      "고객 후기를 캡처해서 사내 SNS에 올릴 때, 가려야 하는 정보와 동의 범위를 알려줘.",
    category: "마케팅 / 초상권·저작권",
    gapType: "NO_DOC",
    gapReason:
      "관련 가이드 문서가 없어 모델이 일반적인 개인정보 보호 원칙만 안내하고 있음.",
    priority: "MEDIUM",
    suggestion:
      "마케팅용 콘텐츠 제작 가이드를 신설하고, 캡처 예시(허용/금지 사례)를 포함해 인덱싱.",
    ownerDeptName: "마케팅팀 · 법무팀",
    answerSnippet:
      "고객 후기를 사용할 때에는 이름, 연락처 등 식별 가능한 정보는 가리는 것이 안전합니다...",
    answerFull:
      "고객 후기를 마케팅에 활용할 때에는 사전에 동의를 받는 것이 원칙이며, 동의 범위(채널, 기간, 사용 목적)를 명시해야 합니다. 하지만 현재는 이를 정리한 내부 가이드 문서가 없어, 모델이 일반적인 개인정보 보호 원칙만 설명하고 있습니다.",
    adminNotes: null,
  },
  {
    id: "gap-005",
    createdAt: "2025-12-08 15:11:09",
    lastAskedAt: "2025-12-08 15:40:22",
    askedCount: 1,
    deptCode: "GA",
    deptName: "총무팀",
    userRole: "COMPLAINT_MANAGER",
    intentId: "INCIDENT_QA",
    domainId: "INCIDENT",
    routeId: "ROUTE_INCIDENT",
    modelName: "gpt-4.1",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.29,
    hasPii: true,
    isError: true,
    question:
      "사무실에서 고객 정보가 들어 있는 USB를 발견했는데, 어디로 신고하고 어떻게 보관해야 하나요?",
    category: "보안 사고 신고·대응",
    gapType: "NO_DOC",
    gapReason:
      "Incident 라우트 타임아웃 + 1건의 구 문서만 매칭. 보관 방법/증적 촬영 규칙이 누락되어 있음.",
    priority: "HIGH",
    suggestion:
      "현장 보안 사고 1차 대응 체크리스트 문서를 만들고, 신고 채널/보관 규칙을 표로 정리.",
    ownerDeptName: "보안팀 · 총무팀",
    answerSnippet:
      "고객 정보가 포함된 저장매체를 발견한 경우, 즉시 보안 담당자에게 신고해야 합니다...",
    answerFull:
      "고객 정보가 포함된 저장매체를 발견한 경우, 즉시 보안 담당 부서 또는 지정된 신고 채널로 신고해야 합니다. 그러나 현재 문서에는 신고 후 보관 방법, 봉인 절차, 증적 촬영 규칙 등이 빠져 있어 일관된 사고 대응이 어렵습니다.",
    adminNotes: null,
  },
  {
    id: "gap-006",
    createdAt: "2025-12-08 14:02:47",
    lastAskedAt: "2025-12-08 14:30:11",
    askedCount: 2,
    deptCode: "DEV",
    deptName: "개발팀",
    userRole: "EMPLOYEE",
    intentId: "EDU_QA",
    domainId: "EDUCATION",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "rerank+gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.38,
    hasPii: false,
    isError: false,
    question:
      "보안 코딩 교육에서 본 DB 암호화 예제 코드를 실제 프로젝트에 써도 되는지 궁금해요.",
    category: "보안 교육 / 예제 코드 활용",
    gapType: "LOW_COVERAGE",
    gapReason:
      "교육 자료 원본만 검색되어 라이선스/적용 범위 설명이 부족해 추가 문의가 반복됨.",
    priority: "LOW",
    suggestion:
      "교육 예제 코드 사용 가이드(허용 범위, 라이선스, 금지 예시)를 추가 문서로 분리해 인덱싱.",
    ownerDeptName: "보안팀 · 개발팀",
    answerSnippet:
      "교육 예제 코드는 참고용으로 제공되며, 실제 서비스 코드에 그대로 사용하는 것은 권장되지 않습니다...",
    answerFull:
      "교육 예제 코드는 개념 설명을 위한 참고용이며, 실제 서비스 코드에 그대로 사용하는 것은 권장되지 않습니다. 라이선스 및 적용 범위에 대한 별도 가이드가 없어, 개발자들은 어느 수준까지 재사용 가능한지 혼란을 겪고 있습니다.",
    adminNotes: null,
  },

  // ===== 추가: 재택근무 / HR =====
  {
    id: "gap-007",
    createdAt: "2025-12-07 11:20:10",
    lastAskedAt: "2025-12-09 11:45:33",
    askedCount: 6,
    deptCode: "HR",
    deptName: "인사팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "POLICY",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.27,
    hasPii: false,
    isError: false,
    question:
      "재택근무 시 근무 시간 기록 방식과 팀장 승인 절차를 한 번에 볼 수 있는 문서가 있나요?",
    category: "재택근무 / 근무 시간 관리",
    gapType: "LOW_COVERAGE",
    gapReason:
      "재택근무 지침과 근태 규정이 서로 다른 문서에 흩어져 있어 실제 처리 흐름이 명확하지 않음.",
    priority: "MEDIUM",
    suggestion:
      "재택근무 전용 근태 처리 가이드를 만들고, 시스템 입력 예시와 승인 플로우를 포함해 인덱싱.",
    ownerDeptName: "인사팀",
    answerSnippet:
      "재택근무 시 근무 시간은 기존 근태 시스템에 동일하게 기록하지만, 일부 예외 사항이 존재합니다...",
    answerFull:
      "재택근무 시 근무 시간은 기존 근태 시스템에 동일하게 기록하지만, 긴급 콜 대응이나 야간 배포 등 예외 상황이 존재합니다. 현재는 재택근무 지침과 근태 관리 규정이 별도 문서로 나뉘어 있어, 실무자가 전체 플로우를 한 번에 파악하기 어렵습니다.",
    adminNotes: null,
  },

  // ===== 재무 / 법인카드 =====
  {
    id: "gap-008",
    createdAt: "2025-12-07 09:15:44",
    lastAskedAt: "2025-12-09 09:58:02",
    askedCount: 8,
    deptCode: "FIN",
    deptName: "재무팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "POLICY",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 2,
    ragMaxScore: 0.54,
    hasPii: false,
    isError: false,
    question:
      "법인카드로 온라인 구독 서비스를 결제했을 때, 어떤 항목까지 비용 처리 가능하고 해지는 누가 해야 하나요?",
    category: "법인카드 / 비용 정산",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "예전 비용 규정 기준으로만 안내되고, SaaS 구독 관련 예외 규정과 해지 담당 부서 정보가 누락됨.",
    priority: "MEDIUM",
    suggestion:
      "SaaS·구독형 서비스 전용 비용 처리 가이드를 작성하고, 사용 승인/해지 절차를 명시해 인덱싱.",
    ownerDeptName: "재무팀 · IT운영팀",
    answerSnippet:
      "법인카드로 결제한 온라인 구독 서비스는 사업 관련성이 입증되면 비용 처리할 수 있습니다...",
    answerFull:
      "법인카드로 결제한 온라인 구독 서비스는 사업 관련성이 입증되면 비용 처리할 수 있으나, 현재 비용 규정에는 일반적인 경비 항목만 나열되어 있고 SaaS 형태 서비스의 승인 기준과 해지 절차가 명시되어 있지 않습니다. 이로 인해 구독 중복, 해지 누락 등의 리스크가 존재합니다.",
    adminNotes: null,
  },

  // ===== IT / 장비 반납 =====
  {
    id: "gap-009",
    createdAt: "2025-12-06 18:02:11",
    lastAskedAt: "2025-12-08 09:22:19",
    askedCount: 4,
    deptCode: "IT",
    deptName: "IT운영팀",
    userRole: "EMPLOYEE",
    intentId: "GENERAL_QA",
    domainId: "GENERAL",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.33,
    hasPii: false,
    isError: false,
    question:
      "퇴사 예정자가 사용하는 노트북과 보안 토큰은 언제까지 어떻게 반납해야 하나요?",
    category: "IT 자산 / 장비 반납",
    gapType: "LOW_COVERAGE",
    gapReason:
      "퇴사 프로세스 안내 문서에는 장비 반납 마감일이 모호하고, 보안 매체 회수 절차가 분리되어 있음.",
    priority: "HIGH",
    suggestion:
      "퇴사 체크리스트에 IT 자산 반납 섹션을 추가하고, 반납 기한·위치·담당자 정보를 정리해 인덱싱.",
    ownerDeptName: "IT운영팀 · 인사팀",
    answerSnippet:
      "퇴사 예정자의 장비 반납은 인사팀에서 공지하는 일정에 맞추어 IT운영팀으로 전달해야 합니다...",
    answerFull:
      "퇴사 예정자의 장비 반납은 인사팀에서 공지하는 일정에 맞추어 IT운영팀으로 전달해야 하지만, 현재 문서에는 구체적인 마감시간과 반납 위치 정보가 누락되어 있습니다. 또한 OTP 토큰, 보안 카드 등 보안 매체 회수 절차가 별도 문서에 있어 실제 담당자들이 혼선을 겪고 있습니다.",
    adminNotes: null,
  },

  // ===== CS / VOC 처리 =====
  {
    id: "gap-010",
    createdAt: "2025-12-06 15:24:03",
    lastAskedAt: "2025-12-09 08:59:51",
    askedCount: 7,
    deptCode: "CS",
    deptName: "고객센터",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "INCIDENT",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 2,
    ragMaxScore: 0.49,
    hasPii: true,
    isError: false,
    question:
      "고객이 콜센터 통화 녹취 파일 열람을 요청했을 때, 어떤 절차로 처리해야 하나요?",
    category: "VOC / 녹취 열람·제공",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "구 개인정보 처리방침에 기반한 절차만 안내되고, 현재 보관 기간·제공 채널 정보가 실무와 맞지 않음.",
    priority: "HIGH",
    suggestion:
      "통화 녹취 열람·제공 절차를 최신 개인정보 처리방침 기준으로 재정리하고, 신청 양식과 책임 부서를 명시.",
    ownerDeptName: "고객센터 · 개인정보보호팀",
    answerSnippet:
      "녹취 파일 열람 요청은 서면 또는 홈페이지 양식으로 접수한 뒤, 내부 승인 후 제공해야 합니다...",
    answerFull:
      "현행법에 따라 통화 녹취 파일 열람은 제한된 범위에서만 허용되며, 신청 경로와 본인 확인 절차가 중요합니다. 그러나 내부 문서는 과거 보관 기간과 시스템 구조를 기준으로 작성되어 있어, 실제 제공 가능 기간과 채널 정보가 최신 상태와 맞지 않습니다.",
    adminNotes: "내년 상반기 콜센터 시스템 교체 일정과 연계 필요.",
  },

  // ===== 교육 / 필수 이수 기준 =====
  {
    id: "gap-011",
    createdAt: "2025-12-05 09:11:57",
    lastAskedAt: "2025-12-08 17:40:28",
    askedCount: 9,
    deptCode: "HRD",
    deptName: "교육팀",
    userRole: "EMPLOYEE",
    intentId: "EDU_QA",
    domainId: "EDUCATION",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 3,
    ragMaxScore: 0.61,
    hasPii: false,
    isError: false,
    question:
      "개인정보 보호·정보보안·성희롱 예방 교육 중에서 입사 첫해에 반드시 이수해야 하는 과정만 따로 볼 수 있나요?",
    category: "필수 교육 / 이수 기준",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "교육 과정 안내 문서가 연도별로 분리되어 있고, 입사 연차/직군별 필수·선택 구분이 명확하지 않음.",
    priority: "MEDIUM",
    suggestion:
      "입사 연차·직군별 필수 교육 매트릭스를 표로 정리한 요약 문서를 만들고, 교육 시스템과 연결해 인덱싱.",
    ownerDeptName: "교육팀 · 인사팀",
    answerSnippet:
      "법정 의무 교육은 전 직원 공통이지만, 일부 과정은 직군·직급에 따라 필수 여부가 달라집니다...",
    answerFull:
      "법정 의무 교육은 전 직원이 공통으로 이수해야 하지만, 현재 교육 포털에는 과거 과정명이 혼재되어 있어 신규 입사자가 어떤 과정부터 들어야 할지 혼란을 겪고 있습니다. 입사 연차와 직군에 따른 필수/선택 구분을 한눈에 볼 수 있는 매트릭스 문서가 필요합니다.",
    adminNotes: null,
  },

  // ===== 법무 / 계약관리 =====
  {
    id: "gap-012",
    createdAt: "2025-12-05 10:45:02",
    lastAskedAt: "2025-12-07 16:20:13",
    askedCount: 3,
    deptCode: "LEGAL",
    deptName: "법무팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "POLICY",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.44,
    hasPii: false,
    isError: false,
    question:
      "단순 용역 계약이라도 일정 금액 이상이면 반드시 법무 검토를 받아야 하는 기준 금액이 있나요?",
    category: "계약 / 법무 검토 기준",
    gapType: "LOW_COVERAGE",
    gapReason:
      "구두 관행으로만 공유되던 금액 기준이 문서에 반영되어 있지 않아, 계약 담당자가 매번 별도 문의함.",
    priority: "MEDIUM",
    suggestion:
      "계약 유형·금액·리스크 수준에 따른 법무 검토 필요 여부를 표로 정리한 가이드를 작성해 인덱싱.",
    ownerDeptName: "법무팀",
    answerSnippet:
      "일반적으로 일정 금액 이상이거나 장기 계약의 경우 법무 검토를 권장하고 있습니다...",
    answerFull:
      "현재는 실무자 사이에서만 알고 있는 '관행적 기준'이 존재하지만, 공식 문서에는 명시되어 있지 않아 신규 담당자가 혼란을 겪습니다. 계약 유형과 금액, 리스크 수준에 따른 법무 검토 필요 여부를 명확히 구분한 표가 필요합니다.",
    adminNotes: null,
  },

  // ===== 보안 / 패스워드 정책 =====
  {
    id: "gap-013",
    createdAt: "2025-12-04 13:02:30",
    lastAskedAt: "2025-12-09 10:01:45",
    askedCount: 11,
    deptCode: "SEC",
    deptName: "정보보안팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "POLICY",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 2,
    ragMaxScore: 0.58,
    hasPii: false,
    isError: false,
    question:
      "사내 시스템 패스워드 변경 주기와 복잡도 규칙이 시스템마다 달라서 헷갈리는데, 한 번에 정리된 표가 있나요?",
    category: "정보보안 / 패스워드 정책",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "개별 시스템 운영 문서에만 규칙이 흩어져 있고, 일부 규칙은 실제 구현과 다른 상태로 안내되고 있음.",
    priority: "HIGH",
    suggestion:
      "주요 시스템별 패스워드 정책을 한 번에 볼 수 있는 통합 표를 만들고, 변경 이력 관리 방식을 포함해 인덱싱.",
    ownerDeptName: "정보보안팀",
    answerSnippet:
      "현재 패스워드 정책은 전사 기본 규칙과 시스템별 예외 규칙으로 나뉘어 있습니다...",
    answerFull:
      "전사 정보보안 규정에는 기본 패스워드 정책만 서술되어 있고, 실제 각 시스템의 세부 규칙은 운영 문서에만 존재합니다. 이 때문에 사용자들은 어떤 시스템에서 어느 주기로 비밀번호를 바꿔야 하는지 매번 헷갈려 합니다.",
    adminNotes: "내부 감사 지적사항과 연계하여 조기 개선 필요.",
  },

  // ===== 운영 / 교대 근무 =====
  {
    id: "gap-014",
    createdAt: "2025-12-04 08:51:22",
    lastAskedAt: "2025-12-08 06:40:03",
    askedCount: 5,
    deptCode: "OPS",
    deptName: "서비스운영팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "POLICY",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.36,
    hasPii: false,
    isError: false,
    question:
      "야간 교대 근무자가 다음 근무자에게 인수인계할 때 반드시 남겨야 하는 체크리스트가 있나요?",
    category: "운영 / 교대 근무 인수인계",
    gapType: "NO_DOC",
    gapReason:
      "팀별로 사용하는 인수인계 양식이 제각각이라, 전사 표준 체크리스트 문서가 존재하지 않음.",
    priority: "MEDIUM",
    suggestion:
      "공통 인수인계 체크리스트 템플릿을 만들고, 팀별 항목 추가 예시와 함께 인덱싱.",
    ownerDeptName: "서비스운영팀",
    answerSnippet:
      "현재는 각 팀에서 자체적으로 만든 인수인계 문서를 사용하고 있어 형식이 다를 수 있습니다...",
    answerFull:
      "일부 팀은 인수인계 문서를 꼼꼼히 작성하지만, 다른 팀은 구두 인수인계에 의존하고 있어 사고 가능성이 존재합니다. 서비스 안정성을 위해 공통 체크리스트 템플릿이 필요합니다.",
    adminNotes: null,
  },

  // ===== HR / 평가·승진 =====
  {
    id: "gap-015",
    createdAt: "2025-12-03 14:11:49",
    lastAskedAt: "2025-12-07 19:20:55",
    askedCount: 4,
    deptCode: "HR",
    deptName: "인사팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "POLICY",
    routeId: "ROUTE_LLM_ONLY",
    modelName: "gpt-4.1-mini",
    ragGapCandidate: true,
    ragSourceCount: 0,
    ragMaxScore: 0.21,
    hasPii: false,
    isError: false,
    question:
      "승진 심사 탈락 후 재지원까지 필요한 최소 기간과 재평가 기준이 궁금합니다.",
    category: "인사 / 평가·승진",
    gapType: "NO_DOC",
    gapReason:
      "평가 규정에는 승진 심사 기준만 기재되어 있고, 탈락 후 재지원 정책이 별도 정리되어 있지 않음.",
    priority: "MEDIUM",
    suggestion:
      "승진 심사 FAQ 문서를 신설해 탈락 사유 안내, 재지원 가능 시점, 보완 권고 사항을 정리.",
    ownerDeptName: "인사팀",
    answerSnippet:
      "승진 심사 탈락 시에는 다음 연도에 다시 지원할 수 있으나, 세부 기준은 부서별로 상이할 수 있습니다...",
    answerFull:
      "현재는 승진 심사 탈락자에게 개별적으로만 피드백이 제공되고 있어, 공통적인 재지원 기준을 이해하기 어렵습니다. 투명성을 위해 FAQ 형태의 안내 문서가 필요합니다.",
    adminNotes: null,
  },

  // ===== 마케팅 / 캠페인 데이터 보관 =====
  {
    id: "gap-016",
    createdAt: "2025-12-03 10:33:20",
    lastAskedAt: "2025-12-06 17:01:18",
    askedCount: 3,
    deptCode: "MKT",
    deptName: "마케팅팀",
    userRole: "EMPLOYEE",
    intentId: "EDU_QA",
    domainId: "GENERAL",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.41,
    hasPii: true,
    isError: false,
    question:
      "온라인 이벤트 참여자 이메일을 마케팅 분석용으로 얼마나 오래 보관해도 되는지 기준이 궁금해요.",
    category: "마케팅 / 캠페인 데이터 보관",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "개인정보 보관 기간 표가 서비스 유형 기준으로만 작성되어 있어, 캠페인 유형별 예외 사항이 반영되지 않음.",
    priority: "HIGH",
    suggestion:
      "캠페인·이벤트 데이터 보관·파기 기준을 별도 표로 정리하고, 동의서 문구 예시와 연결해 인덱싱.",
    ownerDeptName: "마케팅팀 · 개인정보보호팀",
    answerSnippet:
      "이벤트 참여자 정보는 동의 목적이 달성되면 지체 없이 파기하는 것이 원칙입니다...",
    answerFull:
      "실무에서는 리타깃팅, 재참여 혜택 제공 등을 위해 데이터를 일정 기간 보관하지만, 현재 문서에는 캠페인별 보관 기간 기준이 명확히 기재되어 있지 않습니다.",
    adminNotes: null,
  },

  // ===== R&D / 오픈소스 사용 =====
  {
    id: "gap-017",
    createdAt: "2025-12-02 11:52:40",
    lastAskedAt: "2025-12-07 15:10:03",
    askedCount: 5,
    deptCode: "RND",
    deptName: "R&D센터",
    userRole: "EMPLOYEE",
    intentId: "EDU_QA",
    domainId: "GENERAL",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 2,
    ragMaxScore: 0.47,
    hasPii: false,
    isError: false,
    question:
      "GitHub에서 가져온 오픈소스 코드를 사내 서비스에 사용할 때, 반드시 거쳐야 하는 검토 절차가 있나요?",
    category: "오픈소스 / 라이선스 검토",
    gapType: "LOW_COVERAGE",
    gapReason:
      "오픈소스 정책 문서는 존재하지만, 실제 코드 반영 시 구체적인 승인 단계와 책임자가 명시되어 있지 않음.",
    priority: "MEDIUM",
    suggestion:
      "오픈소스 사용 플로우 차트를 작성하고, 라이선스 유형별 체크포인트를 정리해 인덱싱.",
    ownerDeptName: "R&D센터 · 법무팀",
    answerSnippet:
      "오픈소스 사용 시에는 라이선스 확인과 사내 정책 준수가 필요하며, 일부 라이선스는 사용이 제한될 수 있습니다...",
    answerFull:
      "현재 오픈소스 정책 문서는 선언적인 원칙만 담고 있으며, 실제 프로젝트에 코드를 반영할 때의 단계를 설명하지 않습니다. 이로 인해 개발자들은 어느 시점에 법무 검토를 받아야 하는지 혼란을 겪습니다.",
    adminNotes: null,
  },

  // ===== 관리 / 시스템 관리자용 로그 =====
  {
    id: "gap-018",
    createdAt: "2025-12-02 09:10:05",
    lastAskedAt: "2025-12-06 13:22:10",
    askedCount: 2,
    deptCode: "ADMIN",
    deptName: "플랫폼관리팀",
    userRole: "SYSTEM_ADMIN",
    intentId: "SYSTEM_QA",
    domainId: "INCIDENT",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4.1",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.39,
    hasPii: false,
    isError: true,
    question:
      "챗봇 장애 발생 시 RAG 인덱스를 재빌드해야 하는 기준과 순서를 정리한 운영 문서가 있나요?",
    category: "플랫폼 / 장애 대응 절차",
    gapType: "NO_DOC",
    gapReason:
      "현재는 구두 전파와 위키 일부 페이지로만 관리되고 있어, 신규 관리자 입장에서 전체 절차를 파악하기 어려움.",
    priority: "HIGH",
    suggestion:
      "챗봇·RAG 인프라 장애 대응 Runbook을 작성하고, 재인덱싱 기준·순서를 상세히 정리해 인덱싱.",
    ownerDeptName: "플랫폼관리팀",
    answerSnippet:
      "인덱스 재빌드는 평시에는 정기 배치에서만 수행하며, 장애 상황에서는 사전 점검 후 제한적으로 진행해야 합니다...",
    answerFull:
      "검색 인덱스 재빌드는 서비스 부하와 데이터 정합성에 큰 영향을 줄 수 있어, 명확한 실행 기준과 순서가 필요합니다. 하지만 현재는 담당자 경험에 의존해 의사결정이 이뤄지고 있습니다.",
    adminNotes: "올해 내로 SRE Runbook 프로젝트에 포함 예정.",
  },

  // ===== GA / 사무공간 이용 =====
  {
    id: "gap-019",
    createdAt: "2025-12-01 08:15:22",
    lastAskedAt: "2025-12-05 17:55:41",
    askedCount: 3,
    deptCode: "GA",
    deptName: "총무팀",
    userRole: "EMPLOYEE",
    intentId: "GENERAL_QA",
    domainId: "GENERAL",
    routeId: "ROUTE_LLM_ONLY",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 0,
    ragMaxScore: 0.18,
    hasPii: false,
    isError: false,
    question:
      "외부 손님을 회의실에 초대할 때, 출입증 발급과 보안 서약서 작성이 필요한지 정리된 문서가 있나요?",
    category: "사무공간 / 방문객 안내",
    gapType: "NO_DOC",
    gapReason:
      "방문객 보안 가이드가 옛 사옥 기준으로만 작성되어 있어, 현재 출입 시스템과 맞지 않음.",
    priority: "MEDIUM",
    suggestion:
      "현 건물 출입 시스템 기준으로 방문객 유형별 출입증 발급·보안 서약 절차를 정리한 문서를 신설.",
    ownerDeptName: "총무팀 · 정보보안팀",
    answerSnippet:
      "방문객 출입 절차는 건물 관리 규정과 회사 보안 정책을 함께 따릅니다...",
    answerFull:
      "기존 문서는 코로나 이전 기준으로 작성되어 있어, 최근 변경된 방문 정책이 반영되어 있지 않습니다. 외부 인력 증가에 따라 업데이트가 필요합니다.",
    adminNotes: null,
  },

  // ===== DEV / 코드 리뷰 정책 =====
  {
    id: "gap-020",
    createdAt: "2025-11-30 13:40:59",
    lastAskedAt: "2025-12-05 11:28:16",
    askedCount: 6,
    deptCode: "DEV",
    deptName: "개발팀",
    userRole: "EMPLOYEE",
    intentId: "GENERAL_QA",
    domainId: "GENERAL",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.35,
    hasPii: false,
    isError: false,
    question:
      "서비스 릴리스 전에 반드시 받아야 하는 코드 리뷰·테스트 승인 절차를 한 번에 볼 수 있나요?",
    category: "개발 프로세스 / 코드 리뷰",
    gapType: "LOW_COVERAGE",
    gapReason:
      "Jira·GitLab·테스트 정책 문서가 각각 따로 존재해 실제 릴리스 허용 기준을 한 문서에서 확인하기 어려움.",
    priority: "MEDIUM",
    suggestion:
      "릴리스 체크리스트 문서를 만들고, 코드 리뷰·테스트·릴리스 승인 단계를 흐름도와 함께 정리해 인덱싱.",
    ownerDeptName: "개발팀 · QA팀",
    answerSnippet:
      "현재는 팀별로 릴리스 체크리스트를 운영하고 있어 서비스마다 요구 조건이 다를 수 있습니다...",
    answerFull:
      "일부 서비스는 엄격한 코드 리뷰와 테스트 절차를 거치지만, 다른 서비스는 최소 기준만 적용되고 있습니다. 통합된 릴리스 정책 정리가 필요합니다.",
    adminNotes: null,
  },

  // ===== QA / 테스트 데이터에 PII 포함 =====
  {
    id: "gap-021",
    createdAt: "2025-11-29 09:30:01",
    lastAskedAt: "2025-12-04 16:12:45",
    askedCount: 4,
    deptCode: "QA",
    deptName: "QA팀",
    userRole: "EMPLOYEE",
    intentId: "INCIDENT_QA",
    domainId: "INCIDENT",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.32,
    hasPii: true,
    isError: false,
    question:
      "실제 고객 정보를 복제한 테스트 데이터가 발견됐을 때, 어느 팀까지 공유하고 어떻게 파기해야 하나요?",
    category: "테스트 데이터 / PII 이슈",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "과거 온프레미스 환경 기준 가이드만 존재하고, 클라우드·샌드박스 환경에서의 처리 기준이 반영되지 않음.",
    priority: "HIGH",
    suggestion:
      "테스트 데이터 개인정보 처리 가이드를 개정해 클라우드 환경에서의 발견·신고·파기 절차를 추가.",
    ownerDeptName: "QA팀 · 개인정보보호팀",
    answerSnippet:
      "테스트 환경에서 발견된 실제 고객 정보는 즉시 관련 부서에 신고하고, 사용을 중단해야 합니다...",
    answerFull:
      "현재 문서는 온프레미스 개발 환경만을 상정하고 있어, 클라우드 상의 로그·스냅샷·백업에 포함된 개인정보 처리 기준이 모호합니다.",
    adminNotes: null,
  },

  // ===== EDU / 내부 강사료 =====
  {
    id: "gap-022",
    createdAt: "2025-11-28 14:05:58",
    lastAskedAt: "2025-12-03 10:20:37",
    askedCount: 2,
    deptCode: "HRD",
    deptName: "교육팀",
    userRole: "EMPLOYEE",
    intentId: "POLICY_QA",
    domainId: "EDUCATION",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.43,
    hasPii: false,
    isError: false,
    question:
      "사내 강사가 내부 교육을 진행했을 때, 강사료 지급 기준과 세금 처리가 어떻게 되는지 한 문서로 볼 수 있나요?",
    category: "교육 / 내부 강사료 지급",
    gapType: "LOW_COVERAGE",
    gapReason:
      "인사 규정과 비용 규정에 관련 조항이 흩어져 있어, 강사료 산정 방식과 지급 절차가 일관되지 않음.",
    priority: "MEDIUM",
    suggestion:
      "내부 강사 운영 가이드 문서를 만들고, 강사료 산정 기준·세금 처리·지급 일정 등을 표로 정리해 인덱싱.",
    ownerDeptName: "교육팀 · 재무팀",
    answerSnippet:
      "내부 강사료는 직급·강의 시간·난이도 등을 종합하여 산정하되, 회사 내 별도 기준을 따릅니다...",
    answerFull:
      "실무자는 과거 사례를 기준으로 강사료를 책정하고 있어, 연도별·과정별 편차가 큽니다. 명문화된 기준이 필요합니다.",
    adminNotes: null,
  },

  // ===== INCIDENT / 신고 관리자 =====
  {
    id: "gap-023",
    createdAt: "2025-11-27 09:02:13",
    lastAskedAt: "2025-12-02 18:30:55",
    askedCount: 3,
    deptCode: "COMP",
    deptName: "준법감시팀",
    userRole: "COMPLAINT_MANAGER",
    intentId: "INCIDENT_QA",
    domainId: "INCIDENT",
    routeId: "ROUTE_INCIDENT",
    modelName: "gpt-4o-mini",
    ragGapCandidate: true,
    ragSourceCount: 2,
    ragMaxScore: 0.52,
    hasPii: true,
    isError: false,
    question:
      "임직원 비위 제보가 들어왔을 때, 익명 제보자의 신원을 어느 범위까지 조회·기록해도 되는지 기준이 궁금합니다.",
    category: "내부 신고 / 익명 제보",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "내부 신고 규정이 개정되었지만, 제보자 보호 관련 세부 기준이 RAG 인덱스에 반영되지 않음.",
    priority: "HIGH",
    suggestion:
      "익명 제보 처리 세부 지침 문서를 작성해 제보자 정보 조회·보관·공유 범위를 구체적으로 명시.",
    ownerDeptName: "준법감시팀 · 개인정보보호팀",
    answerSnippet:
      "제보자 보호는 내부 신고 제도의 핵심 원칙으로, 불필요한 신원 조회는 지양해야 합니다...",
    answerFull:
      "현재 내부 신고 규정은 원칙만 서술하고 있어, 실제 시스템에서 제보자의 IP·로그를 얼마나 남길 수 있는지 명확하지 않습니다.",
    adminNotes: null,
  },

  // ===== ADMIN / 로그 보관 정책 =====
  {
    id: "gap-024",
    createdAt: "2025-11-26 13:45:00",
    lastAskedAt: "2025-12-01 09:11:11",
    askedCount: 2,
    deptCode: "ADMIN",
    deptName: "플랫폼관리팀",
    userRole: "SYSTEM_ADMIN",
    intentId: "SYSTEM_QA",
    domainId: "POLICY",
    routeId: "ROUTE_RAG_INTERNAL",
    modelName: "gpt-4.1",
    ragGapCandidate: true,
    ragSourceCount: 1,
    ragMaxScore: 0.46,
    hasPii: true,
    isError: false,
    question:
      "챗봇 대화 로그를 학습 품질 개선용으로 사용할 때, 몇 년까지 보관 가능한지와 비식별화 기준이 궁금합니다.",
    category: "로그 / 보관·비식별화 정책",
    gapType: "NEEDS_UPDATE",
    gapReason:
      "로그 보관 정책이 기존 상담 시스템 기준으로만 작성되어 있고, 챗봇·AI 학습용 데이터 처리 기준이 별도로 존재하지 않음.",
    priority: "HIGH",
    suggestion:
      "AI 서비스 로그 전용 보관·비식별화 가이드를 작성해 보관 기간·비식별화 수준·재식별 방지 조치를 명시.",
    ownerDeptName: "플랫폼관리팀 · 개인정보보호팀",
    answerSnippet:
      "챗봇 로그는 서비스 품질 개선과 오류 분석을 위해 일정 기간 보관할 수 있으나, 필요 이상 장기 보관은 지양해야 합니다...",
    answerFull:
      "현재 로그 정책은 단순 상담 기록만을 상정하고 있어, 모델 재학습과 품질 개선에 사용되는 데이터의 보관·비식별화 기준이 명확히 정의되어 있지 않습니다.",
    adminNotes: null,
  },
];