"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/queries/org";
import { resourceSchema, type ResourceInput } from "@/lib/schemas";
import { fail, ok, type ActionResult } from "./result";

function revalidate() {
  revalidatePath("/dashboard/resources");
  revalidatePath("/dashboard/sessions");
}

export async function createResource(
  input: ResourceInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("resources")
    .insert({ ...parsed.data, organization_id: organizationId })
    .select("id")
    .single();

  if (error) return fail(error.message);
  revalidate();
  return ok({ id: data.id });
}

export async function updateResource(
  id: string,
  input: ResourceInput,
): Promise<ActionResult> {
  const parsed = resourceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("resources")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteResource(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  // session_resources has no ON DELETE CASCADE for resource_id — cleanup first.
  const { error: junctionError } = await supabase
    .from("session_resources")
    .delete()
    .eq("resource_id", id);
  if (junctionError) return fail(junctionError.message);

  const { error } = await supabase
    .from("resources")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}
