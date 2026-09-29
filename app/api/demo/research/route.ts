/**
 * app/api/demo/research/route.ts
 * POST  /api/demo/research  Body: { slug, images?: string[] }
 *   Jalankan riset Google via 9router dan simpan Brand Brief.
 * PATCH /api/demo/research  Body: { slug, brief }
 *   Simpan Brief hasil koreksi admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-admin";
import { requireAdminSession } from "@/lib/admin-route-auth";
import { researchBusiness, MAX_BRAND_IMAGES } from "@/lib/demo-research";
import { normalizeBrief } from "@/lib/brand-brief";
import { getCategoryDesignFallback } from "@/lib/ai-generator";
import { isRunningOnVercel } from "@/lib/ninerouter";

const MAX_IMAGE_CHARS = 1_500_000; // ~1 MB per gambar (data URL sudah dikompres di browser)

function sanitizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => (v.startsWith("https://") || v.startsWith("data:image/")) && v.length <= MAX_IMAGE_CHARS)
    .slice(0, MAX_BRAND_IMAGES);
}

export async function POST(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  if (isRunningOnVercel()) {
    return NextResponse.json({ error: "Riset memakai 9router, jalankan dari laptop (npm run dev)." }, { status: 400 });
  }

  const body = await req.json().catch(() => ({}));
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  if (!slug) return NextResponse.json({ error: "slug wajib diisi" }, { status: 400 });

  const supabase = getServiceClient();
  const { data: biz, error: fetchErr } = await supabase
    .from("demo_businesses")
    .select("slug, nama_bisnis, kategori, keyword, alamat, rating, jumlah_ulasan, nomor_telepon, brand_images")
    .eq("slug", slug)
    .single();

  if (fetchErr || !biz) return NextResponse.json({ error: "Bisnis tidak ditemukan" }, { status: 404 });

  const images = body?.images !== undefined ? sanitizeImages(body.images) : biz.brand_images ?? [];

  try {
    const brief = await researchBusiness(biz, { images });
    const researchedAt = new Date().toISOString();

    const { error: updateErr } = await supabase
      .from("demo_businesses")
      .update({ research_brief: brief, researched_at: researchedAt, brand_images: images })
      .eq("slug", slug);
    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

    return NextResponse.json({ brief, researched_at: researchedAt, brand_images: images });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Riset gagal" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  if (!slug || typeof body?.brief !== "object" || body.brief === null) {
    return NextResponse.json({ error: "slug dan brief wajib diisi" }, { status: 400 });
  }

  const supabase = getServiceClient();
  const { data: biz } = await supabase
    .from("demo_businesses")
    .select("kategori, keyword")
    .eq("slug", slug)
    .single();
  if (!biz) return NextResponse.json({ error: "Bisnis tidak ditemukan" }, { status: 404 });

  const brief = normalizeBrief(body.brief, getCategoryDesignFallback(biz).palette);
  const { error } = await supabase.from("demo_businesses").update({ research_brief: brief }).eq("slug", slug);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ brief });
}
