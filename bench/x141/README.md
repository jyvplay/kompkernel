# X141 — MNEMA lexical-history experiment

**Status: no verified Pareto winner; do not merge.** New codec implementation exists but is unwired. User's positive-winner requirement remains unmet. Native LLM reading was not run and cannot be replaced by a software inverse.

## Completed codec results

| Test | Priced candidates | Frontier wins |
|---|---:|---:|
| MNEMA standalone, canonical | 42 | 0 |
| MNEMA preconditioned full shipped parent | 17 | 0 |
| Frozen documentation standalone | 6 | 0 |
| Frozen documentation full-parent composition | 4 | 0 |
| Interior dictionary controls | 45 | 0 |

Canonical standalone best gap remains +67 tokens against frontier; full-parent best gap +32. Raw savings (e.g. ls-l up to290) do not beat the parent and are not called wins. Documentation parents cost486(TypeScript) and728(pg); best composed candidates547/794. Frozen versions, source hashes and first100-line selection policy are in `receipts/heldout-policy.json`. Both source README files fit that policy.

Fresh shipped frontier completed exit0: **29 lanes / 11,962 tokens**, every message identical to X140. Aggregate elapsed encode time1,207,071ms; jobs ran concurrently, so this does not measure speedup. Updated per-source and category token leaders are in `receipts/leaders.json`.

Highest-information inherited EIKON followup: census of long transformed phrase families on29 canonical sources plus2 frozen documentation sources found **zero pairs** under its3–16-word,24–400-character, no-newline search. This is a bounded negative result, not an impossibility proof.

## Verification

* MNEMA unit harness:16,392 checks;8 explicit mechanics fixtures.
* Independent Python chronological reader:65 emitted messages byte-exact plus8 fixtures;4 parent-composition events unsupported, not counted as independent successes.
* Independent frontier reader:22 exact out of31 canonical+heldout events;9 unsupported.
* Independent interior reader:45 emitted messages byte-exact.
* Final reference tokenizer gate:145 complete-message prices,22 shared-reader source comparisons.
* TypeScript no-emit typecheck and git whitespace check passed.
* Native model reconstruction: **NOT RUN**. Proof kernel/comparator replay: **NOT RUN**.

The encoder's source assertions and independent reader coverage are deliberately reported separately. No claim of universal byte-string coverage: this implementation works over its bounded JS-string domain and refuses literal caret.

## Mechanism and novelty

`^p` names the latest decoded ASCII word starting with p. Every decoded word, including a copy, updates history. No cross-message dictionary, symbol binding or external codebook. The planner greedily proposes local-neighbor token savings, then charges the full message. Full-parent tests encode the folded source with shipped TAGSTACK, pay composition instructions, and invert in reverse order.

Adaptive word dictionaries/prefix addressing/recency have classical ancestry. Repository index covers366 omega TS files; targeted near-neighbor code inspection is not exhaustive semantic novelty certification. `receipts/novelty-index.json` and source hashes make its limits explicit.

## Acceleration experiment

Separate candidate: ASCII decimal-only token count ceil(length/3), guarded against all other strings, for the two installed tokenizers. Exhaustive short vocabulary checks plus long-string/adversarial/corpus checks total28,406 assertions. Not a new codec and rejected as a production optimization on this evidence.

`build-speed.sh` applies `decimal-experiment.patch` only to build bundles, then reverses it. Production `bpe.ts` is unchanged. Isolated full-stack ABBA/BAAB completed24 measurements, all messages and sources identical. B/A total-time ratios: KB1.0313, ps-real1.0053, metrics1.0287 — no demonstrated speedup. Results are in `receipts/speed.jsonl` and `receipts/speed-summary.json`. Warmup is unmeasured, each arm resets caches equally, all emitted messages and reconstructed sources must match. No concurrent codec benchmark remained when this experiment started.

## Reproduction and boundaries

Install existing lockfile with npm ci; build TS harnesses using installed esbuild with `--bundle --platform=node --format=esm`; run frontier, probe, parent, unit, image_census, heldout and independent Python scripts. Parent/probe/census accept an alternate baseline JSONL path. `coldread.py` must run after all candidate jobs exit, not against partial files. Build decimal harness via `bash bench/x141/build-speed.sh`; run its unit before isolated speed. Keep generated bundles ignored.

`REVIEW.md` contains A–J gates,20 false-solution shapes,7 approaches, structural attackers and repaired gates. `research.md` gives fresh primary-source inspections and scoped mathematical checks, including a green CI run whose verification job was skipped. No blanket validation of lab mathematics is claimed.

Next highest-information behavioral test remains a real blind single-message native reconstruction trial on prior KREMA/PTYCHE token-winning frozen cases. More unverified niche token savings cannot discharge that gate. PR74 remains draft/open; no merge is justified by X141.
