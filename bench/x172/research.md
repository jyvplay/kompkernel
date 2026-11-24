# X172 research ledger — 2026-11-14 task date

No independent agents, theorem kernels, model-training jobs, quantum simulators
or external model decoder were invoked. Node/npm, TypeScript/esbuild, Python,
git/gh, web search/fetch and process control are available. `lean`, `lake`,
`coqc` were absent. No connected-app databases were used. npm ci succeeded after
an initial bundle attempt failed because dependencies were absent. The tests
are executable finite experiments, not simulated model responses.

## New searches / imported results

Searches used tokenizer-aware reversible transforms, string attractors,
unique anchors, and formal proof subgoal verification, rather than treating
language plausibility as a decoding guarantee. New-to-this-turn sites included
ML Anthology, the University of Virginia course page and InfoQ. Novel-to-the-
entire-repository website coverage has not been exhaustively established.

* Zhang et al., L3TC, AAAI2025, DOI10.1609/AAAI.V39I12.33446.
  Retrieved https://mlanthology.org/aaai/2025/zhang2025aaai-l/ and searched
  [5](https://arxiv.org/html/2412.16642) . The abstract reports48% bit savings versus
  gzip using RWKV predictions plus entropy coding, outlier-aware tokenization
  and trained high-rank reparameterization. This requires a matching learned
  decoder and counts bits; neither native chat nor o200k token savings follows.
* Béal, Crochemore, Romana, Checking and producing word attractors,
  https://arxiv.org/html/2509.08503 , fetched introduction, v2 dated9Oct2026.
  An attractor is a set of positions intersecting at least one occurrence of
  every distinct nonempty factor. With DAWG and attributes already computed,
  verification is linear; DAWG construction is O(n) for fixed alphabets,
  O(n log|A|) for general ordered alphabets, or O(n) under the cited polynomial-
  size integer-alphabet model. Greedy construction is not minimum certification;
  constant-bounded attractor size gives a stated linear regime. ICHNOS is NOT
  this algorithm: unique word-fragment identification differs from substring
  coverage. `attractor.py` tests the difference with an explicit source collision.
* Kempa/Prezza string-attractor literature,2017/2018,
  [2](https://arxiv.org/abs/1709.05314) (search only). Small attractors relate to
  repetitive-string representations, not automatically to complete in-band
  natural-language contracts. No hardness theorem for this repository follows.
* DeepSeek-Prover-V2, [2](https://arxiv.org/abs/2504.21801) (2025, search only):
  trained Lean proof generation with subgoal decomposition and finite benchmark
  pass ratios. Those are not universal proof guarantees. InfoQ's report at
  [3](https://www.infoq.com/news/2025/05/deepseek-prover-v2-formal-proof/) raises
  implicit-sorry/evaluation concerns; this is a secondary warning, not our own
  reproduction. Transfer: inspect verifier outputs and final axioms, not just
  success status. No benchmark results were rerun here.
* University of Virginia's2026 survey surfaced Kimina, Goedel, Hunyuan and
  InternLM systems. They remain leads, not individually kernel-audited proofs:
  [1](https://www.cs.virginia.edu/~rmw7my/Courses/AgenticAISpring2026/Major%20Breakthroughs%20in%20Lean%204-Based%20Auto-Formalized%20Mathematics.html) .

## Individual lab artifact refresh

`research-fetch.py` downloaded five pinned primary GitHub files; full paths,
commits and hashes are in receipts/research-artifacts.json. Cached originals
can be refetched; no entire imported dependency tree was checked.

* **OpenAI:** followed X171 TerminalBounds one layer deeper to
  FixedPaperRatedTerminal.lean. `paperTerminalOfRated_exists` assumes
  `RatedBranchesAt`, field/templates, a finite model, canonical scans,
  geometry/clock bounds, conditions, cut and physical input. `finalRowFrame`
  transports a reached-state predicate over a lookup; it is not an independent
  existence proof for every required runtime resource. Remaining interface:
  discharge hypotheses and audit the final theorem/imports. No VP≠VNP or ETH
  headline is endorsed from this component.
* **Anthropic:** CountedToPadded/RunFor.lean was refetched. `fold_reaches`
  explicitly needs an existing bounded run, T<=fuel.length and7*S+2<=room.
  `runForPoly` uses polynomial step/init/output functions and encoded unary
  fuel/room; polynomial in padded input does not say polynomial in unpadded
  instance size. This sharpens X171's word-comparison inspection and supplies
  a resource-accounting warning, not an ETH proof certification.
* **Google DeepMind:** erdos_741.parts.i.lean refetched. The inspected
  SandorA fluctuation argument requires the stated disjoint partition,
  existing positive sumset densities and diverging subsequences. These
  assumptions cannot be generalized to arbitrary sets or to compressor gains.
* **Harmonic:** IMO2025P3.lean refetched. finite_S_constraint uses isBonza,
  finite S and nonempty S before deriving S={2}. No full proof replay.
* **ByteDance Seed:** P3.lean refetched. lte_2_3n_minus_1 requires positive
  integer n and branches on parity; it is not a statement at n=0 or the full
  Olympiad proof. No full proof replay.
* **DoubleAI:** primary research page fetched successfully:
  https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory .
  The page claims, for every prime power q, explicit infinite(q³+1)-regular
  families with girth >=(8/5)log_(q³)n−O(1). Its certificate needs det(w−I)
  nonzero for nontrivial congruence elements, fourth-power level divisibility
  and a displacement bound. The matching upper bound is for a specific28-
  regular family, not all regular graphs. The PDF fetch failed; Lean zip was
  not executed. A guessed GitHub organization endpoint returned404 and supplies
  no evidence. Transfer to compression is speculative: sparse collision graphs
  do not make reference ambiguity disappear for free.

Secondary2026 RH/FLT/Navier–Stokes/UGC claims surfaced again. One result was dated
Nov22, beyond the task date; it is excluded as current evidence. Other headlines
were not independently validated. We did not retrieve and verify ALL newly
solved math problems and do not claim exhaustive lab coverage. No imported
result closes the native-reader/token-price/runtime interface here.
