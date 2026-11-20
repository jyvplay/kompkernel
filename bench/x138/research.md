# X138 live research and theorem-alignment audit — 2026-11-14

Executed fresh searches for collage/truncation grammars, suffix-prefix overlap
compression, and current lab proof corrections. Primary pages were fetched from
Dagstuhl DROPS, arXiv, Oxford Academic, doubleAI; GitHub source files were read
with gh. Oxford returned navigation only: substantive minicom details remain
search-excerpt evidence. No theorem prover, independent agents, external expert,
or native-model API was run. This is a bounded audit, not “ALL newly solved math”.

## New compression references and exact relevance

1. Varki, Gagie, Boucher, **Efficient Grammar Compression via RLZ-Based RePair**,
   CPM 2026, DOI 10.4230/LIPIcs.CPM.2026.5.
   https://drops.dagstuhl.de/storage/00lipics/lipics-vol369-cpm2026/html/LIPIcs.CPM.2026.5/LIPIcs.CPM.2026.5.html
   Primary chunks 0 and 3 read. This was a new site/paper in this turn's audit.
   Produces exact RePair grammars using an RLZ reference; abstract reports >80%
   memory reduction with modest runtime increase, not a general speedup.
   Local invariant: non-explicit phrases remain exact reference intervals.
   Bigram replacements touching phrase or source boundaries require splitting
   off explicit boundary characters. A doubly-linked list preserves logical
   positions while merging. It does not justify silently deleting overlapping
   source bytes. No implementation replay here; gains do not transfer to
   o200k full-message price, short inputs, or native model decoding.
2. Kempa and Prezza, **At the Roots of Dictionary Compression: String Attractors**,
   2017 preprint / 2018 publication; fetched HTML v4 dated May 2019:
   https://arxiv.org/html/1710.10964 . Primary opening now retrieved successfully
   (earlier session fetch failed). Dictionary formats include SLP, RLSLP,
   collage systems with substring rules, and bidirectional macro schemes.
   For a length-n string with an attractor of size gamma, the reported conversion
   gives a collage system of size O(gamma log(n/gamma)); this is a rule-size
   statement with a known attractor, not a BPE/native-reader guarantee. Smallest
   k-attractor decision is NP-complete for k>=3, not a proof that no finite-lane
   improvement is possible. The paper's LZ77 variant excludes source overlap;
   do not substitute an overlapping variant without changing hypotheses.
3. **Index suffix–prefix overlaps by (w,k)-minimizer to generate long contigs
   for reads compression**, Bioinformatics 35(12), 2066, 2019:
   https://academic.oup.com/bioinformatics/article/35/12/2066/5165381 . Search
   excerpt describes minimizer grouping and approximate suffix-prefix contig
   merging. Primary fetch returned navigation only. Biological read ordering,
   approximate matching and residuals are different from exact text in original
   order. It is related overlap ancestry, not a theorem supporting SYNAPHE.

SYNAPHE is a bounded experimental maximal-overlap macro-use operator, not an
implementation of any of those papers. Suffix-prefix string overlap is old;
repository-scoped novelty is the proposed location of that operation at macro
use sites. No world-first/AI-only discovery is claimed.

## Deeper checks of previously named lab claims

### Anthropic: actual end statement, not just README

Saved `receipts/anthropic-EndStatement.lean` from
https://github.com/anthropics/formal-math/blob/main/3sum-apsp/EndStatement.lean .
It explicitly says **imports nothing, proves nothing**. Definitions specify a
BitVec word RAM with addition/subtraction/multiplication/load/store/branch;
`SolvedInTime` quantifies **for every integer-magnitude exponent kappa, there
exist one program P, word coefficient b and time bound T, for all instances and
all W>=b(floor(log2 n)+1)**, subject to |input integers|<=n^kappa. `BigO` clears
the rational exponent denominator (for 1.9992, T(n)^1250 <= K*n^2499).
3SUM uses three distinct positions. APSP instances explicitly exclude negative
cycles, and output distinguishes unreachable pairs. These are material
hypotheses, not cosmetic details. No real-RAM or arbitrary-bit-complexity bound
is implied. This statement inspection is deeper than X137, but neither its
proof library nor statement/proof alignment was compiled. No Lean/lake binary
was found by `command -v`. No codec-speed theorem follows.

### OpenAI: revisions, not headline acceptance

Fresh primary history saved at `receipts/openai-history.md`, from
https://github.com/openai/math/blob/main/history.md . It records three withdrawn
papers, fourteen repaired manuscripts, and the October 29 Comparator namespace
fix. October 26 ETH-counting/local-smoothing releases remain external claims;
the history says a working group will examine the ETH proof. No locally checked
subexponential SAT implementation, paper proof or formalization is available
from this inspection. ETH refutation would not establish P=NP or make this
finite BPE search fast. News result counts differ: do not choose the largest
headline count as a verified theorem census.

### doubleAI: girth proof interface

Read primary chunk 1 beyond the previously inspected introduction:
https://www.doubleai.com/papers/girth85.pdf . The sketch uses x=det(w-I):
nonzero because w-I is invertible in a division algebra; divisibility by a^4;
archimedean bounds |x|<=16 under positive-definite unitary embeddings; local
bound |x|_p<=q^k for displacement 2k. **Conditional on those algebraic/local
claims**, the product formula gives q^k>=N(a)^4/16^r. With vertex count
n<=h*N(a)^15 and degree q^3+1, the logarithmic conversion yields factor 8/5.
The matrix example alone does not verify the division-algebra or building
hypotheses. The explicit 28-regular family excludes primes 2,3,7. Neither the
main proof nor its finite graph girths were independently checked here. X136's
finite chess witness is unrelated and is not reused as this theorem's evidence.

### Gemini / AlphaEvolve

Read additional primary optimization definitions:
https://arxiv.org/html/2608.16884v1 (chunk 1 after X137's opening).
Parameters are distributions over tensor shapes/six regions, with complete
split distributions and entropy penalties. Candidate floating-point objective
values are not a certificate; rigorous certification and tensor-to-exponent
hypotheses still require separate checks. The previously reported exponent
<2.371177 is not a practical speed bound for grammar rewriting. No numerical
optimization, tensor program or proof certificate replayed locally.

### Axiom and Harmonic

Axiom's exact `lean-toolchain` retrieved to `receipts/axiom-lean-toolchain.txt`
from https://github.com/AxiomMath/Mordell ; version alone does not validate the
Faltings proposition, its imports or absence of additional axioms. X137's
README claims remain unverified locally. Harmonic/OpenAI's Erdős #728 ambiguity
and intended-statement upgrade remain documented in X137; no new Lean replay
this turn. They are not relabeled as independently verified results.

## Imported impossibility boundary

For injective coding over a fixed finite alphabet, counting forbids strict
shortening of **every** finite string. It does not forbid our existential target
of saving >10 tokens on a real source with fallback elsewhere. Kolmogorov-optimal
compression for arbitrary texts is not computably achievable, but that is not
an impossibility proof for this bounded encoder or an excuse to omit tests.
There is no imported theorem equating executable inversion to a model's exact
single-chat output. That is the principal unresolved behavioral interface.
