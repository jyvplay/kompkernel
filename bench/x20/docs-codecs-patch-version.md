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

## Leaders by category (17 measured lanes, X12 re-run, `OMEGA_DET=1`)

Frontier-min here = min(DAEDALUS, DAEDALUS-D, A10, DENDRON, DENS-2, GRAMMA, AKOLOUTHIA-2). PARADEIGMA was not run in X12. Full table: `bench/z57/REPORT.md` §3, generated by `bench/z57/summarize.py` from `bench/z57/receipts/frontier-fl-part-*.jsonl`.

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
- No LLM was run on the wire in this session. `M` is a tokenizer count of the contract plus wire, not a model evaluation.
- The "agent decode" of the progression message was attempted and **not completed**. It is not claimed.
- Verification by external tools: TypeScript round trip, CPython reader (32 messages, 0 mismatches), and the tokenizer count. These are external to the encoder and do not use the model.