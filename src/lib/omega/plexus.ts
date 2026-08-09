/**
 * ✺ PLEXUS-PX — Cascade In-Place Binding ⊕ Arithmetic Tournament (original)
 * =============================================================================
 * Joint mechanism ABSENT as a unit from surveyed art and this repo:
 *
 *   Q  QUASAR: multi-width token n-gram mining + re-tokenization CASCADE after
 *      each accept, but pays a HEADER that REPRINTS every phrase (first occ too).
 *   A  MERIDIAN-H1 / ANAPHORA: zero-header IN-PLACE bind (first occ stays),
 *      but single-pass / no cascade re-tokenization after binds.
 *   H  HELIX-AP: arithmetic closed forms; orthogonal entropy source.
 *   M  MERIDIAN: tournament of A and H, still no cascade on the anaphora lane.
 *
 * PLEXUS = cascade mining (Q) + in-place binding (A) + HELIX compose (H),
 * with a real-BPE tournament over {id, A*, H, H∘A*, A*∘H} where A* is the
 * cascaded in-place binder (not MERIDIAN's non-cascade H1).
 *
 * Per-entry dominance vs header cascade (same phrase, n hits, w in-situ toks,
 * A=alias toks, D=binder frame, h=header row):
 *   gain_header  = n·w − (w+h) − n·A
 *   gain_inplace = n·w − (w+D) − (n−1)·A
 *   gain_inplace − gain_header = A + h − D  ≥ +1 tok when A=1,D≤3,h≥3
 * Plus cascade reveals second-order n-grams after each bind (header-only
 * QUASAR has cascade; inplace-only MERIDIAN does not).
 *
 * HAND-TRACE — 300-char hetero (prose+JSON+CSV+grid+code+chat):
 *   PLEXUS_HANDTRACE_300
 *   (1) HELIX: short id runs below MIN_RUN=3 → usually identity on fixture.
 *   (2) Token n-grams fire on `,"ok":true}`, `##..##\n`, chat lines, loop cores.
 *   (3) In-place admit: first left as OPENkP CLOSE; rest → k. Re-tokenize.
 *   (4) Round-2 cascade may bind composites spanning prior aliases.
 *   (5) Tournament keeps min real o200k wire under byte-exact decode gate.
 * =============================================================================
 */
import { countTokens, tokenStrings, encodeIds, type EncodingName } from './bpe';
import { helixEncode, helixDecode, HELIX_SYSTEM_PROMPT } from './helix';

export interface PlexusEntry {
  key: string;
  phrase: string;
  hits: number;
  spanTokens: number;
  round: number;
}

export interface PlexusResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: PlexusEntry[];
  mode: 'plexus' | 'helix' | 'compose-ph' | 'compose-hp' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '[PX]\n';
const MAX_ROUNDS = 24;
const MAX_ENTRIES = 180;
const MAX_MINE_TOKENS = 200_000;
const MAX_NGRAM_WIDTH = 5;
const TOP_CANDS = 40;
const CJK_START = 0x4e00;
const CJK_END = 0x9fff;

const poolCache = new Map<EncodingName, string[]>();

function ideographPool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = CJK_START; cp <= CJK_END && out.length < 800; cp++) {
    const ch = String.fromCodePoint(cp);
    if (encodeIds(ch, enc).length === 1) out.push(ch);
  }
  poolCache.set(enc, out);
  return out;
}

function countOccEligible(src: string, phrase: string, OPEN: string): number {
  let n = 0;
  let idx = 0;
  while ((idx = src.indexOf(phrase, idx)) !== -1) {
    if (idx > 0 && src[idx - 1] === OPEN) {
      idx += 1;
      continue;
    }
    n++;
    idx += phrase.length;
  }
  return n;
}

function bindInPlace(src: string, phrase: string, key: string, OPEN: string, CLOSE: string): string {
  let out = '';
  let last = 0;
  let idx = 0;
  let bound = false;
  while ((idx = src.indexOf(phrase, idx)) !== -1) {
    if (idx > 0 && src[idx - 1] === OPEN) {
      idx += 1;
      continue;
    }
    out += src.slice(last, idx);
    if (!bound) {
      out += OPEN + key + phrase + CLOSE;
      bound = true;
    } else {
      out += key;
    }
    idx += phrase.length;
    last = idx;
  }
  return out + src.slice(last);
}

/** Stack decoder for in-place binders; total on malformed. */
function bodyDecode(src: string, OPEN: string, CLOSE: string): string | null {
  const dict = new Map<string, string>();
  const stack: { key: string; buf: string }[] = [];
  let cur = { key: '', buf: '' };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === OPEN) {
      const k = src[i + 1];
      if (k === undefined) return null;
      stack.push(cur);
      cur = { key: k, buf: '' };
      i++;
      continue;
    }
    if (c === CLOSE) {
      const parent = stack.pop();
      if (!parent) return null;
      dict.set(cur.key, cur.buf);
      parent.buf += cur.buf;
      cur = parent;
      continue;
    }
    const bound = dict.get(c);
    if (bound !== undefined) {
      cur.buf += bound;
      continue;
    }
    cur.buf += c;
  }
  if (stack.length !== 0) return null;
  return cur.buf;
}

export function plexusDecode(wire: string): string {
  if (wire.startsWith(SENTINEL)) {
    const rest = wire.slice(SENTINEL.length);
    const OPEN = rest[0];
    const CLOSE = rest[1];
    if (OPEN === undefined || CLOSE === undefined || rest[2] !== '\n') return wire;
    const body = rest.slice(3);
    const decoded = bodyDecode(body, OPEN, CLOSE);
    if (decoded === null) return wire;
    return helixDecode(decoded);
  }
  return helixDecode(wire);
}

interface Cascaded {
  wire: string;
  entries: PlexusEntry[];
  mode: 'plexus' | 'identity' | 'forced-wrap';
}

function cascadeInPlace(text: string, enc: EncodingName): Cascaded {
  const mustWrap = text.startsWith(SENTINEL);
  const inTokens = countTokens(text, enc);
  if (!text || (inTokens < 8 && !mustWrap)) {
    return { wire: text, entries: [], mode: 'identity' };
  }

  const pool = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  if (pool.length < 3) return { wire: text, entries: [], mode: 'identity' };
  const OPEN = pool[0];
  const CLOSE = pool[1];
  const keys = pool.slice(2);

  const D = countTokens(OPEN + keys[0] + CLOSE, enc);
  const A = countTokens(keys[0], enc);

  let body = text;
  const entries: PlexusEntry[] = [];
  let keyIdx = 0;
  let bestBody = text;
  let bestEntries: PlexusEntry[] = [];
  let bestTok = inTokens;

  for (let round = 0; round < MAX_ROUNDS && keyIdx < keys.length && entries.length < MAX_ENTRIES; round++) {
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
      const counts = new Map<string, { count: number; first: number }>();
      for (let i = 0; i + n <= T; i++) {
        let k = '';
        for (let j = 0; j < n; j++) k += toks[i + j].id + ':';
        const e = counts.get(k);
        if (e) e.count++;
        else counts.set(k, { count: 1, first: i });
      }
      for (const [, info] of counts) {
        if (info.count < 2) continue;
        let span = '';
        for (let j = 0; j < n; j++) span += toks[info.first + j].s;
        if (span.length < 2 || seen.has(span)) continue;
        if (span.indexOf(OPEN) !== -1 || span.indexOf(CLOSE) !== -1) continue;
        seen.add(span);
        cands.push({ span, width: n, freq: info.count });
      }
    }
    if (cands.length === 0) break;
    cands.sort((a, b) => b.freq * (b.width - 1) - a.freq * (a.width - 1));

    let accepted = false;
    const headerWireTok = countTokens(SENTINEL + OPEN + CLOSE + '\n' + body, enc);

    for (const cand of cands.slice(0, TOP_CANDS)) {
      if (keyIdx >= keys.length) break;
      const hits = countOccEligible(body, cand.span, OPEN);
      if (hits < 2) continue;
      // Analytic prefilter for in-place: (hits-1)*(w-A) - D
      if ((hits - 1) * (cand.width - A) - D <= 0) continue;

      const key = keys[keyIdx];
      const nextBody = bindInPlace(body, cand.span, key, OPEN, CLOSE);
      const nextWire = SENTINEL + OPEN + CLOSE + '\n' + nextBody;
      const nextTok = countTokens(nextWire, enc);
      if (nextTok >= headerWireTok) continue;

      // Byte gate on this step's decode of body only
      const decBody = bodyDecode(nextBody, OPEN, CLOSE);
      if (decBody !== text && decBody !== bodyDecode(body, OPEN, CLOSE) && decBody !== text) {
        // After first bind, decoded full should still be original text
      }
      const fullDec = bodyDecode(nextBody, OPEN, CLOSE);
      if (fullDec !== text) continue;

      body = nextBody;
      entries.push({
        key,
        phrase: cand.span,
        hits,
        spanTokens: cand.width,
        round,
      });
      keyIdx++;
      accepted = true;

      const wt = countTokens(SENTINEL + OPEN + CLOSE + '\n' + body, enc);
      if (wt < bestTok) {
        bestTok = wt;
        bestBody = body;
        bestEntries = entries.slice();
      }
      break; // cascade: re-mine after one accept
    }
    if (!accepted) break;
  }

  body = bestBody;
  const finalEntries = bestEntries;

  if (finalEntries.length === 0) {
    if (!mustWrap) return { wire: text, entries: [], mode: 'identity' };
    const w = SENTINEL + OPEN + CLOSE + '\n' + text;
    return { wire: w, entries: [], mode: 'forced-wrap' };
  }

  const wire = SENTINEL + OPEN + CLOSE + '\n' + body;
  const decoded = bodyDecode(body, OPEN, CLOSE);
  if (decoded !== text) {
    if (mustWrap) return { wire: SENTINEL + OPEN + CLOSE + '\n' + text, entries: [], mode: 'forced-wrap' };
    return { wire: text, entries: [], mode: 'identity' };
  }
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens && !mustWrap) return { wire: text, entries: [], mode: 'identity' };

  return { wire, entries: finalEntries, mode: 'plexus' };
}

export function plexusEncode(text: string, enc: EncodingName = 'o200k_base'): PlexusResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): PlexusResult => ({
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
  if (!text) return identity('empty');

  const p = cascadeInPlace(text, enc);
  const h = helixEncode(text, enc);

  type Cand = { wire: string; mode: PlexusResult['mode']; entries: PlexusEntry[] };
  const cands: Cand[] = [{ wire: text, mode: 'identity', entries: [] }];

  if (p.mode === 'plexus' || p.mode === 'forced-wrap') {
    cands.push({ wire: p.wire, mode: p.mode, entries: p.entries });
  }
  if (h.mode === 'factored') {
    cands.push({ wire: h.wire, mode: 'helix', entries: [] });
  }

  // H∘P: helix on plexus body
  if (p.mode === 'plexus') {
    const nl = p.wire.indexOf('\n', SENTINEL.length);
    if (nl > 0) {
      const header = p.wire.slice(0, nl + 1);
      const body = p.wire.slice(nl + 1);
      const h2 = helixEncode(body, enc);
      if (h2.mode === 'factored') {
        cands.push({ wire: header + h2.wire, mode: 'compose-ph', entries: p.entries });
      }
    }
  }

  // P∘H: cascade inplace on helix wire
  if (h.mode === 'factored') {
    const p2 = cascadeInPlace(h.wire, enc);
    if (p2.mode === 'plexus') {
      cands.push({ wire: p2.wire, mode: 'compose-hp', entries: p2.entries });
    }
  }

  let best = cands[0];
  let bestTok = inTokens;
  for (const c of cands) {
    const dec = plexusDecode(c.wire);
    if (dec !== text) continue;
    const tok = countTokens(c.wire, enc);
    if (tok < bestTok || (c.mode === 'forced-wrap' && best.mode === 'identity')) {
      bestTok = tok;
      best = c;
    }
  }

  if (best.mode === 'identity') {
    if (text.startsWith(SENTINEL)) {
      const pool = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
      if (pool.length >= 2) {
        const w = SENTINEL + pool[0] + pool[1] + '\n' + text;
        if (plexusDecode(w) === text) {
          const ot = countTokens(w, enc);
          return {
            wire: w,
            decoded: text,
            exact: true,
            inTokens,
            outTokens: ot,
            savingsPct: inTokens ? ((inTokens - ot) / inTokens) * 100 : 0,
            entries: [],
            mode: 'forced-wrap',
            notes: 'forced wrap: input begins with PX sentinel',
            encodeMs: ms(),
          };
        }
      }
    }
    return identity('tournament: identity won');
  }
  if (bestTok >= inTokens && best.mode !== 'forced-wrap') {
    return identity('tournament: no positive real-BPE savings');
  }

  return {
    wire: best.wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: bestTok,
    savingsPct: inTokens ? ((inTokens - bestTok) / inTokens) * 100 : 0,
    entries: best.entries,
    mode: best.mode,
    notes: `PLEXUS winner=${best.mode} · ${best.entries.length} cascade in-place binds · verified byte-exact`,
    encodeMs: ms(),
  };
}

export const PLEXUS_SYSTEM_PROMPT = [
  '# ✺ PLEXUS-PX — cascade in-place binding ⊕ arithmetic (byte-exact)',
  'A message may open with:',
  '  [PX]',
  '  OC          <- two delimiter chars OPEN CLOSE',
  '  <body>',
  'In the body: OPENkPHRASE CLOSE binds label k to PHRASE at first occurrence.',
  'Later bare k expands to PHRASE. Nested binders resolve inside-out.',
  'HELIX markers ⟐[start,stride,count,width,delimLen]<delim> may also appear;',
  HELIX_SYSTEM_PROMPT,
  'If no [PX] / ⟐ form appears, text is literal. Reconstruction is byte-exact.',
  'OUTPUT CONTRACT: reuse labels/markers when repeating bound content; code/ids verbatim; dense replies.',
].join('\n');

export interface PlexusSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

export const PLEXUS_HANDTRACE_300 =
  'Ship it: retry 3x, never log secrets.\n' +
  '{"id":7,"ok":true},{"id":8,"ok":true}\n' +
  'id,ms\na,12\nb,12\n' +
  '##..##\n##..##\n' +
  'for(let i=0;i<3;i++){s+=a[i];}\n' +
  'for(let j=0;j<3;j++){s+=a[j];}\n' +
  'Ship it: retry 3x, never log secrets.\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.\n' +
  'user: fix the flaky test\n' +
  'assistant: I will inspect the suite and patch the race.';

export function plexusSelfTest(enc: EncodingName = 'o200k_base'): PlexusSelfTest[] {
  const idLog = Array.from({ length: 200 }, (_, i) => `id:${i}`).join(',');
  const log = Array.from(
    { length: 40 },
    (_, i) =>
      `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
  ).join('\n');
  const cases: { name: string; text: string }[] = [
    { name: 'P0 empty', text: '' },
    { name: 'P1 short', text: 'hi' },
    { name: 'P2 hand300', text: PLEXUS_HANDTRACE_300 },
    { name: 'P3 sentinel', text: '[PX]\n«»\nnot a wire' },
    { name: 'P4 id-run', text: idLog },
    { name: 'P5 json-log', text: log },
    { name: 'P6 code-rep', text: 'function add(a, b) { return a + b; }\n'.repeat(20) },
  ];
  const out: PlexusSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = plexusEncode(c.text, enc);
      const rt = plexusDecode(r.wire) === c.text;
      const ok = rt && r.exact && (r.mode === 'forced-wrap' || r.outTokens <= r.inTokens);
      out.push({
        name: c.name,
        pass: ok,
        details: `mode=${r.mode} ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }
  try {
    const r = plexusEncode(log, enc);
    out.push({
      name: 'P7 log-savings>5',
      pass: r.savingsPct > 5,
      details: `${r.savingsPct.toFixed(1)}%`,
    });
  } catch (e) {
    out.push({ name: 'P7 log-savings>5', pass: false, details: (e as Error).message });
  }
  return out;
}
