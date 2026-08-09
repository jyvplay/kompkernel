/**
 * ⌗ SIGNET-G1 — Character-Class Signature Alignment with Typed Column Coders
 * =============================================================================
 * THE DEFECT THIS FIXES (diagnosed from measured output, not from theory)
 * -----------------------------------------------------------------------------
 * Every record-structured codec in this stack derives its template with a
 * LONGEST-COMMON-SUBSTRING pass over two sample records (TESSERA, and STRATA
 * which inherits it). LCS is the wrong primitive for this job, and the harness
 * shows exactly why. On the 40-record JSON log:
 *
 *     {"ts":"2026-07-10T12:00:00Z",…,"latency_ms":40}
 *     {"ts":"2026-07-11T12:01:00Z",…,"latency_ms":41}
 *
 * LCS returns the literal …"latency_ms":4 with the slot holding a SINGLE digit,
 * because the leading 4 of 40 and 41 is genuinely common text. That template
 * matches records 0–9 and then dies at latency 50, so a clean 40-record family
 * shatters into FOUR groups of ten (observed: g=4). The latency column, a
 * perfect arithmetic progression 40…79 that should collapse to one O(1) rule,
 * is never even presented to the column coder. The same failure splits the
 * timestamp day field and the minute field. LCS does not know that a digit run
 * is an atom; it will happily cut one in half.
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 * SIGNET never computes a common substring. It segments each record into
 * maximal runs of a single character class — DIGIT, ALPHA, OTHER — and uses
 * the sequence of class labels as a SIGNATURE. Two records belong to the same
 * family iff their signatures are identical. Within a family, run position r is
 * template text iff every record agrees there, and a slot otherwise.
 *
 * Four consequences, all of them structural rather than heuristic:
 *   1. A digit run is an atom by construction, so the LCS half-cut is not a bug
 *      that was patched — it is unrepresentable. Slots are always whole fields.
 *   2. The template is derived from ALL m records, not from a 2-record sample,
 *      so one late outlier cannot leave a stale literal in place.
 *   3. Family detection is O(total characters). LCS is O(len²) per pair, which
 *      is the dominant cost in STRATA and forced a 600-char line cap.
 *   4. Parsing needs no indexOf search and no non-empty-interior-literal
 *      invariant: slot r is simply run r. Reconstruction is positional, so
 *      adjacent slots and empty edge pieces are all well defined.
 *
 * HONEST PRIOR ART (verified this turn, both cited rather than reinvented)
 *   · Drain / Drain3 (He et al., ICWS 2017; IBM Research) routes any token
 *     CONTAINING a digit to a wildcard node. That is the same intuition about
 *     digits, but Drain is LOSSY — it emits `<*>` and discards the value — it
 *     splits on whitespace into word tokens rather than on character class, it
 *     needs a similarity threshold and a fixed-depth tree, and its objective is
 *     clustering for anomaly detection. SIGNET keeps every byte, has no
 *     threshold and no tree, segments below the word level, and its objective
 *     is measured BPE tokens.
 *   · Delta encoding (VCDIFF, rsync, Parquet/ClickHouse DELTA) is ancient. What
 *     is new here is not the delta — it is a delta emitted as READABLE
 *     self-describing text whose difference column is itself recursively coded
 *     and selected by real-tokenizer argmin under byte-exact gates.
 * The joint construction — class-signature families feeding typed closed-form
 * column coders, scored in BPE tokens, in a wire an LLM reads directly — is
 * what the frontier review found no instance of.
 *
 * WIRE FORMAT — identical block grammar to STRATA, distinct sentinel, so the
 * two lanes share one already-verified column-coder implementation:
 *   [SG1]
 *   BEFVL                     <- BLOCK, END, FIELD, VALUE, SLOT
 *   …BLK m FLD tmpl FLD spec0 FLD spec1 … END…
 * Column specs are the shared grammar: =const · #ap · @cycle · %delta ·
 * ^prefix · $suffix · untagged literal.
 *
 * EXACTNESS GATES
 *   G1 every record is re-materialised from (template, slots) and byte-compared
 *      before its family is accepted;
 *   G2 every column spec is decoded and array-compared (inherited, in strata);
 *   G3 the encoder runs its own decoder over the finished wire and byte-compares;
 *   G4 outTokens < inTokens on the real tokenizer, else identity;
 *   G5 sentinel-prefixed input is force-wrapped so decode stays total.
 *
 * -----------------------------------------------------------------------------
 * HAND TRACE — 300-char chaotic hetero fixture
 * (prose + JSON + CSV + ASCII grid + TypeScript + LLM chat-history log)
 * SIGNET_HANDTRACE_300 below. Figures are o200k from the executable self-test.
 *
 *  S0 SIGILS. No CJK in the fixture, so the first five verified single-token
 *     ideographs are taken. Nothing is escaped, ever, because those characters
 *     provably do not occur in the input.
 *  S1 SEGMENTATION. `{"id":7,"ok":true}` becomes runs
 *       OTHER `{"` · ALPHA `id` · OTHER `":` · DIGIT `7` · OTHER `,"` ·
 *       ALPHA `ok` · OTHER `":` · ALPHA `true` · OTHER `}`
 *     signature O A O D O A O A O.
 *  S2 FAMILIES. Record 2 has the identical signature, so the pair forms a
 *     family; run 3 is the only disagreement, giving one slot with values
 *     ["7","8"]. Note what did NOT happen: the digit was never merged into the
 *     neighbouring literal, which is precisely the LCS failure.
 *     `a,12` / `b,12` → A O D, one slot ["a","b"], `12` stays literal.
 *     `##..##` twice → all OTHER, one run, zero slots, m=2.
 *     The two `for(let …)` lines and the user/assistant pair (stride 2) form
 *     the remaining families.
 *  S3 COLUMN TYPING. ["7","8"] offers literal (2 values) and arithmetic
 *     `#7,1,0`; at m=2 these measure the same, so the argmin is indifferent and
 *     the guard is unaffected. ["a","b"] is non-numeric: literal wins.
 *  S4 HONEST OUTCOME. Two-record families cannot amortise a closed form, so on
 *     300 chaotic characters SIGNET returns a small positive and ORBIT keeps
 *     whichever lane actually won. That is the correct answer, not a failure.
 *  S5 WHERE IT SEPARATES. The identical machinery on the 40-record log keeps
 *     ONE family instead of four, so latency 40…79 becomes a single `#40,1,0`,
 *     the day field becomes `@10…` and the minute field `@6…`. On the 60-row
 *     CSV the header is excluded automatically — its signature simply differs,
 *     with no lookahead heuristic needed — and the id column becomes `#0,1,0`
 *     with region `=us-east-1`. Those are asserted as executable witnesses
 *     G12–G16 below, including a direct head-to-head against STRATA.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { helixEncode, helixDecode, HELIX_SYSTEM_PROMPT } from './helix';
import { anaphoraEncode, anaphoraDecode } from './anaphora';
import {
  bestColumnSpec,
  decodeColumn,
  ideographPool,
  strataEncode,
  type Sigils,
} from './strata';

export interface SignetGroup {
  records: number;
  columns: number;
  kinds: string[];
  savedTokens: number;
}

export interface SignetResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  groups: SignetGroup[];
  closedForms: number;
  mode: 'signet' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '[SG1]\n';
const MIN_RECORDS = 2;
const MAX_GROUP = 8000;
const MAX_RUNS = 512;
const MAX_LINES = 60_000;
const STRIDES = [1, 2, 3, 4];

/* --------------------------- character classes ----------------------------- */

const CLS_DIGIT = 1;
const CLS_ALPHA = 2;
const CLS_OTHER = 3;

function classOf(code: number): number {
  if (code >= 48 && code <= 57) return CLS_DIGIT;
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return CLS_ALPHA;
  return CLS_OTHER;
}

/** Maximal single-class runs. Non-ASCII falls in OTHER and is never split. */
function segment(unit: string): string[] {
  const out: string[] = [];
  let i = 0;
  const n = unit.length;
  while (i < n) {
    const c = classOf(unit.charCodeAt(i));
    let j = i + 1;
    while (j < n && classOf(unit.charCodeAt(j)) === c) j++;
    out.push(unit.slice(i, j));
    i = j;
    if (out.length > MAX_RUNS) return out;
  }
  return out;
}

/** Class-label signature; equality of signatures defines a family. */
function signature(unit: string): string {
  let sig = '';
  let i = 0;
  const n = unit.length;
  while (i < n) {
    const c = classOf(unit.charCodeAt(i));
    let j = i + 1;
    while (j < n && classOf(unit.charCodeAt(j)) === c) j++;
    sig += c;
    i = j;
    if (sig.length > MAX_RUNS) return sig;
  }
  return sig;
}

function pickSigils(text: string, enc: EncodingName): Sigils | null {
  const free = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 5) return null;
  return { BLK: free[0], END: free[1], FLD: free[2], VAL: free[3], SLOT: free[4], SEP: free[3] };
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
    const pieces = parts[1].split(s.SLOT);
    const k = pieces.length - 1;
    if (parts.length !== 2 + k) return null;
    const cols: string[][] = [];
    for (let c = 0; c < k; c++) {
      const col = decodeColumn(parts[2 + c], count, s, 0);
      if (col === null) return null;
      cols.push(col);
    }
    const recs: string[] = [];
    for (let r = 0; r < count; r++) {
      let rec = pieces[0];
      for (let c = 0; c < k; c++) rec += cols[c][r] + pieces[c + 1];
      recs.push(rec);
    }
    out += recs.join('\n');
    i = end + 1;
  }
  return out;
}

/** Total decoder. A binder wrapper is peeled first; non-SG1 text is literal. */
export function signetDecode(wire: string): string {
  if (wire.startsWith('[AN1]\n')) {
    const peeled = anaphoraDecode(wire);
    return peeled === wire ? wire : signetDecode(peeled);
  }
  if (!wire.startsWith(SENTINEL)) return wire;
  const rest = wire.slice(SENTINEL.length);
  const nl = rest.indexOf('\n');
  if (nl !== 5) return wire;
  const s: Sigils = {
    BLK: rest[0],
    END: rest[1],
    FLD: rest[2],
    VAL: rest[3],
    SLOT: rest[4],
    SEP: rest[3],
  };
  const body = helixDecode(rest.slice(nl + 1));
  const out = blockDecode(body, s);
  return out === null ? wire : out;
}

/* --------------------------------- encode ---------------------------------- */

interface Attempt {
  block: string;
  linesConsumed: number;
  gain: number;
  group: SignetGroup;
}

function specKind(spec: string): string {
  switch (spec[0]) {
    case '=':
      return 'constant';
    case '#':
      return 'arithmetic';
    case '@':
      return 'cyclic';
    case '%':
      return 'delta';
    case '^':
      return 'prefix';
    case '$':
      return 'suffix';
    default:
      return 'literal';
  }
}

function bestAttemptAt(lines: string[], i: number, s: Sigils, enc: EncodingName): Attempt | null {
  let best: Attempt | null = null;

  for (const p of STRIDES) {
    if (i + 2 * p > lines.length) continue;
    const unitAt = (u: number): string | null => {
      const start = i + u * p;
      if (start + p > lines.length) return null;
      return lines.slice(start, start + p).join('\n');
    };
    const u0 = unitAt(0);
    if (u0 === null || u0.length === 0) continue;

    const sig = signature(u0);
    if (sig.length < 1 || sig.length > MAX_RUNS) continue;

    // Extend the family while the class signature is identical.
    const rows: string[][] = [segment(u0)];
    let u = 1;
    for (;;) {
      if (rows.length >= MAX_GROUP) break;
      const unit = unitAt(u);
      if (unit === null || unit.length === 0) break;
      if (signature(unit) !== sig) break;
      rows.push(segment(unit));
      u++;
    }
    const m = rows.length;
    if (m < MIN_RECORDS) continue;

    const R = rows[0].length;
    // A run is template text iff every record agrees on it.
    const varying: boolean[] = new Array(R).fill(false);
    for (let r = 0; r < R; r++) {
      const v0 = rows[0][r];
      for (let q = 1; q < m; q++) {
        if (rows[q][r] !== v0) {
          varying[r] = true;
          break;
        }
      }
    }

    // Template pieces are the maximal agreeing stretches; slots are the rest.
    const pieces: string[] = [];
    const slotIdx: number[] = [];
    let cur = '';
    for (let r = 0; r < R; r++) {
      if (varying[r]) {
        pieces.push(cur);
        cur = '';
        slotIdx.push(r);
      } else {
        cur += rows[0][r];
      }
    }
    pieces.push(cur);

    const k = slotIdx.length;
    if (k === 0 && m < MIN_RECORDS) continue;

    const specs: string[] = [];
    const kinds: string[] = [];
    let bad = false;
    for (let c = 0; c < k; c++) {
      const col: string[] = [];
      for (let q = 0; q < m; q++) col.push(rows[q][slotIdx[c]]);
      const spec = bestColumnSpec(col, s, 0, enc);
      if (spec === null) {
        bad = true;
        break;
      }
      specs.push(spec);
      kinds.push(specKind(spec));
    }
    if (bad) continue;

    // Gate G1 — every record must re-materialise byte-for-byte.
    let exact = true;
    for (let q = 0; q < m && exact; q++) {
      let rec = pieces[0];
      for (let c = 0; c < k; c++) rec += rows[q][slotIdx[c]] + pieces[c + 1];
      const unit = unitAt(q);
      if (unit === null || rec !== unit) exact = false;
    }
    if (!exact) continue;

    const block =
      s.BLK + String(m) + s.FLD + pieces.join(s.SLOT) + (k > 0 ? s.FLD + specs.join(s.FLD) : '') + s.END;

    const consumed = m * p;
    const original = lines.slice(i, i + consumed).join('\n');
    const gain = countTokens(original, enc) - countTokens(block, enc);
    if (gain <= 0) continue;

    if (!best || gain > best.gain) {
      best = {
        block,
        linesConsumed: consumed,
        gain,
        group: { records: m, columns: k, kinds, savedTokens: gain },
      };
    }
  }

  return best;
}

function align(text: string, s: Sigils, enc: EncodingName): { body: string; groups: SignetGroup[] } {
  const lines = text.split('\n');
  if (lines.length > MAX_LINES) return { body: text, groups: [] };
  const pieces: string[] = [];
  const groups: SignetGroup[] = [];
  let i = 0;
  let carried: Attempt | null | undefined;
  while (i < lines.length) {
    const here = carried !== undefined ? carried : bestAttemptAt(lines, i, s, enc);
    carried = undefined;
    if (!here) {
      pieces.push(lines[i]);
      i++;
      continue;
    }
    // One-line lookahead, retained from the STRATA repair: a stray leading line
    // must not be allowed to drag a richer family into a worse alignment.
    const next = bestAttemptAt(lines, i + 1, s, enc);
    if (next && next.gain > here.gain) {
      pieces.push(lines[i]);
      i++;
      carried = next;
      continue;
    }
    pieces.push(here.block);
    groups.push(here.group);
    i += here.linesConsumed;
  }
  return { body: pieces.join('\n'), groups };
}

const encodeCache = new Map<string, SignetResult>();
const CACHE_MAX = 8;
const CACHE_MAX_CHARS = 400_000;

export function signetEncode(text: string, enc: EncodingName = 'o200k_base'): SignetResult {
  const key = text.length <= CACHE_MAX_CHARS ? enc + '\u0000' + text : null;
  if (key !== null) {
    const hit = encodeCache.get(key);
    if (hit) return hit;
  }
  const result = signetEncodeUncached(text, enc);
  if (key !== null) {
    if (encodeCache.size >= CACHE_MAX) encodeCache.clear();
    encodeCache.set(key, result);
  }
  return result;
}

function signetEncodeUncached(text: string, enc: EncodingName): SignetResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): SignetResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    groups: [],
    closedForms: 0,
    mode: 'identity',
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');
  const mustWrap = text.startsWith(SENTINEL);

  const s = pickSigils(text, enc);
  if (!s) return identity('fewer than five absent single-token sigils available');
  const head = SENTINEL + s.BLK + s.END + s.FLD + s.VAL + s.SLOT + '\n';

  const { body, groups } = align(text, s, enc);

  if (groups.length === 0) {
    if (!mustWrap) return identity('no class-signature family cleared the measured gain bar');
    const w = head + text;
    const d = signetDecode(w);
    const ot = countTokens(w, enc);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
      groups: [],
      closedForms: 0,
      mode: 'forced-wrap',
      notes: 'forced wrap: input begins with the SG1 sentinel',
      encodeMs: ms(),
    };
  }

  // Residual lanes, kept only on measured improvement.
  const plain = head + body;
  const hx = helixEncode(body, enc);
  const combos: string[] = [plain];
  if (hx.mode === 'factored') combos.push(head + hx.wire);
  for (const base of combos.slice()) {
    const bound = anaphoraEncode(base, enc);
    if (bound.mode === 'anaphoric') combos.push(bound.wire);
  }

  let wire = plain;
  let wireTok = countTokens(plain, enc);
  for (const cand of combos) {
    const t = countTokens(cand, enc);
    if (t < wireTok && signetDecode(cand) === text) {
      wire = cand;
      wireTok = t;
    }
  }

  const decoded = signetDecode(wire);
  if (decoded !== text) return identity('gate G3: assembled wire failed byte-verify');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens && !mustWrap) return identity('gate G4: wire measured ≥ input');

  const records = groups.reduce((t, g) => t + g.records, 0);
  const closedForms = groups.reduce(
    (t, g) => t + g.kinds.filter((k) => k !== 'literal').length,
    0,
  );
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    groups,
    closedForms,
    mode: 'signet',
    notes: `${groups.length} signature famil${groups.length === 1 ? 'y' : 'ies'} · ${records} records · ${closedForms} closed-form column${closedForms === 1 ? '' : 's'} · byte-exact`,
    encodeMs: ms(),
  };
}

/* ---------------------------- decoder contract ----------------------------- */

export const SIGNET_SYSTEM_PROMPT = [
  '# ⌗ SIGNET-G1 — byte-exact typed-column wire (template once, columns as rules)',
  'A message may open with:',
  '  [SG1]',
  '  BEFVL         <- line 2 declares five framing characters, in this order:',
  '                   BLOCK, END, FIELD, VALUE, SLOT',
  '  <body>',
  'A block inside the body reads:',
  '  BLOCK m FIELD template FIELD spec0 FIELD spec1 … END',
  'Rebuild it as a table of m records:',
  '1. Split the template on SLOT. The pieces are fixed text and one slot sits',
  '   between each consecutive pair of pieces. A piece may be empty.',
  '2. Each spec describes one column of m values. Read its first character:',
  '     =v           every record has the value v',
  '     #s,d,w       value of record r is s + d*r; zero-pad to w digits if w>0',
  '     @p VALUE v…  the p values after the first VALUE repeat in a cycle;',
  '                  record r takes the value at position (r mod p)',
  '     %s,w VALUE … running total: record 0 is s, and each following record',
  '                  adds the next difference produced by the spec after VALUE;',
  '                  zero-pad to w digits if w>0',
  '     ^n VALUE x…  prepend the n characters after VALUE to every value',
  '                  produced by the spec that follows',
  '     $n VALUE x…  the same, but appended as a suffix',
  '     ~v VALUE v…  the values listed one by one',
  '     anything else is also just the values listed one by one, split on VALUE',
  '3. Record r is piece0 + col0[r] + piece1 + col1[r] + … Records are separated',
  '   by newlines, in order, exactly where the block appears.',
  'The repeated skeleton is written once and each column is written as the rule',
  'that generates it. Nothing was summarised or dropped; this is exact.',
  'Arithmetic markers may also appear:',
  HELIX_SYSTEM_PROMPT,
  'All other characters are literal. Reconstruction is byte-exact.',
  'OUTPUT CONTRACT: answer densely; reproduce code, identifiers, numbers and',
  'quoted values verbatim; you may reason about a column from its rule without',
  'expanding it.',
].join('\n');

/* -------------------------------- self tests ------------------------------- */

export interface SignetSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

/** 300-char hetero: prose + JSON + CSV + grid + code + LLM chat-history log. */
export const SIGNET_HANDTRACE_300 =
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

export function signetSelfTest(enc: EncodingName = 'o200k_base'): SignetSelfTest[] {
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
    (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok and no warnings.`,
  ).join('\n');
  const grid = Array.from({ length: 30 }, () => '|##..##|..##..|').join('\n');
  const frames = Array.from({ length: 40 }, (_, i) => `frame${String(i).padStart(4, '0')}.png ok`).join('\n');
  const prose =
    'The quick brown fox jumps over the lazy dog while the committee deliberates ' +
    'on whether a second breakfast constitutes an institutional precedent.';
  const ragged = 'a\nbb\nccc\ndddd\neeeee\nffffff';

  const cases: { name: string; text: string }[] = [
    { name: 'G0 empty', text: '' },
    { name: 'G1 single line', text: 'just one line of text here' },
    { name: 'G2 unstructured prose (must not corrupt)', text: prose },
    { name: 'G3 hand-trace 300 hetero', text: SIGNET_HANDTRACE_300 },
    { name: 'G4 sentinel adversary', text: '[SG1]\n一丁丂丄丅\nnot a wire' },
    { name: 'G5 CRLF + astral + CJK-bearing', text: 'l1\r\nl2\r\n中文 🚀🚀 ≈done\r\n'.repeat(6) },
    { name: 'G6 markdown grid', text: grid },
    { name: 'G7 json log 40 records', text: jsonLog },
    { name: 'G8 csv 60 rows', text: csv },
    { name: 'G9 chat transcript 24 turns', text: chat },
    { name: 'G10 ragged lines (no family)', text: ragged },
    { name: 'G11 zero-padded affix column', text: frames },
  ];

  const out: SignetSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = signetEncode(c.text, enc);
      const rt = signetDecode(r.wire) === c.text;
      const guard = r.mode === 'forced-wrap' ? true : r.outTokens <= r.inTokens;
      out.push({
        name: c.name,
        pass: rt && r.exact && guard,
        details: `${r.mode} g=${r.groups.length} cf=${r.closedForms} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }

  // The whole point of the mechanism: ONE family where LCS shattered into four.
  try {
    const r = signetEncode(jsonLog, enc);
    out.push({
      name: 'G12 json log is a single family',
      pass: r.groups.length === 1 && r.closedForms >= 2,
      details: `groups=${r.groups.length} closedForms=${r.closedForms} (require 1 group, ≥2 rules)`,
    });
  } catch (e) {
    out.push({ name: 'G12 json log is a single family', pass: false, details: (e as Error).message });
  }

  for (const [label, text, floor] of [
    ['G13 json-log witness', jsonLog, 90],
    ['G14 csv witness', csv, 72],
    ['G15 frames witness', frames, 85],
  ] as [string, string, number][]) {
    try {
      const r = signetEncode(text, enc);
      out.push({
        name: label,
        pass: r.savingsPct > floor,
        details: `${r.savingsPct.toFixed(1)}% (require >${floor}%)`,
      });
    } catch (e) {
      out.push({ name: label, pass: false, details: (e as Error).message });
    }
  }

  // G16 — no-regression gate. SIGNET must not be worse than STRATA on any
  // shape where the class signature is a valid family criterion, and must be
  // strictly better on the record-structured shapes that motivated it.
  try {
    const shapes: [string, string][] = [
      ['prose', prose],
      ['grid', grid],
      ['csv', csv],
      ['json-log', jsonLog],
      ['chat', chat],
      ['frames', frames],
      ['hetero-300', SIGNET_HANDTRACE_300],
      ['ragged', ragged],
    ];
    const losses: string[] = [];
    let wins = 0;
    for (const [name, text] of shapes) {
      const g = signetEncode(text, enc);
      const st = strataEncode(text, enc);
      if (g.outTokens > st.outTokens) losses.push(`${name} ${g.outTokens}>${st.outTokens}`);
      if (g.outTokens < st.outTokens) wins++;
    }
    out.push({
      name: 'G16 never worse than STRATA, strictly better somewhere',
      pass: losses.length === 0 && wins > 0,
      details: losses.length === 0 ? `0 losses, ${wins} strict wins` : losses.join(', '),
    });
  } catch (e) {
    out.push({
      name: 'G16 never worse than STRATA, strictly better somewhere',
      pass: false,
      details: (e as Error).message,
    });
  }
  return out;
}
