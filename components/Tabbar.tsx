"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@/lib/types";

export default function Tabbar({ role, requestsBadge }: { role: Role; requestsBadge?: boolean }) {
  const pathname = usePathname();
  const tabs =
    role === "worker"
      ? [
          { href: "/request", label: "Request" },
          { href: "/my-requests", label: "My Requests" },
        ]
      : [
          { href: "/request", label: "Request" },
          { href: "/requests", label: "Requests", badge: requestsBadge },
          { href: "/accounts/remind", label: "Accounts" },
        ];

  return (
    <div
      className="tabbar-glass sticky bottom-0 flex border-t px-3 pt-2 gap-2 z-10"
      style={{ paddingBottom: "calc(10px + env(safe-area-inset-bottom))" }}
    >
      {tabs.map((t) => {
        const active = pathname === t.href || (t.href.startsWith("/accounts") && pathname.startsWith("/accounts"));
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 py-2 px-1 rounded-[10px] font-mono text-[11px] tracking-wide uppercase flex flex-col items-center gap-1 ${
              active ? "tab-active font-semibold" : "text-ink-soft"
            }`}
          >
            {t.label}
            {t.badge ? <span className="w-1.5 h-1.5 rounded-full bg-accent" /> : null}
          </Link>
        );
      })}
    </div>
  );
}
