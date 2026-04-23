"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrg } from "@/lib/queries/org";
import { fail, ok, type ActionResult } from "./result";

const attendanceStatusEnum = z.enum([
  "pending",
  "present",
  "absent",
  "excused",
  "late",
]);

const setAttendanceSchema = z.object({
  session_id: z.string().uuid(),
  student_id: z.string().uuid(),
  status: attendanceStatusEnum,
  notes: z.string().optional().nullable(),
});

export type SetAttendanceInput = z.infer<typeof setAttendanceSchema>;

export async function setAttendance(
  input: SetAttendanceInput,
): Promise<ActionResult> {
  const parsed = setAttendanceSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, user } = await requireOrg();
  const v = parsed.data;

  // Upsert (the row may not exist yet for old sessions; trigger only fires
  // on new session_students inserts).
  const { error } = await supabase
    .from("attendance")
    .upsert(
      {
        session_id: v.session_id,
        student_id: v.student_id,
        status: v.status,
        notes: v.notes ?? null,
        marked_at: new Date().toISOString(),
        marked_by: user.id,
      },
      { onConflict: "session_id,student_id" },
    );
  if (error) return fail(error.message);

  revalidatePath(`/dashboard/sessions/${v.session_id}`);
  revalidatePath(`/dashboard/students/${v.student_id}`);
  revalidatePath("/dashboard/calendar");
  return ok();
}
