/**
 * X99 — ΣΥΝΔΥΑΣΜΟΣ (syndyasmos, "combination"): TWO ORTHOGONAL TAPE TRANSFORMATIONS, ALTERNATED.
 *
 * THE COUPLING NO CODEC IN THE STACK EXPLOITS.
 *   ΜΕΤΑΤΑΞΙΣ  moves an entry to an arbitrary valid slot.  It changes which rules are NEIGHBOURS,
 *              hence which boundaries can fuse.
 *   ΠΡΟΟΙΜΙΟΝ  re-spells a value as an interleaving of literal runs and references to EARLIER
 *              rules.  It changes whether a boundary is fusable at all (glossa.json: script->ASCII
 *              has 0 vocabulary tokens, script->script has 823).
 * The second is gated on the ORDER, because a factor must precede the rule that uses it.  So
 * relocating a rule earlier can ENABLE a re-spelling that was previously illegal, and a re-spelling
 * changes the character stream that relocation optimises.  Running either alone prices only half of
 * that.
 *
 * ARMS (all whole-message priced, all chironDecode-verified, all from the committed wire):
 *   A  ΜΕΤΑΤΑΞΙΣ only          (expect the shipped -48)
 *   B  ΠΡΟΟΙΜΙΟΝ only          (expect -27)
 *   C  ΜΕΤΑΤΑΞΙΣ -> ΠΡΟΟΙΜΙΟΝ
 *   D  ΠΡΟΟΙΜΙΟΝ -> ΜΕΤΑΤΑΞΙΣ
 *   E  alternate x4
 * An arm is admitted only if it is strictly better than the incumbent AND decodes byte-exact.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { metataxisEncode } from '../../src/lib/omega/metataxis';

process.env.OMEGA_DET = '1';
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
const emit = (wr: Wire, keys: string[], values: string[]): string =>
  wr.contract + CHIRON_START + keys.map((k, i) => k + values[i]).join('') + CHIRON_SEP + wr.body;
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const ext of ['', '.txt', '.md', '.patch']) { const p = `${d}/${lane}${ext}`; if (fs.existsSync(p)) return p; }
  }
  throw new Error('no source for ' + lane);
};

/** one greedy sweep of ΠΡΟΟΙΜΙΟΝ over the current tape */
function prooimionSweep(wr: Wire, keys: string[], values: string[]): { keys: string[]; values: string[]; n: number } {
  const idx = new Map<string, string[]>();
  const addIdx = (i: number): void => { const v = values[i]; const a = idx.get(v) ?? []; a.push(keys[i]); idx.set(v, a); };
  const seg = (s: string, maxParts: number): string[] => {
    const out: string[] = [];
    const walk = (pos: number, acc: string, parts: number): void => {
      if (out.length > 400) return;
      if (pos === s.length) { out.push(acc); return; }
      if (parts >= maxParts) return;
      for (let L = s.length - pos; L >= 1; L--) {
        const sub = s.slice(pos, pos + L);
        const ks = idx.get(sub);
        if (ks) for (const k of ks) { walk(pos + L, acc + k, parts + 1); if (out.length > 400) return; }
        walk(pos + L, acc + sub, parts + 1);
      }
    };
    walk(0, '', 0);
    return out;
  };
  let n = 0;
  for (let i = 0; i < keys.length; i++) {
    const cur = countTokens(emit(wr, keys, values), enc);
    let best: string | null = null, bestTok = cur;
    for (const c of seg(values[i], 5)) {
      if (c === values[i]) continue;
      const nv = values.slice(); nv[i] = c;
      const tk = countTokens(emit(wr, keys, nv), enc);
      if (tk < bestTok) { bestTok = tk; best = c; }
    }
    if (best !== null) { values[i] = best; n++; }
    addIdx(i);
  }
  return { keys, values, n };
}
function toWire(msg: string): Wire { return parse(msg); }

const arms = ['A meta', 'B prooimion', 'C meta->pro', 'D pro->meta', 'E alternate'];
const res: any[] = [];
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const t0 = countTokens(msg, enc);
  const line: any = { lane: f, t0, arms: {} };
  const run = (name: string, m: string): void => {
    const n = countTokens(m, enc);
    const ok = chironDecode(m.slice(m.indexOf(CHIRON_START))) === text;
    line.arms[name] = { n, delta: n - t0, exact: ok };
  };
  // A
  const A: any = metataxisEncode(text, enc, { message: msg, messageTokens: t0, decoded: text });
  run('A_meta', A.message);
  // B
  { const w = toWire(msg); const r = prooimionSweep(w, w.keys.slice(), w.values.slice()); run('B_prooimion', emit(w, r.keys, r.values)); }
  // C  meta -> prooimion
  { const w = toWire(A.message); const r = prooimionSweep(w, w.keys.slice(), w.values.slice()); run('C_meta_pro', emit(w, r.keys, r.values)); }
  // D  prooimion -> meta
  { const w0 = toWire(msg); const r0 = prooimionSweep(w0, w0.keys.slice(), w0.values.slice()); const m1 = emit(w0, r0.keys, r0.values);
    const D: any = metataxisEncode(text, enc, { message: m1, messageTokens: countTokens(m1, enc), decoded: text });
    run('D_pro_meta', D.message); }
  // E  alternate x4
  { let cur = msg; let curTok = t0;
    for (let k = 0; k < 4; k++) {
      const M: any = metataxisEncode(text, enc, { message: cur, messageTokens: curTok, decoded: text });
      if (M.messageTokens < curTok) { cur = M.message; curTok = M.messageTokens; }
      const w = toWire(cur); const r = prooimionSweep(w, w.keys.slice(), w.values.slice()); const m2 = emit(w, r.keys, r.values);
      const tk2 = countTokens(m2, enc);
      if (tk2 < curTok) { cur = m2; curTok = tk2; }
    }
    run('E_alternate', cur); }
  res.push(line);
  const a = line.arms;
  console.log(`${f.padEnd(20)} t0=${String(t0).padStart(5)}  A=${String(a.A_meta.n).padStart(5)}(${a.A_meta.delta})  B=${String(a.B_prooimion.n).padStart(5)}(${a.B_prooimion.delta})  C=${String(a.C_meta_pro.n).padStart(5)}(${a.C_meta_pro.delta})  D=${String(a.D_pro_meta.n).padStart(5)}(${a.D_pro_meta.delta})  E=${String(a.E_alternate.n).padStart(5)}(${a.E_alternate.delta})  exact=${a.E_alternate.exact}`);
}
console.log(`\n${'arm'.padEnd(16)} ${'total'.padStart(6)} ${'Δ'.padStart(6)}   (over the ten wires, t0 = 7864)`);
for (const k of ['A_meta', 'B_prooimion', 'C_meta_pro', 'D_pro_meta', 'E_alternate']) {
  const tot = res.reduce((a, r) => a + r.arms[k].n, 0);
  const ex = res.filter(r => r.arms[k].exact).length;
  console.log(`${k.padEnd(16)} ${String(tot).padStart(6)} ${String(tot - 7864).padStart(6)}   exact ${ex}/10`);
}
fs.writeFileSync('bench/x97/receipts/syndyasmos.json', JSON.stringify({ rows: res }, null, 1));
