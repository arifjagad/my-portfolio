/**
 * lib/ai-providers.ts
 * Identitas provider AI yang dipakai admin & generator. Aman untuk client.
 *
 * Format provider:
 *   "9router:<model>"  → 9router lokal (OpenAI-compatible, localhost:20128)
 *   "gemini"           → Gemini API langsung + fallback OpenRouter
 *   "<vendor>/<model>" → model OpenRouter tertentu
 */

export const NINEROUTER_PREFIX = "9router:";
export const NINEROUTER_DEFAULT_MODEL = "ag/gemini-3.8-flash";
export const DEFAULT_PROVIDER = `${NINEROUTER_PREFIX}${NINEROUTER_DEFAULT_MODEL}`;

export function isNineRouterProvider(provider: string | null | undefined): boolean {
  return Boolean(provider?.startsWith(NINEROUTER_PREFIX));
}

export function nineRouterModelOf(provider: string): string {
  return provider.slice(NINEROUTER_PREFIX.length) || NINEROUTER_DEFAULT_MODEL;
}
