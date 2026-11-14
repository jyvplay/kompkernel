# X114 frontier-lab mathematics refresh (2026-11-14)

This is a research note, not a codec claim. The question owed by X109/X110 was
whether newly solved frontier-lab mathematics yields a compression mechanism for
this stack. The honest answer this turn is still **no new wire primitive**, but
one trust pattern is directly transferable and is used by SYNEDRIA's admission
discipline: a speed optimisation is admitted only when an independent comparator
reproduces the incumbent's observable object byte-for-byte.

## OpenAI

- Primary: `openai.com/index/ten-advances-in-mathematics/` and
  `cdn.openai.com/pdf/ten-proofs-oai.pdf`. The longer URL previously tried is a
  404 and is not cited as evidence.
- Repo: `openai/ten-proofs` @ `94bc0fe` (2026-08-02), 44 files, sorry_count 0.
- Oct 6 update: 722 manuscripts / 372 families / ~4000 attempted; **3 withdrawn**
  (Weil classes, Kuga-Satake, rational Hodge for K3 products), 14 revised, ~42%
  Lean-checked. SciAm 6 Aug reported 2 of 10 reused uncited prior work; audit
  arXiv 2608.14673v3.
- Compression applicability: **none extracted**. The relevant lesson is
  provenance and withdrawal discipline: a claimed result must carry its checked
  artefact and its retractions. X114 keeps the negative screens and the corrected
  smoke-arm labelling bug in the receipts rather than silently replacing them.

## Anthropic

- `anthropics/zeta-23-lean` redirects to `anthropics/formal-math`.
- `anthropics/formal-math` @ `16a5ce4` (2165 files) contains zeta23 + eth +
  3sum-apsp; the ETH and 3SUM-APSP formalizations are new beyond the zeta/FLT
  posts.
- `anthropics/fermats-last-theorem`: 232 MB, 13 M lines Lean, 30300 theorems,
  Prove2Me.
- Compression applicability: **none extracted**. Large formal proof corpora are
  a downstream compression workload, not a source of exact message-codec
  operators. The proof-compression measurement below is the closer analogue.

## DeepMind

- `google-deepmind/alphaproof-nexus-results` @ `0647711` (108 files).
- AlphaProof Code (Nov 10): `google-deepmind/code-verification`, libsignal
  v0.105.4 + SPQR v1.6.0, stock rustc -> AArch64, ~140k instructions, 6.5 M proof
  lines / ~26k trusted base, 5 people x 4 weeks, Gemini 4 Carbon provers + Claude
  Opus 5.5 spec review. Gatekeeper = Lean kernel + comparator against a held-out
  human-approved spec; 2 reintroduced bugs caught.
- Compression applicability: **trust pattern transferred, no wire primitive**.
  SYNEDRIA is a speed optimisation that must not change the emitted object. Its
  gate is the same shape: independent byte comparison of complete message, token
  ids, parent costs and CHIRON expansion, plus meter replay so the optimisation
  cannot buy itself extra search budget.

## Microsoft

- KLS resolved, arXiv 2610.01447v2; `HongruZhao/KLS500` @ `c1a5099` (3650 files),
  dimension-free Poincare constant <= 500.
- Compression applicability: **none extracted**. Concentration/isoperimetry does
  not give an exact inverse for o200k message text.

## Mistral (first entry)

- Leanstral (2026-03-16) and Leanstral 1.5 (2026-06-30/07-02), 119B MoE / 6.5B
  active / 256k ctx, Apache-2.0.
- miniF2F 100%, PutnamBench 587/672 and 5 bugs in 57 repos are **secondary-source
  only** in this note; no primary artefact was fetched here.
- Compression applicability: **none extracted**. Model capability benchmarks are
  not reversible transforms.

## Proof compression and BPE theory

- `https://arxiv.org/html/2610.25357v1`: AI formal proofs realise **31%** of
  available logical compression vs **73%** in mathlib (55% vs 86% without
  automation). `github.com/safsom/math-ai-projects`: kappa <= Sigma log2(uses),
  chi_DAG <= log2(max copies) hold for 100% of proofs. This is the closest
  external analogue to the stack's dictionary/grammar residue: even checked
  proofs leave most logical compression unrealised, and the bound is a reuse
  bound, not a new operator.
- Kozma & Voderholzer, *Theoretical Analysis of Byte-Pair Encoding*, ESA 2026,
  `https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.ESA.2026.80`,
  arXiv 2411.08671: optimal pair encoding is **APX-complete** (no PTAS); BPE
  achieves worst-case factor **0.333-0.625** of optimal. This is the honest
  bound for greedy BPE-aware search and a cited negative result against claiming
  optimal tokenisation by a local merge heuristic.
- Kipf et al., *Waiting to Decompress*, CIDR'26,
  `https://www.vldb.org/cidrdb/papers/2026/p34-kipf.pdf`: LLM arithmetic-coding
  compression needs ~10 yr to amortize compute, ~120 yr vs traditional;
  determinism requires identical weights/tokenizer/batch size. Supports the
  stack's CPU-only symbolic stance and the two-tier ledger: AITHER's entropy tier
  is reported separately because it trades readability for density.

## Verdict for X114

No frontier-lab result produced a new exact compression operator this turn. The
transferable item is admission discipline: independent comparator + replay, not
trust in the optimised path. SYNEDRIA is shipped under that discipline; the three
new mechanism screens (same-row percentage, tree geometry, column unit template)
are reported as raw-negative and are not shipped.
