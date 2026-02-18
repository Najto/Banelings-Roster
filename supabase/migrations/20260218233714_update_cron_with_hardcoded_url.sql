/*
  # Update hourly cron job with hardcoded Supabase URL and service role key

  ## Summary
  The previous cron migration attempted to use current_setting() to read app.* GUC
  variables, but ALTER DATABASE SET is not permitted on managed Supabase instances.

  This migration replaces the cron job with a version that uses literal values for
  the Supabase URL and service role key, which is the standard approach for pg_cron
  on Supabase.

  ## Changes
  - Removes the old 'hourly-roster-sync' cron job
  - Re-schedules it with the hardcoded project URL and service role key
  - The sync-roster Edge Function is called with force:false (default hourly behavior)
    — only stale characters are re-synced
*/

SELECT cron.unschedule('hourly-roster-sync')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'hourly-roster-sync'
);

SELECT cron.schedule(
  'hourly-roster-sync',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url     := 'https://xuxnzcyqvobgebjzidvj.supabase.co/functions/v1/sync-roster',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1eG56Y3lxdm9iZ2VianppZHZqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDQ2NTUzMywiZXhwIjoyMDg2MDQxNTMzfQ.OGNULPGdKfBPPHhMuWMJSCPvdJOG0O8VgMxuO8T6QTk'
      ),
      body    := '{}'::jsonb
    );
  $$
);
