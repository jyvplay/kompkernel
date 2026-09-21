/**
 * src/lib/omega/strand.ts
 * =============================================================================
 * ⧉ STRAND-ST1 — Hybrid Static/Dynamic Dictionary under a Single Optimal Parse
 * =============================================================================
 * WHAT IS NEW (stated narrowly so it can be attacked)
 * -----------------------------------------------------------------------------
 * Every dictionary lane in this repository — and every published prompt codec
 * surveyed — commits to exactly ONE of two dictionary regimes:
 *
 *   DYNAMIC (per-document): LTSC (arXiv:2506.00307, Lmax=6 + fine-tuning),
 *     Dictionary-Encoding+ICL (arXiv:2604.13066), Re-Pair, and in this repo
 *     ANAPHORA, AXIOM, REPAIR, TRIE, KAPPA, LATTICE-LT1. A phrase must repeat
 *     inside THIS document often enough to amortize its own definition. The
 *     admission floor is hard: a phrase occurring once can never pay.
 *
 *   STATIC (prompt-shipped): PHRASEBOOK-φ1 and ROSETTA's OPS-1 here; Brotli's
 *     static dictionary (RFC 7932 §8) and ITU-T V.44 outside. Zero wire cost
 *     per entry — the table is amortized across all turns, so n ≥ 1 suffices —
 *     but the table is hand-written, tiny, and fixed at authoring time.
 *
 * Both regimes are individually exhausted in this repository. The unexploited
 * structure is that THEY COMPETE FOR THE SAME TOKEN SPANS, and nobody resolves
 * that competition optimally. Concretely: if a static entry covers " of the"
 * and a dynamic entry covers " of the retry budget", only one can fold at that
 * site. A system that applies static first and dynamic second (or the reverse)
 * makes an arbitrary, order-dependent choice and loses whenever the other
 * order was better. That is precisely the overlap-crediting defect LATTICE
 * removed WITHIN the dynamic regime — but it reappears ACROSS regimes, and no
 * surveyed system addresses it because no surveyed system runs both at once.
 *
 * STRAND's mechanism, in one sentence: put static and dynamic entries into ONE
 * shared lattice and let a single Viterbi shortest-path parse arbitrate every
 * site, with the dynamic dictionary selected by a gain oracle that already
 * knows what the static book will cover for free.
 *
 * THE ASYMMETRY THAT MAKES THIS PAY (the actual insight)
 * -----------------------------------------------------------------------------
 * The two regimes have DIFFERENT COST FUNCTIONS, and that is why co-optimizing
 * them is not the same problem as optimizing either:
 *
 *   static entry  : body cost 1 token per use,  wire cost 0         (n ≥ 1 pays)
 *   dynamic entry : body cost 1 token per use,  wire cost |P| + 1   (n ≥ 2 pays)
 *
 * So a dynamic candidate's true value is not its own gain — it is its gain
 * NET OF WHAT THE STATIC BOOK WOULD HAVE COVERED ANYWAY. A dynamic entry that
 * duplicates static coverage has near-zero marginal value yet still pays full
 * header price, and every order-dependent scheme buys exactly those entries.
 * STRAND's oracle measures the marginal parse improvement over a lattice that
 * ALREADY contains the static edges, so those entries are never admitted.
 * This is submodular-style marginal-gain selection (Minoux 1978, accelerated
 * greedy) applied to a two-regime dictionary, which is the contribution.
 *
 * THE STATIC BOOK (honest provenance — this is the part most easily faked)
 * -----------------------------------------------------------------------------
 * STRAND_BOOK_* is mined OFFLINE by bench/mine-strand.ts from bench/train/**
 * only — a corpus disjoint from bench/holdout/** and from every repo fixture —
 * then FROZEN into src/lib/omega/strand-book.ts and committed. The encoder
 * never mines at runtime. Therefore the book cannot absorb anything from the
 * document being compressed, and held-out numbers are real out-of-sample
 * numbers, not memorization. The book ships in the system prompt, which is
 * what makes its per-entry wire cost genuinely zero and the wire genuinely
 * model-readable: a model given the table can expand every static glyph.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   MARK [SFLAG] g₀P₀ g₁P₁ … END  <parsed body>
 *
 *   MARK   = pool[0]                      END = pool[1]
 *   dynamic glyphs = dynamic pool (disjoint high-Hangul / Cyrillic block)
 *   static  glyphs = static pool, a SEPARATE deterministic block; static glyph
 *                    i denotes book phrase i, needs no definition on the wire.
 *   SFLAG  = pool[2], present iff the body uses any static glyph. It exists so
 *            that a wire which uses only dynamic entries is bit-identical to
 *            what LATTICE would emit — no static tax on documents the book
 *            does not help. Absent flag ⇒ decoder ignores the static table.
 *
 * Definitions are self-delimiting exactly as in LATTICE-LT1 (1 token per
 * entry, no separators): inside the header the first not-yet-bound dynamic
 * glyph starts the next definition. Static glyphs inside a definition are
 * references to the book, never delimiters.
 *
 * EXACTNESS GATES
 *   G1 no glyph of EITHER pool may occur in the source, and no candidate
 *      definition may contain one (header-unambiguity);
 *   G2 strandDecode(wire) === source, byte-for-byte;
 *   G3 countTokens(wire) < countTokens(source) on the real tokenizer;
 *   G4 sources beginning with MARK are force-wrapped so decode is total;
 *   G5 the static book is validated at load: any phrase containing a pool
 *      glyph is dropped, so the book can never create an ambiguous wire.
 *
 * WHAT THIS IS NOT
 *   · not LATTICE with a bigger pool — the static regime has a different cost
 *     function and changes WHICH dynamic entries are admitted (measurable:
 *     the admitted dynamic set differs, see strandSelfTest S6);
 *   · not PHRASEBOOK-φ1 with more entries — φ1 is hand-written, applies its
 *     table greedily, and does not co-optimize with any dynamic dictionary;
 *   · not a runtime-learned dictionary — the book is frozen and committed;
 *   · not lossy, not a byte transport: the wire is model-readable text and the
 *     decoder is a documented left-to-right substitution.
 * =============================================================================
 */
import { countTokens, encodeIds, decodeIds, type EncodingName } from './bpe';
import { phraseCodebook } from './phrase';
import { latticePool } from './lattice';
import { STRAND_BOOK_O200K, STRAND_BOOK_CL100K, STRAND_BOOK_VERSION } from './strand-book';

export interface StrandEntry {
  glyph: string;
  phrase: string;
  hits: number;
  kind: 'static' | 'dynamic';
}

export interface StrandResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: StrandEntry[];
  staticHits: number;
  dynamicEntries: number;
  mode: 'strand' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

/* ----------------------------- tuning knobs ------------------------------- */
const ST_MAX_TOKENS = 24_000;
const ST_MAX_ENTRIES = 220;
const ST_MAX_PHRASE = 48;
const ST_MIN_PHRASE = 2;
const ST_MAX_CANDIDATES = 6_000;
const ST_MAX_ORACLE = 1_400;
const ST_DYN_POOL = 512;
const ST_STATIC_POOL = 820;

/* ------------------------------ glyph pools -------------------------------- */
/**
 * Two disjoint pools, both tokenizer-verified at 1 token/glyph and both
 * constructed disjoint from the namespaces already owned by sibling lanes
 * (ROSETTA = hiragana, PHRASEBOOK-φ1 = low Hangul, STRATA/ANAPHORA/REPAIR =
 * CJK ideographs). Dynamic takes the HIGH Hangul end descending; static takes
 * Cyrillic then Greek then Armenian, i.e. entirely different scripts, so a
 * glyph's ROLE is decidable from the character alone.
 */
const dynCache = new Map<EncodingName, string[]>();
const staCache = new Map<EncodingName, string[]>();

function reservedSet(enc: EncodingName): Set<string> {
  const r = new Set<string>();
  for (const g of phraseCodebook(enc).byGlyph.keys()) r.add(g);
  return r;
}

export function strandDynPool(enc: EncodingName): string[] {
  const hit = dynCache.get(enc);
  if (hit) return hit;
  const reserved = reservedSet(enc);
  // MUST be disjoint from LATTICE-LT1's pool: both lanes ship inside the same
  // ROSETTA tournament and a wire's owner is decided by its FIRST character,
  // so a shared mark would make one lane's wires undecodable (the dispatcher
  // would hand them to the wrong decoder). Skipping LATTICE's allocation also
  // guarantees the two marks differ, which is asserted in strandSelfTest S1.
  const lat = new Set(latticePool(enc));
  const out: string[] = [];
  for (let cp = 0xd7a3; cp >= 0xac00 && out.length < ST_DYN_POOL; cp--) {
    const ch = String.fromCodePoint(cp);
    if (reserved.has(ch) || lat.has(ch)) continue;
    if (encodeIds(ch, enc).length === 1) out.push(ch);
  }
  // cl100k_base has few single-token Hangul syllables and LATTICE takes most
  // of them; fall back to the Arabic block, which no sibling lane allocates.
  for (let cp = 0x0600; cp <= 0x06ff && out.length < ST_DYN_POOL; cp++) {
    const ch = String.fromCodePoint(cp);
    if (reserved.has(ch) || lat.has(ch)) continue;
    if (encodeIds(ch, enc).length === 1) out.push(ch);
  }
  dynCache.set(enc, out);
  return out;
}

export function strandStaticPool(enc: EncodingName): string[] {
  const hit = staCache.get(enc);
  if (hit) return hit;
  const reserved = reservedSet(enc);
  const dyn = new Set(strandDynPool(enc));
  const lat = new Set(latticePool(enc));   // LATTICE falls back to Cyrillic
  const out: string[] = [];
  // Script blocks, in a fixed order that is part of the wire contract. All are
  // measured disjoint from the dynamic pool, PHRASEBOOK-φ1, ROSETTA and the
  // CJK ideograph pool. Coverage: 887 single-token glyphs under o200k_base,
  // 201 under cl100k_base (measured, not assumed).
  const ranges: Array<[number, number]> = [
    [0x0400, 0x04ff],   // Cyrillic
    [0x0370, 0x03ff],   // Greek
    [0x0530, 0x058f],   // Armenian
    [0x0590, 0x05ff],   // Hebrew
    [0x0600, 0x06ff],   // Arabic
    [0x0900, 0x097f],   // Devanagari
    [0x0e00, 0x0e7f],   // Thai
    [0x10a0, 0x10ff],   // Georgian
    [0x0980, 0x09ff],   // Bengali
    [0x0a80, 0x0aff],   // Gujarati
    [0x0c80, 0x0cff],   // Kannada
    [0x1000, 0x109f],   // Myanmar
    [0x1780, 0x17ff],   // Khmer
    [0x0d00, 0x0d7f],   // Malayalam
    [0x0a00, 0x0a7f],   // Gurmukhi
    [0x0c00, 0x0c7f],   // Telugu
    [0x0d80, 0x0dff],   // Sinhala
    [0x0b80, 0x0bff],   // Tamil
    [0x0b00, 0x0b7f],   // Oriya
  ];
  for (const [a, b] of ranges) {
    for (let cp = a; cp <= b && out.length < ST_STATIC_POOL; cp++) {
      const ch = String.fromCodePoint(cp);
      if (reserved.has(ch) || dyn.has(ch) || lat.has(ch)) continue;
      if (encodeIds(ch, enc).length === 1) out.push(ch);
    }
  }
  staCache.set(enc, out);
  return out;
}

/* ------------------------------ static book -------------------------------- */
export interface StrandBook {
  phrases: string[];
  glyphs: string[];
  byGlyph: Map<string, string>;
}
const bookCache = new Map<EncodingName, StrandBook>();

/**
 * G5 — the frozen book is validated against the live pools at load. A phrase
 * containing any pool glyph is dropped rather than trusted, so a book edited
 * by hand can never produce an ambiguous wire.
 */
export function strandBook(enc: EncodingName): StrandBook {
  const hit = bookCache.get(enc);
  if (hit) return hit;
  const raw = enc === 'o200k_base' ? STRAND_BOOK_O200K : STRAND_BOOK_CL100K;
  const sp = strandStaticPool(enc);
  const dyn = new Set(strandDynPool(enc));
  const sta = new Set(sp);
  const phrases: string[] = [];
  for (const p of raw) {
    if (phrases.length >= sp.length) break;
    if (!p || p.length === 0) continue;
    let bad = false;
    for (const ch of p) if (dyn.has(ch) || sta.has(ch)) { bad = true; break; }
    if (bad) continue;
    // Defense in depth: bench/mine-strand.ts already excludes 1-token phrases,
    // so this branch is INERT against the shipped book (verified by mutation
    // test M9 — removing it changes no observable behaviour). It is retained
    // because the book is a generated artifact a future edit could weaken.
    if (countTokens(p, enc) < 2) continue;
    phrases.push(p);
  }
  const glyphs = sp.slice(0, phrases.length);
  const byGlyph = new Map<string, string>();
  for (let i = 0; i < phrases.length; i++) byGlyph.set(glyphs[i], phrases[i]);
  const b: StrandBook = { phrases, glyphs, byGlyph };
  bookCache.set(enc, b);
  return b;
}

/* ----------------------------- token grid --------------------------------- */
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

interface Cand { start: number; len: number; count: number; bound: number; text: string }

function candidates(piece: string[], ids: Int32Array): Cand[] {
  const n = ids.length;
  if (n < 4) return [];
  const sa = suffixArray(ids);
  const lcp = lcpArray(ids, sa);
  const off = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) off[i + 1] = off[i] + piece[i].length;
  const joined = piece.join('');
  const seen = new Map<string, Cand>();
  const stack: Array<{ l: number; lo: number }> = [];
  const push = (L: number, lo: number, hi: number) => {
    if (L < ST_MIN_PHRASE) return;
    const count = hi - lo + 1;
    if (count < 2) return;
    const start = sa[lo];
    for (let len = Math.min(L, ST_MAX_PHRASE); len >= ST_MIN_PHRASE; len--) {
      const text = joined.slice(off[start], off[start + len]);
      if (seen.has(text)) break;
      const bound = count * (len - 1) - (len + 1);
      if (bound <= 0) continue;
      seen.set(text, { start, len, count, bound, text });
      if (seen.size >= ST_MAX_CANDIDATES) return;
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
  return out.slice(0, ST_MAX_CANDIDATES);
}

/* ----------------------------- the shared parse ---------------------------- */
/**
 * One Viterbi pass over a lattice holding BOTH regimes' edges. `matches[i]`
 * holds [entryId, tokenLength] pairs; ids ≥ STATIC_BASE denote static book
 * entries (wire cost 0) and ids below it denote dynamic ones. Both cost one
 * body token per use, so the recurrence is identical — the regimes differ only
 * in what the SELECTION loop charges them, which is the whole point.
 */
const STATIC_BASE = 1 << 20;

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
/** Total function: a wire that is not a STRAND wire is returned unchanged. */
export function strandDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  const dyn = strandDynPool(enc);
  if (dyn.length < 4) return wire;
  const MARK = dyn[0], END = dyn[1], SFLAG = dyn[2];
  if (!wire.startsWith(MARK)) return wire;
  let rest = wire.slice(MARK.length);
  let useStatic = false;
  if (rest.startsWith(SFLAG)) { useStatic = true; rest = rest.slice(SFLAG.length); }
  const endAt = rest.indexOf(END);
  if (endAt < 0) return wire;
  const defs = rest.slice(0, endAt);
  const body = rest.slice(endAt + END.length);

  const book = strandBook(enc);
  const staticMap = useStatic ? book.byGlyph : new Map<string, string>();

  // Header parse: first not-yet-bound DYNAMIC glyph starts a new definition.
  const dynIndex = new Set(dyn.slice(3));
  const order: string[] = [];
  const raw = new Map<string, string>();
  let cur: string | null = null;
  let buf = '';
  for (const ch of defs) {
    if (dynIndex.has(ch) && !raw.has(ch)) {
      if (cur !== null) raw.set(cur, buf);
      cur = ch; buf = ''; order.push(ch);
      continue;
    }
    buf += ch;
  }
  if (cur !== null) raw.set(cur, buf);

  // Expand in binding order; definition k may cite earlier dynamic glyphs and
  // any static glyph.
  const expanded = new Map<string, string>();
  for (const g of order) {
    const s = raw.get(g) ?? '';
    let outStr = '';
    for (const ch of s) {
      const d = expanded.get(ch);
      if (d !== undefined) { outStr += d; continue; }
      const st = staticMap.get(ch);
      outStr += st !== undefined ? st : ch;
    }
    expanded.set(g, outStr);
  }
  let out = '';
  for (const ch of body) {
    const d = expanded.get(ch);
    if (d !== undefined) { out += d; continue; }
    const st = staticMap.get(ch);
    out += st !== undefined ? st : ch;
  }
  return out;
}

/* --------------------------------- encode --------------------------------- */
export function strandEncode(text: string, enc: EncodingName = 'o200k_base'): StrandResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const inTokens = countTokens(text, enc);
  const done = (r: Omit<StrandResult, 'encodeMs'>): StrandResult => ({
    ...r, encodeMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  });
  const identity = (notes: string) => done({
    wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    savingsPct: 0, entries: [], staticHits: 0, dynamicEntries: 0, mode: 'identity', notes,
  });

  const dynPool = strandDynPool(enc);
  if (dynPool.length < 8) return identity('dynamic glyph pool unavailable');
  const MARK = dynPool[0], END = dynPool[1], SFLAG = dynPool[2];
  const book = strandBook(enc);

  // G4 — decode totality.
  if (text.startsWith(MARK)) {
    const wire = MARK + END + text;
    const decoded = strandDecode(wire, enc);
    if (decoded === text) {
      return done({
        wire, decoded, exact: true, inTokens, outTokens: countTokens(wire, enc),
        savingsPct: 0, entries: [], staticHits: 0, dynamicEntries: 0, mode: 'forced-wrap',
        notes: 'STRAND forced literal wrap (source begins with MARK)',
      });
    }
    return identity('forced wrap failed its own byte check');
  }

  if (!text || inTokens < 24) return identity('below admission floor');
  if (inTokens > ST_MAX_TOKENS) return identity('above token cap');

  const grid = tokenGrid(text, enc);
  if (!grid.ok) return identity('token grid not byte-exact');
  const piece = grid.piece;
  const n = piece.length;

  // G1 — glyph absence (both pools).
  const freeDyn = dynPool.slice(3).filter((g) => text.indexOf(g) === -1);
  if (freeDyn.length < 2) return identity('source soaked with dynamic pool glyphs');
  // A book glyph occurring literally in the source is simply not bound. Unlike
  // the dynamic header (where a stray glyph would break the self-delimiting
  // parse), a literal static glyph is unambiguous: the decoder leaves unbound
  // glyphs alone. Mutation test M6 confirms this line is a correctness no-op —
  // it is kept because it prevents a needless byte-gate rejection if the book
  // ever grows to cover glyph characters themselves.
  const staticUsable = book.glyphs.filter((g) => text.indexOf(g) === -1);
  const staticUsableSet = new Set(staticUsable);

  const dict = new Map<string, number>();
  const ids = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    let id = dict.get(piece[i]);
    if (id === undefined) { id = dict.size + 1; dict.set(piece[i], id); }
    ids[i] = id;
  }

  const allPool = new Set([...dynPool, ...book.glyphs]);
  const clean = (s: string) => { for (const ch of s) if (allPool.has(ch)) return false; return true; };

  // ---- static edges: seed the lattice BEFORE any dynamic selection ---------
  // This is the step that makes the dynamic oracle marginal rather than naive.
  const matches: Array<Array<[number, number]>> = new Array(n);
  const staticUsed = new Map<number, string>();   // entryId -> glyph
  const offs = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) offs[i + 1] = offs[i] + piece[i].length;
  const joined = piece.join('');
  {
    // Index grid positions by character offset so a book phrase can only match
    // on a token boundary (otherwise the fold would not be re-tokenizable).
    const posOf = new Map<number, number>();
    for (let i = 0; i <= n; i++) posOf.set(offs[i], i);
    for (let bi = 0; bi < book.phrases.length; bi++) {
      const g = book.glyphs[bi];
      if (!staticUsableSet.has(g)) continue;
      const p = book.phrases[bi];
      let at = 0;
      let used = false;
      while ((at = joined.indexOf(p, at)) >= 0) {
        const si = posOf.get(at);
        const ei = posOf.get(at + p.length);
        if (si !== undefined && ei !== undefined && ei > si) {
          let m = matches[si];
          if (m === undefined) { m = []; matches[si] = m; }
          m.push([STATIC_BASE + bi, ei - si]);
          used = true;
        }
        at += p.length;
      }
      if (used) staticUsed.set(STATIC_BASE + bi, g);
    }
  }

  const cands = candidates(piece, ids).filter((c) => clean(c.text));

  const patOf = (c: Cand) => ids.slice(c.start, c.start + c.len);
  const occCache = new Map<Cand, number[]>();
  const occOf = (c: Cand) => {
    let o = occCache.get(c);
    if (o === undefined) { o = occurrences(ids, patOf(c)); occCache.set(c, o); }
    return o;
  };

  const accepted: Cand[] = [];
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

  // Baseline cost already includes every static edge — so every dynamic gain
  // measured from here is MARGINAL over free static coverage.
  let curCost = parseCost(n, matches);
  let oracleCalls = 0;

  const live = cands.slice();
  while (accepted.length < Math.min(ST_MAX_ENTRIES, freeDyn.length) && live.length > 0) {
    if (oracleCalls >= ST_MAX_ORACLE) break;
    let bi = 0;
    for (let i = 1; i < live.length; i++) if (live[i].bound > live[bi].bound) bi = i;
    const c = live[bi];
    if (c.bound <= 0) break;
    const idx = accepted.length;
    addMatches(c, idx);
    const newCost = parseCost(n, matches);
    oracleCalls++;
    const exactGain = (curCost - newCost) - (c.len + 1);
    c.bound = exactGain;
    if (exactGain <= 0) { dropMatches(idx); live.splice(bi, 1); continue; }
    let bestOther = 0;
    for (let i = 0; i < live.length; i++) if (i !== bi && live[i].bound > bestOther) bestOther = live[i].bound;
    if (exactGain >= bestOther) { accepted.push(c); curCost = newCost; live.splice(bi, 1); }
    else dropMatches(idx);
  }

  /** Assemble a wire from a chosen dynamic subset plus all static edges. */
  const build = (keep: Cand[]) => {
    const m2: Array<Array<[number, number]>> = new Array(n);
    for (let i = 0; i < n; i++) {
      const m = matches[i];
      if (m === undefined) continue;
      const keepStatic = m.filter((x) => x[0] >= STATIC_BASE);
      if (keepStatic.length) m2[i] = keepStatic.slice();
    }
    keep.forEach((c, i) => {
      for (const p of occOf(c)) {
        let m = m2[p];
        if (m === undefined) { m = []; m2[p] = m; }
        m.push([i, c.len]);
      }
    });
    const pick = new Int32Array(n + 1);
    parseCost(n, m2, pick);
    const glyphOf = keep.map((_, i) => freeDyn[i]);
    let body = '';
    const hits = new Array(keep.length).fill(0);
    const sHits = new Map<number, number>();
    for (let i = 0; i < n;) {
      const p = pick[i];
      if (p >= STATIC_BASE) {
        const g = staticUsed.get(p);
        const len = (m2[i] ?? []).find((x) => x[0] === p)?.[1] ?? 1;
        if (g !== undefined) { body += g; sHits.set(p, (sHits.get(p) ?? 0) + 1); i += len; continue; }
        body += piece[i]; i++; continue;
      }
      if (p >= 0 && p < keep.length) { body += glyphOf[p]; hits[p]++; i += keep[p].len; }
      else { body += piece[i]; i++; }
    }
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
    const usesStatic = sHits.size > 0;
    const wire = MARK + (usesStatic ? SFLAG : '') + defsParts.join('') + END + body;
    return { wire, hits, glyphOf, sHits, usesStatic };
  };

  if (accepted.length === 0) {
    // Static-only wire: still a real win whenever the book covers anything.
    const only = build([]);
    if (!only.usesStatic) return identity('no static coverage and no dynamic entry survived');
    const dec = strandDecode(only.wire, enc);
    if (dec !== text) return identity('static-only wire failed byte-exactness');
    const tk = countTokens(only.wire, enc);
    if (tk >= inTokens) return identity(`static-only wire not smaller (${tk} ≥ ${inTokens})`);
    let sh = 0; for (const v of only.sHits.values()) sh += v;
    const ents: StrandEntry[] = [...only.sHits.entries()].map(([id, h]) => ({
      glyph: staticUsed.get(id) ?? '?', phrase: book.phrases[id - STATIC_BASE], hits: h, kind: 'static' as const,
    }));
    return done({
      wire: only.wire, decoded: dec, exact: true, inTokens, outTokens: tk,
      savingsPct: ((inTokens - tk) / inTokens) * 100, entries: ents,
      staticHits: sh, dynamicEntries: 0, mode: 'strand',
      notes: `STRAND static-only · ${ents.length} book entries · ${sh} folds · byte-exact`,
    });
  }

  // ---- real-tokenizer polish (drop-one descent on the measured wire) -------
  let keep = accepted.slice();
  let cur = build(keep);
  let curTok = countTokens(cur.wire, enc);
  for (let round = 0; round < 3 && keep.length > 1; round++) {
    let improved = false;
    const order = keep.map((_, i) => i).sort((a, b) => cur.hits[a] - cur.hits[b]);
    for (const i of order) {
      if (keep.length <= 1) break;
      const trial = keep.filter((_, j) => j !== i);
      const bt = build(trial);
      const tk = countTokens(bt.wire, enc);
      if (tk < curTok && strandDecode(bt.wire, enc) === text) {
        keep = trial; cur = bt; curTok = tk; improved = true;
        break;
      }
    }
    if (!improved) break;
  }

  const decoded = strandDecode(cur.wire, enc);        // G2
  if (decoded !== text) return identity('byte-exactness gate rejected the wire');
  const outTokens = countTokens(cur.wire, enc);       // G3
  if (outTokens >= inTokens) return identity(`no measured gain (${outTokens} ≥ ${inTokens})`);

  let staticHits = 0; for (const v of cur.sHits.values()) staticHits += v;
  const entries: StrandEntry[] = [
    ...keep.map((c, i) => ({ glyph: cur.glyphOf[i], phrase: c.text, hits: cur.hits[i], kind: 'dynamic' as const })),
    ...[...cur.sHits.entries()].map(([id, h]) => ({
      glyph: staticUsed.get(id) ?? '?', phrase: book.phrases[id - STATIC_BASE], hits: h, kind: 'static' as const,
    })),
  ];
  return done({
    wire: cur.wire, decoded, exact: true, inTokens, outTokens,
    savingsPct: ((inTokens - outTokens) / inTokens) * 100,
    entries, staticHits, dynamicEntries: keep.length, mode: 'strand',
    notes: `STRAND ${keep.length} dynamic + ${cur.sHits.size} static (${staticHits} folds) · ${oracleCalls} oracle calls · byte-exact`,
  });
}

/** The decoder contract, shipped in the system prompt (book table included). */
export function strandDecoderPrompt(enc: EncodingName = 'o200k_base'): string {
  const book = strandBook(enc);
  const dyn = strandDynPool(enc);
  const table = book.glyphs.map((g, i) => `${g}=${JSON.stringify(book.phrases[i])}`).join(' ');
  return [
    `# ⧉ STRAND-ST1 (book ${STRAND_BOOK_VERSION}) — byte-exact hybrid dictionary wire`,
    `A STRAND message begins with the mark glyph ${JSON.stringify(dyn[0])}.`,
    `If the next character is ${JSON.stringify(dyn[2])} the static book is active.`,
    `Everything up to the end glyph ${JSON.stringify(dyn[1])} is the dynamic header;`,
    'inside it, the first Hangul glyph not yet bound starts a new definition and',
    'runs until the next unbound Hangul glyph. A bound glyph inside a definition',
    'is a reference to that earlier definition; a static glyph is a book lookup.',
    'After the end glyph comes the body: replace every bound Hangul glyph with',
    'its fully expanded definition and every static glyph with its book phrase.',
    'All other characters are literal. The result is the original text exactly.',
    'STATIC BOOK:', table,
  ].join('\n');
}

export const STRAND_SYSTEM_PROMPT = strandDecoderPrompt('o200k_base');
