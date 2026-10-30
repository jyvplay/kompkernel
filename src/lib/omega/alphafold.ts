/**
 * ALPHAFOLD — in-band alpha-equivalent code-block factoring (X63).
 *
 * It finds byte-identical code blocks modulo a consistent renaming of lexical
 * identifiers, transmits one exact block template plus a comma-separated list
 * of identifier spellings per occurrence, and keeps all surrounding source bytes.
 * It does not require a parser or dictionary at decode time: the message says
 * which template/slot list to instantiate. The encoder is deliberately
 * conservative (bounded scanner, reserved-marker refusal, exact inverse gate)
 * and falls back to the measured source frontier unless the complete candidate
 * wins. This is a repository-level transform experiment, not a novelty claim.
 */
import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, type TagstackResult } from './tagstack';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';

export const ALPHAFOLD_MAX_CHARS = 200_000;
export const ALPHAFOLD_MAX_DECODED_CHARS = 1_000_000;
export const ALPHAFOLD_CONTRACT = 'ALPHAFOLD/1 slots=⟪,⟫; refs=⟦,⟧: Template sections ⟦Tn⟧...⟦/Tn⟧ hold exact text; ⟪i⟫ is slot i. In BODY, ⟦n|name,name,...⟧ instantiates template n using the comma-separated exact identifier names. Template IDs and slots are zero-based. Expand references; copy every other BODY character literally.';
const KEYWORDS = new Set(`
  as async await break case catch class const continue debugger default delete do else export extends
  false finally for from function get if implements import in instanceof interface let new null of
  package private protected public readonly return set static super switch this throw true try type
  typeof var void while with yield abstract any boolean constructor declare is keyof module namespace
  never number object require string symbol undefined unique unknown
`.trim().split(/\s+/));

interface Lex { start: number; end: number; raw: string; kind: 'id' | 'word' | 'space' | 'opaque' | 'punct' }
interface Block { start: number; end: number; canonical: string; names: string[]; template: string; length: number }
interface MarkerSet { refOpen: string; refClose: string; slotOpen: string; slotClose: string }

function isIdStart(c: string): boolean { return /[A-Za-z_$]/.test(c); }
function isIdPart(c: string): boolean { return /[A-Za-z0-9_$]/.test(c); }

/** Lossless conservative lexer. Strings, templates, and comments are opaque. */
function lex(text: string): Lex[] {
  const out: Lex[] = [];
  let i = 0;
  while (i < text.length) {
    const start = i, c = text[i];
    if (/\s/.test(c)) {
      while (i < text.length && /\s/.test(text[i])) i++;
      out.push({ start, end: i, raw: text.slice(start, i), kind: 'space' }); continue;
    }
    if ((c === '"' || c === "'" || c === '`')) {
      const q = c; i++;
      while (i < text.length) {
        if (text[i] === '\\') { i += Math.min(2, text.length - i); continue; }
        if (text[i++] === q) break;
      }
      if (text[i - 1] !== q) throw new Error('unterminated string/template');
      out.push({ start, end: i, raw: text.slice(start, i), kind: 'opaque' }); continue;
    }
    if (c === '/' && text[i + 1] === '/') {
      i += 2; while (i < text.length && text[i] !== '\n' && text[i] !== '\r') i++;
      out.push({ start, end: i, raw: text.slice(start, i), kind: 'opaque' }); continue;
    }
    if (c === '/' && text[i + 1] === '*') {
      const at = text.indexOf('*/', i + 2);
      if (at < 0) throw new Error('unterminated comment');
      i = at + 2; out.push({ start, end: i, raw: text.slice(start, i), kind: 'opaque' }); continue;
    }
    if (isIdStart(c)) {
      i++; while (i < text.length && isIdPart(text[i])) i++;
      const raw = text.slice(start, i);
      out.push({ start, end: i, raw, kind: KEYWORDS.has(raw) ? 'word' : 'id' }); continue;
    }
    i++;
    out.push({ start, end: i, raw: c, kind: 'punct' });
  }
  return out;
}

function canonicalize(text: string, start: number, end: number, relevant: Lex[], markers: MarkerSet): Block {
  const names: string[] = [];
  const ids = new Map<string, number>();
  const tuple: unknown[] = [];
  let template = '', cursor = start;
  for (const t of relevant) {
    if (t.start < cursor) continue;
    if (t.kind === 'id') {
      let slot = ids.get(t.raw);
      if (slot === undefined) { slot = names.length; names.push(t.raw); ids.set(t.raw, slot); }
      tuple.push(['slot', slot]);
      template += text.slice(cursor, t.start) + `${markers.slotOpen}${slot}${markers.slotClose}`;
    } else {
      tuple.push([t.kind, t.raw]);
      template += text.slice(cursor, t.end);
    }
    cursor = t.end;
  }
  template += text.slice(cursor, end);
  return { start, end, canonical: JSON.stringify(tuple), names, template, length: end - start };
}

const MARKER_SETS: MarkerSet[] = [
  { refOpen: '⟦', refClose: '⟧', slotOpen: '⟪', slotClose: '⟫' },
  { refOpen: '§', refClose: '¶', slotOpen: '※', slotClose: '⁂' },
  { refOpen: '¤', refClose: '¥', slotOpen: '‡', slotClose: '†' },
];
function markerSetAbsent(text: string): MarkerSet | null {
  return MARKER_SETS.find((m) => ![m.refOpen, m.refClose, m.slotOpen, m.slotClose].some((x) => text.includes(x))) ?? null;
}
function markerSetFromHeader(header: string): MarkerSet | null {
  return MARKER_SETS.find((m) => header.includes(`slots=${m.slotOpen},${m.slotClose}; refs=${m.refOpen},${m.refClose}`)) ?? null;
}

/** Find repeated balanced brace blocks modulo identifier names. */
function blockGroups(text: string, markers: MarkerSet): Block[][] {
  const lexed = lex(text);
  const stack: Array<{ token: Lex; index: number }> = [];
  const groups = new Map<string, Block[]>();
  let blocks = 0, work = 0;
  for (let ti = 0; ti < lexed.length; ti++) {
    const token = lexed[ti];
    if (token.kind !== 'punct') continue;
    if (token.raw === '{') stack.push({ token, index: ti });
    else if (token.raw === '}' && stack.length) {
      const open = stack.pop()!;
      const length = token.end - open.token.start;
      if (length < 80 || length > 10_000) continue;
      work += ti - open.index + 1;
      if (work > 3_000_000) return [];
      const b = canonicalize(text, open.token.start, token.end, lexed.slice(open.index, ti + 1), markers);
      if (!b.names.length) continue;
      const group = groups.get(b.canonical) ?? [];
      group.push(b); groups.set(b.canonical, group);
      if (++blocks > 20_000) return [];
    }
  }
  return [...groups.values()].filter((g) => g.length > 1);
}

/** Full single-message transform with templates and maps carried in-band. */
export function alphafoldPlan(text: string): string | null {
  if (!text || text.length > ALPHAFOLD_MAX_CHARS) return null;
  const markers = markerSetAbsent(text);
  if (!markers) return null;
  let groups: Block[][];
  try { groups = blockGroups(text, markers); } catch { return null; }
  const candidates = groups.map((g) => {
    const first = g[0];
    const varying = first.names.map((name, i) => g.some((b) => b.names[i] !== name) ? i : -1).filter((i) => i >= 0);
    const refCost = (b: Block) => markers.refOpen.length + markers.refClose.length
      + String(varying.length).length + 4
      + varying.reduce((n, i) => n + b.names[i].length + 1, 0);
    const charGain = g.reduce((n, b) => n + b.length - refCost(b), 0) - first.length - 12;
    return { g, varying, charGain };
  }).filter((c) => c.varying.length > 0 && c.charGain > 0).sort((a, b) => b.charGain - a.charGain || a.g[0].start - b.g[0].start);
  const chosen: Array<{ g: Block[]; varying: number[]; charGain: number }> = [];
  const occupied: Array<[number, number]> = [];
  for (const candidate of candidates) {
    const spans = candidate.g.map((b) => [b.start, b.end] as [number, number]);
    if (spans.some(([a, z]) => occupied.some(([x, y]) => a < y && x < z))) continue;
    chosen.push(candidate); occupied.push(...spans);
    if (chosen.length >= 64) break;
  }
  if (!chosen.length) return null;
  chosen.sort((a, b) => a.g[0].start - b.g[0].start);
  const templates: string[] = [];
  const replacements: Array<{ start: number; end: number; text: string }> = [];
  for (let id = 0; id < chosen.length; id++) {
    const group = chosen[id].g;
    const varying = chosen[id].varying;
    let template = group[0].template;
    for (let i = 0; i < group[0].names.length; i++) {
      const oldSlot = `${markers.slotOpen}${i}${markers.slotClose}`;
      const varyingIndex = varying.indexOf(i);
      const replacement = varyingIndex < 0
        ? group[0].names[i]
        : `${markers.slotOpen}${varyingIndex}${markers.slotClose}`;
      template = template.split(oldSlot).join(replacement);
    }
    templates.push(`${markers.refOpen}T${id}${markers.refClose}\n${template}\n${markers.refOpen}/T${id}${markers.refClose}`);
    for (const b of group) {
      const map = varying.map((i) => b.names[i]).join(',');
      replacements.push({ start: b.start, end: b.end,
        text: `${markers.refOpen}${id}|${map}${markers.refClose}` });
    }
  }
  replacements.sort((a, b) => b.start - a.start);
  let body = text;
  for (const r of replacements) body = body.slice(0, r.start) + r.text + body.slice(r.end);
  const bodyMark = `${markers.refOpen}BODY${markers.refClose}`;
  const contract = ALPHAFOLD_CONTRACT.split('⟦').join(markers.refOpen).split('⟧').join(markers.refClose)
    .split('⟪').join(markers.slotOpen).split('⟫').join(markers.slotClose);
  const wire = `${contract}\n${templates.join('\n')}\n${bodyMark}\n${body}`;
  return alphafoldExpand(wire) === text ? wire : null;
}

/** Decode only from the one message; null rejects malformed or ambiguous framing. */
export function alphafoldExpand(wire: string): string | null {
  if (wire.length > ALPHAFOLD_MAX_DECODED_CHARS) return null;
  const firstNl = wire.indexOf('\n');
  if (firstNl < 0) return null;
  const header = wire.slice(0, firstNl);
  const markers = markerSetFromHeader(header);
  if (!markers || !header.startsWith('ALPHAFOLD/1 ')) return null;
  const rest = wire.slice(firstNl + 1);
  const bodyMark = `${markers.refOpen}BODY${markers.refClose}`;
  const bodyAt = rest.indexOf(bodyMark + '\n');
  if (bodyAt < 0) return null;
  const defText = rest.slice(0, bodyAt);
  let body = rest.slice(bodyAt + bodyMark.length + 1);
  const templates = new Map<number, string>();
  let cursor = 0;
  while (cursor < defText.length) {
    if (defText[cursor] === '\n') { cursor++; continue; }
    const open = defText.slice(cursor).match(new RegExp(`^${escapeRe(markers.refOpen)}T(\\d+)${escapeRe(markers.refClose)}\\n`));
    if (!open) return null;
    const id = Number(open[1]);
    const contentStart = cursor + open[0].length;
    const endMarker = `\n${markers.refOpen}/T${id}${markers.refClose}`;
    const end = defText.indexOf(endMarker, contentStart);
    if (end < 0 || templates.has(id)) return null;
    templates.set(id, defText.slice(contentStart, end));
    cursor = end + endMarker.length;
  }
  if (!templates.size) return null;
  let out = '';
  cursor = 0;
  while (cursor < body.length) {
    const at = body.indexOf(markers.refOpen, cursor);
    if (at < 0) {
      const tail = body.slice(cursor);
      if (out.length + tail.length > ALPHAFOLD_MAX_DECODED_CHARS) return null;
      out += tail;
      break;
    }
    const literal = body.slice(cursor, at);
    if (out.length + literal.length > ALPHAFOLD_MAX_DECODED_CHARS) return null;
    out += literal;
    const end = body.indexOf(markers.refClose, at + markers.refOpen.length);
    if (end < 0) return null;
    const inside = body.slice(at + markers.refOpen.length, end);
    const bar = inside.indexOf('|');
    if (bar < 1 || !/^\d+$/u.test(inside.slice(0, bar))) return null;
    const id = Number(inside.slice(0, bar));
    const template = templates.get(id);
    if (template === undefined) return null;
    const mapText = inside.slice(bar + 1);
    const names = mapText ? mapText.split(',') : [];
    if (names.some((n) => !/^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(n))) return null;
    const slotPattern = new RegExp(`${escapeRe(markers.slotOpen)}(\\d+)${escapeRe(markers.slotClose)}`, 'gu');
    const used = new Set<number>();
    let predictedLength = template.length;
    let slot: RegExpExecArray | null;
    while ((slot = slotPattern.exec(template)) !== null) {
      const slotId = Number(slot[1]);
      if (!Number.isSafeInteger(slotId) || slotId >= names.length) return null;
      used.add(slotId);
      predictedLength += names[slotId].length - slot[0].length;
      if (predictedLength > ALPHAFOLD_MAX_DECODED_CHARS) return null;
    }
    if (used.size !== names.length) return null;
    let expanded = template;
    for (let i = 0; i < names.length; i++) expanded = expanded.split(`${markers.slotOpen}${i}${markers.slotClose}`).join(names[i]);
    if (new RegExp(`${escapeRe(markers.slotOpen)}\\d+${escapeRe(markers.slotClose)}`).test(expanded)) return null;
    if (out.length + expanded.length > ALPHAFOLD_MAX_DECODED_CHARS) return null;
    out += expanded;
    cursor = end + markers.refClose.length;
  }
  return out;
}

function escapeRe(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

export interface AlphaFoldResult {
  codec: 'alphafold'; message: string; decoded: string; exact: boolean; applied: boolean;
  inTokens: number; messageTokens: number; frontierTokens: number; parentCodec: string;
  templates: number; references: number; transformedChars: number; planMs: number;
  fullFrontierMeasured: boolean; comparison: string;
}
function minimum(tag: TagstackResult, sibling: SiblingTemplateResult) {
  return tag.messageTokens <= sibling.messageTokens
    ? { message: tag.message, decoded: tag.decoded, tokens: tag.messageTokens, parent: tag.parentCodec, complete: tag.frontierComplete }
    : { message: sibling.message, decoded: sibling.decoded, tokens: sibling.messageTokens, parent: sibling.parentCodec, complete: true };
}

/** Measured complete-message gate, same scope as RHIZOMA (not registry-wide). */
export function alphafoldEncode(text: string, enc: EncodingName = 'o200k_base'): AlphaFoldResult {
  const t0 = Date.now();
  const wire = alphafoldPlan(text);
  const planMs = Date.now() - t0;
  const inTokens = countTokens(text, enc);
  const tag = tagstackEncode(text, enc);
  const sib = siblingTemplateEncode(text, enc, tag);
  const source = minimum(tag, sib);
  const sourceExact = tag.exact && sib.exact && tag.decoded === text && sib.decoded === text;
  const fallback: AlphaFoldResult = {
    codec: 'alphafold', message: source.message, decoded: text, exact: sourceExact,
    applied: false, inTokens, messageTokens: source.tokens, frontierTokens: source.tokens,
    parentCodec: source.parent, templates: 0, references: 0, transformedChars: text.length,
    planMs, fullFrontierMeasured: source.complete,
    comparison: wire ? 'no strict complete-message gain; exact measured-frontier fallback' : 'no repeated alpha-equivalent blocks admitted; exact fallback',
  };
  if (!wire || !source.complete || !sourceExact) return fallback;
  const ct = tagstackEncode(wire, enc);
  const cs = siblingTemplateEncode(wire, enc, ct);
  const candidate = minimum(ct, cs);
  const exact = ct.exact && cs.exact && ct.decoded === wire && cs.decoded === wire && alphafoldExpand(candidate.decoded) === text;
  if (!candidate.complete || !exact) return { ...fallback, comparison: 'candidate frontier incomplete or exact inverse failed; fallback' };
  if (candidate.tokens >= source.tokens) return { ...fallback, comparison: `exact candidate ${candidate.tokens} >= measured source frontier ${source.tokens}; fallback` };
  const header = wire.slice(0, wire.indexOf('\n'));
  const markers = markerSetFromHeader(header)!;
  const bodyMark = `${markers.refOpen}BODY${markers.refClose}`;
  const bodyAt = wire.indexOf(`${bodyMark}\n`);
  const escapedOpen = escapeRe(markers.refOpen), escapedClose = escapeRe(markers.refClose);
  const references = (wire.match(new RegExp(`${escapedOpen}\\d+\\|`, 'gu')) ?? []).length;
  const templates = (wire.match(new RegExp(`${escapedOpen}T\\d+${escapedClose}`, 'gu')) ?? []).length;
  return { codec: 'alphafold', message: candidate.message, decoded: text, exact: true, applied: true,
    inTokens, messageTokens: candidate.tokens, frontierTokens: source.tokens,
    parentCodec: `${source.parent}→${candidate.parent}`, templates, references,
    transformedChars: bodyAt < 0 ? wire.length : wire.length - bodyAt - bodyMark.length - 1,
    planMs, fullFrontierMeasured: true, comparison: `strict exact complete-message win ${candidate.tokens} < ${source.tokens}` };
}
