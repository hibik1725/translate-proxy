import { Hono } from 'hono'
import { sitemapRoute } from './routes/sitemap'
import { translateRoute } from './routes/translate'
import { CachedTranslatorService } from './services/cached-translator'
import { containsJapanese } from './services/html-utils'
import { JsTranslationOrchestratorService } from './services/js-translation-orchestrator'
import { JsonTranslationService } from './services/json-translation'
import { isSupportedLang, type SupportedLang } from './services/translate'
import type { Env } from './types/env'

/**
 * メインアプリケーション
 * Honoフレームワークで構築された翻訳プロキシサーバー
 */
const app = new Hono<{ Bindings: Env }>()

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({
    status: 'ok from cloudflare',
    timestamp: new Date().toISOString(),
  })
})

/**
 * Extracts language code from Referer header.
 * @param referer - The Referer header value
 * @returns The language code if found, otherwise null
 */
function extractLangFromReferer(
  referer: string | null | undefined,
): SupportedLang | null {
  if (!referer) return null

  try {
    const url = new URL(referer)
    const pathParts = url.pathname.split('/')
    // Path format: /en/... or /zh/... or /ko/...
    if (pathParts.length >= 2) {
      const potentialLang = pathParts[1]
      if (isSupportedLang(potentialLang)) {
        return potentialLang
      }
    }
  } catch {
    // Invalid URL
  }
  return null
}

// _next/data JSONの翻訳（言語プレフィックス付きパスから）
app.get('/_next/data/*/:lang/*', async (c) => {
  const lang = c.req.param('lang')

  // 言語コードでない場合はスキップ（次のルートへ）
  if (!lang || !isSupportedLang(lang)) {
    const originUrl = c.env.ORIGIN_URL
    if (!originUrl) {
      return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
    }
    const response = await fetch(`${originUrl}${c.req.path}`)
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    })
  }

  const originUrl = c.env.ORIGIN_URL
  const apiKey = c.env.OPENAI_API_KEY

  if (!originUrl) {
    return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
  }
  if (!apiKey) {
    return c.json({ error: 'OPENAI_API_KEY is not configured' }, 500)
  }

  // Remove lang prefix from path for origin request
  // e.g., /_next/data/xxx/en/track-and-field/items/id.json -> /_next/data/xxx/track-and-field/items/id.json
  const pathParts = c.req.path.split('/')
  const langIndex = pathParts.indexOf(lang)
  if (langIndex !== -1) {
    pathParts.splice(langIndex, 1)
  }
  const originPath = pathParts.join('/')

  try {
    const response = await fetch(`${originUrl}${originPath}`)
    if (!response.ok) {
      return new Response(response.body, {
        status: response.status,
        headers: response.headers,
      })
    }

    const jsonData: unknown = await response.json()

    // Extract Japanese texts using JsonTranslationService
    const jsonTranslationService = new JsonTranslationService()
    const uniqueTexts = jsonTranslationService.extractJapaneseStrings(jsonData)

    if (uniqueTexts.length === 0) {
      return c.json(jsonData)
    }

    // Translate
    const translator = new CachedTranslatorService({
      apiKey,
      kv: c.env.TRANSLATION_CACHE,
    })
    const translations = await translator.execute(uniqueTexts, lang)

    // Replace using JsonTranslationService
    const translatedData = jsonTranslationService.replaceTranslations(
      jsonData,
      translations,
    )

    return c.json(translatedData)
  } catch (error) {
    console.error('JSON translation error:', error)
    return c.json(
      { error: 'JSON translation failed', message: String(error) },
      500,
    )
  }
})

// 静的ファイルプロキシ（_next/static, favicon等をオリジンに転送）
// JSファイルの場合は日本語を翻訳してから返す
app.get('/_next/static/*', async (c) => {
  const originUrl = c.env.ORIGIN_URL
  if (!originUrl) {
    return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
  }

  const response = await fetch(`${originUrl}${c.req.path}`)

  // Check if this is a JS file that needs translation
  const isJsFile = c.req.path.endsWith('.js')
  const referer = c.req.header('Referer')
  const lang = extractLangFromReferer(referer)
  const apiKey = c.env.OPENAI_API_KEY

  // Only translate JS files when we have a language from referer and API key
  if (isJsFile && lang && apiKey && response.ok) {
    try {
      const jsCode = await response.text()

      // Check if the JS contains Japanese characters (including Unicode escapes)
      const hasJapanese =
        containsJapanese(jsCode) ||
        /\\u3[0-9a-fA-F]{3}|\\u4[eE][0-9a-fA-F]{2}|\\u[5-9][0-9a-fA-F]{3}/.test(
          jsCode,
        )

      if (hasJapanese) {
        const orchestrator = new JsTranslationOrchestratorService({
          apiKey,
          kv: c.env.TRANSLATION_CACHE,
        })
        const translatedJs = await orchestrator.execute(jsCode, lang)

        return new Response(translatedJs, {
          status: response.status,
          headers: {
            'Content-Type': 'application/javascript; charset=utf-8',
            'Cache-Control': 'public, max-age=31536000, immutable',
          },
        })
      }

      // Return original JS with proper headers
      return new Response(jsCode, {
        status: response.status,
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    } catch (error) {
      console.error('JS translation error:', error)
      // Fall through to return original response
    }
  }

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
})

// _next/data (翻訳不要のもの) をプロキシ
app.get('/_next/data/*', async (c) => {
  const originUrl = c.env.ORIGIN_URL
  if (!originUrl) {
    return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
  }
  const response = await fetch(`${originUrl}${c.req.path}`)
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
})

// その他の静的ファイルプロキシ
app.get('/favicon.ico', async (c) => {
  const originUrl = c.env.ORIGIN_URL
  if (!originUrl) {
    return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
  }
  const response = await fetch(`${originUrl}/favicon.ico`)
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
})

app.get('/:file{.+\\.svg$}', async (c) => {
  const originUrl = c.env.ORIGIN_URL
  if (!originUrl) {
    return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
  }
  const response = await fetch(`${originUrl}${c.req.path}`)
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
})

// 画像ファイルプロキシ（jpg, png, gif, webp）
app.get('/*/:file{.+\\.(jpg|jpeg|png|gif|webp)$}', async (c) => {
  const originUrl = c.env.ORIGIN_URL
  if (!originUrl) {
    return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
  }
  const response = await fetch(`${originUrl}${c.req.path}`)
  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  })
})

// サイトマップルート（翻訳ルートより先に登録）
app.route('/:lang', sitemapRoute)

// 翻訳ルート
app.route('/:lang', translateRoute)

export default app
