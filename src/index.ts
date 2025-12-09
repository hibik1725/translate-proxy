import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { translateRoute } from './routes/translate.js'
import type { Env } from './lib/translator/index.js'

const app = new Hono<{ Bindings: Env }>()

// ミドルウェア
app.use('*', logger())

// トップページ
app.get('/', (c) => {
  return c.json({
    name: 'translate-proxy',
    status: 'ok from cloudFlare workers',
  })
})

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})

// 翻訳ルート
app.route('/:lang', translateRoute)

export default app
