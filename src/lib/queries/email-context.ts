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
      "id, start_time, end_time, topic, status, notes, tutors(full_name), session_students(students(id, full_name, email, parent_email, parent_name)), attendance(status, notes, students(id, full_name)), session_resources(notes, student_id, resources(title, subject, url))",
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
  type SessionResourcesJoin = {
    notes: string | null;
    student_id: string | null;
    resources: { title: string; subject: string | null; url: string | null } | null;
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
    session_resources: SessionResourcesJoin[] | null;
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

  // Resources shared in this session — filter to the recipient's student
  // when we know it, otherwise include all session-wide ones.
  const resourceLines = (s.session_resources ?? [])
    .filter((r) =>
      selectedStudent
        ? r.student_id === null || r.student_id === selectedStudent.id
        : true,
    )
    .map((r) => {
      const title = r.resources?.title ?? "Resource";
      const subject = r.resources?.subject ? ` (${r.resources.subject})` : "";
      const url = r.resources?.url ? ` — ${r.resources.url}` : "";
      const note = r.notes ? ` [note: ${r.notes}]` : "";
      return `- ${title}${subject}${url}${note}`;
    })
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
      resources_shared: resourceLines || null,
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

async function loadResourceAssignment(
  contextId: string,
  studentId: string | null,
  extraResourceIds: string[],
  extraStudentIds: string[],
): Promise<EmailPromptPayload> {
  const { supabase, organizationId, organizationName } = await requireOrg();

  // Fetch every resource in one query (primary + extras), all org-scoped.
  const allResourceIds = Array.from(new Set([contextId, ...extraResourceIds]));
  const { data: resources, error } = await supabase
    .from("resources")
    .select("id, title, subject, url, notes, grade_level")
    .in("id", allResourceIds)
    .eq("organization_id", organizationId);
  if (error) throw error;
  if (!resources || resources.length === 0) throw new Error("Resource not found");

  type ResRow = {
    id: string;
    title: string;
    subject: string | null;
    url: string | null;
    notes: string | null;
    grade_level: number | null;
  };
  const rows = resources as unknown as ResRow[];
  // Preserve user's order: primary first, then extras in the order received.
  const ordered = allResourceIds
    .map((id) => rows.find((r) => r.id === id))
    .filter((r): r is ResRow => Boolean(r));

  // Recipient — use the first selected student.
  const allStudentIds = Array.from(
    new Set([studentId, ...extraStudentIds].filter((x): x is string => Boolean(x))),
  );
  let students: Array<{
    id: string;
    full_name: string;
    email: string | null;
    parent_name: string | null;
    parent_email: string | null;
  }> = [];
  if (allStudentIds.length > 0) {
    const { data: studs } = await supabase
      .from("students")
      .select("id, full_name, email, parent_name, parent_email")
      .in("id", allStudentIds)
      .eq("organization_id", organizationId);
    students = (studs ?? []) as typeof students;
  }
  const primaryStudent =
    students.find((s) => s.id === studentId) ?? students[0] ?? null;

  // One bullet per resource so the AI can include URLs verbatim in the body.
  const resourceLines = ordered
    .map((r) => {
      const subj = r.subject ? ` (${r.subject})` : "";
      const url = r.url ?? "[no URL]";
      const note = r.notes ? ` — ${r.notes}` : "";
      return `- ${r.title}${subj}: ${url}${note}`;
    })
    .join("\n");

  const studentNames = students.map((s) => s.full_name).join(", ");

  return {
    title:
      ordered.length === 1
        ? `Resource: ${ordered[0]!.title}`
        : `Resources: ${ordered.map((r) => r.title).join(", ")}`,
    organizationName,
    recipient: primaryStudent
      ? {
          name: primaryStudent.parent_name ?? primaryStudent.full_name,
          email: primaryStudent.parent_email ?? primaryStudent.email,
        }
      : null,
    studentId: primaryStudent?.id ?? null,
    facts: {
      resource_count: ordered.length,
      resources: resourceLines,
      students: studentNames || null,
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
  extras: { extraResourceIds?: string[]; extraStudentIds?: string[] } = {},
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
      return loadResourceAssignment(
        contextId,
        studentId,
        extras.extraResourceIds ?? [],
        extras.extraStudentIds ?? [],
      );
    case "marketing":
    case "custom":
      return loadMarketing();
  }
}
