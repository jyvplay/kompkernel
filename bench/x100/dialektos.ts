/**
 * X100 — ΔΙΑΛΕΚΤΟΣ (dialektos, "dialect"): THE SCRIPT IS A FREE PARAMETER, AND IT IS THE ONE
 * THING NO CODEC IN THE STACK HAS EVER CHANGED.
 *
 * ΧΕΙΡΟΝ declares the tape's alphabet by the FIRST letter's codepoint range, so switching scripts
 * costs nothing to transmit.  ἸΣΟΜΟΡΦΪΑ relabels letters WITHIN the declared script (measured 0).
 * ΣΥΝΔΥΑΣΜΟΣ re-spells values with references (shipped).  Neither touches WHICH script.
 *
 * And the script is not cosmetic: glossa.json + vocab.log price the scripts' 2-character merge
 * density, and they differ by an order of magnitude:
 *
 *   script     one-token letters   2-char tokens   pair density   rules it can hold
 *   cyrillic          122                823          5.54 %            <=122
 *   polyglot          799               3417          0.54 %            <=799
 *   cjk              2515               2408          0.038 %           <=2515
 *   hangul            677                387          0.084 %           <=677
 *   arabic            128                771          0.47 %            <=128
 *   katakana           80                153          2.39 %             <=80
 *   khmer              66                110          2.53 %             <=66
 *   myanmar            67                 85          1.89 %             <=67
 *
 * TWO LEVERS OPEN UP, BOTH UNTESTED:
 *   (a) the TAPE: ΣΥΝΔΥΑΣΜΟΣ's re-spelling wins when `kᵢkₐ` fuses, so a denser script means more
 *       accepted re-spellings from the SAME factor population;
 *   (b) the BODY: 846 script->script boundaries sit inside the tape, but the BODY's adjacent
 *       reference runs are exactly the 757-token headroom that ἉΡΜΟΓΉ measured unreachable — and
 *       ἉΡΜΟΓΉ relabelled WITHIN the incumbent script.  A denser script is a different question.
 *
 * THIS PROBE.  For each of the ten committed wires, relabel every key (and every reference to it,
 * in the values and in the body) into each script whose pool can hold the rule count, price the
 * COMPLETE message, and verify with chironDecode.  Pure relabelling: the grammar, the order and the
 * spellings are all untouched, so any Δ is the script's own contribution.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode, CHIRON_SCRIPTS, chironInScript } from '../../src/lib/omega/chiron';

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
const emit = (wr: Wire): string => wr.contract + CHIRON_START + wr.keys.map((k, i) => k + wr.values[i]).join('') + CHIRON_SEP + wr.body;
/**
 * The first `n` ONE-TOKEN letters of `script`, in codepoint order.
 *
 * THE BUG THIS FIXES.  The first version of this probe took the first n CODEPOINTS of the script's
 * range.  Cyrillic spans 0x0400-0x0500 = 256 codepoints but carries only 122 one-token letters, so
 * most of the "letters" it emitted cost 2-3 tokens each -- and every script read 263-1099 tokens
 * WORSE, including the lane's own script.  That was the probe's defect, not a result.  ΧΕΙΡΟΝ's own
 * pool is "scanned against the live tokenizer once and cached" (chiron.ts), so the filter is
 * load-bearing: a character is a letter only if countTokens(c) === 1.
 */
const oneTokCache = new Map<number, boolean>();
function isOneToken(cp: number): boolean {
  const hit = oneTokCache.get(cp);
  if (hit !== undefined) return hit;
  const v = countTokens(String.fromCodePoint(cp), enc) === 1;
  oneTokCache.set(cp, v);
  return v;
}
function pool(script: any, n: number): string[] {
  const out: string[] = [];
  const spans = script.ranges ?? [[script.lo, script.hi]];
  for (const [a, b] of spans) {
    for (let cp = a; cp < b && out.length < n; cp++) if (isOneToken(cp)) out.push(String.fromCodePoint(cp));
  }
  return out;
}
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const p = `${d}/${lane}${e}`; if (fs.existsSync(p)) return p; }
  }
  throw new Error('no source for ' + lane);
};

const rows: any[] = [];
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const wr = parse(msg);
  const n = wr.keys.length;
  const t0 = countTokens(msg, enc);
  const cur = CHIRON_SCRIPTS.find(s => chironInScript(s, wr.keys[0].codePointAt(0)!));
  const out: any = { lane: f, rules: n, t0, current: cur?.name ?? '?', scripts: {} };
  for (const s of CHIRON_SCRIPTS) {
    const p = pool(s, n);
    if (p.length < n) { out.scripts[s.name] = null; continue; }   // pool too small to hold the rule count
    const map = new Map<string, string>();
    wr.keys.forEach((k, i) => map.set(k, p[i]));
    const sub = (x: string): string => { let r = ''; for (const ch of x) r += map.get(ch) ?? ch; return r; };
    const cand: Wire = { contract: wr.contract, keys: wr.keys.map((k, i) => p[i]), values: wr.values.map(sub), body: sub(wr.body) };
    const m = emit(cand);
    const tk = countTokens(m, enc);
    let ok = false;
    try { ok = chironDecode(m.slice(m.indexOf(CHIRON_START))) === text; } catch { ok = false; }
    out.scripts[s.name] = { tokens: tk, delta: tk - t0, exact: ok };
  }
  rows.push(out);
  const parts = Object.entries(out.scripts).map(([k, v]) => `${k}${v === null ? ':(pool)' : `:${v.tokens}(${v.delta >= 0 ? '+' : ''}${v.delta})`}`).join('  ');
  console.log(`${f.padEnd(20)} n=${String(n).padStart(3)} cur=${out.current.padEnd(9)} t0=${String(t0).padStart(5)}  ${parts}`);
}
// best script per lane, and how often the current one is already best
let bestCount = 0, gainSum = 0;
for (const r of rows) {
  const vals = Object.entries(r.scripts).filter(([, v]) => v !== null) as Array<[string, any]>;
  const best = vals.reduce((a, b) => (b[1].tokens < a[1].tokens ? b : a));
  const g = r.t0 - best[1].tokens;
  if (best[0] !== r.current) { bestCount++; gainSum += g; console.log(`  ${r.lane}: current ${r.current} is NOT best; best ${best[0]} would give ${g >= 0 ? '+' : ''}${g}`); }
}
console.log(`\nlanes where the incumbent script is not the cheapest: ${bestCount} / ${rows.length}`);
console.log(`total available from script switching alone (pure relabelling, nothing else changed): ${gainSum} tokens`);
fs.writeFileSync('bench/x100/receipts/dialektos.json', JSON.stringify({ rows }, null, 1));
