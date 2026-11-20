# X139 live research / exact scope audit — 2026-11-14

Fresh searches used collage-system conversion, smallest substring equation
systems, string morphisms, quantum-query influence bounds and current formal
verification releases. Primary pages and actual Lean statement/proof source
were inspected as noted below. No Lean/lake executable was found; no prover,
independent agents, simulation, hardware experiment or native-model evaluator
was run. This is not an exhaustive audit of ALL mathematics from all labs.

## Compression literature (within twenty years)

1. Simone Faro, **A Factor-5 Conversion to Internal Collage Systems**, arXiv
   2610.04520v1, 3 Oct 2026. Primary opening fetched:
   https://arxiv.org/html/2610.04520 . For an acyclic collage system of m rules,
   the paper claims an equivalent internal system of <=5m rules and O(m^2)
   time under a unit-cost RAM model where all represented lengths, endpoints,
   exponents and indices fit O(1) words. The model is not automatically a
   Theta(log final-text-length) word model: intermediate expansions may be
   larger. 'Internal' concerns structural reachability, with truncation targets
   potentially hidden; it does not mean all stored dictionary entries were used
   in the original text. APOTOME does NOT implement this conversion or inherit
   its bound. The relevant ancestry is acyclic truncation of expanded rules;
   our actual cost is full BPE message length, not number of productions.
2. Hiroki Shibata and Hideo Bannai, **Exact and Approximation Algorithms for
   Computing Smallest SESs and BMSs**, arXiv 2611.16164v1, submitted 12 Nov 2026.
   Primary abstract fetched: https://arxiv.org/abs/2611.16164 . Reports exact SES
   deterministic O*(4^n) and randomized O*(2^n) time/space, deterministic smallest
   BMS O*(2^n), plus parameterized approximation bounds; randomized correctness
   is high probability, not unconditional. These are string representation-size
   algorithms, not practical full-token optimization on 5,000-character prose.
   No algorithm implementation or proof replay was performed. Exponential upper
   bounds do not establish impossibility of a useful bounded heuristic.
3. **Repetitiveness measures based on string morphisms**, Theoretical Computer
   Science, 2025, DOI 10.1016/j.tcs.2025.115259. Primary abstract fetched:
   https://dl.acm.org/doi/10.1016/j.tcs.2025.115259 . L-systems specify one string
   using a morphism, coding, iteration depth and output length; NU-systems combine
   them with bidirectional copying. Reported asymptotic separations concern
   particular families and description models, not arbitrary natural prose or
   native model reconstruction. This is a genuinely orthogonal representation
   direction, but no measured codec gain is imported from the abstract.

Older collage origins (Kida et al.) are ancestry, not misdated as new research.
The new candidate is repository engineering, not a claim that humans missed
substring views or that an AI discovered a new theory of compression.

## OpenAI — stronger primary check than the previous headline audit

Newly followed Scientific American's Nov 11/12 report to the actual review
repository: https://github.com/yang-mills-group/YM . Saved README, checks, rerun
instructions and `checks/CombinedAcceptance.lean` in receipts. The group assesses
OpenAI's 28 October submission as constructing a Wightman quantum field theory
as a scaling limit of four-dimensional Wilson lattice gauge theory for simple
compact gauge groups. **No mass gap or unique infinite-volume limit is claimed.**

Actual proof source `combined_acceptance` calls `YangMills.constructed` once,
chooses a common family, then for each extraction order chooses a refinement,
table and Final witness. The reviewed clauses are attached to that SAME witness.
This is the exact logical distinction between 'for each requirement some
candidate works' and 'one candidate satisfies all requirements'.

The review's `checks.md` narrows further: the independent OS bridge concerns a
selected centered stress-trace scalar family, not an independent all-field OS
specification; leading short-distance behavior is not all-orders perturbative
matching; a positive lattice probe is not a nonzero intrinsic continuum mass.
The separate OPE endpoint does not supply a theorem identifying its existential
witness with the combined endpoint. Human statement/physics correspondence
remains necessary even after formal compilation.

Their reproduction guide reports an approximately three-hour original build
and ~52 GiB completed tree, using pinned Lean 4.32.0 plus Comparator toolchain
4.34.0. **Those are external reported resources, not our execution.** We did not
run the verifier. The README lists a Nov 15 submission as work in progress;
that is beyond today's Nov 14 and is not treated as a completed current result.
No result here implies a token saving or a runtime improvement in this repo.

## Anthropic / Claude — retain machine and quantifier boundaries

Refetched `anthropics/formal-math/3sum-apsp/EndStatement.lean` to receipts.
Its header explicitly says it proves nothing; it defines the target word-RAM
claims. X138's analysis still applies: for each polynomial integer-magnitude
exponent, one program/time bound must work for all relevant instances and
sufficient word sizes. APSP excludes negative cycles; 3SUM uses distinct
positions. No real-RAM/bit-complexity substitution and no local Lean proof build.
Fresh announcements about a faster Fermat formalization were seen in secondary
search results; their actual newer proof package was not verified here. A
reformalization speed claim is not a new theorem or our stack's speedup.

## Gemini / DeepMind — new primary software-verification release

Primary Nov 10 blog fetched:
https://deepmind.google/blog/introducing-alphaproof-code/ . It reports agents
proving specified properties of compiled Signal cryptographic code, with
human-approved specifications, Lean checks and two reintroduced historical bugs
as negative controls. We read the announcement, **not the proof corpus or machine
semantics**. Selected formal security properties do not imply absence of every
application/platform vulnerability. Useful engineering lesson: keep intended
specifications outside the candidate's control and include negative controls.
No agents or AlphaProof Code service were available or invoked in this session.
A search hit dated Nov 16/17 is beyond today's date and was excluded from evidence.

## doubleAI — certificate claims remain un-replayed

Fresh official page fetched:
https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory .
It links the girth85 paper and Lean archive and states prime-power q, degree
q^3+1 and lower bound (8/5)log_(q^3)n-O(1), with a matching 28-regular family.
X138's deeper determinant-certificate conditions remain the unresolved proof
interface: nonzero det(w-I), fourth-power divisibility, archimedean and local
bounds, plus group/tree hypotheses. No archive build or graph verification ran
here. A new search also surfaced Maxwell speed claims; no public verified
implementation was adopted as evidence of acceleration in this checkout.

## PSI / non-public Anthropic model — newly audited lab

Fresh official page https://psi.inc/research/aaronson-ambainis/ and GitHub README
https://github.com/physical-superintelligence/aaronson-ambainis fetched; exact
README saved. For a real degree<=d polynomial bounded in [0,1] on the uniform
Boolean cube, variance >=epsilon>0, the stated result gives a coordinate with
squared-flip influence >=(8 sqrt(15)/(125 pi^4))*epsilon^(5/2)/d^6 >=(epsilon/d)^7.
The README gives the fully quantified `PrintedConjecture` in Lean, making the
uniform measure, boundedness and influence normalization explicit.

The fourth stronger theorem is CONDITIONAL on `FbsDegreeBound`, an external
Agarwal–Ben-David theorem not formalized there. That caveat does not make the
other three theorem declarations conditional on it. Repository claims of two
kernel replays were not independently reproduced here. Query complexity on
most random inputs with approximation error is not polynomial-time simulation,
exact all-input losslessness, nor compression of an arbitrary document.

## Other labs and limits

Axiom and Harmonic audits from X137/X138 remain reference notes, not new
independent builds. No claim of exhaustive lab coverage is made. No imported
mathematical result is used as a substitute for byte comparison, full-message
pricing, isolated timing or the unavailable native one-message model trial.
Counting forbids strict shortening of every string by an injective fixed-
alphabet code; it does not forbid the finite-corpus >10-token goal. These
negative experiments do not prove that goal impossible.
