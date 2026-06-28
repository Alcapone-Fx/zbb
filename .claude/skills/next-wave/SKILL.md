---
name: next-wave
description: >
  Evaluates the current state of docs/PLAN.md and determines what to
  build next. Detects completed worktrees merged into main, updates
  module statuses, unblocks sequential modules, and prints the commands
  to launch the next wave of worktrees — one per terminal.
  Run at project start and after every local git merge.
invocation: user
allowed-tools:
  - Read
  - Write
  - Bash
---

# /next-wave

## Goal
Two modes, same command:

**At project start:** identify parallel modules, print worktree launch commands.

**After a merge:** detect which worktrees landed in main, update PLAN.md,
unblock sequential modules that are now ready, print next wave commands.

## Steps

### 1. Detect post-merge state
Run:
```bash
git branch --merged main
```
Cross-reference with modules listed as 🔄 in PLAN.md.
- Branch in `--merged main` + module is 🔄 → just merged, mark ✅
- No 🔄 branches merged → first run, skip to step 3

### 2. Update PLAN.md (post-merge only)
For each newly merged module:
- Set status ✅, record date
- Run: git worktree remove .claude/worktrees/wt-[name] --force
- Check every sequential module: if all its dependencies are now ✅,
  mark it as unblocked (still ⏳ but ready to launch)

### 3. Validate before launching
- `git status` is clean on main
- Project builds successfully (use build command from CLAUDE.md)
- No pending unapproved migrations blocking the next modules

If any check fails: report and stop. Do not print launch commands.

### 4. Identify next wave
Modules ready when: status ⏳ AND all dependencies ✅.
Maximum 5 at once — more exceeds the dev's review capacity.

### 5. Update PLAN.md for next wave
```
- **Status:** 🔄 in progress
- **Worktree:** wt-[module-name]
```

### 6. Print output

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Next wave
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Open a new terminal for each:

  Terminal 2:
  claude
  claude --worktree wt-auth

  Terminal 3:
  claude
  claude --worktree wt-products

Agents run unattended in auto mode.
Check a terminal only if the agent pauses.

─────────────────────────────────────
Waiting on dependencies:
  PAYMENTS  → AUTH, PRODUCTS
  DASHBOARD → CLIENTS, PAYMENTS

After each local merge → run /next-wave again from Terminal 1.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If `which tmux` succeeds, append:
```
tmux one-liner (optional):
  tmux new-session -d -s [project] \; \
    new-window -n wt-auth    "claude --worktree wt-auth" \; \
    new-window -n wt-products "claude --worktree wt-products" \; \
    attach
```

## Rules
- Max 5 worktrees at once
- Never launch if main does not build
- Never run migrations — mark as pending in PLAN.md
- /next-wave owns the full coordination loop — there is no separate orchestrator agent
