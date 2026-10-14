# Dep optimizer crashes when a dependency module is also an entry (duplicate entry chunk name)

**@christophe-g** opened on 2026-10-13T21:58:36Z

### Describe the bug

Starting the dev server crashes during dependency optimization:

```
Error during dependency optimization:

Cannot destructure property 'exportsData' of depForEntryFileName[chunk.fileName] as it is undefined
    at .../vite/dist/node/chunks/node.js:28633:14
```

This happens when two pre-bundled entries resolve such that one entry's imported module
is itself another optimizer entry: Rolldown emits a second entry chunk for the shared
module and disambiguates the file name with a `2` suffix (`effect_Schema2.js`), but Vite
builds `depForEntryFileName` keys as `flattenId(dep.id) + '.js'`, so the suffixed chunk
name is not found and the destructuring throws. The crashing chunk has
`isEntry === true` and the same `facadeModuleId` as the real entry chunk.


## Workarounds tried

- `optimizeDeps.exclude: ['effect/schema']` avoids the crash, but leaves a raw
  copy of the effect graph next to the pre-bundled copies in dev.
- `optimizeDeps.rolldownOptions: { preserveEntrySignatures: 'strict' }` → still crashes.
- `optimizeDeps.rolldownOptions: { preserveEntrySignatures: false }` → still crashes.
- Same crash on `vite@8.3.2` (rolldown 1.2.11) and `vite@8.3.4` (rolldown 1.2.13),
  so this is not a regression from a recent Vite/rolldown bump.

## Expected behavior

Either handle the disambiguated entry chunk file names in the optimizer bookkeeping (or
map by `facadeModuleId`), or emit a descriptive error. Related past reports with the same
crash for other causes: #21885 (`+` in subpaths), #22198 (`$` in subpaths).


### Reproduction

https://stackblitz.com/edit/vitejs-vite-az8m8shh

### Steps to reproduce

go to https://stackblitz.com/edit/vitejs-vite-az8m8shh, see the console

`effect` 4.0.3 exposes:

- `effect/Schema` → `./dist/Schema.js` (via the `./*` export wildcard)
- `effect/schema` → `./dist/schema/index.js` (the Model barrel), whose re-exported
  `Model` module statically imports `../Schema.js` — the file behind `effect/Schema`.

Steps:

1. `npm init -y && npm i vite@8.3.4 effect@4.0.3`
2. `index.html`: `<script type="module" src="/main.js"></script>`
3. `main.js`:
   ```js
   import * as Schema from 'effect/Schema'
   import * as Model from 'effect/schema'
   console.log(Schema.Schema, Model.Model)
   ```
4. `npx vite` → crash during `[optimizer] bundling dependencies...`.

Observed output chunks (probed from Vite's optimizer loop):

- entry chunk `effect_Schema.js`, name `effect_Schema`, facade `.../effect/dist/Schema.js`
- entry chunk `effect_Schema2.js`, name `effect_Schema`, facade `.../effect/dist/Schema.js` ← lookup fails


### System Info

```shell
System:
  OS: Linux
  Node: 24.18.0
  pnpm: (workspace)
  vite: 8.3.4
  rolldown: 1.2.13
  effect: 4.0.3
```

### Used Package Manager

npm

### Logs

_No response_

### Validations

- [x] Follow our [Code of Conduct](https://github.com/vitejs/.github/blob/main/CODE_OF_CONDUCT.md)
- [x] Read the [Contributing Guidelines](https://github.com/vitejs/vite/blob/main/CONTRIBUTING.md).
- [x] Read the [docs](https://vite.dev/guide).
- [x] Check that there isn't [already an issue](https://github.com/vitejs/vite/issues) that reports the same bug to avoid creating a duplicate.
- [x] Make sure this is a Vite issue and not a framework-specific issue. For example, if it's a Vue SFC related bug, it should likely be reported to [vuejs/core](https://github.com/vuejs/core) instead.
- [x] Check that this is a concrete bug. For Q&A open a [GitHub Discussion](https://github.com/vitejs/vite/discussions) or join our [Discord Chat Server](https://chat.vite.dev/).
- [x] The provided reproduction is a [minimal reproducible example](https://stackoverflow.com/help/minimal-reproducible-example) of the bug.

