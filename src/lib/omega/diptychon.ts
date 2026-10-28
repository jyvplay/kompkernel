/**
 * src/lib/omega/diptychon.ts
 * =============================================================================
 * DIPTYCHON (δίπτυχον, "two-panel tablet") — canonical hexdump re-rendering.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * A hexdump (`od -t x1z`, `xxd`, `hexdump -C`) prints every byte twice: once
 * as hex, once as an ASCII panel (the gutter), plus a running offset that is
 * 16 times the line index. The second panel and the offsets are not repeated
 * text — grammar codecs cannot absorb them, because each gutter is fresh
 * semi-random characters — and they are not a column law or a functional
 * dependency between data fields (SYLLOGISMOS): they are a *second encoding
 * of the same values* under a fixed external convention. Measured in X51/X52
 * on real GNU od output, that frame is roughly 40% of the parent-coded
 * message. Nothing in the 280-module stack touches hexdumps at all (grep:
 * xxd/hexdump/gutter = 0 hits). GRAMMA regenerates *layout* (JSON/code
 * indentation) and KLADOS regenerates tree *connector glyphs* from a depth
 * sequence; both are position-derived. The ASCII panel is value-derived —
 * this codec ships one panel of the diptych and states the rendering rule
 * once, in-band.
 *
 * MECHANISM
 * -----------------------------------------------------------------------------
 * Detect one of three canonical dump renderings (od -t x1z with hex/octal/
 * decimal/no offsets and `*` squeezing; xxd with byte grouping, upper-case
 * and decimal-offset and NUL-line autoskip variants; hexdump -C) by
 * inferring its parameters from the text itself, extracting the byte stream,
 * and *verifying a byte-identical re-render of the whole input* — offsets,
 * spacing, gutter, squeeze placement and the final offset line included.
 * Only then is the frame removed: each data line becomes compact hex (byte
 * pairs, or one continuous hex string per line, whichever tokenizes cheaper),
 * squeezed runs are expanded to plain repeated lines (parents price repeats
 * at ~nothing), and non-data lines pass through verbatim. The contract
 * teaches the reader the exact rendering, so a stock LLM re-renders the dump
 * from one chat message with no side information. The reduced text goes to
 * the cheapest measured of DAEDALUS / AKOLOUTHIA-2 / APOGRAPHE; the complete
 * candidate (contract + parent message) must beat AKOLOUTHIA-2 and APOGRAPHE
 * on the source (both TAGSTACK runtime-parent members, so losing to either
 * is decisive) and then the full TAGSTACK + SIBLING-TEMPLATE frontier,
 * strictly, with byte-exact decode — otherwise the measured best parent is
 * returned untouched.
 *
 * Prior art, honestly: `xxd -r`/`od` round-tripping is as old as the tools;
 * "canonical hex+ASCII display" is util-linux hexdump terminology. No new
 * compression primitive is claimed — the claim is the verified, one-chat,
 * LLM-re-renderable realization with a measured frontier gate, in a stack
 * that had no hexdump mechanism at all.
 *
 * Greedy/search: format detection is a small deterministic candidate set
 * arbitrated by whole-input byte-exact re-rendering (not greedy — a wrong
 * parameter guess cannot emit, it can only refuse). Compact form is chosen
 * by direct token count of the two reduced variants. Emission is a measured
 * gate, not a search.
 *
 * Time/CPU: CPU-bound. The planner is linear (caps: 2,000,000 code units,
 * 300,000 lines). The inherited parent encodes and the TAGSTACK frontier
 * dominate wall time and have no wrapper-wide cap, so the registry entry is
 * deep-audit-only, like KOLUMN and SYLLOGISMOS.
 */

import { countTokens, type EncodingName } from './bpe';
import { daedalusEncode } from './daedalus';
import { akolouthia2Encode } from './akolouthia2';
import { apographeEncode, apographeDecodeResult } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

// ---------------------------------------------------------------------------
// Spec
// ---------------------------------------------------------------------------

export type DiptychonFormat = 'od' | 'xxd' | 'hexdumpC';

export interface DiptychonSpec {
  v: 1;
  format: DiptychonFormat;
  /** 0 = no offsets printed (od -A n) */
  offsetRadix: 0 | 8 | 10 | 16;
  offsetWidth: number;
  offsetBase: number;
  offsetUpper: boolean;
  bytesPerLine: number;
  /** xxd bytes per hex group; 1 for od/hexdumpC */
  group: number;
  /** upper-case hex digits for byte values */
  upper: boolean;
  squeeze: 'none' | 'identical' | 'zero';
  finalOffsetLine: boolean;
  compact: 'pairs' | 'continuous';
  eol: '\n' | '\r\n';
}

export interface DiptychonPlan {
  spec: DiptychonSpec;
  reducedText: string;
  contract: string;
  dataLines: number;
  totalBytes: number;
}

export interface DiptychonResult {
  codec: 'diptychon';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  precheckParentTokens: number;
  parentTokens: number;
  messageTokens: number;
  parentCodec: string;
  parentCosts: Record<string, number>;
  fullFrontierMeasured: boolean;
  applied: boolean;
  format: DiptychonFormat | null;
  compact: 'pairs' | 'continuous' | null;
  dataLines: number;
  totalBytes: number;
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateParentTokens: number | null;
  candidateParentCodec: string | null;
  candidateParentCosts: Record<string, number> | null;
  comparison: string;
  notes: string;
  ms: number;
}

const MAX_CHARS = 2_000_000;
const MAX_LINES = 300_000;
const MIN_DATA_LINES = 4;

// ---------------------------------------------------------------------------
// Rendering primitives
// ---------------------------------------------------------------------------

const hx2 = (b: number, upper: boolean): string => {
  const s = b.toString(16).padStart(2, '0');
  return upper ? s.toUpperCase() : s;
};
const gutterOf = (bytes: number[]): string =>
  bytes.map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.')).join('');
const offsetStr = (spec: DiptychonSpec, value: number): string => {
  let s = value.toString(spec.offsetRadix === 0 ? 16 : spec.offsetRadix);
  if (spec.offsetUpper) s = s.toUpperCase();
  return s.padStart(spec.offsetWidth, '0');
};

function renderDataLine(spec: DiptychonSpec, bytes: number[], offsetValue: number): string {
  const n = spec.bytesPerLine;
  const g = gutterOf(bytes);
  if (spec.format === 'od') {
    const off = spec.offsetRadix === 0 ? '' : offsetStr(spec, offsetValue);
    const hex = bytes.map((b) => ' ' + hx2(b, spec.upper)).join('');
    return `${off}${hex}${' '.repeat(3 * (n - bytes.length))}  >${g}<`;
  }
  if (spec.format === 'xxd') {
    const groups: string[] = [];
    for (let i = 0; i < bytes.length; i += spec.group) {
      groups.push(bytes.slice(i, i + spec.group).map((b) => hx2(b, spec.upper)).join(''));
    }
    const numGroups = Math.ceil(n / spec.group);
    const width = numGroups * (2 * spec.group) + (numGroups - 1);
    return `${offsetStr(spec, offsetValue)}: ${groups.join(' ').padEnd(width, ' ')}  ${g}`;
  }
  // hexdumpC
  let cells = '';
  for (let j = 0; j < n; j++) {
    if (j === 8) cells += ' ';
    cells += j < bytes.length ? hx2(bytes[j]!, spec.upper) + ' ' : '   ';
  }
  return `${offsetStr(spec, offsetValue)}  ${cells} |${g}|`;
}

type Item =
  | { t: 'data'; bytes: number[] }
  | { t: 'final' }
  | { t: 'other'; s: string };

/** Re-render a full dump from expanded items. The encoder's acceptance test. */
function renderDump(spec: DiptychonSpec, items: Item[]): string {
  const out: string[] = [];
  let cum = 0;
  let prevBlock: number[] | null = null;
  let inStar = false;
  const sameBlock = (a: number[], b: number[] | null): boolean =>
    b !== null && a.length === b.length && a.every((v, i) => v === b[i]);
  for (const it of items) {
    if (it.t === 'other') {
      out.push(it.s);
      prevBlock = null; inStar = false;
      continue;
    }
    if (it.t === 'final') {
      out.push(offsetStr(spec, spec.offsetBase + cum));
      prevBlock = null; inStar = false;
      continue;
    }
    const bytes = it.bytes;
    const full = bytes.length === spec.bytesPerLine;
    const squeezable =
      full &&
      ((spec.squeeze === 'identical' && sameBlock(bytes, prevBlock)) ||
        (spec.squeeze === 'zero' && prevBlock !== null && bytes.every((b) => b === 0) && prevBlock.every((b) => b === 0)));
    if (squeezable) {
      if (!inStar) { out.push('*'); inStar = true; }
    } else {
      out.push(renderDataLine(spec, bytes, spec.offsetBase + cum));
      inStar = false;
      prevBlock = bytes;
    }
    cum += bytes.length;
  }
  return out.join(spec.eol) + spec.eol;
}

// ---------------------------------------------------------------------------
// Line splitting
// ---------------------------------------------------------------------------

function splitEol(text: string): { lines: string[]; eol: '\n' | '\r\n' } | null {
  if (text.length === 0 || text.length > MAX_CHARS) return null;
  let eol: '\n' | '\r\n';
  if (text.includes('\r\n')) eol = '\r\n';
  else if (!text.includes('\r')) eol = '\n';
  else return null;
  if (!text.endsWith(eol)) return null;
  const lines = text.split(eol);
  lines.pop();
  if (lines.length > MAX_LINES) return null;
  if (eol === '\r\n' && lines.some((l) => l.includes('\n') || l.includes('\r'))) return null;
  if (eol === '\n' && lines.some((l) => l.includes('\r'))) return null;
  return { lines, eol };
}

// ---------------------------------------------------------------------------
// Parsers. Each returns spec (minus compact) + expanded items, or null.
// Star expansion is deferred: items carry {t:'star'} during parse; the shared
// finisher expands stars using offset continuity and verifies re-render.
// ---------------------------------------------------------------------------

type RawItem = Item | { t: 'star' };

interface Parsed {
  spec: Omit<DiptychonSpec, 'compact'>;
  items: Item[];
  dataLines: number;
  totalBytes: number;
}

function finishParse(
  spec: Omit<DiptychonSpec, 'compact'>,
  raw: RawItem[],
  lineOffsets: (number | null)[],
  text: string,
): Parsed | null {
  // lineOffsets[i] = printed offset value of raw[i] when it is a data/final line.
  const items: Item[] = [];
  let cum = 0;
  let dataLines = 0;
  let prevBlock: number[] | null = null;
  let lastWasData = false;
  for (let i = 0; i < raw.length; i++) {
    const it = raw[i]!;
    if (it.t === 'other') { items.push(it); lastWasData = false; continue; }
    if (it.t === 'star') {
      if (!lastWasData || !prevBlock) return null;
      // find the next offset-bearing item
      let nextOff: number | null = null;
      for (let j = i + 1; j < raw.length; j++) {
        if (raw[j]!.t === 'data' || raw[j]!.t === 'final') { nextOff = lineOffsets[j] ?? null; break; }
        if (raw[j]!.t === 'star' || raw[j]!.t === 'other') return null;
      }
      if (nextOff === null) return null;
      const span = nextOff - (spec.offsetBase + cum);
      if (span <= 0 || span % spec.bytesPerLine !== 0) return null;
      const reps = span / spec.bytesPerLine;
      if (reps > 1_000_000) return null;
      for (let r = 0; r < reps; r++) { items.push({ t: 'data', bytes: prevBlock }); dataLines++; }
      cum += span;
      lastWasData = true;
      continue;
    }
    if (it.t === 'data') {
      const off = lineOffsets[i];
      if (spec.offsetRadix !== 0 && off !== spec.offsetBase + cum) return null;
      if (it.bytes.length === 0 || it.bytes.length > spec.bytesPerLine) return null;
      items.push(it);
      prevBlock = it.bytes;
      cum += it.bytes.length;
      dataLines++;
      lastWasData = true;
      continue;
    }
    // final
    if (lineOffsets[i] !== spec.offsetBase + cum) return null;
    items.push(it);
    lastWasData = false;
  }
  if (dataLines < MIN_DATA_LINES) return null;
  // only the last data block may be short
  const dataIdx = items.map((x, i) => (x.t === 'data' ? i : -1)).filter((i) => i >= 0);
  for (let k = 0; k < dataIdx.length - 1; k++) {
    if ((items[dataIdx[k]!] as { bytes: number[] }).bytes.length !== spec.bytesPerLine) return null;
  }
  const full = { ...spec, compact: 'pairs' as const };
  if (renderDump(full, items) !== text) return null;
  return { spec, items, dataLines, totalBytes: cum };
}

const HEX2 = /^[0-9a-f]{2}$/;

function parseOd(lines: string[], eol: '\n' | '\r\n', text: string): Parsed | null {
  const raw: RawItem[] = [];
  const offsets: (number | null)[] = [];
  const offsetTokens: string[] = [];
  let noOffset: boolean | null = null;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    if (line === '*') { raw.push({ t: 'star' }); offsets.push(null); continue; }
    // data line?
    let rest = line;
    let token: string | null = null;
    if (!rest.startsWith(' ')) {
      const sp = rest.indexOf(' ');
      if (sp > 0) { token = rest.slice(0, sp); rest = rest.slice(sp); }
    }
    const bytes: number[] = [];
    let p = 0;
    while (rest.startsWith(' ', p) && HEX2.test(rest.slice(p + 1, p + 3)) && (p + 3 >= rest.length || rest[p + 3] === ' ')) {
      bytes.push(parseInt(rest.slice(p + 1, p + 3), 16));
      p += 3;
      if (bytes.length > 16) break;
    }
    const tail = rest.slice(p);
    const expectedTail = bytes.length > 0 && bytes.length <= 16
      ? ' '.repeat(3 * (16 - bytes.length)) + '  >' + gutterOf(bytes) + '<'
      : null;
    if (expectedTail !== null && tail === expectedTail) {
      if (noOffset === null) noOffset = token === null;
      if ((token === null) !== noOffset) return null;
      if (token !== null) offsetTokens.push(token);
      raw.push({ t: 'data', bytes });
      offsets.push(null); // resolved below per radix
      continue;
    }
    if (/^[0-9a-f]+$/.test(line) && li === lines.length - 1 && raw.some((r) => r.t === 'data')) {
      raw.push({ t: 'final' });
      offsets.push(null);
      offsetTokens.push(line);
      continue;
    }
    raw.push({ t: 'other', s: line });
    offsets.push(null);
  }
  const squeeze = raw.some((r) => r.t === 'star') ? ('identical' as const) : ('none' as const);
  const finalOffsetLine = raw.some((r) => r.t === 'final');
  if (noOffset) {
    const spec: Omit<DiptychonSpec, 'compact'> = {
      v: 1, format: 'od', offsetRadix: 0, offsetWidth: 0, offsetBase: 0, offsetUpper: false,
      bytesPerLine: 16, group: 1, upper: false, squeeze, finalOffsetLine: false, eol,
    };
    if (finalOffsetLine) return null;
    return finishParse(spec, raw, offsets, text);
  }
  if (offsetTokens.length === 0) return null;
  const width = offsetTokens[offsetTokens.length - 1]!.length;
  if (!offsetTokens.every((t) => t.length === width)) return null;
  // resolve offsets under each candidate radix
  for (const radix of [16, 8, 10] as const) {
    const digitOk = offsetTokens.every((t) =>
      radix === 16 ? /^[0-9a-f]+$/.test(t) : radix === 8 ? /^[0-7]+$/.test(t) : /^[0-9]+$/.test(t));
    if (!digitOk) continue;
    const offs = [...offsets];
    let ti = 0;
    let base: number | null = null;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]!.t === 'data' || raw[i]!.t === 'final') {
        const v = parseInt(offsetTokens[ti++]!, radix);
        if (base === null) base = v;
        offs[i] = v;
      }
    }
    if (base === null) continue;
    const spec: Omit<DiptychonSpec, 'compact'> = {
      v: 1, format: 'od', offsetRadix: radix, offsetWidth: width, offsetBase: base, offsetUpper: false,
      bytesPerLine: 16, group: 1, upper: false, squeeze, finalOffsetLine, eol,
    };
    // offset tokens must be exactly padStart-rendered
    const got = finishParse(spec, raw, offs, text);
    if (got) return got;
  }
  return null;
}

function parseXxd(lines: string[], eol: '\n' | '\r\n', text: string): Parsed | null {
  const raw: RawItem[] = [];
  const offsets: (number | null)[] = [];
  const offsetTokens: string[] = [];
  let cols = -1;
  let group = -1;
  let sawUpperAF = false;
  let sawLowerAF = false;
  let fieldWidth = -1;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    if (line === '*') { raw.push({ t: 'star' }); offsets.push(null); continue; }
    const m = /^([0-9a-fA-F]+): (.*)$/.exec(line);
    if (!m) { raw.push({ t: 'other', s: line }); offsets.push(null); continue; }
    const token = m[1]!;
    const body = m[2]!;
    // tokenize hex field from the left; group detected on first data line
    const tryGroups = group > 0 ? [group] : [2, 1, 4, 8];
    let parsed: { bytes: number[]; g: number; w: number } | null = null;
    for (const g of tryGroups) {
      const tlen = 2 * g;
      const bytes: number[] = [];
      let p = 0;
      let ok = true;
      while (true) {
        const tok = body.slice(p, p + tlen);
        if (tok.length === tlen && /^[0-9a-fA-F]+$/.test(tok)) {
          for (let k = 0; k < g; k++) bytes.push(parseInt(tok.slice(2 * k, 2 * k + 2), 16));
          p += tlen;
          if (body[p] === ' ' && /^[0-9a-fA-F]$/.test(body[p + 1] ?? '')) { p += 1; continue; }
          break;
        }
        break;
      }
      if (bytes.length === 0) { ok = false; }
      if (!ok) continue;
      const w = cols > 0 ? fieldWidth : body.length - 2 - bytes.length;
      if (w < p) continue;
      if (body.slice(p, w) !== ' '.repeat(w - p)) continue;
      if (body.slice(w, w + 2) !== '  ') continue;
      if (body.slice(w + 2) !== gutterOf(bytes)) continue;
      // field must be the padded token rendering
      if (cols > 0 && bytes.length > cols) continue;
      parsed = { bytes, g, w };
      break;
    }
    if (!parsed) { raw.push({ t: 'other', s: line }); offsets.push(null); continue; }
    if (cols < 0) {
      cols = parsed.bytes.length;
      group = parsed.g;
      fieldWidth = parsed.w;
      const numGroups = Math.ceil(cols / group);
      if (fieldWidth !== numGroups * (2 * group) + (numGroups - 1)) return null;
    }
    const field = body.slice(0, fieldWidth);
    if (/[A-F]/.test(field)) sawUpperAF = true;
    if (/[a-f]/.test(field)) sawLowerAF = true;
    offsetTokens.push(token);
    raw.push({ t: 'data', bytes: parsed.bytes });
    offsets.push(null);
  }
  if (cols <= 0 || cols > 256) return null;
  if (sawUpperAF && sawLowerAF) return null;
  const upper = sawUpperAF;
  const width = offsetTokens[0]?.length ?? 0;
  if (!offsetTokens.every((t) => t.length === width)) return null;
  const offsetUpper = offsetTokens.some((t) => /[A-F]/.test(t));
  const squeezeModes: DiptychonSpec['squeeze'][] = raw.some((r) => r.t === 'star') ? ['zero', 'identical'] : ['none'];
  for (const radix of [16, 10] as const) {
    if (radix === 10 && offsetTokens.some((t) => /[a-fA-F]/.test(t))) continue;
    const offs = [...offsets];
    let ti = 0;
    let base: number | null = null;
    for (let i = 0; i < raw.length; i++) {
      if (raw[i]!.t === 'data') {
        const v = parseInt(offsetTokens[ti++]!, radix);
        if (base === null) base = v;
        offs[i] = v;
      }
    }
    if (base === null) continue;
    for (const squeeze of squeezeModes) {
      const spec: Omit<DiptychonSpec, 'compact'> = {
        v: 1, format: 'xxd', offsetRadix: radix, offsetWidth: width, offsetBase: base, offsetUpper,
        bytesPerLine: cols, group, upper, squeeze, finalOffsetLine: false, eol,
      };
      const got = finishParse(spec, raw, offs, text);
      if (got) return got;
    }
  }
  return null;
}

function parseHexdumpC(lines: string[], eol: '\n' | '\r\n', text: string): Parsed | null {
  const raw: RawItem[] = [];
  const offsets: (number | null)[] = [];
  const offsetTokens: string[] = [];
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li]!;
    if (line === '*') { raw.push({ t: 'star' }); offsets.push(null); continue; }
    const m = /^([0-9a-f]+)  (.*)$/.exec(line);
    let done = false;
    if (m) {
      const body = m[2]!;
      const bytes: number[] = [];
      let p = 0;
      let ok = body.length >= 51;
      let blanks = false;
      for (let j = 0; j < 16 && ok; j++) {
        if (j === 8) { if (body[p] !== ' ') ok = false; p++; }
        const slot = body.slice(p, p + 3);
        if (slot === '   ') blanks = true;
        else if (/^[0-9a-f]{2} $/.test(slot) && !blanks) bytes.push(parseInt(slot.slice(0, 2), 16));
        else ok = false;
        p += 3;
      }
      if (ok && body.slice(p, p + 2) === ' |' && body.endsWith('|') && body.slice(p + 2, -1) === gutterOf(bytes) && bytes.length > 0) {
        offsetTokens.push(m[1]!);
        raw.push({ t: 'data', bytes });
        offsets.push(null);
        done = true;
      }
    }
    if (done) continue;
    if (/^[0-9a-f]+$/.test(line) && li === lines.length - 1 && raw.some((r) => r.t === 'data')) {
      raw.push({ t: 'final' });
      offsets.push(null);
      offsetTokens.push(line);
      continue;
    }
    raw.push({ t: 'other', s: line });
    offsets.push(null);
  }
  if (offsetTokens.length === 0) return null;
  const width = offsetTokens[offsetTokens.length - 1]!.length;
  if (!offsetTokens.every((t) => t.length === width)) return null;
  const offs = [...offsets];
  let ti = 0;
  let base: number | null = null;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i]!.t === 'data' || raw[i]!.t === 'final') {
      const v = parseInt(offsetTokens[ti++]!, 16);
      if (base === null) base = v;
      offs[i] = v;
    }
  }
  if (base === null) return null;
  const spec: Omit<DiptychonSpec, 'compact'> = {
    v: 1, format: 'hexdumpC', offsetRadix: 16, offsetWidth: width, offsetBase: base, offsetUpper: false,
    bytesPerLine: 16, group: 1, upper: false,
    squeeze: raw.some((r) => r.t === 'star') ? 'identical' : 'none',
    finalOffsetLine: raw.some((r) => r.t === 'final'), eol,
  };
  return finishParse(spec, raw, offs, text);
}

// ---------------------------------------------------------------------------
// Reduced form + restore
// ---------------------------------------------------------------------------

function compactLine(bytes: number[], compact: 'pairs' | 'continuous'): string {
  const parts = bytes.map((b) => b.toString(16).padStart(2, '0'));
  return compact === 'pairs' ? parts.join(' ') : parts.join('');
}

function buildReduced(spec: DiptychonSpec, items: Item[]): string {
  const out: string[] = [];
  for (const it of items) {
    if (it.t === 'data') out.push(compactLine(it.bytes, spec.compact));
    else if (it.t === 'final') out.push(''); // filled with the total below
    else out.push(it.s);
  }
  // final line needs the total; recompute
  let cum = 0;
  for (let i = 0; i < items.length; i++) {
    const it = items[i]!;
    if (it.t === 'data') cum += it.bytes.length;
    if (it.t === 'final') out[i] = offsetStr(spec, spec.offsetBase + cum);
  }
  return out.join(spec.eol) + spec.eol;
}

/**
 * Local decoder for the DIPTYCHON layer (applied after the parent codec's
 * own decode). Re-renders the dump from the compact hex lines.
 */
export function diptychonRestore(reducedText: string, spec: DiptychonSpec): string {
  const split = splitEol(reducedText);
  if (!split) throw new Error('DIPTYCHON reduced text has no uniform line ending');
  const { lines } = split;
  const items: Item[] = [];
  const pairRe = /^(?:[0-9a-f]{2} )*[0-9a-f]{2}$/;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const isLast = i === lines.length - 1;
    if (spec.finalOffsetLine && isLast && /^[0-9a-fA-F]+$/.test(line)) {
      items.push({ t: 'final' });
      continue;
    }
    if (spec.compact === 'pairs' && pairRe.test(line)) {
      items.push({ t: 'data', bytes: line.split(' ').map((h) => parseInt(h, 16)) });
      continue;
    }
    if (spec.compact === 'continuous' && /^[0-9a-f]+$/.test(line) && line.length % 2 === 0 && line.length >= 2 && line.length <= 2 * spec.bytesPerLine) {
      const bytes: number[] = [];
      for (let k = 0; k < line.length; k += 2) bytes.push(parseInt(line.slice(k, k + 2), 16));
      items.push({ t: 'data', bytes });
      continue;
    }
    items.push({ t: 'other', s: line });
  }
  return renderDump(spec, items);
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------

function diptychonContract(spec: DiptychonSpec): string {
  const n = spec.bytesPerLine;
  const shape = spec.compact === 'pairs'
    ? `lines of lowercase hex byte pairs separated by spaces`
    : `lines of ${2 * n} lowercase hex digits (read each as ${n} byte pairs; the last data line may be shorter)`;
  const radixName = spec.offsetRadix === 16 ? 'hex' : spec.offsetRadix === 8 ? 'octal' : 'decimal';
  const baseNote = spec.offsetBase !== 0 ? ` plus ${spec.offsetBase}` : '';
  const squeezeNote = spec.squeeze === 'identical'
    ? ` A full line whose bytes repeat the previous full line is not printed; the whole run of repeats is replaced by one line containing only *.`
    : spec.squeeze === 'zero'
      ? ` A run of all-zero full lines after the first is replaced by one line containing only *.`
      : '';
  const gut = `one character per byte (the ASCII character itself when printable or a space, else a dot)`;
  let frame: string;
  if (spec.format === 'od') {
    const off = spec.offsetRadix === 0
      ? 'no offset'
      : `the byte offset in ${radixName} (${n} times the data-line index from 0${baseNote}), zero-padded to ${spec.offsetWidth} digits`;
    frame = `an od dump. Rewrite each such line as: ${off}, then each byte preceded by a space as 2 hex digits, then spaces as if ${n} bytes were present, two spaces, >, ${gut}, <`;
  } else if (spec.format === 'xxd') {
    frame = `an xxd dump. Rewrite each such line as: the byte offset in ${radixName} (${n} times the data-line index from 0${baseNote}), zero-padded to ${spec.offsetWidth} digits, a colon and a space, then the bytes in groups of ${spec.group} written as ${2 * spec.group} ${spec.upper ? 'upper-case ' : ''}hex digits separated by single spaces (pad a short last line with spaces so the text column aligns), two spaces, then ${gut}`;
  } else {
    frame = `a hexdump -C dump. Rewrite each such line as: the byte offset in hex (${n} times the data-line index from 0${baseNote}), zero-padded to ${spec.offsetWidth} digits, two spaces, then each byte as 2 hex digits followed by a space (an extra space before the 9th byte; bytes missing on a short line are 3 spaces each), a space, |, ${gut}, |`;
  }
  return `DIPTYCHON: after decoding below, the ${shape} are the bytes of ${frame}.${squeezeNote} Keep every other line exactly as decoded.`;
}

// ---------------------------------------------------------------------------
// Planner
// ---------------------------------------------------------------------------

export function diptychonPlan(text: string, enc: EncodingName = 'o200k_base'): DiptychonPlan | null {
  const split = splitEol(text);
  if (!split) return null;
  const { lines, eol } = split;
  const parsed =
    parseOd(lines, eol, text) ?? parseHexdumpC(lines, eol, text) ?? parseXxd(lines, eol, text);
  if (!parsed) return null;
  let best: DiptychonPlan | null = null;
  let bestTok = Infinity;
  for (const compact of ['continuous', 'pairs'] as const) {
    const spec: DiptychonSpec = { ...parsed.spec, compact };
    const reducedText = buildReduced(spec, parsed.items);
    let restored: string;
    try { restored = diptychonRestore(reducedText, spec); } catch { continue; }
    if (restored !== text) continue;
    const tok = countTokens(reducedText, enc);
    if (tok < bestTok) {
      bestTok = tok;
      best = { spec, reducedText, contract: diptychonContract(spec), dataLines: parsed.dataLines, totalBytes: parsed.totalBytes };
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Measured parents + frontier gate (same construction as SYLLOGISMOS)
// ---------------------------------------------------------------------------

interface MeasureParent {
  wire: string;
  message: string;
  decoded: string;
  messageTokens: number;
  parentCodec: string;
  parentCosts: Record<string, number>;
}

function measuredAkolouthia2(text: string, enc: EncodingName): MeasureParent {
  const parent = akolouthia2Encode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('DIPTYCHON AKOLOUTHIA-2 parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'akolouthia2', parentCosts: { akolouthia2: directTokens } };
}

function measuredDaedalus(text: string, enc: EncodingName): MeasureParent {
  const parent = daedalusEncode(text, enc);
  const directTokens = countTokens(parent.decoderPrompt, enc);
  if (!parent.exact || parent.decoded !== text || directTokens !== parent.messageTokens) {
    throw new Error('DIPTYCHON DAEDALUS parent did not reconstruct or its reported cost disagreed');
  }
  return { wire: parent.wire, message: parent.decoderPrompt, decoded: parent.decoded, messageTokens: directTokens, parentCodec: 'daedalus', parentCosts: { daedalus: directTokens } };
}

function measuredApographe(text: string, enc: EncodingName): MeasureParent {
  const parent = apographeEncode(text, enc);
  const decoded = apographeDecodeResult(parent);
  const message = ((parent as any).contract ? (parent as any).contract + '\n' : '') + parent.wire;
  const directTokens = countTokens(message, enc);
  if (decoded !== text) throw new Error('DIPTYCHON APOGRAPHE parent did not reconstruct');
  return { wire: parent.wire, message, decoded, messageTokens: directTokens, parentCodec: 'apographe', parentCosts: { apographe: directTokens } };
}

function cheapestOf(parents: MeasureParent[]): MeasureParent {
  const costs: Record<string, number> = {};
  for (const p of parents) costs[p.parentCodec] = p.messageTokens;
  const best = [...parents].sort((x, y) => x.messageTokens - y.messageTokens)[0]!;
  return { ...best, parentCosts: costs };
}

function measuredFrontier(text: string, enc: EncodingName): MeasureParent {
  const tag: TagstackResult = tagstackEncode(text, enc);
  if (!tag.frontierComplete || !tag.exact || tag.decoded !== text) {
    throw new Error('DIPTYCHON baseline frontier did not complete exactly');
  }
  const sibling: SiblingTemplateResult = siblingTemplateEncode(text, enc, tag);
  if (!sibling.exact || sibling.decoded !== text) {
    throw new Error('DIPTYCHON SIBLING-TEMPLATE parent did not reconstruct exactly');
  }
  const parentCosts = { ...tag.frontierCosts, 'sibling-template': sibling.messageTokens };
  const siblingWon = sibling.applied && sibling.messageTokens < tag.messageTokens;
  return {
    wire: siblingWon ? sibling.wire : tag.wire,
    message: siblingWon ? sibling.message : tag.message,
    decoded: text,
    messageTokens: Math.min(tag.messageTokens, sibling.messageTokens),
    parentCodec: siblingWon ? 'sibling-template' : tag.parentCodec,
    parentCosts,
  };
}

function fallbackResult(
  text: string,
  inTokens: number,
  parent: MeasureParent,
  plan: DiptychonPlan | null,
  candidateTokens: number | null,
  candidateExact: boolean | null,
  comparison: string,
  notes: string,
  ms: number,
  candidateParent: MeasureParent | null = null,
  fullFrontierMeasured = false,
  precheckParentTokens = parent.messageTokens,
): DiptychonResult {
  return {
    codec: 'diptychon', wire: parent.wire, message: parent.message, decoded: text,
    exact: parent.decoded === text, inTokens, precheckParentTokens,
    parentTokens: parent.messageTokens, messageTokens: parent.messageTokens,
    parentCodec: parent.parentCodec, parentCosts: parent.parentCosts, fullFrontierMeasured,
    applied: false,
    format: plan?.spec.format ?? null, compact: plan?.spec.compact ?? null,
    dataLines: plan?.dataLines ?? 0, totalBytes: plan?.totalBytes ?? 0,
    candidateTokens, candidateExact,
    candidateParentTokens: candidateParent?.messageTokens ?? null,
    candidateParentCodec: candidateParent?.parentCodec ?? null,
    candidateParentCosts: candidateParent?.parentCosts ?? null,
    comparison, notes, ms,
  };
}

/**
 * Encode with a two-member necessary-condition precheck (AKOLOUTHIA-2 and
 * APOGRAPHE are both in the X49 TAGSTACK runtime-parent set), then the full
 * TAGSTACK + SIBLING-TEMPLATE frontier for candidates that clear it.
 */
export function diptychonEncode(text: string, enc: EncodingName = 'o200k_base'): DiptychonResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  const akoParent = measuredAkolouthia2(text, enc);
  const plan = diptychonPlan(text, enc);
  if (!plan) {
    return fallbackResult(text, inTokens, akoParent, null, null, null,
      'AKOLOUTHIA-2 fallback only; no verified hexdump candidate was formed',
      'input is not a canonical od/xxd/hexdump -C dump that re-renders byte-exactly; returned the exact AKOLOUTHIA-2 message',
      Date.now() - started);
  }

  let apoParent: MeasureParent;
  try {
    apoParent = measuredApographe(text, enc);
  } catch {
    return fallbackResult(text, inTokens, akoParent, plan, null, null,
      'APOGRAPHE precheck parent failed',
      'returned the exact AKOLOUTHIA-2 message; no candidate was emitted', Date.now() - started);
  }
  const precheck = cheapestOf([akoParent, apoParent]);

  let candidateParent: MeasureParent;
  try {
    candidateParent = cheapestOf([
      measuredDaedalus(plan.reducedText, enc),
      measuredAkolouthia2(plan.reducedText, enc),
      measuredApographe(plan.reducedText, enc),
    ]);
  } catch {
    return fallbackResult(text, inTokens, precheck, plan, null, null,
      'candidate parent exactness/cost check failed',
      'returned the cheapest measured exact precheck parent', Date.now() - started, null, false, precheck.messageTokens);
  }
  const candidateMessage = `${plan.contract}\n${candidateParent.message}`;
  const candidateTokens = countTokens(candidateMessage, enc);
  let decoded: string | null = null;
  try {
    decoded = diptychonRestore(candidateParent.decoded, plan.spec);
  } catch {
    decoded = null;
  }
  const candidateExact = decoded === text;
  if (!candidateExact) {
    return fallbackResult(text, inTokens, precheck, plan, candidateTokens, false,
      'candidate exactness rejection',
      'candidate inverse failed byte exactness; returned the cheapest measured exact precheck parent',
      Date.now() - started, candidateParent, false, precheck.messageTokens);
  }

  if (candidateTokens >= precheck.messageTokens) {
    return fallbackResult(text, inTokens, precheck, plan, candidateTokens, true,
      'AKOLOUTHIA-2/APOGRAPHE necessary-condition rejection; full TAGSTACK/SIBLING tournament safely skipped',
      `candidate M=${candidateTokens} >= measured frontier member M=${precheck.messageTokens} (${precheck.parentCodec}); it therefore cannot be below a frontier that includes that member`,
      Date.now() - started, candidateParent, false, precheck.messageTokens);
  }

  let frontier: MeasureParent;
  try {
    frontier = measuredFrontier(text, enc);
  } catch {
    return fallbackResult(text, inTokens, precheck, plan, candidateTokens, true,
      'candidate cleared the precheck but the full TAGSTACK/SIBLING tournament did not complete',
      'returned the cheapest measured exact precheck parent; no full-frontier win is claimed',
      Date.now() - started, candidateParent, false, precheck.messageTokens);
  }
  if (candidateTokens >= frontier.messageTokens) {
    return fallbackResult(text, inTokens, frontier, plan, candidateTokens, true,
      'full TAGSTACK/SIBLING same-source frontier rejection',
      `candidate M=${candidateTokens} >= measured frontier M=${frontier.messageTokens}; returned the measured best parent`,
      Date.now() - started, candidateParent, true, precheck.messageTokens);
  }
  return {
    codec: 'diptychon', wire: candidateParent.wire, message: candidateMessage, decoded: decoded!,
    exact: true, inTokens, precheckParentTokens: precheck.messageTokens,
    parentTokens: frontier.messageTokens, messageTokens: candidateTokens,
    parentCodec: frontier.parentCodec, parentCosts: frontier.parentCosts,
    fullFrontierMeasured: true, applied: true,
    format: plan.spec.format, compact: plan.spec.compact,
    dataLines: plan.dataLines, totalBytes: plan.totalBytes,
    candidateTokens, candidateExact: true,
    candidateParentTokens: candidateParent.messageTokens,
    candidateParentCodec: candidateParent.parentCodec,
    candidateParentCosts: candidateParent.parentCosts,
    comparison: 'strict complete-message TAGSTACK runtime-parent set plus SIBLING-TEMPLATE',
    notes: `re-rendered a ${plan.spec.format} dump (${plan.dataLines} data lines, ${plan.totalBytes} bytes, compact=${plan.spec.compact}); complete-message M=${candidateTokens} < same-source frontier M=${frontier.messageTokens}`,
    ms: Date.now() - started,
  };
}
