# X16 report: LAKONIKOS-D, frontier re-run, negative variants, and scratchpad

## 0. Verdict

- **Committed codec:** `lakonikos-d` (`src/lib/omega/lakonikos-d.ts`, registry key `lakonikos-d`). It is the DAEDALUS-D wire with the LAKONIKOS terse decoder contract. The wire is byte-identical to DAEDALUS-D's.
- **Measured gain:** 28 lanes, exact on 28 of 28. Against the X16 frontier minimum it is lower on **11 lanes** by 5 to 11 o200k tokens. Seven of those lanes are 9 to 11 tokens lower: de-kb 481 vs 492 (−11), readme 678 vs 688 (−10), bibliography 699 vs 709 (−10), kb-article 640 vs 650 (−10), llm-answer 696 vs 706 (−10), ls-full-iso 395 vs 405 (−10), git-log-iso 1520 vs 1530 (−10). Four more are 5 to 9 lower (meeting-transcript −9, ls-l-bin −9, node-stacktraces −7, email-thread −5).
- **Success predicate, item by item:**
  - byte-exact and lossless: **verified in code** (chironDecode round-trip gate on every encode; identity fallback) and by an independent CPython reader (27 of 27 wires exact, `bench/chiron_decode.py`).
  - beats the frontier by more than a few tokens on at least one lane: **measured yes** (de-kb −11; six more lanes at −10). The gain is small (about 1.5 to 2.2 % on those lanes) and comes from the contract text, not from a new wire mechanism.
  - readable by an LLM in one chat with no system prompt, skills file, or tools: **not verified**. No LLM is reachable in this sandbox. The only LLM-style check in the repo is the earlier LAKONIKOS self-decode on three fixtures, written and decoded by the same model, so it is not blind.
- **Net:** the predicate is **not confirmed**. The token bar is met on measurement. The readability bar is open, and I am not claiming it.
- **HOMOIOS:** negative. 0 wins on 30 lanes (identity fallback everywhere). It is ANTIPHON at block granularity, not a new mechanism.
- **Language-tier alias:** negative again on all 28 lanes. One win (de-kb −4), 17 losses after the empty-table artifact is removed.
- **Frontier:** re-run. The X15 frontier values reproduce on every cell except one A10 timeout. No frontier minimum changes. DENS-2 leads 15 lanes, AKOLOUTHIA-2 7, DAEDALUS-D 6.

## 1. Runtime honesty

**Used in this turn**
- `bash`, `git`, `node` with `esbuild` bundles, `node_modules/.bin/tsc --noEmit` (passed, exit 0 after each edit), `python3` (CPython reader `bench/chiron_decode.py`, and a small leaders script).
- Background runs: two concurrent `frontier-run.sh` processes (A and B, earlier in the turn); a registry-path check (`frontier-lkd.sh`) and a 28-lane alias run, concurrently with each other, on 2 CPU cores. All runs used `OMEGA_DET=1`.
- `fetch_page`: OpenAI math `CONTENTS.md` raw chunks 0, 26, 27 (earlier turns), 40 (this turn), and 1, 20, 50, 70 (this turn). 8 of 80 chunks total.
- `web_search`: the five X16 queries listed in section 9 (earlier in this turn).

**Not used**
- No LLM was called. No other model, agent, or subagent was run. No theorem prover (Lean links in the OpenAI math index were not built or run). No database. No simulator. No GPU. No compiler beyond `tsc` and `esbuild`.

**Determinism.** Under `OMEGA_DET=1` the DAEDALUS-D column matches across three separate runs: the frontier run, the in-process check (`lakonikos-d-check.ts`), and the registry-path run (`frontier-lkd.sh`). 28 of 28 lanes agree on both codecs in the last two. The alias run gives identical numbers to the X13 receipts on the seven lanes they share.

**Not claimed.** No speed claim. No parallel-speedup claim. No claim that the encoder budget is never hit: the wire is budget-dependent in production (`budgetMs`), and `OMEGA_DET=1` removes that dependence for measurement.

## 2. Repository state and commit scope

- Branch `arena/95aaefc1-kompkernel`. HEAD on the base is `7c7da87` (merge of PR #29).
- Before this turn, many files from earlier turns (X9–X16) were untracked, and `src/lib/omega/registry.ts` imports 14 of them (`akolouthia*`, `dendron*`, `hora`, `hemera`, `gnomon`, `synartesis`, `anaphora-fold`, `onomasia`, `kladios`, `diaphora`, `homoios`). Committing the registry change alone would give a commit that does not build. This commit therefore includes those files as they are in the working tree (about 3.7 MB, 470 files). Nothing was deleted or reverted. `tsconfig.tsbuildinfo` is left out.
- Commit content: `lakonikos-d.ts`, the registry entry, the X16 bench scripts and receipts, `docs/codec-abbreviations.md`, and this report.

## 3. The codec (LAKONIKOS-D)

- **Wire:** `daedalusDualEncode` (DAEDALUS-D). Unchanged.
- **Contract:** `lakonikosDecoderPrompt(wire)`. The rules sentence is replaced by the terse sentence (`New Hangul before ¶ starts a rule to the next new Hangul or ¶. After ¶, expand rules recursively; print only the result.`). The repeat and list clauses are unchanged. The function throws if the old sentence is absent.
- **Gate:** `chironDecode(wire) === input`, else identity. The codec also checks that the DAEDALUS-D prompt equals `chironDecoderPrompt(wire)`, so the shortened prompt is derived from the same wire.
- **Token accounting:** o200k and cl100k counts of the full prompt (contract plus wire).
- **Code:** `src/lib/omega/lakonikos-d.ts`; registry entry in `src/lib/omega/registry.ts`.

## 4. Receipts for LAKONIKOS-D

| check | result | file |
|---|---|---|
| in-process encode, 28 lanes | exact 28/28; countCheck 28/28; DAEDALUS-D column equals frontier run on 28/28 | `bench/x16/receipts/lakonikos-d-v1.jsonl` |
| registry path (`frontier-min.ts`, FM_KEYS=daedalus-dual,lakonikos-d) | identical to in-process on 28/28 | `bench/x16/receipts/lakonikos-d-registry.jsonl` |
| CPython reader (`bench/chiron_decode.py`) on 27 LAKONIKOS-D wires | 27/27 exact (the 28th is identity) | `bench/x16/lakonikos-d/out.json` |
| `tsc --noEmit` | exit 0 | — |

Totals over 28 lanes, o200k: DAEDALUS-D 31,075, LAKONIKOS-D 30,833 (−242, −0.8 %). Most of the total is the fixed ~10-token rules clause repeated per lane, so the relative gain is largest on short rule-based messages.

Lanes where LAKONIKOS-D is lower than the X16 frontier minimum (negative = better):

| lane | LAKONIKOS-D | frontier min | leader | delta |
|---|---|---|---|---|
| de-kb | 481 | 492 | DAEDALUS-D | −11 |
| readme | 678 | 688 | DENS-2 | −10 |
| bibliography | 699 | 709 | DAEDALUS-D | −10 |
| kb-article | 640 | 650 | DAEDALUS-D | −10 |
| llm-answer | 696 | 706 | DAEDALUS-D | −10 |
| ls-full-iso | 395 | 405 | DAEDALUS-D | −10 |
| git-log-iso | 1520 | 1530 | DAEDALUS-D | −10 |
| meeting-transcript | 411 | 420 | DENS-2 | −9 |
| ops-ls-l-bin | 238 | 247 | DENS-2 | −9 |
| node-stacktraces | 332 | 339 | DENS-2 | −7 |
| email-thread | 520 | 525 | DENS-2 | −5 |

Ties: ops-ls-l-omega (954), git-log-fuller (143, identity). Above the frontier on 15 lanes, including the ops-table and CSV lanes where AKOLOUTHIA-2 leads (df-h 171 vs 269, chart.svg 330 vs 455, kubectl 326 vs 380, psql 355 vs 387). spring-projects loses to DENS-2 by 3.

**Honest reading.** This is a contract-text saving. It is the same kind of gain as LAKONIKOS on the plain wire, applied to the frontier wire. It is not a compression mechanism, and it does not change the decoder. It is a real and reproducible Pareto move on prose, and it is small.

## 5. Frontier restatement (X16, re-measured)

Table: `bench/x16/receipts/leaders-x16.tsv` (28 lanes, all six X16 keys). Raw rows: `bench/x16/receipts/frontier-A.jsonl`, `frontier-B.jsonl`.

- **Against X15:** for all six keys (DENS-2, DENDRON, DAEDALUS, DAEDALUS-D, AKOLOUTHIA-2, A10) the X16 values equal the X15 values on 167 of 168 cells. The one difference is A10 on git-numstat (X15 2214, X16 timeout at the 420 s cap). Three A10 cells time out in X16 (git-numstat, ops-git-log-stat, sp500-200). X15 also timed out on the latter two.
- **Frontier minimum:** unchanged on every lane.
- **Leaders (ties by key order):** DENS-2 15, AKOLOUTHIA-2 7, DAEDALUS-D 6. A10 is never the minimum.
- **Change in this turn:** LAKONIKOS-D (section 4). It is not in `leaders-x16.tsv`, which covers the X16 frontier keys only.

## 6. Negative and bounded results (this turn and carried forward)

1. **HOMOIOS (block-level edit script), 30 lanes:** 0 wins; identity on all 30 (`bench/x16/receipts/homoios-v1.jsonl`). On agent-history: DAEDALUS-D 293; with 32 edits substituted 349; HOMOIOS arm 393 (the 44-token contract is the main cost). It is ANTIPHON (`src/lib/omega/antiphon.ts`, measured negative on 49 of 49 copy files) at blank-line granularity. Not a new mechanism.
2. **HOMOIOS diff coverage:** the diff returned null on 199 of 200 random small-vocabulary edits, because anchors are non-unique. This is a limit, not coverage. Red team: 145 of 145 pass after the arm-aware reader fix (`bench/x16/receipts/homoios-redteam.out`).
3. **Language-tier alias (28 lanes):** one win (de-kb −4), ten ties, 17 losses (+4 to +104). The X16 table removes an X13 artifact that added a 10-token empty sentence when no alias was used (`bench/x16/alias-test-28.ts`, `bench/x16/receipts/alias-28.jsonl`).
4. **Numeral second tier:** no candidates on these lanes. The tier-1 pool had 114 candidates and used at most 3 per lane. An o200k numeral costs one token, as an alias does, so it has no cost advantage.
5. **Thousands-separator digit groups:** +55 % on integers (`sp500-200.csv`, 389 integers: plain 873, grouped 1357). Negative.
6. **Typographic punctuation normalization:** zero curly quotes, dashes, or ellipses on 8 real files. Zero saving on this corpus.
7. **Split cost of DAEDALUS-D:** the contract is 38 to 40 o200k tokens (`bench/x16/split-cost.ts`). Shrinking it is the one general lever on prose. LAKONIKOS-D is that lever (section 4).
8. **Near-duplicate probe:** only the agent-history row was produced. The rollup-license and next-auth rows were killed before completion and are missing, not negative. Not reported as results.
9. **CTXCOPY** (carried forward, not re-measured): −75.7 % on 81 PyPI release pairs with the earlier version in the chat; 0 % with unrelated earlier text. Conditional only.
10. **DIAPHORA** (X15): 0 gain. Negative.

## 7. Modal-shortcut and LLM readability (what can and cannot be claimed)

- The claim "an LLM can decode LAKONIKOS-D in one chat with no system prompt" needs a model run. None was possible here.
- Available evidence: (a) the CPython reader decodes the wires, which tests the wire grammar and the old contract's semantics; (b) the shorter sentence is semantically the same as the old one, but that equivalence is argued, not run; (c) the earlier LAKONIKOS self-decode (3 fixtures, same model) is not blind.
- External, not verified here: arXiv 2604.13066 reports in-context decoding of dictionary-encoded prompts with a frontier model (exact match above 0.99 on template compression, LogHub 2.0). That supports the approach in principle. It is one paper, and its setup is not ours.
- Downgraded claim: **byte-exact and lossless, verified; readable in one chat, unverified.**

## 8. OpenAI math proofs: review and coverage

**Coverage.** 8 of 80 `CONTENTS.md` chunks were read: 0, 1, 20, 26, 27, 40, 50, 70. Chunks 0, 26 and 27 were read in earlier turns; chunks 1, 20, 40, 50 and 70 were read in this turn. Entries in these chunks: 001–010, 097–100, 126–135, 210–211, 238, 332–336. The other 72 chunks were not read, so this is not a complete review.

**Per-entry assessment (codec relevance).**
- **001–006** (Milne rationality, BSD, quasi-Riemann, Hilbert's tenth problem, Catalan irrationality, Goldfeld twists): number theory. No codec relevance.
- **007** (two-point Chowla / corrected Elliott): multiplicative-function correlations. No codec relevance.
- **008** (Deligne–Drinfeld): Lie algebra structure. No codec relevance.
- **009, 010, 332–336** (Milnor K-theory, Galois reconstruction, 2-adic modularity, ℓ1 Markov cotype, isometric immersions, scalar curvature): no codec relevance.
- **097** (Euclidean Steinitz–Bergström): signing bounds for vector sums. No codec relevance.
- **098** (bi-Lipschitz dimension reduction, compact counterexamples): no codec relevance.
- **099** (sharp edit-distance ℓ1 distortion, exp(Θ(√(log d · log log d)))): **a bound, relevant to matching design.** Any embedding of edit distance into ℓ1 has distortion growing with string length, so a sketch-based near-duplicate matcher cannot be constant-distortion. That argues for exact or LCS-style matching of the kind HOMOIOS uses, not for a new codec.
- **100** (cylinder coverings): geometry. No codec relevance.
- **126–135** (PSD rank, sensitivity, superstring-type and automata results, read in X15): no compression method. **128** (factor-2 approximation for the shortest common superstring, non-greedy): a superstring-based wire needs the reader to perform overlap merges, which costs decoder tokens. I do not expect it to pay, and I have not tested it.
- **210–211** (Foulkes conjecture; random planar maps): algebra and probability. No codec relevance.
- **238** (Thorp shuffle mixing Θ(log N)): permutation mixing. No codec relevance.

**Called-out proofs from earlier turns.** 128 (superstring) and 003 (quasi-Riemann, Lean link) were re-examined from their index text. Neither gives a codec design. The Lean links were not built or run.

## 9. New live searches (this turn, with terms and sites)

Five `web_search` queries this turn: lossless prompt compression with in-context decoding; quantum matrix-product-state compression; VCDIFF and edit-script delta encoding; context deduplication in LLM prompts; number tokenization and digit grouping. Sites reached in this turn's searches: arXiv (abstract pages), Wikipedia and RFC-related pages, and physics journal pages (PRB, PRX Quantum), plus several non-authoritative blogs (not used as evidence). Entries marked (X15) came from earlier-turn searches and are listed for completeness.

Papers and preprints from the last 10 years (dates as listed; abstracts only, none fetched in full). Entries marked (X15) are from earlier turns:
- arXiv 2604.13066 (Apr 2026), dictionary-encoded lossless prompts decoded in context. Supports the in-context reading. Not verified here. https://arxiv.org/abs/2604.13066
- arXiv 2510.18043 (Oct 2025), CompactPrompt: LZW-style n-gram abbreviation with a lookup table, plus lossy token pruning. https://arxiv.org/abs/2510.18043
- arXiv 2505.00019 (Apr 2025), empirical study of six prompt-compression methods, mostly lossy. https://arxiv.org/abs/2505.00019
- arXiv 2602.13266 (Feb 2026), LoPace: Zstd and BPE storage compression for prompts. Storage, not LLM-readable. https://arxiv.org/abs/2602.13266
- arXiv 2510.06824 (Oct 2025), BitTokens: single-token numeric encodings. Needs training. https://arxiv.org/abs/2510.06824
- arXiv 2402.14903 (Feb 2024), "Tokenization counts": digit grouping affects arithmetic in LLMs. Our measurement (+55 % on integers) is a token-count result, not an arithmetic one. https://arxiv.org/abs/2402.14903
- arXiv 2306.04050 (2023, X15), LLMZip: arithmetic coding with LLaMA-7B. Requires an arithmetic decoder, not a chat model. https://arxiv.org/abs/2306.04050
- arXiv 2309.10668 (ICLR 2024, X15), language modeling is compression. Ideal code lengths, not a measured coder. https://arxiv.org/abs/2309.10668
- arXiv 2310.05736 (EMNLP 2023, X15), LLMLingua: lossy token pruning. A lossy contrast. https://arxiv.org/abs/2310.05736
- arXiv 2602.22958 (Feb 2026, X15), frequency-ordered tokenization. Renumbering costs tokens under o200k. https://arxiv.org/abs/2602.22958
- RFC 3284 (2002), VCDIFF (cited via search results and Wikipedia; the canonical URL was not fetched): ADD, COPY, RUN instructions. Old, but the citable prior art for edit scripts. https://www.rfc-editor.org/rfc/rfc3284
- Miller and Boots, PMLR v130 (2021, X15), tensor networks for probabilistic sequence modeling. Classical model, not quantum. https://proceedings.mlr.press/v130/
- Quantum-adjacent physics: PRB 110, 085149 (2024) and arXiv 2312.02667 (MPS compression for quantum states); PRL 132, 040404 (log-depth MPS preparation); PRX Quantum 5, 030344; npj Quantum Information 10, 15 (MPS state preparation). None is a text codec. None gives a one-chat decoder.

## 10. Scratchpad: 10 AI-native compression ideas

These are candidate ideas for later work. Each has a status.

1. **Language-tier aliases (tested first).** Shortest cross-language token aliases for frequent long words, listed in the contract. **Status: tested on 28 lanes, negative.** One win (de-kb −4), 17 losses. The alias table costs more than the wire saves.
2. **Second tier of numerals.** Single-number aliases for near-duplicate words. **Status: analysis, no candidates.** A numeral is one token like an alias, so the cost per entry is the same; the pool is not the limit, the table cost is.
3. **Terse contract on the dual-tokenizer wire (LAKONIKOS-D).** **Status: implemented and measured.** −9 to −11 on rule-based lanes, 11 frontier wins. LLM readability unverified.
4. **Block-level edit scripts (HOMOIOS).** **Status: measured negative.** 0 of 30 lanes. It is ANTIPHON at block granularity.
5. **Thousands-separator digit groups.** **Status: measured negative.** +55 % on integers under o200k.
6. **Typographic normalization.** **Status: measured zero** on 8 real files.
7. **Entropy-coded wire decoded by the model as an arithmetic decoder (LLMZip-style).** **Status: analysis, rejected for one chat.** Exact decoding needs the same model's logits at every step and a precise arithmetic coder; a chat model cannot do that reliably without tooling.
8. **Conditional copies from earlier turns of the same chat (CTXCOPY).** **Status: scanned, conditional.** −75.7 % on release pairs with the earlier version present; 0 % otherwise. Not general.
9. **Dictionary-encoded prompts decoded in context (arXiv 2604.13066).** **Status: external evidence only.** Not reproduced here. Our DAEDALUS already uses a dictionary; the open question is whether a prompt-only glossary beats it, which needs a model run.
10. **Quantum-adjacent: tensor-network and MPS coders.** **Status: analysis, not applicable.** The tensor-network sequence models (Miller and Boots 2021) are classical. The quantum MPS papers are about state simulation and preparation, not text. Nothing here gives a one-chat decoder, so I do not claim a quantum-adjacent gain.

## 11. What did not run, and what is left

- **Not run:** any LLM readability test; any Lean proof check; any test of superstring-based wires (128); any digit base other than decimal; a complete 80-chunk OpenAI review.
- **Next highest-information test:** a blind one-chat decode of 3 to 5 LAKONIKOS-D messages by a model outside this sandbox, with the expected output hidden from the decoder. Without that, the success predicate stays open.
- **Next codec test, if that passes:** a terse contract for the AKOLOUTHIA-2 path on ops-table lanes, where the frontier gap is largest (df-h 171).

## 12. Files

- Codec: `src/lib/omega/lakonikos-d.ts`; registry `src/lib/omega/registry.ts` (key `lakonikos-d`).
- Receipts: `bench/x16/receipts/lakonikos-d-v1.jsonl` (+ `.err`), `lakonikos-d-registry.jsonl`, `alias-28.jsonl` (+ `.err`), `leaders-x16.tsv`, `frontier-A.jsonl`, `frontier-B.jsonl`, `homoios-v1.jsonl`, `homoios-redteam.out`.
- Scripts: `bench/x16/lakonikos-d-check.ts`, `run-lakonikos-d.sh`, `frontier-lkd.sh`, `leaders-x16.py`, `alias-test-28.ts`, `run-alias-28.sh`, `frontier-run.sh`, `split-cost.ts`, `typo-probe.mjs`, `digit-group-probe.mjs`.
- Docs: `docs/codec-abbreviations.md` (LAKONIKOS, LAKONIKOS-D, X16 frontier restatement, alias update).
