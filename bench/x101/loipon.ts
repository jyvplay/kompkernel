/**
 * X101 — ΛΟΙΠΟΝ (loipon, "the residue"): settle the body's reference/literal split, exactly.
 *
 * Two receipts disagree about the same population.  bench/x97/receipts/runpack2.json says 57.1 % of
 * the body is reference tokens (3 222 / 5 639).  bench/x101/merides.ts says the body is 1 283
 * references and 4 299 literals (23 % / 77 %).  They cannot both describe the body of the shipped
 * wire, and the size of the literal population decides whether any literal-directed codec has a
 * population at all.  So this probe counts it once, carefully, on the FINAL chain output, with an
 * explicit definition and a control.
 *
 * DEFINITION.  Tokenise the body with the tokenizer's own segmenter.  A token is a REFERENCE iff it
 * is exactly one character, that character is a declared rule key, and the key's value is non-empty.
 * Everything else is a LITERAL.  The control is the same count on the committed ΧΕΙΡΟΝ-only wire,
 * which is where runpack2's number came from.
 */
import * as fs from 'node:fs';
import { tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
function splitTape(msg: string): { keys: string[]; body: string } {
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t);
  const keys: string[] = [];
  const seen = new Set<string>(); let ck = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') keys.push(ck); seen.add(ch); ck = ch; }
  }
  if (ck !== '') keys.push(ck);
  return { keys, body: msg.slice(t + 1) };
}
const rows: any[] = [];
let gTok = 0, gRef = 0, gLit = 0, gRefC = 0, gLitC = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const R: any = tagstackEncode(text, enc);
  const fin = splitTape(R.message);
  const T = tokenStrings(fin.body, enc).map(x => x.s);
  const keySet = new Set(fin.keys);
  let ref = 0, lit = 0;
  for (const t of T) { if (t.length === 1 && keySet.has(t)) ref++; else lit++; }
  // CONTROL: the committed ΧΕΙΡΟΝ-only wire, which is what runpack2 counted.
  const cw = fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8');
  const com = splitTape(cw);
  const CT = tokenStrings(com.body, enc).map(x => x.s);
  const cSet = new Set(com.keys);
  let cref = 0, clit = 0;
  for (const t of CT) { if (t.length === 1 && cSet.has(t)) cref++; else clit++; }
  gTok += T.length; gRef += ref; gLit += lit; gRefC += cref; gLitC += clit;
  rows.push({ lane, chainBodyTokens: T.length, chainRef: ref, chainLit: lit, committedBodyTokens: CT.length, committedRef: cref, committedLit: clit });
  console.log(`${lane.padEnd(18)} chain body=${String(T.length).padStart(4)} ref=${String(ref).padStart(4)} (${(100 * ref / T.length).toFixed(0)}%) lit=${String(lit).padStart(4)}   |  committed ΧΕΙΡΟΝ body=${String(CT.length).padStart(4)} ref=${String(cref).padStart(4)} (${(100 * cref / CT.length).toFixed(0)}%) lit=${String(clit).padStart(4)}`);
}
fs.writeFileSync('bench/x101/receipts/loipon.json', JSON.stringify({ note: 'X101 LOIPON: body reference/literal split on the final chain output, with the committed CHIRON-only wire as control', rows, totals: { chainTokens: gTok, chainRef: gRef, chainLit: gLit, committedTokens: gRefC + gLitC, committedRef: gRefC, committedLit: gLitC } }, null, 1));
console.log(`\nΛΟΙΠΟΝ: final chain body ${gTok} tokens = ${gRef} references (${(100 * gRef / gTok).toFixed(1)}%) + ${gLit} literals (${(100 * gLit / gTok).toFixed(1)}%)`);
console.log(`  control, committed ΧΕΙΡΟΝ wire: ${gRefC + gLitC} tokens = ${gRefC} references (${(100 * gRefC / (gRefC + gLitC)).toFixed(1)}%) + ${gLitC} literals`);
