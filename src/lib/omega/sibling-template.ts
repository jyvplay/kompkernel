/**
 * X47 SIBLING-TEMPLATE — repeated sibling-record grammar factoring.
 *
 * This is deliberately narrower than a general XML compressor. It recognizes
 * only balanced XML-compatible explicit-tag sibling runs whose elements
 * have the same exact byte skeleton and at least two text-only child slots. One exact skeleton is sent
 * once; each record contributes only its slot values. The message contains the
 * macro grammar and is priced as contract + LF + child contract + wire.
 *
 * Prior-art boundary: XML structure/data separation and template compression
 * are established (notably XMill). This module claims a new measured in-band
 * codec path in this repository, not a new compression-theory primitive.
 */

import { countTokens, type EncodingName } from './bpe';
import { apographeDecodeResult, apographeEncode } from './apographe';
import { tagstackEncode, type TagstackResult } from './tagstack';

const MAX_TEXT_CHARS = 100_000;
const MAX_SHAPE_WORK = 1_000_000;
const MIN_SIBLINGS = 3;
const MARKER_POOL = ['⟪', '⟫', '§', '¤', '‡', '°', 'µ', '◆', '⁞', '␟', '‖', '¶', '¦', '※', '~', '^', '@', '!', '%', '+', '='];
const SLOT_RE = /\{\{([1-9][0-9]*)\}\}/g;
const NAME_START = /^[A-Za-z_:]$/;
const NAME_CHAR = /^[A-Za-z0-9_.:-]$/;

type Delimiters = { open: string; close: string; templateEnd: string; metaEnd: string; field: string; row: string };

interface ElementNode {
  name: string;
  start: number;
  openEnd: number;
  end: number;
  closeStart: number;
  selfClosing: boolean;
  parent: ElementNode | null;
  children: ElementNode[];
}

interface RecordShape {
  node: ElementNode;
  template: string;
  values: string[];
  childNames: string[];
}

export interface SiblingTemplatePlan {
  text: string;
  sourceStart: number;
  sourceEnd: number;
  records: number;
  slots: number;
  elementName: string;
  childNames: string[];
  delimiters: Delimiters;
  separator: string;
  template: string;
  proxyGain: number;
}

export interface SiblingTemplateResult {
  codec: 'sibling-template';
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
  childNames: string[];
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateMessage: string | null;
  plan: SiblingTemplatePlan | null;
  notes: string;
  ms: number;
}

function isSpace(c: string): boolean { return c === ' ' || c === '\t' || c === '\n' || c === '\r'; }
function isNameStart(c: string): boolean { return c.length === 1 && NAME_START.test(c); }
function isNameChar(c: string): boolean { return c.length === 1 && NAME_CHAR.test(c); }

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

function tagEnd(text: string, start: number): number {
  let quote = '';
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'") { quote = c; continue; }
    if (c === '<') return -1;
    if (c === '>') return i + 1;
  }
  return -1;
}

/** Strict, lossless XML element indexer. Any syntax it cannot delimit is refused. */
function parseXml(text: string): ElementNode[] | null {
  if (!text.length || text.length > MAX_TEXT_CHARS) return null;
  const roots: ElementNode[] = [];
  const stack: ElementNode[] = [];
  let pos = 0;
  while (pos < text.length) {
    const at = text.indexOf('<', pos);
    if (at < 0) break;
    if (text.startsWith('<!--', at)) {
      const end = text.indexOf('-->', at + 4);
      if (end < 0) return null;
      pos = end + 3;
      continue;
    }
    if (text.startsWith('<![CDATA[', at)) {
      const end = text.indexOf(']]>', at + 9);
      if (end < 0) return null;
      pos = end + 3;
      continue;
    }
    if (text.startsWith('<?', at)) {
      const end = text.indexOf('?>', at + 2);
      if (end < 0) return null;
      pos = end + 2;
      continue;
    }
    if (text.startsWith('<!', at)) {
      const end = declarationEnd(text, at);
      if (end < 0) return null;
      pos = end;
      continue;
    }

    const closing = text[at + 1] === '/';
    const nameAt = at + (closing ? 2 : 1);
    if (nameAt >= text.length || !isNameStart(text[nameAt])) return null;
    let nameEnd = nameAt + 1;
    while (nameEnd < text.length && isNameChar(text[nameEnd])) nameEnd++;
    const name = text.slice(nameAt, nameEnd);
    const end = tagEnd(text, at);
    if (end < 0) return null;

    if (closing) {
      const gt = end - 1;
      if (text[gt] !== '>' || text.slice(nameEnd, gt).trim() !== '') return null;
      const top = stack.pop();
      if (!top || top.name !== name) return null;
      top.closeStart = at;
      top.end = end;
      pos = end;
      continue;
    }

    let last = end - 2;
    while (last >= nameEnd && isSpace(text[last])) last--;
    const selfClosing = text[last] === '/';
    const node: ElementNode = {
      name, start: at, openEnd: end, end: selfClosing ? end : -1,
      closeStart: selfClosing ? end : -1, selfClosing,
      parent: stack[stack.length - 1] ?? null, children: [],
    };
    if (node.parent) node.parent.children.push(node);
    else roots.push(node);
    if (!selfClosing) stack.push(node);
    pos = end;
  }
  if (stack.length) return null;
  return roots;
}

function collectNodes(roots: ElementNode[]): ElementNode[] {
  const out: ElementNode[] = [];
  const todo = [...roots];
  while (todo.length) {
    const node = todo.pop()!;
    out.push(node);
    todo.push(...node.children);
  }
  return out;
}

function shapeOf(text: string, node: ElementNode): RecordShape | null {
  if (node.selfClosing || node.children.length < 2) return null;
  const children = node.children;
  if (children.some(child => child.selfClosing || child.children.length !== 0 || child.closeStart < child.openEnd)) return null;
  const values = children.map(child => text.slice(child.openEnd, child.closeStart));
  const childNames = children.map(child => child.name);
  let cursor = node.start;
  let template = '';
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    template += text.slice(cursor, child.openEnd) + `{{${i + 1}}}`;
    cursor = child.closeStart;
  }
  template += text.slice(cursor, node.end);
  if (template.match(SLOT_RE)?.length !== children.length) return null;
  return { node, template, values, childNames };
}

function chooseDelimiters(text: string, enc: EncodingName): Delimiters | null {
  const safe = MARKER_POOL.filter(marker => !text.includes(marker) && countTokens(marker, enc) === 1);
  if (safe.length < 6) return null;
  return { open: safe[0], close: safe[1], templateEnd: safe[2], metaEnd: safe[3], field: safe[4], row: safe[5] };
}

function buildMacro(shape: RecordShape, records: RecordShape[], separator: string, d: Delimiters): string {
  const rows = records.map(record => record.values.join(d.field)).join(d.row);
  return d.open + shape.template + d.templateEnd + separator + d.metaEnd + rows + d.close;
}

/** Find the single most promising repeated-sibling run; the live message gate decides. */
export function siblingTemplateTransform(text: string, enc: EncodingName = 'o200k_base'): SiblingTemplatePlan | null {
  if (text.length > MAX_TEXT_CHARS || /\{\{[1-9][0-9]*\}\}/.test(text)) return null;
  const roots = parseXml(text);
  if (!roots) return null;
  const delimiters = chooseDelimiters(text, enc);
  if (!delimiters) return null;
  const parents: Array<{ children: ElementNode[] }> = [{ children: roots }, ...collectNodes(roots)];
  const shapeCache = new Map<ElementNode, RecordShape | null>();
  let shapeWork = 0;
  let budgetExceeded = false;
  const getShape = (node: ElementNode): RecordShape | null => {
    if (shapeCache.has(node)) return shapeCache.get(node) ?? null;
    if (node.children.length < 2 || node.selfClosing) { shapeCache.set(node, null); return null; }
    shapeWork += node.end - node.start + node.children.length;
    if (shapeWork > MAX_SHAPE_WORK) { budgetExceeded = true; return null; }
    const shape = shapeOf(text, node);
    shapeCache.set(node, shape);
    return shape;
  };
  let best: SiblingTemplatePlan | null = null;

  for (const parent of parents) {
    if (budgetExceeded) break;
    const siblings = parent.children;
    for (let i = 0; i < siblings.length;) {
      if (budgetExceeded) break;
      const first = getShape(siblings[i]);
      if (!first) { i++; continue; }
      const run = [first];
      let separator: string | null = null;
      let j = i + 1;
      while (j < siblings.length) {
        const next = getShape(siblings[j]);
        if (!next || next.node.name !== first.node.name || next.template !== first.template
          || next.childNames.some((name, k) => name !== first.childNames[k])) break;
        const gap = text.slice(run[run.length - 1].node.end, next.node.start);
        if (!/^[ \t\r\n]*$/.test(gap)) break;
        if (separator === null) separator = gap;
        else if (gap !== separator) break;
        run.push(next);
        j++;
      }
      if (run.length >= MIN_SIBLINGS && separator !== null) {
        const macro = buildMacro(first, run, separator, delimiters);
        const start = first.node.start;
        const end = run[run.length - 1].node.end;
        const region = end - start;
        shapeWork += region + macro.length + run.length * (first.values.length + 1);
        if (shapeWork > MAX_SHAPE_WORK) return null;
        const transformed = text.slice(0, start) + macro + text.slice(end);
        const proxyGain = countTokens(text.slice(start, end), enc) - countTokens(macro, enc);
        if (proxyGain > 0 && (!best || proxyGain > best.proxyGain)) {
          best = { text: transformed, sourceStart: start, sourceEnd: end,
            records: run.length, slots: first.values.length, elementName: first.node.name,
            childNames: first.childNames, delimiters, separator, template: first.template, proxyGain };
        }
      }
      i = Math.max(i + 1, j);
    }
  }
  if (budgetExceeded) return null;
  return best;
}

/** Apply the in-band macro inverse; null means malformed or ambiguous macro syntax. */
export function siblingTemplateRestore(text: string, d: Delimiters): string | null {
  let pos = 0;
  let out = '';
  const slotPattern = /\{\{([1-9][0-9]*)\}\}/g;
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
    const separator = text.slice(templateEnd + d.templateEnd.length, metaEnd);
    const encodedRows = text.slice(metaEnd + d.metaEnd.length, close);
    const slots = [...template.matchAll(slotPattern)].map(match => Number(match[1]));
    if (slots.length < 2 || new Set(slots).size !== slots.length) return null;
    const rowTexts = encodedRows.split(d.row);
    if (rowTexts.length < MIN_SIBLINGS) return null;
    const instances: string[] = [];
    for (const row of rowTexts) {
      const values = row.split(d.field);
      if (values.length !== slots.length) return null;
      let malformed = false;
      const instance = template.replace(slotPattern, (_whole, raw: string) => {
        const index = Number(raw) - 1;
        if (index < 0 || index >= values.length) { malformed = true; return ''; }
        return values[index];
      });
      if (malformed) return null;
      instances.push(instance);
    }
    out += text.slice(pos, start) + instances.join(separator);
    pos = close + d.close.length;
  }
  return out;
}

export function siblingTemplateContractFor(d: Delimiters): string {
  return `After parent decode, ${d.open}template${d.templateEnd}separator${d.metaEnd}rows${d.close} is a sibling macro: {{i}} slots in template receive field i from each ${d.row}-separated row, whose fields split on ${d.field}; join instances with the exact separator and preserve outside bytes.`;
}

/** Exact wrapper over TAGSTACK's measured current frontier. */
export function siblingTemplateEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  measuredParent?: TagstackResult,
): SiblingTemplateResult {
  const started = Date.now();
  const parent = measuredParent ?? tagstackEncode(text, enc);
  const plan = siblingTemplateTransform(text, enc);
  const fallback = (why: string, candidateTokens: number | null = null,
    candidateExact: boolean | null = null, candidateMessage: string | null = null): SiblingTemplateResult => ({
    codec: 'sibling-template', wire: parent.wire, message: parent.message, decoded: parent.decoded,
    exact: parent.decoded === text, inTokens: parent.inTokens, messageTokens: parent.messageTokens,
    parentTokens: parent.messageTokens, parentCodec: parent.parentCodec, frontierCosts: parent.frontierCosts,
    applied: false, records: 0, slots: 0, elementName: null, childNames: [],
    candidateTokens, candidateExact, candidateMessage, plan, notes: why, ms: Date.now() - started,
  });
  if (!plan) return fallback('no exact repeated-sibling template run');

  const child = apographeEncode(plan.text, enc);
  const parentDecoded = apographeDecodeResult(child);
  const contract = siblingTemplateContractFor(plan.delimiters);
  const childMessage = (child.contract ? child.contract + '\n' : '') + child.wire;
  const candidateMessage = contract + '\n' + childMessage;
  const candidateTokens = countTokens(candidateMessage, enc);
  const decoded = siblingTemplateRestore(parentDecoded, plan.delimiters);
  const candidateExact = parentDecoded === plan.text && decoded === text;
  if (!candidateExact) return fallback('composed APOGRAPHE + sibling-template inverse failed exactness', candidateTokens,
    false, candidateMessage);
  if (candidateTokens >= parent.messageTokens) return fallback(
    `candidate M=${candidateTokens} not below current ${parent.parentCodec} frontier M=${parent.messageTokens}`,
    candidateTokens, true, candidateMessage);
  return {
    codec: 'sibling-template', wire: child.wire, message: candidateMessage, decoded, exact: true,
    inTokens: parent.inTokens, messageTokens: candidateTokens, parentTokens: parent.messageTokens,
    parentCodec: parent.parentCodec, frontierCosts: parent.frontierCosts, applied: true,
    records: plan.records, slots: plan.slots, elementName: plan.elementName, childNames: plan.childNames,
    candidateTokens, candidateExact: true, candidateMessage, plan,
    notes: `${plan.records} <${plan.elementName}> siblings; ${plan.slots} text slots; proxy=${plan.proxyGain}; M=${candidateTokens} < ${parent.parentCodec} parent=${parent.messageTokens}`,
    ms: Date.now() - started,
  };
}
