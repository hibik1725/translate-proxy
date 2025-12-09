# 翻訳プロキシ設計書

## 概要

picker-app（日本語サイト）を多言語対応するための翻訳プロキシシステムの設計ドキュメント。
既存のNext.jsアプリに変更を加えず、プロキシパターンで翻訳を実現する。

---

## アーキテクチャ

### 全体構成

```text
リクエスト: GET /en/spikes
          │
          ▼
┌─────────────────────────────────────────────────────┐
│                    Vercel                           │
│                                                     │
│  ┌──────────────────┐    ┌──────────────────────┐  │
│  │  picker-app      │    │  picker-proxy        │  │
│  │  (既存)          │◀───│  (新規)              │  │
│  │                  │    │                      │  │
│  │  /*  日本語      │    │  /en/*  英語         │  │
│  └──────────────────┘    └──────────────────────┘  │
│                                                     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
                 │  翻訳メモリDB    │
                 │  (Neon)         │
                 └─────────────────┘
```

### コンポーネント

| コンポーネント | 役割 | デプロイ先 |
|--------------|------|-----------|
| picker-app | 日本語HTMLを返すオリジンサーバー | Vercel（既存） |
| picker-proxy | 翻訳処理を行うプロキシサーバー | Vercel（新規プロジェクト） |
| 翻訳メモリDB | 翻訳結果の永続化 | Neon（既存流用） |
| キャッシュ | ページ単位のHTMLキャッシュ | Vercel KV |

---

## プロジェクト構成

### 採用: 別リポジトリ

```text
~/picker/           ← 既存（picker-app）
~/picker-proxy/     ← 新規リポジトリ（このプロジェクト）
```

---

## デプロイ・ルーティング設計

### Vercel rewrites によるルーティング

picker-appの `vercel.json` に追加:

```json
{
  "rewrites": [
    {
      "source": "/en/:path*",
      "destination": "https://picker-proxy.vercel.app/en/:path*"
    }
  ]
}
```

### リクエストフロー

```text
1. ユーザーが https://picker-tf.com/en/spikes にアクセス
2. Vercel rewrites により picker-proxy に転送
3. picker-proxy が https://picker-tf.com/spikes から日本語HTMLを取得
4. ASTパース → テキスト抽出 → 翻訳 → HTML再構築
5. 翻訳済みHTMLをレスポンス（+ キャッシュ保存）
```

---

## 翻訳実装（ASTベース）

### 使用ライブラリ

```bash
pnpm add parse5           # HTML5パーサー（W3C準拠）
pnpm add hast-util-from-parse5 hast-util-to-parse5
pnpm add unist-util-visit # ASTトラバーサル
pnpm add openai           # 翻訳API
```

### 処理フロー

```typescript
import { parse, serialize } from 'parse5';
import { fromParse5, toParse5 } from 'hast-util-from-parse5';
import { visit } from 'unist-util-visit';

async function translateHtml(html: string, targetLang: string): Promise<string> {
  // 1. HTMLをASTに変換
  const parse5Tree = parse(html);
  const hast = fromParse5(parse5Tree);

  // 2. テキストノードを収集
  const textNodes: { node: any; value: string }[] = [];

  visit(hast, 'text', (node, index, parent) => {
    if (shouldTranslate(parent)) {
      const trimmed = node.value.trim();
      if (trimmed && containsJapanese(trimmed)) {
        textNodes.push({ node, value: trimmed });
      }
    }
  });

  // 3. 翻訳対象テキストをバッチで抽出（重複除去）
  const textsToTranslate = [...new Set(textNodes.map(n => n.value))];

  // 4. 翻訳メモリ参照 + OpenAIで翻訳
  const translations = await translateTexts(textsToTranslate, targetLang);

  // 5. ASTのノードに翻訳結果を戻す
  textNodes.forEach(({ node, value }) => {
    const translated = translations.get(value);
    if (translated) {
      node.value = node.value.replace(value, translated);
    }
  });

  // 6. ASTをHTMLに戻す
  const outputTree = toParse5(hast);
  return serialize(outputTree);
}

// 翻訳対象外の要素を判定
function shouldTranslate(parent: any): boolean {
  const excludeTags = ['script', 'style', 'code', 'pre', 'noscript'];
  return !excludeTags.includes(parent?.tagName);
}

// 日本語を含むか判定
function containsJapanese(text: string): boolean {
  return /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/.test(text);
}
```

---

## キャッシュ戦略（2層構成）

### レイヤー構成

```text
リクエスト
    │
    ▼
┌─────────────────────────────┐
│  L1: Vercel KV (Redis)      │  ← 高速（ページ単位HTML）
│  TTL: 1時間                  │
└──────────────┬──────────────┘
               │ MISS
               ▼
┌─────────────────────────────┐
│  L2: Neon (PostgreSQL)      │  ← 永続（テキスト単位）
│  翻訳メモリ                   │
└──────────────┬──────────────┘
               │ MISS
               ▼
┌─────────────────────────────┐
│  OpenAI API                 │  ← 翻訳実行
│  結果をNeonに保存            │
└─────────────────────────────┘
```

---

## 翻訳メモリDB設計（Neon）

### Prismaスキーマ

```prisma
model TranslationMemory {
  id             String            @id @default(cuid())
  originalText   String            @map("original_text")
  originalHash   String            @map("original_hash")  // 検索用ハッシュ
  targetLang     String            @map("target_lang")    // "en", "zh" など
  translatedText String            @map("translated_text")
  status         TranslationStatus @default(MACHINE)
  sourcePath     String?           @map("source_path")    // どのページ由来か
  createdAt      DateTime          @default(now()) @map("created_at")
  updatedAt      DateTime          @updatedAt @map("updated_at")

  @@unique([originalHash, targetLang])
  @@index([originalHash])
  @@map("translation_memory")
}

enum TranslationStatus {
  MACHINE      // 機械翻訳
  HUMAN_EDITED // 人が編集済み
}
```

---

## Hydration問題への対処

### 課題

- Reactは「SSRで出したHTML」と「クライアントのVirtual DOM」が一致している前提でHydrationする
- プロキシがHTMLを英語に書き換えると、オリジンのビルドは日本語のままなので不一致が発生

### 対策

1. **suppressHydrationWarning**を使用してエラー抑止
2. テキストのみ変更し、DOM構造は極力変えない
3. 属性値やclassは変更しない

---

## 実装ロードマップ

### MVP（最小実装）- 完了

- [x] picker-proxy プロジェクト作成
- [x] HTMLパース & テキスト抽出
- [x] OpenAI翻訳連携
- [x] 基本的なキャッシュ（インメモリ）
- [x] `/en/*` ルーティング設定

### v1（フル版）- 未着手

- [ ] Vercel KV によるページキャッシュ
- [ ] Neon（PostgreSQL）による翻訳メモリ永続化
- [ ] 管理画面（翻訳編集）
- [ ] hreflang / canonical 対応
- [ ] 内部リンク書き換え
- [ ] サイトマップ生成

### v2（将来拡張）

- [ ] 用語集（Glossary）管理
- [ ] 翻訳ワークフロー（レビュー承認）
- [ ] 翻訳API利用量モニタリング

---

## 参考資料

- [parse5 - HTML parsing/serialization toolset](https://github.com/inikulin/parse5)
- [hast - Hypertext Abstract Syntax Tree](https://github.com/syntax-tree/hast)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)
- [OpenAI API](https://platform.openai.com/docs/api-reference)
