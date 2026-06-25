let supabaseClient = null;
let bucketName = null;

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const { createClient } = await import('@supabase/supabase-js');
  const { config } = await import('../config/index.js');
  const url = config.supabase.url;
  const key = config.supabase.serviceKey;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  supabaseClient = createClient(url, key, { auth: { persistSession: false } });
  return supabaseClient;
}

export async function getBucket() {
  if (bucketName) return bucketName;
  const { config } = await import('../config/index.js');
  bucketName = config.supabase.storageBucket;
  return bucketName;
}
