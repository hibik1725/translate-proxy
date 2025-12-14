import { describe, expect, it } from 'vitest'
import { HtmlParserService } from './html-parser'
import { HtmlSerializerService } from './html-serializer'
import { TextReplacerService } from './text-replacer'

describe('TextReplacerService', () => {
  const parser = new HtmlParserService()
  const serializer = new HtmlSerializerService()

  describe('execute', () => {
    describe('成功系', () => {
      describe('テキストノード置換', () => {
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
          const html =
            '<html><body><p>置換対象</p><p>そのまま</p></body></html>'
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

      describe('属性置換', () => {
        it('alt属性が置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html =
            '<html><body><img src="test.jpg" alt="画像の説明"></body></html>'
          const hast = parser.execute(html)
          const translations = new Map([['画像の説明', 'Image description']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('alt="Image description"')
          expect(outputHtml).not.toContain('画像の説明')
        })

        it('title属性が置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html =
            '<html><body><a href="/" title="ホームページ">Link</a></body></html>'
          const hast = parser.execute(html)
          const translations = new Map([['ホームページ', 'Home page']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('title="Home page"')
          expect(outputHtml).not.toContain('ホームページ')
        })

        it('content属性が置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html =
            '<html><head><meta name="description" content="サイトの説明"></head><body></body></html>'
          const hast = parser.execute(html)
          const translations = new Map([['サイトの説明', 'Site description']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('content="Site description"')
          expect(outputHtml).not.toContain('サイトの説明')
        })

        it('placeholder属性が置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html =
            '<html><body><input placeholder="名前を入力"></body></html>'
          const hast = parser.execute(html)
          const translations = new Map([['名前を入力', 'Enter your name']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('placeholder="Enter your name"')
        })

        it('aria-label属性が置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html =
            '<html><body><button aria-label="閉じる">X</button></body></html>'
          const hast = parser.execute(html)
          const translations = new Map([['閉じる', 'Close']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('aria-label="Close"')
        })

        it('hidden inputのvalue属性が置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html =
            '<html><body><input type="hidden" name="sort" value="人気順"></body></html>'
          const hast = parser.execute(html)
          const translations = new Map([['人気順', 'Popularity']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('value="Popularity"')
          expect(outputHtml).not.toContain('人気順')
        })

        it('通常のinputのvalue属性は置換しないこと', () => {
          // Arrange
          const service = new TextReplacerService()
          const html =
            '<html><body><input type="text" value="入力値"></body></html>'
          const hast = parser.execute(html)
          const translations = new Map([['入力値', 'Input Value']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('value="入力値"')
          expect(outputHtml).not.toContain('Input Value')
        })
      })

      describe('JSON-LD置換', () => {
        it('JSON-LD内のテキストが置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html = `
            <html>
              <head>
                <script type="application/ld+json">{"name": "商品名", "description": "商品の説明"}</script>
              </head>
              <body></body>
            </html>
          `
          const hast = parser.execute(html)
          const translations = new Map([
            ['商品名', 'Product Name'],
            ['商品の説明', 'Product Description'],
          ])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('"name":"Product Name"')
          expect(outputHtml).toContain('"description":"Product Description"')
          expect(outputHtml).not.toContain('商品名')
          expect(outputHtml).not.toContain('商品の説明')
        })

        it('ネストされたJSON-LD内のテキストが置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html = `
            <html>
              <head>
                <script type="application/ld+json">{"brand": {"name": "ブランド名"}}</script>
              </head>
              <body></body>
            </html>
          `
          const hast = parser.execute(html)
          const translations = new Map([['ブランド名', 'Brand Name']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('"name":"Brand Name"')
          expect(outputHtml).not.toContain('ブランド名')
        })

        it('配列内のJSON-LD値が置換されること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html = `
            <html>
              <head>
                <script type="application/ld+json">{"keywords": ["キーワード1", "キーワード2"]}</script>
              </head>
              <body></body>
            </html>
          `
          const hast = parser.execute(html)
          const translations = new Map([
            ['キーワード1', 'Keyword 1'],
            ['キーワード2', 'Keyword 2'],
          ])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('Keyword 1')
          expect(outputHtml).toContain('Keyword 2')
          expect(outputHtml).not.toContain('キーワード1')
          expect(outputHtml).not.toContain('キーワード2')
        })

        it('通常のscriptタグは置換しないこと', () => {
          // Arrange
          const service = new TextReplacerService()
          const html = `
            <html>
              <head>
                <script>const name = "日本語変数";</script>
              </head>
              <body></body>
            </html>
          `
          const hast = parser.execute(html)
          const translations = new Map([['日本語変数', 'Japanese Variable']])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('日本語変数')
          expect(outputHtml).not.toContain('Japanese Variable')
        })
      })

      describe('複合置換', () => {
        it('テキストノード、属性、JSON-LDを全て置換できること', () => {
          // Arrange
          const service = new TextReplacerService()
          const html = `
            <html>
              <head>
                <meta name="description" content="メタ説明">
                <script type="application/ld+json">{"name": "構造化名"}</script>
              </head>
              <body>
                <img alt="画像説明">
                <p>本文テキスト</p>
              </body>
            </html>
          `
          const hast = parser.execute(html)
          const translations = new Map([
            ['本文テキスト', 'Body Text'],
            ['メタ説明', 'Meta Description'],
            ['画像説明', 'Image Description'],
            ['構造化名', 'Structured Name'],
          ])

          // Act
          const result = service.execute(hast, translations)
          const outputHtml = serializer.execute(result)

          // Assert
          expect(outputHtml).toContain('Body Text')
          expect(outputHtml).toContain('content="Meta Description"')
          expect(outputHtml).toContain('alt="Image Description"')
          expect(outputHtml).toContain('"name":"Structured Name"')
          expect(outputHtml).not.toContain('本文テキスト')
          expect(outputHtml).not.toContain('メタ説明')
          expect(outputHtml).not.toContain('画像説明')
          expect(outputHtml).not.toContain('構造化名')
        })
      })
    })
  })
})
