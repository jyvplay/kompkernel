# X117 external sources and proof status

Live searches run 2026-11-15 (UTC), batches 5 and 6. Only sources actually
returned/fetched by the tools are listed. No Lean, Lake, Coq, Z3, brotli, zstd,
or model API is available in this sandbox (`bench/x117/receipts/runtime.txt`).
Every frontier-lab math claim below is therefore **locally unverified** and is
recorded as an artifact/announcement, not as a theorem this repository checked.

## Batch 5 (04:26–04:29Z): tokenization / casing / formal-math artifacts

| Source | What it supports | Admissible for X117? |
|---|---|---|
| [1](https://arxiv.org/html/2609.15991v2) Makowski & Guter, “The Functionalizer” (18 Sep 2026, MIT CTL) | Dictionary-free bijective opcode/operand pre-tokenizer in the Unicode PUA: params U+E000–E0FF, operators U+E100+; CAPITALIZE(pos), 13 diacritic opcodes, REPEAT/MULTIREPEAT; operators prefix the base piece after a Llama-style regex split; decode applies operators in reverse, repetition last; heterogeneous cased repeats fall back. Reports −19.7% vocab slots, Python validity 9.12% vs 7.70%. Cites Bérard 2019 inline casing, Etchegoyhen & Gete 2020, Bayram 2025 root tags, TokenMonster capcode, InCa/InDia 2025, Factorizer (VQ-VAE, non-bijective), Morfessor, MorphBPE, SCRIPT-BPE. | Idea prior art for opcode/operand factoring, **not** a readable byte-exact chat wire. PUA glyphs are multi-byte; EUTELEIA byte-floor predicts loss on o200k. X117's caseMask/idShapes/humps screens are exactly this family and lose (screen.json). |
| [2](https://github.com/openai/math) `openai/math` @ `4eaee87` (30 Oct 2026) | 721 manuscripts / 373 families, ~42% top-line formalized; `lean/formalization.yaml`, ComparatorChallenges. | Aggregate formalization claim. No local Lean build; per-theorem statement fidelity unchecked. |
| [3](https://github.com/anthropics/formal-math) `anthropics/formal-math` @ `16a5ce4` (27 Oct 2026), `eth/README.md` fetched in full | #3-SAT in 2^O(n log log n/√log n), “purely asymptotic”; Lean+Mathlib v4.33.1 pinned; `MainResults.lean` = `ETHIsFalse` + `MainTheorem`, imports only Mathlib, no proofs; build ~8 min / 24 vCPU / ~7 GB; only axioms propext, Classical.choice, Quot.sound; two `sorry` both in Challenge.lean; CI `comparator-check.sh` re-checks with second kernel nanoda; explicit caveat “no machine checks that this file says what the paper says”; condensed tensor-network hint (e(9K^16) ≤ 0.9·e(K)+O(1/K), SWAP = I − 2·singlet) rederivable by Opus 5.5; Apache 2.0. | Most checkable in principle, but **not checked here**. The README's own caveat is the exact statement-fidelity gap: a kernel-checked file is not a kernel-checked claim that the file expresses ETH. Two `sorry` are outside MainResults but must not be silently inherited. |
| News secondary: Nov 7 Impagliazzo “very shocking”; Nov 8 RoundSquare mass-gap Lean claim; Nov 10 Gross committee nears Lean release; reviewers’ “involvement should not be taken as certification” | Community reaction / pending artifacts. | **Announcement only.** No artifact executed; reviewer involvement is not certification. |
| Inadmissible batch: ACL 2026.aacl-long.107, MedTPE 2605.11774, Z-tokens 2603.25340, Tamil FST 2608.01153, LTSC 2506.00307/2604.13066 | Lossy, domain-specific, or external-state compression. | Fail bare-chat byte-exact / no-external-state floor. |

Transferable lesson from Functionalizer: factoring casing/repetition into
opcode+operand is old prior art, and on o200k the multi-byte operator alphabet
is a tax. X117 screens falsified the raw complete-key versions on this corpus:
caseMask 40 580 vs raw 28 015; idShapes 28 942; humps 29 897. Do not re-propose.

## Batch 6 (04:32–04:34Z): email threads / lexical compression / proof memory

| Source | What it supports | Admissible for X117? |
|---|---|---|
| [4](https://patents.google.com/patent/US20020073157A1) US20020073157A1; Zajic et al., IPM 2008 email-thread summarization | Email threads as semi-connected text; quote elision for summarization. | Prior art for the *idea* of quote removal, but lossy. X117 quoteRuns is exact and still loses: raw Σ29 28 392 vs 28 015; through the real frontier email-thread 486→506 (+20) because SYNKRISIS already codes `>` repeats. |
| [5](https://arxiv.org/abs/2609.13154) “Lexical Prompt Compression” (Sep 2026) | 11 toggleable CPU-only techniques: abbreviation/contraction/filler removal; ROUGE/BERTScore evaluated. | Lossy-enough; inadmissible for byte-exact readable wire. |
| [6](https://arxiv.org/html/2606.03303v3) LEAP (12 Nov 2026, Google Cloud AI Research + DeepMind + UCLA) | Persistent AND–OR DAG proof memory with verified-lemma reuse beats tree search; all 12 Putnam 2025; Lean-IMO-Bench 83.3% Basic / 56.7% Advanced; general LLMs only, no prover fine-tuning. | Benchmark/system claim. No local reproduction. Relevance to X117 is architectural: reuse verified sub-results (SYNEDRIA) rather than re-search; not a compression source. |
| Other Nov-2026 math: 2610.22603 Busy Beaver accelerations proved in Lean; 2611.11645 (8 Nov) agent research infrastructure; 2605.22763 AlphaProof Nexus (492 OEIS formalizations) | Formal artifacts / infrastructure claims. | **Locally unverified.** No Lean/OEIS build here. |

## Per-lab math review (individual, not headline inheritance)

- **OpenAI**: `openai/math` aggregate + ETH/local-smoothing/Yang–Mills claims from
  X116 batches remain downgraded. The Oct 30 snapshot is an inventory, not a
  proof check. Statement fidelity, uniformity, and asymptotic-vs-practical scope
  are separate checks; none ran here.
- **Anthropic**: `formal-math/eth` is the strongest public artifact this batch.
  Its README explicitly separates kernel checking from statement fidelity and
  pins Lean/Mathlib. We record the pin, axioms, sorry locations, and second-kernel
  CI, but do **not** claim ETH is refuted. 3SUM/APSP/FLT/Rocq claims from X116
  remain partial/known-theorem formalizations, not local checks.
- **Google DeepMind**: LEAP is a proof-memory system with benchmark numbers;
  AlphaProof Nexus/OEIS/IMO are artifact/benchmark claims. None executed here.
  The admissible transfer is schedule reuse, not a theorem.
- **Other labs / vendors**: RoundSquare mass-gap, Gross committee, doubleAI girth,
  Shanghai AI Lab Ghys remain announcements or public-artifact claims. Reviewer
  involvement is not certification; kernel bugs (X116 sources) mean even a build
  would need statement audit.

No search result was used to claim a local execution that did not occur.

## Mechanism source for ΣΥΝΘΕΣΙΣ

ΣΥΝΘΕΣΙΣ claims no new POSIX fact and no new compression-theory primitive. Its
three entailments are the repository's X90/X115/X116 constructions:

- symbolic↔octal mode: POSIX `chmod`/`ls` folklore (X115 sources);
- symlink size = target byte length: POSIX `lstat(2)`/`readlink(2)` (X116 sources);
- cross-field template: X90 ΣΥΜΦΥΊΑ fit/contract/rewrite.

The X117 contribution is engineering: common-subexpression elimination over the
three in-band contracts and a single-pass conjunction schedule over commuting
disjoint-field rewrites. Contract CSE is measured by the fusion ladders
(`receipts/fusion-ladder*.log`); the schedule is measured by the balanced A/B.
No paper cited above claims this schedule.
