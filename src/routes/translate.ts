import { Hono } from 'hono'
import {
  OriginFetchError,
  OriginFetcherService,
} from '../services/origin-fetcher'
import { isSupportedLang } from '../services/translate'
import { TranslationOrchestratorService } from '../services/translation-orchestrator'
import type { Env } from '../types/env'

/**
 * 翻訳ルートハンドラー
 * /:lang/* へのリクエストを処理し、オリジンからHTMLを取得して翻訳して返却する
 */
const translateRoute = new Hono<{ Bindings: Env }>()

/**
 * /:lang/* へのリクエストを処理
 * オリジンからHTMLを取得し、翻訳して返却する
 */
translateRoute.get('/*', async (c) => {
  const lang = c.req.param('lang')

  // Validate language
  if (!lang || !isSupportedLang(lang)) {
    return c.json({ error: `Unsupported language: ${lang}` }, 400)
  }

  // Get environment variables
  const originUrl = c.env.ORIGIN_URL
  const apiKey = c.env.OPENAI_API_KEY

  if (!originUrl) {
    return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
  }

  if (!apiKey) {
    return c.json({ error: 'OPENAI_API_KEY is not configured' }, 500)
  }

  // Extract the path after /:lang (e.g., /en/spikes -> /spikes)
  const fullPath = c.req.path
  const pathWithoutLang = fullPath.replace(`/${lang}`, '') || '/'

  try {
    // 1. Fetch HTML from origin
    const fetcher = new OriginFetcherService(originUrl)
    const html = await fetcher.execute(pathWithoutLang)

    // 2. Translate HTML
    const orchestrator = new TranslationOrchestratorService({ apiKey })
    const translatedHtml = await orchestrator.execute(html, lang)

    // 3. Return translated HTML
    return c.html(translatedHtml)
  } catch (error) {
    if (error instanceof OriginFetchError) {
      const status = error.statusCode || 502
      return c.json(
        {
          error: 'Failed to fetch from origin',
          message: error.message,
        },
        status as 400 | 404 | 500 | 502,
      )
    }

    console.error('Translation error:', error)
    return c.json(
      {
        error: 'Translation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

export { translateRoute }
