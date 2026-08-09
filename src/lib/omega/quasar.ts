/**
 * ✦ QUASAR — Quantized Unification via Aligned Symbol Re-pairing
 * Multi-width token n-gram mining + re-tokenization cascade + CJK 1-tok aliases.
 */
import { countTokens, tokenStrings, encodeIds, type EncodingName } from './bpe';

export interface QuasarEntry {
  alias: string;
  phrase: string;
  hits: number;
  spanTokens: number;
}

export interface QuasarResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: QuasarEntry[];
  rounds: number;
  mode: 'dict' | 'identity' | 'forced-wrap';
  notes: string;
}

const CJK_START = 0x4e00;
const CJK_END = 0x9fff;
const SENTINEL = '\u27E8QSR\u27E9\n';
const TERMINATOR = '\u27E8/QSR\u27E9';
const MAX_ROUNDS = 48;
const MAX_POOL = 60;
const MAX_MINE_TOKENS = 200_000;
const MAX_NGRAM_WIDTH = 5;
const TOP_CANDS = 50;

function escPhrase(s: string): string {
  let o = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') o += '\\\\';
    else if (c === '\n') o += '\\n';
    else if (c === '\r') o += '\\r';
    else o += c;
  }
  return o;
}

function unescPhrase(s: string): string {
  let o = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '\\' && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === '\\') { o += '\\'; i++; }
      else if (n === 'n') { o += '\n'; i++; }
      else if (n === 'r') { o += '\r'; i++; }
      else o += s[i];
    } else o += s[i];
  }
  return o;
}

const _poolCache = new Map<EncodingName, string[]>();

function buildPool(enc: EncodingName, exclude: Set<string>): string[] {
  let base = _poolCache.get(enc);
  if (!base) {
    base = [];
    for (let cp = CJK_START; cp <= CJK_END && base.length < 300; cp++) {
      const ch = String.fromCodePoint(cp);
      if (encodeIds(ch, enc).length === 1) base.push(ch);
    }
    _poolCache.set(enc, base);
  }
  return base.filter((ch) => !exclude.has(ch)).slice(0, MAX_POOL);
}

export function quasarDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const termPos = wire.indexOf('\n' + TERMINATOR + '\n');
  if (termPos === -1) return wire;
  const headerBlock = wire.slice(SENTINEL.length, termPos);
  const body = wire.slice(termPos + 1 + TERMINATOR.length + 1);
  const entries: { alias: string; phrase: string }[] = [];
  for (const line of headerBlock.split('\n')) {
    if (!line) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx < 1) return wire;
    entries.push({ alias: line.slice(0, eqIdx), phrase: unescPhrase(line.slice(eqIdx + 1)) });
  }
  let text = body;
  for (let i = entries.length - 1; i >= 0; i--) {
    text = text.split(entries[i].alias).join(entries[i].phrase);
  }
  return text;
}

function countOcc(text: string, sub: string): number {
  let n = 0;
  let idx = 0;
  while ((idx = text.indexOf(sub, idx)) !== -1) {
    n++;
    idx += sub.length;
  }
  return n;
}

function assembleWire(entries: QuasarEntry[], body: string): string {
  return (
    SENTINEL +
    entries.map((e) => e.alias + '=' + escPhrase(e.phrase)).join('\n') +
    '\n' +
    TERMINATOR +
    '\n' +
    body
  );
}

export function quasarEncode(text: string, enc: EncodingName = 'o200k_base'): QuasarResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): QuasarResult => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    rounds: 0,
    mode: 'identity',
    notes,
  });

  if (!text || inTokens < 6) return identity('input too short');
  if (text.startsWith(SENTINEL)) {
    // Identity is unsafe: raw text re-parses as a wire. Empty-dict wrap keeps body literal.
    const w3 = SENTINEL + '\n' + TERMINATOR + '\n' + text;
    const d3 = quasarDecode(w3);
    const ot = countTokens(w3, enc);
    if (d3 === text) {
      return {
        wire: w3,
        decoded: d3,
        exact: true,
        inTokens,
        outTokens: ot,
        savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
        entries: [],
        rounds: 0,
        mode: 'forced-wrap',
        notes: 'forced empty-dict wrap (input began with QSR sentinel)',
      };
    }
    return identity('sentinel adversary: could not wrap safely');
  }

  const inputChars = new Set<string>();
  for (const ch of text) inputChars.add(ch);
  const pool = buildPool(enc, inputChars);
  if (pool.length === 0) return identity('no CJK aliases available');

  let body = text;
  const entries: QuasarEntry[] = [];
  let poolIdx = 0;

  for (let round = 0; round < MAX_ROUNDS && poolIdx < pool.length; round++) {
    const toks = tokenStrings(body, enc);
    const T = Math.min(toks.length, MAX_MINE_TOKENS);
    if (T < 2) break;

    interface Cand {
      span: string;
      width: number;
      freq: number;
    }
    const seen = new Set<string>();
    const cands: Cand[] = [];

    for (let n = 2; n <= Math.min(MAX_NGRAM_WIDTH, T); n++) {
      const counts = new Map<string, { count: number; firstIdx: number }>();
      for (let i = 0; i + n <= T; i++) {
        let key = '';
        for (let j = 0; j < n; j++) key += toks[i + j].id + ':';
        const e = counts.get(key);
        if (e) e.count++;
        else counts.set(key, { count: 1, firstIdx: i });
      }
      for (const [, info] of counts) {
        if (info.count < 2) continue;
        let span = '';
        for (let j = 0; j < n; j++) span += toks[info.firstIdx + j].s;
        if (span.length < 2 || seen.has(span)) continue;
        seen.add(span);
        cands.push({ span, width: n, freq: info.count });
      }
    }

    if (cands.length === 0) break;
    cands.sort((a, b) => b.freq * (b.width - 1) - a.freq * (a.width - 1));

    let accepted = false;
    const curWireTokens =
      entries.length > 0 ? countTokens(assembleWire(entries, body), enc) : inTokens;

    for (const cand of cands.slice(0, TOP_CANDS)) {
      const realHits = countOcc(body, cand.span);
      if (realHits < 2) continue;
      const alias = pool[poolIdx];
      const newBody = body.split(cand.span).join(alias);
      const provisional: QuasarEntry = {
        alias,
        phrase: cand.span,
        hits: realHits,
        spanTokens: cand.width,
      };
      const newWire = assembleWire([...entries, provisional], newBody);
      const newTokens = countTokens(newWire, enc);
      if (newTokens < curWireTokens) {
        body = newBody;
        entries.push(provisional);
        poolIdx++;
        accepted = true;
        break;
      }
    }
    if (!accepted) break;
  }

  if (entries.length === 0) return identity('no positive-gain contractions (below redundancy floor)');

  const wire = assembleWire(entries, body);
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens) return identity('dictionary wire not smaller than input');
  const decoded = quasarDecode(wire);
  if (decoded !== text) return identity('round-trip verification failed; identity emitted');

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    entries,
    rounds: entries.length,
    mode: 'dict',
    notes: `${entries.length} token-stream contractions via re-pair cascade · verified byte-exact`,
  };
}

export const QUASAR_SYSTEM_PROMPT = [
  '# ✦ QUASAR (QSR) — byte-exact in-context dictionary via token-stream re-pairing',
  'The message may begin with a header block:',
  '  ⟨QSR⟩',
  '  alias=phrase',
  '  ⟨/QSR⟩',
  'Decode rules (apply mentally; do not emit expansions unless asked):',
  '1. Each header line maps a CJK character (alias) to its original phrase.',
  '   Escapes in phrases: \\\\=\\, \\n=newline, \\r=CR.',
  '2. In the body after the header, each alias character stands for its phrase.',
  '3. Decode in reverse order (last entry first) to handle nested aliases.',
  '4. Everything else is literal. Reconstruction is byte-exact.',
  '5. If there is no ⟨QSR⟩ header, the text is literal.',
  'OUTPUT CONTRACT: answer densely; code fences and identifiers verbatim.',
].join('\n');

export interface QuasarSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export const QUASAR_HANDTRACE =
  '{"id":7,"ok":true},{"id":8,"ok":true}\n' +
  'a,b,c\n1,2,3\n1,2,3\n' +
  '##..##\n##..##\n' +
  'for(let i=0;i<3;i++){s+=a[i];}\n' +
  'for(let j=0;j<3;j++){s+=a[j];}\n' +
  'note: s≈6 ~ fine';

export function quasarSelfTest(enc: EncodingName = 'o200k_base'): QuasarSelfTest[] {
  const cases: { name: string; text: string }[] = [
    { name: 'Q0 empty', text: '' },
    { name: 'Q1 short', text: 'hello world' },
    { name: 'Q2 chaotic 200-char handtrace', text: QUASAR_HANDTRACE },
    { name: 'Q3 CJK in input', text: '中文测试 中文测试 日本語' },
    { name: 'Q4 sentinel adversary', text: '⟨QSR⟩\nfake=trap\n⟨/QSR⟩\nnot real' },
    { name: 'Q5 CRLF + unicode', text: 'line1\r\nline2\r\n🚀🚀 ≈done\r\n' },
    { name: 'Q6 repeated code', text: 'function add(a, b) { return a + b; }\n'.repeat(20) },
    {
      name: 'Q7 JSON log (compression expected)',
      text: Array.from(
        { length: 40 },
        (_, i) =>
          `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
      ).join('\n'),
    },
  ];
  const out: QuasarSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = quasarEncode(c.text, enc);
      const roundTrip = quasarDecode(r.wire) === c.text;
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
  try {
    const r7 = quasarEncode(cases[7].text, enc);
    out.push({
      name: 'Q8 Q7-savings-witness',
      pass: r7.savingsPct > 5,
      details: `savings=${r7.savingsPct.toFixed(1)}% (require >5%)`,
    });
  } catch (e) {
    out.push({ name: 'Q8 Q7-savings-witness', pass: false, details: (e as Error).message });
  }
  return out;
}
