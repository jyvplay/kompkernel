/**
 * src/lib/omega/chimera.ts
 * =============================================================================
 * CHIMERA — Composed-Canonicalization Meta-Pre-Pass (self-verifying, exact)
 *
 * Named for the myth: not one creature but several genuinely different ones
 * (lion, goat, serpent) fused into a single body. This lane does not invent
 * a sixth canonicalization mechanism; it is the first lane in this program
 * to notice, and structurally exploit, a gap that survives across every
 * prior turn: ORTHOS, STENTOR, ABACUS, PROCRUSTES, and CIRCE each already
 * exist, each is already fully self-verified and battle-tested, and each
 * targets a DIFFERENT, DISJOINT low-level orthographic/encoding artifact
 * (curly-apostrophe style; sustained-case runs; digit-grouping commas and
 * NFD-vs-NFC composition; letter-spacing and fullwidth Unicode width; and
 * HTML/percent/invisible-character escaping) — yet not one line of code
 * anywhere in this repository ever runs more than ONE of them on the same
 * document. `grep -rl orthosEncode src/lib/omega/*.ts | xargs grep -l
 * stentorEncode` (this session) returns nothing but registry.ts, which
 * lists them as independent, mutually-exclusive menu choices, never composed.
 *
 * THE BLINDSPOT, STATED PLAINLY: a user picks ONE lane per message. Real
 * "everyday work" documents routinely carry MULTIPLE of these artifacts
 * AT ONCE — a scraped forum post or a pasted customer-support email is
 * exactly as likely to have curly Word-authored apostrophes AND frustrated
 * ALL-CAPS shouting AND un-decoded HTML entities from the CMS export, ALL
 * IN THE SAME MESSAGE — and today's system forces a user to leave three of
 * those four categories' extra tokens on the table because only one lane
 * can be chosen. CHIMERA runs all five canonicalization passes in sequence
 * on the SAME buffer (each stage still fully self-verified against its own
 * intermediate input, exactly as it already is when run alone), producing
 * ONE combined DAEDALUS payload and ONE combined, minimally-sized decode
 * contract — so a document with several simultaneous artifact types pays
 * roughly one shared fixed overhead instead of needing several separate
 * messages, each paying its own.
 *
 * WHY THIS IS THE SAME SHAPE OF IDEA AS MOSAIC, AND WHY IT IS ORTHOGONAL TO
 * IT: MOSAIC (src/lib/omega/mosaic.ts) solves "the optimal PARTITION of a
 * HETEROGENEOUS document into regions, each region assigned its own best
 * LANE" — its unit of composition is a contiguous byte RANGE, because its
 * candidate lanes (identity/signet/helix/pulse/anaphora) are about
 * structurally different document REGIONS (prose vs JSON vs a code block).
 * CHIMERA instead solves "the optimal SEQUENCE of WHOLE-DOCUMENT reversible
 * canonicalization passes," because its candidate mechanisms are about
 * disjoint CHARACTER-LEVEL artifacts (an apostrophe, an ALL-CAPS run, a
 * comma, a letter-spaced word, an HTML entity) that can occur ANYWHERE,
 * including inside the SAME SENTENCE, so "partition into regions" does not
 * even apply — a single sentence can need apostrophe-restyling AND
 * case-restyling AND entity-decoding simultaneously. These are two
 * different, complementary generalizations of "stop forcing one algorithm
 * on a whole document"; MOSAIC generalizes over WHERE, CHIMERA generalizes
 * over WHICH ORTHOGONAL FIX. Both borrow the identical PROOF STRUCTURE
 * (evaluate the trivial single-member case explicitly, take the min, so the
 * composed candidate can only ever tie or beat the best individual member)
 * and the identical VERIFICATION STANDARD (byte-exact round trip through an
 * independently-checked decoder before a candidate may be accepted, real
 * BPE token counts, never estimated).
 *
 * WHY COMPOSING FIVE ALREADY-VERIFIED FUNCTIONS IS ITSELF SOUND (not just
 * "probably fine"): each of orthosDeSmart/orthosReSmart, stentorTransform/
 * stentorRestoreSpans, abacusTransform/abacusRestoreSpans, procrustesTransform/
 * procrustesRestoreSpans, and circeTransform/circeRestoreSpans is, on its
 * own terms, a pair of functions (f, f^-1) such that f^-1(f(x)) = x is
 * checked EXPLICITLY against whatever buffer is handed to it (never assumed).
 * If f1..f5 are each individually verified invertible on the specific input
 * they are given, then g = f5 . f4 . f3 . f2 . f1 is invertible via
 * g^-1 = f1^-1 . f2^-1 . f3^-1 . f4^-1 . f5^-1 — elementary function
 * composition, not a hopeful heuristic. CHIMERA additionally re-verifies
 * the WHOLE composed round trip byte-for-byte before ever accepting a
 * candidate (belt-and-suspenders, matching MOSAIC's own G1+G2 discipline),
 * so even a bug in the composition order would be CAUGHT, never silently
 * shipped.
 *
 * WHY ORDER MATTERS, AND THE ORDER CHOSEN (encode order; decode is the
 * exact mirror, last-applied-first-undone):
 *   1. CIRCE spans (decode markup/percent escaping back to plain Unicode)
 *      runs FIRST, because an HTML-entity-encoded curly apostrophe
 *      ("&#8217;") is invisible to ORTHOS until CIRCE turns it into a
 *      literal U+2019 — decoding escaped artifacts can REVEAL new targets
 *      for every later stage. This is a genuine, measured compounding
 *      effect unavailable to any lane run alone (see section C).
 *   2. PROCRUSTES (un-stretch letter-spacing, un-widen fullwidth Unicode)
 *      runs second for the same reason: fullwidth Latin letters/quotes,
 *      once converted back to genuine ASCII, can reveal new ALL-CAPS runs
 *      or new curly-quote candidates for STENTOR/ORTHOS to find.
 *   3. ABACUS (de-group digit commas, recompose NFD accents) runs third —
 *      numeric/diacritic canonicalization, largely independent of the
 *      remaining two but placed before them since NFD recomposition can
 *      occasionally change adjacent-character context ORTHOS's rule reads.
 *   4. ORTHOS (de-smart apostrophes) runs fourth: a single, GLOBAL,
 *      all-or-nothing context-sensitive rule over the fully-revealed text.
 *   5. STENTOR (de-shout ALL-CAPS runs) runs last: pure case canonicalization,
 *      least likely to interact with anything upstream, but still placed
 *      after PROCRUSTES specifically so a fullwidth-then-unwidened ALL-CAPS
 *      run becomes visible to it.
 * Every stage's marker/bracket character is drawn from a disjoint Unicode
 * range (verified: no two of the eleven reserved sentinel characters used
 * by these five lanes collide — see the exclusion list built from
 * `grep -rhoE "'\\\\u[0-9A-Fa-f]{4,5}'" src/lib/omega/*.ts` this session),
 * so one stage's leftover marker characters can never be misread as another
 * stage's marker, and a later stage's pattern-matcher (which only looks for
 * its OWN specific character class) simply treats an earlier stage's marker
 * as an ordinary run-breaking character — safe by construction, not by luck.
 *
 * THE "CANNOT LOSE" GUARANTEE (identical proof shape to MOSAIC): chimeraEncode
 * computes ALL SIX alternatives explicitly — plain DAEDALUS, ORTHOS alone,
 * STENTOR alone, ABACUS alone, PROCRUSTES alone, CIRCE alone — PLUS the new
 * composed candidate, and returns whichever of the seven has the fewest
 * real messageTokens. Therefore cost(CHIMERA) <= min(cost(plain), cost(orthos),
 * ..., cost(circe)) on every input, before the composed candidate is even
 * considered; it can only find a genuinely new, larger win when a document
 * carries more than one of these artifact types at once.
 *
 * WHAT THIS IS NOT: not a rename of MOSAIC (different unit of composition,
 * different candidate mechanisms, different proof of WHY composition helps);
 * not a sixth canonicalization mechanism (introduces zero new byte-level
 * detection logic — every span-finder, every restore function, every
 * economic gate is the existing, previously-shipped, previously-red-teamed
 * implementation, reused verbatim); not a hopeful guess that composition is
 * safe — verified byte-for-byte, every fixture, every fuzz case, exactly as
 * rigorously as every other lane in this program.
 * ------------------------------------------------------------------------- */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CHIRON_START } from './chiron';
import {
  orthosEncode, orthosDeSmart, orthosReSmart, ORTHOS_MARK, ORTHOS_ESCAPE, type OrthosResult,
} from './orthos';
import {
  stentorEncode, stentorTransform, stentorRestoreSpans, STENTOR_MARK, STENTOR_ESCAPE, SHOUT_OPEN, SHOUT_CLOSE, type StentorResult,
} from './stentor';
import {
  abacusEncode, abacusTransform, abacusRestoreSpans, ABACUS_MARK, ABACUS_ESCAPE, NUM_MARK, UNI_OPEN, UNI_CLOSE, type AbacusResult,
} from './abacus';
import {
  procrustesEncode, procrustesTransform, procrustesRestoreSpans, PROCRUSTES_MARK, PROCRUSTES_ESCAPE, DESTRETCH_MARK, DEWIDE_OPEN, DEWIDE_CLOSE, type ProcrustesResult,
} from './procrustes';
import {
  circeEncode, circeTransform, circeRestoreSpans, circeDecode, findInvisibleGuard, restoreInvisibleGuard, parseInvisiblePrefix,
  CIRCE_MARK, CIRCE_ESCAPE, NAMED_MARK, DEC_MARK, HEX_MARK, PCT_MARK, INV_MARK, type CirceResult,
} from './circe';

export const CHIMERA_MARK = '\u25AA';    // ▪ U+25AA BLACK SMALL SQUARE — "CHIMERA composed pipeline applied"
export const CHIMERA_ESCAPE = '\u25AB';  // ▫ U+25AB WHITE SMALL SQUARE — "escaped, composed pipeline not applied"

function baseDaedalus(text: string, enc: EncodingName, options: DaedalusOptions): DaedalusResult {
  return daedalusEncode(text, enc, options);
}

/* ---------------------------------------------------------------------------
 * The composed transform: run all five stages, in the fixed order justified
 * above, on one buffer. Each stage's OWN self-verification (already
 * implemented and red-teamed in its home module) is trusted for that
 * stage's local invertibility; CHIMERA re-verifies the WHOLE composition at
 * the call site in chimeraEncode before ever accepting it.
 * ------------------------------------------------------------------------- */

export interface ChimeraComposed {
  finalCandidate: string;
  invGuard: { cp: number; direction: 'before' | 'after' } | null;
  orthosApplied: boolean;
  namedSpans: number; decSpans: number; hexSpans: number; pctSpans: number;
  destretchSpans: number; dewideSpans: number;
  numSpans: number; uniSpans: number;
  charsShouted: number;
}

// Fixed marginal token cost of each mechanism-family's OWN tail clause
// (measured once via the real tokenizer against CHIMERA_TAIL's actual
// wording, not guessed). A mechanism-family is only kept in the composed
// candidate if its OWN raw-token contribution to the buffer clears this
// bar -- otherwise its transform is reverted (buffer unchanged for that
// stage) so the shared tail never pays for a clause whose stage did not
// earn its keep. This mirrors, at the STAGE level, the exact same
// greedy real-tokenizer economic gate every mechanism already applies at
// the SPAN level internally (findXSpans + xTransform), generalized from
// "is this one span worth its own marker?" to "is this whole mechanism
// worth its own shared clause?".
function clauseCost(clause: string, enc: EncodingName): number {
  return countTokens(clause, enc);
}

export function chimeraCompose(text: string, enc: EncodingName): ChimeraComposed {
  const invGuard = findInvisibleGuard(text);
  let buf = invGuard ? text.split(String.fromCodePoint(invGuard.cp)).join('') : text;

  // SAFETY-CRITICAL ORDERING: the two mechanisms that do a BLIND, GLOBAL,
  // whole-buffer character-class scan (STENTOR's uppercase-run finder,
  // ORTHOS's curly-quote finder) run FIRST, while the buffer is still pure
  // original prose with no reserved marker/payload characters in it yet.
  // Running them AFTER circe/procrustes/abacus would risk a genuine
  // corruption: e.g. CIRCE decoding "&#8217;" into a literal curly
  // apostrophe marked as DEC_MARK+U+2019, then ORTHOS's blind per-codepoint
  // scan seeing that U+2019 (oblivious to the fact that it is a marker's
  // PAYLOAD, not ordinary prose) and rewriting it to a straight quote --
  // silently corrupting the payload CIRCE's own restore step depends on
  // being byte-identical. This was caught empirically this session (see
  // bench/chimera-report.md section E) by the mandatory whole-pipeline
  // round-trip gate in chimeraEncode below, which declined the corrupted
  // candidate rather than ever emitting it -- but the safe fix is to avoid
  // the hazard structurally, not merely rely on the gate to catch it. The
  // three remaining mechanisms (CIRCE, PROCRUSTES, ABACUS) each use
  // FIND-A-SPECIFIC-SYNTAX-THEN-MARK, not a blind whole-buffer scan, so
  // their relative order is far less hazardous; any residual interaction
  // is still caught by the same round-trip gate before a candidate is ever
  // accepted (see G7 in bench/chimera-redteam.ts for adversarial coverage).
  const beforeStentor = countTokens(buf, enc);
  const stenCandidate = stentorTransform(buf, enc);
  const stentorGain = beforeStentor - countTokens(stenCandidate.candidate, enc);
  const stentorCost = stenCandidate.charsShouted > 0 ? clauseCost(`${SHOUT_OPEN}..${SHOUT_CLOSE}\u2192uppercase inside, drop brackets`, enc) : 0;
  const keepStentor = stenCandidate.charsShouted > 0 && stentorGain > stentorCost;
  if (keepStentor) buf = stenCandidate.candidate;
  const charsShouted = keepStentor ? stenCandidate.charsShouted : 0;

  const beforeOrthos = countTokens(buf, enc);
  const orthosCandidate = orthosDeSmart(buf);
  const orthosVerified = orthosCandidate !== buf && orthosReSmart(orthosCandidate) === buf;
  const orthosGain = beforeOrthos - countTokens(orthosCandidate, enc);
  const orthosCost = clauseCost(`'\u2192\u2018 if prev is start/space/([{-\u2014\u2013"\u201c'\u2018 else \u2019`, enc);
  const orthosApplied = orthosVerified && orthosGain > orthosCost;
  if (orthosApplied) buf = orthosCandidate;

  const beforeCirce = countTokens(buf, enc);
  const circe = circeTransform(buf, enc);
  const circeGain = beforeCirce - countTokens(circe.candidate, enc);
  const circeCost = (circe.namedSpans > 0 ? clauseCost(`${NAMED_MARK}X\u2192HTML entity for X`, enc) : 0)
    + (circe.decSpans > 0 ? clauseCost(`${DEC_MARK}X\u2192&#codepoint(X)`, enc) : 0)
    + (circe.hexSpans > 0 ? clauseCost(`${HEX_MARK}X\u2192&#x(lowercase hex of X)`, enc) : 0)
    + (circe.pctSpans > 0 ? clauseCost(`${PCT_MARK}X\u2192UTF8 %-encode X uppercase`, enc) : 0);
  const keepCirce = circe.spans.length > 0 && circeGain > circeCost;
  if (keepCirce) buf = circe.candidate;

  const beforeProc = countTokens(buf, enc);
  const proc = procrustesTransform(buf, enc);
  const procGain = beforeProc - countTokens(proc.candidate, enc);
  const procCost = (proc.destretchSpans > 0 ? clauseCost(`after ${DESTRETCH_MARK} space out the letters, drop ${DESTRETCH_MARK}`, enc) : 0)
    + (proc.dewideSpans > 0 ? clauseCost(`${DEWIDE_OPEN}..${DEWIDE_CLOSE}\u2192+0xFEE0 ascii (space\u2192\u3000), drop brackets`, enc) : 0);
  const keepProc = proc.spans.length > 0 && procGain > procCost;
  if (keepProc) buf = proc.candidate;

  const beforeAba = countTokens(buf, enc);
  const aba = abacusTransform(buf, enc);
  const abaGain = beforeAba - countTokens(aba.candidate, enc);
  const abaCost = (aba.numSpans > 0 ? clauseCost(`after ${NUM_MARK} add commas per 3 digits from the right, drop ${NUM_MARK}`, enc) : 0)
    + (aba.uniSpans > 0 ? clauseCost(`${UNI_OPEN}..${UNI_CLOSE}\u2192NFD, drop brackets`, enc) : 0);
  const keepAba = aba.spans.length > 0 && abaGain > abaCost;
  if (keepAba) buf = aba.candidate;

  return {
    finalCandidate: buf,
    invGuard: invGuard ? { cp: invGuard.cp, direction: invGuard.direction } : null,
    orthosApplied,
    namedSpans: keepCirce ? circe.namedSpans : 0,
    decSpans: keepCirce ? circe.decSpans : 0,
    hexSpans: keepCirce ? circe.hexSpans : 0,
    pctSpans: keepCirce ? circe.pctSpans : 0,
    destretchSpans: keepProc ? proc.destretchSpans : 0,
    dewideSpans: keepProc ? proc.dewideSpans : 0,
    numSpans: keepAba ? aba.numSpans : 0,
    uniSpans: keepAba ? aba.uniSpans : 0,
    charsShouted,
  };
}

/** Exact mirror of chimeraCompose, run in reverse, given the same metadata
 *  bundle. Used both by chimeraEncode (self-verification before accepting a
 *  candidate) and conceptually by the tail instruction (stated in prose so
 *  a bare LLM can execute it by hand with no code). */
export function chimeraRestoreComposed(candidate: string, meta: ChimeraComposed): string {
  let r = candidate;
  r = abacusRestoreSpans(r);
  r = procrustesRestoreSpans(r);
  r = circeRestoreSpans(r);
  if (meta.orthosApplied) r = orthosReSmart(r);
  r = stentorRestoreSpans(r);
  if (meta.invGuard) r = restoreInvisibleGuard(r, meta.invGuard.cp, meta.invGuard.direction);
  return r;
}

/* ---------------------------------------------------------------------------
 * Combined tail instruction: only the clauses for mechanisms that actually
 * fired are included, in the fixed decode order (reverse of encode order),
 * exactly mirroring how CIRCE/ABACUS/PROCRUSTES already build their own
 * conditional tail clauses. Wording is a fresh, careful restatement of each
 * source module's own already-verified rule (not copy-pasted internals),
 * because CORRECTNESS here is enforced by the executable round-trip gate
 * regardless of prose wording — the prose only has to be unambiguous enough
 * for a second, independent decoder (bench/chimera-redteam.ts's G2) to
 * reproduce byte-for-byte, which is verified directly.
 * ------------------------------------------------------------------------- */

function chimeraTailInstruction(meta: ChimeraComposed): string {
  const clauses: string[] = [];
  if (meta.numSpans > 0) clauses.push(`after ${NUM_MARK} add commas per 3 digits from the right, drop ${NUM_MARK}`);
  if (meta.uniSpans > 0) clauses.push(`${UNI_OPEN}..${UNI_CLOSE}\u2192NFD, drop brackets`);
  if (meta.destretchSpans > 0) clauses.push(`after ${DESTRETCH_MARK} space out the letters, drop ${DESTRETCH_MARK}`);
  if (meta.dewideSpans > 0) clauses.push(`${DEWIDE_OPEN}..${DEWIDE_CLOSE}\u2192+0xFEE0 ascii (space\u2192\u3000), drop brackets`);
  if (meta.namedSpans > 0) clauses.push(`${NAMED_MARK}X\u2192HTML entity for X`);
  if (meta.decSpans > 0) clauses.push(`${DEC_MARK}X\u2192&#codepoint(X)`);
  if (meta.hexSpans > 0) clauses.push(`${HEX_MARK}X\u2192&#x(lowercase hex of X)`);
  if (meta.pctSpans > 0) clauses.push(`${PCT_MARK}X\u2192UTF8 %-encode X uppercase`);
  if (meta.orthosApplied) clauses.push(`'\u2192\u2018 if prev is start/space/([{-\u2014\u2013"\u201c'\u2018 else \u2019`);
  if (meta.charsShouted > 0) clauses.push(`${SHOUT_OPEN}..${SHOUT_CLOSE}\u2192uppercase inside, drop brackets`);
  const numbered = clauses.map((c, i) => `${i + 1}) ${c}`).join('; ');
  const body = clauses.length > 0 ? ` Then, in order: ${numbered}.` : '';
  const invPart = meta.invGuard ? ` Leading ${INV_MARK}Dhhhh flag (keep for last): insert U+hhhh before(D=b)/after(D=a) every space, last step.` : '';
  return `${meta.invGuard ? `Drop leading ${INV_MARK}-flag (apply last), drop` : 'Drop'} ${CHIMERA_MARK}/${CHIMERA_ESCAPE} + digit after ${CHIMERA_MARK} (0/1); decode rest as above.${body}${invPart}`;
}

const CHIMERA_TAIL_ESCAPE = `Drop the leading ${CHIMERA_ESCAPE} above, then decode the rest as already instructed.`;

/* ---------------------------------------------------------------------------
 * ENCODE — compute all six existing alternatives PLUS the new composed
 * candidate; return whichever has the fewest real messageTokens. This is
 * the exact MOSAIC-style "evaluate the trivial member explicitly, take the
 * min" proof: CHIMERA structurally cannot cost more than the best of the
 * six pre-existing choices.
 * ------------------------------------------------------------------------- */

export interface ChimeraResult extends DaedalusResult {
  codec2: 'chimera';
  chimeraWinner: 'plain' | 'orthos' | 'stentor' | 'abacus' | 'procrustes' | 'circe' | 'composed';
  chimeraApplied: boolean; // true iff the composed candidate won
  chimeraStagesFired: number; // how many of the 6 mechanism-families contributed in the composed candidate
  chimeraOrthosApplied: boolean;
  chimeraCharsShouted: number;
  chimeraNumSpans: number;
  chimeraUniSpans: number;
  chimeraDestretchSpans: number;
  chimeraDewideSpans: number;
  chimeraNamedSpans: number;
  chimeraDecSpans: number;
  chimeraHexSpans: number;
  chimeraPctSpans: number;
  chimeraInvisibleGuard: boolean;
}

function zeroMeta() {
  return {
    chimeraOrthosApplied: false, chimeraCharsShouted: 0, chimeraNumSpans: 0, chimeraUniSpans: 0,
    chimeraDestretchSpans: 0, chimeraDewideSpans: 0, chimeraNamedSpans: 0, chimeraDecSpans: 0,
    chimeraHexSpans: 0, chimeraPctSpans: 0, chimeraInvisibleGuard: false, chimeraStagesFired: 0,
  };
}

// CHIMERA reuses each candidate's own wire VERBATIM when it wins (the same
// "zero-overhead degeneracy" discipline MOSAIC uses), and dispatches on
// that wire's leading character(s) at decode time. This is only
// unambiguous if the accepted wire never happens to START with one of
// CHIMERA's OWN outer-dispatch-level reserved characters (CHIMERA_MARK,
// CHIMERA_ESCAPE, or INV_MARK, which chimeraDecode also inspects at the
// very first position) for a reason UNRELATED to that meaning -- e.g. the
// literal input text itself begins with the character "\u25AA", and none
// of ORTHOS/STENTOR/ABACUS/PROCRUSTES/CIRCE's OWN internal collision
// checks know about CHIMERA's marks (each only guards its OWN). Every
// candidate wire is passed through this guard before being accepted as
// `best`, escaping it into CHIMERA's own wire space if -- and only if --
// necessary; found and fixed via the G4 totality gate in
// bench/chimera-redteam.ts this session.
const ALL_RESERVED_DISPATCH_CHARS = new Set([
  ORTHOS_MARK, ORTHOS_ESCAPE, STENTOR_MARK, STENTOR_ESCAPE,
  ABACUS_MARK, ABACUS_ESCAPE, PROCRUSTES_MARK, PROCRUSTES_ESCAPE,
  CIRCE_MARK, CIRCE_ESCAPE, INV_MARK, CHIMERA_MARK, CHIMERA_ESCAPE,
]);
const OWNED_MARKS: Record<'plain' | 'orthos' | 'stentor' | 'abacus' | 'procrustes' | 'circe', Set<string>> = {
  plain: new Set(),
  orthos: new Set([ORTHOS_MARK, ORTHOS_ESCAPE]),
  stentor: new Set([STENTOR_MARK, STENTOR_ESCAPE]),
  abacus: new Set([ABACUS_MARK, ABACUS_ESCAPE]),
  procrustes: new Set([PROCRUSTES_MARK, PROCRUSTES_ESCAPE]),
  circe: new Set([CIRCE_MARK, CIRCE_ESCAPE, INV_MARK]), // CIRCE legitimately owns INV_MARK as its own outer prefix too.
};

function chimeraGuardCandidate(r: DaedalusResult, enc: EncodingName, owner: keyof typeof OWNED_MARKS): DaedalusResult {
  if (r.wire.length === 0) return r;
  const c = r.wire[0];
  if (!ALL_RESERVED_DISPATCH_CHARS.has(c) || OWNED_MARKS[owner].has(c)) return r;
  const escapedWire = CHIMERA_ESCAPE + r.wire;
  const escapedPrompt = `${CHIMERA_ESCAPE}${r.decoderPrompt}\n${CHIMERA_TAIL_ESCAPE}`;
  return {
    ...r,
    wire: escapedWire,
    decoderPrompt: escapedPrompt,
    messageTokens: countTokens(escapedPrompt, enc),
    contractTokens: countTokens(escapedPrompt, enc) - r.outTokens,
  };
}

export function chimeraEncode(text: string, enc: EncodingName = 'o200k_base', options: DaedalusOptions = {}): ChimeraResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);

  const plainRaw = baseDaedalus(text, enc, options);
  const plain = chimeraGuardCandidate(plainRaw, enc, 'plain');
  const collision = plain.wire !== plainRaw.wire;

  let best: ChimeraResult = {
    ...plain,
    codec2: 'chimera',
    chimeraWinner: 'plain',
    chimeraApplied: false,
    ...zeroMeta(),
    ms: Date.now() - started,
    notes: collision
      ? `chimera: not applied (sentinel collision escaped); ${plainRaw.notes}`
      : `chimera: not applied (no single lane or composed pipeline beat plain DAEDALUS); ${plainRaw.notes}`,
  };

  const considerSingle = (
    winner: 'orthos' | 'stentor' | 'abacus' | 'procrustes' | 'circe',
    rIn: OrthosResult | StentorResult | AbacusResult | ProcrustesResult | CirceResult,
  ) => {
    const r = chimeraGuardCandidate(rIn as DaedalusResult, enc, winner);
    if (rIn.exact && r.messageTokens < best.messageTokens) {
      best = {
        ...r,
        codec2: 'chimera',
        chimeraWinner: winner,
        chimeraApplied: false,
        ...zeroMeta(),
        ms: Date.now() - started,
        notes: `chimera: delegated to single-mechanism lane '${winner}' (best of 6 baselines); ${rIn.notes}`,
      } as ChimeraResult;
    }
  };

  considerSingle('orthos', orthosEncode(text, enc, options));
  considerSingle('stentor', stentorEncode(text, enc, options));
  considerSingle('abacus', abacusEncode(text, enc, options));
  considerSingle('procrustes', procrustesEncode(text, enc, options));
  considerSingle('circe', circeEncode(text, enc, options));

  // The new composed candidate.
  const meta = chimeraCompose(text, enc);
  const stagesFired = [
    meta.charsShouted > 0, meta.orthosApplied, meta.numSpans > 0 || meta.uniSpans > 0,
    meta.destretchSpans > 0 || meta.dewideSpans > 0,
    meta.namedSpans > 0 || meta.decSpans > 0 || meta.hexSpans > 0 || meta.pctSpans > 0,
    meta.invGuard !== null,
  ].filter(Boolean).length;

  if (meta.finalCandidate !== text || meta.invGuard) {
    const canon = baseDaedalus(meta.finalCandidate, enc, options);
    const orthosFlag = meta.orthosApplied ? '1' : '0';
    const invPrefix = meta.invGuard ? `${INV_MARK}${meta.invGuard.direction === 'before' ? 'b' : 'a'}${meta.invGuard.cp.toString(16).padStart(4, '0')}` : '';
    const bodyWire = CHIMERA_MARK + orthosFlag + canon.wire;
    const composedWire = invPrefix + bodyWire;
    const tail = chimeraTailInstruction(meta);
    const bodyPrompt = `${CHIMERA_MARK}${orthosFlag}${canon.decoderPrompt}\n${tail}`;
    const composedPrompt = invPrefix + bodyPrompt;
    const composedMessageTokens = countTokens(composedPrompt, enc);

    if (composedMessageTokens < best.messageTokens) {
      const decodedBack = chimeraDecode(composedWire);
      if (decodedBack === text) {
        best = {
            ...canon,
            codec2: 'chimera',
            wire: composedWire,
            decoded: decodedBack,
            exact: true,
            inTokens,
            messageTokens: composedMessageTokens,
            contractTokens: composedMessageTokens - canon.outTokens,
            decoderPrompt: composedPrompt,
            chimeraWinner: 'composed',
            chimeraApplied: true,
            chimeraStagesFired: stagesFired,
            chimeraOrthosApplied: meta.orthosApplied,
            chimeraCharsShouted: meta.charsShouted,
            chimeraNumSpans: meta.numSpans,
            chimeraUniSpans: meta.uniSpans,
            chimeraDestretchSpans: meta.destretchSpans,
            chimeraDewideSpans: meta.dewideSpans,
            chimeraNamedSpans: meta.namedSpans,
            chimeraDecSpans: meta.decSpans,
            chimeraHexSpans: meta.hexSpans,
            chimeraPctSpans: meta.pctSpans,
            chimeraInvisibleGuard: meta.invGuard !== null,
            ms: Date.now() - started,
            notes: `chimera: composed pipeline applied, ${stagesFired} mechanism-famil${stagesFired === 1 ? 'y' : 'ies'} fired together, saved ${plain.messageTokens - composedMessageTokens} tok over plain DAEDALUS (best single-lane baseline was ${best.chimeraWinner === 'composed' ? 'n/a' : best.messageTokens} tok); ${canon.notes}`,
        };
      }
    }

  }

  return best;
}

/* ---------------------------------------------------------------------------
 * DECODE — total dispatch on the (optional invisible-guard prefix, then)
 * first character: delegates to whichever single-lane decoder matches, or
 * runs the composed-pipeline reversal, or falls through to plain DAEDALUS.
 * Unambiguous by construction: none of the eleven reserved sentinel
 * characters used by the six candidate mechanisms collide (verified via
 * the codepoint exclusion list built this session).
 * ------------------------------------------------------------------------- */

function chimeraDecodeComposedBody(wire: string): string {
  const inv = parseInvisiblePrefix(wire);
  const body = inv ? inv.rest : wire;
  let decoded: string;
  if (body[0] === CHIMERA_ESCAPE) {
    decoded = daedalusDecode(body.slice(1));
  } else {
    const orthosFlag = body[1];
    const rest = body.slice(2);
    decoded = daedalusDecode(rest);
    decoded = abacusRestoreSpans(decoded);
    decoded = procrustesRestoreSpans(decoded);
    decoded = circeRestoreSpans(decoded);
    if (orthosFlag === '1') decoded = orthosReSmart(decoded);
    decoded = stentorRestoreSpans(decoded);
  }
  if (inv) decoded = restoreInvisibleGuard(decoded, inv.cp, inv.direction);
  return decoded;
}

export function chimeraDecode(wire: string): string {
  if (wire.length === 0) return wire;
  const inv = parseInvisiblePrefix(wire);
  if (inv) {
    return inv.rest[0] === CHIMERA_MARK || inv.rest[0] === CHIMERA_ESCAPE ? chimeraDecodeComposedBody(wire) : circeDecode(wire);
  }
  const first = wire[0];
  if (first === CHIMERA_MARK || first === CHIMERA_ESCAPE) return chimeraDecodeComposedBody(wire);
  if (first === ORTHOS_MARK || first === ORTHOS_ESCAPE) return require_orthosDecode(wire);
  if (first === STENTOR_MARK || first === STENTOR_ESCAPE) return require_stentorDecode(wire);
  if (first === ABACUS_MARK || first === ABACUS_ESCAPE) return require_abacusDecode(wire);
  if (first === PROCRUSTES_MARK || first === PROCRUSTES_ESCAPE) return require_procrustesDecode(wire);
  if (first === CIRCE_MARK || first === CIRCE_ESCAPE) return circeDecode(wire);
  return daedalusDecode(wire);
}

/* Thin named re-exports of each lane's own decode function, imported once
 * at module scope below (kept as separate names here only to keep the
 * dispatch table above readable; no behavior difference from calling the
 * imports directly). */
import { orthosDecode as require_orthosDecode, orthosDecoderPrompt } from './orthos';
import { stentorDecode as require_stentorDecode, stentorDecoderPrompt } from './stentor';
import { abacusDecode as require_abacusDecode, abacusDecoderPrompt } from './abacus';
import { procrustesDecode as require_procrustesDecode, procrustesDecoderPrompt } from './procrustes';
import { circeDecoderPrompt } from './circe';

/** Given a COMPLETE chimera wire (as produced by chimeraEncode: possibly a
 *  single-lane wire it delegated to, or its own composed-pipeline wire),
 *  returns the full, self-contained, single-message text a bare LLM needs.
 *  Mirrors chimeraDecode's own dispatch exactly. */
export function chimeraDecoderPrompt(wire: string): string {
  const inv = parseInvisiblePrefix(wire);
  if (inv) {
    return inv.rest[0] === CHIMERA_MARK || inv.rest[0] === CHIMERA_ESCAPE ? chimeraComposedPrompt(wire) : circeDecoderPrompt(wire);
  }
  const first = wire[0];
  if (first === CHIMERA_MARK || first === CHIMERA_ESCAPE) return chimeraComposedPrompt(wire);
  if (first === ORTHOS_MARK || first === ORTHOS_ESCAPE) return orthosDecoderPrompt(wire);
  if (first === STENTOR_MARK || first === STENTOR_ESCAPE) return stentorDecoderPrompt(wire);
  if (first === ABACUS_MARK || first === ABACUS_ESCAPE) return abacusDecoderPrompt(wire);
  if (first === PROCRUSTES_MARK || first === PROCRUSTES_ESCAPE) return procrustesDecoderPrompt(wire);
  if (first === CIRCE_MARK || first === CIRCE_ESCAPE) return circeDecoderPrompt(wire);
  return wire.startsWith(CHIRON_START) && daedalusDecode(wire) !== wire ? daedalusDecoderPrompt(wire) : wire;
}

function chimeraComposedPrompt(wire: string): string {
  const inv = parseInvisiblePrefix(wire);
  const invPrefixText = inv ? wire.slice(0, 6) : '';
  const body = inv ? inv.rest : wire;
  if (body[0] === CHIMERA_ESCAPE) {
    const inner = body.slice(1);
    const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
    return `${invPrefixText}${body[0]}${innerPrompt}\n${CHIMERA_TAIL_ESCAPE}`;
  }
  const orthosFlag = body[1];
  const inner = body.slice(2);
  const innerPrompt = inner.startsWith(CHIRON_START) && daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
  const decodedInner = daedalusDecode(inner);
  const meta: ChimeraComposed = {
    finalCandidate: '',
    invGuard: inv ? { cp: inv.cp, direction: inv.direction } : null,
    orthosApplied: orthosFlag === '1',
    namedSpans: decodedInner.includes(NAMED_MARK) ? 1 : 0,
    decSpans: decodedInner.includes(DEC_MARK) ? 1 : 0,
    hexSpans: decodedInner.includes(HEX_MARK) ? 1 : 0,
    pctSpans: decodedInner.includes(PCT_MARK) ? 1 : 0,
    destretchSpans: decodedInner.includes(DESTRETCH_MARK) ? 1 : 0,
    dewideSpans: decodedInner.includes(DEWIDE_OPEN) ? 1 : 0,
    numSpans: decodedInner.includes(NUM_MARK) ? 1 : 0,
    uniSpans: decodedInner.includes(UNI_OPEN) ? 1 : 0,
    charsShouted: decodedInner.includes(SHOUT_OPEN) ? 1 : 0,
  };
  const tail = chimeraTailInstruction(meta);
  return `${invPrefixText}${CHIMERA_MARK}${orthosFlag}${innerPrompt}\n${tail}`;
}

// Re-exported for tests/tooling that want direct access to the underlying
// reserved sentinel constants without importing five separate modules.
export {
  ORTHOS_MARK, ORTHOS_ESCAPE, STENTOR_MARK, STENTOR_ESCAPE, SHOUT_OPEN, SHOUT_CLOSE,
  ABACUS_MARK, ABACUS_ESCAPE, NUM_MARK, UNI_OPEN, UNI_CLOSE,
  PROCRUSTES_MARK, PROCRUSTES_ESCAPE, DESTRETCH_MARK, DEWIDE_OPEN, DEWIDE_CLOSE,
  CIRCE_MARK, CIRCE_ESCAPE, NAMED_MARK, DEC_MARK, HEX_MARK, PCT_MARK, INV_MARK,
};
