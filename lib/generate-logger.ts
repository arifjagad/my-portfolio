/**
 * lib/generate-logger.ts
 * File-based logger khusus untuk proses AI generate.
 * Semua log ditulis ke: logs/ai-generate.log (di root project)
 *
 * Format tiap baris:
 *   [2026-04-01 15:30:00.123] [LEVEL] [SESSION] message
 */

import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "ai-generate.log");
const MAX_LOG_BYTES = 5 * 1024 * 1024; // 5 MB, lalu rotate

let currentSession = "";

/** Buat session ID baru (slug + timestamp) */
export function startLogSession(slug: string): string {
  currentSession = `${slug}@${Date.now()}`;
  log("START", `════════════════════════════════════════════════════════════`);
  log("START", `Sesi baru dimulai — bisnis: ${slug}`);
  log("START", `Session ID: ${currentSession}`);
  return currentSession;
}

/** Tulis satu baris log */
export function log(
  level: "START" | "INFO" | "OK" | "WARN" | "ERROR" | "DONE",
  message: string,
  session?: string
): void {
  try {
    // Pastikan dir ada
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }

    // Rotate jika terlalu besar
    if (fs.existsSync(LOG_FILE)) {
      const stat = fs.statSync(LOG_FILE);
      if (stat.size > MAX_LOG_BYTES) {
        const backup = LOG_FILE.replace(".log", ".old.log");
        if (fs.existsSync(backup)) fs.unlinkSync(backup);
        fs.renameSync(LOG_FILE, backup);
      }
    }

    const now = new Date();
    const ts = now
      .toLocaleString("id-ID", {
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

    const ms = String(now.getMilliseconds()).padStart(3, "0");
    const sid = session || currentSession || "-";
    const line = `[${ts}.${ms}] [${level.padEnd(5)}] [${sid}] ${message}\n`;

    fs.appendFileSync(LOG_FILE, line, "utf8");
  } catch {
    // Jangan crash app hanya karena log gagal
  }
}

/** Baca N baris terakhir dari log file */
export function readLastLines(n = 100): string[] {
  try {
    if (!fs.existsSync(LOG_FILE)) return ["(Log file belum ada — belum ada generate yang dijalankan)"];
    const content = fs.readFileSync(LOG_FILE, "utf8");
    const lines = content.split("\n").filter(Boolean);
    return lines.slice(-n);
  } catch (err: any) {
    return [`(Gagal baca log: ${err?.message})`];
  }
}

/** Path log file (untuk ditampilkan di UI) */
export const LOG_FILE_PATH = LOG_FILE;
