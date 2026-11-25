# X184 live research and proof-interface review

Authoritative session date: **2026-11-14**. Sources sometimes return later-dated
material; that material is not evidence of a result established by this cutoff.
This is a bounded individual review, NOT an exhaustive audit of all newly solved
mathematics. No assertion about absence from model training is supportable.

## New search directions and recent papers

Searches actually issued included reversible text preprocessing2020/2024;
bijective word transforms2018/2023; subsequence compression templates;
LCS dictionary compression; Cartesian tree compression2015/2020; compressed RMQ;
hypersuccinct trees; and separate OpenAI, Anthropic, DoubleAI, Google, Harmonic,
ByteDance and xAI proof queries. Rejected STC as already SYMFRAZ, and BBWT as
already KYKLOGRAF. LCS-template and log-compression leads overlap established
stack mechanisms; not relabeled as novel discoveries.

1. Gawrychowski, Jo, Mozes, Weimann, **Compressed Range Minimum Queries**,
2019 preprint, TCS812(2020),39–48, DOI10.1016/j.tcs.2019.07.002.
https://arxiv.org/pdf/1902.04427 — first PDF chunk actually fetched.
https://www.sciencedirect.com/science/article/pii/S0304397519304281 — search result.
For S of n integers in [0,σ), RMQ returns the index of the leftmost minimum in an
interval. A Cartesian tree exactly characterizes the RMQ answers, not the values
of S. The paper compares SLP string compression and top-tree Cartesian-shape
compression, in word RAM, for non-systematic RMQ data structures. Reported
O(σ) comparison and exponential separation concern these representations, NOT
fully labeled strings in BPE tokens. This distinction directly motivates the
shape-only collision test and paying every preorder field.

2. Munro, Nicholson, Seelbach Benkner, Wild, **Hypersuccinct Trees**, ESA2021,
DOI10.4230/LIPIcs.ESA.2021.70; arXiv2104.13457.
https://www.wild-inter.net/publications/munro-nicholson-seelbach-benkner-wild-2021
— author page actually fetched. It describes tree covering into microtrees and
Huffman coding their types, universal for listed tree-shape source families.
The 1.736n+o(n)-bit expected result concerns random BST shapes / RMQ of random
permutations, not arbitrary labeled words or tokenizer costs. KARTES does NOT
implement hypersuccinct coding, so it inherits no such compression guarantee.
The arXiv PDF fetch failed; the Siegen PDF URL redirected to a university landing
page and was NOT read as a paper. These failures are not paper verification.
The author domain had earlier citations in the repository (x145 and z36); the
specific new paper URLs had no prior tracked citation matches in the bounded
search. New searches do not justify a claim that every returned website is new.

3. Search-only rejected leads include LogShrink (arXiv2309.09479), subsequence
template patents, and dictionary prompt compression arXiv2604.13066. System-prompt
dictionaries and downstream similarity are not our exact single-chat contract.

## Proof retrieval receipts

`research-fetch.py` freshly retrieves19 previous pinned source interfaces;
`research-followup.py` retrieves10 further files. All29 fetches succeeded and
have immutable commit paths and SHA256 receipts. Files are in ignored cache to
avoid vendoring unrelated proof libraries. Re-fetch scripts preserve provenance.
No Lean/lake executable was found, no proof library was built, no comparator or
ZK verifier was run. Retrieved audit records are AUTHORS' reports, not ours.

### OpenAI

Fresh primary-announcement search:
https://openai.com/index/sharing-ai-progress-in-mathematics/
A separate criticism page was fetched:
https://redreamality.com/blog/ai-math-verification-lean-faithfulness/
This domain was already cited in antiphon/x44; it is a revisited source, not new.
It raises statement correspondence, withdrawn dependencies and trust-chain issues;
we checked primary README/history rather than importing commentary as theorem.

Deeper dependency inspected: BinaryArithmetic → Computation. `Trace step n a b`
requires successful transitions; `RunsIn` is ∃n≤bound, Trace step n a b. It does
not define the running time of an arbitrary mathematical function by fiat. The
full-adder definition is an explicit Boolean operation; this is not a practical
fast SAT solver, a minimum-token search algorithm, or a proof that current codec
search can be accelerated. The existence/implementation/resource correspondence
must remain separate.

Fresh `openai/math` history at3344da5 includes November23–24 entries (VP/VNP,
matrix multiplication, strongly polynomial LP). These postdate the session;
no claim based on those entries is accepted here. Historical withdrawal records
also demonstrate why a source collection is not a blanket verified theorem set.

### Anthropic: zeta, FLT, and machine bounds

Primary zeta page actually fetched:
https://www.anthropic.com/research/riemann-zeta
It explicitly describes a proportion-of-zeros result and says the RH attempt did
not succeed. Its linked repository was followed at11b6c7e: zeta23/Challenge.lean,
AUDIT.md, README.md, comparator.json. Challenge specifies asymptotic ε-statements
∀ε>0 ∃T₀ ∀T≥T₀, (c−ε)N≤X, distinguishes distinct/simple and multiplicity counts,
and uses windows (T₁,T₂] in the open critical strip. A positive fraction is NOT
∀ nontrivial zeros, Reρ=1/2. For Dirichlet analogues the character is primitive
and modulus q>1. Those hypotheses cannot be dropped.

Challenge-side `sorry` placeholders are deliberate specification holes; seeing
one is not by itself evidence that Solution uses sorry. The comparator config
lists17 theorem names, standard permitted axioms and nanoda enabled. We did not
execute it. AUDIT contains revision history with differing theorem counts;
we do not conflate historical output with a fresh replay. Public reports of a
November20–21 full RH proof are beyond the session cutoff and unverified here.

FLT: re-fetched pinned proof path/Galois representation definitions, with explicit
ring/field/action/scalar tower assumptions. No end-to-end13-million-line proof
check. This is formalization of prior mathematics, not a newly solved open FLT.

Machine bounds: RunFor → Compare followed one dependency deeper. `visit_work`
decreases remaining nodes, `fold_done` requires enough list/fuel length, and
`cmp_eq` links the traversal to serialized length. This is relevant as a design
principle for bounded decoder work, not a free proof of our implementation.

### DoubleAI

New primary page fetched:
https://www.doubleai.com/research/double-agent-discovers-record-breaking-ecdsa-cracking-circuit
and pinned double-zkp-ecc README at969ea21. The statement covers at most993,181
average executed non-Clifford gates,1,205 logical qubits and11,000,000 operations,
and correctness on9,024 hash-derived distinct-x test inputs. Even a valid ZK
proof of this statement is not a proof of correctness on every possible input.
No quantum simulator or ZK verification ran here. None of these costs is BPE or
our Node runtime. This reinforces checking exactly what a receipt certifies.

Previous chess certificate interface followed Circuit → Cnf. `litVal` has a
negative/zero branch, while `WF` separately requires l≠0 and |l|≤nv. `check_iff`
relates Boolean evaluation to clause satisfaction, not automatically to chess
legality, exhaustive certificate coverage or existence of a63-move witness.

### Google DeepMind / Gemini

Fresh paper first chunk fetched:
https://arxiv.org/html/2605.22763v1
The authors describe bounded formal proof-search experiments, including failures
and misformalizations, not a universal mathematics solver. Re-fetched the pinned
Erdős741(i) source and density/interval dependencies. Positive upper density versus
ordinary density is a statement-level distinction; finite interval counting
requires the relevant locally finite order instances. Neither implies token
savings or native word reconstruction. No source was kernel-replayed.

### Harmonic

Fresh query returned secondary API/verification coverage, including one future
November25 item, excluded from current claims. Re-fetched IMO2025 P3 and its
Imports/Attrs wrappers. Positive-natural Bonza hypotheses and the extremal
constant4 are not an unrestricted integer theorem. `#print axioms` in a source
file is not output from executing it here. No API invoked.

### ByteDance Seed

Fresh primary search result:
https://seed.bytedance.com/en/blog/seed-prover-1-5-advanced-mathematical-reasoning-through-a-novel-agentic-architecture
The page reports contest/benchmark formal proving; not a codec theorem. Re-fetched
P3 integer-domain endpoints and positive-input/value constraints. Exponents use
`toNat`; transporting the theorem to all integers requires additional reasoning.
No local kernel or equivalence check with Harmonic's formulation.

### xAI and others

The fresh xAI-specific search returned secondary/general lists, not an inspected
xAI primary proof artifact. No xAI theorem certified. It would be false to call
this exhaustive for all labs, all new problems or all proof dependencies.

## Conclusion

Useful transfer: explicit statement/implementation/resource correspondence;
finite traversal invariants; adversarial checks against quotient-object mistakes;
replay after repair. No examined mathematical announcement establishes general
paid text compression or tool-free native decoding. The terminal codec/global
optimum is neither found nor shown impossible by this review.


Additional live source cross-check: the Liverpool research-output page was
fetched at https://liverpool.ac.uk/people/sebastian-wild/publications (redirected
to /research-outputs). It lists Hypersuccinct Trees and links institutional record
3138941. The specific page had no tracked prior citation matches in the bounded
check (`receipts/liverpool-prior-check.txt`). This verifies a publication listing,
not its proof, and does not prove that the whole domain was never searched.
