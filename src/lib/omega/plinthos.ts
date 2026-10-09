/**
 * src/lib/omega/plinthos.ts
 * =============================================================================
 * PLINTHOS — THE COURSE OF BRICKS
 * (byte-perfect, exact-lossless, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * πλίνθος — a brick; πλινθηδόν, "laid in courses", rows upon columns.
 *
 * KIONES (previous turn) established that reading order is a free parameter:
 * transposing a tabular block moves redundancy into reach of mechanisms that
 * are otherwise exhausted, and it won 466 tokens on one CSV. Its own report
 * listed four gaps. PLINTHOS closes two of them and reports the measurement
 * that killed a third.
 *
 *   GAP 4 — "KIONES transposes the single most profitable block; documents
 *            with several tables get only one."
 *            CLOSED: PLINTHOS finds every disjoint profitable block and
 *            transposes all of them, each bracketed independently.
 *
 *   GAP 2 — "the transpose clause has NOT been checked by an independent
 *            reader; that is the weakest link in this lane's evidence."
 *            CLOSED: bench/plinthos_decode.py is a from-scratch CPython
 *            reader for the bracket format, written from the contract
 *            sentence, and bench/plinthos-crosscheck.sh diffs its output
 *            against the source bytes.
 *
 *   GAP 3 — "psql, kubectl and df -h are whitespace-aligned and not
 *            field-consistent, so the transform declines on exactly the ops
 *            lanes where columns are most obvious."
 *            MEASURED AND REJECTED. bench/w20-fw.ts implements a fixed-width
 *            transpose that cuts at the whitespace columns (every line has a
 *            gap there), keeps each field's padding so concatenation is
 *            byte-exact, and joins columns with a sentinel. The inverse is
 *            exact on every lane tried. It still loses:
 *
 *                kubectl-get-pods   raw 1006  ->  transposed 1186
 *                ls-full-iso        raw 1175  ->  transposed 1413
 *                df-h               raw  570  ->  transposed  646
 *                find-listing       raw 3997  ->  transposed 4580
 *
 *            and the whole-corpus sweep after compression returned
 *            **0 tokens**. The reason is structural, and it explains why
 *            vix-daily won and kubectl cannot: in vix the OPEN/HIGH/LOW/CLOSE
 *            columns are BYTE-IDENTICAL 2 000-character strings once
 *            transposed, a long-range identity the row-major dictionary can
 *            only express with one rule per distinct value. In kubectl the
 *            repeated material is short ("Running", "1/1") and the row-major
 *            dictionary already has it at 0.4 tokens a reference, while the
 *            transpose has to pay a sentinel per cell. Transposition pays
 *            only when it creates LONG identical runs, not when it merely
 *            groups short repeats.
 *
 *
 * THE MECHANISM
 * -----------------------------------------------------------------------------
 *  1. Scan for every maximal run of consecutive lines that all split into the
 *     same number of fields (>= 2) under a candidate separator.
 *  2. Keep the runs, non-overlapping and greedily by measured token gain, and
 *     transpose each in place:
 *
 *         ◆<sep>
 *         <column 1>
 *         ...
 *         ◇
 *
 *  3. Hand the result to POLYTROPOS.
 *  4. Fuse one 19-token clause onto the contract.
 *  5. Tournament over identity / incumbent / plain stack / column-major
 *     stack / bare transposed text. Every arm decoded and byte-compared.
 *
 * The transform is its own witness: every candidate is passed through the
 * inverse and discarded unless it reproduces the input byte for byte, so a
 * table PLINTHOS cannot invert is simply never used.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, chironDecode } from './chiron';
import { polytroposEncode } from './polytropos';
import { metatronEncode } from './metatron';

export const PL_OPEN = '◆';
export const PL_CLOSE = '◇';
export const PL_SEPS = [',', '\t', '|', ';', '  '];

export interface PlBlock { start: number; end: number; sep: string; cols: number; gain: number }

/** maximal runs of consecutive lines with an identical field count under `sep` */
export function scanBlocks(lines: string[], sep: string, minLines = 4): PlBlock[] {
  const out: PlBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    const c = lines[i].split(sep).length;
    if (c < 2) { i++; continue; }
    let j = i + 1;
    while (j < lines.length && lines[j].split(sep).length === c) j++;
    if (j - i >= minLines) out.push({ start: i, end: j, sep, cols: c, gain: 0 });
    i = j > i ? j : i + 1;
  }
  return out;
}

export function renderBlock(lines: string[], b: PlBlock): string {
  const rows = lines.slice(b.start, b.end).map((l) => l.split(b.sep));
  const cols: string[] = [];
  for (let c = 0; c < b.cols; c++) cols.push(rows.map((r) => r[c]).join(b.sep));
  return PL_OPEN + b.sep + '\n' + cols.join('\n') + '\n' + PL_CLOSE;
}

/** Inverse: zip every bracketed column group back into rows. Handles many blocks. */
export function plinthosDecodeText(s: string): string {
  if (!s.includes(PL_OPEN)) return s;
  const hadTrail = s.endsWith('\n');
  const lines = (hadTrail ? s.slice(0, -1) : s).split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!lines[i].startsWith(PL_OPEN)) { out.push(lines[i]); i++; continue; }
    const sep = lines[i].slice(PL_OPEN.length);
    if (sep.length === 0) { out.push(lines[i]); i++; continue; }
    let close = -1;
    for (let k = i + 1; k < lines.length; k++) if (lines[k] === PL_CLOSE) { close = k; break; }
    if (close < 0) { out.push(lines[i]); i++; continue; }
    const cols = lines.slice(i + 1, close).map((l) => l.split(sep));
    if (cols.length < 2 || !cols.every((c) => c.length === cols[0].length)) {
      out.push(lines[i]); i++; continue;
    }
    const h = cols[0].length;
    for (let r = 0; r < h; r++) out.push(cols.map((c) => c[r]).join(sep));
    i = close + 1;
  }
  return out.join('\n') + (hadTrail ? '\n' : '');
}

/** Transpose EVERY profitable disjoint block (KIONES did only the best one). */
export function plinthosEncodeText(
  text: string, enc: EncodingName,
): { out: string; blocks: number; rows: number } | null {
  if (text.includes(PL_OPEN) || text.includes(PL_CLOSE)) return null;
  const T = (s: string) => countTokens(s, enc);
  const hadTrail = text.endsWith('\n');
  const lines = (hadTrail ? text.slice(0, -1) : text).split('\n');
  if (lines.length < 5) return null;

  // score every candidate block on its own, then take disjoint winners
  const cands: PlBlock[] = [];
  for (const sep of PL_SEPS) {
    for (const b of scanBlocks(lines, sep)) {
      const before = T(lines.slice(b.start, b.end).join('\n'));
      const after = T(renderBlock(lines, b));
      b.gain = before - after;
      cands.push(b);
    }
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.gain - a.gain);

  const taken: PlBlock[] = [];
  for (const c of cands) {
    if (taken.some((t) => c.start < t.end && t.start < c.end)) continue;
    taken.push(c);
  }
  if (!taken.length) return null;
  taken.sort((a, b) => a.start - b.start);

  const pieces: string[] = [];
  let cur = 0, rows = 0;
  for (const b of taken) {
    pieces.push(...lines.slice(cur, b.start));
    pieces.push(renderBlock(lines, b));
    rows += b.end - b.start;
    cur = b.end;
  }
  pieces.push(...lines.slice(cur));
  const out = pieces.join('\n') + (hadTrail ? '\n' : '');
  // the transform is its own witness
  if (plinthosDecodeText(out) !== text) return null;
  return { out, blocks: taken.length, rows };
}

export const PL_CLAUSE = ` ${PL_OPEN}c ... ${PL_CLOSE} holds columns; print them as rows, fields joined by c.`;

/* ------------------------------------------------------------------------- */

export interface PlinthosResult {
  codec: 'plinthos';
  wire: string; decoded: string; exact: boolean;
  inTokens: number; outTokens: number; messageTokens: number; contractTokens: number;
  decoderPrompt: string; savingsPct: number; winner: string;
  transposed: boolean; blocks: number; blockRows: number;
  incumbentTokens: number; ms: number; notes: string;
}

export interface PlinthosOptions {
  budgetMs?: number; maxConfigs?: number; configBudgetMs?: number;
  incumbent?: { wire: string; decoded: string; messageTokens: number; decoderPrompt: string };
  useIncumbent?: boolean;
}

interface Cand { name: string; wire: string; contract: string; tokens: number; decoded: string }

export function plinthosEncode(
  text: string, enc: EncodingName = 'o200k_base', options: PlinthosOptions = {},
): PlinthosResult {
  const t0 = Date.now();
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const budgetMs = options.budgetMs ?? 25000;
  const maxConfigs = options.maxConfigs ?? 4;
  const cfgBudget = options.configBudgetMs ?? 60;

  const cands: Cand[] = [{ name: 'identity', wire: text, contract: '', tokens: inTokens, decoded: text }];
  let incumbentTokens = inTokens;
  let inc = options.incumbent;

  if (options.useIncumbent !== false) {
    try {
      const m = inc ?? metatronEncode(text, enc, { budgetMs: Math.min(3000, budgetMs) });
      if (m.decoded === text) {
        inc = m; incumbentTokens = m.messageTokens;
        cands.push({
          name: 'metatron', wire: m.wire,
          contract: m.decoderPrompt.slice(m.wire.length).replace(/^\n/, ''),
          tokens: m.messageTokens, decoded: m.decoded,
        });
      }
    } catch { /* unavailable */ }
  }

  try {
    const p = polytroposEncode(text, enc, { maxConfigs, configBudgetMs: cfgBudget, incumbent: inc, budgetMs });
    if (p.decoded === text) {
      cands.push({
        name: 'polytropos', wire: p.wire,
        contract: p.decoderPrompt.slice(p.wire.length).replace(/^\n/, ''),
        tokens: p.messageTokens, decoded: text,
      });
    }
  } catch { /* unavailable */ }

  let transposed = false, blocks = 0, blockRows = 0;
  let tr: { out: string; blocks: number; rows: number } | null = null;
  try { tr = plinthosEncodeText(text, enc); } catch { tr = null; }
  if (tr) {
    blocks = tr.blocks; blockRows = tr.rows;
    const bare = PL_CLAUSE.trim();
    cands.push({ name: 'plinthos-bare', wire: tr.out, contract: bare, tokens: T(tr.out) + T(bare), decoded: text });
    try {
      const p = polytroposEncode(tr.out, enc, { maxConfigs, configBudgetMs: cfgBudget, useIncumbent: false, budgetMs });
      if (p.decoded === tr.out) {
        const dec = plinthosDecodeText(p.wire.startsWith(CHIRON_START) ? chironDecode(p.wire) : p.wire);
        if (dec === text) {
          const contract = p.decoderPrompt.slice(p.wire.length).replace(/^\n/, '') + PL_CLAUSE;
          cands.push({ name: 'plinthos', wire: p.wire, contract, tokens: T(p.wire) + T(contract), decoded: text });
          transposed = true;
        }
      }
    } catch { /* unavailable */ }
  }

  const valid = cands.filter((c) => c.decoded === text && c.tokens <= inTokens);
  valid.sort((a, b) => a.tokens - b.tokens || a.wire.length - b.wire.length);
  const win = valid[0] ?? cands[0];
  const wireTok = T(win.wire);

  return {
    codec: 'plinthos', wire: win.wire, decoded: win.decoded, exact: true,
    inTokens, outTokens: wireTok, messageTokens: win.tokens,
    contractTokens: win.tokens - wireTok,
    decoderPrompt: win.contract ? win.wire + '\n' + win.contract : win.wire,
    savingsPct: inTokens ? ((inTokens - win.tokens) / inTokens) * 100 : 0,
    winner: win.name, transposed: win.name.startsWith('plinthos'),
    blocks, blockRows, incumbentTokens, ms: Date.now() - t0,
    notes: `winner=${win.name}${transposed ? `; ${blocks} block(s), ${blockRows} rows` : ''}; incumbent ${incumbentTokens} -> ${win.tokens}`,
  };
}

export function plinthosDecode(wire: string): string {
  const inner = wire.startsWith(CHIRON_START) ? chironDecode(wire) : wire;
  return plinthosDecodeText(inner);
}

export const PLINTHOS_SYSTEM_PROMPT =
  'PLINTHOS re-orders every tabular block into column-major form, brackets each with ◆sep ... ◇, and hands the result to the CHIRON stack. The contract travels in the message; no system prompt is required.';
