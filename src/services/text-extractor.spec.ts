import { describe, expect, it } from 'vitest'
import { HtmlParserService } from './html-parser'
import { TextExtractorService } from './text-extractor'

describe('TextExtractorService', () => {
  const parser = new HtmlParserService()

  describe('execute', () => {
    describe('成功系', () => {
      describe('テキストノード抽出', () => {
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
          expect(result[0].source.type).toBe('text')
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

        it('preタグ内のテキストも抽出すること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><pre>整形済み日本語</pre><p>通常</p></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(2)
          expect(result.map((r) => r.value)).toContain('整形済み日本語')
          expect(result.map((r) => r.value)).toContain('通常')
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

      describe('属性抽出', () => {
        it('alt属性から日本語を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><img src="test.jpg" alt="画像の説明"></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(1)
          expect(result[0].value).toBe('画像の説明')
          expect(result[0].source.type).toBe('attribute')
          if (result[0].source.type === 'attribute') {
            expect(result[0].source.attributeName).toBe('alt')
          }
        })

        it('title属性から日本語を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><a href="/" title="ホームページ">Link</a></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(1)
          expect(result[0].value).toBe('ホームページ')
          expect(result[0].source.type).toBe('attribute')
        })

        it('content属性から日本語を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><head><meta name="description" content="サイトの説明文"></head><body></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(1)
          expect(result[0].value).toBe('サイトの説明文')
          expect(result[0].source.type).toBe('attribute')
        })

        it('placeholder属性から日本語を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><input placeholder="名前を入力"></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(1)
          expect(result[0].value).toBe('名前を入力')
        })

        it('aria-label属性から日本語を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><button aria-label="閉じる">X</button></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(1)
          expect(result[0].value).toBe('閉じる')
        })

        it('英語のみの属性は抽出しないこと', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><img src="test.jpg" alt="English text"></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(0)
        })

        it('hidden inputのvalue属性から日本語を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><input type="hidden" name="sort" value="人気順"></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(1)
          expect(result[0].value).toBe('人気順')
          expect(result[0].source.type).toBe('attribute')
          if (result[0].source.type === 'attribute') {
            expect(result[0].source.attributeName).toBe('value')
          }
        })

        it('通常のinputのvalue属性は抽出しないこと', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><input type="text" value="入力値"></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(0)
        })

        it('hidden inputでも英語のみのvalueは抽出しないこと', () => {
          // Arrange
          const service = new TextExtractorService()
          const html =
            '<html><body><input type="hidden" value="popularity"></body></html>'
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(0)
        })
      })

      describe('JSON-LD抽出', () => {
        it('JSON-LD内の日本語を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html = `
            <html>
              <head>
                <script type="application/ld+json">
                  {"name": "商品名", "description": "商品の説明"}
                </script>
              </head>
              <body></body>
            </html>
          `
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(2)
          const values = result.map((r) => r.value)
          expect(values).toContain('商品名')
          expect(values).toContain('商品の説明')
        })

        it('ネストされたJSON-LD内の日本語を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html = `
            <html>
              <head>
                <script type="application/ld+json">
                  {"@type": "Product", "name": "商品名", "brand": {"name": "ブランド名"}}
                </script>
              </head>
              <body></body>
            </html>
          `
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          const values = result.map((r) => r.value)
          expect(values).toContain('商品名')
          expect(values).toContain('ブランド名')
        })

        it('配列内のJSON-LD値を抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
          const html = `
            <html>
              <head>
                <script type="application/ld+json">
                  {"keywords": ["キーワード1", "キーワード2"]}
                </script>
              </head>
              <body></body>
            </html>
          `
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          const values = result.map((r) => r.value)
          expect(values).toContain('キーワード1')
          expect(values).toContain('キーワード2')
        })

        it('通常のscriptタグは抽出しないこと', () => {
          // Arrange
          const service = new TextExtractorService()
          const html = `
            <html>
              <head>
                <script>const name = "日本語変数";</script>
              </head>
              <body><p>本文</p></body>
            </html>
          `
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(1)
          expect(result[0].value).toBe('本文')
        })
      })

      describe('複合抽出', () => {
        it('テキストノード、属性、JSON-LDを全て抽出できること', () => {
          // Arrange
          const service = new TextExtractorService()
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

          // Act
          const result = service.execute(hast)

          // Assert
          const values = result.map((r) => r.value)
          expect(values).toContain('本文テキスト')
          expect(values).toContain('メタ説明')
          expect(values).toContain('画像説明')
          expect(values).toContain('構造化名')
        })

        it('テキストと属性で同じ値の場合は重複しないこと', () => {
          // Arrange
          const service = new TextExtractorService()
          const html = `
            <html>
              <body>
                <p title="同じ値">同じ値</p>
              </body>
            </html>
          `
          const hast = parser.execute(html)

          // Act
          const result = service.execute(hast)

          // Assert
          expect(result.length).toBe(1)
          expect(result[0].value).toBe('同じ値')
        })
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
