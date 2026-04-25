import { NextResponse } from "next/server";
import { requireOrg } from "@/lib/queries/org";

/**
 * Returns selectable items for the email compose dialog's "context picker".
 * One route handles every context type so the client only needs a single
 * fetch path. All queries are scoped to the caller's organization.
 *
 *   GET /api/emails/picker?type=invoice_reminder
 *   GET /api/emails/picker?type=session_summary
 *   GET /api/emails/picker?type=attendance_absence
 *   GET /api/emails/picker?type=resource_assignment
 *   GET /api/emails/picker?type=prepaid_topup
 *
 * Each item carries enough metadata for the client to:
 *   - render a friendly label (label + sublabel)
 *   - auto-fill the recipient email/name
 *   - link the draft to the right student (studentId)
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type EmailOption = { email: string; label: string };

type PickerItem = {
  id: string;
  label: string;
  sublabel?: string;
  /** Short status string rendered as a badge on the right of the row. */
  status?: string;
  /** Tertiary line shown small/muted below the sublabel (e.g. date/time). */
  meta?: string;
  recipientEmail?: string | null;
  recipientName?: string | null;
  studentId?: string | null;
  contextField: "contextId" | "studentId";
  /**
   * Suggested addresses for the To field. Each option is labelled
   * (e.g. "Parent of Liam Smith", "Liam Smith (student)").
   */
  emailOptions?: EmailOption[];
  /**
   * For multi-student contexts (e.g. group sessions), the full set of
   * students attached to this item. The dialog uses this to render a
   * secondary student picker when there is more than one.
   */
  students?: {
    id: string;
    name: string;
    parentName?: string | null;
    parentEmail?: string | null;
    studentEmail?: string | null;
  }[];
};

function buildEmailOptions(
  student: {
    full_name: string;
    parent_name: string | null;
    parent_email: string | null;
    email: string | null;
  } | null,
): EmailOption[] {
  if (!student) return [];
  const opts: EmailOption[] = [];
  if (student.parent_email) {
    opts.push({
      email: student.parent_email,
      label: student.parent_name
        ? `${student.parent_name} (parent of ${student.full_name})`
        : `Parent of ${student.full_name}`,
    });
  }
  if (student.email) {
    opts.push({
      email: student.email,
      label: `${student.full_name} (student)`,
    });
  }
  return opts;
}

function fmtPrettyDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "AUD",
  }).format(n);
}

export async function GET(req: Request) {
  try {
    const { supabase, organizationId } = await requireOrg();
    const url = new URL(req.url);
    const type = url.searchParams.get("type") ?? "";

    if (type === "invoice_reminder") {
      const { data, error } = await supabase
        .from("invoices")
        .select(
          "id, invoice_number, status, due_date, amount, students(id, full_name, parent_name, parent_email, email)",
        )
        .eq("organization_id", organizationId)
        .in("status", ["draft", "sent", "partial"])
        .order("issue_date", { ascending: false })
        .limit(100);
      if (error) throw error;
      const items: PickerItem[] = (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          invoice_number: string;
          status: string;
          due_date: string | null;
          amount: number;
          students: {
            id: string;
            full_name: string;
            parent_name: string | null;
            parent_email: string | null;
            email: string | null;
          } | null;
        };
        return {
          id: r.id,
          label: r.invoice_number,
          sublabel: `${r.students?.full_name ?? "—"} · ${fmtMoney(Number(r.amount))}`,
          status: r.status,
          meta: r.due_date ? `Due ${new Date(r.due_date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}` : undefined,
          recipientEmail: r.students?.parent_email ?? r.students?.email ?? null,
          recipientName: r.students?.parent_name ?? r.students?.full_name ?? null,
          studentId: r.students?.id ?? null,
          contextField: "contextId",
          emailOptions: buildEmailOptions(r.students),
        };
      });
      return NextResponse.json({ items });
    }

    if (type === "session_summary") {
      const { data, error } = await supabase
        .from("sessions")
        .select(
          "id, start_time, topic, status, session_students(students(id, full_name, parent_name, parent_email, email))",
        )
        .eq("organization_id", organizationId)
        .order("start_time", { ascending: false })
        .limit(100);
      if (error) throw error;
      const items: PickerItem[] = (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          start_time: string;
          topic: string | null;
          status: string;
          session_students:
            | {
                students: {
                  id: string;
                  full_name: string;
                  parent_name: string | null;
                  parent_email: string | null;
                  email: string | null;
                } | null;
              }[]
            | null;
        };
        const first = r.session_students?.[0]?.students ?? null;
        const allStudents = (r.session_students ?? [])
          .map((ss) => ss.students)
          .filter((x): x is NonNullable<typeof x> => Boolean(x));
        const studentNames =
          allStudents.map((st) => st.full_name).join(", ") || "—";
        return {
          id: r.id,
          label: r.topic ?? "Tutoring session",
          sublabel: studentNames,
          status: r.status,
          meta: fmtPrettyDate(r.start_time),
          recipientEmail: first?.parent_email ?? first?.email ?? null,
          recipientName: first?.parent_name ?? first?.full_name ?? null,
          studentId: first?.id ?? null,
          contextField: "contextId",
          // Aggregate every student's parent + student emails so the user
          // can send to one or many recipients.
          emailOptions: allStudents.flatMap((st) => buildEmailOptions(st)),
          students: allStudents.map((st) => ({
            id: st.id,
            name: st.full_name,
            parentName: st.parent_name,
            parentEmail: st.parent_email ?? null,
            studentEmail: st.email ?? null,
          })),
        };
      });
      return NextResponse.json({ items });
    }

    if (type === "attendance_absence") {
      const { data, error } = await supabase
        .from("attendance")
        .select(
          "id, status, sessions!inner(start_time, topic, organization_id), students(id, full_name, parent_name, parent_email, email)",
        )
        .eq("sessions.organization_id", organizationId)
        .in("status", ["absent", "excused", "late"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const items: PickerItem[] = (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          status: string;
          sessions: { start_time: string; topic: string | null } | null;
          students: {
            id: string;
            full_name: string;
            parent_name: string | null;
            parent_email: string | null;
            email: string | null;
          } | null;
        };
        return {
          id: r.id,
          label: r.students?.full_name ?? "—",
          sublabel: r.sessions?.topic ?? "Session",
          status: r.status,
          meta: r.sessions ? fmtPrettyDate(r.sessions.start_time) : undefined,
          recipientEmail: r.students?.parent_email ?? r.students?.email ?? null,
          recipientName: r.students?.parent_name ?? r.students?.full_name ?? null,
          studentId: r.students?.id ?? null,
          contextField: "contextId",
          emailOptions: buildEmailOptions(r.students),
        };
      });
      return NextResponse.json({ items });
    }

    if (type === "resource_assignment") {
      const { data, error } = await supabase
        .from("resources")
        .select("id, title, subject, grade_level")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const items: PickerItem[] = (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          title: string;
          subject: string | null;
          grade_level: number | null;
        };
        return {
          id: r.id,
          label: r.title,
          sublabel: [r.subject, r.grade_level ? `Year ${r.grade_level}` : null]
            .filter(Boolean)
            .join(" · "),
          // Resource has no inherent recipient — caller can pick a student separately.
          contextField: "contextId",
        };
      });
      return NextResponse.json({ items });
    }

    if (type === "prepaid_topup") {
      const { data, error } = await supabase
        .from("students")
        .select("id, full_name, parent_name, parent_email, email")
        .eq("organization_id", organizationId)
        .is("archived_at", null)
        .order("full_name", { ascending: true })
        .limit(500);
      if (error) throw error;
      const items: PickerItem[] = (data ?? []).map((row) => {
        const r = row as unknown as {
          id: string;
          full_name: string;
          parent_name: string | null;
          parent_email: string | null;
          email: string | null;
        };
        return {
          id: r.id,
          label: r.full_name,
          sublabel: r.parent_name ?? undefined,
          recipientEmail: r.parent_email ?? r.email ?? null,
          recipientName: r.parent_name ?? r.full_name,
          studentId: r.id,
          contextField: "studentId",
          emailOptions: buildEmailOptions(r),
        };
      });
      return NextResponse.json({ items });
    }

    return NextResponse.json({ items: [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
