/**
 * テキストのSHA256ハッシュを生成（翻訳メモリ検索用）
 * Cloudflare Workers互換のWeb Crypto APIを使用
 */
export async function hashText(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
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
