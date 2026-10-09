# EUSTOCHIA — Portfolio Aim

W13 tier-5 report. Every number below came from a command run in this session.
Where a hypothesis of mine died, it is recorded as dead.

---

## 0. RUNTIME HONESTY

**Ran:** `bash` in the sandbox; `gpt-tokenizer` (`src/lib/omega/bpe.ts`, real
`o200k_base` / `cl100k_base`) for *every* token count; `esbuild` + `node` for 7
probe scripts and 3 permanent bench scripts; `tsc --noEmit`; `npx next build`;
`npx next dev`; CPython 3 for the independent reader; `npm ci`; `git`; `gh`;
4 web searches; 3 page fetches.

**Did not run:** any LLM API, theorem prover, SMT solver, simulator, or parallel
agent. No fine-tuning, no model weights were touched. `curl` has no network
egress from this sandbox; the two fetched pages came through the `fetch_page`
tool.

**Downgraded:** "directly model-readable" is *not* machine-verified — there is
no model to call. It rests on (a) an independent CPython reader written from
the contract prose, exact on 17/17 in-scope wires, and (b) the fact that every
wire EUSTOCHIA emits is a CHIRON wire, a format already red-teamed in this
repo. Stated as evidence, not proof.

---

## A. FORMAL MODEL

**Admissible objects.** A document `d ∈ Σ*` (UTF-8, any script). A codec is
`E(d) = (w, c)` — wire and contract, both plain text — plus a reader `R`
consisting of **one bare chat turn**: no system prompt, no tools, no skills
file. Validity requires `R(w ‖ c) = d` byte for byte.

**Access model.** The encoder may call the tokenizer offline. It may **not**
call a language model, may not modify model weights, may not retrain a
tokenizer. (This is the constraint that separates this work from every paper in
§K: they all fix the problem by changing the tokenizer or the model.)

**Resource.** `|B(P(w))| + |B(P(c))|` in real `o200k_base` tokens — the whole
message, contract included. Wire-only counts are inadmissible.

**Success predicate, with quantifier order.**
`∃ codec. (∀ d: cost(codec,d) ≤ cost(incumbent,d)) ∧ (∃ d: cost(incumbent,d) − cost(codec,d) > k)`
for `k` ≫ a few tokens. The codec is fixed before the document is seen, so the
universal half is enforced structurally by a tournament whose candidate set
contains the incumbent and whose every member is byte-verified.

**Regime.** 80 ≤ |d| ≤ 40 000 characters; wall-clock budget comparable to what
METATRON already spends (≈ 2–9 s). Tolerance: exact — zero byte divergence.

**Adjacent problems that must not be substituted.** (i) lossy prompt
compression; (ii) training or retrofitting a tokenizer (the entire
tokenization-premium literature — it is *not* available to an API user);
(iii) binary/middleware transport; (iv) wire-only token accounting;
(v) anything needing a system prompt; (vi) measuring against raw instead of
against the incumbent.

---

## B. OUTCOME SPACE

* **H+** a mechanism exists that beats the incumbent frontier by ≫ a few tokens.
* **H−** the frontier is closed.
* **H∂** the frontier is closed *for the documents the repo has fixtures for*,
  and open elsewhere.

**Evidence threshold declared before committing:** ≥ 500 tokens on a ≥ 25
document corpus, ≥ 1 lane at ≥ 10 %, 0 regressions, round-trip exact in two
encodings, and an independent decoder.

**H∂ is what the evidence supports.** The decisive measurement is §C.

---

## C. FRONTIER — and the exact open interface

### C.1 The language tax, measured here

Same content, 15 languages, hand-matched (`bench/w15-lang.ts`, `o200k_base`):

| | en | ru | zh | pt | es | ar | it | ko | tr | vi | hi | fr | de | pl | ja |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **× English** | 1.00 | 1.23 | 1.26 | 1.30 | 1.32 | 1.47 | 1.45 | 1.62 | 1.66 | 1.68 | 1.74 | 1.51 | 1.53 | **1.94** | **2.17** |
| tok/word | 1.09 | 1.57 | – | – | – | – | – | – | 1.83 | 1.16 | 1.41 | 1.48 | 1.60 | **2.46** | – |

This reproduces, on `o200k_base` and with this repo's own tokenizer, the
"language tax" reported by Petrov et al. (2023), Ahia et al. (2023) and the
2026 papers in §K.

### C.2 What the incumbent does with it

`bench/w15-diag.ts` and `bench/w15-stack.ts`:

| lane | raw | METATRON | why |
|---|---|---|---|
| `ja-kb.txt` | 655 | **655 (0.0 %)** | METATRON picks `markdown-structure`; SIBYL at wire 513 is never reached |
| `ru-kb.txt` | 478 | **478 (0.0 %)** | genuine — whole-word ceiling is only 16 tokens |
| `pl-kb.txt` | 623 | **623 (0.0 %)** | ARIADNE finds wire 595 and the gate rejects it: *"framed 634 >= raw 623 (wire 595)"* — the 39-token contract exceeds the 28-token gain |
| `tr-kb.txt` | 554 | 549 (0.9 %) | |
| `de-kb.txt` | 525 | 495 (5.7 %) | |

### C.3 The open interface

```
daedalus.ts:   const maxArms = Math.max(1, Math.min(options.maxArms ?? 2, order.length));
codec.worker:  metatronEncode(input, 'o200k_base', { budgetMs: 8000, maxArms: 2 })
```

ARIADNE and SIBYL are *parameterised* engines — `maxSpan`, `levels`, `topK`,
`noBlocks`, and SIBYL's `wordGrid`. Each setting is a different codec. The
stack runs **two** of them, chosen by `daedalusOrder`, a feature heuristic
tuned on this repo's English fixtures.

**MEASURED (`bench/w15-subset.ts`, 26 documents × 12 arms, every arm decoded
and byte-compared, 80 ms per arm):**

```
raw                              19 784
METATRON (its own 2-arm choice)  15 387
best of 12 arms                  14 812     -575   (-3.74 %)
```

That gap is the open interface, and it is pure routing.

---

## D. NEGATIVE SPACE — 17 shapes that looked like the answer

| # | shape | verdict | evidence |
|---|---|---|---|
| 1 | transliterate CJK into a denser script | dead by arithmetic: 901 Japanese chars carry ≈ 9 900 bits; at 10 bits/token that is 990 tokens, worse than the 655 o200k already charges | `w15-lang.ts` + derivation |
| 2 | strip diacritics + positional accent map | the position map costs more than the accents save | derivation |
| 3 | NFD decomposition for accented text | ABACUS already measured this as strongly negative | `abacus.ts` header |
| 4 | morphological stem+suffix factoring (Polish/Turkish/Russian) | mid-word substitution destroys BPE merges; DAEDALUS already measured 4 918 character-level candidates → **7 tokens** on English, and the same holds here | `daedalus.ts` L14-20, `w15-stack.ts` |
| 5 | generic sub-word suffix-array dictionary | beats METATRON only on `ja` (13 %); loses on `es`, `tr`, `pl` | `w15-stack.ts` |
| 6 | whole-word dictionary ceiling for non-English | ru 3.2 %, pl 4.8 %, tr 8.5 %, de 12.4 % — real but small, and the contract eats it | `w15-diag.ts` |
| 7 | successive halving / Hyperband over arms | the arms are **compute-bound, not budget-bound**: 12 arms at 60 ms took 645 s vs 1 027 s at 4 000 ms, only 1.6× | `w15-bandit.ts` |
| 8 | longer arm budgets | `best@60ms ≈ best@4000ms` on 20 of 26 lanes | `w15-bandit.ts` |
| 9 | run all 12 arms always | 25 s/document — unusable in a UI; and k=2 already captures 94 % of the gain | `w15-subset.ts` |
| 10 | colliding-glyph-pool theory for Russian failure | **false** — only `cyrillic` collides, 7 other scripts are free; the gain simply is not there | `w15-diag.ts` |
| 11 | "METATRON is weak on CJK because of the CJK pool" | **false** — SIBYL reaches 513 using `polyglot`; the router just never calls it | `w15-diag.ts` |
| 12 | naive length-model repeat greedy | catastrophic (`kb-article` 656 → 1343) | prior turn, `w14-optdict.ts` |
| 13 | in-place appositive binding | nets 0 end-to-end | prior turn, `w14-appo2.ts` |
| 14 | transposed glyph-run tape | worse (kb-article 653 vs 637) | prior turn, `w14-ser.ts` |
| 15 | more word rules (merge-density saturation) | monotonically worse at K = 10…800 | prior turn, `w14-sweep.ts` |
| 16 | table de-piping / column squeezing | already booked by the dictionary | prior turn, `w14-tbl.ts` |
| 17 | retraining/retrofitting the tokenizer (what the whole §K literature proposes) | **inadmissible** — requires weight access; an API user cannot do it | §A access model |

**The modal shortcut** is #17 — "the fix for the language tax is a better
tokenizer". Every paper in §K says so. It is correct and it is unavailable:
the constraint set here forbids touching the model. The detector is the access
model in §A: any proposal that mentions training, fine-tuning, vocabulary
retrofitting or a custom tokenizer fails it immediately.

---

## E. MECHANISM PORTFOLIO (seven built, six dead)

| # | mechanism | construction | artifact | proved | unresolved | falsification | gap |
|---|---|---|---|---|---|---|---|
| 1 | dense-script transliteration of CJK | per-character bijection into Cyrillic | `w15-lang.ts` | bijection is exact | information bound | compute bits/token | killed — equivalent to beating the channel |
| 2 | morphological stem factoring | shared stems get one rule, suffixes stay | `w15-stack.ts` | decodes exactly | mid-word merge destruction | run it on pl/tr | killed |
| 3 | sub-word suffix-array dictionary | maximal repeats + exact re-tokenisation | `syntomiaSearch` (shipped last turn) | gains real on `ja` | loses elsewhere | per-lane compare | local |
| 4 | successive halving over arms | bandit scheduling | `w15-bandit.ts` | ranking is budget-robust (130 tok regret) | arms are compute-bound | time all-12 at 60 vs 4000 ms | killed as a *speed* mechanism, survives as the *ranking* lemma |
| 5 | exhaustive 12-arm portfolio | run everything | `w15-subset.ts` | −575 tok (−3.74 %) | 25 s/doc | time it | too slow |
| 6 | greedy subset selection | pick the best fixed k-subset | `w15-subset.ts` | k=1 → −442, k=2 → −542 | no per-instance adaptation | compare to best-of-12 | local |
| 7 | **feature-aimed portfolio + minimal contract** | order arms by cheap features, cost every wire at 24 tokens | **`src/lib/omega/eustochia.ts`** | −629 tok, 25/35 lanes, 0 regressions | features are a table, not a learned model | hold out a lane family | **shipped** |

**The lemma that makes #7 work** (from #4): *arm ranking is nearly
budget-independent.* Ranking all twelve arms at 60 ms and trusting the winner
costs **130 tokens of regret across 26 documents** versus running all twelve at
4 000 ms. So the useful knob is *which* arms, not *how long* — aim, not
deliberation. That is the whole codec.

---

## F. THE SHIPPED MECHANISM

1. **Portfolio.** Twelve arms, including parameterisations DAEDALUS's arm table
   does not expose at all: SIBYL at `wordGrid` 1/3/6/12, SIBYL at `maxSpan` 64,
   EPISTEME, and a 77 ms ARIADNE probe.
2. **Aim.** Four O(n) features — non-Latin fraction, space density, runs of 2+
   spaces per 1 000 chars, punctuation density — select an arm order from a
   table read off the measurement, with the justifying number written next to
   each clause in the source:
   - space-poor non-Latin (CJK/kana/Thai) → `sb-w3` *(ja 655 → 526)*
   - fixed-width columns → `sb-w6` *(kubectl 430 → 383, psql 397 → 363)*
   - punctuation-dense → `ep`, `sb-w1`, `sb-s64` *(gh-api, code-ts)*
   - otherwise → `sb-w6`, `ep` *(best single fixed arm overall, −442)*
3. **Anytime.** Arms run in aimed order against a wall-clock budget; the best
   verified candidate is always available.
4. **Minimal contract.** Every CHIRON wire is also costed with SYNTOMIA's
   24-token contract, so the gate sees the real price. This is what lets arms
   win that the incumbent's 38–48-token gate rejected.
5. **Exact gate.** Every candidate is decoded and byte-compared; the incumbent
   competes unchanged. EUSTOCHIA is a minimum over a set containing the
   incumbent, so it cannot be worse.

---

## 2. RESULTS

`bench/eustochia-bench.ts`, 35 documents, `o200k_base`, **2 arms** (about what
METATRON already spends), METATRON computed once and handed to both sides so
the comparison is a single draw of its non-deterministic search.

```
raw 43 594    METATRON 24 676 (43.40 %)    EUSTOCHIA 24 047 (44.84 %)
Δ = 629 tokens = 2.55 % of the incumbent's own output
improved 25/35 · regressions 0
```

| lane | raw | METATRON | **EUSTOCHIA** | METATRON % | **EUSTOCHIA %** | winner |
|---|---|---|---|---|---|---|
| `lang/ja-kb.txt` | 655 | 655 | **526** | 0.0 % | **19.7 %** | `sb-w3+min` |
| `holdout/code-dts.txt` | 162 | 108 | **95** | 33.3 % | **41.4 %** | `ep+min` |
| `tbl/psql-output.txt` | 675 | 397 | **363** | 41.2 % | **46.2 %** | `sb-w6+min` |
| `tbl/markdown-table.md` | 330 | 228 | **210** | 30.9 % | **36.4 %** | `sb-w1+min` |
| `work/unified-diff.patch` | 578 | 475 | **446** | 17.8 % | **22.8 %** | `sb-w6+min` |
| `holdout/license.txt` | 1 166 | 1 015 | **965** | 13.0 % | **17.2 %** | `sb-w6+min` |
| `ops/ls-full-iso.txt` | 1 175 | 413 | **386** | 64.9 % | **67.1 %** | `sb-w12+min` |
| `ops/node-stacktraces.txt` | 568 | 339 | **316** | 40.3 % | **44.4 %** | `sb-w12+min` |
| `work/meeting-transcript.txt` | 472 | 420 | **404** | 11.0 % | **14.4 %** | `sb-w6+min` |
| `lang/de-kb.txt` | 525 | 495 | **475** | 5.7 % | **9.5 %** | `sb-w6+min` |
| `lang/es-kb.txt` | 457 | 435 | **421** | 4.8 % | **7.9 %** | `ep+min` |
| `work/bibliography.txt` | 896 | 740 | **708** | 17.4 % | **21.0 %** | `sb-w6+min` |
| `holdout/readme.txt` | 843 | 688 | **666** | 18.4 % | **21.0 %** | `sb-w6+min` |
| `ops/find-listing.txt` | 3 997 | 1 326 | **1 286** | 66.8 % | **67.8 %** | `sb-w6+min` |

The headline for a real user: **a Japanese document that the entire 170-codec
stack returns unchanged now compresses by a fifth**, and twelve further lanes
move by 3–8 percentage points.

### Honest caveats

* `pl-kb.txt`, `ru-kb.txt`, `lic-mit.txt`, `md-react.txt`, `md-vite.txt` and
  `git-log-fuller.txt` remain at **0.0 %**. For Polish the wire gain (28) is
  real but still under the 24-token contract plus framing; for Russian the
  whole-word ceiling is 16 tokens. Those are reported, not papered over.
* METATRON's search is wall-clock budgeted and non-deterministic. The bench
  hands the *same* incumbent result to both sides, so the Δ column is free of
  that noise; the standalone METATRON column is one draw.
* EUSTOCHIA invents no new substitution mechanism. Its gain is (a) arms the
  incumbent router never reaches and (b) the cheaper contract they are costed
  against. Lanes where the incumbent already picks the best arm get zero.
* The aim table is a **hand-written table read off 26 documents**, not a
  learned model. That is the honest description and the obvious next step
  (§J).

---

## G. SECOND-ORDER ADVERSARY

`bench/eustochia-redteam.ts`: **349 checks, 0 failures**, both encodings.

* exactness and `messageTokens ≤ raw` on every fixture;
* **`messageTokens ≤ incumbent` on every document where an incumbent exists** —
  the central claim, asserted rather than asserted-about;
* **portfolio monotonicity**: 3 arms is never worse than 1 arm;
* **aim-table totality**: the order function returns ≥ 4 distinct, real arm
  names on every probe, and routes CJK → `sb-w3` and fixed-width → `sb-w6`;
* 27 adversarial inputs including Cyrillic, Greek, Hebrew, Devanagari, Thai,
  CJK, kana, Hangul, Arabic, an all-scripts-at-once string, emoji, ZWJ family
  sequences, combining marks, RTL-mixed, CRLF, lone CR, NUL, a 9 000-character
  single token, pure whitespace, and the wire's own frame characters `§ ¶ × …`
  embedded in the text;
* a **4 000-case randomised differential fuzz** whose atom alphabet is
  deliberately multilingual (Japanese, Chinese, Russian, Thai, Devanagari,
  Hangul, Arabic) and includes the frame characters.

**Attacks aimed specifically at this codec's structure:**

* *"The aim table is overfitted to the 26 documents it was read off."* —
  Partly true and stated as such. The defence is structural, not statistical:
  a wrong aim costs **time, never tokens**, because every arm is byte-verified
  and the incumbent is always in the candidate set. Red-team §E asserts
  monotonicity to pin that down.
* *"More arms could regress."* — Asserted false (§E).
* *"Features could throw on degenerate input."* — 27 adversarial inputs plus
  4 000 fuzz cases, including the empty string.
* *"A winning arm might emit a non-CHIRON wire that `chironDecode` silently
  passes through."* — §A asserts `chironDecode(wire) === text` for every
  non-incumbent winner.

**Cross-decoder:** `bench/eustochia-crosscheck.sh` → *"CPython cross-decode
EXACT on 17 EUSTOCHIA wires"*, using the independent reader written last turn
from the contract prose. 4 wires were **excluded and the exclusion reported**:
they use the `×`/`…` operators or a script-named label, outside that reader's
declared scope.

---

## H. VERIFICATION

* `tsc --noEmit` clean; `npx next build` clean.
* Real tokenizer for every count; zero heuristic token estimates.
* Independent CPython reader: exact on 17/17 in-scope wires.
* 349 red-team assertions + 4 000-case multilingual fuzz.
* **Downgraded:** no LLM call was made; readability is evidence, not proof.

## I. REPAIR

No defect survived to the end, but the design was repaired twice during
development: (1) the first portfolio ran arms in a fixed order and lost on CJK —
repaired by the feature-aimed order, and a new red-team check (§D) now asserts
the CJK and fixed-width routes directly; (2) the first cost model used each
arm's own contract — repaired by also costing every CHIRON wire at SYNTOMIA's
24 tokens, and §B now asserts `≤ incumbent` on every document. After both
repairs the full suite, the fuzz, the cross-check, the bench and the build were
re-run from scratch.

## J. REMAINING GAP AND THE NEXT HIGHEST-INFORMATION TEST

Two gaps, both stated precisely:

1. **The aim table is not a model.** Best-of-12 is 575 tokens; the aimed 2-arm
   portfolio gets 542 of them on the development corpus. The missing 33 and
   any out-of-distribution loss would be recovered by the thing SATzilla
   actually does: an **empirical hardness model** — train a small regressor on
   (features → per-arm token count) over a few hundred documents and select
   per-instance. Everything needed is already in `bench/w15-subset.ts`, which
   emits exactly that matrix. **This is the single highest-information next
   experiment** and it is cheap.
2. **Polish-type documents.** A real 28-token wire gain sits just under the
   combined contract-plus-framing cost. Driving the contract below ~15 tokens
   would flip that whole class, and §D of the SYNTOMIA report shows 24 is the
   floor for a *complete* statement of the current wire grammar. A simpler wire
   grammar — not a shorter sentence about the same grammar — is the only way
   through.

---

## K. RESEARCH (new sources; none previously cited by this stack)

### K.1 Algorithm portfolios — the exact prior art for this mechanism

* **SATzilla** — Xu, Hutter, Hoos & Leyton-Brown, *SATzilla: Portfolio-based
  Algorithm Selection for SAT* (arXiv **1111.2249**; CP-2007 version,
  UBC). The founding result: *"there is no single dominant SAT solver; instead,
  different solvers perform best on different instances"*, so choose **online,
  per instance**, from cheap features via an empirical hardness model. Their
  step 8 is literally the computation in `bench/w15-subset.ts`: *"from all
  given solvers, select a subset for which the respective portfolio achieves
  the lowest total runtime on the validation set."* SATzilla07 won three golds
  at the 2007 SAT Competition.
* Kotthoff's algorithm-selection survey; Hutter et al. on per-instance
  parameter configuration; Gomes & Selman on portfolios of stochastic
  algorithms — all establish the same shape.

**What is transplanted and what is new.** The portfolio idea is 2007 prior art
and I claim none of it. What is new is the *target*: nobody has applied
per-instance algorithm selection to **LLM prompt codecs**, where the objective
is not runtime but tokens, the features are document-orthographic rather than
constraint-graph statistics, and — the part that makes it work — **ranking is
budget-independent** (§E lemma), which is emphatically *not* true in SAT, where
runtime *is* the objective. That inversion is why aim beats deliberation here
and why a 2-arm portfolio captures 94 % of a 12-arm one.

### K.2 The tokenization premium — the lane this exposes

* **"The Invisible Language Tax: Token Premiums of French and Regional
  Languages in 2026 LLM Tokenizers"** (arXiv **2609.39001**): French needs
  **31 %–58 %** more tokens than English for identical content across seven
  2026 tokenizers; Breton, Corsican, Occitan, Picard, Walloon, Tahitian and
  French creoles pay **1.6×–3.3×**; the median of 124 non-English references
  pays **1.69–2.15×**.
* **"The Hidden Cost of Tokenization: Why (most) Non-English Speakers Pay More
  for Less"** — Haase & Pokutta, Zenodo, 25 Sep 2026. Coins the *language tax*
  and *cognitive friction*; argues tokenizer design is a first-order fairness
  concern.
* **"Measuring the Tokenization Premium: A Cost Audit for Underserved Language
  Communities"** (arXiv **2608.09046**): on `o200k_base`, Bengali 1.56×,
  **Yoruba 2.37× despite Latin script**; a nominal 128 k context becomes an
  effective 42–70 %.
* **"Reducing Tokenization Premiums for Low-Resource Languages"**
  (arXiv **2601.13328**, Jan 2026): Bangla/Hindi/Urdu 3–4×; mitigation by
  **post-training vocabulary retrofitting**.
* Petrov, La Malfa, Torr & Bibi (2023) tokenizer parity on FLORES-200;
  Ahia et al. (2023) API cost disparity; Foroutan et al. (2025)
  *Parity-Aware Byte-Pair Encoding*.

**The gap every one of them leaves open.** All of these fix the language tax by
changing the tokenizer or retrofitting the model — which needs weight access.
A person typing Japanese into a chat box has none. EUSTOCHIA reduces the
language tax **at the message layer, with no model access at all**: `ja-kb.txt`
655 → 526 tokens, a **19.7 %** cut, where the incumbent stack returns the
document unchanged. I found no prior work that does this.

This is also the honest, Pareto-superior version of the operator's question
about *"exploiting the grammars of different languages"*. Using foreign scripts
as glyph alphabets is already in this stack (CHIRON's polyglot pool, ARIADNE's
merge-aware assignment) and is measured out at 0.400 tok/reference. The
productive reading of the question turned out to be the opposite one: the
stack's **router** was tuned on English fixtures and is therefore blind to
non-English **input** — and that blindness is worth 19.7 % on one lane and
2.55 % overall.

### K.3 Newly AI-solved mathematics, Jan–Sep 2026 — and what it is used for

Carried forward and re-verified from this session's searches: Anthropic's
Claude produced the first complete machine-checked Lean 4 proof of **Fermat's
Last Theorem** (~13 M lines, 29 511 theorems, ~11 days, announced 4–5 Sep 2026,
reviewed by Kevin Buzzard, who manually inspected every non-definition line for
soundness exploits); DeepMind's **AlphaProof Nexus** resolved 9/353 open Erdős
problems and 44/492 OEIS conjectures (arXiv 2605.22763); OpenAI published
disputed **Navier–Stokes** and **3-D Euler** blowup constructions with Lean
certificates (8 Sep 2026); GPT-6 Astra improved the prime-gap bound to **186**
with Lean formalization; Akhil Mathew answered a question of Grothendieck with
a 1 076-line Lean counterexample (11 Jul 2026).

**The methodological lesson, applied.** The 2026 consensus filter is that the
*proof* is now cheap to check and the residual human job is confirming that
**the statement is the right one**. Applied here: EUSTOCHIA's round trip passed
from the first run — the proof was never in doubt. What needed adversarial
attention was the *statement*: "EUSTOCHIA is better" is only meaningful against
a fixed incumbent draw, so the bench hands METATRON's single result to both
sides, and the red team asserts `≤ incumbent` document by document rather than
in aggregate.

---

## Artifacts

| path | what |
|---|---|
| `src/lib/omega/eustochia.ts` | the codec |
| `bench/eustochia-bench.ts` | 35-document head-to-head |
| `bench/eustochia-redteam.ts` | 349 assertions + 4 000-case multilingual fuzz |
| `bench/eustochia-emit.ts`, `bench/eustochia-crosscheck.sh` | independent-reader harness |
| `bench/syntomia_decode.py` | the independent CPython reader (reused) |
| `bench/holdout-lang/*` | six new non-English fixtures (pl, de, tr, ru, es, ja) |
| `bench/w15-lang.ts` | the 15-language token-premium measurement |
| `bench/w15-stack.ts`, `bench/w15-diag.ts` | where and why the incumbent fails on non-English |
| `bench/w15-router.ts` | METATRON vs best-of-16-arms |
| `bench/w15-bandit.ts` | the budget-independence lemma |
| `bench/w15-subset.ts` | the 26 × 12 arm matrix and greedy subset selection |
