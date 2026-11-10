/**
 * X97 — THE TRANSLITERATION LEVER, PRICED.  census.json: all 29 lanes are pure ASCII.  o200k has
 * only 3 262 two-character ASCII tokens out of 9 025 possible printable-ASCII bigrams, so ~5 800
 * bigrams cost 2 tokens each.  vocab.ts measured that other scripts ALSO carry 2-char tokens
 * (cyrillic 823, arabic 771, polyglot 3 417, cjk 2 408, hangul 387, katakana 153, myanmar 85,
 * khmer 110) -- so a bijection from the missing ASCII bigrams onto those could in principle make
 * every bigram 1 token.  This prices the lever on the real messages:
 *
 *   bound  = number of 2-char ASCII windows in the message that are NOT a single vocabulary token
 *            (each could save at most 1 token)
 *   supply = number of 2-char tokens available OUTSIDE the ASCII set, pooled over all scripts
 *            (the map's domain must be injective, so supply caps the saving)
 *
 * If bound <= supply the lever is arithmetically open; the contract still has to pay for the map,
 * so this is an UPPER BOUND, never an acceptance.
 */
import * as fs from 'node:fs';
import { countTokens, decodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
// the set of 2-char vocabulary tokens, as strings
const twoChar = new Set<string>();
for (let id = 0; id < 200007; id++) {
  let s: string;
  try { s = decodeIds([id], enc); } catch { continue; }
  const cps = [...s];
  if (cps.length === 2 && cps.every(c => c.codePointAt(0)! >= 0x20 && c.codePointAt(0)! < 0x7F)) twoChar.add(s);
}
console.log(`2-char pure-ASCII vocabulary tokens: ${twoChar.size} of 9025 possible printable bigrams`);

const rows: any[] = [];
let gBound = 0, gSupply = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires')) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const parts = [msg.slice(0, w), msg.slice(w + 1, t), msg.slice(t + 1)];
  let bound = 0, windows = 0;
  for (const part of parts) {
    for (let i = 0; i + 1 < part.length; i++) {
      const a = part[i], b = part[i + 1];
      if (a < ' ' || a > '~' || b < ' ' || b > '~') continue;   // printable ASCII window only
      windows++;
      if (!twoChar.has(a + b)) bound++;
    }
  }
  rows.push({ lane: f, windows, bound, messageTokens: countTokens(msg, enc) });
  gBound += bound;
}
// supply: 2-char tokens whose BOTH characters are non-ASCII (any script), pooled and disjoint
let supply = 0;
for (let id = 0; id < 200007; id++) {
  let s: string;
  try { s = decodeIds([id], enc); } catch { continue; }
  const cps = [...s].map(c => c.codePointAt(0)!);
  if (cps.length === 2 && cps.every(c => c >= 0x80 && !(c >= 0xD800 && c <= 0xDFFF) && c !== 0xFFFD)) supply++;
}
gSupply = supply;
console.log(`2-char vocabulary tokens made of two non-ASCII characters (the injective map's codomain): ${supply}`);
console.log(`\n${'lane'.padEnd(20)} ${'ASCII bigrams'.padStart(13)} ${'not 1 token'.padStart(12)} ${'msg tok'.padStart(8)}`);
for (const r of rows) console.log(`${r.lane.padEnd(20)} ${String(r.windows).padStart(13)} ${String(r.bound).padStart(12)} ${String(r.messageTokens).padStart(8)}`);
console.log(`\nUPPER BOUND on the transliteration gain = ${gBound} tokens over the ten wires (${(100 * gBound / rows.reduce((a, b) => a + b.messageTokens, 0)).toFixed(2)}% of 7 844).`);
console.log(`supply ${gSupply} >= bound ${gBound} ? ${gSupply >= gBound}   (necessary, NOT sufficient: the map itself must be transmitted)`);
fs.writeFileSync('bench/x97/receipts/bigram.json', JSON.stringify({ twoCharAscii: twoChar.size, supplyNonAscii: supply, bound: gBound, rows }, null, 1));
