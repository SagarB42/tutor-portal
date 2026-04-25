import "server-only";

import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

type Ctx = {
  supabase: SupabaseClient;
  organizationId: string;
};

// ---------- Helpers ----------

function isoDateRangeForPeriod(period: string): { from: string; to: string } {
  const now = new Date();
  let from: Date;
  let to: Date = new Date(now);
  switch (period) {
    case "this_week": {
      const day = (now.getDay() + 6) % 7; // Mon=0
      from = new Date(now);
      from.setDate(now.getDate() - day);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case "last_30_days": {
      from = new Date(now);
      from.setDate(now.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    }
    case "this_month": {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    }
    case "this_fy": {
      // AU FY: 1 July → 30 June
      const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
      from = new Date(fyStartYear, 6, 1);
      to = new Date(fyStartYear + 1, 5, 30, 23, 59, 59, 999);
      if (to.getTime() > now.getTime()) to = new Date(now);
      break;
    }
    default:
      from = new Date(now);
      from.setDate(now.getDate() - 30);
  }
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

async function findStudentByName(ctx: Ctx, name: string) {
  const { data } = await ctx.supabase
    .from("students")
    .select("id, full_name, email, phone, parent_name, parent_email, parent_phone, default_rate, archived_at")
    .eq("organization_id", ctx.organizationId)
    .ilike("full_name", `%${name}%`)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .limit(5);
  return data ?? [];
}

async function findTutorByName(ctx: Ctx, name: string) {
  const { data } = await ctx.supabase
    .from("tutors")
    .select("id, full_name, email, pay_rate, archived_at")
    .eq("organization_id", ctx.organizationId)
    .ilike("full_name", `%${name}%`)
    .order("archived_at", { ascending: true, nullsFirst: true })
    .limit(5);
  return data ?? [];
}

// ---------- Tools ----------

export function buildTools(ctx: Ctx) {
  const getStudentSummary = tool({
    description:
      "Look up a student by (partial) name. Returns balance, prepaid sessions remaining, last completed session, next scheduled session, and parent contact info. Use this for any question about a specific student.",
    inputSchema: z.object({
      studentName: z.string().min(1).describe("Full or partial student name"),
    }),
    execute: async ({ studentName }) => {
      const matches = await findStudentByName(ctx, studentName);
      if (matches.length === 0) return { found: false, query: studentName };
      if (matches.length > 1) {
        return {
          found: true,
          ambiguous: true,
          candidates: matches.map((m) => ({ id: m.id, name: m.full_name })),
        };
      }
      const s = matches[0]!;

      const [{ data: bal }, { data: lastSession }, { data: nextSession }] =
        await Promise.all([
          ctx.supabase
            .from("student_balances")
            .select("balance, total_paid, total_billed, prepaid_sessions_remaining")
            .eq("student_id", s.id)
            .eq("organization_id", ctx.organizationId)
            .maybeSingle(),
          ctx.supabase
            .from("sessions")
            .select("id, start_time, topic, status, session_students!inner(student_id)")
            .eq("organization_id", ctx.organizationId)
            .eq("session_students.student_id", s.id)
            .in("status", ["completed", "cancelled_billable"])
            .order("start_time", { ascending: false })
            .limit(1)
            .maybeSingle(),
          ctx.supabase
            .from("sessions")
            .select("id, start_time, topic, status, session_students!inner(student_id)")
            .eq("organization_id", ctx.organizationId)
            .eq("session_students.student_id", s.id)
            .eq("status", "scheduled")
            .gte("start_time", new Date().toISOString())
            .order("start_time", { ascending: true })
            .limit(1)
            .maybeSingle(),
        ]);

      return {
        found: true,
        student: {
          id: s.id,
          name: s.full_name,
          email: s.email,
          phone: s.phone,
          archived: !!s.archived_at,
          default_rate: s.default_rate,
          parent_name: s.parent_name,
          parent_email: s.parent_email,
          parent_phone: s.parent_phone,
        },
        balance: bal ?? null,
        last_completed_session: lastSession
          ? { id: lastSession.id, date: lastSession.start_time, topic: lastSession.topic, status: lastSession.status }
          : null,
        next_scheduled_session: nextSession
          ? { id: nextSession.id, date: nextSession.start_time, topic: nextSession.topic }
          : null,
      };
    },
  });

  const listOverdueInvoices = tool({
    description:
      "List invoices that are unpaid (status sent or partial) and past their due date by at least the given number of days. Use this when the user asks who owes money or about overdue invoices.",
    inputSchema: z.object({
      daysOverdue: z.number().int().min(0).max(365).default(0),
    }),
    execute: async ({ daysOverdue }) => {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysOverdue);
      const cutoffIso = cutoff.toISOString().slice(0, 10);

      const { data: invoices } = await ctx.supabase
        .from("invoices")
        .select(
          "id, invoice_number, status, issue_date, due_date, amount, students(full_name, parent_email)",
        )
        .eq("organization_id", ctx.organizationId)
        .in("status", ["sent", "partial"])
        .not("due_date", "is", null)
        .lte("due_date", cutoffIso)
        .order("due_date", { ascending: true })
        .limit(50);

      if (!invoices || invoices.length === 0) return { count: 0, invoices: [] };

      const ids = invoices.map((i) => i.id);
      const { data: payments } = await ctx.supabase
        .from("invoice_payments")
        .select("invoice_id, amount")
        .in("invoice_id", ids);
      const paidMap = new Map<string, number>();
      for (const p of payments ?? []) {
        const row = p as { invoice_id: string; amount: number };
        paidMap.set(row.invoice_id, (paidMap.get(row.invoice_id) ?? 0) + Number(row.amount));
      }

      return {
        count: invoices.length,
        invoices: invoices.map((inv) => {
          const i = inv as unknown as {
            id: string;
            invoice_number: string;
            status: string;
            issue_date: string;
            due_date: string;
            amount: number;
            students: { full_name: string; parent_email: string | null } | null;
          };
          const paid = paidMap.get(i.id) ?? 0;
          return {
            invoice_number: i.invoice_number,
            student: i.students?.full_name ?? null,
            parent_email: i.students?.parent_email ?? null,
            status: i.status,
            issue_date: i.issue_date,
            due_date: i.due_date,
            total_amount: Number(i.amount),
            amount_paid: paid,
            balance_due: Number(i.amount) - paid,
            days_overdue: Math.max(
              0,
              Math.floor(
                (Date.now() - new Date(i.due_date).getTime()) / (1000 * 60 * 60 * 24),
              ),
            ),
          };
        }),
      };
    },
  });

  const getRevenueAndExpenses = tool({
    description:
      "Get total payments received (revenue) and total expenses for a period. Use for cash-flow / 'how much did we make' questions. Period is one of: this_week, this_month, last_30_days, this_fy.",
    inputSchema: z.object({
      period: z.enum(["this_week", "this_month", "last_30_days", "this_fy"]),
    }),
    execute: async ({ period }) => {
      const { from, to } = isoDateRangeForPeriod(period);
      const [{ data: pays }, { data: exps }] = await Promise.all([
        ctx.supabase
          .from("payments")
          .select("amount, payment_date, method")
          .eq("organization_id", ctx.organizationId)
          .gte("payment_date", from)
          .lte("payment_date", to),
        ctx.supabase
          .from("expenses")
          .select("amount, expense_date, category")
          .eq("organization_id", ctx.organizationId)
          .gte("expense_date", from)
          .lte("expense_date", to),
      ]);

      const revenue = (pays ?? []).reduce((s, p) => s + Number((p as { amount: number }).amount), 0);
      const expenses = (exps ?? []).reduce((s, e) => s + Number((e as { amount: number }).amount), 0);

      const expensesByCategory: Record<string, number> = {};
      for (const e of exps ?? []) {
        const row = e as { amount: number; category: string };
        expensesByCategory[row.category] = (expensesByCategory[row.category] ?? 0) + Number(row.amount);
      }

      return {
        period,
        from,
        to,
        revenue,
        expenses,
        net: revenue - expenses,
        payment_count: pays?.length ?? 0,
        expense_count: exps?.length ?? 0,
        expenses_by_category: expensesByCategory,
      };
    },
  });

  const listSessionsInRange = tool({
    description:
      "List tutoring sessions in a date range. Optionally filter by tutor name and/or student name (partial match). Returns up to 50 sessions ordered by start time. Use for schedule questions, tutor workload, attendance, etc.",
    inputSchema: z.object({
      from: z.string().describe("ISO date YYYY-MM-DD (inclusive)"),
      to: z.string().describe("ISO date YYYY-MM-DD (inclusive)"),
      tutorName: z.string().optional(),
      studentName: z.string().optional(),
    }),
    execute: async ({ from, to, tutorName, studentName }) => {
      let tutorId: string | null = null;
      if (tutorName) {
        const matches = await findTutorByName(ctx, tutorName);
        if (matches.length === 0) {
          return { found: false, message: `No tutor matching "${tutorName}"` };
        }
        tutorId = matches[0]!.id;
      }
      let studentId: string | null = null;
      if (studentName) {
        const matches = await findStudentByName(ctx, studentName);
        if (matches.length === 0) {
          return { found: false, message: `No student matching "${studentName}"` };
        }
        studentId = matches[0]!.id;
      }

      let q = ctx.supabase
        .from("sessions")
        .select(
          "id, start_time, end_time, topic, status, tutors(full_name), session_students(students(id, full_name))",
        )
        .eq("organization_id", ctx.organizationId)
        .gte("start_time", `${from}T00:00:00.000Z`)
        .lte("start_time", `${to}T23:59:59.999Z`)
        .order("start_time", { ascending: true })
        .limit(50);

      if (tutorId) q = q.eq("tutor_id", tutorId);

      const { data } = await q;
      let rows = (data ?? []) as unknown as Array<{
        id: string;
        start_time: string;
        end_time: string;
        topic: string | null;
        status: string;
        tutors: { full_name: string } | null;
        session_students: { students: { id: string; full_name: string } | null }[] | null;
      }>;

      if (studentId) {
        rows = rows.filter((r) =>
          (r.session_students ?? []).some((ss) => ss.students?.id === studentId),
        );
      }

      return {
        count: rows.length,
        sessions: rows.map((r) => ({
          id: r.id,
          start: r.start_time,
          end: r.end_time,
          duration_minutes: Math.round(
            (new Date(r.end_time).getTime() - new Date(r.start_time).getTime()) / 60000,
          ),
          topic: r.topic,
          status: r.status,
          tutor: r.tutors?.full_name ?? null,
          students: (r.session_students ?? [])
            .map((ss) => ss.students?.full_name)
            .filter((x): x is string => Boolean(x)),
        })),
      };
    },
  });

  const getTutorPayoutSummary = tool({
    description:
      "Compute total hours and pay owed to a tutor for a period (this_week, this_month, last_30_days, this_fy). Pay = hours × tutor pay_rate (uses session.tutor_pay_rate when set, else the tutor's current pay_rate). Includes only completed and cancelled_billable sessions.",
    inputSchema: z.object({
      tutorName: z.string().min(1),
      period: z.enum(["this_week", "this_month", "last_30_days", "this_fy"]),
    }),
    execute: async ({ tutorName, period }) => {
      const matches = await findTutorByName(ctx, tutorName);
      if (matches.length === 0) return { found: false, query: tutorName };
      const t = matches[0]!;
      const { from, to } = isoDateRangeForPeriod(period);

      const { data: sessions } = await ctx.supabase
        .from("sessions")
        .select("id, start_time, end_time, status, tutor_pay_rate")
        .eq("organization_id", ctx.organizationId)
        .eq("tutor_id", t.id)
        .in("status", ["completed", "cancelled_billable"])
        .gte("start_time", `${from}T00:00:00.000Z`)
        .lte("start_time", `${to}T23:59:59.999Z`);

      let totalHours = 0;
      let totalPay = 0;
      for (const s of sessions ?? []) {
        const row = s as { start_time: string; end_time: string; tutor_pay_rate: number | null };
        const hours =
          (new Date(row.end_time).getTime() - new Date(row.start_time).getTime()) / (1000 * 60 * 60);
        const rate = row.tutor_pay_rate ?? Number(t.pay_rate ?? 0);
        totalHours += hours;
        totalPay += hours * rate;
      }

      return {
        found: true,
        tutor: { id: t.id, name: t.full_name, current_pay_rate: Number(t.pay_rate ?? 0) },
        period,
        from,
        to,
        session_count: sessions?.length ?? 0,
        total_hours: Math.round(totalHours * 100) / 100,
        total_pay: Math.round(totalPay * 100) / 100,
      };
    },
  });

  return {
    getStudentSummary,
    listOverdueInvoices,
    getRevenueAndExpenses,
    listSessionsInRange,
    getTutorPayoutSummary,
  };
}
