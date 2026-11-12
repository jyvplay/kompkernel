/**
 * X106 — ΤΑΞΙΝΟΜΗΣΙΣ `exact` POLICY, THE MEASUREMENT THAT NEVER COMPLETED.
 *
 * X104 built the tie census (bench/x104/tiecensus.ts) and found that EVERY
 * truncating epoch at both cuts lands inside a tie group > 1 — 21 of 21 at the
 * prefilter (max group 263) and 133 of 133 at the window (max group 100).  So
 * candidate survival is decided by Map insertion order, i.e. by leftmost
 * occurrence in the text.  The `exact` policy replaces that with the objective
 * itself: for each tied candidate it snapshots the rule set, applies the
 * candidate, prices the wire the encoder would actually EMIT, and restores.
 * The X104 run was killed mid-arm, so no `exact` total exists and none may be
 * quoted.  This probe finishes it.
 *
 * Arms are interleaved PER LANE (A,B,A,B is not needed — one pass each, in the
 * same process, alternating the order lane by lane is unnecessary because the
 * score is a SHA-256 of the message and the chain is deterministic under
 * OMEGA_DET=1 after the X104 clock repair).  What IS controlled: the warm-up
 * lane exists, and `insertion` is measured here rather than carried over.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';
// ΟΡΟΘΕΣΙΑ is Δ=0 on 29/29 and costs CPU, so it is off for both arms; leaving it
// on would add noise to a measurement that is about tie resolution.
process.env.OMEGA_NO_OROTHESIA = '1';

const enc: any = 'o200k_base';
const ALL = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const WANT = (process.env.X106_LANES ?? 'vmstat,markdown-table,psql-output,email-thread,du-real,findmnt,prices,unified-diff,df-real,ps-real,metrics,kubectl,ls-real,node-help,llm-answer').split(',');
const lanes = ALL.filter(p => WANT.some(w => p.includes(w)));
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const POLICIES = (process.env.X106_POLICIES ?? 'insertion,exact').split(',');

const warm = 'bench/holdout-work/kb-article.txt';
if (fs.existsSync(warm)) {
  for (const pol of POLICIES) { process.env.OMEGA_TAXINOMASIS = pol; tagstackFrontier(fs.readFileSync(warm, 'utf8'), enc); }
}
process.env.OMEGA_TAXINOMASIS = '';

const arms: Record<string, any[]> = {};
for (const pol of POLICIES) arms[pol] = [];
const out = fs.createWriteStream('bench/x104/receipts/taxexact.log', { flags: 'w' });
out.write('lane\tpolicy\ttokens\texact\tparent\tsha\tms\n');
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  const row: any = {};
  for (const pol of POLICIES) {
    process.env.OMEGA_TAXINOMASIS = pol;
    const t1 = Date.now();
    const r: any = tagstackFrontier(text, enc);
    const dt = Date.now() - t1;
    row[pol] = { tokens: r.messageTokens, exact: r.decoded === text, parent: r.parentCodec, sha: sha(JSON.stringify(r)), ms: dt };
    arms[pol].push({ path: p, tokens: r.messageTokens, exact: r.decoded === text, ms: dt });
    out.write(`${name}\t${pol}\t${r.messageTokens}\t${r.decoded === text}\t${r.parentCodec}\t${row[pol].sha.slice(0, 12)}\t${dt}\n`);
  }
  const a = row[POLICIES[0]!]!, b = row[POLICIES[POLICIES.length - 1]!]!;
  const d = b.tokens - a.tokens;
  console.log(`${name.padEnd(22)} ${POLICIES[0]} ${String(a.tokens).padStart(5)}  ${POLICIES[POLICIES.length - 1]} ${String(b.tokens).padStart(5)}  Δ ${d > 0 ? '+' : ''}${String(d).padStart(3)}  exact ${a.exact}/${b.exact}  shaSame=${a.sha === b.sha}  ms ${a.ms}/${b.ms}`);
}
for (const pol of POLICIES) {
  const t = arms[pol].reduce((x, y) => x + y.tokens, 0);
  console.log(`${pol.padEnd(10)} TOTAL ${String(t).padStart(6)}  exact ${arms[pol].filter((r) => r.exact).length}/${lanes.length}  ms ${arms[pol].reduce((x, y) => x + y.ms, 0)}`);
}
out.end();
const tot: any = {};
for (const pol of POLICIES) tot[pol] = arms[pol].reduce((x, y) => x + y.tokens, 0);
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/taxexact.json', JSON.stringify({ lanes: lanes.length, policies: POLICIES, totals: tot, rows: arms }, null, 1) + '\n');
console.log(`\nDELTA ${POLICIES[POLICIES.length - 1]} - ${POLICIES[0]} = ${tot[POLICIES[POLICIES.length - 1]!]! - tot[POLICIES[0]!]!}`);
