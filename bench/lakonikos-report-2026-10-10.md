# LAKONIKOS — DAEDALUS wire, terse decoder contract (2026-10-10)

**Status: a real but small Pareto move in tokens (−10 per rule-based message, −0.78% total on 43 holdout files).
It is not a large gain. It does not clear the "more than a few tokens" bar you set.**

## Runtime honesty

- Tools actually used: `bash` (git, node 20, esbuild bundles, Python 3 for the manifest check), `tsc --noEmit`,
  two background Node processes on the 2 available CPU cores, two `web_search` calls.
- Not used: no compiler beyond tsc, no theorem prover, no database, no simulator, no GPU, no external LLM,
  no independent agents. Decoding in the readability test was done by this model alone, in-context.
- The DAEDALUS wire inherits a wall-clock budget (`budgetMs` in `src/lib/omega/daedalus.ts`), so LAKONIKOS output
  can depend on machine load in the same way. Not separately measured.

## What the codec is

`src/lib/omega/lakonikos.ts`, registry key `lakonikos`. It calls `daedalusEncode` unchanged, keeps the wire and the
arm choice, and replaces only the English rules sentence in the decoder contract:

- old (39 o200k tokens): "Every new Hangul letter before ¶ starts a rule whose text runs to the next new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print only the result."
- new (29 tokens): "New Hangul before ¶ starts a rule to the next new Hangul or ¶. After ¶, expand rules recursively; print only the result."

Decoder (`chironDecode`) and wire are unchanged. The repeat and list clauses are kept verbatim. If the old sentence is
missing from the generated prompt, the function throws. Raw/identity fallbacks are returned unchanged.

## Receipts: LAKONIKOS vs DAEDALUS (43 holdout files)

Command: `node bench/terse/lakonikos-bench.mjs 0 2` and `... 1 2` (two processes).
Raw output: `bench/terse/lakonikos-receipts-2026-10-10.jsonl`.

| metric | value |
|---|---|
| files | 43 (holdout, holdout-ops, -tbl, -tab, -mk, -work, -lang) |
| decode exact (LAKONIKOS) | 43/43 |
| mode DAEDALUS / raw | 33 / 10 |
| total one-chat tokens, DAEDALUS | 33,440 |
| total one-chat tokens, LAKONIKOS | 33,178 (−262, −0.78%) |
| per-file delta histogram | −10: 21 files; −9: 5; −1: 7; 0: 10 |
| never worse than DAEDALUS | true |

Examples: readme 688 → 678; email-thread 538 → 528; kubectl-get-pods 430 → 420; vix-daily 1394 → 1384.

Honest reading: the saving is the contract difference, a fixed 10 tokens per message with a rules tape. Files that
are raw (10) are unchanged. The gain is largest in relative terms on short rule-based messages (e.g. a 300-token message
gains about 3%). It is not a compression gain: the wire is byte-identical.

## Readability receipts (LLM native decode, byte-exact)

Fixtures: `bench/llm-blind-terse/hidden/orig_{1,2,3}.txt` (written by this model earlier in this session, so this
is **not blind to the author**). Visible messages: `visible/msg_{1,2,3}.txt` = LAKONIKOS decoder prompt (contract + wire).
Decodes written by this model from the visible text only: `decode/dec_{1,2,3}.txt`. Scorer: `check.ts`.

| msg | mode | LAKONIKOS msg tok | DAEDALUS msg tok | self-decode byte-exact | chironDecode control |
|---|---|---|---|---|---|
| 1 (14 log lines, Cyrillic rules) | daedalus | 116 | 126 | yes | yes |
| 2 (repeated 4-sentence block, Chinese-character rules) | daedalus | 97 | 106 | yes | yes |
| 3 (16 job lines, Chinese-character rules) | daedalus | 94 | 103 | yes | yes |

Limits: n = 3, one model, self-review only. There is no external verifier in this sandbox. Claim downgraded to
"decoded correctly by this model on three hand-checked fixtures". Cross-model readability is not verified.
The contract mentions "New Cyrillic" and "New Chinese character", which are the script labels the encoder picked;
the decode had to follow those labels, and it did.

Observed difficulty (qualitative, not measured): msg 1 needed careful tracking of nested rule references
(R5 and R6 contain other rules). A human could decode it in a few minutes; a model had to work through it step by step.

## Negative results (receipts in `bench/terse/`)

1. **Line-prefix elision over CHIRON** (`prefix-elide.ts`, `prefix-sweep.ts`, `prefix-gate.ts`):
   a line starting with the same separator-delimited prefix as the line above is written `⇡N` + rest.
   - Dev half (22 files, `prefix-sweep-dev-receipts.jsonl`): minKeep 14 → −0.08%; 30 → −0.25%; 6 → +0.56%.
   - Test half (21 files, `prefix-sweep-test-receipts.jsonl`): minKeep 6 → +1.78%; 14 → +0.88%; 30 → +0.60%. Worse on most files.
   - Winners are real but isolated: git-numstat −142 tokens (−6.6%), aapl CSV −103 at minKeep 4 (−6.1%).
   - No text-only gate separates winners from losers (`prefix-gate-receipts.jsonl`): npm-ls saves 31% of characters and loses 57 tokens.
   - Round trip (decode of the transform) held on all files. Verdict: niche, not reliable, not shipped.
2. **Shorter contract wordings** (`compact-candidates.ts`, `compact2.ts`): I tested 11 wordings. The 29-token one (`K3`) is the shortest and is shipped. The 30–39 token variants were not shorter. I did not test wordings below 29 tokens or whether any of them drops a clause.
3. **Where the tokens are** (`breakdown.ts`, readme at 4M units): tape 104, body 559, contract 39. The body is ~80% of the wire, so
   tape or contract tweaks cannot move the frontier much. The rule search is already close to its limit for this format.

## Frontier correction (carried from the previous turn)

The frontier per lane is the minimum over the registry, not CHIRON or KAIROS. In this session, DAEDALUS beat KAIROS on
all four lanes measured, and LAKONIKOS is the new frontier point on 33 of 43 holdout files. The full 118-codec
frontier was **not** measured (2 cores; hours of runtime).

## What we have missed (ranked by information value)

1. **The contract is the only lever that is identical across every rule-based message.** It is 39 tokens now and 29 with LAKONIKOS.
   Any further work on the contract has to be measured on the readability test, not only on token count.
2. **Elision and dictionary are the same kind of gain.** CHIRON already captures repeated prefixes as rules. The elision
   layer adds only where the search misses them, which is why the wins are rare and cannot be gated by text statistics.
3. **Numeric tables are a readability risk for the whole family.** The CHIRON wire for `aapl-2014.csv` is a digit-heavy
   body with 60+ rules; it is correct, but hard to decode by eye. This was not tested with the readability harness.
   Next test: decode the aapl wire from the visible message only, on a 20-row slice.
4. **Literature check (2 searches):** arXiv 2604.13066 (Apr 2026) reports dictionary encoding of logs with in-context
   decoding up to 80% compression and exact-match above 0.99, but puts the dictionary in a system prompt. This codec
   has no system prompt, so the direct comparison is not valid. arXiv 2506.00307 (LTSC) needs fine-tuning.
   No source found that makes line-prefix elision a verified gain for LLM-decoded text.
5. **Determinism:** DAEDALUS's wall-clock budget still makes the frontier non-reproducible. A work-unit DAEDALUS would fix that.
   It is a reproducibility change, not a token gain.

## Not done in this turn (explicit)

- openai/math proof-by-proof deep dive (722 manuscripts, Lean status): not done.
- Full registry frontier on the holdouts and corpus: not done.
- Cross-model LLM readability: not possible in this sandbox.
- PR codec re-check: done in the previous turn (`bench/pr-frontier-review-2026-10-10.md`); no change.

## Next highest-information test

Decode the CHIRON-family aapl wire from the visible message only (20-row slice), and check the byte-exact result.
If it fails, the readability claim for numeric tables is downgraded and the family should not be recommended for tabular input.

## Files

- `src/lib/omega/lakonikos.ts` — codec.
- `src/lib/omega/registry.ts` — registry key `lakonikos`.
- `bench/terse/lakonikos-bench.ts`, `lakonikos-receipts-2026-10-10.jsonl` — 43-file comparison.
- `bench/terse/prefix-*.ts`, `prefix-*-receipts.jsonl` — elision negative results.
- `bench/terse/contract-*.ts`, `compact*.ts`, `breakdown.ts`, `wirehead.ts` — measurements.
- `bench/llm-blind-terse/` — readability fixtures, visible messages, self-decodes, checker.
