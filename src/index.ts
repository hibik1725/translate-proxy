import { Hono } from 'hono'
import { translateRoute } from './routes/translate'

/**
 * メインアプリケーション
 * Honoフレームワークで構築された翻訳プロキシサーバー
 */
const app = new Hono()

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({
    status: 'ok from cloudflare',
    timestamp: new Date().toISOString(),
  })
})

// 翻訳ルート
app.route('/:lang', translateRoute)

export default app
