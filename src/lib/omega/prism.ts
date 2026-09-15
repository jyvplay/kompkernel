/**
 * ◈ PRISM-P1 — exact cross-regime phrase dictionary with a measured fallback.
 *
 * PRISM targets a gap left by line/column codecs: a heterogeneous document can
 * contain the same literal phrase in JSON, prose, code and chat lines without
 * sharing one record signature.  It mines repeated *within-line* substrings,
 * writes each selected substring once in a visible legend, and replaces later
 * occurrences with an absent single-token sigil plus a base-36 ordinal.
 *
 * This is deliberately a small, independently decodable mechanism rather than
 * a claim that phrase dictionaries are new in the abstract.  The selection
 * objective is the live tokenizer count, not character length.  Every candidate
 * is rendered, decoded, and byte-compared before it can be selected.  PRISM
 * also evaluates MOSAIC and returns whichever exact wire is shorter, so the
 * advertised relation is a real weak dominance over MOSAIC's wire objective:
 * PRISM <= MOSAIC for every input accepted by this function.  Strict wins are
 * an empirical property of a fixture, not a theorem for every string.
 *
 * Wire (all separators are selected absent single-token CJK characters):
 *
 *   [PR1]\n S phrase0 S phrase1 ...\n body-with-SIGIL+ordinal-aliases
 *
 * The first line is the sentinel.  The first character on line two is S and
 * separates the legend entries.  SIGIL is a second absent character; aliases
 * are SIGIL followed by base-36 digits.  Neither framing character can occur in
 * an original phrase or body, so no escaping or heuristic parsing is needed.
 */
import { countTokens, type EncodingName } from './bpe';
import { ideographPool } from './strata';
import { mosaicDecode, mosaicEncode, type MosaicResult } from './mosaic';

const SENTINEL = '[PR1]\n';
const MAX_ENTRIES = 12;
const MAX_PHRASE = 72;
const MIN_PHRASE = 8;
const MAX_CANDIDATES = 720;
const MAX_INPUT = 300_000;

export interface PrismResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: string[];
  aliases: number;
  mode: 'prism' | 'mosaic' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

function identity(text: string, enc: EncodingName, notes: string): PrismResult {
  const inTokens = countTokens(text, enc);
  return {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    aliases: 0,
    mode: 'identity',
    notes,
    encodeMs: 0,
  };
}

function absentSigils(text: string, enc: EncodingName): [string, string] | null {
  const free = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  return free.length >= 2 ? [free[0], free[1]] : null;
}

function alias(sig: string, index: number): string {
  return sig + index.toString(36);
}

/** Replace selected phrases left-to-right, longest first. */
function replacePhrases(text: string, entries: string[], sig: string): { body: string; aliases: number } {
  const order = entries
    .map((phrase, index) => ({ phrase, index }))
    .sort((a, b) => b.phrase.length - a.phrase.length || a.index - b.index);
  let body = '';
  let i = 0;
  let aliases = 0;
  while (i < text.length) {
    let hit: { phrase: string; index: number } | null = null;
    for (const candidate of order) {
      if (text.startsWith(candidate.phrase, i)) {
        hit = candidate;
        break;
      }
    }
    if (hit) {
      body += alias(sig, hit.index);
      aliases++;
      i += hit.phrase.length;
    } else {
      body += text[i];
      i++;
    }
  }
  return { body, aliases };
}

function render(text: string, entries: string[], enc: EncodingName): { wire: string; aliases: number } | null {
  if (entries.length === 0) return null;
  const sigils = absentSigils(text, enc);
  if (!sigils) return null;
  const [sig, sep] = sigils;
  const { body, aliases } = replacePhrases(text, entries, sig);
  const wire = SENTINEL + sep + entries.join(sep) + '\n' + body;
  return { wire, aliases };
}

function fromBase36(s: string): number {
  if (!/^[0-9a-z]+$/.test(s)) return -1;
  const n = parseInt(s, 36);
  return Number.isSafeInteger(n) ? n : -1;
}

export function prismDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const rest = wire.slice(SENTINEL.length);
  const sep = rest[0];
  const nl = rest.indexOf('\n', 1);
  if (!sep || nl < 2) return wire;
  const entries = rest.slice(1, nl).split(sep);
  if (entries.length === 0 || entries.some((entry) => entry.length === 0 || entry.includes(sep))) return wire;
  const sig = (() => {
    // The encoder chooses the first free ideograph for the sigil and the second
    // for the separator.  The separator is absent from every entry, so the
    // sentinel's fixed grammar lets decoding recover the sigil from aliases.
    // It is the first CJK character in the body that is not the separator.
    const body = rest.slice(nl + 1);
    for (const ch of body) if (ch !== sep && /[\u4e00-\u9fff]/u.test(ch)) return ch;
    return '';
  })();
  if (!sig) return wire;
  const body = rest.slice(nl + 1);
  let out = '';
  let i = 0;
  while (i < body.length) {
    if (body[i] !== sig) {
      out += body[i++];
      continue;
    }
    let j = i + 1;
    while (j < body.length && /[0-9a-z]/.test(body[j])) j++;
    const index = fromBase36(body.slice(i + 1, j));
    if (index < 0 || index >= entries.length) return wire;
    out += entries[index];
    i = j;
  }
  return out;
}

interface Candidate { phrase: string; score: number }

/**
 * Repeated phrases are mined within lines only.  This keeps the legend grammar
 * one-line and prevents a newline from becoming ambiguous with the header
 * terminator.  Seven lengths cover short field labels through repeated code or
 * prose clauses; the final live-BPE score decides what survives.
 */
function mineCandidates(text: string, enc: EncodingName): Candidate[] {
  const counts = new Map<string, number>();
  const lengths = [8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72];
  for (const line of text.split('\n')) {
    if (line.length < MIN_PHRASE) continue;
    for (const length of lengths) {
      if (length > Math.min(MAX_PHRASE, line.length)) continue;
      for (let i = 0; i + length <= line.length; i += 1) {
        const phrase = line.slice(i, i + length);
        counts.set(phrase, (counts.get(phrase) ?? 0) + 1);
      }
    }
  }
  const candidates: Candidate[] = [];
  for (const [phrase, occurrences] of counts) {
    if (occurrences < 2) continue;
    const score = occurrences * countTokens(phrase, enc) - countTokens(phrase, enc);
    candidates.push({ phrase, score });
  }
  candidates.sort((a, b) => b.score - a.score || b.phrase.length - a.phrase.length);
  return candidates.slice(0, MAX_CANDIDATES);
}

function betterResult(a: PrismResult, b: PrismResult): PrismResult {
  if (a.exact && a.outTokens < b.outTokens) return a;
  return b;
}

const cache = new Map<string, PrismResult>();
const CACHE_MAX = 8;

export function prismEncode(text: string, enc: EncodingName = 'o200k_base'): PrismResult {
  const key = text.length <= MAX_INPUT ? enc + '\u0000' + text : null;
  if (key) {
    const hit = cache.get(key);
    if (hit) return hit;
  }
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const inTokens = countTokens(text, enc);
  if (!text) {
    const r = identity(text, enc, 'empty input');
    r.encodeMs = performance.now() - t0;
    return r;
  }

  const mustWrap = text.startsWith(SENTINEL);
  let best = identity(text, enc, 'identity baseline');
  const m: MosaicResult = mosaicEncode(text, enc);
  // A literal [PR1] prefix is not a safe identity wire: a receiver would
  // interpret it as PRISM framing. MOSAIC's forced-wrap path is the exact
  // boundary repair, even when the safe wrapper costs one or two tokens.
  if (m.exact && (m.outTokens < best.outTokens || mustWrap)) {
    best = {
      wire: m.wire,
      decoded: m.decoded,
      exact: true,
      inTokens,
      outTokens: m.outTokens,
      savingsPct: inTokens ? ((inTokens - m.outTokens) / inTokens) * 100 : 0,
      entries: [],
      aliases: 0,
      mode: 'mosaic',
      notes: `PRISM fallback portfolio: MOSAIC ${m.outTokens} tokens`,
      encodeMs: 0,
    };
  }

  const candidates = mineCandidates(text, enc);
  const selected: string[] = [];
  let current = best;
  for (let round = 0; round < MAX_ENTRIES && candidates.length > 0; round++) {
    let roundBest: PrismResult | null = null;
    let roundIndex = -1;
    for (let i = 0; i < candidates.length; i++) {
      if (selected.includes(candidates[i].phrase)) continue;
      const entries = [...selected, candidates[i].phrase];
      const rendered = render(text, entries, enc);
      if (!rendered) continue;
      const decoded = prismDecode(rendered.wire);
      if (decoded !== text) continue;
      const outTokens = countTokens(rendered.wire, enc);
      const candidate: PrismResult = {
        wire: rendered.wire,
        decoded,
        exact: true,
        inTokens,
        outTokens,
        savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
        entries,
        aliases: rendered.aliases,
        mode: 'prism',
        notes: `PRISM selected ${entries.length} cross-line phrase entr${entries.length === 1 ? 'y' : 'ies'} with ${rendered.aliases} verified aliases`,
        encodeMs: 0,
      };
      if (!roundBest || outTokens < roundBest.outTokens) {
        roundBest = candidate;
        roundIndex = i;
      }
    }
    if (!roundBest || roundBest.outTokens >= current.outTokens) break;
    selected.push(candidates[roundIndex].phrase);
    current = roundBest;
  }

  const chosen = betterResult(current, best);
  // The final comparison is against MOSAIC as well as identity, not an
  // assumed character heuristic. Equal costs retain MOSAIC's tested decoder.
  const outTokens = countTokens(chosen.wire, enc);
  if (chosen.exact && outTokens <= m.outTokens && (outTokens < inTokens || mustWrap)) {
    chosen.encodeMs = performance.now() - t0;
    if (key) {
      if (cache.size >= CACHE_MAX) cache.clear();
      cache.set(key, chosen);
    }
    return chosen;
  }
  if (m.exact && (m.outTokens < inTokens || mustWrap)) {
    best.encodeMs = performance.now() - t0;
    if (key) {
      if (cache.size >= CACHE_MAX) cache.clear();
      cache.set(key, best);
    }
    return best;
  }
  const out = identity(text, enc, 'no exact PRISM or MOSAIC wire beat identity');
  out.encodeMs = performance.now() - t0;
  if (key) {
    if (cache.size >= CACHE_MAX) cache.clear();
    cache.set(key, out);
  }
  return out;
}

export const PRISM_SYSTEM_PROMPT = [
  '# ◈ PRISM-P1 — exact cross-regime phrase legend',
  'If the wire begins [PR1], line 2 begins with separator S. The rest of that',
  'line lists phrases separated by S. The following body is original text with',
  'each selected phrase replaced by an absent CJK sigil followed by a base-36',
  'entry number, such as sigil0 or sigil1. Expand aliases from the legend, then',
  'return the body exactly. Every other character is literal.',
  'If the wire begins [MZ1], use the MOSAIC decoder contract instead; otherwise',
  'the wire is literal. Never normalize whitespace, Unicode, numbers, or code.',
].join('\n');

const PRISM_HANDTRACE_BASE = [
  'Release note: retry policy changed; preserve every byte, including trailing spaces.\n',
  'items = ["alpha", "βeta", "中文字段", 42, null, true]; // do not normalize\n',
  '{"id":17,"ok":true,"message":"中文响应","meta":{"p":0.875,"x":null}}\n',
  'name,qty,price,region\nwidget-a,12,43.75,us-east\nwidget-b,1200,8.50,eu-west\n',
  'for (let i=0; i<4; i++) { out.push(map.get(i) ?? "missing"); }\n',
  'const hash = /[A-F0-9]{8}/g; throw new Error("E_CONN_RESET");\n',
  '用户: 请保留 JSON、CSV、代码和标点，不要总结。\n助手: 已保留；阈值 0.95，时间 2026-09-15T12:34:56Z。\n',
  '- [ ] audit tokens\n- [x] verify round-trip\n- note: Ω-Ξ / MOSAIC / CROWN\n',
  'random bytes: q7Z!@#%^&*()_+=-[]{}|;:,.<>?/~`\\\n',
  'The pipeline joins heterogeneous regions without semantic loss; identical input must decode exactly.\n',
  'CSV,JSON,code,prose,中文,emoji 🚀🧊 and repeated phrase: byte-exact reconstruction.\n',
].join('');
// Fixed-size acceptance fixture: exactly 900 UTF-16 code units, retaining every
// requested regime rather than padding with a misleading token-neutral blank.
export const PRISM_HANDTRACE_900 = (PRISM_HANDTRACE_BASE +
  'tail: 7fA9! unique=Δ; list=[x,y,z]; 中文尾部; code=>{ok:false};')
  .slice(0, 900)
  .padEnd(900, 'x');

export interface PrismSelfTest { name: string; pass: boolean; details: string }

export function prismSelfTest(enc: EncodingName = 'o200k_base'): PrismSelfTest[] {
  const cases = [
    { name: 'empty', text: '' },
    { name: 'literal adversary', text: 'unique Ω text 中文 🚀 !@#$%^&*()' },
    { name: 'heterogeneous 900-char fixture', text: PRISM_HANDTRACE_900 },
    { name: 'repeated JSON and prose', text: Array.from({ length: 16 }, (_, i) => `{"id":${i},"ok":true,"svc":"gateway","msg":"request completed"}`).join('\n') },
    { name: 'sentinel adversary', text: '[PR1]\n一\nnot a wire' },
    { name: 'CJK and emoji', text: '中文🚀\n'.repeat(30) },
  ];
  const out: PrismSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = prismEncode(c.text, enc);
      const rt = prismDecode(r.wire) === c.text || (r.mode === 'mosaic' && mosaicDecode(r.wire) === c.text);
      out.push({ name: c.name, pass: rt && r.exact && r.outTokens <= r.inTokens, details: `${r.mode} ${r.inTokens}→${r.outTokens} ${r.notes}` });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }
  try {
    const r = prismEncode(PRISM_HANDTRACE_900, enc);
    const m = mosaicEncode(PRISM_HANDTRACE_900, enc);
    out.push({
      name: 'P1 wire ≤ MOSAIC on 900-char hetero fixture',
      pass: r.exact && r.outTokens <= m.outTokens && (r.mode === 'prism' ? prismDecode(r.wire) : mosaicDecode(r.wire)) === PRISM_HANDTRACE_900,
      details: `PRISM ${r.outTokens} vs MOSAIC ${m.outTokens}; mode=${r.mode}; chars=${PRISM_HANDTRACE_900.length}`,
    });
  } catch (e) {
    out.push({ name: 'P1 wire ≤ MOSAIC on 900-char hetero fixture', pass: false, details: (e as Error).message });
  }
  return out;
}
