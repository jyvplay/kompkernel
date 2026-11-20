# X140 live research and bounded primary-source audit

Session date: 2026-11-14. Search results and current pages can contain later-dated
entries; those are not accepted as contemporaneous evidence. Actual execution:
web searches/fetches and GitHub API source retrieval. No Lean, lake, alternate
kernel, independent agent, expert panel, or native-model endpoint was executed.
No claim to have reviewed ALL newly solved mathematics is made. The OpenAI index
alone currently describes 721 manuscripts / 373 result families; downloading
that index is not reading or validating those manuscripts.

## Search diversification / provenance

New queries included contracting SLPs, hierarchical relative dictionaries,
string transformations, data-aware trie compaction, morphic grammar measures,
and individual lab artifacts. `reference-prior-occurrences.json` scans current
source/docs/bench text <=2MB, excluding this turn. It finds earlier references to
Harmonic #728, Axiom Lyons–White, and SubexponentialSAT. They are revisits, not new
sources. It finds no earlier reference to francescotosoni.it / 102316 or the
contracting-SLP DOI. This is a bounded scan, not every Git revision or linked site.
An initial GitHub lookup of openai/research returned 404; the actual artifacts
were then retrieved from openai/math. The failure is retained, not called a read.

## Compression results and their interfaces

### CoCo-trie — new author-hosted primary site

Boffa, Ferragina, Tosoni, Vinciguerra, *CoCo-trie: Data-aware compression and
indexing of strings*, Information Systems 120 (2024), 102316; online 17 Nov 2023,
DOI 10.1016/j.is.2023.102316. Primary PDF opening and section-4 material fetched:
https://www.francescotosoni.it/static/j3.pdf . Within the requested twenty years.

Objects: a static sorted set of variable-length strings over an integer alphabet;
queries include rank, lookup, prefix and predecessor. The cost is succinct bits
plus navigation/index storage, not an LLM message. Macro-nodes collapse subtries;
selection depends on edge-label distribution as well as topology. The opening
reports empirical Pareto results over six datasets, not universal domination.
The inspected counterexample compares gamma-coded labels for two tries with the
same topology: one benefits from collapse, the other may cost 6b−1 rather than
at most 5b+1 bits. Thus structure alone cannot certify a compression gain.

Transfer: test real serialized costs for image/factor dictionaries, not counts
of eliminated definitions. Missing interface: a token-priced in-band wire with
ordinary-model readability and preserved source order. Sorted-set indexing does
not supply that. We did not implement CoCo-trie or reproduce its experiments.

### Contracting SLPs — independently bounded structural depth

Moses Ganardi, *Compression by Contracting Straight-Line Programs*, ESA 2021,
DOI 10.4230/LIPIcs.ESA.2021.45, primary abstract fetched:
https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ESA.2021.45 .
For an SLP of grammar size g generating a string of length N, the reported
conversion takes linear time and produces O(g)-size contracting rules of
constant arity, where each referenced variable expands to at most a fixed
fraction of its parent's length. Each subtree has logarithmic height in its
leaf size. Converting to the stronger alpha-balanced or AVL-grammar classes may
require an Omega(log N) size factor. These are different balancing predicates;
the lower bound does not contradict the contracting construction.

Transfer: expanded-rule dependency depth should be bounded/checked. Not imported:
linear runtime for EIKON's naive expanded-string search, exact token optimality,
or a proof that shallow grammars are natively read without error. Only the
abstract, not every proof/hypothesis of the paper, was inspected this turn.

### HRLZ — search-level reference choice, not a free external dictionary

Bille, Gørtz, Puglisi, Tarnow, *Hierarchical Relative Lempel-Ziv Compression*,
SEA 2023, DOI 10.4230/LIPIcs.SEA.2023.18. Search returned primary abstract and PDF
excerpts: https://drops.dagstuhl.de/opus/volltexte/2023/18368/ .
A collection's strings form a rooted hierarchy; root stored plainly, each child
RLZ-coded against its parent, then decoded in BFS order. Complete directed graph
edge weights count relative phrases; an optimal arborescence selects references.
A locality-sensitive-hashing sparse alternative is an engineering heuristic,
not a proof of the complete-graph optimum. Reported bacterial-genome gain is
not prose evidence. Our single-message setting must transmit every reference.
This motivates jointly chosen source dictionaries but supplies no BPE guarantee.

### Ancestry retained, not relabeled novelty

The X139 morphism / NU-system and collage papers are still relevant ancestry.
EIKON evaluates ASCII character homomorphisms of expanded grammar values; it is
not the full NU/L-system model, an implementation of its asymptotic algorithms,
or a novel mathematical primitive. APOTOME truncates expanded values, whereas
EIKON changes characters. The interior-slice control follows the prior suggested
test; it is explicitly an APOTOME-family extension, not a second new codec name.

## Individual lab audits

### OpenAI — deeper ETH statement inspection

Fresh files: `openai-contents.md`, `openai-history.md`, `openai-378.md`, and
`openai-eth-statement.lean`. Sources:
https://github.com/openai/math/blob/main/lean/docs/378.md
https://github.com/openai/math/blob/main/lean/ComparatorChallenges/SubexponentialSAT.lean

The scope note distinguishes the claimed Lean bound
(L+1)^{O_k(1)} 2^{O_k(n(log log n)^2 / sqrt(log n))}
from the sharper manuscript bound with one log-log factor, and a sparse-case
bound without it for m <= Dn, D fixed. k>=2 is fixed before the machine and its
constants; the theorem then quantifies all n and finite-set CNFs of width <=k.
Input is a canonical finite-set encoding, bit length L. It returns both the
exact assignment count and a satisfiability bit; output count length <=n+1.
Polynomial visited space is asserted for EVERY prefix of the execution trace,
not merely the final state. The scope is a primitive finite multitape machine;
it is not a JS implementation or a practical cutoff for our candidate search.

The fetched comparator statement ends in `sorry`; it specifies a challenge
interface, not the proof library. This is neither a local proof certificate nor
by itself evidence that the external proof is missing. No comparator/axiom
inspection or kernel replay was run. The history still records the October sign
error and three withdrawn manuscripts. Thus an index headline cannot transfer
unqualified proof status to every paper. Prior Yang–Mills source inspections in
X139 remain source inspections; no fresh theorem replay occurred in X140.

Codec relevance: even a valid subexponential SAT theorem would require a
cost-preserving reduction with practical constants and a specified variable
count. None is supplied. It neither establishes P=NP nor removes the injective
coding counting bound. We do not use ETH as an unconditional impossibility
assumption for compression, or use its claimed negation as a measured speedup.

### Anthropic / Claude — deeper ETH formal interface

Fresh `eth-readme.md` and `eth-main.lean` from:
https://github.com/anthropics/formal-math/tree/main/eth .
`MainResults.lean` explicitly contains definitions only and imports Mathlib.
The main proposition chooses ONE finite-alphabet FinTM2 machine and ONE C before
all k>=1, n>=4 and lists of clauses with m>=2, width<=k, no repeated clause, and
every variable occurring. It counts assignments in
2^{C min(km/sqrt(log m), k² n log log n/sqrt(log n))} steps, rounded down;
log is real log base2. Clauses are lists, may repeat literals or contain a
literal and its negation; different literal orders count as different clauses.
Input has unary k/n prefixes and fixed-width literal slots; count output has
n+1 bits. A block step is bounded stack work for a fixed machine; finiteness of
all stack alphabets is an explicit assumption.

The ETH proposition has a different quantifier boundary: for each positive
delta there may be a different machine/constant; the main theorem is uniform
before k. n<4 or m<2 cannot be slipped into the displayed log formula: at n=2
log log n=0 and at m=1 Lean's division-by-zero convention can make a bogus
one-step bound. The file explicitly excludes these cases. Its commentary says
the usual-machine simulation / input conversion is outside the Lean proof.
The README reports build and second-kernel checking instructions; neither was
run here. Published runtime/memory requirements are not our execution receipts.
Earlier 3SUM/APSP checks are carried forward, not newly certified.

### Google DeepMind / Gemini — deeper trusted boundary

Refetched announcement and opened the actual technical development:
https://deepmind.google/blog/introducing-alphaproof-code/
https://google-deepmind.github.io/code-verification/ .
The primary development, dated Nov10, reports about 6.5M lines of checked proofs
resting on about 26,000 lines of trusted specifications and AArch64 semantics.
Its stated objects are libsignal PQXDH and Triple Ratchet machine-code security,
including forward secrecy, authentication, post-compromise security and handshake
secrecy. This is not a proof of all app/UI/network behavior or of the processor
model's physical implementation. Human-approved specifications and the machine
semantics are part of the trusted boundary; Lean checks the formal implication.
Two reintroduced historical bugs are negative controls reported by the authors,
not tests we ran. Only the opening technical sections were read, not all48
returned chunks or the 6.5M-line development. Transfer is the discipline of
binding implementation to approved spec, not an LLM decoding guarantee.

### doubleAI — graph claim revisited

Refetched primary Oct6 page:
https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory .
For every prime power q, it reports an explicit infinite family of (q³+1)-regular
graphs with girth >=(8/5)log_(q³)n−O(1). The stated determinant certificate has
three simultaneous obligations for nontrivial congruence w: det(w−I) nonzero,
divisibility by the fourth power of the level, and a bound from tree displacement.
Dropping nonzero destroys the valuation-to-length argument. The matching upper
bound is stated for one 28-regular family, not all degrees. PDF and Lean ZIP are
linked but were not built here. Our grammar graph must be acyclic, not merely
large-girth; importing this as a cycle-safety certificate would be invalid.

### Axiom — separate discovery and formalization

Fresh blog listing includes existing-theorem formalizations (CFSG, Stacks,
Weil, Faltings, cluster algebras). They are not automatically new solutions of
open questions; headline dates include entries later than this session date,
which are excluded as current evidence. This turn revisited the primary
Lyons–White explanation rather than claiming to inspect millions of unrelated
formalization lines:
https://axiommath.ai/research/faster-is-not-nearer/ .
Symmetric continuous-time jump rates on a finite dihedral group are compared
from a fixed initial state at a fixed time in Lp distance from uniform. The
reported monotonicity holds for positive even integers p; for each finite p not
an even integer there EXISTS some dihedral group/rates/time giving failure, not
that every walk fails. The Fourier coefficient counterexample must also be
realizable by nonnegative rates generating the group; that is a separate
construction obligation, explicitly discussed. Generalized inversion extensions
are distinguished from a broader conjecture. The repository link is
https://github.com/AxiomMath/LyonsWhite ; not replayed. It is a warning against
inferring monotonic improvement from more search activity, not a token theorem.

### Harmonic / Aristotle — formulation repair matters

Fresh primary writeup opening:
https://arxiv.org/html/2601.07421v5 (Jan26,2026), Nat Sothanaphan.
For every 0<C1<C2 and 0<epsilon<1/2, infinitely many natural triples satisfy
 epsilon*n <= a,b <= (1−epsilon)*n,
 a! b! divides n! (a+b−n)!, and C1 log n < a+b−n < C2 log n.
The argument reduces to prime-by-prime binomial divisibility, combines carry
lower bounds with exclusion of rare valuation spikes, and uses simultaneous
constraints for all relevant primes. An earlier unrestricted/easy interpretation
was not the intended result. The history involves an OpenAI informal argument,
Harmonic formalization, and human operation/statement clarification; we do not
call this a new external agent working on our task. No Lean replay here.
No theorem translates these number-theoretic triples into a practical text codec.

### Other labs / PSI

X139's PSI Boolean-cube influence/degree audit remains explicitly carried forward,
not freshly checked or generalized to all probability measures, exact coding or
runtime. No exhaustive coverage of unnamed frontier labs is asserted.

## What is established vs still open

Counting gives a rigorous negative result only for strict shortening of EVERY
finite string under one fixed injective finite-alphabet code. These finite
corpus gates are different. Grammar-size/depth theorems, sorted dictionary
indexes and asymptotic SAT claims leave open our specific interface: an in-band
BPE-efficient representation, exact source inverse, ordinary single-message
model behavior, and full-cost runtime. None of the imported results closes it.
