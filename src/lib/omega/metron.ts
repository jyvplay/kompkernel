/**
 * src/lib/omega/metron.ts — ΜΕΤΡΟΝ (the measure) — X40.
 *
 * =============================================================================
 * THE ONE THING EVERY PREDICTOR IN THIS STACK SHARES, AND WHY IT HURTS
 * =============================================================================
 * APOGRAPHE's predictors are all RELATIVE: `above`, `colM`, `days`, `workdays`,
 * `+b` each read the line above. Relative prediction is cheap to declare (one
 * word) but it has three structural costs that this codec removes:
 *
 *   1. STATE. The reader must carry a value from line to line. One mistake at
 *      line 40 is inherited by line 41.
 *   2. RESET. A literal line must reset the state, so an exception costs the
 *      exception AND the next line's prediction.
 *   3. FORMAT. `+b` predicts a digit run and re-renders it at the same width, so
 *      it cannot express a decimal (`107.30`), a percentage (`-12.5%`), a unit
 *      (`40.0 s`), a clock (`[00:02:05]`), or a padded field at all. Those are
 *      not edge cases; they are what real tables are made of.
 *
 * =============================================================================
 * THE MECHANISM: ABSOLUTE GENERATORS WITH A DECLARED RENDER TEMPLATE
 * =============================================================================
 * METRON declares a column as a function of the line's OWN index:
 *
 *      colN=lin:V,S       value on source line i (0-based) is V + i*S,
 *                         rendered in V's exact format
 *      colN=clock:V,S     value is the clock reading V + i*S seconds
 *
 * The header carries a SAMPLE value V rather than a format description. The
 * reader parses V with the same rule it must use for every other line — digits,
 * optional decimal point, leading and trailing non-digit text — and therefore
 * recovers the decimal count, the zero padding, the leading spaces and the unit
 * suffix for free. One sample declares five format facts in the space the sample
 * already occupies. There is no separate width rule and no separate suffix rule,
 * which is exactly why `+b` cannot do this and `lin` can.
 *
 * CONSEQUENCES THAT ARE THE POINT:
 *
 *   * NO STATE. Line 41 is computed from (a, s, 41). A literal line is a line
 *     that was not generated; it changes nothing for any other line.
 *   * NO RESET COST. There is nothing to reset.
 *   * NO DRIFT. The reader never adds to a previous value, so an error cannot
 *     propagate; either a line matches its generator or it is written out.
 *   * EXACTNESS IS STRUCTURAL. The renderer refuses (returns null) when the
 *     value would not fit the template's integer width, so a column can never
 *     silently change shape: either the template reproduces the field byte for
 *     byte or the line goes literal.
 *
 * This is the same move APOGRAPHE made one level down — "do not transmit what a
 * rule determines" — applied to a different object. APOGRAPHE removed the
 * POINTER (a column costs nothing because its position is known); METRON removes
 * the STATE (a column costs nothing because its value is a function of a number
 * the reader already counts, and its FORMAT is a function of a sample the header
 * already contains).
 *
 * =============================================================================
 * WHAT IS NEW HERE, STATED AGAINST THE LITERATURE
 * =============================================================================
 * Arithmetic column models are old: frame-of-reference and delta coding with
 * exceptions (Abadi, Madden & Ferreira, SIGMOD 2006, doi:10.1145/1142473.1142548),
 * ALP's decimal scaling (SIGMOD 2024, doi:10.1145/3626717), ALP's exception
 * vectors, integer packing in Parquet/ORC/FastLanes. ALL of them are relative or
 * block-relative, and ALL of them require a SCHEMA to know where a column starts.
 * What is not in that literature, and what is the actual contribution here:
 *
 *   (i)  the sample-value-as-format-declaration (a format is transmitted by
 *        transmitting one value already in that format, so decimals, padding,
 *        and unit suffixes cost nothing extra);
 *   (ii) absolute index-parameterised generators in a self-describing text wire
 *        that a language model executes with no schema, no tool and no decoder
 *        program (the "one chat message" constraint);
 *   (iii) the clock family: an AP over wall-clock readings, where the *unit*
 *        (seconds) is implied by the format rather than declared.
 *
 * =============================================================================
 * DELEGATION, DELIBERATELY (and what it costs in trust)
 * =============================================================================
 * METRON reuses APOGRAPHE's line/arity state machine, its header grammar and its
 * self-synchronising literal-line rule, by importing that module rather than
 * re-implementing it. The new code is the template parser/renderer, the exact
 * absolute fit, the two header specs and the two clause families. That sharing
 * is why the APOGRAPHE red team must be re-run after this change (and it is, in
 * bench/x40/rt.ts and bench/x39/rt.ts): a repaired engine inherits no trust.
 *
 * Time/CPU bound: one extra candidate pair (lin, clock) per column per greedy
 * round, each costing one template fit (single pass over the column) plus the
 * same apply+measure the parent candidate already paid. No new encode of the
 * parent is introduced: the gate is the one APOGRAPHE already runs.
 */

import {
  apographeEncode, apographeDecode, apographeDecodeResult, apographePlan, apographeArmOf,
  type ApographeOptions, type ApographePlan, type ApographeResult,
} from './apographe';
import type { EncodingName } from './bpe';

export interface MetronResult extends ApographeResult {
  /** models used, for receipts: `col:kind` */
  metronModels: string[];
}

/** Encode with the METRON families enabled. The gate is the frontier's own. */
export function metronEncode(
  text: string, enc: EncodingName = 'o200k_base', opts: ApographeOptions = {},
): MetronResult {
  const r = apographeEncode(text, enc, { ...opts, kanon: true }) as MetronResult;
  return { ...r, metronModels: r.apographeLifts.map((l) => `${l.col + 1}:${l.model.kind}`) };
}

/** Plan only (no parent encode): what METRON would lift, and the raw-token proxy. */
export function metronPlan(
  text: string, enc: EncodingName = 'o200k_base', opts: ApographeOptions = {},
): ApographePlan | null {
  return apographePlan(text, enc, { ...opts, kanon: true });
}

/** Decode: identical to APOGRAPHE's reader, because the header is the program. */
export function metronDecode(
  wire: string,
  cfg: Parameters<typeof apographeDecode>[1],
  opts: Parameters<typeof apographeDecode>[2] = {},
): string {
  return apographeDecode(wire, cfg, opts);
}

/**
 * Decode a result this module produced. Prefer this over `metronDecode` with a
 * hand-built option list: the tail-anchored numeric arm needs its own options,
 * and a decoder that depends on the caller remembering them is a decoder with a
 * landmine in it (see `apographeDecodeResult`).
 */
export function metronDecodeResult(r: MetronResult): string {
  return apographeDecodeResult(r);
}

export { apographeArmOf };
