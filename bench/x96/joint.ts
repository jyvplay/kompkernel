/**
 * X96 — THE JOINT (ORDER, ASSIGNMENT) NEIGHBOURHOOD.
 *
 * Two independent degrees of freedom of the wire, neither reachable by the
 * shipped search:
 *
 *   ASSIGNMENT  which letter each rule gets.  ARIADNE searches it, but against
 *               `runCostPrepared` (the body's reference runs only) and it does
 *               not run last on lanes another parent wins.
 *   ORDER       where each rule sits in the tape.  Constrained only by the
 *               reference DAG.  ARIADNE's four move types all preserve rule
 *               order, so no sequence of them can reach a different order.
 *
 * Measured separately (bench/x96/receipts/): assignment alone is a local
 * optimum (0 over 8 seeds x 10 wires); reordering alone is worth -11 over ten
 * wires.  This probe runs BOTH move types in one climb on the same objective --
 * the token cost of the COMPLETE message -- and reports the distribution over
 * three seeds, because a stochastic climb's output is a sample and one sample
 * is not a result.
 *
 * EXACTNESS.  Both moves are isomorphisms of the wire language: a bijection of
 * the declared script's letters keeps keys distinct and the first letter still
 * declares the alphabet; a topological sort of the reference DAG keeps every
 * reference pointing backwards.  Both therefore leave the decoded string
 * byte-identical.  Every candidate that beats the incumbent is re-decoded with
 * chironDecode before it is counted.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode, type ChironScript } from '../../src/lib/omega/chiron';

const ENC: any = 'o200k_base';
const OUT = 'bench/x96/receipts/joint.json';
const ITERS = Number(process.env.X96_ITERS ?? 3000);
const SEEDS = Number(process.env.X96_SEEDS ?? 3);

interface Parsed { contract: string; keys: string[]; raws: string[]; body: string; script: string; text: string }

function parseWire(msg: string): Parsed {
  const s0 = msg.indexOf('§');
  const e = msg.indexOf('¶', s0 + 1);
  const contract = msg.slice(0, s0);
  const tape = msg.slice(s0 + 1, e);
  const body = msg.slice(e + 1);
  const sc: ChironScript | undefined = CHIRON_SCRIPTS.find((x) => chironInScript(x, tape.codePointAt(0)!));
  if (!sc) throw new Error('unrecognised script');
  const parsed = chironParseTape(tape, sc);
  if (!parsed) throw new Error('tape does not parse');
  return { contract, keys: parsed.map((r) => r.glyph), raws: parsed.map((r) => r.raw), body, script: sc.name, text: '' };
}

function mulberry32(a: number): () => number {
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
  const msg = fs.readFileSync(`bench/x87/receipts/wires/${name}.wire.txt`, 'utf8');
  const text = fs.readFileSync(src, 'utf8');
  const p = parseWire(msg);
  const n = p.keys.length;
  const sc = CHIRON_SCRIPTS.find((x) => chironInScript(x, msg.slice(msg.indexOf('§') + 1).codePointAt(0)!))!;
  const bad = new Set(text);
  const pool: string[] = [];
  for (const [a, b] of sc.ranges ?? [[sc.lo, sc.hi] as [number, number]]) {
    for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (!bad.has(ch) && countTokensExact(ch, ENC) === 1) pool.push(ch); }
  }
  // reference DAG
  const idx = new Map<string, number>();
  p.keys.forEach((k, i) => idx.set(k, i));
  const d: boolean[][] = [];
  for (let i = 0; i < n; i++) {
    const row = new Array<boolean>(n).fill(false);
    for (const ch of p.raws[i]) { const j = idx.get(ch); if (j !== undefined && j !== i) row[j] = true; }
    d.push(row);
  }
  const render = (order: number[], perm: string[]): string => {
    // perm[i] is the letter of rule i; order lists rules in tape order.
    // The VALUES carry glyph references too and must be relabelled with the same
    // map -- the first version of this probe emitted them verbatim, which broke
    // every reference inside the tape and is why three lanes failed chironDecode.
    const m = new Map<string, string>();
    for (let i = 0; i < n; i++) m.set(p.keys[i], perm[i]);
    const sub = (x: string) => { let o = ''; for (const ch of x) o += (m.get(ch) ?? ch); return o; };
    let t = '';
    for (const i of order) t += perm[i] + sub(p.raws[i]);
    return p.contract + '§' + t + '¶' + sub(p.body);
  };

  const T0 = countTokensExact(msg, ENC);
  const ds: number[] = [];
  for (let s = 0; s < SEEDS; s++) {
    const rnd = mulberry32(0x51de + s * 7919 + name.length);
    let order: number[] = p.keys.map((_, i) => i);
    let perm: string[] = p.keys.slice();
    let cur = render(order, perm);
    let best = countTokensExact(cur, ENC);
    let since = 0;
    for (let it = 0; it < ITERS && since < 400; it++) {
      if (rnd() < 0.5) {
        // REORDER: adjacent topological swap
        const a = Math.floor(rnd() * (n - 1));
        const i = order[a], j = order[a + 1];
        if (d[j][i]) { since++; continue; }
        order[a] = j; order[a + 1] = i;
        const m = render(order, perm);
        const t = countTokensExact(m, ENC);
        if (t < best) { best = t; cur = m; since = 0; } else { order[a] = i; order[a + 1] = j; since++; }
      } else {
        // ASSIGNMENT: move one rule onto an unused pool letter
        const i = Math.floor(rnd() * n);
        const old = perm[i];
        let cand = '';
        for (let k = 0; k < 40; k++) {
          const c = pool[Math.floor(rnd() * pool.length)];
          if (c !== old && !perm.includes(c)) { cand = c; break; }
        }
        if (!cand) { since++; continue; }
        perm[i] = cand;
        const m = render(order, perm);
        const t = countTokensExact(m, ENC);
        if (t < best) { best = t; cur = m; since = 0; } else { perm[i] = old; since++; }
      }
    }
    const dec = chironDecode(cur.slice(cur.indexOf('§')));
    // ls-l-real carries an extra contract clause ("After ~, a number has . before
    // its last 1,1 digits") that chironDecode does not implement, so NO
    // relabelling of it can be verified by the real decoder here.  Quarantined,
    // not silently counted.
    if (name === 'ls-l-real') { ds.push(Number.NaN); continue; }
    ds.push(dec === text ? best - T0 : Number.NaN);
  }
  const fin = ds.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  rows.push({
    lane: name, script: p.script, rules: n, T0, quarantined: ds.length - fin.length,
    min: fin.length ? fin[0] : null, median: fin.length ? fin[Math.floor(fin.length / 2)] : null,
    max: fin.length ? fin[fin.length - 1] : null, verified: fin.length, seeds: SEEDS,
  });
  console.log(`${name.padEnd(14)} g=${String(n).padStart(3)} T0=${String(T0).padStart(5)} ` +
    `dT: min=${String(fin.length ? fin[0] : 'NA').padStart(4)} med=${String(fin.length ? fin[Math.floor(fin.length / 2)] : 'NA').padStart(4)} ` +
    `max=${String(fin.length ? fin[fin.length - 1] : 'NA').padStart(4)} verified=${fin.length}/${SEEDS}` +
    (ds.length - fin.length ? `  QUARANTINED=${ds.length - fin.length}` : ''));
}
const agg = (f: (r: any) => number | null) => rows.reduce((a, r) => a + (f(r) ?? 0), 0);
console.log(`\nJOINT (ORDER, ASSIGNMENT) OVER ${SEEDS} SEEDS x ${ITERS} ITERS, 9 verified wires (ls-l-real quarantined):`);
console.log(`  best-case  dT = ${agg((r) => r.min)}`);
console.log(`  median     dT = ${agg((r) => r.median)}`);
console.log(`  worst-case dT = ${agg((r) => r.max)}`);
console.log(`  lanes improved on the median seed: ${rows.filter((r) => (r.median ?? 0) < 0).length}/9`);
fs.mkdirSync('bench/x96/receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ note: 'joint order+assignment climb; zero frontier calls', iters: ITERS, seeds: SEEDS, rows }, null, 1) + '\n');
console.log(`wrote ${OUT}`);
