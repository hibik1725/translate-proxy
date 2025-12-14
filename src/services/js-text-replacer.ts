/**
 * Service for replacing Japanese text in JavaScript code with translations.
 * Handles both Unicode escape sequences and direct UTF-8 Japanese characters.
 */
export class JsTextReplacerService {
  /**
   * Executes the replacement of Japanese strings in JavaScript code.
   * @param jsCode - The original JavaScript code
   * @param translations - Map of original Japanese text to translated text
   * @returns JavaScript code with translations applied
   */
  public execute(jsCode: string, translations: Map<string, string>): string {
    let result = jsCode

    // Sort by length (longest first) to avoid partial replacements
    // e.g., "短距離すべて" should be replaced before "短距離"
    const sortedEntries = [...translations.entries()].sort(
      (a, b) => b[0].length - a[0].length,
    )

    for (const [original, translated] of sortedEntries) {
      result = this.replaceAllOccurrences(result, original, translated)
    }

    return result
  }

  /**
   * Replaces all occurrences of a Japanese string in JS code.
   * Handles both escaped Unicode and direct UTF-8 forms.
   * Uses safe escaping to avoid breaking JS syntax.
   * @param code - The JavaScript code
   * @param original - The original Japanese string
   * @param translated - The translated string
   * @returns Code with replacements applied
   */
  private replaceAllOccurrences(
    code: string,
    original: string,
    translated: string,
  ): string {
    // Convert original to escaped form for matching
    const escapedOriginal = this.toUnicodeEscape(original)
    // Escape the translation to be safe for JS strings
    const safeTranslated = this.escapeForJsString(translated)

    // Replace Unicode escaped form with safe escaped translation
    let result = code.split(escapedOriginal).join(safeTranslated)

    // Also replace direct UTF-8 form if present with safe escaped translation
    result = result.split(original).join(safeTranslated)

    return result
  }

  /**
   * Escapes a string to be safely used inside a JavaScript string literal.
   * Escapes quotes, backslashes, and other special characters.
   * @param str - The string to escape
   * @returns Escaped string safe for JS string literals
   */
  private escapeForJsString(str: string): string {
    let result = ''
    for (const char of str) {
      const code = char.charCodeAt(0)
      // Escape characters that could break JS strings
      if (char === '\\') {
        result += '\\\\'
      } else if (char === '"') {
        result += '\\"'
      } else if (char === "'") {
        result += "\\'"
      } else if (char === '\n') {
        result += '\\n'
      } else if (char === '\r') {
        result += '\\r'
      } else if (char === '\t') {
        result += '\\t'
      } else if (code > 127) {
        // Keep non-ASCII as Unicode escapes to be safe
        result += `\\u${code.toString(16).padStart(4, '0')}`
      } else {
        result += char
      }
    }
    return result
  }

  /**
   * Converts a string to Unicode escape sequence format.
   * Only escapes non-ASCII characters.
   * @param str - The string to convert
   * @returns String with non-ASCII characters as Unicode escapes
   */
  private toUnicodeEscape(str: string): string {
    let result = ''
    for (const char of str) {
      const code = char.charCodeAt(0)
      if (code > 127) {
        result += `\\u${code.toString(16).padStart(4, '0')}`
      } else {
        result += char
      }
    }
    return result
  }
}
