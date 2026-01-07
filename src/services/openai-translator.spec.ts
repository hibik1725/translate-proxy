import { describe, expect, it, vi } from 'vitest'
import {
  type OpenAIClient,
  OpenAITranslatorService,
  TranslationError,
} from './openai-translator'

describe('OpenAITranslatorService', () => {
  // Type assertion needed for mocking: vi.fn() returns a generic mock type
  // that doesn't match the specific OpenAIClient.chat.completions.create signature
  const createMockClient = (createFn: ReturnType<typeof vi.fn>): OpenAIClient =>
    ({
      chat: {
        completions: {
          create: createFn,
        },
      },
    }) as OpenAIClient

  describe('execute', () => {
    describe('成功系', () => {
      it('テキストを翻訳できること', async () => {
        // Arrange
        const mockCreate = vi.fn().mockResolvedValueOnce({
          choices: [{ message: { content: 'Hello World' } }],
        })
        const mockClient = createMockClient(mockCreate)
        const service = new OpenAITranslatorService('test-api-key', mockClient)

        // Act
        const result = await service.execute(['こんにちは世界'], 'en')

        // Assert
        expect(result.size).toBe(1)
        expect(result.get('こんにちは世界')).toBe('Hello World')
        expect(mockCreate).toHaveBeenCalledTimes(1)
      })

      it('複数テキストをバッチ翻訳できること', async () => {
        // Arrange
        const mockCreate = vi.fn().mockResolvedValueOnce({
          choices: [{ message: { content: 'Hello\nGoodbye\nThank you' } }],
        })
        const mockClient = createMockClient(mockCreate)
        const service = new OpenAITranslatorService('test-api-key', mockClient)

        // Act
        const result = await service.execute(
          ['こんにちは', 'さようなら', 'ありがとう'],
          'en',
        )

        // Assert
        expect(result.size).toBe(3)
        expect(result.get('こんにちは')).toBe('Hello')
        expect(result.get('さようなら')).toBe('Goodbye')
        expect(result.get('ありがとう')).toBe('Thank you')
      })

      it('空の配列の場合は空のMapを返すこと', async () => {
        // Arrange
        const mockCreate = vi.fn()
        const mockClient = createMockClient(mockCreate)
        const service = new OpenAITranslatorService('test-api-key', mockClient)

        // Act
        const result = await service.execute([], 'en')

        // Assert
        expect(result.size).toBe(0)
        expect(mockCreate).not.toHaveBeenCalled()
      })
    })

    describe('失敗系', () => {
      it('APIエラー時にフォールバックが無効の場合はTranslationErrorをスローすること', async () => {
        // Arrange
        const mockCreate = vi.fn().mockRejectedValueOnce(new Error('API Error'))
        const mockClient = createMockClient(mockCreate)
        const service = new OpenAITranslatorService(
          'test-api-key',
          mockClient,
          {
            useFallback: false,
          },
        )

        // Act & Assert
        await expect(service.execute(['テスト'], 'en')).rejects.toThrow(
          TranslationError,
        )
      })

      it('APIエラー時にフォールバックが有効の場合は原文を返すこと', async () => {
        // Arrange
        const mockCreate = vi.fn().mockRejectedValueOnce(new Error('API Error'))
        const mockClient = createMockClient(mockCreate)
        const service = new OpenAITranslatorService(
          'test-api-key',
          mockClient,
          {
            useFallback: true,
          },
        )

        // Act
        const result = await service.execute(['テスト'], 'en')

        // Assert
        expect(result.size).toBe(1)
        expect(result.get('テスト')).toBe('テスト')
      })

      it('空のレスポンス時にフォールバックが無効の場合はTranslationErrorをスローすること', async () => {
        // Arrange
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [{ message: { content: null } }],
        })
        const mockClient = createMockClient(mockCreate)
        const service = new OpenAITranslatorService(
          'test-api-key',
          mockClient,
          {
            useFallback: false,
          },
        )

        // Act & Assert
        await expect(service.execute(['テスト'], 'en')).rejects.toThrow(
          TranslationError,
        )
      })

      it('空のレスポンス時にフォールバックが有効の場合は原文を返すこと', async () => {
        // Arrange
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [{ message: { content: null } }],
        })
        const mockClient = createMockClient(mockCreate)
        const service = new OpenAITranslatorService(
          'test-api-key',
          mockClient,
          {
            useFallback: true,
          },
        )

        // Act
        const result = await service.execute(['テスト'], 'en')

        // Assert
        expect(result.size).toBe(1)
        expect(result.get('テスト')).toBe('テスト')
      })
    })
  })
})

describe('TranslationError', () => {
  it('エラー名がTranslationErrorであること', () => {
    const error = new TranslationError('test error')
    expect(error.name).toBe('TranslationError')
  })

  it('causeを保持できること', () => {
    const cause = new Error('original error')
    const error = new TranslationError('test error', cause)
    expect(error.cause).toBe(cause)
  })
})
