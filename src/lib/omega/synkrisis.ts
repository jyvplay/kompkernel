/**
 * SYNKRISIS (σύγκρισις, “comparison”) — X45.
 * =============================================================================
 * Two exact, reader-native folds, selected by a live one-chat gate:
 *
 * 1. WORD-CANON: align a near-canonical public text as a whitespace-invariant
 *    word stream, emit unique phrase substitutions, then emit a compact layout
 *    side-stream (words per line + sparse indentation). This is a different
 *    delta axis from ARCHETYPON's line LCS: rewrapping does not create lexical
 *    edits, and line-internal substitutions do not force whole-line literals.
 * 2. MULTI-COPY: when several exact canonical blocks share one standard text
 *    and differ only in a declared hole, send the hole values once as a list,
 *    plus the literal separator. This specifically makes a six-MIT notice
 *    bundle cheaper than one ANAGNORISIS reference per copy.
 *
 * Both candidates are complete single-chat messages. Their decoder contracts
 * are in-band; the canonical texts are public and named by SPDX / common title.
 * The code-side catalogue is used to prove exactness and measure cost, not
 * transmitted as a private decoder table. The output is accepted only when its
 * own reader returns the original bytes and its measured M is strictly below
 * ARCHETYPON's prior-best identity result. Thus the new codec cannot make any
 * lane worse than the current shipped X44 floor.
 *
 * WORD-CANON refuses mixed EOLs, tabs, trailing spaces, or repeated internal
 * spaces in the folded region. These are not silently normalized: the exact
 * original remains the identity result. The implementation is intentionally
 * bounded to short public texts (≤40k source chars, ≤800 template/source words,
 * ≤12 LCS hunks); long legal texts are out of scope for this arm.
 *
 * Greedy? No. Template anchors and the two arms are enumerated; LCS edits are
 * converted to unique phrase substitutions, re-applied, and rejected if they
 * do not produce the exact target word stream. The final arm is the exact
 * minimum of measured candidates and the prior-best floor.
 *
 * CPU/time: no wall-clock deadline is consulted. Template matching is bounded
 * by 50 public text entries (57 catalogue entries total) and at most 800×800
 * LCS cells per anchored candidate; the dominant cost is the inherited
 * ARCHETYPON/APOGRAPHE frontier gate.
 */

import { countTokens, type EncodingName } from './bpe';
import { CANON, CANON_SLOT, type CanonEntry } from './canon-catalog';
import { ARCHETYPON_CATALOGUE, archetyponEncode } from './archetypon';

const WORD_MARKER = 'SYNKRISIS/WORD\n';
const MAX_TEXT = 40_000;
const MAX_MESSAGE = 100_000;
const MAX_WORDS = 800;
const MAX_HUNKS = 12;
const MAX_CHANGED_WORDS = 32;
const MAX_REPEAT_COPIES = 25;
const MAX_REPEAT_VALUE_CHARS = 2_048;

export const SYNKRISIS_WORD_CONTRACT =
  'For JSON below, start from the standard body named by id, collapse it to single-space words, and apply each [old,new] phrase replacement once. Consume layout as words per line (0=blank); indent is [1-based line, spaces]. Join with eol, append it iff final, then wrap with prefix and suffix. JSON strings are literal.';

export const SYNKRISIS_REPEAT_CONTRACT =
  'Repeat standard MIT once per following value; set line 3 to "Copyright (c) " plus that value. Join copies with "\\n\\n-----\\n\\n"; finish with LF.';

export interface SynkrisisWordPayload {
  id: string;
  prefix: string;
  edits: [string, string][];
  layout: number[];
  indents: [number, number][];
  eol: '\n' | '\r\n';
  final: boolean;
  suffix: string;
}

interface SynkrisisRepeatPayload { values: string[] }

export interface SynkrisisResult {
  wire: string;
  contract: string;
  message: string;
  decoded: string;
  messageTokens: number;
  inTokens: number;
  parentTokens: number;
  applied: boolean;
  arm: 'identity' | 'word-canon' | 'multi-copy';
  notes: string;
  ms: number;
}

interface Hunk { at: number; del: number; put: string[] }
interface WordCandidate {
  payload: SynkrisisWordPayload;
  wire: string;
  message: string;
  decoded: string;
  messageTokens: number;
  edits: number;
  templateWords: number;
  sourceWords: number;
}
interface RepeatCandidate {
  payload: SynkrisisRepeatPayload;
  wire: string;
  message: string;
  decoded: string;
  messageTokens: number;
}

function detectEol(text: string): '\n' | '\r\n' | null {
  const hits = text.match(/\r\n|\n|\r/g) ?? [];
  if (hits.some(x => x === '\r')) return null;
  const kinds = new Set(hits);
  if (kinds.size > 1) return null;
  return hits[0] === '\r\n' ? '\r\n' : '\n';
}

function fillDefaults(entry: CanonEntry): string | null {
  const matches = entry.body.match(new RegExp(CANON_SLOT, 'g')) ?? [];
  if (matches.length !== entry.slots) return null;
  if (!matches.length) return entry.body;
  if (!entry.defaults || entry.defaults.length !== matches.length) return null;
  let i = 0;
  return entry.body.replace(new RegExp(CANON_SLOT, 'g'), () => entry.defaults![i++]);
}

function splitWords(s: string): string[] {
  return s.trim().split(/\s+/).filter(Boolean);
}

function equalWords(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** LCS backtrack. All edit positions refer to the original canonical word list. */
function wordHunks(a: string[], b: string[]): Hunk[] | null {
  if (a.length > MAX_WORDS || b.length > MAX_WORDS) return null;
  const n = a.length, m = b.length, cols = m + 1;
  const dp = new Uint16Array((n + 1) * (m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const k = i * cols + j;
      dp[k] = a[i] === b[j]
        ? dp[(i + 1) * cols + j + 1] + 1
        : Math.max(dp[(i + 1) * cols + j], dp[i * cols + j + 1]);
    }
  }
  const hunks: Hunk[] = [];
  let i = 0, j = 0, h: Hunk | null = null;
  const close = () => { if (h) { hunks.push(h); h = null; } };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { close(); i++; j++; continue; }
    if (!h) h = { at: i, del: 0, put: [] };
    const canInsert = j < m && (i === n || dp[i * cols + j + 1] > dp[(i + 1) * cols + j]);
    if (canInsert) h.put.push(b[j++]);
    else if (i < n) { h.del++; i++; }
    else h.put.push(b[j++]);
  }
  close();
  return hunks;
}

function sequenceCount(haystack: readonly string[], needle: readonly string[]): number {
  if (!needle.length || needle.length > haystack.length) return 0;
  let n = 0;
  for (let i = 0; i + needle.length <= haystack.length; i++) {
    if (needle.every((v, j) => haystack[i + j] === v)) n++;
  }
  return n;
}

/** Find short, unique, human-readable old→new phrases for the LCS hunks. */
function phraseEdits(base: string[], target: string[], hunks: Hunk[]): [string, string][] | null {
  if (hunks.length > MAX_HUNKS) return null;
  const edits: [string, string][] = [];
  for (const h of hunks) {
    let chosen: [string, string] | null = null;
    for (let context = 0; context <= 10; context++) {
      const left = Math.max(0, h.at - context);
      const right = Math.min(base.length, h.at + h.del + context);
      const oldWords = base.slice(left, right);
      if (!oldWords.length || sequenceCount(base, oldWords) !== 1) continue;
      const newWords = [
        ...base.slice(left, h.at),
        ...h.put,
        ...base.slice(h.at + h.del, right),
      ];
      chosen = [oldWords.join(' '), newWords.join(' ')];
      break;
    }
    if (!chosen) return null;
    edits.push(chosen);
  }
  const rebuilt = applyPhraseEdits(base, edits);
  return rebuilt && equalWords(rebuilt, target) ? edits : null;
}

function applyPhraseEdits(base: string[], edits: readonly [string, string][]): string[] | null {
  let words = [...base];
  for (const [oldText, newText] of edits) {
    const oldWords = splitWords(oldText);
    const newWords = newText === '' ? [] : splitWords(newText);
    let found = -1, matches = 0;
    for (let i = 0; i + oldWords.length <= words.length; i++) {
      if (oldWords.every((w, j) => words[i + j] === w)) { found = i; matches++; }
    }
    if (matches !== 1) return null;
    words.splice(found, oldWords.length, ...newWords);
  }
  return words;
}

function parseWordRegion(text: string, eol: '\n' | '\r\n', anchorWords: string[]): {
  prefix: string; lines: string[]; words: string[]; layout: number[]; indents: [number, number][];
  start: number; final: boolean;
} | null {
  const allLines = text.split(eol);
  const final = text.endsWith(eol);
  if (final) allLines.pop();
  let offset = 0;
  for (let lineNo = 0; lineNo < allLines.length; lineNo++) {
    const line = allLines[lineNo];
    const leading = /^( *)/.exec(line)![0].length;
    const content = line.slice(leading);
    const lineWords = content ? content.split(/\s+/) : [];
    const anchorLen = Math.min(3, anchorWords.length);
    if (lineWords.length >= anchorLen && anchorWords.slice(0, anchorLen).every((w, i) => lineWords[i] === w)) {
      const start = offset;
      const regionLines = allLines.slice(lineNo);
      const layout: number[] = [];
      const indents: [number, number][] = [];
      const words: string[] = [];
      for (let i = 0; i < regionLines.length; i++) {
        const raw = regionLines[i];
        const indent = /^( *)/.exec(raw)![0].length;
        const body = raw.slice(indent);
        if (body.includes('\t') || / {2,}/.test(body) || body.endsWith(' ')) return null;
        if (!body) { layout.push(0); continue; }
        const row = body.split(' ');
        if (row.some(x => x.length === 0)) return null;
        layout.push(row.length);
        if (indent) indents.push([i + 1, indent]);
        words.push(...row);
      }
      return { prefix: text.slice(0, start), lines: regionLines, words, layout, indents, start, final };
    }
    offset += line.length + eol.length;
  }
  return null;
}

function wordCandidate(text: string, enc: EncodingName): WordCandidate[] {
  if (!text || text.length > MAX_TEXT) return [];
  const eol = detectEol(text);
  if (!eol) return [];
  const out: WordCandidate[] = [];
  for (const entry of CANON) {
    if (entry.kind !== 'text') continue;
    const filled = fillDefaults(entry);
    if (!filled) continue;
    const baseWords = splitWords(filled);
    if (baseWords.length < 30 || baseWords.length > MAX_WORDS) continue;
    const region = parseWordRegion(text, eol, baseWords.slice(0, 3));
    if (!region || region.words.length > MAX_WORDS) continue;
    const hunks = wordHunks(baseWords, region.words);
    if (!hunks || !hunks.length || hunks.length > MAX_HUNKS) continue;
    const changed = hunks.reduce((sum, h) => sum + h.del + h.put.length, 0);
    if (changed > MAX_CHANGED_WORDS) continue;
    const edits = phraseEdits(baseWords, region.words, hunks);
    if (!edits) continue;
    const payload: SynkrisisWordPayload = {
      id: entry.id,
      prefix: region.prefix,
      edits,
      layout: region.layout,
      indents: region.indents,
      eol,
      final: region.final,
      suffix: '',
    };
    const decoded = decodeWordPayload(payload);
    if (decoded !== text) continue;
    const wire = WORD_MARKER + JSON.stringify(payload);
    const message = SYNKRISIS_WORD_CONTRACT + '\n' + wire;
    out.push({ payload, wire, message, decoded, messageTokens: countTokens(message, enc), edits: edits.length,
      templateWords: baseWords.length, sourceWords: region.words.length });
  }
  return out;
}

function decodeWordPayload(payload: SynkrisisWordPayload): string | null {
  const entry = CANON.find(e => e.id === payload.id && e.kind === 'text');
  if (!entry || (payload.eol !== '\n' && payload.eol !== '\r\n') ||
      typeof payload.prefix !== 'string' || typeof payload.suffix !== 'string' || typeof payload.final !== 'boolean') return null;
  if (!Array.isArray(payload.edits) || payload.edits.length > MAX_HUNKS ||
      payload.edits.some(e => !Array.isArray(e) || e.length !== 2 || e.some(x => typeof x !== 'string')) ||
      !Array.isArray(payload.layout) || payload.layout.length > MAX_WORDS ||
      !Array.isArray(payload.indents) || payload.indents.length > MAX_WORDS ||
      payload.prefix.length + payload.suffix.length > MAX_TEXT ||
      payload.edits.some(([oldText, newText]) => oldText.length > MAX_TEXT || newText.length > MAX_TEXT)) return null;
  const filled = fillDefaults(entry);
  if (!filled) return null;
  const words = applyPhraseEdits(splitWords(filled), payload.edits);
  if (!words || words.length > MAX_WORDS ||
      payload.layout.some(n => !Number.isInteger(n) || n < 0 || n > MAX_WORDS)) return null;
  const indentByLine = new Map<number, number>();
  for (const [line, spaces] of payload.indents) {
    if (!Number.isInteger(line) || line < 1 || line > payload.layout.length ||
        !Number.isInteger(spaces) || spaces < 1 || spaces > MAX_TEXT ||
        payload.layout[line - 1] === 0 || indentByLine.has(line)) return null;
    indentByLine.set(line, spaces);
  }
  const total = payload.layout.reduce((a, b) => a + b, 0);
  if (total !== words.length) return null;
  let outputChars = payload.prefix.length + payload.suffix.length +
    Math.max(0, payload.layout.length - 1) * payload.eol.length + (payload.final ? payload.eol.length : 0);
  let wordAt = 0;
  for (let i = 0; i < payload.layout.length; i++) {
    const n = payload.layout[i];
    if (n > 0) {
      outputChars += (indentByLine.get(i + 1) ?? 0) + n - 1;
      for (let j = 0; j < n; j++) outputChars += words[wordAt + j].length;
    }
    wordAt += n;
    if (outputChars > MAX_TEXT) return null;
  }
  const lines: string[] = [];
  let at = 0;
  for (let i = 0; i < payload.layout.length; i++) {
    const n = payload.layout[i];
    const row = words.slice(at, at + n);
    at += n;
    lines.push(n === 0 ? '' : ' '.repeat(indentByLine.get(i + 1) ?? 0) + row.join(' '));
  }
  const body = lines.join(payload.eol) + (payload.final ? payload.eol : '');
  return payload.prefix + body + payload.suffix;
}

function repeatCandidate(text: string, enc: EncodingName): RepeatCandidate[] {
  if (!text || text.length > MAX_TEXT || !text.endsWith('\n')) return [];
  const mit = ARCHETYPON_CATALOGUE.find(e => e.key === 'MIT');
  if (!mit || mit.holes.length !== 1 || mit.holes[0] !== 3) return [];
  const core = text.slice(0, -1);
  const sep = '\n\n-----\n\n';
  const chunks = core.split(sep);
  if (chunks.length < 3 || chunks.length > MAX_REPEAT_COPIES) return [];
  const values: string[] = [];
  for (const chunk of chunks) {
    const lines = chunk.split('\n');
    if (lines.length !== mit.lines.length || !lines[2].startsWith('Copyright (c) ')) return [];
    for (let i = 0; i < lines.length; i++) {
      if (i !== 2 && lines[i] !== mit.lines[i]) return [];
    }
    values.push(lines[2].slice('Copyright (c) '.length));
  }
  const payload: SynkrisisRepeatPayload = { values };
  const decoded = decodeRepeatPayload(payload);
  if (decoded !== text) return [];
  const wire = values.join('\n');
  const message = SYNKRISIS_REPEAT_CONTRACT + '\n' + wire;
  return [{ payload, wire, message, decoded, messageTokens: countTokens(message, enc) }];
}

function decodeRepeatPayload(payload: SynkrisisRepeatPayload): string | null {
  const entry = ARCHETYPON_CATALOGUE.find(e => e.key === 'MIT');
  if (!entry || entry.holes.length !== 1 || entry.holes[0] !== 3 || payload.values.length < 3 ||
      payload.values.length > MAX_REPEAT_COPIES ||
      payload.values.some(v => !v || v.length > MAX_REPEAT_VALUE_CHARS || v.includes('\n') || v.includes('\r'))) return null;
  const blocks = payload.values.map(value => {
    const lines = [...entry.lines];
    lines[2] = 'Copyright (c) ' + value;
    return lines.join('\n');
  });
  return blocks.join('\n\n-----\n\n') + '\n';
}

/** Decode a complete SYNKRISIS message. Non-SYNKRISIS input is returned unchanged. */
export function synkrisisDecode(message: string): string {
  if (message.length > MAX_MESSAGE) return message;
  try {
    const w = message.indexOf(WORD_MARKER);
    if (w >= 0) {
      const payload = JSON.parse(message.slice(w + WORD_MARKER.length)) as SynkrisisWordPayload;
      return decodeWordPayload(payload) ?? message;
    }
    const repeatPrefix = SYNKRISIS_REPEAT_CONTRACT + '\n';
    if (message.startsWith(repeatPrefix)) {
      const values = message.slice(repeatPrefix.length).split('\n');
      return decodeRepeatPayload({ values }) ?? message;
    }
  } catch { /* malformed message: fail closed */ }
  return message;
}

export function synkrisisEncode(text: string, enc: EncodingName = 'o200k_base'): SynkrisisResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const floor: any = archetyponEncode(text, enc);
  const floorMessage: string = floor.message ?? ((floor.contract ? floor.contract + '\n' : '') + (floor.wire ?? text));
  let best: SynkrisisResult = {
    wire: floor.wire ?? text,
    contract: floor.contract ?? '',
    message: floorMessage,
    decoded: floor.decoded === text ? text : synkrisisDecode(floorMessage),
    messageTokens: Number.isFinite(floor.messageTokens) ? floor.messageTokens : countTokens(floorMessage, enc),
    inTokens,
    parentTokens: Number.isFinite(floor.messageTokens) ? floor.messageTokens : countTokens(floorMessage, enc),
    applied: false,
    arm: 'identity',
    notes: `identity (ARCHETYPON prior-best; M=${floor.messageTokens ?? countTokens(floorMessage, enc)})`,
    ms: Date.now() - t0,
  };
  // The parent must itself be a byte-exact candidate; otherwise pass through.
  if (best.decoded !== text) {
    const message = text;
    best = { ...best, wire: text, contract: '', message, decoded: text,
      messageTokens: inTokens, parentTokens: inTokens, notes: 'identity (parent failed exactness; raw fallback)' };
  }

  const candidates: (WordCandidate | RepeatCandidate)[] = [];
  try { candidates.push(...wordCandidate(text, enc)); } catch { /* fail closed */ }
  try { candidates.push(...repeatCandidate(text, enc)); } catch { /* fail closed */ }
  candidates.sort((a, b) => a.messageTokens - b.messageTokens);
  for (const c of candidates) {
    if (c.decoded !== text || c.messageTokens >= best.messageTokens) continue;
    const back = synkrisisDecode(c.message);
    if (back !== text) continue;
    const isWord = 'payload' in c && 'layout' in c.payload;
    const contract = isWord ? SYNKRISIS_WORD_CONTRACT : SYNKRISIS_REPEAT_CONTRACT;
    best = {
      wire: c.wire,
      contract,
      message: c.message,
      decoded: back,
      messageTokens: countTokens(c.message, enc),
      inTokens,
      parentTokens: Number.isFinite(floor.messageTokens) ? floor.messageTokens : inTokens,
      applied: true,
      arm: isWord ? 'word-canon' : 'multi-copy',
      notes: isWord
        ? `word-canon id=${(c as WordCandidate).payload.id} edits=${(c as WordCandidate).edits} words=${(c as WordCandidate).templateWords}->${(c as WordCandidate).sourceWords}; M=${c.messageTokens} < prior-best ${best.messageTokens}`
        : `multi-copy id=MIT copies=${(c as RepeatCandidate).payload.values.length}; M=${c.messageTokens} < prior-best ${best.messageTokens}`,
      ms: Date.now() - t0,
    };
  }
  best.ms = Date.now() - t0;
  return best;
}

/** Small deterministic red-team suite for the exact decoder and gate. */
export function synkrisisSelfTests(enc: EncodingName = 'o200k_base') {
  const checks: { name: string; pass: boolean; detail: string }[] = [];
  const run = (name: string, text: string) => {
    try {
      const r = synkrisisEncode(text, enc);
      const back = r.arm === 'identity' ? r.decoded : synkrisisDecode(r.message);
      checks.push({ name, pass: back === text && r.decoded === text && r.messageTokens <= r.parentTokens,
        detail: `${r.arm} M=${r.messageTokens} parent=${r.parentTokens} exact=${back === text}` });
    } catch (e) {
      checks.push({ name, pass: false, detail: String(e) });
    }
  };
  run('generic prose identity', 'A short paragraph with no public canonical text.');
  return checks;
}
