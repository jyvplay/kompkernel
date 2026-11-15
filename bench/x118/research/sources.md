# X118 — live external sources (searched 2026-11-15, ~05:45–06:15Z)

Runtime honesty: these are real `web_search` / `fetch_page` results retrieved this
turn. No Lean/Coq/kernel, no model API, no brotli/zstd binaries are available in
this sandbox, so every lab-math item below is **locally unverified**; vendor and
press claims are downgraded to "reported, not replayed". Compression items are
used only as prior-art boundaries, never as executed components.

## Compression / tokenization prior art (admissibility boundaries)

- arxiv.org/pdf/2505.06297 ; pith.science/paper/2505.06297 — LLM next-token
  arithmetic coding, 14.6–23.8× on LLM-generated text. Referee objection: no
  round-trip receipt, decoder probabilities not bit-stable ⇒ "lossless" unproven.
  **Inadmissible here**: needs model weights at decode time.
- proceedings.iclr.cc (Language Modeling Is Compression, ICLR 2024) — model
  parameters must be counted in the description length; already cited by
  ARCHETYPON. Boundary, not a component.
- arxiv.org/pdf/2409.15046 (AlphaZip) — predict ranks then gzip/brotli; binary
  output. **Inadmissible**: not chat-readable.
- arxiv.org/abs/2602.13266 (LoPace) — zstd+BPE binary packing, 4.89×.
  **Inadmissible**: not chat-readable.
- arxiv.org/html/2604.13066 — dictionary meta-tokens placed in the **system
  prompt**; exact-match >0.99 template / 0.91 Levenshtein algorithmic.
  **Inadmissible**: violates the no-system-prompt + byte-exact floor.
- arxiv.org/pdf/2609.13154 (Lexical Prompt Compression) — lossy (BERTScore).
  **Inadmissible**: violates D(E(x))=x.
- arxiv.org/abs/2601.13398 (RTCE, Findings ACL 2026) — LLMs fail bidirectional /
  inverse code execution. Supports keeping decode rules copy/position-only and
  downgrading any LLM-blind-decode claim.
- arxiv.org/pdf/2506.07541 (Bit-level BPE, Moon/Hiraoka/Okazaki) — sub-byte CJK
  re-encoding; needs new vocab tokens. Boundary.
- arxiv.org/html/2504.00178v1 ; COLM 2025 BoundlessBPE — superwords across
  pretoken boundaries, +15–20% bytes/token; **retraining**. CRASIS-style reuse of
  *existing* compound tokens is the admissible analogue.
- aclanthology.org/2024.emnlp-main.40/ (Tokenization Is More Than Compression,
  PathPiece) — fewer tokens ≠ better downstream. Caution against token-only
  objectives; this repo's objective is explicitly tokens + wall/CPU + exactness.

## Per-lab math results (individual review; all locally unverified)

- github.com/yang-mills-group/OpenAI-YM-20261028 (fetched chunks 0–1) — Wilson
  Yang–Mills construction, Lean 4.32.0, 9 pinned deps; kernel replay of
  100,168 / 250,319 declarations for 17 results; axioms only
  propext/Classical.choice/Quot.sound; **standalone Comparator NOT run**; mass
  gap, continuous-mass exclusion, MS-bar matching **out of scope**; 7/8 credited
  modules byte-identical recompile. Status: reported replay, not replayed here.
- github.com/yang-mills-group/YM — assessment-1.pdf dated 10 Nov 2026: proves a
  Wightman-axiom QFT as the scaling limit of 4D Wilson lattice gauge theory for
  any simple compact group; A1–A8 reading route. Reported.
- github.com/anthropics/formal-math/pull/31 (fetched) — `eth/` Lean+Mathlib
  v4.33.1, merged 16a5ce4 27 Oct; only two `sorry`, both in Challenge.lean; CI
  `verify (eth)` passed. Reported.
- github.com/anthropics/formal-math/issues/36 (fetched c0–c2) — carlostoledo1891
  ports: `ETHIsFalse` is literally s₃=0 on FinTM2/`encClauses 3`; bridges to
  cslib complexitylib multitape ETH; nanoda 23,430 → 77,276 → 101,618
  declarations; planted `sorry`/axiom/statement variants refused. Caveats:
  author = checker author; "cslib ETH = textbook ETH" is a reading; some
  paranoid checkers hit fuel/stack limits. Obvious crank spam in-thread ignored.
- doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory
  (fetched) — 6 Oct 2026, (q³+1)-regular graphs, girth ≥ (8/5)log_{q³}n − O(1)
  vs 4/3 since 1988; certificate det(w−I) ≠ 0, divisible by level⁴; paper
  girth85.pdf + girth85-lean.zip; matching upper bound for a 28-regular family.
  Reported; no local replay.
- arxiv.org/html/2606.03303 (LEAP) — AND–OR DAG proof memory; 12/12 Putnam 2025;
  Lean-IMO-Bench 83.3% / 56.7% (ablation 73.3→83.3, 40.0→56.7). Architectural
  analogue of SYNEDRIA reuse, **not** a compression source.
- Axiom Stacks Project (16M lines, 4 Nov 2026) + Weil conjectures; ~97% of tags
  in an unreviewed AI tier; Kim Morrison reported duplication/statement gaps
  (techtimes.co.uk, huggingnews.com). Downgraded.
- Navier–Stokes: en.wikipedia.org/wiki/Navier–Stokes_existence_and_smoothness ;
  unite.ai ; tuftsdaily.com — 8 Sept 2026 forced finite-time blowup reported
  (~10,000 agents / 88 h / 130B tokens); Clay "apparently settled"; 6 Oct arXiv
  preprint reports the Lean is not semantically faithful to the prose proof;
  Constantin–Ignatova–Vicol (17 Sept): method does not extend to real-analytic
  forcing. **Vendor claims stay downgraded.**

## What these sources changed in X118

1. RTCE (2601.13398) is the reason every screened candidate kept a copy/position
   inverse and why no LLM-blind-decode claim is made.
2. The system-prompt dictionary paper (2604.13066) and the binary packers
   (AlphaZip, LoPace) fix the admissibility floor: in-band, byte-exact,
   chat-readable, no weights.
3. No lab-math result was used as a compression component; they are reviewed
   individually above and remain unverified locally.
