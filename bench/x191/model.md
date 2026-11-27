# X191 formal model, proof obligations, attacks and outcome space

## A–G: domain, access, resource and quantifiers

An admitted source x is a UTF-8-stable JS string of at most 50,000 UTF-16 code
units. Byte identity is tested after UTF-8 encoding. The planner declines sources
containing `~` or `<|`; rejection is not compression. A total application may
fall back to an independently verified incumbent. No production fallback or
selector is changed this turn.

DIEXODOS splits only on ASCII space, retaining empty fields. Tabs, CR, LF, NUL,
Unicode and punctuation are literal data, not normalization opportunities.
Graph labels are fields of at most 96 UTF-16 units. A frame contains at most
256 source rows and 512 distinct directed edges. Rows are [label,successor
string]; splitting the successor string on ASCII spaces retains empty labels.
There is no edge multiplicity or implicit FIFO queue. Duplicate rows and edges
are rejected. An empty successor string represents the empty-string vertex,
not a row with no successors. Vertices may have no outgoing row.

The body is a field sequence. A whole field `~N;`, 1≤N≤8, denotes exactly N
missing fields. Both adjacent fields must be literal. The gap is admissible iff
there is exactly one directed walk of N+1 edges between those literal endpoints.
Walks may repeat vertices/edges; their length is fixed. Graph edges are reusable
across gaps and need not all be used. Endpoint labels are emitted once. At most
1,024 holes, 200,000 frame units and 50,000 reconstructed units are accepted.

Encoder sees source and may call the existing parent. Reader sees only the full
message (instruction + graph + body + any parent instruction). No model-specific
logits, external vocabulary, system prompt, skills, or prior chat is allowed.

C(M)=o200k_base token count of the entire jointly encoded message, not a sum of
separately tokenized parts. All graph labels, edges, punctuation, endpoints,
lengths and contracts are charged. CPU milliseconds, process wall milliseconds
and peak RSS are separate resources. A cheaper result after an extra parent
search is not automatically Pareto superior in latency.

Correctness target: ∀ admitted x, ∀ M emitted for x, executable D(M)=UTF8(x).
Tests cover a finite subset; the abstract proof below is not a compiler proof.
Native target: fix a model, configuration and isolated fresh-chat protocol
before evaluation; ∀ cases in the frozen packet, raw model response bytes equal
source bytes. There is no claimed universal ∀model ∀text success. The current
assistant has development context and cannot certify its own source blindness.
An executable inverse, even in another language, is not a native model trial.

Acceptance requires >10-token complete-message improvement on both everyday
prose and ops, confirmation on unseen sources, no fidelity loss, evidence of
all-stack novelty, actual native decoding, and measured resource nonregression.
Significant speed gate: ≥10% lower aggregate CPU AND wall in a six-lane ABBA
trial, no per-lane regression, all 24 wires identical. No tolerance for byte
errors. Parent workers have 180-second limits; a timeout supplies no token result.

Adjacent problems not substituted: semantic equivalence, normalization, binary
compression, trained embeddings, altered tokenizers, graph compression modulo
isomorphism, free dictionaries, source-conditioned evaluation, narrow raw-token
wins, graph-path uniqueness without paid labels, and fastest implementation of
an inferior representation.

## H+, H−, H∂ and thresholds

H+: an admissible codec meets the full acceptance conjunction. H−: none does in
a specified family. H∂: success depends on input distribution, side-information
cost, model or resource boundary. No finite negative screen selects global H−.
A pigeonhole argument excludes shortening every string in an exhaustive finite
source universe into fewer distinct codewords, not broad distributional gains.
Incomputability of unrestricted shortest programs is not a proof that this fixed
finite prompt/corpus optimization cannot be improved. No terminal codec claimed.

## Constructive proof and genuinely different local interface

Let c_d(v) be the number of walks of length d from v to the right endpoint,
saturated at two. Set c_0(right)=1 and zero elsewhere, then
c_d(v)=min(2, sum_{(v,w)∈E} c_{d-1}(w)). Induction on d proves that 0 means no
walk, 1 means exactly one, and 2 means at least two. Saturation is valid because
all contributions are nonnegative integers. If c_(N+1)(left)=1, exactly one
successor has positive suffix count at every reconstruction step. Thus the N
intermediate labels are unique. The planner verifies these labels against the
source before erasing them. Every right endpoint survives literally; two gaps
can share an endpoint but cannot erase one another's endpoints. Gap inversion
therefore composes globally. Joining fields reverses splitting exactly.

Post-screen repair: prune the graph to the union of edges on witnessed selected
bridges. Every chosen path remains; deleting edges cannot create new paths, so
uniqueness is preserved. The final planner checks that claim again before
emitting. A targeted finite attack constructs each unique witness's edge-induced
subgraph and compares its bridge against the original brute-force witness.
All affected codec/inverse/paid gates are rerun; initial receipts are archived
separately and are not attributed to the repaired planner.

The test enumerates all 512 directed simple graphs on three labeled vertices,
including loops, every ordered endpoint pair and gaps 1..4: 18,432 cases against
independent brute-force path enumeration. This is a complete finite check of
that regime, not proof for all 256-row graphs. Separate Python reconstruction
uses capped witness enumeration, not the TS saturated-count implementation.

MONODROMOS consumes a transition multiset exactly once at stated multiplicities;
DIEXODOS admits arbitrary reusable graph edges constrained by endpoints and
length. APOUSIA is causal deterministic-next-field omission; DIEXODOS can resolve
an actual branch using the right endpoint. DIADOCHI transmits ordered successor
queues; DIEXODOS transmits a relation. `a→{b,c}, b→d, c→e, d→z, e→y` has two
causal continuations from a but only one three-edge bridge to z. Both endpoint
choices are tested. This is a local operational separation, NOT a proof of new
mathematics or non-equivalence to every general macro/constraint codec.

## Work bounds and search status

The inverse uses O((N+1)E) work and O((N+2)V) path-count storage per gap, followed
by bounded output construction. N≤8, E≤512, holes≤1,024; JSON parsing is linear
in bounded frame length. It does not search exponentially many walks.

The encoder tests 3 edge budgets × 2 frequency thresholds × 2 maximum gap
lengths = 12 configurations; identical frames are deduplicated. It selects
frequent edges, then greedily chooses the longest eligible locally cheaper gap
at each surviving anchor. Fixed-length feasibility itself is exact, but edge
selection and gap placement are NOT globally optimal. Worst-case planning is
O(12 F K² E) plus sorting/tokenization (F≤50,001,K≤8), a loose large work bound,
not a millisecond guarantee. Parent selection is separately time-capped.

## Negative space and structure-specific attackers (20)

1. Pick any path instead of the unique path: diamond graph must reject.
2. Count edges instead of vertex-label walks: duplicate successors rejected.
3. Forget fixed length: cycles included in exhaustive enumeration.
4. Use the original source to disambiguate decoding: Python gets frame only.
5. Erase a right endpoint: adjacent/missing marker endpoints rejected.
6. Let holes share mutable edge inventory: edges reusable; endpoint test matrix.
7. Treat empty successor text as no edge: empty-field round-trip probes.
8. Drop CRLF/spaces: raw-byte checks and modal collision test.
9. Count graph dictionary as shared/free: complete message pricing.
10. Call a raw win a frontier win: use fresh canonical full wire.
11. Hide a refused reader: explicit unsupported status.
12. Hide timeouts: retained process ledger.
13. Use an unrestricted hole size: zero, nine, decimal and leading-zero attacks.
14. Expand unboundedly: frame, output, row, edge and hole caps.
15. Collapse surrogates in transport: UTF-8 stability rejects lone halves.
16. Interpret a prefix-sum/checksum as a complete code: `ab`/`ba` collision test.
17. Omit permutation rank after sorting: `a b`/`b a` collision test.
18. Trust repaired code without rerun: affected tests rerun, no inherited acceptance.
19. Equate a kernel-checked arithmetic lemma to a BPE guarantee: imported-hypothesis audit.
20. Populate native responses with program output: offline tests marked synthetic,
    actual native status NOT_RUN; provenance remains operator-supplied.

Modal shortcut: whitespace normalization maps `a  b\r\n` and `a b\n` to the
same string. Distinct sources then share one message, so any single-valued
inverse fails on at least one. `portfolio.py` and the native scorer test this;
probability, confidence and fluent paraphrase cannot recover lost bits.

## Verification and stopping

Compiler/build receipts, exhaustive finite graph tests, separate-language inverse,
reference token counts and real process timings are the verifiers actually used.
No independent agent, expert, fresh-chat endpoint, theorem prover or simulator
was used. Downloading a Lean file is not checking it. Publication on request is
separate from selecting H+. The strongest next test remains a genuine isolated
native read; this session cannot replace that missing experimental system.
