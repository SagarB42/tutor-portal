"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/queries/org";
import {
  expenseSchema,
  type ExpenseInput,
  paymentSchema,
  type PaymentInput,
} from "@/lib/schemas";
import { fail, ok, type ActionResult } from "./result";

function revalidate() {
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard");
}

export async function createPayment(
  input: PaymentInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("payments")
    .insert({ ...parsed.data, organization_id: organizationId })
    .select("id")
    .single();

  if (error) return fail(error.message);
  revalidate();
  return ok({ id: data.id });
}

export async function updatePayment(
  id: string,
  input: PaymentInput,
): Promise<ActionResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("payments")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deletePayment(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("payments")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function createExpense(
  input: ExpenseInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...parsed.data, organization_id: organizationId })
    .select("id")
    .single();
  if (error) return fail(error.message);
  revalidate();
  return ok({ id: data.id });
}

export async function updateExpense(
  id: string,
  input: ExpenseInput,
): Promise<ActionResult> {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Invalid data");

  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("expenses")
    .update(parsed.data)
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function deleteExpense(id: string): Promise<ActionResult> {
  const { supabase, organizationId } = await requireOrg();
  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .eq("organization_id", organizationId);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}
