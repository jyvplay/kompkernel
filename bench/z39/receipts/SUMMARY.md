# Z39 receipt: VERITAS-P

Base commit: `276973c` (VERITAS-Q). Branch: `arena/da2b9818-kompkernel`.

## Verdict

- **Codec committed:** VERITAS-P (`src/lib/omega/veritas-p.ts`, registry key `veritas-p`). Byte-exact on 151/151 corpus files and 421/421 edge cases. Decode-gated and identity-guarded. Uses the same VXR wire, decoder (`veritasRDecode`), and VXQ legend (decode instruction counted) as VERITAS-Q.
- **Gate NOT MET.** VERITAS-P is not Pareto-superior to the frontier in any lane. It is +8.62% above min(DAEDALUS, A10) in total and −0.44% against VERITAS-Q. It does not beat the frontier by a large general margin in prose or hybrid prose.
- **LLM decodability: NOT TESTED.** No LLM endpoint was reachable from this sandbox. The kit generator (`make-kit-p.ts`) and scorer (`score.ts`) are committed, but no prompt has been sent to a model and no reply has been scored. No decodability claim is made.

## Corpus result (151 files, o200k, message tokens with instruction counted)

Source: `vxp-151.jsonl` (per file), `vxp-pareto-summary.json`, `vxp-pareto-rows.json`. Produced by `final-p-151.ts` (2 shards, `SHARD=i/2`) and `vxp-pareto.py`. Frontier = min(DAEDALUS z33, A10) per file.

| lane | n | VXP | frontier | VXP vs frontier | VXP vs VXQ | files < frontier |
|---|---|---|---|---|---|---|
| prose | 6 | 4,296 | 4,234 | +1.46% | +0.59% | 1 |
| fresh | 111 | 249,524 | 231,785 | +7.65% | −1.55% | 23 |
| wrapped_docs | 6 | 37,604 | 35,324 | +6.45% | −2.28% | 1 |
| code | 4 | 3,593 | 3,065 | +17.23% | +15.42% | 0 |
| ops | 11 | 20,068 | 16,689 | +20.25% | +11.08% | 0 |
| ops_real | 10 | 12,713 | 10,860 | +17.06% | +3.45% | 0 |
| realjson | 3 | 3,865 | 3,395 | +13.84% | +12.62% | 0 |
| **total** | **151** | **331,663** | **305,352** | **+8.62%** | **−0.44%** (VXQ 333,116) | **25** |

- Excluding DAEDALUS identity fallbacks (131 files): +9.59% vs frontier, −0.34% vs VXQ.
- Exact: 151/151. Raw identity fallback: 19 files.
- Runtime: the summed per-file compute is 10,218 s across two shards on a 2-vCPU sandbox. The largest file is `pino-10.4.0/docs/api.md` at 985 s (10,900 tokens; VXQ 11,503; frontier 9,802).

Where VXP is weaker than VXQ: JSON and ops (+3% to +12%) and code. The gap is structural to the search, not the trial budget. On `gh-api.json` (2,519 chars): 1,478 at 3,000 trials, 1,478 at 1,000, and 1,486 at 300. `anchorCap` 4,000 gives 1,492, `shortN` 3,000 gives 1,475, and `poolMax` 1,000 gives 1,478. None closes the gap to VXQ (1,177). VXP is still an open defect on these lanes.

Where VXP is stronger than VXQ: long prose and docs (winston README 7,177 vs 7,449; `fast-glob` README 5,371 vs 5,709; `commander` 8,512 vs 8,934; `pino transports.md` 8,388 vs 8,717). The 151-file corpus shows that this does not extend to the lanes that dominate the total.

## Probe results (earlier, same code version unless noted)

- readme 682 (VXQ 683), license 1,018 (1,018), gh-prose 1,847 (1,821). All exact. Earlier readme probe: 681.
- Winston README (8,987 in-tokens): cap 240, 3,000 trials, 7,177, 517 s. 1,000 trials, 7,177, 529 s. Cap 4,000 (pre-rewrite code), 7,134, 636 s. The cap-4000 gain is 0.6% for about 23% more runtime.
- Refinement rewrite (exact acceptance on whole wire, estimate used for ranking): readme 9.0 s → 5.3 s; license 41.7 s → 30.7 s.
- Symbol-count acceptance (`model: 'symbol'`): negative. Winston reached 10,344 at step 336. Exact acceptance is required.
- DP token-aligned re-parse with a fixed rule set: negative (readme 774 vs 691, gh-prose 1,984 vs 1,863, license 1,089 vs 1,036).
- Header share: 10.6% (readme) and 9.3% (gh-prose). In-place definitions save at most about 2%.
- OBLIVION-O1 with inlined rules (from PR #2): readme 822, gh-prose 2,002, license 1,188. Dominated. Not admitted.
- Edge suite re-run on the final code: 421/421 (`vxp-edge-rerun.txt`).
- `tsc --noEmit`: clean.

## Corrections to earlier notes

- `final-p-151.ts` uses `veritasRDecode`, which is correct. Both `veritasRDecode` and `veritasADecode` decode the VXR wire with the Q legend, verified on readme and license. The earlier note calling `veritasRDecode` wrong was itself wrong.
- The 42 `sorry` in `openai/ten-proofs` are in `ComparatorChallenges/`. They are challenge statements for solvers. The ten main Lean files contain 0 `sorry`. These are the yaml's claims, not something checked here.

## OpenAI ten-proofs review (`openai/ten-proofs` @ `94bc0fe`)

Scope and limits: Lean 4 is not installed in this sandbox, so nothing was compiled or checked. I read the file headers and main-result declarations and checked the statements in the source. The yaml claims 0 `sorry` and standard axioms, which I did not verify.

| result | file | main declaration (from yaml / source) | relevance to lossless compression |
|---|---|---|---|
| 1 sphere packing (Cohn–Elkies) | SpherePacking.lean | `PackingBounds.sharpFullCohnElkiesManuscriptConclusions` | none directly; packing density is not a compression rate |
| 2 binary/spherical codes | MetricCodes.lean | `MetricCodes.Johnson.binaryRate_lt_mrrw` (strict improvement over MRRW for 0<d<1/2) | indirect: bounds information per symbol at a given Hamming distance. Relevant only if wires must tolerate symbol errors (e.g. an LLM copy error), not to the byte-exact rate |
| 3 non-sofic group | NonSoficGroup.lean | `SoficGroups.SourceTopLevelCompressionFinal.exists_finitelyPresented_nonsofic_group` | none |
| 4 Connes rigidity | ConnesRigidity.lean | `ConnesRigidity.exists_infinite_pairwise_nonisomorphic_propertyT_icc_groups_with_isomorphic_factors` | none |
| 5 permanent formula bounds | Permanent.lean | `PermanentFormulaLowerBound.permanent_rational_formula_logarithmic_lower_bound` (n ≥ 32) | circuit lower bound. It says some functions have no small formula. It gives no encoder |
| 6 quantum parallel repetition | QuantumParallelRepetition.lean | `QuantumParallelRepetition.distributionUniformExponential` | none |
| 7 gap-CVP | GapCVP.lean | `GapCVP.Comparator.gapCVP400IsNPHard` | hardness of lattice decoding. Not a compression tool |
| 8 Ehrhart volume | EhrhartVolumeInequality.lean | `Ehrhart.Volume.ehrhart_volume_inequality_for_sets` | none |
| 9 multicolor Ramsey | MulticolorTriangleRamsey.lean | `ErdosProblems.MulticolourTriangleRamsey.erdos_problem_183_explicit` | none |
| 10 compactness / degeneracy | CompactnessAndDegeneracy.lean | `CompactnessConjecture.quantitativeCompactnessCounterexample`, `TwoDegenerateGraphs.twoDegenerateExtremalCounterexample` | none |

Conclusion: none of the ten gives a compression lever. The closest is result 2, a bound on channel-code rate, which applies to robust encoding and not to byte-exact dictionary coding. It is not used.

## Rosetta (analysis only; not imported)

ROSETTA-R5.6 (`src/lib/omega/rosetta.ts`) has span systems for templated line families, arithmetic runs, character RLE, and a dual-spelling argmin. Z38 classified its known-form codebooks as fixture-specific. Its span ideas target the ops and structured-log lanes, where VXP is 11–20% behind the frontier. A general version would need evaluation on fresh structured data; that is not done here.

## Web sources (new terms; past 10 years; sites not used by existing codecs)

- arXiv 2609.32474 (PC-SubMax, prompt compression by submodular maximization). Lossy sentence selection. Its lazy greedy uses exact marginal evaluations, which matches the exact-delta idea.
- arXiv 2604.17512 (ONTO). Columnar schema-once notation, 46–51% fewer tokens than JSON on cl100k. Not byte-exact in the lossless sense.
- arXiv 2604.05865 (JTON). Tabular encoding, 15–60% vs JSON compact. JSON superset.
- arXiv 2605.29676 ("Notation Matters"). TOON/TRON on Qwen3-32B: −27% tokens for TRON. Accuracy moves 1 to 14 points by model, so format choice affects LLM accuracy.
- arXiv 2610.01127 (CNF-MCE). Min-cost segmentation beats BPE for a newly trained vocabulary. Not applicable to fixed o200k. It confirms that the count depends on the exact wire string.
- github.com/PDiTO/bpe-rs README. Merges do not cross pre-tokenization piece boundaries. This supports per-piece exact additivity as a ranking tool only: per-line sums are 3.1% above the full count on `api.md`.
- arXiv 2105.11052 (2021). AVL grammars from LZ77, about 2× Re-Pair size. Inside the 10-year window.
- arXiv 2602.04853, 2610.09033, 2506.14012, 2411.05345, and Nature Sci. Rep. s41598-025-29770-0. Robustness of LLMs to typos and substitutions. Context for the decodability question only. None tests dictionary-coded text.
- Earlier-session sources retained in the Z38 receipts. Das & Kempe (2011) and Mirzasoleiman et al. (2014–15) are outside the 10-year window and are not cited.

## What humans may be blind to (analysis)

- The optimization target should be the tokenizer's exact count, not an entropy proxy. The symbol-count model looked right and was wrong (accepted rules that raised the exact count). Exact acceptance is the difference.
- The decoder is a language model, so the wire can rely on in-context copy and definitions placed where the model reads them. The cost is that every legend token is paid. Z38 measured this at 15–23 tokens per file.
- Notation choice moves LLM accuracy as well as token counts ("Notation Matters"), so the byte count alone is not the right score for an LLM-readable codec.
- Speed: the search is 10¹–10³ s per file. Per-piece additivity (no merges across pre-token pieces) could support incremental counts, but per-line sums are not exact, so they can only rank candidates.

## Not done

- No LLM decodability test (no endpoint reachable). The kit generator is `bench/z39/make-kit-p.ts`, and no kit was generated.
- No Lean compilation of the OpenAI proofs.
- PR audit: 13 open PRs. Only PR #2 (STARLIGHT-S1) was inspected, which holds OBLIVION-O1, TERMINUS, CROWN, and CJK. #3, #4, #6, #7, #8, #11, #13, #17, #18, #20, #23, #26 are not audited. PR #26 is from this session's branch name. Its head equals this branch's `HEAD`, which is `276973c`, before my commit.
- The VXP JSON/ops regression (see above) is unresolved.
