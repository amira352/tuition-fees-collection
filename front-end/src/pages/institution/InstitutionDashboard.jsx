import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../../lib/auth";
import { apiGet } from "../../lib/api";
import { formatEGP, formatPercent, formatNumber } from "../../lib/format";
import { toCsv, downloadCsv } from "../../lib/csv";
import { CHART_COLORS } from "./dashboardData";
import { CollectionTrendChart, DonutChart } from "./charts";
import { LegendList, RecentPayments, SectionCard, StatCard } from "./widgets";
import { PageHeader } from "./PageHeader";
import "./InstitutionDashboard.css";

// The dashboard endpoint doesn't send a tone or trend delta per KPI (see
// backend/src/services/institutionDashboard.service.js) — tone is purely a
// display choice, kept here rather than guessed server-side.
const KPI_TONE = {
  total: "navy",
  collected: "green",
  outstanding: "amber",
  partial: "teal",
  students: "slate",
};

const FEE_TYPE_COLORS = Object.values(CHART_COLORS);

const PAYMENT_STATUS_COLORS = {
  Collected: CHART_COLORS.green,
  Outstanding: CHART_COLORS.muted,
};

function withColors(feeTypeBreakdown) {
  return feeTypeBreakdown.map((slice, i) => ({
    ...slice,
    color: FEE_TYPE_COLORS[i % FEE_TYPE_COLORS.length],
  }));
}

function withStatusColors(paymentStatus) {
  return paymentStatus.map((slice) => ({
    ...slice,
    color: PAYMENT_STATUS_COLORS[slice.name] || CHART_COLORS.slate,
  }));
}

function exportSummaryCsv(data) {
  const rows = [
    ["Metric", "Value"],
    ...data.kpis.map((k) => [k.label, k.money ? formatEGP(k.value) : formatNumber(k.value)]),
    [],
    ["Date & Time", "Student", "Fee Type", "Amount", "Method", "Status"],
    ...data.recentPayments.map((r) => [
      r.dateTime,
      r.student,
      r.feeType,
      formatEGP(r.amount),
      r.method,
      r.status,
    ]),
  ];
  downloadCsv(toCsv(rows), "institution_dashboard_summary.csv");
}

export default function InstitutionDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const institutionId = user?.id;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!institutionId) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiGet(`/institutions/${institutionId}/dashboard`);
        if (cancelled) return;
        setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Couldn't load the dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [institutionId]);

  if (loading) {
    return (
      <div className="dash">
        <div className="placeholder-card">Loading dashboard…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="dash">
        <div className="alert" role="alert">{error || "Couldn't load the dashboard."}</div>
      </div>
    );
  }

  const feeTypeBreakdown = withColors(data.feeTypeBreakdown);
  const paymentStatus = withStatusColors(data.paymentStatus);

  const collectedTotal = feeTypeBreakdown.reduce((s, f) => s + f.amount, 0);
  const totalFees = paymentStatus.reduce((s, p) => s + p.amount, 0);
  const collectedPct = totalFees > 0 ? paymentStatus[0].amount / totalFees : 0;

  return (
    <div className="dash">
      <PageHeader
        title="Operations Dashboard"
        subtitle="Fee collection overview"
        dateRangeLabel={data.periodLabel}
        onExport={() => exportSummaryCsv(data)}
        primaryLabel="New Upload"
        onPrimaryClick={() => navigate("/institution/upload-dues")}
      />

      {/* KPI row */}
      <div className="dash-kpis">
        {data.kpis.map(({ key, ...card }) => (
          <StatCard key={key} {...card} tone={KPI_TONE[key] || "slate"} />
        ))}
      </div>

      {/* Collection Overview + Collection by Fee Type */}
      <div className="dash-charts">
        <SectionCard title="Collection Overview" icon="chart" className="panel--wide"
          action={<span className="panel-pill">Last 7 days</span>}>
          <CollectionTrendChart data={data.collectionTrend} />
        </SectionCard>

        <SectionCard title="Collection by Fee Type" icon="receipt">
          {feeTypeBreakdown.length > 0 ? (
            <>
              <DonutChart
                data={feeTypeBreakdown}
                centerLabel="Total Collected"
                centerValue={formatEGP(collectedTotal)}
              />
              <LegendList items={feeTypeBreakdown} total={collectedTotal} />
            </>
          ) : (
            <p className="dash-empty-note">No collected fees yet.</p>
          )}
        </SectionCard>
      </div>

      {/* Payment Status + Recent Payments */}
      <div className="dash-bottom">
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
                  {totalFees > 0 ? formatPercent(p.amount / totalFees) : "0%"}
                </span>
                <span className="legend-amount">{formatEGP(p.amount)}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title="Recent Payments"
          icon="card"
          className="panel--wide"
          action={<button type="button" className="panel-link" onClick={() => navigate("/institution/payments")}>View all</button>}
        >
          {data.recentPayments.length > 0 ? (
            <RecentPayments rows={data.recentPayments} />
          ) : (
            <p className="dash-empty-note">No payments yet.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
