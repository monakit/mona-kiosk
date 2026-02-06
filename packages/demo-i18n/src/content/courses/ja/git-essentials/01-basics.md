---
title: "Git Basics"
description: "Git の基本コマンド（init、add、commit、status）を学びます。"
---

Git は分散型バージョン管理システムで、ファイルの変更を追跡します。まずは基本から始めましょう。

## Git のインストール

Git がインストールされているか確認します：

```bash
git --version
```

未インストールの場合は [git-scm.com](https://git-scm.com/) からダウンロードしてください。

## 初期設定

コミットに使う識別情報を設定します：

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## リポジトリの作成

### 新しいリポジトリを初期化する

```bash
mkdir my-project
cd my-project
git init
```

これにより、すべての履歴を保存する隠しフォルダ `.git` が作成されます。

### 既存リポジトリをクローンする

```bash
git clone https://github.com/user/repo.git
```

## Git のワークフロー

Git には主に 3 つの領域があります：

1. **作業ディレクトリ** - 実際のファイル
2. **ステージングエリア** - コミット待ちのファイル
3. **リポジトリ** - コミット済みの履歴

```
作業ディレクトリ → ステージングエリア → リポジトリ
     (add)              (commit)
```

## 主要コマンド

### 状態を確認

```bash
git status
```

表示される内容：
- 未ステージの変更
- コミット待ちのステージ済みファイル
- 未追跡のファイル

### ステージングに追加

```bash
# 特定ファイルを追加
git add filename.txt

# すべてのファイルを追加
git add .

# すべての変更を追加（削除含む）
git add -A
```

### 変更をコミット

```bash
# メッセージ付きでコミット
git commit -m "Add new feature"

# 追加とコミットを一度に実行（追跡済みファイルのみ）
git commit -am "Update existing files"
```

### 履歴を表示

```bash
# コミットログを表示
git log

# 簡潔表示
git log --oneline

# グラフ付き
git log --oneline --graph
```

## 変更の取り消し

### ステージ解除

```bash
git restore --staged filename.txt
```

### 作業ディレクトリの変更を破棄

```bash
git restore filename.txt
```

### 直前のコミットを修正

```bash
git commit --amend -m "New commit message"
```

## ファイルの除外

`.gitignore` ファイルを作成します：

```
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment files
.env
.env.local

# IDE
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
```

## まとめ

| コマンド | 説明 |
|---------|-------------|
| `git init` | リポジトリを初期化 |
| `git clone <url>` | リポジトリをクローン |
| `git status` | 状態を確認 |
| `git add <file>` | ファイルをステージ |
| `git commit -m "msg"` | 変更をコミット |
| `git log` | 履歴を表示 |
| `git restore <file>` | 変更を破棄 |

次の章ではブランチとマージを学びます。
