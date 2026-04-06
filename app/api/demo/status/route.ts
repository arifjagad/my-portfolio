/**
 * app/api/demo/status/route.ts
 * PATCH /api/demo/status
 * Body: { slug, status_pitch }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdminSession } from "@/lib/admin-route-auth";

const VALID_STATUS = ["belum_dikirim", "sudah_dikirim", "deal", "tidak_tertarik"];

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.ok) return auth.response;

    const { slug, status_pitch } = await req.json();

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
    const { error } = await supabase
      .from("demo_businesses")
      .update({ status_pitch })
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, status_pitch });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
