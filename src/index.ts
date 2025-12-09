import { Hono } from 'hono'
import { sitemapRoute } from './routes/sitemap'
import { translateRoute } from './routes/translate'
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

// サイトマップルート（翻訳ルートより先に登録）
app.route('/:lang', sitemapRoute)

// 翻訳ルート
app.route('/:lang', translateRoute)

export default app
