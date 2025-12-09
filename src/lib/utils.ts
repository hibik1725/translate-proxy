import crypto from 'crypto'

/**
 * テキストのSHA256ハッシュを生成（翻訳メモリ検索用）
 */
export function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex')
}

/**
 * 日本語を含むかチェック
 */
export function containsJapanese(text: string): boolean {
  // ひらがな、カタカナ、漢字をチェック
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(text)
}

/**
 * 対応言語かチェック
 */
export function isSupportedLang(lang: string): lang is 'en' | 'zh' | 'ko' {
  return ['en', 'zh', 'ko'].includes(lang)
}

/**
 * 言語コードから言語名を取得
 */
export function getLangName(lang: string): string {
  const names: Record<string, string> = {
    en: 'English',
    zh: 'Chinese (Simplified)',
    ko: 'Korean',
  }
  return names[lang] || lang
}
