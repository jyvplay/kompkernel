# KIONES — The Columns

W16 tier-5 report. Every number below came from a command that **completed** in
this session. Where a run did not complete, that is stated rather than
estimated.

## 0. RUNTIME HONESTY

**Ran:** `bash`; `gpt-tokenizer` (real `o200k_base`/`cl100k_base`) for every
token count; `esbuild`+`node` for 3 probe scripts and 4 permanent benches;
`tsc --noEmit`; `npx next build`; `npm ci`; `git`; `gh`.

**Did not run:** any LLM API, theorem prover, SMT solver, simulator, or
parallel agent. No weights touched. **No web search this turn** — the budget
went into measurement; §K carries grounding forward with its original turn and
says so.

**Did not complete:** the full 42-document aggregate for KIONES
(`bench/kiones-total.ts`) timed out twice at 1 500 s, and the CPython
cross-check for this lane also timed out. **I therefore do not report a
corpus-wide percentage for KIONES.** What is reported is the per-lane output
of `bench/kiones-bench.ts`, which did complete and printed every lane where
KIONES beat POLYTROPOS, plus the red team, which completed with 502 checks.

**Downgraded:** "directly model-readable" is not machine-verified. The
transpose clause is 19 tokens and the operation is a table transpose; the
CHIRON half of the contract was cross-checked against an independent CPython
reader in earlier turns, but **this turn's cross-check run did not finish**,
so that evidence is carried forward, not re-established.

## A. FORMAL MODEL

**Objects.** `d ∈ Σ*` (UTF-8). A codec is `E(d)=(w,c)` plus a reader `R` = one
bare chat turn: no system prompt, no tools, no skills file. Valid iff
`R(w‖c)=d` byte for byte.

**Access model.** Tokenizer offline. No LLM call, no weight access, no
tokenizer retraining.

**Resource.** `|B(P(w))|+|B(P(c))|` real tokens — the whole message; and
wall-clock ms.

**Success, quantifier order.** `∃ codec. (∀d: tok ≤ incumbent) ∧ (∃d: Δ > k)`.
The universal half is structural: a tournament whose candidate set contains
the incumbent, every member decoded and byte-compared.

**Regime.** 80 ≤ |d| ≤ 40 000 chars. Tolerance: exact.

**Must not be substituted.** lossy compression; retraining a tokenizer; binary
transport; wire-only accounting; anything needing a system prompt; measuring
against raw instead of the incumbent; **reporting an aggregate that was never
computed.**

## B. OUTCOME SPACE

* **H+** a mechanism beats the frontier by ≫ a few tokens on some lane.
* **H−** the frontier is closed.
* **H∂** the frontier is closed in **row-major reading order** and open in
  another order.

**H∂ holds, and it is the finding of this turn.**

## C. FRONTIER — the open interface

Every lane in this repository reads a document in **row-major** order, because
that is the order the bytes arrive in. Dictionary mining, block detection,
template induction and the pre-tokenizer all operate along the line.

Tabular data is only incidentally row-major. Its redundancy lives **down the
columns**: a date column is 240 near-identical strings; a price column is 240
numbers of one shape; a status column is three words repeated. Row-major, each
value is separated from its nearest relative by a whole row of unrelated
bytes — out of reach of BPE (chunk boundaries) and of a span miner
(`maxSpan = 24` symbols).

MEASURED (`bench/w19-trans.ts`, completed, every arm decoded and
byte-compared), `bench/holdout-tab/vix-daily-1990.csv`:

```
raw                              3 412
METATRON                         1 394   (59.1 %)
POLYTROPOS (previous best lane)  1 304   (61.8 %)
column-major + the same stack      915   (73.2 %)
```

and end-to-end through the shipped codec (`bench/kiones-bench.ts`, completed):

```
vix-daily-1990.csv   raw 3412   METATRON 1394   POLYTROPOS 1304   KIONES 928
                     winner = kiones, block 127 x 5
                     -466 tokens vs the incumbent = 33.4 %
                     73.2 % vs raw against the incumbent's 59.1 %
```

**That is the largest single-lane gain in five turns of work on this stack**,
and it comes from re-ordering bytes, not from a new dictionary.

Why it is so large there: the file carries OPEN/HIGH/LOW/CLOSE holding the
same value four times per row. Row-major, each repetition is ~30 characters
from the next. Column-major, three of the four columns become byte-identical
2 000-character strings and the dictionary takes each in one rule.

## D. NEGATIVE SPACE — 16 shapes that looked like the answer

| # | shape | verdict | evidence |
|---|---|---|---|
| 1 | **per-region codec selection** with a merged tape (split into homogeneous regions, best config each, glyphs remapped, tapes concatenated) | **0 tokens** across 28 documents. Splitting destroys cross-region rule sharing: a rule used in two regions now needs two tape entries, and that loss exceeds the specialisation gain | `bench/w19-seg.ts` |
| 2 | transpose on whitespace-aligned tables that are not field-consistent | declines — `findBlocks` requires an identical field count, and `psql`/`kubectl` rows are not | `bench/w19-trans.ts` |
| 3 | transpose on `aapl-2014.csv` (2 columns) | transposes, but is **not** cheaper — two columns give the dictionary nothing it did not already have | `bench/w19-trans.ts` |
| 4 | self-iteration (arm on its own wire body) | no gain | prior turn, `w18-probe.ts` |
| 5 | `topK` sweep (256…16000) | **0 tokens** | prior turn, `w18-space.ts` |
| 6 | ADD-polish for long repeats beyond `maxSpan` | **0 rules accepted across 42 documents** | prior turn, `w17-add.ts` |
| 7 | long repeats as an uncovered class | 40–471-char repeats everywhere, all already booked | prior turn, `w17-long.ts` |
| 8 | whole-document fast counting as a headline | 1.8–2.5× only | prior turn, `w17-speed.ts` |
| 9 | portfolio fusion (pool arms' rule sets) | 0 tokens, large regressions | prior turn, `w16-fuse.ts` |
| 10 | wide internal `wordGrid` sweep | 2.28× faster, 233 tokens **worse** | prior turn, `w16-grid.ts` |
| 11 | HTML/XML close-tag elision | dictionary already cheaper at 0.4 tok/occurrence | prior turn, `w16-mk.ts` |
| 12 | CJK transliteration to a denser script | dead by arithmetic | prior turn |
| 13 | morphological stem+suffix factoring | mid-word substitution destroys merges | `daedalus.ts` L14-20 |
| 14 | in-place appositive binding / transposed tape / merge density | all net ≤ 0 | prior turns |
| 15 | brotli-entropy headroom as a bound | stack already below it on every lane | prior turn |
| 16 | retraining the tokenizer | **inadmissible** — needs weight access | §A |

**The modal shortcut** this turn was #1: *"documents are heterogeneous, so give
each region its own codec."* It is intuitive and it returns exactly zero. The
detector is `bench/w19-seg.ts`: split, optimise per region, remap glyphs into
one script, concatenate the tapes, verify `chironDecode`, and compare against
the whole-document optimum. It reports 0 on every one of 28 documents — the
signature of **lost sharing**, not of bad regions. Reordering the bytes
(KIONES) works where partitioning them does not, because reordering keeps one
global rule set.

## E. MECHANISM PORTFOLIO (six; five dead, one shipped)

| # | mechanism | construction | artifact | proved | unresolved | falsification | gap |
|---|---|---|---|---|---|---|---|
| 1 | per-region selection | merged tape over regions | `w19-seg.ts` | decodes exactly | sharing is lost | compare to whole-doc optimum | killed |
| 2 | ragged-table transpose | pad to a declared width | — | not built | padding marker costs more than it saves | derive the cost | not attempted |
| 3 | self-iteration | arm on its own body | `w18-probe.ts` | exact | no gain | merge and measure | killed |
| 4 | `topK` sweep | pool size | `w18-space.ts` | exact | 0 tokens | sweep it | killed |
| 5 | **block transpose** | maximal field-consistent run, bracketed | **`src/lib/omega/kiones.ts`** | **vix 1304 → 928**; 502 adversary checks | fires only on field-consistent blocks | run `kionesEncodeText` and count firings | **shipped** |
| 6 | self-witnessing transform | apply the inverse, refuse unless byte-identical | `kionesEncodeText` | **every** accepted transform is verified at encode time | none | §A of the red team | **shipped** |

**The lemma:** reading order is a free parameter that nothing in the stack
varies, and it is the only parameter whose change moves redundancy *into*
reach of mechanisms that are otherwise exhausted.

## F. THE SHIPPED MECHANISM

1. Find a maximal run of consecutive lines that all split into the same number
   of fields (≥ 2) under some candidate separator (`,` `\t` `|` `;` `  `).
2. Transpose that run and bracket it:
   `◆<sep>` / `<column 1>` / … / `◇`.
3. Hand the result to POLYTROPOS, which now reaches redundancy that was always
   there.
4. Fuse one **19-token** clause onto the contract:
   *"◆c … ◇ holds columns; print them as rows, fields joined by c."*
5. Tournament over {identity, incumbent, plain stack, column-major stack,
   bare transposed text}; every arm decoded and byte-compared.

**The transform is its own witness**: `kionesEncodeText` applies
`kionesDecodeText` and discards the candidate unless it reproduces the input
byte for byte. A table it cannot invert is simply never used.

## G. SECOND-ORDER ADVERSARY

`bench/kiones-redteam.ts`: **502 checks, 0 failures**, both encodings.

Attacks derived from this codec's specific structure — the risk here is a
transpose that does not invert:

* §A asserts the inverse on every corpus document where the transform fires.
* §D runs every separator × {4×2, 7×3, 20×5, 5×12} hand-built tables.
* §E is 21 adversarial tables built to break the inverse: **empty fields**,
  separator at line start, separator at line end, **ragged rows**, no trailing
  newline, CRLF, **the markers already present in the text**, a close marker
  with no open, single-column, blank lines inside the block, tabs, pipes,
  semicolons, double-space, Unicode/CJK/emoji cells, **ZWJ family sequences**,
  NUL, a 3 000-character cell, 40 columns, a one-line file, and a file of
  nothing but separators.
* §F asserts `findBlocks` soundness: every reported block really is
  field-consistent, line by line.
* §G asserts non-table inputs are untouched and still exact.
* §H is a **2 500-case randomised differential fuzz** over random tables with
  deliberately ragged rows and separator characters inside cells.
* §B/§C assert codec exactness, never-worse-than-identity, and
  `messageTokens ≤ incumbent` document by document.

## H. VERIFICATION

* `tsc --noEmit` clean; `npx next build` clean.
* Real tokenizer for every count.
* 502 red-team assertions + 2 500-case fuzz, 0 failures.
* **Not re-established this turn:** the CPython cross-check run timed out. The
  independent-reader evidence for the CHIRON half of the wire is carried
  forward from earlier turns; the transpose clause has **not** been checked by
  an independent reader, and that is the weakest link in this lane's evidence.
* **Not computed this turn:** a corpus-wide aggregate for KIONES.

## I. REPAIR

No defect survived. One design decision was forced by measurement: the first
transpose attempted whole-file transposition and declined on almost
everything; it was replaced by maximal field-consistent *blocks*, after which
the red team was written specifically against block detection (§F) and against
ragged input (§E, §H).

## J. REMAINING GAP AND THE NEXT HIGHEST-INFORMATION TEST

1. **Finish the aggregate.** `bench/kiones-total.ts` needs to run to
   completion; the per-lane evidence is strong and the corpus number is simply
   missing. **This is the first thing to do next.**
2. **Cross-check the transpose clause** with the CPython reader extended to
   understand `◆sep … ◇`. Twenty lines of Python; it is the weakest evidence
   in this report.
3. **Ragged tables.** `psql`, `kubectl` and `df -h` are whitespace-aligned and
   *not* field-consistent, so the transform declines on exactly the ops lanes
   where columns are most obvious. A width-padding variant with a declared pad
   marker is the obvious extension and was not attempted.
4. **More than one block per document.** KIONES transposes the single most
   profitable block; documents with several tables get only one.

## K. RESEARCH

Carried forward with its original turn, since no new search was run:
**SATzilla** (arXiv 1111.2249) for portfolio framing; **Re-Pair** (Larsson &
Moffat, DCC 1999) and **The Smallest Grammar Problem** (Charikar et al., IEEE
TIT 2005) with BPE's approximation ratio `0.333 < α ≤ 0.625`
(arXiv 2411.08671); **Incremental BPE Tokenization** (arXiv 2605.30813) and
**HuggingFace tokenizers v1**'s word cache for the counting accelerator;
**delta evaluation** in local search (PATAT 2020; Birattari et al., INFORMS
JoC 2008); the 2026 **tokenization-premium** literature (arXiv 2609.39001,
2608.09046, 2601.13328). Column-major storage is of course the founding idea
of C-Store/MonetDB-style column stores and of Parquet/ORC; what is new here is
applying it as a **pre-pass for a token-cost objective with an LLM as the
decompressor**, where the "zip the columns back into rows" step has to be
executable by a language model in one chat turn.

Jan–Sep 2026 AI mathematics (FLT in Lean; AlphaProof Nexus; the disputed
Navier–Stokes claim) supplied the rule applied throughout §0 and §H: **the
proof is cheap to check, the residual job is confirming the statement.** This
turn the statement I could not finish checking is the corpus aggregate, so it
is absent rather than approximated.

## Artifacts

| path | what |
|---|---|
| `src/lib/omega/kiones.ts` | the codec |
| `bench/kiones-bench.ts` | per-lane head-to-head (completed) |
| `bench/kiones-total.ts` | corpus aggregate (**did not complete**) |
| `bench/kiones-redteam.ts` | 502 assertions + 2 500-case fuzz |
| `bench/kiones-emit.ts`, `bench/kiones-crosscheck.sh` | reader harness (**did not complete**) |
| `bench/w19-trans.ts` | the column-major opportunity measurement |
| `bench/w19-seg.ts` | per-region selection — the dead mechanism |
| `bench/w19-kion.ts` | marker and contract costing |
