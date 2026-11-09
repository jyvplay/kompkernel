/**
 * X94 — EXACT MARGINAL ECONOMICS OF THE SHIPPED TAPE, IN BOTH DIRECTIONS.
 *
 * THE QUESTION. Every arm in this stack decides its rule set with an ESTIMATE priced on the
 * SOURCE text: the economic identity in docs/codecs.md says a T-token phrase occurring k times
 * costs T+k+1 with a tape entry against kT without, so the gain is (k-1)(T-1)-1, and X28
 * enumerated every repeated substring of kb-article under that formula and found ZERO with
 * positive net profit. That verdict has stood for sixty-odd turns and is the reason the
 * dictionary side is recorded as exhausted.
 *
 * But the objective is not the source. The objective is the COMPLETE MESSAGE --
 * contract + tape + body -- and its token count is not the sum of its parts, because BPE merges
 * across the boundaries: a glyph merges with the first characters of its own value in the tape
 * (which is why the glyph column costs 447 tokens for 610 entries, 0.73 each, and not 610), and
 * a glyph merges with adjacent glyphs in the body (which is what METATHESIS exploits, and whose
 * own label says the flat per-occurrence price of ~0.801 tokens "is the MEAN OF A BIMODAL
 * DISTRIBUTION" and that "the real unit of cost is the RUN, not the glyph").
 *
 * So the estimate and the objective differ by exactly the merge effects, and the sign of that
 * difference is not knowable a priori. This probe measures it directly, with
 * countTokensExact on the whole message, for two move classes nobody has priced this way:
 *
 *   REMOVE(g)  delete entry g from the tape and inline its value at every reference.
 *              dRemove < 0 means the shipped tape is carrying an entry that COSTS tokens --
 *              a rule the estimate thought profitable and the tokenizer does not.
 *   ADD(s)     append a new entry whose value is s and replace every occurrence of s in the
 *              body with its glyph. dAdd < 0 means there is still profit in the residue that
 *              the source-priced formula could not see.
 *
 * ZERO frontier calls: this reads the ten committed wires in bench/x87/receipts/wires/ and
 * re-tokenises strings. It is a SCREEN, not a win -- a negative d here is a candidate that must
 * still be rebuilt by a real encoder and re-verified end to end, and an all-non-negative result
 * is a strong impossibility statement about the shipped tapes under exact local moves.
 *
 * FIDELITY. Both moves preserve the decoded text exactly: REMOVE replaces a reference by the
 * very string it denotes (recursively, since a value may itself reference other glyphs), and ADD
 * replaces a literal span by a rule whose value is that span. Neither is a rewrite of content.
 * The probe asserts this by re-expanding the modified tape to a fixed point and comparing with
 * the original expansion, so a bug in the move cannot masquerade as a gain.
 */
import { countTokensExact } from '../../src/lib/omega/bpe';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

const ENC = 'o200k_base' as const;
const ct = (s: string) => countTokensExact(s, ENC);

type Entry = { g: string; v: string };

function split(wire: string) {
  const sec = wire.indexOf('§');
  const pil = sec >= 0 ? wire.indexOf('¶', sec) : -1;
  if (sec < 0 || pil < 0) throw new Error('wire has no tape');
  return { contract: wire.slice(0, sec), tape: wire.slice(sec + 1, pil), body: wire.slice(pil + 1) };
}
/** entries: each first-appearing non-ascii char starts a rule running to the next new one. */
function entries(tape: string): Entry[] {
  const seen = new Set<string>(); const out: Entry[] = []; let cur: Entry | null = null;
  for (const ch of tape) {
    if (ch.codePointAt(0)! > 127 && !seen.has(ch)) { seen.add(ch); cur = { g: ch, v: '' }; out.push(cur); }
    else if (cur) cur.v += ch;
  }
  return out;
}
/** expand to a fixed point, nesting-aware: this is the decoder's own semantics. */
function expand(body: string, ents: Entry[]): string {
  const map = new Map(ents.map(e => [e.g, e.v]));
  let s = body;
  for (let i = 0; i < 64; i++) {
    let next = ''; let changed = false;
    for (const ch of s) { const r = map.get(ch); if (r !== undefined) { next += r; changed = true; } else next += ch; }
    s = next; if (!changed) break;
  }
  return s;
}
const sha = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 12);

/** every maximal repeated substring of `s` with length in [lo,hi] and >=2 occurrences */
function candidates(s: string, lo: number, hi: number, cap: number): string[] {
  const counts = new Map<string, number>();
  for (let L = lo; L <= hi; L++) {
    const m = new Map<string, number>();
    for (let i = 0; i + L <= s.length; i++) { const k = s.slice(i, i + L); m.set(k, (m.get(k) ?? 0) + 1); }
    for (const [k, c] of m) if (c >= 2) counts.set(k, c);
  }
  // keep only maximal: drop a candidate contained in another with the same-or-higher count
  // MEMORY. The first version scanned every kept candidate for containment, which is O(m^2) in
  // the number of repeated substrings, and the FACTOR pool (tape values + body) is large enough
  // that this process died with "Ineffective mark-compacts near heap limit" at 1.9 GB -- the
  // exact failure this repository already records for n-gram retention. Sorting by count first
  // and bounding the containment scan to the kept prefix makes it linear-in-practice.
  const all = [...counts.entries()].sort((a, b) => (b[1] - a[1]) || (b[0].length - a[0].length));
  const keep: [string, number][] = [];
  for (const [k, c] of all) {
    let sub = false;
    for (let i = 0; i < keep.length && i < 200; i++) { if (keep[i][1] >= c && keep[i][0].includes(k)) { sub = true; break; } }
    if (sub) continue;
    keep.push([k, c]);
    if (keep.length >= cap) break;
  }
  // rank by the source-priced estimate, so the top of the list is what X28 would have tried
  return keep.sort((a, b) => ((b[1] - 1) * (ct(b[0]) - 1) - 1) - ((a[1] - 1) * (ct(a[0]) - 1) - 1)).map(x => x[0]);
}

// GLYPH POOL, AND WHY ITS SIZE IS A MEASUREMENT PARAMETER.
// The first version of this probe carried 35 hand-picked free glyphs, and the receipt shows the
// consequence: `priced` sat at exactly 35 on lane after lane whose candidate lists ran 52, 127,
// 202, 243 long. The binding constraint was the POOL, not the material, so ADD and FACTOR were a
// screen over the top 35 candidates ranked by the source-priced estimate -- which is precisely
// the estimate under test, so ranking by it and then stopping at 35 begs the question.
// The pool is now generated over the Greek, Cyrillic and Glagolitic ranges the shipped tape
// already draws from, so a candidate's glyph is priced comparably to a real rule's glyph rather
// than against an arbitrary code point. 700-odd glyphs makes the census complete for every lane
// here (max candidate list 243), and the ranking cap no longer binds.
function buildFree(): string {
  const ranges: [number, number][] = [[0x0370, 0x052f], [0x2c00, 0x2c5f], [0xa640, 0xa69f], [0x1c80, 0x1c8f]];
  let out = '';
  for (const [a, b] of ranges) for (let cp = a; cp <= b; cp++) out += String.fromCodePoint(cp);
  return out;
}
const FREE = buildFree();

const files = process.argv.slice(2);
const receipt: any = { note: 'exact marginal economics of the shipped tape; zero frontier calls', lanes: [] };
const L: string[] = [];
L.push('lane'.padEnd(14) + 'msgTok  ents |' + ' REMOVE priced neg best'.padStart(15) + ' |' +
  ' ADD(body) cands priced neg best'.padStart(22) + ' |' +
  ' FACTOR(tape+body) cands priced neg best'.padStart(22) + ' | fidelity');
const AG = { n: 0, tp: 0, fp: 0, fn: 0, tn: 0, sumEst: 0, sumD: 0, maxOver: 0, maxUnder: 0 };
const ALL: any[] = [];
let totRemoveNeg = 0, totAddNeg = 0, totRemoveBest = 0, totAddBest = 0, totFacNeg = 0, totFacBest = 0, totFacPriced = 0;
for (const f of files) {
  const wire = fs.readFileSync(f, 'utf8');
  const name = f.split('/').pop()!.replace('.wire.txt', '');
  const { contract, tape, body } = split(wire);
  const ents = entries(tape);
  const base = ct(wire);
  const baseExp = expand(body, ents);

  // ---- REMOVE ----
  // THE TAPE IS A STRAIGHT-LINE PROGRAM, SO A GLYPH IS REFERENCED FROM OTHER ENTRIES' VALUES
  // AS WELL AS FROM THE BODY. The first version of this probe deleted the entry and inlined it
  // only into the body, which leaves every other value pointing at a glyph that no longer
  // exists; the expansion then stops short and the fidelity check fires. That is why the first
  // run reported 33/26/25/... FIDELITY FAIL: the moves were broken, not profitable. Removing an
  // entry must inline it everywhere -- body AND every surviving value -- and the tape must be
  // re-serialised from the entry list rather than string-spliced, because `tape.replace(g+v)`
  // finds the first occurrence of that substring, which is not necessarily the entry itself.
  const rem: { g: string; d: number; ok: boolean }[] = [];
  for (const e of ents) {
    const keep = ents.filter(x => x.g !== e.g).map(x => ({ g: x.g, v: x.v.split(e.g).join(e.v) }));
    const nTape = keep.map(x => x.g + x.v).join('');
    const nBody = body.split(e.g).join(e.v);
    const nWire = contract + '§' + nTape + '¶' + nBody;
    const ok = expand(nBody, keep) === baseExp;        // fidelity check on the move itself
    rem.push({ g: e.g, d: ct(nWire) - base, ok });
  }
  const remNeg = rem.filter(r => r.d < 0), remZero = rem.filter(r => r.d === 0);
  const remBest = rem.length ? Math.min(...rem.map(r => r.d)) : 0;
  const remBad = rem.filter(r => !r.ok);

  // ---- ADD ----
  const cands = candidates(body, 4, 64, Number(process.env.X94_ADDCAP ?? 400));
  const add: { s: string; d: number; ok: boolean; k: number; T: number; est: number }[] = [];
  let free = 0;
  for (const s of cands) {
    let g = '';
    while (free < FREE.length) { const c = FREE[free++]; if (!wire.includes(c) && !s.includes(c)) { g = c; break; } }
    if (!g) break;
    const k = body.split(s).length - 1;
    if (k < 2) continue;
    const nTape = tape + g + s;
    const nBody = body.split(s).join(g);
    const nEnts = entries(nTape);
    const nWire = contract + '§' + nTape + '¶' + nBody;
    const ok = expand(nBody, nEnts) === baseExp;
    // THE ESTIMATE, RECORDED ALONGSIDE THE MEASUREMENT. docs/codecs.md prices a T-token phrase
    // occurring k times at (k-1)(T-1)-1, and every arm in this stack screens with that formula.
    // Storing both numbers per move is what turns this probe from "is there profit left?" into
    // "how wrong is the screen we have been using for sixty turns?" -- a false positive here is a
    // rule an arm would have admitted and the tokenizer would have refused.
    const T = ct(s);
    const d = ct(nWire) - base;
    add.push({ s, d, ok, k, T, est: (k - 1) * (T - 1) - 1 });
  }
  // ---- FACTOR: the move the first version of this probe did not have ----
  // A rule may be referenced from another entry's VALUE as well as from the body, so the pool of
  // factorable material is the tape values TOGETHER with the body residue -- not the body alone.
  // `syntomos` records "tape-side factoring found zero profitable shared substrings", but that
  // was priced with an estimate. This prices it with countTokensExact on the complete message,
  // and it inlines into every value as well as the body, which is the bug the REMOVE move taught.
  const pool = ents.map(e => e.v).join('\u0000') + '\u0001' + body;
  const fcands = candidates(pool, 6, 48, Number(process.env.X94_FACCAP ?? 200));
  const fac: { s: string; d: number; ok: boolean; k: number; T: number; est: number }[] = [];
  let ffree = 0, skippedNonAscii = 0;
  // FIDELITY, SECOND ATTEMPT. The first FACTOR run reported 117 of 320 moves failing the
  // expansion check. Cause: a candidate drawn from the joined pool can itself CONTAIN a rule
  // glyph, because an entry's value may reference other entries. Substituting such a span does
  // not abbreviate the program, it rewrites it -- a glyph reference vanishes from inside a value
  // and the expansion comes out short. Same bug class as the first REMOVE attempt. A factorable
  // span must be pure literal material: no existing glyph, no tape marker, and no pool separator
  // (a span crossing a separator does not occur contiguously anywhere in the message).
  const GLYPHS = new Set<string>(ents.map(e => e.g));
  GLYPHS.add('§'); GLYPHS.add('¶');
  for (const raw of fcands) {
    if (/[\u0000\u0001]/.test(raw)) continue;
    const s0 = raw;
    if (s0.length < 4) continue;
    let impure = false;
    for (const ch of s0) { if (ch.codePointAt(0)! > 127 || GLYPHS.has(ch)) { impure = true; break; } }
    if (impure) { skippedNonAscii++; continue; }
    const keep0 = ents.map(x => ({ g: x.g, v: x.v }));
    const kBody = body.split(s0).length - 1;
    const kVals = keep0.reduce((a, x) => a + x.v.split(s0).length - 1, 0);
    if (kBody + kVals < 2) continue;
    let g = '';
    while (ffree < FREE.length) { const c = FREE[ffree++]; if (!wire.includes(c) && !s0.includes(c)) { g = c; break; } }
    if (!g) break;
    const keep = keep0.map(x => ({ g: x.g, v: x.v.split(s0).join(g) }));
    // THE TAPE IS POSITIONAL, AND THIS IS A PROPERTY OF THE FORMAT RATHER THAN A BUG IN THE MOVE.
    // `entries()` defines a glyph at its FIRST appearance in the tape, so a reference to a rule
    // that is defined later is not a reference at all -- the parser reads it as the start of a
    // new entry and swallows the rest of that value as the new rule's definition. A FACTOR move
    // inserts references into values that sit earlier in the tape than the end, so the new entry
    // must be PREPENDED, not appended. (ADD only substitutes in the body, which follows the whole
    // tape, so appending is legal there -- which is why ADD never failed a fidelity check.)
    // Likewise the span must be pure ASCII: any char > 127 that is not an existing glyph would
    // itself be read as the start of an entry, so non-ASCII literal material is out of scope for
    // this probe. That is a stated limitation, not a silent one.
    const nTape = g + s0 + keep.map(x => x.g + x.v).join('');
    const nBody = body.split(s0).join(g);
    const nEnts = entries(nTape);
    const nWire = contract + '§' + nTape + '¶' + nBody;
    const ok = expand(nBody, nEnts) === baseExp;
    const T = ct(s0); const kk = kBody + kVals;
    fac.push({ s: s0, d: ct(nWire) - base, ok, k: kk, T, est: (kk - 1) * (T - 1) - 1 });
  }
  const facNeg = fac.filter(a => a.d < 0), facBad = fac.filter(a => !a.ok);
  const facBest = fac.length ? Math.min(...fac.map(a => a.d)) : 0;

  const addNeg = add.filter(a => a.d < 0), addBad = add.filter(a => !a.ok);
  const addBest = add.length ? Math.min(...add.map(a => a.d)) : 0;

  for (const m of [...add, ...fac]) {
    AG.n++; AG.sumEst += m.est; AG.sumD -= m.d;               // d is a cost delta, so profit = -d
    AG.maxOver = Math.max(AG.maxOver, m.est + m.d);
    AG.maxUnder = Math.max(AG.maxUnder, -(m.est + m.d));
    ALL.push({ lane: name, s: m.s.length > 48 ? m.s.slice(0, 48) + '…' : m.s, k: m.k, T: m.T, est: m.est, profit: -m.d });
    if (m.est > 0 && -m.d > 0) AG.tp++;
    else if (m.est > 0 && -m.d <= 0) AG.fp++;                 // screen says profit, tokenizer says no
    else if (m.est <= 0 && -m.d > 0) AG.fn++;                 // screen says no, tokenizer says profit
    else AG.tn++;
  }
  totRemoveNeg += remNeg.length; totAddNeg += addNeg.length; totFacNeg += facNeg.length; totFacPriced += fac.length;
  totRemoveBest += Math.min(0, remBest); totAddBest += Math.min(0, addBest); totFacBest += Math.min(0, facBest);
  receipt.lanes.push({ lane: name, path: f, msgTokens: base, entries: ents.length,
    remove: { neg: remNeg.length, zero: remZero.length, pos: rem.length - remNeg.length - remZero.length,
              best: remBest, fidelityFailures: remBad.length,
              winners: remNeg.sort((a, b) => a.d - b.d).slice(0, 8).map(r => ({ g: r.g, d: r.d })) },
    factor: { candidates: fcands.length, skippedNonAscii, priced: fac.length, neg: facNeg.length, best: facBest,
              fidelityFailures: facBad.length,
              failures: facBad.slice(0, 5).map(a => ({ s: a.s, k: a.k, d: a.d })),
              winners: facNeg.sort((a, b) => a.d - b.d).slice(0, 8).map(a => ({ s: a.s, k: a.k, d: a.d })) },
    topOverstatements: [...add, ...fac].map(m => ({ s: m.s.slice(0, 40), k: m.k, T: m.T, est: m.est, measured: -m.d, over: m.est + m.d }))
      .sort((a, b) => b.over - a.over).slice(0, 6),
    add: { candidates: cands.length, priced: add.length, neg: addNeg.length, best: addBest,
           fidelityFailures: addBad.length,
           winners: addNeg.sort((a, b) => a.d - b.d).slice(0, 8).map(a => ({ s: a.s, k: a.k, d: a.d })) } });
  L.push(name.padEnd(14) + String(base).padStart(6) + String(ents.length).padStart(6) + ' |' +
    String(rem.length).padStart(5) + String(remNeg.length).padStart(4) + String(remBest).padStart(6) + ' |' +
    String(cands.length).padStart(6) + String(add.length).padStart(6) + String(addNeg.length).padStart(4) + String(addBest).padStart(6) + ' |' +
    String(fcands.length).padStart(6) + String(fac.length).padStart(6) + String(facNeg.length).padStart(4) + String(facBest).padStart(6) + ' | ' +
    (remBad.length + addBad.length + facBad.length === 0 ? 'exact'
      : `FAIL rm=${remBad.length} add=${addBad.length} fac=${facBad.length}`));
  fs.writeFileSync('bench/x94/receipts/tape-marginal.json', JSON.stringify(receipt, null, 1) + '\n');
  console.log(L[L.length - 1]);
}
L.push('-'.repeat(96));
L.push(`TOTALS: REMOVE d<0: ${totRemoveNeg}/600   ADD(body) d<0: ${totAddNeg}   FACTOR(tape+body) d<0: ${totFacNeg}/${totFacPriced}`);
L.push(`sum of best-per-lane d (a LOWER BOUND on one greedy pass, not additive across lanes): remove ${totRemoveBest}  add ${totAddBest}  factor ${totFacBest}`);
L.push('');
L.push(`ESTIMATE vs OBJECTIVE over ${AG.n} priced ADD+FACTOR moves  [est = (k-1)(T-1)-1, profit = -d]`);
L.push(`  screen says profitable AND tokenizer agrees      : ${AG.tp}`);
L.push(`  screen says profitable, tokenizer REFUSES  (false positive): ${AG.fp}`);
L.push(`  screen says no, tokenizer finds profit     (false negative): ${AG.fn}`);
L.push(`  both say no                                       : ${AG.tn}`);
L.push(`  mean est ${(AG.sumEst / Math.max(1, AG.n)).toFixed(2)} tok   mean measured profit ${(AG.sumD / Math.max(1, AG.n)).toFixed(2)} tok`);
L.push(`  largest overstatement ${AG.maxOver} tok   largest understatement ${AG.maxUnder} tok`);
receipt.agreement = AG;
receipt.agreement = AG;
receipt.moves = ALL;
fs.writeFileSync('bench/x94/receipts/tape-marginal.json', JSON.stringify(receipt, null, 1) + '\n');
const log = L.join('\n') + '\n';
fs.writeFileSync('bench/x94/receipts/tape-marginal.log', log);
console.log(log);
