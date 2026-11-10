/**
 * X95 — SECOND-LEVEL RULES OVER THE REFERENCE ALPHABET: are adjacent glyph runs a dictionary
 * the shipped stack has left unmined?
 *
 * WHY THIS WAS NEVER PRICED. X94's tape-marginal.ts priced 2 309 local moves exactly and found
 * four tokens of slack, closing the dictionary side. But its FACTOR move carried a purity filter
 * that REJECTED any candidate containing a character above U+007F -- necessary, because a literal
 * span containing a rule glyph rewrites the straight-line program instead of abbreviating it. The
 * side effect is that the one class of candidate the filter excludes by construction is exactly
 * the class made OF rule glyphs: a repeated run of references in the body. 161 candidates were
 * skipped and the receipt calls that a scope limit. This probe removes the limit.
 *
 * WHY IT MIGHT BE LARGE. The cost centres in docs/codecs.md put references at 3 222 of 7 864
 * tokens -- 41 % of the message, the single largest centre -- at a measured mean of ~0.801 tokens
 * per glyph. METATHESIS's own label says that flat price "is the MEAN OF A BIMODAL DISTRIBUTION"
 * and that "the real unit of cost is the RUN, not the glyph". If runs are the unit, then a rule
 * whose value is a RUN is the natural next object, and it does not need the tokenizer's vocabulary
 * to contain the run: the new glyph is defined as the two or three old ones, so one reference
 * replaces two or three. X94's saturation verdict ("the 638-token unmerged adjacent glyph pair
 * headroom is unachievable -- merging is a property of the vocabulary, not the assignment") was
 * about RELABELLING into merges the vocabulary already has. This is about DEFINING merges the
 * vocabulary does not have. Different object, different bound.
 *
 * ECONOMICS, PRICED WITH X94'S CORRECTED LAW RATHER THAN THE OLD ESTIMATE. X94 fitted
 * profit = -0.981k - 3.11 for T=1 literal material (R^2 = 0.869): a new tape rule costs ~3.1
 * tokens fixed and each reference site ~1.0 net. A pair rule is not literal material -- its value
 * is two glyphs that already merge with their neighbours -- so the constant must be re-measured
 * here, not imported. Break-even is whatever the census says it is.
 *
 * LEGALITY OF APPENDING. The tape is positional: entries() defines a glyph at its FIRST
 * appearance, so a reference to a later-defined rule parses as the start of a new entry (X94 §C3).
 * A run rule's value consists of glyphs defined EARLIER in the tape, and the substitution happens
 * in the BODY, which follows the whole tape. Appending the new entry at the end of the tape is
 * therefore legal, and this probe asserts it rather than assuming it: every move is re-expanded to
 * a fixed point and compared with the original expansion.
 *
 * ZERO frontier calls. Reads the ten committed wires in bench/x87/receipts/wires/.
 */
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);
type Entry = { g: string; v: string };

function split(wire: string) {
  const sec = wire.indexOf('§');
  const pil = sec >= 0 ? wire.indexOf('¶', sec) : -1;
  if (sec < 0 || pil < 0) throw new Error('wire has no tape');
  return { contract: wire.slice(0, sec), tape: wire.slice(sec + 1, pil), body: wire.slice(pil + 1) };
}
function entries(tape: string): Entry[] {
  const seen = new Set<string>(); const out: Entry[] = []; let cur: Entry | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; out.push(cur); }
    else if (cur) cur.v += ch;
  }
  return out;
}
function expand(body: string, ents: Entry[]): string {
  const map = new Map(ents.map(e => [e.g, e.v]));
  let s = body;
  for (let i = 0; i < 64; i++) {
    let next = ''; let changed = false;
    for (const ch of s) { const v = map.get(ch); if (v === undefined) next += ch; else { next += v; changed = true; } }
    s = next; if (!changed) break;
  }
  return s;
}
function buildFree(wire: string): string[] {
  const ranges: [number, number][] = [[0x0370, 0x052f], [0x2c00, 0x2c5f], [0xa640, 0xa69f], [0x1c80, 0x1c8f], [0x0530, 0x058f], [0x10a0, 0x10ff]];
  const used = new Set<string>([...wire]);
  const out: string[] = [];
  for (const [a, b] of ranges) for (let cp = a; cp <= b; cp++) { const c = String.fromCodePoint(cp); if (!used.has(c)) out.push(c); }
  return out;
}

const MAXN = Number(process.env.X95_MAXN ?? 4);       // longest run to consider
const TOPN = Number(process.env.X95_TOP ?? 40);       // how many run rules to price per lane
const files = process.argv.slice(2);
const L: string[] = [];
const receipt: any = { note: 'second-level rules over the reference alphabet; exact whole-message pricing; zero frontier calls', lanes: [] };

L.push('lane'.padEnd(14) + 'msgTok   refs  | n-gram census: distinct runs by length (k>=2) | priced  neg  bestTok  fidelity');
let TOT = { msg: 0, priced: 0, neg: 0, best: 0, bad: 0 };
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = path.basename(f).replace('.wire.txt', '');
  const { contract, tape, body } = split(wire);
  const ents = entries(tape);
  const baseExp = expand(body, ents);
  const base = ct(wire);
  const GLYPH = new Set(ents.map(e => e.g));

  // the body's reference runs: maximal sequences of characters that are rule glyphs
  const runs: string[] = [];
  let cur = '';
  for (const ch of body) { if (GLYPH.has(ch)) cur += ch; else { if (cur) runs.push(cur); cur = ''; } }
  if (cur) runs.push(cur);
  const refCount = runs.reduce((a, r) => a + r.length, 0);

  // enumerate every substring of every run, length 2..MAXN, count occurrences in the WHOLE body
  const counts = new Map<string, number>();
  for (let n = 2; n <= MAXN; n++) {
    for (let i = 0; i + n <= body.length; i++) {
      const s = body.slice(i, i + n);
      let all = true; for (const ch of s) if (!GLYPH.has(ch)) { all = false; break; }
      if (!all) continue;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
  }
  const byLen: Record<number, number> = {};
  for (const [s, k] of counts) if (k >= 2) byLen[s.length] = (byLen[s.length] ?? 0) + 1;

  // maximal runs only: a shorter run contained in a longer one with the same count is redundant
  const cands = [...counts.entries()]
    .filter(([, k]) => k >= 2)
    .filter(([s, k]) => ![...counts.entries()].some(([s2, k2]) => s2 !== s && s2.includes(s) && k2 >= k))
    .sort((a, b) => (b[1] * b[0].length - a[1] * a[0].length))
    .slice(0, TOPN);

  const FREE = buildFree(wire);
  let fi = 0;
  let curTape = tape, curBody = body, curEnts = ents, curTok = base;
  const taken: any[] = []; let bad = 0, neg = 0, bestSingle = 0;
  // GREEDY SEQUENTIAL: apply each profitable rule to the running wire, because run rules interact
  // (a length-3 rule can consume the sites of its length-2 subruns). Each step is fidelity-checked
  // against the ORIGINAL expansion, so a chain of moves cannot drift.
  for (const [s, k0] of cands) {
    if (fi >= FREE.length) break;
    const k = curBody.split(s).length - 1;
    if (k < 2) continue;
    const g = FREE[fi++];
    const nTape = curTape + g + s;
    const nBody = curBody.split(s).join(g);
    const nEnts = entries(nTape);
    if (expand(nBody, nEnts) !== baseExp) { bad++; continue; }
    const nWire = contract + '§' + nTape + '¶' + nBody;
    const nTok = ct(nWire);
    const d = nTok - curTok;
    if (d < 0) { neg++; taken.push({ s, k, d }); curTape = nTape; curBody = nBody; curEnts = nEnts; curTok = nTok; }
    else bestSingle = Math.min(bestSingle, d), bestSingle = bestSingle; // record best rejected delta
    if (d < 0) continue;
  }
  const delta = curTok - base;
  L.push(name.padEnd(14) + String(base).padStart(6) + String(refCount).padStart(7) + '  | ' +
    [2, 3, 4].map(n => `n=${n}:${String(byLen[n] ?? 0).padStart(4)}`).join(' ') + '  | ' +
    String(cands.length).padStart(6) + String(neg).padStart(5) + String(delta).padStart(8) + '   ' + (bad === 0 ? 'exact' : `FAIL ${bad}`));
  receipt.lanes.push({ lane: name, path: f, msgTokens: base, refs: refCount,
    runsByLenDistinctKGe2: byLen, candidates: cands.length, applied: taken, fidelityFailures: bad,
    finalTokens: curTok, delta });
  TOT.msg += base; TOT.priced += cands.length; TOT.neg += neg; TOT.best += delta; TOT.bad += bad;
}
L.push('-'.repeat(104));
L.push(`TOTAL over ${files.length} wires: msgTokens ${TOT.msg}  run rules applied ${TOT.neg} of ${TOT.priced} candidates  net delta ${TOT.best} tokens  fidelity failures ${TOT.bad}`);
L.push(`(negative delta = improvement; ${TOT.best === 0 ? 'NO GAIN' : (100 * TOT.best / TOT.msg).toFixed(3) + '% of the ten-wire total'})`);
const log = L.join('\n') + '\n';
fs.mkdirSync('bench/x95/receipts', { recursive: true });
fs.writeFileSync('bench/x95/receipts/runmerge.json', JSON.stringify(receipt, null, 1) + '\n');
fs.writeFileSync('bench/x95/receipts/runmerge.log', log);
console.log(log);
