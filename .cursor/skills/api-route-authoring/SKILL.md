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
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db, initializeDatabase } from '@/lib/db';

interface UpdateBody {
  enabled: boolean;
  // …
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    initializeDatabase();

    const body = (await request.json()) as UpdateBody;
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json({ error: '参数无效' }, { status: 400 });
    }

    db.prepare('UPDATE system_settings SET value = ? WHERE key = ?').run(
      body.enabled ? 'true' : 'false',
      'example_key',
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('settings update failed', error);
    return NextResponse.json({ error: '更新失败' }, { status: 500 });
  }
}
```

## Conventions

| Topic | Rule |
|-------|------|
| Auth | Session first on protected routes; public only for login/health as designed |
| DB | Call `initializeDatabase()` (or shared helper) before queries |
| SQL | Bound parameters only |
| Types | Body/row interfaces; avoid bare `as any` |
| Errors | Chinese user messages OK; correct HTTP status |
| CPE | `getOrCreateCpeClient()` only |
| Scheduler | Explicit `ensureSchedulerStarted` / config updates — no hidden global side effects |

## Status codes

- `401` unauthenticated
- `400` validation
- `404` missing resource
- `500` unexpected server error

## Soft fallbacks

When CPE is optional for a read endpoint:

- Try CPE; on failure load SQLite history
- Include `source` and optional `cpeError` in the payload
- Still return `401` if session is missing

## After writing

- Ensure no secrets in response JSON
- Prefer extracting repeated SQL into `src/lib/*` if a third route needs the same query
- Align with `.cursor/rules/typescript-api.mdc` and `security.mdc`
