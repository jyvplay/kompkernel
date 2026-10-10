# ANASTROPHE — The Turning

W18 tier-5 report.

**Headline, stated first and without dressing: this turn produced NO
compression gain.** ANASTROPHE ties PLINTHOS on every lane measured. What it
produced is a **closure result with numbers attached** — the cheap-permutation
family is exhausted and exactly one lane wide — plus a gate that makes the
surviving member cheap, and two repairs that my own benches forced.

## 0. RUNTIME HONESTY

**Ran:** `bash`; `gpt-tokenizer` (real `o200k_base`) for every token count;
`esbuild`+`node` for 4 probes and 3 benches; `tsc --noEmit`;
`npx next build`; `npm ci`; `git`; `gh`.

**Did not run:** any LLM API, theorem prover, SMT solver, simulator, or
parallel agent. **No web search this turn** — the entire budget went into
measurement and two forced repairs.

**Did not complete / not claimed:**
* the 42-document aggregate (third turn running — it is a tooling problem,
  named again in §J);
* the tail of `bench/w21-gate.ts` and `bench/w21-mono.ts` scrolled past the
  output cap, so I have the per-lane rows but **not the printed pass/fail
  totals**. No FAIL line appeared in the visible output and ANA ≤ PLI on
  every visible row, but I am not claiming a count I did not read.

## A. FORMAL MODEL

**Objects.** `d ∈ Σ*` (UTF-8). A codec is `E(d)=(w,c)` plus a reader `R` =
one bare chat turn: no system prompt, no tools, no skills file. Valid iff
`R(w‖c)=d` byte for byte.

**Access model.** Tokenizer offline. No LLM call, no weight access, no
tokenizer retraining.

**Resource.** `|B(P(w))|+|B(P(c))|` real tokens, whole message; wall-clock ms.

**Admissible permutations.** A reordering is admissible only if its
*description* costs O(1) tokens. A sort costs O(n log n) to describe and is
disqualified at the door. This is the constraint that makes the family finite
and is why the closure result in §C is possible at all.

**Success, quantifier order.** `∃ codec. (∀d: tok ≤ incumbent) ∧ (∃d: Δ > k)`.
The universal half is structural: a tournament containing the incumbent **and
the predecessor lane**, every member decoded and byte-compared.

**Must not be substituted.** lossy compression; retraining a tokenizer;
wire-only accounting; anything needing a system prompt; **a permutation whose
description is not O(1)**; **reporting a total that scrolled off the screen**.

## B. OUTCOME SPACE

* **H+** another member of the permutation family pays.
* **H−** the family is closed at one lane.
* **H∂** it pays only under the long-identical-run condition.

**H− is now the supported answer, with the evidence threshold met in §C.**

## C. FRONTIER — the closure result

Every admissible member of the cheap-permutation family has now been measured:

| permutation | result | evidence |
|---|---|---|
| transpose (fields within a line) | **+466 on `vix-daily-1990.csv`, 0 elsewhere** | KIONES, `w19-trans.ts` |
| fixed-width transpose (whitespace columns) | inverse exact, **costs more**: kubectl 1006→1186, ls-full-iso 1175→1413, df-h 570→646, find-listing 3997→4580; **0 after compression** | PLINTHOS, `w20-fw.ts` |
| **record-periodic stride** (line *p* of every *P*-line record; P = 2…48 × 6 alignments, 40 documents) | **NOT ONE FILE improves, even at the RAW token level. Zero.** | **this turn, `bench/w21-fast.ts`** |
| sort / front-coding | disqualified: O(n log n) description | §A |

And the reason, quantified directly this turn:

```
bench/w21-dup.ts
total tokens sitting in DUPLICATE COLUMNS across the entire corpus: 92
```

Duplicate columns are the **only** structure transposition has ever been shown
to pay on. `vix` wins because three of its columns are byte-identical
2 000-character strings, which converts ~127 value-rules into 3 column-rules —
the dictionary's *per-rule tape cost* is what gets amortised. Across all 40
corpus documents that structure is worth **92 tokens in total**.

**The reordering frontier is one lane wide. That is the finding.**

## D. NEGATIVE SPACE — 16 shapes

| # | shape | verdict | evidence |
|---|---|---|---|
| 1 | **record-periodic stride** | **0 files improve, raw level, 40 docs** | `w21-fast.ts` |
| 2 | duplicate-column factoring as a first-class rule | corpus-wide mass is **92 tokens** — not worth a mechanism | `w21-dup.ts` |
| 3 | fixed-width transpose | inverse exact, costs 18–25 % more | prior turn, `w20-fw.ts` |
| 4 | width-declared transpose (no sentinel) | circular: widths need the row count, the row count needs the widths; the ragged last field forces a sentinel back | derivation |
| 5 | per-region codec selection | 0 tokens over 28 docs; splitting destroys rule sharing | prior turn, `w19-seg.ts` |
| 6 | transpose on 2-column CSV | inverts, not cheaper | prior turn |
| 7 | self-iteration | no gain | prior turn |
| 8 | `topK` sweep | 0 tokens | prior turn |
| 9 | ADD-polish for long repeats | 0 rules accepted / 42 docs | prior turn |
| 10 | portfolio fusion | 0 tokens, large regressions | prior turn |
| 11 | wide internal `wordGrid` sweep | 2.28× faster, 233 tokens worse | prior turn |
| 12 | HTML/XML close-tag elision | dictionary cheaper at 0.4 tok/ref | prior turn |
| 13 | CJK transliteration | dead by arithmetic | prior turn |
| 14 | morphological stem+suffix | mid-word substitution destroys merges | `daedalus.ts` L14-20 |
| 15 | brotli-entropy headroom | stack already below it | prior turn |
| 16 | retraining the tokenizer | inadmissible — needs weight access | §A |

**The modal shortcut** this turn was #1: *"JSON arrays and repeated stanzas are
record-periodic; stride them like KIONES strides fields."* It is the obvious
next axis and it returns **exactly zero** — not "small", zero, on every one of
40 documents, before compression even starts. The detector is
`bench/w21-fast.ts`: enumerate P and the alignment, verify the de-interleave
reproduces the input, and compare **raw** token counts first. A permutation
whose raw count never drops cannot be rescued by the compressor, and screening
on raw tokens turns a 1 700 s search into a **3 s** one — which is also how
this negative was obtained cheaply after the first attempt timed out.

## E. MECHANISM PORTFOLIO (six; five dead, one shipped)

| # | mechanism | construction | artifact | proved | unresolved | falsification | gap |
|---|---|---|---|---|---|---|---|
| 1 | record-periodic stride | group line p of every record | `w21-fast.ts` | de-interleave exact | never cheaper | raw-token screen | killed |
| 2 | duplicate-column rule | declare `col4 = col2` | `w21-dup.ts` | census exact | 92 tokens corpus-wide | run the census | killed by mass |
| 3 | fixed-width transpose | cut at whitespace columns | prior turn | inverse exact | costs more | raw vs transposed | killed |
| 4 | per-region selection | merged tape | prior turn | exact | sharing lost | compare to whole-doc | killed |
| 5 | **the law as an O(n) gate** | `longestDuplicateRun` + `hasDuplicateColumn` | **`src/lib/omega/anastrophe.ts`** | admits `json-pkg` (run=261), rejects prose (run=0) | thresholds are hand-set | run the gate, compare to PLINTHOS | **shipped** |
| 6 | **monotone-by-construction tournament** | the predecessor competes unconditionally | same file | ANA ≤ PLI on every visible row | totals scrolled | `bench/w21-mono.ts` | **shipped** |

## F. WHAT SHIPPED

1. **The law as a gate.** `anastropheGate` computes, in O(n) and without ever
   invoking the compressor, whether a block contains byte-identical columns
   and how long a duplicate run the transpose would create. Prose returns
   `run=0` and is rejected instantly; `json-pkg` returns `run=261` and is
   admitted.
2. **A hard per-arm wall-clock slice**, measured from when each arm starts, so
   the lane always returns.
3. **A monotone tournament**: identity, incumbent, the plain stack, **PLINTHOS
   itself**, and the gated permutation arms.

## G. SECOND-ORDER ADVERSARY — and the two bugs it found

**This is the part worth reading.** Both bugs were found by my own benches, not
by inspection.

**Bug 1 — the gate rejected the only winner.** `bench/anastrophe-bench.ts`
printed `vix-daily-1990.csv … PLI 928 ANA 1380 gate=n`. The gate's
duplicate-column test ran over the whole block *including the header row*, and
`OPEN ≠ HIGH` makes the columns differ even when every data column is
identical. The gate therefore rejected the single document the entire family
exists for, at a cost of **452 tokens**. Repaired by also probing the block
with its first row removed.

**Bug 2 — a patched gate still cannot be trusted.** Protocol §I: a repaired
candidate inherits no trust. Even with the patch, `bench/w21-gate.ts` showed
ANASTROPHE losing to PLINTHOS on `markdown-table` (202 → 210), `page.html`
(576 → 585) and `readme` (664 → 675), because the tighter per-arm budget
starved the search. A gate is an *optimisation*, and an optimisation that can
cost tokens is a regression. Repaired structurally: **PLINTHOS now competes
unconditionally as a candidate**, so ANASTROPHE is a minimum over a set
containing it and cannot be worse whatever the gate decides.
`bench/w21-mono.ts` then shows `ANA == PLI` on every visible row.

## H. VERIFICATION

* `tsc --noEmit` clean; `npx next build` clean.
* Real tokenizer for every count.
* Monotonicity re-measured after the second repair: ANA ≤ PLI on every visible
  row of `bench/w21-mono.ts`; **the printed total scrolled off and is not
  claimed**.
* The transpose inverse and the CPython independent reader are inherited from
  PLINTHOS (26/26 exact) and the wire format is unchanged — but per §I that is
  inherited evidence.
* **No corpus aggregate. No new compression claim.**

## I. REPAIR

Two repairs, both forced by measurement, both followed by a new attack aimed
at the patch: `bench/w21-gate.ts` (does the patched gate still reject a
winner?) and `bench/w21-mono.ts` (can the lane ever lose to its predecessor?).
A third, earlier repair this turn: the first stride search was budget-bound
and produced no output in 1 700 s; it was rebuilt to screen on **raw** tokens
and returned the complete negative in **3 s**.

## J. REMAINING GAP AND THE NEXT HIGHEST-INFORMATION TEST

1. **The benches must be split into per-lane processes.** Third turn running
   that an aggregate has not completed. Until that is fixed, every corpus-level
   claim in this project is unverifiable, and that is now the single largest
   obstacle to further progress — larger than any compression idea.
2. **Prose is closed and should be declared so.** Across eight turns: the
   dictionary class, the configuration space, the contract, the cost algebra
   and the permutation family have each been measured to exhaustion. The only
   mechanism left that can go below the one-token-per-word floor needs an LLM
   in the encoder's loop (a verifiable deletion gate), which the access model
   in §A forbids. **The honest next step is to change the access model, not to
   keep searching inside it.**
3. **If the access model stays**, the remaining value is engineering: the
   per-lane bench harness, and extending the CPython reader to the `×`/`…`
   operators so the whole wire grammar is independently verified.

## K. RESEARCH

Carried forward with its original turn; no new search was run. SATzilla
(arXiv 1111.2249); Re-Pair (Larsson & Moffat, DCC 1999); The Smallest Grammar
Problem (Charikar et al., IEEE TIT 2005) with BPE's ratio `0.333 < α ≤ 0.625`
(arXiv 2411.08671); Incremental BPE Tokenization (arXiv 2605.30813);
HuggingFace `tokenizers` v1 word cache; delta evaluation (PATAT 2020;
Birattari et al., INFORMS JoC 2008); the 2026 tokenization-premium literature
(arXiv 2609.39001, 2608.09046, 2601.13328). Column stores (C-Store/MonetDB,
Parquet/ORC) are the ancestor of the transpose idea; what this project adds,
and what the database literature never needs to state, is the **token-cost**
form of the condition — a column store never pays a per-cell separator, so it
never has to ask whether the reordering creates *long identical runs*.

Jan–Sep 2026 AI mathematics (FLT in Lean; AlphaProof Nexus; the disputed
Navier–Stokes claim) supplied the rule applied in §G: the proof is cheap to
check, the residual job is confirming the statement. This turn two of my own
statements were false — "record-periodic striding is the obvious next axis"
and "the gate is safe" — and both were caught by running them rather than by
reasoning about them.

## Artifacts

| path | what |
|---|---|
| `src/lib/omega/anastrophe.ts` | the codec: the law as a gate, per-arm budgets, monotone tournament |
| `bench/w21-fast.ts` | **the closure negative**: stride P=2…48 × 6 alignments × 40 docs → 0 |
| `bench/w21-dup.ts` | **the census**: 92 tokens of duplicate columns corpus-wide |
| `bench/w21-gate.ts` | attack aimed at repair 1 |
| `bench/w21-mono.ts` | attack aimed at repair 2 |
| `bench/anastrophe-bench.ts` | the bench that found bug 1 |
| `bench/w21-stride.ts` | the first, budget-bound stride search (superseded by `w21-fast.ts`) |
