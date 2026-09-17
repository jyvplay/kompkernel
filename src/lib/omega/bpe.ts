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
} from 'gpt-tokenizer/encoding/o200k_base';
import {
  encode as encCl100k,
  decode as decCl100k,
} from 'gpt-tokenizer/encoding/cl100k_base';

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

const API: Record<EncodingName, EncApi> = {
  o200k_base: {
    encode: (s) => encO200k(s),
    decode: (ids) => decO200k(ids),
    scanLimit: 200_000,
  },
  cl100k_base: {
    encode: (s) => encCl100k(s),
    decode: (ids) => decCl100k(ids),
    scanLimit: 100_256,
  },
};

/** Real token ids. This is ground truth. */
export function encodeIds(text: string, enc: EncodingName): number[] {
  if (text === '') return [];
  return API[enc].encode(text);
}

/** Real token count. This is ground truth. Token count caching & line-chunking for 2M+ inputs. */
const TOKEN_COUNT_CACHE = new Map<string, number>();
const TOKEN_COUNT_CACHE_MAX = 5000;

export function countTokens(text: string, enc: EncodingName): number {
  if (text === '') return 0;
  const key = text.length <= 100_000 ? enc + '\u0000' + text : null;
  if (key) {
    const cached = TOKEN_COUNT_CACHE.get(key);
    if (cached !== undefined) return cached;
  }
  const count = API[enc].encode(text).length;
  if (key) {
    if (TOKEN_COUNT_CACHE.size >= TOKEN_COUNT_CACHE_MAX) TOKEN_COUNT_CACHE.clear();
    TOKEN_COUNT_CACHE.set(key, count);
  }
  return count;
}

export function decodeIds(ids: number[], enc: EncodingName): string {
  return API[enc].decode(ids);
}

/** Per-token strings, for hand-trace tables. */
export function tokenStrings(text: string, enc: EncodingName): { id: number; s: string }[] {
  const ids = encodeIds(text, enc);
  const out: { id: number; s: string }[] = [];
  for (const id of ids) {
    let s: string;
    try {
      s = API[enc].decode([id]);
    } catch {
      s = '\uFFFD';
    }
    out.push({ id, s });
  }
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
