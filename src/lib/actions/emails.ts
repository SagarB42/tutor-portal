"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createEmailDraft,
  discardEmailDraft,
  updateEmailDraft,
  type CreateEmailDraftInput,
} from "@/lib/queries/emails";

const CreateSchema = z.object({
  contextType: z.enum([
    "session_summary",
    "invoice_reminder",
    "marketing",
    "resource_assignment",
    "attendance_absence",
    "prepaid_topup",
    "custom",
  ]),
  contextId: z.string().uuid().nullable().optional(),
  studentId: z.string().uuid().nullable().optional(),
  toEmail: z.string().email(),
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(20000),
});

export async function saveDraftAction(input: CreateEmailDraftInput) {
  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const row = await createEmailDraft(parsed.data);
  revalidatePath("/dashboard/emails");
  return row;
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  toEmail: z.string().email().optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
});

export async function updateDraftAction(input: z.infer<typeof UpdateSchema>) {
  const parsed = UpdateSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join(", "));
  }
  const { id, ...rest } = parsed.data;
  const row = await updateEmailDraft(id, rest);
  revalidatePath("/dashboard/emails");
  return row;
}

export async function discardDraftAction(id: string) {
  if (!z.string().uuid().safeParse(id).success) {
    throw new Error("Invalid draft id");
  }
  await discardEmailDraft(id);
  revalidatePath("/dashboard/emails");
}
