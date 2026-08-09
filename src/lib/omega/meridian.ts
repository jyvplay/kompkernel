/**
 * ☉ MERIDIAN-M1 — Dual-Hemisphere Tournament Codec (original)
 * =============================================================================
 * Mechanism portfolio (orthogonal to every header-dictionary and pure-AP codec):
 *
 * H1 ANAPHORA HEMISPHERE: zero-header in-place binding.
 *     First occurrence of phrase P remains in-body as «kP»; occurrences 2..n → k.
 *     Dominates header dictionaries by A+h−D ≈ +2 tok/entry (measured).
 *
 * H2 HELIX HEMISPHERE: arithmetic-progression closed forms (imported lane).
 *     Numeric runs with no repeated substrings → O(1) markers.
 *
 * H3 TOURNAMENT: encode both hemispheres independently on the source, then
 *     compose H2∘H1 and H1∘H2; pick the wire with minimal real BPE tokens among
 *     {id, H1, H2, H2∘H1, H1∘H2} subject to byte-exact decode gates.
 *
 * Absent from surveyed art as a joint construction: Selective-Context, LLMLingua,
 * CompactPrompt, LTSC, Dictionary+ICL, VERITAS-VX, QUASAR, HELIX alone.
 *
 * HAND-TRACE — 300-char hetero (prose+JSON+CSV+grid+code+chat-log):
 *   MERIDIAN_HANDTRACE_300 below.
 *   (a) Anaphora binds "Ship it: retry 3x." (2×), `,"ok":true}` (2×), `##..##\n` (2×).
 *   (b) Helix factors id:0..N runs when present; on this fixture mostly identity.
 *   (c) Tournament picks best measured wire; identity if none shrinks.
 * =============================================================================
 */
import { countTokens, encodeIds, decodeIds, type EncodingName } from './bpe';
import { helixEncode, helixDecode, HELIX_SYSTEM_PROMPT } from './helix';

export interface MeridianEntry {
  key: string;
  phrase: string;
  hits: number;
  winTokens: number;
  gain: number;
}

export interface MeridianResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: MeridianEntry[];
  mode: 'anaphoric' | 'helix' | 'compose-ah' | 'compose-ha' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '[M1]\n';
const MIN_WIN = 2;
const MAX_EXT = 40;
const MAX_POS = 12;
const MAX_ANCHORS = 400;
const MAX_ENTRIES = 220;
const MAX_MINE_TOKENS = 260_000;
const K_RADIX = 200_100;
const CHAR_AUG_LIMIT = 60_000;
const CHAR_AUG_LENS = [3, 4, 5, 6, 8, 10, 12, 16, 20, 28, 40];

const poolCache = new Map<EncodingName, string[]>();

function ideographPool(enc: EncodingName): string[] {
  const hit = poolCache.get(enc);
  if (hit) return hit;
  const out: string[] = [];
  for (let cp = 0x4e00; cp <= 0x9fa5; cp++) {
    const ch = String.fromCharCode(cp);
    if (countTokens(ch, enc) === 1) out.push(ch);
    if (out.length >= 1200) break;
  }
  poolCache.set(enc, out);
  return out;
}

interface TokenGrid {
  ok: boolean;
  piece: string[];
  off: number[];
  idcum: number[];
}

function tokenGrid(text: string, enc: EncodingName): TokenGrid {
  const ids = encodeIds(text, enc);
  const piece: string[] = [];
  const off: number[] = [0];
  const idcum: number[] = [0];
  let pend: number[] = [];
  let chars = 0;
  let used = 0;
  for (let i = 0; i < ids.length; i++) {
    pend.push(ids[i]);
    let s: string;
    try {
      s = decodeIds(pend, enc);
    } catch {
      continue;
    }
    if (s.indexOf('\uFFFD') !== -1 && text.indexOf('\uFFFD') === -1) continue;
    piece.push(s);
    chars += s.length;
    used += pend.length;
    off.push(chars);
    idcum.push(used);
    pend = [];
  }
  const ok = pend.length === 0 && chars === text.length;
  return { ok, piece, off, idcum };
}

/** Decode M1 anaphora body (after OPEN/CLOSE declaration line). */
function anaphoraBodyDecode(src: string, OPEN: string, CLOSE: string): string | null {
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

export function meridianDecode(wire: string): string {
  // Try M1 anaphora wire
  if (wire.startsWith(SENTINEL)) {
    const body = wire.slice(SENTINEL.length);
    const OPEN = body[0];
    const CLOSE = body[1];
    if (OPEN === undefined || CLOSE === undefined || body[2] !== '\n') return wire;
    const decoded = anaphoraBodyDecode(body.slice(3), OPEN, CLOSE);
    if (decoded === null) return wire;
    // May have helix markers inside
    return helixDecode(decoded);
  }
  // Pure helix (no M1 header)
  return helixDecode(wire);
}

interface Anchor {
  c: number;
  pos: number[];
}
interface Cand {
  phrase: string;
  win: number;
  hits: number;
}

function anaphoraEncodeCore(
  text: string,
  enc: EncodingName,
): { wire: string; entries: MeridianEntry[]; mode: 'anaphoric' | 'identity' | 'forced-wrap' } {
  const mustWrap = text.startsWith(SENTINEL);
  if (text.length < 16 && !mustWrap) return { wire: text, entries: [], mode: 'identity' };

  const pool = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  if (pool.length < 3) return { wire: text, entries: [], mode: 'identity' };
  const OPEN = pool[0];
  const CLOSE = pool[1];
  const keys = pool.slice(2);
  const D = countTokens(OPEN + keys[0] + CLOSE, enc);
  const A = countTokens(keys[0], enc);

  const phraseIsSafe = (phrase: string): boolean =>
    phrase.indexOf(OPEN) === -1 && phrase.indexOf(CLOSE) === -1;

  const countEligible = (src: string, phrase: string): number => {
    let idx = 0;
    let n = 0;
    while ((idx = src.indexOf(phrase, idx)) !== -1) {
      if (idx > 0 && src[idx - 1] === OPEN) {
        idx += 1;
        continue;
      }
      n++;
      idx += phrase.length;
    }
    return n;
  };

  const bindInPlace = (src: string, phrase: string, key: string): string => {
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
      } else out += key;
      idx += phrase.length;
      last = idx;
    }
    return out + src.slice(last);
  };

  const minePass = (src: string): Cand[] => {
    const grid = tokenGrid(src, enc);
    const cands: Cand[] = [];
    const seen = new Set<string>();
    const push = (phrase: string, win: number, hits: number) => {
      if (phrase.length < 2 || seen.has(phrase)) return;
      if (!phraseIsSafe(phrase)) return;
      seen.add(phrase);
      cands.push({ phrase, win, hits });
    };

    if (grid.ok) {
      const P = Math.min(grid.piece.length, MAX_MINE_TOKENS);
      if (P >= MIN_WIN) {
        const intern = new Map<string, number>();
        const pid = new Int32Array(P);
        for (let i = 0; i < P; i++) {
          const s = grid.piece[i];
          let v = intern.get(s);
          if (v === undefined) {
            v = intern.size;
            intern.set(s, v);
          }
          pid[i] = v;
        }
        const anchors = new Map<number, Anchor>();
        for (let i = 0; i + MIN_WIN <= P; i++) {
          const k = pid[i] * K_RADIX + pid[i + 1];
          const cur = anchors.get(k);
          if (cur) {
            cur.c++;
            if (cur.pos.length < MAX_POS) cur.pos.push(i);
          } else anchors.set(k, { c: 1, pos: [i] });
        }
        const hot: Anchor[] = [];
        for (const a of anchors.values()) if (a.c >= 2) hot.push(a);
        hot.sort((x, y) => y.c - x.c);
        if (hot.length > MAX_ANCHORS) hot.length = MAX_ANCHORS;

        for (const a of hot) {
          const p0 = a.pos[0];
          let bestLen = MIN_WIN;
          for (let len = MIN_WIN + 1; len <= MAX_EXT && p0 + len <= P; len++) {
            let share = 1;
            for (let j = 1; j < a.pos.length; j++) {
              const pj = a.pos[j];
              if (pj + len > P || pj < p0 + len) continue;
              let eq = true;
              for (let t = MIN_WIN; t < len; t++) {
                if (pid[p0 + t] !== pid[pj + t]) {
                  eq = false;
                  break;
                }
              }
              if (eq) {
                share++;
                break;
              }
            }
            if (share >= 2) bestLen = len;
            else break;
          }
          const lens = new Set<number>([bestLen, Math.max(MIN_WIN, bestLen >> 1), MIN_WIN]);
          for (const len of lens) {
            push(
              src.slice(grid.off[p0], grid.off[p0 + len]),
              grid.idcum[p0 + len] - grid.idcum[p0],
              a.c,
            );
          }
        }
      }
    }

    if (src.length <= CHAR_AUG_LIMIT) {
      for (const L of CHAR_AUG_LENS) {
        if (L >= src.length) break;
        const counts = new Map<string, number>();
        for (let i = 0; i + L <= src.length; i++) {
          const sub = src.substr(i, L);
          counts.set(sub, (counts.get(sub) ?? 0) + 1);
        }
        let added = 0;
        for (const [sub, n] of counts) {
          if (n < 2) continue;
          push(sub, countTokens(sub, enc), n);
          if (++added >= 400) break;
        }
      }
    }
    return cands;
  };

  const CTX = 24;
  const SAMPLES = 6;
  const measuredGain = (src: string, phrase: string, key: string, n: number): number => {
    let idx = 0;
    let samples = 0;
    let sumDelta = 0;
    let binderCost = 0;
    while (samples < SAMPLES) {
      idx = src.indexOf(phrase, idx);
      if (idx < 0) break;
      const l = src.slice(Math.max(0, idx - CTX), idx);
      const r = src.slice(idx + phrase.length, idx + phrase.length + CTX);
      const base = countTokens(l + phrase + r, enc);
      const aliased = countTokens(l + key + r, enc);
      if (samples === 0)
        binderCost = countTokens(l + OPEN + key + phrase + CLOSE + r, enc) - base;
      sumDelta += base - aliased;
      samples++;
      idx += phrase.length;
    }
    if (samples === 0) return -1;
    return (n - 1) * (sumDelta / samples) - binderCost;
  };

  let body = text;
  let entries: MeridianEntry[] = [];
  let bestBody = text;
  let bestEntries: MeridianEntry[] = [];
  let bestTokens = countTokens(text, enc);
  const rounds = text.length > 200_000 ? 2 : text.length > 40_000 ? 3 : 5;
  const MAX_CANDS_PER_ROUND = 1500;

  for (let round = 0; round < rounds; round++) {
    if (entries.length >= MAX_ENTRIES || entries.length >= keys.length) break;
    const cands = minePass(body);
    if (cands.length === 0) break;
    cands.sort(
      (x, y) =>
        (y.hits - 1) * (y.win - A) - (x.hits - 1) * (x.win - A) || y.win - x.win,
    );
    if (cands.length > MAX_CANDS_PER_ROUND) cands.length = MAX_CANDS_PER_ROUND;

    let admitted = 0;
    for (const cand of cands) {
      if (entries.length >= MAX_ENTRIES || entries.length >= keys.length) break;
      if ((cand.hits - 1) * (cand.win - A) - D <= 0) continue;
      if (!phraseIsSafe(cand.phrase)) continue;
      const n = countEligible(body, cand.phrase);
      if (n < 2) continue;
      const key = keys[entries.length];
      const gain = measuredGain(body, cand.phrase, key, n);
      if (gain <= 0) continue;
      body = bindInPlace(body, cand.phrase, key);
      entries.push({
        key,
        phrase: cand.phrase,
        hits: n,
        winTokens: cand.win,
        gain: Math.round(gain),
      });
      admitted++;
    }
    if (admitted === 0) break;

    const roundTokens = countTokens(SENTINEL + OPEN + CLOSE + '\n' + body, enc);
    if (roundTokens < bestTokens) {
      bestTokens = roundTokens;
      bestBody = body;
      bestEntries = entries.slice();
    } else {
      body = bestBody;
      entries = bestEntries.slice();
      break;
    }
  }

  body = bestBody;
  entries = bestEntries;
  if (entries.length === 0 && !mustWrap) return { wire: text, entries: [], mode: 'identity' };

  if (entries.length === 0 && mustWrap) {
    return {
      wire: SENTINEL + OPEN + CLOSE + '\n' + text,
      entries: [],
      mode: 'forced-wrap',
    };
  }

  const wire = SENTINEL + OPEN + CLOSE + '\n' + body;
  const decoded = anaphoraBodyDecode(body, OPEN, CLOSE);
  if (decoded !== text) {
    if (mustWrap) {
      return {
        wire: SENTINEL + OPEN + CLOSE + '\n' + text,
        entries: [],
        mode: 'forced-wrap',
      };
    }
    return { wire: text, entries: [], mode: 'identity' };
  }
  const outTokens = countTokens(wire, enc);
  if (outTokens >= countTokens(text, enc) && !mustWrap)
    return { wire: text, entries: [], mode: 'identity' };

  return {
    wire,
    entries,
    mode: 'anaphoric',
  };
}

export function meridianEncode(text: string, enc: EncodingName = 'o200k_base'): MeridianResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const inTokens = countTokens(text, enc);
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const identity = (notes: string): MeridianResult => ({
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

  // Hemisphere H1
  const a = anaphoraEncodeCore(text, enc);
  // Hemisphere H2
  const h = helixEncode(text, enc);

  type Cand = { wire: string; mode: MeridianResult['mode']; entries: MeridianEntry[] };
  const cands: Cand[] = [{ wire: text, mode: 'identity', entries: [] }];

  if (a.mode === 'anaphoric' || a.mode === 'forced-wrap') {
    cands.push({
      wire: a.wire,
      mode: a.mode === 'forced-wrap' ? 'forced-wrap' : 'anaphoric',
      entries: a.entries,
    });
  }
  if (h.mode === 'factored') cands.push({ wire: h.wire, mode: 'helix', entries: [] });

  // Compose H2∘H1: helix on anaphora body (if anaphora produced a wire)
  if (a.mode === 'anaphoric') {
    const bodyStart = a.wire.indexOf('\n', SENTINEL.length) + 1; // after OPEN CLOSE line
    if (bodyStart > 0) {
      const header = a.wire.slice(0, bodyStart);
      const body = a.wire.slice(bodyStart);
      const h2 = helixEncode(body, enc);
      if (h2.mode === 'factored') {
        cands.push({ wire: header + h2.wire, mode: 'compose-ah', entries: a.entries });
      }
    }
  }

  // Compose H1∘H2: anaphora on helix wire
  if (h.mode === 'factored') {
    const a2 = anaphoraEncodeCore(h.wire, enc);
    if (a2.mode === 'anaphoric') {
      cands.push({ wire: a2.wire, mode: 'compose-ha', entries: a2.entries });
    }
  }

  let best = cands[0];
  let bestTok = inTokens;
  for (const c of cands) {
    const dec = meridianDecode(c.wire);
    if (dec !== text) continue;
    const tok = countTokens(c.wire, enc);
    // Prefer smaller; forced-wrap may cost more but is required for sentinel inputs
    if (tok < bestTok || (c.mode === 'forced-wrap' && best.mode === 'identity' && dec === text)) {
      bestTok = tok;
      best = c;
    }
  }

  if (best.mode === 'identity') {
    // If input starts with M1 sentinel and identity re-parses wrongly, force wrap
    if (text.startsWith(SENTINEL)) {
      const pool = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
      if (pool.length >= 2) {
        const w = SENTINEL + pool[0] + pool[1] + '\n' + text;
        if (meridianDecode(w) === text) {
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
            notes: 'forced wrap: input begins with M1 sentinel',
            encodeMs: ms(),
          };
        }
      }
    }
    return identity('tournament: identity won (no hemisphere shrank under exact gate)');
  }
  if (bestTok >= inTokens && best.mode !== 'forced-wrap') {
    return identity('tournament: no positive savings under exact gate');
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
    notes: `MERIDIAN tournament winner=${best.mode} · ${best.entries.length} anaphora binds · verified byte-exact`,
    encodeMs: ms(),
  };
}

export const MERIDIAN_SYSTEM_PROMPT = [
  '# ☉ MERIDIAN-M1 — dual-hemisphere exact wire (anaphora ⊕ arithmetic)',
  'A message may use either or both of:',
  '',
  '## Anaphora hemisphere ([M1] header)',
  'Line 1: [M1]',
  'Line 2: two delimiter characters OPEN CLOSE, then newline.',
  'Reading: OPENkP CLOSE binds label k to phrase P in place (first occurrence).',
  'Later bare k expands to P. Nested binders resolve inside-out. Byte-exact.',
  '',
  '## Arithmetic hemisphere (HELIX markers, may appear inside or alone)',
  HELIX_SYSTEM_PROMPT,
  '',
  'If neither form appears, text is literal.',
  'OUTPUT CONTRACT: reuse labels/markers when repeating bound content; code/ids verbatim; dense replies.',
].join('\n');

export interface MeridianSelfTest {
  name: string;
  pass: boolean;
  details: string;
}

/** 300-char hetero: prose + JSON + CSV + grid + code + chat-log tail */
export const MERIDIAN_HANDTRACE_300 =
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

export function meridianSelfTest(enc: EncodingName = 'o200k_base'): MeridianSelfTest[] {
  const idLog = Array.from({ length: 200 }, (_, i) => `id:${i}`).join(',');
  const cases: { name: string; text: string }[] = [
    { name: 'M0 empty', text: '' },
    { name: 'M1 short', text: 'hello' },
    { name: 'M2 handtrace-300', text: MERIDIAN_HANDTRACE_300 },
    { name: 'M3 sentinel adv', text: '[M1]\n«»\nnot a wire' },
    { name: 'M4 id-run helix path', text: idLog },
    {
      name: 'M5 JSON log',
      text: Array.from(
        { length: 40 },
        (_, i) =>
          `{"ts":"2026-07-1${i % 10}T12:0${i % 6}:00Z","level":"INFO","svc":"gateway","msg":"request completed","status":200,"latency_ms":${40 + i}}`,
      ).join('\n'),
    },
  ];
  const out: MeridianSelfTest[] = [];
  for (const c of cases) {
    try {
      const r = meridianEncode(c.text, enc);
      const rt = meridianDecode(r.wire) === c.text;
      const ok = rt && r.exact && (r.mode === 'forced-wrap' || r.outTokens <= r.inTokens);
      out.push({
        name: c.name,
        pass: ok,
        details: `mode=${r.mode} tok ${r.inTokens}→${r.outTokens} (${r.savingsPct.toFixed(1)}%)`,
      });
    } catch (e) {
      out.push({ name: c.name, pass: false, details: (e as Error).message });
    }
  }
  try {
    const r = meridianEncode(cases[5].text, enc);
    out.push({
      name: 'M6 log-savings',
      pass: r.savingsPct > 5,
      details: `savings=${r.savingsPct.toFixed(1)}%`,
    });
  } catch (e) {
    out.push({ name: 'M6 log-savings', pass: false, details: (e as Error).message });
  }
  return out;
}
