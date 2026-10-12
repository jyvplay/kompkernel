// Z38: tokens spent on markdown table separator rows (|---|---|) per lane. Upper bound for a rule-derived separator.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
const R = fs.readFileSync('bench/z34/receipts/vxr-eval-151.jsonl', 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const agg: Record<string, { tok: number; sep: number; rows: number }> = {};
const re = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
for (const r of R) {
  const text = fs.readFileSync(r.file, 'utf8');
  const total = countTokens(text, 'o200k_base');
  const sepLines = text.split('\n').filter((l) => re.test(l) && l.includes('-') && l.includes('|'));
  const sepTok = sepLines.reduce((a, l) => a + countTokens(l + '\n', 'o200k_base'), 0);
  const g = (agg[r.group] ??= { tok: 0, sep: 0, rows: 0 });
  g.tok += total; g.sep += sepTok; g.rows += sepLines.length;
}
for (const [k, g] of Object.entries(agg)) console.log(JSON.stringify({ lane: k, tokens: g.tok, sepRows: g.rows, sepTokens: g.sep, sepSharePct: +(100 * g.sep / g.tok).toFixed(3) }));
