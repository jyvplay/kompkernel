/**
 * ⟐ Ω-ANAPHORA (AN1) — zero-header in-place binding, byte-exact.
 * First occurrence of P stays in body wrapped as OPENkP CLOSE; later → k.
 * Dominates header dictionaries by A + h − D tokens per entry.
 */
import { countTokens, encodeIds, decodeIds, type EncodingName } from './bpe';

export interface AnaphoraEntry {
  key: string;
  phrase: string;
  hits: number;
  winTokens: number;
  gain: number;
}

export interface AnaphoraResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  entries: AnaphoraEntry[];
  mode: 'anaphoric' | 'identity' | 'forced-wrap';
  notes: string;
  encodeMs: number;
}

const SENTINEL = '[AN1]\n';
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
  return { ok: pend.length === 0 && chars === text.length, piece, off, idcum };
}

export function anaphoraDecode(wire: string): string {
  if (!wire.startsWith(SENTINEL)) return wire;
  const body = wire.slice(SENTINEL.length);
  const OPEN = body[0];
  const CLOSE = body[1];
  if (OPEN === undefined || CLOSE === undefined || body[2] !== '\n') return wire;
  const src = body.slice(3);
  const dict = new Map<string, string>();
  const stack: { key: string; buf: string }[] = [];
  let cur = { key: '', buf: '' };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === OPEN) {
      const k = src[i + 1];
      if (k === undefined) return wire;
      stack.push(cur);
      cur = { key: k, buf: '' };
      i++;
      continue;
    }
    if (c === CLOSE) {
      const parent = stack.pop();
      if (!parent) return wire;
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
  if (stack.length !== 0) return wire;
  return cur.buf;
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

export function anaphoraEncode(text: string, enc: EncodingName = 'o200k_base'): AnaphoraResult {
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const ms = () => (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): AnaphoraResult => ({
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
  const mustWrap = text.startsWith(SENTINEL);
  if (text.length < 16 && !mustWrap) return identity('input below redundancy floor');

  const pool = ideographPool(enc).filter((ch) => text.indexOf(ch) === -1);
  if (pool.length < 3) return identity('no absent single-token symbols available');
  const OPEN = pool[0];
  const CLOSE = pool[1];
  const keys = pool.slice(2);
  const D = countTokens(OPEN + keys[0] + CLOSE, enc);
  const A = countTokens(keys[0], enc);

  const safe = (p: string) => p.indexOf(OPEN) === -1 && p.indexOf(CLOSE) === -1;

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
      if (phrase.length < 2 || seen.has(phrase) || !safe(phrase)) return;
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
            push(src.slice(grid.off[p0], grid.off[p0 + len]), grid.idcum[p0 + len] - grid.idcum[p0], a.c);
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
      if (samples === 0) binderCost = countTokens(l + OPEN + key + phrase + CLOSE + r, enc) - base;
      sumDelta += base - aliased;
      samples++;
      idx += phrase.length;
    }
    if (samples === 0) return -1;
    return (n - 1) * (sumDelta / samples) - binderCost;
  };

  let body = text;
  let entries: AnaphoraEntry[] = [];
  let bestBody = text;
  let bestEntries: AnaphoraEntry[] = [];
  let bestTokens = inTokens;
  const rounds = text.length > 200_000 ? 2 : text.length > 40_000 ? 3 : 5;

  for (let round = 0; round < rounds; round++) {
    if (entries.length >= MAX_ENTRIES || entries.length >= keys.length) break;
    const cands = minePass(body);
    if (cands.length === 0) break;
    cands.sort((x, y) => (y.hits - 1) * (y.win - A) - (x.hits - 1) * (x.win - A) || y.win - x.win);
    if (cands.length > 1500) cands.length = 1500;
    let admitted = 0;
    for (const cand of cands) {
      if (entries.length >= MAX_ENTRIES || entries.length >= keys.length) break;
      if ((cand.hits - 1) * (cand.win - A) - D <= 0) continue;
      if (!safe(cand.phrase)) continue;
      const n = countEligible(body, cand.phrase);
      if (n < 2) continue;
      const key = keys[entries.length];
      const gain = measuredGain(body, cand.phrase, key, n);
      if (gain <= 0) continue;
      body = bindInPlace(body, cand.phrase, key);
      entries.push({ key, phrase: cand.phrase, hits: n, winTokens: cand.win, gain: Math.round(gain) });
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
  if (entries.length === 0 && !mustWrap) return identity('no positive-gain in-place bindings');

  const wire = SENTINEL + OPEN + CLOSE + '\n' + (entries.length === 0 ? text : body);
  const decoded = anaphoraDecode(wire);
  if (decoded !== text) return identity('gate G1: wire failed byte-verify');
  const outTokens = countTokens(wire, enc);
  if (outTokens >= inTokens && !mustWrap) return identity('gate G2: wire measured ≥ input');

  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    entries,
    mode: entries.length === 0 ? 'forced-wrap' : 'anaphoric',
    notes: `${entries.length} in-place bindings · zero header · measured +${inTokens - outTokens} tok · byte-exact`,
    encodeMs: ms(),
  };
}

export function anaphoraDecoderPrompt(r?: AnaphoraResult | null): string {
  const open = r?.wire.startsWith(SENTINEL) ? r.wire[SENTINEL.length] : '一';
  const close = r?.wire.startsWith(SENTINEL) ? r.wire[SENTINEL.length + 1] : '丁';
  return [
    '# ⟐ Ω-ANAPHORA (AN1) — byte-exact, zero-header, in-place binding',
    `Line 1 is [AN1]. Line 2 declares OPEN=${open} and CLOSE=${close}.`,
    `Read ${open}kP${close} as binding label k to phrase P; later bare k means P.`,
    'Binders may nest. Every other character is literal. Reconstruction is byte-exact.',
    'OUTPUT CONTRACT: reply densely; keep code, numbers, identifiers and quoted values verbatim.',
  ].join('\n');
}

export const ANAPHORA_SYSTEM_PROMPT = anaphoraDecoderPrompt(null);
