import React, { useCallback, useEffect, useState } from "react";
import AdminFilterBar from "../../AdminFilterBar";
import type { CommonFilterState } from "../../adminFilterTypes";
import KpiRow from "../KpiRow";
import { DEPARTMENT_OPTIONS } from "../../adminDashboardMocks";
import type {
  PeriodFilter,
  KpiCard,
  ChatbotVolumePoint,
  ChatbotDomainShare,
  ChatbotRouteShare,
  PopularKeyword,
} from "../../adminDashboardTypes";
import {
  getChatSummary,
  getRouteRatio,
  getTopKeywords,
  getQuestionTrend,
  getDomainRatio,
} from "../../api/chatApi";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    todayQuestionCount: number;
    averageResponseTime: number;
    piiDetectionRate: number;
    errorRate: number;
    last7DaysQuestionCount: number;
    activeUserCount: number;
    satisfactionRate: number;
    ragUsageRate: number;
  } | null>(null);
  const [volumeData, setVolumeData] = useState<ChatbotVolumePoint[]>([]);
  const [domainData, setDomainData] = useState<ChatbotDomainShare[]>([]);
  const [routeData, setRouteData] = useState<ChatbotRouteShare[]>([]);
  const [keywordData, setKeywordData] = useState<PopularKeyword[]>([]);
  const [trendSummary, setTrendSummary] = useState<{
    totalQuestionCount: number;
    averageQuestionCountPerPeriod: number;
    averageErrorRate: number;
  } | null>(null);

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
      const [summaryRes, routeRes, keywordRes, trendRes, domainRes] =
        await Promise.all([
          getChatSummary(period, department),
          getRouteRatio(period, department),
          getTopKeywords(period, department),
          getQuestionTrend(period, department),
          getDomainRatio(period, department),
        ]);

      setSummary(summaryRes);

      // 질문 수 · 에러율 추이 요약 정보 저장
      setTrendSummary({
        totalQuestionCount: trendRes.totalQuestionCount,
        averageQuestionCountPerPeriod: trendRes.averageQuestionCountPerPeriod,
        averageErrorRate: trendRes.averageErrorRate,
      });

      // 질문 수 · 에러율 추이 데이터 변환
      setVolumeData(
        trendRes.items.map((item) => ({
          label: item.periodLabel,
          count: item.questionCount,
          errorRatio: item.errorRate / 100, // 백분율을 소수로 변환
        }))
      );

      // 도메인별 질문 비율 데이터 변환
      setDomainData(
        domainRes.items.map((item) => ({
          id: item.domain.toLowerCase(),
          domainLabel: item.domainName,
          ratio: item.ratio,
        }))
      );

      // 라우트별 질문 비율 데이터 변환
      setRouteData(
        routeRes.items.map((item) => ({
          id: `route_${item.routeType.toLowerCase()}`,
          routeLabel: item.routeName,
          ratio: item.ratio,
        }))
      );

      // 키워드 Top 5 데이터 변환
      setKeywordData(
        keywordRes.items.map((item) => ({
          keyword: item.keyword,
          count: item.questionCount,
        }))
      );
    } catch (err) {
      console.error("[AdminChatbotTab] API 호출 실패:", err);
      setError(
        err instanceof Error ? err.message : "데이터를 불러오는데 실패했습니다."
      );
    } finally {
      setLoading(false);
    }
  }, [period, selectedDept]);

  // 필터 변경 시 데이터 재조회
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPI 데이터 생성
  const primaryKpis: KpiCard[] = summary
    ? [
        {
          id: "todayQuestions",
          label: "오늘 질문 수",
          value: `${summary.todayQuestionCount.toLocaleString()}건`,
        },
        {
          id: "avgLatency",
          label: "평균 응답 시간",
          value: `${summary.averageResponseTime}ms`,
        },
        {
          id: "piiRatio",
          label: "PII 감지 비율",
          value: `${summary.piiDetectionRate.toFixed(1)}%`,
        },
        {
          id: "errorRatio",
          label: "에러율",
          value: `${summary.errorRate.toFixed(1)}%`,
        },
      ]
    : [];

  const secondaryKpis: KpiCard[] = summary
    ? [
        {
          id: "weekQuestions",
          label: "최근 7일 질문 수",
          value: `${summary.last7DaysQuestionCount.toLocaleString()}건`,
          caption: `일평균 약 ${Math.round(
            summary.last7DaysQuestionCount / 7
          )}건`,
        },
        {
          id: "activeUsers",
          label: "활성 사용자 수",
          value: `${summary.activeUserCount}명`,
          caption: `최근 ${
            period === "7d" ? "7일" : period === "30d" ? "30일" : "90일"
          } 기준`,
        },
        {
          id: "satisfaction",
          label: "응답 만족도",
          value: `${summary.satisfactionRate.toFixed(1)}%`,
          caption: "피드백 기준",
        },
        {
          id: "ragUsage",
          label: "RAG 사용 비율",
          value: `${summary.ragUsageRate.toFixed(1)}%`,
          caption: "전체 질문 대비",
        },
      ]
    : [];

  const max = Math.max(...volumeData.map((p) => p.count), 1);
  const total = trendSummary
    ? trendSummary.totalQuestionCount
    : volumeData.reduce((sum, p) => sum + p.count, 0);
  const avg = trendSummary
    ? trendSummary.averageQuestionCountPerPeriod
    : Math.round(total / volumeData.length);
  const avgErrorRatio = trendSummary
    ? trendSummary.averageErrorRate / 100
    : volumeData.length > 0
    ? volumeData.reduce((sum, p) => sum + (p.errorRatio ?? 0), 0) /
      volumeData.length
    : null;

  return (
    <div className="cb-admin-tab-panel">
      <AdminFilterBar
        mode="overview"
        value={filterValue}
        onChange={handleFilterChange}
        departments={DEPARTMENT_OPTIONS}
        onRefresh={fetchData}
      />
      {loading && (
        <div style={{ padding: "20px", textAlign: "center" }}>
          데이터를 불러오는 중...
        </div>
      )}
      {error && (
        <div
          style={{
            padding: "20px",
            textAlign: "center",
            color: "#d32f2f",
            backgroundColor: "#ffebee",
            borderRadius: "4px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

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
