/**
 * ⚓ ΑΓΚΥΡΑ — ANKYRA (ἄγκυρα, "anchor"): class-anchored constant elision (X19).
 * =============================================================================
 *
 * THE GAP IT ATTACKS
 * -----------------------------------------------------------------------------
 * A literal-string grammar (CHIRON / Re-Pair / LZ78) charges ONE token per
 * occurrence for a constant, because the constant has to be *pointed at* from
 * the body. DAEDALUS is the best such grammar in this repository and is measured
 * to be at its own ceiling on this corpus:
 *
 *   · relabelling the finished wire's glyph alphabet to chase two-character
 *     tokenizer merges buys 0–2 tokens per lane (bench/x19/anathesis-probe.mjs);
 *   · packing the punctuation *inside* numbers buys nothing once DAEDALUS has
 *     run (bench/x19/wire-pack-probe.mjs: 222 clusters, 298 tokens = 1.00 % of
 *     the wires, less than the sentence needed to restore them);
 *   · packing it *before* DAEDALUS runs is fully redundant with the dictionary
 *     (bench/x19/stigme-lanes.ts: find-listing −1080 raw tokens, +83 on M).
 *
 * So the remaining prize is not "a cheaper pointer". It is "no pointer at all".
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 * A constant that sits at a position the reader can COMPUTE — immediately after
 * every number, immediately before every one, at the start of every line — does
 * not have to be sent at all. One sentence puts it back:
 *
 *     After every number insert `"`.
 *
 * The anchor is a *character class*, not a literal string. That is the whole
 * point, and it is why this is not redundant with a dictionary. `x="10"` and
 * `width="3.5"` share no literal context around the quote, so a grammar must
 * reference its `"` rule once per occurrence; the class anchor follows from the
 * digits, which do change, and therefore costs nothing.
 *
 * ANCHOR CLASSES (all are computed by the encoder and named in one sentence)
 * -----------------------------------------------------------------------------
 *   digits      maximal run of [0-9]
 *   numDot      maximal run of digits with interior dots      (3.5, 1.2.3)
 *   numSep      … with interior . , :                         (07:59:52)
 *   word        maximal run of ASCII letters
 *   line        the start of every line
 * and each of them may be anchored AFTER or BEFORE.
 *
 * WHY THE EXCEPTION MARKER, AND WHAT IT COSTS
 * -----------------------------------------------------------------------------
 * The constant does not sit at *every* anchor in real text, so the encoder
 * deletes it where it occurs and writes a one-token marker at the anchors where
 * it does not. The reader's rule is one scan:
 *
 *     at every anchor: if the next character is E, delete E and insert nothing;
 *                      else insert Y.
 *
 * Cost: one token per exception, zero per ordinary occurrence. The measured
 * consequence is that a rule only pays when the exception rate is low, which is
 * exactly why the encoder searches over five anchor classes and both directions
 * and keeps the best net, measured against the live tokenizer.
 *
 * SAFETY (the correctness argument)
 * -----------------------------------------------------------------------------
 *  A1  The encoder checks ankyraUndo(ankyraApply(x)) === x for every candidate
 *      before it is admitted. A candidate that would merge two anchors, move an
 *      anchor, or make the scan ambiguous is therefore rejected outright,
 *      instead of being patched with an ad-hoc side condition.
 *  A2  The exception marker E is a one-token character that does not occur in
 *      the source, so "digits E Y rest" can only read back as "digits Y rest".
 *  A3  The downstream codec is byte-exact, so the reader's input to the restore
 *      is exactly the transformed text, whatever rules the grammar chose.
 *  A4  The final gate re-runs the whole decode and compares byte for byte.
 *
 * GATE
 * -----------------------------------------------------------------------------
 * Every arm is run on the raw text and on the transformed text; the cheapest
 * exact message wins. ANKYRA can therefore never cost more than the best arm it
 * contains, and it is identity wherever no rule pays.
 */

import { countTokens, type EncodingName } from './bpe';

/** One-token characters used as the exception marker, in preference order. */
const MARK_CANDIDATES = [
  '\u00a4', '\u00a6', '\u00a9', '\u00ab', '\u00ac', '\u00ae', '\u00af', '\u00b0', '\u00b1',
  '\u00b2', '\u00b3', '\u00b4', '\u00b5', '\u00b7', '\u00b8', '\u00b9', '\u00ba', '\u00bb',
  '\u00bc', '\u00bd', '\u00be', '\u00bf', '\u03b1', '\u03b2', '\u0561', '\u10d0',
];

/** The anchor classes the encoder may use. Each is a global regex over the text. */
export const ANKYRA_CLASSES: Record<string, RegExp> = {
  digits: /[0-9]+/g,
  numDot: /[0-9]+(?:\.[0-9]+)*/g,
  numSep: /[0-9]+(?:[.,:][0-9]+)*/g,
  word: /[A-Za-z]+/g,
};
export const ANKYRA_CLASS_NAMES = ['digits', 'numDot', 'numSep', 'word', 'line'] as const;
export type AnkyraClass = (typeof ANKYRA_CLASS_NAMES)[number];
export type AnkyraDir = 'after' | 'before';

export interface AnkyraRule {
  cls: AnkyraClass;
  dir: AnkyraDir;
  /** the constant that is removed and re-inserted */
  y: string;
  /** the one-token exception marker */
  e: string;
  /** anchors where Y was deleted */
  k: number;
  /** anchors marked as exceptions */
  m: number;
  /** measured tokens(text) - tokens(transformed) */
  rawDelta: number;
  /** the sentence appended to the decoder message */
  contract: string;
  contractTokens: number;
}

/** Offsets of the anchors of `cls` in `t`: `dir==='after'` uses end offsets. */
function anchorsOf(t: string, cls: AnkyraClass, dir: AnkyraDir): number[] {
  if (cls === 'line') {
    const out = [0];
    for (let i = 0; i < t.length; i++) if (t[i] === '\n') out.push(i + 1);
    return out;
  }
  const re = ANKYRA_CLASSES[cls];
  re.lastIndex = 0;
  const out: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(t)) !== null) {
    out.push(dir === 'after' ? m.index + m[0].length : m.index);
    if (m[0].length === 0) re.lastIndex++;
  }
  return out;
}

const CLASS_WORD: Record<AnkyraClass, string> = {
  digits: 'run of digits', numDot: 'number', numSep: 'number', word: 'word', line: 'line',
};

function contractFor(r: Omit<AnkyraRule, 'contract' | 'contractTokens'>): string {
  const yy = JSON.stringify(r.y);
  const where = r.dir === 'after' ? `After every ${CLASS_WORD[r.cls]}` : `Before every ${CLASS_WORD[r.cls]}`;
  const head = r.cls === 'line' ? `At the start of every line insert ${yy}.` : `${where} insert ${yy}.`;
  if (r.m === 0) return head;
  const at = r.cls === 'line' ? 'at the start of the line' : (r.dir === 'after' ? 'right after it' : 'right before it');
  return `${head} ${JSON.stringify(r.e)} ${at} means: delete the ${JSON.stringify(r.e)} and insert nothing.`;
}

export interface AnkyraPlanOptions {
  /** longest constant considered */
  maxLen?: number;
  classes?: AnkyraClass[];
  dirs?: AnkyraDir[];
  /** ignore candidates whose rough estimate is below this */
  minRough?: number;
}

/** Every constant string of length 1..maxLen sitting at an anchor of (cls, dir). */
function candidatesOf(t: string, cls: AnkyraClass, dir: AnkyraDir, maxLen: number): string[] {
  const seen = new Set<string>();
  for (const p of anchorsOf(t, cls, dir)) {
    for (let L = 1; L <= maxLen; L++) {
      const s = dir === 'after' ? t.slice(p, p + L) : t.slice(p - L, p);
      if (s.length !== L) break;
      if (/^[0-9]/.test(s)) break;          // a constant never starts with a digit
      if (cls !== 'line' && s.includes('\n')) break;
      seen.add(s);
    }
  }
  return [...seen];
}

const hitAt = (t: string, p: number, y: string, dir: AnkyraDir) =>
  dir === 'after' ? t.startsWith(y, p) : p - y.length >= 0 && t.slice(p - y.length, p) === y;

/** Forward transform: delete Y at every anchor; mark the exceptions with E. */
export function ankyraApply(text: string, rule: AnkyraRule): string {
  const { cls, dir, y, e } = rule;
  let out = '';
  let at = 0;
  for (const p of anchorsOf(text, cls, dir)) {
    if (p < at) continue;
    if (hitAt(text, p, y, dir)) {
      if (dir === 'before') { out += text.slice(at, p - y.length); at = p; }
      else { out += text.slice(at, p); at = p + y.length; }
    } else {
      out += text.slice(at, p) + e;
      at = p;
    }
  }
  out += text.slice(at);
  return out;
}

/** The reader's rule: the exact inverse of ankyraApply. */
export function ankyraUndo(t: string, rule: AnkyraRule): string {
  const { cls, dir, y, e } = rule;
  let out = '';
  let at = 0;
  for (const p of anchorsOf(t, cls, dir)) {
    if (p < at) continue;
    out += t.slice(at, p);
    if (t.startsWith(e, p)) at = p + e.length;
    else { out += y; at = p; }
  }
  out += t.slice(at);
  return out;
}

/** Choose the best single rule. Returns null when no (class, direction, Y) pays. */
export function ankyraPlan(text: string, enc: EncodingName, options: AnkyraPlanOptions = {}): AnkyraRule | null {
  const maxLen = options.maxLen ?? 8;
  const classes = options.classes ?? [...ANKYRA_CLASS_NAMES];
  const dirs = options.dirs ?? (['after', 'before'] as AnkyraDir[]);
  const rawTokens = countTokens(text, enc);
  const payload = new Set(text);
  const marks = MARK_CANDIDATES.filter(
    c => !payload.has(c) && countTokens(c, 'o200k_base') === 1 && countTokens(c, 'cl100k_base') === 1,
  );
  if (!marks.length) return null;
  const e = marks[marks.length - 1];

  let best: AnkyraRule | null = null;
  let bestNet = 0;
  for (const cls of classes) {
    for (const dir of dirs) {
      if (cls === 'line' && dir === 'before') continue;
      const pos = anchorsOf(text, cls, dir);
      if (pos.length < 3) continue;
      for (const y of candidatesOf(text, cls, dir, maxLen)) {
        let k = 0, m = 0;
        for (const p of pos) if (hitAt(text, p, y, dir)) k++; else m++;
        if (k < 3) continue;
        const contract = contractFor({ cls, dir, y, e, k, m, rawDelta: 0 });
        const contractTokens = countTokens(contract, enc);
        const rough = k - m - contractTokens;
        if (rough <= bestNet) continue;                     // cheap filter first
        const probe: AnkyraRule = { cls, dir, y, e, k, m, rawDelta: 0, contract, contractTokens };
        const transformed = ankyraApply(text, probe);
        if (ankyraUndo(transformed, probe) !== text) continue;   // A1
        const rawDelta = rawTokens - countTokens(transformed, enc);
        const net = rawDelta - contractTokens;
        if (net > bestNet) { bestNet = net; best = { ...probe, rawDelta }; }
      }
    }
  }
  return best;
}

/* ---------------------------------------------------------------------------
 * Arm plumbing and the whole-message gate.
 * ------------------------------------------------------------------------- */

import { chironDecode } from './chiron';
import { lakonikosDualEncode } from './lakonikos-d';
import { densEncode, densDecode } from './dendrons';
import { akolouthia2Encode, akolouthia2Decode } from './akolouthia2';

interface ArmOut {
  wire: string;
  message: string;
  /** the reader's own decode of `wire`, arm-aware */
  decode: () => string;
  /** arm-internal state the decoder needs (AKOLOUTHIA-2's arm) */
  armState?: string;
  tokens: number;
}

interface Arm { name: string; encode: (t: string, enc: EncodingName) => ArmOut }

const ARMS: Arm[] = [
  {
    name: 'lkd',
    encode: (t, enc) => {
      const r = lakonikosDualEncode(t, enc);
      return { wire: r.wire, message: r.decoderPrompt || t, decode: () => chironDecode(r.wire), tokens: r.messageTokens[enc] };
    },
  },
  {
    name: 'dens',
    encode: (t, enc) => {
      const r = densEncode(t, enc, {});
      return { wire: r.wire, message: r.decoderPrompt, decode: () => densDecode(r.wire), tokens: r.messageTokens };
    },
  },
  {
    name: 'ak2',
    encode: (t, enc) => {
      const r = akolouthia2Encode(t, enc);
      return { wire: r.wire, message: r.decoderPrompt, decode: () => akolouthia2Decode(r.wire, r.arm), armState: r.arm, tokens: r.messageTokens };
    },
  },
];

export interface AnkyraResult {
  codec: 'ankyra';
  wire: string;
  /** the full message: arm contract + wire, plus the ANKYRA sentence when the rule was taken */
  message: string;
  decoded: string;
  exact: boolean;
  mode: 'raw' | 'ankyra';
  arm: string;
  armState?: string;
  rule: AnkyraRule | null;
  messageTokens: number;
  /** M of the best arm on the untouched text (the gate's comparison base) */
  baseTokens: number;
  inTokens: number;
  notes: string;
}

/** The reader's own decode of an ANKYRA message: arm decode, then the restore. */
export function ankyraDecode(wire: string, arm: string, rule: AnkyraRule | null, armState?: string): string {
  const t =
    arm === 'dens' ? densDecode(wire)
    : arm === 'ak2' ? akolouthia2Decode(wire, (armState as 'progression' | 'identity') ?? 'progression')
    : chironDecode(wire);
  return rule ? ankyraUndo(t, rule) : t;
}

export function ankyraEncode(text: string, enc: EncodingName = 'o200k_base', options: AnkyraPlanOptions = {}): AnkyraResult {
  const inTokens = countTokens(text, enc);

  let base: { wire: string; message: string; tokens: number; arm: string; armState?: string } | null = null;
  for (const a of ARMS) {
    try {
      const r = a.encode(text, enc);
      if (r.decode() !== text) continue;
      if (!base || r.tokens < base.tokens) base = { wire: r.wire, message: r.message, tokens: r.tokens, arm: a.name, armState: r.armState };
    } catch { /* arm failed on this input */ }
  }
  if (!base) {
    return {
      codec: 'ankyra', wire: text, message: text, decoded: text, exact: true, mode: 'raw', arm: 'none',
      rule: null, messageTokens: inTokens, baseTokens: inTokens, inTokens,
      notes: 'identity: no arm produced an exact wire',
    };
  }
  const out = (over: Partial<AnkyraResult> = {}): AnkyraResult => ({
    codec: 'ankyra', wire: base!.wire, message: base!.message, decoded: text, exact: true, mode: 'raw',
    arm: base!.arm, armState: base!.armState, rule: null, messageTokens: base!.tokens,
    baseTokens: base!.tokens, inTokens,
    notes: `identity (best raw arm ${base!.arm}, ${base!.tokens} tok)`, ...over,
  });

  let rule: AnkyraRule | null = null;
  try { rule = ankyraPlan(text, enc, options); } catch { rule = null; }
  if (!rule) return out();

  const transformed = ankyraApply(text, rule);
  if (ankyraUndo(transformed, rule) !== text) return out({ notes: `round trip failed; ${out({}).notes}` });

  let best: { wire: string; message: string; tokens: number; arm: string; armState?: string } | null = null;
  for (const a of ARMS) {
    try {
      const r = a.encode(transformed, enc);
      if (ankyraUndo(r.decode(), rule) !== text) continue;
      const message = r.message + '\n' + rule.contract;
      const tokens = countTokens(message, enc);
      if (!best || tokens < best.tokens) best = { wire: r.wire, message, tokens, arm: a.name, armState: r.armState };
    } catch { /* skip */ }
  }
  if (!best) return out({ notes: `no arm decoded the transformed text exactly; ${out({}).notes}` });
  if (best.tokens >= base.tokens) {
    return out({ notes: `${rule.cls}/${rule.dir} ${JSON.stringify(rule.y)} k=${rule.k} m=${rule.m}: transformed ${best.tokens} >= raw ${base.tokens} (rawDelta ${rule.rawDelta}, contract ${rule.contractTokens}); ${out({}).notes}` });
  }
  return {
    codec: 'ankyra', wire: best.wire, message: best.message, decoded: text, exact: true, mode: 'ankyra',
    arm: best.arm, armState: best.armState, rule, messageTokens: best.tokens, baseTokens: base.tokens, inTokens,
    notes: `arm=${best.arm}; ${rule.cls}/${rule.dir} ${JSON.stringify(rule.y)} k=${rule.k} m=${rule.m}; rawDelta=${rule.rawDelta}; contract=${rule.contractTokens}; ${base.tokens} -> ${best.tokens}`,
  };
}
