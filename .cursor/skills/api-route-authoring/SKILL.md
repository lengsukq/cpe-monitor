---
name: api-route-authoring
description: >-
  Authors and edits Next.js App Router API routes for CPEye with session checks,
  SQLite init, typed bodies, and consistent error responses. Use when creating or
  modifying files under src/app/api/**/route.ts.
---

# API Route Authoring

## File location

`src/app/api/<area>/<action>/route.ts` — export `GET` / `POST` / `PUT` / `DELETE` as needed.

## Template

```typescript
import { db } from '@/lib/db';
import {
  ApiError,
  ensureDatabase,
  jsonOk,
  parseJsonBody,
  requireSession,
  withApiHandler,
} from '@/lib/api-route';

interface UpdateBody {
  enabled: boolean;
}

export const POST = withApiHandler(async (request) => {
  await requireSession();
  ensureDatabase();

  const body = await parseJsonBody<UpdateBody>(request);
  if (typeof body.enabled !== 'boolean') {
    throw new ApiError('参数无效', 400);
  }

  db.prepare('UPDATE system_settings SET value = ? WHERE key = ?').run(
    body.enabled ? 'true' : 'false',
    'example_key',
  );

  return jsonOk({ success: true });
}, '更新失败');
```

## Conventions

| Topic | Rule |
|-------|------|
| Auth | `requireSession()` on protected routes; public only for login/health |
| DB | `ensureDatabase()` (or `ensureDatabaseReady()`) before queries — no per-route `dbInitialized` flags |
| SQL | Bound parameters only |
| Types | Body/row interfaces + mappers under `src/lib/mappers/*`; avoid bare `as any` |
| Errors | Throw `ApiError` for expected failures; `withApiHandler` maps the rest to 500 |
| Settings | Prefer `src/lib/settings-store.ts` over inline `system_settings` SQL |
| CPE | `getOrCreateCpeClient()` only |
| Scheduler | Explicit `ensureSchedulerStarted` / config updates — no hidden global side effects |

## Status codes

- `401` unauthenticated
- `400` validation
- `404` missing resource
- `500` unexpected server error
- `502` upstream/CPE failure when appropriate

## Soft fallbacks

When CPE is optional for a read endpoint:

- Try CPE; on failure load SQLite history
- Include `source` and optional `cpeError` in the payload
- Still return `401` if session is missing
- Hard unexpected errors must not return 200 zero-values

## After writing

- Ensure no secrets in response JSON
- Prefer extracting repeated SQL into `src/lib/*` if a third route needs the same query
- Align with `.cursor/rules/typescript-api.mdc` and `security.mdc`
