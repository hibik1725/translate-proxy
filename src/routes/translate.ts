import { Hono } from 'hono'

const translateRoute = new Hono()

// /:lang/* へのリクエストを処理
translateRoute.get('/*', async (c) => {
  const lang = c.req.param('lang')
  const path = c.req.path

  return c.json({
    message: 'translate endpoint',
    lang,
    path,
  })
})

export { translateRoute }
