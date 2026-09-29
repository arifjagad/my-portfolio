/**
 * app/api/demo/generate/route.ts
 * POST /api/demo/generate
 * Body: { slug: string, force?: boolean, provider?: string, polish?: boolean }
 * Generate atau regenerate HTML untuk satu bisnis.
 * Dengan 9router: jika Brand Brief belum ada, riset Google dijalankan dulu
 * (hasilnya disimpan) agar konten & desain berbasis fakta bisnis.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-admin";
import { generateDemoHTML, getCategoryDesignFallback } from "@/lib/ai-generator";
import { requireAdminSession } from "@/lib/admin-route-auth";
import { rateLimitByIp } from "@/lib/rate-limit";
import { DEFAULT_PROVIDER, isNineRouterProvider } from "@/lib/ai-providers";
import { isRunningOnVercel } from "@/lib/ninerouter";
import { researchBusiness } from "@/lib/demo-research";
import { normalizeBrief, type BrandBrief } from "@/lib/brand-brief";

// Di Vercel: generate + polish bisa 3-4 menit; generator memakai budget 270 dtk di bawah batas ini.
// Di laptop (9router) batas ini tidak berlaku.
export const maxDuration = 300;

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
    const { slug, force = false, provider = DEFAULT_PROVIDER, polish = true } = body;

    if (!slug) {
      return NextResponse.json({ error: "slug wajib diisi" }, { status: 400 });
    }

    if (isNineRouterProvider(provider) && isRunningOnVercel()) {
      return NextResponse.json(
        { error: "Generate dengan 9router hanya bisa dari laptop (npm run dev). Jalankan admin lokal." },
        { status: 400 }
      );
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

    // Riset dulu jika Brief belum ada (hanya 9router yang punya Google Search)
    // Normalisasi: Brief lama di database mungkin belum punya field terbaru
    let brief: BrandBrief | null = biz.research_brief
      ? normalizeBrief(biz.research_brief, getCategoryDesignFallback(biz).palette)
      : null;
    let researchedAt: string | null = biz.researched_at ?? null;
    if (!brief && isNineRouterProvider(provider)) {
      try {
        brief = await researchBusiness(biz, { images: biz.brand_images ?? [] });
        researchedAt = new Date().toISOString();
        await supabase
          .from("demo_businesses")
          .update({ research_brief: brief, researched_at: researchedAt })
          .eq("slug", slug);
      } catch (err: any) {
        return NextResponse.json(
          { error: `Riset gagal, generate dibatalkan agar hasil tidak dikarang: ${err?.message}` },
          { status: 502 }
        );
      }
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
        keyword: biz.keyword,
        enriched_data: biz.enriched_data,
        research_brief: brief,
        brand_images: biz.brand_images ?? [],
      },
      { provider, polish: polish !== false }
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
      research_brief: brief,
      researched_at: researchedAt,
    });
  } catch (err: any) {
    const msg: string = err?.message || "Internal server error";
    console.error("[API/generate] Fatal:", msg);

    if (msg.includes("Batas waktu generate habis")) {
      return NextResponse.json({ error: msg }, { status: 504 });
    }

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
          error: "Rate limit provider AI tercapai. Tunggu 15–30 detik lalu coba lagi.",
          detail: msg,
        },
        { status: 429 }
      );
    }

    if (isModelUnavailable) {
      return NextResponse.json(
        {
          error: "Model AI tidak tersedia. Cek nama model atau API key di .env.local.",
          detail: msg,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
