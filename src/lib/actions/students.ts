"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/queries/org";
import { studentSchema, type StudentInput } from "@/lib/schemas";
import { fail, ok, type ActionResult } from "./result";

function revalidate() {
  revalidatePath("/dashboard/students");
  revalidatePath("/dashboard");
}

export async function createStudent(
  input: StudentInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("students")
    .insert({ ...parsed.data, organization_id: organizationId })
    .select("id")
    .single();

  if (error) return fail(error.message);
  revalidate();
  return ok({ id: data.id });
}

export async function updateStudent(
  id: string,
  input: StudentInput,
): Promise<ActionResult> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("students")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organizationId);

  if (error) return fail(error.message);
  revalidate();
  revalidatePath(`/dashboard/students/${id}`);
  return ok();
}

export async function archiveStudent(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("students")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function restoreStudent(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("students")
    .update({ archived_at: null })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteStudent(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}
