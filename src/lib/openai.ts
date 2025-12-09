import OpenAI from 'openai'
import { getLangName } from './utils.js'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * OpenAI APIでテキストを一括翻訳
 */
export async function translateWithOpenAI(
  texts: string[],
  targetLang: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  if (texts.length === 0) {
    return result
  }

  const langName = getLangName(targetLang)

  // バッチ処理（一度に最大50テキスト）
  const batchSize = 50
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize)
    const translations = await translateBatch(batch, langName)

    translations.forEach((translated, original) => {
      result.set(original, translated)
    })
  }

  return result
}

async function translateBatch(
  texts: string[],
  langName: string
): Promise<Map<string, string>> {
  const result = new Map<string, string>()

  const prompt = `Translate the following Japanese texts to ${langName}.
Return ONLY a JSON array of translated strings in the same order.
Do not add any explanation or formatting.

Texts to translate:
${JSON.stringify(texts, null, 2)}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate Japanese to ${langName} accurately and naturally. Preserve any HTML entities, numbers, and special characters. Return only the JSON array of translations.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      console.error('Empty response from OpenAI')
      return result
    }

    // JSONをパース
    const parsed = JSON.parse(content)
    const translations: string[] = parsed.translations || parsed

    if (Array.isArray(translations) && translations.length === texts.length) {
      texts.forEach((original, index) => {
        result.set(original, translations[index])
      })
    } else {
      console.error('Translation count mismatch:', {
        expected: texts.length,
        received: translations?.length,
      })
    }
  } catch (error) {
    console.error('OpenAI translation error:', error)
  }

  return result
}
