/**
 * OpenAI Translator Service
 * Translates text using OpenAI API
 */

import OpenAI from 'openai'
import type { SupportedLang } from './translate'

/**
 * Translation error class
 */
export class TranslationError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'TranslationError'
  }
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
 * OpenAI client interface for dependency injection
 */
export interface OpenAIClient {
  chat: {
    completions: {
      create: (params: {
        model: string
        messages: ChatMessage[]
        temperature: number
      }) => Promise<{
        choices: Array<{ message: { content: string | null } }>
      }>
    }
  }
}

/**
 * Service for translating text using OpenAI API.
 */
export class OpenAITranslatorService {
  private readonly client: OpenAIClient

  /**
   * Creates a new OpenAITranslatorService instance.
   * @param apiKey - The OpenAI API key
   * @param client - Optional OpenAI client for testing
   */
  constructor(apiKey: string, client?: OpenAIClient) {
    this.client = client ?? (new OpenAI({ apiKey }) as unknown as OpenAIClient)
  }

  /**
   * Executes the translation operation for multiple texts.
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

    // Batch translate for efficiency
    const batchSize = 20
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      const batchTranslations = await this.translateBatch(batch, languageName)

      for (const [original, translated] of batchTranslations) {
        translations.set(original, translated)
      }
    }

    return translations
  }

  /**
   * Translates a batch of texts.
   * @param texts - The texts to translate
   * @param languageName - The target language name
   * @returns A Map of original text to translated text
   */
  private async translateBatch(
    texts: string[],
    languageName: string,
  ): Promise<Map<string, string>> {
    const translations = new Map<string, string>()

    try {
      const prompt = this.buildPrompt(texts, languageName)
      const response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate Japanese text to ${languageName}.
Return ONLY the translations in the exact same order as input, one per line.
Do not add any explanations, numbers, or extra formatting.
Preserve the meaning and tone of the original text.`,
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

      // Map translations back to original texts
      for (let i = 0; i < texts.length && i < translatedTexts.length; i++) {
        translations.set(texts[i], translatedTexts[i].trim())
      }

      return translations
    } catch (error) {
      if (error instanceof TranslationError) {
        throw error
      }
      throw new TranslationError('Failed to translate texts', error)
    }
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
