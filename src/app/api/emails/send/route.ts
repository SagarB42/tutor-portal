import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";
import { requireOrg } from "@/lib/queries/org";
import {
  getEmailDraft,
  markEmailFailed,
  markEmailSent,
  updateEmailDraft,
} from "@/lib/queries/emails";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  draftId: z.string().uuid(),
  // Allow last-minute edits to be persisted before sending
  toEmail: z.string().email().optional(),
  subject: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
});

export async function POST(req: Request) {
  try {
    // RLS enforcement: requireOrg resolves the caller's org, and the
    // queries below filter every read/write by organization_id.
    await requireOrg();

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { draftId, toEmail, subject, body } = parsed.data;

    if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
      return NextResponse.json(
        {
          error:
            "Email sending is not configured. Set RESEND_API_KEY and EMAIL_FROM.",
        },
        { status: 500 },
      );
    }

    // Verify draft exists and is in caller's org (RLS guarantees this)
    const existing = await getEmailDraft(draftId);
    if (!existing) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    if (existing.status === "sent") {
      return NextResponse.json(
        { error: "Draft has already been sent." },
        { status: 400 },
      );
    }

    // Persist any last-minute edits before sending
    const effective = await updateEmailDraft(draftId, {
      toEmail,
      subject,
      body,
    });

    const resend = new Resend(process.env.RESEND_API_KEY);
    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: effective.to_email,
        subject: effective.subject,
        text: effective.body,
      });
      if (error) {
        await markEmailFailed(draftId, error.message ?? "Unknown Resend error");
        return NextResponse.json(
          { error: error.message ?? "Failed to send" },
          { status: 502 },
        );
      }
      await markEmailSent(draftId);
      return NextResponse.json({ ok: true, id: data?.id });
    } catch (sendErr) {
      const message =
        sendErr instanceof Error ? sendErr.message : "Failed to send";
      await markEmailFailed(draftId, message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
