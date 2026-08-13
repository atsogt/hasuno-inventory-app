// Supabase Edge Function, invoked on a schedule by pg_cron (see supabase/migrations/0002_cron.sql).
// Finds due reminders that haven't been pushed yet and sends Web Push notifications for them.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT")!,
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!
);

type Subscription = { id: string; endpoint: string; p256dh: string; auth: string };

async function sendToProfile(profileId: string, payload: unknown) {
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("profile_id", profileId);

  for (const sub of (subs || []) as Subscription[]) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload)
      );
    } catch (err) {
      const statusCode = (err as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
      } else {
        console.error("push failed", profileId, err);
      }
    }
  }
}

async function sendDueRequestReminders() {
  const { data: due } = await supabase
    .from("requests")
    .select("id, item_name, requested_by_id")
    .eq("reminder_notified", false)
    .not("reminder_at", "is", null)
    .lte("reminder_at", new Date().toISOString());

  for (const r of due || []) {
    await sendToProfile(r.requested_by_id, {
      title: "Reminder",
      body: `${r.item_name} is due`,
    });
    await supabase.from("requests").update({ reminder_notified: true }).eq("id", r.id);
  }
}

async function sendDueStaffReminders() {
  const { data: due } = await supabase
    .from("staff_reminders")
    .select("id, message, target_ids, dismissed_by, created_by_name")
    .is("pushed_at", null)
    .lte("scheduled_at", new Date().toISOString());

  for (const r of due || []) {
    const targets = (r.target_ids as string[]).filter((id) => !(r.dismissed_by as string[]).includes(id));
    for (const profileId of targets) {
      await sendToProfile(profileId, {
        title: `Reminder from ${r.created_by_name}`,
        body: r.message,
      });
    }
    await supabase.from("staff_reminders").update({ pushed_at: new Date().toISOString() }).eq("id", r.id);
  }
}

Deno.serve(async (req) => {
  const auth = req.headers.get("authorization") || "";
  const expected = `Bearer ${Deno.env.get("CRON_SECRET")}`;
  if (auth !== expected) {
    return new Response("unauthorized", { status: 401 });
  }

  await Promise.all([sendDueRequestReminders(), sendDueStaffReminders()]);
  return new Response("ok");
});
