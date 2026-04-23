import "server-only";
import { requireOrg } from "./org";
import type { NotificationRow } from "@/lib/db-types";

export async function listNotifications(
  limit = 30,
): Promise<NotificationRow[]> {
  const { supabase, user } = await requireOrg();
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function countUnreadNotifications(): Promise<number> {
  const { supabase, user } = await requireOrg();
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  if (error) throw error;
  return count ?? 0;
}

export async function sweepOverdueInvoices(): Promise<void> {
  const { supabase } = await requireOrg();
  const { error } = await supabase.rpc("sweep_overdue_invoices");
  if (error) throw error;
}
