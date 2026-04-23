"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/queries/org";
import {
  sessionSchema,
  type SessionInput,
  sessionResourceSchema,
  type SessionResourceInput,
  sessionRecurrenceSchema,
  type SessionRecurrenceInput,
} from "@/lib/schemas";
import { fail, ok, type ActionResult } from "./result";

function revalidate(sessionId?: string) {
  revalidatePath("/dashboard/sessions");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/calendar");
  if (sessionId) revalidatePath(`/dashboard/sessions/${sessionId}`);
}

/** Translate Postgres exclusion / trigger errors into user-friendly copy. */
function translateSchedulingError(err: { code?: string; message: string }) {
  if (err.code === "23P01") {
    return "Tutor is already booked for an overlapping session.";
  }
  if (/already booked in an overlapping session/i.test(err.message)) {
    return "Student is already booked for an overlapping session.";
  }
  return err.message;
}

export async function createSession(
  input: SessionInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { students, ...session } = parsed.data;

  const { data, error } = await supabase.rpc("create_session_with_students", {
    p_organization_id: organizationId,
    p_tutor_id: session.tutor_id,
    p_start_time: session.start_time,
    p_end_time: session.end_time,
    p_topic: session.topic,
    p_status: session.status,
    p_notes: session.notes,
    p_cancellation_reason: session.cancellation_reason,
    p_tutor_pay_rate: session.tutor_pay_rate ?? null,
    p_students: students,
  });

  if (error) return fail(translateSchedulingError(error));
  revalidate();
  return ok({ id: data as string });
}

export async function updateSession(
  id: string,
  input: SessionInput,
): Promise<ActionResult> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase } = await requireOrg();
  const { students, ...session } = parsed.data;

  const { error } = await supabase.rpc("update_session_with_students", {
    p_session_id: id,
    p_tutor_id: session.tutor_id,
    p_start_time: session.start_time,
    p_end_time: session.end_time,
    p_topic: session.topic,
    p_status: session.status,
    p_notes: session.notes,
    p_cancellation_reason: session.cancellation_reason,
    p_tutor_pay_rate: session.tutor_pay_rate ?? null,
    p_students: students,
  });

  if (error) return fail(translateSchedulingError(error));
  revalidate(id);
  return ok();
}

export async function deleteSession(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  // session_students / session_resources cascade on session_id.
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function linkResourceToSession(
  input: SessionResourceInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = sessionResourceSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase } = await requireOrg();

  // Defence-in-depth: ensure the student belongs to the session.
  const { data: belongs, error: checkErr } = await supabase
    .from("session_students")
    .select("session_id")
    .eq("session_id", parsed.data.session_id)
    .eq("student_id", parsed.data.student_id)
    .maybeSingle();
  if (checkErr) return fail(checkErr.message);
  if (!belongs) return fail("Selected student is not part of this session");

  const { data, error } = await supabase
    .from("session_resources")
    .insert(parsed.data)
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidate(parsed.data.session_id);
  return ok({ id: data.id });
}

export async function unlinkResourceFromSession(
  id: string,
  sessionId: string,
): Promise<ActionResult> {
  const { supabase } = await requireOrg();
  const { error } = await supabase
    .from("session_resources")
    .delete()
    .eq("id", id);
  if (error) return fail(error.message);
  revalidate(sessionId);
  return ok();
}

/** Create a session_series + N repeating sessions in a single RPC call. */
export async function createRecurringSessions(
  input: SessionInput,
  recurrence: SessionRecurrenceInput,
): Promise<ActionResult<{ series_id: string }>> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Invalid data");
  const parsedRec = sessionRecurrenceSchema.safeParse(recurrence);
  if (!parsedRec.success)
    return fail(parsedRec.error.issues[0]?.message ?? "Invalid recurrence");

  const { supabase, organizationId } = await requireOrg();
  const { students, ...session } = parsed.data;

  const { data, error } = await supabase.rpc("create_recurring_sessions", {
    p_organization_id: organizationId,
    p_tutor_id: session.tutor_id,
    p_start_time: session.start_time,
    p_end_time: session.end_time,
    p_topic: session.topic,
    p_status: session.status,
    p_notes: session.notes,
    p_cancellation_reason: session.cancellation_reason,
    p_tutor_pay_rate: session.tutor_pay_rate ?? null,
    p_students: students,
    p_frequency: parsedRec.data.frequency,
    p_occurrences: parsedRec.data.occurrences,
  });

  if (error) return fail(translateSchedulingError(error));
  revalidate();
  return ok({ series_id: data as string });
}
