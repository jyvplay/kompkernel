/**
 * X102 — ΕΠΑΝΑΛΗΨΙΣ (epanalepsis, "repetition, resumption"): re-run ΧΕΙΡΟΝ's ADD mining on the
 *        SHIPPED wire, with no model filter at all.
 *
 * WHY THIS IS NOT A REHASH.  ΧΕΙΡΟΝ's macro pass mines repeated spans and adds a rule per span.  It
 * runs ONCE, inside chironEncode, and the stack then applies ΜΕΤΑΤΑΞΙΣ (relocation), ΣΥΝΔΥΑΣΜΟΣ
 * (value re-spelling) and ΓΕΝΝΑΔΑΣ (parent-relative search) on top.  NONE of those re-runs the ADD
 * mining.  So the shipped wire has never been re-mined.
 *
 * WHY THE EARLIER PROBE DID NOT TEST THIS.  bench/x101/prosthese.ts filtered with
 *
 *     const model = c * (n - 1) - 1 - countTokens(val, enc);
 *     if (model >= 0) continue;      // <-- INVERTED
 *
 * `model` is the predicted SAVING, so `model >= 0` marks the candidates the model expects to PAY, and
 * the probe priced exactly the ones it expected to LOSE.  Its Δ = 0 therefore says nothing about the
 * population that matters.  That is a bug in my own instrument and it is corrected here: this probe
 * applies NO model filter and prices every candidate exactly, in the order ΧΕΙΡΟΝ itself would
 * (occurrences in the body AND in every literal rule's value).
 *
 * WHAT IS PRICED.  Token n-grams of the body, n = 2..MAX_N, occurring at least twice.  For each:
 * append one rule whose value is the n-gram's source text, replace every occurrence in the body and
 * in every literal rule's value with the new key, count the WHOLE message, and keep it only if the
 * message got strictly smaller AND chironDecode still gives the same ΧΕΙΡΟΝ-layer expansion.  Greedy:
 * candidates are applied best-first and the search stops when a full pass adds nothing.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const MAX_N = 12;
const ROUNDS = 6;
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
let gBase = 0, gAfter = 0, gCand = 0, gPriced = 0;
for (const lane of lanes) {
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const R: any = tagstackEncode(text, enc);
  const ref = chironDecode(R.message.slice(R.message.indexOf(CHIRON_START)));
  let tp = parse(R.message);
  let base = countTokens(R.message, enc);
  let applied = 0, priced = 0;
  for (let round = 0; round < ROUNDS; round++) {
    const T = tokenStrings(tp.body, enc).map(x => x.s);
    const found = new Map<string, number>();
    for (let n = 2; n <= MAX_N; n++) {
      const cnt = new Map<string, number>();
      for (let i = 0; i + n <= T.length; i++) { const g = T.slice(i, i + n).join('\u0001'); cnt.set(g, (cnt.get(g) ?? 0) + 1); }
      for (const [g, c] of cnt) if (c >= 2) found.set(g, c);
    }
    gCand += found.size;
    // rank by the CHAR-based rough score ΧΕΙΡΟΝ itself uses, then price EVERY one exactly
    const ranked = [...found.entries()]
      .map(([g, c]) => ({ g, c, rough: c * (g.split('\u0001').join('').length - 1) }))
      .sort((a, b) => b.rough - a.rough);
    const nk = freshKey(tp);
    let roundBest = 0, roundDesc = '';
    for (const c of ranked) {
      const val = c.g.split('\u0001').join('');
      const keys = tp.keys.concat([nk]);
      const values = tp.values.concat([val]);
      // ΧΕΙΡΟΝ replaces occurrences in the body AND in every literal rule's value.
      const sub = (s: string): string => { let o = s, guard = 0; while (o.includes(val) && guard++ < 400) o = o.replace(val, nk); return o; };
      const nb = sub(tp.body);
      const nv = values.map((v, i) => (i === values.length - 1 ? v : sub(v)));
      if (nb === tp.body && nv.slice(0, -1).every((v, i) => v === tp.values[i])) continue;
      priced++;
      const m = emit(tp, keys, nv, nb);
      const d = countTokens(m, enc) - base;
      if (d < roundBest) {
        try { if (chironDecode(m.slice(m.indexOf(CHIRON_START))) !== ref) continue; } catch { continue; }
        roundBest = d; roundDesc = `x${c.c} n=${c.g.split('\u0001').length} ${JSON.stringify(val.slice(0, 20))}`;
      }
    }
    gPriced += priced;
    if (roundBest >= 0) break;
    // apply the single best move of the round, then re-mine
    const c = ranked.find((x) => x.g.split('\u0001').join('') === roundDesc.match(/"(.*)"/)?.[1]);
    void c;
    // re-derive the winner from the priced set by a second pass (cheap: one price)
    let winVal: string | null = null, winDelta = 0;
    for (const cand of ranked) {
      const val = cand.g.split('\u0001').join('');
      const keys = tp.keys.concat([nk]);
      const values = tp.values.concat([val]);
      const sub = (s: string): string => { let o = s, guard = 0; while (o.includes(val) && guard++ < 400) o = o.replace(val, nk); return o; };
      const nb = sub(tp.body);
      const nv = values.map((v, i) => (i === values.length - 1 ? v : sub(v)));
      if (nb === tp.body && nv.slice(0, -1).every((v, i) => v === tp.values[i])) continue;
      const m = emit(tp, keys, nv, nb);
      const d = countTokens(m, enc) - base;
      if (d < winDelta) { try { if (chironDecode(m.slice(m.indexOf(CHIRON_START))) !== ref) continue; } catch { continue; } winDelta = d; winVal = val; }
    }
    if (winVal === null) break;
    const sub2 = (s: string): string => { let o = s, guard = 0; while (o.includes(winVal!) && guard++ < 400) o = o.replace(winVal!, nk); return o; };
    tp = { ...tp, keys: tp.keys.concat([nk]), values: tp.values.concat([winVal]), body: sub2(tp.body) };
    tp.values = tp.values.map((v, i) => (i === tp.values.length - 1 ? v : sub2(v)));
    base += winDelta;
    applied++;
  }
  const after = countTokens(emit(tp, tp.keys, tp.values, tp.body), enc);
  gBase += countTokens(R.message, enc); gAfter += after;
  rows.push({ lane, base: countTokens(R.message, enc), after, delta: after - countTokens(R.message, enc), roundsApplied: applied, priced });
  console.log(`${lane.padEnd(18)} base=${String(countTokens(R.message, enc)).padStart(5)} after=${String(after).padStart(5)} Δ=${String(after - countTokens(R.message, enc)).padStart(4)}  rules added=${applied}  prices=${priced}`);
}
fs.writeFileSync('bench/x102/receipts/epanalepsis.json', JSON.stringify({ note: 'X102 EPANALEPSIS: re-run CHIRON ADD mining on the SHIPPED wire with NO model filter; whole-message priced, chironDecode-gated. Corrects the inverted filter in bench/x101/prosthese.ts', rows, totals: { base: gBase, after: gAfter, delta: gAfter - gBase, priced: gPriced } }, null, 1));
console.log(`\nΕΠΑΝΑΛΗΨΙΣ over the ten lanes: base ${gBase} -> after ${gAfter}, Δ = ${gAfter - gBase} tokens; ${gPriced} exact prices`);
