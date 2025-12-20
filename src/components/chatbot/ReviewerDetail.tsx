// src/components/chatbot/ReviewerDetail.tsx
import React from "react";
import type { DetailTabId } from "./useReviewerDeskController";
import type { ReviewWorkItem } from "./reviewerDeskTypes";
import { formatDateTime, formatDuration } from "./reviewerDeskMocks";

function cx(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

function statusLabel(s: ReviewWorkItem["status"]) {
  switch (s) {
    case "REVIEW_PENDING":
      return "검토 대기";
    case "APPROVED":
      return "승인됨";
    case "REJECTED":
      return "반려됨";
  }
}

function statusTone(s: ReviewWorkItem["status"]): "neutral" | "warn" | "danger" {
  switch (s) {
    case "REVIEW_PENDING":
      return "warn";
    case "APPROVED":
      return "neutral";
    case "REJECTED":
      return "danger";
  }
}

function categoryLabel(c: ReviewWorkItem["contentCategory"]) {
  switch (c) {
    case "MANDATORY":
      return "4대 의무교육";
    case "JOB":
      return "직무교육";
    case "POLICY":
      return "사규/정책";
    case "OTHER":
      return "기타";
  }
}

function renderStatusPill(s: ReviewWorkItem["status"]) {
  const tone = statusTone(s);
  return (
    <span className={cx("cb-reviewer-pill", `cb-reviewer-pill--${tone}`)}>
      {statusLabel(s)}
    </span>
  );
}

function renderCategoryPill(c: ReviewWorkItem["contentCategory"]) {
  return (
    <span className={cx("cb-reviewer-pill", "cb-reviewer-pill--neutral")}>
      {categoryLabel(c)}
    </span>
  );
}

function renderPiiPill(item: ReviewWorkItem["autoCheck"]) {
  const level = item.piiRiskLevel;
  const tone =
    level === "high" ? "danger" : level === "medium" ? "warn" : "neutral";
  const label =
    level === "high"
      ? "PII HIGH"
      : level === "medium"
        ? "PII MED"
        : level === "low"
          ? "PII LOW"
          : "PII NONE";
  return (
    <span className={cx("cb-reviewer-pill", `cb-reviewer-pill--${tone}`)}>
      {label}
    </span>
  );
}

function getVideoStage(it: ReviewWorkItem): 1 | 2 | null {
  if (it.contentType !== "VIDEO") return null;
  return it.videoUrl?.trim() ? 2 : 1;
}

function stageLabelShort(stage: 1 | 2) {
  return stage === 2 ? "2차" : "1차";
}

function stageLabelLong(stage: 1 | 2) {
  return stage === 2 ? "2차(최종)" : "1차(스크립트)";
}

export interface ReviewerDetailProps {
  isBusy: boolean;
  isOverlayOpen: boolean;

  detailTab: DetailTabId;
  setDetailTab: (t: DetailTabId) => void;

  selectedItem: ReviewWorkItem | null;

  notesById: Record<string, string>;
  setNotesById: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  onSaveNote: () => void;
  onOpenPreview: () => void;
}

const ReviewerDetail: React.FC<ReviewerDetailProps> = ({
  isBusy,
  isOverlayOpen,
  detailTab,
  setDetailTab,
  selectedItem,
  notesById,
  setNotesById,
  onSaveNote,
  onOpenPreview,
}) => {
  if (!selectedItem) {
    return (
      <div className="cb-reviewer-detail-empty">
        좌측 목록에서 검토할 항목을 선택하세요.
      </div>
    );
  }

  const stage = getVideoStage(selectedItem);
  const bannedCnt = selectedItem.autoCheck?.bannedWords?.length ?? 0;

  const piiFindings = selectedItem.autoCheck?.piiFindings ?? [];
  const bannedWords = selectedItem.autoCheck?.bannedWords ?? [];
  const qualityWarnings = selectedItem.autoCheck?.qualityWarnings ?? [];

  return (
    <>
      <div className="cb-reviewer-detail-header">
        <div className="cb-reviewer-detail-header-left">
          <div className="cb-reviewer-detail-title">{selectedItem.title}</div>
          <div className="cb-reviewer-detail-meta">
            <span className="cb-reviewer-detail-meta-chip">
              {selectedItem.department}
            </span>
            <span className="cb-reviewer-detail-meta-chip">
              제작자: <strong>{selectedItem.creatorName}</strong>
            </span>
            <span className="cb-reviewer-detail-meta-chip">
              제출: <strong>{formatDateTime(selectedItem.submittedAt)}</strong>
            </span>
            {typeof selectedItem.durationSec === "number" && (
              <span className="cb-reviewer-detail-meta-chip">
                길이: <strong>{formatDuration(selectedItem.durationSec)}</strong>
              </span>
            )}
            {selectedItem.lastUpdatedAt && (
              <span className="cb-reviewer-detail-meta-chip">
                업데이트: <strong>{formatDateTime(selectedItem.lastUpdatedAt)}</strong>
              </span>
            )}
          </div>
        </div>

        <div className="cb-reviewer-detail-header-right">
          {renderStatusPill(selectedItem.status)}
          {renderCategoryPill(selectedItem.contentCategory)}
          {renderPiiPill(selectedItem.autoCheck)}
          {stage && (
            <span
              className={cx("cb-reviewer-pill", "cb-reviewer-pill--neutral")}
              title={stageLabelLong(stage)}
            >
              {stageLabelShort(stage)}
            </span>
          )}
          {bannedCnt > 0 && (
            <span className={cx("cb-reviewer-pill", "cb-reviewer-pill--danger")}>
              금칙어 {bannedCnt}
            </span>
          )}
        </div>
      </div>

      <div className="cb-reviewer-detail-tabs">
        <button
          type="button"
          className={cx(
            "cb-reviewer-detail-tab",
            detailTab === "preview" && "cb-reviewer-detail-tab--active"
          )}
          onClick={() => setDetailTab("preview")}
          disabled={isOverlayOpen || isBusy}
        >
          미리보기
        </button>
        <button
          type="button"
          className={cx(
            "cb-reviewer-detail-tab",
            detailTab === "script" && "cb-reviewer-detail-tab--active"
          )}
          onClick={() => setDetailTab("script")}
          disabled={isOverlayOpen || isBusy}
        >
          스크립트
        </button>
        <button
          type="button"
          className={cx(
            "cb-reviewer-detail-tab",
            detailTab === "checks" && "cb-reviewer-detail-tab--active"
          )}
          onClick={() => setDetailTab("checks")}
          disabled={isOverlayOpen || isBusy}
        >
          자동 점검
        </button>
        <button
          type="button"
          className={cx(
            "cb-reviewer-detail-tab",
            detailTab === "audit" && "cb-reviewer-detail-tab--active"
          )}
          onClick={() => setDetailTab("audit")}
          disabled={isOverlayOpen || isBusy}
        >
          감사 이력
        </button>
      </div>

      <div className="cb-reviewer-detail-content">
        {detailTab === "preview" && (
          <div className="cb-reviewer-section">
            <div className="cb-reviewer-section-head">
              <div className="cb-reviewer-section-title">콘텐츠 미리보기</div>
              <div className="cb-reviewer-section-actions">
                <button
                  type="button"
                  className="cb-reviewer-mini-btn"
                  onClick={onOpenPreview}
                  disabled={isOverlayOpen || isBusy}
                >
                  확대 보기
                </button>
              </div>
            </div>

            {selectedItem.contentType === "VIDEO" ? (
              selectedItem.videoUrl && selectedItem.videoUrl.trim().length > 0 ? (
                <div className="cb-reviewer-media-wrap">
                  <video className="cb-reviewer-video" src={selectedItem.videoUrl} controls />
                </div>
              ) : (
                <div className="cb-reviewer-doc-preview">
                  <div className="cb-reviewer-doc-preview-title">1차(스크립트) 검토 단계</div>
                  <div className="cb-reviewer-doc-preview-body">
                    현재는 스크립트만 검토합니다. 1차 승인 후 제작자가 영상을 생성하면 2차 검토 요청이 올라옵니다.
                  </div>
                </div>
              )
            ) : (
              <div className="cb-reviewer-doc-preview">
                <div className="cb-reviewer-doc-preview-title">사규/정책 미리보기</div>
                <div className="cb-reviewer-doc-preview-body">
                  {selectedItem.policyExcerpt ?? "(미리보기 텍스트가 없습니다)"}
                </div>
              </div>
            )}

            <div className="cb-reviewer-section-footer">
              <span className="cb-reviewer-muted">
                버전 {selectedItem.version} · 생성 {formatDateTime(selectedItem.createdAt)}
              </span>
              {selectedItem.riskScore != null && (
                <span className="cb-reviewer-muted">
                  Risk Score {Math.round(selectedItem.riskScore)}
                </span>
              )}
            </div>
          </div>
        )}

        {detailTab === "script" && (
          <div className="cb-reviewer-section">
            <div className="cb-reviewer-section-title">스크립트</div>
            <pre className="cb-reviewer-script">
              {selectedItem.scriptText ??
                "(스크립트가 없습니다. 제작자가 스크립트를 포함해 제출했는지 확인하세요.)"}
            </pre>

            <div className="cb-reviewer-note">
              <div className="cb-reviewer-note-head">
                <div>
                  <strong>Reviewer Notes</strong>
                  <span className="cb-reviewer-note-sub">
                    (내부 메모 · 저장 시 감사 이력에 기록)
                  </span>
                </div>
                <button
                  type="button"
                  className="cb-reviewer-ghost-btn"
                  onClick={onSaveNote}
                  disabled={isOverlayOpen || isBusy || !(notesById[selectedItem.id] ?? "").trim()}
                >
                  메모 저장
                </button>
              </div>
              <textarea
                className="cb-reviewer-textarea"
                value={notesById[selectedItem.id] ?? ""}
                onChange={(e) =>
                  setNotesById((prev) => ({
                    ...prev,
                    [selectedItem.id]: e.target.value,
                  }))
                }
                placeholder="검토 시 발견한 리스크/수정 요청/승인 근거 등을 기록하세요."
                disabled={isOverlayOpen || isBusy}
              />
            </div>
          </div>
        )}

        {detailTab === "checks" && (
          <div className="cb-reviewer-section">
            <div className="cb-reviewer-section-title">자동 점검 결과</div>
            <div className="cb-reviewer-check-grid">
              <div className="cb-reviewer-check-card">
                <div className="cb-reviewer-check-title">개인정보(PII) 리스크</div>
                <div className="cb-reviewer-check-value">
                  {renderPiiPill(selectedItem.autoCheck)}
                </div>
                {piiFindings.length > 0 ? (
                  <ul className="cb-reviewer-check-list">
                    {piiFindings.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="cb-reviewer-muted">탐지된 항목 없음</div>
                )}
              </div>

              <div className="cb-reviewer-check-card">
                <div className="cb-reviewer-check-title">금칙어</div>
                {bannedWords.length > 0 ? (
                  <ul className="cb-reviewer-check-list">
                    {bannedWords.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="cb-reviewer-muted">탐지된 항목 없음</div>
                )}
              </div>

              <div className="cb-reviewer-check-card">
                <div className="cb-reviewer-check-title">품질 경고</div>
                {qualityWarnings.length > 0 ? (
                  <ul className="cb-reviewer-check-list">
                    {qualityWarnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="cb-reviewer-muted">경고 없음</div>
                )}
              </div>
            </div>
          </div>
        )}

        {detailTab === "audit" && (
          <div className="cb-reviewer-section">
            <div className="cb-reviewer-section-title">감사 이력</div>
            <div className="cb-reviewer-timeline">
              {[...selectedItem.audit]
                .sort((a, b) => (a.at > b.at ? -1 : 1))
                .map((a) => (
                  <div key={a.id} className="cb-reviewer-timeline-item">
                    <div className="cb-reviewer-timeline-dot" />
                    <div className="cb-reviewer-timeline-body">
                      <div className="cb-reviewer-timeline-row">
                        <strong className="cb-reviewer-timeline-action">{a.action}</strong>
                        <span className="cb-reviewer-timeline-meta">
                          {formatDateTime(a.at)} · {a.actor}
                        </span>
                      </div>
                      {a.detail && <div className="cb-reviewer-timeline-detail">{a.detail}</div>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ReviewerDetail;
