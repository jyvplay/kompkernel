# X157 bounded live research audit

As-of date2026-11-14. Actual tools: bash, Node22, esbuild, TypeScript, Vite,
CPython, git/gh, web_search/fetch_page. No independent agents, model endpoint,
simulator, Lean/Lake kernel, external expert review or paid database was used.
Concurrent processes are actual processes, not agents; their timing is not speed
verification. npm ci reports4 dependency vulnerabilities (3 high/1 critical);
no opportunistic manifest changes. Future Nov20/21 search hits are excluded.

## New sources and transfer boundaries

-2026 implementation discussion *Implementing Unified Diff*, new website:
  [1](https://kilabit.info/journal/2026/unified_diff/).
  Describes old/new line counts and special zero/one-count cases. This is a
  technical article, not a compression theorem. Its prose about empty hunks is
  not accepted as a specification; the actual parser and independent generated
  difflib tests enforce our exact admission domain.
-2026 real bugfix: [3](https://github.com/aakarim/OpenLore/pull/91).
  Explicit old/new-count parsing, short/overlong hunks, `---` deletion ambiguity,
  zero-old-count insertion offsets. Search excerpt inspection only. It motivated
  adversaries rather than granting a proof. An inverse must distinguish a hunk
  from file metadata; our accepted Git hunks end at a non-body record, and whole
  source roundtrip refuses ambiguous/malformed sources.
-2025 *Efficient Discovery of Relaxed Functional Dependencies*, Li/Tan/Yang/Ma,
  PVLDB: newly found secondary summary
  [2](https://lacuna.tiptreesystems.com/work/efficient-discovery-of-relaxed-functional-dependencies/wrk_2e83003262266d67c88fa6f1e2283b2c).
  Describes approximate matching AND tolerated violations, difference sets and
  pruning. No full paper replay or theorem imported. Relaxation is inadmissible
  for byte-perfect reconstruction unless residual exceptions are transmitted.
-2024 *Lossless and Stateless Compression of IEC61850 Sampled Values Flows*,
  DOI10.1109/TPWRD.2024.3359410, new artifact site:
  [3](https://zenodo.org/records/10683771).
  The surfaced abstract describes byte-width bitmaps and optional Quality-field
  presence in a specific electrical protocol. Protocol redundancy can be removed
  only when all required fields/flags remain reconstructible. Its30–52% bandwidth
  report is not our chat-token objective, and no hardware experiment was rerun.
-2024 *ALP: Adaptive Lossless floating-Point Compression*, Afroozeh/Kuffo/Boncz,
  SIGMOD2024, [4](https://ir.cwi.nl/pub/33334/33334.pdf).
  Search excerpts expose decimal encodability, exception vectors and an alternate
  strategy for non-decimal-friendly values. Useful discipline: exact exceptions,
  not silent rounding. Binary float equivalence does not preserve textual numeric
  spellings; no ALP rate is transferred to our codec. Already-known ancestry may
  occur elsewhere in this large repository; no first-discovery claim is made.

Other search hits included lossy PatchSVD (rejected) and CLI token-saver truncation
[4](https://github.com/ppgranger/token-saver) (rejected: discarded context is not
byte-lossless). Neither is counted as a competing admissible lossless codec.

## Lab follow-ups, individually scoped

Fresh files are retained with provenance; source inspection is NOT kernel replay.

**OpenAI SAT:** followed NativeLeafContract one edge deeper to NativeLeafProgram.
`localCommand k` installs NativeLeafRun.command(HighQueryProgram.marked k,
HighQueryProgram.accepted k); compiler endpoints784→788. The outer command uses
NativeLeafDispatch/Execution, endpoints265→263. The file explicitly separates
semantic/resource composition and uses a noncomputable section. It introduces
no callback/evaluator argument, but that does NOT discharge dependencies or
produce a practical runnable SAT optimizer. Fixed clause-width k remains material.
https://github.com/openai/math/tree/main/lean/OAI/Algorithms/SubexponentialSAT/SqrtLogSpace

**Anthropic FLT:** followed the prior odd-prime reduction to
S_FreyPackage_fermatLastTheoremFor_of_five_le.lean. For prime p>=5 the statement
rewrites to the integer formulation, builds a FreyPackage from a counterexample,
and applies P.no_frey_package. Thus the next exact interface is construction plus
nonexistence of that package. No dependency closure or build was checked; the
large attribute prelude is not itself a certificate. No compression lemma follows.
https://github.com/anthropics/fermats-last-theorem

**DeepMind/Gemini:** examined actual State/step/schedule underlying the prior
residual theorem. State holds z,z0,t,history; step is z-alpha*F(z)+beta*(z0-z),
with alpha=1/(K sqrt(t+gamma)), beta=gamma/(t+gamma); history appends the iterate.
These are noncomputable real-vector definitions, not a bounded discrete glyph
optimizer. The previously recorded differentiability, monotonicity, positive
Lipschitz K, gamma>=2 and saddle/zero hypotheses remain unmet by BPE hill-climbing.
No convergence-rate or acceleration claim is imported.
https://github.com/google-deepmind/alphaproof-nexus-results

**DoubleAI:** X156 found primary girth85 PDF/LeanZIP links but PDF retrieval failed.
X157 does not pretend that this failure became a proof audit. The retained claim
is prime-power q, degree q^3+1, infinite families and determinant/divisibility/tree
movement hypotheses, plus the special28-regular matching bound. No verified
codec reduction exists. Additional live search is documented separately if it
returns an inspectable primary artifact. No exhaustive all-labs claim.

## Novelty audit

Searched the existing spec and omega modules for hunks, unified diff, counts,
numbering and dependency coding. X51 already recorded hunk-count deletion as a
small12-token ceiling on its fixture. Therefore count deletion ALONE is not new.
ISOSTATHMIA adds the per-file signed balance that removes new-start positions,
handles zero-count offset corrections, and validates complete bodies. It is a
new bounded implementation of classical format entailment, not unprecedented
mathematics. The canonical stored diff has mismatched stated/body counts in two
hunks (6/18 versus5/15 and10/14 versus6/9). Its refusal is correct and preserved;
we did not repair the benchmark source to manufacture a gain.

Real GitHub patches are pinned by commit; U0 is actual git --no-index output from
all changed files of one pinned CPython commit, not invented edits. Screening
later selected a61-hunk IO change from a bounded20-commit listing. This is discovery
selection, NOT unbiased heldout evidence. Small import/incref and TypeScript
patches expose overhead boundaries. All fixture licenses retained.

X157's additional query `girth85 det Lean DoubleAI` returned unrelated Lean GPU,
Ramsey-graph, and nonmathematical results. It supplied no inspectable DoubleAI
proof. No success or exhaustive-absence claim is inferred from that failed search.
