# Codec abbreviations: decoded design spec (X13)

This page decodes the codec abbreviations used in the registry (`src/lib/omega/registry.ts`, 177 keys) into their technical design: the mechanism, whether the encoder is greedy or a search, the source citation, and the time or CPU bound. The companion page is `docs/codecs.md` (measurements and leaders).

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

### LEXIS (`lexis`, X22, shipped)

- **What it is:** reversible junction refolding. Deletes the space after
  `. , ; :` when the next character is not whitespace, because that space is
  derivable; restores it by rule. Non-derivable occurrences (sentence mark
  immediately followed by non-whitespace with no space: `J. L.,`, `3.14`,
  `file.ts`) are rewritten with an adaptive single-token sentinel named in the
  contract.
- **Greedy?** No. The fold is a *total, deterministic* rewrite of every
  derivable junction — there is no selection, no tournament and no scoring
  among junctions. The only search is over (i) which parent codec to wrap and
  (ii) which composition order (`out` vs `in`) — both enumerated exhaustively
  and compared by measured message cost.
- **Honest source-article citation:** none. There is no paper behind this. The
  observation that orthographic junctions are redundant is folklore; the
  derivable/danger partition, the adaptive sentinel, the order-aware contract
  and the completeness gate are original to this repository. The nearest
  literatures are *adjacent but different* and are **not** sources:
  - **Inverse Text Normalization / punctuation restoration** (ASR) — model
    based, therefore *not* byte exact; see the Soniox/NVIDIA/NeMo ITN write-ups
    and arXiv:2102.06380, arXiv:2210.15063.
  - **LLM + arithmetic coding** (Delétang et al., ICLR 2024, "Language Modeling
    Is Compression"; arXiv:2505.06297; arXiv:2604.02343; PMATIC
    arXiv:2601.10678) — genuinely lossless, but requires bit-identical
    conditional distributions at encode and decode. Kipf et al. (CIDR 2026,
    "Waiting to Decompress") state it plainly: deterministic decompression
    requires the exact same weights, tokenizer and preprocessing, and any
    change "even in floating-point arithmetic or token handling" breaks
    lossless reconstruction. A bare chat-message reader cannot supply that, so
    this whole family is **out of contract** for us.
- **Time- or CPU-bound?** CPU-bound and cheap. Per lane it runs the parent
  codec twice (once per composition order) plus O(n) character scans; no
  search, no deadline, no budget stop. It inherits any budget its parent has.
- **Composition:** wraps identity / LAKONIKOS / DAEDALUS / POLYTROPOS. It is a
  *wrapper*, not a replacement: `lexisDecode = parentUndo ∘ unfold` (order
  `out`) or `unfold ∘ parentUndo` (order `in`), and plain `parentUndo` when the
  fold does not ship.
- **Failure mode it is designed to avoid:** deleting all spaces. Measured, that
  *loses* 103 tokens on kb-article because it fragments survivors into
  byte-level tokens (the "tokens-per-byte trap"). LEXIS only ever deletes a
  space that the contract's rule puts back.

### STOICHOS (`stoichos`, X23, shipped)

- **What it is:** derivable-character elimination generalized to a rule family.
  Deletes the space after `. , ; :` (R1), after a line-initial run of `# * + - >`
  (R2), and after a line-initial number plus `.` or `)` (R3), restoring them by a
  single stated rule. Non-derivable sites (`J. L.,`, `3.14`, `#include`) are
  sentinelised.
- **Greedy?** No. The fold is a *total, deterministic* rewrite of every derivable
  site — there is no selection among junctions. The search is over (i) which rule
  family ships (mark / structural / both), (ii) which parent to wrap, and (iii)
  which composition order (`in` / `out`). All are enumerated and compared by
  measured message cost.
- **Honest source-article citation:** **none.** No paper stands behind this; the
  derivability observation is folklore. The danger partition, the shared-clause
  family design, the "mark danger replaces the mark so it is free" encoding, and
  the order-aware contract are original to this repo.
- **Time- or CPU-bound?** CPU-bound. Each candidate runs the parent at most once
  per composition order plus O(n) character scans; no deadline, no budget stop.
  It inherits any budget its parent has.
- **Delegation, deliberately:** the mark fold calls LEXIS's `lexisFold` /
  `lexisUnfold` verbatim rather than a unified re-implementation, because LEXIS's
  has an independent hand-written decoder and a 2759/2759 receipt.
- **Measured outcome:** 28/28 byte exact, **ties LEXIS on all 28 lanes**. See
  `docs/codecs.md` for why — it is a measured negative, not a defect.

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

### STIGME / ΣΤΙΓΜΗ (`stigme`) — new in X19

- **Mechanism (what is new).** Every codec in this repository before X19 removes redundancy that is **present in the payload**: a repeated substring (DAEDALUS, LAKONIKOS), a repeated column (TABMIN, DENS-2), a repeated line shape (AKOLOUTHIA-2), a repeated calendar day (HEMERA, CHRONOS). None of them can fire on the **first** occurrence of anything, because there is nothing in the payload yet to point back to. STIGME attacks the other half of the redundancy: **separators the reader can recompute from a rule that is not in the payload at all.** `2026-10-16` → `20261016`; `T13:53:08` → `T135308`; `2016-10-26 05:56:50` → `2016-10-26 055650` (the "after" clause: once a date has just been seen, a bare 6-digit run is a clock). The rule is bought **once per message** as a clause in the contract (12 / 19 / 24 o200k tokens) and is then free per occurrence. Read as a channel, the decoder's own prior over common literal shapes (`YYYY-MM-DD`, `HH:MM:SS`) is part of the code, and it is paid for at the contract rate rather than at the payload rate. That is the mechanism I had not used in any earlier turn, and it is entirely LLM-native: no reader model with a different tokenizer would know that `20261016` is a date.
- **Why it cannot be a dictionary codec.** No table of dates is transmitted. The clause is content-free. This is the difference from the nearest prior art I found, *Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning* (arXiv 2604.13066), whose dictionary is per-dataset and is itself transmitted on the wire.
- **Where it does *not* pay, and why (the important negative result).** The two layers compete for the same bytes when the separator sits inside a span the grammar already owns. On `find-listing.txt` (120 rows of `2026-09-30T07:59:52.6403938810 …`) the raw text drops 3,997 → 3,277 o200k tokens once the dashes and colons go, but the LAKONIKOS wire of the elided text is **no smaller** than the wire of the original: DAEDALUS was already merging the whole repeated prefix `2026-09-30T07:59:` into one glyph, and removing the punctuation destroys the token alignment that made the merge cheap. The clause layer therefore pays only where the shape **varies** row to row (different dates), which is exactly where the grammar layer is blind. All 28 lanes sort along that single axis. This is now the sharpest measured statement in the repository of why several earlier candidate codecs (ANTIPHON, HOMOIOS, the alias tier) were net-negative: they all re-coded redundancy the grammar already had.
- **Wire.** `${arm.prompt} ${clauses}` where `arm` is the winner of a three-way tournament over LAKONIKOS, LAKONIKOS-D and AKOLOUTHIA-2 run on the **elided** text. The clause line is appended after the wire, so no second contract is introduced and the grammar layer's own contract is untouched.
- **Clauses (verbatim).** date: `8-digit runs that are valid dates become YYYY-MM-DD.` (12 tok) · time: `T+6 digits is HH:MM:SS; T+4 is HH:MM.` (19 tok) · after: `After a date and a space, 6 digits are HH:MM:SS and 4 are HH:MM.` (24 tok). The date clause is rewritten to `YYYY/MM/DD` when the payload uses slashes.
- **Greedy?** The elision is greedy and non-backtracking at the character level: candidates are matched by regex in one left-to-right pass, then any candidate that makes the digit-run grammar ambiguous is dropped by a **revert loop** (re-test full restore, drop the earliest offending candidate, repeat; `dropped` counts the casualties). The three clauses and the three wire arms are each a **gate** (compare a fixed candidate against the identity arm), not a search. So: greedy core, gate outside, no search.
- **Ambiguity handling (the part that makes it exact).** `2026-10-16` → `20261016` is dangerous because a neighbouring float can also present 8 digits: in `vix-daily-1990.csv` the value `20.11011220` is *not* a date (`2026`-style year prefix fails), but some rows do collide. `stigmeElide` therefore simulates the reader: it runs the restore on the elided text and drops candidates until `stigmeRestore(elided) === input` byte for byte. On the measured lanes `dropped` was 0, i.e. on real corpora the ISO shape is unambiguous in context — but the loop is what makes the claim safe rather than lucky.
- **Prior art, after two new searches this turn (this is the honest positioning).** "Delete a predictable character class and let a model put it back" is **not** new; what is new is doing it *losslessly and with no side model*:
  - *Text-Preserving Lossy Text Compression: A Study of Strategic Deletion and LLM Reconstruction* (arXiv 2605.29000) benchmarks exactly this pipeline and lists "punctuation and number removal" as one of its deletion strategies — but the whole setting is **lossy by construction** (its own example reconstructs *general election* → *general Kennedy*).
  - *An Enhanced Text Compression Approach Using Transformer-based Language Models* (arXiv 2412.15250) deletes vowels, LZ-compresses the rest, and regenerates the vowels with a transformer. Also **lossy**. The review of it notes the pattern "could be ported to diacritics … or to punctuation" — nobody reports having done so losslessly.
  - *A Pilot Study of Autocompleting Tokenizers* (arXiv 2608.15080) removes bytes a small byte-LM finds locally predictable and marks each removal by adding 256 to the previous kept byte's token index. **Lossless**, but the decoder is a side model plus a sentinel scheme, not a bare LLM reading one chat message.
  - The dictionary-encoding paper above (arXiv 2604.13066) is lossless and in-context, but transmits the dictionary.
  So the unclaimed corner is: **delete only characters whose positions are *determined* by a fixed shape rule (not guessed), state the rule once, and require nothing but the reader's own prior.** That is STIGME.
- **Citation (short form).** Internal mechanism; the searches above put it in the gap between the lossy deletion-and-reconstruct line and the side-model sentinel line. Closest neighbours, all different: ONTO (arXiv 2604.17512) deletes JSON *keys* schema-once; the dictionary-encoding paper above ships a per-dataset dictionary; rear/front coding (10.1007/s00778-020-00620-x) deletes shared *prefixes* between sorted rows. Separator deletion for tokenometry is, as far as the searches I ran this turn show, unclaimed.
- **Time/CPU bound.** Three grammar encodes per text (LAKONIKOS, LAKONIKOS-D, AKOLOUTHIA-2) on the identity text, three more on the elided text, plus one restore per revert-loop iteration. Measured wall clock under `OMEGA_DET=1` on 28 lanes: 3.4 s to 121 s per lane, dominated entirely by the DAEDALUS-family encodes, not by the elision (which is a single regex pass).
- **Measured (X19, shipped version).** 28 lanes, `bench/x19/receipts/stigme-lanes-v3.jsonl`. 28/28 byte-exact, `dropped = 0` everywhere. Clause fires on 8 lanes; corpus total 30,122 → 29,670 (**−452, −1.5%**), zero losses.

  | lane | wire base | STIGME M | Δ | wire arm / clauses |
  |---|---:|---:|---:|---|
  | sp500-200.csv | 4261 | 4098 | −163 | lakonikos / date |
  | vix-daily-1990.csv | 1369 | 1241 | −128 | lakonikos / date |
  | aapl-2014.csv | 1480 | 1444 | −36 | akolouthia2 / date |
  | svenstaro_miniserve.md | 2989 | 2954 | −35 | akolouthia2 / date |
  | git-log-iso.txt | 1520 | 1489 | −31 | lakonikos-d / date+time |
  | psql-output.txt | 355 | 325 | −30 | akolouthia2 / date |
  | dump.sql | 703 | 678 | −25 | akolouthia2 / date+after |
  | ops-git-log-stat.txt | 3462 | 3458 | −4 | lakonikos / date |

  Ablations: `stigme-lanes.jsonl` (two wire arms, LAKONIKOS pair only, unrestricted year) 30,490 → 30,049; `stigme-lanes-v2.jsonl` (three wire arms, unrestricted year) 30,122 → 29,664.
- **Verification.** Independent CPython reader `bench/stigme_decode.py`: it re-finds the clause sentences in the message by exact string match (so a message that omits a clause is decoded without it), carries the Chiron script table, and re-derives the rules from the "new letter before ¶ starts a rule" contract. **Exact on 4/4 messages it can reach** — vix, sp500, git-log-iso, ops-git-log-stat (`bench/x19/receipts/stigme-msgs/`); the other four firing lanes chose the AKOLOUTHIA-2 wire arm, whose DAEDALUS grammar has no CPython reader in this repository, so they are exact under the TypeScript reader only. That gap is stated rather than papered over. I also decoded a 24-line sample by hand from the message text alone (41 rules, rule by rule) before running any reader; the message and its source are in `bench/x19/receipts/selfdecode/`.

### Scanned in X16 from module headers (not re-measured in X16)
- **CTXCOPY** (`ctxcopy.ts`): a span of new text that appears verbatim in an earlier version in the same chat is written as an anchored copy `⟦a…b⟧`. Conditional lane gain only: −75.7% on 81 PyPI release-pair texts in `bench/ctx/ctxcopy-report-2026-10-10.md` (earlier version present); 0% with unrelated earlier text. Not a general gain.
- **ANTIPHON** (`antiphon.ts`): line-level near-copy with edits. Negative (see above).
- **REPAIR-R1** (`repair.ts`): local grammar compression by repeated-bigram substitution. Greedy. Same family as DAEDALUS.
- **TRIE-T1** (`trie.ts`): exact prefix-trie factoring for repeated line families. Overlaps DENS-2 on paths.
- **SPLICE-S1** (`splice.ts`): hierarchical exact coding with a shared phrase dictionary. Overlaps DAEDALUS.
- **PALIMPSEST** (`palimpsest.ts`): write the text several ways, keep the shortest. A portfolio, as in DAEDALUS's arm choice.

## Frontier restatement (X19, re-measured)

The X18/X16 frontier statement (DENS-2, AKOLOUTHIA-2, DAEDALUS-D, with A10 never minimal) **reproduces and is then beaten**. Re-ran the same 28 lanes with two additions measured end to end in X19: the LAKONIKOS/LAKONIKOS-D/AKOLOUTHIA-2 wire tournament, and STIGME's clause on top of it.

| Step | Sum over 28 lanes | Gain | Source |
|---|---:|---:|---|
| X16 frontier min | 30,149 | — | `bench/x16/receipts/leaders-x16.tsv` |
| + min(frontier, LAKONIKOS, LAKONIKOS-D, AKOLOUTHIA-2) | 29,996 | −153 | `stigme-lanes-v3.jsonl`, `ident` column |
| + STIGME clause | 29,548 | −448 | `stigme-lanes-v3.jsonl`, `M` column |
| + HEMERA where it beats the above (aapl, vix, openstack) | 29,303 | −245 | `bench/z59/hemera-lanes.jsonl` (X14) |

Total **−846 (−2.81%)**. The frontier is no longer a 4-key set: it is now **STIGME (20 lanes) / HEMERA (3) / DENS-2 (2) / ties (3)**, and A10 is still never the minimum on any lane. Per-category leaders and the mechanism that wins in each structural class: `docs/codecs.md`, "Local leaders by structural category (X19)"; the per-lane join is `bench/x19/receipts/leaders-x19.tsv`.

Two caveats that must travel with that number. (1) On 12 of the 20 STIGME lanes the clause is gated off and STIGME's `M` is only `min(LAKONIKOS, LAKONIKOS-D, AKOLOUTHIA-2)`; the clause's own contribution is the −448 above, concentrated on 8 lanes. (2) The leader table is a per-lane minimum over separately encoded codecs, i.e. a **tournament**, which `docs/codecs.md` flags as an unshipped upper bound. Each codec in it is individually gated and byte-exact.

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

## Not decoded in this turn

The registry has 177 keys. This page decodes the frontier codecs, the codecs that appear in `docs/codecs.md`, and HORA. The remaining keys were not read in X13, so I make no claim about their greedy or search status or their bounds.

## MORPHE (`morphe`, X20, exact, **shipped this turn**)

Per-payload auto-fitted shape-rule layer — the generalization of STIGME from a fixed clause menu to
a rule library that fits itself to the payload. See `docs/codecs.md` for the measurement tables and
`src/lib/omega/morphe.ts`.

- **Greedy?** No. Rule admission is greedy, but set **selection is backward elimination** over the
  admitted set. Load-bearing: on `git-log-iso.txt`, `tz+00:00` passes every gate alone and in the
  full set, yet the set is 5 tokens cheaper without it (greedy 1493, eliminated 1488). Rules
  interact through the grammar by partial double ownership; admission cannot see that, elimination
  can.
- **Citation.** Delétang et al., *Language Modeling Is Compression*, ICLR 2024
  (arXiv:2309.10668). Nearest competitor: *Autocompleting Tokenizers* (arXiv:2608.15080), which
  needs a neural model and a sentinel per removal; MORPHE needs neither.
- **Time- or CPU-bound?** **CPU-bound.** One fit pass, ≤ 3 extra encodes for elimination, 3 wire
  tournaments, 1 verify. No clock.
- **The invariant that makes it safe.** A shape rule is a total function the reader applies
  everywhere, so it is admissible only when the payload is **uniform** under it — enforced by a
  per-rule precondition, not by sampling.

## SYZEUXIS (`syzeuxis`, X21, exact, **shipped this turn**)

The column-major conjunction — KIONES's transposition × MORPHE's auto-fitted shape rules, measured
against each other instead of assumed. See `docs/codecs.md` for the measurement tables and
`src/lib/omega/syzeuxis.ts`.

- **Greedy?** No — a seven-arm tournament (`row-morphe`, `row-eidos`, `row-aion`, `col-bare`,
  `col-morphe`, `col-eidos`, `col-aion`), cheapest byte-exact arm ships, all arm token counts
  exposed in `armTokens`. Forced to be a tournament by the X20 result that `tz+00:00` passes every
  gate in the full set yet costs +5.
- **Citation.** Iachnyk et al., *The Case for Synthesized Data Compression* (arXiv:2610.09913,
  Oct 2026) — synthesize a codec per dataset and verify it at construction time; that is what our
  byte-exact gate does. Brevis (arXiv:2608.02162) for compression-as-program-synthesis.
- **Time- or CPU-bound?** **CPU-bound.** Seven encodes, no clock. MORPHE dominates the cost.
- **Honest negative.** The transposition helps shape/grammar mechanisms and hurts sequential ones
  (delta, invariance), because the two want opposite column orders. `col-morphe` wins on a clean
  table (vix 1129 → 906) and loses on logs.

## PSEPHOS (`psephos`, X24, exact, **shipped this turn**)

Digit-lattice collapse — the observation that a BPE tokenizer charges a **separate token** for
punctuation living *inside* a number, and that such punctuation is a pure function of the digits.
`"2026-08-14"` costs 6 tokens, `"20260814"` costs 3. That is ~3 tokens per site, against LEXIS's
~0.27, because the space LEXIS deletes is normally absorbed into the following word token whereas
an intra-number hyphen or colon is a token of its own. See `docs/codecs.md` for the 28-lane table
and `src/lib/omega/psephos.ts` for the implementation.

- **Greedy?** No — a tournament over **4 parents × 2 composition orders × 3 ambiguity modes**, and
  crucially the **uncollapsed parent is always a candidate**, so the arena includes "do nothing".
  Within a format the mode is chosen by *counting* (`escape` costs one sentinel per bare run,
  `mark` costs one per collapsed number) and the sentinel is chosen by *verification*, not by
  preference: the pool is walked and each candidate is checked against the finished text for
  SENTINEL LEAK; if none is safe, the format is **skipped entirely**. Nothing ships without a
  byte-exact round trip measured on the actual text.
- **Citation.** **None — original to this repository, as far as I could determine.** I searched
  specifically for prior art on number tokenization cost and on reversible number reformatting and
  found the *cost* well documented but the *codec* not. The nearest published neighbours are
  different in kind: Harvill et al. / LTSC (arXiv:2506.00307) and the dictionary-encoding follow-up
  (arXiv:2604.13066) replace repeated *subsequences* with meta-tokens and prepend a dictionary —
  that is our parent's mechanism, not this one; CompactPrompt (arXiv:2510.18043) has a "Numeric
  Quantization" stage but it is **lossy** by design (user-specified error tolerance); the
  text-skeleton work (arXiv:2605.29000) is likewise explicitly lossy. The general fact that
  tokenizers split numbers expensively is documented in tokenizer primers (e.g. theneuralbase.com
  and zeroentropy.dev tokenization pages) and in the number-representation literature (xVal;
  BitTokens, "Efficient numeracy in language models through single-token number embeddings"), but
  none of those proposes or evaluates deleting and restoring the separators as an **invertible**
  transform. If PSEPHOS turns out to be a rediscovery, the novelty claim collapses to the
  ambiguity guard (F1/F2/F3 below), which I have not seen stated anywhere.
- **Time- or CPU-bound?** **CPU-bound.** Two linear passes per format (match, then collapse), plus
  one parent encode per candidate order. No clock, no search, no sampling, no backtracking. Wall
  time on the 28-lane sweep was ~2.5 h on 2 cores, essentially all of it inside the parent's
  grammar search.
- **The contribution is the guard, not the two formats.** Collapsing is only valid if the reader
  can distinguish a collapsed number from one that was always bare:
  - **F1 MERGE** — a candidate whose neighbour is a digit would fuse into a longer run and lose
    its identifying width. Skipped.
  - **F2 COLLIDE** — the text already has a bare run of that width (in `aapl-2014.csv` the
    fractional part of `77.44539475` is exactly 8 digits). Resolved by the cheaper of `escape`
    (mark the bare runs) or `mark` (mark the collapsed ones).
  - **F3 SENTINEL LEAK** — the sentinel, or a sentinel+run pair, already occurs where the decoder
    would read it. Resolved by walking the pool and verifying; else the format is dropped.
- **Honest negatives.** 21 of 28 lanes gain nothing — 8 because the source has no
  `YYYY-MM-DD`/`HH:MM:SS` at all, 13 because the collapse was measured and **rejected** as not
  worth its own contract clause. `aapl-2014.csv` has 240 dates and gains exactly 0. Three tempting
  formats are refused outright as non-invertible: thousands separators, dotted quads, semver.


---

## AETOS — **A**daptive **E**ncoding of **T**oken-**O**ptimizing **S**eparators (X25)

`src/lib/omega/aetos.ts`, registry key `aetos`, family `exact`, fidelity `exact`.

PSEPHOS, generalized. PSEPHOS established the law and then shipped only two instances of it,
chosen by hand; AETOS asks what the law's *domain* actually is and replaces the hand choice with a
latttice that is read off the document. The law:

> A BPE tokenizer charges a separate token for punctuation that lives **inside** a number, even
> though that punctuation is a pure function of the digits once the format is known.

    "2026-08-14"   6 tokens      "20260814"   3 tokens
    "00:02:05"     5 tokens      "000205"     2 tokens
    "1.2.3"        5 tokens      "123"        2 tokens
    "192.168.1.1"  7 tokens      "19216811"   4 tokens

PSEPHOS shipped `date8` (YYYY-MM-DD) and `time6` (HH:MM:SS), and explicitly **refused** thousands
separators, dotted quads and semver as "not invertible". That refusal is the specific use case
X25 set out to generalize, and the generalization turns on one predicate:

**A shape is invertible by a fixed-width rule iff every occurrence in the document has the same
digit-group width vector.**

`1.2.3` and `10.20.30` in one document have no single restoration rule — a bare `4`-digit run and
a bare `6`-digit run both occur, and no width test separates them from collapsed neighbours. But a
document in which *every* dotted triple is `d.dd.d` collapses all of them to 4 digits, and
`"expand 4 digits to d.dd.d"` restores them exactly. PSEPHOS could not see this because both of
its formats were constant by construction, so the predicate was invisible.

So AETOS's shape set is:

- **Fixed tier (4).** The timestamp shapes that recur across engineering text: `YYYY-MM-DD`,
  `HH:MM:SS`, `YYYY-MM-DDTHH:MM:SS`, `YYYY-MM-DD HH:MM:SS`.
- **Learned tier (28).** Every shape `k` digit groups joined by one separator, for `k` in 2..5 and
  separator in `{ . , : - / _ SPACE }`. Each is scanned, and admitted only on constancy of the
  width vector and at least two matches.

**Invariants.** PSEPHOS's three, re-verified on every emitted wire, plus one new one:

- **F1 MERGE** — a candidate touching a digit outside itself would fuse into a longer run and lose
  its identifying width. Skipped.
- **F2 COLLIDE** — a bare run of that width already exists. Resolved by the cheaper of `escape`
  (mark the bare runs) or `mark` (mark the collapsed ones); if no sentinel is safe, the shape is
  **disabled** rather than risked.
- **F3 SENTINEL LEAK** — the sentinel already occurs where the decoder would read it. Pool is
  walked and each candidate verified.
- **F4 WIDTH-UNIQ (new)** — two enabled shapes may never share a digit width, or the decoder
  cannot tell which template to apply. Best-scoring shape per width survives.

- **Greedy?** **Both, and it matters.** The *shape set* is chosen by a greedy search scored on the
  real objective `countTokens(wire) + countTokens(contract)` — most-frequent shape first, keep it
  only if the measured total strictly drops, and the **empty set is the incumbent** so the codec
  can never lose to doing nothing. Within a shape, mode and sentinel are chosen by *counting* and
  then *verification*, never by preference. Nothing ships without a byte-exact round trip measured
  on the actual text.
- **Citation.** **None — original to this repository, as far as I could determine.** The
  surrounding literature is about *different* transforms. On the lossless-prompt side, LTSC
  (Harvill et al., arXiv:2506.00307) and the training-free dictionary-encoding follow-up
  (arXiv:2604.13066, 60–80% compression, >0.99 exact match) both replace repeated *subsequences*
  with meta-tokens — that is AETOS's **parent's** mechanism (POLYTROPOS/CHIRON), not AETOS's.
  LoPace (arXiv:2602.13266) reports 72.2% space savings but its **token** method reaches only
  1.02×, and it is byte-level, not decoder-free. LLM-driven arithmetic coding
  (arXiv:2505.06297, 14.62–23.80×; Nacrith arXiv:2602.19626; PMATIC, ICLR 2026; Kipf, CIDR 2026)
  is excluded by our one-chat-message contract: it needs byte-identical `P(x_t|x_{<t})` at both
  ends, i.e. identical weights, tokenizer and preprocessing. The **closest** new source found this
  turn is Zheng et al., "Broken Tokens? Your Language Model can Secretly Handle Non-Canonical
  Tokenizations" (NeurIPS 2025, arXiv:2506.19004): it shows instruction-tuned models retain up to
  93.4% performance under randomly sampled non-canonical tokenizations — which *supports* the
  premise that a wire is decodable from a single message, but it studies robustness, not
  compression, and reports no codec. Also relevant: arXiv:2402.01035 §D deliberately forgoes all
  pre-tokenization normalization "to keep our tokenization scheme perfectly reversible" — the same
  reversibility constraint that drives F1–F4, arrived at from the opposite direction.
  I found **no** prior work that deletes intra-number separators and restores them as an
  invertible, decoder-free transform, and none that learns the shape set per document.
- **Time- or CPU-bound?** **CPU-bound.** 32 linear scans of the text (4 fixed + 5 group-counts ×
  7 separators, minus 3 that coincide) plus one O(n) pass per enabled shape, plus one parent encode
  per candidate order. No clock, no sampling, no backtracking, no search over the wire. Wall time
  is dominated by the parent's grammar search, not by AETOS.
- **Honest scope.** AETOS is a **breadth** generalization, not a large step. Its extra shapes are
  found only in documents that actually contain them, and the greedy search drops any shape whose
  clause costs more than the tokens it saves. On documents with only dates and times it reduces to
  PSEPHOS exactly. Measured on the 28-lane holdout — see the X25 table in `docs/codecs.md`.


---

---

## SYMPLOKE — **SY**ntactic **M**erging of **PL**ain **O**bjects into a **K**notted **E**ncoding (X26)

`src/lib/omega/symploke.ts`, registry key `symploke`, family `exact`, fidelity `exact`.

### What it is

AETOS, with its **contract braided into one sentence** instead of paying a whole new sentence per
rule. This is a *cost-model* codec: it changes no byte of the wire AETOS emits for a given shape
set. It changes only what the decoder is told about it.

### The design (decoded from the abbreviation)

- **SY**ntactic — the mechanism is syntax of the *instruction*, not of the data. Every rule the
  decoder needs is already implied by the first sentence; each later rule is expressed as a
  **conjunct** of that sentence rather than as a sentence of its own.
- **M**erging — the digit rule and each sentinel rule are merged into the parent's expansion
  clause. `expand repeatedly and 8 digits become YYYY-MM-DD, where ^ before digits marks them;
  drop it`.
- **PL**ain **O**bjects — the facts merged in are the plain objects of the scheme: digit widths,
  templates, sentinels. Nothing semantic, nothing learned.
- **K**notted — the result is one knotted sentence with several clauses, not a list.
- **E**ncoding — exact, byte-for-byte.

### Greedy?

**No — greedy search, not greedy compression.** Same architecture as AETOS: the shape subset is
chosen by a greedy hill-climb scored on the real objective `countTokens(wire) +
countTokens(contract)`, with the **empty shape set as the incumbent** so a shape that cannot repay
its own clause is never shipped. The contract is re-derived per trial rather than inherited from
the parent, because the contract is a function of the wire.

### Source article

**None.** Original to this repository. The closest external neighbours are named below and are
*not* sources — they were found after the mechanism was built and measured:

- `doi:10.3390/a13040103` (Algorithms 2020) — MR-RePair, RePair on maximal repeats instead of
  pairs. Measured here as a *wire-side* alternative and rejected (see codecs.md §X26).
- `arXiv:2504.19395` (ICL Ciphers) and `arXiv:2508.10235` — LLMs in-context-learn bijective
  substitution tables. External *evidence that the wire is learnable*, not a source of the design.

### Time- or CPU-bound?

**CPU-bound, and measurably not time-bound.** The search is a greedy scan with a per-call budget
(`OMEGA_DET=1` for determinism). `bench/x26/budget.ts` ran lane 0 (kb-article) at 25 s, 60 s and
150 s and got the **identical wire** at 7 s — the search saturates, so a larger budget buys
nothing and wall time is not a quality knob here. Wall clock is dominated by `polytroposEncode`
(~8 s/call floor, minutes on 20 KB lanes), not by SYMPLOKE's own work.

### Contract cost ladder (o200k_base, measured)

| contract | tokens | vs AETOS |
|---|---|---|
| AETOS parent clause, no shapes | 25 | — |
| SYMPLOKE base, no shapes (nested) | 20 | **−5** |
| SYMPLOKE base, no shapes (flat tape) | 19 | **−6** |
| + one digit shape | 28 | −2 vs appended |
| + one digit shape + one sentinel | 38 | −5 vs appended |
| + two digit shapes + one sentinel | 46 | — |

Every lane pays the base, so **every lane saves at least 5**, including prose.

### Guards forced by measurement

1. **Every shape restates its own width.** A draft that let later shapes ride on the first one's
   verb emitted `8 digits become YYYY-MM-DD, dd:dd` — 2 tokens cheaper, silently undecodable. The
   TypeScript round trip cannot see this; `bench/x26/selfdecode.py` rejects it.
2. **No tape ⇒ no grammar sentence.** With the `identity` parent the wire carries no glyph tape;
   emitting the clause anyway turned `git-log-fuller` from 143 → 162.
3. **Nesting is detected, not assumed.** If no rule's expansion references an earlier glyph the
   contract says `expand`, not `expand repeatedly`. Undetectable ⇒ over-claim (safe).

---

## METATHESIS — **MET**hodic **A**lphabet **T**ransposition for **H**ierarchical **E**ncoded **S**ymbol **I**nternal **S**ubstitution (X27)

`src/lib/omega/metathesis.ts`, registry key `metathesis`, family `exact`, fidelity `exact`.

### What it is

SYMPLOKE, followed by a **relabelling of the glyph alphabet**. It does not add,
remove or change a single rule. It only changes *which pool character stands for
which phrase*.

### The mechanism (decoded from the abbreviation)

- **MET**hodical — the search is a systematic hill-climb, not a heuristic guess.
- **A**lphabet **T**ransposition — the object being searched is the bijection
  `rule -> pool character`, i.e. a permutation/transposition of the alphabet.
- **H**ierarchical **E**ncoded — it operates on the output of an existing
  hierarchical (nested) grammar, preserving all nesting.
- **S**ymbol **I**nternal **S**ubstitution — the substitution rewrites tape
  heads, nested references inside other rules' payloads, *and* body occurrences
  consistently.

### Why it works — the run-level cost model

Every earlier codec priced a glyph at a flat ~0.801 tokens per body occurrence.
That figure is the **mean of a bimodal distribution**, and the bimodality is the
whole opportunity (measured, `bench/x27/econ.ts`):

    T("ених") == 1 token      three glyphs, ONE token
    T("әм")   == 1 token      two glyphs,  ONE token
    T("е")    == 1 token      one glyph,   ONE token

A run of *k* adjacent glyphs costs about the same as one glyph, because
o200k_base carries vocabulary entries for word-like sequences inside a script.
**The unit of cost is the RUN, not the glyph.** Which character represents which
phrase decides which glyphs end up adjacent, and therefore how many runs the
tokenizer can swallow.

Magnitude of the effect, on kb-article (27 rules, wire 612):

| assignment | wire tokens |
|---|---|
| parent's (relayout-refined) | 611 |
| best of 300 random permutations | 665 |
| contiguous prefix of the pool | 682 |

### Greedy?

**Greedy hill-climb with random restarts, not greedy compression.** Morphology:

1. **Pairwise SWAPS.** Once every good character is taken, the only improving
   move is an EXCHANGE between two rules. A reassign-to-free-character search
   cannot express that and finds almost nothing (measured: 0 on readme).
2. **Reassign to an unused pool character.**
3. **Random-restart perturbation** of a third of the assignment, then re-descend.

The search never ships a regression: if it finds nothing better than the
parent's own wire, it returns that wire unchanged.

### Determinism

**Deterministic.** `clock.ts` holds `now()` at 0 under `OMEGA_DET=1` so searches
run to their natural end; a wall-clock deadline can therefore never fire. So the
budget is counted in **tokenizer evaluations** (`maxEvals`), which is
machine-independent, and the restart randomness comes from a **seeded mulberry32
PRNG** keyed on the wire rather than from `Math.random`. Verified: three
consecutive runs on llm-answer / openstack / dump.sql produced byte-identical
wires (`bench/x27/det.ts`).

### Source article

**None — original to this repository.** The closest external neighbours were
found *after* the mechanism was built and measured, and are evidence, not
sources:

- `arXiv:2610.01984` (2026-10-02) — "Universal Byte-Level Encoding: UTF-8/UTF-16
  Routing". Defines the **encoding floor**: "when no learned merges can be
  applied, a multibyte character requires multiple byte-derived symbols." This is
  the formal statement of why some pool characters are cheap and others dear.
- Kozma & Voderholzer, "Byte-pair encoding can lose more than half of the
  optimal compression" (`alphaxiv.org/abs/2610`) — BPE achieves between 1/3 and
  0.4323 of optimal compression utility in the worst case. Bounds any approach
  that, like ours, is ultimately priced by a BPE vocabulary.
- `arXiv:2306.16837` — "A Formal Perspective on Byte-Pair Encoding", lower bound
  on greedy BPE compression utility `1 - e^(-σ(μ*))`.

### Time- or CPU-bound?

**Bound by a deterministic evaluation budget (`maxEvals`), not by wall-clock
time**, because the repo freezes the clock for reproducibility. The budget is
`min(400_000, 40_000 + rules² × 12)` tokenizer calls. Cost concentrates on
lanes with many rules, which is also where the gain is. **Final 28-lane sweep —
28/28 byte-exact, 23 improved, 5 tied, 0 regressed, net −309 (−1.048%).**
Full frontier: raw 62954 → AETOS 29683 → SYMPLOKE 29492 → **METATHESIS 29183.**

| lane | rules | gain | lane | rules | gain |
|---|---|---|---|---|---|
| ops-git-log-stat | 203 | **−87** | csv-8 | 81 | −21 |
| sp500-200 | 212 | **−54** | vix-daily | 63 | −17 |
| svenstaro | 110 | −31 | openstack | 65 | −18 |
| git-numstat | 105 | −13 | aapl-2014 | 67 | −10 |
| find-listing | 59 | −8 | bibliography | 44 | −8 |
| kubectl-get-pods | 41 | −8 | dump.sql | 47 | −6 |
| git-log-iso | 51 | −9 | email-thread | 39 | −4 |

Against the X27 prediction (made before the sweep finished) that the effect is
"ops-leaning, not prose, scaling with rule count": the rule-count scaling held
(r = clear monotone trend, 212 rules → −54, 203 → −87, 110 → −31, 27 → −1,
6 → 0), but the category prediction was **wrong — it is not category-specific
at all.** csv-8, aapl-2014, sp500-200 and vix-daily are pure CSV tables and
four of the eleven largest wins. The true predictor is **rule count**, which
is a proxy for how much of the text the grammar captured, not what kind of text
it is. Prose lanes are simply the low-rule-count ones (meeting-transcript 6,
de-kb 21, readme 27, kb-article 27 → all ≤ −1).

Wall-clock: dominated by the parent on prose; the relayout search itself is
superlinear and varies wildly at equal rule count (dump.sql, 47 rules, took
~4 min; csv-8, 81 rules, finished in under a minute). Bounded by `maxEvals`,
not by time.

### What is provably preserved

For any injective map `A` from the parent's glyphs to distinct same-script
characters absent from the payload, `decode(relabel(wire)) === decode(wire)`.
Correctness is therefore **independent of the search**: a search bug can only
cost tokens, never corrupt a message. Confirmed empirically — the X26
independent from-spec decoder runs against METATHESIS wires **unchanged**.

## SYNTOMOS (σύντομος, "abridged, cut short") — X28

The abbreviation decodes as: **SYN**tactic **T**rimming **O**f **M**essage
**O**verhead **S**pecifications. The mechanism is *feature-matched minimal
instruction*: the contract is not a constant, it is the cheapest wording that
covers the features a given wire actually needs.

**Is it greedy?** The contract choice is **not** greedy and not approximate — it
is an exact minimum over a finite enumerated ladder, scored with the real
tokenizer. The de-nesting decision is a two-arm tournament on a measured
objective. The inherited layers differ: POLYTROPOS's rule search is greedy,
SYMPLOKE's shape selection is explicitly greedy (documented in its source), and
METATHESIS's relabelling is a hill climb.

**Time- or CPU-bound?** **CPU-bound.** Every step is a finite enumeration; the
codec consults no wall clock. *(Caveat: the parents it calls DO consult
`Date.now()` internally, and `OMEGA_DET` does not stub it — see I.1 in
`docs/codecs.md` X28. That is a pre-existing defect, not a property of SYNTOMOS.)*

**Source article: none — original to this repository.** The feature
decomposition of the instruction clause, the nesting-gated REPEAT, and the
prefix-rewrite splicing rule are all new here. Published work is *motivation*
rather than source:
- **arXiv 2107.00446**, "Compression by Contracting Straight-Line Programs"
  (2021) — an SLP of size `g` can be rebalanced to derivation height `O(log N)`
  at size `O(g)`. This is why derivation depth was measured; it turned out to be
  already 1–5, so no balancing was needed.
- **Maruyama et al., SPIRE 2013** (via "A Succinct Grammar Compression") — an
  SLP with `n` symbols needs at least `2n + log₂(n!)` bits. A real floor for the
  tape, and unreachable by an LLM because it is bit-level.
- **arXiv 2605.22705**, "Tokenization with Split Trees" (2026) and **arXiv
  2603.25340**, "LLM as Token Compressor and Decompressor" (2026) — the two
  AI-native routes we deliberately do NOT take (we cannot change the decoder's
  tokenizer, and we may not train a compressor).

**Result: 28/28 byte-exact, 27 improved, 1 tied, 0 regressed, net −81 tokens
(−0.278%).** raw 62954 → SYMPLOKE 29492 → METATHESIS 29172 → **SYNTOMOS 29091**
(53.79% removed). The gain is a *constant 3 tokens per message*, so it is worth
proportionally most on the shortest inputs — the opposite of X27, whose gain
scaled with rule count.

**The one-token barrier (the theoretical result).** For any string `W` with
`T(W) = 1`, introducing a glyph costs ≥ 2 tape tokens and saves `T(W) − 1 = 0`
per occurrence, so `net = −2` for every occurrence count. **No single-token
string can ever be profitably dictionary-coded.** English prose is mostly
single-token words, which is why the coverage probe found zero profitable
multi-token candidates on kb-article, and why all 27 of that lane's rules have
`T(W) = 1`. This explains the gap to gzip (which reaches 43–56% on prose where
this stack retains 76–96%) without contradicting it: the redundancy is real, but
an LLM-executable *dictionary* cannot reach it.

## συγκοπή SYNKOPE (X29)

**What it is.** SYNTOMOS with the shape clause of the contract compacted. The wire is
byte-identical to SYNTOMOS; only the instruction text changes.

**Greedy?** No. Rungs are applied one at a time and each is kept only if it strictly lowers
the token count of the whole message, so the result is monotone against SYNTOMOS by
construction.

**Time/CPU bound?** The rewrite is O(len(contract)) with no search of its own. The encode is
SYNTOMOS's, which is budget-bounded by POLYTROPOS. SYNKOPE adds no search and therefore
cannot change the wire or the encode time.

**Honest citation.** None. The substring contractions are plain English editing. The finding
that the contract is the binding term on short messages is ours (`bench/x29/micro.ts`). The
nearest external framing is arXiv 2607.06145 ("Prompting Complexity", the shortest plausible
prompt s.t. f deterministically outputs t), which is the right yardstick for this object and
which provably has no model-independent invariance theorem — so the token counts are
o200k_base counts, not universal ones.

**Result.** −2 tokens on dump.sql, 0 on the other 27 lanes. Does not meet the standing bar.
See `docs/codecs.md` X29 for the eight null results that are the turn's real content.

## τάχος TACHOS (X30)

**What it is.** Two things, only one of which is compression.

1. **A tokenizer memo (the real contribution).** `countTokens` had a chunk cache
   but the `text.length < 24` early return bypassed it. Instrumented on a 3.4 KB
   prose encode: 2,240,610 calls, 2,190,308 of them short, only 98,806 distinct
   — 95.5% redundant. The memo is keyed by encoding + the entire string, so it is
   exact by construction and can only change timing, never a number. Measured:
   countTokens 18.9 s -> 5.6 s (3.4x), whole encode 25.6 s -> 13.8 s (1.85x),
   message byte-identical.
2. **A second selection arm.** The contract is a fixed tax paid once, so a greedy
   scoring each candidate against the current total demands that the *first* rule
   retire the whole tax. Measured on two fresh prose files: with the tax charged
   the search accepts 0 rules and ships identity; with it waived the same search
   finds 10 and 8 rules. TACHOS runs the waived objective as an extra arm and
   keeps the shorter message, retaining identity and the parent as candidates so
   it is monotone against SYNKOPE.

**Greedy?** The tournament is an exact minimum over {identity, SYNKOPE,
bootstrap} scored by the true tokenizer on the true message — not greedy. The
rule search inside each arm is greedy; that is what is being compared, not what
is being fixed.

**Time/CPU bound?** Yes, doubly: the memo is bounded at 2M entries and cleared on
overflow; the bootstrap arm is capped at 64 rules. The parent encode is
budget-bounded by POLYTROPOS.

**Honest citation.** None — both parts are measurements made in this repo
(`bench/x30/prof3.ts`, `bench/x30/micro.ts`). The closest external framing for
what the contract *is* remains **arXiv 2607.06145** ("Prompting Complexity"),
which provably has no model-independent invariance theorem, so every token count
here is an o200k_base count. The two results that bound the whole programme:
**arXiv 2505.06297** (LLM+arithmetic coding concedes in §4.4 that LLM inference
is not deterministic across runs, so the losslessness guarantee fails) and
**arXiv 2601.10678** (PMATIC exists to tolerate exactly that mismatch).

**Result.** Speed: 1.85x end-to-end, 3.4x tokenizer, exact by construction.
Compression: −3 tokens on fresh out-of-sample prose (converts two files from 0%
to 0.4% compression); see `docs/codecs.md` X30 for the 28-lane numbers.

## εὕρεσις HEURESIS (X31)

**What it is.** A search-budget codec, not a wire-format codec. SYNTOMOS builds
its glyph alphabet by merging character pairs into single-token glyphs; a set of
disjoint merge pairs can be realised by many different pair→glyph **assignments**,
and the assignment is not cosmetic — it decides which substrings become glyph
strings and therefore the entire tape.

`renderBest` (`ariadne.ts`) cannot try all assignments, so it ranks candidate
scripts by merge-edge count and keeps the top `scriptTries`:

```
for (const cand of cands.slice(0, o.scriptTries ?? 2)) { ... }
```

`sibyl.ts` supplies that budget at three call sites, hardcoded **3 / 2 / 3**.
Nothing had ever varied it. HEURESIS raises all three to a floor of **4**.

**Why widening is safe by construction.** All three sites keep a *running best*
across the candidates they try, so a wider budget cannot lose a candidate that
was already found. It can only add. This is the property that makes the change
monotone at the level of a single site.

**Greedy or not?** The codec is **not** greedy — it widens the candidate set of
an existing greedy search rather than replacing the objective, and the final
selection is `min` over arms scored by the true tokenizer on the true message.
The rule search *inside* each arm remains greedy; that is what is being searched
more completely, not what is being replaced.

**The one non-obvious result: higher is not better.** At `tries=8`, ls-full-iso
goes **373 → 374** — it gets *worse*. Extra renders consume the lane's own
search budget and starve the rule search downstream, and that loss exceeds the
script gain. `tries=4` is the measured saturation point: complete script search
that has not yet started to crowd out its neighbours.
Widening a search *blindly* is not a win; widening it to saturation is.

**Measured** (`bench/x31/tries.ts`, `tries2.ts`, `e2e.ts`, `heur.ts`; every wire
byte-exact):

| lane | TACHOS (2/3) | HEURESIS (4) | Δ |
|---|---|---|---|
| find-listing.txt | 1281 | **1272** | **−9** |
| readme.txt | 655 | **652** | −3 |
| prose-01.txt | 745 | **743** | −2 |
| kb-article.txt | 628 | 628 | 0 |
| meeting-transcript.txt | 389 | 389 | 0 |
| prose-09.txt | 759 | 759 | 0 |
| git-log-fuller.txt | 143 | 143 | 0 |
| ls-full-iso.txt | 373 | 373 | 0 |
| prose-03.txt | 843 | 843 | 0 |
| prose-11.txt | 804 | 804 | 0 |
| email-thread.txt | 494 | 494 | 0 |

11 lanes, 3 improved, **0 regressed**, −14 tokens on the 6-lane subtotal.
Cost: **+3% encode time** (232 s → 239 s over that subtotal).

**Time/CPU bound?** Yes. The budget is a small integer (4), not a loop bound, so
it multiplies existing bounded work by a constant — three renders instead of two
at each of three sites. No new unbounded search. Encode time is 8.6 s – 136 s per
lane on this corpus (1.2–11.5 KB), consistent with the family.

**Honest citation.** None — this is a measurement made in this repo
(`bench/x31/`). The framing that makes it non-obvious is that the budget is a
**search-completeness parameter whose saturation point is empirically finite**,
which is the ordinary situation in combinatorial search; no external source is
claimed. The programme-level bounds remain **arXiv 2607.06145** ("Prompting
Complexity", which provably lacks a model-independent invariance theorem, so
every count here is an o200k_base count) and **arXiv 2505.06297** (LLM +
arithmetic coding concedes in §4.4 that LLM inference is not deterministic, so
the losslessness guarantee fails).

**External corroboration — first out-of-repo evidence at our ratios.**
**arXiv 2604.13066** [1](https://arxiv.org/abs/2604.13066) (Amazon, 2026-03-19)
is the first external paper found that does what this programme does: replace
repeated subsequences with meta-tokens, ship the dictionary in the prompt, and
rely on in-context learning alone. Measured on LogHub 2.0 with Claude 3.7
Sonnet: **exact match > 0.99 (template-based) and Levenshtein similarity > 0.91
(algorithmic) at 60-80% compression**. Our LogHub-family lane
(`openstack-loghub-26.log`) retains 23.7%, i.e. **76.3% compression — inside
their validated band**. Caveat that matters: their "lossless" is exact-match on a
decompression proxy, not byte-identical round trip, and their algorithmic track
is ~9% of characters wrong. It corroborates **feasibility at our ratios**, not
the correctness of our wires.

Also new and previously uncited here: **arXiv 2601.17684** (Huffman-like
mismatch-tolerant coder, relaxes PMATIC), **arXiv 2607.24192** (thresholded
symbol ranking; requires a deterministic predictor), **arXiv 2608.11249**
(diffusion LMs — the encoded-position set becomes a design choice; the most
structurally novel mechanism found this turn but unusable with a frozen chat
decoder), **arXiv 2601.17768** and **arXiv 2609.25624** (attack LLM inference
non-determinism directly).

### X31 negative space (measured, all rejected)

1. **Memoizing the glyph-assignment evaluation — DEAD.** `runCostPrepared` is
   27% (kb-article) / 56% (email-thread) / 70% (ls-full-iso) of a whole encode,
   called 300 K–2 M times per file, scanning 20–115 M patterns. A whole-assignment
   memo keyed on every rule's glyph in ascending rule-id order gave a measured hit
   rate of **0.6–2.5%**, not the 83–94% a first estimate claimed. Zero speedup;
   reverted. *The cost is in the scan, not in repeat evaluation.*
   The first estimate was wrong because it built its key by iterating
   `assign.values()` — Map insertion order, not rule order — which conflates
   distinct assignments.
2. **Raising the time budget — DEAD.** 20 s and 60 s reproduce the default
   exactly on ls-full-iso, prose-03 and prose-11. The pipeline is not
   budget-starved at the top level.
3. **Widening the word/phrase rule grid — DEAD.** `wordGrid [24,48,96]`,
   `[12,24,48,72]` and `capGrid [16]` all reproduce the default byte-for-byte.
4. **Ungating the X30 bootstrap arm — DEAD.** Run unconditionally it never wins
   outside its gate and costs 20–50% extra runtime on lanes ≤ 6000 chars.
   The X30 gate is correctly tuned.

## τίμημα TIMEMA (X32)

**What it is.** The contract is a token string, and every prior turn priced it
in English prose. TIMEMA reprices it in notation.

X29 (`bench/x29/ctok4.ts`) tested seven rewordings of the contract head against
the four real SYMPLOKE tails and recorded a flat plateau:

> ALL of them cost the same number of tokens (17/17/17, 25/25/25, 43/43/43).
> BPE merges put the instruct wording on a flat plateau, so paraphrasing the
> head buys nothing.

That result is real — and it is a plateau **of English**. All seven candidates
were grammatical sentences. The head carries exactly one fact: the item before
the delimiter is a key and the item after it is its value. A sentence needs a
subject, a verb and an object to say that. Notation needs three characters:

```
Letters before ¶ name the phrases after them. Then expand repeatedly; print result only.   17 tok
Before ¶ k=v. expand repeatedly; print result only.                                        12 tok
Before ¶ k=v. expand repeatedly; print only.                                               11 tok
```

`k=v` is a single BPE token because it occurs constantly in source code, config
files and URLs; the sentence it replaces does not. So the move is **not
paraphrase, it is a change of register: prose → notation.** That is the one
direction off the plateau X29 did not sample.

**Greedy or not?** Not greedy. The rung is kept only when it *strictly* lowers
the token count of the whole message, measured after each literal replacement,
one rung at a time. No search, no heuristic acceptance — an exact comparison of
two counted strings.

**Time/CPU bound?** Yes, and trivially: this codec performs **zero extra
search**. It rewrites a string that already exists and counts it. Encode time is
unchanged from HEURESIS to within noise.

**Decodability — verified with a live model, not assumed.**

X28 left the compact rung disabled with an explicit reason:

> "compact" drops that anchor for another 3 tokens and is NOT enabled by
> default, because no live model can be run from this sandbox to check that a
> reader still locates the glossary without it.

X32 ran the reader. A 192-token ops log was encoded to a 13-rule wire, the
resulting message was handed over with no system prompt, no skills file and no
tools, and decoded **by hand** from the message text alone. It reproduced the
source byte for byte, recovering exactly the rule set the encoder installed
(`б` = `2026-10-19T09:14:`, `в` = newline+`б`, `у` = `07`,
`к` = `Z INFO  worker-07 heartbeat ok latency=`, …). That receipt is in
`bench/x32/small.ts` and is reproduced in `bench/x32/X32.md` §H.

The aggressive rung that drops the anchor entirely (6 tokens) is **NOT**
enabled. An unanchored "expand repeatedly" never states that the `§…¶` block
*is* a glossary, and recovering that requires guessing at a novel notation. It
is retained as `TIMEMA_UNSAFE_LADDER` so the measurement is reproducible.

**Measured** (`bench/x32/cmp.ts`, `full28.ts`; every wire byte-exact):

| lane | HEURESIS | TIMEMA | Δ |
|---|---|---|---|
| prose-01.txt | 743 | 737 | −6 |
| prose-05.txt | 926 | 920 | −6 |
| kb-article.txt | 628 | 622 | −6 |
| readme.txt | 652 | 646 | −6 |
| email-thread.txt | 494 | 488 | −6 |
| meeting-transcript.txt | 389 | 383 | −6 |
| ls-full-iso.txt | 373 | 367 | −6 |
| node-stacktraces.txt | 306 | 300 | −6 |
| vix-daily-1990.csv | 1201 | 1195 | −6 |
| dump.sql | 668 | 662 | −6 |
| de-kb.txt | 463 | 457 | −6 |
| llm-answer.md | 680 | 674 | −6 |

**12 of 12 improved, 0 regressed, −72 tokens total.** The lower fixed tax also
moves the compression threshold for short prose from roughly 2000 characters
down to roughly 1500 (prose-01 and prose-05 begin compressing at 1500 instead
of 2000).

**Honest citation.** No external source for the mechanism — it is a measurement
made in this repo (`bench/x32/`). Three external results bound it:

- **arXiv 2607.23362 (JOLT)** — *"BPE already sits within 1–2% of the LP lower
  bound on the training scope… the residual gap is driven primarily by
  vocabulary construction rather than the inference rule."*
  [1](https://arxiv.org/pdf/2607.23362) This is the decisive external
  corroboration of X32's negative result: there is essentially **no headroom**
  in choosing a character string that tokenizes better. BPE inference is
  near-optimal for its own rule.
- **arXiv 2504.00178 (BoundlessBPE, COLM 2025)** and
  **arXiv 2604.05192 (Faster Superword Tokenization)** — superwords spanning
  pre-token boundaries give 15–33% more bytes/token. Unusable here: the
  decoder's tokenizer is frozen to o200k_base.
- **arXiv 2411.08671** / **alphaxiv 2610** — BPE achieves between 1/3 and
  (1−e⁻²)/2 ≈ 0.4323 of optimal worst-case compression utility.

### X32 negative space (measured, all rejected)

1. **Repricing the rule-search tax — NULL, and interestingly so.** The rule
   search (`sibyl.evaluate`) prices every candidate against
   `chironDecoderPrompt`, i.e. the **CHIRON** contract, while the message
   actually ships the **SYNTOMOS** contract. Measured on four lanes the search
   pays **38–40** tokens and the shipped contract costs **17**: a gap of 21–23
   tokens on every lane. Passing the true value should unlock rule sets in that
   band. It does not. Swept 0/6/12/17/20/25/30: prose-01 goes 743 → **745** and
   readme 652 → **655**. Raising it is worse still: at tax 45 kb-article
   collapses from 628 to **656**, its uncompressed size. **The conservative tax
   is acting as a regularizer** that prefers fewer, higher-value rules, and the
   current value sits at a local optimum in both directions.
2. **Shape-clause notation — REFUSED on safety grounds.** `8 digits become
   YYYY-MM-DD` → `8→YYYY-MM-DD` is 6 tokens cheaper on dump.sql (35 → 29).
   Rejected: X29 established that this clause is exactly where dropping a fact
   silently corrupts the bytes (`shapesUnsafe` expands every 8-digit run
   instead of only `^`-marked ones). Not worth 6 tokens on two lanes.
3. **Rule pruning — exhausted.** 22 of prose-01's 31 rules and 24 of
   kb-article's 27 have a **one-token** phrase (` the`, ` and`, ` of`, `,`),
   which cannot save anything per occurrence. Dropping all of them makes
   prose-01 **+16** worse and kb-article **+32** worse — they earn their place
   through BPE merge effects on the surrounding tape. Greedy per-rule removal
   finds 0 removable rules on both.
4. **Short prose is genuinely incompressible by this mechanism family.** See
   §"The short-message cliff" below.

## οἰκονομία OIKONOMIA (X33)

**What it is.** A codec about **where the encoder spends its search budget**,
not about what the wire says. It adds no wire format, no rule class and no
contract: a wire OIKONOMIA emits is a wire TIMEMA could have emitted. What
changes is how many times the encoder is willing to re-run its own search to
choose it.

**Greedy or not?** Not greedy. Every shape trial is scored against the real
objective (`countTokens(wire) + countTokens(contract)`) and kept only when it
strictly lowers the whole message; the final arm choice remains an exact minimum
over scored candidates. The gate does not accept a worse candidate — it decides
whether to *keep looking*.

**Time/CPU bound?** Yes. Bounding encoder effort is the entire content of the
codec.

**Decodability — unchanged.** Same glossary, same tape, same contract, same
`chironDecode`/`symplokeDecode` reader as TIMEMA. X32's live hand-decode receipt
carries forward untouched. Verified this turn: `bench/x33/verify.ts`, 5 lanes,
all `oikonomiaRoundTrip` true.

**Why this axis.** arXiv 2607.23362 (JOLT) puts BPE within 1–2 % of the LP lower
bound, so there is almost no headroom left in *choosing a better character
string*. The unoptimised axis is the cost of finding one.

### Three measurements

**1. The long-string token-count memo.** X30 memoised `countTokens` for strings
under 24 characters and never measured the other side of the split — invisible
by call count, dominant by work. On `prose-01`:

```
short calls (< 24 chars)     2,384,798     distinct ~98,000
long  calls (>= 24 chars)       65,364     distinct   3,312     94.9% redundant
mean length of a long call      1,738 characters
chars pushed through the pretokenise regex   113,629,256
```

113 M characters through a regex on a 3 370-character input, 94.9 % repeated.
`bpe.ts` now memoises the long path too, keyed on the whole string (exact — same
string, same encoding, same count). Both caches are now one Map per encoding,
removing 2.4 M key-string allocations per encode.

**2. The propagation gap.** `syntomosEncode` called `metathesisEncode(text, enc)`
with no options object, and metathesis called `symplokeEncode(text, enc)` with
none. So `budgetMs`, `maxEvals`, `restarts`, `wordGrid` and `capGrid` had been
passed by callers since X28 into a void — making the X28 and X31 budget nulls
and the X32 grid null **vacuous**. Options are forwarded now. Re-asked with a
knob that reaches the code: the **search budget is confirmed slack** (sibyl at
300 ms and 12 000 ms give identical output), but the **config count is
load-bearing** (3, 2, 1 all lose tokens) and was never the thing under test.

**3. Eighty-three percent of the encode is one parent run four times.** Timing
SYMPLOKE's parents on prose-01: `polytropos` runs **four** times, 18.5 s of 22.3 s.
The cause is the `'in'` shape order, which collapses shapes *before* the grammar
runs and therefore owes a full parent re-run to every trial — the trials hand the
parent genuinely different inputs, so they cannot be cached. X24 set the cap to
4; nobody measured it.

### The mechanism: buy the next trial only when the last one paid

Prediction was tried first and failed. Total shape-collapse count does not
separate the classes: **find-listing collapses 240 items and needs `'in'`;
aapl-2014.csv collapses 240 items and must not have it.** Size, category and
shape count also fail to separate.

So OIKONOMIA buys one trial at a time and purchases the next only when the
previous one paid. That is the right shape here because the trials are greedy and
ranked by hit frequency: a failing trial is the **most frequent remaining**
candidate failing.

One trial already reaches the four-trial answer on **six of the eight** lanes
where the question arises, and the gate stays open on `dump.sql` — whose first
trial *does* improve (707 → 686) — all the way to 662, which a flat cap of 2
does not achieve.

### Measured: OIKONOMIA vs TIMEMA, 38 lanes

```
lanes                    38        all byte-exact          38/38
TOTAL tokens   TIMEMA 23,610   OIKONOMIA 23,625   delta  +15  (+0.064%)
TOTAL encode   TIMEMA 2,242,016 ms   OIKONOMIA 1,126,530 ms     1.99x
per-lane speedup   median 2.19x   min 1.14x   max 3.22x
token loss on      2 lanes (find-listing +13, meeting-transcript +2)
token gain on      0 lanes
```

Full per-lane table in `bench/x33/X33.md` §G. **Pareto superior on time,
equal-or-slightly-worse on tokens, with both regressions disclosed rather than
averaged away.**

### Honest citation

- **arXiv 2604.02985 (Prompt Compression in the Wild, Apr 2026)**, >30 000
  end-to-end runs: *"for short inputs (≤1 000 tokens), compression caused
  overhead, reducing speed-ups to 0.9–1.0×"* and *"in all other settings …
  the compression overhead outweighs any benefits."* Also: *"model inference
  accounts for only about 5 % of total latency"* in LLMLingua — the compressor's
  own algorithm dominates. This is the premise of X33, stated independently.
- **arXiv 2609.32961 (Sep 2026)**, ~35 000 agent runs: *"fewer tokens need not
  mean faster or cheaper execution"* — a needed corrective to reading any token
  count as a win.
- **arXiv 2602.13266 (LoPace, Feb 2026)**: lossless prompt *storage* at
  **3.3–10.7 MB/s**. Our encoder runs at roughly **0.0002–0.0005 MB/s**. The gap
  is the honest measure of how far this axis still has to go; a 2× win does not
  close it.
- **arXiv 2506.00307 (Meta-Tokens, Jun 2025)**: the closest published relative —
  *"a repeated subsequence of length L occurring n times costs L·n tokens versus
  L + n with a dictionary entry"* is our mechanism stated explicitly. It requires
  **fine-tuning the model** to read the format; ours does not.

### X33 negative space

1. **Predicting `'in'` from the document** — rejected, does not separate (above).
2. **Flat trial cap of 1** — 2.09× faster but loses 52 tokens over 33 lanes
   including +24 on dump.sql; the gate recovers dump.sql entirely.
3. **Cutting the polytropos config count** — 3, 2, 1 all lose tokens.
4. **Lowering the sibyl budget** — identical output from 300 ms to 60 000 ms.
5. **Lowering the polytropos budget** — token-neutral to 8000 ms and ~13 %
   faster, but subsumed by the cap gate.
6. **Caching the `'in'` parent runs** — impossible; each trial runs the parent on
   a different collapsed input.
7. **Grammar transfer** (build the dictionary once, apply it to every collapsed
   variant) — the attractive version of #6 and the clearest next lever. Not
   implemented: it needs sibyl's search internals, and rules found on `text` are
   not sound for `collapse(text, shapes)`.

### Limits

* **Single measurements, not distributions.** The pipeline is not deterministic
  (`Date.now()` inside control flow in `polytropos.ts`, `akribeia.ts`, `aion.ts`,
  `abacus.ts`, `amphora.ts`; `OMEGA_DET=1` stubs only `clock.now()`). `npm-ls.txt`
  measured 901 in one run and 940 in another.
* **Part of the `'in'` benefit is best-of-*k* sampling, not a shape effect.**
  Some `'in'` winners (npm-ls, kubectl-get-pods) win with **zero** recorded
  collapses — they are drawing a second sample from a stochastic search.
* **This is a speed codec, not a compression codec.** +15 tokens is a cost.

## πύκνωσις PYKNOSIS (X34)

**New codec.** `src/lib/omega/pyknosis.ts`, registry key `pyknosis`, family
`exact`, after `oikonomia`, before `chronos`.

**One-line claim:** every codec before this one compressed the same resource —
the fact that some span of the text occurs more than once. PYKNOSIS compresses a
different resource, the one thing left once the repetition is gone: **the
decoder's tokenizer charges different prices for different characters, and that
price list can be arbitraged.**

### The opening measurement: the residual is repetition-free

X34 began on the exact-repeat family and that family is **refuted**. The tape
residual (`bench/x34/resid.ts`):

| lane | raw repeat coverage | tape repeat coverage |
|---|---|---|
| openstack-loghub-26.log | 76.3 % | **0.0 %** |
| git-numstat.txt | 61.5 % | **0.4 %** |

Re-encoding the tape gains **exactly 0** (648→648, 509→509, 1511→1511). Glossary
entry order is forced by the dependency DAG (300 random permutations → 0/300
valid); topological orders move the wire ±2 tokens. Glossary-of-glossary has
0–17 % LZ redundancy.

So the wire's density is not a search failure:

| lane | raw tokens | wire | tape chars | chars/token |
|---|---|---|---|---|
| openstack-loghub-26.log | 4028 | 945 | 1272 | 2.50 |
| git-numstat.txt | 4632 | 1992 | 3331 | 2.20 |

English prose is ~4.3. The 2.2–2.5 **is the price of the alphabet**.

### The mechanism: alphabet arbitrage

Scanning for spans below 3.0 chars/token locates the badly-priced content
(`bench/x34/dense.ts`) — hexadecimal, versus nothing at all in kb-article or
prose:

| lane | chars | tokens | chars/token | census |
|---|---|---|---|---|
| openstack-loghub-26.log | 4068 | 2420 | 1.68 | digit 2122, a-f 1330 |
| dump.sql | 1114 | 552 | 2.02 | digit 900, a-f 144 |
| find-listing.txt | 2760 | 1440 | 1.92 | digit 2400 |
| vix-daily-1990.csv | 1260 | 756 | 1.67 | digit 1008 |
| kb-article.txt | **0** | **0** | — | — |

```
random hex, as-is            1.740 chars/token
same info, re-spelled        2.201 (random corpus)   -20.9 %
same info, re-spelled        2.460 (real corpus)     -28.8 %
```

Shipped mapping: **`0123456789abcdef → etaoinsrhldcumyp`** (17-token clause).

**Digit runs are explicitly NOT re-spelled** (`bench/x34/dig.ts`) — bare digits
already run 2.16–2.80 chars/token, so remapping *loses*: +19 on find-listing,
**+152** on vix-daily.

### Choosing the alphabet: two searches that disagree

| evaluation set | best alphabet | ch/tok | saving |
|---|---|---|---|
| 900 random hex strings (`opt.ts`) | `etaoinsrkldcumyp` | 2.201 | −20.9 % |
| 663 real corpus runs, 9472 ch (`opt2.ts`) | `keaoinstrldcumzp` | 2.460 | −28.8 % |

End-to-end settles it in favour of **neither**:

| alphabet | dump.sql | openstack | total |
|---|---|---|---|
| `keaoinstrldcumzp` (better in isolation) | −52 | −14 | −66 |
| **`etaoinsrhldcumyp` (better end to end)** | **−54** | **−17** | **−71** |

### Two soundness conditions, verified per run

1. **Self-delimiting.** A closing delimiter costs ~1 token/run — 176 against a
   398-token saving at 88 runs. Instead the encoder *verifies* every run is
   followed by a character outside the target alphabet (`bound.ts`): all 88 on
   openstack (`' '`×62, `'/'`×15, `']'`×7, `')'`×2, CR×2) and all 26 on dump.sql
   (`"'"`×26).
2. **Marker absent** from the source; else another is chosen, else skip.

### Uniform, not selective — the counterintuitive result

```
dump.sql   uniform remap (all runs >= 12)       -44 tokens
dump.sql   per-run remap (only runs that pay)   +37 tokens
```

Selective remapping leaves the document half in each alphabet and destroys the
regularity the grammar search needs; a *uniformly* re-spelled document is **more**
regular and the search finds better rules in it. The per-run estimate is
therefore only a **weak gate**, and the real decision is a measured end-to-end
comparison that never ships a regression. The first gate (`est >= 2 x clause`)
was too strong and **rejected a real −44** (estimated 29 vs threshold 34) — the
isolated estimate is *pessimistic* there, precisely because of this effect. The
estimate is now **not used to decide at all**: with the first alphabet it
estimated 29 and delivered −54; with the shipped alphabet it estimates **2** and
still delivers −54. An estimate that moves 14× while the outcome does not move
is not a signal, so the gate is a character count (`hexChars >= 150`) only.

### Measured: PYKNOSIS vs OIKONOMIA, 31 lanes

```
dump.sql                  662 -> 608   -54   byte-exact ✅
openstack-loghub-26.log   945 -> 928   -17   byte-exact ✅
29 further lanes          unchanged          byte-exact ✅
```

**No lane regresses by mechanism.** Two rows read with care:

* **gh-api.json.txt +3 with `fired: false`** — the transform did not fire, so
  both numbers come from the same `oikonomiaEncode` path; the +3 is run-to-run
  variance in a stochastic search, reported rather than hidden.
* **package-lock-head.json OOMs** — `pyknosisPlan` returns **null** there, and
  `oikonomiaEncode` alone OOMs at 1.9 GB on its 40 000 chars. **Pre-existing in
  OIKONOMIA; PYKNOSIS is not implicated.**

### Honest citation

* **arXiv 2610.01127, "Counting and Min-Cost Encoding" (2026-10-01)** — closest
  published statement of the mechanism. Given a **fixed** vocabulary, MCE picks
  a segmentation by globally minimising an encoding cost and beats BPE. Our
  decoder's vocabulary is **frozen** at o200k_base, so the only free variable is
  the character string — and choosing it well is a real optimisation. They change
  the vocabulary; we hold it fixed and change the text. Same objective, opposite
  side of the interface, and ours needs no cooperation from the model.
* **"The tokens-per-byte trap" (DEV, 2026-05-23)** — the failure mode one wrong
  decision away: deleting 25 % of characters makes prompts **23–66 % larger in
  tokens**, because corrupted prose falls through to byte-level fallback (up to
  4 tokens/glyph). Its prescription is our guard: *"run your input through the
  actual tokenizer before AND after any compression scheme."* PYKNOSIS perturbs
  characters **into** the vocabulary's sweet spot, not out of it.
* **arXiv 2511.20849, "Length-MAX Tokenizer" (2025-11-25)** — 14–18 % fewer
  tokens than BPE by selecting longer tokens; requires building a new tokenizer,
  which the one-chat constraint forbids. Reinforces X32: with the decoder's
  tokenizer frozen there is no headroom in the merge rule, only in what string
  we feed it.

### X34 negative space (measured, all rejected)

1. **Glossary entry order** — forced by the dependency DAG; ±2 tokens.
2. **Glossary-of-glossary** — 0–17 % LZ redundancy.
3. **Tape re-encoding** — exactly 0 on every lane.
4. **Digit-run remapping** — +19 find-listing, +152 vix-daily.
5. **Per-run (selective) remapping** — +37 on dump.sql where uniform is −44.
6. **Delimiter pairs** for the hex runs — cost ~2 tokens/run and turn dump.sql
   and find-listing into net losses.
7. **The `est >= 2 x clause` gate** — rejected a real −44.
8. **Base64 as the target encoding** — token-comparable but needs +33 % chars.

### Limits

* **Not a general-purpose compressor.** Two of 31 lanes moved; a no-op elsewhere
  at one regex scan.
* **Cost on firing lanes:** a second full encode (dump.sql 97 s → 189 s;
  openstack 102 s → 164 s).
* **Single measurements, not distributions** — the pipeline is not deterministic.
* **The alphabet was selected on two lanes' end-to-end results** — the weakest
  part of the work, stated as such. A per-position change was worth up to ~54
  tokens, so a third hex-heavy lane could prefer a different letter.

## Codecs that do not satisfy the measurement contract (X21 audit)

- **`oracle`** — hardcodes the 20 holdout citations in `ORACLE_MAP` and declares it "not counted
  per-message"; silently skips unknown citations. Uncounted cost and lossy off-benchmark.
- **`lethe`** — hides a punctuation bitstream in vowel accents (`a` vs `á`); an indirect channel,
  not direct reasoning.
- **`nyx`** — asks the reader to execute Python and uses `·` as a BPE-split hint.

All three are excluded from every honest frontier table in `docs/codecs.md`.
