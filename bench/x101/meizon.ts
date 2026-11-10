/**
 * X101 — ΜΕΙΖΩΝ (meizon, "the greater"): IS THE ORDER CONSTRAINT ON ΣΥΝΔΥΑΣΜΟΣ'S FACTORS BINDING?
 *
 * ΣΥΝΔΥΑΣΜΟΣ re-spells value(i) using factors drawn from rules that are STRICTLY EARLIER in the tape.
 * ΜΕΤΑΤΑΞΙΣ chooses that order, but for ONE objective — boundary fusion (vᵢ|kᵢ₊₁ and kᵢ|vᵢ) — and has
 * no notion that a rule's slot also decides which re-spellings are legal at all.  So the tape's order
 * is optimising objective A while silently fixing objective B.
 *
 * THIS PROBE MEASURES THE GAP BETWEEN THEM, WITHOUT BUILDING ANYTHING.
 *
 *   BOUND  = tape tokens if every value were re-spelled with the BEST factor drawn from the WHOLE
 *            tape, order ignored (an upper bound: it is not a legal wire)
 *   ACTUAL = tape tokens as shipped
 *
 * If BOUND is far below ACTUAL, the order constraint is binding and a joint objective has room.  If
 * they are close, ΣΥΝΔΥΑΣΜΟΣ has already extracted what the factor population can give and the
 * coupling is not where the remaining tokens are.
 *
 * The re-spelling model is the one ΣΥΝΔΥΑΣΜΟΣ itself uses: a value becomes an interleaving of at most
 * MAX_PARTS literal runs and references, each reference to a rule whose value is a contiguous piece
 * of the value being re-spelled.  Both bounds are computed with the same segmenter so the comparison
 * is like for like.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const MAX_PARTS = 5;
const wireDir = 'bench/x87/receipts/wires';
const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40', 'bench/holdout-ops', 'bench/holdout-lang', 'bench/holdout-mk', 'bench/holdout-x86', 'bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const f = `${d}/${lane}${e}`; if (fs.existsSync(f)) return f; }
  }
  throw new Error('no source for ' + lane);
};
interface Tape { contract: string; keys: string[]; values: string[]; body: string }
function parse(msg: string): Tape {
  const w = msg.indexOf(CHIRON_START), t = msg.indexOf(CHIRON_SEP, w);
  const tape = msg.slice(w + 1, t);
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>(); let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(t + 1) };
}
/**
 * Cheapest re-spelling of `text` as an interleaving of literal runs and references, where a
 * reference may point at any rule in `pool` (an array of [key, value]).  Returns the spelling and
 * its exact token cost.  Greedy left-to-right over the longest usable factor at each position, which
 * is the same shape of search ΣΥΝΔΥΑΣΜΟΣ uses; it is an UPPER bound in the sense that it is allowed
 * more factors than the legal wire, not in the sense that the search is exhaustive.
 */
function respell(text: string, pool: Array<[string, string]>): { s: string; tok: number } {
  // index factors by their value, longest first
  const byVal = new Map<string, string>();
  for (const [k, v] of pool) if (v.length >= 2 && !byVal.has(v)) byVal.set(v, k);
  const lens = [...new Set([...byVal.keys()].map(v => v.length))].sort((a, b) => b - a);
  let out = '';
  let i = 0;
  while (i < text.length) {
    let used = 0;
    for (const L of lens) {
      if (L > text.length - i) continue;
      const k = byVal.get(text.slice(i, i + L));
      if (k !== undefined) { out += k; used = L; break; }
    }
    if (used === 0) { out += text[i]; used = 1; }
    i += used;
  }
  return { s: out, tok: countTokens(out, enc) };
}
const rows: any[] = [];
let gAct = 0, gBound = 0, gLegal = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const R: any = tagstackEncode(text, enc);
  const tp = parse(R.message);
  const n = tp.keys.length;
  const tapeStr = CHIRON_START + tp.keys.map((k, i) => k + tp.values[i]).join('') + CHIRON_SEP;
  const actual = countTokens(tapeStr, enc);
  // LEGAL bound: each value re-spelled with factors from STRICTLY EARLIER rules only.
  let legalTok = 0;
  const poolL: Array<[string, string]> = [];
  for (let i = 0; i < n; i++) {
    const r = respell(tp.values[i], poolL);
    legalTok += 1 + r.tok;                       // key + re-spelled value
    poolL.push([tp.keys[i], tp.values[i]]);
  }
  // UPPER bound: each value re-spelled with factors from the WHOLE tape.
  const poolAll: Array<[string, string]> = tp.keys.map((k, i) => [k, tp.values[i]] as [string, string]);
  let boundTok = 0;
  for (let i = 0; i < n; i++) boundTok += 1 + respell(tp.values[i], poolAll).tok;
  gAct += actual; gBound += boundTok; gLegal += legalTok;
  rows.push({ lane, rules: n, actualTape: actual, legalRespell: legalTok, unorderedRespell: boundTok });
  console.log(`${lane.padEnd(18)} rules=${String(n).padStart(3)}  tape=${String(actual).padStart(4)}  legal-respell=${String(legalTok).padStart(4)} (${String(legalTok - actual).padStart(4)})  unordered-respell=${String(boundTok).padStart(4)} (${String(boundTok - actual).padStart(4)})`);
}
fs.writeFileSync('bench/x101/receipts/meizon.json', JSON.stringify({ note: 'X101 MEIZON: is the order constraint on SYNDYASMOS factors binding? legal vs unordered re-spelling upper bound', rows, totals: { actual: gAct, legal: gLegal, unordered: gBound } }, null, 1));
console.log(`\nMEIZON over the ten lanes: tape as shipped ${gAct}; re-spelled with LEGAL (earlier-only) factors ${gLegal} (${gLegal - gAct}); with UNORDERED (whole-tape) factors ${gBound} (${gBound - gAct})`);
console.log(`  gap between the two bounds = ${gBound - gLegal} tokens -- that is what the ORDER constraint costs, at most.`);
