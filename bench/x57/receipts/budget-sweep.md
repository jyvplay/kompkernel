# X57 work-budget calibration sweep

All runs on this sandbox (2 cores, node v22.22.3), o200k_base.
`budget 0` = unbounded (pre-X57 behavior). Runners: bench/x54/prof-one.ts
(ARCHETYPON leg), bench/x57/prof/tag-run.ts (TAGSTACK), rebuilt after each
patch stage. Inputs: od8 = first 8 lines of bench/x52/fixtures/od-bin512.txt
(600 chars); lic-mit = bench/holdout/lic-mit.txt; metrics.tsv =
bench/holdout-x40/metrics.tsv (1,203 chars; frontier 210).

## Diagnosis (pre-repair, instrumented once, counters later removed)

archetyponEncode(od8): 79.3-83.5 s, exact, 142 tokens. 3,132 renderBest
calls, 7,060,089 scoreRunCostDelta calls, 28.17M short-tokenizer calls.
Cache stats: short 26.351M hits / 1.476M misses (94.7%); long 663,301 hits /
16,551 misses (97.6%) — memos work; call volume is the pathology.
Healthy references: lic-mit 4.5 s / 210 renderBest / 301,868 scoreDelta;
metrics via ARCHETYPON 27.9 s / 261 / 1.229M. tagstackEncode(metrics.tsv)
ALONE: 309,146 ms / 210 tokens / 4,003 renderBest / 17.93M scoreDelta.
Per-renderBest scoreDelta maxima are similar healthy vs pathological
(10.7k / 17.3k / 11.5k): per-call caps are not the lever; aggregate
multiplicity is. CPU profile: tokenizer ~36%, scoreRunCostDelta 14.6%,
renderBest 12.1%, GC 8.4%; renderBest subtree callers: evaluate 61.9%,
buildOn 13.7% (wrapper-chain re-entry).

## Stage 1: hill-climb budget only (shared window, OMEGA_WORK_BUDGET)

od8 ARCHETYPON (unbounded 83.5 s / 142 tok):
  250k 29.8 s / 142 | 1M 36.8 s / 142 | 4M 56.3 s / 142 | 50k 27.2 s / 141 | 1: 26.2 s / 141
lic-mit ARCHETYPON (38 tok everywhere): 250k 4.45 s | 1M 4.55 s | 50k 3.47 s
metrics TAGSTACK shared window: 250k 21.3 s / 236 BAD | 1M 37.7 s / 236 BAD | 4M 69.9 s / 210
=> shared window starves late parents (SYNKRISIS/ARCHETYPON eats first,
   AKOLOUTHIA-2 the usual winner runs 4th). Also a ~26 s fixed-cost floor
   on od8 = per-renderBest pattern-table setup, not the probes loop.

## Stage 2: + exhausted-entry baseline shortcut in renderBest

od8 ARCHETYPON: 50k 11.3 s / 155 | 250k 15.5 s / 142 | 1M 23.6 s / 142.

## Stage 3: per-parent / per-arm budget windows (shipped shape)

metrics TAGSTACK (unbounded 309 s / 210), per-parent budgets:
  100k 21.4 s / 210 | 200k 25.6 s / 210 | 300k 30.5 s / 210 |
  500k 42.2 s / 210 | 1M 66.5 s / 210 | 2M 110.0 s / 210
od8 ARCHETYPON per-arm: 100k 12.2 s / 147 (degraded) | 200k 14.8 s / 142 |
  500k 16.7 s / 142 | 1M 22.7 s / 142
lic-mit per-arm: 38 tok at 100k/200k/250k/1M (3.2-4.5 s).

Shipped default: workBudgetFor(chars) = 2,000,000 + 100*chars per window
(10-20x above the measured knees: 100-200k), epochs opened per TAGSTACK
parent and per ARCHETYPON identity arm. OMEGA_WORK_BUDGET overrides
(<=0 = unbounded). The meter counts scoreRunCostDelta evaluations —
deterministic, load-independent (clock budgets rejected: old G10 wound).

## Post-repair parity + frontier (default budget vs unbounded)

- archetypon lic-mit: sha 30f044d32098bf39 both, 38 tok, 4.32 vs 4.38 s.
- synkrisis license.txt: sha 7effcc2ddf52cef1 both, 929 tok, 31.9 vs 31.9 s.
- tagstack metrics.tsv: sha f0e0ffb9543f3b2f both, 210 tok, 304.0 s -> 110.0 s.
- frontier repeat #8 (default budget, bench/x49 runner): 210 exact,
  repeatMatchesPreviousGate=true, winner akolouthia2, 115.2 s total
  (vs 274.5 s for the X56 repeat on the same code lineage).

Recorded honesty: a binding budget CAN change outputs (od8 at 100k: 147 vs
142; shared-window starvation produced 236 on metrics). The shipped
constants keep every measured lane byte-identical; lanes where the budget
binds and output changes are disclosed here, not hidden.
