/**
 * app/api/demo/visit/route.ts
 * POST /api/demo/visit
 * Body: { slug }
 * Catat kunjungan publik ke halaman demo. Kunjungan admin & bot tidak dihitung,
 * IP disimpan sebagai hash, dan IP yang sama dalam 30 menit dihitung sekali (di SQL).
 */

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-admin";
import { requireAdminSession } from "@/lib/admin-route-auth";
import { rateLimitByIp } from "@/lib/rate-limit";

const BOT_UA = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse/i;

function getClientIp(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip");
}

function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.VISIT_HASH_SALT || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

function hasSupabaseAuthCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export async function POST(req: NextRequest) {
  const rate = rateLimitByIp(req, "api:demo:visit", 30, 60_000);
  if (!rate.allowed) return NextResponse.json({ recorded: false }, { status: 429 });

  let slug = "";
  try {
    const body = await req.json();
    slug = typeof body?.slug === "string" ? body.slug.trim() : "";
  } catch {
    // body kosong / bukan JSON
  }
  if (!slug || slug.length > 200) {
    return NextResponse.json({ recorded: false }, { status: 400 });
  }

  const userAgent = req.headers.get("user-agent") || "";
  if (BOT_UA.test(userAgent)) {
    return NextResponse.json({ recorded: false, reason: "bot" });
  }

  // Admin yang membuka demo sendiri tidak dihitung
  if (hasSupabaseAuthCookie(req)) {
    const admin = await requireAdminSession(req);
    if (admin.ok) return NextResponse.json({ recorded: false, reason: "admin" });
  }

  const { data, error } = await getServiceClient().rpc("record_demo_visit", {
    p_slug: slug,
    p_ip_hash: hashIp(getClientIp(req)),
    p_user_agent: userAgent,
    p_referrer: req.headers.get("referer"),
  });

  if (error) {
    console.error("[API/visit] RPC error:", error.message);
    return NextResponse.json({ recorded: false }, { status: 500 });
  }

  return NextResponse.json({ recorded: Boolean(data) });
}
