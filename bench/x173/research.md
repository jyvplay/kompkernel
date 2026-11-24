# X173 research ledger (task date 2026-11-14)

## Executed systems and access limits
Node/npm, Python, TypeScript/esbuild, git/gh, web search/fetch and process tools
were used. No independent-agent tool, simulator, external basic-chat decoder,
connected-app database, GPU training run or theorem prover was used. lean/lake/
coqc were absent. npm ci installed repository dependencies. Parallel web requests
and background OS processes are actual tool calls, not simulated agents.

## Reconstruction literature — new searches and hypotheses
Search terms included unique reconstruction from bigram counts, unordered
transition spectra, Euler-trail ambiguity, repeat replacement and unique
shingle decoding. Columbia, the sequencing course site, McMaster and bibliographic
sites surfaced; whether every domain is new to all prior repository research has
not been exhaustively established.

1. Gabrys and Milenkovic, *Unique Reconstruction of Coded Strings from Multiset
   Substring Spectra*, IEEE TIT65(12),7682–7696(2019), primary PDF fetched:
   https://arxiv.org/pdf/1804.04548 . Search bibliographic confirmation:
   [2](https://dblp.org/pid/15/11153.html).
   Domain: binary codebooks X⊆{0,1}^n; reconstruction from all length-L
   substrings with multiplicity. Repeat replacement constructs constrained
   codewords so repeats cannot create assembly ambiguity; the introduction
   states two redundancy bits can reduce the required fragment length from
   O(n) to O(log n), with O(n²log n) operations. This is coded reconstruction,
   not a promise that transmitting all overlapping fragments compresses arbitrary
   prose. Codebook restrictions, pointers/markers and reconstruction access must
   be retained. Noise/coverage extensions require their own hypotheses, not used
   here. A2026secondary summary of this work is not a new2026theorem.
2. Filtser, Jin, Kontorovich, Trachtenberg, *Efficient determination of the unique
   decodability of a string*, primary PDF labeled isit2013e.dvi, retrieved:
   https://www.cs.columbia.edu/~arnoldf/papers/uniqueDecodability.pdf .
   It describes a streaming Θ(n+|Σ|)-time/O(|Σ|)-space test for bigram unique
   decodability under constant-time alphabet-symbol comparison; nonconstant
   symbol access adds factors. Marked start/end and multiset multiplicities
   matter. It also distinguishes finding an Euler cycle from finding the unique
   reconstruction. MONODROMOS uses a simpler bounded residual-feasibility test,
   not this paper's linear-time algorithm, and makes no inherited linear bound.
3.2018lecture retrieved:
   https://data-science-sequencing.github.io/Win2018/lectures/lecture7/ .
   Dense read model means one read at every source position. Interleaved/triple
   repeats can produce distinct strings with identical observed spectra; sparse
   read claims require bridging. The pictured forced-return example illustrates
   why choosing an arbitrary local outgoing edge can fail. We test our own exact
   finite counterexample instead of calling the diagram a kernel certificate.
4. McMaster's2024*Reconstruction From Noisy Substrings* search lead
   [4](https://www.ece.mcmaster.ca/~schwam10/publications/MSjrnl71.pdf): direct
   fetch failed. No theorem from the snippets is treated as verified or imported.

## Exact interface used by the new module
Directed Euler existence for a nonempty multigraph with fixed start requires
weak connectivity of its non-isolated vertices and either all degree balances0,
or start balance+1, one end balance−1 and all others0; start must be non-isolated.
Adding end→start in the open case reduces to a balanced connected graph, whose
Euler circuit gives a trail after deleting the added edge. At each decode step,
a target is viable iff consuming one edge leaves such a trail from that target.
Two distinct viable targets give distinct first-next labels and hence two
reconstructions. One viable target is forced; induction gives uniqueness.
Parallel copies with the same endpoints are indistinguishable, so their edge-ID
permutations do not count as different texts. Labels exclude ASCII spaces/LF,
so joining with spaces is injective on field sequences with empty fields retained.
This is a hand argument with exhaustive finite oracle tests, not a Lean proof.
The open interface is complete token economics and actual native-chat execution.

## Individual lab refresh / deeper interface inspection
Pinned files, byte counts and hashes are in receipts/research-artifacts.json.
The five previously inspected lab files were refetched; relevant OpenAI and
Anthropic dependencies were followed a further layer. No kernel/dependency build
or exhaustive proof audit ran.

* **OpenAI:** LiveRatedRowCharges.lean contains
  `RatedSelection.chosenRows_packed`. It assumes an existing RatedSelection,
  equality of worker tables, n>=2048, degree/label/width/depth bounds and terminal
  data. The proof transports report lists to a packed table and inherits probe/
  event bounds from `R.chosenRows`. It does not establish existence of R or
  discharge the whole VP≠VNP claim. Representation equivalence can preserve a
  cost theorem, but only after checking the representation equation and premises.
* **Anthropic:** CountedToPadded/Defs.lean explicitly says it contains definitions
  and statements, not proofs. `RunForIsRight` requires an existing bounded run,
  sufficient unary fuel and room>=7*S+2. `RunForPoly` is polynomial in unary fuel,
  unary room and input, under polynomial step machinery—not in the unpadded
  original input alone. `SolverOfMachineLevels` additionally requires Solves,
  Levels, ComputesLevels, NumberBetween and an IsPolyQ certificate; conversion
  changes the constant to2*C0+1 and uses cutNumber. The full ETH result was not
  audited. This is directly relevant to not hiding encoder search/padding costs.
* **Google DeepMind:** erdos_741.parts.i.lean refetched. B_partition_density and
  SandorA_fluctuation_bounds require the stated disjoint partition, existing
  positive sumset densities and their specific constructed sets. No universal
  density conclusion or compression theorem is imported.
* **Harmonic:** IMO2025P3.lean refetched; finite_S_constraint needs isBonza plus
  finite, nonempty S. Empty/infinite cases cannot be dropped. Source only.
* **ByteDance Seed:** IMO2025/P3.lean refetched; the valuation lemma
  lte_2_3n_minus_1 assumes positive integer n and has a parity branch. Its n=0
  boundary is outside the theorem. No complete Olympiad proof replay.
* **DoubleAI:** new primary repository inspection of `double-ai/double-check`
  pinned at d2fc22e3bc0b675acc18dd53d8e3003c8eceae3a. The actual All63/Final.lean
  upper-bound theorem uses `allcheck_le_63_of routeB_facts`; All63/Axioms.lean
  has **7,224** explicit Unsat axioms. All63/Trust.lean also offers Route A:
  `routeA_case` requires `lratBytesOk bytes = true`, then derives Unsat.
  README openly documents the axiom route and external LRAT checkers, ~25GB
  Lean-build memory and substantial re-solving costs. We did NOT replay those
  certificates. The lexical audit is receipts/research-audit.json. This does not
  refute the mathematical claim; it identifies the exact unexercised trust layer.
  The new chess lead was [2](https://www.doubleai.com/research/maxwell-chess-record-63-checks).
  Earlier girth research was refreshed by search
  [1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory),
  but its entire proof was not re-audited. Large girth does not imply unique
  Euler ordering or a free lossless text representation.

Secondary FLT/RH/Navier–Stokes/UGC headlines are not adopted as verified facts.
A Nov24search result lies beyond the task date and is excluded from current
claims. We have not searched or verified ALL newly solved mathematical problems
or every frontier lab. No proof kernel or expert review was available to close
that scope. Transferable method: distinguish a conditional assembly theorem,
a definition of a success predicate, and an actually checked certificate.
