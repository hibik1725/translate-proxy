import { describe, expect, it } from 'vitest'
import { HtmlParserService } from './html-parser'
import { HtmlSerializerService } from './html-serializer'
import { LinkRewriterService } from './link-rewriter'

describe('LinkRewriterService', () => {
  const service = new LinkRewriterService()
  const parser = new HtmlParserService()
  const serializer = new HtmlSerializerService()

  describe('execute', () => {
    describe('成功系', () => {
      it('内部絶対パスを書き換えること', () => {
        // Arrange
        const html = '<html><body><a href="/about">About</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/en/about"')
      })

      it('複数の内部リンクを書き換えること', () => {
        // Arrange
        const html = `
          <html><body>
            <a href="/page1">Page 1</a>
            <a href="/page2">Page 2</a>
            <a href="/deep/nested/page">Nested</a>
          </body></html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/en/page1"')
        expect(output).toContain('href="/en/page2"')
        expect(output).toContain('href="/en/deep/nested/page"')
      })

      it('ルートパスを書き換えること', () => {
        // Arrange
        const html = '<html><body><a href="/">Home</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/en/"')
      })

      it('外部リンクは書き換えないこと', () => {
        // Arrange
        const html = `
          <html><body>
            <a href="https://example.com">External HTTPS</a>
            <a href="http://example.com">External HTTP</a>
            <a href="//example.com">Protocol-relative</a>
          </body></html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="https://example.com"')
        expect(output).toContain('href="http://example.com"')
        expect(output).toContain('href="//example.com"')
      })

      it('アンカーリンクは書き換えないこと', () => {
        // Arrange
        const html = '<html><body><a href="#section">Anchor</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="#section"')
      })

      it('mailto:リンクは書き換えないこと', () => {
        // Arrange
        const html =
          '<html><body><a href="mailto:test@example.com">Email</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="mailto:test@example.com"')
      })

      it('tel:リンクは書き換えないこと', () => {
        // Arrange
        const html =
          '<html><body><a href="tel:+1234567890">Phone</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="tel:+1234567890"')
      })

      it('既に言語プレフィックスがあるリンクは書き換えないこと', () => {
        // Arrange
        const html = `
          <html><body>
            <a href="/en/page">Already English</a>
            <a href="/ja/page">Japanese</a>
          </body></html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/en/page"')
        expect(output).toContain('href="/ja/page"')
        // Should NOT have double prefix
        expect(output).not.toContain('/en/en/')
      })

      it('アセットリンクは書き換えないこと', () => {
        // Arrange
        const html = `
          <html><body>
            <a href="/images/photo.jpg">JPG</a>
            <a href="/assets/style.css">CSS</a>
            <a href="/scripts/app.js">JS</a>
            <a href="/docs/report.pdf">PDF</a>
          </body></html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/images/photo.jpg"')
        expect(output).toContain('href="/assets/style.css"')
        expect(output).toContain('href="/scripts/app.js"')
        expect(output).toContain('href="/docs/report.pdf"')
      })

      it('相対パスを書き換えること', () => {
        // Arrange
        const html =
          '<html><body><a href="relative-page">Relative</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/en/relative-page"')
      })

      it('ネストしたリンクも書き換えること', () => {
        // Arrange
        const html = `
          <html><body>
            <nav>
              <ul>
                <li><a href="/products">Products</a></li>
                <li><a href="/contact">Contact</a></li>
              </ul>
            </nav>
          </body></html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/en/products"')
        expect(output).toContain('href="/en/contact"')
      })

      it('href属性がない場合はエラーにならないこと', () => {
        // Arrange
        const html =
          '<html><body><a name="anchor">Named Anchor</a></body></html>'
        const hast = parser.execute(html)

        // Act & Assert
        expect(() => service.execute(hast, 'en')).not.toThrow()
      })

      it('クエリパラメータ付きリンクを正しく書き換えること', () => {
        // Arrange
        const html =
          '<html><body><a href="/search?q=test">Search</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/en/search?q=test"')
      })

      it('ハッシュ付き内部リンクを正しく書き換えること', () => {
        // Arrange
        const html =
          '<html><body><a href="/page#section">Page with section</a></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="/en/page#section"')
      })
    })
  })
})
