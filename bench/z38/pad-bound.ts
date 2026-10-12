// Z38: upper bound on what column-padding removal can save. Collapse every run of >=2 spaces to one space and
// count o200k tokens of identity vs collapsed, per lane. The collapsed text is NOT a codec (information is lost);
// it bounds the saving from a column model that re-derives the padding exactly.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const R = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const agg: Record<string, { n: number; id: number; col: number }> = {};
for (const r of R) {
  const text = fs.readFileSync(r.file, 'utf8');
  const col = text.replace(/ {2,}/g, ' ');
  const g = (agg[r.group] ??= { n: 0, id: 0, col: 0 });
  g.n++; g.id += countTokens(text, 'o200k_base'); g.col += countTokens(col, 'o200k_base');
}
for (const [k, g] of Object.entries(agg)) console.log(JSON.stringify({ lane: k, files: g.n, identity: g.id, collapsedRuns: g.col, boundSavePct: +(100 * (1 - g.col / g.id)).toFixed(2) }));
