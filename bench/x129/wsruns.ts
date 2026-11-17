/** X130: how much do space-runs cost, and what is recoverable, per lane? */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
const enc: any = 'o200k_base';
for (const p of (process.env.LANES ?? '').split(',').filter(Boolean)) {
  const text = fs.readFileSync(p, 'utf8');
  const raw = countTokens(text, enc);
  const runs = [...text.matchAll(/ {2,}/g)].map((m) => m[0].length);
  const runsN = runs.length;
  const spaceChars = runs.reduce((a, b) => a + b, 0);
  // upper bound: collapse every run >=2 to a single space
  const collapsed = text.replace(/ {2,}/g, ' ');
  const collapsedTok = countTokens(collapsed, enc);
  // cost of the side info: one token per distinct run length + one per run occurrence
  const distinct = new Set(runs).size;
  console.log(`${p.split('/').pop()!.padEnd(22)} raw=${String(raw).padStart(5)}  runs=${String(runsN).padStart(4)} (${spaceChars} chars, ${distinct} distinct len)  collapsed=${String(collapsedTok).padStart(5)}  GROSS saving=${String(raw - collapsedTok).padStart(4)}  sideinfo≈${distinct + runsN}`);
  if (runsN > 0) {
    const hist = new Map<number, number>();
    for (const r of runs) hist.set(r, (hist.get(r) ?? 0) + 1);
    console.log(`      run-length histogram: ${[...hist].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:x${v}`).join(' ')}`);
  }
}
