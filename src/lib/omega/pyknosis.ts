import { chironDecode } from './chiron';
import { countTokens, type EncodingName } from './bpe';
import { symplokeDecode } from './symploke';
import {
  oikonomiaEncode, oikonomiaDecode, oikonomiaRoundTrip,
  type OikonomiaOptions, type OikonomiaResult,
} from './oikonomia';

/**
 * PYKNOSIS (πύκνωσις, "condensation, a making dense") — X34.
 *
 * Every codec in this stack is a machine for finding REPETITION. sibyl finds
 * repeated substrings, symploke nests them, metathesis renames them, oikonomia
 * decides how hard to look. All of them compress the same resource: the fact
 * that some span of the text occurs more than once.
 *
 * This codec compresses a DIFFERENT resource, and it is the one thing left once
 * the repetition is gone: **the decoder's tokenizer charges different prices for
 * different characters, and that price list can be arbitraged.**
 *
 * ---------------------------------------------------------------------------
 * 1. THE MEASUREMENT THAT MOTIVATES IT
 * ---------------------------------------------------------------------------
 *
 * After a full stack encode, split the wire and measure its density
 * (bench/x34/anat.ts, resid.ts):
 *
 *   lane                       raw tokens   wire   tape chars   chars/token
 *   openstack-loghub-26.log         4028     945         1272          2.50
 *   git-numstat.txt                 4632    1992         3331          2.20
 *
 * English prose runs at roughly 4.3 characters per token. The tape runs at 2.2
 * to 2.5. The gap is not failure to compress — it is that the residual content
 * is priced badly.
 *
 * Then the diagnostic that matters (bench/x34/resid.ts): the tape has
 * essentially **zero** residual repeat structure.
 *
 *   lane                     raw repeat coverage   tape repeat coverage
 *   openstack-loghub-26.log              76.3%                    0.0%
 *   git-numstat.txt                      61.5%                    0.4%
 *
 * Re-encoding the tape gains nothing (648 -> 648, 509 -> 509, 1511 -> 1511).
 * The dictionary has extracted every drop of exact repetition there is. The
 * remaining 2.2-2.5 chars/token is the price of the alphabet, not of the search,
 * and no better search can touch it.
 *
 * So what is left is priced by character class (bench/x34/dense.ts). Scanning
 * for spans below 3.0 chars/token:
 *
 *   lane                     chars   tokens   chars/token   census
 *   openstack-loghub-26.log   4068     2420          1.68   digit 2122, a-f 1330
 *   dump.sql                  1114      552          2.02   digit 900, a-f 144
 *   find-listing.txt          2760     1440          1.92   digit 2400
 *   vix-daily-1990.csv        1260      756          1.67   digit 1008
 *   kb-article.txt               0        0            --   (none)
 *   prose-01.txt                22        9            --   (none)
 *
 * The badly-priced material is hexadecimal and digit payloads — UUIDs, hashes,
 * object ids — the high-entropy identifiers that every log, dump and table
 * carries and that no dictionary rule can ever fire on twice, because they are
 * random by construction.
 *
 * ---------------------------------------------------------------------------
 * 2. THE MECHANISM
 * ---------------------------------------------------------------------------
 *
 * o200k_base was trained on natural text. It spends its long tokens on common
 * English fragments and charges roughly one token per character for anything
 * else. A random hex string is the "anything else":
 *
 *     random hex, measured         1.740 chars/token
 *
 * But the SAME random information spelled with the sixteen most mergeable
 * letters is cheaper, because those letters are exactly the ones BPE has long
 * tokens for:
 *
 *     random hex re-spelled        2.201 chars/token   (-20.9%)
 *     real corpus hex re-spelled   2.40  chars/token   (-27.6%)
 *
 * Nothing is lost and nothing is guessed: a fixed 16-character substitution is
 * information-preserving. The wire is shorter only because the vocabulary
 * charges less for the letters it knows.
 *
 * The alphabet was chosen by hill-climbing over all 26-letter assignments.
 * Scored on 900 deterministic random hex strings (bench/x34/opt.ts) the search
 * returns `etaoinsrkldcumyp` at 2.201 chars/token (-20.9%). Scored instead on
 * the 663 real hex runs of the corpus, 9472 characters (bench/x34/opt2.ts), it
 * returns `keaoinstrldcumzp` at 2.460 (-28.8%).
 *
 * Those two disagree, and the end-to-end measurement settles it in favour of
 * neither: what matters is not the re-spelled run in isolation but the document
 * the grammar search then sees.
 *
 *     alphabet              dump.sql   openstack   total
 *     keaoinstrldcumzp           -52         -14     -66   (better in isolation)
 *     etaoinsrhldcumyp           -54         -17     -71   (better end to end)
 *
 * So the shipped alphabet is `etaoinsrhldcumyp`, selected on the measured full
 * message, not on the isolated run score. The general lesson is the same one
 * section 4 records: an alphabet that makes the RUN shortest is not always the
 * alphabet that makes the MESSAGE shortest.
 *
 * It is NOT a rename and NOT a trick: it is an arbitrage between two price
 * lists for identical information, and it is orthogonal to every other
 * mechanism in the stack because it works on content with **zero repetition**,
 * which is precisely the content the other eleven codecs cannot touch.
 *
 * ---------------------------------------------------------------------------
 * 3. TWO THINGS THAT MUST BE TRUE, AND ARE CHECKED
 * ---------------------------------------------------------------------------
 *
 * (a) THE RUN MUST BE SELF-DELIMITING. Re-spelled hex is letters, and letters
 *     occur everywhere else in the document, so the reader has to be told where
 *     a run ends. A closing delimiter costs ~1 extra token per run and, at 88
 *     runs on openstack, that is 176 tokens against a 398-token saving — it
 *     eats most of the prize.
 *
 *     Instead the encoder VERIFIES that every run it re-spells is followed by a
 *     character outside the target alphabet. Measured (bench/x34/bound.ts):
 *
 *       openstack-loghub-26.log   88 runs, next char: ' 'x62  '/'x15  ']'x7  ')'x2  CR x2
 *       dump.sql                  26 runs, next char: "'"x26
 *
 *     Every one is a non-letter, so "consume letters until a non-letter" is
 *     exactly the true end of the run. If any document violates this, the run
 *     is skipped and the codec falls back to the parent untouched. The check is
 *     per run, at encode time, against the real text.
 *
 * (b) THE MARKER MUST NOT OCCUR IN THE SOURCE. If '~' already appears, the
 *     codec tries the next candidate marker and gives up if none is free. A
 *     marker that collides would make the wire ambiguous.
 *
 * ---------------------------------------------------------------------------
 * 4. WHY UNIFORM, NOT SELECTIVE
 * ---------------------------------------------------------------------------
 *
 * The obvious refinement is to re-spell only the runs that individually pay.
 * Measured, that refinement is WRONG and the reason is interesting:
 *
 *     dump.sql   uniform remap (all runs >= 16)         -44 tokens
 *     dump.sql   per-run remap (only runs that pay)     +37 tokens
 *
 * Selective remapping leaves the document half in one alphabet and half in
 * another, which destroys the very thing the dictionary search depends on:
 * regularity. A uniformly re-spelled document is more regular than the original
 * and the grammar search finds BETTER rules in it, so the whole is worth more
 * than the sum of the parts it was expected to earn. The per-run filter is
 * therefore not used for the runs; it is used only as a cheap estimate to gate
 * whether the transform is worth attempting at all.
 *
 * ---------------------------------------------------------------------------
 * 5. HONEST SCOPE
 * ---------------------------------------------------------------------------
 *
 * This is not a general-purpose compressor. It pays on documents that carry
 * hexadecimal payloads, and on those it is a large win; on prose and on
 * digit-only tables it does nothing and is skipped, at the cost of one regex
 * scan and a handful of token counts.
 *
 * Digit-only runs are explicitly NOT re-spelled. Measured (bench/x34/dig.ts),
 * bare digits already tokenize at 2.16-2.80 chars/token, which is at or above
 * what the letter alphabet achieves, so remapping them LOSES:
 *
 *     find-listing.txt  digit runs, base 892 tok -> 941  (+49)
 *     vix-daily         digit runs, base 1260    -> 1424 (+164)
 *
 * The gate is per document and measured, never assumed.
 */

/** Source alphabet and the measured-optimal re-spelling of it. */
export const PYKNOSIS_HEX = '0123456789abcdef';
export const PYKNOSIS_ALPHABET = 'etaoinsrhldcumyp';

/** Markers tried in order; the first one absent from the source is used. */
export const PYKNOSIS_MARKERS = ['~', '^', '·', '¦'];

/** Shortest run worth re-spelling. */
export const PYKNOSIS_MIN_RUN = 12;

/**
 * Cheap gate: how many re-spellable characters a document must carry before the
 * transform is even attempted.
 *
 * This is deliberately a WEAK test and it is not the decision. It exists only
 * to avoid paying for a second encode on the large majority of documents that
 * contain no hex at all. The real decision is the measured end-to-end
 * comparison in `pyknosisEncode`.
 *
 * It used to be a multiplier on the clause cost (estimated saving >= 2 x
 * clause) and that was too strong: on dump.sql the isolated estimate is
 * PESSIMISTIC, not optimistic, because it cannot see that a uniformly
 * re-spelled document lets the grammar search find better rules. Measured, that
 * gate rejected a real -44 token win (estimated 29 against a threshold of 34).
 * The isolated estimate is therefore used only to reject documents where it is
 * negative or negligible.
 */
export const PYKNOSIS_MIN_HEX_CHARS = 150;

/** A maximal run of lowercase hex, allowing - and _ inside (UUIDs, ids). */
const RUN_RE = /[0-9a-f]{4,}(?:[-_][0-9a-f]{2,})*|[0-9a-f]{8,}/g;

/** Characters that may appear inside a run and are passed through untouched. */
const KEEP = new Set(['-', '_']);

export interface PyknosisOptions extends OikonomiaOptions {
  /** override the target alphabet (16 distinct chars, aligned to PYKNOSIS_HEX) */
  alphabet?: string;
  /** override the marker list */
  markers?: string[];
  /** shortest run to re-spell */
  minRun?: number;
  /** minimum re-spellable characters before the transform is attempted */
  minHexChars?: number;
}

export interface PyknosisResult extends OikonomiaResult {
  /** did the alphabet transform fire */
  pyknosis: boolean;
  /** how many runs were re-spelled */
  hexRuns: number;
  /** characters re-spelled */
  hexChars: number;
  /** the marker actually used */
  marker: string;
  /** the alphabet actually used */
  alphabet: string;
  /** tokens the transform was estimated to save, before the encode */
  estimatedSaving: number;
  /** the clause added to the contract, '' if the transform did not fire */
  hexClause: string;
}

const forwardMap = (alphabet: string) => {
  const m = new Map<string, string>();
  for (let i = 0; i < PYKNOSIS_HEX.length; i++) m.set(PYKNOSIS_HEX[i], alphabet[i]);
  return m;
};
const reverseMap = (alphabet: string) => {
  const m = new Map<string, string>();
  for (let i = 0; i < PYKNOSIS_HEX.length; i++) m.set(alphabet[i], PYKNOSIS_HEX[i]);
  return m;
};

const respell = (s: string, fwd: Map<string, string>) => {
  let o = '';
  for (const c of s) o += fwd.get(c) ?? c;
  return o;
};

/**
 * Invert the re-spelling. This is the reference decoder: it is what the
 * receiving model is being asked to do, written down exactly, and it is what
 * `pyknosisRoundTrip` checks against. Keep it character-simple on purpose.
 */
export function pyknosisUndo(
  text: string,
  alphabet: string = PYKNOSIS_ALPHABET,
  marker: string = PYKNOSIS_MARKERS[0],
): string {
  const back = reverseMap(alphabet);
  let out = '';
  let i = 0;
  while (i < text.length) {
    if (text[i] === marker) {
      let j = i + 1;
      let run = '';
      while (j < text.length && (back.has(text[j]) || KEEP.has(text[j]))) run += text[j++];
      let fixed = '';
      for (const c of run) fixed += back.get(c) ?? c;
      out += fixed;
      i = j;
      continue;
    }
    out += text[i++];
  }
  return out;
}

interface Plan {
  text: string;
  clause: string;
  marker: string;
  alphabet: string;
  runs: number;
  chars: number;
  estimated: number;
}

/**
 * Plan the transform. Returns null whenever any soundness condition fails or
 * the estimated saving does not clear the clause cost by the gate factor.
 */
export function pyknosisPlan(
  text: string,
  enc: EncodingName,
  opts: PyknosisOptions = {},
): Plan | null {
  const alphabet = opts.alphabet ?? PYKNOSIS_ALPHABET;
  if (alphabet.length !== PYKNOSIS_HEX.length) return null;
  if (new Set(alphabet).size !== alphabet.length) return null;

  const minRun = opts.minRun ?? PYKNOSIS_MIN_RUN;
  const back = reverseMap(alphabet);

  // (b) the marker must not already occur in the source
  let marker = '';
  for (const c of opts.markers ?? PYKNOSIS_MARKERS) {
    if (!text.includes(c)) { marker = c; break; }
  }
  if (!marker) return null;

  // Collect maximal runs. A run is rejected if it touches another hex char,
  // which would mean the regex did not capture it maximally.
  const runs: Array<{ s: number; e: number }> = [];
  RUN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = RUN_RE.exec(text))) {
    if (m[0].length < minRun) continue;
    const before = text[m.index - 1];
    const after = text[m.index + m[0].length];
    if (before && /[0-9a-f]/.test(before)) continue;
    if (after && /[0-9a-f]/.test(after)) continue;
    runs.push({ s: m.index, e: m.index + m[0].length });
  }
  if (!runs.length) return null;

  // (a) every run must be followed by a character outside the target alphabet,
  // so that "consume while in the alphabet" stops at the true end.
  for (const r of runs) {
    const nx = text[r.e];
    if (nx !== undefined && back.has(nx)) return null;
  }

  const fwd = forwardMap(alphabet);
  const clause = `Then ${marker}: ${alphabet} mean ${PYKNOSIS_HEX}.`;
  const clauseTok = countTokens(' ' + clause, enc) - countTokens(' ', enc);

  // Isolated estimate, marker cost included.
  let estimated = 0;
  let chars = 0;
  for (const r of runs) {
    const src = text.slice(r.s, r.e);
    const before = countTokens(src, enc);
    const after = countTokens(marker + respell(src, fwd), enc);
    estimated += before - after;
    chars += src.length;
  }
  estimated -= clauseTok;

  if (chars < (opts.minHexChars ?? PYKNOSIS_MIN_HEX_CHARS)) return null;
  if (estimated <= 0) return null;

  let out = '';
  let prev = 0;
  for (const r of runs) {
    out += text.slice(prev, r.s) + marker + respell(text.slice(r.s, r.e), fwd);
    prev = r.e;
  }
  out += text.slice(prev);

  return { text: out, clause, marker, alphabet, runs: runs.length, chars, estimated };
}

/** Encode: re-spell the hex payloads, then run the stack. Never ships a regression. */
export function pyknosisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: PyknosisOptions = {},
): PyknosisResult {
  const plan = pyknosisPlan(text, enc, opts);
  const base = oikonomiaEncode(text, enc, opts);

  const plain: PyknosisResult = {
    ...base, pyknosis: false, hexRuns: 0, hexChars: 0,
    marker: '', alphabet: '', estimatedSaving: 0, hexClause: '',
  };
  if (!plan) return plain;

  // GATE 2, the real one. The isolated estimate is optimistic because it cannot
  // see how the grammar search will react to the changed text, so the decision
  // is made on the measured full message. This costs a second encode, and it is
  // only paid by documents that cleared the cheap gate above.
  let alt: OikonomiaResult;
  try {
    alt = oikonomiaEncode(plan.text, enc, opts);
  } catch {
    return plain;
  }
  const clauseTok = countTokens(' ' + plan.clause, enc) - countTokens(' ', enc);
  const altTotal = alt.messageTokens + clauseTok;

  if (altTotal >= base.messageTokens) return plain;

  return {
    ...alt,
    contract: alt.contract ? alt.contract.replace(/; print only\.$/, ` ${plan.clause} print only.`) : plan.clause,
    messageTokens: altTotal,
    pyknosis: true,
    hexRuns: plan.runs,
    hexChars: plan.chars,
    marker: plan.marker,
    alphabet: plan.alphabet,
    estimatedSaving: plan.estimated,
    hexClause: plan.clause,
  };
}

/**
 * Decode. The re-spelling sits UNDER the dictionary: the wire expands to the
 * re-spelled text first, and the alphabet is undone last. That ordering is
 * deliberate — it keeps the undo a flat character operation over text in which
 * every run still appears in its original surroundings.
 */
export function pyknosisDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: { alphabet?: string; marker?: string } = {},
): string {
  const expanded = oikonomiaDecode(wire, cfg);
  return pyknosisUndo(expanded, opts.alphabet ?? PYKNOSIS_ALPHABET, opts.marker ?? PYKNOSIS_MARKERS[0]);
}

/** Convenience: encode, decode with the right config, and verify byte-exactness. */
export function pyknosisRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: PyknosisOptions = {},
): boolean {
  const r = pyknosisEncode(text, enc, opts);
  if (r.winner === 'bootstrap') {
    const mid = symplokeDecode(r.wire, { stats: undefined as any, undo: (w: string) => chironDecode(w) });
    return r.pyknosis ? pyknosisUndo(mid, r.alphabet, r.marker) === text : mid === text;
  }
  const mid = symplokeDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  });
  return r.pyknosis ? pyknosisUndo(mid, r.alphabet, r.marker) === text : mid === text;
}
