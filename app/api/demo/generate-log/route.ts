/**
 * app/api/demo/generate-log/route.ts
 * GET /api/demo/generate-log?slug=xxx&lines=200
 * Baca N baris terakhir dari tabel demo_generate_logs
 */

import { NextRequest, NextResponse } from "next/server";
import { readRecentLogs } from "@/lib/generate-logger";
import { requireAdminSession } from "@/lib/admin-route-auth";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const lines = Math.min(Number(searchParams.get("lines") || "200"), 500);
  const slug = searchParams.get("slug") || undefined;

  const logLines = await readRecentLogs({ slug, limit: lines });

  return NextResponse.json({
    lines: logLines,
    count: logLines.length,
    timestamp: new Date().toISOString(),
  });
}
