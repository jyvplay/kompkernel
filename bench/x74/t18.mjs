// bench/x74/t18.ts
import * as fs from "node:fs";

// src/lib/omega/bpe.ts
import {
  encode as encO200k,
  decode as decO200k,
  setMergeCacheSize as setO200kMergeCacheSize
} from "gpt-tokenizer/encoding/o200k_base";
import {
  encode as encCl100k,
  decode as decCl100k,
  setMergeCacheSize as setCl100kMergeCacheSize
} from "gpt-tokenizer/encoding/cl100k_base";
import { decoder as GPT_TEXT_DECODER } from "gpt-tokenizer/BytePairEncodingCore";

// src/lib/omega/bpe-fast.ts
import * as O200K from "gpt-tokenizer/encoding/o200k_base";
var CORE = null;
var VOCAB = null;
var SMALL = /* @__PURE__ */ new Map();
var PAIR2 = new Int32Array(65536).fill(-1);
var LONG = /* @__PURE__ */ new Map();
var READY = false;
var FAST_BUILD_MS = 0;
var RE = null;
var TE = new TextEncoder();
var TD = new TextDecoder("utf8");
function isValidUtf8(b) {
  let i = 0;
  const n = b.length;
  while (i < n) {
    const c = b[i];
    if (c < 128) {
      i++;
      continue;
    }
    let need = 0, min = 0, cp = 0;
    if (c >= 194 && c <= 223) {
      need = 1;
      cp = c & 31;
      min = 128;
    } else if (c >= 224 && c <= 239) {
      need = 2;
      cp = c & 15;
      min = 2048;
    } else if (c >= 240 && c <= 244) {
      need = 3;
      cp = c & 7;
      min = 65536;
    } else return false;
    if (i + need >= n + 0 && i + need > n - 1) return false;
    for (let k = 1; k <= need; k++) {
      const cc = b[i + k];
      if ((cc & 192) !== 128) return false;
      cp = cp << 6 | cc & 63;
    }
    if (cp < min || cp > 1114111 || cp >= 55296 && cp <= 57343) return false;
    i += need + 1;
  }
  return true;
}
function latin1(b, s = 0, e = b.length) {
  let out = "";
  for (let i = s; i < e; i++) out += String.fromCharCode(b[i]);
  return out;
}
function keyOf(b, s, e) {
  const n = e - s;
  let k = n * 4294967296;
  for (let i = 0; i < n; i++) k += b[s + i] * Math.pow(256, 3 - i);
  return k;
}
function fastReady() {
  if (READY) return true;
  const t0 = Date.now();
  try {
    const mod = O200K;
    CORE = mod?.default?.bytePairEncodingCoreProcessor ?? mod?.bytePairEncodingCoreProcessor ?? null;
    if (!CORE) return false;
    VOCAB = CORE.bytePairStringRankEncoder;
    RE = new RegExp(CORE.tokenSplitRegex.source, CORE.tokenSplitRegex.flags);
    SMALL.clear();
    LONG.clear();
    PAIR2.fill(-1);
    const put = (bytes, rank) => {
      const n = bytes.length;
      if (n < 2) return;
      if (n === 2) {
        PAIR2[bytes[0] << 8 | bytes[1]] = rank;
        return;
      }
      if (n <= 4) SMALL.set(keyOf(bytes, 0, n), rank);
      else LONG.set(latin1(bytes, 0, n), rank);
    };
    for (const [s, rank] of VOCAB) {
      const bytes = TE.encode(s);
      if (TD.decode(bytes) !== s) return false;
      put(bytes, rank);
    }
    for (const [bytes, rank] of CORE.bytePairNonUtfSortedEncoder) {
      if (isValidUtf8(bytes)) continue;
      put(bytes, rank);
    }
    READY = true;
    FAST_BUILD_MS = Date.now() - t0;
    return true;
  } catch {
    return false;
  }
}
var SCRATCH_MAX = 1024;
var SB = new Uint8Array(SCRATCH_MAX);
var SA = new Int32Array(SCRATCH_MAX + 2);
var SR = new Float64Array(SCRATCH_MAX + 2);
var INF = Number.POSITIVE_INFINITY;
function mergeCount(b, n) {
  if (n <= 1) return n;
  const starts = SA, ranks = SR;
  for (let i = 0; i <= n; i++) starts[i] = i;
  for (let i = 0; i < n - 1; i++) ranks[i] = rankAt(b, i, i + 2);
  ranks[n - 1] = INF;
  ranks[n] = INF;
  let len = n + 1;
  while (len > 1) {
    let best = INF, bi = -1;
    for (let i = 0; i < len - 1; i++) {
      const r = ranks[i];
      if (r < best) {
        best = r;
        bi = i;
      }
    }
    if (bi < 0) break;
    for (let i = bi + 1; i < len - 1; i++) starts[i] = starts[i + 1];
    for (let i = bi; i < len - 1; i++) ranks[i] = ranks[i + 1];
    len--;
    ranks[bi] = bi + 2 < len ? rankAt(b, starts[bi], starts[bi + 2]) : INF;
    if (bi > 0) ranks[bi - 1] = bi + 1 < len ? rankAt(b, starts[bi - 1], starts[bi + 1]) : INF;
  }
  return len - 1;
}
function rankAt(b, s, e) {
  const n = e - s;
  if (n === 2) {
    const v2 = PAIR2[b[s] << 8 | b[s + 1]];
    return v2 < 0 ? INF : v2;
  }
  if (n === 3) {
    const v2 = SMALL.get(12884901888 + b[s] * 16777216 + b[s + 1] * 65536 + b[s + 2] * 256);
    return v2 === void 0 ? INF : v2;
  }
  if (n === 4) {
    const v2 = SMALL.get(17179869184 + b[s] * 16777216 + b[s + 1] * 65536 + b[s + 2] * 256 + b[s + 3]);
    return v2 === void 0 ? INF : v2;
  }
  if (n < 2) return INF;
  const v = LONG.get(latin1(b, s, e));
  return v === void 0 ? INF : v;
}
function fastChunkCount(chunk) {
  const L = chunk.length;
  if (L === 0) return 0;
  if (!READY && !fastReady()) throw new Error("bpe-fast: vocabulary unavailable");
  if (VOCAB.has(chunk)) return 1;
  if (L === 1) {
    if (chunk.charCodeAt(0) < 128) return 1;
  }
  let bytes;
  if (L <= SCRATCH_MAX) {
    let ascii = true;
    for (let i = 0; i < L; i++) {
      const c = chunk.charCodeAt(i);
      if (c > 127) {
        ascii = false;
        break;
      }
      SB[i] = c;
    }
    if (ascii) return mergeCount(SB, L);
    bytes = TE.encode(chunk);
  } else {
    bytes = TE.encode(chunk);
  }
  if (bytes.length === 1) return 1;
  if (bytes.length <= SCRATCH_MAX) {
    SB.set(bytes);
    return mergeCount(SB, bytes.length);
  }
  return mergeCount(bytes, bytes.length);
}
function fastCount(text) {
  if (text === "") return 0;
  if (!READY && !fastReady()) return null;
  const re = RE;
  re.lastIndex = 0;
  const one = re.exec(text);
  if (one !== null && one.index === 0 && one[0].length === text.length) return fastChunkCount(text);
  re.lastIndex = 0;
  const ms = text.match(re);
  if (ms === null) return null;
  let covered = 0;
  for (let i = 0; i < ms.length; i++) covered += ms[i].length;
  if (covered !== text.length) return null;
  let n = 0;
  for (let i = 0; i < ms.length; i++) n += fastChunkCount(ms[i]);
  return n;
}

// src/lib/omega/bpe.ts
var flushDecoder = () => {
  try {
    return GPT_TEXT_DECODER.decode();
  } catch {
    return "";
  }
};
setO200kMergeCacheSize(0);
setCl100kMergeCacheSize(0);
var FAST_BPE = (() => {
  try {
    return !(typeof process !== "undefined" && process.env && process.env.OMEGA_FAST_BPE === "0");
  } catch {
    return true;
  }
})();
var API = {
  o200k_base: {
    encode: (s) => encO200k(s),
    decode: (ids) => {
      flushDecoder();
      return decO200k(ids) + flushDecoder();
    },
    scanLimit: 2e5
  },
  cl100k_base: {
    encode: (s) => encCl100k(s),
    decode: (ids) => {
      flushDecoder();
      return decCl100k(ids) + flushDecoder();
    },
    scanLimit: 100256
  }
};
var PRETOK = {
  o200k_base: /[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]*[\p{Ll}\p{Lm}\p{Lo}\p{M}]+(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|[^\r\n\p{L}\p{N}]?[\p{Lu}\p{Lt}\p{Lm}\p{Lo}\p{M}]+[\p{Ll}\p{Lm}\p{Lo}\p{M}]*(?:'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD]))?|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n/]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu,
  cl100k_base: /'(?:[sStT]|[rR][eE]|[vV][eE]|[mM]|[lL][lL]|[dD])|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu
};
var CHUNK_CACHE = /* @__PURE__ */ new Map();
var chunkHits = 0;
var chunkMisses = 0;
var chunkFallbacks = 0;
var SHORT_CACHE = /* @__PURE__ */ new Map();
var SHORT_CACHE_MAX = 2e6;
var shortHits = 0;
var shortMisses = 0;
var LONG_CACHE = /* @__PURE__ */ new Map();
var LONG_CACHE_MAX = 5e4;
var LONG_CACHE_MAX_TEXT_CHARS = 4096;
var LONG_CACHE_MAX_TOTAL_CHARS = 2e6;
var LONG_CACHE_CHARS = /* @__PURE__ */ new Map();
var longHits = 0;
var longMisses = 0;
function countTokensExact(text, enc2) {
  if (text === "") return 0;
  return API[enc2].encode(text).length;
}
function countTokens(text, enc2) {
  if (text === "") return 0;
  if (text.length < 24) {
    let sc = SHORT_CACHE.get(enc2);
    if (sc === void 0) {
      sc = /* @__PURE__ */ new Map();
      SHORT_CACHE.set(enc2, sc);
    }
    const v = sc.get(text);
    if (v !== void 0) {
      shortHits++;
      return v;
    }
    shortMisses++;
    const t = (FAST_BPE && enc2 === "o200k_base" ? fastCount(text) : null) ?? countTokensExact(text, enc2);
    if (sc.size >= SHORT_CACHE_MAX) sc.clear();
    sc.set(text, t);
    return t;
  }
  let lc = LONG_CACHE.get(enc2);
  if (lc === void 0) {
    lc = /* @__PURE__ */ new Map();
    LONG_CACHE.set(enc2, lc);
  }
  const cacheable = text.length <= LONG_CACHE_MAX_TEXT_CHARS;
  const memo = cacheable ? lc.get(text) : void 0;
  if (memo !== void 0) {
    longHits++;
    return memo;
  }
  longMisses++;
  const re = PRETOK[enc2];
  re.lastIndex = 0;
  const cs = text.match(re);
  if (cs === null) {
    chunkFallbacks++;
    return countTokensExact(text, enc2);
  }
  let covered = 0;
  for (let i = 0; i < cs.length; i++) covered += cs[i].length;
  if (covered !== text.length) {
    chunkFallbacks++;
    return countTokensExact(text, enc2);
  }
  const pfx = enc2 === "cl100k_base" ? "" : "";
  let n = 0;
  for (let i = 0; i < cs.length; i++) {
    const k = pfx + cs[i];
    const v = CHUNK_CACHE.get(k);
    if (v === void 0) {
      chunkMisses++;
      const t = (FAST_BPE && enc2 === "o200k_base" ? fastCount(cs[i]) : null) ?? API[enc2].encode(cs[i]).length;
      if (CHUNK_CACHE.size > 5e5) CHUNK_CACHE.clear();
      CHUNK_CACHE.set(k, t);
      n += t;
    } else {
      chunkHits++;
      n += v;
    }
  }
  if (cacheable) {
    let retainedChars = LONG_CACHE_CHARS.get(enc2) ?? 0;
    if (lc.size >= LONG_CACHE_MAX || retainedChars + text.length > LONG_CACHE_MAX_TOTAL_CHARS) {
      lc.clear();
      retainedChars = 0;
    }
    lc.set(text, n);
    LONG_CACHE_CHARS.set(enc2, retainedChars + text.length);
  }
  return n;
}

// bench/x74/t18.ts
var enc = "o200k_base";
var VOID = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
for (const p of process.argv.slice(2)) {
  const t = fs.readFileSync(p, "utf8");
  const lines = t.split("\n");
  let depth = 0, ok = 0, bad = 0;
  const units = /* @__PURE__ */ new Map();
  const bads = [];
  const reparsed = [];
  for (const l of lines) {
    const body = l.replace(/^[ \t]+/, "");
    const lead = l.slice(0, l.length - body.length);
    const unit = 2;
    const guess = " ".repeat(Math.max(0, depth) * unit);
    if (lead === guess) ok++;
    else {
      bad++;
      if (bads.length < 3) bads.push(`depth ${depth} lead ${JSON.stringify(lead)} want ${JSON.stringify(guess)} :: ${body.slice(0, 40)}`);
    }
    if (lead) units.set(lead.length, (units.get(lead.length) ?? 0) + 1);
    reparsed.push(guess + body);
    let scan = body.replace(/<!--[\s\S]*?-->/g, "");
    const tagRe = /<(\/?)([A-Za-z][\w:-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
    let m;
    let opens = 0, closes = 0;
    while (m = tagRe.exec(scan)) {
      const isClose = m[1] === "/", name = m[2].toLowerCase(), self = /\/\s*$/.test(m[3]);
      if (isClose) closes++;
      else if (!self && !VOID.has(name)) opens++;
    }
    depth = Math.max(0, depth + opens - closes);
  }
  console.log(`${p.split("/").pop().padEnd(20)} raw ${String(countTokens(t, enc)).padStart(5)} stripped ${String(countTokens(lines.map((l) => l.replace(/^[ \t]+/, "")).join("\n"), enc)).padStart(5)} lines ${lines.length} depth-exact ${ok}/${lines.length} leading ${[...units.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((x) => x[0] + "x" + x[1]).join(" ")}`);
  for (const b of bads) console.log("    " + b);
}
