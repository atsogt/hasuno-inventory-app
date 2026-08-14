import { createClient } from "@/lib/supabase/server";
import RemindPanel from "@/components/RemindPanel";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import type { Profile, ReminderHistoryEntry, StaffReminder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RemindPage() {
  const supabase = createClient();

  const [{ data: accounts }, { data: staffReminders }, { data: reminderHistory }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("staff_reminders").select("*").order("created_at", { ascending: false }),
    supabase.from("reminder_history").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <RealtimeRefresh tables={["staff_reminders", "reminder_history"]} />
      <RemindPanel
        accounts={(accounts || []) as Profile[]}
        staffReminders={(staffReminders || []) as StaffReminder[]}
        reminderHistory={(reminderHistory || []) as ReminderHistoryEntry[]}
      />
    </>
  );
}
