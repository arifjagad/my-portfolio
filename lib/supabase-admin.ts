/**
 * lib/supabase-admin.ts
 * Supabase client dengan SERVICE_ROLE_KEY (bypass RLS).
 * Hanya untuk server: route handler, server component, script.
 * Tabel demo_* tidak bisa diakses anon key sama sekali.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _service: SupabaseClient | null = null;

export function getServiceClient(): SupabaseClient {
  if (typeof window !== "undefined") {
    throw new Error("[Supabase] Service client tidak boleh dipakai di browser");
  }

  if (!_service) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("[Supabase] NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi");
    }
    _service = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _service;
}
