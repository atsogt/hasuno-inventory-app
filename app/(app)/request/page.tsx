import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RequestScreen from "@/components/RequestScreen";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import type { Item, Request, StaffReminder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RequestPage() {
  const profile = await requireProfile();
  const supabase = createClient();

  const [{ data: items }, { data: reminders }, { data: myRequests }] = await Promise.all([
    supabase.from("items").select("*").order("category").order("name"),
    supabase
      .from("staff_reminders")
      .select("*")
      .contains("target_ids", [profile.id])
      .lte("scheduled_at", new Date().toISOString()),
    supabase.from("requests").select("*").eq("requested_by_id", profile.id),
  ]);

  const activeReminders = ((reminders || []) as StaffReminder[]).filter(
    (r) => !r.dismissed_by.includes(profile.id)
  );

  return (
    <>
      <RealtimeRefresh tables={["staff_reminders", "items"]} />
      <RequestScreen
        items={(items || []) as Item[]}
        canManageCatalog={profile.role !== "worker"}
        activeReminders={activeReminders}
        myOpenRequests={(myRequests || []) as Request[]}
      />
    </>
  );
}
