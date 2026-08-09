/**
 * src/lib/omega/aleph.ts
 * =============================================================================
 * OMEGA-Ξ v3 "ALEPH" — TYPED STRUCTURAL PREPASS
 *
 * Design principle: the entropy coder (CM-Ω, Brotli, Deflate) sees numeric
 * digit runs as high-entropy ASCII noise, because BPE / byte statistics do not
 * know that "43.75" is a two-integer decimal, or that "2026-07-19T04:15:00Z"
 * is a 6-field timestamp. Both patterns fragment badly under BPE tokenization
 * (up to 5-8 real BPE tokens each in o200k_base).
 *
 * Aleph strips these patterns to compact binary BEFORE entropy coding, then
 * restores them on decode. Combined with any of {CM-Ω, Brotli, Deflate}
 * downstream, this reduces payload byte count 15-30% on numeric/tabular
 * inputs, which translates linearly to atom count reduction after mixed-radix
 * packing (Chunk-Boundary Invariance Theorem preserved).
 *
 * Wire format (byte stream, escape byte = 0x1F, disjoint from SHFP's 0x1E):
 *
 *   LITERAL byte b (b != 0x1F)       -> emit b
 *   LITERAL byte b (b == 0x1F)       -> emit 0x1F 0xFF
 *   INT run (d digits, d >= 4)       -> emit 0x1F 0x01 [varint(N)] [byte d]
 *   DEC run "int.frac" (>= 4 chars)  -> emit 0x1F 0x02 [varint(I)] [byte iL] [byte fL] [varint(F)]
 *   FULL ISO ts YYYY-MM-DDTHH:MM:SSZ -> emit 0x1F 0x03 [Y-2000:2B] [M:1] [D:1] [h:1] [m:1] [s:1] [Zflag:1]
 *   ISO DATE YYYY-MM-DD              -> emit 0x1F 0x04 [Y-2000:2B] [M:1] [D:1]
 *   HH:MM:SS (24h, standalone)       -> emit 0x1F 0x05 [h:1] [m:1] [s:1]
 *   HH:MM   (24h, standalone)        -> emit 0x1F 0x06 [h:1] [m:1]
 *
 * Guarantee: every emitted tag encodes iL and fL (literal digit counts of the
 * decoded number) so leading zeros in "07-19" or "04:15" survive round-trip.
 * Every path is exactness-gated by the caller's portfolio tournament.
 * =============================================================================
 */

export const ALEPH_ESC = 0x1f;
export const TAG_ESC_LITERAL = 0xff; // 0x1F 0xFF -> literal 0x1F
export const TAG_INT = 0x01;
export const TAG_DEC = 0x02;
export const TAG_ISO_DT = 0x03;
export const TAG_ISO_DATE = 0x04;
export const TAG_TIME_HMS = 0x05;
export const TAG_TIME_HM = 0x06;

/* varint helpers (LSB-first, 7-bit groups). Safe for values up to 2^49 via
 * `Math.floor`+`%` arithmetic (no `>>>` which truncates to 32-bit). Peek
 * functions cap the ASCII digit count at 9, keeping encoded values well below
 * 2^32, so 5 continuation bytes are always sufficient — but we allow 7 for
 * defensive decode. */
function encVarint(n: number, out: number[]): void {
  let v = n;
  while (v >= 128) {
    out.push((v % 128) | 128);
    v = Math.floor(v / 128);
  }
  out.push(v);
}
function decVarint(bytes: Uint8Array, pos: number): { value: number; next: number } {
  let value = 0;
  let shift = 1;
  let p = pos;
  for (let k = 0; k < 7; k++) {
    if (p >= bytes.length) throw new Error('aleph: truncated varint');
    const b = bytes[p++];
    value += (b & 127) * shift;
    if ((b & 128) === 0) return { value, next: p };
    shift *= 128;
  }
  throw new Error('aleph: varint too long');
}

function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}
function isLetter(c: number): boolean {
  return (c >= 65 && c <= 90) || (c >= 97 && c <= 122);
}

/**
 * Read ASCII base-10 unsigned integer starting at `pos`, up to `maxLen` digits,
 * returning value + consumed count. Value must not exceed Number.MAX_SAFE (safe
 * because our max is 4-byte varints ≈ 2^28).
 */
function readInt(bytes: Uint8Array, pos: number, maxLen: number): { value: number; len: number } {
  let value = 0;
  let len = 0;
  while (len < maxLen && pos + len < bytes.length && isDigit(bytes[pos + len])) {
    value = value * 10 + (bytes[pos + len] - 48);
    len++;
  }
  return { value, len };
}

/**
 * Peek an ISO date-time at `pos`. Returns match length or 0.
 * Matches: YYYY-MM-DDTHH:MM:SS  or  YYYY-MM-DDTHH:MM:SSZ
 */
function peekIsoDt(bytes: Uint8Array, pos: number): number {
  // YYYY-MM-DD (10) + T (1) + HH:MM:SS (8) = 19; optional +Z = 20
  if (pos + 19 > bytes.length) return 0;
  if (!isDigit(bytes[pos]) || !isDigit(bytes[pos + 1]) || !isDigit(bytes[pos + 2]) || !isDigit(bytes[pos + 3])) return 0;
  if (bytes[pos + 4] !== 45) return 0; // '-'
  if (!isDigit(bytes[pos + 5]) || !isDigit(bytes[pos + 6])) return 0;
  if (bytes[pos + 7] !== 45) return 0;
  if (!isDigit(bytes[pos + 8]) || !isDigit(bytes[pos + 9])) return 0;
  if (bytes[pos + 10] !== 84) return 0; // 'T'
  if (!isDigit(bytes[pos + 11]) || !isDigit(bytes[pos + 12])) return 0;
  if (bytes[pos + 13] !== 58) return 0; // ':'
  if (!isDigit(bytes[pos + 14]) || !isDigit(bytes[pos + 15])) return 0;
  if (bytes[pos + 16] !== 58) return 0;
  if (!isDigit(bytes[pos + 17]) || !isDigit(bytes[pos + 18])) return 0;
  if (pos + 19 < bytes.length && bytes[pos + 19] === 90) return 20; // 'Z'
  return 19;
}

/** Peek ISO date YYYY-MM-DD standalone (not followed by 'T'). Returns 10 or 0. */
function peekIsoDate(bytes: Uint8Array, pos: number): number {
  if (pos + 10 > bytes.length) return 0;
  if (!isDigit(bytes[pos]) || !isDigit(bytes[pos + 1]) || !isDigit(bytes[pos + 2]) || !isDigit(bytes[pos + 3])) return 0;
  if (bytes[pos + 4] !== 45) return 0;
  if (!isDigit(bytes[pos + 5]) || !isDigit(bytes[pos + 6])) return 0;
  if (bytes[pos + 7] !== 45) return 0;
  if (!isDigit(bytes[pos + 8]) || !isDigit(bytes[pos + 9])) return 0;
  if (pos + 10 < bytes.length && bytes[pos + 10] === 84) return 0; // reserved for ISO_DT
  return 10;
}

/** Peek HH:MM:SS. Returns 8 or 0. */
function peekTimeHms(bytes: Uint8Array, pos: number): number {
  if (pos + 8 > bytes.length) return 0;
  if (!isDigit(bytes[pos]) || !isDigit(bytes[pos + 1])) return 0;
  if (bytes[pos + 2] !== 58) return 0;
  if (!isDigit(bytes[pos + 3]) || !isDigit(bytes[pos + 4])) return 0;
  if (bytes[pos + 5] !== 58) return 0;
  if (!isDigit(bytes[pos + 6]) || !isDigit(bytes[pos + 7])) return 0;
  return 8;
}

/** Peek HH:MM (not followed by :). Returns 5 or 0. */
function peekTimeHm(bytes: Uint8Array, pos: number): number {
  if (pos + 5 > bytes.length) return 0;
  if (!isDigit(bytes[pos]) || !isDigit(bytes[pos + 1])) return 0;
  if (bytes[pos + 2] !== 58) return 0;
  if (!isDigit(bytes[pos + 3]) || !isDigit(bytes[pos + 4])) return 0;
  if (pos + 5 < bytes.length && bytes[pos + 5] === 58) return 0; // reserved for HMS
  // Also reject if followed by a digit (would be malformed HHMMS or misinterpretation)
  if (pos + 5 < bytes.length && isDigit(bytes[pos + 5])) return 0;
  return 5;
}

/**
 * Peek a decimal "int.frac" where int has >= 1 digit, frac has >= 1 digit,
 * total chars >= 4 (else not net-saving). Preceding byte must not be digit or
 * letter (to avoid capturing part of an identifier or larger number).
 */
function peekDecimal(bytes: Uint8Array, pos: number, prev: number): number {
  if (prev >= 0 && (isDigit(prev) || isLetter(prev) || prev === 46)) return 0;
  const intPart = readInt(bytes, pos, 9);
  if (intPart.len === 0) return 0;
  if (pos + intPart.len >= bytes.length || bytes[pos + intPart.len] !== 46) return 0;
  // Reject if the raw digit run continues past our 9-digit cap
  if (pos + intPart.len < bytes.length && isDigit(bytes[pos + intPart.len - 1]) && intPart.len === 9 && pos + intPart.len + 1 <= bytes.length && isDigit(bytes[pos + intPart.len])) return 0;
  const fracPart = readInt(bytes, pos + intPart.len + 1, 9);
  if (fracPart.len === 0) return 0;
  const total = intPart.len + 1 + fracPart.len;
  if (total < 4) return 0;
  // Reject if followed by digit or letter (would be malformed like "1.2.3")
  const after = pos + total;
  if (after < bytes.length && (isDigit(bytes[after]) || isLetter(bytes[after]) || bytes[after] === 46)) return 0;
  return total;
}

/**
 * Peek a long integer run: >= 4 digits, not preceded by digit/letter and not
 * followed by '.' + digit (that would be a decimal, handled separately) nor by
 * digit/letter (that would spill into an identifier).
 */
function peekLongInt(bytes: Uint8Array, pos: number, prev: number): number {
  if (prev >= 0 && (isDigit(prev) || isLetter(prev) || prev === 46)) return 0;
  // Cap at 9 digits so encoded values stay < 2^32, guaranteeing safe varint arithmetic
  const r = readInt(bytes, pos, 9);
  if (r.len < 4) return 0;
  const after = pos + r.len;
  if (after < bytes.length) {
    const c = bytes[after];
    if (isDigit(c) || isLetter(c)) return 0; // reject 10+ digit runs by "followed by digit" test
    if (c === 46 && after + 1 < bytes.length && isDigit(bytes[after + 1])) return 0; // integer part of decimal
  }
  return r.len;
}

/* ---------------------------------------------------------------------------
 * ENCODE
 * ------------------------------------------------------------------------- */
export function alephEncode(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  const n = input.length;

  while (i < n) {
    const prev = i > 0 ? input[i - 1] : -1;
    const b = input[i];

    // Escape literal 0x1F
    if (b === ALEPH_ESC) {
      out.push(ALEPH_ESC, TAG_ESC_LITERAL);
      i++;
      continue;
    }

    // Prefix tests must be at valid boundary: prev not digit/letter/dot
    const atBoundary = !(prev >= 0 && (isDigit(prev) || isLetter(prev) || prev === 46));

    if (atBoundary && isDigit(b)) {
      // ISO_DT (longest match first)
      const dtLen = peekIsoDt(input, i);
      if (dtLen > 0) {
        // Parse fields
        const year = (input[i] - 48) * 1000 + (input[i + 1] - 48) * 100 + (input[i + 2] - 48) * 10 + (input[i + 3] - 48);
        const mo = (input[i + 5] - 48) * 10 + (input[i + 6] - 48);
        const dd = (input[i + 8] - 48) * 10 + (input[i + 9] - 48);
        const hh = (input[i + 11] - 48) * 10 + (input[i + 12] - 48);
        const mm = (input[i + 14] - 48) * 10 + (input[i + 15] - 48);
        const ss = (input[i + 17] - 48) * 10 + (input[i + 18] - 48);
        const zFlag = dtLen === 20 ? 1 : 0;
        // Year stored as year - 2000 in 2 bytes little-endian; supports 2000-67535
        const yd = year - 2000;
        out.push(ALEPH_ESC, TAG_ISO_DT, yd & 255, (yd >> 8) & 255, mo, dd, hh, mm, ss, zFlag);
        i += dtLen;
        continue;
      }
      const dateLen = peekIsoDate(input, i);
      if (dateLen > 0) {
        const year = (input[i] - 48) * 1000 + (input[i + 1] - 48) * 100 + (input[i + 2] - 48) * 10 + (input[i + 3] - 48);
        const mo = (input[i + 5] - 48) * 10 + (input[i + 6] - 48);
        const dd = (input[i + 8] - 48) * 10 + (input[i + 9] - 48);
        const yd = year - 2000;
        out.push(ALEPH_ESC, TAG_ISO_DATE, yd & 255, (yd >> 8) & 255, mo, dd);
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

    // Default: pass through literal byte
    out.push(b);
    i++;
  }
  return Uint8Array.from(out);
}

/* ---------------------------------------------------------------------------
 * DECODE
 * ------------------------------------------------------------------------- */
export function alephDecode(input: Uint8Array): Uint8Array {
  const out: number[] = [];
  let i = 0;
  const n = input.length;

  const emitIntStr = (value: number, expectedLen: number): void => {
    const s = String(value);
    if (s.length > expectedLen) {
      throw new Error(`aleph: integer value ${value} exceeds declared width ${expectedLen}`);
    }
    for (let k = s.length; k < expectedLen; k++) out.push(48); // '0' pad
    for (let k = 0; k < s.length; k++) out.push(s.charCodeAt(k));
  };

  while (i < n) {
    const b = input[i];
    if (b !== ALEPH_ESC) {
      out.push(b);
      i++;
      continue;
    }
    if (i + 1 >= n) throw new Error('aleph: truncated escape');
    const tag = input[i + 1];
    i += 2;
    switch (tag) {
      case TAG_ESC_LITERAL:
        out.push(ALEPH_ESC);
        break;
      case TAG_INT: {
        const v = decVarint(input, i);
        i = v.next;
        if (i >= n) throw new Error('aleph: truncated INT width');
        const width = input[i++];
        emitIntStr(v.value, width);
        break;
      }
      case TAG_DEC: {
        const v1 = decVarint(input, i);
        i = v1.next;
        if (i + 1 >= n) throw new Error('aleph: truncated DEC widths');
        const iLen = input[i++];
        const fLen = input[i++];
        const v2 = decVarint(input, i);
        i = v2.next;
        emitIntStr(v1.value, iLen);
        out.push(46); // '.'
        emitIntStr(v2.value, fLen);
        break;
      }
      case TAG_ISO_DT: {
        if (i + 8 > n) throw new Error('aleph: truncated ISO_DT');
        const yd = input[i] | (input[i + 1] << 8);
        const mo = input[i + 2];
        const dd = input[i + 3];
        const hh = input[i + 4];
        const mm = input[i + 5];
        const ss = input[i + 6];
        const zFlag = input[i + 7];
        i += 8;
        const year = yd + 2000;
        emitIntStr(year, 4);
        out.push(45);
        emitIntStr(mo, 2);
        out.push(45);
        emitIntStr(dd, 2);
        out.push(84); // 'T'
        emitIntStr(hh, 2);
        out.push(58);
        emitIntStr(mm, 2);
        out.push(58);
        emitIntStr(ss, 2);
        if (zFlag) out.push(90); // 'Z'
        break;
      }
      case TAG_ISO_DATE: {
        if (i + 4 > n) throw new Error('aleph: truncated ISO_DATE');
        const yd = input[i] | (input[i + 1] << 8);
        const mo = input[i + 2];
        const dd = input[i + 3];
        i += 4;
        emitIntStr(yd + 2000, 4);
        out.push(45);
        emitIntStr(mo, 2);
        out.push(45);
        emitIntStr(dd, 2);
        break;
      }
      case TAG_TIME_HMS: {
        if (i + 3 > n) throw new Error('aleph: truncated TIME_HMS');
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
        if (i + 2 > n) throw new Error('aleph: truncated TIME_HM');
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

/**
 * Diagnostic: counts of typed chunks found in `input`. Used by the UI to
 * explain why Aleph did or did not win on a given payload.
 */
export function alephAnalyze(input: Uint8Array): {
  intRuns: number;
  decRuns: number;
  isoDt: number;
  isoDate: number;
  timeHms: number;
  timeHm: number;
  escapes: number;
  rawBytes: number;
  encodedBytes: number;
} {
  let intRuns = 0, decRuns = 0, isoDt = 0, isoDate = 0, timeHms = 0, timeHm = 0, escapes = 0;
  let i = 0;
  const n = input.length;
  while (i < n) {
    const prev = i > 0 ? input[i - 1] : -1;
    const b = input[i];
    if (b === ALEPH_ESC) { escapes++; i++; continue; }
    const atBoundary = !(prev >= 0 && (isDigit(prev) || isLetter(prev) || prev === 46));
    if (atBoundary && isDigit(b)) {
      const dt = peekIsoDt(input, i); if (dt > 0) { isoDt++; i += dt; continue; }
      const dd = peekIsoDate(input, i); if (dd > 0) { isoDate++; i += dd; continue; }
      const hms = peekTimeHms(input, i); if (hms > 0) { timeHms++; i += hms; continue; }
      const hm = peekTimeHm(input, i); if (hm > 0) { timeHm++; i += hm; continue; }
      const dec = peekDecimal(input, i, prev); if (dec > 0) { decRuns++; i += dec; continue; }
      const li = peekLongInt(input, i, prev); if (li > 0) { intRuns++; i += li; continue; }
    }
    i++;
  }
  return { intRuns, decRuns, isoDt, isoDate, timeHms, timeHm, escapes, rawBytes: n, encodedBytes: alephEncode(input).length };
}
