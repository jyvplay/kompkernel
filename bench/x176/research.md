# X176 live research — 2026-11-14 UTC

Selective source inspection, not an exhaustive survey of ALL solved mathematics. No theorem kernel was run. Search results suggested leads; the primary pages below were fetched, with the precise extent noted. Pinned GitHub follow-ups (16 files across seven projects) have source hashes in `receipts/research-artifacts.json`, reconstructible via `research-fetch.py`.

## Fresh compression sources and the open interface

1. Bannai, Köppl, Lipták, *A Survey of the Bijective Burrows-Wheeler Transform*, 2025. [1](https://drops.dagstuhl.de/entities/document/10.4230/OASIcs.Manzini.2). Fetched PDF section on ordering and factorization: finite lexicographic order and omega order can differ on proper-prefix pairs (ab vs aba); on Lyndon words the factor ordering agrees. BBWT sorts rotations of Lyndon factors in omega order, not arbitrary finite lexicographic order. LF cycles recover Lyndon factors, concatenated in nonincreasing order. KYKLOGRAF uses those rules over space fields as alphabet atoms. `attacks.ts` actually finds a wrong-finite-order counterexample. The survey is new to this repository's citations; BBWT itself was already discussed in X135/X168/X174, and ordinary BWT already had a control. This is implementation follow-through, not discovery of BBWT.

2. Köppl and I, *Revisiting (Bijective) Burrows–Wheeler Transform Space–Time Trade-Off Constructions*, arXiv:2611.02969v1, 2 Nov 2026. [2](https://arxiv.org/html/2611.02969). Fetched opening section: for τ∈[3,n], construction-batch alphabet σ_τ≤min(σ,τ+1), and τσ_τ=O(n), the stated time is O((n²/τ)logτ/loglogτ), extra space O(τσ_τ). If σ_τ∈w^{O(1)} and w∈Ω(log n), the time improves to O(n²/τ+n logτ/loglogτ). Inversion substitutes global σ. This is an in-place letter-cell model, **not** our JavaScript implementation or an LLM-native theorem. KYKLOGRAF uses a bounded simple rotation sorter; no claim to implement these bounds.

3. Bannai, I, Nakashima, *On the compressiveness of the Burrows-Wheeler transform*, submitted 18 Nov 2024. [3](https://arxiv.org/abs/2411.11298). Abstract fetched: there exists an infinite family highly compressible after BBWT despite high dictionary-compression measures before it; polylogarithmic comparisons concern dictionary measures. We did not audit the full proof. This is an existence result over constructed strings, not an all-prose statement, fixed-tokenizer price bound, or evidence that this parent chooses the necessary grammar.

4. Ruben Keurentjes, *The Effect of Alphabet Reordering on the Bijective Burrows-Wheeler Transform*, Leiden BSc thesis, 22 July 2026. New repository host `theses.liacs.nl`: catalog, individual record and opening PDF fetched. [4](https://theses.liacs.nl/3841). The introduction reports that replacing Lyndon words with the proposed absolute-Lyndon variant destroys bijectivity; it therefore investigates alphabet ordering instead. We did not fetch/validate the later full proof. Consequence: do not replace factorization by a visually similar notion and inherit its inverse theorem. A next experiment can change a **total order shared by encoder and decoder**, but cannot discard ordering metadata unless that order is reconstructible from the transmitted multiset.

5. Kuratov et al., *Cramming 1568 Tokens into a Single Vector and Back Again*, ACL 2025. Primary abstract fetched. [5](https://aclanthology.org/2025.acl-long.948/). Per-sample vector optimization and input-embedding access change the access model: a vector is not one ordinary chat token and its finite precision must be counted. The citation already existed in X141; do not claim it is new to the repository.

Fresh searches also surfaced AlphaZip 2409.15046 and a lossy character-prediction student project. Neither is adopted: model logits/rank decoding require extra machinery; 93.62% character accuracy is not exact losslessness. Search-only numerical claims were not imported into our acceptance ledger.

**Open interface:** an invertible rearrangement can improve a downstream compressor, but no imported theorem supplies (a) paid o200k gains against this concrete parent, (b) significant whole-stack runtime improvement, or (c) exact single-chat model decoding. Those are the experiments and missing behavioral gate, not consequences of the word 'bijective'.

## Individual lab follow-ups beyond X175

### OpenAI

Fetched `Algorithm`, `Interfaces`, `Computation`, and `SubexpOrderedRawMainTheorem` at the pinned openai/math commit. Inspected the explicit last theorem: for every fixed k≥3, **one** primitive machine and fixed positive C,A,d precede **all** ordered binary-identifier formulas with clause width ≤k; output/time witnesses follow each formula. The final time bound is `runtimeBound` in encoding length and formula dimension. This is stronger quantifier placement than choosing a machine for each formula; do not interchange them. The theorem references many imported modules, so its displayed proof and axiom-print directives do not constitute local kernel verification. The earlier `ComparatorChallenges/SubexponentialSAT` `sorry` was in a challenge, not the claimed solution. No practical SAT optimizer or text-codec speed is inferred from this source inspection.

### Anthropic formal-math

Fetched deeper `CountedToPadded/{Defs,Need,SolverPoly}`. SolverPoly constructs polynomial-time rounding/exponent functions and plugs query-machine lookup under the definitions' premises. This does not by itself establish an unconditional practical compressor. The query and encoding hypotheses remain material. No dependency graph build was performed.

### Anthropic FLT

Fetched the actual `Theorems/Thm_fermat_last_theorem.lean`, not just README: declaration has n≥3 and strictly positive natural a,b,c, delegated to the generated P2MW solution. Re-inspected FinalCheck's Mathlib wrapper and axiom guard, plus PROOF-PATH's explicit limits on Frey-curve-specific intermediate results. We did not replay that large dependency graph; project-reported kernel success is not our own execution. Neither FLT nor the wrapper proves a compression lower bound.

### DoubleAI

Fetched deeper `ChessProof/Trust.lean` in addition to All63 Trust/Final. Inspected CNF conversion, nonzero-literal/well-formedness bridge, LRAT parsing, `LRAT.check_sound`, and RouteA's requirement of accepted certificate bytes for every case. This gives a precise conditional trust path. The All63 Final route used previously invokes routeB_facts; its separate Axioms file declares case Unsat assumptions. No certificates were downloaded/replayed here; source inspection must not be labeled full 7,224-case verification. The girth result is not claimed audited.

### Google DeepMind

Re-fetched Erdős 741(i), inspected the positive-density sumset-partition target and its false-answer/counterexample structure. The relevant formal density definition and disjoint partition quantifiers must accompany any reuse. No implication to ordinary text compression or model reading follows. No kernel replay.

### Harmonic and ByteDance Seed (separate artifacts)

Re-fetched each lab's IMO2025 P3 source. Harmonic proves a least-real-constant formulation for its Bonza predicate; Seed separates an upper bound for positive integer arguments from an existence/attainment witness. Their formulations and imports differ, so agreement of titles is not independent verification of every step. The constant-4 result is unrelated to paid token packing. No local kernel run on either.

## Novelty limits

`inventory.py` scans 419 other modules and prior citation occurrences at base bd09437. Its results are lexical triage, not a semantic proof against every codec. METATRON/EPISTEME mention Lyndon terminology; STROFOS rotates individual words with offsets; DIATHESIS/VALENCE encode permutations; ordinary BWT control pays a primary index. KYKLOGRAF implements cross-field BBWT factor/cycle inversion, but belongs to a classical transform family. No claim of a novel information-theoretic primitive, private AI insight, or terminal codec.
