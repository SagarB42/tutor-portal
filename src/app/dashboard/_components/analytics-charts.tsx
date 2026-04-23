"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type {
  RevenueByMonthPoint,
  SessionsPerWeekPoint,
  StudentGrowthPoint,
} from "@/lib/queries/analytics";

const axisStyle = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = {
  fontSize: "12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--popover)",
  color: "var(--popover-foreground)",
};

export function RevenueChart({ data }: { data: RevenueByMonthPoint[] }) {
  if (!data.some((d) => d.revenue || d.expenses)) {
    return <EmptyChart label="No revenue or expenses recorded this FY." />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `$${Math.round(v / 1000)}k` : `$${v}`
          }
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v, name) => [formatCurrency(Number(v)), name as string]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          name="Revenue"
          stroke="#2563eb"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="expenses"
          name="Expenses"
          stroke="#e11d48"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="net"
          name="Net"
          stroke="#16a34a"
          strokeWidth={2}
          strokeDasharray="4 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SessionsChart({ data }: { data: SessionsPerWeekPoint[] }) {
  if (!data.length) {
    return <EmptyChart label="No sessions delivered this FY yet." />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={axisStyle}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelFormatter={(_, payload) => {
            const p = payload?.[0]?.payload as SessionsPerWeekPoint | undefined;
            return p ? `Week of ${p.weekStart}` : "";
          }}
          formatter={(v, name) => {
            const num = Number(v);
            if (name === "hours") return [`${num.toFixed(1)} h`, "Hours"];
            return [num, "Sessions"];
          }}
        />
        <Bar dataKey="sessions" fill="#10b981" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StudentsChart({ data }: { data: StudentGrowthPoint[] }) {
  if (!data.some((d) => d.active)) {
    return <EmptyChart label="No active students recorded this FY." />;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="studentsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" tick={axisStyle} tickLine={false} axisLine={false} />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [Number(v), "Active students"]}
        />
        <Area
          type="monotone"
          dataKey="active"
          stroke="#8b5cf6"
          strokeWidth={2}
          fill="url(#studentsGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
      {label}
    </div>
  );
}
