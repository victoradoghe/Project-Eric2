import { loadEnv } from 'vite';
import { createClient } from '@supabase/supabase-js';

const env = loadEnv(process.env.NODE_ENV || 'development', process.cwd(), [
  'VITE_',
  'NEXT_PUBLIC_',
]);

const url = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env');
  process.exit(1);
}

console.log(`Project URL: ${url}`);

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { error: sessionError } = await supabase.auth.getSession();
if (sessionError) {
  console.error(`Client initialization failed: ${sessionError.message}`);
  process.exit(1);
}
console.log('Supabase client: initialized');

const health = await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
console.log(`Auth service: ${health.status === 200 ? 'OK' : `FAILED (${health.status})`}`);
if (health.status !== 200) process.exit(1);

const probe = await fetch(`${url}/rest/v1/_connection_check?select=*&limit=1`, {
  headers: { apikey: key, Accept: 'application/json' },
});
const body = await probe.text();
const gatewayOk = probe.ok || body.includes('PGRST205');
console.log(`REST gateway: ${gatewayOk ? 'OK' : `FAILED (${probe.status}) ${body}`}`);
if (!gatewayOk) process.exit(1);

console.log('\nSupabase connection verified.');
