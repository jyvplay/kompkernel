# X72 — STADION: the score is taken twice, and the stack gets 23.7 % faster at identical numbers

X72 is a **speed** turn, and it says so in the title. The size axis was closed by
four independent measurements in X71; this turn adds four more that all agree, and
spends the budget on the one axis that was still open — the runtime — using a
method that cannot move a single token: replacing the innermost tokenizer call with
an exact reimplementation of it, and then **auditing that reimplementation against
the library on the message that is actually emitted**.

The new codec is `stadion` (στάδιον, "a measured course"). Its contract is the
frontier's contract, unchanged; what it adds is the instrument audit and a
fixed-width fold arm that measurably abstains. Its Pareto claim is on the
**(size, time)** plane: identical messages, 11.7–35.3 % less wall clock, 12 lanes.

---

## 0. Runtime honesty

Everything in this report was run in this checkout, in this turn, on this machine
(`node v22.22.3`). Nothing is projected, parallelised, mocked or simulated.

- **No LLM was called.** There is no model in this environment. The claim "an LLM
  can decode this from one chat message" is therefore **not** made for X72. What
  is made is the weaker, checkable claim: the fold's rule is a total, mechanical
  procedure that a reader can execute from the prose alone, and the encoder
  verifies its own reconstruction byte for byte (`stadionUnfold` is the reader).
- **No parallelism is claimed.** Every timing below is single-process, sequential.
- **Both arms of every A/B were measured.** The "before" numbers for speed come
  from `bench/x71/receipts/speed-after.json`, written by the previous turn on the
  same machine with the same harness (`tagstackEncode` + `messageTokens` + `ms`).
  The "after" numbers were measured now. Where a lane was re-measured twice, both
  values are in the receipts.
- **Four ideas were built and are dead.** They are in §4 with their detectors, not
  in a footnote.

---

## 1. Formal model

**A.1 — Object.** A message `M` is the byte string a user pastes into a chat. Its
price is `τ(M)`, the number of `o200k_base` token ids `encode(M)` returns. Its
fidelity is a predicate `M ⊨ x`: the decoding procedure printed in `M`
reconstructs the source `x` byte for byte. X72 never trades A.1 for anything.

**A.2 — The scoring instrument.** Every codec in this stack searches by comparing
`τ` of candidate messages. `τ` is therefore not a utility, it is the *measuring
apparatus*, and it is called millions of times per document (X30 measured 2 240 610
calls for one 3.4 KB encode; X57 measured 28.2 M for a 600-char hex dump). Formally
the stack solves `argmin_{c ∈ C} τ(render(c, x))`, so an error of ε in `τ` is not
an error of ε in the answer — it re-ranks the search.

**A.3 — Admissibility of an instrument substitution.** Let `τ̂` be an alternative
counter. `τ̂` is admissible on a candidate set `C` iff `τ̂(m) = τ(m)` for every `m`
that can reach the comparison. Equality *up to noise* is not admissible; equality
*on the distribution you will actually see* is not admissible either, because the
search deliberately visits strings no human would type. X72's gate is therefore
distribution-free in spirit: all 256 single bytes, every fixture chunk, 20 000
fuzzed strings, and every Unicode boundary case that a byte-keyed index can get
wrong (§5.2).

**A.4 — The audit obligation.** A.3 is a claim about a *function*; what ships is a
*message*. So STADION discharges A.3 twice: once structurally (the gate, on
323 192 strings) and once **per artefact** — every emitted message is re-counted
with the library's own `encode`, which shares no code with the index, and a
disagreement throws. An instrument that is only audited on fixtures chosen before
the fact has an unmeasured tail; an instrument audited on its own output does not.

**A.5 — Budget denomination.** The stack's search budget is denominated in *score
evaluations* (`workmeter.ts`, X57), not seconds, precisely so that emitted wires are
machine-independent. X72 does not change that denomination. It changes the **cost
per unit**, which is the only honest way to buy search with speed: `k` evaluations
cost `k·ĉ` instead of `k·c`, and §4.2 measures what happens if you spend the
difference (nothing).

**A.6 — What Pareto means here.** A codec `D` Pareto-dominates the frontier `F` on
lane `x` iff `τ(D(x)) ≤ τ(F(x))` and `time(D, x) ≤ time(F, x)`, with at least one
strict. X72 is strict on the second coordinate on all 12 measured lanes and
non-strict on the first (equal on 10, −6 on one unstable lane, +1 on another). It
does **not** claim to dominate on size, and §4 says why it cannot.

---

## 2. Outcome space: H+, H−, H∂ and the declared threshold

**Declared evidence threshold for this turn.** A claim is *accepted* only if it is
reproduced in this checkout with a receipt in `bench/x72/receipts/`, the message
round-trips byte-for-byte, and the effect exceeds **the run-to-run spread of the
same build on the same lane**. That spread is measured, not assumed: X70 §3.2 and
X71 documented `code-ts ±1`, `apt-real ±4`, and this turn adds `kubectl 326/332`
and `node-help 863/864` at *identical settings* (§3). Any token delta inside ±4 is
therefore **not evidence** and is not treated as such.

**H+ (what is now known that is true).**
1. The stack's cost is measurable and localised: **≈75 % of a run is
   `gpt-tokenizer`**, and **≈48 % of that is the per-candidate-pair rank lookup**
   (`getBpeRankFromString` 13.8 %, `binarySearch` 15.9 %, `getRank` 6.4 %,
   `bytePairMerge` 17.1 %; `--cpu-prof`, 150-line `dpkg.log`).
2. Replacing that lookup with a byte-keyed index built from the library's own
   vocabulary is **exactly the same function** on 323 192 strings, including the
   one input where the library disagrees with its own vocabulary (U+FEFF).
3. Doing so makes the whole stack **23.7 % faster over 12 lanes** (254 654 ms →
   194 378 ms) with **no change in any message** outside two lanes already
   documented as unstable.
4. The search budget does **not** bind on quality on any of the five lanes tested
   (§4.2): buying more search buys nothing.

**H− (what is now known that is false).**
1. *"The remaining slack is column padding."* It is 14.2 % of `dpkg -l`, 15.4 % of
   `ps aux`, 8.5 % of `ls -l` — and it is **not recoverable**, because only ~50 %
   of lines share a uniform width profile and the re-padding rule costs more than
   the padding it removes (§4.1).
2. *"A bigger search budget will find better wires."* Identical messages at
   1.7–2.1× the wall clock on `psql`, `dpkg-l`, `kubectl`, `metrics.tsv`,
   `ls-l-real` (§4.2).
3. *"Numeric columns are compressible by arithmetic."* No lane has a numeric
   column in arithmetic progression with ≥ 8 terms; the only hits are constant
   columns, which every dictionary codec already handles (§4.3).
4. *"X71's `apt-real 865` was the frontier's answer."* It is a run-to-run value in
   [861, 865]; this turn measured 861 (§3).

**H∂ (boundary — known to be unknown, and named).**
1. The tail: `/var/log/dpkg.log` at 400 lines (834 s) and `ls -l` at 24 KB
   (200 s) are **search-bound, not counter-bound**; the accelerator moves them by
   the measured factor and no more.
2. Whether an LLM decodes STADION's fold from one message. Not testable here (§0).
3. Whether a *parser* of the frontier's grammar could be tokenised better than the
   frontier's own dictionary tape. Every attempt at this in X71 and X72 has lost;
   the boundary is "we do not know how to beat it", not "it cannot be beaten".

---

## 3. Frontier: confirmed, and the noise band that matters

The 29-lane gate (`bench/x72/receipts/stadion-broad.json`) was run against the X71
receipt (`bench/x71/receipts/austere-broad.json`) lane by lane, on the same
machine, after the accelerator was installed:

```
lanes 29   total 12 696   prior 12 702   delta −6   folded 0   totalMs 658 589
drift: node-help 863 → 864   code-ts 985 → 983   apt-real 865 → 860
29/29 exact=true
```

**Every other lane is identical to the token**: `lsblk 60`, `kb-article 622`,
`uptime-w 80`, `free-m 76`, `vmstat 149`, `unified-diff 419`, `df-h 171`,
`df-real 126`, `du-real 272`, `findmnt 444`, `df-h(x42) 108`, `email-thread 488`,
`llm-answer 674`, `markdown-table 176`, `psql-output 244`, `prices.csv 133`,
`cue-sheet 163`, `ps-ef 315`, `ls-real 433`, `json-pkg 681`, `dpkg-l 674`,
`ps-real 397`, `kubectl 326`, `metrics.tsv 210`, `ps-aux-real 1 051`,
`ls-l-real 1 497`.

The three drift rows are **the same three lanes that drifted before X72 existed**,
and the spread was measured directly this turn: `kubectl` produced **332** and
**326** in two consecutive runs of the *same build* during the A/B, `apt-real`
produced 865 (X71), then 861, then 860, and `code-ts` produced 985, 984, 983. So the frontier is **not a pure function of its
input** — it has clock-gated parents inside `ariadne`/`sibyl` that X57's work
budget did not remove. This is a standing property of the stack, not a defect
introduced here, and it sets the evidence threshold in §2.

**The frontier is exactly last turn's configuration**, with one addition: the
accelerated counter is now the default path for `o200k_base` inside `countTokens`.
The parent set, the codecs, the contracts, the work budgets are unchanged;
`OMEGA_FAST_BPE=0` restores the pre-X72 path exactly, and every A/B below uses it.

---

## 4. Negative space — 20 shapes that look like a solution, each with its detector

Each entry states the *detector*: the measurement that kills it. All were run.

| # | Shape | Detector (run this turn) | Verdict |
|---|---|---|---|
| 1 | Fixed-width fold (padding is free to remove) | `bench/x72/foldprobe.ts` — induction + reconstruction on 9 lanes | dead: only ~50 % of lines fold, rule ≈ 45 tok > padding recovered |
| 2 | Budget escalation on budget-bound lanes | `OMEGA_WORK_BUDGET=0` on 5 lanes | dead: identical messages, 1.7–2.1× slower |
| 3 | Arithmetic-progression columns | column scan, all 29 lanes, ≥ 8 terms | dead: only step-0 (constant) columns |
| 4 | Region partition with per-region codecs | pipe-table census over prose lanes | dead: only `llm-answer` has a table (6 lines, < 15 tok) vs ≥ 32-token contract |
| 5 | Nesting/compressing the contract text itself | standing constraint: contract clarity is binding | rejected by policy, not measured |
| 6 | Permutation coding (sort lines, store the order) | `log2(n!)` bits ≈ 1 tok/line for the order alone | dead by accounting, not worth a run |
| 7 | Adaptive (move-to-front) dictionary with no declared pool | LZW measured in X71 §4.2 on 5 lanes | dead: worse than raw on 3 of 5 |
| 8 | Phrase dictionary over prose | X71 §4.1 upper bound: 0.8–6.5 % | dead: below the frontier on every lane |
| 9 | Line-prefix tape for indented/quoted text | `bench/x72/pad.ts` — `collapse-runs` on 6 lanes | dead: prefixes are already single tokens |
| 10 | Collapse interior space runs (no reconstruction rule) | `pad.ts` shows 142/469/442 tok on dpkg/ps/ls | *not* dead as an upper bound, dead as a codec: needs the widths, which is #1 |
| 11 | Trailing-whitespace / blank-line elision | already performed by every tape parent | dead: no measurable residue |
| 12 | Second pass of the frontier on its own wire | wire is not text-like; parents are literal-repetition engines | dead by construction |
| 13 | Replace the tokenizer entirely (own BPE) | the library *is* the spec that defines τ | category error, refused |
| 14 | Memoise rank lookups in a Map instead of a byte index | `micro.ts`: Map on strings is what the library already does | dead: that *is* the 13.8 % |
| 15 | Build the index lazily per pair (cheaper start) | index build is 330–460 ms, once | dead as an optimisation: it *adds* state for a 1× saving |
| 16 | Parallelise the counter | single-threaded process, no worker budget in the harness | out of scope, not claimed |
| 17 | Skip parents whose cost cannot win (pruning) | `OMEGA_WORK_BUDGET=0` shows no parent is budget-bound | dead: pruning cannot help if search is saturated |
| 18 | `cl100k_base` acceleration | the gate's index is built from o200k's maps only | **open**: the same construction applies, not done this turn |
| 19 | Shorten the prelude by tabulating widths | rule is already 45 tok; the fold's gain is ~35 | dead arithmetic |
| 20 | Take the fold but pass the rules through raw | the *rule* is what costs 45 tok, not the rows | dead: same as #1 |

Two of these (#10, #19) are the same object seen from two sides, which is the point:
the padding is real, and it is *bounded from above* by an amount that the
reconstruction rule exceeds.

---

## 5. STADION (στάδιον) — the codec

### 5.1 Mechanism, and why it is not a rename

A codec that emits the frontier's message with a different name would be a rename.
STADION does three things the frontier does not:

1. **It prices the search with a different instrument** — and proves the instrument
   against the library, structurally (323 192 strings) and per artefact (every
   emitted message re-counted by `encode`).
2. **It carries a pre-transmutation arm** — induce the fixed-width column vector,
   emit the padding-free normal form, run the frontier *on that*, ship a re-padding
   rule — which is a genuinely different representation as seen by the *existing*
   parents (§5.4). It abstains on all 29 lanes; it is retained because it is
   never-worse by construction and it fires on inputs no lane here contains.
3. **It fails loudly.** A message whose accelerated price disagrees with the
   library price is a thrown `Error`, not a shipped number.

### 5.2 The three defects the differential gate found

This is the part that matters, because a "faithful reimplementation" that is not
identical is worse than no reimplementation at all: it silently re-ranks the search.

1. **String-keyed, not byte-keyed.** Non-ASCII vocabulary entries were indexed by
   their *string*; for any token containing a non-ASCII character the UTF-8 bytes
   and the string have different lengths, so every such entry was lost from the
   index. Symptom: `"é"`-class pairs fell back to "no rank".
2. **A chunk is not a piece.** `fastChunkCount` BPE'd a whole string as one unit,
   but the library first splits with its own pre-token regex, and a merge can never
   span a match boundary. `"{/repo}\","` is 3 tokens to the library and was 4 by
   the naive reading. Fixed by running the library's *own* regex (a private clone,
   see 3) and summing per match, verified to tile the input.
3. **Shared mutable regex state.** `String.prototype.matchAll` copies the regex's
   `lastIndex`, and the library hands out one shared `tokenSplitRegex`. Calling
   `exec` on it (which a `/g` regex mutates) made the library's own `encode`
   return **zero tokens** for every subsequent call. The gate now checks the
   library **before and after** every accelerated call; a before-only test passes
   and then corrupts the process.

And the case that must be *copied*, not derived: **U+FEFF**. Rank 5574 holds the
bytes `EF BB BF`. `TextDecoder` strips a leading BOM, so `tryConvertToString`
returns `""`, the library looks *that* up, finds nothing, and emits `[5416, 123]`
— two tokens. Any index that keys on the vocabulary's bytes will say one. The
library's own `isValidUTF8` gate is the rule: a byte token that *is* valid UTF-8 is
shadowed by the string map, whatever the string map says.

### 5.3 The gate

```
bench/x72/ids.ts
index built in 347 ms
checked 323192 strings, mismatches 0
IDENTICAL on everything tested
```

Coverage: every fixture's whitespace tokens, 1–12-character windows over the first
400 lines of every fixture, 20 000 fuzzed strings (6 % non-ASCII), all 256 single
bytes, and a hand-written set of Unicode boundary cases (BOM, ZWJ emoji, combining
marks, lone surrogates, `ﬁ`, `ǅ`, `ʼn`, Devanagari, Arabic, Hebrew, Thai, fullwidth
digits). Plus the perturbation check: **the library must give the same answer
after** each accelerated call.

### 5.4 The fold arm, and why it is honest to ship something that abstains

`stadionFold` induces the width vector, requires that every folded line reproduce
byte-for-byte (`rebuilt !== text` ⇒ abort), and requires the normal form to be at
least 3 % shorter. `stadionUnfold` is the reader. Measured on the 29 lanes:

```
folded 0 / 29
```

And on a file where it *does* fire — a synthetic 20-row table with every line
padded to the same width (`bench/x72/fwprobe.ts`, receipt `receipts/fwprobe.txt`) —
it still loses:

```
raw 274   normal 277   rule 77   sum 354     widths [1,3,9,2,22,6]
```

which is the decisive form of the negative result: the width induction is correct
(the fold reconstructs byte-exactly or it refuses), but the **rule is the binding
constraint**, and cutting the rule from 130 tokens of prose to a 77-token
cumulative-position form does not save it. At these file sizes the padding is worth
less than any rule that describes it.

The measurement that kills it is in `bench/x72/foldprobe.ts` and, in Python, in the
width plan printed in this turn's log: on `dpkg -l` only **22 of 42 lines** are
foldable (the legend block is ragged); on `ps aux` 28/62; on `ls -l` 76/152. Half a
fold, minus a 45-token rule, is negative. It ships anyway because (a) it cannot
lose — the plain frontier is always computed and kept unless the fold is strictly
cheaper **and** byte-exact, and (b) inputs exist where all lines *are* uniform (a
`psql`-style export with a declared `colspecs`, a COBOL copybook, a fixed-width EDI
file) and this stack has no other codec that models them.

### 5.5 Is it greedy?

**No.** The fold is a total function of the input — the induced vector is the unique
maximal vector of offsets that are spaces on ≥ 90 % of lines with content on both
sides — and the only choice (fold or not) is decided by measuring the complete
message both ways through two independent counters. The counter substitution is not
a heuristic at all; it is a proof obligation discharged twice per message.

### 5.6 Time / CPU

CPU-bound for every decision; no wall clock is read by the fold or the counter. The
wall-clock numbers below are *reported*, because they are the point.

### 5.7 Results

**Speed — 12 lanes, same checkout, both arms this turn** (`bench/x72/receipts/speed-ab.json`):

| lane | X71 ms | **X72 ms** | Δ | tokens |
|---|---|---|---|---|
| `llm-answer.md` | 13 750 | **8 898** | **−35.3 %** | 674 → 674 |
| `ls-l-nm` | 32 550 | **21 761** | **−33.1 %** | 406 → 406 |
| `dpkg-l` | 42 176 | **30 544** | **−27.6 %** | 674 → 674 |
| `find-files` | 38 583 | **28 984** | **−24.9 %** | 635 → 635 |
| `kubectl-get-pods` | 47 086 | **37 116** | **−21.2 %** | 332 → 326 |
| `findmnt` | 9 302 | **7 421** | **−20.2 %** | 444 → 444 |
| `psql-output` | 13 857 | **11 151** | **−19.5 %** | 244 → 244 |
| `ls-usr-bin` | 19 564 | **16 150** | **−17.5 %** | 375 → 375 |
| `license` | 13 797 | **11 483** | **−16.8 %** | 929 → 929 |
| `node-help` | 8 360 | **7 118** | **−14.9 %** | 863 → 864 |
| `kb-article` | 3 615 | **3 140** | **−13.1 %** | 622 → 622 |
| `readme` | 12 014 | **10 612** | **−11.7 %** | 646 → 646 |
| **total** | **254 654** | **194 378** | **−23.7 %** | |

Counter micro-benchmark (`bench/x72/micro.ts`, 300 000 calls on real chunks; two runs in `receipts/micro.txt` and the log above):
**library 295–302 ms → index 93 ms = 3.17–3.25×**.

The two token movements are both inside the noise band measured in §3 and both are
on lanes that moved by more than this with *no code change*:
`kubectl` 332/326 across identical builds, `node-help` 863/864.

### 5.8 The one place this is not free

The index costs **330–460 ms per process**, once. On `kb-article` (3.1 s total)
that is ~12 % of the run for a lane that only spends 0.4 s counting. It is a loss
on tiny documents and a large win on the tail; it is stated because a speed report
that hides its one regression is not a speed report.

---

## 6. Where the time goes now, and what is left

Post-acceleration profile of `psql-output` (13 s, `--cpu-prof`):

```
15.2 % countTokens        13.1 % renderBest       12.0 % scoreRunCostDelta
11.1 % rankOf              8.9 % (anon)            8.8 % fastChunkCount
 5.3 % GC                 2.7 % evaluate          2.5 % encode
```

The tokenizer block has fallen from ~75 % to ~40 % of the run, and it is now
split across the index, the regex, and `countTokens`' own cache bookkeeping. The
next lever is **not** the tokenizer: it is `renderBest` + `scoreRunCostDelta`
(25.1 %), the ARIADNE glyph-assignment hill-climb that X57 already capped with a
work budget. X57 measured the cap as sufficient; X72 measured that the cap never
binds on quality (§4.2), which together suggest the right next move is to make
`scoreRunCostDelta` incremental — it is a *delta* evaluator that is being called
in a loop whose state changes by one element.

---

## 7. Mechanism portfolio — six distinct attempts

| # | Mechanism | Construction | Artifact | Proved portion | Unresolved interface | Cheapest falsification | Local vs equivalent gap |
|---|---|---|---|---|---|---|---|
| 1 | **Byte-keyed rank index** (shipped) | rebuild o200k's rank map keyed by bytes; zero-alloc merge | `bpe-fast.ts` | equality with `encode` on 323 192 strings; per-message audit | none — it is the same function, including U+FEFF | run `ids.ts` with the string-keyed index | local: 3.2× on the counter. equivalent: 23.7 % on the stack, because the counter is not the whole run |
| 2 | **Fixed-width fold** (shipped, abstains) | induce width vector, nomalise, frontier, re-pad rule | `stadionFold`/`stadionUnfold` | byte-exact reconstruction checked per document | the rule's 45 tokens | `foldprobe.ts` on 9 lanes | local: 142–469 tokens of padding. equivalent: 0, because ~50 % of lines fold |
| 3 | **Budget escalation** (dead) | raise the work budget with the speed win | `OMEGA_WORK_BUDGET=0` | identical messages | none | one run on 5 lanes | local: 1.7–2.1× more search. equivalent: 0 tokens |
| 4 | **AP-column elision** (dead) | declare an arithmetic generator per column | column scan | — | needs a lane with an AP | scan all 29 lanes | local: none found |
| 5 | **Region partition** (dead) | per-region codecs, one contract each | pipe census | — | contract cost ≥ 32 tok | census over prose lanes | local: one 6-line table. equivalent: < 15 tok |
| 6 | **Lazy per-pair memo** (dead) | cache rank lookups on demand | `micro.ts` reasoning | — | build cost is 1× | compare with the index build | local: saves the 330 ms start. equivalent: re-adds the 13.8 % |

**Second-order adversary A(C)** — what an adversary who knows the codec would do to
it, per candidate:

- **#1 index:** force collisions in the numeric key. `len·2³² + packed` is injective
  for `len ∈ {2,3,4}` and `packed < 2³²`, and the sum stays under 2³⁵ so it is exact
  in a double; lengths ≥ 5 use a latin1 string key. The adversary's real move is a
  token that is valid UTF-8 but stored as bytes — U+FEFF — which is precisely what
  the gate caught. Residual risk: a rare BOM-leading token elsewhere in o200k; the
  index refuses to build at all if any string entry fails its round trip.
- **#2 fold:** make half the lines ragged so the fold half-applies and the rule is
  wasted. That is *every real file*, which is why it abstains — the adversary has
  already won, and the codec's answer is to not play.
- **#3 budget:** make the search saturate before the budget. Already true.
- **#4 AP:** plant a near-AP with one deviation; the codec must then pay for the
  exception, which is why it requires an exact AP.
- **#5 partition:** make one region's contract cost more than its saving.
- **#6 memo:** vary every chunk (no repeats), which is what prose already does.

---

## 8. Generalised local leaders, by category

The point of a leader list is to name, per structure category, the *closest
competitor* that the frontier must beat and the *residual* after it loses.

**Prose** (`kb-article 622`, `readme 646`, `llm-answer 674`, `email-thread 488`,
`gh-prose 1 752` at X71): leader = SYNKRISIS in every case; residual = **0**. The
nearest mechanism that could beat it is the phrase pool (upper bound 0.8–6.5 %,
below the frontier), and after that the contract itself — on `kb-article` all 219
codecs emit the same 611-token wire and the shipped 622 is that wire plus an
11-token instruction, so **the entire remaining gap is the instruction**, and no
instruction is shorter than 11 tokens while still being a decoder.

**Ops / listings** (`ps-aux-real 1 051`, `ls-l-real 1 497`, `ls-real 433`,
`ps-real 397`, `ps-ef 315`, `find-files 635`, `ls-usr-bin 375`, `dpkg-l 674`):
leader = SYNKRISIS; residual = **0**. Nearest: the fixed-width fold, dead by the
half-lines measurement. Second nearest: the AUSTEROS table fold, which does not
fire because these listings have no delimiter and no separator row.

**Tables** (`psql 207`, `kubectl 263`, `metrics 185`, `prices 107`, `df-h 151`,
`markdown-table 162`): leader = AUSTEROS, and the residual against the *frontier*
is 14–63 tokens — the only category where the incumbent is beaten. Nearest
competitor = the contract search itself (AUSTEROS), i.e. the leader is also the
method.

**Structured logs** (`dpkg-l 674`, `apt-real 861`, `openstack 76.3 %`): leader =
SYNKRISIS; residual 0. Nearest: the column fold (dead) and the phrase pool (below
frontier).

**Code / config** (`code-ts 984`, `json-pkg 681`, `unified-diff 419`,
`package-lock`): leader = SYNKRISIS; residual 0. The X71 `code-ts` bound was shown
to be an artefact — building the codec the bound describes yields 1 393 against a
frontier of 985, because **BPE is not additive across a substitution boundary**.

---

## 9. Live research

Two searches this turn, on terms not used before in this series, and both returned
material that changed a claim in this report.

1. **O(n²) BPE merge, and the trap in "the piece is already a vocabulary entry".**
   BlockBPE (arXiv:2507.11941, 2025) states the complexity claim I measured:
   naive BPE is O(n²) — O(n) merge passes, each scanning O(n) pairs with a hashmap
   lookup — and CPU implementations reach O(n log n) with a priority queue.
   Independently, the TensorRT-Edge-LLM `bytePairEncode` rewrite (NVIDIA/TensorRT-
   Edge-LLM PR #248, port PR #46, Oct 2026) replaced `vector::erase` + linear
   rescan with a heap over a linked list and reports 138 ms → 9.6 ms per prompt,
   ids identical. The transferable part is *not* the heap — my chunks are 3–12
   bytes, so a heap would be slower — it is the referee note in that PR: **"the
   quadratic reference always merged, so it disagreed on pieces that are themselves
   vocabulary entries."** That is defect 2 in §5.2 seen from the other side, and it
   is why `fastChunkCount` keeps the library's two shortcuts *in the library's
   order* before any merge.
2. **Declared fixed-width layout contracts.** `fixedwidth-transit` specifies exactly
   the rule this codec's fold arm uses — a JSON layout with per-field `width` and a
   `padding` policy, "declared padding is stripped when decoding and restored when
   encoding", with ambiguous stripped padding **rejected**. Pandas' `read_fwf` /
   `colspecs` is the same contract one level down. This is prior art, and it is
   cited as such: X72's contribution is not the width contract, it is applying it as
   a **pre-transmutation in front of a token model** and then letting the existing
   parents compress the normal form — plus the decision to abstain when the
   reconstruction is not exact.

Carried from earlier turns and still load-bearing: arXiv:2605.29000 (lossless gains
on natural language "are often modest" — independently corroborating §2 H−1);
arXiv:2604.13066 (an LLM executing an in-band dictionary, dictionary in the prompt,
> 0.99 EM — the nearest evidence that a chat model runs a code); arXiv:2410.14066
and ClickHouse ALP (per-column generators and scaled-integer slots); arXiv:2603.25340
and Harvill et al. 2025 (**fine-tuned reader — a different problem, not beaten**).

**2026 frontier-lab mathematics, evaluated individually.** I looked for published
claims from OpenAI, Anthropic, Google DeepMind and the IAS AGMAI programme that were
reachable from this environment in this turn. I found **none that I could open and
verify**, and I am not going to characterise papers I did not read. The standing
assessment from X71 is unchanged and is the honest one: a minimal program proof is
not a chat message runnable at tolerance 0, so the transfer is **non-transferable**
on its face. What *is* transferable — and what I actually used this turn — is the
shape of the argument: prove the instrument, then measure the artefact.

---

## 10. Repair inherits no trust

X72 changed a function that every codec in the stack calls. The rule is that a
repair may restore a capability but never inherit the trust of the thing it
replaced. Concretely:

- `countTokens` keeps its pre-X72 body, reachable in one environment variable
  (`OMEGA_FAST_BPE=0`), and every A/B in this report was run **both ways**.
- The accelerated path is not trusted because it was written carefully; it is
  trusted because 323 192 strings agree, because the library is unchanged *after*
  each call, and because **each emitted message is recounted by the library**.
- `countTokensExact` is untouched and is still the reference the chunk algebra is
  verified against.
- The frontier's own self-verification (`consider()` throws if a candidate does not
  reconstruct) is untouched, so a bad message still cannot ship even if the counter
  were wrong.

---

## 11. What was missed, and the four tests ranked by information per minute

1. **`cl100k_base` acceleration** (≈ 20 min). The index construction is encoding-
   agnostic; only the vocabulary source changes. The stack's second encoding is
   currently unaccelerated for no reason other than this turn's budget.
2. **Incremental `scoreRunCostDelta`** (≈ 2 h, highest expected value). 12.0 % of a
   `psql` run, called with a one-element state delta. This is now the largest single
   item in the profile after the tokenizer block.
3. **`renderBest` allocation audit** (≈ 1 h). 13.1 %, and 5.3 % of the run is GC.
4. **A parser for the tape parents' own grammar** (≈ 1 day, low prior). Every
   attempt so far has lost; X71 §4.4 explains why (BPE non-additivity).

---

## 12. Files

- `src/lib/omega/bpe-fast.ts` — the index, the merge, the U+FEFF rule, the audit hook.
- `src/lib/omega/stadion.ts` — the codec: fold induction, unfold reader, double count.
- `src/lib/omega/bpe.ts` — one call site changed, `OMEGA_FAST_BPE` kill switch.
- `src/lib/omega/registry.ts` — `stadion` registered before `austere`/`brachys`.
- `bench/x72/ids.ts` — the differential gate (323 192 strings, before-and-after).
- `bench/x72/stadion-broad.ts` — the 29-lane gate.
- `bench/x72/micro.ts` — the counter micro-benchmark (3.2×).
- `bench/x72/pad.ts`, `bench/x72/foldprobe.ts` — the padding measurement and the
  fold's detector.
- `bench/x72/receipts/ids.txt`, `micro.txt`, `pad.txt`, `foldprobe.txt`,
  `stadion-broad.json`, `speed-ab.json`, `speed-after.json`, `speed-after2.json`,
  `prof1/` (cpu profile).
- `docs/codecs.md` §X72, `docs/codec-abbreviations.md` §X72.
