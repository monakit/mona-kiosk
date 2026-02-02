---
title: "Branching and Merging"
description: "ブランチ操作（作成・切り替え・マージ・競合解決）を学びます。"
---

ブランチを使うと、機能開発や修正を分離して作業できます。

## ブランチの理解

ブランチはコミットへのポインタにすぎません。既定のブランチは通常 `main` または `master` です。

```
main:    A---B---C
              \
feature:       D---E
```

## ブランチの作成

```bash
# 新しいブランチを作成
git branch feature-login

# 作成して切り替える
git checkout -b feature-login
# または新版 Git：
git switch -c feature-login
```

## ブランチの切り替え

```bash
# 既存ブランチへ切り替え
git checkout main
# または新版 Git：
git switch main
```

## ブランチ一覧

```bash
# ローカルブランチ一覧
git branch

# すべてのブランチ（リモート含む）
git branch -a

# 最終コミット情報付き
git branch -v
```

## ブランチのマージ

機能が完成したら main にマージします：

```bash
# main に切り替え
git checkout main

# 機能ブランチをマージ
git merge feature-login
```

### ファストフォワードマージ

main に変更がない場合、Git はポインタを進めるだけです：

```
マージ前： main: A---B---C
                       \
           feature:     D---E

マージ後： main: A---B---C---D---E
```

### 3 ウェイマージ

main に新しいコミットがある場合、Git はマージコミットを作成します：

```
マージ前： main: A---B---C---F
                       \
           feature:     D---E

マージ後： main: A---B---C---F---G (merge commit)
                       \     /
           feature:     D---E
```

## 競合の解決

同じ行が両方のブランチで変更された場合：

```bash
git merge feature-login
# CONFLICT: Merge conflict in file.txt
```

ファイルを開いて競合マーカーを確認します：

```
<<<<<<< HEAD
Code from main branch
=======
Code from feature branch
>>>>>>> feature-login
```

1. ファイルを編集して競合を解消
2. 競合マーカーを削除
3. ステージしてコミット：

```bash
git add file.txt
git commit -m "Merge feature-login, resolve conflicts"
```

## ブランチの削除

マージ後：

```bash
# ローカルブランチ削除
git branch -d feature-login

# 強制削除（未マージの場合）
git branch -D feature-login
```

## リベース

リベースはマージの代替で、別ブランチの上にコミットを並べ直します：

```bash
git checkout feature-login
git rebase main
```

```
リベース前： main: A---B---C
                     \
           feature:   D---E

リベース後： main: A---B---C
                       \
           feature:     D'---E'
```

### リベースとマージの使い分け

| リベース | マージ |
|--------|-------|
| きれいな線形履歴 | 完全な履歴を保持 |
| 個人ブランチ | 共有ブランチ |
| main へマージ前 | 変更を取り込んだ後 |

**黄金律**：共有ブランチにプッシュ済みのコミットをリベースしない。

## 変更の一時退避

コミットせずに作業を一時保存します：

```bash
# 変更を退避
git stash

# 退避一覧
git stash list

# 最新の退避を適用
git stash pop

# 特定の退避を適用
git stash apply stash@{1}

# 退避を削除
git stash drop stash@{0}
```

## まとめ

| コマンド | 説明 |
|---------|-------------|
| `git branch <name>` | ブランチ作成 |
| `git switch <name>` | ブランチ切り替え |
| `git switch -c <name>` | 作成して切り替え |
| `git merge <branch>` | ブランチをマージ |
| `git rebase <branch>` | ブランチにリベース |
| `git branch -d <name>` | ブランチ削除 |
| `git stash` | 変更を退避 |

次の章ではリモートリポジトリの扱いを学びます。
