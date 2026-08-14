import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Topbar from "@/components/Topbar";
import Tabbar from "@/components/Tabbar";
import { ToastProvider } from "@/components/Toast";
import PushRegister from "@/components/PushRegister";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();

  let requestsBadge = false;
  if (profile.role !== "worker") {
    const supabase = createClient();
    const { count } = await supabase.from("requests").select("id", { count: "exact", head: true });
    requestsBadge = !!count && count > 0;
  }

  return (
    <ToastProvider>
      <Topbar profile={profile} />
      <div className="flex-1 px-5 pt-5 pb-24 overflow-y-auto">
        <PushRegister />
        {children}
      </div>
      <Tabbar role={profile.role} requestsBadge={requestsBadge} />
    </ToastProvider>
  );
}
