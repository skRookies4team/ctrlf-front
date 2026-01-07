import React, { useCallback, useEffect, useState } from "react";
import AdminFilterBar from "../../AdminFilterBar";
import type { CommonFilterState } from "../../adminFilterTypes";
import KpiRow from "../KpiRow";
import {
  DEPARTMENT_OPTIONS,
  quizKpis,
  deptQuizRowsMock,
} from "../../adminDashboardMocks";
import type {
  PeriodFilter,
  DeptQuizScoreRow,
  QuizSummaryRow,
  KpiCard,
} from "../../adminDashboardTypes";
import {
  getQuizSummary,
  getDepartmentScores,
  getQuizStats,
  type DepartmentScoreResponse,
  type QuizStatsResponse,
} from "../../api/quizApi";

interface AdminQuizTabProps {
  period: PeriodFilter;
  selectedDept: string;
  selectedDeptLabel: string;
  onFilterChange: (filter: CommonFilterState) => void;
}

const AdminQuizTab: React.FC<AdminQuizTabProps> = ({
  period,
  selectedDept,
  selectedDeptLabel,
  onFilterChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    overallAverageScore: number;
    participantCount: number;
    passRate: number;
    participationRate: number;
  } | null>(null);
  const [deptQuizRows, setDeptQuizRows] = useState<DeptQuizScoreRow[]>([]);
  const [quizSummaryRows, setQuizSummaryRows] = useState<QuizSummaryRow[]>([]);

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
      const department = selectedDept === "ALL" ? undefined : selectedDeptLabel;

      // 병렬로 모든 API 호출
      const [summaryRes, deptRes, quizStatsRes] = await Promise.all([
        getQuizSummary(period, department),
        getDepartmentScores(period, department),
        getQuizStats(period, department),
      ]);

      setSummary(summaryRes);

      // 부서별 평균 점수 데이터 변환
      const deptItems = (deptRes as DepartmentScoreResponse).items || [];
      setDeptQuizRows(
        deptItems.map((dept, idx) => ({
          id: `dept-${idx}`,
          deptName: dept.department,
          avgScore: dept.averageScore,
          participantCount: dept.participantCount,
        }))
      );

      // 퀴즈별 통계 데이터 변환
      const quizItems = (quizStatsRes as QuizStatsResponse).items || [];
      setQuizSummaryRows(
        quizItems.map((quiz, idx) => ({
          id: quiz.educationId || `quiz-${idx}`,
          quizTitle: quiz.quizTitle,
          avgScore: quiz.averageScore,
          participantCount: quiz.attemptCount,
          passRate: quiz.passRate,
        }))
      );
    } catch (err) {
      console.error("[AdminQuizTab] API 호출 실패:", err);
      setError(
        err instanceof Error ? err.message : "데이터를 불러오는데 실패했습니다."
      );
      // 에러 발생 시 Mock 데이터 사용
      setDeptQuizRows(deptQuizRowsMock);
    } finally {
      setLoading(false);
    }
  }, [period, selectedDept, selectedDeptLabel]);

  // 필터 변경 시 데이터 재조회
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // KPI 데이터 업데이트
  const kpiItems: KpiCard[] = summary
    ? [
        {
          id: "overall-avg-score",
          label: "전체 평균 점수",
          value: `${summary.overallAverageScore.toFixed(1)}점`,
        },
        {
          id: "participant-count",
          label: "응시자 수",
          value: `${summary.participantCount}명`,
        },
        {
          id: "pass-rate",
          label: "통과율 (80점↑)",
          value: `${summary.passRate.toFixed(1)}%`,
        },
        {
          id: "participation-rate",
          label: "퀴즈 응시율",
          value: `${summary.participationRate.toFixed(1)}%`,
        },
      ]
    : quizKpis;

  const visibleDeptQuizRows =
    selectedDept === "ALL"
      ? deptQuizRows
      : deptQuizRows.filter((row) => row.deptName === selectedDeptLabel);

  return (
    <div className="cb-admin-tab-panel">
      <AdminFilterBar
        mode="overview"
        value={filterValue}
        onChange={handleFilterChange}
        departments={DEPARTMENT_OPTIONS}
        onRefresh={() => {
          fetchData();
        }}
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
      <KpiRow items={kpiItems} />

      <section className="cb-admin-section">
        <div className="cb-admin-section-header">
          <h3 className="cb-admin-section-title">부서별 평균 점수</h3>
        </div>
        <div className="cb-admin-bar-chart">
          {visibleDeptQuizRows.map((row) => {
            const width = `${Math.min(
              100,
              Math.round((row.avgScore / 100) * 100)
            )}%`;
            return (
              <div key={row.id} className="cb-admin-bar-row">
                <span className="cb-admin-bar-label">{row.deptName}</span>
                <div className="cb-admin-bar-track">
                  <div className="cb-admin-bar-fill" style={{ width }} />
                </div>
                <span className="cb-admin-bar-value">
                  {row.avgScore.toFixed(1)}점 / {row.participantCount}명
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="cb-admin-section">
        <div className="cb-admin-section-header">
          <h3 className="cb-admin-section-title">퀴즈별 통계</h3>
        </div>
        <div className="cb-admin-table-wrapper">
          <table className="cb-admin-table">
            <thead>
              <tr>
                <th>퀴즈 제목</th>
                <th>평균 점수</th>
                <th>응시 수</th>
                <th>통과율</th>
              </tr>
            </thead>
            <tbody>
              {quizSummaryRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.quizTitle}</td>
                  <td>{row.avgScore.toFixed(1)}점</td>
                  <td>{row.participantCount}명</td>
                  <td>{row.passRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminQuizTab;
