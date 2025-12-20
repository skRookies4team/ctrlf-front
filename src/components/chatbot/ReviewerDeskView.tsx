// src/components/chatbot/ReviewerDeskView.tsx
import React, { useEffect, useRef, useState } from "react";
import "./chatbot.css";
import { computePanelPosition, type Anchor, type PanelSize } from "../../utils/chat";

import { useReviewerDeskController } from "./useReviewerDeskController";
import ReviewerQueue from "./ReviewerQueue";
import ReviewerDetail from "./ReviewerDetail";
import ReviewerActionBar from "./ReviewerActionBar";
import ReviewerOverlays from "./ReviewerOverlays";

type ResizeDirection = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

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

interface ReviewerDeskViewProps {
  anchor?: Anchor | null;
  onClose: () => void;
  onRequestFocus?: () => void;

  /**
   * 추후 Keycloak 토큰/백엔드 API에서 내려오는 값 연결용
   * - 검토자는 전사 범위 고정(타입/범위 분리 없음)
   */
  reviewerName?: string;
}

const MIN_WIDTH = 980;
const MIN_HEIGHT = 620;
const MAX_WIDTH = 1240;
const PANEL_MARGIN = 80;

const createInitialSize = (): PanelSize => {
  if (typeof window === "undefined") return { width: 1080, height: 740 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, vw - PANEL_MARGIN));
  const height = Math.max(MIN_HEIGHT, vh - PANEL_MARGIN);
  return { width, height };
};

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function cursorForResizeDir(dir: ResizeDirection) {
  if (dir === "n" || dir === "s") return "ns-resize";
  if (dir === "e" || dir === "w") return "ew-resize";
  if (dir === "ne" || dir === "sw") return "nesw-resize";
  return "nwse-resize"; // nw, se
}

function isTextInputTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName?.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

function clampPanelPos(pos: { top: number; left: number }, size: PanelSize) {
  const margin = 16;
  if (typeof window === "undefined") return pos;
  const maxLeft = Math.max(margin, window.innerWidth - margin - size.width);
  const maxTop = Math.max(margin, window.innerHeight - margin - size.height);
  return {
    left: Math.max(margin, Math.min(maxLeft, pos.left)),
    top: Math.max(margin, Math.min(maxTop, pos.top)),
  };
}

function clampPanelSize(size: PanelSize) {
  const margin = 16;
  if (typeof window === "undefined") return size;

  const maxW = Math.max(320, window.innerWidth - margin * 2);
  const maxH = Math.max(320, window.innerHeight - margin * 2);

  const minW = Math.min(MIN_WIDTH, maxW);
  const minH = Math.min(MIN_HEIGHT, maxH);

  return {
    width: Math.max(minW, Math.min(MAX_WIDTH, Math.min(maxW, size.width))),
    height: Math.max(minH, Math.min(maxH, size.height)),
  };
}

const ReviewerDeskView: React.FC<ReviewerDeskViewProps> = ({
  anchor,
  onClose,
  onRequestFocus,
  reviewerName,
}) => {
  const [size, setSize] = useState<PanelSize>(() => createInitialSize());
  const [panelPos, setPanelPos] = useState(() =>
    computePanelPosition(anchor ?? null, createInitialSize())
  );

  const uid = React.useId();

  // 드래그/리사이즈 stale closure 방지
  const sizeRef = useRef<PanelSize>(size);
  const posRef = useRef(panelPos);

  useEffect(() => {
    sizeRef.current = size;
  }, [size]);

  useEffect(() => {
    posRef.current = panelPos;
  }, [panelPos]);

  // anchor 변경 시 위치 재계산
  useEffect(() => {
    const next = computePanelPosition(anchor ?? null, sizeRef.current);
    const clamped = clampPanelPos(next, sizeRef.current);
    setPanelPos(clamped);
    posRef.current = clamped;
  }, [anchor]);

  // window resize 시 화면 밖으로 나가지 않게 clamp
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onResize = () => {
      const nextSize = clampPanelSize(sizeRef.current);
      const nextPos = clampPanelPos(posRef.current, nextSize);

      const sizeChanged =
        nextSize.width !== sizeRef.current.width || nextSize.height !== sizeRef.current.height;
      const posChanged = nextPos.left !== posRef.current.left || nextPos.top !== posRef.current.top;

      if (sizeChanged) {
        sizeRef.current = nextSize;
        setSize(nextSize);
      }
      if (sizeChanged || posChanged) {
        posRef.current = nextPos;
        setPanelPos(nextPos);
      }
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const panelRef = useRef<HTMLDivElement | null>(null);

  const resizeRef = useRef<ResizeState>({
    resizing: false,
    dir: null,
    startX: 0,
    startY: 0,
    startWidth: 0,
    startHeight: 0,
    startTop: 0,
    startLeft: 0,
  });

  const dragRef = useRef<DragState>({
    dragging: false,
    startX: 0,
    startY: 0,
    startTop: 0,
    startLeft: 0,
  });

  // ===== 도메인 컨트롤러 훅(연동 준비형) =====
  const desk = useReviewerDeskController({
    reviewerName,
  });

  const {
    effectiveReviewerName,
    counts,
    listMode,
    setListMode,
    pageIndex,
    setPageIndex,
    pageSize,
    setPageSize,
    totalPages,
    filtered,
    pageItems,
    activeTab,
    setActiveTab,
    detailTab,
    setDetailTab,
    query,
    setQuery,
    onlyMine,
    setOnlyMine,
    riskOnly,
    setRiskOnly,
    sortMode,
    setSortMode,
    selectedId,
    setSelectedId,
    selectedIndex,
    selectedItem,
    notesById,
    setNotesById,
    actionGuard,
    canApprove,
    canReject,
    approveProcessing,
    rejectProcessing,
    busyText,
    isBusy,
    isOverlayOpen,
    toast,
    closeToast,
    handleRefresh,
    decisionModal,
    openApproveModal,
    openRejectModal,
    closeDecisionModal,
    applyApprove,
    applyReject,
    previewOpen,
    openPreview,
    closePreview,
    handleSaveNote,
    moveSelection,
    lastRefreshedAtLabel,
    devtools,
    stageFilter,
    setStageFilter,
    stageCounts,
  } = desk;

  // selectedItem 선언(구조분해) 이후에 계산해야 TS/ESLint 경고 없음
  const approvalCtx = React.useMemo(() => {
    if (!selectedItem) {
      return { stage: null as 1 | 2 | null, publishOnApprove: false, label: "승인" };
    }

    if (selectedItem.contentType === "VIDEO") {
      const stage: 1 | 2 = selectedItem.videoUrl?.trim() ? 2 : 1;
      return {
        stage,
        publishOnApprove: stage === 2,
        label: stage === 2 ? "2차 승인" : "1차 승인",
      };
    }

    // VIDEO가 아닌 문서/정책은 ‘최종 승인 = 즉시 공개’로 보는 게 자연스러움
    return { stage: null as 1 | 2 | null, publishOnApprove: true, label: "승인" };
  }, [selectedItem]);

  const titleId = `cb-reviewer-title-${uid}`;
  const subtitleId = `cb-reviewer-sub-${uid}`;

  const onPanelMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    onRequestFocus?.();
    if (isTextInputTarget(e.target)) return;
    panelRef.current?.focus();
  };

  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isOverlayOpen) return;
    if (isTextInputTarget(e.target)) return;

    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveSelection(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveSelection(-1);
      return;
    }
    if (e.key === "/") {
      e.preventDefault();
      const input = panelRef.current?.querySelector<HTMLInputElement>(".cb-reviewer-search");
      input?.focus();
      return;
    }
    if (e.key === "Enter") {
      if (!selectedItem) return;
      e.preventDefault();
      openPreview(); // “Enter 미리보기” 문구와 동작 일치
      return;
    }
  };

  // 드래그/리사이즈: window 리스너 1회 + ref 기반
  useEffect(() => {
    if (typeof window === "undefined") return;
    const margin = 16;

    const handleMouseMove = (event: MouseEvent) => {
      const resizeState = resizeRef.current;
      const dragState = dragRef.current;

      if (resizeState.resizing && resizeState.dir) {
        const dx = event.clientX - resizeState.startX;
        const dy = event.clientY - resizeState.startY;

        let newWidth = resizeState.startWidth;
        let newHeight = resizeState.startHeight;
        let newTop = resizeState.startTop;
        let newLeft = resizeState.startLeft;

        const dir = resizeState.dir;

        if (dir.includes("e")) newWidth = resizeState.startWidth + dx;
        if (dir.includes("s")) newHeight = resizeState.startHeight + dy;
        if (dir.includes("w")) {
          newWidth = resizeState.startWidth - dx;
          newLeft = resizeState.startLeft + dx;
        }
        if (dir.includes("n")) {
          newHeight = resizeState.startHeight - dy;
          newTop = resizeState.startTop + dy;
        }

        const maxWidth = window.innerWidth - margin * 2;
        const maxHeight = window.innerHeight - margin * 2;

        newWidth = Math.max(MIN_WIDTH, Math.min(maxWidth, newWidth));
        newHeight = Math.max(MIN_HEIGHT, Math.min(maxHeight, newHeight));

        const maxLeft = window.innerWidth - margin - newWidth;
        const maxTop = window.innerHeight - margin - newHeight;

        newLeft = Math.max(margin, Math.min(maxLeft, newLeft));
        newTop = Math.max(margin, Math.min(maxTop, newTop));

        const nextSize = { width: newWidth, height: newHeight };
        const nextPos = { top: newTop, left: newLeft };

        sizeRef.current = nextSize;
        posRef.current = nextPos;

        setSize(nextSize);
        setPanelPos(nextPos);
        return;
      }

      if (dragState.dragging) {
        const curSize = sizeRef.current;
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;

        let newTop = dragState.startTop + dy;
        let newLeft = dragState.startLeft + dx;

        const maxLeft = window.innerWidth - margin - curSize.width;
        const maxTop = window.innerHeight - margin - curSize.height;

        newLeft = Math.max(margin, Math.min(maxLeft, newLeft));
        newTop = Math.max(margin, Math.min(maxTop, newTop));

        const nextPos = { top: newTop, left: newLeft };
        posRef.current = nextPos;
        setPanelPos(nextPos);
      }
    };

    const handleMouseUp = () => {
      if (resizeRef.current.resizing) {
        resizeRef.current.resizing = false;
        resizeRef.current.dir = null;
      }
      if (dragRef.current.dragging) {
        dragRef.current.dragging = false;
      }

      if (typeof document !== "undefined") {
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleResizeMouseDown =
    (dir: ResizeDirection) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      if (typeof document !== "undefined") {
        document.body.style.userSelect = "none";
        document.body.style.cursor = cursorForResizeDir(dir);
      }

      resizeRef.current = {
        resizing: true,
        dir,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: sizeRef.current.width,
        startHeight: sizeRef.current.height,
        startTop: posRef.current.top,
        startLeft: posRef.current.left,
      };
      dragRef.current.dragging = false;
    };

  const handleDragMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (typeof document !== "undefined") {
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
    }

    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startTop: posRef.current.top,
      startLeft: posRef.current.left,
    };
    resizeRef.current.resizing = false;
    resizeRef.current.dir = null;
  };

  return (
    <div className="cb-reviewer-wrapper">
      <div
        className="cb-reviewer-panel-container"
        style={{ top: panelPos.top, left: panelPos.left }}
      >
        <div
          ref={panelRef}
          className="cb-reviewer-panel cb-chatbot-panel"
          style={{ width: size.width, height: size.height }}
          onMouseDown={onPanelMouseDown}
          onKeyDown={handlePanelKeyDown}
          tabIndex={0}
          role="region"
          aria-labelledby={titleId}
          aria-describedby={subtitleId}
          aria-busy={isBusy}
        >
          <div className="cb-drag-bar" onMouseDown={handleDragMouseDown} />

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
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-w"
            onMouseDown={handleResizeMouseDown("w")}
          />
          <div
            className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-e"
            onMouseDown={handleResizeMouseDown("e")}
          />

          {/* Toast */}
          {toast.open && (
            <div
              className={cx("cb-reviewer-toast", `cb-reviewer-toast--${toast.tone}`)}
              role="status"
              aria-live="polite"
              aria-atomic="true"
            >
              <span>{toast.message}</span>
              <button
                type="button"
                className="cb-reviewer-toast-close"
                onClick={closeToast}
                aria-label="close toast"
              >
                ✕
              </button>
            </div>
          )}

          {/* Header */}
          <div className="cb-reviewer-header">
            <div className="cb-reviewer-header-main">
              <div className="cb-reviewer-title-row">
                <span className="cb-reviewer-badge">REVIEWER DESK</span>
                <h2 id={titleId} className="cb-reviewer-title">
                  콘텐츠 검토 데스크
                </h2>
              </div>
              <p id={subtitleId} className="cb-reviewer-subtitle">
                검토 대기 콘텐츠를 승인/반려하고 감사 이력을 남깁니다.
                {selectedItem &&
                  (approvalCtx.publishOnApprove
                    ? " (승인 시 즉시 공개)"
                    : " (1차 승인은 공개되지 않으며, 제작자가 영상 제작을 진행합니다.)")}
              </p>
              <div className="cb-reviewer-context">
                {busyText && (
                  <span className="cb-reviewer-context-chip" aria-live="polite">
                    {busyText}
                  </span>
                )}
                <span className="cb-reviewer-context-chip">
                  검토자 <strong>{effectiveReviewerName}</strong>
                </span>
                <span className="cb-reviewer-context-meta">
                  업데이트 <strong>{lastRefreshedAtLabel}</strong>
                </span>
              </div>
            </div>

            <div className="cb-reviewer-header-actions">
              {devtools.enabled && (
                <>
                  <button
                    type="button"
                    className="cb-reviewer-ghost-btn"
                    onClick={devtools.toggleDataset}
                    disabled={isBusy || isOverlayOpen}
                    title="DEV: 대량 데이터/기본 데이터 토글"
                  >
                    {devtools.datasetLabel}
                  </button>
                  <button
                    type="button"
                    className="cb-reviewer-ghost-btn"
                    onClick={devtools.simulateConflict}
                    disabled={isBusy || isOverlayOpen || !selectedId}
                    title="DEV: 충돌 시뮬레이션(버전/상태 변경)"
                  >
                    충돌 시뮬
                  </button>
                </>
              )}

              <button
                type="button"
                className="cb-reviewer-ghost-btn"
                onClick={handleRefresh}
                disabled={isBusy}
                title={isBusy ? "처리 중에는 새로고침할 수 없습니다." : undefined}
              >
                새로고침
              </button>
              <button
                type="button"
                className="cb-reviewer-close-btn"
                onClick={onClose}
                aria-label="close"
                disabled={isBusy}
                title={isBusy ? "처리 중에는 닫을 수 없습니다." : undefined}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="cb-reviewer-body">
            <ReviewerQueue
              uid={uid}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              counts={counts}
              query={query}
              setQuery={setQuery}
              onlyMine={onlyMine}
              setOnlyMine={setOnlyMine}
              riskOnly={riskOnly}
              setRiskOnly={setRiskOnly}
              sortMode={sortMode}
              setSortMode={setSortMode}
              isBusy={isBusy}
              isOverlayOpen={isOverlayOpen}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              selectedIndex={selectedIndex}
              filtered={filtered}
              listMode={listMode}
              setListMode={setListMode}
              pageIndex={pageIndex}
              setPageIndex={setPageIndex}
              pageSize={pageSize}
              setPageSize={setPageSize}
              totalPages={totalPages}
              pageItems={pageItems}
              stageFilter={stageFilter}
              setStageFilter={setStageFilter}
              stageCounts={stageCounts}
            />

            <div className="cb-reviewer-detail">
              <ReviewerDetail
                isBusy={isBusy}
                isOverlayOpen={isOverlayOpen}
                detailTab={detailTab}
                setDetailTab={setDetailTab}
                selectedItem={selectedItem}
                notesById={notesById}
                setNotesById={setNotesById}
                onSaveNote={handleSaveNote}
                onOpenPreview={openPreview}
              />

              <ReviewerActionBar
                actionGuard={actionGuard}
                canApprove={canApprove}
                canReject={canReject}
                isBusy={isBusy}
                isOverlayOpen={isOverlayOpen}
                approveProcessing={approveProcessing}
                rejectProcessing={rejectProcessing}
                onApprove={openApproveModal}
                onReject={openRejectModal}
                approveLabel={approvalCtx.label}
                approveProcessingLabel={`${approvalCtx.label} 중…`}
              />
            </div>
          </div>

          <ReviewerOverlays
            isBusy={isBusy}
            canApprove={canApprove}
            approveProcessing={approveProcessing}
            rejectProcessing={rejectProcessing}
            decisionModal={decisionModal}
            onCloseDecision={closeDecisionModal}
            onApprove={applyApprove}
            onReject={applyReject}
            previewOpen={previewOpen}
            onClosePreview={closePreview}
            previewItem={selectedItem}
            approveLabel={approvalCtx.label}
            approveProcessingLabel={`${approvalCtx.label} 처리 중…`}
          />
        </div>
      </div>
    </div>
  );
};

export default ReviewerDeskView;
