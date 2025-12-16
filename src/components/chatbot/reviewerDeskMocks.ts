// src/components/chatbot/reviewerDeskMocks.ts
import type { AuditAction, ReviewStatus, ReviewWorkItem } from "./reviewerDeskTypes";

const FALLBACK_VIDEO_URL =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

// 한국어 날짜/시간 포맷 (YYYY.MM.DD HH:mm)
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}

export function formatDuration(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]) {
  return arr[Math.floor(rng() * arr.length)];
}

function chance(rng: () => number, p: number) {
  return rng() < p;
}

function isoDaysAgo(base: Date, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function isoHoursAgo(base: Date, n: number) {
  const d = new Date(base);
  d.setHours(d.getHours() - n);
  return d.toISOString();
}

function audit(action: AuditAction, actor: string, at: string, detail?: string) {
  return {
    id: `aud-${Math.random().toString(36).slice(2, 10)}`,
    at,
    actor,
    action,
    detail,
  };
}

export type MockPreset = "base" | "load";

export interface CreateMockOptions {
  preset?: MockPreset;
  total?: number;
  reviewerName?: string;
  seed?: number;
  now?: string; // ISO
}

/**
 * 운영 시나리오 기반 mock 생성:
 * - base: 데모/검증용(상대적으로 그럴듯한 분포 + 에지케이스)
 * - load: 대량 데이터(가상 스크롤/성능 검증)
 */
export function createMockReviewWorkItems(opts: CreateMockOptions = {}): ReviewWorkItem[] {
  const {
    preset = "base",
    total = preset === "load" ? 800 : 120,
    reviewerName = "Reviewer",
    seed = preset === "load" ? 23 : 7,
    now = new Date().toISOString(),
  } = opts;

  const baseDate = new Date(now);
  const rng = mulberry32(seed);

  // base 시나리오 상단 고정(기존 5개 유사)
  const fixed: ReviewWorkItem[] =
    preset === "base"
      ? [
          {
            id: "rev-1001",
            title: "개인정보보호 기본 교육 - 2026 개정 반영",
            department: "인사팀",
            creatorName: "김제작",
            contentType: "VIDEO",
            contentCategory: "MANDATORY",
            createdAt: isoDaysAgo(baseDate, 2),
            submittedAt: isoHoursAgo(baseDate, 18),
            status: "REVIEW_PENDING",
            videoUrl: "/videos/test1.mp4",
            durationSec: 720,
            scriptText:
              "[오프닝]\n안녕하세요. 이번 교육에서는 개인정보 처리 원칙과 주의사항을 다룹니다.\n\n[주의]\n예시 화면에는 홍길동(사번 123456)의 연락처 010-1234-5678이 포함되어 있습니다...\n\n[마무리]\n업무 중 개인정보가 포함된 자료는 반드시 가명/마스킹 처리 후 공유하세요.",
            autoCheck: {
              piiRiskLevel: "high",
              piiFindings: ["전화번호 패턴 후보 1건", "사번/직원번호 패턴 후보 1건"],
              bannedWords: ["주민번호", "계좌번호"],
              qualityWarnings: ["스크립트에 '예시' 표기가 누락되었습니다."],
            },
            audit: [
              audit("CREATED", "김제작", isoDaysAgo(baseDate, 2)),
              audit("AUTO_CHECKED", "SYSTEM", isoHoursAgo(baseDate, 20), "PII/금칙어 점검 완료"),
              audit("SUBMITTED", "김제작", isoHoursAgo(baseDate, 18), "검토 요청"),
            ],
            version: 3,
            riskScore: 92,
            lastUpdatedAt: isoHoursAgo(baseDate, 18),
            sourceSystem: "VIDEO_PIPELINE",
          },
          {
            id: "rev-1002",
            title: "신입사원 온보딩 - 문서 보안 기본",
            department: "총무팀",
            creatorName: "이제작",
            contentType: "VIDEO",
            contentCategory: "JOB",
            createdAt: isoDaysAgo(baseDate, 1),
            submittedAt: isoHoursAgo(baseDate, 10),
            status: "REVIEW_PENDING",
            videoUrl: FALLBACK_VIDEO_URL,
            durationSec: 480,
            scriptText:
              "문서 보안 기본 교육입니다.\n- 외부 공유 금지\n- 화면 캡처 제한\n- 권한 최소화\n\n(마무리) 교육 완료 후 퀴즈를 진행하세요.",
            autoCheck: { piiRiskLevel: "low", piiFindings: [], bannedWords: [], qualityWarnings: [] },
            audit: [
              audit("CREATED", "이제작", isoDaysAgo(baseDate, 1)),
              audit("AUTO_CHECKED", "SYSTEM", isoHoursAgo(baseDate, 12)),
              audit("SUBMITTED", "이제작", isoHoursAgo(baseDate, 10), "검토 요청"),
            ],
            version: 2,
            riskScore: 18,
            lastUpdatedAt: isoHoursAgo(baseDate, 10),
            sourceSystem: "VIDEO_PIPELINE",
          },
          {
            id: "rev-1003",
            title: "사규: 출장비 정산 규정 v3",
            department: "재무팀",
            creatorName: "박제작",
            contentType: "POLICY_DOC",
            contentCategory: "POLICY",
            createdAt: isoDaysAgo(baseDate, 5),
            submittedAt: isoDaysAgo(baseDate, 3),
            status: "APPROVED",
            approvedAt: isoDaysAgo(baseDate, 2),
            policyExcerpt:
              "제1조(목적) 본 규정은 출장비 지급 및 정산 절차를 정함을 목적으로 한다...\n\n제7조(증빙) 영수증은 원본 제출을 원칙으로 하며, 법인카드 승인 내역으로 대체할 수 있다...",
            autoCheck: {
              piiRiskLevel: "none",
              piiFindings: [],
              bannedWords: [],
              qualityWarnings: ["조문 번호 표기 형식 점검 필요(제 1조 ↔ 제1조)."],
            },
            audit: [
              audit("CREATED", "박제작", isoDaysAgo(baseDate, 5)),
              audit("AUTO_CHECKED", "SYSTEM", isoDaysAgo(baseDate, 4)),
              audit("SUBMITTED", "박제작", isoDaysAgo(baseDate, 3)),
              audit("APPROVED", reviewerName, isoDaysAgo(baseDate, 2), "정산 프로세스 정의 명확"),
              audit("PUBLISHED", "SYSTEM", isoDaysAgo(baseDate, 2), "승인 즉시 자동 공개"),
            ],
            version: 5,
            riskScore: 12,
            lastUpdatedAt: isoDaysAgo(baseDate, 2),
            sourceSystem: "POLICY_PIPELINE",
          },
          {
            id: "rev-1004",
            title: "직장 내 괴롭힘 예방 - 사례 중심",
            department: "인사팀",
            creatorName: "최제작",
            contentType: "VIDEO",
            contentCategory: "MANDATORY",
            createdAt: isoDaysAgo(baseDate, 7),
            submittedAt: isoDaysAgo(baseDate, 6),
            status: "REJECTED",
            rejectedAt: isoDaysAgo(baseDate, 5),
            videoUrl: FALLBACK_VIDEO_URL,
            durationSec: 900,
            scriptText:
              "사례 1: ...\n사례 2: ...\n(중략)\n\n* 일부 표현이 과격할 수 있어 수정이 필요합니다.",
            autoCheck: {
              piiRiskLevel: "medium",
              piiFindings: ["이메일 주소 패턴 후보 1건"],
              bannedWords: ["비하표현"],
              qualityWarnings: ["용어 정의가 누락되어 있습니다."],
            },
            audit: [
              audit("CREATED", "최제작", isoDaysAgo(baseDate, 7)),
              audit("AUTO_CHECKED", "SYSTEM", isoDaysAgo(baseDate, 6), "중간 리스크"),
              audit("SUBMITTED", "최제작", isoDaysAgo(baseDate, 6), "검토 요청"),
              audit("REJECTED", reviewerName, isoDaysAgo(baseDate, 5), "비하 표현 제거 및 사례 문구 완화 필요"),
            ],
            version: 4,
            riskScore: 76,
            lastUpdatedAt: isoDaysAgo(baseDate, 5),
            sourceSystem: "VIDEO_PIPELINE",
          },
          {
            id: "rev-1005",
            title: "장애인 인식 개선 - 기본",
            department: "ESG팀",
            creatorName: "정제작",
            contentType: "VIDEO",
            contentCategory: "MANDATORY",
            createdAt: isoDaysAgo(baseDate, 3),
            submittedAt: isoDaysAgo(baseDate, 2),
            status: "REVIEW_PENDING",
            videoUrl: FALLBACK_VIDEO_URL,
            durationSec: 600,
            scriptText: "장애 인식 개선 교육 스크립트(요약)...",
            autoCheck: { piiRiskLevel: "none", piiFindings: [], bannedWords: [], qualityWarnings: ["퀴즈 연결(quizId) 누락 가능"] },
            audit: [
              audit("CREATED", "정제작", isoDaysAgo(baseDate, 3)),
              audit("AUTO_CHECKED", "SYSTEM", isoDaysAgo(baseDate, 2)),
              audit("SUBMITTED", "정제작", isoDaysAgo(baseDate, 2)),
            ],
            version: 1,
            riskScore: 24,
            lastUpdatedAt: isoDaysAgo(baseDate, 2),
            sourceSystem: "VIDEO_PIPELINE",
          },
        ]
      : [];

  const departments = ["인사팀", "재무팀", "총무팀", "보안팀", "개발1팀", "개발2팀", "CS팀", "영업팀", "ESG팀", "법무팀"];
  const creators = ["김제작", "이제작", "박제작", "최제작", "정제작", "한제작", "윤제작", "오제작", "임제작", "서제작"];
  const categories: ReviewWorkItem["contentCategory"][] = ["MANDATORY", "JOB", "POLICY", "OTHER"];
  const types: ReviewWorkItem["contentType"][] = ["VIDEO", "POLICY_DOC"];
  const bannedPool = ["주민번호", "계좌번호", "카드번호", "비하표현", "폭언", "내부기밀", "비밀번호", "OTP"];
  const piiFindingsPool = [
    "전화번호 패턴 후보 1건",
    "이메일 주소 패턴 후보 1건",
    "사번/직원번호 패턴 후보 1건",
    "주소 패턴 후보 1건",
  ];
  const qualityPool = [
    "용어 정의가 누락되어 있습니다.",
    "예시/데모 화면 표기가 누락되었습니다.",
    "자막 타이밍 점검 필요",
    "퀴즈 연결(quizId) 누락 가능",
    "규정 조문 번호 표기 형식 점검 필요",
  ];

  const makeTitle = (idx: number, ct: ReviewWorkItem["contentType"], cc: ReviewWorkItem["contentCategory"]) => {
    if (ct === "POLICY_DOC") {
      const topic = pick(rng, ["출장비", "보안", "근태", "개인정보", "사내기기", "권한", "협력사", "회계", "문서관리"]);
      return `사규: ${topic} 운영 규정 v${1 + (idx % 6)}`;
    }
    const topic = pick(rng, ["개인정보보호", "정보보안", "온보딩", "직장 내 괴롭힘", "장애 인식", "문서 보안", "협력사 보안"]);
    const suffix = cc === "MANDATORY" ? "필수" : cc === "JOB" ? "직무" : "기타";
    return `${topic} 교육 - ${suffix} 과정 ${1 + (idx % 4)}`;
  };

  const makePolicyExcerpt = () => {
    const p1 = "제1조(목적) 본 규정은 업무 수행 중 준수해야 할 기본 원칙을 정의한다.";
    const p2 = "제4조(절차) 승인-배포-공지 단계의 책임과 권한은 분리 원칙을 따른다.";
    const p3 = "제7조(예외) 운영 이슈 발생 시 시스템 관리자는 노출 중단(비활성화) 조치만 수행할 수 있다.";
    return `${p1}\n\n${p2}\n\n${p3}`;
  };

  const makeScript = (idx: number, risk: number) => {
    const lines = [
      "[오프닝] 안녕하세요. 오늘은 사내 규정 준수 교육입니다.",
      "[본론] 업무 중 생성되는 문서와 로그는 정책에 따라 관리합니다.",
      "[주의] 예시 화면에 개인정보가 포함될 수 있으므로 마스킹 처리 기준을 확인하세요.",
      "[마무리] 교육 후 퀴즈를 진행하고, 의문 사항은 담당 부서에 문의하세요.",
    ];
    if (risk > 80) {
      lines.splice(2, 0, "예시: 홍길동(사번 123456), 010-1234-5678, abc@company.com");
    }
    if (idx % 17 === 0) return undefined; // 스크립트 누락 케이스
    return lines.join("\n");
  };

  const makeAutoCheck = (riskScore: number) => {
    const piiLevel: ReviewWorkItem["autoCheck"]["piiRiskLevel"] =
      riskScore >= 85 ? "high" : riskScore >= 60 ? "medium" : riskScore >= 25 ? "low" : "none";

    const piiFindings =
      piiLevel === "none" ? [] : Array.from({ length: piiLevel === "high" ? 2 : 1 }, () => pick(rng, piiFindingsPool));

    const bannedWords =
      riskScore >= 80
        ? Array.from({ length: 2 }, () => pick(rng, bannedPool))
        : riskScore >= 55
        ? chance(rng, 0.55)
          ? [pick(rng, bannedPool)]
          : []
        : [];

    const qualityWarnings =
      chance(rng, 0.35) ? [pick(rng, qualityPool)] : [];

    return { piiRiskLevel: piiLevel, piiFindings, bannedWords, qualityWarnings };
  };

  const makeStatus = () => {
    // 분포: pending 45 / approved 35 / rejected 20
    const r = rng();
    if (r < 0.45) return "REVIEW_PENDING" as const;
    if (r < 0.80) return "APPROVED" as const;
    return "REJECTED" as const;
  };

  const makeOne = (idx: number): ReviewWorkItem => {
    const contentType = pick(rng, types);
    const contentCategory = pick(rng, categories);
    const status = makeStatus();

    const department = pick(rng, departments);
    const creatorName = pick(rng, creators);

    const createdAt = isoDaysAgo(baseDate, 1 + Math.floor(rng() * 30));
    const submittedAt = isoHoursAgo(baseDate, 6 + Math.floor(rng() * 24 * 12)); // ~12일 내
    const version = 1 + Math.floor(rng() * 6);

    const riskScore = Math.round(rng() * 100);
    const autoCheck = makeAutoCheck(riskScore);

    const id = `rev-${preset === "load" ? 3000 + idx : 1200 + idx}`;

    const titleBase = makeTitle(idx, contentType, contentCategory);
    const title =
      idx % 29 === 0 ? `${titleBase} — (긴 제목) 정책/스크립트/자막/퀴즈/배포 체크리스트 포함` : titleBase;

    const auditTrail: ReviewWorkItem["audit"] = [
      audit("CREATED", creatorName, createdAt),
      audit("AUTO_CHECKED", "SYSTEM", submittedAt, "PII/금칙어/품질 점검"),
      audit("SUBMITTED", creatorName, submittedAt, "검토 요청"),
    ];

    let approvedAt: string | undefined;
    let rejectedAt: string | undefined;

    if (status === "APPROVED") {
      approvedAt = isoHoursAgo(baseDate, 1 + Math.floor(rng() * 48));
      auditTrail.push(audit("APPROVED", reviewerName, approvedAt, "내용 적합"));
      auditTrail.push(audit("PUBLISHED", "SYSTEM", approvedAt, "승인 즉시 자동 공개"));
    }

    if (status === "REJECTED") {
      rejectedAt = isoHoursAgo(baseDate, 1 + Math.floor(rng() * 48));
      auditTrail.push(audit("REJECTED", reviewerName, rejectedAt, "표현/정확성/마스킹 보완 필요"));
    }

    const common: ReviewWorkItem = {
      id,
      contentId: `${contentType === "VIDEO" ? "vid" : "pol"}-${100000 + idx}`,
      contentVersionLabel: `v${version}`,
      sourceSystem: contentType === "VIDEO" ? "VIDEO_PIPELINE" : "POLICY_PIPELINE",
      title,
      department,
      creatorName,
      contentType,
      contentCategory,
      createdAt,
      submittedAt,
      lastUpdatedAt: status === "APPROVED" ? approvedAt : status === "REJECTED" ? rejectedAt : submittedAt,
      status,
      approvedAt,
      rejectedAt,
      autoCheck,
      audit: auditTrail,
      version,
      riskScore,
      tags: chance(rng, 0.2) ? ["PII", "보안", "정책"].slice(0, 1 + Math.floor(rng() * 2)) : undefined,
      lock: chance(rng, 0.06)
        ? { owner: pick(rng, ["SYSTEM", reviewerName, "OTHER_REVIEWER"]), expiresAt: isoHoursAgo(baseDate, -2) }
        : undefined,
    };

    if (contentType === "VIDEO") {
      return {
        ...common,
        videoUrl: chance(rng, 0.15) ? "/videos/test1.mp4" : FALLBACK_VIDEO_URL,
        durationSec: 240 + Math.floor(rng() * 1200),
        scriptText: makeScript(idx, riskScore),
      };
    }

    return {
      ...common,
      policyExcerpt: makePolicyExcerpt(),
    };
  };

  const generatedCount = Math.max(0, total - fixed.length);
  const generated = Array.from({ length: generatedCount }, (_, i) => makeOne(i + 1));

  return [...fixed, ...generated];
}

/**
 * 충돌 시뮬레이션:
 * - version_bump: 다른 사용자가 수정하여 version만 증가
 * - already_approved: 다른 사용자가 먼저 승인 처리(상태 변경)
 * - already_rejected: 다른 사용자가 먼저 반려 처리(상태 변경)
 */
export function mutateMockForConflict(
  items: ReviewWorkItem[],
  targetId: string,
  mode: "version_bump" | "already_approved" | "already_rejected",
  otherReviewerName = "OTHER_REVIEWER"
) {
  const now = new Date().toISOString();

  return items.map((it) => {
    if (it.id !== targetId) return it;

    if (mode === "version_bump") {
      return {
        ...it,
        version: it.version + 1,
        lastUpdatedAt: now,
        audit: [
          ...it.audit,
          audit("UPDATED_BY_OTHER", otherReviewerName, now, "외부 수정(버전 증가)"),
        ],
      };
    }

    if (mode === "already_approved") {
      if (it.status !== "REVIEW_PENDING") return it;
      return {
        ...it,
        status: "APPROVED" as ReviewStatus,
        approvedAt: now,
        version: it.version + 1,
        lastUpdatedAt: now,
        audit: [
          ...it.audit,
          audit("APPROVED", otherReviewerName, now, "다른 검토자가 승인 처리"),
          audit("PUBLISHED", "SYSTEM", now, "승인 즉시 자동 공개"),
        ],
      };
    }

    // already_rejected
    if (it.status !== "REVIEW_PENDING") return it;
    return {
      ...it,
      status: "REJECTED" as ReviewStatus,
      rejectedAt: now,
      version: it.version + 1,
      lastUpdatedAt: now,
      audit: [
        ...it.audit,
        audit("REJECTED", otherReviewerName, now, "다른 검토자가 반려 처리"),
      ],
    };
  });
}
