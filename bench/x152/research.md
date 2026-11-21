# X152 research: inspect interfaces, not headlines

Live searches in this turn used new terms around grammar-conditioned terminal
coalescing, JSON punctuation, succinct trees and constrained-decoding token-space
compression. Repository text was searched before implementation; this is not a
proof that every equivalent construction is absent from every historical file.
Sources below are examined claims, not kernel-replayed theorems.

## Compression and representation sources (2006–2026 scope)

1. **SJSON** (2020/2021), *SJSON: A succinct representation for JSON documents*:
   [1](https://www.sciencedirect.com/science/article/abs/pii/S0306437920301356).
   Structural/raw-data separation, succinct ordered trees, attribute/value arrays.
   Hypotheses: a parsed JSON document, a specialized representation and a program
   reader. Space-efficient queryable storage is not self-contained hosted-token
   compression or exact original lexical formatting. Abstract/section excerpts
   inspected, implementation not replayed.
2. Cordova/Navarro, **Simple and Efficient Fully-Functional Succinct Trees** (2016):
   [5](https://arxiv.org/pdf/1601.06939). Ordered tree topology can use 2n parentheses
   with lower-order indexes; the reported implementation offers O(log log n)
   navigation and 2n+O(n/log n) bits. Labels, text payload and our protocol still
   have to be counted. Not a native-chat or o200k-token theorem.
3. **Structure-Aware Tokenization for JSON** (March 2026):
   [2](https://making-minds.ai/papers/json-tokenizer.pdf). Reports structure/key/value
   token tiers, custom vocabularies and 5–15% savings on schema-repetitive workloads.
   This changes the tokenizer. A basic hosted chat takes text, not arbitrary IDs
   from this vocabulary. Its byte-roundtrip claim was not independently replayed.
4. **CFGzip**, *Accelerating Constrained Decoding with Token Space Compression*
   (May 2026): [3](https://arxiv.org/html/2605.29986). Offline tokenizer/CFG search-space
   compression reports lower constrained-decoder overhead with unchanged outputs.
   Requires control over the grammar engine; not available in the user's basic
   chat interface. Faster output generation is not fewer input tokens.
5. The 2026 JSON compression guide:
   [1](https://compresr.ai/blog/compress-json-for-llms-guide-cut-token-costs) calls
   minification/format conversion lossless at the data level. That is not our byte
   contract. `unit.ts` preserves duplicate keys, -0, exponent spelling and escapes;
   JSON.parse/stringify changes an explicit counterexample. This is a conceptual
   boundary, not a criticism that such conversions are useless for other tasks.

HOMOSEMA uses the elementary fact that a deterministic JSON parser knows whether
a separator must be colon/comma and which container a closing token terminates.
It retains that parser state instead of spelling every terminal type separately.
This is established grammar-conditioned redundancy, **not new mathematics**.
Repository comparisons: HYLE/GRAMMA regenerate formatting, TAGSTACK removes XML
closing tags, NEST factors recursive XML siblings, EKDYSIS removes JSON quoting
layers. HOMOSEMA preserves the original JSON lexical/layout stream and coalesces
terminal types. Its implementation is new here; broad novelty beyond that is not
certified. These close relatives prevent a claim of inventing syntax inference.

## Prior highest-information task: DIATHESIS readability

Two shorter rank-instruction strings price at 15 and 23 tokens in `portfolio.json`,
but neither specifies a window, codepoint order, indexing, padding and case fully.
They are explicitly rejected as adequate protocols. No cold-chat endpoint is
available. This task remains blocked at behavioral verification, not solved by
printing an informal description of factorial ranking. HOMOSEMA instead asks for
ordinary JSON syntax repair, but that also requires an actual cold-chat test.

## Frontier-lab claims, individually scoped

### OpenAI result 128 — shortest common superstring

Live GitHub API inspection fetched the catalog, `lean/docs/128.md`, comparator
statement and config, actual `OAI/Computability/Superstring/Main.lean`, and its
`WalkOutput.lean` dependency. Snapshot reference recorded:
`4eaee87548250b2682affda7d05d947c05554bae`; see `receipts/provenance.json`.

The statement quantifies over every finite list of explicitly represented strings.
It asserts existence of a deterministic bit-machine polynomial-time implementation,
contiguous containment of each input, and output **symbol length** <= twice the
unrestricted optimum. It does not certify classical maximum-overlap greedy.

Important verification distinction: `ComparatorChallenges/Superstring.lean` contains
`sorry` **by design** as a challenge statement, not as the submitted solution.
The separate solution's `main` is constructed from `answer_implementation` and
`answer_spec`; its imports lead into a substantial dependency tree (directory
listing saved). Comparator config permits propext, Quot.sound, Classical.choice,
and has `enable_nanoda: false`. No local comparator/Lean/second-kernel run occurred;
reading the top file cannot certify its transitive dependencies. Conversely, finding
`sorry` in a comparator stub does not refute the separate solution.

Exact codec gap: the approximation objective is symbols, not contextual BPE tokens
plus references plus decoder instructions. `portfolio.ts` produces the live counterexample
`1234567890` = 10 chars / 4 tokens versus `authentication` = 14 chars / 1 token.
Thus symbol-length ordering need not preserve token-price ordering. No approximation
factor is transferred to our objective, and no new SCS algorithm was implemented.

### OpenAI result 079 — local smoothing

Re-read `lean/docs/079.md`. Its stated Euclidean half-wave claim has dimension n>=2,
2<=p<infinity, Schwartz initial data, time interval [1,2], Sobolev order
max(0,(n-1)/2-n/p)+epsilon for every epsilon>0 (s=0 allowed at p=2).
Other multiplier/restriction/maximal claims have their own strict ranges and
losses. This source does not supply a finite-string coding lemma. No proof replay
or full transitive formal audit was performed.

### Anthropic / Claude — Fermat formalization

Fresh search of the research report [1](https://www.anthropic.com/research/formalizing-fermats-last-theorem)
and GitHub inspection of README and `FinalCheck.lean`. The latter guards the printed
axiom list and relates the theorem to Mathlib's FLT statement. The README reports
Lean/comparator/nanoda checks with specific versions and patched nanoda; these are
**publisher-reported**, not checks executed here. The theorem concerns positive
natural a,b,c and natural exponent n>=3; it is formalization of an already proved
result, not discovery of a new Fermat theorem. No codec lemma follows. Live API
metadata included an update after the local 2026-11-14 date; treat the retrieved
snapshot as inspected content, not a certified as-of-date historical snapshot.

### Google DeepMind / Gemini — AlphaProof Nexus

Fetched primary paper https://arxiv.org/html/2605.22763v1 (first chunk, not all 26)
and the results repository README. The paper reports 9/353 formalized Erdős problems
and 44/492 selected OEIS conjectures, with proof-search agents and Lean feedback.
It also explicitly describes a `sorry` input sketch and restricted editable regions.
The README states the released directory contains only successes and links the
attempted sets. Consequently success-only files cannot estimate an unconditional
solve rate or establish all open problems solved. Neither each mathematical statement
nor each proof was replayed here; no causal compression improvement inferred.

### Double AI — high-girth graphs

Fresh primary report [1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory)
states an infinite family for **prime powers q**, degree q^3+1, girth at least
(8/5)log_(q^3)(n)-O(1), with a separate matching bound for a 28-regular family.
The determinant certificate relies on nonzero det(w-I), fourth-power level
divisibility and displacement bounds. This is not an all-degrees graph theorem,
not a source-coding bound, and not verified here by downloading/building the Lean
archive. No result transferred into production.

### Other labs and exhaustive scope

No exhaustive enumeration of ALL frontier-lab mathematics or individual proof
verification was completed. No theorem prover, independent agent, simulator,
external native-chat model call or private database was executed. These limits
are part of the result; publication announcements are not substitutes for them.

## Applicable impossibility boundary

An injective byte codec cannot shorten every N-byte string: there are 256^N inputs
and only sum(256^i, i=0..N-1) shorter byte strings. This elementary counting argument
requires no source distribution, but does not rule out a win on a structured fixture
or establish a token-space lower bound with a readable protocol. H- for our empirical
target remains unproved. The open interface is finite complete-wire benefit plus
reliable native behavior plus whole-stack cost—not absence of mathematical ideas.
