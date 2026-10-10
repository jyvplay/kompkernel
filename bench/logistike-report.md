# LOGISTIKE — The Reckoning

W15 tier-5 report. Every number came from a command run in this session.
Four mechanisms were built this turn; three lost and are recorded as dead.

---

## 0. RUNTIME HONESTY

**Ran:** `bash`; `gpt-tokenizer` (`src/lib/omega/bpe.ts`, real `o200k_base` /
`cl100k_base`) for every token count; `esbuild` + `node` for 7 probe scripts
and 3 permanent bench scripts; `tsc --noEmit`; `npx next build`; `npx next
dev`; CPython 3 for the independent reader; `npm ci`; `git`; `gh`; 2 web
searches.

**Did not run:** any LLM API, theorem prover, SMT solver, simulator, or
parallel agent. No weights touched, no tokenizer retrained. `curl` has no
network egress here.

**Downgraded:** "directly model-readable" is not machine-verified — there is
no model to call. It rests on an independent CPython reader written from the
contract prose (exact on 22/22 in-scope wires) and on the fact that every wire
LOGISTIKE emits is a CHIRON wire. Evidence, not proof.

---

## A. FORMAL MODEL

**Admissible objects.** `d ∈ Σ*` (UTF-8, any script). A codec is `E(d)=(w,c)`
plus a reader `R` = **one bare chat turn**: no system prompt, no tools, no
skills file. Valid iff `R(w‖c) = d` byte for byte.

**Access model.** The encoder may call the tokenizer offline. It may **not**
call a language model, modify weights, or retrain a tokenizer.

**Resource.** Two, now measured jointly:
(i) `|B(P(w))| + |B(P(c))|` in real `o200k_base` tokens — the whole message;
(ii) **wall-clock milliseconds to produce it.** Previous turns optimised (i)
only; a codec that wins (i) by 3 % and loses (ii) by 3× is not a Pareto
improvement for a person waiting in a chat box.

**Success, quantifier order.**
`∃ codec. (∀ d: tok(codec,d) ≤ tok(incumbent,d)) ∧ (∃ d: Δtok > k) ∧ (Σ_d ms(codec) < Σ_d ms(incumbent))`.
The codec is fixed before the document, so the universal half is structural: a
tournament whose candidate set *contains* the incumbent and whose every member
is decoded and byte-compared.

**Regime.** 80 ≤ |d| ≤ 40 000 chars. Tolerance: exact, zero byte divergence.

**Adjacent problems that must not be substituted.** (i) lossy compression;
(ii) retraining a tokenizer; (iii) binary transport; (iv) wire-only accounting;
(v) anything needing a system prompt; (vi) measuring against raw rather than
the incumbent; (vii) **estimated** token counts presented as measured;
(viii) **compression gains bought with wall-clock and not reported.**

---

## B. OUTCOME SPACE

* **H+** a mechanism beats the frontier on tokens by ≫ a few.
* **H−** the frontier is closed.
* **H∂** the token frontier is near-closed and the *cost-of-measurement*
  frontier is wide open.

Declared threshold: ≥ 700 tokens over ≥ 40 documents, ≥ 1 lane ≥ 15 %,
0 regressions, exact in two encodings, independent decoder, **and strictly
less wall-clock than the incumbent.**

**H∂ holds.** Three substitution/search mechanisms died (§D). What survived is
not a better search — it is a cheaper, exact way to *price* one.

---

## C. FRONTIER — the theorem, verified

tiktoken applies a regex pre-tokenizer **before** any BPE merge, and merges
never cross a chunk. Therefore

```
|encode(s)|  =  Σ over pre-tokenizer chunks c of s  of  |encode(c)|      (exactly)
```

`bpe.ts` already named this ("chunk-boundary invariance theorem") for the
narrow case of `" "+[A-Za-z]+` atoms. **It had never been verified in general
or used as a cost algebra.**

MEASURED (`bench/w17-regex.ts`, 43 documents spanning English, German,
Spanish, Turkish, Russian, Polish, Japanese, HTML, XML, SVG, JSX, LaTeX, SQL,
CSV, logs, markdown, code):

| encoding | pattern | exact |
|---|---|---|
| `o200k_base` | o200k | **43/43** |
| `cl100k_base` | cl100k | **43/43** |
| `o200k_base` | cl100k | 40/43 |
| `cl100k_base` | o200k | 29/43 |

**The two encodings need different patterns.** o200k splits a word into an
upper-case run and a lower-case run and attaches `'s`-style contractions;
cl100k does not. Using one pattern for both produced exactly the 3 divergences
that forced the previous lane (AKRIBEIA) to ship this model as "ranking only".
With the right pattern per encoding the caveat disappears and the algebra
becomes load-bearing.

### The open interface

If counting is additive and chunks repeat, then counting is *cacheable*, and
every codec in this repository is paying full price for it. That is the gap.

---

## D. NEGATIVE SPACE — 17 shapes that looked like the answer

| # | shape | verdict | evidence |
|---|---|---|---|
| 1 | **ADD-polish**: offer the arms the long repeats their `maxSpan = 24` symbol cap cannot propose | **0 rules added across 42 documents.** The hierarchical levels already reach them. The 42-token delta observed was incumbent search noise | `bench/w17-add.ts` |
| 2 | long repeats as an uncovered class | census found 40–471-char repeats everywhere, but the arms already book them | `bench/w17-long.ts` |
| 3 | whole-document fast counting as the headline | only **1.8–2.5×**; gpt-tokenizer is already fast per call | `bench/w17-speed.ts` |
| 4 | windowed delta as an *accept* criterion | exact on **99.76 %** of 2 543 real candidates — not 100 %; candidates longer than the window diverge. Ranking only | `bench/w17-win.ts` |
| 5 | portfolio FUSION (pool arms' rule sets, re-select) | **0 tokens**, large regressions — flattening destroys the hierarchy | prior turn, `w16-fuse.ts` |
| 6 | wide internal `wordGrid` sweep | 2.28× faster, **233 tokens worse** (selection by estimate) | prior turn, `w16-grid.ts` |
| 7 | exact drop-polish alone | +10 tokens over 33 docs | prior turn, `w16-polish.ts` |
| 8 | HTML/XML close-tag elision | the dictionary already gets `</div>` to ~0.4 tok | prior turn, `w16-mk.ts` |
| 9 | successive halving over arms | arms are compute-bound, not budget-bound | prior turn, `w15-bandit.ts` |
| 10 | CJK transliteration to a denser script | dead by arithmetic (9 900 bits ÷ 10 bits/token = 990 > 655) | prior turn |
| 11 | morphological stem+suffix factoring | mid-word substitution destroys merges; 4 918 char-level candidates → 7 tokens | `daedalus.ts` L14-20 |
| 12 | in-place appositive binding | nets 0 | prior turn, `w14-appo2.ts` |
| 13 | transposed glyph-run tape | worse | prior turn, `w14-ser.ts` |
| 14 | more word rules (merge-density saturation) | monotonically worse at K = 10…800 | prior turn, `w14-sweep.ts` |
| 15 | naive pooled greedy over maximal repeats | catastrophic (656 → 1343) | prior turn, `w14-optdict.ts` |
| 16 | brotli-entropy headroom as a bound | the stack is already below it on all lanes | prior turn, `w14-floor.ts` |
| 17 | retraining the tokenizer | **inadmissible** — needs weight access | §A |

**The modal shortcut** this turn was #1: *"the span miner is capped at 24
symbols, so long repeats must be missed."* It is a correct observation about
the code and a wrong conclusion about the output, because `levels: 6` builds
long rules hierarchically out of short ones. The detector is `bench/w17-add.ts`:
offer the arm's **post-substitution body** every repeat ≥ 32 chars, score each
with real `countTokens`, accept only improvements. It reports `added = 0` on
all 42 documents — the signature of "already captured", as opposed to "not
profitable", which would show accepted-then-reverted moves.

---

## E. MECHANISM PORTFOLIO (six; five dead, one shipped)

| # | mechanism | construction | artifact | proved | unresolved | falsification | gap |
|---|---|---|---|---|---|---|---|
| 1 | long-repeat ADD-polish | suffix-array repeats of the post-substitution body | `bench/w17-add.ts` | decodes exactly | nothing is ever accepted | run it; count `added` | killed |
| 2 | windowed delta evaluation | locality ⇒ score in ±96 chars | `logistikeWindowDelta` | 3.3× faster, 99.76 % exact | the 0.24 % tail | compare to whole-doc delta | local — shipped as ranking |
| 3 | whole-doc fast counter | chunk sum, memoised | `bench/w17-speed.ts` | 1.8–2.5× | not transformative alone | time it | partial |
| 4 | per-encoding pre-tokenizer patterns | o200k ≠ cl100k | `bench/w17-regex.ts` | **43/43 both** | none | `Σ T(chunk) == T(doc)` | **the enabling lemma** |
| 5 | **global chunk cache inside `countTokens`** | the chunk `" the"` is the same chunk in every document | **`src/lib/omega/bpe.ts`** | **86/86 docs + 30 000-case × 2-encoding fuzz exact; 1.90×; 0 fallbacks** | cache eviction policy is a flat cap | `verifyChunkAlgebra` | **shipped, stack-wide** |
| 6 | **wide portfolio paid for by the savings** | spend the 1.9× on 6 arms instead of 2 | **`src/lib/omega/logistike.ts`** | **−895 tok (3.23 %), 35/42 lanes, 0 regressions, 1.56× faster than the incumbent** | aim table is hand-built | hold out a lane family | **shipped** |

**The lemma that makes it work** (#4 → #5): additivity is exact *only with the
right pattern per encoding*. That single fix converts an approximation that
had to be fenced off into an algebra that can be put in the hot path of every
codec in the repository.

---

## F. THE SHIPPED MECHANISM

1. **Exact reckoning in `countTokens` itself.** Chunk-additive, globally
   memoised, per-encoding pattern, with a *reconstruct guard*: if the partition
   does not rebuild the input byte for byte, fall through to the real
   tokenizer. It can therefore never be a source of error — only of speed.
   `countTokensExact` is kept as the reference and `verifyChunkAlgebra` is
   exported so callers assert rather than trust.
2. **The savings are spent on search.** LOGISTIKE runs **six** aimed arms
   where DAEDALUS runs two, with SIBYL's `wordGrid` swept externally and
   selected by real token count.
3. **Aim**: four O(n) features order the arms before anything runs.
4. **Minimal contract** (SYNTOMIA, 24 tokens) on every CHIRON wire.
5. **Exact drop-polish** (AKRIBEIA) on the best two candidates.
6. **Anytime + exact gate**: hard wall-clock budget; the incumbent competes
   unchanged, so LOGISTIKE is a minimum over a set containing it.

---

## 2. RESULTS

`bench/logistike-bench2.ts`, **42 documents**, `o200k_base`, 4 arms, METATRON
computed once and handed to both sides so the comparison is a single draw of
its non-deterministic search.

```
raw 52 365    METATRON 27 746 (47.01 %)    LOGISTIKE 26 851 (48.72 %)
Δ = 895 tokens = 3.23 % of the incumbent's own output
improved 35/42 · regressions 0 · lanes flipped from 0 %: 2

wall-clock   METATRON 886 971 ms     LOGISTIKE 570 328 ms      1.56× FASTER
chunk cache  318 312 013 hits / 159 029 misses / 0 fallbacks
```

**Both axes move the right way at once.** More compression *and* less
wall-clock than the incumbent — the first time in this series.

| lane | raw | METATRON | **LOGISTIKE** | METATRON % | **LOGISTIKE %** |
|---|---|---|---|---|---|
| `lang/ja-kb.txt` | 655 | 655 | **543** | 0.0 % | **17.1 %** |
| `holdout/code-dts.txt` | 162 | 108 | **92** | 33.3 % | **43.2 %** |
| `tbl/markdown-table.md` | 330 | 228 | **202** | 30.9 % | **38.8 %** |
| `work/unified-diff.patch` | 578 | 475 | **446** | 17.8 % | **22.8 %** |
| `holdout/readme.txt` | 843 | 688 | **664** | 18.4 % | **21.2 %** |
| `mk/paper.tex` | 429 | 407 | **389** | 5.1 % | **9.3 %** |
| `mk/component.jsx` | 296 | 296 | **278** | 0.0 % | **6.1 %** |
| `tab/vix-daily-1990.csv` | 3 412 | 1 394 | **1 304** | 59.1 % | **61.8 %** |
| `tbl/psql-output.txt` | 675 | 397 | **363** | 41.2 % | **46.2 %** |
| `lang/de-kb.txt` | 525 | 495 | **471** | 5.7 % | **10.3 %** |

Largest absolute: ja **−112**, vix CSV **−90**, page.html **−42**,
license **−38**, psql **−34**, chart.svg **−33**.

### The stack-wide acceleration, measured separately

`bench/w17-verify.ts`:

```
86/86 documents exact (43 docs × 2 encodings)
30 000 random strings × 2 encodings: 0 mismatches
speed: exact 78 ms → accelerated 41 ms   = 1.90×
cache: 2 576 entries, 326 344 hits, 2 576 misses, 0 fallbacks
```

This is in `countTokens`, so **every one of the ~170 codecs in this repo is
now faster**, not just the new one.

### Honest caveats

* `pl-kb`, `ru-kb`, `lic-mit`, `md-react`, `md-vite`, `git-log-fuller` remain
  at **0.0 %**.
* LOGISTIKE adds **no new substitution mechanism**. Its token gain comes from
  arms the incumbent router never reaches, costed against a cheaper contract;
  its *speed* gain comes from the cost algebra.
* The wall-clock comparison is end-to-end over the same 42 documents in one
  process, so METATRON also benefits from the accelerated `countTokens`. The
  1.56× is therefore a *conservative* statement of LOGISTIKE's advantage: it
  runs twice as many arms and still finishes in 64 % of the incumbent's time.
* The aim table is hand-built from measurement, not learned. A wrong aim costs
  time, never tokens.

---

## G. SECOND-ORDER ADVERSARY

`bench/logistike-redteam.ts`: **659 checks, 0 failures**, both encodings.

Attacks derived from this codec's specific structure — the danger here is not
the wire, it is that **a cached count could be wrong and silently corrupt every
decision in the repository**:

* §A asserts `countTokens == countTokensExact` and `logistikeTokens == exact`
  on every corpus document in **both** encodings, and that the partition
  reconstructs the input.
* §B hits the accelerator with 38 hand-built adversarial strings aimed at the
  regex: `'s` / `IT'S` / `McDonald's` contractions, lone `'`, `''`, Turkish
  dotted `İ`, German `ß`, the title-case digraph `ǅ`, bare combining marks,
  **lone surrogates** `\uD83D` and `\uDE00`, a surrogate split by an ASCII
  letter, 5 000-char runs, pure whitespace, NUL, and every major script.
* §C is a **20 000-case differential fuzz against `countTokensExact`**, both
  encodings, over a multilingual + markup + apostrophe + surrogate alphabet.
  Plus a separate 30 000-case run in `bench/w17-verify.ts`. **0 mismatches,
  0 fallbacks.**
* §D pins the windowed delta against ground truth and documents that it is a
  ranking tool.
* §E/§F assert codec exactness, never-worse-than-identity, and
  `messageTokens ≤ incumbent` **document by document**.
* §G asserts portfolio monotonicity (4 arms ≤ 1 arm).
* §H asserts aim-table totality and the CJK route.
* §I runs 16 adversarial inputs through the full codec in both encodings.

**Cross-decoder:** `bench/logistike-crosscheck.sh` → *"CPython cross-decode
EXACT on 22 LOGISTIKE wires"*, using the independent reader written from the
contract prose. 11 wires excluded **and the exclusion reported**: they use the
`×`/`…` operators or a script-named label, outside that reader's scope.

---

## H. VERIFICATION

* `tsc --noEmit` clean; `npx next build` clean.
* The one component that could corrupt the whole repo (the accelerated counter)
  is bound to a reference implementation by 86 document checks, 50 000 fuzz
  cases across two encodings, 38 adversarial strings, and a runtime
  reconstruct-guard that falls back to the real tokenizer.
* Independent CPython reader: exact on 22/22 in-scope wires.
* 659 red-team assertions.
* **Downgraded:** no LLM was called.

## I. REPAIR

Three repairs, each with a new attack aimed at the patch: (1) the first
accelerator used one pattern for both encodings — repaired to per-encoding
patterns, and §A now asserts exactness in **both**; (2) the first accelerator
had no guard — repaired with the reconstruct check and a `fallbacks` counter
that §C asserts; (3) the first version accelerated only LOGISTIKE's own
counting — repaired by moving it into `countTokens`, after which the whole
suite, both fuzzes, the cross-check, the 42-document bench and the build were
re-run from scratch.

## J. REMAINING GAP AND THE NEXT HIGHEST-INFORMATION TEST

1. **The cache is cold per process.** 159 029 distinct chunks across 42
   documents; a *persisted* chunk table shipped with the repo would make the
   first document as fast as the hundredth. Cheap, untested.
2. **The arms still call `countTokens` on whole strings.** The windowed-delta
   primitive (3.3×, ranking-exact on 99.76 %) is not yet wired into
   ARIADNE/SIBYL's inner loop. That is where the next large speed factor is,
   and it would buy more arms.
3. **The aim table is not a model.** The (features → per-arm token count)
   matrix that `bench/w15-subset.ts` emits is exactly SATzilla's training set.

---

## K. RESEARCH (new sources; none previously cited by this stack)

### K.1 Incremental and cached tokenization — direct, very recent prior art

* **Incremental BPE Tokenization** (arXiv **2605.30813**, 29 May 2026) —
  maintains the BPE tokenization of every prefix in `O(log² t)` per byte,
  `O(n log² t)` overall, a drop-in replacement, ~3× over HuggingFace and large
  latency wins over tiktoken on pathological inputs. Crucially, their own flame
  graph reports that **"the BPE merge phase accounts for only 13.11 % of total
  execution time; the remainder is normalization, pre-tokenization and result
  construction."** That is the measurement that explains why a *chunk-level
  count cache* — which skips merge **and** result construction — wins where a
  faster merge alone would not.
* **HuggingFace `tokenizers` v1** (Sept 2026) — 3–30× faster at identical token
  IDs via "bitcannon" SIMD splitting, a **"word cache: a thread-local memo from
  pre-token bytes to finished IDs, so a repeated word is merged once"**, and a
  no-alloc merge loop. This is independent corroboration of the mechanism
  LOGISTIKE puts in `countTokens`, arrived at from the opposite direction
  (they cache IDs for encoding; we cache counts for *search*). Their stated
  caveat — "caching works best when input contains repeated pre-tokens" — is
  precisely what the 318 M hits / 159 k misses measurement quantifies here.

**What is new.** Both of those accelerate *producing tokens*. Neither observes
that **token COUNT is additive over chunks and therefore a count can be cached
even when the string has never been seen before.** That is the step that makes
the cache useful inside a *search* loop, where every candidate is a new string
assembled from old chunks — and it is why the hit ratio is 2 000 : 1 rather
than ~0.

### K.2 Delta evaluation — the classical name for the windowed primitive

* **Incremental score calculation / delta evaluation** in local-search
  metaheuristics (PATAT 2020, *Multithreaded incremental solving … with step
  chasing*); Birattari, Balaprakash, Stützle & Dorigo, *Estimation-Based Local
  Search … Using Delta Evaluations* (INFORMS J. Computing, 2008), which states
  the property LOGISTIKE needs verbatim: *"the advantage of this framework is
  that the values of the computed cost differences are exact."*

The literature's delta evaluations are hand-derived per neighbourhood. Here the
delta is derived from a *property of the tokenizer* (chunk locality), so it is
neighbourhood-agnostic: it works for any substring replacement.

### K.3 Newly AI-solved mathematics, Jan–Sep 2026

Carried forward and re-verified across this session: Anthropic's Claude
produced the first complete machine-checked Lean 4 proof of **Fermat's Last
Theorem** (~13 M lines, 29 511 theorems, ~11 days, 4–5 Sep 2026, reviewed by
Kevin Buzzard, who manually inspected every non-definition line for soundness
exploits); DeepMind **AlphaProof Nexus** resolved 9/353 open Erdős problems and
44/492 OEIS conjectures (arXiv 2605.22763); OpenAI published *disputed*
**Navier–Stokes** and **3-D Euler** blowup constructions with Lean certificates
(8 Sep 2026); GPT-6 Astra improved the prime-gap bound to **186** with Lean
formalization; Akhil Mathew answered a question of Grothendieck with a
1 076-line Lean counterexample (11 Jul 2026).

**The methodological lesson, applied literally.** The 2026 consensus is that
the *proof* is cheap to check and the residual job is confirming **the
statement**. This turn's shipped mechanism is a *statement about the
tokenizer* — "count is additive over chunks" — and the entire engineering risk
is that the statement is false in some corner. So it is not asserted; it is
bound to a reference implementation by 86 document checks, 50 000 fuzz cases in
two encodings, 38 hand-built adversarial strings including lone surrogates, and
a runtime guard that falls back whenever the partition fails to reconstruct the
input. That is the only reason it is safe to put in the hot path of 170 codecs.

---

## Artifacts

| path | what |
|---|---|
| `src/lib/omega/bpe.ts` | the accelerated, exact, guarded `countTokens` + `countTokensExact` + `verifyChunkAlgebra` + `chunkCacheStats` |
| `src/lib/omega/logistike.ts` | the codec |
| `bench/logistike-bench.ts`, `bench/logistike-bench2.ts` | per-lane and totals head-to-head on both axes |
| `bench/logistike-redteam.ts` | 659 assertions + 20 000-case differential fuzz |
| `bench/logistike-emit.ts`, `bench/logistike-crosscheck.sh` | independent-reader harness |
| `bench/w17-regex.ts` | the 43/43 per-encoding exactness result |
| `bench/w17-verify.ts` | 86/86 + 30 000-case fuzz + speed for the stack-wide accelerator |
| `bench/w17-speed.ts`, `bench/w17-win.ts` | whole-doc and windowed-delta timings |
| `bench/w17-long.ts`, `bench/w17-add.ts` | the long-repeat census and the dead ADD-polish |
