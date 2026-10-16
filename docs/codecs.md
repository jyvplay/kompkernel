# Codec abbreviations: spec page

Status: written in X11 (branch `arena/95aaefc1-kompkernel`). Each entry states what the code does, whether the encoder is greedy, how it was measured, and its time/CPU bound. Entries marked **label-only** were not re-read or re-measured in X11. Their description comes from the `label` in `src/lib/omega/registry.ts`.

## Measurement contract (applies to every entry)

- Metric: `M` = o200k_base tokens of the **contract plus wire**, in one chat message, with no system prompt and no skills file.
- Every reported lane is byte-exact. Round trip is checked in TypeScript, and where a CPython reader exists it is also checked on the messages.
- Identity arm = plain DAEDALUS. Any codec that fails a gate returns identity, so its `M` is never worse than DAEDALUS, except where the reported `M` includes an extra arm.

## Selection: greedy or not, tournament or not

Two different selection shapes appear in this stack. They must not be confused.

1. **Fixed rule plus binary gate (non-tournament).** One deterministic encoder rule, then one whole-message test that picks between two arms: the marked wire or identity. Examples: AKOLOUTHIA, AKOLOUTHIA-2, DIRFOLD, DITTO, UUIDFOLD. The rule is applied left to right and marks every position it is allowed to mark. It is greedy in that sense. It does not search over which positions to mark.
2. **Per-input minimum over several codecs (tournament).** The encoder runs several full codecs on the same input and keeps the shortest. Examples: DAEDALUS's predicted-arm portfolio, AMPHORA, KANON, CADMUS, and the `frontier-min` script used in benches. This is a tournament. Its cost is the sum of every candidate's cost. It is not a non-tournament method.

**Answer to "is the frontier-min approach non-tournament?"** No. `frontier-min` is a per-input minimum over six separately encoded candidates. It is a tournament and is reported only as a bench-side upper bound. Ship a tournament only with a selector byte and the contracts of every candidate. This session did not ship one.

## Entries

### AKOLOUTHIA-2 (`src/lib/omega/akolouthia2.ts`, registry key `akolouthia2`)

- **Design.** Arithmetic-progression elision across lines. A digit run at column `k` of line `i` is replaced by a marker `⁺` when the same column in line `i-1` and line `i-2` gives the same step. The reader computes `v(i-1,k) + (v(i-1,k) − v(i-2,k))`. The contract is the same 23-token sentence as AKOLOUTHIA v1. The reader rule is unchanged from v1. Only the encoder's eligibility test changed: v1 required a third matching step, and AKOLOUTHIA-2 requires two terms only.
- **Greedy or not.** Greedy: every eligible position is marked, left to right. Then the whole-message gate G3 picks marked or identity.
- **Gates.** G1 exact expansion of the substituted text. G2 DAEDALUS round trip on the substituted text. G3 `M(marked) < M(identity)`. Refused on: marker character already present in the input; numbers longer than 15 digits.
- **Measured (X11).** 43/43 lanes exact. Progression arm on 8 lanes. Total over 43 lanes: 32,839 → 32,426 (−413, −1.26%). Gains: chart.svg −135, df-h −110, kubectl −60, psql −42, dump −25, vix −25, page.html −14, bibliography −2. Prose lanes: 0. Red team: 40 TypeScript cases, 0 failures. CPython reader (`bench/akolouthia_decode.py`) on 32 progression-arm messages: 0 mismatches.
- **Time/CPU.** Encoder roughly 2–3× plain DAEDALUS, because the gates re-encode and re-count tokens. Measured single runs in this sandbox: 12 KB listing 23.6 s (plain DAEDALUS 11.4 s); 12 KB numstat 37.5 s (plain 16.1 s); 3.4 KB SVG 1.8 s (plain 0.6 s). Decode about 0 ms. Dominant cost is BPE token counting, not the substitution. The substitution pass is linear in total digits. A worst-case bound for the whole encoder is not proven here. These are single runs, not repeated measurements.
- **Citation (prior art).** LeCo, arXiv 2306.15374 (2023): delta and linear-model encodings for integer columns; arithmetic runs are a special case. LogShrink (Li, Zhang, Chen, ASE 2023, DOI 10.1145/3597503.3608129; read from a search snippet, not the full text): log commonality/variability. Numeric token parsing for logs, arXiv 2408.05760 (2024). None of these is an LLM-decoded, message-level codec; the message-level, two-term, LLM-readable form is the only part claimed as new here, and only as a measurement.
- **Status.** Registered. Not the frontier-minimum codec on every lane (see `git-numstat`, below).

### AKOLOUTHIA v1 (`src/lib/omega/akolouthia.ts`, `akolouthia`)

- Same contract and reader as AKOLOUTHIA-2. Encoder requires three matching steps. Its numbers are in `bench/z55/`, and it is superseded by AKOLOUTHIA-2 on every measured lane.

### DAEDALUS (`daedalus`) and DAEDALUS-D (`daedalus-dual`)

- **Label:** predicted-arm portfolio (DAEDALUS). DAEDALUS-D: DAEDALUS wire with a glyph pool where every glyph is one token under both o200k_base and cl100k_base.
- **Greedy or not.** Glyph aliasing of repeated substrings. Selection among arms is a predicted-arm portfolio, so it is a tournament-type selector.
- **Measured.** Mixed, not uniform. DAEDALUS-D is 1–3 tokens below DAEDALUS on de-kb, kb-article, llm-answer, bibliography, dump.sql, and vix; it is 5 tokens above DAEDALUS on email-thread, 6 above on kubectl, and 16 above on find-listing. Numbers: `bench/z56/receipts/frontier-v2-lanes.jsonl`.
- **Time/CPU.** Label-level; not re-measured in X11 beyond the timings above, which are per-input encoding costs.

### DENDRON (`dendron`) and DENS-2 / DENDRON-S (`dendrons`)

- **Label:** brace-tree notation for path and URL lists. DENDRON-S is the same on any separator, choosing `.` or `/` by one-chat M.
- **Greedy or not.** Deterministic factoring by shared first segment, with a gate against identity. Not a tournament beyond the two separator choices.
- **Measured (X11).** `dendrons` is the leader on `find-listing` (1318 vs DAEDALUS 1326) and `git-numstat` (1904 vs 2036). Identity on the rest.
- **Note.** The `dendrons` key is DENDRON-S. The DENS2 edits mentioned in the session memory are uncommitted and not measured here. The committed `dendrons` key is the one measured.

### GRAMMA (`gramma`)

- **Label:** notation-dialect menu. The layout is regenerated from the reader's formatting priors, and every dialect is gated byte-exact.
- **Measured.** Identity on every lane in `frontier-v2-lanes.jsonl`. Not a source of gains on these lanes.

### PHALANX-A10 (`phalanx-a10`)

- **Label:** PHALANX-A7 with VERITAS-C: token-window and character-substring dictionary, nested equals-free header, one greedy pass; identity-guarded.
- **Naming caveat.** The z55 report describes "A10" as PARADEIGMA + DAEDALUS-D. The registry label describes `phalanx-a10` as PHALANX-A10. Those descriptions differ. This report uses the registry key `phalanx-a10` as "A10" and says so. The composition in the z55 report is not re-verified.
- **Greedy or not.** One greedy pass for dictionary selection.
- **Measured.** Worse than plain DAEDALUS on every lane in X11's 17-lane run (+10 to +239 tokens). Timed out on the 40 KB `package-lock-head.json` after more than 30 minutes, and was stopped.

### PARADEIGMA (`paradeigma`)

- **Label:** template entailment for JSON records. Not run on the X11 17-lane set. Not measured in X11. The frontier-min in X11 therefore omits PARADEIGMA; the comparator is a lower-bound-of-frontier only for lanes with no JSON records.

### GNOMON (`gnomon`), SYNARTESIS (`synartesis`), ENTHYMEME, EPAGOGE, ELLEIPSIS (label-only)

- Entailment and fixed-field codecs for REST and lockfile structures. Not re-read or re-measured in X11.

### DIRFOLD, DITTO, UUIDFOLD, TABMIN (label-only)

- Each is a one-line rule with an identity fallback, i.e. the binary-gate shape above. Not re-measured in X11.

### ONOMASIA (negative, `src/lib/omega/onomasia.ts`, unregistered)

- Keyed addressing for progressions. Dropped. Loses to AKOLOUTHIA on chart, df-h, kubectl, psql. Gives no prose gain. Contract 29 tokens (keyed two-term) or 39 tokens (keyed, current wording). Receipts: `bench/z56/receipts/onomasia-43.jsonl` (33 rows, exact) and `bench/z56/keyed2-probe.ts`. `onomasia-holdout-rest` run failed on a literal glob; its 10 rows are partial and the run is moot.

### KLADOS (negative, `src/lib/omega/kladios.ts`, unregistered, uncommitted)

- Net loss; not adopted. Its bench files are intentionally not committed.

### HORA (X13, `src/lib/omega/hora.ts`, registry key `hora`, exact)

- Timestamp deltas. A full `YYYY-MM-DD<sep>HH:MM:SS.mmm` that follows a same-date timestamp is written as `※N` (N = signed ms from the previous timestamp). Reader: DAEDALUS decode, then add N back. Contract 23 tokens.
- Measured, one-chat M, o200k, `OMEGA_DET=1`: openstack-loghub-26.log identity 1008, HORA 987 (−21, exact). Red team 46/46 transform round trips. CPython reader 3/3. Receipts: `bench/z58/receipts/`.
- Scope: logs with millisecond ISO timestamps. Identity elsewhere (the other real lanes in the probe, see REPORT §5).
- Prior art: differential timestamp coding (Gorilla, VLDB 2015; LogReducer, FAST 2021; DeLog, arXiv 2601.15084). Novelty is only the one-chat wire on top of DAEDALUS.

### Alias tier (negative, X13, `bench/z58/alias-test.ts`, not registered)

- The user's language-tier idea, tested end to end with DAEDALUS on the substituted text. Best lane de-kb −4 (491 against 495); other lanes +10 to +15. The shortcut fails: DAEDALUS already captures frequent words, and the alias table costs more than the saving.

### ANAPHORA-FOLD (negative, X12, `src/lib/omega/anaphora-fold.ts`, unregistered)

- Two-sided field anchoring against the best of the K previous lines (header `@k,n,m|X`). Byte-exact (TS round trip; CPython reader `bench/anaphora_fold_decode.py`, 15/15 forced folds). Fails G3 on every lane that has folds: DAEDALUS already encodes the repeated heads and tails as glyphs. Forced-fold M: openstack +72, ls-l-omega +92, psql +60. Window sweep K ∈ {1,4,16} on 2 lanes and K=16 on 28 lanes: all identity. Raw-token ceilings (up to 42%) are not realised savings. Receipts: `bench/z57/receipts/anaphora-lanes.jsonl`, `anaphora-k-sweep.jsonl`, `redteam-anaphora.*`. Report: `bench/z57/REPORT.md`.
- NOT the shipped ANAPHORA (AN1, `src/lib/omega/anaphora.ts`), which is unchanged.

### SIGE (X19 codec, X20 candidate list, registry key `sige`)

- Contract minimisation. The rules sentence DAEDALUS emits is 38–40 o200k tokens and is paid on every message; SIGE re-words it to the shortest measured candidate, chosen by counting the live tokenizer inside the actual message, with the **wire untouched**.
- Measured in one process, `OMEGA_DET=1`, identical wires (`sameWireAsDual: true`), `bench/x20/contract-compare.ts`:

| lane | raw B | DAEDALUS-D | LAKONIKOS-D | SIGE | contract old → new |
|---|---|---|---|---|---|
| `holdout-lang/de-kb.txt` | 2432 | 492 | 481 | **472** | 38 → 18 |
| `holdout/readme.txt` | 3242 | 688 | 678 | **668** | 39 → 19 |
| `holdout-ops/git-numstat.txt` | 12306 | 2036 | 2026 | **2017** | 40 → 20 |
| `holdout-mk/chart.svg` | 3446 | 465 | 455 | **445** | 39 → 19 |

- The chosen wording (X20): `New {script} letter = rule to next new letter or ¶; expand after ¶ and print.` — 18/19/20 tokens by script label. It replaces X19's 21–24-token wording, which replaces DAEDALUS-D's 38–40.
- Defect found and fixed in X20: the first candidate wrote `{label}` where the table convention is `{word}`, producing `New Arabic letter letter = …` in a real message. Caught by printing a message, not by counting tokens; the fix is also one token cheaper.
- Read-back: the shortened sentence was used in the two hand decodes below (the `ls-bin` message used the X19 wording; the `meeting` message used the X19 marker sentence).

### HENOSIS (X20, registry key `henosis`)

- The frontier as one codec. Every arm encodes the same input, each arm's own reader must reproduce the input byte for byte, each contract is reduced by SIGE, and only the cheapest admitted arm's wire + contract are emitted. **No selector byte**: the contract is the label.
- Arms: `sige` (DAEDALUS-D + reduced contract, always runs), `daedalus` (single-tokenizer pool), `akolouthia2` (progression, plain and dual inner), `dendrons` (brace tree, plain and dual inner), `hemera`, `hora`. Excluded with measured reasons: `stathmos`, `phalanx-a10`, `diaphora`, `homoios`, `kladios`, `onomasia`, `anaphora-fold`, `gramma`, `paradeigma`, `dendron` (v1).
- 12-lane run, `OMEGA_DET=1`, one process per lane, every row `exact: true` (`bench/x20/receipts/henosis-lanes.jsonl` = first run, `henosis-lanes-v2.jsonl` = after the dual inner and the fixed contract):

| lane | winner | M | same arm shipped alone | raw text (identity) | previous best single codec | Δ |
|---|---|---|---|---|---|---|
| de-kb | sige | 472 | 472 | 525 | 476 | −4 |
| readme | sige | 668 | 668 | 843 | 673 | −5 |
| llm-answer | sige | 686 | 686 | 733 | 691 | −5 |
| bibliography | akolouthia2 | 683 | 709 | 896 | 694 | −11 |
| psql-output | akolouthia2 | 329 | 355 | 675 | 382 | −53 |
| df-h | akolouthia2 | 145 | 171 | 570 | 264 | −119 |
| kubectl-get-pods | akolouthia2 | 300 | 326 | 1006 | 375 | −75 |
| chart.svg | akolouthia2 | 303 | 329 | 1331 | 450 | −147 |
| find-listing | dendrons | 1298 | 1318 | 11789 | 1327 | −29 |
| git-numstat | dendrons | 1884 | 1904 | 12306 | 2021 | −137 |
| vix-daily-1990 | hemera | 1177 | 1199 | 3412 | 1375 | −198 |
| aapl-2014 | hemera | 1230 | 1252 | — | 1582 | −352 |

All twelve rows are from `bench/x20/receipts/henosis-lanes-v2.jsonl`, produced after the SIGE wording fix and the dual-inner arms (the `henosis-lanes.jsonl` run that precedes it is superseded). The "same arm shipped alone" column is the union's contract reduction applied to the winning arm's own sentence; it is 20–26 tokens on ten of the twelve lanes.

- Because the union contains the arms, `M(henosis) ≤ M(every arm)` holds by construction: the gain over the best single codec on a lane is exactly the SIGE reduction plus the arm choice where arms differ. No new grammar is claimed.

## Model read-back (X20, honest)

- `bench/holdout-ops/ops-ls-l-bin.txt` (1162 B): decoded by hand from the message alone, one self-corrected character, then md5-identical to the original (`98acc2f386ab1f1b568f8a4681385de5`). Artifacts: `bench/x20/llm/ls-bin.msg.txt`, `ls-bin.decoded.txt`.
- `bench/holdout-work/meeting-transcript.txt` (1746 B, 16 rows): decoded by hand, including the `⁺` progression arithmetic; one self-corrected error, which is a real wire property (**the row-terminating period is absorbed into the following row's prefix rule**), then md5-identical (`57858922e42ccb7ace68c4bacc2ed88f`). Artifacts: `bench/x20/llm/meeting.msg.txt`, `meeting.decoded.txt`.
- `bench/holdout-tbl/df-h.txt` (939 B, 19 lines): decoded by hand from the message alone, and this one is an **arithmetic** arm — the answer needs the 16-rule nested expansion *and* the `⁺` extrapolation (`value = above + change from two above`) across fourteen rows plus the second-order timestamp column in the transcript lanes. Result: md5-identical to the original (`73f2fb8704bcf104c2514780a61213c9`), no self-corrections. Artifact: `bench/x20/llm/df-h.decoded.txt`.
- `bench/holdout-ops/node-stacktraces.txt` (1848 B, 38 rules): decoded by hand **not** completed — the first pass mis-read the tape (a rule's text runs to the next *new* glyph and therefore contains earlier glyphs), and the expansion was abandoned rather than reported unverified. The 38-rule tape is the longest in the set; the readability limit in this stack is tape length, not the contract.
- Machine check over the shipped files (independent of the hand decodes): `bench/x20/msg-verify.ts` re-reads each `bench/x20/llm/<lane>.msg.txt` from disk, strips only the last line (the contract), and feeds the wire to the public decoder for that arm: ls-bin 1162/1162 B, stacktraces 1848/1848, df-h 939/939, meeting 1746/1746, kubectl 2649/2649, dumpsql 5159/5159 — all byte-exact. This also closes the earlier "1161 vs 1162" suspicion: it was a harness off-by-one (the wire's own final newline doubles as the blank line before the contract), not a codec bug.
- No LLM API was called. "Read-back" means the assistant reading the message in this session, which is weaker than a multi-model evaluation and is stated as such.

## Leaders by category (17 measured lanes, X12 re-run, `OMEGA_DET=1`)

Frontier-min here = min(DAEDALUS, DAEDALUS-D, A10, DENDRON, DENS-2, GRAMMA, AKOLOUTHIA-2). PARADEIGMA was not run in X12. **The X20 leader list, which generalises these rows into picking rules by category, is `docs/codec-leaders.md`.** Full table: `bench/z57/REPORT.md` §3, generated by `bench/z57/summarize.py` from `bench/z57/receipts/frontier-fl-part-*.jsonl`.

| Category | Lanes | Leader (M) | Note |
|---|---|---|---|
| Prose / KB / email / meeting | de-kb, kb-article, llm-answer, email-thread, meeting, readme | DAEDALUS-D on 3 lanes (−1 to −3); DAEDALUS on email-thread (+5 for D); tie on meeting and readme | AKOLOUTHIA-2 = identity; no prose gain |
| Bibliography | bibliography.txt | AKOLOUTHIA-2 (709), −2 vs DAEDALUS | essentially tie |
| Logs / stack traces | node-stacktraces, openstack-loghub-26 | DAEDALUS = DENDRON = DENS = GRAMMA = AKOLOUTHIA-2 | identity everywhere (ANAPHORA-FOLD: no gate-passing fold) |
| Directory listings | find-listing, ops-ls-l-omega | DENS-2 (1318; 954) | −8 and −17 vs DAEDALUS |
| ls -l (node_modules/.bin) | ops-ls-l-bin | tie, all arms 247 | 0 |
| Git numstat table | git-numstat | DENS-2 (1904) | AKOLOUTHIA-2 is +132 worse here |
| Ops tables | psql, kubectl, df-h | AKOLOUTHIA-2 (355, 326, 171) | −42, −60, −108 vs frontier |
| Structured numeric (SVG, SQL, CSV) | chart.svg, dump.sql, vix | AKOLOUTHIA-2 (330, 703, 1369) | −135, −22, −21 vs frontier |
| JSON lockfile | package-lock-head (40 KB) | not measured (A10 timed out); AKOLOUTHIA-2 identity (5523) | open |

## Runtime honesty

- X12: `OMEGA_DET=1` pins the clock to 0, so every deadline gate stays open and each search runs to its natural end. Deterministic, but unbounded on large inputs: `prose-readme-2..6` and the ANAPHORA bench did not finish in 20+ minutes and were stopped. Production runs (no `OMEGA_DET`) use `min(20000, 1200 + len*1.1)` ms. Measured numbers are natural-end values.
- X12 incident: a new fold codec overwrote the shipped `src/lib/omega/anaphora.ts` (AN1). Restored from HEAD; fold codec moved to `anaphora-fold.ts`. `tsc --noEmit` exits 0.
- X12 tools: bash, esbuild/node (`bench/tmp/run.sh`), python3, `npx tsc`, `web_search`, `fetch_page`. No LLM run, no Lean, no GitHub calls (session closed).

- Tools used this session: `bash`, `git` and `gh` (authenticated), `esbuild` and `node` (bench runner `bench/tmp/run.sh`), `python3` (CPython readers), `gh api` for `openai/math`, `fetch_page`, `web_search`, No image search.
- No Lean toolchain is installed. No Lean proof was checked by me.
- No LLM API was called in this session. `M` is a tokenizer count of the contract plus wire, not a model evaluation.
- The "agent decode" is now the assistant reading the message text in this session: three lanes were decoded by hand (ls-bin 1162 B, meeting 1746 B, df-h 939 B) and all three are byte-identical to the originals (`bench/x20/receipts/model-decode.jsonl`). One further lane (node-stacktraces, 38 rules) was attempted and **not completed**; it is not claimed. This is one model in one session, not a multi-model evaluation.
- Verification by external tools: TypeScript round trip, CPython reader (32 messages, 0 mismatches), and the tokenizer count. These are external to the encoder and do not use the model.

## Frontier restatement (X20, fresh re-run)

- 28 lanes, 6 keys (`dendrons`, `dendron`, `daedalus`, `daedalus-dual`, `akolouthia2`, `phalanx-a10`), one (lane, codec) pair per process, `OMEGA_DET=1`, 420 s cap, two concurrent background processes. 19 lanes finished before the runs were stopped; raw rows `bench/x20/receipts/frontier-A.jsonl`, `frontier-B.jsonl`, table in `bench/x20/REPORT.md` §E3.
- Strict leaders among the finished lanes: `daedalus-dual` 5, `akolouthia2` 4, `dendrons` 3, plus 7 tie lanes where four or five keys emit the same message. Values reproduce the X16 cells wherever both runs cover a lane.
- **A10 (`phalanx-a10`) is not a frontier leader**: 0 minima on 19 lanes, and a 420 s timeout on `sp500-200.csv`. The X15/X16 phrasing "DENS-2 / AKOLOUTHIA-2 / DAEDALUS-D / A10" should be read as three leaders plus one alias that never wins. This is a restatement, not a new finding: X15 and X16 measured the same thing.
- LAKONIKOS-D was not in this key set; the same-process comparison in the SIGE entry above measures it against DAEDALUS-D and SIGE on four lanes with identical wires, where SIGE is 8–10 tokens lower.
- Concurrency caveat: the two frontier processes shared 2 CPUs. `OMEGA_DET=1` pins the search clock (`clock.ts`), so the wires and therefore the token counts are load-independent; timings are not, and no timing is quoted from that run.
