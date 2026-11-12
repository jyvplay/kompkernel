/**
 * X105 — IS THE TAPE'S PRICE DECOMPOSABLE ACROSS RULE BOUNDARIES?
 *
 * ΜΕΤΑΤΑΞΙΣ permutes the tape's rules. The blocks `keys[i] + values[i]` are
 * UNCHANGED by a permutation ("Letters are UNCHANGED, so no substitution pass is
 * needed"), so the only thing that differs between two permutations is which
 * blocks are ADJACENT. If the token price of the concatenation were the sum of
 * the blocks' own prices, a probe could be priced in O(1) instead of O(message),
 * and ΜΕΤΑΤΑΞΙΣ — which is measurably unconverged — could afford orders of
 * magnitude more probes.
 *
 * This measures the gap directly, on real tapes, rather than assuming it away.
 * `additive` is sum_i countTokens(block_i). `full` is countTokens(head + tape +
 * tail) for the identity order. If they agree, the invariant holds. If they do
 * not, the junction cost is measured per adjacent pair so the correction can be
 * built exactly rather than approximated.
 */
import * as fs from 'node:fs';
import { tagstackFrontier } from '../../src/lib/omega/tagstack';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

process.env.OMEGA_DET = '1'; process.env.OMEGA_NO_MEMO = '1';
process.env.OMEGA_ENGRAM = '0'; process.env.OMEGA_OURA_MEMO = '0';

const enc: any = 'o200k_base';
const lanes = fs.readFileSync('/tmp/lanes.txt', 'utf8').split('\n').filter(Boolean);
// the lanes with the most rules, where the order matters most
const pick = process.argv[2] ? [process.argv[2]] : lanes.filter(p => /ls-l-real|ps-aux-real|dpkg-l|code-ts|apt-real|node-help/.test(p));

for (const p of pick) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = tagstackFrontier(text, enc);
  const msg: string = r.message ?? '';
  const w = msg.indexOf(CHIRON_START);
  if (w < 0) { console.log(`${p.split('/').pop()}: no tape`); continue; }
  const tEnd = msg.indexOf(CHIRON_SEP, w);
  const head = msg.slice(0, w + CHIRON_START.length);
  const tape = msg.slice(w + CHIRON_START.length, tEnd);
  const tail = msg.slice(tEnd);
  // parse blocks: a glyph is a KEY on first appearance
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) {
      if (ck !== '') { keys.push(ck); values.push(cv); }
      seen.add(ch); ck = ch; cv = '';
    } else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  const blocks = keys.map((k, i) => k + values[i]);
  const n = blocks.length;
  const full = countTokens(head + tape + tail, enc);
  const headT = countTokens(head, enc), tailT = countTokens(tail, enc);
  const blockT = blocks.map(b => countTokens(b, enc));
  const additive = headT + blockT.reduce((a, b) => a + b, 0) + tailT;
  // junction cost for the identity order, measured per adjacent pair
  let junctionSum = 0, nonTrivialJunctions = 0;
  for (let i = 0; i + 1 < n; i++) {
    const pair = countTokens(blocks[i] + blocks[i + 1], enc);
    const sep = blockT[i] + blockT[i + 1];
    junctionSum += pair - sep;
    if (pair !== sep) nonTrivialJunctions++;
  }
  console.log(`${p.split('/').pop()!.padEnd(20)} rules=${String(n).padStart(4)} full=${String(full).padStart(5)} head=${String(headT).padStart(4)} tail=${String(tailT).padStart(4)} sum(blocks)=${String(blockT.reduce((a, b) => a + b, 0)).padStart(5)} additive=${String(additive).padStart(5)} gap=${String(full - additive).padStart(4)} nonTrivialJunctions=${nonTrivialJunctions}/${n - 1}`);
}
