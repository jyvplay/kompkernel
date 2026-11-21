# X149 review — what was actually established

> **X150 correction:** The X149 transform emitted original padded rows and its
> tests did not catch the no-op. Claims below about the intended compact
> transform's chain result or cause are withdrawn. At X149 commit the default-on
> parallel run was incomplete (0 + 14 rows), so its asserted 28/28 comparison
> was unsupported. The 138/237 lossy rewrite deltas are not proven upper
> bounds on other codecs; the 13→11 diff probe drops shared text and is not an
> exact reversible comparison. The 1.77× ratio is between historical runs,
> not a controlled repeated identical-wire A/B. The repaired transform and
> tests are in `bench/x150/`.

**New codec: ΠΟΛΥΣΤΗΛΗ** (`src/lib/omega/polysteli.ts`, wired in `tagstack.ts`).
Mechanism: right-edge grid tiling with a verbatim multi-token tail — the geometry
class ΣΤΉΛΗ cannot express (measured NULL on ls-l-real). Byte-exact gates G1–G6,
fail-closed reader, greedy fit, opt-out env. This is a parent-frontier candidate:
it wins exactly where its grid fits and the composed message is strictly
cheaper; every other lane is byte-identical to the incumbent chain.

**Second artifact: batch frontier parallelism** — the 29-lane acceptance path
runs 1.77× faster (899,136 ms vs 1,594,918 ms) with byte-identical per-lane
outputs, verified in-worker. Library single-call latency unchanged; two
library-level speed candidates were already measured and falsified in X148.

**Verified**

1. Pre-codec frontier reconfirmation: 11,962 total, 29/29 byte-identical to
   X147, code-ts 949 — X148's 950 was a sequential time slice, now resolved.
2. ΠΟΛΥΣΤΗΛΗ unit gate: 22/22 (self-test + real files + lying-marker,
   row-count-lie, unicode-tail, tamper-semantics checks).
3. Raw ls-l grid delta 5194→4779+28 (−415 gross, prototype receipt).
4. Chain composite under canonical flags (memo-masking failure of the first
   attempt is kept as a lesson receipt; candidate arm now visibly re-runs).
5. Leaders table regenerated; residual bounds measured (whitespace 138 gross
   unharvestable; numerics 237 gross; diff-pairs 1; prose word substitution
   structurally break-even).
6. Fresh live sources with new search terms (ONTO 2026, zip2zip 2025,
   AlphaZip 2024, LLMLingua, ZFP/DCTZ) — each recorded with its exact reason
   for admissibility/inadmissibility.

**Explicitly NOT established**

- Native fresh-chat behavioral gate: NOT_RUN (no endpoint in this sandbox).
- Global Pareto claim: established per-lane through G6 only.
- Research claims inspected to stated depth only; no Lean replay available.

**Turn verdict:** the codec is real, mechanism-distinct, and fully gated, and
it does NOT move the frontier: raw geometry gains (−415 gross on ls-l) are
dominated by the parent's own alignment-aware machinery on re-encode, G6
refuses every grid lane, and default-ON wiring measurably regresses kubectl
through clock-arm interference (hence default-off). The turn's real frontier
advancement is the **1.77× batch parallelism** (driver-level, byte-identical
outputs) and the **exact reconfirmation of 11,962 / 29 lanes = X147**,
including the resolution of X148's code-ts time-slice question (949 under
parallel load). No merge: the Pareto-superiority condition is not met.

## Highest-information next test

A native fresh-chat ΠΟΛΥΣΤΗΛΗ readability packet when such an endpoint exists
(read the marker + 5 rows, reproduce the original padding by hand), and a
ps-aux-specific stretch-splitting probe: its 37-row grid breaks where STAT/START
columns change width; a two-width alternation model is the next mechanism
question.
