/**
 * 翻訳サービス
 * テキストを指定言語に翻訳する
 */

/**
 * サポートされている言語コード
 */
export const SUPPORTED_LANGS = ['en', 'zh', 'ko'] as const

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
 * 言語コードから言語名を取得する
 * @param lang - 言語コード
 * @returns 言語名
 */
export function getLangName(lang: SupportedLang): string {
  const names: Record<SupportedLang, string> = {
    en: 'English',
    zh: 'Chinese',
    ko: 'Korean',
  }
  return names[lang]
}

/**
 * テキストを翻訳する（スタブ実装）
 * @param text - 翻訳対象のテキスト
 * @param targetLang - 翻訳先の言語コード
 * @returns 翻訳されたテキスト
 */
export function translate(text: string, targetLang: SupportedLang): string {
  const langName = getLangName(targetLang)
  return `[${langName}] ${text}`
}
