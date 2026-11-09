/**
 * src/lib/omega/aither.ts — ΑἸΘΉΡ (AITHER, "the upper air; the medium that carries") — X87.
 *
 * =============================================================================
 * WHAT THIS MODULE IS, IN ONE SENTENCE
 * =============================================================================
 * The repo already ships a two-stage entropy codec — `cm.ts` (an lpaq-class
 * context-mixing arithmetic coder) and `atom-codec.ts` (a packer that carries
 * exactly log2(K) bits per o200k token, K measured live) — and it beats the
 * entire committed frontier on 29 of 29 lanes, by 28.9 %. ΑΙΘΗΡ is the module
 * that makes that win SHIPPABLE: it restricts the payload portfolio to codecs
 * the reader's own environment can inflate, and it adds an integrity field so a
 * damaged wire REFUSES instead of silently returning wrong text.
 *
 * =============================================================================
 * THE MEASUREMENT THAT MOTIVATES IT (bench/x87/receipts/xi-env.json)
 * =============================================================================
 * Twenty-nine lanes, the committed X80 frontier receipt as the baseline, all
 * round trips byte-exact, the envelope invariant (one token per atom) holding on
 * every lane:
 *
 *     total   raw 28015   frontier 12639   Ω-Ξ 8882 (node)   8985 (portable)
 *
 * Per lane, frontier -> portable Ω-Ξ:
 *     ls-l-real      1476 ->  729   (-747)      json-pkg        681 ->  535  (-146)
 *     ps-aux-real    1042 ->  648   (-394)      ls-real         433 ->  292  (-141)
 *     apt-real        850 ->  564   (-286)      dpkg-l          673 ->  532  (-141)
 *     code-ts         969 ->  712   (-257)      ps-real         397 ->  268  (-129)
 *     findmnt         444 ->  286   (-158)      kubectl         326 ->  198  (-128)
 *
 * Two standing conclusions of this repo's own ledger are falsified by it, and
 * the ledger should say so rather than keep repeating them:
 *
 *   · "`ls -l` is bounded by the one-token reference barrier; the residual is
 *     filenames, and fragment dictionaries lose because `lib` and `.so` are
 *     already single tokens."  The barrier is real for a READABLE message. It is
 *     not a property of the tokenizer: a character-level model codes the same
 *     filename column at 15.9 bits/token and halves the lane.
 *   · "Prose is at the tokenizer floor (no lossless headroom)."  `llm-answer.md`
 *     674 -> 595 and `email-thread.txt` 488 -> 416 are lossless and byte-exact.
 *     The floor claim holds only inside the self-describing-message family; it
 *     was never a statement about the source.
 *
 * What is NOT falsified: the frontier's own win lives in readability, and ΑΙΘΗΡ
 * gives readability up. The two tiers answer different questions and both
 * numbers are reported in the ledger, never one alone.
 *
 * =============================================================================
 * DEFECT 1 — THE PORTFOLIO IS NOT PORTABLE (fixed here)
 * =============================================================================
 * `omegaXiCompress` builds a portfolio and ships the smallest payload. One
 * candidate family is `CompressionStream('brotli')`. Node 22 accepts that format
 * as a non-standard extension; no browser does. So on a lane where brotli wins,
 * Node produces a wire that a browser cannot inflate at all. Measured: 6 of 29
 * lanes (kb-article, df-h(tbl), email-thread, llm-answer, prices.csv,
 * metrics.tsv). It fails LOUDLY — `streamDecompress` returns null and
 * `payloadDecode` throws — so it is a portability defect, not a fidelity one,
 * but a wire that decodes on the server and not in the client is still a wire
 * you cannot ship.
 *
 * ΑΙΘΗΡ restricts the portfolio to the browser-portable set. The measured price
 * is 103 tokens over 29 lanes (8882 -> 8985, i.e. 2.7 % of the win), and —
 * worth stating because it is surprising — a browser-restricted portfolio and a
 * portfolio with `CompressionStream` removed ENTIRELY agree on all 29 lanes:
 * once brotli is refused, `cm.ts` wins every lane that deflate and gzip were
 * contesting. The whole gain is carried by a pure-TypeScript deterministic coder
 * with no native dependency.
 *
 * =============================================================================
 * DEFECT 2 — THE ENVELOPE HAS NO INTEGRITY FIELD (fixed here, and this is the
 *            reason ΑΙΘΗΡ exists rather than being a one-line registry alias)
 * =============================================================================
 * `omegaXiCompress` is round-trip gated, so the ENCODER never ships an
 * unverified wire. The DECODER is a different story. `unpackWire` trusts the
 * four-byte header, reads exactly `payloadLen` bytes, and never checks that all
 * atoms were consumed; there is no checksum anywhere in the envelope. So a wire
 * damaged in transit — a chat surface that drops a glyph, a copy-paste, a
 * Unicode normalisation pass, a truncating cache — has three possible outcomes,
 * and only one of them is acceptable.
 *
 * Measured, bench/x87/receipts/xi-fuzz.json, 1856 mutations over the 29 lanes
 * (8 per kind per lane, 8 kinds: single-atom flip, header flip, swap, delete,
 * truncate-by-1, truncate-by-2, extend, whitespace), deterministic PRNG:
 *
 *     REFUSED        944   (50.9 %)   the decoder throws — acceptable
 *     EXACT (no-op)  466   (25.1 %)   the mutation did not change the payload
 *     WRONG, SILENT  446   (24.0 %)   the decoder returns DIFFERENT TEXT
 *                                     with no error at all
 *
 * Excluding the no-ops, **32.1 % of effective mutations corrupt silently**. That
 * is the number that disqualifies the envelope as it stands: a codec whose
 * entire claim is byte-exactness must be able to say "I cannot read this" and
 * must never say "here is your text" when the text is not the text.
 *
 * The fix costs two atoms. The atom alphabet is K = 65536 (16 bits/atom,
 * fingerprint 9f6dfcc4 for o200k_base), so a 32-bit checksum is exactly
 * ceil(32/16) = 2 atoms = 2 tokens, appended to the wire. `unpackWire` consumes
 * only the digits its own header asks for and ignores the rest — verified
 * empirically, the `extend` mutation decodes byte-exactly — so the checksum
 * rides outside the envelope's own digit stream and needs no change to
 * `atom-codec.ts`.
 *
 * What the checksum covers is the part worth thinking about. It is NOT a
 * checksum of the compressed payload: that would only catch damage the payload
 * decoder happens to notice. It is CRC-32 over
 *
 *     alphabetFingerprint || utf8(sourceText)
 *
 * so it is checked against the TEXT the reader finally gets, which means it
 * catches damage anywhere — header, block boundaries, payload — and folding the
 * alphabet fingerprint in closes a second silent hazard for free: if the atom
 * alphabet ever changes (a different tokenizer build, a different encoding),
 * every old wire mismatches and refuses instead of decoding to noise under a
 * shifted index. That is 0 extra tokens for a failure mode that would otherwise
 * be undetectable.
 *
 * After the fix: 446 -> 0 silent corruptions, 1390 -> 1390 refusals, on the same
 * mutation set (bench/x87/receipts/aither-fuzz.json).
 *
 * =============================================================================
 * WIRE
 * =============================================================================
 *   <Ω-Ξ atom run>  <c_1> ... <c_K>          K = ceil(32 / log2(alphabetSize))
 *
 *   · the atom run is `omegaXiCompress` output verbatim, restricted to the
 *     portable payload set;
 *   · c_1..c_K are the big-endian base-K digits of CRC-32(fingerprint || bytes).
 *
 * ΑΙΘΗΡ ships NO per-message contract line, and that is a deliberate, measured
 * choice rather than an omission: the envelope carries no per-message parameters.
 * Everything the reader needs — the alphabet, the payload codec, the length — is
 * either fixed by the encoding name or already inside the envelope's own header.
 * A `§ΑΙΘΗΡ` marker was measured at 4 tokens per message, 116 over this corpus,
 * and buys only self-identification; the fingerprint inside the checksum already
 * detects the one thing a marker would have to be trusted to report.
 *
 * =============================================================================
 * GATES (all of them, in order; any failure refuses and returns the identity)
 * =============================================================================
 *   P1  portable payload      the shipped codec id must inflate without a
 *                             non-standard CompressionStream format
 *   G1  envelope invariant    countTokens(wire) === atomCount + K, i.e. one token
 *                             per atom plus the checksum, measured not assumed
 *   G2  integrity round trip  aitherDecode(aitherEncode(t)) === t, byte for byte,
 *                             with the checksum verified on the way back
 *   G3  refusal soundness     a wire whose checksum does not match MUST throw
 *                             AitherRefused and MUST NOT return text
 *   G4  determinism           two encodes of the same input give the same wire
 *   G5  strict win            wire tokens < the caller's frontier tokens; ties and
 *                             losses refuse, because a tier that is not cheaper
 *                             has no reason to displace a readable message
 *   G6  size bound            refuse above MAX_BYTES rather than allocate
 *
 * DISCLOSED INHERITANCE
 *   ΑΙΘΗΡ is a wrapper, not a reimplementation. It inherits `cm.ts`, the SHFP and
 *   Aleph prepasses, the atom alphabet and the whole Ω-Ξ envelope unchanged, and
 *   adds a candidate restriction, an integrity field and gates. It inherits one
 *   side effect and discloses it: restricting the portfolio requires suppressing
 *   `CompressionStream('brotli')` for the duration of one `omegaXiCompress` call,
 *   which is a temporary mutation of `globalThis`. It is serialised behind a
 *   module-level mutex and restored in a `finally`, so concurrent callers cannot
 *   observe each other's environment.
 */
import { buildAtomAlphabet, countTokens, type EncodingName } from './bpe';
import { omegaXiCompress, omegaXiDecode, CODEC_NAMES } from './atom-codec';

/** Above this the coder is not worth its wall clock. Refuse, do not truncate. */
export const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Payload codec ids that inflate using only standards-track facilities.
 * Everything brotli-based is excluded: `CompressionStream('brotli')` is a Node
 * extension and `DecompressionStream('brotli')` does not exist in any browser,
 * so a brotli wire produced server-side is unreadable client-side.
 *   0 CM   1 DEFLATE   2 GZIP   4 SHFP_CM   8 LZ77_DEFLATE
 *   5 SHFP_DEFLATE   7 SHFP_GZIP   9? (see below)   12 ALEPH_CM   15 RAW
 * The brotli ids are 3, 6, 10, 11, 13, 14.
 */
export const AITHER_PORTABLE_CODECS: ReadonlySet<number> = new Set([0, 1, 2, 4, 5, 7, 8, 12, 15]);
const NON_PORTABLE_FORMATS: ReadonlySet<string> = new Set(['brotli', 'br']);

export class AitherRefused extends Error {
  readonly gate: string;
  constructor(gate: string, message: string) {
    super(`aither: refused at ${gate} — ${message}`);
    this.name = 'AitherRefused';
    this.gate = gate;
  }
}

export interface AitherResult {
  /** what to ship: the source unchanged when the arm refuses */
  message: string;
  /** the text `aitherDecode(message)` yields; equals the source or the arm refused */
  decoded: string;
  messageTokens: number;
  exact: boolean;
  applied: boolean;
  /** measured frontier cost this arm had to beat, when the caller supplied one */
  frontierTokens: number | null;
  /** payload codec id that won the restricted portfolio */
  payloadCodec: number | null;
  payloadCodecName: string | null;
  atomCount: number;
  checksumAtoms: number;
  /** G1: one token per atom plus the checksum digits */
  invariantHolds: boolean;
  /** bits of SOURCE carried per atom, i.e. the achieved end-to-end density */
  sourceBitsPerAtom: number;
  ms: number;
  notes: string;
}

/* ---------------------------------------------------------------------------
 * CRC-32 (IEEE 802.3), table-driven. Deterministic, no dependencies, and the
 * same polynomial any independent checker will reach for, so the field can be
 * re-derived by a cold reader in another language.
 * ------------------------------------------------------------------------- */
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * The checksum covers the alphabet fingerprint and then the source bytes.
 * Fingerprint first, so an alphabet change breaks every wire loudly.
 */
export function aitherChecksum(fingerprint: string, text: string): number {
  const fp = new TextEncoder().encode(fingerprint);
  const body = new TextEncoder().encode(text);
  const all = new Uint8Array(fp.length + body.length);
  all.set(fp, 0);
  all.set(body, fp.length);
  return crc32(all);
}

/** How many atoms a 32-bit field needs in this alphabet. 65536 atoms -> 2. */
export function checksumAtomCount(enc: EncodingName): number {
  const bits = buildAtomAlphabet(enc).bits;
  if (!(bits > 0)) throw new AitherRefused('alphabet', `atom alphabet has no bits (bits=${bits})`);
  return Math.max(1, Math.ceil(32 / bits));
}

/** big-endian base-M digits of a 32-bit value, as atoms. */
function checksumAtoms(enc: EncodingName, crc: number): string[] {
  const alpha = buildAtomAlphabet(enc);
  const M = alpha.atoms.length;
  const K = checksumAtomCount(enc);
  const out: string[] = [];
  let v = BigInt(crc >>> 0);
  const base = BigInt(M);
  for (let i = 0; i < K; i++) { out.unshift(alpha.atoms[Number(v % base)]); v = v / base; }
  return out;
}

function checksumValue(enc: EncodingName, atoms: string[]): number {
  const alpha = buildAtomAlphabet(enc);
  const M = BigInt(alpha.atoms.length);
  let v = 0n;
  for (const a of atoms) {
    // the alphabet indexes space-prefixed atoms; a wire split on /\S+/g is not
    const d = alpha.index.get(a) ?? alpha.index.get(' ' + a);
    if (d === undefined) throw new AitherRefused('G3', `checksum atom is not in the alphabet`);
    v = v * M + BigInt(d);
  }
  if (v > 0xffffffffn) throw new AitherRefused('G3', 'checksum field overflows 32 bits');
  return Number(v);
}

/* ---------------------------------------------------------------------------
 * Portfolio restriction. `streamCompress` bails out when `CompressionStream` is
 * not a function, and `new CompressionStream('brotli')` is wrapped in a
 * try/catch that returns null — so a brotli-refusing stub removes exactly the
 * non-portable candidates and leaves deflate, gzip and the whole CM family.
 * Serialised: the stub lives on globalThis for the duration of one await.
 * ------------------------------------------------------------------------- */
let mutex: Promise<unknown> = Promise.resolve();

function withPortablePortfolio<T>(fn: () => Promise<T>): Promise<T> {
  const run = mutex.then(fn, fn);
  mutex = run.then(() => undefined, () => undefined);
  return run;
}

async function compressPortable(text: string, enc: EncodingName): Promise<any> {
  return withPortablePortfolio(async () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const Real = g.CompressionStream as (new (f: string) => unknown) | undefined;
    if (typeof Real !== 'function') return omegaXiCompress(text, enc); // already pure-TS
    // A constructor function that returns an object overrides `this`, so this
    // behaves exactly like the real class for every format we allow.
    const Ctor = Real;
    const Stub = function (f: string) {
      if (NON_PORTABLE_FORMATS.has(f)) {
        throw new TypeError(`Failed to construct 'CompressionStream': unsupported format '${f}'`);
      }
      return new Ctor(f);
    };
    g.CompressionStream = Stub as unknown;
    try {
      return await omegaXiCompress(text, enc);
    } finally {
      g.CompressionStream = Real;
    }
  });
}

/** Decode with the same restriction in force, so P1 is checked where it matters. */
async function decodePortable(wire: string, enc: EncodingName): Promise<string> {
  return withPortablePortfolio(async () => {
    const g = globalThis as unknown as Record<string, unknown>;
    const Real = g.DecompressionStream as (new (f: string) => unknown) | undefined;
    if (typeof Real !== 'function') return omegaXiDecode(wire, enc);
    // A constructor function that returns an object overrides `this`, so this
    // behaves exactly like the real class for every format we allow.
    const Ctor = Real;
    const Stub = function (f: string) {
      if (NON_PORTABLE_FORMATS.has(f)) {
        throw new TypeError(`Failed to construct 'DecompressionStream': unsupported format '${f}'`);
      }
      return new Ctor(f);
    };
    g.DecompressionStream = Stub as unknown;
    try {
      return await omegaXiDecode(wire, enc);
    } finally {
      g.DecompressionStream = Real;
    }
  });
}

/**
 * Split a wire into (body, checksum atoms).
 *
 * Every atom in the alphabet is SPACE-PREFIXED, and `packWire` builds the wire by
 * concatenation, so the canonical form is " a b c" — including the leading space.
 * That leading space is not cosmetic: it is what makes the first atom tokenize as
 * itself, and dropping it costs a token and breaks the envelope invariant (G1
 * caught exactly this on the first run of this module, 29/29 refusals). So the
 * body is rebuilt by re-prefixing, never by trimming and rejoining.
 */
export function splitWire(wire: string, enc: EncodingName): { body: string; sum: string[] } {
  const K = checksumAtomCount(enc);
  const atoms = wire.match(/\S+/g) ?? [];
  if (atoms.length <= K) throw new AitherRefused('G3', `wire has ${atoms.length} atoms, needs more than the ${K} checksum atoms`);
  const bodyAtoms = atoms.slice(0, atoms.length - K);
  return { body: bodyAtoms.map((a) => ' ' + a).join(''), sum: atoms.slice(atoms.length - K) };
}

/**
 * Decode an ΑΙΘΗΡ wire. Throws AitherRefused on ANY integrity failure and never
 * returns text it has not verified. This is G3: refusal is the only acceptable
 * outcome for a damaged wire.
 */
export async function aitherDecode(wire: string, enc: EncodingName = 'o200k_base'): Promise<string> {
  if (typeof wire !== 'string' || !wire.trim()) throw new AitherRefused('G3', 'empty wire');
  const alpha = buildAtomAlphabet(enc);
  const { body, sum } = splitWire(wire, enc);
  const want = checksumValue(enc, sum);
  let text: string;
  try {
    text = await decodePortable(body, enc);
  } catch (e) {
    throw new AitherRefused('G3', `envelope decode failed: ${(e as Error)?.message ?? e}`);
  }
  const got = aitherChecksum(alpha.fingerprint, text);
  if (got !== want) {
    throw new AitherRefused('G3', `checksum mismatch: wire says ${want.toString(16)}, text gives ${got.toString(16)}`);
  }
  return text;
}

/**
 * Encode. Returns the source unchanged (`applied: false`) whenever any gate
 * fails, so the arm can be dropped into a tournament without a caller-side
 * try/catch and can never make a lane worse.
 */
export async function aitherEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  frontierTokens: number | null = null,
): Promise<AitherResult> {
  const t0 = Date.now();
  const refuse = (gate: string, notes: string): AitherResult => ({
    message: text, decoded: text, messageTokens: countTokens(text, enc), exact: true, applied: false,
    frontierTokens, payloadCodec: null, payloadCodecName: null, atomCount: 0,
    checksumAtoms: checksumAtomCount(enc), invariantHolds: false, sourceBitsPerAtom: 0,
    ms: Date.now() - t0, notes: `refused ${gate}: ${notes}`,
  });

  if (typeof text !== 'string' || text.length === 0) return refuse('G6', 'empty input');
  const bytes = new TextEncoder().encode(text);
  if (bytes.length > MAX_BYTES) return refuse('G6', `${bytes.length} bytes exceeds MAX_BYTES ${MAX_BYTES}`);

  const alpha = buildAtomAlphabet(enc);
  if (alpha.atoms.length < 2 || !alpha.proof.exact) {
    return refuse('alphabet', `atom alphabet unusable (atoms=${alpha.atoms.length})`);
  }
  const K = checksumAtomCount(enc);

  let xi: any;
  try {
    xi = await compressPortable(text, enc);
  } catch (e) {
    return refuse('P1', `portfolio failed: ${(e as Error)?.message ?? e}`);
  }
  if (!xi?.ok || typeof xi.output !== 'string') return refuse('P1', `omega-xi reported ${xi?.error ?? 'not ok'}`);

  const codec: number | null = xi.codecId ?? xi.payloadCodec ?? xi.codec ?? null;
  if (codec === null || !AITHER_PORTABLE_CODECS.has(codec)) {
    return refuse('P1', `payload codec ${codec} (${codec === null ? 'unknown' : CODEC_NAMES[codec] ?? '?'}) is not portable`);
  }

  // Concatenate, never trim: atoms are space-prefixed, so appending them to
  // `packWire`'s output is exactly how the envelope itself is built.
  const canonical = xi.output + checksumAtoms(enc, aitherChecksum(alpha.fingerprint, text)).join('');

  const atoms = canonical.match(/\S+/g) ?? [];
  const messageTokens = countTokens(canonical, enc);

  // G1 — the envelope invariant, measured on the shipped wire rather than trusted
  // from the inner result, because we appended atoms to it.
  if (messageTokens !== atoms.length) {
    return refuse('G1', `invariant broken: ${messageTokens} tokens for ${atoms.length} atoms`);
  }

  // G2 — integrity round trip through our OWN decoder, checksum included.
  let back: string;
  try {
    back = await aitherDecode(canonical, enc);
  } catch (e) {
    return refuse('G2', `round trip refused: ${(e as Error)?.message ?? e}`);
  }
  if (back !== text) return refuse('G2', 'round trip is not byte-exact');

  // G3 — refusal soundness: flipping one atom of the body must be caught.
  try {
    const probe = atoms.slice();
    const alt0 = alpha.atoms[0].trim(), alt1 = alpha.atoms[1].trim();
    probe[0] = probe[0] === alt0 ? alt1 : alt0;
    const damaged = probe.map((a) => ' ' + a).join('');
    let escaped = false;
    try { const out = await aitherDecode(damaged, enc); escaped = out !== text; } catch { escaped = false; }
    if (escaped) return refuse('G3', 'a damaged wire decoded to different text without refusing');
  } catch {
    /* a probe that cannot even be constructed is not a reason to refuse the lane */
  }

  // G4 — determinism.
  try {
    const again: any = await compressPortable(text, enc);
    if (again?.output !== xi.output) return refuse('G4', 'two encodes of the same input produced different wires');
  } catch (e) {
    return refuse('G4', `determinism re-encode failed: ${(e as Error)?.message ?? e}`);
  }

  // G5 — strict win over the frontier, when the caller supplied a frontier cost.
  if (frontierTokens !== null && !(messageTokens < frontierTokens)) {
    return refuse('G5', `${messageTokens} tokens is not strictly below the frontier's ${frontierTokens}`);
  }

  return {
    message: canonical, decoded: text, messageTokens, exact: true, applied: true,
    frontierTokens, payloadCodec: codec, payloadCodecName: CODEC_NAMES[codec] ?? String(codec),
    atomCount: atoms.length, checksumAtoms: K, invariantHolds: true,
    sourceBitsPerAtom: +((bytes.length * 8) / atoms.length).toFixed(3),
    ms: Date.now() - t0,
    notes: `${atoms.length} atoms (${atoms.length - K} envelope + ${K} checksum), payload ${codec}:${CODEC_NAMES[codec] ?? '?'}, ${((bytes.length * 8) / atoms.length).toFixed(2)} bits/atom`,
  };
}
