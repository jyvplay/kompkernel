# PLINTHOS — The Course of Bricks

W16 tier-5 report. **This turn did not produce a large new compression gain.**
It closed two verification debts the previous lane explicitly owed, and killed
one hypothesis with numbers. That is stated up front rather than buried.

## 0. RUNTIME HONESTY

**Ran:** `bash`; `gpt-tokenizer` (real `o200k_base`/`cl100k_base`) for every
token count; `esbuild`+`node` for 2 probes and 3 benches; `tsc --noEmit`;
`npx next build`; CPython 3; `npm ci`; `git`; `gh`.

**Did not run:** any LLM API, theorem prover, SMT solver, simulator, or
parallel agent. **No web search this turn** — the budget went into
measurement and into paying the verification debt; §K carries grounding
forward with its original turn and says so.

**Did not complete** (second turn running):
* `bench/plinthos-total.ts` — the 42-document aggregate. It printed per-lane
  rows up to `mk/paper.tex` and then hit the 900 s cap. **No corpus-wide
  percentage is claimed for PLINTHOS.**
* `bench/plinthos-redteam.ts` — sections **A–D completed with zero failures**
  (self-witnessing transform, multi-block, codec exactness in both encodings,
  never-worse-than-incumbent). Sections E–H (adversarial tables, `scanBlocks`
  soundness, marker balance, fuzz) **did not run to completion** and are
  therefore **not** claimed as passing.

**Downgraded:** "directly model-readable" for the CHIRON half is carried
forward; for the transpose clause it is now **established this turn** (§H).

## A. FORMAL MODEL

**Objects.** `d ∈ Σ*` (UTF-8). A codec is `E(d)=(w,c)` plus a reader `R` =
one bare chat turn: no system prompt, no tools, no skills file. Valid iff
`R(w‖c)=d` byte for byte.

**Access model.** Tokenizer offline. No LLM call, no weight access, no
tokenizer retraining.

**Resource.** `|B(P(w))|+|B(P(c))|` real tokens, whole message; wall-clock ms.

**Success, quantifier order.** `∃ codec. (∀d: tok ≤ incumbent) ∧ (∃d: Δ > k)`.
The universal half is structural: a tournament containing the incumbent, every
member decoded and byte-compared.

**Regime.** 80 ≤ |d| ≤ 40 000 chars. Tolerance: exact.

**Must not be substituted.** lossy compression; retraining a tokenizer; binary
transport; wire-only accounting; anything needing a system prompt; measuring
against raw instead of the incumbent; **reporting a run that did not finish**;
**claiming a red-team section that did not execute.**

## B. OUTCOME SPACE

* **H+** a mechanism beats the frontier by ≫ a few tokens on some lane.
* **H−** the frontier is closed.
* **H∂** transposition pays **only** when it creates long identical runs.

**H∂, sharpened to a predicate.** Last turn's result (vix −466) and this
turn's negative (kubectl, ls, df-h, find-listing: all worse) are the two sides
of one law, stated in §C.

## C. FRONTIER — the law that explains both results

KIONES won 466 tokens on `vix-daily-1990.csv` and this turn's fixed-width
transpose loses on every whitespace-aligned ops table. The discriminator is
not the table format. It is:

> **Transposition pays iff it creates LONG byte-identical runs.
> It does not pay merely by grouping short repeats.**

In `vix`, OPEN/HIGH/LOW/CLOSE hold the same value four times per row, so
column-major three columns become byte-identical **2 000-character** strings;
row-major the dictionary would need one rule per distinct value (127 of them).
In `kubectl`, the repeated material is `Running` and `1/1` — short, and the
row-major dictionary already references each at **0.4 tokens**, while the
transpose must pay a sentinel per cell.

MEASURED (`bench/w20-fw.ts`, `bench/w20-dbg.ts`, both completed). The
fixed-width transform cuts at whitespace columns (positions where every line
has a gap), keeps each field's padding so concatenation is byte-exact, and
joins columns with a sentinel. **Its inverse is exact on every lane tried**
(`invOK true`), and it still loses:

```
kubectl-get-pods   raw 1006  ->  transposed 1186   (23 lines, 6 cuts, 7 cols)
ls-full-iso        raw 1175  ->  transposed 1413   (32 lines, 5 cuts, 6 cols)
df-h               raw  570  ->  transposed  646   (19 lines, 2 cuts, 3 cols)
find-listing       raw 3997  ->  transposed 4580   (120 lines, 2 cuts, 3 cols)
psql-output        0 cuts — no whitespace column spans every line
npm-ls             0 cuts — same
```

and the whole-corpus sweep **after compression returned 0 tokens**.

## D. NEGATIVE SPACE — 16 shapes that looked like solutions

| # | shape | verdict | evidence |
|---|---|---|---|
| 1 | **fixed-width / whitespace-column transpose** for ops tables | **0 tokens** after compression; raw cost rises 18–25 % | `bench/w20-fw.ts`, `bench/w20-dbg.ts` |
| 2 | sentinel-free fixed-width transpose (derive widths) | widths are derivable only if the row count is known, and the row count is only derivable from the widths — circular; declaring widths costs ~3 tok/column but the last field is ragged, so a sentinel returns anyway | derivation in §E#2 |
| 3 | per-region codec selection with a merged tape | **0 tokens** across 28 documents; splitting destroys cross-region rule sharing | prior turn, `w19-seg.ts` |
| 4 | transpose on 2-column CSV (`aapl`) | inverts, not cheaper — two columns give the dictionary nothing new | prior turn, `w19-trans.ts` |
| 5 | self-iteration (arm on its own wire body) | no gain | prior turn, `w18-probe.ts` |
| 6 | `topK` sweep (256…16000) | **0 tokens** | prior turn, `w18-space.ts` |
| 7 | ADD-polish for long repeats beyond `maxSpan` | **0 rules accepted across 42 documents** | prior turn, `w17-add.ts` |
| 8 | whole-document fast counting as a headline | 1.8–2.5× only | prior turn, `w17-speed.ts` |
| 9 | portfolio fusion | 0 tokens, large regressions | prior turn, `w16-fuse.ts` |
| 10 | wide internal `wordGrid` sweep | 2.28× faster, 233 tokens **worse** | prior turn, `w16-grid.ts` |
| 11 | HTML/XML close-tag elision | dictionary already cheaper at 0.4 tok/occurrence | prior turn, `w16-mk.ts` |
| 12 | CJK transliteration to a denser script | dead by arithmetic | prior turn |
| 13 | morphological stem+suffix factoring | mid-word substitution destroys merges | `daedalus.ts` L14-20 |
| 14 | appositive binding / transposed tape / merge density | all net ≤ 0 | prior turns |
| 15 | brotli-entropy headroom as a bound | stack already below it on every lane | prior turn |
| 16 | retraining the tokenizer | **inadmissible** — needs weight access | §A |

**The modal shortcut** this turn was #1, and it is the one the previous
report itself recommended: *"psql, kubectl and df -h are whitespace-aligned;
a width-padding variant is the obvious extension."* I built it, it inverts
perfectly, and it is a **loss**. The detector is `bench/w20-dbg.ts`: implement
the cuts, assert `invOK`, and then print `raw` next to `transposed`. A
transform whose inverse is exact and whose raw token count goes **up** is the
signature of a reordering that groups short repeats rather than creating long
runs — exactly the law in §C.

## E. MECHANISM PORTFOLIO (six; four dead, two shipped)

| # | mechanism | construction | artifact | proved | unresolved | falsification | gap |
|---|---|---|---|---|---|---|---|
| 1 | fixed-width transpose | cut at whitespace columns, fields keep padding | `w20-fw.ts` | **inverse exact on every lane** | costs more than it saves | print raw vs transposed | killed |
| 2 | width-declared transpose | emit per-column widths instead of a sentinel | — | not built | ragged last field forces a sentinel back | count the ragged tail | killed by derivation |
| 3 | per-region selection | merged tape over regions | `w19-seg.ts` | exact | sharing lost | compare to whole-doc optimum | killed |
| 4 | self-iteration | arm on its own body | `w18-probe.ts` | exact | no gain | merge and measure | killed |
| 5 | **multi-block transpose** | every disjoint profitable block | **`src/lib/omega/plinthos.ts`** | inverse exact; red-team §B asserts 2- and 3-table documents | aggregate not computed | count `blocks` on a two-table doc | **shipped** |
| 6 | **independent reader for the transpose clause** | CPython, from the two contract sentences | **`bench/plinthos_decode.py`** | **EXACT on 26/26 transposed wires** | `×`/`…` ops still out of scope | run the cross-check | **shipped** |

## F. WHAT SHIPPED

1. **Multi-block transpose** (KIONES gap 4). Every disjoint field-consistent
   run is scored by measured token gain, the non-overlapping winners are
   transposed in place, each bracketed `◆sep … ◇`. The transform is its own
   witness: `plinthosEncodeText` runs `plinthosDecodeText` and discards the
   candidate unless it reproduces the input byte for byte.
2. **`bench/plinthos_decode.py`** (KIONES gap 2). A from-scratch CPython
   reader for *both* contract sentences — the CHIRON rule tape and the column
   brackets — written from the prose, not the TypeScript.

```
CPython cross-decode EXACT on 26 PLINTHOS transposed wires
```

including multi-block documents (its `--selftest` covers a two-block and a
rules-then-columns case).

## G. SECOND-ORDER ADVERSARY — partial, and labelled as such

`bench/plinthos-redteam.ts` sections **A, B, C, D completed with 0 failures**:

* **A** the transform's inverse on every corpus document where it fires, both
  encodings;
* **B** multi-block: a two-table document yields `blocks === 2`, two open
  markers, and an exact inverse; a three-table document likewise;
* **C** codec exactness and never-worse-than-identity, both encodings;
* **D** `messageTokens ≤ incumbent`, document by document.

Sections **E (21 adversarial tables), F (`scanBlocks` soundness), G (marker
balance), H (fuzz) did not finish inside the time available and are NOT
claimed.** The corresponding guarantees for the single-block case were
established last turn under KIONES (502 checks, 0 failures) and the block
scanner is shared, but **that is inherited evidence, not evidence for this
patch**, and §I of the W13 protocol says a repaired candidate inherits no
trust. This is the honest status.

## H. VERIFICATION

* `tsc --noEmit` clean; `npx next build` clean.
* Real tokenizer for every count.
* **Independent CPython reader: EXACT on 26/26 transposed wires** — the one
  thing the previous report called its weakest link is now verified.
* Red team A–D: 0 failures. E–H: did not run.
* No corpus aggregate.

## I. REPAIR

One repair: the first `cuts()` implementation in `bench/w20-fw.ts` had an
over-restrictive boundary filter and reported zero cuts on every file, which
produced a false "0 tokens" that would have hidden the real result. It was
caught by writing `bench/w20-dbg.ts` to print cut counts per file, rebuilt
with a simple two-condition rule (every line has a gap at `p-1`; some line
starts a field at `p`), and re-measured. The corrected version finds 2–6 cuts
per table, inverts exactly — **and still loses**, which is the finding.

## J. REMAINING GAP AND THE NEXT HIGHEST-INFORMATION TEST

1. **Finish the red team (E–H) and the aggregate.** Two turns running, these
   have not completed. The benches need to be split into per-lane processes so
   a cap truncates a lane, not the run. **This is the first thing to do next
   and it is a tooling problem, not a research problem.**
2. **The §C law is a predicate, so use it as a gate.** Before transposing,
   compute the longest byte-identical run the transpose would create; if it is
   below a threshold, decline without running the stack. That turns the
   kubectl negative into a cheap early exit and makes the lane strictly faster.
3. **Duplicate-column detection as a first-class rule.** `vix` won because
   three columns were identical. Detecting column equality directly
   (`column 4 = column 2`) would capture that in ~4 tokens without needing the
   transpose at all, and would fire on wide tables where transposing the whole
   block is too expensive.

## K. RESEARCH

Carried forward with its original turn, since no new search was run:
**SATzilla** (arXiv 1111.2249); **Re-Pair** (Larsson & Moffat, DCC 1999) and
**The Smallest Grammar Problem** (Charikar et al., IEEE TIT 2005) with BPE's
ratio `0.333 < α ≤ 0.625` (arXiv 2411.08671); **Incremental BPE Tokenization**
(arXiv 2605.30813) and **HuggingFace tokenizers v1**'s word cache; **delta
evaluation** (PATAT 2020; Birattari et al., INFORMS JoC 2008); the 2026
**tokenization-premium** literature (arXiv 2609.39001, 2608.09046,
2601.13328). Column-major storage is the founding idea of C-Store/MonetDB and
of Parquet/ORC; what is new here is using it as a pre-pass against a
**token-cost** objective with an **LLM as the decompressor**, and the §C law —
*transposition pays iff it creates long identical runs* — is the part the
database literature never has to state, because a column store never pays a
per-cell separator.

Jan–Sep 2026 AI mathematics (FLT in Lean; AlphaProof Nexus; the disputed
Navier–Stokes claim) supplied the rule applied throughout §0 and §G: **the
proof is cheap to check, the residual job is confirming the statement.** This
turn two statements could not be checked in the time available, so they are
absent, and a third — "a width-padding variant is the obvious extension" —
was checked and is **false**.

## Artifacts

| path | what |
|---|---|
| `src/lib/omega/plinthos.ts` | the codec (multi-block transpose) |
| `bench/plinthos_decode.py` | **independent CPython reader for both contract sentences** |
| `bench/plinthos-crosscheck.sh`, `bench/plinthos-emit.ts` | the cross-check harness (completed: 26/26) |
| `bench/plinthos-redteam.ts` | A–D completed, E–H did not run |
| `bench/plinthos-total.ts` | aggregate (**did not complete**) |
| `bench/w20-fw.ts` | the fixed-width transpose — the dead mechanism |
| `bench/w20-dbg.ts` | cut-detection diagnostic that caught the false negative |
