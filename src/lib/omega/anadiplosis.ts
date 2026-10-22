import { chironDecode } from './chiron';
import { countTokens, type EncodingName } from './bpe';
import { symplokeDecode } from './symploke';
import { type OikonomiaOptions } from './oikonomia';
import {
  syncopeEncode, syncopeDecode,
  type SyncopeOptions, type SyncopeResult,
} from './syncope';

/**
 * ANADIPLOSIS (ἀναδίπλωσις, "a doubling, a repeating back") — X36.
 *
 * Every dictionary codec in this stack — sibyl, chiron, ariadne, symploke —
 * compresses the same resource: some span of the text occurs more than once.
 * They are indifferent to WHERE the second occurrence sits; a rule is a rule
 * whether the two copies are adjacent or a megabyte apart. That indifference is
 * their strength, and it is also what they pay for: every rule must be DEFINED
 * in a glossary before it can be USED, and the definition is charged against
 * the saving.
 *
 * This codec compresses the resource the dictionary is worst at: a span that
 * repeats *immediately*. Such a span needs no glossary entry at all. It needs a
 * COUNT. Where the dictionary writes
 *
 *     §α=17.240000,¶ ... α α α α        (1 definition + 4 uses)
 *
 * this writes
 *
 *     ⟦4⇤17.240000,⟧                    (1 copy + 1 count)
 *
 * and the count is three characters. The mechanism is run-length coding, but
 * applied at the span level rather than the character level, which is what
 * makes it pay on text where no single character ever repeats.
 *
 * ---------------------------------------------------------------------------
 * 1. THE MEASUREMENT THAT MOTIVATES IT
 * ---------------------------------------------------------------------------
 *
 * bench/x36/rle.ts scans every lane for runs of identical adjacent fields:
 *
 *     vix-daily-1990.csv   "," runs=126  chars=2520
 *     aapl-2014.csv        (none)
 *     every other lane     (none)
 *
 * and bench/x36/grle.ts generalises the scan from *fields* to *any adjacent
 * repeated span*, then measures end to end:
 *
 *     lane                     parent    ANADIPLOSIS    delta
 *     vix-daily-1990.csv         1195           579      -616  (-51.6%)
 *     npm-ls.txt                  940           925       -15
 *     aapl-2014.csv              1452          1452         0
 *     git-numstat.txt            1992          1992         0
 *     find-listing.txt           1267          1267         0
 *     openstack-loghub-26.log     898           898         0
 *     dump.sql                    608           608         0
 *     kb-article.txt              622           622         0
 *
 * ---------------------------------------------------------------------------
 * 2. ORTHOGONALITY: WHY THE DICTIONARY CANNOT DO THIS
 * ---------------------------------------------------------------------------
 *
 * It is tempting to say the dictionary already handles repetition, so this is
 * redundant. It is not, and the arithmetic is the argument.
 *
 * Let u be the token cost of the repeated unit and k the number of adjacent
 * copies. A dictionary rule costs u tokens once for the definition, plus one
 * token per use, so it costs u + k and saves (k-1)u - u = (k-2)u... more
 * precisely it replaces k·u tokens with u + k, a saving of (k-1)u - k. Against
 * that, a run-length span costs u + OVCHAR tokens once — one copy of the unit
 * plus the three framing characters and the count — and saves (k-1)u - OVCHAR.
 *
 * The two are equal when k = OVCHAR + 1, and for any unit worth naming
 * (u >= 2) the run-length form wins whenever the copy is short-lived: a phrase
 * that appears four times in a row and never again is exactly the case where a
 * glossary entry is pure overhead. The dictionary pays a definition to buy
 * reuse; here there is no reuse to buy.
 *
 * Empirically this is confirmed by the fact that the parent, which has already
 * run its full dictionary search, leaves the four copies of the price field
 * standing in the tape. It is not that the search failed to notice them; it is
 * that noticing them through a glossary is the wrong instrument.
 *
 * ---------------------------------------------------------------------------
 * 3. THE ONE THING THAT MUST BE GOT RIGHT: THE COUNT IS DELIMITED
 * ---------------------------------------------------------------------------
 *
 * The first implementation wrote the count AFTER the unit, as `⟦X⟧⇤k`. It
 * round-tripped on the toy input and then blew up on real text with
 * `RangeError: Invalid string length`, because in a numeric corpus the digits
 * of k run straight into the digits that follow and the parser reads a count of
 * 12345 where 12 was intended.
 *
 * The shipped form puts the count FIRST and the unit last:
 *
 *     OPEN <count> MARK <unit> CLOSE        ⟦4⇤17.240000,⟧
 *
 * so the parser reads a bounded digit run up to the first MARK, then takes
 * everything to the next CLOSE as the unit. The unit may contain any character
 * except CLOSE, and the encoder never emits a unit containing one, because it
 * always slices from the ORIGINAL text (see applyAll) rather than from a string
 * it has already rewritten.
 *
 * ---------------------------------------------------------------------------
 * 4. SELECTION: THE THRESHOLD IS IN TOKENS, NOT CHARACTERS
 * ---------------------------------------------------------------------------
 *
 * The first selection rule accepted any span with (k-1)·p >= 6, p being the
 * period in characters. That is a character-space estimate of a token-space
 * cost, and it is wrong in the direction that matters: it accepted two-character
 * units in dump.sql and find-listing, where the framing costs more than the
 * elision saves.
 *
 *     threshold in characters    dump.sql  +73    find-listing  +35   npm-ls  +24
 *     threshold in tokens        dump.sql    0    find-listing    0   npm-ls  -15
 *
 * A span is therefore accepted only when
 *
 *     (k - 1) · tokens(unit)  -  OVERHEAD  >=  MIN_GAIN      and   tokens(unit) >= 2
 *
 * with OVERHEAD = 5 (three framing characters plus a count, plus slack) and
 * MIN_GAIN = 3. The second condition is the one that matters: a unit that costs
 * a single token can never be profitably framed, no matter how many times it
 * repeats.
 *
 * ---------------------------------------------------------------------------
 * 5. DECODABILITY
 * ---------------------------------------------------------------------------
 *
 * The transform sits UNDER the dictionary, like PYKNOSIS's re-spelling and
 * SYNCOPE's separator elision: the wire is expanded first, and the run-length
 * spans are undone last, as a flat textual operation over text in which every
 * span still appears in its original surroundings.
 *
 * The reader's whole obligation is one sentence, appended to the contract:
 *
 *     ⟦N⇤X⟧ means X written N times.
 *
 * Expanding a span is a copy operation with a stated count — no arithmetic, no
 * base conversion, no alphabet table. This is the same discipline that makes
 * TIMEMA and SYNCOPE safe.
 *
 * ---------------------------------------------------------------------------
 * 6. HONEST SCOPE
 * ---------------------------------------------------------------------------
 *
 * Two of twenty measured lanes move. The large one, vix-daily-1990.csv, is a
 * file in which OPEN, HIGH, LOW and CLOSE are identical on every row — a
 * property of this particular synthetic export, not of financial data generally,
 * and the sibling lane aapl-2014.csv, which has genuinely distinct OHLC values,
 * is untouched by this codec. That is stated plainly rather than hidden: the
 * mechanism is general and the second lane (npm-ls, two long repeated spans
 * inside otherwise unique text) shows it firing on ordinary material, but the
 * headline number on vix should not be read as a claim about real market data.
 *
 * No lane regresses. The transform is accepted only when the measured full
 * message is strictly smaller than the parent's.
 */

/**
 * Candidate framings, cheapest first. Measured (bench/x37/frame.ts) as the
 * tokens added by `OPEN count MARK unit CLOSE` over the bare unit, averaged
 * over four representative units:
 *
 *     (N~X)   3.0        {N~X}   3.8
 *     [N~X]   3.3        ‹N~X›   3.8
 *     <N~X>   3.3        ⌈N~X⌉   6.0
 *     «N~X»   3.5        ⟦N⇤X⟧   8.8   <- the X36 choice
 *
 * The first implementation used the rare mathematical brackets on the theory
 * that rarity avoids collision with the source. The measurement says rarity is
 * paid for at the till: those characters cost three tokens each where ASCII
 * costs one, so the framing was ~5.8 tokens per span more expensive than it
 * needed to be. Collision is instead handled by trying these in order and
 * falling back to the next candidate when a character occurs in the source.
 */
export const ANADIPLOSIS_FRAMINGS: ReadonlyArray<readonly [string, string, string]> = [
  ['(', ')', '~'],
  ['[', ']', '~'],
  ['<', '>', '~'],
  ['{', '}', '~'],
  ['\u00ab', '\u00bb', '~'],
  ['[', ']', '#'],
  ['[', ']', '@'],
  ['[', ']', '*'],
  ['\u27e6', '\u27e7', '\u21e4'],
];
/** Opens a run-length span (default framing). */
export const ANADIPLOSIS_OPEN = ANADIPLOSIS_FRAMINGS[0][0];
/** Closes a run-length span (default framing). */
export const ANADIPLOSIS_CLOSE = ANADIPLOSIS_FRAMINGS[0][1];
/** Separates the count from the unit (default framing). */
export const ANADIPLOSIS_MARK = ANADIPLOSIS_FRAMINGS[0][2];

/** Tokens charged for the three framing characters plus the count. */
export const ANADIPLOSIS_OVERHEAD = 4;
/** Minimum net token saving for a span to be accepted. */
export const ANADIPLOSIS_MIN_GAIN = 3;
/** A unit costing fewer tokens than this can never pay for its own framing. */
export const ANADIPLOSIS_MIN_UNIT_TOKENS = 2;
/** Longest period the scanner will consider, in characters. */
export const ANADIPLOSIS_MAX_PERIOD = 64;
/** Shortest period the scanner will consider, in characters. */
export const ANADIPLOSIS_MIN_PERIOD = 2;
/** Largest repetition count the encoder will emit. */
export const ANADIPLOSIS_MAX_COUNT = 100_000;
/** Documents longer than this are left alone (the scan is quadratic-ish). */
export const ANADIPLOSIS_MAX_CHARS = 60_000;
/** Hard ceiling on spans emitted, bounding encoder time. */
export const ANADIPLOSIS_MAX_SPANS = 4096;

export interface AnadiplosisOptions extends SyncopeOptions {
  anadiplosis?: boolean;
  /** Force a framing. Must still be collision-free or the plan is refused. */
  framing?: Framing;
  /** Override the per-span acceptance threshold (auctionable). */
  minGainOverride?: number;
  /**
   * Candidate wordings for the contract clause. When more than one is given
   * they are scored by MEASURING the exact contract each produces, not by
   * counting the clause alone, because the clause is spliced in front of an
   * existing sentence and the tokenizer merges across the junction.
   */
  clauseLadder?: string[];
}

export interface AnadiplosisResult extends SyncopeResult {
  anadiplosis: boolean;
  /** how many run-length spans were emitted */
  anadiplosisSpans: number;
  /** characters removed by the elision */
  anadiplosisChars: number;
  /** the contract clause, '' when the transform did not fire */
  anadiplosisClause: string;
  /** the framing actually used, needed to decode */
  framing: Framing;
}

interface Cand { s: number; p: number; k: number; gain: number; ut: number }


/** The contract sentence the receiving model is asked to honour. */
export function anadiplosisClauseFor(framing: Framing = ANADIPLOSIS_DEFAULT_FRAMING): string {
  const [o, c, m] = framing;
  return `${o}N${m}X${c} means X written N times.`;
}

/**
 * Find every position at which some unit repeats immediately. Returns the
 * best (longest-elision) candidate at each starting offset.
 */
function findCandidates(
  text: string, enc: EncodingName, maxSpans: number,
): Cand[] {
  const n = text.length;
  const out: Cand[] = [];
  for (let i = 0; i < n; i++) {
    let bestP = 0, bestK = 0, bestVal = 0, bestUT = 0;
    const lim = Math.min(ANADIPLOSIS_MAX_PERIOD, (n - i) >> 1);
    for (let p = ANADIPLOSIS_MIN_PERIOD; p <= lim; p++) {
      // count how many consecutive copies of text[i..i+p) begin at i
      let k = 1;
      while (i + (k + 1) * p <= n) {
        let same = true;
        for (let q = 0; q < p; q++) {
          if (text[i + q] !== text[i + k * p + q]) { same = false; break; }
        }
        if (!same) break;
        k++;
      }
      if (k >= 2) {
        const ut = countTokens(text.slice(i, i + p), enc);
        const val = (k - 1) * ut;
        if (val > bestVal) { bestVal = val; bestP = p; bestK = k; bestUT = ut; }
      }
    }
    if (bestP > 0) out.push({ s: i, p: bestP, k: bestK, gain: bestVal, ut: bestUT });
    if (out.length >= maxSpans * 8) break;
  }
  return out;
}

/** Greedy non-overlapping selection, best gain first. */
function select(text: string, cands: Cand[], maxSpans: number, minGain: number = ANADIPLOSIS_MIN_GAIN): Cand[] {
  const used = new Uint8Array(text.length);
  const scored = cands
    .map((c) => ({ ...c, gain: c.gain - ANADIPLOSIS_OVERHEAD }))
    .filter((c) => c.gain >= minGain && c.ut >= ANADIPLOSIS_MIN_UNIT_TOKENS)
    .sort((a, b) => b.gain - a.gain);
  const picked: Cand[] = [];
  for (const c of scored) {
    if (picked.length >= maxSpans) break;
    if (c.k < 2 || c.k > ANADIPLOSIS_MAX_COUNT) continue;
    const end = c.s + c.p * c.k;
    if (end > text.length) continue;
    let free = true;
    for (let q = c.s; q < end; q++) if (used[q]) { free = false; break; }
    if (!free) continue;
    for (let q = c.s; q < end; q++) used[q] = 1;
    picked.push(c);
  }
  return picked.sort((a, b) => a.s - b.s);
}

/**
 * Build the output in ONE pass over the ORIGINAL text, so that a unit can never
 * contain a framing character emitted for some other span.
 */
function applyAll(text: string, chosen: Cand[], framing: Framing): string {
  const [OPEN, CLOSE, MARK] = framing;
  let out = '';
  let i = 0;
  for (const c of chosen) {
    out += text.slice(i, c.s);
    out += OPEN + c.k + MARK + text.slice(c.s, c.s + c.p) + CLOSE;
    i = c.s + c.p * c.k;
  }
  out += text.slice(i);
  return out;
}

/**
 * The reference decoder. This is exactly what the receiving model is asked to
 * do, written down: replace `⟦N⇤X⟧` with X written N times.
 */
/** A chosen framing: [open, close, mark]. */
export type Framing = readonly [string, string, string];

export const ANADIPLOSIS_DEFAULT_FRAMING: Framing =
  [ANADIPLOSIS_OPEN, ANADIPLOSIS_CLOSE, ANADIPLOSIS_MARK];

/** Pick the cheapest framing none of whose characters occur in the source. */
export function anadiplosisPickFraming(text: string): Framing | null {
  for (const f of ANADIPLOSIS_FRAMINGS) {
    if (!text.includes(f[0]) && !text.includes(f[1]) && !text.includes(f[2])) return f;
  }
  return null;
}

export function anadiplosisUndo(text: string, framing: Framing = ANADIPLOSIS_DEFAULT_FRAMING): string {
  const [OPEN, CLOSE, MARK] = framing;
  if (!text.includes(OPEN)) return text;
  const markRe = new RegExp('^(\\d{1,7})' + MARK.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  let out = '';
  let i = 0;
  while (i < text.length) {
    const a = text.indexOf(OPEN, i);
    if (a < 0) { out += text.slice(i); break; }
    out += text.slice(i, a);
    const m = markRe.exec(text.slice(a + 1));
    if (!m) { out += OPEN; i = a + 1; continue; }
    const k = parseInt(m[1], 10);
    const uStart = a + 1 + m[0].length;
    const b = text.indexOf(CLOSE, uStart);
    if (b < 0) { out += text.slice(a); break; }
    const unit = text.slice(uStart, b);
    if (!(k >= 2 && k <= ANADIPLOSIS_MAX_COUNT)) { out += text.slice(a, b + 1); i = b + 1; continue; }
    out += unit.repeat(k);
    i = b + 1;
  }
  return out;
}

interface Plan {
  text: string;
  framing: Framing;
  spans: number;
  chars: number;
  clause: string;
  estimated: number;
}

/**
 * Plan the elision. Returns null whenever any soundness condition fails, or
 * when no span clears the token-space threshold.
 */
export function anadiplosisPlan(
  text: string,
  enc: EncodingName,
  opts: AnadiplosisOptions = {},
): Plan | null {
  if (opts.anadiplosis === false) return null;
  if (text.length > ANADIPLOSIS_MAX_CHARS) return null;
  // the framing characters must not occur in the source, or the reader cannot
  // tell an emitted span from ordinary text
  if (!text.length) return null;
  let framing: Framing | null = null;
  if (opts.framing) {
    const f = opts.framing;
    if (!text.includes(f[0]) && !text.includes(f[1]) && !text.includes(f[2])) framing = f;
  } else {
    framing = anadiplosisPickFraming(text);
  }
  if (!framing) return null;
  const [OPEN, CLOSE, MARK] = framing;

  const cands = findCandidates(text, enc, ANADIPLOSIS_MAX_SPANS);
  if (!cands.length) return null;
  const minGain = opts.minGainOverride ?? ANADIPLOSIS_MIN_GAIN;
  const chosen = select(text, cands, ANADIPLOSIS_MAX_SPANS, minGain);
  if (!chosen.length) return null;

  const out = applyAll(text, chosen, framing);
  if (out === text) return null;
  // soundness: the transform must be exactly invertible before anything else
  if (anadiplosisUndo(out, framing) !== text) return null;

  let estimated = 0;
  let chars = 0;
  for (const c of chosen) {
    estimated += c.gain - ANADIPLOSIS_OVERHEAD;
    chars += (c.k - 1) * c.p;
  }

  return {
    text: out,
    framing,
    spans: chosen.length,
    chars,
    clause: anadiplosisClauseFor(framing),
    estimated,
  };
}

/** Encode: elide adjacent repeats, then run the stack. Never ships a regression. */
export function anadiplosisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: AnadiplosisOptions = {},
): AnadiplosisResult {
  const base = syncopeEncode(text, enc, opts);
  const plain: AnadiplosisResult = {
    ...base, anadiplosis: false, anadiplosisSpans: 0, anadiplosisChars: 0, anadiplosisClause: '',
    framing: ANADIPLOSIS_DEFAULT_FRAMING,
  };
  const plan = anadiplosisPlan(text, enc, opts);
  if (!plan || plan.estimated <= 0) return plain;

  // The measured gate: encode the whole message both ways, keep the shorter.
  let alt: SyncopeResult;
  try {
    alt = syncopeEncode(plan.text, enc, opts as OikonomiaOptions);
  } catch {
    return plain;
  }
  // The clause ladder: score each wording against the EXACT contract text it
  // produces, not against the clause in isolation.
  const ladder = (opts.clauseLadder && opts.clauseLadder.length)
    ? opts.clauseLadder : [plan.clause];
  let bestTotal = Infinity;
  let bestContract = '';
  let bestClause = '';
  for (const c of ladder) {
    const contract = alt.contract
      ? alt.contract.replace(/; print only\.$/, ` ${c} print only.`)
      : c;
    const delta = countTokens(contract, enc) - countTokens(alt.contract, enc);
    const total = alt.messageTokens + delta;
    if (total < bestTotal) { bestTotal = total; bestContract = contract; bestClause = c; }
  }
  if (bestTotal >= base.messageTokens) return plain;

  return {
    ...alt,
    contract: bestContract,
    messageTokens: bestTotal,
    anadiplosis: true,
    anadiplosisSpans: plan.spans,
    anadiplosisChars: plan.chars,
    anadiplosisClause: bestClause,
    framing: plan.framing,
  };
}

/** Decode: expand the wire, then undo the run-length spans. */
export function anadiplosisDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: { alphabet?: string; marker?: string; marker2?: string; group?: any; framing?: Framing } = {},
): string {
  const expanded = syncopeDecode(wire, cfg, opts);
  return anadiplosisUndo(expanded, opts.framing ?? ANADIPLOSIS_DEFAULT_FRAMING);
}

/** Convenience: encode, decode, verify byte-exactness. */
export function anadiplosisRoundTrip(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: AnadiplosisOptions = {},
): boolean {
  const r = anadiplosisEncode(text, enc, opts);
  if (!r.anadiplosis) return true; // byte-identical to the parent wire
  if (r.winner === 'bootstrap') {
    const mid = symplokeDecode(r.wire, { stats: undefined as any, undo: (w: string) => chironDecode(w) });
    return anadiplosisUndo(mid, r.framing) === text;
  }
  const mid = syncopeDecode(r.wire, {
    stats: r.stats, order: r.order,
    undo: r.parent === 'identity' ? (w: string) => w : chironDecode,
  }, { alphabet: r.alphabet, marker: r.marker, marker2: r.marker2, group: r.syncopeGroup });
  return anadiplosisUndo(mid, r.framing) === text;
}
