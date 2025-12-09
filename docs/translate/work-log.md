# 作業ログ

## 2024-12-09 作業内容

### 概要

picker-app の多言語対応のため、翻訳プロキシサーバー `picker-proxy` を新規作成した。

### 作業詳細

#### 1. プロジェクト初期化

```bash
mkdir ~/picker-proxy
cd ~/picker-proxy
pnpm init
```

#### 2. 依存パッケージインストール

**本番依存:**
- next@14
- react / react-dom
- parse5 - HTML5パーサー
- hast-util-from-parse5 / hast-util-to-parse5 - HAST変換
- unist-util-visit - ASTトラバーサル
- openai - 翻訳API
- @vercel/kv - キャッシュ（将来用）
- @prisma/client - DB（将来用）

**開発依存:**
- typescript
- @types/node / @types/react / @types/hast
- prisma

#### 3. 作成したファイル

```text
picker-proxy/
├── app/
│   ├── layout.tsx           # ルートレイアウト
│   ├── page.tsx             # トップページ
│   ├── [lang]/
│   │   ├── route.ts         # /en, /zh, /ko
│   │   └── [...path]/
│   │       └── route.ts     # /en/spikes 等
│
├── lib/
│   ├── cache.ts             # キャッシュ処理（インメモリ）
│   ├── openai.ts            # OpenAI翻訳
│   ├── utils.ts             # ユーティリティ
│   └── translator/
│       ├── index.ts         # メイン翻訳処理
│       ├── parser.ts        # HTML ↔ AST変換
│       ├── extractor.ts     # テキストノード抽出
│       └── replacer.ts      # テキスト差し替え
│
├── .tmp/                    # 作業ファイル
│   ├── translation-proxy-design.md  # 設計書
│   └── work-log.md          # この作業ログ
│
├── .env.local               # 環境変数
├── .env.example             # 環境変数テンプレート
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

#### 4. ビルド確認

```bash
pnpm build
# ✓ Compiled successfully
```

### 残作業

1. `.env.local` の `OPENAI_API_KEY` を設定
2. 実際に picker-app と一緒に起動して動作確認
3. Vercel KV / Neon の設定（v1）
4. Vercelへのデプロイ

### 起動方法

```bash
# ターミナル1: picker-app
cd ~/picker
yarn dev  # localhost:3000

# ターミナル2: picker-proxy
cd ~/picker-proxy
pnpm dev  # localhost:3001

# ブラウザで確認
# http://localhost:3001/en/spikes
```

### 注意事項

- Next.js 14 と React 19 のバージョン警告が出るが、動作には問題なし
- 現在はインメモリキャッシュのみ（サーバー再起動で消える）
- 本番運用前に Neon + Vercel KV の設定が必要
