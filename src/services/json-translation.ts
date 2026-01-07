/**
 * JSON Translation Service
 * Extracts and replaces Japanese text in JSON structures
 */

import { containsJapanese } from './html-utils'

/**
 * Service for extracting and replacing Japanese text in JSON structures.
 */
export class JsonTranslationService {
  /**
   * Extracts all Japanese text strings from a JSON value.
   * @param value - The value to extract from
   * @returns Array of unique Japanese text strings
   */
  public extractJapaneseStrings(value: unknown): string[] {
    const results: string[] = []
    this.collectJapaneseStrings(value, results)
    return [...new Set(results)]
  }

  /**
   * Replaces Japanese strings in a JSON value with translations.
   * @param value - The value to replace in
   * @param translations - Map of original text to translated text
   * @returns The value with replacements applied
   */
  public replaceTranslations(
    value: unknown,
    translations: Map<string, string>,
  ): unknown {
    return this.replaceInJson(value, translations)
  }

  /**
   * Recursively collects Japanese strings from a value.
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
   * Recursively replaces Japanese strings with translations.
   * @param value - The value to replace in
   * @param translations - Map of original text to translated text
   * @returns The value with replacements applied
   */
  private replaceInJson(
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
      return value.map((item) => this.replaceInJson(item, translations))
    }

    if (value !== null && typeof value === 'object') {
      const result: Record<string, unknown> = {}
      for (const key of Object.keys(value)) {
        result[key] = this.replaceInJson(
          (value as Record<string, unknown>)[key],
          translations,
        )
      }
      return result
    }

    return value
  }
}
