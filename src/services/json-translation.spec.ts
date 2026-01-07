import { describe, expect, it } from 'vitest'
import { JsonTranslationService } from './json-translation'

describe('JsonTranslationService', () => {
  describe('extractJapaneseStrings', () => {
    describe('成功系', () => {
      it('文字列から日本語テキストを抽出できること', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings('こんにちは')
        expect(result).toEqual(['こんにちは'])
      })

      it('オブジェクトから日本語テキストを抽出できること', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings({
          title: '記事のタイトル',
          content: '記事の内容',
          author: 'John Doe',
        })
        expect(result).toContain('記事のタイトル')
        expect(result).toContain('記事の内容')
        expect(result).not.toContain('John Doe')
      })

      it('配列から日本語テキストを抽出できること', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings([
          'りんご',
          'バナナ',
          'Apple',
        ])
        expect(result).toContain('りんご')
        expect(result).toContain('バナナ')
        expect(result).not.toContain('Apple')
      })

      it('ネストした構造から日本語テキストを抽出できること', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings({
          pageProps: {
            items: [
              { name: '商品A', price: 100 },
              { name: '商品B', price: 200 },
            ],
            meta: {
              description: 'この商品について',
            },
          },
        })
        expect(result).toContain('商品A')
        expect(result).toContain('商品B')
        expect(result).toContain('この商品について')
      })

      it('重複するテキストは一度だけ抽出されること', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings({
          title: '同じテキスト',
          subtitle: '同じテキスト',
        })
        expect(result).toEqual(['同じテキスト'])
      })

      it('空文字やスペースのみの文字列は除外されること', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings({
          empty: '',
          spaces: '   ',
          valid: 'テスト',
        })
        expect(result).toEqual(['テスト'])
      })
    })

    describe('失敗系', () => {
      it('nullの場合は空配列を返すこと', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings(null)
        expect(result).toEqual([])
      })

      it('undefinedの場合は空配列を返すこと', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings(undefined)
        expect(result).toEqual([])
      })

      it('数値の場合は空配列を返すこと', () => {
        const service = new JsonTranslationService()
        const result = service.extractJapaneseStrings(123)
        expect(result).toEqual([])
      })
    })
  })

  describe('replaceTranslations', () => {
    describe('成功系', () => {
      it('文字列の翻訳を置換できること', () => {
        const service = new JsonTranslationService()
        const translations = new Map([['こんにちは', 'Hello']])
        const result = service.replaceTranslations('こんにちは', translations)
        expect(result).toBe('Hello')
      })

      it('オブジェクト内の翻訳を置換できること', () => {
        const service = new JsonTranslationService()
        const translations = new Map([
          ['記事のタイトル', 'Article Title'],
          ['記事の内容', 'Article Content'],
        ])
        const result = service.replaceTranslations(
          {
            title: '記事のタイトル',
            content: '記事の内容',
            author: 'John Doe',
          },
          translations,
        )
        expect(result).toEqual({
          title: 'Article Title',
          content: 'Article Content',
          author: 'John Doe',
        })
      })

      it('配列内の翻訳を置換できること', () => {
        const service = new JsonTranslationService()
        const translations = new Map([
          ['りんご', 'Apple'],
          ['バナナ', 'Banana'],
        ])
        const result = service.replaceTranslations(
          ['りんご', 'バナナ', 'Orange'],
          translations,
        )
        expect(result).toEqual(['Apple', 'Banana', 'Orange'])
      })

      it('ネストした構造内の翻訳を置換できること', () => {
        const service = new JsonTranslationService()
        const translations = new Map([
          ['商品A', 'Product A'],
          ['商品B', 'Product B'],
          ['この商品について', 'About this product'],
        ])
        const result = service.replaceTranslations(
          {
            pageProps: {
              items: [
                { name: '商品A', price: 100 },
                { name: '商品B', price: 200 },
              ],
              meta: {
                description: 'この商品について',
              },
            },
          },
          translations,
        )
        expect(result).toEqual({
          pageProps: {
            items: [
              { name: 'Product A', price: 100 },
              { name: 'Product B', price: 200 },
            ],
            meta: {
              description: 'About this product',
            },
          },
        })
      })

      it('前後にスペースがある場合でも置換できること', () => {
        const service = new JsonTranslationService()
        const translations = new Map([['テスト', 'Test']])
        const result = service.replaceTranslations('  テスト  ', translations)
        expect(result).toBe('  Test  ')
      })

      it('翻訳がないテキストはそのまま残ること', () => {
        const service = new JsonTranslationService()
        const translations = new Map<string, string>()
        const result = service.replaceTranslations('翻訳なし', translations)
        expect(result).toBe('翻訳なし')
      })
    })

    describe('失敗系', () => {
      it('nullの場合はnullを返すこと', () => {
        const service = new JsonTranslationService()
        const result = service.replaceTranslations(null, new Map())
        expect(result).toBeNull()
      })

      it('数値の場合はそのまま返すこと', () => {
        const service = new JsonTranslationService()
        const result = service.replaceTranslations(123, new Map())
        expect(result).toBe(123)
      })

      it('booleanの場合はそのまま返すこと', () => {
        const service = new JsonTranslationService()
        const result = service.replaceTranslations(true, new Map())
        expect(result).toBe(true)
      })
    })
  })
})
