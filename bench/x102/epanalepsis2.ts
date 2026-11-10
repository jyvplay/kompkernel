/**
 * X102 — ΕΠΑΝΑΛΗΨΙΣ Β: re-mine ΧΕΙΡΟΝ's ADD population over the BODY *AND* THE RULE VALUES.
 *
 * WHY THIS POPULATION HAS NEVER BEEN MINED.  ΧΕΙΡΟΝ's macro pass enumerates token spans over
 *
 *     parts = [body, ...rules.filter(r => r.kind === 'lit').map(r => r.text)]
 *
 * i.e. the body AND every literal rule's value — but it does so INSIDE chironEncode, at ΧΕΙΡΟΝ
 * time.  ΣΥΝΔΥΑΣΜΟΣ then re-spells every value as an interleaving of literal runs and references to
 * strictly earlier rules, and ΓΕΝΝΑΔΑΣ relocates rules and re-spells again.  Both change the values'
 * token sequences.  Nothing re-mines them afterwards.
 *
 * bench/x102/epanalepsis.ts mined only the body and returned Δ = 0 on all ten lanes.  This probe
 * mines the body AND the values, which is the population ΧΕΙΡΟΝ itself would have mined had it run
 * last instead of first.
 *
 * PRICING.  For each candidate n-gram: append one rule, replace every occurrence in the body and in
 * every value, count the WHOLE message, keep only if strictly smaller and chironDecode is unchanged.
 * No model filter, no bound — every candidate is priced exactly.
 */
import * as fs from 'node:fs';
import { countTokens, tokenStrings } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { tagstackEncode } from '../../src/lib/omega/tagstack';

process.env.OMEGA_DET = '1';
process.env.OMEGA_NO_MEMO = '1';
const enc: any = 'o200k_base';
const MAX_N = 10;
const ROUNDS = 4;
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
  const base0 = countTokens(R.message, enc);
  let base = base0;
  let added = 0, priced = 0, candTotal = 0;
  for (let round = 0; round < ROUNDS; round++) {
    // THE POPULATION ΧΕΙΡΟΝ ITSELF MINES: the body AND every literal rule's value.
    const parts = [tp.body, ...tp.values];
    const found = new Map<string, number>();
    for (const part of parts) {
      const T = tokenStrings(part, enc).map(x => x.s);
      for (let n = 2; n <= MAX_N; n++) {
        const cnt = new Map<string, number>();
        for (let i = 0; i + n <= T.length; i++) { const g = T.slice(i, i + n).join('\u0001'); cnt.set(g, (cnt.get(g) ?? 0) + 1); }
        for (const [g, c] of cnt) found.set(g, Math.max(found.get(g) ?? 0, c));
      }
    }
    candTotal += found.size;
    const ranked = [...found.entries()]
      .map(([g, c]) => ({ g, c, rough: c * (g.split('\u0001').join('').length - 1) }))
      .filter(x => x.c >= 2)
      .sort((a, b) => b.rough - a.rough);
    const nk = freshKey(tp);
    let winVal: string | null = null, winDelta = 0;
    for (const cand of ranked) {
      const val = cand.g.split('\u0001').join('');
      const sub = (s: string): string => { let o = s, guard = 0; while (o.includes(val) && guard++ < 400) o = o.replace(val, nk); return o; };
      const nb = sub(tp.body);
      const nv = tp.values.concat([val]).map((v, i) => (i === tp.values.length ? v : sub(v)));
      if (nb === tp.body && nv.slice(0, -1).every((v, i) => v === tp.values[i])) continue;
      priced++;
      const m = emit(tp, tp.keys.concat([nk]), nv, nb);
      const d = countTokens(m, enc) - base;
      if (d < winDelta) { try { if (chironDecode(m.slice(m.indexOf(CHIRON_START))) !== ref) continue; } catch { continue; } winDelta = d; winVal = val; }
    }
    if (winVal === null) break;
    const sub2 = (s: string): string => { let o = s, guard = 0; while (o.includes(winVal!) && guard++ < 400) o = o.replace(winVal!, nk); return o; };
    tp = { ...tp, keys: tp.keys.concat([nk]), values: tp.values.concat([winVal]), body: sub2(tp.body) };
    tp.values = tp.values.map((v, i) => (i === tp.values.length - 1 ? v : sub2(v)));
    base += winDelta;
    added++;
  }
  const after = countTokens(emit(tp, tp.keys, tp.values, tp.body), enc);
  gBase += base0; gAfter += after; gCand += candTotal; gPriced += priced;
  rows.push({ lane, base: base0, after, delta: after - base0, rulesAdded: added, candidates: candTotal, priced });
  console.log(`${lane.padEnd(18)} base=${String(base0).padStart(5)} after=${String(after).padStart(5)} Δ=${String(after - base0).padStart(4)}  rules added=${added}  candidates=${String(candTotal).padStart(5)}  prices=${priced}`);
}
fs.writeFileSync('bench/x102/receipts/epanalepsis2.json', JSON.stringify({ note: 'X102 EPANALEPSIS B: re-mine CHIRON ADD over the body AND the rule values (the population CHIRON mines but only at CHIRON time, before SYNDYASMOS re-spells the values)', rows, totals: { base: gBase, after: gAfter, delta: gAfter - gBase, candidates: gCand, priced: gPriced } }, null, 1));
console.log(`\nΕΠΑΝΑΛΗΨΙΣ Β over the ten lanes: base ${gBase} -> after ${gAfter}, Δ = ${gAfter - gBase} tokens; ${gCand} candidates, ${gPriced} exact prices`);
