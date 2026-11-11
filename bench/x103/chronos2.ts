/**
 * X103 — WHERE DOES THE CHAIN'S TIME ACTUALLY GO, per codec, on the three heaviest lanes?
 * Contradiction to resolve: chiron is 70 % of chain wall clock on ls-l-real
 * (bench/x101 chronos), yet enabling ΔΙΑΓΡΑΦΗ measured 2 % FASTER (diacpu.json).
 * ΔΙΑΓΡΑΦΗ's sweep is O(rules) whole-message re-prices, which on a ~600-rule lane
 * should be tens of seconds.  Both cannot be true.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';
import { diagrapheEncode } from '../../src/lib/omega/diagraphe';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const lanes = ['bench/holdout-x41/ls-l-real.txt', 'bench/holdout-work/ls-l-real.txt', 'bench/holdout-x40/apt-real.txt', 'bench/holdout-x40/code-ts.txt', 'bench/holdout-x40/dpkg-l.txt'];
for (const p of lanes) {
  if (!fs.existsSync(p)) { console.log(`MISSING ${p}`); continue; }
  const text = fs.readFileSync(p, 'utf8');
  const t0 = Date.now();
  const R: any = tagstackEncode(text, enc);
  const tChain = Date.now() - t0;
  // rule census of the shipped wire
  const msg = String(R.message);
  const w = msg.indexOf(CHIRON_START);
  const sep = msg.indexOf('¶', w);
  const tape = msg.slice(w + 1, sep);
  let rules = 0;
  for (const ch of tape) if (ch.charCodeAt(0) > 0x370) rules++;
  // isolated ΔΙΑΓΡΑΦΗ re-run on the shipped wire (it is idempotent by construction:
  // a second sweep has nothing left to delete, so this is a pure cost measurement)
  const t1 = Date.now();
  const d: any = diagrapheEncode(text, enc, { message: msg, messageTokens: R.messageTokens, decoded: R.decoded });
  const tDiag = Date.now() - t1;
  console.log(`${p.split('/').pop()!.padEnd(16)} chain=${String(tChain).padStart(7)} ms  rules=${String(rules).padStart(4)}  body=${String(msg.length - sep).padStart(6)} B  msgTok=${String(R.messageTokens).padStart(5)}  parent=${R.parentCodec}`);
  console.log(`    ΔΙΑΓΡΑΦΗ idempotent re-sweep: ${tDiag} ms, examined=${d.examined} deleted=${d.deleted} priced=${d.priced} applied=${d.applied}`);
  console.log(`    notes: ${String(d.notes).slice(0, 160)}`);
}
