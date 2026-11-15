# X119 external source record

Searches executed live this turn (2026-11-14 UTC) with `web_search` / `fetch_page`.
No model API, no Lean kernel, no external verifier service was available in the
sandbox. Lab-math items below are reviewed as claims, not executed proofs.

## Compression / tokenization prior art (new terms this turn)

1. **LTSC — Lossless Token Sequence Compression via Meta-Tokens**
   - https://arxiv.org/abs/2506.00307 ; https://arxiv.org/html/2506.00307v1
   - Harvill et al., May 2025. LZ77-style meta-token dictionary prepended to the
     prompt; reports 27% / 18% sequence reduction on two tasks. Requires added
     vocabulary tokens and fine-tuning (Qwen2.5-Coder-0.5B, 500 meta-tokens).
   - Pith referee report: https://pith.science/paper/2506.00307
     Algorithm 2's `I ← I \ Iswap` removes start indices only, not whole spans;
     under the literal reading a later candidate starting inside an already
     swapped span is not rejected, so swaps can overlap and the transform is not
     invertible. The prose intends a span check; the pseudocode does not say it.
   - **Use here:** the overlap bug is the concrete second-order adversary for any
     span-substitution candidate. DIGLOSSIA's sites are disjoint by construction
     (`overlaps` on domain+rule+interval) and every accepted batch is re-decoded
     through `chironDecode`; the failure mode is closed, not assumed away.
   - **Inadmissible as a component:** added vocab + fine-tuning violates the
     one-plain-chat, no-system-prompt, no-weights contract.

2. **Dictionary encoding without fine-tuning** — https://arxiv.org/pdf/2604.13066
   - Claims LLMs can learn encoding keys in-context; dictionary in the *system
     prompt*; overlap prevention marks all positions used and rejects nested
     compressions.
   - **Inadmissible:** system-prompt meta-tokens are outside the admissible
     object. Prior art for in-band dictionaries is already owned here by
     PRAXIS/PHRASE/CHIRON. DIGLOSSIA adds no dictionary entry.

3. **CompactPrompt** — https://arxiv.org/html/2510.18043v1
   - Reversible n-gram abbreviation table (lossless part) plus lossy
     pruning/quantization. Prior art for phrase dictionaries; does not supply
     per-occurrence contextual spelling.

4. **How Far Should Tokenization Go?** — https://arxiv.org/abs/2608.18025
   - Fact–Token vs Token–State boundary: reversible BPE can shorten the carrier
     while raising predictive codelength. **Boundary:** X119 claims carrier
     tokens only, never downstream model quality.

5. **LoPace** — https://arxiv.org/html/2602.13266
   - Zstandard + BPE binary packing. Binary, not chat-readable; inadmissible.

6. Tokenizer retraining cluster (boundary only, all require weight/vocab changes):
   - https://openreview.net/pdf?id=ZFYBnLljtT (reversible tokenizers; Identity
     pretokenizer saves >50% but worst downstream)
   - https://openreview.net/pdf?id=zGej22CBnS (ICLR 2025 exact byte-level
     probabilities; BPE vs MPE cover encodings)
   - https://arxiv.org/pdf/2508.04796 (Parity-aware BPE)
   - https://openreview.net/forum?id=tS3gexmfeT (Fusion Token, 10-grams, +1024 vocab)
   - https://2024.emnlp-main.40 (PathPiece: fewer tokens ≠ better downstream)

7. Lossy prompt-compression cluster (inadmissible, recorded to bound the search):
   - https://2025.acl-long.1219 (500xCompressor, soft tokens)
   - https://2025.emnlp-industry.20 (ProCut, attribution pruning)
   - https://2025.coling-industry.44 (PCKE)
   - https://2025.naacl-long.592 (PromptOptMe)
   - https://2024.findings-acl.134 (Unpacking Tokenization: compression correlates
     with downstream — correlational, not a lossless guarantee)
   - https://2025.acl-long.1546 (Beyond Text Compression: multilingual caveat)

8. New DIGLOSSIA-specific searches (this turn, terms not used by existing codecs):
   - `per-occurrence reversible dictionary substitution BPE tokenization contextual spelling lossless prompt compression`
     → returned general BPE explainers, LoPace, and a custom-log-BPE Medium post
     (https://medium.com/@chirag.abhatia/designing-a-local-log-compression-service-with-custom-bpe-tokenization-c3ae6d61b32e).
     None supplies a per-use choice between an existing rule's glyph and literal
     spellings priced on the complete message. The Medium post replaces *all*
     occurrences of a pattern (per-rule), which is exactly the quantifier
     DIGLOSSIA relaxes.
   - `LTSC lossless meta-token dictionary overlapping swaps non-invertible Algorithm 2 arXiv 2506.00307`
     → confirmed the Pith overlap objection and the fine-tuning requirement above.

**Honest citation for DIGLOSSIA:** no external paper supplies the mechanism.
The framing imports are LTSC's overlap adversary (closed here) and the
Fact–Token/Token–State boundary (carrier-only claim). The per-occurrence
contextual judgment over an incumbent CHIRON tape is original to X119.

## Frontier-lab math review (individual, honest, locally unverified)

No Lean/lake/coq/z3, no model API, no GPU. None of these is used as a compression
component. They are reviewed for whether a proved object could become an
admissible in-band entailment; the answer so far is no, because the certificates
are either kernel-checked artifacts outside the chat or existence statements
without a printable inverse.

### OpenAI / Yang–Mills
- https://github.com/yang-mills-group/YM — assessment dated 10 Nov 2026;
  `python3 scripts/verify.py integrity|all`; macOS mode lacks Linux/Landrun
  isolation; 4 Nov submission still WIP.
- KITP 3rd statement (9 Nov); https://github.com/scottnarmstrong/yang-mills-informalization
  — 2nd draft 12 Nov, 265 pp, 8 parts / 32 units, 989 key statements over
  413 000 lines.
- https://casrai.org/news/ai-rivals-physics-mathematical-challenge-2026 ;
  https://aiera.blog/openai-yang-mills-proof-verified — committee used OpenAI
  Astra, "does not claim to fully understand"; Woit: existence standard ≠ Clay;
  mass gap open.
- **Compression relevance:** a mass-gap existence proof is not a finite
  printable inverse for any text transform. No admissible component. The
  informalization's 989 key statements are a ledger, not a kernel receipt.

### Anthropic / formal-math
- https://github.com/anthropics/formal-math/tree/16a5ce4.../eth —
  `MainResults.lean` (`ETHIsFalse` / `MainTheorem`), Mathlib-only, 2 `sorry` in
  `Challenge.lean`; build 8 min / 24 vCPU / 7 GB; axioms `propext`,
  `Classical.choice`, `Quot.sound`.
- Root README: Palomar Comparator + nanoda + landrun; CI verifies only changed
  projects.
- **NEW `formal-math/zeta23`** — ≥2/3 of ζ zeros simple & on the line, 5/6
  distinct; Montgomery–Taylor constants 0.67250 / 0.83625; Dirichlet analogues;
  17 challenge `sorry` + 6 XiPrime.
- https://github.com/formal-applied-math/formal-mathfin — 658 benchmark results:
  624 full, 18 restate, 16 reduced cores.
- **Compression relevance:** the `sorry` count is load-bearing. A theorem with
  17+6 admitted holes is not a certificate. Even a complete Lean proof of a
  zero-density statement does not yield a byte-exact text inverse; it would at
  best justify a numeric entailment, and the numeric lanes here are already
  owned by DIASTEMA/AKOLOUTHIA2/ABACUS. No component.

### Google DeepMind
- AlphaEvolve — https://arxiv.org/abs/2511.02864 : 67 problems, 20 improvements /
  8 regressions; Kakeya construction → Deep Think proof → AlphaProof Lean.
- https://whataifound.org/lab/google-deepmind — matrix-mult exponent <2.371177,
  4×4 complex in 48 mults, 11-D kissing bound; AlphaProof Nexus 9 Erdős + 44 OEIS.
- **AlphaProof Code / Signal, 12 Nov 2026** — >6 M lines Lean, Gemini Carbon
  agents, ~1% human review.
- **Compression relevance:** an improved matrix-mult exponent is an algorithmic
  constant, not a text representation. The 48-mult 4×4 complex scheme could in
  principle shorten a *numeric* circuit description, but no lane here carries
  such a circuit, and the certificate would have to be printed in-band. The
  regressions (8/67) are the honest shape: search over constructions is not
  monotone. No component.

### DoubleAI
- Girth 8/5 vs 4/3 (6 Oct 2026): paper + Lean zip, `det(w−I)` certificate,
  28-regular matching upper bound.
- Newer items: 19 Oct extremal chess; 25 Oct Alignment via Generalization;
  6 Nov "Can LLMs redesign themselves as they train?".
- **Compression relevance:** the girth certificate is a finite determinant
  identity — the closest in shape to an admissible entailment — but it certifies
  a graph property, not a string inverse. Printing `det(w−I)` would cost more
  than any lane's numeric residual. No component.

**Fractal-depth note on proofs flagged in prior turns:** the recurring defect is
not the mathematics but the *interface*: a kernel-checked artifact lives outside
the chat, and an existence theorem has no printable witness. X119's admissible
object is a single plain-chat string whose inverse is comprehension + the
incumbent CHIRON reader. None of the lab results above supplies such an inverse.
They are recorded as reviewed and declined, not as unexamined.
