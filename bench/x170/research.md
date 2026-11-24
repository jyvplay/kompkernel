# X170 research: fresh retrieval, bounded proof inspection

Session date authority: 2026-11-14 UTC. No theorem kernels, independent agents,
external decoder endpoint, or expert review were available. Executed systems:
Node/npm/esbuild/TypeScript, Python, Git/gh, OS processes, web search/page fetch.
The repo has413omega files at start; historical headers are not proof certificates.
No exhaustive survey of ALL solved mathematics is feasible or claimed. Search
results include extravagant secondary claims and even future-dated material:
those are discovery leads, not accepted mathematical facts.

## New compression questions and sources

Searches used *periodic subsequence dictionary finite-state transducer word
variants*, *information-lossless finite-state finite-block redundancy*, and
*lossless finite-state compression2025* excluding previously frequented domains.

1. **Merhav, Generalized Forms of the Kraft Inequality for Finite-State Encoders**,
   January2026, [arxiv2601.16594v1](https://arxiv.org/html/2601.16594v1).
   Freshly read abstract, introduction and full model definition (chunks0–1).
   Finite source alphabet X, finite state set Z, outputs finite binary strings
   including empty, deterministic output f and transition g. Information-lossless
   means initial state, concatenated output and final state uniquely determine
   the input for every initial state and block length. Its reported necessary
   condition is spectral radius of the nonnegative Kraft matrix <=1; irreducible
   refinements need irreducibility. This is a BINARY fixed-machine bound, not a
   finite-prompt BPE bound. KYKLOS additionally sends its per-document machine;
   its cost cannot disappear. We have not audited the entire proof. The local
   test uses two different symbols both mapped to0: Kraft sum1 but ambiguous,
   so a necessary length condition does not certify a specified encoder.
   No prior repo reference to this paper was found in the bounded text search.
2. **Cognetta & Okazaki, Tokenization as Finite-State Transduction**, CL51(4),
   2025, DOI10.1162/coli.a.23,
   [ACL publisher page](https://aclanthology.org/2025.cl-4.2/).
   This was search-only in X158; X170 freshly reads publisher abstract and PDF
   chunk3, including Lemma1. For minimal deterministic character automaton A
   and the specified character-to-subword transducer T with Sigma subset Gamma
   subset Sigma+, epsilon-removal of projected composition is deterministic;
   stated polynomial operations concern that construction, not arbitrary
   transducers. Tokenization-agnostic promotion accepts ALL spellings, not
   necessarily canonical BPE. This motivates keeping real canonical BPE pricing
   rather than treating all equal-byte token sequences as available chat input.
   It does not establish KYKLOS's native readability or compression gain.
3. **Matusiak, A Review of Classical Lossless Data Compression Algorithms and
   Their Contemporary Relevance**,2025, DOI10.5604/01.3001.0055.3096,
   [new retrieval site Biblioteka Nauki](https://bibliotekanauki.pl/articles/64172284.pdf).
   Read first PDF chunk, not all six. This is a descriptive taxonomy of
   dictionary, entropy, predictive and transform methods, not a new bound.
   Its wording about reducing information/entropy is not adopted literally:
   invertible coding changes representation, not the information in a fixed
   source. This independent taxonomy is useful for rejecting a rename as novelty.
4. Search-only **Kangaroo: Efficient Lossless Floating-Point Compression via
   Dynamic Reference Selection**, ACM2026, DOI10.1145/3802076,
   [3](https://dl.acm.org/doi/pdf/10.1145/3802076). Binary floating-point
   reference search is not exact lexical decimal reconstruction or unaided chat.
   No claimed speed/ratio is transferred to our stack.

Classical finite-state transduction is ancestry, not an AI-exclusive discovery.
KYKLOS's concrete distinction is an in-band word cycle independently clocked by
its own marker events, with literal exceptions that do NOT advance it. It is not
DIADOCHI's consumed predecessor queues, GEFYRA's neighbor insertion, DEIKTIS's
occurrence-choice tape, SYMFRAZ's sorted side streams, STOIBAS's BFS tree queue,
or KRYPTOLYSIS's alphabet rotation. Rosetta's stride-row families and KANNABOS's
numeric periodic columns are nearby prior mechanisms, explicitly inspected.
A bounded repo search cannot prove historical originality against every codec.

## Individual lab investigations, deeper than X169

Pinned source paths/hashes in `receipts/research-artifacts.json`; re-fetch with
research-fetch.py. No `#print axioms` command was run and no kernel closure was
verified. Code text containing a theorem is not a verified theorem receipt.

### OpenAI

Freshly retrieved `FixedPaperActualRows.lean` at f5702854… (89lines), one dependency
below last turn's compiler wrapper. `eventually_paperRatedRows` combines eventual
quiet prelude, retained frame, rated boundary and role hooks, startup inputs and
n>=128. It then threads the SAME memory/model selection through a rated-selection
oracle and proves counter/grammar operand words do not wrap using workspace<2^w.
Read lines40–89. This is not a finite practical time bound: the eventually-large
threshold and imported lemmas remain obligations. We do not endorse VP≠VNP from
this source-level inspection. Transfer: cache optimization must preserve exact
lookup values and integer widths; asymptotic feasibility says nothing about
our measured kilobyte fixtures or elapsed time.

### Anthropic

Freshly read all121lines of `CountedToPadded/RunFor.lean` at11b6c7e3… .
`fold_reaches` needs T<=fuel.length AND7*S+2<=room. Halted states persist;
`cutAt` bounds encoded optional state length by room+2. The polynomial theorem
uses polynomial init/step/out, length comparison, closure under bounded fold,
and explicit input-size bound, not constant-time arbitrary machine steps.
This deepens the X169 header reading: the resource guard is part of correctness,
not just a performance hint. Imported word encoding/comparison closure still
not independently checked. Transfer: a working cache key-unit budget is not a
hard process heap bound, and a completed run is not a speed comparison.

### Google DeepMind

Freshly retrieved full1504-line Erdos741 proof at0647711a…; read construction,
additive-basis portion and final no-partition argument, not every line.
Base-four split1 takes digit low bit; split2 takes its complementary0/2part.
Their ranges B1+B2 cover N, so B=B1 union B2 and SandorA=B union widely separated
intervals have SandorA+SandorA=N. Intervals are[4^(3^k),10*4^(3^k)). The final
contradiction extracts two divergent subsequences M,N and positive delta;
assuming both self-sumsets have positive NATURAL densities supplies upper and
lower eventual bounds with epsilon=delta/4, contradicted by the fluctuation lemma.
The fluctuation lemma's full proof closure remains unreviewed. Local65,536digit
checks establish only split identities. Natural density is essential; substituting
upper density changes the problem, as X169's dependency definitions showed.
Transfer: a consistent quantity/quantifier is more important than the headline.

### DoubleAI

Freshly read [girth85.pdf](https://www.doubleai.com/papers/girth85.pdf) chunk10,
continuing the previous Witt-index inspection. Orthogonality yields an anisotropic
2-plane with basis norm valuations of opposite parity; otherwise a norm solution
would produce an isotropic vector, contradicting Witt index1. This produces a
g-stable lattice and a2k-step apartment walk. Section4 requires a totally real K,
CM quadratic E/K, cyclic degree-four L0/K, L=L0E and gamma*conjugate(gamma)=1,
plus an inert prime where valuation(gamma)=1. The cyclic matrix U satisfies
U^4=gamma I, conjugates rho(a) to rho(sigma a), and is unitary under the norm
condition. Local integer matrix tests check the first identity and show the
unitarity condition cannot be omitted. They do NOT verify division-algebra
existence, the global product formula, graph girth or Lean output. New construction
ideas do not remove byte fidelity or the in-band machine description cost.

### Harmonic

Unlike X169's statement-only file, freshly retrieved actual `IMO2025P3.lean`
at72b62405… (433lines); read definitions, local divisibility lemmas,
v2-bound premises and upper-bound case split. Construction maps odd n to1,
n=2mod4 to4, n=0mod4 to16. From the bonza congruence with a=b=n obtains
f(n)|n^n; at primes f(p) is a prime power. For S={2}, n=2^k*m with odd m,
k>=1, the v2 bound is <=k+2. Full upper bound additionally splits finite/infinite
S, so that local lemma alone is not the whole proof. Finite100x100modular checks
validate the witness only; theorem/kernel validation remains NOT_RUN.

### ByteDance Seed

Freshly retrieved relocated P3 proof at38c59ceb…; read lemma declarations around
the LTE formula and the local power-of-two bound (not the whole long proof).
For positive n, v2(3^n-1)=1 for odd n, otherwise2+v2(n). The local f(n)<=4n
step explicitly assumes f(n)=2^k and k<=2+v2(n); positivity and branch premise
cannot be dropped. Its different witness maps4to16, other positive evens to2,
odds to1. It also passes the finite100x100modular test. Neither witness tests
the universal upper bound. This is tool-assisted formal research, not evidence
of a single-chat decoder with no verifier.

## Acceptance boundary

All directly used publications are within20years. Source inspections, finite
counterexamples and compiler output are different evidence types. None certifies
native chat decoding; no new frontier math theorem is imported as a magical
compression primitive. The open interface is full-message price plus behavior
on a specified native decoder and practical speed on fresh workloads. Search
continues to support experiments, not a claim of an exhaustive proof audit.
