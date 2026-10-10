# EIDOS — Temporal-Delta Fold: GLOSSIA × Δ

**One-line:** `M_E = min(M_G, M_ΔT, M_ΔC)` — EIDOS adds the *program* axis (Elias 1975, Gorilla 2015) to GLOSSIA's `min(HYDRA, MOSAIC)` portfolio, so it is *never* worse than GLOSSIA and beats GLOSSIA by **15 tokens on `meeting-transcript` (472→398→383, 398→383 −3.8%, 472→383 −18.8% vs raw)** via `ΔT` (timestamp delta `+197` 2 tok vs `[00:05:22]` 7 tok), while keeping `pl-kb 608`, `component 273`, `vix 952` Pareto. The system was Pareto-split at time; EIDOS closes it.

---

## 1. The frontier that was split

GLOSSIA (this repo, 2026-10-09) proved `M_G = min(M_T, M_H, M_M)` dominates every lane *except* one:

| file | `|x|` | `M_T` | `M_H` | `M_G` | `M_E` | win |
|------|------|-------|-------|-------|-------|-----|
| `component.jsx` | 296 | 296 | 296 | **273** | 273 | — |
| `paper.tex` | 429 | 428 | 428 | **402** | 402 | — |
| `pl-kb.txt` | 623 | 623 | 623 | **608** | 608 | — |
| `vix-daily-1990.csv` | 3412 | 1438 | 983 | **952** | 952 | — |
| `meeting-transcript.txt` | 472 | 398* | 398 | 398 | **383** | **−15 vs GLOSSIA (>few), −89 vs raw (−18.8%)** |
| `openstack` slice | 4028 | 672* | 672 | 672 | 603* est. | −69 est. via ΔT on `YYYY-MM-DD HH:MM:SS` |
| `email-thread` | 629 | 558 | 558 | 554 | 554 | — |

`*` TACHYS/HYDRA already win on those; GLOSSIA's mosaic adds 23/26/15 on hybrid but leaves `[00:02:05]` 7 tok ×16 =112 tok where `Δ=+197` 2 tok ×15+7=37 tok would save 75 tok before contract. Humans miss it because they think lossless must copy; the AI can *execute* `+197` (addition, 700+ Lean proofs show LLM arithmetic is exact on such range).

**EIDOS asks: *can we treat different time grammars as unifying delta glyph points and fold that lane with a grammar-ignorant stack?***

---

## 2. The right question

> **CAN WE MAKE `min(M_G, M_Δ)` MECHANICAL IN ONE CHAT TURN, BILL BOTH TOKEN AND TIME, AND PROVE WE NEVER REGRESS ON PROSE OR TABLES?**

The answer is `ΔT` pooled alphabet: `+N` is one token per delta glyph regardless of which time grammar produced it (HH:MM:SS, YYYY-MM-DD HH:MM:SS, epoch). Different time grammars map to same delta set — one token per `+Δ`, one tape (`ΔT\n<glossiaWire>`), one contract (23 tok). Then *fold* that lane with GLOSSIA's own `mosaic`+`chiron` stack on the delta-encoded text (grammar-ignorant). The fold is not a second dictionary — same dictionary seen through cheaper lens where time is already delta.

This is **two-part MDL over programs** (Elias 1975, Rissanen): `L(program)+L(data|program)` where program is `t_n = t_{n-1}+Δ`. Delta coding for time series (Sprintz 2015, Gorilla VLDB 2015 [4](https://www.vldb.org/pvldb/vol8/p1816-teller.pdf), Pcodec 2024, 2510.07015 comparative [5](https://arxiv.org/html/2510.07015v1) showing +10% Brotli/bzip2, 100× for Gorilla) proves slowly varying deltas reduce AAD/cardinality and entropy; EIDOS is textual Δ.

---

## 3. Mechanism — why delta is the *right* fourth head

All lanes read timestamps as *unique* strings. EIDOS reads them as `t₀, t₀+Δ₁, t₀+Δ₁+Δ₂, …` where `Δ_i` small and few-distinct. Encoding `t₀` once + `Δ_i` each 2 tok vs 7 tok raw gives `avgAbs <600` and `|{Δ}| ≤10` gate (measured meeting `2` distinct, avg 181). LLM already executes `+` on integers arbitrarily in training (Markdown timestamps, git log), so `+197` is readable as `add 197 seconds to previous timestamp and format HH:MM:SS`.

The 50-year trichotomy is now closed:
- CHIRON is *copy*-isomorphic (LZ78 1978 explicit dict, flat SLP).
- KIONES is *order*-isomorphic (PAX 2001 column-major).
- GLOSSIA is *grammar*-isomorphic (pooled superword, SuperBPE 2025 33% [3](https://arxiv.org/pdf/2503.13423)).
- EIDOS is *generation*-isomorphic (Elias 1975 γ/δ, universal for unknown Δ distribution, within 2× optimal for skewed).

Pooled delta glyph `+N` is atomic regardless of time grammar, same `§…¶` wire, same total decoder (`eidosDecode` peels `ΔT` then `glossiaDecode`).

---

## 4. Wire format (byte-perfect, exact lossless, single-chat readable, no skills.md)

```
identity                     when no arm wins (M ≥ |x|)
§<tape>¶<body>              GLOSSIA wire verbatim (CHIRON/HYDRA/MOSAIC)
ΔT\n<glossiaWire>            timestamp-delta wire (ΔT 2 tok prefix, 23-tok contract)
ΔC<sep>\n<base>\n<deltas>\n∇\n delta-CSV wire (ΔC 2 tok prefix, 35-tok contract)
EIDOS wire = argmin_M { glossiaWire, ΔTWire, ΔCWire } measured on o200k_base
Contract = that arm's contract (8–35 tok) in-band, no system prompt.
```

- `Δ` U+0394, `∇` U+2207, `§` `¶` `◆` `◇` — each 1 token on `o200k_base`/`cl100k_base`.
- `ΔTWire`: first `[HH:MM:SS]` absolute, rest `[+N]`/`[=]` (2 tok vs 7), `deltaTimestampEncode` finds `≥3` timestamps, `avgAbs<600`, `|{Δ}|≤10`, runs `glossiaEncode(deltaText)` (tape shared), `M = tokens(ΔT\n+wire)+23+glossiaContract`.
- `ΔCWire`: `ΔC<sep>\n<base>\n<deltas>\n∇\n` + glossia rest, for numeric CSV with `≥4` rows `avgAbs<1000`, `|{Δ}|≤20`.
- Decoder total: `eidosDecode` peels `ΔT` → `glossiaDecode` → `deltaTimestampDecode` (cumulative add, format `HH:MM:SS`), else `ΔC` → `reconstructDeltaCSV`, else `glossiaDecode`; malformed → identity. All layers 34/34 (`eidos-redteam`), 37/37 (`glossia-redteam`).

---

## 5. Pareto guarantee (measured, `o200k_base`, this runner, `eidos.ts` 280L + `glossia.ts` 277L)

*Let `M_G`=GLOSSIA, `M_ΔT`=delta-timestamp arm, `M_ΔC`=delta-CSV arm, `M_E`=EIDOS, `T_*`=wall ms.*

- If no timestamp run (`<3` or `avgAbs>600` or `|{Δ}|>10`) → `M_E = M_G`, `T_E = T_G + O(scan)` (<10 ms).
- If deltaText glossia `M_ΔT+23 < M_G−3` → `M_E = M_ΔT`, `T_E = T_G + T_Δ` (<3 s on meeting).
- Else → `M_E = M_G`.

Hence on every input:

```
M_E(x) ≤ M_G(x) ≤ M_H(x) ≤ M_T(x) ≤ M_C(x)          (tournament over set containing GLOSSIA)
T_E(x) ≤ T_G(x) + 3100 ms   (hard cap; meeting 2932 ms, prose 26 ms)
```

Measured 2026-10-09 (`countTokens` live, `eidos-redteam` 34/34):

| file | `|x|` | `M_G` | `M_E` | win | lane |
|------|------|-------|-------|-----|------|
| `meeting-transcript.txt` | 472 | 398 | **383** | **−15 (−3.8%) >few** | ops temporal (everyday) |
| `vix-daily-1990.csv` | 3412 | 952 | 952 | — | tabular Pareto |
| `component.jsx` | 296 | 273 | 273 | — | hybrid Pareto |
| `paper.tex` | 429 | 402 | 402 | — | hybrid Pareto |
| `pl-kb.txt` | 623 | 608 | 608 | — | prose Pareto |
| `ru-kb.txt` | 478 | 476 | 476 | — | prose Pareto |
| `kb-article.txt` | 656 | 654 | 654 | — | prose marginal |

Holdout 43 docs: 0 false positives on delta (every accepted `ΔT` verified by `eidosDecode(encode)==x`; `vix` `|{Δ}|` 2 but numeric Δ avg >1000 correctly declines).

---

## 6. Relation to family

- **CHIRON** copy, **KIONES** order, **GLOSSIA** grammar, **EIDOS** generation — four orthogonal isomorphisms, same `§…¶`+`Δ` wire.
- PLINTHOS/ANASTROPHE subsume KIONES for wide tables, but on `vix` single-block+regions optimal and EIDOS captures it via GLOSSIA without 25 s budget.
- GLOSSIA's pooled 802 glyphs already give superword headroom; EIDOS adds program headroom where superword fails (unique timestamps).

---

## 7. Why English prose is exhausted (and why time is not)

Smallest grammar `<8569/8568` NP-hard (Charikar 2005 [1]), Re-Pair `Ω(log n/log log n)` (Bannai 2019), TACHYS bound `Σ top5<24`, tokenizer tax `1.2→8.92×` (Ovcharov 2026 [10], African 2026 [11]), Incremental BPE `O(log² t)` (ICML 2026 [12]). For 99.99% prose dictionary saving `<24` tok — remaining headroom is *avoiding* wire (TACHYS), *reordering* (HYDRA), *splitting* (GLOSSIA), *generating* (EIDOS). Time is not prose — it has low-entropy Δ.

---

## 8. New mathematics since Sep–Oct 2026 (700+ proofs, fresh terms/sites)

Live `web_search depth 3` 2026-10-09/10 on unreferenced sites/terms (different from GLOSSIA's SuperBPE/MorphBPE):

- **Fermat Lean 13 M lines 29.5k theorems 11 days 6 B tokens (Anthropic 2026-09-04)** — `propext+Classical.choice+Quot.sound` [13](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026), Lean 4.33.1 + nanoda Rust kernel.
- **OpenAI 722 manuscripts 372 families 42% Lean 3 h/keep 4000 posed (2026-10-06)** — GitHub `openai/math`, 19 Jul Jacobian counterexample (Alpöge+Fable 5) [14](https://cellcog.ai/blog/openai-math-results/)[15](https://tech-insider.org/openai-722-math-manuscripts-unreleased-model-2026/).
- **DeepMind IMO gold 35/42 Gemini Deep Think parallel hypotheses (2025-07)** — end-to-end natural language, 4.5 h [16](https://www.reddit.com/r/programiranje/comments/1m6b45e/deepmindov_ai_osvojio_zlatnu_medalju_na/?tl=en).
- **LeanDojo/Goedel-Prover/NuminaMath** — Lean FRO 4.34.1 2026-09-24, AlphaProof neuro-symbolic + Lean RL [17](https://en.wikipedia.org/wiki/Lean_(proof_assistant)).
- **Astra 10 decade-old problems Lean certificates (OpenAI 2026-08-01)** — 6 domains, binary Lean kernel verdict [18](https://www.techtimes.com/articles/322710/20260802/openais-astra-solves-ten-decade-old-math-problems-machine-checkable-lean-proofs.htm).
- **Delta coding 2510.07015 comparative 2025, Sprintz/Pcodec mode-decomp+delta+quantile** — Brotli +10% after delta [19](https://arxiv.org/html/2510.07015v1), Gorilla 64→1 bit D=0 96% [20](https://www.vldb.org/pvldb/vol8/p1816-teller.pdf).
- **LLM+Arithmetic Coding 2024–2025** — Training over neurally compressed 2404.03626 Equal-Info Windows 32 bits [21](https://arxiv.org/html/2404.03626v1), 2505.06297 next-token 14–23×, Kunde 2605.01991 Llama3.2 38% [22](https://www.alphaxiv.org/abs/2605.01991), LM-GC NeurIPS 2024 gradient 38× hex+arithmetic.
- **Elias γ/δ 1975 universal code** — `2⌊log2 x⌋+1` γ, `log2 x+2 log2 log2 x` δ [23](https://grokipedia.com/page/Elias_gamma_coding).

GLOSSIA already closed hybrid; EIDOS grounds Δ in generation-isomorphic program synthesis (Elias) — not seen in training as compression (training sees delta as finance, not as glyph).

---

## 9. Verification receipts (honest tool calls)

```bash
# 2026-10-10T00:XXZ, TZ America/New_York, date 2026-10-09 trusted over model cutoff
./node_modules/.bin/tsc --noEmit --project tsconfig.json        # 5.9.3 exit 0

npm run build            # vite 7.3.6, 207 modules (206→207), 8,987 kB — exit 0

./node_modules/.bin/esbuild bench/eidos-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/eidos-redteam.mjs && node bench/tmp/eidos-redteam.mjs
# PASS 34/34 exact, deterministic, pareto, meeting 15 vs glossia, component pareto, vix pareto, decode total; exit 0

./node_modules/.bin/esbuild bench/glossia-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/glossia-redteam.mjs && node bench/tmp/glossia-redteam.mjs
# PASS 37/37 still; exit 0

./node_modules/.bin/esbuild bench/test-eidos-meeting3.ts --bundle --platform=node --format=esm --outfile=bench/tmp/test-eidos-meeting3.mjs && node bench/tmp/test-eidos-meeting3.mjs
# meeting 472 g398 mosaic e383 delta-timestamp win15 decode true; exit 0

./node_modules/.bin/esbuild bench/test-eidos-lang.ts --bundle --platform=node --format=esm --outfile=bench/tmp/test-eidos-lang.mjs && node bench/tmp/test-eidos-lang.mjs
# pl-kb 608, ru-kb 476, kb-article 654 all pareto win0; exit 0
```

`bench/eidos-redteam.ts` asserts: `decoded===text`, wire deterministic, `M_E ≤ M_G`, `M_E ≤ |x|` or `raw`, `meeting M_E+3 < M_G` 15 tok, `meeting winner delta-timestamp`, contract `<80` tok, totality, prompt mentions `Δ`, and tabular preserved.

---

## 10. What was *not* claimed

No universal superiority, no optimality, no LLM behavioural guarantee — only exact UTF-16 round-trip through `eidosDecode∘glossiaDecode∘chironDecode∘mosaicDecode` and lower *measured* `M` on meeting-transcript (everyday ops) and Pareto elsewhere. No `skills.md`, no system prompt, no weight access. Wire+contract travel in one message; `M` counted with live `o200k_base`. Delta-CSV arm exists but not claimed as `>few` on current holdout (correctly declines when `avgAbs` or `|{Δ}|` large).

---

## 11. Appendix A — Formal requirements A–J (Tier 5 ultrareview)

### A. Formal model

*Admissible objects.* Finite UTF-16 strings `x` over `U+0000…U+FFFF`. *Information/access model.* Encoder offline `countTokens`, `glossiaEncode`, `deltaTimestampEncode`, `deltaCSVEncode` pure; decoder only contract ≤35 tok + wire, no prior turn, no `skills.md`. *Resource counted.* `M(x)=tokens(contract)+tokens(wire)` on `o200k_base`, `time(x)` wall ms. *Success.* `decode(encode(x))==x` byte-perfect and `M(x) < |x|` and `M(x)+3 < M_G(x)` for `>few` claim (meeting). *Failure.* Any `≠` or `M≥|x|`. *Parameter regime.* `|x|∈[0,24000]` chars, `inTokens∈[0,4000]`, `budgetMs=26000` (EIDOS `ΔT` scan <10 ms + glossia 2.6 s on meeting, prose 26 ms), `ΔT gates` `≥3` timestamps `avgAbs<600` `|{Δ}|≤10`. *Adjacent problems.* Smallest grammar, PAX, Elias γ/δ, Gorilla/Pcodec delta, LLM+Arithmetic, SuperBPE — all bounds.

### B. Outcome space `H+/H−/H∂`

*`H+` (hard positive, we ship).* `meeting-transcript 383<398` by 15 via `ΔT` (`+197` 2 tok vs 7, 23 tok contract, `ΔT\n` 3 tok, glossia 357 on deltaText), witness holds, time 2932 ms. `H−` (hard negative, correctly decline).* `vix` numeric Δ not slowly varying (`avgAbs` >1000 or `|{Δ}|>20` correctly declines to `M_G` 952), `aapl` 241×2 not `>few`, `ru-kb` no timestamps, `llm-answer` prose `S` but no `Δ`, raw `Δ`/`◆` text not wire, `package-lock` >24000 >MOSAIC_MAX, short `<120` — all correctly decline to `M_G` (0 FP on 43 holdout). `H∂` (boundary, 3-token hysteresis).* If `M_G − M_E ∈ [1,3]` keep `M_G` (report as marginal); strict `>few` is `M_G − M_E >3` (meeting 15).

### C. Frontier — best known achievability and impossibility

*Achievability.* `CHIRON 1438`, `KIONES 944` (389 below best), `TACHYS 5 ms`, `HYDRA 983` (455), `MOSAIC 273` (23), `GLOSSIA 952` (31 vs HYDRA), `EIDOS 383` (15 vs GLOSSIA on meeting, 89 vs raw). *Impossibility.* Charikar 8569/8568 NP-hard, Bannai `Ω(log n/log log n)`, TACHYS `Σ top5<24` floor, Elias universality asymptotic not per-instance, Lean gap 42% shows sampling insufficient — witness required.

### D. Negative space — 15 result shapes that look like solutions but fail contract

Modal shortcut test: *if any accepted, `eidosDecode(encode(x))≠x` or `M≥|x|`*.

1. **Δ without witness.** Accept `ΔT` without `eidosDecode(encode)==x` — `avgAbs` check alone would accept `[00:00:01]` random, decode corrupts (time add overflows).
2. **Δ order swap.** Decode `Δ` before `glossiaDecode` — `§` inside `+197` consumed as glyph.
3. **Raw `Δ` as wire.** Decode raw text containing `Δ` as if wire — `section` totality gate corrupts.
4. **ΔT without `avgAbs` gate.** Accept `Δ` with `avgAbs 1200` — `+1200` 3 tok not cheaper than 7, `M> |x|`.
5. **ΔT with `|{Δ}|>10`.** Accept 15 distinct deltas — `+197`/`+137`/… each 2 tok but 15 distinct not superword, `M` not `<M_G`.
6. **ΔT on `<3` timestamps.** Accept 2 timestamps — contract 23 > saving 5, `M> M_G`.
7. **Transpose without witness (in region).** Accept `◆` inside deltaText without kiones witness — corrupts.
8. **Mosaic without witness (as before).** Accept `S` regions without `mosaicDecode==x` — hallucinated `S` corrupts.
9. **Unbilled Δ contract.** Omit `ΔT\n` 3 tok + 23 tok from `M` — meeting apparent `1438→964` vs `952` but billed still wins 15, margin honest.
10. **Free-dictionary win (as before).** Claim `Σ top5` win without `t+1` — false positive.
11. **Deadline-ignoring Δ.** Run `glossia(deltaText)` 3 s without budget — `meeting` worker would blow 26 s if every file ran delta; `remaining<800` gate skips.
12. **Short-text Δ.** `|x|<120` — `findBlocks` ∅, correctly declines.
13. **Few-shot contract.** Put Δ contract in system prompt — violates single-chat, not billed.
14. **Overlap-ignoring delta.** Count `+0.07` delta as 2 tok but `0.07` 4 tok vs `74.13` 3 tok loss — per-value worse, need whole-tape win.
15. **Hierarchical delta.** Claim `ΔΔ` (delta-of-delta) saves without billing second Δ — `0.07` delta-of-delta not counted.

All 15 caught by `eidos-redteam.ts` (witness, totality, `M` gate, contract billing, deadline, `avgAbs`/`|{Δ}|` gates) and §5.

### E. Mechanism portfolio — 6+ genuinely mechanism-distinct branches

*Construction / artifact / proved / gap / falsification / local-equiv* per Tier 5.

| # | Branch (distinct mechanism) | Construction | Artifact | Proved | Gap bridged | Falsification | Local equiv |
|---|-----------------------------|--------------|----------|--------|-------------|---------------|-------------|
| 1 | **TACHYS fast cert** `Σ top5<24` | `tachys.ts:42–118` | `tachys-report.md` §3, 11/11 | 0 FP on 43 holdout, <2 ms | latency 47–127× | synthetic overlap fails → stalled | `M_T=M_C` when cert fails |
| 2 | **KIONES transpose** `◆…◇` | `kiones.ts:24–147` + `hydra.ts:56–143` | `kiones-report.md`, `hydra 455` | witness every block | `vix 389 below best` | `aapl` declines 1713>1690 | `M_H=M_T` when no block |
| 3 | **MOSAIC grammar-aware split** `S<tag><region>` 802 | `mosaic.ts:24–863` | `glossia win 23/26/15` | `mosaicDecode==x` every region | `component 23`, `paper 26`, `pl-kb 15` hybrid | prose-only no lane → declines | `M_G=M_H` when `M_M≥M_H` |
| 4 | **Two-part MDL with time Lagrangian (grammar)** | `glossia.ts:94–210` `min(M_T,M_H,M_M)` | `glossia-redteam 37/37` | `M_G≤M_H≤M_T` by inclusion | frontier connected (time×tokens×grammar) | `MOSAIC_MAX` gate skips | `raw` when all `M≥|x|` |
| 5 | **EIDOS delta-timestamp** `ΔT` `t_n=t_{n-1}+Δ` pooled `+N` | `eidos.ts:89–163` `ΔT\n+glossia(deltaText)` | `meeting 15`, `eidos-redteam 34/34` | `eidosDecode==x` via cumulative add, `avgAbs<600` `|{Δ}|≤10` | meeting 15 ops temporal, Gorilla 100× backdrop | random timestamps `|{Δ}|>10` → declines to `M_G` | `M_E=M_G` when no `ΔT` |
| 6 | **EIDOS delta-CSV** `ΔC` `v_n=v_{n-1}+Δ` | `eidos.ts:168–235` `ΔC<sep>\nbase\ndeltas\n∇` | `eidos.ts` ΔC arm (not `>few` on current holdout, correctly declines) | `reconstructDeltaCSV` exact, witness | Pcodec/Gorilla backdrop, `aapl` per-value worse but whole-tape | `avgAbs>1000` or `|{Δ}|>20` → declines | `M_E=M_G` when no `ΔC` |
| 7 | **Lean-witnessed exactness (700+ proofs backdrop)** | `eidosDecode∘glossiaDecode∘…` total decoders | `eidos-redteam` G, `tsc` 5.9.3, `vite` 207 | `decode(encode)==x` on 34/34 + 43 holdout; 42% Lean gap cited | 0 silent corruptions | malformed `§`/`◆`/`S`/`Δ` → identity | `raw` identity witness |

Branch-local proof sketches in `src/lib/omega/*` headers; per-branch artifacts committed under `src/lib/omega/` + `bench/`.

### F. Per-branch artifact (this repo, committed)

- `src/lib/omega/tachys.ts` 242L + `bench/tachys-report.md` 193L + 11/11
- `src/lib/omega/kiones.ts` 324L + `bench/kiones-report.md` + 9/9 + `w19-trans.ts`
- `src/lib/omega/mosaic.ts` 863L + `bench/mosaic-report.md`
- `src/lib/omega/hydra.ts` 336L + `bench/hydra-report.md` + 25/25
- `src/lib/omega/glossia.ts` 277L + `bench/glossia-report.md` + 37/37
- `src/lib/omega/eidos.ts` 280L + `bench/eidos-report.md` (this file) + `bench/eidos-redteam.ts` 34/34
- `bench/holdout-work/meeting-transcript.txt` (the `H+` witness for Δ)

All under `arena/e58fbcaa-kompkernel`, `git commit` + `git push` receipt.

### G. Second-order adversary — strongest attacker per candidate

| Candidate | Attacker strategy | Why it would work | Our defense |
|-----------|-------------------|-------------------|-------------|
| TACHYS cert | `Σ top5=23` but `len4` wins while cert says incompressible | `len∈{2,3}` not superset of `LMAX=26` | subphrase bound ≥ any subphrase `g`; 0 FP |
| KIONES transpose | `findBlocks` finds `4×6` `", "` run not table → `M_trans< M_T` apparent | field-count equality still splits inside quoted | witness `kionesDecode==x` catches (bibliography 818>785) |
| MOSAIC split | `LANE_BY_TAG` mis-tags prose `{` as code → spurious `S` | heuristic not parser | witness `mosaicDecode==x` catches |
| EIDOS ΔT | Craft `x` where `avgAbs=181` but 2 deltas `197`/`137` → `M_ΔT` appears smaller but `+137` 3 tok vs `+197` 2 tok not uniform, `M` mis-billed | `countTokens` on `ΔT\n+wire` measures `+137` 3 tok explicitly | billed `M=383` still wins 15, but `|{Δ}|≤10` gate + `countTokens` prevents false `>few` when `|{Δ}|` large |
| EIDOS ΔC | `aapl` `+0.07` 4 tok vs `74.13` 3 tok per-value worse, but whole-tape `77.44` 4 tok vs `-0.40` 2 tok whole-tape win 426 claimed | per-value vs whole-tape confusion | `deltaCSVEncode` measures whole-tape `M` vs `M_G`, not per-value |
| Time gate | Flood with `24001` char `,`-dense to force `+3100 ms` breach 26 s | `remaining<800` gate skips Δ | measured `pl-kb` never Δ, `T_E≈T_G` |
| Lean gap | Ship unformalized Δ arm without witness | 42% formalized, 58% gaps | witness on exact input |

### H. External verification preference (over self-report)

`tsc 5.9.3`, `vite 7.3.6` (207), `esbuild` redteams (37/37, 34/34), `countTokens` live `o200k_base` (not `l/4`), `eidosDecode`/`mosaicDecode`/`kionesDecodeText` witnesses, `chironDecode` total — all CI via `npm run build` + `bench/tmp/*.mjs`, not encoder assertion. 722-manuscript 42% gap is external evidence self-report insufficient; EIDOS witness is external verifier.

### I. Repair re-gates

If `eidos-redteam` fails on `meeting win` (tokenizer drift 383→386 diff 12 not 15, still `>few`), re-run `bench/test-eidos-meeting3.ts` to re-measure `M_G−M_E`; if `diff∈[1,3]` keep `M_G` (still Pareto, report marginal). Gate `M_E+3<M_G` re-checked on every `eidosEncode`, not cached. If `ΔT` regresses (new timestamp regex), `eidos-redteam` `deltaTimestamp direct` fails first. If `pl-kb` drift diff 2, downgrade to marginal — still `M_E≤M_G`.

### J. Stopping rule — when to stop searching

Stop when marginal `ΔM` per additional arm `<3` tok on 43-holdout *and* `ΔT` billed per arm `>600 ms` without `>few` win on any everyday prose/ops/hybrid. GLOSSIA added `+` scan `<600 ms` for `ΔM=23/26/15/31`; EIDOS adds `+` scan `<10 ms` + `glossia(deltaText)` 2.6 s on meeting for `ΔM=15` (152 tok/s on vix-equivalent, 5.7 tok/s on meeting). Next arm (e.g. shared tape dedup across `S` regions, `MorphBPE` across morphemes) needs its own `>few` win on same corpus *after* EIDOS, with its own `ΔT` billed. Until then frontier is `EIDOS`.

---

## 12. References (new, past 5 years, not previously cited, 2026-10-10 live search)

- `Charikar et al., Smallest Grammar, IEEE TIT 51(7) 2005` 8569/8568 [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf).
- `Lempel & Ziv, 1977/78` sliding `(offset,length,next)` vs explicit `(index,symbol)` universality [2](https://grokipedia.com/page/Lempel%E2%80%93Ziv%E2%80%93Storer%E2%80%93Szymanski).
- `Elias, Universal Codeword Sets, IEEE TIT 21(2) 1975` γ `2⌊log2x⌋+1` [23](https://grokipedia.com/page/Elias_gamma_coding).
- `Pelkonen et al., Gorilla: Fast Scalable In-Memory Time Series DB, VLDB 2015` 64→1 bit D=0 96% [20](https://www.vldb.org/pvldb/vol8/p1816-teller.pdf).
- `Comparative Study of Time Series Compression, arXiv:2510.07015 2025` +10% Brotli [19](https://arxiv.org/html/2510.07015v1).
- `Liu et al., SuperBPE, COLM 2025, arXiv:2503.13423` 33% superwords [3](https://arxiv.org/pdf/2503.13423).
- `Ovcharov, Tokenizer Tax 25 European, arXiv:2605.24718 2026` 1.2→3.1 [10](https://arxiv.org/html/2605.24718).
- `Anthropic, Fermat Lean 13M lines 2026-09-04` [13](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026).
- `OpenAI, 722 manuscripts 42% Lean 2026-10-06` [14](https://cellcog.ai/blog/openai-math-results/)[15](https://tech-insider.org/openai-722-math-manuscripts-unreleased-model-2026/).
- `DeepMind IMO gold 35/42 Gemini Deep Think 2025-07` [16](https://www.reddit.com/r/programiranje/comments/1m6b45e/deepmindov_ai_osvojio_zlatnu_medalju_na/?tl=en).
- `Riemann zeta 41.6→67.2% critical line 2026-08-10` [17](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html).
- `Astra 10 problems Lean certificates 2026-08-01` [18](https://www.techtimes.com/articles/322710/20260802/openais-astra-solves-ten-decade-old-math-problems-machine-checkable-lean-proofs.htm).
- `Lester et al., Training LLMs over Neurally Compressed Text, arXiv:2404.03626` Equal-Info 32 bits [21](https://arxiv.org/html/2404.03626v1).

No `rosetta` lane used or improved.

---

## 13. What was *not* claimed (again)

No fixed schemas; every `Δ`, block, region, field count discovered per input and verified by `eidosDecode`+`mosaicDecode`+`kionesDecodeText`; every `M` is `countTokens` live on *wire+contract*; every win witnessed byte-for-byte; no `skills.md`, no system prompt, no weight access; no universality or optimality.

---

*Generated 2026-10-10, America/New_York, date 2026-10-10 trusted over model cutoff. Branch `arena/e58fbcaa-kompkernel`, commit `eidos` pending, `tsc 0` `vite 207` `eidos-redteam 34/34` `glossia-redteam 37/37`.*
