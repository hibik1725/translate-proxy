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
    /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g

  /**
   * Unicode escape pattern for Japanese characters.
   */
  private static readonly UNICODE_ESCAPE_REGEX = /\\u([0-9a-fA-F]{4})/g

  /**
   * Maximum length for extracted strings.
   * UI strings are typically short, so we filter out long strings
   * that are likely code or data rather than translatable text.
   */
  private static readonly MAX_STRING_LENGTH = 200

  /**
   * Patterns that indicate a string is likely JavaScript code, not UI text.
   */
  private static readonly CODE_PATTERNS = [
    /[{}();=]/, // JS syntax characters
    /function\s*\(/, // function declarations
    /=>\s*[{(]/, // arrow functions
    /\.\w+\(/, // method calls
    /\[\d+\]/, // array access
    /https?:\/\//, // URLs
    /\w+:\s*\w+,/, // object property patterns
  ]

  /**
   * Executes the extraction of Japanese strings from JavaScript code.
   * @param jsCode - The JavaScript code to extract strings from
   * @returns Array of unique Japanese strings found in the code
   */
  public execute(jsCode: string): string[] {
    const strings = this.extractStringLiterals(jsCode)
    const japaneseStrings = strings.filter((str) =>
      this.isTranslatableJapaneseString(str),
    )
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
   * Checks if a string is a translatable Japanese string.
   * Filters out strings that are too long, contain code patterns,
   * or have too low a ratio of Japanese characters.
   * @param str - The string to check
   * @returns True if the string should be translated
   */
  private isTranslatableJapaneseString(str: string): boolean {
    // Skip empty or too long strings
    if (
      str.length === 0 ||
      str.length > JsTextExtractorService.MAX_STRING_LENGTH
    ) {
      return false
    }

    // Check if contains Japanese
    const japaneseMatches = str.match(JsTextExtractorService.JAPANESE_REGEX)
    if (!japaneseMatches || japaneseMatches.length === 0) {
      return false
    }

    // Skip strings that look like code
    for (const pattern of JsTextExtractorService.CODE_PATTERNS) {
      if (pattern.test(str)) {
        return false
      }
    }

    // Ensure Japanese characters make up a reasonable portion of the string
    // (at least 20% for mixed strings, or the string is short)
    const japaneseCharCount = japaneseMatches.length
    const nonWhitespaceLength = str.replace(/\s/g, '').length
    if (nonWhitespaceLength > 10) {
      const japaneseRatio = japaneseCharCount / nonWhitespaceLength
      if (japaneseRatio < 0.2) {
        return false
      }
    }

    return true
  }
}
