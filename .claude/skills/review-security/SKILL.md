---
name: review-security
description: >
  Security audit that runs automatically as part of each worktree's /goal before the PR is opened. Verifies auth, input validation, secrets, and migrations. Read-only — never writes code, only reports findings.
invocation: auto
allowed-tools:
  - Read
  - Glob
---

## Goal
Verify the module does not introduce security vulnerabilities before merging to main. Runs inside the worktree on the module's files.

## Checklist

### 1. Authentication and authorization
- [ ] Every route that requires auth has the appropriate guard/middleware
- [ ] Public routes are explicitly marked as such
- [ ] No new routes exist without an explicit auth decision (protected or public)
- [ ] Guards use the project's central auth mechanism — no custom per-module implementations

### 2. Input validation
- [ ] All write endpoints (POST/PUT/PATCH) validate the request body with the project's validation library
- [ ] Path params (IDs) are validated for correct format
- [ ] Query params have defined types and limits (pagination with maximums)
- [ ] Types are not used as runtime validation — a validation schema must exist

### 3. Secrets and sensitive data
- [ ] No API keys, tokens, passwords, or connection strings in source code
- [ ] No secrets in comments or hardcoded strings
- [ ] Environment variables referenced through the project's config mechanism, never inlined
- [ ] No sensitive data in logs

### 4. Database
- [ ] All queries use the project's ORM or query builder (no raw SQL with unsanitized inputs)
- [ ] If raw SQL exists: inputs are parameterized, never concatenated
- [ ] Migrations generated correctly and marked as pending in PLAN.md
- [ ] No unconditional bulk updates or deletes (always a `where` clause)

### 5. Data exposure
- [ ] Responses do not expose internal fields (passwords, tokens, internal flags)
- [ ] Explicit field selection on queries — no returning full records when a subset suffices
- [ ] All collection endpoints have pagination — no unbounded responses

### 6. Dependencies
- [ ] No new dependencies with known critical vulnerabilities
- [ ] If a new dependency was added: reason documented in the PR description

## General checks (stack-agnostic)
- Protected routes cannot be accessed without valid credentials
- No hardcoded credentials anywhere in the codebase
- All external inputs are validated before use
- Error messages do not expose internal implementation details to the client

## Output

### If all checks pass:
```
✅ /review-security — no critical findings
Module: [name]
Checklist: 6/6 categories clean
Ready for PR.
```

### If findings exist:
```
❌ /review-security — findings that block the PR

CRITICAL (must resolve before PR):
  - [exact description: file, line, problem, recommended fix]

WARNING (document in PR if not resolved):
  - [description]

Resolve all critical findings and re-run /review-security.
```

## Rules
- This skill does NOT modify code — read and report only
- A CRITICAL finding blocks the PR — the agent resolves it and re-runs the review
- Warnings are documented in the PR description for the dev to review
- When in doubt between critical and warning: treat as critical
- The PR is opened after this review passes — not before
