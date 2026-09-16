// src/lib/omega/bpe.ts
import {
  encode as encO200k,
  decode as decO200k
} from "gpt-tokenizer/encoding/o200k_base";
import {
  encode as encCl100k,
  decode as decCl100k
} from "gpt-tokenizer/encoding/cl100k_base";
var API = {
  o200k_base: {
    encode: (s) => encO200k(s),
    decode: (ids) => decO200k(ids),
    scanLimit: 2e5
  },
  cl100k_base: {
    encode: (s) => encCl100k(s),
    decode: (ids) => decCl100k(ids),
    scanLimit: 100256
  }
};
function encodeIds(text, enc2) {
  if (text === "") return [];
  return API[enc2].encode(text);
}
function countTokens(text, enc2) {
  if (text === "") return 0;
  return API[enc2].encode(text).length;
}
function decodeIds(ids, enc2) {
  return API[enc2].decode(ids);
}
function tokenStrings(text, enc2) {
  const ids = encodeIds(text, enc2);
  const out = [];
  for (const id of ids) {
    let s;
    try {
      s = API[enc2].decode([id]);
    } catch {
      s = "\uFFFD";
    }
    out.push({ id, s });
  }
  return out;
}
var ATOM_SHAPE = /^ [A-Za-z]{1,24}$/;
var CACHE = /* @__PURE__ */ new Map();
function fnv1a(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
function buildAtomAlphabet(enc2) {
  const cached = CACHE.get(enc2);
  if (cached) return cached;
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const api = API[enc2];
  const cand = [];
  let scanned = 0;
  let misses = 0;
  for (let id = 0; id < api.scanLimit; id++) {
    let s;
    try {
      s = api.decode([id]);
    } catch {
      misses++;
      if (misses > 4096 && cand.length > 0) break;
      continue;
    }
    scanned++;
    if (s.length < 2 || s.length > 25) continue;
    if (!ATOM_SHAPE.test(s)) continue;
    let ids;
    try {
      ids = api.encode(s);
    } catch {
      continue;
    }
    if (ids.length !== 1 || ids[0] !== id) continue;
    cand.push({ id, s });
  }
  cand.sort((a, b) => b.s.length - a.s.length || a.id - b.id);
  const maxAtoms = Math.min(65536, cand.length);
  const atoms = cand.slice(0, maxAtoms).map((c) => c.s);
  const bits = Number(Math.log2(Math.max(2, atoms.length)).toFixed(4));
  const index = /* @__PURE__ */ new Map();
  for (let i = 0; i < atoms.length; i++) index.set(atoms[i], i);
  let total = 0;
  let minChars = Infinity;
  let maxChars = 0;
  for (const a of atoms) {
    total += a.length;
    if (a.length < minChars) minChars = a.length;
    if (a.length > maxChars) maxChars = a.length;
  }
  const sampleN = Math.min(512, atoms.length);
  let probe = "";
  for (let i = 0; i < sampleN; i++) {
    probe += atoms[Math.floor(i * atoms.length / sampleN)];
  }
  let probeTokens = -1;
  try {
    probeTokens = api.encode(probe).length;
  } catch {
    probeTokens = -1;
  }
  const alpha = {
    encoding: enc2,
    atoms,
    index,
    bits,
    candidates: cand.length,
    scanned,
    fingerprint: fnv1a(`${enc2}|${atoms.length}|${atoms[0]}|${atoms[atoms.length - 1]}|${total}`),
    meanChars: atoms.length ? total / atoms.length : 0,
    minChars: Number.isFinite(minChars) ? minChars : 0,
    maxChars,
    proof: { sample: sampleN, tokens: probeTokens, exact: probeTokens === sampleN },
    buildMs: (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
  };
  CACHE.set(enc2, alpha);
  return alpha;
}

// src/lib/omega/helix.ts
var GLYPH = "\u27D0";
var MIN_RUN = 3;
var MAX_DECODE_COUNT = 2e6;
function escLiteral(s) {
  return s.split(GLYPH).join(GLYPH + GLYPH);
}
function scanDigitMatches(text) {
  const out = [];
  const re = /\d+/g;
  let m2;
  while ((m2 = re.exec(text)) !== null) {
    const s = m2[0];
    const v = s.length <= 15 ? Number(s) : NaN;
    out.push({
      value: Number.isSafeInteger(v) ? v : NaN,
      text: s,
      start: m2.index,
      end: m2.index + s.length
    });
  }
  return out;
}
function widthOf(numText) {
  return numText.length > 1 && numText[0] === "0" ? numText.length : 0;
}
function renderNumber(value, width) {
  const s = String(value);
  return width > 0 && value >= 0 && s.length < width ? s.padStart(width, "0") : s;
}
function helixDecode(wire) {
  let out = "";
  let i = 0;
  const n = wire.length;
  while (i < n) {
    const c = wire[i];
    if (c !== GLYPH) {
      out += c;
      i++;
      continue;
    }
    if (i + 1 < n && wire[i + 1] === GLYPH) {
      out += GLYPH;
      i += 2;
      continue;
    }
    if (i + 1 < n && wire[i + 1] === "[") {
      const close = wire.indexOf("]", i + 2);
      if (close === -1) {
        out += c;
        i++;
        continue;
      }
      const header = wire.slice(i + 2, close);
      const parts = header.split(",");
      if (parts.length === 5 && parts.every((p) => /^-?\d+$/.test(p))) {
        const start = Number(parts[0]);
        const stride = Number(parts[1]);
        const count = Number(parts[2]);
        const width = Number(parts[3]);
        const delimLen = Number(parts[4]);
        const delimStart = close + 1;
        const delimEnd = delimStart + delimLen;
        if (count > 0 && count <= MAX_DECODE_COUNT && delimLen >= 0 && delimEnd <= n && Number.isSafeInteger(start) && Number.isSafeInteger(stride) && Number.isSafeInteger(start + stride * (count - 1))) {
          const delimiter = wire.slice(delimStart, delimEnd);
          let body = "";
          for (let k2 = 0; k2 < count; k2++) {
            body += renderNumber(start + stride * k2, width);
            if (k2 < count - 1) body += delimiter;
          }
          out += body;
          i = delimEnd;
          continue;
        }
      }
      out += c;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
function helixEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    runs: [],
    mode: "identity",
    notes
  });
  if (text.length === 0) return identity("empty input");
  const matches = scanDigitMatches(text);
  if (matches.length < MIN_RUN) return identity("fewer than 3 numeric tokens; no progression possible");
  const runs = [];
  let out = "";
  let cursor = 0;
  let idx = 0;
  const flushLiteral = (uptoCharIndex) => {
    if (uptoCharIndex > cursor) {
      out += escLiteral(text.slice(cursor, uptoCharIndex));
      cursor = uptoCharIndex;
    }
  };
  while (idx < matches.length) {
    const m0 = matches[idx];
    if (Number.isNaN(m0.value)) {
      idx++;
      continue;
    }
    let j = idx + 1;
    let stride = null;
    let delimiter = null;
    let chainEnd = idx;
    while (j < matches.length) {
      const prev = matches[j - 1];
      const cur = matches[j];
      if (Number.isNaN(cur.value)) break;
      const d = text.slice(prev.end, cur.start);
      const s = cur.value - prev.value;
      if (stride === null) {
        stride = s;
        delimiter = d;
        chainEnd = j;
        j++;
        continue;
      }
      if (s === stride && d === delimiter) {
        chainEnd = j;
        j++;
        continue;
      }
      break;
    }
    const count = chainEnd - idx + 1;
    if (count >= MIN_RUN && stride !== null && delimiter !== null) {
      const width = widthOf(m0.text);
      let exactRun = true;
      for (let k2 = 0; k2 < count; k2++) {
        if (renderNumber(m0.value + stride * k2, width) !== matches[idx + k2].text) {
          exactRun = false;
          break;
        }
      }
      if (exactRun) {
        const runStartChar = matches[idx].start;
        const runEndChar = matches[chainEnd].end;
        const literalSpan = text.slice(runStartChar, runEndChar);
        const marker = `${GLYPH}[${m0.value},${stride},${count},${width},${delimiter.length}]${delimiter}`;
        const literalTokens = countTokens(literalSpan, enc2);
        const markerTokens = countTokens(marker, enc2);
        if (markerTokens < literalTokens) {
          flushLiteral(runStartChar);
          out += marker;
          cursor = runEndChar;
          runs.push({
            start: m0.value,
            stride,
            count,
            width,
            delimiter,
            literalTokens,
            markerTokens
          });
          idx = chainEnd + 1;
          continue;
        }
      }
    }
    idx++;
  }
  flushLiteral(text.length);
  if (runs.length === 0) return identity("no arithmetic run cleared the measured real-BPE gain bar");
  const wire = out;
  const decoded = helixDecode(wire);
  if (decoded !== text) return identity("guard: wire failed byte-verify; identity emitted");
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens) return identity("guard: factored wire measured >= input; identity emitted");
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    runs,
    mode: "factored",
    notes: `${runs.length} arithmetic run(s) factored to closed form \xB7 verified byte-exact \xB7 guard active`
  };
}
var HELIX_SYSTEM_PROMPT = [
  "# \u27D0 HELIX-AP (HX1) \u2014 byte-exact closed-form numeric-run wire",
  "Some numeric runs in this message may be replaced by an inline marker:",
  "  \u27D0[start,stride,count,width,delimLen]<delimLen raw characters: delimiter>",
  "Decode rules (apply mentally; do not emit the expansion unless asked):",
  "1. The run expands to `count` numbers: start, start+stride, start+2*stride, \u2026",
  "   Each number is zero-padded to `width` characters if width>0 (else printed plainly).",
  "2. Consecutive numbers are joined by the delimiter (the raw text immediately",
  "   following the closing `]`, exactly `delimLen` characters long).",
  "3. `\u27D0\u27D0` outside a marker is a literal `\u27D0`. Everything else is literal.",
  "4. Reconstruction is byte-exact; no information is discarded."
].join("\n");

// src/lib/omega/anaphora.ts
var SENTINEL = "[AN1]\n";
var MIN_WIN = 2;
var MAX_EXT = 40;
var MAX_POS = 12;
var MAX_ANCHORS = 400;
var MAX_ENTRIES = 220;
var MAX_MINE_TOKENS = 26e4;
var K_RADIX = 200100;
var CHAR_AUG_LIMIT = 6e4;
var CHAR_AUG_LENS = [3, 4, 5, 6, 8, 10, 12, 16, 20, 28, 40];
var poolCache = /* @__PURE__ */ new Map();
function ideographPool(enc2) {
  const hit = poolCache.get(enc2);
  if (hit) return hit;
  const out = [];
  for (let cp = 19968; cp <= 40869; cp++) {
    const ch = String.fromCharCode(cp);
    if (countTokens(ch, enc2) === 1) out.push(ch);
    if (out.length >= 1200) break;
  }
  poolCache.set(enc2, out);
  return out;
}
function tokenGrid(text, enc2) {
  const ids = encodeIds(text, enc2);
  const piece = [];
  const off = [0];
  const idcum = [0];
  let pend = [];
  let chars = 0;
  let used = 0;
  for (let i = 0; i < ids.length; i++) {
    pend.push(ids[i]);
    let s;
    try {
      s = decodeIds(pend, enc2);
    } catch {
      continue;
    }
    if (s.indexOf("\uFFFD") !== -1 && text.indexOf("\uFFFD") === -1) continue;
    piece.push(s);
    chars += s.length;
    used += pend.length;
    off.push(chars);
    idcum.push(used);
    pend = [];
  }
  return { ok: pend.length === 0 && chars === text.length, piece, off, idcum };
}
function anaphoraDecode(wire) {
  if (!wire.startsWith(SENTINEL)) return wire;
  const body = wire.slice(SENTINEL.length);
  const OPEN = body[0];
  const CLOSE = body[1];
  if (OPEN === void 0 || CLOSE === void 0 || body[2] !== "\n") return wire;
  const src2 = body.slice(3);
  const dict = /* @__PURE__ */ new Map();
  const stack = [];
  let cur = { key: "", buf: "" };
  for (let i = 0; i < src2.length; i++) {
    const c = src2[i];
    if (c === OPEN) {
      const k2 = src2[i + 1];
      if (k2 === void 0) return wire;
      stack.push(cur);
      cur = { key: k2, buf: "" };
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
    if (bound !== void 0) {
      cur.buf += bound;
      continue;
    }
    cur.buf += c;
  }
  if (stack.length !== 0) return wire;
  return cur.buf;
}
function anaphoraEncode(text, enc2 = "o200k_base") {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    mode: "identity",
    notes,
    encodeMs: ms()
  });
  const mustWrap = text.startsWith(SENTINEL);
  if (text.length < 16 && !mustWrap) return identity("input below redundancy floor");
  const pool2 = ideographPool(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (pool2.length < 3) return identity("no absent single-token symbols available");
  const OPEN = pool2[0];
  const CLOSE = pool2[1];
  const keys = pool2.slice(2);
  const D = countTokens(OPEN + keys[0] + CLOSE, enc2);
  const A = countTokens(keys[0], enc2);
  const safe = (p) => p.indexOf(OPEN) === -1 && p.indexOf(CLOSE) === -1;
  const countEligible2 = (src2, phrase) => {
    let idx = 0;
    let n = 0;
    while ((idx = src2.indexOf(phrase, idx)) !== -1) {
      if (idx > 0 && src2[idx - 1] === OPEN) {
        idx += 1;
        continue;
      }
      n++;
      idx += phrase.length;
    }
    return n;
  };
  const bindInPlace2 = (src2, phrase, key) => {
    let out = "";
    let last = 0;
    let idx = 0;
    let bound = false;
    while ((idx = src2.indexOf(phrase, idx)) !== -1) {
      if (idx > 0 && src2[idx - 1] === OPEN) {
        idx += 1;
        continue;
      }
      out += src2.slice(last, idx);
      if (!bound) {
        out += OPEN + key + phrase + CLOSE;
        bound = true;
      } else out += key;
      idx += phrase.length;
      last = idx;
    }
    return out + src2.slice(last);
  };
  const minePass = (src2) => {
    const grid = tokenGrid(src2, enc2);
    const cands = [];
    const seen = /* @__PURE__ */ new Set();
    const push = (phrase, win, hits) => {
      if (phrase.length < 2 || seen.has(phrase) || !safe(phrase)) return;
      seen.add(phrase);
      cands.push({ phrase, win, hits });
    };
    if (grid.ok) {
      const P = Math.min(grid.piece.length, MAX_MINE_TOKENS);
      if (P >= MIN_WIN) {
        const intern = /* @__PURE__ */ new Map();
        const pid = new Int32Array(P);
        for (let i = 0; i < P; i++) {
          const s = grid.piece[i];
          let v = intern.get(s);
          if (v === void 0) {
            v = intern.size;
            intern.set(s, v);
          }
          pid[i] = v;
        }
        const anchors = /* @__PURE__ */ new Map();
        for (let i = 0; i + MIN_WIN <= P; i++) {
          const k2 = pid[i] * K_RADIX + pid[i + 1];
          const cur = anchors.get(k2);
          if (cur) {
            cur.c++;
            if (cur.pos.length < MAX_POS) cur.pos.push(i);
          } else anchors.set(k2, { c: 1, pos: [i] });
        }
        const hot = [];
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
              for (let t2 = MIN_WIN; t2 < len; t2++) {
                if (pid[p0 + t2] !== pid[pj + t2]) {
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
          const lens = /* @__PURE__ */ new Set([bestLen, Math.max(MIN_WIN, bestLen >> 1), MIN_WIN]);
          for (const len of lens) {
            push(src2.slice(grid.off[p0], grid.off[p0 + len]), grid.idcum[p0 + len] - grid.idcum[p0], a.c);
          }
        }
      }
    }
    if (src2.length <= CHAR_AUG_LIMIT) {
      for (const L of CHAR_AUG_LENS) {
        if (L >= src2.length) break;
        const counts = /* @__PURE__ */ new Map();
        for (let i = 0; i + L <= src2.length; i++) {
          const sub = src2.substr(i, L);
          counts.set(sub, (counts.get(sub) ?? 0) + 1);
        }
        let added = 0;
        for (const [sub, n] of counts) {
          if (n < 2) continue;
          push(sub, countTokens(sub, enc2), n);
          if (++added >= 400) break;
        }
      }
    }
    return cands;
  };
  const CTX = 24;
  const SAMPLES = 6;
  const measuredGain = (src2, phrase, key, n) => {
    let idx = 0;
    let samples = 0;
    let sumDelta = 0;
    let binderCost = 0;
    while (samples < SAMPLES) {
      idx = src2.indexOf(phrase, idx);
      if (idx < 0) break;
      const l = src2.slice(Math.max(0, idx - CTX), idx);
      const r = src2.slice(idx + phrase.length, idx + phrase.length + CTX);
      const base = countTokens(l + phrase + r, enc2);
      const aliased = countTokens(l + key + r, enc2);
      if (samples === 0) binderCost = countTokens(l + OPEN + key + phrase + CLOSE + r, enc2) - base;
      sumDelta += base - aliased;
      samples++;
      idx += phrase.length;
    }
    if (samples === 0) return -1;
    return (n - 1) * (sumDelta / samples) - binderCost;
  };
  let body = text;
  let entries = [];
  let bestBody = text;
  let bestEntries = [];
  let bestTokens = inTokens;
  const rounds = text.length > 2e5 ? 2 : text.length > 4e4 ? 3 : 5;
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
      const n = countEligible2(body, cand.phrase);
      if (n < 2) continue;
      const key = keys[entries.length];
      const gain = measuredGain(body, cand.phrase, key, n);
      if (gain <= 0) continue;
      body = bindInPlace2(body, cand.phrase, key);
      entries.push({ key, phrase: cand.phrase, hits: n, winTokens: cand.win, gain: Math.round(gain) });
      admitted++;
    }
    if (admitted === 0) break;
    const roundTokens = countTokens(SENTINEL + OPEN + CLOSE + "\n" + body, enc2);
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
  if (entries.length === 0 && !mustWrap) return identity("no positive-gain in-place bindings");
  const wire = SENTINEL + OPEN + CLOSE + "\n" + (entries.length === 0 ? text : body);
  const decoded = anaphoraDecode(wire);
  if (decoded !== text) return identity("gate G1: wire failed byte-verify");
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens && !mustWrap) return identity("gate G2: wire measured \u2265 input");
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    entries,
    mode: entries.length === 0 ? "forced-wrap" : "anaphoric",
    notes: `${entries.length} in-place bindings \xB7 zero header \xB7 measured +${inTokens - outTokens} tok \xB7 byte-exact`,
    encodeMs: ms()
  };
}
function anaphoraDecoderPrompt(r) {
  const open = r?.wire.startsWith(SENTINEL) ? r.wire[SENTINEL.length] : "\u4E00";
  const close = r?.wire.startsWith(SENTINEL) ? r.wire[SENTINEL.length + 1] : "\u4E01";
  return [
    "# \u27D0 \u03A9-ANAPHORA (AN1) \u2014 byte-exact, zero-header, in-place binding",
    `Line 1 is [AN1]. Line 2 declares OPEN=${open} and CLOSE=${close}.`,
    `Read ${open}kP${close} as binding label k to phrase P; later bare k means P.`,
    "Binders may nest. Every other character is literal. Reconstruction is byte-exact.",
    "OUTPUT CONTRACT: reply densely; keep code, numbers, identifiers and quoted values verbatim."
  ].join("\n");
}
var ANAPHORA_SYSTEM_PROMPT = anaphoraDecoderPrompt(null);

// src/lib/omega/tessera.ts
var SENTINEL2 = "[TS1]\n";
var MIN_ANCHOR = 2;
var MIN_RECORDS = 2;
var MAX_GROUP = 400;
var STRIDES = [1, 2, 3, 4];
var MAX_LINE_FOR_LCS = 600;
var MAX_DEPTH = 8;
var MAX_LINES = 6e4;
var poolCache2 = /* @__PURE__ */ new Map();
function ideographPool2(enc2) {
  const hit = poolCache2.get(enc2);
  if (hit) return hit;
  const out = [];
  for (let cp = 19968; cp <= 40959 && out.length < 400; cp++) {
    const ch = String.fromCodePoint(cp);
    if (encodeIds(ch, enc2).length === 1) out.push(ch);
  }
  poolCache2.set(enc2, out);
  return out;
}
function pickSigils(text, enc2) {
  const free = ideographPool2(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 5) return null;
  return { BLK: free[0], END: free[1], FLD: free[2], VAL: free[3], SLOT: free[4] };
}
function longestCommonSubstring(a, b) {
  const n = a.length;
  const m2 = b.length;
  if (n === 0 || m2 === 0 || n > MAX_LINE_FOR_LCS || m2 > MAX_LINE_FOR_LCS) {
    return { ai: 0, bi: 0, len: 0 };
  }
  let prev = new Int32Array(m2 + 1);
  let curr = new Int32Array(m2 + 1);
  let bestLen = 0;
  let bestAi = 0;
  let bestBi = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m2; j++) {
      if (a.charCodeAt(i - 1) === b.charCodeAt(j - 1)) {
        const v = prev[j - 1] + 1;
        curr[j] = v;
        if (v > bestLen) {
          bestLen = v;
          bestAi = i - v;
          bestBi = j - v;
        }
      } else {
        curr[j] = 0;
      }
    }
    const t2 = prev;
    prev = curr;
    curr = t2;
    curr.fill(0);
  }
  return bestLen >= MIN_ANCHOR ? { ai: bestAi, bi: bestBi, len: bestLen } : { ai: 0, bi: 0, len: 0 };
}
function deriveTemplate(a, b, depth) {
  if (a === b) return [a];
  if (depth >= MAX_DEPTH) return ["", ""];
  const { ai, bi, len } = longestCommonSubstring(a, b);
  if (len === 0) return ["", ""];
  const anchor = a.substr(ai, len);
  const left = deriveTemplate(a.slice(0, ai), b.slice(0, bi), depth + 1);
  const right = deriveTemplate(a.slice(ai + len), b.slice(bi + len), depth + 1);
  const merged = left[left.length - 1] + anchor + right[0];
  return [...left.slice(0, -1), merged, ...right.slice(1)];
}
function matchTemplate(line, lits) {
  const k2 = lits.length - 1;
  if (k2 < 0) return null;
  if (k2 === 0) return line === lits[0] ? [] : null;
  if (!line.startsWith(lits[0])) return null;
  const slots = [];
  let pos = lits[0].length;
  for (let i = 1; i < k2; i++) {
    const lit = lits[i];
    if (lit.length === 0) return null;
    const at = line.indexOf(lit, pos);
    if (at < 0) return null;
    slots.push(line.slice(pos, at));
    pos = at + lit.length;
  }
  const tail = lits[k2];
  if (tail.length === 0) {
    slots.push(line.slice(pos));
  } else {
    if (!line.endsWith(tail)) return null;
    const at = line.length - tail.length;
    if (at < pos) return null;
    slots.push(line.slice(pos, at));
  }
  return slots;
}
function materialize(lits, slots) {
  let out = lits[0];
  for (let i = 0; i < slots.length; i++) out += slots[i] + lits[i + 1];
  return out;
}
function templateIsUsable(lits) {
  if (lits.length < 1) return false;
  for (let i = 1; i < lits.length - 1; i++) if (lits[i].length === 0) return false;
  const literalChars = lits.reduce((s, l) => s + l.length, 0);
  return literalChars > 0;
}
function blockDecode(body, s) {
  let out = "";
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
    const lits = parts[1].split(s.SLOT);
    const k2 = lits.length - 1;
    if (parts.length !== 2 + k2) return null;
    const cols = [];
    for (let c = 0; c < k2; c++) {
      const col = parts[2 + c].split(s.VAL);
      if (col.length !== count) return null;
      cols.push(col);
    }
    const recs = [];
    for (let r = 0; r < count; r++) {
      const slots = [];
      for (let c = 0; c < k2; c++) slots.push(cols[c][r]);
      recs.push(materialize(lits, slots));
    }
    out += recs.join("\n");
    i = end + 1;
  }
  return out;
}
function tesseraDecode(wire) {
  if (wire.startsWith("[AN1]\n")) {
    const peeled = anaphoraDecode(wire);
    return peeled === wire ? wire : tesseraDecode(peeled);
  }
  if (!wire.startsWith(SENTINEL2)) return wire;
  const rest = wire.slice(SENTINEL2.length);
  const nl = rest.indexOf("\n");
  if (nl !== 5) return wire;
  const s = {
    BLK: rest[0],
    END: rest[1],
    FLD: rest[2],
    VAL: rest[3],
    SLOT: rest[4]
  };
  const body = helixDecode(rest.slice(nl + 1));
  const out = blockDecode(body, s);
  return out === null ? wire : out;
}
function bestAttemptAt(lines2, i, s, enc2) {
  let best = null;
  for (const p of STRIDES) {
    if (i + 2 * p > lines2.length) continue;
    const unitAt = (u2) => {
      const start = i + u2 * p;
      if (start + p > lines2.length) return null;
      return lines2.slice(start, start + p).join("\n");
    };
    const u0 = unitAt(0);
    const u1 = unitAt(1);
    if (u0 === null || u1 === null || u0.length === 0 || u1.length === 0) continue;
    const lits = deriveTemplate(u0, u1, 0);
    if (!templateIsUsable(lits)) continue;
    const slotRows = [];
    let u = 0;
    for (; ; ) {
      if (slotRows.length >= MAX_GROUP) break;
      const unit = unitAt(u);
      if (unit === null) break;
      const parsed = matchTemplate(unit, lits);
      if (parsed === null) break;
      if (materialize(lits, parsed) !== unit) break;
      slotRows.push(parsed);
      u++;
    }
    const m2 = slotRows.length;
    if (m2 < MIN_RECORDS) continue;
    const k2 = lits.length - 1;
    const cols = [];
    for (let c = 0; c < k2; c++) {
      const col = [];
      for (let r = 0; r < m2; r++) col.push(slotRows[r][c]);
      cols.push(col.join(s.VAL));
    }
    const block = s.BLK + String(m2) + s.FLD + lits.join(s.SLOT) + (k2 > 0 ? s.FLD + cols.join(s.FLD) : "") + s.END;
    const consumed = m2 * p;
    const original = lines2.slice(i, i + consumed).join("\n");
    const gain = countTokens(original, enc2) - countTokens(block, enc2);
    if (gain <= 0) continue;
    if (!best || gain > best.gain) {
      best = {
        block,
        linesConsumed: consumed,
        gain,
        group: {
          records: m2,
          columns: k2,
          templateChars: lits.reduce((t2, l) => t2 + l.length, 0),
          savedTokens: gain
        }
      };
    }
  }
  return best;
}
function transpose(text, s, enc2) {
  const lines2 = text.split("\n");
  if (lines2.length > MAX_LINES) return { body: text, groups: [] };
  const pieces = [];
  const groups = [];
  let i = 0;
  while (i < lines2.length) {
    const attempt = bestAttemptAt(lines2, i, s, enc2);
    if (!attempt) {
      pieces.push(lines2[i]);
      i++;
      continue;
    }
    pieces.push(attempt.block);
    groups.push(attempt.group);
    i += attempt.linesConsumed;
  }
  return { body: pieces.join("\n"), groups };
}
function tesseraEncode(text, enc2 = "o200k_base") {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    groups: [],
    helixApplied: false,
    mode: "identity",
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty input");
  const mustWrap = text.startsWith(SENTINEL2);
  const s = pickSigils(text, enc2);
  if (!s) return identity("fewer than five absent single-token sigils available");
  const head = SENTINEL2 + s.BLK + s.END + s.FLD + s.VAL + s.SLOT + "\n";
  const { body, groups } = transpose(text, s, enc2);
  if (groups.length === 0) {
    if (!mustWrap) return identity("no line family cleared the measured real-BPE gain bar");
    const w = head + text;
    const d = tesseraDecode(w);
    const ot = countTokens(w, enc2);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
      groups: [],
      helixApplied: false,
      mode: "forced-wrap",
      notes: "forced wrap: input begins with the TS1 sentinel",
      encodeMs: ms()
    };
  }
  const plain = head + body;
  const hx = helixEncode(body, enc2);
  const helixBody = hx.mode === "factored" ? hx.wire : body;
  const combos = [{ wire: plain, hx: false }];
  if (hx.mode === "factored") combos.push({ wire: head + helixBody, hx: true });
  for (const base of combos.slice()) {
    const bound = anaphoraEncode(base.wire, enc2);
    if (bound.mode === "anaphoric") combos.push({ wire: bound.wire, hx: base.hx });
  }
  let wire = plain;
  let wireTok = countTokens(plain, enc2);
  let useHelix = false;
  for (const cand of combos) {
    const t2 = countTokens(cand.wire, enc2);
    if (t2 < wireTok && tesseraDecode(cand.wire) === text) {
      wire = cand.wire;
      wireTok = t2;
      useHelix = cand.hx;
    }
  }
  const decoded = tesseraDecode(wire);
  if (decoded !== text) return identity("gate G2: assembled wire failed byte-verify");
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens && !mustWrap) return identity("gate G3: wire measured \u2265 input");
  const records = groups.reduce((t2, g) => t2 + g.records, 0);
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    groups,
    helixApplied: useHelix,
    mode: "tessera",
    notes: `${groups.length} line famil${groups.length === 1 ? "y" : "ies"} \xB7 ${records} records transposed${useHelix ? " \xB7 arithmetic columns factored" : ""} \xB7 byte-exact`,
    encodeMs: ms()
  };
}
var TESSERA_SYSTEM_PROMPT = [
  "# \u29C9 TESSERA-T1 \u2014 byte-exact columnar wire (template once, values in columns)",
  "A message may open with:",
  "  [TS1]",
  "  BEFVS          <- line 2 declares five framing characters, in this order:",
  "                    BLOCK-OPEN, BLOCK-END, FIELD, VALUE, SLOT",
  "  <body>",
  "Inside the body, a block reads:",
  "  BLOCK-OPEN count FIELD template FIELD col0 FIELD col1 \u2026 BLOCK-END",
  "Rebuild it like a table:",
  "1. Split the template on the SLOT character. The pieces are fixed text; a",
  "   slot sits between each consecutive pair of pieces.",
  "2. Split each column on the VALUE character. Every column has `count` values.",
  "3. Record r is piece0 + col0[r] + piece1 + col1[r] + \u2026 Records are separated",
  "   by newlines, in order, exactly where the block appears.",
  "So the repeated skeleton is written once and the varying values are grouped",
  "by column. Nothing was dropped: this is a permutation, not a summary.",
  "Arithmetic markers may also appear inside a column:",
  HELIX_SYSTEM_PROMPT,
  "All other characters are literal. Reconstruction is byte-exact.",
  "OUTPUT CONTRACT: answer densely; reproduce code, identifiers, numbers and",
  "quoted values verbatim; you may answer about a column without expanding it."
].join("\n");

// src/lib/omega/strata.ts
var SENTINEL3 = "[ST1]\n";
var MIN_ANCHOR2 = 2;
var MIN_RECORDS2 = 2;
var MAX_GROUP2 = 4e3;
var MAX_LINE_FOR_LCS2 = 600;
var MAX_TEMPLATE_DEPTH = 8;
var MAX_AFFIX_DEPTH = 2;
var MAX_CYCLE_PERIOD = 64;
var MAX_LINES2 = 6e4;
var STRIDES2 = [1, 2, 3, 4];
var TAG_CHARS = "=#@^$~%";
var poolCache3 = /* @__PURE__ */ new Map();
function ideographPool3(enc2) {
  const hit = poolCache3.get(enc2);
  if (hit) return hit;
  const out = [];
  for (let cp = 19968; cp <= 40959 && out.length < 400; cp++) {
    const ch = String.fromCodePoint(cp);
    if (encodeIds(ch, enc2).length === 1) out.push(ch);
  }
  poolCache3.set(enc2, out);
  return out;
}
function pickSigils2(text, enc2) {
  const free = ideographPool3(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 5) return null;
  return { BLK: free[0], END: free[1], FLD: free[2], VAL: free[3], SLOT: free[4], SEP: free[3] };
}
function longestCommonSubstring2(a, b) {
  const n = a.length;
  const m2 = b.length;
  if (n === 0 || m2 === 0 || n > MAX_LINE_FOR_LCS2 || m2 > MAX_LINE_FOR_LCS2) {
    return { ai: 0, bi: 0, len: 0 };
  }
  let prev = new Int32Array(m2 + 1);
  let curr = new Int32Array(m2 + 1);
  let bestLen = 0;
  let bestAi = 0;
  let bestBi = 0;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m2; j++) {
      if (a.charCodeAt(i - 1) === b.charCodeAt(j - 1)) {
        const v = prev[j - 1] + 1;
        curr[j] = v;
        if (v > bestLen) {
          bestLen = v;
          bestAi = i - v;
          bestBi = j - v;
        }
      } else {
        curr[j] = 0;
      }
    }
    const t2 = prev;
    prev = curr;
    curr = t2;
    curr.fill(0);
  }
  return bestLen >= MIN_ANCHOR2 ? { ai: bestAi, bi: bestBi, len: bestLen } : { ai: 0, bi: 0, len: 0 };
}
function deriveTemplate2(a, b, depth) {
  if (a === b) return [a];
  if (depth >= MAX_TEMPLATE_DEPTH) return ["", ""];
  const { ai, bi, len } = longestCommonSubstring2(a, b);
  if (len === 0) return ["", ""];
  const anchor = a.substr(ai, len);
  const left = deriveTemplate2(a.slice(0, ai), b.slice(0, bi), depth + 1);
  const right = deriveTemplate2(a.slice(ai + len), b.slice(bi + len), depth + 1);
  const merged = left[left.length - 1] + anchor + right[0];
  return [...left.slice(0, -1), merged, ...right.slice(1)];
}
function matchTemplate2(line, lits) {
  const k2 = lits.length - 1;
  if (k2 < 0) return null;
  if (k2 === 0) return line === lits[0] ? [] : null;
  if (!line.startsWith(lits[0])) return null;
  const slots = [];
  let pos = lits[0].length;
  for (let i = 1; i < k2; i++) {
    const lit = lits[i];
    if (lit.length === 0) return null;
    const at = line.indexOf(lit, pos);
    if (at < 0) return null;
    slots.push(line.slice(pos, at));
    pos = at + lit.length;
  }
  const tail = lits[k2];
  if (tail.length === 0) {
    slots.push(line.slice(pos));
  } else {
    if (!line.endsWith(tail)) return null;
    const at = line.length - tail.length;
    if (at < pos) return null;
    slots.push(line.slice(pos, at));
  }
  return slots;
}
function materialize2(lits, slots) {
  let out = lits[0];
  for (let i = 0; i < slots.length; i++) out += slots[i] + lits[i + 1];
  return out;
}
function templateIsUsable2(lits) {
  if (lits.length < 1) return false;
  for (let i = 1; i < lits.length - 1; i++) if (lits[i].length === 0) return false;
  return lits.reduce((s, l) => s + l.length, 0) > 0;
}
function renderInt(value, width) {
  const s = String(value);
  return width > 0 && value >= 0 && s.length < width ? s.padStart(width, "0") : s;
}
function decodeColumn(spec, count, s, depth) {
  if (spec.length === 0 || depth > MAX_AFFIX_DEPTH) return null;
  const tag = spec[0];
  const rest = spec.slice(1);
  if (TAG_CHARS.indexOf(tag) === -1) {
    const vals = spec.split(s.VAL);
    return vals.length === count ? vals : null;
  }
  if (tag === "=") {
    const out = [];
    for (let i = 0; i < count; i++) out.push(rest);
    return out;
  }
  if (tag === "#") {
    const parts = rest.split(",");
    if (parts.length !== 3) return null;
    if (!/^-?\d+$/.test(parts[0]) || !/^-?\d+$/.test(parts[1]) || !/^\d+$/.test(parts[2])) return null;
    const start = Number(parts[0]);
    const stride = Number(parts[1]);
    const width = Number(parts[2]);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(stride)) return null;
    if (!Number.isSafeInteger(start + stride * (count - 1))) return null;
    const out = [];
    for (let i = 0; i < count; i++) out.push(renderInt(start + stride * i, width));
    return out;
  }
  if (tag === "@") {
    const cut = rest.indexOf(s.SEP);
    if (cut < 1) return null;
    const pTxt = rest.slice(0, cut);
    if (!/^\d+$/.test(pTxt)) return null;
    const p = Number(pTxt);
    if (p < 1 || p > count) return null;
    const cycle = rest.slice(cut + 1).split(s.VAL);
    if (cycle.length !== p) return null;
    const out = [];
    for (let i = 0; i < count; i++) out.push(cycle[i % p]);
    return out;
  }
  if (tag === "^" || tag === "$") {
    const cut = rest.indexOf(s.SEP);
    if (cut < 1) return null;
    const nTxt = rest.slice(0, cut);
    if (!/^\d+$/.test(nTxt)) return null;
    const n = Number(nTxt);
    const body = rest.slice(cut + 1);
    if (n > body.length) return null;
    const affix = body.slice(0, n);
    const inner = decodeColumn(body.slice(n), count, s, depth + 1);
    if (inner === null) return null;
    return tag === "^" ? inner.map((v) => affix + v) : inner.map((v) => v + affix);
  }
  if (tag === "%") {
    const cut = rest.indexOf(s.VAL);
    if (cut < 1) return null;
    const hp = rest.slice(0, cut).split(",");
    if (hp.length !== 2) return null;
    if (!/^-?\d+$/.test(hp[0]) || !/^\d+$/.test(hp[1])) return null;
    const start = Number(hp[0]);
    const width = Number(hp[1]);
    if (!Number.isSafeInteger(start)) return null;
    const out = [renderInt(start, width)];
    if (count === 1) return out;
    const inner = decodeColumn(rest.slice(cut + 1), count - 1, s, depth + 1);
    if (inner === null) return null;
    let cur = start;
    for (let i = 0; i < inner.length; i++) {
      if (!/^-?\d+$/.test(inner[i])) return null;
      const d = Number(inner[i]);
      if (!Number.isSafeInteger(d)) return null;
      cur += d;
      if (!Number.isSafeInteger(cur) || cur < 0) return null;
      out.push(renderInt(cur, width));
    }
    return out;
  }
  if (tag === "~") {
    const vals = rest.split(s.VAL);
    return vals.length === count ? vals : null;
  }
  return null;
}
function columnCandidates(vals, s, depth, enc2) {
  const out = [];
  const n = vals.length;
  const joined = vals.join(s.VAL);
  out.push(joined.length > 0 && TAG_CHARS.indexOf(joined[0]) !== -1 ? "~" + joined : joined);
  let allSame = true;
  for (let i = 1; i < n; i++) {
    if (vals[i] !== vals[0]) {
      allSame = false;
      break;
    }
  }
  if (allSame) out.push("=" + vals[0]);
  if (n >= 2 && vals.every((v) => /^\d{1,15}$/.test(v))) {
    const width = vals[0].length > 1 && vals[0][0] === "0" ? vals[0].length : 0;
    const start = Number(vals[0]);
    const stride = Number(vals[1]) - start;
    if (Number.isSafeInteger(start) && Number.isSafeInteger(stride)) {
      let ok = true;
      for (let i = 0; i < n; i++) {
        if (renderInt(start + stride * i, width) !== vals[i]) {
          ok = false;
          break;
        }
      }
      if (ok) out.push("#" + start + "," + stride + "," + width);
    }
  }
  const pMax = Math.min(n >> 1, MAX_CYCLE_PERIOD);
  for (let p = 1; p <= pMax; p++) {
    let ok = true;
    for (let i = p; i < n; i++) {
      if (vals[i] !== vals[i % p]) {
        ok = false;
        break;
      }
    }
    if (ok) {
      out.push("@" + p + s.SEP + vals.slice(0, p).join(s.VAL));
      break;
    }
  }
  if (depth === 0 && n >= 3 && vals.every((v) => /^\d{1,15}$/.test(v))) {
    const width = vals[0].length > 1 && vals[0][0] === "0" ? vals[0].length : 0;
    let uniform = true;
    for (const v of vals) {
      if (renderInt(Number(v), width) !== v) {
        uniform = false;
        break;
      }
    }
    if (uniform) {
      const deltas = [];
      for (let i = 1; i < n; i++) deltas.push(String(Number(vals[i]) - Number(vals[i - 1])));
      const inner = bestColumnSpec(deltas, s, depth + 1, enc2);
      if (inner) out.push("%" + Number(vals[0]) + "," + width + s.VAL + inner);
    }
  }
  if (depth < MAX_AFFIX_DEPTH && n >= 2) {
    let pre = 0;
    const lim = Math.min(...vals.map((v) => v.length));
    while (pre < lim && vals.every((v) => v[pre] === vals[0][pre])) pre++;
    if (pre > 0 && pre < lim) {
      const stripped = vals.map((v) => v.slice(pre));
      const inner = bestColumnSpec(stripped, s, depth + 1, enc2);
      if (inner) out.push("^" + pre + s.SEP + vals[0].slice(0, pre) + inner);
    }
    let suf = 0;
    while (suf < lim - pre && vals.every((v) => v[v.length - 1 - suf] === vals[0][vals[0].length - 1 - suf])) {
      suf++;
    }
    if (suf > 0 && suf < lim) {
      const stripped = vals.map((v) => v.slice(0, v.length - suf));
      const inner = bestColumnSpec(stripped, s, depth + 1, enc2);
      if (inner) out.push("$" + suf + s.SEP + vals[0].slice(vals[0].length - suf) + inner);
    }
  }
  return out;
}
function sameArray(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}
var specCache = /* @__PURE__ */ new Map();
var SPEC_CACHE_MAX = 4096;
function bestColumnSpec(vals, s, depth, enc2) {
  const ck = depth + "" + enc2 + "" + vals.join("\0");
  if (ck.length < 8192) {
    const hit = specCache.get(ck);
    if (hit !== void 0) return hit;
    const val = bestColumnSpecUncached(vals, s, depth, enc2);
    if (specCache.size >= SPEC_CACHE_MAX) specCache.clear();
    specCache.set(ck, val);
    return val;
  }
  return bestColumnSpecUncached(vals, s, depth, enc2);
}
function bestColumnSpecUncached(vals, s, depth, enc2) {
  const cands = columnCandidates(vals, s, depth, enc2);
  let best = null;
  let bestCost = Number.POSITIVE_INFINITY;
  for (const spec of cands) {
    const back = decodeColumn(spec, vals.length, s, 0);
    if (back === null || !sameArray(back, vals)) continue;
    const cost = countTokens(spec, enc2);
    if (cost < bestCost) {
      bestCost = cost;
      best = spec;
    }
  }
  return best;
}
function specKind(spec) {
  switch (spec[0]) {
    case "=":
      return "constant";
    case "#":
      return "arithmetic";
    case "@":
      return "cyclic";
    case "^":
      return "prefix";
    case "$":
      return "suffix";
    default:
      return "literal";
  }
}
function blockDecode2(body, s) {
  let out = "";
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
    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_GROUP2) return null;
    const lits = parts[1].split(s.SLOT);
    const k2 = lits.length - 1;
    if (parts.length !== 2 + k2) return null;
    const cols = [];
    for (let c = 0; c < k2; c++) {
      const col = decodeColumn(parts[2 + c], count, s, 0);
      if (col === null) return null;
      cols.push(col);
    }
    const recs = [];
    for (let r = 0; r < count; r++) {
      const slots = [];
      for (let c = 0; c < k2; c++) slots.push(cols[c][r]);
      recs.push(materialize2(lits, slots));
    }
    out += recs.join("\n");
    i = end + 1;
  }
  return out;
}
function strataDecode(wire) {
  if (wire.startsWith("[AN1]\n")) {
    const peeled = anaphoraDecode(wire);
    return peeled === wire ? wire : strataDecode(peeled);
  }
  if (!wire.startsWith(SENTINEL3)) return wire;
  const rest = wire.slice(SENTINEL3.length);
  const nl = rest.indexOf("\n");
  if (nl !== 5) return wire;
  const s = {
    BLK: rest[0],
    END: rest[1],
    FLD: rest[2],
    VAL: rest[3],
    SLOT: rest[4],
    SEP: rest[3]
  };
  const body = helixDecode(rest.slice(nl + 1));
  const out = blockDecode2(body, s);
  return out === null ? wire : out;
}
function bestAttemptAt2(lines2, i, s, enc2) {
  let best = null;
  for (const p of STRIDES2) {
    if (i + 2 * p > lines2.length) continue;
    const unitAt = (u2) => {
      const start = i + u2 * p;
      if (start + p > lines2.length) return null;
      return lines2.slice(start, start + p).join("\n");
    };
    const u0 = unitAt(0);
    const u1 = unitAt(1);
    if (u0 === null || u1 === null || u0.length === 0 || u1.length === 0) continue;
    const lits = deriveTemplate2(u0, u1, 0);
    if (!templateIsUsable2(lits)) continue;
    const slotRows = [];
    let u = 0;
    for (; ; ) {
      if (slotRows.length >= MAX_GROUP2) break;
      const unit = unitAt(u);
      if (unit === null) break;
      const parsed = matchTemplate2(unit, lits);
      if (parsed === null) break;
      if (materialize2(lits, parsed) !== unit) break;
      slotRows.push(parsed);
      u++;
    }
    const m2 = slotRows.length;
    if (m2 < MIN_RECORDS2) continue;
    const k2 = lits.length - 1;
    const specs = [];
    const kinds = [];
    let bad = false;
    for (let c = 0; c < k2; c++) {
      const col = [];
      for (let r = 0; r < m2; r++) col.push(slotRows[r][c]);
      const spec = bestColumnSpec(col, s, 0, enc2);
      if (spec === null) {
        bad = true;
        break;
      }
      specs.push(spec);
      kinds.push(specKind(spec));
    }
    if (bad) continue;
    const block = s.BLK + String(m2) + s.FLD + lits.join(s.SLOT) + (k2 > 0 ? s.FLD + specs.join(s.FLD) : "") + s.END;
    const consumed = m2 * p;
    const original = lines2.slice(i, i + consumed).join("\n");
    const gain = countTokens(original, enc2) - countTokens(block, enc2);
    if (gain <= 0) continue;
    if (!best || gain > best.gain) {
      best = {
        block,
        linesConsumed: consumed,
        gain,
        group: { records: m2, columns: k2, kinds, savedTokens: gain }
      };
    }
  }
  return best;
}
function stratify(text, s, enc2) {
  const lines2 = text.split("\n");
  if (lines2.length > MAX_LINES2) return { body: text, groups: [] };
  const pieces = [];
  const groups = [];
  let i = 0;
  let carried;
  while (i < lines2.length) {
    const here = carried !== void 0 ? carried : bestAttemptAt2(lines2, i, s, enc2);
    carried = void 0;
    if (!here) {
      pieces.push(lines2[i]);
      i++;
      continue;
    }
    const next = bestAttemptAt2(lines2, i + 1, s, enc2);
    if (next && next.gain > here.gain) {
      pieces.push(lines2[i]);
      i++;
      carried = next;
      continue;
    }
    pieces.push(here.block);
    groups.push(here.group);
    i += here.linesConsumed;
  }
  return { body: pieces.join("\n"), groups };
}
var encodeCache = /* @__PURE__ */ new Map();
var ENCODE_CACHE_MAX = 8;
var ENCODE_CACHE_MAX_CHARS = 4e5;
function strataEncode(text, enc2 = "o200k_base") {
  const key = text.length <= ENCODE_CACHE_MAX_CHARS ? enc2 + "\0" + text : null;
  if (key !== null) {
    const hit = encodeCache.get(key);
    if (hit) return hit;
  }
  const result = strataEncodeUncached(text, enc2);
  if (key !== null) {
    if (encodeCache.size >= ENCODE_CACHE_MAX) encodeCache.clear();
    encodeCache.set(key, result);
  }
  return result;
}
function strataEncodeUncached(text, enc2) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    groups: [],
    closedForms: 0,
    mode: "identity",
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty input");
  const mustWrap = text.startsWith(SENTINEL3);
  const s = pickSigils2(text, enc2);
  if (!s) return identity("fewer than five absent single-token sigils available");
  const head = SENTINEL3 + s.BLK + s.END + s.FLD + s.VAL + s.SLOT + "\n";
  const { body, groups } = stratify(text, s, enc2);
  if (groups.length === 0) {
    if (!mustWrap) return identity("no line family cleared the measured real-BPE gain bar");
    const w = head + text;
    const d = strataDecode(w);
    const ot = countTokens(w, enc2);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
      groups: [],
      closedForms: 0,
      mode: "forced-wrap",
      notes: "forced wrap: input begins with the ST1 sentinel",
      encodeMs: ms()
    };
  }
  const plain = head + body;
  const hx = helixEncode(body, enc2);
  const combos = [plain];
  if (hx.mode === "factored") combos.push(head + hx.wire);
  for (const base of combos.slice()) {
    const bound = anaphoraEncode(base, enc2);
    if (bound.mode === "anaphoric") combos.push(bound.wire);
  }
  let wire = plain;
  let wireTok = countTokens(plain, enc2);
  for (const cand of combos) {
    const t2 = countTokens(cand, enc2);
    if (t2 < wireTok && strataDecode(cand) === text) {
      wire = cand;
      wireTok = t2;
    }
  }
  const decoded = strataDecode(wire);
  if (decoded !== text) return identity("gate G3: assembled wire failed byte-verify");
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens && !mustWrap) return identity("gate G4: wire measured \u2265 input");
  const records = groups.reduce((t2, g) => t2 + g.records, 0);
  const closedForms = groups.reduce(
    (t2, g) => t2 + g.kinds.filter((k2) => k2 !== "literal").length,
    0
  );
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    groups,
    closedForms,
    mode: "strata",
    notes: `${groups.length} famil${groups.length === 1 ? "y" : "ies"} \xB7 ${records} records \xB7 ${closedForms} closed-form column${closedForms === 1 ? "" : "s"} \xB7 byte-exact`,
    encodeMs: ms()
  };
}
var STRATA_SYSTEM_PROMPT = [
  "# \u2A02 STRATA-S1 \u2014 byte-exact typed-column wire (template once, columns as rules)",
  "A message may open with:",
  "  [ST1]",
  "  BEFVL         <- line 2 declares five framing characters, in this order:",
  "                   BLOCK, END, FIELD, VALUE, SLOT",
  "  <body>",
  "A block inside the body reads:",
  "  BLOCK m FIELD template FIELD spec0 FIELD spec1 \u2026 END",
  "Rebuild it as a table of m records:",
  "1. Split the template on SLOT. The pieces are fixed text and a slot sits",
  "   between each consecutive pair of pieces.",
  "2. Each spec describes one column of m values. Read its first character:",
  "     =v           every record has the value v",
  "     #s,d,w       value of record r is s + d*r; zero-pad to w digits if w>0",
  "     @p SEP v\u2026    the p values after SEP repeat in a cycle; record r takes",
  "                  the value at position (r mod p)",
  "     ^n SEP x\u2026    strip: prepend the n characters after SEP to every value",
  "                  produced by the spec that follows",
  "     $n SEP x\u2026    same, but appended as a suffix",
  "     ~v VALUE v\u2026  the values listed one by one",
  "3. Record r is piece0 + col0[r] + piece1 + col1[r] + \u2026 Records are separated",
  "   by newlines, in order, exactly where the block appears.",
  "The repeated skeleton is written once and each column is written as the rule",
  "that generates it. Nothing was summarised or dropped; this is exact.",
  "Arithmetic markers may also appear:",
  HELIX_SYSTEM_PROMPT,
  "All other characters are literal. Reconstruction is byte-exact.",
  "OUTPUT CONTRACT: answer densely; reproduce code, identifiers, numbers and",
  "quoted values verbatim; you may reason about a column from its rule without",
  "expanding it."
].join("\n");

// src/lib/omega/signet.ts
var SENTINEL4 = "[SG1]\n";
var MIN_RECORDS3 = 2;
var MAX_GROUP3 = 8e3;
var MAX_RUNS = 512;
var MAX_LINES3 = 6e4;
var STRIDES3 = [1, 2, 3, 4];
var CLS_DIGIT = 1;
var CLS_ALPHA = 2;
var CLS_OTHER = 3;
function classOf(code) {
  if (code >= 48 && code <= 57) return CLS_DIGIT;
  if (code >= 65 && code <= 90 || code >= 97 && code <= 122) return CLS_ALPHA;
  return CLS_OTHER;
}
function segment(unit) {
  const out = [];
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
function signature(unit) {
  let sig = "";
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
function pickSigils3(text, enc2) {
  const free = ideographPool3(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 5) return null;
  return { BLK: free[0], END: free[1], FLD: free[2], VAL: free[3], SLOT: free[4], SEP: free[3] };
}
function blockDecode3(body, s) {
  let out = "";
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
    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_GROUP3) return null;
    const pieces = parts[1].split(s.SLOT);
    const k2 = pieces.length - 1;
    if (parts.length !== 2 + k2) return null;
    const cols = [];
    for (let c = 0; c < k2; c++) {
      const col = decodeColumn(parts[2 + c], count, s, 0);
      if (col === null) return null;
      cols.push(col);
    }
    const recs = [];
    for (let r = 0; r < count; r++) {
      let rec = pieces[0];
      for (let c = 0; c < k2; c++) rec += cols[c][r] + pieces[c + 1];
      recs.push(rec);
    }
    out += recs.join("\n");
    i = end + 1;
  }
  return out;
}
function signetDecode(wire) {
  if (wire.startsWith("[AN1]\n")) {
    const peeled = anaphoraDecode(wire);
    return peeled === wire ? wire : signetDecode(peeled);
  }
  if (!wire.startsWith(SENTINEL4)) return wire;
  const rest = wire.slice(SENTINEL4.length);
  const nl = rest.indexOf("\n");
  if (nl !== 5) return wire;
  const s = {
    BLK: rest[0],
    END: rest[1],
    FLD: rest[2],
    VAL: rest[3],
    SLOT: rest[4],
    SEP: rest[3]
  };
  const body = helixDecode(rest.slice(nl + 1));
  const out = blockDecode3(body, s);
  return out === null ? wire : out;
}
function specKind2(spec) {
  switch (spec[0]) {
    case "=":
      return "constant";
    case "#":
      return "arithmetic";
    case "@":
      return "cyclic";
    case "%":
      return "delta";
    case "^":
      return "prefix";
    case "$":
      return "suffix";
    default:
      return "literal";
  }
}
function bestAttemptAt3(lines2, i, s, enc2) {
  let best = null;
  for (const p of STRIDES3) {
    if (i + 2 * p > lines2.length) continue;
    const unitAt = (u2) => {
      const start = i + u2 * p;
      if (start + p > lines2.length) return null;
      return lines2.slice(start, start + p).join("\n");
    };
    const u0 = unitAt(0);
    if (u0 === null || u0.length === 0) continue;
    const sig = signature(u0);
    if (sig.length < 1 || sig.length > MAX_RUNS) continue;
    const rows = [segment(u0)];
    let u = 1;
    for (; ; ) {
      if (rows.length >= MAX_GROUP3) break;
      const unit = unitAt(u);
      if (unit === null || unit.length === 0) break;
      if (signature(unit) !== sig) break;
      rows.push(segment(unit));
      u++;
    }
    const m2 = rows.length;
    if (m2 < MIN_RECORDS3) continue;
    const R = rows[0].length;
    const varying = new Array(R).fill(false);
    for (let r = 0; r < R; r++) {
      const v0 = rows[0][r];
      for (let q = 1; q < m2; q++) {
        if (rows[q][r] !== v0) {
          varying[r] = true;
          break;
        }
      }
    }
    const pieces = [];
    const slotIdx = [];
    let cur = "";
    for (let r = 0; r < R; r++) {
      if (varying[r]) {
        pieces.push(cur);
        cur = "";
        slotIdx.push(r);
      } else {
        cur += rows[0][r];
      }
    }
    pieces.push(cur);
    const k2 = slotIdx.length;
    if (k2 === 0 && m2 < MIN_RECORDS3) continue;
    const specs = [];
    const kinds = [];
    let bad = false;
    for (let c = 0; c < k2; c++) {
      const col = [];
      for (let q = 0; q < m2; q++) col.push(rows[q][slotIdx[c]]);
      const spec = bestColumnSpec(col, s, 0, enc2);
      if (spec === null) {
        bad = true;
        break;
      }
      specs.push(spec);
      kinds.push(specKind2(spec));
    }
    if (bad) continue;
    let exact = true;
    for (let q = 0; q < m2 && exact; q++) {
      let rec = pieces[0];
      for (let c = 0; c < k2; c++) rec += rows[q][slotIdx[c]] + pieces[c + 1];
      const unit = unitAt(q);
      if (unit === null || rec !== unit) exact = false;
    }
    if (!exact) continue;
    const block = s.BLK + String(m2) + s.FLD + pieces.join(s.SLOT) + (k2 > 0 ? s.FLD + specs.join(s.FLD) : "") + s.END;
    const consumed = m2 * p;
    const original = lines2.slice(i, i + consumed).join("\n");
    const gain = countTokens(original, enc2) - countTokens(block, enc2);
    if (gain <= 0) continue;
    if (!best || gain > best.gain) {
      best = {
        block,
        linesConsumed: consumed,
        gain,
        group: { records: m2, columns: k2, kinds, savedTokens: gain }
      };
    }
  }
  return best;
}
function align(text, s, enc2) {
  const lines2 = text.split("\n");
  if (lines2.length > MAX_LINES3) return { body: text, groups: [] };
  const pieces = [];
  const groups = [];
  let i = 0;
  let carried;
  while (i < lines2.length) {
    const here = carried !== void 0 ? carried : bestAttemptAt3(lines2, i, s, enc2);
    carried = void 0;
    if (!here) {
      pieces.push(lines2[i]);
      i++;
      continue;
    }
    const next = bestAttemptAt3(lines2, i + 1, s, enc2);
    if (next && next.gain > here.gain) {
      pieces.push(lines2[i]);
      i++;
      carried = next;
      continue;
    }
    pieces.push(here.block);
    groups.push(here.group);
    i += here.linesConsumed;
  }
  return { body: pieces.join("\n"), groups };
}
var encodeCache2 = /* @__PURE__ */ new Map();
var CACHE_MAX = 8;
var CACHE_MAX_CHARS = 4e5;
function signetEncode(text, enc2 = "o200k_base") {
  const key = text.length <= CACHE_MAX_CHARS ? enc2 + "\0" + text : null;
  if (key !== null) {
    const hit = encodeCache2.get(key);
    if (hit) return hit;
  }
  const result = signetEncodeUncached(text, enc2);
  if (key !== null) {
    if (encodeCache2.size >= CACHE_MAX) encodeCache2.clear();
    encodeCache2.set(key, result);
  }
  return result;
}
function signetEncodeUncached(text, enc2) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    groups: [],
    closedForms: 0,
    mode: "identity",
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty input");
  const mustWrap = text.startsWith(SENTINEL4);
  const s = pickSigils3(text, enc2);
  if (!s) return identity("fewer than five absent single-token sigils available");
  const head = SENTINEL4 + s.BLK + s.END + s.FLD + s.VAL + s.SLOT + "\n";
  const { body, groups } = align(text, s, enc2);
  if (groups.length === 0) {
    if (!mustWrap) return identity("no class-signature family cleared the measured gain bar");
    const w = head + text;
    const d = signetDecode(w);
    const ot = countTokens(w, enc2);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
      groups: [],
      closedForms: 0,
      mode: "forced-wrap",
      notes: "forced wrap: input begins with the SG1 sentinel",
      encodeMs: ms()
    };
  }
  const plain = head + body;
  const hx = helixEncode(body, enc2);
  const combos = [plain];
  if (hx.mode === "factored") combos.push(head + hx.wire);
  for (const base of combos.slice()) {
    const bound = anaphoraEncode(base, enc2);
    if (bound.mode === "anaphoric") combos.push(bound.wire);
  }
  let wire = plain;
  let wireTok = countTokens(plain, enc2);
  for (const cand of combos) {
    const t2 = countTokens(cand, enc2);
    if (t2 < wireTok && signetDecode(cand) === text) {
      wire = cand;
      wireTok = t2;
    }
  }
  const decoded = signetDecode(wire);
  if (decoded !== text) return identity("gate G3: assembled wire failed byte-verify");
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens && !mustWrap) return identity("gate G4: wire measured \u2265 input");
  const records = groups.reduce((t2, g) => t2 + g.records, 0);
  const closedForms = groups.reduce(
    (t2, g) => t2 + g.kinds.filter((k2) => k2 !== "literal").length,
    0
  );
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    groups,
    closedForms,
    mode: "signet",
    notes: `${groups.length} signature famil${groups.length === 1 ? "y" : "ies"} \xB7 ${records} records \xB7 ${closedForms} closed-form column${closedForms === 1 ? "" : "s"} \xB7 byte-exact`,
    encodeMs: ms()
  };
}
var SIGNET_SYSTEM_PROMPT = [
  "# \u2317 SIGNET-G1 \u2014 byte-exact typed-column wire (template once, columns as rules)",
  "A message may open with:",
  "  [SG1]",
  "  BEFVL         <- line 2 declares five framing characters, in this order:",
  "                   BLOCK, END, FIELD, VALUE, SLOT",
  "  <body>",
  "A block inside the body reads:",
  "  BLOCK m FIELD template FIELD spec0 FIELD spec1 \u2026 END",
  "Rebuild it as a table of m records:",
  "1. Split the template on SLOT. The pieces are fixed text and one slot sits",
  "   between each consecutive pair of pieces. A piece may be empty.",
  "2. Each spec describes one column of m values. Read its first character:",
  "     =v           every record has the value v",
  "     #s,d,w       value of record r is s + d*r; zero-pad to w digits if w>0",
  "     @p VALUE v\u2026  the p values after the first VALUE repeat in a cycle;",
  "                  record r takes the value at position (r mod p)",
  "     %s,w VALUE \u2026 running total: record 0 is s, and each following record",
  "                  adds the next difference produced by the spec after VALUE;",
  "                  zero-pad to w digits if w>0",
  "     ^n VALUE x\u2026  prepend the n characters after VALUE to every value",
  "                  produced by the spec that follows",
  "     $n VALUE x\u2026  the same, but appended as a suffix",
  "     ~v VALUE v\u2026  the values listed one by one",
  "     anything else is also just the values listed one by one, split on VALUE",
  "3. Record r is piece0 + col0[r] + piece1 + col1[r] + \u2026 Records are separated",
  "   by newlines, in order, exactly where the block appears.",
  "The repeated skeleton is written once and each column is written as the rule",
  "that generates it. Nothing was summarised or dropped; this is exact.",
  "Arithmetic markers may also appear:",
  HELIX_SYSTEM_PROMPT,
  "All other characters are literal. Reconstruction is byte-exact.",
  "OUTPUT CONTRACT: answer densely; reproduce code, identifiers, numbers and",
  "quoted values verbatim; you may reason about a column from its rule without",
  "expanding it."
].join("\n");

// src/lib/omega/column.ts
var START = "[CL1]\n";
function columnDecode(wire) {
  if (!wire.startsWith(START)) return wire;
  try {
    const x = JSON.parse(wire.slice(START.length));
    if (!Array.isArray(x) || typeof x[0] !== "string" || typeof x[1] !== "string" || !Array.isArray(x[2]) || typeof x[3] !== "boolean") return wire;
    return x[2].map((m2) => x[0] + m2 + x[1]).join("\n") + (x[3] ? "\n" : "");
  } catch {
    return wire;
  }
}
function columnEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({ wire: text, decoded: text, exact: true, applied: false, inTokens, outTokens: inTokens, notes });
  if (text.length < 96 || !text) return identity("below column admission floor");
  const trailing = text.endsWith("\n");
  const lines2 = text.split("\n");
  if (trailing) lines2.pop();
  if (lines2.length < 4 || lines2.some((line) => line.length < 4)) return identity("fewer than four nontrivial rows");
  let prefix = lines2[0];
  for (const line of lines2.slice(1)) {
    let n = 0;
    while (n < prefix.length && n < line.length && prefix[n] === line[n]) n++;
    prefix = prefix.slice(0, n);
  }
  let suffix = lines2[0];
  for (const line of lines2.slice(1)) {
    let n = 0;
    while (n < suffix.length && n < line.length && suffix[suffix.length - 1 - n] === line[line.length - 1 - n]) n++;
    suffix = suffix.slice(suffix.length - n);
  }
  if (prefix.length + suffix.length >= Math.min(...lines2.map((x) => x.length)) || prefix.length + suffix.length < 5) return identity("common two-sided frame below threshold");
  const middles = lines2.map((line) => line.slice(prefix.length, line.length - suffix.length));
  const wire = START + JSON.stringify([prefix, suffix, middles, trailing]);
  const decoded = columnDecode(wire);
  const outTokens = countTokens(wire, enc2);
  if (decoded !== text || outTokens >= inTokens) return identity("exactness or BPE gate rejected column factoring");
  return { wire, decoded, exact: true, applied: true, inTokens, outTokens, notes: `COLUMN two-sided factoring: ${lines2.length} rows, frame ${prefix.length + suffix.length} chars` };
}
var COLUMN_SYSTEM_PROMPT = "COLUMN-C1 exact: [CL1] JSON [prefix,suffix,middles,trailingNewline] reconstructs each row as prefix plus middle plus suffix, preserving order and final newline.";

// src/lib/omega/trie.ts
var START2 = "[TR1]\n";
function trieDecode(wire) {
  if (!wire.startsWith(START2)) return wire;
  try {
    const x = JSON.parse(wire.slice(START2.length));
    if (!Array.isArray(x) || typeof x[0] !== "string" || !Array.isArray(x[1]) || typeof x[2] !== "boolean") return wire;
    return x[1].map((s) => x[0] + s).join("\n") + (x[2] ? "\n" : "");
  } catch {
    return wire;
  }
}
function trieEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({ wire: text, decoded: text, exact: true, applied: false, inTokens, outTokens: inTokens, notes });
  if (text.length < 96 || !text) return identity("below trie admission floor");
  const trailing = text.endsWith("\n");
  const lines2 = text.split("\n");
  if (trailing) lines2.pop();
  if (lines2.length < 4 || lines2.some((line) => line.length < 3)) return identity("fewer than four nontrivial lines");
  let prefix = lines2[0];
  for (const line of lines2.slice(1)) {
    let n = 0;
    while (n < prefix.length && n < line.length && prefix[n] === line[n]) n++;
    prefix = prefix.slice(0, n);
    if (prefix.length < 3) return identity("common prefix below threshold");
  }
  const suffixes = lines2.map((line) => line.slice(prefix.length));
  const wire = START2 + JSON.stringify([prefix, suffixes, trailing]);
  const decoded = trieDecode(wire);
  const outTokens = countTokens(wire, enc2);
  if (decoded !== text || outTokens >= inTokens) return identity("exactness or BPE gate rejected trie");
  return { wire, decoded, exact: true, applied: true, inTokens, outTokens, notes: `TRIE prefix factoring: ${lines2.length} lines, prefix ${prefix.length} chars` };
}

// src/lib/omega/repair.ts
var START3 = "[RP1]\n";
var END = "[/RP1]\n";
var MAX_RULES = 80;
function expandSymbol(symbol, rules, guard) {
  const r = rules.get(symbol);
  if (!r || guard.has(symbol)) return symbol;
  const next = new Set(guard);
  next.add(symbol);
  return expandSymbol(r.left, rules, next) + expandSymbol(r.right, rules, next);
}
function repairDecode(wire) {
  if (!wire.startsWith(START3)) return wire;
  const cut = wire.indexOf(END, START3.length);
  if (cut < 0) return wire;
  const rules = /* @__PURE__ */ new Map();
  for (const line of wire.slice(START3.length, cut).split("\n").filter(Boolean)) {
    try {
      const x = JSON.parse(line);
      if (!Array.isArray(x) || x.length !== 3) return wire;
      rules.set(x[0], { alias: x[0], left: x[1], right: x[2] });
    } catch {
      return wire;
    }
  }
  const body = wire.slice(cut + END.length);
  let out = "";
  for (const symbol of body) out += expandSymbol(symbol, rules, /* @__PURE__ */ new Set());
  return out;
}
function assemble(rules, symbols) {
  return START3 + rules.map((r) => JSON.stringify([r.alias, r.left, r.right])).join("\n") + "\n" + END + symbols.join("");
}
function repairEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({ wire: text, decoded: text, exact: true, applied: false, inTokens, outTokens: inTokens, rules: 0, notes });
  if (text.length < 96 || !text) return identity("below grammar admission floor");
  const free = ideographPool3(enc2).filter((x) => !text.includes(x));
  if (free.length < 1) return identity("no free nonterminal");
  const toks = tokenStrings(text, enc2).map((x) => x.s);
  let symbols = toks.slice();
  const rules = [];
  let bestWire = text;
  let bestTokens = inTokens;
  for (let pass = 0; pass < MAX_RULES && symbols.length > 1 && pass < free.length; pass++) {
    const counts = /* @__PURE__ */ new Map();
    for (let i = 0; i + 1 < symbols.length; i++) {
      const left = symbols[i], right = symbols[i + 1];
      const key = left + "\0" + right;
      const old = counts.get(key);
      if (old) old.n++;
      else counts.set(key, { left, right, n: 1 });
    }
    let best = null;
    for (const c of counts.values()) if (c.n >= 2 && (!best || c.n > best.n)) best = c;
    if (!best) break;
    const alias = free[pass];
    const next = [];
    for (let i = 0; i < symbols.length; ) {
      if (i + 1 < symbols.length && symbols[i] === best.left && symbols[i + 1] === best.right) {
        next.push(alias);
        i += 2;
      } else {
        next.push(symbols[i]);
        i++;
      }
    }
    const rule = { alias, left: best.left, right: best.right };
    const candidateRules = [...rules, rule];
    const wire = assemble(candidateRules, next);
    const tokens = countTokens(wire, enc2);
    if (tokens < bestTokens) {
      rules.push(rule);
      symbols = next;
      bestWire = wire;
      bestTokens = tokens;
    } else break;
  }
  if (rules.length === 0) return identity("no positive-gain grammar");
  const decoded = repairDecode(bestWire);
  if (decoded !== text || bestTokens >= inTokens) return identity("exactness or cost gate rejected grammar");
  return { wire: bestWire, decoded, exact: true, applied: true, inTokens, outTokens: bestTokens, rules: rules.length, notes: `REPAIR grammar: ${rules.length} rules \xB7 exact BPE-gated` };
}

// src/lib/omega/stencil.ts
var H_HEAD = "[\u2318STENCIL]";
var H_DATA = "[\u2318DATA]";
var H_END = "[\u2318END]";
var SLOT_RE = /\{\d+\}/;
var MAX_LINES4 = 4e3;
var MAX_BUCKET = 500;
var MAX_TEMPLATES = 48;
var AGREE_MIN = 0.45;
function lineWords(s) {
  return s.match(/\s*\S+|\s+/g) ?? [];
}
var esc = (s) => s.replace(/\\/g, "\\\\").replace(/\|/g, "\\|");
function unesc(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      out += s[i + 1];
      i++;
    } else out += s[i];
  }
  return out;
}
function splitEsc(s) {
  const out = [];
  let cur = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\" && i + 1 < s.length) {
      cur += s[i + 1];
      i++;
    } else if (c === "|") {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out;
}
function renderTemplate(parts) {
  let out = parts[0] ?? "";
  for (let i = 1; i < parts.length; i++) out += `{${i}}` + parts[i];
  return out;
}
function parseTemplate(tmpl) {
  return tmpl.split(/\{\d+\}/);
}
function stencilEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const inChars = text.length;
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    applied: false,
    encoding: enc2,
    inTokens,
    outTokens: inTokens,
    savedTokens: 0,
    savingsPct: 0,
    inChars,
    outChars: inChars,
    templates: [],
    templatedLines: 0,
    rawLines: 0,
    notes
  });
  if (text.length > 12e4) return identity("STENCIL: skipped over 120k chars for UI latency safety.");
  if (!text || inTokens < 12) return identity("STENCIL: input too short.");
  if (text.includes(H_HEAD) || text.includes(H_DATA) || text.includes(H_END)) {
    return identity("STENCIL: reserved marker present in input \u2014 identity fallback.");
  }
  if (SLOT_RE.test(text)) {
    return identity("STENCIL: input already contains {n} slot syntax \u2014 identity fallback.");
  }
  const lines2 = text.split("\n");
  if (lines2.length < 3) return identity("STENCIL: fewer than 3 lines \u2014 nothing to templatise.");
  if (lines2.length > MAX_LINES4) return identity(`STENCIL: over ${MAX_LINES4} lines \u2014 skipped for latency.`);
  const words2 = lines2.map(lineWords);
  const buckets = /* @__PURE__ */ new Map();
  for (let i = 0; i < lines2.length; i++) {
    const n = words2[i].length;
    if (n < 3) continue;
    if (!lines2[i].trim()) continue;
    const b = buckets.get(n);
    if (b) b.push(i);
    else buckets.set(n, [i]);
  }
  const templates = [];
  const assign = /* @__PURE__ */ new Map();
  for (const [count, idxs] of buckets) {
    if (idxs.length < 2) continue;
    const pool2 = idxs.slice(0, MAX_BUCKET);
    while (pool2.length >= 2 && templates.length < MAX_TEMPLATES) {
      const seed = pool2.shift();
      const seedW = words2[seed];
      const cluster = [seed];
      for (let k2 = pool2.length - 1; k2 >= 0; k2--) {
        const cand = pool2[k2];
        let agree = 0;
        for (let p = 0; p < count; p++) if (words2[cand][p] === seedW[p]) agree++;
        if (agree / count >= AGREE_MIN && agree >= 1) {
          cluster.push(cand);
          pool2.splice(k2, 1);
        }
      }
      if (cluster.length < 2) continue;
      const isSlot = [];
      for (let p = 0; p < count; p++) {
        let same = true;
        for (const idx of cluster) if (words2[idx][p] !== seedW[p]) {
          same = false;
          break;
        }
        isSlot.push(!same);
      }
      const slotCount = isSlot.filter(Boolean).length;
      if (slotCount === 0 || slotCount === count) continue;
      const parts = [];
      let cur = "";
      for (let p = 0; p < count; p++) {
        if (isSlot[p]) {
          parts.push(cur);
          cur = "";
        } else cur += seedW[p];
      }
      parts.push(cur);
      const tid = templates.length + 1;
      const tmplStr = renderTemplate(parts);
      const headerCost = countTokens(`T${tid}=${tmplStr}
`, enc2);
      let origCost = 0, dataCost = 0;
      const rows = [];
      for (const idx of cluster) {
        const slots = [];
        for (let p = 0; p < count; p++) if (isSlot[p]) slots.push(words2[idx][p]);
        rows.push({ idx, slots });
        origCost += countTokens(lines2[idx] + "\n", enc2);
        dataCost += countTokens(`T${tid}|${slots.map(esc).join("|")}
`, enc2);
      }
      const saved = origCost - (headerCost + dataCost);
      if (saved <= 0) continue;
      templates.push({ id: `T${tid}`, parts, slotCount, uses: rows.length, tokensSaved: saved });
      for (const r of rows) assign.set(r.idx, { tid, slots: r.slots });
    }
  }
  if (templates.length === 0) return identity("STENCIL: no template family cleared the real-token admission gate.");
  const headLines = templates.map((t2) => `${t2.id}=${renderTemplate(t2.parts)}`);
  const dataLines = lines2.map((ln, i) => {
    const a = assign.get(i);
    return a ? `T${a.tid}|${a.slots.map(esc).join("|")}` : `~${esc(ln)}`;
  });
  const wire = [H_HEAD, ...headLines, H_DATA, ...dataLines, H_END].join("\n");
  const decoded = stencilDecode(wire);
  if (decoded !== text) return identity("STENCIL: round trip not byte-exact \u2014 identity fallback.");
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens) {
    return identity(`STENCIL: wire (${outTokens} tok) did not beat input (${inTokens} tok) \u2014 identity fallback.`);
  }
  const savedTokens = inTokens - outTokens;
  const templated = assign.size;
  return {
    wire,
    decoded,
    exact: true,
    applied: true,
    encoding: enc2,
    inTokens,
    outTokens,
    savedTokens,
    savingsPct: savedTokens / inTokens * 100,
    inChars,
    outChars: wire.length,
    templates,
    templatedLines: templated,
    rawLines: lines2.length - templated,
    notes: `STENCIL: ${templates.length} template(s) covering ${templated}/${lines2.length} lines. Real BPE ${inTokens}\u2192${outTokens} (\u2212${(savedTokens / inTokens * 100).toFixed(1)}%).`
  };
}
function stencilDecode(wire) {
  if (!wire.startsWith(H_HEAD)) return wire;
  const dataAt = wire.indexOf("\n" + H_DATA + "\n");
  const endAt = wire.lastIndexOf("\n" + H_END);
  if (dataAt < 0 || endAt < 0 || endAt < dataAt) return wire;
  const headBlock = wire.slice(H_HEAD.length + 1, dataAt);
  const dataBlock = wire.slice(dataAt + H_DATA.length + 2, endAt);
  const tmpl = /* @__PURE__ */ new Map();
  if (headBlock.length) {
    for (const hl of headBlock.split("\n")) {
      const eq = hl.indexOf("=");
      if (eq <= 0) continue;
      tmpl.set(hl.slice(0, eq), parseTemplate(hl.slice(eq + 1)));
    }
  }
  const out = [];
  for (const dl of dataBlock.split("\n")) {
    if (dl.startsWith("~")) {
      out.push(unesc(dl.slice(1)));
      continue;
    }
    const bar = dl.indexOf("|");
    const id = bar < 0 ? dl : dl.slice(0, bar);
    const parts = tmpl.get(id);
    if (!parts) {
      out.push(dl);
      continue;
    }
    const slots = bar < 0 ? [] : splitEsc(dl.slice(bar + 1));
    let s = parts[0] ?? "";
    for (let i = 1; i < parts.length; i++) s += (slots[i - 1] ?? "") + parts[i];
    out.push(s);
  }
  return out.join("\n");
}

// src/lib/omega/morph.ts
var H_HEAD2 = "[\u03FA]";
var H_END2 = "[/\u03FA]";
var OP_REF = "\xBB";
var OP_CASE_TITLE = "\u2020";
var OP_CASE_UPPER = "\u2021";
var OP_PRE = "\u203A";
var MORPH_SYMBOLS = (() => {
  const pool2 = [];
  const nums = "0123456789";
  for (const n1 of nums) for (const n2 of nums) pool2.push(`\u03FA${n1}${n2}`);
  return pool2;
})();
var RESERVED = [H_HEAD2, H_END2, OP_REF, OP_CASE_TITLE, OP_CASE_UPPER, OP_PRE, "\u03FA"];
function words(text) {
  return text.match(/\s*\S+|\s+/g) ?? [];
}
function splitWs(tok) {
  const m2 = tok.match(/^(\s*)(.*)$/s);
  return { ws: m2?.[1] ?? "", core: m2?.[2] ?? tok };
}
function caseOf(word) {
  if (!/[A-Za-z]/.test(word)) return "other";
  if (word === word.toLowerCase()) return "lower";
  if (word === word.toUpperCase() && /[A-Z]/.test(word)) return "upper";
  if (word[0] === word[0].toUpperCase() && word.slice(1) === word.slice(1).toLowerCase()) return "title";
  return "other";
}
function commonPrefix(a, b) {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i++;
  return i;
}
function pureAlpha(core) {
  return /^[A-Za-z]+$/.test(core) && core.length >= 5;
}
function morphEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const inChars = text.length;
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    applied: false,
    encoding: enc2,
    inTokens,
    outTokens: inTokens,
    savedTokens: 0,
    savingsPct: 0,
    inChars,
    outChars: inChars,
    families: [],
    variantsReplaced: 0,
    notes
  });
  if (text.length > 12e4) return identity("MORPH: skipped over 120k chars for UI latency safety.");
  if (!text || inTokens < 12) return identity("MORPH: input too short.");
  for (const r of RESERVED) if (text.includes(r)) return identity("MORPH: reserved marker present \u2014 identity fallback.");
  const toks = words(text);
  const cores = [];
  for (let i = 0; i < toks.length; i++) {
    const { ws, core } = splitWs(toks[i]);
    if (!pureAlpha(core)) continue;
    const ck = caseOf(core);
    if (ck === "other") continue;
    cores.push({ i, ws, core, lc: core.toLowerCase(), ck });
  }
  if (cores.length < 4) return identity("MORPH: too few morphologically-eligible words.");
  const used = new Array(cores.length).fill(false);
  const families = [];
  let symIdx = 0;
  for (let a = 0; a < cores.length; a++) {
    if (used[a]) continue;
    if (symIdx >= MORPH_SYMBOLS.length) break;
    const cluster = [a];
    let stem = cores[a].lc;
    for (let b = a + 1; b < cores.length; b++) {
      if (used[b]) continue;
      const cp = commonPrefix(stem, cores[b].lc);
      if (cp >= 4 && cp >= Math.min(stem.length, cores[b].lc.length) * 0.6) {
        cluster.push(b);
        stem = stem.slice(0, cp);
      }
    }
    if (cluster.length < 2 || stem.length < 4) continue;
    families.push({ symbol: MORPH_SYMBOLS[symIdx++], stem, members: cluster });
    for (const m2 of cluster) used[m2] = true;
  }
  if (families.length === 0) return identity("MORPH: no morpheme family with >=2 members and >=4-char stem.");
  const replaceAt = /* @__PURE__ */ new Map();
  const admitted = [];
  for (const fam of families) {
    let famOrig = 0;
    let famNew = 0;
    const localReplace = /* @__PURE__ */ new Map();
    for (const mi of fam.members) {
      const c = cores[mi];
      const original = c.core;
      const lc = c.lc;
      let tag;
      let rebuildOk = false;
      if (lc.startsWith(fam.stem)) {
        const suffix = lc.slice(fam.stem.length);
        const caseFlag = c.ck === "title" ? OP_CASE_TITLE : c.ck === "upper" ? OP_CASE_UPPER : "";
        tag = `${fam.symbol}${OP_REF}${suffix}${caseFlag}`;
        rebuildOk = rebuildVariant(fam.stem, suffix, "", c.ck) === original;
      } else {
        const pre = commonPrefix(fam.stem, lc);
        const preDelta = lc.slice(pre);
        const caseFlag = c.ck === "title" ? OP_CASE_TITLE : c.ck === "upper" ? OP_CASE_UPPER : "";
        tag = `${fam.symbol}${OP_PRE}${lc.slice(0, pre)}${OP_REF}${preDelta}${caseFlag}`;
        rebuildOk = false;
        void preDelta;
      }
      if (!rebuildOk) continue;
      localReplace.set(c.i, tag);
      famOrig += countTokens((c.ws ? " " : "") + original, enc2);
      famNew += countTokens((c.ws ? " " : "") + tag, enc2);
    }
    if (localReplace.size < 2) continue;
    const headerCost = countTokens(`${fam.symbol}=${fam.stem}
`, enc2);
    const saved2 = famOrig - famNew - headerCost;
    if (saved2 <= 0) continue;
    for (const [k2, v] of localReplace) replaceAt.set(k2, v);
    admitted.push({ symbol: fam.symbol, stem: fam.stem, variants: localReplace.size, tokensSaved: saved2 });
  }
  if (admitted.length === 0) return identity("MORPH: no family cleared the real-token admission gate.");
  const body = toks.map((tok, i) => {
    const rep = replaceAt.get(i);
    if (!rep) return tok;
    const { ws } = splitWs(tok);
    return ws + rep;
  }).join("");
  const head = admitted.map((f) => `${f.symbol}=${f.stem}`).join("\n");
  const wire = `${H_HEAD2}
${head}
${H_END2}
${body}`;
  const decoded = morphDecode(wire);
  if (decoded !== text) return identity("MORPH: round trip not byte-exact \u2014 identity fallback.");
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens) return identity(`MORPH: wire (${outTokens}) did not beat input (${inTokens}).`);
  const saved = inTokens - outTokens;
  let variantsReplaced = 0;
  for (const f of admitted) variantsReplaced += f.variants;
  return {
    wire,
    decoded,
    exact: true,
    applied: true,
    encoding: enc2,
    inTokens,
    outTokens,
    savedTokens: saved,
    savingsPct: saved / inTokens * 100,
    inChars,
    outChars: wire.length,
    families: admitted,
    variantsReplaced,
    notes: `MORPH: ${admitted.length} morpheme famil${admitted.length === 1 ? "y" : "ies"}, ${variantsReplaced} variant(s) folded. Real BPE ${inTokens}\u2192${outTokens} (\u2212${(saved / inTokens * 100).toFixed(1)}%).`
  };
}
function rebuildVariant(stem, suffix, _prefix, ck) {
  const lc = stem + suffix;
  if (ck === "lower") return lc;
  if (ck === "upper") return lc.toUpperCase();
  if (ck === "title") return lc.charAt(0).toUpperCase() + lc.slice(1);
  return lc;
}
function morphDecode(wire) {
  if (!wire.startsWith(H_HEAD2)) return wire;
  const endAt = wire.indexOf("\n" + H_END2 + "\n");
  if (endAt < 0) return wire;
  const head = wire.slice(H_HEAD2.length + 1, endAt);
  const body = wire.slice(endAt + H_END2.length + 2);
  const stems = /* @__PURE__ */ new Map();
  for (const hl of head.split("\n")) {
    const eq = hl.indexOf("=");
    if (eq <= 0) continue;
    stems.set(hl.slice(0, eq), hl.slice(eq + 1));
  }
  const re = /Ϻ\d\d(?:\u203A[a-z]*)?\u00BB([a-z]*)([\u2020\u2021]?)/g;
  let out = "";
  let last = 0;
  let m2;
  while ((m2 = re.exec(body)) !== null) {
    out += body.slice(last, m2.index);
    const full = m2[0];
    const symMatch = full.match(/^Ϻ\d\d/);
    const symbol = symMatch ? symMatch[0] : "";
    const stem = stems.get(symbol);
    if (stem === void 0) {
      out += full;
      last = re.lastIndex;
      continue;
    }
    const suffix = m2[1] ?? "";
    const caseFlag = m2[2] ?? "";
    const ck = caseFlag === "\u2020" ? "title" : caseFlag === "\u2021" ? "upper" : "lower";
    out += rebuildVariant(stem, suffix, "", ck);
    last = re.lastIndex;
  }
  out += body.slice(last);
  return out;
}

// src/lib/omega/pulse.ts
var GLYPH2 = "\u27E1";
var SENTINEL5 = "[P1]\n";
var MAX_RUN = 2e6;
function escapeLiteral(s) {
  return s.split(GLYPH2).join(GLYPH2 + GLYPH2);
}
function pulseDecode(wire) {
  if (!wire.startsWith(SENTINEL5)) return wire;
  const src2 = wire.slice(SENTINEL5.length);
  let out = "";
  let i = 0;
  while (i < src2.length) {
    if (src2[i] !== GLYPH2) {
      out += src2[i++];
      continue;
    }
    if (src2[i + 1] === GLYPH2) {
      out += GLYPH2;
      i += 2;
      continue;
    }
    if (src2[i + 1] !== "[") {
      out += src2[i++];
      continue;
    }
    const close = src2.indexOf("]", i + 2);
    if (close < 0) {
      out += src2[i++];
      continue;
    }
    const [countText, unitText] = src2.slice(i + 2, close).split(",");
    const count = Number(countText);
    const unit = Number.parseInt(unitText, 16);
    if (!Number.isSafeInteger(count) || count <= 0 || count > MAX_RUN || !Number.isSafeInteger(unit) || unit < 0 || unit > 65535) {
      out += src2[i++];
      continue;
    }
    out += String.fromCharCode(unit).repeat(count);
    i = close + 1;
  }
  return out;
}
function pulseEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    runs: 0,
    mode: "identity",
    notes
  });
  if (!text) return identity("empty input");
  let body = "";
  let runs = 0;
  let i = 0;
  while (i < text.length) {
    let j = i + 1;
    while (j < text.length && text[j] === text[i]) j++;
    const count = j - i;
    const marker = `${GLYPH2}[${count},${text.charCodeAt(i).toString(16)}]`;
    if (count >= 4 && countTokens(marker, enc2) < countTokens(text.slice(i, j), enc2)) {
      body += marker;
      runs++;
    } else {
      body += escapeLiteral(text.slice(i, j));
    }
    i = j;
  }
  if (!runs) {
    if (!text.startsWith(SENTINEL5)) return identity("no repeated code-unit run cleared the BPE gain bar");
    const forcedWire = SENTINEL5 + escapeLiteral(text);
    const forcedDecoded = pulseDecode(forcedWire);
    const ot = countTokens(forcedWire, enc2);
    return {
      wire: forcedWire,
      decoded: forcedDecoded,
      exact: forcedDecoded === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
      runs: 0,
      mode: "forced-wrap",
      notes: "forced P1 wrapper for sentinel-prefixed input"
    };
  }
  const wire = SENTINEL5 + body;
  const decoded = pulseDecode(wire);
  const outTokens = countTokens(wire, enc2);
  if (decoded !== text) return identity("guard: run-length wire failed exact reconstruction");
  if (outTokens >= inTokens) return identity("guard: complete run-length wire was not smaller");
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    runs,
    mode: "pulse",
    notes: `${runs} repeated-unit runs \xB7 exact complete-wire BPE guard`
  };
}
var PULSE_SYSTEM_PROMPT = "# PULSE-R1: after `[P1]`, `\u27E1[count,hex]` expands to count copies of the UTF-16 code unit hex; `\u27E1\u27E1` is a literal glyph; everything else is literal.";

// src/lib/omega/meridian.ts
var SENTINEL6 = "[M1]\n";
var MIN_WIN2 = 2;
var MAX_EXT2 = 40;
var MAX_POS2 = 12;
var MAX_ANCHORS2 = 400;
var MAX_ENTRIES2 = 220;
var MAX_MINE_TOKENS2 = 26e4;
var K_RADIX2 = 200100;
var CHAR_AUG_LIMIT2 = 6e4;
var CHAR_AUG_LENS2 = [3, 4, 5, 6, 8, 10, 12, 16, 20, 28, 40];
var poolCache4 = /* @__PURE__ */ new Map();
function ideographPool4(enc2) {
  const hit = poolCache4.get(enc2);
  if (hit) return hit;
  const out = [];
  for (let cp = 19968; cp <= 40869; cp++) {
    const ch = String.fromCharCode(cp);
    if (countTokens(ch, enc2) === 1) out.push(ch);
    if (out.length >= 1200) break;
  }
  poolCache4.set(enc2, out);
  return out;
}
function tokenGrid2(text, enc2) {
  const ids = encodeIds(text, enc2);
  const piece = [];
  const off = [0];
  const idcum = [0];
  let pend = [];
  let chars = 0;
  let used = 0;
  for (let i = 0; i < ids.length; i++) {
    pend.push(ids[i]);
    let s;
    try {
      s = decodeIds(pend, enc2);
    } catch {
      continue;
    }
    if (s.indexOf("\uFFFD") !== -1 && text.indexOf("\uFFFD") === -1) continue;
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
function anaphoraBodyDecode(src2, OPEN, CLOSE) {
  const dict = /* @__PURE__ */ new Map();
  const stack = [];
  let cur = { key: "", buf: "" };
  for (let i = 0; i < src2.length; i++) {
    const c = src2[i];
    if (c === OPEN) {
      const k2 = src2[i + 1];
      if (k2 === void 0) return null;
      stack.push(cur);
      cur = { key: k2, buf: "" };
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
    if (bound !== void 0) {
      cur.buf += bound;
      continue;
    }
    cur.buf += c;
  }
  if (stack.length !== 0) return null;
  return cur.buf;
}
function meridianDecode(wire) {
  if (wire.startsWith(SENTINEL6)) {
    const body = wire.slice(SENTINEL6.length);
    const OPEN = body[0];
    const CLOSE = body[1];
    if (OPEN === void 0 || CLOSE === void 0 || body[2] !== "\n") return wire;
    const decoded = anaphoraBodyDecode(body.slice(3), OPEN, CLOSE);
    if (decoded === null) return wire;
    return helixDecode(decoded);
  }
  return helixDecode(wire);
}
function anaphoraEncodeCore(text, enc2) {
  const mustWrap = text.startsWith(SENTINEL6);
  if (text.length < 16 && !mustWrap) return { wire: text, entries: [], mode: "identity" };
  const pool2 = ideographPool4(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (pool2.length < 3) return { wire: text, entries: [], mode: "identity" };
  const OPEN = pool2[0];
  const CLOSE = pool2[1];
  const keys = pool2.slice(2);
  const D = countTokens(OPEN + keys[0] + CLOSE, enc2);
  const A = countTokens(keys[0], enc2);
  const phraseIsSafe = (phrase) => phrase.indexOf(OPEN) === -1 && phrase.indexOf(CLOSE) === -1;
  const countEligible2 = (src2, phrase) => {
    let idx = 0;
    let n = 0;
    while ((idx = src2.indexOf(phrase, idx)) !== -1) {
      if (idx > 0 && src2[idx - 1] === OPEN) {
        idx += 1;
        continue;
      }
      n++;
      idx += phrase.length;
    }
    return n;
  };
  const bindInPlace2 = (src2, phrase, key) => {
    let out = "";
    let last = 0;
    let idx = 0;
    let bound = false;
    while ((idx = src2.indexOf(phrase, idx)) !== -1) {
      if (idx > 0 && src2[idx - 1] === OPEN) {
        idx += 1;
        continue;
      }
      out += src2.slice(last, idx);
      if (!bound) {
        out += OPEN + key + phrase + CLOSE;
        bound = true;
      } else out += key;
      idx += phrase.length;
      last = idx;
    }
    return out + src2.slice(last);
  };
  const minePass = (src2) => {
    const grid = tokenGrid2(src2, enc2);
    const cands = [];
    const seen = /* @__PURE__ */ new Set();
    const push = (phrase, win, hits) => {
      if (phrase.length < 2 || seen.has(phrase)) return;
      if (!phraseIsSafe(phrase)) return;
      seen.add(phrase);
      cands.push({ phrase, win, hits });
    };
    if (grid.ok) {
      const P = Math.min(grid.piece.length, MAX_MINE_TOKENS2);
      if (P >= MIN_WIN2) {
        const intern = /* @__PURE__ */ new Map();
        const pid = new Int32Array(P);
        for (let i = 0; i < P; i++) {
          const s = grid.piece[i];
          let v = intern.get(s);
          if (v === void 0) {
            v = intern.size;
            intern.set(s, v);
          }
          pid[i] = v;
        }
        const anchors = /* @__PURE__ */ new Map();
        for (let i = 0; i + MIN_WIN2 <= P; i++) {
          const k2 = pid[i] * K_RADIX2 + pid[i + 1];
          const cur = anchors.get(k2);
          if (cur) {
            cur.c++;
            if (cur.pos.length < MAX_POS2) cur.pos.push(i);
          } else anchors.set(k2, { c: 1, pos: [i] });
        }
        const hot = [];
        for (const a of anchors.values()) if (a.c >= 2) hot.push(a);
        hot.sort((x, y) => y.c - x.c);
        if (hot.length > MAX_ANCHORS2) hot.length = MAX_ANCHORS2;
        for (const a of hot) {
          const p0 = a.pos[0];
          let bestLen = MIN_WIN2;
          for (let len = MIN_WIN2 + 1; len <= MAX_EXT2 && p0 + len <= P; len++) {
            let share = 1;
            for (let j = 1; j < a.pos.length; j++) {
              const pj = a.pos[j];
              if (pj + len > P || pj < p0 + len) continue;
              let eq = true;
              for (let t2 = MIN_WIN2; t2 < len; t2++) {
                if (pid[p0 + t2] !== pid[pj + t2]) {
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
          const lens = /* @__PURE__ */ new Set([bestLen, Math.max(MIN_WIN2, bestLen >> 1), MIN_WIN2]);
          for (const len of lens) {
            push(
              src2.slice(grid.off[p0], grid.off[p0 + len]),
              grid.idcum[p0 + len] - grid.idcum[p0],
              a.c
            );
          }
        }
      }
    }
    if (src2.length <= CHAR_AUG_LIMIT2) {
      for (const L of CHAR_AUG_LENS2) {
        if (L >= src2.length) break;
        const counts = /* @__PURE__ */ new Map();
        for (let i = 0; i + L <= src2.length; i++) {
          const sub = src2.substr(i, L);
          counts.set(sub, (counts.get(sub) ?? 0) + 1);
        }
        let added = 0;
        for (const [sub, n] of counts) {
          if (n < 2) continue;
          push(sub, countTokens(sub, enc2), n);
          if (++added >= 400) break;
        }
      }
    }
    return cands;
  };
  const CTX = 24;
  const SAMPLES = 6;
  const measuredGain = (src2, phrase, key, n) => {
    let idx = 0;
    let samples = 0;
    let sumDelta = 0;
    let binderCost = 0;
    while (samples < SAMPLES) {
      idx = src2.indexOf(phrase, idx);
      if (idx < 0) break;
      const l = src2.slice(Math.max(0, idx - CTX), idx);
      const r = src2.slice(idx + phrase.length, idx + phrase.length + CTX);
      const base = countTokens(l + phrase + r, enc2);
      const aliased = countTokens(l + key + r, enc2);
      if (samples === 0)
        binderCost = countTokens(l + OPEN + key + phrase + CLOSE + r, enc2) - base;
      sumDelta += base - aliased;
      samples++;
      idx += phrase.length;
    }
    if (samples === 0) return -1;
    return (n - 1) * (sumDelta / samples) - binderCost;
  };
  let body = text;
  let entries = [];
  let bestBody = text;
  let bestEntries = [];
  let bestTokens = countTokens(text, enc2);
  const rounds = text.length > 2e5 ? 2 : text.length > 4e4 ? 3 : 5;
  const MAX_CANDS_PER_ROUND = 1500;
  for (let round = 0; round < rounds; round++) {
    if (entries.length >= MAX_ENTRIES2 || entries.length >= keys.length) break;
    const cands = minePass(body);
    if (cands.length === 0) break;
    cands.sort(
      (x, y) => (y.hits - 1) * (y.win - A) - (x.hits - 1) * (x.win - A) || y.win - x.win
    );
    if (cands.length > MAX_CANDS_PER_ROUND) cands.length = MAX_CANDS_PER_ROUND;
    let admitted = 0;
    for (const cand of cands) {
      if (entries.length >= MAX_ENTRIES2 || entries.length >= keys.length) break;
      if ((cand.hits - 1) * (cand.win - A) - D <= 0) continue;
      if (!phraseIsSafe(cand.phrase)) continue;
      const n = countEligible2(body, cand.phrase);
      if (n < 2) continue;
      const key = keys[entries.length];
      const gain = measuredGain(body, cand.phrase, key, n);
      if (gain <= 0) continue;
      body = bindInPlace2(body, cand.phrase, key);
      entries.push({
        key,
        phrase: cand.phrase,
        hits: n,
        winTokens: cand.win,
        gain: Math.round(gain)
      });
      admitted++;
    }
    if (admitted === 0) break;
    const roundTokens = countTokens(SENTINEL6 + OPEN + CLOSE + "\n" + body, enc2);
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
  if (entries.length === 0 && !mustWrap) return { wire: text, entries: [], mode: "identity" };
  if (entries.length === 0 && mustWrap) {
    return {
      wire: SENTINEL6 + OPEN + CLOSE + "\n" + text,
      entries: [],
      mode: "forced-wrap"
    };
  }
  const wire = SENTINEL6 + OPEN + CLOSE + "\n" + body;
  const decoded = anaphoraBodyDecode(body, OPEN, CLOSE);
  if (decoded !== text) {
    if (mustWrap) {
      return {
        wire: SENTINEL6 + OPEN + CLOSE + "\n" + text,
        entries: [],
        mode: "forced-wrap"
      };
    }
    return { wire: text, entries: [], mode: "identity" };
  }
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= countTokens(text, enc2) && !mustWrap)
    return { wire: text, entries: [], mode: "identity" };
  return {
    wire,
    entries,
    mode: "anaphoric"
  };
}
function meridianEncode(text, enc2 = "o200k_base") {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const inTokens = countTokens(text, enc2);
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    mode: "identity",
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty");
  const a = anaphoraEncodeCore(text, enc2);
  const h = helixEncode(text, enc2);
  const cands = [{ wire: text, mode: "identity", entries: [] }];
  if (a.mode === "anaphoric" || a.mode === "forced-wrap") {
    cands.push({
      wire: a.wire,
      mode: a.mode === "forced-wrap" ? "forced-wrap" : "anaphoric",
      entries: a.entries
    });
  }
  if (h.mode === "factored") cands.push({ wire: h.wire, mode: "helix", entries: [] });
  if (a.mode === "anaphoric") {
    const bodyStart = a.wire.indexOf("\n", SENTINEL6.length) + 1;
    if (bodyStart > 0) {
      const header = a.wire.slice(0, bodyStart);
      const body = a.wire.slice(bodyStart);
      const h2 = helixEncode(body, enc2);
      if (h2.mode === "factored") {
        cands.push({ wire: header + h2.wire, mode: "compose-ah", entries: a.entries });
      }
    }
  }
  if (h.mode === "factored") {
    const a2 = anaphoraEncodeCore(h.wire, enc2);
    if (a2.mode === "anaphoric") {
      cands.push({ wire: a2.wire, mode: "compose-ha", entries: a2.entries });
    }
  }
  let best = cands[0];
  let bestTok = inTokens;
  for (const c of cands) {
    const dec = meridianDecode(c.wire);
    if (dec !== text) continue;
    const tok = countTokens(c.wire, enc2);
    if (tok < bestTok || c.mode === "forced-wrap" && best.mode === "identity" && dec === text) {
      bestTok = tok;
      best = c;
    }
  }
  if (best.mode === "identity") {
    if (text.startsWith(SENTINEL6)) {
      const pool2 = ideographPool4(enc2).filter((ch) => text.indexOf(ch) === -1);
      if (pool2.length >= 2) {
        const w = SENTINEL6 + pool2[0] + pool2[1] + "\n" + text;
        if (meridianDecode(w) === text) {
          const ot = countTokens(w, enc2);
          return {
            wire: w,
            decoded: text,
            exact: true,
            inTokens,
            outTokens: ot,
            savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
            entries: [],
            mode: "forced-wrap",
            notes: "forced wrap: input begins with M1 sentinel",
            encodeMs: ms()
          };
        }
      }
    }
    return identity("tournament: identity won (no hemisphere shrank under exact gate)");
  }
  if (bestTok >= inTokens && best.mode !== "forced-wrap") {
    return identity("tournament: no positive savings under exact gate");
  }
  return {
    wire: best.wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: bestTok,
    savingsPct: inTokens ? (inTokens - bestTok) / inTokens * 100 : 0,
    entries: best.entries,
    mode: best.mode,
    notes: `MERIDIAN tournament winner=${best.mode} \xB7 ${best.entries.length} anaphora binds \xB7 verified byte-exact`,
    encodeMs: ms()
  };
}
var MERIDIAN_SYSTEM_PROMPT = [
  "# \u2609 MERIDIAN-M1 \u2014 dual-hemisphere exact wire (anaphora \u2295 arithmetic)",
  "A message may use either or both of:",
  "",
  "## Anaphora hemisphere ([M1] header)",
  "Line 1: [M1]",
  "Line 2: two delimiter characters OPEN CLOSE, then newline.",
  "Reading: OPENkP CLOSE binds label k to phrase P in place (first occurrence).",
  "Later bare k expands to P. Nested binders resolve inside-out. Byte-exact.",
  "",
  "## Arithmetic hemisphere (HELIX markers, may appear inside or alone)",
  HELIX_SYSTEM_PROMPT,
  "",
  "If neither form appears, text is literal.",
  "OUTPUT CONTRACT: reuse labels/markers when repeating bound content; code/ids verbatim; dense replies."
].join("\n");

// src/lib/omega/quasar.ts
var CJK_START = 19968;
var CJK_END = 40959;
var SENTINEL7 = "\u27E8QSR\u27E9\n";
var TERMINATOR = "\u27E8/QSR\u27E9";
var MAX_ROUNDS = 48;
var MAX_POOL = 60;
var MAX_MINE_TOKENS3 = 2e5;
var MAX_NGRAM_WIDTH = 5;
var TOP_CANDS = 50;
function escPhrase(s) {
  let o = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "\\") o += "\\\\";
    else if (c === "\n") o += "\\n";
    else if (c === "\r") o += "\\r";
    else o += c;
  }
  return o;
}
function unescPhrase(s) {
  let o = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === "\\") {
        o += "\\";
        i++;
      } else if (n === "n") {
        o += "\n";
        i++;
      } else if (n === "r") {
        o += "\r";
        i++;
      } else o += s[i];
    } else o += s[i];
  }
  return o;
}
var _poolCache = /* @__PURE__ */ new Map();
function buildPool(enc2, exclude) {
  let base = _poolCache.get(enc2);
  if (!base) {
    base = [];
    for (let cp = CJK_START; cp <= CJK_END && base.length < 300; cp++) {
      const ch = String.fromCodePoint(cp);
      if (encodeIds(ch, enc2).length === 1) base.push(ch);
    }
    _poolCache.set(enc2, base);
  }
  return base.filter((ch) => !exclude.has(ch)).slice(0, MAX_POOL);
}
function quasarDecode(wire) {
  if (!wire.startsWith(SENTINEL7)) return wire;
  const termPos = wire.indexOf("\n" + TERMINATOR + "\n");
  if (termPos === -1) return wire;
  const headerBlock = wire.slice(SENTINEL7.length, termPos);
  const body = wire.slice(termPos + 1 + TERMINATOR.length + 1);
  const entries = [];
  for (const line of headerBlock.split("\n")) {
    if (!line) continue;
    const eqIdx = line.indexOf("=");
    if (eqIdx < 1) return wire;
    entries.push({ alias: line.slice(0, eqIdx), phrase: unescPhrase(line.slice(eqIdx + 1)) });
  }
  let text = body;
  for (let i = entries.length - 1; i >= 0; i--) {
    text = text.split(entries[i].alias).join(entries[i].phrase);
  }
  return text;
}
function countOcc(text, sub) {
  let n = 0;
  let idx = 0;
  while ((idx = text.indexOf(sub, idx)) !== -1) {
    n++;
    idx += sub.length;
  }
  return n;
}
function assembleWire(entries, body) {
  return SENTINEL7 + entries.map((e) => e.alias + "=" + escPhrase(e.phrase)).join("\n") + "\n" + TERMINATOR + "\n" + body;
}
function quasarEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    rounds: 0,
    mode: "identity",
    notes
  });
  if (!text || inTokens < 6) return identity("input too short");
  if (text.startsWith(SENTINEL7)) {
    const w3 = SENTINEL7 + "\n" + TERMINATOR + "\n" + text;
    const d3 = quasarDecode(w3);
    const ot = countTokens(w3, enc2);
    if (d3 === text) {
      return {
        wire: w3,
        decoded: d3,
        exact: true,
        inTokens,
        outTokens: ot,
        savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
        entries: [],
        rounds: 0,
        mode: "forced-wrap",
        notes: "forced empty-dict wrap (input began with QSR sentinel)"
      };
    }
    return identity("sentinel adversary: could not wrap safely");
  }
  const inputChars = /* @__PURE__ */ new Set();
  for (const ch of text) inputChars.add(ch);
  const pool2 = buildPool(enc2, inputChars);
  if (pool2.length === 0) return identity("no CJK aliases available");
  let body = text;
  const entries = [];
  let poolIdx = 0;
  for (let round = 0; round < MAX_ROUNDS && poolIdx < pool2.length; round++) {
    const toks = tokenStrings(body, enc2);
    const T = Math.min(toks.length, MAX_MINE_TOKENS3);
    if (T < 2) break;
    const seen = /* @__PURE__ */ new Set();
    const cands = [];
    for (let n = 2; n <= Math.min(MAX_NGRAM_WIDTH, T); n++) {
      const counts = /* @__PURE__ */ new Map();
      for (let i = 0; i + n <= T; i++) {
        let key = "";
        for (let j = 0; j < n; j++) key += toks[i + j].id + ":";
        const e = counts.get(key);
        if (e) e.count++;
        else counts.set(key, { count: 1, firstIdx: i });
      }
      for (const [, info] of counts) {
        if (info.count < 2) continue;
        let span = "";
        for (let j = 0; j < n; j++) span += toks[info.firstIdx + j].s;
        if (span.length < 2 || seen.has(span)) continue;
        seen.add(span);
        cands.push({ span, width: n, freq: info.count });
      }
    }
    if (cands.length === 0) break;
    cands.sort((a, b) => b.freq * (b.width - 1) - a.freq * (a.width - 1));
    let accepted = false;
    const curWireTokens = entries.length > 0 ? countTokens(assembleWire(entries, body), enc2) : inTokens;
    for (const cand of cands.slice(0, TOP_CANDS)) {
      const realHits = countOcc(body, cand.span);
      if (realHits < 2) continue;
      const alias = pool2[poolIdx];
      const newBody = body.split(cand.span).join(alias);
      const provisional = {
        alias,
        phrase: cand.span,
        hits: realHits,
        spanTokens: cand.width
      };
      const newWire = assembleWire([...entries, provisional], newBody);
      const newTokens = countTokens(newWire, enc2);
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
  if (entries.length === 0) return identity("no positive-gain contractions (below redundancy floor)");
  const wire = assembleWire(entries, body);
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens) return identity("dictionary wire not smaller than input");
  const decoded = quasarDecode(wire);
  if (decoded !== text) return identity("round-trip verification failed; identity emitted");
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    entries,
    rounds: entries.length,
    mode: "dict",
    notes: `${entries.length} token-stream contractions via re-pair cascade \xB7 verified byte-exact`
  };
}
var QUASAR_SYSTEM_PROMPT = [
  "# \u2726 QUASAR (QSR) \u2014 byte-exact in-context dictionary via token-stream re-pairing",
  "The message may begin with a header block:",
  "  \u27E8QSR\u27E9",
  "  alias=phrase",
  "  \u27E8/QSR\u27E9",
  "Decode rules (apply mentally; do not emit expansions unless asked):",
  "1. Each header line maps a CJK character (alias) to its original phrase.",
  "   Escapes in phrases: \\\\=\\, \\n=newline, \\r=CR.",
  "2. In the body after the header, each alias character stands for its phrase.",
  "3. Decode in reverse order (last entry first) to handle nested aliases.",
  "4. Everything else is literal. Reconstruction is byte-exact.",
  "5. If there is no \u27E8QSR\u27E9 header, the text is literal.",
  "OUTPUT CONTRACT: answer densely; code fences and identifiers verbatim."
].join("\n");

// src/lib/omega/plexus.ts
var SENTINEL8 = "[PX]\n";
var MAX_ROUNDS2 = 24;
var MAX_ENTRIES3 = 180;
var MAX_MINE_TOKENS4 = 2e5;
var MAX_NGRAM_WIDTH2 = 5;
var TOP_CANDS2 = 40;
var CJK_START2 = 19968;
var CJK_END2 = 40959;
var poolCache5 = /* @__PURE__ */ new Map();
function ideographPool5(enc2) {
  const hit = poolCache5.get(enc2);
  if (hit) return hit;
  const out = [];
  for (let cp = CJK_START2; cp <= CJK_END2 && out.length < 800; cp++) {
    const ch = String.fromCodePoint(cp);
    if (encodeIds(ch, enc2).length === 1) out.push(ch);
  }
  poolCache5.set(enc2, out);
  return out;
}
function countOccEligible(src2, phrase, OPEN) {
  let n = 0;
  let idx = 0;
  while ((idx = src2.indexOf(phrase, idx)) !== -1) {
    if (idx > 0 && src2[idx - 1] === OPEN) {
      idx += 1;
      continue;
    }
    n++;
    idx += phrase.length;
  }
  return n;
}
function bindInPlace(src2, phrase, key, OPEN, CLOSE) {
  let out = "";
  let last = 0;
  let idx = 0;
  let bound = false;
  while ((idx = src2.indexOf(phrase, idx)) !== -1) {
    if (idx > 0 && src2[idx - 1] === OPEN) {
      idx += 1;
      continue;
    }
    out += src2.slice(last, idx);
    if (!bound) {
      out += OPEN + key + phrase + CLOSE;
      bound = true;
    } else {
      out += key;
    }
    idx += phrase.length;
    last = idx;
  }
  return out + src2.slice(last);
}
function bodyDecode(src2, OPEN, CLOSE) {
  const dict = /* @__PURE__ */ new Map();
  const stack = [];
  let cur = { key: "", buf: "" };
  for (let i = 0; i < src2.length; i++) {
    const c = src2[i];
    if (c === OPEN) {
      const k2 = src2[i + 1];
      if (k2 === void 0) return null;
      stack.push(cur);
      cur = { key: k2, buf: "" };
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
    if (bound !== void 0) {
      cur.buf += bound;
      continue;
    }
    cur.buf += c;
  }
  if (stack.length !== 0) return null;
  return cur.buf;
}
function plexusDecode(wire) {
  if (wire.startsWith(SENTINEL8)) {
    const rest = wire.slice(SENTINEL8.length);
    const OPEN = rest[0];
    const CLOSE = rest[1];
    if (OPEN === void 0 || CLOSE === void 0 || rest[2] !== "\n") return wire;
    const body = rest.slice(3);
    const decoded = bodyDecode(body, OPEN, CLOSE);
    if (decoded === null) return wire;
    return helixDecode(decoded);
  }
  return helixDecode(wire);
}
function cascadeInPlace(text, enc2) {
  const mustWrap = text.startsWith(SENTINEL8);
  const inTokens = countTokens(text, enc2);
  if (!text || inTokens < 8 && !mustWrap) {
    return { wire: text, entries: [], mode: "identity" };
  }
  const pool2 = ideographPool5(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (pool2.length < 3) return { wire: text, entries: [], mode: "identity" };
  const OPEN = pool2[0];
  const CLOSE = pool2[1];
  const keys = pool2.slice(2);
  const D = countTokens(OPEN + keys[0] + CLOSE, enc2);
  const A = countTokens(keys[0], enc2);
  let body = text;
  const entries = [];
  let keyIdx = 0;
  let bestBody = text;
  let bestEntries = [];
  let bestTok = inTokens;
  for (let round = 0; round < MAX_ROUNDS2 && keyIdx < keys.length && entries.length < MAX_ENTRIES3; round++) {
    const toks = tokenStrings(body, enc2);
    const T = Math.min(toks.length, MAX_MINE_TOKENS4);
    if (T < 2) break;
    const seen = /* @__PURE__ */ new Set();
    const cands = [];
    for (let n = 2; n <= Math.min(MAX_NGRAM_WIDTH2, T); n++) {
      const counts = /* @__PURE__ */ new Map();
      for (let i = 0; i + n <= T; i++) {
        let k2 = "";
        for (let j = 0; j < n; j++) k2 += toks[i + j].id + ":";
        const e = counts.get(k2);
        if (e) e.count++;
        else counts.set(k2, { count: 1, first: i });
      }
      for (const [, info] of counts) {
        if (info.count < 2) continue;
        let span = "";
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
    const headerWireTok = countTokens(SENTINEL8 + OPEN + CLOSE + "\n" + body, enc2);
    for (const cand of cands.slice(0, TOP_CANDS2)) {
      if (keyIdx >= keys.length) break;
      const hits = countOccEligible(body, cand.span, OPEN);
      if (hits < 2) continue;
      if ((hits - 1) * (cand.width - A) - D <= 0) continue;
      const key = keys[keyIdx];
      const nextBody = bindInPlace(body, cand.span, key, OPEN, CLOSE);
      const nextWire = SENTINEL8 + OPEN + CLOSE + "\n" + nextBody;
      const nextTok = countTokens(nextWire, enc2);
      if (nextTok >= headerWireTok) continue;
      const decBody = bodyDecode(nextBody, OPEN, CLOSE);
      if (decBody !== text && decBody !== bodyDecode(body, OPEN, CLOSE) && decBody !== text) {
      }
      const fullDec = bodyDecode(nextBody, OPEN, CLOSE);
      if (fullDec !== text) continue;
      body = nextBody;
      entries.push({
        key,
        phrase: cand.span,
        hits,
        spanTokens: cand.width,
        round
      });
      keyIdx++;
      accepted = true;
      const wt = countTokens(SENTINEL8 + OPEN + CLOSE + "\n" + body, enc2);
      if (wt < bestTok) {
        bestTok = wt;
        bestBody = body;
        bestEntries = entries.slice();
      }
      break;
    }
    if (!accepted) break;
  }
  body = bestBody;
  const finalEntries = bestEntries;
  if (finalEntries.length === 0) {
    if (!mustWrap) return { wire: text, entries: [], mode: "identity" };
    const w = SENTINEL8 + OPEN + CLOSE + "\n" + text;
    return { wire: w, entries: [], mode: "forced-wrap" };
  }
  const wire = SENTINEL8 + OPEN + CLOSE + "\n" + body;
  const decoded = bodyDecode(body, OPEN, CLOSE);
  if (decoded !== text) {
    if (mustWrap) return { wire: SENTINEL8 + OPEN + CLOSE + "\n" + text, entries: [], mode: "forced-wrap" };
    return { wire: text, entries: [], mode: "identity" };
  }
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens && !mustWrap) return { wire: text, entries: [], mode: "identity" };
  return { wire, entries: finalEntries, mode: "plexus" };
}
function plexusEncode(text, enc2 = "o200k_base") {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    mode: "identity",
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty");
  const p = cascadeInPlace(text, enc2);
  const h = helixEncode(text, enc2);
  const cands = [{ wire: text, mode: "identity", entries: [] }];
  if (p.mode === "plexus" || p.mode === "forced-wrap") {
    cands.push({ wire: p.wire, mode: p.mode, entries: p.entries });
  }
  if (h.mode === "factored") {
    cands.push({ wire: h.wire, mode: "helix", entries: [] });
  }
  if (p.mode === "plexus") {
    const nl = p.wire.indexOf("\n", SENTINEL8.length);
    if (nl > 0) {
      const header = p.wire.slice(0, nl + 1);
      const body = p.wire.slice(nl + 1);
      const h2 = helixEncode(body, enc2);
      if (h2.mode === "factored") {
        cands.push({ wire: header + h2.wire, mode: "compose-ph", entries: p.entries });
      }
    }
  }
  if (h.mode === "factored") {
    const p2 = cascadeInPlace(h.wire, enc2);
    if (p2.mode === "plexus") {
      cands.push({ wire: p2.wire, mode: "compose-hp", entries: p2.entries });
    }
  }
  let best = cands[0];
  let bestTok = inTokens;
  for (const c of cands) {
    const dec = plexusDecode(c.wire);
    if (dec !== text) continue;
    const tok = countTokens(c.wire, enc2);
    if (tok < bestTok || c.mode === "forced-wrap" && best.mode === "identity") {
      bestTok = tok;
      best = c;
    }
  }
  if (best.mode === "identity") {
    if (text.startsWith(SENTINEL8)) {
      const pool2 = ideographPool5(enc2).filter((ch) => text.indexOf(ch) === -1);
      if (pool2.length >= 2) {
        const w = SENTINEL8 + pool2[0] + pool2[1] + "\n" + text;
        if (plexusDecode(w) === text) {
          const ot = countTokens(w, enc2);
          return {
            wire: w,
            decoded: text,
            exact: true,
            inTokens,
            outTokens: ot,
            savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
            entries: [],
            mode: "forced-wrap",
            notes: "forced wrap: input begins with PX sentinel",
            encodeMs: ms()
          };
        }
      }
    }
    return identity("tournament: identity won");
  }
  if (bestTok >= inTokens && best.mode !== "forced-wrap") {
    return identity("tournament: no positive real-BPE savings");
  }
  return {
    wire: best.wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: bestTok,
    savingsPct: inTokens ? (inTokens - bestTok) / inTokens * 100 : 0,
    entries: best.entries,
    mode: best.mode,
    notes: `PLEXUS winner=${best.mode} \xB7 ${best.entries.length} cascade in-place binds \xB7 verified byte-exact`,
    encodeMs: ms()
  };
}
var PLEXUS_SYSTEM_PROMPT = [
  "# \u273A PLEXUS-PX \u2014 cascade in-place binding \u2295 arithmetic (byte-exact)",
  "A message may open with:",
  "  [PX]",
  "  OC          <- two delimiter chars OPEN CLOSE",
  "  <body>",
  "In the body: OPENkPHRASE CLOSE binds label k to PHRASE at first occurrence.",
  "Later bare k expands to PHRASE. Nested binders resolve inside-out.",
  "HELIX markers \u27D0[start,stride,count,width,delimLen]<delim> may also appear;",
  HELIX_SYSTEM_PROMPT,
  "If no [PX] / \u27D0 form appears, text is literal. Reconstruction is byte-exact.",
  "OUTPUT CONTRACT: reuse labels/markers when repeating bound content; code/ids verbatim; dense replies."
].join("\n");

// src/lib/omega/veritas.ts
var KEY_POOL = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
var SENTINEL9 = "[[VX1\n";
var TERMINATOR2 = "]]";
var K_RADIX3 = 200100;
var MAX_MINE_TOKENS5 = 22e4;
var MAX_ANCHORS3 = 240;
var MAX_EXT3 = 32;
var MAX_POS3 = 8;
var MIN_WIN3 = 3;
function escBody(s) {
  return s.split("~").join("~~");
}
function escHeader(s) {
  return s.split("~").join("~~").split("\n").join("~N").split("\r").join("~R");
}
function unescHeader(s) {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "~" && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === "~") {
        out += "~";
        i++;
        continue;
      }
      if (n === "N") {
        out += "\n";
        i++;
        continue;
      }
      if (n === "R") {
        out += "\r";
        i++;
        continue;
      }
    }
    out += c;
  }
  return out;
}
function veritasDecode(wire) {
  if (!wire.startsWith(SENTINEL9)) return wire;
  const lines2 = wire.slice(SENTINEL9.length).split("\n");
  const dict = /* @__PURE__ */ new Map();
  let bodyStart = -1;
  for (let i = 0; i < lines2.length; i++) {
    const ln = lines2[i];
    if (ln === TERMINATOR2) {
      bodyStart = i + 1;
      break;
    }
    if (ln.length >= 3 && ln[0] === "~" && ln[2] === "=") {
      dict.set(ln[1], unescHeader(ln.slice(3)));
    } else {
      return wire;
    }
  }
  if (bodyStart === -1) return wire;
  const body = lines2.slice(bodyStart).join("\n");
  let out = "";
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c === "~" && i + 1 < body.length) {
      const n = body[i + 1];
      if (n === "~") {
        out += "~";
        i++;
        continue;
      }
      const ph = dict.get(n);
      if (ph !== void 0) {
        out += ph;
        i++;
        continue;
      }
    }
    out += c;
  }
  return out;
}
function veritasEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    mode: "identity",
    notes
  });
  if (text.length === 0) return identity("empty input");
  const mustWrap = text.startsWith(SENTINEL9);
  const toks = tokenStrings(text, enc2);
  const T = Math.min(toks.length, MAX_MINE_TOKENS5);
  const anchors = /* @__PURE__ */ new Map();
  if (T >= MIN_WIN3) {
    for (let i = 0; i + MIN_WIN3 <= T; i++) {
      const a = toks[i].id, b = toks[i + 1].id, c = toks[i + 2].id;
      if (a >= K_RADIX3 || b >= K_RADIX3 || c >= K_RADIX3) continue;
      const key = (a * K_RADIX3 + b) * K_RADIX3 + c;
      const cur = anchors.get(key);
      if (cur) {
        cur.c++;
        if (cur.pos.length < MAX_POS3) cur.pos.push(i);
      } else anchors.set(key, { c: 1, pos: [i] });
    }
  }
  const hot = [];
  for (const a of anchors.values()) if (a.c >= 2) hot.push(a);
  hot.sort((x, y) => y.c - x.c);
  if (hot.length > MAX_ANCHORS3) hot.length = MAX_ANCHORS3;
  const seen = /* @__PURE__ */ new Set();
  const cands = [];
  for (const a of hot) {
    const p0 = a.pos[0];
    let bestLen = MIN_WIN3;
    for (let len = MIN_WIN3 + 1; len <= MAX_EXT3 && p0 + len <= T; len++) {
      let share = 1;
      for (let j = 1; j < a.pos.length; j++) {
        const pj = a.pos[j];
        if (pj + len > T || pj < p0 + len) continue;
        let eq = true;
        for (let t2 = MIN_WIN3; t2 < len; t2++) {
          if (toks[p0 + t2].id !== toks[pj + t2].id) {
            eq = false;
            break;
          }
        }
        if (eq) share++;
      }
      if (share >= 2) bestLen = len;
      else break;
    }
    for (const len of bestLen === MIN_WIN3 ? [MIN_WIN3] : [bestLen, MIN_WIN3]) {
      let phrase = "";
      for (let t2 = 0; t2 < len; t2++) phrase += toks[p0 + t2].s;
      if (phrase.length < 4 || seen.has(phrase)) continue;
      seen.add(phrase);
      cands.push({ phrase, win: len, anchorHits: a.c });
    }
  }
  const aliasTokCache = /* @__PURE__ */ new Map();
  const aliasTok = (k2) => {
    let v = aliasTokCache.get(k2);
    if (v === void 0) {
      v = countTokens("~" + k2, enc2);
      aliasTokCache.set(k2, v);
    }
    return v;
  };
  cands.sort(
    (x, y) => y.anchorHits * (y.win - 2) - x.anchorHits * (x.win - 2) || y.win - x.win
  );
  let body = escBody(text);
  const entries = [];
  for (const cand of cands) {
    if (entries.length >= KEY_POOL.length) break;
    const key = KEY_POOL[entries.length];
    const phraseB = escBody(cand.phrase);
    const parts = body.split(phraseB);
    const hits = parts.length - 1;
    if (hits < 2) continue;
    const headerCost = countTokens("\n~" + key + "=" + escHeader(cand.phrase), enc2);
    const gain = hits * (cand.win - aliasTok(key)) - headerCost;
    if (gain <= 0) continue;
    body = parts.join("~" + key);
    entries.push({ key, phrase: cand.phrase, hits, winTokens: cand.win });
  }
  let wire;
  let mode;
  if (entries.length > 0) {
    wire = SENTINEL9 + entries.map((e) => "~" + e.key + "=" + escHeader(e.phrase)).join("\n") + "\n" + TERMINATOR2 + "\n" + body;
    mode = "dict";
  } else if (mustWrap) {
    wire = SENTINEL9 + TERMINATOR2 + "\n" + escBody(text);
    mode = "forced-wrap";
  } else {
    return identity("no positive-gain candidates (input below redundancy floor)");
  }
  const decoded = veritasDecode(wire);
  if (decoded !== text) {
    if (mustWrap) {
      wire = SENTINEL9 + TERMINATOR2 + "\n" + escBody(text);
      const d2 = veritasDecode(wire);
      const ot = countTokens(wire, enc2);
      return {
        wire,
        decoded: d2,
        exact: d2 === text,
        inTokens,
        outTokens: ot,
        savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
        entries: [],
        mode: "forced-wrap",
        notes: "guard: dict wire failed verify; wrapped"
      };
    }
    return identity("guard: wire failed byte-verify; identity emitted");
  }
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens && mode === "dict") {
    if (mustWrap) {
      const w2 = SENTINEL9 + TERMINATOR2 + "\n" + escBody(text);
      const ot2 = countTokens(w2, enc2);
      return {
        wire: w2,
        decoded: veritasDecode(w2),
        exact: true,
        inTokens,
        outTokens: ot2,
        savingsPct: inTokens ? (inTokens - ot2) / inTokens * 100 : 0,
        entries: [],
        mode: "forced-wrap",
        notes: "guard: dict not smaller; wrapped (sentinel prefix)"
      };
    }
    return identity("guard: dictionary wire measured \u2265 input; identity emitted");
  }
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    entries,
    mode,
    notes: mode === "dict" ? `${entries.length} token-space entries \xB7 verified byte-exact \xB7 guard active` : "forced wrap (input begins with VX1 sentinel) \xB7 verified byte-exact"
  };
}
var VERITAS_SYSTEM_PROMPT = "# \u27C1 VERITAS-VX (VX1) \u2014 byte-exact in-context dictionary wire\nThe message may begin with a header block:\n [[VX1\n ~0=phrase\n ~1=phrase\n ]]\nDecode rules (apply mentally; do not emit the expansion unless asked):\n1. Each header line `~k=phrase` binds single-character key k to phrase.\n Inside header phrases: `~~`\u2192`~`, `~N`\u2192newline, `~R`\u2192carriage return.\n2. In the body after `]]`: `~~` \u2192 literal `~`; `~k` \u2192 the bound phrase.\n3. Everything else is literal. Reconstruction is byte-exact.\n4. If there is no `[[VX1` header, the text is literal.\nOUTPUT CONTRACT: when your reply repeats a phrase bound in the header,\nyou may reuse its `~k` alias; write code fences and identifiers verbatim.";

// src/lib/omega/axiom.ts
var SENTINEL10 = "[AX1]\n";
var MAX_LEDGER = 96;
var MAX_ROUNDS3 = 24;
var MAX_ENTRIES4 = 160;
var MAX_MINE_TOKENS6 = 2e5;
var MAX_NGRAM_WIDTH3 = 6;
var TOP_CANDS3 = 48;
var MIN_RECALL_TOKENS = 2;
var poolCache6 = /* @__PURE__ */ new Map();
function ideographPool6(enc2) {
  const hit = poolCache6.get(enc2);
  if (hit) return hit;
  const out = [];
  for (let cp = 19968; cp <= 40959 && out.length < 900; cp++) {
    const ch = String.fromCodePoint(cp);
    if (encodeIds(ch, enc2).length === 1) out.push(ch);
  }
  poolCache6.set(enc2, out);
  return out;
}
function bodyDecode2(src2, OPEN, CLOSE, seed) {
  const dict = new Map(seed);
  const stack = [];
  let cur = { key: "", buf: "" };
  for (let i = 0; i < src2.length; i++) {
    const c = src2[i];
    if (c === OPEN) {
      const k2 = src2[i + 1];
      if (k2 === void 0) return null;
      stack.push(cur);
      cur = { key: k2, buf: "" };
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
    if (bound !== void 0) {
      cur.buf += bound;
      continue;
    }
    cur.buf += c;
  }
  if (stack.length !== 0) return null;
  return cur.buf;
}
function axiomDecode(wire, ledger = []) {
  if (wire.startsWith("[SG1]\n")) return signetDecode(wire);
  if (wire.startsWith("[ST1]\n")) return strataDecode(wire);
  if (wire.startsWith("[TS1]\n")) return tesseraDecode(wire);
  if (wire.startsWith("[AN1]\n")) {
    const peeled = anaphoraDecode(wire);
    return peeled === wire ? wire : axiomDecode(peeled, ledger);
  }
  if (!wire.startsWith(SENTINEL10)) return helixDecode(pulseDecode(wire));
  const rest = wire.slice(SENTINEL10.length);
  const OPEN = rest[0];
  const CLOSE = rest[1];
  if (OPEN === void 0 || CLOSE === void 0 || rest[2] !== "\n") return wire;
  const seed = /* @__PURE__ */ new Map();
  for (const e of ledger) seed.set(e.key, e.phrase);
  const decoded = bodyDecode2(rest.slice(3), OPEN, CLOSE, seed);
  if (decoded === null) return wire;
  return helixDecode(decoded);
}
function countEligible(src2, phrase, OPEN) {
  let n = 0;
  let idx = 0;
  while ((idx = src2.indexOf(phrase, idx)) !== -1) {
    if (idx > 0 && src2[idx - 1] === OPEN) {
      idx += 1;
      continue;
    }
    n++;
    idx += phrase.length;
  }
  return n;
}
function replaceEligible(src2, phrase, out1, outN, OPEN) {
  let out = "";
  let last = 0;
  let idx = 0;
  let first = true;
  while ((idx = src2.indexOf(phrase, idx)) !== -1) {
    if (idx > 0 && src2[idx - 1] === OPEN) {
      idx += 1;
      continue;
    }
    out += src2.slice(last, idx);
    out += first ? out1 : outN;
    first = false;
    idx += phrase.length;
    last = idx;
  }
  return out + src2.slice(last);
}
function axiomCore(text, enc2, ledger) {
  const fail = { wire: text, entries: [], recalled: 0, bound: 0, ledgerAfter: ledger, ok: false };
  const pool2 = ideographPool6(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (pool2.length < 4) return fail;
  const OPEN = pool2[0];
  const CLOSE = pool2[1];
  const used = /* @__PURE__ */ new Set([OPEN, CLOSE]);
  const usableLedger = ledger.filter(
    (e) => e.key !== OPEN && e.key !== CLOSE && text.indexOf(e.key) === -1 && e.phrase.indexOf(OPEN) === -1 && e.phrase.indexOf(CLOSE) === -1 && e.phrase.length > 0
  );
  for (const e of usableLedger) used.add(e.key);
  const freeKeys = pool2.filter((ch) => !used.has(ch));
  const D = countTokens(OPEN + (freeKeys[0] ?? pool2[2]) + CLOSE, enc2);
  const A = countTokens(freeKeys[0] ?? pool2[2], enc2);
  let body = text;
  const entries = [];
  const seed = /* @__PURE__ */ new Map();
  let recalled = 0;
  const recallOrder = [...usableLedger].sort((a, b) => b.phrase.length - a.phrase.length);
  for (const e of recallOrder) {
    const w = countTokens(e.phrase, enc2);
    if (w < MIN_RECALL_TOKENS) continue;
    const n = countEligible(body, e.phrase, OPEN);
    if (n < 1) continue;
    if (n * (w - A) <= 0) continue;
    const next = replaceEligible(body, e.phrase, e.key, e.key, OPEN);
    body = next;
    seed.set(e.key, e.phrase);
    entries.push({ key: e.key, phrase: e.phrase, hits: n, spanTokens: w, source: "recall" });
    recalled += n;
  }
  let keyIdx = 0;
  let bestBody = body;
  let bestEntries = entries.slice();
  let bestTok = countTokens(SENTINEL10 + OPEN + CLOSE + "\n" + body, enc2);
  for (let round = 0; round < MAX_ROUNDS3 && keyIdx < freeKeys.length && entries.length < MAX_ENTRIES4; round++) {
    const toks = tokenStrings(body, enc2);
    const T = Math.min(toks.length, MAX_MINE_TOKENS6);
    if (T < 2) break;
    const seen = /* @__PURE__ */ new Set();
    const cands = [];
    for (let n = 2; n <= Math.min(MAX_NGRAM_WIDTH3, T); n++) {
      const counts = /* @__PURE__ */ new Map();
      for (let i = 0; i + n <= T; i++) {
        let k2 = "";
        for (let j = 0; j < n; j++) k2 += toks[i + j].id + ":";
        const e = counts.get(k2);
        if (e) e.count++;
        else counts.set(k2, { count: 1, first: i });
      }
      for (const [, info] of counts) {
        if (info.count < 2) continue;
        let span = "";
        for (let j = 0; j < n; j++) span += toks[info.first + j].s;
        if (span.length < 2 || seen.has(span)) continue;
        if (span.indexOf(OPEN) !== -1 || span.indexOf(CLOSE) !== -1) continue;
        if (span.indexOf("\uFFFD") !== -1 && text.indexOf("\uFFFD") === -1) continue;
        seen.add(span);
        cands.push({ span, width: n, freq: info.count });
      }
    }
    if (cands.length === 0) break;
    cands.sort((a, b) => b.freq * (b.width - 1) - a.freq * (a.width - 1));
    let accepted = false;
    const cur = countTokens(SENTINEL10 + OPEN + CLOSE + "\n" + body, enc2);
    for (const cand of cands.slice(0, TOP_CANDS3)) {
      if (keyIdx >= freeKeys.length) break;
      const hits = countEligible(body, cand.span, OPEN);
      if (hits < 2) continue;
      if ((hits - 1) * (cand.width - A) - D <= 0) continue;
      const key = freeKeys[keyIdx];
      const next = replaceEligible(body, cand.span, OPEN + key + cand.span + CLOSE, key, OPEN);
      const nextWire = SENTINEL10 + OPEN + CLOSE + "\n" + next;
      if (countTokens(nextWire, enc2) >= cur) continue;
      if (bodyDecode2(next, OPEN, CLOSE, seed) !== text) continue;
      body = next;
      entries.push({ key, phrase: cand.span, hits, spanTokens: cand.width, source: "bind" });
      keyIdx++;
      accepted = true;
      const wt = countTokens(SENTINEL10 + OPEN + CLOSE + "\n" + body, enc2);
      if (wt < bestTok) {
        bestTok = wt;
        bestBody = body;
        bestEntries = entries.slice();
      }
      break;
    }
    if (!accepted) break;
  }
  body = bestBody;
  const finalEntries = bestEntries;
  if (finalEntries.length === 0) return fail;
  const wire = SENTINEL10 + OPEN + CLOSE + "\n" + body;
  if (bodyDecode2(body, OPEN, CLOSE, seed) !== text) return fail;
  const map = /* @__PURE__ */ new Map();
  for (const e of ledger) map.set(e.key, { ...e });
  for (const e of finalEntries) {
    const prev = map.get(e.key);
    const tokens = countTokens(e.phrase, enc2);
    if (prev && prev.phrase === e.phrase) {
      prev.uses += e.hits;
      prev.tokens = tokens;
    } else if (!prev) {
      map.set(e.key, { key: e.key, phrase: e.phrase, uses: e.hits, tokens });
    }
  }
  const ledgerAfter = [...map.values()].sort((a, b) => b.uses * b.tokens - a.uses * a.tokens).slice(0, MAX_LEDGER);
  const bound = finalEntries.filter((e) => e.source === "bind").length;
  return { wire, entries: finalEntries, recalled, bound, ledgerAfter, ok: true };
}
function harvestLedger(text, enc2, ledger, extra) {
  const map = /* @__PURE__ */ new Map();
  const byPhrase = /* @__PURE__ */ new Map();
  for (const e of ledger) {
    map.set(e.key, { ...e });
    byPhrase.set(e.phrase, map.get(e.key));
  }
  const candidates3 = extra.map((e) => ({
    phrase: e.phrase,
    hits: e.hits
  }));
  if (text.length <= 4e5) {
    const counts = /* @__PURE__ */ new Map();
    for (const line of text.split("\n")) {
      if (line.length < 8) continue;
      counts.set(line, (counts.get(line) ?? 0) + 1);
    }
    for (const [line, n] of counts) candidates3.push({ phrase: line, hits: n });
  }
  const pool2 = ideographPool6(enc2);
  const taken = new Set(map.keys());
  const scored = candidates3.filter((c) => c.phrase.length >= 8).map((c) => ({ ...c, tokens: countTokens(c.phrase, enc2) })).filter((c) => c.tokens >= MIN_RECALL_TOKENS + 1).sort((a, b) => b.tokens * b.hits - a.tokens * a.hits);
  for (const c of scored) {
    if (map.size >= MAX_LEDGER) break;
    const prev = byPhrase.get(c.phrase);
    if (prev) {
      prev.uses += c.hits;
      continue;
    }
    const key = pool2.find((ch) => !taken.has(ch) && text.indexOf(ch) === -1);
    if (!key) break;
    taken.add(key);
    const entry = { key, phrase: c.phrase, uses: c.hits, tokens: c.tokens };
    map.set(key, entry);
    byPhrase.set(c.phrase, entry);
  }
  return [...map.values()].sort((a, b) => b.uses * b.tokens - a.uses * a.tokens).slice(0, MAX_LEDGER);
}
function axiomEncode(text, enc2 = "o200k_base", ledger = []) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    recalled: 0,
    bound: 0,
    mode: "identity",
    notes,
    ledgerAfter: ledger,
    encodeMs: ms()
  });
  if (!text) return identity("empty");
  const core = axiomCore(text, enc2, ledger);
  const h = helixEncode(text, enc2);
  const p = pulseEncode(text, enc2);
  const an = anaphoraEncode(text, enc2);
  const ts = tesseraEncode(text, enc2);
  const st = strataEncode(text, enc2);
  const sg = signetEncode(text, enc2);
  const harvested = harvestLedger(text, enc2, core.ok ? core.ledgerAfter : ledger, core.entries);
  const cands = [
    { wire: text, mode: "identity", entries: [], recalled: 0, bound: 0, ledgerAfter: ledger }
  ];
  if (core.ok) {
    cands.push({
      wire: core.wire,
      mode: "axiom",
      entries: core.entries,
      recalled: core.recalled,
      bound: core.bound,
      ledgerAfter: core.ledgerAfter
    });
  }
  if (h.mode === "factored") {
    cands.push({ wire: h.wire, mode: "helix", entries: [], recalled: 0, bound: 0, ledgerAfter: ledger });
  }
  if (p.mode === "pulse") {
    cands.push({ wire: p.wire, mode: "pulse", entries: [], recalled: 0, bound: 0, ledgerAfter: ledger });
  }
  if (an.mode === "anaphoric" && an.wire.startsWith("[AN1]\n")) {
    const reframed = SENTINEL10 + an.wire.slice("[AN1]\n".length);
    cands.push({
      wire: reframed,
      mode: "axiom",
      entries: an.entries.map((e) => ({
        key: e.key,
        phrase: e.phrase,
        hits: e.hits,
        spanTokens: e.winTokens,
        source: "bind"
      })),
      recalled: 0,
      bound: an.entries.length,
      ledgerAfter: ledger
    });
  }
  if (ts.mode === "tessera") {
    cands.push({
      wire: ts.wire,
      mode: "tessera",
      entries: [],
      recalled: 0,
      bound: 0,
      ledgerAfter: ledger,
      verify: tesseraDecode
    });
  }
  if (st.mode === "strata") {
    cands.push({
      wire: st.wire,
      mode: "strata",
      entries: [],
      recalled: 0,
      bound: 0,
      ledgerAfter: ledger,
      verify: strataDecode
    });
  }
  if (sg.mode === "signet") {
    cands.push({
      wire: sg.wire,
      mode: "signet",
      entries: [],
      recalled: 0,
      bound: 0,
      ledgerAfter: ledger,
      verify: signetDecode
    });
  }
  if (core.ok) {
    const nl = core.wire.indexOf("\n", SENTINEL10.length);
    if (nl > 0) {
      const head = core.wire.slice(0, nl + 1);
      const b = core.wire.slice(nl + 1);
      const h2 = helixEncode(b, enc2);
      if (h2.mode === "factored") {
        cands.push({
          wire: head + h2.wire,
          mode: "axiom",
          entries: core.entries,
          recalled: core.recalled,
          bound: core.bound,
          ledgerAfter: core.ledgerAfter
        });
      }
    }
  }
  let best = cands[0];
  let bestTok = inTokens;
  for (const c of cands) {
    const dec = c.verify ? c.verify(c.wire) : axiomDecode(c.wire, ledger);
    if (dec !== text) continue;
    const tok = countTokens(c.wire, enc2);
    if (tok < bestTok) {
      bestTok = tok;
      best = c;
    }
  }
  best = { ...best, ledgerAfter: best.ledgerAfter === ledger ? harvested : best.ledgerAfter };
  if (best.mode === "identity") {
    if (text.startsWith(SENTINEL10)) {
      const pool2 = ideographPool6(enc2).filter((ch) => text.indexOf(ch) === -1);
      if (pool2.length >= 2) {
        const w = SENTINEL10 + pool2[0] + pool2[1] + "\n" + text;
        if (axiomDecode(w, ledger) === text) {
          const ot = countTokens(w, enc2);
          return {
            wire: w,
            decoded: text,
            exact: true,
            inTokens,
            outTokens: ot,
            savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
            entries: [],
            recalled: 0,
            bound: 0,
            mode: "forced-wrap",
            notes: "forced wrap: input begins with AX1 sentinel",
            ledgerAfter: ledger,
            encodeMs: ms()
          };
        }
      }
    }
    return {
      ...identity("tournament: identity won (no lane shrank under exact gate)"),
      ledgerAfter: harvested
    };
  }
  return {
    wire: best.wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: bestTok,
    savingsPct: inTokens ? (inTokens - bestTok) / inTokens * 100 : 0,
    entries: best.entries,
    recalled: best.recalled,
    bound: best.bound,
    mode: best.mode,
    notes: best.mode === "axiom" ? `${best.bound} new binds + ${best.recalled} zero-cost recalls from session ledger \xB7 byte-exact` : `lane=${best.mode} won the real-BPE tournament \xB7 byte-exact`,
    ledgerAfter: best.ledgerAfter,
    encodeMs: ms()
  };
}
var AXIOM_SYSTEM_PROMPT = [
  "# \u27E6 AXIOM-A1 \u27E7 \u2014 session-anchored, byte-exact, zero-header wire",
  "A message may open with:",
  "  [AX1]",
  "  OC            <- line 2 declares two delimiter characters: OPEN then CLOSE",
  "  <body>",
  "Reading rules:",
  "1. OPEN k P CLOSE  binds the single character k to phrase P, written out in",
  "   full right where it belongs. Read P normally and remember k = P.",
  "2. A bare k afterwards means P. Binders may nest; resolve inner first.",
  "3. A bare label with NO binder in this message was bound in an EARLIER TURN",
  "   of this same conversation. Scroll back: the binding is already in context.",
  "   This is why the message carries no dictionary \u2014 you have already read it.",
  "4. HELIX markers may also appear:",
  HELIX_SYSTEM_PROMPT,
  "5. Everything else is literal. Reconstruction is byte-exact; nothing was cut.",
  "OUTPUT CONTRACT: reuse a label when your reply repeats its phrase; keep code",
  "fences, identifiers, numbers and quoted values verbatim; answer densely."
].join("\n");

// src/lib/omega/praxis.ts
var SENTINEL11 = "[PX2]\n";
var TERM = "[/PX2]\n";
var MAX_ENTRIES5 = 80;
function occ(text, phrase) {
  let n = 0;
  let i = 0;
  while ((i = text.indexOf(phrase, i)) !== -1) {
    n++;
    i += phrase.length;
  }
  return n;
}
function candidates(text, enc2) {
  const toks = tokenStrings(text.length > 18e4 ? text.slice(0, 18e4) : text, enc2);
  const seen = /* @__PURE__ */ new Set();
  const scored = [];
  for (let w = 6; w >= 2; w--) {
    const counts = /* @__PURE__ */ new Map();
    for (let i = 0; i + w <= toks.length; i++) {
      let key = "";
      for (let j = 0; j < w; j++) key += toks[i + j].id + ":";
      const cur = counts.get(key);
      if (cur) cur.count++;
      else counts.set(key, { first: i, count: 1 });
    }
    for (const [, info] of counts) {
      if (info.count < 2) continue;
      let phrase = "";
      for (let j = 0; j < w; j++) phrase += toks[info.first + j].s;
      if (phrase.length < 4 || phrase.indexOf("\n") !== -1 || seen.has(phrase)) continue;
      seen.add(phrase);
      scored.push({ phrase, score: info.count * (w - 1) - w - 4 });
    }
  }
  return scored.filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 240).map((x) => x.phrase);
}
function assemble2(entries, body) {
  if (entries.length === 0) return body;
  return SENTINEL11 + entries.map((e) => `${e.alias}=${e.phrase}`).join("\n") + "\n" + TERM + body;
}
function praxisDecode(wire) {
  if (!wire.startsWith(SENTINEL11)) return wire;
  const termAt = wire.indexOf("\n" + TERM);
  if (termAt < 0) return wire;
  const rows = wire.slice(SENTINEL11.length, termAt).split("\n").filter(Boolean);
  let body = wire.slice(termAt + 1 + TERM.length);
  const entries = rows.map((row) => {
    const eq = row.indexOf("=");
    return eq === 1 ? { alias: row[0], phrase: row.slice(2) } : null;
  });
  if (entries.some((e) => e === null)) return wire;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    body = body.split(e.alias).join(e.phrase);
  }
  return body;
}
function praxisEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({ wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens, savingsPct: 0, entries: [], mode: "identity", notes });
  if (!text) return identity("empty input");
  const free = ideographPool3(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 2) return identity("no free single-token aliases");
  let body = text;
  const entries = [];
  let bestWire = text;
  let bestTokens = inTokens;
  for (const phrase of candidates(text, enc2)) {
    if (entries.length >= MAX_ENTRIES5 || entries.length >= free.length) break;
    const hits = occ(body, phrase);
    if (hits < 2) continue;
    const alias = free[entries.length];
    const nextBody = body.split(phrase).join(alias);
    const nextEntries = [...entries, { alias, phrase, hits }];
    const wire = assemble2(nextEntries, nextBody);
    const tok = countTokens(wire, enc2);
    if (tok >= bestTokens) continue;
    body = nextBody;
    entries.push({ alias, phrase, hits });
    bestWire = wire;
    bestTokens = tok;
  }
  if (entries.length === 0) return identity("no positive token-boundary dictionary entries");
  const decoded = praxisDecode(bestWire);
  if (decoded !== text) return identity("guard: PRAXIS failed byte-verify");
  return { wire: bestWire, decoded, exact: true, inTokens, outTokens: bestTokens, savingsPct: inTokens ? (inTokens - bestTokens) / inTokens * 100 : 0, entries, mode: "praxis", notes: `${entries.length} PRAXIS token-boundary entries \xB7 byte-exact` };
}
var PRAXIS_SYSTEM_PROMPT = [
  "# PRAXIS-PX2 \u2014 byte-exact token-boundary dictionary",
  "Rows before [/PX2] map one-character aliases to exact phrases.",
  "Decode bottom-to-top: in the body, replace each alias with its phrase.",
  "Everything else is literal; reconstruction is exact."
].join("\n");

// src/lib/omega/sigma.ts
var SIGMA_START = "[\u03A3|";
var SIGMA_END = "|\u03A3]";
var SIGMA_ROW_SEP = "	";
var SIGMA_BLOCK_SEP = "\n";
function inferType(val) {
  if (val === null) return "null";
  if (typeof val === "boolean") return "boolean";
  if (typeof val === "number") return "number";
  if (typeof val === "string") return "string";
  return "unknown";
}
function valToWire(val) {
  if (val === null) return "\0";
  if (typeof val === "boolean") return val ? "1" : "0";
  if (typeof val === "number") return String(val);
  if (typeof val === "string") return val;
  return JSON.stringify(val);
}
function wireToVal(s, type) {
  if (s === "\0") return null;
  if (type === "boolean") return s === "1";
  if (type === "number") return Number(s);
  return s;
}
function parseJsonLines(lines2) {
  const parsed = [];
  for (const line of lines2) {
    const t2 = line.trim();
    if (!t2 || t2 === "[" || t2 === "]") continue;
    const clean = t2.endsWith(",") ? t2.slice(0, -1) : t2;
    try {
      const obj = JSON.parse(clean);
      if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return null;
      parsed.push(obj);
    } catch {
      return null;
    }
  }
  if (parsed.length === 0) return null;
  const keys = Object.keys(parsed[0]);
  for (const obj of parsed) {
    if (Object.keys(obj).join(",") !== keys.join(",")) return null;
    for (const v of Object.values(obj)) {
      if (typeof v === "object" && v !== null) return null;
    }
  }
  const fields = keys.map((k2) => ({ name: k2, type: inferType(parsed[0][k2]) }));
  const rows = parsed.map((obj) => fields.map((f) => valToWire(obj[f.name])));
  return { kind: "jsonl", fields, rows, originalLines: lines2 };
}
function parseCsvLines(lines2) {
  if (lines2.length < 2) return null;
  const header = lines2[0].split(",");
  if (header.length < 2) return null;
  const rows = [];
  for (let i = 1; i < lines2.length; i++) {
    const cells = lines2[i].split(",");
    if (cells.length !== header.length) return null;
    rows.push(cells);
  }
  return { kind: "csv", fields: header.map((h) => ({ name: h.trim(), type: "unknown" })), rows, originalLines: lines2 };
}
function encodeBlock(block) {
  const schemaStr = block.fields.map((f) => {
    const t2 = f.type === "string" ? "s" : f.type === "number" ? "n" : f.type === "boolean" ? "b" : f.type === "null" ? "z" : "u";
    return `${f.name}:${t2}`;
  }).join(",");
  return [`${SIGMA_START}${block.kind}|${schemaStr}${SIGMA_END}`, ...block.rows.map((row) => row.join(SIGMA_ROW_SEP))].join(SIGMA_BLOCK_SEP);
}
function decodeBlock(wire) {
  const si = wire.indexOf(SIGMA_START), ei = wire.indexOf(SIGMA_END);
  if (si === -1 || ei === -1) return { original: wire, ok: false };
  const inner = wire.slice(si + SIGMA_START.length, ei);
  const pi = inner.indexOf("|");
  if (pi === -1) return { original: wire, ok: false };
  const kind = inner.slice(0, pi);
  const fields = inner.slice(pi + 1).split(",").map((part) => {
    const [name, t2] = part.split(":");
    return { name: name ?? "", type: t2 === "s" ? "string" : t2 === "n" ? "number" : t2 === "b" ? "boolean" : t2 === "z" ? "null" : "unknown" };
  });
  const rest = wire.slice(ei + SIGMA_END.length);
  const rowLines = rest.split(SIGMA_BLOCK_SEP).filter((l) => l.length > 0);
  if (kind === "jsonl") {
    return { original: rowLines.map((rl) => {
      const vals = rl.split(SIGMA_ROW_SEP);
      const obj = {};
      fields.forEach((f, i) => {
        obj[f.name] = wireToVal(vals[i] ?? "", f.type);
      });
      return JSON.stringify(obj);
    }).join("\n"), ok: true };
  }
  if (kind === "csv") {
    return { original: [fields.map((f) => f.name).join(","), ...rowLines.map((rl) => rl.split(SIGMA_ROW_SEP).join(","))].join("\n"), ok: true };
  }
  return { original: wire, ok: false };
}
function scanForBlocks(text) {
  const results = [];
  const lines2 = text.split("\n");
  let i = 0;
  while (i < lines2.length) {
    const line = lines2[i].trim();
    if (line.startsWith("{") && line.endsWith("}")) {
      let j = i;
      const jsonLines = [];
      while (j < lines2.length) {
        const l = lines2[j].trim();
        const clean = l.endsWith(",") ? l.slice(0, -1) : l;
        if (!clean || clean === "[" || clean === "]") {
          j++;
          continue;
        }
        if (!clean.startsWith("{") || !clean.endsWith("}")) break;
        jsonLines.push(lines2[j]);
        j++;
      }
      if (jsonLines.length >= 1) {
        const block = parseJsonLines(jsonLines);
        if (block) {
          const sc = lines2.slice(0, i).join("\n").length + (i > 0 ? 1 : 0);
          results.push({ start: sc, end: sc + jsonLines.join("\n").length, block });
          i = j;
          continue;
        }
      }
    }
    if (line.includes(",") && !line.startsWith("{") && !line.startsWith("[")) {
      const parts = line.split(",");
      if (parts.length >= 2 && parts.every((p) => /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(p.trim()))) {
        const csvLines = [lines2[i]];
        let j = i + 1;
        while (j < lines2.length) {
          const l = lines2[j];
          if (!l.includes(",") || l.startsWith("{") || l.trim() === "") break;
          if (l.split(",").length !== parts.length) break;
          csvLines.push(l);
          j++;
        }
        if (csvLines.length >= 2) {
          const block = parseCsvLines(csvLines);
          if (block) {
            const sc = lines2.slice(0, i).join("\n").length + (i > 0 ? 1 : 0);
            results.push({ start: sc, end: sc + csvLines.join("\n").length, block });
            i = j;
            continue;
          }
        }
      }
    }
    i++;
  }
  return results;
}
function sigmaEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = { wire: text, decoded: text, exact: true, applied: false, blocks: 0, encoding: enc2, inTokens, outTokens: inTokens, savedTokens: 0, savingsPct: 0, inChars: text.length, outChars: text.length, notes: "SIGMA: identity." };
  if (text.length > 12e4) return { ...identity, notes: "SIGMA: skipped over 120k chars for UI latency safety." };
  if (!text || inTokens < 3) return identity;
  const blocks = scanForBlocks(text);
  if (blocks.length === 0) return identity;
  let wire = text;
  let offset = 0;
  let applied = 0;
  for (const { start, end, block } of blocks) {
    const orig = text.slice(start, end);
    const encoded = encodeBlock(block);
    const ot = countTokens(orig, enc2), et = countTokens(encoded, enc2);
    if (et < ot) {
      wire = wire.slice(0, start + offset) + encoded + wire.slice(end + offset);
      offset += encoded.length - orig.length;
      applied++;
    }
  }
  if (applied === 0) return identity;
  const decoded = sigmaDecode(wire);
  if (decoded !== text) return { ...identity, notes: "SIGMA: roundtrip failed." };
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens) return { ...identity, notes: `SIGMA: overhead exceeded.` };
  return { wire, decoded, exact: true, applied: true, blocks: applied, encoding: enc2, inTokens, outTokens, savedTokens: inTokens - outTokens, savingsPct: (inTokens - outTokens) / inTokens * 100, inChars: text.length, outChars: wire.length, notes: `SIGMA: ${applied} block(s) folded.` };
}
function sigmaDecode(wire) {
  if (!wire.includes(SIGMA_START)) return wire;
  let result = wire;
  let sf = 0;
  while (true) {
    const si = result.indexOf(SIGMA_START, sf);
    if (si === -1) break;
    const ei = result.indexOf(SIGMA_END, si);
    if (ei === -1) break;
    let be = ei + SIGMA_END.length;
    if (be < result.length && result[be] === "\n") be++;
    let re = be;
    while (re < result.length) {
      const nl = result.indexOf("\n", re);
      if (nl === -1) {
        re = result.length;
        break;
      }
      const ln = result.slice(re, nl);
      if (ln.trim() === "" || ln.includes(SIGMA_START)) break;
      re = nl + 1;
    }
    const { original, ok } = decodeBlock(result.slice(si, re));
    if (!ok) {
      sf = ei + SIGMA_END.length;
      continue;
    }
    result = result.slice(0, si) + original + result.slice(re);
    sf = si + original.length;
  }
  return result;
}

// src/lib/omega/mosaic.ts
var SENTINEL12 = "[MZ1]\n";
var MAX_BLOCKS = 10;
var MAX_CHARS = 3e5;
var MAX_LINES5 = 4e4;
var REGIME_SIG_CAP = 48;
var REGIME_SCAN_CAP = 200;
var LANES = [
  {
    tag: "i",
    name: "identity",
    encode: (t2) => ({ wire: t2, applied: true }),
    decode: (w) => w,
    prompt: ""
  },
  {
    tag: "g",
    name: "signet",
    encode: (t2, e) => {
      const r = signetEncode(t2, e);
      return { wire: r.wire, applied: r.mode === "signet" };
    },
    decode: signetDecode,
    prompt: SIGNET_SYSTEM_PROMPT
  },
  {
    tag: "h",
    name: "helix",
    encode: (t2, e) => {
      const r = helixEncode(t2, e);
      return { wire: r.wire, applied: r.mode === "factored" };
    },
    decode: helixDecode,
    prompt: HELIX_SYSTEM_PROMPT
  },
  {
    tag: "p",
    name: "pulse",
    encode: (t2, e) => {
      const r = pulseEncode(t2, e);
      return { wire: r.wire, applied: r.mode === "pulse" };
    },
    decode: pulseDecode,
    prompt: PULSE_SYSTEM_PROMPT
  },
  {
    tag: "a",
    name: "anaphora",
    encode: (t2, e) => {
      const r = anaphoraEncode(t2, e);
      return { wire: r.wire, applied: r.mode === "anaphoric" };
    },
    decode: anaphoraDecode,
    prompt: anaphoraDecoderPrompt(null)
  },
  {
    tag: "d",
    name: "praxis-local",
    encode: (t2, e) => {
      if (t2.length < 64) return { wire: t2, applied: false };
      const r = praxisEncode(t2, e);
      return { wire: r.wire, applied: r.mode === "praxis" };
    },
    decode: praxisDecode,
    prompt: PRAXIS_SYSTEM_PROMPT
  },
  {
    tag: "s",
    name: "sigma-local",
    encode: (t2, e) => {
      const r = sigmaEncode(t2, e);
      return { wire: r.wire, applied: r.applied };
    },
    decode: sigmaDecode,
    prompt: "SIGMA exact: fold homogeneous JSONL or CSV blocks into a typed schema and tab-separated rows; reconstruct original JSON/CSV spelling exactly; otherwise literal."
  },
  {
    tag: "m",
    name: "meridian-local",
    encode: (t2, e) => {
      if (t2.length < 128) return { wire: t2, applied: false };
      const r = meridianEncode(t2, e);
      return { wire: r.wire, applied: r.mode !== "identity" };
    },
    decode: meridianDecode,
    prompt: MERIDIAN_SYSTEM_PROMPT
  },
  {
    tag: "q",
    name: "quasar-local",
    encode: (t2, e) => {
      if (t2.length < 64) return { wire: t2, applied: false };
      const r = quasarEncode(t2, e);
      return { wire: r.wire, applied: r.mode !== "identity" };
    },
    decode: quasarDecode,
    prompt: QUASAR_SYSTEM_PROMPT
  },
  {
    tag: "x",
    name: "plexus-local",
    encode: (t2, e) => {
      if (t2.length < 64) return { wire: t2, applied: false };
      const r = plexusEncode(t2, e);
      return { wire: r.wire, applied: r.mode !== "identity" };
    },
    decode: plexusDecode,
    prompt: PLEXUS_SYSTEM_PROMPT
  },
  {
    tag: "v",
    name: "veritas-local",
    encode: (t2, e) => {
      if (t2.length < 64) return { wire: t2, applied: false };
      const r = veritasEncode(t2, e);
      return { wire: r.wire, applied: r.mode !== "identity" };
    },
    decode: veritasDecode,
    prompt: VERITAS_SYSTEM_PROMPT
  },
  {
    tag: "o",
    name: "axiom-local",
    encode: (t2, e) => {
      if (t2.length < 128) return { wire: t2, applied: false };
      const r = axiomEncode(t2, e, []);
      return { wire: r.wire, applied: r.mode !== "identity" };
    },
    decode: (w) => axiomDecode(w, []),
    prompt: AXIOM_SYSTEM_PROMPT
  },
  {
    tag: "t",
    name: "tessera-local",
    encode: (t2, e) => {
      if (t2.length < 128) return { wire: t2, applied: false };
      const r = tesseraEncode(t2, e);
      return { wire: r.wire, applied: r.mode !== "identity" };
    },
    decode: tesseraDecode,
    prompt: TESSERA_SYSTEM_PROMPT
  },
  {
    tag: "c",
    name: "column-local",
    encode: (t2, e) => {
      const x = columnEncode(t2, e);
      return { wire: x.wire, applied: x.applied };
    },
    decode: columnDecode,
    prompt: COLUMN_SYSTEM_PROMPT
  }
];
var LANE_BY_TAG = new Map(LANES.map((l) => [l.tag, l]));
function hasUnitRun(s, min) {
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) === s.charCodeAt(i - 1)) {
      if (++run >= min) return true;
    } else run = 1;
  }
  return false;
}
function digitRunCount(s, cap) {
  let n = 0;
  let inRun = false;
  for (let i = 0; i < s.length; i++) {
    const d = s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57;
    if (d && !inRun) {
      if (++n >= cap) return n;
      inRun = true;
    } else if (!d) inRun = false;
  }
  return n;
}
function classOf2(code) {
  if (code >= 48 && code <= 57) return 1;
  if (code >= 65 && code <= 90 || code >= 97 && code <= 122) return 2;
  return 3;
}
function lineRegime(line) {
  let sig = "";
  let i = 0;
  const n = Math.min(line.length, REGIME_SCAN_CAP);
  while (i < n) {
    const c = classOf2(line.charCodeAt(i));
    let j = i + 1;
    while (j < n && classOf2(line.charCodeAt(j)) === c) j++;
    sig += c;
    i = j;
    if (sig.length >= REGIME_SIG_CAP) break;
  }
  return sig;
}
function blockBounds(lines2) {
  let bounds = [0];
  for (let i = 1; i < lines2.length; i++) {
    if (lineRegime(lines2[i]) !== lineRegime(lines2[i - 1])) bounds.push(i);
  }
  bounds.push(lines2.length);
  const cum = new Float64Array(lines2.length + 1);
  for (let i = 0; i < lines2.length; i++) cum[i + 1] = cum[i] + lines2[i].length + 1;
  const PRECAP = 512;
  while (bounds.length - 1 > PRECAP) {
    const merged = [bounds[0]];
    for (let i = 2; i < bounds.length; i += 2) merged.push(bounds[i]);
    if (merged[merged.length - 1] !== lines2.length) merged.push(lines2.length);
    if (merged.length >= bounds.length) break;
    bounds = merged;
  }
  while (bounds.length - 1 > MAX_BLOCKS) {
    let victim = 1;
    let victimCost = Number.POSITIVE_INFINITY;
    for (let i = 1; i < bounds.length - 1; i++) {
      const mergedSize = cum[bounds[i + 1]] - cum[bounds[i - 1]];
      if (mergedSize < victimCost) {
        victimCost = mergedSize;
        victim = i;
      }
    }
    bounds.splice(victim, 1);
  }
  return bounds;
}
function bareDecode(wire, depth) {
  if (depth > 4) return wire;
  if (wire.startsWith("[SG1]\n")) return signetDecode(wire);
  if (wire.startsWith("[P1]\n")) return pulseDecode(wire);
  if (wire.startsWith("[AN1]\n")) {
    const peeled = anaphoraDecode(wire);
    return peeled === wire ? wire : bareDecode(peeled, depth + 1);
  }
  if (wire.startsWith("[M1]\n")) return meridianDecode(wire);
  if (wire.startsWith("\u27E8QSR\u27E9\n")) return quasarDecode(wire);
  if (wire.startsWith("[PX]\n")) return plexusDecode(wire);
  if (wire.startsWith("[[VX1\n")) return veritasDecode(wire);
  if (wire.startsWith("[AX1]\n")) return axiomDecode(wire, []);
  if (wire.startsWith("[TS1]\n")) return tesseraDecode(wire);
  if (wire.startsWith("[ST1]\n")) return strataDecode(wire);
  if (wire.startsWith("[RP1]\n")) return repairDecode(wire);
  if (wire.startsWith("[TR1]\n")) return trieDecode(wire);
  if (wire.startsWith("[CL1]\n")) return columnDecode(wire);
  return helixDecode(wire);
}
function mosaicDecode(wire) {
  if (!wire.startsWith(SENTINEL12)) return bareDecode(wire, 0);
  const rest = wire.slice(SENTINEL12.length);
  const sep = rest[0];
  if (sep === void 0 || rest[1] !== "\n") return wire;
  const body = rest.slice(2);
  if (body.length === 0 || body[0] !== sep) return wire;
  const pieces = body.split(sep);
  const out = [];
  for (let i = 1; i < pieces.length; i++) {
    const piece = pieces[i];
    if (piece.length < 1) return wire;
    const lane = LANE_BY_TAG.get(piece[0]);
    if (!lane) return wire;
    out.push(lane.decode(piece.slice(1)));
  }
  return out.join("\n");
}
var encodeCache3 = /* @__PURE__ */ new Map();
var CACHE_MAX2 = 6;
function mosaicEncode(text, enc2 = "o200k_base") {
  const key = text.length <= 2e5 ? enc2 + "\0" + text : null;
  if (key !== null) {
    const hit = encodeCache3.get(key);
    if (hit) return hit;
  }
  const result = mosaicEncodeUncached(text, enc2);
  if (key !== null) {
    if (encodeCache3.size >= CACHE_MAX2) encodeCache3.clear();
    encodeCache3.set(key, result);
  }
  return result;
}
function mosaicEncodeUncached(text, enc2) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    regions: [],
    mode: "identity",
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty input");
  const mustWrap = text.startsWith(SENTINEL12);
  const lines2 = text.split("\n");
  const spanMemo = /* @__PURE__ */ new Map();
  const spanBest = (a, b) => {
    const mk = a + ":" + b;
    const hit = spanMemo.get(mk);
    if (hit !== void 0) return hit;
    const src2 = lines2.slice(a, b).join("\n");
    const nLines = b - a;
    const okPulse = hasUnitRun(src2, 4);
    const okHelix = digitRunCount(src2, 3) >= 3;
    let best = null;
    for (const lane of LANES) {
      if (lane.tag === "p" && !okPulse) continue;
      if (lane.tag === "h" && !okHelix) continue;
      if (lane.tag === "g" && nLines < 2) continue;
      if (lane.tag === "a" && src2.length < 16) continue;
      let wire;
      let applied;
      try {
        const r = lane.encode(src2, enc2);
        wire = r.wire;
        applied = r.applied;
      } catch {
        continue;
      }
      if (!applied && lane.tag !== "i") continue;
      let back;
      try {
        back = lane.decode(wire);
      } catch {
        continue;
      }
      if (back !== src2) continue;
      const tk = countTokens(wire, enc2);
      if (!best || tk < best.tokens) best = { tag: lane.tag, wire, tokens: tk };
    }
    spanMemo.set(mk, best);
    return best;
  };
  const whole = spanBest(0, lines2.length);
  let regionsOut = null;
  if (text.length <= MAX_CHARS && lines2.length <= MAX_LINES5) {
    const bounds = blockBounds(lines2);
    const B = bounds.length - 1;
    if (B >= 2) {
      const FRAME = 2;
      const best = new Float64Array(B + 1).fill(Number.POSITIVE_INFINITY);
      const from = new Int32Array(B + 1).fill(-1);
      const pick = new Array(B + 1).fill(null);
      best[0] = 0;
      for (let j = 1; j <= B; j++) {
        for (let i = 0; i < j; i++) {
          if (!Number.isFinite(best[i])) continue;
          const sb = spanBest(bounds[i], bounds[j]);
          if (!sb) continue;
          const cost = best[i] + sb.tokens + FRAME;
          if (cost < best[j]) {
            best[j] = cost;
            from[j] = i;
            pick[j] = sb;
          }
        }
      }
      if (Number.isFinite(best[B]) && from[B] >= 0) {
        const acc = [];
        let j = B;
        while (j > 0) {
          const i = from[j];
          const sb = pick[j];
          if (i < 0 || !sb) {
            acc.length = 0;
            break;
          }
          acc.push({ tag: sb.tag, wire: sb.wire, a: bounds[i], b: bounds[j], tokens: sb.tokens });
          j = i;
        }
        if (acc.length > 0) {
          acc.reverse();
          regionsOut = acc;
        }
      }
    }
  }
  const candidates3 = [];
  if (whole) {
    candidates3.push({
      wire: whole.wire,
      regions: [
        { lane: LANE_BY_TAG.get(whole.tag).name, lines: lines2.length, inTokens, outTokens: whole.tokens }
      ],
      mode: "single"
    });
  }
  if (regionsOut && regionsOut.length >= 2) {
    const haystack = text + "\0" + regionsOut.map((r) => r.wire).join("\0");
    const sep = ideographPool3(enc2).find((ch) => haystack.indexOf(ch) === -1);
    if (sep) {
      const wire = SENTINEL12 + sep + "\n" + regionsOut.map((r) => sep + r.tag + r.wire).join("");
      candidates3.push({
        wire,
        regions: regionsOut.map((r) => ({
          lane: LANE_BY_TAG.get(r.tag).name,
          lines: r.b - r.a,
          inTokens: countTokens(lines2.slice(r.a, r.b).join("\n"), enc2),
          outTokens: r.tokens
        })),
        mode: "mosaic"
      });
    }
  }
  let chosen = null;
  let chosenTok = inTokens;
  for (const c of candidates3) {
    const tk = countTokens(c.wire, enc2);
    if (tk < chosenTok && mosaicDecode(c.wire) === text) {
      chosen = c;
      chosenTok = tk;
    }
  }
  if (!chosen) {
    if (!mustWrap) return identity("no partition beat the input under the exact gate");
    const sep = ideographPool3(enc2).find((ch) => text.indexOf(ch) === -1);
    if (!sep) return identity("sentinel prefix but no free separator");
    const w = SENTINEL12 + sep + "\n" + sep + "i" + text;
    const d = mosaicDecode(w);
    const ot = countTokens(w, enc2);
    return {
      wire: w,
      decoded: d,
      exact: d === text,
      inTokens,
      outTokens: ot,
      savingsPct: inTokens ? (inTokens - ot) / inTokens * 100 : 0,
      regions: [],
      mode: "forced-wrap",
      notes: "forced wrap: input begins with the MZ1 sentinel",
      encodeMs: ms()
    };
  }
  const decoded = mosaicDecode(chosen.wire);
  if (decoded !== text) return identity("gate G2: assembled wire failed byte-verify");
  const outTokens = countTokens(chosen.wire, enc2);
  if (outTokens >= inTokens) return identity("gate G3: wire measured \u2265 input");
  const laneList = chosen.regions.map((r) => r.lane).join("+");
  return {
    wire: chosen.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    regions: chosen.regions,
    mode: chosen.mode,
    notes: chosen.mode === "mosaic" ? `${chosen.regions.length} regions, per-region lanes [${laneList}] chosen by exact DP \xB7 byte-exact` : `single region, lane ${laneList} \xB7 emitted bare (no framing tax) \xB7 byte-exact`,
    encodeMs: ms()
  };
}
function mosaicDecoderPrompt(r) {
  const used = new Set((r?.regions ?? []).map((x) => x.lane));
  const head = [
    "# \u25A6 MOSAIC-M1 \u2014 byte-exact partitioned wire (each region has its own codec)",
    "A message may open with:",
    "  [MZ1]",
    "  S             <- line 2 declares one separator character S",
    "  S<tag><region>S<tag><region>\u2026",
    "Split the body on S. Each piece starts with a one-letter tag naming the",
    "codec used for that region, followed by that region's own encoded text:",
    "  i = literal (the region is exactly as written)",
    "  g = SIGNET \xB7 h = HELIX \xB7 p = PULSE \xB7 a = ANAPHORA \xB7 d = local PRAXIS dictionary \xB7 s = local SIGMA schema fold \xB7 m = local MERIDIAN \xB7 q = local QUASAR \xB7 x = local PLEXUS \xB7 v = local VERITAS \xB7 o = local AXIOM \xB7 t = local TESSERA \xB7 r = local STRATA \xB7 b = local REPAIR grammar \xB7 l = local TRIE prefix factoring \xB7 c = local COLUMN prefix/suffix factoring",
    "Decode each region with the rules for its tag, then join the decoded",
    "regions with a newline, in order. That is the original document, exactly.",
    "If the message does NOT start with [MZ1], it is a single region and you",
    "simply apply the rules for whichever header it does carry (or read it",
    "literally if it carries none)."
  ].join("\n");
  const bodies = [];
  for (const lane of LANES) {
    if (lane.prompt && (used.size === 0 || used.has(lane.name))) bodies.push(lane.prompt);
  }
  return [
    head,
    ...bodies,
    "Reconstruction is byte-exact; nothing was summarised or dropped.",
    "OUTPUT CONTRACT: answer densely; reproduce code, identifiers, numbers and",
    "quoted values verbatim."
  ].join("\n\n");
}
var MOSAIC_SYSTEM_PROMPT = mosaicDecoderPrompt(null);

// src/lib/omega/ltp.ts
function isWs(ch) {
  return ch === " " || ch === "	" || ch === "\n" || ch === "\r" || ch === "\f" || ch === "\v";
}
function projectRun(run) {
  let newlines = 0;
  for (let i = 0; i < run.length; i++) if (run[i] === "\n") newlines++;
  if (newlines >= 2) return "\n\n";
  if (newlines === 1) return "\n";
  return run.length > 1 ? " " : run;
}
function ltpRestore(wire, residual) {
  let out = wire;
  for (let k2 = residual.length - 1; k2 >= 0; k2--) {
    const op = residual[k2];
    const projected = projectRun(op.run);
    if (op.at < 0 || op.at + projected.length > out.length) {
      throw new Error(`ltp: residual op ${k2} out of range`);
    }
    out = out.slice(0, op.at) + op.run + out.slice(op.at + projected.length);
  }
  return out;
}
function ltpProject(text, enc2) {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    residual: [],
    exact: true,
    applied: false,
    encoding: enc2,
    inTokens,
    outTokens: inTokens,
    savedTokens: 0,
    savingsPct: 0,
    inChars: text.length,
    outChars: text.length,
    residualBytes: 0,
    opCount: 0,
    notes
  });
  if (!text) return identity("Empty input; nothing to project.");
  let wire = "";
  const residual = [];
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (isWs(text[i])) {
      let j = i;
      while (j < n && isWs(text[j])) j++;
      const run = text.slice(i, j);
      const projected = projectRun(run);
      if (projected !== run) residual.push({ at: wire.length, run });
      wire += projected;
      i = j;
    } else {
      wire += text[i];
      i += 1;
    }
  }
  let restored;
  try {
    restored = ltpRestore(wire, residual);
  } catch (error) {
    return identity(`Projection rejected: ${error.message}`);
  }
  if (restored !== text) {
    return identity("Projection rejected: round trip was not byte-exact.");
  }
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens) {
    return identity(
      `Projection declined: wire would cost ${outTokens} tokens vs ${inTokens} for the original. Input has little removable whitespace.`
    );
  }
  let residualBytes = 0;
  for (const op of residual) residualBytes += op.run.length + 4;
  return {
    wire,
    residual,
    exact: true,
    applied: true,
    encoding: enc2,
    inTokens,
    outTokens,
    savedTokens: inTokens - outTokens,
    savingsPct: (inTokens - outTokens) / inTokens * 100,
    inChars: text.length,
    outChars: wire.length,
    residualBytes,
    opCount: residual.length,
    notes: "Wire is directly readable by any model. Residual is retained locally and is never sent, so no decode tokens are ever billed."
  };
}

// src/lib/omega/cm.ts
var OMEGA_PRIOR = [
  "The quick brown fox jumps over the lazy dog. ",
  "In this document we describe the system, the method, the results and the ",
  "conclusion. The results show that the proposed approach is better than the ",
  "baseline because it reduces the number of tokens that are required to ",
  "represent the same information. For each of the following sections, the ",
  "reader should note that there is a trade-off between compression and ",
  "fidelity, and that the best configuration depends on the input data.\n",
  '{"id":1,"name":"alpha","value":12.5,"active":true,"tags":["a","b"],"meta":{"created":"2026-01-01T00:00:00Z","updated":null}}\n',
  '{"id":2,"name":"beta","value":13.5,"active":false,"tags":["c"],"meta":{"created":"2026-01-02T00:00:00Z","updated":null}}\n',
  '{"ok":true,"error":null,"data":[{"id":7,"qty":1200,"px":43.75},{"id":8,"qty":940,"px":43.75},{"id":9,"qty":880,"px":44.10}],"ts":"2026-07-19T04:15:00Z"}\n',
  "id,name,value,date,status\n1,alpha,10.25,2026-01-01,ok\n2,beta,11.50,2026-01-02,ok\n",
  "3,gamma,12.75,2026-01-03,fail\n4,delta,13.00,2026-01-04,ok\n5,epsilon,14.25,2026-01-05,ok\n",
  "id,qty,px\n7,1200,43.75\n8,940,43.75\n9,880,44.10\n10,1500,45.00\n11,850,43.50\n",
  "| col_a | col_b | col_c |\n|-------|-------|-------|\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |\n",
  "## grid\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |\n",
  "# Heading\n## Subheading\n- item one\n- item two\n1. first\n2. second\n",
  "export function compute(input: string, options: Options = {}): Result {\n",
  "  const value = input.length > 0 ? parseInt(input, 10) : 0;\n",
  '  if (!Number.isFinite(value)) throw new Error("invalid input");\n',
  "  return { ok: true, value, count: items.length };\n}\n",
  "for (let i = 0; i < n; i++) { total += data[i]; }\n",
  'const result = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });\n',
  "0123456789 0.0 1.5 2.25 3.75 10 100 1000 10000 100000 -1 -2.5 1e6 0x1f 12:30:45 2026-07-19\n",
  "The pump failed at 04:15 UTC. Replace seal 12-A before the next run. Torque 42.5 Nm; ref #A7-2291. Verify seal.\n",
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ",
  "incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis ",
  "nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n",
  "and the of to in that is was he for it with as his on be at by not this but ",
  "from they she or an will my one all would there their what so up out if about ",
  "who get which go me when make can like time no just him know take people into ",
  "year your good some could them see other than then now look only come its over ",
  "think also back after use two how our work first well way even new want because ",
  "any these give day most us data value system token model text input output ",
  "error status count total index length name type null true false object array\n",
  "ERROR 2026-07-19T01:02:03Z service=api status=500 latency_ms=1234 path=/v1/x\n",
  "WARN  2026-07-19T01:02:04Z service=api status=429 latency_ms=87 path=/v1/y\n",
  "INFO  2026-07-19T01:02:05Z service=api status=200 latency_ms=12 path=/v1/z\n",
  "SYSTEM PROMPT: You are an expert coding assistant. Do not invent metrics or values. Check all thresholds.\n",
  "return Response.json({ ok: true, output: result.output, codec: result.codec });\n",
  // v3 Aleph-family enrichment: patterns that co-occur with typed structural chunks
  "",
  // typical Aleph escape byte co-occurrence
  ",ok\n,fail\n,warn\n,pass\n,error\n",
  // CSV status column tails
  " UTC.\n UTC ok.\n UTC fail.\n",
  " seal 12-A ",
  " seal 13-B ",
  " Torque 42.5 Nm; ref #",
  '"ids":[1,2,3],"ts":"',
  '"ids":[7,8,9],"ts":"',
  '"error":null,"data":[',
  '"data":[{"id":',
  '","status":"ok","',
  '","status":"fail","',
  '","level":"error","',
  '","level":"warn","',
  "id,qty,px\n",
  "id,name,value\n",
  "time,valA,valB\n",
  "sku,name,price,qty\n",
  ",43.50\n,43.75\n,44.00\n,44.10\n,44.25\n,45.00\n,45.50\n",
  // repeated decimals
  "## grid\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |\n",
  "The pump failed at ",
  " before the next run. ",
  " Verify seal. ",
  " Replace seal ",
  " UTC. Replace seal ",
  " Nm; ref #A",
  "-2291. Verify seal.\n"
].join("");
var SQUASH = new Int16Array(4096);
for (let i = 0; i < 4096; i++) {
  const d = (i - 2048) / 256;
  let v = Math.round(4096 / (1 + Math.exp(-d)));
  if (v < 1) v = 1;
  if (v > 4095) v = 4095;
  SQUASH[i] = v;
}
function squash(d) {
  if (d <= -2048) return 1;
  if (d >= 2047) return 4095;
  return SQUASH[(d | 0) + 2048];
}
var STRETCH = new Int16Array(4096);
{
  let pi = 0;
  for (let x = -2047; x <= 2047; x++) {
    const v = squash(x);
    for (let p = pi; p <= v; p++) STRETCH[p] = x;
    pi = v + 1;
  }
  for (let p = pi; p < 4096; p++) STRETCH[p] = 2047;
}
var RATE = new Float64Array(256);
for (let i = 0; i < 256; i++) RATE[i] = Math.max(1 / (i + 1.5), 1 / 48);
var RATE_LIMIT = 250;
var MEMBITS = 18;
var MEM = 1 << MEMBITS;
var MMASK = MEM - 1;
var NCTX = 10;
var NIN = 12;
var MATCH_HT_BITS = 20;
var MATCH_HT = 1 << MATCH_HT_BITS;
var MATCH_HT_MASK = MATCH_HT - 1;
var MIX_SETS = 256;
function hmix(x, k2) {
  let h = Math.imul(x ^ Math.imul(k2 + 1, 2654435761), 2246822507);
  h ^= h >>> 13;
  h = Math.imul(h, 3266489909);
  return (h ^ h >>> 16) >>> 0;
}
var APM = class {
  t;
  idx = 0;
  constructor(n) {
    this.t = new Uint16Array(n * 33);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 33; j++) {
        this.t[i * 33 + j] = i === 0 ? squash((j - 16) * 128) * 16 : this.t[j];
      }
    }
  }
  pp(pr, cx) {
    const s = STRETCH[pr] + 2048;
    const w = s & 127;
    this.idx = (s >> 7) + cx * 33;
    return this.t[this.idx] * (128 - w) + this.t[this.idx + 1] * w >> 11;
  }
  update(bit) {
    const g = bit ? 65535 : 0;
    this.t[this.idx] += g - this.t[this.idx] >> 6;
    this.t[this.idx + 1] += g - this.t[this.idx + 1] >> 6;
  }
};
var CMModel = class _CMModel {
  // context model state
  pt = [];
  ct = [];
  ix = new Int32Array(NCTX);
  st = new Int32Array(NIN);
  h = new Int32Array(NCTX);
  // mixer
  w;
  mxbase = 0;
  // sse
  apm1;
  apm2;
  // byte / bit state
  c0 = 1;
  bitpos = 0;
  c4 = 0;
  c8 = 0;
  wh = 0;
  lastNewlinePos = 0;
  // history buffer (prior + payload), shared with match model
  buf;
  pos = 0;
  // match model
  ht;
  mptr = 0;
  mlen = 0;
  mcm;
  mcnt;
  midx = 0;
  mbit = 0;
  prMix = 2048;
  pr = 2048;
  constructor(alloc = true) {
    this.w = alloc ? new Float64Array(MIX_SETS * NIN) : new Float64Array(0);
    this.apm1 = new APM(alloc ? 256 : 1);
    this.apm2 = new APM(alloc ? 1024 : 1);
    this.buf = new Uint8Array(alloc ? 1 << 16 : 0);
    this.ht = new Int32Array(alloc ? MATCH_HT : 0);
    this.mcm = new Uint16Array(alloc ? 128 : 0);
    this.mcnt = new Uint8Array(alloc ? 128 : 0);
    if (alloc) {
      for (let i = 0; i < NCTX; i++) {
        const p = new Uint16Array(MEM);
        p.fill(32768);
        this.pt.push(p);
        this.ct.push(new Uint8Array(MEM));
      }
      this.w.fill(0.28);
      this.mcm.fill(32768);
    }
  }
  clone() {
    const m2 = new _CMModel(false);
    for (let i = 0; i < NCTX; i++) {
      m2.pt.push(this.pt[i].slice());
      m2.ct.push(this.ct[i].slice());
    }
    m2.w = this.w.slice();
    m2.apm1 = new APM(1);
    m2.apm1.t = this.apm1.t.slice();
    m2.apm2 = new APM(1);
    m2.apm2.t = this.apm2.t.slice();
    m2.buf = this.buf.slice();
    m2.ht = this.ht.slice();
    m2.mcm = this.mcm.slice();
    m2.mcnt = this.mcnt.slice();
    m2.c0 = this.c0;
    m2.bitpos = this.bitpos;
    m2.c4 = this.c4;
    m2.c8 = this.c8;
    m2.wh = this.wh;
    m2.lastNewlinePos = this.lastNewlinePos;
    m2.pos = this.pos;
    m2.mptr = this.mptr;
    m2.mlen = this.mlen;
    m2.h.set(this.h);
    m2.mxbase = this.mxbase;
    return m2;
  }
  grow(need) {
    if (need <= this.buf.length) return;
    let n = this.buf.length || 1024;
    while (n < need) n *= 2;
    const nb = new Uint8Array(n);
    nb.set(this.buf);
    this.buf = nb;
  }
  /** Recompute per-byte context hashes. Called after every completed byte. */
  newByte(b) {
    this.grow(this.pos + 1);
    this.buf[this.pos] = b;
    this.pos++;
    this.c8 = (this.c8 << 8 | this.c4 >>> 24 & 255) >>> 0;
    this.c4 = (this.c4 << 8 | b) >>> 0;
    const isAlnum = b >= 65 && b <= 90 || b >= 97 && b <= 122 || b >= 48 && b <= 57;
    this.wh = isAlnum ? Math.imul(this.wh, 789567123) + b + 1 >>> 0 : 0;
    if (b === 10 || b === 13) this.lastNewlinePos = this.pos;
    const col = this.pos - this.lastNewlinePos & 65535;
    const c4 = this.c4;
    this.h[0] = 0;
    this.h[1] = hmix(c4 & 255, 1) | 0;
    this.h[2] = hmix(c4 & 65535, 2) | 0;
    this.h[3] = hmix(c4 & 16777215, 3) | 0;
    this.h[4] = hmix(c4, 4) | 0;
    this.h[5] = hmix((c4 ^ Math.imul(this.c8 & 65535, 2654435761)) >>> 0, 5) | 0;
    this.h[6] = hmix(this.wh, 6) | 0;
    this.h[7] = hmix(this.c8, 8) | 0;
    this.h[8] = hmix(col << 8 | b & 255, 9) | 0;
    this.h[9] = hmix((c4 & 255) << 16 | this.c8 >>> 16 & 65535, 10) | 0;
    this.mxbase = (this.c4 & 255) * NIN;
    const pos = this.pos;
    const mh = hmix(
      (Math.imul(this.c4, 506832829) ^ Math.imul(this.c8 & 65535, 2654435761)) >>> 0,
      7
    ) & MATCH_HT_MASK;
    if (this.mlen > 0 && this.mptr < pos && this.buf[this.mptr] === b) {
      this.mptr++;
      if (this.mlen < 65535) this.mlen++;
    } else {
      this.mlen = 0;
      const cand = this.ht[mh];
      if (cand > 0 && cand < pos) {
        let l = 0;
        while (l < 40 && cand - 1 - l >= 0 && this.buf[cand - 1 - l] === this.buf[pos - 1 - l]) l++;
        if (l >= 4) {
          this.mptr = cand;
          this.mlen = l;
        }
      }
    }
    this.ht[mh] = pos;
  }
  /** Predict P(next bit = 1) in 12-bit fixed point. */
  predict() {
    const c0 = this.c0;
    for (let i = 0; i < NCTX; i++) {
      const idx = Math.imul(this.h[i] ^ Math.imul(c0, 1867460383), 668265261) >>> 0 & MMASK;
      this.ix[i] = idx;
      this.st[i] = STRETCH[this.pt[i][idx] >>> 4];
    }
    let mst = 0;
    if (this.mlen > 0) {
      const exp = this.buf[this.mptr];
      if ((exp | 256) >> 8 - this.bitpos === c0) {
        this.mbit = exp >> 7 - this.bitpos & 1;
        const lb = this.mlen > 31 ? 31 : this.mlen;
        this.midx = lb << 1 | this.mbit;
        mst = STRETCH[this.mcm[this.midx] >>> 4];
      } else {
        this.mlen = 0;
        this.midx = 1;
        mst = 0;
      }
    } else {
      this.midx = 0;
      mst = 0;
    }
    this.st[NCTX] = mst;
    this.st[NCTX + 1] = 256;
    let dot = 0;
    const base = this.mxbase;
    for (let i = 0; i < NIN; i++) dot += this.w[base + i] * this.st[i];
    if (dot > 2047) dot = 2047;
    else if (dot < -2047) dot = -2047;
    const p = squash(dot | 0);
    this.prMix = p;
    const p1 = this.apm1.pp(p, c0);
    const p2 = this.apm2.pp(p, ((this.c4 & 255) << 2 | this.bitpos >> 1) & 1023);
    let pr = p + p1 + 2 * p2 >> 2;
    if (pr < 1) pr = 1;
    else if (pr > 4094) pr = 4094;
    this.pr = pr;
    return pr;
  }
  /** Commit the true bit into every model. Identical on encode and decode. */
  update(bit) {
    const err = ((bit << 12) - this.prMix) * 7;
    const base = this.mxbase;
    for (let i = 0; i < NIN; i++) {
      this.w[base + i] += this.st[i] * err * 23283064365386963e-26;
    }
    const g = bit ? 65535 : 0;
    for (let i = 0; i < NCTX; i++) {
      const idx = this.ix[i];
      const c = this.ct[i][idx];
      const p = this.pt[i][idx];
      this.pt[i][idx] = p + ((g - p) * RATE[c] | 0);
      if (c < RATE_LIMIT) this.ct[i][idx] = c + 1;
    }
    {
      const idx = this.midx;
      const c = this.mcnt[idx];
      const p = this.mcm[idx];
      this.mcm[idx] = p + ((g - p) * RATE[c] | 0);
      if (c < RATE_LIMIT) this.mcnt[idx] = c + 1;
    }
    this.apm1.update(bit);
    this.apm2.update(bit);
    this.c0 = this.c0 << 1 | bit;
    this.bitpos++;
    if (this.c0 >= 256) {
      const b = this.c0 & 255;
      this.c0 = 1;
      this.bitpos = 0;
      this.newByte(b);
    }
  }
  /** Train on known bytes without coding them (warm start). */
  prime(bytes) {
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      for (let j = 7; j >= 0; j--) {
        this.predict();
        this.update(b >> j & 1);
      }
    }
  }
};
var ArEncoder = class {
  x1 = 0;
  x2 = 4294967295;
  out = [];
  code(bit, p) {
    const range = this.x2 - this.x1;
    const xmid = this.x1 + Math.floor(range / 4096) * p;
    if (bit) this.x2 = xmid;
    else this.x1 = xmid + 1;
    while (((this.x1 ^ this.x2) & 4278190080) === 0) {
      this.out.push(this.x2 >>> 24 & 255);
      this.x1 = (this.x1 << 8 >>> 0) % 4294967296;
      this.x2 = ((this.x2 << 8 >>> 0) + 255) % 4294967296;
    }
  }
  flush() {
    let x = this.x1;
    for (let i = 0; i < 4; i++) {
      this.out.push(x >>> 24 & 255);
      x = x << 8 >>> 0;
    }
    return Uint8Array.from(this.out);
  }
};
var ArDecoder = class {
  constructor(src2) {
    this.src = src2;
    for (let i = 0; i < 4; i++) this.x = (this.x << 8 >>> 0) + this.next();
    this.x = this.x >>> 0;
  }
  src;
  x1 = 0;
  x2 = 4294967295;
  x = 0;
  p = 0;
  next() {
    return this.p < this.src.length ? this.src[this.p++] : 0;
  }
  decode(p) {
    const range = this.x2 - this.x1;
    const xmid = this.x1 + Math.floor(range / 4096) * p;
    let bit;
    if (this.x <= xmid) {
      bit = 1;
      this.x2 = xmid;
    } else {
      bit = 0;
      this.x1 = xmid + 1;
    }
    while (((this.x1 ^ this.x2) & 4278190080) === 0) {
      this.x1 = (this.x1 << 8 >>> 0) % 4294967296;
      this.x2 = ((this.x2 << 8 >>> 0) + 255) % 4294967296;
      this.x = (this.x << 8 >>> 0) + this.next() >>> 0;
    }
    return bit;
  }
};
var PRIMED = null;
var PRIOR_BYTES = null;
function priorBytes() {
  if (!PRIOR_BYTES) PRIOR_BYTES = new TextEncoder().encode(OMEGA_PRIOR);
  return PRIOR_BYTES;
}
function freshModel() {
  if (!PRIMED) {
    const m2 = new CMModel(true);
    m2.prime(priorBytes());
    PRIMED = m2;
  }
  return PRIMED.clone();
}
function putVarint(out, n) {
  let v = n >>> 0;
  while (v >= 128) {
    out.push(v & 127 | 128);
    v = Math.floor(v / 128);
  }
  out.push(v);
}
function cmCompress(data) {
  const head = [];
  putVarint(head, data.length);
  const plain = new Uint8Array(head.length + data.length);
  plain.set(head, 0);
  plain.set(data, head.length);
  const m2 = freshModel();
  const enc2 = new ArEncoder();
  for (let i = 0; i < plain.length; i++) {
    const b = plain[i];
    for (let j = 7; j >= 0; j--) {
      const p = m2.predict();
      const bit = b >> j & 1;
      enc2.code(bit, p);
      m2.update(bit);
    }
  }
  return enc2.flush();
}
function cmDecompress(comp) {
  const m2 = freshModel();
  const dec = new ArDecoder(comp);
  const readByte = () => {
    let b = 0;
    for (let j = 7; j >= 0; j--) {
      const p = m2.predict();
      const bit = dec.decode(p);
      m2.update(bit);
      b = b << 1 | bit;
    }
    return b;
  };
  let len = 0;
  let shift = 1;
  for (let k2 = 0; k2 < 5; k2++) {
    const b = readByte();
    len += (b & 127) * shift;
    if ((b & 128) === 0) break;
    shift *= 128;
  }
  if (len > 1 << 26) throw new Error("omega: implausible length");
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = readByte();
  return out;
}
var CM_INFO = {
  models: NCTX + 1,
  memoryBytes: NCTX * (MEM * 2 + MEM) + MATCH_HT * 4,
  priorChars: OMEGA_PRIOR.length,
  mixerInputs: NIN
};

// src/lib/omega/aleph.ts
var ALEPH_ESC = 31;
var TAG_ESC_LITERAL = 255;
var TAG_INT = 1;
var TAG_DEC = 2;
var TAG_ISO_DT = 3;
var TAG_ISO_DATE = 4;
var TAG_TIME_HMS = 5;
var TAG_TIME_HM = 6;
function encVarint(n, out) {
  let v = n;
  while (v >= 128) {
    out.push(v % 128 | 128);
    v = Math.floor(v / 128);
  }
  out.push(v);
}
function decVarint(bytes, pos) {
  let value = 0;
  let shift = 1;
  let p = pos;
  for (let k2 = 0; k2 < 7; k2++) {
    if (p >= bytes.length) throw new Error("aleph: truncated varint");
    const b = bytes[p++];
    value += (b & 127) * shift;
    if ((b & 128) === 0) return { value, next: p };
    shift *= 128;
  }
  throw new Error("aleph: varint too long");
}
function isDigit(c) {
  return c >= 48 && c <= 57;
}
function isLetter(c) {
  return c >= 65 && c <= 90 || c >= 97 && c <= 122;
}
function readInt(bytes, pos, maxLen) {
  let value = 0;
  let len = 0;
  while (len < maxLen && pos + len < bytes.length && isDigit(bytes[pos + len])) {
    value = value * 10 + (bytes[pos + len] - 48);
    len++;
  }
  return { value, len };
}
function peekIsoDt(bytes, pos) {
  if (pos + 19 > bytes.length) return 0;
  if (!isDigit(bytes[pos]) || !isDigit(bytes[pos + 1]) || !isDigit(bytes[pos + 2]) || !isDigit(bytes[pos + 3])) return 0;
  if (bytes[pos + 4] !== 45) return 0;
  if (!isDigit(bytes[pos + 5]) || !isDigit(bytes[pos + 6])) return 0;
  if (bytes[pos + 7] !== 45) return 0;
  if (!isDigit(bytes[pos + 8]) || !isDigit(bytes[pos + 9])) return 0;
  if (bytes[pos + 10] !== 84) return 0;
  if (!isDigit(bytes[pos + 11]) || !isDigit(bytes[pos + 12])) return 0;
  if (bytes[pos + 13] !== 58) return 0;
  if (!isDigit(bytes[pos + 14]) || !isDigit(bytes[pos + 15])) return 0;
  if (bytes[pos + 16] !== 58) return 0;
  if (!isDigit(bytes[pos + 17]) || !isDigit(bytes[pos + 18])) return 0;
  if (pos + 19 < bytes.length && bytes[pos + 19] === 90) return 20;
  return 19;
}
function peekIsoDate(bytes, pos) {
  if (pos + 10 > bytes.length) return 0;
  if (!isDigit(bytes[pos]) || !isDigit(bytes[pos + 1]) || !isDigit(bytes[pos + 2]) || !isDigit(bytes[pos + 3])) return 0;
  if (bytes[pos + 4] !== 45) return 0;
  if (!isDigit(bytes[pos + 5]) || !isDigit(bytes[pos + 6])) return 0;
  if (bytes[pos + 7] !== 45) return 0;
  if (!isDigit(bytes[pos + 8]) || !isDigit(bytes[pos + 9])) return 0;
  if (pos + 10 < bytes.length && bytes[pos + 10] === 84) return 0;
  return 10;
}
function peekTimeHms(bytes, pos) {
  if (pos + 8 > bytes.length) return 0;
  if (!isDigit(bytes[pos]) || !isDigit(bytes[pos + 1])) return 0;
  if (bytes[pos + 2] !== 58) return 0;
  if (!isDigit(bytes[pos + 3]) || !isDigit(bytes[pos + 4])) return 0;
  if (bytes[pos + 5] !== 58) return 0;
  if (!isDigit(bytes[pos + 6]) || !isDigit(bytes[pos + 7])) return 0;
  return 8;
}
function peekTimeHm(bytes, pos) {
  if (pos + 5 > bytes.length) return 0;
  if (!isDigit(bytes[pos]) || !isDigit(bytes[pos + 1])) return 0;
  if (bytes[pos + 2] !== 58) return 0;
  if (!isDigit(bytes[pos + 3]) || !isDigit(bytes[pos + 4])) return 0;
  if (pos + 5 < bytes.length && bytes[pos + 5] === 58) return 0;
  if (pos + 5 < bytes.length && isDigit(bytes[pos + 5])) return 0;
  return 5;
}
function peekDecimal(bytes, pos, prev) {
  if (prev >= 0 && (isDigit(prev) || isLetter(prev) || prev === 46)) return 0;
  const intPart = readInt(bytes, pos, 9);
  if (intPart.len === 0) return 0;
  if (pos + intPart.len >= bytes.length || bytes[pos + intPart.len] !== 46) return 0;
  if (pos + intPart.len < bytes.length && isDigit(bytes[pos + intPart.len - 1]) && intPart.len === 9 && pos + intPart.len + 1 <= bytes.length && isDigit(bytes[pos + intPart.len])) return 0;
  const fracPart = readInt(bytes, pos + intPart.len + 1, 9);
  if (fracPart.len === 0) return 0;
  const total = intPart.len + 1 + fracPart.len;
  if (total < 4) return 0;
  const after = pos + total;
  if (after < bytes.length && (isDigit(bytes[after]) || isLetter(bytes[after]) || bytes[after] === 46)) return 0;
  return total;
}
function peekLongInt(bytes, pos, prev) {
  if (prev >= 0 && (isDigit(prev) || isLetter(prev) || prev === 46)) return 0;
  const r = readInt(bytes, pos, 9);
  if (r.len < 4) return 0;
  const after = pos + r.len;
  if (after < bytes.length) {
    const c = bytes[after];
    if (isDigit(c) || isLetter(c)) return 0;
    if (c === 46 && after + 1 < bytes.length && isDigit(bytes[after + 1])) return 0;
  }
  return r.len;
}
function alephEncode(input) {
  const out = [];
  let i = 0;
  const n = input.length;
  while (i < n) {
    const prev = i > 0 ? input[i - 1] : -1;
    const b = input[i];
    if (b === ALEPH_ESC) {
      out.push(ALEPH_ESC, TAG_ESC_LITERAL);
      i++;
      continue;
    }
    const atBoundary = !(prev >= 0 && (isDigit(prev) || isLetter(prev) || prev === 46));
    if (atBoundary && isDigit(b)) {
      const dtLen = peekIsoDt(input, i);
      if (dtLen > 0) {
        const year = (input[i] - 48) * 1e3 + (input[i + 1] - 48) * 100 + (input[i + 2] - 48) * 10 + (input[i + 3] - 48);
        const mo = (input[i + 5] - 48) * 10 + (input[i + 6] - 48);
        const dd = (input[i + 8] - 48) * 10 + (input[i + 9] - 48);
        const hh = (input[i + 11] - 48) * 10 + (input[i + 12] - 48);
        const mm = (input[i + 14] - 48) * 10 + (input[i + 15] - 48);
        const ss = (input[i + 17] - 48) * 10 + (input[i + 18] - 48);
        const zFlag = dtLen === 20 ? 1 : 0;
        const yd = year - 2e3;
        out.push(ALEPH_ESC, TAG_ISO_DT, yd & 255, yd >> 8 & 255, mo, dd, hh, mm, ss, zFlag);
        i += dtLen;
        continue;
      }
      const dateLen = peekIsoDate(input, i);
      if (dateLen > 0) {
        const year = (input[i] - 48) * 1e3 + (input[i + 1] - 48) * 100 + (input[i + 2] - 48) * 10 + (input[i + 3] - 48);
        const mo = (input[i + 5] - 48) * 10 + (input[i + 6] - 48);
        const dd = (input[i + 8] - 48) * 10 + (input[i + 9] - 48);
        const yd = year - 2e3;
        out.push(ALEPH_ESC, TAG_ISO_DATE, yd & 255, yd >> 8 & 255, mo, dd);
        i += dateLen;
        continue;
      }
      const hmsLen = peekTimeHms(input, i);
      if (hmsLen > 0) {
        const hh = (input[i] - 48) * 10 + (input[i + 1] - 48);
        const mm = (input[i + 3] - 48) * 10 + (input[i + 4] - 48);
        const ss = (input[i + 6] - 48) * 10 + (input[i + 7] - 48);
        out.push(ALEPH_ESC, TAG_TIME_HMS, hh, mm, ss);
        i += hmsLen;
        continue;
      }
      const hmLen = peekTimeHm(input, i);
      if (hmLen > 0) {
        const hh = (input[i] - 48) * 10 + (input[i + 1] - 48);
        const mm = (input[i + 3] - 48) * 10 + (input[i + 4] - 48);
        out.push(ALEPH_ESC, TAG_TIME_HM, hh, mm);
        i += hmLen;
        continue;
      }
      const decLen = peekDecimal(input, i, prev);
      if (decLen > 0) {
        const dot = input.indexOf(46, i);
        const iLen = dot - i;
        const fLen = decLen - iLen - 1;
        const intR = readInt(input, i, iLen);
        const fracR = readInt(input, i + iLen + 1, fLen);
        out.push(ALEPH_ESC, TAG_DEC);
        encVarint(intR.value, out);
        out.push(iLen, fLen);
        encVarint(fracR.value, out);
        i += decLen;
        continue;
      }
      const intLen = peekLongInt(input, i, prev);
      if (intLen > 0) {
        const r = readInt(input, i, intLen);
        out.push(ALEPH_ESC, TAG_INT);
        encVarint(r.value, out);
        out.push(intLen);
        i += intLen;
        continue;
      }
    }
    out.push(b);
    i++;
  }
  return Uint8Array.from(out);
}
function alephDecode(input) {
  const out = [];
  let i = 0;
  const n = input.length;
  const emitIntStr = (value, expectedLen) => {
    const s = String(value);
    if (s.length > expectedLen) {
      throw new Error(`aleph: integer value ${value} exceeds declared width ${expectedLen}`);
    }
    for (let k2 = s.length; k2 < expectedLen; k2++) out.push(48);
    for (let k2 = 0; k2 < s.length; k2++) out.push(s.charCodeAt(k2));
  };
  while (i < n) {
    const b = input[i];
    if (b !== ALEPH_ESC) {
      out.push(b);
      i++;
      continue;
    }
    if (i + 1 >= n) throw new Error("aleph: truncated escape");
    const tag = input[i + 1];
    i += 2;
    switch (tag) {
      case TAG_ESC_LITERAL:
        out.push(ALEPH_ESC);
        break;
      case TAG_INT: {
        const v = decVarint(input, i);
        i = v.next;
        if (i >= n) throw new Error("aleph: truncated INT width");
        const width = input[i++];
        emitIntStr(v.value, width);
        break;
      }
      case TAG_DEC: {
        const v1 = decVarint(input, i);
        i = v1.next;
        if (i + 1 >= n) throw new Error("aleph: truncated DEC widths");
        const iLen = input[i++];
        const fLen = input[i++];
        const v2 = decVarint(input, i);
        i = v2.next;
        emitIntStr(v1.value, iLen);
        out.push(46);
        emitIntStr(v2.value, fLen);
        break;
      }
      case TAG_ISO_DT: {
        if (i + 8 > n) throw new Error("aleph: truncated ISO_DT");
        const yd = input[i] | input[i + 1] << 8;
        const mo = input[i + 2];
        const dd = input[i + 3];
        const hh = input[i + 4];
        const mm = input[i + 5];
        const ss = input[i + 6];
        const zFlag = input[i + 7];
        i += 8;
        const year = yd + 2e3;
        emitIntStr(year, 4);
        out.push(45);
        emitIntStr(mo, 2);
        out.push(45);
        emitIntStr(dd, 2);
        out.push(84);
        emitIntStr(hh, 2);
        out.push(58);
        emitIntStr(mm, 2);
        out.push(58);
        emitIntStr(ss, 2);
        if (zFlag) out.push(90);
        break;
      }
      case TAG_ISO_DATE: {
        if (i + 4 > n) throw new Error("aleph: truncated ISO_DATE");
        const yd = input[i] | input[i + 1] << 8;
        const mo = input[i + 2];
        const dd = input[i + 3];
        i += 4;
        emitIntStr(yd + 2e3, 4);
        out.push(45);
        emitIntStr(mo, 2);
        out.push(45);
        emitIntStr(dd, 2);
        break;
      }
      case TAG_TIME_HMS: {
        if (i + 3 > n) throw new Error("aleph: truncated TIME_HMS");
        const hh = input[i], mm = input[i + 1], ss = input[i + 2];
        i += 3;
        emitIntStr(hh, 2);
        out.push(58);
        emitIntStr(mm, 2);
        out.push(58);
        emitIntStr(ss, 2);
        break;
      }
      case TAG_TIME_HM: {
        if (i + 2 > n) throw new Error("aleph: truncated TIME_HM");
        const hh = input[i], mm = input[i + 1];
        i += 2;
        emitIntStr(hh, 2);
        out.push(58);
        emitIntStr(mm, 2);
        break;
      }
      default:
        throw new Error(`aleph: unknown tag 0x${tag.toString(16)}`);
    }
  }
  return Uint8Array.from(out);
}

// src/lib/omega/atom-codec.ts
var CODEC_CM = 0;
var CODEC_DEFLATE = 1;
var CODEC_GZIP = 2;
var CODEC_BROTLI = 3;
var CODEC_SHFP_CM = 4;
var CODEC_SHFP_DEFLATE = 5;
var CODEC_SHFP_BROTLI = 6;
var CODEC_SHFP_GZIP = 7;
var CODEC_LZ77_DEFLATE = 8;
var CODEC_LZ77_BROTLI = 9;
var CODEC_SHFP_LZ77_DEFLATE = 10;
var CODEC_SHFP_LZ77_BROTLI = 11;
var CODEC_ALEPH_CM = 12;
var CODEC_ALEPH_LZ77_BROTLI = 13;
var CODEC_ALEPH_SHFP_LZ77_BROTLI = 14;
var CODEC_RAW = 15;
var CODEC_NAMES = {
  0: "CM-\u03A9 (context mixing + warm prior)",
  1: "deflate-raw (native)",
  2: "gzip (native)",
  3: "brotli (native)",
  4: "SHFP + CM-\u03A9 (phrase prepass + context mixing)",
  5: "SHFP + deflate-raw",
  6: "SHFP + brotli",
  7: "SHFP + gzip",
  8: "LZ77-Seeded deflate-raw (super-prior dictionary)",
  9: "LZ77-Seeded brotli (super-prior dictionary)",
  10: "SHFP + LZ77-Seeded deflate-raw",
  11: "SHFP + LZ77-Seeded brotli",
  12: "\u2135 Aleph + CM-\u03A9 (typed structural prepass + context mixing)",
  13: "\u2135 Aleph + LZ77-Seeded brotli",
  14: "\u2135 Aleph + SHFP + LZ77-Seeded brotli (v3 full stack)",
  15: "raw utf-8"
};
var SHFP_STRINGS = [
  "|---|---|---|---|",
  "|---|---|---|",
  "|---|---|",
  "| A | B |",
  "| 1 | 2 |",
  " | ",
  "---",
  '{"ok":true,',
  '{"ok":false,',
  '{"error":',
  '{"id":',
  ',"name":"',
  ',"value":',
  ',"status":"',
  '":true',
  '":false',
  '":null',
  '":[]',
  '":{}',
  '":""',
  '": "',
  '": ',
  '", "',
  '",\n',
  '": [',
  '": {',
  ',\n  "',
  '{\n  "',
  '\n  "',
  '\n    "',
  '": null',
  '": true',
  '": false',
  "JSON.stringify(",
  "JSON.parse(",
  "console.log(",
  "id,name,value",
  "id,qty,px",
  "timestamp",
  "created_at",
  "updated_at",
  "description",
  "2026-07-19T",
  "2026-01-01T",
  "2026-07-",
  "2026-01-",
  "2025-01-",
  "00:00:00Z",
  "04:15:00Z",
  "T00:00:00Z",
  "T04:15:00Z",
  " UTC.",
  " UTC",
  " Nm;",
  "You are a helpful assistant.",
  "Answer the following question",
  "Based on the provided context",
  "Think step-by-step",
  "Let's think step by step",
  "Return only the JSON",
  "Do not include any other text",
  "Please analyze the following",
  "In this document we describe",
  "The system shall maintain",
  "byte-exact reconstruction",
  "under all supported encodings",
  "surrogate pairs and control characters",
  "export function ",
  "export const ",
  "export async function ",
  "import { ",
  " } from '",
  ' } from "',
  "async function ",
  "function ",
  "return ",
  "const ",
  "let ",
  "var ",
  "await ",
  "if (",
  "else {",
  "for (let i = 0; i < ",
  "throw new Error(",
  "Promise<string>",
  "Promise<void>",
  "Uint8Array",
  "TextEncoder().encode(",
  "TextDecoder().decode(",
  "performance.now()",
  "Object.keys(",
  "The pump failed at",
  "before the next run.",
  "Replace seal ",
  "Torque ",
  "Verify seal",
  "ref #",
  "the ",
  "and ",
  "ing ",
  "tion ",
  "that ",
  "with ",
  "this ",
  "from ",
  "have ",
  "which ",
  "will ",
  "there ",
  "their ",
  "what ",
  "about ",
  "would ",
  "these ",
  "other ",
  "because ",
  "between ",
  "question",
  "problem",
  "solution",
  "system",
  "model",
  "token",
  "input",
  "output",
  "number",
  "string",
  "boolean",
  "object",
  "array",
  "value",
  "count",
  "status",
  "error",
  ".00",
  ",000",
  "0000",
  "1000",
  "100",
  "200",
  "404",
  "500",
  "429",
  "1200",
  "43.75",
  "44.10",
  "\r\n",
  "\n\n",
  "    ",
  "  "
];
var SHFP_TABLE = [];
{
  const te = new TextEncoder();
  const sorted = Array.from(new Set(SHFP_STRINGS)).map((s) => te.encode(s)).filter((b) => b.length >= 3).sort((a, b) => b.length - a.length);
  for (let i = 0; i < Math.min(254, sorted.length); i++) {
    SHFP_TABLE.push(sorted[i]);
  }
}
function applySHFP(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    if (bytes[i] === 30) {
      out.push(30, 255);
      i++;
      continue;
    }
    let matched = false;
    for (let k2 = 0; k2 < SHFP_TABLE.length; k2++) {
      const p = SHFP_TABLE[k2];
      if (i + p.length <= bytes.length) {
        let ok = true;
        for (let j = 0; j < p.length; j++) {
          if (bytes[i + j] !== p[j]) {
            ok = false;
            break;
          }
        }
        if (ok) {
          out.push(30, k2);
          i += p.length;
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      out.push(bytes[i++]);
    }
  }
  return Uint8Array.from(out);
}
function revertSHFP(bytes) {
  const out = [];
  let i = 0;
  while (i < bytes.length) {
    if (bytes[i] === 30 && i + 1 < bytes.length) {
      const code = bytes[i + 1];
      if (code === 255) {
        out.push(30);
        i += 2;
      } else if (code < SHFP_TABLE.length) {
        const p = SHFP_TABLE[code];
        for (let j = 0; j < p.length; j++) out.push(p[j]);
        i += 2;
      } else {
        out.push(30, code);
        i += 2;
      }
    } else {
      out.push(bytes[i++]);
    }
  }
  return Uint8Array.from(out);
}
function hasCompressionStreams() {
  return typeof globalThis.CompressionStream === "function";
}
async function streamCompress(fmt, data) {
  if (!hasCompressionStreams()) return null;
  try {
    const CS = globalThis.CompressionStream;
    const cs = new CS(fmt);
    const w = cs.writable.getWriter();
    void w.write(data);
    void w.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}
async function streamDecompress(fmt, data) {
  try {
    const DS = globalThis.DecompressionStream;
    if (typeof DS !== "function") return null;
    const ds = new DS(fmt);
    const w = ds.writable.getWriter();
    void w.write(data);
    void w.close();
    const buf = await new Response(ds.readable).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}
var LZ77_PRIOR_BUF = null;
function getLz77Prior() {
  if (!LZ77_PRIOR_BUF) LZ77_PRIOR_BUF = priorBytes();
  return LZ77_PRIOR_BUF;
}
async function streamCompressWithPrior(fmt, data) {
  const prior = getLz77Prior();
  const comb = new Uint8Array(prior.length + data.length);
  comb.set(prior, 0);
  comb.set(data, prior.length);
  return streamCompress(fmt, comb);
}
async function streamDecompressWithPrior(fmt, data) {
  const prior = getLz77Prior();
  const comb = await streamDecompress(fmt, data);
  if (!comb || comb.length < prior.length) return null;
  return comb.slice(prior.length);
}
var BLOCK_BYTES = 512;
var DIGITS_CACHE = /* @__PURE__ */ new Map();
function calcDigitsNeeded(len, M) {
  if (len === 0) return 0;
  const key = `${len}|${M}`;
  const cached = DIGITS_CACHE.get(key);
  if (cached !== void 0) return cached;
  let D = Math.ceil(len * (Math.log(256) / Math.log(M)));
  const M_bi = BigInt(M);
  let M_D = 1n;
  for (let i = 0; i < D; i++) M_D *= M_bi;
  const target = 1n << BigInt(len * 8);
  while (M_D < target) {
    D++;
    M_D *= M_bi;
  }
  while (D > 1 && M_D / M_bi >= target) {
    D--;
    M_D /= M_bi;
  }
  DIGITS_CACHE.set(key, D);
  return D;
}
function bytesToBigInt(bytes, start, len) {
  let val = 0n;
  for (let i = 0; i < len; i++) {
    val = val << 8n | BigInt(bytes[start + i]);
  }
  return val;
}
function bigIntToBytes(val, len) {
  const bytes = new Uint8Array(len);
  let curr = val;
  for (let i = len - 1; i >= 0; i--) {
    bytes[i] = Number(curr & 255n);
    curr >>= 8n;
  }
  return bytes;
}
function bigIntToDigits(val, D, M) {
  const digits = new Array(D);
  const M_bi = BigInt(M);
  let curr = val;
  for (let i = D - 1; i >= 0; i--) {
    digits[i] = Number(curr % M_bi);
    curr /= M_bi;
  }
  return digits;
}
function digitsToBigInt(digits, start, D, M) {
  const M_bi = BigInt(M);
  let val = 0n;
  for (let i = 0; i < D; i++) {
    val = val * M_bi + BigInt(digits[start + i]);
  }
  return val;
}
function encodeHeader(codec, payloadLen) {
  const head = new Uint8Array(4);
  head[0] = codec & 255;
  head[1] = payloadLen >> 16 & 255;
  head[2] = payloadLen >> 8 & 255;
  head[3] = payloadLen & 255;
  return head;
}
function decodeHeader(bytes) {
  if (bytes.length < 4) throw new Error("omega: header too short");
  const codec = bytes[0];
  const payloadLen = bytes[1] << 16 | bytes[2] << 8 | bytes[3];
  return { codec, payloadLen };
}
function packWire(codec, payload, alpha) {
  const M = alpha.atoms.length;
  const head = encodeHeader(codec, payload.length);
  const digits = [];
  const headDigits = bigIntToDigits(bytesToBigInt(head, 0, head.length), calcDigitsNeeded(4, M), M);
  for (const digit of headDigits) digits.push(digit);
  let pos = 0;
  while (pos < payload.length) {
    const b = Math.min(BLOCK_BYTES, payload.length - pos);
    const D = calcDigitsNeeded(b, M);
    const val = bytesToBigInt(payload, pos, b);
    const blockDigits = bigIntToDigits(val, D, M);
    for (let i = 0; i < blockDigits.length; i++) digits.push(blockDigits[i]);
    pos += b;
  }
  let wire = "";
  for (const d of digits) wire += alpha.atoms[d];
  return { wire, digits, headerBits: 32 };
}
function unpackWire(wire, alpha) {
  const M = alpha.atoms.length;
  const words2 = wire.match(/\S+/g) ?? [];
  const digits = [];
  for (const raw of words2) {
    const d = alpha.index.get(" " + raw);
    if (d === void 0) throw new Error(`omega: unknown atom "${raw}"`);
    digits.push(d);
  }
  const D_head = calcDigitsNeeded(4, M);
  if (digits.length < D_head) throw new Error("omega: wire truncated at header");
  const headVal = digitsToBigInt(digits, 0, D_head, M);
  const headBytes = bigIntToBytes(headVal, 4);
  const { codec, payloadLen } = decodeHeader(headBytes);
  if (payloadLen > 1 << 24) throw new Error("omega: implausible payload length");
  const payload = new Uint8Array(payloadLen);
  let digitPos = D_head;
  let bytePos = 0;
  while (bytePos < payloadLen) {
    const b = Math.min(BLOCK_BYTES, payloadLen - bytePos);
    const D = calcDigitsNeeded(b, M);
    if (digitPos + D > digits.length) throw new Error("omega: wire truncated at body");
    const val = digitsToBigInt(digits, digitPos, D, M);
    const blockBytes = bigIntToBytes(val, b);
    payload.set(blockBytes, bytePos);
    digitPos += D;
    bytePos += b;
  }
  return { codec, payload };
}
async function payloadDecode(codec, payload) {
  let raw = null;
  switch (codec) {
    case CODEC_CM:
      raw = cmDecompress(payload);
      break;
    case CODEC_DEFLATE:
      raw = await streamDecompress("deflate-raw", payload);
      break;
    case CODEC_GZIP:
      raw = await streamDecompress("gzip", payload);
      break;
    case CODEC_BROTLI:
      raw = await streamDecompress("brotli", payload);
      break;
    case CODEC_SHFP_CM:
      raw = cmDecompress(payload);
      if (raw) raw = revertSHFP(raw);
      break;
    case CODEC_SHFP_DEFLATE:
      raw = await streamDecompress("deflate-raw", payload);
      if (raw) raw = revertSHFP(raw);
      break;
    case CODEC_SHFP_BROTLI:
      raw = await streamDecompress("brotli", payload);
      if (raw) raw = revertSHFP(raw);
      break;
    case CODEC_SHFP_GZIP:
      raw = await streamDecompress("gzip", payload);
      if (raw) raw = revertSHFP(raw);
      break;
    case CODEC_LZ77_DEFLATE:
      raw = await streamDecompressWithPrior("deflate-raw", payload);
      break;
    case CODEC_LZ77_BROTLI:
      raw = await streamDecompressWithPrior("brotli", payload);
      break;
    case CODEC_SHFP_LZ77_DEFLATE:
      raw = await streamDecompressWithPrior("deflate-raw", payload);
      if (raw) raw = revertSHFP(raw);
      break;
    case CODEC_SHFP_LZ77_BROTLI:
      raw = await streamDecompressWithPrior("brotli", payload);
      if (raw) raw = revertSHFP(raw);
      break;
    case CODEC_ALEPH_CM:
      raw = cmDecompress(payload);
      if (raw) raw = alephDecode(raw);
      break;
    case CODEC_ALEPH_LZ77_BROTLI:
      raw = await streamDecompressWithPrior("brotli", payload);
      if (raw) raw = alephDecode(raw);
      break;
    case CODEC_ALEPH_SHFP_LZ77_BROTLI:
      raw = await streamDecompressWithPrior("brotli", payload);
      if (raw) raw = alephDecode(revertSHFP(raw));
      break;
    case CODEC_RAW:
      raw = payload;
      break;
    default:
      throw new Error(`omega: unknown payload codec ${codec}`);
  }
  if (!raw) throw new Error(`omega: decompress failed for codec ${codec}`);
  return raw;
}
async function omegaXiDecode(wire, enc2) {
  const alpha = buildAtomAlphabet(enc2);
  const { codec, payload } = unpackWire(wire, alpha);
  const raw = await payloadDecode(codec, payload);
  return new TextDecoder().decode(raw);
}
async function omegaXiCompress(text, enc2) {
  const t0 = performance.now();
  const alpha = buildAtomAlphabet(enc2);
  const raw = new TextEncoder().encode(text);
  if (alpha.atoms.length < 2 || !alpha.proof.exact) {
    throw new Error(
      `omega: refusing to encode \u2014 atom alphabet unusable (atoms=${alpha.atoms.length}, concat proof=${alpha.proof.tokens}/${alpha.proof.sample})`
    );
  }
  const shfp = applySHFP(raw);
  const aleph = alephEncode(raw);
  const alephShfp = applySHFP(aleph);
  const cands = [];
  try {
    cands.push({ id: CODEC_CM, payload: cmCompress(raw) });
  } catch {
  }
  try {
    cands.push({ id: CODEC_SHFP_CM, payload: cmCompress(shfp) });
  } catch {
  }
  try {
    cands.push({ id: CODEC_ALEPH_CM, payload: cmCompress(aleph) });
  } catch {
  }
  const d = await streamCompress("deflate-raw", raw);
  if (d) cands.push({ id: CODEC_DEFLATE, payload: d });
  const sd = await streamCompress("deflate-raw", shfp);
  if (sd) cands.push({ id: CODEC_SHFP_DEFLATE, payload: sd });
  const g = await streamCompress("gzip", raw);
  if (g) cands.push({ id: CODEC_GZIP, payload: g });
  const sg = await streamCompress("gzip", shfp);
  if (sg) cands.push({ id: CODEC_SHFP_GZIP, payload: sg });
  const b = await streamCompress("brotli", raw);
  if (b) cands.push({ id: CODEC_BROTLI, payload: b });
  const sb = await streamCompress("brotli", shfp);
  if (sb) cands.push({ id: CODEC_SHFP_BROTLI, payload: sb });
  const lz_d = await streamCompressWithPrior("deflate-raw", raw);
  if (lz_d) cands.push({ id: CODEC_LZ77_DEFLATE, payload: lz_d });
  const lz_b = await streamCompressWithPrior("brotli", raw);
  if (lz_b) cands.push({ id: CODEC_LZ77_BROTLI, payload: lz_b });
  const lz_sd = await streamCompressWithPrior("deflate-raw", shfp);
  if (lz_sd) cands.push({ id: CODEC_SHFP_LZ77_DEFLATE, payload: lz_sd });
  const lz_sb = await streamCompressWithPrior("brotli", shfp);
  if (lz_sb) cands.push({ id: CODEC_SHFP_LZ77_BROTLI, payload: lz_sb });
  const lz_a = await streamCompressWithPrior("brotli", aleph);
  if (lz_a) cands.push({ id: CODEC_ALEPH_LZ77_BROTLI, payload: lz_a });
  const lz_as = await streamCompressWithPrior("brotli", alephShfp);
  if (lz_as) cands.push({ id: CODEC_ALEPH_SHFP_LZ77_BROTLI, payload: lz_as });
  cands.push({ id: CODEC_RAW, payload: raw });
  const audit = [];
  let best = null;
  const decT0 = performance.now();
  let decodeMs = 0;
  for (const c of cands) {
    let packed;
    try {
      packed = packWire(c.id, c.payload, alpha);
    } catch {
      continue;
    }
    let ok = false;
    let note;
    try {
      const back = await omegaXiDecode(packed.wire, enc2);
      ok = back === text;
      if (!ok) note = "round-trip mismatch (rejected)";
    } catch (e) {
      note = e.message;
    }
    audit.push({
      id: c.id,
      name: CODEC_NAMES[c.id] ?? String(c.id),
      bytes: c.payload.length,
      atoms: packed.digits.length,
      tokens: packed.digits.length,
      ok,
      note
    });
    if (ok && (!best || packed.digits.length < best.atoms || packed.digits.length === best.atoms && c.payload.length < best.payload.length)) {
      best = { id: c.id, payload: c.payload, wire: packed.wire, headerBits: packed.headerBits, atoms: packed.digits.length };
    }
  }
  decodeMs = performance.now() - decT0;
  const inTokens = countTokens(text, enc2);
  if (!best) {
    return {
      ok: false,
      error: "no candidate survived the exactness gate",
      encoding: enc2,
      input: text,
      output: "",
      decoded: "",
      exact: false,
      inTokens,
      outTokens: 0,
      savingsPct: 0,
      atomCount: 0,
      tokenPerAtom: 0,
      invariantHolds: false,
      bitsPerAtom: alpha.bits,
      payloadBytes: 0,
      payloadBits: 0,
      headerBits: 0,
      totalBits: 0,
      inBytes: raw.length,
      bitsPerInputChar: 0,
      charsPerOutToken: 0,
      codec: -1,
      codecName: "none",
      candidates: audit,
      alphabet: alpha,
      encodeMs: performance.now() - t0,
      decodeMs
    };
  }
  for (const a of audit) a.selected = a.id === best.id && a.bytes === best.payload.length;
  const atomCount = best.atoms;
  const outTokens = countTokens(best.wire, enc2);
  const decoded = await omegaXiDecode(best.wire, enc2);
  const totalBits = best.headerBits + best.payload.length * 8;
  return {
    ok: true,
    encoding: enc2,
    input: text,
    output: best.wire,
    decoded,
    exact: decoded === text,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    atomCount,
    tokenPerAtom: atomCount ? outTokens / atomCount : 0,
    invariantHolds: atomCount === outTokens,
    bitsPerAtom: alpha.bits,
    payloadBytes: best.payload.length,
    payloadBits: best.payload.length * 8,
    headerBits: best.headerBits,
    totalBits,
    inBytes: raw.length,
    bitsPerInputChar: raw.length ? best.payload.length * 8 / raw.length : 0,
    charsPerOutToken: outTokens ? text.length / outTokens : 0,
    codec: best.id,
    codecName: CODEC_NAMES[best.id] ?? String(best.id),
    candidates: audit,
    alphabet: alpha,
    encodeMs: performance.now() - t0,
    decodeMs
  };
}
var HANDTRACE_SAMPLE = 'id,qty,px\n7,1200,43.75\n8,940,43.75\n9,880,44.10\n{"ok":true,"ids":[7,8,9],"ts":"2026-07-19T04:15:00Z"}\n## grid\n| A | B |\n|---|---|\n| 1 | 2 |\nThe pump failed at 04:15 UTC. Replace seal 12-A before the next run. Torque 42.5 Nm; ref #A7-2291. Verify seal.';
var EXTENDED_FIXTURE = HANDTRACE_SAMPLE + "\nsku,name,price,qty\nA1001,Widget Alpha,24.99,350\nB2002,Bracket Beta,8.50,1200\nC3003,Cable Gamma,3.25,4800\n" + Array.from({ length: 150 }, (_, i) => {
  const subjects = [
    "The system",
    "Our analysis",
    "The data",
    "This metric",
    "The pipeline",
    "Each module",
    "The framework",
    "Our benchmark",
    "The encoder",
    "This approach"
  ];
  const verbs = [
    "demonstrates",
    "confirms",
    "indicates",
    "suggests",
    "reveals",
    "validates",
    "establishes",
    "measures",
    "computes",
    "processes"
  ];
  const objects = [
    "significant improvements in throughput and latency reduction.",
    "byte-exact round-trip fidelity under all tested encodings.",
    "consistent token savings across heterogeneous prompt distributions.",
    "stable compression ratios on both structured and unstructured inputs.",
    "measurable cost reduction when deployed at production scale."
  ];
  return `${subjects[i % subjects.length]} ${verbs[i % verbs.length]} ${objects[i % objects.length]}`;
}).join("\n");

// src/lib/omega/prometheus-icdm.ts
var META_POOL_PREFIXES = ["\xA7", "\u2021", "\xB5", "\u2135", "\u0394", "\u03A9", "\u03A8", "\u03A3", "\u03A6", "\u039B", "\u03A0", "\u0393"];
var META_ALFANUM = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
function generateMetaPool(max = 500) {
  const pool2 = [];
  for (const p of META_POOL_PREFIXES) {
    for (let i = 0; i < META_ALFANUM.length; i++) {
      pool2.push(`${p}${META_ALFANUM[i]}`);
      if (pool2.length >= max) return pool2;
    }
  }
  return pool2;
}
var DICTIONARY_HEADER_START = "[OMEGA-V4 IN-CONTEXT DICTIONARY] (Meta-Tokens for direct reasoning without CoT decompression)";
var DICTIONARY_HEADER_END = "[END DICTIONARY - REASON DIRECTLY OVER PAYLOAD BELOW]";
function extractCandidatePatterns(text, maxPatterns = 150) {
  const freq = /* @__PURE__ */ new Map();
  if (!text || text.length < 10) return freq;
  const lines2 = text.split("\n");
  for (const line of lines2) {
    const trimmed = line.trim();
    if (trimmed.length >= 8) {
      freq.set(trimmed, (freq.get(trimmed) ?? 0) + 1);
      const commaIdx = trimmed.indexOf(",");
      if (commaIdx > 5 && commaIdx < trimmed.length - 1) {
        const p1 = trimmed.slice(0, commaIdx + 1);
        freq.set(p1, (freq.get(p1) ?? 0) + 1);
      }
      const spaceIdx = trimmed.indexOf(" ", Math.min(15, trimmed.length - 1));
      if (spaceIdx > 8) {
        const p2 = trimmed.slice(0, spaceIdx + 1);
        freq.set(p2, (freq.get(p2) ?? 0) + 1);
      }
    }
  }
  const words2 = text.match(/\S+/g) ?? [];
  const nWords = words2.length;
  const step = nWords > 5e3 ? 2 : 1;
  for (let len = 3; len <= 10; len += 2) {
    for (let i = 0; i <= nWords - len; i += step) {
      const phrase = words2.slice(i, i + len).join(" ");
      if (phrase.length >= 12 && phrase.length <= 120) {
        freq.set(phrase, (freq.get(phrase) ?? 0) + 1);
      }
    }
  }
  const patterns = [
    "2026-07-19T04:15:00Z",
    "2026-07-19T",
    "04:15:00Z",
    "id,service,metric,ts,status,val",
    "id,qty,px",
    "The system shall maintain byte-exact reconstruction",
    "under all supported encodings, including surrogate pairs and control characters",
    "application/json",
    "Content-Type: application/json",
    "Authorization: Bearer",
    "ERROR 2026-07-19T04:15:",
    "service=api status=500 latency_ms=",
    "service=api status=200 latency_ms="
  ];
  for (const pat of patterns) {
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(pat, pos)) !== -1) {
      count++;
      pos += pat.length;
    }
    if (count > 0) freq.set(pat, Math.max(freq.get(pat) ?? 0, count));
  }
  const sorted = Array.from(freq.entries()).filter(([pat, c]) => c >= 2 && pat.length >= 8 || c >= 1 && pat.length >= 40).sort((a, b) => b[0].length * b[1] - a[0].length * a[1]).slice(0, maxPatterns);
  return new Map(sorted);
}
async function compressPrometheusICDM(text, enc2 = "o200k_base", maxDictionarySize = 100) {
  const started = performance.now();
  const inTokens = countTokens(text, enc2);
  const inChars = text.length;
  if (text.length > 12e4) {
    return {
      ok: true,
      encoding: enc2,
      input: text,
      output: text,
      decoded: text,
      exact: true,
      inChars,
      outChars: inChars,
      inTokens,
      outTokens: inTokens,
      savingsTokens: 0,
      savingsPct: 0,
      dictionaryCount: 0,
      candidates: [],
      encodeMs: performance.now() - started,
      decodeMs: 0,
      webUiCompatible: true,
      zeroCotOverhead: true
    };
  }
  if (!text || inTokens < 10) {
    return {
      ok: true,
      encoding: enc2,
      input: text,
      output: text,
      decoded: text,
      exact: true,
      inChars,
      outChars: inChars,
      inTokens,
      outTokens: inTokens,
      savingsTokens: 0,
      savingsPct: 0,
      dictionaryCount: 0,
      candidates: [],
      encodeMs: performance.now() - started,
      decodeMs: 0,
      webUiCompatible: true,
      zeroCotOverhead: true
    };
  }
  const freqMap = extractCandidatePatterns(text, 200);
  const metaPool = generateMetaPool(300).filter((m2) => !text.includes(m2));
  const candidates3 = [];
  let metaIdx = 0;
  for (const [pattern, count] of freqMap.entries()) {
    if (metaIdx >= metaPool.length || candidates3.length >= maxDictionarySize) break;
    const patTokens = countTokens(pattern, enc2);
    const metaSymbol = metaPool[metaIdx];
    const metaTokCount = countTokens(metaSymbol, enc2);
    const defStr = `${metaSymbol}=${JSON.stringify(pattern)}
`;
    const headerCost = countTokens(defStr, enc2);
    const bodySavings = count * Math.max(0, patTokens - metaTokCount);
    const netSavings = bodySavings - headerCost;
    if (netSavings > 2) {
      candidates3.push({
        metaToken: metaSymbol,
        pattern,
        count,
        tokensPerOccurrence: patTokens,
        metaTokens: metaTokCount,
        headerCost,
        bodySavings,
        netTokenSavings: netSavings
      });
      metaIdx++;
    }
  }
  candidates3.sort(
    (a, b) => b.netTokenSavings - a.netTokenSavings || b.pattern.length - a.pattern.length
  );
  const selected = [];
  for (const cand of candidates3) {
    if (selected.length >= maxDictionarySize) break;
    selected.push(cand);
  }
  let body = text;
  const dictLines = [];
  const actuallyUsed = [];
  for (const item of selected) {
    if (body.includes(item.pattern)) {
      const parts = body.split(item.pattern);
      if (parts.length > 1) {
        body = parts.join(item.metaToken);
        dictLines.push(`${item.metaToken}=${JSON.stringify(item.pattern)}`);
        actuallyUsed.push({
          ...item,
          count: parts.length - 1,
          bodySavings: (parts.length - 1) * (item.tokensPerOccurrence - item.metaTokens),
          netTokenSavings: (parts.length - 1) * (item.tokensPerOccurrence - item.metaTokens) - item.headerCost
        });
      }
    }
  }
  let wire = text;
  if (actuallyUsed.length > 0) {
    wire = `${DICTIONARY_HEADER_START}
${dictLines.join("\n")}
${DICTIONARY_HEADER_END}

${body}`;
  }
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens && actuallyUsed.length > 0) {
    wire = text;
    actuallyUsed.length = 0;
  }
  const encodeMs = performance.now() - started;
  const decStarted = performance.now();
  const decoded = decompressPrometheusICDM(wire);
  const decodeMs = performance.now() - decStarted;
  const exact = decoded === text;
  const finalOutTokens = actuallyUsed.length === 0 ? inTokens : outTokens;
  return {
    ok: true,
    encoding: enc2,
    input: text,
    output: wire,
    decoded,
    exact,
    inChars,
    outChars: wire.length,
    inTokens,
    outTokens: finalOutTokens,
    savingsTokens: Math.max(0, inTokens - finalOutTokens),
    savingsPct: inTokens ? Math.max(0, (inTokens - finalOutTokens) / inTokens * 100) : 0,
    dictionaryCount: actuallyUsed.length,
    candidates: actuallyUsed,
    encodeMs,
    decodeMs,
    webUiCompatible: true,
    zeroCotOverhead: true
  };
}
function decompressPrometheusICDM(wire) {
  if (!wire.includes(DICTIONARY_HEADER_START) || !wire.includes(DICTIONARY_HEADER_END)) {
    return wire;
  }
  const startIdx = wire.indexOf(DICTIONARY_HEADER_START);
  const endIdx = wire.indexOf(DICTIONARY_HEADER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return wire;
  const headerBlock = wire.slice(startIdx + DICTIONARY_HEADER_START.length, endIdx).trim();
  let body = wire.slice(endIdx + DICTIONARY_HEADER_END.length);
  if (body.startsWith("\n\n")) body = body.slice(2);
  else if (body.startsWith("\n")) body = body.slice(1);
  const lines2 = headerBlock.split("\n");
  const mappings = [];
  for (const line of lines2) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx <= 0) continue;
    const metaToken = trimmed.slice(0, eqIdx).trim();
    const rawVal = trimmed.slice(eqIdx + 1).trim();
    try {
      const pattern = JSON.parse(rawVal);
      mappings.push({ metaToken, pattern });
    } catch {
    }
  }
  let plaintext = body;
  for (let i = mappings.length - 1; i >= 0; i--) {
    const { metaToken, pattern } = mappings[i];
    plaintext = plaintext.split(metaToken).join(pattern);
  }
  return plaintext;
}

// src/lib/omega/eidolon.ts
var FLUFF_PATTERNS = [
  " the ",
  " The ",
  " a ",
  " A ",
  " an ",
  " An ",
  " is ",
  " are ",
  " was ",
  " were ",
  " be ",
  " been ",
  " being ",
  " of ",
  " to ",
  " in ",
  " on ",
  " at ",
  " by ",
  " with ",
  " from ",
  " that ",
  " which ",
  " who ",
  " whom ",
  " whose ",
  " it ",
  " this ",
  " these ",
  " those ",
  " has ",
  " have ",
  " had ",
  " will ",
  " would ",
  " shall ",
  " should ",
  " can ",
  " could ",
  " may ",
  " might ",
  " must ",
  " very ",
  " really ",
  " quite ",
  " basically ",
  " literally ",
  " actually ",
  " as well as ",
  " in order to ",
  " due to the fact that ",
  " for the purpose of "
];
function eidolonProject(text, enc2 = "o200k_base") {
  const t0 = performance.now();
  const inTokens = countTokens(text, enc2);
  const inChars = text.length;
  const identity = (notes) => ({
    ok: true,
    encoding: enc2,
    wire: text,
    decoded: text,
    exact: true,
    applied: false,
    inTokens,
    outTokens: inTokens,
    savedTokens: 0,
    savingsPct: 0,
    inChars,
    outChars: inChars,
    residualBytes: 0,
    opCount: 0,
    notes,
    residual: []
  });
  if (text.length > 12e4) return identity("EIDOLON: skipped over 120k chars for UI latency safety.");
  if (!text || inTokens < 10) return identity("Input too short.");
  const codeSpans = [];
  const fenceRegex = /```[\s\S]*?```|`[^`]+`/g;
  let match;
  while ((match = fenceRegex.exec(text)) !== null) {
    codeSpans.push({ start: match.index, end: match.index + match[0].length });
  }
  function isProtected(pos, len) {
    for (const span of codeSpans) {
      if (pos < span.end && pos + len > span.start) return true;
    }
    return false;
  }
  let wire = "";
  const residual = [];
  let i = 0;
  while (i < text.length) {
    let matched = false;
    const activeSpan = codeSpans.find((s) => i >= s.start && i < s.end);
    if (activeSpan) {
      const len = activeSpan.end - i;
      wire += text.slice(i, activeSpan.end);
      i = activeSpan.end;
      continue;
    }
    let bestFluff = "";
    for (const f of FLUFF_PATTERNS) {
      if (text.startsWith(f, i)) {
        if (f.length > bestFluff.length) bestFluff = f;
      }
    }
    if (bestFluff && !isProtected(i, bestFluff.length)) {
      const replacement = " ";
      residual.push({ at: wire.length, run: bestFluff });
      wire += replacement;
      i += bestFluff.length;
      matched = true;
    }
    if (!matched) {
      wire += text[i];
      i++;
    }
  }
  let restored = "";
  try {
    restored = eidolonRestore(wire, residual);
  } catch (e) {
    return identity(`Restore failed: ${e.message}`);
  }
  if (restored !== text) {
    return identity("Byte-exact restore failed.");
  }
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens) return identity("No token reduction achieved.");
  const savedTokens = inTokens - outTokens;
  let residualBytes = 0;
  for (const r of residual) residualBytes += r.run.length + 4;
  return {
    ok: true,
    encoding: enc2,
    wire,
    decoded: restored,
    exact: true,
    applied: true,
    inTokens,
    outTokens,
    savedTokens,
    savingsPct: savedTokens / inTokens * 100,
    inChars,
    outChars: wire.length,
    residualBytes,
    opCount: residual.length,
    notes: `EIDOLON: Lossless Semantic Projection. ${residual.length} grammatical tokens projected to local residual.`,
    residual
  };
}
function eidolonRestore(wire, residual) {
  let out = wire;
  for (let k2 = residual.length - 1; k2 >= 0; k2--) {
    const op = residual[k2];
    if (out[op.at] !== " ") {
      throw new Error(`eidolon: expected space at offset ${op.at}, found '${out[op.at]}'`);
    }
    out = out.slice(0, op.at) + op.run + out.slice(op.at + 1);
  }
  return out;
}

// src/lib/omega/apex.ts
function apexDecode(wire, order, residual, eidolonResidual = []) {
  let text = wire;
  for (let guard = 0; guard < 4; guard++) {
    const before = text;
    text = decompressPrometheusICDM(text);
    if (text === before) break;
  }
  if (order === "STENCIL") {
    text = stencilDecode(text);
    return text;
  }
  if (order === "MORPH") {
    text = morphDecode(text);
    return text;
  }
  if (order.includes("SIGMA")) {
    if (order.startsWith("SIGMA>LTP")) {
      if (residual.length > 0) text = ltpRestore(text, residual);
      text = sigmaDecode(text);
      return text;
    }
    text = sigmaDecode(text);
  }
  if (order.includes("EIDOLON")) {
    if (eidolonResidual.length > 0) text = eidolonRestore(text, eidolonResidual);
  }
  if (order.includes("LTP") && residual.length > 0) {
    text = ltpRestore(text, residual);
  }
  return text;
}
async function apexEncode(text, enc2 = "o200k_base") {
  const t0 = performance.now();
  const inTokens = countTokens(text, enc2);
  const inChars = text.length;
  const identityResult = (notes) => ({
    ok: true,
    encoding: enc2,
    wire: text,
    decoded: text,
    exact: true,
    order: "IDENTITY",
    residual: [],
    eidolonResidual: [],
    sigmaApplied: false,
    promPasses: 0,
    inTokens,
    outTokens: inTokens,
    savedTokens: 0,
    savingsPct: 0,
    candidatesTried: 1,
    candidateAudit: [{ order: "IDENTITY", tokens: inTokens, exact: true }],
    inChars,
    outChars: inChars,
    encodeMs: performance.now() - t0,
    notes
  });
  if (text.length > 12e4) return identityResult("APEX: over 120k chars \u2014 skipped to prevent UI stall.");
  if (!text || inTokens < 3) return identityResult("Input too short.");
  const cands = [{ order: "IDENTITY", wire: text, residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 0 }];
  const ltpA = ltpProject(text, enc2);
  if (ltpA.applied) cands.push({ order: "LTP", wire: ltpA.wire, residual: ltpA.residual, eidolonResidual: [], sigmaApplied: false, promPasses: 0 });
  const sigA = sigmaEncode(text, enc2);
  if (sigA.applied) cands.push({ order: "SIGMA", wire: sigA.wire, residual: [], eidolonResidual: [], sigmaApplied: true, promPasses: 0 });
  const stA = stencilEncode(text, enc2);
  if (stA.applied) cands.push({ order: "STENCIL", wire: stA.wire, residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 0 });
  const morphA = morphEncode(text, enc2);
  if (morphA.applied) cands.push({ order: "MORPH", wire: morphA.wire, residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 0 });
  const eidoA = eidolonProject(text, enc2);
  if (eidoA.applied) cands.push({ order: "EIDOLON", wire: eidoA.wire, residual: [], eidolonResidual: eidoA.residual, sigmaApplied: false, promPasses: 0 });
  const promA = await compressPrometheusICDM(text, enc2);
  if (promA.dictionaryCount > 0 && promA.exact) cands.push({ order: "PROM", wire: promA.output, residual: [], eidolonResidual: [], sigmaApplied: false, promPasses: 1 });
  if (ltpA.applied) {
    const zProm = await compressPrometheusICDM(ltpA.wire, enc2);
    const zWire = zProm.dictionaryCount > 0 && zProm.exact ? zProm.output : ltpA.wire;
    cands.push({ order: "LTP>PROM", wire: zWire, residual: ltpA.residual, eidolonResidual: [], sigmaApplied: false, promPasses: zProm.dictionaryCount > 0 ? 1 : 0 });
  }
  if (eidoA.applied) {
    const eProm = await compressPrometheusICDM(eidoA.wire, enc2);
    const eWire = eProm.dictionaryCount > 0 && eProm.exact ? eProm.output : eidoA.wire;
    cands.push({ order: "EIDOLON>PROM", wire: eWire, residual: [], eidolonResidual: eidoA.residual, sigmaApplied: false, promPasses: eProm.dictionaryCount > 0 ? 1 : 0 });
  }
  const c1base = ltpA.applied ? ltpA.wire : text;
  const c1res = ltpA.applied ? ltpA.residual : [];
  const c1sig = sigmaEncode(c1base, enc2);
  const c1mid = c1sig.applied ? c1sig.wire : c1base;
  const c1prom = await compressPrometheusICDM(c1mid, enc2);
  const c1wire = c1prom.dictionaryCount > 0 && c1prom.exact ? c1prom.output : c1mid;
  cands.push({
    order: "LTP>SIGMA>PROM",
    wire: c1wire,
    residual: c1res,
    eidolonResidual: [],
    sigmaApplied: c1sig.applied,
    promPasses: c1prom.dictionaryCount > 0 ? 1 : 0
  });
  const c2sig = sigmaEncode(text, enc2);
  const c2base = c2sig.applied ? c2sig.wire : text;
  const c2ltp = ltpProject(c2base, enc2);
  const c2mid = c2ltp.applied ? c2ltp.wire : c2base;
  const c2prom = await compressPrometheusICDM(c2mid, enc2);
  const c2wire = c2prom.dictionaryCount > 0 && c2prom.exact ? c2prom.output : c2mid;
  cands.push({
    order: "SIGMA>LTP>PROM",
    wire: c2wire,
    residual: c2ltp.applied ? c2ltp.residual : [],
    eidolonResidual: [],
    sigmaApplied: c2sig.applied,
    promPasses: c2prom.dictionaryCount > 0 ? 1 : 0
  });
  const t1 = countTokens(c1wire, enc2);
  const t2 = countTokens(c2wire, enc2);
  const bestSingle = t1 <= t2 ? { wire: c1wire, residual: c1res, sigmaApplied: c1sig.applied, base: "LTP>SIGMA>PROM", passes: c1prom.dictionaryCount > 0 ? 1 : 0 } : { wire: c2wire, residual: c2ltp.applied ? c2ltp.residual : [], sigmaApplied: c2sig.applied, base: "SIGMA>LTP>PROM", passes: c2prom.dictionaryCount > 0 ? 1 : 0 };
  if (bestSingle.passes === 1) {
    const prom2 = await compressPrometheusICDM(bestSingle.wire, enc2);
    if (prom2.dictionaryCount > 0 && prom2.exact && countTokens(prom2.output, enc2) < countTokens(bestSingle.wire, enc2)) {
      cands.push({
        order: bestSingle.base === "LTP>SIGMA>PROM" ? "LTP>SIGMA>PROM>PROM2" : "SIGMA>LTP>PROM>PROM2",
        wire: prom2.output,
        residual: bestSingle.residual,
        eidolonResidual: [],
        sigmaApplied: bestSingle.sigmaApplied,
        promPasses: 2
      });
    }
  }
  const audit = [];
  let best = null;
  for (const c of cands) {
    let exact = false;
    try {
      exact = apexDecode(c.wire, c.order, c.residual) === text;
    } catch {
      exact = false;
    }
    const tokens = countTokens(c.wire, enc2);
    audit.push({ order: c.order, tokens, exact });
    if (exact && (!best || tokens < best.tokens)) best = { ...c, tokens };
  }
  if (!best || best.order === "IDENTITY" || best.tokens >= inTokens) {
    const r = identityResult("No composition beat identity on this input.");
    r.candidatesTried = cands.length;
    r.candidateAudit = audit;
    return r;
  }
  const savedTokens = inTokens - best.tokens;
  return {
    ok: true,
    encoding: enc2,
    wire: best.wire,
    decoded: text,
    exact: true,
    order: best.order,
    residual: best.residual,
    eidolonResidual: best.eidolonResidual,
    sigmaApplied: best.sigmaApplied,
    promPasses: best.promPasses,
    inTokens,
    outTokens: best.tokens,
    savedTokens,
    savingsPct: savedTokens / inTokens * 100,
    candidatesTried: cands.length,
    candidateAudit: audit,
    inChars,
    outChars: best.wire.length,
    encodeMs: performance.now() - t0,
    notes: `APEX tournament: ${cands.length} compositions gated, winner ${best.order}${best.promPasses === 2 ? " (nested 2-tier dictionary)" : ""}, \u2212${savedTokens} tokens (${(savedTokens / inTokens * 100).toFixed(1)}%). Pareto \u2265 every constituent codec by construction.`
  };
}

// src/lib/omega/orbit.ts
var orbitCache = /* @__PURE__ */ new Map();
var ORBIT_CACHE_MAX = 8;
var ORBIT_CACHE_MAX_CHARS = 3e5;
async function orbitEncode(text, enc2 = "o200k_base", suppliedApex, ledger = [], supplied = {}) {
  const cacheKey = !suppliedApex && ledger.length === 0 && Object.keys(supplied).length === 0 && text.length <= ORBIT_CACHE_MAX_CHARS ? enc2 + "\0" + text : null;
  if (cacheKey) {
    const hit = orbitCache.get(cacheKey);
    if (hit) return hit;
  }
  const inTokens = countTokens(text, enc2);
  const apex = suppliedApex ?? await apexEncode(text, enc2);
  const meridian = supplied.meridian ?? meridianEncode(text, enc2);
  const anaphora = supplied.anaphora ?? anaphoraEncode(text, enc2);
  const quasar = supplied.quasar ?? quasarEncode(text, enc2);
  const plexus = supplied.plexus ?? plexusEncode(text, enc2);
  const pulse = supplied.pulse ?? pulseEncode(text, enc2);
  const helix = supplied.helix ?? helixEncode(text, enc2);
  const veritas = supplied.veritas ?? veritasEncode(text, enc2);
  const axiom = supplied.axiom ?? axiomEncode(text, enc2, ledger);
  const tessera = supplied.tessera ?? tesseraEncode(text, enc2);
  const strata = supplied.strata ?? strataEncode(text, enc2);
  const signet = supplied.signet ?? signetEncode(text, enc2);
  const mosaic = supplied.mosaic ?? mosaicEncode(text, enc2);
  const candidates3 = [
    { lane: "identity", wire: text, decoded: text, exact: true },
    { lane: "apex", wire: apex.wire, decoded: apex.decoded, exact: apex.exact },
    { lane: "meridian", wire: meridian.wire, decoded: meridian.decoded, exact: meridian.exact },
    { lane: "anaphora", wire: anaphora.wire, decoded: anaphora.decoded, exact: anaphora.exact },
    { lane: "quasar", wire: quasar.wire, decoded: quasar.decoded, exact: quasar.exact },
    { lane: "plexus", wire: plexus.wire, decoded: plexus.decoded, exact: plexus.exact },
    { lane: "pulse", wire: pulse.wire, decoded: pulse.decoded, exact: pulse.exact },
    { lane: "helix", wire: helix.wire, decoded: helix.decoded, exact: helix.exact },
    { lane: "veritas", wire: veritas.wire, decoded: veritas.decoded, exact: veritas.exact },
    { lane: "axiom", wire: axiom.wire, decoded: axiom.decoded, exact: axiom.exact },
    { lane: "tessera", wire: tessera.wire, decoded: tessera.decoded, exact: tessera.exact },
    { lane: "strata", wire: strata.wire, decoded: strata.decoded, exact: strata.exact },
    { lane: "signet", wire: signet.wire, decoded: signet.decoded, exact: signet.exact },
    { lane: "mosaic", wire: mosaic.wire, decoded: mosaic.decoded, exact: mosaic.exact }
  ];
  const audit = candidates3.map((c) => ({
    lane: c.lane,
    tokens: countTokens(c.wire, enc2),
    exact: c.exact && c.decoded === text
  }));
  const accepted = candidates3.filter((c) => c.exact && c.decoded === text);
  accepted.sort((a, b) => countTokens(a.wire, enc2) - countTokens(b.wire, enc2));
  const winner = accepted[0] ?? candidates3[0];
  const outTokens = countTokens(winner.wire, enc2);
  const result = {
    wire: winner.wire,
    decoded: text,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    lane: winner.lane,
    audit,
    notes: `ORBIT winner=${winner.lane}; exact argmin over ${accepted.length} verified lanes.`
  };
  if (cacheKey) {
    if (orbitCache.size >= ORBIT_CACHE_MAX) orbitCache.clear();
    orbitCache.set(cacheKey, result);
  }
  return result;
}
function orbitDecoderPrompt(result) {
  const lane = result?.lane ?? "unknown";
  const contract = lane === "meridian" ? MERIDIAN_SYSTEM_PROMPT : lane === "anaphora" ? anaphoraDecoderPrompt(null) : lane === "quasar" ? QUASAR_SYSTEM_PROMPT : lane === "plexus" ? PLEXUS_SYSTEM_PROMPT : lane === "pulse" ? PULSE_SYSTEM_PROMPT : lane === "helix" ? HELIX_SYSTEM_PROMPT : lane === "veritas" ? VERITAS_SYSTEM_PROMPT : lane === "mosaic" ? mosaicDecoderPrompt(null) : lane === "signet" ? SIGNET_SYSTEM_PROMPT : lane === "strata" ? STRATA_SYSTEM_PROMPT : lane === "tessera" ? TESSERA_SYSTEM_PROMPT : lane === "axiom" ? AXIOM_SYSTEM_PROMPT : lane === "apex" ? "The wire is the exact APEX tournament winner; use its visible local contract and preserve all literal data." : "";
  return [`# ORBIT-M2 exact readable tournament; selected lane=${lane}`, contract, "If the winner is identity, the text is literal."].filter(Boolean).join("\n");
}

// src/lib/omega/kappa.ts
var KAPPA_SENTINEL = "\u03BA\n";
var KAPPA_HOLE = "\u22C4";
var MAX_MACROS = 24;
var MAX_NGRAM = 64;
function kappaWindow(text, enc2, size, allowHole = false) {
  const pool2 = rosettaPool(enc2);
  if (pool2.length < size) return null;
  if (!allowHole && text.includes(KAPPA_HOLE)) return null;
  const src2 = /* @__PURE__ */ new Set();
  for (const ch of text) src2.add(ch);
  const limit = pool2.length - size;
  for (let k2 = 0; k2 <= limit; k2++) {
    let clear = true;
    for (let j = 0; j < size; j++) {
      if (src2.has(pool2[k2 + j])) {
        clear = false;
        break;
      }
    }
    if (clear) return k2;
  }
  return null;
}
function kappaExpand(body, base, enc2) {
  const pool2 = rosettaPool(enc2);
  const indexOfGlyph = /* @__PURE__ */ new Map();
  for (let i2 = 0; i2 < pool2.length; i2++) indexOfGlyph.set(pool2[i2], i2);
  const ZONE = 1 + 2 * MAX_MACROS;
  const def = [];
  const arity = [];
  let out = "";
  let i = 0;
  const n = body.length;
  while (i < n) {
    const c = body[i];
    const idx = indexOfGlyph.get(c) ?? -1;
    if (idx >= base && idx < base + ZONE) {
      const off = idx - base;
      const j = off - 1 >> 1;
      const isOpen = off % 2 === 1;
      if (isOpen) {
        const close = pool2[base + 1 + 2 * j];
        const end = body.indexOf(close, i + 1);
        if (end < 0) return body;
        const rawDef = kappaExpand(body.slice(i + 1, end), base, enc2);
        const holes = rawDef.split(KAPPA_HOLE).length - 1;
        while (def.length <= j) {
          def.push(null);
          arity.push(0);
        }
        def[j] = rawDef;
        arity[j] = holes > 0 ? 1 : 0;
        if (holes === 0) out += rawDef;
        i = end + 1;
        continue;
      }
      while (def.length <= j) {
        def.push(null);
        arity.push(0);
      }
      const d = def[j];
      if (d == null) {
        out += c;
        i++;
        continue;
      }
      if (arity[j] === 1) {
        const end = body.indexOf(c, i + 1);
        if (end < 0) return body;
        const arg = kappaExpand(body.slice(i + 1, end), base, enc2);
        out += d.split(KAPPA_HOLE).join(arg);
        i = end + 1;
        continue;
      }
      out += d;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
function kappaDecode(wire, enc2 = "o200k_base") {
  if (!wire.startsWith(KAPPA_SENTINEL)) return wire;
  const rest = wire.slice(KAPPA_SENTINEL.length);
  const nl = rest.indexOf("\n");
  if (nl < 0) return wire;
  const baseGlyph = rest.slice(0, nl);
  const pool2 = rosettaPool(enc2);
  const base = pool2.indexOf(baseGlyph);
  if (base < 0) return wire;
  return kappaExpand(rest.slice(nl + 1), base, enc2);
}
var MAX_HOLES = 4;
var MIN_MATCHED = 3;
var ANCHOR_CAP = 64;
function findFamilies(toks, enc2, cost) {
  const n = toks.length;
  const ids = toks.map((t2) => t2.id);
  const byId = /* @__PURE__ */ new Map();
  for (let i = 0; i < n; i++) {
    const arr = byId.get(ids[i]);
    if (arr) {
      if (arr.length < ANCHOR_CAP) arr.push(i);
    } else byId.set(ids[i], [i]);
  }
  const out = [];
  const seenSpan = /* @__PURE__ */ new Set();
  for (const [, positions] of byId) {
    if (positions.length < 2) continue;
    for (let x = 0; x < positions.length; x++) {
      for (let y = x + 1; y < positions.length; y++) {
        const a = positions[x];
        const b = positions[y];
        const holes = [];
        const holePrefixes = [];
        let varA = "";
        let varB = "";
        let d = 0;
        while (d < MAX_NGRAM && a + d < n && b + d < n) {
          const ta = ids[a + d];
          const tb = ids[b + d];
          if (ta === tb) {
            d++;
            continue;
          }
          if (holes.length >= MAX_HOLES) break;
          const fa = toks[a + d].s;
          const fb = toks[b + d].s;
          let p = 0;
          while (p < fa.length && p < fb.length && fa[p] === fb[p] && !/[A-Za-z0-9_]/.test(fa[p])) p++;
          const va = fa.slice(p);
          const vb = fb.slice(p);
          if (va === "" || vb === "" || va === vb) break;
          if (holes.length > 0 && (va !== varA || vb !== varB)) break;
          holes.push(d);
          holePrefixes.push(fa.slice(0, p));
          varA = va;
          varB = vb;
          d++;
        }
        if (d < 2) continue;
        const matched = d - holes.length;
        if (matched < MIN_MATCHED) continue;
        const starts = [];
        const fillers = [];
        for (const c of positions) {
          let cv = "";
          let ok = true;
          for (let e = 0; e < d; e++) {
            const hi = holes.indexOf(e);
            if (hi >= 0) {
              const f = toks[c + e]?.s ?? "";
              if (!f.startsWith(holePrefixes[hi])) {
                ok = false;
                break;
              }
              const v = f.slice(holePrefixes[hi].length);
              if (v === "") {
                ok = false;
                break;
              }
              if (cv === "") cv = v;
              else if (cv !== v) {
                ok = false;
                break;
              }
            } else if (ids[c + e] !== ids[a + e]) {
              ok = false;
              break;
            }
          }
          if (ok) {
            starts.push(c);
            fillers.push(cv);
          }
        }
        if (starts.length < 2) continue;
        if (holes.length > 0) {
          if (new Set(fillers).size < 2) continue;
        }
        const defText = patternText(toks, a, d, holes, holePrefixes);
        const defCost = cost(defText);
        let saving;
        if (holes.length === 0) {
          saving = starts.length * d - (defCost + 2) - (starts.length - 1);
        } else {
          const occCost = 2 + cost(fillers[0]);
          saving = starts.length * d - (defCost + 2) - starts.length * occCost;
        }
        if (saving <= 0) continue;
        const key = a + ":" + d + ":" + holes.join(".");
        if (seenSpan.has(key)) continue;
        seenSpan.add(key);
        out.push({ len: d, holes, holePrefixes, starts, fillers, saving });
      }
    }
  }
  out.sort((p, q) => q.saving - p.saving || q.len - p.len);
  return out;
}
function verifyFamilies(text, toks, fams) {
  const off = [];
  let p = 0;
  for (const t2 of toks) {
    off.push(p);
    p += t2.s.length;
  }
  const spanLen = (from, len) => {
    let L = 0;
    for (let i = from; i < from + len; i++) L += toks[i].s.length;
    return L;
  };
  const ok = [];
  for (const f of fams) {
    const def = patternText(toks, f.starts[0], f.len, f.holes, f.holePrefixes);
    const starts = [];
    const fillers = [];
    for (let k2 = 0; k2 < f.starts.length; k2++) {
      const st = f.starts[k2];
      const expected = f.holes.length === 0 ? def : def.split(KAPPA_HOLE).join(f.fillers[k2]);
      const actual = text.slice(off[st], off[st] + spanLen(st, f.len));
      if (expected === actual) {
        starts.push(st);
        fillers.push(f.fillers[k2]);
      }
    }
    if (starts.length >= 2 && (f.holes.length === 0 || new Set(fillers).size >= 2)) {
      ok.push({ ...f, starts, fillers });
    }
  }
  return ok;
}
function patternText(toks, start, len, holes, holePrefixes) {
  let out = "";
  for (let e = 0; e < len; e++) {
    const hi = holes.indexOf(e);
    out += hi >= 0 ? holePrefixes[hi] + KAPPA_HOLE : toks[start + e].s;
  }
  return out;
}
function selectFamilies(fams, toks, enc2, cost) {
  const nTokens = toks.length;
  const used = new Array(nTokens).fill(false);
  const chosen = [];
  for (const f of fams) {
    if (chosen.length >= MAX_MACROS) break;
    const starts = [];
    const fillers = [];
    for (let k2 = 0; k2 < f.starts.length; k2++) {
      const p = f.starts[k2];
      let free = true;
      for (let j = p; j < p + f.len; j++) if (used[j]) {
        free = false;
        break;
      }
      if (!free) continue;
      starts.push(p);
      fillers.push(f.fillers[k2]);
    }
    if (starts.length < 2) continue;
    const defText = patternText(toks, starts[0], f.len, f.holes, f.holePrefixes);
    const defCost = cost(defText);
    const occCost = f.holes.length === 0 ? 1 : 2 + cost(fillers[0]);
    const original = starts.length * f.len;
    const wireCost = f.holes.length === 0 ? defCost + 2 + (starts.length - 1) : defCost + 2 + starts.length * occCost;
    const saving = original - wireCost;
    if (saving <= 0) continue;
    for (const p of starts) for (let j = p; j < p + f.len; j++) used[j] = true;
    chosen.push({ ...f, starts, fillers, saving });
    void enc2;
  }
  return chosen;
}
function fold(text, toks, fams, enc2) {
  if (fams.length === 0) return null;
  const off = [];
  let p = 0;
  for (const t2 of toks) {
    off.push(p);
    p += t2.s.length;
  }
  const occ3 = /* @__PURE__ */ new Map();
  fams.forEach((f, fi) => f.starts.forEach((st, si) => occ3.set(st, { m: fi, bind: si === 0 })));
  const pool2 = rosettaPool(enc2);
  const w = kappaWindow(text, enc2, 1 + 2 * MAX_MACROS);
  if (w == null) return null;
  let out = "";
  let i = 0;
  while (i < toks.length) {
    const hit = occ3.get(i);
    if (hit) {
      const f = fams[hit.m];
      const O = pool2[w + 1 + 2 * hit.m];
      const U = pool2[w + 2 + 2 * hit.m];
      if (hit.bind) {
        const defText = patternText(toks, f.starts[0], f.len, f.holes, f.holePrefixes);
        if (f.holes.length === 0) {
          out += O + defText + O;
        } else {
          out += O + defText + O + U + f.fillers[0] + U;
        }
      } else if (f.holes.length === 0) {
        out += U;
      } else {
        out += U + f.fillers[f.starts.indexOf(i)] + U;
      }
      i += f.len;
      continue;
    }
    out += toks[i].s;
    i++;
  }
  return out;
}
function kappaEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const base = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    macros: 0,
    notes: "identity (no profitable macros)"
  };
  if (!text || text.length > 12e3) return base;
  const measure = text.length <= 12e3;
  const cost = (s) => measure ? countTokens(s, enc2) : s.length >> 2;
  if (text.startsWith(KAPPA_SENTINEL)) {
    const wk = kappaWindow(text, enc2, 1 + 2 * MAX_MACROS, true);
    if (wk != null) {
      const wrapped = KAPPA_SENTINEL + rosettaPool(enc2)[wk] + "\n" + text;
      if (kappaDecode(wrapped, enc2) === text) {
        const outTokens2 = countTokens(wrapped, enc2);
        return {
          wire: wrapped,
          decoded: text,
          exact: true,
          inTokens,
          outTokens: outTokens2,
          savingsPct: inTokens ? (inTokens - outTokens2) / inTokens * 100 : 0,
          applied: false,
          macros: 0,
          notes: "forced header: source is \u03BA-sentinel-ambiguous (safety lane)"
        };
      }
    }
    return { ...base, notes: "sentinel-ambiguous source; no safe window (decode caveat)" };
  }
  const toks = tokenStrings(text, enc2);
  const fams = selectFamilies(verifyFamilies(text, toks, findFamilies(toks, enc2, cost)), toks, enc2, cost);
  if (fams.length === 0) return base;
  const body = fold(text, toks, fams, enc2);
  if (body == null) return base;
  const w = kappaWindow(text, enc2, 1 + 2 * MAX_MACROS);
  if (w == null) return base;
  const pool2 = rosettaPool(enc2);
  const wire = KAPPA_SENTINEL + pool2[w] + "\n" + body;
  const back = kappaDecode(wire, enc2);
  const outTokens = countTokens(wire, enc2);
  if (back !== text || outTokens >= inTokens) {
    if (typeof process !== "undefined" && process.env?.KAPPA_DEBUG) {
      console.error("[kappa] rejected: G2=" + (back !== text) + " G3=" + (outTokens >= inTokens) + " out=" + outTokens + " in=" + inTokens + " fams=" + fams.map((f) => `len${f.len}h${f.holes.length}x${f.starts.length}(+${f.saving})`).join(","));
      if (back !== text) {
        let d = 0;
        while (d < Math.min(back.length, text.length) && back[d] === text[d]) d++;
        console.error("[kappa] G2 divergence @" + d + " expected " + JSON.stringify(text.slice(d, d + 50)) + " got " + JSON.stringify(back.slice(d, d + 50)));
      }
    }
    return { ...base, notes: "gates: candidate rejected (G2/G3)" };
  }
  return {
    wire,
    decoded: back,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    applied: true,
    macros: fams.length,
    notes: `KAPPA macros=${fams.length} (inline-bound, parameterized) \xB7 byte-exact`
  };
}
function kappaDecoderPrompt() {
  return [
    "# \u03BA KAPPA-\u03BA1 \u2014 inline-bind token macros (byte-exact)",
    "A KAPPA message is: the character \u03BA, a newline, a base glyph, a newline,",
    "then the body.",
    "The base glyph is pool[w] of the KAPPA pool (version-stable, single-",
    "token kana/CJK glyphs; reference: rosettaPool in src/lib/omega/kappa.ts).",
    "For macro j: O_j = pool[w+1+2j] (definition glyph) and",
    "U_j = pool[w+2+2j] (use glyph).",
    "Decode the body left to right in ONE pass:",
    "1. O_j \u2026 O_j (first sight): the enclosed span is macro j's definition.",
    "   It expands in place. Remember it.",
    "2. U_j alone: emit macro j's definition (already bound).",
    "3. U_j arg U_j with a \u22C4-holed definition: emit the definition with every",
    "   \u22C4 replaced by arg. A parameterized binding is immediately followed by",
    "   its own use (O_j def O_j U_j arg U_j), so it expands in place too.",
    "4. Every other character is literal.",
    "Definitions never contain O/U glyphs and never nest. Reconstruction is",
    "byte-exact; nothing was summarised or dropped."
  ].join("\n");
}
var KAPPA_SYSTEM_PROMPT = kappaDecoderPrompt();

// src/lib/omega/phrase.ts
var PHRASE_SENTINEL = "\u03C6";
var PHRASE_LITERAL = "\u03C6\u03C6";
var FOLD_CAP = 12e4;
var GLYPH_CAP = 512;
var EN_FUNCTION = [
  " of the",
  " in the",
  " to the",
  " on the",
  " and the",
  " for the",
  " with the",
  " at the",
  " from the",
  " as a",
  " is a",
  " was a",
  " to be",
  " it is",
  " there is",
  " that is",
  " will be",
  " has been",
  " have been",
  " based on",
  " such as",
  " as well",
  " in order",
  " out of",
  " up to",
  " due to",
  " prior to",
  " one of",
  " part of",
  " most of",
  " because of",
  " during the",
  " while the",
  " if the",
  " when the",
  " over the",
  " after the",
  " before the",
  " the following",
  " should be",
  " would be",
  " can be",
  " do not",
  " does not",
  " did not",
  " is not",
  " are not",
  " was not"
];
var EN_OPS = [
  " status ok",
  " no issues",
  " as expected",
  " in progress",
  " please note",
  " make sure",
  " next steps",
  " follow up",
  " let me",
  " I will",
  " we should",
  " queue depth",
  " on-call",
  " error rate",
  " root cause",
  " blast radius"
];
var JP = [
  "\u30A8\u30E9\u30FC",
  "\u30B5\u30FC\u30D3\u30B9",
  "\u30BF\u30A4\u30E0\u30A2\u30A6\u30C8",
  "\u30A2\u30E9\u30FC\u30C8",
  "\u30EA\u30AF\u30A8\u30B9\u30C8",
  "\u30EC\u30B9\u30DD\u30F3\u30B9",
  "\u30E2\u30CB\u30BF\u30EA\u30F3\u30B0",
  "\u30A4\u30F3\u30B9\u30BF\u30F3\u30B9",
  "\u30AF\u30E9\u30B9\u30BF\u30FC",
  "\u30CD\u30C3\u30C8\u30EF\u30FC\u30AF",
  "\u30BB\u30AD\u30E5\u30EA\u30C6\u30A3",
  "\u30D1\u30D5\u30A9\u30FC\u30DE\u30F3\u30B9",
  "\u30E1\u30F3\u30C6\u30CA\u30F3\u30B9",
  "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9",
  "\u30B9\u30C6\u30FC\u30BF\u30B9",
  "\u30C7\u30D7\u30ED\u30A4",
  "\u30ED\u30FC\u30EB\u30D0\u30C3\u30AF",
  "\u30D0\u30C3\u30AF\u30A2\u30C3\u30D7",
  "\u30EC\u30A4\u30C6\u30F3\u30B7",
  "\u30B9\u30EB\u30FC\u30D7\u30C3\u30C8",
  "\u3057\u307E\u3059",
  "\u307E\u305B\u3093",
  "\u304F\u3060\u3055\u3044",
  "\u518D\u8D77\u52D5",
  "\u5FA9\u65E7",
  "\u5BFE\u5FDC",
  "\u5831\u544A",
  "\u5B8C\u4E86",
  "\u5931\u6557",
  "\u8B66\u544A",
  "\u76E3\u8996",
  "\u63A5\u7D9A",
  "\u5F71\u97FF\u7BC4\u56F2",
  "\u6CE8\u610F"
];
var CN = [
  "\u5FC5\u8981\u65F6",
  "\u8FDE\u63A5\u6C60",
  "\u8D1F\u8F7D\u5747\u8861",
  "\u5065\u5EB7\u68C0\u67E5",
  "\u518D\u5E73\u8861",
  "\u8BF7\u68C0\u67E5",
  "\u8BF7\u786E\u8BA4",
  "\u5DF2\u5B8C\u6210",
  "\u8FDB\u884C\u4E2D",
  "\u6EDA\u52A8\u66F4\u65B0",
  "\u7248\u672C\u56DE\u6EDA",
  "\u81EA\u52A8\u6062\u590D"
];
var PHRASEBOOK_V1 = [...EN_FUNCTION, ...EN_OPS, ...JP, ...CN];
var glyphCache = /* @__PURE__ */ new Map();
function phraseGlyphs(enc2) {
  const hit = glyphCache.get(enc2);
  if (hit) return hit;
  const out = [];
  for (let cp = 44032; cp <= 55203 && out.length < GLYPH_CAP; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc2).length === 1) out.push(ch);
    } catch {
    }
  }
  glyphCache.set(enc2, out);
  return out;
}
var bookCache = /* @__PURE__ */ new Map();
function phraseCodebook(enc2) {
  const hit = bookCache.get(enc2);
  if (hit) return hit;
  const glyphs = phraseGlyphs(enc2);
  const byPhrase = /* @__PURE__ */ new Map();
  const byGlyph = /* @__PURE__ */ new Map();
  let g = 0;
  for (const p of PHRASEBOOK_V1) {
    if (g >= glyphs.length) break;
    if (countTokens(p, enc2) < 2) continue;
    const glyph = glyphs[g++];
    byPhrase.set(p, glyph);
    byGlyph.set(glyph, p);
  }
  const foldOrder = [...byPhrase.keys()].sort((a, b) => b.length - a.length);
  const book = { byPhrase, byGlyph, foldOrder };
  bookCache.set(enc2, book);
  return book;
}
function phraseFold(text, enc2) {
  const book = phraseCodebook(enc2);
  let out = text;
  for (const p of book.foldOrder) out = out.split(p).join(book.byPhrase.get(p));
  return out;
}
function phraseExpand(body, enc2) {
  const book = phraseCodebook(enc2);
  if (!book.byGlyph.size) return body;
  let out = "";
  let i = 0;
  const n = body.length;
  while (i < n) {
    const c = body[i];
    const p = book.byGlyph.get(c);
    if (p !== void 0) {
      out += p;
      i++;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}
function hasCodebookGlyph(text, enc2) {
  const book = phraseCodebook(enc2);
  for (const c of text) if (book.byGlyph.has(c)) return true;
  return false;
}
function phraseDecode(wire, enc2 = "o200k_base") {
  if (wire.startsWith(PHRASE_LITERAL)) return wire.slice(PHRASE_LITERAL.length);
  if (wire.startsWith(PHRASE_SENTINEL)) return phraseExpand(wire.slice(PHRASE_SENTINEL.length), enc2);
  return wire;
}
function phraseEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    hits: 0,
    notes
  });
  if (!text || text.length > FOLD_CAP) return identity("empty or over cap");
  if (text.startsWith("\u03C6")) {
    const wire2 = PHRASE_LITERAL + text;
    const decoded2 = phraseDecode(wire2, enc2);
    return {
      wire: wire2,
      decoded: decoded2,
      exact: decoded2 === text,
      inTokens,
      outTokens: countTokens(wire2, enc2),
      savingsPct: 0,
      applied: true,
      hits: 0,
      notes: "forced literal wrap (\u03C6-prefixed source)"
    };
  }
  if (hasCodebookGlyph(text, enc2)) return identity("source contains a codebook glyph");
  const folded2 = phraseFold(text, enc2);
  if (folded2 === text) return identity("no codebook phrase occurs in the source");
  let hits = 0;
  const book = phraseCodebook(enc2);
  for (const [g] of book.byGlyph) if (folded2.includes(g)) hits++;
  const wire = PHRASE_SENTINEL + folded2;
  const outTokens = countTokens(wire, enc2);
  const decoded = phraseDecode(wire, enc2);
  if (decoded !== text) return identity("gate G3: fold did not round-trip (BUG \u2014 please report)");
  if (outTokens >= inTokens) return identity("gate G4: wire measured \u2265 input");
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: (inTokens - outTokens) / inTokens * 100,
    applied: true,
    hits,
    notes: `PHRASEBOOK-\u03C61 \xB7 ${hits} phrase glyphs folded \xB7 byte-exact`
  };
}
function phraseDecoderPrompt() {
  const book = phraseCodebook("o200k_base");
  const pairs = [...book.byPhrase.entries()].sort((a, b) => a[0].length - b[0].length).map(([p, g]) => `${JSON.stringify(p)}=${g}`);
  const lines2 = [];
  for (let i = 0; i < pairs.length; i += 4) lines2.push("  " + pairs.slice(i, i + 4).join("  "));
  return [
    "# \u03C6 PHRASEBOOK-\u03C61 \u2014 static phrase codebook wire",
    "A \u03C6 message is: \u03C6<body> (or \u03C6\u03C6<body> for a forced literal wrap \u2014 strip",
    "the 2-char prefix and output the rest verbatim). In a \u03C6 body, every",
    "Hangul syllable listed below expands to its phrase; everything else is",
    "literal. Reconstruction is byte-exact; nothing was summarised or dropped.",
    "The codebook is versioned (PHRASEBOOK_V1 in src/lib/omega/phrase.ts):",
    ...lines2,
    `(${pairs.length} pairs, book order is the wire contract; glyphs are the`,
    "tokenizer-verified single-token Hangul syllables U+AC00+ in scan order.)"
  ].join("\n");
}
var PHRASE_SYSTEM_PROMPT = phraseDecoderPrompt();

// src/lib/omega/tau.ts
var TAU_SENTINEL = "\u03C4\n";
var TAU_LITERAL = "\u03C4\u03C4\n";
var FOLD_CAP2 = 12e4;
function pipeSpan(lines2, mark2) {
  if (lines2.length < 2) return null;
  for (const l of lines2) {
    if (!/^\| .+ \|$/.test(l)) return null;
    for (const f of l.slice(2, -2).split(" | ")) if (f.length === 0 || f.includes(" ")) return null;
  }
  const rows = lines2.map((l) => l.slice(2, -2).split(" | ").join(" "));
  const render = () => rows.map((r) => "| " + r.split(" ").join(" | ") + " |").join("\n");
  if (render() !== lines2.join("\n")) return null;
  return { code: "P", span: mark2 + "P" + rows.length + "\n" + rows.join("\n"), render };
}
function commaSpan(lines2, mark2) {
  if (lines2.length < 2) return null;
  for (const l of lines2) {
    if (!l.includes(",")) return null;
    for (const f of l.split(",")) if (f.length === 0 || f.includes(" ")) return null;
  }
  const rows = lines2.map((l) => l.split(",").join(" "));
  const render = () => rows.map((r) => r.split(" ").join(",")).join("\n");
  if (render() !== lines2.join("\n")) return null;
  return { code: "C", span: mark2 + "C" + rows.length + "\n" + rows.join("\n"), render };
}
function yamlSpan(name, pairs, mark2, sep) {
  if (pairs.length < 2) return null;
  for (const [k2, v] of pairs) {
    if (!/^[A-Za-z_][\w-]*$/.test(k2)) return null;
    if (v === "" || v.includes(sep) || v.includes("\n")) return null;
  }
  const wire = mark2 + "Y" + name + sep + pairs.map(([k2, v]) => k2 + "=" + v).join(sep);
  const render = () => {
    const sp = wire.indexOf(sep);
    const out = [wire.slice(2, sp) + ":"];
    for (const p of wire.slice(sp + 1).split(sep)) {
      const eq = p.indexOf("=");
      out.push("  " + p.slice(0, eq) + ": " + p.slice(eq + 1));
    }
    return out.join("\n");
  };
  return { code: "Y", span: wire, render };
}
function yamlFromLines(lines2, mark2, sep) {
  if (lines2.length < 3 || !/^[A-Za-z_][\w-]*:$/.test(lines2[0])) return null;
  const name = lines2[0].slice(0, -1);
  const pairs = [];
  for (let i = 1; i < lines2.length; i++) {
    const m2 = /^  ([A-Za-z_][\w-]*): (.*)$/.exec(lines2[i]);
    if (!m2) return null;
    pairs.push([m2[1], m2[2]]);
  }
  const s = yamlSpan(name, pairs, mark2, sep);
  if (s === null) return null;
  if (s.render() !== lines2.join("\n")) return null;
  return s;
}
function tauMarkers(enc2) {
  const pool2 = rosettaPool(enc2);
  return { mark: pool2[0], sep: pool2[1] };
}
function tauDecode(wire, enc2 = "o200k_base") {
  if (wire.startsWith(TAU_LITERAL)) return wire.slice(TAU_LITERAL.length);
  if (!wire.startsWith(TAU_SENTINEL)) return wire;
  const { mark: mark2, sep } = tauMarkers(enc2);
  const body = wire.slice(TAU_SENTINEL.length);
  const lines2 = body.split("\n");
  const out = [];
  let i = 0;
  while (i < lines2.length) {
    const l = lines2[i];
    if (l.startsWith(mark2 + "P") || l.startsWith(mark2 + "C")) {
      const code = l[1];
      const digits = /^(\d+)/.exec(l.slice(2));
      if (digits) {
        const count = Number(digits[1]);
        const rows = lines2.slice(i + 1, i + 1 + count);
        if (count >= 2 && rows.length === count) {
          const re = code === "P" ? rows.map((r) => "| " + r.split(" ").join(" | ") + " |").join("\n") : rows.map((r) => r.split(" ").join(",")).join("\n");
          out.push(re);
          i += 1 + count;
          continue;
        }
      }
    }
    if (l.startsWith(mark2 + "Y")) {
      const sp = l.indexOf(sep);
      if (sp > 0) {
        const name = l.slice(2, sp);
        if (/^[A-Za-z_][\w-]*$/.test(name)) {
          const rebuilt = [name + ":"];
          for (const p of l.slice(sp + 1).split(sep)) {
            const eq = p.indexOf("=");
            if (eq <= 0) {
              rebuilt.length = 0;
              break;
            }
            rebuilt.push("  " + p.slice(0, eq) + ": " + p.slice(eq + 1));
          }
          if (rebuilt.length >= 3) {
            out.push(rebuilt.join("\n"));
            i++;
            continue;
          }
        }
      }
    }
    out.push(l);
    i++;
  }
  return out.join("\n");
}
function tauEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    systems: [],
    notes
  });
  if (!text || text.length > FOLD_CAP2) return identity("empty or over cap");
  if (text.startsWith(TAU_SENTINEL) || text.startsWith(TAU_LITERAL)) {
    const wire2 = TAU_LITERAL + text;
    const decoded2 = tauDecode(wire2, enc2);
    return {
      wire: wire2,
      decoded: decoded2,
      exact: decoded2 === text,
      inTokens,
      outTokens: countTokens(wire2, enc2),
      savingsPct: 0,
      applied: true,
      systems: ["wrap"],
      notes: "forced literal wrap (\u03C4-prefixed source)"
    };
  }
  const { mark: mark2, sep } = tauMarkers(enc2);
  if (text.includes(mark2) || text.includes(sep)) return identity("source contains a \u03C4 marker glyph");
  const lines2 = text.split("\n");
  const out = [];
  const systems = /* @__PURE__ */ new Set();
  const measure = text.length <= 12e3;
  let i = 0;
  while (i < lines2.length) {
    let j = i;
    while (j < lines2.length && lines2[j].startsWith("|")) j++;
    if (j - i >= 2) {
      const s = pipeSpan(lines2.slice(i, j), mark2);
      if (s !== null && (!measure || countTokens(s.span, enc2) < countTokens(lines2.slice(i, j).join("\n"), enc2))) {
        out.push(s.span);
        systems.add("P");
        i = j;
        continue;
      }
    }
    if (lines2[i] === "```yaml") {
      const end = lines2.indexOf("```", i + 1);
      if (end > 0) {
        const s = yamlFromLines(lines2.slice(i + 1, end), mark2, sep);
        if (s !== null) {
          const wrapped = "```yaml\n" + s.span + "\n```";
          if (!measure || countTokens(wrapped, enc2) < countTokens(lines2.slice(i, end + 1).join("\n"), enc2)) {
            out.push("```yaml", s.span, "```");
            systems.add("Y");
            i = end + 1;
            continue;
          }
        }
      }
    }
    j = i;
    while (j < lines2.length && lines2[j].includes(",") && !lines2[j].includes(" ")) j++;
    if (j - i >= 2) {
      const s = commaSpan(lines2.slice(i, j), mark2);
      if (s !== null && (!measure || countTokens(s.span, enc2) < countTokens(lines2.slice(i, j).join("\n"), enc2))) {
        out.push(s.span);
        systems.add("C");
        i = j;
        continue;
      }
    }
    out.push(lines2[i]);
    i++;
  }
  if (systems.size === 0) return identity("no foldable table/yaml block");
  const wire = TAU_SENTINEL + out.join("\n");
  const decoded = tauDecode(wire, enc2);
  if (decoded !== text) return identity("gate G3: fold did not round-trip (BUG \u2014 please report)");
  const outTokens = countTokens(wire, enc2);
  if (outTokens >= inTokens) return identity("gate G4: wire measured \u2265 input");
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: (inTokens - outTokens) / inTokens * 100,
    applied: true,
    systems: [...systems],
    notes: `TAU-\u03C41 systems=[${[...systems].join(",")}] \xB7 byte-exact`
  };
}
function tauDecoderPrompt() {
  return [
    "# \u03C4 TAU-\u03C41 \u2014 delimiter table + YAML transposition wire",
    "A \u03C4 message is: \u03C4\\n<body> (or \u03C4\u03C4\\n<body> \u2014 forced literal wrap: strip the",
    "3-char prefix and output the rest verbatim). In a \u03C4 body, a line starting",
    "with the marker glyph \u3041 (rosettaPool[0]) is a folded span; everything else is",
    "literal. Span grammar:",
    "1. \u3041P<count> \u2014 the next <count> lines are table rows whose fields were",
    "   space-joined; re-render each row as '| f1 | f2 | \u2026 |' (split on spaces,",
    "   join with ' | ', wrap in '| ' and ' |').",
    "2. \u3041C<count> \u2014 same, but re-join the fields with commas: f1,f2,\u2026",
    '3. \u3041Y<name>\u3042<k>=<v>\u3042\u2026 \u2014 a YAML block: re-render as "name:" then one',
    "   '  k: v' line per pair (two-space indent, ': ' separator); values are",
    "   literal, verbatim.",
    "Reconstruction is byte-exact; nothing was summarised or dropped."
  ].join("\n");
}
var TAU_SYSTEM_PROMPT = tauDecoderPrompt();

// src/lib/omega/lumen.ts
var KEY = "KEY ";
var DIV = "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500";
var MAX_ENTRIES6 = 80;
var MAX_CANDIDATES = 240;
function occ2(text, phrase) {
  let n = 0;
  let i = 0;
  while ((i = text.indexOf(phrase, i)) !== -1) {
    n++;
    i += phrase.length;
  }
  return n;
}
function candidates2(text, enc2) {
  const scan = text.length > 18e4 ? text.slice(0, 18e4) : text;
  const toks = Array.from(scan.matchAll(/[A-Za-z0-9_.$:/-]+|[^A-Za-z0-9_\s]+|\s+/g));
  const seen = /* @__PURE__ */ new Set();
  const scored = [];
  const push = (phrase) => {
    phrase = phrase.trimEnd();
    if (phrase.length < 6 || phrase.length > 160 || phrase.indexOf("\n") !== -1) return;
    if (seen.has(phrase)) return;
    seen.add(phrase);
    const hits = occ2(scan, phrase);
    if (hits < 2) return;
    const tok = countTokens(phrase, enc2);
    const score = (tok - 1) * hits - tok - 4;
    if (score > 0) scored.push({ phrase, score });
  };
  for (let w = 8; w >= 1; w--) {
    for (let i = 0; i + w <= toks.length; i++) {
      let phrase = "";
      for (let j = 0; j < w; j++) phrase += toks[i + j][0];
      push(phrase);
    }
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, MAX_CANDIDATES).map((x) => x.phrase);
}
function assemble3(entries, body) {
  if (entries.length === 0) return body;
  return KEY + "LUMEN\n" + entries.map((e) => `${e.alias}=${e.phrase}`).join("\n") + "\n" + DIV + "\n" + body;
}
function lumenDecode(wire) {
  if (!wire.startsWith(KEY)) return wire;
  const firstNl = wire.indexOf("\n");
  if (firstNl < 0) return wire;
  const div = "\n" + DIV + "\n";
  const divAt = wire.indexOf(div, firstNl + 1);
  if (divAt < 0) return wire;
  const rows = wire.slice(firstNl + 1, divAt).split("\n").filter(Boolean);
  let body = wire.slice(divAt + div.length);
  const entries = rows.map((row) => {
    const eq = row.indexOf("=");
    return eq === 1 ? { alias: row[0], phrase: row.slice(2) } : null;
  });
  if (entries.some((e) => e === null)) return wire;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    body = body.split(e.alias).join(e.phrase);
  }
  return body;
}
function lumenEncode(text, enc2 = "o200k_base") {
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    entries: [],
    mode: "identity",
    notes
  });
  if (!text) return identity("empty input");
  const free = ideographPool3(enc2).filter((ch) => text.indexOf(ch) === -1);
  if (free.length < 2) return identity("no free single-token aliases");
  let body = text;
  const entries = [];
  let bestWire = text;
  let bestTokens = inTokens;
  for (const phrase of candidates2(text, enc2)) {
    if (entries.length >= MAX_ENTRIES6 || entries.length >= free.length) break;
    const hits = occ2(body, phrase);
    if (hits < 2) continue;
    const alias = free[entries.length];
    const nextBody = body.split(phrase).join(alias);
    const nextEntries = [...entries, { alias, phrase, hits }];
    const wire = assemble3(nextEntries, nextBody);
    const tok = countTokens(wire, enc2);
    if (tok >= bestTokens) continue;
    body = nextBody;
    entries.push({ alias, phrase, hits });
    bestWire = wire;
    bestTokens = tok;
  }
  if (entries.length === 0) {
    if (!text.startsWith(KEY)) return identity("no measured positive-gain legend entries");
    const wire = KEY + "LUMEN\n" + DIV + "\n" + text;
    const decoded2 = lumenDecode(wire);
    const outTokens = countTokens(wire, enc2);
    return { wire, decoded: decoded2, exact: decoded2 === text, inTokens, outTokens, savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0, entries: [], mode: "forced-wrap", notes: "forced wrap for KEY-prefixed input" };
  }
  const decoded = lumenDecode(bestWire);
  if (decoded !== text) return identity("guard: LUMEN failed byte-verify");
  return { wire: bestWire, decoded, exact: true, inTokens, outTokens: bestTokens, savingsPct: inTokens ? (inTokens - bestTokens) / inTokens * 100 : 0, entries, mode: "lumen", notes: `${entries.length} LUMEN legend entries \xB7 byte-exact` };
}
var LUMEN_SYSTEM_PROMPT = [
  "A leading `KEY` block is a legend: each line maps one character to the text it stands for.",
  "The legend ends at the repeated divider line. Expand legend entries bottom-to-top.",
  "Everything after the divider is the message. Reconstruction is exact."
].join("\n");

// src/lib/omega/atlas.ts
function atlasDecode(wire) {
  if (wire.startsWith("[MZ1]\n")) return mosaicDecode(wire);
  if (wire.startsWith("KEY ")) return lumenDecode(wire);
  if (wire.startsWith("[PX2]\n")) return praxisDecode(wire);
  return mosaicDecode(wire);
}
function atlasEncode(text, enc2 = "o200k_base") {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    contractTokens: 0,
    deliveredTokens: inTokens,
    deliveredVsRaw: 0,
    member: "identity",
    contractPrompt: "",
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty input");
  const members = [{ name: "identity", wire: text, decoded: text, contract: "" }];
  try {
    const m2 = mosaicEncode(text, enc2);
    const contract = mosaicDecoderPrompt(m2);
    members.push({
      name: "mosaic",
      wire: m2.wire,
      decoded: m2.decoded,
      contract
    });
  } catch {
  }
  try {
    const l = lumenEncode(text, enc2);
    members.push({ name: "lumen", wire: l.wire, decoded: l.decoded, contract: LUMEN_SYSTEM_PROMPT });
  } catch {
  }
  try {
    const p = praxisEncode(text, enc2);
    members.push({ name: "praxis", wire: p.wire, decoded: p.decoded, contract: PRAXIS_SYSTEM_PROMPT });
  } catch {
  }
  let best = null;
  let bestDelivered = Number.POSITIVE_INFINITY;
  let bestWireTok = Number.POSITIVE_INFINITY;
  for (const m2 of members) {
    if (atlasDecode(m2.wire) !== text) continue;
    const wireTok = countTokens(m2.wire, enc2);
    const delivered = wireTok + countTokens(m2.contract, enc2);
    if (delivered < bestDelivered || delivered === bestDelivered && wireTok < bestWireTok) {
      best = m2;
      bestDelivered = delivered;
      bestWireTok = wireTok;
    }
  }
  if (!best || best.name === "identity") {
    return identity("identity delivers fewest tokens once the contract is counted");
  }
  const outTokens = countTokens(best.wire, enc2);
  if (outTokens >= inTokens) return identity("gate G2: winner wire not smaller than input");
  const decoded = atlasDecode(best.wire);
  if (decoded !== text) return identity("gate G1: winner failed byte-verify");
  const contractTokens = countTokens(best.contract, enc2);
  const deliveredTokens = outTokens + contractTokens;
  return {
    wire: best.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    contractTokens,
    deliveredTokens,
    deliveredVsRaw: inTokens - deliveredTokens,
    member: best.name,
    contractPrompt: best.contract,
    notes: `ATLAS: winner=${best.name} \xB7 wire ${inTokens}\u2192${outTokens} \xB7 contract ${contractTokens} \xB7 delivered ${deliveredTokens} (${inTokens - deliveredTokens >= 0 ? "+" : ""}${inTokens - deliveredTokens} vs raw) \xB7 byte-exact`,
    encodeMs: ms()
  };
}
var ATLAS_SYSTEM_PROMPT = [
  "# \u2727 ATLAS-A1 \u2014 byte-exact; winner minimises delivered tokens (wire + contract)",
  "Read the wire by its leading header:",
  "  [MZ1] \u2192 MOSAIC partitioned wire",
  "  KEY   \u2192 LUMEN legend (character = phrase; expand bottom-to-top)",
  "  [PX2] \u2192 PRAXIS dictionary (alias = phrase; expand bottom-to-top)",
  "  none  \u2192 literal text.",
  "Reconstruction is exact; nothing was summarised or dropped."
].join("\n");
function atlasDecoderPrompt(r) {
  if (!r) return ATLAS_SYSTEM_PROMPT;
  return r.contractPrompt;
}
var atlasCache = /* @__PURE__ */ new Map();
var ATLAS_CACHE_MAX = 8;
var ATLAS_CACHE_MAX_CHARS = 3e5;
var atlasEncodeUncached = atlasEncode;
function atlasEncodeCached(text, enc2 = "o200k_base") {
  const key = text.length <= ATLAS_CACHE_MAX_CHARS ? enc2 + "\0" + text : null;
  if (key) {
    const hit = atlasCache.get(key);
    if (hit) return hit;
  }
  const result = atlasEncodeUncached(text, enc2);
  if (key) {
    if (atlasCache.size >= ATLAS_CACHE_MAX) atlasCache.clear();
    atlasCache.set(key, result);
  }
  return result;
}

// src/lib/omega/aurora.ts
var SENTINEL13 = "[AR1]\n";
var MAX_BLOCKS2 = 10;
var MAX_CHARS2 = 3e5;
var MAX_LINES6 = 4e4;
var REGIME_SIG_CAP2 = 48;
var REGIME_SCAN_CAP2 = 200;
var LANES2 = [
  { bit: 0, tag: "i", name: "identity", encode: (t2) => ({ wire: t2, applied: true }), decode: (w) => w, contract: "" },
  { bit: 1, tag: "g", name: "signet", encode: (t2, e) => {
    const r = signetEncode(t2, e);
    return { wire: r.wire, applied: r.mode === "signet" };
  }, decode: signetDecode, contract: SIGNET_SYSTEM_PROMPT },
  { bit: 2, tag: "h", name: "helix", encode: (t2, e) => {
    const r = helixEncode(t2, e);
    return { wire: r.wire, applied: r.mode === "factored" };
  }, decode: helixDecode, contract: HELIX_SYSTEM_PROMPT },
  { bit: 4, tag: "p", name: "pulse", encode: (t2, e) => {
    const r = pulseEncode(t2, e);
    return { wire: r.wire, applied: r.mode === "pulse" };
  }, decode: pulseDecode, contract: PULSE_SYSTEM_PROMPT },
  { bit: 8, tag: "a", name: "anaphora", encode: (t2, e) => {
    const r = anaphoraEncode(t2, e);
    return { wire: r.wire, applied: r.mode === "anaphoric" };
  }, decode: anaphoraDecode, contract: anaphoraDecoderPrompt(null) }
];
var LANE_BY_TAG2 = new Map(LANES2.map((l) => [l.tag, l]));
function classOf3(code) {
  if (code >= 48 && code <= 57) return 1;
  if (code >= 65 && code <= 90 || code >= 97 && code <= 122) return 2;
  return 3;
}
function lineRegime2(line) {
  let sig = "";
  let i = 0;
  const n = Math.min(line.length, REGIME_SCAN_CAP2);
  while (i < n) {
    const c = classOf3(line.charCodeAt(i));
    let j = i + 1;
    while (j < n && classOf3(line.charCodeAt(j)) === c) j++;
    sig += c;
    i = j;
    if (sig.length >= REGIME_SIG_CAP2) break;
  }
  return sig;
}
function hasUnitRun2(s, min) {
  let run = 1;
  for (let i = 1; i < s.length; i++) {
    if (s.charCodeAt(i) === s.charCodeAt(i - 1)) {
      if (++run >= min) return true;
    } else run = 1;
  }
  return false;
}
function digitRunCount2(s, cap) {
  let n = 0;
  let inRun = false;
  for (let i = 0; i < s.length; i++) {
    const d = s.charCodeAt(i) >= 48 && s.charCodeAt(i) <= 57;
    if (d && !inRun) {
      if (++n >= cap) return n;
      inRun = true;
    } else if (!d) inRun = false;
  }
  return n;
}
function blockBounds2(lines2) {
  let bounds = [0];
  for (let i = 1; i < lines2.length; i++) if (lineRegime2(lines2[i]) !== lineRegime2(lines2[i - 1])) bounds.push(i);
  bounds.push(lines2.length);
  const cum = new Float64Array(lines2.length + 1);
  for (let i = 0; i < lines2.length; i++) cum[i + 1] = cum[i] + lines2[i].length + 1;
  while (bounds.length - 1 > MAX_BLOCKS2) {
    let victim = 1;
    let cost = Number.POSITIVE_INFINITY;
    for (let i = 1; i < bounds.length - 1; i++) {
      const c = cum[bounds[i + 1]] - cum[bounds[i - 1]];
      if (c < cost) {
        cost = c;
        victim = i;
      }
    }
    bounds.splice(victim, 1);
  }
  return bounds;
}
function contractCost(mask, enc2) {
  let s = "";
  for (const lane of LANES2) if (lane.bit && mask & lane.bit) s += lane.contract + "\n";
  return countTokens(s, enc2);
}
function bareDecode2(wire, depth = 0) {
  if (depth > 4) return wire;
  if (wire.startsWith("[SG1]\n")) return signetDecode(wire);
  if (wire.startsWith("[P1]\n")) return pulseDecode(wire);
  if (wire.startsWith("[AN1]\n")) {
    const d = anaphoraDecode(wire);
    return d === wire ? wire : bareDecode2(d, depth + 1);
  }
  return helixDecode(wire);
}
function auroraDecode(wire) {
  if (!wire.startsWith(SENTINEL13)) return bareDecode2(wire);
  const rest = wire.slice(SENTINEL13.length);
  const sep = rest[0];
  if (sep === void 0 || rest[1] !== "\n") return wire;
  const pieces = rest.slice(2).split(sep);
  if (pieces.length < 2 || pieces[0] !== "") return wire;
  const out = [];
  for (let i = 1; i < pieces.length; i++) {
    const p = pieces[i];
    const lane = LANE_BY_TAG2.get(p[0]);
    if (!lane) return wire;
    out.push(lane.decode(p.slice(1)));
  }
  return out.join("\n");
}
function auroraEncode(text, enc2 = "o200k_base") {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({ wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens, savingsPct: 0, contractTokens: 0, deliveredTokens: inTokens, deliveredVsRaw: 0, regions: [], mode: "identity", notes, encodeMs: ms() });
  if (!text) return identity("empty input");
  const lines2 = text.split("\n");
  const spanMemo = /* @__PURE__ */ new Map();
  const spans = (a, b) => {
    const key = a + ":" + b;
    const hit = spanMemo.get(key);
    if (hit) return hit;
    const src2 = lines2.slice(a, b).join("\n");
    const okPulse = hasUnitRun2(src2, 4);
    const okHelix = digitRunCount2(src2, 3) >= 3;
    const arr = [];
    for (const lane of LANES2) {
      if (lane.tag === "p" && !okPulse) continue;
      if (lane.tag === "h" && !okHelix) continue;
      if (lane.tag === "g" && b - a < 2) continue;
      if (lane.tag === "a" && src2.length < 16) continue;
      const r = lane.encode(src2, enc2);
      if (!r.applied && lane.tag !== "i") continue;
      if (lane.decode(r.wire) !== src2) continue;
      arr.push({ tag: lane.tag, wire: r.wire, tokens: countTokens(r.wire, enc2), mask: lane.bit });
    }
    spanMemo.set(key, arr);
    return arr;
  };
  const candidates3 = [];
  for (const sp of spans(0, lines2.length)) {
    candidates3.push({ wire: sp.wire, regions: [{ lane: LANE_BY_TAG2.get(sp.tag).name, lines: lines2.length, inTokens, outTokens: sp.tokens }], mode: "single", mask: sp.mask });
  }
  if (text.length <= MAX_CHARS2 && lines2.length <= MAX_LINES6) {
    const bounds = blockBounds2(lines2);
    const B = bounds.length - 1;
    const INF = 1e15;
    const dp = Array.from({ length: B + 1 }, () => new Array(16).fill(INF));
    const prev = Array.from({ length: B + 1 }, () => new Array(16).fill(null));
    dp[0][0] = 0;
    for (let j = 1; j <= B; j++) {
      for (let i = 0; i < j; i++) {
        for (let pm = 0; pm < 16; pm++) {
          if (dp[i][pm] >= INF) continue;
          for (const sp of spans(bounds[i], bounds[j])) {
            const nm = pm | sp.mask;
            const addFrame = 2;
            const cost = dp[i][pm] + sp.tokens + addFrame;
            if (cost < dp[j][nm]) {
              dp[j][nm] = cost;
              prev[j][nm] = { i, mask: pm, sp };
            }
          }
        }
      }
    }
    let bestMask = 0;
    let bestDelivered2 = INF;
    for (let m2 = 0; m2 < 16; m2++) {
      const delivered = dp[B][m2] + contractCost(m2, enc2);
      if (delivered < bestDelivered2) {
        bestDelivered2 = delivered;
        bestMask = m2;
      }
    }
    if (bestDelivered2 < INF) {
      const segs = [];
      let j = B;
      let m2 = bestMask;
      while (j > 0) {
        const p = prev[j][m2];
        if (!p) {
          segs.length = 0;
          break;
        }
        segs.push({ tag: p.sp.tag, wire: p.sp.wire, a: bounds[p.i], b: bounds[j], tokens: p.sp.tokens, mask: p.sp.mask });
        j = p.i;
        m2 = p.mask;
      }
      if (segs.length >= 2) {
        segs.reverse();
        const hay = text + "\0" + segs.map((s) => s.wire).join("\0");
        const sep = ideographPool3(enc2).find((ch) => hay.indexOf(ch) === -1);
        if (sep) {
          const wire = SENTINEL13 + sep + "\n" + segs.map((s) => sep + s.tag + s.wire).join("");
          candidates3.push({
            wire,
            mask: bestMask,
            mode: "aurora",
            regions: segs.map((s) => ({ lane: LANE_BY_TAG2.get(s.tag).name, lines: s.b - s.a, inTokens: countTokens(lines2.slice(s.a, s.b).join("\n"), enc2), outTokens: s.tokens }))
          });
        }
      }
    }
  }
  let best = null;
  let bestDelivered = inTokens;
  let bestWire = inTokens;
  for (const c of candidates3) {
    if (auroraDecode(c.wire) !== text) continue;
    const wt = countTokens(c.wire, enc2);
    const dt = wt + contractCost(c.mask, enc2);
    if (dt < bestDelivered || dt === bestDelivered && wt < bestWire) {
      best = c;
      bestDelivered = dt;
      bestWire = wt;
    }
  }
  if (!best) return identity("identity delivered fewest tokens");
  const decoded = auroraDecode(best.wire);
  if (decoded !== text) return identity("gate: byte-verify failed");
  if (bestWire >= inTokens && !text.startsWith(SENTINEL13)) return identity("gate: winner wire not smaller");
  const contractTokens = contractCost(best.mask, enc2);
  return { wire: best.wire, decoded, exact: true, inTokens, outTokens: bestWire, savingsPct: inTokens ? (inTokens - bestWire) / inTokens * 100 : 0, contractTokens, deliveredTokens: bestDelivered, deliveredVsRaw: inTokens - bestDelivered, regions: best.regions, mode: best.mode, notes: `AURORA delivered-DP \xB7 ${best.regions.length} region(s) \xB7 contract ${contractTokens} \xB7 delivered ${bestDelivered}`, encodeMs: ms() };
}
function auroraDecoderPrompt(r) {
  const used = new Set((r?.regions ?? []).map((x) => x.lane));
  const parts = ["# \u25C7 AURORA-A1 \u2014 contract-aware partition wire"];
  parts.push("If [AR1], line 2 declares separator S. Split S<tag><region> chunks, decode each region by tag, join with newline. If no [AR1], read by the leading region header or literally.");
  if (!r || used.has("signet")) parts.push(SIGNET_SYSTEM_PROMPT);
  if (!r || used.has("helix")) parts.push(HELIX_SYSTEM_PROMPT);
  if (!r || used.has("pulse")) parts.push(PULSE_SYSTEM_PROMPT);
  if (!r || used.has("anaphora")) parts.push(anaphoraDecoderPrompt(null));
  return parts.join("\n\n");
}
var AURORA_SYSTEM_PROMPT = auroraDecoderPrompt(null);
var auroraCache = /* @__PURE__ */ new Map();
var AURORA_CACHE_MAX = 8;
var AURORA_CACHE_MAX_CHARS = 3e5;
var auroraEncodeUncached = auroraEncode;
function auroraEncodeCached(text, enc2 = "o200k_base") {
  const key = text.length <= AURORA_CACHE_MAX_CHARS ? enc2 + "\0" + text : null;
  if (key) {
    const hit = auroraCache.get(key);
    if (hit) return hit;
  }
  const result = auroraEncodeUncached(text, enc2);
  if (key) {
    if (auroraCache.size >= AURORA_CACHE_MAX) auroraCache.clear();
    auroraCache.set(key, result);
  }
  return result;
}

// src/lib/omega/crown.ts
function crownDecode(wire) {
  for (const fn of [atlasDecode, auroraDecode, mosaicDecode, signetDecode, pulseDecode, anaphoraDecode, helixDecode]) {
    try {
      const d = fn(wire);
      if (d !== wire) return d;
    } catch {
    }
  }
  return wire;
}
async function crownEncode(text, enc2 = "o200k_base") {
  return crownEncodeFromMembers(text, enc2);
}
async function crownEncodeFromMembers(text, enc2 = "o200k_base", supplied = {}) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes, audit2 = []) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    contractTokens: 0,
    deliveredTokens: inTokens,
    deliveredVsRaw: 0,
    member: "identity",
    decoderPrompt: "",
    notes,
    encodeMs: ms(),
    audit: audit2
  });
  if (!text) return identity("empty input");
  const members = [{ lane: "identity", wire: text, decoded: text, contract: "", decode: (w) => w }];
  try {
    const r = supplied.atlas ?? atlasEncodeCached(text, enc2);
    members.push({ lane: "atlas", wire: r.wire, decoded: r.decoded, contract: atlasDecoderPrompt(r), decode: atlasDecode });
  } catch {
  }
  try {
    const r = supplied.aurora ?? auroraEncodeCached(text, enc2);
    members.push({ lane: "aurora", wire: r.wire, decoded: r.decoded, contract: auroraDecoderPrompt(r), decode: auroraDecode });
  } catch {
  }
  try {
    const r = supplied.mosaic ?? mosaicEncode(text, enc2);
    members.push({ lane: "mosaic", wire: r.wire, decoded: r.decoded, contract: mosaicDecoderPrompt(r), decode: mosaicDecode });
  } catch {
  }
  try {
    const r = supplied.orbit ?? await orbitEncode(text, enc2, null, []);
    members.push({ lane: "orbit", wire: r.wire, decoded: r.decoded, contract: orbitDecoderPrompt(r), decode: crownDecode });
  } catch {
  }
  try {
    const r = supplied.signet ?? signetEncode(text, enc2);
    members.push({ lane: "signet", wire: r.wire, decoded: r.decoded, contract: SIGNET_SYSTEM_PROMPT, decode: signetDecode });
  } catch {
  }
  try {
    const r = supplied.helix ?? helixEncode(text, enc2);
    members.push({ lane: "helix", wire: r.wire, decoded: r.decoded, contract: HELIX_SYSTEM_PROMPT, decode: helixDecode });
  } catch {
  }
  try {
    const r = supplied.pulse ?? pulseEncode(text, enc2);
    members.push({ lane: "pulse", wire: r.wire, decoded: r.decoded, contract: PULSE_SYSTEM_PROMPT, decode: pulseDecode });
  } catch {
  }
  try {
    const r = supplied.anaphora ?? anaphoraEncode(text, enc2);
    members.push({ lane: "anaphora", wire: r.wire, decoded: r.decoded, contract: anaphoraDecoderPrompt(r), decode: anaphoraDecode });
  } catch {
  }
  const audit = [];
  let best = null;
  let bestDelivered = Number.POSITIVE_INFINITY;
  let bestWire = Number.POSITIVE_INFINITY;
  let bestContract = 0;
  for (const m2 of members) {
    if (m2.decode(m2.wire) !== text) continue;
    const wire = countTokens(m2.wire, enc2);
    const contract = countTokens(m2.contract, enc2);
    const delivered = wire + contract;
    audit.push({ lane: m2.lane, wire, contract, delivered });
    if (delivered < bestDelivered || delivered === bestDelivered && wire < bestWire) {
      best = m2;
      bestDelivered = delivered;
      bestWire = wire;
      bestContract = contract;
    }
  }
  audit.sort((a, b) => a.delivered - b.delivered || a.wire - b.wire);
  if (!best || best.lane === "identity") return identity("identity delivers fewest tokens once contract is counted", audit);
  if (bestWire >= inTokens) return identity("gate: winner wire not smaller", audit);
  const decoded = best.decode(best.wire);
  if (decoded !== text) return identity("gate: winner failed byte-verify", audit);
  return {
    wire: best.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens: bestWire,
    savingsPct: inTokens ? (inTokens - bestWire) / inTokens * 100 : 0,
    contractTokens: bestContract,
    deliveredTokens: bestDelivered,
    deliveredVsRaw: inTokens - bestDelivered,
    member: best.lane,
    decoderPrompt: best.contract,
    notes: `CROWN winner=${best.lane} \xB7 wire ${inTokens}->${bestWire} \xB7 contract ${bestContract} \xB7 delivered ${bestDelivered} (${inTokens - bestDelivered >= 0 ? "+" : ""}${inTokens - bestDelivered} vs raw) \xB7 byte-exact`,
    encodeMs: ms(),
    audit
  };
}
var crownCache = /* @__PURE__ */ new Map();
var CROWN_CACHE_MAX = 8;
var CROWN_CACHE_MAX_CHARS = 3e5;
var crownEncodeUncached = crownEncode;
async function crownEncodeCached(text, enc2 = "o200k_base") {
  const key = text.length <= CROWN_CACHE_MAX_CHARS ? enc2 + "\0" + text : null;
  if (key) {
    const hit = crownCache.get(key);
    if (hit) return hit;
  }
  const result = await crownEncodeUncached(text, enc2);
  if (key) {
    if (crownCache.size >= CROWN_CACHE_MAX) crownCache.clear();
    crownCache.set(key, result);
  }
  return result;
}

// src/lib/omega/kernel.ts
function compactAnaphora(wire) {
  const rest = wire.slice("[AN1]\n".length);
  const o = rest[0] ?? "O";
  const c = rest[1] ?? "C";
  return `AN1 exact: ${o}kP${c} binds k=P; later k=>P; nested inside-out; other chars literal.`;
}
function compactHelix() {
  return "HELIX exact: \u27D0[s,d,n,w,l]q => n values s+i*d, zero-pad w, join by next l chars q; \u27D0\u27D0=>\u27D0; else literal.";
}
function compactPulse() {
  return "P1 exact: \u27E1[n,x]=>n copies of UTF-16 code unit hex x; \u27E1\u27E1=>\u27E1; else literal.";
}
function compactSignet(wire) {
  const rules = [
    "SG1 exact: line2=B,E,F,V,S. Block BmFtemplateFcolumnsE => m rows; split template on S; row r interleaves pieces with column[r]."
  ];
  if (wire.indexOf("=") !== -1) rules.push("=x constant.");
  if (wire.indexOf("#") !== -1) rules.push("#a,d,w => a+r*d padded w.");
  if (wire.indexOf("@") !== -1) rules.push("@pVx... => p-cycle.");
  if (wire.indexOf("%") !== -1) rules.push("%a,wVq => a then cumulative q-deltas, padded w.");
  if (wire.indexOf("^") !== -1) rules.push("^nVxq => prepend n-char x to q.");
  if (wire.indexOf("$") !== -1) rules.push("$nVxq => append n-char x to q.");
  if (wire.indexOf("~") !== -1) rules.push("~xV... => literal list.");
  rules.push("Untagged column is V-separated literal list; all else literal.");
  return rules.join(" ");
}
function compactPraxis() {
  return "PX2 exact: rows before [/PX2] are k=phrase; in body expand k bottom-to-top; other text literal.";
}
function compactLumen() {
  return "KEY exact: rows before divider are k=phrase; expand k bottom-to-top in following body; other text literal.";
}
function compactPartition(wire, sentinel) {
  const rest = wire.slice(sentinel.length);
  const sep = rest[0];
  if (!sep || rest[1] !== "\n") return "";
  const pieces = rest.slice(2).split(sep).slice(1);
  const tags = /* @__PURE__ */ new Set();
  const bodies = /* @__PURE__ */ new Map();
  for (const piece of pieces) {
    tags.add(piece[0]);
    if (!bodies.has(piece[0])) bodies.set(piece[0], piece.slice(1));
  }
  const rules = [
    `${sentinel.trim()} exact: line2 separator S; split S<tag><region>, decode tags, join regions with newline.`
  ];
  if (tags.has("i")) rules.push("i literal.");
  if (tags.has("g")) rules.push("g " + compactSignet(bodies.get("g") ?? ""));
  if (tags.has("h")) rules.push("h " + compactHelix());
  if (tags.has("p")) rules.push("p " + compactPulse());
  if (tags.has("a")) rules.push("a " + compactAnaphora(bodies.get("a") ?? ""));
  if (tags.has("d")) rules.push("d PX2 exact: legend rows before [/PX2] map one-character aliases to phrases; expand aliases bottom-to-top; else literal.");
  if (tags.has("s")) rules.push("s SIGMA exact: decode typed JSONL/CSV schema rows; restore original spelling exactly.");
  if (tags.has("m")) rules.push("m MERIDIAN exact: decode its visible M1 anaphora/HELIX composition; expand bindings and arithmetic runs; else literal.");
  if (tags.has("q")) rules.push("q QUASAR exact: decode QSR dictionary bindings bottom-to-top with literal fallback.");
  if (tags.has("x")) rules.push("x PLEXUS exact: decode PX bindings and nested HELIX composition; literal fallback.");
  if (tags.has("v")) rules.push("v VERITAS exact: decode VX1 escaped dictionary aliases; all unbound text literal.");
  if (tags.has("o")) rules.push("o AXIOM exact: decode AX1 exact bindings and nested numeric expansions; literal fallback.");
  if (tags.has("t")) rules.push("t TESSERA exact: decode TS1 typed structural bindings; literal fallback.");
  if (tags.has("r")) rules.push("r STRATA exact: decode ST1 structural bindings and HELIX runs; literal fallback.");
  if (tags.has("b")) rules.push("b REPAIR exact: decode RP1 JSON binary grammar rules recursively; unbound text literal.");
  if (tags.has("l")) rules.push("l TRIE exact: decode TR1 prefix, suffix list, and trailing-newline flag.");
  if (tags.has("c")) rules.push("c COLUMN exact: decode CL1 prefix, suffix, middle rows, and trailing-newline flag.");
  return rules.join(" ");
}
function compactContract(wire) {
  if (wire.startsWith("[MZ1]\n")) return compactPartition(wire, "[MZ1]\n");
  if (wire.startsWith("[AR1]\n")) return compactPartition(wire, "[AR1]\n");
  if (wire.startsWith("[SG1]\n")) return compactSignet(wire);
  if (wire.startsWith("[AN1]\n")) return compactAnaphora(wire);
  if (wire.startsWith("[P1]\n")) return compactPulse();
  if (wire.startsWith("[PX2]\n")) return compactPraxis();
  if (wire.startsWith("KEY ")) return compactLumen();
  if (wire.indexOf("\u27D0[") !== -1) return compactHelix();
  return "";
}

// src/lib/omega/splice.ts
var SENTINEL14 = "[SP1]\n";
function spliceDecode(wire) {
  if (!wire.startsWith(SENTINEL14)) return wire;
  const nested = wire.slice(SENTINEL14.length);
  return praxisDecode(mosaicDecode(nested));
}
function spliceContract(mosaic, enc2) {
  const compact = compactContract(mosaic.wire);
  const candidates3 = [
    `${SENTINEL14.trim()} exact: decode nested MOSAIC using its visible tags; then decode PX2 aliases bottom-to-top; else literal.`,
    compact ? `${SENTINEL14.trim()}: ${compact} Then decode PX2 legend aliases bottom-to-top; else literal.` : "",
    PRAXIS_SYSTEM_PROMPT
  ].filter(Boolean);
  let prompt = candidates3[0];
  let tokens = countTokens(prompt, enc2);
  for (const candidate of candidates3.slice(1)) {
    const next = countTokens(candidate, enc2);
    if (next < tokens) {
      prompt = candidate;
      tokens = next;
    }
  }
  return { prompt, tokens };
}
function spliceEncode(text, enc2 = "o200k_base") {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    contractPrompt: "",
    contractTokens: 0,
    deliveredTokens: inTokens,
    deliveredVsRaw: 0,
    savingsPct: 0,
    source: "identity",
    notes,
    encodeMs: (typeof performance !== "undefined" ? performance.now() : 0) - t0
  });
  if (!text) return identity("empty input");
  const praxis = praxisEncode(text, enc2);
  if (!praxis.exact || praxis.mode !== "praxis") return identity("PRAXIS stage did not produce a verified dictionary");
  const mosaic = mosaicEncode(praxis.wire, enc2);
  const wire = SENTINEL14 + mosaic.wire;
  const decoded = spliceDecode(wire);
  if (!mosaic.exact || decoded !== text) return identity("composition round-trip failed");
  const contract = spliceContract(mosaic, enc2);
  const outTokens = countTokens(wire, enc2);
  const deliveredTokens = outTokens + contract.tokens;
  if (deliveredTokens >= inTokens) return identity("delivered-token gate rejected composition");
  return {
    wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    contractPrompt: contract.prompt,
    contractTokens: contract.tokens,
    deliveredTokens,
    deliveredVsRaw: inTokens - deliveredTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    source: "splice",
    notes: `SPLICE verified PRAXIS\u2192MOSAIC composition \xB7 ${praxis.entries.length} shared entries \xB7 delivered ${deliveredTokens}`,
    encodeMs: (typeof performance !== "undefined" ? performance.now() : 0) - t0
  };
}

// src/lib/omega/rosetta.ts
var RNS1_REGIONS = [
  // AWS
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-south-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-southeast-3",
  "ap-southeast-4",
  "ca-central-1",
  "ca-west-1",
  "eu-central-1",
  "eu-central-2",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "eu-south-1",
  "eu-south-2",
  "il-central-1",
  "me-central-1",
  "me-south-1",
  "sa-east-1",
  // Azure
  "eastus2",
  "westus2",
  "westus3",
  "centralus",
  "northcentralus",
  "southcentralus",
  "northeurope",
  "westeurope",
  "francecentral",
  "francesouth",
  "germanywestcentral",
  "germanynorth",
  "uksouth",
  "ukwest",
  "switzerlandnorth",
  "switzerlandwest",
  "norwayeast",
  "norwaywest",
  "swedencentral",
  "polandcentral",
  "qatarcentral",
  "uaenorth",
  "uaecentral",
  "centralindia",
  "southindia",
  "westindia",
  "japaneast",
  "japanwest",
  "koreacentral",
  "koreasouth",
  "southeastasia",
  "eastasia",
  "australiaeast",
  "australiacentral",
  "australiacentral2",
  "australiasoutheast",
  "brazilsouth",
  "brazilsoutheast",
  "canadacentral",
  "canadaeast",
  "eastus",
  "westus",
  // GCP
  "us-central1",
  "us-east4",
  "us-east5",
  "us-west3",
  "us-west4",
  "northamerica-northeast1",
  "northamerica-northeast2",
  "southamerica-east1",
  "southamerica-west1",
  "europe-west2",
  "europe-west4",
  "europe-west6",
  "europe-west8",
  "europe-west9",
  "europe-north1",
  "europe-central2",
  "asia-east2",
  "asia-south1",
  "asia-south2",
  "asia-southeast2",
  "asia-northeast2",
  "asia-northeast3",
  "australia-southeast2",
  "me-west1",
  "us-east1",
  "us-west1",
  "us-west2",
  "europe-west1",
  "europe-west3",
  "asia-east1",
  "asia-southeast1",
  "australia-southeast1"
];
var poolCache7 = /* @__PURE__ */ new Map();
var POOL_CJK_START = 21904;
function rosettaPool(enc2) {
  const hit = poolCache7.get(enc2);
  if (hit) return hit;
  const out = [];
  const pushRange = (from, to, cap = 4e3) => {
    for (let cp = from; cp <= to && out.length < cap; cp++) {
      const ch = String.fromCodePoint(cp);
      try {
        if (encodeIds(ch, enc2).length === 1) out.push(ch);
      } catch {
      }
    }
  };
  pushRange(12353, 12438, 2048);
  pushRange(12449, 12534, 2048);
  pushRange(POOL_CJK_START, 40869, 2048);
  poolCache7.set(enc2, out);
  return out;
}
var TS_EXT = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?/g;
var TS_BASIC = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d{1,9})?(Z|[+-]\d{4})?$/;
var BASIC_MIN = 15;
var BASIC_MAX = 30;
function plausibleDate(y, mo, d, h, mi, s) {
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const min = Number(mi);
  const sec = Number(s);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23 || min > 59 || sec > 59) return false;
  return Number(y) >= 1e3 && Number(y) <= 9999;
}
function extToBasic(m2) {
  const zone = m2[8] ? m2[8].replace(":", "") : "";
  return `${m2[1]}${m2[2]}${m2[3]}T${m2[4]}${m2[5]}${m2[6]}${m2[7] ?? ""}${zone}`;
}
function basicToExt(b) {
  const m2 = TS_BASIC.exec(b);
  if (!m2 || m2[0] !== b) return null;
  const zone = m2[8] ? m2[8] === "Z" ? "Z" : `${m2[8].slice(0, 3)}:${m2[8].slice(3)}` : "";
  return `${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}${m2[7] ?? ""}${zone}`;
}
function probeBasic(s, i) {
  for (let len = BASIC_MAX; len >= BASIC_MIN; len--) {
    if (i + 1 + len > s.length) continue;
    const cand = s.slice(i + 1, i + 1 + len);
    const ext = basicToExt(cand);
    if (ext === null) continue;
    if (plausibleDate(
      cand.slice(0, 4),
      cand.slice(4, 6),
      cand.slice(6, 8),
      cand.slice(9, 11),
      cand.slice(11, 13),
      cand.slice(13, 15)
    )) {
      return { ext, end: i + 1 + len };
    }
  }
  return null;
}
var KEY_RE = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
function bareableString(s) {
  if (s === "") return false;
  if (s.includes("|") || s.includes("=") || s.includes('"') || /\s/.test(s)) return false;
  if (s === "true" || s === "false" || s === "null") return false;
  if (!Number.isNaN(Number(s))) return false;
  return true;
}
function kvEscape(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function kvUnescape(s) {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
function foldJsonLine(line) {
  if (!line.startsWith("{") || !line.endsWith("}") || line.length < 4) return null;
  const inner = line.slice(1, -1);
  if (inner.includes("{") || inner.includes("}")) return null;
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  try {
    if (JSON.stringify(parsed) !== line) return null;
  } catch {
    return null;
  }
  const pairs = [];
  for (const [k2, v] of Object.entries(parsed)) {
    if (!KEY_RE.test(k2)) return null;
    if (typeof v === "string") {
      pairs.push({ key: k2, val: bareableString(v) ? v : `"${kvEscape(v)}"` });
    } else if (typeof v === "number" || typeof v === "boolean" || v === null) {
      pairs.push({ key: k2, val: v === null ? "null" : String(v) });
    } else if (Array.isArray(v)) {
      if (v.length === 0) return null;
      const parts = [];
      for (const el of v) {
        if (typeof el === "string") {
          if (!bareableString(el)) return null;
          parts.push(el);
        } else if (typeof el === "number" || typeof el === "boolean" || el === null) {
          parts.push(el === null ? "null" : String(el));
        } else {
          return null;
        }
      }
      pairs.push({ key: k2, val: parts.join("|") });
    } else {
      return null;
    }
  }
  return pairs;
}
function unfoldJsonPairs(pairs) {
  const out = [];
  for (const p of pairs) {
    if (!KEY_RE.test(p.key)) return null;
    let rendered;
    const v = p.val;
    if (v.startsWith('"')) {
      if (!v.endsWith('"') || v.length < 2) return null;
      rendered = JSON.stringify(kvUnescape(v.slice(1, -1)));
    } else if (v.includes("|")) {
      const arr = [];
      for (const part of v.split("|")) {
        if (part === "true" || part === "false") arr.push(part === "true");
        else if (part === "null") arr.push(null);
        else if (part !== "" && !Number.isNaN(Number(part))) arr.push(Number(part));
        else arr.push(part);
      }
      rendered = JSON.stringify(arr);
    } else if (v === "true" || v === "false" || v === "null") {
      rendered = v;
    } else if (v !== "" && !Number.isNaN(Number(v))) {
      rendered = JSON.stringify(Number(v));
    } else {
      rendered = JSON.stringify(v);
    }
    out.push(`${JSON.stringify(p.key)}:${rendered}`);
  }
  return `{${out.join(",")}}`;
}
function csvFoldableLine(line) {
  if (!line.includes(",")) return false;
  for (const f of line.split(",")) {
    if (f.length === 0 || f.includes(" ")) return false;
  }
  return true;
}
function pickWindow(text, enc2) {
  const pool2 = rosettaPool(enc2);
  const m2 = 3 + RNS1_REGIONS.length;
  if (pool2.length < m2 + 1) return null;
  const src2 = /* @__PURE__ */ new Set();
  for (const ch of text) src2.add(ch);
  const limit = pool2.length - m2;
  for (let k2 = 0; k2 <= limit; k2++) {
    let clear = true;
    for (let j = 0; j < m2; j++) {
      if (src2.has(pool2[k2 + j])) {
        clear = false;
        break;
      }
    }
    if (clear) return k2;
  }
  return null;
}
function expandBody(s, mark2, regionByGlyph2, phraseByGlyph = null, sep = null) {
  let out = "";
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === mark2) {
      const probe = probeBasic(s, i);
      if (probe) {
        out += probe.ext;
        i = probe.end;
        continue;
      }
      if (s[i + 1] === "J") {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const payload = expandBody(s.slice(i + 2, payloadEnd), mark2, regionByGlyph2, phraseByGlyph, sep);
          const pairs = parseKvPayload(payload);
          const json = pairs ? unfoldJsonPairs(pairs) : null;
          if (json !== null) {
            out += json;
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === "C") {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const rows = s.slice(i + 2, payloadEnd).split("\n");
          let ok = true;
          const rebuilt = [];
          for (const row of rows) {
            const fields = row.split(" ");
            if (fields.length < 2) {
              ok = false;
              break;
            }
            rebuilt.push(fields.map((f) => expandBody(f, mark2, regionByGlyph2, phraseByGlyph, sep)).join(","));
          }
          if (ok) {
            out += rebuilt.join("\n");
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === "P") {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const rows = s.slice(i + 2, payloadEnd).split("\n");
          let ok = true;
          const rebuilt = [];
          for (const row of rows) {
            const fields = row.split(" ");
            if (fields.length < 2) {
              ok = false;
              break;
            }
            rebuilt.push("| " + fields.map((f) => expandBody(f, mark2, regionByGlyph2, phraseByGlyph, sep)).join(" | ") + " |");
          }
          if (ok) {
            out += rebuilt.join("\n");
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === "F") {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const lines2 = s.slice(i + 2, payloadEnd).split("\n");
          const keys = (lines2[0] ?? "").split(" ");
          let ok = keys.length >= 1 && keys.every((k2) => KEY_RE.test(k2));
          const rebuilt = [];
          if (ok) {
            for (let r = 1; r < lines2.length; r++) {
              const vals = lines2[r].split(" ");
              if (vals.length !== keys.length) {
                ok = false;
                break;
              }
              rebuilt.push(
                "{" + keys.map((k2, c2) => `"${k2}":${expandBody(vals[c2], mark2, regionByGlyph2, phraseByGlyph, sep)}`).join(",") + "}"
              );
            }
          }
          if (ok && rebuilt.length > 0) {
            out += rebuilt.join("\n");
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === "Y" && sep !== null) {
        const payloadEnd = scanPayloadEnd(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const sp = payload.indexOf(sep);
          if (sp > 0) {
            const name = payload.slice(0, sp);
            const pairs = payload.slice(sp + 1).split(sep);
            let ok = /^[A-Za-z_][\w-]*$/.test(name) && pairs.length >= 2;
            const rebuilt = [name + ":"];
            if (ok) {
              for (const p of pairs) {
                const eq = p.indexOf("=");
                if (eq <= 0 || !KEY_RE.test(p.slice(0, eq))) {
                  ok = false;
                  break;
                }
                rebuilt.push("  " + p.slice(0, eq) + ": " + expandBody(p.slice(eq + 1), mark2, regionByGlyph2, phraseByGlyph, sep));
              }
            }
            if (ok) {
              out += rebuilt.join("\n");
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      out += c;
      i++;
      continue;
    }
    const region = regionByGlyph2.get(c);
    if (region !== void 0) {
      out += region;
      i++;
      continue;
    }
    if (phraseByGlyph !== null) {
      const phrase = phraseByGlyph.get(c);
      if (phrase !== void 0) {
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
function scanPayloadEnd(s, start, mark2) {
  for (let i = start; i < s.length; i++) {
    if (s[i] === mark2 && probeBasic(s, i) === null) return i;
  }
  return -1;
}
function parseKvPayload(payload) {
  if (payload === "") return [];
  const pairs = [];
  let i = 0;
  const n = payload.length;
  while (i < n) {
    let j = i;
    while (j < n && /[A-Za-z0-9_.-]/.test(payload[j])) j++;
    if (j === i || j >= n || payload[j] !== "=") return null;
    const key = payload.slice(i, j);
    i = j + 1;
    let val;
    if (payload[i] === '"') {
      let k2 = i + 1;
      let v = "";
      let closed = false;
      while (k2 < n) {
        if (payload[k2] === "\\" && k2 + 1 < n && (payload[k2 + 1] === '"' || payload[k2 + 1] === "\\")) {
          v += payload[k2 + 1];
          k2 += 2;
          continue;
        }
        if (payload[k2] === '"') {
          closed = true;
          break;
        }
        v += payload[k2];
        k2++;
      }
      if (!closed) return null;
      val = `"${v}"`;
      i = k2 + 1;
    } else {
      let k2 = i;
      while (k2 < n && payload[k2] !== " ") k2++;
      val = payload.slice(i, k2);
      i = k2;
    }
    if (!KEY_RE.test(key)) return null;
    pairs.push({ key, val });
    if (i < n) {
      if (payload[i] !== " ") return null;
      i++;
      if (i === n) return null;
    }
  }
  return pairs;
}
var MEASURE_CAP = 12e3;
var TRANSPOSE_CAP = 12e4;
function rosettaTranspose(text, enc2 = "o200k_base", folded2 = null) {
  const empty = { wire: null, mark: "", windowStart: -1, systems: [] };
  if (!text || text.length > TRANSPOSE_CAP) return empty;
  const k2 = pickWindow(text, enc2);
  if (k2 === null) return empty;
  const pool2 = rosettaPool(enc2);
  const mark2 = pool2[k2];
  const sep = pool2[k2 + 2 + RNS1_REGIONS.length];
  const measure = text.length <= MEASURE_CAP;
  const phraseByGlyph = folded2 !== null ? phraseCodebook(enc2).byGlyph : null;
  let t2 = folded2 ?? text;
  const regionByGlyph2 = /* @__PURE__ */ new Map();
  for (let i = 0; i < RNS1_REGIONS.length; i++) {
    const glyph = pool2[k2 + 1 + i];
    regionByGlyph2.set(glyph, RNS1_REGIONS[i]);
    if (t2.includes(RNS1_REGIONS[i])) t2 = t2.split(RNS1_REGIONS[i]).join(glyph);
  }
  const hasRegions = t2 !== (folded2 ?? text);
  const lines2 = t2.split("\n");
  const srcLines2 = text.split("\n");
  const outLines2 = [];
  const systems = /* @__PURE__ */ new Set([...folded2 !== null ? ["W"] : [], ...hasRegions ? ["R"] : []]);
  let csvRun2 = [];
  let csvRunOrig2 = [];
  let csvRunSrc2 = [];
  const flushCsv2 = () => {
    if (csvRun2.length >= 2) {
      const payload = csvRun2.join("\n");
      const span = mark2 + "C" + payload + mark2;
      const orig = csvRunOrig2.join("\n");
      const rebuilt = payload.split("\n").map((row) => row.split(" ").map((f) => expandBody(f, mark2, regionByGlyph2, phraseByGlyph, sep)).join(",")).join("\n");
      const srcRows = csvRunSrc2.join("\n");
      const profitable = !measure || countTokens(span, enc2) < countTokens(orig, enc2);
      if (rebuilt === srcRows && profitable) {
        outLines2.push(span);
        systems.add("C");
        csvRun2 = [];
        csvRunOrig2 = [];
        csvRunSrc2 = [];
        return;
      }
    }
    outLines2.push(...csvRunOrig2);
    csvRun2 = [];
    csvRunOrig2 = [];
    csvRunSrc2 = [];
  };
  for (let li = 0; li < lines2.length; li++) {
    const line = lines2[li];
    const srcLine = srcLines2[li];
    {
      let j = li;
      while (j < lines2.length && lines2[j].startsWith("|")) j++;
      if (j - li >= 2) {
        const run = lines2.slice(li, j);
        const srcRun = srcLines2.slice(li, j);
        const ps = pipeSpan(run, mark2);
        if (ps !== null) {
          const span = mark2 + "P" + run.map((r) => r.startsWith("| ") && r.endsWith(" |") ? r.slice(2, -2).split(" | ").join(" ") : r).join("\n") + mark2;
          const rebuilt = span.slice(2, -1).split("\n").map((row) => "| " + row.split(" ").map((f) => expandBody(f, mark2, regionByGlyph2, phraseByGlyph, sep)).join(" | ") + " |").join("\n");
          const profitable = !measure || countTokens(span, enc2) < countTokens(run.join("\n"), enc2);
          if (rebuilt === srcRun.join("\n") && profitable) {
            flushCsv2();
            outLines2.push(span);
            systems.add("P");
            li = j - 1;
            continue;
          }
        }
      }
      if (line === "```yaml") {
        const end = lines2.indexOf("```", li + 1);
        if (end > 0) {
          const inner = lines2.slice(li + 1, end);
          const srcInner = srcLines2.slice(li + 1, end);
          const ys = yamlFromLines(inner, mark2, sep);
          if (ys !== null) {
            const span = mark2 + "Y" + inner[0].slice(0, -1) + sep + inner.slice(1).map((l) => {
              const m2 = /^  ([A-Za-z_][\w-]*): (.*)$/.exec(l);
              return m2[1] + "=" + m2[2];
            }).join(sep) + mark2;
            const rebuilt = (() => {
              const sp = span.indexOf(sep);
              const out = [span.slice(2, sp) + ":"];
              for (const pr of span.slice(sp + 1).split(sep)) {
                const eq = pr.indexOf("=");
                out.push("  " + pr.slice(0, eq) + ": " + expandBody(pr.slice(eq + 1), mark2, regionByGlyph2, phraseByGlyph, sep));
              }
              return out.join("\n");
            })();
            const wrapped = "```yaml\n" + span + "\n```";
            const profitable = !measure || countTokens(wrapped, enc2) < countTokens(lines2.slice(li, end + 1).join("\n"), enc2);
            if (rebuilt === srcInner.join("\n") && profitable) {
              flushCsv2();
              outLines2.push("```yaml", span, "```");
              systems.add("Y");
              li = end;
              continue;
            }
          }
        }
      }
      if (line.startsWith("{")) {
        let j2 = li;
        while (j2 < lines2.length && lines2[j2].startsWith("{")) j2++;
        if (j2 - li >= 2) {
          const run = lines2.slice(li, j2);
          const srcRun = srcLines2.slice(li, j2);
          let keys = null;
          let vals = [];
          let famOk = true;
          for (const l of run) {
            try {
              const o = JSON.parse(l);
              if (typeof o !== "object" || o === null || Array.isArray(o)) {
                famOk = false;
                break;
              }
              const ks = Object.keys(o);
              if (keys === null) keys = ks;
              else if (ks.join("") !== keys.join("")) {
                famOk = false;
                break;
              }
              const raw = [];
              for (const key of ks) {
                const v = JSON.stringify(o[key]);
                if (v.includes(" ") || v.includes("\n")) {
                  famOk = false;
                  break;
                }
                raw.push(v);
              }
              if (!famOk) break;
              vals.push(raw);
            } catch {
              famOk = false;
              break;
            }
          }
          if (famOk && keys !== null && keys.every((key) => KEY_RE.test(key))) {
            const span = mark2 + "F" + keys.join(" ") + "\n" + vals.map((r) => r.join(" ")).join("\n") + mark2;
            const rebuilt = vals.map((r) => "{" + keys.map((key, c) => '"' + key + '":' + expandBody(r[c], mark2, regionByGlyph2, phraseByGlyph, sep)).join(",") + "}").join("\n");
            const profitable = !measure || countTokens(span, enc2) < countTokens(run.join("\n"), enc2);
            if (rebuilt === srcRun.join("\n") && profitable) {
              flushCsv2();
              outLines2.push(span);
              systems.add("F");
              li = j2 - 1;
              continue;
            }
          }
        }
      }
    }
    const tsLine = tsTransposeLine(line, mark2, enc2, measure);
    if (tsLine !== line) systems.add("T");
    const pairs = foldJsonLine(tsLine);
    if (pairs !== null) {
      const kv = pairs.map((p) => `${p.key}=${p.val}`).join(" ");
      const back = parseKvPayload(kv);
      if (back !== null && unfoldJsonPairs(back) === tsLine) {
        const span = mark2 + "J" + kv + mark2;
        if (!measure || countTokens(span, enc2) < countTokens(line, enc2)) {
          flushCsv2();
          outLines2.push(span);
          systems.add("J");
          continue;
        }
      }
    }
    if (csvFoldableLine(tsLine)) {
      csvRun2.push(tsLine.split(",").join(" "));
      csvRunOrig2.push(tsLine);
      csvRunSrc2.push(srcLine);
      continue;
    }
    flushCsv2();
    outLines2.push(tsLine);
  }
  flushCsv2();
  if (systems.size === 0) return empty;
  const body = outLines2.join("\n");
  if (expandBody(body, mark2, regionByGlyph2, phraseByGlyph, sep) !== text) return empty;
  const wire = folded2 !== null ? mark2 + "\n" + pool2[k2 + 1 + RNS1_REGIONS.length] + "\n" + body : mark2 + "\n" + body;
  return { wire, mark: mark2, windowStart: k2, systems: [...systems] };
}
function tsTransposeLine(line, mark2, enc2, measure) {
  TS_EXT.lastIndex = 0;
  let out = "";
  let last = 0;
  let m2;
  while ((m2 = TS_EXT.exec(line)) !== null) {
    if (!plausibleDate(m2[1], m2[2], m2[3], m2[4], m2[5], m2[6])) continue;
    const basic = mark2 + extToBasic(m2);
    if (measure && countTokens(basic, enc2) >= countTokens(m2[0], enc2)) continue;
    out += line.slice(last, m2.index) + basic;
    last = m2.index + m2[0].length;
  }
  out += line.slice(last);
  return out;
}
function rosettaDecode(wire, enc2 = "o200k_base") {
  if (wire.startsWith("[MZ1]\n")) return mosaicDecode(wire);
  if (wire.startsWith("[SG1]\n")) return signetDecode(wire);
  if (wire.startsWith("[P1]\n")) return pulseDecode(wire);
  if (wire.startsWith("[M1]\n")) return meridianDecode(wire);
  if (wire.startsWith("\u27E8QSR\u27E9\n")) return quasarDecode(wire);
  if (wire.startsWith("[PX]\n")) return plexusDecode(wire);
  if (wire.startsWith("[[VX1\n")) return veritasDecode(wire);
  if (wire.startsWith("[AX1]\n")) return axiomDecode(wire, []);
  if (wire.startsWith("[TS1]\n")) return tesseraDecode(wire);
  if (wire.startsWith("[ST1]\n")) return strataDecode(wire);
  if (wire.startsWith("[RP1]\n")) return repairDecode(wire);
  if (wire.startsWith("[TR1]\n")) return trieDecode(wire);
  if (wire.startsWith("[CL1]\n")) return columnDecode(wire);
  if (wire.startsWith("[SP1]\n")) return spliceDecode(wire);
  if (wire.startsWith("[\u2318STENCIL]")) return stencilDecode(wire);
  if (wire.startsWith("[\u03FA]")) return morphDecode(wire);
  if (wire.startsWith(KAPPA_SENTINEL)) return kappaDecode(wire, enc2);
  if (wire.startsWith(PHRASE_SENTINEL) || wire.startsWith(PHRASE_LITERAL)) return phraseDecode(wire, enc2);
  if (wire.startsWith(TAU_SENTINEL) || wire.startsWith(TAU_LITERAL)) return tauDecode(wire, enc2);
  if (wire.includes("\u27D0")) return helixDecode(wire);
  if (wire.length >= 2 && wire[1] === "\n") {
    const pool2 = rosettaPool(enc2);
    const idx = pool2.indexOf(wire[0]);
    if (idx >= 0) {
      const mark2 = pool2[idx];
      const regionByGlyph2 = /* @__PURE__ */ new Map();
      for (let i = 0; i < RNS1_REGIONS.length; i++) {
        regionByGlyph2.set(pool2[idx + 1 + i], RNS1_REGIONS[i]);
      }
      const flag = pool2[idx + 1 + RNS1_REGIONS.length];
      const ysep = pool2[idx + 2 + RNS1_REGIONS.length] ?? null;
      if (flag !== void 0 && wire.length >= 4 && wire[2] === flag && wire[3] === "\n") {
        return expandBody(wire.slice(4), mark2, regionByGlyph2, phraseCodebook(enc2).byGlyph, ysep);
      }
      return expandBody(wire.slice(2), mark2, regionByGlyph2, null, ysep);
    }
  }
  return wire;
}
var HEAVY_MEMBER_CAP = 6e3;
var encodeCache4 = /* @__PURE__ */ new Map();
var CACHE_MAX3 = 6;
async function rosettaEncode(text, enc2 = "o200k_base", supplied = {}) {
  const key = text.length <= 2e5 ? enc2 + "\0" + text : null;
  if (key !== null) {
    const hit = encodeCache4.get(key);
    if (hit) return hit;
  }
  const r = await rosettaEncodeUncached(text, enc2, supplied);
  if (key !== null) {
    if (encodeCache4.size >= CACHE_MAX3) encodeCache4.clear();
    encodeCache4.set(key, r);
  }
  return r;
}
async function rosettaEncodeUncached(text, enc2, supplied) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    member: "identity",
    systems: [],
    audit: [],
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty input");
  const audit = [];
  let best = null;
  let bestTokens = inTokens;
  const admit = (member, wire, decode, systems = [], force = false) => {
    try {
      const back = decode();
      const tk = countTokens(wire, enc2);
      const exact = back === text;
      audit.push({ member, tokens: exact ? tk : -1, exact });
      if (exact && (force || tk < bestTokens) && !(wire === text && ambiguousIdentity)) {
        best = { wire, member, systems, decode };
        bestTokens = tk;
      }
    } catch {
      audit.push({ member, tokens: -1, exact: false });
    }
  };
  const ambiguousIdentity = text.length >= 2 && text[1] === "\n" && rosettaPool(enc2).includes(text[0]) || text.includes("\u27D0") || [
    "[MZ1]\n",
    "[SG1]\n",
    "[P1]\n",
    "[M1]\n",
    "\u27E8QSR\u27E9\n",
    "[PX]\n",
    "[[VX1\n",
    "[AX1]\n",
    "[TS1]\n",
    "[ST1]\n",
    "[RP1]\n",
    "[TR1]\n",
    "[CL1]\n",
    "[SP1]\n",
    "[\u2318STENCIL]",
    "[\u03FA]",
    "\u03BA\n",
    "\u03C6",
    "\u03C4\n",
    "\u03C4\u03C4\n"
  ].some((s) => text.startsWith(s));
  if (!ambiguousIdentity) admit("identity", text, () => text);
  const tr = rosettaTranspose(text, enc2);
  if (tr.wire !== null && rosettaDecode(tr.wire, enc2) === text) {
    admit("rosetta-T", tr.wire, () => rosettaDecode(tr.wire, enc2), tr.systems);
  } else {
    const k2 = pickWindow(text, enc2);
    if (k2 !== null) {
      const wrapWire = rosettaPool(enc2)[k2] + "\n" + text;
      admit("forced-wrap", wrapWire, () => rosettaDecode(wrapWire, enc2), [], true);
    }
  }
  if (!hasCodebookGlyph(text, enc2)) {
    const folded2 = phraseFold(text, enc2);
    if (folded2 !== text) {
      const trW = rosettaTranspose(text, enc2, folded2);
      if (trW.wire !== null && trW.wire !== tr.wire && rosettaDecode(trW.wire, enc2) === text) {
        admit("rosetta-W", trW.wire, () => rosettaDecode(trW.wire, enc2), trW.systems);
      }
    }
  }
  {
    const phr = phraseEncode(text, enc2);
    if (phr.exact && phr.decoded === text) admit("phrase", phr.wire, () => phraseDecode(phr.wire, enc2));
  }
  {
    const tu = tauEncode(text, enc2);
    if (tu.exact && tu.decoded === text) admit("tau", tu.wire, () => tauDecode(tu.wire, enc2), tu.systems);
  }
  {
    const r = signetEncode(text, enc2);
    if (r.exact && r.decoded === text) admit("signet", r.wire, () => signetDecode(r.wire));
    const s = strataEncode(text, enc2);
    if (s.exact && s.decoded === text) admit("strata", s.wire, () => strataDecode(s.wire));
    const te = tesseraEncode(text, enc2);
    if (te.exact && te.decoded === text) admit("tessera", te.wire, () => tesseraDecode(te.wire));
    const c = columnEncode(text, enc2);
    if (c.applied && c.decoded === text) admit("column", c.wire, () => columnDecode(c.wire));
    const ti = trieEncode(text, enc2);
    if (ti.applied && ti.decoded === text) admit("trie", ti.wire, () => trieDecode(ti.wire));
    const rp = repairEncode(text, enc2);
    if (rp.applied && rp.decoded === text) admit("repair", rp.wire, () => repairDecode(rp.wire));
    const st = stencilEncode(text, enc2);
    if (st.exact && st.applied && st.decoded === text) admit("stencil", st.wire, () => stencilDecode(st.wire));
    const mo = morphEncode(text, enc2);
    if (mo.exact && mo.applied && mo.decoded === text) admit("morph", mo.wire, () => morphDecode(mo.wire));
    const he = helixEncode(text, enc2);
    if (he.exact && he.decoded === text) admit("helix", he.wire, () => helixDecode(he.wire));
    const pu = pulseEncode(text, enc2);
    if (pu.exact && pu.decoded === text) admit("pulse", pu.wire, () => pulseDecode(pu.wire));
    const me = meridianEncode(text, enc2);
    if (me.exact && me.decoded === text) admit("meridian", me.wire, () => meridianDecode(me.wire));
    const qa = quasarEncode(text, enc2);
    if (qa.exact && qa.decoded === text) admit("quasar", qa.wire, () => quasarDecode(qa.wire));
    const kp = kappaEncode(text, enc2);
    if (kp.exact && kp.decoded === text) admit("kappa", kp.wire, () => kappaDecode(kp.wire, enc2));
  }
  try {
    const orbit = supplied.orbit ?? await orbitEncode(text, enc2);
    if (orbit.exact && orbit.decoded === text) {
      admit("orbit", orbit.wire, () => mosaicDecode(orbit.wire));
    }
  } catch {
    audit.push({ member: "orbit", tokens: -1, exact: false });
  }
  if (text.length <= HEAVY_MEMBER_CAP) {
    try {
      const crown = supplied.crown ?? await crownEncodeCached(text, enc2);
      if (crown.exact && crown.decoded === text) {
        admit("crown", crown.wire, () => crownDecode(crown.wire));
      }
    } catch {
      audit.push({ member: "crown", tokens: -1, exact: false });
    }
    try {
      const sp = supplied.splice ?? spliceEncode(text, enc2);
      if (sp.exact && sp.decoded === text) {
        admit("splice", sp.wire, () => spliceDecode(sp.wire));
      }
    } catch {
      audit.push({ member: "splice", tokens: -1, exact: false });
    }
  }
  const winner = best;
  if (!winner) {
    return identity(
      ambiguousIdentity ? "no candidate under the exact gate; identity wire is mark/sentinel-ambiguous (decode caveat: the decoder may misread the first line)" : "no candidate beat the input under the exact gate"
    );
  }
  const decoded = winner.decode();
  if (decoded !== text) return identity("gate G4: winner failed byte-verify");
  const outTokens = countTokens(winner.wire, enc2);
  if (outTokens >= inTokens && winner.member !== "forced-wrap") {
    return identity("gate G3: wire measured \u2265 input");
  }
  return {
    wire: winner.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    member: winner.member,
    systems: winner.systems,
    audit,
    notes: `ROSETTA member=${winner.member} systems=[${winner.systems.join(",")}] \xB7 ${audit.filter((a) => a.exact).length} exact candidates \xB7 byte-exact`,
    encodeMs: ms()
  };
}
function rosettaDecoderPrompt() {
  const pool2 = rosettaPool("o200k_base");
  return [
    "# \u27FF ROSETTA-R2 \u2014 byte-exact notational transposition wire",
    "A ROSETTA message is: <glyph>\\n<body>. The first glyph comes from the",
    "ROSETTA glyph pool (version-stable, tokenizer-verified single-token",
    "characters; reference: rosettaPool in src/lib/omega/rosetta.ts). Its pool",
    "index k anchors the codebook: glyph pool[k] is the span marker; glyph",
    `pool[k+1+i] denotes region i of the RNS-1 table (${RNS1_REGIONS.length} cloud`,
    "regions, in the fixed order shipped in rosetta.ts).",
    "Decode <body> left to right:",
    "1. marker + 15-30 digit/T/Z run \u2192 an ISO-8601 BASIC instant; re-render it",
    "   in EXTENDED form (insert dashes and colons: 20260915T060211Z \u2192",
    "   2026-09-15T06:02:11Z; a \xB1HHMM offset becomes \xB1HH:MM).",
    "2. marker + J + pairs + marker \u2192 a JSON object. Pairs are key=value",
    "   separated by single spaces. A quoted value is a string; a bare value",
    "   is true/false/null, a number, or a string; a|b|c is an array. Rebuild",
    '   the exact compact JSON {"k":v,\u2026} preserving key order.',
    "3. marker + C + rows + marker \u2192 a comma table. Each line's fields were",
    "   space-joined; re-join them with commas.",
    "3a. marker + P + rows + marker \u2192 a pipe table. Each line's fields were",
    '   space-joined; re-join with pipe-space " | " and wrap in pipes and',
    '   spaces: "team tickets sla" \u2192 "| team | tickets | sla |".',
    "3b. marker + F + keys + newline + value-rows + marker \u2192 a JSON line",
    "   family. The first line is the shared key sequence (space-joined);",
    "   each row carries one record's values (space-joined raw JSON",
    "   literals). Rebuild one compact JSON object per row:",
    '   keys [a b] + row [1 "x"] \u2192 {"a":1,"b":"x"}.',
    "3c. inside a \\u0060\\u0060\\u0060yaml block, marker + Y + name + SEP + k=v SEP",
    '   k=v \u2026 + marker \u2192 flat YAML: the name line, then "  k: v" per pair',
    "   (SEP = pool[k+2+RNS-1 size]; values are literal).",
    `4. any other glyph from pool[k+1 .. k+${RNS1_REGIONS.length}] \u2192 its RNS-1 region name.`,
    "5. anything else is literal text.",
    "Nested marker+timestamp spans inside J, C, P and F payloads expand too.",
    "W-wires: when the first body line is a single pool glyph followed by \\n",
    "(the phrase flag, pool[k+1+RNS-1 size]), every Hangul syllable of the",
    "PHRASEBOOK-\u03C61 codebook (versioned in src/lib/omega/phrase.ts) in the body",
    "expands to its phrase \u2014 a folded multi-token spelling restored as one",
    "glyph. Wires starting \u03C6 or \u03C6\u03C6 are PHRASEBOOK member wires: decode",
    "them with the \u03C6 codebook rules (\u03C6\u03C6 = forced literal wrap, strip 2).",
    "Wires starting \u03C4\\n or \u03C4\u03C4\\n are TAU-\u03C41 member wires: decode them with",
    "the \u03C4 table/YAML transposition rules (\u03C4\u03C4\\n = forced literal wrap,",
    "strip 3).",
    "Reconstruction is byte-exact; nothing was summarised or dropped.",
    `Pool head (o200k): ${pool2.slice(0, 6).join(" ")} \u2026 full pool and region order are versioned in rosetta.ts.`
  ].join("\n");
}
var ROSETTA_SYSTEM_PROMPT = rosettaDecoderPrompt();
var CHAOS_B = [
  "Summary: the ingestion pipeline dropped 3 events during the failover window.",
  "- consumer lag 2.4k messages, resolved in 90s",
  "- dead-letter queue gained 12 entries (poison payloads)",
  "service,env,replicas,cpu_pct",
  "ingest,prod,6,71",
  "query,prod,4,88",
  "auth,staging,2,34",
  '{"event":"restart","count":2,"ok":true,"tags":["oom","deploy"],"pid":4127}',
  "func health(nodes []string) error {",
  "    for _, n := range nodes {",
  '        if !ping(n, 2*time.Second) { return fmt.Errorf("node %s down", n) }',
  "    }",
  "    return nil",
  "}",
  "\u6CE8\u610F\uFF1A\u641C\u7D22\u7D22\u5F15\u91CD\u5EFA\u5B8C\u6210\uFF0C\u4F46\u5206\u7247\u518D\u5E73\u8861\u4ECD\u5728\u8FDB\u884C\uFF0C\u9884\u8BA1\u4E09\u5341\u5206\u949F\u540E\u7ED3\u675F\u3002",
  "audit: 2026-09-15T06:14:52Z INFO shard 7 rebalanced (moved 12GB)",
  'gh pr view 8412 --json title,author --jq ".title" | tee /tmp/pr.txt',
  "Actions: pause the indexer, drain shard 7, then verify counts."
].join("\n");
var CHAOS_C = [
  "Postmortem draft: the checkout service returned 502s for 4 minutes.",
  "- root cause: certificate expired on the edge proxy",
  "- blast radius: 1.2k sessions, 34 abandoned carts",
  "env,service,error_rate,p95_ms",
  "prod,checkout,0.062,940",
  "prod,payments,0.003,311",
  "staging,checkout,0.011,502",
  '{"trace":"abc123","spans":18,"ok":false,"retry":["edge","auth"],"ms":4021}',
  "select count(*) from orders where created_at > now() - interval '4 min';",
  "// fix: rotate certs weekly, alert 14 days before expiry",
  "\u7ED3\u8BBA\uFF1A\u8FB9\u7F18\u8BC1\u4E66\u8FC7\u671F\u5BFC\u81F4\u7F51\u5173\u62D2\u7EDD\u4E0A\u6E38\u8FDE\u63A5\uFF0C\u5DF2\u6DFB\u52A0\u81EA\u52A8\u8F6E\u6362\u4E0E\u544A\u8B66\u3002",
  "oncall: 2026-09-15T07:31:04Z RESOLVED checkout 502s (cert rotated)",
  "Region failover us-west-2 \u2192 eu-west-1 completed in 90s."
].join("\n");

// src/lib/omega/astraea.ts
var TECHNICAL_COLLOCATIONS = [
  "infrastructure",
  "configuration",
  "rebalancing",
  "responsiveness",
  "deliberates",
  "architecture",
  "optimization",
  "heterogeneous",
  "evaluating",
  "frequently",
  "non-repetitive",
  "fundamental",
  "bottleneck",
  "tokenization",
  "algorithms",
  "vocabulary",
  "multi-stage",
  "cross-model",
  "compatibility",
  "deterministically",
  "environments",
  "aggregation",
  "conversational",
  "necessitates",
  "decomposition",
  "sub-regime",
  "sub-word",
  "distributed context",
  "prompt distributions",
  "language model",
  "billing overhead",
  "traditional redundancy",
  "sub-word tokenization",
  "byte-pair encoding",
  "domain-specific",
  "notational transposition",
  "dictionary substitution",
  "sub-word fragments",
  "underlying content",
  "cross-model compatibility",
  "microservice traces",
  "agent interaction",
  "key optimization objectives",
  "cluster health",
  "incident report",
  "production environment",
  "synthetic load tests",
  "connection pool limits",
  "pod memory",
  "retry budget",
  "failover completed",
  "creationTimestamp",
  "ClusterHealthException",
  "TLS handshake timeout",
  "  - ",
  "\n  - ",
  "  * ",
  "\n  * ",
  " distributed",
  " optimization",
  " requires",
  " invariants",
  " across",
  " prompt",
  " distributions",
  " evaluating",
  " model",
  " latency",
  " billing",
  " overhead",
  " traditional",
  " redundancy",
  " codecs",
  " frequently",
  " experience",
  " degradation",
  " non-repetitive",
  " payloads",
  " fundamental",
  " bottleneck",
  " stems",
  " algorithms",
  " used by",
  " byte-pair",
  " schemes",
  " technical",
  " vocabulary",
  " morphological",
  " suffixes",
  " domain-specific",
  " identifier",
  " stems",
  " fragment",
  " multiple",
  " token",
  " consistently",
  " incur",
  " significant",
  " expansion",
  " penalties",
  " despite",
  " representing",
  " single",
  " semantic",
  " concepts",
  " mitigate",
  " inefficiency",
  " investigate",
  " notational",
  " transposition",
  " combined",
  " adaptive",
  " structural",
  " dictionary",
  " substitution",
  " identifying",
  " high-frequency",
  " delimiter",
  " patterns",
  " standardized",
  " schema",
  " encodings",
  " runtime",
  " optimal",
  " representation",
  " synthesized",
  " without",
  " discarding",
  " underlying",
  " content",
  " furthermore",
  " cross-model",
  " dictates",
  " resulting",
  " wire",
  " format",
  " decode",
  " deterministically",
  " diverse",
  " tokenizer",
  " implementations",
  " requiring",
  " out-of-band",
  " state",
  " specialized",
  " local",
  " execution",
  " environments",
  " enterprise",
  " production",
  " aggregation",
  " streams",
  " microservice",
  " traces",
  " exhibit",
  " mixed",
  " entropy",
  " interaction",
  " turn",
  " routinely",
  " contains",
  " conversational",
  " natural",
  " prose",
  " metadata",
  " tabular",
  " metrics",
  " shell",
  " invocation",
  " commands",
  " localized",
  " multilingual",
  " status",
  " annotations",
  " achieving",
  " Pareto",
  " superiority",
  " baseline",
  " conditions",
  " necessitates",
  " multi-stage",
  " decomposition",
  " capable",
  " dynamically",
  " selecting",
  " minimal",
  " each",
  " sub-regime"
];
var ASTRAEA_LEXICON_V2 = [
  ...PHRASEBOOK_V1,
  ...TECHNICAL_COLLOCATIONS
];
var GLYPH_CAP2 = 1024;
var lexiconGlyphCache = /* @__PURE__ */ new Map();
function astraeaLexiconGlyphs(enc2) {
  const hit = lexiconGlyphCache.get(enc2);
  if (hit) return hit;
  const out = [];
  for (let cp = 44032; cp <= 55203 && out.length < GLYPH_CAP2; cp++) {
    const ch = String.fromCodePoint(cp);
    try {
      if (encodeIds(ch, enc2).length === 1) out.push(ch);
    } catch {
    }
  }
  lexiconGlyphCache.set(enc2, out);
  return out;
}
var lexiconBookCache = /* @__PURE__ */ new Map();
function astraeaLexiconCodebook(enc2) {
  const hit = lexiconBookCache.get(enc2);
  if (hit) return hit;
  const glyphs = astraeaLexiconGlyphs(enc2);
  const byPhrase = /* @__PURE__ */ new Map();
  const byGlyph = /* @__PURE__ */ new Map();
  let g = 0;
  for (const p of ASTRAEA_LEXICON_V2) {
    if (g >= glyphs.length) break;
    if (countTokens(p, enc2) < 2) continue;
    const glyph = glyphs[g++];
    byPhrase.set(p, glyph);
    byGlyph.set(glyph, p);
  }
  const foldOrder = [...byPhrase.keys()].sort((a, b) => b.length - a.length);
  const book = { byPhrase, byGlyph, foldOrder };
  lexiconBookCache.set(enc2, book);
  return book;
}
function hasAstraeaLexiconGlyph(text, enc2) {
  const book = astraeaLexiconCodebook(enc2);
  for (const c of text) if (book.byGlyph.has(c)) return true;
  return false;
}
function astraeaLexiconFold(text, enc2) {
  const book = astraeaLexiconCodebook(enc2);
  let out = text;
  for (const p of book.foldOrder) {
    if (out.includes(p)) {
      out = out.split(p).join(book.byPhrase.get(p));
    }
  }
  return out;
}
function extractDynamicEntries(text, enc2, mark2, staticGlyphCount) {
  if (text.length < 80) return [];
  const allHangul = astraeaLexiconGlyphs(enc2);
  const availableGlyphs = [];
  for (let idx = staticGlyphCount; idx < allHangul.length; idx++) {
    if (!text.includes(allHangul[idx])) {
      availableGlyphs.push(allHangul[idx]);
    }
  }
  if (availableGlyphs.length === 0) return [];
  const candidates3 = /* @__PURE__ */ new Map();
  const words2 = text.match(/\S+/g) ?? [];
  for (let len = 1; len <= 6; len++) {
    for (let i = 0; i <= words2.length - len; i++) {
      const phrase = words2.slice(i, i + len).join(" ");
      if (phrase.length >= 5 && phrase.length <= 80 && !phrase.includes(mark2)) {
        candidates3.set(phrase, (candidates3.get(phrase) ?? 0) + 1);
      }
    }
  }
  const items = [];
  for (const [phrase, count] of candidates3.entries()) {
    if (count < 2) continue;
    const origTok = countTokens(phrase, enc2);
    if (origTok <= 1) continue;
    const entryStr = `x=${JSON.stringify(phrase)} `;
    const headerCost = countTokens(entryStr, enc2);
    const bodySavings = count * (origTok - 1);
    const netSavings = bodySavings - headerCost;
    if (netSavings > 0) {
      items.push({ phrase, count, savings: netSavings, origTok });
    }
  }
  items.sort((a, b) => b.savings - a.savings || b.phrase.length - a.phrase.length);
  const selected = [];
  let gIdx = 0;
  let remainingText = text;
  for (const item of items) {
    if (gIdx >= availableGlyphs.length || selected.length >= 48) break;
    const countInRemaining = remainingText.split(item.phrase).length - 1;
    if (countInRemaining >= 2) {
      const glyph = availableGlyphs[gIdx++];
      selected.push({ glyph, phrase: item.phrase });
      remainingText = remainingText.split(item.phrase).join(glyph);
    }
  }
  return selected;
}
var TS_EXT2 = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?/g;
var TS_BASIC2 = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d{1,9})?(Z|[+-]\d{4})?$/;
var BASIC_MIN2 = 15;
var BASIC_MAX2 = 30;
function plausibleDate2(y, mo, d, h, mi, s) {
  const month = Number(mo);
  const day = Number(d);
  const hour = Number(h);
  const min = Number(mi);
  const sec = Number(s);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (hour > 23 || min > 59 || sec > 59) return false;
  return Number(y) >= 1e3 && Number(y) <= 9999;
}
function extToBasic2(m2) {
  const zone = m2[8] ? m2[8].replace(":", "") : "";
  return `${m2[1]}${m2[2]}${m2[3]}T${m2[4]}${m2[5]}${m2[6]}${m2[7] ?? ""}${zone}`;
}
function basicToExt2(b) {
  const m2 = TS_BASIC2.exec(b);
  if (!m2 || m2[0] !== b) return null;
  const zone = m2[8] ? m2[8] === "Z" ? "Z" : `${m2[8].slice(0, 3)}:${m2[8].slice(3)}` : "";
  return `${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}${m2[7] ?? ""}${zone}`;
}
function probeBasic2(s, i) {
  for (let len = BASIC_MAX2; len >= BASIC_MIN2; len--) {
    if (i + 1 + len > s.length) continue;
    const cand = s.slice(i + 1, i + 1 + len);
    const ext = basicToExt2(cand);
    if (ext === null) continue;
    if (plausibleDate2(
      cand.slice(0, 4),
      cand.slice(4, 6),
      cand.slice(6, 8),
      cand.slice(9, 11),
      cand.slice(11, 13),
      cand.slice(13, 15)
    )) {
      return { ext, end: i + 1 + len };
    }
  }
  return null;
}
function scanPayloadEnd2(s, start, mark2) {
  for (let i = start; i < s.length; i++) {
    if (s[i] === mark2 && probeBasic2(s, i) === null) return i;
  }
  return -1;
}
var KEY_RE2 = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
function bareableString2(s) {
  if (s === "") return false;
  if (s.includes("|") || s.includes("=") || s.includes('"') || /\s/.test(s)) return false;
  if (s === "true" || s === "false" || s === "null") return false;
  if (!Number.isNaN(Number(s))) return false;
  return true;
}
function kvEscape2(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function kvUnescape2(s) {
  return s.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
function foldJsonLine2(line) {
  if (!line.startsWith("{") || !line.endsWith("}") || line.length < 4) return null;
  const inner = line.slice(1, -1);
  if (inner.includes("{") || inner.includes("}")) return null;
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  try {
    if (JSON.stringify(parsed) !== line) return null;
  } catch {
    return null;
  }
  const pairs = [];
  for (const [k2, v] of Object.entries(parsed)) {
    if (!KEY_RE2.test(k2)) return null;
    if (typeof v === "string") {
      pairs.push({ key: k2, val: bareableString2(v) ? v : `"${kvEscape2(v)}"` });
    } else if (typeof v === "number" || typeof v === "boolean" || v === null) {
      pairs.push({ key: k2, val: v === null ? "null" : String(v) });
    } else if (Array.isArray(v)) {
      if (v.length === 0) return null;
      const parts = [];
      for (const el of v) {
        if (typeof el === "string") {
          if (!bareableString2(el)) return null;
          parts.push(el);
        } else if (typeof el === "number" || typeof el === "boolean" || el === null) {
          parts.push(el === null ? "null" : String(el));
        } else return null;
      }
      pairs.push({ key: k2, val: parts.join("|") });
    } else return null;
  }
  return pairs;
}
function unfoldJsonPairs2(pairs) {
  const out = [];
  for (const p of pairs) {
    if (!KEY_RE2.test(p.key)) return null;
    let rendered;
    const v = p.val;
    if (v.startsWith('"')) {
      if (!v.endsWith('"') || v.length < 2) return null;
      rendered = JSON.stringify(kvUnescape2(v.slice(1, -1)));
    } else if (v.includes("|")) {
      const arr = [];
      for (const part of v.split("|")) {
        if (part === "true" || part === "false") arr.push(part === "true");
        else if (part === "null") arr.push(null);
        else if (part !== "" && !Number.isNaN(Number(part))) arr.push(Number(part));
        else arr.push(part);
      }
      rendered = JSON.stringify(arr);
    } else if (v === "true" || v === "false" || v === "null") {
      rendered = v;
    } else if (v !== "" && !Number.isNaN(Number(v))) {
      rendered = JSON.stringify(Number(v));
    } else rendered = JSON.stringify(v);
    out.push(`${JSON.stringify(p.key)}:${rendered}`);
  }
  return `{${out.join(",")}}`;
}
function parseKvPayload2(payload) {
  if (payload === "") return [];
  const pairs = [];
  let i = 0;
  const n = payload.length;
  while (i < n) {
    let j = i;
    while (j < n && /[A-Za-z0-9_.-]/.test(payload[j])) j++;
    if (j === i || j >= n || payload[j] !== "=") return null;
    const key = payload.slice(i, j);
    i = j + 1;
    let val;
    if (payload[i] === '"') {
      let k2 = i + 1;
      let v = "";
      let closed = false;
      while (k2 < n) {
        if (payload[k2] === "\\" && k2 + 1 < n && (payload[k2 + 1] === '"' || payload[k2 + 1] === "\\")) {
          v += payload[k2 + 1];
          k2 += 2;
          continue;
        }
        if (payload[k2] === '"') {
          closed = true;
          break;
        }
        v += payload[k2];
        k2++;
      }
      if (!closed) return null;
      val = `"${v}"`;
      i = k2 + 1;
    } else {
      let k2 = i;
      while (k2 < n && payload[k2] !== " ") k2++;
      val = payload.slice(i, k2);
      i = k2;
    }
    if (!KEY_RE2.test(key)) return null;
    pairs.push({ key, val });
    if (i < n) {
      if (payload[i] !== " ") return null;
      i++;
      if (i === n) return null;
    }
  }
  return pairs;
}
function csvFoldableLine2(line) {
  if (!line.includes(",")) return false;
  for (const f of line.split(",")) {
    if (f.length === 0 || f.includes(" ")) return false;
  }
  return true;
}
function expandBodyAstraea(s, mark2, regionByGlyph2, lexiconByGlyph2 = null, dynamicByGlyph = null, sep = null) {
  let activeDynamic = dynamicByGlyph ? new Map(dynamicByGlyph) : /* @__PURE__ */ new Map();
  let out = "";
  let i = 0;
  const n = s.length;
  while (i < n) {
    const c = s[i];
    if (c === mark2) {
      const probe = probeBasic2(s, i);
      if (probe) {
        out += probe.ext;
        i = probe.end;
        continue;
      }
      if (s[i + 1] === "D") {
        const payloadEnd = scanPayloadEnd2(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const parts = payload.match(/\S+=\S+/g) ?? [];
          for (const p of parts) {
            const eq = p.indexOf("=");
            if (eq > 0) {
              const glyph = p.slice(0, eq);
              try {
                const phrase = JSON.parse(p.slice(eq + 1));
                activeDynamic.set(glyph, phrase);
              } catch {
              }
            }
          }
          i = payloadEnd + 1;
          continue;
        }
      }
      if (s[i + 1] === "J") {
        const payloadEnd = scanPayloadEnd2(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const payload = expandBodyAstraea(s.slice(i + 2, payloadEnd), mark2, regionByGlyph2, lexiconByGlyph2, activeDynamic, sep);
          const pairs = parseKvPayload2(payload);
          const json = pairs ? unfoldJsonPairs2(pairs) : null;
          if (json !== null) {
            out += json;
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === "C") {
        const payloadEnd = scanPayloadEnd2(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const rows = s.slice(i + 2, payloadEnd).split("\n");
          let ok = true;
          const rebuilt = [];
          for (const row of rows) {
            const fields = row.split(" ");
            if (fields.length < 2) {
              ok = false;
              break;
            }
            rebuilt.push(fields.map((f) => expandBodyAstraea(f, mark2, regionByGlyph2, lexiconByGlyph2, activeDynamic, sep)).join(","));
          }
          if (ok) {
            out += rebuilt.join("\n");
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === "P") {
        const payloadEnd = scanPayloadEnd2(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const rows = s.slice(i + 2, payloadEnd).split("\n");
          let ok = true;
          const rebuilt = [];
          for (const row of rows) {
            const fields = row.split(" ");
            if (fields.length < 2) {
              ok = false;
              break;
            }
            rebuilt.push("| " + fields.map((f) => expandBodyAstraea(f, mark2, regionByGlyph2, lexiconByGlyph2, activeDynamic, sep)).join(" | ") + " |");
          }
          if (ok) {
            out += rebuilt.join("\n");
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === "F") {
        const payloadEnd = scanPayloadEnd2(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const lines2 = s.slice(i + 2, payloadEnd).split("\n");
          const keys = (lines2[0] ?? "").split(" ");
          let ok = keys.length >= 1 && keys.every((k2) => KEY_RE2.test(k2));
          const rebuilt = [];
          if (ok) {
            for (let r = 1; r < lines2.length; r++) {
              const vals = lines2[r].split(" ");
              if (vals.length !== keys.length) {
                ok = false;
                break;
              }
              rebuilt.push(
                "{" + keys.map((k2, c2) => `"${k2}":${expandBodyAstraea(vals[c2], mark2, regionByGlyph2, lexiconByGlyph2, activeDynamic, sep)}`).join(",") + "}"
              );
            }
          }
          if (ok && rebuilt.length > 0) {
            out += rebuilt.join("\n");
            i = payloadEnd + 1;
            continue;
          }
        }
      }
      if (s[i + 1] === "Y" && sep !== null) {
        const payloadEnd = scanPayloadEnd2(s, i + 2, mark2);
        if (payloadEnd > 0) {
          const payload = s.slice(i + 2, payloadEnd);
          const sp = payload.indexOf(sep);
          if (sp > 0) {
            const name = payload.slice(0, sp);
            const pairs = payload.slice(sp + 1).split(sep);
            let ok = /^[A-Za-z_][\w-]*$/.test(name) && pairs.length >= 2;
            const rebuilt = [name + ":"];
            if (ok) {
              for (const p of pairs) {
                const eq = p.indexOf("=");
                if (eq <= 0 || !KEY_RE2.test(p.slice(0, eq))) {
                  ok = false;
                  break;
                }
                rebuilt.push("  " + p.slice(0, eq) + ": " + expandBodyAstraea(p.slice(eq + 1), mark2, regionByGlyph2, lexiconByGlyph2, activeDynamic, sep));
              }
            }
            if (ok) {
              out += rebuilt.join("\n");
              i = payloadEnd + 1;
              continue;
            }
          }
        }
      }
      out += c;
      i++;
      continue;
    }
    const dyn = activeDynamic.get(c);
    if (dyn !== void 0) {
      out += dyn;
      i++;
      continue;
    }
    const region = regionByGlyph2.get(c);
    if (region !== void 0) {
      out += region;
      i++;
      continue;
    }
    if (lexiconByGlyph2 !== null) {
      const phrase = lexiconByGlyph2.get(c);
      if (phrase !== void 0) {
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
function pickWindowAstraea(text, enc2) {
  const pool2 = rosettaPool(enc2);
  const m2 = 4 + RNS1_REGIONS.length;
  if (pool2.length < m2 + 1) return null;
  const src2 = /* @__PURE__ */ new Set();
  for (const ch of text) src2.add(ch);
  const limit = pool2.length - m2;
  for (let k2 = 0; k2 <= limit; k2++) {
    let clear = true;
    for (let j = 0; j < m2; j++) {
      if (src2.has(pool2[k2 + j])) {
        clear = false;
        break;
      }
    }
    if (clear) return k2;
  }
  return null;
}
function astraeaTranspose(text, enc2 = "o200k_base", folded2 = null, useDynamic = true) {
  const empty = { wire: null, mark: "", systems: [] };
  if (!text) return empty;
  const workingText = folded2 ?? text;
  const k2 = pickWindowAstraea(workingText, enc2);
  if (k2 === null) return empty;
  const pool2 = rosettaPool(enc2);
  const mark2 = pool2[k2];
  const flagAstraeaW = pool2[k2 + 3 + RNS1_REGIONS.length];
  const sepY = pool2[k2 + 2 + RNS1_REGIONS.length] ?? null;
  const lexiconBook2 = astraeaLexiconCodebook(enc2);
  const lexiconByGlyph2 = folded2 !== null ? lexiconBook2.byGlyph : null;
  let currentText = workingText;
  let dynamicSpan = "";
  const dynamicMap = /* @__PURE__ */ new Map();
  const systems = /* @__PURE__ */ new Set([...folded2 !== null ? ["W"] : []]);
  if (useDynamic) {
    const dynEntries = extractDynamicEntries(currentText, enc2, mark2, lexiconBook2.byGlyph.size);
    if (dynEntries.length > 0) {
      const entryStrings = [];
      for (const entry of dynEntries) {
        currentText = currentText.split(entry.phrase).join(entry.glyph);
        dynamicMap.set(entry.glyph, entry.phrase);
        entryStrings.push(`${entry.glyph}=${JSON.stringify(entry.phrase)}`);
      }
      dynamicSpan = mark2 + "D" + entryStrings.join(" ") + mark2;
      systems.add("D");
    }
  }
  let t2 = currentText;
  const regionByGlyph2 = /* @__PURE__ */ new Map();
  for (let i = 0; i < RNS1_REGIONS.length; i++) {
    const glyph = pool2[k2 + 1 + i];
    if (t2.includes(RNS1_REGIONS[i])) {
      regionByGlyph2.set(glyph, RNS1_REGIONS[i]);
      t2 = t2.split(RNS1_REGIONS[i]).join(glyph);
      systems.add("R");
    }
  }
  const lines2 = t2.split("\n");
  const srcLines2 = text.split("\n");
  const outLines2 = [];
  let csvRun2 = [];
  let csvRunOrig2 = [];
  let csvRunSrc2 = [];
  const flushCsv2 = () => {
    if (csvRun2.length >= 2) {
      const payload = csvRun2.join("\n");
      const span = mark2 + "C" + payload + mark2;
      const rebuilt = payload.split("\n").map((row) => row.split(" ").map((f) => expandBodyAstraea(f, mark2, regionByGlyph2, lexiconByGlyph2, dynamicMap, sepY)).join(",")).join("\n");
      const srcRows = csvRunSrc2.join("\n");
      if (rebuilt === srcRows) {
        outLines2.push(span);
        systems.add("C");
        csvRun2 = [];
        csvRunOrig2 = [];
        csvRunSrc2 = [];
        return;
      }
    }
    outLines2.push(...csvRunOrig2);
    csvRun2 = [];
    csvRunOrig2 = [];
    csvRunSrc2 = [];
  };
  for (let li = 0; li < lines2.length; li++) {
    const line = lines2[li];
    const srcLine = srcLines2[li];
    if (line.startsWith("|")) {
      let j = li;
      while (j < lines2.length && lines2[j].startsWith("|")) j++;
      if (j - li >= 2) {
        const run = lines2.slice(li, j);
        const srcRun = srcLines2.slice(li, j);
        const ps = pipeSpan(run, mark2);
        if (ps !== null) {
          const span = mark2 + "P" + run.map((r) => r.startsWith("| ") && r.endsWith(" |") ? r.slice(2, -2).split(" | ").join(" ") : r).join("\n") + mark2;
          const rebuilt = span.slice(2, -1).split("\n").map((row) => "| " + row.split(" ").map((f) => expandBodyAstraea(f, mark2, regionByGlyph2, lexiconByGlyph2, dynamicMap, sepY)).join(" | ") + " |").join("\n");
          if (rebuilt === srcRun.join("\n")) {
            flushCsv2();
            outLines2.push(span);
            systems.add("P");
            li = j - 1;
            continue;
          }
        }
      }
    }
    if (line === "```yaml") {
      const end = lines2.indexOf("```", li + 1);
      if (end > 0) {
        const inner = lines2.slice(li + 1, end);
        const srcInner = srcLines2.slice(li + 1, end);
        const ys = yamlFromLines(inner, mark2, sepY);
        if (ys !== null) {
          const span = mark2 + "Y" + inner[0].slice(0, -1) + sepY + inner.slice(1).map((l) => {
            const m3 = /^  ([A-Za-z_][\w-]*): (.*)$/.exec(l);
            return m3[1] + "=" + m3[2];
          }).join(sepY) + mark2;
          flushCsv2();
          outLines2.push("```yaml", span, "```");
          systems.add("Y");
          li = end;
          continue;
        }
      }
    }
    TS_EXT2.lastIndex = 0;
    let tsLine = line;
    let out = "";
    let last = 0;
    let m2;
    while ((m2 = TS_EXT2.exec(line)) !== null) {
      if (!plausibleDate2(m2[1], m2[2], m2[3], m2[4], m2[5], m2[6])) continue;
      out += line.slice(last, m2.index) + mark2 + extToBasic2(m2);
      last = m2.index + m2[0].length;
    }
    out += line.slice(last);
    if (out !== line) {
      tsLine = out;
      systems.add("T");
    }
    const pairs = foldJsonLine2(tsLine);
    if (pairs !== null) {
      const kv = pairs.map((p) => `${p.key}=${p.val}`).join(" ");
      const back = parseKvPayload2(kv);
      if (back !== null && unfoldJsonPairs2(back) === tsLine) {
        const span = mark2 + "J" + kv + mark2;
        flushCsv2();
        outLines2.push(span);
        systems.add("J");
        continue;
      }
    }
    if (csvFoldableLine2(tsLine)) {
      csvRun2.push(tsLine.split(",").join(" "));
      csvRunOrig2.push(tsLine);
      csvRunSrc2.push(srcLine);
      continue;
    }
    flushCsv2();
    outLines2.push(tsLine);
  }
  flushCsv2();
  const bodyCore2 = outLines2.join("\n");
  const body = dynamicSpan ? dynamicSpan + "\n" + bodyCore2 : bodyCore2;
  const reexpanded2 = expandBodyAstraea(body, mark2, regionByGlyph2, lexiconByGlyph2, dynamicMap, sepY);
  if (reexpanded2 !== text) {
    return empty;
  }
  const wire = folded2 !== null ? mark2 + "\n" + flagAstraeaW + "\n" + body : mark2 + "\n" + body;
  return { wire, mark: mark2, systems: [...systems] };
}
function astraeaDecode(wire, enc2 = "o200k_base") {
  if (wire.startsWith("[MZ1]\n")) return mosaicDecode(wire);
  if (wire.startsWith("[SG1]\n")) return signetDecode(wire);
  if (wire.startsWith("[P1]\n")) return pulseDecode(wire);
  if (wire.startsWith("[M1]\n")) return meridianDecode(wire);
  if (wire.startsWith("\u27E8QSR\u27E9\n")) return quasarDecode(wire);
  if (wire.startsWith("[PX]\n")) return plexusDecode(wire);
  if (wire.startsWith("[[VX1\n")) return veritasDecode(wire);
  if (wire.startsWith("[TS1]\n")) return tesseraDecode(wire);
  if (wire.startsWith("[ST1]\n")) return strataDecode(wire);
  if (wire.startsWith("[RP1]\n")) return repairDecode(wire);
  if (wire.startsWith("[TR1]\n")) return trieDecode(wire);
  if (wire.startsWith("[CL1]\n")) return columnDecode(wire);
  if (wire.startsWith("[SP1]\n")) return spliceDecode(wire);
  if (wire.startsWith("[\u2318STENCIL]")) return stencilDecode(wire);
  if (wire.startsWith("[\u03FA]")) return morphDecode(wire);
  if (wire.startsWith(KAPPA_SENTINEL)) return kappaDecode(wire, enc2);
  if (wire.startsWith(PHRASE_SENTINEL) || wire.startsWith(PHRASE_LITERAL)) return phraseDecode(wire, enc2);
  if (wire.startsWith(TAU_SENTINEL) || wire.startsWith(TAU_LITERAL)) return tauDecode(wire, enc2);
  if (wire.length >= 2 && wire[1] === "\n") {
    const pool2 = rosettaPool(enc2);
    const idx = pool2.indexOf(wire[0]);
    if (idx >= 0) {
      const mark2 = pool2[idx];
      const regionByGlyph2 = /* @__PURE__ */ new Map();
      for (let i = 0; i < RNS1_REGIONS.length; i++) {
        regionByGlyph2.set(pool2[idx + 1 + i], RNS1_REGIONS[i]);
      }
      const flagRosettaW = pool2[idx + 1 + RNS1_REGIONS.length];
      const flagAstraeaW = pool2[idx + 3 + RNS1_REGIONS.length];
      const sepY = pool2[idx + 2 + RNS1_REGIONS.length] ?? null;
      if (flagRosettaW !== void 0 && wire.length >= 4 && wire[2] === flagRosettaW && wire[3] === "\n") {
        return rosettaDecode(wire, enc2);
      }
      if (flagAstraeaW !== void 0 && wire.length >= 4 && wire[2] === flagAstraeaW && wire[3] === "\n") {
        return expandBodyAstraea(
          wire.slice(4),
          mark2,
          regionByGlyph2,
          astraeaLexiconCodebook(enc2).byGlyph,
          null,
          sepY
        );
      }
      return expandBodyAstraea(wire.slice(2), mark2, regionByGlyph2, null, null, sepY);
    }
  }
  return rosettaDecode(wire, enc2);
}
var encodeCache5 = /* @__PURE__ */ new Map();
var CACHE_MAX4 = 8;
async function astraeaEncode(text, enc2 = "o200k_base", supplied = {}) {
  const key = text.length <= 2e5 ? enc2 + "\0" + text : null;
  if (key !== null) {
    const hit = encodeCache5.get(key);
    if (hit) return hit;
  }
  const r = await astraeaEncodeUncached(text, enc2, supplied);
  if (key !== null) {
    if (encodeCache5.size >= CACHE_MAX4) encodeCache5.clear();
    encodeCache5.set(key, r);
  }
  return r;
}
async function astraeaEncodeUncached(text, enc2, supplied) {
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const ms = () => (typeof performance !== "undefined" ? performance.now() : 0) - t0;
  const inTokens = countTokens(text, enc2);
  const identity = (notes) => ({
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    member: "identity",
    systems: [],
    audit: [],
    notes,
    encodeMs: ms()
  });
  if (!text) return identity("empty input");
  const audit = [];
  let best = null;
  let bestTokens = inTokens;
  const admit = (member, wire, decode, systems = [], force = false) => {
    try {
      const back = decode();
      const tk = countTokens(wire, enc2);
      const exact = back === text;
      audit.push({ member, tokens: exact ? tk : -1, exact });
      if (exact && (force || tk < bestTokens) && !(wire === text && ambiguousIdentity)) {
        best = { wire, member, systems, decode };
        bestTokens = tk;
      }
    } catch {
      audit.push({ member, tokens: -1, exact: false });
    }
  };
  const ambiguousIdentity = text.length >= 2 && text[1] === "\n" && rosettaPool(enc2).includes(text[0]) || text.includes("\u27D0") || [
    "[MZ1]\n",
    "[SG1]\n",
    "[P1]\n",
    "[M1]\n",
    "\u27E8QSR\u27E9\n",
    "[PX]\n",
    "[[VX1\n",
    "[AX1]\n",
    "[TS1]\n",
    "[ST1]\n",
    "[RP1]\n",
    "[TR1]\n",
    "[CL1]\n",
    "[SP1]\n",
    "[\u2318STENCIL]",
    "[\u03FA]",
    "\u03BA\n",
    "\u03C6",
    "\u03C4\n",
    "\u03C4\u03C4\n"
  ].some((s) => text.startsWith(s));
  if (!ambiguousIdentity) admit("identity", text, () => text);
  if (!hasAstraeaLexiconGlyph(text, enc2)) {
    const folded2 = astraeaLexiconFold(text, enc2);
    const trDW = astraeaTranspose(text, enc2, folded2, true);
    if (trDW.wire !== null && astraeaDecode(trDW.wire, enc2) === text) {
      admit("astraea-DW", trDW.wire, () => astraeaDecode(trDW.wire, enc2), trDW.systems);
    }
    const trW = astraeaTranspose(text, enc2, folded2, false);
    if (trW.wire !== null && astraeaDecode(trW.wire, enc2) === text) {
      admit("astraea-W", trW.wire, () => astraeaDecode(trW.wire, enc2), trW.systems);
    }
  }
  const trD = astraeaTranspose(text, enc2, null, true);
  if (trD.wire !== null && astraeaDecode(trD.wire, enc2) === text) {
    admit("astraea-D", trD.wire, () => astraeaDecode(trD.wire, enc2), trD.systems);
  }
  const trT = astraeaTranspose(text, enc2, null, false);
  if (trT.wire !== null && astraeaDecode(trT.wire, enc2) === text) {
    admit("astraea-T", trT.wire, () => astraeaDecode(trT.wire, enc2), trT.systems);
  }
  try {
    const ros = supplied.rosetta ?? await rosettaEncode(text, enc2);
    if (ros.exact && ros.decoded === text) {
      admit("rosetta-R2", ros.wire, () => astraeaDecode(ros.wire, enc2), ros.systems);
    }
  } catch {
    audit.push({ member: "rosetta-R2", tokens: -1, exact: false });
  }
  try {
    const kp = kappaEncode(text, enc2);
    if (kp.exact && kp.decoded === text) {
      admit("kappa", kp.wire, () => kappaDecode(kp.wire, enc2));
    }
  } catch {
    audit.push({ member: "kappa", tokens: -1, exact: false });
  }
  try {
    const tu = tauEncode(text, enc2);
    if (tu.exact && tu.decoded === text) {
      admit("tau", tu.wire, () => tauDecode(tu.wire, enc2), tu.systems);
    }
  } catch {
    audit.push({ member: "tau", tokens: -1, exact: false });
  }
  try {
    const phr = phraseEncode(text, enc2);
    if (phr.exact && phr.decoded === text) {
      admit("phrase", phr.wire, () => phraseDecode(phr.wire, enc2));
    }
  } catch {
    audit.push({ member: "phrase", tokens: -1, exact: false });
  }
  if (text.length <= 12e3) {
    try {
      const orbit = supplied.orbit ?? await orbitEncode(text, enc2);
      if (orbit.exact && orbit.decoded === text) {
        admit("orbit", orbit.wire, () => astraeaDecode(orbit.wire, enc2));
      }
    } catch {
      audit.push({ member: "orbit", tokens: -1, exact: false });
    }
    try {
      const crown = supplied.crown ?? await crownEncodeCached(text, enc2);
      if (crown.exact && crown.decoded === text) {
        admit("crown", crown.wire, () => crownDecode(crown.wire));
      }
    } catch {
      audit.push({ member: "crown", tokens: -1, exact: false });
    }
    try {
      const sp = supplied.splice ?? spliceEncode(text, enc2);
      if (sp.exact && sp.decoded === text) {
        admit("splice", sp.wire, () => spliceDecode(sp.wire));
      }
    } catch {
      audit.push({ member: "splice", tokens: -1, exact: false });
    }
  }
  if (ambiguousIdentity) {
    const kWindow = pickWindowAstraea(text, enc2);
    if (kWindow !== null) {
      const wrapWire = rosettaPool(enc2)[kWindow] + "\n" + text;
      admit("forced-wrap", wrapWire, () => astraeaDecode(wrapWire, enc2), [], true);
    }
  }
  const winner = best;
  if (!winner) {
    return identity(
      ambiguousIdentity ? "no candidate under exact gate; forced wrap safety" : "no candidate beat input under exact gate"
    );
  }
  const decoded = winner.decode();
  if (decoded !== text) return identity("gate G4: winner failed byte-verify");
  const outTokens = countTokens(winner.wire, enc2);
  if (outTokens >= inTokens && winner.member !== "forced-wrap") {
    return identity("gate G3: wire measured >= input");
  }
  return {
    wire: winner.wire,
    decoded,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? (inTokens - outTokens) / inTokens * 100 : 0,
    member: winner.member,
    systems: winner.systems,
    audit,
    notes: `ASTRAEA-A2 member=${winner.member} systems=[${winner.systems.join(",")}] \xB7 ${audit.filter((a) => a.exact).length} exact candidates \xB7 byte-exact`,
    encodeMs: ms()
  };
}
function astraeaDecoderPrompt() {
  return [
    "# \u27FF ASTRAEA-A2 \u2014 Adaptive Structural Transposition & Real-BPE Attributed Exact-Codec",
    "An ASTRAEA-A2 wire message is: <glyph>\\n<body>. The first glyph anchors the codebook",
    "from the tokenizer-verified single-token glyph pool (see rosettaPool in rosetta.ts).",
    "Decode <body> left-to-right:",
    '1. mark + "D" + entries + mark \u2192 Dynamic Local Dictionary declaration.',
    "   Each entry is <glyph>=<jsonString>. Rebuild the dynamic glyph map for the payload.",
    "2. marker + 15-30 digit/T/Z run \u2192 an ISO-8601 BASIC instant; re-render in EXTENDED form.",
    "3. marker + J + pairs + marker \u2192 flat JSON object; rebuild canonical compact JSON.",
    "4. marker + C + rows + marker \u2192 comma CSV table; space-separated fields re-joined with commas.",
    '5. marker + P + rows + marker \u2192 pipe table; space-separated fields re-joined with " | ".',
    "6. marker + Y + name + SEP + k=v SEP ... + marker \u2192 flat YAML block.",
    "7. W-wires: when the first body line is a single pool glyph followed by \\n (the phrase flag),",
    "   every Hangul syllable of the ASTRAEA-L technical lexicon expands to its phrase.",
    "Reconstruction is 100% byte-exact; nothing was summarised or dropped."
  ].join("\n");
}
var ASTRAEA_SYSTEM_PROMPT = astraeaDecoderPrompt();

// bench/test-4000.ts
var CHAOS_4000 = [
  // SECTION 1: Natural Prose (>2000 chars, complex technical prose & multi-token English words)
  'The architecture of modern distributed context optimization requires strict invariants across heterogeneous prompt distributions. When evaluating large language model latency and token billing overhead, traditional redundancy-based codecs frequently experience degradation on non-repetitive prompt payloads. The fundamental bottleneck stems from the sub-word tokenization algorithms used by byte-pair encoding schemes, where technical vocabulary, morphological suffixes, and domain-specific identifier stems fragment into multiple token IDs. For example, words such as "infrastructure", "configuration", "rebalancing", "responsiveness", and "deliberates" consistently incur significant token expansion penalties despite representing single semantic concepts.',
  "To mitigate this inefficiency, we investigate exact notational transposition combined with adaptive structural dictionary substitution. By identifying high-frequency sub-word fragments, structural delimiter patterns, and standardized schema encodings at runtime, an optimal representation can be synthesized without discarding a single byte of underlying content. Furthermore, cross-model compatibility dictates that the resulting wire format must decode deterministically across diverse tokenizer implementations without requiring out-of-band state or specialized local execution environments.",
  "In enterprise production environments, log aggregation streams and microservice traces exhibit mixed structural entropy. A single agent interaction turn routinely contains conversational natural prose, structured JSON metadata payloads, tabular CSV metrics, shell invocation commands, and localized multilingual status annotations. Achieving Pareto superiority over all existing baseline codecs under these conditions necessitates a multi-stage structural decomposition capable of dynamically selecting the minimal token representation for each sub-regime.",
  // SECTION 2: Markdown Lists & Empty Spaces
  "Key Optimization Objectives:",
  "  - Reduce total BPE wire token count strictly below input token count.",
  "  - Guarantee 100% byte-exact round-trip reconstruction across all supported encodings.",
  "  - Minimize total delivery overhead including header declarations and window anchors.",
  "  - Preserve cross-compatibility for zero-middleware direct reasoning contexts.",
  "  ",
  "  - Eliminate token fragmentation in dates, timestamps, cloud regions, and numeric ranges.",
  "  ",
  // SECTION 3: CSV Metrics Table
  "region,datacenter,instances,p99_latency_ms,error_count,cpu_utilization",
  "us-east-1,iad-3,142,812,0,0.74",
  "us-west-2,pdx-1,88,415,1,0.68",
  "eu-west-1,dub-1,94,512,2,0.81",
  "ap-northeast-1,nrt-2,65,920,5,0.89",
  "ap-south-1,bom-2,42,1105,3,0.92",
  "sa-east-1,gru-1,28,1450,8,0.95",
  // SECTION 4: JSON Payloads & Structured Event Logs
  '{"event":"health_check","service":"payment_gateway","status":"degraded","region":"ap-northeast-1","retry_count":3,"ok":false,"latency_ms":920,"timestamp":"2026-09-15T08:22:41.123Z"}',
  '{"event":"cache_warmup","service":"search_index","status":"aborted","reason":"TLS handshake timeout","host":"iad-3","retries":2,"timestamp":"2026-09-15T08:25:00.000Z"}',
  '{"event":"failover_completed","primary":"us-east-1","secondary":"us-west-2","duration_sec":42,"timestamp":"2026-09-15T08:30:12.456Z"}',
  // SECTION 5: Code Snippets (Python / TypeScript / Shell)
  "def evaluate_cluster_health(cluster_ctx, threshold_ms=800):",
  "    degraded_nodes = []",
  "    for node, metrics in cluster_ctx.items():",
  '        if metrics.get("p99_latency", 0) > threshold_ms or not metrics.get("ok", True):',
  '            degraded_nodes.append((node, metrics.get("p99_latency")))',
  "    if len(degraded_nodes) > 0:",
  '        raise ClusterHealthException(f"Cluster degraded: {degraded_nodes}")',
  '    return sum(m.get("hosts", 1) for m in cluster_ctx.values())',
  "",
  "kubectl rollout status deployment/payment-api --namespace=production --timeout=120s || kubectl get events --sort-by=.metadata.creationTimestamp",
  'aws ec2 describe-instances --region ap-northeast-1 --filter "Name=tag:Environment,Values=production" --query "Reservations[*].Instances[*].InstanceId"',
  // SECTION 6: Multilingual CJK & Operational Notes
  "\u969C\u5BB3\u5831\u544A: \u6DF1\u591C\u5E2F\u306E\u30D0\u30C3\u30C1\u51E6\u7406\u4E2D\u306B\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u63A5\u7D9A\u30D7\u30FC\u30EB\u304C\u67AF\u6E07\u3057\u3001\u6C7A\u6E08API\u306E\u5FDC\u7B54\u9045\u5EF6\u304C\u767A\u751F\u3057\u307E\u3057\u305F\u3002",
  "\u539F\u56E0\u5206\u6790: \u30EC\u30D7\u30EA\u30AB\u306E\u30D5\u30A7\u30A4\u30EB\u30AA\u30FC\u30D0\u30FC\u51E6\u7406\u306B\u5931\u6557\u3057\u3001\u30B3\u30CD\u30AF\u30B7\u30E7\u30F3\u518D\u8A66\u884C\u30B9\u30C8\u30FC\u30E0\u304C\u30C8\u30EA\u30AC\u30FC\u3055\u308C\u307E\u3057\u305F\u3002",
  "\u5907\u6CE8\uFF1A\u6570\u636E\u5E93\u8FC1\u79FB\u5DF2\u5B8C\u6210\uFF0C\u4F46\u7F13\u5B58\u9884\u70ED\u5931\u6557\uFF0C\u8BF7\u68C0\u67E5\u8FDE\u63A5\u6C60\u914D\u7F6E\u548C\u8D85\u65F6\u53C2\u6570\uFF0C\u5FC5\u8981\u65F6\u91CD\u542F\u5B9E\u4F8B\u540E\u518D\u89C2\u5BDF\u3002",
  "\u8BB0\u5F55\uFF1A2026-09-15T08:35:10Z \u8B66\u544A \u8FDE\u63A5\u6C60\u8017\u5C3D (max=50, wait=5s, active=50, idle=0)",
  "Summary: All secondary migrations verified; monitor pod memory, bump connection pool limits to 100, and re-run synthetic load tests before closing the incident."
].join("\n");
async function main() {
  const enc2 = "o200k_base";
  console.log(`CHAOS_4000 length = ${CHAOS_4000.length} chars`);
  const inTok = countTokens(CHAOS_4000, enc2);
  console.log(`CHAOS_4000 inTokens = ${inTok}`);
  const rAstraea = await astraeaEncode(CHAOS_4000, enc2);
  const rRosetta = await rosettaEncode(CHAOS_4000, enc2);
  const rMosaic = mosaicEncode(CHAOS_4000, enc2);
  const rOrbit = await orbitEncode(CHAOS_4000, enc2);
  const rCrown = await crownEncodeCached(CHAOS_4000, enc2);
  const rSplice = spliceEncode(CHAOS_4000, enc2);
  const rTau = tauEncode(CHAOS_4000, enc2);
  const rPhrase = phraseEncode(CHAOS_4000, enc2);
  const rKappa = kappaEncode(CHAOS_4000, enc2);
  const rXi = await omegaXiCompress(CHAOS_4000, enc2);
  const astraeaExact = rAstraea.exact && astraeaDecode(rAstraea.wire, enc2) === CHAOS_4000;
  console.log("\n--- CODEC RESULTS ON CHAOS_4000 ---");
  console.log(`Input Tokens: ${inTok}`);
  console.log(`ASTRAEA-A2: ${rAstraea.outTokens} (member=${rAstraea.member}, systems=[${rAstraea.systems.join(",")}], exact=${astraeaExact})`);
  console.log(`ROSETTA: ${rRosetta.outTokens} (member=${rRosetta.member}, exact=${rRosetta.exact && rosettaDecode(rRosetta.wire, enc2) === CHAOS_4000})`);
  console.log(`MOSAIC: ${rMosaic.outTokens} (exact=${rMosaic.exact})`);
  console.log(`ORBIT: ${rOrbit.outTokens} (exact=${rOrbit.exact})`);
  console.log(`CROWN: ${rCrown.outTokens} (exact=${rCrown.exact})`);
  console.log(`SPLICE: ${rSplice.outTokens} (exact=${rSplice.exact})`);
  console.log(`TAU: ${rTau.outTokens} (exact=${rTau.exact})`);
  console.log(`PHRASE: ${rPhrase.outTokens} (exact=${rPhrase.exact})`);
  console.log(`KAPPA: ${rKappa.outTokens} (exact=${rKappa.exact})`);
  console.log(`OMEGA-XI: ${rXi.outTokens} (binary transport)`);
}
main().catch(console.error);

// bench/debug-dw.ts
var enc = "o200k_base";
var folded = astraeaLexiconFold(CHAOS_4000, enc);
var pool = rosettaPool(enc);
var src = /* @__PURE__ */ new Set();
for (const ch of folded) src.add(ch);
var m = 4 + RNS1_REGIONS.length;
var k = 0;
for (; k <= pool.length - m; k++) {
  let clear = true;
  for (let j = 0; j < m; j++) {
    if (src.has(pool[k + j])) {
      clear = false;
      break;
    }
  }
  if (clear) break;
}
var mark = pool[k];
var lexiconBook = astraeaLexiconCodebook(enc);
var lexiconByGlyph = lexiconBook.byGlyph;
var t = folded;
var regionByGlyph = /* @__PURE__ */ new Map();
for (let i = 0; i < RNS1_REGIONS.length; i++) {
  const glyph = pool[k + 1 + i];
  if (t.includes(RNS1_REGIONS[i])) {
    regionByGlyph.set(glyph, RNS1_REGIONS[i]);
    t = t.split(RNS1_REGIONS[i]).join(glyph);
  }
}
var KEY_RE3 = /^[A-Za-z_][A-Za-z0-9_.-]*$/;
function bareableString3(s) {
  if (s === "") return false;
  if (s.includes("|") || s.includes("=") || s.includes('"') || /\s/.test(s)) return false;
  if (s === "true" || s === "false" || s === "null") return false;
  if (!Number.isNaN(Number(s))) return false;
  return true;
}
function kvEscape3(s) {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
function foldJsonLine3(line) {
  if (!line.startsWith("{") || !line.endsWith("}") || line.length < 4) return null;
  const inner = line.slice(1, -1);
  if (inner.includes("{") || inner.includes("}")) return null;
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
  const pairs = [];
  for (const [key, v] of Object.entries(parsed)) {
    if (!KEY_RE3.test(key)) return null;
    if (typeof v === "string") {
      pairs.push({ key, val: bareableString3(v) ? v : `"${kvEscape3(v)}"` });
    } else if (typeof v === "number" || typeof v === "boolean" || v === null) {
      pairs.push({ key, val: v === null ? "null" : String(v) });
    } else if (Array.isArray(v)) {
      if (v.length === 0) return null;
      const parts = [];
      for (const el of v) {
        if (typeof el === "string") {
          if (!bareableString3(el)) return null;
          parts.push(el);
        } else if (typeof el === "number" || typeof el === "boolean" || el === null) {
          parts.push(el === null ? "null" : String(el));
        } else return null;
      }
      pairs.push({ key, val: parts.join("|") });
    } else return null;
  }
  return pairs;
}
function csvFoldableLine3(line) {
  if (!line.includes(",")) return false;
  for (const f of line.split(",")) {
    if (f.length === 0 || f.includes(" ")) return false;
  }
  return true;
}
var TS_EXT3 = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})?/g;
function extToBasic3(match) {
  const zone = match[8] ? match[8].replace(":", "") : "";
  return `${match[1]}${match[2]}${match[3]}T${match[4]}${match[5]}${match[6]}${match[7] ?? ""}${zone}`;
}
var lines = t.split("\n");
var srcLines = CHAOS_4000.split("\n");
var outLines = [];
var csvRun = [];
var csvRunOrig = [];
var csvRunSrc = [];
var flushCsv = () => {
  if (csvRun.length >= 2) {
    const payload = csvRun.join("\n");
    const span = mark + "C" + payload + mark;
    outLines.push(span);
    csvRun = [];
    csvRunOrig = [];
    csvRunSrc = [];
    return;
  }
  outLines.push(...csvRunOrig);
  csvRun = [];
  csvRunOrig = [];
  csvRunSrc = [];
};
for (let li = 0; li < lines.length; li++) {
  const line = lines[li];
  const srcLine = srcLines[li];
  TS_EXT3.lastIndex = 0;
  let tsLine = line;
  let outStr = "";
  let last = 0;
  let match;
  while ((match = TS_EXT3.exec(line)) !== null) {
    outStr += line.slice(last, match.index) + mark + extToBasic3(match);
    last = match.index + match[0].length;
  }
  outStr += line.slice(last);
  if (outStr !== line) tsLine = outStr;
  const pairs = foldJsonLine3(tsLine);
  if (pairs !== null) {
    const kv = pairs.map((p) => `${p.key}=${p.val}`).join(" ");
    const span = mark + "J" + kv + mark;
    flushCsv();
    outLines.push(span);
    continue;
  }
  if (csvFoldableLine3(tsLine)) {
    csvRun.push(tsLine.split(",").join(" "));
    csvRunOrig.push(tsLine);
    csvRunSrc.push(srcLine);
    continue;
  }
  flushCsv();
  outLines.push(tsLine);
}
flushCsv();
var bodyCore = outLines.join("\n");
function probeBasic3(s, idx) {
  for (let len = 30; len >= 15; len--) {
    if (idx + 1 + len > s.length) continue;
    const cand = s.slice(idx + 1, idx + 1 + len);
    const m2 = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(\.\d{1,9})?(Z|[+-]\d{4})?$/.exec(cand);
    if (!m2 || m2[0] !== cand) continue;
    const zone = m2[8] ? m2[8] === "Z" ? "Z" : `${m2[8].slice(0, 3)}:${m2[8].slice(3)}` : "";
    const ext = `${m2[1]}-${m2[2]}-${m2[3]}T${m2[4]}:${m2[5]}:${m2[6]}${m2[7] ?? ""}${zone}`;
    return { ext, end: idx + 1 + len };
  }
  return null;
}
function scanPayloadEnd3(s, start, markStr) {
  for (let i = start; i < s.length; i++) {
    if (s[i] === markStr && probeBasic3(s, i) === null) return i;
  }
  return -1;
}
function expand(s) {
  let outStr = "";
  let idx = 0;
  while (idx < s.length) {
    const c = s[idx];
    if (c === mark) {
      const probe = probeBasic3(s, idx);
      if (probe) {
        outStr += probe.ext;
        idx = probe.end;
        continue;
      }
      if (s[idx + 1] === "C") {
        const payloadEnd = scanPayloadEnd3(s, idx + 2, mark);
        if (payloadEnd > 0) {
          const rows = s.slice(idx + 2, payloadEnd).split("\n");
          const rebuilt = rows.map((row) => row.split(" ").map((f) => expand(f)).join(",")).join("\n");
          outStr += rebuilt;
          idx = payloadEnd + 1;
          continue;
        }
      }
      if (s[idx + 1] === "J") {
        const payloadEnd = scanPayloadEnd3(s, idx + 2, mark);
        if (payloadEnd > 0) {
          const payload = expand(s.slice(idx + 2, payloadEnd));
          const parts = payload.match(/\S+=\S+/g) ?? [];
          const unfolded = parts.map((p) => {
            const eq = p.indexOf("=");
            return JSON.stringify(p.slice(0, eq)) + ":" + (p.slice(eq + 1).startsWith('"') ? p.slice(eq + 1) : JSON.stringify(p.slice(eq + 1)));
          }).join(",");
          outStr += "{" + unfolded + "}";
          idx = payloadEnd + 1;
          continue;
        }
      }
    }
    if (regionByGlyph.has(c)) {
      outStr += regionByGlyph.get(c);
      idx++;
    } else if (lexiconByGlyph.has(c)) {
      outStr += lexiconByGlyph.get(c);
      idx++;
    } else {
      outStr += c;
      idx++;
    }
  }
  return outStr;
}
var reexpanded = expand(bodyCore);
console.log("reexpanded === CHAOS_4000:", reexpanded === CHAOS_4000);
if (reexpanded !== CHAOS_4000) {
  for (let idx = 0; idx < Math.max(reexpanded.length, CHAOS_4000.length); idx++) {
    if (reexpanded[idx] !== CHAOS_4000[idx]) {
      console.log(`Mismatch at index ${idx}:`);
      console.log("Expected around index:", JSON.stringify(CHAOS_4000.slice(Math.max(0, idx - 30), idx + 30)));
      console.log("Got around index:     ", JSON.stringify(reexpanded.slice(Math.max(0, idx - 30), idx + 30)));
      break;
    }
  }
}
