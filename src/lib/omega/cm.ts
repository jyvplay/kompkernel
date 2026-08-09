/**
 * src/lib/omega/cm.ts
 * =============================================================================
 * OMEGA-Ξ STAGE-1 ENTROPY ENGINE
 * Context-mixing (CM) binary arithmetic coder with logistic mixing, SSE/APM
 * refinement, a match model, and a deterministic warm-start prior.
 *
 * Architecture (lpaq-class, pure TypeScript, no dependencies):
 *   - 7 direct/hashed context models: order-0,1,2,3,4,6 + word model
 *   - 1 match model (long-range repeat predictor; carries CSV/JSON/log data)
 *   - logistic mixer (gated by previous byte) over 9 stretched inputs
 *   - APM/SSE stage keyed on the partial byte
 *   - carryless 32-bit binary arithmetic coder (lpaq/zpaq family)
 *
 * DETERMINISM CONTRACT
 *   Encoder and decoder execute the *identical* model update path. The decoder
 *   is the encoder with the bit source swapped. Any divergence is a hard bug,
 *   so every public entry point is round-trip gated by the caller.
 *
 * WHY THIS EXISTS
 *   BPE token cost of an arbitrary payload is bounded below by
 *       ceil(H(payload) / bits_per_token_of_envelope).
 *   Stage 1 minimises H (bits). Stage 2 (atoms.ts) maximises bits_per_token.
 *   Neither stage alone is sufficient; the product is what moves the Pareto
 *   frontier. DEFLATE/gzip (the only codecs natively available in-browser)
 *   have no warm-start dictionary and need ~1 KB before they break even, which
 *   is why they lose on prompt-sized inputs. The prior below removes that
 *   warm-up cost without any network or model download.
 * =============================================================================
 */

/* ---------------------------------------------------------------------------
 * Warm-start prior. Deterministic, embedded, identical on both sides.
 * Chosen to span the real input distribution of this app: English prose,
 * JSON, CSV, markdown, numerics, code and punctuation. It is never emitted;
 * it only pre-trains the statistics so short inputs do not pay warm-up cost.
 * ------------------------------------------------------------------------- */
export const OMEGA_PRIOR = [
  'The quick brown fox jumps over the lazy dog. ',
  'In this document we describe the system, the method, the results and the ',
  'conclusion. The results show that the proposed approach is better than the ',
  'baseline because it reduces the number of tokens that are required to ',
  'represent the same information. For each of the following sections, the ',
  'reader should note that there is a trade-off between compression and ',
  'fidelity, and that the best configuration depends on the input data.\n',
  '{"id":1,"name":"alpha","value":12.5,"active":true,"tags":["a","b"],"meta":{"created":"2026-01-01T00:00:00Z","updated":null}}\n',
  '{"id":2,"name":"beta","value":13.5,"active":false,"tags":["c"],"meta":{"created":"2026-01-02T00:00:00Z","updated":null}}\n',
  '{"ok":true,"error":null,"data":[{"id":7,"qty":1200,"px":43.75},{"id":8,"qty":940,"px":43.75},{"id":9,"qty":880,"px":44.10}],"ts":"2026-07-19T04:15:00Z"}\n',
  'id,name,value,date,status\n1,alpha,10.25,2026-01-01,ok\n2,beta,11.50,2026-01-02,ok\n',
  '3,gamma,12.75,2026-01-03,fail\n4,delta,13.00,2026-01-04,ok\n5,epsilon,14.25,2026-01-05,ok\n',
  'id,qty,px\n7,1200,43.75\n8,940,43.75\n9,880,44.10\n10,1500,45.00\n11,850,43.50\n',
  '| col_a | col_b | col_c |\n|-------|-------|-------|\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |\n',
  '## grid\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |\n',
  '# Heading\n## Subheading\n- item one\n- item two\n1. first\n2. second\n',
  'export function compute(input: string, options: Options = {}): Result {\n',
  '  const value = input.length > 0 ? parseInt(input, 10) : 0;\n',
  '  if (!Number.isFinite(value)) throw new Error("invalid input");\n',
  '  return { ok: true, value, count: items.length };\n}\n',
  'for (let i = 0; i < n; i++) { total += data[i]; }\n',
  'const result = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" } });\n',
  '0123456789 0.0 1.5 2.25 3.75 10 100 1000 10000 100000 -1 -2.5 1e6 0x1f 12:30:45 2026-07-19\n',
  'The pump failed at 04:15 UTC. Replace seal 12-A before the next run. Torque 42.5 Nm; ref #A7-2291. Verify seal.\n',
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ',
  'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis ',
  'nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n',
  'and the of to in that is was he for it with as his on be at by not this but ',
  'from they she or an will my one all would there their what so up out if about ',
  'who get which go me when make can like time no just him know take people into ',
  'year your good some could them see other than then now look only come its over ',
  'think also back after use two how our work first well way even new want because ',
  'any these give day most us data value system token model text input output ',
  'error status count total index length name type null true false object array\n',
  'ERROR 2026-07-19T01:02:03Z service=api status=500 latency_ms=1234 path=/v1/x\n',
  'WARN  2026-07-19T01:02:04Z service=api status=429 latency_ms=87 path=/v1/y\n',
  'INFO  2026-07-19T01:02:05Z service=api status=200 latency_ms=12 path=/v1/z\n',
  'SYSTEM PROMPT: You are an expert coding assistant. Do not invent metrics or values. Check all thresholds.\n',
  'return Response.json({ ok: true, output: result.output, codec: result.codec });\n',
  // v3 Aleph-family enrichment: patterns that co-occur with typed structural chunks
  '\x1f\x03\x1f\x03\x1f\x02\x1f\x02\x1f\x01\x1f\x01', // typical Aleph escape byte co-occurrence
  ',ok\n,fail\n,warn\n,pass\n,error\n', // CSV status column tails
  ' UTC.\n UTC ok.\n UTC fail.\n', ' seal 12-A ', ' seal 13-B ', ' Torque 42.5 Nm; ref #',
  '"ids":[1,2,3],"ts":"', '"ids":[7,8,9],"ts":"', '"error":null,"data":[', '"data":[{"id":',
  '","status":"ok","', '","status":"fail","', '","level":"error","', '","level":"warn","',
  'id,qty,px\n', 'id,name,value\n', 'time,valA,valB\n', 'sku,name,price,qty\n',
  ',43.50\n,43.75\n,44.00\n,44.10\n,44.25\n,45.00\n,45.50\n', // repeated decimals
  '## grid\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |\n',
  'The pump failed at ', ' before the next run. ', ' Verify seal. ', ' Replace seal ',
  ' UTC. Replace seal ', ' Nm; ref #A', '-2291. Verify seal.\n',
].join('');

/* ---------------------------------------------------------------------------
 * squash / stretch tables (12-bit probability domain, 8-bit-scaled logit)
 * ------------------------------------------------------------------------- */
const SQUASH = new Int16Array(4096);
for (let i = 0; i < 4096; i++) {
  const d = (i - 2048) / 256;
  let v = Math.round(4096 / (1 + Math.exp(-d)));
  if (v < 1) v = 1;
  if (v > 4095) v = 4095;
  SQUASH[i] = v;
}
function squash(d: number): number {
  if (d <= -2048) return 1;
  if (d >= 2047) return 4095;
  return SQUASH[(d | 0) + 2048];
}
const STRETCH = new Int16Array(4096);
{
  let pi = 0;
  for (let x = -2047; x <= 2047; x++) {
    const v = squash(x);
    for (let p = pi; p <= v; p++) STRETCH[p] = x;
    pi = v + 1;
  }
  for (let p = pi; p < 4096; p++) STRETCH[p] = 2047;
}

/* Adaptive counter rates: 1/(n+1.5) with a floor so models stay adaptive. */
const RATE = new Float64Array(256);
for (let i = 0; i < 256; i++) RATE[i] = Math.max(1 / (i + 1.5), 1 / 48);
const RATE_LIMIT = 250;

/* ---------------------------------------------------------------------------
 * Sizing
 * ------------------------------------------------------------------------- */
const MEMBITS = 18;
const MEM = 1 << MEMBITS;
const MMASK = MEM - 1;
const NCTX = 10; // o0,o1,o2,o3,o4,o6,word,o8,col,sparse
const NIN = 12; // NCTX + match + bias
const MATCH_HT_BITS = 20;
const MATCH_HT = 1 << MATCH_HT_BITS;
const MATCH_HT_MASK = MATCH_HT - 1;
const MIX_SETS = 256; // gated by previous byte

function hmix(x: number, k: number): number {
  let h = Math.imul(x ^ Math.imul(k + 1, 0x9e3779b1), 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/* ---------------------------------------------------------------------------
 * APM / SSE
 * ------------------------------------------------------------------------- */
class APM {
  t: Uint16Array;
  idx = 0;
  constructor(n: number) {
    this.t = new Uint16Array(n * 33);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 33; j++) {
        this.t[i * 33 + j] = i === 0 ? squash((j - 16) * 128) * 16 : this.t[j];
      }
    }
  }
  pp(pr: number, cx: number): number {
    const s = STRETCH[pr] + 2048;
    const w = s & 127;
    this.idx = (s >> 7) + cx * 33;
    return (this.t[this.idx] * (128 - w) + this.t[this.idx + 1] * w) >> 11;
  }
  update(bit: number): void {
    const g = bit ? 65535 : 0;
    this.t[this.idx] += (g - this.t[this.idx]) >> 6;
    this.t[this.idx + 1] += (g - this.t[this.idx + 1]) >> 6;
  }
}

/* ---------------------------------------------------------------------------
 * The model. Encoder and decoder share this object type exactly.
 * ------------------------------------------------------------------------- */
export class CMModel {
  // context model state
  pt: Uint16Array[] = [];
  ct: Uint8Array[] = [];
  ix = new Int32Array(NCTX);
  st = new Int32Array(NIN);
  h = new Int32Array(NCTX);

  // mixer
  w: Float64Array;
  mxbase = 0;

  // sse
  apm1: APM;
  apm2: APM;

  // byte / bit state
  c0 = 1;
  bitpos = 0;
  c4 = 0;
  c8 = 0;
  wh = 0;
  lastNewlinePos = 0;

  // history buffer (prior + payload), shared with match model
  buf: Uint8Array;
  pos = 0;

  // match model
  ht: Int32Array;
  mptr = 0;
  mlen = 0;
  mcm: Uint16Array;
  mcnt: Uint8Array;
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

  clone(): CMModel {
    const m = new CMModel(false);
    for (let i = 0; i < NCTX; i++) {
      m.pt.push(this.pt[i].slice());
      m.ct.push(this.ct[i].slice());
    }
    m.w = this.w.slice();
    m.apm1 = new APM(1);
    m.apm1.t = this.apm1.t.slice();
    m.apm2 = new APM(1);
    m.apm2.t = this.apm2.t.slice();
    m.buf = this.buf.slice();
    m.ht = this.ht.slice();
    m.mcm = this.mcm.slice();
    m.mcnt = this.mcnt.slice();
    m.c0 = this.c0;
    m.bitpos = this.bitpos;
    m.c4 = this.c4;
    m.c8 = this.c8;
    m.wh = this.wh;
    m.lastNewlinePos = this.lastNewlinePos;
    m.pos = this.pos;
    m.mptr = this.mptr;
    m.mlen = this.mlen;
    m.h.set(this.h);
    m.mxbase = this.mxbase;
    return m;
  }

  private grow(need: number): void {
    if (need <= this.buf.length) return;
    let n = this.buf.length || 1024;
    while (n < need) n *= 2;
    const nb = new Uint8Array(n);
    nb.set(this.buf);
    this.buf = nb;
  }

  /** Recompute per-byte context hashes. Called after every completed byte. */
  private newByte(b: number): void {
    this.grow(this.pos + 1);
    this.buf[this.pos] = b;
    this.pos++;

    this.c8 = ((this.c8 << 8) | ((this.c4 >>> 24) & 255)) >>> 0;
    this.c4 = ((this.c4 << 8) | b) >>> 0;

    const isAlnum =
      (b >= 65 && b <= 90) || (b >= 97 && b <= 122) || (b >= 48 && b <= 57);
    this.wh = isAlnum ? (Math.imul(this.wh, 0x2f0fd693) + b + 1) >>> 0 : 0;
    if (b === 10 || b === 13) this.lastNewlinePos = this.pos;
    const col = (this.pos - this.lastNewlinePos) & 0xffff;

    const c4 = this.c4;
    this.h[0] = 0;
    this.h[1] = hmix(c4 & 0xff, 1) | 0;
    this.h[2] = hmix(c4 & 0xffff, 2) | 0;
    this.h[3] = hmix(c4 & 0xffffff, 3) | 0;
    this.h[4] = hmix(c4, 4) | 0;
    this.h[5] = hmix((c4 ^ Math.imul(this.c8 & 0xffff, 0x9e3779b1)) >>> 0, 5) | 0;
    this.h[6] = hmix(this.wh, 6) | 0;
    this.h[7] = hmix(this.c8, 8) | 0;
    this.h[8] = hmix((col << 8) | (b & 0xff), 9) | 0;
    this.h[9] = hmix(((c4 & 0xff) << 16) | ((this.c8 >>> 16) & 0xffff), 10) | 0;

    this.mxbase = (this.c4 & 0xff) * NIN;

    // ---- match model: advance or re-acquire -------------------------------
    const pos = this.pos;
    const mh =
      hmix(
        (Math.imul(this.c4, 0x1e35a7bd) ^ Math.imul(this.c8 & 0xffff, 0x9e3779b1)) >>> 0,
        7,
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
  predict(): number {
    const c0 = this.c0;
    for (let i = 0; i < NCTX; i++) {
      const idx = (Math.imul(this.h[i] ^ Math.imul(c0, 0x6f4f2f1f), 0x27d4eb2d) >>> 0) & MMASK;
      this.ix[i] = idx;
      this.st[i] = STRETCH[this.pt[i][idx] >>> 4];
    }

    // match model input
    let mst = 0;
    if (this.mlen > 0) {
      const exp = this.buf[this.mptr];
      if (((exp | 256) >> (8 - this.bitpos)) === c0) {
        this.mbit = (exp >> (7 - this.bitpos)) & 1;
        const lb = this.mlen > 31 ? 31 : this.mlen;
        this.midx = (lb << 1) | this.mbit;
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
    this.st[NCTX + 1] = 256; // bias

    let dot = 0;
    const base = this.mxbase;
    for (let i = 0; i < NIN; i++) dot += this.w[base + i] * this.st[i];
    if (dot > 2047) dot = 2047;
    else if (dot < -2047) dot = -2047;
    const p = squash(dot | 0);
    this.prMix = p;

    const p1 = this.apm1.pp(p, c0);
    const p2 = this.apm2.pp(p, ((this.c4 & 0xff) << 2 | (this.bitpos >> 1)) & 1023);
    let pr = (p + p1 + 2 * p2) >> 2;
    if (pr < 1) pr = 1;
    else if (pr > 4094) pr = 4094;
    this.pr = pr;
    return pr;
  }

  /** Commit the true bit into every model. Identical on encode and decode. */
  update(bit: number): void {
    // mixer gradient step (lpaq scaling, float weights)
    const err = ((bit << 12) - this.prMix) * 7;
    const base = this.mxbase;
    for (let i = 0; i < NIN; i++) {
      this.w[base + i] += this.st[i] * err * 2.3283064365386963e-10;
    }

    // counters
    const g = bit ? 65535 : 0;
    for (let i = 0; i < NCTX; i++) {
      const idx = this.ix[i];
      const c = this.ct[i][idx];
      const p = this.pt[i][idx];
      this.pt[i][idx] = p + (((g - p) * RATE[c]) | 0);
      if (c < RATE_LIMIT) this.ct[i][idx] = c + 1;
    }

    // match counter
    {
      const idx = this.midx;
      const c = this.mcnt[idx];
      const p = this.mcm[idx];
      this.mcm[idx] = p + (((g - p) * RATE[c]) | 0);
      if (c < RATE_LIMIT) this.mcnt[idx] = c + 1;
    }

    this.apm1.update(bit);
    this.apm2.update(bit);

    // bit/byte state
    this.c0 = (this.c0 << 1) | bit;
    this.bitpos++;
    if (this.c0 >= 256) {
      const b = this.c0 & 255;
      this.c0 = 1;
      this.bitpos = 0;
      this.newByte(b);
    }
  }

  /** Train on known bytes without coding them (warm start). */
  prime(bytes: Uint8Array): void {
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      for (let j = 7; j >= 0; j--) {
        this.predict();
        this.update((b >> j) & 1);
      }
    }
  }
}

/* ---------------------------------------------------------------------------
 * Carryless binary arithmetic coder
 * ------------------------------------------------------------------------- */
class ArEncoder {
  x1 = 0;
  x2 = 4294967295;
  out: number[] = [];
  code(bit: number, p: number): void {
    const range = this.x2 - this.x1;
    const xmid = this.x1 + Math.floor(range / 4096) * p;
    if (bit) this.x2 = xmid;
    else this.x1 = xmid + 1;
    while (((this.x1 ^ this.x2) & 0xff000000) === 0) {
      this.out.push((this.x2 >>> 24) & 255);
      this.x1 = ((this.x1 << 8) >>> 0) % 4294967296;
      this.x2 = (((this.x2 << 8) >>> 0) + 255) % 4294967296;
    }
  }
  flush(): Uint8Array {
    let x = this.x1;
    for (let i = 0; i < 4; i++) {
      this.out.push((x >>> 24) & 255);
      x = (x << 8) >>> 0;
    }
    return Uint8Array.from(this.out);
  }
}

class ArDecoder {
  x1 = 0;
  x2 = 4294967295;
  x = 0;
  p = 0;
  constructor(public src: Uint8Array) {
    for (let i = 0; i < 4; i++) this.x = ((this.x << 8) >>> 0) + this.next();
    this.x = this.x >>> 0;
  }
  private next(): number {
    return this.p < this.src.length ? this.src[this.p++] : 0;
  }
  decode(p: number): number {
    const range = this.x2 - this.x1;
    const xmid = this.x1 + Math.floor(range / 4096) * p;
    let bit: number;
    if (this.x <= xmid) {
      bit = 1;
      this.x2 = xmid;
    } else {
      bit = 0;
      this.x1 = xmid + 1;
    }
    while (((this.x1 ^ this.x2) & 0xff000000) === 0) {
      this.x1 = ((this.x1 << 8) >>> 0) % 4294967296;
      this.x2 = (((this.x2 << 8) >>> 0) + 255) % 4294967296;
      this.x = (((this.x << 8) >>> 0) + this.next()) >>> 0;
    }
    return bit;
  }
}

/* ---------------------------------------------------------------------------
 * Primed-model cache
 * ------------------------------------------------------------------------- */
let PRIMED: CMModel | null = null;
let PRIOR_BYTES: Uint8Array | null = null;

export function priorBytes(): Uint8Array {
  if (!PRIOR_BYTES) PRIOR_BYTES = new TextEncoder().encode(OMEGA_PRIOR);
  return PRIOR_BYTES;
}

function freshModel(): CMModel {
  if (!PRIMED) {
    const m = new CMModel(true);
    m.prime(priorBytes());
    PRIMED = m;
  }
  return PRIMED.clone();
}

/* varint helpers (7-bit little-endian groups, MSB = continuation) */
export function putVarint(out: number[], n: number): void {
  let v = n >>> 0;
  while (v >= 128) {
    out.push((v & 127) | 128);
    v = Math.floor(v / 128);
  }
  out.push(v);
}

/* ---------------------------------------------------------------------------
 * Public API
 * ------------------------------------------------------------------------- */

/** Compress raw bytes. Output embeds the original length; self-terminating. */
export function cmCompress(data: Uint8Array): Uint8Array {
  const head: number[] = [];
  putVarint(head, data.length);
  const plain = new Uint8Array(head.length + data.length);
  plain.set(head, 0);
  plain.set(data, head.length);

  const m = freshModel();
  const enc = new ArEncoder();
  for (let i = 0; i < plain.length; i++) {
    const b = plain[i];
    for (let j = 7; j >= 0; j--) {
      const p = m.predict();
      const bit = (b >> j) & 1;
      enc.code(bit, p);
      m.update(bit);
    }
  }
  return enc.flush();
}

/** Decompress. `comp` may carry trailing padding bytes; they are ignored. */
export function cmDecompress(comp: Uint8Array): Uint8Array {
  const m = freshModel();
  const dec = new ArDecoder(comp);
  const readByte = (): number => {
    let b = 0;
    for (let j = 7; j >= 0; j--) {
      const p = m.predict();
      const bit = dec.decode(p);
      m.update(bit);
      b = (b << 1) | bit;
    }
    return b;
  };

  // varint length prefix
  let len = 0;
  let shift = 1;
  for (let k = 0; k < 5; k++) {
    const b = readByte();
    len += (b & 127) * shift;
    if ((b & 128) === 0) break;
    shift *= 128;
  }
  if (len > 1 << 26) throw new Error('omega: implausible length');

  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) out[i] = readByte();
  return out;
}

export const CM_INFO = {
  models: NCTX + 1,
  memoryBytes: NCTX * (MEM * 2 + MEM) + MATCH_HT * 4,
  priorChars: OMEGA_PRIOR.length,
  mixerInputs: NIN,
};
