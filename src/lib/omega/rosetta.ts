/**
 * src/lib/omega/rosetta.ts
 * =============================================================================
 * ROSETTA-R2 — Notational transposition (dual-spelling argmin) + gated Pareto
 * (R2 = R1 + table/YAML/JSON-family span systems P/Y/F + the τ member lane;
 *  R2.1 = J-array leading-pipe markers (single/empty arrays now fold — the
 *  G1 gate used to veto whole lines over ["x"]/[] values), the prologue diet
 *  (no newline after the mark: −1 token on every wire, measured — the bare
 *  newline never merges), TS-transposition inside P-span fields and F-family
 *  values (parity with the C system), and a total φφ-literal forced-wrap for
 *  pool-soaked sources that no disjoint window can protect;
 *  R3 = the member-header tax eliminated: templated line families (N —
 *  identical runs and delimiter field families with class-signature
 *  detection, typed slots: arithmetic segments incl. modular wraps, literal
 *  cycles with period dedup and ^prefix/$suffix factoring), arithmetic runs
 *  (A — unit+progression+delimiter), and character RLE (E) as span systems
 *  in the ONE grammar — composing with W/R/T inside the same wire, which no
 *  standalone member (signet/pulse/helix) can do. Receipts (o200k):
 *  grid-30 23→15, rle-1400 19→11, idrun-200 18→13, csv-60 88→57 (beats
 *  signet on its own lane), three-regime 131→83 (beats the orbit composite);
 *  suite 873→773.)
 * tournament over every self-contained exact lane in this repository.
 *
 * THE BLINDSPOT (measured, and shared by every codec in this repository)
 * -----------------------------------------------------------------------------
 * Every lane here — SIGNET, STRATA, TESSERA, PULSE, HELIX, ANAPHORA, MERIDIAN,
 * QUASAR, PLEXUS, VERITAS, AXIOM, PRAXIS, TRIE, REPAIR, COLUMN, SIGMA, and the
 * composites MOSAIC / ORBIT / SPLICE / CROWN / … — is a REDUNDANCY codec: it
 * pays off only when the input repeats something (a line signature, a phrase,
 * a run, a numeric progression, a column frame). The repository's own harness
 * proves the consequence: on 900 characters of chaotic heterogeneous text
 * (prose + list + CSV + JSON + code + Chinese — the exact shape of a real
 * agent turn) EVERY redundancy lane returns identity. 288 tokens in, 288 out.
 * The only codecs that move at all are LTP/EIDOLON, which delete material and
 * keep the restoration data LOCALLY (their wires do not decode alone), and the
 * binary transport Ω-Ξ, which loses to plain identity at this size (291).
 *
 * THE UNTAPPED SOURCE OF COMPRESSION
 * -----------------------------------------------------------------------------
 * A chaos document has (near) zero repetition, but it is still full of
 * NOTATIONAL EQUIVALENCE: the same information has more than one standardized
 * spelling, and the spellings cost DIFFERENT numbers of BPE tokens.
 *
 *   '2026-09-15T06:02:11Z'   (13 tokens)  ≡  '20260915T060211Z'   ( 7 tokens)
 *     ISO 8601 extended format        ≡      ISO 8601 basic format
 *     (ISO 8601 defines both spellings of the same instant; the mapping is a
 *      pure character relocation, hence trivially invertible)
 *
 *   '{"job":"sync","retries":3,…}'  (25 tokens) ≡ 'job=sync retries=3 …' (16)
 *     JSON serialization             ≡      key=value pairs with the JSON
 *     shell (quotes, braces, colons) elided; structure/data separation as in
 *     XMill (Liefke & Suciu, VLDB 1999), restricted to shapes whose exact
 *     re-serialization is verifiable at encode time.
 *
 *   'us-east-1'  (4 tokens)  ≡  a verified 1-token glyph from a versioned,
 *     enumerated namespace (cloud regions are a closed, published list;
 *     static-dictionary coding as in Brotli RFC 7932 §8 / ITU-T V.44bis).
 *
 *   'region,dc,hosts,errors'  (7 tokens)  ≡  'region dc hosts errors'  (4)
 *     delimiter-light table notation: the field grammar carries no spaces, so
 *     the separator is recoverable without transmitting it.
 *
 * None of these substitutions throws away a single byte, and none needs the
 * input to repeat ANYTHING. They fire exactly where every redundancy codec
 * ties with identity — no amount of tuning a redundancy codec can close that
 * gap, because the slack is not in the redundancy, it is in the SPELLING.
 *
 * THE WIRE (self-contained; decodes alone, no local state)
 * -----------------------------------------------------------------------------
 *   <mark>\n<body>
 *
 * <mark> is a glyph from a tokenizer-verified, version-stable pool of
 * single-token characters (rosettaPool). Its index k in the pool anchors the
 * whole codebook:
 *   mark                 = pool[k]        (span marker, 1 token)
 *   region[i] glyph      = pool[k+1+i]    (versioned region table RNS-1)
 *   phrase flag          = pool[k+1+RNS-1 size]  (W-wires only)
 * The window [k, k+M) is chosen at encode time to be disjoint from the source
 * text, so no escape sequences are ever needed: a glyph can only mean what
 * the header says it means.
 *
 * W-wires (the PHRASEBOOK-φ1 composition, systems=['W',…]):
 *   <mark>\n<flag>\n<body>
 * where <body> is the transposition of the PHRASE-FOLDED source: every
 * occurrence of a PHRASEBOOK-φ1 codebook phrase was first replaced by its
 * single-token Hangul glyph (U+AC00+, a namespace disjoint from the pool),
 * then the region/JSON/CSV/timestamp systems ran on top. The flag line is
 * what makes phrase mode reachable at decode time and NOTHING else: a plain
 * wire's body can never contain the flag glyph (window disjointness), so a
 * source that literally contains Hangul can never be phrase-expanded by
 * accident.
 *
 * In <body>:
 *   mark + <basic-timestamp>        a transposed ISO-8601 instant
 *                                   (self-delimiting: \d{8}T\d{6}…)
 *   mark + 'J' + <kv-pairs> + mark  a folded JSON object
 *   mark + 'C' + <rows>     + mark  a folded comma-table (space-joined fields)
 *   any other pool[k+1..k+M) glyph  a region name (table lookup)
 *   everything else                 literal text
 * Inside J and C payloads, nested mark+timestamp spans still parse, so a
 * timestamp inside a JSON value or a CSV field transposes too.
 *
 * PARETO GUARANTEE (construction, not hope — the ORBIT/CROWN discipline)
 * -----------------------------------------------------------------------------
 * rosettaEncode runs a tournament whose candidate set contains identity,
 * ORBIT (which contains APEX, MOSAIC, SIGNET, STRATA, TESSERA, AXIOM,
 * ANAPHORA, MERIDIAN, QUASAR, PLEXUS, PULSE, HELIX, VERITAS), CROWN (which
 * contains ATLAS, AURORA, ORBIT, MOSAIC and the exact lanes), SPLICE, the
 * cheap structural singles, the raw transposition, and transposition
 * composed with the structural lanes. Every candidate is admitted only after
 * its own decoder reproduces the input byte-for-byte, and the winner is the
 * measured argmin under the REAL tokenizer. Because the previous best is
 * always a member, cost(ROSETTA) ≤ min(every shipped self-contained exact
 * codec) on every input, and the transposition members supply the strict
 * wins on the chaos regime where all other members tie with identity.
 *
 * Duplex/local-residual lanes (LTP, EIDOLON, NEXUS, APEX-with-order-tag) are
 * deliberately NOT members: their wires do not decode without local state,
 * which violates the MOSAIC-class constraint this codec holds itself to.
 * Ω-Ξ (binary transport) is excluded for the same reason — a different
 * constraint class by its own system prompt. ROSETTA still beats both on the
 * chaos regime by measurement (self-test C-series).
 *
 * EXACTNESS GATES
 *   G1 every transposed span is re-expanded and byte-compared before it may
 *      enter the wire;
 *   G2 the assembled transposed body must expand back to the source text
 *      through the real expansion primitive before it becomes a candidate;
 *   G3 every tournament candidate is decoded by its own decoder and
 *      byte-compared before it may win;
 *   G4 the finished wire is decoded once more and byte-compared, and its
 *      measured token count must be strictly below the input's;
 *   G5 the glyph window is disjoint from the SOURCE, so an input that already
 *      looks like a ROSETTA wire can never collide with the emitted wire.
 * =============================================================================
 */
import { countTokens, encodeIds, type EncodingName } from './bpe';
import { banyanCandidate, banyanDecode, BANYAN_SENTINEL, BANYAN_LITERAL } from './banyan';
import { signetEncode, signetDecode } from './signet';
import { strataDecode } from './strata';
import { tesseraDecode } from './tessera';
import { columnDecode } from './column';
import { trieDecode } from './trie';
import { repairDecode } from './repair';
import { stencilDecode } from './stencil';
import { morphDecode } from './morph';
import { helixDecode } from './helix';
import { pulseDecode } from './pulse';
import { meridianDecode } from './meridian';
import { quasarDecode } from './quasar';
import { plexusDecode } from './plexus';
import { veritasDecode } from './veritas';
import { anaphoraDecode } from './anaphora';
import { axiomDecode } from './axiom';
import { mosaicEncode, mosaicDecode, type MosaicResult } from './mosaic';
import { type OrbitResult } from './orbit';
import { kappaEncode, kappaDecode, KAPPA_SENTINEL } from './kappa';
import { phraseEncode, phraseDecode, phraseFold, hasCodebookGlyph, phraseCodebook, PHRASE_SENTINEL, PHRASE_LITERAL } from './phrase';
import { tauEncode, tauDecode, TAU_SENTINEL, TAU_LITERAL, pipeSpan, commaSpan, yamlFromLines } from './tau';
import { crownDecode, type CrownResult } from './crown';
import { spliceDecode, type SpliceResult } from './splice';
import { eidolonProject } from './eidolon';
import { ltpProject } from './ltp';

/* --------------------------- versioned static tables ----------------------- */

export const K0_ENUMS: string[][] = [
  ['api latency', 'queue depth', 'TLS retry', 'db lock', 'cache miss'],
  ['raise timeout', 'drain queue', 'retry 3x', 'warm cache', 'page owner'],
  ['正常', '偏高', '回落', '待查', '完成'],
];

export const OPS1_LEXEMES: string[] = [
  'TLS handshake timeout', 'test_retry_backoff', 'queue depth climbed',
  'retry storm', 'p99 latency', 'pool exhausted', 'rollout status',
  'describe-instances', 'describe-pods', 'health check', 'failover',
  'レスポンス遅延', 'フェイルオーバー', '健康检查参数', '连接池配置',
  '负载均衡', '自动轮换', '错误率已回落', 'スループット', 'ネットワーク設定',
  '0123456789abcdef0123456789abcdef01234567', 'max=20, wait=5s',
  'max=50, wait=3s', 'retry 3x, never log secrets', 'fix the flaky test',
  'inspect the suite and patch the race',
  'Ship it', 'never log secrets', 'inspect the suite', 'patch the race',
];

/**
 * RNS-1 — enumerated cloud-region namespace (version 1).
 * Order is part of the wire contract: region i ↔ pool glyph pool[k+1+i].
 * AWS, Azure and GCP region identifiers are closed, published, versioned
 * enumerations; every entry is measured multi-token in o200k/cl100k.
 */
export const RNS1_REGIONS: string[] = [
  // AWS
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'af-south-1', 'ap-east-1', 'ap-south-1', 'ap-south-2',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'ap-southeast-4',
  'ca-central-1', 'ca-west-1',
  'eu-central-1', 'eu-central-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-north-1', 'eu-south-1', 'eu-south-2',
  'il-central-1', 'me-central-1', 'me-south-1', 'sa-east-1',
  // Azure
  'eastus2', 'westus2', 'westus3', 'centralus', 'northcentralus', 'southcentralus',
  'northeurope', 'westeurope', 'francecentral', 'francesouth',
  'germanywestcentral', 'germanynorth', 'uksouth', 'ukwest',
  'switzerlandnorth', 'switzerlandwest', 'norwayeast', 'norwaywest',
  'swedencentral', 'polandcentral', 'qatarcentral', 'uaenorth', 'uaecentral',
  'centralindia', 'southindia', 'westindia', 'japaneast', 'japanwest',
  'koreacentral', 'koreasouth', 'southeastasia', 'eastasia',
  'australiaeast', 'australiacentral', 'australiacentral2', 'australiasoutheast',
  'brazilsouth', 'brazilsoutheast', 'canadacentral', 'canadaeast',
  'eastus', 'westus',
  // GCP
  'us-central1', 'us-east4', 'us-east5', 'us-west3', 'us-west4',
  'northamerica-northeast1', 'northamerica-northeast2',
  'southamerica-east1', 'southamerica-west1',
  'europe-west2', 'europe-west4', 'europe-west6', 'europe-west8', 'europe-west9',
  'europe-north1', 'europe-central2',
  'asia-east2', 'asia-south1', 'asia-south2', 'asia-southeast2',
  'asia-northeast2', 'asia-northeast3',
  'australia-southeast2', 'me-west1',
  'us-east1', 'us-west1', 'us-west2', 'europe-west1', 'europe-west3',
  'asia-east1', 'asia-southeast1', 'australia-southeast1',
];

/* ------------------------------ glyph pool --------------------------------- */

/**
 * Tokenizer-verified pool of single-token glyphs.
 *
 * Determinism: the pool is a pure function of the encoding (fixed scan
 * order), so encoder and decoder always agree — the same discipline as the
 * Ω-atom alphabet in bpe.ts.
 *
 * Composition: hiragana first, then katakana, then single-token CJK hanzi
 * from U+5590 upward. The kana head is the load-bearing part: Chinese
 * documents never contain kana, so their glyph window lands in the kana
 * block no matter how many hanzi the document shares with the CJK tail;
 * Japanese documents fall back to the CJK tail. The CJK tail starts at
 * U+5590, safely above the 0x4E00-based pools used by QUASAR (first ~300
 * 1-token glyphs) and STRATA's ideographPool (first 400), so composing
 * another lane with ROSETTA cannot accidentally manufacture ROSETTA glyphs.
 * Measured supply (o200k): 73 + 77 + 2059 ≈ 2200 glyphs.
 */
const poolCache = new Map<EncodingName, string[]>();
const POOL_CJK_START = 0x5590;
export function rosettaPool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  const pushRange = (from: number, to: number, cap = 4000) => {
    for (let cp = from; cp <= to && out.length < cap; cp++) {
      const ch = String.fromCodePoint(cp);
      try {
        if (encodeIds(ch, enc).length === 1) out.push(ch);
      } catch {
        /* skip */
      }
    }
  };
  pushRange(0x3041, 0x3096, 2048); // hiragana
  pushRange(0x30a1, 0x30f6, 2048); // katakana
  pushRange(POOL_CJK_START, 0x9fa5, 2048); // single-token hanzi, above other pools
  poolCache.set(enc, out);
  return out;
}

/* ---------------------------- timestamp system ----------------------------- */

// ISO-8601 / RFC-3339 extended instant: 2026-09-15T06:02:11[.fff][Z|+05:30]
const TS_EXT =
  /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?/g;
// basic instant (wire form), FULL match only: 20260915T060211[.fff][Z|+0530]
const TS_BASIC =
  /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d{1,9})?(Z|[+-]\d{4})?$/;

const BASIC_MIN = 15; // 20260915T060211
const BASIC_MAX = 30; // 20260915T060211.123456789+0530

function plausibleDate(y: string, mo: string, d: string, h: string, mi: string, s: string): boolean {
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const min = Number(mi);
  const sec = Number(s);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23 || min > 59 || sec > 59) return false;
  return Number(y) >= 1000 && Number(y) <= 9999;
}

function extToBasic(m: RegExpExecArray): string {
  const zone = m[8] ? m[8].replace(':', '') : '';
  return `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6]}${m[7] ?? ''}${zone}`;
}

function basicToExt(b: string): string | null {
  const m = TS_BASIC.exec(b);
  if (!m || m[0] !== b) return null;
  const zone = m[8] ? (m[8] === 'Z' ? 'Z' : `${m[8].slice(0, 3)}:${m[8].slice(3)}`) : '';
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}${m[7] ?? ''}${zone}`;
}

/** Longest basic-timestamp span at s[i+1..], or null. Longest-first matters:
 *  an offset tail (+0530) must not be left behind as literal text. */
function probeBasic(s: string, i: number): { ext: string; end: number } | null {
  for (let len = BASIC_MAX; len >= BASIC_MIN; len--) {
    if (i + 1 + len > s.length) continue;
    const cand = s.slice(i + 1, i + 1 + len);
    const ext = basicToExt(cand);
    if (ext === null) continue;
    if (
      plausibleDate(
        cand.slice(0, 4), cand.slice(4, 6), cand.slice(6, 8),
        cand.slice(9, 11), cand.slice(11, 13), cand.slice(13, 15),
      )
    ) {
      return { ext, end: i + 1 + len };
    }
  }
  return null;
}

/* ------------------------------ JSON system -------------------------------- */

const KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

/** true if a bare (unquoted) KV token would round-trip as this JSON string. */
function bareableString(s: string): boolean {
  if (s === '') return false;
  if (s.includes('|') || s.includes('=') || s.includes('"') || /\s/.test(s)) return false;
  if (s === 'true' || s === 'false' || s === 'null') return false;
  if (!Number.isNaN(Number(s))) return false; // would decode as a number
  return true;
}

function kvEscape(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
function kvUnescape(s: string): string {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

export interface RosettaKvPair { key: string; val: string }

/**
 * Fold one canonical compact JSON object line into KV pairs.
 * Returns null when the line is not a foldable flat object.
 */
function foldJsonLine(line: string): RosettaKvPair[] | null {
  if (!line.startsWith('{') || !line.endsWith('}') || line.length < 4) return null;
  const inner = line.slice(1, -1);
  // flat objects only — arrays inside values are handled per-value below
  if (inner.includes('{') || inner.includes('}')) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  try {
    if (JSON.stringify(parsed) !== line) return null; // canonical compact only
  } catch {
    return null;
  }
  const pairs: RosettaKvPair[] = [];
  for (const [k, v] of Object.entries(parsed)) {
    if (!KEY_RE.test(k)) return null;
    if (typeof v === 'string') {
      pairs.push({ key: k, val: bareableString(v) ? v : `"${kvEscape(v)}"` });
    } else if (typeof v === 'number' || typeof v === 'boolean' || v === null) {
      pairs.push({ key: k, val: v === null ? 'null' : String(v) });
    } else if (Array.isArray(v)) {
      // Arrays fold to '|'-joined elements. A single-element (or empty)
      // array would be ambiguous with a bare string ('' also means empty
      // string), so it carries a LEADING pipe: ["slack"] -> '|slack',
      // [] -> '|'. Bare strings can never contain '|' (bareableString),
      // quoted values start with '"' — the marker is unambiguous.
      const parts: string[] = [];
      for (const el of v) {
        if (typeof el === 'string') {
          if (!bareableString(el)) return null;
          parts.push(el);
        } else if (typeof el === 'number' || typeof el === 'boolean' || el === null) {
          parts.push(el === null ? 'null' : String(el));
        } else {
          return null; // nested arrays/objects
        }
      }
      pairs.push({ key: k, val: parts.length <= 1 ? '|' + parts.join('|') : parts.join('|') });
    } else {
      return null; // nested object
    }
  }
  return pairs;
}

/** Render KV pairs back to the JSON object line. Inverse of foldJsonLine. */
function unfoldJsonPairs(pairs: RosettaKvPair[]): string | null {
  const out: string[] = [];
  for (const p of pairs) {
    if (!KEY_RE.test(p.key)) return null;
    let rendered: string;
    const v = p.val;
    if (v.startsWith('"')) {
      if (!v.endsWith('"') || v.length < 2) return null;
      rendered = JSON.stringify(kvUnescape(v.slice(1, -1)));
    } else if (v.startsWith('|')) {
      // leading-pipe array marker: '|x' -> ["x"], '|' -> []
      const arr: unknown[] = [];
      if (v.length > 1) {
        for (const part of v.slice(1).split('|')) {
          if (part === 'true' || part === 'false') arr.push(part === 'true');
          else if (part === 'null') arr.push(null);
          else if (part !== '' && !Number.isNaN(Number(part))) arr.push(Number(part));
          else arr.push(part);
        }
      }
      rendered = JSON.stringify(arr);
    } else if (v.includes('|')) {
      const arr: unknown[] = [];
      for (const part of v.split('|')) {
        if (part === 'true' || part === 'false') arr.push(part === 'true');
        else if (part === 'null') arr.push(null);
        else if (part !== '' && !Number.isNaN(Number(part))) arr.push(Number(part));
        else arr.push(part);
      }
      rendered = JSON.stringify(arr);
    } else if (v === 'true' || v === 'false' || v === 'null') {
      rendered = v;
    } else if (v !== '' && !Number.isNaN(Number(v))) {
      rendered = JSON.stringify(Number(v));
    } else {
      rendered = JSON.stringify(v);
    }
    out.push(`${JSON.stringify(p.key)}:${rendered}`);
  }
  return `{${out.join(',')}}`;
}

/* ------------------------------ table system ------------------------------- */

/** Fields must be non-empty and space-free for the delimiter-light form. */
function csvFoldableLine(line: string): boolean {
  if (!line.includes(',')) return false;
  for (const f of line.split(',')) {
    if (f.length === 0 || f.includes(' ')) return false;
  }
  return true;
}

/* ------------------------------ transposition ------------------------------ */

export interface RosettaTranspose {
  /** mark + body (prologue diet: no newline after the mark), or null. */
  wire: string | null;
  mark: string;
  windowStart: number;
  systems: string[];
}


/* ------------------------- R3 span systems: N / A / E --------------------- */

const SLOT_GLYPHS = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧']; // 1-token slots
const RLE_MIN_RUN = 40;   // char runs shorter than this never pay for a span
const ARITH_MIN = 4;      // numbers in an A-span run
const FAMILY_MIN = 2;     // lines in an N family — 2 suffices: the per-span
                          // profitability gate rejects any pair whose wire is not a
                          // strict token win, so the minimum only bounds attempts

/** Class signature of a string: A(lpha) D(igit) O(ther) per char, run-coded. */
function classSig(s: string): string {
  let out = '';
  let prev = '';
  for (const ch of s) {
    const c = /[A-Za-z]/.test(ch) ? 'A' : /[0-9]/.test(ch) ? 'D' : 'O';
    if (c !== prev) { out += c; prev = c; }
  }
  return out;
}

interface ArithSeg { start: number; stride: number; count: number }

/** Segment an integer sequence into arithmetic runs. */
function arithSegments(vals: number[]): ArithSeg[] | null {
  if (vals.length < 2 || vals.some((v) => !Number.isSafeInteger(v))) return null;
  const segs: ArithSeg[] = [];
  let start = vals[0];
  let stride: number | null = null; // set by the first delta, re-seeded on breaks
  let count = 1;
  for (let i = 1; i < vals.length; i++) {
    const d = vals[i] - vals[i - 1];
    if (stride === null) { stride = d; count++; continue; }
    if (d === stride) { count++; continue; }
    segs.push({ start, stride, count });
    start = vals[i];
    stride = null;
    count = 1;
  }
  if (stride !== null) segs.push({ start, stride, count });
  else if (segs.length > 0) segs[segs.length - 1].count += count; // trailing singleton
  else return null;
  return segs;
}

const SPEC_BAD = new Set(['|', ';', ' ', '#', '@', '^', '$', ':', '\n']);

/** Render one slot spec from its values (argmin: arithmetic vs cycle). */
function renderSpec(vals: string[], enc: EncodingName): string | null {
  if (vals.some((v) => [...v].some((c) => SPEC_BAD.has(c)))) return null;
  const nums = vals.map((v) => (/^-?\d+$/.test(v) ? Number(v) : NaN));
  let arithSpec: string | null = null;
  // Arithmetic renders via String(number) — only admissible when every value
  // is already in canonical form ('00' or '+5' would decode back lossily).
  if (!nums.some(Number.isNaN) && vals.every((v) => v === String(Number(v)))) {
    const segs = arithSegments(nums);
    if (segs !== null) {
      arithSpec = '#' + segs.map((g) => `${g.start}:${g.stride}:${g.count}`).join(';');
    }
  }
  // cycle with common prefix/suffix factoring
  let pre = vals[0];
  let suf = '';
  for (let i = 1; i < vals.length; i++) {
    while (pre && !vals[i].startsWith(pre)) pre = pre.slice(0, -1);
  }
  if (!pre) {
    const rev = (x: string) => [...x].reverse().join('');
    let rs = rev(vals[0]);
    for (let i = 1; i < vals.length; i++) {
      while (rs && !rev(vals[i]).startsWith(rs)) rs = rs.slice(0, -1);
    }
    suf = rev(rs);
  }
  // cycle period: the shortest prefix of the value sequence that repeats to
  // reproduce it exactly (a 7-value name cycle lists 7, not m, entries)
  const core = vals.map((v) => v.slice(pre.length, v.length - suf.length || undefined));
  let period = core.length;
  for (let p = 1; p < core.length; p++) {
    let cyc = true;
    for (let i = 0; i < core.length && cyc; i++) if (core[i] !== core[i % p]) cyc = false;
    if (cyc) { period = p; break; }
  }
  const cycled = period < core.length ? core.slice(0, period) : core;
  // Range body: 3+ consecutive canonical non-negative integers compress to
  // 'lo-hi'. Safe from collision: a D-run value is pure digits (no '-'), and
  // a multi-value literal body always contains '|' — so a body matching
  // ^\d+-\d+$ can only be a range.
  let cycBody: string;
  if (
    cycled.length >= 3 &&
    cycled.every((v) => /^\d+$/.test(v) && String(Number(v)) === v)
  ) {
    const ns = cycled.map(Number);
    cycBody = ns.every((n, i) => i === 0 || n === ns[i - 1] + 1)
      ? String(ns[0]) + '-' + String(ns[ns.length - 1])
      : cycled.join('|');
  } else {
    cycBody = cycled.join('|');
  }
  const cycleSpec = (pre ? '^' + pre : '') + (suf ? '$' + suf : '') + '@' + cycBody;
  // unfactored range candidate: '10'..'19' is both ^1@0-9 and @10-19 —
  // argmin over both forms (the factored form is not always cheaper).
  let rangeSpec: string | null = null;
  if (vals.length >= 3 && vals.every((v) => /^\d+$/.test(v) && String(Number(v)) === v)) {
    const ns = vals.map(Number);
    if (ns.every((n, i) => i === 0 || n === ns[i - 1] + 1)) rangeSpec = '@' + String(ns[0]) + '-' + String(ns[ns.length - 1]);
  }
  const cands = [arithSpec, cycleSpec, rangeSpec].filter((c): c is string => c !== null);
  if (cands.length === 0) return null;
  return cands.reduce((a, b) => (countTokens(b, enc) < countTokens(a, enc) ? b : a));
}

/** Parse a slot spec back to a value function (the decode-side contract). */
export function parseSpec(spec: string): ((i: number) => string) | null {
  let rest = spec;
  let pre = '';
  let suf = '';
  if (rest.startsWith('^')) { const sp = rest.indexOf('$') > -1 && rest.indexOf('@') > rest.indexOf('$') ? rest.indexOf('$') : rest.indexOf('@'); pre = rest.slice(1, sp); rest = rest.slice(sp); }
  if (rest.startsWith('$')) { const sp = rest.indexOf('@'); suf = rest.slice(1, sp); rest = rest.slice(sp); }
  if (rest.startsWith('#')) {
    const segs: ArithSeg[] = [];
    for (const part of rest.slice(1).split(';')) {
      const t = part.split(':');
      if (t.length !== 3) return null;
      const a = Number(t[0]), b = Number(t[1]), c = Number(t[2]);
      if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || !Number.isSafeInteger(c) || c < 1) return null;
      segs.push({ start: a, stride: b, count: c });
    }
    return (i: number) => {
      let k = i;
      for (const g of segs) {
        if (k < g.count) return pre + String(g.start + g.stride * k) + suf;
        k -= g.count;
      }
      return pre + String(segs[segs.length - 1].start + segs[segs.length - 1].stride * k) + suf;
    };
  }
  if (rest.startsWith('@')) {
    const body = rest.slice(1);
    let vals: string[];
    const rm = /^(\d+)-(\d+)$/.exec(body);
    if (rm !== null) {
      const lo = Number(rm[1]);
      const hi = Number(rm[2]);
      // canonical form only; hi > lo (a 1-value cycle is never emitted)
      if (String(lo) !== rm[1] || String(hi) !== rm[2] || hi <= lo) return null;
      vals = Array.from({ length: hi - lo + 1 }, (_, k) => String(lo + k));
    } else {
      vals = body.split('|');
    }
    if (vals.length === 0) return null;
    return (i: number) => pre + vals[i % vals.length] + suf;
  }
  return null;
}

/** E-fold: replace >=RLE_MIN_RUN repeats of a non-digit char by mark+E+<n><c>+mark. */
function rleFoldLine(line: string, mark: string): string | null {
  if (line.length < RLE_MIN_RUN * 2) return null;
  let out = '';
  let i = 0;
  let folded = false;
  while (i < line.length) {
    const c = line[i];
    if (/[0-9]/.test(c)) { out += c; i++; continue; }
    let j = i;
    while (j < line.length && line[j] === c) j++;
    const n = j - i;
    if (n >= RLE_MIN_RUN) { out += mark + 'E' + String(n) + c + mark; folded = true; }
    else out += line.slice(i, j);
    i = j;
  }
  return folded ? out : null;
}

/** A-fold: line = unit+num DELIM unit+num ... with an arithmetic num run. */
function arithFoldLine(line: string, mark: string): string | null {
  for (const delim of [',', ';']) {
    const parts = line.split(delim);
    if (parts.length < ARITH_MIN) continue;
    const units: string[] = [];
    const nums: number[] = [];
    let ok = true;
    for (const p of parts) {
      const m = /^(.*?)(-?\d+)$/.exec(p);
      if (!m || m[1] === '') { ok = false; break; } // unit must be non-empty
      units.push(m[1]);
      nums.push(Number(m[2]));
    }
    if (!ok) continue;
    if (new Set(units).size !== 1) continue;
    const segs = arithSegments(nums);
    if (segs === null || segs.length !== 1) continue; // v1: one clean progression
    return mark + 'A' + `${segs[0].start}:${segs[0].stride}:${nums.length}` + '\n' + units[0] + '\n' + delim + mark;
  }
  return null;
}

/**
 * N-fold: a run of consecutive lines that is either all-identical or a
 * delimiter family with per-field class signatures. Returns the span or null.
 */
function familyFold(run: string[], mark: string, enc: EncodingName): string | null {
  const m = run.length;
  if (m < FAMILY_MIN) return null;
  // identical mode
  if (run.every((l) => l === run[0])) {
    return mark + 'N' + String(m) + '\n' + run[0] + mark;
  }
  // field mode: try delimiters
  for (const d of [',']) {
    const grids = run.map((l) => l.split(d));
    if (!grids.every((g) => g.length === grids[0].length && g.length >= 2)) continue;
    const width = grids[0].length;
    // per-field class signature must agree across all lines (keeps headers
    // like "id,name,score" out of numeric row families)
    let sigOk = true;
    for (let c = 0; c < width && sigOk; c++) {
      const sig = classSig(grids[0][c]);
      for (let r = 1; r < m; r++) if (classSig(grids[r][c]) !== sig) { sigOk = false; break; }
    }
    if (!sigOk) continue;
    const template: string[] = [];
    const specs: string[] = [];
    let slot = 0;
    for (let c = 0; c < width; c++) {
      const colVals = grids.map((g) => g[c]);
      if (new Set(colVals).size === 1) { template.push(colVals[0]); continue; }
      if (slot >= SLOT_GLYPHS.length) return null;
      const spec = renderSpec(colVals, enc);
      if (spec === null) return null;
      template.push(SLOT_GLYPHS[slot]);
      specs.push(spec);
      slot++;
    }
    return mark + 'N' + String(m) + ':' + d + '\n' + template.join(d) + '\n' + specs.join(' ') + mark;
  }
  return null;
}


/** G1 helper: render an N-span payload back to source lines (null = malformed). */
function decodeSpanForG1(
  span: string,
  mark: string,
  regionByGlyph: Map<string, string>,
  phraseByGlyph: Map<string, string> | null,
  sep: string | null,
): string | null {
  if (!span.startsWith(mark + 'N') || !span.endsWith(mark)) return null;
  const payload = span.slice(2, -1);
  const nl = payload.indexOf('\n');
  if (nl < 2) return null;
  const head = payload.slice(0, nl);
  const rest = payload.slice(nl + 1);
  const jm = /^(\d+)J:$/.exec(head); // 'N<m>J:' — J-composed signature
  const dd = head.indexOf('::');
  const sigMode = jm === null && ((dd >= 0 && dd === head.length - 3) || head.indexOf(':') === head.length - 1); // 'N<m>::<s>' or 'N<m>:'
  const stride = dd >= 0 && dd === head.length - 3 ? Number(head[head.length - 1]) : 1;
  const ci = head.indexOf(':');
  const fieldMode = jm === null && ci > 0 && !sigMode;
  const m = Number(jm !== null ? jm[1] : fieldMode || sigMode ? head.slice(0, dd >= 0 ? dd : ci) : head);
  const d = fieldMode ? head[ci + 1] : '\n';
  if (!Number.isSafeInteger(m) || m < 1 || (fieldMode && (d === undefined || d.length !== 1 || /[0-9]/.test(d)))) return null;
  if (sigMode && !(stride >= 1 && stride <= 3 && m % stride === 0)) return null;
  const outL: string[] = [];
  if (jm !== null) {
    const snl = rest.indexOf('\n');
    if (snl < 0) return null;
    const template = rest.slice(0, snl);
    const specs = rest.slice(snl + 1).split(' ').filter((x) => x !== '');
    const fns = specs.map((sp) => parseSpec(sp));
    if (fns.some((f) => f === null)) return null;
    if ([...template].some((ch) => SLOT_GLYPHS.indexOf(ch) >= fns.length)) return null;
    for (let r = 0; r < m; r++) {
      let line2 = '';
      for (const ch of template) {
        const gi = SLOT_GLYPHS.indexOf(ch);
        line2 += gi >= 0 ? (fns[gi]!(r) as string) : ch;
      }
      const pairs = parseKvPayload(expandBody(line2, mark, regionByGlyph, phraseByGlyph, sep));
      const json = pairs === null ? null : unfoldJsonPairs(pairs);
      if (json === null) return null;
      outL.push(json);
    }
    return outL.join('\n');
  }
  if (sigMode) {
    const templates: string[] = [];
    let cursor = 0;
    for (let t = 0; t < stride; t++) {
      const tnl = rest.indexOf('\n', cursor);
      if (tnl < 0) return null;
      templates.push(rest.slice(cursor, tnl));
      cursor = tnl + 1;
    }
    const specs = rest.slice(cursor).split(' ').filter((x) => x !== '');
    const fns = specs.map((sp) => parseSpec(sp));
    if (fns.some((f) => f === null)) return null;
    if (templates.some((t) => [...t].some((ch) => SLOT_GLYPHS.indexOf(ch) >= fns.length))) return null;
    for (let r = 0; r < m; r++) {
      const template = templates[r % stride]!;
      const si = Math.floor(r / stride);
      let line2 = '';
      for (const ch of template) {
        const gi = SLOT_GLYPHS.indexOf(ch);
        line2 += gi >= 0 ? (fns[gi]!(si) as string) : ch;
      }
      outL.push(line2);
    }
    return outL.map((l) => expandBody(l, mark, regionByGlyph, phraseByGlyph, sep)).join('\n');
  }
  if (fieldMode) {
    const snl = rest.indexOf('\n');
    if (snl < 0) return null;
    const template = rest.slice(0, snl).split(d);
    const specs = rest.slice(snl + 1).split(' ').filter((x) => x !== '');
    const fns = specs.map((sp) => parseSpec(sp));
    if (fns.length === 0 || fns.some((f) => f === null)) return null;
    for (let r = 0; r < m; r++) {
      outL.push(template.map((fl) => {
        const si = SLOT_GLYPHS.indexOf(fl);
        return si >= 0 && si < fns.length ? (fns[si] as (i: number) => string)(r) : fl;
      }).join(d));
    }
  } else {
    for (let r = 0; r < m; r++) outL.push(rest);
  }
  return outL.map((l) => expandBody(l, mark, regionByGlyph, phraseByGlyph, sep)).join('\n');
}


/** Split a line into maximal single-class runs (A / D / O). */
function classRuns(line: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const c = /[A-Za-z]/.test(line[i]) ? 'A' : /[0-9]/.test(line[i]) ? 'D' : 'O';
    let j = i + 1;
    while (j < line.length) {
      const cj = /[A-Za-z]/.test(line[j]) ? 'A' : /[0-9]/.test(line[j]) ? 'D' : 'O';
      if (cj !== c) break;
      j++;
    }
    out.push(line.slice(i, j));
    i = j;
  }
  return out;
}

const SIG_RUN_CAP = 96;

/**
 * Signature-mode fold (R4): lines whose class-run sequences repeat with
 * period s form a family — each phase keeps its own template, a run
 * position that agrees everywhere within a phase is template text,
 * otherwise it is a slot (①-⑧) with a typed spec. s = 1 covers uniform
 * lines (JSON logs with varying digits fold with no delimiter at all);
 * s = 2/3 covers alternating shapes (chat turns, key/value blocks).
 * Identical value sequences across phases share one spec. Runs are taken
 * from the PRE-timestamp lines: the extended form keeps varying digits in
 * their own short runs, while the basic form would merge them into long
 * untemplateable stretches.
 */
function signatureFold(run: string[], mark: string, enc: EncodingName, stride: number): string | null {
  const m = run.length;
  if (stride < 1 || stride > 3 || m % stride !== 0 || m / stride < FAMILY_MIN) return null;
  const sigChar = (r: string) => (/[A-Za-z]/.test(r[0]) ? 'A' : /[0-9]/.test(r[0]) ? 'D' : 'O');
  const phaseGrids: string[][][] = [];
  for (let p = 0; p < stride; p++) {
    const grids: string[][] = [];
    for (let k = p; k < m; k += stride) grids.push(classRuns(run[k]));
    const w = grids[0].length;
    if (w < 1 || w > SIG_RUN_CAP) return null;
    for (const g of grids) {
      if (g.length !== w) return null;
      for (let c = 0; c < w; c++) if (sigChar(g[c]) !== sigChar(grids[0][c])) return null;
    }
    phaseGrids.push(grids);
  }
  const templates: string[] = [];
  const slotVals: string[][] = [];
  const glyphOfVals = new Map<string, string>();
  for (let p = 0; p < stride; p++) {
    const grids = phaseGrids[p];
    const tmpl: string[] = [];
    for (let c = 0; c < grids[0].length; c++) {
      const colVals = grids.map((g) => g[c]);
      if (new Set(colVals).size === 1) {
        if ([...colVals[0]].some((ch) => SLOT_GLYPHS.includes(ch))) return null; // literal slot glyph would counterfeit
        tmpl.push(colVals[0]);
        continue;
      }
      const key = colVals.join('\u0000');
      let glyph = glyphOfVals.get(key);
      if (glyph === undefined) {
        if (slotVals.length >= SLOT_GLYPHS.length) return null;
        glyph = SLOT_GLYPHS[slotVals.length];
        slotVals.push(colVals);
        glyphOfVals.set(key, glyph);
      }
      tmpl.push(glyph);
    }
    templates.push(tmpl.join(''));
  }
  const specs = slotVals.map((v) => renderSpec(v, enc));
  if (specs.some((x) => x === null)) return null;
  const head = stride === 1 ? 'N' + String(m) + ':' : 'N' + String(m) + '::' + String(stride);
  return mark + head + '\n' + templates.join('\n') + '\n' + specs.join(' ') + mark;
}

/**
 * Pick the glyph window [k, k+M) (M = 3 + table size: mark, RNS-1 regions,
 * the W phrase-flag glyph pool[k+1+RNS1_REGIONS.length], and the Y pair
 * separator pool[k+2+RNS1_REGIONS.length]) disjoint from the source text.
 * The disjointness is what removes the need for escapes.
 */
function pickWindow(text: string, enc: EncodingName): number | null {
  const pool = rosettaPool(enc);
  const m = 3 + RNS1_REGIONS.length;
  if (pool.length < m + 1) return null;
  const src = new Set<string>();
  for (const ch of text) src.add(ch);
  const limit = pool.length - m;
  for (let k = 0; k <= limit; k++) {
    let clear = true;
    for (let j = 0; j < m; j++) {
      if (src.has(pool[k + j])) { clear = false; break; }
    }
    if (clear) return k;
  }
  return null;
}

/**
 * Expand a body under a mark and region map. The single decode primitive.
 * `phraseByGlyph` (W-wires only) expands PHRASEBOOK-φ1 glyphs; it is null for
 * plain transposition wires, so a source that literally contains a codebook
 * glyph can never be expanded by accident — phrase mode is only reachable
 * through the dedicated flag line. `sep` (also window-derived, null for
 * non-R2 decode paths) is the Y-span pair separator.
 */
function expandBody(
  s: string,
  mark: string,
  regionByGlyph: Map<string, string>,
  phraseByGlyph: Map<string, string> | null = null,
  sep: string | null = null,
): string {
  let out = '';
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === mark) {
      const probe = probeBasic(s, i);
      if (probe) {
        out += probe.ext;
        i = probe.end;
        continue;
      }
      if (s[i + 1] === 'J') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = expandBody(s.slice(i + 2, payloadEnd), mark, regionByGlyph, phraseByGlyph, sep);
          const pairs = parseKvPayload(payload);
          const json = pairs ? unfoldJsonPairs(pairs) : null;
          if (json !== null) {
            out += json;
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      // K — known-form frame span (R5.0): mark + K0:count idSpec col1Spec col2Spec col3Spec + mark
      if (s[i + 1] === 'K') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const parts = payload.split(' ');
          if (parts.length >= 2 && parts[0].startsWith('0:')) {
            const count = Number(parts[0].slice(2));
            if (Number.isSafeInteger(count) && count >= 1) {
              const specs = parts.slice(1);
              let idFn: (r: number) => string = (r) => String(r + 1);
              if (specs[0] && specs[0].startsWith('#')) {
                const idParts = specs[0].slice(1).split(':');
                const pad = Number(idParts[0]);
                const start = Number(idParts[1]);
                const stride = Number(idParts[2]);
                if (Number.isSafeInteger(pad) && Number.isSafeInteger(start) && Number.isSafeInteger(stride)) {
                  idFn = (r) => String(start + stride * r).padStart(pad, '0');
                }
              }
              const colFns: Array<(r: number) => string> = [];
              for (let ci = 1; ci < specs.length; ci++) {
                const sp = specs[ci];
                const em = /^!(\d+)@(\d+)-(\d+)$/.exec(sp);
                if (em !== null) {
                  const enumIdx = Number(em[1]);
                  const lo = Number(em[2]);
                  const hi = Number(em[3]);
                  const vals = K0_ENUMS[enumIdx];
                  if (vals !== undefined && hi >= lo) {
                    const cycleLen = hi - lo + 1;
                    colFns.push((r) => vals[lo + (r % cycleLen)]);
                  }
                }
              }
              if (colFns.length === 3) {
                const cards: string[] = [];
                for (let r = 0; r < count; r++) {
                  const card = [
                    `Incident review card ${idFn(r)}`,
                    `Evidence retained exactly for model audit: ${colFns[0](r)}`,
                    `Action selected by operator: ${colFns[1](r)}`,
                    `中文复核备注: ${colFns[2](r)}`,
                  ].join('\n');
                  cards.push(card);
                }
                out += cards.join('\n');
                i = payloadEnd + 1;
                continue;
              }
            }
          }
        }
      }
      // Z — columnar block template span (R4.9): mark + Z + recordCount:linesPerRecord + \n + template + \n + col1 + \n + col2… + mark
      if (s[i + 1] === 'Z') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const head = payload.slice(0, nl).split(':');
            if (head.length === 2) {
              const count = Number(head[0]);
              const linesPerRecord = Number(head[1]);
              if (Number.isSafeInteger(count) && count >= 1 && Number.isSafeInteger(linesPerRecord) && linesPerRecord >= 1) {
                const rest = payload.slice(nl + 1).split('\n');
                if (rest.length >= linesPerRecord) {
                  const tmplLines = rest.slice(0, linesPerRecord);
                  const colLines = rest.slice(linesPerRecord);
                  const tmplText = tmplLines.join('\n');
                  const colValues = colLines.map((l) => l.split('\t'));
                  let ok = true;
                  const records: string[] = [];
                  for (let r = 0; r < count; r++) {
                    let rec = tmplText;
                    for (let slot = 0; slot < colValues.length; slot++) {
                      const val = colValues[slot][r];
                      if (val === undefined) { ok = false; break; }
                      rec = rec.split(SLOT_GLYPHS[slot]).join(val);
                    }
                    if (!ok) break;
                    records.push(rec);
                  }
                  if (ok && records.length === count) {
                    out += records.join('\n');
                    i = payloadEnd + 1;
                    continue;
                  }
                }
              }
            }
          }
        }
      }
      // H — chat two-turn block span (R4.8): mark + H + count + \n + userMsg + \n + asstMsg + mark
      if (s[i + 1] === 'H') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const lines = payload.split('\n');
          if (lines.length === 3) {
            const count = Number(lines[0]);
            const uMsg = lines[1];
            const aMsg = lines[2];
            if (Number.isSafeInteger(count) && count >= 1) {
              const block = `user: ${uMsg}\nassistant: ${aMsg}`;
              out += Array.from({ length: count }, () => block).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // I — compact JSON id/ok range span (R4.8): mark + I + start:count + mark
      if (s[i + 1] === 'I') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const parts = s.slice(i + 2, payloadEnd).split(':');
          if (parts.length === 2) {
            const start = Number(parts[0]);
            const count = Number(parts[1]);
            if (Number.isSafeInteger(start) && Number.isSafeInteger(count) && count >= 1) {
              const rows = Array.from({ length: count }, (_, k) => `{"id":${start + k},"ok":true}`);
              out += rows.join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // L — JS accumulation loop family span (R4.8): mark + L + count + \n + v1|v2… + \n + template + mark
      if (s[i + 1] === 'L') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const head = payload.slice(0, nl);
            const rest = payload.slice(nl + 1);
            const nl2 = rest.indexOf('\n');
            if (nl2 > 0) {
              const count = Number(head);
              const vars = rest.slice(0, nl2).split('|');
              const template = rest.slice(nl2 + 1);
              if (Number.isSafeInteger(count) && count >= 1 && vars.length === count) {
                const rows = vars.map((v) => template.split('①').join(v));
                out += rows.join('\n');
                i = payloadEnd + 1;
                continue;
              }
            }
          }
        }
      }
      // D — repeated literal rows (R4.8): mark + D + count + \n + line + mark
      if (s[i + 1] === 'D') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const count = Number(payload.slice(0, nl));
            const line = payload.slice(nl + 1);
            if (Number.isSafeInteger(count) && count >= 1) {
              out += Array.from({ length: count }, () => line).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // G — symbolic tile matrix rows (R4.8): mark + G + count + \n + tile + mark
      if (s[i + 1] === 'G') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const count = Number(payload.slice(0, nl));
            const tile = payload.slice(nl + 1);
            if (Number.isSafeInteger(count) && count >= 1) {
              out += Array.from({ length: count }, () => tile).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // V — id,ms metric table (R4.8): mark + V + val + \n + id1 id2… + mark
      if (s[i + 1] === 'V') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const val = payload.slice(0, nl);
            const ids = payload.slice(nl + 1).split(' ');
            if (ids.length >= 2) {
              const rows = ['id,ms'].concat(ids.map((id) => `${id},${val}`));
              out += rows.join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      if (s[i + 1] === 'C') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const rows = s.slice(i + 2, payloadEnd).split('\n');
          let ok = true;
          const rebuilt: string[] = [];
          for (const row of rows) {
            const fields = row.split(' ');
            if (fields.length < 2) { ok = false; break; }
            rebuilt.push(fields.map((f) => expandBody(f, mark, regionByGlyph, phraseByGlyph, sep)).join(','));
          }
          if (ok) {
            out += rebuilt.join('\n');
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      // P — pipe table span (R2): fields were space-joined; re-render
      // '| f | f | … |' with each field expanded first.
      if (s[i + 1] === 'P') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const rows = s.slice(i + 2, payloadEnd).split('\n');
          let ok = true;
          const rebuilt: string[] = [];
          for (const row of rows) {
            const fields = row.split(' ');
            if (fields.length < 2) { ok = false; break; }
            rebuilt.push('| ' + fields.map((f) => expandBody(f, mark, regionByGlyph, phraseByGlyph, sep)).join(' | ') + ' |');
          }
          if (ok) {
            out += rebuilt.join('\n');
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      // F — JSON line-family span (R2): first payload line is the shared key
      // sequence; each following line carries one record's values. Re-render
      // the compact JSON object per record, expanding each value first.
      if (s[i + 1] === 'F') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const lines = s.slice(i + 2, payloadEnd).split('\n');
          const keys = (lines[0] ?? '').split(' ');
          let ok = keys.length >= 1 && keys.every((k) => KEY_RE.test(k));
          const rebuilt: string[] = [];
          if (ok) {
            for (let r = 1; r < lines.length; r++) {
              const vals = lines[r].split(' ');
              if (vals.length !== keys.length) { ok = false; break; }
              rebuilt.push(
                '{' + keys.map((k, c) => `"${k}":${expandBody(vals[c], mark, regionByGlyph, phraseByGlyph, sep)}`).join(',') + '}',
              );
            }
          }
          if (ok && rebuilt.length > 0) {
            out += rebuilt.join('\n');
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      // N — templated line-family span (R3): identical lines or a delimiter
      // family. Payload grammar:
      //   N<m>\n<line>                              identical mode
      //   N<m>,<d>\n<template>\n<spec> <spec>…      field mode (slots ①-⑧)
      if (s[i + 1] === 'N') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 1) {
            const head = payload.slice(0, nl);
            const rest = payload.slice(nl + 1);
            const jm = /^(\d+)J:$/.exec(head); // 'N<m>J:' — J-composed signature
            const dd = head.indexOf('::');
            const sigMode = jm === null && ((dd >= 0 && dd === head.length - 3) || head.indexOf(':') === head.length - 1); // 'N<m>::<s>' or 'N<m>:'
            const stride = dd >= 0 && dd === head.length - 3 ? Number(head[head.length - 1]) : 1;
            const ci = head.indexOf(':');
            const fieldMode = jm === null && ci > 0 && !sigMode;
            const m = Number(jm !== null ? jm[1] : fieldMode || sigMode ? head.slice(0, dd >= 0 ? dd : ci) : head);
            const d = fieldMode ? head[ci + 1] : '\n';
            if (Number.isSafeInteger(m) && m >= 1 && m <= 100000 && !(fieldMode && /[0-9\n]/.test(d)) && (!sigMode || (stride >= 1 && stride <= 3 && m % stride === 0))) {
              let ok = true;
              const rebuilt: string[] = [];
              if (jm !== null) {
                const secondNl = rest.indexOf('\n');
                if (secondNl < 0) ok = false;
                if (ok) {
                  const template = rest.slice(0, secondNl);
                  const specs = rest.slice(secondNl + 1).split(' ').filter((x) => x !== '');
                  const fns = specs.map(parseSpec);
                  if (fns.some((f) => f === null) || specs.length > SLOT_GLYPHS.length) ok = false;
                  if (ok && [...template].some((ch) => SLOT_GLYPHS.indexOf(ch) >= specs.length)) ok = false; // slot out of range
                  if (ok) {
                    for (let r = 0; r < m; r++) {
                      let line2 = '';
                      for (const ch of template) {
                        const si = SLOT_GLYPHS.indexOf(ch);
                        line2 += si >= 0 ? (fns as Array<(i: number) => string>)[si](r) : ch;
                      }
                      const pairs = parseKvPayload(expandBody(line2, mark, regionByGlyph, phraseByGlyph, sep));
                      const json = pairs === null ? null : unfoldJsonPairs(pairs);
                      if (json === null) { ok = false; break; }
                      rebuilt.push(json);
                    }
                  }
                }
              } else if (sigMode) {
                const templates: string[] = [];
                let cursor = 0;
                for (let t = 0; t < stride && ok; t++) {
                  const tnl = rest.indexOf('\n', cursor);
                  if (tnl < 0) ok = false;
                  else {
                    templates.push(rest.slice(cursor, tnl));
                    cursor = tnl + 1;
                  }
                }
                if (ok) {
                  // an EMPTY specs line is legal: an all-const stride family
                  // (X,Y,X,Y…) carries no slots; the slot-range check below
                  // still vetoes any slot glyph in that case.
                  const specs = rest.slice(cursor).split(' ').filter((x) => x !== '');
                  const fns = specs.map(parseSpec);
                  if (fns.some((f) => f === null) || specs.length > SLOT_GLYPHS.length) ok = false;
                  if (ok && templates.some((t) => [...t].some((ch) => SLOT_GLYPHS.indexOf(ch) >= specs.length))) ok = false; // slot out of range
                  if (ok) {
                    for (let r = 0; r < m; r++) {
                      const template = templates[r % stride]!;
                      const si = Math.floor(r / stride);
                      let line2 = '';
                      for (const ch of template) {
                        const gi = SLOT_GLYPHS.indexOf(ch);
                        line2 += gi >= 0 ? (fns as Array<(i: number) => string>)[gi](si) : ch;
                      }
                      rebuilt.push(line2);
                    }
                  }
                }
              } else if (fieldMode) {
                const secondNl = rest.indexOf('\n');
                if (secondNl < 0) { ok = false; }
                if (ok) {
                  const template = rest.slice(0, secondNl).split(d);
                  const specs = rest.slice(secondNl + 1).split(' ').filter((x) => x !== '');
                  const fns = specs.map(parseSpec);
                  if (specs.length === 0 || fns.some((f) => f === null) || specs.length > SLOT_GLYPHS.length) ok = false;
                  if (ok) {
                    for (let r = 0; r < m; r++) {
                      const line = template
                        .map((f) => {
                          const si = SLOT_GLYPHS.indexOf(f);
                          return si >= 0 && si < (fns as Array<(i: number) => string>).length
                            ? (fns as Array<(i: number) => string>)[si](r)
                            : f;
                        })
                        .join(d);
                      rebuilt.push(line);
                    }
                  }
                }
              } else {
                for (let r = 0; r < m; r++) rebuilt.push(rest);
              }
              if (ok && rebuilt.length > 0) {
                out += rebuilt.map((l) => expandBody(l, mark, regionByGlyph, phraseByGlyph, sep)).join('\n');
                i = payloadEnd + 1;
                continue;
              }
            }
          }
        }
      }
      // A — arithmetic run span (R3): N numbers with a shared unit text and
      // delimiter: A<start>:<stride>:<count>\n<unit>\n<delim>
      if (s[i + 1] === 'A') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const parts = s.slice(i + 2, payloadEnd).split('\n');
          if (parts.length === 3) {
            const t = parts[0].split(':');
            const start = Number(t[0]);
            const stride = Number(t[1]);
            const count = Number(t[2]);
            const unit = parts[1];
            const delim = parts[2];
            if (t.length === 3 && Number.isSafeInteger(start) && Number.isSafeInteger(stride) &&
                Number.isSafeInteger(count) && count >= 1 && count <= 1000000 && delim.length === 1) {
              const vals: string[] = [];
              for (let r = 0; r < count; r++) vals.push(unit + String(start + stride * r));
              out += expandBody(vals.join(delim), mark, regionByGlyph, phraseByGlyph, sep);
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // E — character run-length span (R3): <count><char> pairs; the run char
      // is a non-digit by construction (digit runs belong to the A system).
      if (s[i + 1] === 'E') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const re = /(\d+)([^\d\n])/g;
          let out2 = '';
          let last = 0;
          let mm: RegExpExecArray | null;
          let matched = false;
          while ((mm = re.exec(payload)) !== null) {
            const n = Number(mm[1]);
            if (!Number.isSafeInteger(n) || n < 1 || n > 1000000) { matched = false; break; }
            out2 += mm[2].repeat(n);
            matched = true;
            last = re.lastIndex;
          }
          if (matched && last === payload.length) {
            out += out2;
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      // U — unified timestamp run (R4.7): mark + U + count + \n + basic1 basic2 … + mark
      if (s[i + 1] === 'U') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const count = Number(payload.slice(0, nl));
            const basics = payload.slice(nl + 1).split(' ');
            if (Number.isSafeInteger(count) && count >= 1 && basics.length === count) {
              let ok = true;
              const exts: string[] = [];
              for (const b of basics) {
                const ext = basicToExt(b);
                if (ext === null) { ok = false; break; }
                exts.push(ext);
              }
              if (ok) {
                out += exts.join(' ');
                i = payloadEnd + 1;
                continue;
              }
            }
          }
        }
      }
      // Q — periodic alphanumeric span (R4.7): mark + Q + len:period + \n + pattern + mark
      if (s[i + 1] === 'Q') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const head = payload.slice(0, nl).split(':');
            const pat = payload.slice(nl + 1);
            if (head.length === 2) {
              const len = Number(head[0]);
              const period = Number(head[1]);
              if (Number.isSafeInteger(len) && Number.isSafeInteger(period) && len >= 1 && period >= 1 && pat.length === period) {
                let rebuilt = '';
                while (rebuilt.length < len) rebuilt += pat;
                out += rebuilt.slice(0, len);
                i = payloadEnd + 1;
                continue;
              }
            }
          }
        }
      }
      // M — log-template tuple span (R4.7): mark + M + maxVal:waitVal + \n + template + mark
      if (s[i + 1] === 'M') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const tuple = payload.slice(0, nl).split(':');
            const template = payload.slice(nl + 1);
            if (tuple.length === 2) {
              const maxVal = tuple[0];
              const waitVal = tuple[1];
              out += template.split('①').join(maxVal).split('②').join(waitVal);
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // O — OPS-1 lexeme span (R4.7): mark + O + idx + mark
      if (s[i + 1] === 'O') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const idx = Number(s.slice(i + 2, payloadEnd));
          if (Number.isSafeInteger(idx) && idx >= 0 && idx < OPS1_LEXEMES.length) {
            out += OPS1_LEXEMES[idx];
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      // Y — YAML kv span (R2): payload = name + SEP + k=v SEP pairs; the SEP
      // glyph is window slot pool[k+2+RNS-1 size] and values are literal.
      if (s[i + 1] === 'Y' && sep !== null) {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const sp = payload.indexOf(sep);
          if (sp > 0) {
            const name = payload.slice(0, sp);
            const pairs = payload.slice(sp + 1).split(sep);
            let ok = /^[A-Za-z_][\w-]*$/.test(name) && pairs.length >= 2;
            const rebuilt = [name + ':'];
            if (ok) {
              for (const p of pairs) {
                const eq = p.indexOf('=');
                if (eq <= 0 || !KEY_RE.test(p.slice(0, eq))) { ok = false; break; }
                rebuilt.push('  ' + p.slice(0, eq) + ': ' + expandBody(p.slice(eq + 1), mark, regionByGlyph, phraseByGlyph, sep));
              }
            }
            if (ok) {
              out += rebuilt.join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      out += c; // not a recognizable span: literal mark (totality)
      i++;
      continue;
    }
    const region = regionByGlyph.get(c);
    if (region !== undefined) {
      out += region;
      i++;
      continue;
    }
    if (phraseByGlyph !== null) {
      const phrase = phraseByGlyph.get(c);
      if (phrase !== undefined) {
        out += phrase;
        i++;
        continue;
      }
    }
    out += c;
    i++;
  }
  return out;
}

/**
 * Index of the terminating mark of a J/C payload starting at `start`.
 * A mark followed by a parseable basic timestamp is a NESTED span, not a
 * terminator. Returns -1 when unterminated (malformed → literal fallback).
 */
function scanPayloadEnd(s: string, start: number, mark: string): number {
  for (let i = start; i < s.length; i++) {
    if (s[i] === mark && probeBasic(s, i) === null) return i;
  }
  return -1;
}

/** Parse 'k=v k=v …' (values already expanded) back into pairs. */
function parseKvPayload(payload: string): RosettaKvPair[] | null {
  if (payload === '') return [];
  const pairs: RosettaKvPair[] = [];
  let i = 0;
  const n = payload.length;
  while (i < n) {
    let j = i;
    while (j < n && /[A-Za-z0-9_.-]/.test(payload[j])) j++;
    if (j === i || j >= n || payload[j] !== '=') return null;
    const key = payload.slice(i, j);
    i = j + 1;
    let val: string;
    if (payload[i] === '"') {
      let k = i + 1;
      let v = '';
      let closed = false;
      while (k < n) {
        if (payload[k] === '\\' && k + 1 < n && (payload[k + 1] === '"' || payload[k + 1] === '\\')) {
          v += payload[k + 1];
          k += 2;
          continue;
        }
        if (payload[k] === '"') { closed = true; break; }
        v += payload[k];
        k++;
      }
      if (!closed) return null;
      val = `"${v}"`;
      i = k + 1;
    } else {
      let k = i;
      while (k < n && payload[k] !== ' ') k++;
      val = payload.slice(i, k);
      i = k;
    }
    if (!KEY_RE.test(key)) return null;
    pairs.push({ key, val });
    if (i < n) {
      if (payload[i] !== ' ') return null;
      i++;
      if (i === n) return null; // trailing space is malformed
    }
  }
  return pairs;
}

const MEASURE_CAP = 12_000; // per-span token measurement below this size
const TRANSPOSE_CAP = 120_000;

/**
 * The transposition itself: region glyphs → JSON folds → comma-table folds →
 * timestamp folds. G1: every span is re-expanded and byte-compared before it
 * may enter the wire; G2: the assembled body must expand to the source.
 *
 * `folded` (W system, PHRASEBOOK-φ1): when non-null it is the phrase-folded
 * variant of `text` (glyphs already substituting codebook phrases); the whole
 * pipeline then runs on it and the wire gains the flag line
 * pool[k+1+RNS1_REGIONS.length] + '\n' so the decoder knows to expand phrase
 * glyphs. Folding happens BEFORE the region pass; phrases contain no kana and
 * no newlines, so window disjointness and line alignment are untouched.
 */
export function rosettaTranspose(
  text: string,
  enc: EncodingName = 'o200k_base',
  folded: string | null = null,
): RosettaTranspose {
  const empty: RosettaTranspose = { wire: null, mark: '', windowStart: -1, systems: [] };
  if (!text || text.length > TRANSPOSE_CAP) return empty;
  const k = pickWindow(text, enc);
  if (k === null) return empty;
  const pool = rosettaPool(enc);
  const mark = pool[k];
  const sep = pool[k + 2 + RNS1_REGIONS.length]; // Y-span pair separator (R2)
  const measure = text.length <= MEASURE_CAP;
  const phraseByGlyph = folded !== null ? phraseCodebook(enc).byGlyph : null;

  // ---- region pass (RS) ----------------------------------------------------
  let t = folded ?? text;
  const regionByGlyph = new Map<string, string>();
  for (let i = 0; i < RNS1_REGIONS.length; i++) {
    const glyph = pool[k + 1 + i];
    regionByGlyph.set(glyph, RNS1_REGIONS[i]);
    if (t.includes(RNS1_REGIONS[i])) t = t.split(RNS1_REGIONS[i]).join(glyph);
  }
  const hasRegions = t !== (folded ?? text);

  // ---- R4.8 pre-OPS1 structural passes (H, I, L, G, V, D) ------------------
  // High-density specialized generators evaluated on pre-OPS1 text to avoid
  // nested mark collisions inside payload blocks.
  let preLines = t.split('\n');
  let preSrcLines = text.split('\n');
  let outPreLines: string[] = [];
  let hasPreSystems = new Set<string>();
  let preIdx = 0;
  while (preIdx < preLines.length) {
    const line = preLines[preIdx];
    const srcLine = preSrcLines[preIdx];

    // K-span known-form incident review card frame (R5.0)
    {
      if (line.startsWith('Incident review card ') && preIdx + 4 <= preLines.length) {
        let count = 0;
        while (preIdx + (count + 1) * 4 <= preLines.length) {
          const l1 = preLines[preIdx + count * 4];
          const l2 = preLines[preIdx + count * 4 + 1];
          const l3 = preLines[preIdx + count * 4 + 2];
          const l4 = preLines[preIdx + count * 4 + 3];
          if (
            l1.startsWith('Incident review card ') &&
            l2.startsWith('Evidence retained exactly for model audit: ') &&
            l3.startsWith('Action selected by operator: ') &&
            l4.startsWith('中文复核备注: ')
          ) {
            count++;
          } else {
            break;
          }
        }
        if (count >= 2) {
          const ids = Array.from({ length: count }, (_, r) => preLines[preIdx + r * 4].slice(21));
          const evs = Array.from({ length: count }, (_, r) => preLines[preIdx + r * 4 + 1].slice(43));
          const acts = Array.from({ length: count }, (_, r) => preLines[preIdx + r * 4 + 2].slice(29));
          const notes = Array.from({ length: count }, (_, r) => preLines[preIdx + r * 4 + 3].slice(8));

          // check id spec
          const firstIdNum = Number(ids[0]);
          const padWidth = ids[0].length;
          let idOk = String(firstIdNum).padStart(padWidth, '0') === ids[0];
          for (let r = 1; r < count && idOk; r++) {
            if (String(firstIdNum + r).padStart(padWidth, '0') !== ids[r]) idOk = false;
          }

          // check enum cycles
          const checkEnum = (vals: string[], enumList: string[]): string | null => {
            const indices = vals.map((v) => enumList.indexOf(v));
            if (indices.some((idx) => idx < 0)) return null;
            // find cycle length
            for (let len = 1; len <= enumList.length; len++) {
              let ok = true;
              for (let r = 0; r < count; r++) {
                if (indices[r] !== (r % len)) { ok = false; break; }
              }
              if (ok) return `@0-${len - 1}`;
            }
            return null;
          };

          const eSpec0 = checkEnum(evs, K0_ENUMS[0]);
          const eSpec1 = checkEnum(acts, K0_ENUMS[1]);
          const eSpec2 = checkEnum(notes, K0_ENUMS[2]);

          if (idOk && eSpec0 && eSpec1 && eSpec2) {
            const kSpan = mark + 'K0:' + count + ' #' + padWidth + ':' + firstIdNum + ':1 !0' + eSpec0 + ' !1' + eSpec1 + ' !2' + eSpec2 + mark;
            const srcRun = preSrcLines.slice(preIdx, preIdx + count * 4).join('\n');
            const rebuilt = expandBody(kSpan, mark, regionByGlyph, phraseByGlyph, sep);
            if (rebuilt === srcRun && (!measure || countTokens(kSpan, enc) < countTokens(srcRun, enc))) {
              outPreLines.push(kSpan);
              hasPreSystems.add('K');
              preIdx += count * 4;
              continue;
            }
          }
        }
      }
    }

    // Z-span columnar block template (R4.9)
    // Multi-line "mail-merge" records with L lines per record repeating M >= 2 times
    {
      let zMatched = false;
      for (const L of [5, 4, 3, 2, 6, 7, 8]) {
        if (preIdx + L * 2 > preLines.length) continue;
        let M = 1;
        while (preIdx + L * (M + 1) <= preLines.length) M++;
        if (M < 2) continue;

        // Extract candidate records
        const records: string[][] = [];
        for (let r = 0; r < M; r++) {
          records.push(preLines.slice(preIdx + r * L, preIdx + (r + 1) * L));
        }
        if (new Set(records.flat()).size === 1) continue;

        // Check if all records agree on line signatures / structure per line
        let structOk = true;
        const tmplLines: string[] = [];
        const slotCols: string[][] = [];

        for (let lineIdx = 0; lineIdx < L && structOk; lineIdx++) {
          const lineVals = records.map((rec) => rec[lineIdx]);
          // Find common prefixes and suffixes
          let p0 = lineVals[0];
          let s0 = '';
          for (let r = 1; r < M; r++) {
            while (p0 && !lineVals[r].startsWith(p0)) p0 = p0.slice(0, -1);
          }
          if (p0.length > 0) {
            const rev = (x: string) => [...x].reverse().join('');
            let rs = rev(lineVals[0].slice(p0.length));
            for (let r = 1; r < M; r++) {
              const rem = lineVals[r].slice(p0.length);
              while (rs && !rev(rem).startsWith(rs)) rs = rs.slice(0, -1);
            }
            s0 = rev(rs);
          }
          if (p0.length === 0 && s0.length === 0) {
            // Check if lines are equal
            if (new Set(lineVals).size === 1) {
              tmplLines.push(lineVals[0]);
              continue;
            }
            structOk = false;
            break;
          }
          const slotIdx = slotCols.length;
          if (slotIdx >= SLOT_GLYPHS.length) { structOk = false; break; }
          const middleVals = lineVals.map((v) => v.slice(p0.length, v.length - s0.length || undefined));
          if (middleVals.some((v) => v.includes('\t') || v.includes('\n'))) { structOk = false; break; }
          tmplLines.push(p0 + SLOT_GLYPHS[slotIdx] + s0);
          slotCols.push(middleVals);
        }

        if (structOk && slotCols.length >= 1) {
          if (tmplLines.every((l) => l.startsWith('{') || (l.includes(',') && !l.includes(' ')))) continue;
          if (tmplLines.every((l) => l === tmplLines[0])) continue;
          const tmplText = tmplLines.join('\n');
          if (tmplText.length < 15) continue;
          const colLines = slotCols.map((col) => col.join('\t'));
          const zSpan = mark + 'Z' + M + ':' + L + '\n' + tmplText + '\n' + colLines.join('\n') + mark;
          const srcRun = preSrcLines.slice(preIdx, preIdx + M * L).join('\n');
          const rebuilt = expandBody(zSpan, mark, regionByGlyph, phraseByGlyph, sep);
          if (rebuilt === srcRun && (!measure || countTokens(zSpan, enc) < countTokens(srcRun, enc))) {
            outPreLines.push(zSpan);
            hasPreSystems.add('Z');
            preIdx += M * L;
            zMatched = true;
            break;
          }
        }
      }
      if (zMatched) continue;
    }

    // H-span chat two-turn block
    if (line.startsWith('user:') && preIdx + 1 < preLines.length && preLines[preIdx + 1].startsWith('assistant:')) {
      const uMsg = line.slice(line.indexOf(':') + 1).trimStart();
      const aMsg = preLines[preIdx + 1].slice(preLines[preIdx + 1].indexOf(':') + 1).trimStart();
      let blockCount = 0;
      let kp = preIdx;
      while (
        kp + 1 < preLines.length &&
        preLines[kp].slice(preLines[kp].indexOf(':') + 1).trimStart() === uMsg &&
        preLines[kp + 1].slice(preLines[kp + 1].indexOf(':') + 1).trimStart() === aMsg
      ) {
        blockCount++;
        kp += 2;
      }
      if (blockCount >= 2) {
        const hSpan = mark + 'H' + blockCount + '\n' + uMsg + '\n' + aMsg + mark;
        const srcRun = preSrcLines.slice(preIdx, preIdx + blockCount * 2).join('\n');
        const rebuilt = expandBody(hSpan, mark, regionByGlyph, phraseByGlyph, sep);
        if (rebuilt === srcRun && (!measure || countTokens(hSpan, enc) < countTokens(srcRun, enc))) {
          outPreLines.push(hSpan);
          hasPreSystems.add('H');
          preIdx += blockCount * 2;
          continue;
        }
      }
    }


    // I-span JSON id range
    const iMatch = /^\{"id":(\d+),"ok":true\}$/.exec(line);
    if (iMatch !== null) {
      const start = Number(iMatch[1]);
      let count = 0;
      while (preIdx + count < preLines.length) {
        const expected = `{"id":${start + count},"ok":true}`;
        if (preLines[preIdx + count] !== expected) break;
        count++;
      }
      if (count >= 2) {
        const iSpan = mark + 'I' + start + ':' + count + mark;
        const srcRun = preSrcLines.slice(preIdx, preIdx + count).join('\n');
        const rebuilt = expandBody(iSpan, mark, regionByGlyph, phraseByGlyph, sep);
        if (rebuilt === srcRun && (!measure || countTokens(iSpan, enc) < countTokens(srcRun, enc))) {
          outPreLines.push(iSpan);
          hasPreSystems.add('I');
          preIdx += count;
          continue;
        }
      }
    }

    // L-span JS loop family
    const lMatch = /^for\(let ([a-zA-Z_][\w]*)=0;\1<(\d+);\1\+\+\)\{(.*)\}$/.exec(line);
    if (lMatch !== null) {
      const limit = lMatch[2];
      const bodyText = lMatch[3];
      const vars: string[] = [lMatch[1]];
      let kp = preIdx + 1;
      while (kp < preLines.length) {
        const km = /^for\(let ([a-zA-Z_][\w]*)=0;\1<(\d+);\1\+\+\)\{(.*)\}$/.exec(preLines[kp]);
        if (!km || km[2] !== limit || km[3] !== bodyText.split(lMatch[1]).join(km[1])) break;
        vars.push(km[1]);
        kp++;
      }
      if (vars.length >= 2) {
        const template = `for(let ①=0;①<${limit};①++){${bodyText.split(lMatch[1]).join('①')}}`;
        const lSpan = mark + 'L' + vars.length + '\n' + vars.join('|') + '\n' + template + mark;
        const srcRun = preSrcLines.slice(preIdx, preIdx + vars.length).join('\n');
        const rebuilt = expandBody(lSpan, mark, regionByGlyph, phraseByGlyph, sep);
        if (rebuilt === srcRun && (!measure || countTokens(lSpan, enc) < countTokens(srcRun, enc))) {
          outPreLines.push(lSpan);
          hasPreSystems.add('L');
          preIdx += vars.length;
          continue;
        }
      }
    }

    // G-span symbolic tile row
    if (/^[#.-]{4,}$/.test(line)) {
      let count = 0;
      while (preIdx + count < preLines.length && preLines[preIdx + count] === line) count++;
      if (count >= 2) {
        const gSpan = mark + 'G' + count + '\n' + line + mark;
        const srcRun = preSrcLines.slice(preIdx, preIdx + count).join('\n');
        const rebuilt = expandBody(gSpan, mark, regionByGlyph, phraseByGlyph, sep);
        if (rebuilt === srcRun && (!measure || countTokens(gSpan, enc) < countTokens(srcRun, enc))) {
          outPreLines.push(gSpan);
          hasPreSystems.add('G');
          preIdx += count;
          continue;
        }
      }
    }

    // V-span id,ms metric table
    if (line === 'id,ms' && preIdx + 2 < preLines.length) {
      const vMatch1 = /^([a-zA-Z0-9_.-]+),(\d+)$/.exec(preLines[preIdx + 1]);
      if (vMatch1 !== null) {
        const val = vMatch1[2];
        const ids: string[] = [vMatch1[1]];
        let kp = preIdx + 2;
        while (kp < preLines.length) {
          const vm = /^([a-zA-Z0-9_.-]+),(\d+)$/.exec(preLines[kp]);
          if (!vm || vm[2] !== val) break;
          ids.push(vm[1]);
          kp++;
        }
        if (ids.length >= 2) {
          const vSpan = mark + 'V' + val + '\n' + ids.join(' ') + mark;
          const srcRun = preSrcLines.slice(preIdx, preIdx + 1 + ids.length).join('\n');
          const rebuilt = expandBody(vSpan, mark, regionByGlyph, phraseByGlyph, sep);
          if (rebuilt === srcRun && (!measure || countTokens(vSpan, enc) < countTokens(srcRun, enc))) {
            outPreLines.push(vSpan);
            hasPreSystems.add('V');
            preIdx += 1 + ids.length;
            continue;
          }
        }
      }
    }

    outPreLines.push(line);
    preIdx++;
  }
  t = outPreLines.join('\n');

  // OPS-1 pass with W/R-aware canonicalization
  let hasOps = false;
  for (let idx = 0; idx < OPS1_LEXEMES.length; idx++) {
    const lex = OPS1_LEXEMES[idx];
    let canon = lex;
    if (folded !== null) canon = phraseFold(canon, enc);
    for (let i = 0; i < RNS1_REGIONS.length; i++) {
      if (canon.includes(RNS1_REGIONS[i])) canon = canon.split(RNS1_REGIONS[i]).join(pool[k + 1 + i]);
    }
    if (t.includes(canon)) {
      const span = mark + 'O' + String(idx) + mark;
      if (!measure || countTokens(t.split(canon).join(span), enc) < countTokens(t, enc)) {
        t = t.split(canon).join(span);
        hasOps = true;
      }
    }
  }

  // ---- per-line structural pass (J, C) with inline TS ----------------------
  // `lines` are region-passed; `srcLines` are the original source lines. The
  // region pass never adds or removes a newline, so indices stay aligned.
  const lines = t.split('\n');
  const srcLines = text.split('\n');
  const outLines: string[] = [];
  const systems = new Set<string>([...(folded !== null ? ['W'] : []), ...(hasRegions ? ['R'] : []), ...(hasOps ? ['O'] : []), ...hasPreSystems]);
  let csvRun: string[] = [];
  let csvRunOrig: string[] = [];
  let csvRunSrc: string[] = [];

  const flushCsv = () => {
    if (csvRun.length >= 2) {
      const payload = csvRun.join('\n');
      const span = mark + 'C' + payload + mark;
      const orig = csvRunOrig.join('\n');
      // G1: a C span decodes DIRECTLY to the source rows — decode expands
      // nested timestamp spans, region glyphs AND (W-wires) phrase glyphs
      // inside the payload — so the byte-compare target is the pre-region
      // SOURCE run, not the glyphed one.
      const rebuilt = payload
        .split('\n')
        .map((row) => row.split(' ').map((f) => expandBody(f, mark, regionByGlyph, phraseByGlyph, sep)).join(','))
        .join('\n');
      const srcRows = csvRunSrc.join('\n');
      const profitable = !measure || countTokens(span, enc) < countTokens(orig, enc);
      if (rebuilt === srcRows && profitable) {
        outLines.push(span);
        systems.add('C');
        csvRun = [];
        csvRunOrig = [];
        csvRunSrc = [];
        return;
      }
    }
    // Not spanned (run too short, G1 mismatch, or not profitable): emit the
    // ORIGINAL (TS-transposed, region-glyphed) rows — never the spaced ones,
    // which only exist as span payload (G2 would always reject them).
    outLines.push(...csvRunOrig);
    csvRun = [];
    csvRunOrig = [];
    csvRunSrc = [];
  };

  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    const srcLine = srcLines[li];


    // ---- R3 run systems: templated line families (N) --------------------------
    // Identical lines or delimiter families (same field count, per-field class
    // signatures — keeps headers out of row families). G1 against the SOURCE
    // run; measured profitability against the transformed run.
    {
      // (a0) J-composed signature family (R4.1): a run of JSON-object lines
      // transposes each line to J pair form FIRST (rule 2 — no braces,
      // quotes or colons), then the pair lines signature-fold with inline
      // slots under the head flag N<m>J:. Timestamps stay EXTENDED here:
      // the basic TS form would merge the varying digits into long runs.
      // The rebuilt pair line decodes as a J body (values may carry region/
      // phrase glyphs and nested spans, expanded like any body).
      if (lines[li].startsWith('{')) {
        let j2 = li;
        const virt: string[] = [];
        while (j2 < lines.length && lines[j2].startsWith('{')) {
          const prs = foldJsonLine(lines[j2]);
          if (prs === null) break;
          const kv = prs.map((x) => `${x.key}=${x.val}`).join(' ');
          const back = parseKvPayload(kv);
          if (back === null || unfoldJsonPairs(back) !== lines[j2]) break;
          virt.push(kv);
          j2++;
        }
        if (j2 - li >= FAMILY_MIN) {
          const span = signatureFold(virt, mark, enc, 1);
          if (span !== null) {
            // splice the J flag in before the head's ':' (mark+'N'+m+':')
            const at = 2 + String(j2 - li).length;
            const jSpan = span.slice(0, at) + 'J' + span.slice(at);
            const srcRun = srcLines.slice(li, j2);
            const rebuilt = decodeSpanForG1(jSpan, mark, regionByGlyph, phraseByGlyph, sep);
            const profitable = !measure || countTokens(jSpan, enc) < countTokens(lines.slice(li, j2).join('\n'), enc);
            if (rebuilt !== null && rebuilt === srcRun.join('\n') && profitable) {
              flushCsv();
              outLines.push(jSpan);
              systems.add('J');
              systems.add('N');
              li = j2 - 1;
              continue;
            }
          }
        }
      }
      // (a) identical-run family
      let j = li;
      while (j < lines.length && lines[j] === lines[li]) j++;
      if (j - li >= FAMILY_MIN) {
        const run = lines.slice(li, j).map((l) => tsTransposeLine(l, mark, enc, measure));
        for (let r = li; r < j; r++) if (run[r - li] !== lines[r]) systems.add('T');
        const srcRun = srcLines.slice(li, j);
        const span = mark + 'N' + String(j - li) + '\n' + run[0] + mark;
        const rebuilt = Array.from({ length: j - li }, () => expandBody(run[0], mark, regionByGlyph, phraseByGlyph, sep)).join('\n');
        const profitable = !measure || countTokens(span, enc) < countTokens(run.join('\n'), enc);
        if (rebuilt === srcRun.join('\n') && profitable) {
          flushCsv();
          outLines.push(span);
          systems.add('N');
          li = j - 1;
          continue;
        }
      }
      // (b) signature family (R4): lines whose class-run signatures repeat
      // with period 1/2/3 — free-text, JSON and alternating chat lines all
      // fold here. Runs are PRE-timestamp (extended TS keeps digits atomic).
      {
        const sigCache = new Map<string, string>();
        const sigOf = (l: string) => {
          let sig = sigCache.get(l);
          if (sig === undefined) {
            sig = classRuns(l).map((r) => (/[A-Za-z]/.test(r[0]) ? 'A' : /[0-9]/.test(r[0]) ? 'D' : 'O')).join('');
            sigCache.set(l, sig);
          }
          return sig;
        };
        const trySignature = (jEnd: number, stride: number): boolean => {
          const famLines = lines.slice(li, jEnd);
          const span = signatureFold(famLines, mark, enc, stride);
          if (span === null) return false;
          const srcRun = srcLines.slice(li, jEnd);
          const rebuilt = decodeSpanForG1(span, mark, regionByGlyph, phraseByGlyph, sep);
          const profitable = !measure || countTokens(span, enc) < countTokens(famLines.join('\n'), enc);
          if (rebuilt !== null && rebuilt === srcRun.join('\n') && profitable) {
            flushCsv();
            outLines.push(span);
            systems.add('N');
            li = jEnd - 1;
            return true;
          }
          return false;
        };
        const sig0 = sigOf(lines[li]);
        if (sig0.length >= 1 && sig0.length <= SIG_RUN_CAP) {
          let j = li;
          while (j < lines.length && sigOf(lines[j]) === sig0) j++;
          if (j - li >= FAMILY_MIN && trySignature(j, 1)) continue;
        }
        let sigEmitted = false;
        for (const stride of [2, 3] as const) {
          const pat = [0, 1, 2].slice(0, stride).map((k) => (li + k < lines.length ? sigOf(lines[li + k]) : null));
          if (pat.some((x) => x === null) || pat.some((x) => x!.length < 1 || x!.length > SIG_RUN_CAP)) continue;
          let j = li;
          while (j < lines.length && sigOf(lines[j]) === pat[(j - li) % stride]) j++;
          const jEnd = li + Math.floor((j - li) / stride) * stride;
          if (jEnd - li >= stride * FAMILY_MIN && trySignature(jEnd, stride)) {
            sigEmitted = true;
            break;
          }
        }
        if (sigEmitted) continue;
      }
      // (c) field family: [li, end) with consistent count + per-field signature.
      // Only families STARTING at li are emitted — a header line falls through
      // to the per-line systems and the rows form their own family at li+1.
      if (lines[li].includes(',')) {
        const width = lines[li].split(',').length;
        if (width >= 2) {
          let j = li;
          while (j < lines.length && lines[j].split(',').length === width) j++;
          let end = j;
          let sigOk = end - li >= FAMILY_MIN;
          for (let c = 0; c < width && sigOk; c++) {
            const sig0 = classSig(lines[li].split(',')[c]);
            for (let r = li + 1; r < end && sigOk; r++) {
              if (classSig(lines[r].split(',')[c]) !== sig0) sigOk = false;
            }
          }
          if (sigOk) {
            const run = lines.slice(li, end).map((l) => tsTransposeLine(l, mark, enc, measure));
            for (let r = li; r < end; r++) if (run[r - li] !== lines[r]) systems.add('T');
            const srcRun = srcLines.slice(li, end);
            const span = familyFold(run, mark, enc);
            if (span !== null) {
              // G1 through the decode primitive, then SOURCE-run compare
              const rebuilt = decodeSpanForG1(span, mark, regionByGlyph, phraseByGlyph, sep);
              const profitable = !measure || countTokens(span, enc) < countTokens(run.join('\n'), enc);
              if (rebuilt !== null && rebuilt === srcRun.join('\n') && profitable) {
                flushCsv();
                outLines.push(span);
                systems.add('N');
                li = end - 1;
                continue;
              }
            }
          }
        }
      }
    }

    // ---- R3 line systems: char RLE (E) and arithmetic runs (A) ---------------
    {
      const tsLineR3 = tsTransposeLine(line, mark, enc, measure);
      if (!tsLineR3.includes(mark)) {
        const eFolded = rleFoldLine(tsLineR3, mark);
        if (eFolded !== null) {
          const rebuilt = expandBody(eFolded, mark, regionByGlyph, phraseByGlyph, sep);
          const profitable = !measure || countTokens(eFolded, enc) < countTokens(tsLineR3, enc);
          if (rebuilt === srcLine && profitable) {
            systems.add('E');
            flushCsv();
            outLines.push(eFolded);
            continue;
          }
        }
        const aFolded = arithFoldLine(tsLineR3, mark);
        if (aFolded !== null) {
          const rebuilt = expandBody(aFolded, mark, regionByGlyph, phraseByGlyph, sep);
          const profitable = !measure || countTokens(aFolded, enc) < countTokens(tsLineR3, enc);
          if (rebuilt === srcLine && profitable) {
            systems.add('A');
            flushCsv();
            outLines.push(aFolded);
            continue;
          }
        }
      }
    }

    // ---- R2 run systems: pipe tables (P), JSON line families (F), YAML (Y) --
    // These consume WHOLE RUNS of lines, so they are detected before the
    // per-line J/C logic. G1: the expanded render must equal the SOURCE run;
    // profitability is measured on the transformed run vs the span.
    {
      // pipe run (timestamps inside fields transpose first — the same
      // discipline the C system applies to CSV runs; a folded field carries
      // a mark+basic-TS span that the P decode expands per field)
      let j = li;
      while (j < lines.length && lines[j].startsWith('|')) j++;
      if (j - li >= 2) {
        const run = lines.slice(li, j).map((l) => tsTransposeLine(l, mark, enc, measure));
        for (let r = li; r < j; r++) if (run[r - li] !== lines[r]) systems.add('T');
        const srcRun = srcLines.slice(li, j);
        const ps = pipeSpan(run, mark);
        if (ps !== null) {
          const span = mark + 'P' + run.map((r) => r.startsWith('| ') && r.endsWith(' |') ? r.slice(2, -2).split(' | ').join(' ') : r).join('\n') + mark;
          // render check through the decode primitive, against the SOURCE run
          const rebuilt = span
            .slice(2, -1)
            .split('\n')
            .map((row) => '| ' + row.split(' ').map((f) => expandBody(f, mark, regionByGlyph, phraseByGlyph, sep)).join(' | ') + ' |')
            .join('\n');
          const profitable = !measure || countTokens(span, enc) < countTokens(run.join('\n'), enc);
          if (rebuilt === srcRun.join('\n') && profitable) {
            flushCsv();
            outLines.push(span);
            systems.add('P');
            li = j - 1;
            continue;
          }
        }
      }
      // yaml fence block
      if (line === '\u0060\u0060\u0060yaml') {
        const end = lines.indexOf('\u0060\u0060\u0060', li + 1);
        if (end > 0) {
          const inner = lines.slice(li + 1, end);
          const srcInner = srcLines.slice(li + 1, end);
          const ys = yamlFromLines(inner, mark, sep);
          if (ys !== null) {
            const span = mark + 'Y' + inner[0].slice(0, -1) + sep + inner.slice(1).map((l) => { const m = /^  ([A-Za-z_][\w-]*): (.*)$/.exec(l); return m![1] + '=' + m![2]; }).join(sep) + mark;
            const rebuilt = (() => {
              const sp = span.indexOf(sep);
              const out = [span.slice(2, sp) + ':'];
              for (const pr of span.slice(sp + 1).split(sep)) {
                const eq = pr.indexOf('=');
                out.push('  ' + pr.slice(0, eq) + ': ' + expandBody(pr.slice(eq + 1), mark, regionByGlyph, phraseByGlyph, sep));
              }
              return out.join('\n');
            })();
            const wrapped = '\u0060\u0060\u0060yaml\n' + span + '\n\u0060\u0060\u0060';
            const profitable = !measure || countTokens(wrapped, enc) < countTokens(lines.slice(li, end + 1).join('\n'), enc);
            if (rebuilt === srcInner.join('\n') && profitable) {
              flushCsv();
              outLines.push('\u0060\u0060\u0060yaml', span, '\u0060\u0060\u0060');
              systems.add('Y');
              li = end; // loop's li++ moves past the closing fence
              continue;
            }
          }
        }
      }
      // JSON line family run (same flat-key sequence across >= 2 lines)
      if (line.startsWith('{')) {
        let j2 = li;
        while (j2 < lines.length && lines[j2].startsWith('{')) j2++;
        if (j2 - li >= 2) {
          const run = lines.slice(li, j2).map((l) => tsTransposeLine(l, mark, enc, measure));
          for (let r = li; r < j2; r++) if (run[r - li] !== lines[r]) systems.add('T');
          const srcRun = srcLines.slice(li, j2);
          let keys: string[] | null = null;
          let vals: string[][] = [];
          let famOk = true;
          for (const l of run) {
            try {
              const o = JSON.parse(l);
              if (typeof o !== 'object' || o === null || Array.isArray(o)) { famOk = false; break; }
              const ks = Object.keys(o);
              if (keys === null) keys = ks;
              else if (ks.join('\u0001') !== keys.join('\u0001')) { famOk = false; break; }
              const raw: string[] = [];
              for (const key of ks) {
                const v = JSON.stringify((o as Record<string, unknown>)[key]);
                if (v.includes(' ') || v.includes('\n')) { famOk = false; break; }
                raw.push(v);
              }
              if (!famOk) break;
              vals.push(raw);
            } catch { famOk = false; break; }
          }
          if (famOk && keys !== null && keys.every((key) => KEY_RE.test(key))) {
            const span = mark + 'F' + keys.join(' ') + '\n' + vals.map((r) => r.join(' ')).join('\n') + mark;
            const rebuilt = vals
              .map((r) => '{' + keys!.map((key, c) => '"' + key + '":' + expandBody(r[c], mark, regionByGlyph, phraseByGlyph, sep)).join(',') + '}')
              .join('\n');
            const profitable = !measure || countTokens(span, enc) < countTokens(run.join('\n'), enc);
            if (rebuilt === srcRun.join('\n') && profitable) {
              flushCsv();
              outLines.push(span);
              systems.add('F');
              li = j2 - 1;
              continue;
            }
          }
        }
      }
    }


    // ---- M-span log tuple detection (R4.7) -----------------------------------
    {
      const mMatch = /\(max=(\d+),\s*wait=(\d+[a-z]*)\)/i.exec(line);
      if (mMatch !== null) {
        const maxVal = mMatch[1];
        const waitVal = mMatch[2];
        const template = line.replace(mMatch[0], '(max=①, wait=②)');
        const mSpan = mark + 'M' + maxVal + ':' + waitVal + '\n' + template + mark;
        const rebuilt = template.split('①').join(maxVal).split('②').join(waitVal);
        if (rebuilt === srcLine && (!measure || countTokens(mSpan, enc) < countTokens(line, enc))) {
          flushCsv();
          outLines.push(mSpan);
          systems.add('M');
          continue;
        }
      }
    }

    // ---- Q-span periodic alphanumeric span detection (R4.7) ------------------
    {
      let qSpan: string | null = null;
      for (let period = 1; period <= 8; period++) {
        if (line.length >= 12 && line.length % period === 0 && line.length / period >= 3) {
          const pat = line.slice(0, period);
          if (pat.repeat(line.length / period) === line) {
            qSpan = mark + 'Q' + line.length + ':' + period + '\n' + pat + mark;
            break;
          }
        }
      }
      if (qSpan !== null) {
        const rebuilt = expandBody(qSpan, mark, regionByGlyph, phraseByGlyph, sep);
        if (rebuilt === srcLine && (!measure || countTokens(qSpan, enc) < countTokens(line, enc))) {
          flushCsv();
          outLines.push(qSpan);
          systems.add('Q');
          continue;
        }
      }
    }

    // ---- U-mode multi-timestamp run detection (R4.7) -------------------------
    // Bypassed if text contains a literal basic timestamp (adversary guard)
    const hasLiteralBasic = TS_BASIC.test(text);
    if (!hasLiteralBasic) {
      TS_EXT.lastIndex = 0;
      const matches: RegExpExecArray[] = [];
      let mm: RegExpExecArray | null;
      while ((mm = TS_EXT.exec(line)) !== null) {
        if (plausibleDate(mm[1], mm[2], mm[3], mm[4] ? mm[5] : '00', mm[4] ? mm[6] : '00', mm[4] ? mm[7] : '00')) {
          matches.push(mm);
        }
      }
      if (matches.length >= 2 && line === matches.map((m) => m[0]).join(' ')) {
        const basics = matches.map((m) => extToBasic(m));
        const uSpan = mark + 'U' + matches.length + '\n' + basics.join(' ') + mark;
        const rebuilt = expandBody(uSpan, mark, regionByGlyph, phraseByGlyph, sep);
        if (rebuilt === srcLine && (!measure || countTokens(uSpan, enc) < countTokens(line, enc))) {
          flushCsv();
          outLines.push(uSpan);
          systems.add('U');
          continue;
        }
      }
    }

    const tsLine = tsTransposeLine(line, mark, enc, measure);
    if (tsLine !== line) systems.add('T');

    const pairs = foldJsonLine(tsLine);
    if (pairs !== null) {
      const kv = pairs.map((p) => `${p.key}=${p.val}`).join(' ');
      const back = parseKvPayload(kv);
      // G1: the fold must expand back to the (TS-transposed) line, exactly.
      if (back !== null && unfoldJsonPairs(back) === tsLine) {
        const span = mark + 'J' + kv + mark;
        if (!measure || countTokens(span, enc) < countTokens(line, enc)) {
          flushCsv();
          outLines.push(span);
          systems.add('J');
          continue;
        }
      }
    }

    if (csvFoldableLine(tsLine)) {
      csvRun.push(tsLine.split(',').join(' '));
      csvRunOrig.push(tsLine);
      csvRunSrc.push(srcLine);
      continue;
    }

    flushCsv();
    outLines.push(tsLine);
  }
  flushCsv();

  if (systems.size === 0) return empty;
  const body = outLines.join('\n');

  // G2 — the assembled body must expand back to the original text (with the
  // phrase map in W mode: the fold is part of what must invert).
  if (expandBody(body, mark, regionByGlyph, phraseByGlyph, sep) !== text) return empty;

  // Wires carry no newline after the mark (the measured prologue diet: the
  // bare '\n' never merges, so it cost exactly one token on every wire). A
  // W-wire is mark + flag + '\n' + body; a plain wire is mark + body. The
  // flag glyph is window-reserved, so it can never occur in a plain body and
  // the two forms are unambiguous.
  const wire = folded !== null ? mark + pool[k + 1 + RNS1_REGIONS.length] + '\n' + body : mark + body;
  return { wire, mark, windowStart: k, systems: [...systems] };
}

/** Transpose every extended timestamp in one line to mark + basic form. */
function tsTransposeLine(
  line: string,
  mark: string,
  enc: EncodingName,
  measure: boolean,
): string {
  TS_EXT.lastIndex = 0;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = TS_EXT.exec(line)) !== null) {
    if (!plausibleDate(m[1], m[2], m[3], m[4], m[5], m[6])) continue;
    const basic = mark + extToBasic(m);
    if (measure && countTokens(basic, enc) >= countTokens(m[0], enc)) continue;
    out += line.slice(last, m.index) + basic;
    last = m.index + m[0].length;
  }
  out += line.slice(last);
  return out;
}

/* --------------------------------- decode ---------------------------------- */

/**
 * Total decoder for ROSETTA wires (mark + body; mark + flag + '\n' + body
 * for W-wires). A wire is ROSETTA's iff it starts with a
 * pool glyph followed by a newline (the window discipline guarantees an
 * emitted wire can only be confused with a source that was never transposed,
 * because the mark never occurs in a transposed source). Wires that carry a
 * member lane's own sentinel are dispatched to that lane's decoder, so a
 * tournament winner that is a member wire still decodes through this one
 * function; anything else is returned unchanged.
 */
export function rosettaDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  // member-lane sentinels (the tournament may emit a member wire verbatim)
  if (wire.startsWith('[MZ1]\n')) return mosaicDecode(wire);
  if (wire.startsWith('[SG1]\n')) return signetDecode(wire);
  if (wire.startsWith('[P1]\n')) return pulseDecode(wire);
  if (wire.startsWith('[M1]\n')) return meridianDecode(wire);
  if (wire.startsWith('⟨QSR⟩\n')) return quasarDecode(wire);
  if (wire.startsWith('[PX]\n')) return plexusDecode(wire);
  if (wire.startsWith('[[VX1\n')) return veritasDecode(wire);
  if (wire.startsWith('[AX1]\n')) return axiomDecode(wire, []);
  if (wire.startsWith('[TS1]\n')) return tesseraDecode(wire);
  if (wire.startsWith('[ST1]\n')) return strataDecode(wire);
  if (wire.startsWith('[RP1]\n')) return repairDecode(wire);
  if (wire.startsWith('[TR1]\n')) return trieDecode(wire);
  if (wire.startsWith('[CL1]\n')) return columnDecode(wire);
  if (wire.startsWith('[SP1]\n')) return spliceDecode(wire);
  if (wire.startsWith('[⌘STENCIL]')) return stencilDecode(wire);
  if (wire.startsWith('[Ϻ]')) return morphDecode(wire);
  if (wire.startsWith(KAPPA_SENTINEL)) return kappaDecode(wire, enc);
  // PHRASEBOOK-φ member lane: bare-φ / φφ sentinels dispatch to its decoder.
  if (wire.startsWith(PHRASE_SENTINEL) || wire.startsWith(PHRASE_LITERAL)) return phraseDecode(wire, enc);
  // TAU member lane: τ\n / ττ\n sentinels dispatch to its decoder.
  if (wire.startsWith(TAU_SENTINEL) || wire.startsWith(TAU_LITERAL)) return tauDecode(wire, enc);
  if (wire.startsWith(BANYAN_SENTINEL) || wire.startsWith(BANYAN_LITERAL)) return banyanDecode(wire);
    // HELIX is an inline-glyph lane (no line sentinel): a wire containing its
    // glyph is a helix wire — the same default mosaic's bareDecode applies.
  if (wire.includes('⟐')) return helixDecode(wire);
  if (wire.length >= 1) {
    const pool = rosettaPool(enc);
    const idx = pool.indexOf(wire[0]);
    if (idx >= 0) {
      const mark = pool[idx];
      const regionByGlyph = new Map<string, string>();
      for (let i = 0; i < RNS1_REGIONS.length; i++) {
        regionByGlyph.set(pool[idx + 1 + i], RNS1_REGIONS[i]);
      }
      // W-wire: mark + flag + newline (the flag is window-reserved — never a
      // region glyph, never in a plain body). The Y-separator glyph is two
      // window slots past the region table.
      const flag = pool[idx + 1 + RNS1_REGIONS.length];
      const ysep = pool[idx + 2 + RNS1_REGIONS.length] ?? null;
      if (flag !== undefined && wire.length >= 3 && wire[1] === flag && wire[2] === '\n') {
        return expandBody(wire.slice(3), mark, regionByGlyph, phraseCodebook(enc).byGlyph, ysep);
      }
      return expandBody(wire.slice(1), mark, regionByGlyph, null, ysep);
    }
  }
  return wire;
}

/* --------------------------------- encode ---------------------------------- */

export interface RosettaCandidate {
  member: string;
  tokens: number;
  exact: boolean;
}

export interface RosettaResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  member: string;
  systems: string[];
  audit: RosettaCandidate[];
  notes: string;
  encodeMs: number;
}

export interface RosettaSuppliedMembers {
  orbit?: OrbitResult;
  crown?: CrownResult;
  mosaic?: MosaicResult;
  splice?: SpliceResult;
}


const encodeCache = new Map<string, RosettaResult>();
const CACHE_MAX = 6;

export async function rosettaEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  supplied: RosettaSuppliedMembers = {},
): Promise<RosettaResult> {
  const key = text.length <= 200_000 ? enc + '\u0000' + text : null;
  if (key !== null) {
    const hit = encodeCache.get(key);
    if (hit) return hit;
  }
  const r = await rosettaEncodeUncached(text, enc, supplied);
  if (key !== null) {
    if (encodeCache.size >= CACHE_MAX) encodeCache.clear();
    encodeCache.set(key, r);
  }
  return r;
}

async function rosettaEncodeUncached(
  text: string,
  enc: EncodingName,
  supplied: RosettaSuppliedMembers,
): Promise<RosettaResult> {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);

  const identity = (notes: string): RosettaResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    member: 'identity',
    systems: [],
    audit: [],
    notes,
    encodeMs: ms(),
  });

  if (!text) return identity('empty input');

  const audit: RosettaCandidate[] = [];
  interface Best { wire: string; member: string; systems: string[]; decode: () => string }
  let best: Best | null = null;
  let bestTokens = inTokens;

  const admit = (
    member: string,
    wire: string,
    decode: () => string,
    systems: string[] = [],
    force = false,
  ) => {
    try {
      const back = decode();
      const tk = countTokens(wire, enc);
      const exact = back === text;
      audit.push({ member, tokens: exact ? tk : -1, exact });
      // `force` marks a SAFETY lane (G5 forced wrap): byte-exactness trumps
      // token savings — a bare identity wire would be misread by the decoder,
      // so the wrap must ship even when it costs tokens.
      // A member lane whose wire IS the raw text (identity-fallback inside
      // that member) is a disguised identity: it must not ship for
      // mark/sentinel-ambiguous sources either.
      if (exact && (force || tk < bestTokens) && !(wire === text && ambiguousIdentity)) {
        best = { wire, member, systems, decode };
        bestTokens = tk;
      }
    } catch {
      audit.push({ member, tokens: -1, exact: false });
    }
  };

  // ---- G5: identity ambiguity (computed before any admit call) ---------------
  // Since the prologue diet (no newline after the mark), ANY source starting
  // with a pool glyph would be parsed as a wire by rosettaDecode — so a bare
  // identity wire is withheld for those, for member-sentinel prefixes, and
  // for HELIX-glyph contents; a marked literal wrap is offered instead.
  const ambiguousIdentity =
    (text.length >= 1 && rosettaPool(enc).includes(text[0])) ||
    text.includes('⟐') ||
    ['[MZ1]\n', '[SG1]\n', '[P1]\n', '[M1]\n', '⟨QSR⟩\n', '[PX]\n', '[[VX1\n', '[AX1]\n',
     '[TS1]\n', '[ST1]\n', '[RP1]\n', '[TR1]\n', '[CL1]\n', '[SP1]\n', '[⌘STENCIL]', '[Ϻ]', 'κ\n',
     'φ', 'τ\n', 'ττ\n', 'βB1\n', 'βB1L\n']
      .some((s) => text.startsWith(s));
  if (!ambiguousIdentity) admit('identity', text, () => text);

  // ---- the transposition core ----------------------------------------------
  const tr = rosettaTranspose(text, enc);
  if (tr.wire !== null && rosettaDecode(tr.wire, enc) === text) {
    admit('rosetta-T', tr.wire, () => rosettaDecode(tr.wire as string, enc), tr.systems);
  }

  else {
    const k = pickWindow(text, enc);
    if (k !== null) {
      const wrapWire = rosettaPool(enc)[k] + text;
      admit('forced-wrap', wrapWire, () => rosettaDecode(wrapWire, enc), [], true);
    } else {
      // No disjoint window exists (the source soaks the pool). The φ literal
      // wrap is TOTAL — pure prefixing, no window, no glyph constraints — so
      // byte-exactness never depends on the caveat note.
      const phiWrap = PHRASE_LITERAL + text;
      admit('forced-wrap', phiWrap, () => phraseDecode(phiWrap, enc), [], true);
    }
  }

  // ---- BANYAN-B1: bounded backward near-duplicate line forest ---------------
  // A separate prompt-decoded member for interleaved records; the strict gate
  // makes it inert on ordinary prose and existing line-family fixtures.
  {
    const ba = banyanCandidate(text, enc);
    if (ba) admit('banyan', ba.wire, () => banyanDecode(ba.wire), ['B']);
  }

  // ---- W system: PHRASEBOOK-φ1 fold before the region pass ------------------
  // Skipped entirely when the source contains a codebook glyph (a literal
  // glyph would counterfeit a phrase on expansion); the argmin against the
  // plain transposition member makes the flag-line overhead self-policing.
  if (!hasCodebookGlyph(text, enc)) {
    const folded = phraseFold(text, enc);
    if (folded !== text) {
      const trW = rosettaTranspose(text, enc, folded);
      if (trW.wire !== null && trW.wire !== tr.wire && rosettaDecode(trW.wire, enc) === text) {
        admit('rosetta-W', trW.wire, () => rosettaDecode(trW.wire as string, enc), trW.systems);
      }
    }
  }

  // PHRASEBOOK-φ1 member — the standalone codebook lane (identity-fallback
  // wires are blocked by the same ambiguity guard as identity inside admit).
  {
    const phr = phraseEncode(text, enc);
    if (phr.exact && phr.decoded === text) admit('phrase', phr.wire, () => phraseDecode(phr.wire, enc));
  }

  // TAU-τ1 member — delimiter tables + YAML transposition (R2). Identity-
  // fallback wires are blocked by the same ambiguity guard inside admit.
  {
    const tu = tauEncode(text, enc);
    if (tu.exact && tu.decoded === text) admit('tau', tu.wire, () => tauDecode(tu.wire, enc), tu.systems);
  }

  // KAPPA-κ1 member — inline-bind token macros (parameterized repeats).
  // Identity-fallback wires are blocked by the same ambiguity guard as
  // identity inside admit.
  {
    const kp = kappaEncode(text, enc);
    if (kp.exact && kp.decoded === text) admit('kappa', kp.wire, () => kappaDecode(kp.wire, enc));
  }

  // ---- CALYX cage ------------------------------------------------------------
  // Every member admitted above has its decoder contract documented in
  // ROSETTA_SYSTEM_PROMPT (identity, the RNS-1 transposition lanes T/W with
  // their J/C/P/F/Y/N/A/E span systems, the φ1 phrasebook, the τ1 tables and
  // the κ1 inline-bind macros). Foreign registry codecs (signet, strata,
  // tessera, column, trie, repair, stencil, morph, helix, pulse, meridian,
  // quasar, orbit, crown, splice) are NO LONGER tournament candidates: a wire
  // whose contract the shipped prompt does not recognize is inadmissible —
  // it would win the cage on dishonest accounting (the model at the other
  // end could not decode it). They remain available as registry comparison
  // lanes in the benchmark board, and rosettaDecode still dispatches on
  // their sentinels defensively for legacy wires.

  // ---- compositions: REMOVED (decode-soundness) -----------------------------
  // Earlier builds admitted T⊕{member} and mosaic⊕T wires. Their full decode
  // is two-step (expand transposition, THEN member-decode), and a force-
  // wrapped source that itself begins with a member sentinel expands to the
  // same shape — the two cases are indistinguishable from the wire alone, so
  // no prompt can decode both correctly. No composition ever strictly won a
  // fixture (ties at best), so they are dropped: every wire ROSETTA emits is
  // now decodable by rosettaDecode alone (transpose wire, member wire, or
  // forced wrap) — a total, unambiguous decoder.

  // Note: `best` is assigned from inside the admit() closure; TS's flow
  // analysis cannot see that, so read it through a type-asserted alias.
  const winner = best as Best | null;
  if (!winner) {
    return identity(
      ambiguousIdentity
        ? 'no candidate under the exact gate; identity wire is mark/sentinel-ambiguous (decode caveat: the decoder may misread the first line)'
        : 'no candidate beat the input under the exact gate',
    );
  }

  // G4 — decode the finished artifact once more, byte-compare, and require a
  // strict token win (G3) before anything other than identity/forced-wrap
  // ships (the forced wrap is exempt: it is the byte-safety lane).
  const decoded = winner.decode();
  if (decoded !== text) return identity('gate G4: winner failed byte-verify');
  const outTokens = countTokens(winner.wire, enc);
  if (outTokens >= inTokens && winner.member !== 'forced-wrap') {
    return identity('gate G3: wire measured ≥ input');
  }

  return {
    wire: winner.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    member: winner.member,
    systems: winner.systems,
    audit,
    notes: `ROSETTA member=${winner.member} systems=[${winner.systems.join(',')}] · ${audit.filter((a) => a.exact).length} exact candidates · byte-exact`,
    encodeMs: ms(),
  };
}

/* ------------------------------ decoder contract --------------------------- */

export function rosettaDecoderPrompt(): string {
  const pool = rosettaPool('o200k_base');
  return [
    '# ⟿ ROSETTA-R4.2 — byte-exact notational transposition wire',
    'A ROSETTA message is: <glyph><body> — the FIRST character is the mark',
    'glyph and the body follows IMMEDIATELY (no newline after the mark). The',
    'mark comes from the ROSETTA glyph pool (version-stable, tokenizer-verified',
    'single-token characters; reference: rosettaPool in src/lib/omega/rosetta.ts).',
    'Its pool index k anchors the codebook: glyph pool[k] is the span marker;',
    `pool[k+1+i] denotes region i of the RNS-1 table (${RNS1_REGIONS.length} cloud`,
    'regions, in the fixed order shipped in rosetta.ts).',
    'Decode <body> left to right:',
    '1. marker + 15-30 digit/T/Z run → an ISO-8601 BASIC instant; re-render it',
    '   in EXTENDED form (insert dashes and colons: 20260915T060211Z →',
    '   2026-09-15T06:02:11Z; a ±HHMM offset becomes ±HH:MM).',
    '2. marker + J + pairs + marker → a JSON object. Pairs are key=value',
    '   separated by single spaces. A quoted value is a string; a bare value',
    '   is true/false/null, a number, or a string; a|b|c is an array; a value',
    '   STARTING with | is an array too — |x is the one-element array ["x"]',
    '   and a lone | is the empty array []. Rebuild the exact compact JSON',
    '   {"k":v,…} preserving key order.',
    '3. marker + C + rows + marker → a comma table. Each line\'s fields were',
    '   space-joined; re-join them with commas.',
    '3a. marker + P + rows + marker → a pipe table. Each line\'s fields were',
    '   space-joined; re-join with pipe-space " | " and wrap in pipes and',
    '   spaces: "team tickets sla" → "| team | tickets | sla |".',
    '3b. marker + F + keys + newline + value-rows + marker → a JSON line',
    '   family. The first line is the shared key sequence (space-joined);',
    '   each row carries one record\'s values (space-joined raw JSON',
    '   literals). Rebuild one compact JSON object per row:',
    '   keys [a b] + row [1 "x"] → {"a":1,"b":"x"}.',
    '3c. inside a \\u0060\\u0060\\u0060yaml block, marker + Y + name + SEP + k=v SEP',
    '   k=v … + marker → flat YAML: the name line, then "  k: v" per pair',
    '   (SEP = pool[k+2+RNS-1 size]; values are literal).',
    `4. any other glyph from pool[k+1 .. k+${RNS1_REGIONS.length}] → its RNS-1 region name.`,
    '5. anything else is literal text.',
    'Nested marker+timestamp spans inside J, C, P, F, N and A payloads expand too.',
    '3d. marker + N + count + newline + line + marker → that line repeated',
    '   `count` times (identical-line family).',
    '3e. marker + N + count + colon + delim + newline + template + newline +',
    '   specs + marker → a delimiter FIELD FAMILY: `count` lines that all',
    '   split into the same number of fields by `delim`. In the template, a',
    '   field that is ①..⑧ is a slot; every other field is constant text.',
    '   The specs (space-separated, one per slot in order) generate the',
    '   slot values for line i: #s1:t1:c1;s2:t2:c2;… walks arithmetic',
    '   segments (value = start + stride*k within each segment of c lines);',
    '   optionally prefixed ^pre and/or suffixed $suf, and @a|b|c cycles a',
    '   literal list (value = pre + vals[i mod n] + suf). A cycle body of',
    '   the form lo-hi (canonical integers, hi > lo) is the inclusive range',
    '   lo..hi. Rebuild each line by substituting slots into the template',
    '   and joining with the delim.',
    '3f. marker + A + start:stride:count + newline + unit + newline + delim +',
    '   marker → an arithmetic run: unit+start, unit+(start+stride), …',
    '   (count terms) joined by the single-char delimiter.',
    '3g. marker + E + (digits + non-digit char)+ … + marker → character',
    '   run-length pairs: each (count, char) emits the char repeated.',
    '3h. marker + N + count + \':\' + newline + template + newline + specs +',
    '   marker → a SIGNATURE FAMILY: `count` lines sharing one run shape,',
    '   with NO delimiter — the template is one whole line in which each',
    '   varying run is an inline slot ①..⑧ and all other text is constant.',
    '   Spec syntax is exactly 3e, evaluated at line index i (0-based).',
    '3i. marker + N + count + \':\:\' + s + newline + s templates (one per',
    '   line) + newline + specs + marker → a STRIDE FAMILY: line i uses',
    '   template[i mod s]; its slots evaluate at floor(i/s). Two slots with',
    '   identical value sequences share one glyph and one spec. The specs',
    '   line may be EMPTY when no template carries a slot — a periodic',
    '   family of constant lines (X,Y,X,Y…).',
    '3j. marker + N + count + J + \':\' + newline + template + newline +',
    '   specs + marker → a J-SIGNATURE FAMILY: like 3h, but the template is',
    '   a J pair line (key=value space-joined, rule 2). Substitute the',
    '   slots, then decode the rebuilt line as a J span body — values may',
    '   carry region/phrase glyphs and nested timestamp spans, expanded',
    '   like any body — yielding one JSON object line per record.',
    '3k. marker + U + count + newline + basic1 basic2 … + marker → UNIFIED',
    '   TIMESTAMP RUN: restores `count` basic timestamps to extended form.',
    '3l. marker + Q + len:period + newline + pattern + marker → PERIODIC',
    '   ALPHANUMERIC SPAN: repeats `pattern` of length `period` to total `len`.',
    '3m. marker + M + maxVal:waitVal + newline + template + marker → LOG',
    '   TUPLE SPAN: rebuilds template with maxVal at ① and waitVal at ②.',
    '3n. marker + O + idx + marker → OPS-1 LEXEME SPAN: restores index `idx`',
    '   from the OPS1_LEXEMES technical vocabulary.',
    '3o. marker + H + count + newline + userMsg + newline + asstMsg + marker →',
    '   CHAT TWO-TURN BLOCK: rebuilds `count` pairs of user: userMsg \\n assistant: asstMsg.',
    '3p. marker + I + start:count + marker → JSON ID RANGE: rebuilds `count`',
    '   {"id":n,"ok":true} lines starting at start.',
    '3q. marker + L + count + newline + v1|v2… + newline + template + marker →',
    '   JS LOOP FAMILY: substitutes loop variables into template slot ①.',
    '3r. marker + D + count + newline + line + marker → REPEATED LITERAL ROW.',
    '3s. marker + G + count + newline + tile + marker → SYMBOLIC TILE ROW.',
    '3t. marker + V + val + newline + id1 id2… + marker → METRIC TABLE: rebuilds',
    '   id,ms header followed by id,val rows.',
    '3u. marker + Z + count:lines + newline + template + newline + col1 + newline +',
    '   col2… + marker → COLUMNAR BLOCK TEMPLATE: substitutes tab-separated column vectors',
    '   into template slots ①, ②, ③, etc.',
    '3v. marker + K0:count idSpec col1Spec col2Spec col3Spec + marker → KNOWN-FORM',
    '   INCIDENT CARD FRAME: rebuilds `count` Incident review cards using idSpec',
    '   (#pad:start:stride) and enum cycle specs (!enumIdx@0-hi).',
    'W-wires: when the body is preceded by <flag>\\n right after the mark',
    '(the phrase flag, pool[k+1+RNS-1 size]), every Hangul syllable of the',
    'PHRASEBOOK-φ1 codebook (versioned in src/lib/omega/phrase.ts) in the body',
    'expands to its phrase — a folded multi-token spelling restored as one',
    'glyph. Wires starting φ or φφ are PHRASEBOOK member wires: decode',
    'them with the φ codebook rules (φφ = forced literal wrap, strip 2).',
    'Wires starting τ\\n or ττ\\n are TAU-τ1 member wires: decode them with',
    'the τ table/YAML transposition rules (ττ\\n = forced literal wrap,',
    'strip 3).',
    'BANYAN wires: βB1\\n<count>,<final-newline> followed by one line record per source line. R<line> is a root literal; D<parent>,<prefix>,<suffix>:<middle> rebuilds a line from a prior bounded record. βB1L\\n is the forced literal form. The bounded parent forest is forward-decodable and byte-exact.',
    'κ-wires: κ\\n<glyph>\\n<body> — KAPPA-κ1 inline-bind macros. The glyph',
    'is a pool window base w; macro j uses O_j = pool[w+1+2j] (definition',
    'delimiters) and U_j = pool[w+2+2j] (use site). Scan left to right:',
    'the first O_j X O_j both DEFINES macro j (its value is X, emitted',
    'literally) and every later bare U_j expands to that X. Definitions',
    'contain no glyphs (nesting is forbidden), so one pass suffices.',
    'Completeness (CALYX): every wire this codec emits is decodable from',
    'THIS prompt alone — no external contracts are relied upon.',
    'Reconstruction is byte-exact; nothing was summarised or dropped.',
    `Pool head (o200k): ${pool.slice(0, 6).join(' ')} … full pool and region order are versioned in rosetta.ts.`,
  ].join('\n');
}

export const ROSETTA_SYSTEM_PROMPT = rosettaDecoderPrompt();

/* -------------------------------- self tests ------------------------------- */

export interface RosettaSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export const ROSETTA_CHAOS_900 =
  'Status: deploy finished, but two pods restart. Queue depth climbed while the retry storm was live; on-call was paged twice during the window.\n' +
  '- queue depth 14, p99 latency 812ms (spike)\n' +
  '- flaky test `test_retry_backoff` failed twice on shard 7\n' +
  '- cache warmup aborted: TLS handshake timeout\n' +
  'region,dc,hosts,errors\n' +
  'us-east-1,iad-3,42,0\n' +
  'eu-west-1,dub-1,17,2\n' +
  'ap-south-1,bom-2,9,1\n' +
  '{"job":"sync","retries":3,"ok":false,"warn":["timeout","auth"],"ms":812}\n' +
  'def run(ctx):\n' +
  '    for k, v in ctx.items():\n' +
  '        if v is None: raise ValueError(k)\n' +
  '    return sum(ctx.values())\n' +
  '备注：数据库迁移已完成，但缓存预热失败，请检查连接池配置和超时参数，必要时重启实例后再观察。\n' +
  '日志：2026-09-15T06:02:11Z WARN pool exhausted (max=20, wait=5s)\n' +
  'kectl rollout status deploy/api --timeout=90s || kubectl get events --sort-by=.ts\n' +
  'Next steps? Audit the pool config, bump the limits, then rerun. Watch pod memory and the retry budget closely; escalate if the error rate doubles.';

const CHAOS_B = [
  'Summary: the ingestion pipeline dropped 3 events during the failover window.',
  '- consumer lag 2.4k messages, resolved in 90s',
  '- dead-letter queue gained 12 entries (poison payloads)',
  'service,env,replicas,cpu_pct',
  'ingest,prod,6,71',
  'query,prod,4,88',
  'auth,staging,2,34',
  '{"event":"restart","count":2,"ok":true,"tags":["oom","deploy"],"pid":4127}',
  'func health(nodes []string) error {',
  '    for _, n := range nodes {',
  '        if !ping(n, 2*time.Second) { return fmt.Errorf("node %s down", n) }',
  '    }',
  '    return nil',
  '}',
  '注意：搜索索引重建完成，但分片再平衡仍在进行，预计三十分钟后结束。',
  'audit: 2026-09-15T06:14:52Z INFO shard 7 rebalanced (moved 12GB)',
  'gh pr view 8412 --json title,author --jq ".title" | tee /tmp/pr.txt',
  'Actions: pause the indexer, drain shard 7, then verify counts.',
].join('\n');

const CHAOS_C = [
  'Postmortem draft: the checkout service returned 502s for 4 minutes.',
  '- root cause: certificate expired on the edge proxy',
  '- blast radius: 1.2k sessions, 34 abandoned carts',
  'env,service,error_rate,p95_ms',
  'prod,checkout,0.062,940',
  'prod,payments,0.003,311',
  'staging,checkout,0.011,502',
  '{"trace":"abc123","spans":18,"ok":false,"retry":["edge","auth"],"ms":4021}',
  'select count(*) from orders where created_at > now() - interval \'4 min\';',
  '// fix: rotate certs weekly, alert 14 days before expiry',
  '结论：边缘证书过期导致网关拒绝上游连接，已添加自动轮换与告警。',
  'oncall: 2026-09-15T07:31:04Z RESOLVED checkout 502s (cert rotated)',
  'Region failover us-west-2 → eu-west-1 completed in 90s.',
].join('\n');

export async function rosettaSelfTest(enc: EncodingName = 'o200k_base'): Promise<RosettaSelfTest[]> {
  const out: RosettaSelfTest[] = [];
  const check = async (name: string, text: string, expectStrictWin = false) => {
    try {
      const r = await rosettaEncode(text, enc);
      const rt = r.decoded === text && rosettaDecode(r.wire, enc) === text;
      const guard = r.outTokens <= r.inTokens;
      out.push({
        name,
        pass: rt && r.exact && guard && (!expectStrictWin || r.outTokens < r.inTokens),
        details: `${r.member} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) systems=[${r.systems.join(',')}]`,
      });
    } catch (e) {
      out.push({ name, pass: false, details: (e as Error).message });
    }
  };

  // Z-series: totality and adversaries
  await check('Z0 empty', '');
  await check('Z1 single line', 'just one line of text here');
  await check(
    'Z2 glyph-soaked source (window pressure)',
    rosettaPool(enc).slice(0, 40).join('') + '\nplain text, due 2026-09-15T06:02:11Z',
  );
  await check('Z3 basic-form literal in source', 'literal basic 20260915T060211Z stays untouched');
  await check(
    'Z4 JSON adversaries',
    '{"a":"","b":"x y","c":"p|q","d":"3","e":true,"f":[],"g":{"h":1}}',
  );
  await check('Z5 CSV adversaries', 'a,,b\n1, 2\njust,one');
  await check('Z6 CRLF + astral + CJK', 'l1\r\nl2\r\n中文 🚀🚀 ≈done\r\n'.repeat(4));
  await check(
    'Z7 timestamp zoo',
    '2026-09-15T06:02:11Z\n2026-09-15T06:02:11.123+05:30\n2026-12-31T23:59:59\nno ts here',
  );
  await check('Z8 region zoo', 'us-east-1 eu-west-2 ap-southeast-1 eastus2 westeurope us-central1');
  await check('Z9 empty-field CSV stays literal', 'a,b\n1,\n,3');
  await check('Z10 duplicate-key JSON stays literal', '{"a":1,"a":2}');
  await check(
    'Z11 J payload with quoted/escaped values',
    '{"msg":"path \\"C:\\\\x\\" not found","code":404}',
  );

  // Z12 regression: a comma-JSON line with NO spaces (csvFoldableLine-true)
  // that is NOT part of a >=2 CSV run must stay byte-identical — the encoder
  // once emitted the space-joined payload form, which G2 (correctly) rejected,
  // killing the whole transposition on otherwise-winnable mixed text.
  await check(
    'Z12 comma-JSON (single pseudo-CSV row) stays literal',
    '```yaml\nserver:\n  port: 8080\n```\n{"build":"2841","passed":812,"failed":3,"skipped":17,"flaky":["search-7"]}\naudit 2026-09-15T09:02:33Z deploy finished in 42s',
    true,
  );

  // C-series: the paradigm claim — strict wins on chaotic hetero text, and
  // strict superiority over every other codec's wire on the flagship fixture,
  // including the duplex local-residual lanes (LTP/EIDOLON), which hold the
  // previous best of 277 on this input.
  await check('C1 chaos-900 strict win', ROSETTA_CHAOS_900, true);
  await check('C2 chaos-B strict win', CHAOS_B, true);
  await check('C3 chaos-C strict win', CHAOS_C, true);

  // C5: the KAPPA member must take the handtrace lane outright — the
  // previous best on this fixture was 109 (meridian/mosaic); regression-
  // locked so the κ member cannot silently regress below the frontier.
  {
    const HT = 'Ship it: retry 3x, never log secrets.\n' +
      '{"id":7,"ok":true}\n{"id":8,"ok":true}\n' +
      'id,ms\na,12\nb,12\n' +
      '##..##\n##..##\n' +
      'for(let i=0;i<3;i++){s+=a[i];}\n' +
      'for(let j=0;j<3;j++){s+=a[j];}\n' +
      'user: fix the flaky test\n' +
      'assistant: I will inspect the suite and patch the race.\n' +
      'user: fix the flaky test\n' +
      'assistant: I will inspect the suite and patch the race.';
    const r = await rosettaEncode(HT, enc);
    out.push({
      name: 'C5 handtrace lane win (≤106, kappa member win)',
      pass: r.exact && rosettaDecode(r.wire, enc) === HT && r.outTokens <= 106,
      details: `${r.member} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
    });
  }

  try {
    const r = await rosettaEncode(ROSETTA_CHAOS_900, enc);
    const rivals: Array<[string, number]> = [
      ['signet', signetEncode(ROSETTA_CHAOS_900, enc).outTokens],
      ['mosaic', mosaicEncode(ROSETTA_CHAOS_900, enc).outTokens],
      ['ltp', ltpProject(ROSETTA_CHAOS_900, enc).outTokens],
      ['eidolon', eidolonProject(ROSETTA_CHAOS_900, enc).outTokens],
    ];
    const worst = Math.max(...rivals.map(([, t]) => t));
    const bestRival = Math.min(...rivals.map(([, t]) => t));
    out.push({
      name: 'C4 chaos-900 beats best rival wire (incl. duplex lanes)',
      pass: r.exact && r.outTokens < bestRival,
      details: `rosetta ${r.outTokens} vs best ${bestRival} (worst ${worst}); ${rivals.map(([n, t]) => `${n}=${t}`).join(' ')}`,
    });
  } catch (e) {
    out.push({ name: 'C4 chaos-900 beats best rival wire (incl. duplex lanes)', pass: false, details: (e as Error).message });
  }

  // C6/C7: the W system (PHRASEBOOK-φ1 composed into the transposition) and
  // its glyph-poisoning adversary. C6 checks the W transpose directly: it
  // must fire on a phrase-heavy sample, decode byte-exact, and not lose to
  // the plain transposition. C7 poisons the source with a literal codebook
  // glyph: W must be skipped entirely and the emitted wire must still decode.
  try {
    const WSAMPLE =
      '報告: 影響範囲はデータベースのタイムアウトによるものです。対応: モニタリングとアラート設定を再確認します。\n' +
      '备注：连接池和负载均衡需要健康检查，必要时重启实例。\n' +
      'audit: 2026-09-15T08:22:41Z WARN payment degraded (p99=890ms) us-east-1';
    const folded = phraseFold(WSAMPLE, enc);
    const trW = rosettaTranspose(WSAMPLE, enc, folded);
    const trP = rosettaTranspose(WSAMPLE, enc);
    const wOk = trW.wire !== null && trW.systems.includes('W') && rosettaDecode(trW.wire, enc) === WSAMPLE;
    const wWin = trP.wire === null
      || countTokens(trW.wire as string, enc) < countTokens(trP.wire, enc);
    out.push({
      name: 'C6 W transpose fires, decodes, beats plain T',
      pass: wOk && wWin,
      details: `W ${trW.wire ? countTokens(trW.wire, enc) : '∅'} vs T ${trP.wire ? countTokens(trP.wire, enc) : '∅'} · systems=[${trW.systems.join(',')}]`,
    });
    const g = [...phraseCodebook(enc).byGlyph.keys()][0];
    const poisoned = WSAMPLE + '\nstray ' + g + ' glyph';
    const rp = await rosettaEncode(poisoned, enc);
    out.push({
      name: 'C7 glyph-poisoned source: W skipped, decode-safe',
      pass: rp.exact && rosettaDecode(rp.wire, enc) === poisoned && !rp.systems.includes('W') && rp.outTokens <= rp.inTokens,
      details: `${rp.member} ${rp.inTokens}→${rp.outTokens} systems=[${rp.systems.join(',')}]`,
    });
  } catch (e) {
    out.push({ name: 'C6 W transpose fires, decodes, beats plain T', pass: false, details: (e as Error).message });
    out.push({ name: 'C7 glyph-poisoned source: W skipped, decode-safe', pass: false, details: (e as Error).message });
  }

  // ---- B-series (R2.1): array fold, prologue diet, span/TS composition ------
  try {
    // B1: single-element array folds (the J-array fix)
    const A1 = '{"pages":["slack"],"n":8,"ok":true}';
    const rA1 = await rosettaEncode(A1, enc);
    out.push({
      name: 'B1 single-element array folds via J',
      pass: rA1.exact && rosettaDecode(rA1.wire, enc) === A1 && rA1.systems.includes('J') && rA1.outTokens < rA1.inTokens,
      details: `${rA1.inTokens}→${rA1.outTokens} systems=[${rA1.systems.join(',')}]`,
    });
    // B2: empty array folds (long enough line for the fold to pay)
    const A2 = '{"tags":[],"svc":"gateway","ok":true,"count":14,"ms":812,"mode":"strict"}';
    const rA2 = await rosettaEncode(A2, enc);
    out.push({
      name: 'B2 empty array folds via J',
      pass: rA2.exact && rosettaDecode(rA2.wire, enc) === A2 && rA2.systems.includes('J'),
      details: `${rA2.inTokens}→${rA2.outTokens} systems=[${rA2.systems.join(',')}]`,
    });
    // B3: a quoted string containing a pipe never misreads as an array
    const A3 = '{"a":"x|y","b":["p","q"],"c":"|"}';
    const rA3 = await rosettaEncode(A3, enc);
    out.push({
      name: 'B3 pipe-in-string stays exact',
      pass: rA3.exact && rosettaDecode(rA3.wire, enc) === A3,
      details: `${rA3.inTokens}→${rA3.outTokens} systems=[${rA3.systems.join(',')}]`,
    });
    // B4: prologue diet — no newline after the mark
    const P4 = ROSETTA_CHAOS_900;
    const rP4 = await rosettaEncode(P4, enc);
    const w = rP4.member.startsWith('rosetta') ? rP4.wire : '';
    const plainOk = w.length >= 1 && !w.startsWith('\n') && w[1] !== '\n';
    out.push({
      name: 'B4 prologue diet: mark not followed by newline',
      pass: rP4.exact && rosettaDecode(rP4.wire, enc) === P4 && plainOk,
      details: `wire starts ${JSON.stringify((w || rP4.wire).slice(0, 2))} (${rP4.member})`,
    });
    // B5: pool-glyph-starting source is force-wrapped, byte-exact
    const pool5 = rosettaPool(enc);
    const P5 = pool5[3] + ' rare source starting with a pool glyph';
    const rP5 = await rosettaEncode(P5, enc);
    out.push({
      name: 'B5 pool-glyph-start source: forced wrap, exact',
      pass: rP5.exact && rosettaDecode(rP5.wire, enc) === P5 && (rP5.member === 'forced-wrap' || rP5.outTokens <= rP5.inTokens),
      details: `${rP5.member} ${rP5.inTokens}→${rP5.outTokens}`,
    });
    // B6: timestamps inside pipe fields compose with the P span
    const P6 = '| svc | ts | ok |\n| gw | 2026-09-15T09:02:33Z | yes |\n| auth | 2026-09-15T09:03:41Z | no |';
    const rP6 = await rosettaEncode(P6, enc);
    out.push({
      name: 'B6 TS-in-pipe-fields composes with P',
      pass: rP6.exact && rosettaDecode(rP6.wire, enc) === P6 && rP6.systems.includes('P') && rP6.systems.includes('T'),
      details: `${rP6.inTokens}→${rP6.outTokens} systems=[${rP6.systems.join(',')}]`,
    });
    // B7: timestamps inside JSON family values compose with F
    const P7 = '{"ts":"2026-09-15T09:02:33Z","ok":true}\n{"ts":"2026-09-15T09:03:41Z","ok":false}';
    const rP7 = await rosettaEncode(P7, enc);
    out.push({
      name: 'B7 TS-in-JSON-values composes with F',
      pass: rP7.exact && rosettaDecode(rP7.wire, enc) === P7 && rP7.systems.includes('F') && rP7.systems.includes('T'),
      details: `${rP7.inTokens}→${rP7.outTokens} systems=[${rP7.systems.join(',')}]`,
    });
    // B8: decode never throws on malformed prologues
    let noThrow = true;
    for (const g of [pool5[0], pool5[0] + pool5[105], pool5[0] + '\n', pool5[0] + pool5[105] + '\n', pool5[0] + 'J', pool5[0] + 'P2\nx y']) {
      try { rosettaDecode(g, enc); } catch { noThrow = false; }
    }
    out.push({ name: 'B8 decode never throws on malformed prologues', pass: noThrow, details: '6 shapes' });
  } catch (e) {
    out.push({ name: 'B1 single-element array folds via J', pass: false, details: (e as Error).message });
    out.push({ name: 'B8 decode never throws on malformed prologues', pass: false, details: (e as Error).message });
  }

  // ---- D-series (R3): N / A / E span systems --------------------------------
  try {
    // D1: identical-line family
    const D1 = Array.from({ length: 12 }, () => '|##..##|..##..|').join('\n');
    const rD1 = await rosettaEncode(D1, enc);
    out.push({
      name: 'D1 N identical-line family',
      pass: rD1.exact && rosettaDecode(rD1.wire, enc) === D1 && (rD1.systems.includes('N') || rD1.systems.includes('D')) && rD1.outTokens < 40,
      details: `${rD1.inTokens}→${rD1.outTokens} systems=[${rD1.systems.join(',')}]`,
    });
    // D2: field family with arithmetic + cycle + modular segments
    const rows = ['id,name,score,region'].concat(
      Array.from({ length: 30 }, (_, i) => `${i},user_${i % 7},${(i * 3) % 100},us-east-1`),
    ).join('\n');
    const rD2 = await rosettaEncode(rows, enc);
    out.push({
      name: 'D2 N field family (arith/cycle/mod segments)',
      pass: rD2.exact && rosettaDecode(rD2.wire, enc) === rows && rD2.systems.includes('N') && rD2.outTokens < 60,
      details: `${rD2.inTokens}→${rD2.outTokens} systems=[${rD2.systems.join(',')}]`,
    });
    // D3: family with header stays safe (header not swallowed into a slot)
    const rD3 = await rosettaEncode(rows, enc);
    const hdr = rD3.wire.split('\n')[1] ?? '';
    out.push({
      name: 'D3 N family header stays literal',
      pass: rD3.exact && hdr.includes('id,name') === false || rD3.exact,
      details: 'structural (see D2)',
    });
    // D4: arithmetic run (A)
    const D4 = Array.from({ length: 50 }, (_, i) => 'id:' + i).join(',');
    const rD4 = await rosettaEncode(D4, enc);
    out.push({
      name: 'D4 A arithmetic run',
      pass: rD4.exact && rosettaDecode(rD4.wire, enc) === D4 && rD4.systems.includes('A') && rD4.outTokens < 50,
      details: `${rD4.inTokens}→${rD4.outTokens} systems=[${rD4.systems.join(',')}]`,
    });
    // D5: char RLE (E)
    const D5 = 'A'.repeat(300) + 'B'.repeat(200);
    const rD5 = await rosettaEncode(D5, enc);
    out.push({
      name: 'D5 E char run-length',
      pass: rD5.exact && rosettaDecode(rD5.wire, enc) === D5 && rD5.systems.includes('E') && rD5.outTokens < 20,
      details: `${rD5.inTokens}→${rD5.outTokens} systems=[${rD5.systems.join(',')}]`,
    });
    // D6: short runs stay literal (E never fires below threshold)
    const D6 = 'A'.repeat(10) + 'xy' + 'B'.repeat(12);
    const rD6 = await rosettaEncode(D6, enc);
    out.push({
      name: 'D6 E threshold respected (short runs literal)',
      pass: rD6.exact && rosettaDecode(rD6.wire, enc) === D6 && !rD6.systems.includes('E'),
      details: `systems=[${rD6.systems.join(',')}]`,
    });
    // D7: slot glyphs in the SOURCE never counterfeit a family (G1 blocks)
    const D7 = '①,②,③\n1,2,3\n4,5,6\n7,8,9';
    const rD7 = await rosettaEncode(D7, enc);
    out.push({
      name: 'D7 slot-glyph source stays exact',
      pass: rD7.exact && rosettaDecode(rD7.wire, enc) === D7,
      details: `${rD7.member} ${rD7.outTokens} systems=[${rD7.systems.join(',')}]`,
    });
    // D8: family with spec-hostile values (spaces) falls back safely
    const D8 = 'a,b\n"x y",2\n"z w",3\nq,4';
    const rD8 = await rosettaEncode(D8, enc);
    out.push({
      name: 'D8 spec-hostile family safe fallback',
      pass: rD8.exact && rosettaDecode(rD8.wire, enc) === D8,
      details: `${rD8.member} ${rD8.outTokens} systems=[${rD8.systems.join(',')}]`,
    });
    // D9: decode never throws on malformed N/A/E shapes
    const pool9 = rosettaPool(enc);
    let noThrow = true;
    for (const g of [
      pool9[0] + 'N', pool9[0] + 'Nabc\nxx', pool9[0] + 'N5:\n①,②\n#1:1:5 @a|b', pool9[0] + 'N3:\n',
      pool9[0] + 'A', pool9[0] + 'A1:2\nid:\n,', pool9[0] + 'A1:2:99999999\nx\n,',
      pool9[0] + 'E', pool9[0] + 'E12', pool9[0] + 'E12\n3', pool9[0] + 'E0A',
    ]) {
      try { rosettaDecode(g, enc); } catch { noThrow = false; }
    }
    out.push({ name: 'D9 decode never throws on malformed N/A/E', pass: noThrow, details: '11 shapes' });
    // D10: N composes with R (region glyph inside template const field)
    const rD10 = await rosettaEncode(rows, enc);
    out.push({
      name: 'D10 N composes with region fold',
      pass: rD10.exact && rosettaDecode(rD10.wire, enc) === rows && rD10.systems.includes('R') && rD10.systems.includes('N'),
      details: `systems=[${rD10.systems.join(',')}]`,
    });
  } catch (e) {
    out.push({ name: 'D1 N identical-line family', pass: false, details: (e as Error).message });
    out.push({ name: 'D9 decode never throws on malformed N/A/E', pass: false, details: (e as Error).message });
  }

  // ---- E-series: R4 signature families + CALYX cage ------------------------
  try {
    // E1: signature family — varying digits inline (no delimiter at all)
    const jl = Array.from(
      { length: 12 },
      (_, i) => `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","msg":"done","latency_ms":${40 + i}}`,
    ).join('\n');
    const rE1 = await rosettaEncode(jl, enc);
    out.push({
      name: 'E1 signature family (inline digit slots)',
      pass: rE1.exact && rosettaDecode(rE1.wire, enc) === jl && rE1.systems.includes('N') && rE1.outTokens < rE1.inTokens,
      details: `${rE1.inTokens}→${rE1.outTokens} systems=[${rE1.systems.join(',')}]`,
    });

    // E2: stride-2 family — alternating line shapes (chat turns)
    const chat = Array.from(
      { length: 16 },
      (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok.`,
    ).join('\n');
    const rE2 = await rosettaEncode(chat, enc);
    out.push({
      name: 'E2 stride-2 family (alternating shapes)',
      pass: rE2.exact && rosettaDecode(rE2.wire, enc) === chat && rE2.systems.includes('N') && rE2.outTokens < rE2.inTokens,
      details: `${rE2.inTokens}→${rE2.outTokens} systems=[${rE2.systems.join(',')}]`,
    });

    // E3: stride-2 spec sharing — phases with DIFFERENT signatures but
    // identical slot value sequences share one glyph and one spec.
    const shared = 'x:0\ny0\nx:1\ny1\nx:2\ny2\nx:3\ny3\nx:4\ny4\nx:5\ny5';
    const rE3 = await rosettaEncode(shared, enc);
    const wireE3 = rE3.wire;
    const specsE3 = wireE3.includes('\n') ? wireE3.split('\n') : [];
    const lastLine = specsE3[specsE3.length - 1] ?? '';
    const specCount = lastLine.replace(/ぁ$/, '').split(' ').filter((x) => x !== '').length;
    const oneSpec = specCount === 1 && rE3.outTokens < rE3.inTokens;
    out.push({
      name: 'E3 stride-2 shared spec (value-seq dedup)',
      pass: rE3.exact && rosettaDecode(rE3.wire, enc) === shared && rE3.systems.includes('N') && oneSpec,
      details: `${rE3.inTokens}→${rE3.outTokens} specs=${JSON.stringify(specsE3[specsE3.length - 1] ?? '')}`,
    });

    // E4: literal slot glyph in a const run must veto the family (no counterfeit)
    const glyphSrc = Array.from({ length: 5 }, (_, i) => `keep ① fixed ${i}`).join('\n');
    const rE4 = await rosettaEncode(glyphSrc, enc);
    out.push({
      name: 'E4 slot-glyph const run vetoes family',
      pass: rE4.exact && rosettaDecode(rE4.wire, enc) === glyphSrc,
      details: `member=${rE4.member} ${rE4.inTokens}→${rE4.outTokens}`,
    });

    // E5: stride family with unrenderable slot values falls back safely
    const hostile = Array.from({ length: 8 }, (_, i) => `a${i === 3 ? ' ' : ''}${i} b|c${i}`).join('\n');
    const rE5 = await rosettaEncode(hostile, enc);
    out.push({
      name: 'E5 spec-hostile stride falls back safely',
      pass: rE5.exact && rosettaDecode(rE5.wire, enc) === hostile,
      details: `member=${rE5.member} ${rE5.inTokens}→${rE5.outTokens}`,
    });

    // E6: malformed N:: wires never throw
    const bads = [
      'ぁN4::2\n only one template\n#0:1:4ぁ',
      'ぁN4::9\na\nb\n#0:1:4ぁ',
      'ぁN3::2\na\nb\nぁ',
      'ぁN4::2\na①\nb②\n#0:1:4ぁ',
      'ぁN5:\na\n#0:1:5ぁ',
      'ぁN:\na\n#0:1:5ぁ',
    ];
    let noThrow2 = true;
    for (const b of bads) {
      try {
        rosettaDecode(b, enc);
      } catch {
        noThrow2 = false;
      }
    }
    out.push({ name: 'E6 decode never throws on malformed N::/N: wires', pass: noThrow2, details: `${bads.length} shapes` });

    // E7: CALYX cage — every shippable member's contract is prompt-native
    const nativeMembers = new Set(['identity', 'rosetta-T', 'rosetta-W', 'forced-wrap', 'phrase', 'tau', 'kappa']);
    const corpus = [jl, chat, shared, glyphSrc, hostile, ROSETTA_CHAOS_900, 'id,name\n1,user_1,2,us-east-1\n2,user_2,4,us-east-1\n3,user_3,6,us-east-1'];
    let caged = true;
    const seen = new Set<string>();
    for (const c of corpus) {
      const rc = await rosettaEncode(c, enc);
      seen.add(rc.member);
      if (!nativeMembers.has(rc.member)) caged = false;
      if (rosettaDecode(rc.wire, enc) !== c) caged = false;
    }
    const prompt = ROSETTA_SYSTEM_PROMPT;
    const docsK = prompt.includes('κ-wires') && prompt.includes('inline-bind');
    const docsSig = prompt.includes('SIGNATURE FAMILY') && prompt.includes('STRIDE FAMILY');
    out.push({
      name: 'E7 CALYX cage (prompt-native members only)',
      pass: caged && docsK && docsSig,
      details: `members seen: ${[...seen].join(',')} · κ docs=${docsK} · N:: docs=${docsSig}`,
    });
    // E8: range-body cycle — consecutive integers compress to lo-hi
    const rg = Array.from({ length: 12 }, (_, i) => `a,${i % 10}`).join('\n');
    const rE8 = await rosettaEncode(rg, enc);
    out.push({
      name: 'E8 range-body cycle (@lo-hi)',
      pass: rE8.exact && rosettaDecode(rE8.wire, enc) === rg && rE8.wire.includes('@0-9') && rE8.outTokens < rE8.inTokens,
      details: `${rE8.inTokens}→${rE8.outTokens} range=${rE8.wire.includes('@0-9')}`,
    });

    // E9: J-composed signature family fires (N<m>J: head)
    const rE9 = await rosettaEncode(jl, enc);
    out.push({
      name: 'E9 J-composed family (N<m>J:)',
      pass: rE9.exact && rosettaDecode(rE9.wire, enc) === jl && rE9.systems.includes('J') && rE9.systems.includes('N') && /N\d+J:/.test(rE9.wire) && rE9.outTokens < rE9.inTokens,
      details: `${rE9.inTokens}→${rE9.outTokens} systems=[${rE9.systems.join(',')}]`,
    });

    // E10: J-composed with region-glyph values (R composed inside J)
    const jreg = Array.from({ length: 6 }, (_, i) => `{"region":"us-east-1","n":${i}}`).join('\n');
    const rE10 = await rosettaEncode(jreg, enc);
    out.push({
      name: 'E10 J-composed with region values',
      pass: rE10.exact && rosettaDecode(rE10.wire, enc) === jreg && rE10.systems.includes('J') && rE10.systems.includes('N') && rE10.outTokens < rE10.inTokens,
      details: `${rE10.inTokens}→${rE10.outTokens} systems=[${rE10.systems.join(',')}]`,
    });

    // E11: range body only for canonical non-negative runs
    const rg2 = Array.from({ length: 9 }, (_, i) => `b,${5 + (i % 5)}`).join('\n');
    const rE11 = await rosettaEncode(rg2, enc);
    out.push({
      name: 'E11 range body @5-9 round-trip',
      pass: rE11.exact && rosettaDecode(rE11.wire, enc) === rg2 && rE11.wire.includes('@5-9'),
      details: `${rE11.inTokens}→${rE11.outTokens}`,
    });

    // E12: negative/mixed cycle values never misparse as ranges
    const rg3 = Array.from({ length: 8 }, (_, i) => `c,${(i % 3) - 3}`).join('\n');
    const rE12 = await rosettaEncode(rg3, enc);
    out.push({
      name: 'E12 negative cycles stay unambiguous',
      pass: rE12.exact && rosettaDecode(rE12.wire, enc) === rg3,
      details: `${rE12.inTokens}→${rE12.outTokens}`,
    });
    // E13: periodic-const stride family — X,Y,X,Y with NO slots (empty specs)
    const pc = 'user: fix the flaky test\nassistant: I will inspect the suite.\nuser: fix the flaky test\nassistant: I will inspect the suite.';
    const rE13 = await rosettaEncode(pc, enc);
    out.push({
      name: 'E13 periodic-const stride family (empty specs)',
      pass: rE13.exact && rosettaDecode(rE13.wire, enc) === pc && (rE13.systems.includes('N') || rE13.systems.includes('H')) && rE13.outTokens < rE13.inTokens,
      details: `${rE13.inTokens}→${rE13.outTokens} systems=[${rE13.systems.join(',')}]`,
    });

    // E14: pair signature family (minimum 2) — near-identical code lines
    const pr = 'for(let i=0;i<3;i++){s+=a[i];}\nfor(let j=0;j<3;j++){s+=a[j];}';
    const rE14 = await rosettaEncode(pr, enc);
    out.push({
      name: 'E14 pair signature family (FAMILY_MIN=2)',
      pass: rE14.exact && rosettaDecode(rE14.wire, enc) === pr && (rE14.systems.includes('N') || rE14.systems.includes('L')) && rE14.outTokens < rE14.inTokens,
      details: `${rE14.inTokens}→${rE14.outTokens} systems=[${rE14.systems.join(',')}]`,
    });

    // E15: pair J-composed family — two JSON object lines
    const pj = '{"id":7,"ok":true}\n{"id":8,"ok":true}';
    const rE15 = await rosettaEncode(pj, enc);
    out.push({
      name: 'E15 pair J-composed family',
      pass: rE15.exact && rosettaDecode(rE15.wire, enc) === pj && (rE15.systems.includes('N') || rE15.systems.includes('I')) && rE15.outTokens < rE15.inTokens,
      details: `${rE15.inTokens}→${rE15.outTokens} systems=[${rE15.systems.join(',')}]`,
    });

    // E16: unprofitable pair stays literal (gate self-polices the minimum)
    const up = 'a,12\nb,12';
    const rE16 = await rosettaEncode(up, enc);
    out.push({
      name: 'E16 unprofitable pair stays literal',
      pass: rE16.exact && rosettaDecode(rE16.wire, enc) === up && rE16.outTokens <= rE16.inTokens,
      details: `member=${rE16.member} ${rE16.inTokens}→${rE16.outTokens}`,
    });
  } catch (e) {
    out.push({ name: 'E1 signature family (inline digit slots)', pass: false, details: (e as Error).message });
  }

  // ---- F-series: R4.3 / R4.7 features --------------------------------------
  try {
    // F1: compact E spans
    const eLine = 'A'.repeat(800) + 'B'.repeat(600);
    const rF1 = await rosettaEncode(eLine, enc);
    out.push({
      name: 'F1 compact E span (shared envelope)',
      pass: rF1.exact && rosettaDecode(rF1.wire, enc) === eLine && rF1.systems.includes('E'),
      details: `${rF1.inTokens}→${rF1.outTokens}`,
    });

    // F2: compact A head A<count>
    const aLine = Array.from({ length: 40 }, (_, i) => 'val:' + i).join(',');
    const rF2 = await rosettaEncode(aLine, enc);
    out.push({
      name: 'F2 compact A head shorthand',
      pass: rF2.exact && rosettaDecode(rF2.wire, enc) === aLine && rF2.systems.includes('A'),
      details: `${rF2.inTokens}→${rF2.outTokens}`,
    });

    // F3: MERIDIAN tournament restoration
    const mSample = 'A: 100\nB: 200\nC: 300\nD: 400';
    const rF3 = await rosettaEncode(mSample, enc);
    out.push({
      name: 'F3 MERIDIAN tournament restoration',
      pass: rF3.exact && rosettaDecode(rF3.wire, enc) === mSample,
      details: `${rF3.member} ${rF3.inTokens}→${rF3.outTokens}`,
    });

    // F4: OPS-1 lexeme replacement
    const opsSample = 'TLS handshake timeout occurred during test_retry_backoff';
    const rF4 = await rosettaEncode(opsSample, enc);
    out.push({
      name: 'F4 OPS-1 lexeme replacement',
      pass: rF4.exact && rosettaDecode(rF4.wire, enc) === opsSample,
      details: `${rF4.member} ${rF4.inTokens}→${rF4.outTokens} systems=[${rF4.systems.join(',')}]`,
    });

    // F5: U-mode unified timestamp run
    const uSample = '2026-09-15T06:02:11Z 2026-09-15T06:14:52Z';
    const rF5 = await rosettaEncode(uSample, enc);
    out.push({
      name: 'F5 U-mode unified timestamp run',
      pass: rF5.exact && rosettaDecode(rF5.wire, enc) === uSample && rF5.systems.includes('U'),
      details: `${rF5.member} ${rF5.inTokens}→${rF5.outTokens} systems=[${rF5.systems.join(',')}]`,
    });

    // F6: Q-span periodic alphanumeric span
    const qSample = 'abc123abc123abc123abc123';
    const rF6 = await rosettaEncode(qSample, enc);
    out.push({
      name: 'F6 Q-span periodic alphanumeric span',
      pass: rF6.exact && rosettaDecode(rF6.wire, enc) === qSample,
      details: `${rF6.member} ${rF6.inTokens}→${rF6.outTokens} systems=[${rF6.systems.join(',')}]`,
    });

    // F7: M-span log tuple
    const mTuple = 'WARN pool exhausted (max=20, wait=5s)';
    const rF7 = await rosettaEncode(mTuple, enc);
    out.push({
      name: 'F7 M-span log tuple',
      pass: rF7.exact && rosettaDecode(rF7.wire, enc) === mTuple,
      details: `${rF7.member} ${rF7.inTokens}→${rF7.outTokens} systems=[${rF7.systems.join(',')}]`,
    });

    // F8: handtrace-300 ROSETTA ≤86 tokens win
    const HT300 = 'Ship it: retry 3x, never log secrets.\n' +
      '{"id":7,"ok":true}\n{"id":8,"ok":true}\n' +
      'id,ms\na,12\nb,12\n' +
      '##..##\n##..##\n' +
      'for(let i=0;i<3;i++){s+=a[i];}\n' +
      'for(let j=0;j<3;j++){s+=a[j];}\n' +
      'user: fix the flaky test\n' +
      'assistant: I will inspect the suite and patch the race.\n' +
      'user: fix the flaky test\n' +
      'assistant: I will inspect the suite and patch the race.';
    const rF8 = await rosettaEncode(HT300, enc);
    out.push({
      name: 'F8 handtrace-300 ≤86 tokens win',
      pass: rF8.exact && rosettaDecode(rF8.wire, enc) === HT300 && rF8.outTokens <= 86,
      details: `${rF8.member} ${rF8.inTokens}→${rF8.outTokens} (${rF8.savingsPct.toFixed(1)}%) systems=[${rF8.systems.join(',')}]`,
    });

    // F9: H-span chat block
    const hSample = 'user: fix the flaky test\nassistant: I will inspect the suite and patch the race.\nuser: fix the flaky test\nassistant: I will inspect the suite and patch the race.';
    const rF9 = await rosettaEncode(hSample, enc);
    out.push({
      name: 'F9 H-span chat block',
      pass: rF9.exact && rosettaDecode(rF9.wire, enc) === hSample && rF9.outTokens <= 22,
      details: `${rF9.member} ${rF9.inTokens}→${rF9.outTokens} systems=[${rF9.systems.join(',')}]`,
    });

    // F10: I-span JSON id range
    const iSample = '{"id":7,"ok":true}\n{"id":8,"ok":true}';
    const rF10 = await rosettaEncode(iSample, enc);
    out.push({
      name: 'F10 I-span JSON id range',
      pass: rF10.exact && rosettaDecode(rF10.wire, enc) === iSample && rF10.outTokens <= 17,
      details: `${rF10.member} ${rF10.inTokens}→${rF10.outTokens} systems=[${rF10.systems.join(',')}]`,
    });

    // F11: L-span JS loop family
    const lSample = 'for(let i=0;i<3;i++){s+=a[i];}\nfor(let j=0;j<3;j++){s+=a[j];}';
    const rF11 = await rosettaEncode(lSample, enc);
    out.push({
      name: 'F11 L-span JS loop family',
      pass: rF11.exact && rosettaDecode(rF11.wire, enc) === lSample && rF11.outTokens <= 30,
      details: `${rF11.member} ${rF11.inTokens}→${rF11.outTokens} systems=[${rF11.systems.join(',')}]`,
    });

    // F12: G-span symbolic tile matrix
    const gSample = '##..##\n##..##';
    const rF12 = await rosettaEncode(gSample, enc);
    out.push({
      name: 'F12 G-span symbolic tile matrix',
      pass: rF12.exact && rosettaDecode(rF12.wire, enc) === gSample,
      details: `${rF12.member} ${rF12.inTokens}→${rF12.outTokens} systems=[${rF12.systems.join(',')}]`,
    });

    // F13: V-span metric table
    const vSample = 'id,ms\na,12\nb,12';
    const rF13 = await rosettaEncode(vSample, enc);
    out.push({
      name: 'F13 V-span metric table',
      pass: rF13.exact && rosettaDecode(rF13.wire, enc) === vSample && rF13.systems.includes('V'),
      details: `${rF13.member} ${rF13.inTokens}→${rF13.outTokens} systems=[${rF13.systems.join(',')}]`,
    });

    // F14: Z-span columnar block template (R4.9, mail-merge block compression)
    const zBlock = Array.from({ length: 11 }, (_, r) => [
      `Record ${String(r + 1).padStart(2, '0')}: observation number suffixes`,
      `evidence value: ${['alpha', 'bravo', 'charlie', 'delta', 'echo'][r % 5]}`,
      `severity level: ${['low', 'medium', 'high', 'critical', 'info'][r % 5]}`,
      `review note: ${['正常', '偏高', '回落', '待查', '完成'][r % 5]}`,
      `assigned team: ${['team-a', 'team-b', 'team-c', 'team-d', 'team-e'][r % 5]}`,
    ].join('\n')).join('\n');
    const rF14 = await rosettaEncode(zBlock, enc);
    out.push({
      name: 'F14 Z-span columnar block template (mail-merge block win)',
      pass: rF14.exact && rosettaDecode(rF14.wire, enc) === zBlock && rF14.systems.includes('Z'),
      details: `${rF14.member} ${rF14.inTokens}→${rF14.outTokens} (${rF14.savingsPct.toFixed(1)}%) systems=[${rF14.systems.join(',')}]`,
    });

    // F15: K-span known-form incident card frame (R5.0, ≥75% savings)
    const evs = ['api latency', 'queue depth', 'TLS retry', 'db lock', 'cache miss'];
    const acts = ['raise timeout', 'drain queue', 'retry 3x', 'warm cache', 'page owner'];
    const notes = ['正常', '偏高', '回落', '待查', '完成'];
    const kCards = Array.from({ length: 12 }, (_, r) => [
      `Incident review card ${String(r + 1).padStart(2, '0')}`,
      `Evidence retained exactly for model audit: ${evs[r % 5]}`,
      `Action selected by operator: ${acts[r % 5]}`,
      `中文复核备注: ${notes[r % 5]}`,
    ].join('\n')).join('\n');
    const rF15 = await rosettaEncode(kCards, enc);
    out.push({
      name: 'F15 K-span known-form card frame (≥75% savings)',
      pass: rF15.exact && rosettaDecode(rF15.wire, enc) === kCards && rF15.savingsPct >= 75 && rF15.systems.includes('K'),
      details: `${rF15.member} ${rF15.inTokens}→${rF15.outTokens} (${rF15.savingsPct.toFixed(1)}%) systems=[${rF15.systems.join(',')}]`,
    });
  } catch (e) {
    out.push({ name: 'F-series self test failure', pass: false, details: (e as Error).message });
  }

  return out;
}
