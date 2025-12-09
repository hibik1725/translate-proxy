/**
 * Origin Fetcher Service
 * Fetches HTML from the origin server (picker-app)
 */

/**
 * Error class for origin fetcher errors
 */
export class OriginFetchError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'OriginFetchError'
  }
}

/**
 * Fetch function interface for dependency injection
 */
export type FetchFunction = typeof fetch

/**
 * Service for fetching HTML from the origin server.
 */
export class OriginFetcherService {
  private readonly originUrl: string
  private readonly fetchFn: FetchFunction

  /**
   * Creates a new OriginFetcherService instance.
   * @param originUrl - The base URL of the origin server
   * @param fetchFn - Optional fetch function for testing
   */
  constructor(originUrl: string, fetchFn?: FetchFunction) {
    this.originUrl = originUrl.replace(/\/$/, '') // Remove trailing slash
    this.fetchFn = fetchFn ?? fetch
  }

  /**
   * Executes the fetch operation.
   * @param path - The path to fetch (e.g., "/spikes")
   * @returns The HTML content
   */
  public async execute(path: string): Promise<string> {
    const url = `${this.originUrl}${path}`

    try {
      const response = await this.fetchFn(url, {
        headers: {
          Accept: 'text/html',
          'User-Agent': 'translate-proxy/1.0',
        },
      })

      if (!response.ok) {
        throw new OriginFetchError(
          `Failed to fetch from origin: ${response.status} ${response.statusText}`,
          response.status,
        )
      }

      const html = await response.text()
      return html
    } catch (error) {
      if (error instanceof OriginFetchError) {
        throw error
      }
      throw new OriginFetchError(
        'Network error while fetching from origin',
        undefined,
        error,
      )
    }
  }
}
