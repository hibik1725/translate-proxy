/**
 * Sitemap route handler
 * Generates translated sitemaps by transforming the original sitemap URLs
 */

import { Hono } from 'hono'
import {
  OriginFetchError,
  OriginFetcherService,
} from '../services/origin-fetcher'
import { isSupportedLang } from '../services/translate'
import type { Env } from '../types/env'

/**
 * Sitemap route handler
 * /:lang/sitemap.xml へのリクエストを処理し、翻訳版サイトマップを生成する
 */
const sitemapRoute = new Hono<{ Bindings: Env }>()

/**
 * /:lang/sitemap.xml へのリクエストを処理
 * オリジンからサイトマップを取得し、URLを言語プレフィックス付きに変換して返却する
 */
sitemapRoute.get('/sitemap.xml', async (c) => {
  const lang = c.req.param('lang')

  // Validate language
  if (!lang || !isSupportedLang(lang)) {
    return c.json({ error: `Unsupported language: ${lang}` }, 400)
  }

  // Get environment variables
  const originUrl = c.env.ORIGIN_URL

  if (!originUrl) {
    return c.json({ error: 'ORIGIN_URL is not configured' }, 500)
  }

  try {
    // Fetch sitemap from origin
    const fetcher = new OriginFetcherService(originUrl)
    const originalSitemap = await fetcher.execute('/sitemap.xml')

    // Transform URLs in sitemap
    const transformedSitemap = transformSitemapUrls(
      originalSitemap,
      originUrl,
      lang,
    )

    // Return transformed sitemap
    return c.body(transformedSitemap, 200, {
      'Content-Type': 'application/xml; charset=utf-8',
    })
  } catch (error) {
    if (error instanceof OriginFetchError) {
      const status = error.statusCode || 502
      return c.json(
        {
          error: 'Failed to fetch sitemap from origin',
          message: error.message,
        },
        status as 400 | 404 | 500 | 502,
      )
    }

    console.error('Sitemap generation error:', error)
    return c.json(
      {
        error: 'Sitemap generation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    )
  }
})

/**
 * Transforms URLs in sitemap XML to include language prefix.
 * @param sitemap - The original sitemap XML
 * @param originUrl - The origin URL to match
 * @param lang - The language prefix to add
 * @returns The transformed sitemap XML
 */
function transformSitemapUrls(
  sitemap: string,
  originUrl: string,
  lang: string,
): string {
  // Normalize origin URL (remove trailing slash)
  const normalizedOrigin = originUrl.replace(/\/$/, '')

  // Match <loc> tags and transform URLs
  // Pattern: <loc>https://example.com/path</loc>
  const locPattern = new RegExp(
    `(<loc>)(${escapeRegExp(normalizedOrigin)})(/[^<]*|)(<\\/loc>)`,
    'gi',
  )

  return sitemap.replace(
    locPattern,
    (_match, openTag, _origin, path, closeTag) => {
      // Don't add language prefix to root sitemap references
      if (path === '/sitemap.xml' || path === '') {
        return `${openTag}${normalizedOrigin}/${lang}${path || '/'}${closeTag}`
      }
      return `${openTag}${normalizedOrigin}/${lang}${path}${closeTag}`
    },
  )
}

/**
 * Escapes special regex characters in a string.
 * @param str - The string to escape
 * @returns The escaped string
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export { sitemapRoute }
