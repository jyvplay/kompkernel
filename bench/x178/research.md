# X178 live research, cutoff 2026-11-14

## New construction leads

1. Cain, Malheiro and Silva, *Combinatorics of patience sorting monoids*, Discrete Mathematics 342(9), 2590–2611 (2019), DOI 10.1016/j.disc.2019.05.022. Publisher abstract/opening fetched. It distinguishes ordinary Robinson–Schensted words→(semistandard insertion tableau, standard recording tableau) from patience-sorting variants, whose image conditions matter. We use ordinary row insertion, **not** an assumed bijection for arbitrary patience-sorting pairs. No compression theorem is imported. [3](https://www.sciencedirect.com/science/article/pii/S0012365X1930175X)
2. Barbay and Navarro, *On Compressing Permutations and Adaptive Sorting*, TCS 513 (2013), 109–123. Author abstract fetched on a new author-site lead. For a permutation of [1..n] decomposed into sorted blocks of lengths R, it reports a representation using n(1+H(R)) bits and adaptive construction/access bounds; uniform query distribution is needed for the stated average bound. This is a bit/RAM representation of a permutation—not a paid BPE bound for text, nor native-chat behavior. We do not claim PINAKAS implements this data structure. [3](https://users.dcc.uchile.cl/~gnavarro/abstracts/tcs13.2.html)
3. TauCeti PR 13730, created Oct 9, 2026, *the Robinson–Schensted correspondence for words*. Primary PR and two pinned source files retrieved. It describes a bijection between words over a linear order and a tableau plus a lattice recording word with matching row counts. This directly motivates the codec's record/shape checks. The PR's title says “Merged by Bors” but GitHub reports CLOSED with null mergeCommit/mergedAt; we report those fields, not a fabricated merge event. The displayed AI review explicitly says dependency inspection failed due to sandbox initialization. Neither that approval nor the Lean source is a local kernel verification. [4](https://github.com/TauCetiProject/TauCeti/pull/13730)

The mathematics is classical. New repository work is the bounded ASCII-field,
fixed-block, paid-parent representation and its tested reverse-bumping decoder.
The recording word is indispensable: `[b,a,c]` and `[b,c,a]` have the same insertion
tableau but different recording rows. The executable test asserts this collision.
It is a concrete disproof of “sorted tableau alone encodes the source.”

A lexical inventory found no Schensted/tableau codec in the production source
modules, but this is not an exhaustive semantic novelty proof. Related existing
work includes VALENCE source sorting, DIATHESIS factoradic rule-order carriers,
STROFOS rotations, KYKLOGRAF LF cycles, SYMFRAZ context collations and MONODROMOS
transition multisets. PINAKAS's distinguishing operation is reversible bumping
through insertion rows with an explicitly paid recording sequence. This is not
an AI-native miracle and does not inherit anyone else's compression gains.

## Individual lab follow-ups

All nine fetched artifacts have repo, commit, path, byte count and SHA256 in
`receipts/research-artifacts.json`; caches are untracked. Seven prior lab/project
pins were reused deliberately; retrieval is fresh, not discovery of seven new
proofs. No Lean/lake/Coq executable is installed. No full imported proof graph was
compiled or audited. `#print axioms` and guard directives are source, not results
of executions here.

- **OpenAI:** followed the prior Main entry into `SqrtLogSpace/Final.lean`.
  `compiled_exact_count_and_sat` fixes width k≥2, then existentially chooses a
  program/constants, then quantifies all n and width-bounded CNFs. The output is
  exact count plus SAT bit on designated tapes. Space is bounded on **every
  prefix** of the primitive trace, not merely final configuration size. The
  separate polynomial-space SAT theorem assumes k≥3. Small-input fallback and
  compiler overhead are explicit. We did not compile its imported NativeLargeEntry
  proof, instantiate its constants, or obtain a practical JavaScript solver.
- **Anthropic formal-math:** retrieved CountedToPadded/Need again to keep the
  interface attached to its polynomial-step, fuel and room assumptions. The
  previous RunFor inspection does not remove those requirements. No statement
  about unrestricted polynomial SAT or useful codec search follows.
- **Anthropic FLT:** FinalCheck has a guarded expected axiom list and bridges
  positive natural witnesses into Mathlib's nonzero form. This closes a written
  statement interface, not the imported theorem kernel execution; the downstream
  FLT graph was not audited here.
- **DoubleAI:** All63/Trust defines `UnsatFacts := UnsatFamily 7224 G63` and derives
  it from a `RouteA` witness; a per-case theorem requires `lratBytesOk = true`.
  Merely retrieving this file supplies neither the 7,224 witness checks nor a
  proof that all chess-rule modeling obligations match the informal problem.
- **Google DeepMind:** Erdős 741(i) re-retrieved individually. The source's
  positive-density sumset counterexample does not give a universal text coding
  bound; imported `HasPosDensity` and dependency verification remain open here.
- **Harmonic:** IMO2025P3 uses positive-natural bonza functions and a least-constant
  target. Its divisibility/extremizer interfaces are different from the next
  project's integer formulation. No fresh theorem-kernel result is asserted.
- **ByteDance Seed:** separately retrieved IMO2025/P3's integer formulation with
  positive-argument hypotheses and distinct upper/attainment statements. Shared
  problem title is not mutual verification, nor a compression theorem.
- **TauCeti / Claude-Code-attributed work:** independently of the above lab
  claims, inspected `LinearOrder α`, `IsLatticeWord` (every prefix has at least as
  many i's as i+1's), the image theorem and reverse-insertion documentation. Those
  match the intended structural interface; no Lean-to-TypeScript refinement or
  local proof replay exists.

## Excluded search results and limits

Broad searches returned sensational math-news pages dated November 21–24, after
our November 14 cutoff. They are excluded rather than used as verified results.
No claims about newly proved Riemann/VP≠VNP/etc. are imported from these pages.
The request to evaluate **ALL** newly solved mathematics has not been achieved;
this is a bounded, individually documented primary-source investigation. None
of these sources proves native-model decoding, universal optimal text coding,
or a measured speed improvement for this repository.
