"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/queries/org";
import { tutorSchema, type TutorInput } from "@/lib/schemas";
import { fail, ok, type ActionResult } from "./result";

function revalidate() {
  revalidatePath("/dashboard/tutors");
  revalidatePath("/dashboard");
}

export async function createTutor(
  input: TutorInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = tutorSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("tutors")
    .insert({ ...parsed.data, organization_id: organizationId })
    .select("id")
    .single();

  if (error) return fail(error.message);
  revalidate();
  return ok({ id: data.id });
}

export async function updateTutor(
  id: string,
  input: TutorInput,
): Promise<ActionResult> {
  const parsed = tutorSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("tutors")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) return fail(error.message);
  revalidate();
  revalidatePath(`/dashboard/tutors/${id}`);
  return ok();
}

export async function archiveTutor(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("tutors")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function restoreTutor(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("tutors")
    .update({ archived_at: null })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteTutor(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("tutors")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}
