/**
 * X96 — WHOLE-MESSAGE ASSIGNMENT OBJECTIVE.
 *
 * ARIADNE's hill-climb prices the glyph->rule assignment against
 * `runCostPrepared` — the token cost of the BODY's reference runs and nothing
 * else (ariadne.ts:562).  The tape's value column and the tape's glyph column
 * are treated as assignment-invariant.  They are not: a rule's value contains
 * glyph references to earlier rules, so relabelling the alphabet re-serialises
 * every value and re-prices it, and the glyph column's own merges change too.
 *
 * A bijective relabelling of the declared script's used letters is an
 * ISOMORPHISM of the wire language: keys stay distinct, "first letter declares
 * the script" still holds because the permutation stays inside the script's
 * pool, references still point at earlier rules, and `¶` never enters a value.
 * Therefore the decoded text is unchanged and the transformation is exact.
 *
 * This probe therefore measures, per lane:
 *   T0      whole-message tokens of the committed wire
 *   B0      the body-runs-only objective at that same assignment (what ARIADNE
 *           minimises) — recomputed here from the wire, not read from a receipt
 *   Tbest   whole-message tokens after a stochastic hill-climb over glyph
 *           relabellings scored on the WHOLE message
 *   Bbest   the body-runs-only objective at that better whole-message point
 *
 * If Bbest > B0 while Tbest < T0, the shipped objective is provably misaligned
 * with the metric we are billed on, and the gap is the new mechanism.
 *
 * Zero frontier calls; every number is a live countTokens of a concrete string.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, type ChironScript } from '../../src/lib/omega/chiron';

const ENC: any = 'o200k_base';
const OUT = 'bench/x96/receipts/wholeobj.json';
const ITERS = Number(process.env.X96_ITERS ?? 900);

interface Parsed { contract: string; keys: string[]; texts: string[]; body: string; script: string }

function parseWire(msg: string): Parsed {
  const s = msg.indexOf('§');
  if (s < 0) throw new Error('no tape marker');
  const e = msg.indexOf('¶', s + 1);
  if (e < 0) throw new Error('no tape end');
  const contract = msg.slice(0, s);
  const tape = msg.slice(s + 1, e);
  const body = msg.slice(e + 1);
  const sc: ChironScript | undefined = CHIRON_SCRIPTS.find((x) => chironInScript(x, tape.codePointAt(0)!));
  if (!sc) throw new Error(`unrecognised script for first tape char U+${tape.codePointAt(0)!.toString(16)}`);
  // A letter of the declared script is a RULE KEY the first time it appears and
  // a REFERENCE to that rule every time after (chiron.ts: "each rule is one *new*
  // letter ... followed by its text, which runs to the next new letter").
  const keys: string[] = [];
  const texts: string[] = [];
  const seen = new Set<string>();
  let i = 0;
  while (i < tape.length) {
    const ch = tape[i];
    if (!chironInScript(sc, ch.codePointAt(0)!) || seen.has(ch)) throw new Error('tape text before the first new glyph');
    seen.add(ch);
    keys.push(ch);
    i++;
    let t = '';
    while (i < tape.length) {
      const c2 = tape[i];
      if (chironInScript(sc, c2.codePointAt(0)!) && !seen.has(c2)) break;
      t += c2;
      i++;
    }
    texts.push(t);
  }
  return { contract, keys, texts, body, script: sc.name };
}

/** Full expansion. Rules reference only earlier rules, so one ordered pass suffices. */
function expand(p: Parsed): string {
  const map = new Map<string, string>();
  for (let i = 0; i < p.keys.length; i++) {
    let t = p.texts[i];
    for (const [k, v] of map) t = t.split(k).join(v);
    map.set(p.keys[i], t);
  }
  let b = p.body;
  for (const [k, v] of map) b = b.split(k).join(v);
  return b;
}

/** Maximal reference runs of the body, with multiplicity — ARIADNE's objective. */
function bodyRuns(p: Parsed): { pats: string[]; mult: number[] } {
  const isG = new Set(p.keys);
  const at = new Map<string, number>();
  const pats: string[] = [];
  const mult: number[] = [];
  let cur = '';
  for (const ch of p.body) {
    if (isG.has(ch)) cur += ch;
    else { if (cur) { const i = at.get(cur); if (i === undefined) { at.set(cur, pats.length); pats.push(cur); mult.push(1); } else mult[i]++; cur = ''; } }
  }
  if (cur) { const i = at.get(cur); if (i === undefined) { pats.push(cur); mult.push(1); } else mult[i]++; }
  return { pats, mult };
}

function render(p: Parsed, perm: string[]): string {
  const m = new Map<string, string>();
  for (let i = 0; i < p.keys.length; i++) m.set(p.keys[i], perm[i]);
  const sub = (s: string) => { let o = ''; for (const ch of s) o += (m.get(ch) ?? ch); return o; };
  let tape = '';
  for (let i = 0; i < p.keys.length; i++) tape += perm[i] + sub(p.texts[i]);
  return p.contract + '§' + tape + '¶' + sub(p.body);
}

/** Stochastic hill-climb over glyph relabellings, scored on the WHOLE message. */
function climb(p: Parsed, iters: number, seed: number, start?: string[]): { perm: string[]; toks: number; msg: string } {
  const rnd = mulberry32(seed);
  let perm = (start ?? p.keys).slice();
  let msg = render(p, perm);
  let best = countTokensExact(msg, ENC);
  for (let it = 0; it < iters; it++) {
    const i = Math.floor(rnd() * perm.length);
    const j = Math.floor(rnd() * perm.length);
    if (i === j) continue;
    const a = perm[i]; perm[i] = perm[j]; perm[j] = a;
    const m2 = render(p, perm);
    const t = countTokensExact(m2, ENC);
    if (t < best) { best = t; msg = m2; }
    else { const b = perm[i]; perm[i] = perm[j]; perm[j] = b; }
  }
  return { perm, toks: best, msg };
}

/** Deterministic RNG so the receipt is reproducible. */
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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
  const text = fs.readFileSync(src, 'utf8');
  const msg = fs.readFileSync(`bench/x87/receipts/wires/${name}.wire.txt`, 'utf8');
  const p = parseWire(msg);
  const dec = expand(p);
  const exact = dec === text;

  const T0 = countTokensExact(msg, ENC);
  const runs0 = bodyRuns(p);
  const B0 = runs0.pats.reduce((a, s, i) => a + countTokensExact(s, ENC) * runs0.mult[i], 0);

  // --- stochastic hill-climb on the WHOLE message -------------------------
  const rnd = mulberry32(0x9600 + name.length * 7919);
  let perm = p.keys.slice();
  let cur = render(p, perm);
  let best = countTokensExact(cur, ENC);
  let improving = 0, tried = 0;
  for (let it = 0; it < ITERS; it++) {
    const i = Math.floor(rnd() * perm.length);
    let j = Math.floor(rnd() * perm.length);
    if (i === j) continue;
    tried++;
    const a = perm[i]; perm[i] = perm[j]; perm[j] = a;
    const m = render(p, perm);
    const t = countTokensExact(m, ENC);
    if (t < best) { best = t; cur = m; improving++; }
    else { const b = perm[i]; perm[i] = perm[j]; perm[j] = b; }
  }

  // the body-runs objective at the better whole-message point
  const pBest = parseWire(cur);
  const runsB = bodyRuns(pBest);
  const Bbest = runsB.pats.reduce((a, s, i) => a + countTokensExact(s, ENC) * runsB.mult[i], 0);

  rows.push({
    lane: name, script: p.script, exact, glyphs: p.keys.length,
    T0, Tbest: best, dT: best - T0, B0, Bbest, dB: Bbest - B0,
    improving, tried, pctT: +(100 * (best - T0) / T0).toFixed(3),
    tapeToks: countTokensExact(msg.slice(0, msg.indexOf('¶', msg.indexOf('§') + 1) + 1), ENC),
    contractToks: countTokensExact(p.contract, ENC),
    bodyToks: countTokensExact(p.body, ENC),
  });
  console.log(
    `${name.padEnd(14)} ${p.script.padEnd(9)} g=${String(p.keys.length).padStart(3)} exact=${String(exact).padEnd(5)} ` +
    `T0=${String(T0).padStart(4)} Tbest=${String(best).padStart(4)} dT=${String(best - T0).padStart(5)} ` +
    `B0=${String(B0).padStart(4)} Bbest=${String(Bbest).padStart(4)} dB=${String(Bbest - B0).padStart(4)} ` +
    `impr=${improving}/${tried}`);
}

const tot = (k: string) => rows.reduce((a, r) => a + r[k], 0);
console.log(`\nTOTAL  T0=${tot('T0')}  Tbest=${tot('Tbest')}  dT=${tot('dT')}  (${(100 * tot('dT') / tot('T0')).toFixed(3)}%)`);
console.log(`TOTAL  B0=${tot('B0')}  Bbest=${tot('Bbest')}  dB=${tot('dB')}`);
console.log(`segments: contract=${tot('contractToks')}  tape=${tot('tapeToks')}  body=${tot('bodyToks')}`);

/* ---------------------------------------------------------------------------
 * PHASE 2 — THE SCRIPT IS A FREE PARAMETER OF THE ASSIGNMENT.
 *
 * chiron.ts declares eight disjoint one-token scripts and says "the first
 * letter of the tape declares which script the wire uses, so nothing about the
 * alphabet is transmitted".  A script change is therefore a pure relabelling:
 * map the i-th used letter onto the i-th one-token character of the new
 * script's pool.  Keys stay distinct, references still point at earlier rules,
 * and the decoded text is unchanged.  The only extra condition is that the
 * SOURCE TEXT must not contain any character of the new script, or the tape
 * would become ambiguous — that is checked and reported, not assumed.
 *
 * The bound is the run-curve SAVING column: 757 tokens if every reference run
 * cost one token.  The scripts differ by how many two-character single tokens
 * their pool carries (polyglot 3420 over 802 letters, CJK 2415), so the script
 * choice is a real lever on that bound and it has never been co-optimised with
 * the assignment.
 * ------------------------------------------------------------------------- */
function scriptPoolChars(sc: ChironScript): string[] {
  const out: string[] = [];
  for (const [a, b] of sc.ranges ?? [[sc.lo, sc.hi] as [number, number]]) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (countTokensExact(ch, ENC) === 1) out.push(ch);
    }
  }
  return out;
}

const pools = new Map<string, string[]>();
for (const sc of CHIRON_SCRIPTS) pools.set(sc.name, scriptPoolChars(sc));
console.log('\n--- script pools (one-token characters available) ---');
for (const sc of CHIRON_SCRIPTS) console.log(`  ${sc.name.padEnd(10)} ${String(pools.get(sc.name)!.length).padStart(6)}`);

const sweep: any[] = [];
const SW = Number(process.env.X96_SWEEP ?? 500);
const FIN = Number(process.env.X96_FINAL ?? 3000);
for (const [name, src] of LANES) {
  const text = fs.readFileSync(src, 'utf8');
  const msg = fs.readFileSync(`bench/x87/receipts/wires/${name}.wire.txt`, 'utf8');
  const p = parseWire(msg);
  const need = p.keys.length;
  const row: any = { lane: name, glyphs: need, scripts: {} as Record<string, number | string> };
  let bestPerm: string[] | null = null;
  let bestToks = Infinity;
  let bestScript = '';
  for (const sc of CHIRON_SCRIPTS) {
    const pool = pools.get(sc.name)!;
    if (pool.length < need) { row.scripts[sc.name] = 'POOL-TOO-SMALL'; continue; }
    let collide = false;
    for (const ch of text) if (chironInScript(sc, ch.codePointAt(0)!)) { collide = true; break; }
    if (collide) { row.scripts[sc.name] = 'TEXT-COLLISION'; continue; }
    // equal footing: every script starts from the same index relabelling and
    // gets the same climb budget on the same whole-message objective
    const r = climb(p, SW, 0x9600 + name.length * 7919 + sc.name.length, pool.slice(0, need));
    row.scripts[sc.name] = r.toks;
    if (r.toks < bestToks) { bestToks = r.toks; bestPerm = r.perm; bestScript = sc.name; }
  }
  // long climb inside the winning script
  if (bestPerm) {
    const f = climb(p, FIN, 0x5eed + name.length, bestPerm);
    bestToks = f.toks; bestPerm = f.perm;
  }
  row.incumbent = countTokensExact(msg, ENC);
  row.bestScript = bestScript || null;
  row.bestScriptToks = bestToks === Infinity ? null : bestToks;
  row.dScript = bestToks === Infinity ? null : bestToks - row.incumbent;
  sweep.push(row);
  console.log(`${name.padEnd(14)} g=${String(need).padStart(3)} incumbent=${String(row.incumbent).padStart(5)} ` +
    Object.entries(row.scripts).map(([k, v]) => `${k}=${v}`).join(' ') +
    `  BEST=${bestScript} final=${bestToks} dT=${row.dScript}`);
}
const sTot = (k: string) => sweep.reduce((a, r) => a + (typeof r[k] === 'number' ? r[k] : 0), 0);
console.log(`\nSCRIPT+ASSIGNMENT CO-OPTIMISATION TOTAL: incumbent=${sTot('incumbent')}  bestPerLane=${sTot('bestScriptToks')}  dT=${sTot('dScript')} (${(100 * sTot('dScript') / sTot('incumbent')).toFixed(3)}%)`);

fs.writeFileSync(OUT, JSON.stringify({
  note: 'whole-message vs body-runs assignment objective, then a script x assignment co-optimisation; zero frontier calls',
  iters: ITERS, sweepIters: SW, finalIters: FIN, rows, sweep,
  pools: Object.fromEntries([...pools].map(([k, v]) => [k, v.length])),
}, null, 1) + '\n');
console.log(`wrote ${OUT}`);
