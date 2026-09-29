/**
 * lib/ninerouter.ts
 * Client 9router lokal (server-only): chat streaming + Google Search.
 *
 * Env:
 *   NINEROUTER_API_KEY   — API key dari dashboard 9router (wajib)
 *   NINEROUTER_BASE_URL  — default http://localhost:20128/v1
 */

export function getNineRouterConfig(): { baseUrl: string; apiKey: string | null } {
  return {
    baseUrl: (process.env.NINEROUTER_BASE_URL || "http://localhost:20128/v1").replace(/\/$/, ""),
    apiKey: process.env.NINEROUTER_API_KEY || null,
  };
}

/** Generate lewat 9router hanya bisa dari laptop; server Vercel tidak bisa menjangkau localhost. */
export function isRunningOnVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

export function requireNineRouter(): { baseUrl: string; apiKey: string } {
  const { baseUrl, apiKey } = getNineRouterConfig();
  if (isRunningOnVercel()) {
    throw new Error("9router hanya bisa dipakai dari laptop (npm run dev), bukan di Vercel.");
  }
  if (!apiKey) {
    throw new Error("NINEROUTER_API_KEY belum diisi di .env.local (ambil dari dashboard 9router).");
  }
  return { baseUrl, apiKey };
}

// ─── Chat completions (streaming) ────────────────────────────────────────────
export type ChatContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

/**
 * Panggil chat/completions dengan stream=true.
 * Streaming dipakai agar model yang lama "berpikir" tidak kena headersTimeout
 * fetch Node (5 menit) dan progres bisa dilaporkan lewat onProgress.
 */
export async function streamChatCompletion(opts: {
  model: string;
  content: ChatContent;
  temperature: number;
  signal?: AbortSignal;
  onProgress?: (receivedChars: number) => void;
}): Promise<string> {
  const { baseUrl, apiKey } = requireNineRouter();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify({
      model: opts.model,
      messages: [{ role: "user", content: opts.content }],
      max_tokens: 65536,
      temperature: opts.temperature,
      stream: true,
    }),
    signal: opts.signal,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  // Beberapa provider mengabaikan stream=true dan membalas JSON biasa
  if (!(res.headers.get("content-type") || "").includes("event-stream") || !res.body) {
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? "";
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let chunk: any;
      try {
        chunk = JSON.parse(payload);
      } catch {
        continue;
      }
      if (chunk?.error) throw new Error(chunk.error.message || "Stream error dari provider");

      const delta = chunk?.choices?.[0]?.delta?.content;
      if (typeof delta === "string") text += delta;
    }

    opts.onProgress?.(text.length);
  }

  return text;
}

// ─── Google Search (Gemini grounding via akun Antigravity) ───────────────────
export interface SearchResult {
  title: string;
  url: string | null;
  snippet: string;
}

export interface SearchResponse {
  query: string;
  answer: string;
  results: SearchResult[];
}

export async function nineRouterSearch(query: string, maxResults = 8): Promise<SearchResponse> {
  const { baseUrl, apiKey } = requireNineRouter();

  const res = await fetch(`${baseUrl}/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "antigravity", query, max_results: maxResults }),
    signal: AbortSignal.timeout(90_000),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.error?.message || data?.error || `HTTP ${res.status}`;
    throw new Error(`Search gagal: ${message}`);
  }

  return {
    query,
    answer: typeof data?.answer?.text === "string" ? data.answer.text : "",
    results: (Array.isArray(data?.results) ? data.results : []).map((r: any) => ({
      title: String(r?.title || ""),
      url: typeof r?.url === "string" ? r.url : null,
      snippet: String(r?.snippet || ""),
    })),
  };
}
