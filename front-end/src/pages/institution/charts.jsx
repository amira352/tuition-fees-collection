import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatEGP } from "../../lib/format";
import { CHART_COLORS } from "./dashboardData";

const AXIS = { fontSize: 11, fill: "#8a94a6" };

function compact(value) {
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return `${value}`;
}

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tip">
      {label && <div className="chart-tip-label">{label}</div>}
      {payload.map((p) => (
        <div key={p.name} className="chart-tip-row">
          <span className="chart-tip-dot" style={{ background: p.color || p.payload.color }} />
          <span>{p.name}</span>
          <strong>{formatEGP(p.value)}</strong>
        </div>
      ))}
    </div>
  );
}

export function CollectionTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_COLORS.navy} stopOpacity={0.28} />
            <stop offset="100%" stopColor={CHART_COLORS.navy} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#eef1f6" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={AXIS} dy={6} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={AXIS}
          tickFormatter={compact}
          width={44}
        />
        <Tooltip content={<TooltipBox />} cursor={{ stroke: "#c9d4e4", strokeDasharray: 4 }} />
        <Area
          type="monotone"
          dataKey="amount"
          name="Collected"
          stroke={CHART_COLORS.navy}
          strokeWidth={2.5}
          fill="url(#collGrad)"
          dot={{ r: 3, fill: CHART_COLORS.navy, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, centerLabel, centerValue }) {
  return (
    <div className="donut">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={2}
            stroke="none"
          >
            {data.map((slice) => (
              <Cell key={slice.name} fill={slice.color} />
            ))}
          </Pie>
          <Tooltip content={<TooltipBox />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center">
        <span className="donut-center-label">{centerLabel}</span>
        <span className="donut-center-value">{centerValue}</span>
      </div>
    </div>
  );
}
