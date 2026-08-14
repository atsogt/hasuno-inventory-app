import { requireRole } from "@/lib/auth";
import AccountsSubnav from "@/components/AccountsSubnav";

export default async function AccountsLayout({ children }: { children: React.ReactNode }) {
  await requireRole("owner", "manager");

  return (
    <>
      <AccountsSubnav />
      {children}
    </>
  );
}
