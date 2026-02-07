
import { createClient } from '@supabase/supabase-js';

/**
 * Direct credentials for the user's Supabase instance.
 * Using hardcoded strings as the primary source to guarantee resolution 
 * in environments where environment variables might be flaky.
 */
const SUPABASE_URL = "https://snxgbxwjldbknntpxuwu.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_rff9UwhW5ng7gJXeIdcQyA_SASz9qZv";

/**
 * Safely retrieves environment variables as secondary fallbacks.
 */
const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[key];
    }
  } catch (e) {}
  try {
    if (typeof process !== 'undefined' && process && process.env) {
      return (process.env as any)[key];
    }
  } catch (e) {}
  return undefined;
};

// Prioritize the provided hardcoded credentials, then look at environment
const url = SUPABASE_URL || getEnvVar('VITE_SUPABASE_URL') || getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const key = SUPABASE_ANON_KEY || getEnvVar('VITE_SUPABASE_ANON_KEY') || getEnvVar('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY');

if (!url || !key || url.includes('placeholder')) {
  console.error('Supabase initialization failure: Missing or invalid credentials.');
}

export const supabase = createClient(url, key);
