// src/components/dashboard/api/userApi.ts
import { fetchJson } from "../../common/api/authHttp";
import { buildQueryString } from "./utils";

/**
 * Infra Service Admin User Management API Base URL
 * - Vite proxy를 통해 /api-infra → http://localhost:9003로 라우팅
 */
const INFRA_API_BASE =
  import.meta.env.VITE_INFRA_API_BASE?.toString() ?? "/api-infra";

/**
 * 사용자 속성 타입
 */
export interface UserAttributes {
  employeeNo?: string[];
  department?: string[];
  creatorType?: string[]; // "DEPT_CREATOR" | "GLOBAL_CREATOR"
  creatorDeptScope?: string[]; // 부서 목록
  [key: string]: string[] | undefined;
}

/**
 * 사용자 객체 타입
 */
export interface User {
  id: string; // Keycloak 사용자 ID
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  attributes: UserAttributes;
  realmRoles?: string[]; // 할당된 역할 목록
}

/**
 * 페이지네이션 응답 타입
 */
export interface PageResponse<T> {
  items: T[];
  page: number;
  size: number;
  total: number;
}

/**
 * 역할 객체 타입
 */
export interface Role {
  id: string;
  name: string;
  description?: string;
  composite?: boolean;
}

/**
 * 사용자 목록 조회 (검색/필터링)
 */
export async function searchUsers(
  params: {
    search?: string; // 이름 또는 사번 검색어
    department?: string; // 부서 필터
    role?: string; // 역할 필터
    page?: number; // 페이지 번호 (0부터 시작, 기본값: 0)
    size?: number; // 페이지 크기 (기본값: 50)
  } = {}
): Promise<PageResponse<User>> {
  const { page = 0, size = 50, ...rest } = params;
  const query = buildQueryString({
    ...rest,
    page,
    size,
  });
  return fetchJson<PageResponse<User>>(
    `${INFRA_API_BASE}/admin/users/search${query}`
  );
}

/**
 * 사용자 단건 조회
 */
export async function getUser(userId: string): Promise<User> {
  return fetchJson<User>(`${INFRA_API_BASE}/admin/users/${userId}`);
}

/**
 * 사용 가능한 역할 목록 조회
 */
export async function getRoles(): Promise<Role[]> {
  return fetchJson<Role[]>(`${INFRA_API_BASE}/admin/users/roles`);
}

/**
 * 사용자 역할 업데이트 요청 타입
 */
export interface UpdateUserRolesRequest {
  roleNames: string[]; // 할당할 역할 목록
}

/**
 * 사용자 역할 업데이트
 */
export async function updateUserRoles(
  userId: string,
  roleNames: string[]
): Promise<void> {
  await fetchJson<void>(`${INFRA_API_BASE}/admin/users/${userId}/roles`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ roleNames }),
  });
}

/**
 * 사용자 정보 업데이트 요청 타입
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled?: boolean;
  attributes?: UserAttributes;
  roleNames?: string[]; // 역할도 함께 업데이트 가능
}

/**
 * 사용자 정보 업데이트
 */
export async function updateUser(
  userId: string,
  data: UpdateUserRequest
): Promise<void> {
  await fetchJson<void>(`${INFRA_API_BASE}/admin/users/${userId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}
