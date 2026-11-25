# X179 live research and individual proof interfaces

Session cutoff 2026-11-14. Search/fetch and pinned GitHub retrieval actually ran.
No theorem kernel, independent agent, expert reviewer or native-model endpoint
ran. This is not an exhaustive survey of ALL newly solved mathematics.

## Adaptive coding and tree state

- Antoniou, Kampouris, Theodoridis and Tsakalidis, *Splaying for Compression: An
  Experimental Study*, PCI 2011, pp.90–94, DOI10.1109/PCI.2011.19. Bibliographic
  record/abstract found; attempted author-site fetch failed. The reported
  experiments concern splay/chain-splay variants, not KLADOS's move-to-root rule.
  No claimed percentage improvement is imported or reproduced. [1](https://www.semanticscholar.org/paper/Splaying-for-Compression:-An-Experimental-Study-Antoniou-Kampouris/8b1b78f80a4407c72c8bde111be4b6dbc41c5f5d)
- Gagie, *Simple Worst-Case Optimal Adaptive Prefix-Free Coding*, ESA2022,
  DOI10.4230/LIPIcs.ESA.2022.57. Primary PDF opening/algorithm sections fetched.
  Known finite alphabet, single-pass adaptive prefix-free binary transmission,
  word RAM with Ω(log n)-bit words. It gives O(n) encode/decode time and
  n(H+1)+O(n/log n+σ²log²n) bits; the lower-order optimality regime requires
  σ=o(sqrt(n)/log n). These are not fixed-tokenizer, in-band-instruction or
  native-chat guarantees. KLADOS does not implement this algorithm. [4](https://drops.dagstuhl.de/storage/00lipics/lipics-vol244-esa2022/LIPIcs.ESA.2022.57/LIPIcs.ESA.2022.57.pdf)
- Gagie, *Worst-case optimal adaptive alphabetic prefix-free coding*,
  arXiv2109.02997v5, dated Jan7/8 2026 in the fetched primary PDF. Requires
  alphabetic prefix-free binary codes, online emission, word-RAM and the
  restricted alphabet-size regime. The author explicitly calls it more
  theoretical than practical, notes intermittent updates rather than maintaining
  optimal static alphabetic codes, and says it was not implemented. “Checked by
  AI” in the paper is not a local kernel proof. [5](https://arxiv.org/pdf/2109.02997)

The modal trap here is particularly direct: a compressed binary tree path is not
a cheap language-model token, and the source alphabet is not a free dictionary.
KLADOS exposes both first occurrences and a complete update contract. Move-to-root
uses repeated single rotations; it is NOT zig-zig splaying. Neither splay's
amortized bounds nor an adaptive Shannon-code redundancy theorem transfers to it.
Classical splay compression dates to Jones (1988); it is ancestry, not a new
within-20-years discovery. Recent papers motivate the experiment, not novelty.

The current lexical inventory covers 422 other module files. No exact splay,
move-to-root or self-adjusting-tree term hit was found in the initial focused
source search. This is bounded novelty triage, not exhaustive semantic originality.
Adjacent mechanisms inspected: MNEMA lexical-prefix history, DEIKTIS suffix
context copies, DIADOCHI routed queues, DENDRON brace trees, DIATHESIS ranks,
PINAKAS bumping, KYKLOGRAF LF cycles. Tree-state-dependent path addressing is the
specific added mechanism, not a renamed external dictionary.

## Individual lab/project follow-ups

Nine pinned files are recorded in `receipts/research-artifacts.json`. Prior pins
are deliberately retained for deeper interfaces; this is fresh retrieval, not a
claim that every file or result was newly discovered today.

### OpenAI

Followed SqrtLogSpace/Final into `Statement.lean`. The file explicitly says it
**does not assert existence of the required counting program**. Its transport
lemma assumes width-bounded CNF, n≥20, nonnegative C and A, and natural degree d.
It converts encoded input size into a declared polynomial size with changed
constants/exponents. Program existence remains in the previously inspected
compiled endpoint/import graph. No kernel replay, practical SAT implementation
or codec optimizer follows from this numerical transport lemma.

### Anthropic formal-math

Re-fetched CountedToPadded/Defs to keep machine-step, word comparison, fuel and
room definitions attached to earlier RunFor/Need interfaces. Polynomial-time
individual steps and sufficient resources cannot be omitted. This source
inspection does not instantiate any theorem for KLADOS or prove practical speed.

### Anthropic FLT

Re-fetched PROOF-PATH to retain the declared import/trust path and previous
FinalCheck interface. The guarded axiom report remains source code until run;
the delegated FLT theorem graph was not compiled. The matching positive/nonzero
natural-argument wrapper is not a new proof validation.

### DoubleAI

Followed All63/Trust into `All63/Enc.lean`. `countPhase` weights legal-move wires,
adds all-check implications and a threshold constraint. `G(c)` is specifically
`(c.encode 64).toCnf`, not a 63-move existence witness. The UNSAT family thus needs
the encoding-to-chess equivalence plus the 7,224 certificate checks, while an
attained 63-move board is a separate obligation. None was kernel-replayed here.

A fresh primary girth-result page reports, for each prime power q, explicit
(q³+1)-regular families with girth ≥(8/5)log_(q³)n−O(1), and describes determinant
nonvanishing/divisibility/displacement certificates. The linked PDF fetch failed;
the ZIP was not replayed. Thus this remains a lab-reported result, not a verified
proof imported into the codec. Large girth is not unique source reconstruction
or a BPE compression bound. [1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory)

### Google DeepMind — one earlier definition gap narrowed

Retrieved AlphaProof's pinned `lake-manifest.json`, then followed its exact
formal-conjectures revision 7862bf6a6976c26acb086b6b2cec12ad1d92ce5d into
`FormalConjecturesForMathlib/Data/Set/Density.lean`. `HasPosDensity S A` is
`∃ α > 0, S.HasDensity α A`, where HasDensity requires a limiting density. It is
NOT merely positive limsup; upper/lower densities are separately defined.
This materially narrows the previously uninspected Erdős741(i) statement
interface. It still does not compile the proof or verify all imports, and supplies
no compression optimality theorem.

### Harmonic

Separately re-retrieved IMO2025P3 on positive-natural bonza functions. Its
least-constant/extremizer and divisibility conditions remain material. No local
axiom report or theorem-kernel replay occurred.

### ByteDance Seed

Separately re-retrieved IMO2025/P3 with its integer formulation and positive-input
hypotheses. It is not automatically equivalent to Harmonic's formulation merely
because the problem title matches. No kernel replay or codec consequence claimed.

## Exact open interface

Known inverses and bounded binary-coding results do not close paid BPE gains,
encoder runtime, broad heldout utility, or native-model execution. The repository
must measure those separately. Searching more papers cannot substitute for
missing native access, and an exhaustive all-labs audit has not been achieved.
