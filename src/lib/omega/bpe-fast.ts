/**
 * bpe-fast.ts — X72. An exact, allocation-light replacement for ONE hot call:
 * `encode(chunk).length` inside `countTokens`. It changes no token count, and
 * `bench/x72/ids.ts` proves that against the library on every fixture in this
 * repository, on fuzzed Unicode, and on all 4 000 AUSTEROS/BRACHYS wires.
 *
 * ---------------------------------------------------------------------------
 * WHY (measured, node --cpu-prof on a real 150-line /var/log/dpkg.log)
 * ---------------------------------------------------------------------------
 *   17.1% bytePairMerge     15.9% binarySearch     13.8% getBpeRankFromString
 *    7.6% decodeUTF8         6.4% getRank           6.0% decode
 *   ≈ 75% of the whole run was gpt-tokenizer, and ~48% of it was *looking up a
 *   rank for a byte pair*. The library does that lookup by decoding the bytes to
 *   UTF-8 (`tryConvertToString`) and then, when that fails, by binary-searching a
 *   sorted array of 100k+ byte strings. Both are per-candidate-pair costs inside
 *   the innermost loop of a merge, so they are paid O(n^2) times per chunk, and
 *   this stack tokenises millions of small candidate strings per document.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS DOES, AND WHY IT IS THE SAME FUNCTION
 * ---------------------------------------------------------------------------
 * The library's `bytePairMerge` is: repeatedly merge the adjacent partition pair
 * with the *lowest* rank, where the rank of a pair is the vocabulary rank of the
 * bytes obtained by concatenating it. Nothing else. So:
 *
 *   - the rank index is rebuilt ONCE, keyed by the bytes themselves, as a numeric
 *     key for 2..4 bytes and a latin1 string key above that. No UTF-8 decode and
 *     no binary search is needed to answer "what is the rank of these bytes".
 *   - the count of a chunk is the number of partitions when no merge applies,
 *     which equals the number of token ids the library returns, so the ids are
 *     never materialised at all.
 *   - the two library shortcuts are kept in the same order: a whole chunk that is
 *     itself one vocabulary entry is one token, and a single ASCII byte is one
 *     token.
 *
 * The index is built from the library's own vocabulary maps (the same objects the
 * library consults), so there is no second source of truth about o200k.
 *
 * NOT CHANGED: the pre-token split (it stays in bpe.ts, with its existing
 * coverage check and fallback), the caches, the encodings offered, and every
 * public function's signature.
 */

import * as O200K from 'gpt-tokenizer/encoding/o200k_base';

type AnyCore = {
  bytePairStringRankEncoder: Map<string, number>;
  bytePairNonUtfSortedEncoder: Array<[Uint8Array, number]>;
  tokenSplitRegex: RegExp;
  bytePairStringRankEncoderOwner?: unknown;
  bytePairEncode: (s: string) => number[];
};

let CORE: AnyCore | null = null;
let VOCAB: Map<string, number> | null = null;
const SMALL = new Map<number, number>();   // 3..4 bytes: key = len * 2^32 + packed
/**
 * X73: the two-byte case is by far the most common rank lookup in the merge loop
 * (every merge starts by ranking adjacent byte pairs), and it was still going
 * through a Map with a float key. A flat Int32Array indexed by `b0<<8|b1` is one
 * load instead of a hash. -1 means "no such token". The gate in bench/x72/ids.ts
 * is unchanged and still binds: this is the same function.
 */
const PAIR2 = new Int32Array(65536).fill(-1);
const LONG = new Map<string, number>();    // 5+ bytes: key = latin1 of the bytes
let READY = false;
export let FAST_BUILD_MS = 0;

/**
 * A PRIVATE clone of the library's pre-token regex. The library hands out ONE
 * shared RegExp object and `String.prototype.matchAll` copies its `lastIndex`, so
 * mutating that object (which `exec` on a /g regex does) silently breaks the
 * library's own `encode` — it then returns 0 tokens. The clone exists so this
 * module can never perturb it; `bench/x72/ids.ts` now checks the library BEFORE
 * and AFTER every accelerated call for exactly that reason.
 */
let RE: RegExp | null = null;

const TE = new TextEncoder();
const TD = new TextDecoder('utf8');

/** Strict RFC 3629 validity: no overlong forms, no surrogates, <= U+10FFFF. */
function isValidUtf8(b: Uint8Array): boolean {
  let i = 0;
  const n = b.length;
  while (i < n) {
    const c = b[i];
    if (c < 0x80) { i++; continue; }
    let need = 0, min = 0, cp = 0;
    if (c >= 0xc2 && c <= 0xdf) { need = 1; cp = c & 0x1f; min = 0x80; }
    else if (c >= 0xe0 && c <= 0xef) { need = 2; cp = c & 0x0f; min = 0x800; }
    else if (c >= 0xf0 && c <= 0xf4) { need = 3; cp = c & 0x07; min = 0x10000; }
    else return false;
    if (i + need >= n + 0 && i + need > n - 1) return false;
    for (let k = 1; k <= need; k++) {
      const cc = b[i + k];
      if ((cc & 0xc0) !== 0x80) return false;
      cp = (cp << 6) | (cc & 0x3f);
    }
    if (cp < min || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return false;
    i += need + 1;
  }
  return true;
}

function latin1(b: Uint8Array, s = 0, e = b.length): string {
  let out = '';
  for (let i = s; i < e; i++) out += String.fromCharCode(b[i]);
  return out;
}

/** Numeric key for 2..4 bytes; exact in a double (at most 5·2^32). */
function keyOf(b: Uint8Array, s: number, e: number): number {
  const n = e - s;
  let k = n * 4294967296;
  for (let i = 0; i < n; i++) k += b[s + i] * Math.pow(256, 3 - i);
  return k;
}

/**
 * Build the byte-keyed rank index from the library's own vocabulary. Idempotent
 * and cheap to call; bpe.ts calls it once before the first accelerated count.
 */
export function fastReady(): boolean {
  if (READY) return true;
  const t0 = Date.now();
  try {
    const mod: any = O200K as any;
    CORE = mod?.default?.bytePairEncodingCoreProcessor ?? mod?.bytePairEncodingCoreProcessor ?? null;
    if (!CORE) return false;
    VOCAB = CORE.bytePairStringRankEncoder;
    RE = new RegExp(CORE.tokenSplitRegex.source, CORE.tokenSplitRegex.flags);
    SMALL.clear();
    LONG.clear();
    PAIR2.fill(-1);
    const put = (bytes: Uint8Array, rank: number) => {
      const n = bytes.length;
      if (n < 2) return;
      if (n === 2) { PAIR2[(bytes[0] << 8) | bytes[1]] = rank; return; }
      if (n <= 4) SMALL.set(keyOf(bytes, 0, n), rank);
      else LONG.set(latin1(bytes, 0, n), rank);
    };
    // (1) every token that the library stores as a string. Its bytes are the
    // UTF-8 encoding of that string, and the library finds it by decoding the
    // bytes back to the string, so the round trip must be lossless; if any entry
    // is not, this acceleration is refused rather than guessed.
    for (const [s, rank] of VOCAB) {
      const bytes = TE.encode(s);
      if (TD.decode(bytes) !== s) return false;
      put(bytes, rank);
    }
    // (2) every token the library stores as BYTES. The library only reaches the
    // byte map when `tryConvertToString(bytes)` is undefined, i.e. when the bytes
    // are NOT valid UTF-8. A valid-UTF-8 byte token is therefore SHADOWED: the
    // library decodes it to a string and looks THAT up, so its reachable rank is
    // the string map's value (often absent). The one case in this vocabulary is
    // U+FEFF, whose leading BOM is stripped by TextDecoder: [EF,BB,BF] decodes to
    // "" and the library returns NO rank, which is why encode("\uFEFF") is two
    // tokens even though rank 5574 holds exactly those bytes. Reproducing that
    // quirk is the difference between "same function" and "same intent".
    for (const [bytes, rank] of CORE.bytePairNonUtfSortedEncoder) {
      if (isValidUtf8(bytes)) continue;
      put(bytes, rank);
    }
    READY = true;
    FAST_BUILD_MS = Date.now() - t0;
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------------------
 * Zero-allocation merge loop.
 *
 * The first accelerated version still allocated two arrays per chunk and used
 * `Array.prototype.splice` to delete a partition boundary, and the profile of the
 * psql lane showed 5.3% of the whole run in GC plus 11.1% in `rankOf`. Chunks are
 * short (a pre-token is typically 3-12 bytes) and the stack counts millions of
 * them, so the per-call allocations were the cost, not the merge itself.
 *
 * Now: two module-level scratch buffers, filled by index, compacted by a memmove
 * instead of splice, and the rank lookup specialised for the 2, 3 and 4 byte
 * cases that dominate. Chunks are also copied into the byte scratch buffer by
 * `charCodeAt` when they are pure ASCII — which most are — so the common path
 * makes no allocation at all.
 *
 * Re-entrancy: `fastChunkCount` never calls itself and never invokes user code, so
 * the scratch buffers cannot be clobbered mid-merge. Chunks longer than the
 * scratch size fall back to fresh arrays.
 * ------------------------------------------------------------------------ */
const SCRATCH_MAX = 1024;
const SB = new Uint8Array(SCRATCH_MAX);
const SA = new Int32Array(SCRATCH_MAX + 2);
const SR = new Float64Array(SCRATCH_MAX + 2);
const INF = Number.POSITIVE_INFINITY;

/** Merge count over `n` bytes held in `b`. Mirrors bytePairMerge exactly. */
function mergeCount(b: Uint8Array, n: number): number {
  if (n <= 1) return n;
  const starts = SA, ranks = SR;
  for (let i = 0; i <= n; i++) starts[i] = i;
  for (let i = 0; i < n - 1; i++) ranks[i] = rankAt(b, i, i + 2);
  ranks[n - 1] = INF;
  ranks[n] = INF;
  let len = n + 1;
  while (len > 1) {
    let best = INF, bi = -1;
    for (let i = 0; i < len - 1; i++) {
      const r = ranks[i];
      if (r < best) { best = r; bi = i; }
    }
    if (bi < 0) break;
    for (let i = bi + 1; i < len - 1; i++) starts[i] = starts[i + 1];
    for (let i = bi; i < len - 1; i++) ranks[i] = ranks[i + 1];
    len--;
    ranks[bi] = bi + 2 < len ? rankAt(b, starts[bi], starts[bi + 2]) : INF;
    if (bi > 0) ranks[bi - 1] = bi + 1 < len ? rankAt(b, starts[bi - 1], starts[bi + 1]) : INF;
  }
  return len - 1;
}

/** Rank of the byte pair b[s..e), with the 2/3/4-byte cases inlined. */
function rankAt(b: Uint8Array, s: number, e: number): number {
  const n = e - s;
  if (n === 2) {
    const v = PAIR2[(b[s] << 8) | b[s + 1]];
    return v < 0 ? INF : v;
  }
  if (n === 3) {
    const v = SMALL.get(12884901888 + b[s] * 16777216 + b[s + 1] * 65536 + b[s + 2] * 256);
    return v === undefined ? INF : v;
  }
  if (n === 4) {
    const v = SMALL.get(17179869184 + b[s] * 16777216 + b[s + 1] * 65536 + b[s + 2] * 256 + b[s + 3]);
    return v === undefined ? INF : v;
  }
  if (n < 2) return INF;
  const v = LONG.get(latin1(b, s, e));
  return v === undefined ? INF : v;
}

/**
 * Number of token ids the library would return for this chunk. Same two
 * shortcuts in the same order, then the same merge.
 */
export function fastChunkCount(chunk: string): number {
  const L = chunk.length;
  if (L === 0) return 0;
  if (!READY && !fastReady()) throw new Error('bpe-fast: vocabulary unavailable');
  // shortcut 1: the whole chunk is one token (library: getBpeRankFromString(match))
  if (VOCAB!.has(chunk)) return 1;
  // shortcut 2: one ASCII byte is one token (library: length 1 && isAscii)
  if (L === 1) { if (chunk.charCodeAt(0) < 128) return 1; }
  let bytes: Uint8Array;
  if (L <= SCRATCH_MAX) {
    let ascii = true;
    for (let i = 0; i < L; i++) {
      const c = chunk.charCodeAt(i);
      if (c > 127) { ascii = false; break; }
      SB[i] = c;
    }
    if (ascii) return mergeCount(SB, L);
    bytes = TE.encode(chunk);
  } else {
    bytes = TE.encode(chunk);
  }
  if (bytes.length === 1) return 1;
  if (bytes.length <= SCRATCH_MAX) { SB.set(bytes); return mergeCount(SB, bytes.length); }
  return mergeCount(bytes, bytes.length);
}

/**
 * Number of token ids for an ARBITRARY string, exactly as the library's
 * `encode(text).length` would give: apply the library's own pre-token regex, then
 * count each match. A merge can never span a match boundary, so this is the same
 * function and not an approximation of it. Returns null when the regex does not
 * cover the text (the caller then uses the library).
 */
export function fastCount(text: string): number | null {
  if (text === '') return 0;
  if (!READY && !fastReady()) return null;
  const re = RE!;
  // one anchored exec answers the overwhelmingly common case (the whole string is
  // a single pre-token) without building a match array
  re.lastIndex = 0;
  const one = re.exec(text);
  if (one !== null && one.index === 0 && one[0].length === text.length) return fastChunkCount(text);
  re.lastIndex = 0;
  const ms = text.match(re);
  if (ms === null) return null;
  let covered = 0;
  for (let i = 0; i < ms.length; i++) covered += ms[i].length;
  if (covered !== text.length) return null;
  let n = 0;
  for (let i = 0; i < ms.length; i++) n += fastChunkCount(ms[i]);
  return n;
}

/** Reference implementation for the differential test: the library's own path. */
export function libraryChunkCount(chunk: string): number {
  const mod: any = O200K as any;
  if (chunk === '') return 0;
  return mod.encode(chunk).length;
}
