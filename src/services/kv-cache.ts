/**
 * KV Cache Service
 * Caches translation results in Cloudflare KV with TTL support
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
 * Options for KvCacheService
 */
export interface KvCacheOptions {
  /** TTL in seconds (default: 30 days = 2592000 seconds) */
  ttlSeconds?: number
  /** Minimum interval between lastUsedAt updates in seconds (default: 1 day = 86400 seconds) */
  lastUsedAtUpdateIntervalSeconds?: number
}

/**
 * Default TTL: 30 days in seconds
 */
const DEFAULT_TTL_SECONDS = 30 * 24 * 60 * 60

/**
 * Default interval for lastUsedAt updates: 1 day in seconds
 */
const DEFAULT_LAST_USED_AT_UPDATE_INTERVAL_SECONDS = 24 * 60 * 60

/**
 * Service for caching translation results in Cloudflare KV.
 */
export class KvCacheService {
  private readonly kv: KVNamespace
  private readonly ttlSeconds: number
  private readonly lastUsedAtUpdateIntervalSeconds: number

  /**
   * Creates a new KvCacheService instance.
   * @param kv - The Cloudflare KV namespace binding
   * @param options - Optional configuration options
   */
  constructor(kv: KVNamespace, options?: KvCacheOptions) {
    this.kv = kv
    this.ttlSeconds = options?.ttlSeconds ?? DEFAULT_TTL_SECONDS
    this.lastUsedAtUpdateIntervalSeconds =
      options?.lastUsedAtUpdateIntervalSeconds ??
      DEFAULT_LAST_USED_AT_UPDATE_INTERVAL_SECONDS
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
   * Only updates lastUsedAt if more than the configured interval has passed.
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

    // Only update lastUsedAt if more than the configured interval has passed
    const lastUsedAt = new Date(cached.lastUsedAt)
    const now = new Date()
    const secondsSinceLastUpdate = (now.getTime() - lastUsedAt.getTime()) / 1000

    if (secondsSinceLastUpdate >= this.lastUsedAtUpdateIntervalSeconds) {
      const updatedEntry: CacheEntry = {
        ...cached,
        lastUsedAt: now.toISOString(),
      }

      // Fire-and-forget update with TTL refresh (don't await to avoid latency)
      this.kv
        .put(key, JSON.stringify(updatedEntry), {
          expirationTtl: this.ttlSeconds,
        })
        .catch((error) => {
          console.error('Failed to update cache lastUsedAt:', error)
        })
    }

    return {
      translatedText: cached.translatedText,
      hit: true,
    }
  }

  /**
   * Stores a translation in the cache with TTL.
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

    await this.kv.put(key, JSON.stringify(entry), {
      expirationTtl: this.ttlSeconds,
    })
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
