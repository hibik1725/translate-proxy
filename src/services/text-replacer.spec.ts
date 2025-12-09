import { describe, expect, it } from 'vitest'
import { HtmlParserService } from './html-parser'
import { HtmlSerializerService } from './html-serializer'
import { TextReplacerService } from './text-replacer'

describe('TextReplacerService', () => {
  const parser = new HtmlParserService()
  const serializer = new HtmlSerializerService()

  describe('execute', () => {
    describe('成功系', () => {
      it('テキストノードが正しく置換されること', () => {
        // Arrange
        const service = new TextReplacerService()
        const html = '<html><body><p>こんにちは</p></body></html>'
        const hast = parser.execute(html)
        const translations = new Map([['こんにちは', 'Hello']])

        // Act
        const result = service.execute(hast, translations)
        const outputHtml = serializer.execute(result)

        // Assert
        expect(outputHtml).toContain('Hello')
        expect(outputHtml).not.toContain('こんにちは')
      })

      it('翻訳がないテキストは元のままであること', () => {
        // Arrange
        const service = new TextReplacerService()
        const html = '<html><body><p>置換対象</p><p>そのまま</p></body></html>'
        const hast = parser.execute(html)
        const translations = new Map([['置換対象', 'Replaced']])

        // Act
        const result = service.execute(hast, translations)
        const outputHtml = serializer.execute(result)

        // Assert
        expect(outputHtml).toContain('Replaced')
        expect(outputHtml).toContain('そのまま')
      })

      it('DOM構造が変わらないこと', () => {
        // Arrange
        const service = new TextReplacerService()
        const html =
          '<html><body><div class="container"><p id="text">テキスト</p></div></body></html>'
        const hast = parser.execute(html)
        const translations = new Map([['テキスト', 'Text']])

        // Act
        const result = service.execute(hast, translations)
        const outputHtml = serializer.execute(result)

        // Assert
        expect(outputHtml).toContain('<div class="container">')
        expect(outputHtml).toContain('<p id="text">')
        expect(outputHtml).toContain('Text')
      })

      it('複数のテキストノードを置換できること', () => {
        // Arrange
        const service = new TextReplacerService()
        const html = '<html><body><h1>見出し</h1><p>本文</p></body></html>'
        const hast = parser.execute(html)
        const translations = new Map([
          ['見出し', 'Heading'],
          ['本文', 'Body'],
        ])

        // Act
        const result = service.execute(hast, translations)
        const outputHtml = serializer.execute(result)

        // Assert
        expect(outputHtml).toContain('Heading')
        expect(outputHtml).toContain('Body')
        expect(outputHtml).not.toContain('見出し')
        expect(outputHtml).not.toContain('本文')
      })

      it('scriptタグ内のテキストは置換しないこと', () => {
        // Arrange
        const service = new TextReplacerService()
        const html =
          '<html><body><script>const x = "日本語";</script><p>日本語</p></body></html>'
        const hast = parser.execute(html)
        const translations = new Map([['日本語', 'Japanese']])

        // Act
        const result = service.execute(hast, translations)
        const outputHtml = serializer.execute(result)

        // Assert
        expect(outputHtml).toContain('const x = "日本語"')
        expect(outputHtml).toContain('<p>Japanese</p>')
      })

      it('空のtranslationsMapの場合は元のままであること', () => {
        // Arrange
        const service = new TextReplacerService()
        const html = '<html><body><p>テキスト</p></body></html>'
        const hast = parser.execute(html)
        const translations = new Map<string, string>()

        // Act
        const result = service.execute(hast, translations)
        const outputHtml = serializer.execute(result)

        // Assert
        expect(outputHtml).toContain('テキスト')
      })

      it('テキストの前後の空白が保持されること', () => {
        // Arrange
        const service = new TextReplacerService()
        const html = '<html><body><p>  テキスト  </p></body></html>'
        const hast = parser.execute(html)
        const translations = new Map([['テキスト', 'Text']])

        // Act
        const result = service.execute(hast, translations)
        const outputHtml = serializer.execute(result)

        // Assert
        expect(outputHtml).toContain('  Text  ')
      })
    })
  })
})
