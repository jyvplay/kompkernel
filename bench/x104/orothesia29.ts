/**
 * X105 — ΟΡΟΘΕΣΙΑ A/B over the 29 frontier lanes, interleaved in one process.
 *
 * Arms:
 *   base      ΜΕΤΑΤΑΞΙΣ as shipped, ΟΡΟΘΕΣΙΑ off          (the control)
 *   plus      ΜΕΤΑΤΑΞΙΣ as shipped, ΟΡΟΘΕΣΙΑ on          (additive arm)
 *   alone     ΜΕΤΑΤΑΞΙΣ off,        ΟΡΟΘΕΣΙΑ on          (replacement arm)
 *
 * The control must be checked against a number the code under test did not
 * produce, so `base` is measured here rather than carried over from a receipt.
 * Score is the SHA-256 of the complete message, because two different wires can
 * share a token count (df-real and df-h both did) and a token-count comparison
 * would report identity for a message that moved.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
const ARMS: Array<{ name: string; metataxis: boolean; orothesia: boolean }> = [
  { name: 'base', metataxis: true, orothesia: false },
  { name: 'plus', metataxis: true, orothesia: true },
];
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
interface Row { path: string; raw: number; tokens: number; exact: boolean; parent: string; msgSha: string; ms: number }
const arms: Record<string, Row[]> = {};

// warm-up on a lane that is NOT in the frontier set, so no arm pays tokenizer
// cold-start that the others do not
{
  process.env.OMEGA_NO_METATAXIS = '1'; process.env.OMEGA_NO_OROTHESIA = '1';
  tagstackFrontier(fs.readFileSync('bench/holdout-work/kb-article.txt', 'utf8'), enc);
}

for (const arm of ARMS) {
  process.env.OMEGA_NO_METATAXIS = arm.metataxis ? '' : '1';
  process.env.OMEGA_NO_OROTHESIA = arm.orothesia ? '' : '1';
  const rows: Row[] = [];
  for (const p of lanes) {
    const text = fs.readFileSync(p, 'utf8');
    const t1 = Date.now();
    const r: any = tagstackFrontier(text, enc);
    rows.push({ path: p, raw: r.rawTokens ?? 0, tokens: r.messageTokens, exact: r.decoded === text,
                parent: r.parentCodec, msgSha: sha(JSON.stringify(r)), ms: Date.now() - t1 });
    fs.appendFileSync('bench/x104/receipts/orothesia29.log',
      `${arm.name}\t${p.split('/').pop()}\t${r.messageTokens}\t${r.decoded === text}\t${r.parentCodec}\t${Date.now() - t1}\n`);
  }
  arms[arm.name] = rows;
  const tot = rows.reduce((a, b) => a + b.tokens, 0);
  console.log(`${arm.name.padEnd(7)} TOTAL ${String(tot).padStart(6)}  exact ${rows.filter(r => r.exact).length}/${lanes.length}  ms ${rows.reduce((a, b) => a + b.ms, 0)}`);
}

const base = arms.base;
console.log('\nlane                      ' + ARMS.map(a => a.name.padStart(9)).join('') + '   plus/Δ  alone/Δ');
let bPlus = 0, wPlus = 0, sPlus = 0, bAlone = 0, wAlone = 0, sAlone = 0, inexact = 0, shaDiff = 0;
for (let i = 0; i < lanes.length; i++) {
  const name = lanes[i].split('/').pop()!;
  const dp = arms.plus[i].tokens - base[i].tokens;
  const da = arms.alone[i].tokens - base[i].tokens;
  if (dp < 0) bPlus++; else if (dp > 0) wPlus++; else sPlus++;
  if (da < 0) bAlone++; else if (da > 0) wAlone++; else sAlone++;
  if (ARMS.some(a => !arms[a.name][i].exact)) inexact++;
  if (ARMS.some(a => arms[a.name][i].msgSha !== base[i].msgSha)) shaDiff++;
  console.log(`${name.padEnd(24)}${String(base[i].tokens).padStart(9)}${String(arms.plus[i].tokens).padStart(6)}(${dp > 0 ? '+' : ''}${dp})${String(arms.alone[i].tokens).padStart(6)}(${da > 0 ? '+' : ''}${da})`);
}
console.log(`\nplus  vs base: better ${bPlus}  worse ${wPlus}  same ${sPlus}   total Δ ${arms.plus.reduce((a, b) => a + b.tokens, 0) - base.reduce((a, b) => a + b.tokens, 0)}`);
console.log(`alone vs base: better ${bAlone}  worse ${wAlone}  same ${sAlone}   total Δ ${arms.alone.reduce((a, b) => a + b.tokens, 0) - base.reduce((a, b) => a + b.tokens, 0)}`);
console.log(`CPU ms  base ${base.reduce((a, b) => a + b.ms, 0)}  plus ${arms.plus.reduce((a, b) => a + b.ms, 0)}  alone ${arms.alone.reduce((a, b) => a + b.ms, 0)}`);
console.log(`lanes whose complete message hash differs from base: ${shaDiff}/${lanes.length}`);
console.log(`inexact lanes across all arms: ${inexact}`);
fs.mkdirSync('bench/x104/receipts', { recursive: true });
fs.writeFileSync('bench/x104/receipts/orothesia29.json', JSON.stringify({ arms, lanes: lanes.length }, null, 1) + '\n');
