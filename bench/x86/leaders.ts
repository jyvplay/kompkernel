/** X86 — generalized local leaders, recomputed.
 *
 *  For every real lane: the raw o200k cost, the frontier cost, the best arm known to
 *  win on it (with the receipt that says so), the brotli -q11 floor at 14.8 bits/token
 *  (the convention `bench/x75/leaders.ts` established and X79 re-verified), and the
 *  ratio floor/stack. Above 1.0 the stack beats a strong general-purpose compressor on
 *  that structure while staying byte-exact and directly readable.
 *
 *  The floors are recomputed here with node's own zlib, not copied, and the lanes X79
 *  verified are printed again so the two runs can be compared: metrics 130, ls-l-real
 *  943, ps-aux 743, ls-real 328, dpkg-l 591, free-m 75, lsblk 61, kb-article 608,
 *  uptime-w 70, psql 165.
 */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
import { countTokens } from '../../src/lib/omega/bpe';

const floorOf = (buf: Buffer): number =>
  Math.ceil((zlib.brotliCompressSync(buf, {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 },
  }).length * 8) / 14.8);

/** best arm known to beat the frontier on this lane, from a committed receipt */
const ARMS: Record<string, { tokens: number; arm: string; receipt: string }> = {
  'bench/holdout-tbl/df-h.txt': { tokens: 134, arm: 'X86 ΚΕΝΟΝ', receipt: 'bench/x86/receipts/kenon.json' },
  'bench/holdout-tbl/kubectl-get-pods.txt': { tokens: 304, arm: 'X80 PARATAXIS = X86 ΚΕΝΟΝ (tie)', receipt: 'bench/x80/receipts/parataxis.json; bench/x86/receipts/kenon.json' },
  'bench/holdout-x42/findmnt.txt': { tokens: 422, arm: 'X80 PARATAXIS', receipt: 'bench/x80/receipts/parataxis.json' },
  'bench/holdout-x42/dpkg-l.txt': { tokens: 651, arm: 'X80 PARATAXIS', receipt: 'bench/x80/receipts/parataxis.json' },
  'bench/holdout-tbl/psql-output.txt': { tokens: 173, arm: 'X82 SCHEMA', receipt: 'bench/x82/receipts/ (codecs.md §X82)' },
  'bench/holdout-x40/cue-sheet.md': { tokens: 155, arm: 'X82 SCHEMA', receipt: 'bench/x82/receipts/ (codecs.md §X82)' },
  'bench/holdout-tbl/markdown-table.md': { tokens: 171, arm: 'X82 SCHEMA', receipt: 'bench/x82/receipts/ (codecs.md §X82)' },
  'bench/holdout/json-pkg.txt': { tokens: 679, arm: 'X82 SCHEMA', receipt: 'bench/x82/receipts/ (codecs.md §X82)' },
  'bench/holdout-x40/metrics.tsv': { tokens: 206, arm: 'X81 HARMOS', receipt: 'docs/codecs.md §X81 (210 −4)' },
};

const front = JSON.parse(fs.readFileSync('bench/x86/receipts/frontier.json', 'utf8'));
const F = new Map<string, { raw: number; tokens: number; parent: string; exact: boolean }>();
for (const r of front.rows) F.set(r.path, r);

/** lanes measured this turn that are not in the 29-lane frontier set */
const EXTRA = [
  ['bench/holdout-x42/ss-tan.txt', 209], ['bench/holdout-x42b/ps-eo-cpu.txt', 389],
  ['bench/holdout-x42/ls-usr-bin.txt', 375], ['bench/holdout-ops/ls-full-iso.txt', 367],
  ['bench/holdout-x86/proc-meminfo.txt', 349], ['bench/holdout-x42b/df-h-all.txt', 124],
] as Array<[string, number]>;
for (const [p, t] of EXTRA) if (!F.has(p)) F.set(p, { raw: countTokens(fs.readFileSync(p, 'utf8'), 'o200k_base'), tokens: t, parent: 'synkrisis', exact: true });

const CAT: Record<string, string> = {
  'holdout-work': 'prose', 'holdout-lang': 'prose', 'holdout': 'other',
  'holdout-x40': 'ops', 'holdout-x41': 'ops', 'holdout-x42': 'ops', 'holdout-x42b': 'ops',
  'holdout-tbl': 'ops', 'holdout-tab': 'other', 'holdout-ops': 'ops', 'holdout-x86': 'ops',
  'holdout-mk': 'other',
};

const rows: any[] = [];
for (const [p, r] of F) {
  if (!fs.existsSync(p)) continue;
  const buf = fs.readFileSync(p);
  const floor = floorOf(buf);
  const arm = ARMS[p];
  const stack = arm ? arm.tokens : r.tokens;
  rows.push({
    path: p, lane: p.split('/').pop(), cat: CAT[p.split('/')[1]] ?? 'other',
    bytes: buf.length, raw: r.raw, frontier: r.tokens, parent: r.parent, exact: r.exact,
    arm: arm?.arm ?? 'frontier (' + r.parent + ')', armTokens: stack,
    floor, ratio: +(floor / stack).toFixed(2), receipt: arm?.receipt ?? 'bench/x86/receipts/frontier.json',
  });
}
rows.sort((a, b) => b.ratio - a.ratio);
fs.mkdirSync('bench/x86/receipts', { recursive: true });
fs.writeFileSync('bench/x86/receipts/leaders.json', JSON.stringify({ rows }, null, 1) + '\n');

const X79: Record<string, number> = {
  'metrics.tsv': 130, 'ls-l-real.txt': 943, 'ps-aux-real.txt': 743, 'ls-real.txt': 328,
  'dpkg-l.txt': 591, 'free-m.txt': 75, 'lsblk.txt': 61, 'kb-article.txt': 608,
  'uptime-w.txt': 70, 'psql-output.txt': 165,
};
let rep = 0, tot = 0;
for (const [k, v] of Object.entries(X79)) {
  const got = rows.find((r) => r.lane === k);
  if (got && got.floor === v) rep++;
  else console.log(`FLOOR MISMATCH ${k}: X79 ${v} -> X86 ${got?.floor}`);
}
console.log(`X79 floors reproduced exactly: ${rep}/${Object.keys(X79).length}`);

for (const cat of ['ops', 'prose', 'other']) {
  const g = rows.filter((r) => r.cat === cat);
  if (!g.length) continue;
  console.log(`\n### ${cat} (${g.length} lanes)\n`);
  console.log('| lane | structure | raw | frontier | best arm | arm tokens | floor | ratio |');
  console.log('|---|---|---:|---:|---|---:|---:|---:|');
  for (const r of g.sort((a, b) => b.ratio - a.ratio)) {
    console.log(`| ${r.lane} | ${r.parent} | ${r.raw} | ${r.frontier} | ${r.arm} | **${r.armTokens}** | ${r.floor} | ${r.ratio} |`);
  }
  const mean = g.reduce((s, r) => s + r.ratio, 0) / g.length;
  console.log(`\nmean ratio **${mean.toFixed(2)}**`);
  tot += g.length;
}
console.log(`\nlanes=${tot}  exact=${rows.filter((r) => r.exact).length}/${rows.length}`);
