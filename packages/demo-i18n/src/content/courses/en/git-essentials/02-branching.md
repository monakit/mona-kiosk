---
title: "Branching and Merging"
description: "Learn to work with branches: create, switch, merge, and resolve conflicts."
---

Branches let you work on different features or fixes in isolation.

## Understanding Branches

A branch is simply a pointer to a commit. The default branch is usually `main` or `master`.

```
main:    A---B---C
              \
feature:       D---E
```

## Creating Branches

```bash
# Create a new branch
git branch feature-login

# Create and switch to new branch
git checkout -b feature-login
# Or with newer Git:
git switch -c feature-login
```

## Switching Branches

```bash
# Switch to existing branch
git checkout main
# Or with newer Git:
git switch main
```

## Listing Branches

```bash
# List local branches
git branch

# List all branches (including remote)
git branch -a

# List with last commit info
git branch -v
```

## Merging Branches

When your feature is complete, merge it back:

```bash
# Switch to main
git checkout main

# Merge feature branch
git merge feature-login
```

### Fast-Forward Merge

If main hasn't changed, Git just moves the pointer:

```
Before:  main: A---B---C
                       \
         feature:       D---E

After:   main: A---B---C---D---E
```

### Three-Way Merge

If main has new commits, Git creates a merge commit:

```
Before:  main: A---B---C---F
                       \
         feature:       D---E

After:   main: A---B---C---F---G (merge commit)
                       \     /
         feature:       D---E
```

## Resolving Conflicts

When the same lines are changed in both branches:

```bash
git merge feature-login
# CONFLICT: Merge conflict in file.txt
```

Open the file to see conflict markers:

```
<<<<<<< HEAD
Code from main branch
=======
Code from feature branch
>>>>>>> feature-login
```

1. Edit the file to resolve the conflict
2. Remove the conflict markers
3. Stage and commit:

```bash
git add file.txt
git commit -m "Merge feature-login, resolve conflicts"
```

## Deleting Branches

After merging:

```bash
# Delete local branch
git branch -d feature-login

# Force delete (if not merged)
git branch -D feature-login
```

## Rebasing

Alternative to merging - replays commits on top of another branch:

```bash
git checkout feature-login
git rebase main
```

```
Before:  main: A---B---C
                   \
         feature:   D---E

After:   main: A---B---C
                       \
         feature:       D'---E'
```

### When to Rebase vs Merge

| Rebase | Merge |
|--------|-------|
| Clean, linear history | Preserves complete history |
| Private branches | Shared branches |
| Before merging to main | After pulling changes |

**Golden Rule**: Never rebase commits that have been pushed to a shared branch.

## Stashing Changes

Save work temporarily without committing:

```bash
# Stash changes
git stash

# List stashes
git stash list

# Apply most recent stash
git stash pop

# Apply specific stash
git stash apply stash@{1}

# Drop a stash
git stash drop stash@{0}
```

## Summary

| Command | Description |
|---------|-------------|
| `git branch <name>` | Create branch |
| `git switch <name>` | Switch branch |
| `git switch -c <name>` | Create and switch |
| `git merge <branch>` | Merge branch |
| `git rebase <branch>` | Rebase onto branch |
| `git branch -d <name>` | Delete branch |
| `git stash` | Stash changes |

In the next chapter, we'll learn about working with remote repositories.
