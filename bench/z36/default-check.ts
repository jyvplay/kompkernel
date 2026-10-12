// Z36: the refactored default VXR path must reproduce the pre-refactor numbers exactly.
import fs from 'node:fs';
import { veritasREncode } from '@/lib/omega/veritas-r';
for (const f of ['bench/holdout/readme.txt', 'bench/holdout-ops/npm-ls.txt', 'bench/holdout-ops/ls-full-iso.txt', 'bench/holdout/gh-prose.txt']) {
  const r = veritasREncode(fs.readFileSync(f, 'utf8'));
  console.log(JSON.stringify({ f: f.split('/').pop(), out: r.outTokens, exact: r.exact }));
}
