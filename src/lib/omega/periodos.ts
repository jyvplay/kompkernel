/**
 * src/lib/omega/periodos.ts
 * =============================================================================
 * PERIODOS — per-paragraph measure for hard-wrapped prose.
 * (περίοδος — a period: the paragraph is the unit of layout here, not the file.)
 *
 * THE GAP IT CLOSES (measured, not assumed)
 * -----------------------------------------------------------------------------
 * STICHOS (src/lib/omega/stichos.ts) explains a hard-wrapped document with ONE
 * document-wide width W. Real wrapped documents do not have one width: an editor,
 * a re-flow, or a mail client leaves each paragraph at its own measure. The
 * repo's own holdout README-style prose is a case: holdout/kb-article has
 * paragraphs whose greedy refill holds at 95, 97 and 98 columns respectively, so
 * STICHOS finds no document width and emits nothing (measured, §Results).
 *
 * Measured on the corpus this codec was built against (47 choosealicense
 * licence texts + 70 plain-text files from PyPI sdists, bench/periodos-bench.ts):
 * the greedy-consistent paragraph share is far larger per paragraph than per
 * document (GPL-3.0: 73 paragraphs / 330 newlines per paragraph vs 48 blocks
 * under one document width).
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   line 1      M       one glyph absent from the text (¦ ◆ ⧫ ◊ ⁋ ⟂)
 *   then        blocks joined by "\n\n"
 *
 *   A block with ≥ MIN_LINES lines that is exactly the greedy refill of its own
 *   words at its width W is written as   M + [W] + " " + (its lines joined by " ")
 *   where W is written only when it differs from the last written width.
 *   Every other block is written byte-identical (code, lists, short paragraphs).
 *
 * DECODER (total on encoder output)
 *   line 1 gives M. Split the body at "\n\n". A block starting with M: parse
 *   /^(\d*) / from the rest (digits set W, otherwise keep the last W), then
 *   greedyFill(body-words, W) joined by "\n". Any other block is returned as-is.
 *
 * ARMS (the codec is a minimum over a set that contains identity)
 *   raw · CHIRON alone · PERIODOS · PERIODOS→CHIRON.
 *   Every non-raw candidate must pass its own decode gate: periodosDecode(wire)
 *   === text (or the CHIRON-stacked decode), otherwise it is discarded.
 *
 * ACCOUNTING
 *   M = |wire|_o200k + |contract|_o200k    (the contract travels in-band)
 *   win ⇔ M + 3 < |text|_o200k            (the repo's "more than a few" threshold)
 *
 * IMPORTED RESULTS (restated with the hypotheses actually used)
 * -----------------------------------------------------------------------------
 *  · Greedy line filling is a deterministic function (word list, width) — the
 *    STICHOS rule, reused as-is (greedyFill). Knuth & Plass (1981) optimal
 *    breaking is NOT used: we need only the specific greedy rule to reproduce
 *    the input, and the encoder checks that by decoding.
 *  · Consistency lemma (checked by decode, not assumed): if a block's lines are
 *    the greedy refill at W, then every line ≤ W and every break happened because
 *    line + " " + nextWord > W. We therefore only test the candidate widths
 *    {last written W, max line length of the block, max length of non-final lines}.
 *
 * ADJACENT PROBLEMS NOT SUBSTITUTED
 * -----------------------------------------------------------------------------
 * Not optimal reflow of unwrapped prose (choosing W is recovery, not invention).
 * Not lossy re-wrapping (violates D(E(x)) = x). Not list, table or code layout
 * (MOSAIC, ARIADNE, KIONES, TESSERA own those). Not CRLF or tab text (returned
 * raw). Not format=flowed (RFC 3676) soft breaks, which are a different wire.
 *
 * LLM READABILITY — DOWNGRADED, NOT VERIFIED
 * -----------------------------------------------------------------------------
 * The reader must count characters to place each break. No LLM is available in
 * this sandbox, so this codec makes NO claim that a model executes the reflow
 * byte-exactly. The code decoder is verified; the model-side decode is an open
 * risk and is recorded as such in bench/periodos-report.md.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { chironEncode, chironDecode, CHIRON_START } from './chiron';
import { greedyFill } from './stichos';

const MARK_CANDIDATES = ['¦', '◆', '⧫', '◊', '⁋', '⟂'];
/** Minimum lines for a block to be wrapped (a 2-line block saves ~1 newline, not enough to pay its marker). */
export const PERIODOS_MIN_LINES = 3;

/** Decoder contract. The marker M is line 1 of the wire. Travels in-band. */
export const PERIODOS_CONTRACT =
  'Line 1 = M. Block starting M: drop M; digits = W, else last W; greedy-refill its words to lines of at most W chars (longer word alone). Other blocks literal.';

export interface PeriodosResult {
  codec: 'periodos';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'raw' | 'chiron' | 'periodos' | 'periodos-chiron';
  wrapped: number;
  literal: number;
  ms: number;
  notes: string;
}

/** Single-layer PERIODOS decoder. Throws on a malformed wire (encoder never emits one). */
export function periodosDecode(wire: string): string {
  if (wire.length < 2 || wire[1] !== '\n' || !MARK_CANDIDATES.includes(wire[0])) throw new Error('periodos: no marker line');
  const M = wire[0];
  const body = wire.slice(2);
  let W = 0;
  const blocks = body.split('\n\n').map((b) => {
    if (!b.startsWith(M)) return b;
    const rest = b.slice(M.length);
    const m = /^(\d*) /.exec(rest);
    if (!m) throw new Error('periodos: block header');
    if (m[1] !== '') W = Number(m[1]);
    if (!(W >= 1)) throw new Error('periodos: no width');
    return greedyFill(rest.slice(m[0].length).split(' '), W).join('\n');
  });
  return blocks.join('\n\n');
}

/**
 * Stack decoder (the reader's path): undo CHIRON if the wire starts with its start glyph,
 * then undo PERIODOS if the result begins with a PERIODOS marker line; otherwise the
 * result is the text itself (the CHIRON-alone arm). Total; null on a malformed layer.
 * The encoder's final gate runs this same function, so a misread can only fall back to raw.
 */
export function periodosStackDecode(wire: string): string | null {
  let x = wire;
  try {
    if (x.startsWith(CHIRON_START)) x = chironDecode(x);
    if (x.length >= 2 && x[1] === '\n' && MARK_CANDIDATES.includes(x[0])) return periodosDecode(x);
    return x;
  } catch {
    return null;
  }
}

/** A block is consistent at W iff the greedy refill of its own words reproduces its lines. */
function consistentAt(lines: string[], W: number): boolean {
  return greedyFill(lines.join(' ').split(' '), W).join('\n') === lines.join('\n');
}

/**
 * Width selection. A block's line breaks are reproduced by greedy refill at W iff
 * every line fits (len ≤ W) and each break was forced (len(line_i)+1+len(firstWord_{i+1}) > W).
 * So the consistent widths form an INTERVAL [maxLine, hi]; any W in it decodes identically.
 * We prefer W = prevW (no digits to write), then the interval's ends, then a bounded scan
 * (covers single long words that stay alone, which the interval formula does not model).
 */
function chooseWidth(lines: string[], prevW: number): number | undefined {
  let maxAll = 0, hi = Infinity;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].length > maxAll) maxAll = lines[i].length;
    if (i < lines.length - 1) {
      const nextFirst = lines[i + 1].split(' ')[0];
      hi = Math.min(hi, lines[i].length + 1 + nextFirst.length - 1);
    }
  }
  const inInterval = (w: number) => w >= 2 && w >= maxAll && w <= hi;
  if (inInterval(prevW) && consistentAt(lines, prevW)) return prevW;
  if (maxAll >= 2 && consistentAt(lines, maxAll)) return maxAll;
  if (Number.isFinite(hi) && hi >= 2 && consistentAt(lines, hi)) return hi;
  for (let w = Math.max(2, maxAll); w <= Math.max(maxAll, 200); w++) if (consistentAt(lines, w)) return w;
  return undefined;
}

/** Build the single-layer PERIODOS wire. null when no block can be wrapped. */
export function periodosBuild(text: string, minLines = PERIODOS_MIN_LINES): { wire: string; wrapped: number; literal: number; lastW: number } | null {
  if (text.includes('\r') || text.includes('\t')) return null;
  const M = MARK_CANDIDATES.find((m) => !text.includes(m));
  if (!M) return null;
  const out: string[] = [];
  let prevW = 0, wrapped = 0, literal = 0;
  for (const b of text.split('\n\n')) {
    const lines = b.split('\n');
    if (lines.length < minLines) { out.push(b); literal++; continue; }
    const W = chooseWidth(lines, prevW);
    if (W === undefined) { out.push(b); literal++; continue; }
    out.push(M + (W === prevW ? '' : String(W)) + ' ' + lines.join(' '));
    prevW = W;
    wrapped++;
  }
  const wire = M + '\n' + out.join('\n\n');
  return { wire, wrapped, literal, lastW: prevW };
}

export function periodosEncode(text: string, enc: EncodingName = 'o200k_base'): PeriodosResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const contractTokens = countTokens(PERIODOS_CONTRACT, enc);

  let best: { M: number; kind: PeriodosResult['winner']; wire: string; out: number; con: number } =
    { M: inTokens, kind: 'raw', wire: text, out: inTokens, con: 0 };
  let wrapped = 0, literal = 0, lastW = 0;

  // Arm: CHIRON alone (the repo incumbent for this family), decode-verified.
  try {
    const c = chironEncode(text, enc, { budgetMs: 4000 }) as any;
    if (c.decoded === text && c.messageTokens < best.M) best = { M: c.messageTokens, kind: 'chiron', wire: c.wire, out: c.outTokens, con: c.contractTokens };
  } catch { /* arm unavailable */ }

  // Arm: PERIODOS, then PERIODOS→CHIRON.
  let built: ReturnType<typeof periodosBuild> = null;
  try { built = periodosBuild(text); } catch { built = null; }
  if (built && periodosDecode(built.wire) === text) {
    wrapped = built.wrapped; literal = built.literal; lastW = built.lastW;
    const outA = countTokens(built.wire, enc);
    if (outA + contractTokens < best.M) best = { M: outA + contractTokens, kind: 'periodos', wire: built.wire, out: outA, con: contractTokens };
    try {
      const c = chironEncode(built.wire, enc, { budgetMs: 4000 }) as any;
      if (c.decoded === built.wire && c.wire !== built.wire && periodosStackDecode(c.wire) === text) {
        const mB = c.messageTokens + contractTokens;
        if (mB < best.M) best = { M: mB, kind: 'periodos-chiron', wire: c.wire, out: c.outTokens, con: c.contractTokens + contractTokens };
      }
    } catch { /* arm unavailable */ }
  }

  const notes = `periodos best=${best.kind} M=${best.M} vs raw ${inTokens}; wrapped=${wrapped} literal=${literal} lastW=${lastW}`;
  const finish = (winner: PeriodosResult['winner'], wire: string, M: number, out: number, con: number): PeriodosResult => ({
    codec: 'periodos', wire, decoded: text, exact: true, inTokens, outTokens: out, messageTokens: M, contractTokens: con,
    decoderPrompt: winner === 'raw' ? text : PERIODOS_CONTRACT + '\n' + wire,
    savingsPct: Math.round((1 - M / inTokens) * 1000) / 10, winner, wrapped, literal,
    ms: Date.now() - t0, notes,
  });
  if (best.kind === 'raw' || best.M + 3 >= inTokens) return finish('raw', text, inTokens, inTokens, 0);
  // Final gate: the winning wire must decode through the exact reader path.
  if (periodosStackDecode(best.wire) !== text) return finish('raw', text, inTokens, inTokens, 0);
  return finish(best.kind, best.wire, best.M, best.out, best.con);
}

/** Deterministic self-test cases. Each must round-trip through the stack decoder. */
export function periodosSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const words = 'The quick brown fox jumps over the lazy dog and keeps running through the meadow until the sun goes down behind the far hills at which point it stops and rests'.split(' ');
  const a = greedyFill(words, 40).join('\n');
  const b = greedyFill(words, 56).join('\n');
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'single line', text: 'x' },
    { name: 'two widths in one document', text: `${a}\n\n${b}\n\nclosing short.` },
    { name: 'ragged paragraph (not greedy)', text: 'aaa bbb\nccc\nddd eee fff ggg hhh iii jjj kkk lll mmm nnn ooo ppp qqq rrr sss ttt uuu vvv www' },
    { name: 'crlf', text: `${a}`.replace(/\n/g, '\r\n') },
    { name: 'tabs', text: 'a\tb c\nd e f g h i j k l m n o p q r s t u v w x y z aa bb cc dd ee ff gg' },
    { name: 'long word wider than W', text: 'short words here\nxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\nand more words\n' },
    { name: 'double space inside paragraph', text: `aa  bb cc dd ee\nff gg hh ii jj kk\nll mm nn oo pp qq rr\n\nnext` },
    { name: 'trailing newline after wrapped block', text: `${a}\n` },
    { name: 'mark glyph present in text', text: '¦ literal ¦ text\nthat is wrapped at a width of exactly this long, yes indeed\nand so on for a while longer now\n' },
    { name: 'digits right after the marker position', text: `${a}\n\n2026 ${a.slice(0, 60)}\n2027 more text here to make it lines\n2028 and then some\n` },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = periodosEncode(text, enc);
      // Raw winner = identity by definition (no codec layer is run by the reader).
      const exact = (r.winner === 'raw' ? r.wire === text : periodosStackDecode(r.wire) === text) && r.decoded === text;
      return { name: `${name} ${exact ? 'ok' : 'FAIL'}`, ok: exact, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} wrapped=${r.wrapped}` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}
