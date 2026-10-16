import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { typosRunRe, typosShape, typosLen, typosForward, TYPOS_SEPS } from '@/lib/omega/typos';
const f = process.argv[2];
const text = fs.readFileSync(f, 'utf8');
const re = typosRunRe(TYPOS_SEPS);
const runs: string[] = [];
for (const m of text.matchAll(re)) runs.push(m[0]);
console.log('seps=', JSON.stringify(TYPOS_SEPS), 're=', re.source);
console.log('runs found', runs.length, 'sample', JSON.stringify(runs.slice(0, 6)));
const counts = new Map<string, number>(); const pureLens = new Set<number>();
for (const t of runs) { const sh = typosShape(t); if (sh === t) { pureLens.add(t.length); continue; } counts.set(sh, (counts.get(sh) ?? 0) + 1); }
const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
for (const [sh, c] of top) {
  const len = typosLen(sh);
  const gross = countTokens(sh, 'o200k_base') - countTokens('9'.repeat(len), 'o200k_base');
  const clause = countTokens(sh + ', ', 'o200k_base');
  console.log(JSON.stringify({ sh, c, len, pureCollision: pureLens.has(len), gross, clause, net: c * gross - clause }));
}
console.log('pureLens', [...pureLens].sort((a, b) => a - b).join(','));
const fw = typosForward(text);
console.log('forward:', fw ? `shapes=${fw.shapes.join('|')} occ=${fw.occurrences} len ${text.length}->${fw.text.length}` : 'null');
