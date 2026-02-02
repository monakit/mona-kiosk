---
title: "Git Basics"
description: "Learn the fundamental Git commands: init, add, commit, and status."
---

Git is a distributed version control system that tracks changes to your files. Let's start with the basics.

## Installing Git

Check if Git is installed:

```bash
git --version
```

If not installed, download from [git-scm.com](https://git-scm.com/).

## Initial Configuration

Set your identity (used in commits):

```bash
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## Creating a Repository

### Initialize a New Repository

```bash
mkdir my-project
cd my-project
git init
```

This creates a hidden `.git` folder that stores all version history.

### Clone an Existing Repository

```bash
git clone https://github.com/user/repo.git
```

## The Git Workflow

Git has three main areas:

1. **Working Directory** - Your actual files
2. **Staging Area** - Files ready to be committed
3. **Repository** - Committed history

```
Working Directory → Staging Area → Repository
      (add)            (commit)
```

## Essential Commands

### Check Status

```bash
git status
```

Shows:
- Modified files not staged
- Staged files ready to commit
- Untracked files

### Add Files to Staging

```bash
# Add specific file
git add filename.txt

# Add all files
git add .

# Add all changes (including deletions)
git add -A
```

### Commit Changes

```bash
# Commit with message
git commit -m "Add new feature"

# Add and commit in one step (tracked files only)
git commit -am "Update existing files"
```

### View History

```bash
# View commit log
git log

# Compact view
git log --oneline

# With graph
git log --oneline --graph
```

## Undoing Changes

### Unstage a File

```bash
git restore --staged filename.txt
```

### Discard Changes in Working Directory

```bash
git restore filename.txt
```

### Amend Last Commit

```bash
git commit --amend -m "New commit message"
```

## Ignoring Files

Create a `.gitignore` file:

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

## Summary

| Command | Description |
|---------|-------------|
| `git init` | Initialize repository |
| `git clone <url>` | Clone repository |
| `git status` | Check status |
| `git add <file>` | Stage file |
| `git commit -m "msg"` | Commit changes |
| `git log` | View history |
| `git restore <file>` | Discard changes |

In the next chapter, we'll learn about branching and merging.
