# CTXCOPY: copy from earlier chat text (conditional lane), 2026-10-10

## What it is
`src/lib/omega/ctxcopy.ts`. A span of the new text T that also appears verbatim in earlier text C
(the previous version, visible in the same chat) is written as `⟦a…b⟧`. `a` and `b` are anchors that
each occur exactly once in C (unique mode, the default), so the reader finds the copy by locating
unique passages, not by counting. The encoder simulates the decoder and returns `null` if the round trip
fails. No wall-clock budget: output is deterministic and machine-independent (unlike DAEDALUS).

## Scope (read this first)
This is a **conditional lane gain**. It only applies when the earlier version is already in the same chat.
It is not a general prose or ops gain. With unrelated earlier text, copy coverage is zero (control below).
The codec refuses any T or C that contains `⟦ ⟧ …`, so those texts fall back to LAKONIKOS.

## Data
`bench/ctx/harvest_pairs.py` and `bench/ctx/pairs-manifest.json`: 326 adjacent PyPI sdist release pairs
over 26 packages, sha256-verified, line ratio ≥ 0.5 (most ≥ 0.9). Pair texts are in `bench/tmp/ctx-pairs/`
and are not committed. Git-history pairs were not usable because the clone is shallow.

## Results (o200k tokens; message = CTX contract + wire)
Sample: 81 pairs, stratified by line ratio (step sample). LAKONIKOS was run on each pair with no context.
Receipts: `bench/ctx/ctx-pairs-receipts-2026-10-10.jsonl`. Bench: `bench/ctx/ctx-bench.ts`.

| line-ratio band | n | raw | LAKONIKOS (no context) | CTX-or-LAK (min) | diff -u | min vs LAK |
|---|---|---|---|---|---|---|
| [0, 0.8) | 6 | 30,516 | 20,479 | 15,947 | 25,455 | −22.1% |
| [0.8, 0.95) | 26 | 98,019 | 65,904 | 24,213 | 43,596 | −63.3% |
| [0.95, 0.99) | 25 | 98,726 | 61,689 | 10,168 | 15,173 | −83.5% |
| [0.99, 1.01) | 24 | 115,071 | 71,601 | 3,160 | 7,685 | −95.6% |
| **total** | **81** | **342,332** | **219,673** | **53,488** | **91,909** | **−75.7%** |

- Exact decode: 81/81 (`ctxExact`). LAKONIKOS exact: 81/81.
- The min selector used CTX in 80 of 81 pairs.

**Decision rule (no LAKONIKOS search needed to decide):** use CTX if copy coverage ≥ τ, else LAKONIKOS.
- On the 81-pair sample, τ = 0.5 gives 53,867 tokens against 53,488 for the oracle min (2 mispredictions).
  τ = 0.9 gives 86,910, so the rule is sensitive to the threshold.
- **Caveat:** τ = 0.5 was chosen after viewing this sample. It is not pre-registered. The held-out run below is the check.

**Held-out** (`bench/ctx/ctx-holdout-receipts-2026-10-10.jsonl`): the 245 pairs not in the sample, with τ = 0.5 fixed for this run.
- Rule picks CTX for 241 pairs and LAKONIKOS for 4. All 245 copy wires decode exactly.
- Raw tokens for those 245 pairs: 1,128,173. Rule-chosen tokens: 160,494 (−85.8% vs raw).
- LAKONIKOS was not run on the 241 CTX pairs, so there is no LAKONIKOS comparison for them. The comparison is vs raw.
- The rule was wrong on one of the four LAKONIKOS-chosen pairs. `filelock/_soft.py` had coverage 0.41. CTX 2,827 would have beaten LAKONIKOS 3,497. The other three low-coverage pairs were correctly sent to LAKONIKOS (all four were below 0.5).

**Unrelated-text control** (`bench/ctx/ctx-control-receipts-2026-10-10.jsonl`): 60 cross-package pairs, where the earlier text is from a different package. Copy coverage is 0 in all 60, so CTX is never chosen. The run was stopped after 60 rows, to save time. All 60 rows are control results.

**Human-style readability** (self-decode only, n=2, not a multi-model test):
- Case 1, `httpx _pool.py` (3,006 chars, 7 copies): decode exact. Fixtures in `bench/llm-blind-ctx/`.
- Case 2, `click handling-files.md` (3,574 chars, 2 copies): decode exact.
- Case 3, `markupsafe CHANGES.rst` (5,326 chars, 1 copy): not decoded. Too long to copy by hand in this session.
- The first draft of case 1 had two errors. One skipped `now = `, and one added a trailing newline. A byte compare caught both. A reader has no such check, so this error mode is real.

## Limits
1. Conditional: the gain needs the earlier text in the same chat. Without it, use LAKONIKOS.
2. The rule is threshold-based. The threshold is not pre-registered and gives some mispredictions.
3. A wire containing `…` (common in prose) or `⟦ ⟧` is refused. Those texts fall back.
4. Decoding requires the reader to locate unique anchors and copy exact spans. Only two self-decodes exist.
5. `diff -u` is counted in tokens only. Its application by a model was not tested.
6. No frontier comparison against other PR codecs for this lane.
