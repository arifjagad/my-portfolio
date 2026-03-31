import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Hanya proteksi route /admin (kecuali /admin/login)
  if (!req.nextUrl.pathname.startsWith("/admin")) {
    return res;
  }
  if (req.nextUrl.pathname === "/admin/login") {
    return res;
  }

  // Cek apakah Supabase sudah dikonfigurasi
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!supabaseUrl || supabaseUrl.includes("xxxx") || !supabaseKey || supabaseKey.startsWith("sb_publishable_") === false) {
    // Belum dikonfigurasi — redirect ke login dengan pesan
    return NextResponse.redirect(new URL("/admin/login?error=not_configured", req.url));
  }

  // Buat Supabase client dengan cookie dari request
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          req.cookies.set(name, value);
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  // Cek session user
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/admin/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
