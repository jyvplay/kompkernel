# AKRIBEIA — Exactness

W15 tier-5 report. Every number came from a command run in this session. Four
mechanisms were built this turn; three lost and are recorded as dead.

---

## 0. RUNTIME HONESTY

**Ran:** `bash`; `gpt-tokenizer` (`src/lib/omega/bpe.ts`, real `o200k_base` /
`cl100k_base`) for *every* token count; `esbuild` + `node` for 6 probe scripts
and 3 permanent bench scripts; `tsc --noEmit`; `npx next build`; `npx next
dev`; CPython 3 for the independent reader; `npm ci`; `git`; `gh`; 2 web
searches.

**Did not run:** any LLM API, theorem prover, SMT solver, simulator, or
parallel agent. No weights touched, no tokenizer retrained. `curl` has no
network egress here.

**Downgraded:** "directly model-readable" is *not* machine-verified — there is
no model to call. It rests on (a) an independent CPython reader written from
the contract prose, exact on 22/22 in-scope wires, and (b) the fact that every
wire AKRIBEIA emits is a CHIRON wire. Evidence, not proof.

---

## A. FORMAL MODEL

**Admissible objects.** `d ∈ Σ*` (UTF-8, any script). A codec is `E(d)=(w,c)`
— wire and contract, both plain text — plus a reader `R` consisting of **one
bare chat turn**: no system prompt, no tools, no skills file. Valid iff
`R(w‖c) = d` byte for byte.

**Access model.** The encoder may call the tokenizer offline. It may **not**
call a language model, modify weights, or retrain a tokenizer.

**Resource.** `|B(P(w))| + |B(P(c))|` in real `o200k_base` tokens — the whole
message. Wire-only counts inadmissible.

**Success, with quantifier order.**
`∃ codec. (∀ d: cost(codec,d) ≤ cost(incumbent,d)) ∧ (∃ d: Δ > k)`, `k` ≫ a few
tokens. The codec is fixed before the document, so the universal half is
enforced structurally: a tournament whose candidate set *contains* the
incumbent and whose every member is decoded and byte-compared.

**Regime.** 80 ≤ |d| ≤ 40 000 chars; wall-clock comparable to METATRON.
Tolerance: exact, zero byte divergence.

**Adjacent problems that must not be substituted.** (i) lossy compression;
(ii) retraining/retrofitting a tokenizer; (iii) binary transport; (iv)
wire-only accounting; (v) anything needing a system prompt; (vi) measuring
against raw instead of against the incumbent; (vii) **estimated** token counts
presented as measured ones.

---

## B. OUTCOME SPACE

* **H+** a mechanism beats the incumbent frontier by ≫ a few tokens.
* **H−** the frontier is closed.
* **H∂** the frontier is closed for the *substitution search*, and open for the
  *objective function the search optimises*.

Declared threshold before committing: ≥ 700 tokens over ≥ 35 documents,
≥ 1 lane ≥ 15 %, 0 regressions, exact in two encodings, independent decoder.

**H∂ holds.** Four substitution mechanisms were tried; three died (§D). What
survived is not a better search — it is a better *objective*.

---

## C. FRONTIER — and the exact open interface

ARIADNE states its own method in its notes:

```
full/"\n"; symbol-space DP; 9 macros, 0 blocks, 0 lists; script=cyrillic;
est=462 exact=458; assignment -0, local search -0; contract=39 for [rules]
```

`est=462 exact=458`. **The search optimises an estimate.** Three measured
consequences:

| # | consequence | measurement |
|---|---|---|
| 1 | SIBYL's `wordGrid` is an internal sweep whose winner is chosen by estimate | `bench/w16-grid.ts`: one call with `wordGrid:[0,1,2,3,4,6,8,12,16,24,32,48]` → **15 088** tokens in 119 s; four of those grid points as separate calls with the exact minimum → **14 855** in 272 s. The wide internal sweep is 2.28× faster and **233 tokens worse.** |
| 2 | DAEDALUS caps the portfolio at 2 arms (`maxArms ?? 2`) | `bench/w15-subset.ts` (prior turn): best-of-12 with exact selection is 575 tokens (3.74 %) below METATRON's 2 picks |
| 3 | rules survive whose **exact** marginal contribution is ≤ 0 | `bench/w16-polish.ts`: 10 tokens recoverable across 33 documents by exact removal |

**The open interface is the objective, not the algorithm.** The search is good;
it is being scored with the wrong ruler.

### The primitive that makes the right ruler affordable

tiktoken applies a regex pre-tokenizer before any BPE merge, and **merges never
cross a chunk boundary**. Therefore token count is *additive over chunks*, and
a replacement's delta is confined to the chunks it touches.

MEASURED (`bench/w16-local.ts`):

* chunk decomposition reproduces `countTokens` **exactly on 33 of 36**
  documents (3 divergences, +1..+3, from edge cases in the contraction and
  trailing-whitespace clauses);
* a **windowed** delta — re-tokenising only ±80 characters around each
  occurrence — agreed with the true whole-document delta on **7 of 7** probes,
  including `" the"` at 58 occurrences (true delta −4), `"\r\n   "` at 34
  occurrences (+23), `"https://github.com"` at 7 (+21).

Because of the 3 divergences, AKRIBEIA uses the chunk model **for ranking
only** — never for an accept/reject. Every acceptance is a real `countTokens`
call. Red-team §C asserts exactness specifically on the documents where the
chunk model is wrong.

---

## D. NEGATIVE SPACE — 17 shapes that looked like the answer

| # | shape | verdict | evidence |
|---|---|---|---|
| 1 | **portfolio FUSION** — pool the rule sets of 7 arms, re-select greedily with exact measurement | **0 tokens.** Worse than the arms on 22/26 lanes (gh-api 1138→1798, kubectl 383→535). Expanding nested rules to literals destroys the hierarchy the arms built | `bench/w16-fuse.ts` |
| 2 | **wide internal grid** — one SIBYL call with 12 word-grid points | 2.28× faster, **233 tokens worse** (selection by estimate) | `bench/w16-grid.ts` |
| 3 | naive pooled greedy over maximal repeats | catastrophic (prior turn: kb-article 656 → 1343) | `w14-optdict.ts` |
| 4 | exact **drop**-polish alone | only +10 tokens over 33 docs — ARIADNE's rule selection is clean | `bench/w16-polish.ts` |
| 5 | closing-tag elision for HTML/XML (`</div>` → `/`) | the dictionary already gets `</div>` to ~0.4 tok; a 1-token marker is **worse** | `bench/w16-mk.ts` census |
| 6 | HTML/XML as an uncovered lane | **false** — the stack already does 81 % on HTML, 48 % on XML | `bench/w16-mk.ts` |
| 7 | chunk-local accounting as a *speed* win | only 1–3× on whole-document counts; gpt-tokenizer is already fast | `bench/w16-local.ts` |
| 8 | successive halving / Hyperband over arms | arms are **compute-bound, not budget-bound** (12 arms at 60 ms = 645 s vs 1 027 s at 4 000 ms, 1.6×) | prior turn, `w15-bandit.ts` |
| 9 | CJK transliteration into a denser script | dead by arithmetic: 901 Japanese chars ≈ 9 900 bits; at 10 bits/token that is 990 > 655 | prior turn |
| 10 | morphological stem+suffix factoring | mid-word substitution destroys BPE merges; 4 918 character-level candidates → **7 tokens** on English | `daedalus.ts` L14-20 |
| 11 | in-place appositive binding | nets 0 end-to-end | prior turn, `w14-appo2.ts` |
| 12 | transposed glyph-run tape | worse (kb-article 653 vs 637) | prior turn, `w14-ser.ts` |
| 13 | more word rules (merge-density saturation) | monotonically worse at K = 10…800 | prior turn, `w14-sweep.ts` |
| 14 | table de-piping / column squeezing | already booked by the dictionary | prior turn, `w14-tbl.ts` |
| 15 | diacritic stripping with a positional accent map | the position map costs more than the accents save | derivation |
| 16 | brotli-entropy headroom as a bound | the stack is already **below** brotli × 8 ÷ 10 bits/token on all 16 lanes | prior turn, `w14-floor.ts` |
| 17 | retraining the tokenizer (what the whole language-tax literature proposes) | **inadmissible** — needs weight access | §A |

**The modal shortcut** this turn was #1, portfolio fusion: *"the arms find
different rules, so pool them."* It fails because an arm's output is a
**hierarchical grammar**, not a flat rule list — CHIRON rules nest, and
expanding them to literals for pooling throws away exactly the structure that
made them cheap. The detector is `bench/w16-fuse.ts`: pool, re-select with
exact measurement, and compare per-lane against the arm you pooled from. It
reports 0 improvement and large regressions, which is the signature of
structure loss rather than search weakness.

---

## E. MECHANISM PORTFOLIO (six; five dead, one shipped)

| # | mechanism | central construction | artifact | proved | unresolved interface | cheapest falsification | gap |
|---|---|---|---|---|---|---|---|
| 1 | chunk-local token algebra | token count is additive over pre-tokenizer chunks | `pretokenChunks`, `akribeiaEstimate`, `chunkModelExact` | exact on 33/36; windowed deltas 7/7 | 3 regex edge cases | `Σ T(chunk) == T(doc)` | local — shipped as a ranking-only accelerator |
| 2 | portfolio fusion | pool rule sets, re-select | `bench/w16-fuse.ts` | decodes exactly | hierarchy is lost on flattening | per-lane compare vs the pooled arm | killed |
| 3 | wide internal grid | one call, many grid points | `bench/w16-grid.ts` | 2.28× faster | internal selection is by estimate | compare to external exact min | killed as a *quality* mechanism; it is the evidence for #5 |
| 4 | exact drop-polish | remove any rule whose exact marginal value ≤ 0 | `akribeiaPolish` | +10 tok, byte-exact, 0–170 ms | add-step not implemented | run it on any arm's wire | local — shipped |
| 5 | **exact external grid selection** | sweep SIBYL's word grid one point per call, choose by real token count | **`src/lib/omega/akribeia.ts`** | **+974 tok (3.51 %), 34/42 lanes, 0 regressions** | arm order is a table, not a learned model | hold out a lane family | **shipped** |
| 6 | HTML/XML close-tag elision | stack-discipline close marker | `bench/w16-mk.ts` | census: 35 % of `page.html` is closing tags | the dictionary is already cheaper | compare 1-token marker vs 0.4-token glyph | killed |

**The lemma that makes #5 work** (from #3): the machinery to try every grid
point already exists and is cheap — **only the selection rule is wrong.**
Replacing the estimate with a real measurement is 233 tokens on 26 documents,
and it is the single largest component of the shipped gain.

---

## F. THE SHIPPED MECHANISM

1. **Exact external grid selection.** SIBYL's `wordGrid` is swept one point per
   call and the winner chosen by `countTokens`, not by SIBYL's estimate.
2. **Aim.** Four O(n) features (non-Latin fraction, space density, 2+ space
   column runs, punctuation density) order the arms before anything runs; each
   clause in the source carries the measurement that justifies it.
3. **Minimal contract.** Every CHIRON wire is also costed with SYNTOMIA's
   24-token contract instead of CHIRON's 38–48.
4. **Exact drop-polish.** Every rule in the winning tape is removed by
   *inlining its text through the tape and the body* and re-measured; rules
   that do not pay are deleted. 0–170 ms.
5. **Exact gate.** Every candidate is decoded with the shipped `chironDecode`
   and byte-compared; the incumbent competes unchanged.

---

## 2. RESULTS

`bench/akribeia-bench.ts`, **42 documents**, `o200k_base`, 3 arms, METATRON
computed once and handed to every side so the comparison is a single draw of
its non-deterministic search.

```
raw 52 365    METATRON 27 774 (46.96 %)    EUSTOCHIA 27 012    AKRIBEIA 26 800 (48.82 %)
Δ vs METATRON = 974 tokens = 3.51 % of the incumbent's own output
Δ vs EUSTOCHIA (last turn's codec) = 212 tokens = 0.78 %
improved 34/42 · regressions 0 · lanes flipped from 0 %: 2
```

| lane | raw | METATRON | **AKRIBEIA** | METATRON % | **AKRIBEIA %** |
|---|---|---|---|---|---|
| `lang/ja-kb.txt` | 655 | 655 | **515** | 0.0 % | **21.4 %** |
| `holdout/code-dts.txt` | 162 | 108 | **92** | 33.3 % | **43.2 %** |
| `tbl/markdown-table.md` | 330 | 228 | **202** | 30.9 % | **38.8 %** |
| `work/unified-diff.patch` | 578 | 475 | **446** | 17.8 % | **22.8 %** |
| `work/bibliography.txt` | 896 | 740 | **707** | 17.4 % | **21.1 %** |
| `holdout/readme.txt` | 843 | 688 | **664** | 18.4 % | **21.2 %** |
| `work/meeting-transcript.txt` | 472 | 420 | **400** | 11.0 % | **15.3 %** |
| `mk/paper.tex` | 429 | 407 | **384** | 5.1 % | **10.5 %** |
| `lang/de-kb.txt` | 525 | 495 | **474** | 5.7 % | **9.7 %** |
| `tbl/kubectl-get-pods.txt` | 1 006 | 430 | **383** | 57.3 % | **61.9 %** |
| `tab/vix-daily-1990.csv` | 3 412 | 1 394 | **1 304** | 59.1 % | **61.8 %** |
| `mk/pom.xml` | 544 | 283 | **262** | 48.0 % | **51.8 %** |
| `mk/component.jsx` | 296 | 296 | **278** | 0.0 % | **6.1 %** |
| `holdout/license.txt` | 1 166 | 1 015 | **965** | 13.0 % | **17.2 %** |
| `mk/page.html` | 3 220 | 610 | **568** | 81.1 % | **82.4 %** |

Largest absolute: ja **−140**, vix CSV **−90**, license **−50**, kubectl
**−47**, page.html **−42**.

### Honest caveats

* `pl-kb`, `ru-kb`, `lic-mit`, `md-react`, `md-vite`, `git-log-fuller` remain at
  **0.0 %**. For Polish the wire gain (28 tokens) still sits under the contract
  plus framing; for Russian the whole-word ceiling is genuinely 16 tokens.
* AKRIBEIA adds **no new substitution mechanism**. Its gain is measuring
  exactly what the incumbent estimates.
* The arm-order table is hand-written from measurement, not learned. A wrong
  aim costs **time, never tokens** — every arm is byte-verified and the
  incumbent is always a candidate. Red-team §H asserts monotonicity.
* METATRON's search is wall-clock budgeted and non-deterministic; the bench
  hands the same draw to every side, so the Δ column is free of that noise.

---

## G. SECOND-ORDER ADVERSARY

`bench/akribeia-redteam.ts`: **490 checks, 0 failures**, both encodings.

Attacks derived from this codec's specific structure:

* *"The chunk model is wrong on 3/36 documents — does that corrupt output?"* —
  §C locates those documents and asserts exactness and never-worse **on them
  specifically**. The model is ranking-only by construction.
* *"`dropRule` inlines a glyph through the tape; does that preserve meaning when
  rules nest?"* — §E drops each of the first 6 rules of 12 real wires
  individually and asserts byte-identical `chironDecode`.
* *"Polish could make things worse."* — §D asserts the polished wire
  round-trips and does not blow up.
* *"More arms could regress."* — §H asserts 3 arms ≤ 1 arm.
* *"The aim table could throw or name a non-existent arm."* — §G asserts
  totality, distinctness and validity on six probes including the empty string.
* *"It could lose to the incumbent."* — §B asserts
  `messageTokens ≤ incumbent.messageTokens` **document by document**.
* 28 adversarial inputs: every major script, emoji, ZWJ sequences, combining
  marks, RTL-mixed, CRLF, lone CR, NUL, a 9 000-character single token, pure
  whitespace, XML close-tag storms, HTML, LaTeX, and the wire's own frame
  characters `§ ¶ × …` embedded in the text.
* a **4 000-case randomised differential fuzz** over a multilingual + markup
  atom alphabet.

**Cross-decoder:** `bench/akribeia-crosscheck.sh` → *"CPython cross-decode
EXACT on 22 AKRIBEIA wires"*, using the independent reader written from the
contract prose. 11 wires were **excluded and the exclusion reported**: they use
the `×`/`…` operators or a script-named label, outside that reader's declared
scope.

---

## H. VERIFICATION

* `tsc --noEmit` clean; `npx next build` clean.
* Real tokenizer for every count; the one approximate component is declared,
  bounded (3/36, +1..+3) and structurally prevented from gating a decision.
* Independent CPython reader: exact on 22/22 in-scope wires.
* 490 red-team assertions + 4 000-case fuzz.
* **Downgraded:** no LLM was called.

## I. REPAIR

Two repairs during development, each with a new attack aimed at the patch:
(1) the first polish used the chunk estimate for accept/reject — repaired to
`countTokens`, and red-team §C now targets exactly the documents where the
estimate is wrong; (2) the first portfolio used each arm's own contract —
repaired to also cost every CHIRON wire at 24 tokens, and §B now asserts
`≤ incumbent` per document. After both repairs the full suite, the fuzz, the
cross-check, the 42-document bench and the build were re-run from scratch.

## J. REMAINING GAP AND THE NEXT HIGHEST-INFORMATION TEST

1. **The polish has no ADD step.** Drop-only recovers 10 tokens. An add step —
   propose maximal repeats of the current body, rank with the chunk model,
   accept with `countTokens` — is the obvious completion and the chunk
   primitive exists precisely to make its ranking cheap. Untested.
2. **The aim table is not a model.** Best-of-12 was 575 tokens; the aimed
   3-arm portfolio plus polish gets further than that only because of the
   contract and polish. A SATzilla-style empirical hardness model trained on
   the (features → per-arm token count) matrix that `bench/w15-subset.ts`
   already emits is the cheap next step.
3. **Polish is `O(rules²)` whole-wire re-tokenisations.** Rewriting it on the
   windowed-delta primitive would make it `O(rules × occurrences)` and allow
   swap moves, not just drops.

---

## K. RESEARCH (new sources; none previously cited by this stack)

### K.1 The smallest-grammar problem — and why greedy leaves something on the table

* **Larsson & Moffat, *Offline Dictionary-Based Compression*** (DCC 1999) —
  **Re-Pair**: recursively replace the most frequent bigram. Re-Pair is an
  *irreducible* grammar; its grammar size is `O(n / log_σ n)`, matching the
  information-theoretic lower bound.
* **Charikar, Lehman, Liu, Panigrahy, Prabhakaran, Sahai & Shelat, *The
  Smallest Grammar Problem*** (IEEE Trans. Inf. Theory 51(7), 2005) — the
  problem is NP-hard and hard to approximate below `8569/8568` unless P=NP;
  Re-Pair's approximation ratio is `O((n/log n)^{2/3})` with lower bound
  `Ω(log n / log log n)` (Bannai et al. 2020).
* **Zouhar et al. / *Theoretical Analysis of Byte-Pair Encoding***
  (arXiv **2411.08671**) — settles the complexity of optimal pair encoding and
  proves **BPE's approximation ratio satisfies 0.333 < α ≤ 0.625**. No constant
  factor was previously known.
* **Re-Pair in Small Space** (Köppl & I, *Algorithms* 14(1):5, 2021);
  **RePair Grammars are the Smallest Grammars for Fibonacci Words**
  (arXiv 2202.08447).

**What this says about this repo.** The substitution problem the stack solves
*is* the smallest-grammar problem, and greedy pair/span selection is provably
only a constant fraction of optimal (≤ 0.625 for BPE-style pairing). So there
*is* headroom in principle. But my four attempts to take it (§D #1, #3, #4, and
the prior turn's #3) all failed, and §D #1 explains why: the arms are already
building a *hierarchical* grammar, and every flattening I tried destroyed more
than the re-optimisation recovered. The honest conclusion is that the
approximation gap in this stack is **not reachable by re-running the search**;
it is reachable by **fixing the objective the search is scored against**, which
is what AKRIBEIA does.

### K.2 Surrogate-objective mismatch — the general frame

*Surrogate objective approximation* (survey, updated 6 Jan 2026): replacing an
expensive objective with a cheap model is standard practice, and the standard
failure mode is that the surrogate's optimum is not the true optimum. AKRIBEIA
is an instance of the standard remedy — **trust-region / exact re-evaluation**
— applied somewhere nobody has applied it: the objective is `countTokens`, the
surrogate is ARIADNE's `est`, and the measured gap is `est=462 exact=458` per
wire and **233 tokens** per 26 documents at the grid-selection level.

### K.3 Newly AI-solved mathematics, Jan–Sep 2026

Carried forward and re-verified across this session's searches: Anthropic's
Claude produced the first complete machine-checked Lean 4 proof of **Fermat's
Last Theorem** (~13 M lines, 29 511 theorems, ~11 days, Sep 4–5 2026, reviewed
by Kevin Buzzard, who manually inspected every non-definition line for
soundness exploits); DeepMind **AlphaProof Nexus** resolved 9/353 open Erdős
problems and 44/492 OEIS conjectures (arXiv 2605.22763); OpenAI published
*disputed* **Navier–Stokes** and **3-D Euler** blowup constructions with Lean
certificates (8 Sep 2026); GPT-6 Astra improved the prime-gap bound to **186**
with Lean formalization; Akhil Mathew answered a question of Grothendieck with
a 1 076-line Lean counterexample (11 Jul 2026).

**The methodological lesson, applied literally this turn.** The 2026 consensus
is that the *proof* is now cheap to check and the residual human job is
confirming **the statement is the right one**. That is exactly this turn's
finding: the stack's proofs are fine — every wire round-trips — but the
*statement being optimised* (`est`) is not the statement that matters
(`countTokens`). Three of my four new mechanisms were killed by checking the
statement rather than the proof.

---

## Artifacts

| path | what |
|---|---|
| `src/lib/omega/akribeia.ts` | the codec |
| `bench/akribeia-bench.ts` | 42-document head-to-head vs METATRON and EUSTOCHIA |
| `bench/akribeia-redteam.ts` | 490 assertions + 4 000-case fuzz |
| `bench/akribeia-emit.ts`, `bench/akribeia-crosscheck.sh` | independent-reader harness |
| `bench/syntomia_decode.py` | the independent CPython reader (reused) |
| `bench/holdout-mk/*` | seven new markup/structured fixtures (HTML, XML, SVG, JSX, LaTeX, SQL, agent history) |
| `bench/w16-local.ts` | the chunk-locality measurement |
| `bench/w16-fuse.ts` | portfolio fusion — the dead mechanism |
| `bench/w16-grid.ts` | the 233-token estimate-vs-exact grid finding |
| `bench/w16-polish.ts` | the exact drop-polish measurement |
| `bench/w16-mk.ts` | markup lane census |
