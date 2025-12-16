// src/components/chatbot/CreatorStudioView.tsx
import React, { useEffect, useRef, useState } from "react";
import "./chatbot.css";
import {
  computePanelPosition,
  type Anchor,
  type PanelSize,
} from "../../utils/chat";

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

interface CreatorStudioViewProps {
  anchor?: Anchor | null;
  onClose: () => void;
  onRequestFocus?: () => void;
}

const MIN_WIDTH = 860;
const MIN_HEIGHT = 560;
const MAX_WIDTH = 1160;
const PANEL_MARGIN = 80;

const createInitialSize = (): PanelSize => {
  if (typeof window === "undefined") return { width: 980, height: 680 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, vw - PANEL_MARGIN));
  const height = Math.max(MIN_HEIGHT, vh - PANEL_MARGIN);
  return { width, height };
};

const CreatorStudioView: React.FC<CreatorStudioViewProps> = ({
  anchor,
  onClose,
  onRequestFocus,
}) => {
  const [size, setSize] = useState<PanelSize>(() => createInitialSize());
  const [panelPos, setPanelPos] = useState(() =>
    computePanelPosition(anchor ?? null, createInitialSize())
  );

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

  useEffect(() => {
    setPanelPos(computePanelPosition(anchor ?? null, size));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchor]);

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

        setSize({ width: newWidth, height: newHeight });
        setPanelPos({ top: newTop, left: newLeft });
        return;
      }

      if (dragState.dragging) {
        const dx = event.clientX - dragState.startX;
        const dy = event.clientY - dragState.startY;

        let newTop = dragState.startTop + dy;
        let newLeft = dragState.startLeft + dx;

        const maxLeft = window.innerWidth - margin - size.width;
        const maxTop = window.innerHeight - margin - size.height;

        newLeft = Math.max(margin, Math.min(maxLeft, newLeft));
        newTop = Math.max(margin, Math.min(maxTop, newTop));

        setPanelPos({ top: newTop, left: newLeft });
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
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [size.width, size.height]);

  const handleResizeMouseDown =
    (dir: ResizeDirection) => (event: React.MouseEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();

      resizeRef.current = {
        resizing: true,
        dir,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: size.width,
        startHeight: size.height,
        startTop: panelPos.top,
        startLeft: panelPos.left,
      };
      dragRef.current.dragging = false;
    };

  const handleDragMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragRef.current = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startTop: panelPos.top,
      startLeft: panelPos.left,
    };
    resizeRef.current.resizing = false;
    resizeRef.current.dir = null;
  };

  return (
    <div className="cb-creator-wrapper">
      <div className="cb-creator-panel-container" style={{ top: panelPos.top, left: panelPos.left }}>
        <div className="cb-creator-panel cb-chatbot-panel" style={{ width: size.width, height: size.height }} onMouseDown={onRequestFocus}>
          <div className="cb-drag-bar" onMouseDown={handleDragMouseDown} />

          <div className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-nw" onMouseDown={handleResizeMouseDown("nw")} />
          <div className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-ne" onMouseDown={handleResizeMouseDown("ne")} />
          <div className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-sw" onMouseDown={handleResizeMouseDown("sw")} />
          <div className="cb-resize-handle cb-resize-handle-corner cb-resize-handle-se" onMouseDown={handleResizeMouseDown("se")} />
          <div className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-n" onMouseDown={handleResizeMouseDown("n")} />
          <div className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-s" onMouseDown={handleResizeMouseDown("s")} />
          <div className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-w" onMouseDown={handleResizeMouseDown("w")} />
          <div className="cb-resize-handle cb-resize-handle-edge cb-resize-handle-e" onMouseDown={handleResizeMouseDown("e")} />

          <div className="cb-creator-header">
            <div>
              <span className="cb-creator-badge">CREATOR STUDIO</span>
              <h2 className="cb-creator-title">교육 콘텐츠 제작 스튜디오</h2>
              <p className="cb-creator-subtitle">
                (준비중) 업로드 → 스크립트/영상 생성 → 미리보기/수정 → 검토요청까지의 제작 플로우를 제공할 예정입니다.
              </p>
            </div>
            <button type="button" className="cb-creator-close-btn" onClick={onClose} aria-label="close">
              ✕
            </button>
          </div>

          <div className="cb-creator-body">
            <div className="cb-creator-empty">
              <div className="cb-creator-empty-title">Creator Studio는 아직 구현 전입니다.</div>
              <div className="cb-creator-empty-desc">
                현재는 Reviewer Desk 구현을 먼저 완료한 뒤, 동일한 플로팅 패널 패턴으로 제작 스튜디오를 확장하면 됩니다.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorStudioView;
