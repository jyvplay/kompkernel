# X149 — ΠΟΛΥΣΤΗΛΗ turn record

New repository codec this turn: **ΠΟΛΥΣΤΗΛΗ** (`src/lib/omega/polysteli.ts`,
wired into the chain after ΣΤΉΛΗ in `tagstack.ts`) — right-edge grid tiling with
a verbatim multi-token tail. The mechanism ΣΤΉΛΗ (X124) cannot express: rows
whose trailing column contains spaces. Measured `steliTransform(ls-l-real) =
NULL`; ΠΟΛΥΣΤΗΛΗ fits a 149×8 grid there.

Second artifact: **batch frontier parallelism** (`bench/x149/frontier-worker.mjs`
+ balanced two-process split) — 29 lanes, byte-exact per worker, wall
**899,136 ms vs 1,594,918 ms sequential = 1.77× batch speedup**. Library
single-call latency unchanged (deterministic work-bounded search; library-level
candidates falsified in X148 receipts).

## Gates actually run this turn

| Gate | Result | Receipt |
|---|---|---|
| Frontier reconfirmation (pre-codec, parallel) | total 11,962, 29/29 byte-identical to X147; code-ts 949 (X148's 950 was the sequential time slice) | `receipts/frontier.jsonl` |
| ΠΟΛΥΣΤΗΛΗ unit gate | 22 checks / 0 fails | `receipts/polysteli-unit.json` |
| Chain composite A/B (canonical flags) | see `receipts/composite.log` | `receipts/polysteli-composite.jsonl` |
| Residual decision measurements | WS bound 138 gross (unharvestable), numeric bound 237 gross, diff-pair census (1 pair), prose word-substitution break-even | `receipts/decide.log`, `receipts/digitbound.log`, `receipts/headroom.json` |
| Post-codec frontier (default-on fragility receipt) | kubectl 316 vs 300 — ΣΤΟΙΧΗΔΟΝ/ΓΕΝΝΑΔΑΣ suppressed by the arm's inner-call wall time; 28 other lanes byte-identical | `receipts/frontier-polysteli*.jsonl` |
| Default-off restoration | kubectl fresh-process re-encode = canonical 300 byte-identical | `receipts/` kubectl-confirm |
| Leaders (X134 classifier) | prose word 1629 / ops glyph 1202 / code word 945 / other none | `receipts/leaders.json` |
| tsc + build | see turn end | — |

## Honest boundaries

- Native fresh-chat behavioral gate: NOT_RUN (no such endpoint in this sandbox).
- The first composite attempt was INVALID (memo masked the candidate arm: 0 ms,
  delta 0) and is kept as a failure receipt lesson; the rerun uses the canonical
  frontier flags including OMEGA_NO_MEMO=1.
- Research: ONTO/zip2zip/AlphaZip/LLMLingua/ZFP inspected to stated depth; all
  recorded as prior art or inadmissible boundaries (bench/x149/research.md).
