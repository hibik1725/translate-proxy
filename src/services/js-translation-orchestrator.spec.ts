import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { KVNamespace } from '../types/env'
import { JsTranslationOrchestratorService } from './js-translation-orchestrator'
import type { OpenAIClient } from './openai-translator'

/**
 * Mock KV interface for testing
 */
interface MockKV {
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
  list: ReturnType<typeof vi.fn>
}

describe('JsTranslationOrchestratorService', () => {
  const createMockKV = (): MockKV => ({
    get: vi.fn().mockResolvedValue(null), // Cache miss by default
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
    list: vi.fn(),
  })

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
      it('JSコード内の日本語を翻訳できること', async () => {
        // Arrange
        const mockKV = createMockKV()
        const mockCreate = vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  translations: [
                    { original: 'スパイク名', translated: 'Spike Name' },
                    { original: '価格', translated: 'Price' },
                  ],
                }),
              },
            },
          ],
        })
        const mockClient = createMockClient(mockCreate)

        const orchestrator = new JsTranslationOrchestratorService({
          apiKey: 'test-api-key',
          kv: mockKV as KVNamespace,
          openAIClient: mockClient,
        })
        const jsCode = `
          var a = "\\u30b9\\u30d1\\u30a4\\u30af\\u540d";
          var b = "\\u4fa1\\u683c";
        `

        // Act
        const result = await orchestrator.execute(jsCode, 'en')

        // Assert
        expect(result).toContain('Spike Name')
        expect(result).toContain('Price')
      })

      it('日本語がない場合は元のコードをそのまま返すこと', async () => {
        // Arrange
        const mockKV = createMockKV()
        const mockCreate = vi.fn()
        const mockClient = createMockClient(mockCreate)

        const orchestrator = new JsTranslationOrchestratorService({
          apiKey: 'test-api-key',
          kv: mockKV as KVNamespace,
          openAIClient: mockClient,
        })
        const jsCode = 'function test() { return 123; }'

        // Act
        const result = await orchestrator.execute(jsCode, 'en')

        // Assert
        expect(result).toBe(jsCode)
        expect(mockCreate).not.toHaveBeenCalled()
      })
    })
  })
})
