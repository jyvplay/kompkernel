/**
 * ΜΕΣΟΝ (meson, "that which lies between" — the interval, the separator) — X110.
 * =============================================================================
 *
 * WHAT PROBLEM THIS ACTUALLY SOLVES
 * -----------------------------------------------------------------------------
 * APOGRAPHE's column lifter is the strongest mechanism this stack has for record
 * sets: a column whose values are predictable is deleted outright, so a value
 * whose position is determined by the document's own structure costs ZERO tokens
 * per row instead of the ≥1 token every substitution codec must pay. Its own
 * header calls it "a 3× larger change than any mechanism this stack has shipped
 * since CHIRON", and it bounds the field with two measurements: prose is already
 * at 14.46 bits of a 17.6-bit token channel (82 % — nothing left for ANY
 * substitution codec), while the digit channel tops out near 10 bits/token and
 * `aapl` sits at 8.35 of it *because it is spending its tokens on the date*.
 *
 * It has never once fired on a frontier lane.
 *
 * Measured this turn on 15 frontier lanes (`bench/x110/receipts/lift.out`):
 *
 *     lane                M   exact   arity   modelled   lifts
 *     findmnt.txt       444    y        0         0        0
 *     node-help.txt     862    y        0         0        0
 *     kb-article.txt    622    y        0         0        0
 *     df-real.txt       126    y        0         0        0
 *     ... all 15 lanes: arity 0, modelled 0, lifts 0
 *
 * The cause is one line. `APOGRAPHE_SEPARATORS = [',', '\t', '|', ';']` — the
 * record-set detector is offered four separator candidates and **SPACE IS NOT
 * ONE OF THEM**. A record set whose fields are separated by single spaces is
 * therefore invisible to the lifter: `detectSeparator` never forms a candidate
 * arity for it, so `apographePlan` yields a plan with zero lifts and the lane
 * falls through to whatever ΧΕΙΡΩΝ-family wire the parent already had.
 *
 * That is not a small omission, and it is measurable rather than argued:
 * `apt-real` is 119 of 121 lines at a stable arity of 4 under a single-space
 * split (`bench/x110/arity.ts`), and its fourth column `[installed,local]` is
 * CONSTANT on every row — exactly the case APOGRAPHE's `above` predictor deletes
 * at zero cost per row. The lane ships 850 tokens against a floor of 690
 * (`bench/x104/receipts/leaders-x106.json`).
 *
 * WHAT ΜΕΣΟΝ IS
 * -----------------------------------------------------------------------------
 * ΜΕΣΟΝ is the same lifter with the separator detector widened by ONE candidate,
 * `' '`, offered AHEAD of the built-in list. Nothing else changes: the same five
 * predictors (`above`, `colM`, `days`, `workdays`, `+b`), the same greedy forward
 * addition scored in measured tokens, the same whole-message gate, the same wire,
 * the same decoder, the same ambiguity resolution by field count. It introduces
 * no new syntax, no new contract clause and no new reader arithmetic — the decode
 * is APOGRAPHE's own, so exactness is inherited rather than re-argued.
 *
 * The widening is opt-in (`ApographeOptions.extraSeps`) rather than an edit to
 * `APOGRAPHE_SEPARATORS`, so every existing lane's detector input is
 * byte-for-byte unchanged: the built-in list is only ever APPENDED to, and
 * `detectSeparator` picks the (separator, arity) pair with the most rows.
 *
 * WHY THIS IS NOT A RENAME OF ANYTHING ALREADY HERE
 * -----------------------------------------------------------------------------
 * The nearest neighbour is X86's ΚΕΝΟΝ, and the two are mechanism-distinct.
 * ΚΕΝΩΝ infers column BOUNDARIES by gap voting and hands the resulting counts to
 * ΚΑΝΝΑΒΟΣ's byte-exact GRID wire, whose cost model is "rebuild the table from a
 * de-interleaved column store". ΜΕΣΟΝ changes neither the boundary inference nor
 * the wire: it changes WHICH STRINGS COUNT AS A RECORD SET for APOGRAPHE's
 * predictor lifter, whose cost model is "delete a predictable column outright".
 * X86 ΚΕΝΩΝ's own receipt records that it wins where columns are *generated*
 * (kubectl 326→304, df-h 171→134) and is REFUSED where they are prose
 * (psql +55, dpkg-l +40). ΜΕΣΟΝ's target is the complement: single-space record
 * sets with a constant or duplicate column, which the grid machinery has no
 * reason to beat and the lifter deletes for free.
 *
 * GREEDY OR NOT
 * -----------------------------------------------------------------------------
 * Greedy, and inherited: ΜΕΣΟΝ performs no search of its own. It delegates to
 * `apographeEncode`, whose column selection is a greedy forward addition over
 * (column, predictor) pairs scored on the measured token total, followed by the
 * same whole-message gate every codec in this stack passes.
 *
 * CPU/TIME
 * -----------------------------------------------------------------------------
 * One extra `splitFields` per line per extra separator during detection —
 * O(lines) string splits, no tokenisation, no search. The dominant cost remains
 * the inherited parent encode. Bounded by `APOGRAPHE_MAX_CHARS` (400 000) and
 * `APOGRAPHE_MIN_ROWS` (6) exactly as the parent is.
 *
 * HONEST LIMIT, STATED BEFORE IT IS ASKED FOR
 * -----------------------------------------------------------------------------
 * `splitFields` is a LITERAL `line.split(sep)`. A space-PADDED table (`ls -l`,
 * `df -h`, `ps aux`, `findmnt`) still splits into a huge unstable arity, because
 * its fields are separated by RUNS of spaces rather than one. ΜΕΣΟΝ does not fix
 * that: fixing it needs a column-width side-stream so the reader can restore the
 * padding, which is a different and much larger mechanism. ΜΕΣΟΝ covers the
 * single-space family only, and it says so rather than implying otherwise.
 */
import { apographeEncode, apographeDecodeResult } from './apographe';
import { countTokens, type EncodingName } from './bpe';

/** The separator APOGRAPHE's detector is missing. */
export const MESON_EXTRA_SEPS: readonly string[] = [' '];

export interface MesonResult {
  wire: string;
  contract: string;
  message: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  /** 'meson' when the widened detector produced a strict win, else 'apographe' */
  parent: 'meson' | 'apographe';
  arity: number;
  sep: string;
  modelled: number;
  literal: number;
  lifts: number;
  notes: string;
}

/**
 * Encode with ΜΕΣΟΝ: APOGRAPHE's column lifter with `' '` offered to the
 * separator detector.  `incumbent` is the token count to beat; when the widened
 * detector does not beat it, the caller keeps the incumbent.
 */
export function mesonEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  opts: { incumbent?: number } = {},
): MesonResult {
  const inTokens = countTokens(text, enc);
  let r: ReturnType<typeof apographeEncode>;
  try {
    r = apographeEncode(text, enc, { extraSeps: MESON_EXTRA_SEPS });
  } catch {
    return identity(text, inTokens, 'meson: apographe threw with the widened detector');
  }
  const message = (r.contract ? r.contract + '\n' : '') + r.wire;
  let decoded = '';
  let exact = false;
  try {
    decoded = apographeDecodeResult(r);
    exact = decoded === text;
  } catch {
    exact = false;
  }
  const messageTokens = countTokens(message, enc);
  const incumbent = opts.incumbent ?? Infinity;
  const won = exact && messageTokens < incumbent;
  return {
    wire: r.wire,
    contract: r.contract ?? '',
    message,
    decoded,
    exact,
    inTokens,
    messageTokens,
    parent: won ? 'meson' : 'apographe',
    arity: r.apographeArity,
    sep: r.apographeSep,
    modelled: r.apographeModelled,
    literal: r.apographeLiteral,
    lifts: r.apographeLifts.length,
    notes: won
      ? `meson: space separator admitted; arity=${r.apographeArity} sep=${JSON.stringify(r.apographeSep)} modelled=${r.apographeModelled} literal=${r.apographeLiteral} lifts=${r.apographeLifts.length}; M=${messageTokens} < incumbent ${incumbent}`
      : `meson: no strict win (M=${messageTokens}, exact=${exact}, incumbent ${incumbent}, arity=${r.apographeArity}, lifts=${r.apographeLifts.length}); incumbent kept`,
  };
}

function identity(text: string, inTokens: number, why: string): MesonResult {
  return {
    wire: text, contract: '', message: text, decoded: text, exact: true, inTokens,
    messageTokens: inTokens, parent: 'apographe', arity: 0, sep: '', modelled: 0,
    literal: 0, lifts: 0, notes: why,
  };
}
