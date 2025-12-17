// src/components/chatbot/CreatorStudioView.tsx

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  computePanelPosition,
  type Anchor,
  type PanelSize,
} from "../../utils/chat";
import { can, type UserRole } from "../../auth/roles";
import {
  categoryLabel,
  deptLabel,
  formatDateTime,
  labelStatus,
  labelTrainingType,
} from "./creatorStudioMocks";
import { useCreatorStudioController } from "./useCreatorStudioController";
import type {
  CreatorSortMode,
  CreatorTabId,
  CreatorWorkItem,
  TrainingType,
} from "./creatorStudioTypes";

type Size = PanelSize;

type ResizeDirection =
  | "n"
  | "s"
  | "e"
  | "w"
  | "nw"
  | "ne"
  | "sw"
  | "se";

type ResizeState = {
  resizing: boolean;
  dir: ResizeDirection | null;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startTop: number;
  startLeft: number;
};

type DragState = {
  dragging: boolean;
  startX: number;
  startY: number;
  startTop: number;
  startLeft: number;
};

interface CreatorStudioViewProps {
  anchor?: Anchor | null;
  onClose: () => void;
  onRequestFocus?: () => void;

  /**
   * 추후 Keycloak token/백엔드에서 내려오는 creator metadata 연결용 (optional)
   */
  userRole?: UserRole;
  creatorName?: string;
  allowedDeptIds?: string[] | null;
}

const INITIAL_SIZE: Size = { width: 1080, height: 680 };
const MIN_WIDTH = 860;
const MIN_HEIGHT = 560;

// 패널이 화면 밖으로 “완전히” 못 나가게 하는 여백
const PANEL_PADDING = 24;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

/**
 * 뷰포트 크기를 기준으로 “허용 가능한 최대 패널 크기”를 계산
 * - 뷰포트가 작아도 max가 MIN보다 작아지지 않도록 방어
 */
function getViewportMaxSize(): Size {
  if (typeof window === "undefined") return INITIAL_SIZE;
  return {
    width: Math.max(MIN_WIDTH, window.innerWidth - PANEL_PADDING * 2),
    height: Math.max(MIN_HEIGHT, window.innerHeight - PANEL_PADDING * 2),
  };
}

/**
 * 원하는 크기를 뷰포트 제약(최대/최소)에 맞춰 보정
 */
function fitSizeToViewport(desired: Size): Size {
  const max = getViewportMaxSize();
  return {
    width: clamp(desired.width, MIN_WIDTH, max.width),
    height: clamp(desired.height, MIN_HEIGHT, max.height),
  };
}

/**
 * 패널 이동 가능한 범위를 계산
 * - 패널이 뷰포트보다 클 때도 “드래그가 잠기지 않도록”
 *   min/max를 뒤집어(음수 포함) 범위를 만들어준다.
 */
function getBounds(width: number, height: number) {
  if (typeof window === "undefined") {
    return {
      minLeft: PANEL_PADDING,
      maxLeft: PANEL_PADDING,
      minTop: PANEL_PADDING,
      maxTop: PANEL_PADDING,
    };
  }

  const rawMaxLeft = window.innerWidth - width - PANEL_PADDING;
  const rawMaxTop = window.innerHeight - height - PANEL_PADDING;

  return {
    minLeft: Math.min(PANEL_PADDING, rawMaxLeft),
    maxLeft: Math.max(PANEL_PADDING, rawMaxLeft),
    minTop: Math.min(PANEL_PADDING, rawMaxTop),
    maxTop: Math.max(PANEL_PADDING, rawMaxTop),
  };
}

function tabLabel(tab: CreatorTabId): string {
  switch (tab) {
    case "draft":
      return "초안";
    case "review_pending":
      return "검토 대기";
    case "rejected":
      return "반려";
    case "approved":
      return "승인";
    case "failed":
      return "실패";
    default:
      return tab;
  }
}

function statusToneClass(status: CreatorWorkItem["status"]): string {
  switch (status) {
    case "DRAFT":
      return "cb-reviewer-pill cb-reviewer-pill--pending";
    case "GENERATING":
      return "cb-reviewer-pill cb-reviewer-pill--pending";
    case "REVIEW_PENDING":
      return "cb-reviewer-pill cb-reviewer-pill--pending";
    case "REJECTED":
      return "cb-reviewer-pill cb-reviewer-pill--rejected";
    case "APPROVED":
      return "cb-reviewer-pill cb-reviewer-pill--approved";
    case "FAILED":
      return "cb-reviewer-pill cb-reviewer-pill--rejected";
    default:
      return "cb-reviewer-pill";
  }
}

function trainingTypeOptions(): Array<{ id: TrainingType; label: string }> {
  return [
    { id: "MANDATORY", label: "4대 의무교육" },
    { id: "JOB", label: "직무교육" },
    { id: "OTHER", label: "기타/전사" },
  ];
}

/**
 * ✅ 커스텀 CSS 변수 타입 (no-explicit-any 회피)
 */
type CreatorCSSVars = React.CSSProperties & {
  "--cb-creator-x"?: string;
  "--cb-creator-y"?: string;
  "--cb-creator-w"?: string;
  "--cb-creator-h"?: string;
  "--cb-creator-progress"?: string;
};

const CreatorStudioView: React.FC<CreatorStudioViewProps> = ({
  anchor,
  onClose,
  onRequestFocus,
  userRole,
  creatorName,
  allowedDeptIds,
}) => {
  // 권한 가드(2중)
  const role: UserRole = userRole ?? "VIDEO_CREATOR";
  const canOpen = can(role, "OPEN_CREATOR_STUDIO");
  useEffect(() => {
    if (!canOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canOpen]);

  const {
    departments,
    categories,
    tab,
    setTab,
    query,
    setQuery,
    sortMode,
    setSortMode,
    filteredItems,
    selectedItem,
    selectItem,
    createDraft,
    updateSelectedMeta,
    attachFileToSelected,
    runPipelineForSelected,
    retryPipelineForSelected,
    updateSelectedScript,
    requestReviewForSelected,
    reopenRejectedToDraft,
    deleteDraft,
    selectedValidation,
    toast,
  } = useCreatorStudioController({
    creatorName: creatorName ?? "VIDEO_CREATOR",
    allowedDeptIds,
  });

  /**
   * 초기 size를 “현재 뷰포트에 맞춰” 보정
   */
  const initialSizeRef = useRef<Size>(fitSizeToViewport(INITIAL_SIZE));
  const [size, setSize] = useState<Size>(initialSizeRef.current);

  // 최신 size/pos 참조용 ref (window listener가 stale closure 안 쓰게)
  const sizeRef = useRef<Size>(size);
  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  const [panelPos, setPanelPos] = useState(() => {
    const pos = computePanelPosition(anchor ?? null, initialSizeRef.current);
    const b = getBounds(
      initialSizeRef.current.width,
      initialSizeRef.current.height
    );
    return {
      left: Math.round(clamp(pos.left, b.minLeft, b.maxLeft)),
      top: Math.round(clamp(pos.top, b.minTop, b.maxTop)),
    };
  });

  const panelPosRef = useRef(panelPos);
  useEffect(() => {
    panelPosRef.current = panelPos;
  }, [panelPos]);

  // “사용자가 한번이라도 드래그/리사이즈로 위치를 잡았으면”
  // anchor 변화로 자동 재배치하지 않게(계속 튀는 현상 방지)
  const userMovedRef = useRef(false);
  const didInitFromAnchorRef = useRef(false);

  // 드래그/리사이즈 상태는 ref로 관리
  const resizeRef = useRef<ResizeState>({
    resizing: false,
    dir: null,
    startX: 0,
    startY: 0,
    startWidth: initialSizeRef.current.width,
    startHeight: initialSizeRef.current.height,
    startTop: panelPos.top,
    startLeft: panelPos.left,
  });

  const dragRef = useRef<DragState>({
    dragging: false,
    startX: 0,
    startY: 0,
    startTop: panelPos.top,
    startLeft: panelPos.left,
  });

  // file input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // detail scroll ref
  const detailScrollRef = useRef<HTMLDivElement | null>(null);

  // anchor 변경 시 재배치:
  // - 초기 1회는 anchor 기준으로 자리 잡기
  // - 사용자가 움직였으면 이후 anchor 변화로는 “클램프만” 수행(재배치 금지)
  useEffect(() => {
    const currentSize = fitSizeToViewport(sizeRef.current);

    if (
      currentSize.width !== sizeRef.current.width ||
      currentSize.height !== sizeRef.current.height
    ) {
      setSize(currentSize);
    }

    const b = getBounds(currentSize.width, currentSize.height);

    // 사용자가 이미 위치를 잡았다면: 현재 위치를 bounds 내로만 보정
    if (userMovedRef.current && didInitFromAnchorRef.current) {
      setPanelPos((p) => ({
        left: Math.round(clamp(p.left, b.minLeft, b.maxLeft)),
        top: Math.round(clamp(p.top, b.minTop, b.maxTop)),
      }));
      return;
    }

    const nextPos = computePanelPosition(anchor ?? null, currentSize);

    setPanelPos({
      left: Math.round(clamp(nextPos.left, b.minLeft, b.maxLeft)),
      top: Math.round(clamp(nextPos.top, b.minTop, b.maxTop)),
    });

    didInitFromAnchorRef.current = true;
  }, [anchor]);

  // 창 크기 변경 시: size도 뷰포트에 맞게 보정 + pos clamp
  useEffect(() => {
    const handleWindowResize = () => {
      setSize((prev) => {
        const next = fitSizeToViewport(prev);
        const b = getBounds(next.width, next.height);

        setPanelPos((p) => ({
          left: Math.round(clamp(p.left, b.minLeft, b.maxLeft)),
          top: Math.round(clamp(p.top, b.minTop, b.maxTop)),
        }));

        return next;
      });
    };

    window.addEventListener("resize", handleWindowResize);
    return () => window.removeEventListener("resize", handleWindowResize);
  }, []);

  // window mousemove/mouseup (한 번만 설치 + ref로 최신값 사용)
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      // resize
      const rs = resizeRef.current;
      const dir = rs.dir;

      if (rs.resizing) {
        if (!dir) return;

        const dx = event.clientX - rs.startX;
        const dy = event.clientY - rs.startY;

        const max = getViewportMaxSize();
        let width = rs.startWidth;
        let height = rs.startHeight;
        let top = rs.startTop;
        let left = rs.startLeft;

        if (dir.includes("e")) width = rs.startWidth + dx;
        if (dir.includes("s")) height = rs.startHeight + dy;
        if (dir.includes("w")) {
          width = rs.startWidth - dx;
          left = rs.startLeft + dx;
        }
        if (dir.includes("n")) {
          height = rs.startHeight - dy;
          top = rs.startTop + dy;
        }

        width = clamp(width, MIN_WIDTH, max.width);
        height = clamp(height, MIN_HEIGHT, max.height);

        const b = getBounds(width, height);
        left = clamp(left, b.minLeft, b.maxLeft);
        top = clamp(top, b.minTop, b.maxTop);

        setSize({ width, height });
        setPanelPos({ left: Math.round(left), top: Math.round(top) });
        return;
      }

      // drag
      const ds = dragRef.current;
      if (ds.dragging) {
        const dx = event.clientX - ds.startX;
        const dy = event.clientY - ds.startY;

        const curSize = sizeRef.current;
        const b = getBounds(curSize.width, curSize.height);

        const left = clamp(ds.startLeft + dx, b.minLeft, b.maxLeft);
        const top = clamp(ds.startTop + dy, b.minTop, b.maxTop);

        setPanelPos({ left: Math.round(left), top: Math.round(top) });
      }
    };

    const onUp = () => {
      const wasResizing = resizeRef.current.resizing;
      const wasDragging = dragRef.current.dragging;

      resizeRef.current.resizing = false;
      resizeRef.current.dir = null;
      dragRef.current.dragging = false;

      if (wasResizing || wasDragging) {
        userMovedRef.current = true;
      }

      // 선택 방지 해제
      if (typeof document !== "undefined") {
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  const handleResizeMouseDown =
    (dir: ResizeDirection) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      // 선택 방지
      if (typeof document !== "undefined") {
        document.body.style.userSelect = "none";
      }

      const curPos = panelPosRef.current;
      const curSize = sizeRef.current;

      resizeRef.current = {
        resizing: true,
        dir,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: curSize.width,
        startHeight: curSize.height,
        startTop: curPos.top,
        startLeft: curPos.left,
      };

      // 드래그도 끊기
      dragRef.current.dragging = false;
    };

  const handleHeaderMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // input/textarea/select 클릭은 드래그로 취급하지 않음
    const tag = (event.target as HTMLElement)?.tagName?.toLowerCase();
    if (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      tag === "button" ||
      tag === "label"
    )
      return;

    event.preventDefault();

    // 선택 방지
    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none";
    }

    const curPos = panelPosRef.current;

    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startTop: curPos.top,
      startLeft: curPos.left,
    };

    resizeRef.current.resizing = false;
    resizeRef.current.dir = null;

    onRequestFocus?.();
  };

  const onPanelMouseDown = () => {
    onRequestFocus?.();
  };

  const onCloseClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const onPickFile = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    attachFileToSelected(f.name);
    // 같은 파일 재선택 허용
    e.target.value = "";
  };

  const disableMeta =
    !selectedItem ||
    selectedItem.status === "GENERATING" ||
    selectedItem.status === "REVIEW_PENDING" ||
    selectedItem.status === "APPROVED";

  const progress = selectedItem?.pipeline?.progress ?? 0;
  const progressScale = clamp(progress / 100, 0, 1);

  const selectedKey = selectedItem?.id ?? null;

  useLayoutEffect(() => {
    if (!selectedKey) return;
    detailScrollRef.current?.scrollTo({ top: 0 });
  }, [selectedKey]);

  // 위치/크기/진행률은 CSS 변수로만 주입
  const containerStyle: CreatorCSSVars = {
    "--cb-creator-x": `${panelPos.left}px`,
    "--cb-creator-y": `${panelPos.top}px`,
  };

  const panelStyle: CreatorCSSVars = {
    "--cb-creator-w": `${size.width}px`,
    "--cb-creator-h": `${size.height}px`,
    "--cb-creator-progress": `${progressScale}`,
  };

  return (
    <div className="cb-creator-wrapper" aria-hidden={false}>
      <div
        className="cb-creator-panel-container"
        style={containerStyle}
        onMouseDown={onPanelMouseDown}
      >
        <div
          className={cx("cb-panel", "cb-creator-panel")}
          style={panelStyle}
          tabIndex={0}
          role="dialog"
          aria-label="Creator Studio"
        >
          <button
            className="cb-panel-close-btn"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onCloseClick}
            type="button"
            aria-label="닫기"
          >
            ×
          </button>

          {/* resize handles */}
          <div
            className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-nw"
            onMouseDown={handleResizeMouseDown("nw")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-ne"
            onMouseDown={handleResizeMouseDown("ne")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-sw"
            onMouseDown={handleResizeMouseDown("sw")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-se"
            onMouseDown={handleResizeMouseDown("se")}
          />

          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-n"
            onMouseDown={handleResizeMouseDown("n")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-s"
            onMouseDown={handleResizeMouseDown("s")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-e"
            onMouseDown={handleResizeMouseDown("e")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-w"
            onMouseDown={handleResizeMouseDown("w")}
          />

          {/* Header */}
          <div
            className="cb-creator-header"
            onMouseDown={handleHeaderMouseDown}
          >
            <div className="cb-creator-header-main">
              <div className="cb-creator-badge">CREATOR STUDIO</div>
              <div className="cb-creator-title">교육 콘텐츠 제작</div>
              <div className="cb-creator-subrow">
                <div className="cb-creator-subtitle">
                  자료 업로드 → 자동 생성(스크립트/영상) → 미리보기/수정 → 검토 요청(SoD)
                </div>

                <button
                  className="cb-admin-primary-btn cb-creator-create-btn"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={createDraft}
                  type="button"
                >
                  새 교육 만들기
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="cb-creator-body">
            <div className="cb-creator-layout">
              {/* Left: Queue */}
              <div className="cb-creator-left">
                <div className="cb-creator-left-top">
                  <div className="cb-creator-tabs">
                    {(
                      [
                        "draft",
                        "review_pending",
                        "rejected",
                        "approved",
                        "failed",
                      ] as CreatorTabId[]
                    ).map((t) => (
                      <button
                        key={t}
                        className={cx(
                          "cb-reviewer-tab",
                          tab === t && "cb-reviewer-tab--active"
                        )}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => setTab(t)}
                        type="button"
                      >
                        {tabLabel(t)}
                      </button>
                    ))}
                  </div>

                  <div className="cb-creator-spacer-10" />

                  <div className="cb-creator-search-row">
                    <input
                      className={cx("cb-admin-input", "cb-creator-search-input")}
                      placeholder="제목/카테고리/부서 검색"
                      value={query}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) => setQuery(e.target.value)}
                    />
                    <select
                      className={cx("cb-admin-select", "cb-creator-search-select")}
                      value={sortMode}
                      onMouseDown={(e) => e.stopPropagation()}
                      onChange={(e) =>
                        setSortMode(e.target.value as CreatorSortMode)
                      }
                    >
                      <option value="updated_desc">최근 수정</option>
                      <option value="created_desc">최근 생성</option>
                      <option value="updated_asc">수정 오래된</option>
                      <option value="created_asc">생성 오래된</option>
                    </select>
                  </div>
                </div>

                <div className="cb-creator-list">
                  {filteredItems.length === 0 ? (
                    <div className="cb-creator-empty">
                      <div className="cb-creator-empty-title">목록이 비어있습니다</div>
                      <div className="cb-creator-empty-desc">
                        현재 필터 조건에 해당하는 제작 콘텐츠가 없습니다.
                      </div>
                    </div>
                  ) : (
                    filteredItems.map((it) => (
                      <button
                        key={it.id}
                        className={cx(
                          "cb-reviewer-item",
                          "cb-creator-item",
                          selectedItem?.id === it.id &&
                          "cb-reviewer-item--active"
                        )}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => selectItem(it.id)}
                        type="button"
                      >
                        <div className="cb-creator-item-top">
                          <div className="cb-creator-item-main">
                            <div className="cb-creator-item-title">{it.title}</div>
                            <div className="cb-creator-item-sub">
                              {it.categoryLabel} · {labelTrainingType(it.trainingType)}
                            </div>
                          </div>

                          <span className={statusToneClass(it.status)}>
                            {labelStatus(it.status)}
                          </span>
                        </div>

                        <div className="cb-creator-item-bottom">
                          <div className="cb-creator-item-depts">
                            {it.targetDeptIds.length === 0
                              ? "전사"
                              : it.targetDeptIds.map(deptLabel).join(", ")}
                          </div>
                          <div className="cb-creator-item-date">
                            {formatDateTime(it.updatedAt)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right: Detail */}
              <div className="cb-creator-right">
                {!selectedItem ? (
                  <div className="cb-creator-right-empty">
                    <div className="cb-creator-empty">
                      <div className="cb-creator-empty-title">선택된 콘텐츠가 없습니다</div>
                      <div className="cb-creator-empty-desc">
                        왼쪽 목록에서 제작할 콘텐츠를 선택해주세요.
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Detail header */}
                    <div className="cb-creator-detail-header">
                      <div className="cb-creator-detail-head-left">
                        <div className="cb-creator-detail-title-row">
                          <div className="cb-creator-detail-title">
                            {selectedItem.title}
                          </div>
                          <span
                            className={cx(statusToneClass(selectedItem.status), "cb-creator-detail-status")}
                          >
                            {labelStatus(selectedItem.status)}
                          </span>
                        </div>
                        <div className="cb-creator-detail-subline">
                          생성: {formatDateTime(selectedItem.createdAt)} · 수정:{" "}
                          {formatDateTime(selectedItem.updatedAt)} · 작성자:{" "}
                          {selectedItem.createdByName}
                        </div>
                      </div>

                      <div className="cb-creator-detail-header-actions">
                        {selectedItem.status === "REJECTED" && (
                          <button
                            className="cb-admin-ghost-btn"
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={reopenRejectedToDraft}
                          >
                            초안으로 되돌리기
                          </button>
                        )}
                        {(selectedItem.status === "DRAFT" ||
                          selectedItem.status === "FAILED") && (
                            <button
                              className="cb-admin-ghost-btn"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={deleteDraft}
                            >
                              삭제
                            </button>
                          )}
                      </div>
                    </div>

                    {/* Detail content */}
                    <div className="cb-creator-detail-scroll" ref={detailScrollRef}>
                      <div className="cb-creator-detail-stack">
                        {/* Rejected comment */}
                        {selectedItem.status === "REJECTED" &&
                          selectedItem.rejectedComment && (
                            <div className="cb-reviewer-detail-card">
                              <div className="cb-reviewer-detail-card-title">
                                반려 사유
                              </div>
                              <div className="cb-reviewer-detail-card-desc">
                                {selectedItem.rejectedComment}
                              </div>
                            </div>
                          )}

                        {selectedItem.status === "FAILED" &&
                          selectedItem.failedReason && (
                            <div className="cb-reviewer-detail-card">
                              <div className="cb-reviewer-detail-card-title">
                                생성 실패
                              </div>
                              <div className="cb-reviewer-detail-card-desc">
                                {selectedItem.failedReason}
                              </div>
                            </div>
                          )}

                        {/* Metadata */}
                        <div className="cb-reviewer-detail-card">
                          <div className="cb-reviewer-detail-card-title">기본 정보</div>

                          <div className="cb-creator-meta-grid2">
                            <label className="cb-creator-field">
                              <div className="cb-creator-field-label">제목</div>
                              <input
                                className="cb-admin-input"
                                value={selectedItem.title}
                                disabled={disableMeta}
                                onMouseDown={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  updateSelectedMeta({ title: e.target.value })
                                }
                              />
                            </label>

                            <label className="cb-creator-field">
                              <div className="cb-creator-field-label">카테고리</div>
                              <select
                                className="cb-admin-select"
                                value={selectedItem.categoryId}
                                disabled={disableMeta}
                                onMouseDown={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  updateSelectedMeta({
                                    categoryId: id,
                                    categoryLabel: categoryLabel(id),
                                  });
                                }}
                              >
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="cb-creator-field">
                              <div className="cb-creator-field-label">교육 유형</div>
                              <select
                                className="cb-admin-select"
                                value={selectedItem.trainingType}
                                disabled={disableMeta}
                                onMouseDown={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  updateSelectedMeta({
                                    trainingType: e.target.value as TrainingType,
                                  })
                                }
                              >
                                {trainingTypeOptions().map((opt) => (
                                  <option key={opt.id} value={opt.id}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="cb-creator-field">
                              <div className="cb-creator-field-label">
                                예상 시청 시간(분)
                              </div>
                              <input
                                className="cb-admin-input"
                                type="number"
                                min={1}
                                value={selectedItem.estimatedMinutes}
                                disabled={disableMeta}
                                onMouseDown={(e) => e.stopPropagation()}
                                onChange={(e) =>
                                  updateSelectedMeta({
                                    estimatedMinutes: Number(e.target.value),
                                  })
                                }
                              />
                            </label>
                          </div>

                          <div className="cb-creator-meta-grid2 cb-creator-meta-grid2--mt">
                            <label className="cb-creator-field">
                              <div className="cb-creator-field-label">대상 부서</div>

                              <div className="cb-creator-checkbox-box">
                                {selectedItem.trainingType === "MANDATORY" ||
                                  selectedItem.trainingType === "OTHER" ? (
                                  <span className="cb-creator-muted">전사</span>
                                ) : (
                                  departments.map((d) => {
                                    const checked = selectedItem.targetDeptIds.includes(
                                      d.id
                                    );
                                    return (
                                      <label key={d.id} className="cb-creator-checkitem">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          disabled={disableMeta}
                                          onMouseDown={(e) => e.stopPropagation()}
                                          onChange={(e) => {
                                            const next = e.target.checked
                                              ? Array.from(
                                                new Set([
                                                  ...selectedItem.targetDeptIds,
                                                  d.id,
                                                ])
                                              )
                                              : selectedItem.targetDeptIds.filter(
                                                (x) => x !== d.id
                                              );
                                            updateSelectedMeta({ targetDeptIds: next });
                                          }}
                                        />
                                        {d.name}
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            </label>

                            <label className="cb-creator-field">
                              <div className="cb-creator-field-label">필수 여부</div>

                              <div className="cb-creator-inline-box">
                                <input
                                  type="checkbox"
                                  checked={selectedItem.isMandatory}
                                  disabled={disableMeta}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onChange={(e) =>
                                    updateSelectedMeta({
                                      isMandatory: e.target.checked,
                                    })
                                  }
                                />
                                <span className="cb-creator-inline-text">
                                  {selectedItem.isMandatory ? "필수" : "선택"}
                                </span>
                              </div>
                            </label>
                          </div>
                        </div>

                        {/* Upload + Pipeline */}
                        <div className="cb-reviewer-detail-card">
                          <div className="cb-reviewer-detail-card-title">
                            자료 업로드 & 자동 생성
                          </div>
                          <div className="cb-reviewer-detail-card-desc">
                            PDF/PPT/HWP 등 자료를 업로드하면 스크립트(TTS) + 슬라이드 합성으로
                            영상 초안을 생성합니다.
                          </div>

                          <div className="cb-creator-upload-row">
                            <button
                              className="cb-admin-ghost-btn"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={onPickFile}
                              disabled={disableMeta}
                            >
                              자료 업로드
                            </button>
                            <input
                              ref={fileInputRef}
                              type="file"
                              accept=".pdf,.ppt,.pptx,.hwp,.hwpx,.png,.jpg,.jpeg"
                              className="cb-creator-hidden-file-input"
                              onChange={onFileChange}
                            />
                            <div className="cb-creator-upload-filename">
                              {selectedItem.assets.sourceFileName
                                ? `업로드됨: ${selectedItem.assets.sourceFileName}`
                                : "업로드된 파일 없음"}
                            </div>
                          </div>

                          <div className="cb-creator-pipeline-row">
                            <div className="cb-creator-pipeline-status">
                              <div className="cb-creator-pipeline-status-title">
                                상태:{" "}
                                {selectedItem.pipeline.state === "RUNNING"
                                  ? selectedItem.pipeline.message ?? "진행 중"
                                  : labelStatus(selectedItem.status)}
                              </div>
                              <div className="cb-creator-pipeline-status-desc">
                                {selectedItem.pipeline.state !== "IDLE" &&
                                  selectedItem.pipeline.progress > 0
                                  ? `진행률 ${selectedItem.pipeline.progress}%`
                                  : "자동 생성 실행 전"}
                              </div>
                            </div>

                            <div className="cb-creator-pipeline-actions">
                              {selectedItem.status === "FAILED" ? (
                                <button
                                  className="cb-admin-primary-btn"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={retryPipelineForSelected}
                                >
                                  재시도
                                </button>
                              ) : (
                                <button
                                  className="cb-admin-primary-btn"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={runPipelineForSelected}
                                  disabled={
                                    disableMeta || selectedItem.status === "GENERATING"
                                  }
                                >
                                  자동 생성 실행
                                </button>
                              )}
                            </div>
                          </div>

                          {/* progress bar (CSS var --cb-creator-progress 사용) */}
                          <div className="cb-creator-progress">
                            <div className="cb-creator-progress-bar" />
                          </div>
                        </div>

                        {/* Preview */}
                        <div className="cb-reviewer-detail-card">
                          <div className="cb-reviewer-detail-card-title">미리보기</div>
                          <div className="cb-reviewer-detail-card-desc">
                            생성된 스크립트/영상을 확인하고 필요한 경우 수정한 뒤 검토 요청을
                            보냅니다.
                          </div>

                          <div className="cb-creator-preview-grid">
                            <div className="cb-creator-preview-col">
                              <div className="cb-creator-preview-label">스크립트</div>
                              <textarea
                                className={cx(
                                  "cb-reviewer-textarea",
                                  "cb-creator-script-textarea"
                                )}
                                value={selectedItem.assets.script ?? ""}
                                disabled={disableMeta}
                                placeholder="자동 생성 후 스크립트가 표시됩니다."
                                onMouseDown={(e) => e.stopPropagation()}
                                onChange={(e) => updateSelectedScript(e.target.value)}
                              />
                            </div>

                            <div className="cb-creator-preview-col">
                              <div className="cb-creator-preview-label">영상</div>
                              <div className="cb-creator-video-frame">
                                {selectedItem.assets.videoUrl ? (
                                  <div className="cb-creator-video-placeholder">
                                    (mock) video: {selectedItem.assets.videoUrl}
                                    <div className="cb-creator-video-subline">
                                      실제 연동 시 video player로 교체
                                    </div>
                                  </div>
                                ) : (
                                  <div className="cb-creator-video-placeholder">
                                    아직 생성된 영상이 없습니다.
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Validation issues */}
                        {!selectedValidation.ok &&
                          (selectedItem.status === "DRAFT" ||
                            selectedItem.status === "REJECTED") && (
                            <div className="cb-reviewer-detail-card">
                              <div className="cb-reviewer-detail-card-title">
                                검토 요청 전 체크
                              </div>
                              <div className="cb-reviewer-detail-card-desc">
                                아래 항목을 충족해야 검토 요청을 보낼 수 있습니다.
                              </div>
                              <ul className="cb-creator-validation-list">
                                {selectedValidation.issues.map((it, idx) => (
                                  <li key={idx}>{it}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>

                    {/* Bottom action bar */}
                    <div className="cb-creator-actionbar">
                      <div className="cb-creator-actionbar-hint">
                        {selectedItem.status === "REVIEW_PENDING"
                          ? "검토 대기 중입니다. 검토자는 승인/반려 처리 후 결과를 남깁니다."
                          : selectedItem.status === "APPROVED"
                            ? "승인/게시 상태입니다. 제작자는 수정/재배포에 개입할 수 없습니다."
                            : "초안 상태에서 자동 생성/수정 후 검토 요청을 제출하세요."}
                      </div>

                      <div className="cb-creator-actionbar-actions">
                        <button
                          className="cb-admin-primary-btn"
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={requestReviewForSelected}
                          disabled={
                            !selectedValidation.ok ||
                            (selectedItem.status !== "DRAFT" &&
                              selectedItem.status !== "REJECTED")
                          }
                        >
                          검토 요청
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* toast */}
          {toast && (
            <div
              className={cx("cb-creator-toast", `cb-creator-toast--${toast.kind}`)}
              role="status"
              aria-live="polite"
            >
              {toast.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreatorStudioView;
