import { describe, expect, it, vi } from 'vitest'
import type { OpenAIClient } from './openai-translator'
import { TranslationOrchestratorService } from './translation-orchestrator'

describe('TranslationOrchestratorService', () => {
  const createMockClient = (
    translations: Map<string, string>,
  ): OpenAIClient => ({
    chat: {
      completions: {
        create: vi.fn().mockImplementation(async ({ messages }) => {
          // Extract texts from the prompt (last message)
          const prompt = messages[1].content
          const lines = prompt
            .split('\n')
            .filter(
              (line: string) => line.trim() && !line.startsWith('Translate'),
            )

          const translatedLines = lines.map(
            (line: string) => translations.get(line.trim()) || line,
          )

          return {
            choices: [{ message: { content: translatedLines.join('\n') } }],
          }
        }),
      },
    },
  })

  describe('execute', () => {
    describe('成功系', () => {
      it('HTMLを翻訳できること', async () => {
        // Arrange
        const translations = new Map([
          ['こんにちは', 'Hello'],
          ['世界', 'World'],
        ])
        const mockClient = createMockClient(translations)
        const service = new TranslationOrchestratorService({
          apiKey: 'test-api-key',
          openAIClient: mockClient,
        })
        const html = '<html><body><p>こんにちは</p><p>世界</p></body></html>'

        // Act
        const result = await service.execute(html, 'en')

        // Assert
        expect(result).toContain('Hello')
        expect(result).toContain('World')
        expect(result).not.toContain('こんにちは')
        expect(result).not.toContain('世界')
      })

      it('日本語のないHTMLはそのまま返却すること', async () => {
        // Arrange
        const mockClient = createMockClient(new Map())
        const service = new TranslationOrchestratorService({
          apiKey: 'test-api-key',
          openAIClient: mockClient,
        })
        const html = '<html><body><p>Hello World</p></body></html>'

        // Act
        const result = await service.execute(html, 'en')

        // Assert
        expect(result).toBe(html)
        expect(mockClient.chat.completions.create).not.toHaveBeenCalled()
      })

      it('scriptタグ内のテキストは翻訳しないこと', async () => {
        // Arrange
        const translations = new Map([['テスト', 'Test']])
        const mockClient = createMockClient(translations)
        const service = new TranslationOrchestratorService({
          apiKey: 'test-api-key',
          openAIClient: mockClient,
        })
        const html =
          '<html><body><script>const x = "日本語";</script><p>テスト</p></body></html>'

        // Act
        const result = await service.execute(html, 'en')

        // Assert
        expect(result).toContain('const x = "日本語"')
        expect(result).toContain('Test')
      })

      it('DOM構造を保持すること', async () => {
        // Arrange
        const translations = new Map([['タイトル', 'Title']])
        const mockClient = createMockClient(translations)
        const service = new TranslationOrchestratorService({
          apiKey: 'test-api-key',
          openAIClient: mockClient,
        })
        const html =
          '<html><body><div class="container"><h1 id="title">タイトル</h1></div></body></html>'

        // Act
        const result = await service.execute(html, 'en')

        // Assert
        expect(result).toContain('<div class="container">')
        expect(result).toContain('<h1 id="title">')
        expect(result).toContain('Title')
      })

      it('複数の要素を翻訳できること', async () => {
        // Arrange
        const translations = new Map([
          ['見出し', 'Heading'],
          ['本文', 'Body text'],
          ['リンク', 'Link'],
        ])
        const mockClient = createMockClient(translations)
        const service = new TranslationOrchestratorService({
          apiKey: 'test-api-key',
          openAIClient: mockClient,
        })
        const html = `
          <html>
            <body>
              <h1>見出し</h1>
              <p>本文</p>
              <a href="/page">リンク</a>
            </body>
          </html>
        `

        // Act
        const result = await service.execute(html, 'en')

        // Assert
        expect(result).toContain('Heading')
        expect(result).toContain('Body text')
        expect(result).toContain('Link')
      })
    })
  })
})
