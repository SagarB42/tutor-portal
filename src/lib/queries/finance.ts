import "server-only";
import { requireOrg } from "./org";

export async function getPayments() {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("payments")
    .select("*, students(full_name)")
    .eq("organization_id", organizationId)
    .order("payment_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getExpenses() {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("organization_id", organizationId)
    .order("expense_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getFinanceSnapshot() {
  const { supabase, organizationId } = await requireOrg();
  const [payments, expenses, sessionStudents, sessions, students, tutors] =
    await Promise.all([
      supabase
        .from("payments")
        .select("*, students(full_name)")
        .eq("organization_id", organizationId)
        .order("payment_date", { ascending: false }),
      supabase
        .from("expenses")
        .select("*")
        .eq("organization_id", organizationId)
        .order("expense_date", { ascending: false }),
      supabase
        .from("session_students")
        .select("student_id, rate, sessions!inner(start_time, end_time, status, organization_id)")
        .eq("sessions.organization_id", organizationId),
      supabase
        .from("sessions")
        .select("id, start_time, end_time, status, tutor_pay_rate, tutor_id")
        .eq("organization_id", organizationId),
      supabase
        .from("students")
        .select("id, full_name")
        .eq("organization_id", organizationId),
      supabase
        .from("tutors")
        .select("id, full_name")
        .eq("organization_id", organizationId),
    ]);

  return {
    payments: payments.data ?? [],
    expenses: expenses.data ?? [],
    sessionStudents: sessionStudents.data ?? [],
    sessions: sessions.data ?? [],
    students: students.data ?? [],
    tutors: tutors.data ?? [],
  };
}

export async function getOverviewStats() {
  const { supabase, organizationId } = await requireOrg();
  const [students, tutors, sessions, sessionStudents] = await Promise.all([
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null),
    supabase
      .from("tutors")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("archived_at", null),
    supabase
      .from("sessions")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId),
    supabase
      .from("session_students")
      .select("rate, sessions!inner(start_time, end_time, status, organization_id)")
      .eq("sessions.organization_id", organizationId),
  ]);

  return {
    studentCount: students.count ?? 0,
    tutorCount: tutors.count ?? 0,
    sessionCount: sessions.count ?? 0,
    sessionStudents: sessionStudents.data ?? [],
  };
}
