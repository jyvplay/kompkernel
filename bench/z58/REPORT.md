# X13 report: tier-5 ultrareview, HORA (timestamp deltas), frontier re-run

Branch `arena/95aaefc1-kompkernel`. Session closed for remote operations (PR #30 merged). Nothing was pushed and no GitHub call was made. All numbers below come from receipts in `bench/z58/receipts/` unless labelled otherwise.

## 0. Verdict

- **New codec committed: HORA** (`src/lib/omega/hora.ts`, registry key `hora`). Deterministic, one chat message, byte-exact, with an identity fallback.
- **Measured gain (one real lane):** openstack-loghub-26.log, one-chat M, o200k, `OMEGA_DET=1`: identity 1008, HORA 987, **−21 tokens (2.1%)**, exact. Source: `hora-probe-final.jsonl`.
- **Scope:** HORA changes only lines with a full `YYYY-MM-DD HH:MM:SS.mmm` timestamp that share the previous date and separator. On the other lanes measured, it fell back to identity at no cost (spring trace, npm-debug log). It has no effect on prose.
- **Success predicate (declared in §2):** partly met. The predicate needs a gain above 4 tokens on a general lane. One log lane gives −21, but it is a category gain (logs with ms timestamps), and only one real lane of that kind was measured. I therefore claim HORA as **conditional**, not as a general win.
- **User's language-tier (alias) idea: tested first, negative.** Best case −4 (de-kb). Six of seven lanes were +6 to +17 (§5).
- **Frontier re-run:** the six-lane reproduction matches the X12 receipts on 30 of 30 values (§4). PARADEIGMA has now been run on the same subset (§4, bottom).

## 1. Runtime honesty

- **Tools actually used:** bash; `bench/tmp/run.sh` (esbuild bundle then node); `npx tsc --noEmit -p .` (exit 0 with the final code); python3 (CPython readers); `web_search` (3 searches, §4). No `fetch_page` this turn.
- **Agents:** none. No sub-agents.
- **Simulators or mocks:** none. The red-team inputs are unit-style edge cases and seeded random tables, not performance evidence.
- **Verifiers:** the TypeScript compiler and a CPython reader. **No Lean or other prover is installed**, so no proof output exists.
- **LLM in the loop:** **none.** No model was run on any wire. LLM readability of the HORA form is unverified (§8, M1).
- **GitHub:** no calls. The local refs (`git branch -a`) contain only `main`, `origin/main`, and this session's branch. Other open PRs cannot be listed from this checkout, so they were not reviewed.
- **Runtime limits under `OMEGA_DET=1`:** the deterministic search does not stop on a budget, so it runs to natural end. The ollama lane was killed after 7+ minutes without finishing (it also failed to finish in a previous attempt). **Jellyfin was not run.** Those lanes are recorded as **not completed**, not as results.

## 2. Formal model

1. **Admissible object:** a codec is a triple (contract K, encoder E, reader R). For input text T, the one-chat message M = K + E(T) must be readable by an LLM with no system prompt and no skills file. The output must be exactly T, byte for byte.
2. **Access model:** the reader sees only M. It has no tools, no code execution, no retrieval, and no second message.
3. **Counted resource:** M in o200k_base tokens, computed as contract plus the DAEDALUS decoder prompt (which includes the wire).
4. **Success and failure, quantifier order fixed:**
   - *Success:* ∃ codec C ∃ lane L in a general class S such that M_C(L) ≤ min_frontier(L) − 4 AND ∀ L′ ∈ S, decode(E(L′)) = L′ exactly under both the TypeScript and the CPython readers AND every gate failure returns identity.
   - *Failure:* for every C in the family, no lane meets the margin, or some lane is not exact.
   - The order is ∃C, then ∃L, then ∀L′ for exactness. It is not swapped.
5. **Parameter regime:** o200k_base; `OMEGA_DET=1`; one message per lane; one run per lane. Margin 4 tokens is the reading of "more than a few" used here. Exactness tolerance is zero; there is no lossy arm.
6. **Adjacent problems not substituted:** (a) raw-token savings are not codec savings when DAEDALUS already removes repeats; (b) timestamp coding in binary log compressors is not one-chat token cost; (c) quantum state compression is not classical text compression.

## 3. Outcome space

- **H+ (achieved, conditional):** HORA on logs with ms timestamps. Evidence: openstack −21, exact under TypeScript (`hora-probe-final.jsonl`, `hora-redteam.out` 46/46) and CPython (`hora-py.json`, 3/3). Commit threshold: one real lane above 4 tokens, exact round trips, identity elsewhere. Met on one lane only.
- **H− (not established):** the alias class fails on the measured prose lanes (§5). The fold class fails G3 on every lane with folds (X12). Neither is a general impossibility proof.
- **H∂ (boundary):** the saving depends on how many lines carry a same-date timestamp. The spring trace has 9 such marks and the delta arm is 19 tokens *worse* than identity (982 vs 963), so the gate returns identity. The saving on logs longer than 26 timestamped lines is **not measured**, because no longer real log with ms timestamps was available here.

## 4. Frontier

**Reproduction** (`bench/z58/receipts/repro-frontier.jsonl`, six lanes × five keys, `OMEGA_DET=1`): compared cell by cell with the X12 receipts (`bench/z57/receipts/frontier-fl-part-a*.jsonl`): **30 of 30 equal.**

| lane (file) | raw | DAEDALUS | DAEDALUS-D | A10 (`phalanx-a10`) | DENDRON | DENS-2 (`dendrons`) | AKOLOUTHIA-2 | frontier min |
|---|---|---|---|---|---|---|---|---|
| openstack-loghub-26.log | 7969 | 1008 | 1053 | 1247 | 1008 | 1008 | 1008 | 1008 (+0) |
| psql-output.txt | 1578 | 397 | 397 | 437 | 397 | 397 | 355 | 355 (+42) |
| df-h.txt | 939 | 281 | 279 | 414 | 281 | 281 | 171 | 171 (+110) |
| chart.svg | 3446 | 465 | 465 | 539 | 465 | 465 | 330 | 330 (+135) |
| de-kb.txt | 2432 | 495 | 492 | 505 | 495 | 495 | 495 | 492 (+3) |
| llm-answer.md | 2542 | 707 | 706 | 733 | 707 | 707 | 707 | 706 (+1) |

Restatement: AKOLOUTHIA-2 leads on the ops tables. DAEDALUS-D leads on prose by 1–3 tokens. A10 is worse than DAEDALUS on every lane in this subset, so **A10 is not on the frontier in this repository**. The name "PARADEIGMA+DAEDALUS-D" in the earlier frontier refers to a pipeline that has not been run as a unit; §4 bottom reports PARADEIGMA separately.

**PARADEIGMA** (`paradeigma.ts`, key `paradeigma`): run on the same six lanes with `OMEGA_DET=1` (`bench/z58/receipts/paradeigma-subset.jsonl`). Result: **equal to plain DAEDALUS on all six lanes** (openstack 1008, psql 397, df-h 281, chart 465, de-kb 495, llm-answer 707). Its template mechanism targets JSON-record shapes, and none of these lanes has that structure, so it is inactive here. It is not evidence against PARADEIGMA on JSON API lists (its own registry note reports −7 to −15% there, not re-measured this turn). The "PARADEIGMA+DAEDALUS-D" pipeline therefore has no gain on the subset, and the frontier on these lanes is unchanged.

**Imported results and their hypotheses:**

- **Gorilla** (Pelkonen et al., VLDB 2015; `vldb.org/pvldb/vol8/p1816-teller.pdf`). Delta-of-delta timestamps with bit-level packing. Hypothesis: fixed-width binary values. Open interface: a delta an LLM can add back in text.
- **LogReducer** (Wei et al., USENIX FAST 2021; `usenix.org/system/files/fast21-wei.pdf`). Delta timestamps inside a parser-based log compressor. The paper reports timestamps taking a large share of compressed output on many logs. Hypothesis: a parser and a binary container. Open interface: the same gain in one text message with no parser.
- **DeLog** (arXiv 2601.15084, 2026). Delta encoding for numeric streams. The paper notes that leading zeros must be preserved for losslessness, and HORA keeps fixed-width fields for that reason. Hypothesis: parser-based. Open interface: as for LogReducer.
- **Re-Pair** (Bille, Gørtz, Prezza, arXiv 1704.08558, 2017). Grammar compression within 2.8% of the bit-level minimum. Hypothesis: bit cost and recursive expansion. Open interface: token cost and one-pass LLM expansion. DAEDALUS is a token-level merge loop; I have not verified that it is an instance of Re-Pair.
- **Optimal BPE compression is APX-complete** (arXiv 2411.08671, 2024). Hypothesis: a bytes objective. Open interface: a token objective under an LLM reader. Supports greedy heuristics.
- **FSST** (Boncz, Neumann, Leis, VLDB 2020; doi 10.14778/3407790.3407851). Static 255-symbol table with random-access decode. Prior art for DAEDALUS glyphs.
- **Schumacher quantum noiseless coding** (1995; Preskill's lecture notes, ch. 10). Typical-subspace compression of quantum sources with known ensemble. Open interface: no classical text analogue that gives a token gain. Stated as analysis only.
- **Superstring 2-approximation** (`openai/math` preprint, 24 Sep 2026). Only chunk 0 of 8 was read (X12). Hypothesis: overlaps with offsets. Open interface: an LLM cannot reliably copy offsets. Not re-read this turn.

**Common open interface:** a token-priced, one-pass transform on typed values (datetimes, counters, enumerations) whose inverse an LLM can apply in a single chat turn, with the gate computed on the real tokenizer. HORA is the first point on that interface measured in this stack, and its LLM-side validity is not yet tested.

**Live searches (this turn, last ten years, new terms):**
1. "lossless log compression timestamp delta encoding millisecond timestamps": returned LogReducer, DeLog, Gorilla (above).
2. "Schumacher compression typical subspace quantum source coding classical analogue": returned Preskill's notes and Schumacher's 1995 result (above).
3. "LLM prompt compression lossless tokenizer-aware token budget 2025 2026": returned MedTPE (arXiv 2605.11774; needs fine-tuning, inadmissible) and TALE (arXiv 2412.18547; output-side token budgets, not an input codec).

## 5. Language-tier (alias) idea, tested first (`bench/z58/alias-test.ts`, `alias-test.jsonl`)

Method: words of four or more letters that cost two or more o200k tokens and recur are replaced by single-token aliases from a pool of 114 short tokens in other languages. M = contract + DAEDALUS message on the substituted text. All seven round trips exact.

| lane | entries | contract | DAEDALUS on alias text | alias M | plain M | Δ |
|---|---|---|---|---|---|---|
| de-kb | 3 | 36 | 455 | 491 | 495 | **−4** |
| kb-article | 0 | 10 | 651 | 661 | 651 | +10 |
| readme | 1 | 14 | 680 | 694 | 688 | +6 |
| llm-answer | 0 | 10 | 707 | 717 | 707 | +10 |
| bibliography | 0 | 10 | 711 | 721 | 711 | +10 |
| email-thread | 1 | 14 | 524 | 538 | 525 | +13 |
| meeting-transcript | 2 | 22 | 415 | 437 | 420 | +17 |

Reading: DAEDALUS already removes most repeated words, so there is little left for an alias to save, and the contract costs more than that. The one gain (de-kb, −4) is below the bar. **Negative; not adopted.** A second numeral tier for near-duplicates was not tested separately. The earlier X12 digit-grouping and base-re-encoding tests were the nearest measurements.

## 6. HORA

- **Mechanism.** A full `YYYY-MM-DD<sep>HH:MM:SS.mmm` whose date and separator match the previous timestamp is written as `※N`, where N is the signed millisecond difference from the previous timestamp (bounded). The reader adds N back, keeping the date and separator.
- **Marker.** `※` (U+203B), one o200k token, absent from the CHIRON, DAEDALUS, ARIADNE and SIBYL sources and from the openstack lane (`marker-check.ts`). `§` was rejected because CHIRON uses it as its structural delimiter.
- **Contract:** 23 o200k tokens. A 50-token version was shortened.
- **Gates (encoder):** G0, the marker's code point lies outside the glyph alphabet DAEDALUS chose (checked with `chironInScript`); G1, exact TypeScript expansion; G2, DAEDALUS round trip; G3, one-chat M below plain DAEDALUS; G4, end-to-end `horaDecode(wire, 'delta') === input`. Any failure returns identity. The input is refused if it already contains `※`.
- **Greedy or search:** greedy, single left-to-right pass; the gate compares two fixed candidates.
- **Time and CPU bound:** one linear pass, plus DAEDALUS encodes for each arm (the time bound of DAEDALUS applies; under `OMEGA_DET=1` it runs to natural end).

### Results (final code, `OMEGA_DET=1`)

| lane | marks | arm | identity M | HORA M | Δ | exact | source |
|---|---|---|---|---|---|---|---|
| openstack-loghub-26.log | 25 | delta | 1008 | 987 | **−21** | yes | `hora-probe-final.jsonl` |
| spring-projects trace (.md) | 9 | identity | 963 | 963 | 0 (delta arm 982) | yes | same |
| npm-debug-300.log | 0 | identity | 1625 | 1625 | 0 | yes | same |
| ollama gh-issue | — | — | — | — | — | **not completed** (killed at 7+ min) | — |
| jellyfin trace | — | — | — | — | — | **not run** | — |

### Checks on the final code

- **Red team** (`hora-redteam.ts`, `hora-redteam.out`): **46/46 pass.** 22 hand-written edge cases plus 24 seeded random tables. The full DAEDALUS round trip runs on the hand cases and random-0..2; the rest are transform-level only.
- **CPython reader** (`bench/hora_decode.py`, reusing `bench/gnomon_decode.py`): on the three whole messages in `hora-messages.json` (arms: delta for openstack, identity for df-h and ls-l-bin), output equals `hora-messages.expected.json` in **3 of 3** (`hora-py.json`; regenerated this turn from the final code).
- **Type check:** `npx tsc --noEmit -p .` exit 0.

## 7. Negative space

Shapes that look plausible and fail, each with its measurement or the reason it fails:

1. Raw-token ceiling read as a saving: ANAPHORA's header-cost ceiling (up to 42% on ls-l-omega) turned into a real gain of +92 (X12, `ops-ls-l-omega`).
2. Line folding against a header: fails G3 (openstack +72, psql +60; X12).
3. Look-back window K = 1, 4, 16: no gate-passing fold (`anaphora-k-sweep.jsonl`, X12).
4. Digit base re-encoding: worse (X12).
5. Digit grouping: zero gain (X12 ceiling).
6. Column delta on numeric CSV: +483 tokens on vix-daily (X12).
7. Implicit closing tags: 5.3% raw on chart.svg, not measured after DAEDALUS. Argued to fail because DAEDALUS already aliases repeated closers.
8. Alias tier (user's idea): −4 best case, +6 to +17 otherwise (§5).
9. HORA on logs with too few timestamps: spring trace, delta arm +19 (the gate correctly falls back to identity).
10. HORA with `§` as the marker: collides with CHIRON's structural delimiter (rejected before measurement).
11. HORA with a "marker must not appear in the wire" gate: rejects every substitution, because the marker is always present when there are marks. Found and replaced by the glyph-alphabet test G0.
12. Header dictionaries (CompactPrompt, arXiv 2510.18043): prior art; DAEDALUS already covers the same repeats on the measured lanes.
13. Lossy summarisation: not byte-exact, so inadmissible.
14. Decoders that need a system prompt (arXiv 2604.13066): inadmissible.
15. Fine-tuned tokenizers (MedTPE arXiv 2605.11774; arXiv 2506.00307): need training, so inadmissible.
16. Re-Pair style nested expansion: exact in principle, but needs several expansion levels in one pass. Argued to fail the one-pass rule; not measured.
17. Superstring overlaps with offsets: an LLM cannot reliably copy offsets. Argued; not measured.
18. Quantum state compression: gives no classical token gain (§4). Argued.
19. Referencing public text the model may have memorised: not byte-exact under any guarantee. Inadmissible.

**Modal shortcut.** The shortcut is: "DAEDALUS already removes repeats, so any raw-token reduction is a saving." It fails in two ways. Savings on repeated structure are not additive with DAEDALUS's own savings. And a value that changes on every line (a timestamp) is not a repeat, so DAEDALUS does not remove it, but a delta only pays if its contract is cheaper than the saving.

**Test that catches it:** measure the candidate after DAEDALUS, and compare the full one-chat M (including the contract) with plain DAEDALUS. The alias run (§5) and the spring-trace run (§6) both fail this test. The G3 gate in every codec implements it.

## 8. Mechanism portfolio

Six mechanism-distinct approaches. For each: construction, artifact, proved portion, unresolved interface, falsification test, and whether the gap is local or equivalent to the original problem.

- **M1. HORA: typed datetime deltas.** Construction: §6. Artifacts: `src/lib/omega/hora.ts`, `bench/hora_decode.py`, `bench/z58/hora-redteam.ts`. Proved: the transform is invertible by construction (the encoder and the reader keep the same date, separator and time state after every timestamp, and a delta is written only when it decodes to the actual value); G1 and G4 check this per message. Measured: §6. Unresolved interface: the LLM must add N to the previous time with carries. Falsification test: one-chat LLM decode of the openstack delta message, counting wrong timestamps. **Not run: no LLM is available here.** Verdict: local (one arithmetic step), but the claim is downgraded to "reader-equivalent, LLM readability unverified".
- **M2. Alias substitution (user's idea).** Artifact: `bench/z58/alias-test.ts`. Proved: exact on seven lanes. Falsified: worse than DAEDALUS on six of seven. Verdict: equivalent to a DAEDALUS word rule; not a new mechanism.
- **M3. Line fold against a header (ANAPHORA-FOLD, X12).** Artifact: `src/lib/omega/anaphora-fold.ts`, unregistered. Proved: exact under TypeScript; CPython forced-fold cases pass (X12). Falsified: fails G3 on every lane with folds. Verdict: a conflict with the DAEDALUS glyph layer, not a header-cost problem.
- **M4. Arithmetic progressions on numeric fields (AKOLOUTHIA-2, shipped, X11).** Artifact: `src/lib/omega/akolouthia2.ts`. Measured: −413 tokens against plain DAEDALUS over 43 lanes (X11); leads on the ops tables in §4. Verdict: local (same-column progressions).
- **M5. Hierarchical token merges with glyph assignment (DAEDALUS, shipped).** Artifact: `src/lib/omega/daedalus.ts`. Measured: §4 reproduction. Verdict: the baseline itself.
- **M6. Brace-tree notation for path lists (DENDRON / DENS-2, shipped).** Artifacts: `src/lib/omega/dendron.ts`, `dendrons.ts`. Measured: §4 (ties DAEDALUS on the six-lane subset; no gain there). Verdict: local (paths only).

Status: M1 positive on one real lane (conditional); M2 and M3 negative; M4–M6 shipped baselines.

## 9. Verification

- **Type check:** `tsc --noEmit` exit 0.
- **TypeScript round trips:** red team 46/46; full encoder exact on the hand cases and random-0..2.
- **CPython reader:** 3/3 exact on three whole messages.
- **Tokenizer:** o200k_base via `countTokens`.
- **Downgraded:** no LLM decode (no model available), no Lean (not installed).

## 10. Repair

Three repairs this turn. Each re-ran the gates and got one new attack.

1. **Decoder state bug.** The reader did not update its previous-time state on delta lines; G1 failed at line 2 of openstack. Patch: update on every timestamp. Attack: the same-date run case and seeded delta chains. Pass.
2. **Marker collision.** `§` is CHIRON's delimiter; the marker became `※`. Attack: `section-sign-in-input` and `contains-marker`. Pass.
3. **Wrong collision gate.** The first G0 required the marker to be absent from the wire, which is always false when marks exist. Patch: check the code point against the glyph alphabet. Attacks: two `patch-attack-*` cases (a literal timestamp between deltas; a delta after a date change). Pass.

Final code: red team 46/46, CPython 3/3, `tsc` exit 0.

## 11. Stopping

- **Success predicate:** partly met (§0). Conditional on logs with ms timestamps.
- **Strongest verified artifact:** HORA on openstack, −21, exact under both readers.
- **Remaining gap:** a longer real log with ms timestamps (to measure growth with length), and an LLM decode of the openstack delta message to check the carry arithmetic. No LLM is available, so the second item is open.
- **Next test:** `bench/z58/hora-probe.ts` on real logs with ms timestamps, for example from PyPI sdists (`files.pythonhosted.org` is reachable from this sandbox). Success: a gain above 4 tokens on at least one non-openstack lane, identity elsewhere.

## 12. Other requests, stated honestly

- **Codec abbreviation page:** `docs/codec-abbreviations.md` (new). Decodes the frontier codecs and HORA with their mechanism, greedy or search status, citation, and time or CPU bound. Entries for codecs not reviewed this turn are marked as not decoded.
- **Ideas (nine, untested unless stated):**
  1. Transposed tables (columns first, reader un-transposes). Untested; the reader's load at many rows is a likely failure.
  2. Shared one-line contract across several codecs, to amortise the 23-token contract. Untested.
  3. Output-side expansion rules, which the metric does not count. AKOLOUTHIA-2 already uses this. Untested for other rules.
  4. Marker choice by tokenizer cost across single-token punctuation. Untested; `※` meets the one-token and alphabet tests.
  5. The HORA mechanism for IP addresses, ports and byte sizes in logs. Untested; needs a real log with those fields.
  6. A line-count checksum for the reader, so it can detect a dropped line. Untested; the reader still has no verifier.
  7. Typed deltas for durations and counters. Untested; same mechanism as HORA on another type.
  8. Quantum: Schumacher typical-subspace compression. Analysis only; no classical token gain.
  9. Quantum: entanglement-assisted or sampling-based schemes. Analysis only; they need a shared source the chat lacks.
- **Fractal depth and neuralese-only output:** style instructions, not deliverables. This report uses plain visible text.
- **Open PR review:** not done. No GitHub calls allowed; no other PR branches exist locally.
- **OpenAI math proofs:** only chunk 0 of the superstring preprint has been read (X12). Other chunks and earlier proofs were not re-read in X13, so no new applicability claim is made.
- **Rosetta:** not read this turn; no claim is made from it.
- **Earlier errors corrected:** DAEDALUS was described as "not Re-Pair" in an earlier turn; that was wrong, and it is now marked unverified (§4). The 30 of 30 frontier check was earlier run on partial output; it is now re-checked against the complete reproduction receipt.
