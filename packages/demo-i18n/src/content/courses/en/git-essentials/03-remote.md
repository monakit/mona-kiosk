---
title: "Working with Remotes"
description: "Learn to collaborate using remote repositories: push, pull, fetch, and pull requests."
---

Remote repositories let you collaborate with others and backup your code.

## Adding a Remote

```bash
# Add a remote (usually called "origin")
git remote add origin https://github.com/user/repo.git

# View remotes
git remote -v
```

## Pushing Changes

Send your local commits to the remote:

```bash
# Push to remote
git push origin main

# First push with upstream tracking
git push -u origin main

# After -u, just use:
git push
```

## Fetching Changes

Download remote changes without merging:

```bash
git fetch origin

# See what changed
git log origin/main --oneline
```

## Pulling Changes

Fetch and merge in one step:

```bash
git pull origin main

# Or if upstream is set:
git pull
```

`pull` = `fetch` + `merge`

## Pull with Rebase

Keep a linear history:

```bash
git pull --rebase origin main
```

## Tracking Branches

```bash
# See tracking relationships
git branch -vv

# Set upstream for current branch
git branch -u origin/main
```

## Working with Forks

1. Fork the repository on GitHub
2. Clone your fork:

```bash
git clone https://github.com/YOUR-USERNAME/repo.git
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/ORIGINAL-OWNER/repo.git
```

4. Keep your fork updated:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Pull Request Workflow

1. Create a feature branch:

```bash
git checkout -b feature-xyz
```

2. Make changes and commit:

```bash
git add .
git commit -m "Add feature XYZ"
```

3. Push to your fork:

```bash
git push -u origin feature-xyz
```

4. Create a Pull Request on GitHub

5. After PR is merged, clean up:

```bash
git checkout main
git pull upstream main
git branch -d feature-xyz
git push origin --delete feature-xyz
```

## Common Remote Commands

```bash
# List remotes
git remote -v

# Show remote details
git remote show origin

# Rename remote
git remote rename origin upstream

# Remove remote
git remote remove origin

# Prune deleted remote branches
git fetch --prune
```

## Handling Rejected Pushes

If your push is rejected because the remote has new commits:

```bash
# Option 1: Pull and merge
git pull origin main
git push origin main

# Option 2: Pull with rebase (cleaner)
git pull --rebase origin main
git push origin main
```

**Never force push to shared branches!**

```bash
# Only use for your own branches after rebase
git push --force-with-lease origin feature-branch
```

## Summary

| Command | Description |
|---------|-------------|
| `git remote add <name> <url>` | Add remote |
| `git push` | Push commits |
| `git fetch` | Download changes |
| `git pull` | Fetch and merge |
| `git pull --rebase` | Fetch and rebase |
| `git remote -v` | List remotes |

Congratulations! You've completed the Git Essentials course. You now have all the tools you need for everyday Git workflows.

## Quick Reference Card

```bash
# Daily workflow
git status              # Check what's changed
git add .               # Stage all changes
git commit -m "message" # Commit
git push                # Share with team

# Branching
git switch -c feature   # New branch
git switch main         # Back to main
git merge feature       # Merge branch

# Sync with remote
git pull                # Get latest
git push                # Share changes
```

Happy coding!
