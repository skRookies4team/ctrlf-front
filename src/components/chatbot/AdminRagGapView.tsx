// src/components/chatbot/AdminRagGapView.tsx
import React, { useMemo, useState, useLayoutEffect, useRef } from "react";
import type { CommonFilterState, PeriodPreset } from "./adminFilterTypes";
import { RAG_GAP_ITEMS_MOCK } from "./adminRagGapMocks";
import type {
  RagGapItem,
  SortMode,
  RoleFilter,
  IntentFilter,
  UserRole,
  RagGapType,
  RagGapPriority,
} from "./adminRagGapTypes";

interface AdminRagGapViewProps {
  filterValue: CommonFilterState;
}

interface AdminLocalState {
  status: "none" | "candidate" | "ignored";
  notes: string;
}

const PERIOD_LABELS: Record<PeriodPreset, string> = {
  "7d": "최근 7일",
  "30d": "최근 30일",
  "90d": "최근 90일",
};

const GAP_TYPE_LABELS: Record<RagGapType, string> = {
  NO_DOC: "문서 없음 (NO_DOC)",
  LOW_COVERAGE: "검색 범위 부족",
  NEEDS_UPDATE: "문서 업데이트 필요",
};

const PRIORITY_LABELS: Record<RagGapPriority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

const DOMAIN_LABELS: Record<RagGapItem["domainId"] | "ALL", string> = {
  ALL: "전체 도메인",
  POLICY: "정책 / 사규",
  EDUCATION: "교육 / 4대 교육",
  INCIDENT: "사고 / 인시던트",
  GENERAL: "일반 문의",
};

const USER_ROLE_LABELS: Record<UserRole, string> = {
  EMPLOYEE: "직원",
  CONTENTS_REVIEWER: "콘텐츠 검토자",
  VIDEO_CREATOR: "교육 영상 제작자",
  COMPLAINT_MANAGER: "신고 관리자",
  SYSTEM_ADMIN: "시스템 관리자",
};

const ROLE_FILTER_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "전체 역할" },
  { value: "EMPLOYEE", label: USER_ROLE_LABELS.EMPLOYEE },
  {
    value: "CONTENTS_REVIEWER",
    label: USER_ROLE_LABELS.CONTENTS_REVIEWER,
  },
  { value: "VIDEO_CREATOR", label: USER_ROLE_LABELS.VIDEO_CREATOR },
  {
    value: "COMPLAINT_MANAGER",
    label: USER_ROLE_LABELS.COMPLAINT_MANAGER,
  },
  {
    value: "SYSTEM_ADMIN",
    label: USER_ROLE_LABELS.SYSTEM_ADMIN,
  },
];

const AdminRagGapView: React.FC<AdminRagGapViewProps> = ({ filterValue }) => {
  const {
    period,
    departmentId,
    domainId,
    routeId,
    modelId,
    hasPiiOnly,
    onlyError,
  } = filterValue;

  // RAG 전용(로컬) 필터 상태
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [intentFilter, setIntentFilter] = useState<IntentFilter>("ALL");
  const [minAskedCount, setMinAskedCount] = useState<number>(1);
  const [sortMode, setSortMode] = useState<SortMode>("lastAskedDesc");

  // 리스트/상세 상태
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  // 문서 추가 제안 후보로 선택된 행들(멀티 선택)
  const [proposalSelection, setProposalSelection] = useState<string[]>([]);

  // 관리자 메모/태깅 로컬 상태 (logId 기준)
  const [adminStates, setAdminStates] = useState<
    Record<string, AdminLocalState>
  >({});

  // 좌측 리스트 스크롤 영역 / 우측 상세 카드 DOM 참조
  const listWrapperRef = useRef<HTMLDivElement | null>(null);
  const detailRef = useRef<HTMLElement | null>(null);

  const effectiveDomainId = (domainId ?? "ALL") as RagGapItem["domainId"] | "ALL";
  const effectiveRouteId = routeId ?? "ALL";
  const effectiveModelId = modelId ?? "ALL";
  const periodLabel =
    (period && PERIOD_LABELS[period as PeriodPreset]) || "선택된 기간";

  // 인텐트 옵션 (Mock 데이터 기반으로 추출)
  const intentOptions: IntentFilter[] = useMemo(() => {
    const set = new Set<RagGapItem["intentId"]>();
    for (const item of RAG_GAP_ITEMS_MOCK) {
      set.add(item.intentId);
    }
    return ["ALL", ...Array.from(set).sort()] as IntentFilter[];
  }, []);

  // === 1) 공통 + RAG 전용 필터 적용 ===
  const filteredItems = useMemo(() => {
    // period(7d / 30d / 90d) 기준 임계 날짜 계산
    let threshold: Date | null = null;
    if (period === "7d" || period === "30d" || period === "90d") {
      const now = new Date(); // 실제 오늘 날짜 기준
      const days =
        period === "7d" ? 7 : period === "30d" ? 30 : 90;
      threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    return RAG_GAP_ITEMS_MOCK.filter((item) => {
      // 1) 기간 필터: lastAskedAt 기준
      if (threshold) {
        const lastAsked = new Date(item.lastAskedAt.replace(" ", "T"));
        if (
          Number.isNaN(lastAsked.getTime()) ||
          lastAsked < threshold
        ) {
          return false;
        }
      }

      // 2) 공통 필터 (상단 AdminFilterBar)
      if (departmentId && departmentId !== "ALL" && item.deptCode !== departmentId) {
        return false;
      }
      if (effectiveDomainId !== "ALL" && item.domainId !== effectiveDomainId) {
        return false;
      }
      if (effectiveRouteId !== "ALL" && item.routeId !== effectiveRouteId) {
        return false;
      }
      if (effectiveModelId !== "ALL" && item.modelName !== effectiveModelId) {
        return false;
      }
      if (hasPiiOnly && !item.hasPii) {
        return false;
      }
      if (onlyError && !item.isError) {
        return false;
      }

      // 3) RAG 전용 로컬 필터
      if (roleFilter !== "ALL" && item.userRole !== roleFilter) {
        return false;
      }
      if (intentFilter !== "ALL" && item.intentId !== intentFilter) {
        return false;
      }
      if (item.askedCount < minAskedCount) {
        return false;
      }

      return true;
    });
  }, [
    period,
    departmentId,
    effectiveDomainId,
    effectiveRouteId,
    effectiveModelId,
    hasPiiOnly,
    onlyError,
    roleFilter,
    intentFilter,
    minAskedCount,
  ]);

  // === 2) 정렬 적용 (최근 질문 순 / 발생 횟수 순) ===
  const sortedItems = useMemo(() => {
    const base = [...filteredItems];
    if (sortMode === "askedCountDesc") {
      return base.sort((a, b) => b.askedCount - a.askedCount);
    }
    // default: lastAskedAt desc (YYYY-MM-DD HH:mm:ss 포맷 가정)
    return base.sort((a, b) => b.lastAskedAt.localeCompare(a.lastAskedAt));
  }, [filteredItems, sortMode]);

  // === 3) "실제 화면에 쓰일" 선택 ID 계산 (state 변경 없이 fallback) ===
  const effectiveSelectedId: string | null = useMemo(() => {
    if (sortedItems.length === 0) return null;
    if (selectedId && sortedItems.some((item) => item.id === selectedId)) {
      return selectedId;
    }
    // 선택된 게 없거나, 필터 변경으로 리스트에 없으면 첫 번째 행을 화면상 선택으로 사용
    return sortedItems[0].id;
  }, [sortedItems, selectedId]);

  const selectedItem =
    effectiveSelectedId == null
      ? null
      : sortedItems.find((item) => item.id === effectiveSelectedId) ?? null;

  // 현재 선택된 아이템에 대해 전문이 펼쳐져 있는지 여부
  const isAnswerExpanded =
    !!selectedItem && expandedItemId === selectedItem.id;

  // 현재 선택된 아이템에 대한 관리자 태깅/메모 상태
  const currentAdminState: AdminLocalState | undefined = selectedItem
    ? adminStates[selectedItem.id]
    : undefined;
  const currentStatus: AdminLocalState["status"] =
    currentAdminState?.status ?? "none";
  const currentNotes: string =
    currentAdminState?.notes ?? (selectedItem?.adminNotes ?? "");

  // 우측 상세 카드 높이에 맞춰 좌측 리스트 max-height 동기화
  useLayoutEffect(() => {
    if (!detailRef.current || !listWrapperRef.current) {
      return;
    }

    const detailHeight = detailRef.current.offsetHeight;
    const MIN_HEIGHT = 260;
    const targetHeight = Math.max(detailHeight, MIN_HEIGHT);

    listWrapperRef.current.style.maxHeight = `${targetHeight}px`;
  }, [selectedItem, isAnswerExpanded, adminStates, filteredItems.length]);

  // === 상단 요약 통계 ===
  const totalCandidates = filteredItems.length;
  const highPriorityCount = filteredItems.filter(
    (i) => i.priority === "HIGH",
  ).length;
  const noDocCount = filteredItems.filter(
    (i) => i.gapType === "NO_DOC",
  ).length;

  // 카테고리(문서 영역)별 집계
  const categoryStats = useMemo(() => {
    const categoryMap = new Map<
      string,
      { count: number; highPriorityCount: number }
    >();

    for (const item of filteredItems) {
      const key = item.category;
      const prev = categoryMap.get(key) ?? { count: 0, highPriorityCount: 0 };
      prev.count += 1;
      if (item.priority === "HIGH") {
        prev.highPriorityCount += 1;
      }
      categoryMap.set(key, prev);
    }

    return Array.from(categoryMap.entries())
      .map(([category, value]) => ({ category, ...value }))
      .sort((a, b) => b.count - a.count);
  }, [filteredItems]);

  // ===== 헬퍼 함수들 =====

  const toggleProposalSelection = (id: string) => {
    setProposalSelection((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleMinAskedCountChange = (raw: string) => {
    const parsed = Number(raw);
    if (Number.isNaN(parsed) || parsed < 1) {
      setMinAskedCount(1);
    } else {
      setMinAskedCount(parsed);
    }
  };

  const resetLocalFilters = () => {
    setRoleFilter("ALL");
    setIntentFilter("ALL");
    setMinAskedCount(1);
    setSortMode("lastAskedDesc");
    setProposalSelection([]);
  };

  const updateAdminState = (
    item: RagGapItem,
    partial: Partial<AdminLocalState>,
  ) => {
    setAdminStates((prev) => {
      const prevForId = prev[item.id] ?? {
        status: "none" as const,
        // 최초 생성 시에는 기존 adminNotes를 기본값으로 사용
        notes: item.adminNotes ?? "",
      };
      return {
        ...prev,
        [item.id]: { ...prevForId, ...partial },
      };
    });
  };

  return (
    <div className="cb-admin-raggap-view">
      {/* 1) 상단 요약 Pill 3개: 전체 후보 / High 우선 / NO_DOC 비중 */}
      <div className="cb-admin-trend-summary">
        <div className="cb-admin-trend-pill">
          <span className="cb-admin-trend-label">RAG 갭 후보</span>
          <span className="cb-admin-trend-value">
            {totalCandidates.toLocaleString()}건
          </span>
        </div>
        <div className="cb-admin-trend-pill">
          <span className="cb-admin-trend-label">우선 조치 필요(High)</span>
          <span className="cb-admin-trend-value">
            {highPriorityCount.toLocaleString()}건
          </span>
        </div>
        <div className="cb-admin-trend-pill">
          <span className="cb-admin-trend-label">문서 부재(NO_DOC)</span>
          <span className="cb-admin-trend-value">
            {noDocCount.toLocaleString()}건
          </span>
        </div>
      </div>

      {/* 2) 카테고리(문서 영역)별 우선순위 리스트 */}
      <section className="cb-admin-section">
        <div className="cb-admin-section-header">
          <h3 className="cb-admin-section-title">
            우선 보완이 필요한 문서 영역
          </h3>
          <span className="cb-admin-section-sub">
            {periodLabel} 동안 자주 등장한 질문 기준으로 문서 보완 우선순위를
            보여줍니다.
          </span>
        </div>

        {categoryStats.length === 0 ? (
          <div className="cb-admin-raggap-empty-hint">
            <div className="cb-admin-raggap-empty-pill">데이터 없음</div>
            <p className="cb-admin-raggap-empty-text">
              현재 기간·필터 조건에 해당하는 RAG 갭 후보가 없습니다.
              <br />
              기간을 넓히거나 필터를 완화해서 다시 확인해 주세요.
            </p>
          </div>
        ) : (
          <ul className="cb-admin-keyword-list">
            {categoryStats.slice(0, 4).map((cat) => (
              <li key={cat.category} className="cb-admin-keyword-item">
                <span className="cb-admin-keyword-label">{cat.category}</span>
                <span className="cb-admin-keyword-count">
                  갭 후보 {cat.count}건
                  {cat.highPriorityCount > 0 &&
                    ` · High 우선순위 ${cat.highPriorityCount}건`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3) 리스트 + 상세 패널 레이아웃 */}
      <section className="cb-admin-section cb-admin-raggap-body">
        <div className="cb-admin-section-header">
          <h3 className="cb-admin-section-title">RAG 갭 후보 탐색</h3>
          <span className="cb-admin-section-sub">
            상단 필터(기간·부서·도메인·Route·모델·PII/에러)와 아래 RAG 전용
            필터를 조합해 갭 후보들을 탐색하고, 우측에서 상세를 확인합니다.
          </span>
        </div>

        {/* RAG 전용 상단 필터 영역 (역할 / 인텐트 / 최소 발생 횟수 / 정렬 기준) */}
        <div className="cb-admin-raggap-filter-row">
          <div className="cb-admin-raggap-filter-group">
            <span className="cb-admin-raggap-filter-label">사용자 역할</span>
            <select
              className="cb-admin-raggap-filter-select"
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value as RoleFilter)
              }
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="cb-admin-raggap-filter-group">
            <span className="cb-admin-raggap-filter-label">인텐트</span>
            <select
              className="cb-admin-raggap-filter-select"
              value={intentFilter}
              onChange={(e) =>
                setIntentFilter(e.target.value as IntentFilter)
              }
            >
              {intentOptions.map((intent) => (
                <option key={intent} value={intent}>
                  {intent === "ALL" ? "전체 인텐트" : intent}
                </option>
              ))}
            </select>
          </div>

          <div className="cb-admin-raggap-filter-group">
            <span className="cb-admin-raggap-filter-label">
              최소 발생 횟수
            </span>
            <input
              type="number"
              min={1}
              className="cb-admin-raggap-filter-input"
              value={minAskedCount.toString()}
              onChange={(e) => handleMinAskedCountChange(e.target.value)}
            />
          </div>

          <div className="cb-admin-raggap-filter-group cb-admin-raggap-filter-group--sort">
            <span className="cb-admin-raggap-filter-label">정렬 기준</span>
            <div className="cb-admin-raggap-sort-toggle">
              <button
                type="button"
                className={
                  "cb-admin-chip" +
                  (sortMode === "lastAskedDesc"
                    ? " cb-admin-chip--active"
                    : "")
                }
                onClick={() => setSortMode("lastAskedDesc")}
              >
                최근 질문 순
              </button>
              <button
                type="button"
                className={
                  "cb-admin-chip" +
                  (sortMode === "askedCountDesc"
                    ? " cb-admin-chip--active"
                    : "")
                }
                onClick={() => setSortMode("askedCountDesc")}
              >
                발생 횟수 많은 순
              </button>
            </div>
          </div>

          <button
            type="button"
            className="cb-admin-ghost-btn cb-admin-raggap-filter-reset"
            onClick={resetLocalFilters}
          >
            필터 초기화
          </button>
        </div>

        <div className="cb-admin-raggap-layout">
          {/* 좌측 리스트 */}
          <div className="cb-admin-raggap-list">
            {/* 리스트 상단: 선택된 문서 제안 후보 개수 + 향후 기능 버튼 */}
            <div className="cb-admin-raggap-list-header">
              <span className="cb-admin-raggap-list-caption">
                총 {sortedItems.length.toLocaleString()}건
                {proposalSelection.length > 0 &&
                  ` · 문서 제안 후보 선택 ${proposalSelection.length}건`}
              </span>
              <button
                type="button"
                className="cb-admin-raggap-proposal-btn"
                disabled
              >
                선택 항목으로 문서 추가 제안 초안 생성
                <span className="cb-admin-raggap-proposal-badge">
                  (API 연동 예정)
                </span>
              </button>
            </div>

            <div
              ref={listWrapperRef}
              className="cb-admin-table-wrapper cb-admin-table-wrapper--raggap-list"
            >
              <table className="cb-admin-table cb-admin-table--raggap-list">
                <thead>
                  <tr>
                    <th>선택</th>
                    <th>질문</th>
                    <th>도메인 / 역할</th>
                    <th>인텐트</th>
                    <th>발생 횟수</th>
                    <th>최종 질문 시각</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="cb-admin-table-empty">
                        현재 필터 조건에 해당하는 RAG 갭 후보가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedItems.map((item) => {
                      const isSelected = item.id === effectiveSelectedId;
                      const questionPreview =
                        item.question.length > 60
                          ? item.question.slice(0, 60) + "…"
                          : item.question;

                      const domainLabel =
                        DOMAIN_LABELS[item.domainId] ?? item.domainId;
                      const roleLabel = USER_ROLE_LABELS[item.userRole];
                      const isChecked = proposalSelection.includes(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={
                            "cb-admin-table-row cb-admin-table-row--clickable" +
                            (isSelected ? " cb-admin-table-row--selected" : "")
                          }
                          onClick={() => setSelectedId(item.id)}
                        >
                          <td>
                            <input
                              type="checkbox"
                              className="cb-admin-raggap-checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleProposalSelection(item.id);
                              }}
                            />
                          </td>
                          <td>
                            <div className="cb-admin-raggap-question-preview">
                              {questionPreview}
                            </div>
                          </td>
                          <td>
                            <div className="cb-admin-raggap-meta-line">
                              {domainLabel} / {roleLabel}
                            </div>
                          </td>
                          <td>{item.intentId}</td>
                          <td>{item.askedCount.toLocaleString()}회</td>
                          <td>{item.lastAskedAt}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 우측 상세 패널 */}
          <aside ref={detailRef} className="cb-admin-raggap-detail">
            {!selectedItem ? (
              <div className="cb-admin-empty-state">
                좌측 리스트에서 RAG 갭 후보를 선택하면 상세 정보가 여기에
                표시됩니다.
              </div>
            ) : (
              <>
                {/* 헤더 - 질문 + 기본 메타 */}
                <header className="cb-admin-raggap-detail-header">
                  <h4 className="cb-admin-raggap-question-title">
                    {selectedItem.question}
                  </h4>
                  <div className="cb-admin-raggap-badges-row">
                    <span className="cb-admin-badge">
                      {selectedItem.deptName} ({selectedItem.deptCode})
                    </span>
                    <span className="cb-admin-badge">
                      {DOMAIN_LABELS[selectedItem.domainId]} /{" "}
                      {selectedItem.intentId}
                    </span>
                    <span className="cb-admin-badge">
                      {USER_ROLE_LABELS[selectedItem.userRole]} ·{" "}
                      {selectedItem.askedCount.toLocaleString()}회
                    </span>
                    {selectedItem.hasPii && (
                      <span className="cb-admin-badge">PII 포함</span>
                    )}
                    {selectedItem.isError && (
                      <span className="cb-admin-badge">에러 로그</span>
                    )}
                  </div>
                  <div className="cb-admin-raggap-meta-sub">
                    최초 발생: {selectedItem.createdAt} · 마지막 질문 시각:{" "}
                    {selectedItem.lastAskedAt}
                  </div>
                </header>

                {/* AI 처리 정보 */}
                <section className="cb-admin-raggap-detail-section">
                  <h5 className="cb-admin-raggap-section-title">
                    AI 처리 정보
                  </h5>
                  <div className="cb-admin-raggap-grid">
                    <div>
                      <div className="cb-admin-raggap-label">
                        Route / 모델
                      </div>
                      <div className="cb-admin-raggap-value">
                        {selectedItem.routeId} · {selectedItem.modelName}
                      </div>
                    </div>
                    <div>
                      <div className="cb-admin-raggap-label">RAG 결과</div>
                      <div className="cb-admin-raggap-value">
                        검색 문서 {selectedItem.ragSourceCount}건
                        {typeof selectedItem.ragMaxScore === "number" &&
                          ` · max score ${selectedItem.ragMaxScore.toFixed(2)}`}
                      </div>
                      {selectedItem.ragSourceCount === 0 && (
                        <div className="cb-admin-raggap-hint">
                          관련 문서가 인덱싱되어 있지 않거나, 스코어가 매우 낮아
                          Gap 후보로 분류되었습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* AI 답변 내용 (요약 + 전문 토글) */}
                {selectedItem.answerSnippet && (
                  <section className="cb-admin-raggap-detail-section">
                    <h5 className="cb-admin-raggap-section-title">
                      AI 답변 내용
                    </h5>

                    <p className="cb-admin-raggap-answer-snippet">
                      {selectedItem.answerSnippet}
                    </p>

                    {selectedItem.answerFull && (
                      <>
                        {isAnswerExpanded && (
                          <p className="cb-admin-raggap-answer-full">
                            {selectedItem.answerFull}
                          </p>
                        )}

                        <button
                          type="button"
                          className="cb-admin-raggap-toggle-btn"
                          onClick={() => {
                            if (!selectedItem) return;
                            setExpandedItemId((prev) =>
                              prev === selectedItem.id ? null : selectedItem.id,
                            );
                          }}
                        >
                          {isAnswerExpanded ? "전문 접기" : "전문 보기"}
                        </button>
                      </>
                    )}
                  </section>
                )}

                {/* 갭 유형 + 제안 액션 */}
                <section className="cb-admin-raggap-detail-section">
                  <h5 className="cb-admin-raggap-section-title">
                    갭 유형 / 제안 액션
                  </h5>
                  <div className="cb-admin-raggap-badges-row">
                    <span className="cb-admin-badge">
                      {GAP_TYPE_LABELS[selectedItem.gapType]}
                    </span>
                    <span className="cb-admin-badge">
                      {PRIORITY_LABELS[selectedItem.priority]}
                    </span>
                  </div>

                  <div className="cb-admin-raggap-block">
                    <div className="cb-admin-raggap-label">갭 사유</div>
                    <p className="cb-admin-raggap-text">
                      {selectedItem.gapReason}
                    </p>
                  </div>

                  <div className="cb-admin-raggap-block">
                    <div className="cb-admin-raggap-label">문서 보완 제안</div>
                    <p className="cb-admin-raggap-text">
                      {selectedItem.suggestion}
                    </p>
                    <div className="cb-admin-raggap-meta-sub">
                      담당 부서: {selectedItem.ownerDeptName}
                    </div>
                  </div>
                </section>

                {/* 관리자 메모 / 태깅 (1차 버전 선택 사항까지 구현) */}
                <section className="cb-admin-raggap-detail-section">
                  <h5 className="cb-admin-raggap-section-title">
                    관리자 메모 / 태깅
                  </h5>

                  <div className="cb-admin-raggap-admin-tags-row">
                    <button
                      type="button"
                      className={
                        "cb-admin-tag-toggle" +
                        (currentStatus === "candidate"
                          ? " cb-admin-tag-toggle--active"
                          : "")
                      }
                      onClick={() => {
                        if (!selectedItem) return;
                        updateAdminState(selectedItem, {
                          status: "candidate",
                        });
                      }}
                    >
                      문서 보완 후보
                    </button>
                    <button
                      type="button"
                      className={
                        "cb-admin-tag-toggle" +
                        (currentStatus === "ignored"
                          ? " cb-admin-tag-toggle--active"
                          : "")
                      }
                      onClick={() => {
                        if (!selectedItem) return;
                        updateAdminState(selectedItem, {
                          status: "ignored",
                        });
                      }}
                    >
                      무시
                    </button>
                    <button
                      type="button"
                      className={
                        "cb-admin-tag-toggle" +
                        (currentStatus === "none"
                          ? " cb-admin-tag-toggle--active"
                          : "")
                      }
                      onClick={() => {
                        if (!selectedItem) return;
                        updateAdminState(selectedItem, {
                          status: "none",
                        });
                      }}
                    >
                      미정
                    </button>
                  </div>

                  <textarea
                    className="cb-admin-raggap-note-textarea"
                    placeholder="이 질문에 대한 정책/교육 문서 보완 아이디어를 자유롭게 메모해 주세요."
                    value={currentNotes}
                    onChange={(e) => {
                      if (!selectedItem) return;
                      updateAdminState(selectedItem, {
                        notes: e.target.value,
                      });
                    }}
                    rows={4}
                  />

                  <p className="cb-admin-raggap-note-help">
                    현재 메모/태그는 브라우저 메모리에서만 임시로 유지되며, 추후
                    백엔드 API 연동 시 서버에 저장되도록 확장할 예정.
                  </p>
                </section>
              </>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
};

export default AdminRagGapView;