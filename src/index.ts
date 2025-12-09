import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { translateRoute } from './routes/translate.js'

const app = new Hono()

// ミドルウェア
app.use('*', logger())

// トップページ
app.get('/', (c) => {
  return c.json({
    name: 'translate-proxy',
    status: 'ok',
    usage: {
      '/en/*': 'English translation',
      '/zh/*': 'Chinese translation',
      '/ko/*': 'Korean translation',
    },
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

const port = Number(process.env.PORT) || 3001

console.log(`🚀 translate-proxy running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})
