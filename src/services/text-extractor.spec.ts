import { describe, expect, it } from 'vitest'
import { HtmlParserService } from './html-parser'
import { TextExtractorService } from './text-extractor'

describe('TextExtractorService', () => {
  const parser = new HtmlParserService()

  describe('execute', () => {
    describe('成功系', () => {
      it('日本語テキストを抽出できること', () => {
        // Arrange
        const service = new TextExtractorService()
        const html = '<html><body><p>こんにちは世界</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('こんにちは世界')
      })

      it('英語のみのテキストは抽出しないこと', () => {
        // Arrange
        const service = new TextExtractorService()
        const html = '<html><body><p>Hello World</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(0)
      })

      it('scriptタグ内のテキストは抽出しないこと', () => {
        // Arrange
        const service = new TextExtractorService()
        const html =
          '<html><body><script>const text = "日本語";</script><p>抽出対象</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('抽出対象')
      })

      it('styleタグ内のテキストは抽出しないこと', () => {
        // Arrange
        const service = new TextExtractorService()
        const html =
          '<html><head><style>.日本語 { color: red; }</style></head><body><p>本文</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('本文')
      })

      it('codeタグ内のテキストは抽出しないこと', () => {
        // Arrange
        const service = new TextExtractorService()
        const html =
          '<html><body><code>コード内日本語</code><p>通常テキスト</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('通常テキスト')
      })

      it('preタグ内のテキストは抽出しないこと', () => {
        // Arrange
        const service = new TextExtractorService()
        const html =
          '<html><body><pre>整形済み日本語</pre><p>通常</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('通常')
      })

      it('noscriptタグ内のテキストは抽出しないこと', () => {
        // Arrange
        const service = new TextExtractorService()
        const html =
          '<html><body><noscript>JavaScript無効時の日本語</noscript><p>有効時</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('有効時')
      })

      it('重複テキストが1つにまとまること', () => {
        // Arrange
        const service = new TextExtractorService()
        const html =
          '<html><body><p>同じテキスト</p><p>同じテキスト</p><p>別のテキスト</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(2)
        const values = result.map((r) => r.value)
        expect(values).toContain('同じテキスト')
        expect(values).toContain('別のテキスト')
      })

      it('複数の日本語テキストを抽出できること', () => {
        // Arrange
        const service = new TextExtractorService()
        const html = `
          <html>
            <body>
              <h1>見出し</h1>
              <p>本文です</p>
              <a href="/">リンク</a>
            </body>
          </html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(3)
        const values = result.map((r) => r.value)
        expect(values).toContain('見出し')
        expect(values).toContain('本文です')
        expect(values).toContain('リンク')
      })

      it('ひらがなのみでも抽出できること', () => {
        // Arrange
        const service = new TextExtractorService()
        const html = '<html><body><p>あいうえお</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('あいうえお')
      })

      it('カタカナのみでも抽出できること', () => {
        // Arrange
        const service = new TextExtractorService()
        const html = '<html><body><p>アイウエオ</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('アイウエオ')
      })

      it('漢字のみでも抽出できること', () => {
        // Arrange
        const service = new TextExtractorService()
        const html = '<html><body><p>日本語</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result.length).toBe(1)
        expect(result[0].value).toBe('日本語')
      })
    })
  })

  describe('getUniqueTexts', () => {
    describe('成功系', () => {
      it('ユニークなテキスト値の配列を返すこと', () => {
        // Arrange
        const service = new TextExtractorService()
        const html =
          '<html><body><p>テキスト1</p><p>テキスト2</p><p>テキスト1</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.getUniqueTexts(hast)

        // Assert
        expect(result.length).toBe(2)
        expect(result).toContain('テキスト1')
        expect(result).toContain('テキスト2')
      })
    })
  })
})
