import type { KVNamespace } from '../types/env'
import { CachedTranslatorService } from './cached-translator'
import { JsTextExtractorService } from './js-text-extractor'
import { JsTextReplacerService } from './js-text-replacer'
import type { OpenAIClient } from './openai-translator'
import type { SupportedLang } from './translate'

/**
 * Dependencies for JsTranslationOrchestratorService.
 */
export interface JsTranslationOrchestratorDeps {
  apiKey: string
  kv?: KVNamespace
  openAIClient?: OpenAIClient
}

/**
 * Service for orchestrating the translation of JavaScript files.
 * Extracts Japanese strings, translates them, and replaces in the original code.
 */
export class JsTranslationOrchestratorService {
  private readonly extractor: JsTextExtractorService
  private readonly replacer: JsTextReplacerService
  private readonly translator: CachedTranslatorService

  /**
   * Creates a new JsTranslationOrchestratorService instance.
   * @param deps - Dependencies including API key and optional KV cache
   */
  constructor(deps: JsTranslationOrchestratorDeps) {
    this.extractor = new JsTextExtractorService()
    this.replacer = new JsTextReplacerService()
    this.translator = new CachedTranslatorService({
      apiKey: deps.apiKey,
      kv: deps.kv,
      client: deps.openAIClient,
    })
  }

  /**
   * Executes the translation of a JavaScript file.
   * @param jsCode - The original JavaScript code
   * @param targetLang - The target language for translation
   * @returns Translated JavaScript code
   */
  public async execute(
    jsCode: string,
    targetLang: SupportedLang,
  ): Promise<string> {
    // 1. Extract Japanese strings
    const japaneseStrings = this.extractor.execute(jsCode)

    // 2. If no Japanese strings, return original
    if (japaneseStrings.length === 0) {
      return jsCode
    }

    // 3. Translate strings
    const translations = await this.translator.execute(
      japaneseStrings,
      targetLang,
    )

    // 4. Replace strings in code
    return this.replacer.execute(jsCode, translations)
  }
}
