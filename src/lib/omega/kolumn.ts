/**
 * KOLUMN — exact in-band columnar transform for rectangular delimited text.
 *
 * Each column independently chooses a literal stream, a constant, a reference
 * to an earlier identical column, or fixed-point integer deltas. The transform
 * is a compact self-contained message; a receiver needs no schema outside it.
 * Column stores and delta coding are established prior art (e.g. PAX, Gorilla,
 * PForDelta); this module claims only a repository-specific, bounded chat-codec
 * path, not a new compression primitive.
 */

import { countTokens, type EncodingName } from './bpe';
import { apographeDecodeResult, apographeEncode } from './apographe';
import { siblingTemplateEncode, type SiblingTemplateResult } from './sibling-template';
import { tagstackEncode, type TagstackResult } from './tagstack';

export const KOLUMN_MAX_CHARS = 100_000;
export const KOLUMN_MAX_ROWS = 10_000;
export const KOLUMN_MAX_COLS = 32;
export const KOLUMN_MIN_ROWS = 8;
const MARKERS = ['⟪', '⟫', '§', '¤', '‡', '°', 'µ', '◆', '⁞', '␟', '‖', '¶', '¦', '※', '~', '^', '@', '!', '%', '+', '='];

export interface KolumnDelimiters {
  open: string;
  close: string;
  meta: string;
  col: string;
  value: string;
}

export interface KolumnPlan {
  wire: string;
  decoded: string;
  exact: boolean;
  delimiter: string;
  eol: string;
  trailingEol: boolean;
  rows: number;
  cols: number;
  modes: string[];
  delimiters: KolumnDelimiters;
  proxyTokens: number;
}

export interface KolumnResult {
  codec: 'kolumn';
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
  rows: number;
  cols: number;
  modes: string[];
  candidateTokens: number | null;
  candidateExact: boolean | null;
  candidateMessage: string | null;
  plan: KolumnPlan | null;
  notes: string;
  ms: number;
}

interface ParsedTable {
  delimiter: string;
  eol: string;
  trailingEol: boolean;
  rows: string[][];
  header: string;
}

function pickDelimiters(text: string, enc: EncodingName): KolumnDelimiters | null {
  const safe = MARKERS.filter(m => !text.includes(m) && countTokens(m, enc) === 1);
  if (safe.length < 5) return null;
  return { open: safe[0], close: safe[1], meta: safe[2], col: safe[3], value: safe[4] };
}

function parseTable(text: string): ParsedTable | null {
  if (!text.length || text.length > KOLUMN_MAX_CHARS) return null;
  const hasCRLF = text.includes('\r\n');
  if (hasCRLF && /(^|[^\r])\n/.test(text.replace(/\r\n/g, ''))) return null;
  if (hasCRLF && /\r(?!\n)/.test(text)) return null;
  const eol = hasCRLF ? '\r\n' : '\n';
  const trailingEol = text.endsWith(eol);
  const body = trailingEol ? text.slice(0, -eol.length) : text;
  const lines = body.split(eol);
  if (lines.length < KOLUMN_MIN_ROWS + 1 || lines.length > KOLUMN_MAX_ROWS + 1 || lines.some(l => !l.length)) return null;
  // Deliberately refuse CSV quoting and embedded newlines: the raw split is
  // sound only for unquoted rectangular records. A miss is a no-op, never loss.
  if (lines.some(l => l.includes('"'))) return null;
  let best: ParsedTable | null = null;
  for (const delimiter of [',', '\t', '|', ';']) {
    const rows = lines.map(line => line.split(delimiter));
    const cols = rows[0].length;
    if (cols < 2 || cols > KOLUMN_MAX_COLS || rows.some(r => r.length !== cols)) continue;
    if (!best || cols > best.rows[0].length) {
      best = { delimiter, eol, trailingEol, rows: rows.slice(1), header: lines[0] };
    }
  }
  if (!best || best.rows.length < KOLUMN_MIN_ROWS) return null;
  return best;
}

function parseIsoValue(s: string): { ms: number; kind: 'date' | 'timestamp' } | null {
  const dateOnly = s.match(/^([1-9][0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$/);
  const timestamp = s.match(/^([1-9][0-9]{3})-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])Z$/);
  const match = dateOnly ?? timestamp;
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = timestamp ? Number(match[4]) : 0;
  const minute = timestamp ? Number(match[5]) : 0;
  const second = timestamp ? Number(match[6]) : 0;
  const ms = Date.UTC(year, month - 1, day, hour, minute, second);
  if (!Number.isSafeInteger(ms)) return null;
  const d = new Date(ms);
  const canonical = timestamp ? d.toISOString().replace('.000Z', 'Z') : d.toISOString().slice(0, 10);
  return canonical === s ? { ms, kind: timestamp ? 'timestamp' : 'date' } : null;
}

function renderIsoValue(ms: number, kind: 'date' | 'timestamp'): string | null {
  if (!Number.isSafeInteger(ms)) return null;
  try {
    const d = new Date(ms);
    const value = kind === 'timestamp' ? d.toISOString().replace('.000Z', 'Z') : d.toISOString().slice(0, 10);
    return parseIsoValue(value)?.ms === ms && parseIsoValue(value)?.kind === kind ? value : null;
  } catch { return null; }
}

function parseFixedDecimal(s: string): { value: bigint; scale: number } | null {
  const m = s.match(/^(-?)(0|[1-9][0-9]*)(?:\.([0-9]+))?$/);
  if (!m) return null;
  const scale = m[3]?.length ?? 0;
  const magnitude = BigInt(m[2] + (m[3] ?? ''));
  if (m[1] === '-' && magnitude === 0n) return null; // preserve negative-zero spelling by falling back to literals
  return { value: m[1] === '-' ? -magnitude : magnitude, scale };
}

function renderFixed(value: bigint, scale: number): string {
  const negative = value < 0n;
  let digits = (negative ? -value : value).toString();
  if (scale === 0) return `${negative ? '-' : ''}${digits}`;
  digits = digits.padStart(scale + 1, '0');
  return `${negative ? '-' : ''}${digits.slice(0, -scale)}.${digits.slice(-scale)}`;
}

function chooseColumnDescriptor(values: string[], previous: string[][], d: KolumnDelimiters, enc: EncodingName): { descriptor: string; mode: string } {
  const choices: Array<{ descriptor: string; mode: string; cost: number }> = [];
  choices.push({ descriptor: `L${d.value}${values.join(d.value)}`, mode: 'L', cost: countTokens(`L${d.value}${values.join(d.value)}`, enc) });
  if (values.every(v => v === values[0])) {
    const descriptor = `C${d.value}${values[0]}`;
    choices.push({ descriptor, mode: 'C', cost: countTokens(descriptor, enc) });
  }
  const duplicateAt = previous.findIndex(col => col.length === values.length && col.every((v, i) => v === values[i]));
  if (duplicateAt >= 0) {
    const descriptor = `R${d.value}${duplicateAt}`;
    choices.push({ descriptor, mode: `R${duplicateAt}`, cost: countTokens(descriptor, enc) });
  }
  const maxPeriod = Math.min(64, Math.floor(values.length / 2));
  for (let period = 2; period <= maxPeriod; period++) {
    if (!values.every((v, i) => v === values[i % period])) continue;
    const descriptor = `Q${period}${d.value}${values.slice(0, period).join(d.value)}`;
    choices.push({ descriptor, mode: `Q${period}`, cost: countTokens(descriptor, enc) });
  }
  const iso = values.map(parseIsoValue);
  if (iso.every((v): v is { ms: number; kind: 'date' | 'timestamp' } => v !== null)
    && iso.every(v => v.kind === iso[0].kind)) {
    const step = iso[1].ms - iso[0].ms;
    if (Number.isSafeInteger(step) && iso.every((v, i) => v.ms === iso[0].ms + i * step)) {
      const descriptor = `T${d.value}${step}${d.value}${values[0]}`;
      choices.push({ descriptor, mode: 'T', cost: countTokens(descriptor, enc) });
    }
  }
  const parsed = values.map(parseFixedDecimal);
  if (parsed.every((v): v is { value: bigint; scale: number } => v !== null)
    && parsed.every(v => v.scale === parsed[0].scale)) {
    const nums = parsed.map(v => v.value);
    const deltas = nums.slice(1).map((n, i) => n - nums[i]);
    const deltaDescriptor = `D${parsed[0].scale}${d.value}${[nums[0].toString(), ...deltas.map(x => x.toString())].join(d.value)}`;
    choices.push({ descriptor: deltaDescriptor, mode: `D${parsed[0].scale}`, cost: countTokens(deltaDescriptor, enc) });
    const maxDeltaPeriod = Math.min(64, Math.floor(deltas.length / 2));
    for (let period = 2; period <= maxDeltaPeriod; period++) {
      if (!deltas.every((delta, i) => delta === deltas[i % period])) continue;
      const cycle = `G${parsed[0].scale}x${period}${d.value}${nums[0]}${d.value}${deltas.slice(0, period).map(x => x.toString()).join(d.value)}`;
      choices.push({ descriptor: cycle, mode: `G${parsed[0].scale}x${period}`, cost: countTokens(cycle, enc) });
    }
    const step = deltas[0];
    if (nums.every((n, i) => n === nums[0] + BigInt(i) * step)) {
      const progression = `P${parsed[0].scale}${d.value}${nums[0]}${d.value}${step}`;
      choices.push({ descriptor: progression, mode: `P${parsed[0].scale}`, cost: countTokens(progression, enc) });
    }
  }
  choices.sort((a, b) => a.cost - b.cost || (a.mode < b.mode ? -1 : 1));
  return { descriptor: choices[0].descriptor, mode: choices[0].mode };
}

export function kolumnContractFor(
  d: KolumnDelimiters,
  modes: readonly string[] = ['L', 'C', 'R0', 'Q2', 'T', 'D0', 'G0x2', 'P0'],
): string {
  const kinds = new Set(modes.map(mode => mode[0]));
  const rules: string[] = [];
  if (kinds.has('L')) rules.push('L=list n values');
  if (kinds.has('C')) rules.push('C=one value ×n');
  if (kinds.has('R')) rules.push('R=0-based prior-column index');
  if (kinds.has('Q')) rules.push('Qp cycles p values');
  if (kinds.has('T')) rules.push('T=UTC ISO date/sec base+i·step-ms');
  if (kinds.has('D')) rules.push('Dk=first+running signed deltas');
  if (kinds.has('G')) rules.push('Gkxp=base+cyclic p signed deltas');
  if (kinds.has('P')) rules.push('Pk=base+i·step');
  if (['T', 'G', 'P'].some(mode => kinds.has(mode))) rules.push('i=0-based row');
  const scaled = ['D', 'G', 'P'].filter(mode => kinds.has(mode));
  if (scaled.length) rules.push(`${scaled.join('/')}÷10^k`);
  return `After parent: header/EOL literal; ${d.open}sep${d.meta}n=rows${d.meta}cols${d.close}[EOL]. ${d.col}=columns,${d.value}=values; ${rules.join('; ')}. Rows join sep/EOL.`;
}

export function kolumnEncodeTransform(text: string, enc: EncodingName = 'o200k_base'): KolumnPlan | null {
  const table = parseTable(text);
  if (!table) return null;
  const d = pickDelimiters(text, enc);
  if (!d) return null;
  const columns: string[][] = Array.from({ length: table.rows[0].length }, (_, j) => table.rows.map(row => row[j]));
  const descriptors: string[] = [];
  const modes: string[] = [];
  const decodedColumns: string[][] = [];
  for (const values of columns) {
    const selected = chooseColumnDescriptor(values, decodedColumns, d, enc);
    descriptors.push(selected.descriptor);
    modes.push(selected.mode);
    decodedColumns.push(values);
  }
  const eolTag = table.eol === '\r\n' ? 'CRLF' : 'LF';
  const wire = table.header + table.eol + d.open + table.delimiter + d.meta + String(table.rows.length)
    + d.meta + descriptors.join(d.col) + d.close + (table.trailingEol ? table.eol : '');
  const decoded = kolumnDecode(wire, d);
  if (decoded !== text) return null;
  return { wire, decoded, exact: true, delimiter: table.delimiter, eol: eolTag,
    trailingEol: table.trailingEol, rows: table.rows.length, cols: columns.length,
    modes, delimiters: d, proxyTokens: countTokens(text, enc) - countTokens(wire, enc) };
}

/** Decode a KOLUMN table wire; malformed framing or columns fail closed. */
export function kolumnDecode(wire: string, d: KolumnDelimiters): string | null {
  const firstLf = wire.indexOf('\n');
  if (firstLf < 0) return null;
  const eol = firstLf > 0 && wire[firstLf - 1] === '\r' ? '\r\n' : '\n';
  const headerEnd = firstLf - (eol === '\r\n' ? 1 : 0);
  const header = wire.slice(0, headerEnd);
  const dataStart = firstLf + 1;
  if (wire[dataStart] !== d.open) return null;
  const delimiterAt = dataStart + d.open.length;
  const delimiter = wire[delimiterAt];
  if (!delimiter || ![',', '\t', '|', ';'].includes(delimiter)) return null;
  const meta1 = wire.indexOf(d.meta, delimiterAt + 1);
  if (meta1 !== delimiterAt + 1) return null;
  const meta2 = wire.indexOf(d.meta, meta1 + d.meta.length);
  if (meta2 < 0) return null;
  const rowCount = Number(wire.slice(meta1 + d.meta.length, meta2));
  if (!Number.isSafeInteger(rowCount) || rowCount < KOLUMN_MIN_ROWS || rowCount > KOLUMN_MAX_ROWS) return null;
  const columnsStart = meta2 + d.meta.length;
  const closeAt = wire.indexOf(d.close, columnsStart);
  if (closeAt < 0) return null;
  const suffix = wire.slice(closeAt + d.close.length);
  const trailingEol = suffix === eol;
  if (suffix !== '' && !trailingEol) return null;
  const encodedColumns = wire.slice(columnsStart, closeAt).split(d.col);
  if (encodedColumns.length < 2 || encodedColumns.length > KOLUMN_MAX_COLS) return null;
  if (header.split(delimiter).length !== encodedColumns.length) return null;
  const columns: string[][] = [];
  for (const descriptor of encodedColumns) {
    const sepAt = descriptor.indexOf(d.value);
    const mode = sepAt < 0 ? descriptor : descriptor.slice(0, sepAt);
    const valuesText = sepAt < 0 ? '' : descriptor.slice(sepAt + d.value.length);
    const values = sepAt < 0 ? [] : valuesText.split(d.value);
    if (mode === 'L') {
      if (values.length !== rowCount) return null;
      columns.push(values);
    } else if (mode === 'C') {
      if (values.length !== 1) return null;
      columns.push(Array(rowCount).fill(values[0]));
    } else if (mode === 'T') {
      if (values.length !== 2) return null;
      const step = Number(values[0]);
      const base = parseIsoValue(values[1]);
      if (!Number.isSafeInteger(step) || !base) return null;
      const decoded: string[] = [];
      for (let i = 0; i < rowCount; i++) {
        const value = renderIsoValue(base.ms + i * step, base.kind);
        if (value === null) return null;
        decoded.push(value);
      }
      columns.push(decoded);
    } else if (mode.startsWith('R')) {
      if (values.length !== 1) return null;
      const index = Number(values[0]);
      if (!Number.isInteger(index) || index < 0 || index >= columns.length) return null;
      columns.push([...columns[index]]);
    } else if (/^Q[1-9][0-9]*$/.test(mode)) {
      const period = Number(mode.slice(1));
      if (!Number.isSafeInteger(period) || period < 2 || period >= rowCount || values.length !== period) return null;
      columns.push(Array.from({ length: rowCount }, (_, i) => values[i % period]));
    } else if (/^G(?:0|[1-9][0-9]*)x[1-9][0-9]*$/.test(mode)) {
      const match = mode.match(/^G(0|[1-9][0-9]*)x([1-9][0-9]*)$/)!;
      const scale = Number(match[1]);
      const period = Number(match[2]);
      if (!Number.isSafeInteger(scale) || scale > 64 || !Number.isSafeInteger(period)
        || period < 2 || period >= rowCount - 1 || values.length !== period + 1) return null;
      let running: bigint;
      try { running = BigInt(values[0]); } catch { return null; }
      const deltas: bigint[] = [];
      try { for (let i = 1; i < values.length; i++) deltas.push(BigInt(values[i])); } catch { return null; }
      const decoded = [renderFixed(running, scale)];
      for (let i = 1; i < rowCount; i++) {
        running += deltas[(i - 1) % period];
        decoded.push(renderFixed(running, scale));
      }
      columns.push(decoded);
    } else if (/^D(?:0|[1-9][0-9]*)$/.test(mode)) {
      const scale = Number(mode.slice(1));
      if (!Number.isSafeInteger(scale) || scale < 0 || scale > 64 || values.length !== rowCount) return null;
      let running: bigint;
      try { running = BigInt(values[0]); } catch { return null; }
      const decoded = [renderFixed(running, scale)];
      for (let i = 1; i < values.length; i++) {
        let delta: bigint;
        try { delta = BigInt(values[i]); } catch { return null; }
        running += delta;
        decoded.push(renderFixed(running, scale));
      }
      columns.push(decoded);
    } else if (/^P(?:0|[1-9][0-9]*)$/.test(mode)) {
      const scale = Number(mode.slice(1));
      if (!Number.isSafeInteger(scale) || scale < 0 || scale > 64 || values.length !== 2) return null;
      let base: bigint, step: bigint;
      try { base = BigInt(values[0]); step = BigInt(values[1]); } catch { return null; }
      columns.push(Array.from({ length: rowCount }, (_, i) => renderFixed(base + BigInt(i) * step, scale)));
    } else return null;
  }
  const rows: string[] = [];
  for (let i = 0; i < rowCount; i++) rows.push(columns.map(c => c[i]).join(delimiter));
  return header + eol + rows.join(eol) + (trailingEol ? eol : '');
}

/** Exact candidate wrapper over the measured TAGSTACK + SIBLING-TEMPLATE floor. */
export function kolumnEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  measuredTag?: TagstackResult,
  measuredSibling?: SiblingTemplateResult,
): KolumnResult {
  const started = Date.now();
  const tag = measuredTag ?? tagstackEncode(text, enc);
  const sibling = measuredSibling ?? siblingTemplateEncode(text, enc, tag);
  const parent = sibling.messageTokens <= tag.messageTokens ? sibling : tag;
  const parentCodec = parent === sibling
    ? (sibling.applied ? 'sibling-template' : sibling.parentCodec)
    : (tag.applied ? 'tagstack' : tag.parentCodec);
  const fallback = (why: string, plan: KolumnPlan | null = null, candidateTokens: number | null = null,
    candidateExact: boolean | null = null, candidateMessage: string | null = null): KolumnResult => ({
    codec: 'kolumn', wire: parent.wire, message: parent.message, decoded: parent.decoded,
    exact: parent.decoded === text, inTokens: parent.inTokens, messageTokens: parent.messageTokens,
    parentTokens: parent.messageTokens, parentCodec, frontierCosts: tag.frontierCosts,
    applied: false, rows: plan?.rows ?? 0, cols: plan?.cols ?? 0, modes: plan?.modes ?? [],
    candidateTokens, candidateExact, candidateMessage, plan, notes: why, ms: Date.now() - started,
  });
  const plan = kolumnEncodeTransform(text, enc);
  if (!plan) return fallback('not a bounded rectangular unquoted delimited table');
  const contract = kolumnContractFor(plan.delimiters, plan.modes);
  const candidates: Array<{ message: string; wire: string; decoded: string; tokens: number; parent: string }> = [];
  const directMessage = contract + '\n' + plan.wire;
  const directDecoded = kolumnDecode(plan.wire, plan.delimiters);
  candidates.push({ message: directMessage, wire: plan.wire, decoded: directDecoded ?? '',
    tokens: countTokens(directMessage, enc), parent: 'identity' });
  try {
    const a = apographeEncode(plan.wire, enc);
    const parentDecoded = apographeDecodeResult(a);
    const decoded = kolumnDecode(parentDecoded, plan.delimiters);
    const message = contract + '\n' + (a.contract ? a.contract + '\n' : '') + a.wire;
    if (decoded === text) candidates.push({ message, wire: a.wire, decoded, tokens: countTokens(message, enc), parent: 'APOGRAPHE' });
  } catch { /* Direct KOLUMN candidate remains available. */ }
  candidates.sort((a, b) => a.tokens - b.tokens);
  const best = candidates[0];
  const candidateExact = best.decoded === text;
  if (!candidateExact) return fallback('KOLUMN parent inverse failed exact reconstruction', plan,
    best.tokens, false, best.message);
  if (best.tokens >= parent.messageTokens) return fallback(
    `candidate M=${best.tokens} not below measured ${parentCodec} floor M=${parent.messageTokens}`,
    plan, best.tokens, true, best.message);
  return { codec: 'kolumn', wire: best.wire, message: best.message, decoded: best.decoded, exact: true,
    inTokens: parent.inTokens, messageTokens: best.tokens, parentTokens: parent.messageTokens, parentCodec,
    frontierCosts: tag.frontierCosts, applied: true, rows: plan.rows, cols: plan.cols, modes: plan.modes,
    candidateTokens: best.tokens, candidateExact: true, candidateMessage: best.message, plan,
    notes: `${plan.rows} rows × ${plan.cols} columns; modes=${plan.modes.join(',')}; ${best.parent}; `
      + `M=${best.tokens} < ${parentCodec} M=${parent.messageTokens}`, ms: Date.now() - started };
}

export function kolumnSelfTests(enc: EncodingName = 'o200k_base') {
  const fixtures = [
    { name: 'fixed-decimal deltas and duplicate columns', text: 'date,open,high,copy\n2026-01-01,10.00,10.00,10.00\n2026-01-02,10.25,10.25,10.25\n2026-01-03,10.50,10.50,10.50\n2026-01-04,10.75,10.75,10.75\n2026-01-05,11.00,11.00,11.00\n2026-01-06,11.25,11.25,11.25\n2026-01-07,11.50,11.50,11.50\n2026-01-08,11.75,11.75,11.75\n2026-01-09,12.00,12.00,12.00\n', expect: true },
    { name: 'CRLF and no trailing newline', text: 'day,qty\r\n1,100\r\n2,101\r\n3,102\r\n4,103\r\n5,104\r\n6,105\r\n7,106\r\n8,107', expect: true },
    { name: 'quoted CSV refused', text: 'a,b\n1,"x,y"\n2,"z,w"\n3,"q,r"\n4,"t,u"\n5,"v,w"\n6,"x,y"\n7,"z,w"\n8,"q,r"\n', expect: false },
    { name: 'ragged rows refused', text: 'a,b\n1,2\n3,4\n5,6\n7,8\n9,10\n11,12\n13\n', expect: false },
    { name: 'precision mismatch refuses delta but literal remains exact', text: 'day,value\n1,1.0\n2,1.00\n3,1.000\n4,1.0000\n5,1.00000\n6,1.000000\n7,1.0000000\n8,1.00000000\n', expect: true },
    { name: 'leading zeroes refuse delta but remain literal', text: 'day,value\n1,001\n2,002\n3,003\n4,004\n5,005\n6,006\n7,007\n8,008\n', expect: true },
    { name: 'negative zero remains literal', text: 'day,value\n1,-0.00\n2,0.00\n3,1.00\n4,2.00\n5,3.00\n6,4.00\n7,5.00\n8,6.00\n', expect: true },
    { name: 'exponent values remain literal', text: 'day,value\n1,1e-3\n2,2e-3\n3,3e-3\n4,4e-3\n5,5e-3\n6,6e-3\n7,7e-3\n8,8e-3\n', expect: true },
    { name: 'small table below row threshold', text: 'a,b\n1,2\n3,4\n5,6\n', expect: false },
    { name: 'ordinary prose refused', text: 'A sentence, not a rectangular table; columns are not stable.', expect: false },
  ];
  const results = fixtures.map(f => {
    const plan = kolumnEncodeTransform(f.text, enc);
    const exact = !plan || kolumnDecode(plan.wire, plan.delimiters) === f.text;
    const pass = Boolean(plan) === f.expect && exact;
    return { name: f.name, pass, planned: Boolean(plan), exact: plan ? exact : null,
      rows: plan?.rows ?? 0, cols: plan?.cols ?? 0, modes: plan?.modes ?? [] };
  });
  const cycleText = 'id,value\nr0,100\nr1,101\nr2,103\nr3,104\nr4,106\nr5,107\nr6,109\nr7,110\n';
  const cyclePlan = kolumnEncodeTransform(cycleText, enc);
  const cycleExact = Boolean(cyclePlan) && kolumnDecode(cyclePlan!.wire, cyclePlan!.delimiters) === cycleText;
  results.push({ name: 'periodic signed-delta cycle', pass: cycleExact && cyclePlan!.modes.includes('G0x2'),
    planned: Boolean(cyclePlan), exact: cyclePlan ? cycleExact : null,
    rows: cyclePlan?.rows ?? 0, cols: cyclePlan?.cols ?? 0, modes: cyclePlan?.modes ?? [] });
  const dateText = 'date,value\n' + Array.from({ length: 8 }, (_, i) => {
    const day = new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10);
    return `${day},${100 + i * 2}`;
  }).join('\n') + '\n';
  const datePlan = kolumnEncodeTransform(dateText, enc);
  const dateExact = Boolean(datePlan) && kolumnDecode(datePlan!.wire, datePlan!.delimiters) === dateText;
  results.push({ name: 'ISO date arithmetic progression', pass: dateExact && datePlan!.modes[0] === 'T',
    planned: Boolean(datePlan), exact: datePlan ? dateExact : null,
    rows: datePlan?.rows ?? 0, cols: datePlan?.cols ?? 0, modes: datePlan?.modes ?? [] });
  const timestampText = 'ts,value\n' + Array.from({ length: 9 }, (_, i) => {
    const ts = new Date(Date.UTC(2024, 1, 28, 23, 59, 58) + i * 2000).toISOString().replace('.000Z', 'Z');
    return `${ts},${100 + i * 2}`;
  }).join('\n') + '\n';
  const timestampPlan = kolumnEncodeTransform(timestampText, enc);
  const timestampExact = Boolean(timestampPlan) && kolumnDecode(timestampPlan!.wire, timestampPlan!.delimiters) === timestampText;
  results.push({ name: 'UTC seconds cross leap day', pass: timestampExact && timestampPlan!.modes[0] === 'T',
    planned: Boolean(timestampPlan), exact: timestampPlan ? timestampExact : null,
    rows: timestampPlan?.rows ?? 0, cols: timestampPlan?.cols ?? 0, modes: timestampPlan?.modes ?? [] });
  return results;
}
