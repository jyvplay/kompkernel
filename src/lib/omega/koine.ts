/**
 * src/lib/omega/koine.ts
 * =============================================================================
 * KOINE-K1 — shared-prefix field folding against the line above.
 * (exact, byte-perfect, self-verified before emission; identity unless it pays)
 *
 * GAP IT FILLS
 *   DITTO-F1 (ditto.ts) replaces a field only when it is EXACTLY the same field of the
 *   line above. Real records repeat a long PREFIX and change only the tail:
 *     2026-09-30T07:59:52.6403938810   vs   2026-09-30T07:59:52.6923941430
 *     2026-09-30 08:00:03.676449622    vs   2026-09-30 07:59:58.120981240
 *   KOINE-K1 writes the shared prefix as a count and keeps only the differing tail.
 *
 * LINE MODEL
 *   A line is split into maximal runs of non-space characters ("fields") and runs of
 *   whitespace. Whitespace is never changed. Field j of a line is compared with field j
 *   of the line above (the ORIGINAL, already-decoded text of that line).
 *
 * WIRE
 *   line 1: the rule line (KOINE_HEADER), then the body.
 *   a field f with reference r (field j of the line above) is written as
 *       "&k:" + f.slice(k)      where k = longest common prefix of f and r, k >= KOINE_MIN_K
 *   a field f that begins with '&' and is not written as above is written as "&:" + f
 *   every other field is written unchanged.
 *   The first line has no reference, so it is never folded.
 *
 * GATE (all must hold, else identity)
 *   G1  decode(wire) === input (exact, checked in code before emission)
 *   G2  tokens(wire including the rule line) < tokens(input)
 * Identity escape: if the input begins with the rule line or the identity escape, the wire is
 * prefixed with KOINE_ESC so the decoder never misreads it.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';

export const KOINE_HEADER =
  'KOINE-K1: a field "&k:r" = the first k characters of the same-numbered field on the line above, then r; "&:x" = the literal field x; fields are runs of non-space characters, whitespace is copied unchanged; the first line has no reference';
export const KOINE_ESC = 'KOINE-K1: identity';
export const KOINE_MIN_K = 8;

/** Split a line into alternating [field, ws, field, ws, ...] parts (even indexes = fields, may be ''). */
function splitLine(line: string): string[] {
  return line.split(/(\s+)/);
}

function lcp(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
}

export function koineEncodeBody(text: string, enc: EncodingName = 'o200k_base', minK = KOINE_MIN_K): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let prev: string[] | null = null;
  for (const line of lines) {
    const parts = splitLine(line);
    const fields: string[] = [];
    const foldable: { p: number; j: number; ref: string }[] = [];
    let j = 0;
    for (let p = 0; p < parts.length; p += 2) {
      const f = parts[p];
      if (f === '') continue;
      fields.push(f);
      if (prev !== null && j < prev.length && lcp(f, prev[j]) >= minK) {
        foldable.push({ p, j, ref: prev[j] });
      }
      parts[p] = f.startsWith('&') ? '&:' + f : f; // literal form (default)
      j++;
    }
    // Per-line greedy: a field is folded only if it lowers the token count of the whole line
    // (the reader sees the whole line in context, so a per-field o200k cost in isolation is not enough).
    let cur = parts.join('');
    let curTok = countTokens(cur, enc);
    for (const c of foldable) {
      const f = parts[c.p];
      const k = lcp(fields[c.j], c.ref);
      const trial = parts.slice();
      trial[c.p] = '&' + k + ':' + fields[c.j].slice(k);
      const s2 = trial.join('');
      const t2 = countTokens(s2, enc);
      if (t2 < curTok) { parts[c.p] = trial[c.p]; cur = s2; curTok = t2; }
      void f;
    }
    out.push(cur);
    prev = fields;
  }
  return out.join('\n');
}

export function koineDecodeBody(body: string): string {
  const lines = body.split('\n');
  const out: string[] = [];
  let prev: string[] | null = null;
  for (const wl of lines) {
    const parts = splitLine(wl);
    const fields: string[] = [];
    let j = 0;
    for (let p = 0; p < parts.length; p += 2) {
      const w = parts[p];
      if (w === '') continue;
      let f: string;
      if (w.startsWith('&')) {
        const m = /^&(\d*):/.exec(w);
        if (!m) throw new Error('KOINE: malformed field ' + JSON.stringify(w));
        if (m[1] === '') {
          f = w.slice(2);
        } else {
          if (prev === null || j >= prev.length) throw new Error('KOINE: field without reference');
          const k = parseInt(m[1], 10);
          const r = prev[j];
          if (k > r.length) throw new Error('KOINE: prefix longer than reference');
          f = r.slice(0, k) + w.slice(m[0].length);
        }
      } else {
        f = w;
      }
      parts[p] = f;
      fields.push(f);
      j++;
    }
    out.push(parts.join(''));
    prev = fields;
  }
  return out.join('\n');
}

/** identity form of a body: escaped only if a KOINE decoder would otherwise read it as a KOINE wire */
export function koineIdentityWire(text: string): string {
  return text.startsWith(KOINE_HEADER + '\n') || text.startsWith(KOINE_ESC + '\n') ? KOINE_ESC + '\n' + text : text;
}

export function koineDecode(wire: string): string {
  if (wire.startsWith(KOINE_ESC + '\n')) return wire.slice(KOINE_ESC.length + 1);
  const head = KOINE_HEADER + '\n';
  if (!wire.startsWith(head)) return wire;
  return koineDecodeBody(wire.slice(head.length));
}

export interface KoineResult {
  wire: string;
  decoded: string;
  exact: boolean;
  mode: 'koine' | 'identity';
  inTokens: number;
  outTokens: number;
  folded: number; // number of fields written as prefix references
}

export function koineEncode(text: string, enc: EncodingName = 'o200k_base', minK = KOINE_MIN_K): KoineResult {
  const inTokens = countTokens(text, enc);
  const body = koineEncodeBody(text, enc, minK);
  const wire = KOINE_HEADER + '\n' + body;
  const folded = (body.match(/(^|[ \t\r\n])&\d+:/g) ?? []).length;
  let decoded = '';
  let ok = false;
  try {
    decoded = koineDecode(wire);
    ok = decoded === text;
  } catch {
    ok = false;
  }
  const outTokens = ok ? countTokens(wire, enc) : Infinity;
  if (!ok || outTokens >= inTokens) {
    const idWire = koineIdentityWire(text);
    const idTok = idWire === text ? inTokens : countTokens(idWire, enc);
    return { wire: idWire, decoded: text, exact: true, mode: 'identity', inTokens, outTokens: idTok, folded: 0 };
  }
  return { wire, decoded, exact: true, mode: 'koine', inTokens, outTokens, folded };
}
