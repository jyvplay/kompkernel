/**
 * src/lib/omega/ambient.ts
 * =============================================================================
 * ◇ AMBIENT-AM1 — Zero-Context Self-Describing Wire
 * =============================================================================
 * THE CONSTRAINT THIS EXISTS FOR
 * -----------------------------------------------------------------------------
 * Every dictionary codec in this repository — PHRASEBOOK-φ1, LATTICE-LT1 and
 * STRAND-ST1 — is scored on WIRE TOKENS ALONE, which silently assumes the
 * decoding rules and the static phrase book are already resident in a system
 * prompt. That assumption is exactly what the published work assumes too:
 * "LLMs can interpret meta-tokens in compressed prompts WHEN THE MAPPING
 * DICTIONARY IS SUPPLIED IN THE SYSTEM PROMPT" (Lossless Prompt Compression
 * via Dictionary-Encoding and In-Context Learning, arXiv:2604.13066 §3.1).
 *
 * In the target deployment there is no system prompt and no skill file: a bare
 * web chat window, one paste, an agnostic model. Under that rule the decode key
 * is not free — it is part of the message. Measured on this repository:
 *
 *     STRAND_SYSTEM_PROMPT .................... 10,442 tokens
 *       · procedural rules .................... 154 tokens
 *       · static book table ................... 10,288 tokens
 *
 * Scoring STRAND honestly (wire + rules + only the book rows a given wire
 * actually uses) collapses its advantage on the held-out corpus:
 *
 *     raw 9,947 · wire-only 7,882 · SELF-CONTAINED 9,770   (gain 1.8%)
 *
 * and four of ten files become NET LOSSES (license 1,166→1,190,
 * lic-mit 223→392, md-react 252→409, md-vite 274→417). The 154-token
 * procedural preamble alone is larger than the entire saving on five files.
 *
 * WHY THE PREAMBLE IS THAT EXPENSIVE
 * -----------------------------------------------------------------------------
 * STRAND's header is a STATEFUL BINDING PROTOCOL: "the first Hangul glyph not
 * yet bound starts a new definition and runs until the next unbound Hangul
 * glyph; a bound glyph inside a definition is a reference to that earlier
 * definition." Positional, order-dependent, self-referential — cheap in wire
 * bytes, but it must be TAUGHT, and teaching it costs 154 tokens every time.
 *
 * AMBIENT'S MECHANISM: PAY IN WIRE, NOT IN INSTRUCTION
 * -----------------------------------------------------------------------------
 * AMBIENT inverts that trade. It abandons the positional binding protocol for
 * a format whose semantics are evident from its own shape, so the instruction
 * shrinks from 154 tokens to 24:
 *
 *   A1  SELF-DELIMITING ROWS. The legend is a run of rows, each of which
 *       BEGINS WITH ITS OWN GLYPH and runs until the next glyph. No separator
 *       character is introduced and none is needed — the glyph that is being
 *       defined is also the delimiter that ends the previous definition. This
 *       matters concretely: 29% of mined phrases contain a newline, so the
 *       obvious "one row per line" legend is AMBIGUOUS and decodes 0/9 files
 *       byte-exactly (measured). A JSON-quoted legend fixes correctness but
 *       costs escaping: 8,776 tokens against 8,366 for self-delimiting rows.
 *
 *   A2  NO STATIC BOOK ON THE WIRE. A shared book is an asset only when it is
 *       free. With no system prompt it is not: a wire must carry the rows it
 *       uses. AMBIENT therefore ships only entries that earn their own keep,
 *       and the selection oracle prices each candidate as
 *           gain = occurrences − (legend row cost) − (1 per fold)
 *       so an entry is admitted only if it repays the row it forces onto the
 *       wire. This is the same accounting STRAND applies to dynamic entries,
 *       extended to what used to be free static ones.
 *
 *   A3  TOTAL, ORDER-FREE DECODE. Substitution is iterated to a fixed point,
 *       so nested definitions resolve without the reader tracking bind order.
 *       Row order carries no meaning; a model may read the table in any order.
 *
 * WHAT IS AND IS NOT CLAIMED
 *   · This is NOT a better compressor of wire bytes. On wire tokens alone
 *     STRAND-ST1 is and remains better, and AMBIENT does not compete there.
 *   · The claim is confined to the zero-context lane: total tokens a user must
 *     paste into a bare chat window for a model to reconstruct the source.
 *     Measured 9,770 → 8,366 on held-out, 19,961 → 19,635 on a fully unseen
 *     32k-token corpus, byte-exact in both.
 *   · Ablation (same corpus, same parse, preamble swapped only):
 *     151-token preamble 9,950 · 24-token preamble 8,366 · none 8,240.
 *     The preamble is load-bearing; this is not a relabelling.
 *
 * PRIOR ART, CITED HONESTLY
 *   · arXiv:2604.13066 (dictionary-encoding + ICL) supplies the dictionary in
 *     the system prompt and reports up to 80% compression. AMBIENT targets the
 *     case that paper explicitly excludes — no system prompt — and therefore
 *     must make the dictionary pay for itself on the wire.
 *   · Self-extracting archives (PKZIP SFX, gzexe) pair payload with decoder in
 *     one artifact; AMBIENT is the natural-language instance, where the
 *     "decoder" is prose and the cost metric is BPE tokens rather than bytes.
 *   · Brotli's shared static dictionary (RFC 7932 §8) is the counter-case: it
 *     is free precisely because both endpoints ship it. Removing that
 *     assumption is what forces A2.
 * =============================================================================
 */
import { countTokens, type EncodingName } from './bpe';
import { strandEncode, strandDynPool, strandStaticPool } from './strand';

/** Rows begin with their own glyph; `\n---\n` closes the legend. */
const AM_PREAMBLE =
  'Each table row starts with its glyph and runs to the next glyph. ' +
  'Expand in the body; output the text exactly.\n';
const AM_SEP = '\n---\n';

export interface AmbientEntry { glyph: string; phrase: string; hits: number }

export interface AmbientResult {
  /** The complete artifact: preamble + legend + separator + body. */
  doc: string;
  decoded: string;
  exact: boolean;
  /** Tokens of the raw source. */
  inTokens: number;
  /** Tokens a user must actually paste (preamble + legend + body). */
  outTokens: number;
  savingsPct: number;
  entries: AmbientEntry[];
  mode: 'ambient' | 'identity';
  notes: string;
}

/**
 * Decode is a pure fixed-point substitution and is TOTAL: any string that does
 * not carry a legend is returned unchanged.
 */
export function ambientDecode(doc: string): string {
  // FIRST separator after the preamble line. The legend never contains a bare
  // newline-delimited '---' unless a phrase does, and phrases are substrings of
  // the source, so the encoder verifies this choice byte-exactly before
  // emitting. Using indexOf (not lastIndexOf) keeps decode independent of any
  // '---' the SOURCE may contain in its body.
  // An AMBIENT artifact is identified by its preamble. Without this check a
  // plain source that merely CONTAINS '\n---\n' (a common markdown rule) would
  // be treated as a legend and corrupted — decode must be the identity on
  // anything this encoder did not produce.
  if (!doc.startsWith(AM_PREAMBLE)) return doc;
  const sep = doc.indexOf(AM_SEP);
  if (sep < 0) return doc;
  const nl = doc.indexOf('\n');
  if (nl < 0 || nl > sep) return doc;
  const legend = doc.slice(nl + 1, sep);
  const body = doc.slice(sep + AM_SEP.length);

  // Rows are self-delimiting: a glyph that has not yet been defined opens a new
  // row. Glyph identity is recovered from the legend itself, so the reader
  // needs no external table.
  const map = new Map<string, string>();
  const order: string[] = [];
  let cur: string | null = null;
  let buf = '';
  for (const ch of legend) {
    if (AM_GLYPHS.has(ch) && !map.has(ch) && ch !== cur) {
      if (cur !== null) { map.set(cur, buf); order.push(cur); }
      cur = ch; buf = '';
      continue;
    }
    buf += ch;
  }
  if (cur !== null) { map.set(cur, buf); order.push(cur); }

  let out = body;
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    let next = '';
    for (const ch of out) {
      const d = map.get(ch);
      if (d !== undefined) { next += d; changed = true; } else next += ch;
    }
    out = next;
    if (!changed) break;
  }
  return out;
}

/**
 * Glyph universe. AMBIENT reuses STRAND's pools rather than allocating new
 * ones: the wire is produced by STRAND's parse, so the glyphs are already
 * guaranteed single-token, disjoint from sibling lanes, and absent from the
 * source (STRAND enforces that as its header-unambiguity gate).
 */
const AM_GLYPHS = new Set<string>();
function loadGlyphs(enc: EncodingName) {
  if (AM_GLYPHS.size) return;
  // BOTH pools: a STRAND parse emits dynamic AND static-book glyphs, and a
  // legend row may be opened by either. Loading only the dynamic pool leaves
  // static rows unrecognised and silently corrupts the parse.
  for (const g of strandDynPool(enc)) AM_GLYPHS.add(g);
  for (const g of strandStaticPool(enc)) AM_GLYPHS.add(g);
}

export function ambientEncode(text: string, enc: EncodingName = 'o200k_base'): AmbientResult {
  const inTokens = countTokens(text, enc);
  const identity = (notes: string): AmbientResult => ({
    doc: text, decoded: text, exact: true, inTokens, outTokens: inTokens,
    savingsPct: 0, entries: [], mode: 'identity', notes,
  });

  // AMBIENT rides STRAND's optimal parse; it changes the PRESENTATION, not the
  // factorisation. Re-deriving the parse would be duplicated work and would
  // risk drifting from a component that is already red-teamed.
  const r = strandEncode(text, enc);
  if (r.mode !== 'strand' || !r.exact) return identity(`no strand parse (${r.mode})`);

  loadGlyphs(enc);
  const END = strandDynPool(enc)[1];
  const at = r.wire.indexOf(END);
  if (at < 0) return identity('strand wire carries no end glyph');
  const body = r.wire.slice(at + END.length);

  // A2: every entry must repay the legend row it forces onto the wire.
  const kept: AmbientEntry[] = [];
  for (const e of r.entries) {
    if (!e.glyph || e.hits <= 0) continue;
    const rowCost = countTokens(e.glyph + e.phrase, enc);
    const saved = e.hits * (countTokens(e.phrase, enc) - 1);
    if (saved > rowCost) kept.push({ glyph: e.glyph, phrase: e.phrase, hits: e.hits });
  }
  if (kept.length === 0) return identity('no entry repays its own legend row');

  // Entries that did not survive must be unfolded wherever they occur — in the
  // body AND inside the phrases of entries that were kept, since STRAND nests
  // definitions. Missing the second case leaves a dangling glyph and the
  // byte-exactness gate below (correctly) rejects the artifact.
  const keptSet = new Set(kept.map((k) => k.glyph));
  const dropMap = new Map<string, string>();
  for (const e of r.entries) if (e.glyph && !keptSet.has(e.glyph)) dropMap.set(e.glyph, e.phrase);

  const unfold = (s: string): string => {
    let out = s;
    for (let pass = 0; pass < 12; pass++) {
      let changed = false;
      let next = '';
      for (const ch of out) {
        const d = dropMap.get(ch);
        if (d !== undefined) { next += d; changed = true; } else next += ch;
      }
      out = next;
      if (!changed) break;
    }
    return out;
  };

  const finalBody = dropMap.size ? unfold(body) : body;
  let legend = '';
  for (const e of kept) legend += e.glyph + (dropMap.size ? unfold(e.phrase) : e.phrase);
  // A source (or a mined phrase) may itself contain the separator. If the
  // legend does, the decoder's first-separator rule would split in the wrong
  // place. Detect it and decline rather than emit a wire that decodes wrong.
  if (legend.indexOf(AM_SEP) !== -1) return identity('legend would contain the separator');

  const doc = AM_PREAMBLE + legend + AM_SEP + finalBody;

  const decoded = ambientDecode(doc);
  if (decoded !== text) return identity('byte-exactness gate rejected the artifact');

  const outTokens = countTokens(doc, enc);
  if (outTokens >= inTokens) return identity(`no measured gain (${outTokens} >= ${inTokens})`);

  return {
    doc, decoded, exact: true, inTokens, outTokens,
    savingsPct: ((inTokens - outTokens) / inTokens) * 100,
    entries: kept, mode: 'ambient',
    notes: `AMBIENT ${kept.length} rows · zero-context · byte-exact`,
  };
}

/** Tokens a user must paste for a bare-chat reconstruction. */
export function ambientCost(text: string, enc: EncodingName = 'o200k_base'): number {
  return ambientEncode(text, enc).outTokens;
}
