# X143 — PROTASIS conditional case residuals

**No verified Pareto-superior codec established. Do not merge on this evidence.** New repository code and reproducible tests exist, but the requested advantageous native-readable codec remains unmet. No native-model execution or theorem-prover replay occurred.

## Codec implementation

`src/lib/omega/protasis.ts` introduces PROTASIS (condition): a finite-state capitalization predictor with explicit lowercase exceptions. Two fixed models predict a single letter at sentence-like or line boundaries, rather than encoding STENTOR's uppercase spans or MORPH's dictionary-case variants. The source spelling is reconstructed, not linguistically corrected. ASCII case conversion only; spaces, tabs, CR and LF precisely specified. Tilde collisions refuse transformation. A standalone encoder/decoder has identity fallback and reserves its envelope namespace to prevent raw/encoded ambiguity.

This is a new bounded repository implementation in the classical predictive-residual family. It is not a new mathematical primitive, and the369-file inventory/targeted inspection does not prove exhaustive semantic novelty.

## Completed codec experiments

Fresh shipped frontier: **29 lanes /11,962 tokens**, every message identical to X142. Aggregate elapsed encode time1,228,636ms under concurrency is not causal speed evidence. Category leaders remain PROSE3,429; OPS/TABULAR5,580; CODE/STRUCT2,636; OTHER317. Full per-source/class breakdown is in `receipts/leaders.json`.

| Arm | Priced | Frontier wins |
|---|---:|---:|
| Canonical standalone |24|0|
| Canonical full-parent composition |5|0|
| Frozen documentation standalone |4|0|
| Frozen documentation composed |0|not eligible under fixed policy|

Parent policy: choose cheapest standalone model with at least8 changed letters and no more exceptions than changes; rank by changes minus exceptions; at most8 sources. Only5 canonical sources qualify. This was fixed before outcomes; no source-name fitting.

Final repaired-contract full-parent results: ps-aux980→1031, prices118→173, KB620→676, LLM prose664→718, email486→544. **Even ignoring the additional PROTASIS header, observed parent payload savings are at most6 tokens.** This is evidence against spending another turn merely shortening the header for this candidate, not a universal impossibility bound.

Frozen pg-pool3.14.0 and React19.2.6 README extracts were hashed before pricing. Parents588/252; best standalone candidates743/309. Both miss the composed-admission threshold. Real source bytes and selection policy are in `receipts/heldout-policy.json`.

## Verification and repairs

* 20,054 unit checks,19 mechanics fixtures. Stress-generated tests are not workload-gain evidence.
* Independent Python regex-based wire reader:32 messages exact,19 fixtures exact; prices.csv composed parent unsupported, not counted as a pass.
* Cap repair: exception insertion can expand an admissible source beyond50,000 units; now that arm refuses. New49,998-unit lowercase-line attack plus a final uppercase line exercises it.
* Envelope repair: raw input beginning with a reserved contract refuses standalone encoding, preventing raw/encoded wire collision. New attacks exercise both headers and literal-tilde fallback.
* Initial cap/envelope repair replay:111 assertions showed the earlier candidate representations unchanged. A later clarification to “LF-separated line” changed the email model selection from line to sentence. The cheap-repricing guard rejected reuse; all5 canonical parent trials and the heldout admission pass were rerun. Historical receipts remain in `*-before-lf-clarification.jsonl`; `lf-clarification.json` records the detected model change.
* Independent frontier reader:23/31 canonical+heldout messages supported,8 unsupported. Final tokenizer gate:66 complete-message prices. All31 source files passed explicit valid-UTF8 byte roundtrip checks. TypeScript no-emit check passed.
* Native gate: **NOT RUN**. Frozen X142 PTYCHE/KREMA packets remain hash-identical; no external model endpoint was invoked. This agent's source knowledge precludes an independent blind self-test.

## Speed experiment

Experimental `tail-experiment.patch` removes the temporary per-chunk token-count array from `tokenTail`, partitioning counting at the last non-whitespace chunk. Chunk calls, sum and returned tail object remain unchanged. It does not reduce search effort or change the tokenizer. Build script applies the patch for isolated bundles and reverses it immediately.

Differential gate:18,563 distinct strings ×2 encodings,111,378 assertions comparing full TailInfo objects and reference counts, including Unicode/surrogates, BOM, whitespace and cache/mode transitions. Whole-stack timing completed24 isolated ABBA/BAAB measurements, preserving all messages and reconstructed sources. B/A total-time ratios: KB0.9491, ps-real1.0420, metrics1.0063; median ratios0.9626/1.0594/1.0039. The mixed result does not establish broad acceleration or Pareto superiority. **Deployment rejected; hook remains removed.** Exact samples are in `receipts/speed-summary.json`.

## Research and next test

Fresh primary sources include LREC2020 casing comparison and Gleave's2016 Unicode-compression thesis. Neither proves frozen-tokenizer/native-chat superiority. Deeper pinned OpenAI SAT encoding audit gives an explicit polynomial length bound with2,066 finite arithmetic checks, not proof replay. Axiom heat-function definitions were traced to matrix exponential and the real/complex interface. A current DeepMind trusted-base page could not be pinned before the November14 cutoff and is not accepted as contemporaneous evidence. No exhaustive all-lab proof verification is claimed.

Next highest-information codec gate remains the real native trial on frozen prior token winners. For PROTASIS, measured parent-payload gains≤6 already undermine the desired>10 target before adding its instruction cost. Do not substitute unpriced semantic casing or retrained tokenizers.

## Reproduce

Use installed lockfile dependencies, esbuild `--bundle --platform=node --format=esm`, then run `frontier.ts`, `probe.ts`, `parent.ts`, `heldout.ts`, `unit.ts`, `repair_gate.ts`, Python `coldread.py`, `encoding_audit.py`, and final gates. Parent/probe accept a baseline JSONL path. Use `bash bench/x143/build-speed.sh` before tail_unit/speed bundles; time only after other benchmark jobs exit. Manifests unchanged. `REVIEW.md` holds A–J,20 false-solution shapes and8 mechanism-distinct controls/artifacts; `research.md` records exact source scope and provenance.
