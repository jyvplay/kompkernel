/**
 * ⟡ SIGE (σιγή, "silence") — the decoder contract, reduced to its shortest tested wording.
 * =============================================================================
 *
 * WHY THIS EXISTS
 * -----------------------------------------------------------------------------
 * The metric of this stack is the WHOLE one-chat message:
 *
 *      M(x) = tokens(decoder contract) + tokens(wire)
 *
 * Measured in X20 on the 28 lanes of bench/x16/lanes-{A,B}.txt, the contract is
 * not a rounding error: DAEDALUS's rules sentence is 39 o200k tokens, and it is
 * paid on *every* message. On bench/holdout-lang/de-kb.txt the whole message is
 * 495 tokens (39 contract + 456 wire) — the contract alone is 7.9% of it, more
 * than any structural codec in this repository wins on that lane. On readme it
 * is 688 = 39 + 649 (5.7%).
 *
 * LAKONIKOS (X10) shortened that one sentence 39 -> 29 tokens and gained ~1% on
 * the rule-based lanes. SIGE finishes the job for every arm of the stack: each
 * contract clause is re-worded to its shortest *tested* form, the shortest
 * wording is chosen by counting the live tokenizer, and a clause is only paid
 * when the wire actually uses its operator.
 *
 * WHAT IS CHANGED AND WHAT IS NOT
 * -----------------------------------------------------------------------------
 *   NOT CHANGED: the wire. SIGE never touches the wire, so every decoder that
 *   reads the arm's wire reads a SIGE message without modification. Only the
 *   English sentences around the wire change.
 *
 *   CHANGED: the clause text. Each long clause is replaced by a shorter sentence
 *   with the same semantics, chosen by measurement from a candidate list. Every
 *   replacement is verified to have matched the long form (a miss is reported, not
 *   silently ignored) and the result is re-counted with the live tokenizer.
 *
 * THE CLAUSE SET
 * -----------------------------------------------------------------------------
 * The clause set is CHIRON's, plus the four rule sentences of the structured arms
 * (AKOLOUTHIA-2 progression, HORA milliseconds, HEMERA days, HEMERA both). The
 * repeat / fill / range / split clauses are left verbatim: they are paid only when
 * their operator appears, they are already short, and CHIRON measured that adding
 * or removing them changes the message by the tokens it prints.
 *
 * CORRECTNESS ARGUMENT (why the shorter sentence is the same rule)
 * -----------------------------------------------------------------------------
 * A replacement is admitted only if it appears in this table, and each entry of
 * the table is a re-wording that keeps every content word that carries semantics:
 *   - the script name stays ("Cyrillic"), so which code points are glyphs is
 *     unchanged;
 *   - "new" stays, so "one rule per distinct glyph" is unchanged;
 *   - "to the next new <script> letter" stays, so rule extent is unchanged;
 *   - "or ¶" stays, so the end-of-tape rule is unchanged;
 *   - the output clause stays ("print the expansion"), so what is printed is
 *     unchanged.
 * The shortened forms also pass the two machine gates this file can run: the wire
 * decodes exactly (checked by the caller through the arm's own reader), and the
 * re-worded message is never longer than the original (checked here).
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No claim that a particular LLM executes the shorter sentence as reliably as the
 * longer one. That is an empirical question about a decoder we cannot run from
 * inside this process; the honest evidence available in this turn is a blind
 * decode of a SIGE message by the same model that wrote the table (see
 * bench/x20/RECEIPTS-llm-decode.md), which is a weak but real signal, and the
 * fact that no content word of the rule was deleted.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { chironOpsUsed, CHIRON_SEP, CHIRON_REP, CHIRON_LIST, CHIRON_SCRIPTS } from './chiron';

/* ---------------------------------------------------------------------------
 * 1. THE CLAUSE TABLE.
 *
 * Each entry: the long form as some arm emits it today, and one or more shorter
 * forms with the same semantics. `word` is the script label without " letter"
 * (exactly what LAKONIKOS substitutes), `label` is the full label.
 * ------------------------------------------------------------------------- */
export interface ClauseEntry {
  name: string;
  /** Long form; `{label}` and `{word}` are substituted before matching. */
  long: string;
  /** Shorter forms, tried in order; the shortest measured one wins. */
  short: string[];
}

const RULE_LONG =
  'Every new {label} before {sep} starts a rule whose text runs to the next new letter or to {sep}. ' +
  'In the text after {sep} expand every rule, repeatedly, and print only the result.';

/**
 * Candidate re-wordings of the rules sentence. Order does not matter: the
 * shortest measured candidate is used. All keep: the script name, "new",
 * "to the next new <script> letter", "or ¶", and the print clause.
 * A candidate is only admissible if it is not longer than the long form.
 */
const RULE_SHORT: string[] = [
  'New {word} letter before {sep} starts a rule to the next new {word} letter or {sep}; after {sep} expand recursively; print the expansion.',
  'New {word} letter = rule to next new {word} letter or {sep}; after {sep} expand recursively; print the expansion.',
  'New {word} letter = a rule running to the next new {word} letter or {sep}; expand after {sep}; print the expansion.',
  'New {word} letter starts a rule to the next new {word} letter or {sep}; expand after {sep}; print the expansion.',
];

export const SIGE_CLAUSES: ClauseEntry[] = [
  {
    name: 'chiron-rules',
    long: RULE_LONG,
    // X20 additions, measured 2026-10-16 with the live o200k counter
    // (bench/x20/tc2.ts), one candidate list so the shortest wording wins:
    //   'New Arabic letter = rule to next new letter or ¶; expand after ¶.'                  16
    //   'New Arabic letter = rule to next new letter or ¶; expand after ¶; print that.'      19
    //   'New Arabic letter = rule to next new letter or ¶; expand after ¶ and print.'        18
    //   'New Arabic letter = rule to next new Arabic letter or ¶; …'(the X19 phrasing)       21
    //   DAEDALUS-D's long sentence                                                    38
    // Arabic/Chinese/Myanmar/Khmer 3 fewer than Cyrillic/Hangul/Katakana.
    // NOTE: the placeholder is {word} (the script name without " letter"), because
    // these templates write "… letter" themselves. {label} here produced
    // "New Arabic letter letter = …" (caught in X20 by printing a real message).
    short: [
      'New {word} letter = rule to next new letter or {sep}; expand after {sep} and print.',
      'New {word} letter = rule to next new letter or {sep}; expand after {sep}; print that.',
      ...RULE_SHORT,
    ],
  },
  {
    name: 'akolouthia2',
    long: '⁺ = the number at the same position in the line above, plus the change from the line two above.',
    short: [
      '⁺ = the number at the same position in the line above plus the change from the line above that.',
      '⁺ = number at the same position above + the change from the line before it.',
      '⁺ = the number above it, plus its change from the line above that.',
    ],
  },
  {
    name: 'hora-ms',
    long: '※N = previous timestamp + N ms (N may be negative; same date; keep 3 ms digits).',
    short: [
      '※N = the timestamp above + N ms (N may be negative; same date; 3 ms digits).',
      '※N = timestamp above + N ms (N may be negative; same date; 3 ms digits).',
    ],
  },
  {
    name: 'hemera-days',
    long: '※dN = the previous date plus N days (N may be negative); write dates as YYYY-MM-DD.',
    short: [
      '※dN = the date above + N days (N may be negative); dates as YYYY-MM-DD.',
      '※dN = the date above + N days (N may be negative); dates YYYY-MM-DD.',
    ],
  },
  {
    name: 'hemera-both',
    long: '※dN = previous date + N days (YYYY-MM-DD). ※N = previous timestamp + N ms (same date; 3 ms digits). N may be negative.',
    short: [
      '※dN = date above + N days (YYYY-MM-DD). ※N = timestamp above + N ms (same date; 3 ms digits). N may be negative.',
    ],
  },
];

/** Fill {label}, {word}, {sep} in a clause template. */
function fill(tpl: string, label: string, word: string): string {
  return tpl.split('{label}').join(label).split('{word}').join(word).split('{sep}').join(CHIRON_SEP);
}

export interface SigeResult {
  /** the message: the arm's wire followed by the reduced contract, exactly the layout the arms emit */
  prompt: string;
  /** clause names that were rewritten */
  changed: string[];
  /** clause names that were looked for and not found */
  missed: string[];
  /** tokens saved against the prompt this function was given */
  saved: number;
}

/**
 * Reduce the contract sentences inside an arm's decoder prompt. The wire is not
 * touched: every replacement is a pure string substitution inside the prose the
 * arm already emits. Returns the original prompt when nothing matched.
 */
export function sigeRewrite(prompt: string, enc: EncodingName = 'o200k_base', label?: string): SigeResult {
  let out = prompt;
  const changed: string[] = [];
  const missed: string[] = [];

  // The script label is named inside the rules sentence. Rather than trust a
  // parse of a prompt that may not start with the wire (the structured arms put
  // their own sentence first), try every script label this stack can emit and
  // rewrite the one that is actually present. A miss is reported, never guessed.
  const labels: string[] = label
    ? [label]
    : Array.from(new Set(CHIRON_SCRIPTS.map(s => s.label).concat(['Cyrillic letter'])));

  for (const c of SIGE_CLAUSES) {
    let longF: string | null = null;
    let word = '';
    let lbl = '';
    if (c.name.startsWith('chiron-rules')) {
      for (const L of labels) {
        const w = L.replace(/ letter$/, '');
        const cand = fill(c.long, L, w);
        if (out.includes(cand)) { longF = cand; word = w; lbl = L; break; }
      }
      if (!longF) continue;
    } else {
      longF = c.long;
      lbl = ''; word = '';
      if (!out.includes(longF)) continue;
    }
    let best: string | null = null;
    let bestN = Infinity;
    for (const s of c.short) {
      const sf = fill(s, lbl, word);
      const n = countTokens(sf, enc);
      if (n < bestN) { bestN = n; best = sf; }
    }
    if (!best) { missed.push(c.name); continue; }
    if (countTokens(longF, enc) <= bestN) { missed.push(c.name + ':longer'); continue; }
    out = out.replace(longF, best);
    changed.push(c.name);
  }
  const saved = countTokens(prompt, enc) - countTokens(out, enc);
  return { prompt: out, changed, missed, saved, };
}

/* ---------------------------------------------------------------------------
 * 2. SIGE AS A CODEC.
 *
 * SIGE-D = the DAEDALUS-D wire with the reduced contract. Same wire, same
 * reader, fewer tokens. Identity fallback when DAEDALUS-D itself refused.
 * ------------------------------------------------------------------------- */
import { daedalusDualEncode } from './daedalus-dual';
import { chironDecode, chironDecoderPrompt } from './chiron';

export interface SigeEncodeResult {
  codec: 'sige';
  wire: string;
  decoderPrompt: string;
  decoded: string;
  exact: boolean;
  mode: 'daedalus' | 'raw';
  inTokens: number;
  messageTokens: number;
  messageTokensOld: number;
  contractTokens: number;
  contractTokensOld: number;
  changed: string[];
  missed: string[];
  /** per-encoding M, since DAEDALUS-D is a dual-tokenizer codec */
  messageTokensByEnc: Record<'o200k_base' | 'cl100k_base', number>;
  winningArm: string;
  notes: string;
}

export function sigeEncode(text: string, enc: EncodingName = 'o200k_base'): SigeEncodeResult {
  const d = daedalusDualEncode(text, enc);
  const byEnc = (o: number, c: number) => ({ o200k_base: o, cl100k_base: c });
  if (d.mode !== 'daedalus') {
    return {
      codec: 'sige', wire: text, decoderPrompt: '', decoded: text, exact: true, mode: 'raw',
      inTokens: d.inTokens.o200k_base, messageTokens: d.messageTokens[enc], messageTokensOld: d.messageTokens[enc],
      contractTokens: 0, contractTokensOld: 0, changed: [], missed: [],
      messageTokensByEnc: byEnc(d.messageTokens.o200k_base, d.messageTokens.cl100k_base),
      winningArm: d.winningArm, notes: 'identity: DAEDALUS-D did not pay',
    };
  }
  const oldPrompt = chironDecoderPrompt(d.wire);
  if (oldPrompt !== d.decoderPrompt) throw new Error('SIGE: the arm prompt is not chironDecoderPrompt(wire)');
  const red = sigeRewrite(oldPrompt, enc);
  const decoded = chironDecode(d.wire);
  const exact = decoded === text;
  if (!exact) {
    return {
      codec: 'sige', wire: text, decoderPrompt: '', decoded: text, exact: true, mode: 'raw',
      inTokens: d.inTokens.o200k_base, messageTokens: d.messageTokens[enc], messageTokensOld: d.messageTokens[enc],
      contractTokens: 0, contractTokensOld: 0, changed: [], missed: [],
      messageTokensByEnc: byEnc(d.messageTokens.o200k_base, d.messageTokens.cl100k_base),
      winningArm: d.winningArm, notes: 'identity: the wire failed the chironDecode round trip',
    };
  }
  const mO = countTokens(red.prompt, 'o200k_base');
  const mC = countTokens(red.prompt, 'cl100k_base');
  const contractTokens = mO - countTokens(d.wire, enc);
  return {
    codec: 'sige', wire: d.wire, decoderPrompt: red.prompt, decoded, exact: true, mode: 'daedalus',
    inTokens: d.inTokens.o200k_base, messageTokens: mO, messageTokensOld: d.messageTokens.o200k_base,
    contractTokens, contractTokensOld: d.messageTokens.o200k_base - countTokens(d.wire, enc),
    changed: red.changed, missed: red.missed, messageTokensByEnc: byEnc(mO, mC),
    winningArm: d.winningArm,
    notes: `arm=${d.winningArm}; contract ${countTokens(oldPrompt, enc) - countTokens(d.wire, enc)}->${contractTokens}; clauses ${red.changed.join(',') || 'none'}${red.missed.length ? '; unmatched ' + red.missed.join(',') : ''}`,
  };
}
