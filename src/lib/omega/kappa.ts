/**
 * src/lib/omega/kappa.ts
 * =============================================================================
 * KAPPA-κ1 — inline-bind token macros (lossless, deterministic, prompt-decoded)
 *
 * GROUNDING. Three published results shape the mechanism:
 *   1. LTSC — "Lossless Token Sequence Compression via Meta-Tokens"
 *      (arXiv 2506.00307, 2025): replacing a token subsequence of length ℓ
 *      that occurs f ≥ 2 times with ONE meta-token per occurrence plus one
 *      dictionary entry is profitable exactly when ℓ·f > ℓ + f — the
 *      dictionary may live in the prompt.
 *   2. XRAGLog — "Lossless Prompt Compression via Dictionary-Encoding and
 *      In-Context Learning" (arXiv 2604.13066, 2026): LLMs correctly
 *      interpret meta-tokens when the mapping is supplied in the system
 *      prompt; no fine-tuning, analysis works directly on the encoded form.
 *   3. MR-RePair — "Practical Grammar Compression Based on Maximal Repeats"
 *      (Furuya et al., Algorithms 13(4):103, 2020; optimality for Fibonacci
 *      words, CPM 2022): one-time substitution of the most frequent MAXIMAL
 *      repeats constructs smaller grammars than iterated pair substitution.
 *
 * WHAT IS NEW HERE (not in any repo codec, not in the papers): the
 * dictionary is not a header and not the system prompt — it is bound INLINE
 * AT FIRST USE inside the wire, with single-token kana glyph pairs drawn
 * from a window disjoint from the source (the ROSETTA discipline: no
 * escapes, no sentinel collisions). Decode is a single left-to-right pass:
 * when the decoder first meets glyph pair O_j…O_j the enclosed span is that
 * macro's definition; every later bare U_j expands to it. Nesting is
 * forbidden in v1 (definitions are raw source, so they contain no glyphs).
 *
 * WIRE FORMAT
 *   κ\n<pool[w]>\n<body>
 *     pool[w]      — window-base glyph; macro j uses
 *                    O_j = pool[w+1+2j] (definition delimiters) and
 *                    U_j = pool[w+2+2j] (use site).
 *     body         — the source with chosen regions folded:
 *                    first occurrence  → O_j <definition> O_j
 *                    later occurrences → U_j
 *
 * GATES (runtime honesty, same family as ROSETTA's)
 *   G1  every admitted macro must be a measured token win
 *   G2  kappaDecode(wire) === source, byte-exact
 *   G3  countTokens(wire) < inTokens, else identity is returned
 * =============================================================================
 */

import { countTokens, tokenStrings, type EncodingName } from './bpe';
import { rosettaPool } from './rosetta';

export const KAPPA_SENTINEL = 'κ\n';
/** Hole marker for parameterized macros (v2): must never occur in source. */
export const KAPPA_HOLE = '⋄';

const MAX_MACROS = 24;
const MAX_NGRAM = 64;

export interface KappaResult {
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  savingsPct: number;
  applied: boolean;
  macros: number;
  notes: string;
}

/* ------------------------------ window ----------------------------------- */

/**
 * Pick w such that pool[w .. w+size) are all absent from `text` (and the
 * hole marker is absent too). Returns the index or null.
 */
export function kappaWindow(
  text: string,
  enc: EncodingName,
  size: number,
  allowHole = false,
): number | null {
  const pool = rosettaPool(enc);
  if (pool.length < size) return null;
  // A literal ⋄ in the source would counterfeit a macro hole inside a
  // definition, so the macro path forbids it. The macro-less forced header
  // has no bindings at all — a bare ⋄ is inert there — so it may pass.
  if (!allowHole && text.includes(KAPPA_HOLE)) return null;
  const src = new Set<string>();
  for (const ch of text) src.add(ch);
  const limit = pool.length - size;
  for (let k = 0; k <= limit; k++) {
    let clear = true;
    for (let j = 0; j < size; j++) {
      if (src.has(pool[k + j])) { clear = false; break; }
    }
    if (clear) return k;
  }
  return null;
}

/* ------------------------------ decode ----------------------------------- */

/**
 * Expand macro bindings in `body` left to right. `base` is the index of the
 * window-base glyph in the pool: O_j = pool[base+1+2j], U_j = pool[base+2+2j].
 * Parameterized macros are not produced by v1 but the decoder understands
 * `U_j arg U_j` with ⋄-holed definitions, so the wire format is forward-
 * compatible.
 */
export function kappaExpand(body: string, base: number, enc: EncodingName): string {
  const pool = rosettaPool(enc);
  const indexOfGlyph = new Map<string, number>();
  for (let i = 0; i < pool.length; i++) indexOfGlyph.set(pool[i], i);
  // The window covers 1 + 2*MAX_MACROS glyphs starting at `base`, ALL of
  // which are disjoint from the source by construction — so any body
  // character landing in [base, base+ZONE) is a macro glyph, and any pool
  // glyph outside the zone is a literal source character.
  const ZONE = 1 + 2 * MAX_MACROS;
  const def: (string | null)[] = []; // expanded definition per macro j
  const arity: number[] = [];  // 0 or 1 (⋄ holes)
  let out = '';
  let i = 0;
  const n = body.length;
  while (i < n) {
    const c = body[i];
    const idx = indexOfGlyph.get(c) ?? -1;
    if (idx >= base && idx < base + ZONE) {
      const off = idx - base; // 1..2*MAX_MACROS
      const j = (off - 1) >> 1;
      const isOpen = off % 2 === 1; // odd offsets are O_j, even are U_j
      if (isOpen) {
        // binding: O_j <definition> O_j — the definition may contain any
        // characters except O_j itself (guaranteed by construction).
        const close = pool[base + 1 + 2 * j];
        const end = body.indexOf(close, i + 1);
        if (end < 0) return body; // malformed → literal passthrough (G2 fails upstream)
        const rawDef = kappaExpand(body.slice(i + 1, end), base, enc);
        const holes = rawDef.split(KAPPA_HOLE).length - 1;
        while (def.length <= j) { def.push(null); arity.push(0); }
        def[j] = rawDef;
        arity[j] = holes > 0 ? 1 : 0;
        // Exact macro: the binding site IS the first occurrence (def text
        // stands in the output). Parameterized macro: the definition binds
        // silently — the encoder always follows it with the binding
        // occurrence's own use (U_j arg U_j), which expands in place.
        if (holes === 0) out += rawDef;
        i = end + 1;
        continue;
      }
      // use site
      while (def.length <= j) { def.push(null); arity.push(0); }
      const d = def[j];
      if (d == null) { out += c; i++; continue; } // unbound → literal
      if (arity[j] === 1) {
        const end = body.indexOf(c, i + 1);
        if (end < 0) return body;
        const arg = kappaExpand(body.slice(i + 1, end), base, enc);
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

/** Decode a KAPPA wire ('κ\n<base-glyph>\n<body>'). */
export function kappaDecode(wire: string, enc: EncodingName = 'o200k_base'): string {
  if (!wire.startsWith(KAPPA_SENTINEL)) return wire;
  const rest = wire.slice(KAPPA_SENTINEL.length);
  const nl = rest.indexOf('\n');
  if (nl < 0) return wire;
  const baseGlyph = rest.slice(0, nl);
  const pool = rosettaPool(enc);
  const base = pool.indexOf(baseGlyph);
  if (base < 0) return wire;
  return kappaExpand(rest.slice(nl + 1), base, enc);
}

/* ------------------------------ encode ----------------------------------- */

/**
 * A macro family: a token pattern of length `len` with a set of HOLE
 * offsets. Every occurrence matches the pattern tokens outside the holes
 * and carries ONE filler token that fills all its own holes (the way the
 * same loop variable `i` fills every position in `for(let i=0;i<3;i++){...}`).
 * holes = [] is the exact-repeat special case.
 */
export interface KappaFamily {
  len: number;
  holes: number[];        // hole offsets (token positions)
  holePrefixes: string[]; // fixed non-identifier prefix kept in the def per hole
  starts: number[];       // occurrence starts (token indices); starts[0] binds
  fillers: string[];      // the VARIABLE text per occurrence ("" for exact)
  saving: number;
}

/**
 * Split a token text into (non-identifier prefix, identifier-ish remainder):
 * ' i' → (' ', 'i'), ';i' → (';', 'i'), '7' → ('', '7'), '.\n' → ('.', '\n').
 */
function splitVar(s: string): [string, string] {
  let i = 0;
  while (i < s.length && !/[A-Za-z0-9_]/.test(s[i])) i++;
  return [s.slice(0, i), s.slice(i)];
}

const MAX_HOLES = 4;
const MIN_MATCHED = 3;    // non-hole matched tokens for a family to count
const ANCHOR_CAP = 64;    // positions per anchor token id

/**
 * Anchor-based parameterized matcher: for every token id, compare pairs of
 * its positions with a longest-common-extension walk that may step over
 * single-token holes when the filler is consistent within each occurrence
 * (parameterized matching in the sense of Baker's p-matching; here the
 * "variables" are single tokens and must be identical across a given
 * occurrence's holes). Families are then extended with further positions of
 * the anchor and scored with measured token costs.
 */
function findFamilies(
  toks: { id: number; s: string }[],
  enc: EncodingName,
  cost: (s: string) => number,
): KappaFamily[] {
  const n = toks.length;
  const ids = toks.map((t) => t.id);
  const byId = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const arr = byId.get(ids[i]);
    if (arr) { if (arr.length < ANCHOR_CAP) arr.push(i); } else byId.set(ids[i], [i]);
  }
  const out: KappaFamily[] = [];
  const seenSpan = new Set<string>();

  for (const [, positions] of byId) {
    if (positions.length < 2) continue;
    for (let x = 0; x < positions.length; x++) {
      for (let y = x + 1; y < positions.length; y++) {
        const a = positions[x];
        const b = positions[y];
        // LCE walk with prefix-stable holes
        const holes: number[] = [];
        const holePrefixes: string[] = [];
        let varA = '';
        let varB = '';
        let d = 0;
        while (d < MAX_NGRAM && a + d < n && b + d < n) {
          const ta = ids[a + d];
          const tb = ids[b + d];
          if (ta === tb) { d++; continue; }
          if (holes.length >= MAX_HOLES) break;
          const fa = toks[a + d].s;
          const fb = toks[b + d].s;
          // common non-identifier prefix, then differing variables
          let p = 0;
          while (p < fa.length && p < fb.length && fa[p] === fb[p] && !/[A-Za-z0-9_]/.test(fa[p])) p++;
          const va = fa.slice(p);
          const vb = fb.slice(p);
          if (va === '' || vb === '' || va === vb) break; // not a parameter
          if (holes.length > 0 && (va !== varA || vb !== varB)) break; // inconsistent
          holes.push(d);
          holePrefixes.push(fa.slice(0, p));
          varA = va;
          varB = vb;
          d++;
        }
        if (d < 2) continue;
        const matched = d - holes.length;
        if (matched < MIN_MATCHED) continue;
        // extend the pair to all anchor positions that match the pattern
        const starts: number[] = [];
        const fillers: string[] = [];
        for (const c of positions) {
          let cv = '';
          let ok = true;
          for (let e = 0; e < d; e++) {
            const hi = holes.indexOf(e);
            if (hi >= 0) {
              const f = toks[c + e]?.s ?? '';
              if (!f.startsWith(holePrefixes[hi])) { ok = false; break; }
              const v = f.slice(holePrefixes[hi].length);
              if (v === '') { ok = false; break; }
              if (cv === '') cv = v; else if (cv !== v) { ok = false; break; }
            } else if (ids[c + e] !== ids[a + e]) { ok = false; break; }
          }
          if (ok) {
            starts.push(c);
            fillers.push(cv);
          }
        }
        if (starts.length < 2) continue;
        if (holes.length > 0) {
          // require genuine variety: at least two distinct variables
          if (new Set(fillers).size < 2) continue;
        }
        // profit with measured costs
        const defText = patternText(toks, a, d, holes, holePrefixes);
        const defCost = cost(defText);
        let saving: number;
        if (holes.length === 0) {
          // binding replaces occurrence 0 (defCost+2 tokens), later ones cost 1
          saving = starts.length * d - (defCost + 2) - (starts.length - 1);
        } else {
          // binding emits def + its own use; every occurrence costs U+var+U
          const occCost = 2 + cost(fillers[0]);
          saving = starts.length * d - (defCost + 2) - starts.length * occCost;
        }
        if (saving <= 0) continue;
        const key = a + ':' + d + ':' + holes.join('.');
        if (seenSpan.has(key)) continue;
        seenSpan.add(key);
        out.push({ len: d, holes, holePrefixes, starts, fillers, saving });
      }
    }
  }
  out.sort((p, q) => q.saving - p.saving || q.len - p.len);
  return out;
}

/**
 * Byte-level occurrence verification: the decode contract is textual, so
 * every occurrence's source slice must equal the definition with the
 * occurrence's filler substituted. Id-level matching makes this near-certain
 * but never assumed (G1 discipline: prove, don't hope).
 */
function verifyFamilies(
  text: string,
  toks: { s: string }[],
  fams: KappaFamily[],
): KappaFamily[] {
  const off: number[] = [];
  let p = 0;
  for (const t of toks) { off.push(p); p += t.s.length; }
  const spanLen = (from: number, len: number) => {
    let L = 0;
    for (let i = from; i < from + len; i++) L += toks[i].s.length;
    return L;
  };
  const ok: KappaFamily[] = [];
  for (const f of fams) {
    const def = patternText(toks, f.starts[0], f.len, f.holes, f.holePrefixes);
    const starts: number[] = [];
    const fillers: string[] = [];
    for (let k = 0; k < f.starts.length; k++) {
      const st = f.starts[k];
      const expected = f.holes.length === 0 ? def : def.split(KAPPA_HOLE).join(f.fillers[k]);
      const actual = text.slice(off[st], off[st] + spanLen(st, f.len));
      if (expected === actual) { starts.push(st); fillers.push(f.fillers[k]); }
    }
    if (starts.length >= 2 && (f.holes.length === 0 || new Set(fillers).size >= 2)) {
      ok.push({ ...f, starts, fillers });
    }
  }
  return ok;
}

/** The definition text: hole positions keep their prefix and hold ⋄. */
function patternText(
  toks: { s: string }[],
  start: number,
  len: number,
  holes: number[],
  holePrefixes: string[],
): string {
  let out = '';
  for (let e = 0; e < len; e++) {
    const hi = holes.indexOf(e);
    out += hi >= 0 ? holePrefixes[hi] + KAPPA_HOLE : toks[start + e].s;
  }
  return out;
}

/**
 * Greedy family selection: families by measured saving, non-overlapping
 * (a token position may belong to at most one macro region).
 */
function selectFamilies(
  fams: KappaFamily[],
  toks: { s: string }[],
  enc: EncodingName,
  cost: (s: string) => number,
): KappaFamily[] {
  const nTokens = toks.length;
  const used = new Array<boolean>(nTokens).fill(false);
  const chosen: KappaFamily[] = [];
  for (const f of fams) {
    if (chosen.length >= MAX_MACROS) break;
    const starts: number[] = [];
    const fillers: string[] = [];
    for (let k = 0; k < f.starts.length; k++) {
      const p = f.starts[k];
      let free = true;
      for (let j = p; j < p + f.len; j++) if (used[j]) { free = false; break; }
      if (!free) continue;
      starts.push(p);
      fillers.push(f.fillers[k]);
    }
    if (starts.length < 2) continue;
    // Recompute the saving EXACTLY for the surviving non-overlapping set —
    // the discovery estimate does not scale with the survivor count.
    const defText = patternText(toks, starts[0], f.len, f.holes, f.holePrefixes);
    const defCost = cost(defText);
    const occCost = f.holes.length === 0 ? 1 : 2 + cost(fillers[0]);
    const original = starts.length * f.len;
    const wireCost = f.holes.length === 0
      ? defCost + 2 + (starts.length - 1)
      : defCost + 2 + starts.length * occCost;
    const saving = original - wireCost;
    if (saving <= 0) continue;
    for (const p of starts) for (let j = p; j < p + f.len; j++) used[j] = true;
    chosen.push({ ...f, starts, fillers, saving });
    void enc;
  }
  return chosen;
}

/** Assemble the folded body. Returns null when nothing was folded. */
function fold(
  text: string,
  toks: { id: number; s: string }[],
  fams: KappaFamily[],
  enc: EncodingName,
): string | null {
  if (fams.length === 0) return null;
  // token start offsets in text
  const off: number[] = [];
  let p = 0;
  for (const t of toks) { off.push(p); p += t.s.length; }
  // occurrence start token -> {family index, bind}
  const occ = new Map<number, { m: number; bind: boolean }>();
  fams.forEach((f, fi) => f.starts.forEach((st, si) => occ.set(st, { m: fi, bind: si === 0 })));
  const pool = rosettaPool(enc);
  // The window ALWAYS covers the full macro zone: disjointness over the
  // whole zone is what makes the decoder's glyph test unambiguous.
  const w = kappaWindow(text, enc, 1 + 2 * MAX_MACROS);
  if (w == null) return null;
  let out = '';
  let i = 0; // token index
  while (i < toks.length) {
    const hit = occ.get(i);
    if (hit) {
      const f = fams[hit.m];
      const O = pool[w + 1 + 2 * hit.m];
      const U = pool[w + 2 + 2 * hit.m];
      if (hit.bind) {
        const defText = patternText(toks, f.starts[0], f.len, f.holes, f.holePrefixes);
        if (f.holes.length === 0) {
          out += O + defText + O;
        } else {
          // The binding site emits the ⋄-holed definition AND its own use
          // (the decoder binds the macro, then immediately applies it with
          // this occurrence's filler — one construct per glyph pair).
          out += O + defText + O + U + f.fillers[0] + U;
        }
      } else if (f.holes.length === 0) {
        out += U;
      } else {
        out += U + f.fillers[f.starts.indexOf(i)] + U;
      }
      i += f.len; // advance past THIS occurrence (never backwards)
      continue;
    }
    out += toks[i].s;
    i++;
  }
  return out;
}

export function kappaEncode(text: string, enc: EncodingName = 'o200k_base'): KappaResult {
  const inTokens = countTokens(text, enc);
  const base: KappaResult = {
    wire: text,
    decoded: text,
    exact: true,
    inTokens,
    outTokens: inTokens,
    savingsPct: 0,
    applied: false,
    macros: 0,
    notes: 'identity (no profitable macros)',
  };
  if (!text || text.length > 12_000) return base;
  const measure = text.length <= 12_000;
  const costCache = new Map<string, number>();
  const cost = (s: string) => {
    if (!measure) return s.length >> 2;
    let hit = costCache.get(s);
    if (hit === undefined) {
      hit = countTokens(s, enc);
      costCache.set(s, hit);
    }
    return hit;
  };

  // A source that itself starts with the κ sentinel would be misread by
  // kappaDecode on the identity path: bind it under a macro-less header
  // (forced header, the same discipline as ROSETTA's G5 wrap).
  if (text.startsWith(KAPPA_SENTINEL)) {
    const wk = kappaWindow(text, enc, 1 + 2 * MAX_MACROS, true);
    if (wk != null) {
      const wrapped = KAPPA_SENTINEL + rosettaPool(enc)[wk] + '\n' + text;
      if (kappaDecode(wrapped, enc) === text) {
        const outTokens = countTokens(wrapped, enc);
        return {
          wire: wrapped,
          decoded: text,
          exact: true,
          inTokens,
          outTokens,
          savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
          applied: false,
          macros: 0,
          notes: 'forced header: source is κ-sentinel-ambiguous (safety lane)',
        };
      }
    }
    return { ...base, notes: 'sentinel-ambiguous source; no safe window (decode caveat)' };
  }

  const toks = tokenStrings(text, enc);
  const fams = selectFamilies(verifyFamilies(text, toks, findFamilies(toks, enc, cost)), toks, enc, cost);
  if (fams.length === 0) return base;

  const body = fold(text, toks, fams, enc);
  if (body == null) return base;

  // window base glyph for the wire header
  const w = kappaWindow(text, enc, 1 + 2 * MAX_MACROS);
  if (w == null) return base;
  const pool = rosettaPool(enc);
  const wire = KAPPA_SENTINEL + pool[w] + '\n' + body;

  // G2: byte-exact decode; G3: measured strict win.
  const back = kappaDecode(wire, enc);
  const outTokens = countTokens(wire, enc);
  if (back !== text || outTokens >= inTokens) {
    if (typeof process !== 'undefined' && (process as { env?: Record<string, string> }).env?.KAPPA_DEBUG) {
      console.error('[kappa] rejected: G2=' + (back !== text) + ' G3=' + (outTokens >= inTokens) +
        ' out=' + outTokens + ' in=' + inTokens + ' fams=' + fams.map((f) => `len${f.len}h${f.holes.length}x${f.starts.length}(+${f.saving})`).join(','));
      if (back !== text) {
        let d = 0; while (d < Math.min(back.length, text.length) && back[d] === text[d]) d++;
        console.error('[kappa] G2 divergence @' + d + ' expected ' + JSON.stringify(text.slice(d, d + 50)) + ' got ' + JSON.stringify(back.slice(d, d + 50)));
      }
    }
    return { ...base, notes: 'gates: candidate rejected (G2/G3)' };
  }
  return {
    wire,
    decoded: back,
    exact: true,
    inTokens,
    outTokens,
    savingsPct: inTokens ? ((inTokens - outTokens) / inTokens) * 100 : 0,
    applied: true,
    macros: fams.length,
    notes: `KAPPA macros=${fams.length} (inline-bound, parameterized) · byte-exact`,
  };
}

/* ------------------------------ decoder prompt ---------------------------- */

export function kappaDecoderPrompt(): string {
  return [
    '# κ KAPPA-κ1 — inline-bind token macros (byte-exact)',
    'A KAPPA message is: the character κ, a newline, a base glyph, a newline,',
    'then the body.',
    'The base glyph is pool[w] of the KAPPA pool (version-stable, single-',
    'token kana/CJK glyphs; reference: rosettaPool in src/lib/omega/kappa.ts).',
    'For macro j: O_j = pool[w+1+2j] (definition glyph) and',
    'U_j = pool[w+2+2j] (use glyph).',
    'Decode the body left to right in ONE pass:',
    '1. O_j … O_j (first sight): the enclosed span is macro j\'s definition.',
    '   It expands in place. Remember it.',
    '2. U_j alone: emit macro j\'s definition (already bound).',
    '3. U_j arg U_j with a ⋄-holed definition: emit the definition with every',
    '   ⋄ replaced by arg. A parameterized binding is immediately followed by',
    '   its own use (O_j def O_j U_j arg U_j), so it expands in place too.',
    '4. Every other character is literal.',
    'Definitions never contain O/U glyphs and never nest. Reconstruction is',
    'byte-exact; nothing was summarised or dropped.',
  ].join('\n');
}

export const KAPPA_SYSTEM_PROMPT = kappaDecoderPrompt();
