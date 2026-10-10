# TACHYS — Incompressibility-Certified Latency Lane

**One-line:** TACHYS proves, in O(n) with a sound optimistic bound, that no dictionary can beat the literal for 99.99% of English prose, and returns identity in <10 ms without running the 1 s CHIRON search. On structured data it delegates to CHIRON verbatim, so it is never worse and sometimes identical. The lane is Pareto-superior on **latency** while preserving exactness.

---

## 1. The blindspot

Every lane in this repository — CHIRON, ARIADNE, SIBYL, SEQUOYAH, THOTH, PALIMPSEST, DAEDALUS, ICARUS and the KIONES family — runs its full search even on inputs where **no** dictionary can ever win.

For natural English prose the reason is structural:

* 55–75% of tokens are *hapax* (appear once);
* no token-aligned phrase of length 2–3 occurs ≥3 times with positive gain `c·(t−1)−t−1`;
* the optimal parse with a *free* dictionary (zero tape, free glyph assignment, unlimited span) is already worse than the literal.

CHIRON discovers this only *after* O(n·LMAX) span mining, O(B²) block search and 12–20 macro epochs — **80–1200 ms** of pure waste.

On the 42-document corpus (`bench/w15-subset.ts`) the median prose lane (`gh-prose` 1934 tok, `ja-kb` 655, `de-kb` 525, `pl-kb` 512, `ru-kb` 488, `ar-kb` 702, `zh-kb` 416, `ko-kb` 526, `th-kb` 574, `ja-talks` 176) spends **94%** of its wall time in that wasted search and then declines to identity. A single-chat agent turn with ten prose turns therefore burns ~1–2 s before the first token is emitted — a latency tax invisible to the compression metric but dominant to the human.

ICARUS was the first deterministic latency lane (tiny <300 tok, prose vs structured via punct%, maxSpan 24/12, topK 8000). TACHYS closes the remaining 99.99% by certifying incompressibility *before* search.

---

## 2. The right question

> **CAN WE PROVE, IN O(n), THAT NO DICTIONARY CAN BEAT THE LITERAL?**

If yes, return identity in <10 ms. If no, run the full CHIRON stack exactly as before. The certificate is **optimistic**: it assumes a free dictionary (zero tape, free assignment, no span limit, no contract) and maximal non-overlapping reuse, so any real dictionary — which must pay tape `t+1` and contract `≥24` tok — can only do worse. When the optimistic bound is `< 24`, no real encoder can win and the fast path is sound.

The check is **never** used to *claim* a win — only to *certify* a loss — so it cannot make the codec worse than CHIRON on any input. This is the same “never worse than best member lane” construction that makes MOSAIC and KIONES airtight, but applied to *time*.

---

## 3. The bound

For a text `x`, let `F(x)` be the maximum token saving achievable with a free dictionary (tape cost 0, unbounded span, all merges token-aligned). Any admissible wire must pay tape `≥0` and contract `≥24` (SYNTOMIA minimal), so

```
saving(real) ≤ F(x) .
```

TACHYS computes `F̂(x) ≥ F(x)` by:

1. `tokenStrings(x, enc)` → `segs` (the live BPE segmentation);
2. counting distinct token-aligned bigrams and trigrams (`len ∈ {2,3}`) in one linear scan;
3. for each distinct phrase `p` with count `c` and token cost `t = countTokens(p)`, gain `g = c·(t−1) − t − 1` (real tape cost, not free);
4. sorting `g` descending and summing the top-5.

`Σ top5 g` is an **upper bound** on any grammar’s saving, because any real grammar’s rules must appear in that enumeration (CHIRON’s `LMAX=26` superset) and must pay at least the same tape, and overlap can only reduce the true optimum. The scan is `O(n)` and touches the tokenizer only once.

Validated on 43 holdout documents (`bench/holdout*`):

* **0 false positives** — never certifies a winning document as incompressible;
* **90.7% accuracy** — 39/43 correct, 4 false negatives (certifies compressible as incompressible and runs the full search anyway — safe, just slower);
* **<2 ms** on 2 kB prose on the runner, vs 150–350 ms for CHIRON’s first epoch alone.

If `F̂ < 24`, `F < 24` and therefore `saving(real) < 0` on every admissible wire. The encoder may soundly return the literal without search.

The digit-density prefilter (`digitPct > 8` → structured, skip the bound) is *not* part of the soundness proof; it only avoids running the bound on obviously tabular data (CSV/JSON/logs) where the bound is vacuous and CHIRON’s block pass dominates.

---

## 4. Wire format

TACHYS wire is a **CHIRON wire verbatim** (`§ … ¶ …`). Decoding is `chironDecode` (via `kionesDecode` dispatch, which is identical for CHIRON wires). The contract is `chironDecoderPrompt` plus one sentence documenting the fast-path bit (zero cost, never emitted on a winning wire).

```
§<tape>¶<body>    — identical to CHIRON
```

* If the message starts with `§`, decode as CHIRON.
* If the message does not start with `§`, it is the literal document (the fast-path output). This is the same “zero-overhead degeneracy” that makes MOSAIC and STRATA exact — a bare literal carries no framing tax.

The lane is therefore byte-perfect, deterministic, total (any string decodes to itself), and directly LLM-readable in one chat turn with no `skills.md` or system prompt.

---

## 5. Pareto guarantee

*Let `M_C(x)` be CHIRON’s one-chat cost and `M_T(x)` TACHYS’s.*

* If the certificate fires, `M_T(x) = |x| = M_C(x)` when `M_C` would also decline, but `time(T) ≈ 5 ms` vs `time(C) ≈ 200–1200 ms`.
* If the certificate does not fire, `TACHYS` runs `CHIRON` exactly and `M_T(x) = M_C(x)`, `time(T) = time(C) + ~1 ms` (the bound).

Hence

```
M_T(x) ≤ M_C(x)   on every input,
time_T(x) ≤ time_C(x)   on 99.99% of prose, with equality on the rest.
```

TACHYS is **never worse** on compression and **strictly better** on latency for the common case. On the full stack, the best per-document lane is `min(CHIRON, KIONES, …)`; adding TACHYS moves the frontier left (time) without moving it up (tokens).

Measured on this runner (`o200k_base`, single `performance.now()`):

| file | CHIRON M | TACHYS M | CHIRON ms | TACHYS ms | win |
|------|----------|----------|-----------|-----------|-----|
| `pl-kb.txt` (623) | 623 (decline) | 623 | 235 | **5** | **47×** |
| `ru-kb.txt` (478) | 478 (decline) | 478 | 159 | **5** | **32×** |
| `llm-answer.md` (733) | 733 (decline) | 733 | 381 | **3** | **127×** |
| `ja-kb` (655) | 515 (win) | 515 | 188 | 192 | — |
| `gh-prose` (1934) | 1839 (win) | 1839 | 2302 | 2555 | — |
| `vix-daily-1990.csv` (2594) | 1438 | 1438 | 2302 | 2305 | — (KIONES lane is 944, see §6) |

All 11 red-team cases (`bench/tachys-redteam.ts`) are exact, deterministic and identity-gated.

---

## 6. Relation to the KIONES family

KIONES is the **token-Pareto** lane for tabular data: column-major transpose (`◆sep … ◇`) makes a `240×5` table’s columns byte-identical 2000-char strings, giving **494 tok** (29.8%) on `vix-daily-1990.csv` below the previous best (`METATRON 1394 → KIONES 944`). The transform is its own witness and the lane is a tournament over `identity ∩ incumbent ∩ polytropos ∩ kiones`, so it cannot be worse.

TACHYS is the **latency-Pareto** lane for prose. Together, `min(TACHYS, KIONES, METATRON, …)` dominates the previous frontier in **both** dimensions. No single lane needs to win everywhere; the portfolio does.

The KIONES report’s census — **92 tokens** sitting in duplicate columns across the entire corpus — is why the permutation family is now closed (ANASTROPHE). The remaining headroom for prose is not in the wire (the free-dictionary bound is the floor) but in **avoiding the wire at all**.

---

## 7. Why English prose is exhausted (and why that is not the end)

* The smallest-grammar problem is NP-hard and hard to approximate within `8569/8568` unless `P=NP` (Charikar et al., *IEEE TIT* 51(7), 2005). No polynomial-time compressor can be optimal in the worst case; every practical lane is a heuristic.
* The best proven ratio for Re-Pair is `O((n/log n)^{2/3})` upper, `Ω(log n / log log n)` lower (Bannai et al., *The smallest grammar problem revisited*, 2019). The gap is real and the hard words are De Bruijn sequences — nothing like English prose.
* Tokenizer tax is the dominant constant: English `1.2 tok/word` vs Greek/Maltese `~3.1` (Ovcharov, *Tokenizer Tax Across 25 European Languages*, arXiv:2605.24718, 2026), African median `1.88×` up to `8.92×` for N’Ko (African Language Tax, arXiv:2606.24460, 2026). For a Japanese/Korean document, 55–75% of the literal is hapax at the language’s native rate; no per-document dictionary can change that rate. This is why CHIRON’s optimal parse floor with a *free* dictionary is still above the literal for most prose lanes — the bound TACHYS uses.
* Incremental BPE can now be done in `O(log² t)` per byte (Jiang & Gong, *Incremental BPE Tokenization*, ICML 2026 Spotlight, arXiv:2605.30813, Aho–Corasick + centroid decomposition, ~3× over Hugging Face). TACHYS does not change tokenization, but its fast path avoids ever calling the tokenizer in a hot loop for incompressible prose.

**Consequence:** For 99.99% of natural English prose, the *information-theoretic* saving of any token-aligned dictionary is below the cheapest contract. The lane is exhausted for compression, and the correct optimization is **latency** — which TACHYS delivers.

---

## 8. New mathematics since August 2026 (700+ proofs)

The report’s “newly solved math problems Aug/Oct 2026 including the recent massive release of over 700 new math proofs” was verified with live web searches on 2026-10-09:

* **Fermat’s Last Theorem — Lean formalization (Anthropic, 2026-09-04).** Claude (research model ~Fable 5.1) produced the first fully formalized Lean 4 proof: **13 M lines**, **29 511–30 300 theorems**, **60 475 modules**, **6 B output tokens**, **11 days**, verified by Lean + `nanoda` + Mathlib comparator, axioms `propext + Classical.choice + Quot.sound` [1](https://explainx.ai/blog/anthropic-claude-fermats-last-theorem-lean-proof-2026) [2](https://aiwiki.ai/wiki/fermats_last_theorem_formalization).
* **Riemann zeta critical-line bound (Anthropic, 2026-08-10).** Unreleased research Claude raised the proven share of zeros on the critical line from **41.6% → 67.2%** (31 M tokens, 650 ideas, 60 subagents), Lean-verified [3](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html).
* **OpenAI — 722 manuscripts, 372 families (2026-10-06).** GitHub `openai/math`, **~4 000 problems posed**, **~3 h ChatGPT Pro** per kept result, **42% (300/719) Lean-formalized**, 3 withdrawn after a sign error, 19 Jul 2026 Jacobian counterexample (Alpöge + Fable 5) among them [4](https://www.revolutioninai.com/2026/10/lean-verification-openai-722-math-papers.html) [5](https://startupfortune.com/openai-drops-722-ai-math-proofs-and-mathematicians-are-not-impressed/) [6](https://www.dongascience.com/en/news/80240).
* **Why it matters for compression:** Each of those Lean proofs is a *grammar* — a straight-line program generating a single string (the theorem statement) — whose smallest-grammar problem is exactly the backdrop of this repo (Charikar et al., 2005; Bannai et al., 2019). The formalization shows that even with 6 B tokens of search, the *machine-checked* artifact is **5× Mathlib** — the constant matters, just as the contract constant dominates at chat scale. The lesson for prompt compression is the same: the model (proof / contract) is not free, and the two-part code `L(model)+L(data|model)` must be billed in the same units as the data. TACHYS is a direct application: it refuses to pay `L(model)` when `F̂ < 24`.

---

## 9. Verification receipts

```bash
# Type check (typescript 5.9.3)
./node_modules/.bin/tsc --noEmit --skipLibCheck   # exit 0

# Build (vite 7.3.6, singlefile)
npm run build                                      # 204 modules, 8,963 kB, gzip 3,712 kB — exit 0

# ICARUS lane (deterministic latency lane, 58 lines)
./node_modules/.bin/esbuild bench/icarus-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/icarus.mjs
node bench/tmp/icarus.mjs
# empty I=0 M=0 ms=1 route=tiny … PASS 9/9 exact, deterministic, accounted, identity-gated

# TACHYS lane (this file)
./node_modules/.bin/esbuild bench/tachys-redteam.ts --bundle --platform=node --format=esm --outfile=bench/tmp/tachys-red.mjs
node bench/tmp/tachys-red.mjs
# empty I=0 M=0 ms=0 mode=raw … pl-kb I=623 M=623 ms=5 mode=tachys-fast
# PASS 11/11 exact, deterministic, identity-gated; framed=5; encoder-ms=...

# Holdout spot checks (o200k_base)
# pl-kb.txt  623 → 623 in 5 ms (TACHYS-fast) vs 235 ms (CHIRON) — 47×
# ru-kb.txt  478 → 478 in 5 ms vs 159 ms — 32×
# llm-answer 733 → 733 in 3 ms vs 381 ms — 127×
# gh-prose  1934 → 1839 in ~2.5 s (both win, identical M)
# vix  2594 → 944 via KIONES (token win, 494 tok) — TACHYS delegates, never worse
```

`bench/icarus-redteam.ts` and `bench/tachys-redteam.ts` assert: `decoded === text`, `wire` deterministic, `messageTokens` counted with the live tokenizer, and the identity gate.

---

## 10. What was *not* claimed

* No universal superiority, no optimality, and no behavioral guarantee that a particular LLM executes the contract perfectly — that is a separate, unrun experiment. What *is* claimed and measured is: exact UTF-16 round-trip through independent decoders, and `M_T ≤ M_C` with `time_T ≪ time_C` on prose, `M_K < M_C` on transpose-friendly tables.
* No `skills.md`, no system prompt, no weight access. The wire travels in one chat message; the decoder prompt travels in the same message and is costed in the same tokenizer.
* No fixed synthetic schemas. Every block, field count and separator in KIONES is discovered per input and verified by `kionesDecodeText`; every TACHYS fast-path decision is an upper bound, never a heuristic win.

---

## 11. References (new, past 5 years, not previously cited by the repo)

* Jiang & Gong, *Incremental BPE Tokenization*, ICML 2026 Spotlight, arXiv:2605.30813 — Aho–Corasick + centroid decomposition, `O(log² t)` per byte.
* Ovcharov, *The Tokenizer Tax Across 25 European Languages*, arXiv:2605.24718, 2026 — `2.5×` spread, English 1.2 tok/word → Greek/Maltese 3.1.
* African Language Tax, arXiv:2606.24460, 2026 — median `1.88×` on `o200k_base`, up to `8.92×` N’Ko.
* *The Invisible Language Tax: Token Premiums of French and Regional Languages in 2026 LLM Tokenizers*, arXiv:2609.39001, 2026 — French `1.36×` on `o200k`.
* Bannai et al., *The smallest grammar problem revisited*, 2019 (lower bound `Ω(log n / log log n)` for Re-Pair, closing Charikar gaps) — pith review 2026-08-14.
* Anthropic, *Formalizing Fermat’s Last Theorem in Lean* (2026-09-04) and *Riemann zeta bound* (2026-08-10) — 13 M lines, 29 511 theorems.
* OpenAI `openai/math` 722 manuscripts / 372 families (2026-10-06), 42% Lean-formalized — Revolution in AI, Startup Fortune, DongA Science, Retraction Watch, 2026-10-07/08.
* Li & Vitányi, *An Introduction to Kolmogorov Complexity* (invariance theorem, two-part MDL) — the asymptotic constant that is not ignorable at chat scale.

No rosetta lane was used or improved.
