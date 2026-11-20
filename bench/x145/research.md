# X145 live research, 2026-11-14

Scope: targeted searches over grammar products, Unicode boundaries and verification claims. Not an exhaustive review of twenty years of research or every lab theorem.

## Fresh terms and sources
- Query: `straight line program finite state transducer composition grammar compressed strings 2012 2024 Lohrey`. Search extract for Lohrey's 2012 *Algorithmics on SLP-Compressed Strings* states that an n-state deterministic finite-state transducer applied to an SLP A yields an output SLP of size/time O(|A|n). This directly limits novelty: SCALAR is a practical bounded instance. [1](https://www.eti.uni-siegen.de/ti/veroeffentlichungen/12-survey.pdf). Follow-up fetch redirected to the university homepage, **not the PDF**; do not label the full paper freshly inspected.
- Same query surfaced 2020 *Balancing Straight-Line Programs for Strings and Trees*: grammar depth can be reduced while retaining compressed representation. It is a future recursion/latency route, not an implemented speed result. [5](https://link.springer.com/chapter/10.1007/978-3-030-51466-2_26).
- Query: `UTF-16 UTF-8 surrogate repair streaming transducer scalar values encoding standard`. Unicode 16 section 3.9 excludes surrogate code points from scalar values and UTF-8 mappings. This is the transport reason for moving incomplete pairs into compiler state. [1](https://www.unicode.org/versions/Unicode16.0.0/core-spec/chapter-3/).
- Prior 2015 Bitshuffle, 2019 exact scientific shuffle, 2025 suffix-tree work and 2026 proof sources remain scoped in X144/X144b research notes; they are not represented as freshly replayed in X145. These are examples spanning the requested twenty-year window, not coverage of that entire literature.

## Individual lab claim inspection
New primary Anthropic FLT page was fetched, plus GitHub `FinalCheck.lean`, `formalization.yaml`, `PROOF-PATH.md` saved under receipts/flt-* with hashes. Page describes a formalization, not discovery of a new FLT theorem. [2](https://www.anthropic.com/research/formalizing-fermats-last-theorem).
The saved declaration pins `∀ n≥3, ∀ a,b,c∈N positive, a^n+b^n≠c^n`; it also derives Mathlib's `FermatLastTheorem`. The `#guard_msgs` checks exactly propext, Classical.choice, Quot.sound when compiled. Merely reading this directive does NOT execute it. The metadata explicitly calls review self-assessed. Named intermediate results have narrower domains (Frey-curve irreducibility, octahedral Langlands–Tunnell, selected lifting conditions); these are not necessarily gaps in FLT, but may not be advertised as general versions of those theorems. No Lean/comparator/nanoda replay here. Primary repository: https://github.com/anthropics/fermats-last-theorem .

Other individually scoped assessments inherited from X144b, **not reverified this turn**:
- OpenAI SubexponentialSAT challenge: fixed k vs uniform quantifiers and visited-space per prefix; a challenge `sorry` is not a submitted solution defect.
- Anthropic ETH: uniform machine/constants and occurrence assumptions; Lean statement alone does not establish RAM transfer.
- DeepMind executable verification: build mode, memory/no-OOM and sampler/XOF assumptions matter.
- Axiom rate-monotonicity: domain restrictions and p=1 exclusion for converse matter.
- DoubleAI graph result: prime-power domain and asymptotic family parameters, not arbitrary degrees/sizes. Lean zip not replayed.
See X144b saved primary artifacts for exact provenance. No lab's entire portfolio is certified or refuted. Secondary search summaries were not treated as proof evidence.

## Transfer to this implementation
Formal statement matching is analogous to requiring source bytes, not just self-reported decoded text. Allowed axioms correspond only loosely to trusted parser/tokenizer dependencies; the analogy is not a proof. Native reconstruction is an additional empirical proposition and follows from neither a typecheck nor a byte-exact program reader.
