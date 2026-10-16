# Codec abbreviations: decoded design spec (X18)

This page decodes the codec abbreviations used in the registry (`src/lib/omega/registry.ts`) into their technical design: the mechanism, whether the encoder is greedy or a search, the source citation, and the time or CPU bound. The X18 addendum below supersedes earlier X11–X16 measurements where it names a newer receipt. The companion page is `docs/codecs.md` (measurement history and leaders).

Conventions:

- **M** = one-chat count, o200k_base tokens of decoder contract plus wire, in one chat message, with no system prompt and no skills file.
- **Greedy** = the encoder commits to a choice without backtracking. **Search** = the encoder iterates over candidate configurations and keeps the best. Both are stated separately because most entries combine a greedy core with a gate.
- **Gate** = a check that falls back to the identity arm (plain DAEDALUS) on failure. A gate is not a search: it compares two fixed candidates.
- **Citation** = an external source only where I verified the link in this turn or an earlier one. "Internal" means the design lives only in this repository's reports.
- **Time/CPU bound**: under the production clock the DAEDALUS family stops at `budgetMs = min(20000, 1200 + len·1.1)` ms (wall clock). Under `OMEGA_DET=1` the clock is pinned to 0, so each search runs to its natural end and the run time is unbounded on large inputs (measured in X12 and X13).

## Frontier and shipped codecs

### DAEDALUS (`daedalus`)
- **Mechanism.** A hierarchical merge over o200k tokens: repeated adjacent token pairs are replaced by glyph rules, level by level (up to 6 levels), with the glyph assignment improved by a targeted hill-climb. Arms (`default`, `span12`, `span12+words`, `words`, `span36`, `flat`) are ordered by an O(n) predictor (punctuation density and repetition), and the predicted arm runs first.
- **Repair/local search.** Yes: the glyph-to-rule assignment is a local search (hill-climb). The arm choice is a portfolio search.
- **Greedy?** Partly. Pair merging is greedy per level. The glyph assignment is local search. The portfolio is a search over 6 arms, bounded by the budget.
- **Citation.** Internal (`src/lib/omega/daedalus.ts`, header). The merge idea is Re-Pair-like. The Re-Pair line of work I verified in X12 is Bille, Gørtz, Prezza, arXiv 1704.08558 (2017). I did not verify that DAEDALUS is a direct instance of that algorithm, so I state only the resemblance.
- **Time/CPU bound.** Wall clock under budget in production. Unbounded under `OMEGA_DET=1` (natural end).

### DAEDALUS-D (`daedalus-dual`)
- **Mechanism.** DAEDALUS with a glyph pool in which every glyph is one token under both o200k_base and cl100k_base. Same decoder. Decode-gated, identity fallback.
- **Greedy?** Same as DAEDALUS. The pool restriction is a filter, not a search.
- **Citation.** Internal.
- **Time/CPU bound.** Same as DAEDALUS.

### PHALANX-A10 (`phalanx-a10`, the "A10" of the frontier)
- **Mechanism.** PHALANX-A7 layers with a token-window and character-substring dictionary, a nested equals-free header, and one greedy pass. Identity-guarded.
- **Greedy?** Yes: one pass (label).
- **Citation.** Internal.
- **Time/CPU bound.** Linear pass plus the guard. Measured: worse than plain DAEDALUS on all 17 lanes (X12), so it is not on the frontier in this repository.

### DENDRON (`dendron`) and DENS-2 / DENDRON-S (`dendrons`)
- **Mechanism.** Brace-tree notation for path and URL lists: lines sharing a first segment are written once as a bash brace group (`dir/{a,b/{c,d}}`), expanded in order by the reader. DENDRON-S factors dotted identifiers on `.` or paths on `/`, whichever is cheaper by M. The tree wire is used only if it is strictly cheaper than the DAEDALUS frontier.
- **Greedy?** Factoring choice is greedy per line. The use-or-not decision is a gate with two candidates.
- **Citation.** Internal. Prior art for brace trees is ordinary shell brace expansion (GNU Bash manual, Brace Expansion), which I cite as a notation, not as a compression method.
- **Time/CPU bound.** Linear in the number of lines, plus one DAEDALUS encode for the gate.

### GRAMMA-Ω (`gramma`)
- **Mechanism.** A notation-dialect menu: the layout is regenerated from the reader's own formatting priors (JSON re-print or bracket-depth re-indent). Each dialect is gated byte-exact on the text and through the CHIRON reader. Plain DAEDALUS is a candidate.
- **Greedy?** No. It chooses among several fixed dialects, which is a small search with gates.
- **Citation.** Internal.
- **Time/CPU bound.** One reprint per dialect plus gates; bounded by the dialect count.

### AKOLOUTHIA (v1, `akolouthia`) and AKOLOUTHIA-2 (`akolouthia2`)
- **Mechanism.** Arithmetic-progression elision. A number at position k of line i is written as a marker when it equals `value(i-1,k) + (value(i-1,k) − value(i-2,k))`. The reader computes it. v1 also required the same step at line i-3 (an encoder-side guard the reader never used). AKOLOUTHIA-2 drops that guard.
- **Greedy?** Yes: a single left-to-right marking pass. The whole-message gate (G1 expand, G2 DAEDALUS round trip, G3 M below identity) decides between two candidates.
- **Citation.** Internal. Related prior art: LogShrink (Yao et al., 2020; Li et al., ASE 2023), parser-based log compression, and arXiv 2408.05760 on numeric token parsing for logs, both recorded in earlier reports.
- **Time/CPU bound.** Linear pass plus one DAEDALUS encode and one DAEDALUS decode (G2).

### HORA (`hora`, X13)
- **Mechanism.** Timestamp deltas. A full `YYYY-MM-DD<sep>HH:MM:SS.mmm` timestamp that falls on the same date and with the same separator as the previous timestamp is written as `※N` (U+203B; `§` is not used because CHIRON uses it as a structural delimiter), N = signed milliseconds from the previous one. The reader adds N back. A gate (G0) checks that the marker lies outside the glyph alphabet DAEDALUS chose. Dates change and 6/9-digit fractions stay literal.
- **Greedy?** Yes: a single left-to-right pass. The gate compares two candidates (identity against delta).
- **Citation.** The mechanism is textbook differential (delta) coding of timestamps. Verified prior art: Gorilla (Pelkonen et al., VLDB 2015, delta-of-delta timestamps, `vldb.org/pvldb/vol8/p1816-teller.pdf`) and LogReducer (Wei et al., FAST 2021, delta timestamps in parser-based log compression, `usenix.org/system/files/fast21-wei.pdf`); DeLog (arXiv 2601.15084, 2026) uses the same family. What is new here is only the one-chat, LLM-readable wire on top of DAEDALUS.
- **Time/CPU bound.** Linear pass, plus two DAEDALUS encodes (plain and delta) and one decode.

### HEMERA (`hemera`, X14)
- **Mechanism.** Calendar-day deltas, plus HORA's millisecond deltas. A date that is 1 to 31 days away from the previous date in either direction (in document order) is written `※dN`, N = signed day count; a time that follows stays literal. Two states (X14 repair): `lastDay` is the last valid date of any kind and drives `※dN`; the time state (`fullDay`, `fullSep`, `fullTod`) is set only by timestamps with a time part. A same-date full millisecond timestamp with the same separator is written `※N` relative to the time state, as in HORA. Date-only tokens (for example a date in a file name) do not clear the time state; before the repair, they did, and openstack got 0 ms marks. Three arms, each with its own contract: `ms` (HORA's contract, 23 tokens), `days` (23 tokens), `both` (36 tokens). The encoder keeps the arm with the smallest one-chat M that passes all gates, otherwise identity. Dates are proleptic Gregorian, computed with an exact day-number algorithm; invalid dates and year 0000 stay literal.
- **Greedy?** Yes: a single left-to-right pass per arm. The gates compare fixed candidates; no search.
- **Citation.** Textbook differential (delta) coding of a sorted key, applied to calendar dates. Prior art for delta timestamps: Gorilla (Pelkonen et al., VLDB 2015, `vldb.org/pvldb/vol8/p1816-teller.pdf`), LogReducer (Wei et al., FAST 2021, `usenix.org/system/files/fast21-wei.pdf`), DeLog (arXiv 2601.15084). What is new here is the one-chat, LLM-readable wire with a per-arm contract and the identity guard. Not new in the literature.
- **Time/CPU bound.** Linear pass per arm, plus up to three DAEDALUS encodes and one decode per arm. The DAEDALUS bound applies (wall clock in production; natural end under `OMEGA_DET=1`, which ran 1–114 s per lane in `bench/z59/receipts/`).

### PARADEIGMA (`paradeigma`)
- **Mechanism.** Template entailment for JSON records: a field whose value is, in every object of a shape, a fixed concatenation of constants and sibling values is written as an entailment.
- **Greedy?** Template induction is greedy per shape.
- **Citation.** Internal.
- **Time/CPU bound.** Linear in records. Not run in X12 or X13.

### LAKONIKOS (`lakonikos`, X10 2026-10-10, shipped)
- **Mechanism.** The DAEDALUS wire, unchanged, with the English rules sentence in the decoder contract shortened from 39 to 29 o200k tokens (same semantics, same decoder). Identity-guarded on the old prompt text.
- **Greedy?** No search. The contract is a fixed string substitution.
- **Citation.** Internal (`src/lib/omega/lakonikos.ts`; `bench/lakonikos-report-2026-10-10.md`).
- **Time/CPU bound.** Same as DAEDALUS (the wire is DAEDALUS's).
- **Measured.** −10 o200k tokens per rule-based message on the DAEDALUS wire (43 holdout files, −262 in total). Not measured against the frontier in its own right, because the frontier uses DAEDALUS-D.

### LAKONIKOS-D (`lakonikos-d`, X16, registered)
- **Mechanism.** DAEDALUS-D (dual-tokenizer glyph pool, same decoder) with the LAKONIKOS terse contract. The wire is byte-identical to DAEDALUS-D's; only the rules sentence of the contract changes. Identity fallback unless `chironDecode(wire)` round-trips to the input.
- **Greedy?** Same as DAEDALUS-D (greedy pair merging plus a glyph hill-climb). The contract change is a fixed string substitution, not a search.
- **Citation.** Internal composition of DAEDALUS-D (`src/lib/omega/daedalus-dual.ts`) and LAKONIKOS (`src/lib/omega/lakonikos.ts`). No external citation: the idea is a contract-text edit.
- **Time/CPU bound.** Same as DAEDALUS-D. In one process the 28-lane run of DAEDALUS-D plus LAKONIKOS-D took 431 s wall (`bench/x16/receipts/lakonikos-d-v1.err`, OMEGA_DET=1). Per-lane encode is about 15 s on this 2-core sandbox.
- **Measured (X16, 28 lanes, `bench/x16/receipts/lakonikos-d-v1.jsonl`, registry path in `lakonikos-d-registry.jsonl`).** Exact on 28 of 28 lanes. Saving over DAEDALUS-D: −9 to −11 on the rule-based lanes, −1 on three lanes (openstack, aapl, csv-8), 0 on the identity lane (git-log-fuller). Against the X16 frontier minimum it is lower on 11 lanes: de-kb 481 vs 492 (−11), readme 678 vs 688, bibliography 699 vs 709, kb-article 640 vs 650, llm-answer 696 vs 706, ls-full-iso 395 vs 405, git-log-iso 1520 vs 1530 (each −10), meeting-transcript 411 vs 420 (−9), ls-l-bin 238 vs 247 (−9), node-stacktraces 332 vs 339 (−7), email-thread 520 vs 525 (−5). It ties on 2 lanes and is above the frontier on 15 (AKOLOUTHIA-2 wins most ops-table lanes by 32–125 tokens).
- **Readability.** Not verified by an LLM in this sandbox. The CPython reader (`bench/chiron_decode.py`, written from the old contract prose) decodes 27 of 27 LAKONIKOS-D wires exactly; that tests the wire, not the shorter sentence. The earlier LAKONIKOS self-decode on 3 fixtures was done by the same model that wrote them, so it is not a blind test.

### ANAPHORA (AN1, `anaphora`, shipped)
- **Mechanism.** Zero-header in-place binding: the first occurrence of a phrase stays in the body and later occurrences are aliased.
- **Greedy?** Yes, over a candidate list.
- **Citation.** Internal.
- **Time/CPU bound.** Not re-measured in X13.

### STATHMOS (`src/lib/omega/stathmos.ts`, X17, unregistered, niche)
- **Mechanism.** Fixed-width decimal columns in delimited tables. A column is transformed only if every data cell has the same number of fraction digits D (D ≥ 1). The trailing zeros are removed, and a first line `@dp D1,…,Dk[,crlf]` records D per column (0 = column untouched) and the line ending. The reader pads each decimal cell of a counted column back to exactly D digits. An input that starts with the marker or with `@raw` is escaped.
- **Greedy?** Yes: one pass per column to find D, then one pass to strip. The gate compares two fixed candidates (LAKONIKOS-D on the raw text, LAKONIKOS-D on the stripped text plus the restore sentence) and keeps the cheaper one. No search.
- **Citation.** Internal. The idea is standard fixed-precision formatting. I did not find a published codec for this exact rule in the searches I ran, and I make no novelty claim. The source check in X17 confirmed that no module in `src/lib/omega` strips trailing zeros from fixed-decimal columns (ABACUS handles thousands commas only).
- **Time/CPU bound.** Linear pass over the table, plus two LAKONIKOS-D encodes (DAEDALUS-D wire, wall-clock budget unless `OMEGA_DET=1`).
- **Measured (X17, 28 lanes, o200k M).** Exact 28/28. The transform fired on one lane only (`vix-daily-1990.csv`: 1380 → 1212 against LAKONIKOS-D, and 1369 is the frontier minimum). It did not fire on `aapl-2014.csv` or `csv-8.csv`: their decimal columns have mixed widths (for example 8, 7, and 6 digits in aapl), so the fixed-width rule rejects them, and the files appear to have had trailing zeros stripped upstream, and the original width cannot be recovered from the cell (an inference from the widths, not checked against the source). It did not fire on `sp500-200.csv`, which has no decimal columns (the numbers are integers). Earlier probe numbers that showed a gain on aapl were invalid (round trip failed) and are superseded. Verdict: niche, not a broad win.

### POLYCHRON (`src/lib/omega/polychron.ts`, registry key `polychron`, X18, shipped)

- **Mechanism.** A single typed-table pass composes two independently reversible relations without nesting two decoder messages. HEMERA replaces a valid calendar date after a prior valid date with `※dN`, retaining any literal time suffix. STATHMOS identifies columns whose every data cell has the same positive decimal width, removes trailing fractional zeroes, and puts the widths plus CRLF state in one `@dp D1,...,Dk [crlf]` header. The transformed table is sent through LAKONIKOS-D, and one in-band contract says “restore `@dp` first, then dates.” The reader is total: malformed `@dp` prefixes are left alone; identity payloads containing reserved `※`, a line beginning `@dp `, a line equal to `@raw`, or a valid CHIRON program are prefixed with `@raw`.
- **Greedy or not.** The typed passes are deterministic and greedy in the narrow streaming sense: STATHMOS scans all cells once per column and keeps the only fixed-width schema; HEMERA marks each eligible date left to right. POLYCHRON does **not** search over schemas or marker placements. Its identity/transformed decision is a two-candidate whole-message gate, not a tournament. The underlying LAKONIKOS-D candidate still contains DAEDALUS-D's predicted-arm portfolio and glyph hill-climb; POLYCHRON does not claim those are greedy.
- **Exactness gates.** P0 rejects marker/header collisions or escapes the identity arm; P1 checks both local inverses; P2 checks the DAEDALUS-D/CHIRON wire; P3 requires `M(transformed) < M(LAKONIKOS-D identity)`; P4 runs the full reader on the final wire. No semantic similarity score is accepted.
- **Time/CPU bound.** The two typed scans and inverse checks are O(n) time and O(n) space in the input size; a payload beginning with the CHIRON start marker also gets one collision check through the existing CHIRON reader. The complete encoder runs two LAKONIKOS-D candidates (identity and transformed) plus token counts; the DAEDALUS production budget for each candidate is `min(20,000, 1,200 + 1.1·len)` ms wall clock, but this is not a CPU or asymptotic proof. With `OMEGA_DET=1`, the clock gates never expire and natural search time is unbounded by that option; the red-team run took about 11 minutes and the 28-lane POLYCHRON run about 4.3 minutes in this sandbox. Decode is a linear CHIRON pass plus linear table/date restoration under the existing CHIRON expansion limit.
- **Measured (X18).** `bench/polychron/receipts/redteam.jsonl`: 265/265 exact/deterministic/message-gate cases, 0 failures, no transformed fuzz/edge arm. `collisions.jsonl`: 6/6 reserved-marker, malformed-prefix, and valid-CHIRON-program cases. `lanes.jsonl`: 28/28 exact, one transformed lane; VIX daily `M=1138` versus LAKONIKOS-D `1380`, with `days=125`, `dp=[0,6,6,6,6]`, CRLF preserved. An independent CPython reader (`bench/polychron_decode.py`, separate from the TypeScript reader) decoded all 28 exported wires exactly; its receipt reports `transformed=1`, `failures=[]`. This is a niche win, not a general prose/ops win.
- **Citation and novelty boundary.** Calendar delta coding, fixed-precision/decimal column encoding, and grammar/dictionary compression are established families. The external sources listed in the X18 addendum document adjacent prior art; I claim only this particular in-band composition plus its gates as a repository artifact, not a new compression-theory result.

## Negative or unregistered codecs

### ANAPHORA-FOLD (`src/lib/omega/anaphora-fold.ts`, X12, unregistered)
- Two-sided field fold against the best of K previous lines. Greedy per line. Byte-exact, but G3 rejects every fold on every lane that has one (DAEDALUS already glyphs the repeated heads and tails). Negative.

### ONOMASIA (`src/lib/omega/onomasia.ts`, X11, unregistered)
- Keyed addressing for progressions. Loses to AKOLOUTHIA-2 on the measured ops lanes. Negative.

### DIAPHORA (`src/lib/omega/diaphora.ts`, X15, unregistered, measured zero gain)
- **Mechanism.** Column-difference coding of long integers. A digit run of an original line with at least 4 digits, canonical (no leading zero), at the same 1-based position among the line's digit runs as a number in the line above, is written `∆d` with d = C − P, when the mark is shorter than the run. The reader adds d to the number at that position in the decoded line above. Identity-guarded (G0–G4, as HEMERA).
- **Greedy?** Yes: one left-to-right pass per line, with a fixed rule (no search).
- **Citation.** Textbook delta coding of a column (Elias 1975 for integers; columnar delta encoding in column stores such as Parquet's DELTA_BINARY_PACKED). Not new in the literature. The position-based pairing is internal.
- **Time/CPU bound.** Linear in the input for the substitution, plus the DAEDALUS encodes of the identity arm and the substituted arm (the DAEDALUS bound applies).
- **Measured (X15).** 27 lanes: every lane returns the identity arm, so the gain is zero on all of them. The token count explains it (`bench/x15/receipts/diaphora-token-economics.jsonl`, o200k): a 4–6 digit run costs 2 tokens and a mark `∆d` with d up to 3 digits also costs 2 tokens; a 7–9 digit run costs 3 tokens. Only runs of 7 or more digits with a small non-negative delta save a token. None of the 27 lanes has such a column with small deltas.

### KLADOS (`src/lib/omega/kladios.ts`, uncommitted)
- Net loss. Its bench files are intentionally not committed.

### HOMOIOS (`src/lib/omega/homoios.ts`, X16, unregistered, measured zero wins on 30 lanes)
- **Mechanism.** Blank-line blocks written as ordered word edits against the nearest earlier block (`[i|a=b|c=d]`, or `[i]` for an exact copy). The reader scans forward for each `a` and replaces it with `b`. Edits come from a word-level LCS diff, anchored so the first forward occurrence is the intended one. Identity-gated on DAEDALUS-D.
- **Relation to earlier modules (read before citing HOMOIOS as new).** This is ANTIPHON (`src/lib/omega/antiphon.ts`, line-level "copy the line d above, replace x by y in order", measured negative on 49 of 49 copy files) at blank-line granularity. The mechanism is not new to this repository.
- **Greedy?** Yes: one pass over blocks; each block takes the best of the top 3 earlier blocks by 3-gram Jaccard. The diff is an exact LCS (dynamic programming, capped at 4 million cells per pair). No search over arms.
- **Citation.** The diff idea is textbook: VCDIFF (RFC 3284, Korn and Vo; COPY and ADD instructions, 2002), and Myers' O(ND) difference algorithm (1986). Not new in the literature.
- **Time/CPU bound.** Quadratic in the number of blocks for the Jaccard prefilter, and O(n·m) per candidate diff (n, m tokens of the two blocks, capped). Plus one DAEDALUS-D encode and one decode per gate.
- **Measured (X16).** 30 lanes (`bench/x16/receipts/homoios-v1.jsonl`): 0 wins. Substitution fired on some lanes (node-stacktraces, ops-git-log-stat, rollup LICENSE, agent-history), and every substituted arm was larger than DAEDALUS-D plain. On agent-history (`bench/x16/homoios-debug.ts`): plain DAEDALUS-D message 293 tokens (about 39 contract, 254 wire); with the 32 edits substituted, the DAEDALUS-D message is 349 (about 39 contract, 310 wire), and the HOMOIOS contract adds 44, so the edits arm is 393. The edit wire is about 56 tokens larger than DAEDALUS's own wire for the same blocks: DAEDALUS already merges the repeated template text, and the edit syntax adds more than it saves. Red team 145/145 (`bench/x16/receipts/homoios-redteam.out`).

### Scanned in X16 from module headers (not re-measured in X16)
- **CTXCOPY** (`ctxcopy.ts`): a span of new text that appears verbatim in an earlier version in the same chat is written as an anchored copy `⟦a…b⟧`. Conditional lane gain only: −75.7% on 81 PyPI release-pair texts in `bench/ctx/ctxcopy-report-2026-10-10.md` (earlier version present); 0% with unrelated earlier text. Not a general gain.
- **ANTIPHON** (`antiphon.ts`): line-level near-copy with edits. Negative (see above).
- **REPAIR-R1** (`repair.ts`): local grammar compression by repeated-bigram substitution. Greedy. Same family as DAEDALUS.
- **TRIE-T1** (`trie.ts`): exact prefix-trie factoring for repeated line families. Overlaps DENS-2 on paths.
- **SPLICE-S1** (`splice.ts`): hierarchical exact coding with a shared phrase dictionary. Overlaps DAEDALUS.
- **PALIMPSEST** (`palimpsest.ts`): write the text several ways, keep the shortest. A portfolio, as in DAEDALUS's arm choice.

## Frontier restatement (X16, re-measured)

Re-run on 28 lanes, one (lane, codec) pair per process, `OMEGA_DET=1`, 420 s cap, two concurrent background processes (`bench/x16/frontier-run.sh`). Table: `bench/x16/receipts/leaders-x16.tsv`. Raw rows: `bench/x16/receipts/frontier-A.jsonl`, `frontier-B.jsonl`.

- Against X15: the four frontier keys (DENS-2, DENDRON, DAEDALUS-D, AKOLOUTHIA-2, A10) reproduce the X15 values exactly on every lane where both runs finished. Three A10 cells time out in X16 (git-numstat, ops-git-log-stat, sp500-200); X15 measured A10 on git-numstat (2214) and timed out on the other two. Every other cell is identical. None of the frontier minima changes.
- Leader counts (ties by first key): DENS-2 15, AKOLOUTHIA-2 7, DAEDALUS-D 6. A10 is never the minimum.
- Change in this turn: LAKONIKOS-D (above) is lower than the frontier minimum on 11 lanes, by 5 to 11 o200k tokens. It is not in `leaders-x16.tsv`, which covers only the X16 frontier keys; the new column is in `bench/x16/receipts/lakonikos-d-registry.jsonl`.

## Frontier restatement (X15, re-measured)

Measured in X15 on 28 lanes with `bench/x15/receipts/leaders-x15.tsv` (one (lane, codec) pair per process, `OMEGA_DET=1`, 420 s cap; two pairs hit the cap and are recorded as `TIMEOUT_OR_ERROR`). Keys: DENS-2 = `dendrons`, DENDRON = `dendron`, DAEDALUS-D = `daedalus-dual`, A10 = `phalanx-a10`, AKOLOUTHIA-2 = `akolouthia2`.

- The frontier leader is DENS-2 on 15 lanes, AKOLOUTHIA-2 on 7, DAEDALUS-D on 6 (ties labelled by first key). A10 is never the minimum except as a tie on one lane. It is not a frontier leader.
- The "PARADEIGMA+DAEDALUS-D (A10)" phrasing in the X13 request does not match the registry: A10 here is PHALANX-A10. No PARADEIGMA+DAEDALUS-D combination was measured.
- Per-category leaders, the full table, and the HEMERA column are in `bench/x15/REPORT.md` (section 2 and 2b).

## Alias tier (the user's language-tier idea, X13)

Not a registered codec. X16 re-ran the same logic on all 28 lanes (`bench/x16/alias-test-28.ts`, receipts `bench/x16/receipts/alias-28.jsonl`), with a same-process plain-DAEDALUS baseline. The X13 script added a 10-token empty "Aliases…" sentence even with no entries; the X16 table sets the delta to 0 on those lanes. Result: one win (de-kb −4), ten ties, and 17 losses (+4 to +104). Measured in X13 on 7 lanes (`bench/z58/alias-test.ts`) (receipts `bench/z58/receipts/alias-test.jsonl`): words of 2 or more o200k tokens are replaced by single-token aliases from other languages, listed in the contract, and DAEDALUS runs on the result. Best lane de-kb: M 491 against 495 (−4). Other lanes: +10 to +15. The DAEDALUS wire shrinks (de-kb 495 → 455), but the alias table costs more than that. Negative for general use.

## Second tier (numerals) for the alias idea (X14, analysis)

The user proposed a second tier of single-number aliases for near-duplicate words. In `alias-test.ts` a tier-1 alias costs one o200k token, and so does a numeral. Entry cost per word is therefore the same for both tiers. The tier-1 pool had 114 candidates and used at most 3 entries per lane, so the pool never ran out, and every word with positive net gain already had an alias. A second numeral tier therefore has no candidates on these lanes. Measured M for tier 1 is in the alias section above.

## ROSETTA (`rosetta`, read for analysis only, not measured here)

`src/lib/omega/rosetta.ts` (4,925 lines) is a span-system codec with notational transposition, templated line families, run-length and progression spans, and a temporal quotient for BASIC timestamps (R4.4). Per the session rules it was read for analysis and is not a baseline in any table of this turn. It has no measurement in this turn.

## X18 addendum: categories, frontier, citations, and claim boundaries

### Local leaders by structure

The table below is deliberately category-level rather than a claim that one codec wins all inputs. `M` is the one-chat o200k count, and “identity” means the candidate declined its transform and used the LAKONIKOS-D incumbent. The six-lane comparator is in `bench/z52/frontier-min.ts`; the 28-lane POLYCHRON receipt is in `bench/polychron/receipts/lanes.jsonl`.

| Local category | Current evidence | Restated leader / boundary |
|---|---|---|
| General prose, KB, email, meeting | POLYCHRON is identity on these lanes; LAKONIKOS-D is the measured incumbent on the 28-lane run | LAKONIKOS-D/DAEDALUS-D family; no new prose gain shown |
| Repetitive paths and directory listings | DENS-2 (`dendrons`) wins the path/list lanes in the existing frontier receipts | DENS-2; only applies when safe brace-tree factoring pays |
| Ops numeric tables | AKOLOUTHIA-2 wins `df-h`, `kubectl`, and `psql` in the current comparator; POLYCHRON declines | AKOLOUTHIA-2; progression-specific, not a general table codec |
| Dated fixed-decimal table | VIX: POLYCHRON 1138, AKOLOUTHIA-2 1369, DENS-2 1394, DAEDALUS-D 1390, A10 1589 | POLYCHRON on this held-out lane; one niche lane is not a universal frontier |
| Other CSV/structured numeric | AAPL: DENS-2 1490 vs POLYCHRON 1587; no POLYCHRON transform. OpenStack: DENS-2 1008 vs POLYCHRON 1052 | Existing DENS-2 / AKOLOUTHIA-2 leaders; POLYCHRON declines when its joint schema does not pay |
| Git/numstat and logs | Git-numstat DENS-2 1904 vs POLYCHRON 2026; OpenStack DENS-2 1008 vs POLYCHRON 1052 | DENS-2 or DAEDALUS-D by lane; no blanket ops claim |
| Bibliography | POLYCHRON 699 vs the best pre-POLYCHRON comparator 709 on the rechecked lane | POLYCHRON is a small local win, not evidence for prose-wide dominance |

### Frontier restatement

The requested pre-POLYCHRON set is **DENS-2 (`dendrons`), AKOLOUTHIA-2 (`akolouthia2`), DAEDALUS-D (`daedalus-dual`), and PHALANX-A10 (`phalanx-a10`)**. The historical 28-lane X16 receipt remains 15 DENS-2 leaders, 7 AKOLOUTHIA-2 leaders, and 6 DAEDALUS-D leaders, with A10 never a unique minimum (one historical tie). The fresh X18 recheck is keyed to those four names and is stored in `bench/polychron/receipts/frontier-recheck.jsonl`; it ran 112 cells with a 90 s per-cell cap, producing 96 numeric cells and 16 explicit timeouts. Among available cells, first-key tie labeling gives DENS-2 13, AKOLOUTHIA-2 8, and DAEDALUS-D 7; A10 has no unique win and appears only in one four-way tie. A timeout is recorded as `TIMEOUT_OR_ERROR`, not treated as a score. POLYCHRON is intentionally not inserted into that pre-existing frontier count. On the fresh representative lanes, POLYCHRON changes the local minimum on VIX and bibliography, so the honest X18 statement is: **the old broad frontier remains DENS-2 / AKOLOUTHIA-2 / DAEDALUS-D, A10 is not a robust leader; POLYCHRON is a new niche fifth arm for typed dated-decimal tables, not a replacement global winner.**

### Six independent mechanism artifacts and unresolved interfaces

These are mechanism-distinct experiments, not six claims of success:

1. **HEMERA** (`src/lib/omega/hemera.ts`, `bench/hemera_decode.py`): calendar-day/time delta state. Unresolved interface: a blind model or external reader must honor the two date/time states and invalid-date rule; broad prose gains are unshown.
2. **STATHMOS** (`src/lib/omega/stathmos.ts`): fixed-width decimal schema. Unresolved interface: mixed-width columns and inputs whose source formatting already discarded zeroes cannot be recovered; its one-chat contract must be followed.
3. **POLYCHRON** (`src/lib/omega/polychron.ts`, `bench/polychron_decode.py`): joint typed table schema. Unresolved interface: direct LLM reading has not been tested, and the date-plus-decimal precondition is narrow.
4. **AKOLOUTHIA-2** (`src/lib/omega/akolouthia2.ts`, existing receipts): two-term arithmetic progression elision. Unresolved interface: numerical position and line-boundary parsing must be exact; non-progressive prose is identity.
5. **DENS-2 / DENDRON-S** (`src/lib/omega/dendrons.ts`): brace-tree factoring of path/dotted lists. Unresolved interface: literal brace/comma/escape cases need the exact escaping dialect; it does not generalize to arbitrary prose.
6. **ANAPHORA-FOLD** (`src/lib/omega/anaphora-fold.ts`, `bench/anaphora_fold_decode.py`): anchored copy-plus-edit blocks. Unresolved interface: interaction with the DAEDALUS grammar and edit anchoring; its gates found no wins in the measured corpus.

### External work checked in the X18 web pass

- Campos, Lee, Kissos, and Paritosh, **Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning**, arXiv:2604.13066 (2026), reports in-context dictionary decoding with the dictionary supplied in the system prompt and uses exact decompression as a proxy; its own setup is not evidence for a no-system-prompt, blind POLYCHRON decode: <https://arxiv.org/abs/2604.13066>.
- Mao, Pirk, and Xue, **Lossless Compression of Large Language Model-Generated Text via Next-Token Prediction**, arXiv:2505.06297 (2025), studies arithmetic/next-token prediction compression of LLM-generated data and reports ratios above 20×; it is a model-probability/storage compressor, not a proof that a chat model can execute this repository's wire protocol: <https://arxiv.org/abs/2505.06297>.
- Furuya, **Practical Repetition-Aware Grammar Compression**, arXiv:1910.13479 (2019), gives an O(n)-expected-time RL-MR-RePair construction and practical encodings. It is prior art for repetitive grammar compression, not for this in-band LLM contract: <https://arxiv.org/abs/1910.13479>.
- Liakos, Papakonstantinopoulou, and Kotidis, **Chimp**, PVLDB 15(11), 2022, is lossless streaming floating-point time-series compression based on XOR/leading-zero structure. It is adjacent prior art for the typed/time-series target, not a direct POLYCHRON precedent: <https://www.vldb.org/pvldb/vol15/p3058-liakos.pdf>.
- Afroozeh, Kuffó, and Boncz, **ALP: Adaptive Lossless floating-Point Compression**, SIGMOD 2024, maps decimal-originated doubles to integers with adaptive fallback. It confirms that decimal-aware exact encoding is an established adjacent family: <https://dl.acm.org/doi/10.1145/3626717>.
- OpenAI's public `math` repository says its catalogue contains manuscripts at different verification stages and that roughly 42% of top-line results are Lean-formalized. Its shortest-common-superstring scope page describes a deterministic polynomial-time factor-two approximation, but the public comparator file I inspected is a challenge-shaped Lean statement containing `sorry`; I did not install Lean or validate the claimed theorem. This is therefore adjacent proof infrastructure, not a proof of POLYCHRON or universal chat decoding: <https://github.com/openai/math>, <https://github.com/openai/math/blob/main/lean/docs/128.md>, <https://github.com/openai/math/blob/main/lean/ComparatorChallenges/Superstring.lean>.
- The public `openai/ten-proofs` repository links ten Lean 4 formalizations and build instructions. I did not install Lean or run any of those builds in this checkout, and no external theorem prover was used for POLYCHRON: <https://github.com/openai/ten-proofs>.

### Negative-space false solutions and detection tests

- **Modal shortcut:** a model sees `※d1`, `@dp`, or a compact wire and guesses the intended dates/zeroes. Detection: run the exact reader on adversarial gaps, negative steps, invalid dates, malformed headers, CRLF, reserved markers, and random bytes; require UTF-8/byte equality, not semantic similarity. POLYCHRON's red team and independent reader are this gate for the codec, not an LLM test.
- **Semantic reconstruction / lossy skeleton:** a plausible sentence or number is not the original bytes. Detection: compare a cryptographic hash or exact string after decoding; reject BLEU, Levenshtein, or “looks right.”
- **Hidden dictionary or skills prompt:** a wire that works only because a system prompt, tool, tokenizer, or prior turn carries the table is not a self-carried codec. Detection: serialize the full contract and wire as one message, start a fresh reader, and disclose the model/tokenizer assumptions.
- **Raw-token win:** comparing wire tokens while omitting the contract, selector, escape, or dictionary is not a one-chat saving. Detection: count `M = tokens(contract + wire + escape/selector)` and gate against the same incumbent.
- **Malformed-prefix consumption:** treating any text beginning with `@dp` as transformed data loses literal inputs. Detection: feed a valid-looking but malformed `@dp` line and a valid-looking identity payload; the reader must return both unchanged. The `header-collision` and `raw-marker-collision` rows cover this.
- **Tournament disguised as a codec:** reporting `min(codec1, codec2, ...)` without emitting a selector and all decoder contracts hides message cost and compute. Detection: list every candidate and count the full contract; POLYCHRON itself compares only two fixed arms and does not claim a free tournament.

### Direct-chat readability claim

**Downgraded, not confirmed.** The POLYCHRON wire is designed to be directly readable from one message because the rules are in-band and no hidden table is required. This repository has verified TypeScript exactness, an independent CPython reader, deterministic output, and token accounting; it has **not** run an LLM, a fresh blind model, or an expert reader against the wire. Therefore “an LLM can decode it from only one chat input with no skills/system prompt” is a protocol hypothesis, not an experimental result. The closest live dictionary-compression paper above supplies its dictionary in a system prompt and validates a decompression proxy, which is materially different.

### Tools and verification receipt

Tools actually used in this X18 continuation: `bash`, `git` local inspection, `npx tsc --noEmit -p tsconfig.json`, Node/esbuild through `bench/x17/run-probe.sh`, Python 3 for the independent reader, `web_search`, and `fetch_page`. No LLM inference, Lean, theorem prover, database, simulator, or Rosetta decode was run. Receipts: `bench/polychron/receipts/redteam.jsonl`, `collisions.jsonl`, `lanes.jsonl`, `independent-cases.json`, `independent-reader.json`, `frontier-recheck.jsonl`.

## Not decoded in this turn

The registry still contains many older keys that were not re-read in X18. This page decodes the frontier codecs, the codecs that appear in `docs/codecs.md`, HORA, STATHMOS, and POLYCHRON. For all remaining label-only keys I make no new claim about greedy/search status or bounds.
