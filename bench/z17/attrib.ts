// Token-cost attribution by character class (o200k_base, repo tokenizer). Each token is charged to the
// class of its first character; class patterns are tried in priority order on the whole text.
import fs from 'node:fs';
import { tokenStrings } from '@/lib/omega/bpe';
const CLASSES: [string, RegExp][] = [
  ['uuid', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/g],
  ['hexrun', /\b[0-9a-fA-F]{8,}\b/g],
  ['timestamp', /\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}([.,]\d+)?)?(Z|[+-]\d{2}:?\d{2})?/g],
  ['clock', /\b\d{2}:\d{2}(:\d{2})?\b/g],
  ['ipv4', /\b\d{1,3}(\.\d{1,3}){3}\b/g],
  ['path', /[\w.~-]*\/[\w./~-]+/g],
  ['number', /\b\d[\d,.]*\b/g],
  ['newline', /\n/g],
  ['space', / +/g],
  ['ascii-word', /[A-Za-z]+/g],
  ['punct-ascii', /[!-\/:-@\[-`{-~]/g],
  ['non-ascii', /[^\x00-\x7f]/g],
];
export function attribute(text: string) {
  const label = new Array<string>(text.length).fill('');
  for (const [name, re] of CLASSES) {
    for (const m of text.matchAll(re)) {
      for (let i = m.index!; i < m.index! + m[0].length; i++) if (!label[i]) label[i] = name;
    }
  }
  for (let i = 0; i < label.length; i++) if (!label[i]) label[i] = 'other';
  const toks = tokenStrings(text, 'o200k_base');
  const totals: Record<string, number> = {};
  let pos = 0, mismatch = 0;
  for (const t of toks) {
    const s = t.s;
    if (text.substr(pos, s.length) !== s) mismatch++;
    const cls = label[pos] ?? 'other';
    totals[cls] = (totals[cls] ?? 0) + 1;
    pos += s.length;
  }
  return { tokens: toks.length, mismatch, totals };
}
if (process.argv[2] && !process.argv[1].includes("residual")) {
  const files = process.argv.slice(2);
  const agg: Record<string, number> = {}; let all = 0;
  for (const f of files) {
    const r = attribute(fs.readFileSync(f, 'utf8'));
    all += r.tokens;
    for (const [k, v] of Object.entries(r.totals)) agg[k] = (agg[k] ?? 0) + v;
    console.log(JSON.stringify({ f, tokens: r.tokens, mismatch: r.mismatch, shares: Object.fromEntries(Object.entries(r.totals).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(100 * v / r.tokens).toFixed(1)])) }));
  }
  console.log('AGGREGATE', all, JSON.stringify(Object.fromEntries(Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([k, v]) => [k, +(100 * v / all).toFixed(1)]))));
}
