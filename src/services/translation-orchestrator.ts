/**
 * Translation Orchestrator Service
 * Orchestrates the entire translation process
 */

import type { KVNamespace } from '../types/env'
import { CachedTranslatorService } from './cached-translator'
import { HtmlParserService } from './html-parser'
import { HtmlSerializerService } from './html-serializer'
import type { OpenAIClient } from './openai-translator'
import { TextExtractorService } from './text-extractor'
import { TextReplacerService } from './text-replacer'
import type { SupportedLang } from './translate'

/**
 * Dependencies for TranslationOrchestratorService
 */
export interface TranslationOrchestratorDeps {
  apiKey: string
  openAIClient?: OpenAIClient
  kv?: KVNamespace
}

/**
 * Service for orchestrating the entire translation process.
 * Combines parsing, extraction, translation, replacement, and serialization.
 */
export class TranslationOrchestratorService {
  private readonly parser: HtmlParserService
  private readonly extractor: TextExtractorService
  private readonly replacer: TextReplacerService
  private readonly serializer: HtmlSerializerService
  private readonly translator: CachedTranslatorService

  /**
   * Creates a new TranslationOrchestratorService instance.
   * @param deps - The dependencies for the service
   */
  constructor(deps: TranslationOrchestratorDeps) {
    this.parser = new HtmlParserService()
    this.extractor = new TextExtractorService()
    this.replacer = new TextReplacerService()
    this.serializer = new HtmlSerializerService()
    this.translator = new CachedTranslatorService({
      apiKey: deps.apiKey,
      client: deps.openAIClient,
      kv: deps.kv,
    })
  }

  /**
   * Executes the translation process.
   * @param html - The HTML string to translate
   * @param targetLang - The target language code
   * @returns The translated HTML string
   */
  public async execute(
    html: string,
    targetLang: SupportedLang,
  ): Promise<string> {
    // 1. Parse HTML to HAST
    const hast = this.parser.execute(html)

    // 2. Extract Japanese texts
    const texts = this.extractor.getUniqueTexts(hast)

    // 3. If no Japanese texts, return original HTML
    if (texts.length === 0) {
      return html
    }

    // 4. Translate texts
    const translations = await this.translator.execute(texts, targetLang)

    // 5. Replace texts in HAST
    const translatedHast = this.replacer.execute(hast, translations)

    // 6. Serialize HAST to HTML
    return this.serializer.execute(translatedHast)
  }
}
