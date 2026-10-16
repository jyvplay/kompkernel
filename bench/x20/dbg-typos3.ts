import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { typosRunRe, typosShape, typosLen, TYPOS_SEPS, TYPOS_SEPS_WIDE } from '@/lib/omega/typos';
const text = fs.readFileSync(process.argv[2], 'utf8');
const seps = process.argv[3] === 'wide' ? TYPOS_SEPS_WIDE : TYPOS_SEPS;
const re = typosRunRe(seps);
const counts = new Map<string, number>();
for (const m of text.matchAll(re)) { const t = m[0]; const sh = typosShape(t); if (sh !== t) counts.set(sh, (counts.get(sh) ?? 0) + 1); }
const bare = new Set<number>();
for (const m of text.matchAll(/[0-9]+/g)) bare.add(m[0].length);
const rows = [...counts.entries()].filter(([, c]) => c >= 2).map(([sh, c]) => {
  const len = typosLen(sh);
  const gross = countTokens(sh, 'o200k_base') - countTokens('9'.repeat(len), 'o200k_base');
  const clause = countTokens(sh + ', ', 'o200k_base');
  return { sh, c, len, gross, clause, net: c * gross - clause };
}).sort((a, b) => b.net - a.net).slice(0, 12);
for (const r of rows) console.log(JSON.stringify(r));
console.log('bare digit-run lengths present:', [...bare].sort((a, b) => a - b).slice(0, 40).join(','));
