/**
 * Service for extracting Japanese text strings from JavaScript code.
 * Handles both Unicode escape sequences and direct UTF-8 Japanese characters.
 */
export class JsTextExtractorService {
  /**
   * Japanese character ranges for detection.
   * - Hiragana: \u3040-\u309F
   * - Katakana: \u30A0-\u30FF
   * - Kanji: \u4E00-\u9FFF
   */
  private static readonly JAPANESE_REGEX =
    /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/

  /**
   * Unicode escape pattern for Japanese characters.
   */
  private static readonly UNICODE_ESCAPE_REGEX = /\\u([0-9a-fA-F]{4})/g

  /**
   * Executes the extraction of Japanese strings from JavaScript code.
   * @param jsCode - The JavaScript code to extract strings from
   * @returns Array of unique Japanese strings found in the code
   */
  public execute(jsCode: string): string[] {
    const strings = this.extractStringLiterals(jsCode)
    const japaneseStrings = strings.filter((str) => this.containsJapanese(str))
    return [...new Set(japaneseStrings)]
  }

  /**
   * Extracts all string literals from JavaScript code.
   * Handles both single and double quoted strings.
   * @param jsCode - The JavaScript code to parse
   * @returns Array of extracted string values (with Unicode unescaped)
   */
  private extractStringLiterals(jsCode: string): string[] {
    const results: string[] = []

    // Match double-quoted strings
    const doubleQuoteRegex = /"(?:[^"\\]|\\.)*"/g
    const doubleQuoteMatches = jsCode.match(doubleQuoteRegex) ?? []
    for (const matchStr of doubleQuoteMatches) {
      const raw = matchStr.slice(1, -1) // Remove quotes
      const unescaped = this.unescapeUnicode(raw)
      if (unescaped.trim()) {
        results.push(unescaped)
      }
    }

    // Match single-quoted strings
    const singleQuoteRegex = /'(?:[^'\\]|\\.)*'/g
    const singleQuoteMatches = jsCode.match(singleQuoteRegex) ?? []
    for (const matchStr of singleQuoteMatches) {
      const raw = matchStr.slice(1, -1) // Remove quotes
      const unescaped = this.unescapeUnicode(raw)
      if (unescaped.trim()) {
        results.push(unescaped)
      }
    }

    return results
  }

  /**
   * Unescapes Unicode sequences in a string.
   * @param str - String potentially containing Unicode escapes
   * @returns String with Unicode escapes converted to actual characters
   */
  private unescapeUnicode(str: string): string {
    return str.replace(
      JsTextExtractorService.UNICODE_ESCAPE_REGEX,
      (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16)),
    )
  }

  /**
   * Checks if a string contains Japanese characters.
   * @param str - The string to check
   * @returns True if the string contains Japanese characters
   */
  private containsJapanese(str: string): boolean {
    return JsTextExtractorService.JAPANESE_REGEX.test(str)
  }
}
