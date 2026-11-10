/**
 * X99 — ΚΑΤΑΛΥΤΗΣ (katalytes, "catalyst"): A SINGLE-CHARACTER RULE THAT TURNS A DEAD BOUNDARY LIVE.
 *
 * glossa.json: the ten tapes have 600 script->ASCII boundaries and the vocabulary supplies
 * essentially ZERO 2-char tokens of that shape (0 for every script but cjk's 1), while
 * script->script has 823 (cyrillic) / 3 417 (polyglot).  So an entry `kᵢ vᵢ` whose value vᵢ begins
 * with an ASCII character has a boundary that CANNOT fuse, and the same at `vᵢ|kᵢ₊₁` when vᵢ ends
 * with ASCII.
 *
 * ΠΡΟΟΙΜΙΟΝ can only fix that when some earlier rule's value is already a prefix of vᵢ.  ΚΑΤΑΛΥΤΗΣ
 * removes the limit: ADD a rule whose value is exactly one character c, then every value beginning
 * with c is re-spelled `k_c rest`, and the boundary becomes script->script.  The catalyst costs
 * 1 key + 1 value token and is amortised over every value it serves.
 *
 * The suffix form is symmetric: a value ending with c is re-spelled `rest k_c`, turning the
 * 161-token ASCII->script boundary at `vᵢ|kᵢ₊₁` into an 823-token script->script one.
 *
 * GREEDY, WHOLE-MESSAGE PRICED, chironDecode-VERIFIED.  A bound is never an admission.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode, chironInScript } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
interface Wire { contract: string; keys: string[]; values: string[]; body: string; script: { name: string; lo: number; hi: number; ranges?: Array<[number, number]> } }
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
  const first = tape.codePointAt(0)!;
  const script = (await0 as any) ?? pickScript(first);
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(t + 1), script };
}
const await0 = undefined;
function pickScript(cp: number): any {
  // CHIRON_SCRIPTS is imported below; this local copy avoids a circular import at parse time
  for (const s of SCRIPTS) { const r = s.ranges ?? [[s.lo, s.hi]]; for (const [a, b] of r) if (cp >= a && cp < b) return s; }
  throw new Error('undeclared script');
}
import { CHIRON_SCRIPTS as SCRIPTS } from '../../src/lib/omega/chiron';
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const ext of ['', '.txt', '.md', '.patch']) { const p = `${d}/${lane}${ext}`; if (fs.existsSync(p)) return p; }
  }
  throw new Error('no source for ' + lane);
};
const emit = (wr: Wire, keys: string[], values: string[]): string =>
  wr.contract + CHIRON_START + keys.map((k, i) => k + values[i]).join('') + CHIRON_SEP + wr.body;
/** an unused letter of the declared script, chosen to fuse with as many following keys as possible */
function freeLetters(wr: Wire, n: number): string[] {
  const used = new Set(wr.keys);
  const out: string[] = [];
  const r = wr.script.ranges ?? [[wr.script.lo, wr.script.hi]];
  for (const [a, b] of r) for (let cp = a; cp < b && out.length < n; cp++) { const ch = String.fromCodePoint(cp); if (!used.has(ch) && chironInScript(wr.script as any, cp)) out.push(ch); }
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
  let keys = wr.keys.slice(), values = wr.values.slice();
  let accept = 0, tried = 0;
  const pool = freeLetters(wr, 8);
  // greedy: repeatedly try the single best catalyst move until none pays
  for (let round = 0; round < 12; round++) {
    let bestMsg: string | null = null, bestTok = countTokens(emit(wr, keys, values), enc), bestK: string[] = [], bestV: string[] = [];
    const firstChars = new Map<string, number>(), lastChars = new Map<string, number>();
    values.forEach((v, i) => {
      if (v.length && v[0] >= ' ' && v[0] <= '~') firstChars.set(v[0], (firstChars.get(v[0]) ?? 0) + 1);
      const L = v[v.length - 1];
      if (v.length && L >= ' ' && L <= '~') lastChars.set(L, (lastChars.get(L) ?? 0) + 1);
    });
    for (const [c, n] of [...firstChars.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      for (const k of pool) {
        const nk = [k, ...keys], nv = [c, ...values.map(v => (v[0] === c ? k + v.slice(1) : v))];
        tried++;
        const m = emit(wr, nk, nv); const tk = countTokens(m, enc);
        if (tk < bestTok) { bestTok = tk; bestMsg = m; bestK = nk; bestV = nv; }
      }
    }
    for (const [c, n] of [...lastChars.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
      for (const k of pool) {
        const nk = [k, ...keys], nv = [c, ...values.map(v => (v[v.length - 1] === c ? v.slice(0, -1) + k : v))];
        tried++;
        const m = emit(wr, nk, nv); const tk = countTokens(m, enc);
        if (tk < bestTok) { bestTok = tk; bestMsg = m; bestK = nk; bestV = nv; }
      }
    }
    if (bestMsg === null) break;
    keys = bestK; values = bestV; accept++;
  }
  const out = emit(wr, keys, values);
  const t1 = countTokens(out, enc);
  const ok = chironDecode(out.slice(out.indexOf(CHIRON_START))) === text;
  gT0 += t0; gT1 += t1; gAccept += accept; gTried += tried;
  rows.push({ lane: f, rules: wr.keys.length, t0, t1, delta: t1 - t0, accept, tried, exact: ok });
  console.log(`${f.padEnd(20)} rules=${String(wr.keys.length).padStart(3)} ${String(t0).padStart(5)} -> ${String(t1).padStart(5)} Δ=${String(t1 - t0).padStart(4)} catalysts=${String(accept).padStart(2)} priced=${String(tried).padStart(5)} exact=${ok}`);
}
console.log(`\nΚΑΤΑΛΥΤΗΣ (single-character catalyst rules): ${gT0} -> ${gT1}  Δ=${gT1 - gT0}  catalysts ${gAccept}  priced ${gTried}`);
fs.writeFileSync('bench/x97/receipts/katalytes.json', JSON.stringify({ rows, t0: gT0, t1: gT1, accept: gAccept, tried: gTried }, null, 1));
