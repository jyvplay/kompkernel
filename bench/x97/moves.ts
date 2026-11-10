/**
 * X97 — THE TWO MOVES THE STACK HAS NEVER MADE.  Both are priced on the COMPLETE message and
 * verified with `chironDecode`; nothing is admitted on an estimate.
 *
 * MOVE 1 — RELOCATE (non-adjacent reordering).  ἸΣΟΜΟΡΦΊΑ swaps ADJACENT rules only and saturated
 * at -11.  X96 §J named relocation to an arbitrary valid slot as the next highest-information test.
 * A rule may be moved anywhere as long as every rule it references stays before it and every rule
 * referencing it stays after it -- a much larger neighbourhood than adjacent transpositions, and
 * one that can leave a local optimum the adjacent walk cannot.
 *
 * MOVE 2 — RUN FUSION.  57.1% of the body is reference tokens and the measured run-packing headroom
 * is 718 tokens, but relabelling cannot reach it (0/1200, bench/x97/receipts/harmogi.json).  The
 * other way to pack a run is to FUSE it: add one rule whose value is the concatenation of the run's
 * rules' values, so the body carries one reference instead of L.  Tape cost +1 key + tokens(value);
 * body saving (L-1) per occurrence.  X94's ADD census reported 1 profitable body candidate, so this
 * is a re-test of that closure against a population it may not have covered: reference runs.
 */
import * as fs from 'node:fs';
import { countTokensExact } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const OUT = 'bench/x97/receipts/moves.json';
const PROBES = Number(process.env.X97_PROBES ?? 400);

interface Wire { contract: string; keys: string[]; values: string[]; body: string; script: string; }
function parse(msg: string): Wire {
  const w = msg.indexOf(CHIRON_START);
  const tEnd = msg.indexOf('\u00b6', w);
  const tape = msg.slice(w + 1, tEnd);
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let ck = '', cv = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) { if (ck !== '') { keys.push(ck); values.push(cv); } seen.add(ch); ck = ch; cv = ''; }
    else cv += ch;
  }
  if (ck !== '') { keys.push(ck); values.push(cv); }
  const sc = CHIRON_SCRIPTS.find((s) => chironInScript(s, keys[0].codePointAt(0)!))!;
  return { contract: msg.slice(0, w), keys, values, body: msg.slice(tEnd + 1), script: sc.name };
}
function render(w: Wire, letters: string[], order: number[], extra?: { key: string; val: string }[]): string {
  const m = new Map<string, string>();
  for (let i = 0; i < w.keys.length; i++) m.set(w.keys[i], letters[i]);
  const sub = (s: string): string => { let o = ''; for (const ch of s) o += m.get(ch) ?? ch; return o; };
  let tape = '';
  for (const i of order) tape += letters[i] + sub(w.values[i]);
  if (extra) for (const e of extra) tape += e.key + e.val;
  return w.contract + CHIRON_START + tape + '\u00b6' + sub(w.body);
}
const srcOf = (lane: string): string => {
  for (const d of ['bench/holdout-x41', 'bench/holdout', 'bench/holdout-work', 'bench/holdout-x42', 'bench/holdout-x42b', 'bench/holdout-tbl', 'bench/holdout-x40']) {
    const f = `${d}/${lane}.txt`;
    if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
    const f2 = `${d}/${lane}.md`;
    if (fs.existsSync(f2)) return fs.readFileSync(f2, 'utf8');
  }
  const f3 = `bench/holdout-x41/${lane}.patch`;
  if (fs.existsSync(f3)) return fs.readFileSync(f3, 'utf8');
  throw new Error(`no source for ${lane}`);
};
const verify = (msg: string, lane: string): boolean => {
  try { return chironDecode(msg.slice(msg.indexOf(CHIRON_START)), enc) === srcOf(lane); } catch { return false; }
};

const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const rows: any[] = [];
let gA = 0, gB = 0;
for (const lane of lanes) {
  const msg = fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8');
  const w = parse(msg);
  const n = w.keys.length;
  let letters = [...w.keys];
  let order = w.keys.map((_, i) => i);
  const T0 = countTokensExact(render(w, letters, order), enc);
  const idxOf = new Map(w.keys.map((k, i) => [k, i]));
  // dependency DAG
  const dep: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  const rdep: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  for (let i = 0; i < n; i++) for (const ch of w.values[i]) { const j = idxOf.get(ch); if (j !== undefined && j !== i) { dep[i].add(j); rdep[j].add(i); } }
  for (const ch of w.body) { const j = idxOf.get(ch); if (j !== undefined) { /* body deps are positional, handled by order */ } }

  // ---------- MOVE 1: relocate ----------
  let bestA = T0, probesA = 0, accA = 0;
  const posOf = (o: number[]): number[] => { const p = new Array(n).fill(0); for (let k = 0; k < o.length; k++) p[o[k]] = k; return p; };
  let cur = [...order];
  for (let step = 0; step < 40 && probesA < PROBES; step++) {
    let improved = false;
    const pos = posOf(cur);
    // candidate moves ordered by how far they travel
    const cands: { i: number; p: number }[] = [];
    for (let a = 0; a < n; a++) {
      const i = cur[a];
      for (let p = 0; p < n; p++) {
        if (p === a || p === a + 1) continue;
        cands.push({ i, p });
      }
    }
    cands.sort(() => Math.random() - 0.5);
    for (const { i, p } of cands) {
      if (probesA >= PROBES) break;
      const rest = cur.filter((x) => x !== i);
      const np = Math.min(p, rest.length);
      let ok = true;
      for (const d of dep[i]) if (rest.indexOf(d) >= np) { ok = false; break; }
      if (ok) for (const u of rdep[i]) if (rest.indexOf(u) < np) { ok = false; break; }
      if (!ok) continue;
      const next = [...rest.slice(0, np), i, ...rest.slice(np)];
      probesA++;
      const t2 = countTokensExact(render(w, letters, next), enc);
      if (t2 < bestA) { bestA = t2; cur = next; accA++; improved = true; break; }
    }
    if (!improved) break;
  }

  // ---------- MOVE 2: run fusion ----------
  let bestB = bestA, probesB = 0, accB = 0;
  const runCount = new Map<string, number>();
  {
    let c: number[] = [];
    for (const ch of w.body) { const r = idxOf.get(ch); if (r !== undefined) c.push(r); else { if (c.length >= 2) { const k = c.join(','); runCount.set(k, (runCount.get(k) ?? 0) + 1); } c = []; } }
    if (c.length >= 2) { const k = c.join(','); runCount.set(k, (runCount.get(k) ?? 0) + 1); }
  }
  const pool: string[] = [];
  const sc = CHIRON_SCRIPTS.find((s) => chironInScript(s, w.keys[0].codePointAt(0)!))!;
  for (const [a, b] of sc.ranges ?? [[sc.lo, sc.hi]]) for (let cp = a; cp < b; cp++) { const ch = String.fromCodePoint(cp); if (countTokensExact(ch, enc) === 1) pool.push(ch); }
  const used = new Set(w.keys);
  const free = pool.filter((c) => !used.has(c));
  let curKeys = [...w.keys], curVals = [...w.values], curBody = w.body, curOrder = [...cur];
  const ranked = [...runCount.entries()].map(([k, c]) => ({ r: k.split(',').map(Number), c, est: (k.split(',').length - 1) * c })).sort((a, b) => b.est - a.est);
  for (const { r, c } of ranked) {
    if (probesB >= PROBES || free.length === 0) break;
    const key = free.shift()!;
    const val = r.map((i) => curKeys[i]).join('');
    const nk = [...curKeys, key], nv = [...curVals, val];
    const nb = curBody.split(r.map((i) => curKeys[i]).join('')).join(key);
    const w2: Wire = { contract: w.contract, keys: nk, values: nv, body: nb, script: w.script };
    const nOrder = [...curOrder, nk.length - 1];
    probesB++;
    const t2 = countTokensExact(render(w2, nk, nOrder), enc);
    if (t2 < bestB && verify(render(w2, nk, nOrder), lane)) {
      bestB = t2; curKeys = nk; curVals = nv; curBody = nb; curOrder = nOrder; accB++;
    } else free.push(key);
  }
  gA += bestA; gB += bestB;
  rows.push({ lane, script: w.script, rules: n, T0, relocate: bestA, dRelocate: bestA - T0, probesRelocate: probesA, accRelocate: accA,
    fuse: bestB, dFuse: bestB - T0, probesFuse: probesB, accFuse: accB });
  console.log(`${lane.padEnd(18)} rules=${String(n).padStart(3)} T0=${String(T0).padStart(5)} | RELOCATE ${String(bestA).padStart(5)} (${String(bestA - T0).padStart(3)}) p=${String(probesA).padStart(4)} a=${String(accA).padStart(3)} | FUSE ${String(bestB).padStart(5)} (${String(bestB - T0).padStart(3)}) p=${String(probesB).padStart(4)} a=${String(accB).padStart(3)}`);
}
fs.mkdirSync('bench/x97/receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ note: 'X97 relocate + run-fusion moves; whole-message measured acceptance + chironDecode', rows, totals: { T0: rows.reduce((a, b) => a + b.T0, 0), relocate: gA, fuse: gB } }, null, 1) + '\n');
console.log(`\nTOTAL T0=${rows.reduce((a, b) => a + b.T0, 0)}  after RELOCATE ${gA} (${gA - rows.reduce((a, b) => a + b.T0, 0)})  after RELOCATE+FUSE ${gB} (${gB - rows.reduce((a, b) => a + b.T0, 0)})`);
console.log(`wrote ${OUT}`);
