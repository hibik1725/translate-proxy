import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../types/env'

// Mock the services before importing the route
const mockFetcherExecute = vi.fn()

vi.mock('../services/origin-fetcher', () => {
  return {
    OriginFetcherService: class MockOriginFetcherService {
      execute = mockFetcherExecute
    },
    OriginFetchError: class OriginFetchError extends Error {
      statusCode?: number
      constructor(message: string, statusCode?: number) {
        super(message)
        this.name = 'OriginFetchError'
        this.statusCode = statusCode
      }
    },
  }
})

// Import after mocking
import { sitemapRoute } from './sitemap'

describe('sitemapRoute', () => {
  const createApp = (env: Partial<Env> = {}) => {
    const app = new Hono<{ Bindings: Env }>()
    app.route('/:lang', sitemapRoute)

    return {
      app,
      env: {
        ORIGIN_URL: 'https://picker-tf.com',
        OPENAI_API_KEY: 'test-api-key',
        ...env,
      } as Env,
    }
  }

  const sampleSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://picker-tf.com/</loc>
    <lastmod>2024-01-01</lastmod>
  </url>
  <url>
    <loc>https://picker-tf.com/spikes</loc>
    <lastmod>2024-01-02</lastmod>
  </url>
  <url>
    <loc>https://picker-tf.com/items/nike-zoom-mamba</loc>
    <lastmod>2024-01-03</lastmod>
  </url>
</urlset>`

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetcherExecute.mockResolvedValue(sampleSitemap)
  })

  describe('GET /:lang/sitemap.xml', () => {
    describe('成功系', () => {
      it('サイトマップのURLを言語プレフィックス付きに変換すること', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/en/sitemap.xml', {}, env)

        // Assert
        expect(res.status).toBe(200)
        const body = await res.text()
        expect(body).toContain('<loc>https://picker-tf.com/en/</loc>')
        expect(body).toContain('<loc>https://picker-tf.com/en/spikes</loc>')
        expect(body).toContain(
          '<loc>https://picker-tf.com/en/items/nike-zoom-mamba</loc>',
        )
      })

      it('Content-Typeがapplication/xmlであること', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/en/sitemap.xml', {}, env)

        // Assert
        expect(res.headers.get('Content-Type')).toContain('application/xml')
      })

      it('XMLフォーマットが正しいこと', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/en/sitemap.xml', {}, env)
        const body = await res.text()

        // Assert
        expect(body).toContain('<?xml version="1.0"')
        expect(body).toContain('<urlset')
        expect(body).toContain('</urlset>')
        expect(body).toContain('<url>')
        expect(body).toContain('</url>')
      })

      it('元のlastmodが保持されること', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/en/sitemap.xml', {}, env)
        const body = await res.text()

        // Assert
        expect(body).toContain('<lastmod>2024-01-01</lastmod>')
        expect(body).toContain('<lastmod>2024-01-02</lastmod>')
        expect(body).toContain('<lastmod>2024-01-03</lastmod>')
      })
    })

    describe('失敗系', () => {
      it('サポート外言語で400エラーを返すこと', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/fr/sitemap.xml', {}, env)

        // Assert
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toContain('Unsupported language')
      })

      it('ORIGIN_URL未設定で500エラーを返すこと', async () => {
        // Arrange
        const { app } = createApp()
        const env = { OPENAI_API_KEY: 'test' } as Env

        // Act
        const res = await app.request('/en/sitemap.xml', {}, env)

        // Assert
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.error).toContain('ORIGIN_URL')
      })

      it('オリジンサイトマップ取得失敗時に適切なエラーを返すこと', async () => {
        // Arrange
        const { OriginFetchError } = await import('../services/origin-fetcher')
        mockFetcherExecute.mockRejectedValueOnce(
          new OriginFetchError('Not Found', 404),
        )
        const { app, env } = createApp()

        // Act
        const res = await app.request('/en/sitemap.xml', {}, env)

        // Assert
        expect(res.status).toBe(404)
        const body = await res.json()
        expect(body.error).toContain('Failed to fetch sitemap')
      })
    })
  })
})
