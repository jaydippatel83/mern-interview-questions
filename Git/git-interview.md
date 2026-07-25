# 🌿 Git Interview Questions

> Branching · Merge vs Rebase · Conflicts · Undoing changes · Workflows · Collaboration

---

## Table of Contents

1. [Fundamentals](#fundamentals)
2. [The Three Areas](#the-three-areas)
3. [Branching](#branching)
4. [Merge vs Rebase](#merge-vs-rebase)
5. [Conflicts](#conflicts)
6. [Undoing Things](#undoing-things)
7. [Stash, Cherry-pick & Friends](#stash-cherry-pick--friends)
8. [Remote Repositories](#remote-repositories)
9. [Workflows](#workflows)
10. [Debugging with Git](#debugging-with-git)
11. [Advanced](#advanced)
12. [Rapid Fire](#rapid-fire)

---

# Fundamentals

## What is Git and how does it differ from other VCS?

### Answer

A **distributed** version control system. Every clone is a full repository with the complete history — you can commit, branch, merge and view history with no network connection.

| | Centralised (SVN) | Distributed (Git) |
|---|---|---|
| History | On the server only | Full copy locally |
| Offline work | ❌ | ✅ |
| Branching | Expensive (copies directories) | **Cheap** (a 41-byte pointer) |
| Speed | Network-bound | Local, near-instant |
| Backup | Single server | Every clone is a backup |

### How Git actually stores data

Git doesn't store diffs — it stores **snapshots** of the whole tree, with unchanged files referenced by the same object.

```
Object types:
  blob    → file contents
  tree    → directory listing (names → blobs/trees)
  commit  → a tree + parent(s) + author + message
  tag     → a named pointer to a commit

Every object is identified by the SHA-1/SHA-256 hash of its contents.
Change one byte → different hash → a different object.
That's why Git history is tamper-evident.
```

```bash
git cat-file -p HEAD            # inspect the commit object
git cat-file -p HEAD^{tree}     # the tree it points to
git hash-object file.txt        # compute the hash of a file
```

**Interview Tip:** "Git stores snapshots, not diffs" is the answer that shows real understanding. Diffs are *computed* when you ask for them; they're not the storage format. That's why `git checkout` of any old commit is instant.

---

## What is a commit?

### Answer

An immutable snapshot containing: a tree hash, parent commit hash(es), author, committer, timestamp and message.

```
commit a1b2c3d
├── tree:      f4e5d6c        (the full project state)
├── parent:    9x8y7z6        (previous commit; two parents for a merge)
├── author:    Jaydip <j@x.com> 1730000000 +0530
├── committer: Jaydip <j@x.com> 1730000000 +0530
└── message:   "feat: add user authentication"
```

Because the hash covers the parent, changing any historical commit changes **every** commit after it. That's why rewriting history produces new hashes.

```bash
git commit -m "feat: add login"
git commit -am "fix: typo"          # -a stages tracked files (NOT new files)
git commit --amend                  # rewrite the LAST commit
git commit --amend --no-edit        # add staged changes, keep the message
git commit --no-verify              # skip hooks (use sparingly)
```

### Good commit messages

```
feat: add JWT refresh token rotation

Access tokens now expire in 15 minutes with rotating refresh tokens
stored in HttpOnly cookies. Detects token reuse and revokes the family.

Closes #142

─────────────────────────────────────
Conventional Commits:
  feat:     new feature          → MINOR version
  fix:      bug fix              → PATCH version
  docs:     documentation
  style:    formatting only
  refactor: no behaviour change
  perf:     performance
  test:     tests
  chore:    build/tooling
  feat!:    BREAKING CHANGE      → MAJOR version
```

**Interview Tip:** Conventional Commits enable automated semantic versioning and changelog generation (semantic-release, changesets). Mentioning that connects the convention to a real benefit rather than just style preference.

---

# The Three Areas

## Explain the working directory, staging area and repository.

### Answer

```
Working Directory  →  Staging Area (Index)  →  Repository (.git)  →  Remote
       │                      │                       │                 │
   git add ─────────────────► │                       │                 │
                         git commit ────────────────► │                 │
                                                 git push ────────────► │
       │ ◄──────────────── git checkout/restore  ◄────┘
       │ ◄──────────────────────────────── git fetch + merge ◄──────────┘
```

| Area | What it is |
|---|---|
| **Working directory** | Your actual files on disk |
| **Staging area (index)** | What will go into the next commit |
| **Repository** | Committed history in `.git` |
| **Stash** | A temporary shelf for uncommitted work |

### Why the staging area exists

It lets you craft a commit that's smaller than everything you've changed — commit the bug fix now, keep the unrelated refactor for a separate commit.

```bash
git add -p                # ⭐ interactively stage HUNKS, not whole files
                          # y/n/s(plit)/e(dit)/q
git add file.txt
git add .                 # everything in the current directory
git add -A                # everything, including deletions

git status
git status -s             # short format
git diff                  # working directory vs staging
git diff --staged         # staging vs last commit
git diff HEAD             # working directory vs last commit
git diff main..feature    # between branches
git diff --stat           # summary only
```

**Interview Tip:** `git add -p` is the answer to "how do you keep commits clean?" It lets you split a messy working directory into several logical commits — a habit that makes code review far easier and reveals real Git fluency.

---

# Branching

## How do branches work in Git?

### Answer

A branch is just a **41-byte file containing a commit hash**. That's why creating one is instant.

```
.git/refs/heads/main     → a1b2c3d...
.git/refs/heads/feature  → 9x8y7z6...
.git/HEAD                → ref: refs/heads/main    ← where you are now
```

```
      A───B───C  main
               \
                D───E  feature
```

```bash
# Create & switch
git switch -c feature/auth          # modern
git checkout -b feature/auth        # classic
git switch main
git switch -                        # previous branch

# List
git branch                          # local
git branch -a                       # + remote
git branch -vv                      # with tracking info and last commit
git branch --merged                 # already merged (safe to delete)
git branch --no-merged

# Delete
git branch -d feature/auth          # safe — refuses if unmerged
git branch -D feature/auth          # force
git push origin --delete feature/auth

# Rename
git branch -m old-name new-name

# Cleanup — remove local branches whose remote is gone
git fetch --prune
git branch -vv | grep ': gone]' | awk '{print $1}' | xargs -r git branch -D
```

### Naming conventions

```
feature/user-authentication
fix/login-redirect-loop
hotfix/payment-timeout
chore/upgrade-node-20
release/v2.1.0
```

### `HEAD` and detached HEAD

```bash
git checkout a1b2c3d        # detached HEAD — you're not on a branch
# Commits here are NOT on any branch and will be garbage collected

git switch -c new-branch    # ✅ rescue them by creating a branch
git switch main             # ⚠️ abandons them (recoverable via reflog for ~30 days)
```

**Interview Tip:** "A branch is a movable pointer to a commit" is the sentence to say. It explains why branching is instant, why deleting a branch doesn't delete commits, and why `git reset --hard` just moves a pointer.

---

# Merge vs Rebase

## What is the difference between merge and rebase?

### Answer

```
BEFORE:
      A───B───C  main
           \
            D───E  feature

MERGE (git switch main && git merge feature):
      A───B───C───M  main
           \     /
            D───E    feature
  ✅ Preserves exact history
  ❌ Merge commits clutter the log

REBASE (git switch feature && git rebase main):
      A───B───C  main
                 \
                  D'──E'  feature
  ✅ Linear, readable history
  ❌ REWRITES commits (new hashes: D→D', E→E')
```

| | Merge | Rebase |
|---|---|---|
| History | Preserved exactly | Rewritten, linear |
| New commits | Creates a merge commit | Replays existing ones |
| Hashes | Unchanged | **Changed** |
| Conflicts | Resolved once | Possibly once per commit |
| Safe on shared branches | ✅ | ❌ **Never** |

### The golden rule of rebasing

> **Never rebase commits that exist outside your local repository.**

Rebasing a pushed branch that others have based work on forces everyone to fix their history. If you must, use `--force-with-lease` and tell your team.

```bash
# Merge strategies
git merge feature                    # merge commit (or fast-forward if possible)
git merge --no-ff feature            # ALWAYS create a merge commit ⭐
git merge --squash feature           # combine all commits into one staged change
git merge --abort

# Fast-forward — no divergence, just move the pointer
      A───B  main
           \
            C───D  feature
  → git merge feature (ff) →  A───B───C───D  main

# Rebase
git rebase main
git rebase --continue                # after resolving a conflict
git rebase --skip
git rebase --abort                   # ⭐ bail out safely
git rebase --onto main feature~3 feature

# Pull strategies
git pull                             # fetch + merge (default)
git pull --rebase                    # fetch + rebase — cleaner ⭐
git config --global pull.rebase true
```

### Interactive rebase — cleaning up before a PR

```bash
git rebase -i HEAD~4
```

```
pick a1b2c3d feat: add login form
squash 9x8y7z6 fix typo              # combine into the previous commit
reword 5m6n7o8 add validation        # edit the message
edit 3p4q5r6 refactor auth           # stop here to amend
drop 7s8t9u0 debug logging           # remove entirely

# Commands: pick, reword, edit, squash, fixup, drop, exec
# fixup = squash but discard the message
```

**Interview Tip:** The practical team answer: **rebase your local feature branch onto main to stay current, then merge into main with `--no-ff`.** You get clean linear feature history *and* a clear record of when each feature landed. That's a real workflow, not just definitions.

---

# Conflicts

## How do you resolve merge conflicts?

### Answer

Conflicts happen when the same lines changed in both branches, or one branch modified a file the other deleted.

```
<<<<<<< HEAD
const timeout = 5000;          ← your current branch
=======
const timeout = 10000;         ← the incoming branch
>>>>>>> feature/config
```

```bash
# 1. See what's conflicted
git status
git diff --name-only --diff-filter=U

# 2. Understand BOTH sides
git log --merge -p path/to/file        # commits that touched it on both sides
git diff                                # combined diff

# 3. Resolve — edit the file, remove ALL markers
# Or take one side wholesale:
git checkout --ours file.txt           # keep the current branch's version
git checkout --theirs file.txt         # take the incoming version
# ⚠️ During a REBASE, "ours" and "theirs" are SWAPPED
#    (ours = the branch you're rebasing ONTO)

# 4. Mark resolved and continue
git add file.txt
git commit                              # for merge
git rebase --continue                   # for rebase

# 5. Or give up
git merge --abort
git rebase --abort
```

### Reducing conflicts

```bash
# Better conflict markers — shows the COMMON ANCESTOR too
git config --global merge.conflictstyle zdiff3
```

```
<<<<<<< HEAD
const timeout = 5000;
||||||| base
const timeout = 3000;          ← what it was ORIGINALLY — huge context
=======
const timeout = 10000;
>>>>>>> feature
```

```bash
# Remember conflict resolutions and reapply them automatically
git config --global rerere.enabled true
# Extremely useful during long rebases where the same conflict recurs

# Use a merge tool
git mergetool
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'
```

### Habits that prevent conflicts

```
✅ Small, short-lived branches (merge within 1–2 days)
✅ Pull/rebase from main frequently
✅ Agree on formatting (Prettier) — most conflicts are whitespace
✅ Avoid multiple people editing the same file
✅ Commit generated files? Don't — add them to .gitignore
```

**Interview Tip:** `merge.conflictstyle = zdiff3` and `rerere.enabled` are two config settings that genuinely improve daily Git life and almost nobody mentions them. Showing the base version in a conflict tells you *what changed*, not just the two end states.

---

# Undoing Things

## How do you undo changes in Git?

### Answer

This is the most-asked Git interview topic. The answer depends on **where** the change is.

```bash
# ============ UNSTAGED changes in the working directory ============
git restore file.txt                    # discard changes ⚠️ UNRECOVERABLE
git restore .                           # discard everything
git checkout -- file.txt                # old syntax

# ============ STAGED changes ============
git restore --staged file.txt           # unstage, keep the changes
git reset HEAD file.txt                 # old syntax

# ============ The LAST COMMIT ============
git commit --amend                      # change the message or add files
git commit --amend --no-edit

git reset --soft HEAD~1                 # undo commit, KEEP changes STAGED
git reset --mixed HEAD~1                # undo commit, keep changes UNSTAGED (default)
git reset --hard HEAD~1                 # ⚠️ undo commit AND DELETE the changes

# ============ A PUSHED commit ============
git revert HEAD                         # ⭐ creates a NEW commit that undoes it
git revert a1b2c3d
git revert -m 1 <merge-commit>          # revert a merge (keep parent 1)
# ✅ SAFE on shared branches — doesn't rewrite history

# ============ Untracked files ============
git clean -n                            # ⭐ DRY RUN — always do this first
git clean -fd                           # delete untracked files and directories
git clean -fdx                          # also delete .gitignore'd files
```

### `reset` vs `revert` vs `restore`

| Command | Affects | History | Safe on shared branches |
|---|---|---|---|
| `restore` | Working dir / index | Untouched | ✅ |
| `reset` | Branch pointer | **Rewrites** | ❌ |
| `revert` | Creates a new commit | Preserved | ✅ |

```
reset --soft HEAD~1:   commit undone, changes STAGED
reset --mixed HEAD~1:  commit undone, changes in working dir
reset --hard HEAD~1:   commit undone, changes GONE
```

### The reflog — your safety net

```bash
git reflog                              # every position HEAD has been in
```

```
a1b2c3d HEAD@{0}: reset: moving to HEAD~1
9x8y7z6 HEAD@{1}: commit: feat: add feature      ← the "lost" commit
5m6n7o8 HEAD@{2}: checkout: moving to feature
```

```bash
git reset --hard HEAD@{1}               # ⭐ recover from a bad reset
git switch -c recovered 9x8y7z6         # or branch from the lost commit

git reflog show feature                 # reflog for a specific branch
```

**Interview Tip:** *"Almost nothing in Git is truly lost for ~30 days — the reflog records every HEAD movement, and orphaned commits survive until garbage collection."* The exception is uncommitted working-directory changes discarded with `restore` or `clean` — those are genuinely gone. That distinction is exactly what interviewers probe.

---

# Stash, Cherry-pick & Friends

```bash
# ============ STASH — shelve work temporarily ============
git stash                               # stash tracked changes
git stash -u                            # include untracked files
git stash -a                            # include ignored files too
git stash push -m "wip: refactoring auth"
git stash push -m "partial" -- src/auth.js    # stash specific paths

git stash list
git stash show -p stash@{0}             # view the diff
git stash apply                         # apply, KEEP in the stash list
git stash pop                           # apply and REMOVE from the list
git stash drop stash@{1}
git stash clear                         # ⚠️ delete all stashes
git stash branch new-branch stash@{0}   # create a branch from a stash

# ============ CHERRY-PICK — copy a commit to another branch ============
git cherry-pick a1b2c3d
git cherry-pick a1b2c3d..f4e5d6c        # a range
git cherry-pick -n a1b2c3d              # apply without committing
git cherry-pick -x a1b2c3d              # note the original hash in the message
git cherry-pick --continue / --abort
# Use for: backporting a hotfix from main to a release branch

# ============ TAGS ============
git tag v1.0.0                          # lightweight
git tag -a v1.0.0 -m "Release 1.0.0"    # ⭐ annotated — has author, date, message
git tag -s v1.0.0 -m "Signed"           # GPG signed
git tag                                 # list
git tag -l "v1.*"
git show v1.0.0
git push origin v1.0.0
git push origin --tags
git tag -d v1.0.0
git push origin --delete v1.0.0
git checkout v1.0.0                     # detached HEAD at that tag
```

**Interview Tip:** Always use **annotated tags** for releases (`-a`). Lightweight tags are just a pointer with no metadata — no tagger, no date, no message — and some tooling (like `git describe`) treats them differently.

---

# Remote Repositories

```bash
# ============ REMOTES ============
git remote -v
git remote add origin git@github.com:user/repo.git
git remote add upstream git@github.com:original/repo.git   # for forks
git remote set-url origin git@github.com:user/new.git
git remote rename origin github
git remote remove upstream
git remote show origin

# ============ FETCH vs PULL ============
git fetch origin                        # ⭐ download, DON'T merge — always safe
git fetch --all --prune                 # + remove deleted remote branches
git pull                                # fetch + merge
git pull --rebase                       # fetch + rebase ⭐ cleaner
git pull --ff-only                      # fail rather than create a merge commit

# See what you fetched before merging
git log HEAD..origin/main
git diff HEAD origin/main

# ============ PUSH ============
git push origin main
git push -u origin feature              # set upstream tracking
git push --all
git push --tags

# ⚠️ Force push
git push --force                        # ❌ overwrites blindly
git push --force-with-lease             # ⭐ fails if someone else pushed
git push --force-with-lease --force-if-includes    # even safer

# ============ SYNC A FORK ============
git remote add upstream git@github.com:original/repo.git
git fetch upstream
git switch main
git merge upstream/main                 # or: git rebase upstream/main
git push origin main
```

### `--force` vs `--force-with-lease`

```
--force              overwrites the remote unconditionally
                     ⚠️ If a colleague pushed since your last fetch, their work is GONE

--force-with-lease   only succeeds if the remote is where you last saw it
                     ✅ Refuses if someone else pushed in the meantime
```

**Interview Tip:** `--force-with-lease` should be your default. It gives you the ability to fix your own branch after a rebase while protecting against silently destroying a teammate's work. Many teams ban plain `--force` outright via branch protection.

---

# Workflows

## What Git workflows exist and when do you use each?

### Answer

### 1. GitHub Flow — simple, continuous deployment

```
main ──●──────●──────●──────●──  (always deployable)
        \    /  \   /
         ●──●    ●─●
      feature   feature
```

```
1. Branch from main
2. Commit and push
3. Open a PR
4. Review + CI
5. Merge to main
6. Deploy immediately
```

✅ Simple, fast, ideal for web apps with continuous deployment
❌ No formal release management

### 2. Git Flow — structured releases

```
main     ──●───────────────●────  (production, tagged)
            \             /
release      \       ●───●
              \     /
develop   ──●──●───●───●───●──   (integration)
             \     /
feature       ●───●
```

```
Branches: main, develop, feature/*, release/*, hotfix/*
```

✅ Clear structure, supports parallel versions
❌ Heavy for continuous deployment; long-lived branches cause big merges

### 3. Trunk-Based Development — what high-performing teams do

```
main ──●─●─●─●─●─●─●──  (everyone commits here)
        \/  \/  \/
      short-lived branches (< 1 day)
```

```
- Branches live hours, not weeks
- Incomplete work hidden behind FEATURE FLAGS
- Requires strong CI and test coverage
```

✅ Minimal merge conflicts, fastest feedback, enables true CI
❌ Requires discipline and feature flag infrastructure

### 4. Fork & Pull — open source

```
upstream/main ──●──●──●
                     ↑ pull request
your-fork/main ──●──●──●
```

| Workflow | Best for |
|---|---|
| GitHub Flow | Web apps, SaaS, continuous deployment |
| Git Flow | Versioned software, mobile apps, multiple supported versions |
| Trunk-based | High-velocity teams with strong CI |
| Fork & pull | Open source, external contributors |

**Interview Tip:** Git Flow's own author published a note saying it's often over-applied — it was designed for software with multiple versions in production, not for a continuously deployed web app. Saying that shows you choose a workflow based on the release model, not by default.

---

## What makes a good pull request?

```
✅ Small — under ~400 lines changed. Review quality collapses beyond that.
✅ One logical change per PR
✅ Clear title (Conventional Commits) and description of WHY
✅ Screenshots/recordings for UI changes
✅ Tests included
✅ CI green before requesting review
✅ Self-reviewed first
✅ Linked to the issue

Description template:
  ## What
  ## Why
  ## How to test
  ## Screenshots
  ## Checklist
```

```bash
# Branch protection (configure on GitHub)
- Require PR before merging
- Require N approvals
- Require status checks to pass
- Require branches to be up to date
- Require conversation resolution
- No force pushes to main
- Require signed commits (optional)
```

### Merge strategies for PRs

| | Result | Use when |
|---|---|---|
| **Merge commit** | Full history + a merge commit | You want to preserve branch context |
| **Squash and merge** ⭐ | One clean commit on main | Messy WIP commits; most common default |
| **Rebase and merge** | Linear, all commits preserved | Clean commit history already |

**Interview Tip:** "Squash and merge" is the pragmatic default for most teams — developers can commit freely on their branch ("wip", "fix typo") and main stays clean with one commit per feature that's easy to revert.

---

# Debugging with Git

## How do you find which commit introduced a bug?

### Answer

```bash
# ============ BISECT — binary search through history ============
git bisect start
git bisect bad                          # current commit is broken
git bisect good v1.0.0                  # this version worked

# Git checks out the midpoint; you test and mark it:
git bisect good     # or
git bisect bad

# Repeat — 1000 commits takes only ~10 steps (log₂)
git bisect reset                        # return to where you started

# ⭐ Automate it entirely
git bisect start HEAD v1.0.0
git bisect run npm test                 # Git finds the bad commit by itself
git bisect run ./check.sh               # any script: exit 0 = good, non-zero = bad
```

```bash
# ============ BLAME — who changed this line and why ============
git blame file.js
git blame -L 50,60 file.js              # specific lines
git blame -w file.js                    # ignore whitespace changes
git blame -C file.js                    # detect moved/copied code

# Ignore bulk-formatting commits so blame stays useful
git blame --ignore-revs-file .git-blame-ignore-revs file.js
git config blame.ignoreRevsFile .git-blame-ignore-revs

# ============ LOG — search history ============
git log --oneline --graph --all --decorate
git log -S "functionName"               # commits that ADDED/REMOVED this string ⭐
git log -G "regex"                      # commits whose diff matches a regex
git log --author="Jaydip"
git log --since="2 weeks ago" --until="yesterday"
git log --grep="fix"                    # search commit messages
git log -p file.js                      # full diff history of one file
git log --follow file.js                # ⭐ track it across RENAMES
git log --stat
git log main..feature                   # commits in feature, not in main
git log --no-merges

# Who changed the most
git shortlog -sn --no-merges
```

**Interview Tip:** `git log -S "someString"` (the "pickaxe") is the fastest way to answer "when was this function removed?" — it finds commits where the *number of occurrences* of a string changed, which `--grep` (which only searches messages) can't do.

---

# Advanced

```bash
# ============ WORKTREES — multiple branches checked out at once ============
git worktree add ../hotfix hotfix/urgent
git worktree add -b review ../review origin/pr-123
git worktree list
git worktree remove ../hotfix
# ✅ Review a PR or fix a hotfix WITHOUT stashing your current work

# ============ SUBMODULES — a repo inside a repo ============
git submodule add https://github.com/user/lib.git libs/lib
git clone --recurse-submodules <url>
git submodule update --init --recursive
git submodule update --remote            # pull the latest
# ⚠️ Painful in practice — prefer a package manager or a monorepo

# ============ HOOKS ============
.git/hooks/
  pre-commit       # lint, format, run fast tests
  commit-msg       # validate the message format
  pre-push         # run the test suite
  post-merge       # npm install if package-lock changed

# Husky + lint-staged — hooks that are actually versioned and shared
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,jsx,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

```bash
# ============ GIT LFS — large files ============
git lfs install
git lfs track "*.psd" "*.mp4"
git add .gitattributes
# Stores pointers in Git, actual files on an LFS server

# ============ SPARSE CHECKOUT — huge monorepos ============
git clone --filter=blob:none --sparse <url>
git sparse-checkout set apps/web packages/ui
# Only checks out the directories you need

# ============ SIGNED COMMITS ============
git config --global user.signingkey <KEY_ID>
git config --global commit.gpgsign true
git commit -S -m "signed commit"
git log --show-signature

# ============ REWRITING HISTORY ============
git filter-repo --path secrets.txt --invert-paths   # remove a file from ALL history
# ⚠️ Rewrites every commit hash — everyone must re-clone
# ⚠️ Does NOT un-leak a secret — ROTATE it, the old value is compromised

# ============ MAINTENANCE ============
git gc --aggressive --prune=now         # compress objects
git count-objects -vH                   # repository size
git fsck                                # verify integrity
```

### Useful config

```bash
git config --global user.name "Jaydip Patel"
git config --global user.email "blockchainwebdir@gmail.com"
git config --global init.defaultBranch main
git config --global pull.rebase true
git config --global push.default current
git config --global push.autoSetupRemote true      # ⭐ no more "set upstream" errors
git config --global fetch.prune true
git config --global rerere.enabled true
git config --global merge.conflictstyle zdiff3
git config --global core.editor "code --wait"
git config --global diff.algorithm histogram

# Aliases
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.last "log -1 HEAD --stat"
git config --global alias.unstage "restore --staged"
git config --global alias.amend "commit --amend --no-edit"
```

### .gitignore

```
node_modules/
dist/
build/
.env
.env.*
!.env.example
*.log
.DS_Store
coverage/
.vscode/
.idea/

# Already-tracked files aren't affected by .gitignore:
git rm -r --cached node_modules
git commit -m "chore: stop tracking node_modules"
```

---

# Rapid Fire

**What is the difference between `git fetch` and `git pull`?**
`fetch` downloads without changing your working files (always safe). `pull` = fetch + merge (or rebase).

**What is `origin`?**
The conventional name for the remote you cloned from. Nothing special — just a default name.

**What is `HEAD`?**
A pointer to your current position — usually a branch reference, or a commit directly (detached HEAD).

**What is `HEAD~1` vs `HEAD^1`?**
`~` goes back through the *first* parent N generations. `^` selects which *parent* of a merge commit. `HEAD~2` = grandparent; `HEAD^2` = the merge's second parent.

**What is a fast-forward merge?**
When the target branch hasn't diverged, Git just moves the pointer forward — no merge commit.

**What is `--no-ff` and why use it?**
Forces a merge commit even when fast-forward is possible, preserving the fact that a feature branch existed.

**What is a squash merge?**
Combines all of a branch's commits into one commit on the target branch.

**What is `git reflog` and when does it save you?**
A log of every HEAD movement, kept ~90 days. Recovers from a bad `reset --hard`, a deleted branch, or a botched rebase.

**How do you undo a pushed commit?**
`git revert` — it creates a new commit that undoes the change without rewriting shared history.

**What is a detached HEAD?**
HEAD points at a commit instead of a branch. New commits there belong to no branch and will eventually be garbage collected.

**What is `.gitignore` vs `.gitattributes`?**
`.gitignore` excludes files. `.gitattributes` controls how Git treats files — line endings, diff drivers, merge strategies, LFS.

**How do you ignore a file that's already tracked?**
Add it to `.gitignore`, then `git rm --cached <file>` and commit.

**What is a bare repository?**
A repo with no working directory (`repo.git`) — what servers host.

**What is `git cherry-pick` used for?**
Copying specific commits to another branch, typically backporting a hotfix to a release branch.

**What is `git bisect`?**
Binary search through history to find the commit that introduced a bug. `git bisect run` automates it.

**What is a shallow clone?**
`git clone --depth 1` fetches only recent history — much faster for CI where you don't need the full log.

**What is `git blame --ignore-revs-file`?**
Skips specified commits (like a repo-wide Prettier run) so blame shows who wrote the logic, not who reformatted it.

**How do you rename a branch that's already pushed?**
`git branch -m new`, `git push origin -u new`, `git push origin --delete old`.

**What is a merge conflict marker?**
`<<<<<<<`, `=======`, `>>>>>>>` delimiting the two versions. With `zdiff3` you also get `|||||||` showing the common ancestor.

**Why did my rebase produce different commit hashes?**
Because a commit's hash includes its parent. Changing the parent changes the hash, cascading through every subsequent commit.

**What is `git rerere`?**
"Reuse recorded resolution" — remembers how you resolved a conflict and reapplies it automatically next time.

**How do you find a large file bloating the repo?**
`git rev-list --objects --all | git cat-file --batch-check | sort -k3 -n | tail`, then remove it with `git filter-repo`.

**What is a monorepo and how does Git handle it?**
One repo containing multiple projects. Git handles it with sparse checkout, partial clone, and tooling like Turborepo or Nx for affected-only builds.

**What are signed commits and why do they matter?**
GPG/SSH signatures proving authorship. They prevent commit spoofing — anyone can set `user.email` to yours without them.

---

## 📌 Interview Checklist

- [ ] Explain the three areas and what `git add -p` gives you
- [ ] Merge vs rebase — draw both, and state the golden rule
- [ ] `reset` vs `revert` vs `restore` — pick the right one per scenario
- [ ] Recover a commit after `git reset --hard`
- [ ] Resolve a conflict, including during a rebase (ours/theirs swap)
- [ ] Why is `--force-with-lease` safer than `--force`?
- [ ] Use `git bisect` to find a regression
- [ ] Compare GitHub Flow, Git Flow and trunk-based
- [ ] What makes a good PR?
- [ ] How do you remove a secret from Git history — and why isn't that enough?
