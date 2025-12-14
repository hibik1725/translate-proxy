# `pnpm task:loop` コマンド

## 概要

GitHub Issue からタスクを自動選定し、Vibe-Kanban に登録して連続実行する pnpm スクリプト。

**着手可能なタスクを全て並列で Doing に移し、Done 状態の変化を監視して次のタスクを開始するループ処理。**

---

## 使用方法

### 事前準備（初回のみ）

```bash
# 1. 依存関係をインストール
pnpm install

# 2. Vibe-Kanban を起動（別ターミナルで実行）
npx vibe-kanban
# → ブラウザが自動で開き、Kanbanボードが表示される
# → このボードで PR作成・レビュー・マージ操作を行う
```

### コマンド実行

```bash
# 基本
pnpm task:loop <issue-number>

# オプション指定
pnpm task:loop <issue-number> --max <number> --base <branch>

# 例
pnpm task:loop 123                  # Issue #123 の全タスクを実行
pnpm task:loop 123 --max 4          # Phase 4 まで実行
pnpm task:loop 123 --max 4.2        # タスクグループ 4.2 まで実行
pnpm task:loop 123 --base develop   # develop ブランチベースで実行

# ヘルプ
pnpm task:loop --help
```

### Vibe-Kanban 画面での操作

`npx vibe-kanban` で開いたボードで以下の操作を行います：

| 操作 | タイミング | 説明 |
|------|-----------|------|
| **タスク進捗確認** | 随時 | Todo → In Progress → In Review → Done の流れを確認 |
| **Create PR** | In Review 時 | ボタンをクリックして PR を自動作成 |
| **レビュー** | PR 作成後 | GitHub で PR の内容を確認 |
| **マージ** | レビュー完了後 | GitHub で PR をマージ（必ず GitHub 側で操作） |

**重要**: PR のマージは必ず GitHub 側で行ってください。マージを検知して Vibe-Kanban のタスクが自動で Done になります。

---

## ブランチ階層

```
main (デフォルト)
  └── issue/17                  ← main から作成
       ├── issue/17-phase1      ← issue/17 から作成
       ├── issue/17-phase2      ← issue/17 から作成
       └── issue/17-phase3      ← issue/17 から作成
            └── (作業ブランチ)   ← Vibe-Kanban が自動作成
```

- **main**: プロダクションブランチ
- **issue/N**: Issue 単位のブランチ（`--base` で変更可能）
- **issue/N-phaseM**: Phase 単位のブランチ、タスクグループの作業ベース

---

## 開発手順（ステップバイステップ）

### 事前準備チェックリスト

- [ ] `pnpm install` 済み
- [ ] Vibe-Kanban にプロジェクトが登録されている（後述）
- [ ] GitHub Issue にタスク一覧が記載されている

### Step 1: Vibe-Kanban を起動

```bash
npx vibe-kanban
```

ブラウザが自動で開きます。このボードでタスクの進捗を確認します。

### Step 2: プロジェクト登録（初回のみ）

Vibe-Kanban にこのプロジェクトが登録されていない場合：

1. ブラウザで Projects ページを開く
2. 「Create project」ボタンをクリック
3. Git Repository Path にプロジェクトのパスを入力
   ```
   /Users/yourname/path/to/translate-proxy
   ```
4. 保存

### Step 3: GitHub Issue にタスク一覧を記載

Issue本文に以下の形式でタスクを記載：

```markdown
## フェーズ1: 基盤構築

- [ ] 1.1 データベーススキーマ作成
  - ユーザーテーブルの作成
  - _依存関係: なし_

- [ ] 1.2 API基盤の構築
  - エンドポイントの定義
  - _依存関係: 1.1_

## フェーズ2: 機能実装

- [ ] 2.1 ユーザー認証機能
  - ログイン/ログアウト実装
  - _依存関係: 1.1, 1.2_
```

### Step 4: タスクループを開始

```bash
pnpm task:loop <issue-number>

# 例: Issue #17 の全タスクを実行
pnpm task:loop 17
```

コマンド実行後：
- 着手可能なタスクが自動で Vibe-Kanban に登録される
- 各タスクが並列で実行開始される
- 15秒ごとに進捗をポーリング

### Step 5: タスク進捗の確認

`npx vibe-kanban` で開いたボードでタスクの状態を確認：

| 状態 | 意味 |
|------|------|
| **Todo** | 未着手 |
| **In Progress** | 実行中（Claude Code が作業中） |
| **In Review** | レビュー待ち（PR作成が必要） |
| **Done** | 完了 |

### Step 6: In Review 状態の対応

タスクが **In Review** になったら：

1. **Vibe-Kanban で「Create PR」ボタンをクリック**
   - PR が自動作成される

2. **GitHub で PR をレビュー**
   - コードを確認
   - 必要に応じて修正を依頼

3. **レビュー完了後、GitHub で PR をマージ**
   - 必ず GitHub 側でマージすること

### Step 7: マージ後の自動処理

PR をマージすると：

1. Vibe-Kanban がマージを検知
2. タスクが自動で **Done** に変更
3. `pnpm task:loop` がこれを検知
4. GitHub Issue のチェックボックスが自動で `[x]` に更新
5. 新たに着手可能になったタスクが自動で開始

```
┌─────────────────────────────────────────────────────────────┐
│  PR マージ                                                  │
│      ↓                                                      │
│  Vibe-Kanban: タスク → Done（自動）                        │
│      ↓                                                      │
│  task:loop: Done 検知                                       │
│      ↓                                                      │
│  GitHub Issue: チェックボックス更新（自動）                 │
│      ↓                                                      │
│  次のタスクが自動開始                                       │
└─────────────────────────────────────────────────────────────┘
```

### Step 8: 全タスク完了

すべてのタスクが Done になると：

```
🎉 すべてのタスクが完了しました！
✅ タスク自動実行ループ終了
```

---

## トラブルシューティング

### プロジェクトが見つからないエラー

```
❌ プロジェクトが Vibe-Kanban に登録されていません
```

**対処法**: Step 2 の手順でプロジェクトを登録してください。

### タスクが In Review のまま進まない

タスクが In Review 状態で停止している場合：

1. Vibe-Kanban で「Create PR」ボタンをクリック
2. GitHub で PR をレビュー・マージ

### 循環依存エラー

```
❌ エラー: タスクグループの循環依存を検出しました
循環依存パス: 1.1 → 1.2 → 1.1
```

**対処法**: GitHub Issue のタスク依存関係を修正してください。

---

## ファイル構成

```
scripts/task-vibe-kanban-loop/
├── index.ts                 # メインエントリポイント
└── lib/
    ├── types.ts             # 型定義
    ├── args-parser.ts       # コマンドライン引数解析
    ├── github-client.ts     # GitHub CLI ラッパー
    ├── issue-parser.ts      # Issue本文パーサー
    ├── branch-manager.ts    # ブランチ管理
    ├── dependency-resolver.ts # 依存関係解決
    ├── task-state-manager.ts  # タスク状態管理
    └── vibe-kanban-client.ts  # Vibe-Kanban MCPクライアント
```
