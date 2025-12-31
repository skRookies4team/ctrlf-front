import React, { useState } from "react";
import type { PiiReport } from "../adminDashboardTypes";

interface PiiReportCardProps {
  report: PiiReport;
  /**
   * 카드 상단에 "어떤 기간/부서/조건 기준 요약인지" 한 줄로 보여줄 문장
   */
  contextSummary: string;
}

const PiiReportCard: React.FC<PiiReportCardProps> = ({
  report,
  contextSummary,
}) => {
  const [showMasked, setShowMasked] = useState(false);

  const hasMaskedText = !!report.maskedText && report.riskLevel !== "none";

  let badgeLabel = "";
  let badgeClass = "";

  switch (report.riskLevel) {
    case "none":
      badgeLabel = "위험 없음";
      badgeClass = "cb-admin-pii-badge--safe";
      break;
    case "warning":
      badgeLabel = "주의";
      badgeClass = "cb-admin-pii-badge--warning";
      break;
    case "high":
      badgeLabel = "고위험";
      badgeClass = "cb-admin-pii-badge--danger";
      break;
  }

  return (
    <section className="cb-admin-section cb-admin-section--pii-report">
      <div className="cb-admin-pii-header">
        <div className="cb-admin-pii-header-main">
          <h3 className="cb-admin-section-title">PII 점검 결과</h3>
          <span className="cb-admin-section-sub">{contextSummary}</span>
          <span className="cb-admin-section-sub cb-admin-section-sub--muted">
            위 조건에 해당하는 요청·응답 로그를 기준으로 개인정보 탐지 위험도를
            요약합니다.
          </span>
        </div>

        <div className="cb-admin-pii-header-right">
          <span className={`cb-admin-pii-badge ${badgeClass}`}>
            {badgeLabel}
          </span>
        </div>
      </div>

      <div className="cb-admin-pii-block">
        {report.summaryLines.map((line, idx) => (
          <p key={idx} className="cb-admin-pii-summary-line">
            {line}
          </p>
        ))}
      </div>

      <div className="cb-admin-pii-block">
        <h4 className="cb-admin-pii-block-title">탐지된 개인정보 항목</h4>
        {report.detectedItems.length === 0 ? (
          <p className="cb-admin-pii-empty">탐지된 개인정보 항목 없음.</p>
        ) : (
          <ul className="cb-admin-pii-list">
            {report.detectedItems.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="cb-admin-pii-block">
        <h4 className="cb-admin-pii-block-title">권장 조치</h4>
        <ol className="cb-admin-pii-actions">
          {report.recommendedActions.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ol>
      </div>

      <div className="cb-admin-pii-block cb-admin-pii-block--mask">
        <button
          type="button"
          className="cb-admin-ghost-btn cb-admin-pii-mask-toggle"
          disabled={!hasMaskedText}
          onClick={() => hasMaskedText && setShowMasked((prev) => !prev)}
        >
          {showMasked ? "마스킹된 텍스트 숨기기" : "마스킹된 텍스트 보기"}
        </button>

        {!hasMaskedText && (
          <p className="cb-admin-pii-hint">
            탐지된 개인정보가 없거나, 아직 마스킹된 텍스트가 생성되지
            않았습니다.
          </p>
        )}

        {hasMaskedText && showMasked && (
          <div className="cb-admin-pii-masked-text">
            <pre>{report.maskedText}</pre>
          </div>
        )}
      </div>

      <div className="cb-admin-pii-meta">
        <span>분석 모델: {report.modelName}</span>
        <span>분석 시간: {report.analyzedAt}</span>
        <span>분석 ID: {report.traceId}</span>
      </div>

      <p className="cb-admin-pii-disclaimer">
        ※ 로그 내 개인정보 여부는 AI 기반 자동 탐지 결과이며, 일부 누락이나
        오탐이 있을 수 있습니다. 민감도가 높은 사례는 반드시 보안 담당자의 추가
        검토를 거쳐 주세요.
      </p>
    </section>
  );
};

export default PiiReportCard;

