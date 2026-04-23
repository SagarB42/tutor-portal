import "server-only";
import { requireOrg } from "./org";
import type { AvailabilityRow } from "@/lib/db-types";

export async function getTutorAvailabilities(
  tutorId: string,
): Promise<AvailabilityRow[]> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("availabilities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("tutor_id", tutorId)
    .order("day_of_week")
    .order("start_time_of_day");
  if (error) throw error;
  return data ?? [];
}

export async function getStudentAvailabilities(
  studentId: string,
): Promise<AvailabilityRow[]> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("availabilities")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("student_id", studentId)
    .order("day_of_week")
    .order("start_time_of_day");
  if (error) throw error;
  return data ?? [];
}

export async function getAvailabilitiesForTutorAndStudents(
  tutorId: string,
  studentIds: string[],
): Promise<AvailabilityRow[]> {
  const { supabase, organizationId } = await requireOrg();
  const ids = Array.from(new Set(studentIds.filter(Boolean)));
  const { data, error } = await supabase
    .from("availabilities")
    .select("*")
    .eq("organization_id", organizationId)
    .or(
      [
        `tutor_id.eq.${tutorId}`,
        ids.length ? `student_id.in.(${ids.join(",")})` : null,
      ]
        .filter(Boolean)
        .join(","),
    );
  if (error) throw error;
  return data ?? [];
}
