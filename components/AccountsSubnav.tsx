"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/accounts/remind", label: "Remind" },
  { href: "/accounts/manage", label: "Manage Accounts" },
  { href: "/accounts/add", label: "Add Account" },
];

export default function AccountsSubnav() {
  const pathname = usePathname();

  return (
    <div className="flex gap-2 bg-paper-dim p-1.5 rounded-2xl mb-7">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 text-center py-3 px-2 rounded-xl font-mono text-[11px] uppercase tracking-wide transition-colors ${
              active ? "bg-card text-ink font-semibold shadow-sm" : "text-ink-soft"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
