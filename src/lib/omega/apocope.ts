/**
 * APOCOPE (ἀποκοπή — "a cutting off", and its counterpart aphairesis for the
 * leading edge).
 *
 * X42. SYSTOLE (X41) established that a separator can be deleted because its
 * POSITION is implied by the shape of the number, and shipped that on four
 * lanes. This codec pushes the same argument one step further, onto the digits
 * themselves: if every occurrence of a template carries the same digit at the
 * same position, that digit carries no information, and it can be deleted and
 * stated once.
 *
 *     vix prices    17240000 18190000 19220000 ...    trailing "0000" constant
 *     aapl dates    20140102 20140103 20140106 ...    leading  "2014"  constant
 *
 * The two are the same observation wearing different clothes — one is a fixed
 * precision, the other a fixed period — and both are extremely common in real
 * operational data: every price in one currency and precision, every record
 * from one day, every build id from one release train.
 *
 * WHY ONLY A PREFIX AND A SUFFIX
 * ---------------------------------------------------------------------------
 * A constant digit could in principle sit anywhere. Only the two ends are
 * considered, because only the two ends are CHEAP TO RESTORE. "Prepend 2014"
 * and "append 0000" are single local edits; deleting an interior position would
 * force the reader to interleave two digit strings by counting into both, and
 * that is exactly the procedural task that arXiv 2605.02028 shows models fail
 * at (126 model variants, every one with a finite counting capacity). The
 * restriction is a reader-capacity limit, not an encoder convenience.
 *
 * REQUIRED TO BE 100 % CONSTANT
 * ---------------------------------------------------------------------------
 * A prefix or suffix is only deleted when it holds for EVERY occurrence of the
 * template. A single exception turns it into an exception list, and an
 * exception list is a second rule the reader has to apply conditionally, which
 * is where silent corruption starts. One deviation and the affix stays.
 *
 * RELATION TO WHAT ALREADY EXISTS
 * ---------------------------------------------------------------------------
 * "Fixed-precision trailing zeros" is recorded as DEAD in this repository. It
 * is dead without the template framing: a global trailing-zero strip is not
 * invertible, because the reader cannot know how many zeros to put back. Inside
 * a template the width is fixed, so the count of restored zeros is determined.
 * ELLEIPSIS removes a constant at a fixed FIELD position in a record; APOCOPE
 * removes a constant at a fixed DIGIT position inside a number, and composes
 * with SYSTOLE rather than competing with it.
 *
 * COMPOSITION
 * ---------------------------------------------------------------------------
 * APOCOPE wraps SYSTOLE: separators are removed first, then the affix is cut
 * from the resulting digit string. Decoding therefore restores the affix first
 * and the separators second. The reader identifies a run by the width that
 * SURVIVES both steps, so the one-template-per-width rule of SYSTOLE is
 * inherited and enforced on the surviving width.
 *
 * Greedy: no for affix selection (each is priced on the real token count of the
 * text it produces and the set is iterated to a fixed point against an exact
 * invertibility and unambiguity check) and no for the gate (the parent is
 * encoded and the worse of the two discarded). It is greedy in one respect:
 * templates are considered in order of measured saving.
 *
 * Time and CPU bound: yes. Candidate detection reuses SYSTOLE's run scanner and
 * adds a longest-common-prefix/suffix over the occurrences, which is linear.
 * The cost that matters is unchanged from SYSTOLE — a second full stack encode
 * for the gate.
 */
import { countTokens, type EncodingName } from './bpe';
import { systoleEncode, systoleDecode, systoleRuns, systoleShapeOf, systoleDigits } from './systole';

/** Separators, kept identical to SYSTOLE so the two compose. */
const SEPSET = new Set(['.', ':', ';', '-']);
/** A shape must occur at least this often before a constant affix is trusted. */
export const APOCOPE_MIN_COUNT = 3;
/** Cheap pre-filter on the raw saving, skipping the second parent encode. */
export const APOCOPE_MIN_RAW = 20;
export const APOCOPE_MAX_TEMPLATES = 3;

export interface ApocopeTemplate {
  /** digit-group sizes with literal separators, e.g. "4-2-2" */
  shape: string;
  /** full digit width */
  digits: number;
  /** constant leading digits removed */
  prefix: string;
  /** constant trailing digits removed */
  suffix: string;
  /** digits that survive both steps; the reader identifies the run by this */
  keep: number;
  count: number;
}

const isDigit = (c: string) => /\p{N}/u.test(c);
const strip = (s: string) => [...s].filter((c) => !SEPSET.has(c)).join('');

interface Cand extends ApocopeTemplate { save: number; sample: string }

function lcp(a: string[]): string {
  if (!a.length) return '';
  let p = a[0];
  for (let i = 1; i < a.length; i++) {
    let j = 0; while (j < p.length && j < a[i].length && p[j] === a[i][j]) j++;
    p = p.slice(0, j); if (!p) break;
  }
  return p;
}
function lcs(a: string[]): string {
  if (!a.length) return '';
  let s = a[0];
  for (let i = 1; i < a.length; i++) {
    let j = 0;
    while (j < s.length && j < a[i].length &&
           s[s.length - 1 - j] === a[i][a[i].length - 1 - j]) j++;
    s = s.slice(s.length - j); if (!s) break;
  }
  return s;
}

/**
 * Candidate templates with their constant affixes, priced on real token counts.
 */
export function apocopeFind(text: string, enc: EncodingName): Cand[] {
  const groups = new Map<string, string[]>();
  for (const r of systoleRuns(text)) {
    const sh = systoleShapeOf(r.s);
    if (systoleDigits(sh) < 4) continue;
    const arr = groups.get(sh) ?? [];
    arr.push(strip(r.s));
    groups.set(sh, arr);
  }
  const out: Cand[] = [];
  for (const [shape, vals] of groups) {
    if (vals.length < APOCOPE_MIN_COUNT) continue;
    const W = systoleDigits(shape);
    const P = lcp(vals);
    const S = lcs(vals);
    // keep at least one digit, and never cut more than the width allows
    const pre = P.slice(0, Math.min(P.length, W - 1));
    const suf = pre.length + S.length < W ? S.slice(0, W - 1 - pre.length) : '';
    if (!pre.length && !suf.length) continue;
    const keep = W - pre.length - suf.length;
    if (keep < 1) continue;
    let ws = 0, ns = 0;
    for (const v of vals) {
      ws += countTokens(v, enc);
      ns += countTokens(v.slice(pre.length, v.length - suf.length), enc);
    }
    const save = ws - ns;
    if (save <= 0) continue;
    out.push({ shape, digits: W, prefix: pre, suffix: suf, keep, count: vals.length, save, sample: vals[0] });
  }
  out.sort((a, b) => b.save - a.save);
  return out;
}

/** Cut separators, then the constant affix. */
export function apocopeApply(text: string, ts: ApocopeTemplate[]): string {
  if (!ts.length) return text;
  const by = new Map(ts.map((t) => [t.shape, t]));
  let out = '', last = 0;
  for (const r of systoleRuns(text)) {
    const t = by.get(systoleShapeOf(r.s));
    if (!t) continue;
    const d = strip(r.s);
    if (!d.startsWith(t.prefix) || !d.endsWith(t.suffix)) continue;
    if (d.length !== t.digits) continue;
    out += text.slice(last, r.at) + d.slice(t.prefix.length, d.length - t.suffix.length);
    last = r.at + r.len;
  }
  return out + text.slice(last);
}

/** Restore the affix, then the separators. */
export function apocopeUndo(text: string, ts: ApocopeTemplate[]): string {
  if (!ts.length) return text;
  const byKeep = new Map<number, ApocopeTemplate>();
  for (const t of ts) byKeep.set(t.keep, t);
  let out = '', last = 0;
  for (const m of text.matchAll(/\p{N}+/gu)) {
    const t = byKeep.get(m[0].length);
    if (!t) continue;
    const full = t.prefix + m[0] + t.suffix;
    if (full.length !== t.digits) continue;
    let rebuilt = '', i = 0;
    for (const part of t.shape.match(/\p{N}+|[^\p{N}]/gu) ?? []) {
      if (isDigit(part[0])) { rebuilt += full.slice(i, i + Number(part)); i += Number(part); }
      else rebuilt += part;
    }
    if (i !== full.length) continue;
    out += text.slice(last, m.index ?? 0) + rebuilt;
    last = (m.index ?? 0) + m[0].length;
  }
  return out + text.slice(last);
}

/**
 * Exact invertibility plus reader-unambiguity: after the cut, every maximal
 * digit run of a shipped surviving width must be one we produced.
 */
export function apocopeUnambiguous(text: string, ts: ApocopeTemplate[]): boolean {
  if (!ts.length) return true;
  const cut = apocopeApply(text, ts);
  if (apocopeUndo(cut, ts) !== text) return false;
  const want = new Map<number, number>();
  for (const t of ts) want.set(t.keep, (want.get(t.keep) ?? 0) + t.count);
  const got = new Map<number, number>();
  for (const m of cut.matchAll(/\p{N}+/gu)) {
    const L = m[0].length;
    if (want.has(L)) got.set(L, (got.get(L) ?? 0) + 1);
  }
  for (const [k, w] of want) if ((got.get(k) ?? 0) !== w) return false;
  return true;
}

/**
 * Choose the shipped set. Two rules carried over from SYSTOLE, both learned by
 * losing most of the gain: SKIP a template that cannot be read back rather than
 * truncating the list, and iterate to a fixed point because ambiguity is not
 * monotone in the template set.
 */
export function apocopeChoose(text: string, enc: EncodingName): Cand[] {
  const all = apocopeFind(text, enc);
  const chosen: Cand[] = [];
  const used = new Set<number>();
  let added = true;
  while (added && chosen.length < APOCOPE_MAX_TEMPLATES) {
    added = false;
    for (const t of all) {
      if (used.has(t.keep)) continue;
      if (chosen.length >= APOCOPE_MAX_TEMPLATES) break;
      const blocked = all.some((u) => u.keep === t.keep && u.save > t.save && !chosen.includes(u));
      if (blocked) continue;
      if (!apocopeUnambiguous(text, [...chosen, t])) continue;
      used.add(t.keep); chosen.push(t); added = true;
    }
  }
  return chosen;
}

/** One template rendered for the clause: constants literal, kept digits '#'. */
export function apocopeRender(t: ApocopeTemplate): string {
  const cells: string[] = [];
  for (let i = 0; i < t.digits; i++) {
    if (i < t.prefix.length) cells.push(t.prefix[i]);
    else if (i >= t.digits - t.suffix.length) cells.push(t.suffix[i - (t.digits - t.suffix.length)]);
    else cells.push('#');
  }
  let out = '', p = 0;
  for (const part of t.shape.match(/\p{N}+|[^\p{N}]/gu) ?? []) {
    if (isDigit(part[0])) { const n = Number(part); out += cells.slice(p, p + n).join(''); p += n; }
    else out += part;
  }
  return out;
}

/**
 * The clause. Each template is written out in full with the constant digits
 * literal and the surviving ones as '#', so the reader sees the shape rather
 * than being told it. The surviving width is prefixed so the reader can tell
 * which runs a template applies to when there is more than one.
 */
export function apocopeClauseFor(ts: ApocopeTemplate[]): string {
  if (!ts.length) return '';
  // Variant D, measured in bench/x42/clause.ts at +1 (aapl) to +3 (vix) tokens
  // over the SYSTOLE clause it replaces. The explicit surviving width is kept
  // because it is the key the reader matches runs against; dropping it saves
  // ~4 tokens and buys a counting task (CharBench, arXiv 2508.02591).
  const parts = ts.map((t) => `${t.keep}:${apocopeRender(t)}`);
  return 'Restore ' + parts.join(', ') + '.';
}

export interface ApocopeResult {
  wire: string;
  messageTokens: number;
  contract?: string;
  apocope: boolean;
  apocopeTemplates: ApocopeTemplate[];
  apocopeGain: number;
  apocopeRawSave: number;
  [k: string]: any;
}

/** Encode. APOCOPE wraps SYSTOLE: contract the number, then cut the affix. */
export function apocopeEncode(
  text: string, enc: EncodingName, opts: Record<string, any> = {},
): ApocopeResult {
  const parent: any = systoleEncode(text, enc, opts);
  const plain: ApocopeResult = {
    ...parent, apocope: false, apocopeTemplates: [], apocopeGain: 0, apocopeRawSave: 0,
  };
  if (opts.apocope === false) return plain;

  const chosen = apocopeChoose(text, enc);
  const rawSave = chosen.reduce((s, t) => s + t.save, 0);
  if (rawSave < APOCOPE_MIN_RAW) return { ...plain, apocopeRawSave: rawSave };
  if (!chosen.length) return { ...plain, apocopeRawSave: rawSave };

  let cut: string;
  try { cut = apocopeApply(text, chosen); } catch { return { ...plain, apocopeRawSave: rawSave }; }
  if (cut === text) return { ...plain, apocopeRawSave: rawSave };

  // SYSTOLE is disabled inside the trial: APOCOPE's cut changes the digit
  // widths, so SYSTOLE's own separator stripping would no longer find the
  // templates it priced. The cut subsumes it.
  let r: any;
  try {
    r = systoleEncode(cut, enc, { ...opts, systole: false });
  } catch { return { ...plain, apocopeRawSave: rawSave }; }

  const contract: string = (r as any).contract ?? '';
  const clause = apocopeClauseFor(chosen);
  const clauseTok = countTokens(' ' + clause + ' print only.', enc)
    - countTokens(' print only.', enc);
  const total = r.messageTokens + clauseTok;
  if (total >= parent.messageTokens) return { ...plain, apocopeRawSave: rawSave };

  const tail = 'print only.';
  return {
    ...r,
    contract: contract.endsWith(tail)
      ? contract.slice(0, contract.length - tail.length) + clause + ' ' + tail
      : contract + ' ' + clause,
    messageTokens: total,
    apocope: true,
    apocopeTemplates: chosen,
    apocopeGain: parent.messageTokens - total,
    apocopeRawSave: rawSave,
  };
}

/** Decode: undo PERITROPE, then restore the affix and the separators. */
export function apocopeDecode(
  wire: string,
  cfg: { stats?: any; order?: 'in' | 'out'; undo: (w: string) => string },
  opts: {
    alphabet?: string; marker?: string; marker2?: string; group?: any; framing?: any;
    ouraShape?: { sep: string; suf: number[]; minLen: number; k?: number } | null;
    ouraMode?: 'mark' | 'plain' | 'lead'; ouraSentinel?: string;
    antistrophePair?: [string, string] | null;
    peritropePairs?: [string, string][];
    systoleTemplates?: { shape: string; digits: number; count: number }[];
    apocopeTemplates?: ApocopeTemplate[];
  } = {},
): string {
  const mid = systoleDecode(wire, cfg, opts);
  const t = opts.apocopeTemplates;
  if (!t || !t.length) return mid;
  return apocopeUndo(mid, t);
}
