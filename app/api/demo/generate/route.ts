/**
 * app/api/demo/generate/route.ts
 * POST /api/demo/generate
 * Body: { slug: string, force?: boolean, provider?: string }
 * Generate atau regenerate HTML via Gemini / OpenRouter untuk satu bisnis
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateDemoHTML } from "@/lib/ai-generator";
import { requireAdminSession } from "@/lib/admin-route-auth";
import { rateLimitByIp } from "@/lib/rate-limit";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.ok) return auth.response;

    const rate = rateLimitByIp(req, "api:demo:generate", 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        {
          error: "Terlalu banyak request generate. Coba lagi sebentar.",
          retry_after_seconds: rate.retryAfterSec,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rate.retryAfterSec),
            "X-RateLimit-Limit": String(rate.limit),
            "X-RateLimit-Remaining": String(rate.remaining),
          },
        }
      );
    }

    const body = await req.json();
    const { slug, force = false, provider } = body;

    if (!slug) {
      return NextResponse.json({ error: "slug wajib diisi" }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Ambil data bisnis
    const { data: biz, error: fetchErr } = await supabase
      .from("demo_businesses")
      .select("*")
      .eq("slug", slug)
      .single();

    if (fetchErr || !biz) {
      return NextResponse.json(
        { error: "Bisnis tidak ditemukan" },
        { status: 404 }
      );
    }

    // Jika sudah ada dan force=false, kembalikan yang ada
    if (biz.generated_html && !force) {
      return NextResponse.json({
        html: biz.generated_html,
        generated_at: biz.generated_at,
        generation_version: biz.generation_version,
        cached: true,
      });
    }

    // Generate HTML
    const html = await generateDemoHTML(
      {
        slug: biz.slug,
        nama_bisnis: biz.nama_bisnis,
        kategori: biz.kategori,
        rating: biz.rating,
        jumlah_ulasan: biz.jumlah_ulasan,
        nomor_telepon: biz.nomor_telepon,
        alamat: biz.alamat,
        link_gmaps: biz.link_gmaps,
        enriched_data: biz.enriched_data,
      },
      { provider }
    );

    const newVersion = (biz.generation_version || 0) + 1;
    const generatedAt = new Date().toISOString();

    // Simpan ke Supabase
    const { error: updateErr } = await supabase
      .from("demo_businesses")
      .update({
        generated_html: html,
        generated_at: generatedAt,
        generation_version: newVersion,
      })
      .eq("slug", slug);

    if (updateErr) {
      console.error("[API/generate] Update error:", updateErr.message);
      return NextResponse.json(
        { error: "Gagal menyimpan HTML ke database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      html,
      generated_at: generatedAt,
      generation_version: newVersion,
      cached: false,
    });
  } catch (err: any) {
    const msg: string = err?.message || "Internal server error";
    console.error("[API/generate] Fatal:", msg);

    // Gemini rate limit / quota exceeded → return 429 dengan pesan jelas
    const isRateLimit =
      msg.includes("429") ||
      msg.includes("quota") ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("FreeTier");

    // Semua model tidak tersedia (404)
    const isModelUnavailable =
      msg.includes("404") ||
      msg.includes("is not found") ||
      msg.includes("semua model yang tersedia");

    if (isRateLimit) {
      return NextResponse.json(
        {
          error: "Gemini API rate limit tercapai. Tunggu beberapa saat lalu coba lagi.",
          detail: "Free tier memiliki batas 15 request/menit. Coba lagi dalam 15–30 detik.",
        },
        { status: 429 }
      );
    }

    if (isModelUnavailable) {
      return NextResponse.json(
        {
          error: "Model Gemini tidak tersedia. Cek GEMINI_API_KEY di .env.local.",
          detail: msg,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
