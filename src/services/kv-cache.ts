/**
 * KV Cache Service
 * Caches translation results in Cloudflare KV
 */

import type { KVNamespace } from '../types/env'
import type { SupportedLang } from './translate'

/**
 * Cache entry structure for storing translation data
 */
export interface CacheEntry {
  /** Translated text */
  translatedText: string
  /** Last used timestamp (ISO 8601 format) */
  lastUsedAt: string
  /** Creation timestamp (ISO 8601 format) */
  createdAt: string
}

/**
 * Result of a cache get operation
 */
export interface CacheGetResult {
  /** The translated text if found */
  translatedText: string
  /** Whether the cache was hit */
  hit: boolean
}

/**
 * Service for caching translation results in Cloudflare KV.
 */
export class KvCacheService {
  private readonly kv: KVNamespace

  /**
   * Creates a new KvCacheService instance.
   * @param kv - The Cloudflare KV namespace binding
   */
  constructor(kv: KVNamespace) {
    this.kv = kv
  }

  /**
   * Generates a cache key for a translation.
   * @param text - The original text
   * @param targetLang - The target language code
   * @returns The cache key
   */
  public generateKey(text: string, targetLang: SupportedLang): string {
    const hash = this.hashText(text)
    return `${targetLang}:${hash}`
  }

  /**
   * Retrieves a cached translation and updates lastUsedAt timestamp.
   * @param key - The cache key
   * @returns The cache entry if found, null otherwise
   */
  public async execute(key: string): Promise<CacheGetResult | null> {
    let cached: object | null
    try {
      cached = await this.kv.get(key, { type: 'json' })
    } catch (error) {
      // JSON parse error - treat as cache miss
      console.error('Failed to parse cached JSON:', error)
      return null
    }

    if (!this.isCacheEntry(cached)) {
      return null
    }

    // Update lastUsedAt timestamp
    const updatedEntry: CacheEntry = {
      ...cached,
      lastUsedAt: new Date().toISOString(),
    }

    // Fire-and-forget update (don't await to avoid latency)
    this.kv.put(key, JSON.stringify(updatedEntry)).catch((error) => {
      console.error('Failed to update cache lastUsedAt:', error)
    })

    return {
      translatedText: cached.translatedText,
      hit: true,
    }
  }

  /**
   * Stores a translation in the cache.
   * @param key - The cache key
   * @param translatedText - The translated text to cache
   */
  public async set(key: string, translatedText: string): Promise<void> {
    const now = new Date().toISOString()
    const entry: CacheEntry = {
      translatedText,
      createdAt: now,
      lastUsedAt: now,
    }

    await this.kv.put(key, JSON.stringify(entry))
  }

  /**
   * Simple hash function for generating cache keys.
   * Uses a basic djb2-like algorithm for speed.
   * @param text - The text to hash
   * @returns The hash as a hexadecimal string
   */
  private hashText(text: string): string {
    let hash = 5381
    for (let i = 0; i < text.length; i++) {
      hash = ((hash << 5) + hash) ^ text.charCodeAt(i)
    }
    // Convert to unsigned 32-bit integer and then to hex
    return (hash >>> 0).toString(16)
  }

  /**
   * Type guard to check if a value is a valid CacheEntry.
   * @param value - The value to check
   * @returns True if the value is a valid CacheEntry
   */
  private isCacheEntry(value: object | null): value is CacheEntry {
    if (value === null || typeof value !== 'object') {
      return false
    }

    const entry = value as Partial<CacheEntry>

    return (
      typeof entry.translatedText === 'string' &&
      typeof entry.lastUsedAt === 'string' &&
      typeof entry.createdAt === 'string'
    )
  }
}
