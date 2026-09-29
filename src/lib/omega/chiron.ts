/**
 * CHIRON — a two-part-MDL text program for one ordinary chat message.
 * =============================================================================
 *
 * WHAT PROBLEM THIS ACTUALLY SOLVES
 * -----------------------------------------------------------------------------
 * The repository's contract is that an LLM must decode the wire inside ONE chat
 * turn: no skills.md, no system prompt, no prior turn, no tool.  Under that
 * contract the honest cost of a codec is the *whole message*
 *
 *      M(x) = tokens(decoder contract) + tokens(wire)
 *
 * and a codec is only useful when M(x) < tokens(x).  This is exactly the
 * two-part code of the Minimum Description Length principle — L(model) +
 * L(data | model) — with one twist that the compression literature never has to
 * face: **the "model" term is natural-language prose and it is billed in the
 * same tokenizer units as the data.**  Kolmogorov's invariance theorem says the
 * interpreter constant is O(1) and therefore ignorable asymptotically; at chat
 * scale (10^2–10^4 tokens) that constant is 30–60% of everything a codec saves.
 * So the constant is not a footnote here, it is the objective.
 *
 * HERMES-Ω made that argument and won it against the 64k-token prompt tails of
 * the stacked codecs.  But HERMES-Ω then *spends* 128 o200k tokens explaining a
 * deliberately exotic wire (delimiter-free tape, script self-declaration, two
 * counter forms), and HERMES-F spends 70–130 explaining T/B/R plus four slot
 * generators while JSON-escaping every raw region.  Measured in this repo, on
 * this branch, before any change in this module:
 *
 *   · HERMES-Ω contract  = 128 tokens flat (184 with counters)
 *   · HERMES-F contract  = 70–130 tokens, and `R \t <JSON>` costs an extra
 *     181–202 tokens of escape tax on gh-prose / json-pkg / code-ts
 *   · ten of 37 measured lanes decline to identity *only* because the contract
 *     cannot be paid — e.g. holdout/code-dts has a 69-token framed wire against
 *     a 162-token input and still loses, because 69 + 128 > 162.
 *
 * CHIRON attacks the two-part objective directly, on three axes at once:
 *
 *   (1) CONTRACT AS A DECISION VARIABLE.  The wire syntax is chosen so that its
 *       prose description is short, and each operation is admitted only if the
 *       tokens it saves exceed the tokens its own clause costs.  The contract is
 *       *compiled from the finished wire*: clauses for unused operations are
 *       never emitted, and the encoder re-runs the whole search with each
 *       operation disabled and keeps the lowest measured M.  An operation whose
 *       explanation costs more than it saves is deleted, not shipped.
 *
 *   (2) RAW STAYS RAW.  Unstructured regions are copied verbatim into the body.
 *       There is no JSON escape, no per-line op prefix (measured: ~1 token per
 *       line), and no length header.  The body is the payload.
 *
 *   (3) ONE WIRE, THREE MECHANISMS.  A macro tape (token-aligned SLP), a
 *       repeat/fill-in block over line units with per-column lists, and integer
 *       ranges all compose in the same program, and the SLP runs *after* the
 *       block pass so that block templates are themselves macro-compressed.
 *       HERMES-Ω and HERMES-F each had one of these and could not compose them.
 *
 * WIRE (everything below is discovered per input; nothing is a fixed schema)
 * -----------------------------------------------------------------------------
 *   §  RULES  ¶  BODY
 *
 *   §     U+00A7, 1 o200k token. A string not starting with § decodes to itself.
 *   ¶     U+00B6, 1 token. Ends the rule tape. Rule texts never contain ¶; the
 *         body may, because the tape ends at the FIRST ¶.
 *   RULES a delimiter-free tape: each rule is one *new* letter of a declared
 *         one-token script followed by its text, which runs to the next new
 *         letter of that script (or to ¶). No separators, no numbering.
 *   BODY  the payload with admitted phrases replaced by their letters.
 *
 *   A rule's text is literal unless it starts with one of two operators:
 *
 *     × b t n L…   (U+00D7, 1 token) — REPEAT/FILL.  Write t's text n times
 *                  (t itself if t has no rule).  In copy i, the k-th occurrence
 *                  of the character b becomes item i of list k, where the lists
 *                  are the letters after n, in order, cycling if short.
 *                  b is declared *in the wire*, one character, so a payload
 *                  containing any particular blank character can never collide.
 *     … X          (U+2026, 1 token) — LIST.  `…a..b` is the integers a through
 *                  b.  Otherwise the character right after … is the separator
 *                  and the rest are the items.  Self-declaring, so a payload
 *                  containing any particular separator can never collide.
 *
 *   Rules only ever reference rules defined earlier (guaranteed by topological
 *   rendering), so expansion terminates and no cycle check is needed.
 *
 * WHY THESE TWO OPERATORS AND NOT MORE
 * -----------------------------------------------------------------------------
 * Every operator is a clause in the contract and every clause is billed.  A
 * dedicated character-run operator, an arithmetic-step operator and a cyclic
 * operator were all measured and deleted: `×` with a one-character template
 * already covers character runs, a cycling list already covers cyclic columns,
 * and a non-unit arithmetic step is rarer than its ~8-token clause is expensive.
 * `…a..b` survived because integer index columns are ubiquitous in ops text and
 * the notation needs no explanation a reader does not already have.
 *
 * IMPORTED RESULTS, RESTATED WITH THE HYPOTHESES ACTUALLY NEEDED
 * -----------------------------------------------------------------------------
 *  · Two-part MDL / Kolmogorov invariance (Grünwald; Li–Vitányi): the shortest
 *    description is L(model)+L(data|model) and the machine-dependent constant is
 *    bounded but *not* zero.  CHIRON's objective is literally this sum, counted
 *    with the live o200k_base tokenizer instead of bits.
 *  · Smallest grammar is NP-hard and hard to approximate within a constant
 *    (Charikar–Lehman–Liu–Panigrahy–Prabhakaran–Sahai–Shelat, STOC 2002 / IEEE
 *    TIT 2005).  Consequence: no optimality is claimed; every admission is
 *    re-scored against the live tokenizer and the emitted wire must beat the raw
 *    fallback on the *message* metric or it is discarded.
 *  · Generalized / iterated SLPs (Navarro–Olivares–Urbina, arXiv:2404.07057):
 *    a grammar rule may be a *program* rather than a concatenation.  `×` is a
 *    deliberately tiny, LLM-executable instance of that idea (repeat + indexed
 *    fill), not a claim of their asymptotic bounds.
 *  · Log template mining (Drain/Drain3, logpai): a log line is a constant
 *    template plus ordered variable parameters.  CHIRON derives the template and
 *    the parameter columns per input instead of from a fixed regex/mask table.
 *  · LTSC (Harvill et al., arXiv:2506.00307) and Dictionary-Encoding + ICL
 *    (de Campos–Lee–Kissos–Paritosh, arXiv:2604.13066) both show an LLM can
 *    expand an in-context dictionary losslessly, but LTSC fine-tunes and the
 *    latter puts the dictionary in the *system prompt* — which this contract
 *    forbids.  CHIRON keeps the dictionary in-band and minimizes the prose.
 *  · Delétang et al. (ICLR 2024) and LMCompress: prediction is compression, and
 *    a model + arithmetic coder beats any grammar.  That decoder is not
 *    available inside one chat message, so it is out of contract here.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No universal superiority, no optimality, and no behavioural guarantee that a
 * particular LLM executes the contract perfectly — that is a separate, unrun
 * experiment.  What is claimed and measured is: exact UTF-16 round-trip through
 * three independent decoders, and lower M than the HERMES stack on the lanes
 * reported in bench/chiron-report.md.
 * =============================================================================
 */

import { countTokens, tokenStrings, type EncodingName } from './bpe';

/* ---------------------------------------------------------------------------
 * 0. FRAME CHARACTERS — all measured at exactly 1 o200k_base token.
 * ------------------------------------------------------------------------- */
export const CHIRON_START = '§';   // U+00A7
export const CHIRON_SEP = '¶';     // U+00B6
export const CHIRON_REP = '×';     // U+00D7
export const CHIRON_LIST = '…';    // U+2026

/* ---------------------------------------------------------------------------
 * 1. GLYPH SCRIPTS — one-token code points, scanned against the live tokenizer
 *    once and cached.  The first letter of the tape declares which script the
 *    wire uses, so nothing about the alphabet is transmitted.
 * ------------------------------------------------------------------------- */
export interface ChironScript {
  name: string;
  label: string; // named in the generated contract
  lo: number;
  hi: number;
  /** Optional multi-range alphabet. When present it replaces [lo,hi). The
   *  ranges of such a script are disjoint from every single-range script here,
   *  so the first tape character still identifies the alphabet unambiguously
   *  and no existing wire changes meaning. */
  ranges?: Array<[number, number]>;
}

/** Is code point `cp` a letter of `s`? */
export function chironInScript(s: ChironScript, cp: number): boolean {
  if (s.ranges) { for (const [a, b] of s.ranges) if (cp >= a && cp < b) return true; return false; }
  return cp >= s.lo && cp < s.hi;
}

export const CHIRON_SCRIPTS: ChironScript[] = [
  { name: 'hangul', label: 'Hangul letter', lo: 0xac00, hi: 0xd7a4 },
  { name: 'katakana', label: 'Katakana letter', lo: 0x30a0, hi: 0x3100 },
  { name: 'cyrillic', label: 'Cyrillic letter', lo: 0x0400, hi: 0x0500 },
  { name: 'arabic', label: 'Arabic letter', lo: 0x0600, hi: 0x0700 },
  { name: 'myanmar', label: 'Myanmar letter', lo: 0x1000, hi: 0x10a0 },
  { name: 'khmer', label: 'Khmer letter', lo: 0x1780, hi: 0x1800 },
  // Appended last so CHIRON's collision-ordered choice is unchanged; ARIADNE
  // selects it explicitly for its 2415 two-character single tokens.
  { name: 'cjk', label: 'Chinese character', lo: 0x4e00, hi: 0xa000 },
  // POLYGLOT. Fourteen scripts whose ranges are disjoint from every entry above,
  // pooled into one alphabet: 802 one-token characters carrying 3420 two-character
  // single tokens — ten times the merge density of CJK at a usable size. Used by
  // SIBYL; appended last so no earlier codec's choice changes.
  {
    name: 'polyglot', label: 'Greek, Hebrew, Armenian, Georgian, Thai or Indic letter',
    lo: 0x0370, hi: 0x0370,
    ranges: [
      [0x0370, 0x0400], [0x0530, 0x0590], [0x0590, 0x0600], [0x0900, 0x0980],
      [0x0980, 0x0a00], [0x0a00, 0x0a80], [0x0a80, 0x0b00], [0x0b80, 0x0c00],
      [0x0c00, 0x0c80], [0x0c80, 0x0d00], [0x0d00, 0x0d80], [0x0d80, 0x0e00],
      [0x0e00, 0x0e80], [0x10a0, 0x1100],
    ],
  },
];

const poolCache = new Map<string, string[]>();

function scriptPool(script: ChironScript, enc: EncodingName): string[] {
  const key = `${script.name}:${enc}`;
  const hit = poolCache.get(key);
  if (hit) return hit;
  const out: string[] = [];
  const spans = script.ranges ?? [[script.lo, script.hi] as [number, number]];
  for (const [a, b] of spans) {
    for (let cp = a; cp < b; cp++) {
      const ch = String.fromCodePoint(cp);
      if (countTokens(ch, enc) === 1) out.push(ch);
    }
  }
  poolCache.set(key, out);
  return out;
}

/** One-token characters usable as the self-declared fill marker `b`. */
const BLANK_CANDIDATES = ['@', '·', '¤', '†', '‡', '»', '«', '¦', '¬', '±', '°', 'µ', '★', '◆', '\u0001', '\u0002'];
const blankCache = new Map<EncodingName, string[]>();
function blankPool(enc: EncodingName): string[] {
  const hit = blankCache.get(enc);
  if (hit) return hit;
  const out = BLANK_CANDIDATES.filter(c => countTokens(c, enc) === 1);
  blankCache.set(enc, out);
  return out;
}

/* ---------------------------------------------------------------------------
 * 2. PROGRAM MODEL
 * ------------------------------------------------------------------------- */
type RuleKind = 'lit' | 'rep' | 'list';

interface Rule {
  id: number;
  kind: RuleKind;
  /** literal rules: the text, containing glyph references as glyph characters */
  text: string;
  /** rep rules */
  blank?: string;
  tplRule?: number;  // rule id of the template, when the template is a rule
  tplChar?: string;  // single literal character template, when it is not
  count?: number;
  lists?: number[];  // rule ids of list rules
  /** list rules: the payload after `…` */
  listBody?: string;
}

export interface ChironResult {
  codec: 'chiron';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  /** tokens of the wire alone */
  outTokens: number;
  /** tokens of the complete one-chat message: contract + wire. The real cost. */
  messageTokens: number;
  /** messageTokens - outTokens */
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  rules: number;
  blocks: number;
  lists: number;
  script: string;
  ops: string[];
  ms: number;
  mode: 'chiron' | 'raw' | 'forced-wrap';
  notes: string;
}

/* ---------------------------------------------------------------------------
 * 3. DECODER — total.  Any wire that is not a well-formed CHIRON program
 *    decodes to itself, so decoding never invents text.
 * ------------------------------------------------------------------------- */

const MAX_EXPANSION = 1 << 23; // 8 MiB guard; the encoder never approaches it

function scriptOf(ch: string): ChironScript | null {
  const cp = ch.codePointAt(0);
  if (cp === undefined) return null;
  for (const s of CHIRON_SCRIPTS) if (chironInScript(s, cp)) return s;
  return null;
}

interface ParsedRule { glyph: string; raw: string }

/** Split the tape into (glyph, text) pairs using the delimiter-free rule. */
export function chironParseTape(tape: string, script: ChironScript): ParsedRule[] | null {
  if (tape === '') return [];
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const used = new Set<string>();
  const out: ParsedRule[] = [];
  let i = 0;
  if (!inScript(tape[0]) || tape[0] === undefined) return null;
  while (i < tape.length) {
    const glyph = tape[i];
    if (!inScript(glyph) || used.has(glyph)) return null;
    used.add(glyph);
    let j = i + 1;
    while (j < tape.length && !(inScript(tape[j]) && !used.has(tape[j]))) j++;
    out.push({ glyph, raw: tape.slice(i + 1, j) });
    i = j;
  }
  return out;
}

function parseListBody(body: string): string[] | null {
  const m = body.match(/^(-?\d{1,15})\.\.(-?\d{1,15})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) return null;
    const n = Math.abs(b - a) + 1;
    if (n > 1_000_000) return null;
    const step = b >= a ? 1 : -1;
    const out: string[] = new Array(n);
    for (let k = 0; k < n; k++) out[k] = String(a + k * step);
    return out;
  }
  if (body.length < 1) return null;
  const sep = body[0];
  const items = body.slice(1).split(sep);
  return items.length ? items : null;
}

/** Exact decoder. Returns the input unchanged for anything malformed. */
export function chironDecode(wire: string): string {
  if (!wire.startsWith(CHIRON_START)) return wire;
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  if (cut < 0) return wire;
  const tape = wire.slice(CHIRON_START.length, cut);
  const body = wire.slice(cut + CHIRON_SEP.length);
  let parsed: ParsedRule[] | null = [];
  let script: ChironScript | null = null;
  if (tape.length) {
    script = scriptOf(tape[0]);
    if (!script) return wire;
    parsed = chironParseTape(tape, script);
    if (!parsed) return wire;
  }
  const index = new Map<string, number>();
  parsed.forEach((r, i) => index.set(r.glyph, i));

  const strVal = new Array<string | null | undefined>(parsed.length).fill(undefined);
  const listVal = new Array<string[] | null | undefined>(parsed.length).fill(undefined);
  let failed = false;

  const expandText = (s: string, upto: number): string | null => {
    let out = '';
    for (const ch of s) {
      const at = index.get(ch);
      if (at === undefined) { out += ch; continue; }
      if (at >= upto) return null; // forward reference: malformed
      const v = valueOf(at);
      if (v === null) return null;
      out += v;
      if (out.length > MAX_EXPANSION) return null;
    }
    return out;
  };

  const listOf = (idx: number): string[] | null => {
    const cached = listVal[idx];
    if (cached !== undefined) return cached;
    const r = parsed![idx];
    if (!r.raw.startsWith(CHIRON_LIST)) { listVal[idx] = null; return null; }
    const v = parseListBody(r.raw.slice(CHIRON_LIST.length));
    listVal[idx] = v;
    return v;
  };

  function valueOf(idx: number): string | null {
    const cached = strVal[idx];
    if (cached !== undefined) return cached;
    strVal[idx] = null; // poison against accidental recursion
    const r = parsed![idx];
    let out: string | null = null;
    if (r.raw.startsWith(CHIRON_REP)) {
      out = evalRep(r.raw.slice(CHIRON_REP.length), idx);
    } else if (r.raw.startsWith(CHIRON_LIST)) {
      out = null; // a list has no string value; using one in text is malformed
    } else {
      out = expandText(r.raw, idx);
    }
    strVal[idx] = out;
    if (out === null) failed = true;
    return out;
  }

  function evalRep(spec: string, self: number): string | null {
    // × b t n L…
    if (spec.length < 3) return null;
    const chars = [...spec];
    const blank = chars[0];
    const tpl = chars[1];
    let k = 2;
    let digits = '';
    while (k < chars.length && chars[k] >= '0' && chars[k] <= '9') { digits += chars[k]; k++; }
    if (!digits) return null;
    const n = Number(digits);
    if (!Number.isSafeInteger(n) || n < 1 || n > 1_000_000) return null;
    const listIdx: number[] = [];
    for (; k < chars.length; k++) {
      const at = index.get(chars[k]);
      if (at === undefined || at >= self) return null;
      listIdx.push(at);
    }
    const tplAt = index.get(tpl);
    let tplText: string | null;
    if (tplAt === undefined) tplText = tpl;
    else if (tplAt >= self) return null;
    else tplText = valueOf(tplAt);
    if (tplText === null) return null;
    const slots = tplText.split(blank).length - 1;
    if (slots === 0) {
      if (tplText.length * n > MAX_EXPANSION) return null;
      return tplText.repeat(n);
    }
    if (listIdx.length !== slots) return null;
    const lists: string[][] = [];
    for (const li of listIdx) {
      const lv = listOf(li);
      if (!lv || lv.length === 0) return null;
      lists.push(lv);
    }
    const pieces = tplText.split(blank); // slots + 1 pieces
    let out = '';
    for (let i = 0; i < n; i++) {
      out += pieces[0];
      for (let s = 0; s < slots; s++) {
        const lv = lists[s];
        out += lv[i % lv.length] + pieces[s + 1];
      }
      if (out.length > MAX_EXPANSION) return null;
    }
    return out;
  }

  const result = expandText(body, parsed.length);
  if (result === null || failed) {
    // A body that never touched a broken rule is still fine; re-check honestly.
    if (result === null) return wire;
  }
  return result;
}

/* ---------------------------------------------------------------------------
 * 4. CONTRACT COMPILER — the prose is generated from the finished wire and
 *    carries only the clauses that wire actually needs.
 * ------------------------------------------------------------------------- */

export interface ChironOpsUsed {
  rules: boolean;
  rep: boolean;
  fill: boolean;
  range: boolean;
  split: boolean;
  script: ChironScript | null;
}

export function chironOpsUsed(wire: string): ChironOpsUsed {
  const none: ChironOpsUsed = { rules: false, rep: false, fill: false, range: false, split: false, script: null };
  if (!wire.startsWith(CHIRON_START)) return none;
  const cut = wire.indexOf(CHIRON_SEP, CHIRON_START.length);
  if (cut < 0) return none;
  const tape = wire.slice(CHIRON_START.length, cut);
  if (!tape.length) return none;
  const script = scriptOf(tape[0]);
  if (!script) return none;
  const parsed = chironParseTape(tape, script);
  if (!parsed) return none;
  const out: ChironOpsUsed = { rules: parsed.length > 0, rep: false, fill: false, range: false, split: false, script };
  for (const r of parsed) {
    if (r.raw.startsWith(CHIRON_REP)) {
      out.rep = true;
      const chars = [...r.raw.slice(CHIRON_REP.length)];
      let k = 2;
      while (k < chars.length && chars[k] >= '0' && chars[k] <= '9') k++;
      if (k < chars.length) out.fill = true;
    } else if (r.raw.startsWith(CHIRON_LIST)) {
      const body = r.raw.slice(CHIRON_LIST.length);
      if (/^(-?\d{1,15})\.\.(-?\d{1,15})$/.test(body)) out.range = true;
      else out.split = true;
    }
  }
  return out;
}

/**
 * The complete reader contract.  With a wire it is specialized to that wire;
 * with no wire the full grammar is printed for documentation and tests.
 *
 * Every sentence here is load-bearing and was shortened against the live
 * tokenizer: the generic form is measured in bench/chiron-redteam.ts.
 */
export function chironDecoderPrompt(wire?: string): string {
  const body = wire ?? '<the CHIRON program>';
  const u = wire !== undefined ? chironOpsUsed(wire) : { rules: true, rep: true, fill: true, range: true, split: true, script: CHIRON_SCRIPTS[0] };
  const letter = (u.script ?? CHIRON_SCRIPTS[0]).label;
  const cl: string[] = [];
  if (u.rules) {
    cl.push(`Every new ${letter} before ${CHIRON_SEP} starts a rule whose text runs to the next new letter or to ${CHIRON_SEP}. In the text after ${CHIRON_SEP} expand every rule, repeatedly, and print only the result.`);
  } else {
    cl.push(`Print the text after ${CHIRON_SEP} unchanged.`);
  }
  if (u.rep) {
    cl.push(u.fill
      ? `${CHIRON_REP}btn: t written n times. Any letters after n are lists; in copy i the k-th b is item i of list k, cycling.`
      : `${CHIRON_REP}btn: t written n times.`);
  }
  if (u.range && u.split) cl.push(`${CHIRON_LIST}a..b = integers a to b. Otherwise the character after ${CHIRON_LIST} separates the items.`);
  else if (u.range) cl.push(`${CHIRON_LIST}a..b = integers a to b.`);
  else if (u.split) cl.push(`In a list the character right after ${CHIRON_LIST} separates the items.`);
  return [body, cl.join(' ')].join('\n');
}

/* ---------------------------------------------------------------------------
 * 5. RENDERING — topological order, dense glyph assignment, exact remap.
 * ------------------------------------------------------------------------- */

interface RenderCtx {
  pool: string[];
  banned: Set<string>;
  placeholder: [string, string];
}

function ruleDeps(r: Rule, glyphOf: Map<number, string>, rules: Rule[]): number[] {
  const out: number[] = [];
  if (r.kind === 'rep') {
    if (r.tplRule !== undefined) out.push(r.tplRule);
    for (const l of r.lists ?? []) out.push(l);
  } else if (r.kind === 'lit') {
    for (const other of rules) {
      if (other.id === r.id) continue;
      const g = glyphOf.get(other.id);
      if (g && r.text.includes(g)) out.push(other.id);
    }
  }
  return out;
}

function topoOrder(rules: Rule[], glyphOf: Map<number, string>): number[] | null {
  const byId = new Map(rules.map(r => [r.id, r]));
  const state = new Map<number, number>();
  const order: number[] = [];
  const visit = (id: number): boolean => {
    const st = state.get(id) ?? 0;
    if (st === 2) return true;
    if (st === 1) return false; // cycle — must not happen by construction
    state.set(id, 1);
    const r = byId.get(id);
    if (!r) return false;
    for (const d of ruleDeps(r, glyphOf, rules)) if (!visit(d)) return false;
    state.set(id, 2);
    order.push(id);
    return true;
  };
  for (const r of rules) if (!visit(r.id)) return null;
  return order;
}

/**
 * Search-time cost probe.  Token counting does not care whether the glyphs are
 * densely packed or topologically ordered — every pool glyph is exactly one
 * token — so the search scores this O(n) concatenation instead of paying the
 * O(rules^2) remap of renderWire on every candidate.  The emitted wire is always
 * the real renderWire output, counted exactly, and gated on that count.
 */
function provisionalWire(rules: Rule[], body: string, glyphOf: Map<number, string>): string {
  let tape = '';
  for (const r of rules) {
    const g = glyphOf.get(r.id)!;
    if (r.kind === 'lit') tape += g + r.text;
    else if (r.kind === 'list') tape += g + CHIRON_LIST + r.listBody!;
    else {
      const tplCh = r.tplRule !== undefined ? glyphOf.get(r.tplRule)! : r.tplChar!;
      tape += g + CHIRON_REP + r.blank! + tplCh + String(r.count!) + (r.lists ?? []).map(l => glyphOf.get(l)!).join('');
    }
  }
  return CHIRON_START + tape + CHIRON_SEP + body;
}

function renderWire(rules: Rule[], body: string, glyphOf: Map<number, string>, ctx: RenderCtx): string | null {
  const order = topoOrder(rules, glyphOf);
  if (!order) return null;
  const byId = new Map(rules.map(r => [r.id, r]));
  const newGlyph = new Map<number, string>();
  let next = 0;
  for (const id of order) {
    while (next < ctx.pool.length && ctx.banned.has(ctx.pool[next])) next++;
    if (next >= ctx.pool.length) return null;
    newGlyph.set(id, ctx.pool[next++]);
  }
  const [pL, pR] = ctx.placeholder;
  const remap = (s: string): string | null => {
    let out = s;
    for (const r of rules) {
      const g = glyphOf.get(r.id);
      if (g && out.includes(g)) out = out.split(g).join(pL + r.id + pR);
    }
    for (const r of rules) out = out.split(pL + r.id + pR).join(newGlyph.get(r.id)!);
    if (out.includes(pL) || out.includes(pR)) return null;
    return out;
  };
  let tape = '';
  for (const id of order) {
    const r = byId.get(id)!;
    let text: string | null;
    if (r.kind === 'lit') text = remap(r.text);
    else if (r.kind === 'list') text = CHIRON_LIST + r.listBody!;
    else {
      const tplCh = r.tplRule !== undefined ? newGlyph.get(r.tplRule)! : r.tplChar!;
      text = CHIRON_REP + r.blank! + tplCh + String(r.count!) + (r.lists ?? []).map(l => newGlyph.get(l)!).join('');
    }
    if (text === null) return null;
    if (text.includes(CHIRON_SEP)) return null;
    tape += newGlyph.get(id)! + text;
  }
  const mappedBody = remap(body);
  if (mappedBody === null) return null;
  return CHIRON_START + tape + CHIRON_SEP + mappedBody;
}

/* ---------------------------------------------------------------------------
 * 6. STRUCTURAL PASS — repeat/fill blocks over line units.
 * ------------------------------------------------------------------------- */

const MAX_UNIT_WIDTH = 3;
const MAX_ANCHORS = 20;
const MAX_BLOCK_UNITS = 200_000;

function longestCommonSubstring(a: string, b: string): { ai: number; bi: number; len: number } {
  if (!a || !b || a.length > 1500 || b.length > 1500) return { ai: 0, bi: 0, len: 0 };
  let prev = new Int32Array(b.length + 1);
  let curr = new Int32Array(b.length + 1);
  let best = { ai: 0, bi: 0, len: 0 };
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a.charCodeAt(i - 1) === b.charCodeAt(j - 1)) {
        curr[j] = prev[j - 1] + 1;
        if (curr[j] > best.len) best = { ai: i - curr[j], bi: j - curr[j], len: curr[j] };
      } else curr[j] = 0;
    }
    const swap = prev; prev = curr; curr = swap; curr.fill(0);
  }
  return best;
}

/** Anchors common to two units; interior anchors must be non-empty to delimit. */
function deriveAnchors(a: string, b: string, depth = 0): string[] {
  if (a === b) return [a];
  if (depth >= 10) return ['', ''];
  const c = longestCommonSubstring(a, b);
  if (c.len < 1) return ['', ''];
  const anchor = a.slice(c.ai, c.ai + c.len);
  const left = deriveAnchors(a.slice(0, c.ai), b.slice(0, c.bi), depth + 1);
  const right = deriveAnchors(a.slice(c.ai + c.len), b.slice(c.bi + c.len), depth + 1);
  const merged = left[left.length - 1] + anchor + right[0];
  const out = [...left.slice(0, -1), merged, ...right.slice(1)];
  return out.length <= MAX_ANCHORS ? out : ['', ''];
}

function matchAnchors(unit: string, anchors: string[]): string[] | null {
  if (anchors.length === 1) return unit === anchors[0] ? [] : null;
  if (!unit.startsWith(anchors[0])) return null;
  const slots: string[] = [];
  let at = anchors[0].length;
  for (let i = 1; i < anchors.length - 1; i++) {
    const anc = anchors[i];
    if (!anc) return null;
    const nx = unit.indexOf(anc, at);
    if (nx < 0) return null;
    slots.push(unit.slice(at, nx));
    at = nx + anc.length;
  }
  const tail = anchors[anchors.length - 1];
  if (tail && !unit.endsWith(tail)) return null;
  const end = tail ? unit.length - tail.length : unit.length;
  if (end < at) return null;
  slots.push(unit.slice(at, end));
  return slots;
}

const LIST_SEPS = [',', ' ', ';', '|', '\t', '/', ':', '\u0001', '\u0002', '\u0003'];

/** Cheapest `…` payload for a column of values, or null if none is legal. */
function listBodyFor(values: string[], enc: EncodingName): { body: string; tokens: number } | null {
  // integer range with unit step
  if (values.length >= 3 && values.every(v => /^-?(?:0|[1-9]\d{0,14})$/.test(v))) {
    const nums = values.map(Number);
    if (nums.every(Number.isSafeInteger)) {
      const step = nums[1] - nums[0];
      if ((step === 1 || step === -1) && nums.every((n, i) => n === nums[0] + step * i)) {
        const body = `${nums[0]}..${nums[nums.length - 1]}`;
        return { body, tokens: countTokens(CHIRON_LIST + body, enc) };
      }
    }
  }
  // cycle detection shortens the item list without a new operator
  let use = values;
  for (let p = 1; p <= Math.min(64, Math.floor(values.length / 2)); p++) {
    let ok = true;
    for (let i = p; i < values.length; i++) if (values[i] !== values[i % p]) { ok = false; break; }
    if (ok) { use = values.slice(0, p); break; }
  }
  for (const sep of LIST_SEPS) {
    if (use.some(v => v.includes(sep))) continue;
    const body = sep + use.join(sep);
    if (/^(-?\d{1,15})\.\.(-?\d{1,15})$/.test(body)) continue; // never shadow the range form
    return { body, tokens: countTokens(CHIRON_LIST + body, enc) };
  }
  return null;
}

export interface BlockCandidate {
  startLine: number;
  endLine: number;      // exclusive
  width: number;
  anchors: string[];    // template pieces; template = anchors joined by blank
  columns: string[][];  // one per slot
  units: number;
  gain: number;
  sep: string;
}

/* --- anchor proposals -----------------------------------------------------
 *
 * Deriving a template from the first two units (the Drain/Spell move) breaks on
 * the commonest real pattern in ops text: a numeric field whose WIDTH changes
 * (…latency_ms:49 then :50 then :100).  The LCS keeps the shared leading digit
 * as part of the constant, and the run dies after ten units.  Two refinements,
 * both scored against the live tokenizer and both kept only if they pay:
 *
 *   DIGIT WIDENING  push digits that touch a slot from the anchors into the
 *                   slot, one slot at a time, greedily.
 *   COLUMN SPLIT    if every value of a column contains the same delimiter the
 *                   same number of times, split the column there; a wide
 *                   "0,0"/"1,3" column becomes an integer range plus a short
 *                   list, which is usually far cheaper than either alone.
 * ------------------------------------------------------------------------ */

const DIGITS = /\d/;
const SPLIT_CHARS = [',', ':', '-', '_', ' ', '/', '.', '=', '"', '\t', '|'];

function widenSlot(anchors: string[], j: number): string[] | null {
  if (j < 0 || j + 1 >= anchors.length) return null;
  let left = anchors[j];
  let right = anchors[j + 1];
  let moved = false;
  while (left.length && DIGITS.test(left[left.length - 1])) { left = left.slice(0, -1); moved = true; }
  while (right.length && DIGITS.test(right[0])) { right = right.slice(1); moved = true; }
  if (!moved) return null;
  // an interior anchor may not become empty: it would stop delimiting the slot
  if (j > 0 && left === '') return null;
  if (j + 2 < anchors.length && right === '') return null;
  const out = [...anchors];
  out[j] = left;
  out[j + 1] = right;
  return out;
}

interface Scored {
  anchors: string[];
  columns: string[][];
  units: number;
  cost: number;
  gain: number;
}

/** Split a column on a delimiter that appears the same number of times in all
 *  of its values, when the resulting lists are cheaper. */
function splitColumns(anchors: string[], columns: string[][], enc: EncodingName): { anchors: string[]; columns: string[][] } {
  let anc = anchors;
  let cols = columns;
  for (let round = 0; round < 3; round++) {
    let improved = false;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      if (!col.length) continue;
      const before = listBodyFor(col, enc);
      if (!before) continue;
      let bestChar = '';
      let bestCost = before.tokens;
      let bestParts: string[][] | null = null;
      for (const ch of SPLIT_CHARS) {
        const k = col[0].split(ch).length - 1;
        if (k < 1 || k > 4) continue;
        if (!col.every(v => v.split(ch).length - 1 === k)) continue;
        const parts: string[][] = Array.from({ length: k + 1 }, () => []);
        for (const v of col) v.split(ch).forEach((p, j) => parts[j].push(p));
        if (parts.some(pp => pp.some(v => v === '') && pp.every(v => v === ''))) continue;
        let cost = 0;
        const seen = new Set<string>();
        let ok = true;
        for (const pp of parts) {
          const lb = listBodyFor(pp, enc);
          if (!lb) { ok = false; break; }
          if (seen.has(lb.body)) continue;
          seen.add(lb.body);
          cost += lb.tokens + 1;
        }
        if (!ok) continue;
        cost += countTokens(ch.repeat(k), enc); // the delimiter re-enters the template
        if (cost < bestCost) { bestCost = cost; bestChar = ch; bestParts = parts; }
      }
      if (bestParts && bestChar) {
        const mid: string[] = [];
        for (let j = 0; j < bestParts.length - 1; j++) mid.push(bestChar);
        anc = [...anc.slice(0, i + 1), ...mid, ...anc.slice(i + 1)];
        cols = [...cols.slice(0, i), ...bestParts, ...cols.slice(i + 1)];
        improved = true;
        break;
      }
    }
    if (!improved) break;
    if (cols.length > MAX_ANCHORS) break;
  }
  return { anchors: anc, columns: cols };
}

/**
 * A unit owns the separator that FOLLOWS it, so the block needs no joiner
 * operator.  The invariant that makes this exact: a unit ending at index
 * `s+width` is only legal when `s+width < lines.length`, i.e. when a separator
 * really follows in the source.  The final piece after the last separator can
 * therefore never be swallowed by a block, and the body reconstruction is
 * byte-identical by construction (and re-verified anyway).
 */
function blockCandidateAt(lines: string[], start: number, width: number, blank: string, sep: string, enc: EncodingName): BlockCandidate | null {
  if (start + width * 3 >= lines.length) return null;
  const unitAt = (u: number): string | null => {
    const s = start + u * width;
    if (s + width >= lines.length) return null;
    return lines.slice(s, s + width).join(sep) + sep;
  };
  const u0 = unitAt(0);
  const u1 = unitAt(1);
  if (u0 === null || u1 === null) return null;
  if (u0.includes(blank) || u1.includes(blank)) return null;
  // cheap rejection: two units with little in common cannot template usefully
  const seedLcs = longestCommonSubstring(u0, u1);
  if (seedLcs.len * 3 < Math.min(u0.length, u1.length)) return null;

  const runUnder = (anc: string[]): { units: number; columns: string[][] } => {
    const cols: string[][] = Array.from({ length: anc.length - 1 }, () => []);
    let n = 0;
    for (;;) {
      const u = unitAt(n);
      if (u === null || u.includes(blank)) break;
      const slots = matchAnchors(u, anc);
      if (!slots || slots.length !== cols.length) break;
      slots.forEach((v, i) => cols[i].push(v));
      n++;
      if (n >= MAX_BLOCK_UNITS) break;
    }
    return { units: n, columns: cols };
  };

  const score = (anc0: string[]): Scored | null => {
    if (anc0.length < 1 || anc0.length - 1 > MAX_ANCHORS) return null;
    const r = runUnder(anc0);
    if (r.units < 3) return null;
    let anchors = anc0;
    let columns = r.columns;
    // fold constant columns back into the template
    for (let i = columns.length - 1; i >= 0; i--) {
      const col = columns[i];
      if (col.length && col.every(v => v === col[0])) {
        anchors = [...anchors.slice(0, i), anchors[i] + col[0] + anchors[i + 1], ...anchors.slice(i + 2)];
        columns = [...columns.slice(0, i), ...columns.slice(i + 1)];
      }
    }
    const refined = splitColumns(anchors, columns, enc);
    anchors = refined.anchors;
    columns = refined.columns;
    if (anchors.length - 1 !== columns.length) return null;
    const endLine = start + r.units * width;
    const raw = lines.slice(start, endLine).join(sep) + sep;
    const tpl = anchors.join(blank);
    if (tpl.includes(CHIRON_SEP)) return null;
    let cost = countTokens(tpl, enc) + 1;
    cost += countTokens(CHIRON_REP + blank + 'x' + String(r.units), enc) + 1 + columns.length;
    const seen = new Set<string>();
    for (const col of columns) {
      const lb = listBodyFor(col, enc);
      if (!lb) return null;
      if (seen.has(lb.body)) continue;
      seen.add(lb.body);
      cost += lb.tokens + 1;
    }
    cost += 1;
    return { anchors, columns, units: r.units, cost, gain: countTokens(raw, enc) - cost };
  };

  const seeds: string[][] = [deriveAnchors(u0, u1)];
  let best: Scored | null = score(seeds[0]);
  // greedy per-slot digit widening on the best seed so far
  for (let pass = 0; pass < 2; pass++) {
    const base = best ? best.anchors : seeds[0];
    let improved = false;
    for (let j = 0; j + 1 < base.length; j++) {
      const w = widenSlot(best ? best.anchors : base, j);
      if (!w) continue;
      const sc = score(w);
      if (sc && (!best || sc.gain > best.gain)) { best = sc; improved = true; }
    }
    if (!improved) break;
  }
  // an alternative seed taken from the unit that ended the run
  if (best) {
    const nextUnit = unitAt(best.units);
    if (nextUnit !== null && !nextUnit.includes(blank)) {
      const alt = deriveAnchors(u0, nextUnit);
      let altScored = score(alt);
      for (let j = 0; altScored && j + 1 < altScored.anchors.length; j++) {
        const w = widenSlot(altScored.anchors, j);
        if (!w) continue;
        const sc = score(w);
        if (sc && sc.gain > altScored.gain) altScored = sc;
      }
      if (altScored && altScored.gain > best.gain) best = altScored;
    }
  }
  if (!best || best.gain <= 0) return null;
  return {
    startLine: start, endLine: start + best.units * width, width,
    anchors: best.anchors, columns: best.columns, units: best.units, gain: best.gain, sep,
  };
}

export function chironFindBlocks(text: string, blank: string, sep: string, enc: EncodingName = 'o200k_base', deadline = Date.now() + 10_000): BlockCandidate[] {
  const lines = text.split(sep);
  if (lines.length < 5) return [];
  const cands: BlockCandidate[] = [];
  for (let width = 1; width <= MAX_UNIT_WIDTH; width++) {
    for (let start = 0; start + width * 3 < lines.length; start++) {
      if (Date.now() > deadline) break;
      const c = blockCandidateAt(lines, start, width, blank, sep, enc);
      if (c) {
        cands.push(c);
        start += Math.max(0, c.units * width - 1);
      }
    }
  }
  // Gain first, coverage as the tie-break.
  cands.sort((a, b) => b.gain - a.gain || (b.endLine - b.startLine) - (a.endLine - a.startLine));
  const chosen: BlockCandidate[] = [];
  for (const c of cands) {
    if (chosen.some(s => c.startLine < s.endLine && s.startLine < c.endLine)) continue;
    chosen.push(c);
    if (chosen.length >= 48) break;
  }
  chosen.sort((a, b) => a.startLine - b.startLine);
  return chosen;
}

/** Candidate unit separators, in the order they are tried. */
export function chironSeparators(text: string): string[] {
  const out: string[] = ['\n'];
  const nl = (text.match(/\n/g) ?? []).length;
  for (const c of [',', '\t', ';', '|', ' ']) {
    const n = (text.split(c).length - 1);
    if (n >= 8 && n > nl * 2) out.push(c);
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 7. MACRO PASS — token-aligned span mining over literal texts and the body.
 *
 *    Char-level n-gram mining proposes phrases whose substitution splits the
 *    BPE merges around every site; mining over the tokenizer's own segments
 *    proposes only whole-token concatenations, so a 1-token glyph replacement
 *    leaves the surrounding tokenization intact and the bound is realized.
 * ------------------------------------------------------------------------- */

const LMAX_TOKENS = 26;
const PREFILTER = 1600;
const EPOCH_APPLY = 12;

function enumerateTokenSpans(parts: string[], enc: EncodingName): Map<string, number> {
  const counts = new Map<string, number>();
  for (const part of parts) {
    if (part.length < 2) continue;
    const segs = tokenStrings(part, enc).map(t => t.s);
    if (segs.join('') !== part) continue;
    const lim = Math.min(LMAX_TOKENS, segs.length);
    for (let len = 2; len <= lim; len++) {
      for (let at = 0; at + len <= segs.length; at++) {
        const phrase = segs.slice(at, at + len).join('');
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }
  return counts;
}

/* ---------------------------------------------------------------------------
 * 8. ENCODER
 * ------------------------------------------------------------------------- */

export interface ChironOptions {
  /** wall-clock budget for the search, in ms */
  budgetMs?: number;
  /** disable the repeat/fill block pass (used by the contract-aware ablation) */
  noBlocks?: boolean;
  /** disable the macro tape (used by the contract-aware ablation) */
  noMacros?: boolean;
  /** cap on macro rules */
  maxRules?: number;
  /** unit separator for the block pass */
  sep?: string;
}

function rawResult(text: string, enc: EncodingName, started: number, forced: boolean): ChironResult {
  const inTokens = countTokens(text, enc);
  const wire = forced ? CHIRON_START + CHIRON_SEP + text : text;
  const decoded = chironDecode(wire);
  const outTokens = forced ? countTokens(wire, enc) : inTokens;
  const prompt = forced ? chironDecoderPrompt(wire) : wire;
  const messageTokens = forced ? countTokens(prompt, enc) : inTokens;
  return {
    codec: 'chiron', wire, decoded, exact: decoded === text, inTokens, outTokens,
    messageTokens, contractTokens: messageTokens - outTokens, decoderPrompt: prompt,
    savingsPct: 0, rules: 0, blocks: 0, lists: 0, script: 'none', ops: [],
    ms: Date.now() - started, mode: forced ? 'forced-wrap' : 'raw',
    notes: forced ? 'payload begins with the frame character; exact 2-token wrapper' : 'identity: no framing pays here',
  };
}

interface BuildOutcome {
  wire: string;
  decoded: string;
  outTokens: number;
  messageTokens: number;
  rules: number;
  blocks: number;
  lists: number;
  ops: string[];
}

function buildCandidate(text: string, enc: EncodingName, script: ChironScript, opts: Required<ChironOptions>): BuildOutcome | null {
  const deadline = Date.now() + opts.budgetMs;
  const payloadChars = new Set(text);
  const pool = scriptPool(script, enc).filter(g => !payloadChars.has(g));
  if (!pool.length) return null;
  const inScript = (ch: string) => chironInScript(script, ch.codePointAt(0)!);
  const scriptInPayload = new Set([...payloadChars].filter(inScript));

  const sentinelPairs: Array<[string, string]> = [['\u0001', '\u0002'], ['\u0002', '\u0003'], ['\u0003', '\u0004'], ['\uE000', '\uE001'], ['\uE002', '\uE003']];
  const placeholder = sentinelPairs.find(([a, b]) => !text.includes(a) && !text.includes(b));
  if (!placeholder) return null;

  const blank = blankPool(enc).find(c => !text.includes(c));

  const rules: Rule[] = [];
  const glyphOf = new Map<number, string>();
  let nextId = 0;
  let poolAt = 0;
  const takeGlyph = (): string | null => (poolAt < pool.length ? pool[poolAt++] : null);
  const addRule = (r: Omit<Rule, 'id'>): Rule | null => {
    const g = takeGlyph();
    if (!g) return null;
    const rule: Rule = { ...r, id: nextId++ };
    rules.push(rule);
    glyphOf.set(rule.id, g);
    return rule;
  };

  /* ---- structural pass ---- */
  let body: string;
  let blocks = 0;
  let lists = 0;
  const sep = opts.sep;
  const blockDeadline = Math.min(deadline, Date.now() + Math.max(600, Math.round(opts.budgetMs * 0.22)));
  const chosen = (!opts.noBlocks && blank) ? chironFindBlocks(text, blank, sep, enc, blockDeadline) : [];
  if (chosen.length) {
    const lines = text.split(sep);
    const tplBySig = new Map<string, Rule>();
    const listBySig = new Map<string, Rule>();
    const parts: string[] = [];
    let cursor = 0;
    for (const c of chosen) {
      if (cursor < c.startLine) parts.push(lines.slice(cursor, c.startLine).join(sep) + sep);
      const tplText = c.anchors.join(blank!);
      let tplRule = tplBySig.get(tplText);
      if (!tplRule) {
        const created = addRule({ kind: 'lit', text: tplText });
        if (!created) return null;
        tplBySig.set(tplText, created);
        tplRule = created;
      }
      const listIds: number[] = [];
      let ok = true;
      for (const col of c.columns) {
        const lb = listBodyFor(col, enc);
        if (!lb) { ok = false; break; }
        let lr = listBySig.get(lb.body);
        if (!lr) {
          const created = addRule({ kind: 'list', text: '', listBody: lb.body });
          if (!created) return null;
          listBySig.set(lb.body, created);
          lr = created;
          lists++;
        }
        listIds.push(lr.id);
      }
      if (!ok) { parts.push(lines.slice(c.startLine, c.endLine).join(sep) + sep); cursor = c.endLine; continue; }
      const blockRule = addRule({ kind: 'rep', text: '', blank: blank!, tplRule: tplRule.id, count: c.units, lists: listIds });
      if (!blockRule) return null;
      parts.push(glyphOf.get(blockRule.id)!);
      blocks++;
      cursor = c.endLine;
    }
    parts.push(lines.slice(cursor).join(sep));
    body = parts.join('');
  } else {
    body = text;
  }

  /* ---- character-run pass: `×` with a one-character template ---- */
  if (!opts.noBlocks && blank) {
    const re = /([^\s])\1{7,}/gu;
    const spans: Array<{ start: number; end: number; ch: string; n: number }> = [];
    let m: RegExpExecArray | null;
    while ((m = re.exec(body))) {
      const ch = m[1];
      if (inScript(ch) || ch === CHIRON_SEP || ch === CHIRON_START) continue;
      const n = m[0].length;
      const cost = countTokens(CHIRON_REP + blank + ch + String(n), enc) + 2;
      if (countTokens(m[0], enc) <= cost) continue;
      spans.push({ start: m.index, end: m.index + m[0].length, ch, n });
    }
    if (spans.length) {
      let out = '';
      let at = 0;
      for (const s of spans) {
        const r = addRule({ kind: 'rep', text: '', blank, tplChar: s.ch, count: s.n, lists: [] });
        if (!r) break;
        out += body.slice(at, s.start) + glyphOf.get(r.id)!;
        at = s.end;
        blocks++;
      }
      body = out + body.slice(at);
    }
  }

  /* ---- macro pass ---- */
  const ctx: RenderCtx = { pool, banned: new Set(), placeholder };
  const litIds = () => rules.filter(r => r.kind === 'lit').map(r => r.id);
  const phraseLegal = (p: string): boolean => {
    if (p.includes(CHIRON_SEP)) return false;
    if (p.startsWith(CHIRON_REP) || p.startsWith(CHIRON_LIST)) return false;
    for (const ch of p) if (scriptInPayload.has(ch)) return false;
    return true;
  };

  let best = renderWire(rules, body, glyphOf, ctx);
  if (best === null) return null;
  let bestTokens = countTokens(best, enc);
  let bestRules = rules.map(r => ({ ...r }));
  let bestBody = body;
  let probe = countTokens(provisionalWire(rules, body, glyphOf), enc);

  if (!opts.noMacros) {
    let stalled = false;
    let offset = 0;
    while (!stalled && rules.length < opts.maxRules && Date.now() < deadline) {
      const parts = [body, ...rules.filter(r => r.kind === 'lit').map(r => r.text)];
      const counts = enumerateTokenSpans(parts, enc);
      // Rank cheaply by characters saved, then pay for exact token bounds only
      // on the short list. (Slicing the raw map in insertion order, as an
      // earlier revision did, silently discarded most of the search space.)
      const rough = [...counts.entries()]
        .filter(([p, c]) => c >= 2 && p.length >= 2 && phraseLegal(p))
        .map(([p, c]) => ({ p, c, rough: c * (p.length - 1) - p.length - 1 }))
        .filter(x => x.rough > 0)
        .sort((a, b) => b.rough - a.rough)
        .slice(0, PREFILTER);
      const cands = rough
        .map(({ p, c }) => { const t = countTokens(p, enc); return { p, bound: c * (t - 1) - t - 1 }; })
        .filter(x => x.bound > 0)
        .sort((a, b) => b.bound - a.bound);
      const window = cands.slice(offset, offset + EPOCH_APPLY * 5);
      let applied = 0;
      for (const { p } of window) {
        if (applied >= EPOCH_APPLY || rules.length >= opts.maxRules || Date.now() >= deadline) break;
        if (!body.includes(p) && !rules.some(r => r.kind === 'lit' && r.text.includes(p))) continue;
        const snapshotRules = rules.map(r => ({ ...r }));
        const snapshotBody = body;
        const snapshotPool = poolAt;
        const created = addRule({ kind: 'lit', text: p });
        if (!created) { stalled = true; break; }
        const gl = glyphOf.get(created.id)!;
        for (const r of rules) if (r.kind === 'lit' && r.id !== created.id) r.text = r.text.split(p).join(gl);
        body = body.split(p).join(gl);
        const t = countTokens(provisionalWire(rules, body, glyphOf), enc);
        if (t < probe) {
          probe = t;
          bestRules = rules.map(r => ({ ...r }));
          bestBody = body;
          applied++;
        } else {
          rules.length = 0; rules.push(...snapshotRules);
          body = snapshotBody;
          poolAt = snapshotPool;
          glyphOf.delete(created.id);
          nextId--;
        }
      }
      // An empty epoch does not mean the search is finished: the window was
      // ranked by an upper bound, so the next window may still contain paying
      // candidates. Slide it instead of stopping (measured: -94 tokens on the
      // one lane where CHIRON was behind HERMES-Ω).
      if (applied === 0) {
        offset += EPOCH_APPLY * 5;
        if (offset >= cands.length) stalled = true;
      } else {
        offset = 0;
      }
    }

    /* ---- backward deletion: a rule that stopped paying is removed ---- */
    rules.length = 0; rules.push(...bestRules.map(r => ({ ...r })));
    body = bestBody;
    let trials = 0;
    let changed = true;
    while (changed && Date.now() < deadline && trials < 400) {
      changed = false;
      for (let i = rules.length - 1; i >= 0; i--) {
        if (trials++ >= 400 || Date.now() >= deadline) break;
        const r = rules[i];
        if (r.kind !== 'lit') continue;
        const g = glyphOf.get(r.id)!;
        if (rules.some(o => o.kind === 'rep' && o.tplRule === r.id)) continue;
        const rest = rules.filter((_, j) => j !== i).map(o => (o.kind === 'lit' ? { ...o, text: o.text.split(g).join(r.text) } : { ...o }));
        const b2 = body.split(g).join(r.text);
        const t = countTokens(provisionalWire(rest, b2, glyphOf), enc);
        if (t < probe) {
          probe = t;
          rules.length = 0; rules.push(...rest);
          body = b2;
          bestRules = rules.map(x => ({ ...x })); bestBody = body;
          changed = true;
          break;
        }
      }
    }
  }

  /* ---- the emitted wire is the real render, counted exactly ---- */
  rules.length = 0; rules.push(...bestRules.map(r => ({ ...r })));
  body = bestBody;
  best = renderWire(rules, body, glyphOf, ctx);
  if (best === null) return null;
  bestTokens = countTokens(best, enc);

  const wire = best;
  const decoded = chironDecode(wire);
  const prompt = chironDecoderPrompt(wire);
  const messageTokens = countTokens(prompt, enc);
  const u = chironOpsUsed(wire);
  const ops: string[] = [];
  if (u.rules) ops.push('rules');
  if (u.rep) ops.push('repeat');
  if (u.fill) ops.push('fill');
  if (u.range) ops.push('range');
  if (u.split) ops.push('list');
  return {
    wire, decoded, outTokens: bestTokens, messageTokens,
    rules: bestRules.filter(r => r.kind === 'lit').length,
    blocks: bestRules.filter(r => r.kind === 'rep').length,
    lists: bestRules.filter(r => r.kind === 'list').length,
    ops,
  };
}

/**
 * Encode `text`.  The emitted candidate is the one with the lowest measured
 * one-chat cost M among: identity, the full program, and the same search with
 * each operator family disabled.  An operator whose clause costs more than it
 * saves therefore never ships.
 */
export function chironEncode(text: string, enc: EncodingName = 'o200k_base', options: ChironOptions = {}): ChironResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  // A payload beginning with § only needs the 2-token wrapper when it would
  // otherwise decode into something else; a malformed frame is already inert.
  const forced = text.startsWith(CHIRON_START) && chironDecode(text) !== text;
  const raw = rawResult(text, enc, started, forced);
  if (text.length < 16) return raw;

  const budgetMs = options.budgetMs ?? Math.min(11_000, 800 + text.length * 1.1);
  const maxRules = options.maxRules ?? 220;

  // Pick the script with no payload collisions when possible.
  const scripts = [...CHIRON_SCRIPTS].sort((a, b) => {
    const ca = [...new Set(text)].filter(ch => chironInScript(a, ch.codePointAt(0)!)).length;
    const cb = [...new Set(text)].filter(ch => chironInScript(b, ch.codePointAt(0)!)).length;
    return ca - cb;
  });
  const script = scripts[0];

  const seps = options.sep !== undefined ? [options.sep] : chironSeparators(text);
  const forcedBlocks = options.noBlocks;
  const forcedMacros = options.noMacros;
  const variants: Array<{ tag: string; o: Required<ChironOptions> }> = [];
  if (forcedBlocks !== undefined || forcedMacros !== undefined) {
    for (const sep of seps) {
      variants.push({ tag: `forced/${JSON.stringify(sep)}`, o: { noBlocks: !!forcedBlocks, noMacros: !!forcedMacros, maxRules, budgetMs, sep } });
    }
  } else {
  for (const sep of seps) {
    variants.push({ tag: `full/${JSON.stringify(sep)}`, o: { noBlocks: false, noMacros: false, maxRules, budgetMs, sep } });
  }
  variants.push({ tag: 'macros-only', o: { noBlocks: true, noMacros: false, maxRules, budgetMs: Math.round(budgetMs * 0.8), sep: '\n' } });
  if (text.length <= 24_000) {
    for (const sep of seps) {
      variants.push({ tag: `blocks-only/${JSON.stringify(sep)}`, o: { noBlocks: false, noMacros: true, maxRules, budgetMs: Math.round(budgetMs * 0.3), sep } });
    }
  }
  }

  let bestOutcome: BuildOutcome | null = null;
  let bestTag = '';
  // One wall-clock envelope for the whole variant sweep, not per variant.
  const overallDeadline = started + Math.min(26_000, Math.round(budgetMs * 2.1));
  for (const v of variants) {
    const left = overallDeadline - Date.now();
    if (left < 300) break;
    let out: BuildOutcome | null = null;
    try {
      out = buildCandidate(text, enc, script, { ...v.o, budgetMs: Math.min(v.o.budgetMs, left) });
    } catch { out = null; }
    if (!out) continue;
    if (out.decoded !== text) continue;
    if (!bestOutcome || out.messageTokens < bestOutcome.messageTokens ||
      (out.messageTokens === bestOutcome.messageTokens && out.outTokens < bestOutcome.outTokens)) {
      bestOutcome = out;
      bestTag = v.tag;
    }
    // A pure-macro run cannot beat the first full run when that run already
    // used no blocks at all; skip the redundant work.
    if (v.tag === variants[0].tag && out.blocks === 0 && seps.length === 1) {
      bestTag = v.tag;
      break;
    }
  }

  if (!bestOutcome) return raw;
  if (bestOutcome.messageTokens >= inTokens) {
    return { ...raw, notes: `${raw.notes}; message gate: framed ${bestOutcome.messageTokens} >= raw ${inTokens} (wire ${bestOutcome.outTokens})` };
  }
  const prompt = chironDecoderPrompt(bestOutcome.wire);
  return {
    codec: 'chiron',
    wire: bestOutcome.wire,
    decoded: bestOutcome.decoded,
    exact: true,
    inTokens,
    outTokens: bestOutcome.outTokens,
    messageTokens: bestOutcome.messageTokens,
    contractTokens: bestOutcome.messageTokens - bestOutcome.outTokens,
    decoderPrompt: prompt,
    savingsPct: inTokens ? Math.round((1 - bestOutcome.messageTokens / inTokens) * 1000) / 10 : 0,
    rules: bestOutcome.rules,
    blocks: bestOutcome.blocks,
    lists: bestOutcome.lists,
    script: script.name,
    ops: bestOutcome.ops,
    ms: Date.now() - started,
    mode: 'chiron',
    notes: `variant=${bestTag}; ${bestOutcome.rules} macro rules, ${bestOutcome.blocks} blocks, ${bestOutcome.lists} lists; script=${script.name}; contract=${bestOutcome.messageTokens - bestOutcome.outTokens} tok for ops [${bestOutcome.ops.join(',')}]; whole-wire decode + message gate verified`,
  };
}

/* ---------------------------------------------------------------------------
 * 9. SELF TEST
 * ------------------------------------------------------------------------- */
export function chironSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases = [
    '',
    'x',
    '§',
    '§¶',
    'The quick brown fox jumps over the lazy dog. The quick brown fox jumps over the lazy dog again.',
    '{"ts":"2026-07-10T12:00:00Z","level":"INFO"}\n'.repeat(6),
    'A'.repeat(40) + 'B'.repeat(30),
    'id:0,id:1,id:2,id:3,id:4,id:5,id:6,id:7',
    '§¶ literal-looking payload with × and … inside',
    '가나다 Korean payload 가나다 repeated 가나다 가나다',
    'user: a\nassistant: b\nuser: a\nassistant: b\nuser: a\nassistant: b\n',
  ];
  return cases.map((c, i) => {
    try {
      const r = chironEncode(c, enc);
      const again = chironDecode(r.wire);
      return {
        name: `case-${i} ${JSON.stringify(c.slice(0, 28))}`,
        ok: r.exact && again === c && r.decoded === c,
        detail: `${r.mode} in=${r.inTokens} wire=${r.outTokens} M=${r.messageTokens}`,
      };
    } catch (e: any) {
      return { name: `case-${i}`, ok: false, detail: String(e?.message ?? e) };
    }
  });
}
