/**
 * app/api/demo/generate-log/route.ts
 * GET /api/demo/generate-log?lines=200
 * Baca N baris terakhir dari logs/ai-generate.log
 */

import { NextRequest, NextResponse } from "next/server";
import { readLastLines, LOG_FILE_PATH } from "@/lib/generate-logger";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lines = Math.min(Number(searchParams.get("lines") || "200"), 500);

  const logLines = readLastLines(lines);

  return NextResponse.json({
    lines: logLines,
    file: LOG_FILE_PATH,
    count: logLines.length,
    timestamp: new Date().toISOString(),
  });
}
