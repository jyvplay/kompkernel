# Prisma 7: Accelerate requests are no longer retried on transient failures (regression from DataProxyEngine withRetry)

**@pueyo5** opened on 2026-10-13T17:31:47Z

### Package and version

`prisma@7.10.0`, `@prisma/client@7.10.0`, `@prisma/extension-accelerate@3.0.1`

### What happened?

After upgrading from Prisma 6 to Prisma 7, transient Accelerate failures surface directly to the application instead of being retried.

In Prisma 6, `DataProxyEngine` wrapped every Accelerate request in `withRetry` (`MAX_RETRIES = 3` with `backOff`), and network failures were thrown as a retryable `RequestError` (P5010). See `packages/client/src/runtime/core/engines/data-proxy/DataProxyEngine.ts` on the `6.19.x` branch.

In Prisma 7, Accelerate goes through `RemoteExecutor` (`packages/client/src/runtime/core/engines/client/RemoteExecutor.ts`). Its `HttpClient.request()` makes a single `fetch` call with no retry. The retry logic appears to have been dropped when `DataProxyEngine` was removed in #28345, after Accelerate support was added to the client engine in #27594. Neither PR mentions retries, so this looks like an unintended regression rather than a deliberate change.

In production on Vercel, the same app went from about 3 Accelerate errors per week on Prisma 6 to 8 in the first 90 minutes after deploying Prisma 7. The errors are:

```
TypeError: fetch failed
  cause: SocketError: other side closed (UND_ERR_SOCKET)
  at Bi.request (node_modules/@prisma/client/runtime/client.js)
```

We also saw one occasional `503` from Cloudflare (`Error 1102: Worker exceeded resource limits`, see #29040), which is the kind of response the Prisma 6 retry used to absorb.

### What did you expect to happen?

The same behaviour as Prisma 6: network-level failures and retryable 5xx responses from Accelerate should be retried with backoff before an error reaches the application.

### Minimal reproduction

There is no deterministic repro, because the failures are transient network errors. The setup is:

```ts
import { PrismaClient } from './generated/prisma/client'
import { withAccelerate } from '@prisma/extension-accelerate'

export const prisma = new PrismaClient({
  accelerateUrl: process.env.PRISMA_DATABASE_URL!, // prisma+postgres://accelerate.prisma-data.net/?api_key=...
}).$extends(withAccelerate())
```

Deploy this to Vercel serverless functions (Next.js 16) with normal production traffic. Occasional `fetch failed` / `other side closed` errors then reach the app. The client code path that shows there is no retry is `RemoteExecutor#request` → `HttpClient.request` → `fetch(...)`.

### Environment

- Next.js 16.4 on Vercel serverless functions (Node.js runtime)
- Prisma Postgres through Accelerate (`prisma+postgres://accelerate.prisma-data.net`)
- No Accelerate caching used (`cacheStrategy` not set)

### Additional context

A possible fix is to port the Prisma 6 `withRetry` + `backOff` behaviour into `RemoteExecutor#request`. It would retry on network errors (fetch rejections) and on retryable 5xx responses, matching what `DataProxyEngine` did.

One open question is whether writes should be retried after a failure where the request may already have reached the server. Prisma 6 retried them, but that is a decision for the maintainers.

In the meantime we are adding a retry wrapper on our side.


