# X62 research and verification record

Date: 2026-10-30. Branch: `arena/57a89a57-kompkernel`.

## Runtime inventory / honesty

- Available and used: Node.js v22.22.3; TypeScript 5.9.3 (`npx tsc --noEmit`); Python 3.11.2 stdlib for independent decoders; the repo's `gpt-tokenizer`/`o200k_base`; Bash, Git, and installed `tree`/`find`; Arena web search and page fetch. `nproc` reports 2 CPUs.
- Not available/used: no independent agent, external LLM API/native model roundtrip, simulator, external database, Lean/Lake, Coq, Agda, Isabelle, or Z3. No theorem prover or human expert review. Nothing in this record claims native LLM decoding.
- `npm ci --ignore-scripts` installed the locked dependencies. npm reported 4 audit findings (3 high, 1 critical); no audit remediation was attempted.

## A. Formal model and success predicate

**Admissible object.** A source is a finite UTF-8 byte string `x`; byte equality, not visual/semantic equality or Unicode normalization, is the restoration relation. A lane is a named, locally available real fixture with a recorded SHA-256. A codec has an encoder `E`, a deterministic decoder `D`, and an in-band contract `C`.

**Access model.** The decoder gets exactly one ordinary chat message: the complete contract, every table/legend needed by the rule, and the parent-compressed payload. No `skills.md`, hidden prompt, external decoder, private dictionary, side channel, retrieval, pretrained-to-this-format assumption, or out-of-band state is allowed. A standard LLM's ability to execute a contract is a separate empirical claim and was not measured here.

**Primary resource.** `T(m) = countTokens(m, o200k_base)` for the *entire message*, including transformation rule, table, parent contract, and payload. The comparator is the complete same-source TAGSTACK runtime-parent + SIBLING-TEMPLATE frontier, not a registry-wide sweep. Encoding/runtime is a secondary metric; a candidate does not gain compression credit for lower raw payload tokens if it increases the complete message.

**Per-input success.** For a source `x`, a candidate succeeds only if `D(E(x))` is byte-identical to `x`, the full source frontier and candidate frontier both completed, and `T(E(x)) < F(x)`. For this project turn, a practical win is additionally at least 10 `o200k_base` tokens on one authentic lane, with no regression on the declared comparison set (the safe identity/frontier fallback is allowed). Native-model success would require a fresh model receiving only `E(x)` to return byte-identical `x`; that gate was not run.

**Quantifier order.** A mechanism-level claim is `∃ C,E,D ∃ x∈L : exact(x) ∧ T(E(x)) ≤ F(x)-10`, with a fixed, stated lane `L`. A corpus Pareto claim is stronger: `∀x∈H, exact(x) ∧ T(E(x))≤F(x)`, and `∃x∈H, T(E(x))≤F(x)-10`, for a frozen held-out set `H`; no such new result was obtained. The codec's per-input fallback only establishes non-regression on the tested inputs where its source frontier was complete, not on all possible strings. A broad arbitrary-input codec claim needs the encoder/decoder proof for every admitted input, not just the fixtures.

**Units/boundaries.** Token counts are integer `o200k_base` tokens; code-unit caps are UTF-16 code units in the JS planners; exactness is UTF-8 byte equality after decode. The X61 repeated frontier used default environment, Node v22.22.3, `OMEGA_DET` unset, path `bench/holdout-x40/metrics.tsv`, fixed SHA in its receipt. This is not equivalent to byte-size compression, semantic preservation, task accuracy, or model inference FLOPs.

**Adjacent but different problems excluded:** lossy summarization / relevance pruning; learned embeddings or hidden-state compression; bitstream/arithmetic coding with a separate decoder/model; compression requiring a tuned vocabulary or fine-tuned model; dictionary compression with an out-of-band dictionary; exact compression of bytes rather than full chat tokens; semantic Markdown equivalence instead of byte restoration; an observed member-only win instead of a complete-frontier win; a single successful decode without a declared-domain guarantee.

## B. Outcome space

- **H+ (achievable):** possible for a finite, structured lane if its redundant structure survives the parent's best encoding and the full contract amortizes. Existing stack lanes demonstrate that exact complete-message wins can occur; this does not imply universal compression.
- **H− (impossible universally):** no injective lossless mapping can strictly shorten every member of an unrestricted finite-alphabet source class under a fixed finite message budget. By counting, if the number of source strings exceeds the number of available code messages, two sources must collide. This is a limit on universal guarantees, not on particular redundant lanes.
- **H∂ (boundary-dependent):** this is the current status of X62's target. Benefit depends on source-specific redundancy *after* the existing full parent frontier, contract cost, exact decoder model, tokenizer, and lane distribution. The RHIZOMA tree inputs have only 2–4 tokens of parent-side savings, smaller than the 16-token contract, so both tested complete-message candidates lose. This is evidence about those two files, not an impossibility proof for all tree outputs.

No global H+ / H− resolution was made. For the requested practical test, the observed result is negative on the declared X62 lanes.

## C. Frontier and open interface

The exact X61 configuration was rerun after the X62 code work. `bench/x61/receipts/frontier-repeat-x61.json`: same source SHA `b367e8d7ab00c2e3f9a63da90d6a68968bf7d29fd8d41b37f1ed3188edf1ac70`, 1,203 chars, 811 raw tokens; complete exact frontier 210 tokens; winner `akolouthia2`; `repeatMatchesPreviousGate: true`; X60 saved gate 210. X62 repeat elapsed 89,551 ms. This is a match, not a new compression win. Scope remains the same six recorded parent costs and SIBLING-TEMPLATE; it is not a registry-wide tournament.

For RHIZOMA on `tree-src.txt`, the complete same-source frontier is 987 tokens (APOGRAPHE); the complete candidate message, including the contract, is 999: +12. On `tree-bench.txt`, source frontier is 241 (SYNKRISIS); the complete candidate message is 255: +14. Receipts record the complete costs, not a separately itemized candidate-parent cost, so no parent-only delta is claimed here. The exact open interface is therefore not restoration; the local transform restores perfectly. It is whether any supported tree representation can reduce the already-compressed parent enough to pay the one-chat decoder cost. These data show a shortfall of 12/14 tokens, not a proof no such representation exists.

## D. Negative space and modal shortcut attack

At least these plausible-looking outcomes do not satisfy the contract:

1. RHIZOMA's 546-token raw-text token reduction on `tree-src.txt`—it is not the final message; full candidate loses 12.
2. RHIZOMA's 35-token raw-text reduction on `tree-bench.txt`—full candidate loses 14.
3. Replacing NBSP with ASCII space and calling it byte-exact because it looks the same. It changes U+00A0 to U+0020. `redteam-rhizoma.ts` explicitly compares this shortcut and fails equality.
4. Restoring only one NBSP where the source had two.
5. Treating a newline-normalized result as equal while dropping CRLF identity; prior `newline-probe.ts` found 0 token gain on both inspected fixtures anyway.
6. A repeated URL's raw alias saving before paying its decoder (canvas changelog full loss +173).
7. URL-prefix factoring based on raw token counts without measuring the parent (README +162; miniserve +144).
8. CommonMark reference-link syntax as a semantic substitute for original inline-link bytes.
9. Stripping Markdown comments, front matter, badges, or boilerplate: content is lost unless transmitted in-band.
10. Replacing curly quotes/dashes with ASCII without a map of the exact original code points.
11. Collapsing indentation in YAML/JSON/code: whitespace can be syntactic or part of a string.
12. Removing a tree connector line because a later branch appears to imply it; filenames and empty directories defeat the inference.
13. Applying the RHIZOMA marker in filenames after the branch boundary; it is only a code before `├──`/`└──` and the red team checks a caret in a filename.
14. Guessing that ordinary ASCII indentation was NBSP. RHIZOMA refuses that input instead of inventing code points.
15. Accepting a reserved `^` already in the tree indentation. Encoder refuses; test attacks it.
16. Accepting a malformed one-NBSP pair or NBSP outside a validated tree connector; encoder refuses.
17. A forward URL reference (`⟦U0⟧` before definition) in SYNDESMOS; its red team requires rejection.
18. Reporting a parent/member comparison as a complete-frontier victory.
19. Reporting exact restoration of the parent-transformed payload as proof an arbitrary LLM will decode the contract.
20. Calling LLMZip/arithmetic output a one-chat codec when its probability model and arithmetic decoder must be shared out of band.
21. Calling task-oriented prompt pruning byte-lossless because QA accuracy happened not to change.

The modal shortcut is the false equation `NBSP = ASCII space` based on rendering. It fails because the Unicode code points differ. The new test checks that `source.replace(/\u00a0/g, ' ') !== source`, while the independent decoder restores the exact NBSP bytes on both complete tree fixtures.

## E. Mechanism portfolio and second-order attackers

| Candidate / central construction | Concrete artifact and proved portion | A(C): cheapest specific attack / status | Exact unresolved interface; gap |
|---|---|---|---|
| **RHIZOMA:** in validated tree-entry prefixes, replace each `│ + NBSP + NBSP` with `^`; the in-band mapping restores the exact triple. | `src/lib/omega/rhizoma.ts`; `bench/x62/redteam-rhizoma.ts`; independent Python `rhizoma-twin.py`; complete-frontier receipts for both tree fixtures. Encoder invariant checks every NBSP position; exact TS/Python restore passed. | Put one NBSP in a filename, use ordinary ASCII spaces, truncate the final branch, put `^` in an indentation prefix, tamper with a marker, or put `^` in a filename. Tests cover NBSP outside prefix, ordinary spaces, malformed pair, marker collision, astral filename, CRLF, no final newline, filename caret, and tampered marker. Full gate loses +12/+14. | Local pricing gap only on these two sources; no proof of tree-domain impossibility. Complete message fails the project's practical-win threshold. |
| **SYNDESMOS repeated-target interning:** repeated Markdown URL destination → first-seen ID. | `src/lib/omega/syndesmos.ts`; red-team and full fixture receipts in `bench/x61/receipts/`. TS + independent Python restore; three complete frontiers lose (+114/+173/+144 after X61 prefix update). | Forward reference, alias order reversal, reserved marker collision, nested bracket/unsupported URL, one-use targets; tested in prior receipts. Also parent compression may already encode repeated URLs. | Parent-interface gap; candidate raw saving does not survive re-encoding and contract. |
| **SYNDESMOS URL-prefix table:** factor common path prefix, in-band prefix table, then aliases. | Same module/receipts; exact transform and full-frontier measurement on README and miniserve. | Prefix that ends mid-escape, query/host boundaries, unmatched marker, source marker collision; grammar restricts prefix to slash boundaries, independent twin checks full fixtures. | Direct algorithmic prior art exists; only possible novelty is chat interface/gate. Full-frontier deltas +162/+144. |
| **CAESURA NBSP spans:** span markers for qualifying nonbreaking-space word separators; a different whitespace-specific rule. | Existing `src/lib/omega/caesura.ts`; actual `caesuraEncode(tree-src)` call returned exact 1,040-token base and `caesuraApplied:false` (no eligible span); `bench/z55/REPORT.md` has prior tree experiments. | Tree indentation NBSP follows box-drawing glyphs, not eligible word-separator spans; fastest falsifier is that exact call, which refused. | Already in stack, not new; irrelevant local span grammar. |
| **Tree grammar / ASCII conversion (DENS-2, DENDRON, KLADOS family):** encode branch depths/subtrees rather than whitespace spans. | Existing source/modules and X55 report; previous real lane runs report DENS-2 gains on other tree fixtures, while KLADOS and indent-only attempts lose. | Truncated `npm ls` output, nonuniform tree prefixes, filenames that resemble branch syntax; X55 reports a failed ASCII round trip on truncated lines and indent probes that miss after the contract. | Existing stack prior art; not a new contribution. This is why RHIZOMA is not claimed globally novel. |
| **LTSC meta-token sequence coding:** LZ77-like dictionary maps repeated token sequences to special tokens. | Harvill et al., arXiv:2506.00307; the paper's algorithm includes its instance dictionary in the compressed prompt and reports fine-tuning plus additional vocabulary tokens. | Run the code with a stock, unfine-tuned one-chat model and no added tokens: it does not have learned meta-token semantics. | Explicitly violates the current access/model constraints; this is not a usable drop-in codec here. It is close prior art for token-sequence reuse, not a stack win. |
| **LLM predictive arithmetic coding:** entropy-code next-token ranks from a shared model. | Valmeekam et al., arXiv:2306.04050 / LLMZip. | Change weights, tokenizer, floating-point execution, hardware, or logits; encoder/decoder probability tables can diverge. It also emits bitstream rather than directly model-readable text. | Requires a synchronized external model and bit decoder; outside the in-band direct-reasoning problem. |
| **Lossy semantic/token pruning:** remove text not needed for a target task. | CompAct (EMNLP 2024), ProCut (EMNLP Industry 2025), and `mdcompress` are concrete external artifacts. | Ask a task requiring an omitted character, license clause, code comment, or exact whitespace; restoration is impossible. | Solves task utility, not exact restoration; excluded, not a candidate codec. |

The six mechanism classes above are not six new codecs: several are existing stack mechanisms or external prior art, and that fact is part of this review. Only RHIZOMA was added in X62; it is tested and registered but does not win. No global novelty claim is made.

## F. New-paper scan and exact relevance

Live searches on 2026-10-30 used new phrases/sites (arXiv, ACL Anthology, ACM DL, GitHub project pages) rather than relying only on codec-abbreviation citations.

- **Harvill et al., “Lossless Token Sequence Compression via Meta-Tokens,” arXiv:2506.00307 (2025).** The method replaces repeated token subsequences with instance-specific meta-tokens and prepends the dictionary; the paper describes fine-tuning and adding vocabulary tokens. The reported compression includes the dictionary. This is close prior art for token-sequence reuse, but it does not satisfy “stock model, one basic message, no learned token vocabulary.” I read the arXiv HTML; I did not reproduce its experiments. https://arxiv.org/abs/2506.00307
- **Valmeekam et al., “LLMZip: Lossless Text Compression using Large Language Models,” arXiv:2306.04050 (2023).** Predictive probabilities/ranks plus entropy coding; a lossless bit compressor, but not an in-band text decoder and dependent on synchronized model probabilities. No LLM or arithmetic-coder reproduction was run. https://arxiv.org/abs/2306.04050
- **Delétang et al., “Language Modeling Is Compression,” ICLR 2024.** Empirical arithmetic-coding connection between model prediction and lossless bitstreams; not direct chat readability and excludes the separate model/code cost from this project's message metric. https://proceedings.iclr.cc/paper_files/paper/2024/file/3cbf627fa24fb6cb576e04e689b9428b-Paper-Conference.pdf
- **Yoon et al., “CompAct,” EMNLP 2024; Xu et al., “ProCut,” EMNLP Industry 2025.** Task-oriented pruning/compression, not byte-lossless reconstruction; explicitly excluded. https://aclanthology.org/2024.emnlp-main.1194/ and https://aclanthology.org/2025.emnlp-industry.20/
- **`mdcompress`** advertises stripping frontmatter, comments, boilerplate and truncating code blocks; useful as a relevance/size tool, but many rules delete source information. Not eligible under exact byte restoration. https://github.com/dhruv1794/mdcompress
- **Brisaboa & Cerdeira-Pena, “Improved Compressed String Dictionaries,” CIKM 2019.** Hierarchical front coding and LCP methods applied to URL collections; direct prior art for the prefix component of SYNDESMOS. https://dl.acm.org/doi/10.1145/3357384.3357972

No paper discovered in this scan removes the core lower-bound: in this stack, a transform must improve the *parent-compressed* message enough to pay an in-band decoder. The promising raw token deltas did not do so.

## G. Frontier-lab mathematics audit

This is a primary-source scan, not proof verification. The newly inspected material is in addition to the earlier X61 record in `docs/codecs.md`.

- **OpenAI:** public `openai/math` describes results at mixed verification stages. The linked `ComparatorChallenges/SubexponentialSAT.lean` and `LocalSmoothing.lean` are comparator/scaffold files with `by sorry`, not the proof artifacts; this does not refute the separate formalizations. The ETH and local-smoothing/Kakeya scope documents are not a build. We did not download/build the actual target projects, papers, or proof dependencies. https://github.com/openai/math and https://github.com/openai/math/blob/main/lean/docs/378.md / `079.md`.
- **Anthropic:** its September 2026 Fermat's Last Theorem post claims a Lean-checked proof assembled over eleven days and describes use of existing Imperial / flt-regular work and external mathematical input. FLT is classical, not a newly discovered theorem. We inspected the announcement only; no source build or axiom/dependency audit. https://www.anthropic.com/research/formalizing-fermats-last-theorem
- **Google DeepMind:** the July 2026 Deep Think post separates autonomous research, human–AI collaboration, and algorithmic insight. The IMO 2025 result is presented as natural-language proofs, not a machine-checked proof. No individual result was independently reproduced. https://deepmind.google/blog/accelerating-mathematical-and-scientific-discovery-with-gemini-deep-think/ and https://deepmind.google/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/
- **Meta:** AutoformBench reports 341 Lean 4 tasks from 24 advanced-math sources with expert-audited statements; AutoformBot/Atlas reports a large textbook formalization library. These are formalization-infrastructure results, not a claimed new conjecture proof in the inspected posts. We did not run their benchmark or artifacts. https://ai.meta.com/research/publications/autoformbench-a-lean-formalization-benchmark-for-advanced-mathematics/ and https://ai.meta.com/research/publications/autoformbot-formalizing-mathematics-at-scale/
- **DeepSeek:** current official news search surfaced a model release, not a primary-source new machine-checked research theorem. Non-discovery in one search is not proof none exists. https://www.deepseek.com/en/news/
- **xAI:** official pages found model/engineering claims rather than an identified machine-checked new theorem. Non-discovery is not proof none exists. https://x.ai/news/grok-4-5 and https://x.ai/news/grok-4-1

No theorem prover was present. These claims receive status “lab-reported; not independently verified here”; none supplies a text-codec lemma that reduces the full-message cost. A Lean build, even if performed elsewhere, would establish its encoded theorem relative to its kernel, axioms, and dependencies—not automatically certify the paper's intended mathematical interpretation.

## H. Verification and next highest-information test

Latest executed gates: `npx tsc --noEmit`; TS RHIZOMA adversarial suite (9/9); independent stdlib-Python tree decoder (2/2); full exact frontier on both tree fixtures; exact X61 repeat match. See receipts in `bench/x62/receipts/` and `bench/x61/receipts/frontier-repeat-x61.json`.

**Verified artifact:** RHIZOMA is a bounded, exact, byte-restoring, in-band tree-indent transform, registered in the Omega registry. **Not verified:** a strict complete-message win, practical non-niche benefit, or native-LLM decoding. The acceptance criterion remains unmet. Next test with highest information gain: find a real tree-style source where the current TAGSTACK+SIBLING source frontier leaves more than the 16-token decoder margin in this specific indentation layer; pre-screen only with real files, then run the complete gate and a fresh blind LLM decode if an actual LLM service becomes available. If no such lane is found, investigate a different under-covered source family rather than tuning marker spelling on these already-parent-compressible fixtures.
