import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
const rows: any[] = [];
for (const f of process.argv.slice(2)) {
  const t = fs.readFileSync(f, 'utf8');
  const toks = tokenStrings(t, enc).map(x => x.s);
  const n = toks.length;
  const bg = new Map<string, number>();
  for (let i = 0; i + 1 < n; i++) { const k = toks[i] + '\u0000' + toks[i + 1]; bg.set(k, (bg.get(k) ?? 0) + 1); }
  let ceil = 0, rep = 0;
  for (const [, c] of bg) if (c >= 2) { ceil += c - 1; rep++; }
  // also: how many distinct tokens are hapax
  const freq = new Map<string, number>();
  for (const s of toks) freq.set(s, (freq.get(s) ?? 0) + 1);
  let hapax = 0; for (const [, c] of freq) if (c === 1) hapax++;
  rows.push({ f, chars: t.length, n, pairCeiling: ceil, pairPct: +((ceil / n) * 100).toFixed(1), repeatedPairs: rep, hapaxShare: +(hapax / n).toFixed(3), charsPerTok: +(t.length / n).toFixed(2) });
}
rows.sort((a, b) => b.pairPct - a.pairPct);
for (const r of rows) console.log(JSON.stringify(r));
