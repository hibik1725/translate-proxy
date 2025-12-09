import { describe, it, expect } from 'vitest'
import app from '../index'

describe('翻訳ルート', () => {
  describe('GET /:lang/*', () => {
    describe('成功系', () => {
      it('英語の翻訳結果を返すこと', async () => {
        const res = await app.request('/en/test')
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json.original).toBe('こんにちは世界')
        expect(json.translated).toBe('[English] こんにちは世界')
        expect(json.lang).toBe('en')
      })
    })

    describe('失敗系', () => {
      it('サポートされていない言語の場合400エラーを返すこと', async () => {
        const res = await app.request('/fr/test')
        expect(res.status).toBe(400)

        const json = await res.json()
        expect(json.error).toBe('Unsupported language: fr')
      })

      it('zh はサポートされていないため400エラーを返すこと', async () => {
        const res = await app.request('/zh/test')
        expect(res.status).toBe(400)

        const json = await res.json()
        expect(json.error).toBe('Unsupported language: zh')
      })

      it('ko はサポートされていないため400エラーを返すこと', async () => {
        const res = await app.request('/ko/test')
        expect(res.status).toBe(400)

        const json = await res.json()
        expect(json.error).toBe('Unsupported language: ko')
      })
    })
  })
})
