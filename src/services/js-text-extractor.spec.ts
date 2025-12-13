import { describe, expect, it } from 'vitest'
import { JsTextExtractorService } from './js-text-extractor'

describe('JsTextExtractorService', () => {
  describe('execute', () => {
    describe('成功系', () => {
      it('Unicodeエスケープされた日本語文字列を抽出できること', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode =
          'var text = "\\u691c\\u7d22\\u6761\\u4ef6\\u306b\\u623b\\u308b";'

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result).toContain('検索条件に戻る')
      })

      it('UTF-8の日本語文字列を抽出できること', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode = 'var text = "こんにちは世界";'

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result).toContain('こんにちは世界')
      })

      it('複数の日本語文字列を抽出できること', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode = `
          var a = "\\u30b9\\u30d1\\u30a4\\u30af\\u540d";
          var b = "\\u91cd\\u3055";
          var c = "価格";
        `

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result).toContain('スパイク名')
        expect(result).toContain('重さ')
        expect(result).toContain('価格')
      })

      it('重複した文字列は1つだけ返すこと', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode = `
          var a = "スパイク名";
          var b = "スパイク名";
        `

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result.filter((s) => s === 'スパイク名')).toHaveLength(1)
      })

      it('シングルクォート内の日本語文字列を抽出できること', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode = "var text = '楽天で購入';"

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result).toContain('楽天で購入')
      })

      it('英語のみの文字列は抽出しないこと', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode = 'var text = "Hello World";'

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result).toHaveLength(0)
      })

      it('日本語が含まれない場合は空配列を返すこと', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode = 'function test() { return 123; }'

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result).toHaveLength(0)
      })

      it('混合文字列（日本語+英語）を抽出できること', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode = 'var text = "評価レビュー｜Picker for T&F";'

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result).toContain('評価レビュー｜Picker for T&F')
      })

      it('エスケープされた引用符を含む文字列を正しく処理すること', () => {
        // Arrange
        const extractor = new JsTextExtractorService()
        const jsCode = 'var text = "テスト\\"文字列\\"です";'

        // Act
        const result = extractor.execute(jsCode)

        // Assert
        expect(result.length).toBeGreaterThan(0)
      })
    })
  })
})
