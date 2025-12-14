import type { Element } from 'hast'

/**
 * Tags that should be excluded from text extraction/replacement.
 * These tags typically contain non-translatable content.
 */
export const EXCLUDE_TAGS: readonly string[] = ['style', 'code', 'noscript']

/**
 * HTML attributes that contain translatable text content.
 */
export const TRANSLATABLE_ATTRIBUTES: readonly string[] = [
  'alt',
  'title',
  'placeholder',
  'ariaLabel',
  'ariaDescription',
  'content',
]

/**
 * Checks if the given text contains Japanese characters.
 * Detects Hiragana, Katakana, and Kanji.
 * @param text - The text to check
 * @returns True if the text contains Japanese characters
 */
export function containsJapanese(text: string): boolean {
  // Hiragana: \u3040-\u309F
  // Katakana: \u30A0-\u30FF
  // Kanji: \u4E00-\u9FFF
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
}

/**
 * Checks if the element is a hidden input.
 * @param element - The element to check
 * @returns True if the element is a hidden input
 */
export function isHiddenInput(element: Element): boolean {
  return element.tagName === 'input' && element.properties?.type === 'hidden'
}
