/**
 * X101 — ΠΡΟΤΕΡΟΣ (proteros, "the earlier one"): ORDER THE TAPE BY INCREASING EXPANDED VALUE LENGTH,
 *        SO EVERY SHORTER VALUE BECOMES A LEGAL FACTOR FOR EVERY LONGER ONE.
 *
 * THE MEASUREMENT THAT MOTIVATES IT (bench/x101/meizon.ts, receipts/meizon.json).  ΣΥΝΔΥΑΣΜΟΣ may
 * only re-spell value(i) with factors drawn from rules STRICTLY EARLIER in the tape, and ΜΕΤΑΤΑΞΙΣ
 * chooses that order for boundary fusion alone — it has no notion that a rule's slot also decides
 * which re-spellings are legal at all.  Re-spelling the same tapes with the WHOLE tape available as
 * factors, order ignored, gives an UPPER BOUND:
 *
 *     tape as shipped                          2 012 tokens
 *     re-spelled, earlier-only factors         2 285 tokens   (this probe's greedy respeller)
 *     re-spelled, whole-tape factors           1 181 tokens   (-831, NOT A LEGAL WIRE)
 *
 * so the order constraint is worth up to 831 tokens over ten lanes — 10.6 % of the message.
 *
 * WHY THE CONSTRAINT IS ALMOST ENTIRELY SELF-INFLICTED.  A factor must be a CONTIGUOUS PIECE of the
 * value it re-spells, so a usable factor is never longer than its user.  Therefore an order that puts
 * SHORTER VALUES FIRST makes every usable factor legal — the constraint stops binding at all.  The
 * only thing such an order must still respect is the dependency the re-spelling itself creates, and
 * that is satisfied by construction because each value is re-spelled using only rules already placed.
 *
 * WHAT THIS PROBE MEASURES, on the shipped chain's own output, whole-message priced and
 * chironDecode-gated:
 *
 *   arm 1  reorder by increasing expanded length, NO re-spelling      -> the boundary cost of the order
 *   arm 2  reorder + re-spell every value with all-earlier factors   -> the mechanism itself
 *   arm 3  arm 2, then ΜΕΤΑΤΑΞΙΣ and ΣΥΝΔΥΑΣΜΟΣ on top              -> the mechanism plus the
 *                                                                        existing boundary optimisers
 *
 * Arms 2 and 3 are real, legal, byte-exact wires.  Arm 1 is a diagnostic: it isolates how much the
 * new order costs in boundary fusion before any re-spelling pays for it.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';
import { metataxisEncode } from '../../src/lib/omega/metataxis';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';

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
const emit = (tp: Tape, keys: string[], values: string[], body: string): string =>
  tp.contract + CHIRON_START + keys.map((k, i) => k + values[i]).join('') + CHIRON_SEP + body;

/** Expand a tape's values to plain text, memoised. */
function expandAll(tp: Tape): string[] {
  const keyIdx = new Map(tp.keys.map((k, i) => [k, i]));
  const memo: string[] = new Array(tp.keys.length).fill('');
  const done: boolean[] = new Array(tp.keys.length).fill(false);
  const exp = (i: number, depth: number): string => {
    if (done[i]) return memo[i];
    if (depth > 64) return tp.values[i];
    let out = '';
    for (const ch of tp.values[i]) {
      const j = keyIdx.get(ch);
      out += j === undefined ? ch : exp(j, depth + 1);
    }
    memo[i] = out; done[i] = true;
    return out;
  };
  return tp.keys.map((_, i) => exp(i, 0));
}

/** Greedy longest-factor re-spelling of `text` using [key, expandedValue] pairs. */
function respell(text: string, pool: Array<[string, string]>): string {
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
  return out;
}

const rows: any[] = [];
let gA1 = 0, gA2 = 0, gA3 = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const R: any = tagstackEncode(text, enc);
  const tp = parse(R.message);
  const base = countTokens(R.message, enc);
  const ref = chironDecode(R.message.slice(R.message.indexOf(CHIRON_START)));
  const expVals = expandAll(tp);
  const n = tp.keys.length;

  // ---- ARM 1: reorder by increasing expanded length, keys and values carried along, NO re-spelling.
  const byLen = tp.keys.map((_, i) => i).sort((a, b) => expVals[a].length - expVals[b].length || a - b);
  const m1 = emit(tp, byLen.map(i => tp.keys[i]), byLen.map(i => tp.values[i]), tp.body);
  const t1 = countTokens(m1, enc);
  const ok1 = chironDecode(m1.slice(m1.indexOf(CHIRON_START))) === ref;

  // ---- ARM 2: same order, but every value re-spelled using ALL EARLIER rules as factors.
  const nk: string[] = [], nv: string[] = [];
  const pool: Array<[string, string]> = [];
  for (const i of byLen) {
    const s = respell(expVals[i], pool);
    nk.push(tp.keys[i]); nv.push(s);
    pool.push([tp.keys[i], expVals[i]]);
  }
  const m2 = emit(tp, nk, nv, tp.body);
  const t2 = countTokens(m2, enc);
  const ok2 = chironDecode(m2.slice(m2.indexOf(CHIRON_START))) === ref;

  // ---- ARM 3: arm 2, then the existing boundary optimisers on top.
  let t3 = t2, m3 = m2;
  try {
    const M = metataxisEncode(ref, enc, { message: m2, messageTokens: t2, decoded: ref });
    if (M.applied && M.messageTokens < t3) { t3 = M.messageTokens; m3 = M.message; }
    const S = syndyasmosEncode(ref, enc, { message: m3, messageTokens: t3, decoded: ref });
    if (S.applied && S.messageTokens < t3) { t3 = S.messageTokens; m3 = S.message; }
  } catch { /* arm 3 is a bonus; its failure does not invalidate arm 2 */ }
  const ok3 = chironDecode(m3.slice(m3.indexOf(CHIRON_START))) === ref;

  gA1 += t1 - base; gA2 += t2 - base; gA3 += t3 - base;
  rows.push({ lane, base, rules: n, arm1: t1, arm1Delta: t1 - base, arm1Exact: ok1, arm2: t2, arm2Delta: t2 - base, arm2Exact: ok2, arm3: t3, arm3Delta: t3 - base, arm3Exact: ok3 });
  console.log(`${lane.padEnd(18)} base=${String(base).padStart(5)} n=${String(n).padStart(3)}  arm1(reorder)=${String(t1).padStart(5)} (${String(t1 - base).padStart(4)}, ex=${ok1})  arm2(+respell)=${String(t2).padStart(5)} (${String(t2 - base).padStart(4)}, ex=${ok2})  arm3(+boundary)=${String(t3).padStart(5)} (${String(t3 - base).padStart(4)}, ex=${ok3})`);
}
fs.writeFileSync('bench/x101/receipts/proteros.json', JSON.stringify({ note: 'X101 PROTEROS: order by increasing expanded value length so every shorter value is a legal factor; arms priced whole-message and chironDecode-gated', rows, totals: { arm1: gA1, arm2: gA2, arm3: gA3 } }, null, 1));
console.log(`\nPROTEROS over the ten lanes: arm1(reorder only) ${gA1}; arm2(+respell) ${gA2}; arm3(+boundary optimisers) ${gA3}`);
