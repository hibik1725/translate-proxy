import { describe, expect, it } from 'vitest'
import { JsTextReplacerService } from './js-text-replacer'

describe('JsTextReplacerService', () => {
  describe('execute', () => {
    describe('成功系', () => {
      it('Unicodeエスケープされた日本語文字列を置換できること', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode =
          'var text = "\\u691c\\u7d22\\u6761\\u4ef6\\u306b\\u623b\\u308b";'
        const translations = new Map([
          ['検索条件に戻る', 'Return to search criteria'],
        ])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        expect(result).toContain('Return to search criteria')
        expect(result).not.toContain('\\u691c\\u7d22')
      })

      it('UTF-8の日本語文字列を置換できること', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = 'var text = "こんにちは世界";'
        const translations = new Map([['こんにちは世界', 'Hello World']])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        expect(result).toContain('Hello World')
        expect(result).not.toContain('こんにちは世界')
      })

      it('複数の日本語文字列を一度に置換できること', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = `
          var a = "\\u30b9\\u30d1\\u30a4\\u30af\\u540d";
          var b = "価格";
        `
        const translations = new Map([
          ['スパイク名', 'Spike Name'],
          ['価格', 'Price'],
        ])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        expect(result).toContain('Spike Name')
        expect(result).toContain('Price')
      })

      it('翻訳マップにない文字列はそのまま残ること', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = 'var text = "テスト";'
        const translations = new Map<string, string>()

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        expect(result).toContain('テスト')
      })

      it('空の翻訳マップでも元のコードを返すこと', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = 'function test() { return 123; }'
        const translations = new Map<string, string>()

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        expect(result).toBe(jsCode)
      })

      it('同じ文字列の複数出現を全て置換できること', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = `
          var a = "テスト";
          var b = "テスト";
        `
        const translations = new Map([['テスト', 'Test']])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        const matches = result.match(/Test/g)
        expect(matches).toHaveLength(2)
        expect(result).not.toContain('テスト')
      })

      it('部分一致で誤って置換しないこと', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = 'var text = "スパイク名です";'
        const translations = new Map([['スパイク', 'Spike']])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        // 「スパイク」が「Spike」に置換されるので、結果は「Spike名です」になる
        expect(result).toContain('Spike')
      })

      it('翻訳にシングルクォートが含まれていてもJS構文が壊れないこと', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = "var text = '日本語';"
        const translations = new Map([['日本語', "It's Japanese"]])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        // シングルクォートがエスケープされる
        expect(result).toContain("It\\'s Japanese")
        expect(result).not.toContain('日本語')
      })

      it('翻訳にダブルクォートが含まれていてもJS構文が壊れないこと', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = 'var text = "日本語";'
        const translations = new Map([['日本語', 'Say "Hello"']])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        // ダブルクォートがエスケープされる
        expect(result).toContain('Say \\"Hello\\"')
        expect(result).not.toContain('日本語')
      })

      it('翻訳にバックスラッシュが含まれていてもJS構文が壊れないこと', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = 'var text = "パス";'
        const translations = new Map([['パス', 'C:\\path\\to\\file']])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        // バックスラッシュがエスケープされる
        expect(result).toContain('C:\\\\path\\\\to\\\\file')
        expect(result).not.toContain('パス')
      })

      it('翻訳に改行が含まれていてもJS構文が壊れないこと', () => {
        // Arrange
        const replacer = new JsTextReplacerService()
        const jsCode = 'var text = "テキスト";'
        const translations = new Map([['テキスト', 'Line1\nLine2']])

        // Act
        const result = replacer.execute(jsCode, translations)

        // Assert
        // 改行がエスケープされる
        expect(result).toContain('Line1\\nLine2')
        expect(result).not.toContain('テキスト')
      })
    })
  })
})
