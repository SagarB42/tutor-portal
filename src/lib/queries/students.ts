import "server-only";
import { requireOrg } from "./org";

export async function getStudents(options?: { includeArchived?: boolean }) {
  const { supabase, organizationId } = await requireOrg();
  let query = supabase
    .from("students")
    .select("*")
    .eq("organization_id", organizationId)
    .order("full_name");
  if (!options?.includeArchived) {
    query = query.is("archived_at", null);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function getAllStudents() {
  return getStudents({ includeArchived: true });
}

export async function getStudent(id: string) {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
