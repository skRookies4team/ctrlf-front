import React, { useCallback, useEffect, useState } from "react";
import AdminFilterBar from "../../AdminFilterBar";
import type { CommonFilterState } from "../../adminFilterTypes";
import KpiRow from "../KpiRow";
import {
  DEPARTMENT_OPTIONS,
  educationKpis,
  mandatoryCoursesMock,
  jobCoursesMock,
  deptEducationRowsMock,
} from "../../adminDashboardMocks";
import type {
  PeriodFilter,
  MandatoryCourseProgress,
  JobCourseSummary,
  DeptEducationRow,
  KpiCard,
} from "../../adminDashboardTypes";
import {
  getEducationSummary,
  getMandatoryCompletion,
  getJobCompletion,
  getDepartmentCompletion,
} from "../../api/educationApi";

interface AdminEducationTabProps {
  period: PeriodFilter;
  selectedDept: string;
  selectedDeptLabel: string;
  onFilterChange: (filter: CommonFilterState) => void;
}

const AdminEducationTab: React.FC<AdminEducationTabProps> = ({
  period,
  selectedDept,
  selectedDeptLabel,
  onFilterChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    overallAverageCompletionRate: number;
    nonCompleterCount: number;
    mandatoryEducationAverage: number;
    jobEducationAverage: number;
  } | null>(null);
  const [mandatoryCourses, setMandatoryCourses] = useState<
    MandatoryCourseProgress[]
  >([]);
  const [jobCourses, setJobCourses] = useState<JobCourseSummary[]>([]);
  const [deptRows, setDeptRows] = useState<DeptEducationRow[]>([]);

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
      const [summaryRes, mandatoryRes, jobRes, deptRes] = await Promise.all([
        getEducationSummary(period, department),
        getMandatoryCompletion(period, department),
        getJobCompletion(period, department),
        getDepartmentCompletion(period),
      ]);

      setSummary(summaryRes);

      // 4대 의무교육 데이터 변환
      setMandatoryCourses([
        {
          id: "sexual-harassment",
          name: "성희롱 예방교육",
          completionRate: mandatoryRes.sexualHarassmentPrevention,
        },
        {
          id: "personal-info",
          name: "개인정보보호 교육",
          completionRate: mandatoryRes.personalInfoProtection,
        },
        {
          id: "workplace-bullying",
          name: "직장 내 괴롭힘 예방",
          completionRate: mandatoryRes.workplaceBullying,
        },
        {
          id: "disability-awareness",
          name: "장애인 인식개선 교육",
          completionRate: mandatoryRes.disabilityAwareness,
        },
      ]);

      // 직무교육 데이터 변환
      setJobCourses(
        (jobRes.items || []).map((course, idx) => ({
          id: course.educationId || `job-${idx}`,
          title: course.title,
          status:
            course.status === "진행 중"
              ? "in-progress"
              : course.status === "이수 완료"
              ? "completed"
              : "not-started",
          learnerCount: course.learnerCount,
        }))
      );

      // 부서별 이수율 데이터 변환
      setDeptRows(
        (deptRes.items || []).map((dept, idx) => ({
          id: `dept-${idx}`,
          deptName: dept.department,
          targetCount: dept.targetCount,
          completedCount: dept.completerCount,
          completionRate: dept.completionRate,
        }))
      );
    } catch (err) {
      console.error("[AdminEducationTab] API 호출 실패:", err);
      setError(
        err instanceof Error ? err.message : "데이터를 불러오는데 실패했습니다."
      );
      // 에러 발생 시 Mock 데이터 사용
      setMandatoryCourses(mandatoryCoursesMock);
      setJobCourses(jobCoursesMock);
      setDeptRows(deptEducationRowsMock);
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
          id: "overall-completion",
          label: "전체 평균 이수율",
          value: `${summary.overallAverageCompletionRate.toFixed(1)}%`,
        },
        {
          id: "non-completers",
          label: "미이수자 수",
          value: `${summary.nonCompleterCount}명`,
        },
        {
          id: "mandatory-avg",
          label: "4대 의무교육 평균 이수율",
          value: `${summary.mandatoryEducationAverage.toFixed(1)}%`,
        },
        {
          id: "job-avg",
          label: "직무교육 평균 이수율",
          value: `${summary.jobEducationAverage.toFixed(1)}%`,
        },
      ]
    : educationKpis;

  const visibleDeptRows =
    selectedDept === "ALL"
      ? deptRows
      : deptRows.filter((row) => row.deptName === selectedDeptLabel);

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

      <div className="cb-admin-section-row">
        <section className="cb-admin-section">
          <div className="cb-admin-section-header">
            <h3 className="cb-admin-section-title">4대 의무교육 이수율</h3>
          </div>
          <div className="cb-admin-bar-chart">
            {mandatoryCourses.map((course) => (
              <div key={course.id} className="cb-admin-bar-row">
                <span className="cb-admin-bar-label">{course.name}</span>
                <div className="cb-admin-bar-track">
                  <div
                    className="cb-admin-bar-fill"
                    style={{ width: `${course.completionRate}%` }}
                  />
                </div>
                <span className="cb-admin-bar-value">
                  {course.completionRate.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="cb-admin-section">
          <div className="cb-admin-section-header">
            <h3 className="cb-admin-section-title">직무교육 이수 현황</h3>
          </div>
          <ul className="cb-admin-course-list">
            {jobCourses.map((course) => (
              <li key={course.id} className="cb-admin-course-item">
                <div className="cb-admin-course-main">
                  <span className="cb-admin-course-title">{course.title}</span>
                  <span
                    className={`cb-admin-course-status is-${course.status}`}
                  >
                    {course.status === "in-progress" && "진행 중"}
                    {course.status === "completed" && "이수 완료"}
                    {course.status === "not-started" && "미시작"}
                  </span>
                </div>
                <div className="cb-admin-course-meta">
                  학습자 {course.learnerCount}명
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="cb-admin-section">
        <div className="cb-admin-section-header">
          <h3 className="cb-admin-section-title">부서별 이수율 현황</h3>
        </div>
        <div className="cb-admin-table-wrapper">
          <table className="cb-admin-table">
            <thead>
              <tr>
                <th>부서</th>
                <th>대상자 수</th>
                <th>이수자 수</th>
                <th>이수율</th>
                <th>미이수자 수</th>
              </tr>
            </thead>
            <tbody>
              {visibleDeptRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.deptName}</td>
                  <td>{row.targetCount}</td>
                  <td>{row.completedCount}</td>
                  <td>{row.completionRate}%</td>
                  <td>{row.targetCount - row.completedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminEducationTab;
