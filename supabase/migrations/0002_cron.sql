-- Schedules the send-reminders Edge Function to run every minute.
-- Run this AFTER deploying the function and setting its secrets (see README "Deploy" section).
-- Replace the two placeholders below before running.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/send-reminders',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>'),
    body := '{}'::jsonb
  );
  $$
);
