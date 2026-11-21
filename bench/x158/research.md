# X158 live research / theorem boundaries

This is a selective source audit, not an exhaustive audit of any lab's work.
No Lean/lake executable was available, so nothing below is a kernel replay.
Remote revisions observed in this run are in receipts/research-revisions.txt;
source copies retain separate repository license files. Dates in upstream
content are treated as publisher metadata, not evidence of experimental truth.

## Compression papers (past twenty years)

1. Stoian et al., **Virtual: Compressing Data Lake Files**, EDBT 2025.
   https://openproceedings.org/2025/conf/edbt/paper-298.pdf
   Fresh search and PDF first-chunk retrieval. Sparse linear functions and
   k-regression remove dependent columns; optimizer avoids cycles, using
   exponential subset selection or a greedy fallback. Efficient column scans
   are part of its objective. This supports the dependency-coding branch, not
   native-chat decoding or o200k improvement. Arithmetic cell values must still
   preserve lexical formatting to qualify as our byte-exact source codec.
2. **Tokenization as Finite-State Transduction**, Computational Linguistics,
   2025, https://dx.doi.org/10.1162/coli.a.23 . Fresh search only. Canonical
   BPE/MaxMatch tokenization can be represented through transducers; automaton
   size and rule ordering matter. A character-level reversible transducer does
   not thereby minimize token cost. No theorem from this paper was replayed.
3. **Lossless Compression of Large Language Model-Generated Text** (2025),
   https://arxiv.org/pdf/2505.06297 . Fresh search only. Binary/dictionary/neural
   compression comparisons do not establish one-message human/model-readable
   compression. No numerical finding was transplanted to this repository.

Classical periodic tab stops are older than this window; they are antecedents,
not a new paper contribution. Elastic tabstops differ because their widths
are data-dependent. A formatter search also surfaced a string-content
corruption fix: syntax-aware whitespace rewriting is not source-byte equality.
BEMATISMOS intentionally transforms even quoted spaces, but its inverse must
restore every one; semantic equivalence alone is inadmissible.

## Lab-specific mathematical inspection

### OpenAI

Pinned openai/math revision 4eaee87548250b2682affda7d05d947c05554bae,
`lean/OAI/Algorithms/SubexponentialSAT/SqrtLogSpace/NativeLeafRun.lean`.
The saved source hash was compared to a pinned API retrieval and matched.
The file composes preparation, rounds and acceptance; command-of-evals accepts
query programs/evaluation hypotheses. Comments explicitly retain native-query
execution seams. Thus a composition theorem is not unconditional closure of
an executable SAT solver's claimed complexity. Inspect the instantiated query
bodies and all imported bounds before strengthening the claim. No result here
implies lower token cost for this text codec.

### Anthropic

Pinned anthropics/fermats-last-theorem revision
6e837e75355538c7f80bab5b956861e86c4eacc2. Inspected
`Theorems/Thm_FreyPackage_no_frey_package.lean` and its dependency
`P2M/Sol/S_FreyPackage_no_frey_package.lean`. The wrapper delegates through
p2m_exact_reverting. The solution concludes
`FreyPackage.Wiles_Frey P (FreyPackage.Mazur_Frey P)`.
This is deeper than reading the wrapper, but the assumptions in FreyPackage
and the Mazur/Wiles dependency chain still require audit and kernel replay.
A terminal theorem name alone establishes neither those assumptions nor an
independent proof of Fermat's Last Theorem.

### Google DeepMind

Pinned google-deepmind/formal-conjectures revision
d8d031d4998c78575159ccab9a7a9e95ce043883. Fresh Optimization directory listing
contains LastIterateConvergence.lean; no new executable proof was replayed.
Historical X157 source analysis is retained, not relabeled as fresh proof.
A conjecture collection must not be confused with a library of proved claims.

### DoubleAI

Fresh search of the publisher's report:
[1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory).
It reports, for prime powers q, explicit infinite families of (q^3+1)-regular
graphs with girth >= (8/5) log_(q^3)(n) - O(1), plus a matching upper bound for
one 28-regular family. Its stated determinant certificate is nonzero,
level-fourth-power divisible and bounded by tree displacement. Those are
specific quantifiers, not an all-degree graph theorem and not a compression
bound. No released Lean proof was kernel-replayed in this run.

### Other work

Virtual is database research, not an AI-lab theorem. It supplies a useful
algorithmic contrast without evidence of native reconstruction. No additional
lab is labeled audited merely to inflate coverage. Highest-information next
steps: replay actual proof dependencies in their pinned toolchains and run the
frozen native reconstruction packets through an independent basic-chat model
if an endpoint becomes available.
