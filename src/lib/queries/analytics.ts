import "server-only";
import { requireOrg } from "./org";
import { fyRange } from "@/lib/fy";
import { getSessionHours } from "@/lib/utils";

export type RevenueByMonthPoint = {
  month: string; // "Jul", "Aug", ...
  key: string; // ISO-ish YYYY-MM
  revenue: number;
  expenses: number;
  net: number;
};

export type SessionsPerMonthPoint = {
  month: string; // "Jul", "Aug", ...
  key: string; // YYYY-MM
  sessions: number;
  hours: number;
};

export type StudentGrowthPoint = {
  month: string;
  key: string;
  active: number;
};

export type AnalyticsBundle = {
  fyStart: number;
  revenueByMonth: RevenueByMonthPoint[];
  sessionsPerMonth: SessionsPerMonthPoint[];
  studentGrowth: StudentGrowthPoint[];
  totals: {
    revenue: number;
    expenses: number;
    net: number;
    sessionCount: number;
    sessionHours: number;
    activeStudents: number;
  };
};

const MONTH_LABELS_AU_FY = [
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getAnalytics(fyStart: number): Promise<AnalyticsBundle> {
  const { supabase, organizationId } = await requireOrg();
  const { start, end } = fyRange(fyStart);

  const startIso = start.toISOString();
  const endIso = end.toISOString();
  const startDate = isoDate(start);
  const endDate = isoDate(end);

  const [sessionStudentsRes, sessionsRes, paymentsRes, expensesRes, studentsRes] =
    await Promise.all([
      supabase
        .from("session_students")
        .select(
          "rate, sessions!inner(start_time, end_time, status, organization_id)",
        )
        .eq("sessions.organization_id", organizationId)
        .gte("sessions.start_time", startIso)
        .lt("sessions.start_time", endIso),
      supabase
        .from("sessions")
        .select("id, start_time, end_time, status")
        .eq("organization_id", organizationId)
        .gte("start_time", startIso)
        .lt("start_time", endIso),
      supabase
        .from("payments")
        .select("amount, payment_date")
        .eq("organization_id", organizationId)
        .gte("payment_date", startDate)
        .lt("payment_date", endDate),
      supabase
        .from("expenses")
        .select("amount, expense_date")
        .eq("organization_id", organizationId)
        .gte("expense_date", startDate)
        .lt("expense_date", endDate),
      supabase
        .from("students")
        .select("id, archived_at, created_at")
        .eq("organization_id", organizationId),
    ]);

  if (sessionStudentsRes.error) throw sessionStudentsRes.error;
  if (sessionsRes.error) throw sessionsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  if (expensesRes.error) throw expensesRes.error;
  if (studentsRes.error) throw studentsRes.error;

  // Revenue by month (based on billable sessions) + expenses overlay.
  const months = new Map<string, RevenueByMonthPoint>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = monthKey(d);
    months.set(key, {
      month: MONTH_LABELS_AU_FY[i],
      key,
      revenue: 0,
      expenses: 0,
      net: 0,
    });
  }

  type JoinedSS = {
    rate: number;
    sessions: {
      start_time: string;
      end_time: string;
      status: string;
    } | null;
  };
  const ss = sessionStudentsRes.data as unknown as JoinedSS[];
  let totalRevenue = 0;
  for (const row of ss) {
    if (!row.sessions) continue;
    if (!["completed", "cancelled_billable"].includes(row.sessions.status))
      continue;
    const amt =
      Number(row.rate) *
      getSessionHours(row.sessions.start_time, row.sessions.end_time);
    const d = new Date(row.sessions.start_time);
    const k = monthKey(d);
    const bucket = months.get(k);
    if (bucket) bucket.revenue += amt;
    totalRevenue += amt;
  }

  let totalExpenses = 0;
  for (const e of expensesRes.data ?? []) {
    const amt = Number(e.amount);
    const d = new Date(e.expense_date);
    const k = monthKey(d);
    const bucket = months.get(k);
    if (bucket) bucket.expenses += amt;
    totalExpenses += amt;
  }
  for (const m of months.values()) m.net = m.revenue - m.expenses;

  // Sessions per month.
  const sessionMonths = new Map<string, SessionsPerMonthPoint>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const key = monthKey(d);
    sessionMonths.set(key, {
      month: MONTH_LABELS_AU_FY[i],
      key,
      sessions: 0,
      hours: 0,
    });
  }
  let totalSessionHours = 0;
  for (const s of sessionsRes.data ?? []) {
    if (s.status === "cancelled_free") continue;
    const sessionStart = new Date(s.start_time);
    const k = monthKey(sessionStart);
    const hours = getSessionHours(s.start_time, s.end_time);
    totalSessionHours += hours;
    const bucket = sessionMonths.get(k);
    if (bucket) {
      bucket.sessions += 1;
      bucket.hours += hours;
    }
  }
  const sessionsPerMonth = Array.from(sessionMonths.values());

  // Active students over time (cumulative, end of month within FY).
  const studentGrowth: StudentGrowthPoint[] = [];
  const students = studentsRes.data ?? [];
  for (let i = 0; i < 12; i++) {
    const monthStart = new Date(start.getFullYear(), start.getMonth() + i, 1);
    const monthEnd = new Date(start.getFullYear(), start.getMonth() + i + 1, 1);
    const k = monthKey(monthStart);
    let count = 0;
    for (const s of students) {
      const created = s.created_at ? new Date(s.created_at) : null;
      if (!created || created >= monthEnd) continue;
      const archived = s.archived_at ? new Date(s.archived_at) : null;
      if (archived && archived < monthStart) continue;
      count += 1;
    }
    studentGrowth.push({
      month: MONTH_LABELS_AU_FY[i],
      key: k,
      active: count,
    });
  }

  const now = new Date();
  const activeStudents = students.filter((s) => {
    if (s.archived_at && new Date(s.archived_at) <= now) return false;
    return true;
  }).length;

  return {
    fyStart,
    revenueByMonth: Array.from(months.values()),
    sessionsPerMonth,
    studentGrowth,
    totals: {
      revenue: totalRevenue,
      expenses: totalExpenses,
      net: totalRevenue - totalExpenses,
      sessionCount: (sessionsRes.data ?? []).filter(
        (s) => s.status !== "cancelled_free",
      ).length,
      sessionHours: totalSessionHours,
      activeStudents,
    },
  };
}

export async function getEarliestActivityDate(): Promise<Date | null> {
  const { supabase, organizationId } = await requireOrg();
  const [{ data: s }, { data: p }] = await Promise.all([
    supabase
      .from("sessions")
      .select("start_time")
      .eq("organization_id", organizationId)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("payments")
      .select("payment_date")
      .eq("organization_id", organizationId)
      .order("payment_date", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const candidates: Date[] = [];
  if (s?.start_time) candidates.push(new Date(s.start_time));
  if (p?.payment_date) candidates.push(new Date(p.payment_date));
  if (!candidates.length) return null;
  return candidates.reduce((a, b) => (a < b ? a : b));
}
