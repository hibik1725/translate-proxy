# translate-proxy Constitution

## Core Principles

### I. Framework Agnostic

翻訳プロキシはフレームワークに依存しない形で実装する。
- Hono + Cloudflare Workers で構築
- 呼び出し元（Vercel、Next.js等）に依存しない
- どのフロントエンドからも利用可能

### II. Service Pattern

全てのビジネスロジックはServiceクラスに集約する。
- public メソッドは `execute` のみ
- その他は全て private メソッド
- ルートハンドラーはHTTPの処理のみ

### III. Test-First

テスト駆動開発を遵守する。
- 全てのファイルにテストを書く
- describe/it は日本語で「〜こと」形式
- 成功系と失敗系でdescribeを分ける
- カバレッジ目標: 80%以上

### IV. AST-Based Translation

HTMLの翻訳はAST変換で行う。
- parse5でHTMLをパース
- hastでAST操作
- テキストノードのみを翻訳対象とする

### V. Caching Strategy

2層キャッシュで効率化する。
- L1: Vercel Edge Cache（ページ単位、1時間）
- L2: Cloudflare KV（テキスト単位、永続）
- OpenAI APIコールを最小化

## SEO Requirements

### hreflang対応

- `<html lang="en">` を設定
- hreflangタグを挿入（ja, en, x-default）
- canonicalタグを適切に設定

### サイトマップ

- `/en/sitemap.xml` を生成
- オリジンのsitemap.xmlをベースに変換

## Technology Stack

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **HTML Parser**: parse5, hast
- **Translation**: OpenAI API
- **Cache**: Cloudflare KV
- **Testing**: Vitest

## Governance

- この規約は全ての実装に優先する
- 変更には文書化と承認が必要

**Version**: 1.0.0 | **Ratified**: 2024-12-09
