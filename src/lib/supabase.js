import { createClient } from '@supabase/supabase-js';

const env = import.meta.env;

export const supabaseUrl = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';

export const supabaseKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

if (!isSupabaseConfigured && env.DEV) {
  console.warn(
    '[supabase] Missing configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.',
  );
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function getEnabledAuthProviders() {
  if (!isSupabaseConfigured) return {};

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseKey },
    });
    if (!response.ok) return {};
    const settings = await response.json();
    return settings.external || {};
  } catch {
    return {};
  }
}

export async function checkSupabaseConnection() {
  if (!supabase) {
    throw new Error('Supabase is not configured (missing URL or publishable key).');
  }

  const response = await fetch(`${supabaseUrl}/auth/v1/health`, {
    headers: { apikey: supabaseKey },
  });

  if (!response.ok) {
    throw new Error(`Supabase health check failed with status ${response.status}.`);
  }

  const { error } = await supabase.auth.getSession();
  if (error) throw error;

  return { ok: true, url: supabaseUrl };
}
