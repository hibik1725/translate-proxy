/**
 * Text Replacer Service
 * Replaces text in HAST with translated text (text nodes, attributes, and JSON-LD)
 */

import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'
import {
  EXCLUDE_TAGS,
  isHiddenInput,
  TRANSLATABLE_ATTRIBUTES,
} from './html-utils'

/**
 * Service for replacing text with translations.
 */
export class TextReplacerService {
  /**
   * Executes the text replacement operation.
   * @param hast - The HAST to modify
   * @param translations - A Map of original text to translated text
   * @returns The modified HAST with replaced text
   */
  public execute(hast: Root, translations: Map<string, string>): Root {
    // Replace text nodes
    this.replaceTextNodes(hast, translations)

    // Replace attributes
    this.replaceAttributes(hast, translations)

    // Replace JSON-LD content
    this.replaceJsonLd(hast, translations)

    return hast
  }

  /**
   * Replaces text nodes with translations.
   * @param hast - The HAST to modify
   * @param translations - A Map of original text to translated text
   */
  private replaceTextNodes(
    hast: Root,
    translations: Map<string, string>,
  ): void {
    visit(hast, 'text', (node: Text, _index, parent) => {
      if (this.shouldReplace(parent as Element | null)) {
        const trimmed = node.value.trim()
        const translated = translations.get(trimmed)
        if (translated) {
          // Preserve whitespace around the text
          node.value = node.value.replace(trimmed, translated)
        }
      }
    })
  }

  /**
   * Replaces attributes with translations.
   * @param hast - The HAST to modify
   * @param translations - A Map of original text to translated text
   */
  private replaceAttributes(
    hast: Root,
    translations: Map<string, string>,
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
          const translated = translations.get(trimmed)
          if (translated) {
            properties[attrName] = attrValue.replace(trimmed, translated)
          }
        }
      }

      // Replace value attribute in hidden inputs
      if (isHiddenInput(element)) {
        const value = properties.value
        if (typeof value === 'string') {
          const trimmed = value.trim()
          const translated = translations.get(trimmed)
          if (translated) {
            properties.value = value.replace(trimmed, translated)
          }
        }
      }
    })
  }

  /**
   * Replaces JSON-LD and Next.js __NEXT_DATA__ content with translations.
   * @param hast - The HAST to modify
   * @param translations - A Map of original text to translated text
   */
  private replaceJsonLd(hast: Root, translations: Map<string, string>): void {
    visit(hast, 'element', (element: Element) => {
      const isJsonLd =
        element.tagName === 'script' &&
        element.properties?.type === 'application/ld+json'
      const isNextData =
        element.tagName === 'script' &&
        element.properties?.id === '__NEXT_DATA__'

      if (isJsonLd || isNextData) {
        const textChild = element.children[0]
        if (textChild && textChild.type === 'text') {
          const originalJson = textChild.value

          try {
            const parsed: unknown = JSON.parse(originalJson)
            const replaced = this.replaceInJsonValue(parsed, translations)
            textChild.value = JSON.stringify(replaced)
          } catch {
            // If JSON parsing fails, try string replacement
            let modified = originalJson
            for (const [original, translated] of translations.entries()) {
              // Escape special regex characters in the original text
              const escapedOriginal = original.replace(
                /[.*+?^${}()|[\]\\]/g,
                '\\$&',
              )
              modified = modified.replace(
                new RegExp(escapedOriginal, 'g'),
                translated,
              )
            }
            textChild.value = modified
          }
        }
      }
    })
  }

  /**
   * Recursively replaces strings in a parsed JSON value.
   * @param value - The value to process
   * @param translations - A Map of original text to translated text
   * @returns The processed value with replacements
   */
  private replaceInJsonValue(
    value: unknown,
    translations: Map<string, string>,
  ): unknown {
    if (typeof value === 'string') {
      const trimmed = value.trim()
      const translated = translations.get(trimmed)
      if (translated) {
        return value.replace(trimmed, translated)
      }
      return value
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.replaceInJsonValue(item, translations))
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(value)) {
        result[key] = this.replaceInJsonValue(
          (value as Record<string, unknown>)[key],
          translations,
        )
      }
      return result
    }

    return value
  }

  /**
   * Checks if the parent element should have its text replaced.
   * @param parent - The parent element
   * @returns True if the text should be replaced
   */
  private shouldReplace(parent: Element | null): boolean {
    if (!parent) return true
    // Exclude script tags for text nodes (JSON-LD handled separately)
    if (parent.tagName === 'script') return false
    return !EXCLUDE_TAGS.includes(parent.tagName)
  }
}
