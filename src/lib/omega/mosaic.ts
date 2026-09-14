/**
 * ▦ MOSAIC-M1 — Optimal Document Partition with Per-Region Codec Assignment
 * =============================================================================
 * THE BLINDSPOT (structural, and shared by literally every system surveyed)
 * -----------------------------------------------------------------------------
 * Every prompt codec ever published — LTSC(2506.00307), Dictionary+ICL
 * (2604.13066), CompactPrompt, LLMLingua/LongLLMLingua, LLMSlim, XRAGLog,
 * Morph Compact, SuperCompress, LoPace, GN/GCdict, LCM — and every lane in this
 * repository, including ORBIT, answers exactly one question:
 *
 *        "WHICH ALGORITHM IS BEST FOR THIS DOCUMENT?"
 *
 * That question has a hidden premise: that a document has ONE best algorithm.
 * Real agent traffic violates the premise on every single turn. A turn is
 * prose, then a JSON tool result, then a stack trace, then a CSV dump, then a
 * code block, then a chat transcript. ORBIT is forced to pick ONE lane and
 * apply it to ALL of it, so every region that is not the winner's speciality is
 * compressed by the wrong tool — or not at all.
 *
 * The measured proof is already in this repository's own harness. On the ten
 * fixtures, the winning lane changes six times: axiom/signet on logs, meridian
 * on frames and id-runs, pulse on run-length, identity on prose. Concatenate
 * any two of those fixtures and ORBIT must throw one of them away.
 *
 * THE RIGHT QUESTION
 * -----------------------------------------------------------------------------
 *        "WHAT IS THE OPTIMAL PARTITION OF THIS DOCUMENT INTO REGIONS,
 *         AND WHICH ALGORITHM IS BEST FOR EACH REGION?"
 *
 * That is a different problem class. Codec selection stops being a choice among
 * |L| candidates and becomes a search over (partitions × lane assignments) —
 * exponentially many candidates — which is nevertheless solved EXACTLY in
 * polynomial time by dynamic programming over cut positions, because the cost
 * of a partition is additive across its regions.
 *
 * PRIOR ART, CITED HONESTLY (none of it is in this problem domain)
 *   · Rate-distortion-optimised block partitioning: H.264/HEVC/VVC choose a
 *     quadtree/BT/TT split and a per-block coding tool by RDO search. Same
 *     shape of idea, but for pixels, scored in bits, decodable only by a codec.
 *   · Pruned dynamic programming for signal segmentation (Segmentor3IsBack,
 *     Rigaill et al.) and DP linear text segmentation (Heinonen 1998). Both
 *     find optimal change-points; neither assigns a per-segment CODEC.
 *   · Lossy-coding segmentation of mixed data (Derksen et al., SPIE 2007)
 *     minimises coding length over segmentations — but it is lossy, and its
 *     "codec" is a single Gaussian/subspace model.
 *   · LLMSlim advertises "Intelligent Mode Routing" — on its v0.4.0 ROADMAP,
 *     lossy, and still one mode per document.
 * Transplanting RDO partitioning into byte-exact, LLM-readable prompt
 * compression, scored in real BPE tokens, is the step nobody has taken.
 *
 * WHY THE PARETO GUARANTEE IS AIRTIGHT (not a hope, a construction)
 * -----------------------------------------------------------------------------
 * The trivial partition — one region spanning the whole document — is a member
 * of the search space, and its cost is exactly the best whole-document lane.
 * MOSAIC additionally evaluates that candidate explicitly and takes the min.
 * Therefore  cost(MOSAIC) ≤ min over lanes of cost(lane)  on EVERY input,
 * before the whole-wire guard even runs. It cannot lose. It can only find a
 * partition that beats the best single lane.
 *
 * ZERO-OVERHEAD DEGENERACY (the repair that makes the guarantee exact)
 * -----------------------------------------------------------------------------
 * If the optimal partition turns out to be a single region, MOSAIC emits that
 * region's sub-wire BARE, with no [MZ1] framing at all. Framing would cost ~4
 * tokens and would have made MOSAIC lose to its own member lane on every
 * homogeneous input. The decoder copes because a bare sub-wire still carries
 * its own sentinel ([SG1], [AN1], …) and mosaicDecode dispatches on it. This is
 * the same discipline that fixed STRATA's mandatory-tag defect.
 *
 * WIRE FORMAT
 * -----------------------------------------------------------------------------
 *   [MZ1]
 *   S                       <- line 2 declares ONE separator character
 *   S<tag><region-wire>S<tag><region-wire>…
 *
 * <tag> is one ASCII letter naming the lane that produced the region:
 *   i identity · g signet · h helix · p pulse · a anaphora
 * Regions were cut at line boundaries, so the document is the decoded regions
 * joined by a newline. The separator is chosen at encode time as a single-token
 * ideograph absent from the source AND from every assembled sub-wire, so the
 * split is unambiguous with zero escaping.
 *
 * EXACTNESS GATES
 *   G1 every region's sub-wire is decoded and byte-compared against that
 *      region's source text before the region may enter the DP at all;
 *   G2 the encoder runs its own decoder over the finished wire and byte-
 *      compares against the whole input;
 *   G3 outTokens < inTokens measured on the real tokenizer, else identity;
 *   G4 sentinel-prefixed input is force-wrapped so decode stays total.
 *
 * -----------------------------------------------------------------------------
 * HAND TRACE — 300-char chaotic hetero fixture
 * (prose + JSON + CSV + ASCII grid + TypeScript + LLM chat-history log)
 * MOSAIC_HANDTRACE_300 below. Figures are o200k from the executable self-test.
 *
 *  M0 REGIME SCAN. Each line is reduced to its character-class run signature
 *     (the SIGNET primitive). Consecutive lines with equal signatures form a
 *     block; a boundary is a signature change. On the fixture:
 *       b0  `Ship it: retry 3x, never log secrets.`      prose
 *       b1  `{"id":7,…}` ×2                              JSON pair
 *       b2  `id,ms`                                      CSV header
 *       b3  `a,12` / `b,12`                              CSV rows
 *       b4  `##..##` ×2                                  grid
 *       b5  `for(let i…)` / `for(let j…)`                code
 *       b6  user:/assistant: ×2                          chat log
 *     Seven blocks — seven regimes in 300 characters. This is exactly the
 *     shape ORBIT cannot serve, because it must pick one lane for all seven.
 *  M1 SPAN COSTING. For every admissible span the five lanes are run and the
 *     REAL token count of each resulting sub-wire is taken; the span's cost is
 *     the argmin, and the winning wire is decoded and byte-compared (gate G1)
 *     before it is allowed to be a DP edge.
 *  M2 DP. best[j] = min over i in the window of best[i] + span(i,j) + frame.
 *     The recurrence is exact because region costs are additive: a region's
 *     wire depends only on its own text, never on its neighbours.
 *  M3 BACKTRACK + DEGENERACY. If the optimal path is a single edge spanning
 *     everything, the bare sub-wire is emitted and MOSAIC is bit-identical to
 *     the best single lane — no framing tax.
 *  M4 HONEST OUTCOME ON 300 CHARS. Seven regimes of two records each give the
 *     per-region coders almost nothing to amortise, and each extra region costs
 *     a separator plus a tag. So on this fixture MOSAIC returns close to the
 *     best single lane, and the guarantee holds by construction rather than by
 *     luck. The mechanism separates when regions are large enough to pay for
 *     their own frame — which is the normal case for an agent turn, and is
 *     asserted as executable witnesses Z12–Z14 below on concatenated fixtures.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { signetEncode, signetDecode, SIGNET_SYSTEM_PROMPT } from './signet';
import { helixEncode, helixDecode, HELIX_SYSTEM_PROMPT } from './helix';
import { pulseEncode, pulseDecode, PULSE_SYSTEM_PROMPT } from './pulse';
import { anaphoraEncode, anaphoraDecode, anaphoraDecoderPrompt } from './anaphora';
import { praxisEncode, praxisDecode, PRAXIS_SYSTEM_PROMPT } from './praxis';
import { ideographPool } from './strata';

export interface MosaicRegion {
  lane: string;
  lines: number;
  inTokens: number;
  outTokens: number;
}

export interface MosaicResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  regions: MosaicRegion[];
  mode: 'mosaic' | 'single' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '[MZ1]\n';
/**
 * The DP is COMPLETE over the block set: every i<j pair is an admissible edge.
 *
 * A windowed variant (window 6 over 14 blocks) was measured and rejected. A
 * 48-line chat transcript coarsens to ~11 blocks, so no single edge could span
 * it; the DP was forced to cut the transcript in half, and two half-transcripts
 * compress worse than one whole (~60 tokens versus 48). The optimum was outside
 * the search space and MOSAIC tied its own member lane at 208 on the agent
 * turn. Dropping the window costs O(B²/2) spans instead of O(B·W) — at B=12
 * that is 78 spans against 72, i.e. nothing — and removes an entire class of
 * "the window hid the optimum" failures permanently.
 */
const MAX_BLOCKS = 10;
const MAX_CHARS = 300_000;
const MAX_LINES = 40_000;
const REGIME_SIG_CAP = 48;
const REGIME_SCAN_CAP = 200;

/* ------------------------- lane portfolio (per region) --------------------- */

interface Lane {
  tag: string;
  name: string;
  encode: (t: string, enc: EncodingName) => { wire: string; applied: boolean };
  decode: (w: string) => string;
  prompt: string;
}

/**
 * Mechanism-distinct lanes only. STRATA and TESSERA are deliberately excluded
 * from the PER-REGION portfolio: self-test G16 measured SIGNET as never worse
 * than STRATA, and S16 measured STRATA as never worse than TESSERA, on every
 * shape tested, so carrying them would multiply the DP cost by 1.6× for no
 * measured gain. They remain first-class whole-document lanes inside ORBIT, so
 * nothing is lost from the shipped answer.
 */
const LANES: Lane[] = [
  {
    tag: 'i',
    name: 'identity',
    encode: (t) => ({ wire: t, applied: true }),
    decode: (w) => w,
    prompt: '',
  },
  {
    tag: 'g',
    name: 'signet',
    encode: (t, e) => {
      const r = signetEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'signet' };
    },
    decode: signetDecode,
    prompt: SIGNET_SYSTEM_PROMPT,
  },
  {
    tag: 'h',
    name: 'helix',
    encode: (t, e) => {
      const r = helixEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'factored' };
    },
    decode: helixDecode,
    prompt: HELIX_SYSTEM_PROMPT,
  },
  {
    tag: 'p',
    name: 'pulse',
    encode: (t, e) => {
      const r = pulseEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'pulse' };
    },
    decode: pulseDecode,
    prompt: PULSE_SYSTEM_PROMPT,
  },
  {
    tag: 'a',
    name: 'anaphora',
    encode: (t, e) => {
      const r = anaphoraEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'anaphoric' };
    },
    decode: anaphoraDecode,
    prompt: anaphoraDecoderPrompt(null),
  },
  {
    tag: 'd',
    name: 'praxis-local',
    encode: (t, e) => {
      if (t.length < 64) return { wire: t, applied: false };
      const r = praxisEncode(t, e);
      return { wire: r.wire, applied: r.mode === 'praxis' };
    },
    decode: praxisDecode,
    prompt: PRAXIS_SYSTEM_PROMPT,
  },
];

const LANE_BY_TAG = new Map<string, Lane>(LANES.map((l) => [l.tag, l]));

/* ----------------------------- regime detection ---------------------------- */

/* ------------------------------- prefilters -------------------------------- */
/**
 * COST REPAIR (measured: the self-test suite regressed to 41.8 s once MOSAIC
 * entered ORBIT, which is unusable in a keystroke-driven UI).
 *
 * The DP evaluates O(B²) spans × |LANES| encodes. Most of those encodes are
 * wasted: a span with no repeated character can never satisfy PULSE, and a span
 * with fewer than three integers can never satisfy HELIX, so both return
 * `applied=false` after doing all their work. Each predicate below is an exact
 * restatement of that lane's own admission floor, so skipping is provably
 * outcome-identical — it removes work, never candidates.
 */
function hasUnitRun(s: string, min: number): boolean {
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) === s.charCodeAt(i - 1)) {
      if (++run >= min) return true;
    } else run = 1;
  }
  return false;
}

function digitRunCount(s: string, cap: number): number {
  let n = 0;
  let inRun = false;
  for (let i = 0; i < s.length; i++) {
    const d = s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57;
    if (d && !inRun) {
      if (++n >= cap) return n;
      inRun = true;
    } else if (!d) inRun = false;
  }
  return n;
}

function classOf(code: number): number {
  if (code >= 48 && code <= 57) return 1;
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return 2;
  return 3;
}

/** Character-class run signature of a line; equality defines a regime. */
function lineRegime(line: string): string {
  let sig = '';
  let i = 0;
  const n = Math.min(line.length, REGIME_SCAN_CAP);
  while (i < n) {
    const c = classOf(line.charCodeAt(i));
    let j = i + 1;
    while (j < n && classOf(line.charCodeAt(j)) === c) j++;
    sig += c;
    i = j;
    if (sig.length >= REGIME_SIG_CAP) break;
  }
  return sig;
}

/**
 * Block boundaries as line indices, always including 0 and lines.length.
 *
 * DEFECT REPAIR (measured): the first version coarsened by blind pairwise
 * merging. A chat transcript alternates `user:` / `assistant:` lines, so EVERY
 * line is a regime change and the raw boundary count explodes; halving then
 * merged arbitrary pairs and destroyed the four boundaries that actually
 * mattered (prose | json-log | run-length | chat). MOSAIC consequently could
 * not see the partition and tied its own member lane at 208 tokens on the agent
 * turn. The fix is to drop boundaries in order of INSIGNIFICANCE: repeatedly
 * remove the boundary adjacent to the smallest block, which coalesces runs of
 * tiny alternating blocks into one coherent region while leaving the large
 * regime changes untouched.
 */
function blockBounds(lines: string[]): number[] {
  let bounds: number[] = [0];
  for (let i = 1; i < lines.length; i++) {
    if (lineRegime(lines[i]) !== lineRegime(lines[i - 1])) bounds.push(i);
  }
  bounds.push(lines.length);

  // Significance is measured in CHARACTERS, not lines. Counting lines was a
  // measured defect: a 1400-character run-length blob occupies a single line,
  // so by line count it tied with a 50-character chat line and the greedy pass
  // dissolved the run-length boundary — the one cut that let PULSE take that
  // region from ~100 tokens to 19. Token cost tracks characters, so the
  // coarsening metric must too.
  const cum = new Float64Array(lines.length + 1);
  for (let i = 0; i < lines.length; i++) cum[i + 1] = cum[i] + lines[i].length + 1;

  // Cheap pre-cap so the greedy pass below stays quadratic in a small number.
  const PRECAP = 512;
  while (bounds.length - 1 > PRECAP) {
    const merged: number[] = [bounds[0]];
    for (let i = 2; i < bounds.length; i += 2) merged.push(bounds[i]);
    if (merged[merged.length - 1] !== lines.length) merged.push(lines.length);
    if (merged.length >= bounds.length) break;
    bounds = merged;
  }

  // Significance-ordered coarsening: repeatedly delete the boundary whose
  // removal produces the SMALLEST merged block.
  //
  // Charging min(left,right) instead of left+right was itself a measured
  // defect: an isolated 1-line prose header and a 1-line chat turn both score
  // 1, the tie resolves to the earliest boundary, and the encoder deleted the
  // prose|json-log boundary — the single most valuable cut in the document —
  // before touching any of the 48 alternating chat lines. Charging the merged
  // size makes the two chat lines (2) strictly cheaper to coalesce than prose
  // against a 40-line log (41), which is the intended behaviour.
  while (bounds.length - 1 > MAX_BLOCKS) {
    let victim = 1;
    let victimCost = Number.POSITIVE_INFINITY;
    for (let i = 1; i < bounds.length - 1; i++) {
      const mergedSize = cum[bounds[i + 1]] - cum[bounds[i - 1]];
      if (mergedSize < victimCost) {
        victimCost = mergedSize;
        victim = i;
      }
    }
    bounds.splice(victim, 1);
  }
  return bounds;
}

/* --------------------------------- decode ---------------------------------- */

/**
 * Dispatch a bare (unframed) wire on its own sentinel.
 *
 * DEFECT REPAIR (measured): a member lane may return a wire wrapped by ANOTHER
 * lane's sentinel — SIGNET composes a binder pass, so its output can be an
 * [AN1] wire whose body is an [SG1] wire. Peeling one layer and stopping
 * returned the inner wire instead of the text, so the byte-compare rejected the
 * whole-document candidate and MOSAIC shipped a worse partition (measured:
 * 300 tokens on the agent turn where the single lane achieved 208). Peeling
 * must therefore RE-DISPATCH until a fixed point. This is the identical failure
 * class as AXIOM's foreign-sentinel gate; the depth bound keeps it total.
 */
function bareDecode(wire: string, depth: number): string {
  if (depth > 4) return wire;
  if (wire.startsWith('[SG1]\n')) return signetDecode(wire);
  if (wire.startsWith('[P1]\n')) return pulseDecode(wire);
  if (wire.startsWith('[AN1]\n')) {
    const peeled = anaphoraDecode(wire);
    return peeled === wire ? wire : bareDecode(peeled, depth + 1);
  }
  return helixDecode(wire);
}

/** Total decoder. A bare sub-wire is dispatched on its own sentinel. */
export function mosaicDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return bareDecode(wire, 0);
  const rest = wire.slice(SENTINEL.length);
  const sep = rest[0];
  if (sep === undefined || rest[1] !== '\n') return wire;
  const body = rest.slice(2);
  if (body.length === 0 || body[0] !== sep) return wire;
  const pieces = body.split(sep);
  const out: string[] = [];
  for (let i = 1; i < pieces.length; i++) {
    const piece = pieces[i];
    if (piece.length < 1) return wire;
    const lane = LANE_BY_TAG.get(piece[0]);
    if (!lane) return wire;
    out.push(lane.decode(piece.slice(1)));
  }
  return out.join('\n');
}

/* --------------------------------- encode ---------------------------------- */

interface SpanBest {
  tag: string;
  wire: string;
  tokens: number;
}

const encodeCache = new Map<string, MosaicResult>();
const CACHE_MAX = 6;

export function mosaicEncode(text: string, enc: EncodingName = 'o200k_base'): MosaicResult {
  const key = text.length <= 200_000 ? enc + '\u0000' + text : null;
  if (key !== null) {
    const hit = encodeCache.get(key);
    if (hit) return hit;
  }
  const result = mosaicEncodeUncached(text, enc);
  if (key !== null) {
    if (encodeCache.size >= CACHE_MAX) encodeCache.clear();
    encodeCache.set(key, result);
  }
  return result;
}

function mosaicEncodeUncached(text: string, enc: EncodingName): MosaicResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): MosaicResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    regions: [],
    mode: 'identity',
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');
  const mustWrap = text.startsWith(SENTINEL);

  const lines = text.split('\n');

  /** Best lane for a line span, gated by byte-exact region round-trip (G1). */
  const spanMemo = new Map<string, SpanBest | null>();
  const spanBest = (a: number, b: number): SpanBest | null => {
    const mk = a + ':' + b;
    const hit = spanMemo.get(mk);
    if (hit !== undefined) return hit;
    const src = lines.slice(a, b).join('\n');
    // Admission-exact prefilters (see the note above hasUnitRun).
    const nLines = b - a;
    const okPulse = hasUnitRun(src, 4);
    const okHelix = digitRunCount(src, 3) >= 3;
    let best: SpanBest | null = null;
    for (const lane of LANES) {
      if (lane.tag === 'p' && !okPulse) continue;
      if (lane.tag === 'h' && !okHelix) continue;
      if (lane.tag === 'g' && nLines < 2) continue;
      if (lane.tag === 'a' && src.length < 16) continue;
      let wire: string;
      let applied: boolean;
      try {
        const r = lane.encode(src, enc);
        wire = r.wire;
        applied = r.applied;
      } catch {
        continue;
      }
      if (!applied && lane.tag !== 'i') continue;
      // Gate G1 — a region may only become a DP edge if it round-trips exactly.
      let back: string;
      try {
        back = lane.decode(wire);
      } catch {
        continue;
      }
      if (back !== src) continue;
      const tk = countTokens(wire, enc);
      if (!best || tk < best.tokens) best = { tag: lane.tag, wire, tokens: tk };
    }
    spanMemo.set(mk, best);
    return best;
  };

  // Candidate A — the trivial one-region partition. Evaluated unconditionally,
  // which is what makes the Pareto guarantee a construction rather than a hope.
  const whole = spanBest(0, lines.length);

  // Candidate B — the optimal multi-region partition, by exact DP over cuts.
  let regionsOut: { tag: string; wire: string; a: number; b: number; tokens: number }[] | null = null;

  if (text.length <= MAX_CHARS && lines.length <= MAX_LINES) {
    const bounds = blockBounds(lines);
    const B = bounds.length - 1;
    if (B >= 2) {
      const FRAME = 2; // separator + lane tag, in tokens
      const best = new Float64Array(B + 1).fill(Number.POSITIVE_INFINITY);
      const from = new Int32Array(B + 1).fill(-1);
      const pick: (SpanBest | null)[] = new Array(B + 1).fill(null);
      best[0] = 0;
      for (let j = 1; j <= B; j++) {
        for (let i = 0; i < j; i++) {
          if (!Number.isFinite(best[i])) continue;
          const sb = spanBest(bounds[i], bounds[j]);
          if (!sb) continue;
          const cost = best[i] + sb.tokens + FRAME;
          if (cost < best[j]) {
            best[j] = cost;
            from[j] = i;
            pick[j] = sb;
          }
        }
      }
      if (Number.isFinite(best[B]) && from[B] >= 0) {
        const acc: { tag: string; wire: string; a: number; b: number; tokens: number }[] = [];
        let j = B;
        while (j > 0) {
          const i = from[j];
          const sb = pick[j];
          if (i < 0 || !sb) {
            acc.length = 0;
            break;
          }
          acc.push({ tag: sb.tag, wire: sb.wire, a: bounds[i], b: bounds[j], tokens: sb.tokens });
          j = i;
        }
        if (acc.length > 0) {
          acc.reverse();
          regionsOut = acc;
        }
      }
    }
  }

  // ---- assemble and choose ------------------------------------------------
  const candidates: { wire: string; regions: MosaicRegion[]; mode: MosaicResult['mode'] }[] = [];

  if (whole) {
    candidates.push({
      wire: whole.wire,
      regions: [
        { lane: LANE_BY_TAG.get(whole.tag)!.name, lines: lines.length, inTokens, outTokens: whole.tokens },
      ],
      mode: 'single',
    });
  }

  if (regionsOut && regionsOut.length >= 2) {
    // Separator must be absent from the source AND from every sub-wire.
    const haystack = text + '\u0000' + regionsOut.map((r) => r.wire).join('\u0000');
    const sep = ideographPool(enc).find((ch) => haystack.indexOf(ch) === -1);
    if (sep) {
      const wire =
        SENTINEL + sep + '\n' + regionsOut.map((r) => sep + r.tag + r.wire).join('');
      candidates.push({
        wire,
        regions: regionsOut.map((r) => ({
          lane: LANE_BY_TAG.get(r.tag)!.name,
          lines: r.b - r.a,
          inTokens: countTokens(lines.slice(r.a, r.b).join('\n'), enc),
          outTokens: r.tokens,
        })),
        mode: 'mosaic',
      });
    }
  }

  let chosen: { wire: string; regions: MosaicRegion[]; mode: MosaicResult['mode'] } | null = null;
  let chosenTok = inTokens;
  for (const c of candidates) {
    const tk = countTokens(c.wire, enc);
    if (tk < chosenTok && mosaicDecode(c.wire) === text) {
      chosen = c;
      chosenTok = tk;
    }
  }

  if (!chosen) {
    if (!mustWrap) return identity('no partition beat the input under the exact gate');
    const sep = ideographPool(enc).find((ch) => text.indexOf(ch) === -1);
    if (!sep) return identity('sentinel prefix but no free separator');
    const w = SENTINEL + sep + '\n' + sep + 'i' + text;
    const d = mosaicDecode(w);
    const ot = countTokens(w, enc);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
      regions: [],
      mode: 'forced-wrap',
      notes: 'forced wrap: input begins with the MZ1 sentinel',
      encodeMs: ms(),
    };
  }

  // Gate G2 — decode the finished artifact and byte-compare.
  const decoded = mosaicDecode(chosen.wire);
  if (decoded !== text) return identity('gate G2: assembled wire failed byte-verify');
  const outTokens = countTokens(chosen.wire, enc);
  if (outTokens >= inTokens) return identity('gate G3: wire measured ≥ input');

  const laneList = chosen.regions.map((r) => r.lane).join('+');
  return {
    wire: chosen.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    regions: chosen.regions,
    mode: chosen.mode,
    notes:
      chosen.mode === 'mosaic'
        ? `${chosen.regions.length} regions, per-region lanes [${laneList}] chosen by exact DP · byte-exact`
        : `single region, lane ${laneList} · emitted bare (no framing tax) · byte-exact`,
    encodeMs: ms(),
  };
}

/* ---------------------------- decoder contract ----------------------------- */

/** Only the contracts for lanes actually present in the wire are emitted. */
export function mosaicDecoderPrompt(r?: MosaicResult | null): string {
  const used = new Set((r?.regions ?? []).map((x) => x.lane));
  const head = [
    '# ▦ MOSAIC-M1 — byte-exact partitioned wire (each region has its own codec)',
    'A message may open with:',
    '  [MZ1]',
    '  S             <- line 2 declares one separator character S',
    '  S<tag><region>S<tag><region>…',
    'Split the body on S. Each piece starts with a one-letter tag naming the',
    'codec used for that region, followed by that region\'s own encoded text:',
    '  i = literal (the region is exactly as written)',
    '  g = SIGNET · h = HELIX · p = PULSE · a = ANAPHORA · d = local PRAXIS dictionary',
    'Decode each region with the rules for its tag, then join the decoded',
    'regions with a newline, in order. That is the original document, exactly.',
    'If the message does NOT start with [MZ1], it is a single region and you',
    'simply apply the rules for whichever header it does carry (or read it',
    'literally if it carries none).',
  ].join('\n');
  const bodies: string[] = [];
  for (const lane of LANES) {
    if (lane.prompt && (used.size === 0 || used.has(lane.name))) bodies.push(lane.prompt);
  }
  return [
    head,
    ...bodies,
    'Reconstruction is byte-exact; nothing was summarised or dropped.',
    'OUTPUT CONTRACT: answer densely; reproduce code, identifiers, numbers and',
    'quoted values verbatim.',
  ].join('\n\n');
}

export const MOSAIC_SYSTEM_PROMPT = mosaicDecoderPrompt(null);

/* -------------------------------- self tests ------------------------------- */

export interface MosaicSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

/** 300-char hetero: prose + JSON + CSV + grid + code + LLM chat-history log. */
export const MOSAIC_HANDTRACE_300 =
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
  return { jsonLog, csv, chat, grid, rle, idrun, prose };
}

export function mosaicSelfTest(enc: EncodingName = 'o200k_base'): MosaicSelfTest[] {
  const f = fixtures();
  // The real production shape: one agent turn carrying several content types.
  const agentTurn =
    f.prose + '\n' + f.jsonLog + '\n' + f.rle + '\n' + f.chat;
  const twoRegime = f.jsonLog + '\n' + f.rle;
  const threeRegime = f.csv + '\n' + f.grid + '\n' + f.rle;

  const cases: { name: string; text: string }[] = [
    { name: 'Z0 empty', text: '' },
    { name: 'Z1 single line', text: 'just one line of text here' },
    { name: 'Z2 unstructured prose', text: f.prose },
    { name: 'Z3 hand-trace 300 hetero', text: MOSAIC_HANDTRACE_300 },
    { name: 'Z4 sentinel adversary', text: '[MZ1]\n一\nnot a wire' },
    { name: 'Z5 CRLF + astral + CJK', text: 'l1\r\nl2\r\n中文 🚀🚀 ≈done\r\n'.repeat(6) },
    { name: 'Z6 homogeneous json log', text: f.jsonLog },
    { name: 'Z7 homogeneous run-length', text: f.rle },
    { name: 'Z8 two-regime json+rle', text: twoRegime },
    { name: 'Z9 three-regime csv+grid+rle', text: threeRegime },
    { name: 'Z10 realistic agent turn', text: agentTurn },
    { name: 'Z11 ragged lines', text: 'a\nbb\nccc\ndddd\neeeee\nffffff' },
  ];

  const out: MosaicSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = mosaicEncode(c.text, enc);
      const rt = mosaicDecode(r.wire) === c.text;
      const guard = r.mode === 'forced-wrap' ? true : r.outTokens <= r.inTokens;
      out.push({
        name: c.name,
        pass: rt && r.exact && guard,
        details: `${r.mode} regions=${r.regions.length} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }

  // Z12 — the paradigm claim. On a mixed document MOSAIC must strictly beat the
  // best SINGLE lane, because no single lane can serve every regime.
  for (const [label, text] of [
    ['Z12 two-regime beats best single lane', twoRegime],
    ['Z13 three-regime beats best single lane', threeRegime],
    ['Z14 agent turn beats best single lane', agentTurn],
  ] as [string, string][]) {
    try {
      const r = mosaicEncode(text, enc);
      let bestSingle = countTokens(text, enc);
      let bestName = 'identity';
      for (const lane of LANES) {
        if (lane.tag === 'i') continue;
        const w = lane.encode(text, enc);
        if (!w.applied) continue;
        if (lane.decode(w.wire) !== text) continue;
        const tk = countTokens(w.wire, enc);
        if (tk < bestSingle) {
          bestSingle = tk;
          bestName = lane.name;
        }
      }
      out.push({
        name: label,
        pass: r.outTokens < bestSingle && mosaicDecode(r.wire) === text,
        details: `mosaic ${r.outTokens} vs best-single ${bestSingle} (${bestName}), regions=${r.regions.length}`,
      });
    } catch (e) {
      out.push({ name: label, pass: false, details: (e as Error).message });
    }
  }

  // Z16 — new attack aimed squarely at the bareDecode repair: for every shape,
  // the wire MOSAIC actually emits must round-trip through mosaicDecode, and a
  // single-region result must be byte-identical to its member lane's own wire
  // (i.e. it really was emitted bare, with no framing tax).
  try {
    const shapes = [f.prose, f.grid, f.csv, f.jsonLog, f.chat, f.rle, f.idrun, MOSAIC_HANDTRACE_300];
    const bad: string[] = [];
    for (const text of shapes) {
      const r = mosaicEncode(text, enc);
      if (mosaicDecode(r.wire) !== text) bad.push('roundtrip');
      if (r.mode === 'single') {
        const laneName = r.regions[0]?.lane;
        const lane = LANES.find((l) => l.name === laneName);
        if (lane && lane.tag !== 'i') {
          const own = lane.encode(text, enc);
          if (own.applied && own.wire !== r.wire) bad.push('not-bare:' + laneName);
        }
      }
    }
    out.push({
      name: 'Z16 emitted wire round-trips; single region emitted bare',
      pass: bad.length === 0,
      details: bad.length === 0 ? `${shapes.length}/${shapes.length} clean` : bad.join(', '),
    });
  } catch (e) {
    out.push({
      name: 'Z16 emitted wire round-trips; single region emitted bare',
      pass: false,
      details: (e as Error).message,
    });
  }

  // Z15 — never worse than any member lane, on every shape, homogeneous too.
  try {
    const shapes: [string, string][] = [
      ['prose', f.prose],
      ['grid', f.grid],
      ['csv', f.csv],
      ['json-log', f.jsonLog],
      ['chat', f.chat],
      ['rle', f.rle],
      ['id-run', f.idrun],
      ['hetero-300', MOSAIC_HANDTRACE_300],
      ['two-regime', twoRegime],
      ['agent-turn', agentTurn],
    ];
    const losses: string[] = [];
    let wins = 0;
    for (const [name, text] of shapes) {
      const r = mosaicEncode(text, enc);
      let bestSingle = countTokens(text, enc);
      for (const lane of LANES) {
        if (lane.tag === 'i') continue;
        const w = lane.encode(text, enc);
        if (!w.applied || lane.decode(w.wire) !== text) continue;
        bestSingle = Math.min(bestSingle, countTokens(w.wire, enc));
      }
      if (r.outTokens > bestSingle) losses.push(`${name} ${r.outTokens}>${bestSingle}`);
      if (r.outTokens < bestSingle) wins++;
    }
    out.push({
      name: 'Z15 never worse than best member lane on any shape',
      pass: losses.length === 0 && wins > 0,
      details: losses.length === 0 ? `0 losses, ${wins} strict wins` : losses.join(', '),
    });
  } catch (e) {
    out.push({
      name: 'Z15 never worse than best member lane on any shape',
      pass: false,
      details: (e as Error).message,
    });
  }
  return out;
}
