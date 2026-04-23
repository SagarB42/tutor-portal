import { NextResponse } from "next/server";
import { streamObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { requireOrg } from "@/lib/queries/org";
import { loadEmailContext } from "@/lib/queries/email-context";
import type { EmailDraftContext } from "@/lib/db-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ContextTypeEnum = z.enum([
  "session_summary",
  "invoice_reminder",
  "marketing",
  "resource_assignment",
  "attendance_absence",
  "prepaid_topup",
  "custom",
]);

const BodySchema = z.object({
  contextType: ContextTypeEnum,
  contextId: z.string().uuid().nullable().optional(),
  studentId: z.string().uuid().nullable().optional(),
  tone: z.enum(["professional", "friendly", "formal"]).default("friendly"),
  extraInstructions: z.string().max(2000).optional(),
});

const EmailSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(8000),
});

function buildSystemPrompt(
  contextType: EmailDraftContext,
  organizationName: string,
  tone: string,
) {
  const contextHint: Record<EmailDraftContext, string> = {
    session_summary:
      "Write a brief post-session summary for the parent: what was covered, how the student engaged, and next steps.",
    invoice_reminder:
      "Write a courteous invoice reminder. Be polite, reference the invoice number, total, and due date. Do not sound aggressive.",
    prepaid_topup:
      "Write a friendly prepaid-balance top-up request. Mention current balance and suggest an amount to replenish.",
    attendance_absence:
      "Write a short, caring follow-up after a missed session. Offer to reschedule.",
    resource_assignment:
      "Write a brief email sharing a learning resource. Include a line about how it helps.",
    marketing:
      "Write a warm marketing email for a tutoring business. Keep it short and concrete.",
    custom:
      "Write an email as instructed by the user. Follow their intent precisely.",
  };

  return [
    `You are an assistant that drafts short, well-written emails on behalf of "${organizationName}", a tutoring business.`,
    `Tone: ${tone}. Keep the email tight (under 180 words) unless the user asks otherwise.`,
    `Never invent facts that are not in the provided context. If information is missing, leave a placeholder in [square brackets].`,
    `Return only a subject and a body. The body should be plain text with line breaks — no markdown, no HTML.`,
    contextHint[contextType],
  ].join("\n\n");
}

function formatFacts(facts: Record<string, unknown>): string {
  return Object.entries(facts)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
    .join("\n");
}

export async function POST(req: Request) {
  try {
    await requireOrg();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured on the server." },
        { status: 500 },
      );
    }

    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { contextType, contextId, studentId, tone, extraInstructions } =
      parsed.data;

    const payload = await loadEmailContext(
      contextType,
      contextId ?? null,
      studentId ?? null,
    );

    const system = buildSystemPrompt(contextType, payload.organizationName, tone);
    const recipientLine = payload.recipient
      ? `Recipient: ${payload.recipient.name ?? "[name]"} <${payload.recipient.email ?? "[email]"}>`
      : "Recipient: (unknown)";

    const userMessage = [
      `Business: ${payload.organizationName}`,
      `Purpose: ${payload.title}`,
      recipientLine,
      "",
      "Context facts:",
      formatFacts(payload.facts) || "(no structured facts provided)",
      extraInstructions
        ? `\nAdditional instructions from the sender:\n${extraInstructions}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const result = streamObject({
      model: openai("gpt-4o-mini"),
      system,
      prompt: userMessage,
      schema: EmailSchema,
      temperature: 0.6,
    });

    return result.toTextStreamResponse();
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
