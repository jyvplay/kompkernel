import { chironDecode } from './chiron';
import { countTokens, type EncodingName } from './bpe';
import { symplokeDecode } from './symploke';
import {
  oikonomiaEncode, oikonomiaDecode,
  type OikonomiaOptions, type OikonomiaResult,
} from './oikonomia';
import {
  PYKNOSIS_ALPHABET, PYKNOSIS_HEX, pyknosisEncode, pyknosisPlan, pyknosisUndo,
  type PyknosisOptions, type PyknosisResult,
} from './pyknosis';

/**
 * SYNCOPE (συγκοπή, "a cutting short, the dropping of a letter from within a
 * word") — X35.
 *
 * PYKNOSIS established that the decoder's tokenizer charges different prices
 * for different characters, and that the same information can be re-spelled
 * into a cheaper alphabet. It re-spells hex into the sixteen most mergeable
 * letters and wins 20-28% on the payload.
 *
 * But PYKNOSIS deliberately PRESERVES the punctuation inside a run:
 *
 *     const KEEP = new Set(['-', '_']);
 *
 * so a UUID round-trips as
 *
 *     38101a0b-2096-447d-96ea-a692162415ae   ->   ~etanonhl-otem-htao-eite-aosonehotnia
 *
 * The separators survive because in general the encoder cannot know whether a
 * dash is part of the identifier or part of the surrounding text.
 *
 * ---------------------------------------------------------------------------
 * 1. THE MEASUREMENT THAT MOTIVATES IT
 * ---------------------------------------------------------------------------
 *
 * On the 36 request UUIDs of openstack-loghub-26.log, benchmark
 * bench/x35/syn3.ts prices the two encodings of the SAME 32 hex digits:
 *
 *     pattern      n    pyknosis-style (dashes kept)   dashes elided
 *     8-4-4-4-12  36            663 tokens                 546 tokens
 *                                                          ------
 *                                                    saving  117 tokens
 *
 * The dashes cost twice. First, directly: each one is its own pretoken under
 * the o200k pretokenizer (` ?[^\s\p{L}\p{N}]+`), so four of them are four
 * tokens per identifier. Second, and worse, they FRAGMENT the re-spelled run:
 * instead of one 32-letter run that BPE can merge across, the encoder faces
 * five runs of 8/4/4/4/12 letters, and short runs merge badly.
 *
 * ---------------------------------------------------------------------------
 * 2. WHY THE DASHES ARE AFFORDABLE TO DROP
 * ---------------------------------------------------------------------------
 *
 * A dash inside a hex identifier is not information. It is FORMAT: the
 * 8-4-4-4-12 grouping of a UUID is fixed by convention, so the 32 payload
 * characters determine the four dash positions exactly. Dropping them is
 * lossless, and restoring them is a positional operation the reader performs
 * without arithmetic:
 *
 *     "payloads of exactly 32 chars take dashes after 8,12,16,20"
 *
 * No base conversion, no carries, no large-number manipulation — the reader
 * counts to 32 and inserts four characters. This is the same discipline that
 * makes TIMEMA safe: only operations a reader can do by position and copy
 * are ever put in a contract.
 *
 * ---------------------------------------------------------------------------
 * 3. WHERE IT DOES AND DOES NOT APPLY (bench/x35/syn2.ts)
 * ---------------------------------------------------------------------------
 *
 * The obvious generalisation — elide separators from ANY dashed token — is
 * wrong, and the census shows why. Scanning every lane for
 * `[0-9a-f]{2,}([-_][0-9a-f]{2,})+`:
 *
 *     openstack-loghub-26.log   8-4-4-4-12  n=36  hexish=36   <- real hex ids
 *     openstack-loghub-26.log   4-2-2-2     n=26  hexish=0    <- dates
 *     dump.sql                  4-2-2       n=26  hexish=0    <- dates
 *     find-listing.txt          4-2         n=120 hexish=0    <- dates
 *     vix-daily-1990.csv        4-2-2       n=126 hexish=0    <- dates
 *     bibliography.txt          3-3         n=12  hexish=0    <- page ranges
 *
 * `hexish` counts how many of the matches contain at least one of a-f, i.e.
 * are genuinely hexadecimal rather than merely numeric. Every date and every
 * page range scores zero. Those separators are NOT elidable: TIMEMA and the
 * shape system already compress dates far better than any re-spelling could,
 * and deleting their dashes would destroy that. So the transform requires
 * `hexish` — a run must contain a real hex letter to be eligible.
 *
 * That restriction is what keeps this honest and off the benchmaxxing path:
 * the rule is not "dashes are free on this corpus", it is "dashes inside a
 * hexadecimal identifier carry no information", which is true of UUIDs, trace
 * ids and content hashes anywhere, including in text this encoder has never
 * seen.
 *
 * ---------------------------------------------------------------------------
 * 4. THE DISAMBIGUATION RULE
 * ---------------------------------------------------------------------------
 *
 * Only the runs of ONE shape are shortened, so the reader has to be told which
 * those are. The rule used is LENGTH: a marker payload is regrouped exactly
 * when its character count equals the stated total. For that to be
 * unambiguous the length must identify the shape, so the encoder checks that
 * no OTHER marker payload anywhere in the document has that same length with a
 * different grouping. If the length is ambiguous the transform refuses (it
 * does not fall back to a longer, more expensive rule).
 *
 * The result is a contract of one short sentence:
 *
 *     Then ~: etaoinsrhldcumyp mean 0123456789abcdef. Payloads of exactly 32
 *     chars take dashes after 8,12,16,20.
 *
 * ---------------------------------------------------------------------------
 * 5. COMPOSITION, AND WHY IT IS NOT A DOUBLE MAP
 * ---------------------------------------------------------------------------
 *
 * SYNCOPE runs AFTER pyknosisPlan and BEFORE the grammar: it takes the text
 * PYKNOSIS produced and removes separators from the runs PYKNOSIS already
 * re-spelled. The remap happens once, by one alphabet, under one clause.
 *
 * Its gate is the same honest, measured gate PYKNOSIS uses: the transform is
 * estimated, then the full message is encoded both ways and the SHORTER one
 * ships. If the grammar reacts badly to the shortened runs, SYNCOPE stays off
 * and the wire is byte-identical to the parent's.
 */

/** Separators recognised inside an identifier payload. */
export const SYNCOPE_SEPARATORS = ['-', '_'] as const;
/** Shortest separator count a payload must have to be considered structured. */
export const SYNCOPE_MIN_SEPARATORS = 2;
/** A shape must occur at least this many times to pay for its clause. */
export const SYNCOPE_MIN_RUNS = 2;

export interface Regroup {
  /** total payload length in characters, after separators are removed */
  len: number;
  /** cumulative offsets after which a separator is re-inserted */
  at: number[];
  /** the separator character used */
  sep: string;
  /** human-readable grouping, e.g. "8-4-4-4-12" */
  shape: string;
}

export interface SyncopeOptions extends PyknosisOptions {
  syncope?: boolean;
}

export interface SyncopeResult extends PyknosisResult {
  syncope: boolean;
  /** how many payloads had their separators removed */
  syncopeRuns: number;
  /** separators removed */
  syncopeSeps: number;
  /** the extra clause, '' when the transform did not fire */
  syncopeClause: string;
  /** the dedicated marker for separator-elided payloads */
  marker2: string;
  /** the grouping actually applied, null when the transform did not fire */
  syncopeGroup: Regroup | null;
}

/** Re-insert separators into an un-separated payload. */
function regroup(payload: string, g: Regroup): string {
  if (payload.length !== g.len) return payload;
  let out = '';
  let prev = 0;
  for (const pos of g.at) {
    out += payload.slice(prev, pos) + g.sep;
    prev = pos;
  }
  return out + payload.slice(prev);
}

/** Build the human/LLM-readable clause for a regrouping rule. */
export function syncopeClauseFor(g: Regroup, marker2: string): string {
  const what = g.sep === '-' ? 'dashes' : 'underscores';
  return `Payloads after ${marker2} use the same letters and take ${what} after ${g.at.join(',')}.`;
}

/**
 * The reference decoder. This is exactly what the receiving model is asked to
 * do: undo the 16-char alphabet, and where a payload is exactly `g.len`
 * characters, put the grouping back. Written to be character-simple.
 */
export function syncopeUndo(
  text: string,
  alphabet: string = PYKNOSIS_ALPHABET,
  marker: string = '~',
  g: Regroup | null = null,
  marker2: string = '\u0000',
): string {
  const back = new Map<string, string>();
  for (let i = 0; i < PYKNOSIS_HEX.length; i++) back.set(alphabet[i], PYKNOSIS_HEX[i]);
  const KEEP = new Set<string>(SYNCOPE_SEPARATORS);
  const marks = new Set([marker]);
  if (g && marker2) marks.add(marker2);
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (marks.has(text[i])) {
      const grouped = g !== null && text[i] === marker2;
      let j = i + 1;
      let run = '';
      while (j < text.length && (back.has(text[j]) || KEEP.has(text[j]))) run += text[j++];
      let hex = '';
      for (const c of run) hex += back.get(c) ?? c;
      out += grouped && g ? regroup(hex, g) : hex;
      i = j;
      continue;
    }
    out += text[i++];
  }
  return out;
}

interface Plan {
  text: string;
  base: NonNullable<ReturnType<typeof pyknosisPlan>>;
  /** the dedicated marker for separator-elided payloads */
  marker2: string;
  group: Regroup;
  runs: number;
  seps: number;
  clause: string;
  estimated: number;
}

/**
 * Plan the separator elision. Returns null whenever any soundness condition
 * fails, or when no shape is both frequent and unambiguous enough.
 */
export function syncopePlan(
  text: string,
  enc: EncodingName,
  opts: SyncopeOptions = {},
): Plan | null {
  if (opts.syncope === false) return null;
  const base = pyknosisPlan(text, enc, opts);
  if (!base) return null;

  const back = new Map<string, string>();
  for (let i = 0; i < PYKNOSIS_HEX.length; i++) back.set(base.alphabet[i], PYKNOSIS_HEX[i]);
  const KEEP = new Set<string>(SYNCOPE_SEPARATORS);
  const marker = base.marker;
  const src = base.text;

  // Collect every marker payload, with its grouping.
  const payloads: Array<{ s: number; e: number; raw: string; shape: string | null; sep: string }> = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== marker) continue;
    let j = i + 1;
    let run = '';
    while (j < src.length && (back.has(src[j]) || KEEP.has(src[j]))) run += src[j++];
    if (!run) continue;
    const sep = (SYNCOPE_SEPARATORS as readonly string[]).find((c) => run.includes(c)) ?? '';
    let shape: string | null = null;
    if (sep) {
      const segs = run.split(sep);
      if (segs.length - 1 >= SYNCOPE_MIN_SEPARATORS && segs.every((s) => s.length > 0)) {
        // must be genuinely hex, not a date / page range (see section 3)
        let hex = '';
        for (const c of run) hex += back.get(c) ?? c;
        if (/[a-f]/.test(hex)) shape = segs.map((s) => s.length).join('-');
      }
    }
    payloads.push({ s: i + 1, e: j, raw: run, shape, sep });
  }
  if (!payloads.length) return null;

  // Group the structured payloads by (separator, shape).
  const groups = new Map<string, typeof payloads>();
  for (const p of payloads) {
    if (!p.shape) continue;
    const k = `${p.sep}|${p.shape}`;
    if (!groups.has(k)) groups.set(k, []);
    (groups.get(k) as typeof payloads).push(p);
  }
  if (!groups.size) return null;

  // A dedicated second marker identifies the elided payloads, so the reader
  // never has to distinguish them by length. This matters in practice: on
  // openstack-loghub-26.log the 32-char request UUIDs coexist with 32-char
  // un-separated tenant ids, and a length rule could not tell them apart.
  let marker2 = '';
  for (const c of opts.markers ?? ['^', '·', '¦', '¬', '±']) {
    if (c !== marker && !src.includes(c)) { marker2 = c; break; }
  }
  if (!marker2) return null;

  let best: Plan | null = null;
  for (const [k, arr] of groups) {
    if (arr.length < SYNCOPE_MIN_RUNS) continue;
    const sep = k[0];
    const shape = k.slice(2);
    const segs = shape.split('-').map(Number);
    const stripped = arr[0].raw.split(sep).join('');
    const len = stripped.length;

    const at: number[] = [];
    let acc = 0;
    for (let i = 0; i < segs.length - 1; i++) { acc += segs[i]; at.push(acc); }
    if (at.length && at[at.length - 1] >= len) continue;

    // (a) self-delimiting: the character after an elided payload must lie
    // outside the alphabet, so "consume while in the alphabet" stops correctly.
    let bounded = true;
    for (const p of arr) {
      const nx = src[p.e];
      if (nx !== undefined && back.has(nx)) { bounded = false; break; }
    }
    if (!bounded) continue;

    const group: Regroup = { len, at, sep, shape };
    const clause = syncopeClauseFor(group, marker2);
    const clauseTok = countTokens(' ' + clause, enc) - countTokens(' ', enc);
    let estimated = -clauseTok;
    for (const p of arr) {
      const strippedP = p.raw.split(sep).join('');
      // the marker itself is part of the emitted text on both sides
      estimated += countTokens(marker + p.raw, enc) - countTokens(marker2 + strippedP, enc);
    }
    if (estimated <= 0) continue;

    // Build the transformed text.
    let out = '';
    let prev = 0;
    const hit = new Set(arr.map((p) => p.s));
    for (const p of payloads) {
      if (!hit.has(p.s)) continue;
      out += src.slice(prev, p.s - 1) + marker2 + p.raw.split(sep).join('');
      prev = p.e;
    }
    out += src.slice(prev);

    if (!best || estimated > best.estimated) {
      best = {
        text: out, base, marker2, group, runs: arr.length,
        seps: arr.length * (segs.length - 1), clause, estimated,
      };
    }
  }
  return best;
}

/** Encode: elide separators, then run the stack. Never ships a regression. */
export function syncopeEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: SyncopeOptions = {},
): SyncopeResult {
  const baseRes = pyknosisEncode(text, enc, opts);
  const plain: SyncopeResult = {
    ...baseRes, syncope: false, syncopeRuns: 0, syncopeSeps: 0, syncopeClause: '', marker2: '', syncopeGroup: null,
  };
  const plan = syncopePlan(text, enc, opts);
  if (!plan) return plain;

  // The honest gate: re-encode the whole message and keep the shorter one.
  let alt: OikonomiaResult;
  try {
    alt = oikonomiaEncode(plan.text, enc, opts as OikonomiaOptions);
  } catch {
    return plain;
  }
  const clauseTok =
    countTokens(' ' + plan.clause, enc) - countTokens(' ', enc) +
    countTokens(' ' + plan.base.clause, enc) - countTokens(' ', enc);
  const altTotal = alt.messageTokens + clauseTok;
  if (altTotal >= baseRes.messageTokens) return plain;

  return {
    ...alt,
    contract: alt.contract
      ? alt.contract.replace(/; print only\.$/, ` ${syncopeClauseFor(plan.group, plan.marker2)} print only.`)
      : syncopeClauseFor(plan.group, plan.marker2),
    messageTokens: altTotal,
    pyknosis: true,
    hexRuns: plan.base.runs,
    hexChars: plan.base.chars,
    marker: plan.base.marker,
    alphabet: plan.base.alphabet,
    estimatedSaving: plan.base.estimated + plan.estimated,
    hexClause: plan.base.clause,
    syncope: true,
    syncopeRuns: plan.runs,
    syncopeSeps: plan.seps,
    syncopeClause: syncopeClauseFor(plan.group, plan.marker2),
    marker2: plan.marker2,
    syncopeGroup: plan.group,
  };
}

/** Decode: expand the wire, then undo the regrouping and the alphabet. */
export function syncopeDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: { alphabet?: string; marker?: string; group?: Regroup | null; marker2?: string } = {},
): string {
  const expanded = oikonomiaDecode(wire, cfg);
  const g = opts.group ?? null;
  if (g) return syncopeUndo(expanded, opts.alphabet ?? PYKNOSIS_ALPHABET, opts.marker ?? '~', g, opts.marker2 ?? '\u0000');
  return pyknosisUndo(expanded, opts.alphabet ?? PYKNOSIS_ALPHABET, opts.marker ?? '~');
}

/** Convenience: encode, decode, verify byte-exactness. */
export function syncopeRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: SyncopeOptions = {},
): boolean {
  const r = syncopeEncode(text, enc, opts);
  const plan = syncopePlan(text, enc, opts);
  const g = plan && r.syncope ? plan.group : null;
  if (r.winner === 'bootstrap') {
    const mid = symplokeDecode(r.wire, { stats: undefined as any, undo: (w: string) => chironDecode(w) });
    return r.syncope ? syncopeUndo(mid, r.alphabet, r.marker, g, plan!.marker2) === text : mid === text;
  }
  const mid = oikonomiaDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  });
  return r.syncope ? syncopeUndo(mid, r.alphabet, r.marker, g, plan!.marker2) === text : mid === text;
}
