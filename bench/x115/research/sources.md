# X115 live source review

Date: 2026-11-14. Tool actually used: `web_search` (outbound search), plus local
`bash`/`read_file` for repository cross-checks. No model API, no Lean, no z3, no
brotli/zstd binaries are available in this sandbox. Claims below are bounded by
what the search snippets and local code actually support.

## New searches this turn

Queries (new terms/sites relative to the shipped codec bibliography):

1. `lossless prompt compression human-readable reversible normalization byte-exact`
2. `OpenAI ten proofs formal mathematics 2026`
3. `Anthropic formal math refutation 3-SAT 2026`
4. `AlphaProof Code formal verification signal`
5. `doubleAI extremal graph girth Lean`
6. `reversible radix conversion bitfield compression symbolic permissions octal paper 2020 2021 2022 2023 2024 2025`
7. `lossless text compression bijection numeral system representation isomorphism tokenizer arXiv 2024 2025 2026`
8. `site:usenix.org OR site:vldb.org OR site:sigmodrecord.org string compression symbol table FSST 2020 2021 2022 2023 2024`
9. `LTSC meta-token lossless token sequence compression`
10. `Telegraph English semantic rewrite token compression`
11. `Merlin byte-exact chunk dedup`

## Compression / tokenization sources

- **Frequency-Ordered Tokenization (FOT)**, arXiv:2602.22958v2 (2026-10-10):
  <https://arxiv.org/abs/2602.22958>. BPE segmentation + frequency-rank
  renumbering + short byte code before a classical LZ compressor. Reported
  enwik8 gains: zlib -7.96 pp, xz -2.24 pp, brotli -1.96 pp, zstd -1.44 pp, with
  total compression speedups 1.6x/3.2x/1.8x/5.0x. **Inadmissible here as a wire
  codec**: the output is a byte stream for a compressor, not a single basic chat
  message an LLM decodes by reading. Useful as a representation-isomorphism
  precedent: changing the representation before the priced backend can be a
  Pareto move.
- **Language Modeling Is Compression**, ICLR 2024:
  <https://proceedings.iclr.cc/paper_files/paper/2024/file/3cbf627fa24fb6cb576e04e689b9428b-Paper-Conference.pdf>.
  Arithmetic coding with LM predictions; tokenization is lossless pre-compression.
  **Inadmissible**: requires model weights/logits at decode, not one chat box.
- **AlphaZip / neural rank compression**, arXiv:2409.15046:
  <https://arxiv.org/pdf/2409.15046>. Predict token ranks with a transformer,
  then Huffman/LZ77/gzip. **Inadmissible**: neural decoder state.
- **RejuvenateFormer**, arXiv:2412.15250:
  <https://arxiv.org/pdf/2412.15250>. LZW preprocessing + transformer
  decompression, BLEU-scored. **Inadmissible**: not byte-exact, not tool-free.
- **FSST**, PVLDB 13 (2020): <https://www.vldb.org/pvldb/vol13/p2649-boncz.pdf>.
  Fast random-access string compression with a symbol table; greedy encoding,
  AVX512 kernels. Already cited by PROSPHYSIS; re-checked as the nearest
  substring-symbol prior art. ENALLAGE is not FSST: it ships no symbol table and
  substitutes no repeated substring; it changes the radix rendering of a typed
  bit field.
- **Accelerating String-Heavy Queries with LLM Token Tables**, PVLDB 19:
  <https://www.vldb.org/pvldb/vol19/p3635-schmidt.pdf>. Global token table from
  an LLM tokenizer for database text. **Inadmissible** as a one-chat codec;
  useful as evidence that tokenizer-shaped symbol tables are a known backend.
- **FastLanes**, PVLDB 18: <https://www.vldb.org/pvldb/vol18/p4629-afroozeh.pdf>.
  FSST/FSST12 operator census in a columnar format. Confirms symbol-table
  compression is field-level, not a chat-message radix exchange.
- **LiquidCache**, PVLDB 18: <https://www.vldb.org/pvldb/vol18/p5662-hao.pdf>.
  Dictionary -> bit-packed keys -> FSST dictionary values. Orthogonal cascade;
  no one-chat decoder.
- **LogLite**, PVLDB 18: <https://www.vldb.org/pvldb/vol18/p3757-yang.pdf>.
  Streaming log compression with FSST and parser commonality/variability.
  Orthogonal log-template backend.
- **LTSC meta-token review**, arXiv:2506.00307:
  <https://pith.science/paper/2506.00307>. Algorithm 2 `I ← I \ Iswap` overlap
  handling makes reversibility ambiguous; "first lossless" claim is overstated.
  **Inadmissible as-is**: fine-tuning + vocabulary extension.
- **Telegraph English**, arXiv:2605.04426v1:
  <https://arxiv.org/html/2605.04426v1>. ~40-symbol semantic rewrite, median
  -43% tokens. **Inadmissible**: LLM-compressed, fidelity not byte-exact.
- **Z-tokens**, arXiv:2603.25340: <https://alphaxiv.org/abs/2603.25340>. LoRA
  latent tokens. **Inadmissible**.
- **C3 latent cascade**, arXiv:2511.15244v2:
  <https://arxiv.org/html/2511.15244v2>. Learned/latent. **Inadmissible**.
- **Merlin byte-exact chunk dedup**, arXiv:2605.09611 / 2605.09990:
  <https://arxiv.org/pdf/2605.09611>, <https://arxiv.org/pdf/2605.09990>.
  Chunk-level dedup, 0.16-80.34% by regime, ~1.1 µs. Orthogonal chunk-level
  mechanism, not intra-text radix exchange.
- **Foundations of Tokenization**, arXiv:2407.11606:
  <https://arxiv.org/html/2407.11606>. Injectivity necessary/sufficient for
  consistency. Formal backing for bijection-style gates.
- **SentencePiece**, <https://github.com/google/sentencepiece>. `▁` whitespace
  meta-symbol, lossless join. Representation-isomorphism precedent.
- Honest-benchmark discipline references found this turn:
  <https://tokz.dev> (offsets, lossy selection),
  <https://github.com/AHgpuK-sygnia/densely> (unreadable payloads),
  <https://github.com/reh8n/a2acompress> (36.6% held-out ToolBench,
  trajectory-split discipline), <https://github.com/arcnosixta/squeeze>,
  <https://caveman.so/news/headroom-vs-caveman> (33.2% vs 6.7%, exact-answer
  gate, failures kept in row). These are not codec prior art for ENALLAGE; they
  are benchmark-discipline references.

## Hardware radix conversion (searched, not adopted)

- Saranya & Vijeyakumar, *A Novel n-Decimal Reversible Radix Binary-Coded
  Decimal Multiplier Using Radix Encoding Scheme*, Circuits Syst Signal Process
  40 (2021): <https://link.springer.com/article/10.1007/s00034-020-01549-w>.
  Reversible radix recoding in hardware. Not a text codec; searched to check
  whether "radix exchange" was already a named compression primitive. It is not
  the same object.
- Chakraborty et al., *Towards Area-Delay Efficient Reverse Conversion of
  Higher-Radix Signed-Digit Number Systems* (2022):
  <https://link.springer.com/chapter/10.1007/978-981-19-1111-8_1>. Hardware
  reverse conversion. Not adopted.
- *Reversible Data Hiding Based on Varying Radix Numeral System*, CMC 69 (2021):
  <https://www.researchgate.net/publication/352317926_Reversible_Data_Hiding_Based_on_Varying_Radix_Numeral_System>.
  Image data hiding. Not adopted.

## Frontier-lab math review

- **OpenAI + Anthropic ETH refutations (2026-10-26)**. Claimed `2^{o(n)}` 3-SAT
  bound refuted; Anthropic's bound impractical below `n > 10^10000`. CI
  re-verified `formal-math@16a5ce4` + `openai/math@4eaee87` with Lean + nanoda +
  Comparator; axioms only `propext`, `Classical.choice`, `Quot.sound`.
  <https://github.com/konard/p-vs-np/pull/639>. Lesson adopted: a claimed proof
  is not a result until an independent kernel/comparator checks the exact
  artifact; X115 binds codec claims to verifier output, not prose.
- **doubleAI Double Agent girth 4/3 -> 8/5**:
  <https://doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory>.
  Lean zip, Bruhat-Tits quotients, `det(w-I)` certificate. Lesson: the
  certificate object, not the announcement, is the result. ENALLAGE's
  certificate is the 4096-mode independent-decoder unit probe plus the
  complete-message frontier gate.
- **OpenAI 722 manuscripts**: ~42% Lean, 3 withdrawn (sign error, Weil classes),
  14 revised. Lesson: withdrawal/revision rate is a base rate; X115 keeps
  refused candidates in the receipt instead of deleting them.
- **AlphaProof Code**, *Formal Verification of Signal*:
  <https://deepmind.google/documents/36/Formal_Verification_of_Signal_4.pdf>.
  6.5M Lean lines, ~26k trusted spec+semantics, 2 reintroduced bugs caught,
  4 weeks/5 people, libsignal 0.105.4+SPQR 1.6.0 AArch64. Lesson: gatekeeper
  pattern (small trusted spec + held-out comparator). X115's trusted spec is the
  in-band contract + independent decoder; the held-out comparator is
  `tagstackFrontier`/`tagstackX74Chain` on the rewritten body.

## What was not verified

No external LLM was asked to decode an X115 message. No model API exists here.
The LLM-blind-decode claim is therefore **downgraded**, not verified. What is
verified locally is code-decodability, byte-exactness, and measured token cost.

## Proof-status deepening (X115, honest downgrade)

The user asked for individual review of newly solved math and deeper attention to
prior-turn called-out proofs. The sandbox has no Lean/lake/coqc/z3 and no model
API, so no frontier-lab proof was independently kernel-checked here. The review
is therefore a provenance/verification-status review, not a reproduction.

| Lab / artifact | Claim reviewed | What was actually checked here | Status |
|---|---|---|---|
| OpenAI + Anthropic ETH 3-SAT refutation | `2^{o(n)}` claim refuted; CI Lean+nanoda+Comparator | search snippet + GitHub PR reference; no local Lean | external CI claimed, locally unverified |
| doubleAI girth 4/3 -> 8/5 | extremal-graph improvement, `det(w-I)` certificate | search snippet + certificate description | certificate object described, not checked |
| OpenAI 722 manuscripts | ~42% Lean, 3 withdrawn, 14 revised | search snippet | base-rate lesson only |
| DeepMind AlphaProof Code / Signal | 6.5M Lean lines, trusted spec, comparator caught bugs | PDF/search snippet | gatekeeper pattern adopted, not reproduced |
| Microsoft KLS500 (prior turn) | dimension-free Poincare <= 500 | prior-turn note only | no new primary artifact this turn |
| Mistral Leanstral (prior turn) | secondary benchmarks | prior-turn note only | no primary artifact, downgraded |

Transfer to X115: the admissible unit is not the announcement but the checked
artifact. ENALLAGE's local checked artifacts are the 4096-mode independent
decoder, the ambiguity guard, the parent reproduction gate, and the complete
message A/B. ΕΠΙΣΥΝΕΔΡΙΑ's checked artifact is the meter-replay unit plus the
balanced hash comparison. Anything beyond that is downgraded.
