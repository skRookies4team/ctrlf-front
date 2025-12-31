import React from "react";
import AdminFilterBar from "../../AdminFilterBar";
import type { CommonFilterState } from "../../adminFilterTypes";
import KpiRow from "../KpiRow";
import {
  DEPARTMENT_OPTIONS,
  CHATBOT_PRIMARY_KPIS_BY_PERIOD,
  CHATBOT_SECONDARY_KPIS_BY_PERIOD,
  CHATBOT_VOLUME_BY_PERIOD,
  CHATBOT_DOMAIN_SHARE_BY_PERIOD,
  CHATBOT_ROUTE_SHARE_BY_PERIOD,
  POPULAR_KEYWORDS_BY_PERIOD,
} from "../../adminDashboardMocks";
import type { PeriodFilter } from "../../adminDashboardTypes";

interface AdminChatbotTabProps {
  period: PeriodFilter;
  selectedDept: string;
  onFilterChange: (filter: CommonFilterState) => void;
}

const AdminChatbotTab: React.FC<AdminChatbotTabProps> = ({
  period,
  selectedDept,
  onFilterChange,
}) => {
  const filterValue: CommonFilterState = {
    period,
    departmentId: selectedDept,
  };

  const handleFilterChange = (next: CommonFilterState) => {
    onFilterChange(next);
  };

  // Type assertion to ensure period is a valid key for Record access
  const periodKey = period as keyof typeof CHATBOT_PRIMARY_KPIS_BY_PERIOD;
  const primaryKpis = CHATBOT_PRIMARY_KPIS_BY_PERIOD[periodKey];
  const secondaryKpis = CHATBOT_SECONDARY_KPIS_BY_PERIOD[periodKey];
  const volumeData = CHATBOT_VOLUME_BY_PERIOD[periodKey];
  const domainData = CHATBOT_DOMAIN_SHARE_BY_PERIOD[periodKey];
  const routeData = CHATBOT_ROUTE_SHARE_BY_PERIOD[periodKey];
  const keywordData = POPULAR_KEYWORDS_BY_PERIOD[periodKey];

  const max = Math.max(...volumeData.map((p) => p.count), 1);
  const total = volumeData.reduce((sum, p) => sum + p.count, 0);
  const avg = Math.round(total / volumeData.length);

  const hasErrorRatio = volumeData.some(
    (p) => typeof p.errorRatio === "number"
  );
  const avgErrorRatio =
    hasErrorRatio && volumeData.length > 0
      ? volumeData.reduce((sum, p) => sum + (p.errorRatio ?? 0), 0) /
        volumeData.length
      : null;

  const onRefresh = () => {};

  return (
    <div className="cb-admin-tab-panel">
      <AdminFilterBar
        mode="overview"
        value={filterValue}
        onChange={handleFilterChange}
        departments={DEPARTMENT_OPTIONS}
        onRefresh={onRefresh}
      />

      <KpiRow items={primaryKpis} />
      <KpiRow items={secondaryKpis} />

      <div className="cb-admin-section-row">
        <section className="cb-admin-section">
          <div className="cb-admin-section-header">
            <h3 className="cb-admin-section-title">질문 수 · 에러율 추이</h3>
            <span className="cb-admin-section-sub">
              기간별 질문량과 에러율을 함께 확인합니다.
            </span>
          </div>

          <div className="cb-admin-trend-summary">
            <div className="cb-admin-trend-pill">
              <span className="cb-admin-trend-label">기간 총 질문 수</span>
              <span className="cb-admin-trend-value">
                {total.toLocaleString()}건
              </span>
            </div>
            <div className="cb-admin-trend-pill">
              <span className="cb-admin-trend-label">구간당 평균</span>
              <span className="cb-admin-trend-value">
                {avg.toLocaleString()}건
              </span>
            </div>
            {avgErrorRatio !== null && (
              <div className="cb-admin-trend-pill">
                <span className="cb-admin-trend-label">평균 에러율</span>
                <span className="cb-admin-trend-value">
                  {(avgErrorRatio * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          <div className="cb-admin-bar-chart">
            {volumeData.map((point) => {
              const ratio = point.count / max;
              const widthPercent = 40 + ratio * 60; // 40% ~ 100%
              const width = `${Math.round(widthPercent)}%`;
              const errorRatioPercent =
                typeof point.errorRatio === "number"
                  ? (point.errorRatio * 100).toFixed(1)
                  : null;

              return (
                <div key={point.label} className="cb-admin-bar-row">
                  <span className="cb-admin-bar-label">{point.label}</span>
                  <div className="cb-admin-bar-track">
                    <div className="cb-admin-bar-fill" style={{ width }} />
                  </div>
                  <span className="cb-admin-bar-value">
                    {point.count.toLocaleString()}건
                    {errorRatioPercent && (
                      <span className="cb-admin-bar-subvalue">
                        {" · 에러율 "}
                        {errorRatioPercent}%
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="cb-admin-section">
          <div className="cb-admin-section-header">
            <h3 className="cb-admin-section-title">도메인별 질문 비율</h3>
            <span className="cb-admin-section-sub">
              규정 / FAQ / 교육 / 퀴즈 / 기타 비중
            </span>
          </div>
          <div className="cb-admin-domain-list">
            {domainData.map((item) => (
              <div key={item.id} className="cb-admin-domain-item">
                <div className="cb-admin-domain-top">
                  <span className="cb-admin-domain-label">
                    {item.domainLabel}
                  </span>
                  <span className="cb-admin-domain-ratio">{item.ratio}%</span>
                </div>
                <div className="cb-admin-domain-track">
                  <div
                    className="cb-admin-domain-fill"
                    style={{ width: `${item.ratio}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="cb-admin-section">
        <div className="cb-admin-section-header">
          <h3 className="cb-admin-section-title">라우트별 질문 비율</h3>
          <span className="cb-admin-section-sub">
            RAG / LLM / Incident / FAQ 템플릿 등 라우팅 경로 기준 비중입니다.
          </span>
        </div>
        <div className="cb-admin-domain-list">
          {routeData.map((item) => (
            <div key={item.id} className="cb-admin-domain-item">
              <div className="cb-admin-domain-top">
                <span className="cb-admin-domain-label">{item.routeLabel}</span>
                <span className="cb-admin-domain-ratio">{item.ratio}%</span>
              </div>
              <div className="cb-admin-domain-track">
                <div
                  className="cb-admin-domain-fill"
                  style={{ width: `${item.ratio}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="cb-admin-section">
        <div className="cb-admin-section-header">
          <h3 className="cb-admin-section-title">
            최근 많이 질문된 키워드 Top 5
          </h3>
        </div>
        <ul className="cb-admin-keyword-list">
          {keywordData.map((item) => (
            <li key={item.keyword} className="cb-admin-keyword-item">
              <span className="cb-admin-keyword-label">{item.keyword}</span>
              <span className="cb-admin-keyword-count">
                {item.count.toLocaleString()}회
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

export default AdminChatbotTab;
