"use server";

import { requireOrg } from "@/lib/queries/org";
import { fail, ok, type ActionResult } from "./result";

export type CsvFile = { filename: string; content: string };

function escape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "string" ? v : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(rows: Array<Record<string, unknown>>, headers: string[]): string {
  const head = headers.map(escape).join(",");
  const body = rows
    .map((r) => headers.map((h) => escape(r[h])).join(","))
    .join("\n");
  return `${head}\n${body}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function exportFinanceCsv(): Promise<ActionResult<CsvFile>> {
  const { supabase, organizationId } = await requireOrg();
  const [paymentsRes, expensesRes] = await Promise.all([
    supabase
      .from("payments")
      .select("payment_date, amount, method, description, students(full_name)")
      .eq("organization_id", organizationId)
      .order("payment_date", { ascending: false }),
    supabase
      .from("expenses")
      .select("expense_date, amount, category, description")
      .eq("organization_id", organizationId)
      .order("expense_date", { ascending: false }),
  ]);
  if (paymentsRes.error) return fail(paymentsRes.error.message);
  if (expensesRes.error) return fail(expensesRes.error.message);

  const rows: Array<Record<string, unknown>> = [];
  for (const p of paymentsRes.data ?? []) {
    const pr = p as unknown as {
      payment_date: string;
      amount: number;
      method: string;
      description: string | null;
      students: { full_name: string } | null;
    };
    rows.push({
      date: pr.payment_date,
      type: "income",
      amount: Number(pr.amount).toFixed(2),
      category: pr.method,
      party: pr.students?.full_name ?? "",
      description: pr.description ?? "",
    });
  }
  for (const e of expensesRes.data ?? []) {
    const er = e as unknown as {
      expense_date: string;
      amount: number;
      category: string;
      description: string | null;
    };
    rows.push({
      date: er.expense_date,
      type: "expense",
      amount: Number(er.amount).toFixed(2),
      category: er.category,
      party: "",
      description: er.description ?? "",
    });
  }
  rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const content = toCsv(rows, [
    "date",
    "type",
    "amount",
    "category",
    "party",
    "description",
  ]);
  return ok({ filename: `finance-${today()}.csv`, content });
}

export async function exportStudentsCsv(): Promise<ActionResult<CsvFile>> {
  const { supabase, organizationId } = await requireOrg();
  const [studentsRes, balancesRes] = await Promise.all([
    supabase
      .from("students")
      .select(
        "id, full_name, email, phone, grade_level, default_rate, parent_name, parent_email, parent_phone, archived_at, created_at",
      )
      .eq("organization_id", organizationId)
      .order("full_name"),
    supabase
      .from("student_balances")
      .select("student_id, total_paid, total_billed, balance, prepaid_sessions_remaining")
      .eq("organization_id", organizationId),
  ]);
  if (studentsRes.error) return fail(studentsRes.error.message);
  if (balancesRes.error) return fail(balancesRes.error.message);

  const balMap = new Map<string, Record<string, number>>();
  for (const b of (balancesRes.data ?? []) as unknown as Array<{
    student_id: string;
    total_paid: number;
    total_billed: number;
    balance: number;
    prepaid_sessions_remaining: number;
  }>) {
    balMap.set(b.student_id, {
      total_paid: Number(b.total_paid),
      total_billed: Number(b.total_billed),
      balance: Number(b.balance),
      prepaid_sessions_remaining: Number(b.prepaid_sessions_remaining),
    });
  }

  const rows = (studentsRes.data ?? []).map((s) => {
    const bal = balMap.get(s.id as string) ?? {
      total_paid: 0,
      total_billed: 0,
      balance: 0,
      prepaid_sessions_remaining: 0,
    };
    return {
      full_name: s.full_name,
      email: s.email ?? "",
      phone: s.phone ?? "",
      grade_level: s.grade_level ?? "",
      default_rate: Number(s.default_rate ?? 0).toFixed(2),
      parent_name: s.parent_name ?? "",
      parent_email: s.parent_email ?? "",
      parent_phone: s.parent_phone ?? "",
      total_paid: bal.total_paid.toFixed(2),
      total_billed: bal.total_billed.toFixed(2),
      balance: bal.balance.toFixed(2),
      prepaid_sessions_remaining: bal.prepaid_sessions_remaining,
      archived: s.archived_at ? "yes" : "no",
    };
  });

  const content = toCsv(rows, [
    "full_name",
    "email",
    "phone",
    "grade_level",
    "default_rate",
    "parent_name",
    "parent_email",
    "parent_phone",
    "total_paid",
    "total_billed",
    "balance",
    "prepaid_sessions_remaining",
    "archived",
  ]);
  return ok({ filename: `students-${today()}.csv`, content });
}

export async function exportSessionLogsCsv(): Promise<ActionResult<CsvFile>> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "start_time, end_time, topic, status, tutors(full_name), session_students(rate, students(full_name))",
    )
    .eq("organization_id", organizationId)
    .order("start_time", { ascending: false });
  if (error) return fail(error.message);

  const rows: Array<Record<string, unknown>> = [];
  for (const s of (data ?? []) as unknown as Array<{
    start_time: string;
    end_time: string;
    topic: string;
    status: string;
    tutors: { full_name: string } | null;
    session_students: Array<{
      rate: number;
      students: { full_name: string } | null;
    }>;
  }>) {
    const hours =
      (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) /
      3_600_000;
    const studentList =
      s.session_students
        .map((ss) => ss.students?.full_name)
        .filter(Boolean)
        .join("; ") ?? "";
    const revenue = s.session_students.reduce(
      (sum, ss) => sum + Number(ss.rate) * hours,
      0,
    );
    rows.push({
      start_time: s.start_time,
      end_time: s.end_time,
      hours: hours.toFixed(2),
      topic: s.topic,
      status: s.status,
      tutor: s.tutors?.full_name ?? "",
      students: studentList,
      revenue: revenue.toFixed(2),
    });
  }

  const content = toCsv(rows, [
    "start_time",
    "end_time",
    "hours",
    "topic",
    "status",
    "tutor",
    "students",
    "revenue",
  ]);
  return ok({ filename: `session-logs-${today()}.csv`, content });
}

export async function exportTutorsCsv(): Promise<ActionResult<CsvFile>> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("tutors")
    .select(
      "full_name, email, phone, address, pay_rate, subjects_taught, year_levels_taught, emergency_name, emergency_phone, alt_emergency_name, alt_emergency_phone, archived_at, created_at",
    )
    .eq("organization_id", organizationId)
    .order("full_name");
  if (error) return fail(error.message);

  const rows = (data ?? []).map((t) => {
    const r = t as unknown as {
      full_name: string;
      email: string;
      phone: string;
      address: string;
      pay_rate: number;
      subjects_taught: string[] | null;
      year_levels_taught: number[] | null;
      emergency_name: string;
      emergency_phone: string;
      alt_emergency_name: string | null;
      alt_emergency_phone: string | null;
      archived_at: string | null;
      created_at: string | null;
    };
    return {
      full_name: r.full_name,
      email: r.email,
      phone: r.phone,
      address: r.address,
      pay_rate: Number(r.pay_rate ?? 0).toFixed(2),
      subjects_taught: (r.subjects_taught ?? []).join("; "),
      year_levels_taught: (r.year_levels_taught ?? []).join("; "),
      emergency_name: r.emergency_name,
      emergency_phone: r.emergency_phone,
      alt_emergency_name: r.alt_emergency_name ?? "",
      alt_emergency_phone: r.alt_emergency_phone ?? "",
      archived: r.archived_at ? "yes" : "no",
      created_at: r.created_at ?? "",
    };
  });

  const content = toCsv(rows, [
    "full_name",
    "email",
    "phone",
    "address",
    "pay_rate",
    "subjects_taught",
    "year_levels_taught",
    "emergency_name",
    "emergency_phone",
    "alt_emergency_name",
    "alt_emergency_phone",
    "archived",
    "created_at",
  ]);
  return ok({ filename: `tutors-${today()}.csv`, content });
}
