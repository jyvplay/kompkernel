# X15 report: DIAPHORA, the frontier re-run, and what the measurements allow

**Bottom line.** This turn adds a new exact codec module, `src/lib/omega/diaphora.ts` (DIAPHORA, column-difference coding of long integers). It is byte-exact on every lane and on the red team. It gives **zero gain on all 28 measured lanes**, because of o200k token economics (section 4). So the success predicate for X15 is **not met**. Nothing in this report claims a general gain.

The gains that do exist are the same ones reported in X14: HEMERA beats the frontier on AAPL (−238), VIX (−170), and openstack (−21). These are dated-timestamp lanes, so the gain is niche. The frontier re-run below confirms those numbers in this turn.

## 0. Runtime honesty (what was actually used)

- Tools: `bash` (Linux, Node 22.22.3, Python 3 without tiktoken), `npm ci` from the lockfile (installed `node_modules`, which was absent in this checkout), `esbuild` (bundles TypeScript runners), `tsc --noEmit`, the repo's own o200k counter (`countTokens` in `src/lib/omega/bpe.ts`, via `gpt-tokenizer`), `web_search` and `fetch_page` (live, see section 8).
- Parallelism: two background node processes on a 2-core machine (frontier re-run halves). No independent agents were used.
- Not available or not run: an LLM for decoding (none is reachable from this sandbox), Lean/compiler checks of the OpenAI math results, ollama, Jellyfin, any database, any GitHub API call (the session is closed; see section 9).
- Not claimed: any proof of optimality, any LLM decode result, any result on a corpus not listed in section 3.

## 1. Repository state (read this first)

- This checkout was re-created from the remote. The branch `arena/95aaefc1-kompkernel` points at `7c7da87`. My X13 and X14 commits (`b9316e0`, `ebf3bb3`) are **not** in this clone's object store. The merged PR #30 (`47bbca9`) does not contain the HORA or HEMERA sources.
- All X1–X14 work (HORA, HEMERA, the bench folders `z50`–`z59`, `docs/`, many `src/lib/omega/*.ts`) was untracked at the start of this turn. It is now committed in `7770ddf` (section 9). Nothing was discarded.
- This turn: committed the X1–X14 sources (`7770ddf`) and the X15 files (`08166e4`) on top of the branch (section 9). `tsconfig.tsbuildinfo`, `src/lib/omega/kladios.ts`, `bench/z55/kladios-*`, and `bench/z58/hora-*` remain uncommitted.
- `bench/tmp/run.sh` (used in X14) is missing from this checkout. Its replacement is `bench/x15/run.sh`, which bundles one TypeScript entry with esbuild (tsconfig paths) and runs it under `OMEGA_DET=1`. The frontier receipts were produced with the working-tree registry, so they reproduce only with that registry (which includes HORA and HEMERA).

## 2. Frontier re-run (confirmed this turn, not from receipts)

Keys (registry): DENS-2 = `dendrons`; DENDRON = `dendron`; DAEDALUS = `daedalus`; DAEDALUS-D = `daedalus-dual`; A10 = `phalanx-a10`; AKOLOUTHIA-2 = `akolouthia2`; HORA = `hora`; HEMERA = `hemera`.

Naming note: the X13 request wrote "PARADEIGMA+DAEDALUS-D (A10)". In this registry, "A10" is `phalanx-a10` (PHALANX-A10). PARADEIGMA is JSON-only and was measured on a 6-lane subset in an earlier turn with no gain. I measured `phalanx-a10` as A10 and did not measure a PARADEIGMA+DAEDALUS-D combination.

Method: `bench/z52/frontier-min.ts` calls each registry entry's own `run()` and checks exactness. Each (lane, codec) pair ran as its own process under `OMEGA_DET=1` with a 420-second cap (`bench/x15/frontier-keyed.sh`). Receipts are in `bench/x15/receipts/`. Two pairs hit the cap and are recorded as `TIMEOUT_OR_ERROR` (shown as TIMEOUT in the tables): A10 on `ops-git-log-stat.txt` and on `sp500-200.csv`.

Restatement:
- A10 (`phalanx-a10`) is **not** a frontier leader on any lane. It is the minimum only as a tie on `git-log-fuller.txt` (143, every codec ties). Earlier docs listed it as a frontier codec; the measurements here show it is not one.
- The frontier leader on the 28 lanes is DENS-2 (`dendrons`) on 15 lanes, AKOLOUTHIA-2 on 7 lanes, and DAEDALUS-D on 6 lanes. Ties are labelled by the first minimal key in the order DENS-2, DENDRON, DAEDALUS, DAEDALUS-D, A10, AKOLOUTHIA-2, so a label on a tie says nothing about which codec is better.
- The receipts used before this turn agree with these numbers on every lane that was in them (for example `git-numstat` DENS-2 = 1904, `bibliography` DAEDALUS-D = 709, `psql` AKOLOUTHIA-2 = 355).

Full per-lane table (o200k one-chat M, contract included; `bench/x15/receipts/leaders-x15.tsv`):

| lane | category | DAEDALUS | frontier min (leader) | DENS-2 | DENDRON | DAED-D | A10 | AKOLO-2 | HORA | HEMERA | HEMERA−frontier | DIAPHORA |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| de-kb.txt | prose | 495 | 492 (daedalus-dual) | 495 | 495 | 492 | 505 | 495 | 495 | 495 | 3 | 495 |
| chart.svg | ops-table | 465 | 330 (akolouthia2) | 465 | 465 | 465 | 539 | 330 | 465 | 465 | 135 | 465 |
| dump.sql | markup-sql | 728 | 703 (akolouthia2) | 728 | 728 | 725 | 876 | 703 | 728 | 728 | 25 | 728 |
| find-listing.txt | ops-listing | 1326 | 1318 (dendrons) | 1318 | 1326 | 1342 | 1415 | 1326 | 1326 | 1326 | 8 | 1326 |
| git-log-fuller.txt | ops-listing | 143 | 143 (tie) | 143 | 143 | 143 | 143 | 143 | 143 | 143 | 0 | 143 |
| git-numstat.txt | ops-listing | 2036 | 1904 (dendrons) | 1904 | 2036 | 2036 | 2214 | 2036 | 2036 | 2036 | 132 | 2036 |
| ls-full-iso.txt | ops-listing | 407 | 405 (daedalus-dual) | 407 | 407 | 405 | 521 | 407 | 407 | 407 | 2 | 407 |
| node-stacktraces.txt | ops-listing | 339 | 339 (dendrons) | 339 | 339 | 342 | 410 | 339 | 339 | 339 | 0 | 339 |
| openstack-loghub-26.log | ops-log | 1008 | 1008 (dendrons) | 1008 | 1008 | 1053 | 1247 | 1008 | 987 | 987 | **−21** | 1008 |
| aapl-2014.csv | temporal-table | 1490 | 1490 (dendrons) | 1490 | 1490 | 1588 | 1766 | 1490 | 1490 | 1252 | **−238** | 1490 |
| vix-daily-1990.csv | temporal-table | 1394 | 1369 (akolouthia2) | 1394 | 1394 | 1390 | 1589 | 1369 | 1394 | 1199 | **−170** | 1394 |
| df-h.txt | ops-table | 281 | 171 (akolouthia2) | 281 | 281 | 279 | 414 | 171 | 281 | 281 | 110 | 281 |
| kubectl-get-pods.txt | ops-table | 386 | 326 (akolouthia2) | 386 | 386 | 390 | 547 | 326 | 386 | 386 | 60 | 386 |
| psql-output.txt | ops-table | 397 | 355 (akolouthia2) | 397 | 397 | 397 | 437 | 355 | 397 | 391 | 36 | 397 |
| bibliography.txt | prose | 711 | 709 (daedalus-dual) | 711 | 711 | 709 | 896 | 709 | 711 | 711 | 2 | 711 |
| email-thread.txt | prose | 525 | 525 (dendrons) | 525 | 525 | 530 | 629 | 525 | 525 | 525 | 0 | 525 |
| kb-article.txt | prose | 651 | 650 (daedalus-dual) | 651 | 651 | 650 | 656 | 651 | 651 | 651 | 1 | 651 |
| llm-answer.md | prose | 707 | 706 (daedalus-dual) | 707 | 707 | 706 | 733 | 707 | 707 | 707 | 1 | 707 |
| meeting-transcript.txt | prose | 420 | 420 (dendrons) | 420 | 420 | 420 | 472 | 420 | 420 | 420 | 0 | 420 |
| readme.txt | prose | 688 | 688 (dendrons) | 688 | 688 | 688 | 719 | 688 | 688 | 688 | 0 | 688 |
| csv-8.csv | temporal-table | 1695 | 1695 (dendrons) | 1695 | 1695 | 1709 | 1880 | 1695 | 1695 | 1695 | 0 | 1695 |
| ops-git-log-stat.txt | ops-listing | 3463 | 3458 (dendrons) | 3458 | 3463 | 3493 | TIMEOUT | 3463 | 3463 | 3463 | 5 | 3463 |
| git-log-iso.txt | ops-listing | 1531 | 1530 (daedalus-dual) | 1531 | 1531 | 1530 | 1653 | 1531 | 1531 | 1531 | 1 | 1531 |
| spring-framework trace | source-trace | 963 | 963 (dendrons) | 963 | 963 | 976 | 1264 | 963 | 963 | 963 | 0 | 963 |
| svenstaro_miniserve.md | source-changelog | 3030 | 2989 (akolouthia2) | 3030 | 3030 | 3052 | 3555 | 2989 | 3030 | 3030 | 41 | 3030 |
| sp500-200.csv | temporal-table | 4262 | 4262 (dendrons) | 4262 | 4262 | 4352 | TIMEOUT | 4262 | 4262 | 4262 | 0 | 4262 |
| ops-ls-l-bin.txt | ops-listing | 247 | 247 (dendrons) | 247 | 247 | 248 | 304 | 247 | 247 | 247 | 0 | 247 |
| ops-ls-l-omega.txt | ops-listing | 971 | 954 (dendrons) | 954 | 971 | 965 | 1168 | 971 | 971 | 971 | 17 | 971 |

Reading the table as a general leader list (section 2b) is in `bench/x15/receipts/leaders-x15.json`. "frontier min" uses only the six frontier keys (DENS-2, DENDRON, DAEDALUS, DAEDALUS-D, A10, AKOLOUTHIA-2). HORA and HEMERA are shown separately.

### 2b. Local leaders, by structure category (from the table above)

- **Prose** (readme, de-kb, kb-article, llm-answer, bibliography, email-thread, meeting-transcript): frontier ≈ identity. The best frontier codec is at most 3 tokens below DAEDALUS on any prose lane (de-kb 492 vs 495; bibliography 709 vs 711). HEMERA is identity on all prose.
- **Ops tables** (df-h, psql, kubectl, chart.svg): AKOLOUTHIA-2 leads by 42–135 tokens against DAEDALUS (psql 355 vs 397; kubectl 326 vs 386; df-h 171 vs 281; chart.svg 330 vs 465). Its gain comes from progressions such as `vol0`…`vol3` and `p0`…`p3` in df-h. HEMERA wins only on psql, by 6 against identity.
- **Ops listings and logs** (find, ls, git numstat, git log, stack traces, openstack): DENS-2 leads on listings (brace-tree paths, numstat). openstack is the only ops log where a delta codec wins (HEMERA ms arm, −21).
- **Temporal tables** (AAPL, VIX, csv-8, sp500): HEMERA wins on the dated columns (AAPL −238, VIX −170). csv-8 and sp500 have no dated delta and fall back to identity.
- **Markup SQL** (dump.sql): AKOLOUTHIA-2 leads (703 vs 728).
- **Source changelogs and traces**: AKOLOUTHIA-2 leads on miniserve (2989 vs 3030); the trace ties.

## 3. Corpus and sizes

The 28 lanes are the union of `bench/x15/lanes-all.txt` (the 25-lane list from X14 plus three lanes that had frontier receipts). Raw sizes range from 368 bytes (`git-log-fuller`) to 21 KB (`ops-git-log-stat`, `svenstaro_miniserve`). Dominant content is English prose, ops listings, and dated tables. No lane was built for this turn. The synthetic input in the DIAPHORA red team (`many-runs`) is a test, not a lane, and is not used in any claim.

## 4. DIAPHORA (X15 codec, `src/lib/omega/diaphora.ts`)

**Mechanism.** A digit run of at least 4 digits, canonical (no leading zero), at position N (1-based, among the line's digit runs), is written `∆d` with d = C − P, where P is the N-th digit run of the original line above. The reader adds d to the decoded line above. The encoder keeps the substituted form only if its one-chat M is strictly below identity (gates G0–G4, as in HEMERA). Contract: one sentence in band.

**Why it does not pay here (measured, not argued).** `bench/x15/receipts/diaphora-token-economics.jsonl` (o200k, repo counter):
- A raw run of 4–6 digits costs 2 tokens. A mark `∆d` with d of up to 3 digits costs 2 tokens. No gain.
- A raw run of 7–9 digits costs 3 tokens. A mark with a non-negative delta of up to 3 digits costs 2 tokens. Gain: one token per number.
- A negative delta costs 3 tokens (the minus sign adds one), so it never pays for raw runs of 9 digits or fewer.
- `∆` on its own costs 1 token, so a bare zero-delta mark would save one token on 4+ digit repeats. That variant is not implemented; it would also need an extra rule so a bare mark is not read as a sign.

**Measured.** 28 lanes (`bench/x15/receipts/diaphora-v1.jsonl`): every lane returned the identity arm, so the gain is zero on all of them. Exactness holds (the identity arm is exact by construction).

**Red team.** `bench/x15/diaphora-redteam.ts`, output in `diaphora-redteam.out`: 26/26 pass. Cases include empty input, no digits, leading zeros, count-changing lines, column shifts, CRLF, blank lines, no trailing newline, the marker in input (refused), a minus or dot after a mark, zero delta, 15- and 18-digit numbers, and two reader refusals (a mark with no line above, and a mark that leaves a non-negative value). One case (`many-runs`) is a synthetic arithmetic table used to exercise the substitution path; it is an exactness test only.

**Repair during this turn.** The first lane run crashed with `Cannot convert null to a BigInt`: `prev && prev[i]` returns `null` for the first line, and the `undefined` check let it through. Fixed in both encoder and reader (`prev ? prev[i] : undefined`). All gates were re-run after the fix. The red team covers the first-line case directly (`first-line-only`, `no-digits`).

**Why it is not registered.** It never beats identity on the measured lanes, so adding it to the registry would only add an entry that never wins. It is kept as a documented, unregistered negative (the same status as ANAPHORA-FOLD). Its docs entry is in `docs/codec-abbreviations.md`.

## 5. The language-tier idea (user's first test)

- X13 measured it end to end (`bench/z58/alias-test.ts`, receipts `bench/z58/receipts/alias-test.jsonl`): words of 2+ o200k tokens are replaced by single-token aliases from other languages, listed in the contract, and DAEDALUS runs on the result.
- Results (contract included): de-kb 491 vs 495 identity (−4, the best lane); kb-article 661 vs 651 (+10); readme 694 vs 688 (+6); llm-answer 717 vs 707 (+10); bibliography 721 vs 711 (+10); email-thread 538 vs 525 (+13); meeting-transcript 437 vs 420 (+17).
- Verdict: **negative for general use**. The table entries cost more than the words they save, except on one lane by 4 tokens.
- The second tier (numerals): a numeral costs one token, the same as a foreign-word alias. The pool of single-token candidates (114) was not exhausted on these lanes, so a second tier has no cheaper entries. Not measured in X15.

## 6. Negative space (result shapes that look like solutions and fail the contract)

Each shape fails for the reason given. Items marked "measured" have a receipt in this repo.

1. Digit-delta marks on 4–6 digit numbers (DIAPHORA). Mark costs as much as the number. Measured.
2. Digit-delta marks on 7–9 digit numbers with negative deltas. Mark costs 3 tokens; the number costs 3. Measured.
3. Foreign-word single-token aliases with an in-band table (language tier). Table cost exceeds saving. Measured (X13).
4. Second-tier numerals as aliases. Same token cost as tier 1, no candidates left. Argued, not measured.
5. Frequency-ordered integer IDs (renumbering BPE tokens by frequency, as in arXiv 2602.22958). An ID costs one or more tokens, and the table costs more. Argued from the same token economics; not measured.
6. Lossy prompt compression (drop tokens, let the model restore them, as in LLMLingua, arXiv 2310.05736). Not byte-exact. Fails the contract outright.
7. LLM arithmetic coding (LLMZip, arXiv 2306.04050; Delétang et al., arXiv 2309.10668). Decoding requires the same model and its probabilities bit-for-bit; not one-chat readable; not verifiable in this sandbox. Fails the contract.
8. Shortest common superstring arrangements (openai/math result 128). An arrangement needs overlap offsets, which a one-chat reader would need to be given in full. Argued.
9. TOON tabular serialization. 1.8–2.7× identity on the three CSV lanes. Measured (X14).
10. Anaphora-style line field folds (ANAPHORA-FOLD). G3 rejects every fold: DAEDALUS already glyphs the repeated heads. Measured (X12).
11. Keyed addressing for progressions (ONOMASIA). Loses to AKOLOUTHIA-2 on the ops lanes. Measured (X11).
12. Contract wording changes (LAKONIKOS, contract-language lever). −3 tokens at best; below the bar. Measured (X9).
13. Calendar deltas with |d| > 31 days (HEMERA's DAY_MAX). These fall back to literal dates. No gain on those dates by design.
14. Delta codecs on random-valued columns (AAPL price digits). The deltas are as long as the values. Measured on AAPL (DIAPHORA: identity).
15. A10 as a frontier leader. It is the minimum only on a tie (`git-log-fuller`). Measured.
16. Marker reuse: putting `※` or `∆` in the input. The encoder refuses and falls back to identity. Shape that looks like a solution but is a refusal (red team, `marker-in-input`).
17. Suffix-only date deltas on a single-state reader (HEMERA v1). Date-only tokens reset the time state, so openstack got 0 ms marks. Fixed in X14 (two states). Kept here as the modal-shortcut failure (section 7).

## 7. The modal shortcut (explanation and test)

**The shortcut.** "The reference for a delta is the most recent date-like token." It looks right for dated data, and it is what a single shared state implements.

**Why it fails.** Logs often carry a second date in every line: a file name such as `2017-05-16_13:53:08` in openstack. That date is a valid date, but it has no time part in the sense the ms arm needs, and under a single state it clears the previous full timestamp. Result: the ms arm sees no previous timestamp on the next line and produces 0 marks, while HORA produces 25 on the same text.

**The test that detects it.** `bench/z59/debug-ms.ts` (kept as the probe): HORA marks = 25, HEMERA ms marks must be 25 and its intermediate text must equal HORA's. After the two-state repair, it passes (`hemeraMs: 25`, `sameText: true`, `M: 987`). Against the single-state version, it fails with 0 marks. Patch attacks in `bench/z59/hemera-redteam.ts` (`patch-filename-date-between`, `patch-day-then-ms`, `patch-ms-after-date-only`) check exactness of the same input shapes.

**Limit.** The test is a lane-level check. The red team checks exactness, not marks, so it would not by itself catch the regression. The mark-count check is what detects it.

## 8. Live literature (new terms, new sites; dates are from the sources)

Searches run this turn (not previously cited in this repo's docs):
- LLMZip: lossless text compression with an LLM and arithmetic coding. Valmeekam et al., arXiv 2306.04050 (June 2023). LLaMA-7B, 0.7101 bits/char on text8 (their reported number). [1] emergentmind.com/papers/2306.04050 and [2] semanticscholar.org (arXiv record). Note: LLM-based coding needs the same model on both ends; not byte-exact checkable here.
- Language Modeling Is Compression: Delétang et al., arXiv 2309.10668 (Sept 2023). Arithmetic coding with Chinchilla 70B, compression ratios on ImageNet patches (43.4%) and LibriSpeech (16.4%). [3] ar5iv.labs.arxiv.org/html/2309.10668; [4] huggingface.co/papers/2309.10668.
- LLMLingua: compressing prompts with a small LM, EMNLP 2023 (arXiv 2310.05736). Lossy token removal; up to 20× prompt compression with small loss in task accuracy. [5] arxiv.org/html/2310.05736v2; [6] microsoft.com research blog (EMNLP 2023 venue).
- Tensor networks for probabilistic sequence modeling: Miller and Boots, PMLR v130 (2021; arXiv preprint 2020 "Quantum Tensor Networks, Stochastic Processes, and Weighted Automata"). Uniform matrix product states as sequence models. [7] proceedings.mlr.press/v130/miller21a; [8] researchgate.net (arXiv record, Oct 2020).
- Frequency-ordered tokenization for lossless text compression. arXiv 2602.22958 (Feb 2026). Renumbers BPE tokens by frequency, then a byte-level compressor. Not LLM-readable. [9] arxiv.org/html/2602.22958.
- Tokenizer design and compression rates: "Getting the most out of your tokenizer", arXiv 2402.01035 (2024). Compression measured as bytes per token. [10] arxiv.org/pdf/2402.01035.
- Bit-level BPE below the byte boundary, arXiv 2506.07541 (June 2025). Reduces byte-fallback tokens; no LLM-readable wire. [11] arxiv.org/html/2506.07541v1.
- Quantum-inspired tensor networks in ML (review), arXiv 2604.14287 (2026). [12] arxiv.org/pdf/2604.14287.

Quantum-adjacent, realistic status:
- Schumacher's quantum source coding (1995) and the Holevo bound (1973) limit how much classical information a quantum system carries. They concern quantum states, not classical text. They give no route to a byte-exact codec for text.
- Tensor networks (above) are quantum-inspired and run on classical hardware. They are a model class, not a codec. No byte-exact codec built from them has been measured here.
- Quantum annealing or QUBO formulations for choosing dictionary entries are plausible in principle. No quantum hardware is available here, and no classical-vs-quantum comparison was run. Status: not tested.

Relevant to the stack, not new: LLM-based and tokenizer-based compression are both established. The honest gap for this project is that these methods do not give a one-chat, LLM-readable, byte-exact wire, which is the constraint.

## 9. Preservation and commit

- Two local commits on `arena/95aaefc1-kompkernel`, no push, no PR (the session is closed; remote operations are not attempted):
  - `7770ddf`: restores the X9–X14 untracked sources and benches that `registry.ts` imports (HORA, HEMERA, DENS-2, DENDRON, GNOMON, AKOLOUTHIA-2, SYNARTESIS, ANAPHORA-FOLD, ONOMASIA, plus receipts). KLADOS and the `bench/z58/hora-*` probe scripts are left out.
  - `08166e4`: the X15 files (DIAPHORA, `bench/x15/`, `bench/z52/frontier-min.ts`, `docs/codec-abbreviations.md`).
- Still untracked on purpose: `tsconfig.tsbuildinfo`, `src/lib/omega/kladios.ts`, `bench/z55/kladios-*`, `bench/z58/hora-*`.
- The commits `b9316e0` (HORA) and `ebf3bb3` (HEMERA) from earlier turns are still absent from the clone; their files are restored by `7770ddf`, not by those commits. See section 1.

## 10. Files

- Codec: `src/lib/omega/diaphora.ts`.
- Runners: `bench/x15/run.sh` (esbuild bundle and run), `bench/x15/diaphora-lanes.ts`, `bench/x15/diaphora-redteam.ts`, `bench/x15/diaphora-economics.ts`, `bench/x15/frontier-keyed.sh`, `bench/x15/leaders-x15.py`, `bench/x15/diaphora-debug.ts` and `diaphora-debug2.ts` (probes).
- Receipts: `bench/x15/receipts/frontier-A.jsonl`, `frontier-B.jsonl` (first 11 lanes), `frontier-keyed-A.jsonl`, `frontier-keyed-B.jsonl` (remaining 17 lanes), `diaphora-v1.jsonl`, `diaphora-token-economics.jsonl`, `leaders-x15.json`, `leaders-x15.tsv`; `bench/x15/diaphora-redteam.out` (26/26).
- Docs: `docs/codec-abbreviations.md` (DIAPHORA entry added).

## 11. Verification status (what is verified, what is downgraded)

| Claim | Status | Evidence |
|---|---|---|
| DIAPHORA is byte-exact on all 28 lanes | Verified (identity arm is exact by construction; the diaphora arm never fired) | diaphora-v1.jsonl, `exact` true |
| DIAPHORA's red team | Verified: 26/26 | diaphora-redteam.out |
| DIAPHORA gains on any measured lane | **Refuted**: zero on all 28 | diaphora-v1.jsonl, token table |
| Frontier numbers in section 2 | Verified: re-measured this turn | frontier-*.jsonl |
| A10 is not a frontier leader (except a tie on one lane) | Verified on 28 lanes | leaders-x15.json |
| HEMERA beats the frontier on AAPL, VIX, openstack | Verified on these lanes; re-measured this turn | frontier-keyed rows |
| HEMERA's gain is general | **Downgraded**: niche (dated columns and one log) | table, section 2b |
| LLM-native decoding of any codec here | **Downgraded to unverified**: no LLM available | section 0 |
| OpenAI result 128 (superstring 2-approx) | Downgraded: the Lean scope document exists (`lean/docs/128.md`, links `Superstring.lean`); the Lean file was not built or run here | fetch of lean/docs/128.md |
| Literature items (section 8) | Verified as existing papers by search results; numbers are as reported by the papers, not reproduced | search results |
| Quantum ideas | Downgraded: no test run | section 8 |

## 12. OpenAI math manuscripts (honest coverage)

- Read, with abstracts: results 001–006 (`CONTENTS.md`, chunk 0), 126–135 (chunks 26–27). Result 128 read in full, with its Lean scope doc.
- None of the read results concerns compression, codecs, or a bound a codec could use directly. 128 is a string-set ordering result (section 6, item 8). 130 (exact Fourier transforms) and 131 (switch chains) are unrelated to text coding.
- Not reviewed: the other ~70 chunks (about 650 results). The request asked for a detailed review of each; I did not do that. The index lists 719 manuscripts in 372 families, with about 42% formalised in Lean (from the repo landing page, earlier turn).
- Lean: not built or run; a Lean scope document is not a checked proof.

## 13. Nine other AI-native ideas (and one that was tested first)

The language-tier idea was tested first (section 5). Nine further ideas, with honest status:

1. **Tokenizer-cost pricing of every substitution** (use the o200k count, not the character count, in the encoder's rule). Applied in DIAPHORA's gate (G3), and it explains the negative result. Measured.
2. **Digit-run arithmetic on monotone columns** (DIAPHORA with a non-negative delta and 7+ digit runs). The token table predicts one token saved per number, on monotone 7+ digit columns. No such column exists in the 28 lanes. Predicted, not measured on real data.
3. **Frequency-ordered IDs** (FOT-style renumbering, arXiv 2602.22958). Argued negative (section 6, item 5).
4. **LLM arithmetic coding** (LLMZip, Delétang et al.). Real and strong for bits, but fails the one-chat, byte-exact, no-tool contract. Rejected.
5. **Lossy prompt compression** (LLMLingua). Real, but lossy. Rejected by contract.
6. **Edit-script coding of near-duplicate prose paragraphs** (store one paragraph, then word-level edits against it). Not tested. It is the best candidate for hybrid prose, where ANAPHORA-FOLD (line folds) was negative. Next test: a hybrid-prose lane with repeated paragraphs.
7. **Model-as-legend** (let the reader's own tokenizer define the dictionary, so the legend is not sent). Not testable: no fixed reader tokenizer is shared across chat LLMs.
8. **Mixed-radix date and number packing** (pack several small numbers into one token by mixed radix). Argued negative under o200k: small numbers are already one token each.
9. **Tensor-network sequence models as predictors** (Miller and Boots). Real, but a model, not a byte-exact codec. Not tested.

Quantum-adjacent (section 8): Schumacher coding, Holevo bound, quantum-inspired tensor networks, QUBO-based dictionary selection. Only the classical tensor-network line has a usable model class, and none gives a one-chat codec.

## 14. A new way to evaluate prose compression (proposal, not measured)

Report, per lane, three numbers that separate what the codec removes from what the tokenizer already removes:
- the one-chat M (contract plus wire, o200k), as now;
- the contract tokens alone (the fixed cost);
- the marginal cost per substitution (M minus identity, divided by substitutions), which is the token-economics check that rejected DIAPHORA and the language tier in this repo.

Textbook basis: Shannon's source coding (an order-0 entropy floor over the input's o200k token sequence gives a lower bound for memoryless codes) and Kraft's inequality (contract cost is a prefix-free decoder cost). Not computed in this turn.

## 15. Formal model (short form)

- **Admissible objects.** Byte strings of any length, all lanes in section 3. Output: one chat message (contract plus wire), no system prompt, no skills file, no tools.
- **Access model.** The reader sees only the message. It may apply the contract's rules and the wire, nothing else.
- **Counted resource.** o200k_base tokens of contract plus wire (`countTokens`).
- **Success.** For a codec C, exact round trip on every input it accepts, and M_C < M_frontier by more than a few tokens on at least one lane, with general gains preferred.
- **Failure.** Any inexact round trip, any refusal path that loses to identity, or no lane with a gain beyond a few tokens.
- **Quantifier order.** For all lanes L: decode(encode_C(L)) = L; then there exists L: M_C(L) < M_frontier(L) − k, with k a few tokens (taken as 3).
- **Regime and tolerances.** Lanes of 0.4–21 KB; integer token counts; no tolerance on exactness; the gap threshold k = 3 tokens.
- **Adjacent problems not to be substituted.** (a) Minimal-token codes for an arbitrary model; (b) lossy prompt compression; (c) LLM-model compression with arithmetic coding; (d) bit-level or byte-level compression ratios (not one-chat).

## 16. Outcome space

- **H+ (achievable).** HEMERA: AAPL −238, VIX −170, openstack −21 (measured).
- **H− (impossible under the stated constraint class).** A general prose gain beyond identity from in-band substitution tables, under the o200k cost model. Supported by the language-tier measurement and by DAEDALUS ≈ identity on prose (table, section 2b). Scoped as H− for this class, not as a theorem.
- **H∂ (answer changes at a boundary).** Digit-delta coding changes sign at the token boundary: a delta pays only when the raw run is 7+ digits and the delta is non-negative and at most 3 digits (token table). HEMERA's day marks change at |d| = 31 (DAY_MAX). Contract-versus-savings is a boundary: the same contract can lose on one lane and win on another.

## 17. Mechanism portfolio (six or more, each reported)

For each: construction, artifact, proved portion, exact unresolved interface, cheapest falsification test, verdict (local or equivalent to the original problem).

1. **Column-difference of long integers (DIAPHORA).** Construction: section 4. Artifact: `diaphora.ts`. Proved: exactness by gates and red team. Interface: a lane with 7+ digit monotone columns; none measured. Falsification: run the 28 lanes (done; zero). Verdict: local; the gap is the token economics, which is structural for o200k.
2. **Calendar and millisecond deltas (HEMERA, HORA).** Artifact: `hemera.ts`, `hora.ts`. Proved: exactness, two-state reader. Interface: dated columns in general prose. Falsification: the openstack mark count (section 7). Verdict: local, conditional on dated data.
3. **Phrase dictionary (VERITAS family, DAEDALUS glyphs).** Existing. Proved: exactness. Interface: a dictionary cost model better than hill-climb. Falsification: a better search on the same lanes. Verdict: saturated on these lanes (receipts).
4. **Progression elision (AKOLOUTHIA-2).** Existing. Leads the ops tables (section 2b). Interface: progressions beyond constant step. Falsification: a delta codec that beats it on the ops tables (DIAPHORA does not). Verdict: local.
5. **Entailment from conventions (PARADEIGMA, GNOMON, SYNARTESIS).** Existing. Narrow to fixed-field records. Interface: non-record text. Verdict: local.
6. **Tokenizer-cost-priced substitution (language tier, alias tables).** Measured negative (section 5). Interface: a table cheaper than its saving. Falsification: the alias test. Verdict: equivalent to the contract-cost problem; no route found.
7. **Frequency renumbering (FOT-style).** Argued negative (section 6, item 5). Interface: ID cost in o200k. Falsification: measure a renumbered wire on one lane. Not run this turn.

## 18. Second-order adversary (for each candidate)

- **DIAPHORA.** Attacker: a column whose number count changes between rows (the position rule breaks). Tested in the red team (`count-change`, `column-shift`): exact, because the reader uses the same position rule. Attacker: a delta that is exactly the raw width (no gain). Measured: identity. Attacker: leading zeros (`leading-zero-raw`): excluded by the canonical check. Attacker: the marker in input (`marker-in-input`): refused.
- **HEMERA ms arm.** Attacker: date-only tokens (the modal shortcut, section 7). Tested by the openstack mark count.
- **Frontier claim (A10).** Attacker: a tie reported as a win. Checked: A10 is a minimum only on a tie.

## 19. Repair (DIAPHORA)

The null-BigInt crash is the first failure (section 4). Repair: the reference check uses `prev ? prev[i] : undefined`, in both encoder and reader. The repaired code re-runs all gates (G0–G4 on all 28 lanes, the red team, and tsc). New attack aimed at the patch: the first-line cases (`first-line-only`, `no-digits`), which pass.

## 20. Stop decision

Success predicate: **not met**. No codec this turn beats the frontier on any lane. DIAPHORA is exact and measured, and is zero on every lane.

Strongest verified artifact this turn: HEMERA's three lanes (AAPL −238, VIX −170, openstack −21 against the frontier), re-measured in this turn, with the niche caveat.

Exact remaining gap: a general gain on prose and ops text beyond identity, and a real monotone 7+ digit lane to test DIAPHORA.

Next highest-information test:
1. A real lane with monotone 7+ digit counters (for example, a log of resource versions or epoch-nanosecond sequence numbers). Run `bench/x15/diaphora-lanes.ts` on it. This is the only test that can make DIAPHORA's predicted gain real or falsify it.
2. An edit-script codec on a hybrid-prose lane with repeated paragraphs (idea 6 in section 13).
3. An LLM decode test of the HEMERA and DIAPHORA contracts, if an LLM endpoint becomes available. Without it, LLM-native decoding stays unverified.
