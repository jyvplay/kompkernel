/**
 * CTXCOPY — copy from earlier text in the same chat, by anchors.
 *
 * Model: the reader has the earlier text C (the previous message(s) in this chat). The new text T is written as
 * literal characters, except that a span of T equal to a span of C is written as  ⟦a…b⟧  where
 *   - a = the first part of the span (length α), found as the first occurrence in C at or after the end of the
 *         previous copy (the cursor), and
 *   - b = the last part of the span (length β), found as the first occurrence in C at or after the end of a, and
 *   - the copied text is C from the start of a through the end of b, and the cursor moves to that end.
 * The encoder only emits a copy when simulating this decoder reproduces exactly the intended span.
 *
 * Forbidden characters in T: ⟦ ⟧ …  (a wire containing them is refused; the caller falls back to another codec).
 */

export const CTX_OPEN = '⟦';
export const CTX_CLOSE = '⟧';
export const CTX_ELLIPSIS = '…';

export interface CtxOptions {
  k?: number;          // k-gram length for candidate search
  minCopy?: number;    // minimum copied characters to emit a copy
  minAnchor?: number;  // minimum anchor length (α, β)
  unique?: boolean;    // require each anchor to occur exactly once in C (easier for a reader to locate)
}

export interface CtxResult {
  wire: string;
  copies: number;
  copiedChars: number;
}

export function ctxEncode(T: string, C: string, opts: CtxOptions = {}): CtxResult | null {
  const k = opts.k ?? 12;
  const minCopy = opts.minCopy ?? 60;
  const minAnchor = opts.minAnchor ?? 6;
  const unique = opts.unique ?? false;
  if (/[⟦⟧…]/.test(T) || /[⟦⟧…]/.test(C)) return null;

  // k-gram index over C (positions ascending).
  const index = new Map<string, number[]>();
  for (let j = 0; j + k <= C.length; j++) {
    const g = C.substr(j, k);
    const arr = index.get(g);
    if (arr) arr.push(j); else index.set(g, [j]);
  }

  let out = '';
  let cursor = 0;
  let copies = 0;
  let copiedChars = 0;
  let i = 0;
  while (i < T.length) {
    let best = { j: -1, L: 0 };
    if (i + k <= T.length) {
      const cands = index.get(T.substr(i, k));
      if (cands) {
        for (const j of cands) {
          if (j < cursor) continue;
          let L = 0;
          while (i + L < T.length && j + L < C.length && T[i + L] === C[j + L]) L++;
          if (L > best.L) best = { j, L };
        }
      }
    }
    if (best.L >= minCopy) {
      const r = emitCopy(T, C, i, best.j, best.L, cursor, minAnchor, unique);
      if (r) {
        out += CTX_OPEN + r.a + CTX_ELLIPSIS + r.b + CTX_CLOSE;
        cursor = best.j + best.L;
        i += best.L;
        copies++;
        copiedChars += best.L;
        continue;
      }
    }
    out += T[i];
    i++;
  }
  // Verify by simulation: the reader's procedure must reproduce T exactly.
  const back = ctxDecode(out, C);
  if (back !== T) return null;
  return { wire: out, copies, copiedChars };
}

function emitCopy(T: string, C: string, i: number, j: number, L: number, cursor: number, minAnchor: number, unique: boolean)
  : { a: string; b: string } | null {
  const once = (s: string) => C.indexOf(s) >= 0 && C.indexOf(s) === C.lastIndexOf(s);
  // α: smallest anchor length whose first occurrence at/after cursor is exactly j.
  let alpha = -1;
  for (let al = minAnchor; al <= L; al++) {
    const a = T.substr(i, al);
    if (C.indexOf(a, cursor) === j && (!unique || once(a))) { alpha = al; break; }
  }
  if (alpha < 0) return null;
  // β: smallest suffix length whose first occurrence at/after (j+alpha) ends exactly at j+L.
  let beta = -1;
  for (let be = minAnchor; be <= L - alpha; be++) {
    const b = T.substr(i + L - be, be);
    const at = C.indexOf(b, j + alpha);
    if (at >= 0 && at + be === j + L && (!unique || once(b))) { beta = be; break; }
  }
  if (beta < 0) return null;
  return { a: T.substr(i, alpha), b: T.substr(i + L - beta, beta) };
}

/** The reader's procedure. Returns null if any anchor fails. */
export function ctxDecode(wire: string, C: string): string | null {
  let out = '';
  let cursor = 0;
  let p = 0;
  while (p < wire.length) {
    const o = wire.indexOf(CTX_OPEN, p);
    if (o < 0) { out += wire.slice(p); break; }
    out += wire.slice(p, o);
    const c = wire.indexOf(CTX_CLOSE, o + 1);
    if (c < 0) return null;
    const body = wire.slice(o + CTX_OPEN.length, c);
    const e = body.indexOf(CTX_ELLIPSIS);
    if (e < 0) return null;
    const a = body.slice(0, e);
    const b = body.slice(e + CTX_ELLIPSIS.length);
    if (a.length === 0 || b.length === 0) return null;
    const start = C.indexOf(a, cursor);
    if (start < 0) return null;
    const bAt = C.indexOf(b, start + a.length);
    if (bAt < 0) return null;
    const end = bAt + b.length;
    out += C.slice(start, end);
    cursor = end;
    p = c + CTX_CLOSE.length;
  }
  return out;
}

/** Contract sentence the reader needs, only when copies are present. */
export const CTX_CONTRACT =
  'Text in ⟦a…b⟧ is copied from the earlier text in this chat: start at the first a after the previous copy, and copy through the next b.';
