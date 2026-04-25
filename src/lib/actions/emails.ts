"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createEmailDraft,
  discardEmailDraft,
  getEmailDraft,
  getOrgEmailConfig,
  markEmailFailed,
  markEmailSent,
  updateEmailDraft,
  updateOrgEmailConfig,
  type CreateEmailDraftInput,
  type OrgEmailConfigRow,
} from "@/lib/queries/emails";
import { requireOrg } from "@/lib/queries/org";
import { getResend, plainTextToHtml, resolveSender } from "@/lib/email/resend";
import type { EmailDraftRow } from "@/lib/db-types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validates a comma-separated list of emails. Allows an empty string so that
// drafts can be saved before the user has added any recipients.
const emailListSchema = z
  .string()
  .refine(
    (v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .every((e) => EMAIL_RE.test(e)),
    "One or more email addresses are invalid",
  );

// Stricter version used by send — requires at least one valid address.
const requiredEmailListSchema = z
  .string()
  .min(1, "At least one recipient is required")
  .refine(
    (v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .every((e) => EMAIL_RE.test(e)),
    "One or more email addresses are invalid",
  );

const ContextSchema = z.enum([
  "session_summary",
  "invoice_reminder",
  "marketing",
  "resource_assignment",
  "attendance_absence",
  "prepaid_topup",
  "custom",
]);

// Saving a draft only requires that *something* has been entered — recipient,
// subject, or body. Each field on its own may be blank.
const CreateSchema = z
  .object({
    contextType: ContextSchema,
    contextId: z.string().uuid().nullish(),
    studentId: z.string().uuid().nullish(),
    toEmail: emailListSchema,
    subject: z.string().max(500),
    body: z.string(),
  })
  .refine(
    (v) => v.toEmail.trim() !== "" || v.subject.trim() !== "" || v.body.trim() !== "",
    {
      message: "Add a recipient, subject, or body before saving the draft",
      path: ["body"],
    },
  );

const UpdateSchema = z.object({
  id: z.string().uuid(),
  toEmail: emailListSchema.optional(),
  subject: z.string().max(500).optional(),
  body: z.string().optional(),
});

export async function saveDraftAction(input: CreateEmailDraftInput): Promise<EmailDraftRow> {
  const parsed = CreateSchema.parse(input);
  const row = await createEmailDraft(parsed);
  revalidatePath("/dashboard/emails");
  return row;
}

export async function updateDraftAction(input: {
  id: string;
  toEmail?: string;
  subject?: string;
  body?: string;
}): Promise<EmailDraftRow> {
  const parsed = UpdateSchema.parse(input);
  const { id, ...rest } = parsed;
  const row = await updateEmailDraft(id, rest);
  revalidatePath("/dashboard/emails");
  return row;
}

export async function markDraftSentAction(id: string): Promise<void> {
  z.string().uuid().parse(id);
  await markEmailSent(id);
  revalidatePath("/dashboard/emails");
}

export async function discardDraftAction(id: string): Promise<void> {
  z.string().uuid().parse(id);
  await discardEmailDraft(id);
  revalidatePath("/dashboard/emails");
}

// ============================================================================
// Sending — Resend integration
// ============================================================================

const SendSchema = z.object({
  id: z.string().uuid(),
  toEmails: z.array(z.string().regex(EMAIL_RE)).min(1, "At least one recipient is required"),
  ccEmails: z.array(z.string().regex(EMAIL_RE)).optional(),
  subject: z.string().min(1).max(500),
  body: z.string().min(1),
});

export type SendDraftResult = {
  ok: boolean;
  providerMessageId?: string;
  /** When ok=false, a user-facing error message. */
  error?: string;
  /**
   * True when the app is running with the shared Resend sandbox sender
   * (`onboarding@resend.dev`). In that mode Resend only delivers to the
   * email registered on the Resend account.
   */
  sandbox?: boolean;
};

/**
 * Persist any pending edits to the draft, then hand it to Resend. On success
 * the draft is marked `sent` with the provider message id; on failure it's
 * marked `failed` with the error preserved for retry.
 */
export async function sendDraftAction(input: {
  id: string;
  toEmails: string[];
  ccEmails?: string[];
  subject: string;
  body: string;
}): Promise<SendDraftResult> {
  const parsed = SendSchema.parse({
    ...input,
    toEmails: input.toEmails.map((s) => s.trim()).filter(Boolean),
    ccEmails: input.ccEmails?.map((s) => s.trim()).filter(Boolean),
  });

  const resend = getResend();
  if (!resend) {
    return {
      ok: false,
      error:
        "Email sending is not configured. Add a RESEND_API_KEY to enable sending from the app.",
    };
  }

  const { user } = await requireOrg();

  // Persist the latest edits before sending so a failed send still leaves the
  // user's most recent draft on disk.
  await updateEmailDraft(parsed.id, {
    toEmail: parsed.toEmails.join(", "),
    subject: parsed.subject,
    body: parsed.body,
  });

  const draft = await getEmailDraft(parsed.id);
  if (!draft) {
    return { ok: false, error: "Draft not found." };
  }

  const orgConfig = await getOrgEmailConfig();
  const sender = resolveSender(
    {
      organization_name: orgConfig.name,
      business_name: orgConfig.business_name,
      reply_to_email: orgConfig.reply_to_email,
      sender_from_email: orgConfig.sender_from_email,
      sender_domain_status: orgConfig.sender_domain_status,
    },
    user.email ?? null,
  );

  try {
    const { data, error } = await resend.emails.send({
      from: sender.from,
      to: parsed.toEmails,
      cc: parsed.ccEmails && parsed.ccEmails.length > 0 ? parsed.ccEmails : undefined,
      replyTo: sender.replyTo,
      subject: parsed.subject,
      text: parsed.body,
      html: plainTextToHtml(parsed.body),
      headers: {
        "X-Entity-Ref-ID": parsed.id,
      },
    });

    if (error) {
      const message =
        (error as { message?: string }).message ?? "Resend rejected the message.";
      await markEmailFailed(parsed.id, message);
      revalidatePath("/dashboard/emails");
      return { ok: false, error: message, sandbox: !sender.isCustomDomain };
    }

    await markEmailSent(parsed.id, {
      provider: "resend",
      providerMessageId: data?.id ?? null,
      fromEmail: sender.fromEmail,
      ccEmails: parsed.ccEmails && parsed.ccEmails.length > 0 ? parsed.ccEmails : null,
    });
    revalidatePath("/dashboard/emails");
    return {
      ok: true,
      providerMessageId: data?.id,
      sandbox: !sender.isCustomDomain,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Send failed";
    await markEmailFailed(parsed.id, message).catch(() => {});
    revalidatePath("/dashboard/emails");
    return { ok: false, error: message, sandbox: !sender.isCustomDomain };
  }
}

// ============================================================================
// Org email settings
// ============================================================================

const OrgEmailConfigSchema = z.object({
  businessName: z.string().trim().max(120).nullish(),
  replyToEmail: z
    .string()
    .trim()
    .nullish()
    .refine((v) => !v || EMAIL_RE.test(v), "Invalid email address"),
});

export async function updateOrgEmailConfigAction(input: {
  businessName?: string | null;
  replyToEmail?: string | null;
}): Promise<OrgEmailConfigRow> {
  const parsed = OrgEmailConfigSchema.parse(input);
  const row = await updateOrgEmailConfig({
    businessName: parsed.businessName ?? null,
    replyToEmail: parsed.replyToEmail || null,
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/dashboard/emails");
  return row;
}
