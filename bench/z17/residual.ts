// Residual attribution: where do the tokens of the CURRENT frontier (amphoraEncode) wire go, by character class?
import fs from 'node:fs';
import { amphoraEncode } from '@/lib/omega/amphora';
import { attribute } from './attrib';
const files = process.argv.slice(2);
const agg: Record<string, number> = {}; let all = 0; let ident = 0;
for (const f of files) {
  const t = fs.readFileSync(f, 'utf8');
  const a = amphoraEncode(t, 'o200k_base');
  const wire = a.wire ?? t;
  const r = attribute(wire);
  all += r.tokens;
  for (const [k, v] of Object.entries(r.totals)) agg[k] = (agg[k] ?? 0) + v;
  console.log(JSON.stringify({ f, inputTok: a.inTokens ?? null, wireTok: r.tokens, mode: (a as any).mode ?? null, exactWire: (a as any).decoded === t, mismatch: r.mismatch, shares: Object.fromEntries(Object.entries(r.totals).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, +(100 * v / r.tokens).toFixed(1)])) }));
}
console.log('AGG_WIRE', all, JSON.stringify(Object.fromEntries(Object.entries(agg).sort((x, y) => y[1] - x[1]).map(([k, v]) => [k, +(100 * v / all).toFixed(1)]))));
