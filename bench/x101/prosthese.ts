/**
 * X101 — ΠΡΟΣΘΕΣΗ (prosthese, "addition"): RE-OPEN THE ADD CENSUS ON THE FINAL CHAIN OUTPUT.
 *
 * X94 closed the dictionary with "ADD(body) d<0 1" and "FACTOR d<0 0/513", and the conclusion was
 * that 84.5 % of the remaining repeated material is 1-2 tokens and therefore cannot pay: a rule costs
 * a key plus its value, so a 1-token span saves nothing however often it repeats.
 *
 * That census was priced on the ΧΕΙΡΟΝ wire.  ΣΥΝΔΥΑΣΜΟΣ (X99) has since RE-SPELLED every value as an
 * interleaving of literal runs and references, and ΜΕΤΑΤΑΞΙΣ has relocated every rule.  Both change
 * the body's reference structure and the tape's value population, so the ADD candidate set is not the
 * set X94 measured.  This probe re-runs the census on the SHIPPED chain's own output.
 *
 * THE CANDIDATE SET.  Token n-grams of the body (n = 2..6) occurring at least twice, priced exactly:
 *
 *     gain = c * (n - 1) - 1 - countTokens(value)          value = the n-gram's source text
 *
 * A candidate is ADMITTED only if the whole message gets strictly smaller, verified with chironDecode.
 * Nothing is estimated; every price is a real token count of a real message.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
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
function freshKey(tp: Tape): string {
  const used = new Set(tp.keys);
  const first = tp.keys[0];
  const spans: Array<[number, number]> = first >= '\uac00' && first <= '\ud7af' ? [[0xac00, 0xd7a4]]
    : first >= '\u30a0' && first <= '\u3100' ? [[0x30a0, 0x3100]]
    : first >= '\u0400' && first <= '\u0500' ? [[0x0400, 0x0500]]
    : first >= '\u0600' && first <= '\u0700' ? [[0x0600, 0x0700]]
    : first >= '\u1000' && first <= '\u10a0' ? [[0x1000, 0x10a0]]
    : first >= '\u1780' && first <= '\u1800' ? [[0x1780, 0x1800]]
    : first >= '\u4e00' && first <= '\ua000' ? [[0x4e00, 0xa000]]
    : [[0x370, 0x600], [0x1e00, 0x2000], [0x3040, 0x3100], [0x4e00, 0xa000], [0xac00, 0xd7a4]];
  for (const [a, b] of spans) for (let cp = a; cp < b; cp++) { const c = String.fromCodePoint(cp); if (!used.has(c) && countTokens(c, enc) === 1) return c; }
  throw new Error('no fresh key');
}
const rows: any[] = [];
let gCand = 0, gProfit = 0, gBest = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const R: any = tagstackEncode(text, enc);
  const tp = parse(R.message);
  const base = countTokens(R.message, enc);
  const T = tokenStrings(tp.body, enc).map(x => x.s);
  // token n-grams of the body occurring >= 2 times
  const found: Array<{ g: string; c: number; n: number }> = [];
  for (let n = 2; n <= 6; n++) {
    const cnt = new Map<string, number>();
    for (let i = 0; i + n <= T.length; i++) { const g = T.slice(i, i + n).join('\u0001'); cnt.set(g, (cnt.get(g) ?? 0) + 1); }
    for (const [g, c] of cnt) if (c >= 2) found.push({ g, c, n });
  }
  gCand += found.length;
  const nk = freshKey(tp);
  let best = 0, bestDesc = '';
  for (const c of found) {
    const val = c.g.split('\u0001').join('');
    const model = c.c * (c.n - 1) - 1 - countTokens(val, enc);
    if (model >= 0) continue;                       // cannot pay on the model
    // price it exactly: append the rule, replace occurrences in the body
    const keys = tp.keys.concat([nk]);
    const values = tp.values.concat([val]);
    let body = tp.body, guard = 0;
    while (body.includes(val) && guard++ < 400) body = body.replace(val, nk);
    const m = emit(tp, keys, values, body);
    const tk = countTokens(m, enc);
    const d = tk - base;
    if (d < best) {
      try { if (chironDecode(m.slice(m.indexOf(CHIRON_START))) !== chironDecode(R.message.slice(R.message.indexOf(CHIRON_START)))) continue; } catch { continue; }
      best = d; bestDesc = `n=${c.n} x${c.c} ${JSON.stringify(val.slice(0, 18))}`;
    }
  }
  gProfit += best;
  rows.push({ lane, base, candidates: found.length, bestDelta: best, bestDesc });
  console.log(`${lane.padEnd(18)} base=${String(base).padStart(5)}  body n-gram candidates(>=2 occ)=${String(found.length).padStart(5)}  best exact Δ=${String(best).padStart(4)}  ${bestDesc}`);
}
fs.writeFileSync('bench/x101/receipts/prosthese.json', JSON.stringify({ note: 'X101 PROSTHESE: ADD census re-opened on the FINAL chain output, whole-message priced, chironDecode-gated', rows, totals: { candidates: gCand, bestDelta: gProfit } }, null, 1));
console.log(`\nPROSTHESE: ${gCand} body n-gram candidates over the ten lanes; best exact pooled Δ = ${gProfit} tokens (${(100 * gProfit / 7732).toFixed(3)}% of 7 732)`);
