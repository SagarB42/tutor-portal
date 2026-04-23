import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the current authenticated user + their organization id.
 * Redirects to /auth/login if the user isn't authenticated.
 *
 * Called from RSC layouts, pages, and server actions. Wrapped in React
 * cache() so a single request only performs the lookup once.
 */
export const requireOrg = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (!org) {
    // Dashboard layout should have bootstrapped an org already. If the user
    // somehow lands here without one, bounce them back to the shell which
    // handles the invitation-based org creation.
    redirect("/dashboard");
  }

  return {
    user,
    organizationId: org.id as string,
    organizationName: org.name as string,
    supabase,
  };
});
