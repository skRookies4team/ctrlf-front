// src/pages/ApprovalPage.tsx
import React, { useState } from "react";
import "./ApprovalPage.css";
import keycloak from "../keycloak";
import type { KeycloakTokenParsed } from "keycloak-js";

type ApprovalStatus = "대기중" | "승인";

type ApprovalItem = {
  id: number;
  title: string;
  author: string;
  department: string;
  date: string;
  status: ApprovalStatus;
};

type Approver = {
  id: number; // 프론트 렌더링용 로컬 ID
  userId: string; // 실제 Keycloak 사용자 ID (나중에 백엔드 연동 시 사용)
  order: number;
  name: string;
  role: string;
  department: string;
};

type UserOption = {
  id: string;
  username: string;
  fullName: string;
  department: string;
  position: string;
};

// 토큰에서 사용할 커스텀 클레임 타입
interface CtrlfTokenParsed extends KeycloakTokenParsed {
  fullName?: string;
  department?: string;
  position?: string;
}

type CurrentUser = {
  name: string;
  department: string;
  position: string;
};

const ApprovalPage: React.FC = () => {
  // 토큰에서 현재 사용자 정보 읽기
  const token = (keycloak.tokenParsed || {}) as CtrlfTokenParsed;

  const currentUser: CurrentUser = {
    name:
      token.fullName ||
      token.name ||
      token.preferred_username ||
      token.username ||
      "사용자",
    department: token.department ?? "부서 미지정",
    position: token.position ?? "직급 미지정",
  };

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [approverInput, setApproverInput] = useState("");
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [approvers, setApprovers] = useState<Approver[]>([]);

  const [approvalList, setApprovalList] = useState<ApprovalItem[]>(() => {
    const baseDept = currentUser.department || "인사팀";
    return [
      {
        id: 1,
        title: "2025년 상반기 예산 집행 계획서",
        author: currentUser.name,
        department: baseDept,
        date: "2025.11.13",
        status: "대기중",
      },
      {
        id: 2,
        title: "2025년 상반기 예산 집행 계획서",
        author: currentUser.name,
        department: baseDept,
        date: "2025.11.13",
        status: "승인",
      },
    ];
  });

  const [filter, setFilter] = useState<"전체" | "대기중" | "승인">("전체");

  // ===== 1) 사용자 검색 (실제 구현은 나중에 백엔드 API로 교체) =====
  const searchUsers = async (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) {
      setUserOptions([]);
      return;
    }

    setIsSearching(true);
    try {
      // TODO: 나중에 실제 백엔드 호출 코드로 교체
      // const resp = await fetch(`/api/users/search?keyword=${encodeURIComponent(trimmed)}`, {
      //   headers: { Authorization: `Bearer ${keycloak.token}` },
      // });
      // const data: UserOption[] = await resp.json();
      // setUserOptions(data);

      // ---- 현재는 데모용 mock 데이터 ----
      const mock: UserOption[] = [
        {
          id: "user-1",
          username: "test",
          fullName: "윤종윤",
          department: "교육팀",
          position: "과장",
        },
        {
          id: "user-2",
          username: "test2",
          fullName: "강소현",
          department: "총무팀",
          position: "팀장",
        },
        {
          id: "user-3",
          username: "test3",
          fullName: "임성현",
          department: "총무팀",
          position: "사원",
        },
        {
          id: "user-4",
          username: "test4",
          fullName: "최대현",
          department: "인사팀",
          position: "차장",
        },
      ].filter(
        (u) =>
          u.fullName.includes(trimmed) ||
          u.username.includes(trimmed) ||
          u.department.includes(trimmed)
      );

      setUserOptions(mock);
    } catch (e) {
      console.error("사용자 검색 실패", e);
      alert("사용자 검색 중 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  };

  // 검색 결과에서 선택 → 결재자 라인에 추가
  const handleSelectUser = (user: UserOption) => {
    if (approvers.some((a) => a.userId === user.id)) {
      alert("이미 결재자 라인에 추가된 사용자입니다.");
      return;
    }

    const nextOrder = approvers.length + 1;

    setApprovers([
      ...approvers,
      {
        id: Date.now(),
        userId: user.id,
        order: nextOrder,
        name: user.fullName,
        role: user.position || "직급 미지정",
        department: user.department || "부서 미지정",
      },
    ]);

    setApproverInput("");
    setUserOptions([]);
  };

  const handleRemoveApprover = (id: number) => {
    const next = approvers.filter((a) => a.id !== id).map((a, idx) => ({
      ...a,
      order: idx + 1,
    }));
    setApprovers(next);
  };

  // ===== 2) 결재 올리기 =====
  const handleSubmitApproval = () => {
    if (!title.trim()) {
      alert("결재 제목을 입력해주세요.");
      return;
    }

    const today = new Date();
    const dateString = `${today.getFullYear()}.${String(
      today.getMonth() + 1
    ).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

    const newItem: ApprovalItem = {
      id: Date.now(),
      title: title.trim(),
      author: currentUser.name,
      department: currentUser.department || "부서 미지정",
      date: dateString,
      status: "대기중",
    };

    setApprovalList((prev) => [newItem, ...prev]);
    setTitle("");
    setContent("");
  };

  const filteredList = approvalList.filter((item) =>
    filter === "전체" ? true : item.status === filter
  );

  return (
    <main className="dashboard-main approval-main">
      {/* ===== 결재 작성 영역 ===== */}
      <section className="approval-panel approval-write">
        <h2 className="panel-title">결재 작성</h2>

        <div className="field-group">
          <label className="field-label">결재 제목 작성란</label>
          <input
            className="text-input"
            type="text"
            placeholder="결재 제목을 입력하세요"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="field-group">
          <label className="field-label">결재자 추가</label>

          <div className="approver-input-row">
            <input
              className="text-input"
              type="text"
              placeholder="결재자 이름 또는 부서를 입력하세요"
              value={approverInput}
              onChange={(e) => {
                const value = e.target.value;
                setApproverInput(value);
                // 입력이 바뀔 때마다 실시간 검색
                void searchUsers(value);
              }}
              onKeyDown={(e) => {
                // Enter 누르면 첫 번째 검색 결과 바로 선택 (선택 사항)
                if (e.key === "Enter" && userOptions[0]) {
                  e.preventDefault();
                  handleSelectUser(userOptions[0]);
                }
              }}
            />
            <button
              className="circle-button"
              type="button"
              // + 버튼은 "현재 입력값으로 다시 검색" 정도로 사용
              onClick={() => void searchUsers(approverInput)}
            >
              +
            </button>
          </div>

          {/* 검색 상태 / 자동완성 목록 */}
          {isSearching && (
            <div className="approver-search-status">사용자 검색 중...</div>
          )}
          {!isSearching && userOptions.length > 0 && (
            <ul className="approver-suggestions">
              {userOptions.map((user) => (
                <li
                  key={user.id}
                  className="approver-suggestion-item"
                  onClick={() => handleSelectUser(user)}
                >
                  <span className="suggestion-name">{user.fullName}</span>
                  <span className="suggestion-meta">
                    {user.department} · {user.position}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!isSearching &&
            approverInput.trim() &&
            userOptions.length === 0 && (
              <div className="approver-search-status">
                일치하는 사용자가 없습니다.
              </div>
            )}

          {/* 실제 결재자 라인 리스트 */}
          <div className="approver-list-wrapper">
            <ul className="approver-list">
              {approvers.map((appr) => (
                <li key={appr.id} className="approver-item">
                  <span className="approver-order">{appr.order}</span>
                  <div className="approver-chips">
                    <span className="chip">{appr.role}</span>
                    <span className="chip">{appr.name}</span>
                    <span className="chip">{appr.department}</span>
                  </div>
                  <button
                    className="remove-approver-button"
                    type="button"
                    onClick={() => handleRemoveApprover(appr.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="align-right">
            <button className="secondary-button" type="button">
              결재라인 추가
            </button>
          </div>
        </div>

        <div className="field-group">
          <textarea
            className="content-area"
            placeholder="결재 내용을 입력하세요."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>

        <div className="form-footer">
          <button
            className="primary-button"
            type="button"
            onClick={handleSubmitApproval}
          >
            결재 올리기
          </button>
        </div>
      </section>

      {/* ===== 결재함 영역 ===== */}
      <section className="approval-panel approval-box">
        <h2 className="panel-title">결재함</h2>

        <div className="tab-row">
          {["전체", "대기중", "승인"].map((t) => (
            <button
              key={t}
              type="button"
              className={`tab-button ${filter === t ? "active" : ""}`}
              onClick={() => setFilter(t as "전체" | "대기중" | "승인")}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="approval-list">
          {filteredList.map((item) => (
            <article key={item.id} className="approval-card">
              <div className="approval-card-main">
                <div>
                  <h3 className="approval-card-title">{item.title}</h3>
                  <p className="approval-card-meta">
                    {item.author} · {item.department} · {item.date}
                  </p>
                </div>
                <span
                  className={`status-pill ${
                    item.status === "대기중" ? "pending" : "approved"
                  }`}
                >
                  {item.status === "대기중" ? "승인대기중" : "승인완료"}
                </span>
              </div>
              <hr className="card-divider" />
            </article>
          ))}

          {filteredList.length === 0 && (
            <div className="empty-state">표시할 결재 문서가 없습니다.</div>
          )}
        </div>
      </section>
    </main>
  );
};

export default ApprovalPage;
