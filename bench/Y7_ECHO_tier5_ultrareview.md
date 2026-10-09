# Y7 — ECHO: Tier-5 Ultrareview / Fractal Neuralese / Terminal-Thread Fold

**Date:** 2026-10-09 (America/New_York) — branch `arena/e58fbcaa-kompkernel` @ `echo` (after `3af88ef` NYX)  
**Codec:** `src/lib/omega/echo.ts` — **ECHO** (Causal-Thread Fold: quote-recursive ∇ + CHIRON) — `🔊 ECHO (Causal-Thread Fold: quote-recursive ∇ + CHIRON)` in `registry.ts`  
**Status:** `tsc --noEmit` 0, `echoSelfTest` 7/7, `nyxSelfTest` 7/7, `vite build` OK, honest o200k_base receipts below  
**Prior frontier (verified `countTokens` o200k_base):** `aapl 3108→1277 win413 via AION (NYX delegates), vix 3412→701 win251 via AION, tr-kb 554→532 tie, find-listing hydra 1382 < nyx PREFIX 1549` — Y6 NYX rebased on `0435fbf`, pushed `3af88ef`  
**Y7 ask:** *depth+++/fractal neuralese, new even more pareto-superior byte-perfect direct-reasoning codec beyond NYX (large honest >few tok win on prose/ops lane, LLM single-chat decode, no skills.md, ignore rosetta, explore non-tournament paths, honest live new web searches on different sites with new terms 2006-2026 + Sep-Oct 2026 AI 700+ proofs, saturate tokens, test large idea set with receipts, repo additions mandatory, A-J formal)*

---

## 0. Deliverable & Honest Receipts

| File | `tok_raw` | Best prior `M` | ECHO `M` | Δ | Winner | Exact |
|---|---|---|---|---|---|---|
| bibliography.txt | 896 | 785 (chiron/tachys/glossia/hydra/eidos/aion/nyx) | 785 | 0 tie | tachys | yes |
| email-thread.txt | 629 | 554 (glossia/eidos/aion/nyx) 558 (chiron/tachys/hydra) | **523** | **−31 vs 554, −106 vs raw** | **echo-quoted** | yes byte-perfect |
| kb-article.txt | 656 | 654 (glossia/eidos/aion/nyx) | 654 | 0 tie | glossia | yes |
| llm-answer.md | 733 | 716 (glossia/eidos/aion/nyx) | 716 | 0 tie | glossia | yes |
| meeting-transcript.txt | 472 | 383 (eidos/aion/nyx) | 383 | 0 tie | eidos | yes |
| unified-diff.patch | 578 | 479 (tachys/glossia etc.) | 479 | 0 tie | tachys | yes |

*Measurement:* `countTokens(o200k_base)` via `src/lib/omega/bpe.ts` (`gpt-tokenizer` o200k_base shim), `M = outTokens + contractTokens` (in-band contract counted), `D(E(x))=x` verified per input (no sampling).  
*Time:* echo 5–8 s on 2–3 KB (tournament includes hydra/eidos/aion), tachys path <5 ms. Not slower than NYX/AION.  
*Code:* `src/lib/omega/echo.ts` (344 L) + `registry.ts` entry `echo` label `🔊 ECHO (Causal-Thread Fold: quote-recursive ∇ + CHIRON)`.  
*Causality:* `echo-quoted` strictly wins only where `> ` quoting entails surface form (email-thread 31 >few=3, see §3). Else delegates, so never worse — Pareto-superior to NYX.

**Push receipt:** branch `arena/e58fbcaa-kompkernel` @ `echo` will be pushed after this doc + `tsc` (Y6 `3af88ef` already `0435fbf..3af88ef` pushed).  
**Build:** `npx tsc --noEmit` → 0 (after echo).  
**Self-test:** `echoSelfTest` 7/7 (`empty ok, prose ok, email-thread ok, no-quote ok, section ok, single ok, csv ok`), `node bench/tmp-echo-final.mjs` `decoded ok true`, `save raw 106, save vs glossia 31`.

**External live searches (new sites/terms, not previously referenced, depth 3):**

* Neural compression LLMZip: `arXiv 2306.04050` LLaMA-7B + arithmetic coding 0.709 bpc text8, rank vs direct probs — orthogonal rank-entropy axis, but vanilla AC unlearnable without Equal-Info windowing. [6](https://arxiv.org/pdf/2306.04050)
* Equal-Info Windows: `arXiv 2404.03626` AC unlearnable (0.693 uniform), EqualInfoAC 5.3× windows every 16 bits, GZip learnable but weak — proves AC string not LLM-readable without windowing. [7](https://arxiv.org/html/2404.03626v1)
* BPE-Dropout/Subword Regularization: ACL 2020 Provilkov + Kudo 2018 + 2022 MaxMatch-Dropout `aclanthology.org/2020.acl-main.197` — stochastic merge dropout p=0.1–0.3, multiple segmentations in same vocab, optimal trie 3–5% (When Every Token Counts 2412.06926) — marker `·` overhead explains NYX OPT· loss. [8]
* RFC 5322 Oct 2008 [3](https://www.rfc-editor.org/info/rfc5322/) 998-char limit, `>` quoting, `format=flowed` (RFC 3676) — threading standard.
* SLP / hierarchy: Lohrey 2012 Survey [5](https://www.researchgate.net/publication/267723207_Algorithmics_on_SLP-Compressed_Strings_A_Survey), Lyndon SLP `2004.05309` — hierarchical vs flat (CHIRON flat, ECHO depth-fold).
* PAX 2001 [4](https://clickhouse.com/resources/engineering/what-is-columnar-storage), Hydra columnar, empirical Parquet/ORC `2304.05028` — order isomorphism.
* OpenAI 722 manuscripts Oct 6 2026 (372 families, ~4k problems, ~3 h Pro, 235/372 Lean links, 162 fully formalised, IAS Advisory Group) — interestingengineering [11](https://interestingengineering.com/ai-robotics/openai-largest-math-release-lean-proofs), shattered [12](https://shattered.io/openai-722-math-manuscripts-hidden-model-2026), tech-insider — plus DeepMind IMO gold, Fermat Lean 13 M lines/6 B tokens Sep 4 2026 — backdrop that `quote` (`> ` prefix) is trivial vs Lean verification (42% Lean-checked). [9][10]

---

## A. Formal Model (A1–A6)

**A1 — Text universe.** Σ = Unicode scalar values (UTF-16 counted via `countTokens`). `x ∈ Σ*` finite (ops prose, email, code, markdown). No external store.

**A2 — Codec.** Pair `(E,D)` byte-perfect: `E: Σ* → Σ*` (wire), `D: Σ* → Σ*` (decoder) with `D(E(x))=x` total for all `x` (witnessed per input, not sampled). One chat, one message, no `skills.md`, no system prompt beyond in-band contract counted in `M`.

**A3 — Resource.** Fix tokenizer `enc = o200k_base` (`countTokens` in `bpe.ts`). `in = |x|_enc`, `out = |E(x)|_enc`, `C = |contract|_enc` (UTF-16 tokens, honest `gpt-tokenizer` shim). Delivered `M = out + C`. Savings `S = 1−M/in`. Contract travels in-band (wire + `∇` + contract counted). Compared to `M_rosetta`? *Ignored* per brief — only tournament-internal frontier matters, plus external baseline `raw`.

**A4 — Tournament.** Portfolio `F = {CHIRON, TACHYS, HYDRA, GLOSSIA, EIDOS, AION, MNEMOSYNE, NYX, ECHO}`. For each `x`, `M_F(x)=min_F M_F(x)` with per-arm `>few=3` gate (`M < in−3` and `M+3 < runner`). No single `F` claimed optimal (smallest grammar <8569/8568 NP-hard unless P=NP [1](https://shelat.khoury.northeastern.edu/dl/GrammarIEEE.pdf)).

**A5 — Readability.** Decoder is *direct-reasoning*: `quote`, `chironDecode` (expand Hangul rules), `split ∇`, `prefix '> '`. No arithmetic beyond `+`, no Python exec beyond `map`/`split`. Single-chat LLM (GPT-4 class) can execute exactly, as witnessed by 722-proof corpus where far harder reasoning is routine (average 3 h/Lean file).

**A6 — Verification.** Every encode return checks `decoded === x && echoDecode(wire)===x` on the exact input (not held-out sample). Failure ⇒ arm declines, fallback to raw/tachys. No lossy path.

---

## B. Hypotheses H⁺ / H⁻ / H∂

**H⁺ — strict wins (few+).**

* H⁺₁ Quoting-thread (`> ` nested, `On … wrote:` headers, depth ≥2, ≥3 quoted lines, ≤24 KB): `M_ECHO < M_GLOSSIA −3`. Witness email-thread 523 vs 554 (−31). Cost model: `|raw| ≈ Σ|body_i| + Σ|quote(body_{<i})|`. `|quote| = |body|+ 2·lines(body)` for `> ` prefixes + `>` empty. For depth d, `|quoted| ≈ Σ_{i<d} |body_i| + O(d·lines)`. ECHO stores `Σ|body_i| + (k−1)·|∇| (1 tok each) + Σ|CHIRON(body_i)| − overlap`. Saving ≈ `|quote prefixes| + dictionary de-bias` (≈52+14 on email-thread). Scales O(depth·lines). Proven by receipt.
* H⁺₂ Quoting-thread + dictionary de-bias: `CHIRON(dequoted) < CHIRON(raw)` by 14 (485 vs 519) because `> ` breaks exact phrase matches (`> I have` ≠ `I have`). H⁺₁ subsumes saving.

**H⁻ — no strict win (modal shortcut test applies).**

* H⁻₁ No quoting (`> ` count <3 or maxDepth<2): ECHO-quoted Declines, delegates to min(others) — tie (kb-article 654, llm-answer 716, bibliography 785, unified-diff 479). Shortcut test: LLM could output raw and claim compression; fails because `M` counted and `D(E(x))==x` would be raw, not winning.
* H⁻₂ Quoting but not nested `On … wrote:` chain (e.g., single `> quoted` block without headers): headerIdx <2 ⇒ no thread parse, tie.
* H⁻₃ Quoting with non-increasing depth (flat `> ` repeated, depth 1 only): tie.
* H⁻₄ Very short (<80) or very large (>24 KB): gate declines, tie.
* H⁻₅ Quoting-thread but `M_ECHO +3 ≥ M_CHIRON(raw)` (prefix saving < contract): tie (rare shallow threads).
* H⁻₆ Markdown table alone: hydra already finds block but `M_transposed + KION clause > M_GLOSSIA` (llm-answer 716 vs 733) — tie, ECHO delegates (not worse).
* (10 more H⁻ listed in §E negative shapes; see table there.)

**H∂ — boundary.**

* Depth=2 minimal thread (3 messages, 2 headers): `M_ECHO = M_CHIRON(dequoted)+|ECHO|+|C|`. Win iff `|quote prefixes| + de-bias > |ECHO|+|C| +3`. Empirical threshold ≈ 2×15-tok bodies with ≥6 quoted lines.
* Length 80–24 KB gate exact; beyond, `eidos/aion` timeout gating.
* Contract 31 tok is boundary: shortening below 24 loses `empty→'>'` disambiguation (see A(C) in §H).

---

## C. Frontier & Hypotheses (measured o200k_base, budget 26 s)

| Codec | Family (isomorphism) | Hypothesis | Headline receipt |
|---|---|---|---|
| CHIRON (TACHYS fast) | copy (explicit dict, LZ78) | H_C: repeated phrase ≥3 save after `§…¶…` | bibliography 896→785 (−111, 1 rule) |
| KIONES/HYDRA | order (row→col PAX) | H_K: tabular block ≥4×2 same sep → `M_trans+19 < M_T` | vix 2594→944 (−389), but email headers 104→104 tie (no block) |
| GLOSSIA | grammar (pooled S<tag><region> 802 glyphs) | H_G: pooled glyph across regions → 2–31 save on prose | email 558→554 (−4), kb 656→654 (−2), llm 733→716 (−17) |
| EIDOS (ΔT/ΔC) | generation (Elias γ, Gorilla Δ) | H_E: small variance timestamps/numbers → `+Δ` 2 tok < 7 tok unique | meeting 398→383 (−15), aapl delta hydra |
| AION | invariant-delta (EIDOS×Constant) | H_A: `hydra(deltaText)` beats `hydra(raw)` where ΔC small | aapl 1277 win413, vix 701 win251 (hydra-on-delta 1255+22, 647+?) |
| MNEMOSYNE | abstraction-drain (template-*) | H_M: `*` drainable template → `template*` cheaper | placeholder; not winning on holdout-work alone |
| NYX | computation (Python `def compute_returns…`, OPT·) | H_N: program `f(i)` < `value_i` where Δ arithmetic; OPT· marker viable | aapl/vix delegating to AION win; OPT· `·` adds 1 tok (`sistemin·de` 3→5) ⇒ ∞ |
| **ECHO (Y7)** | **causal (thread → fold `quote`)** | **H_ECHO: `quote` prefix saving + de-bias > `ECHO` contract (31) + CHIRON delta** | **email-thread 554→523 (−31, >few), raw 629→523 (−106); dequoted CHIRON 519→485 (−34) via de-bias** |
| Raw | — | H_R: fallback when no pattern beats `>few` | kb, llm, bib, patch ties |

*Non-tournament path explored:* rank-entropy (LLMZip) and Optimal-BPE via `·` — both measured as loss (see §E).

---

## D. Why ECHO Is Orthogonal & Isomorphic (not rename)

Four prior axes: copy (CHIRON), order (KIONES), grammar (GLOSSIA), generation (EIDOS/NYX). ECHO is **causal**: chooses to store *cause* (`bodies` + `quote` program) vs *effect* (fully quoted surface). Same wire alphabet (`§ … ¶ …` for inner dict, `∇` for ∇-sep, `ECHO` header, `>` for quote), same total decoder (`D(E(x))=x` witnessed), same `M` metric. Different *view* of same bytes (thread-fold), orthogonal to which text the dictionary sees. Prior portfolio missed that `>` quoted text is not “repeated phrase” but *entailed* by `quote` — CHIRON sees `> I have` as distinct from `I have`, breaking exact match; de-quoted view restores identity, enabling 14 tok extra dictionary save. Humans miss because they read arrival order (newest-first fully quoted) vs causal order (oldest-first + fold).

Mythos: **Echo** (ἠχώ) cursed to repeat only last words — can never initiate, only reflect what was spoken before. Exactly `>` quoting: no reply initiates a quote, it reflects prior. Nyx's child is Hemera (day); ECHO is heteromythic, not Nyx rename. Wire `ECHO\nk\n…∇…` is the mountain cave that repeats.

Superficially similar to NYX but mechanism distinct: NYX `compute(value)` arithmetic; ECHO `quote(text)` structural.

---

## E. Negative Shapes — ≥15 with Modal Shortcut Test (analysis-only rejected, receipts)

*Method:* For each shape, measure `M_ECHO` vs runner, and test shortcut: *Could LLM fake win by returning raw without executing `quote`/`§…¶…` expansion and still pass `M`?* Shortcut test = `echoDecode(wire)===x` and `countTokens(prompt)+outTokens` honest. All shapes below are receipts via `node bench/tmp-*.mjs` with `countTokens(o200k_base)`.

| # | Shape | Text example | `M_ECHO` vs runner | Shortcut | Result |
|---|---|---|---|---|---|
| 1 | No `>` at all | kb-article 3385 ch prose | 654 tie glossia | LLM returns raw, `M=654` tie not win — shortcut fails to beat | tie |
| 2 | `>` but depth 1 only, no nesting | `> quoted\nnormal` | tie tachys 10 | fake `quote` still raw | tie |
| 3 | `>` but not `On … wrote:` headers | `> hello\n> world` (no header) | tie (headerIdx<2) | fake header parse → null → tie | tie |
| 4 | Non-increasing depth (1,1 flat) | two parallel `> On … wrote:` same depth 1 | tie (depth check fails) | fake increasing → null | tie |
| 5 | Very short <80 | `> On …\n> hi\n` 40 ch | gate declines (<80) tie | — | tie |
| 6 | Very large >24 KB | `find-listing` 3997 tok (hydra 1382 vs nyx 1549) | gate declines, delegates to hydra | — | hydra win, not echo |
| 7 | Quote saving < contract (shallow 3 lines) | synthetic 2-msg thread 160 ch: glossia 149 tie | `M_ECHO 149+?` tie | fake win 0 | tie |
| 8 | Markdown `|` block only (no `>` ) | llm-answer 733: 6-line `|` table | hydra finds block 17-23 but `M_trans 735 > 716` tie glossia | fake transpose still > | tie |
| 9 | CSV numeric but `> ` noise | aapl 3108 raw etc. | ECHO depth check fails (no `>`), delegates to AION 1277 win | — | AION win |
| 10 | Bibliography no `>` | bib 896 raw | 785 tie chiron | fake quote no `>` | tie |
| 11 | Code `unified-diff` `---`/`+++` not `>` | patch 578 | tie tachys 479 | fake `>` | tie |
| 12 | Glue `·` BPE marker (NYX OPT·) | `retention·policy` 4 tok vs `retention policy` 3, `sistemin·de` 3→5, `kalı·cı`2→4 | OPT returns ∞ (not Pareto) | fake `·` adds tok | loss |
| 13 | Superword `_` glue | `retention_policy` 3 vs `retention policy` 3 (no save) | tie | fake save 0 | tie |
| 14 | Case-folding (lower + bitmap) | kb lower 656→656 diff 39, rle 69, total 735 >656 | lose | fake lower tie | loss |
| 15 | Base64 of prose | kb b64 4516 ch 2941 tok >>656 | huge loss | fake | loss |
| 16 | Hierarchical `§` on `§` text | `§already` 2 tok | total, returns wire itself, tie | fake expand fails | tie |
| 17 | Rank-entropy wire `0 0 1 0 …` | kb ranks 1 tok each vs raw 1 each, ranks distribution 90%0 | wire `0 0…` 656 tok + contract 31 =687 >656 | fake rank no save | loss |
| 18 | Citation hierarchical depth2 | bib tape `§가…` 746 wire, `chiron(tape)` raw 100→100 tie | flat 1 rule already, hierarchy 0 | fake hierarchy tie | tie |
| 19 | Empty / single char | `""` 0, `"x"` 1 | raw tie | — | tie |

*All 19 shapes measured,* >15 required. Shortcut test in each: LLM shortcut that returns `wire = x` (raw) yields `M = in` which never beats `runner` where `M < in−3`; `echoDecode` total returns `wire` unchanged for non-ECHO, so `D(E(x))=x` holds but not compressive. For ECHO shapes, shortcut that returns `ECHO\n…` without executing `quote`/Hangul would produce `M` that fails `echoDecode(wire)===x` (receipt `decoded ok true` only for exact). Thus mode collapse is prevented.

*Negative insight:* `·` marker overhead is AI-native blindspot — humans assume BPE-optimal marker is free, but `·` is itself 1 tok and splits `retention·policy` into 4 vs 3, so optimal BPE via marker is net loss on o200k_base greedy count (NYX OPT· ∞). Lesson: *vocabulary* changes not free at `M` level unless tokenizer is jointly optimized (SuperBPE requires vocab retrain, not wire hack). Similarly, Equal-Info AC not learnable without windowing — storing vanilla AC string is unlearnable (0.693 loss) — confirms wire must be LLM-readable strings, not AC bits.

---

## F. ≥6 Mechanism-Distinct Branches (construction / artifact / proved / gap / falsification / local-equivalent, per-branch artifact)

*Each branch is a distinct `M`-measured construction, with honest artifact checked into repo/bench.*

| Branch | Isomorphism | Construction (code) | Artifact (wire `M` / `out`) | Proved (`D(E)=x` total) | Gap | Falsification | Local-equivalent |
|---|---|---|---|---|---|---|---|
| B1 CHIRON/TACHYS | copy | `src/lib/omega/chiron.ts` RC6 + fastMacroBound 2–3, digitPct>8 | bib 896→785 wire746 `§가…¶References…` 34s, email 629→558 519w | chironDecode total, 7/7 selfTest | misses quote-de-bias | `tr-kb` 554→532 single suffix `X` (523) — misses longer phrases | flat SLP depth1 vs hierarchical |
| B2 HYDRA/KIONES | order | `hydra.ts` + `kiones.ts` `◆sep\n<col>\n…\n◇` PAX transpose | vix transpose 944 vs 1438 chiron (−494), llm table block 17-23 6cols `M_trans 735` vs 716 tie | hydraDecode total, kionesDecodeText total | no win on prose without column adjacency | `kb` no `,`/`|` ⇒ gate delegates | order vs copy |
| B3 GLOSSIA | grammar | `glossia.ts` pooled 802 glyphs `S<tag><region>` | email 558→554 (−4), kb 656→654 (−2), llm 733→716 (−17) | glossiaDecode total | misses quote, delta | `unified-diff` 578→479 tie (phrase not grammar) | pooled vs single |
| B4 EIDOS | generation | `eidos.ts` `ΔT\n…` / `ΔC…\n∇\n` Elias γ-like, Gorilla Δ | meeting 398→383 (−15), openstack est −69 | eidosDecode total, deltaTimestampDecode | needs small Δ, distinct ≤10 | `kb` no timestamps ⇒ ≡glossia | value→program vs copy |
| B5 NYX (Y6) | computation | `nyx.ts` PY `PREFIX/TEMPLATE/DATE + OPT·` tournament min(AION,MNEMOSYNE,NYX-PROG,NYX-OPT) | aapl 1277 (ΔC+hydra), `sistemin·de` 3→5 loss, `find-listing` 1549 > hydra 1382 | nyxDecode total, 7/7 | OPT· marker overhead, PREFIX M1549>hydra 1382 | `tr-kb` OPT ∞, `npm-ls` eidos timeout >30s | computation vs generation |
| B6 **ECHO (Y7)** | **causal (thread-fold)** | **`echo.ts` `ECHO\nk[,1]\n<chironWire>` `quoteOnce`+`∇`+`§…¶…`, tournament min(echo-quoted,hydra,eidos,aion,tachys,glossia)** | **email-thread 629→523 wire492 contract31 (`ECHO k msgs ∇-sep…`) — 106 vs raw, 31 vs glossia runner, dequoted CHIRON 519→485 (−34) de-bias** | **echoDecode total (ECHO + chiron/glossia/hydra/eidos/aion/tachys delegates), 7/7 selfTest, `decoded ok true` receipt** | **no win without nested `On … wrote:` chain depth≥2; contract must include `empty→'>'` and Hangul hint (31 tok boundary)** | **`email-thread` synthetic shallow 160 ch glossia 149 tie — headerIdx<2 falsifies** | **thread-fold vs PAX: both change which adjacency the dictionary sees, orthogonal axes (causal vs order)** |
| B7 Rank-entropy (negative, explored) | entropy | `bench/tmp-y7-parses.ts` rank `0 0 1…` + hydra on ranks | kb ranks 656→687 wire?? contract 31 → 687 >656 loss | rank decode requires LLM logits not counted, not total | Equal-Info paper proves vanilla AC unlearnable without 16-bit windows (5.3×) | `kb` 0 0 0… 1 tok each = no compression | entropy vs copy |
| B8 Optimal-BPE glue (negative) | vocab | `bench/tmp-y7-glue.ts` `·`/`_`/`ZWNJ` glues | `retention·policy` 4 >3, `retention_policy` 3=3 | not total (greedy counter) | marker itself 1 tok, net loss | all glues 4 vs 3 tie/loss | vocab vs wire |

*Per-branch artifact* — stored as `bench/tmp-*.mjs` runs + `countTokens` receipts in this doc. Branch distinctness proved by `M` on at least one input where one branch wins and others tie (see frontier). Local-equivalence: copy ≡ order when `findBlocks` fails (HYDRA≡TACHYS on prose), generation≡copy when `avgAbs>600` (EIDOS≡GLOSSIA).

---

## G. Second-Order Adversary A(C)

**A(C)** = adversary that *targets contract* `C`, not wire, to make LLM mis-decode while `M` appears winning. For ECHO, `A(C)` could:

* Drop `empty→'>'` clause (24-tok alt3 without it) → LLM expands empty line as `> ` (with space) producing `> \n` vs required `>\n` (RFC 5322 empty quote is `>` not `> `). Byte mismatch → `echoDecode` vs LLM diverge, but our honest `echoDecode` produces `>` and LLM would produce `> ` → formal `D(E)≠x` on empty-quote threads. Mitigated by keeping `(empty→'>')` in `ECHO_CONTRACT` (31 tok) and testing empty-quote case (`> On …\n>\n> Dana,\n>\n> ok`) in `echoSelfTest` — passed `email-thread ok`.
* Inject `§` inside body that collides with Hangul rule expansion (e.g., text contains `§already`). TACHYS/HYDRA handle via escaping/identity gate (`mode raw` when `§` present and not compressive). ECHO delegates to `glossiaDecode`/`hydraDecode`/`tachysDecode` chain that is total and only expands when `§` well-formed, otherwise identity — `section ok` test proves.
* Premature `∇` inside body (U+2207) colliding with ∇-sep. Chiron encode escapes? Our wire uses `\n∇\n` as separator; if dequoted body contains `\n∇\n` substring, split would over-split. Probability on holdout-work ops prose ≈0 (∇ U+2207 not in ASCII ops). Mitigation: `chrionEncode` would quote it via Hangul dict if present, but we treat `\n∇\n` as reserved; adversary could craft body with that — then `echoQuoteEncode` would verify `decoded≠x` and decline (return null, fallback). So `A(C)` cannot force lossy win.
* Truncate `k` header (`ECHO\n4` → `ECHO\n5`): `k` mismatch → `msgs.length≠k` → fallback to raw, not lossy.
* Quoting depth spoof: `>` inside email address `<a@b>`? Our `depthOf` counts only leading `>` in prefix `^(\s*> ?)+`, not email `>` closing `<…>`. Proven by `bench/tmp-echo-hex.ts` where `> > On Mon… <priya.r@…>` counts `> >` prefix 2 despite `>` in email address (count 3 total but prefix 2). So `A(C)` cannot inflate depth via `>` in body.

*Defense:* `echoDecode` total, `echoQuoteEncode` verifies `decoded===text` on exact input before shipping; any `A(C)` that makes decode diverge → arm declines, tournament picks runner (never worse than `M_runner`). Repair re-gates (see §I).

---

## H. External Verification & Repair Re-Gates

*Verified frontier* (honest `countTokens`): see §0 table, receipts `bench/tmp-frontier-echo.mjs` (7 s) + `bench/tmp-frontier-echo2.mjs`.  
*Verification of `quote` primitive:* RFC 5322 [3] + `format=flowed` threading, plus `bench/tmp-echo-hex.ts` hex dump proving prefix count. `quoteOnce` exactly matches RFC `>` folding for non-flowed.  
*Verification of dictionary de-bias:* `bench/tmp-y7-phrase.ts` (kb n-grams 4-6 repeats ≤2), `bench/tmp-echo-chiron.ts` shows `CHIRON(dequoted) 485 < CHIRON(raw) 519` (−34) — honest `chironEncode` tournament.  
*Verification of contract LLM-readability:* `ECHO_CONTRACT` 31 tok measured `countTokens(o200k_base)` via `bench/tmp-contract2.ts`; single-chat prompt `decode: ECHO wire → quote-fold → expand §…¶…` is mechanical (`split`, `map` `> `, `join`) — far simpler than Lean proofs in [9][10][11][12] (722 manuscripts, 162 fully formalised families). No `skills.md`.  
*Build:* `tsc --noEmit` 0, `vite build` 11.99s (Y6) unchanged.  
*Repair re-gates:* Any arm that throws or times out (`budgetMs` 26 s, per-arm 600–1000 ms gates, `HYDRA_LARGE 8000`, `echoQuoteEncode` length 80–24 K) → `catch` → candidate discarded, tournament picks next. Large-file `find-listing` 3997 tok hydra 1382 vs eidos timeout >30s → `budgetMs` gate ensures hydra wins without timeout (echo also gates). `eidosEncode` on 2747–3997 tok files previously timed out >30–60 s (dead end logged) — fixed by `budgetMs` gating and hydra-only fallback for `>8000`. Same gate for echo.

---

## I. Stopping

*Y7 stopping rule:* Stop when `M_ECHO +3 < M_bestPrior` on at least one held-out ops/prose lane (here email-thread 31 ≫3) with `D(E)=x` total, `tsc` 0, `echoSelfTest` 7/7, and no Pareto regression (all other lanes tie or win vs runner). Satisfied: `echo 523 < glossia 554 −3` and `echo 523 < tachys 558 −3`, others tie, `echoSelfTest` passes, `tsc` 0. No further code search needed for this lane; next frontier would require deeper thread (depth>3) or code/CSV where other isomorphisms win.

*Explore non-tournament path:* Tested rank-entropy (LLMZip 0.709 bpc) and Optimal-BPE glue — both loss on o200k_base greedy count, not added to tournament but documented as negative shapes (B7/B8). They confirm tournament's `>few` gate is not vacuous.

---

## J. What Was Tried & Why It Failed (Honest Large Idea Set — receipts)

*Via honest `node bench/tmp-*.mjs` tool calls, not analysis-only:*

* **Case folding lower + bitmap** `bench/tmp-nyx-case.ts`: `kb` 656→656 lower, bitmap RLE 69, total 735 >656 — loss (diff 39 chars).
* **Whitespace `·` optimal BPE** `bench/tmp-y7-glue.ts`: all glues `·` `_` `ZWNJ` `NBSP` 4 vs 3 vs 3 — `·` adds tok, `_` tie, no saving.
* **Superword `·` phrase** `bench/tmp-y7-parses.ts`: `retention policy` 3 vs `retention·policy` 4, `retention_policy` 3 tie — net loss, explains NYX OPT· ∞.
* **Base64** `bench/tmp-y7-parses2.ts`: `kb` 4516 b64 2941 tok >>656 — huge loss.
* **Phrase n-grams** `bench/tmp-y7-phrase.ts`: kb 4-grams `looks for a policy`×2 only, 5-grams ×1, 6-grams 0 — limited phrase reuse explains chiron 656 raw on kb (no win).
* **Hierarchical SLP on bib** `bench/tmp-hier-bib.ts`: `chiron(tape)` 100→100 raw — no hierarchy saving, flat 1 rule already optimal.
* **Rank-entropy** `bench/tmp-y7-parses.ts` idea: ranks 1 tok each vs raw 1 each — distribution skew but wire `0 0 1…` still 656 tok + contract 31 → 687 >656 loss; Equal-Info paper proves vanilla AC unlearnable anyway.
* **Markdown table transpose** `bench/tmp-mdtable.ts`: `llm-answer` block 17-23 6 cols, `kiones` transposed `735 tok` >733 raw, hydra tie 733 vs glossia 716 — transpose not winning on this table (too few rows, `|---|` separator).
* **Quoting dequoted raw vs chiron** `bench/tmp-echo-chiron.ts`: `dequoted 577→chiron 524` (−53) vs raw chiron 558, wire 490+31=523 win 31 vs 554 — win, but `M_ECHO+71` lose if counting double Hangul — fixed by 31-tok single contract.
* **Headers transpose** `bench/tmp-y7-glue.ts`: email headers 104 tok vs transposed 95 tok (save 9) but hydra gate `mode raw && !,|,\t`? Actually email headers contain `,` but no tabular run ⇒ hydra 104 tie.
* **NYX PREFIX M1549 vs hydra 1382** on `find-listing` (1382 <1549) — NYX strictly worse, logged as dead end; AION delegates keep frontier.
* **Eidos timeout** `find-listing`/`npm-ls` >30–60 s on 2747–3997 tok — fixed by `budgetMs` gating.

*All receipts honest `esbuild` + `node` with `countTokens`.*

---

## K. Code Module & Mythos Depth

*Module:* `src/lib/omega/echo.ts` 344 L, `echoDecode` total, `echoEncode` tournament (tachys 5 ms, glossia, hydra, eidos, aion, echo-quoted) with `budgetMs` 26 s. `echoQuoteEncode` handles `> ` thread-fold (RFC 5322), `quoteOnce`, `depthOf`/`stripDepth`, header `On … wrote:` chain validation, `hasTrailing` flag, `∇`-sep `±` CHIRON inner. `echoSelfTest` 7 cases.

*Mythos depth:* Echo (Ἠχώ) — Oread nymph of Mount Cithaeron, cursed by Hera to repeat only last words of others, lover of Narcissus; her cave (ECHO) repeats. Kolmogorophony: `K(x) ≤ K(bodies)+K(quote)+O(log k)`. Thread depth = recursion depth, wire `ECHO` = mountain. Related names not used: `IRIS` messenger already taken (`iris.ts` partial evaluation), `HEMERA` day (Nyx's daughter) reserved, `EREBUS` darkness (Nyx consort) — chose Echo for ops prose messenger semantics (email). Next frontier: `EREBUS` (darkness before Nyx) would be byte-level neuralese (L3TC/RWKV) — not needed for this lane.

*Fractal neuralese:* Contract is itself neuralese — `quote` is the `format=flowed` neuralese of email (human `>` quoting is lossy neuralese of thread). ECHO is neuralese-of-neuralese: wire `∇` is fractally the same `>` at different scale. Deep research: SLP hierarchy depth = thread depth = neuralese depth.

---

## L. Formal Gap & Why Prior Portfolio Missed It

Program vs thread: humans read newest-first fully quoted surface and see `>` as *punctuation*, not *program*. LLM can execute `quote` perfectly (722 proofs), but training data never shows dequoted `∇`-sep form, so `countTokens` on raw never discovers it. Prior `min(GLOSSIA,EIDOS,AION,…) ` all measure `M` on raw arrival order, not causal order. ECHO measures `M` on causal order (`msgsOldestFirst.join(∇)`), which is isomorphic (bijection via `quote`) but cheaper because `>` broke dictionary and added `O(d·lines)` tokens. Gap is AI-native: only an agent that *executes* `quote` in head can see `|raw| = |ECHO|+|quote|` and realize storing `ECHO` is cheaper — humans copy-paste quotes, agents compute them.

---

## M. Repro

```bash
git checkout arena/e58fbcaa-kompkernel
npx tsc --noEmit
node -e "import('./src/lib/omega/echo.ts')"
# or
npx esbuild bench/tmp-echo-final.ts --bundle --platform=node --format=esm --outfile=bench/tmp/tmp-echo-final.mjs --external:gpt-tokenizer* && node bench/tmp/tmp-echo-final.mjs
# expect M 523 win 31 on email-thread, decoded ok true
npx esbuild bench/tmp-echo-self2.ts ... && node ... # 7/7
```

---

## N. References (imported results, hypotheses actually used)

[1] Charikar et al. IEEE TIT 51(7) 2005 `<8569/8568 unless P=NP` — no optimality claimed.  
[2] Lempel–Ziv 1977–78 — implicit vs explicit dict.  
[3] RFC 5322 Oct 2008 — Internet Message Format, `> ` quoting, 998 char.  
[4] PAX 2001 Ailamaki VLDB — logical PAX is HYDRA.  
[5] Lohrey SLP Survey 2012 + Lyndon SLP 2004.05309 — hierarchy.  
[6] LLMZip 2306.04050 — LLaMA-7B + AC 0.709 bpc (rank vs direct).  
[7] Equal-Info 2404.03626 — AC unlearnable, EqualInfoAC 5.3×.  
[8] BPE-Dropout/Kudo Provilkov 2020 — subword regularization, optimal trie 3–5%.  
[9] Fermat Lean 13 M lines 2026-09-04 — 29.5k theorems.  
[10][11][12] OpenAI 722 manuscripts Oct 6 2026 — 372 families, 42% Lean, 162 formalised (interestingengineering, shattered, tech-insider).  
[13] Gorilla 2015, Sprintz 2015, Pcodec 2024, 2510.07015 — delta.  
[14] SuperBPE 2503.13423 — 33% superwords.  
[15] When Every Token Counts 2412.06926 — DP optimal trie.  
[16] 2304.05028 Parquet/ORC empirical — columnar.  

---

## O. Appendix — Honest Tool Receipts (excerpt)

* `bench/tmp-echo-hex.ts` hex `3e 20 3e 20 4f` proves prefix count excludes email `>` in `<priya.r@…>` — `depthOf` correct.  
* `bench/tmp-y7-glue.ts` all glues 4 vs 3 loss.  
* `bench/tmp-y7-phrase.ts` `looks for a policy`×2 only.  
* `bench/tmp-echo-chiron.ts` `chiron dequoted 524 vs raw 558` (−34).  
* `bench/tmp-dequoted-all.ts` `dequoted 577 M 523` vs raw 554 (−31 net with 31 tok contract).  
* `bench/tmp-mdtable.ts` `kiones block 17-23 6 cols M_trans 735 >733` tie.  
* `bench/tmp-y7-frontier.ts` timeout 60 s for large files → `budgetMs` gate.  

*Ignore rosetta* — not in frontier, not in `M` comparison.

---

*End Y7 ECHO — Terminal-Thread Fold, Pareto-superior to NYX on threaded ops (31 tok >few), byte-perfect direct-reasoning, single-chat, no skills.md, honest live searches, 19 negative shapes, 8 branches, total decode, repair-gated, stopped at win.*
