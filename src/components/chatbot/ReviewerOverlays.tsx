// src/components/chatbot/ReviewerOverlays.tsx
import React, { useEffect, useRef, useState } from "react";
import type { DecisionModalState } from "./useReviewerDeskController";
import type { ReviewWorkItem } from "./reviewerDeskTypes";
import { useStableEvent } from "./useStableEvent";

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function getFocusable(container: HTMLElement) {
  const selectors = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "[tabindex]:not([tabindex='-1'])",
  ];
  return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(","))).filter(
    (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
  );
}

/**
 * Reject 모달 바디 분리(기존 유지)
 */
const RejectModalBody: React.FC<{
  rejectTitleId: string;
  rejectDescId: string;

  initialReason: string;
  error?: string;

  isBusy: boolean;
  rejectProcessing: boolean;

  onCloseDecision: () => void;
  onReject: (reason: string) => void;
}> = ({
  rejectTitleId,
  rejectDescId,
  initialReason,
  error,
  isBusy,
  rejectProcessing,
  onCloseDecision,
  onReject,
}) => {
  const [reason, setReason] = useState(initialReason);

  const trimmed = reason.trim();
  const showError = !!error && trimmed.length === 0;

  return (
    <>
      <div id={rejectTitleId} className="cb-reviewer-modal-title">
        반려
      </div>
      <div id={rejectDescId} className="cb-reviewer-modal-desc">
        반려 사유는 필수이며, 제작자에게 전달됩니다.
      </div>

      <textarea
        className={cx(
          "cb-reviewer-textarea",
          "cb-reviewer-textarea--modal",
          showError && "cb-reviewer-textarea--error"
        )}
        value={reason}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
        placeholder="예) 개인정보 마스킹이 필요합니다. 전화번호/사번이 노출됩니다."
        disabled={isBusy}
      />

      {showError && <div className="cb-reviewer-error">{error}</div>}

      <div className="cb-reviewer-modal-actions">
        <button
          type="button"
          className="cb-reviewer-ghost-btn"
          onClick={onCloseDecision}
          disabled={isBusy}
        >
          취소
        </button>

        <button
          type="button"
          className="cb-reviewer-danger-btn"
          onClick={() => onReject(reason)}
          disabled={isBusy || trimmed.length === 0}
          title={trimmed.length === 0 ? "반려 사유를 입력하세요." : undefined}
        >
          {rejectProcessing ? "반려 처리 중…" : "반려하기"}
        </button>
      </div>
    </>
  );
};

const ReviewerOverlays: React.FC<{
  isBusy: boolean;

  canApprove: boolean;
  approveProcessing: boolean;
  rejectProcessing: boolean;

  decisionModal: DecisionModalState;
  onCloseDecision: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;

  previewOpen: boolean;
  onClosePreview: () => void;
  previewItem: ReviewWorkItem | null;
}> = ({
  isBusy,
  canApprove,
  approveProcessing,
  rejectProcessing,
  decisionModal,
  onCloseDecision,
  onApprove,
  onReject,
  previewOpen,
  onClosePreview,
  previewItem,
}) => {
  const uid = React.useId();

  const approveTitleId = `cb-reviewer-approve-title-${uid}`;
  const approveDescId = `cb-reviewer-approve-desc-${uid}`;
  const rejectTitleId = `cb-reviewer-reject-title-${uid}`;
  const rejectDescId = `cb-reviewer-reject-desc-${uid}`;
  const previewTitleId = `cb-reviewer-preview-title-${uid}`;
  const previewDescId = `cb-reviewer-preview-desc-${uid}`;

  const decisionRootRef = useRef<HTMLDivElement | null>(null);
  const lastDecisionFocusRef = useRef<HTMLElement | null>(null);

  const previewRootRef = useRef<HTMLDivElement | null>(null);
  const lastPreviewFocusRef = useRef<HTMLElement | null>(null);

  // stable handlers (리스너 재바인딩/스테일 클로저 방지)
  const onCloseDecisionEv = useStableEvent(onCloseDecision);
  const onClosePreviewEv = useStableEvent(onClosePreview);
  const onApproveEv = useStableEvent(onApprove);
  const onRejectEv = useStableEvent(onReject);

  const isAnyOpen = decisionModal.open || previewOpen;

  // ===== focus init / restore (Decision) =====
  useEffect(() => {
    if (!decisionModal.open) {
      // close 시점: focus restore
      window.setTimeout(() => lastDecisionFocusRef.current?.focus?.(), 0);
      return;
    }

    lastDecisionFocusRef.current = document.activeElement as HTMLElement | null;

    window.setTimeout(() => {
      const root = decisionRootRef.current;
      if (!root) return;

      const focusables = getFocusable(root);

      if (decisionModal.kind === "reject") {
        const ta = root.querySelector<HTMLTextAreaElement>("textarea");
        if (ta) {
          ta.focus();
          return;
        }
      }

      focusables[0]?.focus();
    }, 0);
  }, [decisionModal.open, decisionModal.kind]);

  // ===== focus init / restore (Preview) =====
  useEffect(() => {
    if (!previewOpen) {
      window.setTimeout(() => lastPreviewFocusRef.current?.focus?.(), 0);
      return;
    }

    lastPreviewFocusRef.current = document.activeElement as HTMLElement | null;

    window.setTimeout(() => {
      const root = previewRootRef.current;
      if (!root) return;

      const focusables = getFocusable(root);
      focusables[0]?.focus();
    }, 0);
  }, [previewOpen]);

  /**
   * ===== 글로벌 keydown 리스너는 “1개만” =====
   * - 우선순위: Decision > Preview
   * - Escape: busy면 무시
   * - Tab: 최상위 오버레이 root에서만 focus trap
   */
  useEffect(() => {
    if (!isAnyOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // 처리 중에는 닫기/포커스 이동을 제한(실무 안전)
      if (isBusy) return;

      const decisionOpen = decisionModal.open;
      const previewIsOpen = previewOpen;

      const activeRoot =
        decisionOpen ? decisionRootRef.current : previewIsOpen ? previewRootRef.current : null;

      if (e.key === "Escape") {
        e.preventDefault();
        if (decisionOpen) onCloseDecisionEv();
        else if (previewIsOpen) onClosePreviewEv();
        return;
      }

      if (e.key === "Enter") {
        // 승인 모달에서 Enter → 승인 (UX 향상: 기본 버튼 트리거)
        // 반려 모달은 textarea Enter를 막지 않음(줄바꿈 필요)
        if (decisionOpen && decisionModal.kind === "approve") {
          // 버튼 포커스가 아닌 상황에서도 동작해야 하므로 여기서 처리
          e.preventDefault();
          onApproveEv();
        }
        return;
      }

      if (e.key !== "Tab") return;
      if (!activeRoot) return;

      const focusables = getFocusable(activeRoot);
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (!active || active === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    isAnyOpen,
    isBusy,
    decisionModal.open,
    decisionModal.kind,
    previewOpen,
    onCloseDecisionEv,
    onClosePreviewEv,
    onApproveEv,
  ]);

  return (
    <>
      {/* Decision Modal */}
      {decisionModal.open && (
        <div
          className="cb-reviewer-modal-overlay"
          role="presentation"
          onMouseDown={(e) => {
            if (isBusy) return;
            if (e.target === e.currentTarget) onCloseDecisionEv();
          }}
        >
          <div
            className="cb-reviewer-modal"
            ref={decisionRootRef}
            role="dialog"
            aria-modal="true"
            aria-busy={isBusy}
            aria-labelledby={decisionModal.kind === "approve" ? approveTitleId : rejectTitleId}
            aria-describedby={decisionModal.kind === "approve" ? approveDescId : rejectDescId}
          >
            {decisionModal.kind === "approve" ? (
              <>
                <div id={approveTitleId} className="cb-reviewer-modal-title">
                  승인 확인
                </div>
                <div id={approveDescId} className="cb-reviewer-modal-desc">
                  {decisionModal.message}
                </div>
                <div className="cb-reviewer-modal-actions">
                  <button
                    type="button"
                    className="cb-reviewer-ghost-btn"
                    onClick={onCloseDecisionEv}
                    disabled={isBusy}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="cb-reviewer-primary-btn"
                    onClick={onApproveEv}
                    disabled={!canApprove || isBusy}
                  >
                    {approveProcessing ? "승인 처리 중…" : "승인하기"}
                  </button>
                </div>
              </>
            ) : (
              <RejectModalBody
                rejectTitleId={rejectTitleId}
                rejectDescId={rejectDescId}
                initialReason={decisionModal.reason ?? ""}
                error={decisionModal.error}
                isBusy={isBusy}
                rejectProcessing={rejectProcessing}
                onCloseDecision={onCloseDecisionEv}
                onReject={onRejectEv}
              />
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewOpen && previewItem && (
        <div
          className="cb-reviewer-modal-overlay cb-reviewer-modal-overlay--preview"
          role="presentation"
          onMouseDown={(e) => {
            if (isBusy) return;
            if (e.target === e.currentTarget) onClosePreviewEv();
          }}
        >
          <div
            className="cb-reviewer-preview-modal"
            ref={previewRootRef}
            role="dialog"
            aria-modal="true"
            aria-busy={isBusy}
            aria-labelledby={previewTitleId}
            aria-describedby={previewDescId}
          >
            <div className="cb-reviewer-preview-head">
              <div id={previewTitleId} className="cb-reviewer-preview-title">
                미리보기 확대
              </div>
              <button
                type="button"
                className="cb-reviewer-close-btn"
                onClick={onClosePreviewEv}
                aria-label="close preview"
                disabled={isBusy}
                title={isBusy ? "처리 중에는 닫을 수 없습니다." : undefined}
              >
                ✕
              </button>
            </div>

            <div className="cb-reviewer-preview-body">
              {previewItem.contentType === "VIDEO" ? (
                <div className="cb-reviewer-preview-media">
                  <video className="cb-reviewer-preview-video" src={previewItem.videoUrl} controls />
                </div>
              ) : (
                <div className="cb-reviewer-preview-doc">
                  <div className="cb-reviewer-doc-preview-title">{previewItem.title}</div>
                  <div className="cb-reviewer-doc-preview-body">
                    {previewItem.policyExcerpt ?? "(미리보기 텍스트가 없습니다)"}
                  </div>
                </div>
              )}
            </div>

            <div className="cb-reviewer-preview-foot">
              <span id={previewDescId} className="cb-reviewer-muted">
                {previewItem.department} · 제작자 {previewItem.creatorName} · 버전 {previewItem.version}
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewerOverlays;
