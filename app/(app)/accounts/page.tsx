import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import AccountsScreen from "@/components/AccountsScreen";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import type { Profile, StaffReminder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const actor = await requireRole("owner", "manager");
  const supabase = createClient();

  const [{ data: accounts }, { data: staffReminders }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at"),
    supabase.from("staff_reminders").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <RealtimeRefresh tables={["profiles", "staff_reminders"]} />
      <AccountsScreen
        actor={actor}
        accounts={(accounts || []) as Profile[]}
        staffReminders={(staffReminders || []) as StaffReminder[]}
      />
    </>
  );
}
