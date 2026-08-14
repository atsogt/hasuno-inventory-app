import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import ManageAccountsPanel from "@/components/ManageAccountsPanel";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ManageAccountsPage() {
  const actor = await requireRole("owner", "manager");
  const supabase = createClient();

  const { data: accounts } = await supabase.from("profiles").select("*").order("created_at");

  return (
    <>
      <RealtimeRefresh tables={["profiles"]} />
      <ManageAccountsPanel actor={actor} accounts={(accounts || []) as Profile[]} />
    </>
  );
}
