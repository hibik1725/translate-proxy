# translate-proxy

翻訳プロキシサーバー。Hono + Cloudflare Workers で構築。

## デプロイ先

- **URL**: <https://translate-proxy.hbtatsu.workers.dev>
- **Platform**: Cloudflare Workers

## エンドポイント

### ヘルスチェック

```bash
curl https://translate-proxy.hbtatsu.workers.dev/health
```

レスポンス:

```json
{
  "status": "ok",
  "timestamp": "2025-12-09T07:29:22.892Z"
}
```

### ルート

```bash
curl https://translate-proxy.hbtatsu.workers.dev/
```

レスポンス:

```json
{
  "name": "translate-proxy",
  "status": "ok from cloudFlare workers"
}
```

## 開発

```bash
# ローカル開発
pnpm dev

# デプロイ
pnpm deploy
```
