import React from "react";
import type { KpiCard } from "../adminDashboardTypes";

interface KpiRowProps {
  items: KpiCard[];
}

const KpiRow: React.FC<KpiRowProps> = ({ items }) => {
  return (
    <div className="cb-admin-kpi-row" aria-label="핵심 지표 요약">
      {items.map((kpi) => (
        <div key={kpi.id} className="cb-admin-kpi-card">
          <div className="cb-admin-kpi-header">
            <span className="cb-admin-kpi-dot" aria-hidden="true" />
            <span className="cb-admin-kpi-label">{kpi.label}</span>
          </div>
          <div className="cb-admin-kpi-value">{kpi.value}</div>
          {kpi.caption && (
            <div className="cb-admin-kpi-caption">{kpi.caption}</div>
          )}
        </div>
      ))}
    </div>
  );
};

export default KpiRow;

