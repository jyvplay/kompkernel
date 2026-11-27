# X191 research ledger — scoped source inspection, not an exhaustive proof audit

Date supplied by the runtime: **2026-11-14 UTC**. Live search, page/PDF retrieval
and GitHub API retrieval actually occurred. No Lean/lake/Z3 executable was found
in the environment inventory. No independent agent, external expert, simulator,
model endpoint or proof kernel was invoked. Node, Python, TypeScript, esbuild,
Vite and reference tokenization are the local experimental systems.

## New terms, recent compression results and a new site

New queries included “lossless text compression reversible transposition context
sorting natural language”, “compression antidictionary bidirectional unique path
text graph”, and “text compression bidirectional schemes attractors survey dag
exact”. Retrieval does not establish novelty or correctness.

### Exact bounded optimization rather than an optimality story

*Computing NP-hard Repetitiveness Measures via MAX-SAT*, ACM Transactions on
Algorithms, February 2026, DOI 10.1145/3777895. Freshly read chunks 0 and 2 of the
primary article; this DOI had no prior tracked docs/bench match. The authors
encode smallest string attractors, bidirectional macro schemes (BMS), and SLPs
as MAX-SAT. A valid BMS must have acyclic symbol dependencies eventually reaching
literal ground phrases. Phrase count/rule count, not our complete BPE wire,
is optimized. The reported implementation handles SLP/BMS texts of a few hundred
symbols and much larger attractor instances. None of those reports was replayed.
The article's clause-count bounds do not assert practical polynomial-time SAT
solving or a readable single-chat encoding. We import neither an approximation
ratio nor a global impossibility conclusion for our different objective.
[2](https://dl.acm.org/doi/10.1145/3777895)

The crucial contrast: DIEXODOS permits graph cycles because walk LENGTH is
bounded; BMS cyclic symbol dependencies without a literal base are not valid.
These are different decoding problems despite both using directed graphs.

### New domain, and an error not inherited

`courses.grainger.illinois.edu` had no prior tracked docs/bench citation. Actually
fetched the October 29, 2024 student presentation *Partition and Code*, by
Yuen Chen, Shane Wang and Peizhi Niu. It discusses accounting for learned-model
cost and graph ordering; it is a secondary course presentation, not a new proof.
Its claim that identifying graph isomorphism “is super-polynomial” is not adopted:
a general super-polynomial lower bound is not established by that slide.
[1](https://courses.grainger.illinois.edu/ece563/fa2024/ProjectGraph.pdf)

Located the original Bouritsas–Loukas–Karalias–Bronstein NeurIPS 2021 paper/repo.
Its learned partition/dictionary/distribution plus entropy encoder is graph
compression, not direct native text decoding. The preprint is outside a strict
five-year window from this session; it is ancestry, not the qualifying recent
paper. The 2026 ACM article above supplies recent primary material.
[1](https://github.com/gbouritsas/PnC)

Search also returned STC (2026), already explicitly implemented as SYMFRAZ;
we rejected it as a new idea after repository checking. A 2024 transformer text
compression paper reports BLEU scores: such metrics cannot certify our exact
byte reconstruction, irrespective of a “lossless” label in the pipeline.
[1](https://arxiv.org/html/2606.03570)
[4](https://arxiv.org/pdf/2412.15250)

## Individual frontier-lab investigations

### OpenAI — deeper superstring interface

Fresh primary search again located the mathematics release; its claims are not
all reverified here.
[1](https://openai.com/index/sharing-ai-progress-in-mathematics/)

Pinned `HostComplete.lean` and `HostNormalization.lean` from `openai/math` using
GitHub; commits and SHA256 in `receipts/research-sources.json`. These extend the
prior GroupSupply/BlockClose investigation. Sources are cache-excluded but
`retrieve-sources.py` can restore and hash-check them. No Lean replay occurred.

Read `Model.hardPlan_spec`: under a model relation to a layer collection,
substring closure, a valid cut, target membership, successful UpperCode.test and
foreign predicates, it returns GoodPlan, coverage of remaining layer entries,
at most one request, and `planBudget ≤ 2*((size-cut)*period)`. The budget explicitly
includes walk cost, block reserves AND request reserves. That reserve accounting
is exactly the kind of cost that cannot be dropped in our parent message.
This is a symbol-cost structural theorem under its own predicates—not a twofold
BPE guarantee for arbitrary prose, greedy graph edges, or our encoder latency.
We did not verify every imported dependency or the compiler.

### Anthropic / Claude — deeper RH-related source inspection

Freshly fetched primary announcement: the described result is a lower-bound
improvement for the proportion of zeros on the critical line, not that every
nontrivial zero lies there. The page says it does not expect its techniques to
prove full RH. A partial result does not adjudicate a different later full-proof
claim. Search also returned later-dated November 21 secondary full-RH claims;
no full RH certificate was verified here.
[1](https://www.anthropic.com/research/riemann-zeta)
[2](https://kingy.ai/blog/claude-riemann-hypothesis-67-percent-result/)

Fresh pinned source reads: `zeta23/Zeta23/LinAlg/Inertia.lean`, `Main.lean`,
`Challenge.lean`, `Solution.lean`, and repository README. Inertia states, for
finite index types over RCLike and Hermitian Q, `n₊(BᴴQB) ≤ n₊(Q)`, and positive-
index subadditivity for Hermitian Q1,Q2. Its proof maps a positive-definite
subspace injectively through B and bounds the image dimension. No decoding or
entropy claim follows from that inequality.

`Main.lean` contains conditional assembly theorems with explicit-formula,
Riemann–von Mangoldt, Hilbert-moment, gamma and trace hypotheses. **We did not
mistake these intermediate hypotheses for a fatal gap in the final release.**
The separately read `Solution.lean` delegates unconditional challenge statements
to Final/FinalMult/ThmD/ThmE libraries. Their entire dependency closure and
comparator were not replayed. Thus inspection is stronger than a headline read
but weaker than independently checking the advertised theorem. The stored
repository includes multiple projects; a green unrelated CI job would not
certify zeta, and we did not claim one did.

`math-sanity.py` is an exact-integer finite check of the two inertia inequalities
for 2×2 symmetric matrices and B entries in {-1,0,1}. It is a local sanity test,
not the general proof and not an RH verification.

### doubleAI — construction hypotheses and a failed transfer

Freshly fetched primary announcement and chunk 0 of the October 2026 paper
*d-Regular Graphs of Girth (8/5) log_(d−1)n*. Theorem 1.1 fixes a prime power q,
d=q³+1, and constructs finite connected bipartite d-regular graphs indexed by
m≥m0 with n_m≤h Q^(15m) and girth≥8m log_q Q−2r log_q16. This implies the stated
8/5 coefficient after changing log bases; constants depend on the construction.
This is not a result for arbitrary degrees or arbitrary directed text graphs.
Only the first PDF chunk was read; the 38-page document was not fully audited.
No arithmetic certificate or released Lean zip was kernel-checked.
[1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory)

Transfer falsifier: a tree with edges a—b and a—c has no simple cycle but two
length-two walks from a back to a. High girth alone therefore does NOT establish
DIEXODOS walk uniqueness: backtracking is allowed. This explicit counterexample
is executed in `math-sanity.py` and included in the exhaustive graph domain.
The graph construction cannot simply replace our uniqueness test.

### Google DeepMind / Gemini — new proof system scope

Freshly fetched the November 10, 2026 *AlphaProof Code: Verifying Signal’s Security
at the Machine-Code Level*, first PDF chunk. It describes proofs against approved
Lean specifications, AArch64 semantics, and explicit contracts for low-level
cryptographic primitives. The trusted base includes specifications/semantics,
Lean kernel, cryptographic assumptions and contracts of called routines. It is
not an assumption-free proof of every property of the actual messaging system.
Its human specification approval and held-out comparator are relevant methodology:
we likewise must not replace raw bytes with a convenient semantic predicate.
No part of its claimed 6.5-million-line development was replayed locally.
[3](https://deepmind.google/documents/36/Formal_Verification_of_Signal_4.pdf)

Fresh search also found the Aletheia/Deep Think report on arithmetic geometry,
independence polynomials and Erdős tasks. Benchmarks/reports do not supply our
compression theorem; that article's entire proof portfolio was not audited.
[1](https://deepmind.google/blog/accelerating-mathematical-and-scientific-discovery-with-gemini-deep-think/)

### ByteDance Seed

Individual live primary-domain search returned Seed-Prover (2025), with
lemma-style whole-proof refinement using Lean feedback and formalized IMO/
MiniF2F/PutnamBench results. It is evidence about a different evaluated system,
not access to such a verifier here or a new compression result. No run occurred.
[1](https://seed.bytedance.com/en/public_papers/seed-prover-deep-and-broad-reasoning-for-automated-theorem-proving)

### Harmonic

Individual live query returned the primary introductory report distinguishing
external-CAS-allowed results from fully Lean proofs. That distinction is important
for trust accounting; neither setting certifies this implementation. We did not
invoke Aristotle or treat search results about its interface as access.
[2](https://www.harmonic.fun/news/intro-harmonic/)

### Meta

Individual query returned the primary 2022 HTPS account, plus secondary 2026
claims about algebra/discovery. The former is theorem-search performance; the
latter was not promoted to independently verified mathematics here. No Meta
proof certificate or new compression theorem was adopted.
[1](https://ai.meta.com/blog/ai-math-theorem-proving/)

### xAI and Qwen

Separate site-targeted live searches returned mostly secondary cross-lab lists
and unrelated verification benchmarks, not a primary theorem suitable for
importing into this codec. This is a bounded search failure, **not** a claim
that those labs have no results. No theorem or performance claim from these
results is used.

## Exact open interface

The unsolved engineering conjunction is: fully charged representation under a
fixed tokenizer; original-byte recovery; broad prose/ops benefit; useful latency;
all-stack novelty; and actual isolated native-chat decoding. None of the inspected
results bridges that conjunction. There was no exhaustive search of ALL papers,
ALL lab results or ALL codec semantics. The next highest-information native trial
still requires an experimental interface not exposed in this session.
