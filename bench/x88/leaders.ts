/** X88 — generalized LOCAL LEADERS by category, recomputed from run D (the authoritative
 *  29-lane frontier receipt) plus the four lanes newly measured this turn. Floors are
 *  recomputed here with node's own zlib at the 14.8 bits/token convention `bench/x75/
 *  leaders.ts` established; nothing is copied. Above 1.00 the stack beats brotli -q11 on
 *  that structure while staying byte-exact and directly readable. */
import * as fs from 'node:fs';
import * as zlib from 'node:zlib';
const floorOf = (b: Buffer) => Math.ceil((zlib.brotliCompressSync(b, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 } }).length * 8) / 14.8);
const CAT: Record<string, string> = {
  'kb-article.txt': 'PROSE', 'llm-answer.md': 'PROSE', 'email-thread.txt': 'PROSE', 'node-help.txt': 'PROSE',
  'ls-l-real.txt': 'OPS LISTING', 'ls-real.txt': 'OPS LISTING', 'ps-aux-real.txt': 'OPS LISTING', 'ps-real.txt': 'OPS LISTING',
  'ps-ef.txt': 'OPS LISTING', 'apt-real.txt': 'OPS LISTING', 'dpkg-l.txt': 'OPS LISTING', 'du-real.txt': 'OPS LISTING',
  'findmnt.txt': 'OPS LISTING', 'openstack-loghub-26.log': 'OPS LISTING', 'ls-la-usrbin.txt': 'OPS LISTING', 'npm-ls-all.txt': 'OPS LISTING', 'find-listing.txt': 'OPS LISTING',
  'df-h.txt': 'OPS TABLE', 'vmstat.txt': 'OPS TABLE', 'metrics.tsv': 'OPS TABLE', 'free-m.txt': 'OPS TABLE', 'lsblk.txt': 'OPS TABLE', 'uptime-w.txt': 'OPS TABLE', 'df-real.txt': 'OPS TABLE',
  'psql-output.txt': 'OPS TABLE', 'kubectl-get-pods.txt': 'OPS TABLE', 'markdown-table.md': 'OPS TABLE',
  'code-ts.txt': 'CODE / MARKUP', 'json-pkg.txt': 'CODE / MARKUP', 'unified-diff.patch': 'CODE / MARKUP',
  'prices.csv': 'DATA', 'cue-sheet.md': 'DATA',
};
/** best arm known to beat the frontier parent on this lane, from a committed receipt */
const ARMS: Record<string, { tokens: number; arm: string; receipt: string }> = {
  'df-h.txt': { tokens: 134, arm: 'X86 ΚΕΝΟΝ', receipt: 'bench/x86/receipts/kenon.json' },
  'kubectl-get-pods.txt': { tokens: 304, arm: 'X80 PARATAXIS = X86 ΚΕΝΟΝ (tie)', receipt: 'bench/x86/receipts/parataxis.json; kenon.json' },
  'psql-output.txt': { tokens: 173, arm: 'X82 SCHEMA', receipt: 'docs/codecs.md §X82' },
  'cue-sheet.md': { tokens: 101, arm: 'tagstackEncode (base + X74 chain)', receipt: 'bench/x88/receipts/probe1.json' },
  'metrics.tsv': { tokens: 206, arm: 'X81 HARMOS', receipt: 'docs/codecs.md §X81' },
};
const rows: any[] = [];
const D = JSON.parse(fs.readFileSync('bench/x86/receipts/frontier-runD.json', 'utf8'));
for (const r of D.rows) rows.push({ path: r.path, lane: r.lane ?? r.path.split('/').pop(), raw: r.raw, F: r.tokens, parent: r.parent, exact: r.exact, src: 'runD' });
const LF = JSON.parse(fs.readFileSync('bench/x88/receipts/logfront.json', 'utf8'));
for (const r of LF.rows) if (!rows.some((x) => x.path === r.path)) rows.push({ path: r.path, lane: r.lane, raw: r.raw, F: r.F, parent: r.parent, exact: r.exact, src: 'x88-logfront' });
for (const r of rows) {
  const b = fs.readFileSync(r.path);
  r.floor = floorOf(b); r.ratio = +(r.F / r.raw).toFixed(3); r.stackVsFloor = +(r.floor / r.F).toFixed(2);
  r.cat = CAT[r.lane] ?? 'OTHER'; r.bestArm = ARMS[r.lane] ?? null;
}
const out: any = { generatedFrom: ['bench/x86/receipts/frontier-runD.json', 'bench/x88/receipts/logfront.json'], lanes: rows.length, totalF29: D.rows.reduce((a: number, r: any) => a + r.tokens, 0), rows };
fs.writeFileSync('bench/x88/receipts/leaders.json', JSON.stringify(out, null, 1) + '\n');
console.log(`FRONTIER RUN D: ${D.rows.length} lanes, TOTAL ${out.totalF29}, exact ${D.rows.filter((r: any) => r.exact).length}/${D.rows.length}\n`);
const cats = [...new Set(rows.map((r) => r.cat))];
for (const c of cats) {
  const g = rows.filter((r) => r.cat === c).sort((a, b) => b.F - a.F);
  const par: Record<string, number> = {}; for (const r of g) par[r.parent] = (par[r.parent] ?? 0) + 1;
  const lead = Object.entries(par).sort((a, b) => b[1] - a[1])[0];
  const sumF = g.reduce((a, r) => a + r.F, 0), sumRaw = g.reduce((a, r) => a + r.raw, 0), sumFloor = g.reduce((a, r) => a + r.floor, 0);
  console.log(`━━ ${c}  (${g.length} lanes) ━━ LOCAL LEADER: ${lead[0]} on ${lead[1]}/${g.length}   ΣF=${sumF} Σraw=${sumRaw} ratio=${(sumF / sumRaw).toFixed(3)}  brotli Σfloor=${sumFloor}  stack/floor=${(sumFloor / sumF).toFixed(2)}`);
  for (const r of g) console.log(`   ${r.lane.slice(0, 28).padEnd(29)} raw=${String(r.raw).padStart(5)} F=${String(r.F).padStart(5)} ratio=${r.ratio.toFixed(3).padStart(6)} floor=${String(r.floor).padStart(4)} floor/F=${String(r.stackVsFloor).padStart(5)}  parent=${r.parent.padEnd(12)}${r.bestArm ? `  BEATEN BY ${r.bestArm.arm} ${r.bestArm.tokens}` : ''}${r.src === 'x88-logfront' ? '  [new this turn]' : ''}`);
}
console.log('\n=== per-parent win counts across all measured lanes ===');
const all: Record<string, number> = {}; for (const r of rows) all[r.parent] = (all[r.parent] ?? 0) + 1;
for (const [k, v] of Object.entries(all).sort((a, b) => (b[1] as number) - (a[1] as number))) console.log(`  ${k.padEnd(16)} ${v} lanes`);
console.log('\n=== lanes where the stack does NOT beat the brotli -q11 floor at 14.8 bits/token ===');
for (const r of rows.filter((x) => x.stackVsFloor < 1).sort((a, b) => a.stackVsFloor - b.stackVsFloor)) console.log(`  ${r.lane.slice(0, 28).padEnd(29)} floor/F=${r.stackVsFloor}  F=${r.F} floor=${r.floor} parent=${r.parent}`);
