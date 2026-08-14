"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/auth";

export async function scheduleStaffReminder(targetIds: string[], scheduledAtIso: string, message: string) {
  const profile = await requireRole("owner", "manager");
  if (targetIds.length === 0) return { error: "Pick at least one person" };
  const trimmed = message.trim();
  if (!trimmed) return { error: "Add a short message" };

  const supabase = createClient();
  const { error } = await supabase.from("staff_reminders").insert({
    target_ids: targetIds,
    scheduled_at: scheduledAtIso,
    message: trimmed,
    created_by_name: profile.name,
  });
  if (error) return { error: error.message };

  // Best-effort audit log entry — a failure here shouldn't block the reminder itself.
  await supabase.from("reminder_history").insert({
    target_ids: targetIds,
    scheduled_at: scheduledAtIso,
    message: trimmed,
    created_by_name: profile.name,
  });

  revalidatePath("/accounts");
  revalidatePath("/request");
  return { ok: true, count: targetIds.length };
}

export async function deleteStaffReminder(id: string) {
  await requireRole("owner", "manager");
  const supabase = createClient();
  const { error } = await supabase.from("staff_reminders").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/accounts");
  return { ok: true };
}

export async function clearReminderHistory() {
  await requireRole("owner", "manager");
  const supabase = createClient();
  const { error } = await supabase.from("reminder_history").delete().not("id", "is", null);
  if (error) return { error: error.message };

  revalidatePath("/accounts");
  return { ok: true };
}

export async function dismissStaffReminder(id: string) {
  const profile = await requireProfile();
  const supabase = createClient();

  const { data: reminder } = await supabase
    .from("staff_reminders")
    .select("dismissed_by")
    .eq("id", id)
    .single();
  if (!reminder) return { error: "Reminder not found" };

  const dismissedBy = reminder.dismissed_by.includes(profile.id)
    ? reminder.dismissed_by
    : [...reminder.dismissed_by, profile.id];

  const { error } = await supabase
    .from("staff_reminders")
    .update({ dismissed_by: dismissedBy })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/request");
  return { ok: true };
}
