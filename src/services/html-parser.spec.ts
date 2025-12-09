import { describe, expect, it } from 'vitest'
import { HtmlParserService } from './html-parser'

describe('HtmlParserService', () => {
  describe('execute', () => {
    describe('成功系', () => {
      it('有効なHTMLをパースできること', () => {
        // Arrange
        const service = new HtmlParserService()
        const html =
          '<html><head><title>Test</title></head><body><p>Hello</p></body></html>'

        // Act
        const result = service.execute(html)

        // Assert
        expect(result).toBeDefined()
        expect(result.type).toBe('root')
        expect(result.children).toBeDefined()
        expect(result.children.length).toBeGreaterThan(0)
      })

      it('空のHTMLを処理できること', () => {
        // Arrange
        const service = new HtmlParserService()
        const html = ''

        // Act
        const result = service.execute(html)

        // Assert
        expect(result).toBeDefined()
        expect(result.type).toBe('root')
      })

      it('日本語を含むHTMLをパースできること', () => {
        // Arrange
        const service = new HtmlParserService()
        const html = '<html><body><p>こんにちは世界</p></body></html>'

        // Act
        const result = service.execute(html)

        // Assert
        expect(result).toBeDefined()
        expect(result.type).toBe('root')
      })

      it('複雑なHTML構造をパースできること', () => {
        // Arrange
        const service = new HtmlParserService()
        const html = `
          <!DOCTYPE html>
          <html lang="ja">
            <head>
              <meta charset="UTF-8">
              <title>テストページ</title>
            </head>
            <body>
              <header>
                <nav><a href="/">ホーム</a></nav>
              </header>
              <main>
                <h1>見出し</h1>
                <p>本文です</p>
              </main>
            </body>
          </html>
        `

        // Act
        const result = service.execute(html)

        // Assert
        expect(result).toBeDefined()
        expect(result.type).toBe('root')
      })

      it('不正なHTMLでもエラーにならないこと（parse5は寛容）', () => {
        // Arrange
        const service = new HtmlParserService()
        const html = '<div><p>閉じタグがない'

        // Act
        const result = service.execute(html)

        // Assert
        expect(result).toBeDefined()
        expect(result.type).toBe('root')
      })
    })
  })
})
