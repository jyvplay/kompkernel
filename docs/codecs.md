# Codec abbreviations: spec page

Status: **rewritten in X19** (branch `arena/13bad6a5-kompkernel`, base `9142be1` = X18).
The X11 version of this page is superseded; where the two disagree, this one is the measured one.

This page answers four questions for every codec: **what is the design spec behind the
abbreviation**, **is the selection greedy or a tournament**, **what is the real prior art**,
and **is it time-bound or CPU/work-bound**.

## 0. Measurement contract (applies to every entry)

- Metric `M` = **o200k_base tokens of contract + wire in one chat message**, no system
  prompt, no skills file, one input box, one output box.
- Byte-exactness is checked in TypeScript by decoding the wire and comparing to the input
  (`decoded === text`). A codec that fails any gate returns the identity arm, so its `M`
  is never worse than the arm it sits on.
- The 28 benchmark lanes are `bench/x16/lanes-all.txt`. Raw o200k for the whole set is
  62,954 tokens.

## 1. Selection shapes (do not confuse these)

1. **Fixed rule + binary gate (non-tournament).** One deterministic encoder rule, then one
   whole-message test between two arms: the transformed wire, or identity. Every eligible
   position is marked; there is no search over *which* positions. Examples: AKOLOUTHIA,
   AKOLOUTHIA-2, DIRFOLD, DITTO, UUIDFOLD, ANKYRA, STIGME.
2. **Per-input minimum over several codecs (tournament).** Several full codecs are run and
   the shortest kept. The cost is the sum of every candidate's cost. Examples: DAEDALUS's
   predicted-arm portfolio, AMPHORA, KANON, CADMUS, and the bench-side `frontier-min`.
3. **Grammar construction with a work budget.** ARIADNE/CHIRON/THOTH/SEQUOYAH: the parse
   and the glyph assignment are greedy hill-climbing over an exact objective, bounded by a
   work budget rather than a wall clock (KAIROS, THOTH, SEQUOYAH) or by `min(20000,
   1200+len*1.1)` ms in production DAEDALUS.

## 2. The frontier, re-measured this turn (answer to "confirm DENS-2 / AKOLOUTHIA-2 / DAEDALUS-D / A10")

**Restated.** The named frontier is no longer the frontier. Two separate corrections came out
of this turn's live runs on all 28 lanes:

1. **`lakonikos-d` was never registered**, so it was missing from every frontier table
   including the one in the X11 page. It is the strongest general codec in the repository
   and beats the six registered candidates on 10 of 28 lanes by 5–11 tokens each.
2. **The X19 patch added a column-major transposition family** (`tabmin`, `plinthos`,
   `kiones`, `anastrophe`) that moves the frontier substantially on tabular lanes, and a
   `dendrons`/`akolouthia2` tie that makes "the leader" lane-dependent.

### 2a. Six registered candidates, all 28 lanes (`bench/x19/receipts/frontier-{A,B}.jsonl`)

Keys: `dendron`, `dendrons`, `daedalus`, `daedalus-dual`, `akolouthia2`, `phalanx-a10`.
One process per (lane, codec), `OMEGA_DET=1`, 420 s cap. 26/28 lanes complete
(`phalanx-a10` rows for `sp500-200.csv` and `ops-git-log-stat.txt` did not return).

| lane | min | winner | spread across the six |
|---|---|---|---|
| de-kb | 492 | daedalus-dual | 492–505 |
| chart.svg | 330 | akolouthia2 | 330–539 |
| dump.sql | 703 | akolouthia2 | 703–876 |
| find-listing | 1318 | dendrons | 1318–1415 |
| git-numstat | 1904 | dendrons | 1904–2214 |
| node-stacktraces | 339 | dendron/dendrons/daedalus/akolouthia2 (tie) | 339–410 |
| openstack-loghub-26 | 1008 | 4-way tie | 1008–1247 |
| aapl-2014 | 1490 | 4-way tie | 1490–1766 |
| vix-daily-1990 | 1369 | akolouthia2 | 1369–1589 |
| df-h | 171 | akolouthia2 | 171–414 |
| kubectl-get-pods | 326 | akolouthia2 | 326–547 |
| psql-output | 355 | akolouthia2 | 355–437 |
| bibliography | 709 | akolouthia2 / daedalus-dual | 709–896 |
| email-thread | 525 | 4-way tie | 525–629 |
| kb-article | 650 | daedalus-dual | 650–656 |
| llm-answer | 706 | daedalus-dual | 706–733 |
| meeting-transcript | 420 | 4-way tie | 420–472 |
| readme | 688 | 4-way tie | 688–719 |
| csv-8 | 1695 | 4-way tie | 1695–1880 |
| ops-ls-l-bin | 247 | 4-way tie | 247–304 |
| ops-ls-l-omega | 954 | dendrons | 954–1168 |
| sp500-200 | 4262 | dendrons | (a10 missing) |
| ls-full-iso | 405 | daedalus-dual | 405–521 |
| git-log-iso | 1530 | daedalus-dual | 1530–1653 |
| ops-git-log-stat | 3458 | dendrons | (a10 missing) |
| spring-framework trace | 963 | 4-way tie | 963–1264 |
| miniserve changelog | 2989 | akolouthia2 | 2989–3555 |
| git-log-fuller | 143 | 4-way tie | 143 |

**Win counts over the 26 complete lanes: AKOLOUTHIA-2 18, DAEDALUS-D 5, DENDRONS 3.**
The earlier note in this session's working memory (DENDRONS 13 / DAEDALUS-D 6 / AKOLOUTHIA-2 6)
was computed from a partial receipt file and is **wrong**; this table supersedes it.
Ties are pervasive: on 14 lanes the top four candidates differ by ≤ 5 tokens.

### 2b. Adding `lakonikos-d` (`bench/x19/ankyra-lanes.jsonl`, 28/28 lanes)

`base` = min(LAKONIKOS-D, DENDRON-S, AKOLOUTHIA-2), measured in-process.

- LAKONIKOS-D beats the six-candidate minimum on **10 lanes**: de-kb −11, bibliography −10,
  email-thread −5, kb-article −10, llm-answer −10, meeting-transcript −9, readme −10,
  node-stacktraces −7, ops-ls-l-bin −9, ls-full-iso −10, git-log-iso −10.
- Sum over all 28 lanes: **30,149 → 30,048 (−101)**.
- On the other 18 lanes it ties exactly.

So: **the general-purpose leader is LAKONIKOS-D**, not DAEDALUS-D, and it was invisible
because it was never registered. It is registered as of this turn (`lakonikos-d`).

## 3. Leaders by category (28 lanes, measured this turn)

`base` = min(LAKONIKOS-D, DENDRON-S, AKOLOUTHIA-2); `+M` = METATHESIS on top of that base.

| Category | Lanes | Leader | M | Prevailing mechanism |
|---|---|---|---|---|
| **Prose / KB / email / meeting / readme** (7) | de-kb, kb-article, llm-answer, email-thread, meeting-transcript, readme, bibliography | **LAKONIKOS-D** | 481 / 640 / 696 / 520 / 411 / 678 / 699 | pure grammar + terse contract; every pre-transform codec is identity here |
| **Markdown / docs** (2) | spring trace, miniserve changelog | DENDRONS / AKOLOUTHIA-2 | 963 / 2989 | brace-tree on `/` and `.`, plus AP elision on the changelog |
| **Logs** (2) | node-stacktraces, openstack-loghub-26 | LAKONIKOS-D / DENDRONS | 332 / 1008 | grammar; HORA (−21 on openstack, X13) is the only pre-transform that pays |
| **Directory listings** (2) | find-listing, ops-ls-l-omega | DENDRONS / LAKONIKOS-D; **+METATHESIS on find-listing** | 1288 / 954 | brace-tree; plus column-major with fixed-offset columns |
| **ls -l variants** (2) | ops-ls-l-bin, ls-full-iso | LAKONIKOS-D | 238 / 395 | grammar |
| **Numeric CSV / tables** (6) | vix, aapl, csv-8, sp500-200, df-h, psql, kubectl | **METATHESIS on vix**; AKOLOUTHIA-2 / DENDRONS elsewhere | 871 / 1490 / 1695 / 4262 / 171 / 355 / 326 | transposition only pays when columns are near-constant |
| **Git / numstat** (3) | git-numstat, git-log-iso, ops-git-log-stat, git-log-fuller | DENDRONS / LAKONIKOS-D | 1904 / 1520 / 3458 / 143 | brace-tree |
| **Structured non-tabular** (3) | chart.svg, dump.sql, node-stacktraces | AKOLOUTHIA-2 / LAKONIKOS-D | 330 / 703 / 332 | AP elision; grammar |

**Where the remaining headroom is.** Prose is saturated: seven of seven prose lanes take
LAKONIKOS-D and every rule-based pre-transform written so far (including the two written
this turn) is identity there. The headroom is in *tables*, and it is large — vix drops 36%.

## 4. Entries

### 4.1 CHIRON / ARIADNE / SIBYL / THOTH / SEQUOYAH — the base layer

- **Design.** CHIRON (`chiron.ts`) is a delimiter-free two-part-MDL text program: a rule tape
  plus a payload, with ops for dictionary reference, `×btn` repeat/fill, and script-tagged
  literals. ARIADNE (`ariadne.ts`) is the encoder: it mines **maximal repeats** with a suffix
  automaton (`mineSpans`, :245) and prices each candidate by exact integer net gain, then
  parses by DP (`parseAll`) and assigns glyphs (`renderBest`, :858). SIBYL adds single-token
  rules and a pooled alphabet. THOTH and SEQUOYAH are the clock-free, work-unit-bounded
  variants of the mining and the assignment.
- **Greedy or not.** Greedy hill-climbing over an exact objective, not a tournament. The
  assignment stage is **already** pair-aware (`hotPairs`), n-gram-aware (`hotN`, n = 3..5) and
  run-spelling-aware (`atomRuns`). *This matters: "make the glyph assignment pair-aware" is not
  a new idea in this repository — it shipped with ARIADNE.*
- **Citation (prior art).** Re-Pair (Larsson & Moffat, 1996); MR-RePair / RL-MR-RePair,
  Furuya et al., arXiv:1910.13479 and *Algorithms* 13(4):103, 2020 — ARIADNE's comment at
  :241 cites this explicitly and already implements the maximal-repeat variant; smallest
  grammar is NP-complete and APX-hard over fixed alphabets of size ≥ 17 (Hucke et al.);
  `O(log n)` approximations (Charikar et al.; Rytter; Sakamoto). **Grammar compression is a
  solved, cited problem; the novelty claims in this repository are about the message layer,
  not about the grammar algorithm.**
- **Time/CPU.** Work-bounded in the clock-free variants, wall-clock budgeted
  (`min(20000, 1200+len*1.1)` ms) in production DAEDALUS.

### 4.2 DAEDALUS (`daedalus`), DAEDALUS-D (`daedalus-dual`), LAKONIKOS (`lakonikos`), LAKONIKOS-D (`lakonikos-d`)

- **Design.** DAEDALUS is a predicted-arm portfolio over ARIADNE/SIBYL arms
  (`default`, `span12`, `span12+words`, `words`, `span36`, `flat`); an O(n) feature
  classifier picks the arms (`punctPct > 18 ⇒ span12`; `tokens < 300 ⇒ default`; else
  `span12+words`), `maxArms = 2`. DAEDALUS-D restricts the glyph pool to characters that
  cost one token under **both** o200k_base and cl100k_base. LAKONIKOS keeps the DAEDALUS
  wire and shortens the English decoder contract; **LAKONIKOS-D** does the same to
  DAEDALUS-D.
- **Greedy or not.** Tournament (arm portfolio) + greedy grammar.
- **Measured (this turn, 28 lanes).** LAKONIKOS-D is ≤ every other candidate on 28/28 and
  strictly better than the six-candidate frontier minimum on 10/28 (§2b). DAEDALUS-D is
  1–3 tokens *worse* than LAKONIKOS-D on the prose lanes and 5–16 worse on listings.
  PHALANX-A10 is worse than DAEDALUS on **every** lane in the X11 17-lane run and on every
  lane here (+57 to +290).
- **Citation.** No external citation; this is engineering on top of the cited grammar layer.
- **Time/CPU.** Time-bounded (wall clock) in production; `OMEGA_DET=1` pins the clock to 0
  so every deadline stays open and searches run to their natural end — deterministic but
  unbounded on large inputs.

### 4.3 AKOLOUTHIA / AKOLOUTHIA-2 (`akolouthia`, `akolouthia2`)

- **Design.** Arithmetic-progression elision across lines: a digit run at column *k* of line
  *i* is replaced by a marker when the same column above gives the same step; the reader
  computes `v(i−1,k) + (v(i−1,k) − v(i−2,k))`. v2 needs two matching terms, v1 three.
- **Greedy or not.** Greedy mark-everything + binary gate.
- **Measured (this turn).** AKOLOUTHIA-2 wins **18 of 26** complete lanes against the other
  five registered candidates — it is the single most frequent leader in the registry, and it
  is the leader on all the ops-table lanes (df-h 171, kubectl 326, psql 355, chart.svg 330,
  dump.sql 703) because those lanes are numeric and column-consistent. It ties LAKONIKOS-D
  or loses by 1–2 on prose. X11 measured 43/43 exact, −413 total (−1.26%).
- **Citation.** LeCo, arXiv:2306.15374 (delta and linear-model integer encodings); LogShrink
  (Li, Zhang, Chen, ASE 2023, DOI 10.1145/3597503.3608129); numeric token parsing for logs,
  arXiv:2408.05760. None of these is an LLM-decoded message-level codec; the message-level,
  two-term, LLM-readable form is the only part claimed as new, and only as a measurement.
- **Time/CPU.** CPU-bound, ≈2–3× plain DAEDALUS (the gates re-encode and re-count).

### 4.4 DENDRON / DENDRON-S (`dendron`, `dendrons`)

- **Design.** Brace-tree notation for path and URL lists: a run of lines sharing a first
  segment is written once as `dir/{a,b/{c,d}}`, expanded in order by the reader. DENDRON-S
  factors on `.` or `/`, whichever is cheaper by one-chat `M`.
- **Greedy or not.** Deterministic factoring + binary gate; two separator choices, which is
  a 2-way tournament *within* the codec.
- **Measured (this turn).** Leader on find-listing (1318), git-numstat (1904),
  ops-ls-l-omega (954), sp500-200 (4262), ops-git-log-stat (3458); ties elsewhere.
- **Citation.** Front coding (CIKM 2019, DOI 10.1145/3357384.3357972); block Re-Pair front
  coding (VLDB Journal 2020, DOI 10.1007/s00778-020-00620-x); bucketed front coding,
  Hu-Tucker front coding and Re-Pair-on-buckets are surveyed in Navarro, *Practical
  Compressed String Dictionaries* (2015), which also reports the directly relevant result
  that **string repetitiveness beats symbol-frequency bias** (i.e. Re-Pair > Huffman on
  dictionaries) — consistent with everything measured here.

### 4.5 METATHESIS (`metathesis`) — new in X19

- **Design.** *Column-major transposition of a rectangular table.* See §5.
- **Greedy or not.** Deterministic detection + binary gate over measured `M`; a 2-form ×
  5-join search inside the codec (a small tournament), all candidates verified bijective.
- **Measured.** vix-daily-1990 1369 → **871** (−498, −36.4%); find-listing 1318 → **1288**
  (−30, −2.3%). Identity on 26/28 lanes. Never worse than its own arm.
- **Honest status.** The X19 patch already contained a transposition family
  (`tabmin`, `plinthos`, `kiones`, `anastrophe`). I did not know that when I started, and
  METATHESIS was derived independently. Head-to-head on the four tabular lanes where both
  fire: METATHESIS 871 / 1288 / 1490 / 326 vs PLINTHOS=KIONES 897 / 1286 / 1476 / 366 —
  mine wins vix by 26, loses aapl by 14 and find-listing by 2, and kubectl is decided by the
  base arm. **METATHESIS is not a new mechanism; it is a new implementation of an existing
  in-repo mechanism, marginally better in aggregate.** It *is* strictly better than the
  pre-patch frontier the task named (DENS-2 / AKOLOUTHIA-2 / DAEDALUS-D / A10) on two lanes
  and never worse, which is the pareto claim I can defend.

### 4.6 ANKYRA (`ankyra`) — new in X19, NEGATIVE, shipped as a measured negative

- **Design.** Class-anchored constant elision. A constant that sits at a *computable*
  position — immediately after or before every run of digits (`digits`, `numDot`, `numSep`)
  or word, or at the start of every line — is deleted and re-inserted by one sentence naming
  the anchor class and the constant. Sites where the constant does not occur take a one-token
  exception marker `e`. Anchor classes: `digits /[0-9]+/`, `numDot /[0-9]+(?:\.[0-9]+)*/`,
  `numSep /[0-9]+(?:[.,:][0-9]+)*/`, `word /[A-Za-z]+/`, `line`. Search space: 5 classes × 2
  directions × constants up to 8–12 chars.
- **Why it is not redundant with the grammar (the argument that turned out to be wrong).** A
  literal-string grammar must emit a reference per occurrence because the digits in front of
  the constant change (`x="10"` vs `width="3.5"` share no literal context), whereas a class
  anchor is derived from the digit run itself and costs zero tokens per occurrence.
- **Greedy or not.** Exhaustive search over the rule space, scored by exact token counts,
  then a whole-message binary gate. Not greedy in the usual sense; not a tournament over codecs.
- **Measured (28 lanes, `bench/x19/ankyra-lanes.jsonl`, `OMEGA_DET=1`).** Plan probe: rules
  admitted on 2/28 lanes, 0 inexact, `rawDelta` 204, net +152 on *plaintext* tokens.
  Full gate: **28/28 identity.** chart.svg: plan said `numDot/after "\"" k=157 m=89`,
  rawDelta 47, contract 23 — and the real transposed arm came out at **369 vs 330 raw**.
  ops-ls-l-omega: plan said `line/after "-" k=159 m=2`, rawDelta 157, contract 29 — the real
  arm came out at **984 vs 954 raw**.
- **Why it dies (the general lesson).** Removing a constant that the grammar was already
  folding makes the *wire longer*, not shorter: the deletion breaks digrams and maximal
  repeats the dictionary was built on, and the loss exceeds the deletion plus the contract.
  Two independent pre-transform families (ANKYRA and STIGME) died this way this turn. Any
  future pre-transform must be filtered on **arm-measured** delta, never on plaintext delta.

### 4.7 STIGME (`stigme`) — new in X19, NEGATIVE

- **Design.** Digit-cluster punctuation elision: the separator inside a digit cluster
  (`.`, `:`, `-`, thousands separators) is positional, so it is deleted and one sentence
  names the cluster shape and the separator.
- **Measured.** Plan probe on plaintext: 16/28 lanes "win", net +6407 — **an artefact**. The
  plaintext digit clusters are ~90 % gone in the wire. Full gate on 3 lanes: 144 s, all
  `mode:"raw"`. Superseded; do not ship.
- **Lesson.** Same as §4.6: a plaintext-token estimate of a pre-transform's value is not
  evidence.

### 4.8 Other registered X19 additions (from the patch, re-measured only where stated)

- `hemera` — calendar-date entailment (consecutive civil dates, trailing ms fields).
- `hora` — clock-time entailment (constant-step `HH:MM(:SS)`). Measured X13: openstack
  −21 (1008 → 987), identity elsewhere. Contract 23 tokens.
- `stathmos` — fixed-width decimal trailing-zero stripping; fires on 1 lane (vix 1212 vs
  1369 in X17 — note that METATHESIS now beats this by a wide margin on the same lane).
- `tabmin` / `plinthos` / `kiones` / `anastrophe` — the column-major transposition family,
  §4.5. `anastrophe` additionally gates on duplicate columns (`hasDuplicateColumn`) and long
  duplicate runs.
- `gnomon`, `synartesis`, `paradeigma`, `enthymeme`, `epagoge`, `elleipsis` — entailment
  elision for REST/lockfile/JSON/trace structures; not re-measured this turn.
- `phalanx*` and `veritas-*` — the ASCII-only fixed-pipeline family. PHALANX-A10 is worse
  than plain DAEDALUS on every lane in both the X11 run and this turn's run.

### 4.9 Label-only entries

There are **124 entries** in `src/lib/omega/registry.ts` as of this turn (6 were added by
this turn: `lakonikos-d`, `stathmos`, `hemera`, `hora`, `stigme`, `ankyra`, plus
`metathesis`). Everything not covered above is described only by its registry `label`, was
not re-read or re-measured here, and carries no measurement claim from this turn.

## 5. METATHESIS — full design spec

### 5.1 Mechanism

Grammar compression mines repeated substrings over the whole text, so *in theory* the order
of the values should not matter. In practice it matters a great deal, because what the
grammar must spell out is not only the dictionary entry but the **sequence of references**.
Row-major, every row interleaves several different value distributions — a date, four prices,
a volume — so adjacent references never repeat. Column-major, each column is a long run of
same-distribution values, and when a table carries near-constant columns, whole columns
become repeatable blocks.

Concretely, `vix-daily-1990.csv` has `OPEN == HIGH == LOW == CLOSE` on every row. Row-major,
the grammar sees `1990-01-02,17.240000,17.240000,17.240000,17.240000` — a fresh random-looking
string per row. Column-major, columns 2–5 of the transposed text are *identical to each other*,
so one column is a repeat of another and the grammar emits it once.

This is a **different axis** from every other codec here. DENDRON-S factors shared *prefixes*
of a line; ELLEIPSIS and ANKYRA delete a *constant* at a fixed position; AKOLOUTHIA-2 elides a
number that continues an *arithmetic progression*. None of them reorder. The saving grows with
the homogeneity of a column rather than with the repetition of a literal.

### 5.2 What ships

```
a,b,c          a  d
d,e,f    ->    b  e        (one line per cell: rows*cols lines, column after column)
               c  f
```

Two serializations compete, and the cheaper by measured `M` wins:

- **`perCell`** — `rows*cols` lines, one cell per line, column after column.
- **`perColumn`** — `cols` lines, each holding one column's cells joined by the delimiter.

Three layout models are detected, in order:

1. **Delimiter tables** — every line splits into the same number of cells on one of
   `,` `\t` `|` `;`.
2. **Fixed-offset aligned columns** — split every line on runs of spaces/tabs; require the
   same token count everywhere and no trailing whitespace; then require each column to be
   consistently left-aligned (every token starts at the same offset) **or** right-aligned
   (every token ends at the same offset). Field *k* occupies `[F_k, F_k+W_k)` and is followed
   by exactly one space, so `W_k = F_{k+1} − F_k − 1`. A left-aligned column starts at its
   field start; a right-aligned column must end exactly one space before the next field.
   Working back from the last column — which is taken verbatim, so it must be left-aligned —
   fixes every boundary. **This is what makes `ls -l`-style tables work**, with a
   right-aligned size column; the obvious gap-column method rejects them.
3. **Gap-column tables** — a character position at which every line holds a space is a gap.

Guards: `MIN_ROWS = 6`, `MIN_COLS = 2`; the transpose must satisfy
`untranspose(transpose(x)) === x` on the actual bytes before it is allowed to compete; each
arm's decode must untranspose back to the input exactly; and the whole thing is gated on
measured one-chat `M` against the best arm on the untouched text. **The codec therefore
cannot lose on `M`.**

### 5.3 The contract

One English sentence, appended after the arm's own contract, applied *after* the arm's decode:

- delimiter, `perCell` (26 tokens for vix):
  `Column-major, 127 lines/column; row i = line i of every block; widths …` — no, for the
  delimiter form it reads
  `Column-major, 127 lines/column; row i = line i of each block, joined with ",". Undo after decoding.`
- delimiter, `perColumn` (25 tokens):
  `Column-major, one line per column; row i = cell i of every line, joined with ",". Undo after decoding.`
- fixed-offset (40 tokens for find-listing):
  `Column-major, 120 lines/column; row i = line i of every block; widths 34/6, col2 right, 1 space between, last bare. Undo after decoding.`

Measured contract lengths: 131 tokens for the first wording I wrote, 26–47 for the shipped
ones. The first version of the vix result was 976; shortening the contract to 26 tokens moved
it to **871**. Contract length is not a detail — it was 15 % of the result.

### 5.4 Measured (28 lanes, `OMEGA_DET=1`)

| lane | base | M | Δ | form | table | contract |
|---|---|---|---|---|---|---|
| vix-daily-1990.csv | 1369 | **871** | **−498 (−36.4 %)** | perCell | 127×5 delim | 26 |
| find-listing.txt | 1318 | **1288** | **−30 (−2.3 %)** | perCell | 120×3 fixed | 40 |
| aapl-2014.csv | 1490 | 1490 | 0 (perCell 1518, perColumn 1683) | — | 241×2 delim | — |
| csv-8.csv | 1695 | 1695 | 0 (perCell 1775) | — | 64×11 delim | — |
| kubectl-get-pods.txt | 326 | 326 | 0 (350) | — | 23×7 fixed | — |
| other 24 lanes | — | — | 0 | — | no rectangular table | — |

Total over 28 lanes: **30,048 → 29,520 (−528)**. Exact on 28/28; `metathesisDecode` reproduces
the input byte-for-byte on every lane.

### 5.5 LLM-decodability

- Hard constraints met: byte-perfect, exactly lossless, one chat message, no skills file, no
  system prompt. The sentence is plain English and sits at the end of the message.
- **Independent reader check:** `bench/x19/metathesis_decode.py` parses the sentence with a
  regex and rebuilds the table. It is given **only the printed sentence and the arm's decoded
  text** — no plan object, no side channel — so if it reproduces the bytes, the sentence
  really does carry everything a reader needs. That is the part of "an LLM can decode this"
  that can be checked mechanically.
- **Not checked:** no language model was run on the message this turn. `M` is a tokenizer
  count, not a model evaluation. Transposing a 127×5 table is mechanical but long, and I have
  **not** measured a model's success rate at doing it. That is an open risk, stated plainly.

### 5.6 Citations

- Column-store / vertical partitioning: Stonebraker et al., *C-Store: A Column-oriented DBMS*,
  VLDB 2005; Abadi et al., *The Design and Implementation of Modern Column-Oriented Database
  Systems*, Foundations and Trends in Databases 2012. The classical reason to transpose is
  analytic scan locality and per-column entropy coding — the second of which an LLM reader
  cannot do, which is exactly why the naive column-store argument does not transfer here.
- Transposition as a *compression pre-transform* for LLM-facing text: I found no prior art in
  this turn's searches. The searches were new-term and are listed in §7.
- Grammar layer: as §4.1.
- **In-repo prior art, discovered late and stated plainly:** `tabmin`, `plinthos`, `kiones`,
  `anastrophe` (all added by the X19 patch) already transpose. See §4.5.

## 6. Time- or CPU-bound summary

| Codec | Bound | Note |
|---|---|---|
| CHIRON / ARIADNE / SIBYL | work-bounded (KAIROS/THOTH/SEQUOYAH) or wall-clock (DAEDALUS `min(20000, 1200+len*1.1)` ms) | `OMEGA_DET=1` disables the clock ⇒ deterministic, unbounded |
| DAEDALUS / DAEDALUS-D / LAKONIKOS / LAKONIKOS-D | time-bounded in production; CPU-bound under `OMEGA_DET=1` | arm portfolio is 2–6× one encode |
| AKOLOUTHIA / AKOLOUTHIA-2 | CPU-bound, ≈2–3× plain DAEDALUS | gates re-encode and re-count |
| DENDRON / DENDRON-S | CPU-bound, 1–2 extra encodes | |
| METATHESIS | CPU-bound, 6–12 encodes (3 arms × up to 2 forms × 5 joins, gated) | ≈30–60 s/lane on 2 cores; the gate is the cost |
| ANKYRA / STIGME | CPU-bound, search over the rule space + 3 arms | both return identity on all 28 lanes |

## 7. Live searches run this turn (new terms, on sources not previously cited)

Three new searches, all live, all on material not referenced by any existing codec entry:

1. **`"front coding" bucketing "repetitiveness" string dictionary compression`** → Navarro,
   *Practical Compressed String Dictionaries*, [users.dcc.uchile.cl](https://users.dcc.uchile.cl/~gnavarro/ps/is15.2.pdf).
   Result that matters here: bucketed front coding plus Re-Pair on the buckets, and the
   finding that **string repetitiveness beats symbol-frequency bias** (Re-Pair > Huffman on
   dictionaries, except DNA). Consistent with everything measured in this repository, and it
   explains why entropy-style schemes keep failing here.
2. **Code formatting and LLM token budget** → arXiv:2508.13666, *The Hidden Cost of
   Readability: How Code Formatting Silently Consumes Your LLM Budget* (2025). Reports
   newline removal alone cutting Java tokens by 18.7–22 %. **Relevant but not admissible as
   support for this repository's whitespace codecs**: it measures *semantic* preservation and
   model task success, not byte-exact reconstruction. It is the only new source found that
   quantifies whitespace elision at all, and it is a lossy-codec paper.
3. **Grammar-based compression / smallest grammar / straight-line programs** → the
   approximation literature (Charikar et al. `O(log(n/g*))`; Rytter; Sakamoto's space-saving
   linear-time `O(log g* · log n)`; MR-RePair and RL-MR-RePair, arXiv:1910.13479;
   NP-completeness over fixed alphabets of size ≥ 17). **Conclusion: ARIADNE already
   implements the state of the art here** (maximal-repeat mining via suffix automaton, cited
   at `ariadne.ts:241`). There is no new grammar algorithm to import; the remaining gains are
   in the message layer, not the grammar.

On **newly-solved math problems from OpenAI** (task item f): I did **not** reach this. The
`openai/math` items I evaluated in earlier turns (e.g. item 128, factor-2 shortest common
superstring) had low codec relevance and I did not re-fetch new items this turn. This is an
unmet part of the task, stated plainly rather than filled in.

## 8. Runtime and tool honesty

**Tools that actually ran this turn:** `bash`; `git apply` of the X19 patch (506 files,
29,653 insertions — applied by removing `docs/codecs.md` and excluding `registry.ts` and 194
byte-identical files); `npm ci` (exit 0, 132 packages); `npx tsc --noEmit` (exit 0 after every
change); `esbuild` + `node` for every bench; `python3` for merging receipts; `web_search`
(3 live searches, §7); `start_process` for the long lane runs.

**Not run:** no language model was run on any message. No Lean toolchain exists in this
sandbox and no Lean proof was checked. No image search, no `fetch_page`, no GitHub API calls.

**Receipts:** `bench/x19/receipts/frontier-A.jsonl` (84 rows, complete),
`bench/x19/receipts/frontier-B.jsonl` (84 rows, complete),
`bench/x19/ankyra-lanes.jsonl` (28 rows, complete),
`bench/x19/receipts/` for the METATHESIS lane runs,
`bench/x19/metathesis_decode.py` for the independent reader.

**Parallelism:** two processes ran at a time on a 2-core, 3 GB sandbox. The frontier runs
used `bench/x19/frontier-run.sh` with a 420 s per-(lane,codec) cap; two lanes' `phalanx-a10`
rows did not return within it and are marked missing rather than estimated.

**Determinism:** every number quoted here was produced with `OMEGA_DET=1`, which pins the
encoder clock to 0 so deadline gates stay open and searches run to their natural end. These
are natural-end values, not production-budget values.

**Corrected this turn, against the session's earlier working memory:**

- The frontier leader counts (DENDRONS 13 / DAEDALUS-D 6 / AKOLOUTHIA-2 6) were computed
  from a partial receipt. The completed run gives **AKOLOUTHIA-2 18, DAEDALUS-D 5,
  DENDRONS 3** over 26 complete lanes.
- `lakonikos-d` was missing from every frontier table. It is the strongest general codec and
  is now registered.
- STIGME's "+6407 net" and ANKYRA's "+152 net" were plaintext-token estimates. Both are
  **0** once the real arm and contract are counted. Do not quote the plaintext numbers.
