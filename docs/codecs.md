# Codec abbreviations: spec page

Status: written in X11, rewritten in **X20** (branch `arena/aa13d688-kompkernel`). Each entry states
what the code does, whether the encoder is greedy, how it was measured, its prior-art citation, and
its time/CPU bound. Entries marked **label-only** were not re-read or re-measured in X20; their
description comes from the `label` in `src/lib/omega/registry.ts`.

## Measurement contract (applies to every entry)

- Metric: `M` = o200k_base tokens of the **contract plus wire**, in one chat message, with no system
  prompt and no skills file. Counted with the `gpt-tokenizer` npm package through
  `src/lib/omega/bpe.ts`.
- Every reported lane is byte-exact. The round trip is checked in TypeScript, and where a CPython
  reader exists it is also checked on the actual messages.
- Identity arm = plain DAEDALUS. Any codec that fails a gate returns its base arm, so its `M` is
  never worse than that base.

## Selection: greedy or not, tournament or not

Three selection shapes appear in this stack. They must not be confused.

1. **Fixed rule plus binary gate (non-tournament).** One deterministic encoder rule, then one
   whole-message test that picks between two arms. The rule is applied left to right and marks every
   position it is allowed to mark; it does not search over which positions to mark. Examples:
   AKOLOUTHIA, AKOLOUTHIA-2, DIRFOLD, DITTO, UUIDFOLD, STATHMOS, **TYPOS**.
2. **Predictor plus cascade.** A cheap tokenizer-only estimate orders a small set of candidate arms;
   the arms are encoded in that order and the first one that passes the gates ships. The estimate is
   not exact, so this is a bounded cascade, not a search. Example: **TYPOS** (over its three reader
   rules), DAEDALUS's arm prediction.
3. **Per-input minimum over several codecs (tournament).** The encoder runs several full codecs on
   the same input and keeps the shortest. Examples: DAEDALUS's predicted-arm portfolio, AMPHORA,
   KANON, CADMUS, and the `frontier-min` bench script. Its cost is the sum of every candidate's cost.

**Answer to "is the frontier-min approach non-tournament?"** No. `bench/z52/frontier-min.ts` is a
per-input minimum over separately encoded candidates. It is a tournament and is reported only as a
bench-side comparator. The shipped chain (LAKONIKOS-D ⊂ STATHMOS ⊂ TYPOS) is not: each link gates
against the one below it, so the total cost is at most two or three encodes, not the sum of eight.

## Entries

### TYPOS (`src/lib/omega/typos.ts`, registry key `typos`) — **new in X20**

- **Design.** Shape-stated separator elision for numeric runs. A *numeric run* is a maximal match of
  digits interleaved with separators from `- . : / T`. Its **shape** is the run with every digit
  replaced by `9` (`2026-09-30` → `9999-99-99`; `07:59:52.640393881` → `99:99:99.999999999`;
  `17.240000` → `99.999999`). Real text repeats a handful of shapes hundreds of times while the
  digits differ, so no dictionary can merge them. TYPOS deletes the separators of every run whose
  shape is declared and states the shapes **once** in one contract sentence, e.g.
  `Digits are packed; split each digit run to its shape (9=digit): 9999-99-99, 99:99:99.999999999.`
  The reader restores a digit run by matching its digit count to a shape.
- **Three reader rules, cheapest admissible one wins.** `strict` (every digit run of a declared
  length is split), `isolated` (a digit run glued to a word character is left alone, so the
  `692162415` inside `a692162415ae` is out of scope; costs one extra clause), `marked` (each shape
  gets its own one-token mark in front of the digits, `†20260930`; no length collision is possible,
  but a mark costs one token per occurrence, so only shapes that lose ≥ 2 separator tokens are
  declared).
- **Greedy or not.** Greedy. Candidate shapes are scored by an estimated net saving
  (`occurrences × separator tokens − the shape's share of the sentence`) and taken in that order
  while the digit-count stays injective; every in-scope occurrence of a taken shape is transformed.
  No search over which occurrences to transform. The choice *between reader rules* is a cascade
  (shape 2 above), capped at 4 encoded arms.
- **Why exact.** Let `C` be the declared shapes and `L(s)` the digit count of `s`. The encoder only
  declares a set with (i) `L` injective on `C`, and (ii) no bare digit run of the transformed text
  that is in the reader's scope and has a length in `L(C)` other than the image of a declared run.
  Maximal numeric runs of the input are separated by at least one character belonging to no run, so
  deleting separators never merges two runs and every digit run of the transformed text is the image
  of exactly one input run; under (i)+(ii) the map digit-run → shape is injective and expansion is
  the exact inverse. The encoder runs the inverse anyway and refuses on any byte mismatch. In marked
  mode the mark names the shape, so (i) and (ii) are not needed.
- **Gates.** G1 the inverse reproduces the input byte for byte. G2 `M(arm) < M(base)`. The base arm
  is **STATHMOS**, which gates itself against LAKONIKOS-D, so
  `M(TYPOS) ≤ M(STATHMOS) ≤ M(LAKONIKOS-D)` on every input.
- **Measured (X20, `bench/x20/receipts/typos-28-final.jsonl`).** 28/28 lanes byte-exact, 0 losses,
  22 ties, 6 lanes transformed: sp500-200.csv −166 (4343→4177), aapl-2014.csv −102 (1587→1485),
  git-log-iso −32 (1520→1488), svenstaro_miniserve −24 (3042→3018), psql-output −21 (387→366),
  ops-git-log-stat −1 (3484→3483). Total 30,665 → 30,319 (**−346, −1.13 %**) against the chain
  floor. Against the six-key frontier minimum it is strictly lower on 15 of 28 lanes, by −390 in
  total. **Attribution:** TYPOS's own mechanism contributes −469 on 5 lanes (sp500 −166, vix −168,
  aapl −102, git-log-iso −32, ops-git-log-stat −1); the inherited LAKONIKOS-D contract contributes
  −110 on 12 prose/ops lanes but is +189 worse than the frontier minimum on 3 table lanes
  (aapl 97, sp500 81, vix 11), net −79. `390 = 469 − 79`. The prose wins are X16's, not TYPOS's.
- **Red team (`bench/x20/typos-redteam.ts`).** 21 full-codec edge cases and 4 000 fuzz cases
  (half of them structured so the transform actually fires): 858 plans checked across all three
  reader rules (strict 404, isolated 206, marked 248), **0 failures**.
- **Independent reader (`bench/typos_decode.py`, CPython, written from the contract prose and
  parsing the shapes out of the printed sentence).** 6/6 lane messages byte-exact — 5 strict-rule
  (aapl, sp500, psql, git-log-iso, miniserve) and 1 isolated-rule (ops-git-log-stat, whose sentence
  carries `Leave a digit run inside a word alone.`, which the reader detects) — plus 2/2 forced
  marked-rule messages including a three-mark message. Receipts
  `bench/x20/receipts/typos-py.json`, `typos-marked-py.json`. All three reader paths are therefore
  reproduced outside TypeScript.
- **Time/CPU (single runs, production clock, this 2-core sandbox; `bench/x20/typos-time.ts`).**
  psql 1.6 KB 0.92 s → 1.08 s; readme 3.2 KB 1.50 s → 1.39 s (no plan found); aapl 5.5 KB
  11.5 s → 19.0 s; sp500 21 KB 12.6 s → 21.9 s; find-listing 11.8 KB 12.2 s → 40.2 s (three arms
  encoded and all rejected). So 0.9–1.7× LAKONIKOS-D when an arm ships, up to 3.3× when the cascade
  exhausts. The transform itself is linear (regex passes plus one byte comparison); the cost is the
  extra DAEDALUS-D encodes, at most `maxPlans + 2` = 6. No worst-case bound is proven here. Decode
  is linear and was not separately timed.
- **Generalization to random and hybrid prose (X20, `bench/x20/hybrid-prose.ts`,
  `receipts/hybrid-prose.jsonl`).** Five fixtures built by splicing real table rows into real prose
  files from the repo. **5/5 byte-exact through the library reader, 3/5 transformed, 0 losses:**
  prose+40 sp500 rows −25 (marked, 7 shapes, 150 occurrences), prose+psql block −16 (strict,
  2 shapes), prose+random spliced numbers −1 (strict, 1 shape); prose+40 vix rows and
  prose+inline ISO timestamps both **0**. The two neutral fixtures had tokenizer estimates of
  **+138** and **+53** tokens. Realized gain across the five: **−42 tokens against a +520 estimate
  (≈8 % realization)**. So the mechanism does generalize past bench tables into hybrid prose, and
  the gate makes it safe there, but the source-level estimate overstates the wire gain by an order
  of magnitude.
- **Citation (prior art), honestly.** The transform for dates and times is **ISO 8601 basic
  format** (`20240115T123045` for `2024-01-15T12:30:45`), a standard, not an invention
  (iso8601.com; maketimestamp.com/guides/iso-8601-format-explained; RFC 3339 comparison). Shape /
  type-aware numeric encodings are standard in column stores (ClickHouse engineering page
  "Database compression: encodings, codecs and ratios", 2026; Pelkonen et al., *Gorilla: A Fast,
  Scalable, In-Memory Time Series Database*, VLDB 2015, delta-of-delta and XOR). Numeric-token
  handling for LLMs: arXiv 2510.06824 (BitTokens, 2025/rev. 2026 — needs training, not usable here);
  arXiv 2408.05760 (numeric token parsing for log compression, 2024, cited since X11). In-context
  lossless decoding of a stated substitution table: arXiv 2604.13066 (2026), which puts the
  dictionary in the **system prompt** and is therefore inadmissible under this contract.
  **What is claimed as new here is only the message-level form**: one sentence in-band, a
  digit-count-keyed reader rule, three admissible reader rules with a cascade, and an invertibility
  argument plus a byte gate. No novelty claim is made for separator removal itself.
- **Status.** Registered. Chain top. Not the per-lane minimum over the whole stack on
  ops-table (`df-h`, `kubectl`, `psql`), markup-log (`chart.svg`, `dump.sql`), `git-numstat`,
  `csv-8`, `spring-projects`, `svenstaro` or the two `ops-ls-l-*` lanes.

### STATHMOS (`src/lib/omega/stathmos.ts`, registry key `stathmos`)

Restored to the working tree in X20 from the committed patch blob
`01a13c66-7b18-725d-a98c-94a295aaefc1.patch`; it was implemented in X17 but the X18 commit did not
carry the file. Description from `src/lib/omega/stathmos.ts`, re-measured in X20.

- **Design.** In a comma-delimited table, a column whose every data cell is a decimal with exactly
  `D ≥ 1` fraction digits has its trailing zeros removed; a first line `@dp D1,…,Dk[,crlf]` records
  `D` per column and the line ending. The reader pads each counted cell back to `D` digits.
- **Greedy or not.** Greedy: every fixed-width column is stripped, then one whole-message gate.
- **Gates.** Cheaper of LAKONIKOS-D on the raw text and LAKONIKOS-D on the stripped text plus the
  restore sentence; refused unless strictly cheaper and byte-exact.
- **Measured (X20).** 1 lane of 28 transformed: vix-daily-1990.csv 1380 → **1212** (−168 vs
  LAKONIKOS-D, −157 vs the six-key frontier minimum). 0 elsewhere.
- **Citation.** Standard fixed-precision formatting; the header-line form and the LLM-readable
  restore sentence are the only parts specific to this stack. No prior-art claim beyond that.
- **Time/CPU.** Two LAKONIKOS-D encodes when the transform applies, one when it does not. Measured
  indirectly: it is the base arm of TYPOS, whose timings are above.
- **Status.** Registered in X20. Narrow: it needs a fixed-precision export.

### LAKONIKOS-D (`src/lib/omega/lakonikos-d.ts`, registry key `lakonikos-d`)

Also restored to the working tree in X20 from the same patch blob (implemented in X16).

- **Design.** The DAEDALUS-D wire with the LAKONIKOS terse decoder contract. The wire is
  byte-identical to DAEDALUS-D's; only the rules sentence is shortened.
- **Greedy or not.** No new selection. It inherits DAEDALUS-D's predicted-arm portfolio, which is a
  tournament-type selector.
- **Measured (X20).** The stack leader on **10 of 28 lanes** and never above DAEDALUS-D. It is
  strictly below the six-key frontier minimum on 10 lanes by 5–11 tokens (de-kb −11, readme −10,
  bibliography −10, kb-article −10, llm-answer −10, ls-full-iso −10, git-log-iso −10, meeting −9,
  ops-ls-l-bin −9, node-stacktraces −7, email-thread −5).
- **Citation.** None; it is a contract-text rewrite of the CHIRON reader sentence.
- **Time/CPU.** Identical to DAEDALUS-D plus one token count.
- **Known defect (found in X20, inherited, not fixed).** For an input that already begins with the
  CHIRON frame `§¶`, `lakonikosDualEncode` returns `wire = '§¶' + input` and reports `exact = true`,
  while `chironDecode(wire)` returns something else (receipt: `bench/x20/dbg-frame.ts`). TYPOS does
  not inherit the claim: its base arm's `decoded` is the actual decode.

### LAKONIKOS (`lakonikos`), DAEDALUS (`daedalus`), DAEDALUS-D (`daedalus-dual`)

- **LAKONIKOS.** DAEDALUS wire, terse contract. Same wire and decoder, fewer contract tokens.
- **DAEDALUS.** Glyph aliasing of repeated substrings with a predicted-arm portfolio (tournament).
- **DAEDALUS-D.** DAEDALUS with a glyph pool that is one token under both o200k_base and
  cl100k_base. **Measured (X20):** the six-key frontier leader on 7 of 28 lanes, and strictly beaten
  by LAKONIKOS-D on all 7 of those.
- **Citation.** Two-part MDL (Grünwald; Li–Vitányi); smallest-grammar hardness
  (Charikar et al., STOC 2002 / IEEE TIT 2005); generalized SLPs (Navarro–Olivares–Urbina,
  arXiv 2404.07057). Restated with hypotheses in the header of `src/lib/omega/chiron.ts`.

### AKOLOUTHIA-2 (`akolouthia2`) and AKOLOUTHIA (`akolouthia`)

- **Design.** Arithmetic-progression elision across lines. A digit run at column `k` of line `i`
  becomes `⁺` when the same column in lines `i−1` and `i−2` gives the same step; the reader computes
  `v(i−1,k) + step`. v1 needs three matching steps, v2 needs two.
- **Greedy or not.** Greedy: every eligible position is marked left to right, then the whole-message
  gate G3 picks marked or identity.
- **Measured (X20).** Frontier leader on 7 of 28 lanes (chart.svg 330, dump.sql 703, df-h 171,
  kubectl 326, psql 355, vix 1369, svenstaro 2989). Stack leader on 6 (TYPOS ties it on vix via
  STATHMOS, which is 243 lower there).
- **Citation.** LeCo, arXiv 2306.15374 (2023); LogShrink, ASE 2023,
  DOI 10.1145/3597503.3608129 (search snippet only); arXiv 2408.05760 (2024). None is an
  LLM-decoded message-level codec.
- **Time/CPU.** 2–3× plain DAEDALUS (the gates re-encode and re-count). X11 single runs: 12 KB
  listing 23.6 s vs 11.4 s plain.

### DENDRON (`dendron`) and DENS-2 / DENDRON-S (`dendrons`)

- **Design.** Brace-tree notation for path and URL lists: a run of lines sharing a first segment is
  written once as `dir/{a,b/{c,d}}`. DENDRON-S factors on `.` or `/`, whichever is cheaper by
  one-chat M, and writes non-conforming lines verbatim behind a `!` marker.
- **Greedy or not.** Deterministic factoring by shared first segment with a gate against identity.
  The separator choice is a two-arm comparison, not a tournament.
- **Measured (X20).** `dendrons` is the six-key frontier leader on **14 of 28 lanes** (find-listing
  1318, git-numstat 1904, sp500 4262, aapl 1490, csv-8 1695, openstack 1008, node-stacktraces 339,
  spring-projects 963, ops-ls-l-omega 954, ops-ls-l-bin 247, git-log-fuller 143, email-thread 525,
  meeting-transcript 420, readme 688). It is the stack leader on 7.

### PHALANX-A10 (`phalanx-a10`)

- **Label.** PHALANX-A7 with VERITAS-C: token-window and character-substring dictionary, nested
  equals-free header, one greedy pass, identity-guarded.
- **Naming caveat (unchanged since X11).** The z55 report calls "A10" PARADEIGMA + DAEDALUS-D; the
  registry label calls it PHALANX-A10. The composition claim is still not verified.
- **Measured (X20).** **Never the minimum on any of the 28 lanes.** It completed on 21 lanes and was
  worse than plain DAEDALUS on all of them (+70 to +239). It hit the 150 s per-cell cap on 7 lanes
  (git-numstat, openstack, sp500, git-log-iso, ops-git-log-stat, spring-projects, svenstaro). The
  cap this turn was 150 s, not the 420 s used in X16/X17, so the timeout count is not comparable to
  those runs; the "never the minimum" claim rests on the 21 completed cells.

### PARADEIGMA, GNOMON, SYNARTESIS, ENTHYMEME, EPAGOGE, ELLEIPSIS (label-only)

Entailment and fixed-field codecs for REST and lockfile structures. Not run on the X20 28-lane set.
The X20 frontier comparator therefore omits them, exactly as X11's did.

### CRASIS, TABMIN, PADTAB/PADTAB2 (inside PHALANX-A6/A7), DIRFOLD, DITTO, UUIDFOLD (label-only)

One-rule codecs with an identity fallback. CRASIS (punctuation-boundary fusion) and TABMIN
(row-major vs column-major tables) were **not** re-measured in X20 and are not in the frontier
comparator; that is a gap in this report, not a negative result about them.

### ONOMASIA, KLADOS (negative, unregistered)

Keyed addressing for progressions (ONOMASIA) and KLADOS: both net-negative, kept in the tree as
negative results. Receipts in `bench/z56/`.

## Frontier restatement (X20, re-measured)

Command: `bench/x20/frontier-run.sh <lanes> <out> "dendrons dendron daedalus daedalus-dual
akolouthia2 phalanx-a10 lakonikos-d stathmos" 150`. Receipts:
`bench/x20/receipts/frontier-A.jsonl`, `frontier-B.jsonl` (112 rows each, both `.status` = done;
224 cells = 28 lanes × 8 keys). Table: `bench/x20/receipts/leaders-x20.tsv`
(built by `bench/x20/leaders.py` from the receipts only).

**The frontier is NOT "DENS-2, AKOLOUTHIA-2, DAEDALUS-D, A10".** Restated:

- Over the six frontier keys, the per-lane minimum is led by **DENS-2 on 14 lanes, AKOLOUTHIA-2 on
  7, DAEDALUS-D on 7**. DENDRON and plain DAEDALUS never lead. **A10 never leads.**
- Over the whole registered stack the leader is **LAKONIKOS-D on 10 lanes, DENS-2 on 7,
  AKOLOUTHIA-2 on 6, TYPOS on 4, STATHMOS on 1**.
- Sums over the 28 lanes: six-key frontier minimum 30,184; whole-stack per-lane minimum **29,794**
  (−390, −1.29 %).

## Generalized local leaders by category (X20, 28 lanes)

`Δ` is TYPOS minus the six-key frontier minimum for the category. "Below" counts lanes where TYPOS
is strictly under that minimum. Category assignment is by lane path/name in
`bench/x20/leaders.py`.

| Category | Lanes | Local leader (lanes) | Best value(s) | TYPOS Δ | Below |
|---|---:|---|---|---:|---:|
| **prose** (kb, readme, article, llm-answer, email, meeting, bibliography) | 7 | LAKONIKOS-D 7/7 | 411–699 | **−65** | 7/7 |
| **temporal-table** (CSV with a date column) | 4 | TYPOS 2, DENDRON-S 1, STATHMOS 1 | sp500 4177, aapl 1485, csv-8 1695, vix 1212 | **−234** | 3/4 |
| **ops-listing** (`ls`, `find`, `git log`, logs, path lists) | 10 | DENDRON-S 5, LAKONIKOS-D 3, TYPOS 2 | 143–3483 | +102 | 5/10 |
| **ops-table** (`df`, `kubectl`, `psql`) | 3 | AKOLOUTHIA-2 3/3 | 171, 326, 355 | +163 | 0/3 |
| **markup-log** (SVG, SQL dump) | 2 | AKOLOUTHIA-2 2/2 | 330, 703 | +137 | 0/2 |
| **other** (changelog, issue trace) | 2 | DENDRON-S 1, AKOLOUTHIA-2 1 | 963, 2989 | +32 | 0/2 |
| **JSON lockfile** | 0 | not measured | — | — | — |

Reading: the chain (LAKONIKOS-D ⊂ STATHMOS ⊂ TYPOS) owns prose and the dated tables; DENDRON-S owns
listings and numstat; AKOLOUTHIA-2 owns aligned numeric tables and structured numeric markup. No
single codec leads everywhere, and the six-key "frontier" understates the stack by 390 tokens
because it omits LAKONIKOS-D and STATHMOS.

## Runtime honesty

- Tools used in X20: `bash`, `git` (local), `npm ci` (exit 0), `esbuild` + `node` through
  `bench/x20/run.sh`, `node_modules/.bin/tsc --noEmit` (exit 0 after every edit), `python3` (the
  CPython reader and `leaders.py`), `gh api repos/openai/math/contents/CONTENTS.md`, `web_search`.
- Background processes: two `frontier-run.sh` halves and the TYPOS lane benches, concurrently, on a
  2-core sandbox. That is OS-level concurrency, not agents or a job system.
- **No LLM was run.** No model API is reachable in this sandbox. `M` is a tokenizer count of the
  contract plus wire, not a model evaluation. The claim "an LLM can decode a TYPOS message in one
  chat with no system prompt" is **unverified** and is not made here. The strongest available
  evidence is the independent CPython reader, which parses the shapes out of the printed contract
  sentence and reproduces 8/8 messages byte-exactly.
- **No Lean toolchain is installed** (`lean`, `lake` absent). No OpenAI proof was checked by me.
  All OpenAI proof statements below are **reported, not verified**.
- Not run: PARADEIGMA / GNOMON / SYNARTESIS / ELLEIPSIS / CRASIS / TABMIN on the X20 lane set;
  any blind single-chat decode; any repeated-measurement timing study (the timings are single runs).

## OpenAI `openai/math` review (X20)

Method change, and it matters: earlier turns read `CONTENTS.md` chunk by chunk and reached 8–10 of
80 chunks (~10 %). In X20 the **whole 638,727-byte index was downloaded and all 372 result families
were parsed and keyword-scanned** (`compress|entropy|Kolmogorov|superstring|edit distance|coding|
succinct|tokeniz|Huffman|zip|rate-distortion`). 27 families matched; 7 were read in full.

| # | Result | Codec relevance |
|---|---|---|
| 099 | edit-distance ℓ1 distortion `exp(Θ(√(log d·log log d)))` | Bound only. A sketch-based near-duplicate matcher cannot be constant-distortion, which argues for exact matching (ANTIPHON/HOMOIOS style), not for a new codec. |
| 121 | almost-linear edit distance, randomized `(1+ε)` | Diff-style codecs only; randomized; not applicable. |
| 122 | trace reconstruction, `n^Ω(log log n)` traces | Deletion-channel reconstruction; not an exact text codec. |
| **128** | **factor-2 shortest common superstring**, deterministic polynomial time, explicitly *not* the maximum-overlap Greedy | The one plausible link. Evaluated and **rejected on measurement grounds**: a superstring wire must also send each input's offset, and on the lanes where overlaps dominate (`find-listing`, `git-numstat`, `spring-projects`) DENDRON-S already factors the shared prefixes and is the measured leader (1318 / 1904 / 963). Not built. |
| 129 | exponential state cost for two-way automata (Sakoda–Sipser) | Succinctness *lower* bound. Says a deterministic reader with bounded state cannot be made arbitrarily more compact; consistent with, but not a proof about, contract length. |
| 229 | Potts/tree reconstruction thresholds | None. |
| 276 | classical capacity of generalized amplitude damping | Quantum channel capacity; no classical text codec follows. |

Lean links exist for each (`lean/docs/NNN.md`) and were not built or run.

## Negative and bounded results carried into X20

1. **Gross source-level token saving is not predictive.** The X20 screen
   (`bench/x20/receipts/probe-transforms.tsv`, `bench/x20/typos-screen.ts`) scored 13 reversible
   transforms on 57 lanes. The best screen candidate (`shape>=2`) claimed 7 202 gross tokens, but
   `find-listing` loses 1 080 source tokens to the TYPOS transform and still comes back **64 tokens
   worse** on the wire (1396 vs 1332), because DAEDALUS already turns the shared timestamp prefix
   into one rule. Every transform must be gated end to end.
2. **Bare digit-run collisions are the structural limit of a length-keyed reader rule.** Digit runs
   of length 1–9 occur bare in almost every real text (hex ids, issue numbers), so the `strict` rule
   is often inadmissible; the `isolated` and `marked` rules exist for that reason and were added
   after measurement, not before.
3. **Indentation run-length, CRLF→LF, blank-line run-length, markdown-link glyphs, JSON-key
   unquoting, leading-zero drop, thousands separators, dotted-version compaction** were all screened
   in X20 (`probe-transforms.tsv`). Only the numeric-shape family survived into a codec. The
   thousands-separator control reproduces the X16 negative.
4. **Pure prose has no recurring numeric shape; hybrid prose does, and that is where the estimate
   lies.** TYPOS transforms 0 of the 7 pure prose lanes, so the prose gain in this stack is
   LAKONIKOS-D's contract saving (X16), worth 5–11 tokens per lane. On 5 constructed **hybrid**
   prose fixtures (`bench/x20/hybrid-prose.ts`) it transforms 3 of 5 and loses on none, but the
   realized saving is −42 tokens against a tokenizer estimate of +520 (**≈8 % realization**), and
   the two fixtures with the largest estimates (+138, +53) realize exactly 0. Estimator ≠
   predictor: it orders the cascade, it never decides.
