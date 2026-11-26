# C / H. Fresh research and verification ledger

Session cutoff: 2026-11-14 UTC. Retrieval services and GitHub may return later-dated content or inconsistent metadata. Such content is not treated as established by the cutoff. No exhaustive all-lab/all-proof audit was possible. No Lean/lake executable was found; no kernel, comparator, ZK system or external expert was run.

## Compression literature: past five years

Fresh terms: “shortest superstring greedy approximation overlap cycle cover strings 2023 2024”; “string compression run length attractors bidirectional macro schemes 2024 2025”.

**Englert, Matsakis, Veselý (2023)**, *Approximation Guarantees for Shortest Superstrings: Simpler and Better*, DOI10.4230/LIPIcs.ISAAC.2023.29. Newly retrieved university repository URL:
https://wrap.warwick.ac.uk/id/eprint/180000/7/WRAP-Approximation-guarantees-shortest-superstrings-simpler-better-2023.pdf . First of9 parsed chunks read, not the complete proof. Given a finite set of strings over a fixed alphabet, after removing contained strings, ordinary maximum-overlap GREEDY has stated symbol-length approximation ≤(sqrt(67)+2)/3≈3.396. A distinct construction combining greedy and Max-ATSP has stated ratio≈2.466. The paper states APX-hardness (under P≠NP no arbitrarily close general polynomial approximation). Those facts do not provide a native decoder, a paid-token bound or a theorem for capped DESMI merges. The university URL did not appear in the searched tracked markdown/Python files; absence of a grep match is not proof nobody previously read the site.

**Chukhin et al. (2026)**, https://arxiv.org/abs/2609.27921 . Abstract fetched, not full proof. Reports7/3 approximation and greedy upper bound3 via an optimum cycle-cover inequality. Already referenced in X44/X51/Z13: not new to this stack. Do not call2023 bounds the latest unqualified bounds after seeing this claim, nor treat a preprint abstract as independently verified.

**Badkobeh, Bannai, Köppl (2024)**, https://arxiv.org/abs/2406.16475 . Search-level lead on BBWT runs and macro schemes; this is adjacent to existing KYKLOGRAF/BWT work, not a new codec idea here. No theorem imported.

## Individually investigated labs

### OpenAI — deeper check of previously called-out superstring claim
A live GitHub tree query led to `ComparatorChallenges/Superstring.lean` and its JSON. The tree query alone did not expose the solution; following the JSON's `solution_module` directly retrieved `OAI/Computability/Superstring/Main.lean`. Exact commits and SHA256s are in `receipts/superstring-source.json`.

The challenge contains `sorry`: it is the target statement, **not evidence the solution contains a hole**. The separately retrieved Main defines `answer := Executable.solve`, derives polynomial implementation via `RunsInPolyTime.certificate answer_poly`, and proves its main conjunction using `Executable.solve_spec` and `weight_le_opt_with`. Its target quantifies one function over every explicitly encoded finite string instance, requires contiguous coverage, finite stack alphabets and polynomial bit-machine time, but measures approximation in symbol length. This is more specific than a vague “two approximation” headline. The imported WalkOutput/Executable proof graph and compiler/kernel were not replayed; Main alone cannot establish trust in the transitive proof or provide a DESMI token bound. DESMI does not implement this solve function.

29 earlier-manifest proof/interface artifacts were freshly downloaded across labs, with hashes, errors and kernel NOT_RUN statuses. Reusing manifests is not29 new findings. Those sources include prior SAT/ETH, CNF, zeta and ZK interfaces; none are claimed validated merely by retrieval.

### Anthropic — RH versus lower bounds
Freshly fetched https://www.anthropic.com/research/riemann-zeta explicitly says the attempted full RH proof did not succeed, and reports a41.6%→67.2% lower bound. It describes a quadratic form with positive/negative subspaces and rank bounds from moments; this does not establish all zeros on the line, and no concrete compression reduction is supplied. The zeta challenge/AUDIT/comparator files were freshly pinned via the reused source manifest. Their claims were not locally kernel-checked. A secondary full-RH headline and later-dated PDF search metadata do not override this primary scope.

### doubleAI — high-girth construction
Fresh primary page: https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory . It claims, for every prime power q, explicit infinitely many(q³+1)-regular graphs with girth≥(8/5)log_(q³)n−O(1), using division algebra/congruence quotients; it cites a determinant certificate. Paper retrieval at https://www.doubleai.com/papers/girth85.pdf **failed**; Lean zip not executed. This is not a verified universal graph theorem here. Error-correcting-code relevance is not an automatic lossless compression gain: coding redundancy and compression are different objectives. Prior pinned double-check and double-zkp-ecc source interfaces remain unverified locally.

### Google DeepMind / Gemini
Fresh search of the primary AlphaProof page https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/ describes formal Lean search and autoformalization. Prior Nexus-related artifacts are included in the pinned retrieval ledger. No new research theorem was independently verified, and formalized statement fidelity remains distinct from kernel success.

### Harmonic
Fresh searches returned Aristotle UI/workflow and weaker Erdős-result reports, mainly secondary. No new primary proof artifact was replayed. Do not equate a benchmark or formalization of a weaker statement with the original conjecture.

### ByteDance
Fresh primary search: https://seed.bytedance.com/en/blog/seed-prover-1-5-advanced-mathematical-reasoning-through-a-novel-agentic-architecture . Reported agentic lemma verification and competition results are methodological leads; no proof replay or new compression theorem established here.

### xAI
Fresh searches returned secondary claims about hypercontractivity/graph counterexamples, not a locally reproduced primary certificate. These remain unverified leads and are not used as codec premises.

## Open interface
Even an independently certified optimal reservoir in characters leaves interval addresses, alias occurrences, JSON escaping, instruction tokens, parent recompression and model behavior unbounded. This is the exact gap tested by the paid experiment. Neither RH, high girth nor symbol-length superstring approximation closes it. The strongest next proof-related action is a pinned full dependency/kernel/statement-correspondence audit, not another headline citation. The strongest next codec action is a parent-residual cost test with an admissible native handoff.
