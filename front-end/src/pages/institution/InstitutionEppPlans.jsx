import { formatEGP, formatNumber } from "../../lib/format";
import {
  eppKpis,
  eppPlans,
  financedByStatus,
  financedByTenor,
} from "./eppPlansData";
import { DonutChart } from "./charts";
import { SectionCard, StatCard, StatusPill } from "./widgets";
import "./InstitutionDashboard.css";
import "./InstitutionEppPlans.css";

function formatDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function InstitutionEppPlans() {
  const tenorTotal = financedByTenor.reduce((s, r) => s + r.amount, 0);
  const statusTotal = financedByStatus.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h1 className="dash-title">EPP Plans</h1>
          <p className="dash-subtitle">
            Instalment plans your students&apos; parents have set up through CIB.
          </p>
        </div>
      </div>

      <div className="dash-kpis epp-kpis">
        {eppKpis.map(({ key, ...card }) => (
          <StatCard key={key} {...card} />
        ))}
      </div>

      <div className="epp-charts">
        <SectionCard title="Financed Amount by Tenor" icon="calendar">
          <DonutChart
            data={financedByTenor}
            centerLabel="Total Financed"
            centerValue={formatEGP(tenorTotal)}
          />
          <ul className="legend">
            {financedByTenor.map((row) => (
              <li key={row.name} className="legend-row">
                <span className="legend-dot" style={{ background: row.color }} />
                <span className="legend-name">{row.name}</span>
                <span className="legend-pct">
                  {Math.round((row.amount / tenorTotal) * 100)}%
                </span>
                <span className="legend-amount">{formatEGP(row.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Plans by Status" icon="plan">
          <DonutChart
            data={financedByStatus}
            centerLabel="Financed"
            centerValue={formatEGP(statusTotal)}
          />
          <ul className="legend">
            {financedByStatus.map((row) => (
              <li key={row.name} className="legend-row">
                <span className="legend-dot" style={{ background: row.color }} />
                <span className="legend-name">{row.name}</span>
                <span className="legend-pct">
                  {Math.round((row.amount / statusTotal) * 100)}%
                </span>
                <span className="legend-amount">{formatEGP(row.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="All Instalment Plans" icon="receipt">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Fee Type</th>
                <th>Principal</th>
                <th>Tenor</th>
                <th>Monthly</th>
                <th>Progress</th>
                <th>Started</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {eppPlans.map((plan) => (
                <tr key={plan.id}>
                  <td>{plan.student}</td>
                  <td className="table-muted">{plan.feeType}</td>
                  <td className="table-amount">{formatEGP(plan.principal)}</td>
                  <td className="table-muted">{plan.tenorMonths} mo</td>
                  <td className="table-muted">{formatEGP(plan.monthlyInstalment)}</td>
                  <td>
                    <div className="epp-progress">
                      <div className="epp-progress-track">
                        <div
                          className="epp-progress-fill"
                          style={{ width: `${(plan.installmentsPaid / plan.tenorMonths) * 100}%` }}
                        />
                      </div>
                      <span className="epp-progress-label">
                        {formatNumber(plan.installmentsPaid)} of {formatNumber(plan.tenorMonths)}
                      </span>
                    </div>
                  </td>
                  <td className="table-muted">{formatDate(plan.startDate)}</td>
                  <td><StatusPill status={plan.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
