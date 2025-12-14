/**
 * Text Extractor Service
 * Extracts translatable text from HAST including text nodes, attributes, and JSON-LD
 */

import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'
import {
  containsJapanese,
  EXCLUDE_TAGS,
  isHiddenInput,
  TRANSLATABLE_ATTRIBUTES,
} from './html-utils'

/**
 * Types of extractable text sources
 */
export type TextSource =
  | { type: 'text'; node: Text }
  | { type: 'attribute'; element: Element; attributeName: string }
  | { type: 'jsonld'; element: Element }

/**
 * Result of text extraction containing source reference and text value
 */
export interface ExtractedText {
  /** The source of the extracted text */
  source: TextSource
  /** The trimmed text value */
  value: string
}

/**
 * Service for extracting translatable text from HAST.
 */
export class TextExtractorService {
  /**
   * Executes the text extraction operation.
   * @param hast - The HAST to extract text from
   * @returns Array of extracted text objects (deduplicated by value)
   */
  public execute(hast: Root): ExtractedText[] {
    const extractedTexts: ExtractedText[] = []
    const seenValues = new Set<string>()

    // Extract text nodes
    this.extractTextNodes(hast, extractedTexts, seenValues)

    // Extract translatable attributes
    this.extractAttributes(hast, extractedTexts, seenValues)

    // Extract JSON-LD content
    this.extractJsonLd(hast, extractedTexts, seenValues)

    return extractedTexts
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
   * Extracts text nodes from HAST.
   * @param hast - The HAST to extract from
   * @param results - Array to push results to
   * @param seenValues - Set of already seen values for deduplication
   */
  private extractTextNodes(
    hast: Root,
    results: ExtractedText[],
    seenValues: Set<string>,
  ): void {
    visit(hast, 'text', (node: Text, _index, parent) => {
      if (this.shouldTranslateTextNode(parent as Element | null)) {
        const trimmed = node.value.trim()
        if (trimmed && containsJapanese(trimmed) && !seenValues.has(trimmed)) {
          seenValues.add(trimmed)
          results.push({
            source: { type: 'text', node },
            value: trimmed,
          })
        }
      }
    })
  }

  /**
   * Extracts translatable attributes from elements.
   * @param hast - The HAST to extract from
   * @param results - Array to push results to
   * @param seenValues - Set of already seen values for deduplication
   */
  private extractAttributes(
    hast: Root,
    results: ExtractedText[],
    seenValues: Set<string>,
  ): void {
    visit(hast, 'element', (element: Element) => {
      if (EXCLUDE_TAGS.includes(element.tagName)) {
        return
      }

      const properties = element.properties
      if (!properties) return

      for (const attrName of TRANSLATABLE_ATTRIBUTES) {
        const attrValue = properties[attrName]
        if (typeof attrValue === 'string') {
          const trimmed = attrValue.trim()
          if (
            trimmed &&
            containsJapanese(trimmed) &&
            !seenValues.has(trimmed)
          ) {
            seenValues.add(trimmed)
            results.push({
              source: { type: 'attribute', element, attributeName: attrName },
              value: trimmed,
            })
          }
        }
      }

      // Extract value attribute from hidden inputs
      if (isHiddenInput(element)) {
        const value = properties.value
        if (typeof value === 'string') {
          const trimmed = value.trim()
          if (
            trimmed &&
            containsJapanese(trimmed) &&
            !seenValues.has(trimmed)
          ) {
            seenValues.add(trimmed)
            results.push({
              source: { type: 'attribute', element, attributeName: 'value' },
              value: trimmed,
            })
          }
        }
      }
    })
  }

  /**
   * Extracts Japanese text from JSON-LD and Next.js __NEXT_DATA__ script content.
   * @param hast - The HAST to extract from
   * @param results - Array to push results to
   * @param seenValues - Set of already seen values for deduplication
   */
  private extractJsonLd(
    hast: Root,
    results: ExtractedText[],
    seenValues: Set<string>,
  ): void {
    visit(hast, 'element', (element: Element) => {
      const isJsonLd =
        element.tagName === 'script' &&
        element.properties?.type === 'application/ld+json'
      const isNextData =
        element.tagName === 'script' &&
        element.properties?.id === '__NEXT_DATA__'

      if (isJsonLd || isNextData) {
        // Get the text content of the script
        const textChild = element.children[0]
        if (textChild && textChild.type === 'text') {
          const jsonContent = textChild.value
          const japaneseTexts = this.extractJapaneseFromJson(jsonContent)

          for (const text of japaneseTexts) {
            if (!seenValues.has(text)) {
              seenValues.add(text)
              results.push({
                source: { type: 'jsonld', element },
                value: text,
              })
            }
          }
        }
      }
    })
  }

  /**
   * Extracts all Japanese text strings from JSON content.
   * @param jsonString - The JSON string to parse
   * @returns Array of Japanese text strings
   */
  private extractJapaneseFromJson(jsonString: string): string[] {
    const results: string[] = []

    try {
      const parsed: unknown = JSON.parse(jsonString)
      this.collectJapaneseStrings(parsed, results)
    } catch {
      // If JSON parsing fails, try to extract using regex
      const matches = jsonString.match(
        /"[^"]*[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF][^"]*"/g,
      )
      if (matches) {
        for (const match of matches) {
          // Remove surrounding quotes
          const text = match.slice(1, -1)
          if (containsJapanese(text)) {
            results.push(text)
          }
        }
      }
    }

    return results
  }

  /**
   * Recursively collects Japanese strings from parsed JSON.
   * @param value - The value to inspect
   * @param results - Array to push results to
   */
  private collectJapaneseStrings(value: unknown, results: string[]): void {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (trimmed && containsJapanese(trimmed)) {
        results.push(trimmed)
      }
    } else if (Array.isArray(value)) {
      for (const item of value) {
        this.collectJapaneseStrings(item, results)
      }
    } else if (value !== null && typeof value === 'object') {
      for (const key of Object.keys(value)) {
        this.collectJapaneseStrings(
          (value as Record<string, unknown>)[key],
          results,
        )
      }
    }
  }

  /**
   * Checks if the parent element should have its text translated.
   * @param parent - The parent element
   * @returns True if the element should be translated
   */
  private shouldTranslateTextNode(parent: Element | null): boolean {
    if (!parent) return true
    // Allow script tags only for JSON-LD (handled separately)
    if (parent.tagName === 'script') return false
    return !EXCLUDE_TAGS.includes(parent.tagName)
  }
}
