/**
 * PROBOLE (προβολή — "a throwing forward; a projection").
 * =============================================================================
 * X67. Every mechanism in this stack is a SUBSTITUTION at the point of use, and
 * APOGRAPHE's own header states the law that follows from it:
 *
 *      per-use cost of a substitution ≥ 1 token, always.
 *
 * APOGRAPHE escapes that law for a MATRIX: a value whose position the reader can
 * compute from the row's own arity costs zero tokens per row. It needs a record
 * set with ONE separator and delimiter-free fields, so it never sees JSON, and
 * PARADEIGMA (JSON field entailment) only rewrites a field that is a function of
 * its siblings.
 *
 * The structure neither can express is the one that dominates everyday machine
 * text: a REPEATED MULTI-LINE FRAME WITH FRESH VALUES INSIDE IT.
 *
 *     { "id": 1, "login": "ada",   "site_admin": false },
 *     { "id": 7, "login": "grace", "site_admin": false },
 *
 * No substring repeats often enough to be worth a rule per use beyond the keys,
 * so a grammar pays about one glyph per key per record forever. But the frame is
 * not a substring that repeats — it is a TEMPLATE that repeats, and a template
 * can be emitted ONCE and PROJECTED onto its instances. The frame then costs
 * nothing per record and the values, which were always there, are the only
 * per-record payload.
 *
 * THE PROJECTION, PRECISELY. Take one instance's canonical text and replace each
 * scalar (and each object key) with a slot `~`. That is the template; emit it
 * once. Then emit the values SLOT-MAJOR: every value of slot 0 across all
 * instances, then every value of slot 1, and so on. Slot-major is not cosmetic.
 * It puts a constant column's values next to each other, so the stated
 * `*<k> <v>` run rule collapses that column to two tokens instead of k, and it
 * hands the parent grammar the adjacency it needs for the rest.
 *
 * The reader's obligation is fill-in-the-blanks plus a join: the lowest-risk
 * reader in the stack, because there is no arithmetic, no carried state and no
 * alphabet table — it copies values into a printed template.
 *
 * DOMAIN AND EXACTNESS. Only a document the encoder can REGENERATE byte for byte
 * is admitted: `JSON.stringify(JSON.parse(text), null, unit)` plus at most one
 * trailing LF, for one indent unit in {4 spaces, tab, 3, 2, 1 space, none}. The
 * regeneration is compared with the source before anything else happens, and the
 * whole transform is decoded back and compared again before a token is counted.
 * A document outside that canonical form is refused, never normalized.
 *
 * MECHANISM BOUNDARY (honest). The general idea — a key catalogue plus an array
 * of like-shaped objects turned into a table with lifted columns — is prior art
 * and plainly so: the `json_compress` / `compress-json` libraries do exactly that
 * to produce a smaller ordinary JSON value, and column stores have done it for
 * decades. What is not in that family is this stack's object: one self-contained
 * chat message whose reader is a language model following an in-band rule, priced
 * as a complete message against the measured frontier, carrying slot-major
 * values with an in-band run rule so a constant column is nearly free. No claim
 * of a new compression primitive is made.
 *
 * BOUNDARIES. Object keys may not contain `~` (it is the slot mark); the marker
 * pair must be absent from the source; only contiguous same-shape runs of at
 * least PROBOLE_MIN_RECORDS records inside one container are projected; all runs
 * share one child depth; the source is capped at PROBOLE_MAX_SOURCE_CHARS.
 * Greedy: candidate runs are ranked by a character proxy and admitted one at a
 * time only while the measured envelope token count strictly falls. The final
 * emission decision is the complete-message gate, not the planner.
 */
import { countTokens, type EncodingName } from './bpe';
import { tagstackEncode, type TagstackResult } from './tagstack';

export const PROBOLE_MAX_SOURCE_CHARS = 200_000;
export const PROBOLE_MAX_RUNS = 4;
export const PROBOLE_MIN_RECORDS = 3;

const INDENTS = ['    ', '\t', '   ', '  ', ' ', ''] as const;
const MARKER_PAIRS: Array<[string, string]> = [['⟨', '⟩'], ['⟪', '⟫'], ['⦃', '⦄'], ['❰', '❱']];

export function proboleContract(): string {
  return 'PROBOLE-1: expand the parent first. `^S` is a JSON string, the separator. The `^O` and `^Tn` JSON strings are text in which `⟨n⟩` means run n\'s records joined by `^S`, and `~` is a slot. `^Vn k` gives run n\'s slots in order, k lines each, where `*k v` means v k times. Fill the slots in order, then print the `^O` text.';
}

export interface ProboleRun {
  id: number;
  count: number;
  templateLines: string[];
  values: string[][];
  templateChars: number;
}

export interface ProbolePlan {
  text: string;
  indent: string;
  childDepth: number;
  outer: string;
  runs: ProboleRun[];
  transformed: string;
  exact: boolean;
  proxyGain: number;
}

type JNode = null | boolean | number | string | JNode[] | { [k: string]: JNode };
type JObj = { [k: string]: JNode };

/* ------------------------------------------------------------------------- *
 * canonical JSON rendering (byte-identical to JSON.stringify(v, null, unit))
 * ------------------------------------------------------------------------- */

export function renderCanonical(v: JNode, unit: string, depth = 0): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (unit === '') return '[' + v.map((x) => renderCanonical(x, unit, depth + 1)).join(',') + ']';
    return '[\n' + v.map((x) => unit.repeat(depth + 1) + renderCanonical(x, unit, depth + 1)).join(',\n')
      + '\n' + unit.repeat(depth) + ']';
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  if (unit === '') return '{' + keys.map((k) => JSON.stringify(k) + ':' + renderCanonical(v[k], unit, depth + 1)).join(',') + '}';
  return '{\n' + keys.map((k) => unit.repeat(depth + 1) + JSON.stringify(k) + ': ' + renderCanonical(v[k], unit, depth + 1)).join(',\n')
    + '\n' + unit.repeat(depth) + '}';
}

function shapeOf(v: JNode): string {
  if (v === null || typeof v !== 'object') return 'S';
  if (Array.isArray(v)) return '[' + v.map(shapeOf).join(',') + ']';
  return '{' + Object.keys(v).map((k) => JSON.stringify(k) + ':' + shapeOf(v[k])).join(',') + '}';
}

/** Render a node with slots; scalars and object keys become `~` slots. */
function renderSlotted(v: JNode, unit: string, depth: number, slots: string[], keyOfChild?: string): string {
  if (v === null || typeof v !== 'object') { slots.push(JSON.stringify(v)); return '~'; }
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    if (unit === '') return '[' + v.map((x) => renderSlotted(x, unit, depth + 1, slots)).join(',') + ']';
    return '[\n' + v.map((x) => unit.repeat(depth + 1) + renderSlotted(x, unit, depth + 1, slots)).join(',\n')
      + '\n' + unit.repeat(depth) + ']';
  }
  const keys = Object.keys(v);
  if (!keys.length) return '{}';
  if (unit === '') return '{' + keys.map((k) => JSON.stringify(k) + ':' + renderSlotted(v[k], unit, depth + 1, slots)).join(',') + '}';
  return '{\n' + keys.map((k) => unit.repeat(depth + 1) + JSON.stringify(k) + ': ' + renderSlotted(v[k], unit, depth + 1, slots)).join(',\n')
    + '\n' + unit.repeat(depth) + '}';
}

/** One record of a projection: array children are the value, object children are `"key": value`. */
function renderRecord(child: JNode, isObjectChild: boolean, key: string | null, unit: string,
  depth: number, slots: string[]): string {
  if (isObjectChild) { slots.push(JSON.stringify(key ?? '')); return '~: ' + renderSlotted(child, unit, depth, slots); }
  return renderSlotted(child, unit, depth, slots);
}

/* ------------------------------------------------------------------------- *
 * run planning
 * ------------------------------------------------------------------------- */

interface Candidate { container: JNode; childDepth: number; start: number; len: number; gain: number }

function containerKids(c: JNode): { kids: JNode[]; keys: string[]; isArr: boolean } {
  if (Array.isArray(c)) return { kids: c, keys: [], isArr: true };
  const keys = Object.keys(c as JObj);
  return { kids: keys.map((k) => (c as JObj)[k]), keys, isArr: false };
}

function candidateRuns(root: JNode, unit: string): Candidate[] {
  const out: Candidate[] = [];
  const walk = (node: JNode, depth: number) => {
    if (node === null || typeof node !== 'object') return;
    const { kids, isArr } = containerKids(node);
    const shapes = kids.map(shapeOf);
    for (let start = 0; start < shapes.length;) {
      let end = start + 1;
      while (end < shapes.length && shapes[end] === shapes[start]) end++;
      const len = end - start;
      if (len >= PROBOLE_MIN_RECORDS) {
        const keys = isArr ? [] : Object.keys(node as JObj);
        const probe: string[] = [];
        const tpl = renderRecord(kids[start], !isArr, isArr ? null : keys[start], unit, depth + 1, probe);
        // Constant-column credit: a slot whose values are all equal collapses to
        // `*<k> <v>`, so every one of its repeats is a saved field. Without this
        // term a record that is a single scalar per element scores zero.
        let constCredit = 0;
        const columns: string[][] = probe.map(() => []);
        for (let r = 0; r < len; r++) {
          const sv: string[] = [];
          renderRecord(kids[start + r], !isArr, isArr ? null : keys[start + r], unit, depth + 1, sv);
          for (let k = 0; k < columns.length; k++) columns[k].push(sv[k] ?? '');
        }
        for (const col of columns) {
          const first = col[0];
          if (col.every((v) => v === first)) constCredit += (len - 1) * Math.max(0, first.length - 2);
        }
        const gain = (len - 1) * Math.max(0, tpl.length - 6) + constCredit - 32;
        if (gain > 0) out.push({ container: node, childDepth: depth + 1, start, len, gain });
      }
      start = end;
    }
    kids.forEach((k) => walk(k, depth + 1));
  };
  walk(root, 0);
  return out;
}

/* ------------------------------------------------------------------------- *
 * wire construction
 * ------------------------------------------------------------------------- */

function pickMarkerPair(text: string): [string, string] | null {
  for (const [a, b] of MARKER_PAIRS) if (!text.includes(a) && !text.includes(b)) return [a, b];
  return null;
}

function hasTildeKey(v: JNode): boolean {
  if (v === null || typeof v !== 'object') return false;
  if (Array.isArray(v)) return v.some(hasTildeKey);
  return Object.keys(v).some((k) => k.includes('~')) || Object.values(v).some(hasTildeKey);
}

interface Built { transformed: string; outer: string; runs: ProboleRun[] }

function buildEnvelope(parsed: JNode, unit: string, trailingLf: boolean, set: Candidate[], pair: [string, string],
  _rootKids: { kids: JNode[]; isArr: boolean }): Built {
  const byContainer = new Map<JNode, Candidate[]>();
  for (const c of set) {
    const list = byContainer.get(c.container) ?? [];
    list.push(c);
    byContainer.set(c.container, list);
  }
  const order = new Map<JNode, number>();
  [...set].sort((a, b) => a.start - b.start || b.len - a.len).forEach((c, i) => order.set(c.container, i));
  const runs: ProboleRun[] = [];

  const renderDoc = (node: JNode, depth: number): string => {
    if (node === null || typeof node !== 'object') return JSON.stringify(node);
    const { kids, keys, isArr } = containerKids(node);
    if (!kids.length) return isArr ? '[]' : '{}';
    const mine = byContainer.get(node) ?? [];
    const jump = new Map<number, Candidate>();
    for (const c of mine) jump.set(c.start, c);
    const pieces: string[] = [];
    for (let i = 0; i < kids.length;) {
      const c = jump.get(i);
      if (c) {
        const id = order.get(node)!;
        const slots: string[] = [];
        const tpl = renderRecord(kids[i], !isArr, isArr ? null : keys[i], unit, depth + 1, slots);
        const values: string[][] = Array.from({ length: slots.length }, () => []);
        for (let r = 0; r < c.len; r++) {
          const sv: string[] = [];
          renderRecord(kids[i + r], !isArr, isArr ? null : keys[i + r], unit, depth + 1, sv);
          for (let k = 0; k < slots.length; k++) values[k].push(sv[k]);
        }
        runs.push({ id, count: c.len, templateLines: tpl.split('\n'), values, templateChars: tpl.length });
        pieces.push(`${pair[0]}${id}${pair[1]}`);
        i += c.len;
        continue;
      }
      const prefix = isArr ? '' : JSON.stringify(keys[i]) + (unit === '' ? ':' : ': ');
      pieces.push(prefix + renderDoc(kids[i], depth + 1));
      i++;
    }
    if (unit === '') return isArr ? '[' + pieces.join(',') + ']' : '{' + pieces.join(',') + '}';
    const inner = pieces.map((p) => unit.repeat(depth + 1) + p).join(',\n');
    return isArr ? '[\n' + inner + '\n' + unit.repeat(depth) + ']'
      : '{\n' + inner + '\n' + unit.repeat(depth) + '}';
  };

  const outer = renderDoc(parsed, 0) + (trailingLf ? '\n' : '');
  const sepLine = (set.length ? (unit === '' ? ',' : ',\n' + unit.repeat(set[0].childDepth)) : ',');
  const lines: string[] = [proboleContract()];
  lines.push(`^S ${JSON.stringify(sepLine)}`);
  lines.push(`^O ${JSON.stringify(outer)}`);
  for (const r of [...runs].sort((a, b) => a.id - b.id)) {
    lines.push(`^T${r.id} ${JSON.stringify(r.templateLines.join('\n'))}`);
    lines.push(`^V${r.id} ${r.count}`);
    for (const col of r.values) {
      for (let x = 0; x < col.length;) {
        let y = x + 1;
        while (y < col.length && col[y] === col[x]) y++;
        lines.push(y - x > 1 ? `*${y - x} ${col[x]}` : col[x]);
        x = y;
      }
    }
  }
  return { transformed: lines.join('\n'), outer, runs };
}

/* ------------------------------------------------------------------------- *
 * independent reader
 * ------------------------------------------------------------------------- */

export function proboleRestore(envelope: string): string | null {
  const raw = envelope.split('\n');
  if (raw[0] !== proboleContract()) return null;
  let i = 1;
  const take = (prefix: string): string | null => (i < raw.length && raw[i].startsWith(prefix) ? raw[i++].slice(prefix.length) : null);
  const jsonString = (s: string | null): string | null => {
    if (s === null) return null;
    try { const p: unknown = JSON.parse(s); return typeof p === 'string' ? p : null; } catch { return null; }
  };
  const sep = jsonString(take('^S '));
  if (sep === null) return null;
  const outer = jsonString(take('^O '));
  if (outer === null) return null;

  const rendered = new Map<number, string>();
  while (i < raw.length) {
    const head = raw[i++];
    const t = /^\^T(\d+) /.exec(head);
    if (!t) return null;
    const id = Number(t[1]);
    const tpl = jsonString(head.slice(t[0].length));
    if (tpl === null) return null;
    const v = /^\^V(\d+) (\d+)$/.exec(raw[i++] ?? '');
    if (!v || Number(v[1]) !== id) return null;
    const count = Number(v[2]);
    const slots = tpl.split('~').length - 1;
    if (slots < 1 || count < 1) return null;
    const columns: string[][] = [];
    for (let s = 0; s < slots; s++) {
      const col: string[] = [];
      while (col.length < count) {
        if (i >= raw.length) return null;
        const line = raw[i++];
        const rle = /^\*(\d+) (.*)$/.exec(line);
        if (rle) {
          const k = Number(rle[1]);
          if (!(k >= 1) || col.length + k > count) return null;
          for (let x = 0; x < k; x++) col.push(rle[2]);
        } else col.push(line);
      }
      columns.push(col);
    }
    const recs: string[] = [];
    for (let r = 0; r < count; r++) {
      let s = 0;
      recs.push(tpl.split('~').map((seg, k) => (k === 0 ? seg : (columns[s++][r] ?? '') + seg)).join(''));
    }
    rendered.set(id, recs.join(sep));
  }
  return outer.replace(/⟨(\d+)⟩|⟪(\d+)⟫|⦃(\d+)⦄|❰(\d+)❱/g, (m, a, b, c, e) => {
    const id = Number(a ?? b ?? c ?? e);
    const r = rendered.get(id);
    return r === undefined ? m : r;
  });
}

/* ------------------------------------------------------------------------- *
 * planner
 * ------------------------------------------------------------------------- */

export function probolePlan(text: string, enc: EncodingName = 'o200k_base'): ProbolePlan | null {
  if (!text || text.length > PROBOLE_MAX_SOURCE_CHARS) return null;
  const trailingLf = text.endsWith('\n');
  const body = trailingLf ? text.slice(0, -1) : text;

  let parsed: JNode;
  try { parsed = JSON.parse(body) as JNode; } catch { return null; }
  if (parsed === null || typeof parsed !== 'object') return null;
  if (hasTildeKey(parsed)) return null;

  let unit = '';
  let canonical = false;
  for (const u of INDENTS) { if (renderCanonical(parsed, u) === body) { unit = u; canonical = true; break; } }
  if (!canonical) return null;

  const pair = pickMarkerPair(text);
  if (!pair) return null;

  const all = candidateRuns(parsed, unit).sort((a, b) => b.gain - a.gain || a.start - b.start || a.len - b.len);
  if (!all.length) return null;

  const rootKids = Array.isArray(parsed) ? { kids: parsed as JNode[], isArr: true } : { kids: [], isArr: false };
  const chosen: Candidate[] = [];
  let best: (Built & { tokens: number }) | null = null;

  for (const cand of all) {
    if (chosen.length >= PROBOLE_MAX_RUNS) break;
    // one shared separator: every run in an envelope must sit at the same child
    // depth, because `^S` is stated once for the whole message
    if (chosen.length && cand.childDepth !== chosen[0].childDepth) continue;
    const clash = chosen.some((c) => c.container === cand.container
      && !(cand.start + cand.len <= c.start || cand.start >= c.start + c.len));
    if (clash) continue;
    const trial = [...chosen, cand];
    let built: Built;
    try { built = buildEnvelope(parsed, unit, trailingLf, trial, pair, rootKids); } catch { continue; }
    if (!built.runs.length) continue;
    const back = proboleRestore(built.transformed);
    if (back !== text) continue;
    const tokens = countTokens(built.transformed, enc);
    if (!best || tokens < best.tokens) { chosen.push(cand); best = { ...built, tokens }; }
  }
  if (!best) return null;
  // The envelope must be cheaper than the source on its own: a projection whose
  // framing costs more than it saves is refused here, before any parent work.
  const rawTokens = countTokens(text, enc);
  if (best.tokens >= rawTokens) return null;
  return {
    text, indent: unit, childDepth: chosen[0].childDepth, outer: best.outer, runs: best.runs,
    transformed: best.transformed, exact: true,
    proxyGain: rawTokens - best.tokens,
  };
}

/* ------------------------------------------------------------------------- *
 * composed encoder: PROBOLE -> APOGRAPHE, gated against the TAGSTACK frontier
 * ------------------------------------------------------------------------- */

export interface ProboleResult extends TagstackResult {
  probole: boolean;
  candidateTokens: number | null;
  candidateExact: boolean | null;
}

function cloneResult(r: TagstackResult, ms = r.ms): TagstackResult {
  return { ...r, ms, frontierCosts: { ...r.frontierCosts }, frontierReportedCosts: { ...r.frontierReportedCosts } };
}

export function proboleEncode(text: string, enc: EncodingName = 'o200k_base'): ProboleResult {
  const started = Date.now();
  const baseline = tagstackEncode(text, enc);
  const fallback = (notes: string, candidateTokens: number | null = null,
    candidateExact: boolean | null = null, candidateMessage: string | null = null): ProboleResult => ({
      ...cloneResult(baseline, Date.now() - started),
      probole: false, candidateMessage, candidateTokens, candidateExact,
      notes: `${notes}; fallback=${baseline.parentCodec}:${baseline.messageTokens}`,
    });
  if (!baseline.exact || !baseline.frontierComplete) return fallback('source parent gate incomplete');

  let plan: ProbolePlan | null = null;
  try { plan = probolePlan(text, enc); } catch { plan = null; }
  if (!plan) return fallback('outside the canonical-JSON projection domain, or no run pays');

  // The envelope is handed to the SAME measured frontier, not to one fixed
  // parent: the transform is a layer above the frontier (as TAGSTACK and
  // SIBLING-TEMPLATE are), so whichever in-band parent is best for the envelope
  // is the one that is used, and its own contract travels with it.
  let child;
  try { child = tagstackEncode(plan.transformed, enc); } catch { return fallback('envelope frontier encode failed'); }
  if (!child.exact || !child.frontierComplete) return fallback('envelope frontier gate incomplete');
  const parentDecoded = child.decoded;
  const candidateMessage = `${proboleContract()}\n${child.message}`;
  const restored = parentDecoded === plan.transformed ? proboleRestore(parentDecoded) : null;
  const candidateExact = restored === text
    && Buffer.compare(Buffer.from(restored ?? '', 'utf8'), Buffer.from(text, 'utf8')) === 0;
  const candidateTokens = countTokens(candidateMessage, enc);
  if (!candidateExact) return fallback('composed decoder failed exactness', candidateTokens, false, candidateMessage);
  if (candidateTokens >= baseline.messageTokens) {
    return fallback(`candidate M=${candidateTokens} >= source frontier M=${baseline.messageTokens}`,
      candidateTokens, true, candidateMessage);
  }
  return {
    ...baseline, wire: child.wire, message: candidateMessage, decoded: restored!, exact: true,
    messageTokens: candidateTokens, applied: true, arm: 'tagstack',
    candidateTokens, candidateExact: true, candidateMessage,
    notes: `PROBOLE accepted: ${plan.runs.length} run(s), ${plan.runs.reduce((a, r) => a + r.count, 0)} records, `
      + `M=${candidateTokens} < ${baseline.parentCodec} frontier M=${baseline.messageTokens}`,
    ms: Date.now() - started, probole: true,
  };
}
