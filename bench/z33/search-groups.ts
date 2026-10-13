// Z33: run the search diagnostic over the 151-file set (40 group files + 111 fresh docs) and compare with DAEDALUS.
import fs from 'node:fs';
import { runSearch } from './search-wide';
const D: Record<string, { messageTokens: number; exact: boolean }> = {};
for (const l of fs.readFileSync('bench/z33/receipts/daedalus-151.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); D[r.file] = r; }
const rows: [string, string][] = [];
for (const l of fs.readFileSync('bench/z33/receipts/a10-groups.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); rows.push([r.group, r.file]); }
for (const l of fs.readFileSync('bench/z33/receipts/daedalus-151.jsonl', 'utf8').split('\n').filter(Boolean)) { const r = JSON.parse(l); if (r.group === 'fresh') rows.push(['fresh', r.file]); }
const only = process.env.ONLY ?? '';
const out = process.env.OUT ?? '';
const agg: Record<string, { s: number; d: number; n: number; w: number; b: number }> = {};
const lines: string[] = [];
for (const [g, f] of rows) {
  if (only && g !== only && !(only === 'groups' && g !== 'fresh')) continue;
  const t = fs.readFileSync(f, 'utf8');
  const r = runSearch(t);
  const a = (agg[g] ??= { s: 0, d: 0, n: 0, w: 0, b: 0 });
  const dm = D[f]?.messageTokens ?? 0;
  a.s += r.tokens; a.d += dm; a.n++; a.w += r.tokens > dm; a.b += r.tokens < dm;
  const rec = JSON.stringify({ group: g, file: f, search: r.tokens, dae: dm, entries: r.entries });
  lines.push(rec);
  if (out) fs.appendFileSync(out + '.stream', rec + '\n');
}
if (out) fs.writeFileSync(out, lines.join('\n') + '\n');
for (const [g, a] of Object.entries(agg)) console.log(g.padEnd(13), 'n', String(a.n).padStart(3), 'search', a.s, 'dae', a.d, `${(((a.s - a.d) / a.d) * 100).toFixed(2)}%`, 'worse', a.w, 'better', a.b);
const T = Object.values(agg).reduce((x, y) => ({ s: x.s + y.s, d: x.d + y.d }), { s: 0, d: 0 });
console.log('ALL search', T.s, 'dae', T.d, `${(((T.s - T.d) / T.d) * 100).toFixed(2)}%`);
