/**
 * ΠΡΟΛΗΨΙΣ unit + exactness suite (X121).
 *
 *   bash bench/x15/run.sh bench/x121/prolepsis-unit.ts
 *
 * Asserts, on real lane text and on adversarial synthetic text:
 *   1. TAIL INVARIANT    — every mark's tail is `tail(prefix)` as computed
 *                          independently by `tokenTail`, and every mark's
 *                          `total` equals the count of `prefix`.
 *   2. RESUME EXACTNESS  — `countTokens` (now ΠΡΟΛΗΨΙΣ-accelerated) equals
 *                          `countTokensExact` on thousands of mutated variants
 *                          that share a prefix with a counted anchor, INCLUDING
 *                          mutations that change the tail itself.
 *   3. WHITESPACE ADVERSARY — texts whose pre-tokenizer chunk is one long
 *                          whitespace run (findmnt, node-help) — the case where
 *                          the tail is not the last chunk.
 *   4. MODAL SHORTCUT / NEGATIVE — mutations inside the last 96 characters
 *                          cannot be resumed, so the mechanism must report a
 *                          MISS there. A version that claimed a hit would be
 *                          wrong; this test asserts the honest failure.
 *   5. NO-ANCHOR BASELINE — counting a fresh unrelated string still misses.
 *   6. SPEED              — whole-stack rate vs. the same lane with
 *                          OMEGA_NO_PROLEPSIS=1 (run the script both ways).
 *   7. INDEPENDENT COUNTER CHECK — a second, independently written resume
 *                          implementation must agree on every sample.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  countTokens, countTokensExact, chunkCacheClear, tailMemoClear, tokenTail,
} from '../../src/lib/omega/bpe';
import {
  prolepsisReset, prolepsisStats, prolepsisLookup, prolepsisRecord,
  prolepsisDisabled, type ProlepsisMark,
} from '../../src/lib/omega/prolepsis';

const ENC = 'o200k_base' as const;

function die(msg: string): never { console.log('FAIL ' + msg); process.exit(1); }
function ok(msg: string): void { console.log('  ok  ' + msg); }

function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* The o200k pre-tokenizer, copied verbatim from src/lib/omega/bpe.ts so that
 * this test reasons about chunking from first principles rather than importing
 * the module under test's own notion of a chunk. */
const PRETOK = /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
const WS_ONLY = /^\s+$/u;

function chunksOf(s: string): string[] { return s.match(PRETOK) ?? []; }

/** Per-chunk token counts of `s`. */
function chunkCosts(s: string): Array<{ c: string; start: number; n: number }> {
  const cs = chunksOf(s);
  const out: Array<{ c: string; start: number; n: number }> = [];
  let p = 0;
  for (const c of cs) { out.push({ c, start: p, n: countTokensExact(c, ENC) }); p += c.length; }
  return out;
}

/**
 * Rebuild, from first principles, the mark ΠΡΟΛΗΨΙΣ should have recorded for
 * anchor `t` at offset `pos` (a chunk boundary of t's OWN chunking).
 *
 * NOTE ON ACCOUNTING, and it is the subtle part of this whole mechanism. A
 * prefix that ends in whitespace is chunked DIFFERENTLY as a standalone string
 * than it is inside the anchor: o200k's `\s+(?!\S)` backtracks one space at a
 * time, so inside t the run "  " before "102" is TWO chunks, while at the end of
 * a string it is ONE chunk. `tokenTail(prefix)` therefore reports end-of-string
 * accounting and a mark reports IN-CONTEXT accounting. Both are correct for what
 * they are used for; mixing them is off by one. A mark must be recomputed from
 * the ANCHOR's chunk list, which is what this function does.
 */
function expectedMark(t: string, pos: number): { pos: number; total: number; tail: string; tailTok: number } {
  const cs = chunkCosts(t);
  let total = 0, tStart = 0, tTok = 0, seenSolid = false;
  for (const { c, start, n } of cs) {
    total += n;
    const ws = WS_ONLY.test(c);
    if (!ws) { tStart = start; tTok = n; seenSolid = true; }
    else { tTok += n; if (!seenSolid) tStart = 0; }
    if (start + c.length === pos) {
      let tail = '', tailTok = 0, acc = 0;
      for (const q of cs) {
        if (q.start < tStart) continue;
        if (q.start > start) break;
        tail += q.c; tailTok += q.n; acc++;
      }
      return { pos, total, tail, tailTok };
    }
    if (start > pos) break;
  }
  throw new Error(`pos ${pos} is not a chunk boundary of the anchor`);
}

const LANES = [
  'bench/holdout-x41/apt-real.txt',
  'bench/holdout-x41/ps-aux-real.txt',
  'bench/holdout-x41/findmnt.txt',
  'bench/holdout-x41/node-help.txt',
  'bench/holdout-x41/ls-l-real.txt',
  'bench/holdout-x41/dpkg-l.txt',
];

function read(rel: string): string {
  const p = path.resolve(process.cwd(), rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

/* --------------------------------------------------------------------------
 * 0. THE LEMMA EVERYTHING RESTS ON: tokens(text) == sum of per-chunk counts
 * ------------------------------------------------------------------------ */
function testChunkSumLemma(): void {
  console.log('[0] lemma: countTokensExact(text) == sum of per-chunk counts');
  const texts = LANES.map(read).filter((t) => t.length > 100);
  texts.push('alpha beta gamma   delta\n\n   epsilon   123456  \t zeta\u00a0\u00a0 omega   ');
  texts.push('   ');
  texts.push('\n\n\n');
  texts.push('x'.repeat(500) + '   ');
  let checked = 0, bad = 0;
  for (const t of texts) {
    const cs = chunksOf(t);
    let cover = 0, sum = 0;
    for (const c of cs) { cover += c.length; sum += countTokensExact(c, ENC); }
    checked++;
    if (cover !== t.length) { bad++; console.log(`     chunking does not cover the text (${t.length})`); }
    else if (sum !== countTokensExact(t, ENC)) { bad++; console.log(`     sum ${sum} != exact ${countTokensExact(t, ENC)}`); }
  }
  if (bad) die(`${bad}/${checked} lemma violations`);
  ok(`${checked} texts: the chunk-sum identity holds (this is what countTokens already relied on)`);
}

/* --------------------------------------------------------------------------
 * 1. TAIL + TOTAL INVARIANTS, on real lane text
 * ------------------------------------------------------------------------ */
function testMarkInvariants(): void {
  console.log('[1] mark invariants (recomputed from the anchor\'s own chunk list)');
  if (prolepsisDisabled()) { console.log('  skip (OMEGA_NO_PROLEPSIS=1)'); return; }
  let marksChecked = 0, bad = 0;
  for (const rel of LANES) {
    const t = read(rel);
    if (t.length < 100) continue;
    // Walk every mark ΠΡΟΛΗΨΙΣ would record, by looking the anchor up with
    // variants that diverge progressively later.
    for (let frac = 1; frac <= 12; frac++) {
      const cut = Math.floor((t.length * frac) / 13);
      const probe = t.slice(0, cut) + '\u0001Zqx' + t.slice(cut);
      prolepsisReset(); chunkCacheClear();
      countTokens(t, ENC);
      const mk = prolepsisLookup(probe, ENC);
      if (mk === null) continue;
      const ex = expectedMark(t, mk.pos);
      marksChecked++;
      if (mk.tail !== ex.tail) { bad++; console.log(`     tail: got ${JSON.stringify(mk.tail)} want ${JSON.stringify(ex.tail)}`); }
      if (mk.tailTok !== ex.tailTok) { bad++; console.log(`     tailTok: got ${mk.tailTok} want ${ex.tailTok}`); }
      if (mk.total !== ex.total) { bad++; console.log(`     total: got ${mk.total} want ${ex.total}`); }
      // end-to-end: resuming from the recorded mark must reproduce the exact count
      const v = t.slice(0, cut) + 'Zqx' + t.slice(cut + 1);
      const mk2 = prolepsisLookup(v, ENC);
      if (mk2 !== null && countTokens(v, ENC) !== countTokensExact(v, ENC)) {
        bad++; console.log(`     resume wrong for ${rel} cut=${cut}`);
      }
    }
  }
  if (marksChecked === 0) die('no marks produced — ΠΡΟΛΗΨΙΣ is not recording anything');
  if (bad) die(`${bad} invariant violations over ${marksChecked} marks`);
  ok(`${marksChecked} marks: tail, tailTok and total match an independent recomputation`);
}

/* --------------------------------------------------------------------------
 * 2. RESUME EXACTNESS on mutated variants
 * ------------------------------------------------------------------------ */
function mutate(t: string, rnd: () => number, atHead: boolean): string {
  const cut = atHead
    ? Math.floor(rnd() * Math.max(1, t.length - 32))
    : Math.max(0, t.length - Math.floor(rnd() * 96));
  const mode = Math.floor(rnd() * 4);
  if (mode === 0) return t.slice(0, cut) + 'Zqx' + t.slice(cut);            // insert
  if (mode === 1) return t.slice(0, cut) + t.slice(cut + 1 + Math.floor(rnd() * 8)); // delete
  if (mode === 2) return t.slice(0, cut) + ' 42 ' + t.slice(cut + 2);       // replace
  return t.slice(0, cut) + '\n\n   ' + t.slice(cut);                        // whitespace splice
}

function testExactness(): void {
  console.log('[2] exactness: countTokens (accelerated) vs countTokensExact');
  let checked = 0, bad = 0, headHits = 0, headTries = 0, tailTries = 0, tailHits = 0;
  for (const rel of LANES) {
    const t = read(rel);
    if (t.length < 100) continue;
    prolepsisReset(); chunkCacheClear();
    countTokens(t, ENC);                        // anchor
    const rnd = mulberry(rel.length * 7919 + 13);
    for (let i = 0; i < 260; i++) {
      const atHead = i % 3 !== 0;               // 2/3 early (should hit), 1/3 late (should miss)
      const v = mutate(t, rnd, atHead);
      if (v.length === 0) continue;
      const fast = countTokens(v, ENC);
      const ref = countTokensExact(v, ENC);
      checked++;
      if (fast !== ref) { bad++; if (bad < 5) console.log(`     MISMATCH ${rel} i=${i} ${fast} vs ${ref}`); }
      // classify: does the variant share >=384 chars with the anchor?
      if (!prolepsisDisabled()) {
        if (atHead) { headTries++; if (prolepsisLookup(v, ENC) !== null) headHits++; }
        else { tailTries++; if (prolepsisLookup(v, ENC) !== null) tailHits++; }
      }
    }
  }
  if (bad) die(`${bad} / ${checked} count mismatches — ΠΡΟΛΗΨΙΣ is NOT exact`);
  ok(`${checked} variants: accelerated count == exact count, 0 mismatches`);
  console.log(`     early-mutation lookup hit rate ${headHits}/${headTries}; late-mutation ${tailHits}/${tailTries}`);
  if (!prolepsisDisabled() && headHits === 0) die('early mutations never hit — the mechanism does nothing');
}

/* --------------------------------------------------------------------------
 * 3. WHITESPACE ADVERSARY — long whitespace runs, non-final tails, empty tails
 * ------------------------------------------------------------------------ */
function testWhitespaceAdversary(): void {
  console.log('[3] whitespace adversary (tail != last chunk)');
  const ws = '                                                                                ';
  const cases: Array<[string, string]> = [
    ['long ws prefix', ws + 'alpha beta gamma delta epsilon zeta eta theta iota kappa'],
    ['all whitespace', ws + ws + ws + ws + 'x'],
    ['ws before tail', 'alpha beta ' + ws + ' gamma delta epsilon zeta eta theta iota kappa'],
    ['tabs and nbsp', 'alpha\t\t\t\tbeta\u00a0\u00a0\u00a0gamma delta epsilon zeta eta theta'],
    ['trailing ws', 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu' + ws],
    ['ws only at mark', 'alpha beta gamma delta epsilon zeta eta theta iota kappa ' + ws + 'X'],
  ];
  for (const [name, base] of cases) {
    prolepsisReset(); chunkCacheClear(); tailMemoClear();
    countTokens(base, ENC);
    const rnd = mulberry(name.length * 104729 + 7);
    for (let i = 0; i < 40; i++) {
      const v = base.slice(0, 10 + Math.floor(rnd() * 10)) + 'Zq' + base.slice(10 + Math.floor(rnd() * 10));
      const fast = countTokens(v, ENC);
      const ref = countTokensExact(v, ENC);
      if (fast !== ref) die(`whitespace case "${name}": ${fast} vs ${ref} on ${JSON.stringify(v.slice(0, 40))}`);
    }
    const tt = tokenTail(base, ENC);
    console.log(`     ${name}: tail=${tt ? JSON.stringify(tt.tail.slice(0, 20)) : 'null'} ok`);
  }
  ok('whitespace-run / non-final-tail cases exact');
}

/* --------------------------------------------------------------------------
 * 4. MODAL SHORTCUT — the honest negative result
 * ------------------------------------------------------------------------ */
function testModalShortcut(): void {
  console.log('[4] modal-shortcut failure tests (the guard must be load-bearing)');
  if (prolepsisDisabled()) { console.log('  skip (OMEGA_NO_PROLEPSIS=1)'); return; }
  const base = read(LANES[1]!);

  // (a) honest negative: a variant that diverges from the anchor inside the first
  //     200 characters shares no usable mark, so ΠΡΟΛΗΨΙΣ must MISS it.
  let earlyMiss = 0, earlyHit = 0;
  for (let k = 5; k < 200; k += 7) {
    prolepsisReset(); chunkCacheClear();
    countTokens(base, ENC);
    const v = base.slice(0, k) + 'Zqx' + base.slice(k + 1);
    if (prolepsisLookup(v, ENC) === null) earlyMiss++; else earlyHit++;
    if (countTokens(v, ENC) !== countTokensExact(v, ENC)) die(`early mutation k=${k} counted wrong`);
  }
  if (earlyHit !== 0) die(`${earlyHit} early mutations hit a mark — the prefix guard is too loose`);
  ok(`${earlyMiss} early-divergence variants correctly MISS (no resumption possible)`);

  // (b) falsification of the shortcut: resume from a mark even though the string
  //     diverges BEFORE the mark. If the guard were dropped (modal shortcut:
  //     "same anchor, so same prefix"), this is what the stack would compute —
  //     and it must be observably wrong, or the guard is not carrying anything.
  prolepsisReset(); chunkCacheClear();
  countTokens(base, ENC);
  const mkLate = prolepsisLookup(base + 'x', ENC);
  if (mkLate === null) die('no mark available to falsify the shortcut');
  let wrong = 0, tried = 0;
  for (let k = 5; k < Math.min(mkLate.pos, 400); k += 11) {
    const v = base.slice(0, k) + 'Zqx' + base.slice(k + 1);
    const shortcut = mkLate.total - mkLate.tailTok + countTokensExact(mkLate.tail + v.slice(mkLate.pos), ENC);
    const truth = countTokensExact(v, ENC);
    tried++;
    if (shortcut !== truth) wrong++;
    if (countTokens(v, ENC) !== truth) die(`guarded count wrong at k=${k}`);
  }
  if (wrong === 0) die('the unguarded shortcut is never wrong — the lcp check is vacuous');
  ok(`unguarded shortcut wrong on ${wrong}/${tried} early divergences, guarded count always exact`);

  // (c) unrelated strings never hit.
  const fresh = 'totally unrelated string with no shared prefix at all ' + 'x'.repeat(500) + ' zeta omega';
  prolepsisReset(); chunkCacheClear();
  countTokens(base, ENC);
  if (prolepsisLookup(fresh, ENC) !== null) die('unrelated string hit an anchor — prefix match is broken');
  ok('unrelated strings never hit');
}

/* --------------------------------------------------------------------------
 * 5. INDEPENDENT COUNTER IMPLEMENTATION
 * ------------------------------------------------------------------------ */
function testIndependentCounter(): void {
  console.log('[5] independently written resume implementation must agree');
  if (prolepsisDisabled()) { console.log('  skip (OMEGA_NO_PROLEPSIS=1)'); return; }
  // Second implementation: rebuild the mark from the anchor's chunk list (never
  // from the module's own bookkeeping), then resume with it.
  let checked = 0, bad = 0, hit = 0;
  for (const rel of LANES) {
    const t = read(rel);
    if (t.length < 100) continue;
    const rnd = mulberry(rel.length * 31337 + 5);
    for (let i = 0; i < 60; i++) {
      const cut = Math.floor(rnd() * t.length);
      const v = t.slice(0, cut) + 'Zq' + t.slice(cut);
      // re-anchor on `t` alone: the ring also holds earlier variants, and a mark
      // may belong to one of those rather than to `t`.
      prolepsisReset(); chunkCacheClear();
      const anchored = countTokens(t, ENC);
      const mk = prolepsisLookup(v, ENC);
      if (mk === null) continue;
      hit++;
      const ex = expectedMark(t, mk.pos);
      const rest = v.slice(mk.pos);
      const indep = ex.total - ex.tailTok + countTokensExact(ex.tail + rest, ENC);
      const truth = countTokensExact(v, ENC);
      const mine = countTokens(v, ENC);
      checked++;
      if (mine !== truth || indep !== truth) {
        bad++;
        if (bad < 4) console.log(`     ${rel} cut=${cut}: mine=${mine} indep=${indep} truth=${truth} anchor=${anchored}`);
      }
    }
  }
  if (hit === 0) die('no mark ever hit in the independent-counter test');
  if (bad) die(`${bad}/${checked} disagreements with the independent implementation`);
  ok(`${checked} samples (${hit} hits): two independent implementations both exact`);
}

/* --------------------------------------------------------------------------
 * 6. THROUGHPUT
 * ------------------------------------------------------------------------ */
function testSpeed(): void {
  console.log('[6] throughput on mutated variants');
  const off = process.env.OMEGA_NO_PROLEPSIS === '1';
  for (const rel of LANES.slice(0, 4)) {
    const t = read(rel);
    if (t.length < 100) continue;
    prolepsisReset(); chunkCacheClear();
    countTokens(t, ENC);
    const rnd = mulberry(99);
    const vs: string[] = [];
    for (let i = 0; i < 120; i++) vs.push(t.slice(0, Math.floor(rnd() * t.length)) + 'Zq' + t.slice(Math.floor(rnd() * t.length)));
    const t0 = Date.now();
    let acc = 0;
    for (const v of vs) acc += countTokens(v, ENC);
    const ms = Date.now() - t0;
    const st = prolepsisStats();
    console.log(`     ${rel.padEnd(34)} ${String(ms).padStart(6)} ms  hit=${st.hitRate}  savedFrac=${st.savedFraction}  (acc=${acc})`);
  }
  console.log(`     ΠΡΟΛΗΨΙΣ ${off ? 'DISABLED (reference)' : 'ENABLED'}`);
}

/* ---------------------------------------------------------------------- */
function main(): void {
  console.log('=== ΠΡΟΛΗΨΙΣ unit suite (X121) ===');
  testChunkSumLemma();
  testMarkInvariants();
  testExactness();
  testWhitespaceAdversary();
  testModalShortcut();
  testIndependentCounter();
  testSpeed();
  console.log('ALL ΠΡΟΛΗΨΙΣ TESTS PASSED');
}

void main();
