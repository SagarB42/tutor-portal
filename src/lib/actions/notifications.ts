"use server";

import { revalidatePath } from "next/cache";
import { requireOrg } from "@/lib/queries/org";

export async function markNotificationReadAction(id: string) {
  const { supabase, user } = await requireOrg();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("recipient_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function markAllNotificationsReadAction() {
  const { supabase, user } = await requireOrg();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .is("read_at", null);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}

export async function deleteNotificationAction(id: string) {
  const { supabase, user } = await requireOrg();
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .eq("recipient_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/dashboard");
}
