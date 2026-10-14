/**
 * src/lib/omega/elleipsis.ts
 * =============================================================================
 * ○ ELLEIPSIS — marker-free elision of a positionally fixed constant field
 * (byte-perfect, exact-lossless, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * ἔλλειψις — "leaving out": the rhetorical figure in which a word is omitted
 * because its position makes it recoverable.
 *
 * THE SEAM (measured, bench/z48)
 * -----------------------------------------------------------------------------
 * A line-aligned dictionary (DAEDALUS) charges ONE token per occurrence of any
 * repeated span: the glyph.  Two measurements fix where that token can still
 * be removed and where it cannot:
 *
 *   newline tax   A constant at the START or END of a record is already free:
 *                 the glyph that stands for it also absorbs the record's "\n"
 *                 (e.g. "\n-rwxr-xr-x 1 root root" is one glyph).  Removing the
 *                 constant leaves "\n", which costs the same one token.
 *                 ls -l /usr/bin, 636 lines, both prefixes removed: 3746 → 3647
 *                 (−2.6 %, i.e. not the −1 token/line a naive model predicts).
 *
 *   mid-line      A constant that sits BETWEEN two variable fields is a
 *                 standalone glyph, one token per record, and nothing absorbs
 *                 it.  Removing it saves that token; when the removal lets the
 *                 neighbours merge (a tab + the next path component, two
 *                 padding runs) it saves more.  du -sh /usr/share/*, 150 lines,
 *                 "/usr/share/" after the tab removed: 766 → 605 (−21 % gross).
 *
 * ELLEIPSIS removes a constant string from a fixed FIELD POSITION of every
 * record in a class and tells the reader, in one sentence, where it was.  No
 * marker is left in the record (a marker would cost the token back).  The
 * class is stated by shape — "lines beginning with ii", "every line", "lines
 * after the first" — and lines inside the class that do NOT carry the constant
 * are told apart by a predicate on the field that now stands in its place
 * ("except where that field is all"), which the encoder verifies separates the
 * two sets exactly on this document.  Up to three such rules, then DAEDALUS.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1 : "○ " + one or more rule sentences (decode order, joined by " ")
 *   rest   : the DAEDALUS wire of the reduced text
 * Reader: decode the DAEDALUS part as usual, then apply the sentences in the
 * order written.  The prompt is the sentence line + DAEDALUS's own prompt; the
 * one-chat cost M counts both.  Identity-guarded: the plain DAEDALUS arm ALWAYS
 * runs and wins ties, so M(ELLEIPSIS) ≤ M(DAEDALUS) on every input.
 *
 * RULE FORMS (one sentence each; all parameters quoted and parseable)
 *   whole field (whitespace tables)
 *     Each line [beginning with "ii" | after the first] lost its 4th
 *     space-separated field, "amd64" followed by 8 spaces[, except lines whose
 *     4th field is "all"]; put it back.
 *   field prefix (paths after a size/date column)
 *     Each line lost "/usr/share/" from the start of its 2nd tab-separated
 *     field[, except lines whose 2nd field starts with "/"]; put it back.
 *   empty cell (single-character delimiters: comma, semicolon, tab)
 *     In each line an empty 3rd comma-separated field stands for "active".
 *
 * Positions are 1-based and refer to the text at the moment the sentence is
 * applied (sentences are written in decode order).  A removed whole field is
 * never the first or the last field of its line (those are free, see above).
 *
 * WHAT IT IS NOT
 *   not CHIRON's × REPEAT block (that rewrites rows as per-column lists and
 *   pays a separator per cell), not DIRFOLD (a per-line "↑" marker, same-dir
 *   relative to the previous line), not KIONES/PLINTHOS (transposition), not
 *   TOON/CSV key amortisation (keys are already one glyph).  The reader does
 *   not count rows, does not do arithmetic, and copies every variable field
 *   verbatim; its only new act is "insert this constant before field k of
 *   lines of this shape".
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';

export const ELLEIPSIS_MARK = '○ ';

/* ---------------------------------------------------------------------------
 * 1. LINE / FIELD MODEL
 * ------------------------------------------------------------------------- */

export type Delim = 'space' | 'comma' | 'semicolon' | 'tab';
const DELIM_CHAR: Record<Exclude<Delim, 'space'>, string> = { comma: ',', semicolon: ';', tab: '\t' };
const DELIM_WORD: Record<Delim, string> = { space: 'space', comma: 'comma', semicolon: 'semicolon', tab: 'tab' };

/** line = lead + f[0] + s[0] + f[1] + s[1] + ... + f[n-1] + trail  (whitespace model) */
export interface Split { lead: string; f: string[]; s: string[]; trail: string }

export function splitWs(line: string): Split {
  const f: string[] = [], s: string[] = [];
  const m = /^[ \t]*/.exec(line)!;
  const lead = m[0];
  let i = lead.length;
  while (i < line.length) {
    let j = i;
    while (j < line.length && line[j] !== ' ' && line[j] !== '\t') j++;
    f.push(line.slice(i, j));
    let k = j;
    while (k < line.length && (line[k] === ' ' || line[k] === '\t')) k++;
    if (k < line.length) s.push(line.slice(j, k)); else { return { lead, f, s, trail: line.slice(j, k) }; }
    i = k;
  }
  return { lead, f, s, trail: '' };
}
export function joinWs(p: Split): string {
  let out = p.lead;
  for (let i = 0; i < p.f.length; i++) out += p.f[i] + (i < p.s.length ? p.s[i] : '');
  return out + p.trail;
}

/** number of whitespace-separated fields a removed value spans (1 for a single field) */
const runLength = (value: string) => value.split(/[ \t]+/).length;
const ordinal = (n: number) => n === -1 ? 'last' : `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th'}`;
const q = (s: string) => `"${s}"`;

/* ---------------------------------------------------------------------------
 * 2. RULES
 * ------------------------------------------------------------------------- */

export type Scope = { kind: 'all' } | { kind: 'first', word: string } | { kind: 'afterFirst' };
export type Except = { kind: 'none' } | { kind: 'is', values: string[] } | { kind: 'starts', ch: string } | { kind: 'digit', neg: boolean };

export interface CellDefault { k: number; column?: string; value: string }
export interface Rule {
  form: 'field' | 'prefix' | 'cells';
  delim: Delim;
  k: number;              // 1-based field index (field / prefix forms)
  value: string;          // the removed constant (field run / prefix)
  pad: string;            // whole-field form: the whitespace run that followed the removed field (removed with it)
  scope: Scope;
  except: Except;
  /** 'cells' form: per-column defaults; a column is named by its header cell when the first line is a header, else by position */
  pairs?: CellDefault[];
}

function inScope(line: string, scope: Scope, index: number): boolean {
  if (scope.kind === 'all') return true;
  if (scope.kind === 'afterFirst') return index > 0;
  return line.startsWith(scope.word) && (line.length === scope.word.length || line[scope.word.length] === ' ' || line[scope.word.length] === '\t');
}
function excepted(field: string, ex: Except): boolean {
  switch (ex.kind) {
    case 'none': return false;
    case 'is': return ex.values.includes(field);
    case 'starts': return field.startsWith(ex.ch);
    case 'digit': return /^[0-9]/.test(field) !== ex.neg;
  }
}

function padPhrase(pad: string): string {
  if (/^ +$/.test(pad)) return pad.length === 1 ? 'a space' : `${pad.length} spaces`;
  if (/^\t+$/.test(pad)) return pad.length === 1 ? 'a tab' : `${pad.length} tabs`;
  return q(pad); // mixed runs are refused by the encoder; kept for completeness
}
function parsePad(phrase: string): string | null {
  let m = /^a space$/.exec(phrase); if (m) return ' ';
  m = /^(\d+) spaces$/.exec(phrase); if (m) return ' '.repeat(+m[1]);
  m = /^a tab$/.exec(phrase); if (m) return '\t';
  m = /^(\d+) tabs$/.exec(phrase); if (m) return '\t'.repeat(+m[1]);
  m = /^"(.*)"$/.exec(phrase); if (m) return m[1];
  return null;
}

function scopePhrase(s: Scope): string {
  return s.kind === 'all' ? 'Each line' : s.kind === 'afterFirst' ? 'Each line after the first' : `Each line beginning with ${q(s.word)}`;
}
function exceptPhrase(e: Except, k: number): string {
  const fld = `${ordinal(k)} field`;
  switch (e.kind) {
    case 'none': return '';
    case 'is': return `, except lines whose ${fld} is ${e.values.map(q).join(' or ')}`;
    case 'starts': return `, except lines whose ${fld} starts with ${q(e.ch)}`;
    case 'digit': return `, except lines whose ${fld} ${e.neg ? 'does not start' : 'starts'} with a digit`;
  }
}

export function sentenceOf(r: Rule): string {
  const dw = DELIM_WORD[r.delim];
  if (r.form === 'cells') return `Empty cells (${dw}-separated) hold the column's default: ${(r.pairs ?? []).map(p => `${p.column !== undefined ? q(p.column) : `${ordinal(p.k)} column`} = ${q(p.value)}`).join(', ')}.`;
  if (r.form === 'prefix') return `${scopePhrase(r.scope)} lost ${q(r.value)} from the start of its ${ordinal(r.k)} ${dw}-separated field${exceptPhrase(r.except, r.k)}; put it back.`;
  return `${scopePhrase(r.scope)} lost its ${ordinal(r.k)} ${dw}-separated field, ${q(r.value)} followed by ${padPhrase(r.pad)}${exceptPhrase(r.except, r.k)}; put it back.`;
}

const SCOPE_RE = /^Each line(?: beginning with "((?:[^"\\]|\\.)*)"| after the first)?/;
const EXCEPT_RE = /, except lines whose (?:\d+(?:st|nd|rd|th)|last) field (?:is ((?:"(?:[^"\\]|\\.)*"(?: or )?)+)|starts with "(.)"|(starts|does not start) with a digit)$/;
const DELIMS: Delim[] = ['space', 'comma', 'semicolon', 'tab'];

function parseExcept(tail: string): { except: Except; rest: string } {
  const m = EXCEPT_RE.exec(tail);
  if (!m) return { except: { kind: 'none' }, rest: tail };
  const rest = tail.slice(0, m.index);
  if (m[1]) return { except: { kind: 'is', values: [...m[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map(x => x[1]) }, rest };
  if (m[2]) return { except: { kind: 'starts', ch: m[2] }, rest };
  return { except: { kind: 'digit', neg: m[3] === 'does not start' }, rest };
}

export function parseSentence(sentence: string): Rule | null {
  let m = /^Empty cells \((comma|semicolon|tab)-separated\) hold the column's default: (.+)\.$/.exec(sentence);
  if (m) {
    const pairs: CellDefault[] = [];
    const re = /(?:"((?:[^"\\]|\\.)*)"|(\d+)(?:st|nd|rd|th) column) = "((?:[^"\\]|\\.)*)"(?:, |$)/gy;
    let last = 0;
    for (let x = re.exec(m[2]); x; x = re.exec(m[2])) { pairs.push(x[1] !== undefined ? { k: 0, column: x[1], value: x[3] } : { k: +x[2], value: x[3] }); last = re.lastIndex; }
    if (!pairs.length || last !== m[2].length) return null;
    return { form: 'cells', delim: m[1] as Delim, k: 0, value: '', pad: '', scope: { kind: 'all' }, except: { kind: 'none' }, pairs };
  }
  if (!sentence.endsWith('; put it back.')) return null;
  const body = sentence.slice(0, -'; put it back.'.length);
  const sm = SCOPE_RE.exec(body);
  if (!sm) return null;
  const scope: Scope = sm[1] !== undefined ? { kind: 'first', word: sm[1] } : sm[0].endsWith('after the first') ? { kind: 'afterFirst' } : { kind: 'all' };
  const { except, rest } = parseExcept(body.slice(sm[0].length));
  m = /^ lost "((?:[^"\\]|\\.)*)" from the start of its (\d+(?:st|nd|rd|th)|last) (space|comma|semicolon|tab)-separated field$/.exec(rest);
  if (m) return { form: 'prefix', delim: m[3] as Delim, k: m[2] === 'last' ? -1 : parseInt(m[2], 10), value: m[1], pad: '', scope, except };
  m = /^ lost its (\d+)(?:st|nd|rd|th) (space|comma|semicolon|tab)-separated field, "((?:[^"\\]|\\.)*)" followed by (.+)$/.exec(rest);
  if (m) {
    const pad = parsePad(m[4]);
    if (pad === null) return null;
    return { form: 'field', delim: m[2] as Delim, k: +m[1], value: m[3], pad, scope, except };
  }
  return null;
}

/** canonical JSON of a rule for round-trip checks (a named column's position is derived from the header, not carried) */
export function ruleKey(r: Rule): string {
  return JSON.stringify({ ...r, pairs: r.pairs?.map(p => p.column !== undefined ? { column: p.column, value: p.value } : { k: p.k, value: p.value }) });
}

/** sentence line → rules, in the order written (= decode order) */
export function rulesOf(sentenceLine: string): Rule[] | null {
  if (!sentenceLine.startsWith(ELLEIPSIS_MARK)) return null;
  const parts = sentenceLine.slice(ELLEIPSIS_MARK.length).split(/(?<=\.) (?=(?:Each line|Empty cells))/);
  const out: Rule[] = [];
  for (const p of parts) { const r = parseSentence(p); if (!r) return null; out.push(r); }
  return out;
}

/* ---------------------------------------------------------------------------
 * 3. FOLD / UNFOLD
 * ------------------------------------------------------------------------- */

/** 0-based index of field k (k = -1: the last field); -1 when the line has no such field */
const fidx = (n: number, k: number) => k === -1 ? n - 1 : k <= n ? k - 1 : -1;

/** column names → positions, looked up in the header (first line); a name that is not a unique header cell resolves to 0 (never matches) */
function resolvePairs(header: string, d: string, pairs: CellDefault[]): CellDefault[] {
  const h = header.split(d);
  return pairs.map(p => {
    if (p.column === undefined) return p;
    const i = h.indexOf(p.column);
    return { ...p, k: i >= 0 && h.indexOf(p.column, i + 1) < 0 ? i + 1 : 0 };
  });
}

/** Apply one rule in the DECODE direction (re-insert). */
export function unfoldRule(text: string, r: Rule): string {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (r.delim === 'space') {
      if (!inScope(line, r.scope, i)) continue;
      const p = splitWs(line);
      const j = fidx(p.f.length, r.k);
      if (j < 0) continue;
      const cur = p.f[j];
      if (excepted(cur, r.except)) continue;
      if (r.form === 'prefix') p.f[j] = r.value + cur;
      else { p.f.splice(j, 0, r.value); p.s.splice(j, 0, r.pad); }
      lines[i] = joinWs(p);
    } else {
      const d = DELIM_CHAR[r.delim];
      const f = line.split(d);
      if (r.form === 'cells') {
        let changed = false;
        for (const p of resolvePairs(lines[0], d, r.pairs ?? [])) if (p.k >= 1 && f.length >= p.k && f[p.k - 1] === '') { f[p.k - 1] = p.value; changed = true; }
        if (changed) lines[i] = f.join(d);
        continue;
      }
      if (f.length < r.k) continue;
      if (!inScope(line, r.scope, i)) continue;
      const cur = f[r.k - 1];
      if (excepted(cur, r.except)) continue;
      if (r.form === 'prefix') f[r.k - 1] = r.value + cur;
      else f.splice(r.k - 1, 0, r.value);
      lines[i] = f.join(d);
    }
  }
  return lines.join('\n');
}

/** Apply one rule in the ENCODE direction; returns the reduced text and how many lines changed, or null if any line is ambiguous. */
export function foldRule(text: string, r: Rule): { text: string; count: number } | null {
  const lines = text.split('\n');
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (r.delim === 'space') {
      if (!inScope(line, r.scope, i)) continue;
      const p = splitWs(line);
      if (r.form === 'prefix') {
        const j = fidx(p.f.length, r.k);
        if (j < 0) continue;
        const cur = p.f[j];
        if (cur.startsWith(r.value) && cur.length > r.value.length) {
          const rest = cur.slice(r.value.length);
          if (excepted(rest, r.except)) return null;   // would be mistaken for a literal line
          p.f[j] = rest; lines[i] = joinWs(p); count++;
        } else if (!excepted(cur, r.except)) return null; // literal line not covered by the exception
      } else {
        if (p.f.length < r.k) continue;
        const run = runLength(r.value);
        if (p.f.length >= r.k + run) {
          let v = p.f[r.k - 1];
          for (let j = 1; j < run; j++) v += p.s[r.k - 2 + j] + p.f[r.k - 1 + j];
          if (v === r.value && p.s[r.k - 2 + run] === r.pad) {
            if (excepted(p.f[r.k - 1 + run], r.except)) return null; // the field that takes its place must not look literal
            p.f.splice(r.k - 1, run); p.s.splice(r.k - 1, run); lines[i] = joinWs(p); count++;
            continue;
          }
        }
        if (!excepted(p.f[r.k - 1], r.except)) return null; // literal line not covered by the exception
      }
    } else {
      const d = DELIM_CHAR[r.delim];
      const f = line.split(d);
      if (r.form === 'cells') {
        let changed = false;
        for (const p of resolvePairs(lines[0], d, r.pairs ?? [])) {
          if (p.k < 1 || f.length < p.k) continue;
          if (f[p.k - 1] === p.value) { f[p.k - 1] = ''; changed = true; count++; }
          else if (f[p.k - 1] === '') return null; // a genuinely empty cell would be filled by the reader
        }
        if (changed) lines[i] = f.join(d);
        continue;
      }
      if (f.length < r.k) continue;
      if (!inScope(line, r.scope, i)) continue;
      const cur = f[r.k - 1];
      if (r.form === 'prefix') {
        if (cur.startsWith(r.value) && cur.length > r.value.length) {
          const rest = cur.slice(r.value.length);
          if (excepted(rest, r.except)) return null;
          f[r.k - 1] = rest; lines[i] = f.join(d); count++;
        } else if (!excepted(cur, r.except)) return null;
      } else {
        if (cur === r.value && f.length > r.k) {
          if (excepted(f[r.k], r.except)) return null;
          f.splice(r.k - 1, 1); lines[i] = f.join(d); count++;
        } else if (!excepted(cur, r.except)) return null;
      }
    }
  }
  return { text: lines.join('\n'), count };
}

/* ---------------------------------------------------------------------------
 * 4. RULE INDUCTION
 * ------------------------------------------------------------------------- */

export interface Candidate { rule: Rule; count: number; sentence: string; sentenceTokens: number; estimate: number }

/**
 * Predicted saving of a rule, in tokens.  MEASURED (bench/z48/receipts/probe-elide*.log, DAEDALUS M before → after):
 *   whole field in an aligned table   ≈ 0.1 / line   dpkg "amd64"+8 spaces ×248: −30; ps aux "?"+8 spaces ×70: −1;
 *                                                   systemctl "loaded active" ×67: +3 (the padding run next to the
 *                                                   constant repeats too, so one glyph already spans both);
 *   empty CSV cell                    ≈ 0 / cell    airport-codes 3 columns ×769 cells: +25 ("," + "," is one token,
 *                                                   exactly what the glyph cost);
 *   path prefix before a word         ≈ 1 / line    ls -l "node_modules/" after the date ×74: −75 (the separator now
 *                                                   merges into the next word: " node" … → " baseline");
 *   path prefix before non-word       ≈ 0 / line    find "node_modules/" before "@babel" ×120: −8.
 * So the only form that reliably pays is a prefix whose remainder starts with a letter; the others are kept at
 * their measured weights and almost never clear their sentence.  The plain arm decides in any case.
 */
let OPTIMISTIC = false; // testing only: every candidate is worth one token per line (exercises all forms)
function estimateFor(rule: Rule, count: number, prev: string[], next: string[]): number {
  if (OPTIMISTIC) return count;
  if (rule.form === 'prefix') {
    const wordy = next.filter(v => /^[A-Za-z]/.test(v)).length / Math.max(1, next.length);
    return count * (0.15 + 0.85 * wordy);
  }
  if (rule.form === 'cells') return count * 0.05;
  const variability = (vals: string[]) => vals.length ? new Set(vals).size / vals.length : 1;
  return count * 0.1 * Math.min(1, variability(prev) + variability(next));
}

const MAX_K = 7;        // field positions the reader is asked to count to
const MAX_RUN = 4;      // consecutive constant fields folded as one value
const MAX_PAD = 24;     // longest padding run spelled as "N spaces"

function scopesFor(lines: string[], elidedIdx: Set<number>): Scope[] {
  const out: Scope[] = [{ kind: 'all' }];
  if (!elidedIdx.has(0)) out.push({ kind: 'afterFirst' });
  // a common first word of the elided lines (e.g. "ii", "tcp", "-rw-r--r--")
  const firsts = new Map<string, number>();
  for (const i of elidedIdx) { const w = splitWs(lines[i]); if (w.lead === '' && w.f.length) firsts.set(w.f[0], (firsts.get(w.f[0]) ?? 0) + 1); }
  const best = [...firsts.entries()].sort((a, b) => b[1] - a[1])[0];
  if (best && best[1] === elidedIdx.size && best[0].length <= 12 && countTokens(best[0], 'o200k_base') <= 3) out.push({ kind: 'first', word: best[0] });
  return out;
}

/** find an exception predicate that separates the literal lines (values `lit`) from the elided remainders (`eli`) */
function separate(lit: string[], eli: string[]): Except | null {
  if (!lit.length) return { kind: 'none' };
  const litSet = new Set(lit), eliSet = new Set(eli);
  if (litSet.size <= 3 && ![...litSet].some(v => eliSet.has(v) || v === '' || v.length > 24)) return { kind: 'is', values: [...litSet] };
  const litDigit = lit.every(v => /^[0-9]/.test(v)), eliDigit = eli.every(v => /^[0-9]/.test(v));
  if (litDigit && eli.every(v => !/^[0-9]/.test(v))) return { kind: 'digit', neg: false };
  if (eliDigit && lit.every(v => !/^[0-9]/.test(v))) return { kind: 'digit', neg: true };
  const chars = new Set(lit.map(v => v[0]).filter(Boolean));
  if (chars.size === 1) { const ch = [...chars][0]; if (!eli.some(v => v.startsWith(ch)) && ch !== '"' && ch !== '\\') return { kind: 'starts', ch }; }
  return null;
}

/** enumerate whitespace-table candidates (whole field runs and field prefixes) */
function wsCandidates(text: string, enc: EncodingName, minLines: number): Candidate[] {
  const lines = text.split('\n');
  const splits = lines.map(splitWs);
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const consider = (rule: Rule, elidedIdx: Set<number>) => {
    if (elidedIdx.size < minLines) return;
    for (const scope of scopesFor(lines, elidedIdx)) {
      const lit: string[] = [], eli: string[] = [];
      let ok = true;
      for (let i = 0; i < lines.length && ok; i++) {
        if (!inScope(lines[i], scope, i)) { if (elidedIdx.has(i)) ok = false; continue; }
        const p = splits[i];
        const j = fidx(p.f.length, rule.k);
        if (j < 0) continue;
        if (elidedIdx.has(i)) eli.push(rule.form === 'prefix' ? p.f[j].slice(rule.value.length) : p.f[j + runLength(rule.value)]);
        else lit.push(p.f[j]);
      }
      if (!ok) continue;
      const except = separate(lit, eli);
      if (!except) continue;
      const r: Rule = { ...rule, scope, except };
      const key = JSON.stringify(r);
      if (seen.has(key)) continue;
      seen.add(key);
      const f = foldRule(text, r);
      if (!f || f.count !== elidedIdx.size || unfoldRule(f.text, r) !== text) continue;
      const sentence = sentenceOf(r);
      if (parseSentence(sentence) === null) continue;
      const prev: string[] = [], next: string[] = [];
      const run = rule.form === 'prefix' ? 0 : runLength(rule.value);
      for (const i of elidedIdx) { const p = splits[i]; const j = fidx(p.f.length, rule.k); prev.push(p.f[j - 1] ?? ''); next.push(rule.form === 'prefix' ? p.f[j].slice(rule.value.length) : p.f[j + run] ?? ''); }
      out.push({ rule: r, count: f.count, sentence, sentenceTokens: countTokens(sentence + ' ', enc), estimate: estimateFor(r, f.count, prev, next) });
      break; // first (simplest) scope that works
    }
  };
  // whole-field runs at positions 2..MAX_K (never the first field, never the last)
  for (let k = 2; k <= MAX_K; k++) {
    for (let run = 1; run <= MAX_RUN; run++) {
      const groups = new Map<string, Set<number>>();
      for (let i = 0; i < lines.length; i++) {
        const p = splits[i];
        if (p.f.length < k + run) continue; // the field after the run must exist (not last)
        let v = p.f[k - 1];
        for (let j = 1; j < run; j++) v += p.s[k - 2 + j] + p.f[k - 1 + j];
        const pad = p.s[k - 2 + run];
        if (!pad || !/^( +|\t+)$/.test(pad) || pad.length > MAX_PAD) continue;
        if (/^[-=+*#|_.]+$/.test(v)) continue; // ruled lines
        const key = v + '\u0000' + pad;
        if (!groups.has(key)) groups.set(key, new Set());
        groups.get(key)!.add(i);
      }
      for (const [key, idx] of groups) {
        if (idx.size < minLines) continue;
        const [v, pad] = key.split('\u0000');
        if (v.includes('"') || v.includes('\\')) continue;
        consider({ form: 'field', delim: 'space', k, value: v, pad, scope: { kind: 'all' }, except: { kind: 'none' } }, idx);
      }
    }
  }
  // field prefixes at positions 2..MAX_K or the last field, ending at '/' (paths) or ':' / '=' (keys)
  for (const k of [-1, 2, 3, 4, 5, 6, 7]) {
    const groups = new Map<string, Set<number>>();
    for (let i = 0; i < lines.length; i++) {
      const p = splits[i];
      const j = fidx(p.f.length, k);
      if (j < 1) continue; // never the first field (free under the newline tax)
      const v = p.f[j];
      for (let j = 1; j < v.length; j++) {
        if (v[j - 1] === '/' || v[j - 1] === ':' || v[j - 1] === '=') {
          const pre = v.slice(0, j);
          if (!groups.has(pre)) groups.set(pre, new Set());
          groups.get(pre)!.add(i);
        }
      }
    }
    // the longest prefix that still covers ≥ 90 % of what the best-covering prefix covers (one sentence, not two)
    const list = [...groups.entries()].filter(([, s]) => s.size >= minLines);
    if (!list.length) continue;
    const top = Math.max(...list.map(([, s]) => s.size));
    list.sort((a, b) => b[0].length - a[0].length || b[1].size - a[1].size);
    const pick = list.find(([, s]) => s.size >= 0.9 * top);
    if (!pick || pick[0].includes('"') || pick[0].includes('\\')) continue;
    consider({ form: 'prefix', delim: 'space', k, value: pick[0], pad: '', scope: { kind: 'all' }, except: { kind: 'none' } }, pick[1]);
  }
  return out;
}

/** enumerate single-character-delimiter candidates: one 'cells' rule per delimiter carrying every column whose default pays */
function cellCandidates(text: string, enc: EncodingName, minLines: number): Candidate[] {
  const lines = text.split('\n');
  const out: Candidate[] = [];
  for (const delim of ['comma', 'semicolon', 'tab'] as const) {
    const d = DELIM_CHAR[delim];
    const rows = lines.map(l => l.split(d));
    if (rows.filter(r => r.length > 1).length < minLines) continue;
    const header = rows[0];
    const widths = rows.slice(1).map(r => r.length);
    const modal = [...widths.reduce((m, w) => m.set(w, (m.get(w) ?? 0) + 1), new Map<number, number>()).entries()].sort((a, b) => b[1] - a[1])[0];
    const hasHeader = !!modal && header.length >= 2 && header.length <= modal[0] && header.every(c => c !== '' && !/^[-+]?\d/.test(c) && !c.includes('"') && !c.includes('\\')) && new Set(header).size === header.length;
    const maxK = Math.min(MAX_K + 9, Math.max(...rows.map(r => r.length)));
    const pairs: CellDefault[] = [];
    let total = 0, estimate = 0;
    for (let k = 1; k <= maxK; k++) {
      const counts = new Map<string, number>();
      let empties = 0;
      for (const r of rows) { if (r.length < k) continue; const v = r[k - 1]; if (v === '') empties++; else counts.set(v, (counts.get(v) ?? 0) + 1); }
      if (empties) continue;
      const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
      if (!best || best[1] < minLines || best[0].includes('"') || best[0].includes('\\') || best[0].length > 40 || /^[ \t]+$/.test(best[0])) continue;
      if (hasHeader && best[0] === header[k - 1]) continue;
      // a quote before this column could hide a delimiter: the reader would count cells differently from this decoder
      if (rows.some(r => r.slice(0, k - 1).some(c => c.includes('"')))) continue;
      if (hasHeader && k > header.length) continue;
      const hit = rows.filter(r => r.length > k - 1 && r[k - 1] === best[0]);
      const est = estimateFor({ form: 'cells', delim, k, value: best[0], pad: '', scope: { kind: 'all' }, except: { kind: 'none' } }, best[1], hit.map(r => r[k - 2] ?? ''), hit.map(r => r[k] ?? ''));
      const pairTokens = countTokens(`, ${hasHeader ? q(header[k - 1]) : `${ordinal(k)} column`} = ${q(best[0])}`, enc);
      if (est <= pairTokens) continue;
      pairs.push(hasHeader ? { k, column: header[k - 1], value: best[0] } : { k, value: best[0] });
      total += best[1]; estimate += est;
    }
    if (!pairs.length) continue;
    const rule: Rule = { form: 'cells', delim, k: 0, value: '', pad: '', scope: { kind: 'all' }, except: { kind: 'none' }, pairs };
    const f = foldRule(text, rule);
    if (!f || f.count !== total || unfoldRule(f.text, rule) !== text) continue;
    const sentence = sentenceOf(rule);
    const back = parseSentence(sentence);
    if (!back || ruleKey(back) !== ruleKey(rule)) continue;
    out.push({ rule, count: f.count, sentence, sentenceTokens: countTokens(sentence + ' ', enc), estimate });
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * 5. ENCODER
 * ------------------------------------------------------------------------- */

export interface ElleipsisResult extends DaedalusResult {
  codec2: 'elleipsis';
  applied: boolean;
  rules: Rule[];
  sentences: string[];
  elidedLines: number;
  clauseTokens: number;
  plainMessageTokens: number;
}

export interface ElleipsisOptions extends DaedalusOptions {
  /** a rule must elide at least this many lines before it is considered */
  minLines?: number;
  /** at most this many rules */
  maxRules?: number;
  /** testing only: keep the composed wire even when the plain arm is not worse (the round trip must still be exact) */
  force?: boolean;
  /** testing only: rate every candidate at one token per line so that all rule forms get exercised */
  optimistic?: boolean;
}

function plainResult(plain: DaedalusResult, started: number, note: string): ElleipsisResult {
  return {
    ...plain, codec2: 'elleipsis', applied: false, rules: [], sentences: [], elidedLines: 0, clauseTokens: 0,
    plainMessageTokens: plain.messageTokens, ms: Date.now() - started, notes: `elleipsis: not applied (${note}); ${plain.notes}`,
  };
}

/** Choose up to maxRules rules greedily by elided-line count, each re-induced on the text reduced by the previous ones. */
export function induceRules(text: string, enc: EncodingName, minLines: number, maxRules: number, optimistic = false): { rules: Rule[]; counts: number[]; reduced: string } {
  OPTIMISTIC = optimistic;
  const rules: Rule[] = [], counts: number[] = [];
  let reduced = text;
  for (let n = 0; n < maxRules; n++) {
    const cands = [...wsCandidates(reduced, enc, minLines), ...cellCandidates(reduced, enc, minLines)];
    // a rule is worth ~1 token per elided line (the glyph) and costs its sentence; rank by the margin
    const ranked = cands.map(c => ({ c, margin: c.estimate - c.sentenceTokens })).filter(x => x.margin > 0)
      .sort((a, b) => b.margin - a.margin || a.c.sentenceTokens - b.c.sentenceTokens || a.c.rule.k - b.c.rule.k);
    if (!ranked.length) break;
    const pick = ranked[0].c;
    const f = foldRule(reduced, pick.rule);
    if (!f) break;
    rules.push(pick.rule); counts.push(f.count); reduced = f.text;
  }
  return { rules, counts, reduced };
}

export function elleipsisEncode(text: string, enc: EncodingName = 'o200k_base', options: ElleipsisOptions = {}): ElleipsisResult {
  const started = Date.now();
  const { minLines = 24, maxRules = 3, force = false, optimistic = false, ...dopts } = options;
  OPTIMISTIC = optimistic;
  const inTokens = countTokens(text, enc);
  if (text.startsWith(ELLEIPSIS_MARK) || text.includes('\r')) return plainResult(daedalusEncode(text, enc, dopts), started, text.includes('\r') ? 'CR in payload' : 'payload starts with the rule mark');

  const { rules, counts, reduced } = induceRules(text, enc, minLines, maxRules, optimistic);
  if (!rules.length) return plainResult(daedalusEncode(text, enc, dopts), started, 'no positionally fixed constant field pays for its sentence');

  // sentences are written in DECODE order: the last rule applied is undone first
  const decodeOrder = [...rules].reverse();
  const sentences = decodeOrder.map(sentenceOf);
  const clause = ELLEIPSIS_MARK + sentences.join(' ');
  const parsed = rulesOf(clause);
  if (!parsed || parsed.map(ruleKey).join('\n') !== decodeOrder.map(ruleKey).join('\n')) return plainResult(daedalusEncode(text, enc, dopts), started, 'sentence does not carry its parameters');
  const clauseTokens = countTokens(clause + '\n', enc);

  const inner = daedalusEncode(reduced, enc, dopts);
  const wire = clause + '\n' + inner.wire;
  const decoderPrompt = clause + '\n' + inner.decoderPrompt;
  const decoded = elleipsisDecode(wire);
  const exact = decoded === text;
  const messageTokens = countTokens(decoderPrompt, enc);
  const outTokens = countTokens(wire, enc);
  const plain = daedalusEncode(text, enc, dopts); // the plain arm always runs: prediction is a pre-filter, not a proof
  if (!exact || (messageTokens >= plain.messageTokens && !force)) {
    return plainResult(plain, started, !exact ? 'composed wire failed the round trip' : `composed M ${messageTokens} >= plain M ${plain.messageTokens}`);
  }
  const elidedLines = counts.reduce((a, b) => a + b, 0);
  return {
    ...inner, codec2: 'elleipsis', wire, decoded, exact, inTokens, outTokens, messageTokens,
    contractTokens: messageTokens - outTokens + clauseTokens, decoderPrompt,
    savingsPct: inTokens ? (1 - messageTokens / inTokens) * 100 : 0,
    applied: true, rules: decodeOrder, sentences, elidedLines, clauseTokens, plainMessageTokens: plain.messageTokens,
    ms: Date.now() - started,
    notes: `elleipsis: ${rules.map((r, i) => `${r.form}@${r.k}[${JSON.stringify(r.value)}${r.pad ? '+' + padPhrase(r.pad) : ''}]×${counts[i]}`).join(' + ')}; sentence ${clauseTokens} tok; M ${messageTokens} vs plain ${plain.messageTokens}; ${inner.notes}`,
  };
}

/* ---------------------------------------------------------------------------
 * 6. DECODER / PROMPT
 * ------------------------------------------------------------------------- */

function splitWire(wire: string): { clause: string; inner: string } | null {
  if (!wire.startsWith(ELLEIPSIS_MARK)) return null;
  const k = wire.indexOf('\n');
  return { clause: k < 0 ? wire : wire.slice(0, k), inner: k < 0 ? '' : wire.slice(k + 1) };
}

export function elleipsisDecode(wire: string): string {
  const s = splitWire(wire);
  if (!s) return daedalusDecode(wire);
  const rules = rulesOf(s.clause);
  if (!rules) return daedalusDecode(wire);
  let text = daedalusDecode(s.inner);
  for (const r of rules) text = unfoldRule(text, r);
  return text;
}

export function elleipsisDecoderPrompt(wire: string): string {
  const s = splitWire(wire);
  const innerPrompt = (inner: string) => daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
  if (!s) return innerPrompt(wire);
  return s.clause + '\n' + innerPrompt(s.inner);
}
