import { Hono } from 'hono'

const app = new Hono()

// ヘルスチェック
app.get('/health', (c) => {
  return c.json({
    status: 'ok from cloudflare',
    timestamp: new Date().toISOString(),
  })
})

export default app
