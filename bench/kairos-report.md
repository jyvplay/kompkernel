# KAIROS — CHIRON search with exact faster enumeration and a deterministic work-unit budget

**Date:** 2026-10-10 · **Branch:** `arena/da2b9818-kompkernel` · **Code:** `src/lib/omega/chiron.ts`, `src/lib/omega/registry.ts` (key `kairos`)

## What it is (and is not)

- **Not a new wire format or decoder.** KAIROS emits CHIRON wires; `chironDecode` and the decoder prompt are unchanged. The gain is a *search-engine* change, and it is labelled that way.
- Two changes:
  1. **Exact faster span enumeration.** `enumerateTokenSpans` now takes phrases by offset (`part.slice`) instead of re-joining token arrays per window. The reference implementation is kept as `enumerateTokenSpansRef`. Output maps are identical (see equivalence receipt below). Measured 1.9× faster per call on filelock (219 ms vs 414 ms).
  2. **Deterministic work-unit budget** (`ChironOptions.workUnits`). When set, the macro search and the variant sweep stop on a unit counter instead of wall-clock deadlines. One unit = one character enumerated or tokenised in the search loop. The sweep pool is `2.1 × workUnits` (the same 2.1× envelope as the timed sweep); each variant's grant is scaled by its wall-clock share.
- **Residual non-determinism (disclosed):** the block pass (`chironFindBlocks`) still uses a wall-clock cap, 4.4 s in work mode. The output is reproducible only if that cap does not bind. Not separately measured; repeat runs were identical on all 12 work-mode files (below). Making the block pass unit-counted is open work.

## Receipts

### 1. Equivalence of fast and reference enumeration
Command: `node bench/tmp/equiv.mjs /home/user/corpus/licenses /home/user/corpus/pypi bench/holdout bench/holdout-work bench/holdout-ops bench/holdout-tbl bench/holdout-mk bench/holdout-lang` (bundle of `bench/chiron-kairos-equiv.ts`).
Output: `files=226 cases=645 phrases_compared=41092324 mismatches=0`. Cases are each file (≤60 KB; larger files skipped because the reference is slow) plus two mid-search variants: a glyph-substituted most-frequent word, and a dropped first line with a glyph-prefixed tail.

### 2. Per-call enumeration speed
`bench/tmp/enum-time.ts` on `filelock__changelog.rst` (53,702 bytes, 318,924 keys): fast 218.8 ms/call, ref 413.6 ms/call (mean of 3).

### 3. Work-unit determinism and budget curve
Command: `bench/chiron-kairos-bench.ts` in `work` mode runs each file twice and compares wires. Lanes: `filelock__changelog.rst`, `nose__CHANGELOG`, `greenlet__CHANGES.rst`, `licenses/gpl-3.0.txt` (from `/home/user/corpus`). Final-code run, sequential (no other load). Raw: `bench/tmp/kairos-run2.jsonl` and `bench/tmp/kairos-run3.jsonl`.

Message tokens (one-chat M; input raw tokens in parentheses):

| units | filelock (13897) | nose (9636) | greenlet (8841) | gpl-3.0 (7737) | repeat identical |
|---|---|---|---|---|---|
| 2M  | 11020 | 7829 | 6925 | 7167 | 4/4 |
| 4M  | 10099 | 7459 | 6505 | 6829 | 4/4 |
| 8M  | 9239  | 7157 | 6070 | 6672 | 4/4 |
| 16M | **9020** | 7135 | 6066 | 6673 | 4/4 |
| **32M** (default) | **9019** | **7135** | **6069** | **6673** | 4/4 |

Wall time at 32M: 13–21 s per run (two runs per file in work mode). All decodes `exact=true`.

### 4. Timed comparison (same sequential conditions)
Baseline = `git HEAD` CHIRON (`bench/tmp/kb-base.mjs`); KAIROS = this change (`bench/tmp/kb.mjs`).

| run | filelock | nose | greenlet | gpl-3.0 | wall ms (filelock / others) |
|---|---|---|---|---|---|
| baseline CHIRON, 4 s | 9756 | 7307 | 6163 | 6709 | 8488 / ~8.2 s |
| KAIROS timed, 4 s | 9228 | 7138 | 6066 | 6673 | 8361 / ~8.4 s |
| baseline CHIRON, 26 s | 9019 | 7135 | 6069 | 6673 | 26328 / 13–19 s |
| KAIROS timed, 26 s | 9019 | 7135 | 6069 | 6673 | 20989 / 13–15 s |
| **KAIROS work 32M** | **9019** | **7135** | **6069** | **6673** | 13–21 s |

Notes: the "4 s" and "26 s" budgets are per variant; the variant sweep runs under an envelope of min(26 s, 2.1 × budget), so the 4 s runs take about 8.4 s wall. Timed rows depend on machine load, so they are not bit-stable across runs. An earlier loaded probe gave nose 7272 and greenlet 6136 at 4 s; this sequential run gives 7307 and 6163. The rows above are from one sequential run, not an average.

Gains on the four lanes:
- filelock, timed 4 s → KAIROS 32M: 9756 → 9019 (−737, −7.6%); same as baseline 26 s.
- nose: 7307 → 7135 (−172, −2.4%).
- greenlet: 6163 → 6069 (−94, −1.5%).
- gpl-3.0: 6709 → 6673 (−36, −0.5%).

### 5. Checks
- `node_modules/.bin/tsc --noEmit -p .` → exit 0 (`tsconfig.tsbuildinfo` restored with `git checkout`).
- `chironSelfTest()` → 11/11.
- Short sample (408 in-tokens) under KAIROS → `mode=chiron`, `exact=true`, M=86.

## Honest scope
- This is **one lane (CHIRON-family, long text ≳5 KB)**. It is not a new prose or ops codec. Gains are −0.5% to −7.6% on the four measured lanes; the filelock gain is the biggest and comes mostly from making the 4 s budget reach the 26 s result.
- Every number here is a token count of the CHIRON wire plus its contract, measured with `o200k_base`. Readability is unchanged from CHIRON; the LLM-decode of CHIRON wires is not verified in this report.
- Four lanes only; the full corpus is not run. The 16M setting is one token worse than 32M on filelock; the default is 32M.
- Not run: whole-corpus KAIROS vs CHIRON, and a check that the block pass never hits its 4.4 s cap.

## Files
- `src/lib/omega/chiron.ts` — `enumerateTokenSpans` (offset-based), `enumerateTokenSpansRef`, `ChironOptions.workUnits`, `KAIROS_WORK_UNITS = 32_000_000`, work meter in `buildCandidate`, deterministic sweep.
- `src/lib/omega/registry.ts` — `kairos` entry.
- `bench/chiron-kairos-equiv.ts` — equivalence test.
- `bench/chiron-kairos-bench.ts` — timed / work-mode benchmark with repeat check.
- `bench/kairos-report.md` — this file.
- Raw run outputs (gitignored, `bench/tmp/`): `kairos-run2.jsonl` (budgets 2M/4M/8M, fixed sweep). `kairos-run.jsonl` is an earlier run with a sweep bug (one shared pool, so the first variant starved the others: 3M/8M/16M gave 10772/9706/9529 on filelock). It is superseded and not used in any table, `kairos-run3.jsonl` (16M/32M work runs and the timed 4 s/26 s baseline and KAIROS rows). The baseline is `git HEAD` CHIRON, copied temporarily to `src/lib/omega/chiron-baseline-tmp.ts` for the bench and removed afterwards.
