/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  /** Origin server URL */
  ORIGIN_URL: string
  /** OpenAI API Key */
  OPENAI_API_KEY: string
  /** Cloudflare KV namespace for translation cache */
  TRANSLATION_CACHE?: unknown
}
