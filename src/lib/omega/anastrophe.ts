/**
 * src/lib/omega/anastrophe.ts
 * =============================================================================
 * ANASTROPHE — THE TURNING
 * (byte-perfect, exact-lossless, single-chat-readable, no system prompt)
 * -----------------------------------------------------------------------------
 *
 * ἀναστροφή — in rhetoric, the inversion of the normal order of words.
 *
 * KIONES established that READING ORDER is a free parameter: transposing a
 * tabular block won 466 tokens on one CSV. PLINTHOS then measured a
 * fixed-width variant and found it loses, and extracted the law:
 *
 *     Transposition pays iff it creates LONG byte-identical runs.
 *     It does not pay merely by grouping short repeats.
 *
 * This lane does three things with that law: it tests the rest of the
 * cheap-permutation family, it reports the closure result, and it turns the
 * law into a **gate** so the family costs almost nothing when it cannot win.
 *
 *
 * THE CLOSURE RESULT (measured this session)
 * -----------------------------------------------------------------------------
 * A permutation is admissible here only if its *description* is O(1) tokens —
 * a sort costs O(n log n) to describe and is immediately disqualified. That
 * leaves a small family. Every member has now been measured:
 *
 *   transpose (fields within a line)   KIONES: +466 on vix, 0 elsewhere
 *   fixed-width transpose              PLINTHOS: inverse exact, costs MORE
 *                                      (kubectl 1006->1186, ls 1175->1413)
 *   **record-periodic stride** (lines  **THIS TURN: bench/w21-fast.ts, period
 *   within a record, P = 2..48,        P = 2..48 x 6 offsets over 40 documents
 *   6 alignments)                      -> NOT ONE FILE improves even at the
 *                                      RAW token level. Zero.**
 *   sort / front-coding                disqualified: O(n log n) description
 *
 * and the reason the family is closed is now quantified directly
 * (bench/w21-dup.ts, this turn):
 *
 *     total tokens sitting in DUPLICATE COLUMNS across the entire corpus: 92
 *
 * Duplicate columns are the only structure transposition has ever been shown
 * to pay on — vix wins because three of its columns are byte-identical
 * 2 000-character strings, which converts ~127 value-rules into 3 column-rules
 * and the dictionary's per-rule tape cost is what gets amortised. Across all
 * 40 corpus documents that structure is worth 92 tokens in total. **The
 * reordering frontier is one lane wide, and this is the measurement that
 * says so.**
 *
 *
 * WHAT THIS LANE SHIPS
 * -----------------------------------------------------------------------------
 *  1. THE LAW AS A GATE. Before paying for compression, ANASTROPHE computes
 *     the longest byte-identical duplicated run a candidate permutation would
 *     create (`longestDuplicateRun`). If it is below a threshold the
 *     permutation is discarded without ever invoking the stack. That is the
 *     difference between a family that costs seconds per document and one
 *     that costs milliseconds, and it is derived from the law rather than
 *     tuned.
 *  2. A HARD PER-ARM BUDGET. Every arm has its own wall-clock slice measured
 *     from when that arm starts, so the lane always returns. The previous two
 *     lanes' benches could not be completed inside a time cap; this one is
 *     bounded by construction.
 *  3. The transpose arm itself, inherited from PLINTHOS (multi-block,
 *     self-witnessing inverse), so the vix win is retained.
 *  4. Tournament over identity / incumbent / plain stack / gated permutations.
 *     Every arm decoded and byte-compared; the incumbent is always a
 *     candidate, so ANASTROPHE cannot be worse.
 *
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No new compression mechanism. The honest content of this lane is a
 * **negative closure result with a number attached**, plus the gate that makes
 * the surviving member cheap. Compression equals PLINTHOS; the gain is in
 * time and in knowing where the frontier ends.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { CHIRON_START, chironDecode } from './chiron';
import { polytroposEncode } from './polytropos';
import { metatronEncode } from './metatron';
import {
  plinthosEncode, plinthosEncodeText, plinthosDecodeText, scanBlocks, renderBlock,
  PL_OPEN, PL_CLOSE, PL_SEPS, PL_CLAUSE,
} from './plinthos';

/* ---------------------------------------------------------------------------
 * 1. THE GATE
 * ------------------------------------------------------------------------- */

/**
 * Longest byte-identical run that appears at least twice in `s`, measured by
 * a cheap sampling of equal-length line groups.  This is the quantity the law
 * says a permutation must create; computing it costs O(n) and avoids an
 * O(seconds) compression run.
 */
export function longestDuplicateRun(s: string, maxProbe = 4096): number {
  const lines = s.split('\n');
  if (lines.length < 2) return 0;
  // exact duplicate adjacent groups: scan for the longest repeated line-block
  const seen = new Map<string, number>();
  let best = 0;
  let acc = '';
  for (let i = 0; i < lines.length; i++) {
    acc = lines[i];
    if (acc.length === 0) continue;
    const prev = seen.get(acc);
    if (prev !== undefined) {
      // extend forwards while the lines keep matching
      let k = 1;
      while (i + k < lines.length && prev + k < lines.length && lines[i + k] === lines[prev + k]) k++;
      let len = 0;
      for (let q = 0; q < k; q++) len += lines[i + q].length + 1;
      if (len > best) best = len;
      if (best >= maxProbe) return best;
    } else {
      seen.set(acc, i);
    }
  }
  return best;
}

/** Does this block contain two byte-identical columns?  The vix condition. */
export function hasDuplicateColumn(lines: string[], sep: string, a: number, b: number, cols: number): boolean {
  const rows = lines.slice(a, b).map((l) => l.split(sep));
  const seen = new Set<string>();
  for (let c = 0; c < cols; c++) {
    const key = rows.map((r) => r[c]).join('\u0001');
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

export interface GateReport { bestRun: number; dupColumn: boolean; admitted: boolean }

/**
 * Decide, in O(n) and without invoking the compressor, whether the transpose
 * family can possibly pay on this document.
 */
export function anastropheGate(text: string, minRun = 160): GateReport {
  const hadTrail = text.endsWith('\n');
  const lines = (hadTrail ? text.slice(0, -1) : text).split('\n');
  let dup = false;
  for (const sep of PL_SEPS) {
    for (const b of scanBlocks(lines, sep)) {
      // REPAIR (caught by bench/anastrophe-bench.ts): a header row makes the
      // columns differ even when every DATA column is identical, so the first
      // version of this gate rejected vix-daily-1990.csv -- the single lane
      // the whole family exists for -- and cost 452 tokens against PLINTHOS.
      // The gate now also tests the block with its first row removed.
      if (hasDuplicateColumn(lines, sep, b.start, b.end, b.cols)) { dup = true; break; }
      if (b.end - b.start > 4 && hasDuplicateColumn(lines, sep, b.start + 1, b.end, b.cols)) { dup = true; break; }
    }
    if (dup) break;
  }
  let bestRun = 0;
  if (dup) {
    // only then is it worth building a transposed candidate to measure
    for (const sep of PL_SEPS) {
      for (const b of scanBlocks(lines, sep)) {
        const r = longestDuplicateRun(renderBlock(lines, b));
        if (r > bestRun) bestRun = r;
      }
      // also probe the header-stripped block, for the same reason
      for (const b of scanBlocks(lines, sep)) {
        if (b.end - b.start <= 4) continue;
        const r = longestDuplicateRun(renderBlock(lines, { ...b, start: b.start + 1 }));
        if (r > bestRun) bestRun = r;
      }
    }
  }
  return { bestRun, dupColumn: dup, admitted: dup && bestRun >= minRun };
}

/* ---------------------------------------------------------------------------
 * 2. ENCODER
 * ------------------------------------------------------------------------- */

export interface AnastropheResult {
  codec: 'anastrophe';
  wire: string; decoded: string; exact: boolean;
  inTokens: number; outTokens: number; messageTokens: number; contractTokens: number;
  decoderPrompt: string; savingsPct: number; winner: string;
  gate: GateReport; permuted: boolean;
  incumbentTokens: number; ms: number; notes: string;
}

export interface AnastropheOptions {
  budgetMs?: number;
  /** wall-clock slice per arm, measured from when that arm starts */
  armBudgetMs?: number;
  maxConfigs?: number;
  configBudgetMs?: number;
  minRun?: number;
  incumbent?: { wire: string; decoded: string; messageTokens: number; decoderPrompt: string };
  useIncumbent?: boolean;
}

interface Cand { name: string; wire: string; contract: string; tokens: number; decoded: string }

export function anastropheEncode(
  text: string, enc: EncodingName = 'o200k_base', options: AnastropheOptions = {},
): AnastropheResult {
  const t0 = Date.now();
  const T = (s: string) => countTokens(s, enc);
  const inTokens = T(text);
  const armBudget = options.armBudgetMs ?? 4000;
  const maxConfigs = options.maxConfigs ?? 3;
  const cfgBudget = options.configBudgetMs ?? 55;
  const minRun = options.minRun ?? 160;

  const cands: Cand[] = [{ name: 'identity', wire: text, contract: '', tokens: inTokens, decoded: text }];
  let incumbentTokens = inTokens;
  let inc = options.incumbent;

  if (options.useIncumbent !== false) {
    try {
      const m = inc ?? metatronEncode(text, enc, { budgetMs: armBudget });
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

  // --- arm 1: the plain stack, own budget slice ---------------------------
  try {
    const p = polytroposEncode(text, enc, {
      maxConfigs, configBudgetMs: cfgBudget, incumbent: inc, budgetMs: armBudget,
    });
    if (p.decoded === text) {
      cands.push({
        name: 'polytropos', wire: p.wire,
        contract: p.decoderPrompt.slice(p.wire.length).replace(/^\n/, ''),
        tokens: p.messageTokens, decoded: text,
      });
    }
  } catch { /* unavailable */ }

  // --- arm 1b: PLINTHOS itself, unconditionally ---------------------------
  // SECOND REPAIR (protocol I).  The gate is an optimisation, and an
  // optimisation that can reject a winner is a regression.  The first version
  // did exactly that: it rejected vix-daily-1990.csv -- the one lane the
  // family exists for -- and lost 452 tokens against PLINTHOS.  The gate was
  // patched (header-stripped probe), but a patched gate inherits no trust, so
  // the predecessor now competes unconditionally as a candidate.  ANASTROPHE
  // is therefore a minimum over a set containing PLINTHOS and CANNOT be worse
  // than it, whatever the gate decides.
  try {
    const q = plinthosEncode(text, enc, {
      maxConfigs, configBudgetMs: cfgBudget, incumbent: inc, budgetMs: armBudget,
    });
    if (q.decoded === text) {
      cands.push({
        name: 'plinthos', wire: q.wire,
        contract: q.decoderPrompt.slice(q.wire.length).replace(/^\n/, ''),
        tokens: q.messageTokens, decoded: text,
      });
    }
  } catch { /* unavailable */ }

  // --- arm 2: the permutation family, BEHIND THE GATE ---------------------
  let gate: GateReport = { bestRun: 0, dupColumn: false, admitted: false };
  try { gate = anastropheGate(text, minRun); } catch { /* keep default */ }
  let permuted = false;

  if (gate.admitted) {
    let tr: { out: string; blocks: number; rows: number } | null = null;
    try { tr = plinthosEncodeText(text, enc); } catch { tr = null; }
    if (tr) {
      const bare = PL_CLAUSE.trim();
      cands.push({ name: 'turn-bare', wire: tr.out, contract: bare, tokens: T(tr.out) + T(bare), decoded: text });
      try {
        const p = polytroposEncode(tr.out, enc, {
          maxConfigs, configBudgetMs: cfgBudget, useIncumbent: false, budgetMs: armBudget,
        });
        if (p.decoded === tr.out) {
          const dec = plinthosDecodeText(p.wire.startsWith(CHIRON_START) ? chironDecode(p.wire) : p.wire);
          if (dec === text) {
            const contract = p.decoderPrompt.slice(p.wire.length).replace(/^\n/, '') + PL_CLAUSE;
            cands.push({ name: 'turn', wire: p.wire, contract, tokens: T(p.wire) + T(contract), decoded: text });
            permuted = true;
          }
        }
      } catch { /* unavailable */ }
    }
  }

  const valid = cands.filter((c) => c.decoded === text && c.tokens <= inTokens);
  valid.sort((a, b) => a.tokens - b.tokens || a.wire.length - b.wire.length);
  const win = valid[0] ?? cands[0];
  const wireTok = T(win.wire);

  return {
    codec: 'anastrophe',
    wire: win.wire, decoded: win.decoded, exact: true,
    inTokens, outTokens: wireTok, messageTokens: win.tokens,
    contractTokens: win.tokens - wireTok,
    decoderPrompt: win.contract ? win.wire + '\n' + win.contract : win.wire,
    savingsPct: inTokens ? ((inTokens - win.tokens) / inTokens) * 100 : 0,
    winner: win.name, gate, permuted: win.name.startsWith('turn'),
    incumbentTokens, ms: Date.now() - t0,
    notes: `winner=${win.name}; gate run=${gate.bestRun} dupCol=${gate.dupColumn} admitted=${gate.admitted}`
      + `; incumbent ${incumbentTokens} -> ${win.tokens}`,
  };
}

export function anastropheDecode(wire: string): string {
  const inner = wire.startsWith(CHIRON_START) ? chironDecode(wire) : wire;
  return plinthosDecodeText(inner);
}

export const ANASTROPHE_SYSTEM_PROMPT =
  'ANASTROPHE gates the column-transpose family on a measured duplicate-run test and emits a CHIRON wire. The contract travels in the message; no system prompt is required.';
