/**
 * src/lib/omega/stichos.ts
 * =============================================================================
 * STICHOS — the verse-line fold: a hard-wrapped paragraph is layout, not content.
 * (στίχος — a line of verse; the line break is the only thing it adds.)
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * Every codec in the stack treats a line break as a symbol to be copied,
 * dictionary-coded or tokenised. But a paragraph hard-wrapped by a greedy filler
 * at column W carries no information beyond its words and W: every break is a
 * deterministic function of (words, W). The wire can drop those interior breaks
 * and a 42-token contract tells the reader to refill greedily at W. Measured:
 * each dropped "\n" saves about one o200k token ("a\nb" = 3 tok, "a b" = 2 tok).
 *
 * WIRE (3-line header, then the blank-line-separated blocks, unchanged)
 * -----------------------------------------------------------------------------
 *   STICHOS\n<W>\n<M>\n<block>\n\n<block>…
 *
 *   The text is split into blocks at blank lines ("\n\n").
 *   · a block that is exactly the greedy fill of its own words at W is written
 *     as M + (its lines joined by single spaces);
 *   · every other block is written BYTE-IDENTICAL (code, lists, titles, ragged
 *     text). Nothing inside a literal block is touched, so no token that raw
 *     text enjoys (e.g. "\n  " indent, "\n- ") is ever broken up.
 *   M is a glyph absent from the text, cheap-first, excluding CHIRON's operators
 *   (§ ¶ × …) so the two layers cannot collide.
 *
 * DECODER (total)
 *   split the body at "\n\n"; a block starting with M → greedyFill(block[1:].split(' '), W)
 *   joined by "\n"; any other block is returned unchanged; blocks joined by "\n\n".
 *
 * ARMS (the codec is a minimum over a set that contains identity)
 *   raw · CHIRON alone · STICHOS · STICHOS→CHIRON (CHIRON applied to the STICHOS wire).
 *   Every non-raw winner must pass the final decode gate stichosStackDecode(wire)===text.
 *
 * EXACTNESS (honest)
 * -----------------------------------------------------------------------------
 * The encoder never trusts the rule. Every candidate wire is run through the
 * real decoder and kept only if decode(wire) === text. The raw text is always a
 * candidate, so the codec is a minimum over a set containing identity.
 *
 * ACCOUNTING
 * -----------------------------------------------------------------------------
 *   M = |wire|_tok + |contract|_tok          (contract travels in-band; for the
 *       CHIRON arms the CHIRON prompt is inside its own message count)
 *   win ⇔ M + 3 < |text|_tok                 (the repo's "> few" threshold)
 *
 * IMPORTED RESULTS (restated with the hypotheses actually used)
 * -----------------------------------------------------------------------------
 *  · Greedy line filling is a deterministic function (word list, width). We do
 *    not use or claim optimal line breaking (Knuth–Plass 1981); we only need
 *    the specific greedy rule to reproduce the input.
 *  · Greedy-refill consistency lemma (proved here, checked by decode): if the
 *    true width is W, every line is ≤ W and every break happened because
 *    (line + " " + word) > W. Refilling at W' = max line length of the block
 *    makes the same breaks whenever W' ≤ W and W' ≥ all line lengths, so the
 *    encoder searches candidate widths and keeps the one that explains the most
 *    blocks.
 *  · Two-part MDL / Kolmogorov invariance (Li–Vitányi): the contract is the
 *    O(1) interpreter term, measured here in o200k tokens, not bits.
 *
 * ADJACENT PROBLEMS NOT SUBSTITUTED
 * -----------------------------------------------------------------------------
 * Not optimal reflow of unwrapped prose (choosing W is not recovery). Not lossy
 * re-wrapping (violates D(E(x)) = x). Not list/markdown/code layout (MOSAIC,
 * ARIADNE, KIONES own those). Not CRLF or tab text (the encoder returns raw).
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { chironEncode, chironDecode, CHIRON_START } from './chiron';
import { metatronEncode, metatronDecode } from './metatron';

export const STICHOS_HEADER = 'STICHOS';

/** Decoder contract. Travels in-band; read by any chat model with no system prompt. */
export const STICHOS_CONTRACT =
  'STICHOS: W=line2, M=line3. Paragraph starting with M: drop M, greedy-refill its words to W columns (single spaces; longer word stays alone). Other paragraphs: literal.';

/** Cheap-first marks. None of these is a CHIRON operator (§ ¶ × …). */
const MARK_CANDIDATES = ['¦', '◆', '⧫', '◊', '⁋', '⟂'];

export interface StichosResult {
  codec: 'stichos';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'stichos' | 'stichos-chiron' | 'stichos-metatron' | 'chiron' | 'raw';
  width: number;
  ms: number;
  notes: string;
}

/** Greedy fill of a token list at width W — the exact rule the contract states. */
export function greedyFill(words: string[], W: number): string[] {
  const out: string[] = [];
  let cur: string | null = null;
  for (const w of words) {
    if (cur === null) cur = w;
    else if (cur.length + 1 + w.length <= W) cur += ' ' + w;
    else { out.push(cur); cur = w; }
  }
  if (cur !== null) out.push(cur);
  return out;
}

/** Single-layer STICHOS decoder. Returns the input unchanged if it is not a STICHOS wire. */
export function stichosDecode(wire: string): string {
  const h = STICHOS_HEADER + '\n';
  if (!wire.startsWith(h)) return wire;
  const l1 = wire.indexOf('\n', h.length);
  if (l1 < 0) return wire;
  const wStr = wire.slice(h.length, l1);
  if (!/^[1-9][0-9]{0,3}$/.test(wStr)) return wire;
  const W = Number(wStr);
  const l2 = wire.indexOf('\n', l1 + 1);
  if (l2 < 0) return wire;
  const M = wire.slice(l1 + 1, l2);
  if (M.length === 0) return wire;
  const body = wire.slice(l2 + 1);
  const blocks = body.split('\n\n').map((b) =>
    b.startsWith(M) ? greedyFill(b.slice(M.length).split(' '), W).join('\n') : b);
  return blocks.join('\n\n');
}

/** Stack decoder: undo CHIRON if present, then STICHOS. */
export function stichosStackDecode(wire: string): string {
  let x = wire;
  if (x.startsWith(CHIRON_START)) { try { x = chironDecode(x); } catch { return wire; } }
  return stichosDecode(x);
}

/** A block is consistent at W iff greedy refill of its own words reproduces its lines. */
function consistentAt(b: string, W: number): boolean {
  const ls = b.split('\n');
  if (ls.length < 2) return false;
  return greedyFill(ls.join(' ').split(' '), W).join('\n') === b;
}

/** Build the single-layer STICHOS wire. null when no width explains any block. */
function buildWire(text: string): { wire: string; W: number; wrapped: number; literal: number } | null {
  if (text.includes('\r') || text.includes('\t')) return null;
  const M = MARK_CANDIDATES.find((m) => !text.includes(m));
  if (!M) return null;
  const blocks = text.split('\n\n');
  // Width: candidate = max line length of each multi-line block; keep the one that
  // greedy-explains the most blocks; ties → larger W.
  const cands = new Set<number>();
  for (const b of blocks) {
    if (!b.includes('\n')) continue;
    let m = 0;
    for (const l of b.split('\n')) if (l.length > m) m = l.length;
    cands.add(m);
  }
  let W = 0, bestCount = 0;
  for (const c of cands) {
    if (c < 20 || c > 9999) continue;
    let n = 0;
    for (const b of blocks) if (consistentAt(b, c)) n++;
    if (n > bestCount || (n === bestCount && c > W)) { bestCount = n; W = c; }
  }
  if (bestCount === 0) return null;

  const out: string[] = [];
  let wrapped = 0, literal = 0;
  for (const b of blocks) {
    if (consistentAt(b, W)) { out.push(M + b.split('\n').join(' ')); wrapped++; }
    else { out.push(b); literal++; }
  }
  return { wire: `${STICHOS_HEADER}\n${W}\n${M}\n${out.join('\n\n')}`, W, wrapped, literal };
}

export function stichosEncode(text: string, enc: EncodingName = 'o200k_base'): StichosResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const contractTokens = countTokens(STICHOS_CONTRACT, enc);
  const finish = (
    winner: StichosResult['winner'], wire: string, M: number, outTokens: number,
    contractOut: number, W: number, notes: string,
  ): StichosResult => ({
    codec: 'stichos', wire, decoded: text, exact: true, inTokens, outTokens, messageTokens: M,
    contractTokens: contractOut, decoderPrompt: winner === 'raw' ? text : STICHOS_CONTRACT + '\n' + wire,
    savingsPct: Math.round((1 - M / inTokens) * 1000) / 10, winner, width: W, ms: Date.now() - t0, notes,
  });

  // Arm 0: identity (always a candidate; the codec is a minimum that contains it).
  let best = { M: inTokens, kind: 'raw' as StichosResult['winner'], wire: text, out: inTokens, con: 0, W: 0, note: 'raw' };

  // Arm 1: CHIRON alone (the repo incumbent for this family), verified.
  let chA: any = null;
  try {
    chA = chironEncode(text, enc, { budgetMs: 4000 }) as any;
    if (chA.decoded === text && chA.messageTokens < best.M) {
      best = { M: chA.messageTokens, kind: 'chiron', wire: chA.wire, out: chA.outTokens, con: chA.contractTokens, W: 0, note: 'chiron alone' };
    }
  } catch { chA = null; }

  // Arm 2/3: STICHOS, and STICHOS then CHIRON. Both are decode-verified.
  let built: ReturnType<typeof buildWire> = null;
  try { built = buildWire(text); } catch { built = null; }
  if (built && stichosDecode(built.wire) === text) {
    const outA = countTokens(built.wire, enc);
    const mA = outA + contractTokens;
    if (mA < best.M) best = { M: mA, kind: 'stichos', wire: built.wire, out: outA, con: contractTokens, W: built.W, note: `stichos W=${built.W} wrapped=${built.wrapped} literal=${built.literal}` };
    try {
      const c = chironEncode(built.wire, enc, { budgetMs: 4000 }) as any;
      if (c.decoded === built.wire && c.wire !== built.wire && stichosStackDecode(c.wire) === text) {
        const mB = c.messageTokens + contractTokens;
        if (mB < best.M) best = { M: mB, kind: 'stichos-chiron', wire: c.wire, out: c.outTokens, con: contractTokens + c.contractTokens, W: built.W, note: `stichos W=${built.W} wrapped=${built.wrapped} → chiron` };
      }
    } catch { /* arm unavailable */ }
  }
  const notes = `stichos-family best=${best.kind} M=${best.M} (${best.note}) vs raw ${inTokens}`;
  if (best.kind === 'raw' || best.M + 3 >= inTokens) {
    return finish('raw', text, inTokens, inTokens, 0, 0, `stichos: no arm beats raw by >few → raw (${notes})`);
  }
  // Final gate: the winning wire must decode to the input through the exact decoder
  // a reader would run (CHIRON if present, then STICHOS). Otherwise identity wins.
  if (stichosStackDecode(best.wire) !== text) {
    return finish('raw', text, inTokens, inTokens, 0, 0, `stichos: winner failed final decode → raw (${notes})`);
  }
  return finish(best.kind, best.wire, best.M, best.out, best.con, best.W, notes);
}

/** Cheap layout probe (no codec runs): how many blocks the greedy layout explains. */
export function stichosLayoutStats(text: string): { W: number; wrapped: number; literal: number } | null {
  const b = buildWire(text);
  return b ? { W: b.W, wrapped: b.wrapped, literal: b.literal } : null;
}

/** STICHOS → METATRON. Decode gate: stichosDecode(metatronDecode(wire)) === text. */
export function stichosMetatronDecode(wire: string): string {
  return stichosDecode(metatronDecode(wire));
}

/**
 * STICHOS layer under METATRON (the heavier inner codec). Arms: raw, STICHOS alone,
 * STICHOS→METATRON. METATRON's own message count (its prompt included) is used.
 * Cost: one METATRON encode on the STICHOS wire, bounded by budgetMs.
 */
export function stichosMetatronEncode(text: string, enc: EncodingName = 'o200k_base', budgetMs = 60000): StichosResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const contractTokens = countTokens(STICHOS_CONTRACT, enc);
  let built: ReturnType<typeof buildWire> = null;
  try { built = buildWire(text); } catch { built = null; }
  const rawOut = (note: string): StichosResult => ({
    codec: 'stichos', wire: text, decoded: text, exact: true, inTokens, outTokens: inTokens, messageTokens: inTokens,
    contractTokens: 0, decoderPrompt: text, savingsPct: 0, winner: 'raw', width: 0, ms: Date.now() - t0, notes: note,
  });
  if (!built || stichosDecode(built.wire) !== text) return rawOut('stichos∘metatron: no greedy layout → raw');
  let best = { M: inTokens, kind: 'raw' as StichosResult['winner'], wire: text, out: inTokens, con: 0, W: 0, note: 'raw' };
  const outA = countTokens(built.wire, enc);
  if (outA + contractTokens < best.M) best = { M: outA + contractTokens, kind: 'stichos', wire: built.wire, out: outA, con: contractTokens, W: built.W, note: `stichos W=${built.W}` };
  try {
    const m = metatronEncode(built.wire, enc, { budgetMs } as any);
    if (m.decoded === built.wire && stichosMetatronDecode(m.wire) === text) {
      const mB = m.messageTokens + contractTokens;
      if (mB < best.M) best = { M: mB, kind: 'stichos-metatron', wire: m.wire, out: m.outTokens, con: contractTokens + m.messageTokens - m.outTokens, W: built.W, note: `stichos W=${built.W} → metatron` };
    }
  } catch { /* metatron arm unavailable */ }
  if (best.kind === 'raw' || best.M + 3 >= inTokens) return rawOut(`stichos∘metatron: no arm beats raw by >few (best M=${best.M})`);
  const gate = best.kind === 'stichos-metatron' ? stichosMetatronDecode(best.wire) : stichosDecode(best.wire);
  if (gate !== text) return rawOut('stichos∘metatron: final decode gate failed → raw');
  return {
    codec: 'stichos', wire: best.wire, decoded: text, exact: true, inTokens, outTokens: best.out, messageTokens: best.M,
    contractTokens: best.con, decoderPrompt: STICHOS_CONTRACT + '\n' + best.wire, savingsPct: Math.round((1 - best.M / inTokens) * 1000) / 10,
    winner: best.kind, width: best.W, ms: Date.now() - t0,
    notes: `stichos∘metatron ${best.note} M=${best.M} vs raw ${inTokens}`,
  };
}

/** Deterministic, non-repetitive wrapped prose: LCG-chosen words, greedy-wrapped at 72. */
function longWrappedNonRepetitive(): string {
  const vocab = ('amber anchor basil beacon birch bramble cadence canvas cinder clover comet copper delta dune ember fable falcon fern fjord garnet glacier harbor hazel helix ivory jasper juniper kelp lantern lichen maple meadow mesa nectar oak orbit pebble quartz raven reed ridge saffron sable thistle timber umber velvet willow yarn zephyr'.split(' '));
  let seed = 12345;
  const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed; };
  const paras: string[] = [];
  for (let p = 0; p < 30; p++) {
    const words: string[] = [];
    const n = 60 + (next() % 40);
    for (let i = 0; i < n; i++) words.push(vocab[next() % vocab.length]);
    paras.push(greedyFill(words, 72).join('\n'));
  }
  return paras.join('\n\n');
}

export function stichosSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const words = 'The quick brown fox jumps over the lazy dog and keeps running through the meadow until the sun goes down behind the far hills at which point it stops and rests'.split(' ');
  const wrapped = [...greedyFill(words, 40), '', 'Second paragraph is short.'].join('\n');
  const cases: Array<{ name: string; text: string; expectWin?: boolean; expectStichos?: boolean }> = [
    { name: 'empty', text: '' },
    { name: 'single-line', text: 'x' },
    { name: 'wrapped-2para', text: wrapped },
    { name: 'ragged (not greedy)', text: 'aaa bbb\nccc\nddd eee fff ggg hhh iii jjj kkk lll mmm nnn ooo ppp qqq rrr sss ttt uuu vvv www' },
    { name: 'crlf', text: wrapped.replace(/\n/g, '\r\n') },
    { name: 'tabs', text: 'a\tb c\nd e f g h i j k l m n o p q r s t u v w x y z aa bb cc dd ee ff gg' },
    { name: 'long single line', text: 'z'.repeat(40) + '\n\nshort' },
    { name: 'mark glyph present', text: '¦ literal ¦ text\nthat is wrapped at a width of exactly this long, yes indeed\n' },
    { name: 'long wrapped, non-repetitive (must pick a STICHOS arm)', text: longWrappedNonRepetitive(), expectStichos: true },
  ];
  return cases.map(({ name, text, expectWin, expectStichos }) => {
    try {
      const r = stichosEncode(text, enc);
      const exact = stichosStackDecode(r.wire) === text && r.decoded === text;
      const winOk = (!expectWin || r.winner !== 'raw') && (!expectStichos || r.winner === 'stichos' || r.winner === 'stichos-chiron');
      const ok = exact && winOk;
      return { name: `${name} ${ok ? 'ok' : 'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} W=${r.width}` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}
