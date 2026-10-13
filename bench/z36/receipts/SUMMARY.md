# Z36 receipts (o200k one-chat tokens; every row byte-exact through the shipped decoder unless noted)

## 1. VERITAS-K (new encoder, VXR wire) vs VERITAS-R vs DAEDALUS, the 40 corpus files still on disk
Source: `vxk-final-40.jsonl` (shipped `veritasKEncode`, decode via `veritasRDecode`, 40/40 exact).
The 111 "fresh" docs (`/home/user/z31/docs`) and 4 other receipt files are NOT on disk in this sandbox; 151-file
totals cannot be re-measured here. DAE numbers are from `bench/z33/receipts/daedalus-151.jsonl`.

| lane | n | VXR | VXK | DAE | VXK vs DAE | VXR vs DAE |
|---|---|---|---|---|---|---|
| code | 4 | 3487 | 3279 | 3065 | +6.98% | +13.77% |
| ops | 11 | 18423 | 18186 | 16689 | +8.97% | +10.39% |
| ops_real | 10 | 12429 | 12356 | 10860 | +13.78% | +14.45% |
| prose | 6 | 4367 | 4327 | 4234 | +2.20% | +3.14% |
| realjson | 3 | 3790 | 3513 | 3395 | +3.48% | +11.63% |
| wrapped_docs | 6 | 38556 | 38448 | 35324 | +8.84% | +9.15% |

VXK is smaller than VXR on every file where the wide search ran (32 of 40 files, <=16000 chars). VXK < DAE on 1 file
(code-dts.txt, 103 vs 108). VXK is NOT Pareto-superior to DAEDALUS in any lane.

## 2. Search-budget ablation (`budget-ablation.jsonl`, shipped encoder with explicit options)
| file | default | kImprove=30 | maxTrials=3000 | kImprove=100+maxTrials=3000+refine=40000 | DAE |
|---|---|---|---|---|---|
| readme | 706 | 705 | 706 | 696 | 688 |
| npm-ls | 1232 | 1152 | 1232 | 1129 | 1001 |
| gh-api | 1384 | 1326 | 1383 | 1238 | 1153 |
| ls-full-iso | 472 | 448 | 472 | 440 | 413 |
Finding: the per-step choice width (kImprove) is the knob that matters; trial cap alone does nothing.
Cost: wide search is about 8 s per kilobyte here (linux-changes 15 KB: 129 s), hence the 16000-char gate.

## 3. Negative results (not codecs)
- Line-prefix delta (`lpd-probe.ts`, markers + VXR): git-numstat 2192 -> 2075, npm-ls 1232 -> 1340, openstack 1201 -> 1202,
  find-listing 1360 -> 1360, readme 706 -> 701. Mixed; markers cost about what the dictionary already saves. Rejected.
- Canonical JSON minification (`json-canon-probe.ts`): json-pkg (4-space indent, not 2-space canonical) pretty VXR 809 ->
  minified VXR 756, still above DAE 743. Gain is real but does not reach the frontier. Rejected as a standalone.
- Whitespace share of o200k tokens (`measure-composition.ts`): JSON/code 9-10%; ops logs 38-40% digit tokens.
- PR #13 ASTRAEA-A2 (straight-line grammar, Greek/Cyrillic glyphs; extracted from `gh pr diff 13`, not committed):
  readme 749, gh-prose 1884, license 1092, npm-ls 2318, gh-api 2232 (all exact). Worse than VXR on every file tested. Rejected.

## 4. Verification run on this commit
- `tsc --noEmit -p .` exit 0.
- VXR default path unchanged after refactor: readme 706, npm-ls 1232, ls-full-iso 472, gh-prose 1853 (`default-check.ts`).
- `vxk-edge.ts` (VXK entry point): 421 cases, 0 failures.
- `vxk-final-40.jsonl`: 40/40 exact through the shipped decoder.

## 5. Live web searches (2026-10-12)
- Grammar-compression approximation bounds (Re-Pair, Greedy, LZ78, BiSection): Siegen dissertation on grammar-based compression
  (https://www.eti.uni-siegen.de/ti/veroeffentlichungen/thesis-online-version.pdf); "Improvements on Re-Pair Grammar Compressor"
  (2017, researchgate listing: https://www.researchgate.net/publication/316904026_Improvements_on_Re-Pair_Grammar_Compressor).
  Relevance: Re-Pair is the frontier family; the bounds are worst-case, not a practical gain.
- LZSE, arXiv 2506.20107 (2025): greedy LZSE factorization; converting a Re-Pair grammar to LZSE plus zeroth-order entropy
  coding beats Re-Pair alone. Entropy coding is not LLM-readable, so the factorization idea is the only transferable part, and
  it is not implemented here.
- OpenAI "Astra" ten proofs (announced 2026-08-01; secondary coverage: techtimes, developersdigest, explainx, qz): Lean 4 certificates
  claimed for ten results (sphere packing, binary/spherical codes, non-sofic groups, Connes rigidity, permanent circuits,
  quantum parallel repetition, CVP hardness, Ehrhart volume, multicolor Ramsey / Erdos 183, Erdos 146/180).
  NOT verified here: Lean is not installed in this sandbox and I did not clone the certificate repository.
  None of the ten is a compression result. The two coding-theory results (sphere-packing and binary/spherical code bounds) are
  about code size bounds, not lossless compression of text. Per secondary sources, none has finished peer review.
