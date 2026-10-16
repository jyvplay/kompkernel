## Summary

The migration from **Webpack 4** to **Vite 5** reduces cold-start time by roughly **85%** on the
`packages/web` workspace. Below are the concrete steps, the measured numbers, and the two
regressions we found.

### 1. What actually changed

- **Dev server**: `webpack-dev-server` is replaced by Vite's native ESM server. No bundling
  happens in development, so the cold start no longer scales with module count.
- **Build**: production builds still bundle, but through **Rollup** rather than Webpack. The
  output is `dist/assets/*.js` with content hashes instead of `build/static/js/*.chunk.js`.
- **Transforms**: `babel-loader` is gone. **esbuild** handles TypeScript stripping and
  **SWC** is no longer required.

### 2. Measured results

| Metric | Webpack 4 | Vite 5 | Change |
|---|---|---|---|
| Cold start | 42.8 s | 6.1 s | **-85.7%** |
| Hot reload (p50) | 1.9 s | 0.09 s | **-95.3%** |
| Production build | 188 s | 71 s | **-62.2%** |
| Bundle size (gzip) | 412 kB | 389 kB | **-5.6%** |

### 3. Required code changes

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': '/src' },
  },
  server: { port: 3000, strictPort: true },
});
```

You must also rename every `process.env.REACT_APP_*` reference to `import.meta.env.VITE_*`.
There are **47** such references in `packages/web` and **11** in `packages/admin`.

### 4. Regressions found

1. **CommonJS interop.** Three dependencies (`lodash.debounce`, `qs`, `react-copy-to-clipboard`)
   ship only CJS. Vite handles this in dev via pre-bundling, but the SSR build fails. The fix is
   to add them to `ssr.noExternal`.
2. **Dynamic `require()` in tests.** `jest` is still used for unit tests and does not understand
   `import.meta`. Either migrate to **Vitest** or add a `jest.config.js` transform. We chose
   **Vitest**, which shares the Vite config and cut test wall-clock from **94 s** to **23 s**.

### 5. Recommendation

Ship the migration behind the `VITE_MIGRATION` flag for one release, then remove the Webpack
config entirely. The remaining work is approximately **3 engineer-days**:

- [ ] Migrate `packages/admin` (1 day)
- [x] Migrate `packages/web` (done)
- [ ] Remove `webpack.config.js` and `babel.config.js` (0.5 day)
- [ ] Update CI cache keys in `.github/workflows/ci.yml` (0.5 day)
- [ ] Update the contributor docs in `CONTRIBUTING.md` (1 day)

Let me know if you want the SSR fix broken out into its own PR.
