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
  (`bench/x20/anadesmos_decode.py`) driven by `bench/x20/xcheck.py`.
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
   accept/reject test is per family, and a final whole-message gate compares against the base codec.
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
  0 lanes improved, 0 worse, all exact. Two arms were screened in the cascade and then rejected by
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
- **Status.** Registered. Not a tournament member. `ral`, `cols`, `nl`, `nlm`, `wrap` are kept
  measured-negative-but-gated on purpose: they cost nothing where they do not pay and they are the
  arms a future change can improve without re-deriving the safety argument.

### STATHMOS (`src/lib/omega/stathmos.ts`, `stathmos`)

- **Name.** σταθμός, "a weighing, a standard". Fixed-decimal CSV columns: trailing zeros are dropped
  and one `@dp` line gives the scale per column; LAKONIKOS-D wire; identity unless it pays.
- **Greedy or not.** No choice at all: if every data row of a column carries the same decimal scale,
  strip; else refuse. A header or one ragged row vetoes the column, which is why it finds nothing on
  files whose columns are not globally uniform.
- **Measured (X20).** Best-or-tied on 11 of 22 lanes in `frontier-x20.jsonl`; total 21,838 vs
  DAEDALUS 21,942 (−104). vix 1380 → 1212. It is subsumed by ANADESMOS's `dp` family, which generalises
  the same mechanism to regions and to CRLF, and beat it by 1 token on the only lane where both fire.

### LAKONIKOS (`lakonikos`) and LAKONIKOS-D (`lakonikos-d`)

- **Name.** Λακωνικός, "Laconian", i.e. laconic: the same wire and decoder as DAEDALUS with a shorter
  contract. LAKONIKOS-D pairs that contract with the DAEDALUS-D dual-tokenizer glyph pool.
- **Measured (X20, 22 lanes).** Best-or-tied on 10 lanes; **total 22,006 vs DAEDALUS 21,942, i.e. +64
  worse in sum**: it wins 1–10 tokens on prose/KB/email/meeting/bibliography/readme lanes (e.g.
  de-kb 481) and loses on CSV and table lanes (aapl 1587 vs DENS-2 1490) because the D wire pays more
  than the shorter contract saves there. It is nevertheless the correct base for ANADESMOS: the arm
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
- **Measured (X11 + X20).** X20 sum over 22 lanes: 21,543, **−399 vs DAEDALUS — the best total of any
  single key measured**, best-or-tied on 9 lanes (chart.svg 330, dump.sql 703, df-h 171, kubectl 326,
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
- **Measured (X20, 22 lanes).** DAEDALUS 21,942 (the reference). DAEDALUS-D 22,198, **+256 worse**, and
  best-or-tied on 0 of 22 lanes. X11 found the same shape (D below DAEDALUS by 1–3 tokens on six prose
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
- **Measured (X20, 22 lanes).** Sum 21,802 (−140 vs DAEDALUS); best-or-tied on 6 lanes; it is the
  outright leader on the two long path-list lanes: find-listing 1318 and git-numstat 1904 (vs AKOLOUTHIA-2
  +132 worse there). Note `dendron` (the `/`-only variant) never beat `dendrons`, consistent with the
  separator choice mattering.

### GRAMMA (`gramma`)

- **Name.** γραμμα, "a letter, a small sign": notation-dialect menu, the layout regenerated from the
  reader's formatting priors, each dialect gated byte-exact.
- **Measured (X20).** Sum 21,942 = DAEDALUS exactly; it is identity on all 22 lanes. Not a source of
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

## Leaders by category (X20: 22 lanes with numbers in `frontier-x20.jsonl`)

Best `M` per lane among the measured keys, then grouped. "tie" means equal `M`, same arm quality.

| Category | Lanes | Leader (M) | Runner-up / note |
|---|---|---|---|
| Prose, KB, email, meeting, readme | de-kb 481, node-stacktraces 332, bibliography 699, email-thread 520, kb-article 640, llm-answer 696, meeting 411, readme 678, ls-full-iso 395, git-log-iso 1520 | **LAKONIKOS-D** (= STATHMOS = ANADESMOS, all identity on these lanes) | DAEDALUS is 1–10 tokens above on each; no measured codec beats LAKONIKOS-D on prose |
| Ops tables | df-h 171, kubectl 326, psql 355 | **AKOLOUTHIA-2** | LAKONIKOS-D/ANADESMOS 269/380/387 — a 60–100 token gap that no X20 arm closed |
| Path and URL listings | find-listing 1318, git-numstat 1904 | **DENS-2 (`dendrons`)** | AKOLOUTHIA-2 +132 worse on numstat |
| Structured numeric | chart.svg 330, dump.sql 703 | **AKOLOUTHIA-2** | |
| CSV | vix 1211, aapl 1490, csv-8 1695, sp500 4262 | vix: **ANADESMOS** 1211 (STATHMOS 1212); aapl/csv-8/sp500: **DAEDALUS = DENDRON = DENS-2 = GRAMMA** 1490/1695/4262 | LAKONIKOS-D is 97/13/81 tokens worse on those three CSVs: the D glyph pool costs more than the terse contract saves there |
| Logs | openstack-loghub-26 1008 | **DENS-2/DENDRON/DAEDALUS** tie | LAKONIKOS-D 1052 |
| Long changelog/trace markdown | spring-framework trace, miniserve changelog | not in the frontier receipt (still running); ANADESMOS = LAKONIKOS-D exactly, identity | |
| General corpus, 32 README/CHANGELOG/LICENSE files | all 32 | **no codec separates**: ANADESMOS = LAKONIKOS-D on every lane measured so far (15 of 32 at the time of writing), all exact | the honest generality statement for X20 is "never worse, occasionally better", not "broadly better" |

## Frontier restatement (X20)

The X11 claim was: the frontier is DENS-2, AKOLOUTHIA-2, DAEDALUS-D, A10. Re-measured on 22 of the 26
lanes with `bench/x20/frontier.sh` (nine keys, `M` = one-chat o200k tokens):

- **AKOLOUTHIA-2 is a leader and the best single key in total** (21,543; −399 vs DAEDALUS; 9/22 lanes best-or-tied).
- **DENS-2 is a leader on path/URL listings** (find-listing, git-numstat) and ties on four CSV/log lanes; total 21,802.
- **DAEDALUS-D is not a leader**: +256 tokens vs DAEDALUS in total, 0 of 22 lanes won. Its only role is
  as the wire under LAKONIKOS-D and ANADESMOS.
- **A10 is not a leader**: worse on every X11 lane it completed and it timed out on a 40 KB input; it was
  not even run in X20 for that reason.
- Two names must be **added** to the frontier: **STATHMOS** (11/22 best-or-tied, −104 total, the only key
  that beat DAEDALUS on CSV) and **ANADESMOS** (never worse than LAKONIKOS-D on any of 58 measured lanes,
  −169 on vix, and the only key that beats STATHMOS where both fire).
- Restated: the per-lane frontier on this lane set is `min(AKOLOUTHIA-2, DENS-2, STATHMOS→ANADESMOS,
  DAEDALUS)`; LAKONIKOS-D is the contract-cost leader on prose but loses on tables and CSV, and neither
  DAEDALUS-D nor A10 is on the frontier. `frontierMin` in the receipt is a tournament minimum over those
  keys and is reported as an upper bound, not as a shippable codec.

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
- **Not** measured, and therefore not claimed: any LLM decoding the wire. No model endpoint exists in
  this sandbox for that purpose, so "readable without a skills file" is a *design* property (strict
  one-sentence templates, every sentence parseable) and a byte-level self-check, not an LLM
  evaluation. A human or model reader study is the obvious next experiment and is not reported here.
- No Lean/Coq proof was checked; no FliPpr-style inversion proof was written — the guarantee is
  empirical (encode→decode equality on every lane plus 400 fuzz cases), not proved.
- Corpus files live in `node_modules`, which is git-ignored, so the corpus is reproducible only via
  `bench/x20/corpus-manifest.json` (paths + byte sizes + SHA-256 prefixes), not from this repo alone.
