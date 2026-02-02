---
title: "Branching and Merging"
description: "学习分支操作：创建、切换、合并与冲突解决。"
---

分支让你可以在隔离环境中开发不同功能或修复。

## 理解分支

分支本质上是指向某个提交的指针，默认分支通常是 `main` 或 `master`。

```
main:    A---B---C
              \
feature:       D---E
```

## 创建分支

```bash
# 创建新分支
git branch feature-login

# 创建并切换到新分支
git checkout -b feature-login
# 或使用新版 Git：
git switch -c feature-login
```

## 切换分支

```bash
# 切换到已有分支
git checkout main
# 或使用新版 Git：
git switch main
```

## 查看分支

```bash
# 列出本地分支
git branch

# 列出所有分支（含远程）
git branch -a

# 显示最后一次提交信息
git branch -v
```

## 合并分支

功能完成后，将其合并回主分支：

```bash
# 切换到 main
git checkout main

# 合并功能分支
git merge feature-login
```

### 快进合并

如果 main 没有变化，Git 只会移动指针：

```
合并前： main: A---B---C
                       \
         feature:       D---E

合并后： main: A---B---C---D---E
```

### 三方合并

如果 main 有新提交，Git 会创建一个合并提交：

```
合并前： main: A---B---C---F
                       \
         feature:       D---E

合并后： main: A---B---C---F---G (merge commit)
                       \     /
         feature:       D---E
```

## 解决冲突

当两个分支修改了相同行时：

```bash
git merge feature-login
# CONFLICT: Merge conflict in file.txt
```

打开文件查看冲突标记：

```
<<<<<<< HEAD
Code from main branch
=======
Code from feature branch
>>>>>>> feature-login
```

1. 编辑文件解决冲突
2. 移除冲突标记
3. 暂存并提交：

```bash
git add file.txt
git commit -m "Merge feature-login, resolve conflicts"
```

## 删除分支

合并后：

```bash
# 删除本地分支
git branch -d feature-login

# 强制删除（未合并时）
git branch -D feature-login
```

## 变基

变基是合并的替代方案，会把提交重放到另一个分支之上：

```bash
git checkout feature-login
git rebase main
```

```
变基前： main: A---B---C
                   \
         feature:   D---E

变基后： main: A---B---C
                       \
         feature:       D'---E'
```

### 何时使用变基或合并

| 变基 | 合并 |
|--------|-------|
| 干净的线性历史 | 保留完整历史 |
| 私有分支 | 共享分支 |
| 合并到 main 之前 | 拉取变更之后 |

**黄金法则**：不要对已推送到共享分支的提交做变基。

## 暂存工作进度

临时保存未提交的工作：

```bash
# 暂存更改
git stash

# 查看暂存列表
git stash list

# 应用最近的暂存
git stash pop

# 应用指定暂存
git stash apply stash@{1}

# 删除暂存
git stash drop stash@{0}
```

## 总结

| 命令 | 说明 |
|---------|-------------|
| `git branch <name>` | 创建分支 |
| `git switch <name>` | 切换分支 |
| `git switch -c <name>` | 创建并切换 |
| `git merge <branch>` | 合并分支 |
| `git rebase <branch>` | 在分支上变基 |
| `git branch -d <name>` | 删除分支 |
| `git stash` | 暂存更改 |

下一章我们将学习与远程仓库协作。
