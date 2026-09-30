/**
 * app/api/demo/html/route.ts
 * POST /api/demo/html
 * Body: { slug: string, html: string }
 * Simpan atau update generated_html secara manual dari admin editor.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-admin";
import { requireAdminSession } from "@/lib/admin-route-auth";
import { rateLimitByIp } from "@/lib/rate-limit";

const PUBLIC_SLUG = /^[a-z0-9][a-z0-9-]{0,199}$/;

/**
 * GET /api/demo/html?slug=xxx
 * Publik: mengembalikan generated_html untuk SATU slug.
 * Catatan: ini lapisan anti-copas kasual, bukan keamanan mutlak.
 * - HTML tidak lagi dibake ke halaman (view-source bersih).
 * - Hanya dilayani untuk fetch dari halaman /demo/ (cek referer).
 * - Rate limit per IP.
 * Pengguna yang niat tetap bisa menyalin via devtools; itu batasan
 * fundamental konten yang dirender browser.
 */
export async function GET(req: NextRequest) {
  const referer = req.headers.get("referer") || "";
  if (!referer.includes("/demo/")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rate = rateLimitByIp(req, "api:demo:html", 60, 60_000);
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan, coba lagi nanti" },
      { status: 429 }
    );
  }

  const slug = new URL(req.url).searchParams.get("slug")?.trim() || "";
  if (!PUBLIC_SLUG.test(slug)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = getServiceClient();
  const { data: biz } = await supabase
    .from("demo_businesses")
    .select("generated_html, is_locked")
    .eq("slug", slug)
    .single();

  if (!biz || biz.is_locked || !biz.generated_html) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ html: biz.generated_html });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.ok) return auth.response;

    const body = await req.json();
    const slug = (body?.slug || "").trim();
    const html = typeof body?.html === "string" ? body.html.trim() : "";

    if (!slug) {
      return NextResponse.json({ error: "slug wajib diisi" }, { status: 400 });
    }

    if (!html) {
      return NextResponse.json({ error: "HTML tidak boleh kosong" }, { status: 400 });
    }

    if (!html.toLowerCase().includes("<html")) {
      return NextResponse.json(
        { error: "HTML tidak valid. Pastikan konten berisi tag <html>." },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    const { data: biz, error: fetchErr } = await supabase
      .from("demo_businesses")
      .select("slug, generation_version")
      .eq("slug", slug)
      .single();

    if (fetchErr || !biz) {
      return NextResponse.json({ error: "Bisnis tidak ditemukan" }, { status: 404 });
    }

    const nextVersion = (biz.generation_version || 0) + 1;
    const generatedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("demo_businesses")
      .update({
        generated_html: html,
        generated_at: generatedAt,
        generation_version: nextVersion,
      })
      .eq("slug", slug);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      html,
      generated_at: generatedAt,
      generation_version: nextVersion,
      source: "manual",
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
