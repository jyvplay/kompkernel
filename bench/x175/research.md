# X175 research scope — 2026-11-14 UTC

Fresh search and primary-source retrieval were performed this turn. Search results are discovery aids, not validation. Pinned GitHub bytes, hashes, and retrieval failures are in `receipts/research-artifacts.json`; `.cache` bodies are disposable and reconstructible with `research-fetch.py`. No Lean/Coq kernel was available or executed. No independent agents were run. This is a selective audit, not an exhaustive audit of any lab.

## Representation sources and consequence

- Martayan et al., *Conway–Bromage–Lyndon (CBL): an exact, dynamic representation of k-mer sets*, Bioinformatics 2024, DOI 10.1093/bioinformatics/btae217. Fresh search through https://pubmed.ncbi.nlm.nih.gov/38940123/ reports smallest cyclic rotations with saved starting positions. The new host https://phd.martayan.org/chapters/necklaces describes prefix quotienting of necklace sets. This is direct prior art for canonicalization plus orientation; it does **not** establish English/BPE/native-chat gains. STROFOS does not claim to invent it or implement the CBL set structure.
- Gabrić and Sawada, *Construction of orientable sequences in O(1)-amortized time per bit*, https://arxiv.org/pdf/2401.14341. Fetched first chunk: cyclic binary windows, reversal disjointness, cycle joining; O(n) per-bit successor construction and O(1)-amortized concatenation-tree construction under their stated space bounds. Those are sequence-generation results, not token compression or model-decoding guarantees. Do not transfer the complexity bound to STROFOS's bounded exhaustive rotation search.
- SEA 2025 stable local consistency paper and arXiv 2606.03570 digit-context decomposition surfaced in fresh searches. They are **search-only leads** in this turn, not verified algorithms or adopted results. The same applies to the 2026 grammar-index and combinadic-codec search results.

## Individual lab follow-ups

**OpenAI:** re-fetched the paid-charge and default-selection artifacts from the pinned `openai/math` commit. Additionally inspected `lean/ComparatorChallenges/SubexponentialSAT.lean`: the target quantifies fixed width k≥2, canonical CNF inputs, one primitive machine, exact counting/SAT, runtime and visited-space bounds. Its ending `sorry` is in a **challenge statement**, not evidence that the accompanying solution failed. We did not retrieve and kernel-replay the entire solution or show applicability to a practical tokenizer optimizer. A SAT existence/time theorem alone is not an implementation, and neither is a native-chat decoder theorem.

**Anthropic formal-math:** re-fetched `CountedToPadded/{Defs,Main,RunFor}.lean`. `Main` explicitly feeds premises into implication theorems: machine query access, polynomial steps, clique-level evaluation and the printed bound. This source inspection does not discharge all imports or establish unconditional whole-stack speed in this repository.

**Anthropic FLT:** inspected README, `FinalCheck.lean`, formalization YAML, and proof-path document separately. FinalCheck derives Mathlib's FermatLastTheorem from the pinned theorem and prints axioms. README reports kernel/comparator checks, while PROOF-PATH explicitly limits some intermediate results to Frey curves instead of general Mazur/Ribet statements. These are reported project checks, **not reruns here**. FLT does not imply a compression lower bound.

**Google DeepMind:** re-fetched Erdős 741(i), inspected final theorem: `answer(False)` iff the universal positive-density sumset partition assertion, with an explicit counterexample used in the reverse implication. The statement and density definition matter; it is not a blanket theorem that any useful text decomposition must fail. No kernel replay here.

**DoubleAI:** inspected All63 Trust/Final/Axioms separately. Trust's route A requires LRAT-byte acceptance and packages 7,224 cases; Final invokes routeB_facts and an attained-63 witness. Certificate routes and trusted assumptions must be accounted for rather than treating the displayed Final file as self-contained. No SAT certificates or Lean build were replayed here; no girth-paper proof audit is claimed.

**Harmonic:** inspected IMO2025P3 main theorem, least constant 4 for the stated positive-integer function predicate, with a concrete extremizing construction. **ByteDance Seed:** inspected separate P3 upper-bound and attainment declarations and axiom-print directives. Source inspection only in both cases, no imported proof graph/kernel audit. Neither result supplies native model byte fidelity.

## Prior-claim corrections retained

Brotli output is an achieved upper bound on description length under that decoder, not a universal lower bound. Paying for arbitrary permutations does not prohibit exploiting restricted invertible ordering. Computable inverse existence does not imply that an arbitrary basic-chat decoder executes it. A source hash binds evidence to an artifact but does not itself prove the artifact correct. `modal.py` executes countermodels for 27 shortcut shapes; it is not a proof assistant.
