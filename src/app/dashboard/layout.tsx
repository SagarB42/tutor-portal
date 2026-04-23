import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/dashboard-shell";
import {
  listNotifications,
  countUnreadNotifications,
  sweepOverdueInvoices,
} from "@/lib/queries/notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Bootstrap / fetch the organization name in a single server roundtrip.
  let businessName = "My Business";
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("owner_id", user.id)
    .maybeSingle();

  if (org?.name) {
    businessName = org.name;
  } else {
    // First login after invite: create the org server-side from the invitation record.
    const { data: invite } = await supabase
      .from("invitations")
      .select("id, business_name")
      .eq("email", (user.email ?? "").toLowerCase())
      .maybeSingle();

    const { data: newOrg } = await supabase
      .from("organizations")
      .insert({
        name: invite?.business_name || "My Tutoring Business",
        owner_id: user.id,
      })
      .select("id, name")
      .single();

    if (newOrg?.name) businessName = newOrg.name;
    if (invite && newOrg) {
      await supabase
        .from("invitations")
        .update({ organization_id: newOrg.id })
        .eq("id", invite.id);
    }
  }

  return (
    <DashboardShell
      userEmail={user.email ?? null}
      businessName={businessName}
      userId={user.id}
      notifications={await (async () => {
        try {
          await sweepOverdueInvoices();
        } catch {
          /* swept failures are non-fatal */
        }
        const [items, unread] = await Promise.all([
          listNotifications(30),
          countUnreadNotifications(),
        ]);
        return { items, unread };
      })()}
    >
      {children}
    </DashboardShell>
  );
}