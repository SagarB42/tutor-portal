import "server-only";
import { requireOrg } from "./org";

export type CalendarSession = {
  id: string;
  start_time: string;
  end_time: string;
  topic: string;
  status: string;
  tutor_id: string | null;
  tutor_name: string | null;
  student_names: string[];
};

export async function getSessionsInRange(
  fromIso: string,
  toIso: string,
): Promise<CalendarSession[]> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "id, start_time, end_time, topic, status, tutor_id, tutors(full_name), session_students(students(full_name))",
    )
    .eq("organization_id", organizationId)
    .gte("start_time", fromIso)
    .lt("start_time", toIso)
    .order("start_time", { ascending: true });
  if (error) throw error;

  const rows =
    (data ?? []) as unknown as Array<{
      id: string;
      start_time: string;
      end_time: string;
      topic: string;
      status: string;
      tutor_id: string | null;
      tutors: { full_name: string } | null;
      session_students: Array<{ students: { full_name: string } | null }>;
    }>;

  return rows.map((r) => ({
    id: r.id,
    start_time: r.start_time,
    end_time: r.end_time,
    topic: r.topic,
    status: r.status,
    tutor_id: r.tutor_id,
    tutor_name: r.tutors?.full_name ?? null,
    student_names: r.session_students
      .map((ss) => ss.students?.full_name)
      .filter((n): n is string => !!n),
  }));
}
