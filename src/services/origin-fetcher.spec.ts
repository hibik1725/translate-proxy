import { describe, expect, it, vi } from 'vitest'
import { OriginFetchError, OriginFetcherService } from './origin-fetcher'

describe('OriginFetcherService', () => {
  describe('execute', () => {
    describe('成功系', () => {
      it('HTMLを取得できること', async () => {
        // Arrange
        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html><body>Test</body></html>'),
        })
        const service = new OriginFetcherService(
          'https://example.com',
          mockFetch,
        )

        // Act
        const result = await service.execute('/page')

        // Assert
        expect(result).toBe('<html><body>Test</body></html>')
        expect(mockFetch).toHaveBeenCalledWith('https://example.com/page', {
          headers: {
            Accept: 'text/html',
            'User-Agent': 'translate-proxy/1.0',
          },
        })
      })

      it('末尾スラッシュのあるURLを正しく処理すること', async () => {
        // Arrange
        const mockFetch = vi.fn().mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('<html></html>'),
        })
        const service = new OriginFetcherService(
          'https://example.com/',
          mockFetch,
        )

        // Act
        await service.execute('/page')

        // Assert
        expect(mockFetch).toHaveBeenCalledWith(
          'https://example.com/page',
          expect.anything(),
        )
      })
    })

    describe('失敗系', () => {
      it('404時に適切なエラーを返すこと', async () => {
        // Arrange
        const mockFetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
        const service = new OriginFetcherService(
          'https://example.com',
          mockFetch,
        )

        // Act & Assert
        await expect(service.execute('/not-found')).rejects.toThrow(
          OriginFetchError,
        )
        await expect(service.execute('/not-found')).rejects.toThrow('404')
      })

      it('500時に適切なエラーを返すこと', async () => {
        // Arrange
        const mockFetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
        const service = new OriginFetcherService(
          'https://example.com',
          mockFetch,
        )

        // Act & Assert
        await expect(service.execute('/error')).rejects.toThrow(
          OriginFetchError,
        )
        await expect(service.execute('/error')).rejects.toThrow('500')
      })

      it('ネットワークエラー時に適切なエラーを返すこと', async () => {
        // Arrange
        const mockFetch = vi
          .fn()
          .mockRejectedValueOnce(new Error('Network error'))
        const service = new OriginFetcherService(
          'https://example.com',
          mockFetch,
        )

        // Act & Assert
        await expect(service.execute('/page')).rejects.toThrow(OriginFetchError)
        await expect(service.execute('/page')).rejects.toThrow(
          'Network error while fetching from origin',
        )
      })

      it('エラーにステータスコードが含まれること', async () => {
        // Arrange
        const mockFetch = vi.fn().mockResolvedValue({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        })
        const service = new OriginFetcherService(
          'https://example.com',
          mockFetch,
        )

        // Act & Assert
        try {
          await service.execute('/forbidden')
        } catch (error) {
          expect(error).toBeInstanceOf(OriginFetchError)
          expect((error as OriginFetchError).statusCode).toBe(403)
        }
      })
    })
  })
})

describe('OriginFetchError', () => {
  it('エラー名がOriginFetchErrorであること', () => {
    const error = new OriginFetchError('test error')
    expect(error.name).toBe('OriginFetchError')
  })

  it('ステータスコードを保持できること', () => {
    const error = new OriginFetchError('test error', 404)
    expect(error.statusCode).toBe(404)
  })

  it('causeを保持できること', () => {
    const cause = new Error('original error')
    const error = new OriginFetchError('test error', undefined, cause)
    expect(error.cause).toBe(cause)
  })
})
