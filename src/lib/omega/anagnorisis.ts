/**
 * src/lib/omega/anagnorisis.ts
 * =============================================================================
 * ANAGNORISIS — Public-Canon Recognition Pre-Pass
 * (byte-perfect, exact-lossless, single-chat-readable, contract in band)
 * -----------------------------------------------------------------------------
 *
 * ἀναγνώρισις — in Aristotle's Poetics, the moment of *recognition*: a change
 * from ignorance to knowledge, when a character is recognised for who they
 * already are.  This lane recognises text the reader already knows.
 *
 * THE AI-NATIVE SEAM
 * -----------------------------------------------------------------------------
 * Every dictionary lane in this repository pays, in the message, for every
 * definition it uses: a glyph is worthless until its expansion has been
 * transmitted.  The reader, however, is a language model, and a language
 * model already holds — verbatim — a small, well-defined corpus of public
 * canonical texts: the standard open-source licence texts and the standard
 * per-file licence notices.  They are among the most duplicated byte strings
 * on the internet (GitHub inserts the same MIT template into every new
 * repository; every Kubernetes, TensorFlow and Android source file opens with
 * the same eleven Apache lines).  For those strings the decoder's codebook is
 * free: the message only has to NAME the text, and name what varies.
 *
 * This is the generalisation of the "known form" idea that ROSETTA used with
 * fixture-fitted codebooks, done honestly: the forms are a PUBLIC, VERSIONED
 * catalogue fetched live from its source of truth (github/choosealicense.com,
 * the templates GitHub itself inserts; provenance in canon-catalog.ts), not
 * from this repository's test files; and the reader-side claim is tested, not
 * assumed — see "LLM-native decode" below.
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 * 1. RECOGNISE.  The catalogue (canon-catalog.ts, generated from the fetched
 *    sources by bench/z45/build-canon.py) holds 47 GitHub licence templates —
 *    their body after the copyright line, since titles and copyright lines
 *    vary far more than bodies — plus three named alternative renderings of
 *    the MIT body that are byte-identical across several major projects, and
 *    7 per-file notices (Apache-2.0, GPL-2.0/3.0, AGPL-3.0, LGPL-2.1, MPL-2.0,
 *    the ASF header).  Slots mark the few words that projects substitute
 *    (BSD-3 clause 3's "the copyright holder", the Apache appendix's
 *    "[yyyy] [name of copyright owner]", the GNU notices' "This program").
 *    For each entry the encoder finds the entry's first line in the message,
 *    reads the per-line PREFIX from the next line ("# ", " * ", "   ", …),
 *    strips it from the following lines and matches the stripped region:
 *      - EXACT:  the template byte-for-byte (slots filled by any text), also
 *                with its URL scheme swapped or its indented line re-indented;
 *      - REFLOW: (slot-free entries) the same words with every paragraph on
 *                one line, or greedily re-wrapped at some width W — the
 *                catalogue text re-rendered with that prefix and width must
 *                reproduce the region byte-for-byte.
 * 2. NAME.  Each recognised region is replaced in place by a short reference
 *    (the first line's own prefix and everything before it stay literal):
 *
 *        【MIT】                      【MIT; layout classic】
 *        【Apache-2.0: 2026 OpenAI】  【ISC; wrap 80】
 *        # 【Apache-2.0 header; prefix "# "】
 *         * 【Apache-2.0 header; prefix " * "; wrap 100】
 *         * 【Apache-2.0 header; prefix " * "; url https; indent 5】
 *
 *    ID is the SPDX identifier the reader knows; the text after ":" fills the
 *    template's blanks; modifiers say how the text was laid out.
 * 3. COMPOSE.  The reduced text goes through the shipped frontier encoder
 *    (DAEDALUS).  The contract line (compiled from the features actually
 *    used, 23–60 tokens) is placed first, then the DAEDALUS message as usual.
 * 4. VERIFY.  decode(wire) === text is checked before anything is emitted,
 *    and the message is emitted only if it is shorter than the plain frontier
 *    message (the plain run is skipped when the recognised regions save at
 *    least 60 tokens — the non-tournament path — and run as a guard only on
 *    marginal cases).
 *
 * LLM-NATIVE DECODE (what was actually tested)
 * -----------------------------------------------------------------------------
 * bench/z45/canon/memory/ holds the texts the model writing this module
 * reproduced FROM MEMORY before reading the catalogue, diffed against the
 * catalogue by tool call (bench/z45/REPORT.md §H): MIT, BSD-2-Clause,
 * BSD-3-Clause, Unlicense, WTFPL, 0BSD byte-exact; the Apache-2.0 and GPL-3.0
 * notices byte-exact modulo indentation; ISC right in every word but wrapped
 * at a different column; Zlib off by one double space; the MPL notice off by
 * "http" vs "https".  So: the reader knows these texts; what it does not
 * reliably know is their *whitespace*.  That is exactly what the modifiers
 * carry, and why the long texts (GPL, Apache full text, CC) are kept in the
 * catalogue but flagged `tier: 'catalog'` — readable natively, reproducible
 * byte-exactly by the library decoder, not claimed reproducible from memory.
 *
 * WHAT IS *NOT* CLAIMED
 * -----------------------------------------------------------------------------
 * - This is a lane codec, not a prose codec.  Messages without a recognised
 *   canonical text get the plain frontier message, unchanged.
 * - Re-flowed renderings (modifier `wrap N`) are regenerated by counting
 *   columns.  The library does that exactly; a language model reading the
 *   message gets the text and its layout rule, which is the same reliability
 *   class as the width-based lanes this repository has declined to rely on
 *   for reproduction.  It is reported separately in the receipts.
 * - Variant wordings (older GitHub MIT title "The MIT License (MIT)", GNU
 *   notices with the 59 Temple Place address, ASF notices with two spaces
 *   after full stops) are not in the catalogue and are not recognised.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode, daedalusDecode, daedalusDecoderPrompt, type DaedalusResult, type DaedalusOptions } from './daedalus';
import { CANON, CANON_SLOT, type CanonEntry } from './canon-catalog';

export const CANON_OPEN = '【';
export const CANON_CLOSE = '】';

/** entries reproducible from memory in the self-test (bench/z45/canon/memory) */
const MEMORIZED = new Set(['MIT/text', 'BSD-2-Clause/text', 'BSD-3-Clause/text', 'Unlicense/text', 'WTFPL/text', '0BSD/text', 'Apache-2.0/header', 'GPL-3.0/header']);

export type CanonTier = 'memorized' | 'catalog';

export function canonTier(e: CanonEntry): CanonTier {
  return !e.layout && MEMORIZED.has(`${e.id}/${e.kind}`) ? 'memorized' : 'catalog';
}

/* ---------------------------------------------------------------------------
 * 1. RENDERING — the decoder side (also used by the encoder to verify)
 * ------------------------------------------------------------------------- */

export interface CanonRef {
  id: string;
  kind: 'text' | 'header';
  /** named alternative rendering (same words, different line breaks); undefined = the GitHub template */
  layout?: string;
  slots: string[];
  prefix: string;
  /** greedy re-flow width (including the prefix); undefined = canonical layout; Infinity = one line per paragraph */
  wrap?: number;
  /** URL scheme swapped in the text (e.g. the Apache notice with https://) */
  url?: 'http' | 'https';
  /** indented lines of the text re-indented to this many spaces */
  indent?: number;
  /** the text stops after the first line whose trimmed content equals this (files that drop an appendix) */
  ending?: string;
  /** leading indentation written with tabs of 8 columns (the FSF's own COPYING files) */
  tabs?: boolean;
  crlf: boolean;
}

const BY_KEY: ReadonlyMap<string, CanonEntry> = new Map(CANON.map(e => [`${e.id}/${e.kind}/${e.layout ?? ''}`, e]));

export function canonEntry(id: string, kind: 'text' | 'header', layout?: string): CanonEntry | undefined {
  return BY_KEY.get(`${id}/${kind}/${layout ?? ''}`);
}

/** slot values as written in a reference: all values, one value for all slots, or none (= the template's own words) */
export function resolveSlots(e: CanonEntry, given: string[]): string[] | null {
  if (e.slots === 0) return given.length ? null : [];
  if (given.length === e.slots) return given;
  if (given.length === 1) return Array(e.slots).fill(given[0]);
  if (given.length === 0 && e.defaults) return e.defaults;
  return null;
}

function fillSlots(body: string, slots: string[]): string {
  let k = 0;
  return body.split(CANON_SLOT).reduce((acc, part, i) => (i === 0 ? part : acc + (slots[k++] ?? '') + part), '');
}

function applyVariants(body: string, ref: CanonRef): string {
  let b = body;
  if (ref.url === 'https') b = b.replace(/http:\/\//g, 'https://');
  else if (ref.url === 'http') b = b.replace(/https:\/\//g, 'http://');
  if (ref.indent !== undefined) b = b.replace(/^ +(?=\S)/gm, ' '.repeat(ref.indent));
  if (ref.tabs) b = b.replace(/^ {8,}/gm, m => '\t'.repeat(m.length >> 3) + ' '.repeat(m.length & 7));
  return b;
}

/** greedy word wrap: each paragraph (blank-line separated) re-flowed to at most `width` columns, prefix included */
function reflow(filled: string, prefix: string, width: number): string {
  const paras = filled.split(/\n[ \t]*\n/);
  const out: string[] = [];
  let first = true;
  for (const p of paras) {
    const words = p.split(/\s+/).filter(Boolean);
    let line = '';
    let cols = 0; // columns used including the (literal or emitted) prefix
    for (const w of words) {
      if (!line) { line = (first ? '' : prefix) + w; cols = prefix.length + w.length; first = false; }
      else if (cols + 1 + w.length <= width) { line += ' ' + w; cols += 1 + w.length; }
      else { out.push(line); line = prefix + w; cols = prefix.length + w.length; }
    }
    out.push(line);
    out.push(prefix.trimEnd());
  }
  out.pop();
  return out.join('\n');
}

export function renderCanon(ref: CanonRef): string | null {
  const e = canonEntry(ref.id, ref.kind, ref.layout);
  if (!e) return null;
  const slots = resolveSlots(e, ref.slots);
  if (!slots) return null;
  let filled = applyVariants(fillSlots(e.body, slots), ref);
  if (ref.ending !== undefined) {
    const ls = filled.split('\n');
    const k = ls.findIndex(l => l.trim() === ref.ending);
    if (k < 0) return null;
    filled = ls.slice(0, k + 1).join('\n');
  }
  let s: string;
  if (ref.wrap !== undefined) s = reflow(filled, ref.prefix, ref.wrap);
  else s = filled.split('\n').map((l, i) => (i === 0 ? l : l === '' ? ref.prefix.trimEnd() : ref.prefix + l)).join('\n');
  return ref.crlf ? s.replace(/\n/g, '\r\n') : s;
}

/* ---------------------------------------------------------------------------
 * 2. NOTATION — 【ID[ header][; layout name][; prefix "p"][; wrap N | unwrapped][; url https][; indent N][; ending "s"][; tabs][; CRLF][: slots | …]】
 * ------------------------------------------------------------------------- */

export function formatRef(ref: CanonRef): string {
  let s = CANON_OPEN + ref.id + (ref.kind === 'header' ? ' header' : '');
  if (ref.layout) s += `; layout ${ref.layout}`;
  if (ref.prefix) s += `; prefix ${JSON.stringify(ref.prefix)}`;
  if (ref.wrap !== undefined) s += ref.wrap === Infinity ? '; unwrapped' : `; wrap ${ref.wrap}`;
  if (ref.url) s += `; url ${ref.url}`;
  if (ref.indent !== undefined) s += `; indent ${ref.indent}`;
  if (ref.ending !== undefined) s += `; ending ${JSON.stringify(ref.ending)}`;
  if (ref.tabs) s += '; tabs';
  if (ref.crlf) s += '; CRLF';
  if (ref.slots.length) s += ': ' + ref.slots.join(' | ');
  return s + CANON_CLOSE;
}

const REF_RE = /【([A-Za-z0-9.+-]+)( header)?((?:; (?:layout [a-z]+|prefix "(?:[^"\\]|\\.)*"|wrap \d+|unwrapped|url https?|indent \d+|ending "(?:[^"\\]|\\.)*"|tabs|CRLF))*)(?:: ([\s\S]*?))?】/g;

export function parseRef(inner: RegExpExecArray): CanonRef | null {
  const [, id, header, mods, slotText] = inner;
  const kind: 'text' | 'header' = header ? 'header' : 'text';
  const ref: CanonRef = { id, kind, slots: [], prefix: '', crlf: false };
  if (mods) {
    for (const m of mods.split('; ').filter(Boolean)) {
      if (m.startsWith('layout ')) ref.layout = m.slice(7);
      else if (m.startsWith('prefix ')) { try { ref.prefix = JSON.parse(m.slice(7)); } catch { return null; } }
      else if (m.startsWith('wrap ')) ref.wrap = parseInt(m.slice(5), 10);
      else if (m === 'unwrapped') ref.wrap = Infinity;
      else if (m === 'url https') ref.url = 'https';
      else if (m === 'url http') ref.url = 'http';
      else if (m.startsWith('indent ')) ref.indent = parseInt(m.slice(7), 10);
      else if (m.startsWith('ending ')) { try { ref.ending = JSON.parse(m.slice(7)); } catch { return null; } }
      else if (m === 'tabs') ref.tabs = true;
      else if (m === 'CRLF') ref.crlf = true;
      else return null;
    }
  }
  const e = canonEntry(id, kind, ref.layout);
  if (!e) return null;
  if (slotText !== undefined) ref.slots = slotText.split(' | ');
  if (!resolveSlots(e, ref.slots)) return null;
  return ref;
}

export function expandRefs(text: string): string {
  return text.replace(REF_RE, (whole, ...rest) => {
    const m = [whole, ...rest.slice(0, 4)] as unknown as RegExpExecArray;
    const ref = parseRef(m);
    if (!ref) return whole;
    const r = renderCanon(ref);
    return r === null ? whole : r;
  });
}

/* ---------------------------------------------------------------------------
 * 3. RECOGNITION — the encoder side
 * ------------------------------------------------------------------------- */

interface Found { start: number; end: number; ref: CanonRef; entry: CanonEntry; rawTokens?: number }

interface RegionLine { stripped: string; origStart: number }

const PREFIX_CHARS = /^[ \t/*#;%!'"|-]*$/;


/**
 * Match the template at the start of `joined`: fixed segments byte-for-byte,
 * each slot = the shortest text (no blank line, at most 6 lines) that lets the
 * next fixed segment follow.  Returns the matched length and the slot values.
 */
function matchExact(body: string, joined: string): { len: number; slots: string[] } | null {
  const segs = body.split(CANON_SLOT);
  if (!joined.startsWith(segs[0])) return null;
  let pos = segs[0].length;
  const slots: string[] = [];
  for (let i = 1; i < segs.length; i++) {
    const seg = segs[i];
    if (seg === '') {
      // slot at the very end (or two adjacent slots): take the rest of the line
      let j = joined.indexOf('\n', pos); if (j < 0) j = joined.length;
      slots.push(joined.slice(pos, j)); pos = j; continue;
    }
    const at = joined.indexOf(seg, pos);
    if (at < 0) return null;
    const slot = joined.slice(pos, at);
    if (slot.includes('\n\n') || (slot.match(/\n/g) ?? []).length > 6) return null;
    slots.push(slot);
    pos = at + seg.length;
  }
  return { len: pos, slots };
}

/** the search anchor: the first line's text after its first slot (whole first line when it has none) */
function anchorOf(body: string): string {
  const first = body.split('\n')[0];
  const k = first.lastIndexOf(CANON_SLOT);
  return (k < 0 ? first : first.slice(k + 1)).trimEnd().slice(0, 56);
}

const LEAD_RE = /^[ \t/*#;%!'"|-]*/;

/** the anchor line from `at` on, then the following lines prefix-stripped while they carry the prefix */
function region(text: string, at: number, prefix: string, maxLines: number): RegionLine[] {
  const out: RegionLine[] = [];
  const bare = prefix.trimEnd();
  let j0 = text.indexOf('\n', at); if (j0 < 0) j0 = text.length;
  out.push({ stripped: text.slice(at, j0), origStart: at });
  let i = j0 + 1;
  while (i <= text.length && out.length < maxLines) {
    let j = text.indexOf('\n', i); if (j < 0) j = text.length;
    const line = text.slice(i, j);
    if (line.startsWith(prefix)) out.push({ stripped: line.slice(prefix.length), origStart: i + prefix.length });
    else if (line === bare) out.push({ stripped: '', origStart: j });
    else break;
    if (j >= text.length) break;
    i = j + 1;
  }
  return out;
}

/** original offset of position `k` in the "\n"-joined stripped region */
function origOffset(lines: RegionLine[], k: number): number {
  let acc = 0;
  for (const l of lines) {
    if (k <= acc + l.stripped.length) return l.origStart + (k - acc);
    acc += l.stripped.length + 1;
  }
  return lines[lines.length - 1].origStart + lines[lines.length - 1].stripped.length;
}

function words(s: string): string[] { return s.split(/\s+/).filter(Boolean); }

/** the entry's text as is, plus its url-scheme / indentation variants (only those the text can have) */
function variants(e: CanonEntry, wordsOnly = false): { body: string; ref: Partial<CanonRef> }[] {
  const out: { body: string; ref: Partial<CanonRef> }[] = [{ body: e.body, ref: {} }];
  const urls: Partial<CanonRef>[] = [{}];
  if (/https:\/\//.test(e.body)) urls.push({ url: 'http' });
  else if (/http:\/\//.test(e.body)) urls.push({ url: 'https' });
  const indents: Partial<CanonRef>[] = [{}];
  if (!wordsOnly && /^ +\S/m.test(e.body)) for (let n = 0; n <= 8; n++) indents.push({ indent: n });
  if (!wordsOnly && /^ {8,}\S/m.test(e.body)) indents.push({ tabs: true });
  for (const u of urls) for (const d of indents) {
    if (!u.url && d.indent === undefined && !d.tabs) continue;
    const ref = { ...u, ...d };
    out.push({ body: applyVariants(e.body, { id: e.id, kind: e.kind, slots: [], prefix: '', crlf: false, ...ref }), ref });
  }
  return out;
}

/** slot values to write: nothing when they are the template's own words, one value when all are equal */
function slotsForRef(e: CanonEntry, slots: string[]): string[] {
  if (!slots.length) return [];
  if (e.defaults && slots.every((v, i) => v === e.defaults![i])) return [];
  if (slots.length > 1 && slots.every(v => v === slots[0])) return [slots[0]];
  return slots;
}

/** all recognised regions, non-overlapping, longest first */
export function recogniseCanon(text: string, tiers: ReadonlySet<CanonTier> = new Set(['memorized', 'catalog'])): Found[] {
  const found: Found[] = [];
  for (const e of CANON) {
    if (!tiers.has(canonTier(e))) continue;
    const nLines = e.body.split('\n').length;
    // one anchor per distinct first line among the entry's variants (tabs / url may change it)
    const anchors = Array.from(new Set(variants(e).map(v => anchorOf(v.body)))).filter(a => a.trim().length >= 8);
    const hits: number[] = [];
    for (const anchor of anchors) { let from = 0, k: number; while ((k = text.indexOf(anchor, from)) >= 0) { hits.push(k); from = k + 1; } }
    for (const hitAt of Array.from(new Set(hits)).sort((x, y) => x - y)) {
      const ls = text.lastIndexOf('\n', hitAt - 1) + 1;
      const lead = LEAD_RE.exec(text.slice(ls, hitAt))![0];
      const at = ls + lead.length;             // the region starts after the first line's own prefix
      if (!PREFIX_CHARS.test(text.slice(ls, hitAt)) && !e.body.startsWith(CANON_SLOT)) continue;
      // continuation prefix: what the next line starts with (fallback: the first line's own lead)
      let nl = text.indexOf('\n', hitAt); if (nl < 0) nl = text.length;
      const nextLead = nl < text.length ? LEAD_RE.exec(text.slice(nl + 1, nl + 1 + 16))![0] : '';
      const prefixes = Array.from(new Set([nextLead, lead]));
      let done = false;
      for (const prefixText of prefixes) {
        if (done || prefixText.length > 12) continue;
        const lines = region(text, at, prefixText, Math.ceil(nLines * 1.6) + 12);
        const joined = lines.map(l => l.stripped).join('\n');
        const base: CanonRef = { id: e.id, kind: e.kind, layout: e.layout, slots: [], prefix: prefixText, crlf: false };
        // EXACT (canonical layout, then the url / indent variants)
        for (const v of variants(e)) {
          const m = matchExact(v.body, joined);
          if (!m) continue;
          const ref: CanonRef = { ...base, ...v.ref, slots: slotsForRef(e, m.slots) };
          const start = at, end = origOffset(lines, m.len);
          if (renderCanon(ref) === text.slice(start, end)) { found.push({ start, end, ref, entry: e }); done = true; break; }
        }
        // TRUNCATED: the file stops partway through the template, at a line end (e.g. Apache text without its appendix)
        for (const v of variants(e)) {
          const body = fillSlots(v.body, e.defaults ?? Array(e.slots).fill(''));
          if (e.slots && !e.defaults) break;
          let c = 0; const n = Math.min(body.length, joined.length);
          while (c < n && body.charCodeAt(c) === joined.charCodeAt(c)) c++;
          if (c >= body.length || c < body.length * 0.5) continue;
          let cut = body.lastIndexOf('\n', c);
          while (cut > 0 && body.slice(body.lastIndexOf('\n', cut - 1) + 1, cut).trim() === '') cut = body.lastIndexOf('\n', cut - 1);
          if (cut <= 0 || cut < body.length * 0.5) continue;
          const ending = body.slice(body.lastIndexOf('\n', cut - 1) + 1, cut).trim();
          const ref: CanonRef = { ...base, ...v.ref, ending };
          const start = at, end = origOffset(lines, cut);
          if (renderCanon(ref) === text.slice(start, end)) { found.push({ start, end, ref, entry: e }); done = true; break; }
        }
        if (done || (e.slots !== 0 && !e.defaults)) continue;
        // REFLOW (slot-free entries, or slots left at their default words): the same words, one paragraph per line or greedily re-wrapped at some width
        for (const v of variants(e, true)) {
          const tw = words(e.slots ? fillSlots(v.body, e.defaults!) : v.body);
          const rw: { w: string; end: number }[] = [];
          const re = /\S+/g; let mm: RegExpExecArray | null;
          while ((mm = re.exec(joined)) && rw.length < tw.length) rw.push({ w: mm[0], end: mm.index + mm[0].length });
          if (rw.length !== tw.length || !rw.every((x, i) => x.w === tw[i])) continue;
          const start = at, end = origOffset(lines, rw[rw.length - 1].end);
          const slice = text.slice(start, end);
          const longest = Math.max(...slice.split('\n').map(l => l.length)) + prefixText.length;
          const unwrapped: CanonRef = { ...base, ...v.ref, wrap: Infinity };
          if (renderCanon(unwrapped) === slice) { found.push({ start, end, ref: unwrapped, entry: e }); done = true; break; }
          for (let W = Math.max(20, longest - prefixText.length); W <= longest + 40; W++) {
            const ref: CanonRef = { ...base, ...v.ref, wrap: W };
            if (renderCanon(ref) === slice) { found.push({ start, end, ref, entry: e }); done = true; break; }
          }
          if (done) break;
        }
      }
    }
  }
  // longest first, then drop overlaps
  found.sort((a, b) => (b.end - b.start) - (a.end - a.start));
  const kept: Found[] = [];
  for (const f of found) if (!kept.some(k => f.start < k.end && k.start < f.end)) kept.push(f);
  return kept.sort((a, b) => a.start - b.start);
}

/* ---------------------------------------------------------------------------
 * 4. CONTRACT
 * ------------------------------------------------------------------------- */

export function canonClause(refs: readonly CanonRef[]): string {
  const parts: string[] = [];
  const hasText = refs.some(r => r.kind === 'text');
  const hasSlots = refs.some(r => r.slots.length > 0);
  const hasHeader = refs.some(r => r.kind === 'header');
  if (hasText) parts.push(`${CANON_OPEN}L${CANON_CLOSE} = the standard text of license L as in GitHub's LICENSE template, after the copyright line`);
  if (hasHeader) parts.push(`${CANON_OPEN}L header${CANON_CLOSE} = L's standard per-file license notice`);
  if (hasSlots) parts.push('": X" = X fills its blank(s)');
  if (refs.some(r => r.prefix)) parts.push('prefix "p" = each following line of it begins with p (blank lines: p without trailing spaces)');
  if (refs.some(r => r.layout)) parts.push('layout = a named alternative line-breaking of the same words');
  if (refs.some(r => r.wrap !== undefined && r.wrap !== Infinity)) parts.push('wrap N = its paragraphs re-flowed greedily to N columns, prefix included');
  if (refs.some(r => r.wrap === Infinity)) parts.push('unwrapped = each paragraph on one line');
  if (refs.some(r => r.url)) parts.push('url S = its URL with scheme S');
  if (refs.some(r => r.indent !== undefined)) parts.push('indent N = its indented line(s) indented by N spaces');
  if (refs.some(r => r.ending !== undefined)) parts.push('ending "s" = it stops after the line s');
  if (refs.some(r => r.tabs)) parts.push('tabs = its leading indentation uses tabs of 8 columns');
  if (refs.some(r => r.crlf)) parts.push('CRLF = \\r\\n line ends');
  return parts.join('; ') + '.';
}

function isClause(line: string): boolean {
  return line.startsWith(CANON_OPEN + 'L') && line.includes(CANON_CLOSE + ' = ');
}

/* ---------------------------------------------------------------------------
 * 5. ENCODER
 * ------------------------------------------------------------------------- */

export interface AnagnorisisResult extends DaedalusResult {
  codec2: 'anagnorisis';
  canonApplied: boolean;
  canonRefs: string[];
  canonTiers: CanonTier[];
  /** raw tokens of the recognised regions */
  canonRegionTokens: number;
  /** tokens of the references that replaced them */
  canonRefTokens: number;
  plainMessageTokens: number;
}

export interface AnagnorisisOptions extends DaedalusOptions {
  /** which catalogue tiers may be recognised (default both) */
  tiers?: CanonTier[];
  /** run the plain frontier encoder as a guard when the recognised saving is below this many tokens (default 60) */
  guardBelow?: number;
}

function plainResult(plain: DaedalusResult, started: number, note: string): AnagnorisisResult {
  return {
    ...plain, codec2: 'anagnorisis', canonApplied: false, canonRefs: [], canonTiers: [], canonRegionTokens: 0, canonRefTokens: 0,
    plainMessageTokens: plain.messageTokens, ms: Date.now() - started, notes: `anagnorisis: not applied (${note}); ${plain.notes}`,
  };
}

export function anagnorisisEncode(text: string, enc: EncodingName = 'o200k_base', options: AnagnorisisOptions = {}): AnagnorisisResult {
  const started = Date.now();
  const { tiers = ['memorized', 'catalog'], guardBelow = 60, ...dopts } = options;
  const inTokens = countTokens(text, enc);
  // the notation must be free in the payload, and the payload must not start with a clause-shaped line
  if (text.includes(CANON_OPEN) || text.includes(CANON_CLOSE) || isClause(text.split('\n', 1)[0])) {
    return plainResult(daedalusEncode(text, enc, dopts), started, 'payload already contains the reference brackets');
  }
  // CRLF files: recognise on the LF form, mark every reference CRLF, restore CRLF around the references
  const crlf = text.includes('\r\n') && !/(^|[^\r])\n/.test(text);
  const lf = crlf ? text.replace(/\r\n/g, '\n') : text;
  const found = recogniseCanon(lf, new Set(tiers));
  if (!found.length) return plainResult(daedalusEncode(text, enc, dopts), started, 'no canonical text recognised');
  if (crlf) for (const f of found) f.ref.crlf = true;

  // replace from the end
  let reduced = lf;
  let regionTokens = 0, refTokens = 0;
  const refs = found.map(f => f.ref);
  for (const f of [...found].reverse()) {
    const ref = formatRef(f.ref);
    regionTokens += countTokens(text.slice(crlf ? f.start + lf.slice(0, f.start).split('\n').length - 1 : f.start, crlf ? f.end + lf.slice(0, f.end).split('\n').length - 1 : f.end), enc);
    refTokens += countTokens(ref, enc);
    reduced = reduced.slice(0, f.start) + ref + reduced.slice(f.end);
  }
  if (crlf) reduced = reduced.replace(/\n/g, '\r\n');
  const clause = canonClause(refs);
  const clauseTokens = countTokens(clause + '\n', enc);
  const saving = regionTokens - refTokens - clauseTokens;
  if (saving <= 0) return plainResult(daedalusEncode(text, enc, dopts), started, `references + clause (${refTokens + clauseTokens}) do not repay the regions (${regionTokens})`);

  const inner = daedalusEncode(reduced, enc, dopts);
  const wire = clause + '\n' + inner.wire;
  const decoderPrompt = clause + '\n' + inner.decoderPrompt;
  const decoded = anagnorisisDecode(wire);
  const exact = decoded === text;
  const messageTokens = countTokens(decoderPrompt, enc);
  const outTokens = countTokens(wire, enc);
  // guard only when marginal (non-tournament path for clear wins)
  const plain = !exact || saving < guardBelow ? daedalusEncode(text, enc, dopts) : null;
  if (!exact || (plain && messageTokens >= plain.messageTokens)) {
    return plainResult(plain!, started, !exact ? 'composed wire failed the round trip' : `composed M ${messageTokens} >= plain M ${plain!.messageTokens}`);
  }
  return {
    ...inner, codec2: 'anagnorisis', wire, decoded, exact, inTokens, outTokens, messageTokens,
    contractTokens: messageTokens - outTokens + clauseTokens, decoderPrompt,
    savingsPct: inTokens ? (1 - messageTokens / inTokens) * 100 : 0,
    canonApplied: true, canonRefs: refs.map(formatRef), canonTiers: found.map(f => canonTier(f.entry)),
    canonRegionTokens: regionTokens, canonRefTokens: refTokens,
    plainMessageTokens: plain ? plain.messageTokens : inTokens, ms: Date.now() - started,
    notes: `anagnorisis: ${found.length} canonical region(s) [${found.map(f => `${f.entry.id}/${f.entry.kind}:${canonTier(f.entry)}${f.ref.wrap !== undefined ? ':reflow' : ''}`).join(', ')}] ${regionTokens} tok -> ${refTokens} tok + clause ${clauseTokens}; M ${messageTokens}${plain ? ` vs plain ${plain.messageTokens}` : ' (plain run skipped: clear win)'}; ${inner.notes}`,
  };
}

/* ---------------------------------------------------------------------------
 * 6. DECODER / PROMPT
 * ------------------------------------------------------------------------- */

export function anagnorisisDecode(wire: string): string {
  const k = wire.indexOf('\n');
  const first = k < 0 ? wire : wire.slice(0, k);
  if (!isClause(first)) return daedalusDecode(wire);
  const inner = k < 0 ? '' : wire.slice(k + 1);
  return expandRefs(daedalusDecode(inner));
}

function innerPrompt(inner: string): string {
  return daedalusDecode(inner) !== inner ? daedalusDecoderPrompt(inner) : inner;
}

export function anagnorisisDecoderPrompt(wire: string): string {
  const k = wire.indexOf('\n');
  const first = k < 0 ? wire : wire.slice(0, k);
  if (!isClause(first)) return innerPrompt(wire);
  return wire.slice(0, k + 1) + innerPrompt(k < 0 ? '' : wire.slice(k + 1));
}
