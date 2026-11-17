/**
 * bench/x125/synapheia.ts — X125 probe: is the GLYPH→RULE ASSIGNMENT free, and
 * does the shipped one leave tokens on the table?
 *
 * The fact this probe exists to test (chiron.ts, `renderWire`):
 *
 *   - The tape is parsed by "every new letter before ¶ starts a rule whose text
 *     runs to the next new letter or to ¶". So the ORDER of rules in the tape is
 *     forced (a rule that quotes another must come later), but the CODE POINT
 *     that names each rule is NOT: any injective map from rules to pool glyphs
 *     decodes to exactly the same bytes.
 *   - `renderWire` nevertheless assigns them mechanically — `newGlyph.set(id,
 *     ctx.pool[next++])` while walking the topological order — and
 *     `scriptPool()` (chiron.ts:196) builds that pool by walking the script's
 *     Unicode range and keeping what is one token. So the naming is
 *     **code-point order**, a fact about Unicode, not about the text.
 *   - Meanwhile every rule costs exactly one token no matter which glyph names
 *     it — so the assignment is invisible to the search's price model, which is
 *     precisely why nobody has touched it. It is NOT invisible to the tokenizer:
 *     two adjacent glyphs in the body are one pretoken, and a BPE merge may or
 *     may not exist for that pair. cyrillic has 122 one-token letters and 823
 *     ordered merge pairs (5.5 % of 122²), so which rule lands on which letter
 *     decides how often two consecutive rule uses cost one token instead of two.
 *
 * So: re-assign the glyphs of each SHIPPED wire to maximise merges, without
 * touching the grammar, and price the result for real. Also price random
 * re-assignments to show what chance alone would give, so an improvement cannot
 * be mistaken for noise.
 *
 * This is a MEASUREMENT: it calls no encoder. It answers "how many tokens does
 * the shipped naming cost?" before any of it is wired in.
 */
import * as fs from 'node:fs';
import { countTokens } from '../../src/lib/omega/bpe';
import {
  chironParseTape, chironOpsUsed, chironDecoderPrompt, chironDecode, CHIRON_SCRIPTS,
  CHIRON_START, CHIRON_SEP, type ChironScript,
} from '../../src/lib/omega/chiron';

const enc = 'o200k_base' as const;
const RANDOMS = Number(process.env.RANDOMS ?? '24');
const RESTARTS = Number(process.env.RESTARTS ?? '6');
const SWEEP_PASSES = Number(process.env.SWEEP_PASSES ?? '8');

const rows = fs.readFileSync('bench/x124/receipts/steli-ab-messages.jsonl', 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l));

/* deterministic PRNG (mulberry32) so every run of the probe agrees */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---- merge tables, cached per script ------------------------------------ */
const mergeCache = new Map<string, Map<string, number>>();
function mergeTable(pool: string[]): Map<string, number> {
  const key = pool.join('');
  const hit = mergeCache.get(key);
  if (hit) return hit;
  const m = new Map<string, number>();
  for (const a of pool) {
    for (const b of pool) {
      const k = a + b;
      if (!m.has(k)) m.set(k, countTokens(k, enc) === 1 ? 1 : 0);
    }
  }
  mergeCache.set(key, m);
  return m;
}
const ctxCache = new Map<string, number>();
function ctxMerge(x: string, g: string, before: boolean): number {
  const k = (before ? x : '') + '|' + (before ? g : x);
  const hit = ctxCache.get(k);
  if (hit !== undefined) return hit;
  const v = countTokens(before ? x + g : g + x, enc) === 1 ? 1 : 0;
  ctxCache.set(k, v);
  return v;
}

interface Lane {
  lane: string; wire: string; script: ChironScript; rules: string[];
  glyphSet: Set<string>; pool: string[];
  W: Map<string, number>;        // "a|b" -> count of adjacent glyph pairs
  lin: Map<string, Map<string, number>>; // glyph -> (context char -> weight), before/after merged with sign
  left: Map<string, Map<string, number>>;
  right: Map<string, Map<string, number>>;
}

function analyse(msg: string): Lane | null {
  const i = msg.indexOf(CHIRON_START);
  if (i < 0) return null;
  const wire = msg.slice(i);
  const script = chironOpsUsed(wire).script;
  if (!script) return null;
  const cut = wire.indexOf(CHIRON_SEP, 1);
  if (cut < 0) return null;
  const tape = wire.slice(CHIRON_START.length, cut);
  const parsed = chironParseTape(tape, script);
  if (!parsed || !parsed.length) return null;
  const rules = parsed.map((r) => r.glyph);
  const glyphSet = new Set(rules);

  // pool: one-token chars of this script that the payload does not use
  const payload = new Set<string>();
  for (const ch of wire) if (!glyphSet.has(ch)) payload.add(ch);
  const pool: string[] = [];
  for (const s of CHIRON_SCRIPTS) {
    if (s.name !== script.name) continue;
    for (let cp = s.lo; cp < s.hi; cp++) {
      const ch = String.fromCodePoint(cp);
      if (payload.has(ch)) continue;
      if (countTokens(ch, enc) === 1) pool.push(ch);
    }
  }
  if (pool.length < rules.length) return null;

  // adjacency over the WHOLE wire: the tape (a rule value may quote another
  // glyph) and the body both count, and both are invariant under the remap.
  const W = new Map<string, number>();
  const left = new Map<string, Map<string, number>>();
  const right = new Map<string, Map<string, number>>();
  const bump = (m: Map<string, Map<string, number>>, g: string, x: string) => {
    let e = m.get(g); if (!e) { e = new Map(); m.set(g, e); }
    e.set(x, (e.get(x) ?? 0) + 1);
  };
  const chars = [...wire];
  for (let k = 0; k < chars.length; k++) {
    const c = chars[k]!;
    if (!glyphSet.has(c)) continue;
    const p = k > 0 ? chars[k - 1]! : null;
    const n = k + 1 < chars.length ? chars[k + 1]! : null;
    if (p !== null) {
      if (glyphSet.has(p)) W.set(p + '|' + c, (W.get(p + '|' + c) ?? 0) + 1);
      else bump(left, c, p);
    }
    if (n !== null) {
      if (!glyphSet.has(n)) bump(right, c, n);
    }
  }
  return { lane: '', wire, script, rules, glyphSet, pool, W, lin: new Map(), left, right };
}

function remap(s: string, map: Map<string, string>): string {
  let out = '';
  for (const ch of s) out += map.get(ch) ?? ch;
  return out;
}

/** objective: expected number of one-token merges achieved by this assignment */
function score(L: Lane, assign: string[], mt: Map<string, number>): number {
  let s = 0;
  for (const [k, w] of L.W) {
    const bar = k.indexOf('|');
    const ia = L.rules.indexOf(k.slice(0, bar));
    const ib = L.rules.indexOf(k.slice(bar + 1));
    if (ia < 0 || ib < 0) continue;
    s += w * (mt.get(assign[ia]! + assign[ib]!) ?? 0);
  }
  for (let a = 0; a < L.rules.length; a++) {
    const g = assign[a]!;
    const lf = L.left.get(L.rules[a]!);
    if (lf) for (const [x, w] of lf) s += w * ctxMerge(x, g, true);
    const rt = L.right.get(L.rules[a]!);
    if (rt) for (const [x, w] of rt) s += w * ctxMerge(x, g, false);
  }
  return s;
}

function greedy(L: Lane, mt: Map<string, number>, order: number[]): string[] {
  const used = new Set<string>();
  const assign = new Array<string>(L.rules.length).fill('');
  for (const a of order) {
    let best = ''; let bestV = -1;
    for (const g of L.pool) {
      if (used.has(g)) continue;
      let v = 0;
      for (let b = 0; b < L.rules.length; b++) {
        if (assign[b] === '') continue;
        const w1 = L.W.get(L.rules[b]! + '|' + L.rules[a]!) ?? 0;
        const w2 = L.W.get(L.rules[a]! + '|' + L.rules[b]!) ?? 0;
        v += w1 * (mt.get(assign[b]! + g) ?? 0) + w2 * (mt.get(g + assign[b]!) ?? 0);
      }
      const lf = L.left.get(L.rules[a]!);
      if (lf) for (const [x, w] of lf) v += w * ctxMerge(x, g, true);
      const rt = L.right.get(L.rules[a]!);
      if (rt) for (const [x, w] of rt) v += w * ctxMerge(x, g, false);
      if (v > bestV) { bestV = v; best = g; }
    }
    assign[a] = best; used.add(best);
  }
  return assign;
}

function localSearch(L: Lane, mt: Map<string, number>, assign: string[], passes: number): string[] {
  let cur = assign.slice();
  let curV = score(L, cur, mt);
  const n = L.rules.length;
  for (let p = 0; p < passes; p++) {
    let improved = false;
    for (let a = 0; a < n; a++) {
      for (let b = a + 1; b < n; b++) {
        const t = cur[a]!; cur[a] = cur[b]!; cur[b] = t;
        const v = score(L, cur, mt);
        if (v > curV) { curV = v; improved = true; }
        else { cur[b] = cur[a]!; cur[a] = t; }
      }
    }
    if (!improved) break;
  }
  return cur;
}

console.log(`lane                     rules  pairs  base   opt   Δopt  bestRnd  medRnd  worstRnd  exact`);
let sBase = 0, sOpt = 0, sRnd = 0;
const detail: string[] = [];

for (const r of rows) {
  const msg: string = r.message;
  const L = analyse(msg);
  if (!L) { console.log(`${r.path.split('/').pop()!.padEnd(24)} (skip)`); continue; }
  L.lane = r.path.split('/').pop()!;
  const mt = mergeTable(L.pool);
  const baseTok = countTokens(chironDecoderPrompt(L.wire), enc);

  const n = L.rules.length;
  // shipped assignment, as an array aligned with rules[]
  const ship = L.rules.slice();

  let pairs = 0;
  for (const v of L.W.values()) pairs += v;

  const rand = rng(0x9e37 ^ n);
  const rndToks: number[] = [];
  for (let k = 0; k < RANDOMS; k++) {
    const perm = L.pool.slice(0, Math.max(n, 1));
    for (let i = perm.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); const t = perm[i]!; perm[i] = perm[j]!; perm[j] = t; }
    const map = new Map<string, string>();
    L.rules.forEach((g, i2) => map.set(g, perm[i2]!));
    const w2 = remap(L.wire, map);
    rndToks.push(countTokens(chironDecoderPrompt(w2), enc));
  }
  rndToks.sort((a, b) => a - b);
  const medRnd = rndToks[Math.floor(rndToks.length / 2)]!;
  const bestRnd = rndToks[0]!;
  const worstRnd = rndToks[rndToks.length - 1]!;

  // optimise: greedy from several orders + local search; keep the cheapest REAL price
  let bestWire = L.wire; let bestTok = baseTok; let bestAssign = ship;
  const wsum = new Map<string, number>();
  for (const [k, w] of L.W) {
    const bar = k.indexOf('|');
    wsum.set(k.slice(0, bar), (wsum.get(k.slice(0, bar)) ?? 0) + w);
    wsum.set(k.slice(bar + 1), (wsum.get(k.slice(bar + 1)) ?? 0) + w);
  }
  const byWeight = L.rules.map((g, i2) => [i2, wsum.get(g) ?? 0] as [number, number])
    .sort((a, b) => b[1] - a[1] || a[0] - b[0]).map((x) => x[0]);
  const orders: number[][] = [byWeight, L.rules.map((_, i2) => i2)];
  for (let k = 0; k < RESTARTS; k++) {
    const o = L.rules.map((_, i2) => i2);
    for (let i2 = o.length - 1; i2 > 0; i2--) { const j = Math.floor(rand() * (i2 + 1)); const t = o[i2]!; o[i2] = o[j]!; o[j] = t; }
    orders.push(o);
  }
  for (const o of orders) {
    const a0 = greedy(L, mt, o);
    const a1 = localSearch(L, mt, a0, SWEEP_PASSES);
    for (const a of [a0, a1]) {
      const map = new Map<string, string>();
      L.rules.forEach((g, i2) => map.set(g, a[i2]!));
      const w2 = remap(L.wire, map);
      const dec = chironDecode(w2);
      if (dec !== chironDecode(L.wire)) { console.log(`  !! decode drift on ${L.lane}`); continue; }
      const tok = countTokens(chironDecoderPrompt(w2), enc);
      if (tok < bestTok) { bestTok = tok; bestWire = w2; bestAssign = a; }
    }
  }
  const exact = chironDecode(bestWire) === chironDecode(L.wire);
  sBase += baseTok; sOpt += bestTok; sRnd += medRnd;
  console.log(`${L.lane.padEnd(24)} ${String(n).padStart(5)}  ${String(pairs).padStart(5)}  ${String(baseTok).padStart(5)} ${String(bestTok).padStart(5)} ${String(bestTok - baseTok).padStart(5)}  ${String(bestRnd).padStart(7)}  ${String(medRnd).padStart(6)}  ${String(worstRnd).padStart(8)}  ${exact ? 'y' : 'N'}`);
  detail.push(`${L.lane}\tshipScore=${score(L, ship, mt)}\toptScore=${score(L, bestAssign, mt)}\tpool=${L.pool.length}\tscript=${L.script.name}`);
}

console.log('');
for (const d of detail) console.log(d);
console.log('');
console.log(`Σ base ${sBase}   Σ optimised ${sOpt}   Δ ${sOpt - sBase}   (Σ median-random ${sRnd}, Δ vs base ${sRnd - sBase})`);
