/**
 * KV Namespace interface for Cloudflare Workers
 */
export interface KVNamespace {
  get(key: string): Promise<string | null>
  get(key: string, options: { type: 'text' }): Promise<string | null>
  get(key: string, options: { type: 'json' }): Promise<object | null>
  get(
    key: string,
    options: { type: 'arrayBuffer' },
  ): Promise<ArrayBuffer | null>
  get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>
  put(
    key: string,
    value: string | ArrayBuffer | ReadableStream,
    options?: { expiration?: number; expirationTtl?: number },
  ): Promise<void>
  delete(key: string): Promise<void>
  list(options?: {
    prefix?: string
    limit?: number
    cursor?: string
  }): Promise<{
    keys: Array<{ name: string; expiration?: number }>
    list_complete: boolean
    cursor?: string
  }>
}

/**
 * Cloudflare Workers environment bindings
 */
export interface Env {
  /** Origin server URL */
  ORIGIN_URL: string
  /** OpenAI API Key */
  OPENAI_API_KEY: string
  /** Cloudflare KV namespace for translation cache */
  TRANSLATION_CACHE?: KVNamespace
}
