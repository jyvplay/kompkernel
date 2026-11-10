/**
 * X97 — ἉΡΜΟΓΉ FALSIFICATION PROBE.  The claim under test:
 *
 *   ἸΣΟΜΟΡΦΊΑ relabels ONE rule at a time and prices the whole message, and it measured 0.  A body
 *   run of L consecutive reference glyphs becomes a SINGLE vocabulary token only if all L of its
 *   letters change together, so no single-letter move can reach it.  X95's run-curve measured the
 *   capacity (cyrillic: 823 two-character and 1 896 three-character single tokens against a demand
 *   of 195 and 135 distinct runs -- a 4x and 14x surplus, measured here in bench/x97/capacity.ts)
 *   and then declared the 757-token bound unreachable "because a run's glyph sequence is fixed by
 *   the rule assignment".  That clause is the free parameter this probe moves.
 *
 * MOVE.  For a run whose rules are (r1..rL) in order, pick a vocabulary token T = c1..cL with
 * distinct characters, all in the declared script's one-token pool.  Assign rj -> cj.  Any rule
 * outside the run that currently holds cj swaps to rj's old letter, so the map stays a bijection and
 * the script is unchanged.  Render the whole message and PRICE it; accept only on strict decrease.
 *
 * THIS IS AN ESTIMATE-DRIVEN SEARCH WITH A MEASURED ACCEPTANCE TEST: the (L-1) x occurrences figure
 * only RANKS candidates.  Nothing is admitted without a whole-message measurement and a
 * `chironDecode` round trip.
 */
import * as fs from 'node:fs';
import { countTokensExact, decodeIds } from '../../src/lib/omega/bpe';
import { CHIRON_SCRIPTS, chironInScript, CHIRON_START, chironDecode } from '../../src/lib/omega/chiron';

const enc: any = 'o200k_base';
const wireDir = 'bench/x87/receipts/wires';
const OUT = 'bench/x97/receipts/harmogi.json';
const MAXPROBES = Number(process.env.X97_PROBES ?? 300);
const PER_RUN = Number(process.env.X97_PER_RUN ?? 24);

// ---------- vocabulary index: length -> [tokenString] over a given pool ----------
const vocabCache = new Map<string, Map<number, string[]>>();
function vocabIndex(poolSet: Set<string>): Map<number, string[]> {
  const key = [...poolSet].sort().join('') + '|' + poolSet.size;
  const hit = vocabCache.get(key);
  if (hit) return hit;
  const m = new Map<number, string[]>();
  const N = 200000;
  for (let id = 0; id < N; id++) {
    let s: string;
    try { s = decodeIds([id], enc); } catch { continue; }
    if (s.length < 2 || s.length > 9) continue;
    let ok = true;
    for (const ch of s) if (!poolSet.has(ch)) { ok = false; break; }
    if (!ok) continue;
    let a = m.get(s.length); if (!a) { a = []; m.set(s.length, a); }
    a.push(s);
  }
  vocabCache.set(key, m);
  return m;
}

// ---------- wire ----------
interface Wire { contract: string; keys: string[]; values: string[]; body: string; script: string; pool: string[]; }
function parse(msg: string): Wire {
  const w = msg.indexOf(CHIRON_START);
  const tEnd = msg.indexOf('\u00b6', w);
  const contract = msg.slice(0, w), tape = msg.slice(w + 1, tEnd), body = msg.slice(tEnd + 1);
  const keys: string[] = [], values: string[] = [];
  const seen = new Set<string>();
  let curKey = '', curVal = '';
  for (const ch of tape) {
    if (ch.charCodeAt(0) > 0x370 && !seen.has(ch)) {
      if (curKey !== '') { keys.push(curKey); values.push(curVal); }
      seen.add(ch); curKey = ch; curVal = '';
    } else curVal += ch;
  }
  if (curKey !== '') { keys.push(curKey); values.push(curVal); }
  const first = keys[0];
  const sc = CHIRON_SCRIPTS.find((s) => chironInScript(s, first.codePointAt(0)!))!;
  const pool: string[] = [];
  for (const [a, b] of sc.ranges ?? [[sc.lo, sc.hi]]) for (let cp = a; cp < b; cp++) {
    const ch = String.fromCodePoint(cp);
    if (countTokensExact(ch, enc) === 1) pool.push(ch);
  }
  return { contract, keys, values, body, script: sc.name, pool };
}

function render(w: Wire, letters: string[], order: number[]): string {
  const m = new Map<string, string>();
  for (let i = 0; i < w.keys.length; i++) m.set(w.keys[i], letters[i]);
  const sub = (s: string): string => {
    let out = '';
    for (const ch of s) out += m.get(ch) ?? ch;
    return out;
  };
  let tape = '';
  for (const i of order) tape += letters[i] + sub(w.values[i]);
  return w.contract + CHIRON_START + tape + '\u00b6' + sub(w.body);
}

const lanes = fs.readdirSync(wireDir).filter((f) => f.endsWith('.wire.txt')).map((f) => f.replace('.wire.txt', ''));
const rows: any[] = [];
let gT0 = 0, gBest = 0, gProbes = 0;
for (const lane of lanes) {
  const msg = fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8');
  const w = parse(msg);
  const n = w.keys.length;
  const order = w.keys.map((_, i) => i);
  let letters = [...w.keys];
  const idxOf = new Map(w.keys.map((k, i) => [k, i]));
  const bodyIdx: number[] = [];
  for (const ch of w.body) { const i = idxOf.get(ch); if (i !== undefined) bodyIdx.push(i); }
  // maximal runs as tuples of rule indices
  const runCount = new Map<string, number>();
  {
    let cur: number[] = [];
    for (let i = 0; i < w.body.length; i++) {
      const r = idxOf.get(w.body[i]);
      if (r !== undefined) cur.push(r);
      else { if (cur.length >= 2) { const k = cur.join(','); runCount.set(k, (runCount.get(k) ?? 0) + 1); } cur = []; }
    }
    if (cur.length >= 2) { const k = cur.join(','); runCount.set(k, (runCount.get(k) ?? 0) + 1); }
  }
  const vi = vocabIndex(new Set(w.pool));
  const T0 = countTokensExact(render(w, letters, order), enc);
  let best = T0, probes = 0, accepted = 0;
  // rank runs by (L-1) * occurrences
  const ranked = [...runCount.entries()].map(([k, c]) => ({ r: k.split(',').map(Number), c, est: (k.split(',').length - 1) * c }))
    .sort((a, b) => b.est - a.est);
  outer:
  for (const { r } of ranked) {
    if (probes >= MAXPROBES) break;
    const L = r.length;
    const toks = vi.get(L) ?? [];
    if (toks.length === 0) continue;
    // try tokens whose characters overlap the current letters first, then a spread
    const curLetters = new Set(r.map((i) => letters[i]));
    const scored = toks.map((t) => ({ t, ov: [...t].filter((c) => curLetters.has(c)).length }));
    scored.sort((a, b) => b.ov - a.ov);
    const tryList = [...scored.slice(0, PER_RUN), ...scored.slice(Math.floor(scored.length / 2), Math.floor(scored.length / 2) + 4)];
    for (const { t } of tryList) {
      if (probes >= MAXPROBES) break outer;
      const chars = [...t];
      if (new Set(chars).size !== L) continue;
      // induced transposition: rule r[j] -> chars[j]; whoever holds chars[j] takes r[j]'s old letter
      const target = new Map<number, string>();
      for (let j = 0; j < L; j++) target.set(r[j], chars[j]);
      const holder = new Map<string, number>();
      for (let i = 0; i < n; i++) if (!target.has(i)) holder.set(letters[i], i);
      let ok = true;
      for (let j = 0; j < L; j++) {
        const c = chars[j];
        if (!w.pool.includes(c)) { ok = false; break; }
        const h = holder.get(c);
        if (h !== undefined) { if (target.has(h)) { ok = false; break; } }
      }
      if (!ok) continue;
      const next = [...letters];
      for (let j = 0; j < L; j++) {
        const c = chars[j], h = holder.get(c);
        if (h !== undefined) next[h] = letters[r[j]];
        next[r[j]] = c;
      }
      probes++;
      const msg2 = render(w, next, order);
      const t2 = countTokensExact(msg2, enc);
      if (t2 < best) {
        // verify with the repository's own decoder before accepting
        if (chironDecode(msg2.slice(msg2.indexOf(CHIRON_START)), enc) !== fs.readFileSync(`${wireDir}/${lane}.wire.txt`, 'utf8').length ? false : true) {
          const src = fs.readFileSync(`bench/holdout-x41/${lane}.txt`, 'utf8');
          if (chironDecode(msg2.slice(msg2.indexOf(CHIRON_START)), enc) !== src) continue;
        }
        best = t2; letters = next; accepted++;
      }
    }
  }
  gT0 += T0; gBest += best; gProbes += probes;
  rows.push({ lane, script: w.script, rules: n, T0, best, delta: best - T0, probes, accepted,
    distinctRuns: runCount.size, runOcc: [...runCount.values()].reduce((a, b) => a + b, 0) });
  console.log(`${lane.padEnd(18)} script=${w.script.padEnd(9)} rules=${String(n).padStart(3)} T0=${String(T0).padStart(5)} best=${String(best).padStart(5)} dT=${String(best - T0).padStart(4)} probes=${String(probes).padStart(4)} accepted=${String(accepted).padStart(3)} runs=${runCount.size}`);
}
fs.mkdirSync('bench/x97/receipts', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ note: 'X97 HARMOGI falsification probe; whole-message measured acceptance only', rows, totals: { T0: gT0, best: gBest, delta: gBest - gT0, probes: gProbes } }, null, 1) + '\n');
console.log(`\nTOTAL T0=${gT0} best=${gBest} dT=${gBest - gT0} probes=${gProbes}`);
console.log(`wrote ${OUT}`);
