# CLAUDE.md

このファイルはClaude Codeがこのリポジトリで作業する際のガイダンスを提供します。

## プロジェクト概要

translate-proxyは、Hono + Cloudflare Workersで構築された翻訳プロキシサーバーです。

## アーキテクチャ

### Serviceパターン

このプロジェクトではServiceパターンを採用しています。

```
src/
├── index.ts              # エントリーポイント（Honoアプリ）
├── routes/               # ルートハンドラー（薄く保つ）
└── services/             # ビジネスロジック・ユーティリティ
```

- **Routes**: HTTPリクエスト/レスポンスの処理のみ。ビジネスロジックは含めない
- **Services**: ビジネスロジックを集約。テスト可能な単位で分割。ユーティリティ関数もここに含める

## コーディング規約

### JSDoc

全ての関数・クラス・型にJSDocを記述すること。JSDocは英語で記述してよい。

```typescript
/**
 * テキストを指定言語に翻訳する
 * @param text - 翻訳対象のテキスト
 * @param targetLang - 翻訳先の言語コード（en, zh, ko）
 * @returns 翻訳されたテキスト
 * @throws {TranslationError} 翻訳APIエラー時
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  // ...
}
```

### テスト

- テストフレームワーク: **Vitest**
- 全てのファイルにテストを書くこと
- テストファイルは `*.test.ts` の命名規則
- カバレッジ目標: 80%以上

```
src/
├── services/
│   ├── translation.ts
│   └── translation.test.ts
├── lib/
│   ├── cache.ts
│   └── cache.test.ts
```

### テストの書き方

- `describe` と `it` の中身は必ず**日本語**で記述すること
- 文体は「〜こと」で統一すること
- 成功系と失敗系で `describe` を分けて書くこと

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('TranslationService', () => {
  describe('translateText', () => {
    describe('成功系', () => {
      it('日本語を英語に翻訳できること', async () => {
        // Arrange
        // Act
        // Assert
      })

      it('キャッシュがある場合はキャッシュから返すこと', async () => {
        // Arrange
        // Act
        // Assert
      })
    })

    describe('失敗系', () => {
      it('APIエラー時にTranslationErrorをスローすること', async () => {
        // Arrange
        // Act
        // Assert
      })

      it('空文字の場合はエラーを返すこと', async () => {
        // Arrange
        // Act
        // Assert
      })
    })
  })
})
```

## コマンド

```bash
# 開発サーバー起動
pnpm dev

# テスト実行
pnpm test

# テスト（カバレッジ付き）
pnpm test:coverage

# デプロイ
pnpm deploy
```

## 環境変数

- `OPENAI_API_KEY` - OpenAI APIキー
- `ORIGIN_URL` - 翻訳対象のオリジンURL
