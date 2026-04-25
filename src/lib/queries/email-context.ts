import "server-only";
import { requireOrg } from "./org";
import type { EmailDraftContext } from "@/lib/db-types";

export type EmailPromptPayload = {
  title: string;
  facts: Record<string, string | number | null | undefined>;
  recipient: {
    name: string | null;
    email: string | null;
  } | null;
  organizationName: string;
  studentId: string | null;
};

async function loadSessionSummary(
  contextId: string,
  studentId: string | null,
): Promise<EmailPromptPayload> {
  const { supabase, organizationId, organizationName } = await requireOrg();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, start_time, end_time, topic, status, notes, tutors(full_name), session_students(students(id, full_name, email, parent_email, parent_name)), attendance(status, notes, students(id, full_name))",
    )
    .eq("id", contextId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Session not found");

  type SessionStudentsJoin = {
    students: {
      id: string;
      full_name: string;
      email: string | null;
      parent_email: string | null;
      parent_name: string | null;
    } | null;
  };
  type AttendanceJoin = {
    status: string;
    notes: string | null;
    students: { id: string; full_name: string } | null;
  };
  const s = data as unknown as {
    id: string;
    start_time: string;
    end_time: string;
    topic: string | null;
    status: string;
    notes: string | null;
    tutors: { full_name: string } | null;
    session_students: SessionStudentsJoin[] | null;
    attendance: AttendanceJoin[] | null;
  };

  const allStudents = (s.session_students ?? [])
    .map((ss) => ss.students)
    .filter((x): x is NonNullable<typeof x> => Boolean(x));
  const selectedStudent =
    (studentId && allStudents.find((st) => st.id === studentId)) ||
    allStudents[0] ||
    null;
  const attendanceLines = (s.attendance ?? [])
    .map((a) => `- ${a.students?.full_name ?? "Student"}: ${a.status}${a.notes ? ` (${a.notes})` : ""}`)
    .join("\n");

  return {
    title: `Session summary: ${s.topic ?? "Tutoring session"}`,
    organizationName,
    recipient: selectedStudent
      ? {
          name: selectedStudent.parent_name ?? selectedStudent.full_name,
          email: selectedStudent.parent_email ?? selectedStudent.email,
        }
      : null,
    studentId: selectedStudent?.id ?? null,
    facts: {
      student: selectedStudent?.full_name ?? null,
      topic: s.topic ?? null,
      date: new Date(s.start_time).toLocaleString(undefined, {
        dateStyle: "full",
        timeStyle: "short",
      }),
      duration_minutes: Math.round(
        (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000,
      ),
      tutor: s.tutors?.full_name ?? null,
      status: s.status,
      tutor_notes: s.notes ?? null,
      attendance: attendanceLines || null,
    },
  };
}

async function loadInvoiceReminder(contextId: string): Promise<EmailPromptPayload> {
  const { supabase, organizationId, organizationName } = await requireOrg();
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id, invoice_number, status, issue_date, due_date, amount, students(id, full_name, email, parent_email, parent_name)",
    )
    .eq("id", contextId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Invoice not found");

  const inv = data as unknown as {
    id: string;
    invoice_number: string;
    status: string;
    issue_date: string;
    due_date: string | null;
    amount: number;
    students: {
      id: string;
      full_name: string;
      email: string | null;
      parent_email: string | null;
      parent_name: string | null;
    } | null;
  };

  const { data: payments } = await supabase
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", contextId);
  const paid = (payments ?? []).reduce(
    (sum, p) => sum + Number((p as { amount: number }).amount),
    0,
  );
  const balance = Number(inv.amount) - paid;

  return {
    title: `Invoice reminder: ${inv.invoice_number}`,
    organizationName,
    recipient: inv.students
      ? {
          name: inv.students.parent_name ?? inv.students.full_name,
          email: inv.students.parent_email ?? inv.students.email,
        }
      : null,
    studentId: inv.students?.id ?? null,
    facts: {
      invoice_number: inv.invoice_number,
      status: inv.status,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      total_amount: inv.amount,
      amount_paid: paid,
      balance_due: balance,
      student: inv.students?.full_name ?? null,
    },
  };
}

async function loadPrepaidTopup(studentId: string): Promise<EmailPromptPayload> {
  const { supabase, organizationId, organizationName } = await requireOrg();
  const { data: student, error: sErr } = await supabase
    .from("students")
    .select("id, full_name, email, parent_email, parent_name")
    .eq("id", studentId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (sErr) throw sErr;
  if (!student) throw new Error("Student not found");

  const { data: bal } = await supabase
    .from("student_balances")
    .select("*")
    .eq("student_id", studentId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  const s = student as unknown as {
    id: string;
    full_name: string;
    email: string | null;
    parent_email: string | null;
    parent_name: string | null;
  };

  return {
    title: `Prepaid top-up for ${s.full_name}`,
    organizationName,
    recipient: {
      name: s.parent_name ?? s.full_name,
      email: s.parent_email ?? s.email,
    },
    studentId: s.id,
    facts: {
      student: s.full_name,
      prepaid_balance: (bal as { prepaid_balance?: number } | null)?.prepaid_balance ?? 0,
      lifetime_paid: (bal as { lifetime_paid?: number } | null)?.lifetime_paid ?? 0,
      lifetime_billed: (bal as { lifetime_billed?: number } | null)?.lifetime_billed ?? 0,
    },
  };
}

async function loadAttendanceAbsence(contextId: string): Promise<EmailPromptPayload> {
  const { supabase, organizationId, organizationName } = await requireOrg();
  const { data, error } = await supabase
    .from("attendance")
    .select(
      "id, status, notes, sessions(start_time, end_time, topic), students(id, full_name, email, parent_email, parent_name)",
    )
    .eq("id", contextId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Attendance record not found");

  const a = data as unknown as {
    id: string;
    status: string;
    notes: string | null;
    sessions: { start_time: string; end_time: string; topic: string | null } | null;
    students: {
      id: string;
      full_name: string;
      email: string | null;
      parent_email: string | null;
      parent_name: string | null;
    } | null;
  };
  // Scope check — look up student through org
  if (a.students) {
    const { data: ok } = await supabase
      .from("students")
      .select("id")
      .eq("id", a.students.id)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!ok) throw new Error("Attendance out of scope");
  }

  return {
    title: `Missed session follow-up`,
    organizationName,
    recipient: a.students
      ? {
          name: a.students.parent_name ?? a.students.full_name,
          email: a.students.parent_email ?? a.students.email,
        }
      : null,
    studentId: a.students?.id ?? null,
    facts: {
      student: a.students?.full_name ?? null,
      status: a.status,
      topic: a.sessions?.topic ?? null,
      date: a.sessions
        ? new Date(a.sessions.start_time).toLocaleString(undefined, {
            dateStyle: "full",
            timeStyle: "short",
          })
        : null,
      notes: a.notes ?? null,
    },
  };
}

async function loadResourceAssignment(contextId: string): Promise<EmailPromptPayload> {
  const { supabase, organizationId, organizationName } = await requireOrg();
  const { data, error } = await supabase
    .from("resources")
    .select("id, title, subject, url, notes, grade_level")
    .eq("id", contextId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Resource not found");

  const r = data as unknown as {
    id: string;
    title: string;
    subject: string | null;
    url: string | null;
    notes: string | null;
    grade_level: number | null;
  };

  return {
    title: `Resource: ${r.title}`,
    organizationName,
    recipient: null,
    studentId: null,
    facts: {
      title: r.title,
      subject: r.subject,
      grade_level: r.grade_level,
      url: r.url,
      notes: r.notes,
    },
  };
}

async function loadMarketing(): Promise<EmailPromptPayload> {
  const { organizationName } = await requireOrg();
  return {
    title: "Marketing email",
    organizationName,
    recipient: null,
    studentId: null,
    facts: {},
  };
}

export async function loadEmailContext(
  contextType: EmailDraftContext,
  contextId: string | null,
  studentId: string | null,
): Promise<EmailPromptPayload> {
  switch (contextType) {
    case "session_summary":
      if (!contextId) throw new Error("Session id required");
      return loadSessionSummary(contextId, studentId);
    case "invoice_reminder":
      if (!contextId) throw new Error("Invoice id required");
      return loadInvoiceReminder(contextId);
    case "prepaid_topup":
      if (!studentId) throw new Error("Student id required");
      return loadPrepaidTopup(studentId);
    case "attendance_absence":
      if (!contextId) throw new Error("Attendance id required");
      return loadAttendanceAbsence(contextId);
    case "resource_assignment":
      if (!contextId) throw new Error("Resource id required");
      return loadResourceAssignment(contextId);
    case "marketing":
    case "custom":
      return loadMarketing();
  }
}
