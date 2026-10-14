# `deno compile --bundle --minify --exclude-unused-npm` includes unused node native modules

**@cjfuller** opened on 2026-09-30T20:12:57Z

Version: Deno 2.9.7

I'm trying to use `deno compile --bundle --minify --exclude-unused-npm` to build an application from a specific entrypoint. Elsewhere in the same codebase, in code unreachable from that entrypoint (as confirmed by `deno info` on that entrpoint), I have an import of `npm:@duckdb/node-api`. When I run the compile command, I see that it includes >100MB extra of native modules from that package despite them being unreachable. I would expect that if the package is completely unreachable from the entrypoint, its native code is not bundled either.

This even happens in a minimal test case if you don't import the package in question at all, and it's just listed in the dependencies in deno.jsonc.

Here's a minimal reproduction project:

`deno.jsonc`:
```
{
  "imports": {
    "duckdb": "npm:@duckdb/node-api"
  }
}
```

`main.ts`:
```
if (import.meta.main) {
  console.log("Hello, world!");
}
```

Steps to confirm:
- `deno install`
- `deno compile --bundle --exclude-unused-npm --minify -o ./main main.ts`
- `ls -al main`
- see this reports `main` is ~186MB on my machine
- remove `"duckdb": "npm:@duckdb/node-api"` from `deno.jsonc`
- `deno install`
- `deno compile --bundle --exclude-unused-npm --minify -o ./main main.ts`
- `ls -al main`
- see this reports `main` is ~68MB on my machine



---
**@0xMurage** commented on 2026-10-13T18:49:09Z

This is a widely known issue, and the simplest workaround is to split bundling and compile into two stages. 

1) bundle your app into own folder e.g. ` deno bundle entry.ts -o dist/main.js `
2) create an empty deno.json file inside the output folder above ` echo "{}" > dist/deno.json `
2) run the compilation command ` deno compile --no-check --output app dist/main.js`
