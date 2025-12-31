import React, { useState } from "react";
import AdminFilterBar from "../../AdminFilterBar";
import AdminRagGapView from "../../AdminRagGapView";
import PiiReportCard from "../PiiReportCard";
import type { CommonFilterState } from "../../adminFilterTypes";
import type { PeriodFilter, PiiRiskLevel } from "../../adminDashboardTypes";
import {
  PERIOD_OPTIONS,
  DEPARTMENT_OPTIONS,
  LOG_DOMAIN_OPTIONS,
  LOG_ROUTE_OPTIONS,
  LOG_MODEL_OPTIONS,
  LOG_LIST_MOCK,
  PII_REPORT_NONE,
  PII_REPORT_WARNING,
  PII_REPORT_HIGH,
} from "../../adminDashboardMocks";

interface AdminLogsTabProps {
  period: PeriodFilter;
  selectedDept: string;
  selectedDeptLabel: string;
  logDomainFilter: string;
  logRouteFilter: string;
  logModelFilter: string;
  logOnlyError: boolean;
  logHasPiiOnly: boolean;
  onFilterChange: (filter: CommonFilterState) => void;
}

const AdminLogsTab: React.FC<AdminLogsTabProps> = ({
  period,
  selectedDept,
  selectedDeptLabel,
  logDomainFilter,
  logRouteFilter,
  logModelFilter,
  logOnlyError,
  logHasPiiOnly,
  onFilterChange,
}) => {
  const [showRagGapView, setShowRagGapView] = useState<boolean>(false);

  const filterValue: CommonFilterState = {
    period,
    departmentId: selectedDept,
    domainId: logDomainFilter,
    routeId: logRouteFilter,
    modelId: logModelFilter,
    onlyError: logOnlyError,
    hasPiiOnly: logHasPiiOnly,
  };

  const handleFilterChange = (next: CommonFilterState) => {
    onFilterChange(next);
  };

  const selectedDeptNameForLogs =
    selectedDept === "ALL" ? null : selectedDeptLabel;

  const filteredItems = LOG_LIST_MOCK.filter((item) => {
    if (
      selectedDeptNameForLogs &&
      item.department !== selectedDeptNameForLogs
    ) {
      return false;
    }
    if (logDomainFilter !== "ALL" && item.domain !== logDomainFilter) {
      return false;
    }
    if (logRouteFilter !== "ALL" && item.route !== logRouteFilter) {
      return false;
    }
    if (logModelFilter !== "ALL" && item.modelName !== logModelFilter) {
      return false;
    }
    if (logOnlyError && !item.errorCode) {
      return false;
    }
    if (logHasPiiOnly && !item.hasPiiInput && !item.hasPiiOutput) {
      return false;
    }
    return true;
  });

  const totalCount = filteredItems.length;
  const errorCount = filteredItems.filter((i) => i.errorCode).length;

  const piiInputCount = filteredItems.filter((i) => i.hasPiiInput).length;
  const piiOutputCount = filteredItems.filter((i) => i.hasPiiOutput).length;
  const piiCount = filteredItems.filter(
    (i) => i.hasPiiInput || i.hasPiiOutput
  ).length;

  const errorRatioInLogs = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;
  const piiRatioInLogs = totalCount > 0 ? (piiCount / totalCount) * 100 : 0;

  const inputRatioInLogs =
    totalCount > 0 ? (piiInputCount / totalCount) * 100 : 0;
  const outputRatioInLogs =
    totalCount > 0 ? (piiOutputCount / totalCount) * 100 : 0;

  let riskLevel: PiiRiskLevel = "none";
  if (totalCount > 0 && piiCount > 0) {
    if (outputRatioInLogs >= 5 || piiOutputCount >= 3) {
      riskLevel = "high";
    } else if (
      outputRatioInLogs === 0 &&
      (inputRatioInLogs >= 20 || piiInputCount >= 15)
    ) {
      riskLevel = "high";
    } else {
      riskLevel = "warning";
    }
  }

  let activePiiReport;
  switch (riskLevel) {
    case "none":
      activePiiReport = PII_REPORT_NONE;
      break;
    case "high":
      activePiiReport = PII_REPORT_HIGH;
      break;
    case "warning":
    default:
      activePiiReport = PII_REPORT_WARNING;
      break;
  }

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.id === period)?.label ?? "전체 기간";
  const logDomainLabel =
    LOG_DOMAIN_OPTIONS.find((d) => d.id === logDomainFilter)?.label ??
    "전체 도메인";
  const logRouteLabel =
    LOG_ROUTE_OPTIONS.find((r) => r.id === logRouteFilter)?.label ??
    "전체 라우트";
  const logModelLabel =
    LOG_MODEL_OPTIONS.find((m) => m.id === logModelFilter)?.label ??
    "전체 모델";

  const contextParts: string[] = [
    `기간 ${periodLabel}`,
    `부서 ${selectedDeptLabel}`,
    `도메인 ${logDomainLabel}`,
    `라우트 ${logRouteLabel}`,
    `모델 ${logModelLabel}`,
  ];

  if (logOnlyError) contextParts.push("에러 로그만");
  if (logHasPiiOnly) contextParts.push("PII 포함 로그만");

  const piiContextSummary = contextParts.join(" · ");

  const onRefresh = () => {};

  return (
    <div className="cb-admin-tab-panel cb-admin-tab-panel--logs">
      <AdminFilterBar
        mode="logs"
        value={filterValue}
        onChange={handleFilterChange}
        departments={DEPARTMENT_OPTIONS}
        domainOptions={LOG_DOMAIN_OPTIONS}
        routeOptions={LOG_ROUTE_OPTIONS}
        modelOptions={LOG_MODEL_OPTIONS}
        onRefresh={onRefresh}
      />

      <section className="cb-admin-section cb-admin-section--logs-drilldown">
        <div className="cb-admin-section-header cb-admin-section-header--logs">
          <div className="cb-admin-section-header-main">
            <h3 className="cb-admin-section-title">
              {showRagGapView ? "RAG 갭 분석" : "세부 로그 Drilldown"}
            </h3>
            <span className="cb-admin-section-sub">
              {showRagGapView
                ? "RAG 검색 실패·갭 후보를 모아서 어떤 규정/교육 문서가 추가로 필요할지 확인합니다."
                : "시간 / 도메인 / 라우트 / 모델 / PII(입력/출력) / 에러 기준으로 필터링해서 턴 단위 로그를 확인합니다."}
            </span>
          </div>
          <button
            type="button"
            className="cb-admin-ghost-btn"
            onClick={() => setShowRagGapView((prev) => !prev)}
          >
            {showRagGapView ? "전체 로그 보기" : "RAG 갭 분석"}
          </button>
        </div>

        {showRagGapView ? (
          <AdminRagGapView filterValue={filterValue} />
        ) : (
          <>
            <PiiReportCard
              report={activePiiReport}
              contextSummary={piiContextSummary}
            />

            <div className="cb-admin-trend-summary">
              <div className="cb-admin-trend-pill">
                <span className="cb-admin-trend-label">총 로그</span>
                <span className="cb-admin-trend-value">
                  {totalCount.toLocaleString()}건
                </span>
              </div>
              <div className="cb-admin-trend-pill">
                <span className="cb-admin-trend-label">에러 로그</span>
                <span className="cb-admin-trend-value">
                  {errorCount.toLocaleString()}건
                  {totalCount > 0 && ` (${errorRatioInLogs.toFixed(1)}%)`}
                </span>
              </div>
              <div className="cb-admin-trend-pill">
                <span className="cb-admin-trend-label">PII 포함</span>
                <span className="cb-admin-trend-value">
                  {piiCount.toLocaleString()}건
                  {totalCount > 0 && ` (${piiRatioInLogs.toFixed(1)}%)`}
                </span>
              </div>
            </div>

            <div className="cb-admin-table-wrapper cb-admin-table-wrapper--logs">
              <table className="cb-admin-table cb-admin-table--logs">
                <thead>
                  <tr>
                    <th>시간</th>
                    <th>user_id</th>
                    <th>user_role</th>
                    <th>부서</th>
                    <th>domain</th>
                    <th>route</th>
                    <th>model</th>
                    <th>PII (입력/출력)</th>
                    <th>latency(ms)</th>
                    <th>error_code</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={10} className="cb-admin-table-empty">
                        조건에 해당하는 로그가 없습니다.
                      </td>
                    </tr>
                  )}
                  {filteredItems.map((item) => {
                    const hasError = !!item.errorCode;
                    const hasPii = item.hasPiiInput || item.hasPiiOutput;

                    return (
                      <tr
                        key={item.id}
                        className={hasError ? "cb-admin-log-row--error" : ""}
                      >
                        <td>{item.createdAt}</td>
                        <td>{item.userId}</td>
                        <td>{item.userRole}</td>
                        <td>{item.department}</td>
                        <td>{item.domain}</td>
                        <td>{item.route}</td>
                        <td>{item.modelName}</td>
                        <td>
                          {hasPii ? (
                            <span className="cb-admin-badge cb-admin-badge--pii">
                              {item.hasPiiInput && "입력"}
                              {item.hasPiiInput && item.hasPiiOutput && " / "}
                              {item.hasPiiOutput && "출력"}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td>{item.latencyMsTotal.toLocaleString()}</td>
                        <td>
                          {hasError ? (
                            <span className="cb-admin-log-error-code">
                              {item.errorCode}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default AdminLogsTab;
