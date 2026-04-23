"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/queries/org";
import { availabilitySchema, type AvailabilityInput } from "@/lib/schemas";
import { fail, ok, type ActionResult } from "./result";

function revalidate(ownerType: "tutor" | "student", ownerId: string) {
  revalidatePath(`/dashboard/${ownerType}s/${ownerId}`);
  revalidatePath("/dashboard/calendar");
}

export async function createAvailability(
  input: AvailabilityInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const v = parsed.data;
  const { data, error } = await supabase
    .from("availabilities")
    .insert({
      organization_id: organizationId,
      owner_type: v.owner_type,
      tutor_id: v.tutor_id ?? null,
      student_id: v.student_id ?? null,
      day_of_week: v.day_of_week,
      start_time_of_day: v.start_time_of_day,
      end_time_of_day: v.end_time_of_day,
      effective_from: v.effective_from ?? null,
      effective_until: v.effective_until ?? null,
    })
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidate(v.owner_type, (v.tutor_id ?? v.student_id)!);
  return ok({ id: data.id });
}

export async function updateAvailability(
  id: string,
  input: AvailabilityInput,
): Promise<ActionResult> {
  const parsed = availabilitySchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const v = parsed.data;
  const { error } = await supabase
    .from("availabilities")
    .update({
      day_of_week: v.day_of_week,
      start_time_of_day: v.start_time_of_day,
      end_time_of_day: v.end_time_of_day,
      effective_from: v.effective_from ?? null,
      effective_until: v.effective_until ?? null,
    })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate(v.owner_type, (v.tutor_id ?? v.student_id)!);
  return ok();
}

export async function deleteAvailability(
  id: string,
  ownerType: "tutor" | "student",
  ownerId: string,
): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("availabilities")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate(ownerType, ownerId);
  return ok();
}
