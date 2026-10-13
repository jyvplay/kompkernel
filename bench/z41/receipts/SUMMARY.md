# Z41 receipts: pool modes, lane baselines, failure probes (no new codec beat the frontier)

## Outcome
- No new codec beat DAEDALUS-D by a large margin in any lane. The success predicate of Z41 is NOT met.
- Committed: `dualTokenizer` pool modes (`false` | `true` | `'first'` | `'pairs'`) as an encoder-only option. Default `false` is unchanged. `true` is DAEDALUS-D and reproduces the Z40 numbers. `first` and `pairs` were tested and do not beat `true` (below). Nothing is made default.
- Harness: `bench/z41/mode-test.ts`, `dpkg-anatomy.ts`, `contract-share.ts`, `print-contract.ts`, `fastglob-repair.ts`.

## Environment and reproducibility (measured, not assumed)
- Workspace was re-created at the base commit with a stale local branch. The remote session branch `origin/arena/da2b9818-kompkernel` (7ac565f) was reset onto. The prior uncommitted state is saved in `git stash` (`z41-start-uncommitted-state`) and `/home/user/z41/uncommitted-at-start.patch`.
- `node_modules` was missing; `npm ci` restored it (log: `receipts/npm-ci.log`).
- `/home/user/z31` corpus was missing (111 of 151 files). Rebuilt with `bench/z37/rebuild-z31-docs.py` from npm tarballs: 111/111 rebuilt, each matching the recorded byte length. Byte content is not hash-verified against the original (no hashes in the receipts).
- DAEDALUS output is NOT load-independent. Its search is time-budgeted. Same file, same settings: `dpkg-l` gave o200k 4697 / cl100k 5651 in one run and 4690 / 4840 in another (the second run ran with a different arm choice under CPU contention). Every DAEDALUS comparison carries this noise. Treat differences below a few percent as unresolved.

## Pool modes on a 14-file stratified sample (2 per lane; `receipts/pool-modes-sample.jsonl`)
DAE = baseline pool (false). DAE-D = `true`. `first` = dual-safe glyphs ordered first, o200k-only as fallback. `pairs` = all single glyphs, dual-safe merges only.
- `true` reproduced the Z40 numbers on every file checked (readme 688/700, code-ts 1083/1199, ajv 2154/2284).
- `first` loses the cl100k gain (ordering does not bind: the tokenizer-aware assignment chooses glyphs by pair degree, not pool order). Example: code-ts cl100k 1607 (DAE) vs 1607 (`first`) vs 1199 (`true`).
- `pairs` is non-monotone: code-ts 1033/1339 (better than DAE on both), readme cl100k 785 (worse than DAE 700 and `true` 700), ajv 2155/2495.
- No mode dominates `true` on the joint sum over this sample. Pool tuning is exhausted at this level.

## Per-lane baseline on the 151-file corpus (from `bench/z40/receipts/dual-151.jsonl`)
| lane | raw o200k | raw cl100k | DAE o200k | DAE cl100k | DAE-D o200k | DAE-D cl100k |
|---|---|---|---|---|---|---|
| fresh (111) | 337142 | 337450 | -31.2% | -16.5% | -30.9% | -25.7% |
| ops (11) | 50165 | 50392 | -66.7% | -59.1% | -66.4% | -63.1% |
| ops_real (10) | 32204 | 32018 | -66.3% | -55.5% | -66.1% | -59.9% |
| wrapped_docs (6) | 41988 | 41824 | -15.8% | **+7.3%** | -15.1% | -10.3% |
| prose (6) | 4692 | 4699 | -9.8% | **+2.6%** | -9.8% | -6.6% |
| code (4) | 5255 | 5213 | -41.7% | -24.7% | -40.7% | -36.8% |
| realjson (3) | 5498 | 5517 | -38.3% | -31.4% | -37.8% | -36.2% |

Reading: on cl100k, original DAEDALUS makes prose and wrapped docs LARGER than raw. DAEDALUS-D removes that failure.

## A10 vs DAEDALUS on o200k (40 files where both receipts exist; `bench/z33/receipts/a10-groups.jsonl`)
- A10 is +17.5% larger than DAEDALUS overall on o200k (prose +8.9%, wrapped +8.1%, code +27.6%, ops +27.7%, ops_real +34.8%, realjson +11.2%). A10 is not competitive on o200k.
- On cl100k (20-file subset, Z40), A10 is 1.2% better than DAEDALUS-D overall, and 5.8% better on ops. So the two frontiers split by tokenizer: o200k favours DAEDALUS, cl100k is roughly tied, with A10 ahead on ops.

## Contract share (decoder instruction is a fixed sentence, ~40-50 tokens)
- Shares of a DAEDALUS-D message: readme 5.8% (o200k), code-ts 4.5%, gh-prose 2.7%, find-listing 2.9%.
- Small files fall back to raw: md-vite (274 tokens), df-h (131), os-release (79), uname (40).
- Instruction text (readme): "Every new Cyrillic letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result." A shorter wording would save roughly 10-15 tokens. LAKONIKOS (registry) already tried a terse contract, so this was not re-run here.

## Failure probes
- `fast-glob` README (25,995 chars, 7,128 o200k tokens): DAEDALUS-D returns raw with blocks on AND with `noBlocks`. The no-blocks retry does not recover a wire. The list-glyph reference cause from Z40 is not in the block pass. The source is still unlocated. OPEN.
- `dpkg-l` block sensitivity: the block-enabled and block-disabled runs differ, but this is the load-dependent arm choice above, not a block effect. Markers `§ ¶ × …` each cost exactly 1 token under both tokenizers.

## Not done in this turn (stated plainly)
- No LLM decode test. No model endpoint is reachable from the sandbox (outbound: github, npm, pypi only).
- No Claude or Gemini tokenizer counts.
- No Lean run. `lean`, `lake` and `elan` are not installed.
- No PR codec copy or merge. The 13 open PRs were listed in Z40 but not reviewed in Z41.
- No Rosetta analysis in this turn.
- No full 151-file run of the pool modes. The sample is 14 files.
