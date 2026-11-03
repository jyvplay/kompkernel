/**
 * Upper bound on what ANY in-band phrase-dictionary codec can win on a file:
 * for every word n-gram (n<=6) occurring >=2 times, the ideal gain is
 * count*(tokens(gram) - 1) - tokens(gram) - 2  [1-token code, 2-token overhead].
 * Overlaps are NOT deduplicated, so this is an upper bound (optimistic).
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);
const MAXN = 6, MAXENT = 60;
for (const p of process.argv.slice(2)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = T(text);
  const w = text.split(/\s+/).filter(Boolean);
  const gains: number[] = [];
  for (let n = 1; n <= MAXN; n++) {
    const m = new Map<string, number>();
    for (let i = 0; i + n <= w.length; i++) { const k = w.slice(i, i + n).join(' '); m.set(k, (m.get(k) ?? 0) + 1); }
    for (const [k, c] of m) { if (c < 2) continue; const t = T(k); const g = c * (t - 1) - t - 2; if (g > 0) gains.push(g); }
  }
  gains.sort((a, b) => b - a);
  const top = gains.slice(0, MAXENT).reduce((a, b) => a + b, 0);
  console.error(`${p}\n  raw ${raw}  ideal-phrase-dict top${MAXENT} -${top} (${((top / raw) * 100).toFixed(1)}%)  -> ${raw - top}`);
}
