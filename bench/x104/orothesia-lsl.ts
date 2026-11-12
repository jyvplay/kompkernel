/**
 * X105 — the decisive single-lane test: can ΟΡΟΘΕΣΙΑ beat the shipped
 * configuration on the lane with the most rules?
 *
 * ls-l-real has 143 tape rules (bench/x97), the most in the corpus, so it has the
 * most relocation slots and the most junctions. Arms, interleaved in one process:
 *   base   ΜΕΤΑΤΑΞΙΣ on,  ΟΡΟΘΕΣΙΑ off          (the shipped configuration)
 *   alone  ΜΕΤΑΤΑΞΙΣ off, ΟΡΟΘΕΣΙΑ on, shortlist 4
 *   wide   ΜΕΤΑΤΑΞΙΣ off, ΟΡΟΘΕΣΙΑ on, shortlist 24
 *   both   ΜΕΤΑΤΑΞΙΣ on,  ΟΡΟΘΕΣΙΑ on, shortlist 24
 * Every arm is priced on the complete message hash as well as the token count,
 * because two different wires can share a token count.
 */
import * as fs from 'node:fs';
import { createHash } from 'node:crypto';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';
const enc: any = 'o200k_base';
const lane = process.argv[2] ?? 'bench/holdout-x41/ls-l-real.txt';
const text = fs.readFileSync(lane, 'utf8');
const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const ARMS = [
  { name: 'base', meta: true, oro: false, sl: '' },
  { name: 'alone', meta: false, oro: true, sl: '4' },
  { name: 'wide', meta: false, oro: true, sl: '24' },
  { name: 'both', meta: true, oro: true, sl: '24' },
];
for (const a of ARMS) {
  process.env.OMEGA_NO_METATAXIS = a.meta ? '' : '1';
  process.env.OMEGA_NO_OROTHESIA = a.oro ? '' : '1';
  process.env.OMEGA_OROTHESIA_SHORTLIST = a.sl;
  const t1 = Date.now();
  const r: any = tagstackFrontier(text, enc);
  console.log(`${a.name.padEnd(6)} tokens ${String(r.messageTokens).padStart(5)}  exact=${r.decoded === text}  parent=${r.parentCodec}  sha=${sha(JSON.stringify(r)).slice(0, 12)}  ${Date.now() - t1}ms`);
  fs.appendFileSync('bench/x104/receipts/orothesia-lsl.log',
    `${a.name}\t${r.messageTokens}\t${r.decoded === text}\t${r.parentCodec}\t${sha(JSON.stringify(r)).slice(0, 12)}\t${Date.now() - t1}\n`);
}
