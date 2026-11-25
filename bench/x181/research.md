# X181 live research and theorem-interface audit

Session cutoff **2026-11-14**. No theorem kernel or native model was invoked.
The search service returned later-dated November 20–24 RH coverage; it is not
accepted as established evidence within this cutoff. The prior date confusion
is not resolved by pretending a search snippet overrides the supplied date.

## New search directions and recent papers

Actual queries included `2023 2024 2025 compression bijective text transform`,
`2024 2025 word compression permutation lossless`, `Foata second fundamental
transformation words algorithm inverse 2022 2023 2024`, `Foata compression
transformation`, and `2024 2025 Mahonian words bijection Foata`. Searches are
bounded, not an exhaustive literature or all-codec semantic audit.

1. Corteel, Elizalde and Savage, *Partitions with constrained ranks and lattice
   paths*, arXiv:2211.08933, November 2022; ECA 2023 version. Primary arXiv PDF
   opening material fetched; the Haifa journal PDF request failed HTTP 502.
   https://arxiv.org/pdf/2211.08933
   https://ecajournal.haifa.ac.il/Volume2023/ECA2023_S2A18.pdf
   Objects are partitions with positive weakly decreasing parts, successive ranks
   λ_i−λ'_i, and words with fixed counts of two letters / lattice paths. Their
   enumerative formulas have explicit m,n≥0 and rank-range hypotheses; e.g.
   Theorem 1.1 restricts −n≤ℓ≤1. We do not import the formula as a token bound.
   Their use of Foata motivates a different content-preserving preconditioner.
2. Irving, Košir and Mastnak, *A Proof of the Box Conjecture for Commuting Pairs
   of Matrices*, arXiv:2403.18574v2. Primary opening/theorem material fetched:
   https://arxiv.org/html/2403.18574v2
   The returned page identifies a 2024 arXiv version but displays an August 2026
   manuscript date; both are within five years, and the discrepancy is recorded.
   The dense-orbit setup fixes an infinite ground field; the abstract states the
   proof is valid over an arbitrary field. That extension was not audited here.
   Theorem 1 identifies D(P) with the descending indices of βα descents in a
   partition's Burge code. This is not an injective encoding of arbitrary prose
   by its descent positions: order information can be lost by taking a statistic.
   FOTIA implements neither Burge codes nor the matrix theorem.
3. Foata, *Rearrangements of Words*, chapter 10, classical source fetched from
   the author's Strasbourg site, including §10.6's invariant derivation:
   https://irma.math.unistra.fr/~foata/paper/pub43.pdf
   This is ancestry, **not a recent invention**. For finite words over a totally
   ordered alphabet, Φ is a content-preserving bijection with inv(Φ(w))=maj(w).
   Repeated symbols are allowed; <= and > must be paired exactly. The published
   example 442341323→321444323 is an executable test in test.ts. This identity
   neither reduces symbol entropy nor bounds complete BPE tokens or native
   reasoning cost. We implement bounded blocks and both transform directions.
4. Jeon and Köppl, *Compression Sensitivity of the Burrows–Wheeler Transform and
   Its Bijective Variant*, Mathematics 13(7), 1070 (2025), was found by search:
   https://doi.org/10.3390/math13071070
   Search describes run-length sensitivity under edits/alphabet reorderings, not
   a universally beneficial transform. Full proof not audited. BBWT already
   exists in this stack; a BWT rename would not satisfy the novelty request.

The Haifa and Strasbourg source URLs are new to this investigation; we have not
proved that no earlier repository document ever referenced their hostnames.
No claim that a mechanism was absent from model training can be verified.

## Repository novelty comparison

Focused search over 424 omega module files found no Foata, Mahonian, major-index
or fundamental-transformation terms. `receipts/novelty-search.log` is the empty
search output, not proof of semantic absence. FOTIA rotates comparison-delimited
blocks as each field is inserted; there is no suffix sort or LF mapping
(KYKLOGRAF), primary rotation index (ordinary BWT), insertion/recording tableau
(PINAKAS), adaptive search tree (KLADOS), deterministic omission rule (APOUSIA),
FIFO successor stream (DIADOCHI), Euler uniqueness solver (MONODROMOS), grammar
node queue (STOIBAS), numeral grammar (LEXARITHMOS), Caesar map (KRYPTOLYSIS),
suffix copy pointer (DEIKTIS), frozen numeric-context collation (SYMFRAZ), marker
cycle (KYKLOS), or length-sum disambiguation (METRIDA). General permutation
ancestry remains. Exhaustive originality against all semantic variants is open.

## Individually pinned lab/project follow-ups

`receipts/research-artifacts.json` records 14 actual GitHub file retrievals with
commit and SHA256. Nine older pins were fetched again and matched their prior
hashes; five dependency-interface files were newly followed. This is source
inspection, **not proof verification**. Cached copies are excluded from Git;
pins and paths make retrieval reproducible. No exhaustive ALL-labs audit is
claimed. Fresh lab searches also used DoubleAI girth/certificate and DeepMind
AlphaProof conjecture phrases; publicity was not substituted for code checks.

- **OpenAI:** followed SqrtLogSpace/Statement into EncodingBounds. `countWord`
  stores least-significant-bit-first binary, including [false] for zero. Its
  decode theorem and `countWord_length_le` require a≤2^n for an n+1-bit bound.
  This narrows the exact output encoding interface, not existence of the finite
  counting program explicitly absent from Statement. Binary length is not a
  human-readable BPE-code bound; no SAT program or compiled theorem was run.
- **Anthropic formal-math:** followed CountedToPadded/SolverPoly. `onTablesIsPoly`
  assumes a query machine with IsPolyQ and lookupIsPoly; solverOfMachinePolyFrom
  consumes an hRun/RunForPoly premise, polynomial `num`, and resource encodings.
  “Solver is polynomial-time” cannot erase those assumptions, construction
  constants, unary room accounting or the separate RunFor theorem.
- **Anthropic FLT:** followed PROOF-PATH into Def_FLTPrelim_GaloisRep.
  Irreducibility explicitly includes Nontrivial torsion and absence of nontrivial
  Galois-stable ZMod-n submodules. Action is through algebra automorphisms; the
  noncomputable algebraic-closure equality instance is not an executable codec
  optimizer. This checks definition alignment only, not the large delegated FLT
  proof graph or its axioms.
- **DoubleAI:** followed All63/Enc into Geom. `rayL` uses eight board steps,
  `between` tests direction/ray membership, and `toSq n` reduces modulo 64.
  Hence arbitrary unbounded integer coordinates cannot be silently equated with
  distinct board squares; encoding ranges are essential. Certificate validation,
  legal-position equivalence and the 63-move witness remain separate unexecuted
  obligations. The fresh girth-result search again reports prime-power q,
  degree q³+1 and (8/5)log_(q³)n−O(1), not a general prose coding theorem:
  https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory
- **Google DeepMind:** rechecked the pinned positive-density definition and
  Erdős741(i) source. Density is a limit, not just positive limsup. The local
  `infinite_of_hasDensity_pos` has nonzero-density hypotheses. That does not
  prove uniqueness of finite reconstruction or provide an algorithm/token bound.
  No AlphaProof proof graph was compiled.
- **Harmonic:** rechecked main_theorem and followed Imports→Attrs (Attrs itself
  remains uninspected). The theorem takes an IsBonza predicate plus an explicit
  equivalence to a congruence property on positive naturals and states the least
  real constant is 4. Its `#print axioms` is source text until executed.
- **ByteDance Seed:** rechecked the integer-domain P3 endpoints, which require
  positive inputs and positive function values; natural exponents use toNat.
  The ≤4n and matching existential construction statements are not automatically
  equivalent to Harmonic's wrapper without domain transport. No kernel replay.

## Riemann and the exact remaining interface

Fresh query: `Riemann hypothesis proof November 2026 Alpoge primary Lean
verification`. Results were secondary pages dated November 20–24, beyond this
session cutoff. Their reported certification is neither denied nor independently
confirmed here. We have no locally pinned RH proof, theorem-comparison output,
axiom report or kernel replay. Even a valid RH theorem would not by itself give
an exact, cheaply tokenized, native-chat inverse or contradict counting bounds.
Those are separate interfaces that require a concrete construction and tests.
