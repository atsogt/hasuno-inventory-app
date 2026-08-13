import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import RequestList from "@/components/RequestList";
import RealtimeRefresh from "@/components/RealtimeRefresh";
import type { Request } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  await requireRole("owner", "manager");
  const supabase = createClient();

  const { data: requests } = await supabase.from("requests").select("*").order("sent_at", { ascending: false });

  return (
    <>
      <RealtimeRefresh tables={["requests"]} />
      <h2 className="font-mono text-xs uppercase tracking-widest text-ink-soft mb-3.5 flex items-center gap-2 after:content-[''] after:flex-1 after:h-px after:bg-line">
        Open Requests ({requests?.length || 0})
      </h2>
      <RequestList requests={(requests || []) as Request[]} showRequester allowDeleteAll />
    </>
  );
}
