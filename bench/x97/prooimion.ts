/**
 * X99 — ΠΡΟΟΙΜΙΟΝ (prooimion, "preface"): RE-SPELL A VALUE SO IT BEGINS (OR ENDS) WITH A REFERENCE.
 *
 * THE MEASUREMENT THAT MOTIVATES IT (bench/x97/receipts/glossa.json).  In the ten committed tapes
 * there are 589 ASCII->script boundaries, 600 script->ASCII boundaries and 846 script->script
 * boundaries.  The vocabulary supplies 2-char tokens for the FIRST and THIRD kinds (polyglot 596 /
 * 3 417, cjk 568 / 2 408, hangul 452 / 387, cyrillic 161 / 823) and essentially NONE for the
 * second: script+ASCII is 0 for every script except cjk's 1.  So a tape entry `kᵢ vᵢ` whose value
 * vᵢ BEGINS with an ASCII character has a dead boundary at `kᵢ|vᵢ`, and one whose value ENDS with
 * ASCII has a dead boundary at `vᵢ|kᵢ₊₁`.
 *
 * ΑΝΑΠΑΡΑΓΩΓΗ required the WHOLE value to decompose into earlier rules and found 30 candidates.
 * ΠΡΟΟΙΜΙΟΝ relaxes that: a value may be any interleaving of literal runs and references to
 * earlier rules, and the move is admitted only when it puts a REFERENCE at the value's first (or
 * last) position, converting a dead S->A boundary into a live S->S one.
 *
 * LEGALITY.  The tape is delimiter-free and the parser treats a letter as a key on FIRST appearance
 * only, so `kᵢ kₐ literal` is read as key kᵢ whose value is value(a)+literal.  Expansion is
 * unchanged, so the decode is byte-identical BY CONSTRUCTION -- and it is re-checked anyway.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
interface Wire { contract: string; keys: string[]; values: string[]; body: string }
function parse(msg: string): Wire {
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
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const ext of ['', '.txt', '.md', '.patch']) { const p = `${d}/${lane}${ext}`; if (fs.existsSync(p)) return p; }
  }
  throw new Error('no source for ' + lane);
};
/** every segmentation of s into <=maxParts parts, each either a literal run or an earlier rule */
function segmentations(s: string, idx: Map<string, string[]>, maxParts: number, wantEndsRef: boolean): string[] {
  const out: string[] = [];
  const walk = (pos: number, acc: string, parts: number): void => {
    if (out.length > 600) return;
    if (pos === s.length) { if (!wantEndsRef || acc.length && acc[acc.length - 1].charCodeAt(0) > 0x370) out.push(acc); return; }
    if (parts >= maxParts) return;
    for (let L = s.length - pos; L >= 1; L--) {
      const sub = s.slice(pos, pos + L);
      const ks = idx.get(sub);
      if (ks) for (const k of ks) { walk(pos + L, acc + k, parts + 1); if (out.length > 600) return; }
      // a literal run anywhere: the whole-message price decides, and the tape's boundary census
      // (glossa.json) says a value that BEGINS with a reference turns a dead script->ASCII
      // boundary into a live script->script one, while a value that ENDS with one turns a
      // 161-token ASCII->script boundary into an 823-token script->script one.
      walk(pos + L, acc + sub, parts + 1);
    }
  };
  walk(0, '', 0);
  return out;
}
const rows: any[] = [];
let gT0 = 0, gT1 = 0, gAccept = 0, gTried = 0;
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const wr = parse(msg);
  const t0 = countTokens(msg, enc);
  const spell = wr.values.slice();
  const idx = new Map<string, string[]>();
  const addIdx = (i: number): void => { const v = spell[i]; const a = idx.get(v) ?? []; a.push(wr.keys[i]); idx.set(v, a); };
  // ONLY strictly earlier rules may be used as factors: the tape is delimiter-free and the parser
  // treats a letter as a key on FIRST appearance, so a reference to a LATER key would be read as a
  // new key and corrupt the whole tape.  (The first version of this probe built `idx` over all
  // rules up front and reported -1075 with exact=false on all ten lanes: the attacker's bug, and
  // the reason the fidelity gate is not optional.)
  let accept = 0, tried = 0;
  for (let i = 0; i < wr.keys.length; i++) {
    const cur = countTokens(wr.contract + CHIRON_START + wr.keys.map((k, j) => k + spell[j]).join('') + CHIRON_SEP + wr.body, enc);
    const cands = segmentations(spell[i], idx, 5, false);
    let best: string | null = null, bestTok = cur;
    for (const c of cands) {
      if (c === spell[i]) continue;
      tried++;
      const m = wr.contract + CHIRON_START + wr.keys.map((k, j) => k + (j === i ? c : spell[j])).join('') + CHIRON_SEP + wr.body;
      const n = countTokens(m, enc);
      if (n < bestTok) { bestTok = n; best = c; }
    }
    if (best !== null) { spell[i] = best; accept++; }
    addIdx(i);   // rule i becomes available as a factor only from rule i+1 onward
  }
  const out = wr.contract + CHIRON_START + wr.keys.map((k, j) => k + spell[j]).join('') + CHIRON_SEP + wr.body;
  const t1 = countTokens(out, enc);
  const ok = chironDecode(out.slice(out.indexOf(CHIRON_START))) === text;
  gT0 += t0; gT1 += t1; gAccept += accept; gTried += tried;
  rows.push({ lane: f, rules: wr.keys.length, t0, t1, delta: t1 - t0, accept, tried, exact: ok });
  console.log(`${f.padEnd(20)} rules=${String(wr.keys.length).padStart(3)} ${String(t0).padStart(5)} -> ${String(t1).padStart(5)} Δ=${String(t1 - t0).padStart(4)} accepted=${String(accept).padStart(3)} tried=${String(tried).padStart(6)} exact=${ok}`);
}
console.log(`\nΠΡΟΟΙΜΙΟΝ (reference-prefixed re-spelling): ${gT0} -> ${gT1}  Δ=${gT1 - gT0}  accepted ${gAccept}  priced ${gTried}`);
fs.writeFileSync('bench/x97/receipts/prooimion.json', JSON.stringify({ rows, t0: gT0, t1: gT1, accept: gAccept, tried: gTried }, null, 1));
