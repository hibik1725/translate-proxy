/**
 * Text Extractor Service
 * Extracts translatable text nodes from HAST
 */

import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'

/**
 * Result of text extraction containing node reference and text value
 */
export interface ExtractedText {
  /** The text node reference */
  node: Text
  /** The trimmed text value */
  value: string
}

/**
 * Tags that should be excluded from translation
 */
const EXCLUDE_TAGS = ['script', 'style', 'code', 'pre', 'noscript']

/**
 * Service for extracting translatable text from HAST.
 */
export class TextExtractorService {
  /**
   * Executes the text extraction operation.
   * @param hast - The HAST to extract text from
   * @returns Array of extracted text objects (deduplicated)
   */
  public execute(hast: Root): ExtractedText[] {
    const textNodes: ExtractedText[] = []
    const seenValues = new Set<string>()

    visit(hast, 'text', (node: Text, _index, parent) => {
      if (this.shouldTranslate(parent as Element | null)) {
        const trimmed = node.value.trim()
        if (
          trimmed &&
          this.containsJapanese(trimmed) &&
          !seenValues.has(trimmed)
        ) {
          seenValues.add(trimmed)
          textNodes.push({ node, value: trimmed })
        }
      }
    })

    return textNodes
  }

  /**
   * Gets unique text values from HAST.
   * @param hast - The HAST to extract text from
   * @returns Array of unique text values
   */
  public getUniqueTexts(hast: Root): string[] {
    const extracted = this.execute(hast)
    return [...new Set(extracted.map((e) => e.value))]
  }

  /**
   * Checks if the parent element should be translated.
   * @param parent - The parent element
   * @returns True if the element should be translated
   */
  private shouldTranslate(parent: Element | null): boolean {
    if (!parent) return true
    return !EXCLUDE_TAGS.includes(parent.tagName)
  }

  /**
   * Checks if the text contains Japanese characters.
   * @param text - The text to check
   * @returns True if the text contains Japanese characters
   */
  private containsJapanese(text: string): boolean {
    // Hiragana: \u3040-\u309F
    // Katakana: \u30A0-\u30FF
    // Kanji: \u4E00-\u9FFF
    return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text)
  }
}
