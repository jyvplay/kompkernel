# X142 research and bounded verification — 2026-11-14

Executed: live search, primary-page retrieval, GitHub API retrieval, source inspection, Node/TypeScript and Python tests. No independent agent, model API, expert panel, theorem prover or simulator was executed. `lean` and `lake` were not on PATH. Exhaustive evaluation of ALL frontier-lab mathematical claims was not accomplished. Later-dated results returned by search are excluded as contemporaneous evidence.

## Compression sources and exact applicability

1. Lemire, Kaser, Aouiche, *Sorting improves word-aligned bitmap indexes*, DKE69(1),3–28 (2010), DOI10.1016/j.datak.2009.08.006. Fresh author-site fetch: https://lemire.me/en/publication/dke2010/ . Bitmap/WAH run-length operations, row-order sensitivity, measured index-size/speed tradeoffs. Does not establish source-order recovery or native BPE-message improvement. Gives classical ancestry for clustering, not originality credit.
2. Lemire, Kaser, Gutarra, *Reordering Rows for Better Compression: Beyond the Lexicographic Order*, TODS37(3),Article20 (2012), https://arxiv.org/abs/1207.2189 , DOI10.1145/2338626.2338633. Abstract and metadata fetched; full proof not audited. Multiple Lists/Nearest Neighbor and Vortex distinguish fewer runs from longer runs. Reported 10%-optimality applies only to specified cases, not arbitrary text or our three orders. A repository search-result page supplied a conflicting DOI ending2338627; primary arXiv/ACM agree2338633, which is used here.
3. Díaz-Domínguez, *Efficient Terabyte-Scale Text Compression via Stable Local Consistency and Parallel Grammar Processing*, SEA2025, DOI10.4230/LIPIcs.SEA.2025.14. https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.SEA.2025.14 fetched abstract/metadata. Stable cores have equal topology across independently parsed occurrences, permitting grammar merge with a common hash regime. This does not imply that arbitrary independently optimized BPE-cost grammars merge without changing output/cost. No parallel grammar implementation or benchmark from this paper was run here.
4. *Frequency-Ordered Tokenization for Better Text Compression*, [1](https://arxiv.org/pdf/2602.22958), search excerpt only. Frozen vocabulary/rank table and byte coding are access resources; encoder-side IDs cannot be assumed readable from an ordinary chat. Claimed LZ improvements cannot be imported as a chat-token bound.
5. *The Functionalizer*, [4](https://arxiv.org/html/2609.15991), search excerpt only; metadata date discrepancy left unresolved. Opcode factorization concerns vocabulary sharing and trained models, with sequence expansion reported, not a native lossless token-gain theorem. Not used as established evidence.

New search terms included reversible morphological preprocessing, stable local consistency, edit-sensitive parsing, row clustering, and restoration of sorted order. Author site, ACM, TELUQ and DBLP were queried alongside primary repositories. Searches diversify sources; they cannot certify that no prior repository turn ever cited a website.

## A corrected exclusion, not a new general theorem

ANASTROPHE's header excludes sorting because an arbitrary permutation requires O(n log n) description. That is a worst-case statement, not a reason to exclude all sorted-source domains. For pairwise distinct in-band keys, source already sorted by a declared total order, any permutation of the same intact lines is inverted by sorting. EUTAXIA checks exactly these hypotheses. No key uniqueness means no free inverse: `01 a` and `1 b` collide numerically and are rejected. ASCII ordinal comparison, integer arithmetic up to30 digits, line-range and final-newline preservation are specified. This is not entropy creation: the sorted-source domain restricts admissible order.

## Individual lab followups

### Anthropic ETH
X141's newest green workflow had a skipped verify job. Fresh older run40442388505, commit16a5ce41304fcdaea4e0be7c132e1c361dc26da5, reports `verify (eth)` successful: `lake build (no sorry outside the comparator challenge files)` and `Palomar bar (comparator accepts every declared configuration)` steps. `receipts/anthropic-eth-jobs.json` preserves that distinction. It is materially stronger vendor metadata than change detection, still not local replay or semantic validation of input/cost definitions. Attempting `gh run view --log` failed EOF on the redirected results-receiver.actions.githubusercontent.com host; raw logs were NOT inspected. Failure preserved in `anthropic-log-access.json`. No unsupported 'independently verified ETH' claim.

### OpenAI ETH
Fresh `lean/docs/378.md` gives fixed k≥2, canonical k-CNF encoding of bit-length L, deterministic exact counting in (L+1)^O_k(1)·2^O_k(n(loglog n)^2/sqrt(log n)), polynomial visited-tape-cell bound at every step. Manuscript sharper bound has one loglog, and bounded clause density improves it further. Those are distinct quantitative claims. No local kernel replay, canonical-input correspondence audit or runtime implementation was completed. None supplies a practical optimizer for this codec.

### Axiom Lyons–White
Fresh transitive `Lyons/Objective/RateMonotonic.lean`, beyond X141 challenge. Predicate quantifies two nonnegative inversion-symmetric rate functions, BOTH generating supports, pointwise lam≤mu, then all t≥0. Identity rate is discarded via `toRateFn`. Distance is finite sum of |heatCoeffReal−1/|G||^p raised to1/p. Thus the challenge's even-exponent statement is not about arbitrary signed/directed/nongenerating processes without conditions. Heat-kernel construction and all solution proofs remain unverified here. Next semantic gate: inspect heatCoeffReal and the transport to the paper's walk; then comparator replay.

### Google DeepMind compiled Signal
Fresh computational comparator config names eight theorem targets, permits propext/Quot.sound/Classical.choice, and explicitly has `enable_nanoda:false`. Do not infer an alternate-kernel check from the existence of a comparator. Prior README scope remains CLI harness, AArch64 and hooked primitives; binary pin, hook assumptions and transitive definitions are distinct gates. No build was run.

### doubleAI, Yang–Mills and remaining prior claims
X141's girth-bound arithmetic check remains bounded evidence; no new kernel execution and no full geometric/group proof validation. Yang–Mills existence does not automatically imply mass gap or all gauge-field axioms; news endorsements do not fill that interface. Prior PSI/3SUM–APSP/Erdős scope reservations remain. A search result dated November17 is excluded under the November14 session date. This is a selective deeper audit, not exhaustive verification of all lab mathematics.
