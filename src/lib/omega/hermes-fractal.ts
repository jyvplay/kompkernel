/**
 * HERMES-F — variable-arity template / sequence codec.
 *
 * This is an extension of the self-carried HERMES idea, not a fixed schema:
 * every input chooses its own record width, literal anchors, slot count, and
 * slot generator.  It targets the hole left by a flat SLP on near-duplicate
 * rows (logs, CSV, repeated chat turns, reports containing repeated blocks).
 *
 * Contract
 * --------
 *  - exact UTF-16 string round-trip (the repository's text contract);
 *  - one ordinary chat message, with the decoder instructions carried beside
 *    the wire; no system prompt, skill file, model memory, or tool;
 *  - no fixed field count, field names, schema, corpus dictionary, or hidden
 *    state; the template and every generator are transmitted in-band;
 *  - real o200k_base/cl100k_base token counts gate emission and message cost;
 *  - no candidate is trusted until the finished wire is decoded and compared.
 *
 * The mechanism is a dynamic, variable-arity macro block:
 *
 *   T <id> <number-of-units> <JSON literal-array> <JSON spec-array>
 *   B <id> <number-of-units> <trailing-newline-bit>
 *   R <JSON raw-text>
 *
 * A template is an array of literal anchors with one slot between each pair.
 * A block is a run of units, where a unit is one to four adjacent input lines.
 * The encoder discovers the unit width and anchors from the input.  Each slot
 * independently chooses a constant (=), arithmetic integer (#), short cycle
 * (%), or literal (~) generator.  This is not a k-column schema: arity and
 * grouping are data-dependent, and R is always available as the exact escape.
 *
 * The decoder is deliberately simple enough to state in a prompt.  JSON is
 * used only for literal strings/arrays, so tabs, newlines, quotes, sentinels,
 * Unicode, and hostile payloads do not need a second escaping convention.
 *
 * Research connection (not a claim of priority)
 * ----------------------------------------------
 * HERMES-F combines token-aligned macro admission from HERMES-Ω with the
 * variable-length phrase/slot idea of grammar compression and the dynamic
 * iteration idea behind generalized/iterated straight-line programs.  The
 * cited theory motivates the candidate family; the repository only claims the
 * executable measurements below.
 */

import { countTokens, type EncodingName } from './bpe';
import { hermesEncode, type HermesResult } from './hermes';

export const HERMES_F_START = '⟡F1';
const TEMPLATE = 'T';
const BLOCK = 'B';
const RAW = 'R';
const MAX_UNIT_WIDTH = 4;
const MAX_BLOCK_UNITS = 1024;
const MAX_TEMPLATES = 96;
const MAX_CANDIDATES = 1200;
const MAX_LITERALS = 24;

export interface HermesFractalTemplate {
  id: number;
  width: number;
  units: number;
  literals: string[];
  specs: string[];
}

export interface HermesFractalResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  savingsPct: number;
  templates: number;
  blocks: number;
  units: number;
  ms: number;
  mode: 'fractal' | 'raw' | 'forced-wrap';
  notes: string;
}

interface Candidate {
  start: number;
  end: number;
  width: number;
  units: string[];
  literals: string[];
  specs: string[];
  signature: string;
  estimatedGain: number;
}

interface Selected extends Candidate {
  id: number;
}

function json(value: unknown): string {
  return JSON.stringify(value);
}

function splitLines(text: string): string[] {
  return text.split('\n');
}

/** Longest common substring, used only to discover anchors; exactness is
 * checked independently by matchTemplate on every unit. */
function longestCommonSubstring(a: string, b: string): { ai: number; bi: number; len: number } {
  if (!a || !b || a.length > 1200 || b.length > 1200) return { ai: 0, bi: 0, len: 0 };
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

/** Convert two units into literal anchors. Empty edge anchors are allowed;
 * empty interior anchors are removed because they cannot delimit a slot. */
function deriveTemplate(a: string, b: string, depth = 0): string[] {
  if (a === b) return [a];
  if (depth >= 10) return ['', ''];
  const c = longestCommonSubstring(a, b);
  if (c.len < 2) return ['', ''];
  const anchor = a.slice(c.ai, c.ai + c.len);
  const left = deriveTemplate(a.slice(0, c.ai), b.slice(0, c.bi), depth + 1);
  const right = deriveTemplate(a.slice(c.ai + c.len), b.slice(c.bi + c.len), depth + 1);
  const merged = left[left.length - 1] + anchor + right[0];
  const out = [...left.slice(0, -1), merged, ...right.slice(1)];
  // A template with too many anchors costs more than it can reliably save and
  // is difficult for a human/LLM to scan.  The raw lane remains exact.
  return out.length <= MAX_LITERALS ? out : ['', ''];
}

function matchTemplate(unit: string, literals: string[]): string[] | null {
  if (literals.length === 1) return unit === literals[0] ? [] : null;
  if (!unit.startsWith(literals[0])) return null;
  const slots: string[] = [];
  let at = literals[0].length;
  for (let i = 1; i < literals.length - 1; i++) {
    const anchor = literals[i];
    if (!anchor) return null;
    const next = unit.indexOf(anchor, at);
    if (next < 0) return null;
    slots.push(unit.slice(at, next));
    at = next + anchor.length;
  }
  const tail = literals[literals.length - 1];
  if (tail && !unit.endsWith(tail)) return null;
  const end = tail ? unit.length - tail.length : unit.length;
  if (end < at) return null;
  slots.push(unit.slice(at, end));
  return slots;
}

function materialize(literals: string[], slots: string[]): string {
  let out = literals[0] ?? '';
  for (let i = 0; i < slots.length; i++) out += slots[i] + (literals[i + 1] ?? '');
  return out;
}

function canonicalInteger(value: string): number | null {
  if (!/^-?(?:0|[1-9]\d*)$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

function sequenceSpec(values: string[]): string {
  if (values.length === 0) return '~[]';
  if (values.every(v => v === values[0])) return `=${json(values[0])}`;

  const nums = values.map(canonicalInteger);
  if (nums.every((n): n is number => n !== null) && nums.length >= 3) {
    const step = nums[1] - nums[0];
    if (nums.every((n, i) => n === nums[0] + step * i)) return `#${nums[0]},${step}`;
  }

  // A short cycle is the useful middle ground between a constant and a full
  // enumeration.  We score the final wire later; this is only a candidate.
  for (let period = 1; period <= Math.min(32, Math.floor(values.length / 2)); period++) {
    let ok = true;
    for (let i = period; i < values.length; i++) {
      if (values[i] !== values[i % period]) { ok = false; break; }
    }
    if (ok) {
      const cycle = values.slice(0, period);
      const cyc = `%${json(cycle)}`;
      const lit = `~${json(values)}`;
      if (cyc.length + 2 < lit.length) return cyc;
    }
  }
  return `~${json(values)}`;
}

function parseSpec(spec: string, count: number): string[] | null {
  if (spec.startsWith('=')) {
    try { return Array(count).fill(JSON.parse(spec.slice(1))); } catch { return null; }
  }
  if (spec.startsWith('#')) {
    const m = spec.slice(1).match(/^(-?\d+),(-?\d+)$/);
    if (!m) return null;
    const a = Number(m[1]), d = Number(m[2]);
    if (!Number.isSafeInteger(a) || !Number.isSafeInteger(d)) return null;
    return Array.from({ length: count }, (_, i) => String(a + d * i));
  }
  if (spec.startsWith('%') || spec.startsWith('~')) {
    try {
      const values = JSON.parse(spec.slice(1));
      if (!Array.isArray(values) || values.some(v => typeof v !== 'string')) return null;
      if (values.length === 0 && count > 0) return null;
      if (spec.startsWith('%')) return Array.from({ length: count }, (_, i) => values[i % values.length]);
      if (values.length !== count) return null;
      return values;
    } catch { return null; }
  }
  return null;
}

function parseTemplateLine(line: string): HermesFractalTemplate | null {
  const p = line.split('\t');
  if (p.length !== 4 || p[0] !== TEMPLATE) return null;
  const id = Number(p[1]);
  if (!Number.isInteger(id) || id < 0) return null;
  try {
    const literals = JSON.parse(p[2]);
    const specs = JSON.parse(p[3]);
    if (!Array.isArray(literals) || !Array.isArray(specs) || literals.length !== specs.length + 1) return null;
    if (literals.some(v => typeof v !== 'string') || specs.some(v => typeof v !== 'string')) return null;
    return { id, width: 1, units: 1, literals, specs };
  } catch { return null; }
}

/** Total decoder. Unknown/malformed framed messages are returned unchanged. */
export function hermesFractalDecode(wire: string): string {
  if (!wire.startsWith(HERMES_F_START + '\n')) return wire;
  const lines = wire.slice((HERMES_F_START + '\n').length).split('\n');
  if (lines.length === 0 || (lines.length === 1 && lines[0] === '')) return wire;
  const defs = new Map<number, HermesFractalTemplate>();
  const output: string[] = [];
  for (const line of lines) {
    if (!line) continue;
    const p = line.split('\t');
    if (p[0] === TEMPLATE) {
      const t = parseTemplateLine(line);
      if (!t || defs.has(t.id)) return wire;
      defs.set(t.id, t);
    } else if (p[0] === BLOCK) {
      if (p.length !== 4) return wire;
      const id = Number(p[1]), count = Number(p[2]), trail = p[3];
      const t = defs.get(id);
      if (!t || !Number.isInteger(count) || count < 1 || count > MAX_BLOCK_UNITS || (trail !== '0' && trail !== '1')) return wire;
      const columns: string[][] = [];
      for (const spec of t.specs) {
        const values = parseSpec(spec, count);
        if (!values) return wire;
        columns.push(values);
      }
      const units: string[] = [];
      for (let i = 0; i < count; i++) units.push(materialize(t.literals, columns.map(c => c[i])));
      output.push(units.join('\n') + (trail === '1' ? '\n' : ''));
    } else if (p[0] === RAW) {
      if (p.length !== 2) return wire;
      try {
        const raw = JSON.parse(p[1]);
        if (typeof raw !== 'string') return wire;
        output.push(raw);
      } catch { return wire; }
    } else {
      return wire;
    }
  }
  return output.join('');
}

/** The prompt is generated from the actual wire only where this saves words;
 * it never depends on hidden tables. */
export function hermesFractalDecoderPrompt(wire?: string): string {
  const body = wire ?? '<the HERMES-F wire in this message>';
  return [
    'HERMES-F exact; no external state/tool. WIRE:',
    body,
    `If WIRE does not start with ${HERMES_F_START} followed by newline, return it unchanged. Otherwise parse tab-separated lines. T id L S defines a template: L and S are JSON arrays, |L|=|S|+1; one unit is L0,slot0,L1,...,slotlast,Llast. B id n t expands T[id] n times, joins units with newline, then adds a newline iff t=1. R J appends JSON string J. Slot =J repeats J; #a,d gives a+i*d; %J cycles a nonempty JSON string array; ~J lists n strings. Ignore T lines; concatenate B/R in order; output exact text.`,
  ].join('\n');
}

function lineUnits(lines: string[], start: number, end: number, width: number): string[] {
  const out: string[] = [];
  for (let i = start; i < end; i += width) out.push(lines.slice(i, i + width).join('\n'));
  return out;
}

function templateCandidate(lines: string[], start: number, width: number): Candidate | null {
  if (start + width * 3 > lines.length) return null;
  const first = lines.slice(start, start + width).join('\n');
  const second = lines.slice(start + width, start + width * 2).join('\n');
  const literals = deriveTemplate(first, second);
  if (literals.length < 1 || literals.length - 1 > MAX_LITERALS) return null;
  const units: string[] = [];
  const values: string[][] = Array.from({ length: literals.length - 1 }, () => []);
  let end = start;
  const maxEnd = Math.min(lines.length, start + width * MAX_BLOCK_UNITS);
  while (end + width <= maxEnd) {
    const unit = lines.slice(end, end + width).join('\n');
    const slots = matchTemplate(unit, literals);
    if (!slots || slots.length !== values.length) break;
    units.push(unit);
    slots.forEach((v, i) => values[i].push(v));
    end += width;
  }
  if (units.length < 3) return null;
  const specs = values.map(sequenceSpec);
  const signature = json({ width, literals, specs });
  const def = `${TEMPLATE}\t0\t${json(literals)}\t${json(specs)}`;
  const ref = `${BLOCK}\t0\t${units.length}\t${end < lines.length ? '1' : '0'}`;
  const rawText = lines.slice(start, end).join('\n') + (end < lines.length ? '\n' : '');
  const estimatedGain = countTokens(rawText, 'o200k_base') - countTokens(def, 'o200k_base') - countTokens(ref, 'o200k_base');
  return { start, end, width, units, literals, specs, signature, estimatedGain };
}

function buildWire(text: string, selected: Selected[]): { wire: string; templates: HermesFractalTemplate[]; blocks: number } {
  const lines = splitLines(text);
  const bySignature = new Map<string, HermesFractalTemplate>();
  let nextId = 0;
  for (const s of selected) {
    let t = bySignature.get(s.signature);
    if (!t) {
      t = { id: nextId++, width: s.width, units: s.units.length, literals: s.literals, specs: s.specs };
      bySignature.set(s.signature, t);
    }
    s.id = t.id;
  }
  const defs = [...bySignature.values()];
  const parts: string[] = [HERMES_F_START];
  for (const t of defs) parts.push(`${TEMPLATE}\t${t.id}\t${json(t.literals)}\t${json(t.specs)}`);
  let cursor = 0;
  for (const s of selected) {
    if (cursor < s.start) {
      const raw = lines.slice(cursor, s.start).join('\n') + (s.start < lines.length ? '\n' : '');
      if (raw) parts.push(`${RAW}\t${json(raw)}`);
    }
    parts.push(`${BLOCK}\t${s.id}\t${s.units.length}\t${s.end < lines.length ? '1' : '0'}`);
    cursor = s.end;
  }
  if (cursor < lines.length) {
    const raw = lines.slice(cursor).join('\n');
    if (raw) parts.push(`${RAW}\t${json(raw)}`);
  }
  return { wire: parts.join('\n'), templates: defs, blocks: selected.length };
}

function rawResult(text: string, enc: EncodingName, started: number, forced = false): HermesFractalResult {
  const inTokens = countTokens(text, enc);
  const wire = forced ? `${HERMES_F_START}\n${RAW}\t${json(text)}` : text;
  const decoded = hermesFractalDecode(wire);
  const outTokens = countTokens(wire, enc);
  const messageTokens = forced ? countTokens(hermesFractalDecoderPrompt(wire), enc) : outTokens;
  return {
    wire, decoded, exact: decoded === text, inTokens, outTokens,
    messageTokens, savingsPct: 0, templates: 0, blocks: 0, units: 0,
    ms: Date.now() - started, mode: forced ? 'forced-wrap' : 'raw',
    notes: forced ? 'literal frame collision; exact forced wrapper' : 'identity fallback',
  };
}

export function hermesFractalEncode(text: string, enc: EncodingName = 'o200k_base'): HermesFractalResult {
  const started = Date.now();
  const inTokens = countTokens(text, enc);
  if (text.length < 24) return rawResult(text, enc, started, text.startsWith(HERMES_F_START + '\n'));

  // A frame-looking input must never be interpreted as our program. It is
  // wrapped as JSON, just like an arbitrary raw segment.
  const forced = text.startsWith(HERMES_F_START + '\n');
  const lines = splitLines(text);
  if (lines.length < 4) return rawResult(text, enc, started, forced);

  const candidates: Candidate[] = [];
  for (let width = 1; width <= MAX_UNIT_WIDTH; width++) {
    for (let start = 0; start + width * 3 <= lines.length && candidates.length < MAX_CANDIDATES; start++) {
      const c = templateCandidate(lines, start, width);
      if (c && c.estimatedGain > 0) candidates.push(c);
    }
  }
  if (!candidates.length) return rawResult(text, enc, started, forced);

  // Preserve early independence: selection uses only exact local candidates;
  // the whole wire is scored again after overlap resolution.  Trying several
  // interval orderings is important: a 1-line template and a 2-line template
  // can cover the same rows, and local header cost is not additive after the
  // final templates are deduplicated.
  const orders: Array<(a: Candidate, b: Candidate) => number> = [
    (a, b) => b.estimatedGain - a.estimatedGain || (b.end - b.start) - (a.end - a.start),
    (a, b) => (b.end - b.start) - (a.end - a.start) || b.estimatedGain - a.estimatedGain,
    (a, b) => (b.units.length * b.width) - (a.units.length * a.width) || b.estimatedGain - a.estimatedGain,
    (a, b) => (a.width - b.width) || b.estimatedGain - a.estimatedGain,
    (a, b) => (b.width - a.width) || b.estimatedGain - a.estimatedGain,
  ];
  let best:
    { selected: Selected[]; wire: string; decoded: string; outTokens: number; messageTokens: number; templates: number; blocks: number }
    | null = null;
  for (const order of orders) {
    const pool = [...candidates].sort(order);
    const chosen: Selected[] = [];
    for (const c of pool) {
      if (chosen.some(s => c.start < s.end && s.start < c.end)) continue;
      chosen.push({ ...c, id: -1 });
      if (chosen.length >= MAX_TEMPLATES) break;
    }
    chosen.sort((a, b) => a.start - b.start);
    if (!chosen.length) continue;
    const built = buildWire(text, chosen);
    const decoded = hermesFractalDecode(built.wire);
    if (decoded !== text) continue;
    const outTokens = countTokens(built.wire, enc);
    const messageTokens = countTokens(hermesFractalDecoderPrompt(built.wire), enc);
    if (!best || messageTokens < best.messageTokens || (messageTokens === best.messageTokens && outTokens < best.outTokens)) {
      best = { selected: chosen, wire: built.wire, decoded, outTokens, messageTokens, templates: built.templates.length, blocks: built.blocks };
    }
  }
  if (!best) return rawResult(text, enc, started, forced);
  // The decoder prompt is part of the one-chat delivery cost.  This gate is
  // intentionally stronger than the wire-only gate.
  if (best.outTokens >= inTokens || best.messageTokens >= inTokens) {
    const fallback = rawResult(text, enc, started, forced);
    fallback.notes = `message-cost gate: framed ${best.messageTokens} >= raw ${inTokens}`;
    return fallback;
  }
  const blockUnits = best.selected.reduce((n, s) => n + s.units.length, 0);
  return {
    wire: best.wire, decoded: best.decoded, exact: true, inTokens, outTokens: best.outTokens, messageTokens: best.messageTokens,
    savingsPct: inTokens ? Math.round((1 - best.messageTokens / inTokens) * 1000) / 10 : 0,
    templates: best.templates, blocks: best.blocks, units: blockUnits,
    ms: Date.now() - started, mode: 'fractal',
    notes: `dynamic templates=${best.templates}, blocks=${best.blocks}, units=${blockUnits}; variable arity; exact whole-wire + message-cost verified`,
  };
}

export type HermesAdaptiveResult =
  | (HermesFractalResult & { chosen: 'hermes-f' })
  | (HermesResult & { chosen: 'hermes-omega' });

/** Pareto router.  HERMES-Ω remains the fallback and no claim is made that
 * running both searches is free: this helper measures both complete candidates
 * and returns the lower honest one-chat cost, breaking ties by wire tokens. */
export async function hermesAdaptiveEncode(text: string, enc: EncodingName = 'o200k_base'): Promise<HermesAdaptiveResult> {
  const h = await hermesEncode(text, enc);
  const f = hermesFractalEncode(text, enc);
  if (f.messageTokens < h.messageTokens || (f.messageTokens === h.messageTokens && f.outTokens < h.outTokens)) {
    return { ...f, chosen: 'hermes-f' };
  }
  return { ...h, chosen: 'hermes-omega' };
}

export function hermesFractalSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases = [
    'x\ny\nz\nq',
    'id:0 value:10\nid:1 value:11\nid:2 value:12\nid:3 value:13',
    'user: run step 0\nassistant: step 0 completed\nuser: run step 1\nassistant: step 1 completed\nuser: run step 2\nassistant: step 2 completed',
    '∀⇒ not a frame; preserve literally',
    `quoted\tline "x"\nquoted\tline "x"\nquoted\tline "x"`,
  ];
  return cases.map((text, i) => {
    const r = hermesFractalEncode(text, enc);
    const d = hermesFractalDecode(r.wire);
    return { name: `case-${i}`, ok: d === text && r.decoded === text && r.exact, detail: `${r.mode} ${r.inTokens}->${r.outTokens} M=${r.messageTokens}` };
  });
}
