import "server-only";
import { requireOrg } from "./org";
import type { AttendanceRow, AttendanceStatus } from "@/lib/db-types";

export async function getSessionAttendance(
  sessionId: string,
): Promise<AttendanceRow[]> {
  const { supabase } = await requireOrg();
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw error;
  return data ?? [];
}

export type StudentAttendanceHistoryItem = {
  session_id: string;
  start_time: string;
  end_time: string;
  topic: string;
  status: AttendanceStatus;
};

export async function getStudentAttendanceHistory(
  studentId: string,
  limit = 200,
): Promise<StudentAttendanceHistoryItem[]> {
  const { supabase } = await requireOrg();
  const { data, error } = await supabase
    .from("attendance")
    .select(
      "status, session_id, sessions(start_time, end_time, topic)",
    )
    .eq("student_id", studentId)
    .order("session_id", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows =
    (data ?? []) as unknown as Array<{
      status: AttendanceStatus;
      session_id: string;
      sessions: {
        start_time: string;
        end_time: string;
        topic: string;
      } | null;
    }>;
  return rows
    .filter((r) => r.sessions)
    .map((r) => ({
      session_id: r.session_id,
      start_time: r.sessions!.start_time,
      end_time: r.sessions!.end_time,
      topic: r.sessions!.topic,
      status: r.status,
    }))
    .sort(
      (a, b) =>
        new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
    );
}

/**
 * Aggregate attendance for all sessions in a date range (used by calendar
 * day hover tooltip). Returns one row per session with a counts object.
 */
export async function getAttendanceCountsInRange(
  fromIso: string,
  toIso: string,
): Promise<
  Array<{
    session_id: string;
    counts: Record<AttendanceStatus, number>;
  }>
> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("attendance")
    .select("session_id, status, sessions!inner(organization_id, start_time)")
    .eq("sessions.organization_id", organizationId)
    .gte("sessions.start_time", fromIso)
    .lt("sessions.start_time", toIso);
  if (error) throw error;
  const rows =
    (data ?? []) as unknown as Array<{
      session_id: string;
      status: AttendanceStatus;
    }>;
  const byId = new Map<string, Record<AttendanceStatus, number>>();
  for (const r of rows) {
    const rec =
      byId.get(r.session_id) ??
      ({
        pending: 0,
        present: 0,
        absent: 0,
        excused: 0,
        late: 0,
      } as Record<AttendanceStatus, number>);
    rec[r.status] = (rec[r.status] ?? 0) + 1;
    byId.set(r.session_id, rec);
  }
  return Array.from(byId, ([session_id, counts]) => ({ session_id, counts }));
}
