import { getUser } from "../../lib/auth";
import { formatEGP, formatPercent } from "../../lib/format";
import {
  PERIOD_LABEL,
  collectionTrend,
  feeTypeBreakdown,
  kpis,
  paymentStatus,
  recentActivity,
  recentPayments,
} from "./dashboardData";
import { CollectionTrendChart, DonutChart } from "./charts";
import {
  LegendList,
  RecentActivity,
  RecentPayments,
  SectionCard,
  StatCard,
} from "./widgets";
import { Icon } from "./icons";
import "./InstitutionDashboard.css";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function InstitutionDashboard() {
  const user = getUser();
  const name = user?.name || "there";

  const collectedTotal = feeTypeBreakdown.reduce((s, f) => s + f.amount, 0);
  const totalFees = paymentStatus.reduce((s, p) => s + p.amount, 0);
  const collectedPct = paymentStatus[0].amount / totalFees;

  return (
    <div className="dash">
      {/* Header */}
      <div className="dash-head">
        <div>
          <h1 className="dash-title">
            {greeting()}, {name} <span aria-hidden="true">👋</span>
          </h1>
          <p className="dash-subtitle">
            Here&apos;s an overview of your institution&apos;s fee collection.
          </p>
        </div>
        <span className="dash-period">
          <Icon.calendar />
          {PERIOD_LABEL}
        </span>
      </div>

      {/* KPI row */}
      <div className="dash-kpis">
        {kpis.map(({ key, ...card }) => (
          <StatCard key={key} {...card} />
        ))}
      </div>

      {/* Charts row */}
      <div className="dash-charts">
        <SectionCard title="Collection Overview" icon="chart" className="panel--wide"
          action={<span className="panel-pill">Last 7 days</span>}>
          <CollectionTrendChart data={collectionTrend} />
        </SectionCard>

        <SectionCard title="Collection by Fee Type" icon="receipt">
          <DonutChart
            data={feeTypeBreakdown}
            centerLabel="Total Collected"
            centerValue={formatEGP(collectedTotal)}
          />
          <LegendList items={feeTypeBreakdown} total={collectedTotal} />
        </SectionCard>

        <SectionCard title="Payment Status" icon="card">
          <DonutChart
            data={paymentStatus}
            centerLabel="Collected"
            centerValue={formatPercent(collectedPct)}
          />
          <ul className="legend">
            {paymentStatus.map((p) => (
              <li key={p.name} className="legend-row">
                <span className="legend-dot" style={{ background: p.color }} />
                <span className="legend-name">
                  {p.name === "Collected" ? "Paid" : p.name}
                </span>
                <span className="legend-pct">
                  {formatPercent(p.amount / totalFees)}
                </span>
                <span className="legend-amount">{formatEGP(p.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Bottom row */}
      <div className="dash-bottom">
        <SectionCard
          title="Recent Activity"
          icon="report"
          action={<button type="button" className="panel-link">View all</button>}
        >
          <RecentActivity items={recentActivity} />
        </SectionCard>

        <SectionCard
          title="Recent Payments"
          icon="card"
          className="panel--wide"
          action={<button type="button" className="panel-link">View all</button>}
        >
          <RecentPayments rows={recentPayments} />
        </SectionCard>
      </div>
    </div>
  );
}
