---
name: clean-code-review
description: >-
  Reviews CPEye code for Clean Code quality, typing, error handling, and module
  boundaries. Use when reviewing pull requests, diffs, post-change quality passes,
  or when the user asks to check clean code / code quality.
---

# Clean Code Review

## When to use

- After non-trivial edits to `src/lib/**`, `src/app/api/**`, or large pages
- Explicit review / PR / “check clean code” requests

## Workflow

Copy and track:

```
Review progress:
- [ ] 1. Scope files (diff or named paths)
- [ ] 2. Run checklist
- [ ] 3. Rank findings
- [ ] 4. Suggest concrete fixes (no drive-by refactors unless asked)
```

### 1. Scope

- Prefer `git diff` / changed files; otherwise review paths the user named
- Ignore generated/build artifacts (`.next`, lockfile noise)

### 2. Checklist

| Area | Look for |
|------|----------|
| Naming | Verbs for functions, nouns for data; no cryptic 1–2 char names |
| Size | God functions/pages; mixed SQL + HTTP + CPE in one handler |
| DRY | Duplicated session/DB init that should be a helper when editing multiple routes |
| Types | New `as any`, `useState<any>`, untyped SQL rows |
| Errors | Silent `catch {}`, 200 on auth failure, swallowed errors |
| Architecture | CPE logic outside `cpe-client`; wrong stack assumptions (Neon/HeroUI) |
| Security | Hardcoded secrets, string-interpolated SQL, logged credentials |
| UI | Bypassing shadcn tokens; 500+ line pages without split |

### 3. Output format

```markdown
## Clean Code Review

### Critical
- `path`: issue — fix

### Major
- `path`: issue — fix

### Minor
- `path`: issue — fix

### Summary
1–3 sentences. No drive-by refactors unless requested.
```

## Rules of engagement

- Defect-first: report issues before rewriting
- Cite paths and short snippets
- Align with `.cursor/rules/clean-code.mdc`, `cpeye-architecture.mdc`, `security.mdc`
- Do not change application code unless the user asks to apply fixes
