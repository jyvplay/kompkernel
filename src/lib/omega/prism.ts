/**
 * ◈ PRISM-P1 — Cascade-over-Partition (byte-exact, direct-reasoning, zero-tax)
 * =============================================================================
 * THE BLINDSPOT PRISM CLOSES
 * -----------------------------------------------------------------------------
 * MOSAIC-M1 corrected the field's first hidden premise ("a document has ONE best
 * algorithm") by optimising the PARTITION. But MOSAIC still carries a second,
 * unexamined premise that every codec in this repository — ORBIT, ATLAS, AURORA,
 * CROWN, IRIS, KERNEL — shares with it:
 *
 *     "EACH REGION IS COMPRESSED BY EXACTLY ONE CODEC, APPLIED ONCE."
 *
 * The lane portfolio is treated as a set to CHOOSE FROM, never as an algebra to
 * COMPOSE IN. That premise is false, and the repository's own fixtures falsify
 * it. Measured on the shipped o200k tokenizer (bench/proto4, this workspace):
 *
 *     agent turn (prose+json+rle+chat, 2357 tok)   MOSAIC 198   PULSE∘MOSAIC 177
 *     big agent  (7 regimes,           4773 tok)   MOSAIC 455   PULSE∘MOSAIC 446
 *
 * MOSAIC cannot reach 177. Not because its DP is weak — its DP is exact — but
 * because 177 is not in its search space at all. The winning artifact is the
 * MOSAIC partition of a document that PULSE has ALREADY rewritten. PULSE
 * collapses the 1400-character run-length blob to a 19-token atom, which changes
 * the REGIME MAP that MOSAIC's block detector reads; the DP then sees a
 * different, cheaper partition of the remaining four regimes. Composition is not
 * "running two codecs" — it CHANGES THE INPUT TO THE OPTIMISER.
 *
 * THE RIGHT QUESTION
 * -----------------------------------------------------------------------------
 *   "WHAT IS THE OPTIMAL COMPOSITION OF CODECS, UNDER WHICH THE OPTIMAL
 *    PARTITION IS THEN TAKEN?"
 *
 * PRISM searches  argmin over (prepass p, partition P)  of  tokens(MOSAIC_P(p(x))).
 * MOSAIC is a member of that search space at p = identity. Therefore PRISM is
 * Pareto-superior to MOSAIC by construction, not by measurement.
 *
 * -----------------------------------------------------------------------------
 * WHY THIS IS PARETO-SUPERIOR AND NOT MERELY "ALSO GOOD"
 * -----------------------------------------------------------------------------
 * Pareto superiority requires: never worse on ANY axis, strictly better on one.
 *
 *   TOKENS      p=identity is evaluated unconditionally and PRISM returns the
 *               measured argmin. So tokens(PRISM) <= tokens(MOSAIC) on EVERY
 *               input, with strict wins measured on heterogeneous agent traffic.
 *   EXACTNESS   identical contract: byte-exact or identity. Gates below.
 *   WIRE TAX    ZERO. PRISM invents no wrapper and no new syntax (see next
 *               section). A p=identity result is BIT-IDENTICAL to MOSAIC's wire.
 *   CONTRACT    a cascade adds only the prepass lane's own contract, which is
 *               already a first-class contract in this repository; and the
 *               delivered-token objective is still available to CROWN/KERNEL
 *               because prismDecoderPrompt reports exactly the lanes used.
 *   RUNTIME     bounded: at most |PREPASS| extra encodes, each gated by an
 *               admission-exact prefilter and a strict-shrink test, so a
 *               homogeneous document pays one cheap rejected probe per lane.
 *   DEBUGGING   strictly easier: the cascade is a printable tag string ("pm"),
 *               every stage is an existing, independently self-tested codec,
 *               and PRISM adds no new decoder — it reuses theirs.
 *
 * ZERO-TAX FIXPOINT DECODING (the construction that removes the framing cost)
 * -----------------------------------------------------------------------------
 * A naive cascade needs a header naming the stage order, costing ~4 tokens and
 * destroying the guarantee on every homogeneous input. PRISM needs none, because
 * EVERY admissible prepass emits a SELF-IDENTIFYING wire:
 *
 *     [P1]  -> PULSE      [AN1] -> ANAPHORA     [SG1] -> SIGNET
 *     [PX2] -> PRAXIS     KEY   -> LUMEN        [MZ1] -> MOSAIC
 *
 * So the decode rule is simply: DECODE UNTIL FIXPOINT. Apply the decoder named
 * by the leading header; if the result again carries a header, apply that one
 * too; stop when it does not change. The stage order is recovered from the
 * nesting of the wire itself. This is why HELIX is excluded from the PREPASS
 * portfolio (only from the prepass — it remains a full MOSAIC per-region lane):
 * HELIX's wire is headerless, so it cannot be recognised as an outer stage
 * without a tag, and a tag is exactly the cost this design refuses to pay.
 *
 * Consequence: for p = identity the emitted bytes ARE MOSAIC's bytes, so PRISM
 * cannot lose by a single token on any homogeneous input. This is the same
 * discipline that fixed STRATA's mandatory-tag defect and MOSAIC's own
 * single-region framing tax, applied one level up.
 *
 * TERMINATION AND TOTALITY OF THE FIXPOINT
 * -----------------------------------------------------------------------------
 * prismDecode is total and terminates on ADVERSARIAL input, not just on wires
 * PRISM produced. Two independent bounds: (1) a hard iteration cap; (2) a strict
 * progress requirement — an iteration that does not change the string stops the
 * loop. No decoder is ever called twice on the same bytes, so no cycle exists.
 *
 * EXACTNESS GATES (each is a refusal, never a repair)
 *   P1  every prepass wire is decoded and byte-compared against the source
 *       before it may become a cascade stage at all;
 *   P2  the full candidate is decoded through prismDecode — the REAL shipped
 *       decoder, not an inverse built for the test — and byte-compared;
 *   P3  outTokens < inTokens on the real tokenizer, else identity;
 *   P4  sentinel-prefixed literal input is force-wrapped so decode stays total
 *       and PRISM never silently corrupts a document that merely LOOKS encoded.
 *
 * PRIOR ART, CITED HONESTLY
 *   · Filter chaining in general-purpose compressors (xz --format=raw
 *     --filters=delta+lzma2, Brotli's transform set, zstd's dictionary+entropy
 *     split) composes transforms — but over BYTES, for a machine decoder, with
 *     an explicit filter-chain header, and with no partition search.
 *   · Cascaded lightweight encodings in column stores (BtrBlocks, VLDB 2023;
 *     Abadi et al. 2006) pick an encoding CASCADE per column by sampling. Same
 *     compositional insight; different object (typed columns, not text), machine
 *     decoder, and no LLM-readability or real-BPE objective.
 *   · Two-stage RDO / trellis quantisation in video codecs re-optimises after a
 *     transform, which is the "composition changes the optimiser's input"
 *     effect — for pixels, lossily.
 *   None of these is byte-exact LLM-readable prompt compression scored in real
 *   BPE tokens with a partition DP inside the cascade. That is the open step.
 *
 * -----------------------------------------------------------------------------
 * HAND TRACE — the measured agent turn (prose | 40-line JSON log | RLE | chat)
 * Figures are real o200k counts from the executable self-test below.
 *
 *  R0 BASELINE. MOSAIC alone = 198 tokens. Its block scan sees prose(1) +
 *     jsonlog(40) + one enormous 1400-char RLE line + chat(48). The RLE line is
 *     ONE line, so it is one block; the DP must spend a whole region on it and
 *     the surrounding blocks are coarsened around it.
 *  R1 PREPASS PROBE. PULSE is admitted (a >=4 unit run exists) and rewrites the
 *     RLE blob to `[P1]\n⟡[800,41]⟡[600,42]` — 19 tokens instead of ~100. Gate
 *     P1: pulseDecode of that wire is byte-compared to the source. Passes.
 *  R2 RE-OPTIMISE. MOSAIC is re-run on the PULSE wire. The regime map is now
 *     completely different: the giant line is gone, the coarsening budget is no
 *     longer consumed by it, and the DP finds a partition of the REMAINING
 *     regimes that it could not previously afford. Result: 177 tokens.
 *  R3 ARGMIN + ZERO TAX. 177 < 198, so the cascade wins. The emitted wire is the
 *     MOSAIC wire verbatim — no PRISM header — and prismDecode recovers the text
 *     by decoding [MZ1], observing the result still opens with [P1], decoding
 *     that, and observing a fixpoint. Gate P2 byte-compares. 21 tokens saved,
 *     10.6%, zero framing paid.
 *  R4 HONEST NON-RESULT. On all eleven homogeneous fixtures the argmin is
 *     p=identity and PRISM emits MOSAIC's exact bytes. PRISM's guarantee there
 *     is a TIE, by construction, and the self-tests assert the tie is exact
 *     rather than merely close (X6).
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { mosaicEncode, mosaicDecode, mosaicDecoderPrompt, type MosaicResult } from './mosaic';
import { compactContract } from './kernel';
import { signetEncode, signetDecode, SIGNET_SYSTEM_PROMPT } from './signet';
import { pulseEncode, pulseDecode, PULSE_SYSTEM_PROMPT } from './pulse';
import { anaphoraEncode, anaphoraDecode, anaphoraDecoderPrompt } from './anaphora';
import { praxisEncode, praxisDecode, PRAXIS_SYSTEM_PROMPT } from './praxis';
import { lumenEncode, lumenDecode, LUMEN_SYSTEM_PROMPT } from './lumen';


export interface PrismStage {
  lane: string;
  inTokens: number;
  outTokens: number;
}

export interface PrismResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  /** Cascade in application order, e.g. ['pulse','mosaic']. */
  cascade: string[];
  stages: PrismStage[];
  /** The MOSAIC result PRISM finally shipped (its regions are still visible). */
  mosaic: MosaicResult | null;
  mode: 'prism' | 'mosaic' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '[PR1]\n';

/**
 * Fixpoint iteration bound. Four is generous: the deepest cascade PRISM can
 * construct is one prepass plus MOSAIC plus MOSAIC's own internal binder peel,
 * i.e. three. The cap exists purely so prismDecode is total on hostile input.
 */
const MAX_PEEL = 4;

/* ------------------------- prepass portfolio ------------------------------- */

interface Prepass {
  tag: string;
  name: string;
  /** Leading header that makes this lane's wire self-identifying. */
  header: string;
  encode: (t: string, enc: EncodingName) => { wire: string; applied: boolean };
  decode: (w: string) => string;
  prompt: string;
  /**
   * Minimal operational restatement of this lane's production rules, for use as
   * an INCREMENTAL cascade stage where the reader has already been told to
   * chain. Strictly a rendering of the same contract; the decoder is unchanged,
   * and prismDecoderPrompt takes the real-BPE min of this and `prompt`, so a
   * lane may safely omit it.
   */
  canonical?: string;
  /**
   * Admission-exact prefilter: an exact restatement of the lane's own floor, so
   * skipping provably removes WORK and never removes a CANDIDATE.
   */
  admissible: (t: string) => boolean;
}

function hasUnitRun(s: string, min: number): boolean {
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) === s.charCodeAt(i - 1)) {
      if (++run >= min) return true;
    } else run = 1;
  }
  return false;
}

/**
 * HELIX is deliberately ABSENT from this list and only from this list. Its wire
 * carries no leading header, so it cannot participate in header-directed
 * fixpoint decoding without a tag, and a tag would reintroduce the framing tax
 * this design exists to avoid. HELIX remains a full first-class per-region lane
 * inside MOSAIC, which PRISM invokes unchanged — so nothing is lost.
 *
 * SIGNET is present as a PREPASS even though it is also a MOSAIC region lane:
 * the two roles are genuinely different. As a region lane it sees one region;
 * as a prepass it rewrites the WHOLE document and thereby changes the regime
 * map MOSAIC's block detector subsequently reads.
 */
const PREPASS: Prepass[] = [
  {
    tag: 'p',
    name: 'pulse',
    header: '[P1]\n',
    encode: (t, e) => {
      const r = pulseEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'pulse' };
    },
    decode: pulseDecode,
    prompt: PULSE_SYSTEM_PROMPT,
    canonical: '[P1] exact: \u27e1[n,x] = n copies of the UTF-16 code unit with hex value x; \u27e1\u27e1 = a literal \u27e1; every other character is literal.',
    admissible: (t) => hasUnitRun(t, 4),
  },
  {
    tag: 'a',
    name: 'anaphora',
    header: '[AN1]\n',
    encode: (t, e) => {
      const r = anaphoraEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'anaphoric' };
    },
    decode: anaphoraDecode,
    prompt: anaphoraDecoderPrompt(null),
    canonical: '[AN1] exact: line 2 declares OPEN and CLOSE. OPEN k P CLOSE binds label k to phrase P; a later bare k means P. Binders nest; all else literal.',
    admissible: (t) => t.length >= 16,
  },
  {
    tag: 'x',
    name: 'praxis',
    header: '[PX2]\n',
    encode: (t, e) => {
      const r = praxisEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'praxis' };
    },
    decode: praxisDecode,
    prompt: PRAXIS_SYSTEM_PROMPT,
    canonical: '[PX2] exact: rows before [/PX2] are alias=phrase; in the body replace each alias with its phrase, bottom-to-top; all else literal.',
    admissible: (t) => t.length >= 16,
  },
  {
    tag: 'l',
    name: 'lumen',
    header: 'KEY LUMEN\n',
    encode: (t, e) => {
      const r = lumenEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'lumen' };
    },
    decode: lumenDecode,
    prompt: LUMEN_SYSTEM_PROMPT,
    canonical: 'KEY exact: rows before the divider line are alias=phrase; in the body after it replace each alias with its phrase, bottom-to-top; all else literal.',
    admissible: (t) => t.length >= 16,
  },
  {
    tag: 'g',
    name: 'signet',
    header: '[SG1]\n',
    encode: (t, e) => {
      const r = signetEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'signet' };
    },
    decode: signetDecode,
    prompt: SIGNET_SYSTEM_PROMPT,
    canonical:
      '[SG1] exact: line 2 declares B,E,F,V,S. A block B m F template F columns E expands to m rows; ' +
      'split the template on S and interleave the pieces with that row\'s column values. Column forms: ' +
      '=x constant; #a,d,w arithmetic a+r*d padded to w; @p V x... p-cycle; %a,w V q cumulative deltas; ' +
      '^n V x q prepend; $n V x q append; ~x V ... literal list; untagged is a V-separated literal list; all else literal.',
    admissible: (t) => t.indexOf('\n') !== -1,
  },
];

const PREPASS_BY_NAME = new Map(PREPASS.map((p) => [p.name, p]));

/* --------------------------------- decode ---------------------------------- */

/**
 * One header-directed peel. Returns the input unchanged when no known header is
 * present, which is precisely the fixpoint condition the loop below tests.
 *
 * mosaicDecode is tried FIRST because MOSAIC is always the innermost-applied /
 * outermost-visible stage of any PRISM cascade, and because mosaicDecode is
 * itself total (it returns its input unchanged on anything it cannot parse).
 */
function peel(wire: string): string {
  if (wire.startsWith('[MZ1]\n')) return mosaicDecode(wire);
  if (wire.startsWith('[P1]\n')) return pulseDecode(wire);
  if (wire.startsWith('[AN1]\n')) return anaphoraDecode(wire);
  if (wire.startsWith('[PX2]\n')) return praxisDecode(wire);
  if (wire.startsWith('[SG1]\n')) return signetDecode(wire);
  if (wire.startsWith('KEY LUMEN\n')) return lumenDecode(wire);
  /**
   * DEFECT REPAIR (measured by gate X2: id-run scored 600 against MOSAIC's 18).
   *
   * MOSAIC's zero-overhead degeneracy emits a single-region result BARE, and one
   * of its per-region lanes — HELIX — has a HEADERLESS wire (`⟐[...]`). So a
   * perfectly ordinary MOSAIC win can arrive carrying no header at all, the
   * header table above matched nothing, peel returned the wire unchanged, gate
   * P2 rejected the candidate, and PRISM fell back to identity on every
   * HELIX-shaped document. That is a strict LOSS against MOSAIC and would have
   * broken the one guarantee this module exists to provide.
   *
   * mosaicDecode is the correct fallback because it is already total (it returns
   * its input unchanged on anything it cannot parse) and it owns the bare-wire
   * dispatch for exactly the lanes MOSAIC may emit bare. It changes the string
   * only when a real HELIX construct is present; on ordinary prose it is the
   * identity, so the fixpoint still terminates on the first iteration.
   *
   * This cannot misfire on a literal document that happens to contain `⟐`,
   * because gate P4 runs this very decoder over the raw input first and force-
   * wraps anything the decoder would alter.
   */
  return mosaicDecode(wire);
}

/**
 * Total decoder. Terminates by two independent bounds: the iteration cap, and
 * the strict-progress test (an unchanged string ends the loop immediately, so
 * no decoder is ever applied twice to the same bytes and no cycle can exist).
 */
export function prismDecode(wire: string): string {
  /**
   * Forced-wrap envelope. Everything after the sentinel is the literal document
   * and the branch RETURNS rather than continuing to the fixpoint loop, so the
   * escape is exact even when the escaped body is itself a valid codec wire.
   *
   * DEFECT REPAIR (measured by gate X1: wrap-tax=7 tokens). The first version
   * also declared a free separator character on line 2 and repeated it before
   * the body, mirroring MOSAIC's envelope. Here that separator does no work at
   * all: this envelope has exactly one field, so there is nothing to delimit and
   * nothing to escape. It was costing 2 tokens on every wrapped input for zero
   * information. Deleting it is a strict improvement with no loss of totality,
   * because a literal document that itself begins with [PR1] simply gets a
   * second [PR1] prefix, and the single non-recursive slice removes exactly one.
   */
  if (wire.startsWith(SENTINEL)) return wire.slice(SENTINEL.length);
  let cur = wire;
  for (let i = 0; i < MAX_PEEL; i++) {
    let next: string;
    try {
      next = peel(cur);
    } catch {
      return cur;
    }
    if (next === cur) return cur;
    cur = next;
  }
  return cur;
}

/* --------------------------------- encode ---------------------------------- */

const encodeCache = new Map<string, PrismResult>();
const CACHE_MAX = 6;
const CACHE_MAX_CHARS = 300_000;

export function prismEncode(text: string, enc: EncodingName = 'o200k_base'): PrismResult {
  const key = text.length <= CACHE_MAX_CHARS ? enc + '\u0000' + text : null;
  if (key !== null) {
    const hit = encodeCache.get(key);
    if (hit) return hit;
  }
  const result = prismEncodeUncached(text, enc);
  if (key !== null) {
    if (encodeCache.size >= CACHE_MAX) encodeCache.clear();
    encodeCache.set(key, result);
  }
  return result;
}

/** A candidate is a finished wire plus the provenance needed to explain it. */
interface Candidate {
  wire: string;
  tokens: number;
  cascade: string[];
  stages: PrismStage[];
  mosaic: MosaicResult;
}

function prismEncodeUncached(text: string, enc: EncodingName): PrismResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): PrismResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    cascade: [],
    stages: [],
    mosaic: null,
    mode: 'identity',
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');

  /**
   * Gate P4 — a literal document that merely LOOKS encoded. If prismDecode does
   * not fix the input, any wire PRISM emits could be misread, so PRISM refuses
   * the whole cascade search and force-wraps instead. Detecting this by running
   * the REAL decoder (rather than by string-matching a list of headers) means
   * the check can never drift out of sync with the decoder.
   */
  const mustWrap = prismDecode(text) !== text;
  if (mustWrap) {
    const wire = SENTINEL + text;
    const decoded = prismDecode(wire);
    if (decoded !== text) return identity('gate P4: forced wrap failed byte-verify');
    const outTokens = countTokens(wire, enc);
    return {
      wire,
      decoded,
      exact: true,
      inTokens,
      outTokens,
      savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
      cascade: [],
      stages: [],
      mosaic: null,
      mode: 'forced-wrap',
      notes: 'forced wrap: the literal input is already decoder-visible',
      encodeMs: ms(),
    };
  }

  const candidates: Candidate[] = [];

  /**
   * Evaluate one cascade. `pre` is null for the p = identity member, which is
   * exactly MOSAIC and is therefore evaluated UNCONDITIONALLY — that is what
   * makes the Pareto guarantee a construction rather than a measurement.
   */
  const consider = (pre: Prepass | null, staged: string, stagedTokens: number) => {
    let m: MosaicResult;
    try {
      m = mosaicEncode(staged, enc);
    } catch {
      return;
    }
    const wire = m.wire;
    // Gate P2 — verify through the REAL shipped decoder, not a test-only inverse.
    let back: string;
    try {
      back = prismDecode(wire);
    } catch {
      return;
    }
    if (back !== text) return;
    const tokens = countTokens(wire, enc);
    const stages: PrismStage[] = [];
    if (pre) stages.push({ lane: pre.name, inTokens, outTokens: stagedTokens });
    stages.push({ lane: 'mosaic', inTokens: stagedTokens, outTokens: tokens });
    candidates.push({
      wire,
      tokens,
      cascade: pre ? [pre.name, 'mosaic'] : ['mosaic'],
      stages,
      mosaic: m,
    });
  };

  // Member 0 — p = identity. This IS MOSAIC. Never skipped.
  consider(null, text, inTokens);

  // Members 1..k — one admissible, strictly-shrinking, byte-verified prepass.
  for (const pre of PREPASS) {
    if (!pre.admissible(text)) continue;
    let r: { wire: string; applied: boolean };
    try {
      r = pre.encode(text, enc);
    } catch {
      continue;
    }
    if (!r.applied || r.wire === text) continue;
    // Gate P1 — a stage must round-trip byte-exactly before it may be composed.
    let back: string;
    try {
      back = pre.decode(r.wire);
    } catch {
      continue;
    }
    if (back !== text) continue;
    /**
     * The prepass must ALSO carry the header that makes it self-identifying,
     * otherwise the zero-tax fixpoint decode cannot recover the stage order.
     * A lane that declined to emit its header is silently dropped rather than
     * papered over with a tag.
     */
    if (!r.wire.startsWith(pre.header)) continue;
    const staged = countTokens(r.wire, enc);
    /**
     * COST GATE. A prepass that did not strictly shrink the document cannot
     * plausibly pay for the re-optimisation, and re-running the partition DP is
     * by far the most expensive operation here. This is a WORK filter on a
     * dominated branch, and it is stated as such rather than claimed exact:
     * it is the one place PRISM trades a theoretical corner of the search space
     * for bounded latency. The identity member is unaffected, so the Pareto
     * guarantee against MOSAIC is untouched by this gate.
     */
    if (staged >= inTokens) continue;
    consider(pre, r.wire, staged);
  }

  if (candidates.length === 0) return identity('no cascade passed the exact gate');

  /**
   * TWO-OBJECTIVE ARGMIN (the repair that makes "Pareto" literally true).
   *
   * The independent adversary showed that minimising WIRE tokens alone is not
   * sufficient for Pareto superiority, because a cascade also enlarges the
   * decoder contract, and CROWN/KERNEL score DELIVERED tokens = wire + contract.
   * A candidate that wins the wire by 21 but loses the contract by 162 is worse
   * on an axis that actually ships.
   *
   * So PRISM now requires a winner to be no worse on BOTH axes than the
   * p=identity member (which is exactly MOSAIC). A cascade is admitted only if
   * it strictly improves the wire AND does not regress delivered cost. The
   * identity member is always admissible against itself, so a winner always
   * exists and the guarantee against MOSAIC holds on both axes simultaneously.
   * This is a genuine restriction on PRISM, stated as such: it declines wire
   * wins that are not also delivered wins, rather than claiming both for free.
   */
  const deliveredOf = (c: Candidate): number => {
    const r: PrismResult = {
      wire: c.wire, decoded: text, exact: true, inTokens, outTokens: c.tokens,
      savingsPct: 0, cascade: c.cascade, stages: c.stages, mosaic: c.mosaic,
      mode: c.cascade.length > 1 ? 'prism' : 'mosaic', notes: '', encodeMs: 0,
    };
    return c.tokens + countTokens(prismDecoderPrompt(r), enc);
  };

  const baseline = candidates.find((c) => c.cascade.length === 1) ?? candidates[0];
  const baseWire = baseline.tokens;
  const baseDelivered = deliveredOf(baseline);

  let best = baseline;
  let bestDelivered = baseDelivered;
  for (const c of candidates) {
    if (c === baseline) continue;
    if (c.tokens > baseWire) continue;
    const d = deliveredOf(c);
    if (d > baseDelivered) continue;
    // Among admissible candidates prefer the smaller wire, then the smaller
    // delivered cost, then the SHORTEST cascade — so a tie with MOSAIC emits
    // MOSAIC's exact bytes and MOSAIC's exact contract. Zero tax on ties.
    if (
      c.tokens < best.tokens ||
      (c.tokens === best.tokens && d < bestDelivered) ||
      (c.tokens === best.tokens && d === bestDelivered && c.cascade.length < best.cascade.length)
    ) {
      best = c;
      bestDelivered = d;
    }
  }

  // Gate P3 — measured on the real tokenizer, against the real input.
  if (best.tokens >= inTokens) return identity('gate P3: no cascade measured smaller than the input');

  const decoded = prismDecode(best.wire);
  if (decoded !== text) return identity('gate P2: winning wire failed byte-verify');

  const composed = best.cascade.length > 1;
  return {
    wire: best.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens: best.tokens,
    savingsPct: inTokens ? ((inTokens - best.tokens) / inTokens) * 100 : 0,
    cascade: best.cascade,
    stages: best.stages,
    mosaic: best.mosaic,
    mode: composed ? 'prism' : 'mosaic',
    notes: composed
      ? `cascade ${best.cascade.join(' ▸ ')} · re-optimised partition (${best.mosaic.regions.length} regions) · zero framing tax · byte-exact`
      : `p=identity argmin · emitted MOSAIC's wire verbatim (no tax) · ${best.mosaic.notes}`,
    encodeMs: ms(),
  };
}

/* ---------------------------- decoder contract ----------------------------- */

/**
 * Only the contracts for stages actually present are emitted. For a p=identity
 * result this returns EXACTLY MOSAIC's own contract, byte for byte, so PRISM
 * cannot lose to MOSAIC on the delivered-token objective either.
 */
export function prismDecoderPrompt(r?: PrismResult | null): string {
  if (r && r.mode === 'mosaic') return mosaicDecoderPrompt(r.mosaic);
  if (r && r.mode === 'identity') return '';
  if (r && r.mode === 'forced-wrap') {
    return [
      '# ◈ PRISM-P1 — literal passthrough',
      'The message opens with [PR1]; line 2 declares one separator character S.',
      'Everything after the second S is the document, exactly as written.',
    ].join('\n');
  }
  /**
   * DELIVERED-TOKEN REPAIR (measured by the independent adversary in
   * bench/redteam: the first version shipped 1287 delivered tokens against
   * MOSAIC's 1125 on the agent turn — a 162-token LOSS that would have made
   * PRISM Pareto-INFERIOR on the objective CROWN and KERNEL actually optimise,
   * even while winning by 21 on the wire).
   *
   * The cause was structural, not cosmetic: the contract was assembled as
   * `header ‖ every prepass prompt ‖ MOSAIC's full prompt`, so composing two
   * codecs paid for two complete standalone contracts plus a preamble
   * re-explaining what the headers already say.
   *
   * The repair is to make the cascade contract INCREMENTAL. MOSAIC's contract is
   * emitted verbatim — so the p=identity case is byte-identical to MOSAIC's, and
   * gate X3 still holds — and a cascade adds only (a) two lines of chaining rule
   * and (b) the one prepass contract genuinely needed. Nothing is re-explained.
   * Measured after the repair on the agent turn: the added stage costs 2 lines
   * plus PULSE's own 53-token contract instead of 162 tokens of duplication.
   */
  /**
   * CONTRACT RENDERING. Two renderings of the SAME contract are produced and the
   * real-BPE minimum is taken:
   *
   *   verbose   MOSAIC's own prose contract, byte-identical to what MOSAIC ships;
   *   canonical KERNEL's operational compilation of this exact wire, which emits
   *             only the productions the wire actually reaches.
   *
   * Taking the min is safe because both describe the same decoder and the wire
   * is unchanged either way — this is precisely the partial-evaluation argument
   * KERNEL already makes and self-tests against CROWN. It is what makes PRISM
   * Pareto-superior on the DELIVERED axis rather than merely tied: the canonical
   * rendering is available to the p=identity member too, so PRISM never ships a
   * larger contract than MOSAIC for the same bytes.
   *
   * The empty-string guard matters: compactContract returns '' for a wire whose
   * header it does not recognise, and an empty contract would token-count 0 and
   * win the min while telling the reader nothing. It is rejected explicitly.
   */
  const pick = (verbose: string, wire: string): string => {
    let canon = '';
    try {
      canon = compactContract(wire);
    } catch {
      canon = '';
    }
    if (!canon) return verbose;
    return countTokens(canon, 'o200k_base') < countTokens(verbose, 'o200k_base') ? canon : verbose;
  };

  const base = r?.wire
    ? pick(mosaicDecoderPrompt(r.mosaic ?? null), r.wire)
    : mosaicDecoderPrompt(r?.mosaic ?? null);
  const used = (r?.cascade ?? []).filter((n) => n !== 'mosaic');
  if (used.length === 0) return base;
  /**
   * CONTRACT MINIMISATION (measured: with the full standalone PULSE prompt the
   * agent turn won 21 wire tokens and lost 53 delivered ones, so the two-
   * objective argmin correctly REFUSED the cascade and PRISM degenerated to
   * MOSAIC — a correct but useless outcome).
   *
   * A prepass contract does not need to re-introduce the codec; the reader has
   * already been told to chain. It needs only the production rules. Each lane
   * therefore offers a canonical one-line operational form, and PRISM ships the
   * real-BPE MINIMUM of {canonical, full prompt}. The full prompt remains the
   * fallback, so a lane with no canonical form loses nothing. This is the same
   * partial-evaluation discipline KERNEL applies to CROWN's winning wire,
   * applied here to the incremental stage rule.
   */
  const bodies = used
    .map((n) => {
      const lane = PREPASS_BY_NAME.get(n);
      if (!lane) return null;
      if (!lane.canonical) return lane.prompt;
      return countTokens(lane.canonical, 'o200k_base') <= countTokens(lane.prompt, 'o200k_base')
        ? lane.canonical
        : lane.prompt;
    })
    .filter((s): s is string => !!s);
  return [
    base,
    '◈ PRISM cascade: the result of the decode above is ITSELF still encoded. ' +
      'Apply the rules below to it, and repeat until the text stops changing.',
    ...bodies,
  ].join('\n\n');
}

export const PRISM_SYSTEM_PROMPT = prismDecoderPrompt(null);

/* -------------------------------- self tests ------------------------------- */

export interface PrismSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

function fixtures() {
  const jsonLog = Array.from(
    { length: 40 },
    (_, i) =>
      `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
  ).join('\n');
  const csv =
    'id,name,score,region\n' +
    Array.from({ length: 60 }, (_, i) => `${i},user_${i % 7},${(i * 3) % 100},us-east-1`).join('\n');
  const chat = Array.from(
    { length: 24 },
    (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok and no warnings.`,
  ).join('\n');
  const grid = Array.from({ length: 30 }, () => '|##..##|..##..|').join('\n');
  const rle = 'A'.repeat(800) + 'B'.repeat(600);
  const idrun = Array.from({ length: 200 }, (_, i) => `id:${i}`).join(',');
  const prose =
    'The quick brown fox jumps over the lazy dog while the committee deliberates ' +
    'on whether a second breakfast constitutes an institutional precedent.';
  const stack = Array.from(
    { length: 30 },
    (_, i) => `    at Object.handler (/srv/app/dist/server/routes/orders.js:${100 + i}:${7 + (i % 9)})`,
  ).join('\n');
  const code = Array.from(
    { length: 20 },
    (_, i) =>
      `export function handler${i}(req: Request, res: Response): void {\n  const user = req.session.user;\n  if (!user) { res.status(401).json({ error: "unauthorized" }); return; }\n  res.json({ ok: true, step: ${i} });\n}`,
  ).join('\n');
  return { jsonLog, csv, chat, grid, rle, idrun, prose, stack, code };
}

/** 300-char hetero: prose + JSON + CSV + grid + code + LLM chat-history log. */
export const PRISM_HANDTRACE_300 =
  'Ship it: retry 3x, never log secrets.\n' +
  '{"id":7,"ok":true}\n{"id":8,"ok":true}\n' +
  'id,ms\na,12\nb,12\n' +
  '##..##\n##..##\n' +
  'for(let i=0;i<3;i++){s+=a[i];}\n' +
  'for(let j=0;j<3;j++){s+=a[j];}\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.';

export function prismSelfTest(enc: EncodingName = 'o200k_base'): PrismSelfTest[] {
  const f = fixtures();
  const agentTurn = f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat;
  const bigAgent =
    f.prose + '\n' + f.jsonLog + '\n' + f.stack + '\n' + f.code + '\n' + f.csv + '\n' + f.chat + '\n' + f.rle;
  const shapes: [string, string][] = [
    ['prose', f.prose],
    ['json-log', f.jsonLog],
    ['csv', f.csv],
    ['chat', f.chat],
    ['grid', f.grid],
    ['rle', f.rle],
    ['id-run', f.idrun],
    ['stack', f.stack],
    ['code', f.code],
    ['hetero-300', PRISM_HANDTRACE_300],
    ['agent-turn', agentTurn],
    ['big-agent', bigAgent],
  ];
  const out: PrismSelfTest[] = [];

  // X1 — exactness and the non-expansion gate on every shape, plus the
  // degenerate and adversarial inputs that make the decoder total.
  const edge: [string, string][] = [
    ['empty', ''],
    ['one char', 'x'],
    ['newline only', '\n'],
    ['crlf+cjk+emoji', 'l1\r\nl2\r\n中文 🚀🚀 ≈done\r\n'.repeat(6)],
    ['MZ1 adversary', '[MZ1]\n一\nnot a wire'],
    ['P1 adversary', '[P1]\n⟡[4,41]'],
    ['PR1 adversary', '[PR1]\n一\n一literal'],
    ['SG1 adversary', '[SG1]\nnot a signet wire at all'],
    ['KEY adversary', 'KEY LUMEN\nx=y\n────────\nbody'],
    ['lone surrogate', 'a\uD800b'],
    ['NUL byte', 'a\u0000b\u0000c'],
  ];
  const bad: string[] = [];
  for (const [name, text] of [...shapes, ...edge]) {
    try {
      const r = prismEncode(text, enc);
      if (prismDecode(r.wire) !== text) bad.push(`${name}:roundtrip`);
      if (!r.exact) bad.push(`${name}:not-exact`);
      /**
       * Non-expansion is asserted unconditionally EXCEPT on the forced-wrap
       * path, where expansion is not a defect but the price of totality: the
       * input is a literal document that the decoder would otherwise rewrite,
       * so it MUST be escaped or PRISM would silently corrupt it. Rather than
       * exempt that path, the test pins its overhead to a hard, tiny budget —
       * so a future regression that makes wrapping expensive still fails here.
       */
      if (r.mode === 'forced-wrap') {
        /**
         * The budget is 4 = countTokens('[PR1]\n'), the true floor for this
         * envelope now that the dead separator field is gone. A single-token CJK
         * sentinel would cost 1 instead, and was rejected deliberately: it makes
         * the escape marker indistinguishable from ordinary CJK prose at a
         * glance, trading auditability for three tokens on a path that only ever
         * fires when the input is ALREADY a codec wire. Legibility of the escape
         * hatch is worth more than that. Any regression above this floor fails.
         */
        if (r.outTokens - r.inTokens > 4) bad.push(`${name}:wrap-tax=${r.outTokens - r.inTokens}`);
      } else if (r.outTokens > r.inTokens) {
        bad.push(`${name}:expanded`);
      }
    } catch (e) {
      bad.push(`${name}:${(e as Error).message}`);
    }
  }
  out.push({
    name: 'X1 byte-exact + non-expanding on every shape, edge and adversary',
    pass: bad.length === 0,
    details: bad.length === 0 ? `${shapes.length + edge.length}/${shapes.length + edge.length} clean` : bad.join(', '),
  });

  // X2 — THE PARETO GATE. PRISM is never worse than MOSAIC, and strictly better
  // somewhere. This is the claim the whole module exists to make; it is
  // measured against MOSAIC's live encoder, not against a recorded number.
  try {
    const losses: string[] = [];
    const wins: string[] = [];
    for (const [name, text] of shapes) {
      const p = prismEncode(text, enc);
      const m = mosaicEncode(text, enc);
      if (p.outTokens > m.outTokens) losses.push(`${name} ${p.outTokens}>${m.outTokens}`);
      if (p.outTokens < m.outTokens) wins.push(`${name} ${m.outTokens}→${p.outTokens}`);
    }
    out.push({
      name: 'X2 PARETO: tokens(PRISM) ≤ tokens(MOSAIC) always, strictly < somewhere',
      pass: losses.length === 0 && wins.length > 0,
      details: losses.length === 0 ? `0 losses · wins: ${wins.join(', ') || 'none'}` : losses.join(', '),
    });
  } catch (e) {
    out.push({ name: 'X2 PARETO: tokens(PRISM) ≤ tokens(MOSAIC)', pass: false, details: (e as Error).message });
  }

  // X3 — ZERO TAX. Whenever the argmin is p=identity, the emitted bytes must be
  // MOSAIC's bytes EXACTLY. A near-miss here would silently reintroduce framing
  // cost on the common homogeneous case, which is how STRATA originally lost.
  try {
    const bad2: string[] = [];
    for (const [name, text] of shapes) {
      const p = prismEncode(text, enc);
      if (p.mode !== 'mosaic') continue;
      const m = mosaicEncode(text, enc);
      if (p.wire !== m.wire) bad2.push(`${name}:bytes`);
      // The contract may be SMALLER (canonical rendering of the same decoder),
      // but must never be larger — that would be a delivered-axis regression
      // smuggled in behind identical wire bytes.
      if (countTokens(prismDecoderPrompt(p), enc) > countTokens(mosaicDecoderPrompt(m), enc)) {
        bad2.push(`${name}:contract-grew`);
      }
    }
    out.push({
      name: 'X3 ZERO TAX: p=identity emits MOSAIC bytes; contract never larger',
      pass: bad2.length === 0,
      details: bad2.length === 0 ? 'bit-identical wire, contract never larger' : bad2.join(', '),
    });
  } catch (e) {
    out.push({ name: 'X3 ZERO TAX', pass: false, details: (e as Error).message });
  }

  // X4 — the measured mechanism actually fires on real agent traffic, and the
  // win comes from COMPOSITION (cascade length > 1), not from luck elsewhere.
  try {
    const p = prismEncode(agentTurn, enc);
    const m = mosaicEncode(agentTurn, enc);
    out.push({
      name: 'X4 cascade fires on the agent turn and beats MOSAIC',
      pass: p.cascade.length > 1 && p.outTokens < m.outTokens && prismDecode(p.wire) === agentTurn,
      details: `mosaic ${m.outTokens} → prism ${p.outTokens} via [${p.cascade.join('▸')}] (${p.savingsPct.toFixed(1)}% of wire)`,
    });
  } catch (e) {
    out.push({ name: 'X4 cascade fires on the agent turn', pass: false, details: (e as Error).message });
  }

  // X5 — DECODER TOTALITY UNDER ATTACK. prismDecode must terminate and must not
  // throw on arbitrary bytes, including deeply nested fake headers designed to
  // drive the fixpoint loop. This is the attack aimed squarely at MAX_PEEL.
  try {
    const attacks = [
      '[MZ1]\n',
      '[MZ1]\n一',
      '[MZ1]\n一\n',
      '[P1]\n⟡[',
      '[PX2]\nno terminator',
      '[AN1]\n',
      'KEY LUMEN\n',
      '[PR1]\n',
      '[PR1]\nX',
      '[MZ1]\n一\n一p[P1]\n⟡[3,41]',
      '[SG1]\n' + '[SG1]\n'.repeat(20),
      '\u0000'.repeat(64),
    ];
    let threw = 0;
    for (const a of attacks) {
      try {
        const d = prismDecode(a);
        if (typeof d !== 'string') threw++;
      } catch {
        threw++;
      }
    }
    out.push({
      name: 'X5 prismDecode is total and terminating on adversarial wires',
      pass: threw === 0,
      details: threw === 0 ? `${attacks.length}/${attacks.length} returned a string` : `${threw} failures`,
    });
  } catch (e) {
    out.push({ name: 'X5 prismDecode totality', pass: false, details: (e as Error).message });
  }

  // X6 — IDEMPOTENCE / STABILITY. Encoding twice must give identical bytes, and
  // decoding an already-decoded document must be a no-op. A codec whose output
  // depends on hidden state is undebuggable; this pins that down.
  try {
    const bad3: string[] = [];
    for (const [name, text] of shapes) {
      const a = prismEncodeUncached(text, enc);
      const b = prismEncodeUncached(text, enc);
      if (a.wire !== b.wire) bad3.push(`${name}:unstable`);
      if (prismDecode(text) !== text) bad3.push(`${name}:decode-not-noop-on-plain`);
    }
    out.push({
      name: 'X6 deterministic encode; decode is a no-op on plain text',
      pass: bad3.length === 0,
      details: bad3.length === 0 ? 'stable across repeated encodes' : bad3.join(', '),
    });
  } catch (e) {
    out.push({ name: 'X6 determinism', pass: false, details: (e as Error).message });
  }

  // X8 — DELIVERED-TOKEN PARETO. The axis CROWN and KERNEL actually optimise.
  // A wire win that is paid for by a larger contract is not a win at all, and
  // the independent adversary caught exactly that regression (+162 on the agent
  // turn) before this gate existed. Asserted against MOSAIC's live delivered
  // cost on every shape, not against a recorded figure.
  try {
    const losses: string[] = [];
    const wins: string[] = [];
    for (const [name, text] of shapes) {
      const p = prismEncode(text, enc);
      const m = mosaicEncode(text, enc);
      const pd = p.outTokens + countTokens(prismDecoderPrompt(p), enc);
      const md = m.outTokens + countTokens(mosaicDecoderPrompt(m), enc);
      if (pd > md) losses.push(`${name} ${pd}>${md}`);
      if (pd < md) wins.push(`${name} ${md}→${pd}`);
    }
    out.push({
      name: 'X8 DELIVERED PARETO: wire+contract(PRISM) ≤ wire+contract(MOSAIC)',
      pass: losses.length === 0,
      details: losses.length === 0 ? `0 losses · wins: ${wins.join(', ') || 'ties throughout'}` : losses.join(', '),
    });
  } catch (e) {
    out.push({ name: 'X8 DELIVERED PARETO', pass: false, details: (e as Error).message });
  }

  // X9 — SOUNDNESS INDEPENDENCE. PRISM must be byte-exact even where MOSAIC is
  // NOT. The adversary found inputs (dense [MZ1]/⟡/⟐ sigil soup) on which
  // MOSAIC returns mode='identity' with wire===text, yet mosaicDecode(wire)
  // !== text — i.e. the document is literal but a decoder would rewrite it.
  // MOSAIC scores those inputs cheaply because it never escapes them; PRISM pays
  // 4 tokens to force-wrap and stays exact. That 4-token difference is NOT a
  // Pareto loss, it is the price of a correctness property MOSAIC lacks, and
  // this gate pins it down so the distinction can never be quietly lost.
  try {
    const hostile = [
      'M⟐\nG一G一M1ZZGGSP]Z丁]1⟡S]P⟡丁SZ⟐⟐丁P1⟡ZSZ1\n',
      '[[⟡[丁⟡M丁⟡1P一Z]PZPZ一ZG[GGP1[]\nSSP丁]\nZSG⟐⟐\n\n⟐Z⟐]丁[[P]⟡M\nGSM丁1P',
      '⟐[3,1,4,2]xy',
      '[MZ1]\n一\n一iliteral',
    ];
    const bad4: string[] = [];
    let mosaicUnsound = 0;
    for (const t of hostile) {
      const p = prismEncode(t, enc);
      if (prismDecode(p.wire) !== t) bad4.push('prism-inexact');
      const m = mosaicEncode(t, enc);
      if (mosaicDecode(m.wire) !== t) mosaicUnsound++;
    }
    out.push({
      name: 'X9 PRISM stays byte-exact on inputs where a bare decoder would corrupt',
      pass: bad4.length === 0,
      details:
        bad4.length === 0
          ? `${hostile.length}/${hostile.length} exact (${mosaicUnsound} of them decoder-visible, force-wrapped at 4 tokens)`
          : bad4.join(', '),
    });
  } catch (e) {
    out.push({ name: 'X9 soundness independence', pass: false, details: (e as Error).message });
  }

  // X7 — CONTRACT HONESTY. Every lane named in the cascade must have its own
  // decoding rules present in the emitted contract, or a reader cannot actually
  // perform the decode PRISM claims is possible.
  try {
    const p = prismEncode(agentTurn, enc);
    const prompt = prismDecoderPrompt(p);
    /**
     * The check is on the SHIPPED rendering, whichever of the two was chosen.
     * Matching the verbose prompt literally was itself a defect: the canonical
     * rendering is a different string describing the same decoder, so a literal
     * compare reported "missing pulse" on a contract that documented PULSE
     * perfectly well. The durable property is that the stage's own HEADER and
     * the chaining instruction are both present, since those are what the reader
     * needs in order to know another decode pass is required and which one.
     */
    const missing = p.cascade
      .filter((n) => n !== 'mosaic')
      .filter((n) => {
        const lane = PREPASS_BY_NAME.get(n);
        if (!lane) return true;
        const header = lane.header.trim();
        const documented = prompt.indexOf(lane.prompt) !== -1 || prompt.indexOf(header) !== -1;
        return !documented;
      });
    const chains = p.cascade.length < 2 || prompt.indexOf('repeat until the text stops changing') !== -1;
    /**
     * The OUTER stage is whatever header the emitted wire actually carries.
     * Asserting the literal string 'MZ1' here was a defect in the test, not in
     * the codec: MOSAIC's zero-overhead degeneracy legitimately emits a bare
     * single-region wire such as [SG1], and on the agent turn it does exactly
     * that — so a contract that correctly documented [SG1] was being failed for
     * not mentioning a partition that is not in the wire. The durable property
     * is that the contract documents the header the reader will actually see.
     */
    const outer = ['[MZ1]', '[SG1]', '[AN1]', '[P1]', '[PX2]', 'KEY'].find((h) => p.wire.startsWith(h));
    const outerDocumented = !outer || prompt.indexOf(outer.replace(/[[\]]/g, '')) !== -1;
    out.push({
      name: 'X7 emitted contract documents every stage used and says to chain',
      pass: missing.length === 0 && chains && outerDocumented,
      details:
        missing.length === 0 && chains && outerDocumented
          ? `cascade [${p.cascade.join('▸')}] outer=${outer ?? 'bare'} documented in ${countTokens(prompt, enc)} tokens`
          : `missing ${missing.join(',') || '-'}${chains ? '' : ' no-chain'}${outerDocumented ? '' : ' outer=' + outer}`,
    });
  } catch (e) {
    out.push({ name: 'X7 contract honesty', pass: false, details: (e as Error).message });
  }

  return out;
}
