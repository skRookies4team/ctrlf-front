import React from "react";
import type {
  RoleKey,
  CreatorType,
  AdminUserSummary,
  AccountMessage,
} from "../../adminDashboardTypes";
import {
  DEPARTMENT_OPTIONS,
  DEPT_SCOPE_OPTIONS,
} from "../../adminDashboardMocks";

/** 롤 한글 라벨 매핑 (요약 표시용) */
const ROLE_LABELS: Record<RoleKey, string> = {
  EMPLOYEE: "EMPLOYEE (기본)",
  VIDEO_CREATOR: "VIDEO_CREATOR (영상 제작자)",
  CONTENTS_REVIEWER: "CONTENTS_REVIEWER (콘텐츠 검토자)",
  COMPLAINT_MANAGER: "COMPLAINT_MANAGER (신고 관리자)",
  SYSTEM_ADMIN: "SYSTEM_ADMIN (시스템 관리자)",
};

interface AdminAccountsTabProps {
  userList: AdminUserSummary[];
  selectedUserId: string | null;
  selectedRoles: RoleKey[];
  creatorType: CreatorType;
  creatorDeptScope: string[];
  accountMessage: AccountMessage | null;
  userSearchKeyword: string;
  userDeptFilter: string;
  userRoleFilter: RoleKey | "ALL";
  onSelectUser: (user: AdminUserSummary) => void;
  onToggleRole: (role: RoleKey) => void;
  onCreatorTypeChange: (type: CreatorType) => void;
  onScopeToggle: (deptId: string) => void;
  onSave: () => void;
  onReset: () => void;
  onUserSearchKeywordChange: (keyword: string) => void;
  onUserDeptFilterChange: (dept: string) => void;
  onUserRoleFilterChange: (role: RoleKey | "ALL") => void;
}

const AdminAccountsTab: React.FC<AdminAccountsTabProps> = ({
  userList,
  selectedUserId,
  selectedRoles,
  creatorType,
  creatorDeptScope,
  accountMessage,
  userSearchKeyword,
  userDeptFilter,
  userRoleFilter,
  onSelectUser,
  onToggleRole,
  onCreatorTypeChange,
  onScopeToggle,
  onSave,
  onReset,
  onUserSearchKeywordChange,
  onUserDeptFilterChange,
  onUserRoleFilterChange,
}) => {
  const currentUser =
    selectedUserId != null
      ? userList.find((u) => u.id === selectedUserId) ?? null
      : null;

  const isVideoCreatorChecked = selectedRoles.includes("VIDEO_CREATOR");

  const availableScopeOptions =
    creatorType === "GLOBAL_CREATOR"
      ? DEPT_SCOPE_OPTIONS.filter((d) => d.id === "ALL_ORG")
      : DEPT_SCOPE_OPTIONS.filter((d) => d.id !== "ALL_ORG");

  const selectedRoleLabels =
    selectedRoles.length === 0
      ? "선택된 역할 없음"
      : selectedRoles.map((r) => ROLE_LABELS[r]).join(", ");

  const filteredUsers = userList.filter((user) => {
    if (userDeptFilter !== "ALL" && user.deptCode !== userDeptFilter) {
      return false;
    }
    if (userRoleFilter !== "ALL" && !user.roles.includes(userRoleFilter)) {
      return false;
    }
    if (userSearchKeyword.trim()) {
      const kw = userSearchKeyword.trim().toLowerCase();
      const nameMatch = user.name.toLowerCase().includes(kw);
      const noMatch = user.employeeNo.includes(kw);
      if (!nameMatch && !noMatch) {
        return false;
      }
    }
    return true;
  });

  const isRoleChecked = (role: RoleKey) => selectedRoles.includes(role);

  return (
    <div className="cb-admin-tab-panel">
      <div className="cb-admin-account-layout">
        <section className="cb-admin-account-card cb-admin-account-card--left">
          <h3 className="cb-admin-account-title">사용자 검색 / 선택</h3>
          <p className="cb-admin-hint">
            이름·사번·부서·역할로 필터링해서 계정을 선택한 뒤, 우측에서 권한을
            편집합니다.
          </p>

          <div className="cb-admin-account-search-row">
            <input
              type="text"
              className="cb-admin-input"
              placeholder="이름 또는 사번 검색"
              value={userSearchKeyword}
              onChange={(e) => onUserSearchKeywordChange(e.target.value)}
            />
            <select
              className="cb-admin-select"
              value={userDeptFilter}
              onChange={(e) => onUserDeptFilterChange(e.target.value)}
            >
              {DEPARTMENT_OPTIONS.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
            <select
              className="cb-admin-select"
              value={userRoleFilter}
              onChange={(e) =>
                onUserRoleFilterChange(
                  e.target.value === "ALL" ? "ALL" : (e.target.value as RoleKey)
                )
              }
            >
              <option value="ALL">전체 역할</option>
              {Object.entries(ROLE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="cb-admin-account-user-list">
            {filteredUsers.length === 0 ? (
              <div className="cb-admin-account-empty">
                조건에 해당하는 사용자가 없습니다.
              </div>
            ) : (
              <ul>
                {filteredUsers.map((user) => {
                  const isActive = user.id === selectedUserId;
                  return (
                    <li
                      key={user.id}
                      className={`cb-admin-account-user-item ${
                        isActive ? "is-active" : ""
                      }`}
                      onClick={() => onSelectUser(user)}
                    >
                      <div className="cb-admin-account-user-main">
                        <span className="cb-admin-account-user-name">
                          {user.name}
                        </span>
                        <span className="cb-admin-account-user-meta">
                          {user.employeeNo} · {user.deptName}
                        </span>
                      </div>
                      <div className="cb-admin-account-user-roles">
                        {user.roles.map((role) => (
                          <span key={role} className="cb-admin-role-chip">
                            {role}
                          </span>
                        ))}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        <section className="cb-admin-account-card cb-admin-account-card--right">
          <h3 className="cb-admin-account-title">선택한 사용자 권한 편집</h3>

          {accountMessage && (
            <div
              className={`cb-admin-toast cb-admin-toast--${accountMessage.type}`}
            >
              {accountMessage.text}
            </div>
          )}

          {!currentUser ? (
            <p className="cb-admin-hint">
              왼쪽에서 계정을 선택하면 역할과 영상 제작 권한을 한 번에 편집할 수
              있습니다.
            </p>
          ) : (
            <>
              <div className="cb-admin-account-selected">
                <div className="cb-admin-account-selected-main">
                  <span className="cb-admin-account-selected-name">
                    {currentUser.name}
                  </span>
                  <span className="cb-admin-account-selected-meta">
                    {currentUser.employeeNo} · {currentUser.deptName}
                  </span>
                </div>
                <div className="cb-admin-account-selected-roles">
                  {currentUser.roles.map((role) => (
                    <span
                      key={role}
                      className="cb-admin-role-chip cb-admin-role-chip--current"
                    >
                      {role}
                    </span>
                  ))}
                </div>
              </div>

              <div className="cb-admin-account-subcard">
                <h4 className="cb-admin-account-subtitle">역할(Role) 설정</h4>
                <div className="cb-admin-role-checkboxes">
                  <label>
                    <input
                      type="checkbox"
                      checked={isRoleChecked("EMPLOYEE")}
                      onChange={() => onToggleRole("EMPLOYEE")}
                    />
                    <span>EMPLOYEE (기본)</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={isRoleChecked("VIDEO_CREATOR")}
                      onChange={() => onToggleRole("VIDEO_CREATOR")}
                    />
                    <span>VIDEO_CREATOR (영상 제작자)</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={isRoleChecked("CONTENTS_REVIEWER")}
                      onChange={() => onToggleRole("CONTENTS_REVIEWER")}
                    />
                    <span>CONTENTS_REVIEWER (콘텐츠 검토자)</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={isRoleChecked("COMPLAINT_MANAGER")}
                      onChange={() => onToggleRole("COMPLAINT_MANAGER")}
                    />
                    <span>COMPLAINT_MANAGER (신고 관리자)</span>
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={isRoleChecked("SYSTEM_ADMIN")}
                      onChange={() => onToggleRole("SYSTEM_ADMIN")}
                    />
                    <span>SYSTEM_ADMIN (시스템 관리자)</span>
                  </label>
                </div>

                <p className="cb-admin-hint">
                  현재 선택된 역할(편집 중 기준): {selectedRoleLabels}
                </p>
              </div>

              <div className="cb-admin-account-subcard">
                <h4 className="cb-admin-account-subtitle">
                  영상 제작 권한 설정
                </h4>

                <fieldset className="cb-admin-fieldset">
                  <legend>영상 제작자 유형</legend>
                  <div className="cb-admin-radio-group">
                    <label>
                      <input
                        type="radio"
                        name="creatorType"
                        value="DEPT_CREATOR"
                        disabled={!isVideoCreatorChecked}
                        checked={creatorType === "DEPT_CREATOR"}
                        onChange={() => onCreatorTypeChange("DEPT_CREATOR")}
                      />
                      <span>부서 한정 제작자 (DEPT_CREATOR)</span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="creatorType"
                        value="GLOBAL_CREATOR"
                        disabled={!isVideoCreatorChecked}
                        checked={creatorType === "GLOBAL_CREATOR"}
                        onChange={() => onCreatorTypeChange("GLOBAL_CREATOR")}
                      />
                      <span>전사 담당 제작자 (GLOBAL_CREATOR)</span>
                    </label>
                  </div>
                </fieldset>

                <fieldset className="cb-admin-fieldset">
                  <legend>제작 가능 부서</legend>

                  {!isVideoCreatorChecked && (
                    <p className="cb-admin-hint">
                      VIDEO_CREATOR 역할을 선택하면 제작 가능 부서를 설정할 수
                      있습니다.
                    </p>
                  )}

                  {isVideoCreatorChecked && !creatorType && (
                    <p className="cb-admin-hint cb-admin-hint--warning">
                      먼저 영상 제작자 유형(DEPT_CREATOR / GLOBAL_CREATOR)을
                      선택해 주세요.
                    </p>
                  )}

                  {isVideoCreatorChecked && creatorType && (
                    <div className="cb-admin-scope-grid">
                      {availableScopeOptions.map((dept) => (
                        <label key={dept.id} className="cb-admin-scope-item">
                          <input
                            type="checkbox"
                            value={dept.id}
                            checked={creatorDeptScope.includes(dept.id)}
                            onChange={() => onScopeToggle(dept.id)}
                          />
                          <span>{dept.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </fieldset>
              </div>

              <div className="cb-admin-account-actions">
                <button
                  type="button"
                  className="cb-admin-secondary-btn"
                  onClick={onReset}
                >
                  되돌리기
                </button>
                <button
                  type="button"
                  className="cb-admin-primary-btn"
                  onClick={onSave}
                >
                  저장
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminAccountsTab;
