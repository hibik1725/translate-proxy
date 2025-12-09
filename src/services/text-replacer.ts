/**
 * Text Replacer Service
 * Replaces text nodes in HAST with translated text
 */

import type { Element, Root, Text } from 'hast'
import { visit } from 'unist-util-visit'

/**
 * Tags that should be excluded from replacement
 */
const EXCLUDE_TAGS = ['script', 'style', 'code', 'pre', 'noscript']

/**
 * Service for replacing text nodes with translations.
 */
export class TextReplacerService {
  /**
   * Executes the text replacement operation.
   * @param hast - The HAST to modify
   * @param translations - A Map of original text to translated text
   * @returns The modified HAST with replaced text
   */
  public execute(hast: Root, translations: Map<string, string>): Root {
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

    return hast
  }

  /**
   * Checks if the parent element should have its text replaced.
   * @param parent - The parent element
   * @returns True if the text should be replaced
   */
  private shouldReplace(parent: Element | null): boolean {
    if (!parent) return true
    return !EXCLUDE_TAGS.includes(parent.tagName)
  }
}
