import type { Profile } from "@/lib/types";

// Pure role logic, safe to import from Client Components. The server is still
// the real gate (see lib/auth.ts + RLS) - this only drives which buttons show.
export function canManage(actor: Profile, target: Profile) {
  if (actor.role === "owner") return target.role !== "owner";
  if (actor.role === "manager") return target.role === "worker";
  return false;
}
