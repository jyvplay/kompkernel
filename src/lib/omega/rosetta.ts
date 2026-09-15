/**
 * src/lib/omega/rosetta.ts
 * =============================================================================
 * ROSETTA-R2 — Notational transposition (dual-spelling argmin) + gated Pareto
 * (R2 = R1 + table/YAML/JSON-family span systems P/Y/F + the τ member lane)
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
import { signetEncode, signetDecode } from './signet';
import { strataEncode, strataDecode } from './strata';
import { tesseraEncode, tesseraDecode } from './tessera';
import { columnEncode, columnDecode } from './column';
import { trieEncode, trieDecode } from './trie';
import { repairEncode, repairDecode } from './repair';
import { stencilEncode, stencilDecode } from './stencil';
import { morphEncode, morphDecode } from './morph';
import { helixEncode, helixDecode } from './helix';
import { pulseEncode, pulseDecode } from './pulse';
import { meridianEncode, meridianDecode } from './meridian';
import { quasarEncode, quasarDecode } from './quasar';
import { plexusDecode } from './plexus';
import { veritasDecode } from './veritas';
import { anaphoraDecode } from './anaphora';
import { axiomDecode } from './axiom';
import { mosaicEncode, mosaicDecode, type MosaicResult } from './mosaic';
import { orbitEncode, type OrbitResult } from './orbit';
import { kappaEncode, kappaDecode, KAPPA_SENTINEL } from './kappa';
import { phraseEncode, phraseDecode, phraseFold, hasCodebookGlyph, phraseCodebook, PHRASE_SENTINEL, PHRASE_LITERAL } from './phrase';
import { tauEncode, tauDecode, TAU_SENTINEL, TAU_LITERAL, pipeSpan, commaSpan, yamlFromLines } from './tau';
import { crownEncodeCached, crownDecode, type CrownResult } from './crown';
import { spliceEncode, spliceDecode, type SpliceResult } from './splice';
import { eidolonProject } from './eidolon';
import { ltpProject } from './ltp';

/* --------------------------- versioned static tables ----------------------- */

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
      if (v.length === 0) return null; // '' is ambiguous with empty string
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
      pairs.push({ key: k, val: parts.join('|') });
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
  /** mark + '\n' + body, or null when nothing transposed. */
  wire: string | null;
  mark: string;
  windowStart: number;
  systems: string[];
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

  // ---- per-line structural pass (J, C) with inline TS ----------------------
  // `lines` are region-passed; `srcLines` are the original source lines. The
  // region pass never adds or removes a newline, so indices stay aligned.
  const lines = t.split('\n');
  const srcLines = text.split('\n');
  const outLines: string[] = [];
  const systems = new Set<string>([...(folded !== null ? ['W'] : []), ...(hasRegions ? ['R'] : [])]);
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

    // ---- R2 run systems: pipe tables (P), JSON line families (F), YAML (Y) --
    // These consume WHOLE RUNS of lines, so they are detected before the
    // per-line J/C logic. G1: the expanded render must equal the SOURCE run;
    // profitability is measured on the transformed run vs the span.
    {
      // pipe run
      let j = li;
      while (j < lines.length && lines[j].startsWith('|')) j++;
      if (j - li >= 2) {
        const run = lines.slice(li, j);
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
          const run = lines.slice(li, j2);
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

  // W-wires carry the flag line so the decoder reaches phrase mode; the flag
  // glyph is window-reserved, so it can never occur in a plain wire's body.
  const wire = folded !== null ? mark + '\n' + pool[k + 1 + RNS1_REGIONS.length] + '\n' + body : mark + '\n' + body;
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
 * Total decoder for ROSETTA wires. A wire is ROSETTA's iff it starts with a
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
    // HELIX is an inline-glyph lane (no line sentinel): a wire containing its
    // glyph is a helix wire — the same default mosaic's bareDecode applies.
  if (wire.includes('⟐')) return helixDecode(wire);
  if (wire.length >= 2 && wire[1] === '\n') {
    const pool = rosettaPool(enc);
    const idx = pool.indexOf(wire[0]);
    if (idx >= 0) {
      const mark = pool[idx];
      const regionByGlyph = new Map<string, string>();
      for (let i = 0; i < RNS1_REGIONS.length; i++) {
        regionByGlyph.set(pool[idx + 1 + i], RNS1_REGIONS[i]);
      }
      // W-wire: the flag glyph (window-reserved, never a region glyph, never
      // in a plain body) followed by a newline switches on phrase expansion.
      // The Y-separator glyph is two window slots past the region table.
      const flag = pool[idx + 1 + RNS1_REGIONS.length];
      const ysep = pool[idx + 2 + RNS1_REGIONS.length] ?? null;
      if (flag !== undefined && wire.length >= 4 && wire[2] === flag && wire[3] === '\n') {
        return expandBody(wire.slice(4), mark, regionByGlyph, phraseCodebook(enc).byGlyph, ysep);
      }
      return expandBody(wire.slice(2), mark, regionByGlyph, null, ysep);
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

const HEAVY_MEMBER_CAP = 6_000; // chars; heavy members/compositions above this

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
  // If the SOURCE itself would be misread by rosettaDecode (it starts with a
  // member sentinel or a pool glyph + newline, or contains the inline HELIX
  // glyph), a bare identity wire is withheld and a marked literal wire is
  // offered instead — the same discipline as MOSAIC's sentinel force-wrap.
  const ambiguousIdentity =
    (text.length >= 2 && text[1] === '\n' && rosettaPool(enc).includes(text[0])) ||
    text.includes('⟐') ||
    ['[MZ1]\n', '[SG1]\n', '[P1]\n', '[M1]\n', '⟨QSR⟩\n', '[PX]\n', '[[VX1\n', '[AX1]\n',
     '[TS1]\n', '[ST1]\n', '[RP1]\n', '[TR1]\n', '[CL1]\n', '[SP1]\n', '[⌘STENCIL]', '[Ϻ]', 'κ\n',
     'φ', 'τ\n', 'ττ\n']
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
      const wrapWire = rosettaPool(enc)[k] + '\n' + text;
      admit('forced-wrap', wrapWire, () => rosettaDecode(wrapWire, enc), [], true);
    }
    // If no clear window exists either, no safe wrap is possible; the final
    // identity fallback below carries an explicit decode caveat in `notes`.
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

  {
    const r = signetEncode(text, enc);
    if (r.exact && r.decoded === text) admit('signet', r.wire, () => signetDecode(r.wire));
    const s = strataEncode(text, enc);
    if (s.exact && s.decoded === text) admit('strata', s.wire, () => strataDecode(s.wire));
    const te = tesseraEncode(text, enc);
    if (te.exact && te.decoded === text) admit('tessera', te.wire, () => tesseraDecode(te.wire));
    const c = columnEncode(text, enc);
    if (c.applied && c.decoded === text) admit('column', c.wire, () => columnDecode(c.wire));
    const ti = trieEncode(text, enc);
    if (ti.applied && ti.decoded === text) admit('trie', ti.wire, () => trieDecode(ti.wire));
    const rp = repairEncode(text, enc);
    if (rp.applied && rp.decoded === text) admit('repair', rp.wire, () => repairDecode(rp.wire));
    const st = stencilEncode(text, enc);
    if (st.exact && st.applied && st.decoded === text) admit('stencil', st.wire, () => stencilDecode(st.wire));
    const mo = morphEncode(text, enc);
    if (mo.exact && mo.applied && mo.decoded === text) admit('morph', mo.wire, () => morphDecode(mo.wire));
    const he = helixEncode(text, enc);
    if (he.exact && he.decoded === text) admit('helix', he.wire, () => helixDecode(he.wire));
    const pu = pulseEncode(text, enc);
    if (pu.exact && pu.decoded === text) admit('pulse', pu.wire, () => pulseDecode(pu.wire));
    const me = meridianEncode(text, enc);
    if (me.exact && me.decoded === text) admit('meridian', me.wire, () => meridianDecode(me.wire));
    const qa = quasarEncode(text, enc);
    if (qa.exact && qa.decoded === text) admit('quasar', qa.wire, () => quasarDecode(qa.wire));
    // KAPPA — inline-bind token macros (parameterized repeats); identity-
    // fallback wires are blocked by the same ambiguity guard as identity.
    const kp = kappaEncode(text, enc);
    if (kp.exact && kp.decoded === text) admit('kappa', kp.wire, () => kappaDecode(kp.wire, enc));
  }

  // ORBIT — contains APEX/MOSAIC/SIGNET/STRATA/TESSERA/AXIOM/ANAPHORA/
  // MERIDIAN/QUASAR/PLEXUS/PULSE/HELIX/VERITAS.
  try {
    const orbit = supplied.orbit ?? (await orbitEncode(text, enc));
    if (orbit.exact && orbit.decoded === text) {
      // ORBIT emits the winning member's wire verbatim; mosaicDecode already
      // dispatches on every member sentinel (its bareDecode is total).
      admit('orbit', orbit.wire, () => mosaicDecode(orbit.wire));
    }
  } catch {
    audit.push({ member: 'orbit', tokens: -1, exact: false });
  }

  if (text.length <= HEAVY_MEMBER_CAP) {
    try {
      const crown = supplied.crown ?? (await crownEncodeCached(text, enc));
      if (crown.exact && crown.decoded === text) {
        admit('crown', crown.wire, () => crownDecode(crown.wire));
      }
    } catch {
      audit.push({ member: 'crown', tokens: -1, exact: false });
    }
    try {
      const sp = supplied.splice ?? spliceEncode(text, enc);
      if (sp.exact && sp.decoded === text) {
        admit('splice', sp.wire, () => spliceDecode(sp.wire));
      }
    } catch {
      audit.push({ member: 'splice', tokens: -1, exact: false });
    }
  }

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
    '# ⟿ ROSETTA-R2 — byte-exact notational transposition wire',
    'A ROSETTA message is: <glyph>\\n<body>. The first glyph comes from the',
    'ROSETTA glyph pool (version-stable, tokenizer-verified single-token',
    'characters; reference: rosettaPool in src/lib/omega/rosetta.ts). Its pool',
    'index k anchors the codebook: glyph pool[k] is the span marker; glyph',
    `pool[k+1+i] denotes region i of the RNS-1 table (${RNS1_REGIONS.length} cloud`,
    'regions, in the fixed order shipped in rosetta.ts).',
    'Decode <body> left to right:',
    '1. marker + 15-30 digit/T/Z run → an ISO-8601 BASIC instant; re-render it',
    '   in EXTENDED form (insert dashes and colons: 20260915T060211Z →',
    '   2026-09-15T06:02:11Z; a ±HHMM offset becomes ±HH:MM).',
    '2. marker + J + pairs + marker → a JSON object. Pairs are key=value',
    '   separated by single spaces. A quoted value is a string; a bare value',
    '   is true/false/null, a number, or a string; a|b|c is an array. Rebuild',
    '   the exact compact JSON {"k":v,…} preserving key order.',
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
    'Nested marker+timestamp spans inside J, C, P and F payloads expand too.',
    'W-wires: when the first body line is a single pool glyph followed by \\n',
    '(the phrase flag, pool[k+1+RNS-1 size]), every Hangul syllable of the',
    'PHRASEBOOK-φ1 codebook (versioned in src/lib/omega/phrase.ts) in the body',
    'expands to its phrase — a folded multi-token spelling restored as one',
    'glyph. Wires starting φ or φφ are PHRASEBOOK member wires: decode',
    'them with the φ codebook rules (φφ = forced literal wrap, strip 2).',
    'Wires starting τ\\n or ττ\\n are TAU-τ1 member wires: decode them with',
    'the τ table/YAML transposition rules (ττ\\n = forced literal wrap,',
    'strip 3).',
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
      name: 'C5 handtrace κ lane win (≤108, prev best 109)',
      pass: r.exact && rosettaDecode(r.wire, enc) === HT && r.outTokens <= 108,
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

  return out;
}
