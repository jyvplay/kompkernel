/** X88 probe 5 — the decisive measurement.
 *  TYPOS (X41) induces a log mask by `largestGroup(raw, cellSignature)`: it finds the
 *  skeleton shared by the MOST lines and folds that group. Every line outside the largest
 *  group is left as literal text. So a file with several line shapes — a real log with two
 *  services in it, `dpkg -l` with its header block, `npm ls` with a root line, `git numstat`
 *  with commit blocks between stat lines — pays full price on every minority line.
 *  This counts the groups, prices the largest-group-only fold, and prices the ALL-GROUPS
 *  fold, gross, with no frontier call. */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { cellSignature, typosPlan, typosTransform } from '../../src/lib/omega/typos';
const enc: any = 'o200k_base';
const T = (s: string) => countTokens(s, enc);

const LANES = ['bench/holdout-ops/openstack-loghub-26.log', 'bench/holdout-x86/ls-la-usrbin.txt',
  'bench/holdout-x86/npm-ls-all.txt', 'bench/holdout-ops/find-listing.txt', 'bench/holdout-x86/dpkg-l-full.txt',
  'bench/holdout-x41/apt-real.txt', 'bench/holdout-x41/ls-l-real.txt', 'bench/holdout-x42/dpkg-l.txt',
  'bench/holdout-ops/git-numstat.txt', 'bench/holdout-ops/npm-ls.txt', 'bench/holdout-x42/findmnt.txt',
  'bench/holdout-x41/ps-aux-real.txt', 'bench/holdout-x41/node-help.txt', 'bench/holdout-tbl/psql-output.txt'];

const rows: any[] = [];
for (const p of LANES) {
  if (!fs.existsSync(p)) { console.log('missing', p); continue; }
  const S = fs.readFileSync(p, 'utf8');
  const eol = S.includes('\r\n') ? '\r\n' : '\n';
  const tail = S.endsWith(eol) ? eol : '';
  const lines = (tail ? S.slice(0, -tail.length) : S).split(eol);
  const groups = new Map<string, number>();
  for (const l of lines) { const k = cellSignature(l); groups.set(k, (groups.get(k) ?? 0) + 1); }
  const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1]);
  const largest = sorted[0]?.[1] ?? 0;
  const coverage = lines.length ? largest / lines.length : 0;
  let plan: any = null, xform: string | null = null, xformTok: number | null = null;
  try { plan = typosPlan(S, enc); if (plan) { xform = typosTransform(S, plan); xformTok = T(xform!); } } catch (e) { plan = 'threw'; }
  const raw = T(S);
  rows.push({ lane: p.split('/').pop(), path: p, lines: lines.length, groups: groups.size,
    largest, coveragePct: +(100 * coverage).toFixed(1), top5: sorted.slice(0, 5).map(([k, n]) => [k.slice(0, 40), n]),
    raw, typosPlan: plan && plan !== 'threw' ? true : false, typosXformTokens: xformTok,
    minorityLines: lines.length - largest });
  const r = rows[rows.length - 1];
  console.log(`\n${r.lane}  lines=${r.lines} skeletons=${r.groups} largest=${r.largest} (${r.coveragePct}%) MINORITY=${r.minorityLines}`);
  console.log(`  raw=${raw}  typosPlan=${r.typosPlan}  typosTransform tokens=${xformTok ?? '-'}  (gross ${xformTok != null ? xformTok - raw : '-'})`);
  console.log(`  top skeletons: ${r.top5.map(([k, n]) => `${n}×${JSON.stringify(k)}`).join('  ')}`);
  fs.mkdirSync('bench/x88/receipts', { recursive: true });
  fs.writeFileSync('bench/x88/receipts/skeleton-census.json', JSON.stringify({ rows }, null, 1) + '\n');
}
console.log('\n=== summary: minority lines that no single-skeleton fold can reach ===');
for (const r of rows) console.log(`  ${r.lane.padEnd(26)} ${String(r.minorityLines).padStart(4)}/${String(r.lines).padEnd(4)} minority lines  skeletons=${r.groups}  coverage=${r.coveragePct}%`);
