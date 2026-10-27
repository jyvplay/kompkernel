/**
 * NEST — recursive repeated-sibling template factoring (X48 candidate).
 *
 * SIBLING-TEMPLATE factors XML-compatible siblings only when their direct
 * children are text-only. NEST keeps the same lossless in-band idea but allows
 * corresponding subtrees to recurse: exact tag topology is shared once, while
 * any differing opening-tag bytes or text between corresponding child nodes
 * become explicit per-record slots. The prior-art boundary is deliberately
 * narrow: XML/HTML structural compressors and tree grammars are established;
 * this module claims a new bounded message-codec path in this repository, not
 * a new compression-theory primitive.
 *
 * The candidate is serialized as one literal template, a declared join string,
 * and rows of slot values. It is decoded only after the in-band parent codec.
 * The final complete message must be byte-exact and strictly cheaper than both
 * TAGSTACK's measured frontier result and SIBLING-TEMPLATE's result.
 */

import { countTokens, type EncodingName } from './bpe';
import { apographeDecodeResult, apographeEncode } from './apographe';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';
import { tagstackEncode, type TagstackResult } from './tagstack';

export const NEST_MAX_CHARS = 100_000;
export const NEST_MAX_NODES = 50_000;
export const NEST_MAX_DEPTH = 128;
export const NEST_MAX_WORK = 2_000_000;
export const NEST_MAX_CANDIDATES = 256;
export const NEST_MAX_SLOTS = 512;
export const NEST_MIN_RECORDS = 3;

const HTML_VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
const HTML_RAWTEXT = new Set(['script', 'style', 'textarea', 'title']);
const MARKERS = ['⟪', '⟫', '§', '¤', '‡', '°', 'µ', '◆', '⁞', '␟', '‖', '¶', '¦', '※', '~', '^', '@', '!', '%', '+', '='];
const SLOT_RE_SOURCE = String.raw`\{\{([1-9][0-9]*)\}\}`;

export interface NestDelimiters {
  open: string;
  close: string;
  templateEnd: string;
  metaEnd: string;
  field: string;
  row: string;
  ref: string;
}

interface ElementNode {
  name: string;
  start: number;
  openEnd: number;
  closeStart: number;
  end: number;
  selfClosing: boolean;
  shapeId: number;
  children: ElementNode[];
}

export interface NestPlan {
  transformed: string;
  sourceStart: number;
  sourceEnd: number;
  records: number;
  slots: number;
  elementName: string;
  depth: number;
  delimiters: NestDelimiters;
  separator: string;
  template: string;
  columns: string[][];
  proxyGain: number;
  shapeWork: number;
}

export interface NestResult {
  codec: 'nest';
  wire: string;
  message: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  messageTokens: number;
  parentTokens: number;
  parentCodec: string;
  frontierCosts: TagstackResult['frontierCosts'];
  applied: boolean;
  records: number;
  slots: number;
  elementName: string | null;
  depth: number;
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateMessage: string | null;
  plan: NestPlan | null;
  notes: string;
  ms: number;
}

interface ParsedMarkup { roots: ElementNode[]; nodes: ElementNode[]; mode: 'xml' | 'html' }
interface TagToken { kind: 'open' | 'close' | 'opaque'; name: string; end: number; selfClosing: boolean }

function isSpace(c: string): boolean { return c === ' ' || c === '\t' || c === '\n' || c === '\r' || c === '\f'; }
function isNameStart(c: string): boolean { return c.length === 1 && /^[A-Za-z_:]$/.test(c); }
function isNameChar(c: string): boolean { return c.length === 1 && /^[A-Za-z0-9_.:-]$/.test(c); }

function declarationEnd(text: string, start: number): number {
  let quote = '';
  let subset = 0;
  for (let i = start + 2; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '[') { subset++; continue; }
    if (c === ']' && subset > 0) { subset--; continue; }
    if (c === '>' && subset === 0) return i + 1;
  }
  return -1;
}

function parseTag(text: string, at: number): TagToken | null | false {
  if (text.startsWith('<!--', at)) {
    const end = text.indexOf('-->', at + 4);
    return end < 0 ? false : { kind: 'opaque', name: '', end: end + 3, selfClosing: false };
  }
  if (text.startsWith('<![CDATA[', at)) {
    const end = text.indexOf(']]>', at + 9);
    return end < 0 ? false : { kind: 'opaque', name: '', end: end + 3, selfClosing: false };
  }
  if (text.startsWith('<?', at)) {
    const end = text.indexOf('?>', at + 2);
    return end < 0 ? false : { kind: 'opaque', name: '', end: end + 2, selfClosing: false };
  }
  if (text.startsWith('<!', at)) {
    const end = declarationEnd(text, at);
    return end < 0 ? false : { kind: 'opaque', name: '', end, selfClosing: false };
  }

  const closing = text[at + 1] === '/';
  const nameAt = at + (closing ? 2 : 1);
  if (nameAt >= text.length || !isNameStart(text[nameAt])) return closing ? false : null;
  let nameEnd = nameAt + 1;
  while (nameEnd < text.length && isNameChar(text[nameEnd])) nameEnd++;
  const name = text.slice(nameAt, nameEnd);
  if (closing) {
    if (text[nameEnd] !== '>') return false;
    return { kind: 'close', name, end: nameEnd + 1, selfClosing: false };
  }

  let quote = '';
  let end = -1;
  for (let i = nameEnd; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '<') return false;
    if (c === '>') { end = i + 1; break; }
  }
  if (end < 0 || quote) return false;
  let last = end - 2;
  while (last >= nameEnd && isSpace(text[last])) last--;
  return { kind: 'open', name, end, selfClosing: text[last] === '/' };
}

function isForeign(stack: ElementNode[]): boolean {
  return stack.some(n => n.name.toLowerCase() === 'svg' || n.name.toLowerCase() === 'math');
}

function rawTextClosingAt(text: string, from: number, name: string): number {
  const lower = text.toLowerCase();
  let at = from;
  while (at < text.length) {
    const found = lower.indexOf('</' + name.toLowerCase(), at);
    if (found < 0) return -1;
    const next = text[found + name.length + 2];
    if (next === '>' || isSpace(next ?? '')) return found;
    at = found + name.length + 2;
  }
  return -1;
}

function parseMarkup(text: string): ParsedMarkup | null {
  if (!text.length || text.length > NEST_MAX_CHARS) return null;
  const lead = text.replace(/^\uFEFF/, '').trimStart();
  const mode: 'xml' | 'html' = /^<!doctype\s+html(?:\s|>)/i.test(lead) || /^<html(?:\s|>)/i.test(lead) ? 'html' : 'xml';
  const roots: ElementNode[] = [];
  const nodes: ElementNode[] = [];
  const stack: ElementNode[] = [];
  const intern = new Map<string, number>();
  let nextShape = 1;
  const assignShape = (node: ElementNode): void => {
    const key = `${node.name}\u0000${node.selfClosing ? '1' : '0'}\u0000${node.children.map(c => c.shapeId).join(',')}`;
    let id = intern.get(key);
    if (id === undefined) { id = nextShape++; intern.set(key, id); }
    node.shapeId = id;
  };
  let pos = 0;
  while (pos < text.length) {
    if (mode === 'html' && stack.length && !isForeign(stack) && HTML_RAWTEXT.has(stack[stack.length - 1].name.toLowerCase())) {
      const closeAt = rawTextClosingAt(text, pos, stack[stack.length - 1].name);
      if (closeAt < 0) return null;
      pos = closeAt;
    }
    const at = text.indexOf('<', pos);
    if (at < 0) break;
    const token = parseTag(text, at);
    if (token === false) return null;
    if (token === null) {
      if (text.startsWith('</', at)) return null;
      pos = at + 1;
      continue;
    }
    if (token.kind === 'opaque') { pos = token.end; continue; }
    if (token.kind === 'close') {
      const top = stack.pop();
      if (!top) return null;
      const matches = mode === 'html' ? top.name.toLowerCase() === token.name.toLowerCase() : top.name === token.name;
      if (!matches) return null;
      top.closeStart = at;
      top.end = token.end;
      assignShape(top);
      pos = token.end;
      continue;
    }
    const inHtmlForeign = mode === 'html' && isForeign(stack);
    const isVoid = mode === 'html' && !inHtmlForeign && HTML_VOID.has(token.name.toLowerCase());
    const selfClosing = token.selfClosing || isVoid;
    const node: ElementNode = {
      name: token.name, start: at, openEnd: token.end,
      closeStart: selfClosing ? token.end : -1, end: selfClosing ? token.end : -1,
      selfClosing, shapeId: 0, children: [],
    };
    if (stack.length) stack[stack.length - 1].children.push(node);
    else roots.push(node);
    nodes.push(node);
    if (nodes.length > NEST_MAX_NODES) return null;
    if (selfClosing) assignShape(node);
    else {
      if (stack.length >= NEST_MAX_DEPTH) return null;
      stack.push(node);
    }
    pos = token.end;
  }
  if (stack.length) return null;
  return { roots, nodes, mode };
}

function chooseDelimiters(text: string, enc: EncodingName): NestDelimiters | null {
  if (/\{\{[1-9][0-9]*\}\}/.test(text)) return null;
  const safe = MARKERS.filter(marker => !text.includes(marker) && countTokens(marker, enc) === 1);
  if (safe.length < 7) return null;
  return { open: safe[0], close: safe[1], templateEnd: safe[2], metaEnd: safe[3], field: safe[4], row: safe[5], ref: safe[6] };
}

interface TemplateData { template: string; columns: string[][]; depth: number; work: number }
interface ShapeBudget { used: number; exhausted: boolean }
function makeTemplate(text: string, records: ElementNode[], budget: ShapeBudget): TemplateData | null {
  if (!records.length) return null;
  const columns: string[][] = [];
  const startWork = budget.used;
  const state = { depth: 0 };
  const field = (values: string[]): string | null => {
    for (const v of values) budget.used += v.length + 1;
    if (budget.used > NEST_MAX_WORK) { budget.exhausted = true; return null; }
    if (values.every(v => v === values[0])) return values[0];
    if (columns.length >= NEST_MAX_SLOTS) return null;
    columns.push(values);
    return `{{${columns.length}}}`;
  };
  const render = (nodes: ElementNode[], depth: number): string | null => {
    if (depth > NEST_MAX_DEPTH || nodes.some(n => n.shapeId !== nodes[0].shapeId)) return null;
    state.depth = Math.max(state.depth, depth);
    const open = field(nodes.map(n => text.slice(n.start, n.openEnd)));
    if (open === null) return null;
    let out = open;
    if (nodes[0].selfClosing) return out;
    const cursors = nodes.map(n => n.openEnd);
    const childCount = nodes[0].children.length;
    for (let i = 0; i < childCount; i++) {
      const childNodes = nodes.map(n => n.children[i]);
      const between = field(nodes.map((n, k) => text.slice(cursors[k], childNodes[k].start)));
      if (between === null) return null;
      const child = render(childNodes, depth + 1);
      if (child === null) return null;
      out += between + child;
      for (let k = 0; k < nodes.length; k++) cursors[k] = childNodes[k].end;
    }
    const trailing = field(nodes.map((n, k) => text.slice(cursors[k], n.closeStart)));
    if (trailing === null) return null;
    const close = field(nodes.map(n => text.slice(n.closeStart, n.end)));
    if (close === null) return null;
    return out + trailing + close;
  };
  const template = render(records, 1);
  if (template === null || !columns.length) return null;
  return { template, columns, depth: state.depth, work: budget.used - startWork };
}

function buildMacro(template: string, columns: string[][], body: string, d: NestDelimiters): string {
  // A shared tree template is defined once; each occurrence is a one-token
  // reference left in place in the original document body. Slot streams are
  // column-major so repeated values remain adjacent to the parent's BPE.
  const columnData = columns.map(c => c.join(d.row)).join(d.field);
  return d.open + template + d.templateEnd + columnData + d.metaEnd + body + d.close;
}

/**
 * Search for globally repeated, non-overlapping subtrees with identical exact
 * tag topology. Define one recursive template and replace each occurrence in
 * place with a one-token reference; the original layout and all non-target
 * content remain in the body. This is a bounded dictionary/tree-grammar path,
 * not a claim of a new structural-compression primitive.
 */
export function nestTransformCandidates(text: string, enc: EncodingName = 'o200k_base', limit = 8): NestPlan[] {
  const parsed = parseMarkup(text);
  if (!parsed) return [];
  const delimiters = chooseDelimiters(text, enc);
  if (!delimiters) return [];
  const groups = new Map<number, ElementNode[]>();
  for (const node of parsed.nodes) {
    const group = groups.get(node.shapeId) ?? [];
    group.push(node);
    groups.set(node.shapeId, group);
  }
  const plans: NestPlan[] = [];
  const maxPlans = Math.max(1, Math.min(32, Math.floor(limit)));
  const budget: ShapeBudget = { used: 0, exhausted: false };
  let candidates = 0;
  for (const group0 of groups.values()) {
    if (group0.length < NEST_MIN_RECORDS) continue;
    const group: ElementNode[] = [];
    let lastEnd = -1;
    for (const node of group0) {
      if (node.start >= lastEnd) { group.push(node); lastEnd = node.end; }
    }
    if (group.length < NEST_MIN_RECORDS) continue;
    if (++candidates > NEST_MAX_CANDIDATES) break;
    const data = makeTemplate(text, group, budget);
    if (budget.exhausted) break;
    if (!data) continue;
    const bodyParts: string[] = [];
    let cursor = 0;
    for (const node of group) {
      bodyParts.push(text.slice(cursor, node.start), delimiters.ref);
      cursor = node.end;
    }
    bodyParts.push(text.slice(cursor));
    const body = bodyParts.join('');
    budget.used += body.length + data.columns.reduce((n, c) => n + c.length, 0);
    if (budget.used > NEST_MAX_WORK) break;
    const macro = buildMacro(data.template, data.columns, body, delimiters);
    budget.used += macro.length;
    if (budget.used > NEST_MAX_WORK) break;
    if (nestRestore(macro, delimiters) !== text) continue;
    const proxyGain = countTokens(text, enc) - countTokens(macro, enc);
    if (proxyGain > 0) {
      const plan: NestPlan = { transformed: macro, sourceStart: 0, sourceEnd: text.length,
        records: group.length, slots: data.columns.length, elementName: group[0].name,
        depth: data.depth, delimiters, separator: '', template: data.template,
        columns: data.columns, proxyGain, shapeWork: budget.used };
      plans.push(plan);
      plans.sort((a, b) => b.proxyGain - a.proxyGain);
      if (plans.length > maxPlans) plans.length = maxPlans;
    }
  }
  return plans;
}

export function nestTransform(text: string, enc: EncodingName = 'o200k_base'): NestPlan | null {
  return nestTransformCandidates(text, enc, 1)[0] ?? null;
}

/** Expand the one-message tree dictionary; malformed inputs fail closed. */
export function nestRestore(text: string, d: NestDelimiters): string | null {
  const slotRegex = new RegExp(SLOT_RE_SOURCE, 'g');
  let pos = 0;
  let out = '';
  while (pos < text.length) {
    const start = text.indexOf(d.open, pos);
    if (start < 0) { out += text.slice(pos); break; }
    const templateStart = start + d.open.length;
    const templateEnd = text.indexOf(d.templateEnd, templateStart);
    if (templateEnd < 0) return null;
    const metaEnd = text.indexOf(d.metaEnd, templateEnd + d.templateEnd.length);
    if (metaEnd < 0) return null;
    const close = text.indexOf(d.close, metaEnd + d.metaEnd.length);
    if (close < 0) return null;
    const template = text.slice(templateStart, templateEnd);
    const encodedColumns = text.slice(templateEnd + d.templateEnd.length, metaEnd).split(d.field);
    const body = text.slice(metaEnd + d.metaEnd.length, close);
    const slotIds = [...template.matchAll(slotRegex)].map(m => Number(m[1]));
    if (!slotIds.length || new Set(slotIds).size !== slotIds.length
      || slotIds.some((id, i) => id !== i + 1) || encodedColumns.length !== slotIds.length) return null;
    const columns = encodedColumns.map(c => c.split(d.row));
    const recordCount = columns[0]?.length ?? 0;
    if (recordCount < NEST_MIN_RECORDS || columns.some(c => c.length !== recordCount)) return null;
    const instanceAt = (row: number): string | null => {
      let malformed = false;
      const instance = template.replace(new RegExp(SLOT_RE_SOURCE, 'g'), (_whole, raw: string) => {
        const index = Number(raw) - 1;
        if (index < 0 || index >= columns.length) { malformed = true; return ''; }
        return columns[index][row];
      });
      return malformed ? null : instance;
    };
    let expanded = '';
    let bodyAt = 0;
    let row = 0;
    for (;;) {
      const refAt = body.indexOf(d.ref, bodyAt);
      if (refAt < 0) break;
      if (row >= recordCount) return null;
      const instance = instanceAt(row++);
      if (instance === null) return null;
      expanded += body.slice(bodyAt, refAt) + instance;
      bodyAt = refAt + d.ref.length;
    }
    if (row !== recordCount) return null;
    expanded += body.slice(bodyAt);
    out += text.slice(pos, start) + expanded;
    pos = close + d.close.length;
  }
  return out;
}

export function nestContractFor(d: NestDelimiters): string {
  return `After parent decode, ${d.open}template${d.templateEnd}columns${d.metaEnd}body${d.close}: {{i}} is slot i; split columns on ${d.field} and values on ${d.row}. Replace each ${d.ref} in body, in order, by template with row i's slots; preserve other bytes.`;
}

/** Exact candidate wrapper over TAGSTACK and SIBLING-TEMPLATE's measured floor. */
export function nestEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  measuredTag?: TagstackResult,
  measuredSibling?: SiblingTemplateResult,
): NestResult {
  const started = Date.now();
  const tag = measuredTag ?? tagstackEncode(text, enc);
  const sibling = measuredSibling ?? siblingTemplateEncode(text, enc, tag);
  const parent = sibling.messageTokens <= tag.messageTokens ? sibling : tag;
  const parentCodec = parent === sibling
    ? (sibling.applied ? 'sibling-template' : sibling.parentCodec)
    : (tag.applied ? 'tagstack' : tag.parentCodec);
  const fallback = (why: string, plan: NestPlan | null = null, candidateTokens: number | null = null,
    candidateExact: boolean | null = null, candidateMessage: string | null = null): NestResult => ({
    codec: 'nest', wire: parent.wire, message: parent.message, decoded: parent.decoded,
    exact: parent.decoded === text, inTokens: parent.inTokens, messageTokens: parent.messageTokens,
    parentTokens: parent.messageTokens, parentCodec, frontierCosts: tag.frontierCosts,
    applied: false, records: 0, slots: 0, elementName: plan?.elementName ?? null,
    depth: plan?.depth ?? 0, candidateTokens, candidateExact, candidateMessage, plan,
    notes: why, ms: Date.now() - started,
  });

  const plan = nestTransform(text, enc);
  if (!plan) return fallback('no paying bounded recursive sibling-template candidate');
  let child;
  try { child = apographeEncode(plan.transformed, enc); }
  catch { return fallback('APOGRAPHE candidate encode failed; measured parent returned', plan); }
  const parentDecoded = apographeDecodeResult(child);
  const contract = nestContractFor(plan.delimiters);
  const childMessage = (child.contract ? child.contract + '\n' : '') + child.wire;
  const candidateMessage = contract + '\n' + childMessage;
  const candidateTokens = countTokens(candidateMessage, enc);
  const decoded = nestRestore(parentDecoded, plan.delimiters);
  const candidateExact = parentDecoded === plan.transformed && decoded === text;
  if (!candidateExact) return fallback('APOGRAPHE + NEST inverse failed byte-exact round trip', plan,
    candidateTokens, false, candidateMessage);
  if (candidateTokens >= parent.messageTokens) return fallback(
    `candidate M=${candidateTokens} not below measured ${parentCodec} floor M=${parent.messageTokens}`,
    plan, candidateTokens, true, candidateMessage);
  return {
    codec: 'nest', wire: child.wire, message: candidateMessage, decoded, exact: true,
    inTokens: parent.inTokens, messageTokens: candidateTokens, parentTokens: parent.messageTokens,
    parentCodec, frontierCosts: tag.frontierCosts, applied: true, records: plan.records,
    slots: plan.slots, elementName: plan.elementName, depth: plan.depth,
    candidateTokens, candidateExact: true, candidateMessage, plan,
    notes: `${plan.records} recursive <${plan.elementName}> siblings, depth=${plan.depth}, slots=${plan.slots}; `
      + `proxy=${plan.proxyGain}; M=${candidateTokens} < ${parentCodec} M=${parent.messageTokens}`,
    ms: Date.now() - started,
  };
}

/** Structural/decoder checks; frontier pricing is run separately by x47/verify. */
export function nestSelfTests(enc: EncodingName = 'o200k_base') {
  const cases: Array<{ name: string; text: string; expect: boolean }> = [
    { name: 'nested recursive rows', text: '<root><record id="a"><meta><name>A</name></meta><data><x>1</x><y>fixed</y></data></record><record id="b"><meta><name>B</name></meta><data><x>2</x><y>fixed</y></data></record><record id="c"><meta><name>C</name></meta><data><x>3</x><y>fixed</y></data></record></root>', expect: true },
    { name: 'quoted greater-than attribute', text: '<root><r a=">"><x>one</x><nest><y>1</y></nest></r><r a=">"><x>two</x><nest><y>2</y></nest></r><r a=">"><x>three</x><nest><y>3</y></nest></r></root>', expect: true },
    { name: 'comment with fake tag', text: '<root><!-- <r><x>fake</x></r> --><r><x>a</x><y>1</y></r><r><x>b</x><y>2</y></r><r><x>c</x><y>3</y></r></root>', expect: true },
    { name: 'two siblings below minimum', text: '<root><r><x>1</x><y>2</y></r><r><x>3</x><y>4</y></r></root>', expect: false },
    { name: 'non-isomorphic child order', text: '<root><r><x>1</x><y>2</y></r><r><y>3</y><x>4</x></r><r><x>5</x><y>6</y></r></root>', expect: false },
    { name: 'mismatched closing tag', text: '<root><r><x>1</x></r><r><x>2</y></r><r><x>3</x></r></root>', expect: false },
    { name: 'pre-existing slot syntax', text: '<root><r><x>{{1}}</x><y>a</y></r><r><x>b</x><y>b</y></r><r><x>c</x><y>c</y></r></root>', expect: false },
    { name: 'ordinary prose', text: 'The same thought appears three times, but no markup tree exists.', expect: false },
  ];
  return cases.map(c => {
    const p = nestTransform(c.text, enc);
    const restored = p ? nestRestore(p.transformed, p.delimiters) : null;
    return { name: c.name, pass: Boolean(p) === c.expect && (!p || restored === c.text),
      plan: Boolean(p), exact: p ? restored === c.text : null, records: p?.records ?? 0,
      slots: p?.slots ?? 0, depth: p?.depth ?? 0 };
  });
}
