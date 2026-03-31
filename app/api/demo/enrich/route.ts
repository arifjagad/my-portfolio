/**
 * app/api/demo/enrich/route.ts
 * POST /api/demo/enrich
 * Body: { slug, jam_buka, deskripsi, layanan, keunggulan, catatan_internal }
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
    const { slug, ...enrichFields } = body;

    if (!slug) {
      return NextResponse.json({ error: "slug wajib diisi" }, { status: 400 });
    }

    const enriched_data = {
      jam_buka: enrichFields.jam_buka || null,
      deskripsi: enrichFields.deskripsi || null,
      layanan: Array.isArray(enrichFields.layanan)
        ? enrichFields.layanan.filter(Boolean)
        : (enrichFields.layanan || "")
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean),
      keunggulan: Array.isArray(enrichFields.keunggulan)
        ? enrichFields.keunggulan.filter(Boolean)
        : (enrichFields.keunggulan || "")
            .split("\n")
            .map((s: string) => s.trim())
            .filter(Boolean),
      catatan_internal: enrichFields.catatan_internal || null,
    };

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("demo_businesses")
      .update({
        enriched_data,
        enriched_at: new Date().toISOString(),
      })
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, enriched_data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
