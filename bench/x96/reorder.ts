/**
 * X96 — TAPE REORDERING: THE MOVE THE EXISTING SEARCH CANNOT MAKE.
 *
 * The tape is a delimiter-free sequence `§ k1 v1 k2 v2 ... ¶ body`.  Its ORDER
 * is constrained by exactly one rule: "Rules only ever reference rules defined
 * earlier (guaranteed by topological rendering)".  Within that partial order the
 * order is free, and it is billed twice over:
 *
 *   (a) the glyph COLUMN is the sequence k1 k2 ... kn, and its token count
 *       depends on which letters end up adjacent (502 tokens for 600 entries on
 *       the ten wires, i.e. merges are already happening and more may be
 *       available);
 *   (b) nothing else -- a value's own string does not depend on its position.
 *
 * ARIADNE's hill-climb moves ONE LETTER at a time (ariadne.ts: n-gram, hot-pair,
 * random-single, random-swap).  A reordering is not reachable by any of those
 * moves, and neither is a pair of them, because every one of them preserves the
 * rule order.  So the joint (order, assignment) problem has a neighbourhood the
 * shipped search cannot enter at all.  This probe measures what is in it.
 *
 * EXACTNESS.  A permutation of the rules that is a topological sort of the
 * reference DAG keeps every reference pointing backwards, so `chironDecode`'s
 * forward-reference guard still passes and each rule still expands to the same
 * string.  The decoded text is therefore byte-identical.  Verified per candidate
 * with chironDecode on the best result, not assumed.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, chironParseTape, chironDecode, type ChironScript } from '../../src/lib/omega/chiron';

const ENC: any = 'o200k_base';
const OUT = 'bench/x96/receipts/reorder.json';
const ITERS = Number(process.env.X96_ITERS ?? 4000);

interface Parsed { contract: string; keys: string[]; raws: string[]; body: string; script: string }

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

/** deps[i] = set of rule indices that rule i's value references (all < i in the incumbent order). */
function deps(p: Parsed): boolean[][] {
  const idx = new Map<string, number>();
  p.keys.forEach((k, i) => idx.set(k, i));
  const d: boolean[][] = [];
  for (let i = 0; i < p.keys.length; i++) {
    const row = new Array<boolean>(p.keys.length).fill(false);
    for (const ch of p.raws[i]) { const j = idx.get(ch); if (j !== undefined && j !== i) row[j] = true; }
    d.push(row);
  }
  return d;
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
  const d = deps(p);
  const n = p.keys.length;
  // position[i] = index of rule i in the current order
  let order: number[] = p.keys.map((_, i) => i);
  const renderOrder = (o: number[]): string => {
    let t = '';
    for (const i of o) t += p.keys[i] + p.raws[i];
    return p.contract + '§' + t + '¶' + p.body;
  };
  const T0 = countTokensExact(msg, ENC);
  let cur = renderOrder(order);
  let best = countTokensExact(cur, ENC);
  let bestOrder = order.slice();
  const rnd = mulberry32(0x7ea9 + name.length * 31);
  let valid = 0, tried = 0, accepted = 0;
  for (let it = 0; it < ITERS; it++) {
    // pick a random adjacent-in-order pair and swap it if the result is still a
    // topological sort of the reference DAG
    const a = Math.floor(rnd() * (n - 1));
    const i = order[a], j = order[a + 1];
    tried++;
    // After the swap j sits BEFORE i.  Everything before position a is unchanged,
    // so the only new violation possible is j depending on i -- j's references
    // must all precede j, and i has just moved behind it.  The first version of
    // this probe tested d[i][j], which is vacuously false for an adjacent pair of
    // the incumbent order (references only ever point backwards there), so it
    // accepted every swap and emitted invalid orders; three lanes duly failed the
    // chironDecode check and their "gains" were corruption.
    if (d[j][i]) continue;
    valid++;
    order[a] = j; order[a + 1] = i;
    const m = renderOrder(order);
    const t = countTokensExact(m, ENC);
    if (t < best) { best = t; cur = m; bestOrder = order.slice(); accepted++; }
    else { order[a] = i; order[a + 1] = j; }
  }
  const decoded = chironDecode(cur.slice(cur.indexOf('§')));
  const exact = decoded === fs.readFileSync(src, 'utf8');
  rows.push({
    lane: name, script: p.script, rules: n, T0, Tbest: best, dT: best - T0,
    validSwaps: valid, tried, accepted, exact,
  });
  console.log(`${name.padEnd(14)} ${p.script.padEnd(9)} rules=${String(n).padStart(3)} T0=${String(T0).padStart(5)} ` +
    `Tbest=${String(best).padStart(5)} dT=${String(best - T0).padStart(5)} ` +
    `validSwaps=${valid}/${tried} accepted=${accepted} exact=${exact}`);
}
const tot = (k: string) => rows.reduce((a, r) => a + r[k], 0);
console.log(`\nTAPE REORDER TOTAL: T0=${tot('T0')}  Tbest=${tot('Tbest')}  dT=${tot('dT')} (${(100 * tot('dT') / tot('T0')).toFixed(3)}%)`);
console.log(`lanes improved: ${rows.filter((r) => r.dT < 0).length}/10   exact: ${rows.filter((r) => r.exact).length}/10`);
fs.mkdirSync('bench/x96/receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ note: 'tape reordering under the reference DAG; zero frontier calls', iters: ITERS, rows }, null, 1) + '\n');
console.log(`wrote ${OUT}`);
