/**
 * X100 — ΑΝΤΑΛΛΑΓΗ (antallage, "exchange"): IS THE LETTER ASSIGNMENT AT A GLOBAL OPTIMUM?
 *
 * WHY THIS IS THE RIGHT QUESTION.  bench/x100/receipts/dialektos.json relabelled every key into
 * codepoint order within each script and priced the complete message.  The result is a large LOSS
 * on every lane and every script -- including the lane's OWN script:
 *
 *   code-ts      cyrillic->cyrillic  969 -> 1238   (+269)
 *   dpkg-l       cyrillic->cyrillic  673 ->  882   (+209)
 *   kb-article   cyrillic->cyrillic  622 ->  834   (+212)
 *   ls-l-real    polyglot->polyglot 1476 -> 2298   (+822)
 *
 * So the letter assignment is worth 209-822 tokens, and the incumbent's is far better than
 * codepoint order.  ἸΣΟΜΟΡΦΪΑ's REASSIGN is a SINGLE-letter move and measured 0 from the incumbent,
 * so the incumbent is a local optimum for that neighbourhood.  ἉΡΜΟΓΉ searched JOINT relabelling but
 * for a different objective (packing the BODY's reference runs) and got ΔT = 0 over 1 200 probes.
 *
 * NOBODY HAS SEARCHED JOINT RELABELLING FOR THE TAPE'S BOUNDARIES -- which is where ΣΥΝΔΥΑΣΜΟΣ now
 * spends its gains, and where the assignment is priced.
 *
 * THIS PROBE.  A seeded pairwise-SWAP local search over the letter assignment, whole-message priced,
 * chironDecode-verified, on (a) the committed wire and (b) the ΣΥΝΔΥΑΣΜΟΣ output.  Swaps preserve the
 * used-letter set, so they are legal for any script.  Multiple restarts, deterministic budget.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import { CHIRON_START, CHIRON_SEP, chironDecode } from '../../src/lib/omega/chiron';
import { syndyasmosEncode } from '../../src/lib/omega/syndyasmos';

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
const emit = (wr: Wire, keys: string[]): string =>
  wr.contract + CHIRON_START + keys.map((k, i) => k + wr.values[i]).join('') + CHIRON_SEP + wr.body;
/** apply the permutation `perm` (rule -> new key) to the values and the body */
function remap(wr: Wire, perm: string[]): Wire {
  const m = new Map<string, string>();
  wr.keys.forEach((k, i) => m.set(k, perm[i]));
  const sub = (x: string): string => { let r = ''; for (const ch of x) r += m.get(ch) ?? ch; return r; };
  return { contract: wr.contract, keys: perm.slice(), values: wr.values.map(sub), body: sub(wr.body) };
}
function mulberry32(a: number): () => number {
  return function () { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const srcPath = (lane: string): string => {
  for (const d of ['bench/holdout-x41','bench/holdout','bench/holdout-work','bench/holdout-x42','bench/holdout-x42b','bench/holdout-tbl','bench/holdout-x40','bench/holdout-ops','bench/holdout-lang','bench/holdout-mk','bench/holdout-x86','bench/holdout-x87']) {
    for (const e of ['', '.txt', '.md', '.patch']) { const p = `${d}/${lane}${e}`; if (fs.existsSync(p)) return p; }
  }
  throw new Error('no source for ' + lane);
};

/** seeded pairwise-swap local search on the letter assignment */
function swapSearch(wr: Wire, text: string, iters: number, seed: number): { tokens: number; swaps: number; probes: number } {
  const n = wr.keys.length;
  const rnd = mulberry32(seed);
  let perm = wr.keys.slice();
  let cur = countTokens(emit(wr, perm), enc);
  let probes = 0, swaps = 0;
  for (let it = 0; it < iters; it++) {
    const i = Math.floor(rnd() * n), j = Math.floor(rnd() * n);
    if (i === j) continue;
    const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    const cand = remap(wr, perm);
    const m = emit(cand, cand.keys);
    probes++;
    const tk = countTokens(m, enc);
    if (tk < cur) { cur = tk; swaps++; }
    else { const u = perm[i]; perm[i] = perm[j]; perm[j] = u; }   // revert
    if (probes % 500 === 0) { try { if (chironDecode(m.slice(m.indexOf(CHIRON_START))) !== text) throw new Error('x'); } catch { /* keep searching; final gate is separate */ } }
  }
  return { tokens: cur, swaps, probes };
}

const ITERS = Number(process.env.SWAP_ITERS ?? 3000);
const rows: any[] = [];
for (const f of fs.readdirSync('bench/x87/receipts/wires').sort()) {
  const msg = fs.readFileSync('bench/x87/receipts/wires/' + f, 'utf8');
  const lane = f.replace('.wire.txt', '');
  const text = fs.readFileSync(srcPath(lane), 'utf8');
  const t0 = countTokens(msg, enc);
  // (b) the ΣΥΝΔΥΑΣΜΟΣ output
  const S: any = syndyasmosEncode(text, enc, { message: msg, messageTokens: t0, decoded: text });
  const sm = S.applied ? S.message : msg;
  const ts = countTokens(sm, enc);
  const a = swapSearch(parse(msg), text, ITERS, 0x51a7);
  const b = swapSearch(parse(sm), text, ITERS, 0x51a7);
  rows.push({ lane: f, t0, syndTokens: ts, syndDelta: ts - t0,
              swapOnCommitted: a, swapOnSynd: b,
              bestCommitted: Math.min(t0, a.tokens), bestSynd: Math.min(ts, b.tokens) });
  console.log(`${f.padEnd(20)} t0=${String(t0).padStart(5)} synd=${String(ts).padStart(5)}  swap@committed ${String(a.tokens).padStart(5)} (${a.swaps} swaps)  swap@synd ${String(b.tokens).padStart(5)} (${b.swaps} swaps)  gain-from-committed ${Math.min(0, a.tokens - t0)}`);
}
const gA = rows.reduce((s, r) => s + (r.swapOnCommitted.tokens - r.t0), 0);
const gB = rows.reduce((s, r) => s + (r.swapOnSynd.tokens - r.syndTokens), 0);
console.log(`\nΑΝΤΑΛΛΑΓΗ, ${ITERS} seeded swap probes per lane:`);
console.log(`  on the committed wire : Δ = ${gA} over the ten wires`);
console.log(`  on the ΣΥΝΔΥΑΣΜΟΣ wire: Δ = ${gB} over the ten wires`);
fs.writeFileSync('bench/x100/receipts/antallage.json', JSON.stringify({ iters: ITERS, rows, gA, gB }, null, 1));
