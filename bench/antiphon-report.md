# ANTIPHON — line-copy-with-edits stage over KAIROS: measured negative result, plus a blind-decode harness

**Date:** 2026-10-10 · **Branch:** `arena/da2b9818-kompkernel`
**Code:** `src/lib/omega/antiphon.ts` (module, **not** registered in `registry.ts`), `bench/antiphon-bench.ts`, `bench/llm-blind-gen.ts`, `bench/llm-blind-check.ts`
**Receipts:** `bench/antiphon-bench-receipts.jsonl`, `bench/antiphon-scan-receipts.jsonl`, `bench/llm-blind/`

## Verdict

**ANTIPHON∘KAIROS does not beat KAIROS on any measured file.** On the 49 files where the copy transform finds copies, KAIROS won 49/49. The transform is decode-exact, so this is a compression loss, not a correctness problem. The module is kept as a documented negative result and is not registered as a codec, because registering a codec that never wins would misstate the frontier.

This report makes no Pareto claim. The codec-level goal of this turn (a new Pareto-superior codec) is **not met**.

## What ANTIPHON does

- For each line of at least 20 characters, it looks for an earlier line (within 300 lines) that shares at least half its whitespace-separated tokens.
- It computes an exact token-level LCS diff and turns it into an ordered list of `first-occurrence replace` edits. Each edit is simulated; the line is only accepted if the simulation reproduces the target exactly.
- The copy line is written as `M<d>` followed by `A x A y E` edits (`M`, `A`, `E` are glyphs absent from the input and single-token in o200k). The copy is used only if it is cheaper than the raw line.
- The stage-1 text is then encoded by KAIROS. The decoder expands CHIRON first, then the copy lines top to bottom.
- `antiphonEncode` emits whichever of KAIROS and ANTIPHON∘KAIROS is cheaper on one-chat message tokens, and only after a full decode check. So it cannot ship a larger message than KAIROS.

## Receipts

### R1. Self-test (`antiphonSelfTest`, `bench/tmp/antiphon-st.ts`)
Six cases. Plain copy, insert at start, delete mid and whitespace edit round-trip with one copy each. The chained and no-shared-line cases are declined by the cost gate. All six PASS (round-trip or declined).

### R2. Transform-only scan (`bench/antiphon-scan-receipts.jsonl`)
102 files: 40 `src/lib/omega/*.ts`, 43 repo markdown reports, and 19 holdout files (`holdout-work/*.txt`, `holdout-ops/*`, `holdout-mk/*`).
- 49 files have at least one copy line.
- The inverse (`antiphonUntransform`) reproduces the original on **49/49**.
- Before CHIRON, stage-1 token savings are real: openstack log 40.7%, agent-history.md 36.7%, ls-full-iso 22.1%, codec-synthesis.ts 16.7%.

These pre-CHIRON savings are **not** the relevant number. The next receipt shows why.

### R3. Full comparison (`bench/antiphon-bench-receipts.jsonl`)
49 files, both arms at `KAIROS_WORK_UNITS` (32M):
- ANTIPHON∘KAIROS wins: **0/49**.
- All emitted messages decode exactly (`exact: true` on 49/49).
- Sum of raw tokens over the 49 files: 259,383. Sum of emitted KAIROS messages: 202,425 (21.96% saving).
- Per-file arm-1 totals were **not recorded** by this run; only the winner was stored. For `aleph.ts` the arm-1 total was measured separately (R4).

### R4. Mechanism diagnosis (`bench/tmp/arms-dbg.ts`, `src/lib/omega/aleph.ts`)
| quantity | value |
|---|---|
| raw tokens | 5,553 |
| KAIROS message (arm 0) | **3,218** |
| stage-1 raw tokens | 5,281 (−272 before CHIRON) |
| CHIRON on stage-1, message (`innerM`) | 3,479 (+261 vs arm 0) |
| ANTIPHON contract | 52 tokens |
| arm-1 total (estimate: `innerM` + contract) | ≈3,531 (+≈313 vs arm 0) |

The arm-1 total is an estimate from the two measured parts. It is not a separately measured end-to-end number.

The transform removes 272 tokens *before* CHIRON, yet CHIRON's wire on stage-1 grows from 3,179 to 3,440 tokens. The copy lines break the repeated-line structure that CHIRON's macro and block passes already exploit. The copy repr is also not compressible by CHIRON.

**Diagnosis:** near-duplicate line redundancy is already captured by CHIRON's macro and column-block passes, which work on the original text. A line-level copy stage removes the same redundancy in a form CHIRON cannot compress further.

### R5. Blind LLM-decode test (`bench/llm-blind/`)
Protocol:
1. `bench/llm-blind-gen.ts` writes seeded repeated-phrase prose to `hidden/orig_i.txt` and the chat-visible message (decoder contract plus wire) to `visible/msg_i.txt`.
2. The decoder (this model) reads only `visible/msg_i.txt` and writes `decode/dec_i.txt` before any comparison.
3. `bench/llm-blind-check.ts` compares bytes against the hidden original. No model is in the loop for the comparison.

Result: **3/3 byte-exact** (843, 855 and 844 bytes; `firstDiffChar=-1`).

**Caveats, stated in full:**
- The decoder is the same model that generated the codec and this report. This is a self-decode, not an independent LLM test. The sandbox has no independent LLM endpoint: outbound access is limited to github.com, codeload, api.github.com, registry.npmjs.org, pypi.org and files.pythonhosted.org.
- n = 3, short texts (≈600 tokens of wire each), seeded repetitive content by design. This tests mechanical readability of the CHIRON contract, not readability on real documents.
- Only CHIRON/KAIROS wires were tested. PERIODOS and STICHOS column-counting decoders were **not** tested by this harness.

## Negative space (what does not work, with reasons)

1. **Copy-with-edits as a pre-CHIRON stage** (this report): loses after CHIRON, 0/49.
2. **Minimal per-line copy gate on token counts alone**: approximates raw cost without CHIRON's context; accepts copies CHIRON already covers.
3. **Whitespace minification / re-indentation for JSON**: already covered. CHIRON on `package.json` reaches 32,274 tokens from 47,685, below plain minification at 37,079 (`bench/tmp/stack-json`).
4. **Prose near-duplicate reuse**: ceiling check (`bench/tmp/neardup.py`). Between 78% and 100% of prose characters are first occurrences (email-thread 78.3%, meeting-transcript 100%, kb-article 99.6%). Near-duplicate lines in prose are weak matches (ratio 0.6–0.66). Little lossless headroom.
5. **Minimal-contract variants**: the CHIRON contract is already adaptive (`chironDecoderPrompt` describes only the operators the wire uses).

## Measured frontier (everyday lanes, current code, CHIRON timed budget 2 s)

From `bench/tmp/everyday.jsonl`, `bench/tmp/code.jsonl`, `bench/tmp/holdouts.jsonl`:
- Repo markdown reports (43 files): raw 236,811 → 218,059 tokens (**7.9%**). Three files fall back to raw.
- Source files `src/lib/omega/*.ts` (40 files): raw 189,798 → 156,997 (**17.3%**), median 16.75%, one raw fallback.
- Ops and structured holdouts: 35–80% saving (openstack log 72.5%, page.html 80.4%, find-listing 65.4%, package-lock 59.5%).
- Prose holdouts: email-thread 11.3%, meeting-transcript 10.6%, bibliography 12.4%, kb-article 0% (raw), llm-answer 0% (raw), paper.tex 0.2%.

These numbers use the timed 2 s CHIRON run, not KAIROS. They are a baseline for the everyday lanes, not the KAIROS frontier.

## Sources (live searches, this turn)

- arXiv 2506.00307 — Harvill, "Lossless Token Sequence Compression via Meta-Tokens" (LTSC, May 2025, rev. Aug 2025). LZ77-like lossless compression of token sequences: 27% and 18% length reduction on two tasks. **Closest prior art to ANTIPHON-style copy tokens.** It requires fine-tuning the model to read meta-tokens, so it fails this turn's zero-shot readability constraint.
- arXiv 2605.11774 — "From Token to Token Pair: Efficient Prompt Compression for Large Language Models" (MedTPE, 2026). Lossless token-pair merging for EHR sequences. Reports saturation at a budget of about 5,000 merged tokens, framed against a Shannon-entropy bound. Per the abstract excerpt it fine-tunes the embeddings of the new token-pair entries, so it is not zero-shot readable.
- Gdelta: "The Design of Fast Delta Encoding for Delta Compression Based Storage Systems", ACM, DOI 10.1145/3664817 (2024). Word-level delta encoding of similar chunks. Storage-system setting; same family as ANTIPHON.
- Ddelta: Xia et al., "A deduplication-inspired fast delta compression approach", Performance Evaluation (2014). Gear chunking for delta. Same family.
- Xu & Pavlo, "Online Deduplication for Databases" (dbDedup, SIGMOD 2017), `db.cs.cmu.edu/papers/2017/p1355-xu.pdf`. Delta encoding with COPY/INSERT instructions over similar records. Same family.

All four fall within the 40-year window. The delta-compression family is well studied; ANTIPHON is not a new mechanism.

## openai/math (Sept–Oct 2026): grounding and triage

Sources read this turn:
- shattered.io (Oct 2026): 722 manuscripts, 372 result families, Lean formalizations for many, not all. Some statements are not confirmed as fully checked.
- redreamality.com (Oct 9 2026): the Weil-class manuscript (algebraicity of Weil classes on split abelian eightfolds) was withdrawn for a sign error, together with two dependents. 14 others had proof repairs and statement corrections; 13 had citation updates. The top-level formalization ratio is reported as 300/719 (about 42%).
- tech-insider.org (Oct 2026): 235 of 372 families link to a Lean page; 162 papers have a fully formalized main result (an independent analysis by FourWeekMBA). **This disagrees with 300/719 above.** Both are reported figures, not verified.
- datacamp.com (Oct 2026): about 4,000 problems attempted; roughly 3 hours of ChatGPT Pro compute per accepted result.

Relevance to this codec: **none found that changes the design.** The results are mathematical. The only candidates from the earlier keyword triage remain #128 (shortest common superstring, factor-two, Lean-linked) and #121 (almost-linear edit distance). I did not re-read them this turn, so no claim is made about them here.

## Honest runtime disclosure

- Tools used: `bash` (node, esbuild, tsc, python3), `web_search` (5 queries this turn), `fetch_page` (not used), `start_process` (2 background runs). No independent LLM, no theorem prover (no Lean toolchain), no external compression tool.
- Parallelism: background processes ran one at a time. Not parallel.
- Compilers: `tsc --noEmit` exit 0; esbuild bundling.
- Verification: decode-exact checks in every bench row; copy-transform inverse on 49/49 files; blind self-decode 3/3.
- Not verified: independent LLM decoding; readability of PERIODOS or STICHOS wires; the block-pass wall-clock cap in KAIROS (disclosed in `bench/kairos-report.md`).

## Next highest-information tests

1. **CHIRON-aware line gating**: apply copies only to lines that CHIRON's KAIROS wire leaves unmacroed. Falsifier: if this stage still loses to KAIROS on aleph.ts and the 49-file set, the copy mechanism is dead for CHIRON-family codecs.
2. **Record arm-1 totals** in the bench (the current run stores only the winner), so the per-file gap is measured, not estimated.
3. **Independent LLM decode**, if any LLM endpoint becomes available in this sandbox. Without one, all readability claims remain self-tests.
4. **KAIROS block pass in work units** (remove the 4.4 s wall-clock cap), so the output is deterministic end to end.
