---
title: "Working with Remotes"
description: "学习使用远程仓库协作：push、pull、fetch 与拉取请求。"
---

远程仓库让你与他人协作并备份代码。

## 添加远程仓库

```bash
# 添加远程（通常叫 "origin"）
git remote add origin https://github.com/user/repo.git

# 查看远程
git remote -v
```

## 推送更改

把本地提交发送到远程：

```bash
# 推送到远程
git push origin main

# 首次推送并建立上游关系
git push -u origin main

# 之后可直接使用：
git push
```

## 获取变更

下载远程变更但不合并：

```bash
git fetch origin

# 查看有哪些变化
git log origin/main --oneline
```

## 拉取变更

一步完成获取并合并：

```bash
git pull origin main

# 若已设置上游：
git pull
```

`pull` = `fetch` + `merge`

## 使用 rebase 拉取

保持线性历史：

```bash
git pull --rebase origin main
```

## 跟踪分支

```bash
# 查看跟踪关系
git branch -vv

# 为当前分支设置上游
git branch -u origin/main
```

## 使用 Fork 协作

1. 在 GitHub 上 Fork 仓库
2. 克隆你的 Fork：

```bash
git clone https://github.com/YOUR-USERNAME/repo.git
```

3. 添加上游远程：

```bash
git remote add upstream https://github.com/ORIGINAL-OWNER/repo.git
```

4. 保持 Fork 更新：

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Pull Request 工作流

1. 创建功能分支：

```bash
git checkout -b feature-xyz
```

2. 修改并提交：

```bash
git add .
git commit -m "Add feature XYZ"
```

3. 推送到你的 Fork：

```bash
git push -u origin feature-xyz
```

4. 在 GitHub 上创建 Pull Request

5. 合并后清理：

```bash
git checkout main
git pull upstream main
git branch -d feature-xyz
git push origin --delete feature-xyz
```

## 常见远程命令

```bash
# 列出远程
git remote -v

# 查看远程详情
git remote show origin

# 重命名远程
git remote rename origin upstream

# 删除远程
git remote remove origin

# 清理已删除的远程分支
git fetch --prune
```

## 处理被拒绝的推送

如果推送被拒绝，说明远程有新提交：

```bash
# 方案 1：拉取并合并
git pull origin main
git push origin main

# 方案 2：rebase 拉取（更整洁）
git pull --rebase origin main
git push origin main
```

**绝不要对共享分支强制推送！**

```bash
# 仅在 rebase 后对自己的分支使用
git push --force-with-lease origin feature-branch
```

## 总结

| 命令 | 说明 |
|---------|-------------|
| `git remote add <name> <url>` | 添加远程 |
| `git push` | 推送提交 |
| `git fetch` | 下载变更 |
| `git pull` | 获取并合并 |
| `git pull --rebase` | 获取并 rebase |
| `git remote -v` | 列出远程 |

恭喜！你已经完成 Git Essentials 课程。现在你已经具备日常 Git 工作流所需的全部工具。

## 快速参考卡

```bash
# 日常流程
git status              # 查看改动
git add .               # 暂存所有更改
git commit -m "message" # 提交
git push                # 分享到团队

# 分支
git switch -c feature   # 新分支
git switch main         # 回到 main
git merge feature       # 合并分支

# 同步远程
git pull                # 获取最新
git push                # 推送改动
```

Happy coding!
