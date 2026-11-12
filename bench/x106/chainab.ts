/**
 * X106 — the CHAIN-LEVEL A/B that decides whether ΤΥΠΟΣ under the meter-headroom
 * gate moves the frontier.  The ΧΕΙΡΩΝ-level A/B (bench/x104/receipts/
 * exactaccept-variants.log) measures -5 over 20 lanes with 0 worse, but ΧΕΙΡΩΝ
 * alone is not the frontier: the chain's node-help is 862 while ΧΕΙΡΩΝ's is 934,
 * so a ΧΕΙΡΩΝ-level win can vanish or invert downstream.  Only this probe can
 * answer it.
 *
 * Both arms pin OMEGA_NO_OROTHESIA=1: ΟΡΟΘΕΣΙΑ is Δ=0 on 29/29 and costs CPU, so
 * leaving it on would add noise to a token measurement and hide the speed result.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
process.env.OMEGA_NO_OROTHESIA = '1';
const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const ARMS = ['off', 'on'] as const;
for (const a of ARMS) { process.env.OMEGA_EXACT_ACCEPT_VARIANTS = a === 'on' ? '1' : ''; tagstackFrontier(fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8'), enc); }
process.env.OMEGA_EXACT_ACCEPT_VARIANTS = '';
const f = fs.openSync('bench/x104/receipts/chainab.log', 'w');
fs.writeSync(f, 'lane\tarm\ttokens\texact\tparent\tsha\tms\n');
const arms: Record<string, any[]> = { off: [], on: [] };
for (const p of lanes) {
  const text = fs.readFileSync(p, 'utf8');
  const name = p.split('/').pop()!;
  const row: any = {};
  for (const a of ARMS) {
    process.env.OMEGA_EXACT_ACCEPT_VARIANTS = a === 'on' ? '1' : '';
    const t1 = Date.now();
    const r: any = tagstackFrontier(text, enc);
    row[a] = { tokens: r.messageTokens, exact: r.decoded === text, parent: r.parentCodec, sha: sha(JSON.stringify(r)), ms: Date.now() - t1 };
    arms[a].push({ path: p, tokens: r.messageTokens, exact: r.decoded === text, ms: row[a].ms });
    fs.writeSync(f, `${name}\t${a}\t${r.messageTokens}\t${r.decoded === text}\t${r.parentCodec}\t${row[a].sha.slice(0, 12)}\t${row[a].ms}\n`);
  }
  const d = row.on.tokens - row.off.tokens;
  console.log(`${name.padEnd(22)} off ${String(row.off.tokens).padStart(5)}  on ${String(row.on.tokens).padStart(5)}  D ${d > 0 ? '+' : ''}${String(d).padStart(3)}  exact ${row.off.exact}/${row.on.exact}  shaSame=${row.off.sha === row.on.sha}  ms ${row.off.ms}/${row.on.ms}`);
}
for (const a of ARMS) console.log(`${a.padEnd(4)} TOTAL ${String(arms[a].reduce((x, y) => x + y.tokens, 0)).padStart(6)}  exact ${arms[a].filter((r) => r.exact).length}/${lanes.length}  ms ${arms[a].reduce((x, y) => x + y.ms, 0)}`);
const d = arms.on.reduce((x, y) => x + y.tokens, 0) - arms.off.reduce((x, y) => x + y.tokens, 0);
fs.writeSync(f, `TOTAL\t\toff ${arms.off.reduce((x, y) => x + y.tokens, 0)}\ton ${arms.on.reduce((x, y) => x + y.tokens, 0)}\tD ${d}\n`);
fs.closeSync(f);
console.log(`\nCHAIN DELTA ${d}`);
