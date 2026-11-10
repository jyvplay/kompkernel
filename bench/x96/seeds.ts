/**
 * X96 — THE ASSIGNMENT CLIMB IS A RANDOM VARIABLE, NOT A NUMBER.
 *
 * The first wholeobj run reported -128 tokens (-1.63%) over ten wires from a
 * single seeded hill-climb.  Refactoring the climb (identical algorithm,
 * different RNG seed) reported 0 on all ten lanes.  Both cannot be the gain.
 * A stochastic search's output is a sample; the repo's standing rule is that a
 * single sample of a noisy measurement is never a result.
 *
 * This probe therefore runs the SAME climb over K independent seeds per lane
 * and reports the distribution: min, median, max, and how many seeds found any
 * improvement at all.  Whatever survives here is what a codec may claim; the
 * rest is the shape of the search, not a saving.
 *
 * The climb itself is unchanged: stochastic hill-climb over bijections of the
 * tape's used letters, scored on the token cost of the COMPLETE message.  A
 * bijection of the declared script's letters is an isomorphism of the wire
 * language (keys stay distinct, the first letter still declares the same
 * alphabet, references still point backwards), so the decoded text cannot
 * change -- only its price.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, chironParseTape, type ChironScript } from '../../src/lib/omega/chiron';

const ENC: any = 'o200k_base';
const OUT = 'bench/x96/receipts/seeds.json';
const ITERS = Number(process.env.X96_ITERS ?? 900);
const SEEDS = Number(process.env.X96_SEEDS ?? 8);

interface Parsed { contract: string; keys: string[]; raws: string[]; body: string; script: string }

function parseWire(msg: string): Parsed {
  const s0 = msg.indexOf('§');
  if (s0 < 0) throw new Error('no tape marker');
  const e = msg.indexOf('¶', s0 + 1);
  if (e < 0) throw new Error('no tape end');
  const contract = msg.slice(0, s0);
  const tape = msg.slice(s0 + 1, e);
  const body = msg.slice(e + 1);
  const sc: ChironScript | undefined = CHIRON_SCRIPTS.find((x) => chironInScript(x, tape.codePointAt(0)!));
  if (!sc) throw new Error('unrecognised script');
  const parsed = chironParseTape(tape, sc);
  if (!parsed) throw new Error('tape does not parse');
  return { contract, keys: parsed.map((r) => r.glyph), raws: parsed.map((r) => r.raw), body, script: sc.name };
}

function mulberry32(a: number): () => number {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function render(p: Parsed, perm: string[]): string {
  const m = new Map<string, string>();
  for (let i = 0; i < p.keys.length; i++) m.set(p.keys[i], perm[i]);
  const sub = (s: string) => { let o = ''; for (const ch of s) o += (m.get(ch) ?? ch); return o; };
  let t = '';
  for (let i = 0; i < p.keys.length; i++) t += perm[i] + sub(p.raws[i]);
  return p.contract + '§' + t + '¶' + sub(p.body);
}

/** Distinct body run patterns with multiplicity, and the slot map for them. */
function runStructure(p: Parsed) {
  const keySet = new Set(p.keys);
  const slotOf = new Map<string, number>();
  p.keys.forEach((k, i) => slotOf.set(k, i));
  const at = new Map<string, number>();
  const pats: string[] = [];
  const mult: number[] = [];
  let cur = '';
  for (const ch of p.body) {
    if (keySet.has(ch)) cur += ch;
    else if (cur) {
      const i = at.get(cur);
      if (i === undefined) { at.set(cur, pats.length); pats.push(cur); mult.push(1); } else mult[i]++;
      cur = '';
    }
  }
  if (cur) { const i = at.get(cur); if (i === undefined) { pats.push(cur); mult.push(1); } else mult[i]++; }
  const patSlots = pats.map((s) => [...s].map((c) => slotOf.get(c)!));
  const hot: number[] = [];
  for (let i = 0; i < pats.length; i++) if (mult[i] > 1 && pats[i].length >= 2) hot.push(i);
  return { pats, mult, patSlots, hot };
}

/** The climb, verbatim as shipped in isomorphia.ts. */
function climb(p: Parsed, st: ReturnType<typeof runStructure>, iters: number, seed: number): number {
  const rnd = mulberry32(seed);
  let perm = p.keys.slice();
  let best = countTokensExact(render(p, perm), ENC);
  let since = 0;
  for (let it = 0; it < iters && since < 260; it++) {
    let i: number;
    if (st.hot.length && rnd() < 0.45) {
      const q = st.patSlots[st.hot[Math.floor(rnd() * st.hot.length)]];
      i = q[Math.floor(rnd() * q.length)];
    } else i = Math.floor(rnd() * p.keys.length);
    const old = perm[i];
    let cand = '';
    for (let s = 0; s < 40; s++) {
      const c = p.keys[Math.floor(rnd() * p.keys.length)];
      if (c !== old && !perm.includes(c)) { cand = c; break; }
    }
    if (!cand) continue;
    perm[i] = cand;
    const t = countTokensExact(render(p, perm), ENC);
    if (t < best) { best = t; since = 0; } else { perm[i] = old; since++; }
  }
  return best;
}

const LANES: Array<[string, string]> = [
  ['apt-real', 'bench/holdout-x41/apt-real.txt'],
  ['code-ts', 'bench/holdout/code-ts.txt'],
  ['dpkg-l', 'bench/holdout-x42/dpkg-l.txt'],
  ['findmnt', 'bench/holdout-x42/findmnt.txt'],
  ['json-pkg', 'bench/holdout/json-pkg.txt'],
  ['kb-article', 'bench/holdout-work/kb-article.txt'],
  ['llm-answer', 'bench/holdout-work/llm-answer.md'],
  ['ls-l-real', 'bench/holdout-x41/ls-l-real.txt'],
  ['ls-real', 'bench/holdout-x41/ls-real.txt'],
  ['ps-aux-real', 'bench/holdout-x41/ps-aux-real.txt'],
];

const rows: any[] = [];
for (const [name, src] of LANES) {
  const msg = fs.readFileSync(`bench/x87/receipts/wires/${name}.wire.txt`, 'utf8');
  const p = parseWire(msg);
  const st = runStructure(p);
  const T0 = countTokensExact(msg, ENC);
  const ds: number[] = [];
  for (let k = 0; k < SEEDS; k++) ds.push(climb(p, st, ITERS, 0x1590 + k * 104729) - T0);
  ds.sort((a, b) => a - b);
  const med = ds[Math.floor(ds.length / 2)];
  rows.push({
    lane: name, script: p.script, glyphs: p.keys.length, T0, ds,
    min: ds[0], median: med, max: ds[ds.length - 1],
    improved: ds.filter((d) => d < 0).length, seeds: SEEDS,
  });
  console.log(`${name.padEnd(14)} g=${String(p.keys.length).padStart(3)} T0=${String(T0).padStart(5)} ` +
    `dT over ${SEEDS} seeds: min=${String(ds[0]).padStart(4)} med=${String(med).padStart(4)} max=${String(ds[ds.length - 1]).padStart(4)} ` +
    `improved=${ds.filter((d) => d < 0).length}/${SEEDS}  all=[${ds.join(',')}]`);
}
const agg = (f: (r: any) => number) => rows.reduce((a, r) => a + f(r), 0);
console.log(`\nSEED DISTRIBUTION OVER ${SEEDS} SEEDS x ${ITERS} ITERS (10 wires):`);
console.log(`  best-case  (min per lane)  dT = ${agg((r) => r.min)}`);
console.log(`  median     (med per lane)  dT = ${agg((r) => r.median)}`);
console.log(`  worst-case (max per lane)  dT = ${agg((r) => r.max)}`);
console.log(`  lanes with ANY improving seed: ${rows.filter((r) => r.improved > 0).length}/10`);
console.log(`  lanes where EVERY seed improved: ${rows.filter((r) => r.improved === SEEDS).length}/10`);
fs.mkdirSync('bench/x96/receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ note: 'seed distribution of the whole-message assignment climb; zero frontier calls', iters: ITERS, seeds: SEEDS, rows }, null, 1) + '\n');
console.log(`wrote ${OUT}`);
