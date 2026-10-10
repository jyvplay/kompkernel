# Y10 — HYLE (ὕλη, "matter/substrate"): tier-5 ultrareview, fractal depth+++, canonical regeneration, honest contract accounting, fold × borrowed-arm composition, deep research, code module, real-life engineering

Deliverable: `src/lib/omega/hyle.ts` (73 281 B), registered in `src/lib/omega/registry.ts`
and `src/workers/codec.types.ts`. Verification artifacts: `bench/hyle_decode.py`
(independent CPython reader), `bench/hyle-crosscheck.sh` (driver), `bench/hyle_audit.ts`
(honest-billing receipt script).

---

## 0. WHAT Y10 IS AND WHY IT EXISTS

Every codec in this repo before Y10 handles *repetitive layout* in one of four ways:

| class | codecs | what it does to layout | cost per row |
|---|---|---|---|
| move | HYDRA, KIONES, PAX | transpose / re-order so like values touch | Θ(1) but pays a full re-emit |
| dictate | CHIRON | straight-line program over a cursor | Θ(1) instructions |
| difference | AION, EIDOS, MNEMOSYNE | emit Δ from the previous row | **Θ(n)** — one marker per row |
| enumerate | MOSAIC, SIGNET, GLOSSIA | template + per-slot value lists in 1-token glyphs | **Θ(n)** per free slot |

All four *transport* the data. None of them **derive** it. HYLE's claim is narrow and
sharp: a large class of real tool output contains columns that are **exact closed-form
functions of the row index** — sequence numbers, sizes stepping by a constant, k8s
pod-name suffixes, `Use%`, trading-day dates, month-of-year cycles, `Mounted on`
paths. For those columns the right move is not to difference or enumerate them but to
**delete them and state the generator once**: Θ(1) tokens per column, independent of
row count. That is the *canonical regeneration* mechanism, and it is why the tbl lane
moves 570 → 237 and 1006 → 352 tokens where the prior best honest number was 276/381.

Three things make this an AI-native codec rather than a classical one:

1. **The decoder already contains the formatter.** A byte-exact arithmetic decoder has
   no notion of "canonical"; an LLM reading `G0=@2014-01-02+344w-18,46,106,144,183,242,329`
   *knows* what a trading calendar is and can enumerate it. The wire is a specification,
   not a bitstream. This is only sound because the decoder's model of the world is
   shared, and it is only honest because we verify with a **second, independent
   implementation in a different language** (§H).
2. **The fold composes with the existing stack.** HYLE's fold emits *text*. That text is
   then handed to any existing codec's arm. Measured: fold alone 1588 → fold × KIONES
   1264 on `aapl-2014.csv` (§C). This is the orthogonal axis, and it is what turns a
   single-lane win into a Pareto improvement.
3. **Contract accounting is a first-class axis.** The repo leaderboard bills `|wire|`
   only (`registry.ts` `measure()` → `outTokens = countTokens(r.output)`), and
   `glossia.mosaicArm` bills MOSAIC's decoder prompt as 0, which propagates to EIDOS and
   AION. Re-billed honestly, `glossia=eidos=aion` on kubectl is **1272, not 211** — a
   1061-token under-bill. HYLE ships and bills its contract, and re-bills borrowed arms
   (§H, §"CODEBASE EVALUATION").

---

## A. FORMAL MODEL (A1–A7)

**A1 — admissible objects.** An encoder is a total function `E: Σ* → W` over UTF-8
strings, together with a decoder specification `C` (a natural-language contract) and a
decoder `D: W × C → Σ*`. Both `E` and `D` must terminate on every input; `D` must be
**total** — on an unrecognised or malformed wire it echoes the wire verbatim rather than
throwing (verified: one unparseable directive ⇒ whole-wire echo). No side channels, no
external state, no learned weights beyond those already in the decoding LLM.

**A2 — access model (the hard constraint).** One chat turn. One input, one output. No
`skills.md`, no system-prompt box, no retrieval, no tool calls, no multi-turn repair, no
white-box access to activations or gradients. The contract must therefore ride *inside*
the single message: `decoderPrompt = C + wire`. This excludes SIPIT-style inversion
(ICLR 2026) which needs hidden activations — recorded as an H∂ boundary in §B.

**A3 — counted resource.** `M = |wire|_tok + |C|_tok`, both counted with
`countTokens(·, 'o200k_base')` from `gpt-tokenizer`. Character counts, bytes and
bits-per-char are *reported* but never *optimised*: the objective is non-monotone in
them (§D-19, the Huffman+b64 falsification: 4.38 bpc → 2596 tokens). A secondary axis
is encoder wall-clock (ms), reported per file, because a fold that costs 157 s is not
usable interactively even when it wins on M.

**A4 — success predicate, with quantifier order.**
`success(file) ⟺ exact(file) ∧ M(file) + 3 < min(raw(file), best_prior(file))`.
`∀` over the file, `∃` over the codec's internal choices — i.e. the codec must find a
winning configuration *itself*, by measurement, not be told which fold to apply.
`>few` means the margin exceeds a handful of tokens; §C reports margins of 13–96.
`exact(file) ⟺ D(E(text), C) === text` byte-for-byte, checked in TypeScript *and* in
independent CPython.

**A5 — parameter regime, boundaries, units, tolerances.**
- `nHead ∈ {0,1,2}`: rows skipped by the generator (header, `|---|` separator). Boundary
  at 3: a third non-generated row means the block is not a table; no nHead > 2 is tried.
- Affine slots `A + D·r` with `r` the *data* row index (0-based after nHead); optional
  `m<M>` modulus and `z<W>` zero-pad width. Modulus semantics are
  **`v = a + ((d·r) mod M)`**, *not* `(a + d·r) mod M` — the base sits outside the
  modulus because real cycles count from 1 (months) or from a letter, not from 0. This
  was falsified and fixed (§D-2).
- Cycle/letter/date specs are tried only when the affine fit fails.
- Exception gate (indent fold): a block is admissible only if the number of lines
  needing an explicit override is `≤ max(4, floor(0.06·lines))`. Unit: lines. Tolerance:
  the 4-line floor exists so tiny files are not gated out by one stray line.
- Deadline: `budgetMs` (default 20 000; 180 000 for the full-mode composition sweep).
  On expiry the encoder returns the best variant found, never a partial wire.
- Separators tried: `,` `|` `\t` ` ` + space-run collapse. A space-run table is
  admissible only if **every non-final field is space-free** — otherwise field boundaries
  are not recoverable (§D-4).

**A6 — adjacent problems NOT substituted.** Not solved here: lossy summarisation,
semantic deduplication, retrieval, translation, prompt *rewriting*, arithmetic coding
with an LLM as the model, byte-level BPE retraining. Each is a real compression
technique and each fails A2 or A4; they are listed in §D so the reader can see they were
considered rather than overlooked.

**A7 — what HYLE is not.** Not a general-purpose text compressor. On 20 of the 31
holdout files it returns identity (0% savings) and says so. The honest corpus figure is
**raw 60 118 → M 53 162 = 11.6%**, entirely attributable to 11 files.

---

## B. OUTCOME SPACE H⁺ / H⁻ / H∂ + DECLARED EVIDENCE THRESHOLD

**Declared threshold before measuring** (so the goalposts cannot move): H⁺ requires
`exact = true` under *both* decoders, `M + 3 < min(raw, best_prior_honest)`, and a
reproducible receipt (file, winner string, wire, contract tokens, ms). A margin of 1–2
tokens is **not** H⁺, it is a tie. Anything requiring an unshipped contract, an
unexecuted LLM decode, or a leaked corpus-specific table is H⁻ regardless of the number.

**H⁺ (achieved, receipts in §C):**
1. `psql-output.txt` 675 → **268** (margin 96 over kiones' honest 364; 138 over its
   billed 363). Fold `T|3-26+G0123456`, arm `b`.
2. `df-h.txt` 570 → **237** (margin 39 over kiones 276). Fold `T_1-18+G01234+A5`.
3. `kubectl-get-pods.txt` 1006 → **352** (margin 29 over kiones 381). Fold
   `T_0-22h1+G0123456+A7`.
4. `aapl-2014.csv` 3108 → **1264** in full mode (margin 13 over AION's honest 1277, and
   429 over the fold alone at 1588). Fold `T,0-240h1+G0` × arm `k`.
5. **`dump.sql` 1795 → `650` in full mode — a win in the `mk` lane, not just `tbl`**
   (margin 82 over KIONES' 732, 163 over the honest 813 of chiron/glossia/eidos/aion/
   tachys, and 174 over the fold alone at 824). Fold `T,11-36+G01234567` × arm `k`.
   The mechanism here is the same one applied to a *repeated statement* instead of a
   table: the whole `INSERT` line, including a synthetic timestamp, is a function of the
   statement index —
   `G7= '2026-{1+1m9z2}-{1+1z2} {0+1m10z2}:{0+7m60z2}:00+00'` (month cycling `1+(r mod 9)`,
   hour `r mod 10 + 1`, minute `7r mod 60`, all zero-padded).
6. **Accounting H⁺:** a shipped, measured re-billing of the borrowed arms, which changes
   the leaderboard ordering on 3 of 4 tbl files (§"CODEBASE EVALUATION").
7. **Portability H⁺:** 20/20 wires decoded byte-exactly by an independently written
   CPython program that reads the contract prose, not the TypeScript (§H).

**H⁻ (failed, stated plainly):**
1. `markdown-table.md`: fast 219 vs best prior 203 → **loses 16**. Full mode 205 →
   **still loses 2** ⇒ tie/H⁻, not a win. Do not claim this file.
2. `vix-daily-1990.csv`: fast 2682, **full mode 822** (fold `T,0-126h1+G0` × KIONES) vs
   AION's honest **704** → still loses, by 118. It does beat raw (3412), CHIRON (1312
   composed / 1438 alone) and honest GLOSSIA=EIDOS (2013), so it is second best on the
   file — but second best is not H⁺. AION's Δ model on a 126-row CRLF date column is
   simply better than a stated calendar here.
3. `git-numstat.txt`: fast 3948, **full mode 2235** (fold `T\t8-399+G1` × CHIRON) vs the
   prior best 2146 — composition gained 1713 tokens and *still* loses by 89. `json-pkg` 1108 vs 794; `gh-api.json` 2348 vs 1198 — HYLE loses the JSON
   comparisons (brace/quote-dominated, no index-derived column). **`dump.sql` was expected
   to lose (fast 824 vs 732) and instead won in full mode (650)** — see H⁺ 5; the lesson
   is that fast-mode numbers understate composition, so no mk/ops file should be called a
   loss until it has had a full-mode run.
4. **General English prose: 0%.** `gh-prose` 1934 → 1934 identity, `agent-history.md`,
   `paper.tex`, `readme.txt`, `lic-mit.txt`, `email-thread`, `kb-article`,
   `llm-answer.md` all identity or arm-carried. The measured ceiling for prose in this
   repo is 0–2% (`front.mjs`, `holdout-work`). HYLE contributes nothing there and claims
   nothing there.
5. `page.html`: the indent fold is rejected by the exception gate (192/196 lines need
   overrides > max(4, ⌊196·0.06⌋)=11); `FLAT_TAGS={html,head,body}` did not rescue it.
   Earlier session notes claiming "page.html WIN 20 over kiones 576" are **retracted** —
   they do not hold in shipped code.
6. The held-out **LLM decode test was not executed** (no LLM API in the sandbox). The
   claim "an LLM can read this contract and regenerate the table in one chat turn" is
   therefore **downgraded to a design argument + a human-written second implementation**
   (§H3).

**H∂ (boundary — decidable only outside the access model):**
1. If white-box activations were allowed, SIPIT (ICLR 2026) reconstructs the exact prompt
   in provable linear time; HYLE would be unnecessary. Under A2 it is unusable.
2. If the decoder could call a tool (a calculator, a date library), the date/cycle specs
   could shrink further because the contract could say "trading days, US holidays"
   instead of listing 7 offsets. A2 forbids it.
3. If the contract could be amortised across many messages (a persistent system prompt),
   the 86–211 token contract would vanish and every tbl margin would grow by that
   amount. A2 forbids it; this is the single largest structural gain available to a
   *different* product shape, and it is stated here rather than smuggled in.

---

## C. FRONTIER: VERIFIED ACHIEVABILITY / IMPOSSIBILITY + EXACT OPEN INTERFACE

**C1 — verified achievability, tbl lane.** Honest `M = wire + contract`, o200k_base,
all rows `exact = true`. Prior-codec numbers from `bench/hyle_audit.ts` and
`bench/tmp/arms2.mjs` (478 s run); `billed` is what the leaderboard displays, `honest`
re-bills the arm's real decoder prompt.

| file (raw) | CHIRON | GLOSSIA=EIDOS=AION | HYDRA=TACHYS | KIONES | **HYLE fast** | **HYLE full** |
|---|---|---|---|---|---|---|
| df-h (570) | 269 / 308 / 309 | 132 / 132 / **1193** | 269 / 308 / 309 | 250 / 275 / 276 | **92 / 237 / 237** ✓+39 | 237 (arm b) |
| kubectl-get-pods (1006) | 436 / 475 / 476 | 211 / 211 / **1272** | 436 / 475 / 476 | 355 / 380 / 381 | **141 / 352 / 352** ✓+29 | 352 (arm b) |
| psql-output (675) | 367 / 406 / 407 | 203 / 203 / **1165** | 367 / 406 / 407 | 338 / 363 / 364 | **141 / 268 / 268** ✓+96 | 268 (arm b) |
| markdown-table (330) | 189 / 228 / 229 | 206 / 206 / **866** | 189 / 228 / 229 | 177 / 202 / **203** | 133 / 219 / 219 ✗−16 | **180 / 205 / 205** ✗−2 |

(cells are `wire / billedM / honestM`; for GLOSSIA the 1061/962/660-token
`mosaicDecoderPrompt` is the delta between billed and honest.)

**C2 — verified achievability, tab lane, fold × borrowed arm.** `bench/tmp/full2.mjs`,
`HYLE_BUDGET=180 000`, full `tried` list printed:

```
bench/holdout-tab/aapl-2014.csv
  raw=3108 M=1264 (wire=1106 contract=158) exact=true ms=278234
  winner=hyle:T,0-240h1+G0:k
  tried=raw/b=3111  raw+Th1+G0/b=1588  raw+Th2+G0/b=1595  raw+Th1+G0/c=1318
        raw+Th1+G0/g=1971(lanes:meridian-local)  raw+Th1+G0/e=1971  raw+Th1+G0/a=1971
        raw+Th1+G0/k=1264  raw+Th2+G0/c=1327  raw+Th2+G0/g=1980  raw+Th2+G0/e=1980
        raw+Th2+G0/a=1980  raw+Th2+G0/k=1277  raw/c=1693
  wire0="¦T,0-240h1;G0=@2014-01-02+344w-18,46,106,144,183,242,329;Bk"
```

Read this as an ablation, not a headline: raw 3111 → date-fold alone 1588 → date-fold ×
CHIRON 1318 → date-fold × KIONES **1264** < AION-alone honest 1277.

Second composition receipt, and a **loss** — `bench/holdout-ops/git-numstat.txt`:

```
  raw=4632 M=2235 (wire=2110 contract=125) exact=true ms=389929
  winner=hyle:T\t8-399+G1:c
  tried=raw/b=4635  raw+Th1+G1/b=3952  raw+Th0+G1/b=3948  raw+Th2+G1/b=3954
        raw+Th0+G1/c=2235
  wire0="¦T\t8-399;G1=0;Bc"
```

Third receipt, and a **win in a non-tabular lane** — `bench/holdout-mk/dump.sql`:

```
  raw=1795 M=650 (wire=512 contract=138) exact=true ms=256077
  winner=hyle:T,11-36+G01234567:k
  tried=raw/b=1798  raw+Th1+G0123456/b=1267  raw+Th0+G01234567/b=824  raw+Th2+G0123456/b=1297
        raw+Th0+G01234567/c=677  raw+Th0+G01234567/g=1308(lanes:meridian-local)
        raw+Th0+G01234567/k=650  raw+Th1+G0123456/k=849  raw+Th2+G0123456/k=862  raw/c=816
  wire0="¦T,11-36;G0=INSERT INTO documents (workspace_id;G1= folder_id;G2= policy_id;
         G3= created_at;G4= content_hash) VALUES ({100+1m7};G5= {2000+1};G6= {1+1m5};
         G7= '2026-{1+1m9z2}-{1+1z2} {0+1m10z2}:{0+7m60z2}:00+00';Bk"
```

Fourth receipt, a **loss that composition nearly closed** — `bench/holdout-tab/vix-daily-1990.csv`:

```
  raw=3412 M=822 (wire=648 contract=174) exact=true ms=243607
  winner=hyle:T,0-126h1+G0:k
  tried=raw/b=3415  raw+Th1+G0/b=2682  raw+Th2+G0/b=2689  raw+Th1+G0/c=1312
        raw+Th1+G0/g=1546(lanes:anaphora+tessera-local)  raw+Th1+G0/e=1546
        raw+Th1+G0/a=1546  raw+Th1+G0/k=822  raw+Th2+G0/c=1319
  wire0="¦T,0-126h1;G0=@1990-01-02+178w-48,101,146;Bk"
```

raw 3415 → date fold alone 2682 → × CHIRON 1312 → × KIONES **822**, against AION's 704.
Composition bought 1860 tokens and still fell 118 short. Note the `g/e/a` arms here are
re-billed with *two* lanes (`anaphora+tessera-local`, 1546) — the honest accounting is
what makes the comparison meaningful at all, since billed they would have read 952.

The composition sweep over all four files it was run on is now **complete**: 2 wins
(aapl +13, dump.sql +82) and 2 losses (git-numstat −89, vix −118), all `exact = true`,
all margins measured against honest prior numbers.

raw 1798 → fold alone 824 → × KIONES **650**, against `raw/c` 816 and the prior best 732.
Two things to notice: `nHead=0` wins here (the statement block has no header row), and
the fold explains **eight** columns of a comma-separated statement, of which the first
five are *constant text* (`INSERT INTO documents (workspace_id`, …) — the generator
grammar handles constants as affine `D=0` with a literal suffix, so no separate "template
lane" mechanism is needed. That is E1 subsuming MOSAIC/SIGNET's enumeration class on this
input, at Θ(1) instead of Θ(n).

And the loss receipt — `bench/holdout-ops/git-numstat.txt`:

raw 4635 → tab fold + constant column 3948 → × CHIRON **2235**, i.e. composition bought
1713 tokens, and the prior best (2146, five arms tied) still wins by 89. `G1=0` is a
*constant* column, which shows the generator grammar subsuming the degenerate affine case
rather than needing a separate mechanism — but a constant column is exactly what CHIRON
already encodes well, so the composition is near-redundant here. This is the honest
ceiling of E7 on the ops lane: large absolute gains, no ranking win. The 7 offsets
`18,46,106,144,183,242,329` are the 2014 US market holidays; the gap census that
predicted them was `1d×189, 3d×43, 4d×6, 2d×1` = weekdays minus 7 holidays. **Margin 13
tokens: H⁺, but barely** — reported as such.

**C3 — verified achievability, whole-corpus fast sweep.** 31 holdout files, ~700 ms
total encode, every one `exact = true`:

`df-h 570→237 · kubectl 1006→352 · psql 675→268 · markdown 330→219 · aapl 3108→1588 ·
vix 3412→2682 · dump.sql 1795→824 · git-numstat 4632→3948 · package-lock-head
15009→13678 (`Ib2`) · gh-api 2519→2348 (`Ib1`) · json-pkg 1152→1108 (`Ib4`)` and
**identity (0%)** on find-listing, git-log-fuller, ls-full-iso, node-stacktraces, npm-ls,
openstack-loghub-26.log, agent-history.md, chart.svg, component.jsx, page.html,
paper.tex, pom.xml, gh-prose, code-ts, code-dts, lic-mit, license, md-react, md-vite,
readme. **TOTAL raw 60 118 → M 53 162 = 11.6%.**

**C4 — impossibility / verified non-achievability.**
- Prose: no fold fires on 20/31 files. The mechanism requires a *row-indexed* structure;
  natural English prose has none. This is not a tuning failure, it is the mechanism's
  domain. The repo's prose ceiling (0–2%, `front.mjs` on `holdout-work`) is unchanged by
  Y10.
- Bit-packing into single-token atoms is unreachable: it only wins below ≈3.55 bpc and an
  LLM cannot execute exact PPM/arithmetic decoding in one chat turn (measured:
  Huffman+b64 at 4.38 bpc cost 2596 tokens; NYX-style `·` separators cost 1 token each).
- Deterministic `tokens(x)` ⇒ "optimal BPE" cannot shrink a string that is emitted
  unchanged. Any claim of the form "re-segment the text to make it cheaper" is void
  unless the text itself changes.
- Reflow / hard-wrap recovery: **57 tokens corpus-wide** — dead.
- Indent-strip as a headline: `package-lock` strip + KIONES **loses 37** — dead.
- Bin-packing-style LP bounds on optimal wire length have **no additive guarantee**
  (openai/math family 118: distinguishing B from B+c bins is NP-hard for every fixed c),
  so the encoder's exhaustive-over-candidates + measure strategy is not leaving a
  provable bound on the table — there is no such bound to compute.

**C5 — exact open interface (what a successor must supply).**
`OPT(text) = min over column subsets S ⊆ explainable(text) of cost(S)`. The shipped
encoder evaluates three candidates (`S = colsAll`, `S = colsCheap`, `S = ∅`) and picks by
measurement. The **unresolved interface** is the case `∅ ⊊ S* ⊊ colsCheap`: a strict
subset optimum. It is not searched (2^k variants), and on every measured file it never
occurred — `colsCheap === colsAll` on all 6 tbl/tab files, so no `@c` variant was ever
built (§I receipts). Cheapest falsification test: run exhaustive subset enumeration on a
7-column table (128 variants × ~16 ms ≈ 2 s) and compare against the 3-candidate min;
any gap is a bug in the candidate design. Not executed this session.

---

## D. NEGATIVE SPACE — 21 LOOK-ALIKE FAILURES + THE MODAL SHORTCUT

Each entry is a thing that *looks* like it should work, with the measurement or argument
that killed it. Items 1–8 were falsified **inside this session's own mechanism** and then
repaired (§I); that is the point of listing them.

1. **Greedy `\d+\.\d+` run inference.** Looks right for version numbers and IPs; on
   `10.244.1.22` it swallows the whole dotted quad as one run and makes the column
   unexplainable. FALSIFIED → replaced by `runsOf(v, dec)`: maximal runs of `\d+`,
   `[A-Za-z]+`, single other chars, and `\d+\.\d+` only when the column is marked
   `dec`, with **identical class sequences required across all rows**.
2. **`(a + d·r) mod M` for cyclic columns.** FALSIFIED on 1-based months (day 12 →
   month 0). Correct: `v = a + ((d·r) mod M)`, base outside the modulus.
3. **`offsets: number[]` for alignment.** FALSIFIED — right-aligned columns move their
   *start* column as their content widens, so a start-offset-only model rejected every
   real `df -h` block. Correct: `align: AlignCol[]` carrying signed positions
   (`A0,17,-27,-33,35` — negative = right-aligned).
4. **Space-run collapse without a space-free guarantee.** Looks free (it is: it deletes
   all the padding); actually destroys field boundaries if any non-final field contains a
   space. Gate added: every non-final field must be space-free.
5. **`nFields` on the wire.** Redundant: `nFields = align.length`. Removing it also
   removed a `if (total !== t.nFields) continue;` line that silently rejected valid
   tables.
6. **Shape-based spec selection** ("this column looks like a date, use the date spec").
   FALSIFIED → build all candidate specs and choose by `serializeSpec().length`, then by
   measured `cost`. A fixed contract dominates, never the wire (`CL_G` alone is 46
   tokens) — hence `hyleContractFor(dirs)` + `specFeatures()`, never constant
   `HYLE_CONTRACT`.
7. **Greedy per-column profitability filter — the session's worst bug, falsified twice.**
   First in characters, then in tokens: drop any column whose directive costs more than
   the column. It *looks* strictly better (why pay for a column that doesn't amortise?).
   It is wrong **in principle**: the marginal value of the last explained column is the
   entire row collapsing to `''` (~1 token), so a column that is unprofitable in isolation
   can be the one that unlocks the collapse; and a column's on-wire cost is its fields
   joined by the *line separator*, not `\n`, so dropping one changes the survivors'
   split. Measured damage: psql 268 → **456**, markdown 219 → **221**. Replaced by
   measure-both-candidate-sets; psql 268 and markdown 219 restored, TOTAL unchanged.
   **Do not re-add any per-column pre-filter.**
8. **Deadline starvation.** `if (Date.now() > deadline && best) break;` inside the
   variant loop let one expensive arm on `raw` eat the whole budget so folds were never
   scored: kubectl silently reported M=1006 (identity). Correct shape: PASS A scores
   every variant with the identity arm; PASS B runs borrowed arms, cheapest variant text
   first.
9. **Over-billing fallback.** Falling back to HELIX for unrecognised wire headers charged
   660+ tokens to CHIRON/KIONES wires. Rule: charge only known sentinels (`[MZ1] [SG1]
   [AN1] [P1] [M1] ⟨QSR⟩ [PX] [[VX1 [AX1] [TS1] [ST1] [RP1] [TR1] [CL1]`, HELIX's inline
   `⟐[`) else 0 — and a re-billed contract must be **SHIPPED**, not merely counted.
10. **Trusting an arm's self-reported `contractTokens`.** GLOSSIA/MOSAIC bill 0 (§H2).
    Never read it; re-derive from `decoderPrompt`.
11. **`hyleEncode().notes` as a receipt.** `tried` is truncated to `.slice(0,6)` in the
    notes string; the full list lives in `HyleResult.tried`. Two different numbers were
    reported from these two sources before this was caught.
12. **ORACLE-style leakage.** `ORACLE_MAP` hardcodes exactly the 20 citations of
    `bench/holdout-work/bibliography` (896 → 330). It is not reproducible under A2 on any
    other input; it is a memorised answer, not a codec. Excluded from every comparison
    table here.
13. **Translation / grammar-family codecs (ROSETTA class).** Lossy, and explicitly out of
    scope by instruction. Also fails A4: a back-translation is not byte-exact.
14. **Accent steganography, U+200B, U+FE00, combining marks, homoglyphs.** All falsified:
    o200k_base does not give them free bits; several are multi-token or normalise away.
15. **` ` ↔ `\t` free-bit stego.** Falsified — the tokenizer distinguishes them at ~1
    token each; no free channel.
16. **Whitespace RLE, noNewlines / noPunct / stop-star position lists.** Falsified in
    prior turns; the position lists cost more than the whitespace they encode.
17. **Huffman + base64 bit-packing.** 4.38 bpc measured, 2596 tokens — worse than raw
    English because b64 is ~1.33× expansion in *tokens*, not bytes.
18. **Char-level LZ78, prose bigram dictionaries, RLZ / RePair at 400/600/800, markdown
    AST re-emission, segmented paragraphs.** All falsified in prior turns; all either
    lose to raw on prose or need a dictionary the contract cannot afford.
19. **Non-monotonicity trap.** "Fewer bits ⇒ fewer tokens" is false here. Any candidate
    whose pitch is a bpc number must be re-measured in o200k_base before it is believed.
20. **Lossy deletion + LLM reconstruction** (arXiv 2605.29000, May 2026: delete parts,
    Gemini 2.0 Flash reconstructs, `r_keep` down to 0.05). Not admissible under A4 — it
    is not lossless — but its **three-tier cost accounting** (tier 1 skeleton ratio,
    tier 2 + lossless codec, tier 3 system cost: encoder latency, decoder weights,
    200–400 prompt bytes, 1–3 s decode latency) is adopted here as the reason HYLE
    reports ms alongside M.
21. **SliceGPT-style "delete rows/columns, keep a transform"** (ICLR 2024). A structural
    look-alike for "delete a column and keep a generator", but it deletes rows/columns of
    *weight matrices* after a learned orthogonal transform, is approximate, and is not
    text. Cited so the analogy is not mistaken for prior art.

**The modal shortcut, and its detection test.** The tempting failure mode for a codec of
this shape is to win on the *modal* instance of a lane — the pretty 8-column `df -h`
block — and to be silently carried by an arm (or by identity) on everything else, while
reporting a corpus average that looks like a win. Two detection tests are shipped:
(a) **per-file winner attribution**: the sweep prints `winner=` for every file, so an
identity result is visible as `folds=none wire=raw` rather than hidden in an average
(20/31 files here are exactly that); (b) **arm ablation in `tried`**: every
(variant × arm) pair is scored and printed, so `raw+Th1+G0/k=1264` next to `raw/k` and
`raw+Th1+G0/b=1588` shows which factor produced the gain. A third, new this session:
(c) **candidate-set tagging** — variants are labelled `@c` / `@n` when the token-cheap or
empty column set produced them, so "the fold won because the generator columns paid" is a
*printed fact*, not an inference (§I shows `@n` costing 372–719 vs raw 330–675: the
layout fold alone is a net **loss** on all three tbl files; the entire win is the
generator columns).

---

## E. MECHANISM PORTFOLIO — 8 GENUINELY DISTINCT MECHANISMS

Format per mechanism: **lemma** (why it must work), **artifact** (where it lives),
**proved** (what is verified), **unresolved** (the open interface), **cheapest
falsification test**, **local vs equivalent gap** (does the win here generalise, or is it
this file?).

### E1 — Canonical regeneration of an index-derived column (`T` + `G<i>`)
**Lemma.** If column `j` of a block satisfies `v(r) = f_j(r)` for a closed-form `f_j`
serialisable in `k` tokens, then deleting the column and emitting `G<j>=f_j` costs
`k + O(1)` instead of `Θ(n)` — a saving that grows linearly in row count.
**Artifact.** `genInfer` / `genApply` / `genRestore` in `hyle.ts`; directives
`G0=/dev/nvme0n1p{0+1}`, `G1={100+37}G`, `G4={30+3}% /mnt/vol{0+1}`.
**Proved.** Byte-exact on 5/5 columns of df-h, 7/7 of kubectl, 7/7 of psql, 6/7 of
markdown-table (nHead=2 skips `|---|`); re-derived independently in CPython (§H3).
**Unresolved.** `f_j` is drawn from a fixed grammar (affine, cycle, letter, date). A
column generated by a *string* function (`sha1(row)`) is out of reach; §J-4 proposes the
f-string column spec as the extension.
**Cheapest falsification.** Inject one outlier into a 20-row generated column: the
exception path must make `genApply` return null and the variant must be rejected, so M
returns to raw. Executed as self-test fixture `right-aligned` + the `genApply-null`
receipt on psql (`raw+Th0+G5:genApply-null`).
**Local vs equivalent.** Equivalent for any tool output whose columns are counters,
sizes, percentages, enumerated names or dates — which is most of `df`, `kubectl get`,
`psql`, `ls -l`, CI matrices and time series. Not equivalent for prose, logs with
free-text messages, or JSON.

### E2 — Run-class alignment inference (`runsOf`) with identical-class-sequence gating
**Lemma.** A column is index-derivable iff its *run-class sequence* is identical in every
row; then each run is an independent affine/cycle/letter slot.
**Artifact.** `runsOf(v, dec)`, `{0+1m4}`, `{0+1z2}`, `{ca0+1m5}`.
**Proved.** `G0=api-server-7d9f8b{0+1z2}-{ca0+1m5}{0+3z4}` reproduces kubectl's pod-name
column exactly (33 tokens for 23 rows).
**Unresolved.** Class sequences that differ in *length* only (a name that gains a digit
on row 19) reject the whole column; a per-row alignment with an exception list is not
implemented.
**Cheapest falsification.** Build two rows with class sequences `d,a,d` and `d,a,d,d`:
inference must reject. Covered by `dotted-integers` fixture (20 rows, `10.244.{i%8}.{i*11}`).
**Local vs equivalent.** Equivalent wherever names are machine-generated with a fixed
shape — the dominant case in ops output.

### E3 — Modulo/pad slot semantics with the base outside the modulus
**Lemma.** Cyclic quantities in the real world are 1-based (months, letters, human
counters); `a + ((d·r) mod M)` is the only form that reproduces them, and `z<W>` must be
applied after the modulus.
**Artifact.** `CL_G_MOD` (15 tok), `CL_G_PAD` (12 tok); parse order reverses
serialisation (`A+D`, `m<M>`, `z<W>` ⇒ strip `z` then `m`).
**Proved.** Self-test `padded-modulo` (26 rows, `2026-{1+(i%12)}-{1+i}` zero-padded) wins
with `hyle:T,0-26h1+G01:b`, M=157 vs raw 238.
**Unresolved.** Non-uniform cycles (a 28/29/30/31-day month column) — needs a real
calendar in the spec, which is E5's job.
**Cheapest falsification.** One fixture, one assert: month 13 must not appear.
**Local vs equivalent.** Equivalent for every bounded counter; the pad rule is what makes
it work on *formatted* output rather than raw integers.

### E4 — Signed alignment columns (`A`) for mixed left/right padding
**Lemma.** Space-run collapse deletes padding; reconstruction needs each field's start
column and its alignment side. Signed integers encode both in one list.
**Artifact.** `AlignCol[]`, `CL_A` (36 tok), `A0,17,-27,-33,35`.
**Proved.** df-h (5 columns, two right-aligned) 570 → 237; self-test `right-aligned`
632 → 237 with fold `T_1-20+G01234+A5`.
**Unresolved.** Centre-aligned columns (`kubectl` header centring) are not representable;
they currently force those rows into the exception path.
**Cheapest falsification.** A 3-row block with one centred field must fall back to
identity, not emit a lossy `A`.
**Local vs equivalent.** Equivalent for all column-padded CLI output; the 314-token
corpus-wide value of alignment padding alone was measured separately, so `A` is not the
main win — E1 is.

### E5 — Calendar/date spec with explicit holiday offsets (`@YYYY-MM-DD+Nw-skips`)
**Lemma.** A trading-day or business-day column is "every weekday from A to B, minus a
small set of offsets". Stating the offsets costs O(holidays), not O(rows).
**Artifact.** `CL_G_DATE` (36 tok); `G0=@2014-01-02+344w-18,46,106,144,183,242,329`
(26 tokens for 240 rows).
**Proved.** aapl-2014 date column: 1681 raw tokens (54% of the file) → fold 1588 total;
the 7 offsets match the 2014 US market holidays exactly (gap census `1d×189, 3d×43,
4d×6, 2d×1`).
**Unresolved.** The offsets are *inferred*, not recognised: the encoder does not know
they are holidays, so a file with 40 half-days would emit 40 offsets and lose. No
holiday *name* is ever emitted — deliberately, because a name would be a claim about the
world that the decoder could get wrong.
**Cheapest falsification.** vix-daily-1990 (126 rows, CRLF) — measured: 2682 vs AION's
704. **This mechanism loses there; the receipt is kept.**
**Local vs equivalent.** Equivalent for exchange calendars and cron-like schedules; not
equivalent for irregular timestamps (logs), where AION's Δ model dominates.

### E6 — Indent fold with an exception gate (`I`)
**Lemma.** Tree-structured text (JSON, XML, YAML) has a per-line indent that is a
function of bracket depth; emit depth deltas plus a bounded exception list.
**Artifact.** `depthBracket` / `depthTag` / `indentApply`, `CL_I` 58–59 tok,
`CL_I_EXC` 11 tok, `I2b` (3 tok), `FLAT_TAGS={html,head,body}`.
**Proved.** package-lock-head 15009 → 13678 (8.9%); gh-api 2519 → 2348 (`Ib1`);
json-pkg 1152 → 1108 (`Ib4`); self-tests `json-indent` 59, `xml-indent` 49.
**Unresolved.** The gate rejects page.html (192/196 lines need overrides > 11) and every
prose/markdown file; mixed tabs+spaces beyond one normalisation pass is unsupported.
**Cheapest falsification.** page.html must return identity — it does (3220 = raw 3220).
**Local vs equivalent.** Equivalent for machine-generated tree text; a *loss* on
hand-written markup, which is why the gate exists.

### E7 — Fold × borrowed-arm composition (the orthogonal axis)
**Lemma.** A fold is a text→text map. Any existing codec's arm is also a text→text map.
Their composition is admissible iff the arm's decoder prompt is **shipped and billed**;
under that condition `M(fold ∘ arm) ≤ min(M(fold), M(arm))` is achievable by measurement,
and strictly less whenever the fold removes redundancy the arm models badly.
**Artifact.** `buildVariants` (PASS A identity arm, PASS B borrowed arms, cheapest
variant text first) + `laneContract` / `lanesOfWire` for honest re-billing.
**Proved.** aapl 1588 → **1264** with KIONES (C2); markdown-table 219 → **205** with
KIONES (still a loss vs 203, so composition is *not* a universal fix).
**Unresolved.** Only 5 arms are wired (b, c, g/e/a, k). Full-mode composition is
expensive: aapl 278 s at a 180 s budget on 2 cores. The composition search is greedy
(one fold then one arm), not a fixed-point iteration (arm → fold → arm …).
**Cheapest falsification.** Compare `raw+Th1+G0/k` against `raw/k` on the same file; if
composition never helps, the two are equal. They are not (1264 vs 1277+).
**Local vs equivalent.** Equivalent in principle for every lane; measured to help only
where the fold fires — i.e. tabular and tree text.

### E8 — Honest contract accounting as a mechanism (not a policy)
**Lemma.** If `M` omits a component the decoder needs, the leaderboard ranks a codec by
a quantity nobody pays. Re-deriving each arm's contract from its *shipped* prompt makes
the comparison well-posed and, in this repo, changes the ordering.
**Artifact.** `laneContract`, `lanesOfWire`, `clauseCosts()` (union 352 tok),
`hyleContractFor(dirs)`, `bench/hyle_audit.ts`, `bench/tmp/mos.mjs`, `arms2.mjs`.
**Proved.** Measured lane prompt costs: SIGNET 642, ANAPHORA 99, PLEXUS 340;
`mosaicDecoderPrompt` = 962 (signet), 1061 (signet+anaphora), 660 (plexus-local),
head-only 320, all lanes 3360. `glossia=eidos=aion` report `decoderPrompt === wire` and
bill 0 — so all three report the same false M on every file.
**Unresolved.** The registry's `measure()` still bills wire only; fixing that is a
one-line change to `registry.ts` but it would re-rank ~180 codecs and is outside this
turn's mandate. Recorded as the highest-value one-line change in the repo.
**Cheapest falsification.** Print `decoderPrompt.length - wire.length` for every arm; any
nonzero value with `contractTokens = 0` is a bug. Executed: GLOSSIA/MOSAIC.
**Local vs equivalent.** Equivalent — it applies to every codec in the repo, and it is
the only mechanism here whose value does not depend on the input file.

---

## F. ARTIFACT REQUIREMENT (no status reports)

| requirement | artifact shipped |
|---|---|
| executable design | `src/lib/omega/hyle.ts`, exported `hyleEncode / hyleDecode / hyleSelfTest / lanesOfWire / laneContract / indentInfer`, registered in `registry.ts` (`hyle` entry after `oracle`) and `src/workers/codec.types.ts` |
| reproducible experiment | `bench/hyle-crosscheck.sh` (esbuild → emit → CPython), `bench/hyle_audit.ts`, `bench/tmp/sweep.mjs`, `full2.mjs`, `arms2.mjs`, `ht.mjs`, `rej.mjs` |
| proof-carrying certificate | 16/16 self-test + 20/20 independent CPython byte-exact + `exact: boolean` on every result + `rejected: string[]` machine-readable negative space |
| quantitative bound | §C tables; per-file ms; contract-clause token costs; TOTAL 60 118 → 53 162 |
| counterexample | §D 1–8 (each a falsified design inside this mechanism, with the measurement that killed it) and §B H⁻ 1–6 |
| causal model | §E lemmas + the `@n` ablation showing the layout fold alone is a net loss and the generator columns carry the entire win |

---

## G. SECOND-ORDER ADVERSARY A(C) PER CANDIDATE

For each mechanism, an adversary that attacks **the fix**, not the original bug.

- **A(E1) — the near-miss column.** 20 rows affine, row 17 off by one. Prediction: the
  column is not explainable, the variant is rejected, M returns to raw + contract.
  Detection: `genApply` returns null ⇒ `rejected` entry `…:genApply-null` (observed on
  psql nHead=0). Risk: a *silent* approximation would be catastrophic (byte-imperfect).
  Mitigation already in place: the decoder is total and echoes on any mismatch, and
  `exact` is asserted in every run.
- **A(E2) — same classes, different lengths.** `abc-1`, `abc-22`, `abc-333`: identical
  class sequence, non-affine widths. Prediction: reject, or pad-spec only if a single
  `z<W>` fits. Open risk: the `z` slot could be inferred from the *first* row and then
  silently truncate later rows. Test: 3 rows with widths 1/2/3 must not produce a `z2`
  spec.
- **A(E3) — modulus boundary.** `M=1`, `M=2`, and a column that is constant. A constant
  column is affine with `D=0` and also a cycle with any `M`; the serialiser must pick the
  shorter (`{7}`), otherwise the contract buys a clause for nothing.
- **A(E4) — mixed alignment inside one column.** Right-aligned values under a
  left-aligned header. Prediction: `A` cannot represent it ⇒ the block must fall back.
  This is the known unresolved gap in E4.
- **A(E5) — the holiday lie.** A date column that skips *irregular* days (a
  maintenance calendar). The spec will emit many offsets and lose on M; the `+3 < base`
  gate must reject it. Verified direction: vix-daily loses and is reported as a loss.
- **A(E6) — gate gaming.** A file with exactly `max(4, ⌊0.06·lines⌋)` exceptions plus
  one more. The gate is `≤`, so `+1` must reject. page.html (192/196) is the extreme
  case and is identity.
- **A(E7) — the unbilled arm.** Compose a fold with an arm whose `decoderPrompt` is not
  shipped. Prediction: `lanesOfWire` returns 0 and the composition looks artificially
  cheap. Detection: assert `decoderPrompt.length > wire.length` whenever arm ≠ b, and
  charge `laneContract(lanes)`. This is exactly the GLOSSIA bug, now guarded on HYLE's
  side of the composition.
- **A(E8) — the accounting patch that changes the ranking.** If the registry ever bills
  contracts, HYLE's tbl margins *grow* (it already ships its contract) while
  glossia/eidos/aion lose 660–1061. Adversary: a codec that ships a 5-token contract and
  relies on the decoder's priors. That is not fraud, it is the access model — but it
  means `best_prior` must always be the **honest** column, which is what §C uses.

---

## H. VERIFICATION VIA REAL EXTERNAL VERIFIERS (and honest downgrades)

**Tools actually available in this sandbox:** `node v22.22.3` (2 cores), `npx esbuild`
(bundler used as the TS→JS runner), `npx tsc --noEmit` (TypeScript 5.9.3), `python3`
(CPython), `git`/`gh` (GitHub API reachable), outbound HTTP limited to
github.com / codeload / api.github.com / registry.npmjs.org / pypi.org /
files.pythonhosted.org plus the web-search/fetch tools. **Not available:** any LLM API,
any theorem prover (no Lean, no Coq), any database, any distributed/parallel runner.
Every number in this report came from a process that ran here; wall-clock totals are in
§J.

**H1 — Compiler.** `npx tsc --noEmit` → 0 errors after every patch this session
(including the two control-flow `never` fixes that needed holder boxes:
`const box:{best:T|null}={best:null}`).

**H2 — Experiment (in-repo).** `bench/tmp/sweep.mjs` over 31 holdout files, every result
`exact = true`, ~700 ms total. `bench/tmp/ht.mjs` self-test: **16/16 PASS, 0 FAIL**
(empty 0, single 1, prose 61, json-indent 59, xml-indent 49, csv-generated `k` 143/176,
pods-aligned `c` 154/450, sentinel-in-payload 20, braces-in-payload 36, crlf 75,
no-trailing-nl 26, tabs 27, right-aligned **hyle fold** 237/632, dotted-integers `c`
203/366, padded-modulo **hyle fold** 157/238, all-columns-pipe **hyle fold** 149/174).
Four of the sixteen are now won by HYLE's own fold rather than carried by an arm — that
was a deliberate repair: the first versions of these fixtures were too small for the fold
to amortise, so they would have passed even with the fold broken.

**H3 — Independent second implementation (the strongest gate available).**
`bench/hyle_decode.py` is a CPython reader **re-derived from the contract prose**, not
transliterated from the TypeScript: epoch-day integer dates, exact scaled-integer decimal
formatting, tpl/cycle/date specs, `split_fields`, `gen_restore`, `align_restore`,
`depth_bracket`, `depth_tag`, `indent_apply`. Interface:
`python3 bench/hyle_decode.py WIRE [--check SRC]`, exit 0 PASS / 1 FAIL / 2 SKIPPED
(arm ≠ `b`, i.e. a borrowed payload the Python reader cannot interpret — an honest scope
limit, never a fake pass). `bench/hyle-crosscheck.sh` esbuilds the committed emitter `bench/hyle_emit.ts`, emits
`.wire`/`.src` pairs and runs the reader on each.
**Result after all patches: 21 passed, 0 failed, 0 skipped** over a 21-file set that
covers every fold class plus identity controls. Byte-exact char ratios:
kubectl 2649 chars from a 262-char wire (10.1×), df-h 939/178 (5.3×), psql 1578/400,
markdown-table 635/314, aapl 5488/2908, vix 6578/5237, dump.sql 5159/1939, git-numstat
12306/11539, package-lock 40000/31662, gh-api 8000/7460, json-pkg 3620/2812, plus 8
identity controls (page.html, chart.svg, component.jsx, pom.xml, find-listing,
ls-full-iso, kb-article, unified-diff, gh-prose, code-ts) where wire chars = src chars. This is H⁺ evidence that **the wire is a portable specification, not a
runtime artifact** — the single most important property for the A2 access model.

**H4 — Held-out data.** All 31 files are holdout corpora
(`bench/holdout{,-tbl,-tab,-mk,-ops,-work,-lang}`); none is used for tuning constants.
The one leak in the repo is ORACLE's, and it is excluded (§D-12).

**H5 — Web verification of external claims.** `github.com/openai/math` `CONTENTS.md`
downloaded in full (638 727 B) via
`gh api repos/openai/math/contents/CONTENTS.md -H "Accept: application/vnd.github.raw"`
and grepped locally, so every per-family statement below is re-checkable offline from
`bench/tmp/openai-math-CONTENTS.md` + `bench/tmp/families.txt` (372 titles, matching the
README). **The `search/code` API counts obtained earlier this session are discarded as
unverified** — the endpoint is rate-limited to 10 req/min and returned
non-repo-scoped results; they are not cited anywhere in this report.

**H6 — DOWNGRADED CLAIM (stated as required).** *"An LLM with only a single chat
input/output can read `decoderPrompt` and regenerate the original bytes."* This was **not
executed**: there is no LLM API in the sandbox. What substitutes for it, in decreasing
strength: (i) an independent human-written CPython implementation reads the same contract
prose and reproduces all 20 wires byte-exactly — this tests *specification sufficiency*,
which is the load-bearing part of the claim; (ii) the contract is written as declarative
prose with worked examples and never requires arithmetic the reader cannot do by hand;
(iii) external evidence that the *inverse* direction is genuinely risky — arXiv
2601.13398v2 ("Can LLMs Compress (and Decompress)? … via Invertibility") documents models
that "achieve high accuracy in one direction yet fail to maintain logical compatibility
when the process is inverted". **Therefore the claim is recorded as H∂/unverified for
LLM decoders and H⁺/verified for a deterministic second implementation.** The
highest-information test to close it is in §J.

---

## I. REPAIR RE-GATES (a repaired candidate inherits no trust)

**Repair under re-gate:** the greedy per-column filter was replaced by
measure-both-candidate-sets (`buildVariants` now builds `colsAll`, `colsCheap` and `∅`
and lets the real `cost` measurement decide). Second repair in the same area: candidate
sets are tagged (`@c`/`@n`) and `HyleResult.rejected` is now per-encode (`REJECTED` was
cumulative across calls, which made every receipt after the first file unreadable).

**All affected gates re-run after the patch:**
1. `npx tsc --noEmit` → 0 errors.
2. Fast sweep re-run → **psql restored to 268, markdown-table restored to 219**, TOTAL
   raw 60 118 → M 53 162 unchanged, every winner string identical, every `exact = true`.
3. Self-test re-run → **16/16 PASS** (four new fixtures added as regression guards for
   the three inference bugs: right-aligned `A`, dotted-integer `runsOf`, padded modulo,
   all-columns-generated pipe table).
4. Independent CPython cross-check re-run → **21 PASS / 0 FAIL / 0 SKIP**.

**A verification-harness bug found by this re-gate, and repaired.** The cross-check
looped over `bench/tmp/xc/*.wire` without clearing the directory, so wires emitted by an
*earlier build* were re-checked and counted as fresh receipts — the "20 passed" figure
from earlier this session included 6 stale identity wires. Repaired in two ways: the
script now `rm -f`s the output directory before emitting, and the emitter moved from the
gitignored `bench/tmp/emit.ts` to the committed `bench/hyle_emit.ts` (which also exits
non-zero if the *TypeScript* decoder fails, so the two halves cannot silently disagree).
Re-run from a clean directory with an expanded 21-file default set: 21/21. A gate that
can be satisfied by leftovers is not a gate.
5. Full-mode composition re-run on `markdown-table.md` → winner arm `k`, M=205
   (wire 180 + contract 25), `exact = true`, 19.1 s.
6. `aapl-2014.csv` full mode → M=1264, `exact = true`, 278 s.

**New attack aimed at the patch (executed).** The patch's premise is that measuring three
candidate sets is enough. Attack: *does the cheap set ever win, and does the empty set
ever pay?* Instrumented receipts from `bench/tmp/rej.mjs` (fast mode, `rejected` field):

```
=== bench/holdout-tbl/markdown-table.md  raw=330 M=219 winner=hyle:T|0-11h2+G023456:b
    raw+Th1+G06=421>=330      raw+Th1@n=374>=330
    raw+Th0+G06=418>=330      raw+Th0@n=372>=330
    raw+Th2@n=374>=330        (+ the same five under the indent pre-fold)
=== bench/holdout-tbl/df-h.txt  raw=570 M=237 winner=hyle:T_1-18+G01234+A5:b
    raw+Th1@n=612>=570  raw+Th0@n=610>=570  raw+Th2@n=612>=570  (+ indent variants)
=== bench/holdout-tbl/psql-output.txt  raw=675 M=268 winner=hyle:T|3-26+G0123456:b
    raw+Th1@n=719>=675  raw+Th0+G5:genApply-null  raw+Th0@n=717>=675  raw+Th2@n=719>=675
```

Findings, honestly: (a) **no `@c` variant was ever built** — `colsCheap === colsAll` on
all six tbl/tab files, so the token-cheap set is *insurance, not gain* on the measured
corpus; (b) **`@n` (the layout fold with no generated columns) costs 372–719 against raw
330–675 — the T-fold alone is a net loss on every tbl file**, so the whole win is
attributable to E1's generator columns, which is the causal claim §F asks for; (c) the
psql receipt shows the exception path firing for real (`genApply-null` at nHead=0, won at
nHead=1). The residual gap (§C5) — a strict-subset optimum `∅ ⊊ S* ⊊ colsCheap` — is
still unsearched, and the cheapest falsification test for it is stated there.

---

## J. STOPPING ONLY AT REAL BUDGET EXHAUSTION

**Consumed, measured.** `arms2.mjs` 478 s (6 files × 5 arms); full-mode composition 278 s
for aapl alone at a 180 s nominal budget on 2 cores (a stale duplicate job was competing
for CPU and was killed; the surviving job is
`bench/tmp/compose.txt`, still running for git-numstat / dump.sql / vix at the time of
writing); self-test 102 s; fast sweep 9.5 s for 6 files, ~700 ms for the 31-file lane
totals; cross-check 2.8 s; CPython verifier runs negligible. Two `start_process` streams
died with a sandbox timeout, which is why every long sweep is now redirected to a file
and polled — that is a real constraint of this environment, not a modelling choice.

**Not finished, and not claimed as finished:**
1. ~~Full-mode composition numbers still being computed~~ — **now complete** for all four
   files (`bench/tmp/compose.txt`, `DONE`): aapl 1264 **win +13**, dump.sql 650 **win
   +82**, git-numstat 2235 loss −89, vix 822 loss −118. Wall-clock: 278 s + 256 s +
   390 s + 244 s = **1168 s** on 2 cores at a 180 s/file nominal budget (the budget is
   per-variant-pass, not a hard cap, which is why the runs overran it — recorded as an
   encoder defect to fix, not as a measurement error).
2. The **Python-f-string column spec** (`P<c>=<fstring>`, contract ≈24 tok vs ≈112 for
   the current generator grammar) is the largest remaining token win and was **deferred
   by decision**, not attempted. It would extend E1 from a fixed grammar to arbitrary
   row-index expressions.
3. Exhaustive column-subset search (§C5) — not implemented.
4. The LLM-decode held-out test — not executable here (§H6).
5. `registry.ts measure()` still bills wire only — not changed (would re-rank ~180 codecs).

**Next highest-information test, in order:** (i) run the shipped `decoderPrompt` for
`psql-output.txt` through any chat LLM and diff against the source — one call, closes
H6, and is the only gate that can turn "specification sufficiency" into "model
readability"; (ii) exhaustive 2^k subset search on markdown-table (≈2 s) to close §C5;
(iii) the f-string column spec, re-gated through §I's full ladder.

---

## SEP–OCT 2026 AI-SOLVED MATHEMATICS: PER-FAMILY APPLICABILITY EVALUATION

Primary source obtained and cached locally: `github.com/openai/math`, README updated
2026-10-08. **719 manuscripts / 372 families** (press said 722), produced by an
unreleased internal model, Apache-2.0, `lean/formalization.yaml` + `lean/docs/NNN.md`
per family, **≈42% of top-line results formalised**, 44 families are counterexamples. A
Comparator tool checks a submitted proof against a *separately stated* theorem allowing
only Lean's three standard axioms. Advisory group agmai.org (Charles, De Lellis, Gowers,
Hairer, Srivastava, Tillmann, Vakil, Witten, Wood); their 29 Sep guidelines were only
partly met. Headline claims: rational Hodge for CM abelian varieties (⇒ Tate over finite
fields), free group factors, Unique Games, quasi-Riemann (Re s > 7/8), Catalan's constant
irrational, π irrationality exponent 2, Thompson's F non-amenable, Hilbert–Smith, Kakeya
3&4D, L = BPL.

**Systematic census over ALL 372 family titles / 719 abstracts**
(`bench/tmp/families.txt`, greps re-runnable):
Shannon **0** · source coding **0** · channel capacity **0** · data compression **0** ·
lossless **0** · Kolmogorov complexity **0** · description length / MDL **0** · code
length **0** · BPE / byte-pair / tokenizer / prompt **0** · entropy 41 (all
dynamical-systems, free-probability or quantum: families 113, 146, 148, 151, 152, 273,
298, 329, 339) · compress 13 (all operator-algebra compression by a projection,
topological compression of cube-valued maps, or *in*compressible Navier–Stokes) · matrix
multiplication 8 · Kolmogorov 1 (= Kolmogorov–Sinai entropy) · mutual information 1 ·
prefix code 1.

**⇒ The release contains no Shannon information theory and no data compression at all.**
Every compression-adjacent family was read individually; per-family verdicts:

- **121 — Almost-linear approximation of edit distance.** Randomised (1+ε)-approximation
  to unit-cost edit distance in `N^{1+o(1)}`, success probability ≥ 2/3, Lean-formalised.
  **No transfer.** An approximate alignment cannot be inverted byte-exactly, and HYLE
  needs no alignment at all: its columns are exact functions of the row index. Also note
  the randomised-success hypothesis is incompatible with A4's totality.
- **128 — Factor-2 shortest common superstring.** Deterministic poly-time, Lean'd. The
  closest result in the catalogue to text compression, **still zero applicability**: SCS
  minimises *characters*; the objective here is o200k_base *tokens* of an invertible
  wire, and that objective is non-monotone in characters (§D-19). A 2-approximation on
  the wrong metric transfers nothing.
- **113 — FPRAS for perfect matchings + the matching-entropy conjecture.** Maximum
  entropy over edge marginals. The maximum-entropy source model is decades old and is
  *already falsified for this system*: PPM/arithmetic decoding cannot be executed exactly
  by an LLM in one chat turn (§C4).
- **107 — ω ≤ 9/4 matrix multiplication.** Would speed learned/neural compressors only.
  HYLE's cost function is an O(n) trie BPE count; there is no matmul in the hot loop.
- **102 (UGC / optimal approximation thresholds), 103 (L = RL = BPL), 104
  (quasipolynomial mean-payoff/parity games), 126 (exponential SDP complexity of perfect
  matching), 133 (Weisfeiler–Leman).** No reduction from token-cost segmentation to any
  of these is known, and the partition DP HYLE uses is already exact. 103 merely restates
  that randomness buys nothing in logspace — which the deterministic encoder already has.
- **119 — Courtade–Kumar / Hellinger contraction.** The only genuinely
  information-theoretic result in the release (sharp contraction under bit-flip noise).
  **Vacuous here**: the channel is noiseless and a lossless codec must retain *all*
  information, whereas the theorem upper-bounds retained information.
- **118 — Bin packing: unbounded configuration-LP gaps + additive NP-hardness**
  (distinguishing `B` from `B + c` bins is NP-hard for every fixed `c`). A real
  **impossibility input**, imported in §C4: any future attempt to bound optimal wire
  length by an LP / fractional relaxation has no additive guarantee, so "compute a bound
  and then search up to it" is not a viable successor design.

**One real transfer, methodological rather than mathematical.** The release's pattern —
Lean certificate **+ human scope note + Comparator against a separately stated theorem**
— is exactly HYLE's verification design: `bench/hyle_decode.py` is written from the prose
contract and not from the TypeScript, and §B's H⁻ list is the scope note (what the
formalisation does *not* cover). The catalogue also publishes which top-line results are
*not* formalised (≈58%); this report does the same for the LLM-decode gate.

---

## CODEBASE AND ARENA-PR EVALUATION (what Y10 found in the existing stack)

1. **`registry.ts measure()` bills `outTokens = countTokens(r.output)` = wire only.** The
   displayed leaderboard therefore omits every decoder contract. HYLE ships and bills
   its contract, so its leaderboard numbers (92 / 141 / 141 / 133 wire) are directly
   comparable to other codecs' *wire* but its honest M is what §C ranks by.
2. **`glossia.ts` `mosaicArm` (L148–163) bills MOSAIC's contract as 0** and sets
   `decoderPrompt === wire`. EIDOS delegates to GLOSSIA, AION to EIDOS ⇒ arms `g/e/a`
   report **the same false M on every file**. Measured true costs: 660 (plexus-local),
   962 (signet), 1061 (signet+anaphora), 3360 (all lanes). Effect on the tbl lane:
   kubectl glossia 211 → **1272**, df-h 132 → **1193**, psql 203 → **1165**, markdown
   206 → **866**. This single bug is why "GLOSSIA wins the tbl lane" is not a true
   statement, and it is the reason HYLE's margins are quoted against both columns.
3. **HYDRA and TACHYS are honest** (39-token contract, identical wire 436/269/367/189);
   KIONES and CHIRON publish their own contracts. Nothing to fix there.
4. **ORACLE leaks.** `ORACLE_MAP` is a hardcoded map of exactly
   `bench/holdout-work/bibliography`'s 20 citations. Under A2/A4 it is not a codec; the
   896 → 330 result is excluded from every table here.
5. **`mosaic.ts` `bareDecode` sentinel dispatch (L440–472)** is the right pattern and was
   copied for HYLE's honest re-billing; the hazard is the *fallback* (§D-9), which must
   charge 0 for unknown sentinels rather than guessing a lane.
6. **~180 codec modules, 19 existing `*_decode.py` cross-checks** — the repo's own
   verification convention is the independent second implementation, which is what §H3
   follows. Y10 adds the 20th.
7. **Highest-value one-line change available to the repo:** bill `contractTokens` in
   `measure()`. It would re-rank the tbl lane outright.

---

## AI-NATIVE IDEAS THAT A CLASSICAL COMPRESSION VIEW MISSES

1. **"Canonical" is a property of the decoder, not the data.** A byte-exact codec has no
   canonical forms; an LLM does. `G0=@2014-01-02+344w-18,46,…` works only because the
   reader knows what a trading calendar is. Classical theory would demand the holiday
   list be entropy-coded; here it is *named by structure* and the model fills the rest.
2. **The contract is the payload's type signature.** Classical codecs ship a decoder in
   code; this one ships a decoder in prose, and prose has a token cost that must be
   amortised — which is why the tbl lane needs ≥ ~20 rows before a fold pays and why
   tiny fixtures must be enlarged to test the fold at all (§H2).
3. **Composition beats optimisation.** Rather than searching for a better single codec,
   HYLE searches over (fold × existing arm). aapl 1588 → 1264 came from *reusing* KIONES,
   not from improving either. A classical pipeline would call this redundant; under a
   token objective with a shipped contract it is the cheapest available gain.
4. **Honest accounting is a compression technique.** Removing a 1061-token phantom
   "saving" is worth more than any fold measured this session. Any leaderboard that bills
   only the wire optimises for codecs that hide their decoder.
5. **Speed is a metric, not an afterthought.** HYLE's folds are O(n): 3–123 ms where
   KIONES takes 10–157 s and CHIRON 10× that. For an agent reading tool output in a loop,
   a 60% saving at 30 ms dominates a 65% saving at 150 s. This is tier-3 cost accounting
   from arXiv 2605.29000, applied.
6. **Everyday-work gains, concretely:** a `kubectl get pods` paste into a chat costs 352
   instead of 1006 tokens; a `df -h` 237 instead of 570; a `psql` query result 268
   instead of 675; a 240-row price CSV 1264 instead of 3108. Those are the four outputs a
   practitioner actually pastes, and the saving is 58–65% on three of them — with the
   bytes still recoverable exactly, so nothing downstream (a diff, a checksum, a re-run)
   breaks.

---

## THE LANGUAGE-GRAMMAR IDEA, IMPROVED INTO SOMETHING PARETO-SUPERIOR

The user's sketch: different languages' grammars as the unifying point across
single-token glyphs; then fold that with a different stack that *ignores* grammar and
treats that lane as text.

Taken literally, the grammar lane is the ROSETTA/translation class: lossy, explicitly
excluded by instruction, and fatal under A4 (a back-translation is not byte-exact). The
improvement is to keep the *shape* of the idea and change what the "grammar" is a grammar
**of**. Two observations made it work:

1. The unifying point across single-token glyphs is not natural-language grammar — it is
   **generative grammar of the artifact**. `df -h` output, a pod list, a `psql` result and
   a price CSV all have a *production system*: a header, a row rule, per-column value
   rules. That is a grammar in the Chomsky sense (a finite set of rewrite rules producing
   an unbounded string), and unlike natural-language grammar it is **exactly invertible**
   when the rules are closed-form. So: single-token glyphs (`¤ ¦ · § ¶`) mark the lanes,
   and each lane's "grammar" is emitted as its production rules — `T` for the row rule,
   `G<i>` for the column rules, `A` for the layout rule, `I` for the depth rule.
2. The second stack that "ignores grammar and treats the lane as text" is precisely the
   **borrowed arm**: after HYLE has applied the grammar and deleted what it explains, the
   residue is ordinary text, and CHIRON/KIONES/GLOSSIA/AION compress it with no knowledge
   of the grammar at all. That is E7, and it is where the aapl win came from.

So the vague idea becomes: **a grammar-aware lane that emits production rules, composed
with a grammar-blind text stack over the residue, with both contracts shipped and
billed.** That is strictly better than expected — the grammar lane alone was predicted to
be the win, and measurement says the grammar lane alone *loses* on every tbl file
(`@n` = 372–719 vs raw 330–675, §I) while grammar + arm beats the best prior codec on 4
of 6 measured files. The improvement over the original sketch is that the grammar had to
be *closed-form and index-parameterised* to stay lossless, and the composition had to be
*measured*, not assumed.

What remains of the original idea that is **not** pursued, and why: natural-language
morphology (agglutinative languages packing several morphemes per token) would give a
genuine single-token-glyph lane, but every mapping from English to such a form is either
lossy or requires a bilingual dictionary larger than the contract budget allows
(measured direction: prose bigram dictionaries dead, §D-18).

---

## FRONTIER TABLE (honest, measured `M = |wire| + |C|` o200k_base, `D(E) = x` total)

| lane | file | raw | best prior (honest) | HYLE | verdict |
|---|---|---|---|---|---|
| tbl | df-h.txt | 570 | 276 (KIONES) | **237** | **H⁺ +39** (fast, 30 ms) |
| tbl | kubectl-get-pods.txt | 1006 | 381 (KIONES) | **352** | **H⁺ +29** (fast, 21 ms) |
| tbl | psql-output.txt | 675 | 364 (KIONES) | **268** | **H⁺ +96** (fast, 20 ms) |
| tbl | markdown-table.md | 330 | 203 (KIONES) | 219 fast / 205 full | H⁻ −16 / −2 |
| tab | aapl-2014.csv | 3108 | 1277 (AION) | **1264** | **H⁺ +13** (full, 278 s) |
| tab | vix-daily-1990.csv | 3412 | 704 (AION) | 2682 fast / **822 full** | H⁻ −118 (2nd best) |
| mk | dump.sql | 1795 | 732 (KIONES) | 824 fast / **650 full** | **H⁺ +82** (full, 256 s) |
| ops | git-numstat.txt | 4632 | 2146 | 3948 fast / **2235 full** | H⁻ −89 (composition gained 1713) |
| ops | package-lock-head.json | 15009 | not re-measured | 13678 (8.9%) | H∂ (no prior receipt this session) |
| json | gh-api.json.txt | 2519 | 1198 | 2348 | H⁻ |
| json | json-pkg.txt | 1152 | 794 | 1108 | H⁻ |
| prose | gh-prose / paper.tex / readme / licenses / work lane | — | 0–2% | identity | H⁻ (0%) — nothing claimed |
| **corpus** | **31 files** | **60 118** | — | **53 162** | **11.6%**, all `exact = true` |

`D(E)` is total for every input: unrecognised or malformed wires are echoed, and
`exact === (decoded === text)` is asserted in all 31 sweep rows, all 16 self-test rows
and all 20 CPython rows.

---

## WHAT Y10 DELIVERS (beyond Y9)

1. A new codec, **HYLE = canonical regeneration**, in the repo, registered,
   type-clean, with a total decoder — Θ(1)-per-column where every prior codec is Θ(n).
2. **Pareto superiority in three lanes**: tbl by 29 / 39 / 96 honest tokens (71 / 163 /
   138 against what the leaderboard actually bills), tab by 13 (`aapl-2014.csv`, 1264 vs
   1277) and **mk by 82** (`dump.sql`, 650 vs 732), the latter two via fold × borrowed-arm
   composition. Margins, not a few tokens.
3. **A second axis: speed.** Folds run in 3–123 ms against 10–157 s for the codecs they
   beat.
4. **A third axis: honest contract accounting**, with measured receipts that change the
   apparent ranking of three existing codecs (GLOSSIA/EIDOS/AION under-bill by
   660–1061 tokens).
5. **An independent CPython verifier** (`bench/hyle_decode.py` + `bench/hyle-crosscheck.sh`,
   20/20 byte-exact) that tests specification sufficiency rather than implementation
   agreement — the repo's 20th cross-check and the strongest evidence available under the
   single-chat access model.
6. **Machine-readable negative space**: `HyleResult.rejected`, per-encode, with candidate
   set tags — so "which mechanism produced the win" is a printed fact.
7. **A complete evaluation of the Sep–Oct 2026 AI mathematics release** against this
   system, per family, with the primary source cached locally and the verdict that it
   contains no information theory and no compression — plus one genuine impossibility
   import (family 118) and one methodological import (certificate + scope note +
   comparator).
8. **An honest downgrade** of the one claim that could not be verified here (LLM decode),
   with the exact test that would close it.

---

## REFERENCES (live, new sites, new terms for Y10 — disjoint from Y7/Y8/Y9)

- `github.com/openai/math` — README + `CONTENTS.md` (638 727 B, cached at
  `bench/tmp/openai-math-CONTENTS.md`), updated 2026-10-08; families 102, 103, 104, 107,
  113, 118, 119, 121, 126, 128, 133 read individually.
- `arxiv.org/html/2605.29000` — *Text-Preserving Lossy Text Compression: Strategic
  Deletion and LLM Reconstruction* (May 2026). The lossy dual of HYLE; source of the
  three-tier cost accounting adopted in §A3/§"AI-NATIVE".
- `proceedings.iclr.cc` — *LANGUAGE MODELS ARE INJECTIVE* (ICLR 2026) and **SIPIT**: exact
  prompt reconstruction from hidden activations in provable linear time. Theoretical
  license for exact LLM-side inversion; unusable under A2 ⇒ H∂.
- `arxiv.org/html/2601.13398v2` — *Can LLMs Compress (and Decompress)? … via
  Invertibility*: round-trip self-consistency benchmark; documents one-direction accuracy
  with inverted-process failure ⇒ the basis for the §H6 downgrade.
- `arxiv.org/html/2510.18043v1` — **CompactPrompt**: n-gram aliasing + reversible lookup
  table + numeric quantization. The dictionary class; HYLE differs by having **no
  dictionary at all**, only a closed-form generator.
- `openreview.net/pdf?id=vXxardq6db` — **SliceGPT** (ICLR 2024): row/column deletion of
  weight matrices after a learned orthogonal transform. Look-alike, approximate, not text.
- Practitioner sources, uniformly **lossy** (truncation / summarisation / allowlisting
  with "tell the model what you did" caveats), searched with new terms this session:
  `technologyonthe.net` (Oct 2026, tool-result truncation), `analyticsvidhya.com`
  (Jul 2026, prompt-compression guide), `medium.com/@singh.tarus` (table directives),
  `github.com/lemma-work/lemma-platform#735`.
- **Originality statement.** No source found publishes byte-exact regeneration of derived
  table columns via a stated generator function for an LLM decoder. The nearest neighbours
  are lossy deletion+reconstruction (2605.29000), white-box exact inversion (SIPIT),
  dictionary aliasing (CompactPrompt) and approximate weight-matrix deletion (SliceGPT).
- Sites already consumed by prior turns and therefore **not** re-cited as new: unite.ai,
  tech-insider.org, shattered.io, time.news, ethw.org, cris.technion.ac.il,
  diva-portal.org, `github.com/Trae1ounG/Awesome-Parametric-Knowledge-in-LLMs`,
  arXiv 2501.15915, statics.memtensor.com.cn, arXiv 2508.01832v1, aclanthology/pith
  (2412.06926), awesomepapers/emergentmind/alphaxiv (2503.13423 SuperBPE), arXiv
  2505.24689, interestingengineering / whalesbook / xenospectrum / explainx, PMC12330530
  (RLZ), FLASH, GHRR.
