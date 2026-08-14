import { createClient } from "@/lib/supabase/server";
import RemindPanel from "@/components/RemindPanel";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import type { Profile, StaffReminder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RemindPage() {
  const supabase = createClient();

  const [{ data: accounts }, { data: staffReminders }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("staff_reminders").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <RealtimeRefresh tables={["staff_reminders"]} />
      <RemindPanel
        accounts={(accounts || []) as Profile[]}
        staffReminders={(staffReminders || []) as StaffReminder[]}
      />
    </>
  );
}
