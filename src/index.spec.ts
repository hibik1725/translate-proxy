import { describe, it, expect } from 'vitest'
import app from './index'

describe('アプリケーション', () => {
  describe('/health', () => {
    describe('成功系', () => {
      it('ステータスokを返すこと', async () => {
        const res = await app.request('/health')
        expect(res.status).toBe(200)

        const json = await res.json()
        expect(json.status).toBe('ok from cloudflare')
      })

      it('タイムスタンプを含むこと', async () => {
        const res = await app.request('/health')
        const json = await res.json()
        expect(json.timestamp).toBeDefined()
        expect(typeof json.timestamp).toBe('string')
      })
    })
  })
})
