# X12 report: tier-5 ultrareview of the codec stack

Branch `arena/95aaefc1-kompkernel`. Base `origin/main` at `47bbca9` (PR #30 merged; session closed for remote pushes, so nothing here is pushed).

## 0. Verdict

- **Success predicate: NOT MET.** No codec beats the frontier by more than 3 tokens on a general lane. The largest gains are on ops and structured lanes, and they come from AKOLOUTHIA-2, which was shipped in X11 and is not new in this turn.
- **New codec this turn: ANAPHORA-FOLD (`src/lib/omega/anaphora-fold.ts`), negative and unregistered.** It is byte-exact, but the DAEDALUS gate (G3) rejects every fold on every lane that has one. Its raw-token ceiling of up to 42% does not translate into a realised saving.
- **Incident, fixed:** this turn first overwrote the shipped `src/lib/omega/anaphora.ts` (AN1, imported by `bench/leaderboard.ts`, `bench/z48/adversary.ts`, and `src/components/Workbench.tsx`). I restored it from HEAD (`git diff --quiet HEAD` is clean) and moved the fold codec to its own module with renamed exports. `npx tsc --noEmit -p .` exits 0 with the restored file. The CPython reader was renamed to `bench/anaphora_fold_decode.py` (15/15 still exact).
- **Runtime finding:** under `OMEGA_DET=1` the clock is pinned to 0, so every `now() > deadline` check is false and each search runs to natural completion. Deterministic, but unbounded: `prose-readme-2..6` and the ANAPHORA bench had no completion after 20+ minutes and were stopped. Production runs (no `OMEGA_DET`) are capped at `min(20000, 1200 + len*1.1)` ms. Measured numbers in this repo are therefore "natural end" values, and production values can differ on large inputs.

## 1. Formal model

- **Admissible object.** A codec C is a triple (contract K_C, encoder E, reader R). For input text T, one chat message M = K_C + E(T) must be readable by an LLM with no system prompt and no skills.md. The admissible output is exactly T, byte for byte.
- **Access model.** The LLM sees only M. It has no tools, no execution, and no retrieval. It reads sequentially and can copy spans it has already seen.
- **Counted resource.** M in o200k_base tokens (`countTokens`, `OMEGA_DET=1`).
- **Success predicate (declared):** ∃ codec C and ∃ lane L ∈ S (general prose / ops set) such that M_C(L) ≤ min_frontier(L) − 4, AND ∀ L' ∈ S: decode(E(L')) = L' exactly under both the TS reader and the CPython reader, AND every gate failure falls back to the identity arm (plain DAEDALUS).
- **Quantifier order.** ∃C ∃L ∀L' (exactness) and a fixed gate suite. Swapping ∀L' and ∃L is not allowed.
- **Parameter regime.** o200k_base; `OMEGA_DET=1`; one message; no LLM in the loop. Margin 4 tokens is my declared reading of "more than a few tokens".
- **Tolerances.** Byte exactness: zero. Token margin: 4. No lossy output is admissible.
- **Adjacent problems not substituted.** (a) Raw-token ceilings are not codec savings, since the frontier already removes repeats. (b) Minimal superstring length is not token cost. (c) Lossy summarisation is inadmissible. (d) Model accuracy was not measured, so no claim is made about it.

## 2. Outcome space

- **H+** (a codec meets the predicate). Not reached.
- **H−** (proof that no codec in this family can meet it). Not proved. What is established is narrower: the fold family fails G3 on every lane it touches, and the word-alias family has a DAEDALUS-level ceiling near 0.
- **H∂** (undecided). This is the state for the general claim.

## 3. Frontier (measured, 17 lanes, `OMEGA_DET=1`)

Receipts: `bench/z57/receipts/frontier-fl-part-aa.jsonl` (9 lanes) and `frontier-fl-part-ab.jsonl` (8 lanes). Table produced by `bench/z57/summarize.py` from those receipts, with no re-measurement.

| lane | raw | DAEDALUS | DAEDALUS-D | A10 | DENDRON | DENS-2 | GRAMMA | AKOLOUTHIA-2 | frontier-min | saving vs DAEDALUS (+ = frontier smaller) |
|---|---|---|---|---|---|---|---|---|---|---|
| de-kb.txt | 2432 | 495 | 492 | 505 | 495 | 495 | 495 | 495 | 492 | +3 |
| readme.txt | 3242 | 688 | 688 | 719 | 688 | 688 | 688 | 688 | 688 | +0 |
| kb-article.txt | 3385 | 651 | 650 | 656 | 651 | 651 | 651 | 651 | 650 | +1 |
| email-thread.txt | 2126 | 525 | 530 | 629 | 525 | 525 | 525 | 525 | 525 | +0 |
| llm-answer.md | 2542 | 707 | 706 | 733 | 707 | 707 | 707 | 707 | 706 | +1 |
| bibliography.txt | 2759 | 711 | 709 | 896 | 711 | 711 | 711 | 709 | 709 | +2 |
| meeting-transcript.txt | 1746 | 420 | 420 | 472 | 420 | 420 | 420 | 420 | 420 | +0 |
| df-h.txt | 939 | 281 | 279 | 414 | 281 | 281 | 281 | 171 | 171 | +110 |
| psql-output.txt | 1578 | 397 | 397 | 437 | 397 | 397 | 397 | 355 | 355 | +42 |
| kubectl-get-pods.txt | 2649 | 386 | 390 | 547 | 386 | 386 | 386 | 326 | 326 | +60 |
| node-stacktraces.txt | 1848 | 339 | 342 | 410 | 339 | 339 | 339 | 339 | 339 | +0 |
| openstack-loghub-26.log | 7969 | 1008 | 1053 | 1247 | 1008 | 1008 | 1008 | 1008 | 1008 | +0 |
| git-numstat.txt | 12306 | 2036 | 2036 | 2214 | 2036 | 1904 | 2036 | 2036 | 1904 | +132 |
| find-listing.txt | 11789 | 1326 | 1342 | 1415 | 1326 | 1318 | 1326 | 1326 | 1318 | +8 |
| chart.svg | 3446 | 465 | 465 | 539 | 465 | 465 | 465 | 330 | 330 | +135 |
| dump.sql | 5159 | 728 | 725 | 876 | 728 | 728 | 728 | 703 | 703 | +25 |
| vix-daily-1990.csv | 6578 | 1394 | 1390 | 1589 | 1394 | 1394 | 1394 | 1369 | 1369 | +25 |

Notes:
- "A10" is `phalanx-a10`. It is worse than DAEDALUS on all 17 lanes, so it is not the frontier in practice. The naming conflict (`phalanx-a10` vs PARADEIGMA+DAEDALUS-D) is still unresolved. PARADEIGMA was not run in this batch.
- AKOLOUTHIA-2 is in the frontier-min column, which is why ops lanes show −60 to −135 tokens. Without it, the savings are: git-numstat 132 (DENS-2), find-listing 8 (DENS-2), vix 4, dump 3 (DAEDALUS-D), and at most 3 on prose. DENS-2 and DAEDALUS-D are not AKOLOUTHIA-2.
- `ops-ls-l-omega.txt` and `ops-ls-l-bin.txt` (new lanes, not in the 17) are in §11.

## 4. Local leaders by category (from the 17 lanes)

| category | lanes | leader (M) | margin over DAEDALUS |
|---|---|---|---|
| prose, KB, LLM answers | de-kb, kb-article, llm-answer, readme | DAEDALUS-D (492, 650, 706); tie on readme (688) | −3 to 0 |
| bibliography | bibliography | AKOLOUTHIA-2 = DAEDALUS-D (709) | −2 |
| email, meeting | email-thread, meeting-transcript | DAEDALUS = DENDRON = DENS-2 (525, 420); DAEDALUS-D is worse on email | 0 |
| logs, stack traces | node-stacktraces, openstack-loghub-26 | identity (DAEDALUS = all others) | 0 |
| directory listings | find-listing | DENS-2 (1318) | −8 |
| git numstat table | git-numstat | DENS-2 (1904) | −132 |
| ops tables | df-h, psql, kubectl | AKOLOUTHIA-2 (171, 355, 326) | −110, −42, −60 |
| structured numeric | chart.svg, dump.sql, vix-daily | AKOLOUTHIA-2 (330, 703, 1369) | −135, −25, −25 |
| ls -l listings | ops-ls-l-omega, ops-ls-l-bin | DENS-2 (954) on omega; tie on bin (247, all arms) | −17 on omega; 0 on bin |

Prose has no leader worth more than 3 tokens. Gains come from numeric tables (AKOLOUTHIA-2) and from DENS-2 on listings and numstat.

## 5. Codebase and PR review

- The registry has 176 codec keys. AKOLOUTHIA-2 (X11) is already registered and is an arm in the DAEDALUS tournament, so it is combinable by construction.
- Open PRs were not reviewed in this turn. The session is closed for remote calls and `gh` reaches GitHub, so I did not call it.
- Combinable candidates in the repo: DENS-2 with AKOLOUTHIA-2 on git-numstat. The combination is not measured here.

## 6. LLM-native decoding

- **Not confirmed by any LLM.** No model was run on any wire. The only decoders used are the TS reader and the CPython reader (`bench/anaphora_fold_decode.py`, 15/15 exact on the forced-fold red-team messages, `bench/z57/receipts/redteam-anaphora.py.json`).
- An in-context agent decode of a fold message was not completed, so no claim is made.
- The fold header `@k,n,m|` is a human-readable reader rule, but LLM readability is unverified.

## 7. Live research (ten-year window, this turn)

- `openai/math`, "A Polynomial-Time 2-Approximation for Shortest Common Superstring" (24 Sep 2026). Chunk 0 of 8 read. Cites Tarhio–Ukkonen, Blum et al. (3-approx), Sweedyk (√5/2), Mucha (2+11/23), Englert–Matsakis–Veselý (<2.466), Chukhin et al. (7/3, Aug 2026), Shibata (Greedy counterexample ≥ 9/4, Sep 2026). Applicability: low. The output needs offsets, which an LLM cannot copy reliably. Chunks 1–7 are unread.
- FSST: Boncz, Neumann, Leis, "FSST: Fast Random Access String Compression", VLDB 2020, 13(12), pp. 2649–2661, doi 10.14778/3407790.3407851. A static 255-symbol table with random-access decode. This is the same idea as the DAEDALUS glyph dictionary, so it is prior art, not new.
- arXiv 2411.08671 (Nov 2024): optimal BPE compression is APX-complete. This supports greedy heuristics over optimal search.
- arXiv 1704.08558 (Bille, Gørtz, Prezza, 2017): Re-Pair encoding within 2.8% of the information-theoretic minimum. Needs recursive expansion, so it is not one-pass LLM-readable.
- Re-Pair front coding, VLDB Journal 2020 (`link.springer.com/article/10.1007/s00778-020-00620-x`): block dictionary compression, not applicable to a one-chat reader.

## 8. OpenAI math proofs, and re-examination

- Individually reviewed: only the superstring preprint, chunk 0 of 8. Applicability to codec design judged low (§7).
- Proofs called out in earlier turns were not re-examined in depth in this turn. The Navier–Stokes claim and the secondary claims remain unverified. No Lean toolchain is installed, so no Lean certificate was checked.

## 9. Negative space (shapes that look like solutions and fail)

Each shape below was measured or argued from measurement. Items marked "argued" were not measured.

1. Raw-token ceiling read as a saving. ANAPHORA-FOLD ceilings reach 42% on `ops-ls-l-omega`, but the realised fold M is +92. Fails.
2. Line fold with a 7-token header `@k,n,m|`. Fails G3 on openstack (+72), ls-l-omega (+92), psql (+60).
3. Look-back window K=1, 4, 16 (`bench/z57/receipts/anaphora-k-sweep.jsonl`, plus the full K=16 bench). The gate rejects every fold at every K. Fails.
4. Base re-encoding of digits (hex). `ff3a9c0d` = 7 tokens for 8 chars; `a1b2c3d4e5f6` = 12. Fails.
5. Digit grouping (`1,234,567`, `1 234 567`). Costs the same as ungrouped decimal (⌈d/3⌉ tokens). No gain.
6. Column delta coding on `vix-daily-1990.csv`. Value tokens 2142, delta tokens 2625, +483. Fails.
7. Implicit closing tags. 23 closers cost 70 tokens (5.3%) on `chart.svg`, but DAEDALUS already aliases repeated closers. Not measured against DAEDALUS (argued: fails).
8. Smallest-token multilingual alias for words. Raw net saving 0–8.2% (de-kb 43/525), most lanes below 2%. Not measured against DAEDALUS output; argued to be near 0 because DAEDALUS already removes repeats.
9. Keyed progression addressing (ONOMASIA). Loses to AKOLOUTHIA-2 on chart, df-h, kubectl, psql. Negative (X11).
10. Contract wording compression (X9 lever). −3 tokens, below the bar, not adopted.
11. KLADOS. Net loss (X11 uncommitted work, not committed).
12. Header dictionaries (CompactPrompt-style, arXiv 2510.18043). DAEDALUS already dominates them. Prior art.
13. Lossy summarisation. Not byte-exact. Inadmissible.
14. A decoder that needs a system prompt (arXiv 2604.13066). Inadmissible.
15. Fine-tuned tokenizers (MedTPE arXiv 2605.11774, LTSC arXiv 2506.00307). Need training. Inadmissible.
16. Re-Pair/Sequitur grammar with recursive expansion. Exact, but the LLM must expand nested rules in several steps. Fails one-pass admissibility (argued).
17. Superstring overlap merging with offsets (openstack/math). Offsets are not reliably copyable by an LLM. Fails (argued).
18. Base64 or other binary-to-text packing. More tokens per byte. Fails (argued).
19. Dictionary-free delta of timestamps. Not measured here. Untested.

**Test for the modal shortcut.** The shortcut is: "the gap is covered by the glyph dictionary, so any raw-token saving is real." The test is whether a candidate's gain survives after DAEDALUS is applied to its own output. ANAPHORA-FOLD fails the test on all three lanes with forced folds (raw ceiling 42%, realised +92 on ls-l-omega; +72 openstack; +60 psql). Word-alias has not been run through the test: it has only the raw ceiling, so it is untested.

## 10. Mechanism portfolio (7 approaches)

Each entry gives construction, artifact, proved portion, unresolved interface, falsification test, and whether the gap is local or equivalent to the original problem.

- **M1. ANAPHORA-FOLD (look-back anchoring, two-sided field copy).** Artifact: `src/lib/omega/anaphora-fold.ts`. Proved: byte-exact on TS and CPython (red team 37 cases including 24 seeded random tables, 15 forced folds, 0 mismatches); gate G1 and G2 pass. Unresolved: G3 (fold M must beat plain M). Falsified on 3 forced-fold lanes (openstack, ls-l-omega, psql); K-sweep (K ∈ {1,4,16}) on 2 lanes, and full K=16 bench on 28 lanes, all identity. Gap: local to the header cost, but the interaction with DAEDALUS glyphs is a structural conflict. Status: negative.
- **M2. Multilingual smallest-token alias tier (user idea).** Construction: replace each frequent word with the shortest-token alias from any tokenizer-known language. Artifact: `bench/z57/word-ceiling.ts`. Proved: raw ceiling only (10 prose and ops lanes). Unresolved: the interaction with DAEDALUS, which has not been measured. Falsification: M_alias ≥ M_DAEDALUS on the prose lanes once DAEDALUS is applied to the alias output. Gap: local. Status: undecided; only the raw ceiling is measured (de-kb 8.2%, the rest ≤2.9%).
- **M3. Second-tier numerals for near-duplicates.** Construction: a numeric alias for near-duplicate lines. Artifact: `bench/z57/ideas-ceiling.ts`. Proved: the base-change and grouping variants (digit-base and digit-grouping). Falsified on both. Unresolved: near-duplicate detection under DAEDALUS. Gap: local. Status: negative for the variants measured.
- **M4. Column delta coding.** Artifact: `bench/z57/ideas-ceiling.ts`. Falsified (+483 on vix). Gap: local. Status: negative.
- **M5. Implicit closing tags.** Artifact: `bench/z57/ideas-ceiling.ts`. Proved: raw 70 tokens on chart. Unresolved: DAEDALUS interaction. Falsification: M_implicit ≥ M_DAEDALUS on chart. Gap: local. Status: undecided (not measured against DAEDALUS).
- **M6. Greedy superstring overlap with offsets (openstack/math).** Construction: merge lines by maximal overlap, emit offsets. Proved: approximation ratio for the superstring objective (chunk 0 only). Unresolved: an LLM-copyable offset format. Falsification: a token-cost test on any log lane. Gap: equivalent to the original problem, because the decoder has to do offset arithmetic. Status: not implemented.
- **M7. Re-Pair grammar with one-pass expansion.** Construction: rules for frequent bigrams, expanded by the LLM. Proved: exact encoding (Bille et al. 2017) with an entropy bound. Unresolved: a one-pass LLM decoder for nested rules. Falsification: a decode-step count above one on any lane. Gap: equivalent to the original problem. Status: not implemented.

## 11. Frontier on the new lanes (`ops-ls-l-omega`, `ops-ls-l-bin`)

Run with `OMEGA_DET=1` in `bench/z57/receipts/frontier-newlanes.jsonl`. Both finished (the omega lane took several minutes under the unbounded deterministic search).

| lane | raw | DAEDALUS | DAEDALUS-D | A10 | DENDRON | DENS-2 | GRAMMA | AKOLOUTHIA-2 | frontier-min |
|---|---|---|---|---|---|---|---|---|---|
| ops-ls-l-omega.txt | 8760 | 971 | 965 | 1168 | 971 | 954 | 971 | 971 | 954 |
| ops-ls-l-bin.txt | 1162 | 247 | 248 | 304 | 247 | 247 | 247 | 247 | 247 |

Listings are DENS-2 territory. `ls -l src/lib/omega` gains 17 tokens; `ls -l node_modules/.bin` is a tie. The ANAPHORA-FOLD K-sweep on the same lanes (K=1, 4, 16) produced no gate-passing folds (`bench/z57/receipts/anaphora-k-sweep.jsonl`, 2 rows).

## 12. Verification

- **TypeScript round trip.** ANAPHORA-FOLD: 37 red-team cases (including 24 seeded random tables) with 0 failures. `tsc --noEmit` exits 0 for the repo.
- **CPython reader.** `bench/anaphora_fold_decode.py` reads the 15 forced-fold messages: 15/15 exact. Identity-arm messages were not checked with this reader.
- **Tokenizer count.** o200k_base via `countTokens`. X10 cross-check (fast == exact) still applies.
- **External downgrade.** No Lean toolchain: any Lean claim is downgraded to unverified. No LLM run: LLM readability is downgraded to unverified.

## 13. Repair and one new attack

- **Repaired candidate.** ANAPHORA-FOLD with the look-back window narrowed to K ∈ {1, 4}. The aim was to reduce spurious matches, not the header cost.
- **Gates re-run:** G1 and G2 pass; G3 fails on every lane with folds. The repair does not change the verdict.
- **New attack:** the K-sweep on ls-l lanes shows that a narrower window produces no gate-passing folds at all (K=1, 4, 16 all identity). The repair is closed.

## 14. Stopping

The success predicate is not met, and the budget is spent. The strongest verified artifact is AKOLOUTHIA-2 (already in the repo, X11): it saves 110, 135, 60, 42 tokens on df-h, chart, kubectl and psql, and 0 on prose.

**Remaining gap:** a codec that beats DAEDALUS-D on a general prose or log lane by more than 3 tokens after DAEDALUS has been applied to its output.

**Next test (single, falsifiable):** a signed-decimal and time-of-day progression rule (generalising AKOLOUTHIA-2 from digit runs to signed decimals and HH:MM:SS fields), measured with DAEDALUS applied afterwards on `openstack-loghub-26.log`, `node-stacktraces.txt`, and `ops-ps-aux.txt`. Success: at least 4 tokens below min(frontier) on at least one of those lanes, with exact TS and CPython round trips.
