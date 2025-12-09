# translate-proxy タスクリスト

## 概要

translate-proxyの実装タスクを優先度順に整理したリスト。
各タスクには完了条件（Definition of Done）を明記。

---

## Phase 1: コア翻訳機能

### 1.1 HTMLパーサーService実装

**説明**: オリジンから取得したHTMLをAST（抽象構文木）に変換し、テキストノードを抽出するサービス

**完了条件**:
- [ ] `src/services/html-parser.ts` が作成されている
- [ ] `HtmlParserService` クラスが実装されている
  - `execute(html: string)` で HAST（Hypertext AST）を返却
- [ ] parse5 + hast-util-from-parse5 を使用してHTMLをパース
- [ ] `src/services/html-parser.spec.ts` でテストが書かれている
  - 成功系: 有効なHTMLをパースできること
  - 成功系: 空のHTMLを処理できること
  - 失敗系: 不正なHTMLでエラーにならないこと（parse5は寛容）
- [ ] テストカバレッジ80%以上

---

### 1.2 テキスト抽出Service実装

**説明**: HASTから翻訳対象のテキストノードを抽出するサービス

**完了条件**:
- [ ] `src/services/text-extractor.ts` が作成されている
- [ ] `TextExtractorService` クラスが実装されている
  - `execute(hast: Root)` で翻訳対象テキストの配列を返却
- [ ] 日本語を含むテキストのみを抽出する（正規表現: `[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]`）
- [ ] 除外タグ（script, style, code, pre, noscript）内のテキストは抽出しない
- [ ] 重複テキストは1つにまとめる
- [ ] `src/services/text-extractor.spec.ts` でテストが書かれている
  - 成功系: 日本語テキストを抽出できること
  - 成功系: 英語のみのテキストは抽出しないこと
  - 成功系: scriptタグ内のテキストは抽出しないこと
  - 成功系: 重複テキストが1つにまとまること
- [ ] テストカバレッジ80%以上

---

### 1.3 OpenAI翻訳Service実装

**説明**: OpenAI APIを使用してテキストを翻訳するサービス

**完了条件**:
- [ ] `src/services/openai-translator.ts` が作成されている
- [ ] `OpenAITranslatorService` クラスが実装されている
  - `execute(texts: string[], targetLang: SupportedLang)` で翻訳結果のMapを返却
- [ ] バッチ処理で複数テキストを効率的に翻訳
- [ ] 環境変数 `OPENAI_API_KEY` を使用
- [ ] エラーハンドリング（API失敗時のリトライ or フォールバック）
- [ ] `src/services/openai-translator.spec.ts` でテストが書かれている
  - 成功系: テキストを翻訳できること（モック使用）
  - 成功系: 複数テキストをバッチ翻訳できること
  - 失敗系: APIエラー時に適切なエラーを返すこと
- [ ] テストカバレッジ80%以上

---

### 1.4 テキスト置換Service実装

**説明**: HASTのテキストノードを翻訳結果で置換するサービス

**完了条件**:
- [ ] `src/services/text-replacer.ts` が作成されている
- [ ] `TextReplacerService` クラスが実装されている
  - `execute(hast: Root, translations: Map<string, string>)` で置換済みHASTを返却
- [ ] 元のDOM構造を保持したまま、テキストのみを置換
- [ ] `src/services/text-replacer.spec.ts` でテストが書かれている
  - 成功系: テキストノードが正しく置換されること
  - 成功系: 翻訳がないテキストは元のままであること
  - 成功系: DOM構造が変わらないこと
- [ ] テストカバレッジ80%以上

---

### 1.5 HTMLシリアライザService実装

**説明**: HASTをHTML文字列に変換するサービス

**完了条件**:
- [ ] `src/services/html-serializer.ts` が作成されている
- [ ] `HtmlSerializerService` クラスが実装されている
  - `execute(hast: Root)` でHTML文字列を返却
- [ ] hast-util-to-parse5 + parse5 serialize を使用
- [ ] `src/services/html-serializer.spec.ts` でテストが書かれている
  - 成功系: HASTをHTML文字列に変換できること
  - 成功系: 元のHTML構造が保持されること
- [ ] テストカバレッジ80%以上

---

### 1.6 翻訳オーケストレーションService実装

**説明**: 上記サービスを組み合わせて翻訳全体を制御するメインサービス

**完了条件**:
- [ ] `src/services/translation-orchestrator.ts` が作成されている
- [ ] `TranslationOrchestratorService` クラスが実装されている
  - `execute(html: string, targetLang: SupportedLang)` で翻訳済みHTMLを返却
- [ ] 処理フロー: HTML → AST → テキスト抽出 → 翻訳 → 置換 → HTML
- [ ] `src/services/translation-orchestrator.spec.ts` でテストが書かれている
  - 成功系: HTMLを翻訳できること（統合テスト）
  - 成功系: 日本語のないHTMLはそのまま返却すること
- [ ] テストカバレッジ80%以上

---

## Phase 2: オリジンフェッチ

### 2.1 オリジンフェッチService実装

**説明**: picker-appから日本語HTMLを取得するサービス

**完了条件**:
- [ ] `src/services/origin-fetcher.ts` が作成されている
- [ ] `OriginFetcherService` クラスが実装されている
  - `execute(path: string)` でHTMLを返却
- [ ] 環境変数 `ORIGIN_URL` を使用してフェッチ
- [ ] HTTPエラーハンドリング（404, 500等）
- [ ] `src/services/origin-fetcher.spec.ts` でテストが書かれている
  - 成功系: HTMLを取得できること（モック使用）
  - 失敗系: 404時に適切なエラーを返すこと
  - 失敗系: ネットワークエラー時に適切なエラーを返すこと
- [ ] テストカバレッジ80%以上

---

### 2.2 翻訳ルートハンドラー更新

**説明**: 現在のスタブ実装を実際の翻訳処理に置き換え

**完了条件**:
- [ ] `src/routes/translate.ts` が更新されている
- [ ] `/en/*` へのリクエストで:
  1. オリジンからHTMLを取得
  2. 翻訳処理を実行
  3. 翻訳済みHTMLを返却
- [ ] Content-Type: text/html; charset=utf-8 を設定
- [ ] エラーハンドリング（オリジン取得失敗、翻訳失敗）
- [ ] `src/routes/translate.spec.ts` でテストが書かれている
  - 成功系: 翻訳済みHTMLを返却できること
  - 失敗系: サポート外言語で400エラーを返すこと
  - 失敗系: オリジン取得失敗時に適切なエラーを返すこと
- [ ] テストカバレッジ80%以上

---

## Phase 3: SEO対応

### 3.1 SEOタグ挿入Service実装

**説明**: 翻訳済みHTMLにSEO関連タグを挿入するサービス

**完了条件**:
- [ ] `src/services/seo-injector.ts` が作成されている
- [ ] `SeoInjectorService` クラスが実装されている
  - `execute(hast: Root, currentPath: string, targetLang: SupportedLang)` でSEOタグ挿入済みHASTを返却
- [ ] 以下のタグを挿入:
  - `<html lang="en">` 属性を設定
  - `<link rel="alternate" hreflang="ja" href="...">` を挿入
  - `<link rel="alternate" hreflang="en" href="...">` を挿入
  - `<link rel="alternate" hreflang="x-default" href="...">` を挿入
  - `<link rel="canonical" href="...">` を設定
- [ ] `src/services/seo-injector.spec.ts` でテストが書かれている
  - 成功系: lang属性が設定されること
  - 成功系: hreflangタグが挿入されること
  - 成功系: canonicalタグが設定されること
- [ ] テストカバレッジ80%以上

---

### 3.2 サイトマップ生成ルート実装

**説明**: `/en/sitemap.xml` を生成するルート

**完了条件**:
- [ ] `src/routes/sitemap.ts` が作成されている
- [ ] `/en/sitemap.xml` へのリクエストで:
  1. オリジンから `/sitemap.xml` を取得
  2. 各URLを `/en/...` 形式に変換
  3. 英語サイトマップを返却
- [ ] Content-Type: application/xml を設定
- [ ] `src/routes/sitemap.spec.ts` でテストが書かれている
  - 成功系: URLが正しく変換されること
  - 成功系: XMLフォーマットが正しいこと
- [ ] テストカバレッジ80%以上

---

### 3.3 内部リンク書き換えService実装

**説明**: HTML内の内部リンクを `/en/...` 形式に書き換えるサービス

**完了条件**:
- [ ] `src/services/link-rewriter.ts` が作成されている
- [ ] `LinkRewriterService` クラスが実装されている
  - `execute(hast: Root, targetLang: SupportedLang)` でリンク書き換え済みHASTを返却
- [ ] `<a href="/path">` → `<a href="/en/path">` に変換
- [ ] 外部リンク（https://...）は変換しない
- [ ] アンカーリンク（#section）は変換しない
- [ ] `src/services/link-rewriter.spec.ts` でテストが書かれている
  - 成功系: 内部リンクが書き換わること
  - 成功系: 外部リンクはそのままであること
  - 成功系: アンカーリンクはそのままであること
- [ ] テストカバレッジ80%以上

---

## Phase 4: キャッシュ

### 4.1 Cloudflare KVキャッシュService実装

**説明**: 翻訳結果をCloudflare KVにキャッシュするサービス

**キャッシュデータ構造**:
```typescript
interface CacheEntry {
  /** 翻訳されたテキスト */
  translatedText: string
  /** 最後に使用された日時（ISO 8601形式） */
  lastUsedAt: string
  /** 作成日時（ISO 8601形式） */
  createdAt: string
}
```

**完了条件**:
- [ ] `src/services/kv-cache.ts` が作成されている
- [ ] `KvCacheService` クラスが実装されている
  - `execute(key: string)` でキャッシュを取得し、`lastUsedAt`を現在時刻に更新して保存
  - `set(key: string, value: string)` でキャッシュを保存（`createdAt`と`lastUsedAt`を設定）
- [ ] キャッシュキー形式: `{lang}:{sha256(text)}`
- [ ] キャッシュ取得時に`lastUsedAt`を現在時刻に更新（LRU的な追跡）
- [ ] `wrangler.toml` にKVバインディングを設定
- [ ] `src/services/kv-cache.spec.ts` でテストが書かれている
  - 成功系: キャッシュを保存・取得できること
  - 成功系: 取得時に`lastUsedAt`が更新されること
  - 成功系: キャッシュミス時にnullを返すこと
  - 成功系: `createdAt`は更新されないこと
- [ ] テストカバレッジ80%以上

---

### 4.2 翻訳サービスにキャッシュ統合

**説明**: OpenAI翻訳の前にKVキャッシュを参照するよう統合

**完了条件**:
- [ ] `OpenAITranslatorService` がキャッシュを使用するよう更新
- [ ] 処理フロー:
  1. KVキャッシュを確認
  2. キャッシュヒット → `lastUsedAt`を更新 → キャッシュから返却
  3. キャッシュミス → OpenAI翻訳 → KVに保存（`createdAt`/`lastUsedAt`設定） → 返却
- [ ] テストが更新されている
  - 成功系: キャッシュヒット時にOpenAIを呼ばないこと
  - 成功系: キャッシュヒット時に`lastUsedAt`が更新されること
  - 成功系: キャッシュミス時にOpenAIを呼び結果を保存すること
- [ ] テストカバレッジ80%以上

---

## Phase 5: デプロイ・運用

### 5.1 Cloudflare Workers本番設定

**説明**: 本番環境の設定とシークレット管理

**完了条件**:
- [ ] `wrangler.toml` に本番環境設定が追加されている
- [ ] Cloudflare KVネームスペースが作成されている
- [ ] `OPENAI_API_KEY` がCloudflare Secretsに設定されている
- [ ] `pnpm deploy` で本番デプロイが成功すること
- [ ] ヘルスチェックエンドポイント `/health` が応答すること

---

### 5.2 picker-app側のrewrite設定

**説明**: Vercelからtranslate-proxyへのルーティング設定

**完了条件**:
- [ ] picker-appの `vercel.json` または `middleware.ts` にrewrite設定が追加されている
- [ ] `/en/*` へのリクエストがtranslate-proxyに転送されること
- [ ] 動作確認: `https://picker-tf.com/en/spikes` で翻訳済みHTMLが表示されること

---

### 5.3 robots.txt更新

**説明**: picker-app側のrobots.txtに英語サイトマップを追加

**完了条件**:
- [ ] picker-appの `robots.txt` に以下が追加されている:
  ```
  Sitemap: https://picker-tf.com/en/sitemap.xml
  ```
- [ ] Googlebotがサイトマップにアクセスできること

---

## 優先度サマリー

| Phase | タスク数 | 優先度 | 説明 |
|-------|---------|--------|------|
| Phase 1 | 6 | 最高 | コア翻訳機能（必須） |
| Phase 2 | 2 | 高 | オリジンフェッチ（翻訳に必須） |
| Phase 3 | 3 | 中 | SEO対応（公開前に必須） |
| Phase 4 | 2 | 中 | キャッシュ（コスト削減） |
| Phase 5 | 3 | 低 | デプロイ・運用 |

---

## 進捗状況

- **Phase 1**: 0/6 完了
- **Phase 2**: 0/2 完了
- **Phase 3**: 0/3 完了
- **Phase 4**: 0/2 完了
- **Phase 5**: 0/3 完了

**総進捗**: 0/16 タスク完了
