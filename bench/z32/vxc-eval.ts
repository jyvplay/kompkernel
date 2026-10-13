// Z32: VERITAS-C (char candidates + nested header + equals-free) vs VERITAS-N, on the fresh corpus and lane groups.
// o200k tokens of the complete wire, legend included. Every decode is checked. Edge cases included.
import fs from 'node:fs';
import { countTokens } from '@/lib/omega/bpe';
import { veritasNEncode, veritasNDecode } from '@/lib/omega/veritas-n';
import { veritasCEncode, veritasCDecode } from '@/lib/omega/veritas-c';
import { VXA_SENTINEL, VXN_SENTINEL, VXC_SENTINEL } from '@/lib/omega/veritas-a';
const enc = 'o200k_base' as const;
const only = process.argv[2] ?? 'all';
const rows: { group: string; file: string }[] = [];
for (const p of ['/home/user/z31/fresh-list.tsv', '/home/user/z31/groups-list.tsv'])
  for (const l of fs.readFileSync(p, 'utf8').split('\n').filter(Boolean)) { const [g, f] = l.split('\t'); rows.push({ group: g, file: f.startsWith('/') ? f : '/home/user/kompkernel/' + f }); }
const edges = ['', 'plain', VXA_SENTINEL + 'X=Y\n]]\nb', VXN_SENTINEL + '# x\n]]\nb', VXC_SENTINEL + 'q\n]]\nb', 'a~b ~N ~~ ~R\r\nend', 'the the the the other other other words words words repeated repeated repeated'];
let fail = 0; let cases = 0;
const agg: Record<string, { n: number; inT: number; N: number; C: number; cu: number; ct: number; betterN: number; worseN: number; eqN: number; ms: number }> = {};
const run = (label: string, t: string, group: string) => {
  cases++;
  const t0 = Date.now();
  const c = veritasCEncode(t, enc);
  const ms = Date.now() - t0;
  const ct = c;
  const n = veritasNEncode(t, enc);
  if (veritasCDecode(c.wire) !== t || veritasNDecode(n.wire) !== t || veritasCDecode(ct.wire) !== t) { fail++; console.log('FAIL', label); }
  const a = (agg[group] ??= { n: 0, inT: 0, N: 0, C: 0, cu: 0, ct: 0, betterN: 0, worseN: 0, eqN: 0, ms: 0 });
  a.n++; a.inT += c.inTokens; a.N += n.outTokens; a.C += c.outTokens; a.ct += ct.outTokens; a.ms += ms;
  if (c.outTokens < n.outTokens) a.betterN++; else if (c.outTokens > n.outTokens) a.worseN++; else a.eqN++;
  return c.outTokens;
};
edges.forEach((t, i) => run('edge' + i, t, 'edge'));
for (const { group, file } of rows) {
  if (only !== 'all' && group !== only && !(only === 'fresh' && group === 'fresh')) continue;
  run(file, fs.readFileSync(file, 'utf8'), group);
}
console.log('group'.padEnd(13), 'docs', 'identity', 'VXN', 'VXC', 'VXC-VXN', 'pct', 'better', 'worse', 'equal', '(same)', 'ms/doc');
let T = { n: 0, inT: 0, N: 0, C: 0, ct: 0 };
for (const [g, a] of Object.entries(agg)) {
  console.log(g.padEnd(13), String(a.n).padStart(4), String(a.inT).padStart(8), String(a.N).padStart(8), String(a.C).padStart(10), String(a.C - a.N).padStart(8), ((a.C - a.N) / a.N * 100).toFixed(2).padStart(6) + '%', String(a.betterN).padStart(6), String(a.worseN).padStart(6), String(a.eqN).padStart(6), String(a.ct).padStart(14), (a.ms / a.n).toFixed(0).padStart(7));
  T.n += a.n; T.inT += a.inT; T.N += a.N; T.C += a.C; T.ct += a.ct;
}
console.log('ALL', T.n, 'docs: identity', T.inT, 'VXN', T.N, 'VXC', T.C, 'diff', T.C - T.N, ((T.C - T.N) / T.N * 100).toFixed(2) + '%', '');
console.log('cases', cases, 'failures', fail);
