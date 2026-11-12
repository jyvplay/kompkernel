/**
 * X107 — where do the tape's tokens actually go? The cost census says the tape is
 * 26.9 % of the frontier and nested ΧΕΙΡΩΝ on it returns gain exactly 0, so it is at
 * ΧΕΙΡΩΝ's fixed point.  But the tape is a *concatenation of independent entries*, and
 * the tokenizer segments the concatenation greedily.  If an entry's trailing bytes
 * merge with the next entry's leading bytes into one token, or if a boundary forces a
 * split that a different entry ORDER would avoid, then the tape's token count is not
 * the sum of its entries' token counts — and the difference is real, unclaimed
 * headroom that no per-entry pass can see.
 *
 * This probe measures exactly that: Σ tokens(entry) vs tokens(tape), per lane.
 */
import * as fs from 'node:fs';
import { chironEncode } from '../../src/lib/omega/chiron';
import { countTokens } from '../../src/lib/omega/bpe';
process.env.OMEGA_DET = '1';
const enc: any = 'o200k_base';
const lanes = (process.argv[2] ?? '/tmp/lanes.txt').split('\n').filter(Boolean);
let sumPart = 0, sumWhole = 0, n = 0;
for (const p of lanes.slice(0, Number(process.argv[3] ?? 4))) {
  const text = fs.readFileSync(p, 'utf8');
  const r: any = chironEncode(text, enc);
  const w = r.wire.indexOf('\u00a7');
  if (w < 0) { console.log(`${p.split('/').pop()}: no §`); continue; }
  const tEnd = r.wire.indexOf('\u00b6', w);
  if (tEnd < 0) { console.log(`${p.split('/').pop()}: no ¶`); continue; }
  const tape = r.wire.slice(w + 1, tEnd);
  // entries are interleaved value+glyph with no '='; a '|' is the observed separator
  // family.  Measure the boundary effect by comparing the token count of the whole
  // tape against the token count of a fixed split of the same bytes.
  const whole = countTokens(tape, enc);
  // a control the code under test did NOT produce: the same bytes with a separator
  // inserted at every observed boundary, which can only ever cost more tokens
  const seps = (tape.match(/[|;,]/g) ?? []).length;
  const parts = tape.split(/(?<=[|;,])/).map((s) => countTokens(s, enc)).reduce((a, b) => a + b, 0);
  sumPart += parts; sumWhole += whole; n++;
  console.log(`${p.split('/').pop()!.padEnd(20)} tape ${String(tape.length).padStart(5)} ch  whole ${String(whole).padStart(4)} tok  Σparts ${String(parts).padStart(4)}  boundary ${parts - whole > 0 ? '+' : ''}${parts - whole}  seps ${seps}`);
}
if (n > 1) console.log(`\nΣ whole ${sumWhole}  Σ parts ${sumPart}  boundary effect ${sumPart - sumWhole} over ${n} lanes`);
