# Live research ledger — bounded scope, not an exhaustive proof audit

Session date: 2026-11-14. Executed tools: web_search, fetch_page, gh API, local
source inspection. Node/npm/Python/TypeScript and GitHub CLI versions are in
`environment.json`. Neither `lean` nor `lake` was found. No theorem kernel,
comparator, independent agent, external expert, simulator, or separate model
evaluation was run. Search fan-out was parallel tool invocation, not independent
research agents. No database connector is in use.

## New queries and recent compression papers

Queries included `grammar compression locally consistent parsing recompression
2022 2025 smallest grammar approximation practical`, `2023 2024 2025 grammar
compression optimization recompression integer programming`, and `2025 2026
text compression grammar boundary algorithm new`. Two SAT/smallest-grammar
queries returned irrelevant school-exam material; these were discarded, not
claimed as research evidence.

- **Stable locally consistent grammars, SEA 2025**, arXiv:2411.12439v2.
  Search result inspected: shared hash functions induce stable cores across
  independently parsed strings; the reported linear-time result is high
  probability and concerns grammar construction on strings/collections, not
  paid BPE messages. This source was already cited in the repository and is
  NOT presented as newly discovered. No implementation was run.
  [1](https://arxiv.org/html/2411.12439v2)
- **Efficient Grammar Compression via RLZ-based RePair**, 2025 preprint revised
  April 2026. Retrieved search description concerns processing an RLZ parse and
  reference while preserving RePair bigram replacements and handling phrase/
  reference boundaries. A well-chosen reference and word/byte grammar costs
  are not a native-chat decoder or token bound. This paper also overlaps prior
  repository research; it is not proof of novelty.
  [1](https://www.biorxiv.org/content/10.1101/2025.07.22.666196v2.full.pdf)
- **Roy, Maity, Mukhopadhyay, GraSS**, *Briefings in Functional Genomics* 24,
  elae050 (2025), DOI 10.1093/bfgp/elae050. A new source site encountered this
  turn was `par.cse.nsysu.edu.tw`; exact domain/article-ID searches had no prior
  tracked bench/docs/src hits. Its PDF fetch failed HTTP 500. The PMC article
  was then actually fetched (chunks 0 and 3), including preprocessing and both
  encoding phases, not just its abstract.
  [1](https://pmc.ncbi.nlm.nih.gov/articles/PMC11735755/)

GraSS preserves identifiers, line/block lengths, lower-case runs and special
characters in side information. It maps selected low-frequency DNA symbols
through a flag representation, reduces to a ternary alphabet, packs pairs into
nine labels, and finally compresses both payload and metadata with BSC. Its
reported DNA/RNA gains are for this restricted alphabet and binary backend.
Discarding metadata or replacing the binary backend with decimal chat text
would not inherit those gains. Its character-pair packing claim is not an
original-source BPE halving theorem. We did not implement or benchmark GraSS.
The concrete lesson here is to keep all side costs and information-preserving
steps explicit, not to assert that ternary packing is a new model-readable idea.

Only exact textual absence was checked for the new domain/article ID; this
cannot establish that nobody in prior discussions saw equivalent work. The
research is recent and live, but not exhaustive over all papers in five years.

## Individual frontier-lab checks

### OpenAI — deeper superstring interface

Fresh search found the First Proof page, which explicitly distinguishes proof
attempts from expert-validated conclusions and retracts confidence in problem 2.
This is a useful caution against turning generated proof text into acceptance.
[1](https://openai.com/index/first-proof-submissions/)

Fresh pinned downloads at commit
`3344da59991ed94f9ba711217b29c1d760badfa6`:
`lean/OAI/Computability/Superstring/{Model,Main,BlockClose}.lean` in
https://github.com/openai/math . Paths and hashes in `research-sources.json`;
bytes in ignored `.cache/x189/research`, retrievable by commit.

Model defines symbols as finite Boolean lists, words as symbol lists, contiguous
substring containment, optimum in **symbols**, and polynomial computation over
an explicitly encoded finite-stack machine. Main connects `Executable.solve`
to `answer_spec`, obtaining coverage and length ≤2×opt via the earlier
weight lower bound; `answer_implementation` is a bit-machine existence
certificate. This is not a theorem about the runtime of our JS encoder.

New deeper inspection of BlockClose: `select` filters a finite pool by
`goodCheck` then takes its head (fallback is the unchanged state). `select_spec`
requires existence of a good candidate in the pool. `step_spec` additionally
requires substring closure, a rooted walk, nonempty remaining blocks, ValidBlock
hypotheses, and readiness/coverage. Under those hypotheses its statement
preserves coverage and a cost-plus-reserve potential while strictly reducing
remaining blocks. Merely copying `select` without `pool_complete` would lose
progress. This resembles the engineering need for a certified repair/progress
gate, but supplies no theorem that ANAPLASIS has a profitable candidate.
No transitive proof/kernel replay occurred; these are source-statement readings,
not newly verified mathematics.

### Anthropic — Riemann claim

The fresh primary search describes a lower-bound improvement from 41.6% to
67.2% of zeros satisfying RH, with author-reported human and Lean review.
That is not full RH. A secondary November 21 full-proof claim also appeared;
its date is later than the session date, and no full proof certificate was
retrieved or verified here. A narrower August result would not refute a later
claim. We therefore do not assert either verification or refutation of that
full claim. No reduction from a zeta-zero theorem to fixed-tokenizer lossless
compression was established.
[1](https://www.anthropic.com/research/riemann-zeta)

### doubleAI

Fresh primary searches returned graph-girth, chess, and quantum-circuit work.
The circuit page reports 993,181 Toffoli gates and 1,205 qubits, and describes
its own proof certification. Those are a different resource model and were not
locally replayed. The broader research index describes regular-graph girth
results; no complete proof or solver certificate was checked this turn.
[2](https://www.doubleai.com/research/double-agent-discovers-record-breaking-ecdsa-cracking-circuit)
[1](https://www.doubleai.com/research)

### Google DeepMind / Gemini

Fresh Nexus search identifies released Lean outputs, including modified
anchored gradient descent-ascent convergence and a graph-reconstruction variant.
This is formal proof-search evidence reported by authors; it does not imply
our six heuristic moves converge to a global token optimum. No Nexus proof
was run locally.
[1](https://arxiv.org/html/2605.22763v1)

### ByteDance Seed

Fresh primary publication search describes lemma-style whole-proof reasoning
with iterative Lean feedback and contest benchmarks. That architecture's
verification feedback motivates explicit gates but is not a proof that an
ordinary chat model can decode our wires.
[1](https://seed.bytedance.com/en/public_papers/seed-prover-deep-and-broad-reasoning-for-automated-theorem-proving)

### Harmonic / Aristotle

A fresh search and actual first-chunk read of Sothanaphan's January 2026
writeup of Erdős #728 gave a more precise statement: for every 0<C1<C2 and
0<epsilon<1/2, infinitely many natural triples (a,b,n) satisfy epsilon*n≤a,b≤
(1-epsilon)*n, a!b! divides n!(a+b-n)!, and C1*log(n)<a+b-n<C2*log(n).
The discussion reduces to binomial divisibility, then prime-adic valuations
and carry counts, distinguishing primes above and below 2k. Its existence
argument selects carry-rich integers avoiding large prime-power spikes; that
is not an efficient encoding theorem for arbitrary prose. The appendix/search
also notes the original problem-statement ambiguity and later clarification,
reinforcing the importance of not verifying a weaker substituted statement.
[3](https://arxiv.org/html/2601.07421v5)

A real local arithmetic sanity check (`math-sanity.py`) compares the doubling
carry count to the valuation of binomial(2m,m), for m=1..256 and eleven primes:
**2816 exact checks**. This checks a finite identity instance set only, not the
infinite existence proof, the Lean derivation, or any compression claim.

### xAI and Qwen

Fresh xAI-targeted search returned secondary reports with different conjecture
names (Graffiti 284 versus Dinitz–Garg–Goemans). No primary certificate was
obtained. The reports are not reconciled into a verified theorem here.
[2](https://logos-pres.md/en/news/grok-4-5-helped-disprove-a-mathematical-hypothesis-that-had-remained-unresolved-for-about-30-years/)
[3](https://www.macrostream.ai/articles/6a61c0d03341cc34a352185c)

A Qwen-targeted search returned third-party commentary and a formal-proof
reward benchmark, not a primary Qwen solved-problem certificate. No theorem
was adopted from those results.

### Completeness

No exhaustive Meta, Qwen, xAI, Harmonic, or every-other-lab proof audit was
completed. Prior notes are not counted as fresh executions. The user's request
to evaluate **ALL** newly solved problems remains unmet. There is no adequately
bounded exhaustive result set here, and no expert/kernel verification to justify
claiming otherwise.

## Open interface

A theorem about symbol-optimal grammars, binary code size, graph girth, or
proof-search success must still be converted to a fully paid fixed-o200k
message, source-byte inverse, broad held-out gain, and independent native-chat
behavior. No retrieved theorem bridges all of these interfaces. Search failure
and a negative bounded experiment do not prove that such a bridge is impossible.
