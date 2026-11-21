# X150 live literature and lab-proof audit

Scope: targeted searches and selected primary artifacts, **not** an exhaustive
review of all AI labs or all newly solved problems. Search terms this turn:
`lossless text compression ... reversible natural language`, `lossless text
compression conditional functional dependencies`, `reversible compression
memory adapter ACL`, `ECMA 48 ... SGR`, and individual lab + Lean/problem terms.
Fetched pages and GitHub artifacts are distinguished below. No Lean, Lake,
proof replay, external expert review, API model endpoint, simulator, or GPU was
available/used in this sandbox.

## Papers and standards

1. Montanari and Weiner, *Compressing Tabular Data via Latent Variable
   Estimation*, ICML 2023, https://dl.acm.org/doi/10.5555/3618408.3619456
   (fetched abstract) and https://arxiv.org/abs/2302.09780 (search metadata).
   Four-stage latent estimation, block partition, sequential compression,
   and latent encoding. The asymptotic entropy/AEP and optimality claims are
   for their probabilistic categorical-table model with independent row/column
   latents and conditionally independent cells; they are not a lower bound on
   a finite arbitrary prose file, an o200k tokenizer, or a native chat decoder.
   An admissible adaptation would need an in-band, byte-exact order/latent
   certificate and empirical chat behavior. The abstract is not a proof audit.
2. Ting et al., *Bridging the Memorization-Utilization Gap*, ACL 2026,
   https://aclanthology.org/2026.acl-long.682/ (fetched abstract; PDF search
   snippet). The authors report 16 input tokens per memory embedding versus
   about 5.3× sequence-length reduction and 98% of full-context QA performance
   under a trained pooling/RL pipeline. This is not exact byte reconstruction
   and violates the unchanged-model/no-new-representation constraint. It is a
   useful warning: retrieval/use of encoded information differs from recovery.
3. R³Mem, ACL Findings 2025, https://aclanthology.org/2025.findings-acl.235.pdf
   (search snippet only). Reversible adapter + virtual memory; trained
   architecture, not a plain in-band single-chat codec. Reversible architecture
   by itself does not establish exact byte decoding of finite-precision text.
4. Git's `color.diff` and `--color=always` documentation
   https://git-scm.com/docs/git-config and https://git-scm.com/docs/git-diff/2.19.0
   (search excerpts); Debian console_codes(4)
   https://manpages.debian.org/testing/manpages/console_codes.4.en.html
   (search excerpt) defines ECMA-48 SGR syntax. They document the observed
   transport, not CHRISMATA's compression design. Git config can change
   colors and whitespace highlighting; the codec checks bytes instead of
   assuming the documentation forces a particular rendering.

## Selected lab artifacts, individually and explicitly limited

- **OpenAI local smoothing (2026):** fetched the publisher statement
  https://openai.com/index/building-scientific-understanding-with-academic-communities/
  and retrieved its linked scope via GitHub API into
  `receipts/openai-079.md` (https://github.com/openai/math/blob/main/lean/docs/079.md).
  It states n≥2, 2≤p<∞, Schwartz initial data, Lp on Rⁿ×[1,2], Sobolev order
  max(0,(n−1)/2−n/p)+ε for ε>0 (and s=0 at p=2); the listed Kakeya result is
  full *Hausdorff dimension*, not a positive-volume assertion. Strict-range
  and δ^-ε losses matter. This is a **reported** formalization; no proof
  dependency closure or comparator replay was performed. No codec implication.
- **OpenAI SAT:** `bench/x148/receipts/openai-computation.lean` examined again.
  `CandidateTheorem` is a **definition of a proposition with no inhabitant in
  that file**: ∀ width ≥3, `ExponentFeasible width (9/10)`; feasible chooses a
  machine and positive bound constants for each fixed width before quantified
  instances. Other files may claim stronger results; this one alone is not a
  proof of ETH failure, a uniform all-width solver, or a practical compressor.
  We did not run Lean or the complete claimed proof.
- **Anthropic FLT:** fetched https://www.anthropic.com/research/formalizing-fermats-last-theorem
  and saved `FinalCheck.lean` through GitHub API
  (`receipts/anthropic-finalcheck.lean`). The pinned theorem quantifies over
  naturals n≥3 and positive a,b,c, with aⁿ+bⁿ≠cⁿ. The file checks its reported
  axioms and derives Mathlib's `FermatLastTheorem`. The repository reports a
  comparator and patched independent nanoda kernel; X147 preserved the
  scripts. None was run here, nor did we verify the 13-million-line dependency
  closure. This is formalization of an existing theorem, not a newly discovered
  FLT proof route or evidence of a codec.
- **Google DeepMind AlphaProof vs Gemini:** fetched
  https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/
  and https://deepmind.google/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/.
  The former reports 4/6 IMO 2024 solutions, manual formal translation and up
  to three days; the latter reports 5/6 IMO 2025 problems in natural language,
  35/42 points, IMO-official grading, plus general hints and a curated corpus.
  Olympiad grading is not kernel replay. Prior-turn DeepMind PQXDH headline
  (`bench/x148/receipts/deepmind-headline.lean`) states a one-key ROM game,
  δ-correct KEM and explicit security reductions/bounds, not unconditional
  deployed security. Neither is a byte-exact text compressor.
- **doubleAI girth:** refetched primary summary
  https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory.
  Claimed for each prime power q an explicit infinite family of (q³+1)-regular
  graphs with girth ≥(8/5)log_(q³)n−O(1); a particular degree-28 family also
  has a matching upper bound. The det(w−I) certificate has nonzero,
  divisibility and distance-bound obligations. PDF fetch failed again; Lean
  is linked as a zip on a host unavailable to shell; no statement or kernel
  replay, hence reported claim only. This is not a theorem for every degree.
- **doubleAI zk circuit:** prior receipt
  `bench/x148/receipts/doubleai-zkp-readme.md` states an existential committed
  circuit with resource caps, correctness on 9,024 hash-derived distinct-x
  samples, not a universal all-input point-addition theorem; SP1/Groth16
  verification was not run. A valid proof of this statement, even if checked,
  would not imply circuit release or an immediately practical attack.
- **AxiomMath dihedral:** prior `bench/x147/receipts/axiom-basic.lean`: n≥2,
  m≥1, t≥0, pointwise off-identity rate order, even powers 2m; forwards to
  `Lyons.sum_abs_centered_pow_le`. Imported proof closure not replayed. No
  assertion about arbitrary groups, odd exponents or codec performance.

None of these imports supplies a no-new-vocabulary, byte-perfect, native-chat
codec or a validated speedup for this repository. In particular, an asserted
lab breakthrough cannot substitute for implementation, source-byte checks,
whole-message pricing and the independent reader-behavior experiment.
