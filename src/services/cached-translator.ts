/**
 * Cached Translator Service
 * Translates text using OpenAI API with KV cache support
 */

import type { KVNamespace } from '../types/env'
import { KvCacheService } from './kv-cache'
import { type OpenAIClient, OpenAITranslatorService } from './openai-translator'
import type { SupportedLang } from './translate'

/**
 * Options for CachedTranslatorService
 */
interface CachedTranslatorOptions {
  /** OpenAI API key */
  apiKey: string
  /** KV namespace for caching (optional) */
  kv?: KVNamespace
  /** OpenAI client for testing (optional) */
  client?: OpenAIClient
}

/**
 * Service for translating text with KV cache support.
 * Checks cache before calling OpenAI API and stores results in cache.
 */
export class CachedTranslatorService {
  private readonly translator: OpenAITranslatorService
  private readonly cache: KvCacheService | null

  /**
   * Creates a new CachedTranslatorService instance.
   * @param options - Configuration options
   */
  constructor(options: CachedTranslatorOptions) {
    this.translator = new OpenAITranslatorService(
      options.apiKey,
      options.client,
    )
    this.cache = options.kv ? new KvCacheService(options.kv) : null
  }

  /**
   * Executes the translation operation for multiple texts with caching.
   * @param texts - The texts to translate
   * @param targetLang - The target language code
   * @returns A Map of original text to translated text
   */
  public async execute(
    texts: string[],
    targetLang: SupportedLang,
  ): Promise<Map<string, string>> {
    if (texts.length === 0) {
      return new Map()
    }

    const translations = new Map<string, string>()
    const textsToTranslate: string[] = []

    // Check cache for each text
    const cache = this.cache
    if (cache) {
      await Promise.all(
        texts.map(async (text) => {
          const key = cache.generateKey(text, targetLang)
          const cached = await cache.execute(key)

          if (cached) {
            translations.set(text, cached.translatedText)
          } else {
            textsToTranslate.push(text)
          }
        }),
      )
    } else {
      textsToTranslate.push(...texts)
    }

    // Translate uncached texts
    if (textsToTranslate.length > 0) {
      const newTranslations = await this.translator.execute(
        textsToTranslate,
        targetLang,
      )

      // Store in cache and add to results
      for (const [original, translated] of newTranslations) {
        translations.set(original, translated)

        // Store in cache (fire-and-forget)
        if (this.cache) {
          const key = this.cache.generateKey(original, targetLang)
          this.cache.set(key, translated).catch((error) => {
            console.error('Failed to cache translation:', error)
          })
        }
      }
    }

    return translations
  }
}
