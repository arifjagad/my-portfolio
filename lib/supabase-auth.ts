"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Untuk Client Components saja
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
  );
}
