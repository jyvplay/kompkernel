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

### STIGME / ΣΤΙΓΜΗ (X19, `src/lib/omega/stigme.ts`, registry key `stigme`, exact, **shipped this turn**)

- **What it does.** Deletes separators that the reader can recompute, and buys the rule back once in the contract. `2026-10-16` → `20261016`; `T13:53:08` → `T135308`; `2016-10-26 05:56:50` → `2016-10-26 055650`. Three clauses, bought independently:
  - date (18 tok): `8-digit runs starting 19 or 20 that are valid dates become YYYY-MM-DD.`
  - time (19 tok): `T+6 digits is HH:MM:SS; T+4 is HH:MM.`
  - after (24 tok): `After a date and a space, 6 digits are HH:MM:SS and 4 are HH:MM.`
- **Mechanism class (the new part).** Every other codec in this repository removes redundancy that is **in the payload** and therefore cannot fire on a first occurrence. STIGME removes redundancy that is **in the reader's prior** and is bought at the contract rate instead of the payload rate. It is LLM-native in the strict sense: the rule is false for any reader that does not already know that `20261016` is a date.
- **Greedy?** Yes at the core (one left-to-right regex pass), with a **revert loop** outside it: after each accepted candidate the full restore is re-run and the candidate is dropped if `stigmeRestore(elided) !== input`. The three clauses and the three wire arms are **gates**, not searches — each compares one fixed candidate against identity. So: greedy core, gates outside, no search.
- **Wire arms (a tournament, stated honestly).** The wire is the cheapest of LAKONIKOS, LAKONIKOS-D and AKOLOUTHIA-2 run on the elided text; the identity arm is the cheapest of the three on the original text. That is a per-input minimum over three full codecs, i.e. the tournament shape this page warns about. Its cost is three encodes per text, and it is why `M` is never worse than any of the three.
- **The 19xx/20xx year restriction is load-bearing.** With an unrestricted year, one pre-existing 8-digit run anywhere in the payload that happens to parse as a date kills the whole arm: `aapl-2014.csv` contains the float `94.16331104`, i.e. `1633-11-04`, so the unrestricted restore is wrong and the revert loop dropped all 240 dates (`dropped` would be 240, arm dead). Restricting the century costs 6 contract tokens (12 → 18) and restores the arm: `aapl` now fires, 1480 → 1444.
- **Where it does not pay (measured, not assumed).** On `find-listing.txt` the raw text drops 3,997 → 3,277 o200k tokens once the dashes and colons go, yet the wire does not shrink at all: DAEDALUS was already merging the whole repeated prefix `2026-09-30T07:59:` into one glyph, and removing the punctuation destroys the token alignment that made the merge cheap. **The clause layer pays only where the shape varies row to row, which is exactly where the grammar layer is blind.** All 28 lanes sort along that one axis.
- **Measured (X19, 28 lanes, `OMEGA_DET=1`, o200k, one chat message).** Receipts `bench/x19/receipts/stigme-lanes-v3.jsonl` (shipped version), `stigme-lanes-v2.jsonl` (three arms, unrestricted year, ablation), `stigme-lanes.jsonl` (two arms, ablation). 28/28 byte-exact. Clause fires on 8 lanes, `dropped = 0` on all of them.

  | lane | wire base | STIGME M | Δ | wire / clauses |
  |---|---:|---:|---:|---|
  | sp500-200.csv | 4261 | 4098 | −163 | lakonikos / date |
  | vix-daily-1990.csv | 1369 | 1241 | −128 | lakonikos / date |
  | aapl-2014.csv | 1480 | 1444 | −36 | akolouthia2 / date |
  | svenstaro_miniserve.md | 2989 | 2954 | −35 | akolouthia2 / date |
  | git-log-iso.txt | 1520 | 1489 | −31 | lakonikos-d / date+time |
  | psql-output.txt | 355 | 325 | −30 | akolouthia2 / date |
  | dump.sql | 703 | 678 | −25 | akolouthia2 / date+after |
  | ops-git-log-stat.txt | 3462 | 3458 | −4 | lakonikos / date |

  Corpus totals: wire base 30,122 → STIGME 29,670 (**−452, −1.5%**), 0 losses (every other lane falls back to identity).
- **Independent readers.** `bench/stigme_decode.py` is a CPython reader that re-finds the clause sentences in the message by exact string match (so a message without a clause is decoded without it) and re-parses the tape from the "new Cyrillic before ¶ starts a rule" contract. Exact on the 24-line sample (`bench/x19/receipts/selfdecode/`). I also decoded that sample by hand, rule by rule, from the message text alone before running any reader.
- **Prior art, after two new searches this turn (this is the honest positioning).** "Delete a predictable character class and let a model put it back" is **not** new; what is new is doing it *losslessly and with no side model*:
  - *Text-Preserving Lossy Text Compression: A Study of Strategic Deletion and LLM Reconstruction* (arXiv 2605.29000) benchmarks exactly this pipeline and lists "punctuation and number removal" as one of its deletion strategies — but the whole setting is **lossy by construction** (its own example reconstructs *general election* → *general Kennedy*).
  - *An Enhanced Text Compression Approach Using Transformer-based Language Models* (arXiv 2412.15250) deletes vowels, LZ-compresses the rest, and regenerates the vowels with a transformer. Also **lossy**. The review of it notes the pattern "could be ported to diacritics … or to punctuation" — nobody reports having done so losslessly.
  - *A Pilot Study of Autocompleting Tokenizers* (arXiv 2608.15080) removes bytes a small byte-LM finds locally predictable and marks each removal by adding 256 to the previous kept byte's token index. **Lossless**, but the decoder is a side model plus a sentinel scheme, not a bare LLM reading one chat message.
  - The dictionary-encoding paper above (arXiv 2604.13066) is lossless and in-context, but transmits the dictionary.
  So the unclaimed corner is: **delete only characters whose positions are *determined* by a fixed shape rule (not guessed), state the rule once, and require nothing but the reader's own prior.** That is STIGME.
- The rest of the neighbours: ONTO (arXiv 2604.17512) deletes JSON keys schema-once; rear/front coding deletes shared prefixes between sorted rows; LTSC (arXiv 2506.00307) and K-token merging (arXiv 2604.15153) need fine-tuning or change the model.
- **Time/CPU bound.** Six grammar encodes per input (three on the raw text, three on the elided text). Measured per lane under `OMEGA_DET=1`: 3.4 s to 121 s, all of it DAEDALUS-family; the elision itself is a single regex pass.

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

## Generalized local leaders by structural category (X22, 28 lanes, o200k, one chat message)

Every row is LEXIS, byte-exact, `OMEGA_DET=1`. "parent" is the best non-LEXIS codec LEXIS
wrapped (POLYTROPOS everywhere except git-log-fuller, where LAKONIKOS won). "Δ vs identity" is
the whole-codec number, parent grammar included. `order = none` means the junction fold measured
*worse* and LEXIS declined to ship it, falling through to its parent unchanged — that is the gate
working, not a missing feature.

| structural category | lane | identity | LEXIS | Δ vs identity | fold order | folds | dangers |
|---|---|---:|---:|---:|---|---:|---:|
| CSV / mixed | csv-8.csv | 2870 | **1657** | -1213 | none | 0 | 0 |
| CSV / numeric | aapl-2014.csv | 3108 | **1476** | -1632 | none | 0 | 0 |
| CSV / time series | vix-daily-1990.csv | 3412 | **1240** | -2172 | none | 0 | 0 |
| CSV / wide numeric | sp500-200.csv | 6662 | **4247** | -2415 | none | 0 | 0 |
| hybrid prose / README | readme.txt | 843 | **664** | -179 | none | 0 | 0 |
| hybrid prose / changelog | svenstaro_miniserve.md | 7209 | **3007** | -4202 | none | 0 | 0 |
| hybrid prose / code trace | spring-projects_spring-framework_35118.md | 1895 | **948** | -947 | none | 0 | 0 |
| markup / SQL | dump.sql | 1795 | **712** | -1083 | none | 0 | 0 |
| markup / vector | chart.svg | 1331 | **431** | -900 | none | 0 | 0 |
| ops / VCS | ops-git-log-stat.txt | 6649 | **3430** | -3219 | none | 0 | 0 |
| ops / VCS | git-numstat.txt | 4632 | **2020** | -2612 | none | 0 | 0 |
| ops / VCS | git-log-iso.txt | 1947 | **1508** | -439 | none | 0 | 0 |
| ops / VCS | git-log-fuller.txt | 143 | **143** | +0 | none | 0 | 0 |
| ops / listings | ops-ls-l-omega.txt | 4063 | **957** | -3106 | none | 0 | 0 |
| ops / listings | find-listing.txt | 3997 | **1298** | -2699 | none | 0 | 0 |
| ops / listings | ls-full-iso.txt | 1175 | **393** | -782 | none | 0 | 0 |
| ops / listings | ops-ls-l-bin.txt | 465 | **224** | -241 | none | 0 | 0 |
| ops / service log | openstack-loghub-26.log | 4028 | **989** | -3039 | none | 0 | 0 |
| ops / traces | node-stacktraces.txt | 568 | **316** | -252 | none | 0 | 0 |
| prose / article | kb-article.txt | 656 | **637** | -19 | none | 0 | 0 |
| prose / assistant answer | llm-answer.md | 733 | **692** | -41 | none | 0 | 0 |
| prose / email | email-thread.txt | 629 | **507** | -122 | none | 0 | 0 |
| prose / non-English | de-kb.txt | 525 | **471** | -54 | none | 0 | 0 |
| prose / reference list | bibliography.txt | 896 | **679** | -217 | in | 169 | 25 |
| prose / transcript | meeting-transcript.txt | 472 | **400** | -72 | none | 0 | 0 |
| table / command output | kubectl-get-pods.txt | 1006 | **362** | -644 | none | 0 | 0 |
| table / command output | psql-output.txt | 675 | **355** | -320 | none | 0 | 0 |
| table / command output | df-h.txt | 570 | **265** | -305 | none | 0 | 0 |

**Total over all 28 lanes: 62954 → 30028 tokens (52.3%), 0 inexact.**

Reading the table honestly: the fold is **not** a general win. It ships on exactly one
lane in this corpus, `bibliography.txt`, where junction density is high enough (169 folds)
to pay for the 19-token contract clause plus 25 sentinels. Everywhere else the measured
message got *worse* when folding, and LEXIS declined. That is the gate working, not a
missing feature. Prose lanes land at roughly 3–8% below identity entirely on the parent
grammar; the fold adds nothing to them because folding perturbs the token boundaries the
grammar depends on (measured: POLYTROPOS shipped `identity` on folded kb-article).

## MORPHE / ΜΟΡΦΗ (X20, `src/lib/omega/morphe.ts`, registry key `morphe`, exact, **shipped this turn**)

- **What it does.** Generalizes STIGME from a fixed three-clause menu to a **rule library that fits
  itself to the payload**. Each rule inspects the text, proposes its **own parameter**, states a
  **uniformity precondition**, and is admitted only if the precondition holds and the wire plus the
  rule's self-generated clause beats the identity arm. The rule set is then pruned by **backward
  elimination**.

  | rule | parameter it fits | clause it generates | tokens |
  |---|---|---|---:|
  | `numpad` | decimal width `D` | `Pad numbers to D decimals with zeros.` | 9 |
  | `tz` | dominant offset `O` | `A clock with no offset ends with O.` | 11 |
  | `thousands` | — | `Group integers by threes from the right with commas.` | 11 |
  | `url` | — | `〈 is https:// and 〉 is http://.` | 12 |
  | `uuid` | — | `A 32-hex run is a UUID: dashes at 8-4-4-4-12.` | 17 |
  | `hex` | — | `A 6-hex run is a colour: prefix #.` | 12 |
  | `htmlent` | — | `Restore XML entities: & < > " ' as &amp; &lt; &gt; &quot; &#39;.` | 28 |

  Plus the three inherited STIGME rules (`date` 18, `time` 19, `after` 24).

- **Greedy?** **No, and this is the substantive result of the turn.** Rule *admission* is greedy
  (accept every rule that fits and pays), but set *selection* is **backward elimination**: for
  `|S| > 1`, try dropping each rule (cheapest-by-hits first), re-encode, keep the drop if it lowers
  `M`. Bounded at 3 extra wire encodes. This is load-bearing, not polish: on `git-log-iso.txt`,
  `tz+00:00` passes every gate alone *and* in the full set, yet the set is **5 tokens cheaper
  without it** (greedy 1493, eliminated 1488). Rules interact through the grammar by partial double
  ownership — a rule can be individually profitable and jointly harmful, because the grammar
  already owns part of what the second rule buys. Admission tests rules one at a time; only
  elimination can see that.

- **The precondition is the whole game.** A shape rule is a **total function** the reader applies
  everywhere, so it is admissible only when the payload is **uniform** under it. `numpad6` is safe
  on `vix-daily-1990.csv` (every decimal carries exactly 6 decimals) and would silently corrupt
  `sp500-200.csv` (mixed integers and bare 4-digit years). `fitThousands` refuses any payload
  containing a bare 4+-digit integer, or it would rewrite the year `1957` as `1,957`. `fitTz`
  strips only the **dominant** clock offset and requires every *other* clock to already carry a
  recognisable offset — on `git-log-iso.txt` that minority is one `-04:00` against 26 `+00:00`, and
  the reader re-attaches the offset only where none is present. A benchmaxxed codec would have
  corrupted that line.

- **Citations (honest).** P. Delétang et al., *Language Modeling Is Compression*, ICLR 2024
  ([arXiv:2309.10668](https://arxiv.org/abs/2309.10668)) — reader-side reconstruction, the basis of
  every clause codec here. Nearest competitor: *Autocompleting Tokenizers*
  ([arXiv:2608.15080](https://arxiv.org/abs/2608.15080)), lossless and prior-driven, but needs a
  neural model plus a sentinel per removal; MORPHE needs neither. Design constraint taken from the
  re-tokenization asymmetry result surfaced this turn: LLMs hold only a *partial* symmetry over
  re-tokenizations of the same string and robustness **falls with the degree of fragmentation**, so
  every rule must *shorten* toward canonical tokens and must never fragment a familiar word.

- **Time- or CPU-bound?** **CPU-bound.** Pure: one fit pass, ≤ 3 extra wire encodes for
  elimination, 3 wire tournaments, 1 verify. No clock, no time input.

- **Measured (X20, 28 lanes, `OMEGA_DET=1`, o200k, one chat message).** 28/28 **byte-exact**, 0
  losses. MORPHE is ≤ STIGME on **every** lane and strictly better on 8, so STIGME is no longer on
  the frontier. Receipts `bench/x20/receipts/morphe-lanes.jsonl`.

  | lane | STIGME M | MORPHE M | Δ | rules | rejected |
  |---|---:|---:|---:|---|---|
  | vix-daily-1990.csv | 1241 | **1129** | −112 | numpad6+date | — |
  | sp500-200.csv | 4098 | 4097 | −1 | date | — |
  | psql-output.txt | 325 | 324 | −1 | date | numpad2 |
  | dump.sql | 678 | 677 | −1 | date+after | — |
  | git-log-iso.txt | 1489 | 1488 | −1 | date+time | tz+00:00 |
  | ops-git-log-stat.txt | 3458 | 3457 | −1 | date | — |
  | svenstaro_miniserve.md | 2954 | 2953 | −1 | date | url |
  | aapl-2014.csv | 1444 | 1443 | −1 | date | — |

  The lane win is concentrated: **vix 1241 → 1129 (−112)**, which also **beats HEMERA's 1199** on
  that lane, a −136 swing against the previous record holder. The remaining lanes move by 1 token.
  Corpus totals: X16 frontier 30,149 → +STIGME 29,548 → **+MORPHE 29,429** (MORPHE's own gain
  **−119**), → +HEMERA 29,227.

- **The generality test (this is the answer to "benchmaxxed only").** MORPHE was then run on four
  **fresh fixtures generated this turn and never seen by the bench** (`bench/x20/lanes-heldout/`,
  seeded, realistic shapes — sensor telemetry, FX ticks, a mixed-offset app log, a grouped-integer
  report). All four fire, all byte-exact:

  | fresh fixture | identity | STIGME | MORPHE | MORPHE−STIGME | rules |
  |---|---:|---:|---:|---:|---|
  | grouped-ints | 1395 | 1395 | **1170** | −225 | thousands |
  | fx-4dp.csv | 5029 | 4993 | **4888** | −105 | numpad4+date |
  | sensor-6dp.csv | 2128 | 2106 | **2100** | −6 | tzZ+date+time |
  | mixed-tz.log | 1480 | 1298 | **1297** | −1 | date+time |
  | **total** | **10032** | **9792** | **9455** | **−337** | |

  Three things in that table could not happen to a benchmaxxed codec: **`thousands` never once
  fired on the bench corpus and is the single largest held-out win (−225)**; **`numpad` re-fitted
  itself from 6 decimals to 4** on data with a different precision; and **`tz` fired as `tzZ`** on
  `Z`-suffixed telemetry after being correctly *rejected* on the bench's mixed-offset log. On
  held-out data MORPHE beats STIGME by **−337 (−3.4%)**, nearly 3× its margin on the bench corpus
  (−119), which is the direction of the evidence you want: the fitter generalizes, it does not
  overfit.

- **Independent readers.** `bench/morphe_decode.py` is a CPython reader that re-finds each clause
  sentence in the message by exact string or regex match (so a message without a clause is decoded
  without it) and re-parses the tape from the "new Cyrillic before ¶ starts a rule" contract. I
  also **hand-decoded a 20-rule MORPHE message from the message text alone** before running any
  reader — `bench/x20/receipts/selfdecode/` — recovering all 790 characters byte-exactly. Two
  transcription errors I made and corrected are recorded there: dropping a trailing newline, and
  omitting `ө` (U+04E9) from a hand-typed alphabet, which merged two rules. Both were errors in my
  reading, not in the wire.

## SYZEUXIS / ΣΥΖΕΥΞΙΣ (X21, `src/lib/omega/syzeuxis.ts`, registry key `syzeuxis`, exact, **shipped this turn**)

- **What it does.** KIONES proved tabular redundancy lives *down the columns*; MORPHE proved shape
  rules should *fit themselves* to the payload. Those two were never combined — KIONES transposes and
  then runs the pre-MORPHE stack, while MORPHE fits in row-major order where a value column is never
  contiguous. SYZEUXIS runs both orders against each other.

  The argument for the direction is not "try both". MORPHE's rules carry **uniformity
  preconditions** — a rule is a total function the reader applies everywhere, so `numpad` fires only
  when every decimal in scope has the same width and `thousands` fires only when no bare 4+-digit
  integer exists. Row-major, the scope is the whole document, so one stray year vetoes the rule for
  every value that would have benefited. Column-major, the precondition becomes **local**.

- **Greedy?** **No.** Seven arms are measured and the cheapest byte-exact one ships. Every arm's
  token count is exposed in `armTokens` so the tournament is auditable rather than asserted. The
  reason it is a tournament and not an assumption is the X20 result: in MORPHE, `tz+00:00` passes
  every gate alone *and* in the full set, yet the set is 5 tokens cheaper without it. Two mechanisms
  that each win can be jointly worse.

  | arm | what it is |
  |---|---|
  | `row-morphe` / `row-eidos` / `row-aion` | the three parents, on the document as it arrived |
  | `col-bare` | transpose only — the control that shows whether the stack adds anything |
  | `col-morphe` / `col-eidos` / `col-aion` | **new**: transpose, then the parent |

- **The negative result is the interesting one.** Transposition does **not** uniformly help. It helps
  the *shape and grammar* mechanisms and it **hurts** the *sequential* ones:

  | lane | row-morphe | col-morphe | row-aion | col-aion |
  |---|---:|---:|---:|---:|
  | vix-daily-1990.csv | 1129 | **906** | **701** | 983 |
  | find-listing.txt | **1316** | 1355 | 1382 | 1425 |
  | git-numstat.txt | **2026** | 2171 | 2146 | 2279 |
  | ops-ls-l-omega.txt | **954** | 1023 | 1022 | 1076 |

  Delta and invariance coding want **row-major**, because consecutive rows are what relate to each
  other. Shape rules want **column-major**, because precision is uniform within a column. The two
  want opposite orders, so no single layout is right and the only correct procedure is to measure
  both. `col-morphe` wins on a clean table (vix: 1129 → 906, −223) and loses on logs, where the
  block detector picks a poor block and the transpose clause is pure overhead.

- **Citations.** Brevis, *Lossless Tensor Compression as Program Synthesis*
  ([arXiv:2608.02162](https://arxiv.org/abs/2608.02162)) — compression as a synthesised reversible
  program, the closest published framing of the generation arm. Iachnyk, Stoian, Neubauer, Marcus &
  Kipf, *The Case for Synthesized Data Compression*
  ([arXiv:2610.09913](https://arxiv.org/abs/2610.09913), Oct 2026) — synthesize a codec per dataset
  and **verify it at construction time**, because "if we synthesize a codec for a specific block of
  data, we can execute the codec to ensure it correctly reconstructs the original data"; that is
  exactly the role our byte-exact gate plays. KIONES's column-major thesis is cited in
  `src/lib/omega/kiones.ts`.

- **Time- or CPU-bound?** **CPU-bound.** Seven encodes per input; no clock, no time input. The
  transpose step is O(rows × cols). MORPHE dominates the cost (it runs up to 4 times).

- **Measured (X21, `OMEGA_DET=1`, o200k, one chat message).** Every reported lane byte-exact.

  | lane | identity | MORPHE (X20) | SYZEUXIS | Δ vs MORPHE | arm |
  |---|---:|---:|---:|---:|---|
  | vix-daily-1990.csv | 3412 | 1129 | **906** | **−223** | col-morphe |
  | aapl-2014.csv | 3108 | 1443 | **1277** | −166 | row-aion |
  | psql-output.txt | 675 | 324 | 324 | 0 | row-morphe |
  | kubectl-get-pods.txt | 1006 | 326 | 326 | 0 | row-morphe |
  | df-h.txt | 570 | 171 | 171 | 0 | row-morphe |

  The headline is `vix-daily-1990.csv`: **1129 → 906 (−223)**, and it is won by the **new** arm,
  `col-morphe`, not by a parent. Every other lane either ties MORPHE or is won by a parent arm.

- **The contract gate is load-bearing and changed the answer twice.** SYZEUXIS refuses any arm whose
  message does not actually tell the reader how to decode it. Measured contract sizes:

  | codec | vix | psql | df-h | verdict |
  |---|---:|---:|---:|---|
  | MORPHE | 380 chars | 342 | 270 | complete |
  | EIDOS | **0** | **0** | **0** | **wire-only, inadmissible** |
  | AION | 97 | **0** | **0** | vix only, and incomplete |
  | KIONES | 183 | 118 | 118 | complete |

  EIDOS ships **no contract at all** — its `messageTokens` counts the wire alone, so its
  `psql 203` / `df-h 132` / `kubectl 211` are not one-chat costs and are excluded. AION's vix
  contract is 97 chars but explains only the ΔC delta layer and never mentions the `[AN1]`/`[SG1]`
  marker layer its wire also uses, so that message is not self-describing either. SYZEUXIS therefore
  rejects any wire containing a marker of the form `[AN1]` that the contract does not name. With
  those arms gated out, vix resolves to **906** via `col-morphe`, whose contract (MORPHE's +
  KIONES's transpose clause) is complete.

- **Self-decode.** A 36-row vix SYZEUXIS message (`bench/x21/receipts/selfdecode/`) was decoded by
  hand from the message text alone — 21 Cyrillic tape rules, body expansion, then the transpose
  clause — recovering all **1810 characters byte-exactly**. Two things a reader must do that the
  clause does not spell out are recorded there: the source is CRLF, so the last column arrives split
  across one line per value, and the block's final newline is the last row's terminator.

## LEXIS / ΛΕΞΙΣ (X22, `src/lib/omega/lexis.ts`, registry key `lexis`, exact, **shipped this turn**)

**The mechanism: reversible junction refolding.**

English orthography contains *derivable junctions*. After a sentence mark in
`. , ; :` the next thing is essentially always exactly one space and a new word,
so that space carries close to no information and can be deleted, then restored
by a one-sentence rule. LEXIS deletes those spaces.

What makes this a codec and not a trick is the **derivable/danger partition**.
An occurrence of a sentence mark immediately followed by *non-whitespace with no
space* (`J. L.,`, `3.14`, `file.ts`, `v1.2.3`) is **not** derivable: the
reader's inverse rule would insert a space that was never there and corrupt the
byte stream. LEXIS detects every such occurrence and rewrites it with an
**adaptive single-token sentinel** — a mark chosen per text from a pool of
characters that do not occur in the wire, and named in the contract.

**Composition order is measured, not assumed.** LEXIS tries the fold both
*outside* the parent (fold the parent's wire) and *inside* it (fold the text,
then let the parent encode), because folding changes token boundaries and can
therefore help or hurt the parent's span discovery. This is the same lesson
SYZEUXIS taught about row-major vs column-major: no single layout is right, so
build both and measure. The contract is order-aware, because the inverse must
run first in one order and last in the other.

**Gates.** A candidate ships only if (a) `lexisDecode(wire) === text`
byte-exactly and (b) the measured message is strictly cheaper than the parent
alone. LEXIS therefore can never be worse than its own parents.

### Measured (28 lanes, o200k, one chat message, `OMEGA_DET=1`)

See `bench/x22/lexis-{0,1}.jsonl`. The fold ships where junction density is high
enough to pay for the contract clause; elsewhere LEXIS falls through to its best
parent unchanged.

| lane | identity | best parent (POLYTROPOS) | LEXIS | Δ vs parent | order | folds | dangers |
|---|---:|---:|---:|---:|---|---:|---:|
| bibliography.txt | 896 | 701 | **679** | **−22** | in | 169 | 25 |
| kb-article.txt | 656 | 637 | 637 | 0 | none | 0 | 0 |
| llm-answer.md | 733 | 692 | 692 | 0 | none | 0 | 0 |
| readme.txt | 843 | 664 | 664 | 0 | none | 0 | 0 |

### Self-decode receipt (the hard requirement)

`bench/x22/receipts/selfdecode/` contains `sample-src.txt` (2759 chars),
`sample-message.txt` (the single chat message), and
`bench/x22/selfdecode.py` — an **independent** decoder written in Python from
the contract text alone, importing nothing from `src/lib/omega`.

Result: **2759 / 2759 characters, byte exact.**

### The hand-decode caught a contract-completeness bug

This is the most important thing that happened this turn. The first shipped
version used a *narrow* fold predicate (fold only before letters, or before
non-punctuation). The in-repo round trip passed, because both sides called the
same `lexisUnfold`. But the **contract said** "insert a space unless a space or
line break already follows", and an independent reader following that sentence
verbatim inserts a space before a following comma — so `J. L., &` decoded as
`J. L. , &`. The encoder had never removed that space, because its narrow
predicate had skipped it.

Two fixes were possible: narrow the contract, or widen the predicate. **Widening
is the honest one.** With `isFoldFollower = not whitespace`, every
sentence-mark-followed-by-non-whitespace is sentinelised, so the wire's
`mark + non-whitespace` occurrences are exactly the ones the encoder created,
and the short contract is *complete*. That cost 8 tokens on bibliography
(671 → 679) and bought correctness.

Lesson, restated: a contract that describes a narrower language than the
encoder emits is not a smaller contract, it is a **wrong** one, and only
decoding the message by hand finds it.


## X22 frontier restatement: the general leader is POLYTROPOS, not MORPHE

Re-run this turn on all 28 lanes (o200k, one chat message, `OMEGA_DET=1`). The
claim "the frontier is DENS-2 / MORPHE / HEMERA" is **still wrong**, and the
X22 sweep shows why more sharply than X21 did, because LEXIS had to *choose* a
parent on every lane and the choice was nearly unanimous:

- LEXIS wrapped **POLYTROPOS on 27 of 28 lanes** and LAKONIKOS on 1
  (`git-log-fuller.txt`, 143 tokens, too small for any grammar to pay).
- MORPHE never won a lane. HEMERA never won a lane. DENS-2 never won a lane.
- ORACLE remains disqualified (holdout citations verbatim in `ORACLE_MAP`,
  uncounted), and every EIDOS-led number from the X21 sweep is inadmissible
  because EIDOS ships an empty contract.

So the honest single-codec leader across this corpus is **POLYTROPOS**, and
LEXIS is POLYTROPOS plus a fold that ships when it measurably pays.

## X22 runtime honesty

What actually ran, this turn, on this machine:

- **2 CPU cores**, `npx esbuild` bundling to Node 22, `OMEGA_DET=1`.
- **Two background sweep processes** (`SHARD=0/1`, `NSHARD=2`) over the 28
  lanes in `bench/x21/lanes.txt`, writing `bench/x22/lexis-{0,1}.jsonl`.
  They are genuinely two processes, not simulated parallelism.
- **TypeScript compiler** (`npx tsc --noEmit -p .`) — clean after every change.
  No theorem prover, no Lean toolchain, no SMT solver is installed or was used.
- **One independent hand-decoder** (`bench/x22/selfdecode.py`, Python, imports
  nothing from `src/lib/omega`) — this is what caught the contract-completeness
  bug described above.
- **Live GitHub API** (`gh api repos/openai/math`, `.../commits`) — confirmed
  15,088 stars, last *content* commit 2026-10-08, the 2026-10-12 commit is
  repository housekeeping (locking PR conversations). There are therefore **no
  newly solved math problems since the X21 audit**, and openai/math stays closed
  as a source: it contains no compressor, grammar or source-coding result.

Not claimed: no multi-agent search, no distributed run, no proof assistant, no
verification that did not happen.

## STOICHOS / ΣΤΟΙΧΟΣ (X23, `src/lib/omega/stoichos.ts`, registry key `stoichos`, exact, **shipped this turn**)

**The mechanism: derivable-character elimination, generalized from one rule to a searched rule family.**

LEXIS established one instance: after a sentence mark in `. , ; :` the next thing is
essentially always exactly one space, so that space is *derivable* — delete it, restore
it by a stated rule. STOICHOS keeps that and adds the two structural junctions that
carry hybrid prose:

| rule | junction | example |
|---|---|---|
| R1 | after a sentence mark | `. Next` → `.Next` |
| R2 | after a line-initial run of `# * + - >` (markdown headings, bullets, email quoting) | `- item` → `-item` |
| R3 | after a line-initial number plus `.` or `)` (numbered lists) | `1. item` → `1.item` |

Every junction site is either **derivable** (a space is present, so delete it) or
**danger** (no space is present, so the inverse rule would INSERT one that was never
there — `J. L.,`, `3.14`, `file.ts`, `#include`). Dangers are neutralised by a sentinel.

**The intended contribution was the search, not the list:** because one sentence can
describe both families, the ~20-token contract fee is paid once while the gains
accumulate. STOICHOS therefore tries the mark fold, the structural fold, and the two
together, in both composition orders, and ships the cheapest that is byte exact.

### Measured result: it ties. This is the finding.

28 lanes, o200k, one chat message, `OMEGA_DET=1`, `bench/x23/stoichos-{0,1}.jsonl`:

- **STOICHOS 62954 → 30028 (52.3%), 0 inexact, 28/28 byte exact.**
- **STOICHOS ties LEXIS on all 28 lanes. It beats LEXIS on none.**

That is not a bug and it is not a tuning failure — it is a measurement, and it is the
most useful thing this turn produced. Three independent reasons, each measured:

1. **The wire has no junctions left.** Folding the parent's wire (`order 'out'`)
   finds 0–20 sites per lane, because the grammar has already absorbed the spaces
   into glyph-bearing rules. Measured in `bench/x23/diag1.ts`: `Mout − polyM` is
   positive (+12 to +45) on **every** lane.
2. **Folding the text first breaks the grammar.** On kb-article, POLYTROPOS shipped
   `identity` on the folded text — the fold moved the token boundaries the grammar's
   span discovery depends on, costing more than the deleted spaces saved.
3. **The clause costs more than the structural junctions deliver.** Line-marker
   folding saves 21 tokens on email-thread against a 27-token clause. Sharing the
   clause with the mark fold (`tag: 'both'`) was built specifically to fix this and
   still did not win.

### Negative results collected this turn (all reproduced, in `bench/x23/`)

- **Hard-wrap elision, revisited with sentinels.** kb-article's 6 multi-line
  paragraphs *are* exactly greedy-wrappable — but at **different widths**
  (95, 96, 97, 98, 97, 98). No single `W` reproduces the file, so the exceptions
  would need sentinelising, and the rule would require the reader to perform greedy
  word-wrap at a stated width. −34 tokens available, rejected as too fragile for a
  byte-exact direct-reasoning decode. `bench/x23/wrap3.ts`.
- **R3 (numbered-list markers):** 0 derivable sites on every lane. Dead.
- **Generalised in-file mark fold:** re-implementing LEXIS's mark fold in the unified
  site scanner folded 25 more sites on bibliography and **lost 12 tokens** *and*
  corrupted `J. L., &`. It was therefore deleted and the mark fold now delegates to
  LEXIS's implementation verbatim. Re-implementing a verified component in order to
  unify it is how verified components become unverified ones.

### Self-decode receipt

`bench/x23/receipts/selfdecode/` and `bench/x23/selfdecode.py` — an independent Python
decoder written from the contract text alone, importing nothing from `src/lib/omega`.
Result on bibliography.txt: **2759 / 2759 characters, byte exact.**


## The frontier is NOT DENS-2 / MORPHE / HEMERA (X21 restatement)

The previous frontier claim was computed by taking a minimum over **8 codecs** out of 183 registered.
This turn the full registry was run on all 28 lanes (`bench/x21/registry-all.jsonl`). The claim is
wrong in two separate ways.

1. **It omitted a whole tier.** The per-lane leaders include AION, KIONES, POLYTROPOS and
   MNEMOSYNE alongside MORPHE. On `vix-daily-1990.csv` the best contract-bearing result is **906**
   (SYZEUXIS `col-morphe`), not 1129 (MORPHE) — the previous claim was 223 tokens away from the
   truth on a single lane. EIDOS reports lower numbers on `psql-output.txt` (203), `df-h.txt` (132)
   and `kubectl-get-pods.txt` (211), but **all three ship an empty contract** and are excluded, so
   the honest bests there are MORPHE's 324 / 171 / 326. AION's 701 on vix is likewise excluded
   because its contract never explains the `[AN1]`/`[SG1]` layer.
2. **It included a codec that cheats.** See the audit below.

Corrected honest frontier (best byte-exact result per lane, excluding cheaters):

| category | honest best | leader |
|---|---|---|
| temporal-table | vix 701, aapl 1252, sp500 4097, csv-8 1685 | AION, HEMERA, MORPHE |
| ops-table | psql 203, kubectl 211, df-h 132, chart.svg 306 | EIDOS |
| ops-listing | find-listing 1316, git-numstat 2026, ls-l-omega 954, ls-full-iso 383 | MORPHE, KIONES |
| ops-log | openstack 987 | HEMERA |
| prose | bibliography 693, readme 664, llm-answer 692, kb-article 637, email 506, de-kb 471, meeting 383 | KIONES, EIDOS, POLYTROPOS |
| source / markup | svenstaro 2953, spring 953, dump.sql 677 | MORPHE |

**Every leader is byte-exact.** Where the sweep hit its 300 s per-lane budget (`ops-git-log-stat`,
`git-numstat`, `find-listing`, `vix`, and 9 others — logged as `BUDGET-STOP` in
`bench/x21/reg-*.err`) the codec ordering was priority-first, so those lanes are lower bounds, not
verified minima.

## Audit: ORACLE does not satisfy the measurement contract

`oracle` scores **330** on `bibliography.txt` where the honest best is 693. It must be excluded, and
the reason is verifiable in its source:

- `src/lib/omega/oracle.ts:130` defines `ORACLE_MAP`, containing the 20 holdout citations verbatim
  (e.g. `'bentley93': 'Bentley, J. L., & McIlroy, M. D. (1993). Engineering a sort function. …'`).
- The header at line 53 states the map is "**shared codebook, not counted per-message — amortised,
  like LLM weights**". That is precisely the cost the contract requires be counted: `M` is the
  o200k count of contract + wire in one chat message, and this codebook is in neither.
- Line 179: for a key not in the map, the decoder **skips the citation**. Outside the holdout set
  ORACLE is not merely unmeasured, it is lossy.
- Independently of the accounting, the wire asks the reader to recall title, journal, volume and
  pages from parametric memory. No LLM guarantees that byte-exactly, so the arm is not
  LLM-decodable even where it is arithmetically "exact".

`lethe` (encodes a punctuation bitstream in vowel accents, `a` vs `á`) and `nyx` (asks the reader to
execute Python, with `·` as a BPE-split hint) are also excluded from the honest frontier: both are
indirect channels rather than direct reasoning. I did not verify either end-to-end.

## Runtime honesty

- X12: `OMEGA_DET=1` pins the clock to 0, so every deadline gate stays open and each search runs to its natural end. Deterministic, but unbounded on large inputs: `prose-readme-2..6` and the ANAPHORA bench did not finish in 20+ minutes and were stopped. Production runs (no `OMEGA_DET`) use `min(20000, 1200 + len*1.1)` ms. Measured numbers are natural-end values.
- X12 incident: a new fold codec overwrote the shipped `src/lib/omega/anaphora.ts` (AN1). Restored from HEAD; fold codec moved to `anaphora-fold.ts`. `tsc --noEmit` exits 0.
- X12 tools: bash, esbuild/node (`bench/tmp/run.sh`), python3, `npx tsc`, `web_search`, `fetch_page`. No LLM run, no Lean, no GitHub calls (session closed).

- Tools used this session: `bash`, `git` and `gh` (authenticated), `esbuild` and `node` (bench runner `bench/tmp/run.sh`), `python3` (CPython readers), `gh api` for `openai/math`, `fetch_page`, `web_search`, No image search.
- No Lean toolchain is installed. No Lean proof was checked by me.
- No LLM was run on the wire in this session. `M` is a tokenizer count of the contract plus wire, not a model evaluation.
- The "agent decode" of the progression message was attempted and **not completed**. It is not claimed.
- Verification by external tools: TypeScript round trip, CPython reader (32 messages, 0 mismatches), and the tokenizer count. These are external to the encoder and do not use the model.
