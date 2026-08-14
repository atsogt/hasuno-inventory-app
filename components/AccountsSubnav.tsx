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
    <div className="flex gap-1.5 bg-paper-dim p-1 rounded-xl mb-5.5">
      {TABS.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 text-center py-2 rounded-lg font-mono text-[11px] uppercase tracking-wide transition-colors ${
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
