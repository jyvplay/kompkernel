/**
 * src/lib/omega/bpe.ts
 * =============================================================================
 * REAL BPE GROUND TRUTH + Ω-ATOM ALPHABET CONSTRUCTION
 *
 * Every number this module produces comes from niieani/gpt-tokenizer, a port of
 * OpenAI's tiktoken. No `chars/4`, no word-count heuristics, no estimates.
 *
 * -----------------------------------------------------------------------------
 * THE CHUNK-BOUNDARY INVARIANCE THEOREM (why the atom alphabet is exact)
 * -----------------------------------------------------------------------------
 * tiktoken-family encoders run a regex pre-tokenizer BEFORE any BPE merge.
 * Both cl100k_base and o200k_base split text into chunks where a letter run may
 * be preceded by at most one non-letter/non-digit character, and no alternative
 * can span an interior space. BPE merges are applied strictly WITHIN a chunk.
 *
 * Therefore, if every atom has the shape " " + [A-Za-z]+ :
 *   (1) each atom is exactly one pre-tokenizer chunk;
 *   (2) concatenating atoms cannot create a merge across the boundary, because
 *       the next atom's leading space always starts a new chunk;
 *   (3) so tokens(a1 ‖ a2 ‖ … ‖ an) == tokens(a1) + … + tokens(an).
 * If in addition each atom satisfies encode(atom).length === 1 (verified here
 * against the live tokenizer, not assumed), then the emitted string costs
 * EXACTLY one token per atom — provably, not statistically.
 *
 * Consequence: the envelope carries log2(K) bits per token, where K is the
 * alphabet size. This is the quantity every other text-safe envelope loses on:
 *   base64 / base92 ASCII mash  -> ~1.5-2.6 chars/token * 6.0-6.5 bits/char
 *   CJK / Unicode packing       -> often 2-3 TOKENS PER CHARACTER (inflation)
 *   Ω-atoms                     -> log2(K) bits/token, K measured at runtime
 * =============================================================================
 */

import {
  encode as encO200k,
  decode as decO200k,
  setMergeCacheSize as setO200kMergeCacheSize,
} from 'gpt-tokenizer/encoding/o200k_base';
import {
  encode as encCl100k,
  decode as decCl100k,
  setMergeCacheSize as setCl100kMergeCacheSize,
} from 'gpt-tokenizer/encoding/cl100k_base';
import { decoder as GPT_TEXT_DECODER } from 'gpt-tokenizer/BytePairEncodingCore';

/* ---------------------------------------------------------------------------
 * DECODER STATE LEAK  (Z49)
 *
 * gpt-tokenizer decodes every token list through ONE module-global
 * TextDecoder in streaming mode and never flushes it. The trailing bytes of
 * an incomplete UTF-8 sequence — the first token of a two-token character such
 * as "≡", or the last id of a vocabulary scan — stay buffered and are silently
 * PREPENDED to the next, unrelated decode call, which then yields "\uFFFD…".
 * ARIADNE's grammar builder checks that per-token strings re-join to the chunk
 * and returns null when they do not, so whether a search arm ran at all
 * depended on what had been decoded earlier in the process. MEASURED
 * (bench/z49/receipts/det-leak.log, OMEGA_DET=1, same input): DAEDALUS gave
 * 787, then 706 on the next call, and 869 after a plain run on another text.
 * Every public decode below therefore starts with a flush and APPENDS the
 * final flush to its own result, which is exactly non-streaming semantics:
 * a token whose bytes end in an incomplete sequence (o200k id 439 = "о" + a
 * dangling 0xD0) decodes to "о\uFFFD" instead of to a counterfeit "о" that
 * the glyph pools would mistake for a one-token character. The per-token
 * walk in tokenStrings keeps the stream open across ITS tokens (so a
 * two-token character still lands, whole, on its second token) and flushes
 * once before and once after.
 * ------------------------------------------------------------------------- */
const flushDecoder = (): string => { try { return GPT_TEXT_DECODER.decode(); } catch { return ''; } };

/* ---------------------------------------------------------------------------
 * MERGE-CACHE OFF  (Z42)
 *
 * gpt-tokenizer memoises BPE merges in a 100 000-entry LRU whose eviction is
 * `mergeCache.keys().next()` + delete. On a long run of evictions that scan is
 * the hot spot: 65.6% of CPU on one 2 KB README encode (node --cpu-prof).
 * The cache is a pure memo of a deterministic function, so turning it off
 * changes no token id.
 *
 * MEASURED (bench/z42/cache-identity.ts, 14-file sample, serial, maxArms 1):
 *   total encode time 256 s (default cache) -> 81 s (cache off), 0.32x.
 *   Prompt identical on 13/14 files. The 14th (dpkg-l) differs only because
 *   wall-clock gates in sub-searches open further on a faster run; under
 *   OMEGA_DET=1 cache-on and cache-off give the same wire hash (bcd1de9b5a12a0e2).
 *   Round-trip decode is exact on all 14 files in both modes.
 * ------------------------------------------------------------------------- */
setO200kMergeCacheSize(0);
setCl100kMergeCacheSize(0);

export type EncodingName = 'o200k_base' | 'cl100k_base';

export const ENCODINGS: { key: EncodingName; label: string; models: string }[] = [
  { key: 'o200k_base', label: 'o200k_base', models: 'GPT-4o · GPT-4.1 · o1/o3/o4 family' },
  { key: 'cl100k_base', label: 'cl100k_base', models: 'GPT-4 · GPT-3.5-turbo · text-embedding-3' },
];

interface EncApi {
  encode: (s: string) => number[];
  decode: (ids: number[]) => string;
  scanLimit: number;
}

const RAW: Record<EncodingName, { encode: (s: string) => number[]; decode: (ids: number[]) => string }> = {
  o200k_base: { encode: (s) => encO200k(s), decode: (ids) => decO200k(ids) },
  cl100k_base: { encode: (s) => encCl100k(s), decode: (ids) => decCl100k(ids) },
};

const API: Record<EncodingName, EncApi> = {
  o200k_base: {
    encode: (s) => encO200k(s),
    decode: (ids) => { flushDecoder(); return decO200k(ids) + flushDecoder(); },
    scanLimit: 200_000,
  },
  cl100k_base: {
    encode: (s) => encCl100k(s),
    decode: (ids) => { flushDecoder(); return decCl100k(ids) + flushDecoder(); },
    scanLimit: 100_256,
  },
};

/** Real token ids. This is ground truth. */
export function encodeIds(text: string, enc: EncodingName): number[] {
  if (text === '') return [];
  return API[enc].encode(text);
}

/** Real token count. This is ground truth. */
/* ---------------------------------------------------------------------------
 * CHUNK-ADDITIVE RECKONING  (LOGISTIKE, W15)
 *
 * tiktoken applies a regex pre-tokenizer BEFORE any BPE merge and merges never
 * cross a chunk.  Therefore |encode(s)| = Σ |encode(chunk)| EXACTLY.
 *
 * MEASURED (bench/w17-regex.ts, 43 documents spanning English, German,
 * Spanish, Turkish, Russian, Polish, Japanese, HTML, XML, SVG, JSX, LaTeX,
 * SQL, CSV, logs, markdown, code):
 *     o200k_base  with the o200k pattern  -> EXACT 43/43
 *     cl100k_base with the cl100k pattern -> EXACT 43/43
 *     o200k_base  with the cl100k pattern -> 40/43   (the encodings need
 *                                             DIFFERENT patterns)
 *
 * Chunks repeat 1.4x-5.5x inside a document and almost totally across
 * documents, so a global per-chunk cache amortises the BPE work across a whole
 * session.  MEASURED 1.8x-2.2x on whole-document counts (bench/w17-speed.ts).
 *
 * SAFETY: if the partition does not reconstruct the input byte for byte we
 * fall through to the real tokenizer, so this can never be a source of error —
 * only of speed.  `countTokensExact` is kept as the unaccelerated reference
 * and `verifyChunkAlgebra` asserts the two agree.
 * ------------------------------------------------------------------------- */

const PRETOK: Record<EncodingName, RegExp> = {
  o200k_base: /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu,
  cl100k_base: /'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu,
};

const CHUNK_CACHE = new Map<string, number>();
let chunkHits = 0, chunkMisses = 0, chunkFallbacks = 0;

/* ---------------------------------------------------------------------------
 * SHORT-STRING MEMO  (X30)
 *
 * Measured on bench/holdout-work/kb-article.txt (bench/x30/prof3.ts, X30):
 * a single 3.4 KB encode made 2,240,610 countTokens calls, of which 2,190,308
 * (97.8%) were for strings shorter than 24 characters and therefore took the
 * `text.length < 24` early return that bypasses the chunk cache entirely.
 * Those short calls cost 14.8 s of a 28.8 s encode, i.e. 51% of the whole
 * encoder. Of the 2.19M short calls only 98,806 were DISTINCT strings, so the
 * short path is 95.5% redundant work.
 *
 * The memo is exact, not approximate: it is keyed by the full string (and the
 * encoding), so two different strings can never collide. It can therefore only
 * change timing, never a number. `verifyChunkAlgebra` and the byte-exact round
 * trip remain the authority on correctness.
 *
 * Bounded: the map is cleared if it exceeds SHORT_CACHE_MAX entries, so a
 * pathological input cannot grow it without limit.
 * ------------------------------------------------------------------------- */
const SHORT_CACHE = new Map<string, number>();
const SHORT_CACHE_MAX = 2_000_000;
let shortHits = 0, shortMisses = 0;

export function chunkCacheStats() {
  return { size: CHUNK_CACHE.size, hits: chunkHits, misses: chunkMisses, fallbacks: chunkFallbacks,
           shortSize: SHORT_CACHE.size, shortHits, shortMisses };
}
export function chunkCacheClear() {
  CHUNK_CACHE.clear(); chunkHits = 0; chunkMisses = 0; chunkFallbacks = 0;
  SHORT_CACHE.clear(); shortHits = 0; shortMisses = 0;
}

/** the unaccelerated reference implementation */
export function countTokensExact(text: string, enc: EncodingName): number {
  if (text === '') return 0;
  return API[enc].encode(text).length;
}

export function countTokens(text: string, enc: EncodingName): number {
  if (text === '') return 0;
  // very short strings are not worth the regex
  if (text.length < 24) {
    const k = enc + '\u0000' + text;
    const v = SHORT_CACHE.get(k);
    if (v !== undefined) { shortHits++; return v; }
    shortMisses++;
    const t = countTokensExact(text, enc);
    if (SHORT_CACHE.size >= SHORT_CACHE_MAX) SHORT_CACHE.clear();
    SHORT_CACHE.set(k, t);
    return t;
  }
  const re = PRETOK[enc];
  re.lastIndex = 0;
  const cs = text.match(re);
  if (cs === null) { chunkFallbacks++; return countTokensExact(text, enc); }
  let covered = 0;
  for (let i = 0; i < cs.length; i++) covered += cs[i].length;
  if (covered !== text.length) { chunkFallbacks++; return countTokensExact(text, enc); }
  const pfx = enc === 'cl100k_base' ? '\u0002' : '';
  let n = 0;
  for (let i = 0; i < cs.length; i++) {
    const k = pfx + cs[i];
    const v = CHUNK_CACHE.get(k);
    if (v === undefined) {
      chunkMisses++;
      const t = API[enc].encode(cs[i]).length;
      if (CHUNK_CACHE.size > 500000) CHUNK_CACHE.clear();
      CHUNK_CACHE.set(k, t);
      n += t;
    } else { chunkHits++; n += v; }
  }
  return n;
}

/** assert the algebra rather than trust it */
export function verifyChunkAlgebra(text: string, enc: EncodingName): boolean {
  return countTokens(text, enc) === countTokensExact(text, enc);
}

export function decodeIds(ids: number[], enc: EncodingName): string {
  return API[enc].decode(ids);
}

/** Per-token strings, for hand-trace tables. */
export function tokenStrings(text: string, enc: EncodingName): { id: number; s: string }[] {
  const ids = encodeIds(text, enc);
  const out: { id: number; s: string }[] = [];
  flushDecoder();
  for (const id of ids) {
    let s: string;
    try {
      s = RAW[enc].decode([id]);   // stream kept open across this text's tokens: a 2-token character lands on its 2nd token
    } catch {
      s = '\uFFFD';
    }
    out.push({ id, s });
  }
  const tail = flushDecoder();   // an incomplete sequence at the very end (never in valid text) stays visible
  if (tail && out.length) out[out.length - 1].s += tail;
  return out;
}

/* ---------------------------------------------------------------------------
 * Atom alphabet
 * ------------------------------------------------------------------------- */

export interface AtomAlphabet {
  encoding: EncodingName;
  /** Selected atoms, index === payload digit value. */
  atoms: string[];
  /** atom string -> digit value */
  index: Map<string, number>;
  /** log2(atoms.length); atoms.length is always a power of two */
  bits: number;
  /** how many candidates passed the single-token + shape verification */
  candidates: number;
  /** how many vocabulary ids were scanned */
  scanned: number;
  /** deterministic fingerprint of the selected alphabet */
  fingerprint: string;
  /** mean characters per atom (human-readability / char density) */
  meanChars: number;
  minChars: number;
  maxChars: number;
  /** empirical proof: N atoms concatenated encode to exactly N tokens */
  proof: { sample: number; tokens: number; exact: boolean };
  buildMs: number;
}

const ATOM_SHAPE = /^ [A-Za-z]{1,24}$/;
const CACHE = new Map<EncodingName, AtomAlphabet>();

function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

/**
 * Scan the live vocabulary, keep every token that is
 *   (a) shaped " " + letters, and
 *   (b) a verified fixed point: encode(decode([id])) === [id],
 * then keep ALL verified single-token candidates sorted longest-first.
 *
 * Preferring the longest words is the user-specified design axis: it maximises
 * characters carried per token, which makes the wire look like (nonsensical)
 * natural language and keeps every atom a maximal merge, i.e. the least likely
 * shape to interact with neighbouring text. Keeping all valid atoms (up to 65,536)
 * allows mixed-radix Base-M packing to capture log2(M) bits per token with zero
 * power-of-2 truncation waste.
 */
export function buildAtomAlphabet(enc: EncodingName): AtomAlphabet {
  const cached = CACHE.get(enc);
  if (cached) return cached;

  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const api = API[enc];
  const cand: { id: number; s: string }[] = [];
  let scanned = 0;
  let misses = 0;

  for (let id = 0; id < api.scanLimit; id++) {
    let s: string;
    try {
      s = api.decode([id]);
    } catch {
      misses++;
      if (misses > 4096 && cand.length > 0) break;
      continue;
    }
    scanned++;
    if (s.length < 2 || s.length > 25) continue;
    if (!ATOM_SHAPE.test(s)) continue;
    let ids: number[];
    try {
      ids = api.encode(s);
    } catch {
      continue;
    }
    if (ids.length !== 1 || ids[0] !== id) continue;
    cand.push({ id, s });
  }

  cand.sort((a, b) => b.s.length - a.s.length || a.id - b.id);

  const maxAtoms = Math.min(65536, cand.length);
  const atoms = cand.slice(0, maxAtoms).map((c) => c.s);
  const bits = Number(Math.log2(Math.max(2, atoms.length)).toFixed(4));

  const index = new Map<string, number>();
  for (let i = 0; i < atoms.length; i++) index.set(atoms[i], i);

  let total = 0;
  let minChars = Infinity;
  let maxChars = 0;
  for (const a of atoms) {
    total += a.length;
    if (a.length < minChars) minChars = a.length;
    if (a.length > maxChars) maxChars = a.length;
  }

  // Empirical proof of the invariance theorem on a deterministic spread sample.
  const sampleN = Math.min(512, atoms.length);
  let probe = '';
  for (let i = 0; i < sampleN; i++) {
    probe += atoms[Math.floor((i * atoms.length) / sampleN)];
  }
  let probeTokens = -1;
  try {
    probeTokens = api.encode(probe).length;
  } catch {
    probeTokens = -1;
  }

  const alpha: AtomAlphabet = {
    encoding: enc,
    atoms,
    index,
    bits,
    candidates: cand.length,
    scanned,
    fingerprint: fnv1a(`${enc}|${atoms.length}|${atoms[0]}|${atoms[atoms.length - 1]}|${total}`),
    meanChars: atoms.length ? total / atoms.length : 0,
    minChars: Number.isFinite(minChars) ? minChars : 0,
    maxChars,
    proof: { sample: sampleN, tokens: probeTokens, exact: probeTokens === sampleN },
    buildMs: (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0,
  };
  CACHE.set(enc, alpha);
  return alpha;
}

export function isAlphabetReady(enc: EncodingName): boolean {
  return CACHE.has(enc);
}
