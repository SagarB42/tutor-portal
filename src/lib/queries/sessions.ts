import "server-only";
import { requireOrg } from "./org";

const SESSION_SELECT =
  "id, start_time, end_time, topic, status, tutor_id, tutor_pay_rate, notes, cancellation_reason, session_students(rate, student_id, students(id, full_name))";

export async function getSessions() {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("sessions")
    .select(SESSION_SELECT)
    .eq("organization_id", organizationId)
    .order("start_time", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getSession(id: string) {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("sessions")
    .select(
      "*, session_students(rate, student_id, students(id, full_name)), tutors(id, full_name)",
    )
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getSessionResources(sessionId: string) {
  const { supabase } = await requireOrg();
  const { data, error } = await supabase
    .from("session_resources")
    .select(
      "id, notes, student_id, resource_id, students(id, full_name), resources(id, title, subject, url)",
    )
    .eq("session_id", sessionId);
  if (error) throw error;
  return data ?? [];
}

/** Recent sessions for dashboard overview. */
export async function getRecentSessions(limit = 5) {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("sessions")
    .select("id, topic, start_time, end_time, status, tutors(full_name)")
    .eq("organization_id", organizationId)
    .order("start_time", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
