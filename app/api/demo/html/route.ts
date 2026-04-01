/**
 * app/api/demo/html/route.ts
 * POST /api/demo/html
 * Body: { slug: string, html: string }
 * Simpan atau update generated_html secara manual dari admin editor.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
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
