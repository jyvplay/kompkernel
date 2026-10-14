# Cached 404 from an unauthenticated request ignores `DENO_AUTH_TOKENS` for 15 minutes

**@jeiea** opened on 2026-10-13T19:41:34Z

Version: Deno 2.9.7

## Background

#35138 caches 404 responses for 15 minutes and deliberately skips authenticated requests, since private hosts respond with 404 to unauthorized requests. However, the [cache read path](https://github.com/denoland/deno/blob/a18ce33715e30cd2b0d99c7e322ef11a65490e4d/libs/cache_dir/file_fetcher/mod.rs#L729-L744) serves a cached 404 without checking whether the current request carries credentials. A single run without `DENO_AUTH_TOKENS` therefore blocks a private module (e.g. on `raw.githubusercontent.com`) for 15 minutes, even after the token is set.

## Steps to reproduce

```ts
// server.ts
Deno.serve({ port: 4545 }, (req) =>
  req.headers.get("authorization") === "Bearer secret"
    ? new Response("export default 1;", { headers: { "content-type": "application/javascript" } })
    : new Response("not found", { status: 404 }));
```

```sh
deno run --allow-net server.ts &
export DENO_DIR=$(mktemp -d)
deno cache http://localhost:4545/mod.js
DENO_AUTH_TOKENS=secret@localhost:4545 deno cache http://localhost:4545/mod.js
```

## Expected behavior

The second `deno cache` sends the token and succeeds, as it does with `--reload`.

## Actual behavior

The second `deno cache` fails with `error: Module not found "http://localhost:4545/mod.js".` without sending a request, until the entry expires or `--reload` is used.


