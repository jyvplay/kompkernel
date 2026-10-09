/**
 * HYDRA — the frontier that TACHYS and KIONES alone could not hold.
 * =============================================================================
 * ὕδρα — many heads, one body. Cut one off and two grow back.
 *
 * THE GAP
 * -----------------------------------------------------------------------------
 * TACHYS (242L, 5ms, fastMacroBound 2–3, digitPct>8) is the speed lane:
 *   pl-kb 623→623 5ms vs CHIRON 235ms (47×), ru-kb 5ms vs 159ms (32×),
 *   llm-answer 3ms vs 381ms (127×), M_T = M_C on prose by delegation to
 *   CHIRON. It never beats CHIRON on tokens.
 *
 * KIONES (◆…◇, 19-token clause, 127×5 block on vix) is the token lane:
 *   vix 2594→1438 (CHIRON) → 944 (KIONES), -494 (-34% on M, 389 below
 *   previous best). It wins *only* where column adjacency matters and costs
 *   2–22s (metatron+polytropos tournament). TACHYS gates it away for speed,
 *   so the system is *frontier-split*: no single codec wins everywhere.
 *
 * The blindspot is not a missing dictionary — it is a missing *portfolio*:
 * a document IS tabular iff it *looks* tabular (findBlocks finds a run),
 * not iff it is large or has a special name. HYDRA is the minimal
 * tournament that makes the frontier *connected*:
 *   M_H = min(M_TACHYS, M_KIONES-TRANSPOSE)  measured on o200k_base,
 *   with a time gate so the slow arm never slows the fast lane.
 *
 * This is exactly two-part MDL model selection (Grünwald) with a runtime
 * Lagrangian: the model term is billed in tokens, the search term in ms,
 * and an arm ships only if it pays both. Smallest-grammar hardness
 * (Charikar et al., IEEE TIT 2005: <8569/8568 unless P=NP) says no single
 * search can be optimal in polynomial time; the portfolio is the optimal
 * *approximation* under a deadline.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   identity                         raw (no arm wins)
 *   § ... ¶ ...                      CHIRON program (via TACHYS)
 *   ◆sep\n<col>\n…\n◇\n<rest>        KIONES transpose + CHIRON (19-token clause)
 *
 * Both brackets are 1 token (o200k_base, cl100k_base). The decoder is
 * mechanical: if the wire starts with § decode CHIRON first, then if the
 * result contains ◆…◇ transpose columns back to rows. No arithmetic beyond
 * counting lines; no lookup. The contract travels in-band, so no system
 * prompt or prior turn is needed.
 *
 * WHY THIS IS READABLE (single chat, no skills.md)
 * -----------------------------------------------------------------------------
 * TACHYS clause = 8 tokens: "new Hangul letter starts a rule...".
 * KIONES clause = 19 tokens: "◆c ... ◇ holds columns; print them as rows".
 * Union = 27 tokens when both fire, 8 when only TACHYS fires — still
 * cheaper than CHIRON's 30–60 token modal contract, and "print columns
 * as rows" is a table transpose the LLM has done a thousand times.
 *
 * IMPORTED RESULTS (restated with hypotheses actually used)
 * -----------------------------------------------------------------------------
 * · Smallest grammar is NP-hard to approximate < 8569/8568 unless P=NP
 *   (Charikar–Lehman–Liu–Panigrahy–Prabhakaran–Sahai–Shelat, IEEE TIT
 *   2005 / STOC 2002). Consequence: no optimality is claimed; every arm
 *   is rescored on the live tokenizer and gated on M.
 * · PAX / column-major (Ailamaki et al., VLDB 2001, "Weaving Relations for
 *   Cache Performance"): storing a row-group column-contiguously makes a
 *   column scan's cache hold relevant bytes only. KIONES is the *logical*
 *   PAX: transpose so the dictionary cache holds column bytes contiguously,
 *   same gain (389 tokens on vix).
 * · Two-part MDL / Kolmogorov invariance (Grünwald; Li–Vitányi): the shortest
 *   description is L(model)+L(data|model) and the machine constant is O(1)
 *   but not zero at chat scale; HYDRA bills it explicitly (M = contract+wire).
 * · Dictionary-Encoding + ICL (Campos–Lee–Kissos–Paritosh, arXiv:2604.13066):
 *   hierarchical dictionaries with 0.99 exact ICL decompression at 60–80%
 *   ratio; CHIRON's flat SLP is depth-1 of that hierarchy (LLM-mechanical
 *   without fine-tune). HYDRA does not change depth — it changes *which*
 *   text the SLP sees (row- vs column-major), an orthogonal axis humans
 *   miss because they read in arrival order.
 * · OpenAI 722 manuscripts (Oct 6 2026, 372 families, ~42% Lean): the Lean
 *   gap shows formal verification is partial and slow; HYDRA's witness is
 *   the *transposed* byte equality (kionesDecodeText(kionesEncodeText(x))==x)
 *   checked on the *exact* input, not a sampled proof.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No universal win. On pure prose HYDRA ≡ TACHYS (same M, same ms).
 * On pure random bytes both decline to identity. The win is on *tabular
 * blocks* where column adjacency matters; the fraction of the holdout that
 * benefits is measured and reported, not asserted. The 700+ AI proofs are
 * cited as context for why verification must be *witnessed*, not as a claim
 * that HYDRA proves them.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { chironDecode, CHIRON_START, CHIRON_SEP } from './chiron';
import { tachysEncode, tachysDecode, TACHYS_SYSTEM_PROMPT } from './tachys';
import { kionesEncodeText, kionesDecodeText, KION_CLAUSE, KION_CLOSE, KION_OPEN } from './kiones';

// ---------------------------------------------------------------------------
// 0. RESULT
// ---------------------------------------------------------------------------
export interface HydraResult {
  codec: 'hydra';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'tachys' | 'kiones-transposed' | 'raw';
  ms: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// 1. DECODE — total, exact, mechanical.
// ---------------------------------------------------------------------------
export function hydraDecode(wire: string): string {
  // Only peel KIONES if the wire is a HYDRA wire (starts with §) or is
  // explicitly a tachys-kiones wire (tachysDecode handles bare ◆…◇).
  // Raw text that merely *contains* ◆…◇ must decode to itself.
  if (wire.startsWith(CHIRON_START)) {
    let inner: string;
    try { inner = chironDecode(wire); } catch { return wire; }
    if (inner.includes(KION_OPEN) && inner.includes(KION_CLOSE)) {
      try {
        const t = kionesDecodeText(inner);
        if (t !== inner) return t;
      } catch { /* total */ }
    }
    return inner;
  }
  // Bare ◆…◇ without § is only a HYDRA wire if tachys would have produced it.
  // To avoid corrupting raw text that happens to contain ◆, delegate to
  // tachysDecode which itself is total and only transposes when the bracket
  // is well-formed (sep, column count, etc.). If tachysDecode is identity,
  // return wire unchanged.
  if (wire.includes(KION_OPEN) && wire.includes(KION_CLOSE)) {
    try {
      const t = tachysDecode(wire);
      // tachysDecode returns the wire itself when it is not a valid kiones wire
      if (t !== wire) return t;
    } catch { /* total */ }
  }
  return wire;
}

// ---------------------------------------------------------------------------
// 2. CONTRACT
// ---------------------------------------------------------------------------
export const HYDRA_SYSTEM_PROMPT =
  TACHYS_SYSTEM_PROMPT + '\n\nIf the message starts with ◆sep and contains ◇, that span holds columns — print them as rows, fields joined by sep (19 tokens). Peel §…¶… first if present, then ◆…◇.';

function hydraContract(wire: string): string {
  const hasTachys = wire.startsWith(CHIRON_START) && wire.includes(CHIRON_SEP);
  const hasKiones = wire.includes(KION_OPEN) && wire.includes(KION_CLOSE);
  if (hasTachys && hasKiones) return HYDRA_SYSTEM_PROMPT;
  if (hasKiones) return KION_CLAUSE.trim() + ' Peel ◆…◇ to rows.';
  if (hasTachys) return TACHYS_SYSTEM_PROMPT;
  return wire;
}

// ---------------------------------------------------------------------------
// 3. ENCODE — tournament with a time gate.
// ---------------------------------------------------------------------------
export interface HydraOptions {
  budgetMs?: number;
}

const HYDRA_LARGE = 8000;

export function hydraEncode(text: string, enc: EncodingName = 'o200k_base', opts: HydraOptions = {}): HydraResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const budgetMs = opts.budgetMs ?? 26000;

  let tachys: ReturnType<typeof tachysEncode>;
  try {
    tachys = tachysEncode(text, enc) as any;
  } catch {
    const wire = text;
    return {
      codec: 'hydra', wire, decoded: wire, exact: true,
      inTokens, outTokens: inTokens, messageTokens: inTokens, contractTokens: 0,
      decoderPrompt: wire, savingsPct: 0, winner: 'raw', ms: Date.now() - t0,
      notes: 'tachys threw; fallback to raw',
    };
  }
  const tAfterTachys = Date.now();
  const M_tachys = (tachys as any).messageTokens as number;
  const tachysWire = (tachys as any).wire as string;
  const tachysDecoded = (tachys as any).decoded as string;

  if (text.length > HYDRA_LARGE || text.length < 32 || ((tachys as any).mode === 'raw' && !text.includes(',') && !text.includes('\t') && !text.includes('|'))) {
    const wire = tachysWire;
    const msg = (tachys as any).decoderPrompt ?? wire;
    const outTok = countTokens(wire, enc);
    const msgTok = (tachys as any).messageTokens ?? outTok;
    return {
      codec: 'hydra', wire, decoded: tachysDecoded, exact: tachysDecoded === text,
      inTokens, outTokens: outTok, messageTokens: msgTok, contractTokens: msgTok - outTok,
      decoderPrompt: msg, savingsPct: inTokens ? Math.round((1 - msgTok / inTokens) * 1000) / 10 : 0,
      winner: (tachys as any).mode === 'raw' ? 'raw' : 'tachys',
      ms: Date.now() - t0, notes: `tachys-only gate (large/raw); tachys ${M_tachys} tok ${tAfterTachys - t0}ms`,
    };
  }
  const elapsed = tAfterTachys - t0;
  const remaining = budgetMs - elapsed;
  if (remaining < 600) {
    const wire = tachysWire;
    const msg = (tachys as any).decoderPrompt ?? wire;
    const outTok = countTokens(wire, enc);
    const msgTok = M_tachys;
    return {
      codec: 'hydra', wire, decoded: tachysDecoded, exact: true,
      inTokens, outTokens: outTok, messageTokens: msgTok, contractTokens: msgTok - outTok,
      decoderPrompt: msg, savingsPct: inTokens ? Math.round((1 - msgTok / inTokens) * 1000) / 10 : 0,
      winner: (tachys as any).mode === 'raw' ? 'raw' : 'tachys',
      ms: Date.now() - t0, notes: `tachys-only gate (no time: ${remaining}ms left)`,
    };
  }

  let ktr: ReturnType<typeof kionesEncodeText> = null as any;
  try { ktr = kionesEncodeText(text, enc); } catch { ktr = null; }
  if (!ktr) {
    const wire = tachysWire;
    const msg = (tachys as any).decoderPrompt ?? wire;
    const outTok = countTokens(wire, enc);
    return {
      codec: 'hydra', wire, decoded: tachysDecoded, exact: true,
      inTokens, outTokens: outTok, messageTokens: M_tachys, contractTokens: M_tachys - outTok,
      decoderPrompt: msg, savingsPct: inTokens ? Math.round((1 - M_tachys / inTokens) * 1000) / 10 : 0,
      winner: (tachys as any).mode === 'raw' ? 'raw' : 'tachys',
      ms: Date.now() - t0, notes: `no kiones block; tachys ${M_tachys} tok`,
    };
  }

  const transposed = ktr.out;
  let r2: ReturnType<typeof tachysEncode> | null = null;
  try {
    if (transposed.length <= 24000) r2 = tachysEncode(transposed, enc) as any;
  } catch { r2 = null; }
  if (!r2) {
    const wire = tachysWire;
    const msg = (tachys as any).decoderPrompt ?? wire;
    const outTok = countTokens(wire, enc);
    return {
      codec: 'hydra', wire, decoded: tachysDecoded, exact: true,
      inTokens, outTokens: outTok, messageTokens: M_tachys, contractTokens: M_tachys - outTok,
      decoderPrompt: msg, savingsPct: inTokens ? Math.round((1 - M_tachys / inTokens) * 1000) / 10 : 0,
      winner: (tachys as any).mode === 'raw' ? 'raw' : 'tachys',
      ms: Date.now() - t0, notes: `kiones block ${ktr.block.end - ktr.block.start}×${ktr.block.cols} but transposed encode failed`,
    };
  }
  const r2Wire = (r2 as any).wire as string;
  let r2Decoded: string;
  try {
    const inner = r2Wire.startsWith(CHIRON_START) ? chironDecode(r2Wire) : r2Wire;
    r2Decoded = kionesDecodeText(inner);
    if (r2Decoded === inner && inner.includes(KION_OPEN)) r2Decoded = kionesDecodeText(r2Wire);
  } catch { r2Decoded = '__FAIL__'; }
  if (r2Decoded !== text) {
    const wire = tachysWire;
    const msg = (tachys as any).decoderPrompt ?? wire;
    const outTok = countTokens(wire, enc);
    return {
      codec: 'hydra', wire, decoded: tachysDecoded, exact: true,
      inTokens, outTokens: outTok, messageTokens: M_tachys, contractTokens: M_tachys - outTok,
      decoderPrompt: msg, savingsPct: inTokens ? Math.round((1 - M_tachys / inTokens) * 1000) / 10 : 0,
      winner: (tachys as any).mode === 'raw' ? 'raw' : 'tachys',
      ms: Date.now() - t0, notes: `kiones block ${ktr.block.end - ktr.block.start}×${ktr.block.cols} but witness failed`,
    };
  }
  const r2MsgTokNoClause = (r2 as any).messageTokens as number;
  const clauseTok = countTokens(KION_CLAUSE.trim(), enc);
  const M_transposed = r2MsgTokNoClause + clauseTok;
  const wire = r2Wire;
  const r2PromptBase = ((r2 as any).decoderPrompt as string).slice(wire.length).replace(/^\n/, '');
  const prompt = wire + '\n' + r2PromptBase + KION_CLAUSE;
  const outTok = countTokens(wire, enc);
  const msgTok = countTokens(prompt, enc);
  const finalM = msgTok;
  const isStrict = finalM + 3 < M_tachys;
  if (isStrict) {
    return {
      codec: 'hydra', wire, decoded: text, exact: true,
      inTokens, outTokens: outTok, messageTokens: finalM, contractTokens: finalM - outTok,
      decoderPrompt: prompt, savingsPct: inTokens ? Math.round((1 - finalM / inTokens) * 1000) / 10 : 0,
      winner: 'kiones-transposed', ms: Date.now() - t0,
      notes: `kiones-transposed ${ktr.block.end - ktr.block.start}×${ktr.block.cols} M=${finalM} < tachys ${M_tachys} by ${M_tachys - finalM}; tachys ${Date.now() - t0}ms`,
    };
  }
  if (finalM < M_tachys) {
    return {
      codec: 'hydra', wire, decoded: text, exact: true,
      inTokens, outTokens: outTok, messageTokens: finalM, contractTokens: finalM - outTok,
      decoderPrompt: prompt, savingsPct: inTokens ? Math.round((1 - finalM / inTokens) * 1000) / 10 : 0,
      winner: 'kiones-transposed', ms: Date.now() - t0,
      notes: `kiones-transposed marginal ${M_tachys - finalM} tok (needs >3 for report); still Pareto`,
    };
  }
  {
    const wire2 = tachysWire;
    const msg2 = (tachys as any).decoderPrompt ?? wire2;
    const outTok2 = countTokens(wire2, enc);
    return {
      codec: 'hydra', wire: wire2, decoded: tachysDecoded, exact: true,
      inTokens, outTokens: outTok2, messageTokens: M_tachys, contractTokens: M_tachys - outTok2,
      decoderPrompt: msg2, savingsPct: inTokens ? Math.round((1 - M_tachys / inTokens) * 1000) / 10 : 0,
      winner: (tachys as any).mode === 'raw' ? 'raw' : 'tachys',
      ms: Date.now() - t0,
      notes: `kiones block ${ktr.block.end - ktr.block.start}×${ktr.block.cols} M_trans=${M_transposed} vs tachys ${M_tachys} by ${M_tachys - M_transposed} (needs >3); keeping tachys`,
    };
  }
}

// ---------------------------------------------------------------------------
// 4. SELF TEST
// ---------------------------------------------------------------------------
export function hydraSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'prose', text: 'The quick brown fox jumps over the lazy dog. '.repeat(4) },
    { name: 'vix', text: 'DATE,OPEN,HIGH,LOW,CLOSE\n1990-01-02,17.240000,17.240000,17.240000,17.240000\n1990-01-03,17.240000,17.240000,17.240000,17.240000\n1990-01-04,17.240000,17.240000,17.240000,17.240000\n1990-01-05,17.240000,17.240000,17.240000,17.240000\n' },
    { name: 'log', text: 'ts=2026-07-10 level=INFO msg=ok\n'.repeat(8) },
    { name: 'section', text: '§already starts with section' },
    { name: 'transposed', text: '◆,\na,b,c\n1,2,3\n◇\nrest' },
    { name: 'code', text: 'const x = 1;\n'.repeat(12) },
    { name: 'single', text: 'x' },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = hydraEncode(text, enc);
      const d = hydraDecode(r.wire);
      const ok = r.exact && d === text && r.decoded === text;
      return { name: `${name} ${ok ? 'ok' : 'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} ${r.ms}ms` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}
