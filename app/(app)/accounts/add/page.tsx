import { requireRole } from "@/lib/auth";
import AddAccountForm from "@/components/AddAccountForm";

export const dynamic = "force-dynamic";

export default async function AddAccountPage() {
  const actor = await requireRole("owner", "manager");

  return <AddAccountForm actorRole={actor.role} />;
}
