import { NextResponse } from "next/server";
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { requireOrg } from "@/lib/queries/org";
import { buildTools } from "@/lib/ai/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

const BodySchema = z.object({
  messages: z.array(MessageSchema).min(1).max(20),
});

export async function POST(req: Request) {
  try {
    const { supabase, organizationId, organizationName } = await requireOrg();

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

    const tools = buildTools({ supabase, organizationId });
    const today = new Date().toLocaleDateString("en-AU", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const system = [
      `You are a data assistant embedded in the admin dashboard of "${organizationName}", an Australian tutoring business.`,
      `Today is ${today}. Use Australian English and AU date / currency conventions (AUD, dd/mm/yyyy).`,
      "",
      "Rules:",
      "- Always use the provided tools to answer questions about students, tutors, sessions, invoices, payments, expenses, or revenue. Never invent numbers, names, balances, or dates.",
      "- If a tool returns ambiguous matches, list the candidates and ask the user which one they mean.",
      "- If a tool returns no data, say so plainly — do not speculate.",
      "- Keep answers tight: lead with the headline number or fact, then a short bullet list of supporting detail.",
      "- Do not expose tutor TFN, BSB, or bank account numbers under any circumstances.",
      "- Refuse politely if asked questions unrelated to running this tutoring business.",
    ].join("\n");

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system,
      messages: parsed.data.messages,
      tools,
      stopWhen: stepCountIs(6),
      temperature: 0.2,
    });

    const toolCalls: Array<{ name: string; args: unknown }> = [];
    for (const step of result.steps ?? []) {
      for (const call of step.toolCalls ?? []) {
        toolCalls.push({
          name: call.toolName,
          args: (call as unknown as { input?: unknown }).input ?? null,
        });
      }
    }

    return NextResponse.json({
      text: result.text,
      toolCalls,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
