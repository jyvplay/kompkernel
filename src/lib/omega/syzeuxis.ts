/**
 * SYZEUXIS — the column-major conjunction.
 * =============================================================================
 * σύζευξις — a joining together.
 *
 * THE SEAM THIS CLOSES
 * -----------------------------------------------------------------------------
 * KIONES established that tabular redundancy lives DOWN the columns, not along
 * the rows, and that transposing a table block to column-major before running
 * the stack is a large win.  MORPHE established that shape rules should FIT
 * themselves to the payload rather than being a fixed menu.
 *
 * Those two results were never combined.  KIONES transposes and then runs
 * POLYTROPOS, the stack that predates MORPHE.  MORPHE fits its rules to the
 * payload in ROW-MAJOR order, where a value column is never contiguous.
 *
 * WHY THE DIRECTION IS PROMISING RATHER THAN MERELY NEW
 * -----------------------------------------------------------------------------
 * MORPHE's rules carry UNIFORMITY PRECONDITIONS.  A rule is a total function
 * the reader applies everywhere, so `numpad` fires only when every decimal in
 * scope has the same width, and `thousands` fires only when no bare 4+-digit
 * integer exists.  Row-major, the scope is the whole document, and one stray
 * year — or one column at a different precision — vetoes the rule for all the
 * values that would have benefited.  Column-major, each column is a contiguous
 * run, so the precondition becomes local instead of global.
 *
 * INTERACTION, NOT ASSUMPTION
 * -----------------------------------------------------------------------------
 * This repository has already measured what interactions cost: in MORPHE,
 * `tz+00:00` passes every gate alone and in the full set, yet the set is 5
 * tokens cheaper without it (greedy 1493, eliminated 1488).  Two mechanisms
 * that each win can be jointly worse.  So the composition is never assumed to
 * pay: every arm is measured against every parent on every input and shipped
 * only when it beats them all.  `armTokens` exposes all of them so the
 * tournament is auditable rather than asserted.
 *
 * ARMS (each gated on a byte-exact round trip; the cheapest wins)
 * -----------------------------------------------------------------------------
 *   row-morphe   MORPHE on the document as it arrived.       (parent)
 *   row-eidos    EIDOS generation/delta on the document.     (parent)
 *   row-aion     AION invariance fold on the document.       (parent)
 *   col-bare     transpose only.                             (control)
 *   col-morphe   transpose, then MORPHE.                     (new)
 *   col-eidos    transpose, then EIDOS.                      (new)
 *   col-aion     transpose, then AION.                       (new)
 *
 * Wire of a column arm is the inner codec's wire.  The reader expands the
 * inner contract to recover the column-major text, then applies the transpose
 * clause to recover rows.  Both travel in-band; no system prompt, no skills
 * file, single chat message.
 *
 * MEASUREMENT CONTRACT (unchanged): messageTokens = o200k tokens of
 * (contract + wire) counted together, i.e. one chat message.  Nothing is
 * amortised and nothing lives outside the message: unlike ORACLE, which
 * hardcodes the 20 holdout citations in an uncounted ORACLE_MAP, every byte a
 * reader needs is inside the message and is counted.
 */

import { countTokens, type EncodingName } from './bpe';
import { morpheEncode, morpheDecode } from './morphe';
import { eidosEncode, eidosDecode } from './eidos';
import { aionEncode, aionDecode } from './aion';
import {
  kionesEncodeText,
  kionesDecodeText,
  KION_CLAUSE,
  type KionBlock,
} from './kiones';

export type SyzeuxisArm =
  | 'row-morphe' | 'row-eidos' | 'row-aion'
  | 'col-bare' | 'col-morphe' | 'col-eidos' | 'col-aion'
  | 'identity';

export interface SyzeuxisResult {
  codec: 'syzeuxis';
  arm: SyzeuxisArm;
  wire: string;
  decoderPrompt: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  rules: string[];
  clauses: string[];
  transpose: { applied: boolean; rows: number; cols: number; sep: string };
  /** MORPHE decoder config, needed to decode a MORPHE arm. */
  sep: string;
  after: boolean;
  tag: string;
  /** tokens of every arm that ran, so the tournament is auditable */
  armTokens: Record<string, number>;
  notes: string;
}

interface Cand {
  name: SyzeuxisArm;
  wire: string;
  prompt: string;
  tokens: number;
  decoded: string;
  rules: string[];
  clauses: string[];
  transpose: { applied: boolean; rows: number; cols: number; sep: string };
  sep: string;
  after: boolean;
  tag: string;
}


/**
 * The contract is whatever the decoder prompt adds on top of the wire.
 *
 * This is a gate, not a comment.  GLOSSIA/EIDOS report `contractTokens = 0` and
 * ship an EMPTY contract on several lanes (verified: vix, psql, df-h all show
 * `contractChars=0`), which means their reported messageTokens count the wire
 * alone.  A wire with no instructions is not a one-chat message and is not
 * decodable by a bare LLM, so those arms are inadmissible here even though they
 * are arithmetically "exact" --- their decoder knows the format implicitly.
 * AION on vix passes (97 contract chars) and is admitted.
 */
function contractOf(prompt: string, wire: string): string {
  const i = prompt.indexOf(wire);
  return (i >= 0 ? prompt.slice(0, i) + prompt.slice(i + wire.length) : prompt).trim();
}

function admissibleContract(contract: string, wire: string): boolean {
  if (!(contract.length > 0 && /[A-Za-z]{3}/.test(contract))) return false;
  // Every structural marker in the wire must be explained by the contract.
  // AION's contract on vix is "CSV numeric column deltas: ..." (97 chars) and
  // never mentions the [AN1]/[SG1] marker layer its wire also uses, so that
  // message is not self-describing even though it is arithmetically exact.
  for (const m of wire.matchAll(/\[[A-Z]{2,3}\d\]/g)) {
    if (!contract.includes(m[0])) return false;
  }
  return true;
}

const ROW = { applied: false, rows: 0, cols: 0, sep: '' } as const;

export function syzeuxisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
): SyzeuxisResult {
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const cands: Cand[] = [];
  const armTokens: Record<string, number> = {};

  // ---- row-major arms (the parents, measured as they are today) -----------
  const m = morpheEncode(text, enc);
  if (m.decoded === text) {
    cands.push({
      name: 'row-morphe', wire: m.wire, prompt: m.decoderPrompt, tokens: m.messageTokens,
      decoded: text, rules: m.rules, clauses: m.clauses, transpose: { ...ROW },
      sep: m.sep, after: m.after, tag: m.armTag,
    });
  }
  armTokens['row-morphe'] = m.messageTokens;

  try {
    const e = eidosEncode(text, enc);
    if (e.decoded === text) {
      cands.push({
        name: 'row-eidos', wire: e.wire, prompt: e.decoderPrompt, tokens: e.messageTokens,
        decoded: text, rules: [], clauses: [], transpose: { ...ROW },
        sep: '-', after: false, tag: 'lakonikos',
      });
      armTokens['row-eidos'] = e.messageTokens;
    }
  } catch { /* arm unavailable */ }

  try {
    const a = aionEncode(text, enc);
    if (a.decoded === text) {
      cands.push({
        name: 'row-aion', wire: a.wire, prompt: a.decoderPrompt, tokens: a.messageTokens,
        decoded: text, rules: [], clauses: [], transpose: { ...ROW },
        sep: '-', after: false, tag: 'lakonikos',
      });
      armTokens['row-aion'] = a.messageTokens;
    }
  } catch { /* arm unavailable */ }

  // ---- column-major arms ---------------------------------------------------
  let tr: { out: string; block: KionBlock } | null = null;
  try { tr = kionesEncodeText(text, enc); } catch { tr = null; }

  if (tr) {
    const meta = {
      applied: true,
      rows: tr.block.end - tr.block.start,
      cols: tr.block.cols,
      sep: tr.block.sep,
    };

    // col-bare: the control.  Transpose alone, so we can see whether the stack
    // is contributing anything at all on top of the transposition.
    if (kionesDecodeText(tr.out) === text) {
      const clause = KION_CLAUSE.trim();
      const prompt = `${tr.out}\n${clause}`;
      cands.push({
        name: 'col-bare', wire: tr.out, prompt, tokens: T(prompt),
        decoded: text, rules: [], clauses: [clause], transpose: meta,
        sep: '-', after: false, tag: 'lakonikos',
      });
      armTokens['col-bare'] = T(prompt);
    }

    // col-morphe: MORPHE sees the columns as contiguous runs.
    const mt = morpheEncode(tr.out, enc);
    if (mt.decoded === tr.out && kionesDecodeText(mt.decoded) === text) {
      const prompt = mt.decoderPrompt + KION_CLAUSE;
      cands.push({
        name: 'col-morphe', wire: mt.wire, prompt, tokens: T(prompt),
        decoded: text, rules: mt.rules, clauses: [...mt.clauses, KION_CLAUSE.trim()],
        transpose: meta, sep: mt.sep, after: mt.after, tag: mt.armTag,
      });
      armTokens['col-morphe'] = T(prompt);
    }

    // col-eidos: generation on columns.  A column of near-equal values is a far
    // better delta candidate than the same values scattered row-major.
    try {
      const et = eidosEncode(tr.out, enc);
      if (et.decoded === tr.out && kionesDecodeText(et.decoded) === text) {
        const prompt = et.decoderPrompt + KION_CLAUSE;
        cands.push({
          name: 'col-eidos', wire: et.wire, prompt, tokens: T(prompt),
          decoded: text, rules: [], clauses: [KION_CLAUSE.trim()], transpose: meta,
          sep: '-', after: false, tag: 'lakonikos',
        });
        armTokens['col-eidos'] = T(prompt);
      }
    } catch { /* arm unavailable */ }

    // col-aion: invariance on columns.
    try {
      const at = aionEncode(tr.out, enc);
      if (at.decoded === tr.out && kionesDecodeText(at.decoded) === text) {
        const prompt = at.decoderPrompt + KION_CLAUSE;
        cands.push({
          name: 'col-aion', wire: at.wire, prompt, tokens: T(prompt),
          decoded: text, rules: [], clauses: [KION_CLAUSE.trim()], transpose: meta,
          sep: '-', after: false, tag: 'lakonikos',
        });
        armTokens['col-aion'] = T(prompt);
      }
    } catch { /* arm unavailable */ }
  }

  // ---- gate: byte-exact, and no worse than shipping the text unchanged -----
  // Gate: byte-exact, no worse than identity, AND the arm actually tells the
  // reader how to decode it.  An arm that ships no contract is wire-only.
  const rejected: string[] = [];
  const valid = cands.filter((c) => {
    if (c.decoded !== text || c.tokens > inTokens) return false;
    if (!admissibleContract(contractOf(c.prompt, c.wire), c.wire)) { rejected.push(c.name); return false; }
    return true;
  });
  const win = valid.sort((a, b) => a.tokens - b.tokens)[0];

  if (!win) {
    return {
      codec: 'syzeuxis', arm: 'identity', wire: text, decoderPrompt: text,
      decoded: text, exact: true, inTokens, messageTokens: inTokens,
      rules: [], clauses: [], transpose: { ...ROW },
      sep: '-', after: false, tag: 'lakonikos', armTokens,
      notes: `no admissible arm beat identity; contractless arms rejected=[${rejected.join(',')}]`,
    };
  }

  return {
    codec: 'syzeuxis',
    arm: win.name,
    wire: win.wire,
    decoderPrompt: win.prompt,
    decoded: win.decoded,
    exact: win.decoded === text,
    inTokens,
    messageTokens: win.tokens,
    rules: win.rules,
    clauses: win.clauses,
    transpose: win.transpose,
    sep: win.sep,
    after: win.after,
    tag: win.tag,
    armTokens,
    notes:
      `arm=${win.name}; contractless-rejected=[${rejected.join(',')}]; transpose=${win.transpose.applied}` +
      (win.transpose.applied
        ? ` ${win.transpose.rows}x${win.transpose.cols} sep=${JSON.stringify(win.transpose.sep)}`
        : '') +
      `; rules=[${win.rules.join('+')}]` +
      `; M=${win.tokens} vs identity ${inTokens}`,
  };
}

/**
 * Decode a SYZEUXIS wire: expand the inner codec, then undo the transpose.
 * The transpose clause sits last in the contract, so it is applied last.
 * `rules`/`sep`/`after`/`tag` are MORPHE's and are needed only for MORPHE arms.
 */
export function syzeuxisDecode(
  wire: string,
  opts: {
    arm?: SyzeuxisArm;
    rules?: string[];
    sep?: string;
    after?: boolean;
    tag?: string;
  } = {},
): string {
  const arm = opts.arm ?? 'col-morphe';
  let text: string;

  if (arm === 'row-eidos' || arm === 'col-eidos') {
    text = eidosDecode(wire);
  } else if (arm === 'row-aion' || arm === 'col-aion') {
    text = aionDecode(wire);
  } else if (arm === 'col-bare') {
    text = wire;
  } else {
    text = morpheDecode(wire, {
      rules: opts.rules,
      sep: opts.sep,
      after: opts.after,
      tag: opts.tag,
    });
  }

  if (arm === 'col-bare' || arm === 'col-morphe' || arm === 'col-eidos' || arm === 'col-aion') {
    text = kionesDecodeText(text);
  }
  return text;
}
