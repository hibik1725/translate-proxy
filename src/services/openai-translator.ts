/**
 * OpenAI Translator Service
 * Translates text using OpenAI API with retry and fallback support
 */

import OpenAI from 'openai'
import type { SupportedLang } from './translate'

/**
 * Translation error class
 */
export class TranslationError extends Error {
  constructor(
    message: string,
    public override readonly cause?: Error,
  ) {
    super(message)
    this.name = 'TranslationError'
  }
}

/**
 * Retry configuration
 */
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Base delay in milliseconds for exponential backoff */
  baseDelayMs: number
  /** Maximum delay in milliseconds */
  maxDelayMs: number
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
}

/**
 * Delays execution for the specified duration.
 * @param ms - Delay in milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculates exponential backoff delay with jitter.
 * @param attempt - Current attempt number (0-based)
 * @param config - Retry configuration
 * @returns Delay in milliseconds
 */
function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  const exponentialDelay = config.baseDelayMs * 2 ** attempt
  const jitter = Math.random() * 0.3 * exponentialDelay
  return Math.min(exponentialDelay + jitter, config.maxDelayMs)
}

/**
 * Checks if an error is retryable.
 * @param error - The error to check
 * @returns True if the error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    // Retry on rate limits, timeouts, and server errors
    return (
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('429') ||
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    )
  }
  return false
}

/**
 * Language names for prompts
 */
const LANGUAGE_NAMES: Record<SupportedLang, string> = {
  en: 'English',
}

/**
 * Chat completion message type
 */
interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/**
 * Chat completion response type
 */
interface ChatCompletionResponse {
  choices: Array<{ message: { content: string | null } }>
}

/**
 * OpenAI client interface for dependency injection
 */
export interface OpenAIClient {
  chat: {
    completions: {
      create: (params: {
        model: string
        messages: ChatMessage[]
        temperature: number
      }) => Promise<ChatCompletionResponse>
    }
  }
}

/**
 * Creates an OpenAI client wrapper from the OpenAI SDK.
 * This function bridges the OpenAI SDK types with our internal interface.
 * @param apiKey - The OpenAI API key
 * @returns OpenAI client wrapper
 */
function createOpenAIClient(apiKey: string): OpenAIClient {
  const openai = new OpenAI({ apiKey })

  return {
    chat: {
      completions: {
        create: async (params: {
          model: string
          messages: ChatMessage[]
          temperature: number
        }): Promise<ChatCompletionResponse> => {
          const response = await openai.chat.completions.create({
            model: params.model,
            messages: params.messages,
            temperature: params.temperature,
          })
          return {
            choices: response.choices.map((choice) => ({
              message: { content: choice.message.content },
            })),
          }
        },
      },
    },
  }
}

/**
 * Options for OpenAITranslatorService
 */
export interface TranslatorOptions {
  /** Whether to use fallback (return original text) on failure */
  useFallback?: boolean
  /** Retry configuration */
  retryConfig?: Partial<RetryConfig>
  /** Maximum concurrent batch translations (default: 3) */
  maxConcurrency?: number
  /** Whether to include context in translation prompts (default: true) */
  useContext?: boolean
}

/**
 * Service for translating text using OpenAI API.
 */
export class OpenAITranslatorService {
  private readonly client: OpenAIClient
  private readonly useFallback: boolean
  private readonly retryConfig: RetryConfig
  private readonly maxConcurrency: number
  private readonly useContext: boolean

  /**
   * Creates a new OpenAITranslatorService instance.
   * @param apiKey - The OpenAI API key
   * @param client - Optional OpenAI client for testing
   * @param options - Optional configuration options
   */
  constructor(
    apiKey: string,
    client?: OpenAIClient,
    options?: TranslatorOptions,
  ) {
    this.client = client ?? createOpenAIClient(apiKey)
    this.useFallback = options?.useFallback ?? true
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      ...options?.retryConfig,
    }
    this.maxConcurrency = options?.maxConcurrency ?? 3
    this.useContext = options?.useContext ?? true
  }

  /**
   * Executes the translation operation for multiple texts.
   * Uses parallel batch processing with concurrency limit.
   * @param texts - The texts to translate
   * @param targetLang - The target language code
   * @returns A Map of original text to translated text
   */
  public async execute(
    texts: string[],
    targetLang: SupportedLang,
  ): Promise<Map<string, string>> {
    if (texts.length === 0) {
      return new Map()
    }

    const translations = new Map<string, string>()
    const languageName = LANGUAGE_NAMES[targetLang]

    // Build context from all texts (sample for context-aware translation)
    const contextSample = this.useContext
      ? this.buildContextSample(texts)
      : undefined

    // Split texts into batches
    const batchSize = 20
    const batches: string[][] = []
    for (let i = 0; i < texts.length; i += batchSize) {
      batches.push(texts.slice(i, i + batchSize))
    }

    // Process batches in parallel with concurrency limit
    const results = await this.processWithConcurrency(
      batches,
      (batch) =>
        this.translateBatchWithRetry(batch, languageName, contextSample),
      this.maxConcurrency,
    )

    // Merge all results
    for (const batchTranslations of results) {
      for (const [original, translated] of batchTranslations) {
        translations.set(original, translated)
      }
    }

    return translations
  }

  /**
   * Builds a context sample from all texts for consistent translation.
   * @param texts - All texts to translate
   * @returns A sample of texts as context (up to 10 items)
   */
  private buildContextSample(texts: string[]): string {
    const maxContextItems = 10
    const sample = texts.slice(0, maxContextItems)
    return sample.join('\n')
  }

  /**
   * Processes items in parallel with a concurrency limit.
   * @param items - Items to process
   * @param processor - Function to process each item
   * @param concurrency - Maximum number of concurrent operations
   * @returns Array of results in the same order as inputs
   */
  private async processWithConcurrency<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number,
  ): Promise<R[]> {
    const results: R[] = new Array(items.length)
    let currentIndex = 0

    const workers = Array.from(
      { length: Math.min(concurrency, items.length) },
      async () => {
        while (currentIndex < items.length) {
          const index = currentIndex++
          results[index] = await processor(items[index])
        }
      },
    )

    await Promise.all(workers)
    return results
  }

  /**
   * Translates a batch of texts with retry logic.
   * @param texts - The texts to translate
   * @param languageName - The target language name
   * @param contextSample - Optional context sample for consistent translation
   * @returns A Map of original text to translated text
   */
  private async translateBatchWithRetry(
    texts: string[],
    languageName: string,
    contextSample?: string,
  ): Promise<Map<string, string>> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.translateBatch(texts, languageName, contextSample)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // Only retry on retryable errors
        if (
          !isRetryableError(error) ||
          attempt === this.retryConfig.maxRetries
        ) {
          break
        }

        const delayMs = calculateBackoffDelay(attempt, this.retryConfig)
        console.warn(
          `Translation attempt ${attempt + 1} failed, retrying in ${delayMs}ms:`,
          lastError.message,
        )
        await delay(delayMs)
      }
    }

    // Fallback: return original texts if enabled
    if (this.useFallback) {
      console.error(
        'Translation failed, using fallback (original texts):',
        lastError?.message,
      )
      const fallbackTranslations = new Map<string, string>()
      for (const text of texts) {
        fallbackTranslations.set(text, text)
      }
      return fallbackTranslations
    }

    throw new TranslationError(
      'Failed to translate texts after retries',
      lastError,
    )
  }

  /**
   * Translates a batch of texts.
   * @param texts - The texts to translate
   * @param languageName - The target language name
   * @param contextSample - Optional context sample for consistent translation
   * @returns A Map of original text to translated text
   */
  private async translateBatch(
    texts: string[],
    languageName: string,
    contextSample?: string,
  ): Promise<Map<string, string>> {
    const translations = new Map<string, string>()

    const systemPrompt = this.buildSystemPrompt(languageName, contextSample)
    const prompt = this.buildPrompt(texts, languageName)
    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      throw new TranslationError('Empty response from OpenAI')
    }

    const translatedTexts = content.split('\n').filter((line) => line.trim())

    // Validate response count matches input
    if (translatedTexts.length !== texts.length) {
      console.warn(
        `Translation count mismatch: expected ${texts.length}, got ${translatedTexts.length}`,
      )
    }

    // Map translations back to original texts
    for (let i = 0; i < texts.length; i++) {
      const translated = translatedTexts[i]?.trim()
      if (translated) {
        translations.set(texts[i], translated)
      } else if (this.useFallback) {
        // Use original text as fallback for missing translations
        translations.set(texts[i], texts[i])
      }
    }

    return translations
  }

  /**
   * Builds the system prompt for translation.
   * @param languageName - The target language name
   * @param contextSample - Optional context sample for consistent translation
   * @returns The formatted system prompt
   */
  private buildSystemPrompt(
    languageName: string,
    contextSample?: string,
  ): string {
    let prompt = `You are a professional translator. Translate Japanese text to ${languageName}.
Return ONLY the translations in the exact same order as input, one per line.
Do not add any explanations, numbers, or extra formatting.
Preserve the meaning and tone of the original text.`

    if (contextSample) {
      prompt += `

IMPORTANT: Maintain consistency in terminology throughout the translation.
Here are sample texts from the same page for context:
---
${contextSample}
---
Use consistent translations for repeated terms and maintain the same style.`
    }

    return prompt
  }

  /**
   * Builds the prompt for translation.
   * @param texts - The texts to translate
   * @param languageName - The target language name
   * @returns The formatted prompt
   */
  private buildPrompt(texts: string[], languageName: string): string {
    return `Translate the following Japanese texts to ${languageName}. Return one translation per line:\n\n${texts.join('\n')}`
  }
}
