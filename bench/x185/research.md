# X185 research ledger — bounded investigation, not proof certification

Session date: 2026-11-14 UTC. Some returned pages and repository revisions contain later dates; those cannot be treated as established results as of this cutoff. Search metadata is inconsistent. No claim below relies on those later-dated announcements. The continuation memory's proposed November 25 date correction is not adopted.

## Compression, past five years

- Patrick Dinklage, *Computing the LZ-End parsing: Easy to implement and practically efficient* (2024), https://arxiv.org/abs/2409.07840 . PDF first chunk inspected; https://github.com/pdinklag/lzend README freshly retrieved and commit/hash pinned in `receipts/lzend-source.json`. Lazy evaluation and removing indirection motivate implementation experiments, not a new compression theorem. The reference is a parser, not a serialized compressed format or decoder. PERAS does not implement its algorithm or inherit its O(n log log n) bound.
- Bannai et al., *Optimal LZ-End Parsing Is Hard* (2023), https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.CPM.2023.3 . First page retrieved; minimum phrase decision hardness does not imply hardness of this particular paid-BPE search or rule out useful heuristics. **Already cited in X120/X165**, so this is not a fresh discovery. `prior-source-matches.txt` records the duplicate check.
- LZBE (2025), https://arxiv.org/html/2506.20107 : search-level lead only. Boundary restrictions/random access merit investigation; no approximation conjecture promoted to theorem.
- Fresh searches included LZ-End implementation/approximation 2024–2025 and author bibliographies on DBLP. A Tokyo algorithm group blog fetch failed; no credit for reading it. This is not exhaustive literature coverage or proof of all-stack novelty.

## Individual labs and verification boundaries

Fresh live searches covered OpenAI mathematical formalization corrections, Anthropic zeta, doubleAI verification, DeepMind Nexus, Harmonic Aristotle and ByteDance Seed. `research-fetch.py` and `research-followup.py` retrieved 29 pinned artifacts; receipts name exact commits, paths, bytes and hashes. These reuse prior retrieval manifests: fresh downloads are not 29 new research findings. Source bytes are in ignored `.cache/x185/research`, reproducible from pinned commits.

| Lab | Inspected evidence / lead | What remains unverified |
|---|---|---|
| OpenAI | https://openai.com/index/sharing-ai-progress-in-mathematics/; pinned `openai/math` statement/computation artifacts | Lean kernel, assumptions, statement-to-paper correspondence; later November entries excluded from cutoff conclusions |
| Anthropic | https://www.anthropic.com/research/riemann-zeta; pinned zeta Challenge/AUDIT/comparator; formal-math statement definitions | Reported 41.6%→67.2% lower bound is **not RH**; no local Lean replay or full RH proof validation |
| doubleAI | pinned double-check CNF and double-zkp-ecc README | Testing sampled inputs does not establish universal circuit correctness; no ZK verification replay |
| Google DeepMind | https://arxiv.org/html/2605.22763v1 Nexus search result and pinned artifacts in retrieval ledger | Author-reported formal proofs are not independently kernel-replayed here |
| Harmonic | https://www.harmonic.fun/about/ live search | Product/milestone claims; no proof artifact replay, and Nov25 secondary report not usable at cutoff |
| ByteDance | https://seed.bytedance.com/en/public_papers/seed-prover-deep-and-broad-reasoning-for-automated-theorem-proving and https://arxiv.org/pdf/2507.23726 search results | Benchmark claims rather than an audit of research proofs; no kernel replay |

We did not investigate every lab or independently establish their mathematical claims. Neither this assistant nor the Python reader is an external reviewer. No paid native-chat endpoint, external agent, Lean kernel or ZK verifier was executed. Lessons applied here: separate source statement, executable inverse, behavior, cost and empirical generalization; failed gates cannot be repaired by renaming them.
