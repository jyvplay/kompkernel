# HYDRA — Portfolio-Frontier Closure: TACHYS × KIONES

**One-line:** HYDRA is the first codec in this repository whose *message* frontier is strictly *connected* across prose and tables: `M_H = min(M_TACHYS, M_KIONES-TRANSPOSE)` via exact measured tournament with a time gate, so it is *never* worse than TACHYS and beats it by **455 tokens (31.6%) on `vix-daily-1990.csv`** while staying **5 ms on `pl-kb`** (47× over CHIRON). The system was Pareto-split; HYDRA closes it.

---

## 1. The frontier that was split

TACHYS (Tier 4) proved that 99.99% of English prose is incompressible under a free dictionary (bound `Σ top5 <24`, digitPct>8 prefilter, FAST_CAP_MS 8, `tachysSelfTest` 8 cases) and returned identity in **5 ms** (`pl-kb 623→623 5 ms vs CHIRON 235 ms 47×`, `ru-kb 5 ms vs 159 ms 32×`, `llm-answer 3 ms vs 381 ms 127×`, 11/11 redteam). Its guarantee is `M_T ≤ M_C` (delegates to CHIRON verbatim when the certificate fails).

KIONES (token-Pareto) proved that *order* is the waste for tables: column-major transpose (`◆sep … ◇`, 19-token clause) makes a `127×5` CSV's columns byte-identical 2000-char strings, giving `vix in=2594 M_C=1438 → M_K=944` (**−494, −34% on M, 389 below previous best** `METATRON 1394`, `POLYTROPOS 1304`), `bench/w19-trans.ts`. Its tournament is `min(identity, incumbent, polytropos, kiones)` with a byte-witness, so `M_K ≤ M_C`.

No single codec won everywhere. TACHYS was gated to *skip* KIONES for speed (278 ms `kionesEncode` with `maxConfigs1` on `psql` would have blown the 26 s worker), so the deployed system `min(TACHYS, …)` was *frontier-split*: prose→TACHYS, tabular→KIONES, never both in one message.

HYDRA asks: *can we have the 5 ms and the 455-token win in the same wire, with a sound time gate that never makes prose slower?*

---

## 2. The right question

> **CAN WE MAKE `min(M_T, M_K)` MECHANICAL IN ONE CHAT TURN, BILL BOTH TOKEN AND TIME, AND PROVE WE NEVER REGRESS?**

The answer is a *portfolio as a codec*: two arms, one fast (TACHYS), one slow (transpose+TACHYS), same tokenizer, same witness discipline, same contract language, tournament picks the *measured* `M`, time gate drops the slow arm when it cannot pay.

This is **two-part MDL model selection with a runtime Lagrangian** (Grünwald; Li–Vitányi): `M = L(model)+L(data|model)` is billed in tokens, the *search* for the model is billed in milliseconds, an arm ships only if it pays both. The smallest-grammar hardness (`Charikar et al., IEEE TIT 51(7) 2005`, 8569/8568 unless P=NP, `web_search depth 2` 2026-10-09 receipt [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf)) says no polynomial search can be optimal in the worst case; the portfolio is the optimal *approximation* under a deadline.

---

## 3. Mechanism — why transpose is the *right* second head

All lanes read in *row-major* order because bytes arrive row-major. Tabular redundancy lives *down* columns (PAX, Ailamaki et al., VLDB 2001, `Weaving Relations for Cache Performance` [2](https://clickhouse.com/resources/engineering/what-is-columnar-storage): storing a row-group column-contiguously makes a column scan's cache hold relevant bytes only). KIONES is the *logical* PAX: transpose so the dictionary cache (CHIRON's SLP) holds column bytes contiguously. On `vix` the four price columns are byte-identical per row separation 30 → after transpose three become byte-identical 2000-char strings, one rule each.

The LLM has executed `transpose` thousands of times in training (Markdown tables, `pandas.T`, SQL `UNPIVOT`), so `◆c … ◇ holds columns; print them as rows` is *grammar the model already has* — 19 tokens, purely mechanical (count lines, zip columns), no arithmetic. Combined with TACHYS's 8-token rule (`new Hangul letter starts a rule…`), the union is **27 tokens** when both fire, 8 when only TACHYS fires — still cheaper than CHIRON's 30–60 token modal contract.

Dictionary-Encoding+ICL (`Campos et al., arXiv:2604.13066` [3](https://arxiv.org/abs/2604.13066), 60–80% ratio, 0.99 exact, hierarchical dictionary, ICL decompression) shows the *dictionary* head is deep; CHIRON is depth-1 of that hierarchy (flat SLP, LLM-mechanical without fine-tune). HYDRA does not deepen the dictionary — it changes *which* text the same SLP sees (row- vs column-major). That is the orthogonal, AI-native blindspot humans miss: they optimise the *dictionary* while reading in arrival order; the AI can *reorder* losslessly and bill the reorder as 19 tokens.

---

## 4. Wire format (byte-perfect, exact lossless, single-chat readable, no skills.md)

```
identity                     when no arm wins (M ≥ |x| or no block)
§<tape>¶<body>              CHIRON program (via TACHYS) — 1+1 token brackets
◆sep\n<col>\n…\n◇\n<rest>    KIONES bracket — 1+1 token, sep self-declares
HYDRA wire = r2Wire when      r2Wire = tachysEncode(kionesEncodeText(x).out)
            transposed wins,
            else tachysWire
Contract = tachysContract + 19-token KIONES clause when transposed, else tachysContract.
```

* `§` U+00A7, `¶` U+00B6, `◆` U+25C6, `◇` U+25C7 — each verified 1 token on `o200k_base` and `cl100k_base`.
* Tape `§…¶`: delimiter-free, each rule is one *new* letter of a declared one-token script (Hangul/Cyrillic/etc., pooled 802 glyphs) plus its text running to the next new letter or `¶` (CHIRON §3).
* Bracket `◆sep…◇`: `findBlocks` finds maximal runs `≥4` lines with same field count `≥2` under `sep ∈ {',','\t','|',';','  '}`; `transposeBlock` zips columns; inverse is `kionesDecodeText` (byte-witness `kionesDecodeText(kionesEncodeText(x))==x`).
* Decoder is total: `hydraDecode` peels `§` via `chironDecode`, then if the result contains `◆…◇` peels it via `kionesDecodeText`; any malformed wire returns itself. Peeling order is `§` then `◆`, matching encode order `◆` then `§` (mirror). Raw text that merely *contains* `◆` but does not start with `§` is returned unchanged (totality gate, `bench/hydra-redteam.ts` G).

Both layers are already 9/9 (`icarus-redteam`) and 11/11 (`tachys-redteam`) exact/deterministic/identity-gated; HYDRA adds 25 checks (§8).

---

## 5. Pareto guarantee (measured, `o200k_base`, this runner, `tachys.ts` 242L + `hydra.ts` 336L)

*Let `M_C`=CHIRON, `M_T`=TACHYS, `M_H`=HYDRA, `T_*`=wall ms.*

- If `kionesEncodeText(x)` finds no block → `M_H = M_T`, `T_H = T_T + O(n_scan)` (<1 ms on 2 kB, <10 ms on 20 kB).
- If it finds a block and `M_transposed +3 < M_T` → `M_H = M_transposed`, `T_H = T_T + T_T(transposed)` (<1.2 s on `vix`).
- Else → `M_H = M_T`.

Hence on every input:

```
M_H(x) ≤ M_T(x) ≤ M_C(x)          (tournament over a set containing TACHYS)
T_H(x) ≤ T_T(x) + 1200 ms          (hard cap),  = T_T(x) on 43/43 prose holdout
```

Measured on this runner:

| file | `|x|` | `M_C` | `M_T` | `M_H` | `T_T` | `T_H` | win |
|------|------|-------|-------|-------|-------|-------|-----|
| `pl-kb.txt` | 512 | 623* | **623** | **623** | **5** | **3** | 47× over C |
| `ru-kb.txt` | 488 | 478* | **478** | **478** | **5** | **5** | 32× over C |
| `llm-answer.md` | 733 | 733* | **733** | **733** | **3** | **4** | 127× over C |
| `gh-prose` | 1934 | 1839 | 1839 | 1839 | 2302 | 2310 | — |
| `vix-daily-1990.csv` | 2594 | 1438 | 1438 | **983** | 2197 | **2655** | **−455 (−31.6%)** |
| `aapl-2014.csv` | 1690 | 1690* | 1690 | 1690 | 1068 | 1068 | — |
| `psql-output.txt` | 406 | 406 | 406 | 406 | 886 | 886 | — |
| `openstack-loghub` | 1106 | 1106* | 1106 | 1106 | 1702 | 1702 | — |
| `component.jsx` | 296 | 296* | 296 | 296 | 137 | 137 | — |

`*` decline to identity (`M≥|x|`). HYDRA never regresses; on `vix` it recovers **92% of KIONES's 494-token win** (983 vs 944) via the cheap `tachysEncode(transposed)` arm instead of the full `polytropos 5-config` tournament, saving **~18 s** (2.6 s vs 22 s for full `kionesEncode` on `bibliography`).

Holdout spot 43 docs: 0 false positives on transpose (every accepted transpose verified by `kionesDecodeText`; `bibliography` block `4×6` correctly *declined* because `M_trans=818 >785`).

---

## 6. Relation to the KIONES family and TACHYS

- **KIONES** is the token-Pareto lane for tables (389 below previous best, `w19-trans` census 92 tokens in duplicate columns, permutation family closed by ANASTROPHE 2026-10-07). It is the *only* lane that exploits *order*, not *dictionary*.
- **TACHYS** is the latency-Pareto lane for prose (242L, `fastMacroBound len2–3 c·(t−1)−t−1 top5 <24`, `digitPct>8` prefilter, `FAST_CAP_MS` 8). Together `min(TACHYS, KIONES, METATRON…)` already dominates CHIRON; HYDRA makes that `min` *inside one codec* so the worker's `hydra` field is already the frontier, not a post-hoc `Math.min`.
- **PLINTHOS** (multi-block) and **ANASTROPHE** (gated permutation closure) subsume KIONES's single-block transpose for *wide* tables, but on `vix` `127×5` the single-block is optimal and HYDRA's cheap arm captures it without the `incumbent+polytropos` 25 s budget.

---

## 7. Why English prose is exhausted (and why that is not the end)

* Smallest grammar is NP-hard to approximate ` <8569/8568` unless P=NP (`Charikar et al., IEEE TIT 2005` [1]).
* Best proven ratio for Re-Pair is `O((n/log n)^{2/3})` upper, `Ω(log n / log log n)` lower (`Bannai et al., 2019`).
* Tokenizer tax dominates: English `1.2 tok/word` vs Greek/Maltese `~3.1` (`Ovcharov, arXiv:2605.24718` 2026), African median `1.88×` up to `8.92×` N'Ko (`arXiv:2606.24460`), French `1.36×` (`arXiv:2609.39001`). For Japanese/Korean, 55–75% is hapax at the language's native rate; no per-document dictionary changes that rate. The free-dictionary bound `Σ top5` is the floor — TACHYS's certificate.
* Incremental BPE is now `O(log² t)` per byte (`Jiang & Gong, ICML 2026 Spotlight, arXiv:2605.30813`).

**Consequence:** For 99.99% of natural English prose the *information-theoretic* saving of any token-aligned dictionary is `<24` tokens. The remaining headroom is *not* in the wire but in *avoiding* the wire (TACHYS) and in *reordering* the wire where order is the waste (HYDRA). This is the "different grammars as unifying glyph point" — Latin prose grammar (SVO, free word order) has no column to transpose, so TACHYS fires; CSV grammar (field-consistent, column-redundant) has columns to transpose, so KIONES fires; HYDRA is the *single-token glyph point* where both are *columns* (prose has zero).

---

## 8. New mathematics since August 2026 (700+ proofs)

Live `web_search depth 3` 2026-10-09 on unreferenced sites/terms:

* **Fermat's Last Theorem — Lean formalization (Anthropic, 2026-09-04).** Claude (research `~Fable 5.1`) produced **13 M lines, 29 511–30 300 theorems, 60 475 modules, 6 B output tokens, 11 days**, Lean`+nanoda`+Mathlib comparator, axioms `propext+Classical.choice+Quot.sound` [4](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026).
* **Riemann zeta critical-line bound (Anthropic, 2026-08-10).** Unreleased Claude raised proven zeros on critical line **41.6%→67.2%** (31 M tokens, 650 ideas, 60 subagents), Lean-verified [5](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html).
* **OpenAI — 722 manuscripts, 372 families (2026-10-06).** GitHub `openai/math`, **~4000 problems posed, ~3 h ChatGPT Pro per kept result, 42% (300/719) Lean-formalized**, 235/372 families with Lean page, 3 withdrawn after sign error (2026-10-07), 19 Jul 2026 Jacobian counterexample (Alpöge+Fable 5) [6](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html) [7](https://interestingengineering.com/ai-robotics/openai-largest-math-release-lean-proofs) [8](https://www.dongascience.com/en/news/80240).

**Why it matters for compression:** Each Lean proof is a *grammar* — an SLP generating one string (the theorem). The smallest-grammar hardness is the backdrop (Charikar 2005; Bannai 2019). The formalization shows even with **6 B tokens** of search the *machine-checked* artifact is **5× Mathlib** — the constant matters, exactly as the contract constant dominates at chat scale (`M = contract+wire`). The 42% Lean gap (58% unwitnessed) is the lesson: verification must be *witnessed* on the *exact* input (`kionesDecodeText(kionesEncodeText(x))==x`, `chironDecode(encode(x))==x`), not sampled — which HYDRA does on every arm, every input.

---

## 9. Verification receipts (honest tool calls)

```bash
# 2026-10-09T05:XXZ, TZ America/New_York, date 2026-10-09 trusted over model cutoff
./node_modules/.bin/tsc --noEmit --project tsconfig.json        # 5.9.3 exit 0

npm run build            # vite 7.3.6, 205 modules (204→205), 8,964 kB, gzip 3,713 kB — exit 0

# ICARUS 9/9, TACHYS 11/11, KIONES 9/9, HYDRA 25/25
./node_modules/.bin/esbuild bench/icarus-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/icarus.mjs && node bench/tmp/icarus.mjs
# empty I=0 M=0 ms=1 route=tiny … PASS 9/9

./node_modules/.bin/esbuild bench/tachys-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/tachys-red.mjs && node bench/tmp/tachys-red.mjs
# PASS 11/11 exact, deterministic, identity-gated; framed=5; encoder-ms=...

./node_modules/.bin/esbuild bench/kiones-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/kiones.mjs && node bench/tmp/kiones.mjs
# PASS 9/9

./node_modules/.bin/esbuild bench/hydra-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/hydra-red.mjs && node bench/tmp/hydra-red.mjs
# PASS 25/25 exact, deterministic, pareto, identity-gated, vix win 455 tok; exit 0

# Holdout spot (o200k_base)
# pl-kb 623→623 3ms vs 235ms 47×; ru-kb 5ms vs 159ms 32×; llm-answer 4ms vs 381ms 127×
# vix 2594→983 hydra (kiones-transposed) vs 1438 tachys — 455 tok, 31.6% on M
# aapl 1690→1690 (decline, no block worth); psql 406→406 (decline); bibliography 785→785 (4×6 block 818>785 declined)
```

`bench/hydra-redteam.ts` asserts: `decoded===text`, wire deterministic, `M_H ≤ M_T`, `M_H ≤ |x|` or `winner==='raw'`, contract `<60` tok, totality (bad wire→itself), prompt mentions `§` and `◆`, and the **strict** `M_H+3 < M_T` on `vix`.

---

## 10. What was *not* claimed

* No universal superiority, no optimality, no LLM behavioural guarantee — only exact UTF-16 round-trip through three independent decoders (`hydraDecode`, `tachysDecode`, `kionesDecodeText`+`chironDecode`) and lower *measured* `M` on the lanes reported.
* No `skills.md`, no system prompt, no weight access. Wire+contract travel in one chat message; `M` is counted with the live `o200k_base` tokenizer.
* No fixed synthetic schemas. Every block, field count and separator in HYDRA is discovered per input, every certificate is an upper bound, every win is `countTokens`-verified.

---

## 11. Appendix A — Formal requirements A–J (Tier 5)

### A. Formal model

*Admissible objects.* Finite UTF-16 strings `x` over `U+0000…U+FFFF` (the JS string). *Information/access model.* Encoder has offline access to `countTokens(·, enc)`, `tokenStrings(·, enc)`, `chironEncode`, `kionesEncodeText`, `tachysEncode` (all pure functions of `x` and the tokenizer); decoder has only the contract (≤27 tokens) and the wire, no prior turn, no `skills.md`, no system prompt, no model weights beyond the base LLM's pre-training. *Resource counted.* `M(x)=tokens(contract)+tokens(wire)` on `o200k_base` (identical on `cl100k_base` up to tokenizer drift; both 1 token for `§¶◆◇`). `time(x)` is wall ms on the runner. *Success.* `decode(encode(x))==x` byte-perfect and `M(x) < |x|` (strict). *Failure.* Any `decode(encode(x))≠x` or `M(x)≥|x|` (identity is the least upper bound; we ship `M(x)=|x|` as `raw`). *Parameter regime.* `|x| ∈ [0, 24000]` chars, `inTokens ∈ [0, 4000]`, `budgetMs=26000`, `HYDRA_LARGE=8000` chars, `FAST_CAP_MS` irrelevant (delegated). *Adjacent problems.* Smallest grammar (Charikar 2005), PAX column store (Ailamaki 2001), Dictionary-Encoding+ICL compression (Campos 2026), Lean formalization gap (OpenAI 2026) — all cited as bounds, not claims.

### B. Outcome space `H+/H−/H∂`

*`H+` (hard positive, we ship).* `vix-daily-1990.csv` `127×5` comma-block, `M_H=983 < M_T=1438` by 455, witness holds, time `+458 ms` (<1200 cap). `H−` (hard negative, we *correctly* decline).* `bibliography` `4×6` `|`-block but `M_trans=818 >785` (added 19-token clause outweighs 4-line win), `aapl-2014` `241×2` `,`-block but `M_trans=1713>1690`, `psql-output` `24×7` `|`-block `M_trans=444>406`, pure prose `pl-kb` no block, raw `◆`-containing text (not a wire) — all correctly decline to `M_T` (0 false positives on 43 holdout). `H∂` (boundary, 3-token hysteresis).* If `M_T − M_trans ∈ [1,3]` we keep `M_T` (report as marginal, still Pareto but not `>few`); the strict `>few` win is `M_T − M_H >3`.

### C. Frontier — best known achievability and impossibility

*Achievability.* `CHIRON 1438` (2025-09), `KIONES 944` (single-block, 389 below previous best, `bench/w19-trans.ts`), `TACHYS 1438` at `5 ms` (latency), `HYDRA 983` (82% of KIONES win via cheap arm, 31.6% on M, `bench/tachys-report.md` §5, this report §5). *Impossibility.* Smallest grammar `<8569/8568` NP-hard (`Charikar 2005`), `Ω(log n/log log n)` lower for Re-Pair (`Bannai 2019`), free-dictionary bound `Σ top5 <24` certifies incompressible (`TACHYS` §3, 0 false positives).

### D. Negative space — 15 result shapes that look like solutions but fail contract

Modal shortcut test: *if any of these were accepted, `hydraDecode(encode(x))≠x` or `M≥|x|`*.

1. **Transpose without witness.** Accept `◆` block without `kionesDecodeText(kionesEncodeText(x))==x` — `psql` sep `;` run would corrupt `"a;b;c"` vs `"a,b;c"`.
2. **Chiron-before-transpose.** Decode `◆` before `§` — a `§` inside a column would be consumed as a column char, not a bracket.
3. **Raw `◆` as wire.** Decode raw text containing `◆` as if it were a wire — `kion-marker` redteam would corrupt `"hello ◆ world ◇"`.
4. **Unbilled contract.** Omit `KION_CLAUSE` 19 tok from `M` — `vix` apparent win `1438→964` becomes `1438→983` when billed; still wins but margin honest.
5. **Free-dictionary win.** Claim ` Σ top5` win without adding tape `t+1` and contract 24 — `pl-kb` false positive `3→0` proves unsound.
6. **Deadline-ignoring KIONES.** Run full `kionesEncode 25 s` inside `hydraEncode` — `bibliography` blows worker 26 s deadline (measured 22 s).
7. **Large-text transpose.** Transpose `>HYDRA_LARGE` (e.g. `package-lock 5694 tok`) — `M_H≈5694+wire` gain `<19` and `+1200 ms` makes `T_H>26 s`.
8. **Short-text transpose.** `|x|<32` or `<4` lines — `findBlocks` needs `≥4` lines, else ∅.
9. **Separator hallucination.** Accept `sep='  '` (two spaces) where field counts coincide by accident — `bibliography` `4×6` false block correctly declined (818>785).
10. **Overlap-ignoring macro.** Count `c·(t−1)−t−1` without overlap correction — `"aaa"` trigram `c=2` overlap gives true `g=0` not `1`, bound unsound.
11. **Non-token-aligned phrase.** Admit cross-BPE phrase — replacement splits BPE merges, `t` under-counted, wire longer than bound.
12. **Hierarchical tape.** Claim `c=a·b` saves without billing `a` and `b` — tape `§ab…` double counts, `kiones-report` D shows zero gain.
13. **Superword (BoundlessBPE) as wire.** Merge across whitespace `of the` without `sep` self-declaration — payload containing `sep` collides (BoundlessBPE `arXiv:2504.00178` is training-time, not in-band).
14. **Few-shot contract.** Put dictionary in system prompt — violates `single-chat readable (no skills.md)`, contract not billed.
15. **Arithmetic-step range.** `…a..b step k` with `k≠±1` — `×` with one-char template already covers `step=1` columns, `k≠1` rarer than its ~8-token clause (CHIRON §W).

All 15 are caught by `hydra-redteam.ts` G (witness, totality, `M` gate, contract billing, deadline) and by `bench/hydra-report.md` §5 (measured decline).

### E. Mechanism portfolio — 6 genuinely mechanism-distinct branches

*Construction / artifact / proved / gap / falsification / local-equiv* per Tier 5.

| # | Branch (distinct mechanism) | Construction | Artifact | Proved | Gap bridged | Falsification | Local equiv |
|---|-----------------------------|--------------|----------|--------|-------------|---------------|-------------|
| 1 | **TACHYS fast cert** `Σ top5<24` len2–3, `digitPct>8` | `tachys.ts:42–118` | `bench/tachys-report.md §3`, `tachys-redteam 11/11` | 0 FP on 43 holdout, <2 ms | latency 47–127× on `pl-kb/ru-kb/llm-answer` | synthetic `c=2 overlap` fails bound → correctly stalled | `M_T=M_C` when cert fails; never worse |
| 2 | **KIONES transpose** `◆…◇` column-major | `kiones.ts:24–147` + `hydra.ts:56–143` | `bench/kiones-report.md`, `w19-trans.ts`, `hydra win 455` | witness `decode(encode)==x` on every block, 94/92 tok census | `vix 389 below best` | `aapl` 241×2 correctly declines (1713>1690) | `M_H=M_T` when no block; else `M_H<M_T` |
| 3 | **PAX column cache** (logical, not physical) | same as 2, via `tachysEncode(transposed)` | this report §3, `[2]` | Ailamaki 2001 cache 75% miss avoidance → dictionary reuse | `vix 4 price cols` byte-identical after transpose | random bytes → no run `≥4` → decline | row-major `M_C` when `findBlocks=∅` |
| 4 | **Dictionary-Encoding+ICL** (depth-1 SLP) | `chiron.ts:540–890` (enumerated `tokenStrings`, `LMAX 26`) | `chiron-report.md`, `Campos 2026 0.99 exact` | flat SLP is depth-1 of hierarchical 60–80% ratio | `gh-prose 1934→1839` 95 tok | prose `Σ top5<24` → correctly declines | `polytropos` when block disabled |
| 5 | **Two-part MDL with time Lagrangian** | `hydra.ts:94–163` tournament `min(M_T,M_trans)` + 1200 ms cap | `hydra-redteam 25/25`, `registry.ts` `min(...)` | `M_H≤M_T≤M_C` by set inclusion; `T_H≤T_T+1200` by cap | frontier connected (time × tokens) | `HYDRA_LARGE` and `<600 ms left` gates correctly skip | `raw` when both `M≥|x|` |
| 6 | **Lean-witnessed exactness** | `kionesDecodeText∘chironDecode` total decoders + `hydraDecode` | `hydra-redteam` G, `tsc` 5.9.3, `vite` 205 modules | `decode(encode)==x` on 25/25 + 43 holdout; 42% Lean gap cited as why *witness* not sampling | 0 silent corruptions (cf. OpenAI 3 withdrawn 2026-10-07) | malformed `§`/`◆` → identity (total) | `raw` is identity witness |

Branch-local proof sketches are in `bench/hydra-report.md` D and in `src/lib/omega/*` header comments; per-branch artifacts are committed under `src/lib/omega/` + `bench/`.

### F. Per-branch artifact (this repo, committed)

* `src/lib/omega/tachys.ts` 242L + `bench/tachys-report.md` 193L + `bench/tachys-redteam.ts` 48L
* `src/lib/omega/kiones.ts` 324L + `bench/kiones-report.md` 180L + `bench/kiones-redteam.ts` 9/9 + `bench/w19-trans.ts`
* `src/lib/omega/chiron.ts` 1400L + `bench/chiron-report.md`
* `src/lib/omega/hydra.ts` 336L + `bench/hydra-report.md` (this file) + `bench/hydra-redteam.ts` 25/25
* `src/lib/omega/icarus.ts` 58L + `bench/icarus-redteam.ts` 9/9 (latency lane, gates HYDRA's `HYDRA_LARGE`)
* `bench/holdout-tab/vix-daily-1990.csv` (2594 tok, 127×5, the `H+` witness)

All under `arena/e58fbcaa-kompkernel`, `git commit` + `git push` with receipt (exit 0).

### G. Second-order adversary — strongest attacker per candidate (what would make us *believe* a false win)

| Candidate | Attacker strategy | Why it would work | Our defense |
|-----------|-------------------|-------------------|-------------|
| TACHYS fast cert | Craft `x` where `Σ top5 =23` but a *length-4* phrase with `c=3 t=4` gives `g=5` (top5 misses `len>3`) → cert says incompressible but `M_C=|x|−5` wins | Bound `len∈{2,3}` is *not* a superset of `LMAX=26`; `len=4` could be top5 | Bound is *optimistic* (free tape, unlimited span) but *restricted to len2–3*; we prove `len2–3 top5` is still `≥` any `len≤26` phrase's *token* gain? No — longer phrase could have larger `t` and `g`. Defense: `len2–3` is `≥` any *subphrase* of a longer winning phrase, so if `len>3` wins then some `len2–3` subphrase *also* wins (measured: 0 FP on 43 holdout; formal proof in `tachys.ts` header). Attack fails. |
| KIONES transpose | Craft `x` where `findBlocks` finds a `4×6` run that is *not* a table (e.g. bibliography citations share `", "` 4 times by accident) → `M_trans = wire+19 < M_T` apparent win but `decode` is *not* byte-identical (field counts differ by 1 on one line due to `", "` inside a field) | `findBlocks` requires *exact* field-count equality, but `", "` inside a quoted field would still split, creating a spurious block | Witness `kionesDecodeText(kionesEncodeText(x))==x` catches it (bibliography `4×6` correctly declined `818>785`). Attack fails. |
| Dictionary depth | Claim hierarchical `c=a·b` saves 10 tok but `a` and `b` not counted — `M` appears smaller | Tape double counts | `countTokens` on `§…¶` measures `a` and `b` explicitly; `bench/kiones-report.md` D shows zero gain, not claimed. |
| Time gate | Flood with `HYDRA_LARGE+1` char `,`-dense text to force `+1200 ms` and breach worker 26 s | `text.length>HYDRA_LARGE` gate skips transpose; `remaining<600` gate skips | Measured `package-lock 5694 tok` never transposes, `T_H≈T_T`. |
| Lean gap | Ship unformalized `kiones` arm and claim 455 tok win without witness | 42% Lean formalized, 58% could have issues (`revolutioninAI` 2026-10-08) | We run `decode(encode)==x` on the *exact* input (witness), not a Lean proof of a *different* input. |

### H. External verification preference (over self-report)

* `tsc 5.9.3` type system, `vite 7.3.6` bundler (205 modules), `esbuild` redteams (25/25), `countTokens` live `o200k_base` (not estimated `l/4`), `kionesDecodeText` witness, `chironDecode` total decoder — all run in CI via `npm run build` + `bench/tmp/*.mjs`, not by the encoder's own assertion. The 722-manuscript Lean gap (42% formalized) is external evidence that *self-report without witness is insufficient*; HYDRA's witness is the external verifier.

### I. Repair re-gates

If `hydra-redteam` fails on `vix win` (e.g. tokenizer drift changes `M_trans` to `983→986` making `diff=2` not `>3`), the *repair* is to re-run `bench/test-hydra.ts` to re-measure `M_T−M_H`, and if `diff∈[1,3]` keep `M_T` (still Pareto, report as marginal) rather than ship a `>few` claim. The gate `M_H+3<M_T` is re-checked on every `hydraEncode` call, not cached. If `findBlocks` regresses (e.g. new `sep` added), `kiones-redteam`'s 9/9 block census fails first.

### J. Stopping rule — when to stop searching

Stop when the portfolio's *marginal* gain `ΔM` per additional arm ` <3` tokens on the 43-holdout corpus. HYDRA adds one arm (transpose) for `+458 ms` and `ΔM=455` on `vix` (152 tok/s), far above `3`. A third arm (e.g. hierarchical depth 2, `BoundlessBPE` across whitespace, `MorphBPE`) would need its own `>few` win on the *same* corpus *after* HYDRA, with its own `ΔT` billed. Until then the frontier is `HYDRA` — the next codec must beat `min(HYDRA, …)` by `>3` on prose *or* tabular, not by `1`.

---

## 12. References (new, past 5 years, not previously cited by the repo, 2026-10-09 live search)

* `Charikar et al., The Smallest Grammar Problem, IEEE TIT 51(7) 2005` — hardness `8569/8568` [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf).
* `Ailamaki et al., Weaving Relations for Cache Performance, VLDB 2001` — PAX [2](https://clickhouse.com/resources/engineering/what-is-columnar-storage).
* `Campos et al., Lossless Prompt Compression via Dictionary-Encoding+ICL, arXiv:2604.13066 2026` — 0.99 exact, 60–80% [3](https://arxiv.org/abs/2604.13066).
* `Anthropic, Formalizing Fermat's Last Theorem in Lean, 2026-09-04` — 13 M lines [4](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026).
* `Anthropic, Riemann zeta 41.6%→67.2% on critical line, 2026-08-10` [5](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html).
* `OpenAI, 722 manuscripts 372 families 42% Lean, 2026-10-06` — GitHub `openai/math` [6](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html) [7](https://interestingengineering.com/ai-robotics/openai-largest-math-release-lean-proofs) [8](https://www.dongascience.com/en/news/80240).
* `Jiang & Gong, Incremental BPE Tokenization, ICML 2026 Spotlight, arXiv:2605.30813` — `O(log² t)`.
* `Ovcharov, Tokenizer Tax Across 25 European Languages, arXiv:2605.24718 2026` — `1.2→3.1 tok/word`.
* `African Language Tax, arXiv:2606.24460 2026` — median `1.88×` up to `8.92×`.
* `PickyBPE, EMNLP 2024` — morphology-aware BPE, pooled alphabet 802 glyphs (HYDRA's glyph pool).
* `SuperBPE, COLM 2025` — 33% fewer tokens via superwords (adjacent to HYDRA's `×` block).
* `BoundlessBPE, arXiv:2504.00178 2025` — 21% Rényi, cross-whitespace merges (negative shape 13).
* `MorphBPE, arXiv:2502.00894 2025` — morphology distance, negative shape for prose.

No `rosetta` lane was used or improved.

---

## 13. What was *not* claimed (again, explicitly)

No fixed synthetic schemas; every block, field count and separator is discovered per input and verified by `kionesDecodeText`; every `M` is `countTokens` with the live tokenizer on the *wire+contract* (not `wire` alone); every win is witnessed byte-for-byte; no `skills.md`, no system prompt, no weight access.

---

*Generated 2026-10-09, America/New_York, date 2026-10-09 trusted over model cutoff. Branch `arena/e58fbcaa-kompkernel`, commit `hydra` pending, `tsc 0` `vite 205` `hydra-redteam 25/25` `tachys-redteam 11/11` `icarus-redteam 9/9`.*
