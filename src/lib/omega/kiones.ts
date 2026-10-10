/**
 * src/lib/omega/kiones.ts
 * =============================================================================
 * KIONES — THE COLUMNS
 * (byte-perfect, exact-lossless, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * κίονες — pillars; the columns of a stoa, stood in a row.
 *
 *
 * THE SEAM
 * -----------------------------------------------------------------------------
 * Every lane in this repository reads a document in ROW-MAJOR order, because
 * that is the order the bytes arrive in. Dictionary mining, block detection,
 * template induction and the pre-tokenizer all operate along the line.
 *
 * But tabular data is only incidentally row-major. Its redundancy lives DOWN
 * the columns: a date column is 240 near-identical strings, a price column is
 * 240 numbers of the same shape, a status column is three words repeated.
 * Row-major, each of those values is separated from its nearest relative by a
 * whole row of unrelated bytes, so neither BPE nor a span miner can reach it.
 *
 * MEASURED (bench/w19-trans.ts, o200k_base, every arm decoded and
 * byte-compared) on `bench/holdout-tab/vix-daily-1990.csv`:
 *
 *     raw                              3 412
 *     METATRON                         1 394   (59.1%)
 *     POLYTROPOS (previous best lane)  1 304   (61.8%)
 *     column-major + the same stack      915   (73.2%)
 *
 * **389 tokens, 29.8% below the previous best on that lane** — the largest
 * single-lane gain in five turns of work on this stack, and it comes from
 * re-ordering bytes, not from a new dictionary.
 *
 * Why it is so large there: the file has OPEN/HIGH/LOW/CLOSE columns holding
 * the same value four times per row. Row-major, each repetition is 30
 * characters from the next. Column-major, three of the four columns become
 * byte-identical 2 000-character strings and the dictionary takes them in one
 * rule each.
 *
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 *  1. Find a maximal run of consecutive lines that all split into the same
 *     number of fields under some candidate separator.
 *  2. Transpose that run and bracket it:
 *
 *         ◆<sep>
 *         <column 1>
 *         <column 2>
 *         ...
 *         ◇
 *
 *  3. Hand the result to the existing stack (POLYTROPOS), which now finds the
 *     redundancy that was always there and was simply out of reach.
 *  4. Fuse one 19-token clause onto the contract.
 *  5. Tournament: identity, the incumbent, the plain stack, and the
 *     column-major stack. Every arm is decoded and byte-compared, so KIONES
 *     is a minimum over a set containing the incumbent and cannot be worse.
 *
 * The transform is its own witness: the encoder applies the inverse and
 * refuses the transform unless it reproduces the input byte for byte.
 *
 *
 * WHY IT IS READABLE
 * -----------------------------------------------------------------------------
 * "These lines are columns; print them back as rows" is a table transpose —
 * one of the most common operations a language model is ever asked to perform
 * on text, and purely mechanical: no counting, no arithmetic, no lookup. The
 * contract is 19 tokens.
 *
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * This is not a general prose mechanism. It fires on tabular regions and
 * nowhere else, and on documents with no table it returns the incumbent
 * unchanged. Two other mechanisms were built and measured this session and
 * both returned exactly zero: per-region codec selection with a merged tape,
 * and the generalisation of the transpose to whitespace-aligned tables that
 * are not field-consistent. They are in bench/kiones-report.md section D.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, chironDecode } from './chiron';
import { syntomiaContract } from './syntomia';
import { polytroposEncode } from './polytropos';
import { metatronEncode } from './metatron';

/* ---------------------------------------------------------------------------
 * 1. THE TRANSFORM
 * ------------------------------------------------------------------------- */

/** Both verified one token in o200k_base and cl100k_base. */
export const KION_OPEN = '◆';
export const KION_CLOSE = '◇';

/** separators tried, cheapest-to-detect first */
export const KION_SEPS = [',', '\t', '|', ';', '  '];

export interface KionBlock { start: number; end: number; sep: string; cols: number }

/**
 * Maximal runs of consecutive lines that all split into the same number of
 * fields (>= 2) under `sep`.  Runs shorter than `minLines` are not worth the
 * bracket.
 */
export function findBlocks(lines: string[], sep: string, minLines = 4): KionBlock[] {
  const out: KionBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const c = lines[i].split(sep).length;
    if (c < 2) { i++; continue; }
    let j = i + 1;
    while (j < lines.length && lines[j].split(sep).length === c) j++;
    if (j - i >= minLines) out.push({ start: i, end: j, sep, cols: c });
    i = j > i ? j : i + 1;
  }
  return out;
}

function transposeBlock(lines: string[], b: KionBlock): string {
  const rows = lines.slice(b.start, b.end).map((l) => l.split(b.sep));
  const cols: string[] = [];
  for (let c = 0; c < b.cols; c++) cols.push(rows.map((r) => r[c]).join(b.sep));
  return KION_OPEN + b.sep + '\n' + cols.join('\n') + '\n' + KION_CLOSE;
}

/** Apply the transform to the single most profitable block. */
export function kionesEncodeText(text: string, enc: EncodingName): { out: string; block: KionBlock } | null {
  if (text.includes(KION_OPEN) || text.includes(KION_CLOSE)) return null;
  const hadTrail = text.endsWith('\n');
  const body = hadTrail ? text.slice(0, -1) : text;
  const lines = body.split('\n');
  if (lines.length < 5) return null;
  const T = (s: string) => countTokens(s, enc);

  let best: { out: string; block: KionBlock; tok: number } | null = null;
  for (const sep of KION_SEPS) {
    for (const b of findBlocks(lines, sep)) {
      const replaced = transposeBlock(lines, b);
      const out = [...lines.slice(0, b.start), replaced, ...lines.slice(b.end)].join('\n') + (hadTrail ? '\n' : '');
      // the transform is its own witness
      if (kionesDecodeText(out) !== text) continue;
      const tok = T(out);
      if (!best || tok < best.tok) best = { out, block: b, tok };
    }
  }
  if (!best) return null;
  return { out: best.out, block: best.block };
}

/** Inverse: zip the bracketed columns back into rows. */
export function kionesDecodeText(s: string): string {
  const oi = s.indexOf(KION_OPEN);
  if (oi < 0) return s;
  const hadTrail = s.endsWith('\n');
  const body = hadTrail ? s.slice(0, -1) : s;
  const lines = body.split('\n');
  const open = lines.findIndex((l) => l.startsWith(KION_OPEN));
  if (open < 0) return s;
  const sep = lines[open].slice(KION_OPEN.length);
  if (sep.length === 0) return s;
  let close = -1;
  for (let i = open + 1; i < lines.length; i++) if (lines[i] === KION_CLOSE) { close = i; break; }
  if (close < 0) return s;
  const cols = lines.slice(open + 1, close).map((l) => l.split(sep));
  if (cols.length < 2) return s;
  const h = cols[0].length;
  if (!cols.every((c) => c.length === h)) return s;
  const rows: string[] = [];
  for (let r = 0; r < h; r++) rows.push(cols.map((c) => c[r]).join(sep));
  return [...lines.slice(0, open), ...rows, ...lines.slice(close + 1)].join('\n') + (hadTrail ? '\n' : '');
}

export const KION_CLAUSE = ` ${KION_OPEN}c ... ${KION_CLOSE} holds columns; print them as rows, fields joined by c.`;

/* ---------------------------------------------------------------------------
 * 2. ENCODER
 * ------------------------------------------------------------------------- */

export interface KionesResult {
  codec: 'kiones';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: string;
  transposed: boolean;
  blockLines: number;
  blockCols: number;
  incumbentTokens: number;
  ms: number;
  notes: string;
}

export interface KionesOptions {
  budgetMs?: number;
  maxConfigs?: number;
  configBudgetMs?: number;
  incumbent?: { wire: string; decoded: string; messageTokens: number; decoderPrompt: string };
  useIncumbent?: boolean;
}

interface Cand { name: string; wire: string; contract: string; tokens: number; decoded: string }

export function kionesEncode(
  text: string,
  enc: EncodingName = 'o200k_base',
  options: KionesOptions = {},
): KionesResult {
  const t0 = Date.now();
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const budgetMs = options.budgetMs ?? 25000;
  const maxConfigs = options.maxConfigs ?? 5;
  const cfgBudget = options.configBudgetMs ?? 70;

  const cands: Cand[] = [{ name: 'identity', wire: text, contract: '', tokens: inTokens, decoded: text }];
  let incumbentTokens = inTokens;
  let inc = options.incumbent;

  if (options.useIncumbent !== false) {
    try {
      const m = inc ?? metatronEncode(text, enc, { budgetMs: Math.min(4000, budgetMs) });
      if (m.decoded === text) {
        inc = m;
        incumbentTokens = m.messageTokens;
        cands.push({
          name: 'metatron', wire: m.wire,
          contract: m.decoderPrompt.slice(m.wire.length).replace(/^\n/, ''),
          tokens: m.messageTokens, decoded: m.decoded,
        });
      }
    } catch { /* incumbent unavailable */ }
  }

  // --- arm: the plain stack -----------------------------------------------
  try {
    const p = polytroposEncode(text, enc, { maxConfigs, configBudgetMs: cfgBudget, incumbent: inc, budgetMs });
    if (p.decoded === text) {
      cands.push({
        name: 'polytropos', wire: p.wire,
        contract: p.decoderPrompt.slice(p.wire.length).replace(/^\n/, ''),
        tokens: p.messageTokens, decoded: text,
      });
    }
  } catch { /* arm unavailable */ }

  // --- arm: column-major, then the same stack ------------------------------
  let transposed = false, blockLines = 0, blockCols = 0;
  let tr: { out: string; block: KionBlock } | null = null;
  try { tr = kionesEncodeText(text, enc); } catch { tr = null; }
  if (tr) {
    blockLines = tr.block.end - tr.block.start;
    blockCols = tr.block.cols;
    try {
      const p = polytroposEncode(tr.out, enc, {
        maxConfigs, configBudgetMs: cfgBudget, useIncumbent: false, budgetMs,
      });
      if (p.decoded === tr.out) {
        const dec = kionesDecodeText(
          p.wire.startsWith(CHIRON_START) ? chironDecode(p.wire) : p.wire,
        );
        if (dec === text) {
          const base = p.decoderPrompt.slice(p.wire.length).replace(/^\n/, '');
          const contract = base + KION_CLAUSE;
          cands.push({
            name: 'kiones', wire: p.wire, contract,
            tokens: T(p.wire) + T(contract), decoded: text,
          });
          transposed = true;
        }
      }
      // also the bare transposed text with only the transpose clause
      const bare = KION_CLAUSE.trim();
      if (kionesDecodeText(tr.out) === text) {
        cands.push({
          name: 'kiones-bare', wire: tr.out, contract: bare,
          tokens: T(tr.out) + T(bare), decoded: text,
        });
      }
    } catch { /* arm unavailable */ }
  }

  const valid = cands.filter((c) => c.decoded === text && c.tokens <= inTokens);
  valid.sort((a, b) => a.tokens - b.tokens || a.wire.length - b.wire.length);
  const win = valid[0] ?? cands[0];
  const wireTok = T(win.wire);

  return {
    codec: 'kiones',
    wire: win.wire,
    decoded: win.decoded,
    exact: true,
    inTokens,
    outTokens: wireTok,
    messageTokens: win.tokens,
    contractTokens: win.tokens - wireTok,
    decoderPrompt: win.contract ? win.wire + '\n' + win.contract : win.wire,
    savingsPct: inTokens ? ((inTokens - win.tokens) / inTokens) * 100 : 0,
    winner: win.name,
    transposed: win.name.startsWith('kiones'),
    blockLines, blockCols,
    incumbentTokens,
    ms: Date.now() - t0,
    notes: `winner=${win.name}${transposed ? `; block ${blockLines}x${blockCols}` : ''}; incumbent ${incumbentTokens} -> ${win.tokens}`,
  };
}

/** Full decode for a KIONES wire: undo CHIRON, then undo the transpose. */
export function kionesDecode(wire: string): string {
  const inner = wire.startsWith(CHIRON_START) ? chironDecode(wire) : wire;
  return kionesDecodeText(inner);
}

export const KIONES_SYSTEM_PROMPT =
  'KIONES re-orders a tabular block into column-major form, brackets it with ◆sep ... ◇, and hands it to the CHIRON stack. The contract travels in the message; no system prompt is required.';
