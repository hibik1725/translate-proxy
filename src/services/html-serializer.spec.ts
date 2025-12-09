import { describe, expect, it } from 'vitest'
import { HtmlParserService } from './html-parser'
import { HtmlSerializerService } from './html-serializer'

describe('HtmlSerializerService', () => {
  const parser = new HtmlParserService()

  describe('execute', () => {
    describe('成功系', () => {
      it('HASTをHTML文字列に変換できること', () => {
        // Arrange
        const service = new HtmlSerializerService()
        const html = '<html><head></head><body><p>Test</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result).toContain('<p>Test</p>')
        expect(result).toContain('<html>')
        expect(result).toContain('</html>')
      })

      it('元のHTML構造が保持されること', () => {
        // Arrange
        const service = new HtmlSerializerService()
        const html = `
          <html>
            <head><title>Title</title></head>
            <body>
              <div class="container">
                <h1>Heading</h1>
                <p id="para">Paragraph</p>
              </div>
            </body>
          </html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result).toContain('<title>Title</title>')
        expect(result).toContain('<div class="container">')
        expect(result).toContain('<h1>Heading</h1>')
        expect(result).toContain('<p id="para">Paragraph</p>')
      })

      it('日本語を含むHTMLを正しくシリアライズできること', () => {
        // Arrange
        const service = new HtmlSerializerService()
        const html = '<html><body><p>こんにちは世界</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result).toContain('こんにちは世界')
      })

      it('属性が保持されること', () => {
        // Arrange
        const service = new HtmlSerializerService()
        const html =
          '<html lang="ja"><body><a href="/link" class="btn" data-id="123">Link</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result).toContain('lang="ja"')
        expect(result).toContain('href="/link"')
        expect(result).toContain('class="btn"')
        expect(result).toContain('data-id="123"')
      })

      it('scriptタグの内容が保持されること', () => {
        // Arrange
        const service = new HtmlSerializerService()
        const html = '<html><body><script>const x = 1;</script></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result).toContain('<script>const x = 1;</script>')
      })

      it('styleタグの内容が保持されること', () => {
        // Arrange
        const service = new HtmlSerializerService()
        const html =
          '<html><head><style>.class { color: red; }</style></head><body></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast)

        // Assert
        expect(result).toContain('.class { color: red; }')
      })
    })
  })
})
