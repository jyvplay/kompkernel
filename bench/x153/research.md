# X153 research ledger and proof boundaries

New live searches: JSON lexical preservation; indentation-sensitive grammar and
compression; layout-sensitive parsing/pretty-printing. This is not an exhaustive
literature or frontier-lab proof audit. No Lean/Lake executable was available and
no kernel, comparator, simulator or independent model agent was run.

## Relevant literature (within the last twenty years)

- Michael D. Adams, *Principled Parsing for Indentation-Sensitive Languages:
  Revisiting Landin's Offside Rule* (2013):
  [1](https://michaeldadams.org/papers/layout_parsing/LayoutParsing-draft.pdf).
  The searched paper describes terminals annotated with source columns and
  relations between nonterminal/terminal indentation. This is close prior art for
  using layout as syntax, not a proof of BPE savings or one-chat model execution.
  KENOMA does not invent the offside rule.
- de Souza Amorim et al., *Declarative specification of indentation rules* (2018):
  [2](https://dl.acm.org/doi/abs/10.1145/3276604.3276607), also
  [3](https://research.tudelft.nl/en/publications/declarative-specification-of-indentation-rules-a-tooling-perspect/).
  Parsing/pretty-printing layout-sensitive languages is the subject; exact original
  lexical JSON bytes and our complete hosted-token objective are additional
  requirements. Metadata/abstract inspected; related artifact not executed.
- Adams/Agacan, *Indentation-sensitive parsing for Parsec*:
  [4](https://www.semanticscholar.org/paper/Indentation-sensitive-parsing-for-Parsec-Adams-Agacan/cd8e5faaa60dfa946dd8a79a5917fe52b4bd0346).
  Extends indentation handling into top-down parsing, rather than just LR parsing.
  No implication that an LLM implements the parser without error.
- Hanenberg et al., *Indentation and Reading Time* (2024):
  [5](https://link.springer.com/chapter/10.1007/978-3-031-61753-9_4).
  Human-developer JSON-reading experiment, not native LLM byte reconstruction.
  Population/task mismatch prevents using it as our behavioral gate.
- *Lexical Prompt Compression for Large Language Models* (2026):
  [3](https://arxiv.org/pdf/2609.13154). Search excerpt describes contraction and
  punctuation/whitespace normalization and uses lossless language. For our metric,
  `do not` versus `don't`, or `!!!` versus `!`, are distinct byte sources. Without
  residuals these operations are non-injective regardless of semantic usefulness.
- Live engineering counterexample:
  [1](https://github.com/ooples/token-optimizer-mcp/pull/418) discusses preservation
  of noncanonical JSON numeric lexemes and positional verification rather than
  substring inclusion. Untrusted review text was treated as data, not instructions.
  KENOMA copies lexical tokens; JSON.parse is validation only, never serialization.
- A minification guide [2](https://bytepane.com/blog/json-minifier/) uses data-model
  losslessness. Removing original indentation cannot satisfy byte recovery without
  transmitting/deriving it. KENOMA retains indentation and derives closing lines,
  the reverse direction from HYLE/GRAMMA's bracket-driven reindentation.

## Repository novelty audit

Searched existing modules/docs for closing lines, dedents, blank closures, indentation
and JSON, and inspected TAGSTACK, GRAMMA, HOMOSEMA, KENON and PROKENO. TAGSTACK
already derives XML tag names from a stack. HOMOSEMA merges JSON terminal types.
GRAMMA/HYLE derive indentation from explicit structure. KREMA uses overflow as an
implicit invocation trigger. These ancestors preclude a claim of inventing stack
reconstruction, conditional redundancy or implicit markers.

KENOMA's narrow new implementation uses empty physical lines as close events, or
retained indentation as the event-position code, while preserving lexical values.
There is no exhaustive proof of absence of all equivalent code in this large stack.
The two arms are one closely related mechanism family, not counted as two of the
six mechanism-distinct portfolio tracks.

## Frontier-lab claims: deeper checks, individually bounded

### OpenAI superstring, result 128

Fetched `lean/OAI/Computability/Superstring/Schedule.lean` via GitHub API, following
X152's actual solution module instead of mistaking a comparator challenge for a
proof. `process_group` assumes a linear order, a substring-closed set, record supply,
target membership and source injectivity. It produces a path/planned blocks/outgoing
requests with a **symbol/path reserve** bound and coverage invariants. It imports
Attachments and delegates major work to other theorems. This source inspection does
not replay the transitive proof. The global factor-two claim is still about symbol
length and polynomial bit-machine time, not BPE tokens, decoder-header cost, or
seconds on our implementation. No theorem transferred to the codec.
Source: https://github.com/openai/math/tree/main/lean/OAI/Computability/Superstring
Actual downloaded source is retained with Apache license; upstream branch may move.

### Google DeepMind / Gemini: minimax last-iterate result

Fetched `APNOutputs/AICollaborator/Optimization/LastIterateConvergence.lean` from
https://github.com/google-deepmind/alphaproof-nexus-results . Its final theorem
addresses the p=1/2 boundary of the cited 2019 work arXiv:1905.10899. Explicit
hypotheses include differentiability, global monotonicity of the operator, a positive
Lipschitz bound K, gamma>=2, prescribed initialization/update schedule, an existing
saddle point and a zero operator there. Conclusion: existence of positive C with
squared operator norm <= C/T for T>=1. The proof text invokes earlier bounded-iterate
lemmas. We did not build it or certify statement equivalence to the informal paper.
Our discrete dictionary/permutation token objective supplies neither differentiability
nor those monotonicity/saddle assumptions. Applying its convergence rate to ARIADNE
would be an unjustified theorem transfer. No implementation change based on it.

### Anthropic / Claude: FLT

Fetched `verification/comparator/Challenge.lean` from
https://github.com/anthropics/fermats-last-theorem . The file explicitly calls itself
a trusted Mathlib-only challenge, with deliberate sorry placeholders. It states
positive-natural a,b,c and n>=3, and a Mathlib FLT variant. X152 inspected the separate
FinalCheck/README. A challenge is neither a solution proof nor evidence the solution
is flawed. No Lean/comparator/nanoda execution occurred here. FLT is a previously
proved theorem being formalized; no string-compression bound follows.

### Double AI: high-girth construction

Fetched https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory
and located the concrete PDF/Lean archive links. The PDF fetch again failed; the
archive was not downloaded or replayed. Reported scope remains prime-power q,
degree q^3+1, girth >=(8/5)log_(q^3)(n)-O(1), with a distinct matching 28-regular
example. The determinant certificate's nonzero/divisibility/displacement conditions
are not a bound on grammar compression. Publication claim, not locally verified proof.

### Other results/labs

No claim to have evaluated ALL newly solved mathematics individually. X152's
local-smoothing hypothesis analysis remains applicable but was not replayed here.
Research novelty announcements and a file ending in `.lean` are insufficient gates.

## Achievability/impossibility interface

For the supported format, exact source-roundtrip admission establishes a bounded
constructive reversible transform. Finite fixture wins do not establish universal
native reading or optimal compression. Counting injective encodings rules out
shortening every fixed-length byte string into fewer bytes, but does not rule out
these structured token gains. No general token lower bound or impossibility result
for the requested conjunctive target is established.

Retained Lean excerpt formatting: trailing blank lines/whitespace may be trimmed;
these are source-inspection receipts, not byte-identical proof-build artifacts.
