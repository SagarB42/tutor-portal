import "server-only";
import { requireOrg } from "./org";

export async function getResources() {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("organization_id", organizationId)
    .order("title");
  if (error) throw error;
  return data ?? [];
}

export async function getResource(id: string) {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
