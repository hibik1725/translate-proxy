import type { Element } from 'hast'
import { describe, expect, it } from 'vitest'
import {
  containsJapanese,
  EXCLUDE_TAGS,
  isHiddenInput,
  TRANSLATABLE_ATTRIBUTES,
} from './html-utils'

describe('html-utils', () => {
  describe('EXCLUDE_TAGS', () => {
    it('除外対象のタグが定義されていること', () => {
      expect(EXCLUDE_TAGS).toContain('style')
      expect(EXCLUDE_TAGS).toContain('code')
      expect(EXCLUDE_TAGS).toContain('noscript')
    })
  })

  describe('TRANSLATABLE_ATTRIBUTES', () => {
    it('翻訳対象の属性が定義されていること', () => {
      expect(TRANSLATABLE_ATTRIBUTES).toContain('alt')
      expect(TRANSLATABLE_ATTRIBUTES).toContain('title')
      expect(TRANSLATABLE_ATTRIBUTES).toContain('placeholder')
      expect(TRANSLATABLE_ATTRIBUTES).toContain('ariaLabel')
      expect(TRANSLATABLE_ATTRIBUTES).toContain('ariaDescription')
      expect(TRANSLATABLE_ATTRIBUTES).toContain('content')
    })
  })

  describe('containsJapanese', () => {
    describe('成功系', () => {
      it('ひらがなを含むテキストでtrueを返すこと', () => {
        expect(containsJapanese('こんにちは')).toBe(true)
      })

      it('カタカナを含むテキストでtrueを返すこと', () => {
        expect(containsJapanese('カタカナ')).toBe(true)
      })

      it('漢字を含むテキストでtrueを返すこと', () => {
        expect(containsJapanese('漢字')).toBe(true)
      })

      it('日本語と英語が混在するテキストでtrueを返すこと', () => {
        expect(containsJapanese('Hello こんにちは')).toBe(true)
      })
    })

    describe('失敗系', () => {
      it('英語のみのテキストでfalseを返すこと', () => {
        expect(containsJapanese('Hello World')).toBe(false)
      })

      it('数字のみのテキストでfalseを返すこと', () => {
        expect(containsJapanese('12345')).toBe(false)
      })

      it('空文字でfalseを返すこと', () => {
        expect(containsJapanese('')).toBe(false)
      })

      it('記号のみのテキストでfalseを返すこと', () => {
        expect(containsJapanese('!@#$%^&*()')).toBe(false)
      })
    })
  })

  describe('isHiddenInput', () => {
    describe('成功系', () => {
      it('hidden inputの場合trueを返すこと', () => {
        const element: Element = {
          type: 'element',
          tagName: 'input',
          properties: { type: 'hidden' },
          children: [],
        }
        expect(isHiddenInput(element)).toBe(true)
      })
    })

    describe('失敗系', () => {
      it('text inputの場合falseを返すこと', () => {
        const element: Element = {
          type: 'element',
          tagName: 'input',
          properties: { type: 'text' },
          children: [],
        }
        expect(isHiddenInput(element)).toBe(false)
      })

      it('inputではない要素の場合falseを返すこと', () => {
        const element: Element = {
          type: 'element',
          tagName: 'div',
          properties: {},
          children: [],
        }
        expect(isHiddenInput(element)).toBe(false)
      })

      it('propertiesがない場合falseを返すこと', () => {
        // Type assertion needed to test edge case where properties is undefined
        const element = {
          type: 'element',
          tagName: 'input',
          properties: undefined,
          children: [],
        } as unknown as Element
        expect(isHiddenInput(element)).toBe(false)
      })
    })
  })
})
