/**
 * app/api/demo/status/route.ts
 * PATCH /api/demo/status
 * Body: { slug, status_pitch, mark_sent? }
 * mark_sent=true dipakai tombol WhatsApp: perbarui pitched_at walau status sudah "sudah_dikirim"
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-admin";
import { requireAdminSession } from "@/lib/admin-route-auth";

const VALID_STATUS = ["belum_dikirim", "sudah_dikirim", "deal", "tidak_tertarik"];

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.ok) return auth.response;

    const { slug, status_pitch, mark_sent } = await req.json();

    if (!slug || !status_pitch) {
      return NextResponse.json(
        { error: "slug dan status_pitch wajib diisi" },
        { status: 400 }
      );
    }

    if (!VALID_STATUS.includes(status_pitch)) {
      return NextResponse.json(
        { error: `status_pitch harus salah satu dari: ${VALID_STATUS.join(", ")}` },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { data: current, error: fetchErr } = await supabase
      .from("demo_businesses")
      .select("pitched_at")
      .eq("slug", slug)
      .single();

    if (fetchErr || !current) {
      return NextResponse.json({ error: "Bisnis tidak ditemukan" }, { status: 404 });
    }

    // pitched_at = waktu pesan terakhir dikirim; diperbarui saat kirim ulang (follow-up)
    const pitched_at =
      status_pitch === "sudah_dikirim" && (mark_sent === true || !current.pitched_at)
        ? new Date().toISOString()
        : current.pitched_at;

    const { error } = await supabase
      .from("demo_businesses")
      .update({ status_pitch, pitched_at })
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status_pitch, pitched_at });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
