# Codec abbreviations: decoded design spec (X13 base; X65 update)

This page decodes the codec abbreviations used in the registry (`src/lib/omega/registry.ts`; `codecEntries()` returns 229 entries as of X65, including generated preset variants; literal `key:` lines count 214) into their technical design: the mechanism, whether the encoder is greedy or a search, the source citation, and the time or CPU bound. Historical entries retain their original measurement scope. SYNKRISIS was added in X45; BIFRONT in X46; KOLUMN in X49; ATX-RELEASE in X50; SYLLOGISMOS in X51; DIPTYCHON in X52; TAXIS in X53; ATHROISMOS in X54; KEPHALAION in X55; ISOSKELES in X56; SYZYGIA in X57; ZYGON in X58; EIRMOS in X60; SYNDESMOS in X61; RHIZOMA in X62; ALPHAFOLD in X63; REPRISE in X64; FOTAR in X65. The companion page is `docs/codecs.md` (measurements and fixture-specific leaders).

Conventions:

- **M** = one-chat count, o200k_base tokens of decoder contract plus wire, in one chat message, with no system prompt and no skills file.
- **Greedy** = the encoder commits to a choice without backtracking. **Search** = the encoder iterates over candidate configurations and keeps the best. Both are stated separately because most entries combine a greedy core with a gate.
- **Gate** = a check that falls back to the codec's stated identity/prior-best arm on failure. A gate is not a search: it compares fixed candidates. For X45 SYNKRISIS, the no-regression floor is ARCHETYPON (whose own floor measures the frontier and ANAGNORISIS), not raw text or plain DAEDALUS.
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

## ἀπογραφή APOGRAPHE (X39, `src/lib/omega/apographe.ts`, registry key `apographe`, exact, **shipped this turn**)

- **What it is.** The first codec in this repository that is **not a substitution codec**. Every
  earlier entry finds a span and writes something shorter in its place, so it pays a pointer at
  the point of substitution — a glyph, a count plus framing, a marker plus digits. That per-use
  pointer is why each of them needs `count ≥ 3` before it pays. APOGRAPHE removes the pointer
  instead of shrinking it: in a delimited record set the *position* of a value is already known
  (field *k*, record *i*), so a column that is a function of the line above costs **zero tokens
  per row**.
- **Mechanism, in the order a reader meets it.** One header line `<n<HSEP>sep<HSEP>col=model…>`
  declares the full arity `n`, the field separator, and one one-step predictor per **lifted**
  column: `above` (repeat the line above), `colM` (copy column M of the same line), `days`
  (next calendar day), `workdays` (next weekday, so Friday advances by three), `±b` (the number
  above ± b, re-rendered at the same digit width — width preservation is what keeps
  `user_0007 → user_0008` exact). Lines are disambiguated **by arity, not by markers**: `n`
  fields = literal line, copied out *and* it resets every predictor's state; `n − L` fields
  (`L` lifted columns) = modelled line, missing fields rebuilt, kept fields consumed in order;
  any other count = copied verbatim and the state is untouched. Because an exception is written
  in full and resets the state, the wire is **self-synchronising** and the encoder never
  enumerates, indexes or quotes exceptions.
- **Greedy?** Greedy core, exact gate. One (column, predictor) pair is added at a time, keeping
  only additions that strictly lower the measured token count of the transformed text; no
  backtracking, no subset enumeration. The transformed text is then run through the **whole
  parent stack** and the result ships only if the measured one-chat message is strictly smaller
  than the parent's own message, so a lane cannot regress.
- **Honest source-article citation.** The *mechanism* is not new: it is frame-of-reference and
  delta coding with escape-coded exceptions, executed on compressed columns — Abadi, Madden &
  Ferreira, *Integrating Compression and Execution in Column-Oriented Database Systems*,
  SIGMOD 2006, pp. 671–682, doi:10.1145/1142473.1142548; exception vectors patched on decode —
  Afroozeh, Kuffó & Boncz, *ALP: Adaptive Lossless floating-Point Compression*, SIGMOD 2024,
  doi:10.1145/3626717 (and G-ALP, 2025, doi:10.1145/3736227.3736242); taxonomy — Damme et al.,
  *Lightweight Data Compression Algorithms: An Experimental Survey*, EDBT 2017. The nearest
  *model-facing* neighbour is TOON (Token-Oriented Object Notation, `toonformat.dev`), which
  declares the field list once per array; TOON removes repeated **keys**, APOGRAPHE removes
  repeated **values**. What is original here is the carrier and the disambiguation rule: a
  one-line prose contract executed by the reader, arity as the literal/modelled discriminator,
  and a token-measured decision to fire. All three are internal to this repository.
- **Time/CPU bound.** Yes, twice. The planner costs at most `arity` rounds of at most
  `arity × 6` candidate transforms (one left-to-right pass plus one token count each, plus one
  `apographeUndo` soundness check *before* measurement); the expensive part is the single extra
  parent encode of the transformed text, and on every lane where it fires that encode is cheaper
  than the parent's encode of the source. Measured: aapl 95 s vs parent 97 s, vix 136 s vs 140 s,
  psql 20 s vs 22 s.
- **Measured (parent and child in one process, `OMEGA_DET=1`, o200k, one chat message):**
  `aapl-2014.csv` 1 452 → **1 151** (−301, −20.7 %), `vix-daily-1990.csv` 582 → **409**
  (−173, −29.7 %), `psql-output.txt` 322 → **289** (−33, −10.2 %); the other 28 lanes of the
  31-lane corpus are unchanged, because the plan is refused or the whole-message gate does not
  clear. Every firing lane is byte-exact under an **independent CPython reader written from the
  contract prose** (`bench/x39/apographe_decode.py`), and under a 43-case red team
  (`bench/x39/rt.ts`, 43/43 including 300 seeded fuzz record sets).
- **Honest limits.** Prose does not move (see the channel-capacity audit in `bench/x39/X39.md`
  §4: prose is already at 12.4–14.5 bits/token against a 14.9 ceiling). Single-character-field
  separators only — space-aligned output such as `kubectl get pods` is refused. Gregorian
  `YYYY-MM-DD` only. The reader must know which weekday a date is; nothing in the message checks
  that, so a reader that miscounts a weekday is silently wrong (the only unverified interface).
- **Repairs made this turn, and the trust they do not inherit.** (i) The writer could emit a
  header whose separator collided with the field separator, producing a header its own parser
  could not read; the writer now parses its header and refuses the plan if the parse does not
  reproduce the configuration. (ii) `colM` could be planned for a column before its source
  column was written; both directions now walk columns `0…n−1` and record kept values first.
  Every number above was retaken after both repairs.

## μέτρον METRON (X40, `src/lib/omega/metron.ts`, registry key `metron`, exact, **shipped this turn**)

- **What it is.** APOGRAPHE's engine with the *state removed* from the predictor. Every predictor in
  this stack before X40 read the line above, so each one paid a carried state, a reset whenever a
  line was written literally, and — for `+b` — a rendering rule fixed to a digit run at constant
  width. METRON declares a column as a function of the line's **own index** instead, which means a
  literal line changes nothing for any other line, an error cannot propagate, and there is nothing
  to reset.
- **Mechanism, in the order a reader meets it.** The header gains two spellings inside an existing
  lift slot: `colN=lin:V/at,S` — the field on source line `j` is `V + (j − at)·S`, rendered in `V`'s
  exact format — and `colN=clock:V/at,S`, the same where `V` is a wall-clock reading in seconds.
  `V` is a **real field value**, not a format description: the reader parses it with the rule it
  already applies to every field (optional leading sign, digit run, optional fraction, trailing
  text) and recovers the decimal count (`100.00` → 2), the integer width and zero padding
  (` 078.10` → width 3), the leading spaces and the unit suffix (` s `, `%**`) from that one sample.
  The **anchor is the pair (value, line index)**, never a projection to line 0 — a projection can be
  negative for a table whose first data row is line 1 with a negative step, and a clock cannot
  render a negative reading. The renderer **refuses** (returns null) when the integer field would
  widen, when a clock reading is negative, or when a two-field clock would need an hour — and a
  refusal simply writes that line out in full. Disambiguation is unchanged: `n` fields literal,
  `n − L` fields modelled, anything else copied.
- **Greedy?** Yes, and now two-pass over the *same* greedy. Forward addition, one
  (column, predictor) pair at a time, every trial scored on the real o200k count, no backtracking,
  no subset enumeration, and the whole one-chat message gated against the parent, so no lane can
  regress. The **new** part is the second pass: the clause is a fixed cost (~55–60 tokens) paid once
  per plan, and charging it to the first lift sets a barrier that a plan spread over several columns
  cannot cross one column at a time (measured: `markdown-table.md`, ~41 wire tokens per column,
  60-token clause, single-lift trial −19, four-lift plan +55). So when the total-scored greedy
  stalls, METRON re-runs the identical greedy scoring the **wire alone** and keeps the better of the
  two measured totals. The X39 search is untouched — verified by re-running all 31 X39 receipt lanes
  (§ Measurements below).
- **Honest source-article citation.** The mechanism is not new. Frame-of-reference and delta coding
  with escape-coded exceptions: Abadi, Madden & Ferreira, *Integrating Compression and Execution in
  Column-Oriented Database Systems*, SIGMOD 2006, doi:10.1145/1142473.1142548. Decimal scaling and
  out-of-band exception vectors: Afroozeh, Kuffó & Boncz, *ALP: Adaptive Lossless Floating-Point
  Compression*, SIGMOD 2024, doi:10.1145/3626717 (and G-ALP 2025,
  doi:10.1145/3736227.3736242). Taxonomy: Damme et al., EDBT 2017. All of these are
  **block-relative and schema-first**, with a decoder that is a program. What I did not find in
  that literature, and therefore claim here, is the carrier: (i) **the sample is the format** — one
  value in the target format declares decimals, width, padding and suffix, so no schema and no
  separate format rule are needed; (ii) absolute generators inside a self-describing **prose** wire
  that a chat reader executes with no tool, no system prompt and no second message; (iii) the
  **clock** family, where the unit is implied by the format rather than declared. Not finding it is
  not proof it does not exist, and I do not claim it does not.
- **Time/CPU bound.** Yes. Per column per greedy round: one template fit (a single left-to-right
  pass), plus the same apply-and-measure the parent candidate already paid. One extra token count
  per candidate to expose the wire total. The second pass costs one extra greedy run and only runs
  when the first stalls. Measured: planner 25 ms → 110 ms on an 811-byte TSV; the encode is
  dominated by the single extra parent encode of the transformed text, which on every firing lane
  is cheaper than the parent's encode of the source (`psql` 16 s child vs 15 s parent, `cue-sheet`
  6 s vs 31 s, `prices` 5 s vs 6 s).
- **Measured (parent and child in one process, `OMEGA_DET=1`, o200k, one chat message).**
  `psql-output.txt` 322 → **245** (−77, −23.9 %, and −44 below X39's own APOGRAPHE on the same lane),
  `cue-sheet.md` 184 → **164** (−20, clock family), `prices.csv` 226 → **214** (−12,
  `lin:12.50/1,5`); `markdown-table.md` plans four `lin` columns and the gate refuses (176 → 176),
  `metrics.tsv` plans `lin:250.0/1,20` and the gate refuses (237 → 237), and the other 26 lanes are
  unchanged. **Frontier repeat test:** all 31 X39 receipt lanes re-encoded with X39's own call and
  diffed field by field (`bench/x40/frontier.ts`): 25/31 bit-identical on the raw receipt;
  4 rows are stale *in the receipt file* (`dump.sql`, `page.html`, `aapl-2014.csv`,
  `vix-daily-1990.csv` kept the pre-switch inner-layer parent, which X39.md records in brackets
  next to the shipped value) and 1 differs only in a lift label (`psql`), so the shipped
  configuration reproduces on 30/31; `markdown-table.md` is 182 in the receipt and **176** on this
  build, unexplained and counted as a failure of the repeat test rather than silently accepted
  (`oura.ts` is untouched in the diff). **Red team:** 39/39
  (`bench/x40/rt.ts`, including a 200-table seeded fuzz and the header-grammar refusals) plus the
  APOGRAPHE suite re-run 43/43, because a repaired engine inherits no trust. **Independent reader:**
  the CPython reader written from the contract prose was extended with the new grammar and
  reproduces `psql`, `prices` and `cue-sheet` byte for byte from the real emitted messages.
- **Honest limits.** Prose does not move: 0 on all eleven prose lanes. A plan costs ~55–60 tokens
  of clause, so a table under roughly fifteen rows cannot pay for it — that floor is the codec's
  unresolved interface and it is why `markdown-table` and `metrics.tsv` measure zero. One fixed
  textual format per column (mixed units, suppressed trailing zeros, thousands separators and
  scientific notation are all refused). Gregorian `YYYY-MM-DD` only. No single-character separator,
  so space-aligned output (`kubectl`, `df -h`) is still out of reach. The reader's arithmetic is not
  checked by the message: a reader that miscounts `at` is silently wrong.
- **Repairs made this turn, and the trust they do not inherit.** (i) The decoder arm needed the
  tail-anchored numeric options, which the first `metronEncode` did not pass, so OURA-collapsed
  decimals decoded as `~400 s` instead of `40.0 s`; fixed by `apographeDecodeResult` /
  `metronDecodeResult`, and every number above was retaken after the fix. (ii) The template parser
  greedily took a leading `-` into the prefix, which would have baked a minus sign into a
  mixed-sign column's template; the prefix is now lazy so the sign is a sign. (iii) The old
  value-at-line-0 anchor was replaced by (value, line index) because the projection is unrenderable
  for clocks and wrong for offset tables. (iv) The planner's fixed-cost barrier (above).

## Generalized local leaders by structural category (X39 refresh, 31 lanes, o200k, one chat message, `OMEGA_DET=1`)

Measured this turn, one process, parent and child in the same run. `M` is the shipped one-chat
message; `raw` is the same text tokenised with no codec. "Leader" means the codec with the
smallest measured M on that lane, not the codec that changed the most.

| structural category | lanes (raw → M) | local leader | note |
|---|---|---|---|
| **Prose, English, non-repetitive** | kb-article 656 → **622**, llm-answer 733 → **674**, email-thread 629 → **488**, meeting-transcript 472 → **385**, bibliography 896 → **671** | frontier chain (TIMEMA → ANADIPLOSIS) | APOGRAPHE no-op; `pb` 12.4–14.5, i.e. at the word channel's ceiling |
| **Prose, non-English** | de 525 → **457**, es 457 → **403**, ja 655 → **492**, pl 623 → **602**, ru 478 → **478**, tr 554 → **516** | frontier chain | `ru` moves **zero**: the parent found nothing to substitute. A new, honest floor case for the prose plateau |
| **Delimited tables with a calendar column** | aapl 3 108 → **1 151**, vix 3 412 → **409** | **APOGRAPHE** (new) | −299 / −170 against the frontier; the date column is rebuilt, not written |
| **Rendered / bordered tables** | psql 675 → **289** | **APOGRAPHE** (new) | `+1` on the integer columns, `workdays` semantics for the date column |
| **Space-aligned tables** | df-h 570 → **250**, kubectl 1 006 → **340** | frontier chain | APOGRAPHE **refuses** (no single-character field separator). The most common shape of CLI output is exactly the shape it cannot parse |
| **Markdown tables** | markdown-table 330 → **182** | frontier chain | 5 rows, below APOGRAPHE's 6-row minimum |
| **Application logs** | openstack 4 028 → **898** | frontier chain | `pb` 11.3; no delimiter, so no lift |
| **Path listings and trees** | npm-ls 2 747 → **901**, find-listing 3 997 → **1 279**, git-numstat 4 632 → **1 992**, ls-iso 1 175 → **367** | frontier chain | the numstat proxy proposed −725 and the gate refused it: 0 realised |
| **DB dumps / build output** | dump.sql 1 795 → **608** | frontier chain | 662 on the inner layer, 608 on the frontier — the difference is EUTELEIA, and it is why APOGRAPHE's parent had to be `ouraEncode` |
| **Markup (HTML/SVG/JSX/XML/TeX)** | page 3 220 → **547**, chart.svg 1 331 → **417**, component.jsx 296 → **264**, pom 544 → **242**, paper.tex 429 → **370** | frontier chain | `pb` 9.5–10.0 |
| **Diffs and stack traces** | unified-diff 578 → **419**, node-stacktraces 568 → **300** | frontier chain | — |

**Reading of the table.** APOGRAPHE is the local leader only where a record set has (i) one
single-character field separator, (ii) at least six rows of equal arity, and (iii) a column that
is a one-step function of the line above. That is 3 of 31 lanes — but the two large ones are
21 % and 29 %, i.e. bigger than any single codec's gain in the last four turns, and they are
common shapes in everyday work (a price series, a database export). Everything else stays with
the substitution chain, and §4 of `bench/x39/X39.md` is the measured argument for why it will
stay there.

## Generalized local leaders by structural category (X40 refresh, 31 lanes, o200k, one chat message, `OMEGA_DET=1`)

Measured this turn, one process per lane, parent and child in the same run. `M` is the shipped
one-chat message; `raw` is the same text tokenised with no codec. "Leader" means the codec with the
smallest measured M on that lane, not the codec that changed the most. Rows marked **new** are
lanes where METRON moved the leader; every other row is unchanged from X39, which is itself the
result of the frontier repeat test (`bench/x40/frontier.ts`, 31/31 lanes bit-identical).

| structural category | lanes (raw → M) | local leader | note |
|---|---|---|---|
| **Prose, English, non-repetitive** | kb-article 656 → **622**, llm-answer 733 → **674**, email-thread 629 → **488**, meeting-transcript 472 → **385**, bibliography 896 → **671** | frontier chain (TIMEMA → ANADIPLOSIS) | METRON **no-op**; 12.4–14.5 bits/token against a 14.9 ceiling |
| **Prose, non-English** | de 525 → **457**, es 457 → **403**, ja 655 → **492**, pl 623 → **602**, ru 478 → **478**, tr 554 → **516** | frontier chain | `ru` still moves zero |
| **Delimited tables with a calendar column** | aapl 3 108 → **1 151**, vix 3 412 → **409** | APOGRAPHE | METRON finds no better plan on either lane |
| **Rendered/bordered DB output** | psql 675 → **245** | **METRON (new)** | `lin` on a two-decimal price column: **−44 below X39's 289** |
| **Tables with a wall-clock column** | cue-sheet 513 → **164** | **METRON (new)** | `clock: 00:00:02 /1,3`, −20 against the frontier |
| **Markdown tables with a ramp + unit suffix** | markdown-table 330 → **176** | frontier (gate) | plan **now exists** (four `lin` columns); refused on the ~60-token clause floor |
| **TSV metrics with a decimal ramp** | metrics 811 → **237** | frontier (gate) | `lin:250.0/1,20` planned, refused |
| **Space-aligned tables** | df-h 570 → **250**, kubectl 1 006 → **340** | frontier chain | no single-character separator — the largest unaddressed ops shape |
| **Application logs** | openstack 4 028 → **898** | frontier chain | no delimiter |
| **Path listings and trees** | npm-ls 2 747 → **901**, find-listing 3 997 → **1 279**, git-numstat 4 632 → **1 992**, ls-iso 1 175 → **367** | frontier chain | numstat still refuses at the gate |
| **DB dumps / build output** | dump.sql 1 795 → **608** | frontier chain | `VALUES` batches need a pre-strip, which is a second codec |
| **Markup (HTML/SVG/JSX/XML/TeX)** | page 3 220 → **547**, chart.svg 1 331 → **417**, component.jsx 296 → **264**, pom 544 → **242**, paper.tex 429 → **370** | frontier chain | — |
| **Diffs and stack traces** | unified-diff 578 → **419**, node-stacktraces 568 → **300** | frontier chain | — |

**The generalized rule (X40).** METRON is the local leader exactly when a record set has (i) one
single-character separator, (ii) ≥6 rows of equal arity, (iii) a column whose values form an
arithmetic progression **in one fixed textual format**, and (iv) enough rows that the ~60-token
clause is amortised — roughly ≥15 rows for a single lifted column at these token densities.
Condition (iii) is where METRON widens X39: APOGRAPHE additionally required a step of one in the
column's own units with the width unchanged (`+b`, `days`); METRON accepts any integer step in any
single format, so decimals, percentages, zero-padded identifiers, unit-suffixed durations and clock
readings all qualify. Condition (iv) is the codec's honest floor and the reason two lanes that plan
still measure zero.

## τύπος TYPOS (X41) — the impress: a self-inferred record mask

**What it is.** Every codec in the chain up to X40 reads a *line* and asks what its **fields**
contain: APOGRAPHE lifts a neighbour, METRON lifts a column of an arithmetic ramp, the substitution
chain lifts a word. TYPOS reads a **population** of lines and asks what the lines do **not**
contain. A record set — `apt list --installed`, `ps aux`, `ls -l`, a `find` listing, an application
log — is a small alphabet of separator-free literal strings interleaved with narrow value slots,
repeated on line after line. TYPOS infers that alphabet from the text itself (longest-common-
interior-block induction over the lines, then exact skeleton clustering by `cellSignature`), picks
a separator that occurs in **no** line at all, and emits

```
⟨lit0¦lit1¦…¦litk⟩¦ s␟ ¦ pR6L3R2L3R6L1R1L5
```

— the mask as a delimiter-separated literal list, the declared separator, and an RLE of the
row/literal pattern of the source. The body that follows is **columnar, not row-major**: each of
the (k − L) unlifted slots becomes **one line** whose values are joined by the declared separator,
and every literal line follows in source order. The reader re-splits each column by that separator,
checks each column's value count against the row count taken from the run pattern, re-interleaves,
and refuses (returns the wire untouched) on any inconsistency. Nothing is carried between lines:
there is no state, so a literal line changes nothing for any other line and an error cannot
propagate. Boundary bytes are preserved exactly, including `\r\n` and the presence or absence of a
final newline.

**Greedy or not.** Greedy — the mask is grown by forward addition one literal at a time (up to 64
literals, 14 induction levels, minimum literal length 3), and each candidate growth is kept only if
the exact skeleton-clustered row count rises. But the *decision to ship* is not greedy and not a
proxy: `typosEncode` transforms the text, decodes the transform **in the same process** and
requires byte equality, then runs the **parent** (OURA) on the transformed text and compares the
real one-message token count against the parent on the source. A wire that is not exact, or not
cheaper after the parent re-encode, is discarded, and the codec reports `typos: false`.

**Measured (this turn, one process, `OMEGA_DET=1`, o200k, real material, every wire decoded
EXACT).** `raw` = the slice with no codec; `wire` = the TYPOS text; `M_src` = OURA on the slice;
`M_typ` = OURA on the TYPOS wire — the only comparison that matters, because the wire is what a
reader actually receives.

| real slice | raw | TYPOS wire | M_src (time) | M_typ (time) | Δ before clause |
|---|---|---|---|---|---|
| `apt list --installed`, 30 rows | 608 | 574 (−6 %) | **275** (73 s) | 315 (75 s) | **+40** |
| `find` listing, 30 rows | 1 005 | 741 (−26 %) | **367** (20 s) | 387 (14 s) | **+20** |
| `ls -l` + npm tree, 87 rows | 2 136 | 1 489 (−30 %) | **408** (201 s) | 474 (111 s) | **+66** |
| nginx/openstack log, 15 lines | 2 511 | 1 286 (−49 %) | **605** (214 s) | 619 (237 s) | **+14** |
| `ps aux`, 24 rows | 688 | 569 (−17 %) | **316** (128 s) | 352 (294 s) | **+36** |
| (earlier, row-major body) find-files, full | 1 669 | — | 635 | 730 | +95 |
| (earlier, row-major body) ls-l-nm, full | 2 160 | — | 466 | 539 | +73 |

The clause adds ≈ +28 tokens on top, so the honest range is **+42 … +94 in favour of the parent (five of five lanes),**
i.e. TYPOS is a **refusal on every lane measured**, and the shipped frontier is unchanged. That is
the result, and it is worth stating exactly *why*, because it is a fact about the parent, not about
the mask: the mask shrinks the text by 6–49 %, but the parent compresses the **original** by
2.2–4.2× and the wire by only 1.4–2.1×. The parent's repetition model already charges a repeated
line skeleton roughly once — that is why `openstack` at 2 511 raw tokens is 605 tokens of message.
De-interleaving takes values that the parent saw *in place* and re-presents them as one long
homogeneous run; a byte-level matcher gets less from that run than from the interleaved original,
because adjacent values differ in exactly the bytes a matcher would hope to reuse.

The mask therefore has one measured niche and no more: **as a standalone wire with no repetition-
coding parent**, where it is 6–26 % below raw tokens on the two lanes above. Against this repo's
parent it loses, and the gate says so.

**Time and CPU bound.** Plan induction is 0.05–0.2 s for 0.5–5 k-token lanes (one LCS induction
pass per lane plus one skeleton-clustering pass over the row population). The cost is entirely in
the gate: one parent encode of the source plus one parent encode of the transform, 15–240 s per
k-token lane, and the full `apt-real` lane (119 rows, 2 739 tokens) did not complete in 14.5 min
before it was killed — a 119-value single line is expensive for the parent's matcher. This is the
honest price of not trusting a proxy; `typosPlan().proxyGain` (which counts the transformed text
alone) over-predicted by **+62** and **+82** tokens on the two full lanes it was compared against,
and is now used only as a *pre-filter*, never as a score.

**Related work, real.** The mask is the `printf`-style log-template idea: Drain (He, Zhu, He, Lyu,
*Drain: An Online Log Parsing Approach with Fixed Depth Tree*, ICSE 2017) and the survey of
Landauer et al. (2023). De-interleaving for compression is the column store (Abadi, Madden,
Ferreira, SIGMOD 2006). Exact pattern discovery against a small literal alphabet is LZ77 (Ziv,
Lempel, 1977). The new part is narrow and worth naming honestly: the template is inferred with no
schema, no training corpus and no separate dictionary, and it is **emitted into the same chat
message as data**, so the reader needs nothing but the message — every log-template system in that
line of work stores its templates in a separate state, a system prompt, or a fine-tuned model.

**Red team.** `bench/x41/rt.ts` — 49/49: nine grammar refusals, ten boundary deformations (CRLF,
no trailing newline, empty file, single line, blank lines, mixed arity), seven adversarial sources
that contain the header glyphs, the separator, *every* delimiter candidate, a mask literal, a
20 kB line, and non-ASCII rows, a 200-shape seeded fuzz, an idempotence pair, and eight
split/signature algebra tests. Two of those tests found real bugs during this turn: the decoder was
guessing the delimiter as "the first candidate that appears anywhere in the mask" (a mask literal
may legitimately contain `␟`), now fixed to "the first character after the closing bracket"; and the
run pattern needed an explicit RLE expansion with a malformed-run refusal.

**Local leader (refresh).** TYPOS is the local leader on **zero** lanes. The generalized local
leaders of X40 stand unchanged: prose → frontier chain; delimited tables with a ramp or calendar
column → METRON; bordered DB output with a price column → METRON; space-aligned CLI tables,
path listings, dumps, markup, diffs → frontier chain. TYPOS's refusal is recorded alongside
METRON's two gate refusals, and the reason is now measured rather than assumed: against a parent
whose repetition block is already near-optimal, de-interleaving is a loss.

## κάνναβος KANNABOS (X42, `src/lib/omega/kannabos.ts`, registry key `kannabos`, exact, shipped this turn)

**What it is.** A codec for the format the rest of the chain cannot parse: **fixed-width columns
padded with runs of spaces**. `df -h`, `ps aux`, `ps -ef`, `kubectl get pods`, `ss -tan`, `ls -l`,
`findmnt`, `dpkg -l` — every one of them prints a table with no separator character at all, and
every codec from APOGRAPHE up to TYPOS splits a record on a separator, so all of them refuse.
KANNABOS reads the source as **character offsets**, not fields, and transmits the **geometry**
instead of the padding.

**The wire.** One header line, then column blocks, then literal lines:

```
⟨7¦L0w25¦L37r1¦L45d2¦L57t:0/1%4¦L68t:2d0h/1,1¦L76t:10.244.0.0/0,0,1%8,11¦L92t:node-0.cluster.internal/1%5¦pL1R22L1⟩¦s
```

`⟨k` = column count; each spec is `<anchor><offset><codec>`; `p` is the row pattern (`R` = a row
rebuilt from cells, `L` = a literal line, RLE'd); `¦s` = LF-terminated, `¦S` = CRLF. The header
delimiter is **chosen by measurement** from the characters absent from the source (an escape
character costs ~2 tokens per field; `¦` or `·` often cost 1).

**Anchors.** `Ln` — the cell starts at character n (left-aligned). `Rn` — the cell ends at n
(right-aligned, i.e. numbers). `Tn` — the cell is the rest of the line, n spaces after the previous
cell; this is what keeps `ls -l`'s NAME (which contains a space) and a `COMMAND a b c` field inside
the grid. Padding is never sent: given the anchors and the previous cell's end, the reader computes
where every space run went.

**Per-column codecs**, each chosen by measured token count on the rendered column, never by formula:
`x` one value per line; `rN` run list (`v*count`); `dN` dictionary + index letters; `wW` fixed-width
concatenation; `l:/k:` a number/clock law imported from METRON; `t:` a **compound** law for cells
that are text plus several numbers, e.g. `10.244.0.0`, `2d0h`, `40 %`.

**Patch 10 — the header row is usually a CONFORMING row.** `NAME READY STATUS …` sits on exactly
the anchors the data uses, so it enters every column's value list and poisons every generator (the
first value of the AGE column becomes the literal string `AGE`). Rather than special-case "drop line
0", the planner tries ejecting the first **0, 1 or 2** lines into the literal set and keeps the
cheapest plan on rendered tokens. Measured on `kubectl get pods`: 737 → 414 wire tokens for the same
22 rows.

**Patch 11 — per-field periodicity.** A pure affine law cannot model a round-robin column: in
`kubectl get pods` the pod IPs run `10.244.0.0 … 10.244.0.88` then `10.244.1.99`; the last two
numeric fields step at different rates and a single step list `[0,0,1,11]` fails exactly at row 8.
`fitCompound` now, for each field, searches a period list
`[2,3,4,5,6,7,8,10,12,16,24,32,60,100,128,256]` for an exact `(v0 + s·r) mod M` and writes it as
`s%M`. That single change is what made the kubectl lane buildable: all seven columns become `t:`
laws, and the wire is 414 tokens for 22 rows.

**Greedy?** Yes, and the search is finite and stated: candidate cell counts (histogram of non-space
runs per line, top candidates) × `dropHead ∈ {0,1,2}` × delimiter candidates (all safe delimiters),
and for each column a fixed candidate list, each candidate rendered and tokenised. No beam, no
randomisation, no cross-column joint search. Deterministic under `OMEGA_DET=1`.

**Time and CPU bound.** Grid inference is O(lines × candidate cell counts) over offsets —
milliseconds; plan selection is a bounded number of parent-free tokenisations (candidate cell counts
× `dropHead` × delimiters, and ~8 rendered candidates per column). The entire cost is the **gate**:
one parent encode of the source plus one parent encode of the grid wire, so the codec runs at the
parent's own speed — measured 9 s for `df-h` (7 columns), 176 s for `kubectl get pods` (7 columns,
22 rows, 1 006 tokens), 46 s for `ps -ef`, 99 s for `ls -l /usr/bin`, 183 s for a 41-row `ps aux`.
That cost grows faster than the text: the 151-line `ls -l` lane (5 194 raw tokens) did **not**
finish its gate in 57 minutes on a 2-core box and was killed, so its gate is unmeasured and
unclaimed (its census is 5 194 → 2 842 and the parent's own total on that lane is 1 476). A wire
whose `parent(wire) + clause` is not strictly below `parent(source)` is **refused**, and the refusal
is reported with both numbers.

**Measured gate** (`bench/x42/verify.ts`, one process per lane, real captured material, o200k, both
round trips checked through the stack's own decoder):

| lane | raw | frontier (X40) | KANNABOS | Δ | verdict |
|---|---|---|---|---|---|
| `df -h` (7 cols, 19 rows) | 570 | 250 | **146** | −104 (−41.6 %) | fires, exact |
| `kubectl get pods` (7 cols, 22 rows) | 1 006 | 340 | **301** | −39 (−11.5 %) | fires, exact |
| `ps -ef` (8 cols, 39 rows) | 1 144 | 315 | — | 414 ≥ 315 | **refused** |
| `ss -tan` (5 cols, 17 rows) | 843 | 209 | — | 319 ≥ 209 | **refused** |
| `ls -l /usr/bin` (9 cols, 39 rows) | 1 029 | 375 | — | 510 ≥ 375 | **refused** |
| `ps -eo pid,ppid,pcpu,pmem,etimes,comm --sort=-pcpu` (6 cols, 39 rows) | 1 087 | 389 | — | 479 ≥ 389 | **refused** |
| `ps aux --sort=-%mem`, 41 real rows (6 cols, 39 rows) | 1 106 | 397 | — | 505 ≥ 397 | **refused** |
| `ls -l`, 151 real lines (9 cols, 143 rows) | 5 194 | 1 476 | — | wire 2 842 | **gate not measured** — 57 min on 2 cores, killed |

Five of seven measured real lanes lose, and the report says so. The pattern is measurable: the parent is
already good at these tables (it charges a repeated line skeleton once), and KANNABOS only wins when
the columns themselves are **generative** — a device path, a size in `G`, a percentage, an IP that
steps. `ps -ef` is 39 rows of PID/TIME/CMD that no law covers, so its grid pays for the clause and
loses.

**Red team.** `bench/x42/rt.ts` — **91/91**. Groups: A 15 grammar refusals, B 10 boundary
deformations, C 8 adversarial sources (a `*` inside a value, the header glyphs `⟨⟩¦` *inside values*,
a `%` inside a modelled cell, ragged arity, unicode, an 8 kB line), D 300-case seeded fuzz, E 7
algebra checks, F 12 checks for the three patches (conforming header ejection, `%M` periodicity,
periodicity with one outlier, constant field, dangling/zero/one modulus refusal, plan-filtered
clause). **Re-running it after patches 10–12 found two real soundness bugs that no gate run would
have caught**, because both produced a wire that decoded to *itself*:

1. *The empty trailing line.* Every file ending in `\n` has a final empty line, which the encoder
   carries as an `L` row (that is how the final newline is represented). When **every** column is a
   generator that empty line is the *only* body line, so `header + "\n"` was both "one empty literal
   line" and "no body at all"; the decoder read it as no body, refused, and `kannabosDecode` returned
   its input — a silent identity. Fixed by resolving the ambiguity in the decoder (one `L` row and an
   empty body ⇒ one empty literal line).
2. *The close glyph inside a sample.* `L0t:⟨x⟩0/1` is a legal column, and the header terminator is
   the first `⟩` — which was then found *inside the sample*. The decoder now takes the last `⟩` that
   is followed by a delimiter and an EOL flag, which no sample can contain because the delimiter is
   chosen **absent from the source**.

**Honest citation.** Fixed-width framing is old (Hollerith cards, COBOL `PICTURE` clauses, Fortran
FORMAT); the *inference* of a fixed-width layout from alignment alone is standard tooling, not
literature: pandas `read_fwf(colspecs='infer')`, readr `read_fwf`, Alteryx "Parse Fixed-Width File
and Infer Columns", and the published "sieve" heuristic (positions that no row fills are boundaries —
the same idea as KANNABOS's anchor histogram). Every one of those systems infers a **parse**; none
treats the inferred grid as a **transmitted, token-costed message**. Adjacent, real, and citable:
the column store (Abadi, Madden, Ferreira, SIGMOD 2006) is the same de-interleaving for storage;
SuperBPE (Liu et al., arXiv:2503.13423, 2025) shows that BPE's whitespace pretokenisation makes a
space run a token **boundary**, which is exactly why the width of a gap is nearly free while its
occurrence is not; "Getting the most out of your tokenizer" (arXiv:2402.01035, 2024) treats the
pretokenisation scheme as a first-class compression lever; Afroozeh, Kuffó and Boncz (SIGMOD 2024,
`doi:10.1145/3626717`) compress JSON/text logs against grammars. Recent table
extraction work (TEAR, arXiv:2609.15205; "Table Serialization Determines Which Relations Language
Models Preserve", arXiv:2610.24798) studies how layout affects what a model recovers — worth saying
plainly: **none of it models the layout as a compressed message**, and KANNABOS's claim is only
about the wire, not about the inference.

**Limits, stated.** (i) A grid needs ≥ 4 rows and ≥ 3 columns; `df -h` on a 7-line filesystem and
`dpkg -l` produce no plan. (ii) `findmnt` plans but gains only 65 tokens (10 literal lines), so it
loses the gate. (iii) Periodicity is per field with a fixed period list; a column whose period is
prime and larger than 256, or whose step changes, falls back to `x`/`r`. (iv) The clause costs
53–72 tokens, which is the whole reason `ss -tan` and `ls -l /usr/bin` refuse.

## Generalized local leaders by structural category (X42 refresh, o200k, one chat message, `OMEGA_DET=1`)

`M` is the shipped one-chat message, `raw` the same text tokenised with no codec. "Leader" is the
codec with the smallest measured M on that lane. X42 adds one module (`kannabos.ts`) and one
registry entry; `git diff --stat 0ff0675..HEAD -- src/` shows **no line** of APOGRAPHE, METRON,
OURA, EUTELEIA, BPE or TYPOS changed, and the 31-lane frontier repeat (`bench/x40/frontier.ts`) was
re-run to check it: **29/31 lanes bit-identical**, 3 213 s wall. The two that differ are both the
*parent's* numbers, not the codec's: `markdown-table.md` 182 → 176 (the discrepancy X40 already
reported and could not reproduce) and `npm-ls.txt` 901 → **904** (+3 in both parent and total, a new
instance of the same instability — the two files are byte-identical to the ones the X39 receipt
measured, `chars` 635 and 6 688, and no parent file changed in this diff). Neither lane is an X42
lane, and no X42 number below rests on either.

| structural category | lanes (raw → M) | local leader | note |
|---|---|---|---|
| **Space-aligned CLI tables, generative columns** | df-h 570 → **146**, kubectl 1 006 → **301** | **KANNABOS (new)** | −104 (−41.6 %) and −39 (−11.5 %) against the X40 frontier; both exact |
| Space-aligned CLI tables, unstructured cells | ps-ef 1 144 → **315**, ss-tan 843 → **209**, ls-usr-bin 1 029 → **375**, ps-eo-cpu 1 087 → **389**, ps-aux 1 106 → **397** | frontier chain | KANNABOS plans on all five and **refuses**: 414 ≥ 315, 319 ≥ 209, 510 ≥ 375, 479 ≥ 389, 505 ≥ 397 — the wire is 448/519/540/532/565 against a 55–72-token clause, i.e. the values the grid cannot model (PIDs, commands, filenames) are what the parent is already good at. `findmnt` plans too, but its whole grid gain is 65 tokens against a ~55-token clause, so it was **not** worth a gate run; the 151-line `ls -l` lane is unmeasured because its gate did not finish in 57 minutes |
| **Prose, English, non-repetitive** | kb-article 656 → **622**, llm-answer 733 → **674**, email-thread 629 → **488**, meeting-transcript 472 → **385**, bibliography 896 → **671** | frontier chain | KANNABOS no-op: no repeated column geometry |
| **Prose, non-English** | de 525 → **457**, es 457 → **403**, ja 655 → **492**, pl 623 → **602**, ru 478 → **478**, tr 554 → **516** | frontier chain | no-op |
| **Delimited tables with a calendar column** | aapl 3 108 → **1 151**, vix 3 412 → **409** | APOGRAPHE | comma-delimited: the grid is not the schema there |
| **Rendered/bordered DB output** | psql 675 → **289** (APOGRAPHE chain; **245** with METRON) | METRON | `lin` on a two-decimal price column |
| **Tables with a wall-clock column** | cue-sheet 513 → **164** (X40 value, not re-measured this turn) | METRON | `clock: 00:00:02 /1,3` |
| **Markdown tables with a ramp + unit suffix** | markdown-table 330 → **176** | frontier (gate) | plan exists, refused on the clause floor |
| **TSV metrics with a decimal ramp** | metrics 811 → **237** (X42 value; lane is not in the 31-lane receipt) | frontier (gate) | planned, refused |
| **Application logs** | openstack 4 028 → **898** | frontier chain | no column geometry |
| **Path listings and trees** | npm-ls 2 747 → **901**, find-listing 3 997 → **1 279**, git-numstat 4 632 → **1 992**, ls-iso 1 175 → **367** | frontier chain | `ls -l` *does* plan (9 cols) but loses the gate — see above |
| **DB dumps / build output** | dump.sql 1 795 → **608** | frontier chain | — |
| **Markup (HTML/SVG/JSX/XML/TeX)** | page 3 220 → **547**, chart.svg 1 331 → **417**, component.jsx 296 → **264**, pom 544 → **242**, paper.tex 429 → **370** | frontier chain | indentation is not a grid: the columns do not repeat per row |
| **Diffs and stack traces** | unified-diff 578 → **419**, node-stacktraces 568 → **300** | frontier chain | — |

**The generalized rule (X42).** KANNABOS is the local leader exactly when (i) the text has ≥4 lines
with ≥3 space-aligned cells, (ii) **at least one column is generative** — a law over ≥3 values, a run,
or a dictionary amortised over many rows — and (iii) the grid wire plus a 53–72-token clause still
beats the parent's own one-chat total. Condition (ii) is the one that separates the wins from the
refusals, and it is measured, not assumed: `df -h` wins because its size/percent/device columns are
laws, `kubectl` wins because its IPs and ages are laws, and `ps -ef` loses because PID, TIME and CMD
are distinct-per-row values that no law and no run covers. This is the opposite of TYPOS's failure
mode: TYPOS lost on redundant cells, KANNABOS loses on *irreducible* ones.

## ΔΙΆΣΤΗΜΑ DIASTEMA (X43, `src/lib/omega/diastema.ts`, registry key `diastema`, exact, shipped this turn)

**What it is.** A codec for the **wide numeric token that repeats down a column and barely changes**:
a `find -printf` timestamp with ten fractional digits, an `ls --full-iso` clock, a `tar -tv` stamp,
a `stat` mtime, a CSV date plus price, an epoch column. It is the last remaining residual on the
path-listing category: after the whole frontier chain has run on `bench/holdout-ops/find-listing.txt`
the wire is still **40 % digit tokens** (`bench/x43/residual.ts`), and the column costs 2 159 o200k
tokens in place while the same values as signed decimal intervals cost **505** (`bench/x43/enc.ts`).

**The mechanism: intervals over a SHAPE, not values.** A shaped value is split into its **digit mask**
— every digit run replaced by `#` of the same length, literals verbatim — and one arbitrary-precision
integer formed by concatenating the digit runs:

```
2026-09-30T07:59:52.6403938810   →   ####-##-##T##:##:##.##########
                                      integer 202609300759526403938810
```

The mask is sent **once**. Each participating line then carries only the **signed decimal interval**
from the previous participant. The reader keeps a running total, adds the interval, writes the
decimal expansion **left-padded with `0` to the mask's total digit count**, and fills the `#` runs
left to right. Nothing is interpreted: no calendar, no time zone, no rounding, no field-validity
test — so ten-digit nanosecond fractions, four-digit years, one-digit counters and nineteen-digit
epoch stamps are the same case, and a 30-digit value is as exact as a 6-digit one (BigInt).

**Wire.** One self-describing header line, then the source with the shaped token replaced in place:

```
Δ ¦ <mask> ¦ <j> ¦ <eol> ¦ <pattern>
<body: every source line in order, the j-th space-token of a RECORD line = its interval>
```

`<j>` = 0-based ordinal of the shaped token among the line's non-space runs; `<eol>` = `s` (LF) or
`S` (CRLF); `<pattern>` = run-length line pattern, `R120L1` = 120 interval lines then 1 literal. The
header delimiter is chosen from characters absent from the source. A marker glyph would cost one
token **per line** (that is HORA's shape); a run pattern costs six characters once. CRLF is settled
once, globally; **mixed** end-of-lines are refused rather than normalised.

**Decimal, by measurement.** The same interval stream costs 505 o200k tokens as signed decimals, 626
as base-36 and 563 as base-62. BPE packs digit runs densely and letters sparsely, so the "obvious"
wide alphabet loses. Nothing about the envelope is conventional; it is the cheapest of the three
candidates that were measured.

**Greedy?** Yes, and the search is finite and stated: token ordinals 0…7, grouped by mask; each
candidate mask/ordinal pair is scored on its own **rendered** tokens (column cost − interval cost −
mask cost), the best-paying column wins, and no beam, no randomisation and no joint search over two
columns happens. Deterministic under `OMEGA_DET=1`.

**Four gates, all on the identity arm.** G1 `diastemaDecode(wire) === source` **before** any
measurement; G2 the parent (OURA) round-trips the transform through the stack's own decoder; G3
`|parent(transform)| + |clause| < |parent(source)|` on rendered tokens; G4 the emitted wire decodes
to the source through the reader's path. A failure returns the parent's own wire and a note with
**both numbers** — a refusal is printed, never hidden.

**The clause is measured, not guessed.** Five phrasings of the same rule were tokenised
(`bench/x43/cl.ts`, `cl2.ts`, `cl3.ts`) and differed by up to 2× (99, 78, 67, 60, 45) with no change
in meaning. The shipped clause is **46 o200k tokens**:

```
Δ: mask = value shape with # per digit. R: add the first space-token (signed int) to a sum
from 0 and print it into the #s, zero-padded; L: verbatim. Print.
```

(for `j ≠ 0`: `space-token <j> (0-based)`, which costs more and is only paid when the shaped token is
not the leading one).

**Time and CPU bound.** Planning is one pass per candidate ordinal (≤ 8) with BigInt chaining —
13 ms on a 122-line lane, and the whole plan is bounded by the line count × 8. The cost is the gate,
exactly as for every codec in this stack: one parent encode of the source plus one of the transform
— measured 107 s + 96 s on the 4 k-token `find-listing` lane (2 cores, deterministic tokenizer).
Those parent encodes dominate and are text-dependent: the 2 739-token `apt-real` lane took **289 s
for the single parent encode of its transform**, which is why that lane's gate was not run.

**Measured gate** (`bench/x43/verify.ts`, one process per lane, same clock; `parent` = OURA, the
direct parent; `chain` = `apographeEncode` = the shipped frontier's one-chat total):

| lane | raw | parent (OURA) | chain (APOGRAPHE) | DIASTEMA | Δ vs chain | verdict |
|---|---|---|---|---|---|---|
| `holdout-ops/find-listing.txt` (real, 120 rows) | 3 997 | 1 279 | 1 279 | **1 140** | **−139 (−10.9 %)** | fires, exact |
| `holdout-x40/prices.csv` (synthetic holdout, 30 rows) | 582 | 226 | 209 | **133** | **−76 (−36.4 %)** | fires, exact |
| `holdout-tab/aapl-2014.csv` (real market data, 163 rows) | 3 108 | 1 450 | 1 151 | 1 336 | +185 vs the chain | fires, then **loses**: APOGRAPHE already models the date column |
| `holdout-x40/metrics.tsv` (synthetic holdout) | 811 | 237 | 237 | 237 | 0 | refused: wire+clause 247 ≥ 237 |
| `holdout-ops/ls-full-iso.txt` (real) | 1 175 | 367 | 367 | 367 | 0 | refused: wire+clause 447 ≥ 367 |
| `holdout-ops/openstack-loghub-26.log` (real) | 4 028 | 898 | 898 | 898 | 0 | refused: wire+clause 982 ≥ 898 — `proxyGain` was +271 in favour and the measurement disagreed |

Every lane, fired or refused, round-trips **EXACT** through `apographeDecodeResult` followed by
`diastemaDecode` — the reader's own path, not the encoder's copy of its input.

**Refusals with a stated reason.** `git-numstat`, `git-log-stat`, `git-log-fuller`,
`node-stacktraces`, `ps-real`, `ls-l-real`, `du-real`, `tsc-diag`, `node-versions` contain **no
column of ≥6 shaped values with ≥6 digits sharing one mask**. That is the honest boundary: three
independent counters per line, or sizes and PIDs sitting in different columns on different lines,
are not an interval column. `apt-real` does plan (10 rows, column gain 60 tokens) and is reported as
**ungated**: one parent encode of its transform took 289 s on this box, and 60 tokens cannot pay a
46-token clause on top of that.

**Red team.** `bench/x43/rt.ts`, **50/50**: 18 header-field refusals (missing/extra delimiter, empty
mask, mask without `#`, mask over 64 characters, ordinal out of range, non-integer interval, bad eol
flag, bad pattern letter, pattern/body length mismatch, interval that would overflow the mask — each
returns the input **unchanged**); 10 boundary cases (30-line listing, CRLF, no final newline,
negative steps, one row below the minimum, mixed EOLs, blank line, mask ending in a literal,
decreasing values); 6 adversarial shapes (source starting with `Δ`, a source containing every
candidate delimiter, a body line shaped like a header, a widening column, a 30-digit delta, a shaped
token at end of line); 200 seeded random listings (199 plans, **0 bad round trips**); and 14 algebra
cases including the clause's own token budget. Two real bugs were found this way: **CR is a token**
(the ordinal pointed at `\r` and the chain diverged — fixed by settling EOL once), and the first mask
grammar (`^#+([^#]+#+)*$`) refused masks that **start or end with a literal** (`id-###.bak`) — the
rule is now any mask containing a `#`, ≤ 64 characters.

**Honest ancestry and citation.** HORA (`hora.ts`, X13) is the ancestor and is cited as such: it
replaces a `YYYY-MM-DD HH:MM:SS.mmm` on the **same date** with a millisecond offset, and its own
boundary list says what it cannot do (date changes stay literal, 6- and 9-digit fractions unmatched,
timezone suffixes untouched, DAEDALUS parent). DIASTEMA is that idea generalised until the format
stops mattering — any mask, any widths, any separators, any position, any digit count, no magnitude
or calendar restriction — plus the run pattern and the decimal envelope, gated against the current
parent. The interval-coding idea itself is old and external: delta/delta-of-delta timestamp coding in
the Gorilla TSDB (Pelkonen et al., *Proc. VLDB* 8(12):1816–1827, 2015, doi:10.14778/2824032.2824078)
and PForDelta-style integer-delta coding (Zukowski et al., ICDE 2006, doi:10.1109/ICDE.2006.150;
Lemire & Boytsov, *Software: Practice and Experience* 45(1):1–29, 2015, doi:10.1002/spe.2203,
arXiv:1209.2137) both compress a *column of integers* by differencing. What is new here is not the
delta: it is (a) the **mask carried once as text** so the value never has to be parsed as a date, a
float or an integer field, (b) the **run pattern instead of a per-line marker** inside a chat message,
(c) the **decimal envelope chosen by measured BPE cost over base-36/base-62**, and (d) gating the
transform against the *shipped* parent on rendered tokens. Adjacent and **not** substituted:
arithmetic-progression generation (METRON `lin`, KANNABOS `t:`) needs a law that holds — here the
interval only has to be cheaper than the value; run-length coding of equal values does not apply
(every value is distinct); a dictionary costs an index letter per line; nothing is sorted, bucketed
or rounded.

## κάνναβος KANNABOS (X42, `src/lib/omega/kannabos.ts`, registry key `kannabos`, exact, shipped this turn)

**What it is.** A codec for the most common shape of CLI output and the one no earlier codec could
parse: **space-padded fixed-width columns** — `df -h`, `ps aux`, `kubectl get pods`, `docker ps`,
`ss -tan`, `ls -l`, `dpkg -l`. Every codec before it splits a record on a **separator character**, and
these commands print no separator at all. KANNABOS reads the source as **character offsets**, infers
the grid, and transmits the **geometry**: the padding is never sent, it is regenerated.

**The mechanism.** A header line names, for each column, its **anchor** and its **codec**; then one
block per column; then the literal lines:

```
⟨7¦L0w25¦L37r1¦L45d2¦L57t:0/1%4¦L68t:2d0h/1,1¦L76t:10.244.0.0/0,0,1%8,11¦pL1R22L1⟩¦s
```

- `L<n>` — the cell starts at character `n` (left-aligned); `R<n>` — the cell ends at `n`
  (right-aligned, numbers); `T<n>` — the cell is the rest of the line, `n` spaces after the previous
  cell (this is what keeps `ls -l`'s name with a space in it inside the grid).
- Column codecs, each chosen by its own **rendered token count**: `w` fixed-width concatenation
  (the padding is free), `r` run list (`v*count`), `d` dictionary + index letters, `x` one value per
  line, `l:`/`k:` a METRON number or clock law, and `t:` a **compound law** — text plus several
  integer fields, each with its own affine step and optionally its own period (`s%M`, i.e.
  `(v0 + s·row) mod M`).
- `pL1R22L1` — run-length row pattern: `L` = literal line, `R` = row rebuilt from cells.

**Two fixes that made it work.** *Header ejection*: in a CLI table the header row is usually a
**conforming** row (`NAME READY STATUS …` sits on the same anchors as the data), so it enters every
column's value list and poisons every generator — the planner ejects the first 0, 1 or 2 lines into
the literal set and keeps the cheaper plan. *Per-field periods*: a round-robin column such as a pod
IP `10.244.0.0 … 10.244.0.88, 10.244.1.99` has fields stepping at different rates and no single
affine step list fits it; each field now searches a period list and may write `s%M` — without that,
`kubectl` (737 → 414 wire tokens) does not plan at all.

**Greedy?** Yes, and finite: cell-count candidates (histogram of non-space runs per line) ×
`dropHead ∈ {0,1,2}` × delimiter candidates, and for each column a fixed candidate list, each one
rendered and tokenised. No beam, no randomisation, no joint search across columns. Deterministic
under `OMEGA_DET=1`.

**Time and CPU bound.** Grid inference is milliseconds; the cost is the gate — two parent encodes.
Measured: 9 s for `df -h`, 176 s for the 22-row `kubectl get pods`. The 151-line `ls -l /usr/bin`
lane (5 194 raw tokens) did **not** finish its gate in 57 minutes on 2 cores and was killed, so its
gate is unmeasured and unclaimed.

**Measured gate** (`bench/x42/verify.ts`, one process per lane, same clock):

| lane | raw | frontier | KANNABOS | Δ | verdict |
|---|---|---|---|---|---|
| `df -h` (19 rows, 6 cols) | 570 | 250 | **146** | −104 (−41.6 %) | fires, exact |
| `kubectl get pods` (22 rows, 7 cols) | 1 006 | 340 | **301** | −39 (−11.5 %) | fires, exact |
| `ps -ef` (39 rows) | 1 144 | 315 | 414 | +99 | refused |
| `ss -tan` (17 rows) | 843 | 209 | 319 | +110 | refused |
| `ls -l /usr/bin` (39 rows) | 1 029 | 375 | 510 | +135 | refused |
| `ps -eo …` (39 rows) | 1 087 | 389 | 479 | +90 | refused |
| `ps aux` (41 real rows) | 1 106 | 397 | 505 | +108 | refused |
| `findmnt` | — | — | plan | — | not gated: whole gain ≈ clause cost |

**Red team.** `bench/x42/rt.ts`, **91/91**. It found two real soundness bugs, both fixed: a header
that passes the grammar but whose column blocks do not add up (now rejected by a full structural
check), and a row-pattern/body length mismatch (now the plan is refused rather than decoded
optimistically). The decoder is total: every malformed wire returns the input **unchanged**.

**Honest ancestry.** Fixed-width framing is as old as punched cards (Hollerith, COBOL `PIC`), and
fixed-width *parsing* is standard tooling (`pandas.read_fwf(colspecs='infer')`, `readr::read_fwf`,
Alteryx "Parse Fixed-Width File"). What is not standard is treating the **grid as the message**: the
layout is inferred at runtime, costed on rendered tokens, and the padding — usually 30–50 % of the
characters — is never transmitted. Whitespace as a token boundary is well documented in the
tokenizer literature (SuperBPE, arXiv:2503.13423; "Getting the most out of your tokenizer",
arXiv:2402.01035; Jurafsky & Martin §2.6.9), and column-wise storage is the classic column store
(Abadi, Madden, Ferreira, SIGMOD 2006, doi:10.1145/1142473.1142548). Compressing log *templates* is
Drain (ICSE 2017) and LogZip; compressing *grammar* is Afroozeh/Kuffó/Boncz (SIGMOD 2024,
doi:10.1145/3626717). None of them sends an inferred space-grid as the schema of a chat message, and
none of them gates the result on measured BPE cost.

**Adjacent and not substituted.** Not APOGRAPHE (which needs a single-character separator, and which
is exactly what refuses these lanes); not TYPOS (which masks characters *within* a token, not
geometry *across* a line); not METRON (a law for one numeric column, which KANNABOS calls as `l:`/`t:`
rather than re-implementing). The measured rule is stated at the end of this document.

## Generalized local leaders by structural category (X42 refresh, o200k, one chat message, `OMEGA_DET=1`)

`M` is the shipped one-chat message, `raw` the same text tokenised with no codec. "Leader" is the
codec with the smallest **measured** M on that lane. X42 adds one module (`kannabos.ts`) and one
registry entry (204 → 205); `git diff --stat 0ff0675..HEAD -- src/` shows **no line** of APOGRAPHE,
METRON, OURA, EUTELEIA, BPE or TYPOS changed, and the 31-lane frontier repeat (`bench/x40/frontier.ts`)
was re-run to check it: **29/31 lanes bit-identical**, 3 223 s wall. The two that differ are the two
X40 already reported and could not reproduce — `npm-ls.txt` 901 → **904** and `markdown-table.md`
182 → **176** — both in the *parent's* number, on lanes X42 does not touch, with `oura.ts` unchanged.
No X42 number rests on either.

| structural category | lanes (raw → M) | local leader | note |
|---|---|---|---|
| **Space-aligned CLI tables with generative columns** | df-h 570 → **146**, kubectl 1 006 → **301** | **KANNABOS (new)** | −41.6 % and −11.5 % against the frontier; both exact; 53- and 72-token clauses |
| Space-aligned CLI tables with irreducible cells | ps-ef 1 144 → **315**, ss-tan 843 → **209**, ls-usr-bin 1 029 → **375**, ps-eo 1 087 → **389**, ps-aux 1 106 → **397** | frontier chain | KANNABOS plans every one and **refuses** at the gate (414 ≥ 315, 319 ≥ 209, 510 ≥ 375, 479 ≥ 389, 505 ≥ 397): PIDs, socket pairs and command lines are distinct per row and the parent already handles them |
| **Path listings and trees** | npm-ls 2 747 → **904**, find-listing 3 997 → **1 279**, git-numstat 4 632 → **1 992**, ls-iso 1 175 → **367** | frontier chain | `find -printf` is the hill the next test should take: 40 % of the shipped wire is digits |
| **Prose, English, non-repetitive** | kb-article 656 → **622**, llm-answer 733 → **674**, email-thread 629 → **488**, meeting-transcript 472 → **385**, bibliography 896 → **671** | frontier chain | no repeated column geometry |
| **Prose, non-English** | de 525 → **457**, es 457 → **403**, ja 655 → **492**, pl 623 → **602**, ru 478 → **478**, tr 554 → **516** | frontier chain | no-op |
| **Delimited tables with a calendar column** | aapl 3 108 → **1 151**, vix 3 412 → **409** | APOGRAPHE | comma-delimited: the grid is not the schema there |
| **Rendered/bordered DB output** | psql 675 → **289** (APOGRAPHE chain; **245** with METRON) | METRON | `lin` on a two-decimal price column |
| **Tables with a wall-clock column** | cue-sheet 513 → **164** (X40 value, not re-measured this turn) | METRON | `clock: 00:00:02 /1,3` |
| **Markdown tables with a ramp + unit suffix** | markdown-table 330 → **176** | frontier (gate) | plan exists, refused on the clause floor |
| **TSV metrics with a decimal ramp** | metrics 811 → **237** (X42 value; lane is not in the 31-lane receipt) | frontier (gate) | planned, refused |
| **Application logs** | openstack 4 028 → **898** | frontier chain | no column geometry |
| **DB dumps / build output** | dump.sql 1 795 → **608** | frontier chain | — |
| **Markup (HTML/SVG/JSX/XML/TeX)** | page 3 220 → **547**, chart.svg 1 331 → **417**, component.jsx 296 → **264**, pom 544 → **242**, paper.tex 429 → **370** | frontier chain | indentation is not a grid |
| **Diffs and stack traces** | unified-diff 578 → **419**, node-stacktraces 568 → **300** | frontier chain | — |

**The generalized rule (X42).** KANNABOS is the local leader exactly when (i) the text has ≥4 lines
with ≥3 space-aligned cells, (ii) **at least one column is generative** — a law over ≥3 values, a run,
or a dictionary amortised over many rows — and (iii) the grid wire plus a 53–72-token clause still
beats the parent's own one-chat total. Condition (ii) separates the wins from the refusals and it is
measured, not assumed: `df -h` wins because its size/percent/device columns are laws, `kubectl` wins
because its pod IPs and ages are laws (with a per-field period), and `ps -ef` loses because PID, TIME
and CMD are distinct per row and no law or run covers them. That is the opposite of TYPOS's failure
mode: TYPOS lost on redundant cells, KANNABOS loses on *irreducible* ones.

## Generalized local leaders by structural category (X43 refresh, o200k, one chat message, `OMEGA_DET=1`)

X43 adds one module (`src/lib/omega/diastema.ts`) and one registry entry (205 → **206**). `git diff
--stat` over `src/` for this turn is `registry.ts | 11 ++` plus the new file: **no line** of
APOGRAPHE, METRON, OURA, KANNABOS, EUTELEIA, BPE or TYPOS changed. The 31-lane frontier repeat
(`bench/x40/frontier.ts`) was re-run: **29/31 lanes bit-identical, 3 223 s wall**, with the same two
parent-number differences as X42 (`npm-ls` 904, `markdown-table` 176) — no X43 number rests on
either.

| structural category | lanes (raw → shipped one-chat total) | local leader | note |
|---|---|---|---|
| **Path listings with a wide timestamp column** | find-listing 3 997 → **1 140** (chain 1 279), npm-ls 2 747 → **904**, git-numstat 4 632 → **1 992** | **DIASTEMA (new)** on find-listing; chain elsewhere | −139 (−10.9 %) on a real 120-row `find -printf` listing, exact |
| Path listings whose clock column is short | ls-iso 1 175 → **367**, ls-l-real, ls-l-nm, du-real, du-ak | chain | DIASTEMA plans on `ls --full-iso` (28 rows × 6-digit µs) and **refuses**: wire+clause 447 ≥ 367 — 28 rows cannot amortise a 30-character mask |
| **Application logs with a clock column** | openstack 4 028 → **898** | chain | DIASTEMA plans and **refuses**: 982 ≥ 898. `proxyGain` said +271 in favour — the parent models the repeated request line and intervalising the clock breaks its alignments |
| **Delimited tables with a calendar column** | aapl 3 108 → **1 151**, vix 3 412 → **409** | APOGRAPHE | DIASTEMA *fires* on aapl (1 336) and **loses** the chain by 185, and on vix its wire is 1 565 — a delimiter grid plus a column law already models the date |
| **Synthetic quote tables (masked SKU + date + price)** | prices 582 → **133** (chain 209) | **DIASTEMA (new)** | −76 (−36.4 %), exact; synthetic holdout, labelled as such |
| **TSV metrics with a decimal ramp** | metrics 811 → **237** (X42 value; lane not in the 31-lane receipt) | chain | DIASTEMA plans (19 rows, five masked columns) and refuses: 247 ≥ 237 — one mask spanning five columns costs more than the ramp |
| **Space-aligned CLI tables with generative columns** | df-h 570 → **146**, kubectl 1 006 → **301** | **KANNABOS** (X42) | unchanged this turn (frontier 250 / 340) |
| Space-aligned CLI tables with irreducible cells | ps-ef 1 144 → **315**, ss-tan 843 → **209**, ls-usr-bin 1 029 → **375**, ps-aux 1 106 → **397** | chain | unchanged: KANNABOS plans and refuses on all of them |
| **Rendered/bordered DB output** | psql 675 → **245** (METRON; APOGRAPHE chain 289) | METRON | DIASTEMA plans on the bare date column (24 rows, ord 5) with a wire of 577 — no gate spent, it cannot pay |
| **Tables with a wall clock** | cue-sheet 513 → **164** (X40 value, not re-measured) | METRON | DIASTEMA plans (28 rows, `##:##:##`) and has a wire of 420 — it cannot pay |
| **Prose, English** | kb-article 656 → **622**, llm-answer 733 → **674**, email-thread 629 → **488**, meeting-transcript 472 → **385**, bibliography 896 → **671** | chain | DIASTEMA is a no-op by construction: no ≥6 lines share one digit mask |
| **Prose, non-English** | de 525 → **457**, es 457 → **403**, ja 655 → **492**, pl 623 → **602**, ru 478 → **478**, tr 554 → **516** | chain | no-op |
| **Markup (HTML/SVG/JSX/XML/TeX)** | page 3 220 → **547**, chart.svg 1 331 → **417**, component.jsx 296 → **264**, pom 544 → **242**, paper.tex 429 → **370** | chain | no-op; refused for want of an interval column |
| **Diffs, stack traces, dumps** | unified-diff 578 → **419**, node-stacktraces 568 → **300**, dump.sql 1 795 → **608** | chain | no interval column |

**The generalized rule (X43).** DIASTEMA is the local leader exactly when (i) **≥6 lines carry one
token of ≥6 digits sharing a single digit mask**, (ii) the intervals are small enough that
`|intervals| + |mask| + 46` is **strictly** below what the parent already spends on that column, and
(iii) **no earlier codec already models the column** — measured on `aapl-2014.csv`, where APOGRAPHE's
comma grid plus a column law reaches 1 151 and DIASTEMA reaches only 1 336. Each condition is
falsified by a lane above: `git-numstat` fails (i), `ls-iso`/`metrics`/`openstack` fail (ii),
`aapl`/`vix` fail (iii). The mask is the term that decides: a 30-character timestamp mask amortises
over 120 rows and not over 28.

**How the three column codecs divide the work.** METRON fits a **law** to one numeric column (`lin`,
`clock`, `%M`); KANNABOS fits **geometry** to a whole space-aligned table; DIASTEMA fits **intervals
over a shape** when neither a law nor a grid exists but the numbers still march. Each refuses the
others' lanes, and every refusal is printed with both numbers instead of being hidden.

---

# X44 (2026-10-25) — ARCHETYPON and the second open-world axis

This turn adds one registry entry (`archetypon`, 207 keys) and one module
(`src/lib/omega/archetypon.ts`). No line of APOGRAPHE, METRON, OURA, EUTELEIA,
KANNABOS, DIASTEMA, TYPOS, ANAGNORISIS, BPE or CHIRON was changed.

## ἀρχέτυπον ARCHETYPON (X44, `src/lib/omega/archetypon.ts`, registry key `archetypon`, exact, shipped this turn)

**What the abbreviation decodes to.** *ἀρχέτυπον* = "the original pattern /
archetype": the first occurrence of something is kept as the pattern from which
later occurrences are regenerated. Two exact line-patch folds implement it.

**(1) PARAMETRIC fold.** The message names a canonical public text the reader
already holds verbatim (the standard MIT, ISC, BSD-2/3 or Unlicense text) and
carries only an exact line patch for the differences. Emitted message for
`bench/holdout/lic-mit.txt`:

```
Write the standard MIT License with these line edits. Line 3 is "Copyright (c)
Meta Platforms, Inc. and affiliates.". This is the whole message. Print only
the result.
```

That is 38 o200k tokens (contract counted, wire empty) against the shipped
frontier's 223 (which is also the raw count — the frontier fires nothing on a
223-token licence) and ANAGNORISIS's 41. The catalogue in `archetypon.ts` is an
**encoder-side measuring instrument** for the patch and the price; the decoder
is the reader's own knowledge of the named public text. The from-memory decode
is not assumed: it is written out in `bench/x44/X44.md` §H and diffed by a tool
call. The boundary is real and stated: a reader that does not know the named
text verbatim cannot decode this arm, so every shipped message is additionally
verified by an independent CPython reader with its own copy of the catalogue
(`bench/x44/archetypon_decode.py`, 10/10 exact).

**(2) SELF-CANON fold — the genuinely new, fully in-band mechanism.** A long
block that is a **near-duplicate** of an earlier block (same number of lines,
a few substituted lines) is replaced by ONE reference line

```
⟦4-52|3=Copyright (c) Acme;12=SOFTWARE.⟧
```

meaning "copy wire lines 4..52, then set line 3 to … and line 12 to …". A
delimiter absent from every patch value is chosen by measurement; the patch is
`set`-only so its application is order-independent (the X44 red team, cases
A8/G1, found and killed an earlier insert/delete LCS backtrack that was only
74/200 exact under seeded fuzz). Nothing outside the message is used: no
weights, no catalogue, no tools. It is exact by construction
(`selfCanonDecode(wire) === text` is checked before shipping) and total
(malformed references are returned unchanged, red-team cases D1–D6, 38/38).

**Greedy? No.** Template/span choice is an exact enumeration over the catalogue
× all anchored line offsets × all tail truncations; the line patch is an exact
positional diff re-applied to the template before shipping; the contract is a
3–6-wording auction measured with the live `countTokens`; the arm choice
(parametric / self-canon / prior-best identity) is an exact minimum over the
measured one-chat totals. The inherited frontier chain is a search, as
documented in its own modules. The identity arm is itself a measured tournament
between `apographeEncode` and `anagnorisisEncode`, so ARCHETYPON is never worse
than the best of those two on any measured lane.

**Source article (honest).** The open-world resource — the reader's parametric
memory as a shared codebook — was discovered in this repository by ANAGNORISIS
(Z45, `bench/z45/REPORT.md`), with the versioned GitHub/SPDX catalogue and
Carlini et al. (USENIX Security 2021, `usenix.org/system/files/sec21-carlini-
extracting.pdf`) as its citation. ARCHETYPON does **not** claim that resource as
new. What is new here is (i) the general exact line patch (LCS/positional
`set`-algebra with a measured delimiter) instead of a fixed slot/modifier set,
(ii) self-canon near-duplicate folding inside the message, (iii) the clause
auction, (iv) composition with `apographeEncode` rather than DAEDALUS, and
(v) the verification ladder including a live LLM hand-decode. Independent
2023–2026 literature that names the same resource but does not emit a one-chat
byte-exact wire: Deletang et al., *Language Modeling Is Compression*,
arXiv 2309.10668 (ICLR 2024); Valmeekam et al., *LLMZip*, arXiv 2306.04050;
*Lossless Token Sequence Compression via Meta-Tokens*, arXiv 2506.00307;
*Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning*,
arXiv 2604.13066; *Lossless data compression by large models*, Nature Machine
Intelligence (2025), doi:10.1038/s42256-025-01033-7. For the line-patch idea
the classical reference is the line-diff of `diff`/Myers (1986); nothing here
reuses its implementation.

**Time- or CPU-bound? CPU-bound.** This module consults no wall clock. The scan
is bounded by `MAX_TEXT = 40 000` chars, `MAX_LINES = 400`, `MAX_PATCH = 16`
and a 5-entry catalogue; the enumeration is O(catalogue × anchors × L²) with
L ≤ 400, and the 200-case seeded fuzz finishes in under a second. The only
expensive step is one `apographeEncode` of the (smaller) residual plus the
prior-best identity encodes: measured 7.8–131.8 s per lane on this 2-core
sandbox, dominated by the inherited frontier chain, not by ARCHETYPON.

**Measured (X44, `bench/x44/receipts/verify.jsonl`, `OMEGA_DET=1`, o200k,
contract counted).** 19 lanes: **12 strict wins vs the shipped frontier (10 from the new parametric arm, 2 from the prior-best identity arm = ANAGNORISIS)**, 0
regressions, 0 inexact. Ten real licence files (9 MIT, 1 ISC, taken from
`bench/holdout/` and the pre-existing `bench/z45/` corpus) go from 156–257 raw
tokens to 33–52 message tokens (−76 % to −83 %); each is 2–3 tokens below
ANAGNORISIS. `third-party-notices.txt` (a six-licence bundle) stays at the
prior best 129 (ANAGNORISIS) — the honest boundary: one short reference per
copy beats one long clause, so the identity arm wins there. All 31 shipped
X39 lanes were scanned for false positives: **0/31 fire**. The full repeat of
the frontier configuration is reported in §"Frontier repeat" below.

## Abbreviation → technical design spec (recent stack, X39–X44)

"Greedy" below = the encoder commits without backtracking; "search" = it
enumerates candidates and keeps the measured best. All M values are o200k
tokens of the one-chat message under `OMEGA_DET=1`.

| abbreviation | key | mechanism (decoded) | greedy / search | citation (honest) | bound |
|---|---|---|---|---|---|
| APOGRAPHE | `apographe` | comma-grid column predictors (`above`, `colM`, `days`, `+b`) | greedy per-column lift + two-pass search | internal (Re-Pair: Bille et al., arXiv 1704.08558, resemblance only) | CPU (parent wall-clock in production) |
| METRON | `metron` | absolute column generators `lin:V/i,S`, `clock` | greedy + wire-scored second pass | internal | CPU |
| TYPOS | `typos` | induced record skeleton (mask) + columnar de-interleave | greedy literal induction + exact gate | Drain (ICSE 2017); Abadi et al. SIGMOD 2006 | CPU |
| KANNABOS | `kannabos` | character-offset grid, padding regenerated | per-column measured choice + plan search | Hollerith/COBOL copybooks; `pandas.read_fwf`; SuperBPE arXiv 2503.13423 | CPU |
| DIASTEMA | `diastema` | digit mask + signed decimal intervals + RLE line pattern | greedy ordinal choice (≤8) | Gorilla (VLDB 2015); PForDelta (ICDE 2006); HORA (internal X13) | CPU |
| ANAGNORISIS | `anagnorisis` | public-canon recognition, `【SPDX;layout】` refs | exact catalogue match, not greedy | Carlini et al. USENIX Sec 2021; GitHub/SPDX catalogues (versioned) | CPU |
| **ARCHETYPON** | `archetypon` | exact line patch vs a canonical text (parametric) **or** vs an earlier in-message block (self-canon) | exact enumeration + LCS/positional diff + clause auction; not greedy | ANAGNORISIS (internal Z45); arXiv 2309.10668, 2506.00307, 2604.13066, doi:10.1038/s42256-025-01033-7 | CPU |

## Generalized local leaders by structural category (X44 refresh)

`M` = shipped one-chat message. "Leader" = the codec with the smallest
measured M on that lane. Categories not re-measured this turn keep the X43
values (no line of their codec changed).

| structural category | lanes (raw → M) | local leader | note |
|---|---|---|---|
| **Single canonical licence file** | lic-mit 223 → **38**; 9 real MIT files 218–237 → **33–52**; ISC 156 → **37** | **ARCHETYPON (new)** | −76…−83 % vs frontier; 2–3 tokens below ANAGNORISIS on every one; exact, from-memory decode verified |
| **Bundled licences / THIRD-PARTY-NOTICES** | third-party-notices 1338 → **129** | ANAGNORISIS | one short `【MIT】` reference per copy beats one long clause; ARCHETYPON correctly returns the prior-best arm |
| **Mangled CRLF Apache excerpt** | license.txt 1166 → **929** | frontier chain | no catalogue entry; ANAGNORISIS 968; ARCHETYPON identity |
| **Path listings / wide timestamp** | find-listing 3997 → **1 140** (chain 1 279), npm-ls 2747 → **904**, git-numstat 4632 → **1 992** | DIASTEMA on find-listing; chain elsewhere | X43 values unchanged |
| **Space-aligned CLI tables, generative columns** | df-h 570 → **146**, kubectl 1006 → **301** | KANNABOS | X42 values unchanged |
| **Delimited tables with a calendar column** | aapl 3108 → **1 151**, vix 3412 → **409** | APOGRAPHE | X39 values unchanged |
| **Rendered DB output** | psql 675 → **245** | METRON | X40 value unchanged |
| **Prose, English** | kb-article 656 → **622**, llm-answer 733 → **674**, email-thread 629 → **488**, meeting-transcript 472 → **385**, bibliography 896 → **671** | frontier chain | **still zero movement on general prose** — see the open gap below |
| **Prose, non-English** | de 525 → **457**, es 457 → **403**, ja 655 → **492**, pl 623 → **602**, ru 478 → **478**, tr 554 → **516** | frontier chain | ru is still identity |
| **Markup / code / diffs / logs** | page 3220 → **547**, chart.svg 1331 → **417**, component.jsx 296 → **264**, pom 544 → **242**, openstack 4028 → **898**, dump.sql 1795 → **608** | frontier chain | unchanged |

**Generalized rule (X44).** ARCHETYPON is the local leader exactly when (i) the
message *is* or *contains* a public canonical text whose identity costs fewer
tokens than its body, (ii) the differences from the canonical body are few
lines, and (iii) the reader knows that text verbatim — measured, not assumed,
by a from-memory decode and an independent reader. Condition (ii) is the new
part: a general line patch fires where a fixed slot/modifier set does not.
Condition (iii) is the boundary, and it is why the codec keeps a fully in-band
self-canon arm and a prior-best identity arm.

**The open gap, honestly (updated by X45).** The prior suggestion to test a
word-stream canonical alignment was implemented in SYNKRISIS X45. It fires on
five of sixteen lanes (four BSD-3 renderings and one BSD-2 rendering), but not
on general prose or the operations listing; the six-copy MIT arm is a separate
one-hole repeat fold. The email quote-depth probe reconstructs exactly but
loses the full-message gate by 148 tokens. Thus the new axis is measured and
useful on a narrow canon family, while the everyday prose/ops gap remains.
Current receipts and the historical frontier re-test are in
`bench/x45/X45.md` and `bench/x45/receipts/`.

---

# X45 (2026-10-26) — SYNKRISIS: canonical word edits and layout side information

This turn adds registry key `synkrisis` (the measured registry now has 208
entries) and `src/lib/omega/synkrisis.ts`. It composes neither a new hidden
reader table nor a private system prompt: the contract names a public text and
the full contract + wire is measured in one chat. The complete formal model,
negative space, corpus tables, adversarial analysis, receipts, and current
research review are in [`bench/x45/X45.md`](../bench/x45/X45.md).

## Mechanism

**WORD-CANON.** The encoder enumerates the 50 public text entries in the
versioned `CANON` catalogue, anchors a candidate at its first three words, and
computes a dynamic-programming LCS over the whitespace-delimited word streams.
Each hunk becomes a unique old-phrase → new-phrase substitution. The payload
also carries the exact line word-count vector, sparse leading-space counts,
EOL kind, final-EOL bit, and untouched prefix/suffix. Separating lexical edits
from line layout is what lets a rewrapped BSD license be represented without
sending every changed line literally. Tabs, mixed EOL, doubled internal spaces,
trailing spaces, oversized inputs, and too many hunks/changed words are refused,
not normalized.

**MULTI-COPY.** If a source is 3–25 exact standard MIT texts separated by the
specified literal separator and differing only at line 3, the message sends
the copyright-line values once each. The reader substitutes each value into
the same 21-line template, then joins the blocks. It is not a general
third-party-notice dictionary.

The public canon snapshot is from [`choosealicense.com` commit
`f717b235f404c60b656bfbc1643f623d02ec10a7`](https://github.com/github/choosealicense.com/tree/f717b235f404c60b656bfbc1643f623d02ec10a7),
recorded in `src/lib/omega/canon-catalog.ts` (2026-10-02). The separate MIT
multi-copy template lives in `src/lib/omega/archetypon.ts` and is named in the
message contract. The catalogue is encoder-side measurement/reference data;
it is not transmitted as a hidden decoder table.

## Selection and exactness

- **Greedy/search.** Template candidates are enumerated. Word LCS is an exact
  dynamic-programming alignment for each candidate; phrase context tests are
  bounded from 0 to 10 and choose the first unique recoverable context (so this
  local patch choice is deterministic, not a global minimum-token diff). The
  two arm families are both priced as full messages. The shipping choice is
  the shortest exact candidate that strictly beats ARCHETYPON; otherwise the
  prior-best message is returned. Thus: no greedy template selection, a
  bounded first-valid phrase-context heuristic inside each LCS hunk, and an
  exact measured minimum over the emitted candidate set. No global optimality
  claim.
- **Counted M.** For a nonempty contract,
  `M = countTokens(contract + LF + wire, o200k_base)`. The strict-win test is
  applied to this full message, not raw wire or raw input. Exactness tolerance
  is zero UTF-8 bytes.
- **No-regression boundary.** The comparator is ARCHETYPON's prior-best message
  (its own prior tournament includes the shipped frontier and ANAGNORISIS),
  not every specialist codec. The SYNKRISIS result is always `M ≤ parent M` on
  the measured lane; it is not a repository-wide Pareto guarantee.

## Honest source citation and prior art

There is no paper for this exact codec combination. The actual public text
source is the pinned ChooseALicense snapshot above. Word LCS and exact phrase
diffs are standard algorithmic ingredients; [VCDIFF, RFC 3284](https://www.rfc-editor.org/rfc/rfc3284.html)
is byte-oriented delta-code prior art. I do **not** claim to invent word
diffing, dictionary encoding, or lossless delta coding.

Adjacent recent work has different constraints: [Lossless Prompt Compression
via Dictionary-Encoding and In-Context Learning](https://arxiv.org/abs/2604.13066)
places its dictionary in the system prompt; [Lossless Token Sequence
Compression via Meta-Tokens](https://arxiv.org/abs/2506.00307) adds vocabulary
and fine-tunes the reader; [Text-Preserving Lossy Text
Compression](https://arxiv.org/abs/2605.29000) explicitly permits lossy
reconstruction. None of those differences establishes novelty. SYNKRISIS is
positioned narrowly as a measured one-chat, no-system-prompt, exact public-text
word-edit + layout wire, with a strict parent gate.

## Time / CPU bound

The new word scan is CPU-bounded: 50 canonical text entries, at most 800 words
per candidate, and at most 800 layout lines. The dominant LCS bound is
50 × 800² cells; phrase uniqueness and layout construction are additionally
bounded by the same word, hunk, and context caps. The repeat arm is capped at
25 values and 40,000 source characters. Neither new transform consults a wall
clock.

That is not the total `synkrisisEncode` latency: it first computes the inherited
ARCHETYPON/APOGRAPHE parent floor. In production, the inherited DAEDALUS family
uses `min(20,000 ms, 1,200 + 1.1 × inputChars)` as a wall-clock search budget.
`OMEGA_DET=1` freezes that search clock, so benchmark runs continue to natural
completion. The serial 16-lane X45 run took 263.347 s overall, with measured
per-lane times 4.486–68.762 s; these are measurement-mode times, not a
production latency guarantee. See `bench/x45/receipts/verify.log`.

## Measured outcome (X45, 16 declared lanes)

All M values are o200k one-chat totals. `Δ` is SYNKRISIS minus the ARCHETYPON
prior-best message.

| lane | prior M | SYNKRISIS M | Δ | arm |
|---|---:|---:|---:|---|
| Django BSD-3 | 296 | **228** | **−68** | word-canon |
| NumPy BSD-3 | 301 | **262** | **−39** | word-canon |
| Go BSD-3 | 282 | **217** | **−65** | word-canon |
| pandas BSD-3 | 331 | **259** | **−72** | word-canon |
| HTTPie BSD-2 | 309 | **265** | **−44** | word-canon |
| six-MIT third-party-notices | 129 | **80** | **−49** | multi-copy |

Suite: 16/16 exact, 16/16 parent-gate pass, six strict wins, ten
identity/no-gain, zero failures; parent sum 7,077 → SYNKRISIS sum 6,740 (−337
across this declared corpus). The four short BSD-3 renderings and one BSD-2
rendering are all canonical-text wins. No general English prose or ops lane
improved.

The 19-lane X44 corpus comparison is 19/19 exact and no-regression, with one
strict win (the six-MIT bundle) and 18 identity results. The current two X45
runs both measure `find-listing` parent M=1,267. The archived X44 log says
1,279, but does not record a source hash or exact parent build, so the
historical 12-token difference remains unresolved; the old and current values
are kept separate. DIASTEMA remains the local `find-listing` leader at 1,140.

Generalized leaders: SYNKRISIS is a local leader for the sampled close,
canonical BSD license renderings and the six-copy MIT bundle. ARCHETYPON /
ANAGNORISIS remain leaders for short single-license references; DIASTEMA stays
ahead on the sampled listing; the shipped frontier stays ahead on prose.
`bench/x45/X45.md` §C gives the lane-specific values and scope. The frontier
subset was re-run after parser hardening: 16/17 match the X39 receipt; only
`markdown-table.md` is 176 rather than 182; fourteen lanes are untested.

## Verification and negative cases

- TypeScript check passes; the 16-lane corpus suite, 19-lane X44 comparison,
  12-case red team, CPython reader, and registry smoke all pass after final
  decoder hardening. Receipts: `bench/x45/receipts/verify.log` and sibling
  JSONL/text files.
- CPython independently reconstructs Django BSD-3 (1,552 bytes, SHA-256
  `b846415d1b514e9c1dff14a22deb906d794bc546ca6129f950a18cd091e2a669`) and
  the six-MIT bundle (6,497 bytes, SHA-256
  `8a50b476df5ddfd5a67f6c4c4a3a0127ce4e6160675dd8e7da76fc3f353b759e`). It
  also compares the two direct text-only model hand-decodes to those LF source
  texts. This does not establish that every LLM remembers the same license
  version; no external model was called in this turn.
- The exact email quote-depth probe is rejected: candidate M=636 versus parent
  488 (Δ +148). Ordinary prose, Flask's double-space variant, the PyTorch
  bundle, the custom PostgreSQL notice, and the sampled ops inputs remain
  identity at the parent floor.

**Current verdict:** exact and no-regression against its stated parent on the
declared corpus; strict wins are real but narrow. No general-prose or ops gain
is established. The human-readable model and 20-item negative-space review
remain in `bench/x45/X45.md`.

---

## X46 — BIFRONT (`bifront`, `src/lib/omega/bifront.ts`; registered)

- **Mechanism.** On a bounded homogeneous path-like row list, remove the longest common suffix (2–64 Unicode code points) from every final path field, then place the exact JSON-quoted suffix in the in-band English contract. Run SYNKRISIS X45 on the transformed text. The message decoder is the parent decoder followed by exact suffix restoration; the structural restore preserves line terminators and non-path text. There is no hidden dictionary, system prompt, or external decoder.
- **Greedy or search.** The planner makes one deterministic maximal/longest suffix choice: greedy, with no suffix-length tournament, backtracking, or search over alternate transforms. The only selection is a binary full-message gate: candidate is emitted iff its exact round trip succeeds and complete `o200k_base` M is strictly below the complete SYNKRISIS X45 parent M. Otherwise the parent message is returned.
- **Citation / prior art.** No paper supports a novelty claim for this codec. Shared suffix/rear coding is established string-dictionary prior art: Kanda, Morita, and Fuketa (2017), [paper](https://kampersanda.github.io/pdf/InnovateData2017.pdf); Ferragina, Rotundo, and Vinciguerra (2025), [“Two-level massive string dictionaries”](https://www.sciencedirect.com/science/article/pii/S0306437924001480). [VCDIFF, RFC 3284](https://www.rfc-editor.org/rfc/rfc3284.html) is broader byte-delta prior art. These are adjacent algorithmic codecs, not evidence that an LLM will decode this one-chat contract. No novelty claim is made for suffix factoring.
- **Time/CPU bound.** The suffix planner is O(n) in total input/path length and O(n) working space. An eligible input invokes SYNKRISIS twice (original and transformed), so the wrapper adds parent work; there is no wrapper-wide CPU cap. The inherited production search uses `min(20,000 ms, 1,200 + 1.1 × inputChars)` as a wall-clock budget per call. With `OMEGA_DET=1` that clock is frozen and the search runs to natural completion; the post-optimization `find-listing` lane took 121.249 s in that mode.
- **Measured outcome.** Against SYNKRISIS X45, 16/16 lanes and the separate 19/19 X44 comparison are exact and no-regression; both record **zero strict wins** (sums 6,740→6,740 and 5,696→5,696). The post-optimization exact `find-listing` candidate is M=1,281 vs parent 1,267 and is rejected; current emitted output is the 1,267-token parent. A separate CPython reader verifies the complete candidate and its suffix restore exactly.
- **Verification boundary.** Final TypeScript passed; red team 29/29, including 16 negative-space cases and a `.js`/`.jsx` modal-shortcut falsification. `bench/x46/verify-independent.py` uses the independent X39 CPython parent reader plus its own suffix restoration and passes on the serialized `find-listing` candidate. No external LLM decode was run; exact conventional-reader checks do not establish universal LLM-native exactness.
- **Status.** Registered, but an X46 measured negative: no token gain, increased encode work on the eligible listing, and no general prose/ops Pareto improvement. Full formal model, branches, local leaders, frontier discrepancy and live research review are in `bench/x46/X46.md`.

---

# X49 (2026-10-27) — KOLUMN: bounded exact column laws for delimited text

**Registry key:** `kolumn` (`src/lib/omega/kolumn.ts`, deep-audit-only).
**Fidelity:** exact UTF-8 reconstruction for valid UTF-8 text. The message is
self-describing and contains its decoding contract; no skill, hidden system
prompt, external tool, or side model is part of the design. **LLM-native
one-chat decoding was not tested**, so only the local decoder is verified.

KOLUMN accepts bounded, rectangular, unquoted delimited text with a literal
header and at least eight data rows. It preserves header, separator, LF/CRLF,
and final-EOL state. Each column independently uses the cheapest exact
candidate among literals (`L`), constant (`C`), identical earlier column (`R`),
periodic values (`Qp`), UTC ISO date/whole-second progression (`T`),
fixed-scale signed deltas (`Dk`), cyclic signed deltas (`Gkxp`), or arithmetic
progression (`Pk`). Decimal arithmetic uses `BigInt`; ambiguous spelling stays
literal. Unsupported or malformed tables are refused, never normalized.

**Greedy/search status.** The delimiter parser checks four fixed separators
and chooses the rectangular interpretation with the most columns. Per-column
mode selection is deterministic bounded enumeration with exact `o200k_base`
descriptor counts and a deterministic tie-break; columns are optimized
independently, so this is not a globally optimal joint search. The complete
message stage compares direct KOLUMN and APOGRAPHE-composed KOLUMN. Only the
exact full-message count decides emission.

**Measured gate and scope.** The strict gate is against the measured same-source
TAGSTACK parent set (SYNKRISIS, eligible BIFRONT, KANON, AKOLOUTHIA-2,
APOGRAPHE, DIASTEMA, eligible METRON/HEMERA) plus SIBLING-TEMPLATE. This is
not a registry-wide tournament. The fresh `metrics.tsv` gate is exact, complete,
and no-regression: raw 811, frontier 210, candidate and emitted message **209**,
one strict win and one-token margin. A fresh, explicitly configured frontier
repeat again measured 210; receipt `bench/x49/receipts/frontier-repeat-metrics.tsv.json`.

Other evidence is deliberately weaker and labeled accordingly: VIX candidate
567 loses to 409 and falls back; AAPL's transform-only wire is 3,118 versus raw
3,108; the Markdown-table transform-only wire is 341 versus raw 330; the
`prices.csv` parent probe is 199 versus its previous 133-token frontier and is
not a fresh full gate. Prose, `find-listing`, and `ls-full-iso` are refused.
No general prose or ops gain is claimed. Full results, mode details, 15+
non-solutions, formal model/quantifier order, H+/H−/H∂, six branches,
structure-specific adversaries, repair re-gates, runtime caveats, and a
bounded sourced survey of AI-mathematics claims are in
[`bench/x49/X49.md`](../bench/x49/X49.md).

**Honest sources / prior art.** KOLUMN does not claim a new compression
primitive. PAX's column-oriented page layout, Gorilla timestamp/delta coding,
PForDelta integer deltas, ALP decimal-to-integer compression, Pcodec's numeric
mode/delta/binning pipeline, and especially 2026 FLEA's periodic lossless time
series compression are relevant prior art. See the linked references in
`bench/x49/X49.md`; the search was bounded, not a universal novelty proof.

**Time / CPU bound.** Local planning caps at 100,000 code units, 10,000 data
rows, 32 columns, and period 64. The inherited full-frontier search has no
wrapper-wide CPU/time cap and dominates cost; the current metrics run took
371,789 ms total (TAGSTACK 352,416 ms; KOLUMN call 19,363 ms). KOLUMN is marked
`deep` so ordinary codec audits do not pay this cost.

**Exactness caveat.** Encoder-produced strings round-trip byte-for-byte in the
local oracle and red team. KOLUMN has no checksum or authentication: a
syntactically valid tampered delta may decode to different bytes. It makes no
corruption-detection claim.

---

# X50 (2026-10-27) — ATX-RELEASE: exact dated-heading fold, no strict win

**Registry key:** `atx-release` (`src/lib/omega/atx-release.ts`, deep audit).
Full protocol, admissible domain, measured gate, prior art, category leaders,
research notes, and checkout provenance: [`bench/x50/X50.md`](../bench/x50/X50.md).

ATX-RELEASE maps `## TITLE (YYYY-MM-DD)` to `TITLE YYYY-MM-DD` and restores
matching lines after the parent decoder using a short in-band regex rule. It
uses no per-row marker. To keep that inverse injective, the encoder refuses if
any untouched line already matches the collapsed shape; it also refuses fewer
than three target headings, over-cap or ill-formed Unicode, and lone-CR line
endings. LF/CRLF and final-EOL state are preserved. The accepted inputs are
valid UTF-8 strings of at most 100,000 UTF-16 code units with only LF/CRLF, at
least three exact level-two dated headings, and no collision lines.

The candidate is the in-band ATX rule plus DAEDALUS on the transformed body.
It first compares the complete candidate against complete AKOLOUTHIA-2 on the
source, which is a named member of the X49 TAGSTACK runtime parent set. A
candidate that does not strictly beat that member cannot beat the set minimum,
so it falls back to AKOLOUTHIA-2 without running the expensive full tournament.
Only a candidate below AKOLOUTHIA-2 proceeds to the full TAGSTACK runtime
parents plus SIBLING-TEMPLATE; emission then still requires exact reconstruction
and a strict full-message win. A completed rejection returns the measured best
parent; if that full gate throws or does not complete, it fails closed to the
exact AKOLOUTHIA-2 fallback. This is not a registry-wide Pareto guarantee.

**Fresh X50 result.** On `bench/z57/lanes/prose-changelog.md` (34 headings,
raw 10,906 tokens), the transform-only raw text is 10,846 (−60), while the
complete candidate is **6,696** versus AKOLOUTHIA-2 **6,655** (+41). The
candidate is exact and rejected; emitted fallback is the 6,655-token parent.
Because it already loses to a measured member, the full TAGSTACK/SIBLING gate
was correctly skipped. No prose/ops Pareto win is claimed. Red team: 619
checks, 200 seeded generated cases, zero failures; TypeScript passed. No
external LLM was asked to decode it.

**X49 repeat.** The `metrics.tsv` TAGSTACK+SIBLING frontier still measures
**210** exactly (previous 210), with AKOLOUTHIA-2 winning; Node v22.22.3,
`OMEGA_DET` unset, `o200k_base`, source SHA-256
`b367e8d7ab00c2e3f9a63da90d6a68968bf7d29fd8d41b37f1ed3188edf1ac70`. The
fresh receipt and preserved pre-run receipt are under `bench/x50/receipts/`.
This reruns the frontier, not KOLUMN's 209-token candidate gate.

### Generalized local-leader snapshot

These are best-known **local** results from the named historical fixtures, not
one fresh registry-wide competition. The complete per-suite values and
source-scope warnings are in [`bench/x50/X50.md`](../bench/x50/X50.md).

| category | representative leader(s) | X50 status |
|---|---|---|
| English prose / KB / email / meeting / bibliography | existing frontier chain (X45 M: 622 / 674 / 488 / 385 / 671); DAEDALUS-D wins only small margins in the separate z57 suite | no X50 movement; ATX candidate loses +41 to AKOLOUTHIA-2 |
| Ops / path listings | DIASTEMA `find-listing` 1,140; KANNABOS space-aligned tables; DENS-2 on z57 listing/git-numstat fixtures | historical, different suites; no new ops win |
| Delimited data | KOLUMN `metrics.tsv` 209 vs the repeated 210 frontier; APOGRAPHE AAPL 1,151 / VIX 409 | frontier repeat is fresh; KOLUMN 209 is historical |
| Rendered DB / SQL | METRON `psql-output` 245; SYNKOPE `dump.sql` 608 | historical specialist lanes |
| Canonical notices | ARCHETYPON single MIT 38; SYNKRISIS six-MIT bundle 80 | narrow public-canon wins |
| Markup / code | TAGSTACK `pom.xml` 240 against a 242 parent | one historical markup fixture |

**Prior art.** Markdown whitespace/punctuation optimization is documented by
[`mdziper`](https://github.com/shenyizg/mdziper); that is close format-aware
preprocessing, not evidence for this exact byte-perfect one-chat transform.
[`ContextCompressionEngine`](https://github.com/SimplyLiz/ContextCompressionEngine)
uses a separate `verbatim` store for lossless restoration, outside this
one-message constraint. No compression-theory novelty is claimed. Native LLM
decoding remains unverified.

# X51 (2026-10-28) — SYLLOGISMOS: computed columns are premises, not payload

## συλλογισμός SYLLOGISMOS (X51, `src/lib/omega/syllogismos.ts`, registry key `syllogismos`, exact, deep, shipped this turn)

- **Name decoded.** Greek συλλογισμός, "a reckoning together, an inference":
  the decoder *infers* each removed field from premises (the surviving
  fields) instead of receiving it. Technical translation: **verified
  functional-dependency (FD) column elision for delimited tables**.
- **Mechanism (what is new in this stack).** Everything before X51 removes
  redundancy that is textual repetition (grammar rules), a vertical law in
  one column (AKOLOUTHIA-2, METRON, KOLUMN descriptors, APOGRAPHE
  `above`/`days`/`+b`), or an identical sibling (APOGRAPHE `colM`, KOLUMN
  `R`). No codec removed a column whose values are *computed across the
  row* — `COUTAX_FEMALEUNEMP = COUTAX × UNEMPF`, an ID assembled as
  `"age" + age + "_" + gender`, an `iso_country` that is `iso_region`
  before its dash. To a grammar those are fresh digit strings each row,
  because the redundancy is arithmetic/functional, not substring-shaped.
  SYLLOGISMOS enumerates a bounded FD family over the fields of a
  delimited table, verifies each candidate on **every row** with exact
  BigInt-rational decimal arithmetic **and** byte-identical CSV rendering
  (scale, gratuitous quoting, and header bytes all checked), deletes the
  columns it can recompute, states each dependency once in an in-band
  contract, and hands the reduced table to the cheapest measured of
  DAEDALUS / AKOLOUTHIA-2 / APOGRAPHE. Relation kinds: `arith`
  (A+B, A−B, A*B, A/B, 100·A/B; rendered exact-minimal, or at the
  target's constant scale with rounding mode in {half-up, trunc, ceil});
  `scaleK` (A*K for a fitted rational K with a short rendering);
  `concat` (constants + up to two fields); `split` (one part of a split);
  `case`; `lookup` (finite map, shipped in the contract, with a
  majority-default-plus-exceptions rendering when shorter); `shiftdiff`
  (A_i − A_{i−1}); `fwdeq` (A_{i+1}). **Constant and duplicate columns are
  deliberately excluded** — APOGRAPHE/KOLUMN own them, and a candidate
  whose computed values are constant or identical to another column is
  rejected in verification.
- **Gate (measured, frontier-scoped).** The complete candidate (contract
  + best parent message on the reduced table) must first beat both
  AKOLOUTHIA-2 and APOGRAPHE on the original — both are members of the X49
  TAGSTACK runtime-parent set, so losing to either proves it cannot beat
  that frontier — and then the full TAGSTACK + SIBLING-TEMPLATE frontier,
  strictly, with byte-exact decode. Any failure returns the measured best
  parent; nothing is emitted on raw-wire estimates.
- **Greedy?** The per-column relation enumeration is exhaustive within its
  bounded family and fully verified (not greedy). The *drop-set selection*
  is greedy: candidates are ranked by isolated column token mass minus
  contract-fragment cost, accepted subject to an acyclicity rule (a dropped
  column is never a source; a used source is never dropped), so inverse
  relations compete by mass — e.g. it may drop `unit = amount / qty`
  instead of `amount = qty * unit` when the `unit` column is heavier.
  No joint-optimality claim. Emission is a measured gate, not a search.
- **Honest source-article citation.** The mechanism class is **not new in
  the literature**. Exploiting dependencies between columns is the core of
  semantic/model-based lossless tabular compression: SPARTAN (model-based
  semantic compression of tables), SQUISH (Bayesian networks + arithmetic
  coding for relational data), "column dependency" formalized in
  *Theoretical Computer Science* 387 (2007) 273–283, DeepSqueeze
  (SIGMOD 2020, doi:10.1145/3318464.3389734), and Blitzcrank (VLDB 2024),
  all found in this turn's searches and all bit-level systems using
  arithmetic coding / learned probability models. What is new here is only
  the repository realization: exact *textual* rendering (decimal scales,
  rounding modes, CSV quoting), a one-chat LLM-readable contract with no
  side model, and the measured frontier gate. SQL's generated/computed
  columns and spreadsheet formulas are the everyday cousins of the same
  idea.
- **Time- or CPU-bound?** CPU-bound. The planner is bounded (100,000
  UTF-16 code units, 10,000 data rows, 32 columns, ≤8 drops, a
  30,000,000 cell-evaluation work cap, BigInt exact arithmetic). The
  inherited parent encodes and TAGSTACK frontier gate dominate wall time
  and have no wrapper-wide cap, so the registry entry is `deep: true`.
- **Verified reader burden, by kind.** `split`/`case`/`concat`/`lookup`
  are string operations an LLM performs by inspection; `arith` asks for
  one exact decimal operation per row (worst usual case: a 3-digit ×
  2-digit product or one division); `scaleK` is admitted only when K
  renders short (≤10-char decimal or ≤12-char fraction). A fitted-percent
  relation of the form `%MEM = trunc1dp(RSS × 100 / 4033536)` was measured
  exact on 59/59 rows of a real `ps aux` capture this turn but is **out of
  scope**: whitespace-aligned tables have no clean field-deletion byte
  model here and the 7-digit division is beyond the reader-arithmetic
  this codec is willing to demand.
- **Measured (see `bench/x51/X51.md` for receipts).** Real `csv-3.csv` (employment data, 32 rows): **673 vs the measured
  TAGSTACK+SIBLING frontier 678** — a strict full-gate win, margin −5
  (the ~90-token contract floor dominates at this size; two wordier
  contract drafts lost the same lane at 724 and 703). Real
  `airport-codes-300.csv`: candidate 8,100 vs best measured frontier
  member APOGRAPHE 8,115 (−15, member-level; full frontier not measured
  — single parent encodes took 412–462 s). Synthetic, labelled as such
  (`bench/x51/fixtures/orders-synthetic-160.csv`, 160 order lines with
  `total = qty × unit`, a split, and a concatenated reference):
  candidate 837 vs AKOLOUTHIA-2 1,769 / APOGRAPHE 1,812 (−932,
  member-level) — the scale economics of arithmetic columns, whose
  digits no vertical law can predict. Real `csv-5.csv` correctly falls
  back (candidate 798 vs 381; its cheapest-looking reduction is cyclic
  and refused). Red team 186/186; independent CPython decoder 24/24
  red-team cases + the 300-row airport lane byte-exact; three blind
  native LLM decodes (this model, contract-only) byte-exact.
- **Negative results from the same turn's probe portfolio** (all measured
  through DAEDALUS, `OMEGA_DET=1`, in `bench/x51/receipts/probe*.out`):
  SemVer / IPv4 mixed-radix or zero-padded packing loses on 9/9 lanes
  (+22…+67 after contract: DAEDALUS already prices a distinct version at
  the packed cost); disemvoweling inflates prose (+150…+2,948 raw tokens);
  `git log --stat` summary lines are **not** reliably the sums of the
  visible per-file counts (3/10 blocks in the fixture; binary/rename
  lines break the identity); `du -ak` parent sizes are the sum of listed
  children in only 2/62 cases in the (sorted, truncated) fixture;
  diff hunk-header counts are a 12-token ceiling.

# X52 (2026-10-28) — DIPTYCHON: ship one panel of the hexdump

## δίπτυχον DIPTYCHON (X52, `src/lib/omega/diptychon.ts`, registry key `diptychon`, exact, deep, shipped this turn)

- **Name decoded.** Greek δίπτυχον, a two-panel folding tablet. A hexdump
  line is exactly that: a hex panel and an ASCII panel (the gutter)
  printing **the same bytes twice**, plus an offset that is 16 × the line
  index. Technical translation: **canonical dual-rendering elision** —
  ship one panel, state the rendering rule once, let the reader re-render
  the frame.
- **Mechanism (what is new in this stack).** Grep over all 281 modules:
  `xxd` / `hexdump` / `gutter` = **0 hits** before X52. The nearest
  relatives are GRAMMA (regenerates *layout*: JSON/code indentation from
  structure) and KLADIOS (regenerates tree *connector glyphs* from a depth
  sequence) — both position-derived. The gutter is **value-derived**: a
  second encoding of the same values under a fixed external convention,
  which is why grammar codecs cannot absorb it (each gutter is fresh
  semi-random characters) and why it survived 51 turns. DIPTYCHON detects
  three canonical renderings — `od -t x1z` (hex/octal/decimal/no offsets,
  `*` squeezing), `xxd` (byte grouping, upper-case, decimal offsets,
  NUL-line autoskip), `hexdump -C` — by inferring parameters from the
  text, extracting the byte stream, and **verifying a byte-identical
  re-render of the whole input** (offsets, spacing, gutter, squeeze
  placement, final offset line). Only then is the frame stripped: data
  lines become compact hex (space-separated pairs or one continuous hex
  string per line — measured 16,990 vs 6,953 raw o200k tokens on an
  8 KiB dump; the planner picks per input), squeezed runs expand to
  repeated lines, other lines pass through, and the reduced text is
  coded by the cheapest measured of DAEDALUS / AKOLOUTHIA-2 / APOGRAPHE.
- **Gate (measured, frontier-scoped).** Identical construction to
  SYLLOGISMOS: beat AKOLOUTHIA-2 and APOGRAPHE on the source (necessary
  condition — both are TAGSTACK runtime-parent members), then the full
  TAGSTACK + SIBLING-TEMPLATE frontier strictly with byte-exact decode,
  else return the measured best parent.
- **Greedy?** No. Format detection is a small deterministic candidate set
  arbitrated by whole-input byte-exact re-rendering — a wrong parameter
  guess can only refuse, never emit. Compact form is chosen by direct
  token count. Emission is a measured gate.
- **Honest source-article citation.** None — no paper stands behind this.
  Hexdump reversibility is as old as the tools (`xxd -r` reverts a dump
  to binary; "Canonical hex+ASCII display" is util-linux `hexdump -C`
  terminology, man hexdump(1)). The claim is only the verified, one-chat,
  LLM-re-renderable realization with a frontier gate, in a stack that had
  no hexdump mechanism.
- **Time- or CPU-bound?** CPU-bound. Planner is linear (caps 2,000,000
  code units, 300,000 lines); inherited parent/frontier encodes dominate
  with no wrapper-wide cap, so `deep: true`.
- **Reader burden, measured not asserted.** Blind contract-only decodes
  by this model: round 1 (4 fresh samples) 0/4 byte-exact — every
  failure a gutter dot-count or one nibble-segmentation slip; round 2
  (4 fresh samples, positional discipline) 3/4 byte-exact incl. octal
  offsets and `*` squeeze reconstruction. The contract is sufficient;
  counting dots in ASCII gutters is the known fragility. (Receipts:
  `bench/x52/receipts/blind-decode.json`, `bench/x52/blind/`.)
- **Measured (see `bench/x52/X52.md`).** Real `od` over 8 KiB of `/bin/ls`: candidate **3,014 vs AKOLOUTHIA-2
  5,401 (−44%)** at frontier-member level; real 512 B dump: **385 vs
  414** (DAEDALUS/AKO2 tie). The full TAGSTACK+SIBLING frontier has not
  completed on any hexdump lane (APOGRAPHE alone exceeds 1,500 s on the
  8 KiB dump; four frontier attempts stopped at 12–34 min) — so, as with
  SYLLOGISMOS on airport, the codec's own gate currently gates it *off*
  such lanes in practice until the frontier is affordable; the wins
  above are necessary-condition evidence and are labelled that way.
  Red team 227/227 against real GNU od ground truth; Python decoder
  30/30 + lanes; blind decodes 3/4 byte-exact on fresh samples.
- **Also this turn:** SYLLOGISMOS repair — candidate ranking now charges
  the *true* rendered-clause token cost (real `{name}`/quoted refs) where
  X51 used placeholder `field N` refs; red team re-run 184/184 (two
  adversarial near-misses that previously scraped a plan now refuse;
  check-count drift explained in X52.md), Python cross-decode 24/24
  re-verified. The `metrics.tsv` frontier was re-run a third time:
  **exactly 210**, unchanged.

# X53 (2026-10-28) — TAXIS: derived columns in space-aligned tables

## τάξις TAXIS (X53, `src/lib/omega/taxis.ts`, registry key `taxis`, exact, deep, shipped this turn)

- **Name decoded.** Greek τάξις, arrangement/formation — the order that
  lets a column be recomputed rather than shipped. Technical translation:
  **derived-column elision for space-aligned tables, restored by exact
  re-alignment under the original header**.
- **Mechanism (what is new in this stack).** Two parts, each verified
  absent over all 282 modules. (1) *Column-geometry inference with
  byte-exact re-rendering*: the header row's word spans are anchors; each
  column is fitted as L or R against them with a per-transition minimum
  gap (fitted as the minimum observed remainder); a wide field pushes
  itself — and everything right of it — right as one piece (this rule is
  what survives procps overflow rows, where an 8-digit VSZ shifts the
  whole tail); the fit is accepted only if re-rendering every row from
  bare fields reproduces the block byte-for-byte. (2) *Ops-shaped
  derived-column families* SYLLOGISMOS cannot express: **`fittedPct`** —
  `pct = trunc/round(100·X/T)` at uniform decimals with the hidden total
  T solved from the rows as an exact rational interval (ps %MEM: trunc,
  T≈4,024,001 KB on this sandbox; `top`: round, T≈3,592,001 — procps
  really does use different modes in the two tools, discovered and
  verified this turn); **`pctOf`** (`100·A/B`); **`ceilShare`** —
  `ceil(100·A/(A+B))` with the %-suffix (df Use%); **`arith`** — exact
  `A±B`/`A·B` at the target's scale. Every cell of every row must verify
  in BigInt arithmetic. The reduced text is the table single-space
  joined minus the derived columns (header line verbatim), coded by the
  cheapest measured of DAEDALUS / AKOLOUTHIA-2 / APOGRAPHE under the
  standard strict TAGSTACK+SIBLING gate with best-parent fallback.
  Contract (82–90 tokens measured) states aligns as one word
  (`LRRRRRLLLLL`), gaps digitwise (`5111115131` = 4 tokens vs 19 spaced),
  and one clause per dropped column, e.g. `{%MEM} = 100*{RSS}/4024001
  truncated to 1 decimals`.
- **Scope.** Contiguous aligned blocks (≥4 rows, ≥3 columns) whose first
  n−1 fields carry no spaces; taps/dumps with space-carrying early cells
  (kubectl `READY 1/1` style is fine; `kubectl` COMMAND strings with
  spaces in middle columns are not), wrapped df rows, `%CPU` (needs the
  wall-clock "now"), and tab-containing blocks all fall back to
  SYLLOGISMOS/parents. Sibling of SYLLOGISMOS: same entailment genus,
  different table model — X51 named whitespace alignment SYLLOGISMOS'
  boundary; TAXIS is the crossing.
- **Greedy?** Geometry: no — exponential align search capped at 40
  columns, gaps derived not searched, whole-block re-render arbitrates.
  Relation discovery: exhaustive over the small family space with exact
  per-row verification; candidate ranking charges the *true rendered
  contract* and re-tokenizes the real reduced text, with whole-input
  restore + byte check as acceptance. Emission is a measured gate.
- **Honest source-article citation.** Genus prior art: FD/relational
  semantic compression — SPARTAN; SQUISH; DeepSqueeze (SIGMOD 2020,
  DOI 10.1145/3318464.3389734); Blitzcrank (VLDB 2024); redundancy-
  ranked top-k FD discovery (arXiv:2601.10130). For the specific
  realization — inferred table geometry + fitted-total/share relations
  as one-chat arithmetic an unmodified LLM re-renders byte-perfectly —
  **none** (no paper stands behind it; procps/`df` formatting is public
  tool behavior, re-derived here by measurement).
- **Time- or CPU-bound?** CPU-bound. Planner poly by caps (200k code
  units, 20k lines, 40 columns, 4 drops, 20M work units); parents and
  frontier dominate wall-clock (one full-gate encode on `top`: 436 s),
  so `deep: true`.
- **Reader burden, measured.** Blind contract-only hand decodes:
  24-row live `ps aux` ✓ byte-exact, 14-row ceil-share ✓, **50-row**
  endurance slice ✓ (overflow VSZ row, wide-RSS row, ~1.4k-char
  COMMAND). Independent CPython decoder from the contract text alone:
  6/6 lanes byte-exact. Red team: 241 checks, 1 miss (column-0
  right-aligned overflow) root-caused and fixed, re-run receipted in
  `bench/x53/`. Contrast DIPTYCHON's measured gutter fragility: short
  anchored fields proved robust for this reader; n=1, sufficiency
  claimed, not ease.
- **Measured (see `bench/x53/X53.md`).** Full-frontier win on real
  `ps aux` (ps-bigmem, 140 rows): **1,816 < 1,926** vs the complete
  TAGSTACK+SIBLING frontier measured in-encode (+110, 5.7%). Member
  level: ps-190 +8; `top` tie 818 = 818 (correctly no emit); sandbox
  −6, z57 −11, holdout −18 — declined with no-regression fallback. The
  win tracks derived-column entropy: 26 distinct %MEM values on bigmem
  vs near-constant `0.0` columns APOGRAPHE already prices ~free.
- **Also this turn (DIPTYCHON variants, X52 task 4):** plain
  `od -t x1/-t x2` (no ASCII panel; x2 odd byte counts refused — GNU od
  zero-extends) and `xxd -i` C byte arrays (items/line, indent,
  separator, 0x/0X prefix, last-comma inferred) in `diptychon.ts`,
  same infer-then-re-render discipline. Variants red team 61/61, X52
  red team re-run 227/227, independent Python decoder 5/5 from the
  contract, blind C-array decode exact. Member-level benches on 2 KiB
  of `/bin/ls`: C array **786 vs 991** (+205), plain `od -t x1` **766 vs
  1,116** (+350), `od -t x2` **796 vs 993** (+197) — continuous hex lets
  dictionary parents match across
  byte boundaries that the `0x`/space dressing fragments; receipts in
  `bench/x53/receipts/dip2-bench-segmented.log`. Full-frontier hex
  gates remain unaffordable (task 5 names the parents, below).
  X52 task 5: the hex-pathological frontier parents are SYNKRISIS,
  BIFRONT, DIASTEMA (>900 s on a 512 B dump where KANON/AKOLOUTHIA-2
  take ~3 s).


## ἀθροισμός ATHROISMOS (X54, `src/lib/omega/athroismos.ts`, registry key `athroismos`, exact, deep, shipped this turn)

- **Mechanism decoded.** Driven-recurrence elision for delimited
  tables: a column `y` with `y_i = y_{i-1} ± x_i` or
  `y_i = y_{i-1} + credit_i - debit_i` (bank-statement running
  balances) is dropped and recomputed by the reader from the shipped
  driver column(s), a seed, and at most 3 exception rows carried in
  the contract (real statements contain adjustments — statement_A's
  own generator documents a planted +25,000 break). Exact BigInt
  decimal arithmetic; both plain and German (1.234,56) renderings;
  reduced text coded by the cheapest measured of DAEDALUS /
  AKOLOUTHIA-2 / APOGRAPHE; standard strict TAGSTACK+SIBLING gate
  with best-measured-parent fallback.
- **Greedy?** Relation fitting is exhaustive over the small family
  space with exact per-row verification; ranking charges the true
  rendered contract; whole-input restore arbitrates; emission is
  the measured gate.
- **Honest source-article citation.** Genus prior art: lazy
  dependency discovery (CIDR 2022); column-dependency byte
  compression (2007). For driven-recurrence elision taught in-band
  to a stock LLM: **none**.
- **Time- or CPU-bound?** CPU-bound; planner caps 400k chars / 20k
  rows; inherited parent + frontier encodes dominate with no
  wrapper-wide cap; `deep: true`.
- **Measured (see `bench/x54/X54.md`).** Real statement_A (241 rows,
  raw 7,017 tok): candidate **2,002 vs best member 2,690, +688
  (25.6%)**; real German statement excerpt (200 rows, raw 10,229):
  **1,759 vs 2,411, +652** (APOGRAPHE timed out on both mai sides,
  labelled). Red team 111/111; independent CPython from-contract
  decoder 2/2; blind contract-only hand decodes 2/2 byte-exact.
  Full TAGSTACK+SIBLING frontier gate on statement_A (9,000 s
  rerun after EXIT=124 at 3,500 s and a sandbox-killed attempt):
  **applied, exact, `fullFrontierMeasured=true`, 2,002 < 2,686
  (+684), frontier-grade Solved** (3,318,958 ms). Reader-burden
  risk disclosed: carried running state means one arithmetic slip
  propagates below until an exception re-anchors.

## κεφάλαιον KEPHALAION (X55, `src/lib/omega/kephalaion.ts`, registry key `kephalaion`, exact, deep, shipped this turn)

- **Mechanism decoded.** Aggregate elision for delimited tables.
  A novelty source-read of every arithmetic relation already owned
  (SYLLOGISMOS rule union `{arith(binary), scaleK, concat, split,
  case, lookup, shiftdiff, fwdeq}` at `syllogismos.ts:83-90`, TAXIS
  binary, ATHROISMOS integrating down a column, APOGRAPHE/METRON
  predicting from above or row index) shows the stack cannot state
  an **n-ary aggregate**: a Total column equal to the sum of *many*
  fields of its row, or a Total *row* whose cells are the sums of
  their columns. KEPHALAION fits, in exact BigInt decimals:
  `rowsum` (target = Σ of a fitted subset of ≥2 term columns, empty
  field = 0 — the TT-over-13-regions shape), `headsum` (target =
  head column − Σ subset, the Active = Confirmed − Recovered −
  Deaths shape), `colsum` (one aggregate row — first, last, or
  labelled Total/Sum/Gesamt/… — whose verifying numeric cells are
  blanked and refilled as column sums), and the rowsum+colsum
  composition (restore order teachable: rowsums first, then column
  sums — proved order-safe when the original identity holds).
  ≤3 exception rows ship in the contract; plain and German number
  styles; a target printed coarser than its terms is handled by
  exact scale division. The reader recomputes sums; there is **no
  carried state** (contrast ATHROISMOS) — an arithmetic slip
  damages exactly one cell. Reduced text coded by the cheapest
  measured of DAEDALUS / AKOLOUTHIA-2 / APOGRAPHE; candidate must
  beat AKOLOUTHIA-2 and APOGRAPHE on the source, then the full
  TAGSTACK+SIBLING frontier strictly, else the measured best
  parent is returned (never worse).
- **Greedy?** Subset fitting is exhaustive for ≤16 term-eligible
  columns (2^k sum table, multi-probe-row pruning, largest-subset
  preference); beyond that, contiguous ranges ∪ all-terms only
  (disclosed recall limit). Aggregate rows verified per cell
  (≥2 verifying numeric cells). Ranking charges the true rendered
  contract (74 tokens on the 13-term win via "the sum of fields
  4 to 16"); whole-input restore + byte check arbitrates;
  emission is the measured gate.
- **Honest source-article citation.** Genus prior art:
  functional/order dependency theory for databases (Kossmann et
  al., *VLDB Journal* 2022, DOI 10.1007/s00778-021-00676-3; FDX,
  "A Statistical Perspective on Discovering Functional
  Dependencies in Noisy Data", SIGMOD 2020), window-SUM as the
  producing operation of these columns, Gorilla (VLDB 2015) for
  the dense-small-increment economics intuition (mechanism not
  used). For exact n-ary-aggregate/aggregate-row elision taught
  in-band to a stock, unmodified LLM reader: **none**.
- **Time- or CPU-bound?** CPU-bound. Planner caps: 400,000 code
  units, 20,000 rows, 40 columns, 80M work units; no
  wrapper-wide cap (parents/frontier dominate), so `deep: true`.
  Planner on the 30.7k-char, 618-row win lane: seconds inside an
  18.6 s candidate-measure run (DAEDALUS-dominated).
- **Measured (see `bench/x55/X55.md`).** Real Ethiopia COVID
  regional breakdown (TT = Σ 13 region columns, 0 violations).
  150-row high-count slice (raw 5,304): members DAEDALUS =
  AKOLOUTHIA-2 1,096, APOGRAPHE **826** (the binding member on
  delimited numerics); candidates 914 (DAE/AKO2-coded), **811**
  (APOGRAPHE-coded reduced 737 + 74 contract) — **win +15 vs
  APOGRAPHE**. Full 618-row file (raw 20,741): candidate **2,931
  vs DAEDALUS 3,507, +576**, APOGRAPHE unmeasured there (1–2 h
  per side; labelled DAEDALUS-relative). Honest
  negatives: zero-dominated early slice 717 vs 643 (**loses**,
  parents price the zeros ~free — gate falls back); 38-row Indian
  state table 547 vs 513 (**loses** — 98-token contract with 3
  exceptions exceeds one column's savings at that row count);
  economics scale with rows × dropped-cell entropy over contract
  size. Red team 96/96 (independent BigInt renderer, 40-config
  randomized sweep, real-lane refusals incl. airport60 and
  statement_A); independent CPython from-contract decoder 6/6
  byte-exact (rowsum-range, headsum, de-style, colsum-only);
  blind contract-only hand decodes 3/3 (German rowsum, headsum,
  colsum). Full TAGSTACK+SIBLING gate on the 150-row slice:
  **applied, exact, `fullFrontierMeasured=true`, 811 < 835
  (+24), frontier-grade Solved** (5,451,410 ms; receipt
  `bench/x55/receipts/fullgate-ethiopiaMid.json`).


## ἰσοσκελής ISOSKELES (X56, `src/lib/omega/isoskeles.ts`, registry key `isoskeles`, exact, deep, shipped this turn)

- **Mechanism decoded.** Symmetric-square triangle elision for
  delimited tables. Every table dependency in the stack is
  row-local, column-local, or one-step: SYLLOGISMOS/TAXIS
  same-row functions, APOGRAPHE's predictor union `{above, col,
  days, workdays, int, lin, clock}` (read from
  `apographe.ts:185-199`), METRON index models, ATHROISMOS
  column recurrences, KEPHALAION row/column aggregates. None
  reaches across the diagonal: in a symmetric square (distance
  matrices, correlation matrices, similarity/adjacency
  matrices) cell (i,j) equals cell (j,i) — a transposition
  isometry whose source is an arbitrary other row *and* column,
  inexpressible by any one-step predictor (`col` copies within
  a line; `above` looks one line up). ISOSKELES finds the
  square block in the pandas-`to_csv` shapes (optional header
  row, optional label column, optional all-empty trailing
  padding columns — including the measured special case where
  header names equal the label column and the (n+1)² square
  including both is itself string-symmetric), verifies
  string-exact symmetry pair by pair (≤6 exception pairs and
  ≥95% symmetric; exceptions stay verbatim; quoted cells
  refused), blanks the strictly lower triangle — and the
  diagonal when it is one constant string — and has the
  reader refill each blank from its mirror across the
  diagonal, by names or by block coordinates. The reader only
  copies: no arithmetic, no carried state, a slip damages one
  cell.
- **Greedy?** No — the planner is an exhaustive search over
  the tiny shape space (3 delimiters × header × label width ×
  diagonal-constant choice) with exact pair verification,
  ranked by the true rendered contract + reduced token count;
  whole-input restore arbitrates; emission is the measured
  gate (cheapest of DAEDALUS/AKOLOUTHIA-2/APOGRAPHE on the
  reduced text, then the full TAGSTACK+SIBLING frontier
  strictly, else best measured parent).
- **Honest source-article citation.** Genus: BLAS/LAPACK
  packed symmetric storage (`UPLO` triangular formats) —
  classical numerical practice for typed arrays. For
  detecting string-exact transposition symmetry in an
  arbitrary delimited file and teaching the mirror rule
  in-band to a stock LLM reader: **none**.
- **Time- or CPU-bound?** CPU-bound. Planner O(rows·cols +
  n²) under caps (400,000 code units, n ≤ 500); inherited
  parent/frontier encodes dominate with no wrapper-wide cap;
  `deep: true`.
- **Measured (see `bench/x56/X56.md`).** Real US 31-city
  distance matrix (raw 4,701 tok): DAEDALUS/AKOLOUTHIA-2
  identity 4,701; APOGRAPHE 3,297; candidate **1,673
  (−49.3% vs APOGRAPHE)**. EU 24-city: **1,063 vs 1,841
  (−42.3%)**. Derived 14×14 Ethiopia-regions correlations:
  **470 vs 555 (−15.3%)**. APOGRAPHE was measured on both
  sides of every lane before any claim (X55's lesson). Red
  team 98/98; independent CPython from-contract decoder 4/4
  byte-exact; blind hand decode of a full small matrix
  byte-identical. Full TAGSTACK+SIBLING gate on us31:
  **applied, exact, `fullFrontierMeasured=true`, 1,677 <
  3,297 (−49%, +1,620 tok), frontier-grade Solved** (676,697
  ms; `bench/x56/receipts/fullgate-us31.json`). Economics
  scale with n²/2
  mirrored cells over an ~78–107 token contract, so small
  squares lose by design and fall back.

## συζυγία SYZYGIA (X57, `src/lib/omega/syzygia.ts`, registry key `syzygia`, exact, deep, shipped this turn)

- **Mechanism decoded.** Affine-twin elision with ±1-ulp residual
  correction for delimited tables. The affine map y = a·x + b between
  two *columns* (a≠1, b≠0) is expressible by no union member (read
  from source in X57): SYLLOGISMOS `arith` is one binary op and
  cannot chain a multiply and an add; `scaleK` is pure proportion
  (no intercept); METRON `lin` puts the slope on the row *index*;
  APOGRAPHE `int` adds a constant only vertically (`above + b`);
  TAXIS relations are percents and one binary op. Dual-unit exports
  live exactly in the missing corner (temp_c/temp_f, wind_mph/
  wind_kph, pressure_mb/pressure_in, feelslike/windchill/heatindex/
  dewpoint pairs in every WeatherAPI-style dump; °C/°F/K triples;
  calibrated sensor pairs value = raw·gain + offset; °C→K is the
  intercept-only corner). Measured twist: generators round each twin
  independently from one hidden exact value, so the naive exact law
  round(1.8·printed_C + 32) = printed_F fails on 15–45% of rows
  (temp 38/124, dewpoint 52/124 on the X57 lane) — the twin is not
  redundant, but its entire information beyond the affine law is a
  ternary rounding residual. SYZYGIA fits (a, b, rounding mode:
  halves away from zero, or truncate) in exact BigInt rational
  arithmetic such that **every row's residual lies in {−1, 0, +1}
  last-place units**, drops the target column, and ships one
  residual character per data row (+ add 1 ulp, − subtract, . exact)
  on a §N line under the reduced table; pairs that are exactly
  affine (conversion tables rounded once) ship no line. Up to 8
  drops per table, sources never dropped, plain/German rendering,
  per-cell canonical re-render checks, a §-look-alike source-guard,
  whole-input byte-exact restore arbitration. Reader protocol: one
  multiply-add, one rounding, one ±1-ulp nudge per restored cell —
  the SYLLOGISMOS scaleK burden class, stateless (a slip damages
  one cell; contrast ATHROISMOS). Reduced text goes to the cheapest
  measured of DAEDALUS / AKOLOUTHIA-2 / APOGRAPHE; the candidate
  must beat AKOLOUTHIA-2 and APOGRAPHE on the source, then the full
  TAGSTACK + SIBLING-TEMPLATE frontier strictly, else the measured
  best parent is returned (house gate).
- **Greedy/search.** Per ordered column pair: (a, b, mode)
  candidates are enumerated from exact two-point rational fits and
  their decimal roundings (≤8 places), verified over every row
  under the ≤1-ulp residual bound; among verified fits, a
  reader-burden price demotes non-terminating-decimal and
  big-denominator constants (24/43 loses to 0.556). Drops are added
  greedily by true rendered contract + reduced-text tokens (≤8;
  sources kept, so no cycles). Emission is the measured gate. So:
  bounded exact verification inside, greedy admission outside,
  true-cost arbitration on top.
- **Citation.** Affine/functional dependencies are database classics
  (survey: Kossmann et al., VLDB Journal 2022, DOI
  10.1007/s00778-021-00676-3). *Approximate* FDs (Kivinen–Mannila
  g₃; top-k AFD discovery, Wan & Han, arXiv:2605.24925;
  probabilistic FDs in Desbordante, arXiv:2607.23636) bound the
  *count* of violating tuples for data-quality auditing — they
  never reconstruct anything. For fitted affine twins with a
  ±1-ulp residual alphabet taught in-band for one-chat LLM
  recomputation: **none — no paper stands behind this mechanism.**
- **Time/CPU bound.** CPU-bound. Planner caps: 400,000 code units,
  20,000 rows, 64 columns, 120M verified cell evaluations
  (`SYZYGIA_MAX_WORK`); the india lane plans in ~57 s (45×44 ordered
  pairs). Inherited parent/frontier encodes dominate wall-clock
  with no wrapper-wide cap → deep-audit-only (`deep: true`).
  Measured X57 lane (124 cities × 45 cols): candidate **6,590 <
  7,112** vs AKOLOUTHIA-2 member; APOGRAPHE legs >1,700 s
  unmeasured; full frontier gate pending at documentation freeze
  (see `bench/x57/X57.md`).

## WORKMETER (X57, `src/lib/omega/workmeter.ts`, not a codec — no registry key)

- **Mechanism decoded.** Deterministic counted-work budget for
  ARIADNE's glyph-assignment search: `scoreRunCostDelta` ticks a
  module meter; exhausted windows stop the hill-climb and make
  `renderBest` emit the exact baseline assignment without pattern
  tables. Epochs are opened per TAGSTACK frontier parent, per
  ARCHETYPON identity arm, and (outermost only) by APOGRAPHE /
  AKOLOUTHIA-2 / DAEDALUS — nested epochs share the outer window,
  so wiring is order-safe. Counted evaluations are a pure function
  of the input: no clocks, no load-dependent wires.
- **Greedy/search.** Neither: it bounds an existing greedy search's
  effort. Default `2,000,000 + 100·chars` evaluations per window,
  calibrated 10–20× above measured knees (metrics.tsv TAGSTACK
  stays 210 down to 100k/parent; od8 keeps 142 from 200k/arm);
  `OMEGA_WORK_BUDGET` overrides (≤0 = unbounded, pre-X57 behavior).
- **Citation.** None (engineering). Calibration, starvation
  failure of the shared-window variant, and byte-parity receipts:
  `bench/x57/receipts/budget-sweep.md`.
- **Time/CPU bound.** Bounds ARIADNE evaluation counts only; the
  fixed per-`renderBest` setup was separately shortcut. Non-ARIADNE
  costs (APOGRAPHE's own planner on wide tables, SYNKRISIS
  catalog/LCS work) are **not** metered — recorded X57 follow-up.

## ζυγόν ZYGON (X58, `src/lib/omega/zygon.ts`, registry key `zygon`, exact, deep, shipped this turn)

- **Mechanism**: exact weighted-sum (linear-law) column elision. A column is
  dropped when it equals `round_mode(Σ wᵢ·xᵢ + b)` over same-row source columns
  with exact BigInt-rational weights, verified on every row at the printed
  scale (modes half-up / trunc), with ≤3 exception rows shipped verbatim.
  Equal weights are grouped in the contract (`0.01×({a} + {b} + {c})`).
  All-ones weights are refused (KEPHALAION owns plain sums), single-term laws
  are refused (SYLLOGISMOS scaleK), constant sources are excluded (collinear
  with the intercept). Up to 4 drops; sources are never dropped; plain and
  German number styles; an optional pre-header lead row (spreadsheet weights
  rows above the real header) is supported with verbatim lead-cell restore.
- **Fitting**: exact rational normal equations (AᵀA w = Aᵀy over all rows;
  least-squares averages the target's print-rounding so weights snap to the
  generator's clean decimals), singularity-guided column elimination for
  collinear sources, weight vectors snapped to k=0..6 decimals and each
  candidate re-verified per row. Greedy/search: drop admission is greedy by
  true contract+reduced token score over the exact-verified fits; no
  probabilistic search inside. Emission gated on measured DAEDALUS /
  AKOLOUTHIA-2 / APOGRAPHE parents then the TAGSTACK+SIBLING frontier with
  exact restore arbitration (measured-best parent returned otherwise).
- **Citation**: honestly **none** for the realization. Genus: arithmetic /
  linear functional dependencies (Kossmann et al., VLDB Journal 2022,
  DOI 10.1007/s00778-021-00676-3); spreadsheet SUMPRODUCT weighted-grade
  practice. Nothing found ships fitted rational weights as a grouped
  natural-language formula for one-chat LLM recomputation.
- **Time/CPU**: CPU-bound; planner caps 400,000 code units, 20,000 rows,
  64 columns, 120M work units (`ZYGON_MAX_WORK`), ≤16 terms, ≤24 candidate
  sources. Inherited parent/frontier encodes dominate wall time with no
  wrapper-wide cap, so deep-audit-only, like its siblings.
- **Workmeter (X58 update)**: `workmeter.ts` is now two-lane. The X57 ARIADNE
  score window (2,000,000 + 100·chars, `OMEGA_WORK_BUDGET`) is joined by a
  CHIRON unit window (400,000,000 + 20,000·chars, `OMEGA_CHIRON_BUDGET`,
  ≤0 = unbounded) opened per `workEpoch`; `chiron.ts` consults/ticks it, so
  per-call BlockSearchBudget multiplicity across thousands of parent calls is
  jointly bounded per encode.

## βαθμός BATHMOS (X59, `src/lib/omega/bathmos.ts`, registry key `bathmos`, exact, deep, shipped this turn)

- **Mechanism**: partition-window column elision — the first non-row-local
  dependency in the stack. A column is dropped when it is an exact
  SQL-window-function value over a partition of the table (whole table or
  one categorical column): competition / dense / ordinal `RANK` (sort key
  one numeric column or an exact rational ratio `A/B`, e.g. points per
  game; ordinal ties broken by up to two extra fitted keys, then original
  row order), `PERCENT_RANK`, `CUME_DIST` (×1 or ×100 at the printed
  scale, half-up/trunc), `NTILE` buckets (SQL balanced or `ceil`
  convention; optionally text labels), and share/index =
  source / (partition SUM or MAX). Laws are fit with exact BigInt
  rationals and verified on every row; ≤3 exception rows ship verbatim;
  ≤4 drops; sources and partition columns are never dropped; constant
  targets are refused (KOLUMN/APOGRAPHE territory); ordering fits whose
  primary key ties cover >50% of a partition are refused (file-order
  counters in disguise — METRON/APOGRAPHE territory); NTILE requires
  ≥2 rows per bucket on average (k = group size is ordinal rank in
  disguise). Plain and German number styles.
- **Fitting**: bounded deterministic enumeration over (target, source,
  partition, family) with per-row exact verification and greedy ordinal
  tie-break extension among near-fitting primaries; drop admission greedy
  by true contract+reduced token score over exact-verified fits.
  Emission gated on measured DAEDALUS / AKOLOUTHIA-2 / APOGRAPHE parents
  then the TAGSTACK+SIBLING frontier with exact restore arbitration
  (measured-best parent returned otherwise). Reader obligation: sort or
  sum each stated group — KEPHALAION-grade arithmetic plus an ordering.
- **Citation**: honestly **none** for the realization. Window functions
  are SQL:2003 machinery and order statistics / rank definitions are
  classical; the functional-dependency compressors (SPARTAN; DeepSqueeze,
  SIGMOD 2020; Blitzcrank, VLDB 2024; Virtual, EDBT 2025) are all
  row-local. Nothing found fits a window law and teaches it in-band for
  one-chat LLM recomputation.
- **Time/CPU**: CPU-bound; planner caps 400,000 code units, 20,000 rows,
  64 columns, 120M work units (`BATHMOS_MAX_WORK`), ≤128 partitions.
  Inherited parent/frontier encodes dominate wall time with no
  wrapper-wide cap, so deep-audit-only, like its siblings.
- **Workmeter (X59 update)**: CHIRON epoch default recalibrated
  400,000,000 + 20,000·chars → **4,000,000 + 500·chars** after measured
  spends showed outcomes stop changing 10–100× earlier (DAEDALUS on
  ewf-standings: 113M units spent, 5M cap byte-identical, 39.6 s →
  18.2 s under OMEGA_DET=1; `bench/x59/receipts/chiron-recal*`), and the
  ARIADNE glyph scorer gained an exact branch-and-bound prune
  (decision-identical by construction; metrics TAGSTACK wire
  byte-identical, −10.5% wall).

## EIRMOS (εἱρμός) — string-template column elision (X60, codec 224)

- **Technical design / precise mechanism delta.** SYLLOGISMOS already handles raw literals + up to two sibling fields (`concat`), whole-field case, and split; PARADEIGMA handles JSON sibling templates. EIRMOS's repository-new operator is a case/subfield transform on each individual source slot *inside* one concatenation (e.g. `lowercase-initial(first) + lowercase(last)`), plus up to three source slots, fitted for delimited columns. The encoder finds a target equal on each row to a concatenation of source fields, literals, and transforms (`id`, `lower`, `upper`, `capfirst`, `initial`, `lowercase-initial`, `UPPERCASE-initial`, `first2`, `first3`; character slicing is by Unicode code point, not UTF-16 unit). Enumerate up to six candidate sources after a sampled substring filter; enumerate ordered source tuples of length 1–3; for each, use a bounded segmentation search over up to three seed rows (48 segmentations per seed), retain candidates matching all but at most one seed, then exhaustively verify all rows. Up to three mismatches may be stored verbatim, subject to contract-safe exception constraints. Literals exclude quote/newline/backslash; case transforms require ASCII-cased source cells. A transform that is an identity on all rows is rejected as a duplicate disguised by an operator; one-source transform-only rules with ≤64 distinct source values are left to SYLLOGISMOS lookup. Sources are never dropped; ≤4 target drops. Greedy admission scores the actual contract + reduced text, preserves source columns, and requires byte-exact reconstruction. `eirmosEncode` uses measured exact parents and only emits when it beats the member precheck and then the full TAGSTACK+SIBLING source frontier strictly; fallback returns the measured best direct parent.
- **Greedy/search status.** The fitter is bounded deterministic search, not greedy: seed segmentation enumeration, ordered tuple enumeration, then exact all-row verification. The multi-drop choice is greedy by actual tokenized contract+reduced-table cost. Emission is not a proxy: it is a measured strict full-frontier gate. Candidate caps and order affect discoverability; exactness does not depend on a candidate being found.
- **One-chat reader contract.** One plain-language clause describes delimiter, insertion column/header, literals, field references and transforms; the reduced table's parent decoder remains in the same chat message. No external decoder, skills file, side channel, or hidden prompt. CPython twin independently decoded the fixture and all 20 applied/hand-authored red-team contracts byte-exactly. This is a concrete decoder check, not a guarantee about all LLMs.
- **Measured lanes.** (1) Public `lucidworks/fusion-financial-demo` finance-search sample (generated demo records, not real client data): 1,026 rows; `full_name = first + space + last`, 0 exceptions, 1,024 distinct values. 71-token clause. Member DET: AKOLOUTHIA-2 41,565 → EIRMOS 37,787 (−3,778, −9.1%); DAEDALUS 43,207 → 39,474 (−3,733). (2) Public real OpenPowerlifting raw results (sstangl mirror `meet-data/raw/1902` + `raw/1903`, same 48-column schema, record concatenation only; source files not vendored due repository AGPL-3.0). 124 lifters, exact `Full Name = First Name + " " + Last Name` with two verbatim exceptions, 97-token clause. Member DET: AKOLOUTHIA-2 8,620 → 8,175 (−445, −5.2%); DAEDALUS 8,764 → 8,333 (−431, −4.9%). CPython twin byte-exact; source SHA-256 `44d34480f3ccbd38da4a8cb224e5c3a90c3abe5a6ea435ea229d17ab2b3c19db`. Rebuild source with `bench/x60/fetch-openpowerlifting.sh`; receipts `member-openpowerlifting.json` / `twin-openpowerlifting.txt`. The real-record full TAGSTACK+SIBLING gate hit 2,500 s with no result (member-grade only). Separate generated `full-name.csv` gate passed exact: 629 < 1,017 in 289 s. Frontier-grade is claimed only for that generated lane. Both measured member laws above are plain raw concatenation, already within SYLLOGISMOS's concat family; they establish EIRMOS economics, not the unique per-slot-transform capability. The generated `username` case (`lowercase-initial(first) + lowercase(last)`) is the direct test of that repository-new operator (SYLLOGISMOS refuses it; see `mechanism-delta.json`); its shipped full gate is exact **563 < 775** in 64.9 s (`fullgate-username.json`). This proves the new operator is frontier-grade on generated input only; no real-data lane yet exercises that transform composition.
- **Citation.** Close prior art: Singh, “BlinkFill: Semi-supervised Programming By Example for Syntactic String Transformations,” VLDB 2016, https://rishabhmit.bitbucket.io/papers/vldb16.pdf; Gulwani, “Automating String Processing in Spreadsheets Using Input-Output Examples,” POPL 2011 (outside the last decade, cited as precursor only). Both synthesize string transforms/concatenations from examples for cell filling. For exact column elision, in-band contract teaching, model-readable reconstruction, and whole-message frontier gate: honestly **no direct paper citation**. The novelty claim is relative to this repository's stack, not a claim of global invention.
- **Time / CPU bound.** CPU-bound. Planner caps 400,000 UTF-16 code units, 20,000 data rows, 64 columns, four drops, three exceptions per drop, and 60,000,000 counted work units. Candidate source count is capped at six per target, tuple arity at three, sampled rows at 40; therefore the search is incomplete but bounded by these caps (the work meter currently counts source-filter and row-verification operations, not every string allocation/segmentation branch). Parent and frontier encodes are inherited and have no wrapper-wide wall-clock cap; deep-audit-only. Planner took 189 ms on the fixture; full gate receipt remains a separate end-to-end measure.

## X60 stack-speed note — DIASTEMA candidate membership

`diastemaPlan` previously tested `rows.includes(v.li)` for each value, once per candidate mask, which makes participant selection O(n²) in the number of values/rows for a mask. Replaced with a per-candidate `Set(rows)` and expected O(n) membership filtering. A/B on `sysctl-proc`: median of five planner runs 6 ms before / 5 ms after, same plan SHA and exact decode. Complete metrics DIASTEMA A/B: 149,589 ms before / 150,142 ms after, identical wire + contract SHAs and exact output (noise-level difference; both refused 247 ≥ 237). Thus the Set change improves an asymptotic subroutine but has **no demonstrated significant whole-codec speed gain**; X59 ARIADNE/CHIRON remain the accepted measured speedups. X60's independent six-arm profile listed DIASTEMA at 223.7 s standalone and METRON at 47.6 s, pointing to parent/search work outside the changed membership loop. Reproduce via `bench/x60/speed-ab-diastema.sh`; it materializes and removes the baseline module from commit `d7b204a`.


## X61 — SYNDESMOS (σύνδεσμος): in-band Markdown URL factoring

- **Technical design.** Intern repeated eligible inline Markdown destinations using first-seen in-band IDs; optionally factor a shared slash-terminated URL path prefix carried in-band. Unsupported Markdown forms, collisions, excessive inputs, and unsafe cases refuse. The exact inverse is checked before complete-message comparison; only a strict same-source frontier win emits.
- **Greedy/search.** First-seen ID assignment is deterministic greedy. Prefix selection is bounded candidate search (up to 64 estimated candidates), then exact transformed-text/contract token counting. The final decision is the complete TAGSTACK runtime-parent frontier plus SIBLING-TEMPLATE, not a raw payload/member comparison.
- **Citation / prior art.** CommonMark reference-link definitions provide close document-scoped URL reuse. Brisaboa & Cerdeira-Pena (CIKM 2019, DOI 10.1145/3357384.3357972) study hierarchical front coding / longest-common-prefix compression for URL collections. No global novelty claim; the project-specific claim is only the exact in-band realization and gate.
- **Time / CPU.** Source cap 120,000 UTF-16 code units, at most 20,000 eligible links, 64 prefix candidates; scan is linear plus bounded candidate evaluation. Parent/frontier runtime is inherited and uncapped by this wrapper.
- **Results.** Three exact complete candidates lose: README +162, public miniserve Markdown +144, and Canvas changelog +173 tokens versus their source frontiers. No leader changes. Receipts: `bench/x61/receipts/`; full formal/research record: `bench/x61/REPORT.md`.

## X62 — RHIZOMA (ῥίζωμα): tree-indent normalization

- **Technical design.** Recognize a narrow exact tree-indent shape where U+00A0 pairs with the vertical tree glyph, replace the pair with an in-band marker, and restore it without modifying filenames. Refuse malformed or ambiguous indentation. Complete contract+wire must strictly beat the measured source frontier; otherwise return the parent.
- **Greedy/search.** Deterministic linear scan, not a search; whole-message frontier gate is exact for the run.
- **Citation / prior art.** Existing repo tree grammar/indent mechanisms DENS-2/DENDRON/KLADOS are close prior art. No paper for this exact normalization is claimed and no global novelty claim is made.
- **Time / CPU.** Transform cap 200,000 UTF-16 code units, O(n); inherited complete-parent frontiers dominate and have no wrapper-wide cap.
- **Results / adversaries.** Exact, but `tree-src.txt` loses 12 tokens (999 vs 987) and `tree-bench.txt` loses 14 (255 vs 241); both fall back. TS and independent stdlib-Python tests cover astral filenames, CRLF/no-final-newline, reserved marker, malformed/off-pattern pairs, and ASCII-space shortcut. Receipts: `bench/x62/receipts/`; report: `bench/x62/REPORT.md`.

## X63 — ALPHAFOLD: lexical alpha-template folding

- **Technical design.** A bounded lexical scanner groups balanced `{...}` code spans with matching identifier-pattern signatures, sends only varying identifier names in per-instance maps, and retains all other bytes in shared templates/body. It is not an AST or semantic-equivalence codec. Collision-checked markers and byte-exact expansion are required; candidate contract, templates, mappings, and parent encoding are all charged.
- **Greedy/search.** Deterministic non-greedy planner ranks groups by estimated character savings and selects non-overlapping spans; it does not search token-space forms. Complete same-source frontier gate rejects non-wins.
- **Citation / prior art.** Nominal anti-unification and alpha-renamed code-clone research are close (Baumgartner et al., “Nominal anti-unification,” arXiv:2504.21097; AlphaCC, arXiv:2507.15226; “Semantic Code Clone Detection: Are We There Yet?,” arXiv:2606.25272). None is claimed as this in-band byte-exact codec; no global novelty claim. ALPHAFOLD is unrelated to DeepMind's protein model.
- **Time / CPU.** Scanner cap 200,000 code units; linear/bounded span planning, 1,000,000-character decoder cap. Parent and transformed-parent frontiers have no wrapper-wide cap; fixture planner 8 ms, full gate 131,516 ms.
- **Results / adversaries.** Exact but loses on `src/lib/omega/codec-synthesis.ts`: complete candidate 1,249 vs source frontier 1,114 (+135). TS red team 13/13 and independent Python twin 6/6. A six-input ROT13 screen increased raw token cost on all six and was rejected before full-frontier calls. Receipts and audit: `bench/x63/`.

## X64 — REPRISE: bounded exact-repeat result memo (speed only)

- **Technical design.** Encoder-only LRU memo keyed by exact source, encoding, and `OMEGA_DET`, `OMEGA_WORK_BUDGET`, `OMEGA_CHIRON_BUDGET`. On a miss, run TAGSTACK; store only `exact && frontierComplete` results. On an identical same-process hit, return a defensive clone of the saved result. The recipient still receives the original self-contained TAGSTACK contract+payload. REPRISE adds no wire syntax, decoder requirement, or compression transform.
- **Greedy/search.** No representation search; cold misses inherit TAGSTACK's bounded parent comparator and complete-message gate. Warm hits reuse the prior measured output. Because the message is unchanged, token cost is identical by construction; no strict compression gain is possible.
- **Citation / prior art.** No paper is claimed for ordinary bounded memoization. Fresh adjacent research: Kalcher, “Frequency-Ordered Tokenization for Better Text Compression,” arXiv:2602.22958v2 (2026), conventional binary preprocessing; Adler & Tang, “Synchronizing Probabilities in Model-Driven Lossless Compression,” arXiv:2601.10678v1 (2026), PMATIC arithmetic coding; Heringer & Doerr, WABI 2025 human-readable BPE grammar compression of GFA paths; Kudo & Richardson, SentencePiece, EMNLP System Demonstrations 2018. These are prior-art/context checks, not evidence of a one-message native-LLM decoder or REPRISE novelty. Direct links and scope assessment: `bench/x64/REPORT.md`.
- **Time / CPU / memory.** Cache admits at most 50,000 source UTF-16 code units, 8 entries, and 500,000 estimated retained JS characters including source-bearing key characters; this is not a hard RSS cap. Key construction O(n), result clone O(frontier-map size), expected Map lookup. Cold parent/frontier runtime has no wrapper-wide bound; one measured cold call was 136,733.854 ms. One warm 1,203-character repeat took 0.129 ms; single-run observation, not a stable general speed claim.
- **Measured complete message / attack test.** On `bench/holdout-x40/metrics.tsv`, cold `akolouthia2` and warm REPRISE messages both cost 210 `o200k_base` tokens and had identical message SHA-256 `f0e0ffb9543f3b2f7032067ed73d6fa3de84745639647fafdc109bdca1864628`; cold result was exact/frontier-complete. Six checks passed, including mutation of the returned cold result's message, wire, and nested cost map before the warm hit (cache copy remains unpoisoned). No native LLM decode, independent alternate decoder, or external reviewer. Runner/receipt: `bench/x64/reprise-cache.ts`, `bench/x64/receipts/reprise-cache.json`.

## Updated fixture-specific local leaders (no cross-lane ranking)

| Category / fixture | Best recorded evidence | X64 status |
|---|---|---|
| General English prose | X45 local values: knowledge base 622; LLM answer 674; email 488; meeting 385; bibliography 671 tokens | No X64 prose test; X63 ROT13 raw screen loses; no general-prose Pareto claim |
| Ops listings / CLI | `find-listing`: DIASTEMA 1,140; `df -h`: AKOLOUTHIA-2 171; `psql`: AKOLOUTHIA-2 355; `kubectl`: AKOLOUTHIA-2 326; KANNABOS leads selected aligned tables | No X64 ops test; historical fixture-specific leaders only |
| Repository source code | `codec-synthesis.ts`: source frontier 1,114; ALPHAFOLD 1,249 | X63 candidate loses +135; fallback, no new leader |
| Tree listings | `tree-src`: 987 APOGRAPHE; `tree-bench`: 241 SYNKRISIS | RHIZOMA loses +12/+14 and falls back |
| Structured records / metrics | `metrics.tsv`: 210 AKOLOUTHIA-2 at measured TAGSTACK-parent+SIBLING frontier | X64 cold/warm complete message remains 210; REPRISE affects only repeated sender-side runtime |
| Logs / arithmetic sequences | Existing DIASTEMA / METRON / ATHROISMOS / SYZYGIA fixture leaders | No X64 reranking |

The exact X61 frontier setup was rerun: same `metrics.tsv` SHA-256 `b367e8d7ab00c2e3f9a63da90d6a68968bf7d29fd8d41b37f1ed3188edf1ac70`, `o200k_base`, unset `OMEGA_DET`, Node v22.22.3, recorded six-parent-plus-SIBLING scope; exact match at 210 tokens, `akolouthia2`, `repeatMatchesPreviousGate:true`. Runtime 113,300 ms vs previous 94,136 ms: reproducible cost/winner, variable runtime, no speedup claim. It is not a registry-wide tournament.

## X65 — FOTAR (`fotar`): frequency-ranked in-band token aliases

- **Mechanism.** Count repeated multi-character BPE token surfaces, rank them with a deterministic character-mass proxy, assign collision-free aliases, replace the selected surfaces, and transmit the literal `[alias,surface]` JSON table in the same message. The contract says to decode the remaining self-contained parent message and expand the aliases left-to-right, longest alias first. The composed child is APOGRAPHE. The alias table is serialized; no encoder-side table is needed for the FOTAR expansion.
- **Greedy/search.** Bounded deterministic top-96 ranking/admission; no token-space search, no backtracking, and no testing alternate dictionary plans. The character proxy only proposes a plan. Emission is a binary exact gate against the complete same-source TAGSTACK runtime-parent frontier plus SIBLING-TEMPLATE. A candidate that is not exact or strictly cheaper is refused.
- **Citation / prior art.** No novelty claim. This is a specialization of dictionary coding and is close to the repository's VERITAS/PHALANX token-window/substring dictionary family. Related external work: *Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning*, [arXiv:2604.13066](https://arxiv.org/html/2604.13066); its experiment places the dictionary in a system prompt, unlike FOTAR's one-message table. The existence of FOTAR's code is not evidence of algorithmic novelty.
- **Time / CPU.** For N tokenizer pieces and V distinct multi-character surfaces, tokenization/frequency accumulation and rendering are O(N), plus O(V log V) deterministic sorting; V is bounded by input length. At most 96 aliases are kept. The final plan is token-counted once; earlier prefix rebuild/count work was removed without changing the fixed final candidate. The source frontier and APOGRAPHE parent encoders dominate end-to-end runtime and have no wrapper-wide bound. The two full OpenStack gates took 511,910 ms and 570,388 ms, with different source-frontier winners under the unset production-time budget.
- **Measured (X65, o200k).** FOTAR alias-table inverse: 12/12 TypeScript red-team checks and exact Python-twin restoration on its 919-codepoint control. Direct screens lose to raw: prose changelog 15,675 vs 10,906, file listing 6,730 vs 3,997, OpenStack 4,836 vs 4,028; `metrics.tsv` gets no plan. On the real OpenStack log, the complete composed FOTAR candidate is exact at 1,080 tokens. Two runs completed the exact source frontier at 896 (SYNKRISIS) and 885 (DIASTEMA); the final run used 885, so FOTAR falls back. No Pareto gain. Full record: [`bench/x65/REPORT.md`](../bench/x65/REPORT.md); receipts: `bench/x65/receipts/`.
- **Decoder boundary.** The FOTAR envelope/table inverse is tested using the serialized JSON, independent of encoder dictionary metadata. The full composition's APOGRAPHE decode check still uses result metadata (`apographeDecodeResult`); an end-to-end reader reconstructed solely from the complete candidate message was not tested. No native LLM decode is claimed.

## X66 — JSON-ESCAPE-FOLD (`json-escape-fold`): exact JSON escape-surface transform, no frontier win

- **Mechanism / contract.** In valid JSON strings, fold only the five lowercase spellings `\u003c`, `\u003e`, `\u003d`, `\u0026`, `\u0027` to their literal ASCII punctuation, with a collision-free private-use scalar immediately before each folded character. The one-message header carries the marker's code point and glyph plus the full inverse rule; the remainder is a complete self-contained TAGSTACK/SIBLING-TEMPLATE parent message. After parent decode, the reader replaces each `marker + < > = & '` pair by the corresponding exact lowercase source escape; all other text is copied. Uppercase spellings, quotes, backslashes, controls, other Unicode escapes, and non-JSON strings are not changed. Module: `src/lib/omega/json-escape-fold.ts`.
- **Greedy/search.** No greedy selection or subset search. A deterministic JSON-string scan folds every supported occurrence or refuses the plan. The first absent private-use scalar is selected by a source-scalar set. Emission requires exact source restoration, complete source and transformed TAGSTACK frontiers, a parseable serialized header, and a strictly cheaper direct token count for the complete transform contract + complete transformed parent message than the same-source TAGSTACK runtime-parent frontier plus SIBLING-TEMPLATE. Otherwise the exact measured frontier message is returned.
- **Prior art / novelty boundary.** New as a repository implementation only; no global-first or new compression primitive claim. It is adjacent to JSON escape/unescape and format-aware preprocessing. Stack scan found no exact registered equivalent but broad JSON/Unicode coverage (PARADEIGMA, SYNARTESIS, TYPOS, and related modules) means global novelty is not established. Related work includes LLMZip (OpenReview 2024 submission), SortComp (DCC 2022), LogLite (VLDB 2025), LogFold (ICSE 2026), RTCE (Findings ACL 2026), and explicitly lossy SemanticZip (May 2026); their scope and direct links plus a bounded AI-math claim audit are in [`bench/x66/REPORT.md`](../bench/x66/REPORT.md).
- **Time/CPU bound.** Input cap 80,000 UTF-16 code units. JSON validation and transform are O(n); marker selection is O(n + P), with P=137,468 fixed private-use candidates. No wrapper-wide CPU or parent-search time budget; latest full-gate time was ~347 s (MIT) and ~542 s (Apache) under 1,800-second shell limits, dominated by inherited parent/frontier encodes. Earlier full-gate timings varied under the unset production-time frontier behavior; these are single-run timings, not a speed claim.
- **Tests / decoder boundary.** `bench/x66/json-escape-fold-redteam.ts` completed with `checks: 11, passed: true`; covers all supported escapes, untouched literals and unsupported variants, JSON nesting, marker collision and full BMP PUA exhaustion (supplementary marker), malformed envelope/target, and refusal cases. `npx tsc --noEmit` passed. A separate stdlib-Python reader (`bench/x66/json-escape-fold-python-twin.py`) restored the MIT fixture's 8,433 UTF-8 bytes from the serialized header plus transformed text and matched the source SHA-256. It independently verifies only this transform layer; it does not decode the TAGSTACK parent message. Both regenerated full-gate receipts now also record `sourceBytesEqual: true` and `independentEnvelopeSourceBytesEqual: true` from UTF-8 buffer comparisons. `npm run build` also passes. No native LLM decode is claimed.
- **Measured complete messages (`o200k_base`, unset `OMEGA_DET`, Node v22.22.3).** MIT JSON (8,433 chars; 262 escapes): source frontier **949** (`synkrisis`); exact full candidate **1,052**; refused, +103; 347,487 ms. Apache-2.0 JSON (43,569 chars; 585 escapes): source frontier **3,010** (`synkrisis`); exact full candidate **3,142**; refused, +132; 542,271 ms. Receipts: `bench/x66/receipts/MIT.json-fullgate.json`, `Apache-2.0.json-fullgate.json`. The winner scope is the current TAGSTACK runtime-parent set plus SIBLING-TEMPLATE, not a registry-wide tournament. No Pareto gain or leader change.
- **Exact X61 repeat.** The exact previous configuration still matches: `bench/holdout-x40/metrics.tsv`, SHA-256 `b367e8d7ab00c2e3f9a63da90d6a68968bf7d29fd8d41b37f1ed3188edf1ac70`, `o200k_base`, unset `OMEGA_DET`, Node v22.22.3, six TAGSTACK runtime parents plus SIBLING-TEMPLATE. Result **210** tokens, `akolouthia2`, exact/complete, `repeatMatchesPreviousGate: true`; 91,210 ms versus the prior 94,136 ms (runtime variability, no speedup). Receipt: `bench/x61/receipts/frontier-repeat-x61.json`.
- **Current local leaders.** X66's only new full-gate lanes are MIT JSON and Apache-2.0 JSON; SYNKRISIS leads their measured scopes at 949 and 3,010 tokens, respectively. X66 falls back on both. Historical prose, ops, listing, table, markup, and log leaders remain fixture- and comparator-specific as documented above; they were not rerun in X66.

**Verdict:** exact guarded codec and test implementation delivered; no Pareto win on the two completed full gates. Keep the negative measurements and decoder limitations visible. Do not claim global novelty, native LLM decoding, or a fixture-independent JSON gain.

## X67 — PROBOLE (`probole`): repeated multi-line frame projection, and the measured reason it loses

- **Mechanism.** Every mechanism in the frontier substitutes at the point of use, so APOGRAPHE's law holds — a repeated unit costs at least one token per use — and a substitution grammar therefore pays roughly one glyph per key per record forever. PROBOLE emits one record's frame **once** with `~` slots, states the record separator `^S` and the outer text `^O` as JSON strings, and lists the instance values slot-major, where a constant column collapses under the in-band run rule `*k v`. The wire is `PROBOLE-1:` + one rule sentence, then `^S`, `^O`, `^T<n>`, and `^V<n> <count>` blocks. The completed transform is then handed to **the same measured frontier** (not to one fixed parent), so whichever in-band parent is best for the envelope travels with its own contract. Module: `src/lib/omega/probole.ts`.
- **Contract.** 112 `o200k_base` tokens, measured. Self-contained: it names the separator, the outer text, the template, the slot count, the arrangement, and the RLE rule. No external dictionary, no skills file, no system prompt, no hidden encoder state.
- **Domain (exact, checked before use).** The source must be regenerable as `JSON.stringify(JSON.parse(text), null, unit)` plus at most one trailing LF; that is verified byte for byte, so CRLF, escape-folded JSON, prettified-by-hand JSON, keys containing `~`, fewer than 3 same-shape records, and non-contiguous shapes are **refused**, not guessed. Runs must share one child depth.
- **Greedy/search.** Runs are ranked by a deterministic character proxy and admitted one at a time only while the measured envelope strictly falls. Emission is not the planner's decision: the candidate is priced as **one complete message** (`PROBOLE-1` contract + the envelope's complete frontier message) against the same-source frontier plus SIBLING-TEMPLATE, and is returned only when both restores are byte-exact and the message is strictly cheaper. Otherwise the exact frontier message is returned unchanged.
- **Citation / prior art.** No new compression primitive is claimed. Key catalogue + like-shaped-objects → table + constant-column hoisting + string catalogue is prior art: the `json_compress` crate (docs.rs/json-compress), `compress-json` / `compress-json-rs` / `compress-json-python` (value and key dedup with base-62 back-references, `[values, rootIndex]`), `eharain/JSON-Compress` (explicit six-language wire format, key-order preserving), LogShrink (ICSE 2024, arXiv:2309.09479) for skeleton/value separation, and ALP (PACMMOD 1(4) art. 230, `dl.acm.org/doi/10.1145/3626717`) for numeric columns. Column stores are decades old. What is new here is only the in-band-readable wire plus the complete-message pricing.
- **Time / CPU.** Planner O(source chars) plus one frontier encode of the envelope; the inherited frontier dominates and has no wrapper-wide cap. Measured single-run full gates: 125,819 ms (labels, first composition) and 197,209 ms (labels, envelope-frontier composition) on a 2-core sandbox. Input cap 200,000 source chars, at most 4 runs, at least 3 records per run.
- **Measured (`o200k_base`, unset `OMEGA_DET`, Node v22.22.3).** `gh-labels-50.json` (14,670 ch, 4,371 raw): envelope 3,275, both restores exact, source frontier **1,400** (SYNKRISIS), candidate **1,639** — refused, **+239**. `gh-commits-4.json` (21,293 ch, 7,777 raw): envelope 6,966, exact, frontier **3,567** (SYNKRISIS), candidate **3,822** — refused, **+255**. `gh-tags-60.json` (24,128 ch, 9,890 raw) screen only: envelope 8,999 (−9 %), not gated.
- **Why it loses (the result worth keeping).** Removing the frame saves ≈350 raw key/punctuation tokens on labels, but the parent then compresses the envelope to 1,527 tokens against 1,370 for the *source*: the grammar lost ≈500 tokens of power on a text that was 1,096 raw tokens smaller. A substitution grammar binds **a key to the prefix of its value** (`"url":"https://api.github.com/repos/nodejs/node/labels/` is one rule). Delete the keys and that rule dies. **On nested JSON, keys are context, not overhead.**
- **Decoder boundary.** Both layers are checked: the envelope restore is tested standalone from the serialized envelope (`bench/x67/probole-unit.ts`, all checks pass), and the composed parent decode is checked against the source. **One native-LLM decode was performed and is documented**: a 20-record example (522 → 317 tokens) was decoded from the printed message alone by the model writing this record, and the reconstruction matched the source character for character; `bench/x67/worked-example.ts` prints and asserts it. This is one worked instance, not a study, and no external model was called.
- **Verdict.** Exact, guarded, registered — and a **measured negative**: no Pareto win on either fully gated lane. It fails closed, so the frontier is unchanged. Full record, the 15 rejected prior-art mechanisms, and the cross-lane floor table: [`bench/x67/REPORT.md`](../bench/x67/REPORT.md).

## X67 — OURA entry memo (`oura`): 1.601× with a byte-identical message

- **Mechanism.** The deterministic work meter makes the frontier's search path reproducible, so the same text with the same budget re-derives the same answer. OURA memoises `{memo key → (result message+wire, work state, chiron state)}` at the frontier entry (`depth === 1 && used === 0 && chironUsed === 0`) and replays it on a hit. Cap 24 entries; off switch `OMEGA_OURA_MEMO=0`.
- **The soundness trap that was hit and fixed.** Caching only the result is unsound: skipping the deterministic work meter on a hit hands the caller free budget. Measured: DIASTEMA ran 36.5 s → 49.9 s and METRON stopped reporting `bound`. The shipped version replays the recorded `used` / `chironUsed` — a replay of the work, not a shortcut around it. After the fix both METRON and DIASTEMA are `bound` again and the per-codec cost vector is identical.
- **Greedy/search.** None added. The memo is keyed by the option tuple after `APOGRAPHE_ONLY_OPTION_KEYS` stripping; a closure scan over 110 files / 45 option keys found that none of `apographe|kanon|forceLifts|forceSep|noGate` is read inside the OURA chain, so stripping cannot change the wire.
- **Citation / prior art.** Ordinary bounded memoization; no paper claimed.
- **Time / CPU.** Hits are O(clone of the saved result) under `structuredClone`; misses pay the unchanged frontier. Measured on `bench/holdout-x40/metrics.tsv` (1,203 ch, 811 raw): memo OFF 110,478 ms, memo ON 68,991 ms = **1.601×**; the post-change re-run on the final branch state gave 107,554 ms → 68,179 ms = **1.578×**. Single recorded lane on a 2-core sandbox, not a benchmark suite.
- **Measured identity.** Complete message SHA-256 `f0e0ffb9543f3b2f7032067ed73d6fa3de84745639647fafdc109bdca1864628` and the frontier cost vector `synkrisis 237 · kanon 236 · akolouthia2 210 · apographe 237 · metron 237 · diastema 237` are **identical** memo off and memo on; `frontierComplete: true`, `decodedEqualsSource: true`, memo counters `{hits: 3, misses: 1, size: 1}`. Receipt: `bench/x67/receipts/frontier-ab.json`.

## X67 exact frontier repeat

The exact configuration from the previous turn was rerun and matched: `bench/holdout-x40/metrics.tsv`, SHA-256 `b367e8d7ab00c2e3f9a63da90d6a68968bf7d29fd8d41b37f1ed3188edf1ac70`, `o200k_base`, unset `OMEGA_DET`, Node v22.22.3, six TAGSTACK runtime parents plus SIBLING-TEMPLATE → **210** tokens, `akolouthia2`, exact, `frontierComplete: true`. The configuration did not move; the memo lane reproduces the same message SHA.

## X67 updated fixture-specific local leaders

| Category / fixture | Best recorded evidence | X67 status |
|---|---|---|
| General English prose | knowledge base 622; LLM answer 601–674; email 488; meeting 385–389; bibliography 671 tokens | No X67 prose attempt. The frontier is at identity on prose (622 vs 526 raw on `kb-article`); prose has no repetition to substitute, so a mechanical win is not available |
| Ops listings / CLI | `find-listing` DIASTEMA 1,142; `df -h` 171; `psql` 355; `kubectl` 326 | No X67 rerun |
| Delimited numeric columns | `metrics.tsv` 210 AKOLOUTHIA-2 | X67 repeat confirms 210 with a byte-identical message |
| Markup / code | `pom.xml` SYNKRISIS 544 | No X67 rerun |
| JSON, nested | `json-pkg` SYNKRISIS 681; `gh-api` SYNKRISIS 2,519 | **New lanes:** `gh-labels-50` SYNKRISIS **1,400**; `gh-commits-4` SYNKRISIS **3,567**; `gh-tags-60` screened, not gated |
| JSON, template projection | — | PROBOLE loses +239 / +255 on the two gated lanes; no leader change |

## X68 — ἔγγραμμα ENGRAMMA (`engram`, `engramma`): the frontier's own sub-encodes, remembered

- **What it is, precisely.** A **time** codec, not a size codec. The emitted complete message is TAGSTACK's complete message — same contract, same wire, same parent, same bytes — so ENGRAMMA adds **0 tokens** and removes wall clock. It is registered because its dominance claim has to be measured on the same axis as every other codec, and stated as what it is. Modules: `src/lib/omega/engram.ts` (the memo), `src/lib/omega/engramma.ts` (the codec wrapper, the identity witness, the self-test). Registry key `engramma`, family `exact`, fidelity `exact`.
- **Mechanism.** Inside one frontier call the parents re-encode the same intermediate text repeatedly: SYNKRISIS lifts a value, METRON lifts a header, DIASTEMA lifts a mask, and each then asks APOGRAPHE to encode the same transformed document, whose own arms re-encode it under different span and level settings. Measured on `bench/holdout-tbl/psql-output.txt`: 41 hits in 78 sub-encode attempts. The memo key is `codec \0 encoding \0 serialise(sorted(options)) \0 text`; a hit returns the stored result **and replays the counted work** (`workConsume`, `chironConsume`) that the original search spent. Bounds: 256 entries, 64 KB source cap, 2 000 work-unit minimum (cheaper to redo than to store), 4 MB retained key characters, kill switch `OMEGA_ENGRAM=0`.
- **The soundness trap (X67's, inherited and re-tested).** A memo that skips the search *and* skips the accounting hands the caller free budget, and later decisions in the same deterministic epoch diverge. `bench/x68/engram-unit.ts` asserts the work meter and the chiron meter read the **same** value after three calls with and without the memo, alongside byte-identity of the messages — 15 assertions, all passing.
- **Greedy/search.** Neither: exact-match memoisation of a pure function. No span is found, no rule is added, no contract sentence changes.
- **Citation / prior art.** Memoisation of a pure function; no paper claimed and no new compression primitive claimed. The formal frame is incremental computation — Liu, *Incremental Computation: What Is the Essence?* (arXiv:2312.07946, 2025); Sun, Peng & Xiong, *Synthesizing Efficient Memoization Algorithms* (OOPSLA 2023) for the equivalence condition, which here is purely syntactic. The in-tree ancestors are **REPRISE (X64)** at whole-codec granularity and **OURA (X67)** at frontier-entry granularity, including the work-replay fix; ENGRAMMA's only structural difference is that it memoises *inside* a frontier call, which is what makes the hit rate non-zero. It is therefore **marginal to the shipped stack**, and the receipts do not add the savings together.
- **Time / CPU.** Cold process, one fresh `node` per arm (the per-document number): psql-output 17 284 → 14 906 ms (**1.16×**), metrics.tsv 72 563 → 64 780 ms (**1.12×**), kb-article 6 203 → 4 417 ms (**1.40×**), unified-diff 6 679 → 6 439 ms (**1.04×**). Warm caches, a discarded pass in both arms: 1.39× / 2.16× / 2.54×. **Every arm produced the same message SHA-256 and decoded byte-exactly.** Receipts: `bench/x68/receipts/engram-cold.jsonl`, `engram-warm.json`, `engram-ab.json`, `engram-unit.txt`, `engramma-selftest.json`.
- **Measured honest bound.** The cold-vs-warm gap (17.3 s vs 7.3 s) is tokenizer first-touch, which the memo cannot reach, so 2.4× is the ceiling for a *different* mechanism and 1.04×–1.40× is what this one delivers. The first in-process A/B reported 22×–27×; those ratios measured cache warming, not the memo, and are not used as evidence for it.
- **Verdict.** Exact, registered, byte-identical, genuinely faster — and **zero tokens smaller**. The size axis did not move in X68; the report records why in measurements (`bench/x68/REPORT.md` §5–§7) instead of restating an intention.

## X68 exact frontier repeat

The X67 configuration was re-run on this checkout and the frontier did **not** move: `bench/holdout-x40/metrics.tsv` (SHA-256 `b367e8d7ab00c2e3f9a63da90d6a68968bf7d29fd8d41b37f1ed3188edf1ac70`), `o200k_base`, unset `OMEGA_DET`, Node v22.22.3, TAGSTACK runtime parents plus SIBLING-TEMPLATE → **210 tokens, `akolouthia2`**, message SHA-256 `f0e0ffb9543f3b2f7032067ed73d6fa3de84745639647fafdc109bdca1864628`, cost vector `synkrisis 237 · kanon 236 · akolouthia2 210 · apographe 237 · metron 237 · diastema 237` — unchanged in both arms of the cold A/B. **Caveat, unchanged:** the leader flips `synkrisis` ↔ `diastema` across fixtures; the frontier is a per-lane minimum.

## X68 generalized local leaders (full frontier, `bench/x68/leaders.ts`)

| Category / fixture | raw → frontier | saving | leader | status |
|---|---|---|---|---|
| Prose — `kb-article` | 656 → **622** | 5.2 % | `synkrisis` | re-measured |
| Prose — `bibliography.txt` | 896 → **672** | 25.0 % | `synkrisis` | new |
| Prose — `email-thread.txt` | 629 → **488** | 22.4 % | `synkrisis` | new (reproduces X67) |
| Prose — `llm-answer.md` | 733 → **674** | 8.0 % | `synkrisis` | new |
| Prose — `meeting-transcript.txt` | 472 → 385–389 | 18 % | — | inherited |
| Ops — `psql-output.txt` | 675 → **244** | 63.9 % | `metron` | re-measured |
| Ops — `kubectl-get-pods.txt` | 1 006 → **332** | 67.0 % | `akolouthia2` | new (X67 recorded 326 under a different comparator set) |
| Ops — `find-listing.txt` | 3 997 → **1 148** | 71.3 % | `diastema` | new (X67 recorded 1 142) |
| Ops — `ls -l` (`holdout-x41/ls-l-real.txt`) | 5 194 → **1 497** | 71.2 % | `synkrisis` | new |
| Ops — `npm ls` | 2 747 → **923** | 66.4 % | `synkrisis` | new |
| Ops — Node stack traces | 568 → **300** | 47.2 % | `synkrisis` | new |
| Ops — `df -h` | 570 → **171** | 70.0 % | `akolouthia2` | re-measured (= X67) |
| Tabular — `aapl-2014.csv` (wide numeric) | 3 108 → **1 206** | 61.2 % | **`kanon`** | new — the one lane KANON wins |
| Table — `markdown-table.md` | 330 → **176** | 46.7 % | `synkrisis` | new |
| Tabular — `metrics.tsv` | 811 → **210** | 74.1 % | `akolouthia2` | re-measured |
| Diff — `unified-diff.patch` | 578 → **419** | 27.5 % | `synkrisis` | re-measured |
| License — `license.txt` | 1 166 → **929** | 20.3 % | `synkrisis` | re-measured |
| Markup — `pom.xml` | — → 544 | — | `synkrisis` | inherited |
| JSON — `json-pkg` / `gh-api` | 1 152 → 681 / 2 519 → 1 112 | — | `synkrisis` | inherited |
| Code — `code-ts` | 1 422 → 985 | — | `apographe` | inherited |

Two structural findings, both measured: the frontier's gain is monotone in **within-window token repetition**, not in "structure" (74 % tabular, 67 % ops, 68 % JSON versus 5–25 % prose), and **SIBLING-TEMPLATE never wins a gated lane** — it ties its parent on the prose lanes and loses elsewhere.

## X69 — DIORTHOSI (document-version independent line patches)

- **Design.** A literal LF `---` LF separates at least three equal-line-count documents. The first is the base; each subsequent version is independently reconstructed by sorted zero-based line replacements, either literal whole-line text or a UTF-16 prefix length, suffix length and new middle. The separator, base, and patches are JSON in the message. No external dictionary. Domain capped at 80,000 UTF-16 units, 128 documents and 2,000 base lines; out-of-domain inputs fall back. The program compares complete candidate tokens to the measured same-source TAGSTACK + SIBLING frontier, requires exact restoration and a strictly lower count, and otherwise returns the parent message.
- **Greedy?** Local greedy choice of whole line vs prefix/middle/suffix based on isolated JSON token counts; no global optimum and no guarantee of improvement. The final gate counts the entire message. Planner uses `o200k_base` for this choice even if another output tokenizer is requested; the final gate uses the requested tokenizer.
- **Time / CPU.** CPU-bound scan plus per-change tokenization and full inherited frontier; caps do not impose a time limit on inherited search. No whole-stack speed gain has been demonstrated for this addition.
- **Source / novelty.** Delta coding is established prior art, not a new scientific primitive. Wollmer et al., “The Case for Cross-entity Delta Encoding in Web Compression (Extended),” *Journal of Web Engineering* 22(1), 131–146 (2023), https://journals.riverpublishers.com/index.php/JWE/article/view/22327, studies cross-entity deltas against cached assets; unlike it, DIORTHOSI includes the base in the same message and does not rely on browser history. No claim that the paper proves LLM readability. See `bench/x69/REPORT.md` for experiments and limitations.

## X70 — BRACHYS (βραχύς, `brachys`)

| field | value |
|---|---|
| **Abbreviation** | `brachys` — βραχύς, "short". Not an acronym; a name for the thing being shortened, which is the instruction, not the data. |
| **Decodes to (design spec)** | HYLE's table wire, unchanged, plus a one-line **closed arithmetic** that makes every column-generator family a parameter: `{A+B}=A+B*r`, `mM=A+(B*r mod M)`, `zW=zero-pad to W`, `cX` = the r-th letter from X, `#p:v,..` = cycle p values. Terms are emitted only when the wire uses them. |
| **Greedy?** | **No.** Measured minimum over two complete body messages (literal body, CHIRON body), each decoded and required exact, then measured against the shipped frontier in the same process. The only greedy element is HYLE's inherited column-selection lattice. |
| **Time or CPU bound?** | **CPU-bound.** One frontier gate plus one `hyleEncode(fast)` plus ≤2 `daedalusEncode`; 3.4–72 s per lane. No new asymptotic cost, no cache, and **no speed claim** — the speed axis is OURA (X67) and ENGRAMMA (X68). |
| **Source citation (honest)** | The *encoding* primitives are prior art and are cited as such: scaled-decimal integer slots ≈ ClickHouse `ALP` (https://clickhouse.com/docs/reference/statements/create/table/codec); per-column linear generators ≈ Stoian et al., *Lightweight Correlation-Aware Table Compression* (`Virtual`, K-regression), arXiv:2410.14066; in-prompt codes decoded by an LLM ≈ de Campos et al., arXiv:2604.13066 and P²-LLM, arXiv:2411.12448. None of these prices an instruction, emits a self-contained decoder spec, or proves byte-exactness. **No model was called to decode BRACHYS**; the two readers are local programs. |
| **What is new here** | The reframing that the instruction on a structured lane is 35–50 % of the message and is therefore a compression surface; the parameterised contract; and the second from-spec reader that caught a real decoding defect (`mM` associativity, `psql` row 11). |
| **Measured** | `psql-output` 244 → **212** (−32); `kubectl-get-pods` 326 → **280** (−46); `metrics.tsv` 210 → **197** (−13). 34 lanes: 3 wins, 31 ties, 0 regressions; total 13 775 → 13 684 (−0.66 %). Of the 31 ties, 27 are "no fold offered" and **4 are a fold that was offered and lost** (`df-h` 180 vs 171, `markdown-table` 195 vs 176, `prices.csv` 157 vs 133, `apt-real` 1029 vs 863). Prose: 0 change. |
| **Fails closed on** | anything that cannot be decoded byte-exactly by its own reader; any candidate not strictly smaller than the same-process frontier. |
| **Known limit** | nothing on a lane with no qualifying fold. `ls -l`, `ps aux`, `ps -ef` have **zero** foldable blocks because their rows carry an interior space (`Sep 30 07:59`) and the space-run join is a single space. That is the next mechanism, not a contract fix. |
| **Verification** | 37 checks / 0 failures; 1 417/1 417 fuzz tables exact under two readers; 2 147 agreements, 1 744 fail-closed refusals, 0 disagreements over 4 000 mutants; `reader2.ts` (imports nothing from the codec) reproduces all three winning lanes byte-exactly. |
| **Record** | [`docs/codecs.md`](codecs.md) §X70, [`bench/x70/REPORT.md`](../bench/x70/REPORT.md) |

## X71 — AUSTEROS (αὐστηρός, `austere`)

| field | value |
|---|---|
| **Abbreviation** | `austere` — αὐστηρός, "austere". Not an acronym: it names the change, which is that the instruction is austere by search rather than by taste. |
| **Decodes to (design spec)** | BRACHYS's wire, notation and reader, **unchanged**, with the decoder instruction assembled from a per-feature pool of phrasings by coordinate descent on the token count of the **complete message**. Fixed order, punctuation repaired, gen head and its `s` terms emitted as one sentence. |
| **Greedy?** | **No.** Coordinate descent (two passes + a gen-head pass) on a measured complete-message objective, then a gate requiring strict improvement over **both** `tagstackEncode` and `brachysEncode` in the same process. |
| **Time or CPU bound?** | **CPU-bound. No wall clock is consulted.** 20–60 extra `countTokens` calls over two `hyleEncode(fast)` calls; no measurable wall-clock change. No speed claim. |
| **Source citation (honest)** | Primitives are prior art, cited: HYLE/KANON table fold; ClickHouse `ALP` scaled-decimal integer slots; `Virtual`/K-regression per-column generators, arXiv:2410.14066; in-prompt codes decoded by an LLM, arXiv:2604.13066 and arXiv:2411.12448. Corroborating the prose negative result: arXiv:2605.29000. Contrast (different problem, not beaten): arXiv:2603.25340 (18×, fine-tuned reader) and Harvill et al. 2025 (18–27 %, fine-tuned reader). **No model was called to decode AUSTEROS.** |
| **What is new here** | The decoder specification as an objective term minimised under measurement, with a pool/descent method that does not change the notation or the decoder; plus the finding that the band marker is load-bearing **code** (reworking it broke the reader until the marker was declared). |
| **Measured** | `psql-output` 244 → **207** (−37); `kubectl-get-pods` 326 → **263** (−63); `metrics.tsv` 210 → **185** (−25); `prices.csv` 133 → **107** (−26); `df-h` 171 → **151** (−20); `markdown-table` 176 → **162** (−14). 29 lanes: **6 wins, 23 ties, 0 regressions**, 12 702 → 12 517. |
| **Fails closed on** | any message its own reader cannot reproduce; any candidate not strictly below both incumbents; any lane with no fold. |
| **Known limit** | table-family lanes only. Prose does not move, and four independent measurements say it cannot under this access model. |
| **Verification** | own reader exact on all 6 winners; **third, prose-only reader** (`bench/x71/reader3.ts`) byte-exact on `psql`, `metrics.tsv`, `df-h`; `tsc --noEmit` clean. |
| **Record** | [`docs/codecs.md`](codecs.md) §X71, [`bench/x71/REPORT.md`](../bench/x71/REPORT.md) |

## X72 — STADION (στάδιον, `stadion`)

| field | value |
|---|---|
| **Abbreviation** | `stadion` — στάδιον, "a measured course". Not an acronym: the codec's subject is the *measurement*, and what it adds is that the measurement is audited on the thing it measures. |
| **Decodes to (design spec)** | The frontier's message, **unchanged**, in the normal case: same parent codecs, same contract, same wire. When the fixed-width arm fires, `message = re-padding rule + LF + frontier(normal form)`, and the decoder runs the frontier's decoder and then the rule (cut each line at TAB, write each cell, pad with spaces to that column's width, last cell as-is; lines starting with `\` are literal). |
| **Greedy?** | **No.** The width vector is the unique maximal vector of the input (a total function); the only choice — fold or not — is made by measuring the complete message both ways, and the fold is kept only if it is cheaper **and** byte-exact. |
| **Time or CPU bound?** | **CPU-bound for every decision** (no wall clock is read by the fold or the counter). Wall clock is the *reported* quantity: **−23.7 %** over twelve lanes, from a **3.2×** faster inner counter. |
| **Source citation (honest)** | o200k vocabulary and merge order: tiktoken / `gpt-tokenizer`. O(n²) BPE merge and the priority-queue framing: BlockBPE, arXiv:2507.11941 (2025). The "piece is already a vocabulary entry" fast path and the `(priority, offset)` tie-break, including the trap it sets for reference implementations: NVIDIA/TensorRT-Edge-LLM PR #248 and its port PR #46. Declared fixed-width layout contracts with a padding policy: `fixedwidth-transit`, pandas `read_fwf`/`colspecs`, fixed-width EDI practice. **No LLM was called to decode STADION's messages this turn**, and none is claimed. |
| **What is new here** | A codec that **audits its own scoring instrument on its own output** — the number is computed twice, once by the accelerated index and once by the library, and a disagreement throws instead of shipping. Plus: a byte-keyed rank index built from the library's live vocabulary (no second copy of o200k), a zero-allocation merge loop, and the U+FEFF shadowing rule, which must be *copied* from the library rather than derived from its vocabulary. |
| **Measured** | Speed, 12 lanes: 254 654 ms → **194 378 ms** (−23.7 %); `ls-l-nm` −33.1 %, `llm-answer` −35.3 %, `dpkg-l` −27.6 %, `find-files` −24.9 %, `psql-output` −19.5 %, `findmnt` −20.2 %, `kubectl` −21.2 %, `kb-article` −13.1 %, `readme` −11.7 %, `node-help` −14.9 %, `ls-usr-bin` −17.5 %, `license` −16.8 %. Tokens: identical on ten lanes, `kubectl` 332 → 326 and `node-help` 863 → 864 (both are lanes already documented as run-to-run unstable, not counter drift). 29 lanes: 12 702 → **12 696**, `folded 0`, 29/29 exact, 658.6 s total. Counter: **3.2×** on 300 k calls. |
| **Fails closed on** | an accelerated count that disagrees with the library count on the emitted message (**throws**); a fold whose reconstruction is not byte-exact; a fold more expensive than the plain frontier; a document that is not fixed-width. |
| **Known limit** | It is a **speed** result. No token win is claimed on any lane: fixed-width folding, budget escalation, AP columns and region partitions were each measured this turn and all four are dead. It also does not fix the pathological tail, and it pays a one-time 330–460 ms index build that is a net loss on the smallest documents. |
| **Verification** | `bench/x72/ids.ts`: **323 192 strings, 0 mismatches**, library checked before *and* after every accelerated call. `bench/x72/stadion-broad.ts`: 29/29 lanes byte-exact, tokens identical to the pre-acceleration receipt. `tsc --noEmit` clean. |
| **Record** | [`docs/codecs.md`](codecs.md) §X72, [`bench/x72/REPORT.md`](../bench/x72/REPORT.md) |

---

## X73 — STICHOMYTHIA (στοιχομυθία, "speaking row by row")

| | |
|---|---|
| **Abbreviation** | `spec:` — the message's first three syllables are its own decoder key. The table body is not stored; it is *printed by programs*, one per column. |
| **One-line design** | For each table column, search a small family of printable programs (constant, affixed arithmetic progression over printed numbers with padding preserved, fixed-step clock/ISO stamp/date, cycle, literal) and emit the shortest one that prints the column back **byte for byte**; store a cell only when no program prints it. |
| **Greedy or not** | **Not greedy.** Model selection is by exact reconstruction first, then printed spec length, and admission to the frontier is a separate complete-message comparison against every other decoded candidate in the same process. Two refusals are built in: a message whose in-process decode is not byte-exact, and a message that is not strictly smaller than the identity. |
| **Time- or CPU-bound?** | **CPU-bound.** No wall clock is consulted by any decision. Encoding `cue-sheet` takes 340 ms (dominated by the tokenizer count), decoding is instant. |
| **Source citation (honest)** | Column-as-regressor is prior art and is cited as such: **LeCo** (Liu, Zeng, Zhang, SIGMOD 2024, ACM 3639320) fits per-column arithmetic/linear regressors with a partitioner; **Corra** (VLDB 2024 CloudDB workshop) encodes "identifiable arithmetic logic" instead of data; ALP (PACMMOD 2024) and Virtual/K (arXiv:2410.14066) are the same family. Model-side round-trip unreliability: **RTCE**, arXiv:2601.13398. **No LLM was called to decode these messages this turn**, and none is claimed. |
| **What is new here** | Three things the columnar literature never has to solve: (i) the program must be **printable text**, so decimal places, zero-padding and literal affixes are part of correctness rather than an external schema; (ii) the key that makes the program readable is **inside the message**, so the model family is chosen against a cost that includes the key — a column model that is 2 tokens shorter but forces a 6-token key clause is rejected; (iii) a reader (`bench/x73/reader.ts`) is written **from the printed key alone** and succeeds on every applied lane, which is the admissibility test the rest of the registry does not apply. |
| **Measured** | `cue-sheet.md` (29×4): 513 raw → **101** tokens, frontier **163** → **−62 (−38 %)**, byte-exact. 29-lane gate: **12 696 → 12 634** (−62, all of it this lane; three documented-unstable lanes move −1/+2/−1 and net to 0), 29/29 exact. Reader from the key alone: **4 exact / 0 mismatch / 2 not applied**. Counter gate unchanged: 323 192 strings, 0 mismatches; micro-ratio 3.2× → 4.85×. |
| **Fails closed on** | a decode that is not byte-identical to the source; a message not strictly smaller than the identity; a document with no uniform delimiter table; a column whose values are not printed back exactly by the chosen model (this is what caught the `line 0` / `line 10` padding defect). |
| **Known limit** | Wins **one lane of 29** and loses the surrounding ones badly (`metrics.tsv` 252 vs 210, `prices.csv` 323 vs 133) because the model family is narrow: an irregular column falls through to a literal list, which the frontier's fold beats. It is a Pareto improvement, not a new frontier. |
| **Verification** | `bench/x73/kat.ts` (per-lane, applied/exact/ms), `bench/x73/reader.ts` + `reader-check.ts` (independent reader from the key), `bench/x72/stadion-broad.ts` (29 lanes, 29/29 exact), `bench/x72/ids.ts` (counter differential), `tsc --noEmit` clean. |
| **Record** | [`docs/codecs.md`](codecs.md) §X73, [`bench/x73/REPORT.md`](../bench/x73/REPORT.md) |

---

## X74 — PROSPHYSIS (πρόσφυσις, "a growth onto something")

| | |
|---|---|
| **Abbreviation** | `§` — the marker **is** the codec. Every other codec here abbreviates a *cell*; PROSPHYSIS abbreviates a *relationship*, and the relationship costs one character. |
| **Decodes to (design spec)** | The frontier's message for a front-coded listing. **Body first** — invert whatever the body's own first line tells you to invert. Then, per line: a last field `§x` means the target of the arrow is the name that appears immediately before the arrow, followed by `x`. A line with no `§` is printed unchanged. |
| **Greedy?** | **Neither greedy nor searched — a total function plus one gate.** The relation (target starts with the sibling field) is decided per line by string comparison. The only decision is *fire or not*, and it is made by measuring the complete message against the frontier's complete message in the same process. |
| **Time or CPU bound?** | **CPU-bound for every decision**; no wall clock is read. Reported: 231 777 ms for `ls-l-real`, of which ~230 000 ms is the frontier's own cost of encoding the 5 194-character listing twice (once as source, once as rewritten text). |
| **Source citation (honest)** | Front coding of sorted strings: **Bentley & Sedgewick, "Fast Algorithms for Sorting and Searching Strings", SODA 1997**. Shared-substring symbols: **FSST — Boncz, Neumann, Leis, SIGMOD 2020**. Cross-column residual coding: **Corra, VLDB 2024 workshop (50–85 %)**. In-repo ancestor: **PARADEIGMA (X39)**, JSON field as a concatenation of constants and sibling values inside a parsed schema. |
| **What is new here** | The reference string is a **sibling cell in the same row of a one-chat message**, recovered from the text with **no dictionary, no symbol table, no column store, no schema and no side channel**, and the whole message is gated on a byte-exact decode. Front coding references the previous key in a sorted dictionary; FSST references a shipped table; Corra references a schema-declared column. |
| **Measured** | `ls-l-real.txt` 5 194 raw → frontier 1 497 → **1 412 (−85, −5.7 %)**, byte-exact, with the **31-token key paid inside the 1 412**. 56 of 58 links satisfy the relation; 821 of 1 123 target characters are the sibling. 29-lane gate: **12 634 → 12 544 (−90)**, 29/29 exact. |
| **Fails closed on** | a source containing `§` (line untouched); a target not strictly longer than the name; an empty affix; a self-inverse that disagrees (returns the frontier unchanged); a message not strictly smaller than the frontier's. |
| **Known limit** | **One lane of 29.** It fires where a listing's target contains its own name and nowhere else. The prefix direction is implemented and fuzz-tested but **not admitted to any message**: declaring it costs +74 key tokens against a 31-token key, and it occurs **zero** times in the corpus. |
| **Verification** | `bench/x74/t30.ts` — **15 adversarial cases, 0 failures; 400 fuzzed documents, 0 non-inverts**. `bench/x74/t40.ts` — the marker is 1 token, absent from every source, and reproduced **byte-exactly through the parent frontier's own round trip**. `bench/x74/t25.mjs` per-lane receipt; `bench/x74/receipts/gate.json`. |
| **Record** | [`docs/codecs.md`](codecs.md) §X74, [`bench/x74/REPORT.md`](../bench/x74/REPORT.md) |

---

## X74 — STOICHEION (στοιχεῖον, "element, the letter of a column")

| | |
|---|---|
| **Abbreviation** | `ΣΤ` — the column as the element. |
| **Decodes to (design spec)** | A key naming a fixed-width table, its width vector, and one line per column stating that column's alphabet: constant, per-column dictionary with one index character per row, run-length index, arithmetic progression over printed numbers with padding recovered from the base, fixed-step clock/ISO timestamp, or cycle. |
| **Greedy?** | **Mixed, and the distinction is load-bearing.** Column recoding is an **exact search** over a small closed model family (reconstruct, then price). The *subset of candidate cut positions* is chosen by **coordinate descent** on the measured message cost. |
| **Time or CPU bound?** | **CPU-bound** for every decision; the wall clock is reported, never consulted. |
| **Source citation (honest)** | Dictionary coding of columns: **C-Store, VLDB 2005**; **Abadi, Madden, Helfand, SIGMOD 2008**. Per-column encoding choice: **BtrBlocks, SIGMOD 2023**. Scaled decimals: **ALP, SIGMOD 2024**. Fixed-width induction: **STADION (X72, this repository)**. Schema-once columnar prompting: **ONTO, arXiv:2604.17512** (Apr 2026). |
| **What is new here** | Nothing in the model family — that is the point. What is new is the **result**: the first codec in this stack whose entire family was falsified *on the frontier* rather than on a probe, with the reason stated as arithmetic. |
| **Measured** | **Loses all 29 lanes.** `df-h` 800 vs 171, `kubectl` 960 vs 326, `ps-aux` refills the frontier and still loses; `code-ts` and `ls-l-nm` find no fold at any tolerance. The frontier is at **1.00–1.10×** of the unreadable floor (brotli −q 11) on prose and **1.3–1.4×** on the wide ops lanes, so a codec that must ship a key **and a width vector** has nothing left to buy. |
| **Fails closed on** | a fold whose reconstruction is not byte-identical; a message not strictly smaller than the frontier's. It returns the incumbent unless it wins, so it cannot regress. |
| **Known limit** | Registered as a **measured negative**, not a win. It is the strongest arm built to break the kernel claim of X74, and it did not. |
| **Verification** | `bench/x74/receipts/broad.json` (29 lanes, applied/refused), `t15.ts` (key cost), `t26.ts` (`floor.json`, `cutrule.json`). |
| **Record** | [`docs/codecs.md`](codecs.md) §X74, [`bench/x74/REPORT.md`](../bench/x74/REPORT.md) |

---

## X75 — BRACHYLOGIA (βραχυλογία, "brevity of speech")

| | |
|---|---|
| **Abbreviation** | `↯` — contracted speech. The codec has no wire character: its object is the sentence the decoder already writes about its wire. |
| **Decodes to (design spec)** | The shipped frontier's message, with the **instruction lines contracted by a fixed, ordered, idempotent substitution table** and **nothing else** — the tape, the body and every data byte are untouched. Two clauses are contracted today: the CHIRON rules clause **39 → 25** tokens, and the positional-delta line **23 → 17** (`bench/x75/t15.ts`). Every load-bearing element of each original is preserved: which characters name a rule (a **new Cyrillic letter**), where the tape ends (**¶**), how far a name's text runs (**to the next new letter or ¶**), where expansion applies (**after ¶**), that it recurses (**repeatedly**), what to emit (**print only**). Only English grammar is dropped. |
| **Greedy?** | **Neither greedy nor searched — a total function plus five gates.** The rewrite is a fixed table, not a hill-climb and not a portfolio: there is no search over wordings, no pool of paraphrases, and no objective to climb. The only decision is *admit or not*, taken by measurement. This is deliberate: a search over English would need a program that scores "an LLM still reads this the same way", and no such program exists here — see below. |
| **Time or CPU bound?** | **CPU-bound** for every decision; the wall clock is never consulted. Cost is one frontier encode plus O(lines) regex matches. |
| **Source citation (honest)** | The idea that an instruction should be compressed like data belongs to others and is recent: **CompactPrompt, arXiv:2510.18043** (reversible n-gram dictionary + quantization); **ProCut, EMNLP 2025 industry** (attribution-based prompt pruning); **efficient-prompting survey, arXiv:2404.01077**. All compress *meaning* and are therefore lossy with respect to bytes. The nearest external work on whether an LLM can invert a lossless codec at all is **RoundTripCodeEval, arXiv:2601.13398** (Maveli, Vergari, Cohen, Edinburgh): models pass forward and backward tasks separately yet fail the combined round trip, and failures persist even on simple bijections such as RLE — which is the strongest available external argument for making the cold read an admission gate rather than an assumption. In-repo ancestors: **BRACHYS (X70)**, **AUSTEROS (X71)**, **SYNTOMIA** — they optimise a contract they author; BRACHYLOGIA optimises the contract the parent already emitted, at the parent's own report level. **No model was called to decode BRACHYLOGIA by the encoder**; the cold read reported below was performed by the operator. |
| **What is new here** | Every previous codec treats the decoder instruction as a **constant** — authored once, quoted verbatim, paid in full. BRACHYLOGIA treats it as a **named part of the message that can be re-expressed**, and it is the first codec in this stack whose central claim cannot be checked by a program: the wire is decoded by code, but the contract is decoded by **comprehension**, and there is no executable proxy for comprehension. The codec says so, splits its verification into what is checkable and what is not, and pushes the unchecked part to an empirical gate that is actually run. |
| **Measured** | `df-h.txt` 171 → **153 (−18, −10.5 %)**; `metrics.tsv` 210 → **192 (−18, −8.6 %)**; `kubectl-get-pods.txt` 326 → **308 (−18, −5.5 %)**. Instruction 62 → 44 tokens on each. 29-lane gate: **3 of 29 lanes fire**, all byte-exact. |
| **Corrected scope (an overclaim was found and removed)** | The first draft claimed "14 % of the gate is instruction prose" from an audit that selected any line over 40 characters ending in a full stop. That selector cannot distinguish an INSTRUCTION from English DATA, so it counted `kb-article` (388), `llm-answer` (158) and `code-ts` (147) as instruction when they are the documents. Rerun structurally over 29 lanes (`bench/x75/t12.ts`, `receipts/contract-audit.json`): long CHIRON clause **3/29**, metron legend 73 tok **2/29**, short ~11-token contract **22/29**, none **2/29**. The instruction is **not** the general lever: on 22 of 29 lanes the parent already pays ~11 tokens. |
| **Fails closed on** | a parent that is not byte-exact; an edit set that does not invert to the frontier message byte-for-byte; an edit touching a line carrying the tape marker `§`; a line that occurs verbatim in the source (data guard); a replacement missing any element its rule requires; a complete message that is not strictly smaller. |
| **Known limit** | **3 of 29 lanes.** It cannot help a message whose instruction is already minimal, and it does not touch the ~86 % of every lane that is data. |
| **Verification** | Gates 1–5 executed per encode (`invert`, `wire immunity`, `data guard`, `element coverage`, `strict win`). Gate 6 **cold read**: `bench/x75/coldcheck.ts` — the operator read the contracted 25-token sentence from a bare message and hand-extracted **18 of 18 tape rules**, all matching `chironParseTape` exactly. The byte-level `⁺` arithmetic half of the cold read was **not** completed by hand this turn, so the reconstruction half of Gate 6 is **not claimed**. `bench/x75/receipts/gate75-det.json` (29 lanes). |
| **Record** | [`docs/codecs.md`](codecs.md) §X75, [`bench/x75/REPORT.md`](../bench/x75/REPORT.md) |

---

## X75 — KEYLINE (κλειδί + line): measured negative, not shipped

| | |
|---|---|
| **Abbreviation** | `k=` — hoist the frontier's longest instructional line into a header `k=<sentence>` and replace its body occurrences with `k`. |
| **Decodes to (design spec)** | A key line at the top of the message naming a repeated sentence, with each later occurrence replaced by the single character `k`. |
| **Greedy?** | Yes: longest-instructional-line selection, no backtracking. |
| **Time or CPU bound?** | CPU-bound; one frontier encode plus O(lines). |
| **Measured** | **Always loses.** With exactly one occurrence of the sentence, the header repeats the sentence it replaces: **+3 tokens** on `df-h`, `kubectl` and `metrics.tsv` (`bench/x75/t9.ts`, `t10`). The economy requires ≥2 body occurrences of the same instructional line, and the frontier emits one. |
| **Why it is recorded** | The gate refused it on every lane for the right reason, which is the argument for having the gate. The module was deleted rather than shipped as a codec that never fires. |
| **Record** | Negative space, [`bench/x75/REPORT.md`](../bench/x75/REPORT.md) |

---

## X76 — PINAX (πίναξ, "tablet, table, index")

| | |
|---|---|
| **Abbreviation** | `▤` — a tablet. The legend is a table that has been spelled as prose; PINAX writes it as the table it is. |
| **Decodes to (design spec)** | The shipped frontier's message, with a **composed legend** — a single line carrying the whole operator table for the wire as English prose with `;` separators — rewritten as one clause per operator. Measured instance: METRON's legend on `psql-output.txt`, **73 → 65 tokens** (`bench/x76/t11.ts`). Every operator is preserved (`¶`, `k=v`, `expand`, `repeatedly`, `n`, `sep`, `col=model`, `drop`, `rebuild`, `literal`, `resets`, `above`, `colM`, `days`, `workdays`, `+b`, `same width`, `print`, `only`). Only the connectives go: "are", "from lines", "and", "of the same line". |
| **Greedy?** | **Neither greedy nor searched — a total function plus five gates.** Fixed, ordered, idempotent substitution table. No hill-climb over wordings, no portfolio, no clock. The only decision is admit-or-not, made by measurement. |
| **Time or CPU bound?** | **CPU-bound** for every decision; the wall clock is never consulted. One frontier encode plus O(lines) regex matches. |
| **Source citation (honest)** | The legend-as-prose problem is not treated in the compression literature I could find; the nearest external work is **CompactPrompt, arXiv:2510.18043** (reversible n-gram dictionary) and **RoundTripCodeEval, arXiv:2601.13398** (Edinburgh, 2026 — LLMs pass forward and backward tasks separately yet fail the combined round trip, even on simple bijections such as RLE), which is the standing argument for making a cold read the admission gate rather than an assumption. In-repo sibling: **BRACHYLOGIA (X75)**. **No model was called to decode PINAX.** |
| **How it differs from BRACHYLOGIA (X75)** | BRACHYLOGIA shortens a SENTENCE (same sentence, fewer grammatical words). PINAX restructures a TABLE: the legend is *already* a sequence of `name = definition` pairs and is only spelled as prose, so PINAX removes connectives and keeps structure. Different object, different rule table, different coverage gate (operator set vs. sentence elements). |
| **Measured** | `psql-output.txt` **244 → 236 (−8, −3.3 %)**, byte-exact. 1 of 7 lanes tested fires; the other 6 carry no composed legend. |
| **Fails closed on** | a parent that is not byte-exact; edits that do not invert to the frontier message; an edit touching a `§` line; a line occurring verbatim in the source (data guard); a replacement missing any operator its rule requires; a message that is not strictly smaller. |
| **Known limit** | **One lane, and a small margin.** This is the honest size of what is left in the contract layer after X75: the 22-lane synkrisis majority already pays ~11 tokens and the CHIRON clause is contracted by BRACHYLOGIA. |
| **Verification** | Gates 1–5 executed per encode. `bench/x76/t12.ts` — 7 lanes, applied on 1, byte-exact on all 7. |
| **Record** | [`docs/codecs.md`](codecs.md) §X76, [`bench/x76/REPORT.md`](../bench/x76/REPORT.md) |

---

## X76 — PLATOS (πλάτος, "width"): measured negative, not registered

| | |
|---|---|
| **Abbreviation** | `w 9 4 4 4 2 LRRRLL` — a column-width vector plus an alignment string. |
| **Decodes to (design spec)** | Remove the inter-column padding from an aligned table, hand the squeezed text to the parent frontier, and ship the width vector so the reader can put the spaces back. This is the X76 investigation of "improve the representation the parent frontier sees". |
| **Greedy?** | Column detection is greedy and parameter-free (a position is a gap if every line has a space there). No search over segmentations. |
| **Time or CPU bound?** | CPU-bound; one extra frontier encode plus O(lines × columns). |
| **Measured** | **Padding is worth 2 034 of 23 020 raw tokens (−8.8 %) across 20 lanes** (`bench/x76/t3.ts`): ps-aux −469, ls-l-real −442, ps-ef −160, ps-real −158, dpkg-l −142, kubectl −138, node-help −146, vmstat −47; and **exactly 0** on metrics.tsv, prices.csv, du-real, apt-real and kb-article, which have no multi-space runs. The transform is **byte-exact** — restore reproduces the source on 11 of 14 lanes (`bench/x76/t10.ts`). |
| **Why it is a negative** | **The frontier already compresses padding.** Removing 469 raw tokens from ps-aux shrinks the frontier's message by only 57 (an 8.2× marginal rate against its 2.9× average), and the width declaration costs 27–42 tokens. Measured end to end on `findmnt.txt`: **461 vs 444 — loses** (`bench/x76/t9b.log`). This is the same conclusion STOICHEION reached in X74 from the other direction: at ×1.3–1.5 of an unreadable floor, a codec that must ship a key has little left to buy. |
| **Why it is kept** | It is the direct answer to the standing question "improve the representation the parent frontier sees", and the negative is informative: the frontier's marginal compression rate (8.2× on padding vs 2.9× average) is a *measurement* of where its headroom is not. The module is retained unregistered so the experiment is reproducible. |
| **Record** | [`bench/x76/REPORT.md`](../bench/x76/REPORT.md) §3–§5 |

---

## X77 — MERISMOS (⧉)

**Name.** Μερισμός — "division into parts", the rhetorical figure that divides a whole
into its parts. Registered key `merismos`. Source: `src/lib/omega/merismos.ts`.

**The mechanic, in one sentence.** Intern an arbitrary repeated **substring** that the
frontier left literal on its own wire, replacing every occurrence with a **single
character that does not occur on that wire** (so no marker is needed), with the table
shipped as one contract line.

**What it is aimed at.** X77 measured, per input class, the **marginal rate**

    rate = (tokens the frontier saves) / (tokens an ablation saves on the raw text)

`rate ≈ 0.1` means the frontier already owns that redundancy; `rate ≈ 1.0` means it is
blind to it and pays nearly full price. Measured (`bench/x77/t1.ts`):

| class | rate | reading |
|---|---|---|
| inter-column padding | 0.11 – 0.49 | the frontier **owns** this; X76 was right not to build here |
| punctuation | 0.14 – 1.00 | mixed |
| **long identifiers** | **0.84** | the frontier is **blind** here |

So the unharvested redundancy of this stack is no longer whitespace — it is the
*content* of long composite identifiers: paths, package names, module names.

**Greedy? Partially, and only in the selection.**
Candidate generation is *not* a search: a fixed rule (every wire substring of length
4–24 occurring ≥ 3 times). Selection **is** a bounded greedy hill-climb: at most 10
rounds, each adding the single candidate that most reduces the *measured* token count
of the message, stopping when none helps. Every candidate is priced with the real
tokenizer, never a proxy. Because a round is kept only on a strict improvement, the
greedy step cannot do worse than the empty table.

**Time-bound or CPU-bound? CPU-bound, and deliberately capped.**
Cost is dominated by `ngrams()` — O(n·L) substring counting over the wire — plus
`GREEDY_ROUNDS × POOL_TOP` full token counts. There is no clock in the decision: the
codec either finishes its bounded search or it does not fire.

**Honest citation.** The closest external work is *CompactPrompt* (arXiv 2510.18043,
ICAIF '25), reversible n-gram abbreviation with up to 60 % savings — but its metadata
table is exactly the overhead this whole line of codecs attacks, and it is not
byte-exact. arXiv 2604.13066 (a dictionary learned in context) is the only other work
found that counts its dictionary against the token budget, as this project does.

### The result is negative, and it is a real result

MERISMOS fires on **0 of 9** measured lanes. It is not disabled — it is *gated*, and
the gates refuse. Three distinct mechanics were tried and each was priced honestly:

1. **Segment interning on the raw text.** Splitting long runs on `[._/:+-]` looked like
   **+2 807 raw tokens** across 24 lanes (`bench/x77/t2.ts`) — but that measurement
   omitted the marker that makes decoding unambiguous. Priced *with* the marker it is
   **−3 281** (`bench/x77/t2b.ts`). The apparent gain was an artefact: bare
   alphanumeric ids merge into single tokens, which is not a legal encoding.
2. **Segment interning on the frontier wire.** Rewriting the source instead of the wire
   compares our output against an already-compressed baseline and loses by
   construction (best variant 1 019 tok against a 367-token frontier). Fixed, it still
   refused on 8/8 lanes: coverage 0.04 – 0.10, and the one lane that cleared coverage
   **lost** (324 vs 300).
3. **Arbitrary substring interning on the wire** (the shipped shape). Refused on
   10/10 lanes. The best candidate came within **+2 to +4 tokens** every time — the id
   characters and the table entry cost more than the substring saves.

Even a synthetic log file built to have heavy literal repetition was refused: the
frontier interns all of it itself.

**What this establishes.** The frontier wire has no substring redundancy left that a
one-character id can profitably address. This is now the third consecutive measured
negative on "improve the representation the parent frontier sees" (X76: padding 8.2×
marginal rate; PLATOS: findmnt 461 vs 444). The frontier is close to a local optimum
against this family of attacks. MERISMOS is registered rather than discarded because
its gates are sound and it is safe: it can only ever fire on a strict measured win,
and it is byte-exact on every lane it refuses.

---

## X78 — KERMA (⚄)

**Name.** Κέρμα — "small coin, small change; a thing cut into small pieces"
(κερματίζω, to cut up into small pieces). Registered key `kerma`.
Source: `src/lib/omega/kerma.ts`.

**The mechanic, in one sentence.** Delete the separator characters *inside* a number
(`2026-01-02` → `20260102`, `100.00` → `10000`) and declare the width pattern once;
the reader re-inserts the separators from the digit count and the pattern.

**Why it pays — the measurement.** The currency is tokens, not characters, and the
o200k pretokenizer is lopsided: `\p{N}{1,3}` allows **three digits per chunk**, but
every separator starts a chunk of its own. Measured (`bench/x78/quirk.ts`):

| string | tokens | packed | tokens |
|---|---:|---|---:|
| `2026-09-30` | 6 | `20260930` | **3** |
| `08:00:03` | 5 | `080003` | **2** |
| `192.168.1.100` | 7 | `192168100` | **3** |
| `1,234.56` | 5 | `123456` | **2** |
| 12 log lines, ISO dates + clock times | 251 | packed | **179** (−28.7 %) |
| a column of IPv4 addresses | 131 | packed | **95** (−27.5 %) |

**What is and is not new — disclosed inheritance.** The mechanism family is **not**
new. STIGME (X19) deletes separators inside a token and restores them from the token's
own digits; MORPHE (X20) removed STIGME's hard-coding and fits a rule library;
UUIDFOLD, HORA, HEMERA and STATHMOS are related value transforms. KERMA inherits that
family openly.

What is new is the **shape set**. STIGME ships three hard-coded shapes — `YYYY-MM-DD`,
`YYYY/MM/DD`, `THH:MM:SS` — plus clock-after-a-date. A payload whose numbers are not
dates or times gets nothing. KERMA fits **arbitrary** shapes: any run of digit groups
over `[-:./]`, any group widths, up to four groups, fitted per payload, kept only on a
measured win.

That is not cosmetic. On `psql-output.txt`, whose numeric columns are dates
(`2026-01-02`) **and** fixed-precision amounts (`100.00`, shape `###.##`), the complete
existing frontier — 242 codecs, STIGME and MORPHE included — produces **244 tokens**.
KERMA produces **172**. The amount column is a shape STIGME has no rule for, and it is
half the payload's numbers.

```
STIGME   three hard-coded shapes (date, T-time, clock-after-date)
MORPHE   a fitted rule library, parameterised over a rule catalogue
KERMA    unconstrained shape fitting: whatever shape the payload contains
```

**Why it is a shape transform, not a substitution.** APOGRAPHE (X39) established the
distinction: every substitution pays at least one token per use for a pointer at the
point of substitution. KERMA pays **nothing per occurrence**. This is why ~1 token per
occurrence can still be a large frontier win — there is no per-use pointer to pay for.

**Greedy? Yes, and only in the prune.** Shape discovery is not a search: a fixed rule
(every digit run over the separator set, grouped by exact shape, occurring ≥ 2 times).
Selection is a bounded greedy prune — while it helps, drop the least valuable surviving
shape and re-measure with the real tokenizer (≤ 24 evaluations, one token count each).
A round is kept only on a strict improvement, so the prune cannot end worse than the
unpruned table. A two-arm tournament (contract inside vs outside the frontier wire) is
priced and the cheaper arm wins.

**Time-bound or CPU-bound?** CPU-bound and bounded. Shape discovery is O(n·Lmax) over
the payload; the prune is at most 24 full token counts. **No clock enters any decision.**

**Honest citation.** Two sources found this turn, neither previously referenced here:

- **Väinämöinen, "The tokens-per-byte trap: character-level 'compression' adds tokens"**
  (DEV Community, May 2026). States the methodological rule this codec follows and that
  most prompt-compression work violates: *"Stop equating bytes with tokens. Run your
  input through the actual tokenizer before AND after any compression scheme. The token
  count is the truth; the file size is the trap."* It also documents the converse
  failure — deleting 25 % of characters raises token counts, because surviving fragments
  fall through to byte fallback. Related: Petrov et al., arXiv:2305.15425 (up to 15×
  longer tokenisation for low-resource scripts, same out-of-vocab dynamics).
- **SepLLM, arXiv:2412.12094** (ICML 2025) — separator/punctuation tokens carry
  disproportionately high attention relative to their information content. Independent
  corroboration that separators are a distinct and expensive token class, which is the
  entire premise here.

Neither is admissible as prior art for byte-exact reconstruction: neither checks
reconstruction, and SepLLM is a lossy inference-speed method. They are cited for the
token-economy premise, not for the codec.

### Gates — exact by verification, not by argument

| | gate | why |
|---|---|---|
| G1 | **width uniqueness** | at most one kept shape per total digit length, so a bare run of length N has exactly one reading |
| G2 | **no bare collision** | no separator-free digit run of that length exists anywhere, so only elided runs can have it |
| G3 | **no merge** | a packed run may not sit beside another digit, or the two fuse into a run no rule describes |
| G4 | **round trip** | `kermaDecode(kermaMessage(x)) === x`, byte for byte |
| G5 | **strict win** | `countTokens(message) < frontier.messageTokens` |

Comma and plus are deliberately **excluded** from the separator set: in CSV they are
*field* separators, and eliding them fuses a whole row into one number. Measured:
`vix-daily-1990.csv` went 461 → 629 (+168) before the exclusion was added.

### Measured result

Fires on **1 of 14** lanes tested; where it fires it saves **72 tokens (−29.5 %)** on
`psql-output.txt`. Thirteen lanes refuse at G5, and the refusals are informative
rather than uniform:

| lane | frontier | best KERMA | shape |
|---|---:|---:|---|
| **psql-output.txt** | **244** | **172** | `####-##-##` ×24, `###.##` ×24 |
| ls-full-iso | 367 | 372 | `##:##:##.#########` |
| node-stacktraces | 300 | 303 | `####:##` |
| git-log-fuller | 143 | 150 | `####-##-##` |
| find-listing | 1142 | 1160 | `##:##:##.########` |
| npm-ls | 909 | 926 | `##.##.##` |
| kubectl-get-pods | 326 | 355 | `##.###.#.###` |

Every refusing lane is **timestamp-shaped or version-shaped** — exactly the territory
the stack's own HORA / HEMERA / STATHMOS / STIGME codecs already own. The single lane
that wins wins because half its numbers are decimal amounts, a shape **no existing
codec in the stack has a rule for**. KERMA is therefore a real but narrow addition: it
extends shape-elision from dates and times to arbitrary numeric columns. Because G5 is
a strict-win gate, it is safe to leave enabled — it cannot make any lane worse.

### KERMA is pre-frontier (a structural note)

PINAX (X76) and MERISMOS (X77) both rewrite `frontier.message`. KERMA must instead
transform the **source**. Running the same shapes against the wire refuses on 6 of 8
lanes with "no digit runs": the frontier has already rewritten the digits
(psql-output's wire carries `хьҭаҭовавигагьДаДобабитать09а09` — no hyphen in sight).
Rewriting the source rather than the wire is also what `bench/x77/t2c.ts` showed to be
necessary on independent grounds: comparing a raw-text transform against an
already-compressed baseline loses by construction.

---

## Generalized local leaders (X78)

Ratio = brotli -q11 floor tokens / stack tokens (@ 14.8 bits/tok). Above 1.0 the stack beats a
strong general-purpose compressor on that structure. Carried forward from `bench/x75/receipts/leaders.json`,
regrouped by structure family, with X79's SPHRAGIS result on `psql-output.txt` folded in.

**Two corrections (X80).**

1. **X79 mislabelled the 29-lane total, and this corrects that correction.** X79 recorded
   that `LANES73 29 TOTAL 12639` is "a control, not the frontier". That was wrong.
   `tagstackFrontier` is `tagstackEncodeUncached` plus memoization — the same function
   `bench/x74/gate73.ts` calls — so 12639 **is** the frontier. (There *is* a larger stack,
   `tagstackEncode` → `tagstackX74Chain`, which adds the X74 candidate chain on top of the
   base; that is a different number and has not been measured here.) Re-measured this turn
   over the same 29 lanes with 245 codecs registered: **FRONTIER 29 TOTAL 12639 exact
   29/29**, identical to X78 and X79. **The frontier is confirmed to be exactly the
   configuration last measured.** The useful residue of X79's point stands in a weaker
   form: because the frontier is the *base* stack, adding a registry codec cannot move
   12639, so 12639 confirms the base and nothing else.
2. **X76 already tried padding removal on findmnt and it lost: 461 vs 444.** PARATAXIS
   reaches **422** on the same lane. The difference is the tab marker (X76's version
   could not separate a column boundary from a space inside a column), which is why this
   turn's result does not contradict X76's negative so much as complete it.

**Data correction (X79).** The X78 row for `psql-output.txt` was wrong: its "brotli floor"
column was filled with KERMA's *stack* value (172) instead of the measured floor. The
floor is **165** tokens (brotli -q11, 1578 bytes, @ 14.8 bits/tok — recomputed directly
this turn, and the other rows reproduce exactly: metrics 130, ls-l-real 943, ps-aux 743,
ls-real 328, dpkg-l 591, free-m 75, lsblk 61, kb-article 608, uptime-w 70). Corrected,
psql-output's ratio is **not** 1.47 but **1.02**.

**Consequence.** `psql-output.txt` is no longer the headroom leader — it is the lane where
the stack has *caught up with entropy*. Raw 675 → **169** tokens is a **−75.0 %**
reduction, sitting within 4 tokens (2.4 %) of a general-purpose compressor's floor while
remaining directly LLM-readable and byte-exact. The realistic remaining headroom on this
lane is now under 3 %, so the ops category's live target is `metrics.tsv` (1.48) and
`ls-l-real.txt` (1.48), not psql-output.


**Correction (X87) — the "brotli floor" column is not a floor, and four rows in this table
are not frontier numbers.**

1. **`@ 14.8 bits/tok` was an assumption, and it is too generous.** The Ω-Ξ atom alphabet is
   K = 65536 single-token atoms, so it carries `log2(K)` = **16 bits per token by
   construction**, and achieves 15.9 measured. Recomputing nothing else, ΑΙΘΗΡ lands *below*
   the printed floor on 22 of 29 lanes: `ls-l-real` **731** vs floor 943, `ps-aux-real`
   **650** vs 743, `apt-real` **566** vs 690, `ls-real` **294** vs 328, `kubectl` **200** vs
   214, `vmstat` **93** vs 113, `metrics.tsv` **130** vs 130. In raw bits `cm.ts` beats
   brotli -q11 on 22 of 29 (`bench/x87/receipts/xiprobe.ts`). So the ratio column keeps its
   meaning only with a tier attached: **in the readable tier the printed ratios stand; in the
   entropy tier the "floor" column is brotli's score, not a bound.** The sentence "above 1.0
   the stack beats a strong general-purpose compressor" is now true of the entropy tier on
   22/29 lanes and of the readable tier exactly as printed.
2. **Four `stack` cells are a codec's own `countTokens(message)`, not a frontier cost**, and
   they disagree with the committed 29-lane receipt: `df-h.txt`(raw 570) **153** vs frontier
   **171**; `cue-sheet.md` **101** vs **163**; `metrics.tsv` **192** vs **210**;
   `ls-l-real.txt` **1394** vs **1476**. The gaps are the X86 *contract-at-100 %* law
   measured again from the other side: `cue-sheet`'s 101 is STICHOMYTHIA's message, whose
   41-token key is already inside it, but the frontier re-encodes that message and pays the
   contract again on the way through. **Read the frontier receipt, not this column, whenever
   the two disagree** — `bench/x80/receipts/frontier.json`, total 12639, re-confirmed at X86
   (runs A and B) and at X87 (run C).

**Leaders after X87 — both tiers, because they answer different questions.**

| lane | raw | readable tier | entropy tier (ΑΙΘΗΡ) |
|---|---:|---|---:|
| ls-l-real.txt | 5194 | 1476 (synkrisis) | **731** |
| ps-aux-real.txt | 3054 | 1042 (synkrisis) | **650** |
| apt-real.txt | 2739 | 850 (synkrisis) | **566** |
| code-ts.txt | 1422 | 969 (synkrisis) | **714** |
| df-h.txt (tbl) | 570 | **134** (X86 ΚΕΝΟΝ) | 150 |
| psql-output.txt | 675 | **173** (X82 SCHEMA) | 150 |
| kubectl-get-pods.txt | 1006 | **304** (X80/X86 tie) | 200 |
| metrics.tsv | 811 | 210 (akolouthia2) | **130** |
| cue-sheet.md | 513 | 163 (metron) | **92** |
| kb-article.txt | 656 | 622 (synkrisis) | 617 |

`df-h(tbl)` and `psql-output` are the two lanes where the **readable tier still wins**, and
they win for the reason X86 identified: those lanes have a *law* — an arithmetic progression
and a shape catalogue — and a law beats statistics when the law is short. Everywhere else the
source has more entropy than law, and the entropy tier takes it. ΑΙΘΗΡ does not displace
either arm; it is a different question, and G5 is the only place the two meet.


### ops  (20 lanes)

| lane | structure | raw | stack | brotli floor | ratio |
|---|---|---:|---:|---:|---:|
| metrics.tsv | delimited metrics | 811 | 192 | 130 | 1.48 |
| ls-l-real.txt | listing | 5194 | 1394 | 943 | 1.48 |
| psql-output.txt **X79 SPHRAGIS 244->169** | aligned table | 675 | 169 | 165 | **1.02** |
| kubectl-get-pods.txt **X80 PARATAXIS 326->304** | aligned table | 1006 | 304 | 214 | 1.42 |
| ps-aux-real.txt | process table | 3054 | 1042 | 743 | 1.4 |
| findmnt.txt **X80 PARATAXIS 444->422** | tree table | 787 | 422 | 335 | 1.26 |
| vmstat.txt | aligned table | 229 | 149 | 113 | 1.32 |
| ls-real.txt | listing | 1034 | 433 | 328 | 1.32 |
| df-real.txt | aligned table | 158 | 126 | 96 | 1.31 |
| df-h.txt | aligned table | 140 | 108 | 84 | 1.29 |
| ps-ef.txt | process table | 1144 | 315 | 250 | 1.26 |
| du-real.txt | path list | 458 | 272 | 219 | 1.24 |
| ps-real.txt | process table | 1106 | 397 | 320 | 1.24 |
| apt-real.txt | log/transcript | 2739 | 850 | 690 | 1.23 |
| df-h.txt | aligned table | 570 | 153 | 129 | 1.19 |
| uptime-w.txt | single record | 80 | 80 | 70 | 1.14 |
| dpkg-l.txt **X80 PARATAXIS 673->651** | package table | 1000 | 651 | 592 | 1.10 |
| cue-sheet.md | cue list | 513 | 101 | 99 | 1.02 |
| free-m.txt | key-value table | 76 | 76 | 76 | 1 |
| lsblk.txt | block/tree | 60 | 60 | 61 | 0.98 |

mean ratio **1.26**


### prose  (3 lanes)

| lane | structure | raw | stack | brotli floor | ratio |
|---|---|---:|---:|---:|---:|
| email-thread.txt | email | 629 | 488 | 443 | 1.1 |
| llm-answer.md | markdown | 733 | 674 | 626 | 1.08 |
| kb-article.txt | article | 656 | 622 | 608 | 1.02 |

mean ratio **1.07**


### source  (2 lanes)

| lane | structure | raw | stack | brotli floor | ratio |
|---|---|---:|---:|---:|---:|
| unified-diff.patch | diff | 578 | 419 | 324 | 1.29 |
| code-ts.txt | TypeScript | 1422 | 969 | 812 | 1.19 |

mean ratio **1.24**


### docs  (1 lanes)

| lane | structure | raw | stack | brotli floor | ratio |
|---|---|---:|---:|---:|---:|
| node-help.txt | usage text | 1099 | 862 | 852 | 1.01 |

mean ratio **1.01**


### structured  (3 lanes)

| lane | structure | raw | stack | brotli floor | ratio |
|---|---|---:|---:|---:|---:|
| markdown-table.md | md table | 330 | 176 | 133 | 1.32 |
| prices.csv | CSV | 582 | 133 | 110 | 1.21 |
| json-pkg.txt | JSON | 1152 | 681 | 592 | 1.15 |

mean ratio **1.23**


---

## X79 — SPHRAGIS (⚃)

**Name.** Σφραγίς — "a seal, a signet; the stamp that authenticates a document."
Here, the stamp that fixes where a separator sits. Registered key `sphragis`.
Source: `src/lib/omega/sphragis.ts`.

**The mechanic, in one sentence.** Delete the separator characters *inside* a run of
hex-or-decimal groups (`2026-01-02` → `20260102`, `100.00` → `10000`,
`00:1A:2B` → `001A2B`) and declare the width pattern once; the reader re-inserts the
separators from the run's length and the declared pattern.

**Disclosed inheritance — this is a generalisation of KERMA, not an unrelated
mechanism.** That is stated first because it is the honest description. Across X76–X79
ten distinct mechanics were priced against this frontier and **one** survived
(shape elision; see the negative table below). SPHRAGIS widens KERMA's shape language
in four ways, each measured:

| | KERMA (X78) | SPHRAGIS (X79) |
|---|---|---|
| group alphabet | digits only | digits **and hex** `[0-9a-fA-F]` |
| separators | `[-:./]` | `[-:./,]` (comma added) |
| groups per run | ≤ 4 | ≤ 6 |
| word-boundary guard | none | run may not abut a hex character |
| contract | `§KERMA #:char, fill: …` | `§SPHRAGIS …` (shortened, −3 tok) |

**Why it survives where ten other mechanics did not.** Shape elision changes
**tokenisation**, not redundancy. It pays no pointer, marker or id per occurrence —
only one clause per *shape* — and the frontier, which is very good at capturing
redundancy, cannot undo a tokenisation change it never made. Every dictionary-like
mechanic (MERISMOS, interning, normalisation, remapping) fights the frontier for the
same redundancy and loses; shape elision does not compete with it.

**The shape grammar.** A run is `[0-9a-fA-F]+(SEP[0-9a-fA-F]+){1,5}` with
`SEP ∈ [-:./,]`. A shape is rendered as one `#` per run character, every other
character literal: `####-##-##`, `###.##`, `##:##:##.######`, `###,####-##`. Decoding
is purely positional — given the packed run and the pattern, walk the pattern emitting
the next packed character at each `#` and the literal otherwise. The `#` glyphs are
therefore not a codebook; they are a length.

**Negative space — ten mechanics priced, one kept** (all measured, see
`bench/x79/receipts/`):

| mechanic | result | why |
|---|---|---|
| inter-column padding removal | frontier owns it | marginal rate 0.11 |
| segment interning, raw text | −3 281, not honest | markers cost more than they save |
| segment interning, wire | **0/8** | coverage 0.04–0.10 of the wire |
| arbitrary substring interning | **10/10 refused** | closest +2..+4 tok |
| structural normalisation | +12..+63 | every lane |
| long-literal interning | +201 / 8 lanes | id cost exceeds payload |
| **alphabet remap of wire glyphs** | **+9..+22** | see below |
| bullet / list-marker elision | 0 through frontier | ANAPHORA already does it |
| **whitespace elision round separators** | only comma fires, **+3..+32** | see below |
| tab indentation (units 2, 4) | −17 code-ts, **+137 json-pkg** | per-lane at best |

**Two negatives worth their own explanation.**

1. *Alphabet remap.* `bench/x79/alpha.ts` made this look like a large win: 32 ids
   embedded in ASCII text cost **69** tokens written with ASCII glyphs and **96**
   written with Cyrillic. It is an artefact. `remap2.ts` measured the same
   substitution on real frontier wires and it is **harmful even with no contract at
   all**: +20 (psql-output), +22 (kb-article), +9 (findmnt). The reason is structural —
   only 36 of 126 non-ASCII characters on psql-output's wire have ASCII on both sides.
   The rest sit inside Cyrillic **runs**, which pack at 0.56 tok/char; injecting an
   ASCII glyph into such a run splits it and costs two boundaries. **The wire's
   alphabet is already well chosen.**
2. *Whitespace elision.* `key: value` costs 3 tokens and `key:value` costs 2, which
   suggests −1 per occurrence. `bench/x79/sep.ts` measured it: of five separator
   forms, only `comma-space` ever passes its invertibility guard, and it is
   **positive on every lane** (+3 on `license.txt` to +32 on `ru-kb.txt`), because
   `,word` tokenises worse than `, word`.

**Where the generalisation does NOT pay — reported because it is the interesting
result.** The hex and comma extensions were the reason for building SPHRAGIS, and on
this corpus **they never fire**:

- `aapl-2014.csv` — comma shapes found, but `####-##-##,##.########` and
  `####-##-##,###.#######` are **both width 18**, so gate G1 (width uniqueness)
  refuses the lane outright.
- `vix-daily-1990.csv` — the comma shape passes the guards and still loses badly:
  **822 vs 461**. Packing a CSV's field separators destroys its column alignment.
- `git-log-fuller.txt`, `metrics.tsv` — the candidate shapes collide with bare
  hex runs (commit hashes, small integers), so G2 refuses them.
- `df-h.txt` — no runs at all after the boundary guard.

So SPHRAGIS's measured advantage over KERMA comes from **one** thing: a shorter
contract. On the only lane either fires, `psql-output.txt`:

| codec | one-chat tokens | Δ vs frontier |
|---|---:|---:|
| frontier (243 codecs, X78) | 244 | — |
| KERMA (X78) | 172 | −72 |
| **SPHRAGIS (X79)** | **169** | **−75** |

**Gates — exact by verification, not by argument.**

- **G1 width uniqueness** — at most one kept shape per total run length.
- **G2 no bare collision** — no separator-free run of that length exists anywhere.
- **G3 no merge** — a packed run may not sit beside another run character.
- **G4 word boundary** — a run may not abut `[0-9a-fA-F]` on either side (new; KERMA
  lacks this, and without it a run can be found inside a longer token).
- **G5 round trip** — `sphragisDecode(message) === source`, byte for byte, evaluated
  through **both** layers (frontier decode, then SPHRAGIS decode) as KERMA's fix in
  X78 established.
- **G6 comma safety** — a comma may only be elided inside a run; a run may never span
  a newline.
- **G7 strict win** — `countTokens(message) < frontier.messageTokens`.

**Greedy?** Yes, and **only in the prune**. Shape discovery is a fixed rule (every run
over the separator set, grouped by exact shape, occurring ≥ 2 times). Selection is a
bounded greedy prune: while it helps, drop the least valuable surviving shape and
re-measure with the real tokenizer (≤ 24 evaluations). A round is kept only on strict
improvement, so the prune cannot end worse than the unpruned table.

**Time- or CPU-bound?** **CPU-bound and bounded**: discovery is O(n · L_max); the prune
is at most 24 full token counts. No clock enters any decision.

**Directly model-readable?** Yes. The contract is a single line
(`§SPHRAGIS ####-##-## ###.##`) followed by the packed wire; every transform is a
declared rule about digit counts, and the packed form is ordinary text. No external
table, no tool call.

**Source citation (honest).** Three previously-unreferenced sources bear directly on
this mechanism, found this turn:
**"Getting the most out of your tokenizer for pre-training and domain adaptation",
arXiv:2402.01035** — establishes that the *pre-tokenization regular expression*, not
the vocabulary size, is the dominant lever on compression, and that a "Punct" variant
which prevents tokens starting with `.` trades compression for composition. That is the
same lever SPHRAGIS pulls from the outside, by editing the text rather than the
tokenizer.
**"Tokenization counts: the impact of tokenization on arithmetic in frontier LLMs",
Singh & Strouse, arXiv:2402.14903** — GPT tokenizers chunk long numbers into groups of
up to three digits **left-to-right**, and commas force 3-digit chunks from the right.
This is the direct explanation of why eliding a separator is worth tokens: it releases
a hard L2R 3-digit chunking and lets BPE re-chunk the run freely.
**MedTPE, arXiv:2505.09388** — merges frequently co-occurring token pairs into
composite tokens for lossless compression. Related in aim (lossless, token-count
driven) but it *changes the tokenizer*, which this stack cannot do; SPHRAGIS must
reach the same effect by editing the text.
None of these is prior art for the codec: all three assume control of, or a change to,
the tokenizer. In-repo ancestors: **STIGME (X19)** (separator deletion inside a token),
**MORPHE (X20)** (fits a rule library instead of hard-coding), **APOGRAPHE (X39)** (the
cardinal principle: elide what the *width* determines), **KERMA (X78)** (the direct
parent).

**Fires on** 1 of 8 lanes screened this turn; registered **before KERMA** so the
frontier tournament takes it where it wins and falls back to KERMA otherwise.

**Correction — the number previously reported as "the frontier" is a control.** The
29-lane figure carried forward through X76–X78 (`LANES73 29 TOTAL 12639 exact 29/29`) is
produced by `bench/x74/gate73.ts`, which by its own header runs **"the X73 IDENTITY ONLY
(`tagstackEncodeUncached`, no X74 candidates)"** — it is the *control arm* of the X74
experiment, deliberately excluding every candidate codec. It therefore cannot move when a
codec is added, and confirming it does **not** confirm the frontier. Re-run this turn it
again returns `LANES73 29 TOTAL 12639 exact 29/29` with SPHRAGIS registered, which is the
expected result for a control and is now labelled as one. The frontier cost used
throughout this section (`psql-output.txt` = 244) is measured with `tagstackFrontier`,
which is the full stack.

**Verification.** Two-layer smoke through the registry, `bench/x79/smoke.mjs`:
**PASS — 5 of 5 byte-exact** (`psql-output` 169, `df-h` 171, `metrics.tsv` 210,
`vix-daily-1990.csv` 461, `kb-article` 622). 244 codecs registered.
Receipts: `bench/x79/receipts/sphragis.json`, `bench/x79/receipts/sep.json`.

**Known limit.** It is a two-token improvement over its own parent, and the four
generalisation axes that motivated it are all measured negative on this corpus. The
honest reading is that the shape-elision family is now close to exhausted, and the
next win must come from a different mechanism rather than a wider shape grammar.

**Record.** [`docs/codecs.md`](codecs.md) §X79, `bench/x79/`

---

## X80 — PARATAXIS (⫴)

**Name.** Παράταξις — "a placing side by side; an arrangement in line"; in grammar,
clauses set side by side without subordination. Both senses are meant: the columns are
placed side by side, and the contract states the arrangement flatly instead of nesting a
description of it. Registered key `parataxis`. Source: `src/lib/omega/parataxis.ts`.

**The mechanic, in one sentence.** Aligned tables pad every field to a fixed column
width; delete the padding and declare the widths once — `§PARATAXIS pad fields to 56 18 12`
— and the reader re-pads each field to its declared width.

**Why the padding is worth attacking at all.** A run of spaces is its own pretokenizer
chunk, so it is paid for. On `findmnt.txt` the transform removes 1 189 characters; on
`dpkg-l.txt`, 1 677.

**The central negative, stated first, because it is the interesting result.** The obvious
version of this codec — collapse every run of two or more spaces to one — is **LOSSY**,
and it looked excellent: **−75 tokens on `findmnt.txt`** (`bench/x80/arms.ts`). It is not
a codec result. The padding cannot be recovered from the collapsed text, so that number
measures discarded information, not compression.

| `findmnt.txt` (frontier 444) | tokens | Δ |
|---|---:|---:|
| collapse only (**LOSSY — not a codec**) | 369 | −75 |
| collapse + short contract | 384 | −60 |
| collapse + range contract | 389 | −55 |
| **PARATAXIS as shipped (lossless, tab marker)** | **422** | **−22** |

So of the apparent −75, roughly 53 tokens were information and ~22 were real. This is the
same lesson as X79's alphabet remap in a new guise, and it is why the round-trip gate is
the first gate and not the last.

**Why the lossless version loses so much of the apparent gain.** X76 recorded that the
frontier "owns" padding (marginal rate 0.11), and this turn confirms it: the frontier can
record the padding for about the same number of tokens that declaring the widths costs.
The genuine residue is the ~22 tokens that come from the frontier's column machinery
firing *better* on the normalised text than on the padded text.

**Measured — three lanes fire, each −22 tokens.**

| lane | frontier | PARATAXIS | Δ | chars removed | lines |
|---|---:|---:|---:|---:|---:|
| `findmnt.txt` | 444 | **422** | **−22** (−5.0 %) | 1 189 | 23/28 |
| `kubectl-get-pods.txt` | 326 | **304** | **−22** (−6.7 %) | 791 | 23/24 |
| `dpkg-l.txt` | 673 | **651** | **−22** (−3.3 %) | 1 677 | 35/42 |

Declined honestly (all byte-exact, all refused for a stated reason): `df-h.txt` (best 183
vs 171), `ps-aux-real.txt` (1 102 vs 1 051), `ls-l-real.txt` (1 563 vs 1 496) — on these
the padding is too thin to repay the contract and the marker.

**The design decision that made it work: collapse to a TAB, not to a space.** The first
version collapsed padding to a single space and refused every table whose columns contain
internal single spaces — which is most of them (`df-h`'s `Mounted on`, `ps`'s `COMMAND`,
`ls -l`'s filenames). Splitting on a space cannot tell a column boundary from a space
inside a column. Collapsing to a tab makes the boundary unambiguous, and that single
change took the codec from 2 lanes at −4/−7 to **3 lanes at −22 each**.

**Gates.**

- **G1 geometry** — a column set with ≥ 4 lines agreeing on every separator offset
  (`bench/x80/dbg2.ts`: findmnt 56/74/86 on 23 of 28 lines; kubectl all six offsets on
  23 of 24; ps-aux 5 of 8 offsets on all 56 lines).
- **G2 saving** — at least one character must actually be removed.
- **G3 round trip** — `parataxisDecode(message) === source`, byte for byte, through
  **both** layers. This is the gate that makes it lossless and it is what separates the
  codec from the naive collapse.
- **G4 decoder unambiguity** — a line the reader must not re-pad is one that, after the
  collapse, would be indistinguishable from a padded line. Those are listed by number in
  the contract (`except 1`) and left literal; the budget is 6. Everything else is
  self-identifying, because a line that still carries padding splits differently.
- **G5 strict win.**
- **Guard** — the source must not already contain a tab, or the split is not total.

**Two hypotheses tested and falsified** (which is why the widths are transmitted at all):

- *"re-align each column to its own maximum content width"* — **false.** Measured
  (`bench/x80/align.ts`): `restore_by_maxwidth=false` on all eight lanes. findmnt's TARGET
  column is padded to 56 while its widest entry is 51.
- *"width = max content + k, so the contract is free"* — **true on one lane, false in
  general.** `bench/x80/maxw.ts`: `max+2` reproduces `df-h.txt` exactly (18/18) and
  equals the observed truth, but it reproduces 0/24 on findmnt and 0/23 on kubectl. So
  the rule cannot be relied on, and the widths are declared explicitly.

**Greedy?** Yes, and only in the prune — and the prune is **lazy** (see below). Geometry
detection is a fixed rule: for each separator index take the modal next-field offset over
the lines carrying the full separator set, then keep the lines agreeing exactly.

**Time- or CPU-bound?** **CPU-bound and bounded.** Detection is O(n) in characters; the
prune is at most 4 rounds of two full frontier encodes. No clock enters any decision.
**Speed:** the prune was measured never to improve a result (`pruned=0` on every lane in
`bench/x80/receipts/parataxis.json`) while costing two full frontier encodes per candidate
lane, so it now runs only *after* the cheap gates pass. Verified result-preserving: the
three applied lanes and the three refusals are numerically identical before and after.
This is a speed win for this codec, **not** for the whole stack — see §Speed below.

**Directly model-readable?** Yes. One contract line, then the wire. The reader splits
each line on tab, pads field *j* to the *j*-th declared width, and leaves the rest
literal. No external table, no tool call.

**Source citation (honest).** Four previously-unreferenced sources, found this turn.

- **Mao, Pirk & Xue, arXiv:2505.06297** — *Lossless Compression of LLM-Generated Text via
  Next-Token Prediction.* Uses an LLM's next-token distribution to drive arithmetic
  coding: 14.6–23.8× vs gzip's ~3×. **This is the AI-native compressor everyone reaches
  for, and it is precisely the one that cannot satisfy this stack's contract.** The
  reviewer's objection is load-bearing: arithmetic coding requires the decoder to
  reproduce byte-identical conditional probabilities at every step, and §4.4 of the paper
  itself concedes LLM inference is not bit-stable across runs (floating-point precision,
  MoE routing, hardware). No round trip, no bit-exactness check, no decoder specified.
  Everything in this stack is gated on `decode(message) === source`; that gate is exactly
  what this method cannot pass.
- **LMCompress, arXiv:2407.07723** — *Understanding is Compression.* Same paradigm
  extended to images, video and audio. Same limitation.
- **LM-GC, NeurIPS 2024** (arXiv:2410.12259) — LLMs as zero-shot lossless gradient
  compressors. Losslessness *is* attainable here because the probabilities come from a
  frozen, deterministic model. Its transferable finding is empirical and directly
  relevant: serialising data into "recognizable symbols" with "proper separators" changed
  compression by up to 70 % and 40 %. **The separator choice materially changes how well
  a model-driven compressor prices a stream** — independent corroboration that PARATAXIS's
  separator normalisation is the right axis to pull.
- **arXiv:2402.01035** (from X79) — the pre-tokenization regex, not vocabulary size,
  dominates compression.

**Newly-solved mathematics — reviewed as instructed, and reported honestly.** The
frontier-lab results of this period are real and, unusually, verified: an internal OpenAI
reasoning model **disproved the Erdős planar unit distance conjecture** (posed 1946) in
May 2026, with independent verification by Noga Alon, Melanie Wood and Thomas Bloom, and
Timothy Gowers indicating it would merit a top journal — a new infinite family of
constructions via Golod–Shafarevich and class field towers, beating the square grid to
n^(1+δ) with δ refined to 0.014 by Will Sawin. Separately **Erdős problem #1196** was
resolved by GPT-5.4 Pro from a bare problem statement by Liam Price, in a paper with
Terence Tao and Jared Duker Lichtman, using a downward Markov chain weighted by the von
Mangoldt function; #728 and #729 were resolved with **Lean formalisation**
(OpenAI + Harmonic's Aristotle), as were #1148 and #258.

**None of these yields a new compression algorithm, and I am not going to pretend
otherwise.** They are results in combinatorial geometry and analytic number theory. The
one genuinely transferable idea is *methodological*: several were machine-verified in
Lean rather than merely peer-reviewed. This stack's discipline — every codec gated on a
byte-exact round trip, with refusals recorded rather than hidden — is the same idea
applied to codecs, and the Erdős episode is a good argument for keeping it: the first
GPT-5 claim (ten Erdős problems "solved") collapsed because the model had merely
rediscovered literature, and it was caught only because someone checked.

**Known limits.** Three lanes, −22 each. It cannot help a table whose padding is thin, and
it refuses any source already containing a tab.

**Record.** [`docs/codecs.md`](codecs.md) §X80, [`bench/x80/REPORT.md`](../bench/x80/REPORT.md).

---

## X81 — HARMOS (⌛)

**Name.** Ἁρμός — "a joint, a seam, that which joins two things"; in masonry, the mortar
line between cut stones. Both senses are meant: the codec removes the seams between
fixed-width fields, and what remains are the stones themselves. Registered key `harmos`.
Source: `src/lib/omega/harmos.ts`.

**The mechanic, in one sentence.** A compound token — a date, a time, a timestamp — is a
fixed number of fixed-width fields joined by punctuation, and every hyphen, colon and
separator run is an o200k token carrying no information the digits do not already carry;
delete the separators and declare the shape once — `§X81 ~8=YYYYMMDD.` — and the reader
re-inserts them.

**Where this sits relative to X80.** PARATAXIS removed the padding **between** columns —
pure column geometry — and declared the widths once. HARMOS removes the separators
**inside** a field — pure field geometry — and declares the shape once. Same claim, one
level down: a separator recoverable from a declared width is not information. The unit of
redundancy has moved from the table to the token.

**Measured — three lanes fire, −66 tokens total, every round trip byte-exact.**
Driving the shipped codec (`bench/x81/verify.ts` → `src/lib/omega/harmos.ts`), cold,
against the real frontier:

| lane | frontier | HARMOS | Δ | forms |
|---|---:|---:|---:|---|
| `psql-output.txt` | 244 | **193** | **−51** | `d8` ×24 |
| `cue-sheet.md` | 163 | **152** | **−11** | `c6` ×28 |
| `metrics.tsv` | 210 | **206** | **−4** | `dt14T` ×24 |
| `prices.csv` | 133 | 133 | +0 REFUSED | `d8` ×30 |
| `ls-l-real.txt` | 1497 | 1497 | +0 REFUSED | `lsy` ×108, `lst` ×41 |
| `ps-ef.txt` | 315 | 315 | +0 REFUSED | `c6` ×39, `c4` ×39 |
| `ps-aux-real.txt` | 1051 | 1051 | +0 REFUSED | `c4` ×59 |
| `ps-real.txt` | 397 | 397 | +0 REFUSED | `c4` ×39 |
| `email-thread.txt` | 488 | 488 | +0 REFUSED | `d8` ×4 |
| `ls-real.txt` | 433 | 433 | +0 REFUSED | `lst` ×14, `lsy` ×23 |

**The central negative, stated first, because it is the interesting result.** `ps-ef.txt`
has **larger raw savings than the winner** — −156 raw against `cue-sheet`'s −84 — and it
still loses by +20. So does `ls-l-real.txt` (−185 raw, +3). The frontier already prices
their punctuation away, because their timestamps are repetitive in a way the frontier's
own row machinery can see: ps-ef's START column repeats one date 39 times.

HARMOS therefore only wins where the timestamps **vary**. That asymmetry is the
mechanism, and it is why the win is per-lane and measured rather than global and asserted.

**Pack / unpack.** Forms are applied **sequentially**, each to the output of the previous,
most specific first. Unpacking applies the inverses in **exact reverse order**. Every
shape is tagged by its marker **and** by the length of the digit run that follows, and a
longer run is always matched before a shorter one, so no inverse can consume another
shape's payload:

| source | packed | tag |
|---|---|---|
| `2026-11-07T14:22:01` | `%20261107142201` | `%` + 14 digits |
| `2026-11-07 14:22:01` | `~20261107142201` | `~` + 14 digits |
| `2026-11-07T14:22` | `%202611071422` | `%` + 12 digits |
| `Apr 14  2017` | `&Apr14!2017` | `&` + Mon + DD + `!` + YYYY |
| `Jan  2 08:00` | `@Jan0208:00` | `@` + Mon + DD + HH:MM |
| `2026-11-07` | `~20261107` | `~` + 8 digits |
| `00:03:12` | `^000312` | `^` + 6 digits |
| `08:00` | `^0800` | `^` + 4 digits |

**G1** closes the last hole: if the source already contains any of `% ~ & @ ^`, the lane
is REFUSED outright rather than escaped, so a decoder never wonders whether a marker it
sees was in the original.

**The day field is derived, not transmitted.** `ls -l` right-justifies the day to width 2,
so `Jan  2` has two spaces and `Jan 15` one — and that spacing is not recoverable from
the digits. Rather than pay for it, HARMOS observes it is a **function of the day**: a day
below ten is padded to two columns. The day is stored zero-padded and the inverse
re-derives the spacing. Verified on all 149 dates of `ls-l-real.txt` (`rt=true`) — even
though that lane is then refused on cost.

**The contract decides everything, and that is the actual result of the turn.** The
packing is nearly free; the contract is the whole cost. Measured on the **same transform
on the same lane** (`bench/x81/receipts/chrono4.json`):

| lane | contract 34 tok | contract 9–13 tok |
|---|---:|---:|
| `psql-output.txt` | −27 | **−52** |
| `cue-sheet.md` | +12 | **−8** |
| `metrics.tsv` | +21 | **−4** |

So the contract names **only** the shapes a lane actually contains, in terse form: a lane
with nothing but ISO dates pays nine tokens. Two drafts are recorded because they failed
and the failure is the point —

- **one fixed contract for all shapes** (`bench/x81/receipts/chrono.json`): contract 95
  tokens, and **every** lane loses, by +17 to +65. It is also not round-trip correct,
  because the packed forms collide.
- **no marker characters**: the inverse is a guess, since a bare 8-digit run in the source
  is indistinguishable from a packed date.

**Greedy?** The **rewrite** is not — it is a deterministic ordered pass, and the packed
text is a fixed function of the source. What **is** greedy is the acceptance search:
shapes are admitted in specificity order and the set is trimmed by a bounded repair loop
(drop the least specific shape, re-test) while the result does not beat the frontier.
Bounded at two iterations, so the codec is deterministic and terminating, and it can
return a locally-but-not-globally-optimal shape set.

**Time- or CPU-bound?** **CPU-bound.** The scan is a handful of linear regex passes; a
single frontier encode costs orders of magnitude more than the entire HARMOS analysis.
There is no I/O and no waiting anywhere in the codec.

**Honest source.** The mechanism is empirical and measured here, not borrowed. The
property it exploits — that a separator between digit groups forces the tokenizer to
restart a numeric chunk, so `2026-11-07` costs more tokens than `20261107` — is
documented in Singh & Strouse, *Tokenization counts: the impact of tokenization on
arithmetic in frontier LLMs* (arXiv:2402.14903), and in *Getting the most out of your
tokenizer for pre-training and domain adaptation* (arXiv:2402.01035), which show digits
are chunked in threes right-to-left and any non-digit breaks the chunk. **No compression
result from either paper is claimed or used**; they are cited for the tokenizer behaviour
only, which this turn measured directly.

**Known limits.** Three lanes, and the largest is −51. It cannot help a lane whose
timestamps the frontier already models — which is most of them. It refuses any source
containing `% ~ & @ ^`. The terse contract assumes a reader that can expand a shape from a
nine-token declaration; that is exactly the competence this stack is built to rely on,
but it is an assumption, and it is the reason the full-contract arm is retained for
comparison rather than removed.

**Record.** [`docs/codecs.md`](codecs.md) §X81, [`bench/x81/REPORT.md`](../bench/x81/REPORT.md),
receipts in `bench/x81/receipts/`.

## X82 — SCHEMA (⊙)

**Back-filled at X86.** SCHEMA shipped in `docs/codecs.md` §X82 with receipts but never got
an entry here; the omission is corrected rather than papered over, and everything below is
taken from that section and from `bench/x82/receipts/`, not re-derived.

**Decode abbreviation → technical design spec.** `§SCHEMA 8d=dddd-dd-dd 5d=ddd.dd.` —
*lossless token-shape elision by discovered signature and length-table decode*. A machine
token (semver, ISO date, clock, fixed-scale decimal, IPv4) is a fixed number of
fixed-width groups joined by punctuation, and in o200k each punctuation character inside a
digit run is its own token because BPE merges do not cross a pre-token boundary. SCHEMA
deletes the punctuation and declares the group widths **once**; the packed run's *length
alone* selects the rule, so no per-instance marker is paid. `d` = digit, `L` = letter.
Discovery is from the text (six separator classes scanned), not from a hand-written
catalogue. Selection is greedy over length-disjoint shapes in descending raw saving, then
a bounded prune drops the least valuable shape while the message does not beat the
frontier. Gates G1–G7: shape discovery, length-table injectivity (no two shapes may claim
the same packed length), no bare-run collision with text already in the source, round trip,
and a strict win measured **through** the frontier rather than against `countTokens` —
which is the whole point, because measured with `countTokens` every lane refuses
(contract + packed is longer than the source) while several win through the frontier.

**Measured** (`bench/x82/verify.ts`, o200k, byte-exact on every lane):

| lane | frontier | SCHEMA | Δ |
|---|---:|---:|---:|
| `psql-output.txt` | 244 | **173** | **−71 (−29.1 %)** |
| `cue-sheet.md` | 163 | **155** | **−8 (−4.9 %)** |
| `markdown-table.md` | 176 | **171** | **−5 (−2.8 %)** |
| `json-pkg.txt` | 681 | **679** | **−2** |

and **zero wins across 13 secondary lanes** (`bench/x82/receipts/schema-sweep.txt`: the six
`holdout-lang` knowledge bases, `agent-history.md`, `find-listing`, `git-log-fuller`,
`git-numstat`, `ls-full-iso`, `node-stacktraces`, `npm-ls`), every one `rt=true` and every
one unchanged. A DISTINCTNESS gate (distinct values / occurrences ≥ 0.5) is what separates
the wins from the no-ops: measured absorption by the parent frontier is 86–103 % on
repetitive shapes and only 14 % on distinct ones, so packing a shape the frontier already
models buys nothing and the contract still costs.

**Greedy?** The rewrite is not — a deterministic ordered pass. The **acceptance search is**
greedy with a bounded repair loop (≤4 frontier evaluations), so it can return a
locally-but-not-globally-optimal shape set: two medium length-disjoint shapes can beat the
single largest and the greedy order never searches that.

**Time- or CPU-bound?** **CPU-bound.** Discovery is a handful of linear passes plus a sort,
O(n log n) in candidate tokens; the cost is the frontier evaluations in the prune. No I/O.

**Honest source.** No compression result is imported. Cited for tokenizer behaviour only:
arXiv:2402.14903 and arXiv:2402.01035 (digits chunk in threes right-to-left; any non-digit
breaks the chunk). Consulted and not transferred: LTSC (arXiv:2506.00307 — lossless
LZ77-style meta-token dictionary, 18–27 %, needs fine-tuning); Splinter (ACL 2025 —
reversible single-character deletion as a composite `position:letter` character, more
general but strictly more expensive when the shape repeats, which is exactly when SCHEMA
uses it).

**Record.** [`docs/codecs.md`](codecs.md) §X82, `src/lib/omega/schema.ts`, registry key
`schema`, receipts in `bench/x82/receipts/`.

## X86 — ΚΕΝΟΝ (KENON)

**Decode abbreviation → technical design spec.** *Column-boundary inference by gap voting,
feeding the existing byte-exact KANNABOS grid.* A space-aligned table whose last column is
prose — `dpkg -l`, `ps aux`, `ls -la`, `psql` — is the most common shape in real command
output and the one KANNABOS cannot find, because `kannabosPlan` picks its candidate column
counts from the **cell-count histogram** (how many non-space runs a line usually carries).
On `dpkg -l` that histogram reads `10:25 9:25 8:23 7:20 11:18` over 141 lines: those are
the **word counts of the Description column**, so the true count, 5, is never a candidate
and the lane reports *no grid plan*.

ΚΕΝΟΝ asks the geometry instead. A column boundary is **a gap that occurs on almost every
line**: every run of ≥2 spaces votes for the offset at which the next field begins, and the
offsets supported by ≥ max(3, ⌈0.6 · lines⌉) lines are the boundaries.

```
dpkg -l, 141 lines      4:135  34:136  65:136  78:135        → k=5
kubectl,  23 lines      37:23 45:23 57:23 68:23 76:23 92:23   → k=7
ps aux,   61 lines      18:59  23:58  38:37  49:60  54:58  62:59 → k=7
apt list, 61 lines      no offset reaches the floor           → refused (G2)
```

Prose cannot manufacture a boundary — its word gaps land at offsets occurring once or twice
each — which is why the vote survives a free-text tail that destroys the histogram. Two
thresholds (0.6 strict, 0.4 permissive) plus *k*−1 are offered, since a boundary just under
the floor still bounds a real column; every candidate costs a full grid fit, so the list is
three long. The wire, the anchors (L start / R end / T tail), the per-column codecs
(`x` value-per-line, `rN` runs, `dN` dictionary, `wW` fixed width, `l:`/`k:` affine and
clock laws, `t:` compound templates with `%M` periodicity), the row/literal pattern and the
byte-exact rebuild are **KANNABOS's, unchanged**: ΚΕΝΟΝ re-derives no padding arithmetic.
The single edit to `kannabos.ts` is an optional `extraK: number[] = []` unioned into the
candidate list, plus `kannabosRunMarker()` so the contract can name the run marker the wire
actually declares (G5b) instead of the hard-coded `*`.

**Gates.** G1 ≥6 lines · G2 support floor · G3 a plan exists for a voted count ·
G4 `kannabosDecode(wire) === text` before anything is measured · G5 one-line contract,
G5b contract marker = wire marker · **G6 two-stage round trip** (the frontier reproduces our
message, our contract then reproduces the source) · G7 strict win on one-message tokens
through the frontier. Refusal returns the frontier's own message, so no lane can regress.

**Measured** (o200k, `OMEGA_DET=1`, `bench/x86/receipts/kenon.json`, `ab.json`):

| lane | frontier | ΚΕΝΟΝ | Δ | cols/rows/lit | clause | wire |
|---|---:|---:|---:|---|---:|---:|
| `df-h.txt` (tbl) | 171 | **134** | **−37 (−21.6 %)** | 5/18/2 | 41 | 93 |
| `kubectl-get-pods.txt` | 326 | **304** | **−22 (−6.7 %)** | 7/22/2 | 69 | 414 |
| `psql-output.txt` | 244 | 299 | +55 refused | 11/24/6 | 70 | 300 |
| `findmnt.txt` | 444 | 501 | +57 refused | 5/18/10 | 50 | 722 |
| `dpkg-l.txt` | 673 | 713 | +40 refused | 5/36/6 | 50 | 800 |
| `ls-usr-bin.txt` | 375 | 510 | +135 refused | 9/39/3 | 52 | 540 |
| `ls-full-iso.txt` | 367 | 491 | +124 refused | 9/28/6 | 52 | 525 |
| `ps-real.txt` / `ss-tan.txt` | 397 / 209 | 506 / 318 | +109 / +109 refused | 6/39/3 · 5/17/9 | 52 / 61 | 565 / 519 |
| `ps-eo-cpu.txt` / `proc-meminfo.txt` | 389 / 349 | 480 / 438 | +91 / +89 refused | 6/39/3 · 3/48/7 | 52 / 61 | 532 / 386 |
| `df-real.txt` / `df-h-all.txt` | 126 / 124 | 232 / 230 | +106 / +106 refused | 6/6/2 | 61 | 171 / 169 |
| `vmstat.txt`, `apt-real.txt` | 149, 850 | — | refused (G2, no grid) | — | — | — |

**Two wins, thirteen refusals.** `df-h.txt` is a lane **no other arm wins**: PARATAXIS's own
receipt records `refused: no win (best 183 >= frontier 171)` and ΚΕΝΟΝ reaches 134.
`kubectl` is a **tie** with PARATAXIS (both 304), not a new best — stated as a tie.

**Why the refusals are one inequality, not thirteen accidents.** Two measured laws
(`bench/x86/receipts/ab.json`): the contract is paid at **100 % of its raw price**
(`F(clause+wire) − F(wire)` = `raw(clause)` exactly on `df-h` 41, `dpkg-l` 50, `findmnt` 50,
`psql` 70; 71 vs 69 on `kubectl`), and a columnar wire is **nearly incompressible**
(`F(wire)/raw(wire)` = 1.000 `df-h`, 0.829 `dpkg-l`, 0.763 `psql`, 0.625 `findmnt`, 0.563
`kubectl`) against 0.31–0.67 on the sources. So the win condition is
`raw(wire)·ρ + raw(clause) < F(source)`: `df-h` clears it because five columns are
*generated* (93 raw tokens for a 570-token source), `kubectl` because its columns *repeat*
(ρ = 0.563 — the same value adjacent to itself is still a repeat the frontier can use), and
`dpkg-l` fails it (663 + 50 = 713 > 673). **De-interleaving pays where columns are
generated or self-repeating, not where they are prose.**

**What the vote bought, isolated.** Arm A = histogram candidates, arm B = histogram + vote,
same frontier, same gate: `df-h` A −24 → B **−37** (**the vote changed the plan, 13
tokens**); `kubectl`, `findmnt`, `psql` — **identical**, the vote changed nothing;
`dpkg-l`, `dpkg-l-full` (16 591 bytes, 136 rows), `df-real`, `df-h-all` — **no plan at all
without the vote**, byte-exact with it, and all four then *lose on cost and are refused*.
Reach and win are different properties; the vote buys reach plus 13 tokens on one lane, and
this entry does not upgrade reach into wins. `dpkg-l-full`'s cost A/B was started and **not
completed** (three frontier encodes on a 16.5 KB lane); the predicted loss
(0.829 · 3407 + 50 ≈ 2875 vs a frontier of 2258) is labelled a prediction.

**Verification.** `bench/kenon_decode.py` is a **cold CPython reader** — different language,
no TypeScript, no repo state, nothing passed in but the message: **16/16 real lanes
byte-exact**, including `dpkg-l-full` (16 591 chars), `ls-l-real` (10 692), `find-listing`
(11 789). Synthetic red team (`bench/x86/fuzz.ts`, seeded, 400 generated tables with
random column counts, alignments, widths, gaps, value classes incl. empty and non-ASCII,
injected literal rows, CRLF and no-trailing-newline): **223 accepted, 177 refused, 0 hard
failures**, 60 accepted cases re-verified through the CPython reader. Decoder attack
(`bench/x86/fuzz_decode.py`, 2 554 and 8 512 mutations over the 16 real messages):
**0 uncaught exceptions, 0 hangs, 0 nondeterminism**, 618 refusals, and a hand-built
contract/wire marker mismatch refused by G5b. It found one real defect on the first run
(`int(' ')` escaping as `ValueError` from the `t:` step parser), fixed and re-run.

**Greedy?** **No.** The vote is a deterministic histogram with a fixed floor; the plan is
chosen by KANNABOS by *measured* cost among ≤6 candidates; the gate is one comparison. No
search, no sampling, no repair loop — the output is a total function of the input.

**Time- or CPU-bound?** **CPU-bound.** The vote is one regex pass per line, O(chars),
milliseconds (the whole 41-lane screen runs in under a second); the grid fit is
O(lines × candidates); the gate is **exactly one extra frontier encode** — 6.1 s on `df-h`,
34.6 s on `kubectl`, 50.7 s on `dpkg-l`, measured this turn. No I/O, no waiting.

**Honest source.** Fresh searches this turn. Column-by-column serialisation for LLM input:
X. Xiao et al., *Cents: Boosting LLMs with Cost-Efficient Sequences* (VLDB 18:4574).
Fields inferred from recurring character offsets: *TWIX: Visual Template Inference for Data
Extraction from Documents* (PACMMOD/SIGMOD 2025, doi:10.1145/3780105). Columnar notation
for LLM context specifically: *ONTO* (arXiv:2604.17512, 46–51 % vs JSON). Contract-cost
accounting stated formally: arXiv:2604.13066, whose savings criterion charges the
dictionary `n_token(D)` against the saving — here `D` is the clause and its price is
**measured** at 100 % of raw. **Imported: the inference principle. Not imported: code,
data, tokenizer behaviour, or any published ratio** — none of these reads space-aligned CLI
output, none emits a byte-exact wire, none states a gap-support vote with a floor.
Consulted and not transferred: Context Codec (arXiv:2605.17304, commitment-level and
explicitly lossy, though its JSON-is-worse-than-prose ordering independently supports
staying in plain text), MedTPE (arXiv:2605.11774) and *LLM as Token Compressor*
(arXiv:2603.25340) — both need adapter fine-tuning, neither is byte-exact or readable in a
plain chat.

**Frontier-lab solved-math review** (requested): of 120 "AI solved it" announcements in two
years, 64 are third-party confirmed, 40 unverified, 11 were literature retrieval mislabelled
as discovery, 4 had wrong proofs. The confirmed ones — OpenAI's unit-distance disproof
(arXiv:2605.20695, nine external verifiers, Lean-checked), Anthropic's Jacobian
counterexample (dim ≥3, Lean), the zeta-zero proportion, the FLT Lean formalisation
(29 511 theorems, ~13 M lines) — all bind the claim to an **independent check in a
different formalism**; OpenAI's 722-manuscript release withdrew three within a day over one
sign error that invalidated two dependent constructions, with ~50 % shipped unverified.
Transferred, methodologically only: (i) the cold CPython reader is that check for this wire;
(ii) a dependency inherits its parent's risk, so the one-line `kannabos.ts` change is paid
for with a full 29-lane frontier re-confirmation rather than an argument; (iii) the
Oct-2025 "10 Erdős problems" retraction is the prior-art duty in negative form. **No
compression mechanism transfers** — proof search, agent swarms and Lean tactics say nothing
about token-level representation.

**Known limits.** Two lanes win, the larger by 37 tokens; `kubectl` is a tie with an
existing arm. The vote needs a *stable* boundary, so single-space output, trees, prose,
code and CSV are refused at G2 — 25 of 41 screened lanes have no grid at all. It cannot
beat a frontier that already models the source better than the columnar form, which the ρ
measurements say is most lanes. The 41-token contract assumes a reader competent to expand
`t:100G/37`; the 94–123-token full-wording arm is kept for comparison, not deleted.

**Record.** [`docs/codecs.md`](codecs.md) §X86, `src/lib/omega/kenon.ts`, registry key
`kenon`, `bench/kenon_decode.py`, `bench/x86/`, receipts in `bench/x86/receipts/`.

---

## X87 — ΑΙΘΗΡ (AITHER)

**Decode abbreviation → technical design spec.** *The entropy tier, admitted and made
shippable: a portable payload portfolio plus a CRC-32 integrity field appended to the
existing Ω-Ξ atom envelope.* Αἰθήρ is the medium that carries — and the point of the name
is that ΑΙΘΗΡ carries nothing new. `cm.ts` (an lpaq-class context-mixing arithmetic coder:
seven hashed context models, a match model, a logistic mixer, an APM/SSE stage, a
deterministic embedded warm-start prior, pure TypeScript) and `atom-codec.ts` (an envelope
of K single-token atoms, K measured live, carrying `log2(K)` bits per token **by
construction** and proving the construction on every call) have been in this repo the whole
time, wired to the registry arm `omega_xi`, absent from `docs/`, and never once measured
against the frontier. Measured, they win **29 of 29 lanes**: total **12639 → 9043, −3596
tokens, −28.45 %**, `ls-l-real` 1476 → 731, `ps-aux-real` 1042 → 650, `apt-real` 850 → 566,
`code-ts` 969 → 714 — and prose as well, `llm-answer` 674 → 597, `email-thread` 488 → 418.

Two standing claims in this document die on that table and are recorded here as dead rather
than left to be repeated. **"Prose is at the tokenizer floor"** — the floor is a property of
the *self-describing-message family*, not of the source; an entropy coder needs statistics,
not structure. **"The `ls -l` residual is bounded by the one-token reference barrier"** —
the barrier is real for a readable message and irrelevant to a character-level model, which
codes the same filename column at 15.9 bits/token and halves the lane. Also dead, quietly:
the **943-token brotli-q11 "floor"** for `ls-l-real`, which was `bits / 14.8` where 14.8 was
an assumption; the alphabet carries 16 bits/token by construction and 731 < 943.

ΑΙΘΗΡ is the two fixes that make that win something you can ship.

**(1) Portability.** `omegaXiCompress` ships the smallest of fifteen payload candidates, six
of which reach brotli through `CompressionStream('brotli')` — a Node 22 extension that **no
browser implements**. On the 6 of 29 lanes where brotli wins, the server emits a wire the
client cannot inflate at all. It fails loudly (`payloadDecode` throws), so this is a
portability defect and not a fidelity one, but it is still unshippable. ΑΙΘΗΡ restricts the
portfolio to `{0,1,2,4,5,7,8,12,15}` — the brotli ids are 3, 6, 10, 11, 13, 14 — for
**103 tokens over the corpus, 2.7 % of the win**. And the restriction is nearly free for a
reason worth keeping: a browser-restricted portfolio and a portfolio with
`CompressionStream` deleted entirely **agree on all 29 lanes**. Once brotli is refused,
`cm.ts` wins every lane deflate and gzip were contesting. The native streams were never
contributing; they were only ever a liability.

**(2) Integrity.** `unpackWire` reads its 4-byte header, trusts `payloadLen`, consumes
exactly that many bytes in 512-byte blocks, and **never checks that all atoms were
consumed**. There is no checksum. The encoder is round-trip gated, so it never ships an
unverified wire — but a wire damaged *after* it leaves the encoder has three possible
outcomes and only one is acceptable. Measured over 1856 mutations (8 kinds × 8 × 29 lanes,
deterministic xorshift seed `0x2f6e2b1`): 944 refused, 466 no-ops, and **446 that return
DIFFERENT TEXT with no error at all — 32.1 % of effective mutations corrupt silently.** For
a codec whose whole claim is byte-exactness that is disqualifying.

The fix is two atoms. K = 65536, 16 bits/atom, fingerprint `9f6dfcc4` for `o200k_base`, so a
32-bit field is exactly `ceil(32/16) = 2` atoms = 2 tokens, appended to the wire — and
because `unpackWire` ignores atoms its header did not ask for (verified: the `extend`
mutation decodes byte-exactly), the field rides outside the envelope's own digit stream and
`atom-codec.ts` is untouched. What it covers is the part worth thinking about: not the
compressed payload, which would only catch damage the payload decoder happens to notice, but

```
CRC-32( alphabetFingerprint || utf8(sourceText) )
```

checked against the text the reader finally receives — so it catches damage anywhere
(header, block boundary, payload) and folds in alphabet drift for **zero extra tokens**: if
the atom alphabet ever changes, every older wire refuses instead of decoding to noise under
a shifted index. Same 1856 mutations against `aitherDecode`: **1622 refused, 0 silent
corruptions**; re-run at N = 24, **5568 mutations, 4860 refused, 708 no-ops, 0 silent
corruptions, 0 hangs**. The arithmetic reconciles exactly — 944 + 446 = 1390, plus the 232 `extend`
mutations that were no-ops before and are refusals now (appending an atom shifts the
checksum window) = 1622; the residual 234 no-ops are 232 whitespace doublings and 2
self-swaps.

**Wire.** `<Ω-Ξ atom run> <c₁> <c₂>`, the atom run being `omegaXiCompress` output verbatim
under the portable restriction and `c₁c₂` the big-endian base-K digits of the CRC. **No
per-message contract line**, deliberately and measured: the envelope carries no per-message
parameters, so there is nothing to declare. A `§ΑΙΘΗΡ` marker measured **4 tokens per
message, 116 over the corpus**, and buys only self-identification — the fingerprint inside
the checksum already detects the one thing a marker would have to be trusted to report.
**Disclosed:** whitespace between atoms is not significant (the wire splits on `/\S+/g`), so
a re-spaced wire still decodes but will not reproduce its canonical token count.

**Gates.** P1 portable payload id · **G1 envelope invariant measured on the shipped wire**
(`countTokens(wire) === atomCount`) · G2 integrity round trip through ΑΙΘΗΡ's own decoder,
checksum verified · **G3 refusal soundness, probed by deliberately flipping an atom** — if
that decodes to different text the lane refuses · G4 determinism (two encodes, one wire) ·
G5 strict win over a caller-supplied frontier cost · G6 size bound (4 MiB). Any failure
returns the identity, so no lane can regress. G1 is not decoration: its first run refused
**29 of 29** with `invariant broken: 52 tokens for 51 atoms`, because the checksum seam had
been built by trimming and rejoining and every atom in the alphabet is space-prefixed — so
trimming stripped the leading space the *first atom's tokenization* depends on. One token per
lane, invisible to any round trip, caught only because the invariant was measured rather than
assumed.

**Measured** (o200k, `bench/x87/receipts/aither-ledger.json`, `xi-env.json`, `xi-fuzz.json`,
`aither-fuzz.json`): frontier 12639 → **9043**, −3596, −28.45 %, **29/29 applied, 29/29
byte-exact, 29/29 invariant-holding**. Portable Ω-Ξ 8985 vs Node-only 8882 (the 103-token
price of P1, +58 for the 29 checksums = 9043). Source density 20.7–117.0 bits per atom
(`ls-l-real` 117.0). Smallest wins: `kb-article` −5 (0.8 %, inside noise for a codec with a
2-token checksum), `lsblk` −9, `free-m` −19. Largest: `ls-l-real` −745, `ps-aux-real` −392,
`apt-real` −284.

**Verification.** Round trip 29/29 through the *public* `aitherDecode`, not the inner
`omegaXiDecode`, which would not test the field ΑΙΘΗΡ added. Envelope invariant 29/29 on the
shipped wire. Mutation fuzz 1856 and then 5568, **0 silent corruptions, 0 hangs, 0
nondeterminism** (the same set against the un-checksummed envelope gives 446).
Environment fuzz: three environments (Node-with-brotli, browser-realistic, no
`CompressionStream`) × 29 lanes, all round trips exact in all three. Cross-environment
hazard measured rather than argued: the 6 brotli-payload wires decoded with brotli refused —
all 6 fail loudly, none returns wrong text. **Cold read in a second
language: `bench/aither_coldcheck.py`, 29/29 EXACT, exit 0** — it imports nothing from `src/`
and re-derives the atom alphabet's shape, count, ordering and **FNV-1a fingerprint** (`9f6dfcc4`,
recomputed in Python), the 4-byte header, the 512-byte block digit walk, the exact atom
accounting (header + blocks + 2, nothing left over), the portable-codec restriction, and
`zlib.crc32(fingerprint || sourceBytes)` over bytes read from disk. **Its boundary is stated
in the file and is real:** it cannot decode the CM payload, so it proves the checksum agrees
with the source on disk, not that the body decodes to it. Running it found the counterexample
that justifies checksumming the *text* rather than the payload — flipping `lsblk`'s first atom
from index 3072 to 0 turns `codec=12, payloadLen=94` into `codec=0, payloadLen=94`, leaving the
framing byte-identical and every structural check blind; only the decoded-text CRC sees it. Of
six body-flip probes four were caught by framing accident and two were not, so that class is
reported as **deferred** to `aitherDecode` and to the fuzz above. The honest split: the
envelope is verified in two languages, the CM decode in one.

**Frontier confirmation.** Adding the arm must not move the frontier, and "must not" is
not an argument: `bench/x86/front.ts` re-run over the same 29 lanes with `aither.ts` present
gives **FRONTIER 29 TOTAL 12639 exact 29/29, lanes differing: 0**
(`bench/x86/receipts/frontier-runC.json`) — the third consecutive confirmation of the same
baseline this session (A before the `ariadne.ts` key patch, B after it, C after ΑΙΘΗΡ). Wall
times across A/B/C are **not** comparable and no speed claim is made from them: the sandbox is
suspended across turn boundaries and drifts (C's `ls-l-real` 424 319 ms vs B's 391 697 ms on an
identical patch surface).

**Greedy?** **No.** The portfolio is exhaustive over a fixed candidate set and ships the
smallest; the restriction is a set membership test; the checksum is two atoms in a fixed
place. Nothing is searched, nothing is ranked, and G3's probe is a single deliberate
corruption rather than a search for one.

**Time- or CPU-bound?** **CPU-bound.** The CM coder is ~0.2 s per 10 KB; the full portfolio
plus the two extra compressions for G2 and G4 makes `ls-l-real` seconds where the frontier
takes minutes. No interleaved A/B was run, so **no speed claim is made** — this document has
already been burned once by comparing wall times across processes.

**Honest source.** No external source contributed a mechanism here; the mechanism was
already in the repository and the contribution is measurement plus two fixes. Prior art for
the *class* is the lpaq/zpaq family (Mahoney) for the coder and the standard CRC-32
(IEEE 802.3) for the field. Prior art surveyed earlier in this document and still not
imported: Context Codec (arXiv:2605.17302), MedTPE (arXiv:2605.11774), *LLM as Token
Compressor* (arXiv:2603.25340) — the last two need adapter fine-tuning and are not
byte-exact. The methodological transfer from the frontier-lab review survives intact and is
what this entry is built on: **a claim is only as good as an independent check**, so the
446 silent corruptions were measured before the fix was written, and the fix was then
re-measured on the identical mutation set rather than asserted to work.

**Known limits.** The gain is smallest exactly where the readable tier is strongest relative
to the source, and on a 51-token wire the 2-token checksum is 4 % of it. ΑΙΘΗΡ does not know
which tier the caller needs — G5 only knows which is cheaper. The wire is bound to
`o200k_base` and fingerprint `9f6dfcc4`, by design and enforced by the checksum rather than
by convention. There is **no partial mode**: all glyph run or nothing, so a caller who wants
the structure readable and only the irreducible literal residue packed does not get that
here. That hybrid is the obvious X88 and it is not built. And the biggest limit is the one
that decides whether this arm should ever be used: **the wire is not readable by the model.**
The frontier's win has always lived in a model being able to expand `t:100G/37` from a
41-token declaration. Where a prompt must be *used*, the readable tier at 12639 is the only
one that applies; where content is stored, relayed, cached or handed to a program that will
restore it, the entropy tier at 9043 is 28.45 % cheaper and now refuses damage instead of
hiding it. **Neither number should be quoted alone.**

**Record.** [`docs/codecs.md`](codecs.md) §X87, `src/lib/omega/aither.ts`, registry key
`aither`, `bench/x87/`, `bench/aither_coldcheck.py`, receipts in
`bench/x87/receipts/` (including `cold/`), seven real lanes in `bench/holdout-x87/`.

---

## X88 — ΣΥΝΤΆΞΙΣ (SYNTAXIS)

**ΣΥΝΤΆΞΙΣ** = *syntaxis*, Greek "a putting in order together, an arrangement" — the
root of *syntax*. Chosen because the mechanism is a fact about the **arrangement of a
line's gaps**, not about its words: two lines are the same shape when their whitespace
runs fall in the same places, whatever the widths and whatever the punctuation.

| | |
|---|---|
| **Registry key** | `syntaxis` |
| **File** | `src/lib/omega/syntaxis.ts` |
| **Family / fidelity** | `exact` / `exact` — byte-perfect or refused |
| **One line** | Partition a file's lines into **shape families** by a length-invariant, whitespace-general key, fold **every** family (constants → template, slots → de-interleaved columns, right-alignment padding → derived), route each line with a one-character map, carry the rest verbatim. |
| **Greedy?** | **No.** Deterministic grouping by a fixed key; constants by exact equality; padding by an exact solve for one integer `W`; separator = first candidate surviving a scan. No scoring loop, no local move — the wire is a function of the text. |
| **Time- or CPU-bound?** | **CPU-bound**, O(chars), small constant, **no tokenizer call inside the transform**. The only tokenizer work is the two counts the gates need. The costly part of *using* the arm is the one parent-frontier encode G7 requires. |
| **Source, honestly** | **Not a new idea in outline.** `TYPOS` (X41, `typos.ts`, label at `registry.ts:578`) already clusters lines by exact skeleton (`cellSignature`, line 320), induces a mask and separator, and de-interleaves columnar, citing **Drain (ICSE 2017)**, the **Abadi et al. column store (SIGMOD 2006)** and **LZ77**; `PHALANX-A4` adds a gated log-template stage. New here, and scoped narrowly: the **key** (length-invariant *and* whitespace-general), the **scope** (every family ≥ `MIN_ROWS`, not `largestGroup`), the **routing** (one-char-per-line map + literal section), and the **per-position derived-padding fit**. `PARATAXIS` (X80) declared padding as fixed widths; ΣΥΝΤΆΞΙΣ *fits* `W` per family and per position and only where the fit is exact on every line. |
| **Verdict** | **Byte-exact on 75 of 91 lanes, 0 wrong round trips, 9 gross wins totalling −2988 — and refused on every lane measured through the frontier.** Registered because it is sound, because it covers a structural blind spot, and because the refusal is a measurement and not an assumption. |

### The blind spot it covers

`cellSignature` is length-sensitive **and** space-only. Length-sensitivity shatters one
obvious shape into many (`ls -l /usr/lib/x86_64-linux-gnu`: 151 lines → **21 shapes**,
largest group **23.8 %**, so TYPOS folds 36 lines and leaves 115 literal; `ps aux`
22/31.1 %; `findmnt` 26/7.4 %; `dpkg -l` 37/7.3 %; `dpkg-l-full` 129/**2.1 %** — and on
the last three the largest group is below `MIN_ROWS`, so `typosPlan` returns **null**).
Space-only splitting means a **TAB is neither cell nor hole**: `/\S+| +/g` drops it, the
cells stop reassembling to the line, and `git numstat` — 392 of 400 lines with the
identical shape `added<TAB>deleted<TAB>path`, **98 % coverage under any key** — also gets
`typosPlan === null`. `kannabosCells` (`/[^ ]+/g`) is blind to the same file the same way.
ΣΥΝΤΆΞΙΣ splits on `/\S+|\s+/g`, signs a line by *where its gaps are*, and folds all of
them: coverage **23.8 → 60.3 %**, **31.4 → 73.6 %**, **56.2 → 97.8 %**, **2.1 → 17.7 %**,
**14.8 → 90.7 %** on `ls-l-real`, `ls-la-usrbin`, `ls-l-nm`, `dpkg-l-full`, `proc-meminfo`.

### Why it still loses, and the screen that says so cheaply

The dense-wire law (`F(wire)/raw(wire) ≥ 0.563` for any wire this stack produces, against
0.222–0.316 on sources) turns into a **necessary condition**: a pre-transform can only win
if `tokens(M(text)) < 1.78 × F(text)`. Measured this turn — `openstack-loghub-26.log`
F = **896** from raw 4028 (ΣΥΝΤΆΞΙΣ: 3680), `ls-la-usrbin` F = **946** (ΣΥΝΤΆΞΙΣ: 4045),
`npm-ls-all` F = **711** (2811), `find-listing` F = **1140**, `ls-l-real` F = **1476**
(4575). Nothing measured this turn is within 2× of the bound.

The explanation is the result: **a pre-transform that removes plain repetition makes the
wire denser, and the parent glyph pool's yield is a function of the redundancy left in
front of it.** Removing repetition early loses to a pool that removes repetition better.
Arms win only where they delete what a substring dictionary **cannot represent** —
recomputable values, positional constants, tree geometry, numeric shapes, voted column
boundaries. ΣΥΝΤΆΞΙΣ deletes repetition, so G7 refuses it.

**De-interleaving is not uniformly good.** On `git-numstat` the `added`/`deleted` columns
cost **1588 tokens split against ≈658 interleaved**, because o200k merges *across* field
boundaries and one-value-per-line destroys those merges; the `path` column is 3174 either
way, irreducible literal text only a dictionary can reach. Columnar pays on **long string
fields with no cross-field merges** and loses on **short numeric ones**.

### Wire

`§ΣΥΝΤΆΞΙΣ L=<lines> F=<families> E=<1|2> T=<0|1> …` · `M<one char per line, * = literal>` ·
`T<f> <sep><template cells, @n = slot n>` · `W<f> n:W,…` (derived padding, not sent) ·
`C<f>.n<sep><values>` or `C<f>.nx<rows>` then one value per line · `X` then the literal
lines in source order. `E=` declares the **source** EOL because the wire's own joiner is
always `\n` and a CRLF log's wire contains no CRLF at all.

**Gates:** G1 cells reassemble · G2 partition total and row counts met · G3 separator
absent from its family · G4 padding fit exact · G5 byte-exact round trip through the
public decoder · G6 map characters in range · **G7 strict win through the frontier** ·
G8 size bound · **G9 integrity**, `H=` is the CRC-32 of the rebuilt text (imported from
`aither.ts`, one table not two).

**Red team, and a defect it caught.** 9 mutation kinds × 60 per lane × 8 lanes: before G9,
**244 of 427 effective mutations (57.1 %) decoded SILENTLY WRONG** — an edited column value
is still a well-formed value, so every structural gate passed and the decoder returned a
different 10 692-character `ls -l` with no error. After G9: **397 of 425 refused (93.4 %),
0 silent-wrong, 0 hangs**, still 75/91 byte-exact. Cost of the checksum, measured: the 9
gross wins went −2988 → −2773, i.e. **2.9 tokens per applied lane**. Scope: a model cannot
compute a CRC by hand, so G9 is a decoder-side safety property, not a claim the reader can
verify the body.

**Bug the receipt caught and the tests did not:** `W<idx> n:W` was parsed at `l.slice(2)`
— the space after the family letter — so every padding spec was dropped, the padded slot
looked like a transmitted one with no column, and G5 refused `ls-l-real`, `ps-aux-real`
and `ls-real` with `slot 0 has no column` while all 75 lanes that *did* encode still round
-tripped. Fixed to `l.slice(3)`.

**Whole-stack speed, honestly: no win claimed this turn.** Two hypotheses tested and both
falsified with numbers. (1) The count memo's retained-key budget (2 000 000 chars against
5 000–11 000-char candidate wires and **249 arms** per lane) looks like the bottleneck; an
A/B flipping it *inside one process* with the order alternated gives 478 vs 528 ms, 266 vs
286, 115 vs 121 at 2 M against 32 M with identical F — nothing, so the default is
unchanged and only the `setCountMemoBudget` hook is kept. Run D clocked 652 815 ms against
run C's 1 215 714 ms with identical F on all 29 lanes, which is the ~1.6× cross-process
drift and **not** a speedup. (2) `countTokens` is not the hot path: 367 ms once per process
for the vocabulary load, then 1 ms per 6 000-character count, chunk cache 78 % hit, 0
fallbacks. The remaining cost is the 249-arm audit, whose first pass over a lane is ~40× a
warm pass — JIT warm-up across 249 code paths, not removable without removing arms.

**Record.** [`docs/codecs.md`](codecs.md) §X88, `src/lib/omega/syntaxis.ts`, registry key
`syntaxis`, `bench/x88/`, receipts `bench/x88/receipts/{skeleton-census,syntaxis-gross,
syntaxis-fuzz,memo-ab,leaders,logfront,probe1,sweep}.json` and the five frontier wires
`bench/x88/receipts/*.wire.txt`; frontier confirmations `bench/x86/receipts/
frontier-runD.json` and `-runE.json`.

---

## X89 — no new arm: the gate, the clock, and the budget

X89 adds **no glyph, no wire language and no registry entry**. It ships one recalibration
of the two work allowances in `workmeter.ts` and corrects two numbers this page has been
quoting. Three mechanisms were taken far enough to be measured or proved, and all three
are recorded here as closures, because a closed direction is worth as much as an open one
and is much cheaper for the next person to respect.

**The gate is not the stack.** `12 639` is `tagstackFrontier`, documented at
`tagstack.ts:505-510` as *"the identity WITHOUT the X74 candidates"* — the baseline a
registry arm must beat, because arms are gated against the frontier and not inside it. The
encoder a user actually pastes is `tagstackEncode`, which appends STICHOMYTHIA (X73) and
PROSPHYSIS/STOICHEION (X74). Measured over the same 29 lanes under `OMEGA_DET=1`
(`bench/x89/front3.ts`, diffed against the committed run E receipt):

```
gate 12 639  ->  shipped 12 495   (-144)   exact 29/29   lanes worse: NONE
  ls-l-real  1476 -> 1394 (-82, PROSPHYSIS)     cue-sheet  163 -> 101 (-62, STICHOMYTHIA)
```

Quote 12 639 when asking whether a new arm wins. Quote 12 495 when saying what the stack
costs. Quoting the first as the second overstates the stack by 144 tokens; quoting the
second as a target for an arm understates the target.

**`parentCodec` lies once a chain candidate is admitted.** `admit()` (`tagstack.ts:617`)
replaces the message and sets `arm`/`notes` but leaves the base parent's label, so
ls-l-real reports `parent=synkrisis` at 1 394 tokens — a number SYNKRISIS does not produce.
Only STICHOMYTHIA sets its own label. Read `notes`, not `parent`, for any lane whose count
differs from the gate.

**The clock is not the codec.** Without `OMEGA_DET=1` the shipped encoder is not a function
of its input. One process, same code, same 29 files, encoding both tiers per lane
(`bench/x89/front2.ts`): ls-l-real 1476 → **1496**, code-ts 969 → **980**, ps-aux-real
1042 → **1049**, apt-real 850 → **851**; total 12 639 → **12 678**. front2 encoded two
frontiers per lane and so ran hotter than runs A–E, and `chiron.ts:1428` /
`ariadne.ts:881-962` cut searches at wall-clock deadlines. `clock.ts` documents the same
defect from z13 (1664 against 1613 on one file). **That is a ±20-token-per-lane,
±39-token-per-total noise floor**, and it is the reason runs A–E are comparable to each
other and a wall-clock run is comparable to nothing. No arm may be accepted or rejected on
a wall-clock measurement. Five unrelated 2026 issue trackers report the identical bug from
other directions (`mununu#553`, `coso#209`, `Neuraxon#2`, `symthaea#10885`, `mk5-main#173`).

**Positional back-references are closed by arithmetic, not by experiment.** For a span of
`p` tokens occurring `k` times, a literal rule costs `(1+p)+k` and saves `k·p − p − k − 1`;
a pointer rule `<glyph><start>·<len>` must leave its **first occurrence literal**, because
a pointer cannot point at itself, so it costs `5+p+(k−1)` and saves `k·p − p − k − 4`. The
difference is **exactly 3 tokens for every `p` and every `k`**. No LZ77-style arm can pay on
top of a literal-rule dictionary, and none was built. Measured sign check over the 15
committed wires: literal upper bound **+202**, back-pointer **−38**. LTSC
([arXiv:2506.00307](https://arxiv.org/html/2506.00307v1)) publishes the same inequality as
`N·K > 1+N+K` and calls itself *"similar to LZ77"* while shipping a **literal** prepended
dictionary — which the derivation says is the correct choice. LTSC also needs the vocabulary
augmented and the model fine-tuned (exact match 15.7 → 8.5 on Qwen2.5-Coder-0.5B), and its
referee report records the lossless claim *"hinges on a pseudocode ambiguity in Algorithm
2"*. Nothing here needs fine-tuning or a system prompt. TokenSpan
([dev.to](https://dev.to/alexsanderhamir/tokenspan-rethinking-prompt-compression-with-aliases-and-dictionary-encoding-3a27),
Aug 2025) reaches the same arithmetic from practice: 4 tokens per entry, break-even at 5
occurrences, 8 019 → 7 138 (11.0 %).

**ΑΝΤΙΓΡΑΦΟΝ: the post-pass dictionary class is closed by measurement.** MERISMOS interns
repeated substrings of the frontier wire but generates candidates as **character** spans of
4–24 chars needing ≥3 occurrences; ANAMNESIS enumerates maximal repeats properly (suffix
automaton, MR-RePair, `c·(L−1) − (L+1)` — the same pricing again) but encodes the
**source**, so it never sees the wire. Between them lies token-aligned repetition of
unbounded length at two occurrences, and a census priced it at **202 tokens over 15 wires**
(dpkg-l-full 79 = 3.49 %, ls-la-usrbin 24, ls-l-real 21). Built properly — unbounded
token-aligned spans, occurrences re-verified against the wire, ids absent from the wire, a
measured hill-climb, byte-exact decode, CRC-32 in the contract — it returns **applied 0/15,
SAVE 0**.

The reason is worth more than the arm. The best candidate in the corpus is dpkg-l-full's
`"            э"` (twelve spaces and a pool glyph), `p = 2` tokens in isolation,
`occ = 28`. The census charges `28 × 2 = 56` for those folds; their **marginal in-situ cost
is 25**, i.e. 0.89 tokens per occurrence. Twenty-eight id glyphs cannot cost fewer than 28
tokens, so the body *grows* (2 262 → 2 264), the contract adds 17, and the real save is
**−20** against an estimated +25.

> **In-situ floor law.** A repeated span whose occurrences cost less than one token each
> *in situ* can never be profitably interned, because an id costs at least one token per
> fold — before the rule text is paid for. A census measures spans in isolation, where they
> always cost ≥ 1 token per occurrence, and is structurally blind to exactly the cases that
> matter.

The frontier wire is full of such spans *because* a census finds them: what repeats is what
merges — space runs, glyph clusters. This is the dense-wire law that sank ΣΥΝΤΆΞΙΣ, at
single-rule resolution, and it explains MERISMOS's universal refusal **without appealing to
its constants**. Widening `MAX_LEN` to infinity and dropping `MIN_OCC` to 2 buys nothing.
It also prices the X39 rule *"proxy raw gains ≠ wins"* at 2.2× on one rule.

**The budget is the one thing that moved.** Phase measurement under `OMEGA_DET=1`
(`bench/x89/phases.ts`) puts 61.6 % of the shipped encoder in the nine-parent base
competition and 38.4 % in PROSPHYSIS — which on ls-l-real costs 158 172 ms *because* it
re-encodes through the frontier, and that cost **is** the −82 win, so it is not
discardable. Discarded work is 12.9 % on apt-real and ≤2.8 % elsewhere; STOICHEION costs
0.1 %. The base's sub-encode redundancy was already removed by ENGRAMMA (X68), which
replays counted work because X67 measured that a result-only cache is unsound (DIASTEMA
36.5 s → 49.9 s, *slower with the cache on*).

That the allowances bind at all is established by the sweep changing messages when they are
reduced, not by the percentage columns — `workLastEpochUsed()` /
`chironLastEpochUsedUnits()` report the **last** epoch's spend, often a small nested
sub-encode whose own allowance came from its own char count, so the ratio is an indicator.
Read as an indicator: CHIRON reports ≈100 % on nearly every lane (100.0–100.7 %) while the
ARIADNE/DAEDALUS meter reports 19.9–64.6 %. Sweeping both,
interleaved in one process, `OMEGA_DET=1`, `OMEGA_ENGRAM=0`, comparing the **complete
message by SHA-256** and not by token count (df-real and df-h changed wire at an unchanged
count):

| setting | identical message | total | speedup |
|---|---|---|---|
| default | 29/29 | 661 105 ms | 1.00× |
| **0.5×** | **28/29** | 471 550 ms | **1.40×** (1.10–2.68× per lane) |
| 0.25× | 18/29 | 282 080 ms | 2.34× — changes 11 lanes, psql 244 → 268 |

0.5× breaks exactly one lane, **the largest** (ls-l-real, 10 692 chars, 1476 → 1499), while
every input up to 6 751 chars was byte-identical. So the deficiency is a function of size
and the shipped gate is **bracketed by measurement, not chosen freely**: halve both
allowances at or below `X89_HALF_BUDGET_MAX_CHARS = 8_000`, keep the full allowance above —
between the largest input verified sufficient (6 751) and the smallest verified
insufficient (10 692). The gate selects per lane between two measured configurations, so
the aggregate is arithmetic on the receipt: **661 105 → 488 154 ms, 1.35×, identical on
29/29.** Byte-exact decode held 29/29 at *every* setting including 0.25×, because a budget
bounds the **search** and not the **verification**: `consider()` throws unless
`candidate.decoded === text`. A threshold set too low costs tokens, never fidelity. The
`OMEGA_WORK_BUDGET` / `OMEGA_CHIRON_BUDGET` overrides are applied before the gate and never
scaled. This is X58's single knee (ewf-standings: 113M units spent, 5M cap byte-identical,
18.2 s against 39.6 s) generalised to all 29; `mk5-main#173` reports the same shape
independently, *"3.0x faster drain, identical outputs"*. **Not claimed:** 2.34× exists and
is not shipped, and 1.35× is a deterministic-configuration figure — in non-det mode no
identity claim is possible in principle, which is the finding two paragraphs up.

**Raising the binding meter buys nothing.** `bench/x89/rebalance.ts`, 7 lanes, same
discipline: CHIRON ×2, ×4 and ×8, and halved work with quadrupled chiron, all leave every
message **sha-identical on 7/7** and the total unchanged at 1 455 tokens — the search
converges below the allowance — while `w.5c4` runs 39 169 → 22 913 ms, **1.71×**,
byte-exact. That 1.71× is a lead verified on 7 lanes and **not shipped**. Caveat: the
probe's first version compounded its multipliers (`workBudgetFor` reads the env var the
probe sets) and reported `prices.csv` **130 against 133**; it is not reproducible under the
corrected ladder and came with markdown-table 176 → 182 and unified-diff 419 → 445, so the
3-lane sum was worse. A starved budget can drop a non-monotone hill-climb into a better
basin by luck, which is not a policy.

**Leaders, against the shipped column** (`bench/x89/leaders.ts`, a pure join of two
committed receipts, so it costs no frontier call): OPS LISTING 13 lanes ratio 0.316
(floor ÷ stack 0.765, synkrisis 12 / diastema 1) · OPS TABLE 11 lanes 0.417 (0.737,
synkrisis 7 / akolouthia2 3 / metron 1) · PROSE 4 lanes 0.849 (0.956, synkrisis 4) ·
CODE/MARKUP 3 lanes 0.656 (0.835) · DATA 2 lanes 0.214 (0.893, diastema 1 / stichomythia 1) ·
OTHER 1 lane 0.529 (0.839) · **ALL 34 lanes raw 45 841, gate 18 594, shipped 18 450,
ratio 0.402, floor ÷ stack 0.808.** Two refinements. The readability-price law
(`floor ÷ stack < 1.00` everywhere) is false on exactly two lanes — **lsblk 1.017** and
**free-m 1.000** — both information-saturated, both tiny, where brotli's container overhead
exceeds anything a dictionary can save; it holds on 32/34. And at the shipped 101 tokens
**cue-sheet reaches floor ÷ stack 0.98**: within 2 % of brotli-q11 in a wire a model can
read with no system prompt. Columns-as-programs is the only mechanism here that has nearly
closed the readability price, and it does so on a lane whose redundancy is *generative*
rather than *repetitive* — which is why the §4 class finds nothing there.

**Verification abundance, adjudication scarcity.** [arXiv:2608.28997](https://arxiv.org/html/2608.28997v1)
(29 Aug 2026) measures OpenAI's August proof corpus rather than opining on it: **20.6 MB of
kernel-checked Lean against 55.6 KB of statements needing human audit, 379:1**, introducing
**218 bespoke definitions** rather than the community-vetted library, so *"the reader is
asked to check a theorem **and** to validate a private dictionary of 218 terms."* That is a
wire: a private dictionary (the tape) plus a body. Byte-exact round trips, CRC-32 and a cold
CPython reader are all abundant and free, and none of them discharges the adjudication
burden. ΣΥΝΤΆΞΙΣ is the local proof — 75/75 byte-exact, zero wrong round trips, and
**244 of 427 mutations decoding silently wrong** until G9 made the dictionary checkable.
Machine verification did not fail; it answered a different question. The same audit
discipline applies to the mathematics itself: Erdős #846's Lean proof is valid but already
implied by Reiher–Rödl–Sales (so Nexus's total is 8, not 9, under a stricter definition of
*new*); for #125 and #741(i) *"density"* was redefined **after** the proofs were found; of
200 graded AI answers 137 (68.5 %) were *"fundamentally flawed"* and only 13 answered the
problem Erdős meant, eight of those already in the literature; and Will Sawin's improvement
to the unit-distance result is real and *"only meaningful at 10^2000000 points"*. Verified
correct is not verified novel, and a specification amended to fit the artifact is not a
result — which is why §X88.5 reports ΣΥΝΤΆΞΙΣ as a negative rather than redefining
*Pareto-superior* until it qualified.

**What X89 does not claim.** No arm ships; ΑΝΤΙΓΡΑΦΟΝ lives in `bench/x89/` with a refusal
receipt, and registering a 15/15 refusal would add a 251st entry and zero tokens. **No
mechanism improves the representation as seen by the parent frontier this turn — that
deliverable is unmet**, and the in-situ floor law is the reason to stop looking in this
direction rather than to keep trying. The `parentCodec` mislabel is documented, not patched,
because changing it would alter the committed receipt schema and every diff against runs
A–E.

**Record.** [`docs/codecs.md`](codecs.md) §X89, `src/lib/omega/workmeter.ts`
(`X89_HALF_BUDGET_MAX_CHARS`, `X89_BUDGET_FACTOR`, size-gated `workBudgetFor` /
`chironBudgetFor`), `bench/x89/` (`front2.ts`, `front3.ts`, `probe1.ts`, `probe2.ts`,
`antigraphon.ts`, `phases.ts`, `budget.ts`, `budget29.ts`, `rebalance.ts`, `leaders.ts`,
`tape.ts`), receipts `bench/x89/receipts/{front2,front3,probe2,antigraphon,phases,budget,
budget29,leaders-shipped}.json`, frontier confirmation
`bench/x86/receipts/frontier-runF.{json,log}` via `bench/x86/run-front-f.sh` diffed lane for
lane against run E — **TOTAL 12 639, exact 29/29, 0 lanes differing, 448 498 ms against
run E's 608 693 ms, the sixth consecutive confirmation** — and
`bench/x89/receipts/rebalance.{json,log}`.

## X90 — ΣΥΜΦΥΊΑ: the cross-field template, fitted

X90 ships an **arm**, which X89 did not. `src/lib/omega/symphyia.ts`, admitted into the X74
candidate chain in `tagstack.ts` after PROSPHYSIS and before STOICHEION. **ΣΥΜΦΥΊΑ**
(symphyia), *"a growing together"* — the generalisation of PROSPHYSIS's *"a growth onto"*.

**The relation.** A cell that is a template over a **sibling cell of the same record**:
`f[j] = A + f[i] + B`, with `A` and `B` **fitted from the data** rather than written in the
code. Three forms by which affix is constant — `full` (both, field collapses to the marker),
`tail` (`A` constant, field becomes `marker ‖ B`), `head` (`B` constant, field becomes
`A ‖ marker`). `tail` with `A = ""` **is** PROSPHYSIS's admitted rewrite; `head` with `B = ""`
is the prefix direction PROSPHYSIS measures and declines to admit.

**Taken, and how narrowly.** PROSPHYSIS's trigger is `/^(.* -> )([^\s]+)(.*)$/`, so it fires
*only* on lines containing `" -> "`, relates *only* the last field before the arrow to the
symlink target, and admits *only* the suffix direction. GNOMON and SYNARTESIS derive the npm
`resolved` URL from the key and the sibling `version`, but the template is **hardcoded**
(`gnomon.ts:157`). APOGRAPHE, METRON and STICHOMYTHIA are *vertical* — a cell from the row
above, or a column from an affine program. ΣΥΜΦΥΊΑ is horizontal, generic, and knows nothing
about arrows, symlinks or npm.

**Measured** (`bench/x90/receipts/run.json`, `OMEGA_DET=1`, one frontier call per lane):

```
lane            raw    gate  shipped  ΣΥΜΦΥΊΑ   vs shipped
ls-l-real      5194    1476     1394     1386      -8    f11 = f9 + tail
ls-la-usrbin   3271     946      946      927     -19    f11 = "/etc/alternatives/" + f9
dpkg-l-full    4277    2262     2262     2261      -1    f2  = <name> + ":" + f4
                            total 4602     4574     -28    applied 3/3, byte exact 3/3
```

**`ls-la-usrbin` is the point.** Its targets *end with* the link name
(`/etc/alternatives/python3` vs `python3`) — PROSPHYSIS's prefix direction, the one it
refuses by design. So this is a generalisation taking a lane the special case is
structurally blind to, not a rival winning on shared ground.

**The rewrites are identical; the contract was the whole deficit.** On `ls-l-real`:
`1386 = contract 22 + F(rewrite) 1363` against PROSPHYSIS's `1394 = key 31 + F(rewrite) 1363`.
PROSPHYSIS's key is cheaper because it anchors **visually** — *"the name before the arrow"* —
since the arrow is in the payload, so it never explains a numbering convention. **Generality
costs 9 tokens here, and that is the price measured, not argued.** The contract ladder
(`bench/x90/receipts/contract-ladder.json`) then took it 70 → 22 by dropping the Greek name
for the house `X90.`, defining only the affix in use, and stating `1-based` once. Break-even
against the shipped 1 394 was **29 tokens**. Because the message is `contract ‖ "\n" ‖ inner`
and the contract is its own line, `total = T(contract) + 1 + F(rewrite)` — so every phrasing
was priced **offline**, at 233 s a frontier call saved, and the prediction was then verified:
predicted 1 386, measured **1 386**. A further 4 tokens buys `Body first.`, paid deliberately:
the shipped message carries two instruction lines and the body between them has its whitespace
replaced by glyphs, so field-splitting it before the inner decode binds the rule to the wrong
cells. With it: `ls-l-real` **−4**, `ls-la-usrbin` **−15**, and `dpkg-l-full` loses its
1-token margin and is **refused** — reported, not recovered by tuning the contract back down.

**Final measured, with the contract that actually ships** (carrying `Body first.`, +4 tokens
over the table above — `bench/x89/receipts/front3-runG.json` and
`bench/x90/receipts/run-extras.json`):

```
                        gate   shipped before   shipped now    Δ
ls-l-real               1476        1394            1390       -4     (PROSPHYSIS had -82; ΣΥΜΦΥΊΑ has -86)
ls-la-usrbin             946         946             931      -15     PROSPHYSIS cannot fire here
dpkg-l-full             2262        2262            2262       0     REFUSED by G7 at 2265 vs 2262
29 gate lanes          12639       12495           12491       -4
34-lane corpus         18594       18450           18431      -19     lanes regressed: 0
```

The offline model `total = T(contract) + 1 + F(rewrite)` predicted **1 386 / 931 / 2 265** and
measured **1 386 / 931 / 2 265** — exact three times out of three. So once `F(rewrite)` is
measured once, every later contract wording is priced by a token count instead of a 233–508 s
frontier call. That is why eight phrasings could be tried and one chosen on evidence.

**Leaders, generalised** (`bench/x90/receipts/leaders-x90.json`, a pure join of committed
receipts — zero frontier calls, so zero drift):

```
category        lanes     raw    gate     X89     X90     Δ   ratio  floor÷X90
OPS LISTING        13   30065    9595    9513    9494   -19   0.316      0.766
OTHER               1    4277    2262    2262    2262     0   0.529      0.839
OPS TABLE          11    4135    1726    1726    1726     0   0.417      0.737
CODE / MARKUP       3    3152    2069    2069    2069     0   0.656      0.835
PROSE               4    3117    2646    2646    2646     0   0.849      0.956
DATA                2    1095     296     234     234     0   0.214      0.893
ALL                34   45841   18594   18450   18431   -19   0.402      0.809
```

**The gain is entirely in OPS LISTING** — record sets whose fields reference each other. PROSE
does not move (floor÷stack 0.956, already within 5 % of brotli-q11, and there are no sibling
fields to template over). So this is **not** a general prose-and-ops gain and is not presented as
one. The readability-price law `floor ÷ stack < 1.00` still fails on exactly the same two lanes,
`lsblk` 1.017 and `free-m` 1.000; a win shrinks the stack so the ratio rises toward 1.00, and the
law was re-tested rather than assumed. The join also caught a real bug: keying lanes by
**basename** reported 28 gate lanes instead of 29, because the gate contains **two different files
named `df-h.txt`** (`holdout-tbl`, 570 raw → 171; `holdout-x42`, 140 raw → 108). A fail-loud
assertion caught it; the join is keyed by `path`.

**Speed — one cost, one gain, one lead not shipped.** *Cost:* the arm adds one frontier call on
the 3 of 91 lanes where a rule set lowers the raw count, and run G pass 2 paid 733 404 →
**1 124 066 ms**, `ls-l-real` alone 677 933 ms. The 4 tokens it buys there cost about 280 s.
*Gain:* **G9 refuses in ~3 ms what pass 1 spent 610 s of its 843 s discovering** — a real,
fidelity-preserving speed mechanism, since both lanes were refused anyway, only after paying for
the frontier call that proved it. *Lead not shipped:* X89's interleaved `w.5c4` (work ×0.5,
chiron ×4) measured **1.71×** with every message sha-identical, and the blocker X89 recorded
against shipping it — that uniform 0.5× work breaks `ls-l-real` — is **now largely answered**,
because the X89 size gate applies only at or below 8 000 chars and `ls-l-real` is 10 692. What
remains is a measurement, not a design question: one interleaved 29-lane run comparing SHA-256 of
the complete message, ~1 500 s. It was not run because run G had already confirmed the frontier
configuration and changing budgets afterwards would have invalidated it. **That is the next
highest-information test in the repository and it is a speed test.** No stack-wide multiplier
ships this turn; the confirmed figure remains X89's **1.35×**.

**Two claims downgraded by this turn's research.** Reading the full text of
[arXiv:2608.28997](https://arxiv.org/html/2608.28997v1) — which measures OpenAI's August 2026
ten-proof corpus at **20.6 MB of kernel-checked Lean against 55.6 KB of statements needing human
audit, 379 : 1, with 218 bespoke definitions** — splits verification into **L1 derivational
validity** (mechanizable, cost falling), **L2 representational fidelity** (*not* mechanizable even
in principle, cost constant) and **L3 epistemic significance** (cost rising), and names **T3
"bespoke definitional substitution"**: *"a local definition carries none [of the weight of many
eyes], and shifts the auditor's task from reading a theorem to reading a theorem plus a
dictionary."* A wire **is** that structure: L1 is the round trip and the CRC, and the glyph tape
plus marker plus field convention are a private dictionary of exactly the T3 kind. Their verdict
on the corpus — *"the compression was in bytes; the expansion was in expertise"* — applies to this
page's own contract ladder, which compressed 70 tokens to 22 while the local symbols stayed local.
So: (1) **"an LLM can natively decode this" is downgraded to strongly evidenced, not verified**,
since the CPython cold reader is an L2 *proxy* and one of OpenAI's ten results was still disputed
on L2 a month after L1 succeeded; (2) **the verification portfolio is less independent than it is
long** — seven artifacts, but the TS round trip, the fuzz and the contract parser share
`symphyiaDecodeWire`, and the CPython reader shares an author. Independent *implementation* and
independent *code path* are claimed; independent *review* is not available here and is not
claimed. [arXiv:2608.14673v3](https://arxiv.org/html/2608.14673v3) is the warning, finding that a
corpus of 18 assessments does **not** represent 18 independent reviewers; and
[groundtruth.day](https://groundtruth.day/news/three-days-on-nobody-has-publicly-compiled-openais-ten-proofs.html)
reports the ten-proofs repo at 434 stars, one commit, PRs and issues disabled, no Actions runs —
*"OpenAI attesting to OpenAI's own work until somebody else runs the compiler"*, which is the
cold-reader situation one level down. One improvement the paper's disclosure schema suggests and
this repo does not yet do: it asks a release to state **"which definitions are local rather than
imported from a vetted library"**. There is no such register for wire glyphs, and every glyph-pool
character is local by construction — the 607-token tape that defines them being the largest
never-correctly-priced object in the message. That is an **L2** target, and it is where the survey
points next.

**Greedy?** Yes, and only in the selection. Candidate generation is a **fixed rule** (every
ordered field pair on every record, priced by an exact integer estimate). Selection is a
bounded greedy hill-climb on the raw token count, keeping a rule only if it *strictly* lowers
that count, so it **cannot lose against the empty rule set** — which is why the 91-lane screen
reports 3 raw wins and **0 raw losses**. One frontier call, after the rule set is fixed.

**CPU-bound, and it takes no clock at all.** The fit is `O(records × fields²)` integer work,
1–7 ms on lanes up to 16 593 bytes. It imports no `now()` and no `budgetMs`, so its output is
a pure function of its input on any machine — the property X89 §2 measured the wall-clock
frontier losing.

**SOURCE-VARIANCE LAW (G9).** `openstack`'s `f15 = "/v2/" + f9 + "/servers/detail"` held on 15
records with a **291-token raw win**, the largest anywhere, and returned
`F(rewrite) = 896 = F(original)` **exactly** — zero frontier gain — then lost 968 vs 896 once
the contract was counted. Its source `f9` takes one value across those records, so `f15` is a
*literal repeat* the dictionary already interns.

> A cross-field template whose source cell does not vary is not a template; it is a repeat, and
> repeats are dictionary territory. Only a **varying** sibling is information a dictionary
> cannot reach.

This is X89's in-situ floor law moved from the target side to the source side: both say a proxy
that measures redundancy **in isolation** overstates it, because the frontier has usually
already taken the part that looks largest. G9's threshold is **bracketed by measurement**
(`bench/x90/_g9.ts`, G9 disabled): 1 distinct = constant, ELLEIPSIS/APOGRAPHE territory;
**2 = measured insufficient** (zero frontier gain); **4 = measured sufficient** (−25 at the
frontier). No relation here has exactly 3, so the boundary value itself is **untested**. The
gate is also a speed result: pass 1 spent **843 s, 610 s of it** on the two relations G9 now
refuses in about 3 ms.

**Second-order adversary.** `bench/x90/receipts/fuzz.json`: **4 159 mutations, 4 150 refused,
9 exact no-ops, 0 silently wrong.** The mutation that matters is `rule-index` — editing *which
field the contract says is rebuilt*, leaving the wire well-formed so every structural gate
still passes and only the contract's claim is false. That is X88's exact failure mode (244 of
427 silent decodes behind 75/75 byte-exact round trips) and it was refused **381/381**, by the
CRC. G8 costs 7 tokens and that is what they buy.

**G10 caught two real defects on paths the corpus does not exercise.** The contract must parse
back out of the message, because `tagstackDecode` gets the message and nothing else — and
`admit()` checks only the encode-side claim `cand.decoded === text`, so a **missing inverse is
invisible to the gate and fatal to the reader**. G10 requires the printed line to parse back to
its own rules, and found: (1) the `full` form **named no marker**, since it collapses the whole
field *to* the marker — dormant here only because G9 refuses both `full` relations in this
corpus first; (2) an affix containing a double quote produced `"a"b"`, which is not merely
unparseable but **ambiguous**, and is reachable on any JSON-ish lane whose constant affix is
`"name":`. Round trip now **9/10**; the tenth is adversarial by design — affixes containing the
contract's *own grammar* — and G10 **refuses** rather than emit something readable two ways.

**Cold read, second language, no shared code.** `bench/x90/coldread.py` (CPython, `zlib.crc32`)
is given the contract line and the rewritten body and nothing else: **3/3 EXACT**, each
self-certified by CRC **from the message alone**, SHA-256 matching the originals. Its
counterpart corrupts 27 artifacts 9 ways each and the reader refuses **27/27**, every refusal
naming its cause. Against `ctxfold`'s July 2026 finding that folding *syntax* stays
model-readable while folding *data* does not, this arm is on the validated side **by
construction**: the sibling stays verbatim in the same row and the expansion is local and
single-pass, with no header table. **No model was queried** — this is a byte-exact independent
decode plus a structural argument, not a graded comprehension study.

**Prior art, honestly.** The relation is SQL's *generated* / *computed* column: "a virtual
generated column is calculated from other column values in the row, while a stored generated
column is materialized as part of the row data" — so **a stored derived column is
denormalisation and deleting it is normalisation**, which is what this arm does to a text
record set. AWS Glue states the same shape with the same operator (`success * 100 / count ||
'%'`). `stanford-star/plurel` #116 documents derived chains in dependency order with "a cycle
raises naming its columns", which validates G4's fail-closed choice and marks a limit not
crossed: ΣΥΜΦΥΊΑ **forbids** chains rather than topologically ordering them. **The mechanism
is standard in databases and absent from prompt compression; that gap is the contribution, and
the relation itself is not new.**

**Run G — the gate is unperturbed.** `bench/x86/receipts/frontier-runG.{json,log}`:
**TOTAL 12 639, exact 29/29, 0 lanes differing**, *"identical to the X80 configuration, lane
for lane"* — the seventh consecutive confirmation, and the control that matters here, because
`tagstack.ts` gained an import of `symphyia.ts` (pulling `aither.ts` and `bpe.ts` at module
scope) and any initialisation side effect would have shown up in this number.

**Not claimed.** No model was queried. The win is small and concentrated: among the **29 gate
lanes only `ls-l-real` moves**, and there ΣΥΜΦΥΊΑ is a *rival* of PROSPHYSIS, not new ground.
`dpkg-l-full`'s −1 was measured and then given up to pay for `Body first.` G9's boundary value
3 is untested. Chains are forbidden, not ordered. The contract cannot express an affix
containing its own grammar. And the 291-token raw win on `openstack` is real and worth zero.

**Record.** `src/lib/omega/symphyia.ts` (new), `src/lib/omega/tagstack.ts` (chain admission and
the `X90.` branch of `tagstackDecode`); `bench/x90/{tmpl,screen,run,ladder,fuzz,emit-coldread,_g9,_p,_o}.ts`,
`bench/x90/coldread.py`, `bench/x86/run-front-g.sh`; receipts in `bench/x90/receipts/`
(`screen.json`, `run.json`, `run-pass1.json` — preserved because it holds the openstack
measurement that set G9, `contract-ladder.{json,log}`, `fuzz.{json,log}`,
`contract-parser.log`, `coldread.log`, `coldread-damage.log`, `wires/`),
`bench/x86/receipts/frontier-runG.{json,log}`, `bench/x89/receipts/front3-runG.{json,log}`,
with the pre-X90 `front3.json` preserved as `front3-preX90.json`.
[`docs/codecs.md`](codecs.md) §X90.

## X93 — ΕΥΘΥΝΤΗΡΙΑ (εὐθυντηρία): the audit of accounts rendered

**Abbreviation resolved.** ΕΥΘΥΝΤΗΡΙΑ / *euthynteria* — in Athenian practice the public audit
every magistrate underwent at the end of his term, when he rendered his accounts
(*euthynai*) and they were straightened. The name is exact rather than decorative: this codec
audits an account this repository rendered four turns ago and finds the entry wrong.

### Design spec

| field | value |
|---|---|
| **module** | `src/lib/omega/euthynteria.ts` (new; imports nothing, so the acyclicity `workmeter.ts`'s header claims still holds) |
| **registry arm** | `euthynteria`, immediately before `timema`; 236 unique `key:` slugs |
| **family** | search allocation (HEURESIS X31, OIKONOMIA X33) |
| **wire format** | **unchanged**. No glyph, no rule class, no contract, no marker |
| **fidelity** | exact — `decoded === text` byte-for-byte, checked per lane |
| **what it changes** | `workBudgetFor` uses `euthynteriaWorkFactor`; `chironBudgetFor` uses `euthynteriaChironFactor`. Two functions where X89 had one |
| **`EUTHYNTERIA_WORK_FACTOR`** | **0.5** — X89's verified value, **unchanged** |
| **`EUTHYNTERIA_CHIRON_FACTOR`** | **0.25** — decoupled, new |
| **`EUTHYNTERIA_MAX_CHARS`** | 8 000 — inherited from X89's measured bracket (6 751 largest verified sufficient / 10 692 smallest verified insufficient), deliberately **not** re-derived |
| **measured effect** | **+0 tokens**, **0 messages differing by SHA-256**, **0 inexact**, **0 lanes worse** on 28 lanes; **×1.14** on the 7 large gated lanes, **×1.33** on 21 small and mid lanes |
| **run H (both tiers, `OMEGA_DET=1`)** | gate **12 639** exact 29/29, **0 lanes differing** from run G (8th consecutive); shipped **12 491** exact 29/29, **0 differing**, ms 1 105 795. The frontier is **exactly** the configuration named last turn |
| **GREEDY OR NOT** | **NO.** There is no search in this module at all. Two constants are selected by a bracket over an **enumerated finite set of measured configurations** — not hill-climbed, not sampled, not annealed. What the constants *configure* is greedy and documented elsewhere: ARIADNE's glyph assignment hill-climbs from a seeded start and returns best-so-far when its allowance is spent, and the chiron rule search keeps a rule only when it strictly lowers the scored message. Neither greediness is modified here |
| **SOURCE ARTICLE** | **None.** The mechanism is original to this repository and no paper is implemented by it. Cited as *family*, explicitly **not** as source: anytime algorithms returning best-so-far at budget exhaustion (Dean & Boddy 1988, the usual citation); **AnytimeReasoner** (`openreview.net/forum?id=jFaFCc5978`), which truncates a reasoning trace to a sampled token budget and optimises expected score over a *distribution* of budgets; **AnySearch** (arXiv:2609.00813, *Findings of EMNLP 2026*, 39643–39665), which trains one policy for *any* budget by injecting budget state; and the **Anytime Index** / Conditional Satisfaction Rate metric (arXiv:2601.11038). The contrast is the point: those allocate a **token length** to a **stochastic** reasoner scored by **accuracy**; this allocates an **evaluation count** to a **deterministic** lossless encoder scored by **message identity**. Neither reduction transfers, and the discovery here was made by auditing a prior turn's probe for a bug a later turn's probe had already documented — not by reading anything |
| **TIME- OR CPU-BOUND** | **CPU-bound, deliberately.** Both allowances count **work** (`workTick`, one unit per score evaluation), never milliseconds; nothing in the module reads `Date.now()`. Consequences: the same input consumes the same work on any machine, the emitted wire is machine-independent, and the reduction is reproducible across boxes. The **speedup it produces is a wall-clock measurement** and is reported as one — comparable **only within a single interleaved process**, because cross-process drift on this box is ~1.6× (which is what made runs C/D/E look like speedups). The ×1.14 and ×1.33 come from two different processes and are **never summed** |
| **verification tier** | **L1** (derivational, kernel-checkable): `tsc --noEmit` exit 0; `gate-check.ts` asserts the resolved budgets at 8 char counts across the threshold; hash identity per lane. **L2** (representational fidelity — does a reader reconstruct the source?) is **downgraded, not claimed verified**: no model was queried, and per arXiv:2608.28997 L2 is not mechanisable in principle. X93 needs no new L2 argument because it emits **byte-identical messages**, so prior cold-read receipts apply **verbatim** |

### The account being audited

X89 shipped a size-gated halving of both meters and recorded, in `workmeter.ts`, that going
further was unavailable:

> `0.25x identical message 18/29  2.34x faster overall, but 11 lanes change, several for the
> worse (psql-output 244 -> 268, ps-aux-real 1042 -> 1066, apt-real 850 -> 876, ls-l-real
> 1476 -> 1493)`

That line was the only reason the shipped factor was 0.5. Reading the receipt against the probe
that produced it: `bench/x89/budget29.ts:42-44` clears `OMEGA_WORK_BUDGET` /
`OMEGA_CHIRON_BUDGET` **only on the `mult === 1` pass**, and `workBudgetFor` returns an override
verbatim when one is set — so the third setting read the **second** setting as its base and
multiplied again. **The pass labelled `x0.25` ran at `x0.125`.** The identical bug is documented
in `bench/x89/rebalance.ts`'s own header and was fixed there but never re-checked here, because
the number had already been promoted into a shipped constant.

**The correction is corroborated by a number, not argued.** `bench/x91/order-probe.ts` at work
0.125 / chiron 0.125 returns `ps-aux-real` = **1066** — exactly the value X89 recorded under the
label `0.25x`. Two harnesses, four turns apart, agree on 1066 at 0.125. **The unsound point is
0.125×, not 0.25×.**

### Why the shipped design has two constants instead of one

Version one of this arm took the correction at face value and shipped a **single** factor 0.25,
on a 21-lane sweep where every setting was byte-identical (×1.85). `ps-aux-real.txt` was not
among those 21 lanes. Measured, it gives **1042 → 1053, +11 tokens**, still byte-exact. Version
one was withdrawn and **nothing from its receipt was carried forward**: the ×1.85 is quoted
nowhere as a result, the gate was not re-derived from it, and the acceptance test was re-run
from scratch on the **large** lanes because the sample that missed the regression had been small
ones.

`bench/x91/meter-isolate.ts` then moved the two meters independently on the breaker lane. From
work 0.25 / chiron 0.25 = 1053:

```
cut CHIRON again, 0.25 -> 0.125, work held   ->  1053   (+0)   hash unchanged
cut WORK   again, 0.25 -> 0.125, chiron held ->  1066   (+13)
```

and on `df-real` the same asymmetry shows up in the **hash** rather than the count: cutting work
changes the message (`66aed097` → `a3129b34`) at an unchanged 126 tokens, while cutting chiron
leaves the hash identical. Two lanes, two different observables, one direction.

The meters are not interchangeable. `W` bounds ARIADNE's glyph-assignment hill-climb, where a
truncation changes **which characters stand for which phrases** and therefore how many glyph
runs the tokenizer can swallow — a first-order effect on wire cost. `C` bounds the rule search
that decides the tape, whose candidate set already contains the parent's rules, so a truncation
returns best-so-far over a set that includes the answer it would have found. `C` binds at
**100 %** of its allowance on every lane in every setting measured, **including at 8× the
allowance**, with identical output: a meter that is saturated and insensitive is a meter that is
over-allocated.

X89 stated the opposite design goal in terms: the single helper existed *"so that the two call
sites below cannot drift apart, which is the property that made the X89 receipt readable as
'both meters' in the first place"*. **The coupling was the defect.** Readability of a constant is
not evidence about the two things it scales.

### Acceptance test

`bench/x91/decouple-sweep.ts`, on the large gated lanes, `OMEGA_DET=1`, `OMEGA_ENGRAM=0`,
interleaved in one process, scored on the **SHA-256 of the complete message**. The control is
the configuration X89 actually shipped (0.5 / 0.5) and it must reproduce the **committed**
frontier numbers before the candidate is allowed to report anything:

| lane | chars | control 0.5/0.5 | == committed | candidate 0.5/0.25 | Δ | hash | chiron 0.1 | speedup |
|---|---|---|---|---|---|---|---|---|
| `ps-aux-real.txt` | 6 590 | 1042 | **OK** | 1042 | +0 | same | 1042 | ×1.117 |
| `apt-real.txt` | 6 195 | 886 | **base only** † | 886 | +0 | same | 886 | ×1.105 |
| `code-ts.txt` | 6 000 | 969 | **OK** | 969 | +0 | same | 969 | ×1.209 |
| `dpkg-l.txt` | 4 459 | 673 | **OK** | 673 | +0 | same | 673 | ×1.268 |
| `json-pkg.txt` | 3 620 | 681 | **OK** | 681 | +0 | same | 681 | ×1.256 |
| `node-help.txt` | 6 751 | 862 | **OK** | 862 | +0 | same | 862 | ×1.120 |
| `kb-article.txt` | 3 385 | 622 | **OK** | 622 | +0 | same | 622 | ×1.189 |
| **total** | | **5 735** | **6/7 both tiers** | **5 735** | **+0** | **0 differing** | **5 735** | **×1.14** |

† **The control audit, and why the seventh lane is not what it looks like.** The `== committed`
column is evaluated by `bench/x91/control-audit.ts` against receipts from **different harnesses
in different turns** (`frontier-runE.json` gate, `front3-runG.json` shipped), not against the
probe's own family. `decouple-sweep.ts`'s built-in assertion printed OK on 7/7 — because its
expectation table came from `large-sweep.ts`, the same function, which makes it a tautology
rather than a control. Re-audited, the honest figure is **6/7**: `apt-real.txt` is committed at
**850** on both tiers while this probe returns **886** on both settings, because
`tagstackEncodeUncached` is `tagstackEncodeInner` (`tagstack.ts:580-582`) — the base **without**
the X73/X74 chain, worth **−36** on that lane. The probe measured the pre-chain tier there and
reproduced it exactly. **The identity claim is unaffected — 7/7 hash-identical** — and
apt-real's shipped tier is covered by run H pass 2, which calls the real shipped encoder. Rule
this turn now carries: **a control must be checked against a number the code under test did not
produce, or it is not a control.**

Plus 21 small and mid lanes at **0 differing, ×1.33** (`chiron-sweep21.json`, setting `w1c.5`,
which *is* the shipped pair). **28 lanes byte-identical between the two settings.** The 29th,
`ls-l-real` (10 692 chars), is outside the gate — asserted directly by `gate-check.ts`, not
assumed.

Note the last column: chiron at **0.1** is also +0 everywhere but **slower** (×1.12 against
×1.14). Cutting chiron past 0.25 buys nothing, so 0.25 is a stopping point and not a tuning
knob, and 0.1 is **not shipped** — 21 lanes is the same sample size that just failed to contain
the one lane that breaks.

### Why it cannot break correctness

Both meters count work, not time. `workTick` consumes one unit per score evaluation and when the
allowance is spent the search stops climbing and returns best-so-far, so a **smaller** allowance
cannot make a search explore **more**. A budget bounds the **SEARCH**, not the **VERIFICATION**:
`tagstack`'s `consider()` throws unless `candidate.decoded === text`, and every arm re-verifies
its own round trip. The failure mode of a factor set too low is **tokens, not fidelity** — which
is exactly what was observed (+11, +13, +24) and exactly why the withdrawal was a withdrawal
rather than a bug fix. Byte-exact decode held on every lane at every setting measured, including
the unsound 0.125×.

### Falsifications recorded, including this turn's own

* **uniform 0.25** — `ps-aux-real` +11. Withdrawn. *(this turn's own first candidate)*
* **`w.5c4`** (raise chiron 4× at shipped work) — X90's recorded *highest-information next test*,
  7 lanes at ×1.71 with identical messages. On 21 lanes it **changes `ps-ef.txt`'s message while
  leaving its token count at 315**. The third time this corpus has produced a wire change at an
  unchanged count (X89: `df-real`, `df-h`), and the reason every score here is a hash.
* **`w1c.25`** — fidelity-safe, **pathological on time**: 414 071 ms against 216 207 ms, ×0.52,
  because `df-real` alone took 257 463 ms at an identical wire. Safe and unusable.
* **chiron 0.1** — identical tokens, **slower**. A further cut that pays nothing.
* **three per-lane budget predictors** — work-binding fraction, chiron-binding fraction, and
  source size all fail to predict identity (§D5–D7 of `docs/codecs.md` §X93). There is **no cheap
  sound proxy**, so the honest design is two constants, an inherited size gate, and per-lane
  hash identity verified by re-running both configurations interleaved.

### The methodology result worth more than the win

Two harnesses with **identical logic** disagreed about the same lane at the same nominal setting
(1042 against 1053). Two explanations were tested before either was believed.
`bench/x91/order-probe.ts` shows that setting `OMEGA_*_BUDGET` to exactly the resolved base gives
the **same tokens and the same message hash** as clearing it (1053 / `aee19714b3b6cfe2` both
ways), and that encoding a decoy lane first changes nothing — so the override is faithful and
there is no cross-lane state leak. The real cause was a **stale bundle**: `large-sweep.mjs` was
built at **16:32:34** and `workmeter.ts` was last written at **16:33:48**. The two harnesses ran
**different factors under identical labels**, and nothing in either receipt recorded which.

Two guards follow, both now in code: every probe prints the **resolved budgets it actually ran
at**, next to the label; and `decouple-sweep.ts` carries a **`controlMatchesCommitted`**
assertion per lane, comparing the control against a committed receipt from a different harness in
a different turn. **A harness that cannot reproduce the baseline it is comparing against has no
standing to report a delta.** The instrument this repository still lacks, and should build next,
is a **build stamp in every receipt**.

The first diagnosis reached for was plausible, mechanistically specific, and **wrong**: that the
new registry arm's `heuresisEncode` call was eating the shared work epoch and starving
downstream arms. `tagstack.ts:15` settles it — of the shipped encoder, *"This is not a
registry-wide tournament"* — so a registry arm cannot change either tier. It is recorded here
because a wrong diagnosis that would have produced a confident fix is more dangerous than no
diagnosis, and because the mechanism it invoked is real (HEURESIS at `tries=8` does regress
`ls-full-iso` 373 → 374 by exactly that route).

### Native decodability, cold-read by the model this turn

The brief requires confirmation that a model can decode the wire with **no `skills.md`, no
system-prompt input box, only a basic single chat input/output**. Run three times; receipt
`bench/x91/receipts/coldread-model.log`, model outputs committed under
`bench/x91/coldread-model/`. Method: show the model only `<lane>.prompt.txt` + `<lane>.wire.txt`
(which together *are* the single chat input), have it expand the tape by hand to a fixed point,
write the answer, and only then `diff` against a source it had not read.

| lane | category | glyphs | ambiguous with Latin | result |
|---|---|---|---|---|
| `df-h.txt` | OPS TABLE | 31 | 10 (32 %) | **BYTE-IDENTICAL** |
| `meeting-transcript.txt` | **PROSE** | 6 | **0** | **BYTE-IDENTICAL** |
| `email-thread.txt` | **PROSE** | 43 | 15 (35 %) | **attempted, NOT completed** |

The two successes needed real insight, not transcription: on `df-h` that **numbers can be rule
targets** (`ч`="51" is row 2's Used *and* row 8's Use%; `т`="194" is row 14's Used *and* row
16's Avail) and that the column padding is deliberately irregular (`у`="G"+3 spaces for rows
1–6, `ы`="G"+2 spaces for rows 7–18, because Used/Avail go from two digits to three); on
`meeting-transcript` that `天` folds **period + newline + timestamp opener**, so it applies only
to lines ending in a period — exactly one line ends in `?` and uses a literal newline plus `在`.

The failure's obstacle was **measured, not guessed**: the contract says *"New Cyrillic before ¶
starts a rule"*, and 15 of that wire's 43 glyphs are Cyrillic **і у р с М х е Р Т о О Е ё а У**,
each visually identical to a Latin letter that also occurs in the body — so rule-start vs
literal text is **undecidable by shape** and must be recovered from context. Context sufficed at
32 % and failed at 35 %. Three lanes establish no threshold; they do establish that a glyph pool
sharing shapes with Latin makes the contract undecidable from the glyphs alone, which is why the
shipped stack from X87 fingerprints its alphabet and carries a CRC-32 (ΑΙΘΗΡ, ΣΥΝΤΆΞΙΣ G9)
instead of trusting a reader to notice a wrong character. **A cold read by the model that wrote
the encoder is a proxy, not independent verification** — stronger than a TypeScript round trip,
which cannot see a contract that under-describes the wire (X28 shipped that bug), but not
review, and review is unavailable here.

### Not claimed

No token win, anywhere, on any lane, at any setting. **Compression is H−.** No model was
queried, so L2 decodability is argued from hash identity with prior cold-read receipts rather
than demonstrated. The ×1.14 and ×1.33 are from different processes and are not summed. **The acceptance probe
measures the pre-chain tier**, so `apt-real`'s shipped 850 is verified by run H rather than by
`decouple-sweep.ts`; the control column's 6/7 is the honest figure and the built-in assertion's
7/7 was a tautology. Chiron
between 0.1 and 0.25 and work between 0.25 and 0.5 are **untested gaps** and are not claimed
safe. The work/chiron asymmetry is established on two lanes and is **not** generalised. The
`euthynteria` registry arm emits its parent's wire and can therefore never win a selection — it
exists so the resolved budgets appear in every receipt, and its cost is one duplicate HEURESIS
encode on the registry path, which the shipped encoder does not take.

**Record.** `src/lib/omega/euthynteria.ts` (new), `src/lib/omega/workmeter.ts` (two factors,
in-situ correction comment), `src/lib/omega/registry.ts` (the arm);
`bench/x91/{meter-isolate,decouple-sweep,control-audit,order-probe,gate-check,leaders-general,
census,chiron-sweep,large-sweep}.ts`, `bench/x86/run-front-h.sh`; receipts in `bench/x91/receipts/`
(`chiron-sweep21`, `large-sweep`, `meter-isolate`, `decouple-sweep`, `control-audit`,
`order-probe`, `gate-check`, `leaders-general`), `bench/x86/receipts/frontier-runH.{json,log}`,
`bench/x89/receipts/front3-runH.{json,log}`, `bench/x91/receipts/coldread-model.log` and the
model's own outputs `bench/x91/coldread-model/{df-h,meeting-transcript}.model.txt`.
[`docs/codecs.md`](codecs.md) §X93.

## X94 — no new abbreviation

**X94 adds nothing to this page's subject matter.** It introduces no glyph, no rule family, no
contract wording, and no arm. `src/` is untouched; the only paths changed this turn are
`.gitignore` and `bench/x94/`. It is recorded here because it corrects the formula every entry on
this page was selected with, and because an entry that changes no abbreviation still has to state
that plainly rather than be absent.

The contract this page applies to each entry, applied to the probe instead:

**Greedy or not.** Neither — the probe makes no selection. It prices **2 309 single local moves**
(600 entry removals, 1 196 body additions, 513 tape-plus-body factorings) independently against the
exact token count of the complete message, and reports each move's delta. A greedy pass over them
would be a *different* experiment and is not claimed: the per-lane best deltas sum to −4, but
moves interact (removing one entry changes what another rule is worth), so the sum is a lower bound
on one greedy pass and not a result about any encoder.

**Honest source citation.** The formula under test is this repository's own economic identity,
`(k−1)(T−1)−1`, recorded in [`docs/codecs.md`](codecs.md); it is **not** from any external paper,
and no external source is cited for it. External sources are cited only for the mechanism and the
bounds — arXiv:2611.08671 for merge-point destruction and the 0.361 greedy-BPE bound,
arXiv:1804.08547 for "introducing too many nonterminals causes the bit-size to grow",
eti.uni-siegen.de for greedy's ≥1.348 approximation ratio, arXiv:2504.00178 for the ~20 % cost of
the pre-tokenization barrier. None of those papers measured this repository's tape, and none is the
source of any number in the receipt.

**Time- or CPU-bound.** Time-bound and trivially so: the whole census over ten wires runs in about
**9 s** wall in one process, with zero frontier calls, zero encodes and no model queries — it is
`countTokensExact` over re-serialised strings. `FACTOR`'s candidate generation is the only part
with a memory hazard: the first version's O(m²) containment filter died with *"Ineffective
mark-compacts near heap limit"* at 1.9 GB, the failure this repository already records for n-gram
retention. Sorting by count first and bounding the containment scan to the kept prefix fixed it.
The probe also **executes on import** (no main guard), so importing it without arguments runs it
empty and overwrites the receipt — which happened once, and produced a plausible all-zeros file.

**What was measured.** Fidelity exact on all 2 309 moves; **9 of 10 wires reproduce their committed
lane byte for byte** under the probe's own parser (`ls-l-real` quarantined — its contract carries a
`~` infix rule the parser does not implement). Verified slack **4 tokens in 7 864 = 0.051 %**, as
five moves worth exactly one token each: REMOVE `ҽ` (`apt-real`), `м` (`dpkg-l`), `А` (`ls-real`),
`տ` (`ls-l-real`, proxy) and ADD `"Webpack"` (`llm-answer`, k=4, **T=1**).

**What it changes for every other entry on this page.** The screening formula has **530 false
positives, 0 true positives and 1 false negative** over 1 709 priced moves; its mean estimate is
+0.08 tokens against a mean measured profit of −8.31; and restricted to T≥2 its slope against the
measurement is **negative** (−1.82), so the candidates it likes best are the ones it is most wrong
about. The corrected law is `profit ≈ −0.981k − 3.11` for T=1 material (R²=0.869): **a new rule
costs ~3.1 tokens fixed and each reference site ~1.0 token net**, because a new reference severs
BPE merges that the literal text enjoyed on both sides. The 1-token-per-reference figure these
pages have quoted is the **average** price of the references a shipped tape already contains, which
cluster into runs; the **marginal** price of adding one is 1–2 tokens higher per site.

**Why nothing new can be added.** 84.5 % of the remaining repeated material in ten shipped wires is
1–2 tokens and 98.1 % is ≤3; break-even under the corrected law needs T≥9.51 at k=2, T≥5.30 at k=4,
T≥3.90 at k=10; at T≥3 (265 moves) the best measured profit is **0**. The corrected screen prunes
**100 % of the 1 709 candidates**. This page is complete on the dictionary side not by estimate but
by census.

**Not claimed.** Global optimality (these are single-move marginals, not a search over rule sets).
Coverage of `ls-l-real`. FACTOR coverage of non-ASCII spans — 161 candidates were skipped by the
purity filter, because the glyph pool is non-ASCII and a non-ASCII span cannot be distinguished
from a rule. Any improvement to any wire: the four verified tokens were **deliberately not
shipped**, since realising them would change three wires' SHA-256 and invalidate an 8×-confirmed
gate total and a 2×-confirmed shipped total, costing both frontier passes (613 s + 1 106 s) plus
fuzz, cold reads and the anamnesis suite to buy 0.051 %.

[`docs/codecs.md`](codecs.md) §X94.

---

## X95 ἈΝΑΚΛΗΣΙΣ

**ἈΝΑΚΛΗΣΙΣ** (*anaklēsis*, "a calling-back, a revocation") — the ARIADNE glyph-assignment
hill-climb's treatment of a candidate it rejects. The probe used to *copy* the whole assignment,
*rebuild a set of every glyph* to re-verify the no-duplicate invariant, and then *re-scan every
slot* to discover which ones had moved; the candidate is now applied in place to a reused buffer,
revoked on rejection by walking a change log backwards, with the invariant maintained incrementally
as a glyph multiset and the changed slots handed straight to the scorer.

- **Greedy or not:** **neither — it is not a search at all.** ἈΝΑΚΛΗΣΙΣ is a deterministic
  mechanical transformation of the probe loop. It makes no choice the original loop did not make:
  the RNG call order, the acceptance test `total <= bestRun`, the commit-on-accept rule and the
  branch-and-bound bound are all preserved bit-for-bit. It is therefore *not* greedy local search,
  and it is *not* an approximation — it is the same computation with the redundant work removed.
  (For contrast: ΣΥΝΤΆΞΙΣ, the last codec implemented before this one, **is** greedy local search.)
- **Source article citation:** **none, and this is stated rather than dressed up.** ἈΝΑΚΛΗΣΙΣ is
  original engineering derived from a V8 `--cpu-prof` sampling profile of *this repository's own hot
  loop*. No paper, preprint or prior art is claimed for it, and none was found: the mechanism is a
  property of where this particular search spends its time, not of a published algorithm. The
  external literature surveyed in §X94 (grammar compression, BPE merge utility, per-lab proof
  releases) informed what *not* to retry; it did not supply this mechanism.
- **Time- or CPU-bound:** **CPU-bound, measured; wall-clock-neutral, measured.** Under
  `node --cpu-prof` on `bench/holdout-x40/metrics.tsv`, three runs of the unpatched build and four
  of the patched build give a median of **15 060 → 14 677 samples, a 2.5 % reduction in CPU time**
  (×1.026), with the collector's share falling 5.6 % → 4.1 %. **End-to-end wall clock across the 29
  frontier lanes moved by less than this machine's noise band (±25 % per lane, ~1.6× cross-process
  drift) and is explicitly not claimed.** An earlier revision measured −1.4 % (a small *loss*)
  before the per-pattern tuple allocation was removed; that number is published because it is why
  the allocation was worth removing.
- **Fidelity:** byte-perfect and exact-lossless by construction and by measurement — **29 of 29
  frontier lanes emit a bit-identical message**, 12 491 tokens before and after, `exact` on all 29.
  The message is unchanged, so it remains directly model-readable with no skills file and no system
  prompt, exactly as before.
- **What it is not:** not a compression codec. It is token-neutral on every lane and is not
  presented as a token win.

### The eleven measured closures (not codecs — measurements)

These are recorded here because they are what decided the direction of X95. Each priced the
**complete** message exactly, with zero frontier calls. All eleven are negative.

1. **Second-level glyph-run rules** — 0 of 238 profitable, net delta 0 (`runmerge`).
2. **Vocabulary glyph-merge relabelling** — incumbent 0.9078 tok/glyph vs the vocabulary's optimum
   0.9681 ⇒ headroom **−17** (`vocab-merge`).
3. **Bridge-token glyph choice** — difference **0.000** in all 14 contexts; the shipped Cyrillic
   pool already *is* the best-bridging set (`vocab-bridge`).
4. **Space-in-front-of-run absorption** — 36 of 1 414 runs are space-preceded and all 36 already
   merge ⇒ 0 (`space-bridge-headroom`).
5. **Boundary severance** — total **−38** over 1 414 runs, already net-beneficial; the vocabulary
   contains **zero** digit↔non-ASCII bridge tokens, so that class is closed by the tokenizer
   (`boundary-census`).
6. **Better glyph per tape entry** — upper bound **44** tokens over 600 entries, 0.56 %
   (`tape-glyph-headroom`).
7. **Run-coalescence by absorbing a single-occurrence span** — **0 wins in 1 160**, sum +2 100
   (`span-absorb`).
8. **Tape field separator** — space before +208, space after +363, newline +592; all cost
   (`tape-sep`).
9. **Repeated long runs as meta-rules** — **no run of length ≥ 5 repeats at all**; the 471 extra
   occurrences are 431 at length 1 and 51 at length 2 at multiplicity ≈ 2.
10. **Shared prefixes in the tape's values** — **0 wins in 45** (`tape-prefix`).
11. **Shared suffixes in the tape's values** — **0 wins in 116** (`tape-suffix`).
12. **Front coding the tape's value column** — sort the entries and store each shared-prefix *length*
    as one digit instead of the prefix. Measured **+210 tokens, worse on all ten lanes**: only 236 of
    600 values are glyph-free and therefore sortable, the other 364 contain rule references and are
    pinned by the positional constraint (`frontcode`, `frontcode-exact`).

The value population they close over is the weakest block in the message: **4 323 characters costing
1 671 tokens, 2.59 ch/tok**, against a 3.0 ch/tok digit ceiling and a ~4.3 ch/tok English ceiling
(`tape-values`). It is weak *because* it is the rare content, and the eleven closures say there is no
readable way to make it cheaper.

### Generalized local leaders, by category

Re-measured on the current stack (`bench/x91/leaders-general.mjs`; a leader is the lane with the
lowest `shipped/raw` ratio in its category, a violation is `floor/shipped >= 1.00`):

| Category | Lanes | Raw → shipped | Ratio | Local leader | Weakest lane |
|---|---|---|---|---|---|
| **DATA** | 2 | 1 095 → 234 | 0.214 | `holdout-x40/cue-sheet.md` 513 → 101 (0.197) | — |
| **OPS LIST** | 13 | 30 065 → 9 494 | 0.316 | `holdout-ops/openstack-loghub-26.log` 4 028 → 896 (0.222) | `holdout-x42/dpkg-l.txt` 0.673 |
| **OPS TABLE** | 11 | 4 135 → 1 726 | 0.417 | `holdout-x40/metrics.tsv` 811 → 210 (0.259) | — |
| **OTHER** | 1 | 4 277 → 2 262 | 0.529 | — | — |
| **CODE** | 3 | 3 152 → 2 069 | 0.656 | `holdout/json-pkg.txt` 1 152 → 681 (0.591) | — |
| **PROSE** | 4 | 3 117 → 2 646 | 0.849 | `holdout-work/email-thread.txt` 629 → 488 (0.776) | `kb-article` 0.948 |
| **ALL** | 34 | 45 841 → 18 431 | 0.402 | floor 14 911 (0.809) | — |

**Headroom against the blind-compressor floor: OPS TABLE 26 %, OPS LIST 23 %, CODE 16.5 %,
DATA 10.7 %, PROSE 4.4 %.** The money is in ops; prose is nearly exhausted. The readability-price
law holds on 32 of 34 lanes; the two violations are `lsblk` 1.017 and `free-m` 1.000.

[`docs/codecs.md`](codecs.md) §X95.

---

## X96 ἸΣΟΜΟΡΦΊΑ

**ἸΣΟΜΟΡΦΊΑ** (*isomorphía*, "equality of form") — the relabelling of a CHIRON wire's glyph tape.
The wire language declares its alphabet implicitly ("the first letter of the tape declares which
script the wire uses, so nothing about the alphabet is transmitted", `chiron.ts`), and a rule is
"one *new* letter of a declared one-token script followed by its text". **Nothing says which letter
a rule gets.** That map is a free parameter of every wire the stack emits, it is billed, and — this
is the part the stack had not used — so is the **order** of the rules in the tape, constrained only
by "rules only ever reference rules defined earlier".

ἸΣΟΜΟΡΦΊΑ takes the incumbent's complete message and re-climbs both against the token cost of the
**complete** message. It touches nothing else: not the contract, not the rule set, not the body
text, not the separators, not the operators.

- **Greedy or not:** **greedy local search (stochastic hill-climb) — and this is stated plainly.**
  Two move types, both isomorphisms of the wire language:
  - **REORDER** — swap two rules that are adjacent in the tape, legal exactly when the later one
    does not reference the earlier one (`dep[j][i]` false). ARIADNE's four move types (n-gram,
    hot-pair, random-single, random-swap) all *preserve rule order*, so **no sequence of them can
    reach a different order at all**. This is the move the shipped search structurally cannot make.
  - **REASSIGN** — move one rule onto an unused one-token letter of the same script.
  Acceptance is "strictly smaller on a complete, decoded, byte-exact message measured in this
  process", the same admission rule as PROSPHYSIS / ΣΥΜΦΥΊΑ / STOICHEION. The climb is seeded and
  bounded, so the emitted wire is a pure function of the input.
- **Source article citation:** **none for the mechanism; two honest imported results frame it.**
  No paper was found that relabels or reorders a delimiter-free grammar tape against a live
  tokenizer, and none is claimed. The two external results that *do* apply and are cited in
  `docs/codecs.md` §X96 are:
  - **PathPiece** (ACL Anthology 2024.emnlp-main.40, *Tokenization Is More Than Compression*): "In
    order to design an optimal vocabulary V, it is first necessary to know how the vocabulary will
    be used to tokenize. There can be no best vocabulary in the abstract." — the formal reason the
    script/assignment cannot be chosen once and for all.
  - **The Functionalizer** (arXiv:2609.15991, 2026): reversible opcode/operand factoring of
    orthographic variation before tokenization. Cited as the closest published neighbour and as the
    reason the *derived-rule* variant was priced and refused here.
- **Time- or CPU-bound:** **CPU-bound, measured.** Every probe is one string build plus one
  `countTokens` of the complete message. The probe cap scales inversely with message length
  (`4 000 000 / msg.length`, floored at 40, capped at the iteration budget) and there is a hard
  40 M-character ceiling, so the pass is bounded and deterministic. It **adds** work to the chain;
  the measured CPU cost and the measured token gain are both reported in `docs/codecs.md` §X96
  rather than being traded off silently.
- **Fidelity:** byte-perfect and exact-lossless **by proof, then verified against the repository's
  own decoder.** A bijection of the declared script's letters keeps keys distinct (so
  `chironParseTape` still returns one rule per key), keeps the first letter inside the same script
  (so `scriptOf` resolves the same alphabet), and keeps every reference pointing at a strictly
  earlier rule (so `chironDecode`'s forward-reference guard still passes). Expansion composes with
  relabelling, so the decoded string is byte-identical. The pass nevertheless re-decodes through
  `chironDecode` and refuses to emit anything that does not reproduce the source exactly. One lane
  (`ls-l-real`) carries an extra contract clause that `chironDecode` does not implement; it is
  **quarantined**, not silently counted.
- **What it is not:** not a rewrite of the text (every other X74 candidate re-encodes the source),
  and not a large win. It is a small, exact, general gain from a degree of freedom the stack had
  never searched. The measured negatives that bound it — the assignment being a local optimum, the
  script not being a free lever, and CHIRON itself losing to the gate by 21 % — are all in
  `docs/codecs.md` §X96.

### The X96 measured closures

| # | Lever | Receipt | Result |
|---|---|---|---|
| 13 | Whole-message vs body-runs assignment objective | `bench/x96/receipts/wholeobj.json` | **0** over 8 seeds × 10 wires — the incumbent letter map is already a local optimum of the objective we are billed on |
| 14 | Script co-optimisation from scratch | `bench/x96/receipts/wholeobj.json` (sweep) | **+374 (+4.76 %) worse** — the incumbent's *assignment* is worth far more than the script |
| 15 | CHIRON itself as a frontier candidate | `bench/x96/receipts/chiron29.json` | **+2 670 (+21.1 %) vs the gate**, 0 of 29 lanes; `×`/`…` emitted 0 times |
| 16 | Tape reordering under the reference DAG | `bench/x96/receipts/reorder.json` | **−11 (−0.14 %)**, 6 of 10 lanes, saturating at 4 000 *and* 20 000 iterations |
| 17 | Joint (order, assignment) climb | `bench/x96/receipts/joint.json` | **−9 median** (−11 best, −7 worst) over 3 seeds — the reorder move is the entire gain |

[`docs/codecs.md`](codecs.md) §X96.

---

## §X96 — ἸΣΟΜΟΡΦΊΑ (`src/lib/omega/isomorphia.ts`)

**Name.** ἸΣΟΜΟΡΦΊΑ, *isomorphía* — "equality of form". The message's *form* is changed while its
*meaning* is not.

**Is it greedy?** **Yes, explicitly — it is a seeded stochastic hill-climb with a fixed deterministic
budget.** It takes the incumbent's message as it stands and repeatedly applies the first improving move
it can find, never backtracking and never considering the joint optimum. Its two move types are:

1. **REORDER** — swap two rules that are adjacent in the tape, when the later does not reference the
   earlier (i.e. the swap respects the reference DAG). This is the move that pays.
2. **REASSIGN** — change one rule's letter to a different unused one-token letter of the same declared
   script. Priced at 0 gain; retained at 40 % of the move mix.

Move mix 60 % reorder / 40 % reassign; the RNG is seeded; the budget is a pure function of the message
length plus a patience term; there is no wall-clock term anywhere.

**Source article.** **There is none — the mechanism is original engineering of this repository, not a
published algorithm.** This is stated plainly because the honesty rule requires it. The two published
papers that frame it are:
- **PathPiece** (ACL Anthology `2024.emnlp-main.40`, *Tokenization Is More Than Compression*) — the
  reason a code assignment can only be optimal *relative to* the tokenizer that prices it.
- **Frequency-Ordered Tokenization** (arXiv:2602.22958, v1 Feb 2026 / v2 Oct 2026, Kalcher) — the first
  published demonstration that *renumbering a code assignment* is a compression lever independent of
  the code set, and that it can improve ratio and speed together.

ἸΣΟΜΟΡΦΊΑ is not either of those: they renumber integers for varint width and LZ; ἸΣΟΜΟΡΦΊΑ reorders and
relabels the *rules of a grammar tape* priced by a live tokenizer. **The Functionalizer**
(arXiv:2609.15991) is the closest published neighbour and its specific mechanism was priced and
refused — see the closures table.

**Speed, honestly.** NOT a speed win. Interleaved single-process A/B
(`bench/x96/receipts/isoab.json`, `OMEGA_DET=1 OMEGA_NO_MEMO=1`, 3 arms × 3 reps, medians):
`apt-real.txt` 850 → 846 in 85.6 s → 78.5 s; `code-ts.txt` 969 → 968 in 2.15 s → 3.29 s;
`ls-real.txt` 433 → 433 (SHA untouched) in 0.43 s → 0.71 s. The large lane's −8.4 % is inside this
box's ±25 % drift band and is reported as a CPU-time change, not a speedup; the two lanes where the
pass finds nothing cost +53 % and +62 % in absolute terms. **The pass trades CPU for tokens.**
Also measured: an A/B run without `OMEGA_DET=1` reports bases 11–17 tokens worse than the committed
receipts, because `clock.ts` freezes `now()` at 0 under the flag and every wall-clock budget in the
chain fires for real without it.

**Time- or CPU-bound?** **CPU-bound, and deliberately so.** Every candidate is priced with
`countTokens` on the complete message, and the budget is derived from the message length rather than a
clock, so the pass is reproducible bit-for-bit. `OMEGA_ISO_ITERS` overrides the probe count; `OMEGA_NO_ISO=1`
skips the pass for an honest interleaved A/B.

**Fidelity.** Two independent mechanisms. (1) A proof: a bijection on the letters plus a topological
permutation of the rules keeps keys distinct, keeps the first letter in the same declared script, keeps
every reference pointing strictly backwards, and composes with substitution, so the decoded string is
byte-identical. (2) A gate: every candidate is re-decoded with `chironDecode` and discarded if it does
not reproduce the source. **Not** a check against this pass's own notion of the format.

**Measured result (RUN K + `iso29`, `OMEGA_DET=1`, 29 lanes).** Shipped tier 12 491 → **12 478**
(−13, −0.104 %); gate unchanged at 12 639; `exact 29/29`; 9 lanes improved, 0 worse. Improved:
`apt-real.txt` −4, `llm-answer.md` −2, `unified-diff.patch` −1, `df-real.txt` −1, `df-h.txt` −1,
`ps-ef.txt` −1, `json-pkg.txt` −1, `code-ts.txt` −1, `dpkg-l.txt` −1.

**Quarantine.** `ls-l-real.txt` carries an extra contract clause (`After ~, a number has . before its
last 1,1 digits`) that `chironDecode` does not implement, so no relabelling of it can be verified by the
real decoder. Reported as a quarantine, not as a pass and not as a fidelity failure.

### X96 closures (measured, all exact, all on the complete message)

| # | Lever | Receipt | Result |
|---|---|---|---|
| 13 | Whole-message glyph REASSIGNMENT climb (8 seeds × 10 wires) | `seeds.json` | **0** on every lane, every seed; `min=med=max=0`, `improved 0/80` |
| 14 | Script / alphabet co-optimisation (8 scripts, same 500-probe climb) | `wholeobj.json` | **+374 (+4.756 %) WORSE** |
| 15 | `chironEncode` as a frontier candidate (29 lanes) | `chiron29.json` | **+2 670 (+21.1 %) vs gate**, 0 lanes better, `×`/`…` emitted 0 times |
| 16 | Derived rule (`β = OP(α)`), Functionalizer-style | priced against X94's T=1 law | loses: opcode glyph + reference > suffix literal |
| 17 | Tape REORDERING under the reference DAG (adjacent swaps) | `reorder.json` | **−11 (−0.140 %)**, saturating at 400 and 20 000 iterations ⇒ −11 is the ceiling |
| 18 | `OMEGA_DET` omitted from an A/B arm | `isoab.json` (rev. 1, discarded) | bases 11–17 tokens worse than committed; **the flag is load-bearing, not cosmetic** |

---

## §X97 — ΜΕΤΑΤΑΞΙΣ (`src/lib/omega/metataxis.ts`)

**Name.** ΜΕΤΑΤΑΞΙΣ, *metataxis* — "rearrangement". The tape's entries are rearranged; nothing else changes.

**Is it greedy?** **Yes — a seeded, stochastic, first-improvement hill-climb with a fixed deterministic probe budget.** It never backtracks and never considers the joint optimum. It has exactly **one** move type:

**RELOCATE** — take the rule at tape position `a` and re-insert it at position `p`, for **any** `p ≠ a, a+1` (not merely an adjacent transposition). Legal exactly when every rule it references still precedes it and every rule referencing it still follows it, i.e. the move respects the reference DAG.

**Source article.** **None for the mechanism — original engineering of this repository.** The framing is imported and only the framing:
- **ACL 2025, `2025.acl-long.1365`, "Tokenisation is NP-Complete"** — distinguishes *direct* from *bottom-up* tokenisation, and states that an SLP "must find the minimum number of merges (or rules) to fully compress a string into a single symbol" whereas a tokeniser "must maximally compress the string given a fixed number of merges", and that non-CNF SLPs "are closely linked to direct tokenisation … a direct tokeniser could be converted into an SLP with depth two". That is exactly this wire's shape: the tape is the rule set and the body is the start rule.
- **Optimal Linear Arrangement** — the problem ΜΕΤΑΤΑΞΙΣ instantiates. Imported results, with the hypotheses actually needed:
  - *arXiv:2502.10909* (Feb 2025), "Exponential-Time Approximation (Schemes) for Vertex-Ordering Problems": OLA input is a graph and the task is "find an ordering π of V minimizing Σᵢ₌₁ⁿ⁻¹ |cut_πⁱ|"; OLA is solvable in O*(2ⁿ) and the best polynomial-time factor is O(√(log n) log log n); the paper gives a (1.5+ε)-approximation for undirected OLA and (2+ε) for directed OLA in O*((2−δ)ⁿ).
  - *Bienkowski & Even, STACS 2024, LIPIcs 289:15*: dynamic minimum linear arrangement gets a deterministic O(log n log log n)-approximation, improving Olver et al.'s randomized O(log²n), via a spreading-metric LP on a time-expanded graph, a tree decomposition, and conversion to permutations.
  - *Leighton, "Multicommodity Max-Flow Min-Cut Theorems…"* (§3.8): minimum cut linear arrangement has an O(log²n) approximation by recursively finding a balanced cut and placing one side entirely before the other — the template for a divide-and-conquer ordering.
  - *ICALP 2026, LIPIcs 374:4*: MLOP with a submodular objective generalises OLA ("MLOP captures Minimum Linear Arrangement as a special case with a symmetric submodular f that is the cut function of G") and admits an O(√(n/ln n)) approximation.

  **Honest scope limit on the import:** ΜΕΤΑΤΑΞΙΣ's cost is *not* the classical cut function. It is the token count of a delimiter-free serialisation under a fixed tokenizer, where consecutive entries may or may not fuse. The imported results therefore supply the **problem's shape and the algorithmic template** — ordering under a boundary cost — and **no approximation bound transfers**. Nothing in this turn is claimed as a consequence of them.

**Time- or CPU-bound?** **CPU-bound, deliberately and reproducibly.** The budget is a pure function of the message length, there is no wall-clock term, and every candidate is priced with `countTokens` on the complete message. `countTokens` is the repository's standard metric and is asserted equal to `countTokensExact` by `verifyChunkAlgebra`; measured equal on all ten committed messages (`bench/x97/receipts/eq.log`). It is also chunk-cached, and a relocation leaves the body byte-identical, so the body's chunks are cache hits — which is why tens of thousands of probes per lane are affordable.

**This pass needs NO letter pool**, because it never changes a letter. ἸΣΟΜΟΡΦΊΑ builds the incumbent script's full one-token pool before its first probe (20 742 `countTokensExact` calls for a CJK tape); ΜΕΤΑΤΑΞΙΣ builds nothing.

**Fidelity.** A relocation is a permutation of the tape's entries, so the rule→letter map is untouched: keys stay distinct, the first letter still declares the same script, and the DAG check keeps every reference pointing at a strictly earlier rule, so `chironDecode`'s forward-reference guard still passes and expansion terminates. Expansion composes with the permutation, so the decoded string is byte-identical. **This is a proof**, and the pass re-decodes every candidate through `chironDecode` anyway.

**Measured result (RUN L, `OMEGA_DET=1`, 29 lanes).** Gate **unchanged at 12 639**, "FRONTIER CONFIRMED: identical to the X80 configuration, lane for lane", lanes differing 0. Shipped tier **12 478 → 12 396 (−82)**, exact 29/29. On the ten authoritative wires (`bench/x97/receipts/meta10.json`): **7 864 → 7 816 = −48**, where ἸΣΟΜΟΡΦΊΑ's adjacent-swap move measured −11 — a **4.4×** larger gain, and 9 of 9 decode-verifiable lanes improved. `ls-l-real.txt` is **quarantined** (its extra contract clause is not implemented by `chironDecode`), so ΜΕΤΑΤΑΞΙΣ correctly emits nothing for it.

**Model-readability.** ΜΕΤΑΤΑΞΙΣ changes only the ORDER of the tape's entries. The contract is byte-identical, the operator set is unchanged, and every rule is the same string under the same letter — so the wire language is untouched and the decoding burden is unchanged. **The claim is downgraded, not declared verified:** no model API is available in this environment, so LLM decodability is NOT tested here. What is bound to evidence is (a) `chironDecode` round-trips on every emitted message, (b) the wire language is provably unchanged, and (c) external work shows LLMs can decode dictionary/meta-token representations without fine-tuning — arXiv:2604.13066 (in-context key learning, lossless dictionary encoding, exact match > 0.99) and arXiv:2606.19857 (BabelTele: "Universality: any LLM should fully understand compressed output without a codebook"). The second is the closer analogue to this stack and the stronger external support for the in-band-contract design.

### X97 closures (measured, all exact, all on the complete message)

| # | Lever | Receipt | Result |
|---|---|---|---|
| 19 | Unicode canonical normalisation as a representation lever (NFC/NFD) | `census.json` | **all 29 lanes are pure ASCII and already NFC** ⇒ 0 headroom, measured not assumed |
| 20 | RUN PACKING by **joint** multi-letter relabelling (ἉΡΜΟΓΉ probe) | `harmogi.json` | **0 over 1 200 whole-message-priced probes**; capacity is NOT the constraint (cyrillic 823 two-char / 1 896 three-char single tokens vs demand 195 / 135, `capacity.json`) — the assignment's coupling is |
| 21 | RUN FUSION — add one rule whose value is a repeated reference run | `moves.json` | **0**, on all ten wires; re-confirms X94's ADD closure against a population it may not have covered |
| 22 | `OMEGA_DET` omitted from an A/B arm | `ab.json` rev. 1 (X96, discarded) | bases 11–17 tokens worse than committed; the flag is load-bearing, not cosmetic |
| 23 | Measured run-packing headroom (the number the mechanism was chasing) | `runpack2.json` | already packed **1 051**, headroom **757** (718 capacity-feasible) — **57.1 % of the body is reference tokens** |

---

## §X99 — ΣΥΝΔΥΑΣΜΟΣ (`src/lib/omega/syndyasmos.ts`)

**Name.** ΣΥΝΔΥΑΣΜΟΣ, *syndyasmos* — "combination". It combines two tape transformations.

**Is it greedy?** **Yes, doubly: a seeded stochastic first-improvement climb (ΜΕΤΑΤΑΞΙΣ's
arbitrary-rank relocation) alternated with a deterministic greedy first-improvement sweep
(ΠΡΟΟΙΜΙΟΝ's value re-spelling), for `SYNDYASMOS_ROUNDS = 4` rounds.** Neither backtracks; neither
considers the joint optimum. Two move types:

* **RELOCATE** — take the rule at tape position `a` and re-insert it at any position `p ≠ a, a+1`,
  legal exactly when the reference DAG still holds. (Inherited from ΜΕΤΑΤΑΞΙΣ.)
* **RESPELL** — replace a rule's value with any interleaving of literal runs and references to
  **strictly earlier** rules, admitted only when the complete message gets strictly cheaper.

**Why the two belong together.** `glossa.json` counts the tapes' boundaries: 589 ASCII→script,
600 script→ASCII, 846 script→script. The vocabulary supplies 2-char tokens for the first and third
(polyglot 596 / 3 417, cjk 568 / 2 408, cyrillic 161 / 823) and **essentially none for the second**
(0 for every script but CJK's 1). So a value that begins with an ASCII character has a boundary that
*cannot* fuse, and one that begins with a reference letter has a boundary with 823–3 417 tokens
available. Relocation decides which rules are neighbours; re-spelling decides whether the boundary is
fusable at all. A factor must precede its user, so relocation *enables* re-spellings that were
previously illegal — which is why neither half prices the whole.

**Source article.** **None for the mechanism — original engineering of this repository.** Imported,
and only as framing: ACL 2025 `2025.acl-long.1365` ("Tokenisation is NP-Complete"; the
direct/bottom-up split; non-CNF SLPs and depth two); arXiv:2602.22958 (Frequency-Ordered
Tokenization — renumbering a code assignment is a lever independent of the code set); Optimal Linear
Arrangement (arXiv:2502.10909; Leighton; Bienkowski & Even STACS 2024; Abboud & Schwartz ICALP 2026)
— **with the honest scope limit that this codec's cost is a tokenizer-defined boundary cost, not a
cut function, so no imported approximation bound transfers.**

**Time- or CPU-bound?** **CPU-bound, deliberately and reproducibly.** Both budgets are pure functions
of the message length; there is no wall-clock term; every candidate is priced with `countTokens` on
the complete message and re-decoded through `chironDecode`. `countTokens` is asserted equal to
`countTokensExact` on all ten committed messages (`bench/x97/receipts/eq.log`), and a re-spelling
leaves the body byte-identical, so the body's chunks are cache hits. **No letter pool is needed**,
because no letter ever changes.

**Fidelity.** Relocation is a permutation of the entries with the DAG intact; re-spelling replaces a
value's text with a concatenation that expands to the same string. Expansion therefore composes with
both, so the decode is byte-identical **by construction** — and every admitted candidate is
re-decoded anyway. `ls-l-real`'s extra contract clause is not implemented by `chironDecode`, so the
codec **refuses** that lane rather than emit an unverifiable wire; it is reported as a quarantine.

**Measured.** Ten authoritative wires, incumbent = the committed wire (`bench/x99/receipts/synd10.json`):
**7 864 → 7 800 = −64**, against ΜΕΤΑΤΑΞΙΣ's −48 and ἸΣΟΜΟΡΦΪΑ's −11 on the same wires.
`bench/x97/receipts/syndyasmos.json`: ΜΕΤΑΤΑΞΙΣ −48, ΠΡΟΟΙΜΙΟΝ −27, combined **−76**, all arms
`chironDecode`-exact 9/9 (the tenth is the quarantine). The 29-lane load-controlled A/B is
`bench/x99/receipts/ab99.json`.

**Model-readability.** The contract is byte-identical, the operator set is unchanged, every rule is
the same string under the same letter, and the decode rule is unchanged — so a reader who could
expand the incumbent can expand this by the same rule. **Downgraded, not declared verified:** no
model API exists in this environment, so LLM decodability was not tested here. External support for
the in-band-dictionary design: arXiv:2604.13066 (in-context dictionary learning, exact match > 0.99)
and arXiv:2606.19857 (BabelTele, "Universality: any LLM should fully understand compressed output
without a codebook").

### X99 closures (measured, all exact, all on the complete message)

| # | Lever | Receipt | Result |
|---|---|---|---|
| 25 | **ΑΝΑΠΑΡΑΓΩΓΗ** — re-spell a value as a *complete* decomposition into earlier rules | `anaparagoge.json` | **−1**, and the one acceptance is on the quarantined lane with `exact=false`. Only **30** candidate decompositions exist across all ten wires |
| 26 | **ΚΑΤΑΛΥΤΗΣ** — add a single-character catalyst rule so any value can begin with a reference | `katalytes.json` | **0 over 1 536 whole-message prices**: a catalyst costs 2 tokens to save at most 1 |
| 27 | **ΑΝΤΙΣΤΟΙΧΊΑ** — transliterate costly ASCII bigrams onto non-ASCII 2-char tokens | `antistoichia2.json` | **31** adjacent single-ASCII-char token pairs across all ten wires (not 1 659 — the first bound was wrong by **53×**); pooled net **1** at 2 tok/entry, **0** at 3. Supply is 8 789; demand is not |
| 28 | **Script choice** as a free parameter (ΧΕΙΡΟΝ declares it by the first letter's range) | `glossa.json` | priced, and the asymmetry it exposes is what ΠΡΟΟΙΜΙΟΝ exploits: script→ASCII has **0** vocabulary tokens, script→script has 823 (cyrillic) / 3 417 (polyglot) |

---

## §X100 — ΓΕΝΝΑΔΑΣ (gennadas, "the native, the indigenous one")

**Mechanism (one sentence).** A wire-level codec must preserve the object its *parent actually
produced*, not the source — and on a lane whose parent is a text-transform codec those differ, so
gating on the source makes the lane's search unsatisfiable and it is silently never run.

**Why this is a mechanism and not a bug fix.** The incumbent's invariant is `decoded === text` with
`text` the source. That is right for a codec that re-encodes the source and wrong for one that edits
a wire the source has already been compiled into. Measured this turn (`bench/x100/lsl2.ts`,
`receipts/lsl2.json`): `chironDecode` of the committed `ls-l-real` wire gives **10 621 bytes against a
10 692-byte source**, while `chironEncode` of the source *alone* is **1 768 tokens and exact** — i.e.
CHIRON *without* ΟΥΡΑ, which is not what the chain produces. The wire is a **CHIRON+ΟΥΡΑ
composition**: ΟΥΡΑ (X38) collapses `1.0.0` to a `~`-marked `100` before CHIRON mines the tape, and
`chiron.ts` has no `~` handling at all (grep: zero hits). So expanding the wire yields ΟΥΡΑ's output
and ΟΥΡΑ's inverse is still owed. `ls-l-real` is the largest of the ten authoritative lanes (1 476 tok,
18.8 % of 7 864) and ἸΣΟΜΟΡΦΪΑ, ΜΕΤΑΤΑΞΙΣ and ΣΥΝΔΥΑΣΜΟΣ have all been declining it for three turns
— not because the search failed, but because it was never admitted. This is the same error class as
the L2 failure in the 2026 frontier-lab proof surveys (Lean code that did not match the English proof
it was meant to verify): **a verifier that checks the wrong object passes vacuously.**

**The second mechanism — RELOCATE-TO-ENABLE.** ΣΥΝΔΥΑΣΜΟΣ re-spells a value using factors that are
*strictly earlier* rules, and alternates that with ΜΕΤΑΤΑΞΙΣ's relocation — but it never asks whether
there is a rule *j* sitting *after* rule *i* whose value is already a perfect prefix or suffix of
`value(i)`, a factor that would be ideal if only it were legal. Relocating *j* to immediately before
*i* makes it legal, and the re-spelling it enables converts a dead **script→ASCII** boundary into a
live **script→script** one — the asymmetry `glossa.json` measured: **0** vocabulary tokens of the
S→A shape against **823** (cyrillic) and **3 417** (polyglot) of the S→S shape. ΜΕΤΑΤΑΞΙΣ relocates
for one objective (boundary fusion) and has no notion that a relocation could *enable* a re-spelling.

**Greedy?** **Yes.** Every candidate is priced on the whole message and the first strictly-improving
one is kept; no beam, no backtracking, no claim about the joint optimum. The relocate-to-enable arm
enumerates all legal (i, j) pairs — O(n²) in the rule count, capped at 4 000 — and is the dominant
cost. A **CPU guard** skips the ΣΥΝΔΥΑΣΜΟΣ arm on a lane where the reference *is* the source and the
new move changed nothing, because ΣΥΝΔΥΑΣΜΟΣ is deterministic and seeded and has already converged on
that exact tape with that exact reference. The guard is checked, not assumed: output is identical with
and without it (`gennadaschain.json`).

**Time- or CPU-bound?** **CPU-bound**, and it is the expensive kind: the arm re-runs ΣΥΝΔΥΑΣΜΟΣ,
which re-runs ΜΕΤΑΤΑΞΙΣ's whole deterministic climb. The guard above is what keeps it affordable on
the nine lanes where it has nothing new to see.

**Source article.** None for the mechanism; original engineering of this repository. The framing is
imported: **Kipf et al., "Waiting to Decompress: The Economics of LLM-Based Compression", VLDB CIDR
2026** — losslessness requires that "the model, tokenizer, vocabulary mask, context policy, and
arithmetic-coding parameters are identical between compression and decompression"; the stack's
analogue of that identity condition is the fidelity gate, and this codec repairs *which object* the
gate compares against. And **Grünwald / Li–Vitanyi** two-part MDL: a codec that refuses to look at the
data it was handed is not minimising L(model)+L(data|model); it is minimising nothing.

**Fidelity.** ΓΕΝΝΑΔΑΣ re-decodes the exact string it emits through `chironDecode` and compares
against `chironDecode(incumbent.message)`. Admission in `tagstack.ts` repeats that comparison with the
repository's own decoder on both strings, so nothing is admitted unless the incumbent's **CHIRON-layer
expansion** is reproduced byte for byte. Because every layer above ΧΕΙΡΟΝ is a deterministic function
of that expansion, preserving it preserves the full-chain decode — and the lane's own `exact` flag is
re-checked after the fact and still holds (`gennadasab.json`: `exact=true` on both arms, all ten
lanes). **Downgraded, not declared verified:** no model API exists in this environment, so LLM
decodability was not tested here; external support for the in-band-dictionary design is
arXiv:2604.13066 (in-context dictionary learning, exact match > 0.99) and arXiv:2606.19857
(BabelTele, "Universality: any LLM should fully understand compressed output without a codebook").

**Measured.** End-to-end A/B on the real chain, ten authoritative lanes, interleaved in one process,
`OMEGA_DET=1 OMEGA_NO_MEMO=1` (`bench/x100/receipts/gennadasab.json`):

| lane | arm A (no ΓΕΝΝΑΔΑΣ) | arm B (ΓΕΝΝΑΔΑΣ) | Δ |
|---|---|---|---|
| apt-real | 837 | 837 | 0 |
| code-ts | 969 | 968 | **−1** |
| dpkg-l | 669 | 669 | 0 |
| findmnt | 440 | 440 | 0 |
| json-pkg | 672 | 670 | **−2** |
| kb-article | 621 | 621 | 0 |
| llm-answer | 671 | 671 | 0 |
| **ls-l-real** | **1 408** | **1 381** | **−27** |
| ls-real | 432 | 432 | 0 |
| ps-aux-real | 1 043 | 1 043 | 0 |
| **TOTAL** | **7 762** | **7 732** | **−30 (−0.386 %)** |

**3 lanes improved, 0 worse, 0 inexact.** The −27 on `ls-l-real` is the composed lane; −1 and −2 are
the relocate-to-enable move on `code-ts` and `json-pkg`. On the committed-wire baseline (7 864, a
*staler* incumbent) ΓΕΝΝΑΔΑΣ reads −90 — `gennadas10.json` — which is **not** the number to cite,
because the full chain already reaches 1 408 on that lane through ΟΥΡΑ and ΣΥΝΚΡΙΣΙΣ; the honest
incremental figure is the −30 above. That correction is recorded here rather than dropped.

**Fidelity, verified by decoding rather than by the `exact` flag** (`bench/x100/receipts/gennadasfidelity.json`).
The A/B's `exact` flag is *not* re-derived after ΓΕΝΝΑΔΑΣ runs, so it cannot be the evidence. What is
checked instead, with the repository's own `chironDecode` on the exact strings both arms emit:

```
CHIRON-layer expansion identical between arms:  10 / 10 lanes
chironDecode(arm A) === source:                   9 / 10 lanes
chironDecode(arm A) === the chain's decoded field: 9 / 10 lanes
```

The tenth lane, `ls-l-real`, is the composed one: its expansion is 10 085 bytes against a 10 692-byte
source, and it is **identical between arms**, so the full-chain decode is preserved there
**compositionally** — every layer above ΧΕΙΡΟΝ is a deterministic function of that expansion — and not
by direct measurement. That is a downgraded claim on exactly one lane and is reported as one. An
earlier attempt at this probe used `tagstackDecode`, which is a no-op outside the X74/X90 stack fold
and therefore measured nothing; it is discarded, not cited.

**29-lane A/B** (`bench/x100/receipts/gennadas29.json`, one process, interleaved lane by lane,
`OMEGA_DET=1 OMEGA_NO_MEMO=1`): **raw 28 015 → arm A 12 453 → arm B 12 410, Δ = −43 (−0.345 %),
10 lanes improved, 0 worse, 0 inexact.** The ten improved lanes are `ls-l-real` −27, `kubectl-get-pods`
−4, `markdown-table` −2, `psql-output` −2, `json-pkg` −2, `metrics.tsv` −2, `unified-diff` −1, `df-h`
−1, `code-ts` −1, `ps-real` −1 — **all ops or code, none prose**, which is what the leaders table's
headroom ranking (OPS TABLE 26.2 %, OPS LISTING 23.4 %, PROSE 4.2 %) predicts. The defensible claim is
the within-process Δ and the lane set, not the absolute total: the load-sensitivity defect makes a
cross-process total irreproducible, and arm A's own 12 453 differs from run K's 12 478 by well inside
that band.

**CPU, in isolation** (`bench/x100/receipts/gennadascpu.json`, three reps, median): **11 191 ms over
the ten wires = 2.38 % of the chain's own cost**, and **0–5 ms on each of the seven lanes where it
declines** — the guard skips the ΣΥΝΔΥΑΣΜΟΣ arm when the reference is the source and the new move
changed nothing. **Pareto on both axes.** The A/B's own millisecond columns are *not* the CPU number:
arm A runs first in the same process and pays the JIT and module-load warm-up (apt-real 70 656 ms arm A
against 21 193 ms arm B on identical bytes).

### X100 falsifications (all with receipts, all priced on the complete message)

| # | Lever | Receipt | Result |
|---|---|---|---|
| 29 | **ΔΙΑΛΕΚΤΟΣ** — switch the tape's declared script (ΧΕΙΡΟΝ declares it by the first letter's range, so it is free to transmit) | `dialektos.json` | **Every script worse on every lane, including the lane's own script in codepoint order** (+56…+247). The first run of this probe was itself wrong: it took the first n *codepoints* of a range, and cyrillic has 256 codepoints but only **122** one-token letters, so most "letters" cost 2–3 tokens. With a `countTokens(c)===1` filter the mechanism is honestly falsified. **Corollary kept: the letter assignment is worth 56–247 tokens against codepoint order.** |
| 30 | **ΑΝΤΑΛΛΑΓΗ** — seeded pairwise-swap search over the letter assignment | `antallage.json` | **Δ = 0** on the committed wire (0 swaps accepted in 30 000 probes); **Δ = −2** on the ΣΥΝΔΥΑΣΜΟΣ wire. The assignment is at a local optimum random restarts cannot escape |
| 31 | **ΣΤΗΛΗ** — ΧΕΙΡΟΝ's `×` columnar operator as a post-pass | `style.json`, `style2.json` | **Pooled positive net 0.** Best-period agreement fractions are **0.014–0.069**: the bodies carry almost no periodicity, because ΧΕΙΡΟΝ's synkrisis has already extracted the anchors. *The first scan (`style.ts`) was also flawed* — a fixed token period never aligns variable-length table rows. The corrected scan over repeated anchor subsequences still finds only n=2 ×5–7 |
| 32 | **ΠΡΟΠΑΡΑΣΚΕΥΗ** — relocate a rule earlier so it becomes a legal factor | `proparaskeue.json` | **64 enabling pairs, all 64 legal, and every enabling relocation costs +1…+4.** Moving a rule re-prices every boundary it crosses, and that cost exceeds the re-spelling it enables. (ΓΕΝΝΑΔΑΣ's relocate-to-enable is the *surviving* part of this idea: it is gated on the whole message and only admitted when it pays) |
| 33 | **ΑΝΤΑΝΑΚΛΑΣΙΣ** — reflect the tape's re-spelled key-sequences back into the body at zero cost | `antanaklasis.json` | **0–1 reflections per lane.** ΧΕΙΡΟΝ's macro pass already covers this |
| 34 | **ΣΥΣΣΩΡΕΥΣΗ** — hoist a repeated body token n-gram into a rule | `syssoreuse.json` | **0.** And this falsification is diagnostic: it shows ΣΤΗΛΗ's n-gram counts were *inflated*, because dropping the literals to form the reduced reference sequence created adjacencies that do not exist in the body |

---

## §X101 — ΣΤΑΘΜΟΣ and ΤΥΠΟΣ

Two codecs were added to ΧΕΙΡΟΝ's own search. **Neither moves the compression frontier; both are
Pareto-superior on the CPU axis and one is a latent-defect fix.** That is the honest outcome and it is
stated first.

| # | Name | Literal | Mechanism | Greedy? | Source | Time- or CPU-bound | Δ tokens | Δ CPU |
|---|---|---|---|---|---|---|---|---|
| 35 | **ΣΤΑΘΜΟΣ** | "the balance / the weight" | Delete ΧΕΙΡΟΝ's variant-sweep branches that were **measured** to win on 0 of 29 lanes, and give their budget to the branches that win | **Not a search — a measured deletion.** *Not proved*: nothing establishes that a deleted branch cannot win on a future input, which is why the ablation knob exists | α–β pruning is the shape of the claim ("removes only branches that cannot influence the final outcome… the result is always identical") and **ΣΤΑΘΜΟΣ does not meet it**; the honest analogue is empirical branch elimination | **CPU-bound** | **0 on 29/29** | **−3.0 %** (isolated, alternating reps, medians); **−0.3 % and inside drift at the `tagstackFrontier` gate** |
| 36 | **ΤΥΠΟΣ** | "the impression / the type" | Price a macro candidate on the wire that is **emitted** (`renderWire`: topological order, fresh glyph assignment) instead of on the search-time proxy (`provisionalWire`: creation order, search-time glyphs) | Greedy acceptance, unchanged; only the priced object changed | arXiv:2608.03983 (SeGaBench 2026) — LLM-proposed optimisations are admissible only where *"their artifacts are validated and evaluated"*; Alive2 / translation validation (Lopes et al. 2021); ZipLex arXiv:2510.18479 §3.1 for the general form | **Time-bound in principle** (`renderWire` is O(rules × length) per candidate), **measured neutral** because the branch is never taken | **0 on 29/29** | ΧΕΙΡΟΝ wall clock 4 561 → 4 438 ms |

### The evidence

| claim | receipt |
|---|---|
| Which ΧΕΙΡΟΝ variant wins, all 29 lanes: `full/"\n"` 11, `full/" "` 8, `full/","` 1, `macros-only` 2, identity 7, **`blocks-only` 0**; shared work meter 96 % exhausted on ls-l-real, 75 % ps-aux-real, 73 % code-ts | `bench/x101/receipts/klimax29.json` |
| ΣΤΑΘΜΟΣ 29-lane interleaved A/B: **Δ = 0 on 29/29, byte-exact 29/29** | `bench/x101/receipts/stathmos29.json` |
| ΣΤΑΘΜΟΣ isolated CPU, **alternating** reps, 3 each, median: **79 233 ms vs 81 695 ms = −3.0 %**, byte-exact on every rep | `bench/x101/receipts/stathmoscpu.json` |
| ΣΤΑΘΜΟΣ at the gate: `tagstackFrontier` **511 786 ms vs 513 163 ms = −0.3 %**, inside drift ⇒ **no measured effect** | `frontier-runX101.json` vs `frontier-runX101-control.json` |
| Widened separator gate: **Δ = 0 on 29/29** | `bench/x101/receipts/stathmos29b.json` |
| Work meter raised 4×: **Δ = 0 on 29/29** ⇒ ΧΕΙΡΟΝ's search has converged | `bench/x101/receipts/stathmos29c.json` |
| ΤΥΠΟΣ 29-lane ΧΕΙΡΟΝ-only A/B: **Δ = 0 on 29/29**, `chironDecode`-exact 29/29 | `bench/x101/receipts/typos29.json` |
| ΤΥΠΟΣ instrumentation: **5 504 macro candidates priced, 0 on a string different from the one that ships** ⇒ ΧΕΙΡΟΝ's rules are already in dependency order, so `topoOrder` is the identity and the two strings are byte-identical | `bench/x101/receipts/typosprobe.json` |
| Cost breakdown of the shipped chain: contract 137, tape 2 013, **body literals 4 299 (55.6 %)**, body references 1 283 | `bench/x101/receipts/merides.json` |
| Body reference/literal split with an explicit definition and a control: **22.1 % references / 4 390 literals on the committed ΧΕΙΡΟΝ wire** — this **corrects** `bench/x97/receipts/runpack2.json`'s "57.1 % of the body is reference tokens" | `bench/x101/receipts/loipon.json` |

### A withdrawn number

ΣΤΑΘΜΟΣ's first CPU measurement read **584 924 ms → 103 555 ms = −82.3 %**. **It is wrong and is
withdrawn.** Arm A ran first in a cold process; the alternating-rep control shows the first control rep
on ls-l-real at **294 357 ms** against **28 617 ms** and **30 008 ms** for the next two. The 82 % was
module load and JIT warm-up, not the codec. **The honest figure is −3.0 %.** This is the second time
this confound has appeared in this repository (X100, ΓΕΝΝΑΔΑΣ's A/B wall-clock pair); it was caught by
the alternating design, not by inspection.

### X101 falsifications (all with receipts, all priced on the complete message)

| # | Lever | Receipt | Result |
|---|---|---|---|
| 37 | **ΨΗΦΟΣ** — collapse wire-level digit runs to one token | `psifos.json` | 763 pure-digit tokens (9.70 %) and 512 runs ≥ 2 over ten wires; **upper bound 130 tokens over ten lanes**, which cannot pay a new contract clause (~10 × 10 = 100) and leaves nothing for decode cost. Real but ops-only (ls-l-real 19.3 %, ls-real 21.0 %, ps-aux-real 14.0 %) |
| 38 | **ΠΡΟΣΘΕΣΗ** — re-open ΧΕΙΡΟΝ's ADD census on the *final* chain output | `prosthese.json` | **269 body n-gram candidates, pooled Δ = 0.** X94's closure was measured on the ΧΕΙΡΟΝ wire; ΣΥΝΔΥΑΣΜΟΣ has since re-spelled every value, and the new candidate set gives the same answer |
| 39 | **ΜΕΙΖΩΝ** — bound the order constraint on ΣΥΝΔΥΑΣΜΟΣ's factors | `meizon.json` | The −831 "upper bound" is **invalid and withdrawn**: the re-speller could reference a rule's *own* value, so it was not a bound |
| 40 | **ΠΡΟΤΕΡΟΣ** — order the tape by increasing expanded length so every shorter value is a legal factor | `proteros.json` | **+133 / +315 / +154.** A length order destroys boundary fusion before re-spelling pays for it, and greedy longest-factor re-spelling then *expands* values because a script glyph breaks the BPE merges around it |
| 41 | **ΣΤΑΘΜΟΣ stage 2** — widen the separator gate | `stathmos29b.json` | **Δ = 0 on 29/29** |
| 42 | **ΣΤΑΘΜΟΣ stage 3** — raise the shared work meter 4× | `stathmos29c.json` | **Δ = 0 on 29/29** ⇒ the search has converged |
| 43 | **ΤΥΠΟΣ** — price the emitted wire, not the search proxy | `typos29.json`, `typosprobe.json` | **Δ = 0 on 29/29**, and instrumented as a **no-op**: 5 504 candidates priced, 0 on a different string. Latent-defect fix, not a gain |
| 44 | **ΠΑΡΑΚΟΛΟΥΘΙΑ** — mine the token-**misaligned** repeats ΧΕΙΡΟΝ's token-aligned mining cannot see | `parakolouthia.json` | The population is real and large — **675 misaligned candidates priced exactly** — and the pooled best Δ is **−1 token over ten lanes**. ΧΕΙΡΟΝ's comment ("char-level n-gram mining proposes phrases whose substitution splits the BPE merges around every site") is **correct** |

### Why the compression axis is closed, with the external result that says so

**55.6 % of the message is body literals** (`merides.json`), and a literal token is the tokenizer's own
price of non-repeated text. The gap between the readable frontier (12 639) and the independent entropy
floor (10 158) is **2 481 tokens = 18.17 %**, and it is not reachable by any byte-perfect, directly
model-readable codec, because reaching it requires arithmetic coding — inadmissible here (Kipf et al.,
*Waiting to Decompress*, VLDB CIDR 2026).

A 2026 result names the reason a *greedy* mechanism cannot recover it: **byte-pair encoding can lose
more than half of the optimal compression** (`alphaxiv.org/abs/2610.byte-pair-encoding-optimal-compression`,
Yang) — worst-case compression utility at most **(1 − e⁻²)/2 ≈ 0.4323** of optimal, and the mechanism is
exactly that *"a merge with the largest immediate payoff can destroy adjacent savings that a
better-planned sequence would collect."* ΧΕΙΡΟΝ is a greedy grammar compressor over a tokenizer that is
itself greedy in that sense. The measured 18.17 % is consistent with that bound.

### Generalized local leaders, X101 configuration

`bench/x101/leaders-x101.ts` → `bench/x101/receipts/leaders-x101.json`. Pure join, **zero frontier
calls**; `raw`, `floor` and the **category labels** imported from `bench/x90/receipts/leaders-x90.json`
and not re-measured; `shipped` measured in this process under `OMEGA_DET=1 OMEGA_NO_MEMO=1`.
**headroom = (shipped − floor)/(raw − floor)**; **readability price = (shipped − floor)/shipped**.

| category | lanes | raw | shipped | ratio | floor | headroom | price | leader |
|---|---|---|---|---|---|---|---|---|
| OPS TABLE | 11 | 4 135 | 1 712 | 0.4140 | 1 272 | **15.4 %** | 25.7 % | `kubectl-get-pods` 1 006 → 322 |
| OPS LISTING | 9 | 16 516 | 5 776 | 0.3497 | 4 420 | **11.2 %** | 23.5 % | `ls-l-real` 5 194 → 1 381 |
| CODE / MARKUP | 3 | 3 152 | 2 053 | 0.6513 | 1 728 | **22.8 %** | 15.8 % | `code-ts` 1 422 → 968 |
| DATA | 2 | 1 095 | 234 | 0.2137 | 209 | **2.8 %** | 10.7 % | `prices.csv` 582 → 133 |
| PROSE | 4 | 3 117 | 2 639 | 0.8466 | 2 529 | **18.7 %** | 4.2 % | `node-help` 1 099 → 860 |
| **ALL** | **29** | **28 015** | **12 414** | **0.4431** | **10 158** | **12.6 %** | **18.17 %** | |

Two corrections carried in this table: the first version's headroom formula was
`1 − (raw − floor)/(raw − shipped)`, which is negative on every category and meaningless — the
**shipped measurements are unchanged**, only the derived quantity was corrected; and the first version
re-derived the categories with a regex of my own, which classified all 29 lanes as ops and matched **no
PROSE lane at all**, because this 29-lane set contains no lane whose *name* looks like prose (the four
PROSE lanes are `node-help`, `llm-answer`, `kb-article`, `email-thread` by the X90 labels). Categories
are now imported, not re-derived.

### Model-readability

The contract is byte-identical, the operator set is unchanged, and the decode rule is unchanged, so a
reader who could expand the X100 incumbent can expand the X101 wire by the same rule.
**Downgraded, not declared verified: no model API exists in this environment, so LLM decodability was
not tested.** External support is unchanged: arXiv:2604.13066 (in-context dictionary learning, exact
match > 0.99) and arXiv:2606.19857 (BabelTele, "Universality: any LLM should fully understand
compressed output without a codebook").

---

## §X102 — ΔΙΑΓΡΑΦΗ and ΠΑΛΙΝΔΡΟΜΟΣ

| # | Name | Literal | Mechanism | Greedy? | Source | Time- or CPU-bound | Δ tokens | Δ CPU |
|---|---|---|---|---|---|---|---|---|
| 45 | **ΔΙΑΓΡΑΦΗ** | "the deletion, the erasure" | Sweep the FINISHED wire for rules that no longer pay, writing each deleted rule's value back into every user and re-pricing the whole message | **Greedy, single sweep, last-to-first.** First strictly-improving deletion kept; repeats until a full pass deletes nothing. No claim about the joint optimum | arXiv:1704.05254 (Maneth, *Grammar-Based Graph Compression*): *"as we remove rules, the contribution of other nonterminals might change… the effectiveness of pruning depends on the order in which the nonterminals are considered"*; also *"every SLP can be easily made irreducible by a simple post-processing"* — and irreducibility is what the O(n/log n) bound assumes. The profit notion `p(A) = |cs\|_A(\|α\|−1) − \|α\|` is ΧΕΙΡΟΝ's own local bound | **Neither, measurably** | **−5 on 29/29 lanes, 3 improved, 0 worse** | **2.0 % faster = drift, reported as no measurable cost** |
| 46 | **ΠΑΛΙΝΔΡΟΜΟΣ** | "running back, recurrence, a return" | Re-run the WHOLE wire-level codec sequence against the incumbent until no member improves; capped at 3 rounds | **Greedy descent over a fixed member list, to a fixed point.** Not a search over schedules — the member order is the chain's own order and no permutation is explored | The **phase-ordering problem**. UW PLSE (2025): with passes A and B, *"neither ordering of A and B correctly optimizes both P and Q"*. Scala-LMS: the remedy is to *"re-run the analyses on the transformed code until a fixpoint is reached"* | **CPU-bound and expensive** | **−9 on top of ΔΙΑΓΡΑΦΗ, 4 improved, 0 worse** | **+72.8 %** ⇒ **ships DISABLED, `OMEGA_PALINDROMOS=1` to opt in** |

### The evidence

| claim | receipt |
|---|---|
| ΔΙΑΓΡΑΦΗ 29-lane interleaved A/B: **12 410 → 12 405 = −5, 3 improved, 0 worse, byte-exact 29/29** | `bench/x102/receipts/diagraphe29.json` |
| ΔΙΑΓΡΑΦΗ isolated CPU, alternating reps, medians: **75 429 ms vs 76 953 ms = 2.0 % faster**, byte-exact on every rep | `bench/x102/receipts/diacpu.json` |
| ΠΑΛΙΝΔΡΟΜΟΣ 29-lane A/B on top of ΔΙΑΓΡΑΦΗ: **−9, 4 improved, 0 worse, byte-exact 29/29** | `bench/x102/receipts/palindromos29.json` |
| ΠΑΛΙΝΔΡΟΜΟΣ per-member yield: **ΓΕΝΝΑΔΑΣ 3, ΔΙΑΓΡΑΦΗ 1, ΜΕΤΑΤΑΞΙΣ 1, ἸΣΟΜΟΡΦΪΑ 1, ΣΥΝΔΥΑΣΜΟΣ 0**; max 2 steps on any lane | `bench/x102/palmembers.ts` |
| ΠΑΛΙΝΔΡΟΜΟΣ + ΔΙΑΓΡΑΦΗ isolated CPU: **109 959 ms vs 63 648 ms = +72.8 %** | `bench/x102/receipts/x102cpu.json` |
| ADD census re-run on the final wire with **no model filter**: **270 prices, Δ = 0** | `bench/x102/receipts/epanalepsis.json` |
| ADD census over **body and rule values**: **52 335 candidates, 283 prices, Δ = 0** | `bench/x102/receipts/epanalepsis2.json` |
| Frontier gate, final defaults: **12 639, exact 29/29, 0 lanes differing** | `bench/x102/receipts/frontier-runX102b.json` |

### A corrected instrument, kept rather than replaced

`bench/x101/prosthese.ts` filtered its ADD candidates with `if (model >= 0) continue`, where `model` is
the predicted **saving** — so it priced exactly the candidates the model expected to lose and skipped
every one it expected to pay. Its Δ = 0 was therefore unsupported. `bench/x102/epanalepsis.ts` removes
the filter and prices everything: **270 prices, Δ = 0 on all ten lanes.** The conclusion survives and
is now supported; the defect is recorded here rather than silently dropped.

### External results imported this turn, with their hypotheses

| result | what it says | what it is used for |
|---|---|---|
| arXiv:1704.05254, Maneth, *Grammar-Based Graph Compression* | *"as we remove rules, the contribution of other nonterminals might change as edges are added or deleted. Therefore, the effectiveness of pruning depends on the order in which the nonterminals are considered"*, with the worked example that *"the B-rule turns into a contributing rule if the A-rule is removed first"*; and *"every SLP can be easily made irreducible by a simple post-processing"* | ΔΙΑΓΡΑΦΗ's mechanism, and the reason a single deletion pass is not enough |
| ICALP 2016, *On the Complexity of Grammar-Based Compression over Fixed Alphabets* | rule profit `p(A) = \|cs\|_A(\|α\|−1) − \|α\|` — the same local bound ΧΕΙΡΟΝ uses, and the same reason a local bound is not a price | why ΔΙΑΓΡΑΦΗ prices the whole message instead |
| Siyari et al., PMLR v57, *The Generalized Smallest Grammar Problem* | a post-processing pass over **any** SGP grammar: *"while the reduction in size is small, it applies consistently throughout all the SGP algorithms we tried. **The better the original algorithm, the smaller the gain**"* | an external prediction that matched ΔΙΑΓΡΑΦΗ's measured −5 |
| UW PLSE (2025), *What is the phase ordering problem* | with passes A (interval-analysis peepholes) and B (conditional invariant code motion), *"neither ordering of A and B correctly optimizes both P and Q"* | why a fixed single pass is structurally insufficient |
| Scala-LMS compiler tutorial | the remedy: *"re-run the analyses on the transformed code until a fixpoint is reached"* | ΠΑΛΙΝΔΡΟΜΟΣ's mechanism |
| arXiv:2605.30914 (2026), *Automating Formal Verification with RL and Recursive Inference* | on VERINA, **OpenAI o3: 72.6 % code correctness, 52.3 % specification correctness, 4.9 % end-to-end proof success** | the quantitative cost of verifying the wrong object |
| arXiv:2606.29493 (June 2026), *Faults in Our Formal Benchmarking* | first-class fault taxonomy: **Specification Error, Formalization Error, Domain Mismatch, Definition Mismatch**; frontier-model detection recall 0.48–0.57 | why a mis-pointed checker is the dominant failure mode, not a rounding error |
| `alphaxiv.org/abs/2610.byte-pair-encoding-optimal-compression` (2026) | BPE worst-case compression utility ≤ **(1 − e⁻²)/2 ≈ 0.4323** of optimal, because *"a merge with the largest immediate payoff can destroy adjacent savings"* | why the 18.17 % readability price is consistent with the bound, not evidence of an unexploited mechanism |
| arXiv:2608.03983 (SeGaBench 2026) | LLM-proposed optimisations are admissible only where *"their artifacts are validated and evaluated"* | ΤΥΠΟΣ's principle, carried forward |
| Alive2 / translation validation (Lopes et al. 2021); ZipLex arXiv:2510.18479 §3.1 | *"A transformation from strings to semantic values is sufficient to construct tokens, but insufficient to print them back to the same strings"* | the general statement of the fidelity-gate defect |

### Model-readability

ΔΙΑΓΡΑΦΗ's output is an ordinary ΧΕΙΡΟΝ wire with fewer rules; ΠΑΛΙΝΔΡΟΜΟΣ's output is an ordinary
ΧΕΙΡΟΝ wire produced by the same operators. **Neither adds an operator, a contract clause or a decode
rule.** **Downgraded, not declared verified: no model API exists in this environment, so LLM
decodability was not tested.**

---

## X103 — ΠΡΟΑΓΩΓΗ, and two corrections to recorded numbers

### The name

**ΠΡΟΑΓΩΓΗ** (*proagōgē*, "the bringing-forward, the promotion") — the mechanism is to bring a rule
that lives **inside** another rule's value forward to a slot where its user can reference it, or to
push the user back to a slot where the factor is already legal.

### The gap it closes, stated once

A ΧΕΙΡΩΝ tape is `contract § k₁v₁ k₂v₂ … kₙvₙ ¶ body`.  The decoder does not care what order the
entries are in, provided every rule still appears after the rules it references, so the **order is a
free parameter**.  ΜΕΤΑΤΑΞΙΣ relocates to an arbitrary valid slot by a seeded first-improvement climb
with no notion of *why* a slot is good; ΓΕΝΝΑΔΑΣ relocates only when the later rule's value is a
perfect **prefix or suffix** and re-spells only that boundary; ΠΡΟΟΙΜΙΟΝ re-spells with references to
**strictly earlier** rules, interior factors included, but only for rules already earlier.  So:

> a rule `j` sitting **after** `i` whose value is a proper **interior** substring of `value(i)` is a
> factor no codec in this stack can use.

ΠΡΟΑΓΩΓΗ closes it with **BRING-FORWARD** (relocate `j` to just before `i`, then re-spell `i` and every
rule that gained `j`) and **PUSH-BACK** (relocate `i` to just after `j`).  PUSH-BACK exists because
BRING-FORWARD is blocked exactly when `value(j)` mentions a key between `i` and `j`, and in that case
PUSH-BACK is still legal — the two variants cover different halves of the same population.

**Population measured before the codec was written** (`bench/x103/receipts/pop.json`, 29 lanes, one
process): **24** interior-factor pairs with `j` after `i`, against a control of ΓΕΝΝΑΔΑΣ's own
population counted by the same routine in the same process — 41 prefix pairs and 16 suffix pairs.
ΓΕΝΝΑΔΑΣ paid −43 from 57 pairs, so 24 pairs with a stronger re-spelling arm is a live population.

### Result, and what it is not

29-lane interleaved A/B (`bench/x103/receipts/proagoge29-*.json`, arm A = `OMEGA_NO_PROAGOGE=1`):
**12 415 → 12 412, Δ = −3**; better **2** (`findmnt` −2 by PUSH-BACK, `ls-l-real` −1 by BRING-FORWARD),
worse **0**, same 27; `A.decoded === B.decoded` 29/29; byte-exact 29/29.  Variant A alone paid −1;
adding PUSH-BACK took it to −3.  **Confirmed three times:** `proagoge29` (two calls) and `settle.ts`
(one process) both give A = 12 415 / B = 12 412 / **Δ = −3, identical numbers**, and the alternating CPU
probe independently records `findmnt` 440 → 438.  (An earlier `settle` run made before PUSH-BACK existed
gave Δ = −1 with variant A alone; its receipt was overwritten and the figure is corrected here.)

**CPU** (`bench/x103/receipts/procpu.json`, seven lanes, three reps, **alternating** arm order,
medians): aggregate 5 680 → 5 528 ms = **−2.68 %**, inside the drift the alternating protocol exists to
expose.  On the one lane where the codec fires it costs **+12.1 %** (977 → 1 095 ms).  **Not claimed as
a two-axis win on `findmnt`.**  The 29-lane A/B's wall-clock columns are not used: arm A runs cold and
arm B warm, so B looks ~6× faster for reasons unrelated to the codec.

### Falsified this turn, with the numbers

* **ΑΝΑΓΕΝΝΗΣΙΣ** — ΧΕΙΡΩΝ as a second stage on the shipped message: 12 416 → 12 416, **Δ = 0 on
  29/29**, better 0, worse 0, round-trip true everywhere.  ΧΕΙΡΩΝ takes the identity path everywhere.
* **RESCORE** — optimise every parent's ΧΕΙΡΩΝ wire then select: synkrisis 12 961 → **12 822** against
  the shipped winner's **12 700**; still loses by 122.
* **BODY RE-REFERENCING** — 5 232 body literal occurrences of an existing rule's expanded value on 19
  lanes, control 3 440 references ΧΕΙΡΩΝ already made, **upper bound 10 tokens**.
* **DEEP RE-SPELLING** — ΠΡΟΟΙΜΙΟΝ's bounds (400, 5) → (2 000, 8) generates 167 498 candidates instead
  of 42 066 and gains **exactly 0**.  The re-spelling search is converged.

### Correction 1 — the X102 shipped total does not reproduce

`OMEGA_NO_MEMO` disables the **TAGSTACK** memo only (`tagstack.ts:501, :538, :564`).  The **X67 OURA
memo** (`oura.ts:494`, `OMEGA_OURA_MEMO=0`, 24 entries, cleared when full) and the **ἔγγραμμα** memo
(`engram.ts`, `OMEGA_ENGRAM=0`) stay live.  `oura.ts` claims the replay makes the meter trajectory
*"identical to the uncached run; only wall clock work disappears"* — **falsified on two of three lanes**
(apt-real 843 on / 834 off; code-ts 970 / 968) — and the effect depends on **process history**:
`apt-real` encodes to **834** in a three-lane process and **843** in a 29-lane process under the same
flags.  The 29-lane memo effect is −3, not the −11 the three-lane probe suggested.

**The correction, kept rather than silently replaced: the reproducible full-chain total under
`OMEGA_DET=1 OMEGA_NO_MEMO=1` is 12 415 with ΠΡΟΑΓΩΓΗ off and 12 412 with it on.  The X102 figure of
12 405 is not reproducible.**

### Correction 2 — the frontier is restated, not confirmed

`tagstackFrontier` → `tagstackEncodeUncached` → `tagstackEncodeInner`.  Registry arms live in
`tagstackX74Chain`, a **sibling** of that path, so **ΠΡΟΑΓΩΓΗ provably cannot move the frontier**.

| probe | setting | frontier |
|---|---|---|
| `bench/x102/receipts/frontier-runX102b.json` | `det: "1"` only | **12 639** |
| `bench/x103/settle.ts` | `OMEGA_DET=1 OMEGA_NO_MEMO=1` | **12 695** |
| `bench/x103/front2.ts` | `+ OMEGA_OURA_MEMO=0 OMEGA_ENGRAM=0` | **12 685** |

Both reproductions exact 29/29.  Five lanes differ from the X102 receipt and **three differ in the
parent codec**: `code-ts` 969 → 981 (synkrisis → **apographe**), `ps-aux-real` 1 042 → 1 055
(synkrisis → **apographe**), `apt-real` 850 → 851 (synkrisis → **diastema**), `ls-l-real` 1 476 → 1 496,
`dpkg-l` 673 → 673 with a differing parent.  **The X102 receipt's 12 639 does not reproduce under
either setting and is recorded as stale.**

### What has been missed all along

Rule **addition** closed (Δ = 0, twice, 283 exact prices); rule **deletion** is ΔΙΑΓΡΑΦΗ's −5;
**re-spelling** converged (deep bounds gain 0); **body re-referencing** bounded at 10 tokens.  **The
ΧΕΙΡΩΝ tape is at a local optimum of the current move set.**  Every gate in this stack is a **descent**
step — accept iff strictly smaller — so the stack is structurally a greedy climber, and a greedy
climber cannot collect the savings a better-planned sequence would.  That is the measured face of the
bound already on record: greedy BPE's worst-case compression utility ≤ (1 − e⁻²)/2 ≈ 0.4323 of optimal,
because *"a merge with the largest immediate payoff can destroy adjacent savings."*

The AI-native observation: **the stack optimises the wire as a string, but the wire is read by a model,
not by a parser.**  Every mechanism is judged by `countTokens`; nothing measures what the *reader* must
do.  **55.6 % of the ΧΕΙΡΩΝ wire is body literals** — text the tokenizer prices and no rule covers,
which a grammar compressor calls irreducible and a model simply reads.  **That axis has never been
measured here, because there is no model API to measure it with.  Downgrade, not a claim: LLM
decodability was not tested.**

### Model-readability

ΠΡΟΑΓΩΓΗ's output is an ordinary ΧΕΙΡΩΝ wire with the same rules in a different order and some values
spelled differently.  **It adds no operator, no contract clause and no decode rule.**  **Downgraded,
not declared verified: no model API exists in this environment, so LLM decodability was not tested.**
What is verified is structural: the wire is self-contained, the tape is delimiter-free with the
first-appearance key rule `chironParseTape` implements, and every reference is backwards — which
`chironDecode` enforces by rejecting forward references.

---

## §X104 — ΤΑΞΙΝΟΜΗΣΙΣ (`src/lib/omega/taxinomasis.ts`), and the repair of the measurement harness

### The harness repair, because it outranks the codec

**Name.** ΟΡΟΘΕΣΙΑ is below; what ships first is a repair to `src/lib/omega/clock.ts`, and it
invalidates every determinism claim this repository has ever made.

**The defect.** `clock.ts` exported

```ts
export const DET_MODE = ... process.env.OMEGA_DET === '1';
```

a **module-load-time constant**. Every probe sets `process.env.OMEGA_DET = '1'` in its own module
body, and ES modules evaluate their imports **before** the importing module's body runs. In the
esbuild bundle the probe's assignment lands tens of thousands of lines after `DET_MODE` is
computed, so `DET_MODE` was always `false`, `now()` always returned real `Date.now()`, and **every
"under `OMEGA_DET=1`" figure ever recorded here was taken with live wall clocks.**

**Two measurements that prove it, both in `bench/x104/`:**
- `clockaudit.mjs` patches the global clocks to run **one second per call**. Before the repair:
  `code-ts` 967 → **1 397** tokens, `apt-real` 835 → **2 521**. After the repair: control, plain and
  patched all return sha `940c8bfc`, 958 tokens, `gateDetected: false`.
- `callsites.mjs` records the calling line of every global-clock read: **105 012 calls arrive
  through `clock.ts`'s own `return DET_MODE ? 0 : Date.now();` line.** A frozen clock cannot call
  `Date.now()`; that line was executing the live branch.

**The repair.** `isDet()` reads the flag **per call**; `DET_MODE` is gone and its one consumer
(`metathesis.ts:229`) reads `isDet()`. Every wall-clock **gate** in the 148 modules reachable from
`tagstack` is routed through `now()`: `tachos`, `tachys`, `aion`, `eidos`, `glossia`, `akribeia`,
`hyle`, `polytropos`, `syntomia`, `hydra`, `echo`, `hermes`, `logistike`, `eustochia`, `lethe`,
`mnemosyne`, `nyx`, `oracle`, `palimpsest`, `bifront`, `sibyl`. Modules that read the clock only to
fill an `ms:` report field still read it directly, because a report field cannot change a wire.
**`hyle.ts:1470` is routed even though it looks like reporting**: it computes a *budget* from a
clock (`Math.max(300, deadline - Date.now())`) and passes it into `kiones` → `polytropos` as a
search stop. A clock-derived budget is a gate wearing a different name.

**What the repair changes.** `bench/x103/memoprobe.mjs`, fresh process per run: `code-ts`
970/969/968/967/968/970/969/968/967 → **958 × 5**; `apt-real` 835/836/836/843/836/836/835/836 →
**835 × 5**; `dpkg-l` 667/668/667/667/667/667/667/668 → **667 × 5**. The ±3-token noise that X103
attributed to the X67 OURA memo was this, and was never the memo.

**Is it greedy?** Not applicable — it is a correctness repair to the measurement instrument, not a
compression pass. **Source article:** none; the bug class is the classic module-initialisation-order
defect, found here by instrumenting the instrument.

**Time- or CPU-bound?** The repair makes the chain **CPU-bound and machine-independent**, at a
measured cost: the 29-lane frontier probe goes from roughly 12 minutes to **1 298 761 ms (21.6 min)**
because the wall-clock truncations that used to cut searches short are now inert. That regression is
reported, not hidden.

### ΤΑΞΙΝΟΜΗΣΙΣ (TAXINOMĒSIS, "selection by rank")

**Name.** ΤΑΞΙΝΟΜΗΣΙΣ — selection by rank. ΧΕΙΡΩΝ ranks candidate phrases twice and cuts each
ranking; this codec decides what happens to the candidates that **tie at the cut**.

**Is it greedy?** **Yes**, and it is greedy *about the same acceptor* ΧΕΙΡΩΝ already uses. It changes
neither which substrings are eligible nor how a rule is accepted. It changes the **order tied
candidates are tried in**, because that order was previously decided by accident: both of ΧΕΙΡΩΝ's
sorts are `(a, b) => b.key - a.key`, V8's sort is stable, and the `Map` that feeds them is in
leftmost-text-occurrence order.

**Move types.** Exactly one, at each of two cuts:
- **PREFILTER cut** — `taxinomasisResolvePrefilter`: when the cut lands inside a tie group on the
  *character* proxy, price the group (≤ 64) exactly and keep the best by the real token bound.
- **WINDOW cut** — `taxinomasisResolve`: when the cut lands inside a tie group on the *exact* bound,
  resolve the group (≤ 8) by `measure`, which snapshots the search state, applies the candidate,
  prices the **emitted** wire, and restores. `measure` is the accept test itself.

**Source article.** **Bieniawski, "Assembly Theory and the Smallest Grammar Problem",
arXiv:2608.19228 (Jul 2026)** — introduces **Re-Pair T-NDR**, a branch-and-bound variant of Re-Pair
that searches all tied digrams at each iteration instead of applying FIFO or lexicographic
tie-breaking, pruned by `r + ⌈log₂N⌉ ≥ G_best`. Measured over 408 strings: never larger than FIFO or
FIXED, strictly smaller in 31 of 325 non-unary strings (1–3 rules), tighter bound in 9.54 % of cases.
ΧΕΙΡΩΝ is a Re-Pair-family compressor, so the degree of freedom is present here and had never been
searched. **The objective is different and stronger**: the paper minimises rule count; this stack
minimises the token count of the message that ships, so the default policy resolves ties by pricing
the wire each tied candidate would actually emit.

**The measurement that justifies it** (`bench/x104/tiecensus.ts`, 29 lanes, env-gated census inside
`chiron.ts`):

| site | epochs | mean pool | mean tie group | epochs truncated | epochs with tie > 1 | max tie group |
|---|---|---|---|---|---|---|
| prefilter | 259 | 603.7 | 9.53 | 21 | **21** | **263** |
| window | 259 | 297.4 | 12.82 | 133 | **133** | **100** |

**Every truncating epoch at both cuts has a tie group strictly larger than one.**

**Time- or CPU-bound?** **CPU-bound, deliberately.** No wall clock. The policy is read **per call**
(not at module load) so an A/B can change arms inside one process — and precisely so this module does
not repeat the `DET_MODE` bug. `OMEGA_NO_TAXINOMASIS=1` disables; `OMEGA_TAXINOMASIS` selects
`insertion` (the shipped behaviour, and the control) / `count` / `short` / `exact` (default).

**Fidelity.** The acceptor keeps a rule only when it **strictly** lowers the scored message and
restores the snapshot otherwise, so reordering cannot make an individual accept test pass when it did
not before. What it can do is find a different, equally-scoring rule *earlier*, changing the state
every later rule is tested against. The mechanism is order-dependent search under a monotone
acceptor, not a stronger acceptor.

**Measured result.** `bench/x104/smoke.mjs`, three smallest lanes: insertion / count / short / exact
all give 60 / 76 / 126, all byte-exact — **no gain, reported as plainly as a gain would be**. Full
29-lane A/B: see `bench/x104/REPORT.md`.

**Model-readability.** ΤΑΞΙΝΟΜΗΣΙΣ changes only which of several equally-scoring rules is chosen. The
wire language, the contract and the operator set are untouched. **Downgraded, not declared verified:
no model API exists in this environment, so LLM decodability was not tested.**

---

## §X105 — ΟΡΟΘΕΣΙΑ (`src/lib/omega/orothesia.ts`)

**Name.** ΟΡΟΘΕΣΙΑ, *orothesia* — "boundary-setting, delimitation". The codec sets the boundaries
between the tape's rules; the rules themselves are untouched.

**Is it greedy?** **Yes — steepest descent over the complete legal neighbourhood, with an exact
acceptor.** It is *not* ΜΕΤΑΤΑΞΙΣ's greedy, and the difference is the whole content of this codec:

| | ΜΕΤΑΤΑΞΙΣ (X97) | ΟΡΟΘΕΣΙΑ (X105) |
|---|---|---|
| move | RELOCATE one rule to any legal slot | RELOCATE one rule to any legal slot (**identical move set**) |
| legality | reference DAG | reference DAG (**identical test**) |
| search order | Fisher-Yates-shuffled list, **first improvement** | **complete** neighbourhood, **steepest descent** |
| per-probe price | rebuild the whole tape string, re-tokenise the whole message | **O(n) integer sum** over a precomputed pairwise junction matrix |
| stop rule | patience + a budget derived from message **length** | no legal move in the complete neighbourhood wins |
| acceptance | exact `countTokens` on the serialised message | exact `countTokens` on the serialised message (**identical acceptor**) |

**Move types.** Exactly one, inherited from ΜΕΤΑΤΑΞΙΣ and not extended: **RELOCATE** the rule at tape
position `a` to any legal position `p ≠ a, a+1`. ΟΡΟΘΕΣΙΑ contributes no new move; it contributes a
different **price** and a different **search order**.

**The central construction.** A permutation of the tape changes only which blocks are **adjacent** —
ΜΕΤΑΤΑΞΙΣ's own comment says "Letters are UNCHANGED, so no substitution pass is needed". So

```
price(o) = head + tail + Σᵢ tᵢ + Σⱼ junction(Bⱼ, Bⱼ₊₁)
junction(i,j) = countTokens(Bᵢ + Bⱼ) − tᵢ − tⱼ
```

and `junction` is precomputable for all `n²` ordered pairs **once**. `bench/x104/junction.ts` measures
the model against the exact price on **200 random permutations of a 64-rule tape**: worst error
**2 tokens**, mean absolute error **0.16**, matrix build **18 ms**, and the model prices the whole
neighbourhood faster than the timer resolves — a **≥ 32×** reduction in per-probe cost against
ΜΕΤΑΤΑΞΙΣ's O(message) rebuild plus full re-tokenisation.

**Why the model is not the acceptor.** A token that *spans* a junction shifts where the scan resumes
inside the next block, which can change that block's interior tokenisation. That is exactly the ±2
residual the measurement shows. So `MODEL_SLACK = 3` (one token of headroom over the measured bound)
skips candidates the model says cannot win, and **a move is accepted only when the exact
`countTokens` of the actual serialised message strictly beats the incumbent**. The model decides what
gets looked at; the tokenizer decides what ships.

**Source article.** **None for the mechanism — original to this repository.** The pairwise-junction
decomposition of a permutation of fixed blocks is the standard device for pricing a sequence by
adjacent-pair costs, and it is what makes the problem Travelling-Salesman-shaped; using it as a
**ranking function under an exact acceptor inside a grammar-compression tape** is not. The
neighbouring imports, with their hypotheses and their honest scope limit:
- **arXiv:2608.19228** (Jul 2026), Re-Pair T-NDR — the order in which tied digrams are resolved is a
  hidden degree of freedom worth searching. Supplies the *motivation* for searching order at all.
- **arXiv:1704.05254** (Maneth, *Grammar-Based Graph Compression*) — "the effectiveness of pruning
  depends on the order in which the nonterminals are considered". Supplies the *observation* that
  post-processing order matters, not this decomposition.
- **arXiv:2502.10909** (Feb 2025) and **Bienkowski & Even, STACS 2024** on Optimal Linear Arrangement
  — the classical problem ΜΕΤΑΤΑΞΙΣ instantiates. **No approximation bound transfers**, because
  ΟΡΟΘΕΣΙΑ's cost is a token count under a fixed tokenizer, not a cut function.

**Time- or CPU-bound?** **CPU-bound, deliberately and reproducibly.** There is no wall clock in this
module at all: the search runs to a local optimum of the complete neighbourhood, so the same input
yields the same wire on any machine. The one apparently unbounded cost, the `n²` junction matrix, is
a pure function of the rule count and is built once per call. `OMEGA_NO_OROTHESIA=1` disables.

**Fidelity.** A relocation is a permutation of the tape's entries, so the rule→letter map is
untouched, keys stay distinct, and the DAG check keeps every reference pointing at a strictly earlier
rule, so `chironDecode`'s forward-reference guard still passes. Expansion composes with the
permutation, so the decoded string is byte-identical. **This is a proof**, and the pass re-decodes
the final message through `chironDecode` before returning it, refusing to emit on mismatch.

**Measured result.** `bench/x104/orothesia29.ts`, 29 lanes, arms interleaved in one process, scored
on the SHA-256 of the complete message: see `bench/x104/REPORT.md`.

**Model-readability.** ΟΡΟΘΕΣΙΑ changes only the ORDER of the tape's entries. The contract is
byte-identical, the operator set is unchanged, and every rule is the same string under the same
letter. **Downgraded, not declared verified: no model API exists in this environment, so LLM
decodability was not tested.** What is bound to evidence is that `chironDecode` round-trips every
emitted message and that the wire language is provably unchanged.

---

## §X105 — ΟΡΟΘΕΣΙΑ · ΤΑΞΙΝΟΜΗΣΙΣ · ΜΕΓΑΛΥΤΕΡΗ-ΕΠΑΝΑΛΗΨΙΣ (three codecs, two falsified)

### ΟΡΟΘΕΣΙΑ (orothesia.ts) — *boundary/junction steepest descent*. **REMOVED FROM THE CHAIN in X106.**

**Design spec.** ΧΕΙΡΩΝ's tape is a sequence of entries `<glyph><value>`; the price of the
concatenation is *not* the sum of the entries' prices, because the tokenizer fuses some adjacent
pairs across an entry boundary and not others. ΟΡΟΘΕΣΙΑ builds the full `n×n` symmetric junction
matrix `J[i][j]` = token cost of entry *i* immediately followed by entry *j*, prices any permutation
as `Σ J[π(k)][π(k+1)] + Σ selfCost` in **O(n)**, and runs **complete-neighbourhood steepest
descent**: every single relocation is scored by the model, the top `SHORTLIST = 4` are re-priced by
the real tokenizer, and the best exact win is taken. `MAX_STEPS = 512`. The emitted message is
re-decoded through `chironDecode` before it is returned.

**Greedy?** **Yes** — steepest descent, i.e. greedy on the exactly-priced shortlist. Not a beam, not
exhaustive, not randomized.

**Source citation (honest scope).** The framing import is **arXiv:2502.10909** (Feb 2025) and
**Bienkowski & Even, STACS 2024** on Optimal Linear Arrangement. **No approximation bound
transfers**: ΟΡΟΘΕΣΙΑ's cost is a token count under a fixed tokenizer, not a cut function, so the
O(√(log n) log log n) and O(log n log log n) results are framing only and are recorded as such. The
premise that the adjacent-pair score is the object of study is corroborated externally by
**arXiv:2610.12376** (Oct 2026, *Latent Core Tokenizer*): *"Recomputing affected counts after every
non-overlapping merge makes the merge order deterministic."*

**Time- or CPU-bound?** **CPU-bound by construction and reproducibly.** No wall clock is read at
all. The one apparently unbounded cost, the `n²` matrix, is a pure function of the rule count.

**Measured result — FALSIFIED, Δ=0.** `bench/x104/receipts/orothesia29.log`: `base` arm **12 639,
exact 29/29, 1 794 109 ms** (the frontier reproduced a third time). `bench/x104/receipts/
orothesia-big.log`: `plus` arm **7 372 over the 11 biggest lanes, Δ 0, inexact 0**. On `ls-l-real`
the two arms produce **different wires at the same price** (sha `173cbbfb3232` → `a9031c286056`,
both 1 476 tokens), so it is not a no-op — every improving relocation it finds is exactly
price-neutral. Cost measured interleaved in one process: base 224 238 ms vs plus 392 100 ms over 29
lanes, **+74.9 %**. **A codec that changes no token and costs three quarters of the encoder's time
is not a Pareto improvement, so X106 removed it from the chain.** The module and both receipts stay
in the tree as a measured falsification.

### ΤΑΞΙΝΟΜΗΣΙΣ (taxinomasis.ts) — *tie resolution by declared order*. **SHIPPED, default = control.**

**Design spec.** ΧΕΙΡΩΝ ranks macro candidates by the exact token bound `c*(t-1)-t-1` and then
truncates twice — `PREFILTER = 1600` on the cheap ranking and `EPOCH_APPLY*5 = 60` on the exact
ranking. Both cuts are `Array.prototype.sort` + `slice`, so a tie group is broken by **Map insertion
order**, i.e. by leftmost occurrence in the text. ΤΑΞΙΝΟΜΗΣΙΣ replaces that with a declared order:
`insertion` (the shipped behaviour, the control), `count`, `short`, and `exact`, which snapshots the
rule set, applies the candidate, prices the wire the encoder would actually emit, and restores.
`TAXINOMASIS_EXACT_TIE_CAP = 8`, `TAXINOMASIS_PREFILTER_TIE_CAP = 64`. The policy is read **per
call**, never at module load.

**Greedy?** **Yes** — it resolves ties inside ΧΕΙΡΩΝ's greedy; it does not change the greedy.

**Source citation.** **arXiv:2608.19228** (Jul 2026, *Assembly Theory and the Smallest Grammar
Problem*), Re-Pair T-NDR: exhaustive branch-and-bound over *tied* digrams, prune when
`r + ⌈log₂N⌉ ≥ G_best`; mean error **4.03 %** vs FIFO 4.96 / FIXED 4.89; strictly smaller grammar in
**31 of 325** non-unary strings. Independently corroborated by **arXiv:2610.12376** (Oct 2026).

**Time- or CPU-bound?** **CPU-bound, no wall clock.** The `exact` policy is the expensive one
because it prices a whole wire per tied candidate.

**Measured result.** The defect is real and measured: `bench/x104/tiecensus.ts` over 29 lanes,
1 260 257 ms — **every** truncating epoch at both cuts lands inside a tie group > 1 (prefilter 21/21,
max group 263; window 133/133, max group 100). The `insertion` control reproduced **12 639, exact
29/29** (`bench/x104/receipts/taxinomasis29.log`). The `exact` arm was killed mid-run in X104 and
was finished in X106: `bench/x106/taxexact.ts`, 15 lanes, **Δ = 0, exact 15/15, 403 530 ms**, and
the wires differ at equal price (`shaSame=false`) — the same price-neutral signature as ΟΡΟΘΕΣΙΑ.
`bench/x104/smoke.mjs`: all four policies identical at 60/76/126. **No gain; reported plainly.**

### ΜΕΓΑΛΥΤΕΡΗ-ΕΠΑΝΑΛΗΨΙΣ (megaepanalipsis.ts) — *MR-order window*. **SHIPPED DISABLED (opt-in).**

**Design spec.** ΧΕΙΡΩΝ takes its candidate window as `cands.slice(offset, offset + 60)` and then
does `offset += 60`, so the order it realises is rank 0..11, then 60..71, then 120..131 — ranks
12..59, 72..119, … are never applied. ΜΕΓΑΛΥΤΕΡΗ-ΕΠΑΝΑΛΗΨΙΣ replaces the positional window with
the **head of the ranking after a dead set**: a candidate joins the dead set only when it is
*observed* not to apply (its phrase is absent from the body and every literal rule, or `addRule`
refuses it), never merely because it was ranked below the cut; `offset` then advances past the dead
head only.

**Greedy?** **Yes** — it changes which ranks ΧΕΙΡΩΝ's greedy considers, not the greedy itself.

**Source citation (honest scope).** **Maruyama et al., "Practical Grammar Compression Based on
Maximal Repeats", Axioms 2020, 9(4), 63; arXiv:1811.04596v2.** Their Theorem 4: *"The sizes of
grammars generated by RePair are the same if they are generated in the same MR-order."* Their
experiment: MR-RePair produced **4 492 rules against RePair's 41 661 on rand77.txt (10.8 %)** and
21 787 against 49 933 on einstein.de.txt (43.6 %). **Hypotheses that do NOT transfer:** their object
is a straight-line grammar over an alphabet with no tokenizer and no per-symbol cost model, the
objective is grammar size in symbols, and the counts are occurrence counts. ΧΕΙΡΩΝ's objective is a
token count under a fixed tokenizer with a per-rule glyph cost. **The direction of the effect had to
be measured, and it was.**

**Time- or CPU-bound?** **CPU-bound, no wall clock.**

**Measured result — FALSIFIED when forced, marginal as a variant.** Forced
(`bench/x104/receipts/megaepanalipsis.log`, 15 lanes): **off 9 361 → on 9 374, Δ = +13**, exact
15/15 — the MR-order transfer **fails** on a token-count objective. As a half-budget sweep variant
(`bench/x104/receipts/mrvariants.log`, 20 lanes): **off 12 468 → on 12 463, Δ = −2** (`ls-real`
−1, `json-pkg` −1), 0 worse, but the `on` arm cost **+40 %** ΧΕΙΡΩΝ time. That is a trade, not a
two-axis win, so it ships **opt-in** via `OMEGA_MEGAEPANALIPSIS=1`, exactly like ΠΑΛΙΝΔΡΟΜΟΣ.

---

## §X106 — ΜΕΤΡΟ-ΠΥΛΗ (ΤΥΠΟΣ under a meter-headroom gate) · the shipped codec of X106

**Design spec.** ΧΕΙΡΩΝ's variant sweep runs `full/<sep>` per candidate separator plus
`macros-only`, all drawing on **one shared work meter** (`CHIRON_MAX_TOTAL_WORK_UNITS = 64 M`
units; per-variant grant `share = 64M × budgetMs / Σ budgetMs`). ΜΕΤΡΟ-ΠΥΛΗ adds a second
dimension — `full-exact/<sep>`, the same separator with `exactAccept: true`, i.e. the macro accept
test pricing `renderWire` (topological order, fresh glyph assignment, **the string the caller
receives**) instead of `provisionalWire` — and admits it **only when the meter says there is room**:
after the standard sweep, if `workLeft > 0.4 × initialWorkBudget`, the exact variants are pushed and
run; otherwise they are not.

**Central construction / lemma.** There is no new lemma; the construction is a scheduling gate over
an existing acceptor. What is proved is the *necessity* of the gate, and it is an experimental
disproof of the ungated form: the eager sweep dimension measures `ls-l-real` 1 670 → 2 126 (**+456**),
because the extra variant halves every other variant's grant from the one shared meter and the
starved `full/<sep>` runs create far fewer rules. The gate turns a +453 regression into a −5 gain
without changing the acceptor.

**Greedy?** **Yes, twice over.** ΧΕΙΡΩΝ's macro loop is greedy on the token bound; `exactAccept`
makes that greedy hill-climb on the string that ships rather than on a proxy. ΜΕΤΡΟ-ΠΥΛΗ adds no
search of its own — it decides *whether* to spend the meter on the more expensive acceptor.

**Source citation (honest).** The acceptor is **ΤΥΠΟΣ, X101, this repository** — no external paper
supplies it, and none is claimed. Its justification is internal and measured: ΜΕΤΑΤΑΞΙΣ measured −44
tokens from tape relocation alone and ΔΙΑΛΕΚΤΟΣ measured +56..+247 from the letter assignment alone,
so `provisionalWire` and `renderWire` are different strings with different prices, and a search that
accepts on one and ships the other optimises the wrong object. The *framing* import is
**arXiv:1704.05254** (Maneth): *"the effectiveness of pruning depends on the order in which the
nonterminals are considered"* — here, the order in which the wire is rendered.

**Time- or CPU-bound?** **CPU-bound, no wall clock, reproducibly.** The gate itself is a pure
function of the meter state, which is a pure function of the input. The expensive part is
`renderWire` per accepted candidate; that is exactly what the gate budgets for.

**Measured result, both layers, arms interleaved in one process, scored on the SHA-256 of the
complete message:**

| form | lanes | Δ tokens | exact | 0 worse? |
|---|---|---|---|---|
| `exactAccept` forced | 20 | **+9** (−3 node-help, −2 code-ts, +8 ls-l-real, +5 ps-aux-real) | 20/20 | no |
| eager sweep dimension | 20 | **+453** (ls-l-real 1 670 → 2 126) | 20/20 | no |
| **ΜΕΤΡΟ-ΠΥΛΗ (meter-gated)** | 20 | **−5** (node-help −3, code-ts −2) | 20/20 | **yes** |
| ΜΕΤΡΟ-ΠΥΛΗ at the chain | 29 | **0** | 29/29 | **yes** |

Receipts: `bench/x104/receipts/exactaccept.log`, `…/exactaccept-variants.log`,
`…/chainab.log`.

**Honest statement of what did and did not move.** The ΧΕΙΡΩΝ-layer win is real and does **not**
propagate: the chain's `node-help` is 862 while ΧΕΙΡΩΝ's is 934, so the downstream gates re-derive
the answer and absorb it. **The frontier did not move in tokens this turn; it stays at 12 639,
exact 29/29.** ΜΕΤΡΟ-ΠΥΛΗ ships ON by default because it is weakly token-Pareto-superior at both
layers and strictly better at the ΧΕΙΡΩΝ layer, and because the only thing that ever made it
dangerous is precisely what the gate prevents. `OMEGA_NO_EXACT_ACCEPT_VARIANTS=1` restores the X105
sweep.

**No CPU figure is claimed for it.** The chain A/B's wall-clock pair is confounded — arm A cold, arm
B warm, and both shared the box with the leaders probe — so the observed −16.5 % is not a CPU
result and is not reported as one.

### Model-readability of everything shipped in X106 — **downgraded, not declared verified**

No model API exists in this environment, so **no new decode was run this turn.** What is bound to
evidence:

- ΤΥΠΟΣ and ΜΕΤΡΟ-ΠΥΛΗ add **no operator, no contract clause and no decode rule**. They change
  which of several equally-legal ΧΕΙΡΩΝ wires is emitted, and the wire language is provably
  unchanged.
- `chironDecode` round-trips every emitted message in every receipt quoted above (29/29 exact in
  `chainab.log`, 20/20 in `exactaccept-variants.log`, 15/15 in `taxexact.log`).
- The prior-turn evidence that a model *can* decode this wire class from a single chat input with no
  skills.md and no system prompt stands as recorded: **10 of 10 available LLM-blind decode cases
  byte-exact** (`bench/x104/llmdecode.mjs`). That evidence does **not** transfer automatically to
  the wires emitted this turn, and no claim is made that it does.

### The four falsifications of X106, and why each was worth running

| hypothesis | imported result | measurement | verdict |
|---|---|---|---|
| ΧΕΙΡΩΝ's candidate score over-counts overlapping occurrences | arXiv:2610.32298 (disjointness/partition) | 41 of 30 204 candidates, Σgap 632 | **real defect, no transfer** |
| the 400 000-entry enumeration cap truncates by text order | — | 0 of 29 lanes at cap | **falsified** |
| the tape has second-level grammar headroom | — | gain 0 on 15 of 15 lanes | **falsified — tape is at ΧΕΙΡΩΝ's fixed point** |
| tie resolution by the emitted-wire price gains tokens | arXiv:2608.19228 (Re-Pair T-NDR) | Δ 0 over 15 lanes, exact 15/15 | **falsified — price-neutral** |
