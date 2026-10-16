import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured =
  supabaseUrl.length > 0 && supabaseAnonKey.length > 0;

/** Project ref only (never the key) — for dev diagnostics. */
export const supabaseProjectRef =
  supabaseUrl.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ??
  (isSupabaseConfigured ? 'custom-url' : 'not-configured');

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase env missing (EXPO_PUBLIC_SUPABASE_URL / ANON_KEY)');
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Ranking/analytics use the separately persisted device key in each
        // RPC, never a Supabase Auth session. Initializing unused Auth storage
        // can reject every RPC on dev builds without keychain entitlements.
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    if (__DEV__) {
      console.log(`[Ranking DEV] project=${supabaseProjectRef} client=created`);
    }
  }
  return client;
}
