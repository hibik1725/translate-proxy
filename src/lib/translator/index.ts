import { parseHtml, serializeHtml } from './parser.js'
import { extractTexts } from './extractor.js'
import { replaceTexts, rewriteInternalLinks, setLangAttribute } from './replacer.js'
import { getTranslations } from '../cache.js'

const ORIGIN_URL = process.env.ORIGIN_URL || 'http://localhost:3000'

/**
 * ページを翻訳する
 */
export async function translatePage(path: string, lang: string): Promise<string> {
  console.log(`Translating ${path} to ${lang}...`)

  // 1. オリジンからHTML取得
  const originUrl = `${ORIGIN_URL}${path}`
  const response = await fetch(originUrl)

  if (!response.ok) {
    throw new Error(`Failed to fetch origin: ${response.status} ${response.statusText}`)
  }

  const html = await response.text()

  // 2. HTMLをASTにパース
  const ast = parseHtml(html)

  // 3. テキストノード抽出
  const textNodes = extractTexts(ast)
  const uniqueTexts = [...new Set(textNodes.map((n) => n.value))]

  console.log(`Found ${uniqueTexts.length} unique Japanese texts`)

  // 4. 翻訳取得（キャッシュ or OpenAI）
  const translations = await getTranslations(uniqueTexts, lang)

  // 5. ASTに翻訳テキストを差し替え
  replaceTexts(textNodes, translations)

  // 6. 内部リンクに言語プレフィックスを追加
  rewriteInternalLinks(ast, lang)

  // 7. html要素のlang属性を設定
  setLangAttribute(ast, lang)

  // 8. HTMLにシリアライズして返却
  return serializeHtml(ast)
}
