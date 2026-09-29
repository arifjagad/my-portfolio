/**
 * lib/generate-logger.ts
 * Logger proses AI generate. Tiap baris ditulis ke console (Vercel logs)
 * dan ke tabel demo_generate_logs agar bisa dipantau live dari admin.
 *
 * Sesi disimpan di AsyncLocalStorage, jadi beberapa generate yang berjalan
 * bersamaan tidak saling menimpa session ID.
 *
 * Format baris untuk UI:
 *   [2026-04-01 15:30:00.123] [LEVEL] [SESSION] message
 */

import { AsyncLocalStorage } from "node:async_hooks";
import { getServiceClient } from "./supabase-admin";

export type LogLevel = "START" | "INFO" | "OK" | "WARN" | "ERROR" | "DONE";

interface LogSession {
  id: string;
  slug: string;
  seq: number;
  pending: Promise<unknown>[];
}

const RETENTION_DAYS = 30;
const sessionStore = new AsyncLocalStorage<LogSession>();

/** Jalankan fn di dalam sesi log baru; semua insert log di-flush sebelum return. */
export async function runLogSession<T>(slug: string, fn: () => Promise<T>): Promise<T> {
  const session: LogSession = { id: `${slug}@${Date.now()}`, slug, seq: 0, pending: [] };

  return sessionStore.run(session, async () => {
    log("START", `════════════════════════════════════════════════════════════`);
    log("START", `Sesi baru dimulai — bisnis: ${slug}`);
    log("START", `Session ID: ${session.id}`);
    pruneOldLogs();

    try {
      return await fn();
    } finally {
      await Promise.allSettled(session.pending);
    }
  });
}

export function log(level: LogLevel, message: string): void {
  const session = sessionStore.getStore();
  const createdAt = new Date();
  const line = formatLine(createdAt, level, session?.id ?? "-", message);

  if (level === "ERROR") console.error(line);
  else console.log(line);

  if (!session) return;

  const seq = session.seq++;
  const insert = Promise.resolve(
    getServiceClient()
      .from("demo_generate_logs")
      .insert({
        session_id: session.id,
        slug: session.slug,
        seq,
        level,
        message,
        created_at: createdAt.toISOString(),
      })
  ).catch(() => {
    // Jangan gagalkan generate hanya karena log gagal
  });
  session.pending.push(insert);
}

/** N baris log terakhir (urut lama → baru), opsional difilter per slug. */
export async function readRecentLogs(options: { slug?: string; limit?: number } = {}): Promise<string[]> {
  const limit = Math.min(Math.max(options.limit ?? 150, 1), 500);

  let query = getServiceClient()
    .from("demo_generate_logs")
    .select("session_id, level, message, created_at, seq")
    .order("created_at", { ascending: false })
    .order("seq", { ascending: false })
    .limit(limit);

  if (options.slug) query = query.eq("slug", options.slug);

  const { data, error } = await query;
  if (error) return [`(Gagal baca log: ${error.message})`];
  if (!data?.length) return ["(Belum ada log generate)"];

  return data
    .reverse()
    .map((row) => formatLine(new Date(row.created_at), row.level as LogLevel, row.session_id, row.message));
}

function formatLine(date: Date, level: LogLevel, sessionId: string, message: string): string {
  const ts = date
    .toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
    .replace(/\//g, "-")
    .replace(",", "");
  const ms = String(date.getMilliseconds()).padStart(3, "0");
  return `[${ts}.${ms}] [${level.padEnd(5)}] [${sessionId}] ${message}`;
}

function pruneOldLogs(): void {
  const session = sessionStore.getStore();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
  const prune = Promise.resolve(
    getServiceClient().from("demo_generate_logs").delete().lt("created_at", cutoff)
  ).catch(() => {});
  session?.pending.push(prune);
}
