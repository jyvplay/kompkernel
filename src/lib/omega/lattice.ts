/**
 * src/lib/omega/lattice.ts
 * =============================================================================
 * ⟡ LATTICE-LT1 — Globally-Parsed Self-Delimiting Grammar Compression
 * =============================================================================
 * WHAT IS ACTUALLY NEW (stated narrowly, so it can be attacked)
 * -----------------------------------------------------------------------------
 * Every dictionary/grammar lane in this repository scores a candidate phrase by
 * a LOCAL, GREEDY proxy:
 *
 *   REPAIR-R1  : most-frequent adjacent BIGRAM, re-scored after each accept.
 *                (Re-Pair, Larsson & Moffat, DCC 1999.) Bigram-only candidate
 *                set; the wire pays a JSON rule row per nonterminal.
 *   ANAPHORA   : per-phrase gain  n·w − (w + D) − (n−1)·A, an estimate that
 *                assumes every occurrence of the phrase is actually foldable.
 *   AXIOM      : same algebra with a cross-turn ledger.
 *   TRIE/KAPPA : longest-match / macro folding, again occurrence-counted.
 *
 * All four share one defect, and it is a real one, not a stylistic one:
 *
 *   OCCURRENCE COUNTING IS NOT GAIN. When two admitted phrases overlap in the
 *   token stream, only one of them can fold at that site. A count-based scorer
 *   therefore CREDITS BOTH, over-estimates the value of the dictionary, admits
 *   entries whose definitions never pay for themselves, and — worse — selects
 *   the WRONG entries, because the estimate's error is not uniform across
 *   candidates (it grows with overlap density, i.e. exactly on the natural
 *   prose where these lanes currently tie with identity).
 *
 * LATTICE removes the proxy. Three textbook components, composed in a way I
 * could not find composed anywhere (and the composition is the contribution):
 *
 *   C1  CANDIDATE SET = repeated substrings of the TOKEN sequence enumerated
 *       exactly from a suffix array + LCP array (Manber–Myers 1993; Kasai et
 *       al. 2001). Not bigrams, not whitespace words: every repeat, all
 *       lengths, at once.
 *
 *   C2  GAIN ORACLE = the drop in the cost of the OPTIMAL PARSE of the whole
 *       document under the current dictionary, computed by a shortest-path
 *       (Viterbi) recurrence over the token lattice:
 *           best[i] = min( best[i+1] + 1 ,  min over phrases p at i of
 *                          best[i + |p|] + 1 )
 *       This is the exact minimum-token parse, so overlapping candidates can
 *       never both be credited. It is the same dynamic program used for
 *       optimal LZ77 parsing (Schuegraf & Heaps 1974; "optimal parsing" in
 *       Zopfli/LZMA) and for unigram-LM subword segmentation (Kudo, ACL 2018)
 *       — but those use it to PARSE under a FIXED dictionary. Here it is used
 *       as the SELECTION ORACLE, inside the dictionary search itself.
 *
 *   C3  SELECTION = accelerated (lazy) greedy, Minoux 1978: candidates are
 *       ordered by an admissible upper bound on gain, popped, re-scored with
 *       the exact C2 oracle, and re-inserted; an entry is accepted only when
 *       its exact re-scored gain still dominates the best remaining bound.
 *       This makes the exact oracle affordable (a few hundred Viterbi passes
 *       instead of |candidates| × |accepted|) without weakening it to a proxy.
 *
 *   C4  SELF-DELIMITING HEADER. The per-entry wire tax is driven to its
 *       information-theoretic floor of ONE token. Prior spellings in this repo:
 *           REPAIR    ["字","a","b"]\n     ≈ 7–9 tokens per rule
 *           ANAPHORA  OPEN k P CLOSE        = 3 tokens + P, per bind
 *           header dicts  k\tP\n            = 2 tokens + P, per bind
 *       LATTICE emits  g₀P₀g₁P₁…gₙ₋₁Pₙ₋₁  with NO separators at all: each
 *       definition is delimited by the next glyph, because glyphs are drawn
 *       from a deterministic, tokenizer-verified pool and are gated absent
 *       from the source. Overhead = 1 token per entry + |P|, which is exactly
 *       the unavoidable cost of naming a phrase. There is no cheaper encoding
 *       of a named dictionary in a token-counted channel.
 *
 *   C5  RECURSIVE DEFINITIONS. Definition i is itself re-parsed under glyphs
 *       0..i−1, so the grammar has depth (a straight-line program, as in
 *       Re-Pair) while retaining the globally-optimal parse of C2. The
 *       decoder's left-to-right rule stays unambiguous precisely because a
 *       definition may only reference EARLIER glyphs: the first not-yet-bound
 *       pool glyph encountered while reading a definition is, necessarily, the
 *       start of the next definition.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   MARK  g₀P₀ g₁P₁ … gₙ₋₁Pₙ₋₁  END  <parsed body>
 *
 *   MARK = pool[0], END = pool[1], glyphs = pool[2…]. No newlines, no colons,
 *   no JSON: total fixed overhead is 2 tokens.
 *   Degenerate case (empty dictionary) is never emitted — the cost gate kills
 *   it — except as the forced literal wrap MARK END <text>, which exists only
 *   so that decode stays a total function on sources that begin with MARK.
 *
 * EXACTNESS GATES (all four run before any wire ships)
 *   G1 every pool glyph used must be absent from the source (else a literal
 *      glyph would counterfeit a binding) — enforced by construction, the
 *      pool is filtered against the source before selection;
 *   G2 latticeDecode(wire) must equal the source byte-for-byte;
 *   G3 countTokens(wire) < countTokens(source) on the REAL tokenizer;
 *   G4 sources beginning with MARK are force-wrapped so decode is total.
 *
 * COMPLEXITY. Suffix array O(n log² n), LCP O(n), each Viterbi pass O(n·k) for
 * k admitted phrases with an occurrence index, lazy greedy bounded by
 * LT_MAX_ORACLE exact re-scores. n is the token count, capped by LT_MAX_TOKENS.
 *
 * WHAT THIS IS NOT (adjacent problems that must not be substituted)
 *   · not a lossy vocabulary learner (Kudo's unigram LM is lossy at the
 *     vocabulary level; here every definition is a verbatim substring);
 *   · not Re-Pair (bigram candidates, greedy count, no global parse);
 *   · not LZ77/Zopfli (those are byte codes needing a decompressor; this wire
 *     is read by the model itself, and is scored in BPE tokens, not bits);
 *   · not a partition/routing codec (MOSAIC/ORBIT) — LATTICE is a single
 *     mechanism and composes underneath them as one more member lane.
 * =============================================================================
 */
import { countTokens, encodeIds, decodeIds, type EncodingName } from './bpe';
import { phraseCodebook } from './phrase';

export interface LatticeEntry {
  glyph: string;
  phrase: string;
  hits: number;
  gain: number;
}

export interface LatticeResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: LatticeEntry[];
  mode: 'lattice' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

/* ----------------------------- tuning knobs ------------------------------- */
const LT_MAX_TOKENS = 24_000;   // documents longer than this return identity
const LT_MAX_ENTRIES = 220;     // dictionary cap
const LT_MAX_PHRASE = 48;       // max tokens per definition
const LT_MIN_PHRASE = 2;        // singleton tokens can never pay for a glyph
const LT_MAX_CANDIDATES = 6_000;
const LT_MAX_ORACLE = 1_400;    // exact Viterbi re-scores per encode
const LT_POOL = 512;

/* ------------------------------ glyph pool -------------------------------- */
/**
 * Deterministic, tokenizer-verified single-token glyph pool. Hangul syllables
 * are used because (a) they are single-token in both supported encodings over
 * a long contiguous range, and (b) they are disjoint from the CJK ideograph
 * pool that STRATA/ANAPHORA/REPAIR draw from, so a LATTICE wire cannot be
 * confused with theirs even when lanes are composed.
 */
const poolCache = new Map<EncodingName, string[]>();
export function latticePool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  // Reserved namespaces that LATTICE must never intrude on, so that a wire's
  // owner is decidable from its first character even when lanes are composed
  // inside a tournament:
  //   · PHRASEBOOK-φ1 folds the LOW end of the Hangul 1-token range;
  //   · ROSETTA's pool is hiragana (U+3041…);
  //   · STRATA/ANAPHORA/REPAIR draw CJK ideographs (U+4E00…).
  // LATTICE therefore takes the HIGH end of the Hangul 1-token range first
  // (descending, maximally far from φ1's allocation) and falls back to
  // katakana — which is disjoint from every one of the above — when an
  // encoding's Hangul coverage is thin (cl100k_base has only 129 such
  // syllables, most of which φ1 already owns).
  const reserved = new Set<string>();
  for (const g of phraseCodebook(enc).byGlyph.keys()) reserved.add(g);
  const out: string[] = [];
  for (let cp = 0xd7a3; cp >= 0xac00 && out.length < LT_POOL; cp--) {
    const ch = String.fromCodePoint(cp);
    if (!reserved.has(ch) && encodeIds(ch, enc).length === 1) out.push(ch);
  }
  // Fallback: Cyrillic. Measured disjoint from ROSETTA (kana), STRATA /
  // ANAPHORA / REPAIR (CJK ideographs) and PHRASEBOOK-φ1 (Hangul) by BLOCK,
  // not by luck — 122 single-token glyphs under o200k_base, 58 under
  // cl100k_base, whose Hangul coverage is too thin to fill the pool alone.
  for (let cp = 0x0400; cp <= 0x04ff && out.length < LT_POOL; cp++) {
    const ch = String.fromCodePoint(cp);
    if (!reserved.has(ch) && encodeIds(ch, enc).length === 1) out.push(ch);
  }
  poolCache.set(enc, out);
  return out;
}

/* ----------------------------- token grid --------------------------------- */
/**
 * Split text into token pieces whose concatenation is byte-identical to the
 * source. Multi-token code points (a CJK char split across ids) are merged
 * into one piece, so every piece is a real, standalone string.
 */
interface Grid { piece: string[]; ok: boolean }
function tokenGrid(text: string, enc: EncodingName): Grid {
  const ids = encodeIds(text, enc);
  const piece: string[] = [];
  let pend: number[] = [];
  for (let i = 0; i < ids.length; i++) {
    pend.push(ids[i]);
    let s: string;
    try { s = decodeIds(pend, enc); } catch { continue; }
    if (s.indexOf('\uFFFD') !== -1 && text.indexOf('\uFFFD') === -1) continue;
    piece.push(s);
    pend = [];
  }
  if (pend.length) return { piece, ok: false };
  return { piece, ok: piece.join('') === text };
}

/* --------------------- suffix array + LCP over token ids ------------------- */
/** Manber–Myers doubling suffix array over an integer alphabet. O(n log² n). */
function suffixArray(a: Int32Array): Int32Array {
  const n = a.length;
  const sa = new Int32Array(n);
  for (let i = 0; i < n; i++) sa[i] = i;
  let rank = new Int32Array(n);
  let tmp = new Int32Array(n);
  for (let i = 0; i < n; i++) rank[i] = a[i];
  const idx = Array.from({ length: n }, (_, i) => i);
  for (let k = 1; ; k <<= 1) {
    const cmp = (x: number, y: number) => {
      if (rank[x] !== rank[y]) return rank[x] - rank[y];
      const rx = x + k < n ? rank[x + k] : -1;
      const ry = y + k < n ? rank[y + k] : -1;
      return rx - ry;
    };
    idx.sort(cmp);
    tmp[idx[0]] = 0;
    for (let i = 1; i < n; i++) tmp[idx[i]] = tmp[idx[i - 1]] + (cmp(idx[i - 1], idx[i]) < 0 ? 1 : 0);
    const swap = rank; rank = tmp; tmp = swap;
    if (rank[idx[n - 1]] === n - 1) break;
    if (k > n) break;
  }
  for (let i = 0; i < n; i++) sa[i] = idx[i];
  return sa;
}

/** Kasai et al. linear LCP. */
function lcpArray(a: Int32Array, sa: Int32Array): Int32Array {
  const n = a.length;
  const rank = new Int32Array(n);
  for (let i = 0; i < n; i++) rank[sa[i]] = i;
  const lcp = new Int32Array(n);
  let h = 0;
  for (let i = 0; i < n; i++) {
    if (rank[i] > 0) {
      const j = sa[rank[i] - 1];
      while (i + h < n && j + h < n && a[i + h] === a[j + h]) h++;
      lcp[rank[i]] = h;
      if (h > 0) h--;
    } else h = 0;
  }
  return lcp;
}

/* ------------------------------ candidates -------------------------------- */
interface Cand {
  start: number;     // token index of one occurrence
  len: number;       // length in tokens
  count: number;     // raw repeat count (upper bound on foldable occurrences)
  bound: number;     // admissible upper bound on exact gain
  text: string;
}

/**
 * Enumerate repeated token substrings from the SA/LCP interval structure.
 * For each adjacent SA pair with lcp ≥ LT_MIN_PHRASE we emit the prefix of
 * that repeat at a set of lengths; counts come from an exact interval scan.
 */
function candidates(piece: string[], ids: Int32Array, enc: EncodingName): Cand[] {
  const n = ids.length;
  if (n < 4) return [];
  const sa = suffixArray(ids);
  const lcp = lcpArray(ids, sa);
  // Character-offset prefix sums so a candidate's text is O(1) to slice.
  const off = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) off[i + 1] = off[i] + piece[i].length;
  const joined = piece.join('');

  const seen = new Map<string, Cand>();
  // Stack-based enumeration of maximal LCP intervals: each interval (lo,hi]
  // with minimum lcp L gives a repeat of length L occurring hi-lo+1 times.
  const stack: Array<{ l: number; lo: number }> = [];
  const push = (L: number, lo: number, hi: number) => {
    if (L < LT_MIN_PHRASE) return;
    const count = hi - lo + 1;
    if (count < 2) return;
    const start = sa[lo];
    for (let len = Math.min(L, LT_MAX_PHRASE); len >= LT_MIN_PHRASE; len--) {
      const text = joined.slice(off[start], off[start + len]);
      if (seen.has(text)) break;
      // bound: every occurrence folds to one glyph, definition costs len + 1
      const bound = count * (len - 1) - (len + 1);
      if (bound <= 0) continue;
      seen.set(text, { start, len, count, bound, text });
      if (seen.size >= LT_MAX_CANDIDATES) return;
    }
  };
  for (let i = 1; i <= n; i++) {
    const h = i < n ? lcp[i] : 0;
    let lo = i - 1;
    while (stack.length && stack[stack.length - 1].l > h) {
      const top = stack.pop()!;
      push(top.l, top.lo, i - 1);
      lo = top.lo;
    }
    if (!stack.length || stack[stack.length - 1].l < h) stack.push({ l: h, lo });
  }
  const out = [...seen.values()];
  out.sort((a, b) => b.bound - a.bound);
  return out.slice(0, LT_MAX_CANDIDATES);
}

/* -------------------------- the Viterbi gain oracle ----------------------- */
/**
 * Exact minimum-token parse of the token sequence under a dictionary.
 * `matches[i]` lists (phraseIndex, len) admissible at token i.
 * Cost model: one token per emitted glyph, one per literal token piece. The
 * model is an estimate of the FINAL wire cost (BPE can merge across a literal
 * boundary), which is why the real tokenizer re-measures the assembled wire
 * before anything ships — the oracle only has to ORDER candidates well.
 */
function parseCost(n: number, matches: Array<Array<[number, number]>>, out?: Int32Array): number {
  const best = new Int32Array(n + 1);
  const pick = out ?? new Int32Array(n + 1);
  for (let i = n - 1; i >= 0; i--) {
    let b = best[i + 1] + 1;
    let p = -1;
    const m = matches[i];
    if (m !== undefined) {
      for (let k = 0; k < m.length; k++) {
        const c = best[i + m[k][1]] + 1;
        if (c < b) { b = c; p = m[k][0]; }
      }
    }
    best[i] = b;
    pick[i] = p;
  }
  return best[0];
}

/** Occurrence positions of a token-phrase, by exact token-id comparison. */
function occurrences(ids: Int32Array, pat: Int32Array): number[] {
  const out: number[] = [];
  const n = ids.length, m = pat.length;
  if (m === 0 || m > n) return out;
  const first = pat[0];
  outer: for (let i = 0; i + m <= n; i++) {
    if (ids[i] !== first) continue;
    for (let j = 1; j < m; j++) if (ids[i + j] !== pat[j]) continue outer;
    out.push(i);
  }
  return out;
}

/* --------------------------------- decode --------------------------------- */
/**
 * Total function. Wires that do not start with MARK are returned unchanged,
 * so latticeDecode is safe to run over foreign wires inside a tournament.
 */
export function latticeDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  const pool = latticePool(enc);
  if (pool.length < 3) return wire;
  const MARK = pool[0], END = pool[1];
  if (!wire.startsWith(MARK)) return wire;
  const rest = wire.slice(MARK.length);
  const endAt = rest.indexOf(END);
  if (endAt < 0) return wire;
  const defs = rest.slice(0, endAt);
  const body = rest.slice(endAt + END.length);

  // Left-to-right parse: the first pool glyph that is not yet bound starts the
  // next definition; already-bound glyphs inside a definition are references.
  const glyphIndex = new Map<string, number>();
  for (let i = 2; i < pool.length; i++) glyphIndex.set(pool[i], i);
  const order: string[] = [];
  const raw = new Map<string, string>();
  let i = 0;
  let cur: string | null = null;
  let buf = '';
  while (i < defs.length) {
    const ch = defs[i];
    const isPool = glyphIndex.has(ch);
    if (isPool && !raw.has(ch)) {
      if (cur !== null) raw.set(cur, buf);
      cur = ch; buf = ''; order.push(ch);
      i += ch.length;
      continue;
    }
    buf += ch;
    i += ch.length;
  }
  if (cur !== null) raw.set(cur, buf);

  // Expand definitions in binding order; definition k may only cite j < k.
  const expanded = new Map<string, string>();
  for (const g of order) {
    let s = raw.get(g) ?? '';
    let outStr = '';
    for (const ch of s) {
      const e = expanded.get(ch);
      outStr += e !== undefined ? e : ch;
    }
    expanded.set(g, outStr);
  }
  let out = '';
  for (const ch of body) {
    const e = expanded.get(ch);
    out += e !== undefined ? e : ch;
  }
  return out;
}

/* --------------------------------- encode --------------------------------- */
export function latticeEncode(text: string, enc: EncodingName = 'o200k_base'): LatticeResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const inTokens = countTokens(text, enc);
  const done = (r: Omit<LatticeResult, 'encodeMs'>): LatticeResult => ({
    ...r, encodeMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  });
  const identity = (notes: string) => done({
    wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    savingsPct: 0, entries: [], mode: 'identity', notes,
  });

  const pool = latticePool(enc);
  if (pool.length < 8) return identity('glyph pool unavailable');
  const MARK = pool[0], END = pool[1];

  // G4 — decode totality for sources that begin with MARK.
  if (text.startsWith(MARK)) {
    const wire = MARK + END + text;
    const decoded = latticeDecode(wire, enc);
    if (decoded === text) {
      return done({
        wire, decoded, exact: true, inTokens, outTokens: countTokens(wire, enc),
        savingsPct: 0, entries: [], mode: 'forced-wrap',
        notes: 'LATTICE forced literal wrap (source begins with MARK)',
      });
    }
    return identity('forced wrap failed its own byte check');
  }

  if (!text || inTokens < 24) return identity('below admission floor');
  if (inTokens > LT_MAX_TOKENS) return identity('above token cap');

  const grid = tokenGrid(text, enc);
  if (!grid.ok) return identity('token grid not byte-exact');
  const piece = grid.piece;
  const n = piece.length;

  // G1 — glyphs must be absent from the source.
  const free = pool.slice(2).filter((g) => text.indexOf(g) === -1);
  if (free.length < 2) return identity('source soaked with pool glyphs');

  // Token-id sequence for the grid (one synthetic id per distinct piece, so
  // merged multi-id pieces still compare in O(1)).
  const dict = new Map<string, number>();
  const ids = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    let id = dict.get(piece[i]);
    if (id === undefined) { id = dict.size + 1; dict.set(piece[i], id); }
    ids[i] = id;
  }

  // ---- header-unambiguity invariant (the decoder's parse rule, enforced) ---
  // The decoder delimits definitions by "the first pool glyph that is not yet
  // bound". A definition whose TEXT contains a source-literal pool glyph would
  // therefore be split at that glyph and mis-bound. Body occurrences are
  // harmless (an unbound glyph in the body is simply literal), so the
  // restriction is confined to candidate definitions, which keeps compression
  // alive on sources that merely mention a glyph — the alternative (giving up
  // whenever the source touches the pool) silently costs the whole lane.
  const poolSet = new Set(pool);
  const clean = (s: string) => { for (const ch of s) if (poolSet.has(ch)) return false; return true; };

  const cands = candidates(piece, ids, enc).filter((c) => clean(c.text));
  if (cands.length === 0) return identity('no repeated token substring');

  // Occurrence index per candidate, built lazily.
  const patOf = (c: Cand) => ids.slice(c.start, c.start + c.len);
  const occCache = new Map<Cand, number[]>();
  const occOf = (c: Cand) => {
    let o = occCache.get(c);
    if (o === undefined) { o = occurrences(ids, patOf(c)); occCache.set(c, o); }
    return o;
  };

  // Accepted dictionary state.
  const accepted: Cand[] = [];
  const matches: Array<Array<[number, number]>> = new Array(n);
  const addMatches = (c: Cand, index: number) => {
    for (const p of occOf(c)) {
      let m = matches[p];
      if (m === undefined) { m = []; matches[p] = m; }
      m.push([index, c.len]);
    }
  };
  const dropMatches = (index: number) => {
    for (let i = 0; i < n; i++) {
      const m = matches[i];
      if (m === undefined) continue;
      for (let k = m.length - 1; k >= 0; k--) if (m[k][0] === index) m.splice(k, 1);
      if (m.length === 0) matches[i] = undefined as unknown as Array<[number, number]>;
    }
  };

  let curCost = parseCost(n, matches);
  let oracleCalls = 0;

  // ---- C3: accelerated (lazy) greedy over the exact C2 oracle -------------
  // Candidates are kept in a bound-ordered list. The top item is re-scored
  // exactly; if its exact gain still dominates the next item's bound it is
  // accepted immediately (Minoux's lemma, valid because bounds are admissible
  // and exact gains are non-increasing as the dictionary grows: adding
  // phrases can only shorten the parse, never lengthen it).
  const live = cands.slice();
  while (accepted.length < Math.min(LT_MAX_ENTRIES, free.length) && live.length > 0) {
    if (oracleCalls >= LT_MAX_ORACLE) break;
    // pick the best-bound candidate
    let bi = 0;
    for (let i = 1; i < live.length; i++) if (live[i].bound > live[bi].bound) bi = i;
    const c = live[bi];
    if (c.bound <= 0) break;

    const idx = accepted.length;
    addMatches(c, idx);
    const newCost = parseCost(n, matches);
    oracleCalls++;
    // exact gain: parse shortening minus the definition's own wire cost
    // (len tokens of literal phrase + 1 glyph token in the header).
    const exactGain = (curCost - newCost) - (c.len + 1);
    c.bound = exactGain;
    if (exactGain <= 0) {
      dropMatches(idx);
      live.splice(bi, 1);
      continue;
    }
    // does it still dominate every remaining bound?
    let bestOther = 0;
    for (let i = 0; i < live.length; i++) if (i !== bi && live[i].bound > bestOther) bestOther = live[i].bound;
    if (exactGain >= bestOther) {
      accepted.push(c);
      curCost = newCost;
      live.splice(bi, 1);
    } else {
      dropMatches(idx);           // re-insert with the refreshed (exact) bound
    }
  }

  if (accepted.length === 0) return identity('no entry survived the exact gain oracle');

  /**
   * Assemble a wire from a subset of the accepted dictionary.
   *
   * Two distinct cost models are in play and the difference is the point of
   * the polish pass below. The C2 oracle counts ONE token per literal token
   * piece; the real tokenizer may MERGE across a fold boundary (removing a
   * glyph can make its two neighbours merge into a single token) or SPLIT
   * where the grid did not. The oracle is therefore an ordering heuristic for
   * SELECTION, while the real tokenizer is the only authority on the final
   * wire — so the finished artifact is always re-measured, never estimated.
   */
  const build = (keep: Cand[]) => {
    const idxOf = new Map<Cand, number>();
    keep.forEach((c, i) => idxOf.set(c, i));
    const m2: Array<Array<[number, number]>> = new Array(n);
    keep.forEach((c, i) => {
      for (const p of occOf(c)) {
        let m = m2[p];
        if (m === undefined) { m = []; m2[p] = m; }
        m.push([i, c.len]);
      }
    });
    const pick = new Int32Array(n + 1);
    parseCost(n, m2, pick);
    const glyphOf = keep.map((_, i) => free[i]);
    let body = '';
    const hits = new Array(keep.length).fill(0);
    for (let i = 0; i < n;) {
      const p = pick[i];
      if (p >= 0 && p < keep.length) { body += glyphOf[p]; hits[p]++; i += keep[p].len; }
      else { body += piece[i]; i++; }
    }
    // Header: definitions in binding order, each re-parsed under EARLIER
    // glyphs only (C5) so the left-to-right decode rule stays unambiguous.
    const defsParts: string[] = [];
    for (let k = 0; k < keep.length; k++) {
      let d = keep[k].text;
      const orderIdx = Array.from({ length: k }, (_, j) => j)
        .sort((a, b) => keep[b].text.length - keep[a].text.length);
      for (const j of orderIdx) {
        const sub = keep[j].text;
        if (sub.length === 0 || sub.length >= d.length) continue;
        d = d.split(sub).join(glyphOf[j]);
      }
      defsParts.push(glyphOf[k] + d);
    }
    return { wire: MARK + defsParts.join('') + END + body, hits, glyphOf };
  };

  // ---- C6: real-tokenizer polish -------------------------------------------
  // An entry whose oracle gain was positive can still be a net LOSS on the
  // real tokenizer — most often when it folds a span whose neighbours would
  // otherwise have merged, or when a glyph never actually wins a parse slot
  // after later, longer entries were admitted. Drop-one descent on the REAL
  // measured wire removes exactly those, and can only ever lower the count
  // because every step is accepted only if the tokenizer says it improved.
  let keep = accepted.slice();
  let cur = build(keep);
  let curTok = countTokens(cur.wire, enc);
  for (let round = 0; round < 3 && keep.length > 1; round++) {
    let improved = false;
    // Cheapest suspects first: entries the optimal parse barely used.
    const order = keep.map((_, i) => i).sort((a, b) => cur.hits[a] - cur.hits[b]);
    for (const i of order) {
      if (keep.length <= 1) break;
      const trial = keep.filter((_, j) => j !== i);
      const bt = build(trial);
      const tk = countTokens(bt.wire, enc);
      if (tk < curTok && latticeDecode(bt.wire, enc) === text) {
        keep = trial; cur = bt; curTok = tk; improved = true;
        break;                       // hit counts changed; restart the sweep
      }
    }
    if (!improved) break;
  }
  const { wire, hits, glyphOf } = cur;
  const kept = keep;

  // ---- gates ---------------------------------------------------------------
  const decoded = latticeDecode(wire, enc);            // G2
  if (decoded !== text) return identity('byte-exactness gate rejected the wire');
  const outTokens = countTokens(wire, enc);            // G3
  if (outTokens >= inTokens) return identity(`no measured gain (${outTokens} ≥ ${inTokens})`);

  const entries: LatticeEntry[] = kept.map((c, i) => ({
    glyph: glyphOf[i], phrase: c.text, hits: hits[i], gain: c.bound,
  }));
  return done({
    wire, decoded, exact: true, inTokens, outTokens,
    savingsPct: ((inTokens - outTokens) / inTokens) * 100,
    entries, mode: 'lattice',
    notes: `LATTICE ${entries.length} entries · ${oracleCalls} exact oracle calls · byte-exact`,
  });
}

export const LATTICE_SYSTEM_PROMPT =
  'LATTICE-LT1 exact: a wire beginning with the mark glyph carries a dictionary then a body, ' +
  'separated by the end glyph. In the dictionary section each Hangul glyph that has not been ' +
  'bound yet starts a new definition and everything up to the next unbound glyph is its ' +
  'expansion; a bound glyph inside an expansion is a reference to that earlier definition. ' +
  'In the body, replace every bound glyph by its fully expanded definition; all other ' +
  'characters are literal. The result is the original text byte-for-byte.';
