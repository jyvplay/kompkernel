# Codec abbreviations: decoded design spec (X13 base; X46 update)

This page decodes the codec abbreviations used in the registry (`src/lib/omega/registry.ts`, 209 keys as of X46) into their technical design: the mechanism, whether the encoder is greedy or a search, the source citation, and the time or CPU bound. SYNKRISIS was added in X45 (208 keys); BIFRONT is X46 (209 keys). The companion page is `docs/codecs.md` (measurements and leaders).

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
