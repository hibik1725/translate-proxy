import { describe, it, expect } from 'vitest'
import {
  isSupportedLang,
  getLangName,
  translate,
  SUPPORTED_LANGS,
} from './translate'

describe('翻訳サービス', () => {
  describe('SUPPORTED_LANGS', () => {
    describe('成功系', () => {
      it('en, zh, ko を含むこと', () => {
        expect(SUPPORTED_LANGS).toContain('en')
        expect(SUPPORTED_LANGS).toContain('zh')
        expect(SUPPORTED_LANGS).toContain('ko')
      })
    })
  })

  describe('isSupportedLang', () => {
    describe('成功系', () => {
      it('en に対して true を返すこと', () => {
        expect(isSupportedLang('en')).toBe(true)
      })

      it('zh に対して true を返すこと', () => {
        expect(isSupportedLang('zh')).toBe(true)
      })

      it('ko に対して true を返すこと', () => {
        expect(isSupportedLang('ko')).toBe(true)
      })
    })

    describe('失敗系', () => {
      it('サポートされていない言語に対して false を返すこと', () => {
        expect(isSupportedLang('fr')).toBe(false)
        expect(isSupportedLang('de')).toBe(false)
        expect(isSupportedLang('')).toBe(false)
      })
    })
  })

  describe('getLangName', () => {
    describe('成功系', () => {
      it('en に対して English を返すこと', () => {
        expect(getLangName('en')).toBe('English')
      })

      it('zh に対して Chinese を返すこと', () => {
        expect(getLangName('zh')).toBe('Chinese')
      })

      it('ko に対して Korean を返すこと', () => {
        expect(getLangName('ko')).toBe('Korean')
      })
    })
  })

  describe('translate', () => {
    describe('成功系', () => {
      it('en の場合、English プレフィックス付きのテキストを返すこと', () => {
        expect(translate('こんにちは', 'en')).toBe('[English] こんにちは')
      })

      it('zh の場合、Chinese プレフィックス付きのテキストを返すこと', () => {
        expect(translate('こんにちは', 'zh')).toBe('[Chinese] こんにちは')
      })

      it('ko の場合、Korean プレフィックス付きのテキストを返すこと', () => {
        expect(translate('こんにちは', 'ko')).toBe('[Korean] こんにちは')
      })
    })
  })
})
