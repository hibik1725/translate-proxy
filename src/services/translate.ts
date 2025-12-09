/**
 * 翻訳サービス
 * テキストを指定言語に翻訳する
 */

/**
 * サポートされている言語コード
 */
export const SUPPORTED_LANGS = ['en'] as const

/**
 * サポートされている言語の型
 */
export type SupportedLang = (typeof SUPPORTED_LANGS)[number]

/**
 * 言語コードがサポートされているかチェックする
 * @param lang - チェック対象の言語コード
 * @returns サポートされている場合true
 */
export function isSupportedLang(lang: string): lang is SupportedLang {
  return SUPPORTED_LANGS.includes(lang as SupportedLang)
}

/**
 * Translation service for translating text to a target language.
 */
export class TranslateService {
  /**
   * Creates a new TranslateService instance.
   * @param targetLang - The target language code for translation
   */
  constructor(private readonly targetLang: SupportedLang) {}

  /**
   * Executes the translation operation.
   * @param text - The text to translate
   * @returns The translated text with language prefix
   */
  public execute(text: string): string {
    const langName = this.getLangName()
    return `[${langName}] ${text}`
  }

  /**
   * Gets the language name for the target language.
   * @returns The language name
   */
  private getLangName(): string {
    const names: Record<SupportedLang, string> = {
      en: 'English',
    }
    return names[this.targetLang]
  }
}
