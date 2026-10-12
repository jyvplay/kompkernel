# Z30 receipt: PHALANX-A7, layout model, ls-usr-bin diagnosis, proof review, PR review

All numbers are o200k token counts from the scripts in this folder. Nothing here is simulated or mocked.
Round-trip receipt: `bench/z30/a7-roundtrip.receipt.txt` (53 checks, 0 failures, DONE_EXIT=0).

## 1. Why `ls-usr-bin` accepted only 84 blocks

`bench/z30/ls-diagnose.ts` on `bench/z29/ops-real/ls-usr-bin.txt`:
- 637 lines. 485 rows have 9 tokens (`-rwxr-xr-x ... name`), 150 have 11 (symlink `name -> target`), 1 has 2 (`total 157M`).
- PADTAB (A6) required equal token counts inside a block. The 11-token symlink rows broke the 9-token runs: 171 runs, 87 of length ≥ 2.
- Fix: PADTAB2 (`src/lib/omega/padtab2.ts`). A row is a fixed prefix of `f` cells plus a verbatim free tail. It tries `f` from the minimum token count down to 1. A failed run falls back to a first-row exception, then to same-token-count segments. `ls-usr-bin` goes from 84 blocks to 1.

## 2. PHALANX-A7 (new codec, registered as `phalanx-a7`)

`src/lib/omega/phalanx-a7.ts` = PADTAB2 over A5. Wire: `[[COL` header, one legend line (63 tokens, no newline), then the A5 wire of the padded body. Applied only when strictly cheaper than A5.

First A7 run used a 78-token legend, and that legend caused the only regression (+13 on `ls-omega-full-iso`). Bodies were identical (1,521 tokens each after the legend). A shorter legend with the same meaning (`c2` in `bench/z30/legend-probe.ts`) removed it.

### Measured (o200k, A6 = PHALANX-A6 committed in 220fb78)

| group | identity | A5 | A6 | A7 | A7−A6 |
|---|---|---|---|---|---|
| prose | 4,692 | 4,532 | 4,532 | 4,532 | 0 |
| wrapped_docs | 41,988 | 39,153 | 39,153 | 39,153 | 0 |
| code | 5,255 | 4,097 | 4,097 | 4,097 | 0 |
| ops (holdout-ops + z20 samples) | 50,165 | 23,157 | 22,846 | 22,844 | −2 |
| ops_real (ops-real folder) | 32,204 | 17,772 | 17,485 | 15,473 | **−2,012** |
| realjson | 5,498 | 3,886 | 3,886 | 3,886 | 0 |
| **ALL** | 139,802 | 92,597 | 91,999 | 89,985 | **−2,014 (−2.19% vs A6, −2.82% vs A5)** |

Per file in ops_real: `ls-usr-bin` 7,607 → 6,356 (−1,251); `dpkg-l` 6,501 → 5,742 (−759); `ps-eo` 1,226 → 1,224 (−2).

Edge cases: `edge prefixed` (input that starts with `[[PAD`) is 17 under A7, equal to A5. Under A6 it was 86 (Z29 receipt). The regression is gone for A7. A6 is still registered for audit.

**Honest reading.** A7 is ≤ A6 in every group and ≤ A5 in every group, so it Pareto-dominates A6 and A5 on token count across this corpus. The gain is concentrated in `ls-usr-bin` and `dpkg-l`, which were the files I diagnosed. On the held-out ops set (holdout-ops + z20 samples) the gain is only −2. Prose is a tie with A5 and A6, so there is no prose gain in this turn. This is a measured ops-lane gain on the files used to design it, not a generalisation claim.

## 3. Can one exact layout model handle A3, A5, and A6 together?

Measured parts:
- The column layer is already one model. A6's PADTAB is the special case of PADTAB2 with `f = n` and no tail. A7 replaces A6's table layer and matches or beats it on every measured group.
- Per-layer legend cost (`bench/z30/layer-legends.ts`): A3 canonical-JSON legend line = 39 tokens. A7 `[[COL` header plus legend = 67 tokens. A5 wrap legend (`[[WRP` plus `# WRP: width=72 keep=¶ ...`) was printed but not token-counted (a bug in my first measurement; not repeated this turn).

Answer, stated as measured:
- Yes for the columns: A6 and A7 are one model, and A6 is subsumed by A7.
- Across A3, A5, and A7 as a stack: each layer is an exact, decoder-invertible layout function on text. They can share one legend grammar, with one header and an ordered list of layers. The saving is at most one legend per file that uses two or more layers (about 40–60 tokens by the counts above).
- NOT measured: how often two layers fire on the same file. In this turn I did not build a unified-legend codec, so this is a design option, not a result.

## 4. Literature and new search terms (live search this turn)

Queries (`web_search`): (a) "reversible canonical formatting normalization of text before LLM prompt reduces token count lossless study 2025"; (b) "table structure recovery from whitespace-aligned plain text column boundary detection algorithm paper"; (c) "OpenAI model proof open math problem 2026 verified Lean mathematicians review"; (d) "AI-generated mathematical proof erdos problem 2026 OpenAI GPT errata counterexample".

- arXiv 2506.00307, "Lossless Token Sequence Compression via Meta-Tokens" (2025-05-30). Dictionary-style lossless compression of token sequences. Reports −18% to −27% sequence length on tree-structure and repo-completion tasks. **It needs fine-tuned LLMs** to read the compressed form. Our codecs are readable with no fine-tune, so the constraint differs. A third-party review (pith.science, 2026-08-07) flags an ambiguity in its losslessness pseudocode. Not used.
- arXiv 2508.13666, "The Hidden Cost of Readability" (2025-08-19). Removing code formatting cuts about 24.5% of input tokens with negligible output change. **Lossy** (it standardises format). Corroborates that whitespace/layout is a real token cost. Not a result of ours.
- Ng & Lim, "Learning to Recognize Tables in Free Text" (ACL P99-1057, 1999), and Shigarov & Fedorov (2010), whitespace-gap column detection. Prior art for column detection. Our new part is the exact verifier, the free tail, and the decoder-side re-pad, not column detection itself.

## 5. Fractal review of the OpenAI math releases (March to October 11, 2026)

Levels: L0 = press and secondary sites. L1 = primary repository (`github.com/openai/math`, README, `history.md`). L2 = catalogue files (`CONTENTS.md`, `lean/formalization.yaml`). I did not read the manuscripts. I did not build the Lean proofs (no Lean toolchain; its release host is not on the allowed list).

- **Counts disagree across sources.** L1 (`README.md`): 719 manuscripts, 372 families, "~42% top-line results formalized". `history.md` (Oct 7, 2026): "300 / 719 = ~42%". L0 sites say 722 manuscripts (tech-insider, kucoin) or 377 claims (tech-insider). Use the L1 figures.
- **Withdrawals (L1, `history.md`, Oct 7, 2026).** Three manuscripts withdrawn after a sign error in a stabilization-trace cancellation argument: "Algebraicity of Weil classes on split abelian eightfolds", "Algebraicity of Kuga–Satake Correspondences for K3 Surfaces", "The rational Hodge conjecture for products of K3 surfaces". Fourteen others revised, and 13 more updated for citations. The withdrawn set is a dependency chain: the Kuga–Satake and product-of-K3 papers depend on the Weil-class paper.
- **L0 claim contradicted by L1.** A kucoin article says the model "extended this result to arbitrary finite products of projective complex K3 surfaces". That manuscript is withdrawn on Oct 7 in `history.md`. Do not repeat that claim.
- **Other L0 claims I could not verify at L1/L2.** Quasi-Riemann hypothesis at 7/8 (Lean entry "unchecked" per felloai.com); Hodge conjecture for CM abelian varieties ("No" Lean per felloai.com); Kakeya 3D/4D ("model-written paper only" per felloai.com). I did not confirm these in `formalization.yaml` (only its first of 10 chunks was read).
- **Erdős unit distance (May 2026).** The Conversation article (theconversation.com, 2026-05-26) quotes Gowers saying he would recommend publication "without any hesitation" if a human had submitted the paper. It also reports Will Sawin's improvement (arXiv 2605.20579) and a DeepMind result on nine smaller Erdős problems (arXiv 2605.22763). The Conversation search snippet had a garbled exponent. I did not rely on it.
- **Xena blog (2026-07-20).** The fetch failed (HTTP 502), so I only have the search snippet: a Lean formalization of the Erdős counterexample was announced on June 26, and an LLM-generated PDF on group schemes was found wrong. Not verified by me.

## 6. Open PR review (rosetta #6, #7, #8 excluded)

Metadata from `gh pr view` (state, mergeability, size, files). Not a line-by-line code review.

| PR | title (short) | merge state | size | note |
|---|---|---|---|---|
| #26 | KAIROS search-engine change, PERIODOS/STICHOS, ANTIPHON, PR frontier review (this branch) | MERGEABLE / CLEAN | +38,312 / −102, 466 files | Large; mostly `bench/llm-blind-*` receipts. Merge needs fresh confirmation (not merged). |
| #23 | Add audited one-chat optimal codec selection | CONFLICTING / DIRTY | +1,440 / −66, 20 files | Needs rebase. |
| #20 | Expand Pareto Benchmarks (prose, chaos, red-team) | MERGEABLE / CLEAN | +74,511 / −31, 7 files | Commits `dist-bench/` compiled output. Hygiene issue. |
| #18 | System-Wide Pareto Red Team | MERGEABLE / CLEAN | +89,377 / −3, 8 files | Commits `dist_bench/` compiled output. Hygiene issue. |
| #17 | Pareto Frontier Evaluation Suite, codec map | MERGEABLE / CLEAN | +432, 3 files | Small; adds `codec-map.ts`. |
| #13 | ASTRAEA-A2 straight-line grammar codec | CONFLICTING / DIRTY | +1,500, 16 files | Needs rebase. |
| #11 | Tier 5 Ultrareview & Formal Codec Pareto Verification | CONFLICTING / DIRTY | +3,078, 13 files | Needs rebase. |
| #4 | Implement ASTRAEA-A2 Pareto-Superior Direct Reasoning Codec | MERGEABLE / CLEAN | +1,423 / −1, 4 files | Touches `registry.ts`. |
| #3 | Implement AETHER-A1 Pareto Superior Direct Reasoning Codec | CONFLICTING / DIRTY | +473 / −78, 10 files | Needs rebase. |
| #2 | Add STARLIGHT-S1 Pareto-Superior Byte-Exact Codec | CONFLICTING / DIRTY | +2,347 / −73, 17 files | Needs rebase. |

No review decisions or check runs exist on any of these PRs (`reviewDecision` and `statusCheckRollup` are empty).

## 7. What we have missed (honest list)

1. **Held-out generality of the ops gain.** The −2,012 is on the diagnosed files. Held-out ops: −2. Need a fresh set of ls/dpkg/ps outputs from another host or distro before claiming the gain generalises.
2. **LLM readability is unverified.** There is no LLM in this sandbox. The COL legend (63 tokens) and the VXA alias table in the A7 wire are untested with a model. This is the biggest open claim.
3. **Legend tuning was measured by token count only.** A shorter legend must still be decodable. No decode test with a model.
4. **Unified legend not measured.** Co-occurrence of layers on the same file was not counted across the corpus.
5. **Prose has no gain.** Prose is a tie in every group. It remains the hard lane.
6. **Literature.** LTSC (2506.00307) reports larger gains but needs a fine-tuned decoder, so it is not a like-for-like comparison. Whitespace-gap table detection is old prior art.
7. **OpenAI claims.** L0 press claims conflict with L1 (withdrawn manuscripts). Do not repeat press counts or withdrawn results.
8. **PR hygiene.** #18 and #20 commit compiled output. Five PRs need rebase (#2, #3, #11, #13, #23).
9. **Round-trip of A7 wires on the decoder side** is verified in this sandbox, not in an independent decoder implementation.

## 8. Tools, runtime, verification

- Runtime: sandbox with 2 vCPUs. Node with esbuild bundles (`node_modules/.bin/esbuild`). The `tsx` runner is not installed. `tsc --noEmit -p .` exit 0 after the legend change and after the registry change.
- Round-trip: `bench/z30/a7-roundtrip.ts` bundled to `/home/user/z20-work/a7rt2.cjs`, run in the background (about an hour). 53 checks, 0 failures.
- Web: 4 `web_search` queries (2 in Z30 earlier, 2 this turn), 6 `fetch_page` calls (github.com/openai/math, history.md, formalization.yaml chunk 1, CONTENTS.md, theconversation.com; xenaproject returned 502).
- GitHub: `gh pr list` and `gh pr view` for open PRs. No merge, no close.
- Not done: Lean builds, LLM decode tests, independent decoder, manuscript reading.
