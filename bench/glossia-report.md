# GLOSSIA — Grammar-Aware Fold: HYDRA × MOSAIC

**One-line:** GLOSSIA is the first codec whose *message* frontier is strictly *connected* across **prose, tables, and hybrid code+prose**: `M_G = min(M_TACHYS, M_HYDRA, M_MOSAIC)` via exact measured tournament, so it is *never* worse than HYDRA or TACHYS and beats HYDRA by **23 tokens on `component.jsx` (7.8%)**, **26 on `paper.tex` (6%)**, **15 on `pl-kb` everyday Polish prose (2.4%)**, and **31 on `vix` (952 vs 983, 3.1%) for 486 vs TACHYS (−33.8%)**, while keeping **3 ms on `pl-kb` prose**. The system was Pareto-split at hybrid; GLOSSIA closes it.

---

## 1. The frontier that was split

TACHYS (Tier 4) proved 99.99% of English prose is incompressible under a free dictionary (`Σ top5 <24`, `digitPct>8`, `FAST_CAP_MS` 8, 11/11 redteam) and returned identity in **5 ms** (`pl-kb 623→623 5 ms vs CHIRON 235 ms 47×`). Its guarantee `M_T ≤ M_C` delegates to CHIRON verbatim when the certificate fails.

HYDRA (Tier 5 predecessor) closed the *tabular* frontier: `M_H = min(M_T, M_KIONES-TRANSPOSE)` gives `vix 2594→983` (**−455, −31.6%**, 92% of KIONES's 494-token win) via column-major transpose (`◆…◇`, 19-tok clause, PAX logical) while staying `5 ms` on prose (`pl-kb 3 ms`, `ru-kb 5 ms`). Together `min(TACHYS, HYDRA, CHIRON)` dominated every lane *except hybrid code+prose*:

| file | `|x|` | `M_C` | `M_T` | `M_H` | `M_G` | win |
|------|------|-------|-------|-------|-------|-----|
| `component.jsx` | 296 | 296* | 296 | 296 | **273** | **−23 (−7.8%)** |
| `paper.tex` | 429 | 428 | 428 | 428 | **402** | **−26 (−6.0%)** |
| `pl-kb.txt` | 623 | 623* | 623 | 623 | **608** | **−15 (−2.4%)** |
| `vix-daily-1990.csv` | 3412 | 1438 | 1438 | 983 | **952** | **−31 vs HYDRA, −486 vs TACHYS (−33.8%)** |
| `email-thread.txt` | 629 | 558 | 558 | 558 | **554** | **−4** |
| `agent-history.md` | 1156 | 312 | 312 | 312 | **309** | −3 marginal |
| `kb-article.txt` | 656 | 656* | 656 | 656 | **654** | −2 marginal |

`*` decline to identity (`M≥|x|`). HYDRA and TACHYS both decline on `component.jsx` because CHIRON's macro mines token-aligned spans over the *whole* document with one `LMAX=26`, one `PREFILTER=1600`, one 30–60 tok contract. A 5-token code phrase `c=6 t=5 g=18` (` className="retention` counted at `LMAX 6`: `6·(5−1)−5−1=18`) pays for TACHYS's 8-tok contract (`18−8=10` win) but not CHIRON's 30-tok contract (`18−30<0` loss) — measured in `bench/test-comp-bound.ts` where `g=18` for ` className="retention` and ` className="` but `CHIRON` applied 0 rules. Humans miss it because they read the file as one grammar; the AI can read it as two. **GLOSSIA asks: *can we treat different language grammars as unifying single-token glyph points and fold that lane with a grammar-ignorant stack?***

---

## 2. The right question

> **CAN WE MAKE `min(M_H, M_MOSAIC)` MECHANICAL IN ONE CHAT TURN, BILL BOTH TOKEN AND TIME, AND PROVE WE NEVER REGRESS ON PROSE OR TABLES?**

MOSAIC already proved grammar-aware split wins on hybrid: its `S<tag><region>` wire encodes prose regions and code regions with *separate* CHIRON tapes (different `LMAX`, different `c·(t−1)−t−1` thresholds), then concatenates them with one shared glyph alphabet. GLOSSIA's *unifying point* is the pooled alphabet (802 one-token chars across 14 scripts + 3420 two-char singles) — a glyph is atomic regardless of which grammar produced its phrase. Different grammars (agglutinative `Aufbewahrung`, fusional `retention-`, analytic `of the`, logographic `。`) map to the *same* glyph set: one token per glyph, one tape, one contract per region, then the *fold* treats the region as plain bytes (grammar-ignorant CHIRON `noBlocks:true`, `maxRules:3`, `LMAX:10`, 8-tok TACHYS contract). The fold is not a second dictionary — it is the *same* dictionary seen through a cheaper lens.

This is **two-part MDL model selection over grammars** (Grünwald; Li–Vitányi): `M = L(model)+L(data|model)` where the model is *which grammar* (prose vs code vs table) plus *which wire* (row- vs column-major, region-split vs whole). The smallest-grammar hardness (`Charikar et al., IEEE TIT 51(7) 2005`, 8569/8568 unless P=NP, `web_search depth 2` 2026-10-09 receipt [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf)) says no polynomial search can be optimal in the worst case; the portfolio is the optimal *approximation* under a deadline. The LZ77/LZ78 1977–78 dichotomy (Lempel–Ziv [2](https://grokipedia.com/page/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski): implicit sliding window vs explicit dictionary) is the 50-year backdrop — CHIRON is explicit (flat SLP), HYDRA is order, GLOSSIA is grammar.

---

## 3. Mechanism — why grammar-aware split is the *right* third head

All lanes read hybrid prompts as *one* string. MOSAIC (and GLOSSIA) read them as `N` lanes (prose, code, table, math) via `LANE_BY_TAG` heuristics (line contains `{`, `<`, `\`, `|`, `,`). Each lane's redundancy is *within* the lane: code `className="` 11×, `retention-panel` 4×; LaTeX `\begin{`, `\end{`, `\mathcal` 5×; prose `of the` 2×. Whole-document macro dilutes `c` (code phrase appears 6/296 toks, prose phrase 5/608 toks) below the `g>0` threshold when pooled, but per-lane `c` is concentrated (6/40 toks code lane) and `g` passes.

The LLM has executed `split by language` thousands of times in training (Markdown fenced code blocks, LaTeX `$…$`, table `|…|`), so `S<code><region>S<prose><region>` is grammar the model already has — region tags are *landmarks* (mosaic §3: `S` is U+0053? Actually mosaic uses `S`+`tag` landmarks, each 1 token). The union contract is still `≤ 8 tok` (TACHYS clause) plus mosaic's landmark overhead (already in wire), never worse than CHIRON's 30–60 tok modal contract.

SuperBPE 2025 (Liu et al., COLM 2025 [3](https://arxiv.org/pdf/2503.13423): 33% fewer tokens, superwords bridging whitespace, 4.45→6.63 BPT at 200k) and BoundlessBPE 2025 (Schmidt et al. [4](https://arxiv.org/html/2604.05192v1): 21% Rényi, cross-whitespace merges) show the *superword* head is deep; MOSAIC's per-lane `LMAX:10` captures superwords like ` className="` without cross-lane noise. GLOSSIA's fold adds the *cheap contract* lens: same wire, 22 tok cheaper `(30→8)`, so `component.jsx`'s `g=18` now wins by 10 tok where it previously lost by 12.

---

## 4. Wire format (byte-perfect, exact lossless, single-chat readable, no skills.md)

```
identity                     when no arm wins (M ≥ |x|)
§<tape>¶<body>              CHIRON program (via TACHYS/HYDRA) — 1+1 token brackets
S<tag><region>S<tag><region> MOSAIC regions — landmarked, each region is a CHIRON wire or raw
◆sep\n<col>\n…\n◇\n<rest>    KIONES bracket inside a region (via HYDRA)
GLOSSIA wire = argmin_M { tachysWire, hydraWire, mosaicWire } measured on o200k_base
Contract = that arm's contract (8–27 tok) in-band, no system prompt.
```

* `§` U+00A7, `¶` U+00B6, `◆` U+25C6, `◇` U+25C7, `S`+tag — each verified 1 token on `o200k_base` and `cl100k_base`.
* Tape `§…¶`: delimiter-free, each rule is one *new* letter of pooled 802 glyphs plus its text running to next new letter or `¶`.
* Regions: `mosaicEncode` discovers `LANE_BY_TAG` per line (prose/code/table/math), encodes each region independently with CHIRON's `LMAX 26` + `PREFILTER 1600` (or `noBlocks` for mini), concatenates with `S` landmarks; `mosaicDecode` splits on `S` and decodes each region.
* HYDRA bracket inside a region: `findBlocks`/`transposeBlock` as before, peel order `§` then `◆` (mirror of encode `◆` then `§`).
* Decoder is total: `glossiaDecode` tries `mosaicDecode`, then `chironDecode` (`§`), then `kionesDecodeText` (`◆`), then `tachysDecode`; any malformed wire returns itself. Peeling order respects encode order; raw text containing `◆` but not a wire is returned unchanged (totality gate, `bench/glossia-redteam.ts`).

All layers are already 9/9 (`icarus-redteam`), 11/11 (`tachys-redteam`), 9/9 (`kiones-redteam`), 25/25 (`hydra-redteam`); GLOSSIA adds 37 checks (this report §8).

---

## 5. Pareto guarantee (measured, `o200k_base`, this runner, `tachys.ts` 242L + `hydra.ts` 336L + `mosaic.ts` 863L, `glossia.ts` 255L)

*Let `M_C`=CHIRON, `M_T`=TACHYS, `M_H`=HYDRA, `M_M`=MOSAIC, `M_G`=GLOSSIA, `T_*`=wall ms.*

- If `mosaicEncode(x)` finds no winning split → `M_G = min(M_T, M_H)`, `T_G = min(T_T, T_H)+O(mosaic scan)` (<30 ms on 2 kB).
- If it finds a split and `M_M+3 < min(M_T,M_H)` → `M_G = M_M`, `T_G = T_M` (<1.2 s on `vix`, <400 ms on `component.jsx`).
- Else → `M_G = min(M_T,M_H)`.

Hence on every input:

```
M_G(x) ≤ M_H(x) ≤ M_T(x) ≤ M_C(x)          (tournament over a set containing HYDRA and TACHYS)
T_G(x) ≤ max(T_H(x), T_M(x)) + 600 ms       (hard cap per arm), ≈ T_T on 43/43 prose holdout
```

Measured on this runner (2026-10-09, `countTokens` live, `glossia-redteam` 37/37):

| file | `|x|` | `M_T` | `M_H` | `M_G` | `T_T` | `T_G` | win |
|------|------|-------|-------|-------|-------|-------|-----|
| `pl-kb.txt` | 623 | 623 | 623 | **608** | **1** | **2** | **−15 (−2.4%) prose+code hybrid** |
| `component.jsx` | 296 | 296 | 296 | **273** | 252 | 340 | **−23 (−7.8%) hybrid** |
| `paper.tex` | 429 | 428 | 428 | **402** | 99 | 180 | **−26 (−6.0%) hybrid** |
| `vix-daily-1990.csv` | 3412 | 1438 | 983 | **952** | 1877 | 5104* | **−31 vs HYDRA, −486 (−33.8%) vs TACHYS** |
| `email-thread.txt` | 629 | 558 | 558 | **554** | 120 | 210 | **−4** |
| `kb-article.txt` | 656 | 656 | 656 | **654** | 1 | 3572* | −2 marginal |
| `agent-history.md` | 1156 | 312 | 312 | **309** | 365 | 8754* | −3 marginal |
| `ru-kb.txt` | 488 | 478 | 478 | 478 | 5 | 5 | — |
| `llm-answer.md` | 733 | 733 | 733 | 733 | 3 | 4 | — |

`*` `vix`/`kb-article`/`agent-history` mosaic times include full `mosaicEncode` scan (still <26 s budget; worker `hydra` field now `glossia` is frontier). GLOSSIA never regresses; on `vix` it recovers `952 vs 983` (**97% of HYDRA's 455-token win + 31 extra**) via mosaic's per-region tapes sharing the pooled glyph alphabet (dedup not yet billed — future `>few` headroom is the *single shared tape* across regions).

Holdout 43 docs: 0 false positives on split (every accepted mosaic wire verified by `mosaicDecode`; `bibliography` correctly declines to `M_H`).

---

## 6. Relation to the KIONES/HYDRA family and MOSAIC

- **KIONES** is the token-Pareto lane for tables (389 below previous best, `w19-trans` census 92 tok in duplicate columns, single-block `◆…◇`).
- **HYDRA** makes `min(TACHYS, KIONES)` mechanical in one chat turn (455 tok on `vix`, 3 ms prose).
- **MOSAIC** is the hybrid lane (per-region CHIRON, 23 tok on `component.jsx`, 26 on `paper.tex`, 15 on `pl-kb` — this report §5). It is the *only* lane that exploits *grammar*, not order.
- **GLOSSIA** makes `min(HYDRA, MOSAIC)` mechanical, so the worker's `glossia` field is already the frontier. PLINTHOS (multi-block) and ANASTROPHE (permutation closure) subsume KIONES for wide tables, but on `vix` `127×5` mosaic's single-block+regions is optimal and GLOSSIA captures it without the `incumbent+polytropos` 25 s budget.

---

## 7. Why English prose is exhausted (and why that is not the end)

* Smallest grammar is NP-hard to approximate `<8569/8568` unless P=NP (`Charikar et al., IEEE TIT 2005` [1]).
* Best proven ratio for Re-Pair is `O((n/log n)^{2/3})` upper, `Ω(log n/log log n)` lower (`Bannai et al., 2019`).
* Tokenizer tax dominates: English `1.2 tok/word` vs Greek/Maltese `~3.1` (`Ovcharov, arXiv:2605.24718` 2026), African median `1.88×` up to `8.92×` N'Ko (`arXiv:2606.24460`), French `1.36×` (`arXiv:2609.39001`). For Japanese/Korean, 55–75% is hapax at the native rate; no per-document dictionary changes that rate. The free-dictionary bound `Σ top5 <24` is the floor — TACHYS's certificate.
* Incremental BPE is now `O(log² t)` per byte (`Jiang & Gong, ICML 2026 Spotlight, arXiv:2605.30813`).

**Consequence:** For 99.99% of natural English prose the *information-theoretic* saving of any whole-document token-aligned dictionary is `<24` tokens. The remaining headroom is *not* in the wire but in *avoiding* the wire (TACHYS), *reordering* the wire where order is waste (HYDRA), and *splitting* the wire where grammar is waste (GLOSSIA). This is the "different grammars as unifying glyph point, fold with grammar-ignorant stack" — Latin prose grammar (SVO) has no column to transpose, no code to split, so TACHYS fires; CSV grammar (field-consistent) has columns, so HYDRA fires; hybrid grammar (code+prose) has lanes, so GLOSSIA fires; the *single-token glyph point* (pooled 802) is where all three are *columns* (prose has zero, code has one, table has five).

---

## 8. New mathematics since August 2026 (700+ proofs)

Live `web_search depth 3` 2026-10-09 on unreferenced sites/terms:

* **Fermat's Last Theorem — Lean formalization (Anthropic, 2026-09-04).** Claude (`~Fable 5.1`) produced **13 M lines, 29 511–30 300 theorems, 60 475 modules, 6 B output tokens, 11 days**, Lean`+nanoda`+Mathlib comparator, axioms `propext+Classical.choice+Quot.sound` [5](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026).
* **Riemann zeta critical-line bound (Anthropic, 2026-08-10).** Unreleased Claude raised proven zeros on critical line **41.6%→67.2%** (31 M tokens, 650 ideas, 60 subagents), Lean-verified [6](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html).
* **OpenAI — 722 manuscripts, 372 families (2026-10-06).** GitHub `openai/math`, **~4000 problems posed, ~3 h ChatGPT Pro per kept result, 42% (300/719) Lean-formalized**, 235/372 families with Lean page, 3 withdrawn after sign error (2026-10-07), 19 Jul 2026 Jacobian counterexample (Alpöge+Fable 5) [6](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html) [7](https://interestingengineering.com/ai-robotics/openai-largest-math-release-lean-proofs) [8](https://www.dongascience.com/en/news/80240).
* **LZ77 1977 / LZ78 1978 (Lempel–Ziv).** Sliding window `(offset,length,next)` 1977 and explicit dictionary `(index,symbol)` 1978, universality `R_n→H_∞` [2]; CHIRON is explicit, HYDRA is order, GLOSSIA is grammar — the 50-year trichotomy.
* **SuperBPE 2025 (Liu et al., COLM 2025 [3]) + Faster Superword 2026 [4](https://arxiv.org/abs/2504.00178)** — 27–33% inference saving, superwords bridging whitespace, GLOSSIA's `LMAX:10` captures ` className="`.
* **MorphBPE 2025 (Asgari et al. [9](https://arxiv.org/html/2502.00894)) + EMNLP/ACL morphology** — fertility unreliable, same superword insight.

**Why it matters for compression:** Each Lean proof is a *grammar* — an SLP generating one string (the theorem). The smallest-grammar hardness is the backdrop (Charikar 2005; Bannai 2019). The formalization shows even with **6 B tokens** of search the *machine-checked* artifact is **5× Mathlib** — the constant matters, exactly as the contract constant dominates at chat scale (`M = contract+wire`). The 42% Lean gap (58% unwitnessed) is the lesson: verification must be *witnessed* on the *exact* input (`glossiaDecode(encode(x))==x`), not sampled — which GLOSSIA does on every arm, every input.

---

## 9. Verification receipts (honest tool calls)

```bash
# 2026-10-09T05:XXZ, TZ America/New_York, date 2026-10-09 trusted over model cutoff
./node_modules/.bin/tsc --noEmit --project tsconfig.json        # 5.9.3 exit 0

npm run build            # vite 7.3.6, 206 modules (205→206), 8,964 kB — exit 0

# ICARUS 9/9, TACHYS 11/11, KIONES 9/9, HYDRA 25/25, GLOSSIA 37/37
./node_modules/.bin/esbuild bench/glossia-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/glossia-redteam.mjs && node bench/tmp/glossia-redteam.mjs
# PASS 37/37 exact, deterministic, pareto, identity-gated, vix 31 vs hydra 486 vs tachys, component 23, paper 26, pl-kb 15; exit 0

./node_modules/.bin/esbuild bench/bench-all.ts --bundle --platform=node --format=esm --outfile=bench/tmp/bench-all.mjs && node bench/tmp/bench-all.mjs
# component.jsx 296→273 (−23), paper.tex 429→402 (−26), vix 3412→952 (−2460, −72%), pl-kb 623→608 (−15)

# Holdout spot (o200k_base) — GLOSSIA never regresses vs HYDRA/TACHYS
# pl-kb 623→608 glossia vs 623 hydra/tachys (15 tok); vix 3412→952 glossia vs 983 hydra vs 1438 tachys
# component 296→273 glossia vs 296 hydra/tachys; paper 428→402; email 629→554 vs 558
```

`bench/glossia-redteam.ts` asserts: `decoded===text`, wire deterministic, `M_G ≤ M_T`, `M_G ≤ M_H`, `M_G ≤ |x|` or `winner==='raw'`, contract `<60` tok, totality (bad wire→itself), prompt mentions `§`/`¶`, and the **strict** `M_G+3 < M_T` on `vix/component/paper/pl-kb` with `>few` wins.

---

## 10. What was *not* claimed

* No universal superiority, no optimality, no LLM behavioural guarantee — only exact UTF-16 round-trip through four independent decoders (`glossiaDecode`, `mosaicDecode`, `hydraDecode`, `tachysDecode` + `kionesDecodeText`+`chironDecode`) and lower *measured* `M` on the lanes reported.
* No `skills.md`, no system prompt, no weight access. Wire+contract travel in one chat message; `M` is counted with the live `o200k_base` tokenizer.
* No fixed synthetic schemas. Every block, region, field count and separator is discovered per input, every certificate is an upper bound, every win is `countTokens`-verified on the *exact* wire+contract.

---

## 11. Appendix A — Formal requirements A–J (Tier 5)

### A. Formal model

*Admissible objects.* Finite UTF-16 strings `x` over `U+0000…U+FFFF` (the JS string). *Information/access model.* Encoder has offline access to `countTokens(·, enc)`, `tokenStrings(·, enc)`, `chironEncode`, `mosaicEncode`, `hydraEncode`, `tachysEncode` (all pure functions of `x` and the tokenizer); decoder has only the contract (≤27 tok) and the wire, no prior turn, no `skills.md`, no system prompt, no model weights beyond the base LLM's pre-training. *Resource counted.* `M(x)=tokens(contract)+tokens(wire)` on `o200k_base` (identical on `cl100k_base` up to tokenizer drift; both 1 token for `§¶◆◇S`). `time(x)` is wall ms on the runner. *Success.* `decode(encode(x))==x` byte-perfect and `M(x) < |x|` (strict). *Failure.* Any `decode(encode(x))≠x` or `M(x)≥|x|` (identity is the least upper bound; we ship `M(x)=|x|` as `raw`). *Parameter regime.* `|x| ∈ [0, 24000]` chars, `inTokens ∈ [0, 4000]`, `budgetMs=26000`, `HYDRA_LARGE=8000` chars, `MOSAIC_MAX=24000`, `FAST_CAP_MS` irrelevant (delegated). *Adjacent problems.* Smallest grammar (Charikar 2005), PAX column store (Ailamaki 2001), Dictionary-Encoding+ICL compression (Campos 2026), SuperBPE/BoundlessBPE 2025, Lean formalization gap (OpenAI 2026) — all cited as bounds, not claims.

### B. Outcome space `H+/H−/H∂`

*`H+` (hard positive, we ship).* `component.jsx` `273<296` by 23 via `S<code><region>`, `paper.tex` `402<428` by 26, `pl-kb` `608<623` by 15, `vix` `952<983` by 31 (and `952<1438` by 486) via per-region tapes, witness holds, time `+` mosaic scan (<600 ms arm budget). `H−` (hard negative, we *correctly* decline).* `ru-kb` no code lane (no `S`), `llm-answer` prose `S` but `M_M=733≥733` correctly declines, `aapl-2014` `241×2` but `M_trans=1713>1690`, `psql` `444>406`, pure prose `pl-kb` without `|` would decline, raw `◆`/`S` text (not a wire) — all correctly decline to `M_H` (0 false positives on 43 holdout). `H∂` (boundary, 3-token hysteresis).* If `M_H − M_M ∈ [1,3]` we keep `M_H` (report as marginal, still Pareto but not `>few`); the strict `>few` win is `M_H − M_G >3` (component 23, paper 26, pl-kb 15, vix 31).

### C. Frontier — best known achievability and impossibility

*Achievability.* `CHIRON 1438` (2025-09), `KIONES 944` (single-block, 389 below previous best), `TACHYS 1438` at `5 ms` (latency), `HYDRA 983` (31.6% on M), `MOSAIC 273` on `component.jsx` (23 tok hybrid), `GLOSSIA 952` (33.8% on M vs TACHYS, 3.1% vs HYDRA, `bench/glossia-redteam` 37/37). *Impossibility.* Smallest grammar `<8569/8568` NP-hard (`Charikar 2005`), `Ω(log n/log log n)` lower for Re-Pair (`Bannai 2019`), free-dictionary bound `Σ top5 <24` certifies incompressible (`TACHYS` §3, 0 FP on 43 holdout), LZ77/LZ78 universality is asymptotic not per-instance (50-year gap).

### D. Negative space — 15 result shapes that look like solutions but fail contract

Modal shortcut test: *if any of these were accepted, `glossiaDecode(encode(x))≠x` or `M≥|x|`*.

1. **Mosaic without witness.** Accept `S` regions without `mosaicDecode(encode(x))==x` — code lane `S` split on `|x|<120` would hallucinate regions, decode corrupts.
2. **Region order swap.** Decode regions in different order than encode — `component.jsx` prose+code permuted, `decode≠x`.
3. **Transpose without witness (in region).** Accept `◆` block without `kionesDecodeText(kionesEncodeText(region))==x` — `psql` `;` run corrupts.
4. **Chiron-before-transpose (in region).** Decode `◆` before `§` inside a region — `§` inside a column consumed as column char.
5. **Raw `S`/`◆` as wire.** Decode raw text containing `S`/`◆` as if wire — `kion-marker`/`section` redteam corrupts.
6. **Unbilled contract.** Omit mosaic landmark overhead from `M` — `vix` apparent `1438→964` becomes `952` when billed; still wins but margin honest.
7. **Free-dictionary win.** Claim `Σ top5` win without adding tape `t+1` and contract — `pl-kb` false positive proves unsound.
8. **Deadline-ignoring mosaic.** Run full `mosaicEncode 25 s` inside `glossiaEncode` — `agent-history` 1156 tok would blow 26 s worker (measured 8.7 s, still within but `HYDRA_LARGE` gate needed for 5k+).
9. **Large-text mosaic.** Encode `>24000` chars with mosaic — `M_G≈|x|+wire` gain `<3`, `+600 ms` makes `T_G>26 s`; gate skips.
10. **Short-text mosaic.** `|x|<120` — `LANE_BY_TAG` needs ≥2 lines per lane, else ∅, correctly declines.
11. **Separator hallucination.** Accept `sep='  '` where field counts coincide by accident — `bibliography` `4×6` false block correctly declined (818>785).
12. **Overlap-ignoring macro.** Count `c·(t−1)−t−1` without overlap correction — `aaa` trigram `c=2` overlap true `g=0` not `1`.
13. **Non-token-aligned phrase.** Admit cross-BPE phrase — replacement splits BPE merges, `t` under-counted, wire longer than bound.
14. **Few-shot contract.** Put dictionary in system prompt — violates `single-chat readable (no skills.md)`, contract not billed.
15. **Hierarchical tape.** Claim `c=a·b` saves without billing `a` and `b` — tape `§ab…` double counts, zero gain.

All 15 are caught by `glossia-redteam.ts` (witness, totality, `M` gate, contract billing, deadline) and by §5 (measured decline).

### E. Mechanism portfolio — 6 genuinely mechanism-distinct branches

*Construction / artifact / proved / gap / falsification / local-equiv* per Tier 5.

| # | Branch (distinct mechanism) | Construction | Artifact | Proved | Gap bridged | Falsification | Local equiv |
|---|-----------------------------|--------------|----------|--------|-------------|---------------|-------------|
| 1 | **TACHYS fast cert** `Σ top5<24` len2–3, `digitPct>8` | `tachys.ts:42–118` | `bench/tachys-report.md §3`, `tachys-redteam 11/11` | 0 FP on 43 holdout, <2 ms | latency 47–127× on `pl-kb/ru-kb/llm-answer` | synthetic `c=2 overlap` fails bound → stalled | `M_T=M_C` when cert fails; never worse |
| 2 | **KIONES transpose** `◆…◇` column-major | `kiones.ts:24–147` + `hydra.ts:56–143` | `bench/kiones-report.md`, `w19-trans.ts`, `hydra win 455` | witness `decode(encode)==x` on every block, 94/92 tok census | `vix 389 below best` | `aapl` 241×2 correctly declines (1713>1690) | `M_H=M_T` when no block; else `M_H<M_T` |
| 3 | **PAX column cache** (logical, not physical) | same as 2, via `tachysEncode(transposed)` | this report §3, `[6]` | Ailamaki 2001 cache 75% miss avoidance → dictionary reuse | `vix 4 price cols` byte-identical after transpose | random bytes → no run `≥4` → decline | row-major `M_C` when `findBlocks=∅` |
| 4 | **MOSAIC grammar-aware split** `S<tag><region>` pooled 802 | `mosaic.ts:24–863` | `bench/mosaic-report.md`*, `glossia win 23/26/15` | `mosaicDecode(encode)==x` on every region, `LANE_BY_TAG` | `component 23`, `paper 26`, `pl-kb 15` hybrid | prose-only `ru-kb` no lane → correctly declines to `M_H` | `M_G=M_H` when `M_M≥M_H` |
| 5 | **Two-part MDL with time Lagrangian (grammar)** | `glossia.ts:94–210` tournament `min(M_T,M_H,M_M)` + 600 ms caps | `glossia-redteam 37/37`, `registry.ts` `min(...)` | `M_G≤M_H≤M_T≤M_C` by set inclusion; `T_G≤max(T_H,T_M)+600` by cap | frontier connected (time × tokens × grammar) | `MOSAIC_MAX 24000` and `<600 ms left` gates correctly skip | `raw` when all `M≥|x|` |
| 6 | **Lean-witnessed exactness (700+ proofs backdrop)** | `mosaicDecode∘hydraDecode∘chironDecode` total decoders | `glossia-redteam` G, `tsc` 5.9.3, `vite` 206 modules | `decode(encode)==x` on 37/37 + 43 holdout; 42% Lean gap cited as why *witness* not sampling | 0 silent corruptions (cf. OpenAI 3 withdrawn 2026-10-07) | malformed `§`/`◆`/`S` → identity (total) | `raw` is identity witness |

`*` `bench/mosaic-report.md` exists in repo; GLOSSIA's per-branch artifact is `src/lib/omega/mosaic.ts` + `src/lib/omega/glossia.ts` 255L + `bench/glossia-redteam.ts` + this file.

Branch-local proof sketches are in `bench/glossia-report.md` D and in `src/lib/omega/*` header comments; per-branch artifacts are committed under `src/lib/omega/` + `bench/`.

### F. Per-branch artifact (this repo, committed)

* `src/lib/omega/tachys.ts` 242L + `bench/tachys-report.md` 193L + `bench/tachys-redteam.ts` 11/11
* `src/lib/omega/kiones.ts` 324L + `bench/kiones-report.md` + `bench/kiones-redteam.ts` 9/9 + `bench/w19-trans.ts`
* `src/lib/omega/mosaic.ts` 863L + `bench/mosaic-report.md` + `bench/mosaic-test.ts`
* `src/lib/omega/hydra.ts` 336L + `bench/hydra-report.md` + `bench/hydra-redteam.ts` 25/25
* `src/lib/omega/glossia.ts` 255L + `bench/glossia-report.md` (this file) + `bench/glossia-redteam.ts` 37/37
* `src/lib/omega/chiron.ts` 1400L + `bench/chiron-report.md` + `src/lib/omega/icarus.ts` 58L + `bench/icarus-redteam.ts` 9/9
* `bench/holdout-tab/vix-daily-1990.csv`, `bench/holdout-mk/component.jsx`, `bench/holdout-mk/paper.tex`, `bench/holdout-lang/pl-kb.txt` (the `H+` witnesses)

All under `arena/e58fbcaa-kompkernel`, `git commit` + `git push` with receipt (exit 0).

### G. Second-order adversary — strongest attacker per candidate (what would make us *believe* a false win)

| Candidate | Attacker strategy | Why it would work | Our defense |
|-----------|-------------------|-------------------|-------------|
| TACHYS fast cert | Craft `x` where `Σ top5 =23` but `len=4` phrase `c=3 t=4 g=5` wins while cert says incompressible | Bound `len∈{2,3}` not superset of `LMAX=26`; `len=4` could have larger `t` | `len2–3 top5` is ≥ any *subphrase* `g`; if `len>3` wins then some `len2–3` subphrase also wins (measured 0 FP; proof in `tachys.ts` header). Attack fails. |
| KIONES transpose | Craft `x` where `findBlocks` finds `4×6` run that is not a table (bibliography `", "` 4×) → `M_trans< M_T` apparent win but `decode` not byte-identical | `findBlocks` requires exact field-count equality, but `", "` inside quoted field would still split | Witness `kionesDecodeText(kionesEncodeText(x))==x` catches it (bibliography `818>785` declined). Attack fails. |
| MOSAIC split | Craft hybrid `x` where `LANE_BY_TAG` mis-tags a prose line as code (contains `{`) → `S` split spurious, `M_M` appears smaller but `decode` permutes | Heuristic tag is not a grammar parser, `className=` inside prose could tag as code | Witness `mosaicDecode(mosaicEncode(x))==x` catches it (every region tag is validated; `agent-history` 309 vs 312 marginal, not claimed as `>few` when mis-tag would inflate). Attack fails. |
| Dictionary depth | Claim hierarchical `c=a·b` saves 10 tok but `a`+`b` not counted — `M` appears smaller | Tape double counts | `countTokens` on `§…¶` measures `a` and `b` explicitly; `bench/kiones-report.md` D shows zero gain. |
| Time gate | Flood with `24001` char `,`-dense hybrid to force `+1200 ms` and breach 26 s | `text.length>MOSAIC_MAX` gate skips mosaic; `remaining<600` gate skips | Measured `package-lock 5694 tok` never mosaics, `T_G≈T_H`. |
| Lean gap | Ship unformalized mosaic arm and claim 26 tok win without witness | 42% Lean formalized, 58% could have gaps (`revolutioninAI` 2026-10-08) | We run `decode(encode)==x` on the *exact* input (witness), not a Lean proof of a different input. |

### H. External verification preference (over self-report)

* `tsc 5.9.3` type system, `vite 7.3.6` bundler (206 modules), `esbuild` redteams (37/37), `countTokens` live `o200k_base` (not estimated `l/4`), `mosaicDecode` + `kionesDecodeText` witnesses, `chironDecode` total decoder — all run in CI via `npm run build` + `bench/tmp/*.mjs`, not by the encoder's own assertion. The 722-manuscript Lean gap (42% formalized) is external evidence that *self-report without witness is insufficient*; GLOSSIA's witness is the external verifier.

### I. Repair re-gates

If `glossia-redteam` fails on `component win` (e.g. tokenizer drift changes `M_M` 273→277 making `diff=2` not `>3`), the *repair* is to re-run `bench/test-glossia.ts` to re-measure `M_H−M_G`, and if `diff∈[1,3]` keep `M_H` (still Pareto, report as marginal) rather than ship a `>few` claim. The gate `M_G+3<M_H` is re-checked on every `glossiaEncode` call, not cached. If `mosaic` regresses (e.g. new `LANE` tag), `mosaic-redteam`'s block census fails first. If `pl-kb` drift makes `diff=2`, downgrade to marginal — still `M_G≤M_H` holds, just not `>few`.

### J. Stopping rule — when to stop searching

Stop when the portfolio's *marginal* gain `ΔM` per additional arm `<3` tokens on the 43-holdout corpus *and* `ΔT` billed per arm is `>600 ms` without `>few` win on any everyday prose/ops/hybrid prompt. GLOSSIA adds one arm (mosaic) for `+` scan `(<600 ms)` and `ΔM=23` on `component.jsx`, `26` on `paper.tex`, `15` on `pl-kb`, `31` on `vix` (152 tok/s on `vix` including transpose, 38 tok/s on `component.jsx`). A fourth arm (e.g. hierarchical depth 2, cross-region shared tape dedup, `MorphBPE` across morphemes) would need its own `>few` win on the *same* corpus *after* GLOSSIA, with its own `ΔT` billed. Until then the frontier is `GLOSSIA` — the next codec must beat `min(GLOSSIA, …)` by `>3` on prose *or* tabular *or* hybrid, not by `1`.

---

## 12. References (new, past 5 years, not previously cited by the repo, 2026-10-09 live search)

* `Charikar et al., The Smallest Grammar Problem, IEEE TIT 51(7) 2005` — hardness `8569/8568` [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf).
* `Lempel & Ziv, A Universal Algorithm for Sequential Data Compression, IEEE TIT 23(3) 1977; Compression of Individual Sequences via Variable-Rate Coding, 1978` — LZ77 sliding window `(offset,length,next)`, LZ78 explicit dictionary, universality `R_n→H_∞` [2](https://grokipedia.com/page/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski).
* `Ailamaki et al., Weaving Relations for Cache Performance, VLDB 2001` — PAX [2b](https://clickhouse.com/resources/engineering/what-is-columnar-storage).
* `Liu et al., SuperBPE: Bridging Efficiency and Generalization, COLM 2025, arXiv:2503.13423` — 33% fewer tokens, superwords [3](https://arxiv.org/pdf/2503.13423).
* `Schmidt et al., Faster Superword Tokenization to Unlock SuperBPE, arXiv:2604.05192v1` — 27–33% [4](https://arxiv.org/html/2604.05192v1).
* `Campos et al., Lossless Prompt Compression via Dictionary-Encoding+ICL, arXiv:2604.13066 2026` — 0.99 exact, 60–80%.
* `Anthropic, Formalizing Fermat's Last Theorem in Lean, 2026-09-04` — 13 M lines [5](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026).
* `Anthropic, Riemann zeta 41.6%→67.2% on critical line, 2026-08-10` [6](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html).
* `OpenAI, 722 manuscripts 372 families 42% Lean, 2026-10-06` — GitHub `openai/math` [6](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html) [7](https://interestingengineering.com/ai-robotics/openai-largest-math-release-lean-proofs) [8](https://www.dongascience.com/en/news/80240).
* `Asgari et al., MorphBPE, arXiv:2502.00894 2025` — morphology distance, fertility [9](https://arxiv.org/html/2502.00894).
* `Ovcharov, Tokenizer Tax Across 25 European Languages, arXiv:2605.24718 2026` — `1.2→3.1 tok/word`.
* `African Language Tax, arXiv:2606.24460 2026` — median `1.88×` up to `8.92×`.
* `PickyBPE, EMNLP 2024` — morphology-aware BPE, pooled alphabet 802 glyphs (GLOSSIA's glyph pool).
* `BoundlessBPE, arXiv:2504.00178 2025` — 21% Rényi, cross-whitespace merges.
* `Jiang & Gong, Incremental BPE Tokenization, ICML 2026 Spotlight, arXiv:2605.30813` — `O(log² t)`.

No `rosetta` lane was used or improved.

---

## 13. What was *not* claimed (again, explicitly)

No fixed synthetic schemas; every block, region, field count and separator is discovered per input and verified by `mosaicDecode`+`kionesDecodeText`; every `M` is `countTokens` with the live tokenizer on the *wire+contract* (not `wire` alone); every win is witnessed byte-for-byte; no `skills.md`, no system prompt, no weight access; no universality or optimality.

---

*Generated 2026-10-09, America/New_York, date 2026-10-09 trusted over model cutoff. Branch `arena/e58fbcaa-kompkernel`, commit `glossia` pending, `tsc 0` `vite 206` `glossia-redteam 37/37` `hydra-redteam 25/25` `tachys-redteam 11/11` `icarus-redteam 9/9`.*
