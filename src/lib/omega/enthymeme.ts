/**
 * ENTHYMEME — entailment elision: fields the reader can derive are not sent.
 * =============================================================================
 * ἐνθύμημα — a syllogism with one premise left unstated because the listener
 * supplies it. This codec leaves unstated the parts of a message that are a
 * deterministic, PUBLICLY-SPECIFIED function of other parts of the same line,
 * and tells the reader the function once.
 *
 * THE GAP (measured, Z46)
 * -----------------------------------------------------------------------------
 * The frontier dictionary (DAEDALUS) reduces any REPEATED token sequence to one
 * token per occurrence. It cannot go below one token per position, and it pays
 * full price for a value that occurs once. Two everyday formats carry values that
 * occur once per line and are nevertheless redundant, because a public convention
 * fixes them given their neighbours:
 *
 *   1. JVM stack frames  `at pkg.Outer$Inner.method(Outer.java:123)`
 *      `java.lang.StackTraceElement.toString()` prints the SOURCE FILE, and Java
 *      requires a public top-level class to live in `<SimpleName>.java`. So the
 *      file is the frame's simple class name cut at the first `$`, in 580 of 580
 *      frames across ten real GitHub issues (bench/z46/receipts/trace-probe.log).
 *      The dictionary recovers part of it when the same class recurs; what is
 *      left is 2.6–14.5 % of the whole issue body (−887 tokens on 11 283).
 *   2. Markdown heading links  `[Getting Started](#getting-started)`
 *      GitHub derives the fragment from the heading text (github-slugger:
 *      lowercase, drop everything but letters/digits/spaces/`-`/`_`, spaces to
 *      `-`). A table of contents therefore repeats every heading twice, once in a
 *      form the dictionary cannot share with the first (the slug tokenises
 *      differently). −154 (axios README, −6.8 %) and −389 (system-design-primer,
 *      −10.2 %) versus DAEDALUS.
 *
 * WHY THIS IS NOT ANY EXISTING LANE
 * -----------------------------------------------------------------------------
 *   dictionary lanes (DAEDALUS, CHIRON, ANAMNESIS …) copy repeats; here the
 *   elided value is NOT a copy of anything in the text (`Outer.java` vs
 *   `pkg.Outer$Inner`; `getting-started` vs `Getting Started`).
 *   NYX / EIDOS / MNEMOSYNE induce per-message programs over template-aligned log
 *   columns; here nothing is induced — the function is a published convention
 *   (JLS §7.6 + StackTraceElement.toString; github-slugger) that the reader
 *   already knows, so the contract is one sentence and no family detection is
 *   needed. ECHO/CTXCOPY copy earlier text with a transform; ANAGNORISIS imports
 *   external canon. ENTHYMEME imports an external FUNCTION.
 *
 * WHAT IT DOES NOT DO (measured negative space, bench/z46/receipts)
 * -----------------------------------------------------------------------------
 *   PHP/PSR-4 frame paths (`#3 …/Illuminate/Http/Kernel.php(123): Illuminate\Http\
 *   Kernel->…`) are entailed in only 12–55 % of frames (the path is the CALL SITE,
 *   the class is the CALLEE) and eliding them fragments the dictionary's repeated
 *   paths: +13 … +47 tokens on five Laravel issues. Not shipped. .NET frames name
 *   the file freely (`Packets.Serializer.cs`). Not shipped. Same-URL links
 *   `[U](U)` occur 10 times in 150 real files. Not shipped.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1   `∴ ` + the one-sentence rule(s) actually used
 *   rest     the DAEDALUS wire of the text with the entailed fields removed
 *   The decoder prompt is the rule line followed by DAEDALUS's own prompt; the
 *   reader expands the dictionary, then restores the elided fields. M counts both.
 *
 * GATE / GUARD
 * -----------------------------------------------------------------------------
 *   A rule is applied only when its own round trip on the raw text is exact and
 *   the payload does not already contain the elided form. The composed wire is
 *   emitted only if it decodes byte-exactly; the plain DAEDALUS arm is computed as
 *   a guard when the predicted saving is below `guardBelow` (default 60) and the
 *   smaller message wins. Above that the plain arm is skipped (single-arm path).
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';

export const ENTHYMEME_MARK = '∴ ';

/* ---------------------------------------------------------------------------
 * 1. RULES
 * ------------------------------------------------------------------------- */

export interface FoldStats {
  text: string;
  /** fields elided */
  count: number;
  /** distinct elided values */
  distinct: number;
  /** raw tokens of the elided fields */
  elidedTokens: number;
  /** predicted saving against the dictionary, in tokens */
  estimate: number;
}

export interface Rule {
  id: 'frames' | 'anchors';
  /** the sentence the reader needs */
  clause: string;
  /** a substring of the clause that identifies it in a wire's first line */
  tag: string;
  fold(text: string, enc: EncodingName): FoldStats | null;
  unfold(text: string): string;
}

// ---- rule 1: JVM stack frames ------------------------------------------------

// `at` + class path (may carry a module prefix `java.base/` and `$` inner classes) + `.` + method + `(File.java:N)`
const FRAME_RE = /\bat\s+([\w$.<>/[\]-]+)\.([\w$<>]+)\((\w[\w$]*)\.java:(\d+)\)/g;
const FRAME_FOLDED_RE = /\bat\s+([\w$.<>/[\]-]+)\.([\w$<>]+)\(:(\d+)\)/g;

/** the source file Java requires for a frame's class: the simple name (after the last `.`), cut at the first `$` */
export function frameSourceName(classPath: string): string {
  const simple = classPath.slice(classPath.lastIndexOf('.') + 1);
  const dollar = simple.indexOf('$');
  return dollar < 0 ? simple : simple.slice(0, dollar);
}

const framesRule: Rule = {
  id: 'frames',
  tag: '(:N)',
  clause: 'Stack frames: "at C.m(:N)" = "at C.m(S.java:N)", S = C after its last ".", cut at the first "$".',
  fold(text, enc) {
    FRAME_FOLDED_RE.lastIndex = 0;
    if (FRAME_FOLDED_RE.test(text)) return null; // the elided form already occurs: not safe
    const seen = new Map<string, number>();
    let count = 0, elidedTokens = 0;
    const out = text.replace(FRAME_RE, (m, cls: string, method: string, file: string, line: string) => {
      if (frameSourceName(cls) !== file) return m;
      count++;
      seen.set(file, (seen.get(file) || 0) + 1);
      elidedTokens += countTokens(file + '.java', enc);
      return m.slice(0, m.indexOf(cls)) + `${cls}.${method}(:${line})`;
    });
    if (!count) return null;
    // calibration (bench/z46/receipts/trace-probe.log): a distinct file saves its tokens minus the glyph the
    // dictionary would have used; a repeated one saves about half a token
    let distinctTokens = 0;
    for (const f of seen.keys()) distinctTokens += countTokens(f + '.java', enc);
    const estimate = Math.round(distinctTokens - seen.size + (count - seen.size) / 2);
    return { text: out, count, distinct: seen.size, elidedTokens, estimate };
  },
  unfold(text) {
    return text.replace(FRAME_FOLDED_RE, (m, cls: string, method: string, line: string) =>
      m.slice(0, m.indexOf(cls)) + `${cls}.${method}(${frameSourceName(cls)}.java:${line})`);
  },
};

// ---- rule 2: Markdown heading anchors ----------------------------------------

const ANCHOR_RE = /\[([^[\]\n]+)\]\(#([^()\s]+)\)/g;
const ANCHOR_FOLDED_RE = /\[([^[\]\n]+)\]\(#\)/g;

/** GitHub's heading slug: lowercase; keep letters, digits, marks, spaces, `-`, `_`; spaces become `-` */
export function headingSlug(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}\p{M} \-_]/gu, '').replace(/ /g, '-');
}

const anchorsRule: Rule = {
  id: 'anchors',
  tag: '](#)',
  clause: 'Links: "[t](#)" = "[t](#s)", s = t lowercased, keeping only letters, digits, spaces, "-" and "_", then spaces → "-".',
  fold(text, enc) {
    ANCHOR_FOLDED_RE.lastIndex = 0;
    if (ANCHOR_FOLDED_RE.test(text)) return null;
    const seen = new Set<string>();
    let count = 0, elidedTokens = 0;
    const out = text.replace(ANCHOR_RE, (m, label: string, anchor: string) => {
      if (headingSlug(label) !== anchor) return m;
      count++; seen.add(anchor);
      elidedTokens += countTokens(anchor, enc);
      return `[${label}](#)`;
    });
    if (!count) return null;
    // calibration (bench/z46/receipts/toc-probe.log): Δ ≈ 1.0–1.3 × elided tokens (the slugs also cost the
    // dictionary rules it had spent on them); use the elided tokens as the estimate
    return { text: out, count, distinct: seen.size, elidedTokens, estimate: elidedTokens };
  },
  unfold(text) {
    return text.replace(ANCHOR_FOLDED_RE, (_m, label: string) => `[${label}](#${headingSlug(label)})`);
  },
};

export const ENTHYMEME_RULES: readonly Rule[] = [framesRule, anchorsRule];

/* ---------------------------------------------------------------------------
 * 2. ENCODER
 * ------------------------------------------------------------------------- */

export interface EnthymemeResult extends DaedalusResult {
  codec2: 'enthymeme';
  applied: boolean;
  rules: Rule['id'][];
  /** entailed fields removed */
  elided: number;
  /** raw tokens of those fields */
  elidedTokens: number;
  clauseTokens: number;
  plainMessageTokens: number;
}

export interface EnthymemeOptions extends DaedalusOptions {
  /** which rules may fire (default all) */
  rules?: Rule['id'][];
  /** compute the plain frontier arm as a guard when the predicted saving is below this (default 60) */
  guardBelow?: number;
  /** minimum predicted saving for a single rule to be worth its sentence (default 12) */
  minRuleSaving?: number;
}

function plainResult(plain: DaedalusResult, started: number, note: string): EnthymemeResult {
  return {
    ...plain, codec2: 'enthymeme', applied: false, rules: [], elided: 0, elidedTokens: 0, clauseTokens: 0,
    plainMessageTokens: plain.messageTokens, ms: Date.now() - started, notes: `enthymeme: not applied (${note}); ${plain.notes}`,
  };
}

export function enthymemeEncode(text: string, enc: EncodingName = 'o200k_base', options: EnthymemeOptions = {}): EnthymemeResult {
  const started = Date.now();
  const { rules = ['frames', 'anchors'], guardBelow = 60, minRuleSaving = 12, ...dopts } = options;
  const inTokens = countTokens(text, enc);
  if (text.startsWith(ENTHYMEME_MARK)) return plainResult(daedalusEncode(text, enc, dopts), started, 'payload starts with the rule mark');

  let reduced = text;
  const used: Rule[] = [];
  let elided = 0, elidedTokens = 0, estimate = 0;
  for (const rule of ENTHYMEME_RULES) {
    if (!rules.includes(rule.id)) continue;
    const f = rule.fold(reduced, enc);
    if (!f || f.estimate < minRuleSaving) continue;
    if (rule.unfold(f.text) !== reduced) continue; // the rule's own round trip must be exact on this text
    reduced = f.text; used.push(rule);
    elided += f.count; elidedTokens += f.elidedTokens; estimate += f.estimate;
  }
  if (!used.length) return plainResult(daedalusEncode(text, enc, dopts), started, 'no entailed field found');

  const clause = ENTHYMEME_MARK + used.map(r => r.clause).join(' ');
  const clauseTokens = countTokens(clause + '\n', enc);
  const saving = estimate - clauseTokens;
  if (saving <= 0) return plainResult(daedalusEncode(text, enc, dopts), started, `predicted saving ${estimate} does not repay the rule sentence (${clauseTokens})`);

  const inner = daedalusEncode(reduced, enc, dopts);
  const wire = clause + '\n' + inner.wire;
  const decoderPrompt = clause + '\n' + inner.decoderPrompt;
  const decoded = enthymemeDecode(wire);
  const exact = decoded === text;
  const messageTokens = countTokens(decoderPrompt, enc);
  const outTokens = countTokens(wire, enc);
  const plain = !exact || saving < guardBelow ? daedalusEncode(text, enc, dopts) : null;
  if (!exact || (plain && messageTokens >= plain.messageTokens)) {
    return plainResult(plain!, started, !exact ? 'composed wire failed the round trip' : `composed M ${messageTokens} >= plain M ${plain!.messageTokens}`);
  }
  return {
    ...inner, codec2: 'enthymeme', wire, decoded, exact, inTokens, outTokens, messageTokens,
    contractTokens: messageTokens - outTokens + clauseTokens, decoderPrompt,
    savingsPct: inTokens ? (1 - messageTokens / inTokens) * 100 : 0,
    applied: true, rules: used.map(r => r.id), elided, elidedTokens, clauseTokens,
    plainMessageTokens: plain ? plain.messageTokens : inTokens, ms: Date.now() - started,
    notes: `enthymeme: ${used.map(r => r.id).join('+')} elided ${elided} field(s) (${elidedTokens} raw tok, predicted −${estimate}) + rule ${clauseTokens} tok; M ${messageTokens}${plain ? ` vs plain ${plain.messageTokens}` : ' (plain run skipped: clear win)'}; ${inner.notes}`,
  };
}

/* ---------------------------------------------------------------------------
 * 3. DECODER / PROMPT
 * ------------------------------------------------------------------------- */

function splitWire(wire: string): { clause: string; inner: string } | null {
  if (!wire.startsWith(ENTHYMEME_MARK)) return null;
  const k = wire.indexOf('\n');
  return { clause: k < 0 ? wire : wire.slice(0, k), inner: k < 0 ? '' : wire.slice(k + 1) };
}

export function enthymemeDecode(wire: string): string {
  const s = splitWire(wire);
  if (!s) return daedalusDecode(wire);
  let text = daedalusDecode(s.inner);
  // rules are undone in reverse order of application
  for (const rule of [...ENTHYMEME_RULES].reverse()) if (s.clause.includes(rule.tag)) text = rule.unfold(text);
  return text;
}

export function enthymemeDecoderPrompt(wire: string): string {
  const s = splitWire(wire);
  const innerPrompt = (inner: string) => daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
  if (!s) return innerPrompt(wire);
  return s.clause + '\n' + innerPrompt(s.inner);
}
