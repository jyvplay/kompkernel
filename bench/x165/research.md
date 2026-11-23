# X165 live research and bounded proof-interface follow-up

Date authority:2026-11-14. Search returned later-dated stories, which are not
accepted as proof chronology. This is not an exhaustive survey of ALL math or
an expert/kernel audit. No Lean executable or independent chat endpoint is
available. Model/code generation, source inspection, execution and mathematical
verification are separate evidence levels.

## Fresh searches and paper interfaces

Queries actually issued include `LZP context prediction lossless compression
2015 2023 text compression paper`, `lossless compression antidictionary finite
automata text 2020 2024 compression prediction`, `LZP compression 2024 paper
context`, and `LZ-End 2023 compression parsing paper`.

- **New Advances in Rightmost Lempel-Ziv**, SPIRE2023,
  https://link.springer.com/chapter/10.1007/978-3-031-43980-3_15 . Read publisher
  abstract (subscription full text not inspected). For length-n strings over a
  linearly sortable alphabet with σ=n^O(1), general LZ77 linear-time parsing does
  not automatically yield linear-time rightmost parsing. The abstract reports
  O(n)rightmost greedy LZ-End and O(n+z√log z)for any given LZ-End parsing of
  zphrases. DEIKTIS is NOT that algorithm: it fixes a small suffix context and
  queries its latest end, not the rightmost occurrence of an arbitrary entire
  phrase. No asymptotic theorem or optimality guarantee is transferred.
- **An Efficient Lossless Compression Method for Periodic Signals Based on
  Adaptive Dictionary Predictive Coding**, Dai et al., Applied Sciences2020,
  DOI10.3390/app10144918, https://www.mdpi.com/2076-3417/10/14/4918 . First full HTML
  chunk inspected: periodic/quasi-periodic signal context prediction before
  dictionary compression. Numeric signal CR and prediction-error experiments
  are not evidence of prompt-token savings or model-native reconstruction.
- **Optimal LZ-End Parsing Is Hard**, Bannai et al., CPM2023,
  DOI10.4230/LIPIcs.CPM.2023.3,
  https://drops.dagstuhl.de/storage/00lipics/lipics-vol259-cpm2023/LIPIcs.CPM.2023.3/LIPIcs.CPM.2023.3.pdf . First PDF chunk inspected, not full proof. Source phrase
  must end at a previous phrase boundary; objective is minimum PHRASE COUNT.
  Decision version is reported NP-complete; a binary family gives greedy/optimal
  ratio approaching2. Neither phrase counts nor its hardness are o200k token
  bounds for our self-contained parent wires. This citation already occurs in
  older repository research; it is revisited, not falsely called a new source.
- Search surfaced https://www.mattmahoney.net/dc/text.html describing LZP
  context-hash preprocessing before binary coders. Search snippet only. LZP and
  Burrows–Wheeler are classical human prior art, not human-blind AI inventions.
  BWT's1994origin falls outside the20-year requested fresh-paper window and is
  disclosed only as historical ancestry.
- Search result for Functionalizer2609.15991 discusses reversible opcode/operand
  pre-tokenization but also changed vocabulary/training and domain-dependent
  prose inflation. Not adopted and not used as a native-behavior certificate.

The imported results leave exactly this open interface: can an entirely in-band
representation, consumed by the unchanged tokenizer and ordinary model, reduce
complete parent cost AND preserve exact reconstruction reliability? Existing
binary/algorithmic results do not discharge it.

## OpenAI: PrefixGreedy extension requires an actual witness

Pinned4eaee87548250b2682affda7d05d947c05554bae; newly fetched Tables.lean and
PrefixMatching.lean (hashes in research/provenance.json). `largest` is a stable
left-biased maximum of list-length; `largest_spec` requires nonempty input.
`extension` chooses the first prefix-compatible member or default(0,[]).
`extension_spec` expressly requires ∃b∈S,a.prefix b. Without it, the sentinel is
not a matching token. `remove` filters ALL equal tokens, not just one, so list
multiplicity needs separate invariants. PrefixMatching's Poly results bound
BitCode computation/size, not our contextual BPE objective. Finite enumerations
exercise nonempty maximum, existence-conditioned extension and a missing-witness
counterexample. No full superstring theorem, kernel proof, or codec optimum
was established. Practical lesson: default/sentinel values cannot silently count
as valid matches; DEIKTIS missing history refuses.

## Anthropic: one dependency step further, not an ETH verdict

Pinned16a5ce41304fcdaea4e0be7c132e1c361dc26da5. Initial guessed maintheorem path
returned404; actual tree locates variables/CountedInstance/Main.lean. Newly fetched
source builds the named machine `cliqueMachine(c+2)(c+18)Alg`, uses cap≤2λ,
proves c+7≤2^(c+18), and raises C0 to max(C0,10). The final theorem applies five
named dependencies: halfPieces, mayAssume, recursionSolves,
solvesGrowsWithTheConstant, thePairsMeetTheClauses. This goes beyond X164's
conditional wrapper interface but does not replay or discharge the dependency
closure here. Integer constant tests are bounded sanity checks, not an ETH
proof. A polynomial or subexponential machine theorem is not evidence of a
practical speedup for this JavaScript stack.

## DoubleAI: DIMACS boundary below the LRAT bridge

Pinned d2fc22e3bc0b675acc18dd53d8e3003c8eceae3a; new Cnf.lean inspected.
WF requires each literal nonzero and |l|≤nv. `clauseLine` prints a terminal0;
therefore allowing0as a source literal destroys the printed clause boundary.
Empty CNF is satisfiable, empty clause is unsatisfiable; neither can be dropped
by serialization. New finite truth-assignment/serialization checks bind the
well-formed subdomain. X164's7224Unsat-axiom route remains distinct from RouteA's
actual LRAT bytes and successful checker result; no certificates were replayed.
Lesson: a correct decoder theorem with an unfulfilled well-formedness premise
cannot validate an arbitrary incoming wire.

## Google DeepMind: witness invariants do not preserve token price

Revisit X164's exact2003-point sum/difference witness result and rational log
interval; no claim of checking the54265-point witness. New finite affine tests
show cardinalities of sumsets/difference sets survive a nonzero scaling and
translation; scale0is a counterexample. This is an illustrative representation
invariant, not a new large witness or an asymptotic compression theorem.
Official live search result:
https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/ . Its reported evaluation-driven algorithm search motivates
real validators, not substituting mathematical success for byte-perfect chat
reading. The48complex multiplications claim is not a wall-time claim for text.

## ByteDance: strict boundary counterexample

Reinspect the pinned X163 erdos1051 source, final lines2937–2990. The contradiction
combines a fixed positive lower bound x_m≥1/Q with x_m→0; the growth hypothesis
liminf a_n^(1/2^n)>1is load-bearing. At the boundary a_n=n+1, positivity and
StrictMono hold, but the reciprocal adjacent-product sum telescopes to1, rational:
1/((n+1)(n+2))=1/(n+1)−1/(n+2). Finite Fraction tests verify the partial-sum
identity; the limiting argument is elementary reasoning, not a Lean replay.
The source's `#print axioms` is still a command, not captured checker output.

## DeepSeek and xAI: individually scoped, no invented proof audit

Fresh search for DeepSeek-Prover-V2 located the primary technical report
https://arxiv.org/html/2504.21801v1 . Search excerpts distinguish Pass@32from
Pass@8192, and formal proof generation with GIVEN correct answers from informal
answer finding. Neither evaluates single-chat decompression without a prover.
No weights, training or proof search from that system ran here.

Fresh xAI search returned secondary reports without a linked inspected proof or
formal certificate, including https://www.basenor.com/blogs/news/grok-4-5-cracks-30-year-old-graph-theory-conjecture-musk-says . Those are leads only. No xAI theorem
is imported, confirmed or refuted. Reports about other labs and later-dated
Riemann stories are likewise not proof evidence. This bounded search cannot
honestly be labeled an audit of all frontier labs or all newly solved problems.
