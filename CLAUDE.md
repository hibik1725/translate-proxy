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
- **Services**: ビジネスロジックを集約。テスト可能な単位で分割

### Serviceクラスの実装規約

Serviceは**クラスベース**で実装し、以下のルールに従うこと：

- **public メソッドは `execute` のみ**: 外部に公開するメソッドは `execute` のみとする
- **その他のメソッドは全て `private`**: 内部ロジックは全て private メソッドとして隠蔽する
- コンストラクタで依存関係を注入する

```typescript
/**
 * Service for translating text using external API.
 */
export class TranslationService {
  /**
   * Creates a new TranslationService instance.
   * @param apiKey - The API key for the translation service
   */
  constructor(private readonly apiKey: string) {}

  /**
   * Executes the translation operation.
   * @param text - The text to translate
   * @param targetLang - The target language code (en, zh, ko)
   * @returns The translated text
   * @throws {TranslationError} When the translation API fails
   */
  public async execute(text: string, targetLang: string): Promise<string> {
    this.validateInput(text)
    const normalizedText = this.normalizeText(text)
    return this.callTranslationApi(normalizedText, targetLang)
  }

  /**
   * Validates the input text.
   * @param text - The text to validate
   * @throws {ValidationError} When the text is empty
   */
  private validateInput(text: string): void {
    if (!text.trim()) {
      throw new ValidationError('Text cannot be empty')
    }
  }

  /**
   * Normalizes the input text.
   * @param text - The text to normalize
   * @returns The normalized text
   */
  private normalizeText(text: string): string {
    return text.trim()
  }

  /**
   * Calls the translation API.
   * @param text - The text to translate
   * @param targetLang - The target language code
   * @returns The translated text
   */
  private async callTranslationApi(text: string, targetLang: string): Promise<string> {
    // API call implementation
  }
}
```

**使用例:**

```typescript
const service = new TranslationService(env.OPENAI_API_KEY)
const result = await service.execute('こんにちは', 'en')
```

## コーディング規約

### ファイル配置

- **コロケーション**: 全てのファイルはコロケーションで配置すること
- 関連するファイル（実装・テスト）は同じディレクトリに配置する
- テストファイルは対象ファイルと同じディレクトリに `*.spec.ts` として配置する

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
- **全てのファイルに必ずテストを書くこと**
- テストファイルは `*.spec.ts` の命名規則
- カバレッジ目標: 80%以上

```
src/
├── services/
│   ├── translation.ts
│   └── translation.spec.ts
├── lib/
│   ├── cache.ts
│   └── cache.spec.ts
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
