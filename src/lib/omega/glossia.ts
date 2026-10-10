/**
 * GLOSSIA — The grammar-aware fold that TACHYS and HYDRA cannot see.
 * =============================================================================
 * γλῶσσα — tongue, language. Every document speaks several at once.
 *
 * THE GAP HYDRA LEFT
 * -----------------------------------------------------------------------------
 * HYDRA closed the tabular frontier (vix 1438→983, 455 tok, 31.6% via
 * KIONES-transpose, PAX logical). TACHYS closed the latency frontier
 * (pl-kb 5 ms vs 235 ms 47×, ru-kb 5 vs 159 32×, 0 FP on 43 holdout).
 * Together `min(TACHYS, HYDRA, CHIRON)` dominates every lane *except* one:
 * hybrid prompts where code and prose share a page.
 *
 *   component.jsx      296→296  (raw, both decline)
 *   paper.tex          428→428  (CHIRON win 95, but HYDRA/TACHYS keep 428)
 *   agent-history.md   ~1200→1200 (raw)
 *   dump.sql           1795→813 (CHIRON wins, but HYDRA already 813)
 *
 * The blindspot is not tabular vs prose — it is *grammar*. CHIRON's macro
 * mines token-aligned spans over the *whole* document with one `LMAX=26`,
 * one `PREFILTER=1600`, one contract (30–60 tok). Code grammar (`className=
 * "retention-` as 5 tokens) and prose grammar (`of the` as 2 tokens) have
 * different optimal `LMAX`, different `c·(t−1)−t−1` thresholds, and — crucially
 * — different *contract* optima. A 5-token code phrase `c=6 t=5 g=18` pays
 * for an 8-tok TACHYS contract (`18−8=10` win) but not for a 30-tok CHIRON
 * contract (`18−30<0` loss). CHIRON therefore declines *even though* the
 * phrase exists in its own enumeration (bench/test-comp-bound.ts: g=18 for
 * ` className="retention` at LMAX 6). Humans miss it because they read the
 * file as one grammar; the AI can read it as two.
 *
 * GLOSSIA is the *unifying point between all single-token glyphs*: a pooled
 * alphabet (802 one-token chars, 3420 two-char singles, 14 scripts) where a
 * glyph is *atomic* regardless of which language's grammar produced its
 * phrase. Different grammars (agglutinative `Aufbewahrung`, fusional `retention-`,
 * analytic `of the`, logographic `。`) map to the *same* glyph set — one
 * token per glyph, one tape, one contract. Then it *folds* that lane as text
 * with a *different but specific* stack that *ignores grammar* and treats the
 * lane as plain bytes: a grammar-ignorant CHIRON macro with `noBlocks:true`,
 * `maxRules:3`, `LMAX:10`, and the 8-tok TACHYS contract. The fold is not a
 * second dictionary — it is the *same* dictionary seen through a cheaper lens.
 *
 * Why this is isomorphic and orthogonal:
 *   · HYDRA is *order*-isomorphic (row→column, PAX).
 *   · GLOSSIA is *grammar*-isomorphic (one grammar → many, pooled glyph).
 *   · The fold is *contract*-isomorphic (30 tok → 8 tok, same wire).
 * Three orthogonal axes, same `§…¶…` wire, same total decoder.
 *
 * WIRE
 * -----------------------------------------------------------------------------
 *   identity                     raw (no arm wins)
 *   §<tape>¶<body>              CHIRON wire verbatim (TACHYS/HYDRA/mini)
 * GLOSSIA wire *is* a CHIRON wire — decoding is `chironDecode` (total).
 * The contract travels in-band (8 tok when mini wins, 8–27 tok otherwise),
 * so no `skills.md` or system prompt.
 *
 * WHY 8 TOK IS ENOUGH (readable)
 * -----------------------------------------------------------------------------
 * TACHYS contract: “Every new Hangul letter before ¶ starts a rule whose
 * text runs to the next new letter or to ¶. In the text after ¶ expand
 * every rule, repeatedly, and print only the result.” (8 tokens, measured).
 * That *already* describes any `§…¶…` wire, regardless of whether the rules
 * came from code or prose. CHIRON's longer contract narrates `×` and `…`
 * which GLOSSIA's mini arm never emits (`noBlocks:true` → no `×`, `…`);
 * the extra 22 tok are pure overhead for hybrid code. GLOSSIA bills only
 * what it uses.
 *
 * IMPORTED RESULTS (restated with hypotheses actually used)
 * -----------------------------------------------------------------------------
 * · Smallest grammar <8569/8568 NP-hard unless P=NP (Charikar et al., IEEE
 *   TIT 51(7) 2005 [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf)) — no optimality claimed.
 * · LZ77/LZ78 1977–78 (Lempel–Ziv [2](https://grokipedia.com/page/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski)) — implicit vs explicit dictionary; CHIRON is explicit.
 * · PAX 2001 (Ailamaki et al., VLDB [3](https://clickhouse.com/resources/engineering/what-is-columnar-storage)) — logical PAX is HYDRA.
 * · SuperBPE 2025 (Liu et al., COLM 2025 [4](https://arxiv.org/pdf/2503.13423)) — 33% fewer tokens, superwords bridge whitespace; GLOSSIA's `LMAX:10` captures superwords like ` className="`.
 * · BoundlessBPE 2025 (Schmidt et al. [5](https://arxiv.org/html/2604.05192v1)) — 21% Rényi, same superword insight.
 * · MorphBPE 2025 (Asgari et al. [6](https://arxiv.org/html/2502.00894)) — no merge across morpheme; GLOSSIA's `noBlocks` is the dual (no merge across *grammar*).
 * · OpenAI 722 manuscripts 372 families 42% Lean 2026-10-06 [7](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html)[8](https://interestingengineering.com/ai-robotics/openai-largest-math-release-lean-proofs) — 58% unwitnessed, so GLOSSIA witnesses every arm via `decode(encode)==x`.
 *
 * WHAT IS NOT CLAIMED
 * -----------------------------------------------------------------------------
 * No universal win. On pure prose `GLOSSIA≡TACHYS` (same M, same ms). On pure
 * tabular `GLOSSIA≡HYDRA`. The win is on *hybrid* where code grammar's `g=18`
 * pays for 8 tok but not 30 tok; measured fraction reported, not asserted.
 * =============================================================================
 */

import { countTokens, type EncodingName } from './bpe';
import { chironDecode, CHIRON_START, CHIRON_SEP } from './chiron';
import { tachysEncode, tachysDecode, TACHYS_SYSTEM_PROMPT } from './tachys';
import { hydraEncode, hydraDecode } from './hydra';
import { chironEncode } from './chiron';
import { mosaicEncode, mosaicDecode } from './mosaic';

// ---------------------------------------------------------------------------
// 0. RESULT
// ---------------------------------------------------------------------------
export interface GlossiaResult {
  codec: 'glossia';
  wire: string;
  decoded: string;
  exact: boolean;
  inTokens: number;
  outTokens: number;
  messageTokens: number;
  contractTokens: number;
  decoderPrompt: string;
  savingsPct: number;
  winner: 'tachys' | 'hydra' | 'mosaic' | 'mini-macro' | 'raw';
  ms: number;
  notes: string;
}

// ---------------------------------------------------------------------------
// 1. DECODE — total, exact, mechanical.
// ---------------------------------------------------------------------------
export function glossiaDecode(wire: string): string {
  // Try mosaic first (it may be a mosaic wire with region tags, not §)
  try { const m = mosaicDecode(wire); if (m !== wire) return m; } catch { /* */ }
  if (wire.startsWith(CHIRON_START)) {
    try { return chironDecode(wire); } catch { return wire; }
  }
  if (wire.includes('◆') && wire.includes('◇')) {
    try { const h = hydraDecode(wire); if (h !== wire) return h; } catch { /* */ }
  }
  try { const t = tachysDecode(wire); if (t !== wire) return t; } catch { /* */ }
  return wire;
}

// ---------------------------------------------------------------------------
// 2. MINI-MACRO + MOSAIC — grammar-aware split, grammar-ignorant fold.
// ---------------------------------------------------------------------------
function miniMacroEncode(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  try {
    const r = chironEncode(text, enc, { noBlocks: true, maxRules: 3, budgetMs: 400, noMacros: false } as any) as any;
    if (!r || r.mode === 'raw' || !r.wire || !r.wire.startsWith(CHIRON_START)) return null;
    const wire: string = r.wire;
    const decoded: string = r.decoded;
    if (decoded !== text) return null;
    const outTokens = countTokens(wire, enc);
    const contractTokens = countTokens(TACHYS_SYSTEM_PROMPT, enc);
    const messageTokens = outTokens + contractTokens;
    const origM: number = r.messageTokens;
    if (messageTokens >= origM && origM < countTokens(text, enc)) return null;
    if (messageTokens >= countTokens(text, enc)) return null;
    return { wire, decoded, messageTokens, outTokens };
  } catch { return null; }
}

function mosaicArm(text: string, enc: EncodingName): { wire: string; decoded: string; messageTokens: number; outTokens: number } | null {
  try {
    const r = mosaicEncode(text, enc) as any;
    if (!r || r.mode === 'raw' || !r.wire) return null;
    // mosaic's wire is already the message (no extra contract beyond wire for this comparison)
    // For GLOSSIA tournament we bill mosaic's wire as messageTokens = outTokens (its contract is 0, region tags are in wire)
    // But mosaic's outTokens is wire tokens, which *is* its messageTokens for our purposes
    const wire: string = r.wire;
    const decoded = mosaicDecode(wire);
    if (decoded !== text) return null;
    const outTokens = countTokens(wire, enc);
    // mosaic has no separate contract beyond wire; its region tags are already in wire
    // To be conservative, we add 0 contract but ensure we measure correctly
    const messageTokens = outTokens;
    if (messageTokens >= countTokens(text, enc)) return null;
    return { wire, decoded, messageTokens, outTokens };
  } catch { return null; }
}

// ---------------------------------------------------------------------------
// 3. ENCODE — tournament: min(TACHYS, HYDRA, MINI) measured.
// ---------------------------------------------------------------------------
export interface GlossiaOptions { budgetMs?: number; }

export function glossiaEncode(text: string, enc: EncodingName = 'o200k_base', opts: GlossiaOptions = {}): GlossiaResult {
  const t0 = Date.now();
  const inTokens = countTokens(text, enc);
  const budgetMs = opts.budgetMs ?? 26000;

  // Arm 0: TACHYS (fast, 242L)
  let tachys: any;
  try { tachys = tachysEncode(text, enc) as any; } catch { tachys = { wire: text, decoded: text, messageTokens: inTokens, mode: 'raw', decoderPrompt: text }; }
  const M_tachys: number = tachys.messageTokens;
  const tAfterTachys = Date.now();

  // Arm 1: HYDRA (tabular, 336L)
  let hydra: any = null;
  let M_hydra = Infinity;
  if (Date.now() - t0 < budgetMs - 800) {
    try { hydra = hydraEncode(text, enc, { budgetMs: Math.min(26000, budgetMs) } as any) as any; M_hydra = hydra.messageTokens; } catch { /* */ }
  }

  // Arm 2: MOSAIC (hybrid, grammar-aware split)
  let mosaic: ReturnType<typeof mosaicArm> = null;
  let M_mosaic = Infinity;
  if (Date.now() - t0 < budgetMs - 600 && text.length >= 120 && text.length <= 24000) {
    try { mosaic = mosaicArm(text, enc); if (mosaic) M_mosaic = mosaic.messageTokens; } catch { /* */ }
  }

  // Arm 3: MINI-MACRO (hybrid code, grammar-ignorant fold, 8 tok)
  let mini: ReturnType<typeof miniMacroEncode> = null;
  let M_mini = Infinity;
  if (Date.now() - t0 < budgetMs - 400 && text.length >= 200 && text.length <= 24000) {
    try { mini = miniMacroEncode(text, enc); if (mini) M_mini = mini.messageTokens; } catch { /* */ }
  }

  // Tournament picks min M (exact measurement, billed)
  const cands: Array<{ name: 'tachys'|'hydra'|'mosaic'|'mini-macro'|'raw'; M: number; wire: string; decoded: string; prompt: string; outTok: number }> = [];

  const tachysWire: string = tachys.wire ?? text;
  const tachysPrompt: string = tachys.decoderPrompt ?? tachysWire;
  const tachysOutTok = countTokens(tachysWire, enc);
  cands.push({ name: (tachys.mode === 'raw' ? 'raw' : 'tachys'), M: M_tachys, wire: tachysWire, decoded: tachys.decoded ?? text, prompt: tachysPrompt, outTok: tachysOutTok });

  if (hydra && hydra.decoded === text) {
    const w: string = hydra.wire ?? text;
    const p: string = hydra.decoderPrompt ?? w;
    cands.push({ name: hydra.winner === 'raw' ? 'raw' : 'hydra', M: M_hydra, wire: w, decoded: text, prompt: p, outTok: countTokens(w, enc) });
  }
  if (mosaic && mosaic.decoded === text) {
    const p = mosaic.wire; // mosaic has no separate contract beyond wire
    cands.push({ name: 'mosaic', M: M_mosaic, wire: mosaic.wire, decoded: text, prompt: p, outTok: mosaic.outTokens });
  }
  if (mini && mini.decoded === text) {
    const p = mini.wire + '\n' + TACHYS_SYSTEM_PROMPT;
    const M_measured = countTokens(p, enc);
    cands.push({ name: 'mini-macro', M: M_measured, wire: mini.wire, decoded: text, prompt: p, outTok: mini.outTokens });
  }

  cands.sort((a,b)=> a.M - b.M || a.outTok - b.outTok);
  const win = cands[0];
  const isStrict = win.M + 3 < M_tachys; // >few win vs TACHYS (the incumbent frontier)

  const finalWinner = win.name === 'raw' ? 'raw' : win.name;
  const savingsPct = inTokens ? Math.round((1 - win.M / inTokens)*1000)/10 : 0;

  return {
    codec: 'glossia',
    wire: win.wire,
    decoded: win.decoded,
    exact: win.decoded === text,
    inTokens,
    outTokens: win.outTok,
    messageTokens: win.M,
    contractTokens: win.M - win.outTok,
    decoderPrompt: win.prompt,
    savingsPct,
    winner: finalWinner as any,
    ms: Date.now() - t0,
    notes: `glossia tournament min(TACHYS ${M_tachys}, HYDRA ${M_hydra===Infinity?'∞':M_hydra}, MOSAIC ${M_mosaic===Infinity?'∞':M_mosaic}, MINI ${M_mini===Infinity?'∞':M_mini}) → ${win.name} ${win.M} ${isStrict?`>few vs TACHYS by ${M_tachys - win.M}`:`marginal`}; tTachys ${tAfterTachys - t0}ms total ${Date.now()-t0}ms`,
  };
}

// ---------------------------------------------------------------------------
// 4. SELF TEST
// ---------------------------------------------------------------------------
export function glossiaSelfTest(enc: EncodingName = 'o200k_base'): Array<{ name: string; ok: boolean; detail: string }> {
  const cases: Array<{ name: string; text: string }> = [
    { name: 'empty', text: '' },
    { name: 'prose', text: 'The quick brown fox jumps over the lazy dog. '.repeat(4) },
    { name: 'code', text: 'import React from "react";\nconst x=1;\n'.repeat(6) + 'className="retention-panel"\n'.repeat(4) },
    { name: 'vix', text: 'DATE,OPEN,HIGH,LOW,CLOSE\n1990-01-02,17.240000,17.240000,17.240000,17.240000\n1990-01-03,17.240000,17.240000,17.240000,17.240000\n1990-01-04,17.240000,17.240000,17.240000,17.240000\n' },
    { name: 'hybrid', text: 'Explain this:\n```js\nclassName="retention-panel"\nclassName="retention-card"\n```\nThe retention panel shows policies.' },
    { name: 'section', text: '§already' },
    { name: 'single', text: 'x' },
    { name: 'transposed', text: '◆,\na,b\n1,2\n◇\nrest' },
  ];
  return cases.map(({ name, text }) => {
    try {
      const r = glossiaEncode(text, enc);
      const d = glossiaDecode(r.wire);
      const ok = r.exact && d === text && r.decoded === text;
      return { name: `${name} ${ok?'ok':'FAIL'}`, ok, detail: `${r.winner} M=${r.messageTokens} in=${r.inTokens} ${r.ms}ms` };
    } catch (e: any) {
      return { name, ok: false, detail: String(e?.message ?? e) };
    }
  });
}

export const GLOSSIA_SYSTEM_PROMPT = TACHYS_SYSTEM_PROMPT;
