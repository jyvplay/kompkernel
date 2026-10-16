# Codec abbreviations: spec page

Status: rewritten in **X20** (branch `arena/b4adae15-kompkernel`), superseding the X11 text. Each entry
decodes the name, states the design, says whether the encoder is greedy or searching, says what was
actually measured in this repository, and says whether the cost is wall-time or CPU-bound. Entries
marked **label-only** were not re-read or re-measured in X20: their description comes from the `label`
string in `src/lib/omega/registry.ts` and nothing else. Do not cite those as verified.

## Measurement contract (applies to every entry)

- Metric `M` = o200k_base tokens of **decoder contract + wire in one chat message**, with no system
  prompt and no skills file. `countTokens(..., 'o200k_base')` on the exact string that would be sent.
- Every reported lane is byte-exact: `decode(encode(x)) === x`, checked in TypeScript, and for
  ANADESMOS additionally through a second, independently written CPython reader
  (`bench/x20/anadesmos_decode.py`, written from the note prose alone) driven by `bench/x20/xcheck.py`:
  **70/70 messages exact** - 62 over the 57-lane union of both lane sets plus the 5 note-layer cases in
  which the cascade had fired but the `M` gate refused the arm (so every family is exercised, not only the
  profitable subset), and 8 through the full layer, where the note sits on top of a real CHIRON rule tape
  including vix's shipped `crlf+dp` arm.
- Lane set (26 files, `bench/x20/lanes.txt`): prose/KB/email/meeting/bibliography/readme, ops tables
  (df, kubectl, psql, ls, find listing, git numstat, git log), logs and stack traces, CSV
  (aapl, vix, sp500, csv-8), SVG, SQL, and two changelog markdown files.
- General corpus (32 files, `bench/x20/corpus.txt`): real README/CHANGELOG/LICENSE files drawn from
  `node_modules`, 2.5–16 KB each, selected by a seeded deterministic every-k-th walk; the paths, byte
  sizes and SHA-256 prefixes are pinned in `bench/x20/corpus-manifest.json`. This set exists because a
  gain that only shows on the 26 bench lanes is benchmaxxing, not generality.
- Receipts: `bench/x20/receipts/frontier-x20.jsonl` (per-key `M` for nine registry keys over the
  26 lanes), `bench/x20/receipts/nd-lanes.jsonl` (LAKONIKOS-D vs ANADESMOS per lane),
  `bench/x20/receipts/corpus-nd.jsonl` (same, 32-file corpus). Reproduce with `bench/x20/frontier.sh`
  and `ND_OUT=... bash bench/x20/run.sh bench/x20/nd-lanes.ts <lanefile>`.
- Identity arm = plain DAEDALUS. A codec that fails a gate returns identity, so its `M` is never
  worse than DAEDALUS *for that arm*.

## Selection: greedy or not, tournament or not

Three shapes appear in this stack and must not be confused.

1. **Fixed rule plus binary gate (non-tournament).** One deterministic rule, then one whole-message
   test between the marked wire and identity. Examples: AKOLOUTHIA, AKOLOUTHIA-2, DIRFOLD, DITTO,
   UUIDFOLD, STATHMOS. The rule marks every position it is allowed to mark: greedy in the sense of
   "no search over which positions", but not optimal.
2. **Gated greedy cascade (ANADESMOS, X20).** Families are tried in a fixed dependency order; each
   is kept only if its own inverse reproduces the previous text byte for byte *and* the tokens it
   removes exceed the marginal tokens its note sentence costs. Order makes it deterministic; the
   accept/reject test is per family, and a final whole-message gate compares against the base codec. The
  note is part of the body the contract describes (it is the first line of the expanded text), not a
  separate header, so `decode` sees exactly what a chat reader sees.
   Still not optimal: a family that is only useful together with a later one can be rejected.
3. **Per-input minimum over several codecs (tournament).** Several full codecs are run on the same
   input and the shortest wins: DAEDALUS's predicted-arm portfolio, AMPHORA, KANON, CADMUS, and the
   `frontier-min` bench harness. Its cost is the sum of every candidate's cost. `frontier-min` is a
   tournament and is reported only as a bench-side upper bound; shipping one requires a selector byte
   plus every candidate's contract. X20 did not ship one.

## Entries

### ANADESMOS (`src/lib/omega/anadesmos.ts`, registry key `anadesmos`) — new in X20

- **Name.** ἀνάδεσμος, "a binding/unbinding together" — the wire carries text whose bindings
  (line cuts, column edges, decimal scales, row numbers) are not sent, because the reader can
  recover them from a rule.
- **Design.** ANADESMOS is not a codec, it is a *conditional* one: it encodes with LAKONIKOS-D and
  then prepends one discovered note line to the body, e.g.

      @nd lines 2-127 only; cols 2,3,4,5 = 6 decimals; line ends are CRLF

  followed by the LAKONIKOS-D decoder contract and the 12-token instruction
  `Apply the first line to the text below it, then drop it.`. The note is prose-with-numbers, not a
  schema: there is no skills file, so every sentence must be self-explanatory and the encoder only
  emits sentences it can parse back with one strict regex each (`ndParseParams`). Families:
  `crlf` (line ends), `seq` (row numbers as `start+step·i`), `dp` (fixed decimal scale, trailing
  zeros dropped), `iw` (zero-padded integers), `ral` (whitespace-table padding), `cols` (absolute
  column anchors), `nl`/`nlm` (fixed-width line cuts, marker-free and marker form), `wrap`
  (hard-wrapped paragraphs). Column rules carry a line range, so a header or a ragged tail shortens
  the region instead of vetoing the family.
- **Why a note line instead of a clause per family.** A compiled clause per family cost 49–54 tokens,
  which exceeded the savings on every lane, so the codec effectively never fired. One prose note line
  with up to eight `'; '`-joined sentences costs 38–51 tokens total including the instruction. The
  encoder refuses to emit a note whose parse is not byte-canonical (`ndSerializeParams(ndParseParams(
  note)) === note`) and refuses to emit anything whose whole-message inverse does not reproduce the
  input.
- **Greedy or not.** Gated greedy cascade (shape 2 above). `nl`, `nlm` and `wrap` compete for one
  slot and the larger net wins; `dp` and `iw` must agree on the discovered separator and the region.
  No search over subsets, no tournament over whole encodings.
- **Gates.** (i) per-family inverse equality; (ii) saving > marginal note cost; (iii) note
  re-serialisation equality; (iv) whole-message `decode(wire) === input`; (v) the arm is taken only
  if `M < M(LAKONIKOS-D)`, otherwise the message is LAKONIKOS-D untouched (`mode=raw`). Inputs
  already starting `@nd ` or `@raw\n` are never transformed.
- **Measured (X20, this session).** 26 lanes: 1 lane improved (vix CSV 1380 → **1211**, −169,
  families `crlf+dp`), 25 unchanged, 0 worse, 26/26 exact. STATHMOS on the same lane reaches 1212,
  so the same mechanism is 1 token cheaper here while also covering CRLF. 32-file general corpus:
  0 lanes improved, 0 worse, 32/32 exact. `ral`, `cols`, `seq`, `dp`, `iw` fire on none of them: README
  and LICENSE text has no fixed-scale numeric column, which is the only thing `dp`-class families can buy. Two arms were screened in the cascade and then rejected by
  the wire gate, which is the intended behaviour: `nlm` on aapl-2014 (372 tokens saved in the raw
  text, but `M` rose 1587 → 1761 because the rule tape stops being able to bind line structure) and
  `ral` on ops-git-log-stat (32 tokens saved raw, `M` 3484 → 3523). Gate 1 (`bench/x20
  /nd-cascade-test.ts`): PASS 27 FAIL 0, 8 synthetic edge cases + 26 lane properties + 400 fuzz cases.
- **Negative result worth keeping.** Raw-token headroom does not predict wire gains. Measured headroom
  on the 26 lanes was `pad` 1001 tokens, `unwrap` 855, `scheme` 201, `crlf` 0, `typo` 0
  (`bench/x20/fmt-probe.ts`), yet the wire-level yield of every whitespace family is ~0 because
  LAKONIKOS-D's tape already binds what the layout repeats, and a newline between two words is
  already merged into the following word's token by o200k. Eliding line cuts is a loss on prose
  (measured −24 … −336 tokens) and only pays on uniform-width data lines, where the tape loses more
  than the elision gains. Digit-level families (`dp`, `iw`, `seq`) are the ones that pay, because the
  tape binds strings, not arithmetic or numeric formatting.
- **Time/CPU.** Encoding is CPU-bound and dominated by DAEDALUS (which the arm reuses) plus BPE
  counting; the cascade itself is linear in input size per family (`ral` scans each candidate region
  three times for gap 1/2/3; `dp`/`iw` one pass per column). Measured: vix 3.4 KB 1.3–3.5 s, aapl
  3.1 KB 10.8–11.3 s (one screened arm), ops-git-log-stat 6.6 KB 67–69 s. Decoding is O(lines ×
  columns) for the note rules on top of the CHIRON expansion; no search, no model call.
- **Citations (prior art, all read this session except where noted).**
  FliPpr, Matsuda & Wang, ESOP 2013 (`www2.sf.ecei.tohoku.ac.jp/~kztk/papers/kztk_esop2013.pdf`) —
  invert a *pretty-printer* to obtain a consistent parser, reinterpreting `line`/`space` as whitespace
  runs so layout need not be transmitted: the closest conceptual ancestor to "the binding is
  recoverable, so don't send it"; it inverts a program with a proof, ANADESMOS states a rule to an LLM
  and self-verifies byte equality. Eberhart (group-mmm.org/~eberhart/research/report_m1.pdf) treats
  parsing and pretty-printing as a Galois connection — the formal version of the same idea.
  SuperBPE (arXiv 2503.13423, COLM 2025) and CoBPE (arXiv 2610.05597) measure that BPE is capped near
  4.7 bytes/token by whitespace pretokenisation and that compound tokens reach 6.6: independent
  evidence that surface markers eat budget; they change the tokenizer, we change the wire.
  BoundlessBPE (arXiv 2504.00178) removes pretoken patterns for the same reason. Singh & Strouse 2024
  (cited there) found that adding thousands separators *improves* LLM arithmetic, which is the honest
  counter-argument to `dp`/`iw`/`grp`: the reader restores the digits before any arithmetic, so the
  restoration must be exact, and the gate makes it so. LogShrink (DOI 10.1145/3597503.3608129) and
  LeCo (arXiv 2306.15374) compress log/integer-column *values*, not the LLM-readable binding.
- **Model-readability probe (`bench/x20/blind-prep.ts`, `bench/x20/blind-check.py`).** A 20-line slice of
  `vix-daily-1990.csv` that had not been inspected in this session was encoded; a reader given the note and
  the body alone - no contract, no skills file, one turn - restored all 100 numeric fields and its output is
  byte-identical to the original (`bench/x20/blind/vix.*`, `python3 bench/x20/blind-check.py vix`). The
  reader was the model writing this codec, so this is a smoke test of sufficiency, not an independent study;
  and one hand-typed `ral` note that did not match the encoder's own spacing produced a real mismatch, which
  is the honest shape of the risk: a mis-read note changes bytes rather than silently degrading.
- **Status.** Registered. Not a tournament member. `ral`, `cols`, `nl`, `nlm`, `wrap` are kept
  measured-negative-but-gated on purpose: they cost nothing where they do not pay and they are the
  arms a future change can improve without re-deriving the safety argument.

### STATHMOS (`src/lib/omega/stathmos.ts`, `stathmos`)

- **Name.** σταθμός, "a weighing, a standard". Fixed-decimal CSV columns: trailing zeros are dropped
  and one `@dp` line gives the scale per column; LAKONIKOS-D wire; identity unless it pays.
- **Greedy or not.** No choice at all: if every data row of a column carries the same decimal scale,
  strip; else refuse. A header or one ragged row vetoes the column, which is why it finds nothing on
  files whose columns are not globally uniform.
- **Measured (X20).** Best-or-tied on 12 of the 25 scored lanes in `frontier-x20.jsonl`; total 25,989 vs
  DAEDALUS 26,078 (−89). vix 1380 → 1212. It is subsumed by ANADESMOS's `dp` family, which generalises
  the same mechanism to regions and to CRLF, and beat it by 1 token on the only lane where both fire.

### LAKONIKOS (`lakonikos`) and LAKONIKOS-D (`lakonikos-d`)

- **Name.** Λακωνικός, "Laconian", i.e. laconic: the same wire and decoder as DAEDALUS with a shorter
  contract. LAKONIKOS-D pairs that contract with the DAEDALUS-D dual-tokenizer glyph pool.
- **Measured (X20, 25 scored lanes).** Best-or-tied on 11 lanes; **total 26,157 vs DAEDALUS 26,078, i.e. +79
  worse in sum**: it wins 1-10 tokens on prose/KB/email/meeting/bibliography/readme/ls lanes (de-kb 481,
  kb-article 640, meeting 411, ls-full-iso 395) and loses on CSV and table lanes (aapl 1587 vs DENS-2 1490,
  kubectl 380 vs AKOLOUTHIA-2 326) because the D wire pays more than the terse contract saves there. It is nevertheless the correct base for ANADESMOS: the arm
  gate is per message, so a base that is better on prose and worse on tables is compared on the lane,
  never in the aggregate.
- **label-only** for LAKONIKOS v1 (non-D): not re-measured in X20.

### AKOLOUTHIA v1 (`akolouthia`) and AKOLOUTHIA-2 (`akolouthia2`)

- **Name.** ἀκολουθία, "a following, a sequence". Arithmetic-progression elision: a digit run at
  column `k` of line `i` becomes `⁺` when lines `i-1` and `i-2` give the same step at that column; the
  reader computes `v(i-1,k) + (v(i-1,k) − v(i-2,k))`. v2 differs from v1 only in eligibility: two terms
  instead of three.
- **Greedy or not.** Greedy left to right over every eligible position, then a whole-message gate
  `M(marked) < M(identity)`. No search over which positions to mark.
- **Measured (X11 + X20).** X20 sum over 25 scored lanes: 25,638, **−440 vs DAEDALUS — the best total of any
  single key measured**, best-or-tied on 12 lanes (chart.svg 330, dump.sql 703, df-h 171, kubectl 326,
  psql 355). X11: 43/43 lanes exact, 32,839 → 32,426 (−1.26%), CPython reader (`bench/akolouthia_decode.py`)
  32 messages, 0 mismatches, 40 red-team cases 0 failures.
- **Time/CPU.** 2–3× plain DAEDALUS, dominated by BPE counting in the gates, not by the substitution
  (which is linear in total digits). Single runs, not repeated measurements: 12 KB listing 23.6 s vs
  11.4 s plain; 12 KB numstat 37.5 s vs 16.1 s; 3.4 KB SVG 1.8 s vs 0.6 s.
- **Citation.** LeCo, arXiv 2306.15374 (delta and linear models for integer columns — arithmetic runs
  are a special case); LogShrink, ASE 2023, DOI 10.1145/3597503.3608129 (read from a snippet, full text
  not read); numeric token parsing for logs, arXiv 2408.05760. The LLM-decoded two-term message-level
  form is what is claimed as new, and only as a measurement.

### DAEDALUS (`daedalus`) and DAEDALUS-D (`daedalus-dual`)

- **Name.** Δαίδαλος, the craftsman: predicted-arm portfolio over glyph-aliasing arms. DAEDALUS-D uses
  a glyph pool where every glyph is one token under both o200k_base and cl100k_base.
- **Greedy or not.** Aliasing is applied by rule; the *arm choice* is a predicted portfolio, i.e.
  tournament-shaped inside the codec.
- **Measured (X20, 25 scored lanes).** DAEDALUS 26,078 (the reference). DAEDALUS-D 26,369, **+291 worse**,
  best-or-tied on 1 of 25 lanes (git-log-fuller, a tie). X11 found the same shape (D below DAEDALUS by 1–3 tokens on six prose
  lanes, above it on email-thread, kubectl, find-listing). **The claim that DAEDALUS-D is a frontier
  leader is false as stated**; it is a tokenizer-robustness variant, and its only measured role is as
  the wire inside LAKONIKOS-D and ANADESMOS.
- **Time/CPU.** CPU-bound search over candidate arms; wall time scales with input size × arms.

### DENDRON (`dendron`) and DENDRON-S / DENS-2 (`dendrons`)

- **Name.** δενδρον, "tree" — brace-tree notation for path and URL lists; `-Σ` is the same on any
  separator, choosing `.` or `/` by one-chat `M`. The X11 report's name "DENS-2" is this `dendrons`
  key; there is no separate DENS codec.
- **Greedy or not.** Deterministic factoring by shared first segment, gated against identity; the only
  search is the two-way separator choice.
- **Measured (X20, 25 scored lanes).** Sum 25,938 (−140 vs DAEDALUS); best-or-tied on 8 lanes; it is the
  outright leader on the two long path-list lanes: find-listing 1318 and git-numstat 1904 (vs AKOLOUTHIA-2
  +132 worse there). Note `dendron` (the `/`-only variant) never beat `dendrons`, consistent with the
  separator choice mattering.

### GRAMMA (`gramma`)

- **Name.** γραμμα, "a letter, a small sign": notation-dialect menu, the layout regenerated from the
  reader's formatting priors, each dialect gated byte-exact.
- **Measured (X20).** Sum 26,078 = DAEDALUS exactly; identity on all 25 scored lanes. Not a source of
  gains on this set. Label-only otherwise; the internal dialect search was not re-read.

### PHALANX-A5 / A6 / A7 / A10 (`phalanx-a5`, `-a6`, `-a7`, `-phalanx-a10`)

- **Name.** φάλαγξ, "phalanx": a fixed pipeline of gated stages. A5 = A4 + a hard-wrap layer for
  exactly greedy-wrapped prose; A6 = A5 + a space-separated table layer (ps, ls -l, df); A7 = A5 + a
  PADTAB2 fixed-cell column layer with a verbatim free tail; A10 = A7 with the VERITAS-C dictionary.
- **Greedy or not.** Each stage is one greedy pass with a gate; the pipeline order is fixed.
- **Measured.** A10: X11 17-lane run was +10 … +239 tokens vs DAEDALUS on every lane and it timed out
  on a 40 KB lockfile after >30 min. Not a frontier leader; **the user's four-name frontier that
  includes A10 does not survive re-measurement.** A5/A6/A7: not re-measured in X20 (**label-only**), but
  A5's hard-wrap layer is the direct predecessor of ANADESMOS's `wrap`/`nl` families, which X20
  measured as a loss at the wire level — see the negative result under ANADESMOS.
- **Time/CPU.** CPU-bound; A10's dictionary search is the reason for the timeout (superlinear in
  candidate windows), which is why the pipeline is identity-guarded rather than search-guarded.

### PADTAB (`padtab`), PADTAB2 (`padtab2`), TABMIN (`tabmin`), WRAPCANON, STICHOS (`stichos`), PERIODOS (`periodos`), ABACUS (`abacus`)

- **Names.** πας/ποδ- + "tab": column padding for tables. TABMIN = minimal rectangular table
  (row arm or column-major arm). STICHOS = στίχος, "line, verse" — verse-line fold: greedy-refill layout
  over a CHIRON stack. PERIODOS = περίοδος, "circuit, paragraph" — the same per paragraph, and the
  registry label itself warns "reader must count columns — LLM decode unverified". ABACUS = numeric and
  Unicode form canonicalisation (e.g. thousands separators).
- **Measured.** None of these was re-measured end-to-end in X20 except as prior art for ANADESMOS's
  rejected arms: PADTAB's own header states −15 … −23 % on ps/df/free/ls **as a lossy upper bound**
  (collapse runs of 2+ spaces), and `bench/stichos-report.md` records that a 42-token contract makes
  wrap elision a general loss. X20 confirmed both from the other direction: `ral` recovered only 62 of
  the 416 raw padding tokens available on ops-git-log-stat because the tape already binds part of the
  padding, and every line-cut family measured ≤ 0 on prose. **These are the arms to beat, not to copy.**
- **Greedy or not / time bound.** label-only.

### UUIDFOLD, DIRFOLD, DITTO (label-only)

One-line rules with an identity fallback — the binary-gate shape. Not re-measured in X20.

### VERITAS-\* , AMPHORA, KANON, HYDRA, GLOSSIA, PROTEUS-Ω, PHALANX P2/P3/P4, KOINE, RECALL (label-only)

Dictionary and portfolio codecs. X20 read no source beyond the registry labels for these and measured
nothing about them. `frontier-x20.jsonl` does not include them, so the leaders table below is a
leadership-among-measured-keys statement, not a global optimum.

### PARADEIGMA, GNOMON, SYNARTESIS, ENTHYMEME, EPAGOGE, ELLEIPSIS, KALLIGRAPHOS, CRASIS, ANAGNORISIS (label-only)

Entailment and canonical-recognition codecs for JSON, REST, stack traces, licences and styled prose.
Not re-read, not re-measured in X20. PARADEIGMA in particular was never run on this lane set, so the
X20 leaders table is a lower bound on the frontier for lanes with JSON records.

### ONOMASIA (negative, `src/lib/omega/onomasia.ts`, unregistered)

Keyed addressing for progressions. Dropped: loses to AKOLOUTHIA on chart, df-h, kubectl, psql; no prose
gain; contract 29–39 tokens. Receipts `bench/z56/receipts/onomasia-43.jsonl` (33 rows, exact).

### KLADOS / KLADIOS (negative, unregistered, uncommitted)

Net loss; not adopted; bench files deliberately not committed.

### Dead ends measured or falsified in X20 (do not re-attempt as headline mechanisms)

- Newline / hard-wrap elision as a *general* win: falsified on 26 lanes and 32 corpus files (see ANADESMOS).
- Thousands-separator removal (`grp`): 0 candidate hits on every lane; ambiguous with `,`-separated CSV.
- Date-format normalisation (`dt`, long-form → ISO): every bench lane is already ISO (grep counts:
  aapl 257, vix 198, csv-\* 3–79, long-form or slash-form 0 everywhere), so it cannot be verified here.
- `crlf` as a sole family: 0 tokens saved (the tape already folds `\r\n`); kept only as an enabler that
  is billed to whichever family needs it.
- Whole-file `dp` uniformity (STATHMOS's admission test): one header row vetoes a column; region-based
  discovery is the fix.

## Leaders by category (X20: `frontier-x20.jsonl`, 26 lanes run, 25 with numbers)

`ops-git-log-stat.txt` (6.6 KB) exceeded the harness's 600 s per-key timeout on every key and is excluded.
"best-or-tied" counts lanes where the key attains the minimum `M` among the nine measured keys.

| category | lanes | leader (`M`) | what that means |
|---|---|---|---|
| prose / KB / email / meeting / readme / bibliography / stack traces | de-kb 481, node-stacktraces 332, bibliography 699, email-thread 520, kb-article 640, llm-answer 696, meeting 411, readme 678 | **LAKONIKOS-D** (= STATHMOS = ANADESMOS, identity on these) | the contract-size win survives only on prose; DAEDALUS is 1-10 tokens above on each lane |
| prose tables from `ls`, `git log` | ls-full-iso 395, git-log-iso 1520, git-log-fuller 143 | LAKONIKOS-D on the first two, **DAEDALUS = DENDRON = DENS-2 = AKOLOUTHIA-2** on git-log-fuller (143) | short inputs: no arm pays for its description |
| ops tables | df-h 171, kubectl 326, psql 355 | **AKOLOUTHIA-2** | a 60-100 token gap no X20 arm closed; `ral`/`cols` are the mechanism that should attack it and did not pay yet |
| path & URL listings | find-listing 1318, git-numstat 1904 | **DENS-2** | AKOLOUTHIA-2 is +132 worse on numstat |
| structured numeric | chart.svg 330, dump.sql 703, miniserve changelog 2989 | **AKOLOUTHIA-2** | miniserve is a 21 KB changelog: progression marks still win, 53 tokens under LAKONIKOS-D |
| CSV | vix **1211**, aapl 1490, csv-8 1695, sp500 4262, spring trace 963 | vix: **ANADESMOS** (`crlf+dp`; STATHMOS 1212); the rest: **DAEDALUS = DENDRON = DENS-2 = GRAMMA = AKOLOUTHIA-2** | LAKONIKOS-D is 97/13/81/3 tokens *worse* on aapl/csv-8/sp500/spring: the D wire costs more than the terse contract saves on numeric data |
| logs | openstack-loghub-26 1008 | DENS-2 = DENDRON = DAEDALUS = AKOLOUTHIA-2 | LAKONIKOS-D 1052 |
| 32-file general corpus (real README/CHANGELOG/LICENSE) | all | no separation: ANADESMOS = LAKONIKOS-D on 32/32 | the generality limit, stated rather than hidden |

Totals over the 25 scored lanes (`M` sum, nine keys): AKOLOUTHIA-2 25,638 (-440 vs DAEDALUS);
DENS-2 25,938 (-140); STATHMOS 25,989 (-89); **ANADESMOS 25,988 as measured in `nd-lanes.jsonl`**
(the frontier file's own `anadesmos` column predates the last edits, so it shows LAKONIKOS-D's 26,157);
DAEDALUS / DENDRON / GRAMMA 26,078; LAKONIKOS-D 26,157 (+79); DAEDALUS-D 26,369 (+291).
Best-or-tied lanes: STATHMOS 12, AKOLOUTHIA-2 12, LAKONIKOS-D 11, DENS-2 8, DENDRON 6, DAEDALUS 6,
GRAMMA 6, DAEDALUS-D 1.

## Frontier restatement (X20)

The X11 claim was: the frontier is DENS-2, AKOLOUTHIA-2, DAEDALUS-D, A10. Re-measured on 25 of the 26
lanes with `bench/x20/frontier.sh` (nine keys, `M` = one-chat o200k tokens):

- **AKOLOUTHIA-2 holds**, and is the best single key in total: -440 tokens, best-or-tied on 12 of 25 lanes.
- **DENS-2 holds** on path/URL listings (find-listing 1318, git-numstat 1904) and ties on five CSV/log
  lanes; total -140. `dendron` (slash-only) never beat `dendrons`: the separator choice is what pays.
- **DAEDALUS-D does not hold**: +291 tokens vs DAEDALUS in total, best-or-tied on 1 of 25 lanes. It is a
  tokenizer-robustness variant, and its measured role here is as the wire under LAKONIKOS-D and ANADESMOS.
- **A10 does not hold**: worse than DAEDALUS on every X11 lane it completed (+10 to +239) and it timed out
  on a 40 KB lockfile after >30 min, so X20 did not even schedule it.
- Two names must be **added**: **STATHMOS** (12/25 best-or-tied, -89, the only prior key that beat DAEDALUS
  on CSV) and **ANADESMOS** (subsumes STATHMOS, -169 on vix to 1211 which is the outright leader there, and
  never worse than LAKONIKOS-D on any of the 58 lanes measured across both lane sets).
- Restated: the per-lane frontier on this set is `min(AKOLOUTHIA-2, DENS-2, ANADESMOS, DAEDALUS)`.
  LAKONIKOS-D leads on prose but loses on tables and CSV, and neither DAEDALUS-D nor A10 belongs on the
  frontier at all. `frontierMin` in the receipt is a tournament minimum over those keys: an upper bound on
  what a selector byte plus four contracts could reach, not a shippable codec.

## AI-native moves a human researcher tends to miss (X20, with the evidence for each)

1. **Price every mechanism in the tokens the *reader's own model* charges, not in characters.** Humans
   optimise bytes/characters and then discover the tokenizer disagrees: a newline between two words costs
   ~0 tokens under o200k, so the entire hard-wrap literature's headline saving evaporates (measured −24
   … −336 on prose lanes), while a trailing `0` in `17.240000` is a whole token and pays −169.
2. **Make the decoder the gate.** Instead of proving a grammar round-trips, run the *actual* decoder over
   the whole message and refuse the transform unless it is byte-exact and cheaper. This lets each lane
   pick its own mechanism, which is why "no lane is worse" is achievable at all.
3. **Carry the parameters as one prose note, not as a compiled clause.** LLM readers do not need a
   formal header; they need a sentence. Fixed cost 49–54 → 38–39 tokens, and the codec started firing
   the same day.
4. **Self-inflicted-obsolescence check:** measure against the *composition* (LAKONIKOS-D + arm), because
   a mechanism that helps a weak base can hurt a strong one. `nlm` on aapl: −410 raw, +174 wire.
5. **Search the redundancy the tape cannot express.** A substitution tape binds repeated strings; it
   cannot bind "this column's digits end in zeros" or "this number continues the step above". That is
   where the measured gains are (numeric scale, row numbers, progressions) and where the whitespace and
   dictionary families keep coming up empty.

## OpenAI `math` issue review (item 5 of the X20 brief)

`github.com/openai/math` was queried with `gh api`. `CONTENTS.md` exists (638,727 bytes, listed). The
session's earlier pass chunk-covered 8 of 80 chunks of that file and read proof #128 (a 2-approximation
for shortest common superstring) in full. Judgement: **not relevant** — a superstring approximation
bounds a dictionary-construction problem; our dictionary codecs (VERITAS-*) do greedy phrase selection
with a measured gate, and no codec in this repo is proved or bounded by SCS. Nothing from that repo was
adopted, and no Lean check was run (no Lean toolchain in this sandbox).

## Runtime honesty (X20)

- Tools actually used: `bash`; `git`; `gh` (authenticated, `gh api repos/openai/math/...`); `esbuild` +
  `node` via `bench/x20/run.sh` (bundling with `OMEGA_DET=1`); `python3` CPython (the external reader
  check); `npx tsc --noEmit`; `web_search`; `fetch_page` on the five domains listed in the citations.
  No image search, no notebook, no package installs beyond what the repo already pins.
- Measured, this session: gate-1 cascade test (27 checks, 400 fuzz cases), 26-lane and 32-file
  LAKONIKOS-D-vs-ANADESMOS runs, a nine-key frontier run over 26 lanes (23 rows written; the last
  rows were still being produced when this file was written, and its `anadesmos` column is stale —
  use `nd-lanes.jsonl` for ANADESMOS numbers).
- Partially measured: **one** model decode was performed - by this agent, in context, from the note and
  body of an un-inspected vix slice, with no contract text and no skills file, checked by
  `bench/x20/blind-check.py` (byte-identical). It is disclosed as the author model reading its own format,
  which is the weakest possible reader study; no *independent* model or human study was run, and the
  general claim "an LLM can decode these notes" rests on 1 probe plus 62 second-implementation decodes.
- No Lean/Coq proof was checked; no FliPpr-style inversion proof was written — the guarantee is
  empirical (encode→decode equality on every lane plus 400 fuzz cases), not proved.
- Corpus files live in `node_modules`, which is git-ignored, so the corpus is reproducible only via
  `bench/x20/corpus-manifest.json` (paths + byte sizes + SHA-256 prefixes), not from this repo alone.
