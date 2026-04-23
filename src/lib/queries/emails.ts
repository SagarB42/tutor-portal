import "server-only";
import { requireOrg } from "./org";
import type {
  EmailDraftContext,
  EmailDraftRow,
  EmailDraftStatus,
} from "@/lib/db-types";

export type EmailDraftWithStudent = EmailDraftRow & {
  students: { id: string; full_name: string; email: string | null } | null;
};

export async function listEmailDrafts(
  status?: EmailDraftStatus,
): Promise<EmailDraftWithStudent[]> {
  const { supabase, organizationId } = await requireOrg();
  let q = supabase
    .from("email_drafts")
    .select("*, students(id, full_name, email)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as EmailDraftWithStudent[];
}

export async function getEmailDraft(id: string): Promise<EmailDraftWithStudent | null> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("email_drafts")
    .select("*, students(id, full_name, email)")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as EmailDraftWithStudent | null;
}

export async function countDraftsByStatus(): Promise<Record<EmailDraftStatus, number>> {
  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("email_drafts")
    .select("status")
    .eq("organization_id", organizationId);
  if (error) throw error;
  const counts: Record<EmailDraftStatus, number> = {
    draft: 0,
    sent: 0,
    failed: 0,
    discarded: 0,
  };
  for (const row of data ?? []) {
    const s = (row as { status: EmailDraftStatus }).status;
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return counts;
}

export type CreateEmailDraftInput = {
  contextType: EmailDraftContext;
  contextId?: string | null;
  studentId?: string | null;
  toEmail: string;
  subject: string;
  body: string;
};

export async function createEmailDraft(input: CreateEmailDraftInput): Promise<EmailDraftRow> {
  const { supabase, organizationId, user } = await requireOrg();
  const { data, error } = await supabase
    .from("email_drafts")
    .insert({
      organization_id: organizationId,
      context_type: input.contextType,
      context_id: input.contextId ?? null,
      student_id: input.studentId ?? null,
      to_email: input.toEmail,
      subject: input.subject,
      body: input.body,
      status: "draft",
      created_by: user.id,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as EmailDraftRow;
}

export type UpdateEmailDraftInput = {
  toEmail?: string;
  subject?: string;
  body?: string;
};

export async function updateEmailDraft(
  id: string,
  input: UpdateEmailDraftInput,
): Promise<EmailDraftRow> {
  const { supabase, organizationId } = await requireOrg();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.toEmail !== undefined) patch.to_email = input.toEmail;
  if (input.subject !== undefined) patch.subject = input.subject;
  if (input.body !== undefined) patch.body = input.body;
  const { data, error } = await supabase
    .from("email_drafts")
    .update(patch)
    .eq("id", id)
    .eq("organization_id", organizationId)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as EmailDraftRow;
}

export async function discardEmailDraft(id: string): Promise<void> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("email_drafts")
    .update({ status: "discarded", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function markEmailSent(id: string): Promise<void> {
  const { supabase, organizationId } = await requireOrg();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("email_drafts")
    .update({ status: "sent", sent_at: now, updated_at: now, error: null })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}

export async function markEmailFailed(id: string, message: string): Promise<void> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("email_drafts")
    .update({
      status: "failed",
      error: message,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) throw error;
}
