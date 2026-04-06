import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

type RequireAdminResult =
  | { ok: true }
  | { ok: false; response: NextResponse };

export async function requireAdminSession(req: NextRequest): Promise<RequireAdminResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Supabase environment belum dikonfigurasi" },
        { status: 500 }
      ),
    };
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        // Route handler auth check only: tidak perlu set cookie di sini.
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  return { ok: true };
}
