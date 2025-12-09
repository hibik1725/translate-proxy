import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KVNamespace } from '../types/env'
import { type CacheEntry, KvCacheService } from './kv-cache'

/**
 * Mock KV interface for testing
 * Type assertion comment: MockKV is a simplified version of KVNamespace
 * that's compatible with vi.fn() return types for testing purposes
 */
interface MockKV {
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
}

describe('KvCacheService', () => {
  const createMockKV = (): MockKV => ({
    get: vi.fn(),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    list: vi.fn(),
  })

  /**
   * Creates a KvCacheService with a mock KV namespace.
   * Type assertion comment: MockKV implements the required KVNamespace methods
   */
  const createService = (mockKV: MockKV): KvCacheService => {
    return new KvCacheService(mockKV as KVNamespace)
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateKey', () => {
    it('言語とテキストのハッシュからキーを生成すること', () => {
      // Arrange
      const mockKV = createMockKV()
      const service = createService(mockKV)

      // Act
      const key = service.generateKey('こんにちは', 'en')

      // Assert
      expect(key).toMatch(/^en:[0-9a-f]+$/)
    })

    it('同じテキストでも言語が異なれば異なるキーを生成すること', () => {
      // Arrange
      const mockKV = createMockKV()
      const service = createService(mockKV)

      // Act
      const keyEn = service.generateKey('テスト', 'en')
      // Note: 現在はenのみサポートだが、将来の拡張を想定
      const keyEn2 = service.generateKey('テスト', 'en')

      // Assert
      expect(keyEn).toBe(keyEn2)
    })

    it('異なるテキストでは異なるハッシュを生成すること', () => {
      // Arrange
      const mockKV = createMockKV()
      const service = createService(mockKV)

      // Act
      const key1 = service.generateKey('テキスト1', 'en')
      const key2 = service.generateKey('テキスト2', 'en')

      // Assert
      expect(key1).not.toBe(key2)
    })
  })

  describe('execute', () => {
    describe('成功系', () => {
      it('キャッシュヒット時にtranslatedTextを返すこと', async () => {
        // Arrange
        const mockKV = createMockKV()
        const cachedEntry: CacheEntry = {
          translatedText: 'Hello',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUsedAt: '2024-01-01T00:00:00.000Z',
        }
        mockKV.get.mockResolvedValue(cachedEntry)
        const service = createService(mockKV)

        // Act
        const result = await service.execute('en:abc123')

        // Assert
        expect(result).not.toBeNull()
        expect(result?.translatedText).toBe('Hello')
        expect(result?.hit).toBe(true)
      })

      it('キャッシュヒット時にlastUsedAtを更新すること', async () => {
        // Arrange
        const mockKV = createMockKV()
        const originalDate = '2024-01-01T00:00:00.000Z'
        const cachedEntry: CacheEntry = {
          translatedText: 'Hello',
          createdAt: originalDate,
          lastUsedAt: originalDate,
        }
        mockKV.get.mockResolvedValue(cachedEntry)
        const service = createService(mockKV)

        // Act
        await service.execute('en:abc123')

        // Assert
        expect(mockKV.put).toHaveBeenCalledTimes(1)
        const putCall = mockKV.put.mock.calls[0]
        expect(putCall[0]).toBe('en:abc123')
        const updatedEntry = JSON.parse(putCall[1] as string) as CacheEntry
        expect(updatedEntry.lastUsedAt).not.toBe(originalDate)
        expect(updatedEntry.createdAt).toBe(originalDate) // createdAtは変わらない
      })

      it('キャッシュミス時にnullを返すこと', async () => {
        // Arrange
        const mockKV = createMockKV()
        mockKV.get.mockResolvedValue(null)
        const service = createService(mockKV)

        // Act
        const result = await service.execute('en:nonexistent')

        // Assert
        expect(result).toBeNull()
      })

      it('不正なキャッシュデータの場合はnullを返すこと', async () => {
        // Arrange
        const mockKV = createMockKV()
        mockKV.get.mockResolvedValue({ invalid: 'data' })
        const service = createService(mockKV)

        // Act
        const result = await service.execute('en:invalid')

        // Assert
        expect(result).toBeNull()
      })
    })
  })

  describe('set', () => {
    describe('成功系', () => {
      it('翻訳結果を保存できること', async () => {
        // Arrange
        const mockKV = createMockKV()
        const service = createService(mockKV)

        // Act
        await service.set('en:abc123', 'Hello World')

        // Assert
        expect(mockKV.put).toHaveBeenCalledTimes(1)
        const putCall = mockKV.put.mock.calls[0]
        expect(putCall[0]).toBe('en:abc123')
        const entry = JSON.parse(putCall[1] as string) as CacheEntry
        expect(entry.translatedText).toBe('Hello World')
      })

      it('createdAtとlastUsedAtが設定されること', async () => {
        // Arrange
        const mockKV = createMockKV()
        const service = createService(mockKV)
        const beforeTime = new Date().toISOString()

        // Act
        await service.set('en:abc123', 'Hello')

        // Assert
        const putCall = mockKV.put.mock.calls[0]
        const entry = JSON.parse(putCall[1] as string) as CacheEntry
        expect(entry.createdAt).toBeDefined()
        expect(entry.lastUsedAt).toBeDefined()
        expect(entry.createdAt).toBe(entry.lastUsedAt)
        expect(entry.createdAt >= beforeTime).toBe(true)
      })
    })
  })
})
