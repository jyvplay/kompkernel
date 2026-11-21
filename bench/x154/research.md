# X154: live research and transfer audit

## What was actually available

Node, npm/esbuild, TypeScript, Python, git, authenticated gh, search and page
retrieval tools. `command -v lean lake` found neither. No theorem prover, independent
model endpoint, expert reviewer, external agent team, simulator or database was run.
Concurrent Node workers are processes, not independent research agents. Source
inspection is not kernel replay or semantic verification. The list below is a
bounded audit, **not ALL newly solved mathematics**.

## New search directions and twenty-year literature

Live queries included “lossless compression tokenizer preconditioning reversible
text transform BPE compression”, “succinct ordinal trees DFUDS degree sequence
2010 2014 compression preorder”, “OpenAI math 2026 half wave local smoothing proof
079 assumptions Lean”, and “doubleAI girth85 Lean proof independent review”.

1. *Succinct Trees in Practice* (Arroyuelo et al., ALENEX 2010),
   [1](https://users.dcc.uchile.cl/~darroyue/papers/alenex2010.pdf).
   Distinguishes balanced parentheses, depth-first unary degree sequences and
   level-order degree sequences; compares practical overhead and navigation time.
   This is direct prior art for replacing end events with node degrees. ARKESIS
   uses **decimal cardinalities in textual preorder**, not the paper's binary
   succinct structures. A bit-space bound for unlabeled ordinal trees excludes
   lexical JSON payload, whitespace, instructions and BPE pricing.
2. *On Succinct Representations of Binary Trees* (2014),
   [2](https://arxiv.org/pdf/1410.4963). Transforms binary to ordinal trees to support
   navigation and relates BP/DFUDS encodings. Imported only as mechanism ancestry;
   its operation bounds assume the stated succinct data structures and machine
   model, not an LLM counting JSON members.
3. *Ultra-succinct representation of ordered trees with applications* (2012),
   [5](https://research.polyu.edu.hk/en/publications/ultra-succinct-representation-of-ordered-trees-with-applications/).
   Tree degree entropy and compressed DFUDS; binary-internal-node specialization
   can use n+o(n) bits. This does not assert n textual tokens including labels or
   exact original formatting. Metadata/abstract inspected, implementation not run.
4. *Frequency-Ordered Tokenization for Better Text Compression* (2026),
   [4](https://arxiv.org/html/2602.22958). The currently returned revision reports
   BPE vocabulary segmentation, frequency renumbering, short byte codes and
   conventional LZ backends, including minimum-code-length segmentation. The
   earlier v1 search result [3](https://arxiv.org/html/2602.22958v1) reports different
   magnitudes; they are not interchangeable measurements. This is relevant to
   optimizing the **representation seen by the parent**, but replacing API token
   segmentation or requiring an external vocabulary/byte decompressor violates
   our basic-chat contract. No claimed paper speedup is assigned to our stack.

New domains inspected include users.dcc.uchile.cl, research.polyu.edu.hk and
mathcommunity.github.io. Search excerpts/abstracts are discovery evidence, not
independently reproduced results. No article is claimed to originate our hash
implementation; multiplicative hashing is classical.

## Repository audit

Searched module bodies and registry for arity, child counts, countdown, degree
sequence, prefix trees, quoted/bare JSON keys and layout. Examined GRAMMA,
KENOMA, KLADIOS, ROSETTA, EKDYSIS and MEKOS. ROSETTA already has flat KV JSON and
TOON-like rectangular arrays; quote removal alone would not be a credible new
mechanism. GRAMMA derives layout from brackets, KENOMA derives closing events
from layout, KLADIOS derives drawn-tree connectors from depth. ARKESIS stores
**container cardinalities**: both end markers and depth layout are absent from
its transformed payload, and exhausted child counts determine container ends.
That is a distinct repository representation among the inspected modules, not a
new general tree-coding principle. Absence across every semantic equivalent in
hundreds of modules is not proved. No claim of a uniquely AI-native discovery.

## Lab investigations, individually bounded

### OpenAI family128: superstring

Went one dependency deeper than X153's Schedule: fetched
`OAI/Computability/Superstring/Attachments.lean`. `complete_upper` requires a
substring-closed V, RecordSupply, cut<=group size, and a path already visiting
lower layers. It constructs Q, planned blocks B and pending requests R, preserves
visits and covers upper layers, with cost+reserves <= old cost +
2*(size-cut)*period and R.card<=1. This is a constructive path/reserve statement,
not a factor-two theorem for priced BPE messages. Costs and reserves are not
seconds. Transitive dependencies and kernel checking remain unperformed.

### OpenAI family079: local smoothing

Fetched live scope, comparator configuration, and **solution** Comparator.lean.
The solution defines angular Fourier/inverse integrals, halfWaveIntegral,
besselPotential and observationMeasure=volume×volume restricted to [1,2]. Its
local-smoothing theorem quantifies n>=2, real p>=2 (thus finite), epsilon>0 or
p=2/epsilon=0, then exists positive C for all Schwartz data. The order is
max(0,(n-1)/2-n/p)+epsilon. It delegates the proof to the project's underlying
local-smoothing theorem; this file is not a transitive proof audit. Separate
Bochner–Riesz claims have their own strict exponent conditions. No such function
space or PDE structure is established for discrete codec search.
Scope: https://github.com/openai/math/blob/main/lean/docs/079.md
A newly consulted community index distinguishes revised all-dimensional and prior
three-dimensional papers:
[2](https://mathcommunity.github.io/oai-math-revised/papers/Local-smoothing-for-the-Euclidean-wave-equation-October-25-2026/).
Do not turn that index into independent verification.

### OpenAI family378: subexponential SAT / counting

This newly surfaced potentially relevant claim deserved a separate check. Fetched
scope378, comparator JSON, Main.lean and SqrtLogSpace/Final.lean. The actual theorem
`exact_count_and_sat` has **for each fixed k>=2, exists machine and positive
constants C,A,S,d,e, for all n and width<=k CNF F**, an exact count/decision trace
with a specified runtime bound and polynomial all-prefix visited-tape bound.
Main imports the actual execution/space files; Final obtains the machine through
`compiled_exact_count_and_sat` and GuardedCompiler, not through a local sorry.
The scope distinguishes the formal bound
(L+1)^O_k(1)*2^O_k(n*(log log n)^2/sqrt(log n)) from the sharper manuscript bound
with one log-log factor and a sparse-clause specialization. Comparator configuration
permits propext/Quot.sound/Classical.choice and explicitly disables nanoda. None
of those checks was run locally.

Even if the released proof is correct and semantically aligned, this supplies no
measured fast implementation for our search: one must reduce the exact full-token
objective to bounded-width CNF, count encoding variables/length, obtain constants,
implement/extract the machine, and measure total cost. Increasing k with input size
would reverse the quantifier order. No ETH-based impossibility argument is used
here; no claim that the announcement disproves a codec limit or yields polynomial
compression search. Sources retained under receipts; scope:
https://github.com/openai/math/blob/main/lean/docs/378.md .

### Anthropic / Claude: Fermat formalization

X153 retained the challenge. X154 fetched `verification/comparator/Solution.lean`:
it imports `Theorems.Thm_fermat_last_theorem`, proves the same positive-natural
statement via that theorem, and bridges nonzero Mathlib variables using
Nat.pos_of_ne_zero. Thus the earlier challenge's deliberate sorry is not confused
with the solution. The underlying theorem tree, comparator and nanoda were not
replayed. FLT was historically proved; formalization is not a new compression
lemma. Source: https://github.com/anthropics/fermats-last-theorem .

### Google DeepMind / Gemini: last-iterate convergence

Re-listed the upstream Optimization directory (one file) and inspected the retained
X153 source one lemma deeper: `bounded_differences_E`, `delta_norm_bound`, and
`delta_induction`. The recurrence has contraction 1-1.15/(t+1+gamma), error
C/(t+gamma)^2, gamma>=2, yielding O(1/(t+gamma)) differences. It still depends on
differentiability, operator monotonicity, K-Lipschitz continuity, prescribed anchored
updates and a saddle/zero operator. Those conditions do not hold merely because
a finite token-cost hill climb terminates. No Lean replay or algorithm port.
Source: https://github.com/google-deepmind/alphaproof-nexus-results .

### Double AI: high-girth graphs

New search returned the lab statement and outside reporting, not an independent
kernel receipt. The claim remains degree q^3+1 for prime-power q, lower girth
(8/5)log_(q^3)n-O(1), plus a separate matching 28-regular family:
[1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory).
The previous PDF retrieval failed; no archive replay occurred. Outside reporting
[2](https://startupfortune.com/an-israeli-ai-startup-says-it-cracked-a-38-year-old-graph-theory-bound-for-2000/)
calling Lean a high bar does not establish its author rebuilt it. Error-correcting
code relevance is not a direct readable-source compression theorem.

Other labs/results: not exhaustively covered. No claim that unvisited work has
no relevance. The finite search budget and missing proof runtime are explicit gaps.
