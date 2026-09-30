/**
 * src/lib/omega/pinax.ts
 * =============================================================================
 * PINAX-▦  (Greek πίναξ — a "tablet / board / register / TABLE"; Callimachus's
 * Πίνακες was antiquity's first library catalogue — a columnar table of records)
 * Byte-Exact Columnar Record-Projection Codec
 * (self-verifying · byte-exact · lossless · direct-reasoning · bare-LLM-readable)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE MEASURED BLIND SPOT (structural redundancy in record data)
 * ─────────────────────────────────────────────────────────────────────────────
 * Real ops payloads are RECORDS: JSON Lines (ndjson / `jq -c` / log streams /
 * MongoDB, BigQuery, Athena, Spark exports) and compact JSON arrays of objects
 * (API responses, DB dumps). Serialized for interchange, every row re-states the
 * SAME field names, braces, colons and quotes. On o200k_base that repetition is
 * billed in full — measured on the live tokenizer (`bench/pinax-redteam.ts`):
 *   10-row event JSONL      370 tok → 119 tok  (−68%)
 *   15-row API-response set  422 tok → 211 tok  (−50%)
 *   8-row compact JSON array 139 tok →  56 tok  (−60%)
 * The independent literature agrees the tax is real and dominated by KEY
 * repetition: ONTO (arXiv 2604.17512) and TOON both report 46–51% JSON→columnar
 * reduction, "key elimination accounts for >100% of gross savings."
 *
 * WHY THIS IS A NEW LANE (not covered by the existing 150+ codecs)
 *   - The canonicalization pre-passes (KRASIS/LYSIS/CIRCE/CAESURA/…) are STATELESS
 *     per-character restorations; NONE exploit inter-record redundancy. On clean
 *     JSONL they all decline → identity (370).
 *   - The max-compression grammar lane (proteus/panacea/episteme) DOES exploit it,
 *     but emits an UNREADABLE dictionary scramble (`§票","ok":true,…中{"ts":…彩票`)
 *     that a bare LLM cannot reason over.
 *   - PINAX is the first codec that compresses record data while producing a MORE
 *     readable wire than the input: a JSON template + a value table.
 *
 * WHY THIS IS NEW vs the columnar STATE OF THE ART (ONTO / TOON)
 *   ONTO/TOON are one-way reformatters: their "lossless" round-trip is at the JSON
 *   *value* level only — decoding restores JSON "byte-for-byte EXCLUDING whitespace
 *   variation in numbers and optional quotes" (Tensorlake), "after NORMALIZATION"
 *   (toonformat.dev). They cannot reproduce the ORIGINAL input bytes. PINAX is
 *   byte-EXACT on the original text: it captures the exact structural TEMPLATE
 *   (whitespace, number literals, quote/escape choices, key order) and restores it
 *   verbatim, gated by self-verification. That closes the open interface the
 *   published formats leave.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MECHANISM  (KRASIS/VEXILLA-style: transform + self-verify, never a claim)
 * ─────────────────────────────────────────────────────────────────────────────
 *  1. Parse each record as a FLAT JSON object (scalar values only). Capture, per
 *     value, its exact source span — for strings, the INNER content only, so the
 *     quotes stay in the template and table cells are naturally unquoted.
 *  2. Require a UNIFORM skeleton: every record must share the identical structural
 *     bytes (same keys, order, punctuation, whitespace) — true of machine-emitted
 *     record data. Otherwise decline → identity.
 *  3. HOIST constant columns: any field whose value literal is identical in every
 *     record is baked into the template once (never repeated per row).
 *  4. Emit:  ▦<KIND> n=<rows>[ nl]
 *            <template with ◇ at each VARYING field>
 *            <row 1 varying values, tab-separated>  …  <row n>
 *  5. Decode = split the template on ◇ and interleave each row's tab-separated
 *     values; JSONL joins records with "\n" (+ optional trailing "\n"); JSONA
 *     wraps compact "[" … "," … "]".
 *  6. SELF-VERIFY GATE: emit ONLY IF pinaxDecode(wire) === input byte-for-byte AND
 *     the contract-inclusive message is strictly cheaper; else total identity.
 *     Savings are therefore never overstated; non-record / irregular / tiny inputs
 *     are returned untouched.
 *  7. BARE-LLM CONTRACT: one short inline header states the ◇/tab rule. The wire
 *     is directly reasoning-ready (a JSON template + a value table), and — unlike
 *     KRASIS's NFD or STOICHEIA's styled glyphs — a bare LLM can itself reconstruct
 *     every record exactly by filling ◇ (trivial substitution); our decoder
 *     guarantees the bytes.
 *
 * GROUNDING (real, published, ≤ 50 years, NEW this turn — not used by prior codecs):
 *   - ONTO: A Token-Efficient Columnar Notation for LLM Input Optimization,
 *     arXiv:2604.17512 (2026): 46–51% JSON→columnar token reduction; "schema-once,
 *     data-many"; key-elimination dominates; crossover at ~2 records.
 *   - TOON (Token-Oriented Object Notation), github.com/toon-format/toon &
 *     toonformat.dev & tensorlake.ai/blog/toon-vs-json (2025–26): tabular arrays,
 *     42.6% fewer tokens; round-trip lossless only up to number/quote NORMALIZATION
 *     — i.e. NOT byte-exact on the source, which is exactly what PINAX adds.
 *   - reinforcementcoding.com/blog/context-compression-efficient-data-formats:
 *     columnar JSON 25–50%; markdown-table 20–40% on 100+ rows.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';

export const PINAX_MARK = '\u25A6';   // ▦  wire prefix / "PINAX applied"
const HOLE = '\u0000';                // internal placeholder (never displayed)
const SHOW = '\u25C7';                // ◇  displayed placeholder for a varying field (1 token)
const DELIM = '\t';                   // column delimiter (1-token adjacency on o200k)

export const PINAX_SYSTEM_PROMPT =
  '▦ marks a compact record table. The line after the "▦…" header is a JSON ' +
  'template; ◇ marks each field whose value varies from record to record. Every ' +
  'following line is one record: its ◇ values in order, separated by tabs (n = ' +
  'record count). Reconstruct each record by filling the template\u2019s ◇ with ' +
  'that line\u2019s values, then read/emit them as normal JSON.';

// ── flat-object scanner ──────────────────────────────────────────────────────
// Returns value spans (for strings: the INNER content, quotes excluded) or null.
interface Scan { spans: [number, number][]; end: number; }
function scanFlatObject(s: string, i0: number): Scan | null {
  let i = i0;
  const n = s.length;
  const ws = () => { while (i < n && (s[i] === ' ' || s[i] === '\t')) i++; };
  ws();
  if (s[i] !== '{') return null;
  i++;
  const spans: [number, number][] = [];
  ws();
  if (s[i] === '}') { i++; return { spans, end: i }; }
  while (i < n) {
    ws();
    if (s[i] !== '"') return null;              // key
    i++;
    while (i < n) { const c = s[i++]; if (c === '\\') { i++; continue; } if (c === '"') break; }
    ws();
    if (s[i] !== ':') return null;
    i++;
    ws();
    const c = s[i];
    if (c === '"') {                            // string value → inner span
      i++;
      const vs = i;
      while (i < n) { const cc = s[i]; if (cc === '\\') { i += 2; continue; } if (cc === '"') break; i++; }
      if (i >= n) return null;
      spans.push([vs, i]);
      i++;                                       // closing quote
    } else if (c === '{' || c === '[') {
      return null;                               // v1: scalars only
    } else {                                     // number / true / false / null literal
      const vs = i;
      while (i < n && s[i] !== ',' && s[i] !== '}' && s[i] !== ' ' && s[i] !== '\t' && s[i] !== ']') i++;
      if (i === vs) return null;
      spans.push([vs, i]);
    }
    ws();
    if (s[i] === ',') { i++; continue; }
    if (s[i] === '}') { i++; return { spans, end: i }; }
    return null;
  }
  return null;
}

const hasReserved = (v: string) => v.includes(DELIM) || v.includes('\n') || v.includes(HOLE) || v.includes(SHOW);

interface Built { wire: string; template: string; kind: 'JSONL' | 'JSONA'; rows: number; cols: number; varCols: number; }

// Build wire from a list of records that each expose value spans over a shared source string.
function assemble(
  kind: 'JSONL' | 'JSONA',
  source: string,
  recs: { start: number; end: number; spans: [number, number][] }[],
  nlFlag: boolean,
): Built | null {
  const C = recs[0].spans.length;
  if (C < 1) return null;
  if (!recs.every((r) => r.spans.length === C)) return null;

  // relative skeleton of a record = its bytes with each value span → HOLE
  const skel = (r: { start: number; end: number; spans: [number, number][] }) => {
    let o = '';
    let last = r.start;
    for (const [a, b] of r.spans) { o += source.slice(last, a) + HOLE; last = b; }
    return o + source.slice(last, r.end);
  };
  const sk0 = skel(recs[0]);
  if (sk0.includes('\n')) return null;                       // single-line records only
  for (let k = 1; k < recs.length; k++) if (skel(recs[k]) !== sk0) return null;

  // per-column raw value literals
  const vals = recs.map((r) => r.spans.map(([a, b]) => source.slice(a, b)));

  // constant-column detection
  const constant: boolean[] = [];
  for (let j = 0; j < C; j++) { const v0 = vals[0][j]; constant[j] = vals.every((row) => row[j] === v0); }
  const varIdx: number[] = [];
  for (let j = 0; j < C; j++) if (!constant[j]) varIdx.push(j);
  if (varIdx.length === 0) return null;                      // fully constant → not our lane

  // reserved-character guards
  const parts0 = sk0.split(HOLE);                            // C+1 skeleton fragments
  if (parts0.some((p) => p.includes(SHOW) || p.includes(DELIM))) return null;
  for (let j = 0; j < C; j++) if (constant[j] && hasReserved(vals[0][j])) return null;
  if (vals.some((row) => varIdx.some((j) => hasReserved(row[j])))) return null;

  // bake constants into the template; leave HOLE at varying fields
  let baked = '';
  for (let j = 0; j < C; j++) baked += parts0[j] + (constant[j] ? vals[0][j] : HOLE);
  baked += parts0[C];
  const template = baked.split(HOLE).join(SHOW);
  if (template.includes('\n')) return null;

  const body = vals.map((row) => varIdx.map((j) => row[j]).join(DELIM)).join('\n');
  const header = `${PINAX_MARK}${kind} n=${recs.length}${nlFlag ? ' nl' : ''}`;
  const wire = `${header}\n${template}\n${body}`;
  return { wire, template, kind, rows: recs.length, cols: C, varCols: varIdx.length };
}

function buildJSONL(text: string): Built | null {
  const lines = text.split('\n');
  let nl = false;
  if (lines.length > 1 && lines[lines.length - 1] === '') { nl = true; lines.pop(); }
  if (lines.length < 2) return null;
  // offsets into `text` for each line
  const recs: { start: number; end: number; spans: [number, number][] }[] = [];
  let off = 0;
  for (const ln of lines) {
    const sc = scanFlatObject(text, off);
    if (!sc || sc.end !== off + ln.length) return null;      // whole line must be one flat object
    recs.push({ start: off, end: off + ln.length, spans: sc.spans });
    off += ln.length + 1;                                     // + '\n'
  }
  return assemble('JSONL', text, recs, nl);
}

function buildJSONA(text: string): Built | null {
  // compact array only: exactly "[" obj ("," obj)* "]" with no surrounding whitespace
  if (text[0] !== '[' || text[text.length - 1] !== ']') return null;
  const n = text.length;
  let i = 1;
  const recs: { start: number; end: number; spans: [number, number][] }[] = [];
  if (text[i] === ']') return null;
  while (i < n) {
    const sc = scanFlatObject(text, i);
    if (!sc) return null;
    recs.push({ start: i, end: sc.end, spans: sc.spans });
    i = sc.end;
    if (text[i] === ',') { i++; continue; }
    if (text[i] === ']') { i++; break; }
    return null;
  }
  if (i !== n) return null;
  if (recs.length < 2) return null;
  // enforce exact separators: between records must be a single ','
  for (let k = 1; k < recs.length; k++) if (text.slice(recs[k - 1].end, recs[k].start) !== ',') return null;
  return assemble('JSONA', text, recs, false);
}

// ── public result shape (mirrors KrasisResult family) ────────────────────────
export interface PinaxResult {
  codec: 'pinax';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;        // wire body only
  messageTokens: number;    // inline contract + wire — honest single-chat cost
  contractTokens: number;
  savingsPct: number;
  applied: boolean;
  kind: 'JSONL' | 'JSONA' | 'none';
  rows: number;
  cols: number;
  varCols: number;          // audit: columns that actually vary (rest are hoisted)
  decoderPrompt: string;
  notes: string;
  ms: number;
}

function contractFor(_kind: 'JSONL' | 'JSONA'): string {
  // ultra-terse, kind-agnostic; the ▦-header itself names the container + row count.
  return (
    `▦ = record table. Next line is a JSON template; ◇ = a per-record varying field. ` +
    `Each later line = one record's ◇ values, tab-separated, in order. Fill ◇ to rebuild each record.`
  );
}

export function pinaxEncode(text: string, enc: EncodingName = 'o200k_base'): PinaxResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const identity: PinaxResult = {
    codec: 'pinax', wire: text, decoded: text, exact: true, inTokens,
    outTokens: inTokens, messageTokens: inTokens, contractTokens: 0, savingsPct: 0,
    applied: false, kind: 'none', rows: 0, cols: 0, varCols: 0, decoderPrompt: '',
    notes: 'not record data (or no net win) — identity', ms: Date.now() - t0,
  };
  if (!text || text.length < 12 || text.indexOf('{') === -1) return identity;
  // never touch input that already contains our wire prefix
  if (text.includes(PINAX_MARK)) return identity;

  let built: Built | null = null;
  try {
    built = text[0] === '[' ? buildJSONA(text) : buildJSONL(text);
    if (!built && text[0] !== '[') built = buildJSONA(text); // tolerate leading-array-only inputs
  } catch { built = null; }
  if (!built) return identity;

  // self-verify: decode must reproduce the input byte-for-byte
  const decoded = pinaxDecode(built.wire);
  if (decoded !== text) return identity;

  const contract = contractFor(built.kind);
  const contractTokens = countTokens(contract, enc);
  const outTokens = countTokens(built.wire, enc);
  const messageTokens = contractTokens + outTokens;
  if (messageTokens >= inTokens) return identity;            // strict honest token gate

  return {
    codec: 'pinax', wire: built.wire, decoded, exact: true, inTokens, outTokens,
    messageTokens, contractTokens, savingsPct: ((inTokens - messageTokens) / inTokens) * 100,
    applied: true, kind: built.kind, rows: built.rows, cols: built.cols, varCols: built.varCols,
    decoderPrompt: contract,
    notes: `${built.kind}: ${built.rows} records × ${built.cols} cols, ${built.cols - built.varCols} hoisted; ` +
      `one-chat=${messageTokens} tok vs identity ${inTokens}`,
    ms: Date.now() - t0,
  };
}

// ── decoder (self-contained; no encode-time state — mirrors bench/pinax_decode.py)
export function pinaxDecode(wire: string): string {
  if (!wire || wire[0] !== PINAX_MARK) return wire;
  const nl = wire.indexOf('\n');
  if (nl === -1) return wire;
  const header = wire.slice(0, nl);
  const m = /^\u25A6(JSONL|JSONA) n=(\d+)( nl)?$/.exec(header);
  if (!m) return wire;
  const kind = m[1] as 'JSONL' | 'JSONA';
  const count = parseInt(m[2], 10);
  const trailingNL = !!m[3];
  const rest = wire.slice(nl + 1);
  const nl2 = rest.indexOf('\n');
  const template = nl2 === -1 ? rest : rest.slice(0, nl2);
  const bodyStr = nl2 === -1 ? '' : rest.slice(nl2 + 1);
  const rows = bodyStr.length ? bodyStr.split('\n') : [];
  if (rows.length !== count) return wire;                    // guardrail: row count must match n
  const parts = template.split(SHOW);                        // holes+1 fragments
  const objs = rows.map((rowStr) => {
    const vv = rowStr.split(DELIM);
    let s = '';
    for (let k = 0; k < parts.length; k++) { s += parts[k]; if (k < vv.length) s += vv[k]; }
    return s;
  });
  if (kind === 'JSONL') return objs.join('\n') + (trailingNL ? '\n' : '');
  return '[' + objs.join(',') + ']';
}

export function pinaxDecoderPrompt(wire: string): string {
  if (!wire || wire[0] !== PINAX_MARK) return '';
  const kind = wire.slice(1, 6) === 'JSONA' ? 'JSONA' : 'JSONL';
  return contractFor(kind as 'JSONL' | 'JSONA');
}
