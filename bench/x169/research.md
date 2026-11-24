# X169: source-level research, not a proof audit

Session date authority: 2026-11-14 UTC. Upstream/API timestamps may disagree;
we do not infer the date from them. X168 historical receipts are not rewritten.
Fresh searches used contextual insertion grammars, RLZ-RePair, general run-length
grammars, and Seed Prover. No agents, theorem kernels or native-chat endpoints
were available. GitHub source retrieval used `gh`; downloaded scratch is ignored.
Pinned artifacts and failures are in receipts/research-artifacts.json.

## Compression ancestry and transfer

* [Maruyama et al., 2010](https://www.jstage.jst.go.jp/article/transinf/E93.D/2/E93.D_2_219/_article),
  DOI 10.1587/transinf.E93.D.219: publisher abstract freshly read. A **greedy**
  context-sensitive grammar transform and KMP compressed matching; reported
  gzip/RePair-comparable compression and faster matching are not prompt-token
  guarantees. GEFYRA has this classical ancestry, not a new general theory.
* [Varki, Gagie, Boucher, 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC12330530/):
  RLZ-based RePair preprint, DOI10.1101/2025.07.22.666196. Read first chunk:
  reference choice enables RePair grammar construction with less working memory;
  abstract reports ordinary RePair using 18–480% more memory. This motivates
  measuring construction memory separately from grammar size. No BPE or direct
  chat consequence follows; complete document, contract and reference must be priced.
* [CPM2025 general run-length grammars](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.CPM.2025.3)
  was search-only: compressed pattern-counting space/time is not serialized token cost.
  No theorem from its body is claimed inspected.

## Individually inspected lab artifacts

**OpenAI.** At f5702854040e97fa7675c21ba37a9608f5f92dd3, freshly retrieved
`FixedPaperPairCompiler.lean`. `paperPairCompiler` selects an address at least
max(laneBits,5), constructs one paper table, and applies eventual native-stage,
terminal and rated-row lemmas. This wrapper delegates the central bounds to
imports. Quantifier discipline (fixed program before exceptional length) matters;
this is not a kernel replay or an endorsement of VP versus VNP. Transfer: fix
candidate and thresholds before timing; do not adapt them after observing failures.

**Anthropic.** At 11b6c7e3c927df2658f513b6b68ea7f8929c62c5, freshly read
CountedToPadded/{Defs,Main}. The conversion is for a machine with IsPolyQ
certificate, includes arbitrary state coding, explicit written query tables,
fuel and room. Tables need not fit the padding: room includes 14 times table
word size plus seven times padding. The final theorem invokes runFor correctness,
table values, cut bounds, need sufficiency, polynomial solver and pick facts.
Removing table cost or treating a step as unit physical wall time is invalid.
Imports not recursively audited; no claim of proving or refuting the whole project.

**Google DeepMind.** Followed the alphaproof-nexus manifest to the exact
formal-conjectures dependency 7862bf6a6976c26acb086b6b2cec12ad1d92ce5d.
Read Density.lean and ErdosProblems/741.lean: HasPosDensity means existence of a
positive **limit** of partial densities, not merely positive limsup. The catalog
states different answers for natural versus upper density; lower-density variant
is listed open. Catalog theorem bodies contain `sorry` and link external proofs;
these are statements, not checked proofs. This closes one definition-reading gap
from X168, not the imported proof closure. Transfer: changing the metric changes
the claim; raw win is not incumbent win, encoder self-report not independent decode.

**DoubleAI.** Read chunk9 of [girth85.pdf](https://www.doubleai.com/papers/girth85.pdf),
Lemmas3.14–3.15/Proposition3.16. A 2k-step same-type lattice walk gives inclusion
inside pi^-k X; Witt index one restricts negative-valuation eigenvalues to at most
one counting multiplicity. This is essential to the determinant bound q^k.
A second expanding direction invalidates that deduction (local arithmetic mutant
in transfer-checks.py). Other global division/integrality premises remain outside
this local check. No proof-kernel validation or compression superiority follows.

**Harmonic.** At 72b62405a176a7eaeadb335a7fa6ee80b6667161 freshly read
StatementOnly_IMO2025P3.lean. Its claimed least constant is 4 for positive-integer
bonza functions, stated with modular congruence; the body is explicitly `sorry`.
Do not represent a statement-only file as the proof. No full proof was read here.

**ByteDance Seed (additional lab).** Freshly read the July23,2025
[official account](https://seed.bytedance.com/en/blog/bytedance-seed-prover-achieves-silver-medal-score-in-imo-2025):
30 points in three days, manually formalized statements; P1 full proof four days
later. The blog's old p3.lean link returns404 at current pinned tree
38c59cebaf969ac259196eb091757518d5b54c67. Located relocated
SeedProver/imo2025/IMO2025/P3.lean and read its ending witness: f(4)=16,
odd positive arguments map to1, other positive evens to2. Finite modular checks
below test the witness, not the universal upper bound or Lean proof. `#print axioms`
text is not execution output. Tool-assisted multi-day Lean solving is not the
required unaided single-user-message decoder.

## Limits

All publications above fall inside the requested twenty-year window, except
older ancestry cited inside their bibliographies, which was not used as fresh
research. Source-level inspection, finite countermodels and successful TypeScript
builds do not certify mathematical proofs. No exhaustive lab or codec-history
search, broad Pareto win, or native success is claimed.
