"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { nameToEmail } from "@/lib/auth";

export async function login(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name || !password) {
    return { error: "Enter your name and password." };
  }

  const supabase = createClient();

  // profiles is only readable to signed-in users (RLS), so a pre-auth existence/lock
  // check has to go through the admin client. We only ever read `locked` here.
  const { data: existing } = await createAdminClient()
    .from("profiles")
    .select("locked")
    .ilike("name", name)
    .maybeSingle();

  if (!existing) {
    return { error: "No account with that name." };
  }
  if (existing.locked) {
    return { error: "This account is locked. See your manager." };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: nameToEmail(name),
    password,
  });

  if (error) {
    return { error: "Incorrect password." };
  }

  redirect("/request");
}

export async function logout() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
