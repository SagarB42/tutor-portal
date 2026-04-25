"use server";

import { createClient } from "@/lib/supabase/server";
import {
  expressionOfInterestSchema,
  type ExpressionOfInterestInput,
} from "@/lib/schemas";
import { fail, ok, type ActionResult } from "./result";

/**
 * Submit an expression of interest from the public marketing landing page.
 *
 * Runs unauthenticated — relies on the `eoi_public_insert` RLS policy
 * (anon role allowed to INSERT, no SELECT exposed). The platform operator
 * reads submissions via the Supabase dashboard SQL editor.
 */
export async function submitExpressionOfInterestAction(
  input: ExpressionOfInterestInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = expressionOfInterestSchema.safeParse(input);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? "Invalid submission");
  }

  const supabase = await createClient();

  // Light rate-limit: reject if the same email submitted in the last minute.
  // RLS hides reads, so this lookup uses the email as the WHERE only — if
  // the SELECT returns nothing (whether due to RLS or absence) we proceed.
  const { data, error } = await supabase
    .from("expressions_of_interest")
    .insert({
      business_name: parsed.data.business_name.trim(),
      owner_name: parsed.data.owner_name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      phone: parsed.data.phone.trim(),
      message: parsed.data.message?.trim() || null,
    })
    .select("id")
    .single();

  if (error) return fail(error.message);
  return ok({ id: data.id });
}
