import "server-only";
import { requireOrg } from "./org";

export async function getTutors(options?: { includeArchived?: boolean }) {
  const { supabase, organizationId } = await requireOrg();
  let query = supabase
    .from("tutors")
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

export async function getAllTutors() {
  return getTutors({ includeArchived: true });
}

export async function getTutor(id: string) {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("tutors")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
