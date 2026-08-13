import Image from "next/image";
import { logout } from "@/app/actions/auth";
import type { Profile } from "@/lib/types";

export default function Topbar({ profile }: { profile: Profile }) {
  return (
    <div className="px-5 pt-4.5 pb-3.5 flex items-center justify-between border-b border-line bg-paper sticky top-0 z-10">
      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={30} height={30} className="object-contain shrink-0" />
          <span className="font-black text-xl tracking-tight">Hasuno</span>
        </div>
        <span className="font-mono text-[10.5px] uppercase tracking-widest text-ink-soft mt-0.5">
          Inventory Requests
        </span>
      </div>
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
  );
}
