import { Hono } from 'hono'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../types/env'

// Mock the services before importing the route
const mockFetcherExecute = vi.fn()
const mockOrchestratorExecute = vi.fn()

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

vi.mock('../services/translation-orchestrator', () => {
  return {
    TranslationOrchestratorService: class MockTranslationOrchestratorService {
      execute = mockOrchestratorExecute
    },
  }
})

// Import after mocking
import { translateRoute } from './translate'

describe('translateRoute', () => {
  const createApp = (env: Partial<Env> = {}) => {
    const app = new Hono<{ Bindings: Env }>()
    app.route('/:lang', translateRoute)

    return {
      app,
      env: {
        ORIGIN_URL: 'https://example.com',
        OPENAI_API_KEY: 'test-api-key',
        ...env,
      } as Env,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockFetcherExecute.mockResolvedValue(
      '<html><body><p>こんにちは</p></body></html>',
    )
    mockOrchestratorExecute.mockResolvedValue(
      '<html><body><p>Hello</p></body></html>',
    )
  })

  describe('GET /:lang/*', () => {
    describe('成功系', () => {
      it('翻訳済みHTMLを返却できること', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/en/spikes', {}, env)

        // Assert
        expect(res.status).toBe(200)
        expect(res.headers.get('Content-Type')).toContain('text/html')
        const body = await res.text()
        expect(body).toContain('Hello')
      })

      it('ルートパスでも動作すること', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/en/', {}, env)

        // Assert
        expect(res.status).toBe(200)
      })
    })

    describe('失敗系', () => {
      it('サポート外言語で400エラーを返すこと', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/fr/page', {}, env)

        // Assert
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toContain('Unsupported language')
      })

      it('zhはサポートされていないため400エラーを返すこと', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/zh/page', {}, env)

        // Assert
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toBe('Unsupported language: zh')
      })

      it('koはサポートされていないため400エラーを返すこと', async () => {
        // Arrange
        const { app, env } = createApp()

        // Act
        const res = await app.request('/ko/page', {}, env)

        // Assert
        expect(res.status).toBe(400)
        const body = await res.json()
        expect(body.error).toBe('Unsupported language: ko')
      })

      it('ORIGIN_URL未設定で500エラーを返すこと', async () => {
        // Arrange
        const { app } = createApp()
        const env = { OPENAI_API_KEY: 'test' } as Env

        // Act
        const res = await app.request('/en/page', {}, env)

        // Assert
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.error).toContain('ORIGIN_URL')
      })

      it('OPENAI_API_KEY未設定で500エラーを返すこと', async () => {
        // Arrange
        const { app } = createApp()
        const env = { ORIGIN_URL: 'https://example.com' } as Env

        // Act
        const res = await app.request('/en/page', {}, env)

        // Assert
        expect(res.status).toBe(500)
        const body = await res.json()
        expect(body.error).toContain('OPENAI_API_KEY')
      })
    })
  })
})
