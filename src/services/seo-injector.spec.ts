import { describe, expect, it } from 'vitest'
import { HtmlParserService } from './html-parser'
import { HtmlSerializerService } from './html-serializer'
import { SeoInjectorService } from './seo-injector'

describe('SeoInjectorService', () => {
  const createService = () =>
    new SeoInjectorService({ baseUrl: 'https://picker-tf.com' })

  const parser = new HtmlParserService()
  const serializer = new HtmlSerializerService()

  describe('execute', () => {
    describe('成功系', () => {
      it('html要素のlang属性を設定すること', () => {
        // Arrange
        const service = createService()
        const html = '<html><head></head><body><p>Hello</p></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, '/spikes', 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('<html lang="en">')
      })

      it('hreflang属性を持つlinkタグを挿入すること', () => {
        // Arrange
        const service = createService()
        const html =
          '<!DOCTYPE html><html><head><title>Test</title></head><body></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, '/spikes', 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain(
          '<link rel="alternate" hreflang="ja" href="https://picker-tf.com/spikes">',
        )
        expect(output).toContain(
          '<link rel="alternate" hreflang="en" href="https://picker-tf.com/en/spikes">',
        )
        expect(output).toContain(
          '<link rel="alternate" hreflang="x-default" href="https://picker-tf.com/spikes">',
        )
      })

      it('canonicalタグを挿入すること', () => {
        // Arrange
        const service = createService()
        const html = '<html><head></head><body></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, '/items/nike-zoom-mamba', 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain(
          '<link rel="canonical" href="https://picker-tf.com/en/items/nike-zoom-mamba">',
        )
      })

      it('ルートパスでも正しく動作すること', () => {
        // Arrange
        const service = createService()
        const html = '<html><head></head><body></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, '/', 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain(
          '<link rel="alternate" hreflang="ja" href="https://picker-tf.com/">',
        )
        expect(output).toContain(
          '<link rel="alternate" hreflang="en" href="https://picker-tf.com/en/">',
        )
        expect(output).toContain(
          '<link rel="canonical" href="https://picker-tf.com/en/">',
        )
      })

      it('既存のhreflangタグを置き換えること', () => {
        // Arrange
        const service = createService()
        const html = `
          <html>
            <head>
              <link rel="alternate" hreflang="zh" href="https://example.com/zh">
            </head>
            <body></body>
          </html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, '/page', 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).not.toContain('hreflang="zh"')
        expect(output).toContain('hreflang="en"')
        expect(output).toContain('hreflang="ja"')
      })

      it('既存のcanonicalタグを置き換えること', () => {
        // Arrange
        const service = createService()
        const html = `
          <html>
            <head>
              <link rel="canonical" href="https://old-url.com/page">
            </head>
            <body></body>
          </html>
        `
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, '/page', 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).not.toContain('https://old-url.com')
        expect(output).toContain(
          '<link rel="canonical" href="https://picker-tf.com/en/page">',
        )
      })

      it('末尾スラッシュのあるbaseUrlを正しく処理すること', () => {
        // Arrange
        const service = new SeoInjectorService({
          baseUrl: 'https://picker-tf.com/',
        })
        const html = '<html><head></head><body></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, '/spikes', 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="https://picker-tf.com/spikes"')
        expect(output).not.toContain('https://picker-tf.com//spikes')
      })

      it('パスの先頭にスラッシュがない場合も正しく処理すること', () => {
        // Arrange
        const service = createService()
        const html = '<html><head></head><body></body></html>'
        const hast = parser.execute(html)

        // Act
        const result = service.execute(hast, 'spikes', 'en')
        const output = serializer.execute(result)

        // Assert
        expect(output).toContain('href="https://picker-tf.com/spikes"')
      })
    })

    describe('失敗系', () => {
      it('head要素がない場合もエラーにならないこと', () => {
        // Arrange
        const service = createService()
        const html = '<html><body><p>No head</p></body></html>'
        const hast = parser.execute(html)

        // Act & Assert
        expect(() => service.execute(hast, '/page', 'en')).not.toThrow()
      })

      it('html要素がない場合もエラーにならないこと', () => {
        // Arrange
        const service = createService()
        const html = '<div>Fragment</div>'
        const hast = parser.execute(html)

        // Act & Assert
        expect(() => service.execute(hast, '/page', 'en')).not.toThrow()
      })
    })
  })
})
