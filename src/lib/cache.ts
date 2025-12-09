import { translateWithOpenAI } from './openai.js'
import { hashText } from './utils.js'

// インメモリキャッシュ（開発用）
// TODO: Upstash Redis を使った永続キャッシュを実装
const memoryCache = new Map<string, string>()

/**
 * 翻訳を取得（キャッシュ優先）
 */
export async function getTranslations(
  texts: string[],
  lang: string,
  apiKey: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  const uncached: string[] = []

  // キャッシュから取得
  for (const text of texts) {
    const hash = await hashText(text)
    const cacheKey = `${lang}:${hash}`
    const cached = memoryCache.get(cacheKey)

    if (cached) {
      result.set(text, cached)
    } else {
      uncached.push(text)
    }
  }

  // キャッシュにないものをOpenAIで翻訳
  if (uncached.length > 0) {
    console.log(`Translating ${uncached.length} new texts to ${lang}...`)

    const newTranslations = await translateWithOpenAI(uncached, lang, apiKey)

    // キャッシュに保存
    for (const [original, translated] of newTranslations) {
      const hash = await hashText(original)
      const cacheKey = `${lang}:${hash}`
      memoryCache.set(cacheKey, translated)
      result.set(original, translated)
    }
  }

  return result
}

/**
 * キャッシュをクリア
 */
export function clearCache(): void {
  memoryCache.clear()
}

/**
 * キャッシュの統計を取得
 */
export function getCacheStats(): { size: number } {
  return { size: memoryCache.size }
}
