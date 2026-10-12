# z20 receipts (KOINE-K1 / PHALANX-P2 turn)

New codec
- `src/lib/omega/koine.ts` — KOINE-K1: shared-prefix field folding against the line above.
  A field whose first k >= KOINE_MIN_K (=8) characters equal the same-numbered field of the line above
  is written `&k:` + remainder; `&:x` is a literal field starting with `&`. Whitespace is copied unchanged.
  Per-line greedy: a fold is kept only if it lowers the whole line's o200k cost.
- `src/lib/omega/phalanx2.ts` — PHALANX-P2 = UUIDFOLD -> DIRFOLD-A -> DITTO -> KOINE-K1 -> VERITAS-VX.
  KOINE is kept only if VERITAS(KOINE wire) < VERITAS(DITTO wire) (one downstream-aware gate).
- `src/lib/omega/registry.ts` — key `phalanx2`.
- PHALANX-P1 (`phalanx.ts`) is unchanged.

Receipts
- `koine-probe` (the stage-order matrix, not kept as a receipt; numbers are in koine-sweep).
- `koine-sweep.receipt.txt` — minimum prefix length {4,6,8,12,16}, KOINE before vs after VERITAS.
  Shows KOINE-before-VERITAS wins find-listing (2427 -> 1678 at k=4..8), but the same placement loses on
  openstack and git-numstat when ungated; the downstream gate removes those losses.
- `phalanx2-probe.receipt.txt` — P1 vs P2 vs VERITAS vs identity on all 18 holdout files, decode-checked.
  P2 is <= P1 on all 18, strictly smaller on find-listing only (2427 -> 1678, -30.9%).
- `samples-probe.receipt.txt` — P1 vs P2 on 3 NEW real outputs from this sandbox (git log ISO dates,
  `ls -la --time-style=full-iso`, `find -printf` with fractional mtimes). Captured in `samples/`.
  P2 gains: ls-full-iso 2573 -> 2463 (-4.3%), find-printf 2879 -> 2816 (-2.2%), git-log-iso 1804 -> 1783 (-1.2%).
- `koine-redteam.receipt.txt` — 25 edge cases + 3000 fuzzed structured texts + 500 random ASCII, body-level and
  full-chain round trips. ALL EXACT (after the fix described below).

Bug found and fixed in this turn (recorded for honesty)
- First fuzz run threw inside phalanx2Encode: when KOINE was gated off, the DITTO wire was passed raw, and an input
  that itself began with the KOINE rule line was then read as a KOINE wire. Fix: koineIdentityWire() escapes such
  inputs, and every self-check is wrapped (safeDecode) so a throw becomes an identity escape.

Readability caveats (NOT verified with an LLM; no LLM access in this sandbox)
- The P2 wire for ls-style listings is layered: VERITAS keys (~0, ~1 ...) over DITTO marks (^) over KOINE
  references (&k:) over DIRFOLD-A (=). The self-read sample (`selfdecode-sample.ts`) shows the VERITAS layer is the
  dense part; KOINE itself is positional (reference = the line above, decoded).
- KOINE-only chains (no VERITAS) are a possible readability-first lane: U,DA,T,K gives find-listing 2125 and
  ls-full-iso 794 (see koine-sweep). Not adopted; no readability metric is available here.
