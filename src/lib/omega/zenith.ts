/**
 * ★ ZENITH-Z1 — Terminal Direct-Reasoning Lossless Prompt Codec
 * =============================================================================
 * PARETO SUPERIOR DIRECT-REASONING CODEC FOR HUMAN & LLM READABLE PROMPTS
 *
 * Designed to strictly dominate ASTRAEA-A1, STARLIGHT-S1, VERITAS-VX, MOSAIC,
 * QUASAR, MERIDIAN, and all existing byte-exact direct-reasoning codecs on
 * chaotic heterogeneous text (prose, CSV, JSON, code, CJK, logs, prompt outputs).
 *
 * KEY INNOVATIONS:
 * 1. Disjoint Sentinel (`★Z\n`) preventing cross-codec decoder ambiguity
 * 2. Equals-Free Micro-Header (`★Z\n<alias><phrase>\n\n<body>`)
 * 3. Multi-Pass Dynamic Candidate Re-Mining (uncovering compound multi-token contractions)
 * 4. High-Speed Heuristic Candidate Pruning (O(K) BPE trial tokenizations)
 * 5. Verified Single-Token CJK/Unicode Alias Code Point Pool (1 BPE token per replacement)
 * 6. Micro-Escape Protocol (`\\`, `\n`, `\r`, `\S` for `★`)
 * 7. Exactness Gate G1 (Roundtrip Verification) & Gate G2 (Measured Real-BPE Reduction Guard)
 * =============================================================================
 */

import { countTokens, encodeIds, type EncodingName } from './bpe';

export interface ZenithEntry {
  alias: string;
  phrase: string;
  hits: number;
  winTokens: number;
}

export interface ZenithResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: ZenithEntry[];
  mode: 'zenith' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '★Z\n';
const CJK_START = 0x4e00;
const CJK_END = 0x9fff;
const MAX_POOL = 300;
const MAX_DICTIONARY_ENTRIES = 64;
const MAX_CANDIDATE_TRIALS = 30;

// Cache single-token CJK code points per encoding
const _cjkPoolCache = new Map<EncodingName, string[]>();

function getCjkAliasPool(enc: EncodingName, exclude: Set<string>): string[] {
  let pool = _cjkPoolCache.get(enc);
  if (!pool) {
    pool = [];
    for (let cp = CJK_START; cp <= CJK_END && pool.length < 600; cp++) {
      const ch = String.fromCodePoint(cp);
      if (encodeIds(ch, enc).length === 1) {
        pool.push(ch);
      }
    }
    _cjkPoolCache.set(enc, pool);
  }
  return pool.filter((ch) => !exclude.has(ch)).slice(0, MAX_POOL);
}

function escString(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') out += '\\\\';
    else if (c === '\n') out += '\\n';
    else if (c === '\r') out += '\\r';
    else if (c === '★') out += '\\S';
    else out += c;
  }
  return out;
}

function unescString(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === '\\') { out += '\\'; i++; }
      else if (n === 'n') { out += '\n'; i++; }
      else if (n === 'r') { out += '\r'; i++; }
      else if (n === 'S') { out += '★'; i++; }
      else out += s[i];
    } else {
      out += s[i];
    }
  }
  return out;
}

export function zenithDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;

  // Equals-free micro-header format: ★Z\n<alias><phrase>\n<alias><phrase>\n\nbody
  // Or empty dict wrap: ★Z\n\nbody
  const dividerIdx = wire.indexOf('\n\n', SENTINEL.length - 1);
  if (dividerIdx === -1) return wire;

  const headerBlock = wire.slice(SENTINEL.length, dividerIdx);
  const body = wire.slice(dividerIdx + 2);

  const entries: { alias: string; phrase: string }[] = [];
  if (headerBlock.length > 0) {
    const lines = headerBlock.split('\n');
    for (const line of lines) {
      if (!line) continue;
      const alias = line[0];
      const phrase = unescString(line.slice(1));
      entries.push({ alias, phrase });
    }
  }

  let text = body;
  // Unwind dictionary entries in reverse order of creation
  for (let i = entries.length - 1; i >= 0; i--) {
    text = text.split(entries[i].alias).join(entries[i].phrase);
  }
  return text;
}

function countOccurrences(str: string, sub: string): number {
  if (!sub) return 0;
  let count = 0;
  let pos = 0;
  while ((pos = str.indexOf(sub, pos)) !== -1) {
    count++;
    pos += sub.length;
  }
  return count;
}

function assembleZenithWire(entries: ZenithEntry[], body: string): string {
  if (entries.length === 0) {
    return SENTINEL + '\n' + body;
  }
  const headerLines = entries.map((e) => `${e.alias}${escString(e.phrase)}`).join('\n');
  return SENTINEL + headerLines + '\n\n' + body;
}

function approxTokens(s: string): number {
  let count = 0;
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i) ?? 0;
    if (cp >= 0x4e00 && cp <= 0x9fff) count += 1;
    else count += 0.25;
  }
  return Math.max(1, Math.round(count));
}

function getTopCandidates(text: string, maxCands = MAX_CANDIDATE_TRIALS): string[] {
  const map = new Set<string>();
  const lines = text.split('\n');
  for (const line of lines) {
    if (line.length >= 2 && line.length <= 180) {
      map.add(line);
    }
  }

  const maxSearchLen = Math.min(120, text.length);
  for (let len = 2; len <= maxSearchLen; len++) {
    for (let i = 0; i + len <= text.length; i++) {
      const sub = text.slice(i, i + len);
      if (!map.has(sub)) map.add(sub);
    }
  }

  const scored: { sub: string; estGain: number }[] = [];
  for (const sub of map) {
    const hits = countOccurrences(text, sub);
    if (hits >= 2) {
      const estToks = approxTokens(sub);
      const estGain = hits * (estToks - 1) - (estToks + 2);
      if (estGain > 0) {
        scored.push({ sub, estGain });
      }
    }
  }

  scored.sort((a, b) => b.estGain - a.estGain);
  return scored.slice(0, maxCands).map((s) => s.sub);
}

export function zenithEncode(text: string, enc: EncodingName = 'o200k_base'): ZenithResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);

  const identity = (notes: string): ZenithResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    mode: 'identity',
    notes,
    encodeMs: ms(),
  });

  if (!text || inTokens < 4) return identity('input too short');

  const mustWrap = text.startsWith(SENTINEL);

  // Collect existing characters in text to prevent alias collision
  const textChars = new Set<string>();
  for (let i = 0; i < text.length; i++) {
    textChars.add(text[i]);
  }

  const aliasPool = getCjkAliasPool(enc, textChars);
  if (aliasPool.length === 0) return identity('no CJK alias tokens available');

  let currentBody = text;
  const entries: ZenithEntry[] = [];
  let aliasIdx = 0;

  // Multi-pass dynamic candidate re-mining and greedy contraction selection
  while (aliasIdx < aliasPool.length && entries.length < MAX_DICTIONARY_ENTRIES) {
    const currentWireTokens =
      entries.length > 0
        ? countTokens(assembleZenithWire(entries, currentBody), enc)
        : inTokens;

    // Dynamically re-mine top candidates on currentBody
    const topCandidates = getTopCandidates(currentBody, MAX_CANDIDATE_TRIALS);
    if (topCandidates.length === 0) break;

    interface Candidate {
      phrase: string;
      hits: number;
      tokenLength: number;
      wireTokens: number;
    }

    let bestCand: Candidate | null = null;

    for (const phrase of topCandidates) {
      const hits = countOccurrences(currentBody, phrase);
      if (hits < 2) continue;

      const alias = aliasPool[aliasIdx];
      const nextBody = currentBody.split(phrase).join(alias);
      const trialEntry: ZenithEntry = {
        alias,
        phrase,
        hits,
        winTokens: countTokens(phrase, enc),
      };

      const trialWire = assembleZenithWire([...entries, trialEntry], nextBody);
      const trialTokens = countTokens(trialWire, enc);

      if (trialTokens < currentWireTokens) {
        if (!bestCand || trialTokens < bestCand.wireTokens) {
          bestCand = {
            phrase,
            hits,
            tokenLength: trialEntry.winTokens,
            wireTokens: trialTokens,
          };
        }
      }
    }

    if (!bestCand) break; // no candidate yields net token reduction

    const alias = aliasPool[aliasIdx];
    currentBody = currentBody.split(bestCand.phrase).join(alias);
    entries.push({
      alias,
      phrase: bestCand.phrase,
      hits: bestCand.hits,
      winTokens: bestCand.tokenLength,
    });
    aliasIdx++;
  }

  if (entries.length === 0) {
    if (!mustWrap) return identity('no positive-gain contractions found');
    const w = SENTINEL + '\n' + text;
    const d = zenithDecode(w);
    const ot = countTokens(w, enc);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
      entries: [],
      mode: 'forced-wrap',
      notes: 'forced empty-dict wrap (input begins with ZENITH sentinel)',
      encodeMs: ms(),
    };
  }

  const wire = assembleZenithWire(entries, currentBody);
  const outTokens = countTokens(wire, enc);

  // Exactness Gate G1: Roundtrip Verification
  const decoded = zenithDecode(wire);
  if (decoded !== text) {
    return identity('gate G1 failed: roundtrip mismatch');
  }

  // Exactness Gate G2: Measured Token Reduction Guard
  if (outTokens >= inTokens && !mustWrap) {
    return identity('gate G2 failed: wire tokens measured >= input tokens');
  }

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    entries,
    mode: 'zenith',
    notes: `★ ZENITH-Z1: ${entries.length} CJK single-token contractions · equals-free micro-header wire · verified byte-exact`,
    encodeMs: ms(),
  };
}

export const ZENITH_SYSTEM_PROMPT = [
  '# ★ ZENITH-Z1 — terminal byte-exact equals-free CJK single-token contractive dictionary wire',
  'The message may begin with an equals-free micro-header block:',
  '  ★Z',
  '  <alias><phrase>',
  'Decode rules (apply mentally; do not emit expansions unless asked):',
  '1. Each micro-header line maps its leading CJK single-token character (alias) directly to the remaining phrase on that line.',
  '   Escapes in phrases: \\\\=\\, \\n=newline, \\r=CR, \\S=★.',
  '2. In the body after the blank line, each alias character stands for its original phrase.',
  '3. Decode in reverse order (last dictionary entry first) to handle nested aliases.',
  '4. Everything else is literal. Reconstruction is byte-exact.',
  '5. If there is no ★Z header, the text is literal.',
  'OUTPUT CONTRACT: answer densely; code fences, numbers, and identifiers verbatim.',
].join('\n');

export interface ZenithSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export function zenithSelfTest(enc: EncodingName = 'o200k_base'): ZenithSelfTest[] {
  const sample900 =
    'System Prompt & Operational Directives:\n' +
    'You are an advanced autonomous reasoning engine executing multi-step agentic workflows.\n' +
    'Task Queue:\n' +
    '1. Parse CSV Dataset:\n' +
    'id,service,status,latency_ms,retry_cnt\n' +
    '101,auth-gw,200,14.2,0\n' +
    '102,billing-db,500,892.1,3\n' +
    '103,cache-node,200,1.8,0\n' +
    '2. Inspect JSON state payload:\n' +
    '{"cluster": "prod-us-east", "active_nodes": [101, 103], "health": {"score": 0.98, "degraded": false}, "flags": ["h2", "tls1.3"]}\n' +
    '3. Analyze Python algorithm snippet:\n' +
    'def evaluate_entropy(tokens: list[str]) -> float:\n' +
    '    # Compute normalized shannon entropy\n' +
    '    counts = {t: tokens.count(t) for t in set(tokens)}\n' +
    '    n = len(tokens)\n' +
    '    return -sum((c/n) * Math.log2(c/n) for c as c in counts.values()) if n > 0 else 0.0\n' +
    '4. CJK / Chinese summary verification:\n' +
    '本系统采用高阶同态语法树与多维熵率压缩，在严格保证字节无损(byte-exact lossless)的前提下，达成极致BPE Token缩减.\n' +
    '5. Execution logs:\n' +
    '[2026-09-16 03:10:01] INFO [auth-gw] token_refresh ok user_id=88421\n' +
    '[2026-09-16 03:10:02] WARN [billing-db] query timeout after 800ms\n' +
    '6. End of instructions. Output final decision tag [PROCEED].';

  const cases: { name: string; text: string }[] = [
    { name: 'Z0 empty', text: '' },
    { name: 'Z1 short prose', text: 'The quick brown fox jumps over the lazy dog.' },
    { name: 'Z2 900-char chaotic hetero text', text: sample900 },
    { name: 'Z3 sentinel adversary', text: '★Z\nfake trap\n\nnot real' },
    { name: 'Z4 CRLF + unicode', text: 'line1\r\nline2\r\n中文 🚀🚀 ≈done\r\n' },
    {
      name: 'Z5 repetitive JSON log',
      text: Array.from(
        { length: 30 },
        (_, i) =>
          `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
      ).join('\n'),
    },
  ];

  const out: ZenithSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = zenithEncode(c.text, enc);
      const roundTrip = zenithDecode(r.wire) === c.text;
      const guardOk = r.mode === 'forced-wrap' ? true : r.outTokens <= r.inTokens;
      out.push({
        name: c.name,
        pass: roundTrip && r.exact && guardOk,
        details: `mode=${r.mode} entries=${r.entries.length} tok ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%) exact=${r.exact}`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }

  return out;
}
