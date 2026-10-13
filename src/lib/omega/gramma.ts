/**
 * GRAMMA — notation dialects: the decoder's own formatting priors as the
 * dictionary.
 * =============================================================================
 * WHERE THIS SITS IN THE STACK
 *
 * Every codec shipped so far pays for redundancy: a repeated phrase is hoisted
 * into a table and referenced by a glyph.  Measured today on 8 real files
 * (bench/z44/lit.ts), that lever is *exhausted at the wire level*: the
 * literal-compaction candidates that looked worth 3.06% of the raw tokens on a
 * GitHub-API response (53 `https://` hits) are worth **4 tokens on the wire,
 * total**, because DAEDALUS's dictionary has already absorbed those literals
 * (only 3 of the 53 still appear as literals there).  Same story for dates,
 * hex runs and URL schemes.  Repetition is spent.
 *
 * What is NOT redundant, and therefore survives every dictionary codec, is
 * LAYOUT.  Indentation and line breaks are not repeated content; they are
 * *derivable* content.  `JSON.stringify(v, null, 2)` output is a deterministic
 * function of the value it prints; the indentation of a machine-formatted
 * source file is a deterministic function of its bracket depth.
 *
 * GRAMMA exploits that.  Instead of shipping a dictionary of repeated strings,
 * it ships the text in a cheaper notation and lets the reader regenerate the
 * expensive notation from its own knowledge of the convention: the dictionary
 * is the model's prior over formatting, and it costs one declarative sentence
 * per message instead of one glyph per occurrence.
 *
 * Wire measurements this rests on (bench/z44/layout.ts, OMEGA_DET=1, o200k,
 * messageTokens deltas = contract included on both sides, clause NOT included):
 *
 *   json-real/react            821 ->  764   -57   (6.9%)
 *   json-real/typescript      1001 ->  960   -41   (4.1%)
 *   json-real/vite            1573 -> 1514   -59   (3.8%)
 *   holdout/code-ts           1028 ->  952   -76   (7.4%)
 *   holdout/dts0.txt          2135 -> 2064   -71   (3.3%)
 *   holdout/gh-api.json       1153 -> 1095   -58   (5.0%)
 *   holdout/json-pkg.txt       743 ->  727   -16   (2.2%)
 *
 * GRAMMA charges the clause: it scores every dialect by
 * M = tokens(clause + DAEDALUS contract), takes the minimum over the whole
 * menu, and keeps plain DAEDALUS in the menu as the `none` candidate, so it
 * cannot lose to DAEDALUS on the metric.  The clause is 14-24 tokens, i.e.
 * under 0.4% of M on any file large enough for a dialect to fire.
 *
 * BYTE-EXACTNESS
 *
 * Not assumed.  `expand(canon(text)) === text` is checked on the actual text
 * before a candidate is admitted, and the candidate is re-checked through the
 * library's own CHIRON reader — the same reader the message tells an LLM to
 * run — before it can win.  A dialect that cannot reproduce the file
 * byte-for-byte is silently dropped, and the codec then falls back to plain
 * DAEDALUS, which itself falls back to the raw text.  There is no lossy step
 * anywhere in that path.
 *
 * WHAT IS HONESTLY NOT VERIFIED HERE
 *
 * Library-side byte-exactness is machine-checked.  Whether a *given model*
 * executes "print the decoded body as JSON.stringify(v, null, 2)" correctly is
 * not something this repository can prove offline, so the clause is phrased in
 * terms of a deterministic, universally known library call rather than prose
 * taste, and bench/z44/gramma-prompt.mjs emits the literal one-chat message
 * for external checking.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, chironDecode } from './chiron';
import { daedalusEncode, type DaedalusOptions, type DaedalusResult } from './daedalus';

export type GrammaDialectId =
  | 'none'
  | 'json1'
  | 'json2'
  | 'json4'
  | 'jsontab'
  | 'indent1s'
  | 'indent2s'
  | 'indent4s'
  | 'indenttabs'
  | 'indent1'
  | 'indent2'
  | 'indent4'
  | 'indenttab';

/** Opens the one-line dialect preamble of the one-chat message. */
export const GRAMMA_TAG = '⟐';

interface Dialect {
  id: GrammaDialectId;
  /** Cheap-notation map: original text -> the text DAEDALUS will encode. */
  canon: (text: string) => string;
  /** Inverse: expanded DAEDALUS text -> original text, byte-exact. */
  expand: (cheap: string) => string;
  /** The preamble line that tells a reader to invert it. */
  clause: string;
  /** Skip this dialect when the named sibling already verified: the sibling's
   *  canon is a superset of this one's strip and its clause is shorter, so it
   *  can only score lower.  This keeps the extra coverage free at encode time. */
  strictOf?: GrammaDialectId;
}

/* ---------------------------------------------------------------------------
 * 1. JSON notation.  Minification is whitespace-only and string-aware, so it
 *    cannot touch scalar content; pretty-printing is the JSON.stringify(v,
 *    null, 2) convention, which is total on minified JSON.
 * ------------------------------------------------------------------------- */

function jsonMinify(text: string): string {
  let out = '';
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') continue;
    out += ch;
  }
  return out;
}

function jsonPretty(cheap: string, unit: string): string {
  let out = '';
  let depth = 0;
  let inStr = false;
  let esc = false;
  const pad = () => unit.repeat(Math.max(0, depth));
  for (let i = 0; i < cheap.length; i++) {
    const ch = cheap[i];
    if (inStr) {
      out += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') {
      inStr = true;
      out += ch;
      continue;
    }
    if (ch === '{' || ch === '[') {
      const closer = ch === '{' ? '}' : ']';
      let j = i + 1;
      while (j < cheap.length && (cheap[j] === ' ' || cheap[j] === '\n' || cheap[j] === '\r' || cheap[j] === '\t')) j++;
      if (cheap[j] === closer) {
        // JSON.stringify keeps empty containers inline.
        out += ch + closer;
        i = j;
        continue;
      }
      depth++;
      out += ch + '\n' + pad();
      continue;
    }
    if (ch === '}' || ch === ']') {
      depth = Math.max(0, depth - 1);
      out += '\n' + pad() + ch;
      continue;
    }
    if (ch === ',') {
      out += ',\n' + pad();
      continue;
    }
    if (ch === ':') {
      out += ': ';
      continue;
    }
    out += ch;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. Code notation.  Strip each line's leading whitespace; rebuild it from
 *    bracket depth.  The delta scanner is string- and comment-aware, so
 *    brackets inside literals and comments do not move the depth counter.
 * ------------------------------------------------------------------------- */

interface ScanState {
  inBlock: boolean;
}

function bracketDelta(line: string, st: ScanState): number {
  let delta = 0;
  let i = 0;
  let quote = '';
  let block = st.inBlock;
  while (i < line.length) {
    const ch = line[i];
    if (block) {
      if (ch === '*' && line[i + 1] === '/') {
        block = false;
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (quote) {
      if (ch === '\\') {
        i += 2;
        continue;
      }
      if (ch === quote) quote = '';
      i++;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
      i++;
      continue;
    }
    if (ch === '/' && line[i + 1] === '/') break;
    if (ch === '/' && line[i + 1] === '*') {
      block = true;
      i += 2;
      continue;
    }
    if (ch === '{' || ch === '[' || ch === '(') delta++;
    else if (ch === '}' || ch === ']' || ch === ')') delta--;
    i++;
  }
  st.inBlock = block;
  return delta;
}

/**
 * Self-marking prefix elision.
 *
 * A line's leading whitespace is dropped ONLY if it is exactly what the bracket
 * depth predicts; every other line keeps its own whitespace.  The result is
 * unambiguous without any side channel: a remaining line that starts with
 * whitespace is already indented, a line that starts with a visible character
 * is not, and the two cases cannot be confused because the canonical form of a
 * line never begins with whitespace.  That removes the all-or-nothing cliff
 * that pure re-indentation has on real code: measured on
 * bench/train/dts0.txt, a 394-line TypeScript declaration file, full depth
 * re-indentation differs on 4 lines (Prettier continuation indent) and would be
 * rejected outright, while this rule keeps exactly those 4 lines.
 */
function predictedDepth(depth: number, line: string): number {
  let d = depth;
  if (/^[)\]}]/.test(line)) d = Math.max(0, d - 1);
  return d;
}

/**
 * The predicted leading whitespace of one line.  Inside a block comment the
 * conventional ' * ' continuation sits one space past its depth, which is what
 * makes JSDoc and C block comments line up under their opener; that single
 * extra space is part of the convention, so it is predicted rather than
 * shipped.
 */
function predictedPrefix(depth: number, line: string, inComment: boolean, unit: string): string {
  return unit.repeat(predictedDepth(depth, line)) + (inComment && line.startsWith('*') ? ' ' : '');
}

function stripLeading(text: string, unit: string): string {
  const st: ScanState = { inBlock: false };
  let depth = 0;
  const out: string[] = [];
  for (const line of text.split('\n')) {
    const t = line.trimStart();
    if (t === '') {
      out.push(line); // empty and whitespace-only lines are never rewritten
      continue;
    }
    const predicted = predictedPrefix(depth, t, st.inBlock, unit);
    const lead = /^[ \t]*/.exec(line)![0];
    out.push(lead === predicted ? line.slice(lead.length) : line);
    depth = Math.max(0, depth + bracketDelta(t, st));
  }
  return out.join('\n');
}

/** Strict canon: every content line loses all its leading whitespace. */
function stripAllLeading(text: string): string {
  return text
    .split('\n')
    .map((l) => (l.trimStart() === '' ? l : l.replace(/^[ \t]+/, '')))
    .join('\n');
}

function reindent(cheap: string, unit: string): string {
  const st: ScanState = { inBlock: false };
  let depth = 0;
  const out: string[] = [];
  for (const line of cheap.split('\n')) {
    const t = line.trimStart();
    if (t === '') {
      out.push(line);
      continue;
    }
    out.push(/^[ \t]/.test(line) ? line : predictedPrefix(depth, t, st.inBlock, unit) + line);
    depth = Math.max(0, depth + bracketDelta(t, st));
  }
  return out.join('\n');
}

/* ---------------------------------------------------------------------------
 * 3. The menu.  Deliberately small: each extra dialect costs the encoder a
 *    DAEDALUS encode and gives the reader another chance to mis-execute, so
 *    only conventions with a total, one-line description are admitted.
 * ------------------------------------------------------------------------- */

const jsonClause = (repr: string) =>
  `${GRAMMA_TAG}j${repr}: print it as JSON.stringify(v,null,${repr}).`;
const strictClause = (unitName: string) =>
  `${GRAMMA_TAG}i${unitName}: re-indent by bracket depth, ${unitName} per level, closers one level out.`;
const keepClause = (unitName: string) =>
  `${GRAMMA_TAG}i${unitName}: re-indent only flush-left lines, ${unitName} per unclosed ( [ { before them, one level less for a closer.`;

export const GRAMMA_DIALECTS: readonly Dialect[] = [
  { id: 'json1', canon: jsonMinify, expand: (c) => jsonPretty(c, ' '), clause: jsonClause('1') },
  { id: 'json2', canon: jsonMinify, expand: (c) => jsonPretty(c, '  '), clause: jsonClause('2') },
  { id: 'json4', canon: jsonMinify, expand: (c) => jsonPretty(c, '    '), clause: jsonClause('4') },
  { id: 'jsontab', canon: jsonMinify, expand: (c) => jsonPretty(c, '\t'), clause: jsonClause('"\\t"') },
  { id: 'indent1s', canon: stripAllLeading, expand: (c) => reindent(c, ' '), clause: strictClause('1sp') },
  { id: 'indent2s', canon: stripAllLeading, expand: (c) => reindent(c, '  '), clause: strictClause('2sp') },
  { id: 'indent4s', canon: stripAllLeading, expand: (c) => reindent(c, '    '), clause: strictClause('4sp') },
  { id: 'indenttabs', canon: stripAllLeading, expand: (c) => reindent(c, '\t'), clause: strictClause('1tab') },
  { id: 'indent1', canon: (t) => stripLeading(t, ' '), expand: (c) => reindent(c, ' '), clause: keepClause('1sp'), strictOf: 'indent1s' },
  { id: 'indent2', canon: (t) => stripLeading(t, '  '), expand: (c) => reindent(c, '  '), clause: keepClause('2sp'), strictOf: 'indent2s' },
  { id: 'indent4', canon: (t) => stripLeading(t, '    '), expand: (c) => reindent(c, '    '), clause: keepClause('4sp'), strictOf: 'indent4s' },
  { id: 'indenttab', canon: (t) => stripLeading(t, '\t'), expand: (c) => reindent(c, '\t'), clause: keepClause('1tab'), strictOf: 'indenttabs' },
] as const;

export interface GrammaOptions extends DaedalusOptions {
  /** only consider these dialects (default: the whole menu) */
  dialects?: GrammaDialectId[];
  /** skip a dialect whose cheap form does not save at least this many raw tokens */
  minRawGain?: number;
}

export interface GrammaCandidate {
  id: GrammaDialectId;
  M: number;
  clauseTokens: number;
  cheapTokens: number;
  wireTokens: number;
  mode: string;
  innerMessageTokens: number;
}

export interface GrammaResult {
  codec: 'gramma';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  winningDialect: GrammaDialectId;
  candidates: GrammaCandidate[];
  clauseTokens: number;
  inner: DaedalusResult;
  notes: string;
}

/**
 * Encode with the notation-dialect search.  Every candidate is verified
 * byte-exact before it is admitted, and the no-dialect DAEDALUS candidate is
 * always in the set, so this can only tie or beat DAEDALUS' own message cost.
 */
export function grammaEncode(text: string, enc: EncodingName = 'o200k_base', options: GrammaOptions = {}): GrammaResult {
  const inTokens = countTokens(text, enc);
  const want = options.dialects;
  const minRawGain = options.minRawGain ?? 8;

  const innerOptions: GrammaOptions = { ...options };
  delete innerOptions.dialects;
  delete innerOptions.minRawGain;

  const base = daedalusEncode(text, enc, innerOptions);
  const candidates: GrammaCandidate[] = [
    { id: 'none', M: base.messageTokens, clauseTokens: 0, cheapTokens: inTokens, wireTokens: base.outTokens, mode: base.mode, innerMessageTokens: base.messageTokens },
  ];
  let best = { cand: candidates[0], wire: base.wire, decoded: base.decoded, prompt: base.decoderPrompt, inner: base };

  const verified = new Set<GrammaDialectId>();
  for (const d of GRAMMA_DIALECTS) {
    if (want && !want.includes(d.id)) continue;
    if (d.strictOf && verified.has(d.strictOf)) continue;
    const cheap = d.canon(text);
    if (cheap === text) continue;
    const cheapTokens = countTokens(cheap, enc);
    if (inTokens - cheapTokens < minRawGain) continue;
    if (d.expand(cheap) !== text) continue; // byte-exactness gate on the source text
    verified.add(d.id);
    const r = daedalusEncode(cheap, enc, innerOptions);
    if (r.decoded !== cheap) continue; // library round trip on the cheap form
    if (d.expand(r.decoded) !== text) continue; // library round trip on the original
    const prompt = `${d.clause}\n${r.decoderPrompt}`;
    const M = countTokens(prompt, enc);
    const cand: GrammaCandidate = {
      id: d.id,
      M,
      clauseTokens: countTokens(d.clause, enc),
      cheapTokens,
      wireTokens: r.outTokens,
      mode: r.mode,
      innerMessageTokens: r.messageTokens,
    };
    candidates.push(cand);
    if (M < best.cand.M) best = { cand, wire: r.wire, decoded: text, prompt, inner: r };
  }

  return {
    codec: 'gramma',
    wire: best.wire,
    decoded: best.decoded,
    exact: best.decoded === text,
    inTokens,
    outTokens: best.cand.wireTokens,
    messageTokens: best.cand.M,
    contractTokens: best.cand.M - best.cand.wireTokens,
    decoderPrompt: best.prompt,
    winningDialect: best.cand.id,
    candidates,
    clauseTokens: best.cand.clauseTokens,
    inner: best.inner,
    notes:
      `dialect=${best.cand.id} of ${candidates.length} candidate(s) scored; clause=${best.cand.clauseTokens} tok; ` +
      `M=${best.cand.M} vs DAEDALUS ${base.messageTokens} (saves ${base.messageTokens - best.cand.M}); ` +
      `inner=${best.inner.mode}/${best.inner.winningArm}`,
  };
}

/** Recover the dialect a one-chat message declares, or null for plain DAEDALUS. */
export function grammaDialectOf(prompt: string): Dialect | null {
  const first = prompt.split('\n', 1)[0];
  return GRAMMA_DIALECTS.find((d) => first === d.clause) ?? null;
}

/**
 * Library-side reader.  Deliberately the dumbest inverse of the message: drop
 * the dialect preamble, run the shared CHIRON reader on the wire the DAEDALUS
 * contract leaves behind, then apply the dialect inverse.  A reader that does
 * exactly this is what the preamble describes.
 */
export function grammaDecode(prompt: string): string {
  const d = grammaDialectOf(prompt);
  const rest = d ? prompt.slice(prompt.indexOf('\n') + 1) : prompt;
  let body: string;
  if (rest.startsWith(CHIRON_START)) {
    const wire = rest.slice(0, rest.lastIndexOf('\n')); // DAEDALUS appends its clauses as the last line
    body = chironDecode(wire);
  } else {
    body = rest; // inner codec took the raw path: the body is the text itself
  }
  return d ? d.expand(body) : body;
}
