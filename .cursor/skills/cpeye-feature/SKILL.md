---
name: cpeye-feature
description: >-
  Implements CPEye product features across UI, API, lib, SQLite, and scheduler.
  Use when adding dashboard metrics, alert rules, settings fields, SMS behavior,
  daily reports, traffic collection, or notification paths.
---

# CPEye Feature Development

## Stack truth

- Next.js 16 App Router, React 19, shadcn + Tailwind v4
- better-sqlite3 (`data/cpe-monitor.db`), not Neon at runtime
- CPE only via `getOrCreateCpeClient()` in `src/lib/cpe-client.ts`
- Jobs via `src/lib/scheduler.ts`

## Layer map

```
UI page (authenticated)
  → API route (session + DB)
    → lib (cpe-client / db / scheduler / report / notifiers)
      → types in src/types
```

## Workflow

```
Feature progress:
- [ ] 1. Clarify user-visible behavior and data source (CPE live vs SQLite history)
- [ ] 2. Touch the correct ownership modules only
- [ ] 3. Types first (src/types) for DTOs / domain shapes
- [ ] 4. Lib / DB / scheduler changes
- [ ] 5. API route (session, errors, statuses)
- [ ] 6. UI (shadcn, loading/error, format.ts)
- [ ] 7. Notifications path if alerts/reports
```

### Ownership checklist

| Change type | Primary files |
|-------------|---------------|
| New CPE field/API | `src/lib/cpe-client.ts` |
| Periodic collect / alert / SMS sync | `src/lib/scheduler.ts` |
| New table/column | `src/lib/db.ts` `initializeDatabase()` (+ types) |
| Settings | `src/app/api/settings/**` + settings page |
| Dashboard metric | overview/traffic APIs + dashboard page + optional chart component |
| Email / WeCom | `src/lib/notifiers/*` + `src/emails/*` |

### Schema

- Until Drizzle is actually used in business code: add tables/columns in `initializeDatabase()`
- Keep `schema.ts` in sync only if you touch it; do not assume Drizzle migrations run in prod

### Scheduler / side effects

- Start/stop must remain idempotent
- New cron jobs: document interval and failure logging
- Alert rules: write logs + call notifiers without blocking forever

### Quality gates

- No new `as any` without an interface
- Parameterized SQL only
- Protected API requires session
- User-facing API errors may stay Chinese
- Prefer small extracted functions over growing 500+ line pages

## Anti-patterns

- Second CPE HTTP client or ad-hoc `fetch` to CPE from random routes
- Assuming Vercel serverless (in-process cron + SQLite need a long-lived Node process)
- Returning CPE passwords in JSON
- Silent catch that hides collection failures
