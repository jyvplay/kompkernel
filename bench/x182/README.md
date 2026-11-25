# X182 — ROPI and column-program verification

**Scientific acceptance: false. New codec implemented; no paid Pareto win.**
Production remains unchanged. This follows FOTIA and preserves its evidence.

## New codec

`src/lib/omega/ropi.ts` implements a signed-weight deque bijection. Each field's
weight is its Unicode code-point length minus k. Read source fields left to
right: add the weight to a running total, insert left if positive, otherwise
right. Inverse computes total weight from the payload, repeatedly removes the
end selected by its sign, subtracts the removed weight and reverses the saved
fields. No choice tape or dictionary is needed because total weight is invariant
under rearrangement. ASCII-space splitting retains empties and every other byte.

Nine parameter plans: groups 32/128/512, k=2/5/10. Deterministic enumeration, not
greedy search; complete raw-wire price selects one plan for parent pricing.
Transform/inverse are linear in source units and fields, excluding tokenizer and
parent search. Classical Sparre-Andersen ancestry is explicit. This is neither
FOTIA's rotations nor METRIDA's length-sum assignment solver. Exhaustive novelty
against all stack compositions is not established.

## Complete paid results

| Source | Frontier | ROPI tokens | Change |
|---|---:|---:|---:|
| Email | 486 | 599 | +113 |
| Knowledge base | 620 | 710 | +90 |
| LLM prose answer | 664 | 755 | +91 |
| ps | 381 | 472 | +91 |
| ps-ef | 296 | 394 | +98 |
| JSON | 653 | 760 | +107 |
| Diff | 411 | 520 | +109 |
| TypeScript | 949 | 1057 | +108 |

All eight complete candidates are byte-exact and lose. The full instructions and
parent wire are charged. No raw wins among 35 sources. Other parameter plans
were not all parent-priced, so this is not a proof of family-wide impossibility.
Search budgets are 90 s wall / 1,000 MiB V8 old space per paid candidate.

Exact price attribution isolates the failure: the outer contract adds **91 tokens**
on each paid message, but even an inadmissible free-key comparison saves at most
**one token** (KB 620→619). Two parents tie and five get worse. Therefore simply
shortening this key cannot produce the requested >10-token wins on these plans.
Parent-alone diagnostics are not advertised as valid complete codec gains.

## Verification improvement

`grammikos-parent.ts` adds a bounded, message-only reader for the existing
STICHOMYTHIA integer/clock column-program envelope. It enforces exact key,
consistent row count/range, ≤1000 rows, ≤64 columns, bounded integer syntax,
24-hour non-crossing clocks, literal-list arity and ≤50,000 output units. It
supports one previously refused frontier format, not a new compression operation.
The old decoder ignores an inconsistent advertised last-row index; an executable
attack now demonstrates that behavior and the new reader's refusal.

On pinned frontier messages: **26 exact / 3 refused / 0 mismatches**. A separate
Python implementation reads the same column subset, with seven independent
positive/malformed tests. Fresh replay coverage and generalized source-role
leaders are recorded in receipts/summary.json. Refusal is never a successful read.

## Fresh frontier and generalized leaders

**29 identical wires / 11,962 tokens** versus X181. All complete prices and token
transport checks pass. Source-role aggregates and absolute-saving leaders:

| Category | Lanes | Raw → frontier | Leader |
|---|---:|---:|---|
| Prose | 3 | 2018 → 1770 | email, 629→486 |
| Ops/tabular | 22 | 22332 → 8078 | ls-l, 5194→1310 |
| Code/structured | 3 | 3152 → 2013 | JSON, 1152→653 |
| Other | 1 | 513 → 101 | cue, 513→101 |

Ops relative leader remains prices, 582→118. These are fixture savings, not
per-codec ablations or a global optimality claim. Fresh GRAMMIKOS coverage:
**26 exact / 3 refused / zero mismatches**; separate Python coverage:
**23 exact / 6 unsupported / zero mismatches**. Old reader mismatch diagnostics
remain visible rather than silently relabeled as successes. Compiler/build pass.

## Tests and native boundary

- **92,044** source/unit checks across **35** sources, including exhaustive small
  ternary words, 1,000 seeded cases, both inverse directions, histograms, zero
  sum, astral Unicode, empty fields, size caps and malformed parameters.
- **61,265** independent Python checks, including eight paid wires. Python uses
  deque operations, distinct from the centered-array TypeScript implementation.
- Five prior external fixtures are explicitly reused. A pinned Git workflow
  guide was fetched after the parameter family was fixed, with license/hash;
  it receives raw/exact tests only, not full paid or native tests.
- Six single-message native prompts are prepared, **NOT_RUN**. No system/skill
  assistance is specified, but an executable inverse cannot verify an LLM's
  behavior. No native endpoint or independent agent was invoked.

## Whole-stack speed experiment

The X181 profile identified merge/tokenization and slot-delta work. This turn
actually targets mergeCount: replace two scalar boundary-shift loops with native
TypedArray.copyWithin when at least 32 entries remain. Rank search, leftmost tie
rule, updates and candidate sets stay unchanged; asymptotic complexity is unchanged.
This is bundle-only, not a production change. **4,119** differential merge tests
cover the threshold, repeated/tied byte patterns, Unicode, surrogate and scratch
boundaries; count/vector A/B gates also match. Six-source isolated cold ABBA runs
after replay/validation; final ratios and rejection/acceptance are in
receipts/runtime-summary.json. **Rejected:** 24 identical wires, aggregate CPU
B/A **0.994480** and wall B/A **0.993024** (about 0.55% and 0.70% lower in this
run), but protected-lane regressions and nowhere near the declared 10% aggregate
threshold. No speed patch is promoted. Count/vector gates contain 16,192 and
12,124 checks respectively. Exact outputs alone do not establish speed gains.

## Reproduction and limits

Reuse x164/frontier.ts, x164/cache-speed.ts, x163/count-gate.ts and
x164/speed-unit.ts. Bundle local TypeScript entries with esbuild for Node ESM.
Run `run.py` for paid trials; replay via `frontier.mjs lanes.txt receipts/frontier.jsonl`
with the x182 path prefixes. After all workers exit, run `validate.sh`, then
`runtime-run.py` alone, then `summarize.py`. Do not overwrite active receipts.
Hashes bind source, docs, fixtures and final outputs. Generated bundles are ignored.

Model.md defines A–J, positive/negative/boundary thresholds and the distinction
between a research-record commit and scientific acceptance. Portfolio.md and
portfolio.ts preserve distinct executable mechanisms and attackers; modal.py
checks 27 explicit false solution shapes. Research.md records actual live searches,
a 2020 primary paper and 19 pinned lab-file retrievals; no theorem kernel or
exhaustive all-labs proof audit is claimed.

Remaining gap: no broad paid gains or verified native behavior, three reader
formats still refused, and no global optimality/terminal-codec result. The price-attribution test is already complete: free-key savings never exceed
one token. The next high-information test should therefore target the measured
parent scoring/merge bottleneck with identical candidate sets, or a predeclared
representation that creates actual repeated parent phrases. More key wording
or another unmotivated permutation is not justified by these receipts. Improving verification coverage is real, but is
not substituted for the requested Pareto-superior codec.
