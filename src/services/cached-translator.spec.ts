import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KVNamespace } from '../types/env'
import { CachedTranslatorService } from './cached-translator'
import type { OpenAIClient } from './openai-translator'

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

describe('CachedTranslatorService', () => {
  const createMockKV = (): MockKV => ({
    get: vi.fn(),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    list: vi.fn(),
  })

  // Type assertion comment: vi.fn() returns a generic mock type that's
  // compatible with OpenAIClient.chat.completions.create for testing
  const createMockClient = (createFn: ReturnType<typeof vi.fn>): OpenAIClient =>
    ({
      chat: {
        completions: {
          create: createFn,
        },
      },
    }) as OpenAIClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('execute', () => {
    describe('成功系', () => {
      it('キャッシュヒット時にOpenAIを呼ばないこと', async () => {
        // Arrange
        const mockKV = createMockKV()
        mockKV.get.mockResolvedValue({
          translatedText: 'Hello',
          createdAt: '2024-01-01T00:00:00.000Z',
          lastUsedAt: '2024-01-01T00:00:00.000Z',
        })
        const mockCreate = vi.fn()
        const mockClient = createMockClient(mockCreate)

        const service = new CachedTranslatorService({
          apiKey: 'test-api-key',
          kv: mockKV as KVNamespace,
          client: mockClient,
        })

        // Act
        const result = await service.execute(['こんにちは'], 'en')

        // Assert
        expect(result.size).toBe(1)
        expect(result.get('こんにちは')).toBe('Hello')
        expect(mockCreate).not.toHaveBeenCalled()
      })

      it('キャッシュヒット時にlastUsedAtが更新されること', async () => {
        // Arrange
        const mockKV = createMockKV()
        const originalDate = '2024-01-01T00:00:00.000Z'
        mockKV.get.mockResolvedValue({
          translatedText: 'Hello',
          createdAt: originalDate,
          lastUsedAt: originalDate,
        })
        const mockCreate = vi.fn()
        const mockClient = createMockClient(mockCreate)

        const service = new CachedTranslatorService({
          apiKey: 'test-api-key',
          kv: mockKV as KVNamespace,
          client: mockClient,
        })

        // Act
        await service.execute(['こんにちは'], 'en')

        // Wait for fire-and-forget put to complete
        await new Promise((resolve) => setTimeout(resolve, 10))

        // Assert - KV.put should be called to update lastUsedAt
        expect(mockKV.put).toHaveBeenCalled()
      })

      it('キャッシュミス時にOpenAIを呼び結果を保存すること', async () => {
        // Arrange
        const mockKV = createMockKV()
        mockKV.get.mockResolvedValue(null) // Cache miss
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Hello World' } }],
        })
        const mockClient = createMockClient(mockCreate)

        const service = new CachedTranslatorService({
          apiKey: 'test-api-key',
          kv: mockKV as KVNamespace,
          client: mockClient,
        })

        // Act
        const result = await service.execute(['こんにちは世界'], 'en')

        // Wait for fire-and-forget put to complete
        await new Promise((resolve) => setTimeout(resolve, 10))

        // Assert
        expect(result.size).toBe(1)
        expect(result.get('こんにちは世界')).toBe('Hello World')
        expect(mockCreate).toHaveBeenCalledTimes(1)
        expect(mockKV.put).toHaveBeenCalled()
      })

      it('一部キャッシュヒット、一部ミスの場合に正しく処理すること', async () => {
        // Arrange
        const mockKV = createMockKV()
        mockKV.get
          .mockResolvedValueOnce({
            translatedText: 'Hello',
            createdAt: '2024-01-01T00:00:00.000Z',
            lastUsedAt: '2024-01-01T00:00:00.000Z',
          })
          .mockResolvedValueOnce(null) // Cache miss for second text

        const mockCreate = vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Goodbye' } }],
        })
        const mockClient = createMockClient(mockCreate)

        const service = new CachedTranslatorService({
          apiKey: 'test-api-key',
          kv: mockKV as KVNamespace,
          client: mockClient,
        })

        // Act
        const result = await service.execute(['こんにちは', 'さようなら'], 'en')

        // Assert
        expect(result.size).toBe(2)
        expect(result.get('こんにちは')).toBe('Hello')
        expect(result.get('さようなら')).toBe('Goodbye')
        expect(mockCreate).toHaveBeenCalledTimes(1)
      })

      it('KVが無い場合も動作すること', async () => {
        // Arrange
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [{ message: { content: 'Hello' } }],
        })
        const mockClient = createMockClient(mockCreate)

        const service = new CachedTranslatorService({
          apiKey: 'test-api-key',
          // No KV
          client: mockClient,
        })

        // Act
        const result = await service.execute(['こんにちは'], 'en')

        // Assert
        expect(result.size).toBe(1)
        expect(result.get('こんにちは')).toBe('Hello')
        expect(mockCreate).toHaveBeenCalledTimes(1)
      })

      it('空の配列の場合は空のMapを返すこと', async () => {
        // Arrange
        const mockKV = createMockKV()
        const mockCreate = vi.fn()
        const mockClient = createMockClient(mockCreate)

        const service = new CachedTranslatorService({
          apiKey: 'test-api-key',
          kv: mockKV as KVNamespace,
          client: mockClient,
        })

        // Act
        const result = await service.execute([], 'en')

        // Assert
        expect(result.size).toBe(0)
        expect(mockKV.get).not.toHaveBeenCalled()
        expect(mockCreate).not.toHaveBeenCalled()
      })
    })
  })
})
