// src/auth/roles.ts

/**
 * 프로젝트 전역 Role / Capability 정의 + 정규화 로직
 * - 중복 타입 제거: UserRole은 여기서만 정의
 * - 레거시 role 정규화: ROLE_VIDEO_REVIEWER -> CONTENTS_REVIEWER
 * - 우선순위(primaryRole): SYSTEM_ADMIN > COMPLAINT_MANAGER > CONTENTS_REVIEWER > VIDEO_CREATOR > EMPLOYEE
 */

export type UserRole =
  | "SYSTEM_ADMIN"
  | "COMPLAINT_MANAGER"
  | "CONTENTS_REVIEWER"
  | "VIDEO_CREATOR"
  | "EMPLOYEE";

export const ROLE_PRIORITY: UserRole[] = [
  "SYSTEM_ADMIN",
  "COMPLAINT_MANAGER",
  "CONTENTS_REVIEWER",
  "VIDEO_CREATOR",
  "EMPLOYEE",
];

/**
 * UI/기능을 여는 "행위" 단위 Capability
 * - 지금 패치 범위에서는 패널 오픈 가드에 필요한 것만 우선 정의
 * - 이후: 문서 업로드, 승인/반려, 로그 조회 등으로 확장
 */
export type Capability =
  | "OPEN_ADMIN_DASHBOARD"
  | "OPEN_REVIEWER_DESK"
  | "OPEN_CREATOR_STUDIO";

/**
 * Keycloak raw role 문자열 배열을 프로젝트 표준 UserRole Set으로 정규화
 * - realm/client role 어디서 오든 동일 처리
 * - ROLE_ prefix 제거
 * - 레거시 VIDEO_REVIEWER(=ROLE_VIDEO_REVIEWER) -> CONTENTS_REVIEWER
 * - 상위 역할이면 EMPLOYEE 권한 포함(가드 통일)
 */
export function normalizeRoles(raw: readonly string[]): Set<UserRole> {
  const out = new Set<UserRole>();

  for (const r of raw) {
    const role = (r ?? "").trim();
    if (!role) continue;

    const upper = role.toUpperCase();
    const noPrefix = upper.startsWith("ROLE_") ? upper.slice(5) : upper;

    if (noPrefix === "SYSTEM_ADMIN") out.add("SYSTEM_ADMIN");
    if (noPrefix === "COMPLAINT_MANAGER") out.add("COMPLAINT_MANAGER");

    // 콘텐츠 검토자 (레거시/변형 포함)
    if (
      noPrefix === "CONTENTS_REVIEWER" ||
      noPrefix === "CONTENT_REVIEWER" ||
      noPrefix === "VIDEO_REVIEWER" // ROLE_VIDEO_REVIEWER -> VIDEO_REVIEWER
    ) {
      out.add("CONTENTS_REVIEWER");
    }

    if (noPrefix === "VIDEO_CREATOR") out.add("VIDEO_CREATOR");
    if (noPrefix === "EMPLOYEE") out.add("EMPLOYEE");
  }

  // 정책: 상위 역할이면 EMPLOYEE 기능을 포함(가드 일관성 목적)
  const hasHigher =
    out.has("SYSTEM_ADMIN") ||
    out.has("COMPLAINT_MANAGER") ||
    out.has("CONTENTS_REVIEWER") ||
    out.has("VIDEO_CREATOR");

  if (hasHigher) out.add("EMPLOYEE");

  // fallback
  if (out.size === 0) out.add("EMPLOYEE");

  return out;
}

export function pickPrimaryRole(roleSet: ReadonlySet<UserRole>): UserRole {
  return ROLE_PRIORITY.find((r) => roleSet.has(r)) ?? "EMPLOYEE";
}

/**
 * 지금 프로젝트 정책(SoD 포함) 기준 Capability 가드
 * - SYSTEM_ADMIN: 관리자 대시보드만
 * - CONTENTS_REVIEWER: 검토 Desk만
 * - VIDEO_CREATOR: 제작 Studio만
 * - COMPLAINT_MANAGER: (현재 범위 밖) -> 기본적으로 오픈 권한 없음
 */
export function can(userRole: UserRole, capability: Capability): boolean {
  switch (capability) {
    case "OPEN_ADMIN_DASHBOARD":
      return userRole === "SYSTEM_ADMIN";
    case "OPEN_REVIEWER_DESK":
      return userRole === "CONTENTS_REVIEWER";
    case "OPEN_CREATOR_STUDIO":
      return userRole === "VIDEO_CREATOR";
    default:
      return false;
  }
}

/**
 * ChatWindow 헤더 표기용
 */
export function getChatHeaderTitle(userRole: UserRole): string {
  switch (userRole) {
    case "SYSTEM_ADMIN":
      return "chatbot (관리자)";
    case "CONTENTS_REVIEWER":
      return "chatbot (검토자)";
    case "VIDEO_CREATOR":
      return "chatbot (제작자)";
    default:
      return "chatbot";
  }
}
