/**
 * X101 — ΠΑΡΑΚΟΛΟΥΘΙΑ (parakolouthia, "the consequence / what follows along"): ΧΕΙΡΟΝ's macro pass has
 *        a structural blind spot — TOKEN-MISALIGNED repeats — and this probe prices it.
 *
 * THE BLIND SPOT, quoted from chiron.ts:1030-1034:
 *
 *     "Char-level n-gram mining proposes phrases whose substitution splits the BPE merges around every
 *      site; mining over the tokenizer's own segments proposes only whole-token concatenations, so a
 *      1-token glyph replacement leaves the surrounding tokenization intact and the bound is realized."
 *
 * So the macro pass deliberately enumerates only TOKEN-ALIGNED spans.  Any repeat that begins or ends
 * inside a token is invisible to it, however often it occurs.  That is a choice, not a theorem: the
 * comment asserts the misaligned substitution is worse, and never measures it.
 *
 * WHAT IS MEASURED.  On the final chain's own body, enumerate CHARACTER n-grams (n = 6..24) that occur
 * at least MIN_OCC times, discard the ones that are already token-aligned (those are ΧΕΙΡΟΝ's own
 * population and are already exhausted — bench/x101/prosthese.json, 269 candidates, Δ = 0), and price
 * the survivors EXACTLY: append one rule whose value is the n-gram, replace every occurrence in the
 * body with the new key, count the whole message, and keep it only if the message got strictly
 * smaller AND chironDecode still gives the same ΧΕΙΡΟΝ-layer expansion.  No bound, no estimate.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const MIN_OCC = 3;
const MAX_PRICE = 260;
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
/** Character offsets of every token boundary in the body, so misalignment can be tested exactly. */
function tokenStarts(body: string): Set<number> {
  const s = new Set<number>([0]);
  let i = 0;
  for (const t of tokenStrings(body, enc)) { i += t.s.length; s.add(i); }
  return s;
}
const rows: any[] = [];
let gCand = 0, gMis = 0, gPriced = 0, gBest = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const R: any = tagstackEncode(text, enc);
  const tp = parse(R.message);
  const base = countTokens(R.message, enc);
  const ref = chironDecode(R.message.slice(R.message.indexOf(CHIRON_START)));
  const body = tp.body;
  const starts = tokenStarts(body);
  // character n-grams occurring >= MIN_OCC times
  const found = new Map<string, number>();
  for (let n = 6; n <= 24; n++) {
    const cnt = new Map<string, number>();
    for (let i = 0; i + n <= body.length; i++) {
      const g = body.slice(i, i + n);
      cnt.set(g, (cnt.get(g) ?? 0) + 1);
    }
    for (const [g, c] of cnt) if (c >= MIN_OCC) found.set(g, c);
  }
  gCand += found.size;
  // drop the token-aligned ones: those are ΧΕΙΡΟΝ's own, already exhausted population
  const mis: Array<{ g: string; c: number }> = [];
  for (const [g, c] of found) {
    const i = body.indexOf(g);
    if (starts.has(i) && starts.has(i + g.length)) continue;
    mis.push({ g, c });
  }
  gMis += mis.length;
  mis.sort((a, b) => b.c * b.g.length - a.c * a.g.length);
  const priced = mis.slice(0, MAX_PRICE);
  gPriced += priced.length;
  const nk = freshKey(tp);
  let best = 0, bestDesc = '';
  for (const c of priced) {
    const val = c.g;
    const keys = tp.keys.concat([nk]);
    const values = tp.values.concat([val]);
    let nb = body, guard = 0;
    while (nb.includes(val) && guard++ < 400) nb = nb.replace(val, nk);
    if (nb === body) continue;
    const m = emit(tp, keys, values, nb);
    const d = countTokens(m, enc) - base;
    if (d < best) {
      try { if (chironDecode(m.slice(m.indexOf(CHIRON_START))) !== ref) continue; } catch { continue; }
      best = d; bestDesc = `x${c.c} len=${val.length} ${JSON.stringify(val.slice(0, 26))}`;
    }
  }
  gBest += best;
  rows.push({ lane, base, ngramCandidates: found.size, misaligned: mis.length, priced: priced.length, bestDelta: best, bestDesc });
  console.log(`${lane.padEnd(18)} base=${String(base).padStart(5)}  char n-grams(>=${MIN_OCC} occ)=${String(found.size).padStart(4)}  misaligned=${String(mis.length).padStart(4)}  priced=${String(priced.length).padStart(3)}  best exact Δ=${String(best).padStart(4)}  ${bestDesc}`);
}
fs.writeFileSync('bench/x101/receipts/parakolouthia.json', JSON.stringify({ note: 'X101 PARAKOLOUTHIA: token-MISALIGNED repeats, the population CHIRON token-aligned mining cannot see; whole-message priced, chironDecode-gated', rows, totals: { ngramCandidates: gCand, misaligned: gMis, priced: gPriced, bestDelta: gBest } }, null, 1));
console.log(`\nΠΑΡΑΚΟΛΟΥΘΙΑ over the ten lanes: ${gCand} repeated char n-grams, ${gMis} of them token-misaligned, ${gPriced} priced exactly; best pooled Δ = ${gBest} tokens`);
