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

    for (const [original, translated] of translations) {
      result = this.replaceAllOccurrences(result, original, translated)
    }

    return result
  }

  /**
   * Replaces all occurrences of a Japanese string in JS code.
   * Handles both escaped Unicode and direct UTF-8 forms.
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
    const escapedTranslated = this.toUnicodeEscape(translated)

    // Replace Unicode escaped form
    let result = code.split(escapedOriginal).join(escapedTranslated)

    // Also replace direct UTF-8 form if present
    result = result.split(original).join(translated)

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
