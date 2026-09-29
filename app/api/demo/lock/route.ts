/**
 * app/api/demo/lock/route.ts
 * POST /api/demo/lock
 * Body: { slug, is_locked, reason? }
 */

import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-admin";
import { requireAdminSession } from "@/lib/admin-route-auth";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminSession(req);
    if (!auth.ok) return auth.response;

    const { slug, is_locked, reason } = await req.json();

    if (!slug || typeof is_locked !== "boolean") {
      return NextResponse.json(
        { error: "slug dan is_locked wajib diisi" },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();
    const { error } = await supabase
      .from("demo_businesses")
      .update({
        is_locked,
        lock_reason: is_locked ? (reason || null) : null,
      })
      .eq("slug", slug);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, is_locked });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
