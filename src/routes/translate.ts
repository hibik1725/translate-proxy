import { Hono } from 'hono'
import { translatePage, type Env } from '../lib/translator/index.js'

const SUPPORTED_LANGS = ['en', 'zh', 'ko'] as const
type SupportedLang = (typeof SUPPORTED_LANGS)[number]

export const translateRoute = new Hono<{ Bindings: Env }>()

// /:lang/* へのリクエストを処理
translateRoute.get('/*', async (c) => {
  const lang = c.req.param('lang')

  // 対応言語チェック
  if (!lang || !SUPPORTED_LANGS.includes(lang as SupportedLang)) {
    return c.json({ error: `Unsupported language: ${lang}` }, 400)
  }

  // パスを取得（/:lang を除いた部分）
  const fullPath = c.req.path
  const pagePath = fullPath.replace(`/${lang}`, '') || '/'

  try {
    const html = await translatePage(pagePath, lang as string, c.env)

    return c.html(html, {
      headers: {
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Translation error:', error)
    return c.json({ error: 'Translation failed' }, 500)
  }
})
