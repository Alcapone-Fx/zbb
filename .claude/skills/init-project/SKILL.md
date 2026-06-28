---
name: init-project
description: >
  Initializes a new project from docs/PRD.md and docs/TRD.md.
  Generates CLAUDE.md adapted to the actual stack in the TRD, docs/CONVENTIONS.md with project-specific conventions, and docs/PLAN.md with all modules, dependencies, and parallel/sequential classification.
  Run once at the start of each new project.
invocation: user
allowed-tools:
  - Read
  - Write
  - Glob
---

## Goal
Read PRD.md and TRD.md and produce three files that will guide the entire development:
1. `CLAUDE.md` — adapted to the actual stack in the TRD
2. `docs/CONVENTIONS.md` — project-specific conventions
3. `docs/PLAN.md` — full module map with dependencies and classification

## Steps

### 1. Read the source documents
- Read `docs/PRD.md` in full
- Read `docs/TRD.md` in full
- Identify the tech stack defined in the TRD
- Identify all modules described in both documents
- Identify all platforms (api, admin, mobile, web, cli, etc.) defined in the TRD

### 2. Generate CLAUDE.md from the TRD stack
Replace the existing `CLAUDE.md` entirely. Include:

- **Stack** section listing the exact technologies from the TRD (framework, language, database, auth, deploy, testing)
- **Build commands** section with the actual commands for this stack
- **Universal rules** — keep these brief, stack-agnostic, and focused on what matters:
  - Strict typing (no implicit any or runtime type assumptions)
  - Runtime input validation on all endpoints
  - Soft-delete — never hard-delete records
  - No secrets in source code
  - Explicit error handling
  - Migration rule: never run autonomously, mark as pending in PLAN.md
  - Auth on every route
  - Before closing a worktree: update PLAN.md + CONVENTIONS.md + open PR
- **Common AI pitfalls for this stack** — list 3-5 mistakes the AI commonly makes with the detected stack

Keep CLAUDE.md under 80 lines. If something is project-specific, it belongs in CONVENTIONS.md, not here.

### 3. Generate docs/CONVENTIONS.md
Fill each section of the template based on the TRD:

- **Stack** — exact versions from the TRD
- **Folder structure** — infer from the stack and project structure in the TRD
- **Naming conventions** — adapt to the stack language and ecosystem
- **Validation patterns** — use the validation library in the TRD stack
- **Error handling** — define the pattern for this project
- **Auth patterns** — infer from the TRD auth section
- **Testing conventions** — adapt to the testing tools in the TRD

Leave the **Architecture decisions** table empty — agents fill it during development.

### 4. Generate docs/PLAN.md
Analyze PRD.md and TRD.md to extract all modules.

For each module:
- Determine real dependencies (does it need data or contracts from another module?)
- Classify: **parallel** (no dependencies) or **sequential** (has dependencies)
- Identify tasks per platform (use the platforms from the TRD, not generic BE/FE)
- Write AI Notes with technical context from the TRD: what exists, where it is, what not to reinvent

Fill the module summary table first, then generate one detailed block per module.

If there are conflicts or ambiguities between PRD and TRD, add an ⚠️ Ambiguities section at the bottom of PLAN.md. Do not assume — surface the conflict for the TL to resolve.

### 5. Print summary to dev

```
✅ /init-project complete

Files generated:
  CLAUDE.md           — stack: [detected stack]
  docs/CONVENTIONS.md — project conventions
  docs/PLAN.md        — [N] modules identified

Ready to launch (wave 1 — no dependencies):
  [list of parallel modules]

Sequential (waiting on dependencies):
  [module] → depends on: [dependencies]

⚠️ Ambiguities to resolve before approving:
  [list, or "none"]

Next step:
  Review and approve docs/PLAN.md and docs/CONVENTIONS.md (~10 min)
  Then run /next-wave
```

## Rules
- Do NOT modify docs/PRD.md or docs/TRD.md — they are immutable source documents
  (Note: PRD and TRD may be updated later for new features — but never by this skill)
- The generated files are drafts — the TL reviews before launching worktrees
- Use platforms from the TRD (api, admin, mobile, etc.) — not generic BE/FE labels
