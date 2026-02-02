---
title: "Working with Remotes"
description: "リモートリポジトリでの協業を学びます：push、pull、fetch、プルリクエスト。"
---

リモートリポジトリは、他の人との協業やコードのバックアップに役立ちます。

## リモートの追加

```bash
# リモートを追加（通常は "origin"）
git remote add origin https://github.com/user/repo.git

# リモート一覧
git remote -v
```

## 変更のプッシュ

ローカルのコミットをリモートへ送信します：

```bash
# リモートへプッシュ
git push origin main

# 初回は上流追跡を設定
git push -u origin main

# -u 後は次で OK：
git push
```

## 変更の取得（fetch）

リモートの変更をダウンロードするだけで、まだマージしません：

```bash
git fetch origin

# 変更を確認
git log origin/main --oneline
```

## 変更の取り込み（pull）

取得とマージを一度に実行します：

```bash
git pull origin main

# 上流が設定済みなら：
git pull
```

`pull` = `fetch` + `merge`

## リベースで pull

履歴を線形に保ちます：

```bash
git pull --rebase origin main
```

## 追跡ブランチ

```bash
# 追跡関係を表示
git branch -vv

# 現在のブランチに上流を設定
git branch -u origin/main
```

## Fork の使い方

1. GitHub でリポジトリを Fork
2. Fork をクローン：

```bash
git clone https://github.com/YOUR-USERNAME/repo.git
```

3. upstream を追加：

```bash
git remote add upstream https://github.com/ORIGINAL-OWNER/repo.git
```

4. Fork を最新化：

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## プルリクエストの流れ

1. 機能ブランチを作成：

```bash
git checkout -b feature-xyz
```

2. 変更してコミット：

```bash
git add .
git commit -m "Add feature XYZ"
```

3. Fork にプッシュ：

```bash
git push -u origin feature-xyz
```

4. GitHub で Pull Request を作成

5. マージ後の後片付け：

```bash
git checkout main
git pull upstream main
git branch -d feature-xyz
git push origin --delete feature-xyz
```

## よく使うリモートコマンド

```bash
# リモート一覧
git remote -v

# リモート詳細
git remote show origin

# リモート名を変更
git remote rename origin upstream

# リモートを削除
git remote remove origin

# 削除済みリモートブランチを掃除
git fetch --prune
```

## プッシュ拒否の対応

リモートに新しいコミットがある場合、プッシュが拒否されます：

```bash
# 方式 1：pull してマージ
git pull origin main
git push origin main

# 方式 2：rebase で pull（よりきれい）
git pull --rebase origin main
git push origin main
```

**共有ブランチに force push しないでください！**

```bash
# 自分のブランチで rebase 後のみ使用
git push --force-with-lease origin feature-branch
```

## まとめ

| コマンド | 説明 |
|---------|-------------|
| `git remote add <name> <url>` | リモート追加 |
| `git push` | コミットをプッシュ |
| `git fetch` | 変更を取得 |
| `git pull` | 取得してマージ |
| `git pull --rebase` | 取得してリベース |
| `git remote -v` | リモート一覧 |

おめでとうございます！Git Essentials コースを修了しました。日常の Git ワークフローに必要な知識が揃いました。

## クイックリファレンス

```bash
# 日常フロー
git status              # 変更確認
git add .               # すべてステージ
git commit -m "message" # コミット
git push                # 共有

# ブランチ
git switch -c feature   # 新規ブランチ
git switch main         # main に戻る
git merge feature       # マージ

# リモート同期
git pull                # 最新取得
git push                # 変更共有
```

Happy coding!
