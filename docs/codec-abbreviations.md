# Codec abbreviations: decoded design spec (X13)

This page decodes the codec abbreviations used in the registry (`src/lib/omega/registry.ts`, 183 keys, counted at runtime in X20) into their technical design: the mechanism, whether the encoder is greedy or a search, the source citation, and the time or CPU bound. The companion page is `docs/codecs.md` (measurements) and `docs/codec-leaders.md` (local leaders by category).

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

### SIGE (`sige`, X19 codec, X20 contract list, registered) — see the X20 defect note in its measurement bullet
- **Mechanism.** Contract minimization, not a wire change. The metric of this stack is the whole one-chat message `M = tokens(decoder contract) + tokens(wire)`, and the contract is not a rounding error: DAEDALUS's rule sentence alone is 38–39 tokens and is paid on every message — more than any structural arm wins on the prose lanes. SIGE holds a clause table (the CHIRON rule sentence plus AKOLOUTHIA-2's progression sentence, HORA's ms sentence, HEMERA's day / both sentences) where every clause has candidate re-wordings that keep every content word carrying semantics: the script label, "new" (one rule per distinct glyph), rule extent ("to the next new letter"), the end-of-tape `¶`, and an output clause. The winning candidate is chosen by counting the candidate with the live o200k tokenizer inside the actual message; a replacement is applied only if it is strictly shorter than the long form. The wire is never touched, so every reader of the arm reads a SIGE message unchanged, and the encoder's own gate (`chironDecode` round trip) is rerun on the result.
- **Greedy?** Greedy. One pass over the clause table, and per clause an argmin over 2–4 fixed candidates. No backtracking and no search over the wire.
- **Measured (X20, o200k, live tokenizer, `bench/x20/tc.ts` + `tc2.ts` + `contract-compare.ts`).** The CHIRON rule sentence, by script label: DAEDALUS-D's long form 38 (Arabic/Chinese/Myanmar/Khmer), 39 (Cyrillic/Hangul/Katakana); X19's wording 21/22; the X20 winner `New {word} letter = rule to next new letter or ¶; expand after ¶ and print.` = **18/19** (16/17 without the print clause, which the reader must not use: the print clause is what makes the output well-defined). One process, identical wires, four lanes (`bench/x20/contract-compare.ts`): de-kb DAEDALUS-D 492 → SIGE **472**; readme 688 → **668**; git-numstat 2036 → **2017**; chart.svg 465 → **445**, i.e. exactly the contract difference with the wire untouched (`sameWireAsDual: true`), and 8–10 below LAKONIKOS-D on the same four lanes. The reduction also applies to the *arm-level* sentences, which is where the union wins most: on df-h AKOLOUTHIA-2's own message is 171 and the union's HENOSIS message for the same wire is 145, the difference being the progression sentence plus the rule sentence in their shortest measured forms.
- **A defect this entry is required to record (X20).** The first candidate template used `{label}` where the convention is `{word}`, so a real message read `New Arabic letter letter = rule to next new letter or ¶; …`. Counting tokens does not catch this — only printing a message does (`bench/x20/contract-text.ts`). Fixed, and the fix is one token cheaper than the buggy string.
- **Citation.** Internal (this repository's X10 LAKONIKOS line is the ancestor: it shortened the same sentence 39 → 29 in X10). The framing is the two-part code of MDL — the description length of the decoder is part of the code length (Grünwald, *The Minimum Description Length Principle*, MIT Press 2007, ISBD/DOI `10.7551/mitpress/2386.001.0001` — I verified the book, not a formula from it). The instruction-overhead arithmetic itself is the same shape as Sharma et al., "The Hidden Cost of Readability: How Prompt Conciseness Reshapes Cost-Quality Trade-offs" (ACM DOI `10.1145/3744916.3764556`, 2026), which measured concise prompt instructions cutting output tokens ~27% while adding 8–28 input tokens. No external paper I found minimizes a *decoder contract* per message with the live tokenizer; the closest published family is lossless prompt compression via in-context dictionaries (arXiv 2604.13066), which transmits the dictionary inside the message instead of shortening the instruction.
- **Time/CPU bound.** Linear in the contract text (a few hundred bytes), one o200k encode per candidate. Sub-millisecond; no DAEDALUS search is added (SIGE reuses the DAEDALUS-D wire it already produces). Under `OMEGA_DET=1` and in production alike the cost does not depend on the input size.

### HENOSIS (`henosis`, X20, registered)
- **Mechanism.** The union as a codec. X11 left the rule "a codec competition is not a codec": the frontier was a tournament that whoever ran the lanes resolved by hand. HENOSIS ships the tournament: every arm encodes the same input independently, each arm's own reader must reproduce the input byte for byte, each arm's contract is then reduced by SIGE and the whole message counted with the live tokenizer, and only the cheapest admitted arm's wire + contract are emitted. **There is no selector byte**: an arm's contract is its label, so a message whose contract states `※dN = the date above + N days` can only be the HEMERA arm and a message that states only the rule syntax can only be a grammar arm. The arms are `sige` (DAEDALUS-D + reduced contract, always runs, the identity arm of the union), `daedalus` (single-tokenizer pool: the dual pool is a restriction, so the single pool is sometimes cheaper), `akolouthia2` (progression elision over the plain **and** the dual grammar), `dendrons` (brace tree over the plain and the dual grammar), `hemera`, `hora`. `stathmos`, `phalanx-a10`, `diaphora`, `homoios`, `kladios`, `onomasia`, `anaphora-fold`, `gramma`, `paradeigma`, `dendron` (v1) are excluded with the measured reason in the module header (`src/lib/omega/henosis.ts`).
- **Greedy?** The selection is an argmin over a fixed arm set with per-arm gates: deterministic, no backtracking, no search over the input. Each arm keeps its own structure (DAEDALUS's portfolio, AKOLOUTHIA's single pass, DENDRON-S's per-separator comparison).
- **Measured (X20, `bench/x20/receipts/henosis-lanes-v2.jsonl`, 12 lanes, `OMEGA_DET=1`, one process per lane, every row `exact`).** The v2 run is the one that counts: it postdates the SIGE wording fix, the arm-union change and the dual inners. Columns: M of the union, then the same arm shipped alone, then the best single codec measured on that lane before X20. de-kb **472** / 472 / 476 [sige]; readme **668** / 668 / 673 [sige]; llm-answer **686** / 686 / 691 [sige]; bibliography **683** / 709 / 694 [akolouthia2]; psql-output **329** / 355 / 382 [akolouthia2]; df-h **145** / 171 / 264 [akolouthia2]; kubectl-get-pods **300** / 326 / 375 [akolouthia2]; chart.svg **303** / 329 / 450 [akolouthia2]; find-listing **1298** / 1318 / 1327 [dendrons]; git-numstat **1884** / 1904 / 2021 [dendrons]; vix-daily-1990 **1177** / 1199 / 1375 [hemera]; aapl-2014 **1230** / 1252 / 1582 [hemera]. The union is ≤ every arm by construction, so the gain is exactly the contract reduction (including each arm's own sentence) plus the arm choice on the lanes where the arms differ — no new grammar is claimed. The v1 receipt (`henosis-lanes.jsonl`, 476/673/691/…, pre-fix wording) is superseded and kept only for provenance.
- **Two defects this entry is required to record (X20).** (a) An arm that refuses carries an empty contract, and the union was scoring that as `M = 0`, so an identity arm looked free on small inputs; fixed in `consider()` (an empty contract is scored with the arm's own M). (b) `tape-dump2.ts` reported `decoded len 1161` against an 1162-byte original and looked like a codec bug; it was a harness off-by-one (the wire's own final newline is also the blank line before the contract, and the harness cut it). Both are now checks in `bench/x20/msg-verify.ts`, which re-reads the shipped `.msg.txt` from disk and diffs the public decoder's output against the original: ls-bin 1162/1162, stacktraces 1848/1848, df-h 939/939, meeting 1746/1746, kubectl 2649/2649, dumpsql 5159/5159 — all byte-exact from the file alone, no side channel.
- **Model decode (X20, honest).** Three HENOSIS messages were decoded by hand from the message alone — contract and wire only, no tool doing the expansion, no source file read first — and then diffed: `bench/x20/llm/ls-bin.decoded.txt` (1162 B, md5 `98acc2f386ab1f1b568f8a4681385de5`, one self-corrected slip: a dropped `../`); `bench/x20/llm/meeting.decoded.txt` (1746 B, md5 `57858922e42ccb7ace68c4bacc2ed88f`, one self-corrected error that is a real wire property: the row-terminating period is absorbed into the *following* row's prefix rule); `bench/x20/llm/df-h.decoded.txt` (939 B, md5 `73f2fb8704bcf104c2514780a61213c9`) — the last one is an **arithmetic** arm: it required expanding 16 nested rules and then extrapolating six number positions across fourteen rows of `⁺` markers (`value = above + (above − two above)`, giving the +37/+11/+9/+3/+1 progression and the second-order timestamps in the HEMERA-style lanes). All three diffs are clean. The first two were decoded before this turn's dual-inner/`{word}` changes; their message files are kept as shipped.
- **Citation.** Internal. The "the description names the model" trick is textbook MDL model selection (two-part codes; Grünwald, MIT Press 2007) and the arm set is this repository's own frontier. Prior art on *choosing* among compressors per input exists (zpaq/paq-style context mixing picks predictors per byte, and VCDIFF (RFC 3284) selects among source segments); neither is a per-message, LLM-readable one-chat wire, and I did not verify a paper that does exactly this, so no external claim is made.
- **Time/CPU bound.** The sum of the arms: roughly 2 DAEDALUS-D encodes (SIGE, and the dual inners), 2 plain DAEDALUS encodes, HEMERA's 3 arms and HORA's. In production each DAEDALUS-family encode is wall-clock budgeted to `min(20000, 1200 + len·1.1)` ms, and HENOSIS adds an outer `budgetMs` (default 240 000 ms) after which it stops starting new arms, so the union is anytime: it always has the SIGE message in hand. Under `OMEGA_DET=1` the clock is pinned and every arm runs to its natural end (deterministic, unbounded on large inputs).

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

## Frontier restatement (X20, fresh re-run)

Re-run on the X20 lane set with the X16 frontier keys, one (lane, codec) pair per process, `OMEGA_DET=1`, 420 s cap, two concurrent background processes (`bench/x16/frontier-run.sh`). Raw rows: `bench/x20/receipts/frontier-A.jsonl` + `frontier-B.jsonl` (60 + 60 = 120 rows, 20 lanes finished). Table and restatement: `bench/x20/REPORT.md` §E3, `docs/codec-leaders.md`.

- Strict leaders on the finished lanes: `daedalus-dual` 5 (`de-kb`, `ls-full-iso`, `kb-article`, `llm-answer`, `git-log-iso`), `akolouthia2` 4 (`chart.svg`, `dump.sql`, `vix-daily-1990`, `df-h`), `dendrons` 3 (`find-listing`, `git-numstat`, `ops-ls-l-omega`), plus 8 lanes where four or five keys emit the *same* message (`node-stacktraces`, `openstack-loghub-26`, `aapl-2014`, `meeting-transcript`, `readme`, `csv-8`, `sp500-200`, `ops-ls-l-bin`). Every X16 cell that both runs cover reproduces exactly.
- **A10 (`phalanx-a10`) is not a frontier leader, restated for the third time.** In the fresh run it is the minimum on 0 of 20 lanes (best relative showing: `kb-article` 656 against a minimum of 650) and it hit the 420 s cap on `sp500-200.csv`. DENS-2 / AKOLOUTHIA-2 / DAEDALUS-D are confirmed as the three real leaders; the "…/ A10" in the original phrasing should be read as an alias that never wins.
- LAKONIKOS-D is not in this key set; the same-process four-lane comparison in the SIGE entry above measures it on identical wires, where SIGE is 8–10 tokens lower. Its X16/X17 prose lead therefore passes to SIGE (and to HENOSIS, which contains both), not to DAEDALUS-D.
- Concurrency caveat: the two processes shared 2 CPUs, but `OMEGA_DET=1` pins the DAEDALUS clock (`clock.ts`), so the wires — and therefore the token counts — are load-independent. Timings from that run are not comparable and none is quoted.

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
