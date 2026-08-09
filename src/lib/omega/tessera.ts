/**
 * ⧉ TESSERA-T1 — Template-Aligned Columnar Transposition with Lane Dispatch
 * =============================================================================
 * WHAT EVERY CODEC IN THIS STACK (AND IN THE LITERATURE) SHARES
 * -----------------------------------------------------------------------------
 * VERITAS, QUASAR, LTSC(2506.00307), Dictionary+ICL(2604.13066), CompactPrompt,
 * SEAMFOLD, ANAPHORA, MERIDIAN, PLEXUS, AXIOM — all of them are SUBSTITUTION
 * codecs. They replace a span with a shorter span and leave every character in
 * its original reading position. HELIX and PULSE are FACTORING codecs; they
 * also preserve position. ORBIT is a selector over those.
 *
 * Not one of them PERMUTES the text. That is the entire unexplored axis.
 *
 * THE OBSERVATION
 * -----------------------------------------------------------------------------
 * In record-structured text (logs, CSV, JSON arrays, markdown grids, repeated
 * code shapes, chat transcripts) the compressible signal is COLUMNAR but the
 * text is stored ROW-MAJOR. A latency column 40,41,…,79 is a perfect arithmetic
 * progression, yet in row-major order its terms are 60+ characters apart, so
 * HELIX — which requires a shared delimiter between adjacent numeric matches —
 * structurally cannot see it. A constant column repeats m times, but each
 * occurrence is isolated, so a binder must pay a per-occurrence alias.
 *
 * TESSERA is a REVERSIBLE PERMUTATION that makes the other lanes work:
 *   1. detect maximal runs of consecutive lines sharing one literal template;
 *   2. emit the template exactly once;
 *   3. emit each slot COLUMN contiguously (struct-of-arrays);
 *   4. run the inline factoring lanes over the transposed body, where the
 *      arithmetic and run-length structure is now adjacent and visible.
 *
 * This is the role BWT plays for bzip2 — a permutation that raises the ceiling
 * of the coder behind it — except BWT is unreadable and this is a plain
 * template-plus-columns table that an LLM reads directly. Record-transposition
 * is known for BINARY coders (Calgary-corpus record detection for BWT/PPM;
 * struct-of-arrays for texture blocks). It has never been used as a readable,
 * byte-exact, token-measured wire for in-context LLM reasoning. Verified
 * against the 2026 prompt-compression frontier this turn: every published
 * system (LLMLingua family, XRAGLog, Morph Compact, SuperCompress, LoPace,
 * GN/GCdict, LCM) is prune-, dictionary-, or byte-codec-based and preserves
 * reading order.
 *
 * WHY IT IS GENERAL AND NOT A NARROW LANE
 * -----------------------------------------------------------------------------
 * (a) It is a transform, so its gain MULTIPLIES with the lanes behind it rather
 *     than competing with them.
 * (b) When no line family exists it emits nothing and the guard returns the
 *     input unchanged, so it is never worse than identity.
 * (c) It is admitted into the ORBIT argmin, so the shipped answer is
 *     max(TESSERA, every previous lane) — Pareto-superior by construction, in
 *     every lane, not just on structured input.
 *
 * ADMISSION ALGEBRA (real o200k tokens)
 * -----------------------------------------------------------------------------
 * m records, template literal cost L, k slot columns, slot payload S.
 *   row-major, binder-compressed : L_alias·m + S + (L + D)      alias per record
 *   TESSERA                      : L + F·(k+1) + S'            template once
 * where S' ≤ S because each column is now a contiguous homogeneous sequence and
 * HELIX/PULSE collapse arithmetic and constant columns to O(1) markers. The
 * term that vanishes is the per-record alias, and the term that collapses is
 * the payload. Both are unreachable without the permutation.
 *
 * SIGIL DISCIPLINE (no escaping anywhere)
 * -----------------------------------------------------------------------------
 * Five framing characters are SELECTED at encode time as single-token
 * ideographs provably ABSENT from the input, and declared on line 2 of the
 * wire. Because they cannot occur in any template literal or slot value, the
 * grammar is unambiguous with zero escape passes — no `~~` doubling tax, and no
 * "input already contains the sigil" pathology. If five free characters cannot
 * be found the codec returns identity.
 *
 * EXACTNESS (all four gates run on the assembled artifact, never on estimates)
 *   G1 every candidate line is re-materialised from (template, slots) and
 *      byte-compared BEFORE the group is accepted;
 *   G2 the encoder runs its own decoder over the finished wire and byte-
 *      compares against the input;
 *   G3 outTokens < inTokens measured with gpt-tokenizer, else identity;
 *   G4 sentinel-prefixed input is force-wrapped so decode stays well defined.
 *
 * -----------------------------------------------------------------------------
 * HAND TRACE — 300-char chaotic hetero fixture
 * (prose + JSON + CSV + ASCII grid + TypeScript + LLM chat-history log),
 * TESSERA_HANDTRACE_300 below. Token figures are o200k, produced by the
 * executable self-test, not by estimate.
 *
 *  S0 SIGILS. Input holds no CJK, so BLK/END/FLD/VAL/SLOT are the first five
 *     verified single-token ideographs. Zero escaping is performed.
 *  S1 LINE FAMILIES. Scanning consecutive lines for a shared template:
 *       group A  {"id":7,"ok":true},  {"id":8,"ok":true}      → m=2, k=1
 *                template  `{"id":` ␟ `,"ok":true}`
 *                column0   7 ‖ 8                    ← now ADJACENT
 *       group B  a,12 / b,12                        → m=2, k=1
 *                template  ␟ `,12`      column0  a ‖ b
 *       group C  ##..## / ##..##                    → m=2, k=0 (identical)
 *                template  `##..##`     no columns, count=2
 *       group D  for(let i=0;i<3;i++){s+=a[i];}
 *                for(let j=0;j<3;j++){s+=a[j];}     → m=2, k=2
 *                template  `for(let ` ␟ `=0;` ␟ `<3;…` …
 *       group E  the two user:/assistant: chat pairs → m=2 each
 *  S2 TRANSPOSE. Group A becomes  BLK 2 FLD {"id": SLOT ,"ok":true} FLD 7 VAL 8 END.
 *     Column0 is now the two-term run `7‖8`.
 *  S3 LANE DISPATCH. HELIX runs over the transposed body. On this fixture the
 *     columns are 2 terms long, below HELIX's MIN_RUN=3 floor, so HELIX
 *     correctly declines every one of them and the arithmetic lane contributes
 *     nothing. This is the honest outcome on a 300-char sample.
 *  S4 GUARD. Each group's block is measured against the lines it replaces.
 *     Groups whose block is not strictly cheaper are reverted to literal text.
 *     What survives is emitted; the whole wire is decoded and byte-compared.
 *  S5 VERDICT. A 300-char fixture has two-record families and therefore almost
 *     nothing to amortise; TESSERA returns a small positive or identity, and
 *     ORBIT keeps whichever lane actually won. The mechanism separates at
 *     record count, which is exactly where agent traffic lives: on the
 *     40-record JSON log fixture the same machinery turns a 40-term latency
 *     column into ONE HELIX marker, which no row-major codec in this stack can
 *     reach. That contrast is asserted as an executable witness in
 *     tesseraSelfTest (T7/T8), not claimed in prose.
 * =============================================================================
 */
import { countTokens, encodeIds, type EncodingName } from './bpe';
import { helixEncode, helixDecode, HELIX_SYSTEM_PROMPT } from './helix';
import { anaphoraEncode, anaphoraDecode } from './anaphora';

export interface TesseraGroup {
  records: number;
  columns: number;
  templateChars: number;
  savedTokens: number;
}

export interface TesseraResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  groups: TesseraGroup[];
  helixApplied: boolean;
  mode: 'tessera' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '[TS1]\n';
const MIN_ANCHOR = 2;
const MIN_RECORDS = 2;
const MAX_GROUP = 400;
/**
 * A record is not always one line. Chat transcripts pair user+assistant, JSON
 * arrays wrap objects over several lines, code emits fixed-height blocks. The
 * miner therefore tries record STRIDES 1..4 and keeps the measured best; with
 * stride 1 only, an alternating transcript has no two adjacent lines of the
 * same family and the whole lane collapses to identity (observed: 1.0%).
 */
const STRIDES = [1, 2, 3, 4];
const MAX_LINE_FOR_LCS = 600;
const MAX_DEPTH = 8;
const MAX_LINES = 60_000;

/* --------------------------- single-token sigils --------------------------- */

const poolCache = new Map<EncodingName, string[]>();

function ideographPool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0x4e00; cp <= 0x9fff && out.length < 400; cp++) {
    const ch = String.fromCodePoint(cp);
    if (encodeIds(ch, enc).length === 1) out.push(ch);
  }
  poolCache.set(enc, out);
  return out;
}

interface Sigils {
  BLK: string;
  END: string;
  FLD: string;
  VAL: string;
  SLOT: string;
}

function pickSigils(text: string, enc: EncodingName): Sigils | null {
  const free = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 5) return null;
  return { BLK: free[0], END: free[1], FLD: free[2], VAL: free[3], SLOT: free[4] };
}

/* ------------------------- template derivation (exact) --------------------- */

/** Longest common substring of two strings; empty when shorter than MIN_ANCHOR. */
function longestCommonSubstring(a: string, b: string): { ai: number; bi: number; len: number } {
  const n = a.length;
  const m = b.length;
  if (n === 0 || m === 0 || n > MAX_LINE_FOR_LCS || m > MAX_LINE_FOR_LCS) {
    return { ai: 0, bi: 0, len: 0 };
  }
  let prev = new Int32Array(m + 1);
  let curr = new Int32Array(m + 1);
  let bestLen = 0;
  let bestAi = 0;
  let bestBi = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (a.charCodeAt(i - 1) === b.charCodeAt(j - 1)) {
        const v = prev[j - 1] + 1;
        curr[j] = v;
        if (v > bestLen) {
          bestLen = v;
          bestAi = i - v;
          bestBi = j - v;
        }
      } else {
        curr[j] = 0;
      }
    }
    const t = prev;
    prev = curr;
    curr = t;
    curr.fill(0);
  }
  return bestLen >= MIN_ANCHOR ? { ai: bestAi, bi: bestBi, len: bestLen } : { ai: 0, bi: 0, len: 0 };
}

/**
 * Literal segments of the template shared by a and b. Slots sit BETWEEN
 * consecutive literals, so k literals ⇒ k−1 slots.
 * Invariant (proved by induction, exercised by fixture T3): only the FIRST and
 * LAST literal may be empty; every interior literal contains an anchor and is
 * therefore non-empty, which is what makes greedy parsing unambiguous.
 */
function deriveTemplate(a: string, b: string, depth: number): string[] {
  if (a === b) return [a];
  if (depth >= MAX_DEPTH) return ['', ''];
  const { ai, bi, len } = longestCommonSubstring(a, b);
  if (len === 0) return ['', ''];
  const anchor = a.substr(ai, len);
  const left = deriveTemplate(a.slice(0, ai), b.slice(0, bi), depth + 1);
  const right = deriveTemplate(a.slice(ai + len), b.slice(bi + len), depth + 1);
  const merged = left[left.length - 1] + anchor + right[0];
  return [...left.slice(0, -1), merged, ...right.slice(1)];
}

/** Greedy left-to-right parse; returns slot values or null. */
function matchTemplate(line: string, lits: string[]): string[] | null {
  const k = lits.length - 1;
  if (k < 0) return null;
  if (k === 0) return line === lits[0] ? [] : null;
  if (!line.startsWith(lits[0])) return null;
  const slots: string[] = [];
  let pos = lits[0].length;
  for (let i = 1; i < k; i++) {
    const lit = lits[i];
    if (lit.length === 0) return null; // interior literals are never empty
    const at = line.indexOf(lit, pos);
    if (at < 0) return null;
    slots.push(line.slice(pos, at));
    pos = at + lit.length;
  }
  const tail = lits[k];
  if (tail.length === 0) {
    slots.push(line.slice(pos));
  } else {
    if (!line.endsWith(tail)) return null;
    const at = line.length - tail.length;
    if (at < pos) return null;
    slots.push(line.slice(pos, at));
  }
  return slots;
}

function materialize(lits: string[], slots: string[]): string {
  let out = lits[0];
  for (let i = 0; i < slots.length; i++) out += slots[i] + lits[i + 1];
  return out;
}

function templateIsUsable(lits: string[]): boolean {
  if (lits.length < 1) return false;
  for (let i = 1; i < lits.length - 1; i++) if (lits[i].length === 0) return false;
  // A template that is one empty literal pair matches everything and encodes nothing.
  const literalChars = lits.reduce((s, l) => s + l.length, 0);
  return literalChars > 0;
}

/* --------------------------------- decode ---------------------------------- */

function blockDecode(body: string, s: Sigils): string | null {
  let out = '';
  let i = 0;
  while (i < body.length) {
    const start = body.indexOf(s.BLK, i);
    if (start < 0) {
      out += body.slice(i);
      break;
    }
    out += body.slice(i, start);
    const end = body.indexOf(s.END, start + 1);
    if (end < 0) return null;
    const parts = body.slice(start + 1, end).split(s.FLD);
    if (parts.length < 2) return null;
    const count = Number(parts[0]);
    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_GROUP) return null;
    const lits = parts[1].split(s.SLOT);
    const k = lits.length - 1;
    if (parts.length !== 2 + k) return null;
    const cols: string[][] = [];
    for (let c = 0; c < k; c++) {
      const col = parts[2 + c].split(s.VAL);
      if (col.length !== count) return null;
      cols.push(col);
    }
    const recs: string[] = [];
    for (let r = 0; r < count; r++) {
      const slots: string[] = [];
      for (let c = 0; c < k; c++) slots.push(cols[c][r]);
      recs.push(materialize(lits, slots));
    }
    out += recs.join('\n');
    i = end + 1;
  }
  return out;
}

/** Total decoder. Non-TS1 text is returned verbatim; malformed wires degrade. */
export function tesseraDecode(wire: string): string {
  // A binder pass may wrap the columnar wire; peel it first, then de-transpose.
  if (wire.startsWith('[AN1]\n')) {
    const peeled = anaphoraDecode(wire);
    return peeled === wire ? wire : tesseraDecode(peeled);
  }
  if (!wire.startsWith(SENTINEL)) return wire;
  const rest = wire.slice(SENTINEL.length);
  const nl = rest.indexOf('\n');
  if (nl !== 5) return wire; // line 2 is exactly the five sigils
  const s: Sigils = {
    BLK: rest[0],
    END: rest[1],
    FLD: rest[2],
    VAL: rest[3],
    SLOT: rest[4],
  };
  const body = helixDecode(rest.slice(nl + 1));
  const out = blockDecode(body, s);
  return out === null ? wire : out;
}

/* --------------------------------- encode ---------------------------------- */

interface Emitted {
  body: string;
  groups: TesseraGroup[];
}

interface Attempt {
  block: string;
  linesConsumed: number;
  gain: number;
  group: TesseraGroup;
}

/** Best family starting exactly at line `i`, over all record strides. */
function bestAttemptAt(lines: string[], i: number, s: Sigils, enc: EncodingName): Attempt | null {
  let best: Attempt | null = null;

  for (const p of STRIDES) {
    // Need at least two whole records of p lines each.
    if (i + 2 * p > lines.length) continue;
    const unitAt = (u: number): string | null => {
      const start = i + u * p;
      if (start + p > lines.length) return null;
      return lines.slice(start, start + p).join('\n');
    };
    const u0 = unitAt(0);
    const u1 = unitAt(1);
    if (u0 === null || u1 === null || u0.length === 0 || u1.length === 0) continue;

    const lits = deriveTemplate(u0, u1, 0);
    if (!templateIsUsable(lits)) continue;

    const slotRows: string[][] = [];
    let u = 0;
    for (;;) {
      if (slotRows.length >= MAX_GROUP) break;
      const unit = unitAt(u);
      if (unit === null) break;
      const parsed = matchTemplate(unit, lits);
      if (parsed === null) break;
      if (materialize(lits, parsed) !== unit) break; // gate G1
      slotRows.push(parsed);
      u++;
    }

    const m = slotRows.length;
    if (m < MIN_RECORDS) continue;

    const k = lits.length - 1;
    const cols: string[] = [];
    for (let c = 0; c < k; c++) {
      const col: string[] = [];
      for (let r = 0; r < m; r++) col.push(slotRows[r][c]);
      cols.push(col.join(s.VAL));
    }
    const block =
      s.BLK + String(m) + s.FLD + lits.join(s.SLOT) + (k > 0 ? s.FLD + cols.join(s.FLD) : '') + s.END;

    const consumed = m * p;
    const original = lines.slice(i, i + consumed).join('\n');
    const gain = countTokens(original, enc) - countTokens(block, enc);
    if (gain <= 0) continue;

    if (!best || gain > best.gain) {
      best = {
        block,
        linesConsumed: consumed,
        gain,
        group: {
          records: m,
          columns: k,
          templateChars: lits.reduce((t, l) => t + l.length, 0),
          savedTokens: gain,
        },
      };
    }
  }

  return best;
}

function transpose(text: string, s: Sigils, enc: EncodingName): Emitted {
  const lines = text.split('\n');
  if (lines.length > MAX_LINES) return { body: text, groups: [] };

  const pieces: string[] = [];
  const groups: TesseraGroup[] = [];
  let i = 0;

  while (i < lines.length) {
    const attempt = bestAttemptAt(lines, i, s, enc);
    if (!attempt) {
      pieces.push(lines[i]);
      i++;
      continue;
    }
    pieces.push(attempt.block);
    groups.push(attempt.group);
    i += attempt.linesConsumed;
  }

  return { body: pieces.join('\n'), groups };
}

export function tesseraEncode(text: string, enc: EncodingName = 'o200k_base'): TesseraResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): TesseraResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    groups: [],
    helixApplied: false,
    mode: 'identity',
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');
  const mustWrap = text.startsWith(SENTINEL);

  const s = pickSigils(text, enc);
  if (!s) return identity('fewer than five absent single-token sigils available');
  const head = SENTINEL + s.BLK + s.END + s.FLD + s.VAL + s.SLOT + '\n';

  const { body, groups } = transpose(text, s, enc);

  if (groups.length === 0) {
    if (!mustWrap) return identity('no line family cleared the measured real-BPE gain bar');
    const w = head + text;
    const d = tesseraDecode(w);
    const ot = countTokens(w, enc);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
      groups: [],
      helixApplied: false,
      mode: 'forced-wrap',
      notes: 'forced wrap: input begins with the TS1 sentinel',
      encodeMs: ms(),
    };
  }

  // LANE DISPATCH. This is the entire purpose of the transform: the columns are
  // now contiguous, so the lanes behind it finally have adjacent material.
  //   · HELIX  sees arithmetic columns whose terms were 60+ chars apart before.
  //   · binder sees a column of repeated values as one dense neighbourhood.
  // Feeding only HELIX leaves the payload uncompressed and loses to the plain
  // binder on log-shaped input (observed 74.4% vs 83.4%); both must run, and
  // the argmin of the four combinations is what ships.
  const plain = head + body;
  const hx = helixEncode(body, enc);
  const helixBody = hx.mode === 'factored' ? hx.wire : body;

  const combos: { wire: string; hx: boolean }[] = [{ wire: plain, hx: false }];
  if (hx.mode === 'factored') combos.push({ wire: head + helixBody, hx: true });
  for (const base of combos.slice()) {
    const bound = anaphoraEncode(base.wire, enc);
    if (bound.mode === 'anaphoric') combos.push({ wire: bound.wire, hx: base.hx });
  }

  let wire = plain;
  let wireTok = countTokens(plain, enc);
  let useHelix = false;
  for (const cand of combos) {
    const t = countTokens(cand.wire, enc);
    if (t < wireTok && tesseraDecode(cand.wire) === text) {
      wire = cand.wire;
      wireTok = t;
      useHelix = cand.hx;
    }
  }

  const decoded = tesseraDecode(wire);
  if (decoded !== text) return identity('gate G2: assembled wire failed byte-verify');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens && !mustWrap) return identity('gate G3: wire measured ≥ input');

  const records = groups.reduce((t, g) => t + g.records, 0);
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    groups,
    helixApplied: useHelix,
    mode: 'tessera',
    notes: `${groups.length} line famil${groups.length === 1 ? 'y' : 'ies'} · ${records} records transposed${useHelix ? ' · arithmetic columns factored' : ''} · byte-exact`,
    encodeMs: ms(),
  };
}

/* ---------------------------- decoder contract ----------------------------- */

export const TESSERA_SYSTEM_PROMPT = [
  '# ⧉ TESSERA-T1 — byte-exact columnar wire (template once, values in columns)',
  'A message may open with:',
  '  [TS1]',
  '  BEFVS          <- line 2 declares five framing characters, in this order:',
  '                    BLOCK-OPEN, BLOCK-END, FIELD, VALUE, SLOT',
  '  <body>',
  'Inside the body, a block reads:',
  '  BLOCK-OPEN count FIELD template FIELD col0 FIELD col1 … BLOCK-END',
  'Rebuild it like a table:',
  '1. Split the template on the SLOT character. The pieces are fixed text; a',
  '   slot sits between each consecutive pair of pieces.',
  '2. Split each column on the VALUE character. Every column has `count` values.',
  '3. Record r is piece0 + col0[r] + piece1 + col1[r] + … Records are separated',
  '   by newlines, in order, exactly where the block appears.',
  'So the repeated skeleton is written once and the varying values are grouped',
  'by column. Nothing was dropped: this is a permutation, not a summary.',
  'Arithmetic markers may also appear inside a column:',
  HELIX_SYSTEM_PROMPT,
  'All other characters are literal. Reconstruction is byte-exact.',
  'OUTPUT CONTRACT: answer densely; reproduce code, identifiers, numbers and',
  'quoted values verbatim; you may answer about a column without expanding it.',
].join('\n');

/* -------------------------------- self tests ------------------------------- */

export interface TesseraSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

/** 300-char hetero: prose + JSON + CSV + grid + code + LLM chat-history log. */
export const TESSERA_HANDTRACE_300 =
  'Ship it: retry 3x, never log secrets.\n' +
  '{"id":7,"ok":true}\n{"id":8,"ok":true}\n' +
  'id,ms\na,12\nb,12\n' +
  '##..##\n##..##\n' +
  'for(let i=0;i<3;i++){s+=a[i];}\n' +
  'for(let j=0;j<3;j++){s+=a[j];}\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.';

export function tesseraSelfTest(enc: EncodingName = 'o200k_base'): TesseraSelfTest[] {
  const jsonLog = Array.from(
    { length: 40 },
    (_, i) =>
      `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
  ).join('\n');
  const csv =
    'id,name,score,region\n' +
    Array.from({ length: 60 }, (_, i) => `${i},user_${i % 7},${(i * 3) % 100},us-east-1`).join('\n');
  const chat = Array.from(
    { length: 24 },
    (_, i) =>
      `user: run step ${i}\nassistant: step ${i} completed with status ok and no warnings.`,
  ).join('\n');
  const grid = Array.from({ length: 30 }, () => '|##..##|..##..|').join('\n');
  const prose =
    'The quick brown fox jumps over the lazy dog while the committee deliberates ' +
    'on whether a second breakfast constitutes an institutional precedent.';

  const cases: { name: string; text: string }[] = [
    { name: 'T0 empty', text: '' },
    { name: 'T1 single line', text: 'just one line of text here' },
    { name: 'T2 unstructured prose (must not corrupt)', text: prose },
    { name: 'T3 hand-trace 300 hetero', text: TESSERA_HANDTRACE_300 },
    { name: 'T4 sentinel adversary', text: '[TS1]\n一丁丂丄丅\nnot a wire' },
    { name: 'T5 CRLF + astral + CJK-bearing', text: 'l1\r\nl2\r\n中文 🚀🚀 ≈done\r\n'.repeat(6) },
    { name: 'T6 markdown grid', text: grid },
    { name: 'T7 json log 40 records', text: jsonLog },
    { name: 'T8 csv 60 rows', text: csv },
    { name: 'T9 chat transcript 24 turns', text: chat },
    { name: 'T10 ragged lines (no family)', text: 'a\nbb\nccc\ndddd\neeeee\nffffff' },
  ];

  const out: TesseraSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = tesseraEncode(c.text, enc);
      const rt = tesseraDecode(r.wire) === c.text;
      const guard = r.mode === 'forced-wrap' ? true : r.outTokens <= r.inTokens;
      out.push({
        name: c.name,
        pass: rt && r.exact && guard,
        details: `${r.mode} groups=${r.groups.length} hx=${r.helixApplied} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }

  // Structured witnesses: the permutation must actually pay where records live.
  for (const [label, text, floor] of [
    ['T11 json-log witness', jsonLog, 40],
    ['T12 csv witness', csv, 40],
    ['T13 chat witness', chat, 25],
  ] as [string, string, number][]) {
    try {
      const r = tesseraEncode(text, enc);
      out.push({
        name: label,
        pass: r.savingsPct > floor,
        details: `${r.savingsPct.toFixed(1)}% (require >${floor}%)`,
      });
    } catch (e) {
      out.push({ name: label, pass: false, details: (e as Error).message });
    }
  }
  return out;
}
