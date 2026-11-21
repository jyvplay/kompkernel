# X156 live research / verification boundaries

As-of date: 2026-11-14 UTC. Available and actually used: bash, Node22,
TypeScript, esbuild, Vite, CPython, git, gh, web_search and fetch_page. Independent
Python implementation means different code, NOT an independent human/agent.
No model API, independent agents, simulator, Lean/Lake executable, proof kernel,
external expert reviewer, or paid research database was used. Two frontier
workers and separate candidate experiments really did run concurrently; their
wall times are NOT isolated speed evidence. npm ci reported 3 high and1 critical
dependency vulnerabilities; package manifests were not changed opportunistically.

## New search tracks and imported hypotheses

Queries included: lossless text compression move to front word permutation;
compression memory address delta2023 trace; Base-Delta compression2012/2015;
lossless text compression2025 grammar token efficient; and lab math2026.
Not every returned result was fresh or relevant. In particular the first math
search returned Nov20/21 reports, AFTER today's date. Those are excluded, not
counted as current breakthroughs. An old2004 semi-lossless text paper is outside
the requested20-year window AND violates byte equality. No exhaustive search of
all websites, all codecs or all frontier-lab mathematics is claimed.

1. Pekhimenko et al.,2012, *Base-Delta-Immediate Compression: A Practical Data
Compression Mechanism for On-Chip Caches*, PACT / SAFARI2012-001.
[3](https://research.ece.cmu.edu/safari/tr/tr-2012-001.pdf)
Search exposed the report's low-dynamic-range cache-line hypotheses and explicit
base plus deltas plus immediate values. Direct PDF fetch failed. This is classical
ancestry, not a proof of our textual BPE objective. Our coupled END-to-next-START
recurrence differs from one shared base, but not from predictive coding in general.
No hardware results are reproduced or borrowed as whole-stack speed results.

2. Cleary et al.,2013, *Reconstructing Program Memory State from Multi-gigabyte
Instruction Traces*. [4](https://chisel.cs.uvic.ca/pubs/cleary-WCRE2013.pdf)
Search excerpts describe block snapshot deltas and a hierarchy enabling bounded
trace recomputation. Requires executed-instruction trace data and indexed memory
snapshots. Does not establish compact human-readable memory-map descriptions or
basic-chat inversion. New source inspected at excerpt level only.

3. *Near-Lossless MPI Tracing and Proxy Application Autogeneration*,2022.
[3](https://ieeexplore.ieee.org/document/9925630/)
The surfaced implementation explicitly substitutes symbolic opaque-object IDs
without preserving exact memory addresses, and timing is excepted from lossless
claims. Therefore it is inadmissible as-is: our source's absolute addresses and
whitespace must survive. This negative comparison motivates retaining explicit
reset addresses, not pretending ASLR addresses are semantically irrelevant.

4. Tufa Labs,2026, *tufazip: Learning to Compress a Billion Bytes of Wikipedia*.
[3](https://tufalabs.ai/research/tufazip/)
Fresh site; fetched first page chunk and search summary, not all five chunks.
Reports105,388,353 bytes including decoder/offline weights, deterministic online
learning replay at decode, arithmetic coding and changed tokenizer configurations.
Useful lesson: charge all decoding machinery. Not admissible here: no online
training, binary arithmetic decoder or new vocabulary can be hidden in basic chat.
This is a technical report, not a locally reproduced result or peer-review claim.

Stable local grammar SEA2025 and LTSC2025 also appeared but were ALREADY in prior
turns' sources. They are not falsely counted as novel discoveries this turn.

## Individual lab follow-ups (source inspection, not kernel verification)

Three Lean source files were freshly fetched, then refetched by commit SHA with
byte equality asserted. See receipts/proof-provenance.json; Apache notice retained.

### OpenAI SAT: NativeLeafContract, one dependency deeper

The `execution` theorem requires positive k, threshold>=2, Valid k F,
LeafReady, no selected sparse priority, global stack bounds, classifier/power
budgets, and a local-command evaluation premise with exact body/dimension/empty
register hypotheses. Its bound is3624*bound +100*(formulaBound+1)+11*n+
localTime+5479. The comment says the local premise is discharged below by the
query run; we did not verify its complete dependency closure. This explicit
interface cannot be replaced by 'a free practical SAT optimizer'. The fixed-k
versus varying-width quantifier problem from X155 remains. No kernel replay.
https://github.com/openai/math/tree/main/lean/OAI/Algorithms/SubexponentialSAT/SqrtLogSpace

### Anthropic/Claude FLT: deeper reduction to odd primes

Fetched `P2M/Sol/S_FLT_fermatLastTheorem.lean`, not merely the user-facing wrapper.
Its `solution : FermatLastTheorem` applies `FermatLastTheorem.of_odd_primes`;
prime p>=5 delegates to `FreyPackage.fermatLastTheoremFor_of_five_le`; small cases
use primality/oddness contradictions and `fermatLastTheoremThree`. The import
therefore exposes a further FreyPackage proof obligation, not an elementary
compression lemma. Huge simp/instance attribute lists are not proof certificates.
We retained a filtered tree entry rather than vendoring the entire15MB listing.
https://github.com/anthropics/fermats-last-theorem

### DeepMind/Gemini: final convergence endpoint, not just bounded iterates

Inspected the final squared-operator residual conclusion `exists C>0, forall T>=1,
||F(z_T)||^2 <= C/T` in LastIterateConvergence.lean. Hypotheses include differentiable
L, monotone operator, positive Lipschitz K, gamma>=2, exact prescribed initialization
and steps, and a saddle with zero operator. The finite, discontinuous token-price
landscape of glyph assignment has no supplied differentiable monotone embedding.
Convergence of this residual is neither global optimality nor a cost guarantee
for a bounded heuristic codec search. No kernel replay.
https://github.com/google-deepmind/alphaproof-nexus-results

### DoubleAI: located primary proof links, fetch blocked

Fresh primary landing page fetch exposed exact PDF and ZIP links, a concrete
improvement over X155's failed GitHub discovery:
https://www.doubleai.com/papers/girth85.pdf
https://www.doubleai.com/papers/girth85-lean.zip
PDF fetch FAILED; ZIP not downloaded/replayed. The landing-page claim is for
prime-power q, degree q^3+1, an infinite graph family, girth >=(8/5)log_{q^3}n-O(1),
with matching upper bound for one28-regular family. Its stated determinant
certificate requires nonzero det(w-I), fourth-power level divisibility, and a
movement bound in the Bruhat–Tits tree. These are hypotheses/claims to inspect,
not verified facts here. No map from such graphs to BPE-native compression has
been established. Primary landing page:
[4](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory)

Other labs: not exhaustively audited. A future-dated secondary headline cannot
supply a missing theorem, and theorem source inspection cannot supply native
model decoding. These exclusions are part of the evidence, not unfinished proof
steps silently marked standard.
