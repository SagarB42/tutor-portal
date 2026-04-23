import "server-only";
import { requireOrg } from "./org";
import type { InvoiceRow, StudentBalanceRow } from "@/lib/db-types";

export type InvoiceWithStudent = InvoiceRow & {
  students: { id: string; full_name: string; email: string | null } | null;
};

export async function getInvoices(): Promise<InvoiceWithStudent[]> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("invoices")
    .select("*, students(id, full_name, email)")
    .eq("organization_id", organizationId)
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InvoiceWithStudent[];
}

export async function getInvoicesForStudent(
  studentId: string,
): Promise<InvoiceRow[]> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("student_id", studentId)
    .order("issue_date", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as InvoiceRow[];
}

export async function getInvoice(id: string): Promise<InvoiceRow | null> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as InvoiceRow | null;
}

export async function getStudentBalance(
  studentId: string,
): Promise<StudentBalanceRow | null> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("student_balances")
    .select("*")
    .eq("student_id", studentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as StudentBalanceRow | null;
}

export type InvoiceLineItem = {
  session_id: string;
  start_time: string;
  topic: string;
  hours: number;
  rate: number;
  amount: number;
};

/**
 * Returns unbilled billable lines for a student — sessions that are
 * completed or cancelled_billable and not yet linked to any invoice
 * (we treat the invoice.notes JSON "session_ids" list as the authoritative
 * link; a dedicated junction table can be added later if needed).
 */
export async function getBillableLinesForStudent(
  studentId: string,
): Promise<InvoiceLineItem[]> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("session_students")
    .select(
      "rate, sessions!inner(id, start_time, end_time, topic, status, organization_id)",
    )
    .eq("student_id", studentId)
    .eq("sessions.organization_id", organizationId);
  if (error) throw error;

  const rows =
    (data ?? []) as unknown as Array<{
      rate: number;
      sessions: {
        id: string;
        start_time: string;
        end_time: string;
        topic: string;
        status: string;
      };
    }>;

  return rows
    .filter(
      (r) =>
        r.sessions.status === "completed" ||
        r.sessions.status === "cancelled_billable",
    )
    .map((r) => {
      const hours =
        (new Date(r.sessions.end_time).getTime() -
          new Date(r.sessions.start_time).getTime()) /
        3_600_000;
      const amount = +(Number(r.rate) * hours).toFixed(2);
      return {
        session_id: r.sessions.id,
        start_time: r.sessions.start_time,
        topic: r.sessions.topic,
        hours: +hours.toFixed(2),
        rate: Number(r.rate),
        amount,
      };
    })
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
}
