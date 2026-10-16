/**
 * ⟡ HENOSIS (ἕνωσις, "union") — ship the whole frontier as one message.
 * =============================================================================
 *
 * THE PROBLEM THIS SOLVES
 * -----------------------------------------------------------------------------
 * The X11 report left a rule behind: "a codec competition is not a codec". The
 * frontier {DAEDALUS, DAEDALUS-D, DENS-2, AKOLOUTHIA-2, HORA, HEMERA, ...} was a
 * *tournament*: whoever ran the lanes picked the winner per lane by hand, and no
 * shipped codec could be the frontier. HENOSIS ships the tournament:
 *
 *   - every arm of the family encodes the same input, independently;
 *   - each arm's own reader must reproduce the input byte for byte (the arm's
 *     existing gate), and the arm must be `exact`;
 *   - the arm's decoder contract is then reduced by SIGE (prose only, wire
 *     untouched) and the whole one-chat message is counted with the live
 *     tokenizer;
 *   - only the cheapest admitted arm's wire + contract are emitted.
 *
 * No selector byte is needed: an arm's contract *is* its label. A message that
 * starts "※dN = the date above + N days …" can only be the HEMERA arm; a message
 * whose contract states the CHIRON rule syntax only can only be a grammar arm.
 * The wire carries no tag, so the union costs nothing over its cheapest member
 * (measured: `bench/x20/receipts/henosis-lanes.jsonl`, 12/12 lanes exact).
 *
 * WHY IT CANNOT BE WORSE THAN ANY SINGLE CODEC
 * -----------------------------------------------------------------------------
 * The union emits one arm's message, and the arms include the frontier members,
 * so M(HENOSIS) ≤ M(every arm included) by construction. The saving over the
 * frontier-min is exactly the SIGE contract reduction (the arms are unchanged),
 * plus the arm choice on lanes where different arms win. Both are measured
 * below; neither is asserted from theory.
 *
 * WHAT IS NEW (and what is not)
 * -----------------------------------------------------------------------------
 *   NEW: the union itself (a shipped codec whose output is another codec's
 *   output, chosen per input and gated per arm), and the fact that the arm
 *   contract doubles as the selector, so the choice costs zero tokens.
 *   NOT NEW: every arm's mechanism, and the SIGE reduction (its own file).
 *
 * THE CENSUS — every codec in src/lib/omega is either in the union or excluded,
 * with the measured reason. Anything not listed here was never a winner on any
 * lane this stack has measured.
 *
 *   IN   `sige`        DAEDALUS-D + reduced contract. Always runs; the base arm
 *                      and the identity arm of the whole union.
 *   IN   `daedalus`    plain DAEDALUS (single-tokenizer pool) + reduced
 *                      contract. Not redundant: the dual pool is a restriction,
 *                      so the single pool is sometimes cheaper (measured on
 *                      bench/z57/lanes/ops-ls-l-bin.txt: 232 against 233).
 *   IN   `dendrons`    DENS-2 brace tree, CHIRON inner, + reduced contract.
 *                      Wins the listing/number lanes (find-listing 1318,
 *                      git-numstat 1904, ops-ls-l-omega 954).
 *   IN   `akolouthia2` PROGRESSION elision, CHIRON inner, + reduced contract.
 *                      Wins the table/CSV/SVG lanes (df-h 171, psql, kubectl,
 *                      chart.svg 330, dump.sql 703, vix 1369).
 *   IN   `hemera`      calendar-day and millisecond marks. Wins the temporal
 *                      lanes (vix, aapl-2014: the two lanes where the whole
 *                      frontier is 300+ tokens above it).
 *   IN   `hora`        millisecond marks only. Kept because it is a strict
 *                      alternative contract for the same lane family; loses to
 *                      HEMERA on every lane measured, so it is usually silent.
 *
 *   OUT  `stathmos`    fixed-width decimal trailing-zero strip. Fires on exactly
 *                      one lane (vix-daily-1990.csv 1212) and loses there to
 *                      HEMERA (1199 in X14, 1182 in X20). A dead arm costs CPU
 *                      and can never win, so it is not in the union.
 *   OUT  `diaphora`, `homoios`, `kladios`, `onomasia`, `anaphora-fold` — all
 *                      measured at or below identity on every lane (see
 *                      docs/codec-abbreviations.md, negative section).
 *   OUT  `phalanx-a10` never the minimum on any of 17 fresh lanes (X20
 *                      frontier-A/B) and timed out on sp500-200.csv and
 *                      package-lock-head.json. Not a frontier member.
 *   OUT  `gramma`, `paradeigma`, `anaphora`, `gnomon`, `synartesis`, `dendron`
 *                      (v1) — never the minimum where DENDRON-S or AKOLOUTHIA-2
 *                      also ran; GRAMMA costs an extra reprint pass, PARADEIGMA
 *                      an extra JSON pass, and both are dominated by DENS-2 on
 *                      every lane where they were measured.
 *
 * THE BUDGET
 * -----------------------------------------------------------------------------
 * The union runs its arms in order and stops starting new arms once `budgetMs`
 * has passed, so it keeps the anytime property of its base arm. Under
 * OMEGA_DET=1 the clock is pinned to 0 (see clock.ts), so every arm runs and the
 * output is a pure function of the input.
 */

import { countTokens, type EncodingName } from './bpe';
import { now } from './clock';
import { daedalusDecode, daedalusEncode } from './daedalus';
import { sigeEncode, sigeRewrite } from './sige';
import { akolouthia2Decode, akolouthia2Encode } from './akolouthia2';
import { densDecode, densEncode, densExpand, densWireLines, DENS2_RULE, DENS2_RULE_V, DENS_SEPARATORS } from './dendrons';
import { daedalusDualEncode } from './daedalus-dual';
import { chironDecode, chironDecoderPrompt } from './chiron';
import { AKOLOUTHIA2_CONTRACT, akolouthia2Substitute } from './akolouthia2';
import { akolouthiaExpand } from './akolouthia';
import { hemeraDecode, hemeraEncode } from './hemera';
import { horaDecode, horaEncode } from './hora';

export type HenosisArmName = 'sige' | 'daedalus' | 'dendrons' | 'akolouthia2' | 'hemera' | 'hora';

/** Arms that exist only as the dual-tokenizer grammar over a structural transform. */
export type HenosisDualArm = 'akolouthia2-dual' | 'dendrons-dual';

export interface HenosisArmRow {
  /** arm name as it would be shipped alone */
  arm: HenosisArmName;
  /** one-chat M of this arm's message after the SIGE reduction */
  messageTokens: number;
  /** one-chat M of this arm's message as the arm itself emits it */
  messageTokensBefore: number;
  /** tokens this arm saved through SIGE */
  saved: number;
  /** the arm's own reader reproduced the input */
  exact: boolean;
  /** the arm admits itself (progression/delta marks present, tree applied, ...) */
  applied: boolean;
  note: string;
}

interface HenosisBest {
  arm: HenosisArmName;
  wire: string;
  decoderPrompt: string;
  decoded: string;
  messageTokens: number;
  armTokens: number;
  note: string;
}

export interface HenosisResult {
  codec: 'henosis';
  /** the arm whose message is emitted */
  arm: HenosisArmName;
  wire: string;
  decoderPrompt: string;
  decoded: string;
  exact: boolean;
  /** one-chat M of the emitted message (contract + wire, counted once) */
  messageTokens: number;
  /** best single arm as it ships alone, for the honest gain statement */
  armTokens: number;
  inTokens: number;
  arms: HenosisArmRow[];
  notes: string;
}

export interface HenosisOptions {
  /** stop starting new arms after this many ms (wall clock; frozen under OMEGA_DET) */
  budgetMs?: number;
  /** arms to leave out (measurement aid; never used by the shipped path) */
  skip?: HenosisArmName[];
}

const RAW_CONTRACT_MARK = /Every new .+ letter before /;

export function henosisEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: HenosisOptions = {},
): HenosisResult {
  const started = now();
  const budgetMs = options.budgetMs ?? 240_000;
  const skip = new Set<HenosisArmName>(options.skip ?? []);

  const rows: HenosisArmRow[] = [];
  let best: HenosisBest | null = null;

  const consider = (
    arm: HenosisArmName,
    wire: string,
    rawPrompt: string,
    decoded: string,
    armTokens: number,
    applied: boolean,
    note: string,
  ) => {
    const exact = decoded === text;
    const red = sigeRewrite(rawPrompt, enc);
    // An arm that refused (DAEDALUS did not pay) emits the raw text as its message
    // and has no contract to reduce: its M is the arm's own count, never 0.
    const messageTokens = red.prompt.trim() === '' ? armTokens : countTokens(red.prompt, enc);
    // A contract that still carries the long sentence means the reduction missed:
    // report it instead of quoting a number that was not earned.
    const unresolved = RAW_CONTRACT_MARK.test(red.prompt);
    rows.push({
      arm, messageTokens, messageTokensBefore: armTokens, saved: armTokens - messageTokens,
      exact, applied,
      note: `${note}; clauses ${red.changed.join(',') || 'none'}${red.missed.length ? `; missed ${red.missed.join(',')}` : ''}${unresolved ? '; LONG-CONTRACT-LEFT' : ''}`,
    });
    if (!exact || !applied) return;
    if (best === null || messageTokens < best.messageTokens) {
      best = { arm, wire, decoderPrompt: red.prompt, decoded, messageTokens, armTokens, note: rows[rows.length - 1].note };
    }
  };

  // ---- arm 1: SIGE (DAEDALUS-D wire + reduced contract). Always runs. ----
  {
    const s = sigeEncode(text, enc);
    consider('sige', s.wire, s.decoderPrompt, s.decoded, s.messageTokens, true,
      `DAEDALUS-D inner; arm=${s.winningArm}`);
  }

  const affordable = () => now() - started <= budgetMs;

  // ---- arm 2: plain DAEDALUS (single-tokenizer pool) + reduced contract. ----
  if (!skip.has('daedalus') && affordable()) {
    const p = daedalusEncode(text, enc);
    const decoded = p.wire === text ? text : daedalusDecode(p.wire);
    consider('daedalus', p.wire, p.decoderPrompt, decoded, p.messageTokens, true,
      `single-tokenizer pool; arm=${p.winningArm}`);
  }

  // ---- arm 3: AKOLOUTHIA-2 (progression elision + CHIRON) ----
  if (!skip.has('akolouthia2') && affordable()) {
    const a = akolouthia2Encode(text, enc);
    const decoded = akolouthia2Decode(a.wire, a.arm);
    consider('akolouthia2', a.wire, a.decoderPrompt, decoded, a.messageTokens, a.arm === 'progression',
      `marks=${a.marks}; arm=${a.arm}`);
  }

  // ---- arm 4: DENDRON-S (brace tree + CHIRON) ----
  if (!skip.has('dendrons') && affordable()) {
    const d = densEncode(text, enc, {});
    const decoded = densDecode(d.wire);
    consider('dendrons', d.wire, d.decoderPrompt, decoded, d.messageTokens, d.applied,
      `applied=${d.applied}; sep=${JSON.stringify(d.sep ?? '')}`);
  }

  // ---- arm 4b: the same two structural transforms over the DUAL-tokenizer grammar.
  //      The dual pool is a restriction, so it is sometimes cheaper (measured on
  //      bench/holdout-work/meeting-transcript.txt: 405 against 420 for the plain
  //      inner). The reader cannot tell the two inners apart -- both contracts are
  //      the CHIRON rule sentence -- so they can share one arm's contract. ----
  if (!skip.has('akolouthia2') && affordable()) {
    const sub = akolouthia2Substitute(text);
    if (sub.marks > 0 && akolouthiaExpand(sub.out) === text) {
      const d = daedalusDualEncode(sub.out, enc);
      if (d.mode === 'daedalus' && chironDecode(d.wire) === sub.out) {
        const prompt = AKOLOUTHIA2_CONTRACT + '\n' + chironDecoderPrompt(d.wire);
        const decoded = akolouthiaExpand(chironDecode(d.wire));
        consider('akolouthia2', d.wire, prompt, decoded, countTokens(prompt, enc), true,
          `dual inner; marks=${sub.marks}`);
      }
    }
  }

  if (!skip.has('dendrons') && affordable()) {
    for (const sep of DENS_SEPARATORS) {
      if (!affordable()) break;
      const wl = densWireLines(text, sep);
      const treeText = wl.join('\n');
      if (densExpand(treeText) !== text) continue;
      const d = daedalusDualEncode(treeText, enc);
      if (d.mode !== 'daedalus' || chironDecode(d.wire) !== treeText) continue;
      const rule = wl.some(l => l.startsWith('!')) ? DENS2_RULE_V : DENS2_RULE;
      const wire = rule + '\n' + d.wire;
      const decoded = densDecode(wire);
      if (decoded !== text) continue;
      const prompt = rule + '\n' + chironDecoderPrompt(d.wire);
      consider('dendrons', wire, prompt, decoded, countTokens(prompt, enc), true,
        `dual inner; sep=${JSON.stringify(sep)}; lines=${wl.length}`);
    }
  }

  // ---- arm 5: HEMERA (calendar-day and millisecond marks) ----
  if (!skip.has('hemera') && affordable()) {
    const h = hemeraEncode(text, enc);
    const decoded = hemeraDecode(h.wire, h.arm);
    consider('hemera', h.wire, h.decoderPrompt, decoded, h.messageTokens, h.arm !== 'identity',
      `days=${h.days}; ms=${h.ms}; arm=${h.arm}`);
  }

  // ---- arm 6: HORA (millisecond marks only) ----
  if (!skip.has('hora') && affordable()) {
    const r = horaEncode(text, enc);
    const decoded = horaDecode(r.wire, r.arm);
    consider('hora', r.wire, r.decoderPrompt, decoded, r.messageTokens, r.arm !== 'identity',
      `marks=${r.marks}; arm=${r.arm}`);
  }

  // Read `best` through a call: TypeScript cannot see through the callback that
  // assigns it, so a direct null-check would narrow the variable to `never`.
  const winner = ((): HenosisBest | null => best)();
  if (winner === null) {
    // No arm admitted itself: the identity message is the text itself.
    const inTokens = countTokens(text, enc);
    return {
      codec: 'henosis', arm: 'sige', wire: text, decoderPrompt: '', decoded: text, exact: true,
      messageTokens: inTokens, armTokens: inTokens, inTokens, arms: rows,
      notes: 'identity: no arm admitted itself (raw text)',
    };
  }

  const admitted = rows.filter(r => r.exact && r.applied).length;
  return {
    codec: 'henosis',
    arm: winner.arm,
    wire: winner.wire,
    decoderPrompt: winner.decoderPrompt,
    decoded: winner.decoded,
    exact: winner.decoded === text,
    messageTokens: winner.messageTokens,
    armTokens: winner.armTokens,
    inTokens: countTokens(text, enc),
    arms: rows,
    notes:
      `winner ${winner.arm} ${winner.messageTokens} (arm alone ${winner.armTokens}); ` +
      `union of ${admitted} admitted arm(s) of ${rows.length} run; ${winner.note}`,
  };
}

/** Read a HENOSIS wire knowing the arm (the contract states it; this is for callers). */
export function henosisDecode(wire: string, arm: HenosisArmName): string {
  switch (arm) {
    case 'akolouthia2': return akolouthia2Decode(wire, 'progression');
    case 'hemera': return hemeraDecode(wire, 'both');
    case 'hora': return horaDecode(wire, 'delta');
    case 'dendrons': return densDecode(wire);
    case 'sige':
    case 'daedalus':
    default: return daedalusDecode(wire);
  }
}
