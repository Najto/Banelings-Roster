/*
  # Enable pg_cron and schedule hourly roster sync

  ## Summary
  Sets up a server-side cron job that calls the sync-roster Edge Function every hour.
  Only characters whose last_enriched_at is older than 1 hour are processed by the
  function itself, so this is a lightweight trigger.

  ## Changes
  1. Enables the pg_cron extension for job scheduling
  2. Enables the pg_net extension for making HTTP requests from within Postgres
  3. Removes any existing sync job to avoid duplicates (idempotent)
  4. Schedules a new cron job named 'hourly-roster-sync' to run at the top of every hour

  ## Security
  - The Edge Function is called with the service role key stored as a Supabase secret
  - The cron job runs under the postgres role in a server-side context
*/

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('hourly-roster-sync')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'hourly-roster-sync'
);

SELECT cron.schedule(
  'hourly-roster-sync',
  '0 * * * *',
  $$
    SELECT net.http_post(
      url    := (SELECT value->>'url' FROM (VALUES (('{"url":"' || current_setting('app.supabase_url', true) || '/functions/v1/sync-roster"}')::json)) AS t(value)) ,
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key', true)
      ),
      body   := '{}'::jsonb
    );
  $$
);
