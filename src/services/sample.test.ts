import { describe, it, expect } from 'vitest'
import { add, containsJapanese } from './sample'

describe('sample', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      expect(add(1, 2)).toBe(3)
    })

    it('should add negative numbers', () => {
      expect(add(-1, -2)).toBe(-3)
    })

    it('should add zero', () => {
      expect(add(0, 5)).toBe(5)
    })
  })

  describe('containsJapanese', () => {
    it('should return true for hiragana', () => {
      expect(containsJapanese('あいうえお')).toBe(true)
    })

    it('should return true for katakana', () => {
      expect(containsJapanese('アイウエオ')).toBe(true)
    })

    it('should return true for kanji', () => {
      expect(containsJapanese('日本語')).toBe(true)
    })

    it('should return false for English only', () => {
      expect(containsJapanese('Hello World')).toBe(false)
    })

    it('should return true for mixed text', () => {
      expect(containsJapanese('Hello 世界')).toBe(true)
    })
  })
})
