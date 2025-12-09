import { Hono } from 'hono'
import { isSupportedLang, translate } from '../services/translate'

/**
 * 翻訳ルートハンドラー
 * /:lang/* へのリクエストを処理し、指定言語でテキストを翻訳して返却する
 */
const translateRoute = new Hono()

/**
 * /:lang/* へのリクエストを処理
 * 指定された言語でテキストを翻訳して返却する
 */
translateRoute.get('/*', async (c) => {
  const lang = c.req.param('lang')

  if (!lang || !isSupportedLang(lang)) {
    return c.json({ error: `Unsupported language: ${lang}` }, 400)
  }

  const sampleText = 'こんにちは世界'
  const translated = translate(sampleText, lang)

  return c.json({
    original: sampleText,
    translated,
    lang,
  })
})

export { translateRoute }
