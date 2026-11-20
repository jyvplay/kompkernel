# X142 — EUTAXIA and rank-table placement

**Codec outcome: no verified Pareto winner. No merge authorized by these results.** EUTAXIA is a new experimental repository codec, not a new mathematical primitive or a proven native-readable codec. User's requested advantageous new codec remains unmet.

## New implementation

`src/lib/omega/eutaxia.ts`: endogenous-order reconstruction. A strictly monotone, unique key already present in source lines determines their source order. The encoder may cluster those intact lines to help TAGSTACK, then the in-band contract restores the selected run by sorting. Unlike arbitrary permutation coding, no permutation rank is transmitted; unlike periodic-stride ANASTROPHE, order recovery depends on a verified source invariant. This corrects ANASTROPHE's overbroad exclusion of all sorting, not the classical lower bound for arbitrary permutations.

Planner: bounded greedy maximal-run selection, at most4 distinct run ranges and3 deterministic cluster orders. Parent harness policy was fixed before outcomes: first nonidentity plan of the longest selected run, one full-parent call per eligible source. Full encoder retains baseline on token loss, but still pays search cost, so fallback does not certify runtime Pareto dominance.

## Completed codec measurements

* Fresh shipped frontier: **29 lanes /11,962 tokens**, all messages identical to X141. Aggregate encode elapsed1,594,906ms under concurrent jobs; not causal speed evidence.
* Canonical standalone:67 candidates, no frontier wins.
* Canonical full-parent:12 candidates, no frontier wins. Best gap+30 tokens on ps-aux; apt candidate took464,406ms under concurrency, a warning against calling the wrapper fast.
* Heldouts: actual first81 lines of `LC_ALL=C ls -l /usr/bin` and first100 lines of installed gpt-tokenizer README, frozen and hashed before pricing. Parents615 and990 tokens. The ops candidate costs656; documentation has no admitted monotone run under the policy.
* Unit tests:3,852 checks and8 mechanics fixtures, including BigInt beyond2^53, duplicate numeric keys, field/range errors, final LF, domain refusals and incomplete-parent attacks.

Independent Python reader:78 candidate messages byte-exact plus8 mechanics fixtures;5 composed events unsupported. Independent canonical+heldout frontier reader:22/31 supported,9 unsupported. Final reference tokenizer gate:116 complete-message prices, including the two native-trial packets. Full API fallback test reproduced the shipped df-h message and rejected its238-token candidate. Typecheck passed. No unsupported case is counted as an independent pass.

Reused mechanism controls:29 Brotli and29 backward-copy trials, no token wins;29 numeric-delta trials (230 sites), no wins;29-source long transformed-image census, zero pairs.

## Acceleration investigation

`rank-hash.ts` experiments with multiplicative placement for the existing3/4-byte rank tables. Full-key comparisons and linear collision probing remain unchanged. Placement census average insertion probes:3-byte19.0104→1.0325;4-byte9.1358→1.0581. This is not a speed ratio. Census includes byte entries that may be shadowed; actual tokenizer equivalence is checked separately.

Reused X72 differential harness: **323,192 strings, zero mismatches**, including Unicode/BOM/malformed-surrogate boundaries, repository windows, random attacks and before/after library checks. Hash-mode switching rebuilds the index. Experimental patch is applied only while building bundles and then reversed, preserving inherited source changes. Whole-stack balanced ABBA/BAAB completed24 isolated measurements (four per arm/source), preserving every message and source. B/A total-time ratios: KB0.9961, ps-real0.9744, metrics1.0040; median ratios0.9985/0.9839/1.0040. This does **not establish significant broad acceleration**; probe-count improvements did not translate into a comparably large whole-stack gain. Experimental hook remains removed; helper unwired. No production deployment. Exact timing samples are in `speed.jsonl` and `speed-summary.json`.

## Native verification and research

Prepared frozen PTYCHE620→608 and KREMA846→831 single-message packets plus a no-normalization byte grader. **No blind model was invoked.** Packet preparation is not confirmation of native decoding, and this agent's prior access to source prevents an independent blind self-test. See `native-packets/` and `receipts/native-trial.json`.

Live literature research found classical row-order compression ancestry and stable local consistency work. Deeper individual math audits distinguished actual ETH CI steps from a skipped newest run, found generating-rate assumptions in Axiom's transitive predicate, and observed DeepMind's computational comparator disables nanoda. Raw ETH CI log retrieval failed at the redirected host. No Lean/comparator replay or exhaustive all-lab proof audit occurred. Details in `research.md`.

## Artifacts / reproduction

Existing package lock retained; `npm ci --ignore-scripts`. Build harnesses with installed esbuild `--bundle --platform=node --format=esm`. `frontier.ts` reruns29 canonical sources; `probe.ts` and `parent.ts` accept a baseline JSONL path; `heldout.ts` uses frozen policy. `coldread.py` independently parses the wire contract; `verify_frontier.py` reuses the established independent parent reader. `final_gate.ts` uses reference tokenizer. `build-speed.sh` safely applies/reverses the hash patch; `hash_unit.ts` and `speed.ts` are experimental-bundle entrypoints. Run timing only after other benchmark jobs exit. `summarize.py` asserts29 baseline messages identical before summarizing.

`REVIEW.md` contains the formal domain, H+/H−/H∂ thresholds,20 false-solution shapes,8 mechanism-distinct artifacts/controls, adversarial tests and repaired gates. `receipts/novelty-index.json` indexes368 omega TS files; index/targeted review is not exhaustive semantic novelty certification.

Next highest-information codec gate remains the real blind native trial on the frozen prior winners. EUTAXIA's paid sorting contract and disrupted parent opportunities defeated this bounded experiment; do not label that an impossibility theorem or ship it as a winner.
