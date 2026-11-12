/**
 * X104 — ΤΑΞΙΝΟΜΗΣΙΣ A/B over the 29 frontier lanes.
 *
 * Arms are run INTERLEAVED in one process, because the A/B's wall-clock pair is
 * not a CPU figure and cross-process drift on this box is about 1.6x. Every arm
 * re-reads OMEGA_TAXINOMASIS at call time (the policy is a live env read, not a
 * load-time const — the X104 clock repair), so the arms differ only in the
 * tie-resolution policy and nothing else.
 *
 * The control is `insertion`, which is exactly the shipped behaviour: a stable
 * sort over a Map, ties decided by leftmost occurrence. A control must be
 * checked against a number the code under test did not produce, so `insertion`
 * is measured here rather than carried over from a receipt.
 *
 * Score is the SHA-256 of the COMPLETE message, not the token count: two
 * different wires can share a token count (df-real and df-h both did), and a
 * token-count comparison would report identity for a message that moved.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0';
process.env.OMEGA_OURA_MEMO = '0';

const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const POLICIES = (process.env.X104_POLICIES ?? 'insertion,count,short,exact').split(',');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');

interface Row { path: string; raw: number; tokens: number; exact: boolean; parent: string; msgSha: string; ms: number }
const arms: Record<string, Row[]> = {};

// one warm-up lane that is NOT in the frontier set, so the first arm does not
// pay tokenizer cold-start that the later arms do not
const warm = 'bench/holdout/kb-article.txt';
if (fs.existsSync(warm)) {
  process.env.OMEGA_TAXINOMASIS = 'insertion';
  tagstackFrontier(fs.readFileSync(warm, 'utf8'), enc);
}

for (const pol of POLICIES) {
  process.env.OMEGA_TAXINOMASIS = pol;
  const rows: Row[] = [];
  for (const p of lanes) {
    const text = fs.readFileSync(p, 'utf8');
    const t1 = Date.now();
    const r: any = tagstackFrontier(text, enc);
    rows.push({ path: p, raw: r.rawTokens ?? 0, tokens: r.messageTokens, exact: r.decoded === text,
                parent: r.parentCodec, msgSha: sha(JSON.stringify(r)), ms: Date.now() - t1 });
    // incremental, unbuffered: a 20-minute arm that prints nothing is unreadable
    fs.appendFileSync('bench/x104/receipts/taxinomasis29.log',
      `${pol}\t${p.split('/').pop()}\t${r.messageTokens}\t${r.decoded === text}\t${r.parentCodec}\t${Date.now() - t1}\n`);
  }
  arms[pol] = rows;
  const tot = rows.reduce((a, b) => a + b.tokens, 0);
  console.log(`${pol.padEnd(10)} TOTAL ${String(tot).padStart(6)}  exact ${rows.filter(r => r.exact).length}/${lanes.length}  ms ${rows.reduce((a, b) => a + b.ms, 0)}`);
}

const base = arms[POLICIES[0]];
console.log('\nlane                      ' + POLICIES.map(p => p.padStart(10)).join('') + '   delta');
let improved = 0, worsened = 0, same = 0, shaDiff = 0, inexact = 0;
for (let i = 0; i < lanes.length; i++) {
  const name = lanes[i].split('/').pop()!;
  const cells = POLICIES.map(p => String(arms[p][i].tokens).padStart(10)).join('');
  const best = Math.min(...POLICIES.map(p => arms[p][i].tokens));
  const d = best - base[i].tokens;
  if (POLICIES.some(p => arms[p][i].msgSha !== base[i].msgSha)) shaDiff++;
  if (POLICIES.some(p => !arms[p][i].exact)) inexact++;
  if (d < 0) improved++; else if (d > 0) worsened++; else same++;
  console.log(`${name.padEnd(24)}${cells}   ${d > 0 ? '+' : ''}${d}`);
}
console.log(`\nvs control(${POLICIES[0]}): better ${improved}  worse ${worsened}  same ${same}`);
console.log(`lanes whose complete message hash differs from control: ${shaDiff}/${lanes.length}`);
console.log(`inexact lanes across all arms: ${inexact}`);
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/taxinomasis29.json', JSON.stringify({ policies: POLICIES, lanes: lanes.length, arms }, null, 1) + '\n');
