/**
 * app/api/demo/models/route.ts
 * GET /api/demo/models
 * Daftar model yang tersedia di 9router lokal, untuk dropdown admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/admin-route-auth";
import { getNineRouterConfig, isRunningOnVercel } from "@/lib/ninerouter";

export async function GET(req: NextRequest) {
  const auth = await requireAdminSession(req);
  if (!auth.ok) return auth.response;

  if (isRunningOnVercel()) {
    return NextResponse.json({ models: [], error: "9router hanya tersedia saat admin dijalankan di laptop" });
  }

  const { baseUrl, apiKey } = getNineRouterConfig();
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ models: [], error: `9router HTTP ${res.status}` });
    }

    const data = await res.json();
    const models: string[] = (Array.isArray(data?.data) ? data.data : [])
      .map((m: any) => m?.id)
      .filter((id: unknown): id is string => typeof id === "string");

    return NextResponse.json({ models, apiKeyConfigured: Boolean(apiKey) });
  } catch {
    return NextResponse.json({ models: [], error: `9router tidak bisa dihubungi di ${baseUrl}` });
  }
}
