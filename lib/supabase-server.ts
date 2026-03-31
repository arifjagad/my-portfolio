import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Untuk Server Components & Server Actions saja
 * File ini JANGAN diimport dari Client Components
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component tidak bisa set cookie — diabaikan
          }
        },
      },
    }
  );
}
