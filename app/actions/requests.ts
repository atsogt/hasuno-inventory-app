"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireRole } from "@/lib/auth";
import type { Station } from "@/lib/types";

export async function submitRequest(itemName: string, amount: number | null, urgent = false) {
  const profile = await requireProfile();
  const name = itemName.trim();
  if (!name) return { error: "Pick or type an item." };

  const supabase = createClient();
  const { error } = await supabase.from("requests").insert({
    item_name: name,
    amount: amount && amount > 0 ? amount : null,
    urgent,
    requested_by_id: profile.id,
    requested_by_name: profile.name,
    sent_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };

  revalidatePath("/request");
  revalidatePath("/my-requests");
  revalidatePath("/requests");
  return { ok: true, label: name + (amount ? ` ×${amount}` : "") };
}

export async function editRequest(id: string, amount: number | null, urgent: boolean) {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase
    .from("requests")
    .update({ amount: amount && amount > 0 ? amount : null, urgent })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/my-requests");
  revalidatePath("/requests");
  return { ok: true };
}

// Called when someone taps an item they already have an open request for:
// updates the existing row (quantity, urgency) instead of creating a duplicate,
// and bumps sent_at so the elapsed badge reflects that they just asked again.
export async function requestAgain(id: string, amount: number | null, urgent: boolean) {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase
    .from("requests")
    .update({
      amount: amount && amount > 0 ? amount : null,
      urgent,
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/request");
  revalidatePath("/my-requests");
  revalidatePath("/requests");
  return { ok: true };
}

export async function deleteRequest(id: string) {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase.from("requests").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/my-requests");
  revalidatePath("/requests");
  return { ok: true };
}

export async function clearAllRequests() {
  await requireRole("owner", "manager");
  const supabase = createClient();
  const { error } = await supabase.from("requests").delete().not("id", "is", null);
  if (error) return { error: error.message };

  revalidatePath("/request");
  revalidatePath("/my-requests");
  revalidatePath("/requests");
  return { ok: true };
}

export async function setRequestReminder(id: string, iso: string) {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase
    .from("requests")
    .update({ reminder_at: iso, reminder_notified: false })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/my-requests");
  return { ok: true };
}

export async function clearRequestReminder(id: string) {
  await requireProfile();
  const supabase = createClient();
  const { error } = await supabase
    .from("requests")
    .update({ reminder_at: null, reminder_notified: false })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/my-requests");
  return { ok: true };
}

export async function addItemToCatalog(
  name: string,
  amount: number,
  station: Station,
  category: string
) {
  const profile = await requireProfile();
  if (profile.role === "worker") return { error: "Not allowed." };
  const trimmed = name.trim();
  const trimmedCategory = category.trim();
  if (!trimmed) return { error: "Item needs a name." };
  if (!trimmedCategory) return { error: "Item needs a category." };

  const supabase = createClient();
  const { error } = await supabase.from("items").insert({
    name: trimmed,
    amount: amount > 0 ? amount : 1,
    station,
    category: trimmedCategory,
  });
  if (error) {
    if (error.code === "23505") return { error: `"${trimmed}" is already on the list` };
    return { error: error.message };
  }

  revalidatePath("/request");
  return { ok: true };
}

export async function saveItemEdit(
  id: string,
  name: string,
  amount: number,
  station: Station,
  category: string
) {
  const profile = await requireProfile();
  if (profile.role === "worker") return { error: "Not allowed." };
  const trimmed = name.trim();
  const trimmedCategory = category.trim();
  if (!trimmed) return { error: "Item needs a name." };
  if (!trimmedCategory) return { error: "Item needs a category." };

  const supabase = createClient();
  const { error } = await supabase
    .from("items")
    .update({ name: trimmed, amount: amount > 0 ? amount : 1, station, category: trimmedCategory })
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { error: "Another item already has that name" };
    return { error: error.message };
  }

  revalidatePath("/request");
  return { ok: true };
}

export async function removeItemFromCatalog(id: string) {
  const profile = await requireProfile();
  if (profile.role === "worker") return { error: "Not allowed." };

  const supabase = createClient();
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/request");
  return { ok: true };
}
