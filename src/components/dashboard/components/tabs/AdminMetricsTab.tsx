import React, { useCallback, useEffect, useState } from "react";
import AdminFilterBar from "../../AdminFilterBar";
import type { CommonFilterState } from "../../adminFilterTypes";
import { PERIOD_OPTIONS, DEPARTMENT_OPTIONS } from "../../adminDashboardMocks";
import type {
  PeriodFilter,
  MetricItem,
  PiiTrendPoint,
  LatencyBucket,
  ModelLatency,
} from "../../adminDashboardTypes";
import { getSecurityMetrics, getPerformanceMetrics } from "../../api/metricApi";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [securityMetrics, setSecurityMetrics] = useState<MetricItem[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<MetricItem[]>([]);
  const [piiTrend, setPiiTrend] = useState<PiiTrendPoint[]>([]);
  const [latencyBuckets, setLatencyBuckets] = useState<LatencyBucket[]>([]);
  const [modelLatency, setModelLatency] = useState<ModelLatency[]>([]);

  const filterValue: CommonFilterState = {
    period,
    departmentId: selectedDept,
  };

  const handleFilterChange = (next: CommonFilterState) => {
    onFilterChange(next);
  };

  // API 호출 함수
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const department = selectedDept === "ALL" ? undefined : selectedDept;

      // 병렬로 모든 API 호출
      const [securityRes, performanceRes] = await Promise.all([
        getSecurityMetrics(period, department),
        getPerformanceMetrics(period, department),
      ]);

      // 보안 지표 변환
      setSecurityMetrics([
        {
          id: "pii-block",
          label: "PII 차단 횟수",
          value: `${securityRes.piiBlockCount}건`,
          description: "주민등록번호 / 계좌번호 / 카드번호 등 자동 차단",
        },
        {
          id: "external-domain-block",
          label: "외부 도메인 차단",
          value: `${securityRes.externalDomainBlockCount}건`,
          description: "허용되지 않은 외부 링크 공유 시도",
        },
      ]);

      // PII 추이 데이터 변환
      setPiiTrend(
        securityRes.piiTrend.map((item) => ({
          label: item.bucketStart,
          inputRatio: item.inputDetectRate,
          outputRatio: item.outputDetectRate,
        }))
      );

      // 성능 지표 변환
      setQualityMetrics([
        {
          id: "dislike-rate",
          label: "답변 불만족 비율",
          value: `${(performanceRes.dislikeRate * 100).toFixed(1)}%`,
          description: "사용자가 '별로예요'를 선택한 비율",
        },
        {
          id: "repeat-rate",
          label: "재질문 비율",
          value: `${(performanceRes.repeatRate * 100).toFixed(1)}%`,
          description: performanceRes.repeatDefinition,
        },
        {
          id: "oos-count",
          label: "Out-of-scope 응답 수",
          value: `${performanceRes.oosCount}건`,
          description: "챗봇이 답변 불가로 응답한 횟수",
        },
      ]);

      // 응답 시간 분포 데이터 변환
      setLatencyBuckets(
        performanceRes.latencyHistogram.map((item) => ({
          label: item.range,
          count: item.count,
        }))
      );

      // 모델별 평균 지연시간 데이터 변환
      setModelLatency(
        performanceRes.modelLatency.map((item, index) => ({
          id: `model-${index}`,
          modelLabel: item.model,
          avgMs: Math.round(item.avgLatencyMs),
        }))
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "데이터를 불러오는 중 오류가 발생했습니다."
      );
      console.error("Failed to fetch metrics data:", err);
    } finally {
      setLoading(false);
    }
  }, [period, selectedDept]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxPiiRatio = Math.max(
    ...piiTrend.map((row) => Math.max(row.inputRatio, row.outputRatio)),
    1
  );

  const maxLatencyCount = Math.max(...latencyBuckets.map((b) => b.count), 1);

  const periodLabel = PERIOD_OPTIONS.find((p) => p.id === period)?.label ?? "";
  const onRefresh = () => {
    fetchData();
  };

  if (loading) {
    return (
      <div className="cb-admin-tab-panel">
        <div style={{ padding: "2rem", textAlign: "center" }}>
          데이터를 불러오는 중...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cb-admin-tab-panel">
        <div style={{ padding: "2rem", textAlign: "center", color: "red" }}>
          오류: {error}
        </div>
      </div>
    );
  }

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
            {securityMetrics.map((m) => (
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
            {qualityMetrics.map((m) => (
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
