import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, Role } from "@/lib/types";
export { canManage } from "@/lib/auth-client";

// Users log in with just a name (per spec). Supabase Auth needs an email, so we
// map name -> a synthetic, never-emailed address. This keeps RLS working off
// auth.uid() while the UI only ever shows/asks for names.
export function nameToEmail(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const domain = process.env.AUTH_EMAIL_DOMAIN || "hasuno.local";
  return `${slug}@${domain}`;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data as Profile | null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect("/request");
  return profile;
}
