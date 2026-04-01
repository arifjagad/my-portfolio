/**
 * lib/openrouter-models.ts
 *
 * Daftar model OpenRouter yang digunakan sebagai fallback
 * ketika Gemini API gagal atau kena rate limit.
 *
 * Edit file ini untuk menambah / menghapus / mengurutkan model.
 * Format: string ID model sesuai OpenRouter (provider/model-name)
 *
 * Referensi model: https://openrouter.ai/models
 */

export interface OpenRouterModel {
  /** ID model di OpenRouter, contoh: "google/gemini-2.0-flash-001" */
  id: string;
  /** Nama tampilan (hanya untuk logging) */
  label: string;
  /** Context window dalam tokens (opsional, hanya info) */
  contextWindow?: number;
}

/**
 * Urutan prioritas: model paling cepat & murah di atas,
 * model yang lebih powerful di bawah sebagai cadangan akhir.
 * Kamu bisa mengurutkan ulang sesuai preferensi.
 */
export const OPENROUTER_MODELS: OpenRouterModel[] = [
  // ── Gemini via OpenRouter ────────────────────────────────────────────────
  {
    id: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash (OpenRouter)",
    contextWindow: 1048576,
  },
  {
    id: "google/gemini-2.5-flash-preview:thinking",
    label: "Gemini 2.5 Flash Preview Thinking (OpenRouter)",
    contextWindow: 1048576,
  },

  // ── Qwen (gratis / murah) ────────────────────────────────────────────────
  {
    id: "qwen/qwen3-235b-a22b:free",
    label: "Qwen3 235B A22B (Free)",
    contextWindow: 40960,
  },
  {
    id: "qwen/qwen3-30b-a3b:free",
    label: "Qwen3 30B A3B (Free)",
    contextWindow: 40960,
  },

  // ── DeepSeek ────────────────────────────────────────────────────────────
  {
    id: "deepseek/deepseek-chat-v3-0324:free",
    label: "DeepSeek Chat V3 (Free)",
    contextWindow: 65536,
  },
  {
    id: "deepseek/deepseek-r1:free",
    label: "DeepSeek R1 (Free)",
    contextWindow: 65536,
  },

  // ── Meta Llama ───────────────────────────────────────────────────────────
  {
    id: "meta-llama/llama-4-maverick:free",
    label: "Llama 4 Maverick (Free)",
    contextWindow: 524288,
  },
  {
    id: "meta-llama/llama-4-scout:free",
    label: "Llama 4 Scout (Free)",
    contextWindow: 524288,
  },

  // ── Mistral ──────────────────────────────────────────────────────────────
  {
    id: "mistralai/mistral-small-3.1-24b-instruct:free",
    label: "Mistral Small 3.1 24B (Free)",
    contextWindow: 131072,
  },

  // ── Microsoft ────────────────────────────────────────────────────────────
  {
    id: "microsoft/phi-4-reasoning-plus:free",
    label: "Phi-4 Reasoning Plus (Free)",
    contextWindow: 32768,
  },

  // ── Xiaomi MiMo ─────────────────────────────────────────────────────────
  {
    id: "xiaomi/mimo-v2-pro",
    label: "Xiaomi MiMo V2 Pro",
    contextWindow: 32768,
  },

  // ── Claude ─────────────────────────────────────────────────────────
  {
    id: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    contextWindow: 1048576,
  },
  {
    id: "anthropic/claude-opus-4.5",
    label: "Claude Opus 4.5",
    contextWindow: 1048576,
  },
];
