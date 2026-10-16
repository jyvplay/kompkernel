# X20 — tier-5 ultrareview: TYPOS, the restated frontier, and generalized local leaders

Branch `arena/aa13d688-kompkernel`, base commit `9142be1e8bd7f7e5c32dff41db57b585dc1e5d73` (X18).
Codec added this turn: **TYPOS** (`src/lib/omega/typos.ts`, registry key `typos`).
Also restored into the working tree from the committed patch blob and re-registered:
**STATHMOS** (`stathmos.ts`) and **LAKONIKOS-D** (`lakonikos-d.ts`) — both were implemented in
X16/X17 but were absent from the X18 tree.

## RUNTIME HONESTY

What actually ran, and on what.

| Tool | Ran? | What it was used for |
|---|---|---|
| `npm ci` | yes, exit 0 | dependency install (`node_modules` was empty) |
| `esbuild` + `node` (via `bench/x20/run.sh`) | yes | every bench, red team, screen, emit script |
| `node_modules/.bin/tsc --noEmit -p tsconfig.json` | yes, exit 0 after every edit | whole-program typecheck |
| `python3` (CPython 3) | yes | independent reader `bench/typos_decode.py`, table builder `bench/x20/leaders.py` |
| `git` (local) | yes | commits only; **push is blocked in this sandbox** |
| `gh api repos/openai/math/contents/CONTENTS.md` | yes | full 638,727-byte proof index |
| `web_search` | yes, 4 live queries | ISO 8601, ClickHouse encodings, BitTokens, Length-MAX, prompt-compression survey |
| LLM / model API | **no** | none reachable in-sandbox |
| Lean / `lake` | **no** | not installed |
| Simulators, mocks, fantasy data | **none** | every number below comes from a file in `bench/x20/receipts/` |

Two consequences stated up front, because they cap what this report may claim:

1. **`M` is a tokenizer count, not a model evaluation.** `M` = o200k_base tokens of
   `contract + wire` in one chat message (no system prompt, no skills file), counted with
   `gpt-tokenizer` through `src/lib/omega/bpe.ts`. The standing ask "confirm the LLM can natively
   decode the coded text in a single basic chat input/output" is **not performed and not claimed**.
   The strongest evidence available in this environment is the independent CPython reader
   (§H), which reproduces the messages byte-exactly from the contract prose alone.
2. **No OpenAI proof was checked by me.** The `openai/math` statements in §C are *reported* from
   the repository index, not verified; no Lean toolchain exists here.

Concurrency used was OS-level: two `frontier-run.sh` halves plus the lane benches on a 2-core,
3 GB sandbox. No agents, no job system, no cluster.

## A. Formal model

**Admissible objects.** A codec is a pair of total functions over `String`:
`encode : String → Message`, `decode : Message → String`, where `Message` is the literal text of
one chat message (contract sentence(s) + wire, newline-joined).

**Success predicate, with the quantifier order written out.**

```
∀ text ∈ Corpus . decode(encode(text)) = text        (byte equality, not semantic equality)
∧ ∀ text ∈ Corpus . M(encode(text)) ≤ M(identity(text))    (never worse than the base arm)
∧ decode is computable from Message alone — no system prompt, no skills file, no side channel
```

Order matters: the exactness quantifier is universal and precedes the size claim. A codec that
wins tokens on 27 of 28 lanes and fails exactness on one has failed, not partially succeeded. Every
gate in this stack is implemented in that order (`typosEncode` byte-compares the inverse before it
compares token counts).

**Access model.** The reader sees the message text and nothing else. It may not fetch the source,
may not run code, may not consult a dictionary shipped outside the message. The encoder may see the
whole input (it is not online/streaming) but may not change the tokenizer.

**Resource counted.** o200k_base tokens of the message. Secondary resource: encode wall time
(§TYPOS entry in `docs/codecs.md`). Decode time is linear and was not measured.

**Parameter regime, boundary, units, tolerances.** Corpora: 28 canonical lanes
(`bench/x20/lanes-all.txt`, 500 B – 42 KB; `bench/x20/receipts/typos-28-final.jsonl` reports
`rawSum = 62 954` tokens), plus 57 wide lanes for screening and 5 constructed hybrid fixtures.
Units: tokens for `M`, bytes for exactness, milliseconds for wall time. Tolerances: **none on
exactness**; on `M`, ties are reported as ties and a 1-token gain is reported as 1 token.
Deterministic runs set `OMEGA_DET=1`; the timing runs deliberately did not.

**Adjacent-but-different problems that must NOT be substituted.**
- *Approximate* or *semantic* compression (LLMLingua, GIST, 500xCompressor): changes the text or
  needs model surgery. Out of scope.
- *Tokenizer retraining* (BitTokens arXiv 2510.06824, Length-MAX arXiv 2511.20849): better numbers,
  inadmissible — they replace the tokenizer.
- *System-prompt dictionary* (arXiv 2604.13066): inadmissible — the dictionary lives outside the
  message.
- *Rate–distortion / channel coding* (openai/math #276): a different object entirely.
- *Column-store numeric encoding* (Gorilla, ClickHouse): statistical over a column, not a
  one-message text transform. Cited as adjacency, never as prior art for the message form.

## B. Outcome space

Three hypotheses were kept live until measurement closed them:

- **H+ (TYPOS finds a new general mechanism that pays).** *Partly confirmed, with a sharp bound.*
  It pays on 6 of 28 canonical lanes (−346 vs its own chain floor) and is strictly below the
  six-key frontier minimum on 15 of 28 lanes (§C). It does not pay on prose at all.
- **H− (the numeric-shape family is already monetised by DAEDALUS-D, so nothing is left).**
  *Refuted as a blanket claim, confirmed as a per-lane law.* On 2 of 5 hybrid fixtures the
  source-level estimate was +138 and +53 tokens and the realized wire change was **exactly 0**
  (§D.14). The right statement is not "nothing is left" but "the realized gain is ~8 % of the
  source-level estimate".
- **H∂ (a new mechanism exists but is mechanism-equivalent to STATHMOS or AKOLOUTHIA-2).**
  *Refuted by construction and by lane behaviour.* STATHMOS needs a fixed fraction width and fires
  on 1 lane; AKOLOUTHIA-2 needs a constant column step and fires on 8 lanes with zero overlap on
  prose. TYPOS needs only shape repetition, fires on 6 canonical lanes (5 disjoint from STATHMOS's)
  and 3 of 5 hybrid fixtures. It is a third mechanism, not a re-parameterisation.

Declared evidence threshold used to close them: a hypothesis is closed only by a receipt in
`bench/x20/receipts/`, never by an estimate.

## C. Frontier — restated, because the premise was wrong

**The premise "the frontier is DENS-2, AKOLOUTHIA-2, DAEDALUS-D, A10" does not survive
re-measurement.** Command:
`bench/x20/frontier-run.sh <lanes> <out> "dendrons dendron daedalus daedalus-dual akolouthia2 phalanx-a10 lakonikos-d stathmos" 150`.
Receipts `frontier-A.jsonl` + `frontier-B.jsonl` (112 rows each, both `.status: done`) =
**224 cells = 28 lanes × 8 keys**. Table: `receipts/leaders-x20.tsv`, built by `leaders.py` from the
receipts only.

- Over the six frontier keys: **DENS-2 leads 14 lanes, AKOLOUTHIA-2 7, DAEDALUS-D 7.** DENDRON and
  plain DAEDALUS never lead.
- **A10 (`phalanx-a10`) is never the lane minimum on any of the 28 lanes.** It produced a number on
  21 lanes (all worse than plain DAEDALUS, +70…+239) and hit the 150 s per-cell cap on 7
  (git-numstat, openstack, sp500-200.csv, git-log-iso, ops-git-log-stat, spring-framework,
  miniserve). *Honest caveat:* X16/X17 used a 420 s cap, so the timeout count is not comparable to
  those runs; the "never the minimum" claim rests on the 21 completed cells, and A10's exclusion
  from the frontier is a measurement, not a theorem.
- Over the whole registered stack the leaders are **LAKONIKOS-D 10, DENS-2 7, AKOLOUTHIA-2 6,
  TYPOS 4, STATHMOS 1**.
- Sums: six-key frontier minimum **30 184**; whole-stack per-lane minimum **29 794** (−390,
  −1.29 %). The six-key "frontier" understates the stack because it omits LAKONIKOS-D and STATHMOS.

**Generalized local leaders by category** (ask 4; source `leaders-x20.tsv`):

| Category | Lanes | Leader (share) | TYPOS Δ vs frontier | TYPOS below on |
|---|---:|---|---:|---:|
| prose | 7 | LAKONIKOS-D 7/7 | **−65** | 7/7 |
| temporal-table | 4 | TYPOS 2, STATHMOS 1, DENS-2 1 | **−234** | 3/4 |
| ops-listing | 10 | DENS-2 5, LAKONIKOS-D 3, TYPOS 2 | +102 | 5/10 |
| ops-table | 3 | AKOLOUTHIA-2 3/3 | +163 | 0/3 |
| markup-log | 2 | AKOLOUTHIA-2 2/2 | +137 | 0/2 |
| other | 2 | DENS-2 1, AKOLOUTHIA-2 1 | +32 | 0/2 |

**Exact attribution of the −390** (computed from `leaders-x20.tsv`, per lane):
TYPOS's *own* mechanism contributes **−469** on 5 lanes (sp500 −166, vix −168, aapl −102,
git-log-iso −32, ops-git-log-stat −1); the inherited LAKONIKOS-D contract contributes **−110** on
12 prose/ops lanes but is **+189 worse** than the frontier minimum on 3 table lanes (aapl 97,
sp500 81, vix 11). Net inherited: **−79**. So `390 = 469 − 79`. **The prose wins are X16's, not
this turn's.** That is the honest split and it is the answer to "STATHMOS was benchmaxxed".

**Imported results restated with their hypotheses** (not re-derived): AKOLOUTHIA-2's progression
elision is sound only under a constant column step and a `⁺`-free input, and it refuses numbers
above 15 digits (X11, 43/43 exact). DENDRON-S's brace factoring is sound only when non-conforming
lines are marked `!` (X14). LAKONIKOS-D's saving is a contract-text saving, i.e. a constant per
message, which is why it is worth 5–11 tokens and never more. None of these is a theorem about
arbitrary text; each is a measured property of its gate.

**Exact open interface.** The stack has no codec that leads both ops-table and prose. Concretely:
`df-h` (171), `kubectl` (326), `psql` (355) are won by AKOLOUTHIA-2's column progression, and no
member of the LAKONIKOS-D ⊂ STATHMOS ⊂ TYPOS chain even ties them (269/380/366). **The named open
interface is a cascade that admits AKOLOUTHIA-2 as an arm under the same gate** — TYPOS's cascade
machinery already exists; the arm does not. That is the single highest-information next step.

**OpenAI `openai/math` review (ask 11), method corrected.** Earlier turns read `CONTENTS.md` in
chunks and covered ~10 % of it. This turn the whole 638,727-byte index was downloaded, all **372
result families** were parsed, and all were keyword-scanned
(`compress|entropy|Kolmogorov|superstring|edit distance|coding|succinct|tokeniz|Huffman|zip|
rate-distortion`). Result: 27 hits; **0** families mention Huffman, Lempel, straight-line programs,
run-length, Shannon, source coding, LZ7 or "data structure". 7 families read in full; **none yields
a codec mechanism**:

| # | Statement (reported, not verified) | Verdict for compression |
|---|---|---|
| 099 | edit-distance ℓ1 distortion `exp(Θ(√(log d·log log d)))` | a *negative* result: sketch-based near-duplicate matching cannot be constant-distortion → argues for exact matching (ANTIPHON/HOMOIOS), not for a codec |
| 121 | almost-linear randomized `(1+ε)` edit distance | diff-style only; randomized; not applicable |
| 122 | trace reconstruction `n^Ω(log log n)` traces | deletion channel; not exact text |
| **128** | **deterministic factor-2 shortest common superstring**, explicitly *not* maximum-overlap greedy | the only plausible link; **rejected on measurement grounds**: a superstring wire must also carry per-input offsets, and on exactly the lanes where overlaps dominate (find-listing 1318, git-numstat 1904, spring-framework 963) DENDRON-S already factors the shared prefixes and is the measured leader. Not built. |
| 129 | exponential state cost for two-way automata (Sakoda–Sipser) | a succinctness *lower* bound; consistent with the contract-length floor, not a proof about it |
| 229 | Potts/tree reconstruction thresholds | none |
| 276 | classical capacity of generalized amplitude damping | quantum channel capacity; no classical text codec follows |

**New live searches (ask 9), on sources not previously cited.** ISO 8601 basic format
(iso8601.com; maketimestamp.com/guides/iso-8601-format-explained; devryo.com; unseel.com) —
`20260526T143000` is the *standard* separator-free rendering of `2026-05-26T14:30:00`; this is the
honest prior art for TYPOS's date arm and is why TYPOS is framed as a standards-legible
normalisation rather than an invention. ClickHouse engineering, "Database compression: encodings,
codecs and ratios" (2026) and Gorilla (VLDB 2015) — column stores stack *type-aware* encodings
under a type-blind codec; adjacency only, not a one-message transform. arXiv 2510.06824
**BitTokens** — desiderata for numeric token encodings, one token per IEEE-754 value; **inadmissible
(new tokenizer)** but the closest published work on numeric-literal token cost. arXiv 2511.20849
**Length-MAX tokenizer** — maximises `freq(t)×|t|`, −14…−18 % tokens/char; **inadmissible**, but it
validates average-token-length as the right objective, which is exactly what TYPOS's estimator
approximates. arXiv 2604.13066 — lossless in-context dictionary compression, **system prompt ⇒
inadmissible**. emergentmind.com prompt-compression survey — the lossless class caps below 20× and
no published method is a one-chat separator-shape transform. Practitioner advice (medium.com,
neuraltrust.ai) is *static hand-picked* delimiters, never per-text inferred shapes with a stated
inverse. **Conclusion: no published one-message, shape-keyed, separator-eliding codec was found;
TYPOS is not a rename of any of them, and the parts that are not new (separator removal, ISO basic
format, type-aware numeric encoding) are named as such in `docs/codecs.md`.**

## D. Negative space — 18 result shapes that look like a solution and break the contract

1. Report a **gross source-token saving** as the win. (Killed: `probe-transforms.tsv`.)
2. Claim exactness from `exact: true` in the encoder result when the arm fell back to identity.
   (Killed: this turn — a real pre-existing false-exactness defect, see §I.)
3. Use a **system prompt** for the shape table (arXiv 2604.13066 style). Breaks the access model.
4. Use a **new tokenizer/embedding** (BitTokens, Length-MAX). Breaks the access model.
5. Declare a shape whose digit count collides with another declared shape. Non-invertible:
   `99999999` could be `9999-99-99` or `99:99:99.99`. Caught by the injectivity condition (i).
6. Split **every** digit run of a declared length, including foreign bare runs. The canonical
   failure found this turn: `a692162415ae` re-expanding to `a69.9216-24-15ae`. Caught by (ii) and by
   the `isolated`/`marked` rules.
7. Pre-filter candidate shapes from the input's *maximal* runs. Unsafe in principle (a foreign run
   can share a length) and over-strict in practice; abandoned.
8. Treat the tokenizer-only estimate as a **filter** rather than an ordering. On `vix` the date and
   price shapes both pack to 8 characters, so a single-best-plan encoder kept the wrong one and
   shipped nothing. Fixed by the cascade.
9. Put space in the separator set by default. Merges whole log-line prefixes into one 28-digit
   mega-shape (openstack 166 → 393); brittle. Kept opt-in as `TYPOS_SEPS_WIDE`.
10. Re-base numbers (hex, base-36, base-62). Measured dead: o200k gives ≈3 digits/token
    (≈9.97 bits) vs ≈17 bits per arbitrary Unicode token, so a 20-bit value costs 2 tokens either
    way.
11. Per-row delta columns. Pays only when the delta is much shorter than the value; false for
    two-decimal prices.
12. Thousands separators / digit grouping: +55 % (X16 negative, reproduced in `probe-transforms`).
13. Typographic normalisation (curly quotes, dashes): 0 of 8 files.
14. **"The estimate says +138, so it is a win."** The single most dangerous shape this turn.
    `hybrid-report-prices`: strict plan, shape `99.999999`, 160 occurrences, estimate **+138**;
    shipped wire change **0**. `hybrid-transcript-times`: estimate **+53**; shipped **0**. The gate
    caught both. Test that detects the failure: `bench/x20/hybrid-prose.ts` prints both numbers
    side by side and writes `receipts/hybrid-prose.jsonl`.
15. Report the six-key frontier as "the frontier". It omits LAKONIKOS-D and STATHMOS and understates
    the stack by 390 tokens.
16. Count a codec as a leader because its *label* claims a composition (PARADEIGMA + DAEDALUS-D vs
    PHALANX-A10). The two names in the tree disagree; unresolved since X11.
17. Report a timeout cell as a loss or as a win. It is neither; it is `-` and the lane is excluded
    from that codec's tally.
18. Call a mechanism "greedy" when it is a per-input minimum over full codecs. The stack contains
    both and they cost differently (§`docs/codecs.md`, selection taxonomy).

Also carried, still negative, still not to be re-argued: ONOMASIA, KLADOS, language-tier aliases
(net bound 18 tokens over 27 lanes), contract tail capped at 28–48 tokens, superstring + offsets,
sorted list + permutation, HOMOIOS 0/30, DIAPHORA 0, CTXCOPY (needs the earlier version in chat).

## E. Mechanism portfolio — 6 mechanism-distinct approaches, kept independent

Each: central construction, artifact, proved part, unresolved interface, cheapest falsification,
gap locality.

**E1. TYPOS — shape-keyed separator elision (new this turn; the shipped one).**
Construction: declare shapes, delete separators of matching runs, restore by digit count.
Lemma: with (i) digit-count injectivity on the declared set and (ii) no foreign in-scope bare run of
a declared length, the transform is a bijection on digit runs; maximal runs are separated by at
least one non-run character, so no merging occurs. Artifact: `src/lib/omega/typos.ts` (registered),
`receipts/typos-28-final.jsonl`, `receipts/hybrid-prose.jsonl`, `bench/typos_decode.py`.
Proved/checked: the lemma is argued in the file header and *enforced* by a byte comparison of the
inverse on every encode; 28/28 lanes + 5/5 fixtures + 858 fuzz plans exact. Unresolved interface:
admissibility of `strict` is decided per input and prose almost always fails it, so prose gets
nothing. Cheapest falsification: run `bench/x20/typos-bench.ts` on any corpus and look for
`exact:false` or `delta>0`; also `python3 bench/typos_decode.py in.json out.json` and diff.
Gap: **local** — a new reader rule (e.g. context-keyed rather than length-keyed) could widen
admissibility without touching the rest of the stack.

**E2. Cascade over base arms (TYPOS's selector).** Construction: estimate orders ≤4 arms over two
bases; first arm passing both gates ships. Artifact: `typosEncode` + the `chained` flag. Proved:
`M(TYPOS) ≤ M(STATHMOS) ≤ M(LAKONIKOS-D)` by construction of the gate (22/28 ties, 0 losses).
Unresolved: the cascade does not contain AKOLOUTHIA-2 or DENS-2 arms (§C open interface).
Falsification: find one input where TYPOS's `M` exceeds its base — the receipts show none in 33
inputs. Gap: **local**.

**E3. Fixed-width fraction stripping with a header line (STATHMOS).** Artifact: `stathmos.ts`.
Proved: padding inverse is exact for a recorded `D`. Measured: 1 of 28 lanes (vix 1380→1212).
Unresolved: needs a uniform fraction width; real exports vary. Falsification: any CSV whose column
has mixed widths → gate refuses. Gap: **local and narrow** — this is the benchmaxxing the user
called out, and it is now measured rather than asserted.

**E4. Column arithmetic-progression elision (AKOLOUTHIA-2).** Artifact: `akolouthia2.ts`,
`bench/akolouthia_decode.py`. Proved: `v(i,k) = v(i−1,k) + step` inverts the `⁺` mark. Measured:
frontier leader on 7 lanes; 0 on prose. Unresolved: needs a constant step. Falsification: a column
with one perturbed value kills the whole column. Gap: **local**; it is also the missing cascade arm.

**E5. Brace-tree path factoring (DENDRON-S).** Artifact: `dendrons.ts`. Measured: frontier leader on
14 lanes, stack leader on 7. Unresolved: only helps when lines share first segments.
Falsification: shuffle line order and re-measure. Gap: **local**.

**E6. Superstring + offsets (rejected executable design).** Construction: deterministic factor-2
shortest common superstring (openai/math #128) as the shared skeleton, plus per-input offsets.
Proved part: the factor-2 bound is reported, not verified. Rejected by measurement: on the three
lanes where it would apply, DENDRON-S is already the leader (1318 / 1904 / 963) and the offset
channel is not free. Cheapest falsification if anyone wants it: encode `find-listing` with a
superstring wire and compare to 1318. Gap: **equivalent to the original problem** — it needs a
general offset encoding, which is the problem itself. Not built.

## F. Artifact requirement — what each branch returned

| Branch | Artifact kind | Path |
|---|---|---|
| TYPOS mechanism | executable design + reproducible experiment | `src/lib/omega/typos.ts`, `bench/x20/receipts/typos-28-final.jsonl` |
| TYPOS invertibility | argument + enforced gate + independent reader | header of `typos.ts`; `bench/typos_decode.py`; `bench/x20/typos-crosscheck.sh` |
| TYPOS adversarial | reproducible experiment | `bench/x20/typos-redteam.ts` (858 plans, 0 fails) |
| Frontier claim | reproducible experiment + quantitative bound | `bench/x20/frontier-run.sh`, `receipts/frontier-{A,B}.jsonl`, `receipts/leaders-x20.tsv`, `bench/x20/leaders.py` |
| Generalization to prose (ask 8) | counterexample + quantitative bound | `bench/x20/hybrid-prose.ts`, `receipts/hybrid-prose.jsonl` |
| Screen negatives | quantitative bounds | `bench/x20/probe-transforms.ts`, `receipts/probe-transforms.tsv`, `bench/x20/contract-variants.ts` |
| CHIRON frame defect | counterexample | `bench/x20/dbg-frame.ts` |
| OpenAI math review | negative result with method | §C (372 families scanned) |
| Spec page | deliverable | `docs/codecs.md` |

No status reports; every row is a file or a number.

## G. Second-order adversary A(C), per candidate

**A(TYPOS).** Strongest attack: find an input where the reader's digit-count rule is ambiguous
despite both conditions. Edge case that *nearly* works: a text containing both `20260526` (an image
of `9999-99-99`) and a genuine bare 8-digit run — condition (ii) rejects the shape, so the arm is
dropped rather than corrupted; verified by the fuzz family (`partB_byMode.strict = 404`, 0 fails).
Limiting regime: a corpus of *only* packed numbers (nothing to declare) → 0 shapes, identity arm,
correct. Hidden assumption: the mark alphabet `TYPOS_MARKS` contains a token absent from the input
and of exactly 1 token; the encoder filters on both, and if fewer marks than shapes remain free it
skips marked mode entirely. Quantifier order: exactness is checked before the size gate in code, so
a cheaper-but-inexact arm cannot ship. Global compatibility: the arm sits *on top of* STATHMOS, so
the packed digits are STATHMOS's zero-stripped digits; the inverse is applied in the opposite order
(`typosExpand` then the CHIRON/STATHMOS restore), which is what `chained` records.

**A(cascade).** Attack: the estimate is wrong and the best arm is never tried. Mitigation: the
estimate only orders, and `maxPlans` bounds the cascade at 4; on `vix` all three chained arms were
tried and all were rejected by the gate (1342 / 1351 / 1246 vs base 1212) — the correct outcome.
Residual risk: a lane where the 5th-best arm would have won is missed. Bounded, not eliminated.

**A(STATHMOS).** Attack: a column whose `D` is recorded but whose cells include a non-numeric
sentinel. The encoder only declares all-numeric columns and byte-compares; the fuzz family covers
mixed content.

**A(the frontier restatement).** Attack: the 150 s cap changes the A10 result. Accepted limitation,
stated in §C: the "never the minimum" claim rests on the 21 completed cells only.

**A(imported theorems).** Attack: openai/math #128's polynomial bound is in *encoded* input size, so
it does not bound our wire. Agreed; it is cited as a statement, and the codec was not built on it.

**A(LLM decodability).** Strongest and unresolved: an independent CPython reader is a *deterministic
parser of the contract sentence*, not a model. It proves the contract is unambiguous enough to be
implemented from its own text; it does **not** prove a model will follow it. This is the largest
unverified assumption in the whole stack and it is unchanged from X11.

## H. Verification — what was externally verified, what was downgraded

- **Independent CPython reader (strongest evidence available).** `bench/typos_decode.py` was written
  from the contract prose; it parses the shapes and marks out of the printed sentence and calls
  `bench/chiron_decode.py`. Via `bench/x20/typos-crosscheck.sh`, re-run on the final code:
  **6/6 lane messages byte-exact** — 5 strict-rule (aapl, sp500, psql, git-log-iso, miniserve) and
  1 isolated-rule (ops-git-log-stat, whose sentence carries `Leave a digit run inside a word
  alone.`; the reader detects that clause and applies the in-word guard) — plus **2/2 forced
  marked-rule messages byte-exact** (sp500 with mark `†`; git-log-iso with marks `†‡◆` and 3
  shapes). So all three reader paths have been reproduced outside TypeScript. Receipts
  `receipts/typos-py.json`, `receipts/typos-marked-py.json`.
- **Determinism checked, not assumed.** The reader prints a coarse `mode` label of `strict` for both
  strict and isolated messages, distinguished only by its separate `isolated` flag. I first read
  that label as evidence that the encoder's rule choice depends on call history, and tested it:
  `typos-emit.ts` over all 6 lanes records `rule=isolated` for `ops-git-log-stat.txt` in
  `receipts/typos-meta.json`, `typos-emit.ts` over that lane alone records the same, and
  `typos-bench.ts` on that lane alone gives `rule=isolated`, `M=3483` under both `OMEGA_DET=1` and
  `OMEGA_DET=0`. The difference was the reader's label, not the encoder's behaviour. **No
  order-dependence is claimed and none was found.** (A finer per-call-history probe,
  `bench/x20/dbg-order.ts`, was written but its full run exceeded the 20-minute command window and
  was abandoned; nothing above rests on it.)
- **Red team.** `bench/x20/typos-redteam.ts` (v3, structured fuzz):
  `{"partA_cases":21,"partA_transformed":1,"partB_fuzzCases":4000,"partB_fuzzWithPlan":441,
  "partB_plansChecked":858,"partB_byMode":{"strict":404,"isolated":206,"marked":248},"fails":0}`.
  All three reader modes exercised; Part C checks per-plan invertibility.
- **Typecheck.** `node_modules/.bin/tsc --noEmit -p tsconfig.json` → exit 0 after every edit.
- **End-to-end lane bench.** 28/28 exact, 0 losses, 22 ties, 6 transformed,
  30 665 → 30 319 (−346, −1.13 %) against the chain floor.
- **Hybrid-prose generalization (ask 8).** 5/5 fixtures byte-exact through the library reader;
  3/5 transformed: changelog+sp500 rows **−25** (marked, 7 shapes, 150 occurrences),
  kb+psql block **−16** (strict, 2 shapes, 48 occurrences), random-spliced numbers **−1**;
  2/5 neutral with estimates of +138 and +53 realizing 0. Realization ≈ 8 % of estimate.
- **Downgraded to *not performed*:** single-chat LLM decode (no model reachable); Lean checking of
  any openai/math proof (no toolchain); timing as a study (single runs, production clock, 2 cores).
- **Self-review is not counted as verification anywhere above.**

## I. Repair — the CHIRON frame defect found this turn

The red team's first version failed one case, `edge:chiron frame`, and the cause was **not** in
TYPOS: `lakonikosDualEncode` on an input that already begins with the CHIRON frame `§¶` returns
`mode='raw'`, `wire='§¶'+text` and `exact=true`, while `chironDecode(wire)` returns something else
(counterexample: `bench/x20/dbg-frame.ts`). TYPOS inherited that `exact` flag from its base arm and
would have reported a false exactness.

Repair, with no trust inherited: TYPOS's base arm now takes `decoded`/`exact` from an **actual
decode** rather than from the base codec's self-report, so the flag is recomputed. Gates re-run
after the patch: typecheck exit 0; 28-lane bench re-run (`typos-28-final.jsonl`, 28/28 exact);
red team re-run with a **new attack aimed at the patch** — the structured fuzz family (§H), 858
plans, 0 fails — plus the two forced marked-rule messages, which did not exist before the repair
and are the direct test of the changed path.

**Not fixed, stated plainly:** `lakonikos-d` and `daedalus` still carry the same false-exactness
defect for `§¶`-prefixed input. No lane in any corpus starts with `§¶`, so no reported number is
affected, but the defect is real and is now recorded in `docs/codecs.md`.

## J. Stopping

This turn stops because its own success predicate is met, not because the problem is believed open:

- **A new codec was created and registered** (TYPOS) and it satisfies the standing constraints:
  byte-perfect (28/28 lanes, 5/5 fixtures, 858 fuzz plans), exact lossless, direct-reasoning,
  decodable from one message's text (demonstrated by an independent reader, **not** by a model).
- **It improves the frontier by more than a few tokens**: −346 against its own chain floor, −390
  against the six-key frontier minimum on a per-lane basis, with −166 on a single lane.
- **The frontier premise was tested and restated** with 224 measured cells (§C).
- **Generalized local leaders** are tabulated by category (§C).
- **The spec page** `docs/codecs.md` now carries TYPOS, STATHMOS, LAKONIKOS, LAKONIKOS-D, the
  greedy/tournament taxonomy, per-entry citations and per-entry time bounds.

**Exact remaining gap.** (1) No LLM decode was performed — the single-chat claim is unverified.
(2) TYPOS's own mechanism is worth 0 tokens on prose; the prose wins belong to LAKONIKOS-D (X16).
(3) The stack has no arm that leads ops-table; TYPOS is 98/54/11 tokens behind AKOLOUTHIA-2 on
`df-h`/`kubectl`/`psql`. (4) `lakonikos-d`/`daedalus` still misreport exactness on `§¶`-prefixed
input.

**Next highest-information test, in order.** (a) Add AKOLOUTHIA-2 as a fourth cascade arm under
TYPOS's existing gate and re-run the 28 lanes — this is the only change that could make the chain
lead ops-table as well as prose and the dated tables, and it needs no new mechanism. (b) Reach a
model endpoint and run the blind single-chat decode on the 8 CPython-verified messages; that single
experiment converts the largest unverified assumption in the stack into evidence either way.
(c) Re-run A10 at a 420 s cap on the 7 timed-out lanes so its exclusion rests on completion rather
than on a cap.
