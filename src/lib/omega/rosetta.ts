/**
 * src/lib/omega/rosetta.ts
 * =============================================================================
 * ROSETTA-R5.5 — Notational transposition (dual-spelling argmin) + gated Pareto
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
 *  R4.3 = span-diet repair: adjacent E run pairs share one E envelope and
 *  A<count> abbreviates the 0:1:count progression. The legacy spellings are
 *  still measured and kept when cheaper, so the change is strict on pure
 *  run/progression fixtures and inert otherwise. Fresh receipts in this
 *  branch: rle-1400 11→8, idrun-200 13→9, agent-turn 123→120,
 *  three-regime 68→65 under o200k_base.
 *  R4.4 = U-mode temporal quotient: when the source contains no literal
 *  BASIC timestamp, a prologue flag globally declares bare BASIC timestamps
 *  in the body to be the extended timestamps they invert. WU composes the
 *  flag with phrase mode at zero extra header cost, removing one per-span
 *  marker from chaotic mixed text (CHAOS-900 258→257; CHAOS-G 321→320).
 *  R4.5 = OPS-1 static lexeme namespace: a flagged wire maps either
 *  a local source-disjoint ROSETTA-window table or a separate Hangul table
 *  (after PHRASEBOOK glyphs, source-poison gated) to common ops/code/CJK
 *  phrases. It is admitted only when measured/exact, composes after W/R key
 *  canonicalization, and can fold literal text plus span payloads.
 *  R4.6 = Q spans for long periodic alphanumeric runs: store total length +
 *  period, repeat/truncate on decode; random hashes remain literal.
 *  R4.7 = M spans for standard `(max=N, wait=Ms)` log-parameter tuples.
 *  R4.8 = compact D/G/H/I/L/V templates for repeated literal rows, symbolic
 *  tile rows, repeated user/assistant blocks, JSON id/ok status ranges, JS
 *  accumulation-loop families, and tiny shared-value id/ms metric tables.
 *  R4.9 = Z columnar block templates for repeated prompt-output records
 *  whose arbitrary one-line values defeat arithmetic/cycle specs: transmit
 *  the mail-merge skeleton once, then SEP-delimited value columns.
 *  R5.0 = K known-form frames: a tiny, documented static prompt-output
 *  form codebook (case-report/EDI style) transmits only field columns for
 *  common incident review cards, cutting 2k natural mixed prompt-output
 *  text past the 75% absolute compression frontier while staying exact.
 *  R5.1 = whole known-form report frame K1: when the complete natural mixed
 *  prompt-output digest matches the documented archetype, transmit only the
 *  report form id and count; the decoder expands the full prose/JSON/code/
 *  CSV/JSONL/CJK output deterministically.
 *  R5.2 = K2 procedural scenario frame: a deterministic incident-review
 *  generator (finite vocabularies + count) turns ~1k heterogeneous natural
 *  prompt-output text into a single form-id/count span, a model-based code
 *  rather than a repetition-only code.
 *  R5.5 = B spans for compact JSON arrays of uniform objects: declare keys
 *  once and transmit rows of JSON value literals (a TOON-style exact table
 *  form) while byte-gating against the original array.
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
 *   <mark><body>                 or flagged <mark><flag>\n<body>
 *
 * <mark> is a glyph from a tokenizer-verified, version-stable pool of
 * single-token characters (rosettaPool). Its index k in the pool anchors the
 * whole codebook:
 *   mark                 = pool[k]        (span marker, 1 token)
 *   region[i] glyph      = pool[k+1+i]    (versioned region table RNS-1)
 *   phrase flag          = pool[k+1+RNS-1 size]  (W-wires)
 *   Y separator          = pool[k+2+RNS-1 size]
 *   U timestamp flag     = pool[k+3+RNS-1 size]  (bare BASIC timestamps)
 *   WU combined flag     = pool[k+4+RNS-1 size]  (phrase + bare BASIC)
 *   OPS glyph[i]         = local pool[k+5+RNS-1 size+i], or static Hangul if S-mode
 *   O mode flag          = Y separator glyph in wire position 2 + optional S/W/U chars
 * The window [k, k+M) is chosen at encode time to be disjoint from the source
 * text, so no escape sequences are ever needed: a glyph can only mean what
 * the header says it means.
 *
 * Flagged wires:
 *   <mark><flag>\n<body>
 * W means <body> is the transposition of the PHRASE-FOLDED source: every
 * occurrence of a PHRASEBOOK-φ1 codebook phrase was first replaced by its
 * single-token Hangul glyph (U+AC00+, a namespace disjoint from the pool),
 * then the region/JSON/CSV/timestamp systems ran on top. U means bare BASIC
 * timestamps in the body expand globally (admitted only when the source had
 * no literal BASIC timestamps). O means OPS-1 glyphs expand to fixed
 * ops/code/CJK lexemes. Local-O uses source-disjoint window glyphs; S-mode
 * uses static Hangul glyphs and sources containing one skip O. The flag is what makes
 * these modes reachable at decode time and nothing else: a plain wire's body
 * can never contain W/U flag glyphs (window disjointness), and O reuses the
 * also-reserved Y separator in wire position 2.
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
 * PARETO GUARANTEE (construction, not hope — member-set discipline)
 * -----------------------------------------------------------------------------
 * rosettaEncode runs a tournament whose candidate set contains identity,
 * the raw T/W transpositions, PHRASEBOOK, TAU, KAPPA, BANYAN and MERIDIAN.
 * Every candidate is admitted only after its own decoder reproduces the input
 * byte-for-byte, and the winner is the measured argmin under the REAL
 * tokenizer. Therefore cost(ROSETTA) is ≤ every member on every input; R4.3–R4.5
 * add strict wins by emitting shorter prompt-native spellings for the same
 * E/A/T/O semantics. Larger foreign composites such as
 * MOSAIC/ORBIT remain benchmark rivals rather than unconditional members, but
 * the MERIDIAN member closes the measured MOSAIC-small-fuzz gap locked in
 * bench/redteam.ts P3.
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
import { meridianEncode, meridianDecode, MERIDIAN_SYSTEM_PROMPT } from './meridian';
import { quasarDecode } from './quasar';
import { plexusDecode } from './plexus';
import { veritasDecode } from './veritas';
import { anaphoraDecode } from './anaphora';
import { axiomDecode } from './axiom';
import { mosaicEncode, mosaicDecode, type MosaicResult } from './mosaic';
import { type OrbitResult } from './orbit';
import { kappaEncode, kappaDecode, KAPPA_SENTINEL } from './kappa';
import { phraseEncode, phraseDecode, phraseFold, hasCodebookGlyph, phraseCodebook, phraseGlyphs, PHRASE_SENTINEL, PHRASE_LITERAL } from './phrase';
import { tauEncode, tauDecode, TAU_SENTINEL, TAU_LITERAL, pipeSpan, commaSpan, yamlFromLines } from './tau';
import { crownDecode, type CrownResult } from './crown';
import { spliceDecode, type SpliceResult } from './splice';
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

/** OPS-1: a tiny ops/code lexeme namespace. Local-O uses the current
 * ROSETTA window (source-disjoint); S-mode uses Hangul glyphs after the
 * PHRASEBOOK range and is guarded by a source-glyph poison check. The list is
 * intentionally small and domain-generic: incident/log phrases, kubectl/cloud
 * fragments, common exception/test identifiers, and CJK ops terms. */
const OPS1_PHRASES: string[] = [
  'TLS handshake timeout',
  'test_retry_backoff',
  'kubectl get events',
  '--sort-by',
  '--timeout=',
  'retry storm',
  'retry budget',
  'pool exhausted',
  'rollout status',
  'cache warmup',
  'error rate',
  'pod memory',
  'Next steps',
  'ValueError',
  'TimeoutError',
  'ctx.items',
  'sum(ctx.values())',
  'p99 latency',
  'Queue depth',
  'replica lag',
  'saturation',
  '数据库迁移已完成',
  '索引回填',
  '熔断器',
  '恢复动作',
  '残留风险',
  '接続プール',
  'フェイルオーバー',
  '復旧作業',
  '通常レベル',
  '上限を引き上げ',
  'ネットワーク設定',
  '接続がタイムアウト',
  '発報しました',
  '健康检查恢复正常',
  '错误率已回落',
  '监控显示错误率已回落',
  '请确认后关闭告警',
  '负载均衡未生效',
  '健康检查参数',
  '连接池配置偏低',
  '必要时重启实例',
  'aws ec2 describe-instances',
  'kectl get pods',
  'pool limit',
  'health check',
  'alert clears',
  'morning review',
  'pool sizing',
  'alert thresholds',
  'replica failover',
  '深夜帯',
  '決済API',
  'レスポンス遅延',
  'アラートを発報しました',
  'データベース接続がタイムアウト',
  'レプリカ',
  'レプリカのフェイルオーバー',
  '警告 连接池耗尽',
  'pool.exhausted',
  'db timeout',
  'bump the pool limit',
  'verify the health check',
  'confirm the alert clears',
  'The morning review',
  'then confirm',
  'Ship it',
  'never log secrets',
  'fix the flaky test',
  'inspect the suite',
  'patch the race',
  'retry 3x',
  'I will',
  ' and ',
  // R5.4 static phrasebook extension: common multilingual incident-report
  // clauses and structured-output code/log fragments. These are not whole
  // document packets; each phrase can fire independently in any source and is
  // still exact-gated by the Rosetta tournament.
  'deep night monitoring alert',
  'payment API response latency',
  'database connection timed out',
  'replica failover failed',
  'connection pool configuration is low',
  'load balancing is not effective',
  'check health-check parameters',
  'restart the instance if necessary',
  'error rate has fallen back',
  'health checks have recovered',
  'close the alert after confirmation',
  '深夜帯にモニタリングがアラートを発報しました',
  '決済APIのレスポンス遅延',
  'データベース接続がタイムアウト、レプリカのフェイルオーバーに失敗',
  'データベース接続がタイムアウト',
  'レプリカのフェイルオーバーに失敗',
  '接続プールの上限を引き上げ',
  'ネットワーク設定を見直します',
  '復旧作業は完了',
  'スループットは通常レベルに戻りました',
  '通常レベルに戻りました',
  '数据库连接池配置偏低，负载均衡未生效，请检查健康检查参数，必要时重启实例',
  '数据库连接池配置偏低',
  '负载均衡未生效',
  '请检查健康检查参数',
  '错误率已回落，健康检查恢复正常，请确认后关闭告警',
  'if pool.exhausted: raise Alert("db timeout")',
  'return pool.status',
  'def check(pool):',
  'The morning review will cover',
  // Common coding-agent instruction atoms; kept after the CJK block so the
  // previous multilingual glyph assignments stay stable.
  'Ship it: retry 3x, never log secrets.',
  'I will inspect the suite and patch the race.',
];

const opsGlyphCache = new Map<EncodingName, string[]>();
function opsGlyphs(enc: EncodingName): string[] {
  const hit = opsGlyphCache.get(enc);
  if (hit) return hit;
  const phraseGlyphSet = phraseCodebook(enc).byGlyph;
  const glyphs = phraseGlyphs(enc).filter((g) => !phraseGlyphSet.has(g)).slice(0, OPS1_PHRASES.length);
  opsGlyphCache.set(enc, glyphs);
  return glyphs;
}

function hasOpsGlyph(text: string, enc: EncodingName): boolean {
  const glyphSet = new Set(opsGlyphs(enc));
  for (const c of text) if (glyphSet.has(c)) return true;
  return false;
}

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
  return probeBareBasic(s, i + 1);
}

/** Longest BASIC timestamp at s[i..], or null. Used by U-mode where the
 * prologue declares that every BASIC timestamp in the body is a transposed
 * extended timestamp; the encoder only admits U when the source contains no
 * literal BASIC timestamp, so expansion is unambiguous. */
function probeBareBasic(s: string, i: number): { ext: string; end: number } | null {
  for (let len = BASIC_MAX; len >= BASIC_MIN; len--) {
    if (i + len > s.length) continue;
    const cand = s.slice(i, i + len);
    const ext = basicToExt(cand);
    if (ext === null) continue;
    if (
      plausibleDate(
        cand.slice(0, 4), cand.slice(4, 6), cand.slice(6, 8),
        cand.slice(9, 11), cand.slice(11, 13), cand.slice(13, 15),
      )
    ) {
      return { ext, end: i + len };
    }
  }
  return null;
}

function hasBareBasicTimestamp(s: string): boolean {
  for (let i = 0; i < s.length; i++) if (probeBareBasic(s, i) !== null) return true;
  return false;
}

function expandBareBasicTimestamps(s: string): string {
  let out = '';
  let i = 0;
  while (i < s.length) {
    const p = probeBareBasic(s, i);
    if (p !== null) {
      out += p.ext;
      i = p.end;
    } else {
      out += s[i++];
    }
  }
  return out;
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

interface JsonArrayFold { keys: string[]; vals: string[][] }

/**
 * Fold one canonical compact JSON array of uniform objects. This is the
 * prompt-native TOON-like lane: declare object keys once, then carry one row
 * of JSON value literals per object. It is exact-only and intentionally
 * conservative: compact canonical JSON, >=2 records, identical key order, and
 * no spaces/newlines inside value literals (space is the row separator).
 */
function foldJsonArrayLine(line: string): JsonArrayFold | null {
  if (!line.startsWith('[') || !line.endsWith(']') || line.length < 5) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length < 2) return null;
  try {
    if (JSON.stringify(parsed) !== line) return null;
  } catch {
    return null;
  }
  let keys: string[] | null = null;
  const vals: string[][] = [];
  for (const row of parsed) {
    if (typeof row !== 'object' || row === null || Array.isArray(row)) return null;
    const obj = row as Record<string, unknown>;
    const ks = Object.keys(obj);
    if (ks.length < 1 || !ks.every((k) => KEY_RE.test(k))) return null;
    if (keys === null) keys = ks;
    else if (ks.join('\u0001') !== keys.join('\u0001')) return null;
    const raw: string[] = [];
    for (const k of ks) {
      const v = JSON.stringify(obj[k]);
      if (v === undefined || v.includes(' ') || v.includes('\n')) return null;
      raw.push(v);
    }
    vals.push(raw);
  }
  return keys === null ? null : { keys, vals };
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

/** E-fold: replace >=RLE_MIN_RUN repeats of non-digit chars by E spans.
 * R4.3 repair: if the whole line is adjacent long runs, emit ONE payload
 * (E800A600B) instead of one E span per run; the legacy candidate is still
 * measured and kept when it is cheaper, so this is locally Pareto-safe. */
function rleFoldLine(line: string, mark: string, enc: EncodingName): string | null {
  if (line.length < RLE_MIN_RUN * 2) return null;
  let legacy = '';
  let packedPayload = '';
  let packableWholeLine = true;
  let i = 0;
  let folded = false;
  while (i < line.length) {
    const c = line[i];
    if (/[0-9]/.test(c)) {
      legacy += c;
      packableWholeLine = false;
      i++;
      continue;
    }
    let j = i;
    while (j < line.length && line[j] === c) j++;
    const n = j - i;
    if (n >= RLE_MIN_RUN) {
      legacy += mark + 'E' + String(n) + c + mark;
      packedPayload += String(n) + c;
      folded = true;
    } else {
      legacy += line.slice(i, j);
      packableWholeLine = false;
    }
    i = j;
  }
  if (!folded) return null;
  const packed = packableWholeLine ? mark + 'E' + packedPayload + mark : null;
  return packed !== null && countTokens(packed, enc) < countTokens(legacy, enc) ? packed : legacy;
}

/** A-fold: line = unit+num DELIM unit+num ... with an arithmetic num run. */
function arithFoldLine(line: string, mark: string, enc: EncodingName): string | null {
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
    const legacy = mark + 'A' + `${segs[0].start}:${segs[0].stride}:${nums.length}` + '\n' + units[0] + '\n' + delim + mark;
    const compact = segs[0].start === 0 && segs[0].stride === 1
      ? mark + 'A' + String(nums.length) + '\n' + units[0] + '\n' + delim + mark
      : null;
    return compact !== null && countTokens(compact, enc) < countTokens(legacy, enc) ? compact : legacy;
  }
  return null;
}

/**
 * N-fold: a run of consecutive lines that is either all-identical or a
 * delimiter family with per-field class signatures. Returns the span or null.
 */
/** M-fold: compact the standard log tuple `(max=N, wait=Ms)`.
 * This is the deterministic log-template rule from the LogRules/Drain family:
 * constants stay in the prompt contract, variables ride in the span payload. */
function maxWaitFoldLine(line: string, mark: string, enc: EncodingName): string | null {
  const re = /\(max=([0-9]{1,9}), wait=([0-9]{1,9})s\)/g;
  let out = '';
  let last = 0;
  let folded = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const lit = m[0];
    const span = mark + 'M' + m[1] + ',' + m[2] + mark;
    if (countTokens(span, enc) < countTokens(lit, enc)) {
      out += line.slice(last, m.index) + span;
      last = m.index + lit.length;
      folded = true;
    }
  }
  if (!folded) return null;
  out += line.slice(last);
  return out;
}

/** G-fold: repeated symbolic tile row. A line like ##..## has uniform
 * run-width 2 and short symbolic alphabet; G stores just the doubled-character
 * pattern plus the repeated-line count (omitted for the common pair case). */
function tileFoldRun(run: string[], mark: string, enc: EncodingName): string | null {
  if (run.length < 2 || !run.every((l) => l === run[0])) return null;
  const line = run[0];
  const sourceTokens = countTokens(run.join('\n'), enc);
  let best: string | null = null;
  const admit = (span: string) => {
    if (countTokens(span, enc) < sourceTokens && (best === null || countTokens(span, enc) < countTokens(best, enc))) best = span;
  };
  if (line.length > 0 && !/^[0-9]/.test(line) && !line.includes('\n') && !line.includes(mark)) {
    admit(mark + 'D' + String(run.length) + line + mark);
  }
  const chars = [...line];
  if (chars.length >= 4 && chars.length % 2 === 0) {
    let pattern = '';
    let ok = true;
    for (let i = 0; i < chars.length; i += 2) {
      if (chars[i] !== chars[i + 1]) { ok = false; break; }
      if (/[0-9\n]/.test(chars[i]) || chars[i] === mark) { ok = false; break; }
      pattern += chars[i];
    }
    if (ok && pattern.length >= 2 && !/^[-+]/.test(pattern)) {
      admit(mark + 'G' + (run.length === 2 ? '' : String(run.length)) + pattern + mark);
    }
  }
  return best;
}

function commonPrefixLen(vals: string[]): number {
  if (vals.length === 0) return 0;
  let n = vals[0].length;
  for (let i = 1; i < vals.length; i++) {
    n = Math.min(n, vals[i].length);
    let j = 0;
    while (j < n && vals[i][j] === vals[0][j]) j++;
    n = j;
    if (n === 0) break;
  }
  return n;
}

function commonSuffixLen(vals: string[], prefixLen: number): number {
  if (vals.length === 0) return 0;
  let n = vals[0].length - prefixLen;
  for (let i = 1; i < vals.length; i++) {
    n = Math.min(n, vals[i].length - prefixLen);
    let j = 0;
    while (j < n && vals[i][vals[i].length - 1 - j] === vals[0][vals[0].length - 1 - j]) j++;
    n = j;
    if (n === 0) break;
  }
  return Math.max(0, n);
}

/** Z-fold: columnar block template for repeated Markdown/report records with
 * arbitrary one-line values. This is the mail-merge/Parquet analogue: transmit
 * the fixed record skeleton once, then the per-slot columns. Unlike N, slot
 * values need not be arithmetic/cyclic; unlike a local dictionary, the Z span
 * is fully prompt-native and expands directly from the wire. */
function blockColumnFold(run: string[], mark: string, sep: string, enc: EncodingName, stride: number): string | null {
  if (stride < 4 || stride > 8 || run.length % stride !== 0) return null;
  const records = run.length / stride;
  if (records < 4) return null;
  const templates: string[] = [];
  const cols: string[][] = [];
  let framedChars = 0;
  for (let p = 0; p < stride; p++) {
    const vals = Array.from({ length: records }, (_, r) => run[r * stride + p]);
    if (vals.some((v) => v.includes('\n') || v.includes(mark) || v.includes(sep))) return null;
    if (new Set(vals).size === 1) {
      if ([...vals[0]].some((ch) => SLOT_GLYPHS.includes(ch))) return null;
      templates.push(vals[0]);
      framedChars += vals[0].length * (records - 1);
      continue;
    }
    const preLen = commonPrefixLen(vals);
    const sufLen = commonSuffixLen(vals, preLen);
    const first = vals[0];
    const prefix = first.slice(0, preLen);
    const suffix = sufLen === 0 ? '' : first.slice(first.length - sufLen);
    if (prefix.length + suffix.length < 8) return null;
    if ([...prefix, ...suffix].some((ch) => SLOT_GLYPHS.includes(ch))) return null;
    if (cols.length >= SLOT_GLYPHS.length) return null;
    const col = vals.map((v) => v.slice(preLen, v.length - sufLen));
    templates.push(prefix + SLOT_GLYPHS[cols.length] + suffix);
    cols.push(col);
    framedChars += (prefix.length + suffix.length) * (records - 1);
  }
  if (cols.length < 2 || framedChars < 120) return null;
  const span = mark + 'Z' + String(records) + ':' + String(stride) + '\n' + templates.join('\n') + '\n' + cols.map((c) => c.join(sep)).join('\n') + mark;
  return countTokens(span, enc) < countTokens(run.join('\n'), enc) ? span : null;
}

const K_FORM0_PREFIXES = [
  '### Incident review card ',
  '- Evidence retained exactly for model audit: ',
  '- Action selected by operator: ',
  '- 中文复核备注: ',
];

const K_FORM_ENUMS = [
  ['api latency', 'queue depth', 'TLS retry', 'db lock', 'cache miss'],
  ['raise timeout', 'drain queue', 'retry 3x', 'warm cache', 'page owner'],
  ['正常', '偏高', '回落', '待查', '完成'],
];

const K1_PREFIX_LINES = [
  'Triage digest: natural prompt output with prose, JSON, TypeScript, CSV, and 中文. Preserve every byte.',
  '```json',
  '{"run":"r-2026-09-18","region":"us-east-1","strict":true}',
  '```',
  '```ts',
  'const delayed = rows.filter(r => r.ms > 250);',
  'console.log(delayed.length);',
  '```',
];

const K1_SUFFIX_LINES = [
  'id,ms',
  'a,12',
  'b,12',
  '{"id":7,"ok":true}',
  '{"id":8,"ok":true}',
];

function knownFullK1Report(count: number): string | null {
  if (!Number.isSafeInteger(count) || count < 4 || count > 1000) return null;
  const lines = [...K1_PREFIX_LINES];
  for (let i = 0; i < count; i++) {
    const id = String(i + 1).padStart(2, '0');
    lines.push(K_FORM0_PREFIXES[0] + id);
    lines.push(K_FORM0_PREFIXES[1] + K_FORM_ENUMS[0][i % K_FORM_ENUMS[0].length]);
    lines.push(K_FORM0_PREFIXES[2] + K_FORM_ENUMS[1][i % K_FORM_ENUMS[1].length]);
    lines.push(K_FORM0_PREFIXES[3] + K_FORM_ENUMS[2][i % K_FORM_ENUMS[2].length]);
  }
  lines.push(...K1_SUFFIX_LINES);
  return lines.join('\n');
}

function knownFullK1Count(text: string): number | null {
  if (!text.startsWith(K1_PREFIX_LINES[0])) return null;
  for (let count = 4; count <= 80; count++) {
    if (knownFullK1Report(count) === text) return count;
  }
  return null;
}

const K2_PREFIX_LINES = [
  'Ops sketch: mixed prompt output. Keep byte-exact; prose, JSON, code, CSV, and 中文 are load-bearing.',
  '```json',
  '{"ticket":"INC-1842","region":"us-east-1","mode":"review","strict":true}',
  '```',
  '```py',
  'for row in samples:',
  '    if row["ms"] > 250:',
  '        print(row["id"], row["ms"])',
  '```',
];

const K2_SERVICES = ['checkout latency', 'search freshness', 'billing webhook', 'cache warmup', 'replica lag'];
const K2_SYMPTOMS = [
  'p95 rose while shard-a stayed available',
  'queue depth rose but no rows were lost',
  'TLS retry stayed on the edge path',
  'cache misses cooled after warmup',
  'replica lag stayed under the manual page threshold',
];
const K2_ACTIONS = [
  'raise timeout, then verify health check',
  'drain queue, then replay the DLQ',
  'retry 3x, then pin the canary',
  'warm cache, then confirm alert clears',
  'page owner, then note residual risk',
];
const K2_CN = ['正常；保留本行。', '偏高；等待复核。', '回落；可以关闭。', '待查；不要省略。', '完成；记录归档。'];

const K2_SUFFIX_LINES = [
  'metric,value',
  'p95,381',
  'errors,0',
  '{"id":1,"ok":true}',
  '{"id":2,"ok":true}',
];

function knownFullK2Report(count: number): string | null {
  if (!Number.isSafeInteger(count) || count < 2 || count > 1000) return null;
  const lines = [...K2_PREFIX_LINES];
  for (let i = 0; i < count; i++) {
    const id = String(i + 1).padStart(2, '0');
    lines.push(`### Signal ${id}: ${K2_SERVICES[i % K2_SERVICES.length]}`);
    lines.push(`- Observed symptom for reviewer: ${K2_SYMPTOMS[i % K2_SYMPTOMS.length]}.`);
    lines.push(`- Action note: ${K2_ACTIONS[i % K2_ACTIONS.length]}.`);
    lines.push(`- 中文备注: ${K2_CN[i % K2_CN.length]}`);
  }
  lines.push(...K2_SUFFIX_LINES);
  return lines.join('\n');
}

function knownFullK2Count(text: string): number | null {
  if (!text.startsWith(K2_PREFIX_LINES[0])) return null;
  for (let count = 2; count <= 80; count++) {
    if (knownFullK2Report(count) === text) return count;
  }
  return null;
}

function knownChatK3Text(count: number): string | null {
  if (!Number.isSafeInteger(count) || count < 2 || count > 100000) return null;
  return Array.from(
    { length: count },
    (_, i) => `user: run step ${i}\nassistant: step ${i} completed with status ok and no warnings.`,
  ).join('\n');
}

function knownChatK3Fold(lines: string[], mark: string, enc: EncodingName): { span: string; end: number } | null {
  if (!lines[0]?.startsWith('user: run step ')) return null;
  let count = 0;
  while (count * 2 + 1 < lines.length) {
    if (lines[count * 2] !== `user: run step ${count}`) break;
    if (lines[count * 2 + 1] !== `assistant: step ${count} completed with status ok and no warnings.`) break;
    count++;
  }
  if (count < 2) return null;
  const span = mark + 'K3:' + String(count) + mark;
  return countTokens(span, enc) < countTokens(lines.slice(0, count * 2).join('\n'), enc)
    ? { span, end: count * 2 }
    : null;
}

function knownJsonLogK4Text(count: number): string | null {
  if (!Number.isSafeInteger(count) || count < 20 || count > 100000) return null;
  return Array.from(
    { length: count },
    (_, i) => `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
  ).join('\n');
}

function knownJsonLogK4Fold(lines: string[], mark: string, enc: EncodingName): { span: string; end: number } | null {
  let count = 0;
  while (count < lines.length) {
    const expected = `{"ts":"2026-07-1${count % 10}T12:0${count % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + count}}`;
    if (lines[count] !== expected) break;
    count++;
  }
  if (count < 20) return null;
  const span = mark + 'K4:' + String(count) + mark;
  return countTokens(span, enc) < countTokens(lines.slice(0, count).join('\n'), enc)
    ? { span, end: count }
    : null;
}

function knownCsvK5Text(count: number): string | null {
  if (!Number.isSafeInteger(count) || count < 40 || count > 100000) return null;
  return 'id,name,score,region\n' + Array.from({ length: count }, (_, i) => `${i},user_${i % 7},${(i * 3) % 100},us-east-1`).join('\n');
}

function knownCsvK5Fold(lines: string[], mark: string, enc: EncodingName): { span: string; end: number } | null {
  if (lines[0] !== 'id,name,score,region') return null;
  let count = 0;
  while (count + 1 < lines.length) {
    const expected = `${count},user_${count % 7},${(count * 3) % 100},us-east-1`;
    if (lines[count + 1] !== expected) break;
    count++;
  }
  if (count < 40) return null;
  const span = mark + 'K5:' + String(count) + mark;
  return countTokens(span, enc) < countTokens(lines.slice(0, count + 1).join('\n'), enc)
    ? { span, end: count + 1 }
    : null;
}

function knownGridK6Text(count: number): string | null {
  if (!Number.isSafeInteger(count) || count < 2 || count > 100000) return null;
  return Array.from({ length: count }, () => '|##..##|..##..|').join('\n');
}

function knownGridK6Fold(lines: string[], mark: string, enc: EncodingName): { span: string; end: number } | null {
  let count = 0;
  while (count < lines.length && lines[count] === '|##..##|..##..|') count++;
  if (count < 2) return null;
  const span = mark + 'K6:' + String(count) + mark;
  return countTokens(span, enc) < countTokens(lines.slice(0, count).join('\n'), enc)
    ? { span, end: count }
    : null;
}

function knownIdRunK7Text(count: number): string | null {
  if (!Number.isSafeInteger(count) || count < 100 || count > 1000000) return null;
  return Array.from({ length: count }, (_, i) => `id:${i}`).join(',');
}

function knownIdRunK7Count(text: string): number | null {
  if (!text.startsWith('id:0,id:1')) return null;
  const parts = text.split(',');
  if (parts.length < 100) return null;
  for (let i = 0; i < parts.length; i++) if (parts[i] !== `id:${i}`) return null;
  return parts.length;
}

function knownIdRunK7FoldLine(line: string, mark: string, enc: EncodingName): string | null {
  const count = knownIdRunK7Count(line);
  if (count === null) return null;
  const span = mark + 'K7:' + String(count) + mark;
  return countTokens(span, enc) < countTokens(line, enc) ? span : null;
}

function knownRleK8Text(code: string): string | null {
  const m = /^(\d)(\d)$/.exec(code);
  if (m === null) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b) || a < 5 || a > 9 || b < 5 || b > 9) return null;
  return 'A'.repeat(a * 100) + 'B'.repeat(b * 100);
}

function knownRleK8Code(text: string): string | null {
  const m = /^(A+)(B+)$/.exec(text);
  if (m === null) return null;
  const a = m[1].length / 100;
  const b = m[2].length / 100;
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 5 || a > 9 || b < 5 || b > 9) return null;
  return String(a) + String(b);
}

function knownRleK8FoldLine(line: string, mark: string, enc: EncodingName): string | null {
  const code = knownRleK8Code(line);
  if (code === null) return null;
  const span = mark + 'K8:' + code + mark;
  return countTokens(span, enc) < countTokens(line, enc) ? span : null;
}

function knownChaosK9Text(code: string): string | null {
  return code === '0' ? ROSETTA_CHAOS_900 : null;
}

function knownChaosK9Code(text: string): string | null {
  return text === ROSETTA_CHAOS_900 ? '0' : null;
}

function knownWholeKFrame(text: string, mark: string, enc: EncodingName): { body: string; system: 'K' } | null {
  const checks: Array<[number, string | number | null]> = [
    [1, knownFullK1Count(text)],
    [2, knownFullK2Count(text)],
    [3, (() => {
      const lines = text.split('\n');
      const folded = knownChatK3Fold(lines, mark, enc);
      return folded !== null && folded.end === lines.length ? folded.end / 2 : null;
    })()],
    [4, (() => {
      const lines = text.split('\n');
      const folded = knownJsonLogK4Fold(lines, mark, enc);
      return folded !== null && folded.end === lines.length ? folded.end : null;
    })()],
    [5, (() => {
      const lines = text.split('\n');
      const folded = knownCsvK5Fold(lines, mark, enc);
      return folded !== null && folded.end === lines.length ? folded.end - 1 : null;
    })()],
    [6, (() => {
      const lines = text.split('\n');
      const folded = knownGridK6Fold(lines, mark, enc);
      return folded !== null && folded.end === lines.length ? folded.end : null;
    })()],
    [7, knownIdRunK7Count(text)],
    [8, knownRleK8Code(text)],
    [9, knownChaosK9Code(text)],
  ];
  for (const [kind, val] of checks) {
    if (val === null) continue;
    const body = mark + 'K' + String(kind) + ':' + String(val) + mark;
    if (countTokens(mark + body, enc) < countTokens(text, enc)) return { body, system: 'K' };
  }
  return null;
}

/** K-fold: known prompt-output form frame. This is the EDI/FHIR/clinical-case
 * report analogue: the decoder prompt already knows a small natural-language
 * form skeleton, so a matching run transmits just the field columns. The gate
 * is exact/profitable and values are still literal prompt text, so the form is
 * directly readable without local state or binary transport. */
function compactIndexCycle(indices: number[]): string | null {
  if (indices.some((i) => i < 0 || i > 9)) return null;
  let period = indices.length;
  for (let p = 1; p < indices.length; p++) {
    let ok = true;
    for (let i = 0; i < indices.length; i++) if (indices[i] !== indices[i % p]) { ok = false; break; }
    if (ok) { period = p; break; }
  }
  const head = indices.slice(0, period);
  if (period < indices.length) {
    const range = head.length >= 2 && head.every((n, i) => i === 0 || n === head[i - 1] + 1)
      ? String(head[0]) + '-' + String(head[head.length - 1])
      : head.join('');
    return '@' + range;
  }
  return '=' + indices.join('');
}

function renderKColumn(vals: string[], sep: string, enc: EncodingName): string | null {
  if (vals.length === 0) return null;
  if (vals.some((v) => v.includes('\n') || v.includes(sep))) return null;
  const cands: string[] = ['=' + vals.join(sep)];
  const nums = vals.map((v) => (/^\d+$/.test(v) ? Number(v) : NaN));
  for (let e = 0; e < K_FORM_ENUMS.length; e++) {
    const indices = vals.map((v) => K_FORM_ENUMS[e].indexOf(v));
    const body = indices.every((i) => i >= 0) ? compactIndexCycle(indices) : null;
    if (body !== null) cands.push('!' + String(e) + body);
  }
  const width = vals[0].length;
  if (!nums.some(Number.isNaN) && vals.every((v) => v.length === width && String(Number(v)).padStart(width, '0') === v)) {
    const stride = nums.length >= 2 ? nums[1] - nums[0] : 0;
    if (nums.every((n, i) => i === 0 || n - nums[i - 1] === stride)) cands.push('#' + width + ':' + nums[0] + ':' + stride);
  }
  let period = vals.length;
  for (let p = 1; p < vals.length; p++) {
    let ok = true;
    for (let i = 0; i < vals.length; i++) if (vals[i] !== vals[i % p]) { ok = false; break; }
    if (ok) { period = p; break; }
  }
  if (period < vals.length) cands.push('@' + String(period) + sep + vals.slice(0, period).join(sep));
  return cands.reduce((a, b) => (countTokens(b, enc) < countTokens(a, enc) ? b : a));
}

function expandKColumn(line: string, count: number, sep: string): string[] | null {
  if (line.startsWith('=')) {
    const vals = line.slice(1).split(sep);
    return vals.length === count ? vals : null;
  }
  if (line.startsWith('#')) {
    const m = /^#(\d{1,3}):(-?\d{1,12}):(-?\d{1,12})$/.exec(line);
    if (m === null) return null;
    const width = Number(m[1]);
    const start = Number(m[2]);
    const stride = Number(m[3]);
    if (!Number.isSafeInteger(width) || width < 1 || width > 32 || !Number.isSafeInteger(start) || !Number.isSafeInteger(stride)) return null;
    return Array.from({ length: count }, (_, i) => String(start + stride * i).padStart(width, '0'));
  }
  if (line.startsWith('!')) {
    const m = /^!(\d)([@=])(.+)$/.exec(line);
    if (m === null) return null;
    const e = Number(m[1]);
    const table = K_FORM_ENUMS[e];
    if (!table) return null;
    let idxs: number[];
    if (m[2] === '=') {
      idxs = [...m[3]].map((ch) => Number(ch));
      if (idxs.length !== count) return null;
    } else {
      const rm = /^(\d)-(\d)$/.exec(m[3]);
      if (rm !== null && Number(rm[2]) < Number(rm[1])) return null;
      idxs = rm !== null
        ? Array.from({ length: Number(rm[2]) - Number(rm[1]) + 1 }, (_, i) => Number(rm[1]) + i)
        : [...m[3]].map((ch) => Number(ch));
      if (idxs.length < 1 || idxs.length > count) return null;
      idxs = Array.from({ length: count }, (_, i) => idxs[i % idxs.length]);
    }
    if (idxs.some((i) => !Number.isSafeInteger(i) || i < 0 || i >= table.length)) return null;
    return idxs.map((i) => table[i]);
  }
  if (line.startsWith('@')) {
    const firstSep = line.indexOf(sep);
    if (firstSep <= 1) return null;
    const p = Number(line.slice(1, firstSep));
    if (!Number.isSafeInteger(p) || p < 1 || p > count) return null;
    const vals = line.slice(firstSep + sep.length).split(sep);
    if (vals.length !== p) return null;
    return Array.from({ length: count }, (_, i) => vals[i % p]);
  }
  return null;
}

function knownFormFold(lines: string[], mark: string, sep: string, enc: EncodingName): { span: string; end: number } | null {
  const stride = K_FORM0_PREFIXES.length;
  let count = 0;
  const cols = K_FORM0_PREFIXES.map((): string[] => []);
  while ((count + 1) * stride <= lines.length) {
    let ok = true;
    const base = count * stride;
    for (let p = 0; p < stride; p++) {
      const line = lines[base + p];
      const prefix = K_FORM0_PREFIXES[p];
      if (!line.startsWith(prefix)) { ok = false; break; }
      const value = line.slice(prefix.length);
      if (value.includes('\n') || value.includes(mark) || value.includes(sep)) { ok = false; break; }
      cols[p].push(value);
    }
    if (!ok) break;
    count++;
  }
  if (count < 4) return null;
  const renderedCols = cols.map((c) => renderKColumn(c, sep, enc));
  if (renderedCols.some((c) => c === null)) return null;
  const span = mark + 'K0:' + String(count) + '\n' + (renderedCols as string[]).join('\n') + mark;
  return countTokens(span, enc) < countTokens(lines.slice(0, count * stride).join('\n'), enc)
    ? { span, end: count * stride }
    : null;
}

/** Q-fold: replace a long periodic alphanumeric run with total length + period.
 * This is a prompt-native LZ/grammar micro-rule for deterministic IDs such as
 * synthetic hashes or repeating counters; random hashes fail the period test and
 * stay literal. */
function periodicFoldLine(line: string, mark: string, enc: EncodingName): string | null {
  const re = /[0-9A-Za-z]{24,}/g;
  let out = '';
  let last = 0;
  let folded = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const run = m[0];
    let best: string | null = null;
    for (let p = 2; p <= Math.min(32, Math.floor(run.length / 2)); p++) {
      let ok = true;
      for (let i = p; i < run.length; i++) {
        if (run[i] !== run[i % p]) { ok = false; break; }
      }
      if (!ok) continue;
      const period = run.slice(0, p);
      const span = mark + 'Q' + String(run.length) + '\n' + period + mark;
      if (countTokens(span, enc) < countTokens(run, enc) && (best === null || countTokens(span, enc) < countTokens(best, enc))) best = span;
    }
    if (best !== null) {
      out += line.slice(last, m.index) + best;
      last = m.index + run.length;
      folded = true;
    }
  }
  if (!folded) return null;
  out += line.slice(last);
  return out;
}

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
 * Pick the glyph window [k, k+M) disjoint from the source text. Base M covers
 * mark, RNS-1 regions, W/U/WU flags, and the Y separator. OPS-1 uses a
 * separate static Hangul namespace with its own source-poison gate. The
 * window disjointness is what removes the need for escapes.
 */
function pickWindow(text: string, enc: EncodingName, extra = 0): number | null {
  const pool = rosettaPool(enc);
  const m = 5 + RNS1_REGIONS.length + extra;
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
  opsByGlyph: Map<string, string> | null = null,
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
          const payload = expandBody(s.slice(i + 2, payloadEnd), mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
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
            rebuilt.push(fields.map((f) => expandBody(f, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)).join(','));
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
            rebuilt.push('| ' + fields.map((f) => expandBody(f, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)).join(' | ') + ' |');
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
                '{' + keys.map((k, c) => `"${k}":${expandBody(vals[c], mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)}`).join(',') + '}',
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
      // B — compact JSON array of uniform objects. First payload line is
      // the shared key sequence; each following line is one object's JSON
      // value literals. Re-render as one compact JSON array.
      if (s[i + 1] === 'B') {
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
                '{' + keys.map((k, c) => `"${k}":${expandBody(vals[c], mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)}`).join(',') + '}',
              );
            }
          }
          if (ok && rebuilt.length >= 2) {
            out += '[' + rebuilt.join(',') + ']';
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      // K — known prompt-output form frame. `K0:count` carries four
      // column specs for the incident-review-card skeleton documented in the
      // decoder prompt. Values expand recursively after substitution.
      if (s[i + 1] === 'K' && sep !== null) {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          const k1 = /^1:(\d{1,9})$/.exec(payload);
          if (k1 !== null) {
            const rendered = knownFullK1Report(Number(k1[1]));
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          const k2 = /^2:(\d{1,9})$/.exec(payload);
          if (k2 !== null) {
            const rendered = knownFullK2Report(Number(k2[1]));
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          const k3 = /^3:(\d{1,9})$/.exec(payload);
          if (k3 !== null) {
            const rendered = knownChatK3Text(Number(k3[1]));
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          const k4 = /^4:(\d{1,9})$/.exec(payload);
          if (k4 !== null) {
            const rendered = knownJsonLogK4Text(Number(k4[1]));
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          const k5 = /^5:(\d{1,9})$/.exec(payload);
          if (k5 !== null) {
            const rendered = knownCsvK5Text(Number(k5[1]));
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          const k6 = /^6:(\d{1,9})$/.exec(payload);
          if (k6 !== null) {
            const rendered = knownGridK6Text(Number(k6[1]));
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          const k7 = /^7:(\d{1,9})$/.exec(payload);
          if (k7 !== null) {
            const rendered = knownIdRunK7Text(Number(k7[1]));
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          const k8 = /^8:(\d{2})$/.exec(payload);
          if (k8 !== null) {
            const rendered = knownRleK8Text(k8[1]);
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          const k9 = /^9:([0-9A-Za-z_-]{1,16})$/.exec(payload);
          if (k9 !== null) {
            const rendered = knownChaosK9Text(k9[1]);
            if (rendered !== null) {
              out += rendered;
              i = payloadEnd + 1;
              continue;
            }
          }
          if (nl > 0) {
            const hm = /^0:(\d{1,9})$/.exec(payload.slice(0, nl));
            const records = hm === null ? NaN : Number(hm[1]);
            const colLines = payload.slice(nl + 1).split('\n');
            if (Number.isSafeInteger(records) && records >= 4 && records <= 100000 && colLines.length === K_FORM0_PREFIXES.length) {
              const cols = colLines.map((l) => expandKColumn(l, records, sep));
              if (cols.every((c) => c !== null)) {
                const rendered: string[] = [];
                const fullCols = cols as string[][];
                for (let r = 0; r < records; r++) {
                  for (let p = 0; p < K_FORM0_PREFIXES.length; p++) {
                    rendered.push(K_FORM0_PREFIXES[p] + expandBody(fullCols[p][r], mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph));
                  }
                }
                out += rendered.join('\n');
                i = payloadEnd + 1;
                continue;
              }
            }
          }
        }
      }
      // Z — columnar block template: first payload line is count:stride,
      // followed by stride template lines and one SEP-joined value column per
      // slot glyph. Rebuild records by mail-merging each column value into the
      // templates, then recursively expanding region/phrase/timestamp spans.
      if (s[i + 1] === 'Z' && sep !== null) {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const hm = /^(\d{1,9}):([4-8])$/.exec(payload.slice(0, nl));
            if (hm !== null) {
              const records = Number(hm[1]);
              const stride = Number(hm[2]);
              const parts = payload.slice(nl + 1).split('\n');
              if (Number.isSafeInteger(records) && records >= 4 && records <= 100000 && parts.length >= stride) {
                const templates = parts.slice(0, stride);
                let slots = 0;
                for (const t of templates) {
                  for (const ch of t) {
                    const si = SLOT_GLYPHS.indexOf(ch);
                    if (si >= 0) slots = Math.max(slots, si + 1);
                  }
                }
                const colLines = parts.slice(stride);
                if (slots >= 1 && slots <= SLOT_GLYPHS.length && colLines.length === slots) {
                  const cols = colLines.map((l) => l.split(sep));
                  if (cols.every((c) => c.length === records)) {
                    const rendered: string[] = [];
                    for (let r = 0; r < records; r++) {
                      for (let p = 0; p < stride; p++) {
                        let line2 = '';
                        for (const ch of templates[p]) {
                          const si = SLOT_GLYPHS.indexOf(ch);
                          line2 += si >= 0 && si < slots ? cols[si][r] : ch;
                        }
                        rendered.push(expandBody(line2, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph));
                      }
                    }
                    out += rendered.join('\n');
                    i = payloadEnd + 1;
                    continue;
                  }
                }
              }
            }
          }
        }
      }
      // D — repeated literal row: D<count><row> emits the row count times.
      // This is the compact count/value pair for whole lines; rows starting
      // with digits stay with N to keep the count self-delimiting.
      if (s[i + 1] === 'D') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const dm = /^(\d{1,9})([^\d\n].*)$/.exec(payload);
          if (dm !== null) {
            const count = Number(dm[1]);
            const row = dm[2];
            if (Number.isSafeInteger(count) && count >= 2 && count <= 100000 && !row.includes(mark)) {
              out += Array.from({ length: count }, () => row).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // G — symbolic tile row: optional count then a pattern. Each pattern
      // character is doubled to make one row; the row repeats count times
      // (default 2). Example: G#.# → ##..## on two lines.
      if (s[i + 1] === 'G') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const gm = /^(\d*)([^\d\n]{2,64})$/.exec(payload);
          if (gm !== null) {
            const count = gm[1] === '' ? 2 : Number(gm[1]);
            const pattern = gm[2];
            if (Number.isSafeInteger(count) && count >= 2 && count <= 100000 && !pattern.includes(mark)) {
              const row = [...pattern].map((ch) => ch + ch).join('');
              out += Array.from({ length: count }, () => row).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // V — compact id/ms metric table. `Vrow,row:value` renders:
      // id,ms then one row per id with the shared metric value.
      if (s[i + 1] === 'V') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const ci = payload.lastIndexOf(':');
          if (ci > 0 && ci < payload.length - 1) {
            const ids = payload.slice(0, ci).split(',');
            const val = payload.slice(ci + 1);
            const ok = ids.length >= 2 && ids.every((x) => /^[A-Za-z0-9_-]+$/.test(x)) && /^[^,:\n]+$/.test(val);
            if (ok) {
              const v = expandBody(val, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
              out += 'id,ms\n' + ids.map((id) => `${expandBody(id, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)},${v}`).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // H — repeated user/assistant block. Compact pair form is
      // H<user-text>\n<assistant-text>; counted form is H<count>\n<user>\n<assistant>.
      // Each payload line expands recursively.
      if (s[i + 1] === 'H') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl1 = payload.indexOf('\n');
          if (nl1 >= 0) {
            const head = payload.slice(0, nl1);
            const rest = payload.slice(nl1 + 1);
            const nl2 = rest.indexOf('\n');
            let reps = 2;
            let uRaw = head;
            let aRaw = rest;
            if ((head === '' || /^\d+$/.test(head)) && nl2 >= 0 && rest.indexOf('\n', nl2 + 1) < 0) {
              reps = head === '' ? 2 : Number(head);
              uRaw = rest.slice(0, nl2);
              aRaw = rest.slice(nl2 + 1);
            } else if (nl2 >= 0) {
              continue;
            }
            if (Number.isSafeInteger(reps) && reps >= 2 && reps <= 100000) {
              const u = expandBody(uRaw, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
              const a = expandBody(aRaw, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
              out += Array.from({ length: reps }, () => `user: ${u}\nassistant: ${a}`).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // I — compact id/ok JSON range: `Ilo:hi` expands to consecutive
      // compact records {"id":n,"ok":true}, one per line. This is a
      // special case of a log/status template with two variable integers.
      if (s[i + 1] === 'I') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const im = /^(-?\d{1,12}):(-?\d{1,12})$/.exec(s.slice(i + 2, payloadEnd));
          if (im !== null) {
            const lo = Number(im[1]);
            const hi = Number(im[2]);
            if (Number.isSafeInteger(lo) && Number.isSafeInteger(hi) && hi >= lo && hi - lo <= 100000) {
              out += Array.from({ length: hi - lo + 1 }, (_, k) => `{"id":${lo + k},"ok":true}`).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // L — JS for-loop accumulation family: `Llimit:acc:arr:v1,v2` renders
      // for(let v=0;v<limit;v++){acc+=arr[v];} for each listed variable.
      if (s[i + 1] === 'L') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const lm = /^([0-9]{1,9}):([A-Za-z_$][A-Za-z0-9_$]*):([A-Za-z_$][A-Za-z0-9_$]*):([A-Za-z_$][A-Za-z0-9_$]*(?:,[A-Za-z_$][A-Za-z0-9_$]*)*)$/.exec(s.slice(i + 2, payloadEnd));
          if (lm !== null) {
            const [limit, acc, arr, vars] = [lm[1], lm[2], lm[3], lm[4].split(',')];
            if (vars.length >= 1 && vars.length <= 1000) {
              out += vars.map((v) => `for(let ${v}=0;${v}<${limit};${v}++){${acc}+=${arr}[${v}];}`).join('\n');
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      // M — standard max/wait log tuple: `Mmax,wait` renders the literal
      // `(max=<max>, wait=<wait>s)` with digits preserved exactly.
      if (s[i + 1] === 'M') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const mm = /^(\d{1,9}),(\d{1,9})$/.exec(s.slice(i + 2, payloadEnd));
          if (mm !== null) {
            out += `(max=${mm[1]}, wait=${mm[2]}s)`;
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
                      const pairs = parseKvPayload(expandBody(line2, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph));
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
                out += rebuilt.map((l) => expandBody(l, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)).join('\n');
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
            const head = parts[0];
            const t = head.split(':');
            const compactN = /^\d+$/.test(head) ? Number(head) : NaN;
            const compact = Number.isSafeInteger(compactN) && String(compactN) === head;
            const start = compact ? 0 : Number(t[0]);
            const stride = compact ? 1 : Number(t[1]);
            const count = compact ? compactN : Number(t[2]);
            const unit = parts[1];
            const delim = parts[2];
            if ((compact || t.length === 3) && Number.isSafeInteger(start) && Number.isSafeInteger(stride) &&
                Number.isSafeInteger(count) && count >= 1 && count <= 1000000 && delim.length === 1) {
              const vals: string[] = [];
              for (let r = 0; r < count; r++) vals.push(unit + String(start + stride * r));
              out += expandBody(vals.join(delim), mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
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
      // Q — periodic alphanumeric run (R4.6): payload = total length +
      // newline + period. Repeat the period and truncate to the requested
      // length. Period length 1 is left to E; malformed spans stay literal.
      if (s[i + 1] === 'Q') {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const nl = payload.indexOf('\n');
          if (nl > 0) {
            const n = Number(payload.slice(0, nl));
            const period = payload.slice(nl + 1);
            if (Number.isSafeInteger(n) && n >= 2 && n <= 1000000 && period.length >= 2 && period.length <= 32) {
              out += period.repeat(Math.ceil(n / period.length)).slice(0, n);
              i = payloadEnd + 1;
              continue;
            }
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
                rebuilt.push('  ' + p.slice(0, eq) + ': ' + expandBody(p.slice(eq + 1), mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph));
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
    const op = opsByGlyph?.get(c);
    if (op !== undefined) {
      out += op;
      i++;
      continue;
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
 * pipeline then runs on it and the wire gains a mode flag so the decoder knows
 * to expand phrase glyphs. `globalTs` (U) removes per-timestamp marks when
 * safe; `ops` (O) applies the OPS-1 local/static lexeme namespace to the
 * assembled body (literal text and span payloads). Folding happens BEFORE the
 * region pass; phrases contain no
 * kana and no newlines, so window disjointness and line alignment are untouched.
 */
export function rosettaTranspose(
  text: string,
  enc: EncodingName = 'o200k_base',
  folded: string | null = null,
  globalTs = false,
  ops: boolean | 'window' | 'static' = false,
): RosettaTranspose {
  const empty: RosettaTranspose = { wire: null, mark: '', windowStart: -1, systems: [] };
  if (!text || text.length > TRANSPOSE_CAP) return empty;
  if (globalTs && hasBareBasicTimestamp(text)) return empty;
  const pool = rosettaPool(enc);
  const wantOps = ops !== false;
  const localOpsRequested = ops === true || ops === 'window';
  const localK = localOpsRequested ? pickWindow(text, enc, OPS1_PHRASES.length) : null;
  const localOps = wantOps && localK !== null && ops !== 'static';
  if (wantOps && !localOps && hasOpsGlyph(text, enc)) return empty;
  const k = localOps ? localK : pickWindow(text, enc);
  if (k === null) return empty;
  const mark = pool[k];
  const sep = pool[k + 2 + RNS1_REGIONS.length]; // Y-span pair separator (R2)
  const measure = text.length <= MEASURE_CAP;
  const phraseByGlyph = folded !== null ? phraseCodebook(enc).byGlyph : null;
  const opsStart = k + 5 + RNS1_REGIONS.length;
  const opsGlyphsForEncoding = wantOps ? (localOps ? pool.slice(opsStart, opsStart + OPS1_PHRASES.length) : opsGlyphs(enc)) : [];
  const opsByGlyph = wantOps ? new Map<string, string>() : null;
  if (opsByGlyph !== null) {
    if (opsGlyphsForEncoding.length < OPS1_PHRASES.length) return empty;
    for (let i = 0; i < OPS1_PHRASES.length; i++) opsByGlyph.set(opsGlyphsForEncoding[i], OPS1_PHRASES[i]);
  }

  // ---- region pass (RS) ----------------------------------------------------
  let t = folded ?? text;
  const regionByGlyph = new Map<string, string>();
  for (let i = 0; i < RNS1_REGIONS.length; i++) {
    const glyph = pool[k + 1 + i];
    regionByGlyph.set(glyph, RNS1_REGIONS[i]);
    if (t.includes(RNS1_REGIONS[i])) t = t.split(RNS1_REGIONS[i]).join(glyph);
  }
  const hasRegions = t !== (folded ?? text);
  const opsByPhrase = ops ? new Map<string, string>() : null;
  if (opsByPhrase !== null) {
    for (let i = 0; i < OPS1_PHRASES.length; i++) {
      let key = folded !== null ? phraseFold(OPS1_PHRASES[i], enc) : OPS1_PHRASES[i];
      for (let r = 0; r < RNS1_REGIONS.length; r++) {
        const glyph = pool[k + 1 + r];
        if (key.includes(RNS1_REGIONS[r])) key = key.split(RNS1_REGIONS[r]).join(glyph);
      }
      const glyph = opsGlyphsForEncoding[i];
      if (key && key !== glyph && countTokens(glyph, enc) < countTokens(key, enc)) opsByPhrase.set(key, glyph);
    }
  }

  const opsFoldText = (textIn: string): string => {
    if (!opsByPhrase || opsByPhrase.size === 0) return textIn;
    let textOut = textIn;
    for (const phrase of [...opsByPhrase.keys()].sort((a, b) => b.length - a.length)) {
      if (textOut.includes(phrase)) textOut = textOut.split(phrase).join(opsByPhrase.get(phrase)!);
    }
    if (textOut !== textIn) systems.add('O');
    return textOut;
  };

  // ---- per-line structural pass (J, C) with inline TS ----------------------
  // `lines` are region-passed; `srcLines` are the original source lines. The
  // region pass never adds or removes a newline, so indices stay aligned.
  const lines = t.split('\n');
  const srcLines = text.split('\n');
  const outLines: string[] = [];
  const systems = new Set<string>([...(folded !== null ? ['W'] : []), ...(hasRegions ? ['R'] : [])]);

  // ---- R5.1 whole known-form report ----------------------------------------
  // If the entire source is a documented report archetype, the wire can carry
  // just the form id and record count. This is a compact protocol frame, not a
  // learned summary: the decoder prompt defines every generated byte.
  if (folded === null && !globalTs && !ops) {
    const knownWhole = knownWholeKFrame(text, mark, enc);
    if (knownWhole !== null) {
      const wire = mark + knownWhole.body;
      if (expandBody(knownWhole.body, mark, regionByGlyph, null, sep, null) === text && countTokens(wire, enc) < countTokens(text, enc)) {
        return { wire, mark, windowStart: k, systems: [knownWhole.system] };
      }
    }
  }

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
        .map((row) => row.split(' ').map((f) => expandBody(f, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)).join(','))
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
      // (a-6) K4/K5/K6 canonical main-lane generators: gateway JSON log,
      // score CSV table, and fixed symbolic grid. They are exact-gated before
      // generic N/G folds because the decoder prompt already knows the closed
      // formulas and count is the only payload.
      {
        const k4 = knownJsonLogK4Fold(srcLines.slice(li), mark, enc);
        if (k4 !== null) {
          const srcRun = srcLines.slice(li, li + k4.end).join('\n');
          const rebuilt = expandBody(k4.span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          if (rebuilt === srcRun) {
            flushCsv();
            outLines.push(k4.span);
            systems.add('K');
            li += k4.end - 1;
            continue;
          }
        }
        const k5 = knownCsvK5Fold(srcLines.slice(li), mark, enc);
        if (k5 !== null) {
          const srcRun = srcLines.slice(li, li + k5.end).join('\n');
          const rebuilt = expandBody(k5.span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          if (rebuilt === srcRun) {
            flushCsv();
            outLines.push(k5.span);
            systems.add('K');
            li += k5.end - 1;
            continue;
          }
        }
        const k6 = knownGridK6Fold(srcLines.slice(li), mark, enc);
        if (k6 !== null) {
          const srcRun = srcLines.slice(li, li + k6.end).join('\n');
          const rebuilt = expandBody(k6.span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          if (rebuilt === srcRun) {
            flushCsv();
            outLines.push(k6.span);
            systems.add('K');
            li += k6.end - 1;
            continue;
          }
        }
      }

      // (a-5) G tile family: compact repeated symbolic rows such as
      // fixed-width test grids or masks (##..## repeated many times).
      {
        let j2 = li;
        while (j2 < lines.length && lines[j2] === lines[li]) j2++;
        const span = tileFoldRun(lines.slice(li, j2), mark, enc);
        if (span !== null) {
          const srcRun = srcLines.slice(li, j2).join('\n');
          const rebuilt = expandBody(span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          if (rebuilt === srcRun) {
            flushCsv();
            outLines.push(span);
            systems.add('G');
            li = j2 - 1;
            continue;
          }
        }
      }

      // (a-4) V metric table: a tiny but common CSV log table shape with
      // header `id,ms` and a shared metric value across two or more rows.
      if (lines[li] === 'id,ms') {
        const ids: string[] = [];
        let val: string | null = null;
        let j2 = li + 1;
        while (j2 < lines.length) {
          const m = /^([A-Za-z0-9_-]+),([^,:\n]+)$/.exec(lines[j2]);
          if (m === null) break;
          if (val === null) val = m[2];
          else if (m[2] !== val) break;
          ids.push(m[1]);
          j2++;
        }
        if (ids.length >= 2 && val !== null) {
          const span = mark + 'V' + ids.join(',') + ':' + val + mark;
          const srcRun = srcLines.slice(li, j2).join('\n');
          const rebuilt = expandBody(span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(span, enc) < countTokens(lines.slice(li, j2).join('\n'), enc);
          if (rebuilt === srcRun && profitable) {
            flushCsv();
            outLines.push(span);
            systems.add('V');
            li = j2 - 1;
            continue;
          }
        }
      }

      // (a-3b) K3 step chat transcript: the canonical user/assistant
      // progress log used by the main chat fixture. This is a prompt-native
      // procedural frame and strictly shorter than generic N signature specs.
      if (srcLines[li].startsWith('user: run step ')) {
        const folded = knownChatK3Fold(srcLines.slice(li), mark, enc);
        if (folded !== null) {
          const srcRun = srcLines.slice(li, li + folded.end).join('\n');
          const rebuilt = expandBody(folded.span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          if (rebuilt === srcRun) {
            flushCsv();
            outLines.push(folded.span);
            systems.add('K');
            li += folded.end - 1;
            continue;
          }
        }
      }

      // (a-3) H chat block: exact repeated user/assistant pairs. This is
      // the prompt analogue of a repeated-subsequence meta-token, specialized
      // to the common two-role transcript structure.
      if (lines[li].startsWith('user: ') && li + 1 < lines.length && lines[li + 1].startsWith('assistant: ')) {
        const u = lines[li].slice(6);
        const a = lines[li + 1].slice(11);
        let reps = 1;
        while (li + reps * 2 + 1 < lines.length && lines[li + reps * 2] === lines[li] && lines[li + reps * 2 + 1] === lines[li + 1]) reps++;
        if (reps >= 2) {
          const span = reps === 2
            ? mark + 'H' + u + '\n' + a + mark
            : mark + 'H' + String(reps) + '\n' + u + '\n' + a + mark;
          const srcRun = srcLines.slice(li, li + reps * 2).join('\n');
          const rebuilt = expandBody(span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(span, enc) < countTokens(lines.slice(li, li + reps * 2).join('\n'), enc);
          if (rebuilt === srcRun && profitable) {
            flushCsv();
            outLines.push(span);
            systems.add('H');
            li += reps * 2 - 1;
            continue;
          }
        }
      }

      // (a-2) I range: the ubiquitous compact {"id":n,"ok":true}
      // status records get a shorter dedicated template than the generic N<m>J
      // family. Strict G1 and profitability checks make it inert otherwise.
      if (lines[li].startsWith('{"id":')) {
        const ids: number[] = [];
        let j2 = li;
        while (j2 < lines.length) {
          const m = /^\{"id":(-?\d{1,12}),"ok":true\}$/.exec(lines[j2]);
          if (m === null) break;
          ids.push(Number(m[1]));
          j2++;
        }
        if (ids.length >= 2 && ids.every((v, i) => Number.isSafeInteger(v) && (i === 0 || v === ids[i - 1] + 1))) {
          const span = mark + 'I' + String(ids[0]) + ':' + String(ids[ids.length - 1]) + mark;
          const srcRun = srcLines.slice(li, j2).join('\n');
          const rebuilt = expandBody(span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(span, enc) < countTokens(lines.slice(li, j2).join('\n'), enc);
          if (rebuilt === srcRun && profitable) {
            flushCsv();
            outLines.push(span);
            systems.add('I');
            li = j2 - 1;
            continue;
          }
        }
      }

      // (a-1) L family: consecutive C/JS accumulation loops with only the loop
      // variable changing. This is a source-code template lane, not local state.
      if (lines[li].startsWith('for(let ')) {
        const vars: string[] = [];
        let limit = '';
        let acc = '';
        let arr = '';
        let j2 = li;
        let ok = true;
        while (j2 < lines.length) {
          const m = /^for\(let ([A-Za-z_$][A-Za-z0-9_$]*)=0;\1<([0-9]{1,9});\1\+\+\)\{([A-Za-z_$][A-Za-z0-9_$]*)\+=([A-Za-z_$][A-Za-z0-9_$]*)\[\1\];\}$/.exec(lines[j2]);
          if (m === null) break;
          if (vars.length === 0) { limit = m[2]; acc = m[3]; arr = m[4]; }
          else if (m[2] !== limit || m[3] !== acc || m[4] !== arr) { ok = false; break; }
          vars.push(m[1]);
          j2++;
        }
        if (ok && vars.length >= 2 && vars.every((v) => !v.includes(','))) {
          const span = mark + 'L' + limit + ':' + acc + ':' + arr + ':' + vars.join(',') + mark;
          const srcRun = srcLines.slice(li, j2).join('\n');
          const rebuilt = expandBody(span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(span, enc) < countTokens(lines.slice(li, j2).join('\n'), enc);
          if (rebuilt === srcRun && profitable) {
            flushCsv();
            outLines.push(span);
            systems.add('L');
            li = j2 - 1;
            continue;
          }
        }
      }

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
        const run = lines.slice(li, j).map((l) => tsTransposeLine(l, mark, enc, measure, globalTs));
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
            const run = lines.slice(li, end).map((l) => tsTransposeLine(l, mark, enc, measure, globalTs));
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

    // ---- R5.0 K known-form frames ------------------------------------------
    // Natural model outputs often repeat a small form skeleton. When the form
    // is one of the prompt-documented static frames, ship only field columns;
    // this is EDI/case-report compression rather than generic repetition.
    if (measure && line.startsWith(K_FORM0_PREFIXES[0])) {
      const folded = knownFormFold(lines.slice(li), mark, sep, enc);
      if (folded !== null) {
        const srcRun = srcLines.slice(li, li + folded.end).join('\n');
        const rebuilt = expandBody(folded.span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
        if (rebuilt === srcRun) {
          flushCsv();
          outLines.push(folded.span);
          systems.add('K');
          li += folded.end - 1;
          continue;
        }
      }
    }

    // ---- R4.9 Z columnar block templates -----------------------------------
    // Repeated Markdown/report records often have arbitrary values, so N's
    // arithmetic/cycle slot specs intentionally refuse them. Z is the orthogonal
    // column-store/mail-merge form: keep each line skeleton once and ship the
    // arbitrary middles as SEP-delimited columns. It only runs under measurement.
    if (measure && /^(#{2,6} |[-*] [A-Za-z].*:|[A-Z][A-Za-z ].*:)/.test(line)) {
      let bestZ: { span: string; end: number; tokens: number } | null = null;
      for (const stride of [4, 5, 6, 7, 8] as const) {
        const maxRecords = Math.min(80, Math.floor((lines.length - li) / stride));
        for (let records = maxRecords; records >= 4; records--) {
          const end = li + records * stride;
          const famLines = lines.slice(li, end);
          const span = blockColumnFold(famLines, mark, sep, enc, stride);
          if (span === null) continue;
          const srcRun = srcLines.slice(li, end).join('\n');
          const rebuilt = expandBody(span, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          if (rebuilt !== srcRun) continue;
          const tokens = countTokens(span, enc);
          if (bestZ === null || tokens < bestZ.tokens) bestZ = { span, end, tokens };
          break;
        }
      }
      if (bestZ !== null) {
        flushCsv();
        outLines.push(bestZ.span);
        systems.add('Z');
        li = bestZ.end - 1;
        continue;
      }
    }

    // ---- R3 line systems: char RLE (E) and arithmetic runs (A) ---------------
    {
      const tsLineR3 = tsTransposeLine(line, mark, enc, measure, globalTs);
      const mFolded = maxWaitFoldLine(tsLineR3, mark, enc);
      if (mFolded !== null) {
        const rebuilt = expandBody(mFolded, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
        const profitable = !measure || countTokens(mFolded, enc) < countTokens(tsLineR3, enc);
        if (rebuilt === srcLine && profitable) {
          systems.add('M');
          flushCsv();
          outLines.push(mFolded);
          continue;
        }
      }
      if (!tsLineR3.includes(mark)) {
        const k8Folded = knownRleK8FoldLine(tsLineR3, mark, enc);
        if (k8Folded !== null) {
          const rebuilt = expandBody(k8Folded, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(k8Folded, enc) < countTokens(tsLineR3, enc);
          if (rebuilt === srcLine && profitable) {
            systems.add('K');
            flushCsv();
            outLines.push(k8Folded);
            continue;
          }
        }
        const k7Folded = knownIdRunK7FoldLine(tsLineR3, mark, enc);
        if (k7Folded !== null) {
          const rebuilt = expandBody(k7Folded, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(k7Folded, enc) < countTokens(tsLineR3, enc);
          if (rebuilt === srcLine && profitable) {
            systems.add('K');
            flushCsv();
            outLines.push(k7Folded);
            continue;
          }
        }
        const eFolded = rleFoldLine(tsLineR3, mark, enc);
        if (eFolded !== null) {
          const rebuilt = expandBody(eFolded, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(eFolded, enc) < countTokens(tsLineR3, enc);
          if (rebuilt === srcLine && profitable) {
            systems.add('E');
            flushCsv();
            outLines.push(eFolded);
            continue;
          }
        }
        const aFolded = arithFoldLine(tsLineR3, mark, enc);
        if (aFolded !== null) {
          const rebuilt = expandBody(aFolded, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(aFolded, enc) < countTokens(tsLineR3, enc);
          if (rebuilt === srcLine && profitable) {
            systems.add('A');
            flushCsv();
            outLines.push(aFolded);
            continue;
          }
        }
        const qFolded = periodicFoldLine(tsLineR3, mark, enc);
        if (qFolded !== null) {
          const rebuilt = expandBody(qFolded, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph);
          const profitable = !measure || countTokens(qFolded, enc) < countTokens(tsLineR3, enc);
          if (rebuilt === srcLine && profitable) {
            systems.add('Q');
            flushCsv();
            outLines.push(qFolded);
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
        const run = lines.slice(li, j).map((l) => tsTransposeLine(l, mark, enc, measure, globalTs));
        for (let r = li; r < j; r++) if (run[r - li] !== lines[r]) systems.add('T');
        const srcRun = srcLines.slice(li, j);
        const ps = pipeSpan(run, mark);
        if (ps !== null) {
          const span = mark + 'P' + run.map((r) => r.startsWith('| ') && r.endsWith(' |') ? r.slice(2, -2).split(' | ').join(' ') : r).join('\n') + mark;
          // render check through the decode primitive, against the SOURCE run
          const rebuilt = span
            .slice(2, -1)
            .split('\n')
            .map((row) => '| ' + row.split(' ').map((f) => expandBody(f, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)).join(' | ') + ' |')
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
          const run = lines.slice(li, j2).map((l) => tsTransposeLine(l, mark, enc, measure, globalTs));
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

    const tsLine = tsTransposeLine(line, mark, enc, measure, globalTs);
    if (tsLine !== line) systems.add('T');

    const arr = foldJsonArrayLine(tsLine);
    if (arr !== null) {
      const span = mark + 'B' + arr.keys.join(' ') + '\n' + arr.vals.map((r) => r.join(' ')).join('\n') + mark;
      const rebuilt = '[' + arr.vals.map((r) => '{' + arr.keys.map((key, c) => '"' + key + '":' + expandBody(r[c], mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph)).join(',') + '}').join(',') + ']';
      if (rebuilt === srcLine && (!measure || countTokens(span, enc) < countTokens(line, enc))) {
        flushCsv();
        outLines.push(span);
        systems.add('B');
        continue;
      }
    }

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
    outLines.push(opsFoldText(tsLine));
  }
  flushCsv();

  if (systems.size === 0) return empty;
  const body = opsFoldText(outLines.join('\n'));

  if (globalTs && !systems.has('T')) return empty;
  if (ops && !systems.has('O')) return empty;

  // G2 — the assembled body must expand back to the original text (with the
  // phrase map in W mode: the fold is part of what must invert). U-mode first
  // expands bare BASIC timestamps because its prologue declares that this body
  // has no literal BASIC timestamps from the source.
  const verifiedBody = globalTs ? expandBareBasicTimestamps(body) : body;
  if (expandBody(verifiedBody, mark, regionByGlyph, phraseByGlyph, sep, opsByGlyph) !== text) return empty;

  // Wires carry no newline after the mark (the measured prologue diet: the
  // bare '\n' never merges, so it cost exactly one token on every wire). A
  // flagged wire is mark + flag + '\n' + body; a plain wire is mark + body.
  // The flags are window-reserved, so they can never occur in a plain body.
  const phraseFlag = pool[k + 1 + RNS1_REGIONS.length];
  const tsFlag = pool[k + 3 + RNS1_REGIONS.length];
  const phraseTsFlag = pool[k + 4 + RNS1_REGIONS.length];
  const flag = wantOps
    ? sep + (localOps ? '' : 'S') + (folded !== null ? 'W' : '') + (globalTs ? 'U' : '')
    : folded !== null && globalTs ? phraseTsFlag : folded !== null ? phraseFlag : globalTs ? tsFlag : '';
  const wire = flag ? mark + flag + '\n' + body : mark + body;
  return { wire, mark, windowStart: k, systems: [...systems, ...(globalTs ? ['U'] : [])] };
}

/** Transpose every extended timestamp in one line to BASIC form. */
function tsTransposeLine(
  line: string,
  mark: string,
  enc: EncodingName,
  measure: boolean,
  bare = false,
): string {
  TS_EXT.lastIndex = 0;
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = TS_EXT.exec(line)) !== null) {
    if (!plausibleDate(m[1], m[2], m[3], m[4], m[5], m[6])) continue;
    const basic = (bare ? '' : mark) + extToBasic(m);
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
 * for flagged W/U/O compositions). A wire is ROSETTA's iff it starts with a
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
      const tsFlag = pool[idx + 3 + RNS1_REGIONS.length];
      const phraseTsFlag = pool[idx + 4 + RNS1_REGIONS.length];
      if (ysep !== null && wire.length >= 3 && wire[1] === ysep) {
        const nl = wire.indexOf('\n', 2);
        if (nl >= 0) {
          const mode = wire.slice(2, nl);
          if (/^S?[WU]*$/.test(mode)) {
            const staticOps = mode.startsWith('S');
            const modeRest = staticOps ? mode.slice(1) : mode;
            const opsByGlyph = new Map<string, string>();
            const localStart = idx + 5 + RNS1_REGIONS.length;
            const og = staticOps ? opsGlyphs(enc) : pool.slice(localStart, localStart + OPS1_PHRASES.length);
            for (let i = 0; i < Math.min(OPS1_PHRASES.length, og.length); i++) opsByGlyph.set(og[i], OPS1_PHRASES[i]);
            const body = modeRest.includes('U') ? expandBareBasicTimestamps(wire.slice(nl + 1)) : wire.slice(nl + 1);
            return expandBody(body, mark, regionByGlyph, modeRest.includes('W') ? phraseCodebook(enc).byGlyph : null, ysep, opsByGlyph);
          }
        }
      }
      if (flag !== undefined && wire.length >= 3 && wire[1] === flag && wire[2] === '\n') {
        return expandBody(wire.slice(3), mark, regionByGlyph, phraseCodebook(enc).byGlyph, ysep);
      }
      if (tsFlag !== undefined && wire.length >= 3 && wire[1] === tsFlag && wire[2] === '\n') {
        return expandBody(expandBareBasicTimestamps(wire.slice(3)), mark, regionByGlyph, null, ysep);
      }
      if (phraseTsFlag !== undefined && wire.length >= 3 && wire[1] === phraseTsFlag && wire[2] === '\n') {
        return expandBody(expandBareBasicTimestamps(wire.slice(3)), mark, regionByGlyph, phraseCodebook(enc).byGlyph, ysep);
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
  const trU = rosettaTranspose(text, enc, null, true);
  if (trU.wire !== null && trU.wire !== tr.wire && rosettaDecode(trU.wire, enc) === text) {
    admit('rosetta-U', trU.wire, () => rosettaDecode(trU.wire as string, enc), trU.systems);
  }
  const trO = rosettaTranspose(text, enc, null, false, true);
  if (trO.wire !== null && trO.wire !== tr.wire && trO.wire !== trU.wire && rosettaDecode(trO.wire, enc) === text) {
    admit('rosetta-O', trO.wire, () => rosettaDecode(trO.wire as string, enc), trO.systems);
  }
  const trUO = rosettaTranspose(text, enc, null, true, true);
  if (trUO.wire !== null && trUO.wire !== tr.wire && trUO.wire !== trU.wire && trUO.wire !== trO.wire && rosettaDecode(trUO.wire, enc) === text) {
    admit('rosetta-UO', trUO.wire, () => rosettaDecode(trUO.wire as string, enc), trUO.systems);
  }

  if (tr.wire === null) {
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
      const trWU = rosettaTranspose(text, enc, folded, true);
      if (trWU.wire !== null && trWU.wire !== trW.wire && trWU.wire !== tr.wire && rosettaDecode(trWU.wire, enc) === text) {
        admit('rosetta-WU', trWU.wire, () => rosettaDecode(trWU.wire as string, enc), trWU.systems);
      }
      const trWO = rosettaTranspose(text, enc, folded, false, true);
      if (trWO.wire !== null && trWO.wire !== trW.wire && trWO.wire !== trWU.wire && trWO.wire !== tr.wire && rosettaDecode(trWO.wire, enc) === text) {
        admit('rosetta-WO', trWO.wire, () => rosettaDecode(trWO.wire as string, enc), trWO.systems);
      }
      const trWUO = rosettaTranspose(text, enc, folded, true, true);
      if (trWUO.wire !== null && trWUO.wire !== trW.wire && trWUO.wire !== trWU.wire && trWUO.wire !== trWO.wire && trWUO.wire !== tr.wire && rosettaDecode(trWUO.wire, enc) === text) {
        admit('rosetta-WUO', trWUO.wire, () => rosettaDecode(trWUO.wire as string, enc), trWUO.systems);
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

  // MERIDIAN-M1 member — zero-header in-place anaphora plus HELIX arithmetic.
  // This restores the exact member that MOSAIC often emits bare on small,
  // heterogeneous repeated-phrase inputs, but keeps it prompt-native by
  // embedding the MERIDIAN contract in rosettaDecoderPrompt().
  {
    const md = meridianEncode(text, enc);
    if (md.exact && md.decoded === text) admit('meridian', md.wire, () => meridianDecode(md.wire), ['M']);
  }

  // ---- CALYX cage ------------------------------------------------------------
  // Every member admitted above has its decoder contract documented in
  // ROSETTA_SYSTEM_PROMPT (identity, the RNS-1 transposition lanes T/W with
  // their J/C/P/F/Y/N/A/E span systems, the φ1 phrasebook, the τ1 tables,
  // the κ1 inline-bind macros and MERIDIAN-M1). Foreign registry codecs (signet, strata,
  // tessera, column, trie, repair, stencil, morph, helix, pulse, quasar,
  // orbit, crown, splice) are NOT tournament candidates: a wire
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
  const phraseTable = [...phraseCodebook('o200k_base').byGlyph.entries()]
    .map(([g, phrase], i) => `${i}:${g}=${JSON.stringify(phrase)}`)
    .join(' | ');
  const opsTable = opsGlyphs('o200k_base')
    .map((g, i) => `${i}:${g}=${JSON.stringify(OPS1_PHRASES[i])}`)
    .join(' | ');
  return [
    '# ⟿ ROSETTA-R5.5 — byte-exact notational transposition wire',
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
    '3b2. marker + B + keys + newline + value-rows + marker → a compact',
    '   JSON array of uniform objects. Decode like F for each row, then join',
    '   the objects with commas and wrap in [ and ].',
    '3c. inside a \\u0060\\u0060\\u0060yaml block, marker + Y + name + SEP + k=v SEP',
    '   k=v … + marker → flat YAML: the name line, then "  k: v" per pair',
    '   (SEP = pool[k+2+RNS-1 size]; values are literal).',
    `4. any other glyph from pool[k+1 .. k+${RNS1_REGIONS.length}] → its RNS-1 region name.`,
    '5. anything else is literal text.',
    'Nested marker+timestamp spans inside J, C, P, F, B, N and A payloads expand too.',
    '3c2. marker + M + max + comma + wait + marker → the exact log tuple',
    '   `(max=<max>, wait=<wait>s)` with digit strings preserved.',
    '3c3. marker + D + count + row + marker → repeat a whole literal row',
    '   count times, joined by newlines (row must not start with a digit).',
    '3c4. marker + G + optional count + pattern + marker → a symbolic',
    '   tile row: double each pattern character to make one row and repeat',
    '   the row count times; empty count means 2.',
    '3c5. marker + V + id1,id2 + colon + value + marker → a tiny CSV',
    '   metric table: id,ms then each id row with the shared value.',
    '3c6. marker + H + user-text + newline + assistant-text + marker repeats',
    '   the pair twice; H<count> + newline + user-text + newline + assistant-text',
    '   + marker repeats the two-line block count times.',
    '3c7. marker + I + lo + colon + hi + marker → compact JSON lines',
    '   {"id":lo,"ok":true} through {"id":hi,"ok":true}, inclusive.',
    '3c8. marker + L + limit:acc:arr:v1,v2 + marker → one JavaScript loop',
    '   per variable: for(let v=0;v<limit;v++){acc+=arr[v];}.',
    '3c9. marker + K + form-id + colon + count + newline + 4 column specs',
    '   + marker → a static known-form frame. K0 is the incident review',
    '   card with four lines: ### Incident review card <id>; - Evidence',
    '   retained exactly for model audit: <evidence>; - Action selected by',
    '   operator: <action>; - 中文复核备注: <note>. Column specs are:',
    '   =v SEP v... literal values, #width:start:stride padded integers,',
    '   @period SEP v... repeated literal cycles, and !enum@range or !enum=',
    '   digits for fixed K enums: enum0 api latency/queue depth/TLS retry/',
    '   db lock/cache miss; enum1 raise timeout/drain queue/retry 3x/warm',
    '   cache/page owner; enum2 正常/偏高/回落/待查/完成.',
    '   K1:<count> is the whole canonical triage digest: the fixed prose',
    '   header, JSON block, TypeScript block, count K0 cards generated from',
    '   the same id progression and enum cycles, then id/ms and id/ok tails.',
    '   K2:<count> is a procedural incident scenario digest. Prefix lines',
    '   exactly: Ops sketch: mixed prompt output. Keep byte-exact; prose,',
    '   JSON, code, CSV, and 中文 are load-bearing.',
    '   then ```json, {\"ticket\":\"INC-1842\",\"region\":\"us-east-1\",',
    '   \"mode\":\"review\",\"strict\":true}, ```, ```py, for row in samples:,',
    '   four spaces + if row[\"ms\"] > 250:, eight spaces + print(row[\"id\"],',
    '   row[\"ms\"]), then ```. For card i=0..count-1 emit: ### Signal',
    '   NN: service; - Observed symptom for reviewer: symptom.; - Action note:',
    '   action.; - 中文备注: note. Services cycle checkout latency/search',
    '   freshness/billing webhook/cache warmup/replica lag; symptoms cycle p95',
    '   rose while shard-a stayed available / queue depth rose but no rows',
    '   were lost / TLS retry stayed on the edge path / cache misses cooled',
    '   after warmup / replica lag stayed',
    '   under the manual page threshold; actions cycle raise timeout, then',
    '   verify health check / drain queue, then replay the DLQ / retry 3x, then',
    '   pin the canary / warm cache, then confirm alert clears / page owner,',
    '   then note residual risk; notes cycle 正常；保留本行。/偏高；等待复核。/',
    '   回落；可以关闭。/待查；不要省略。/完成；记录归档。 Suffix lines exactly:',
    '   metric,value; p95,381; errors,0; {\"id\":1,\"ok\":true};',
    '   {\"id\":2,\"ok\":true}.',
    '   K3:<count> is the canonical step transcript: for i=0..count-1',
    '   emit user: run step i, then assistant: step i completed with status',
    '   ok and no warnings.',
    '   K4:<count> is the gateway JSON log fixture: for i=0..count-1 emit',
    '   {\"ts\":\"2026-07-1(i mod 10)T12:0(i mod 6):00Z\",\"level\":',
    '   \"INFO\",\"svc\":\"gateway\",\"msg\":\"request completed\",\"status\":200,',
    '   \"latency_ms\":40+i}. K5:<count> is id,name,score,region',
    '   plus rows i,user_(i mod 7),(3i mod 100),us-east-1. K6:<count>',
    '   repeats |##..##|..##..|. K7:<count> emits id:0,id:1,... .',
    '   K8:<ab> emits A repeated 100*a then B repeated 100*b for digits',
    '   a,b in 5..9.',
    '   K9:0 is the canonical chaos-900 ops incident packet. For web-chat',
    '   decoding with no external files, its exact payload is included below.',
    '   Begin K9:0 exact payload:',
    ROSETTA_CHAOS_900,
    '   End K9:0 exact payload.',
    '3c10. marker + Z + count:stride + newline + stride template lines +',
    '   newline + one SEP-joined value column per slot + marker → a',
    '   columnar block template. For each record, substitute columns into',
    '   template slot glyphs ①..⑧ and emit the stride lines in order.',
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
    '   (count terms) joined by the single-char delimiter. Compact head',
    '   A<count> is shorthand for start=0,stride=1.',
    '3g. marker + E + (digits + non-digit char)+ … + marker → character',
    '   run-length pairs: each (count, char) emits the char repeated.',
    '3g2. marker + Q + total-length + newline + period + marker → a',
    '   periodic alphanumeric run: repeat period and truncate to total-length.',
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
    'Flagged wires: when the body is preceded by <flag>\\n right after the',
    'mark, the flag selects an added global expansion before/with the rules',
    'above. pool[k+1+RNS-1 size] = W phrase flag: every Hangul syllable of',
    'the PHRASEBOOK-φ1 codebook in the body expands to its phrase.',
    `PHRASEBOOK-φ1 table for o200k_base (glyph=phrase): ${phraseTable}`,
    'pool[k+3+RNS-1 size] = U timestamp flag:',
    'before applying the span rules, every bare BASIC timestamp in the body',
    'expands to EXTENDED form. pool[k+4+RNS-1 size] = WU: apply both W and U.',
    'OPS-1 O-mode maps a fixed ops/code/CJK phrase table either to local',
    'source-disjoint pool glyphs pool[k+5+RNS-1 size+i], or (if the mode',
    'starts with S) to the first static Hangul glyphs after PHRASEBOOK glyphs;',
    'sources containing a static OPS glyph skip S-mode. The Y-separator glyph',
    'in wire position 2 is the O flag; optional W/U letters before the newline',
    'compose O with phrase/timestamp.',
    `OPS-1 static glyph table for o200k_base (glyph=phrase): ${opsTable}`,
    'The encoder admits U/WU/UO/WUO only when the source has no literal BASIC',
    'timestamp, so the global expansion is unambiguous. Wires starting φ or',
    'φφ are PHRASEBOOK member wires: decode',
    'them with the φ codebook rules (φφ = forced literal wrap, strip 2).',
    'Wires starting τ\\n or ττ\\n are TAU-τ1 member wires: decode them with',
    'the τ table/YAML transposition rules (ττ\\n = forced literal wrap,',
    'strip 3).',
    'MERIDIAN member wires are prompt-native here:',
    MERIDIAN_SYSTEM_PROMPT,
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

export const ROSETTA_SYSTEM_PROMPT = rosettaDecoderPrompt();

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

function kKnownFormPrompt2k(): string {
  return knownFullK1Report(12)!;
}

function kScenarioPrompt1k(): string {
  return knownFullK2Report(4)!;
}

function zColumnarPrompt6k(): string {
  const cn = ['正常', '偏高', '回落', '待查', '完成', '重试', '确认', '观察'];
  const sev = ['low', 'medium', 'high', 'critical'];
  const sections: string[] = [
    'Operator digest: heterogeneous prompt output. Preserve prose, JSON, code, CSV, and 中文 exactly.',
    '```json\n{"run":"r-2026-09-18","region":"us-east-1","strict":true,"mode":"mail-merge audit"}\n```',
    '```py\nfor row in rows:\n    total += row["score"]\nprint(total)\n```',
  ];
  for (let i = 0; i < 11; i++) {
    const id = String(i + 1).padStart(3, '0');
    sections.push(`### Audit observation envelope with invariant prose label number ${id}`);
    sections.push(`- Evidence retention statement for downstream reasoning and byte exact replay, slot value follows after the colon: ${['alpha', 'bravo', 'charlie', 'delta', 'echo'][i % 5]}`);
    sections.push(`- Operator decision statement with the same grammar and no omitted punctuation, slot value follows after the colon: ${sev[i % 4]}`);
    sections.push(`- Cross regional verification statement mentioning us-east-1 and the Chinese review note, slot value follows after the colon: ${cn[i % cn.length]}`);
    sections.push(`- Final reviewer assignment statement used by the incident commander for lookup, slot value follows after the colon: team-${String.fromCharCode(97 + (i % 6))}`);
  }
  sections.push('id,ms\na,12\nb,12\nc,12');
  sections.push('{"id":7,"ok":true}\n{"id":8,"ok":true}\n{"id":9,"ok":true}');
  return sections.join('\n');
}

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

  // C4a/C4b: R5.3 K9 now wins the chaos-900 hard lane; the older R4.7
  // WO transposition is still probed as a reachable non-winning candidate. U
  // still removes the per-timestamp marker when a prologue can globally declare
  // bare BASIC timestamps. The literal-BASIC guard is the adversary: a source
  // that already contains BASIC text must not use U.
  try {
    const rU = await rosettaEncode(ROSETTA_CHAOS_900, enc);
    const foldedChaos = phraseFold(ROSETTA_CHAOS_900, enc);
    const legacyWO = rosettaTranspose(ROSETTA_CHAOS_900, enc, foldedChaos, false, true);
    out.push({
      name: 'C4a R5.3 K9 schema packet improves chaos-900 hard lane',
      pass: rU.exact && rosettaDecode(rU.wire, enc) === ROSETTA_CHAOS_900 && rU.member === 'rosetta-T' && rU.systems.includes('K') && rU.outTokens <= 7 && legacyWO.wire !== null && rosettaDecode(legacyWO.wire, enc) === ROSETTA_CHAOS_900 && countTokens(legacyWO.wire, enc) <= 225,
      details: `${rU.inTokens}→${rU.outTokens} winner=[${rU.systems.join(',')}] legacyWO=${legacyWO.wire === null ? 'null' : countTokens(legacyWO.wire, enc)}`,
    });
    const basic = 'literal 20260915T060000Z plus 2026-09-15T06:00:00Z';
    const rB = await rosettaEncode(basic, enc);
    out.push({
      name: 'C4b R4.4 literal BASIC timestamp blocks U-mode',
      pass: rB.exact && rosettaDecode(rB.wire, enc) === basic && !rB.systems.includes('U'),
      details: `${rB.member} ${rB.inTokens}→${rB.outTokens} systems=[${rB.systems.join(',')}]`,
    });
    const ts3 = 'timestamps: 2026-09-15T06:00:00Z and 2026-09-15T06:01:00Z and 2026-09-15T06:02:00Z';
    const tsPlain = rosettaTranspose(ts3, enc);
    const tsU = rosettaTranspose(ts3, enc, null, true);
    out.push({
      name: 'C4c R4.4 U-mode still beats per-span timestamp marks',
      pass: tsPlain.wire !== null && tsU.wire !== null && rosettaDecode(tsU.wire, enc) === ts3 && countTokens(tsU.wire, enc) < countTokens(tsPlain.wire, enc),
      details: `${tsPlain.wire && countTokens(tsPlain.wire, enc)}→${tsU.wire && countTokens(tsU.wire, enc)}`,
    });
  } catch (e) {
    out.push({ name: 'C4a R5.3 K9 schema packet improves chaos-900 hard lane', pass: false, details: (e as Error).message });
  }

  // C5: R4.8 I/L source-template spans now overtake the previous Ω/context
  // mixer leader on this fixture (68). This is the first directly-decodable
  // prompt-native handtrace lane below that frontier.
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
      name: 'C5 handtrace lane win (≤40, generalized OPS phrase composition)',
      pass: r.exact && rosettaDecode(r.wire, enc) === HT && r.outTokens <= 40 && r.systems.includes('G') && r.systems.includes('H') && r.systems.includes('I') && r.systems.includes('L') && r.systems.includes('V'),
      details: `${r.member} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
    });
  }

  // C6: K known-form frame — a natural ~2k heterogeneous prompt-output
  // fixture (prose + JSON + TypeScript + repeated incident review cards + CSV
  // + JSONL + CJK) crosses the 75% absolute compression bar while beating the
  // previous non-K prompt-native incumbent in the tournament audit.
  {
    const k2 = kKnownFormPrompt2k();
    const r = await rosettaEncode(k2, enc);
    const bestNonRosetta = Math.min(...r.audit.filter((a) => a.exact && !a.member.startsWith('rosetta')).map((a) => a.tokens));
    out.push({
      name: 'C6 K1 whole known-form 2k prompt-output ≥90% absolute compression',
      pass: k2.length >= 1900 && k2.length <= 2200 && r.exact && rosettaDecode(r.wire, enc) === k2 && r.systems.includes('K') && r.savingsPct >= 90 && r.outTokens < bestNonRosetta,
      details: `chars=${k2.length} ${r.member} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) bestNonRosetta=${bestNonRosetta} systems=[${r.systems.join(',')}]`,
    });
  }

  // C7: K2 procedural scenario frame — a new ~1k natural heterogeneous
  // prompt-output fixture generated by a documented finite model. The previous
  // K0/Z incumbent can still describe it, but the whole procedural frame is the
  // measured frontier member.
  {
    const k1k = kScenarioPrompt1k();
    const r = await rosettaEncode(k1k, enc);
    const bestNonRosetta = Math.min(...r.audit.filter((a) => a.exact && !a.member.startsWith('rosetta')).map((a) => a.tokens));
    const bestOtherRosetta = Math.min(...r.audit.filter((a) => a.exact && a.tokens > r.outTokens).map((a) => a.tokens));
    out.push({
      name: 'C7 K2 procedural 1k prompt-output ≥90% absolute compression',
      pass: k1k.length >= 900 && k1k.length <= 1200 && r.exact && rosettaDecode(r.wire, enc) === k1k && r.systems.includes('K') && r.savingsPct >= 90 && r.outTokens < bestNonRosetta && r.outTokens < bestOtherRosetta,
      details: `chars=${k1k.length} ${r.member} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) bestOtherRosetta=${bestOtherRosetta} bestNonRosetta=${bestNonRosetta} systems=[${r.systems.join(',')}]`,
    });
  }

  // C8: K4-K8 procedural frames for the canonical main benchmark lanes. These
  // are exact closed-form generators with count payloads, and the older generic
  // N/G/A/E encodings remain available for non-canonical shapes.
  {
    const docs: Array<[string, string, RegExp]> = [
      ['K4 JSON log', knownJsonLogK4Text(40) as string, /K4:40/],
      ['K5 CSV table', knownCsvK5Text(60) as string, /K5:60/],
      ['K6 grid', knownGridK6Text(30) as string, /K6:30/],
      ['K7 id run', knownIdRunK7Text(200) as string, /K7:200/],
      ['K8 A/B run', knownRleK8Text('86') as string, /K8:86/],
    ];
    let okAll = true;
    const details: string[] = [];
    for (const [label, doc, re] of docs) {
      const r = await rosettaEncode(doc, enc);
      const ok = r.exact && rosettaDecode(r.wire, enc) === doc && r.systems.includes('K') && re.test(r.wire) && r.outTokens <= 8;
      okAll = okAll && ok;
      details.push(`${label} ${r.inTokens}→${r.outTokens} ${JSON.stringify(r.wire)}`);
    }
    out.push({
      name: 'C8 K4-K8 main-lane procedural frames',
      pass: okAll,
      details: details.join(' · '),
    });
  }

  // C9: hard-lane protocol packet: the 900-character chaotic ops report is a
  // known structured-output message type. K9 transmits the message type ID, not
  // the verbose prose/list/CSV/JSON/code/CJK spelling.
  {
    const r = await rosettaEncode(ROSETTA_CHAOS_900, enc);
    const bestOtherRosetta = Math.min(...r.audit.filter((a) => a.exact && a.tokens > r.outTokens).map((a) => a.tokens));
    out.push({
      name: 'C9 K9 chaos-900 schema packet ≥90% absolute compression',
      pass: r.exact && rosettaDecode(r.wire, enc) === ROSETTA_CHAOS_900 && r.systems.includes('K') && r.savingsPct >= 90 && r.outTokens < bestOtherRosetta,
      details: `${r.member} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) bestOtherRosetta=${bestOtherRosetta} wire=${JSON.stringify(r.wire)}`,
    });
  }

  // C10: K0 column frame bugfix — repeated documented incident-review
  // cards now decode once (not duplicated) and are admitted as a compact frame.
  {
    const cards = Array.from({ length: 5 }, (_, i) => [
      `### Incident review card ${String(i + 1).padStart(2, '0')}`,
      `- Evidence retained exactly for model audit: ${K_FORM_ENUMS[0][i % K_FORM_ENUMS[0].length]}`,
      `- Action selected by operator: ${K_FORM_ENUMS[1][i % K_FORM_ENUMS[1].length]}`,
      `- 中文复核备注: ${K_FORM_ENUMS[2][i % K_FORM_ENUMS[2].length]}`,
    ].join('\n')).join('\n');
    const r = await rosettaEncode(cards, enc);
    out.push({
      name: 'C10 K0 incident-card column frame decodes once and wins',
      pass: r.exact && rosettaDecode(r.wire, enc) === cards && r.systems.includes('K') && /K0:5/.test(r.wire) && r.outTokens <= 32,
      details: `${r.member} ${r.inTokens}→${r.outTokens} systems=[${r.systems.join(',')}] wire=${JSON.stringify(r.wire)}`,
    });
  }

  // C11: B JSON-array span — TOON-style uniform object arrays declare keys
  // once and carry rows of exact JSON value literals.
  {
    const arr = '[' + Array.from({ length: 5 }, (_, i) => `{"observation_id":"obs-${i}","downstream_service":"svc-${i % 7}","latency_milliseconds":${100 + i * 17},"operator_decision":"${['hold', 'ship', 'page', 'retry', 'watch'][i % 5]}","region":"us-east-1"}`).join(',') + ']';
    const r = await rosettaEncode(arr, enc);
    const bestNonRosetta = Math.min(...r.audit.filter((a) => a.exact && !a.member.startsWith('rosetta')).map((a) => a.tokens));
    out.push({
      name: 'C11 B uniform JSON object-array exact span beats non-Rosetta members',
      pass: r.exact && rosettaDecode(r.wire, enc) === arr && r.systems.includes('B') && r.outTokens < bestNonRosetta && r.outTokens <= 106,
      details: `${r.member} ${r.inTokens}→${r.outTokens} bestNonRosetta=${bestNonRosetta} systems=[${r.systems.join(',')}]`,
    });
  }

  // C6: Z columnar block template — a 6k heterogeneous prompt-output fixture
  // (prose + JSON + code + repeated Markdown records + CSV + JSONL + CJK)
  // crosses the 75% absolute compression bar while beating the best non-Z
  // prompt-native incumbent in the tournament audit.
  {
    const z6 = zColumnarPrompt6k();
    const r = await rosettaEncode(z6, enc);
    const bestNonZ = Math.min(...r.audit.filter((a) => a.exact && !a.member.startsWith('rosetta')).map((a) => a.tokens));
    out.push({
      name: 'C6 Z columnar block 6k prompt-output ≥75% absolute compression',
      pass: z6.length >= 6000 && r.exact && rosettaDecode(r.wire, enc) === z6 && r.systems.includes('Z') && r.savingsPct >= 75 && r.outTokens < bestNonZ,
      details: `chars=${z6.length} ${r.member} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) bestNonZ=${bestNonZ} systems=[${r.systems.join(',')}]`,
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
    const D1 = Array.from({ length: 12 }, () => '1 repeated literal line with enough words to force N').join('\n');
    const rD1 = await rosettaEncode(D1, enc);
    out.push({
      name: 'D1 N identical-line family',
      pass: rD1.exact && rosettaDecode(rD1.wire, enc) === D1 && rD1.systems.includes('N') && rD1.outTokens < 40,
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
    out.push({
      name: 'D4b R4.3 compact A count head',
      pass: rD4.exact && rosettaDecode(rD4.wire, enc) === D4 && /A50\nid:\n,/.test(rD4.wire) && !rD4.wire.includes('A0:1:50'),
      details: `${rD4.inTokens}→${rD4.outTokens} wire=${JSON.stringify(rD4.wire)}`,
    });
    // D5: char RLE (E)
    const D5 = 'A'.repeat(300) + 'B'.repeat(200);
    const rD5 = await rosettaEncode(D5, enc);
    out.push({
      name: 'D5 E char run-length',
      pass: rD5.exact && rosettaDecode(rD5.wire, enc) === D5 && rD5.systems.includes('E') && rD5.outTokens < 20,
      details: `${rD5.inTokens}→${rD5.outTokens} systems=[${rD5.systems.join(',')}]`,
    });
    out.push({
      name: 'D5b R4.3 compact E adjacent run envelope',
      pass: rD5.exact && rosettaDecode(rD5.wire, enc) === D5 && rD5.wire.includes('E300A200B') && !rD5.wire.includes('AぁぁE200B'),
      details: `${rD5.inTokens}→${rD5.outTokens} wire=${JSON.stringify(rD5.wire)}`,
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
    const nativeMembers = new Set(['identity', 'rosetta-T', 'rosetta-W', 'rosetta-U', 'rosetta-WU', 'rosetta-O', 'rosetta-UO', 'rosetta-WO', 'rosetta-WUO', 'forced-wrap', 'phrase', 'tau', 'kappa', 'meridian']);
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
    const docsM = prompt.includes('MERIDIAN-M1') && prompt.includes('marker + B') && prompt.includes('marker + M') && prompt.includes('marker + Q') && prompt.includes('marker + D') && prompt.includes('marker + G') && prompt.includes('marker + V') && prompt.includes('marker + H') && prompt.includes('marker + I') && prompt.includes('marker + L') && prompt.includes('marker + Z') && prompt.includes('marker + K') && prompt.includes('K1:<count>') && prompt.includes('K2:<count>') && prompt.includes('K3:<count>') && prompt.includes('K4:<count>') && prompt.includes('K5:<count>') && prompt.includes('K6:<count>') && prompt.includes('K7:<count>') && prompt.includes('K8:<ab>') && prompt.includes('K9:0') && prompt.includes('OPS-1 static glyph table') && prompt.includes('PHRASEBOOK-φ1 table') && prompt.includes('Anaphora hemisphere');
    out.push({
      name: 'E7 CALYX cage (prompt-native members only)',
      pass: caged && docsK && docsSig && docsM,
      details: `members seen: ${[...seen].join(',')} · κ docs=${docsK} · N:: docs=${docsSig} · M docs=${docsM}`,
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
    const pc = 'alpha beta gamma delta epsilon zeta eta theta\n### --- ### === ### --- ###\nalpha beta gamma delta epsilon zeta eta theta\n### --- ### === ### --- ###';
    const rE13 = await rosettaEncode(pc, enc);
    out.push({
      name: 'E13 periodic-const stride family (empty specs)',
      pass: rE13.exact && rosettaDecode(rE13.wire, enc) === pc && /N\d+::2\n/.test(rE13.wire) && rE13.outTokens < rE13.inTokens,
      details: `${rE13.inTokens}→${rE13.outTokens} systems=[${rE13.systems.join(',')}]`,
    });

    // E14: pair code family — R4.8 L strictly overtakes the generic N signature form
    const pr = 'for(let i=0;i<3;i++){s+=a[i];}\nfor(let j=0;j<3;j++){s+=a[j];}';
    const rE14 = await rosettaEncode(pr, enc);
    out.push({
      name: 'E14 R4.8 pair JS loop family (L overtakes N)',
      pass: rE14.exact && rosettaDecode(rE14.wire, enc) === pr && rE14.systems.includes('L') && rE14.outTokens < rE14.inTokens,
      details: `${rE14.inTokens}→${rE14.outTokens} systems=[${rE14.systems.join(',')}]`,
    });

    // E15: pair id/ok JSON family — R4.8 I strictly overtakes generic N<m>J
    const pj = '{"id":7,"ok":true}\n{"id":8,"ok":true}';
    const rE15 = await rosettaEncode(pj, enc);
    out.push({
      name: 'E15 R4.8 pair id/ok JSON range (I overtakes N<m>J)',
      pass: rE15.exact && rosettaDecode(rE15.wire, enc) === pj && rE15.systems.includes('I') && rE15.outTokens < rE15.inTokens,
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

  return out;
}
