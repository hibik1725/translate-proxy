import { describe, expect, it } from 'vitest'
import { isSupportedLang, SUPPORTED_LANGS, TranslateService } from './translate'

describe('翻訳サービス', () => {
  describe('SUPPORTED_LANGS', () => {
    describe('成功系', () => {
      it('en を含むこと', () => {
        expect(SUPPORTED_LANGS).toContain('en')
      })
    })

    describe('失敗系', () => {
      it('zh, ko を含まないこと', () => {
        expect(SUPPORTED_LANGS).not.toContain('zh')
        expect(SUPPORTED_LANGS).not.toContain('ko')
      })
    })
  })

  describe('isSupportedLang', () => {
    describe('成功系', () => {
      it('en に対して true を返すこと', () => {
        expect(isSupportedLang('en')).toBe(true)
      })
    })

    describe('失敗系', () => {
      it('サポートされていない言語に対して false を返すこと', () => {
        expect(isSupportedLang('zh')).toBe(false)
        expect(isSupportedLang('ko')).toBe(false)
        expect(isSupportedLang('fr')).toBe(false)
        expect(isSupportedLang('')).toBe(false)
      })
    })
  })

  describe('TranslateService', () => {
    describe('execute', () => {
      describe('成功系', () => {
        it('en の場合、English プレフィックス付きのテキストを返すこと', () => {
          const service = new TranslateService('en')
          expect(service.execute('こんにちは')).toBe('[English] こんにちは')
        })
      })
    })
  })
})
