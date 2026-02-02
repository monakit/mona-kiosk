---
title: "Git Basics"
description: "学习 Git 的基础命令：init、add、commit、status。"
---

Git 是一种分布式版本控制系统，用于跟踪文件变更。我们先从基础开始。

## 安装 Git

检查是否已安装 Git：

```bash
git --version
```

若未安装，请从 [git-scm.com](https://git-scm.com/) 下载。

## 初始配置

设置你的身份信息（用于提交）：

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 创建仓库

### 初始化新仓库

```bash
mkdir my-project
cd my-project
git init
```

这会创建一个隐藏的 `.git` 文件夹，用于存储全部版本历史。

### 克隆已有仓库

```bash
git clone https://github.com/user/repo.git
```

## Git 工作流

Git 有三个主要区域：

1. **工作区** - 实际文件
2. **暂存区** - 准备提交的文件
3. **仓库** - 提交后的历史

```
工作区 → 暂存区 → 仓库
   (add)    (commit)
```

## 常用命令

### 查看状态

```bash
git status
```

显示：
- 未暂存的修改
- 已暂存待提交的文件
- 未跟踪的文件

### 添加到暂存区

```bash
# 添加指定文件
git add filename.txt

# 添加所有文件
git add .

# 添加所有更改（包括删除）
git add -A
```

### 提交更改

```bash
# 带提交信息
git commit -m "Add new feature"

# 一步添加并提交（仅已跟踪文件）
git commit -am "Update existing files"
```

### 查看历史

```bash
# 查看提交日志
git log

# 简洁视图
git log --oneline

# 带图形
git log --oneline --graph
```

## 撤销更改

### 取消暂存

```bash
git restore --staged filename.txt
```

### 丢弃工作区更改

```bash
git restore filename.txt
```

### 修订上一次提交

```bash
git commit --amend -m "New commit message"
```

## 忽略文件

创建 `.gitignore` 文件：

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

## 总结

| 命令 | 说明 |
|---------|-------------|
| `git init` | 初始化仓库 |
| `git clone <url>` | 克隆仓库 |
| `git status` | 查看状态 |
| `git add <file>` | 暂存文件 |
| `git commit -m "msg"` | 提交更改 |
| `git log` | 查看历史 |
| `git restore <file>` | 丢弃更改 |

下一章我们将学习分支与合并。
