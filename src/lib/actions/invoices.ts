"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrg } from "@/lib/queries/org";
import {
  getBillableLinesForStudent,
  type InvoiceLineItem,
} from "@/lib/queries/invoices";
import {
  renderInvoicePdf,
  type InvoicePdfLine,
} from "@/lib/pdf/invoice-template";
import { fail, ok, type ActionResult } from "./result";

const generateInvoiceSchema = z.object({
  student_id: z.string().uuid(),
  due_date: z.string().date().optional().nullable(),
  notes: z.string().optional().nullable(),
  /** Specific session ids to include; if omitted, all billable lines are billed. */
  session_ids: z.array(z.string().uuid()).optional(),
});

export type GenerateInvoiceInput = z.infer<typeof generateInvoiceSchema>;

export async function generateInvoice(
  input: GenerateInvoiceInput,
): Promise<ActionResult<{ invoice_id: string }>> {
  const parsed = generateInvoiceSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const v = parsed.data;

  const { supabase, organizationId, organizationName } = await requireOrg();

  const { data: student, error: studentErr } = await supabase
    .from("students")
    .select("id, full_name, email, parent_name, parent_email")
    .eq("id", v.student_id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (studentErr) return fail(studentErr.message);
  if (!student) return fail("Student not found");

  let lines: InvoiceLineItem[] = await getBillableLinesForStudent(v.student_id);
  if (v.session_ids && v.session_ids.length > 0) {
    const allow = new Set(v.session_ids);
    lines = lines.filter((l) => allow.has(l.session_id));
  }
  if (lines.length === 0)
    return fail("No billable sessions to include on the invoice");

  const subtotal = +lines.reduce((s, l) => s + l.amount, 0).toFixed(2);

  // Allocate invoice number + row first so we have an id for the PDF path.
  const { data: numberRes, error: numberErr } = await supabase.rpc(
    "next_invoice_number",
    { p_org: organizationId },
  );
  if (numberErr) return fail(numberErr.message);
  const invoiceNumber = numberRes as unknown as string;

  const { data: inserted, error: insertErr } = await supabase
    .from("invoices")
    .insert({
      organization_id: organizationId,
      student_id: v.student_id,
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: v.due_date ?? null,
      amount: subtotal,
      status: "draft",
      notes: v.notes ?? null,
    })
    .select("id")
    .single();
  if (insertErr) return fail(insertErr.message);

  const invoiceId = inserted.id as string;
  const path = `${organizationId}/${invoiceId}.pdf`;

  const pdfLines: InvoicePdfLine[] = lines.map((l) => ({
    start_time: l.start_time,
    topic: l.topic,
    hours: l.hours,
    rate: l.rate,
    amount: l.amount,
  }));

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await renderInvoicePdf({
      invoiceNumber,
      issueDate: new Date().toISOString(),
      dueDate: v.due_date ?? null,
      organizationName,
      studentName: student.full_name as string,
      studentEmail: student.email as string | null,
      parentName: student.parent_name as string | null,
      parentEmail: student.parent_email as string | null,
      lines: pdfLines,
      subtotal,
      amountDue: subtotal,
      notes: v.notes ?? null,
    });
  } catch (e) {
    await supabase.from("invoices").delete().eq("id", invoiceId);
    return fail(`PDF render failed: ${(e as Error).message}`);
  }

  const { error: uploadErr } = await supabase.storage
    .from("invoices")
    .upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
  if (uploadErr) {
    await supabase.from("invoices").delete().eq("id", invoiceId);
    return fail(`Upload failed: ${uploadErr.message}`);
  }

  const { error: updateErr } = await supabase
    .from("invoices")
    .update({ pdf_url: path })
    .eq("id", invoiceId);
  if (updateErr) return fail(updateErr.message);

  revalidatePath(`/dashboard/students/${v.student_id}`);
  revalidatePath("/dashboard/finance");
  return ok({ invoice_id: invoiceId });
}

export async function getInvoiceSignedUrl(
  invoiceId: string,
): Promise<ActionResult<{ url: string }>> {
  const { supabase, organizationId } = await requireOrg();
  const { data: inv, error } = await supabase
    .from("invoices")
    .select("pdf_url")
    .eq("id", invoiceId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) return fail(error.message);
  if (!inv?.pdf_url) return fail("Invoice PDF not available");
  const { data: signed, error: signErr } = await supabase.storage
    .from("invoices")
    .createSignedUrl(inv.pdf_url as string, 60 * 10);
  if (signErr || !signed) return fail(signErr?.message ?? "Could not sign URL");
  return ok({ url: signed.signedUrl });
}

const markSentSchema = z.object({ invoice_id: z.string().uuid() });
export async function markInvoiceSent(
  input: z.infer<typeof markSentSchema>,
): Promise<ActionResult> {
  const parsed = markSentSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");
  const { supabase, organizationId } = await requireOrg();
  const { data: current, error: readErr } = await supabase
    .from("invoices")
    .select("id, student_id, status")
    .eq("id", parsed.data.invoice_id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!current) return fail("Invoice not found");
  if (current.status === "paid" || current.status === "void")
    return fail(`Cannot mark a ${current.status} invoice as sent`);
  const { error } = await supabase
    .from("invoices")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", current.id);
  if (error) return fail(error.message);
  revalidatePath(`/dashboard/students/${current.student_id}`);
  revalidatePath("/dashboard/finance");
  return ok();
}

const voidSchema = z.object({ invoice_id: z.string().uuid() });
export async function voidInvoice(
  input: z.infer<typeof voidSchema>,
): Promise<ActionResult> {
  const parsed = voidSchema.safeParse(input);
  if (!parsed.success) return fail("Invalid input");
  const { supabase, organizationId } = await requireOrg();
  const { data: current, error: readErr } = await supabase
    .from("invoices")
    .select("id, student_id")
    .eq("id", parsed.data.invoice_id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!current) return fail("Invoice not found");
  const { error } = await supabase
    .from("invoices")
    .update({ status: "void" })
    .eq("id", current.id);
  if (error) return fail(error.message);
  revalidatePath(`/dashboard/students/${current.student_id}`);
  revalidatePath("/dashboard/finance");
  return ok();
}

const recordPaymentSchema = z.object({
  invoice_id: z.string().uuid(),
  amount: z.number().positive(),
  method: z.enum(["cash", "bank_transfer", "payid", "card", "other"]),
  payment_date: z.string().date(),
  description: z.string().optional().nullable(),
});

/**
 * Records a payment against an invoice:
 * - inserts a payments row (linked to the student)
 * - inserts invoice_payments link row
 * - updates invoice status to 'paid' (fully) or 'partial'
 */
export async function recordInvoicePayment(
  input: z.infer<typeof recordPaymentSchema>,
): Promise<ActionResult> {
  const parsed = recordPaymentSchema.safeParse(input);
  if (!parsed.success)
    return fail(parsed.error.issues[0]?.message ?? "Invalid input");
  const v = parsed.data;

  const { supabase, organizationId } = await requireOrg();

  const { data: inv, error: invErr } = await supabase
    .from("invoices")
    .select("id, student_id, amount, status")
    .eq("id", v.invoice_id)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (invErr) return fail(invErr.message);
  if (!inv) return fail("Invoice not found");
  if (inv.status === "void") return fail("Cannot pay a void invoice");

  const { data: existingLinks } = await supabase
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", inv.id);
  const alreadyPaid = (existingLinks ?? []).reduce(
    (s, r) => s + Number(r.amount),
    0,
  );
  const remaining = Number(inv.amount) - alreadyPaid;
  if (v.amount > remaining + 0.01)
    return fail(
      `Amount exceeds remaining balance of $${remaining.toFixed(2)}`,
    );

  const { data: payment, error: payErr } = await supabase
    .from("payments")
    .insert({
      organization_id: organizationId,
      student_id: inv.student_id,
      amount: v.amount,
      method: v.method,
      description: v.description ?? `Payment for invoice ${inv.id}`,
      payment_date: v.payment_date,
    })
    .select("id")
    .single();
  if (payErr) return fail(payErr.message);

  const { error: linkErr } = await supabase.from("invoice_payments").insert({
    invoice_id: inv.id,
    payment_id: payment.id,
    amount: v.amount,
  });
  if (linkErr) return fail(linkErr.message);

  const newTotal = alreadyPaid + v.amount;
  const nextStatus =
    Math.abs(newTotal - Number(inv.amount)) < 0.01 ? "paid" : "partial";
  const patch: Record<string, unknown> = { status: nextStatus };
  if (nextStatus === "paid") patch.paid_at = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("invoices")
    .update(patch)
    .eq("id", inv.id);
  if (updateErr) return fail(updateErr.message);

  revalidatePath(`/dashboard/students/${inv.student_id}`);
  revalidatePath("/dashboard/finance");
  return ok();
}
