// Z32: VERITAS-N (nested header) vs VERITAS-U on the same corpora. Exact round trip checked on every wire,
// plus edge cases. Totals are o200k tokens of the complete wire (legend included).
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasUEncode, veritasUDecode } from '@/lib/omega/veritas-u';
import { veritasNEncode, veritasNDecode } from '@/lib/omega/veritas-n';
import { VXA_SENTINEL, VXN_SENTINEL } from '@/lib/omega/veritas-a';
const enc = 'o200k_base' as const;
const rows: { group: string; file: string }[] = [];
for (const p of ['/home/user/z31/fresh-list.tsv', '/home/user/z31/groups-list.tsv'])
  for (const l of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); rows.push({ group: g, file: f.startsWith('/') ? f : '/home/user/kompkernel/' + f }); }
const edges: string[] = [
  '', 'plain text with no dictionary value', VXA_SENTINEL + 'X=Y\n]]\nbody', VXN_SENTINEL + '# VXN: x\n]]\nbody',
  'a~b ~N ~~ ~R\r\nend', Array.from({ length: 40 }, (_, i) => `tok alpha beta gamma ${i % 5} delta epsilon`).join('\n'),
];
let fail = 0, cases = 0;
const agg: Record<string, { n: number; u: number; n2: number; better: number; worse: number; eq: number; inT: number }> = {};
const check = (label: string, t: string) => {
  cases++;
  const u = veritasUEncode(t, enc);
  const n = veritasNEncode(t, enc);
  const okN = veritasNDecode(n.wire) === t && n.decoded === t;
  const okU = veritasUDecode(u.wire) === t;
  if (!okN || !okU) { fail++; console.log('FAIL', label, okN, okU); }
  return { u: u.outTokens, n: n.outTokens, inT: n.inTokens, okN };
};
edges.forEach((t, i) => check('edge' + i, t));
for (const { group, file } of rows) {
  const t = fs.readFileSync(file, 'utf8');
  const r = check(file, t);
  const a = (agg[group] ??= { n: 0, u: 0, n2: 0, better: 0, worse: 0, eq: 0, inT: 0 });
  a.n++; a.u += r.u; a.n2 += r.n; a.inT += r.inT;
  if (r.n < r.u) a.better++; else if (r.n > r.u) a.worse++; else a.eq++;
}
let T = { u: 0, n: 0, docs: 0 };
console.log('group'.padEnd(14), 'docs', 'identity', 'VXU', 'VXN', 'VXN-VXU', 'pct', 'better', 'worse', 'equal');
for (const [g, a] of Object.entries(agg)) {
  console.log(g.padEnd(14), String(a.n).padStart(4), String(a.inT).padStart(8), String(a.u).padStart(8), String(a.n2).padStart(8), String(a.n2 - a.u).padStart(8), ((a.n2 - a.u) / a.u * 100).toFixed(2).padStart(7) + '%', String(a.better).padStart(6), String(a.worse).padStart(6), String(a.eq).padStart(6));
  T.u += a.u; T.n += a.n2; T.docs += a.n;
}
console.log('ALL', T.docs, 'docs: VXU', T.u, 'VXN', T.n, 'diff', T.n - T.u, ((T.n - T.u) / T.u * 100).toFixed(2) + '%');
console.log('cases', cases, 'failures', fail);
