import Image from "next/image";
import { logout } from "@/app/actions/auth";
import ThemeToggle from "@/components/ThemeToggle";
import type { Profile } from "@/lib/types";

export default function Topbar({ profile }: { profile: Profile }) {
  return (
    <div className="px-5 pt-6 pb-5 flex items-start justify-between gap-3 border-b border-line bg-paper sticky top-0 z-10">
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={24} height={24} className="object-contain shrink-0" />
          <span className="font-black text-2xl leading-none tracking-tight">
            HASUNO
            <span className="sparkle text-base align-top ml-0.5">✦</span>
            <span className="sparkle sparkle-delay text-[10px] align-top">✦</span>
          </span>
        </div>
        <span className="font-mono text-[13px] font-medium uppercase tracking-wide text-ink-soft mt-1">
          Inventory Requests
        </span>
      </div>
      <div className="flex items-start gap-2.5">
        <ThemeToggle />
        <div className="text-right font-mono text-[11px] text-ink-soft">
          <b className="block font-sans text-sm text-ink font-bold">{profile.name}</b>
          {profile.role}
          <form action={logout}>
            <button className="block text-accent text-[11px] underline mt-0.5" type="submit">
              log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
