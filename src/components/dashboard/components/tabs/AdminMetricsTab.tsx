import React from "react";
import AdminFilterBar from "../../AdminFilterBar";
import type { CommonFilterState } from "../../adminFilterTypes";
import {
  PERIOD_OPTIONS,
  DEPARTMENT_OPTIONS,
  PII_TREND_BY_PERIOD,
  LATENCY_BUCKET_BY_PERIOD,
  MODEL_LATENCY_BY_PERIOD,
  securityMetricsMock,
  qualityMetricsMock,
} from "../../adminDashboardMocks";
import type { PeriodFilter } from "../../adminDashboardTypes";

interface AdminMetricsTabProps {
  period: PeriodFilter;
  selectedDept: string;
  onFilterChange: (filter: CommonFilterState) => void;
}

const AdminMetricsTab: React.FC<AdminMetricsTabProps> = ({
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

  const periodKeyForMetrics = period as keyof typeof PII_TREND_BY_PERIOD;
  const piiTrend = PII_TREND_BY_PERIOD[periodKeyForMetrics];
  const latencyBuckets = LATENCY_BUCKET_BY_PERIOD[periodKeyForMetrics];
  const modelLatency = MODEL_LATENCY_BY_PERIOD[periodKeyForMetrics];

  const maxPiiRatio = Math.max(
    ...piiTrend.map((row) => Math.max(row.inputRatio, row.outputRatio)),
    1
  );

  const maxLatencyCount = Math.max(...latencyBuckets.map((b) => b.count), 1);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.id === period)?.label ?? "";
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

      <div className="cb-admin-section-row">
        <section className="cb-admin-section cb-admin-section--metric">
          <div className="cb-admin-section-header">
            <h3 className="cb-admin-section-title">보안 · PII 지표</h3>
            <span className="cb-admin-section-sub">
              PII 감지 및 보안 차단 이벤트를 요약해서 확인합니다.
            </span>
          </div>

          <ul className="cb-admin-metric-list">
            {securityMetricsMock.map((m) => (
              <li key={m.id} className="cb-admin-metric-item">
                <div className="cb-admin-metric-main">
                  <span className="cb-admin-metric-label">{m.label}</span>
                  <span className="cb-admin-metric-value">{m.value}</span>
                </div>
                {m.description && (
                  <div className="cb-admin-metric-desc">{m.description}</div>
                )}
              </li>
            ))}
          </ul>

          <div className="cb-admin-metric-chart">
            <div className="cb-admin-metric-chart-header">
              <div className="cb-admin-metric-chart-title">PII 감지 추이</div>
              <div className="cb-admin-metric-chart-legend">
                <span className="cb-admin-metric-legend-dot cb-admin-metric-legend-dot--input" />
                <span>입력 PII 비율</span>
                <span className="cb-admin-metric-legend-separator">·</span>
                <span className="cb-admin-metric-legend-dot cb-admin-metric-legend-dot--output" />
                <span>출력 PII 비율</span>
              </div>
            </div>

            <div className="cb-admin-metric-chart-body cb-admin-metric-chart-body--pii">
              {piiTrend.map((point) => {
                const inputWidth = `${Math.round(
                  (point.inputRatio / maxPiiRatio) * 100
                )}%`;
                const outputWidth = `${Math.round(
                  (point.outputRatio / maxPiiRatio) * 100
                )}%`;

                return (
                  <div key={point.label} className="cb-admin-metric-chart-row">
                    <div className="cb-admin-metric-chart-row-label">
                      {point.label}
                    </div>
                    <div className="cb-admin-metric-chart-row-bars">
                      <div className="cb-admin-metric-chart-track">
                        <div
                          className="cb-admin-metric-chart-bar cb-admin-metric-chart-bar--input"
                          style={{ width: inputWidth }}
                        />
                      </div>
                      <div className="cb-admin-metric-chart-track">
                        <div
                          className="cb-admin-metric-chart-bar cb-admin-metric-chart-bar--output"
                          style={{ width: outputWidth }}
                        />
                      </div>
                    </div>
                    <div className="cb-admin-metric-chart-row-value">
                      {point.inputRatio.toFixed(1)}% /{" "}
                      {point.outputRatio.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cb-admin-metric-chart-footer">
              <span className="cb-admin-metric-chart-footer-label">
                기간 기준: {periodLabel}
              </span>
            </div>
          </div>
        </section>

        <section className="cb-admin-section cb-admin-section--metric">
          <div className="cb-admin-section-header">
            <h3 className="cb-admin-section-title">성능 · 장애 지표</h3>
            <span className="cb-admin-section-sub">
              응답 시간 분포와 에러 현황을 모니터링합니다.
            </span>
          </div>

          <ul className="cb-admin-metric-list">
            {qualityMetricsMock.map((m) => (
              <li key={m.id} className="cb-admin-metric-item">
                <div className="cb-admin-metric-main">
                  <span className="cb-admin-metric-label">{m.label}</span>
                  <span className="cb-admin-metric-value">{m.value}</span>
                </div>
                {m.description && (
                  <div className="cb-admin-metric-desc">{m.description}</div>
                )}
              </li>
            ))}
          </ul>

          <div className="cb-admin-metric-chart">
            <div className="cb-admin-metric-chart-header">
              <div className="cb-admin-metric-chart-title">응답 시간 분포</div>
              <div className="cb-admin-metric-chart-caption">
                {periodLabel} 기준
              </div>
            </div>

            <div className="cb-admin-metric-chart-body">
              {latencyBuckets.map((bucket) => {
                const width = `${Math.round(
                  (bucket.count / maxLatencyCount) * 100
                )}%`;
                return (
                  <div key={bucket.label} className="cb-admin-metric-chart-row">
                    <div className="cb-admin-metric-chart-row-label">
                      {bucket.label}
                    </div>
                    <div className="cb-admin-metric-chart-track">
                      <div
                        className="cb-admin-metric-chart-bar cb-admin-metric-chart-bar--latency"
                        style={{ width }}
                      />
                    </div>
                    <div className="cb-admin-metric-chart-row-value">
                      {bucket.count.toLocaleString()}건
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="cb-admin-metric-chart-footer">
              <span className="cb-admin-metric-chart-footer-label">
                모델별 평균 응답 시간
              </span>
              <div className="cb-admin-metric-pill-row">
                {modelLatency.map((model) => (
                  <span key={model.id} className="cb-admin-metric-pill">
                    {model.modelLabel}
                    <span className="cb-admin-metric-pill-value">
                      {model.avgMs}ms
                    </span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AdminMetricsTab;
