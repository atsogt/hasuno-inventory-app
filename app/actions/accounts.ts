"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, canManage, nameToEmail } from "@/lib/auth";
import type { Role } from "@/lib/types";

export async function addAccount(
  name: string,
  password: string,
  role: Role,
  phone: string,
  email: string
) {
  const actor = await requireRole("owner", "manager");
  const trimmed = name.trim();
  if (!trimmed || !password) return { error: "Name and password required" };
  if (actor.role === "manager" && role !== "worker") {
    return { error: "Managers can only create worker accounts." };
  }

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .ilike("name", trimmed)
    .maybeSingle();
  if (existing) return { error: "That name is already in use" };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: nameToEmail(trimmed),
    password,
    email_confirm: true,
  });
  if (createError) return { error: createError.message };

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    name: trimmed,
    role,
    locked: false,
    phone: phone.trim() || null,
    email: email.trim() || null,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileError.message };
  }

  revalidatePath("/accounts");
  return { ok: true, name: trimmed };
}

export async function saveAccountContact(id: string, phone: string, email: string) {
  await requireRole("owner", "manager");
  const supabase = createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ phone: phone.trim() || null, email: email.trim() || null })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/accounts");
  return { ok: true };
}

export async function toggleLock(id: string) {
  const actor = await requireRole("owner", "manager");
  const supabase = createClient();

  const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!target || !canManage(actor, target)) return { error: "Not allowed." };

  const { error } = await supabase.from("profiles").update({ locked: !target.locked }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/accounts");
  return { ok: true, locked: !target.locked, name: target.name };
}

export async function deleteAccount(id: string) {
  const actor = await requireRole("owner", "manager");
  const supabase = createClient();

  const { data: target } = await supabase.from("profiles").select("*").eq("id", id).single();
  if (!target || !canManage(actor, target)) return { error: "Not allowed." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: error.message };

  revalidatePath("/accounts");
  return { ok: true };
}
