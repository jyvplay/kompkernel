# X103 — tier 5 ultrareview

Every number below is **measured** in this repository, in one process per probe, under a named
environment.  Nothing is simulated, estimated or expected.  Where a hypothesis was falsified the
falsification is reported with its numbers, because an empty result is a result.

Setting used throughout unless stated otherwise: `OMEGA_DET=1 OMEGA_NO_MEMO=1`, encoding
`o200k_base`, the 29-lane set from `bench/x89/receipts/front3-runK.json`.

---

## 1. The new codec: ΠΡΟΑΓΩΓΗ (`src/lib/omega/proagoge.ts`)

**Shipped ENABLED** (`OMEGA_NO_PROAGOGE=1` disables).  Admitted through `admitParentRelative`, so its
reference object is `chironDecode(incumbent)` — ΓΕΝΝΑΔΑΣ's object, not the source.

### The mechanism, and why it is not a rename

A ΧΕΙΡΩΝ tape is `contract § k₁v₁ k₂v₂ … kₙvₙ ¶ body`.  The decoder does not care what order the
entries are in, provided every rule still appears after the rules it references.  The stack has been
spending that free parameter three ways:

| codec | what it does with the order |
|---|---|
| ΜΕΤΑΤΑΞΙΣ | relocates an entry to an arbitrary valid slot, by a seeded stochastic first-improvement climb on the whole-message price.  No notion of *why* a slot is good. |
| ΓΕΝΝΑΔΑΣ | relocate-to-enable, but only when the later rule's value is a perfect **prefix or suffix** of the user's value, and it re-spells only that one boundary. |
| ΠΡΟΟΙΜΙΟΝ (inside ΣΥΝΔΥΑΣΜΟΣ) | re-spells a value as an interleaving of literal runs and references to **strictly earlier** rules — interior factors included, but only for rules that are *already* earlier. |

The gap is exact:

> a rule `j` sitting **after** `i` whose value is a proper **interior** substring of `value(i)` is a
> factor that no codec in this stack can use.

ΠΡΟΟΙΜΙΟΝ cannot reference it (the delimiter-free parser would read the letter as a new key and
corrupt the tape — `syndyasmos.ts` records this as the reason its index is built incrementally).
ΓΕΝΝΑΔΑΣ will not relocate it (`startsWith`/`endsWith`, never `includes`).  ΜΕΤΑΤΑΞΙΣ has no reason
to pick that slot.

ΠΡΟΑΓΩΓΗ closes it with **two** moves, because the constraint is directional and either end of it
can be moved:

* **BRING-FORWARD** — relocate `j` to immediately before `i`, then re-spell `i` and every rule that
  *gained* `j` as a factor, with the full interleaver over all rules now earlier than it.
* **PUSH-BACK** — relocate `i` to immediately *after* `j`.  `i`'s own dependencies are all earlier
  than `i`, hence earlier than `j`, so the move is legal for `i` by construction; the only check
  needed is that no rule between them mentions `key(i)`.

PUSH-BACK exists because BRING-FORWARD is blocked exactly when `value(j)` mentions a key sitting
between `i` and `j` — and in that case PUSH-BACK is still legal.  The two variants cover different
halves of the same population rather than duplicating each other.

### The population was measured before the codec was written

`bench/x103/pop.ts` → `receipts/pop.json`, 29 lanes, one process:

| population | count |
|---|---|
| interior-factor pairs with `j` after `i` | **24** |
| **control** — ΓΕΝΝΑΔΑΣ's population, same routine, same process, same wires: prefix-factor pairs | 41 |
| **control** — suffix-factor pairs | 16 |

ΓΕΝΝΑΔΑΣ paid **−43** tokens from 57 pairs, so 24 pairs with a *stronger* re-spelling arm (the full
interleaver, not a single boundary) is a live population.  Had it measured 0 the codec would have
been falsified before it was written.

### The result

`bench/x103/proagoge29.ts` → `receipts/proagoge29-0-15.json`, `receipts/proagoge29-15-29.json`.
29-lane interleaved A/B, arm A = `OMEGA_NO_PROAGOGE=1`, arm B = enabled.

| | tokens |
|---|---|
| arm A (ΠΡΟΑΓΩΓΗ off) | **12 415** |
| arm B (ΠΡΟΑΓΩΓΗ on) | **12 412** |
| **Δ** | **−3** |

* better **2** — `findmnt` −2 (PUSH-BACK), `ls-l-real` −1 (BRING-FORWARD)
* worse **0**, same 27
* `A.decoded === B.decoded` **29/29**; byte-exact against the source **29/29**

**Confirmed three times.**  (1) `bench/x103/proagoge29.ts` run in two calls: A = 12 415, B = 12 412,
Δ = −3.  (2) `bench/x103/settle.ts` → `receipts/settle.json`, one process, frontier + A + B per lane:
A = 12 415, B = 12 412, **Δ = −3, identical numbers**.  (3) `bench/x103/procpu.ts` → `receipts/procpu.json`,
the alternating 3-rep CPU probe, independently records `findmnt` 440 → 438, the PUSH-BACK win.
(An earlier `settle` run, made before PUSH-BACK existed, gave Δ = −1 with variant A alone; its receipt
was overwritten by the run above and the figure is corrected here rather than left standing.)

**Variant A alone paid −1.  Adding PUSH-BACK took it to −3.**  That is the measured value of the
second variant, and it is why both are shipped.

### CPU, measured the way the protocol demands

`bench/x103/procpu.ts` → `receipts/procpu.json`.  Seven lanes that actually carry rules, three reps
each, **alternating** the arm order between reps, medians reported.

| lane | off median | on median | Δcpu | tokens |
|---|---|---|---|---|
| kb-article | 868 ms | 728 ms | −16.1 % | 621 → 621 |
| vmstat | 183 ms | 169 ms | −7.7 % | 148 → 148 |
| unified-diff | 668 ms | 658 ms | −1.5 % | 415 → 415 |
| df-real | 192 ms | 189 ms | −1.6 % | 125 → 125 |
| du-real | 283 ms | 263 ms | −7.1 % | 269 → 269 |
| node-help | 2 509 ms | 2 426 ms | −3.3 % | 860 → 860 |
| **findmnt** | **977 ms** | **1 095 ms** | **+12.1 %** | 440 → **438** |
| **total** | **5 680 ms** | **5 528 ms** | **−2.68 %** | |

The wall-clock columns of the 29-lane A/B are **not** used: arm A runs cold and arm B warm in the
same process, so B looks ~6× faster for reasons unrelated to the codec.  That is the trap the
repository's own notes record for the committed wires.

**Honest statement of the CPU axis:** the aggregate over seven lanes × three alternating reps is
−2.68 %, which is inside the drift the alternating protocol exists to expose.  On the one lane where
the codec actually fires it costs **+12.1 %** (977 → 1 095 ms median, `on` = 1095/1095/1098 ms
against `off` = 951/977 ms warm).  **ΠΡΟΑΓΩΓΗ is therefore not claimed as a two-axis win on
`findmnt`.**  Its work counters are deterministic and small: 15 whole-message prices on `ls-l-real`,
a hard `PRICE_CAP` of 40 000 prices per lane, reported in the notes when reached.

---

## 2. Falsified this turn, with the numbers

### ΑΝΑΓΕΝΝΗΣΙΣ — ΧΕΙΡΩΝ applied to the compressor's own output

`bench/x103/anagennesis.ts` → `receipts/anagennesis.json`.  ΧΕΙΡΩΝ as a **second stage** on the
already-shipped message: base **12 416 → 12 416, Δ = 0 on 29/29, better 0, worse 0**, round-trip
`rt=true` on every lane.  ΧΕΙΡΩΝ takes the identity path everywhere (its own note reads
`identity: no framing pays here; message gate: framed 179 >= raw 170 (wire 172)`).  The contract cost
dominates an already-compressed message.  **Closed.**

### RESCORE — optimise every parent, then select

`bench/x103/rescore.ts` → `receipts/rescore.json`.  The chain measures frontier parents, scores each
**once**, returns the cheapest, and only then runs the wire-level codecs on the winner.  So the
parent *choice* is made on a ΧΕΙΡΩΝ cost that has never been optimised, and on a lane where a
non-ΧΕΙΡΩΝ parent wins the ΧΕΙΡΩΝ candidate is never optimised at all.  Re-scoring by optimising
`synkrisis`'s wire with the full wire-level sequence and then comparing:

| | tokens |
|---|---|
| synkrisis raw | 12 961 |
| synkrisis + wire codecs | **12 822** |
| shipped winner | **12 700** |

Optimised synkrisis still loses by 122.  **Falsified.**  (A label in the first version of this probe
compared against `parentTokens`, the *pre*-codec parent cost, and therefore re-derived the codecs'
own savings; the table above is the corrected comparison.)

### BODY RE-REFERENCING — a body literal that already has a rule

`bench/x103/bodypop.ts` → `receipts/bodypop.json`.  ΧΕΙΡΩΝ's induction is meter-gated (96 %
exhausted on `ls-l-real`) and ΠΡΟΟΙΜΙΟΝ's sweep re-spells **tape values only** — it never re-examines
the body.  If a rule's expanded value still occurs literally in the body, no codec will reference it.

* body literal occurrences of an existing rule's expanded value: **5 232**, on 19 of 29 lanes
* **control** — body key occurrences (references ΧΕΙΡΩΝ already made): **3 440**
* upper-bound token saving: **10**

5 232 occurrences are worth at most 10 tokens, because ΧΕΙΡΩΝ has already factored everything long
enough to pay.  **Closed.**

### DEEP RE-SPELLING — are ΠΡΟΟΙΜΙΟΝ's search bounds binding?

`bench/x103/deeprespell.ts` → `receipts/deeprespell.json`.  `segmentations` stops after
`MAX_SEGMENTATIONS = 400` and `MAX_PARTS = 5`, walking factor lengths longest-first, so the first 400
results are biased.  On the shipped wire of six lanes, the best whole-message gain from re-spelling
**one** value:

| bounds | candidates generated | best gain |
|---|---|---|
| shipped (400, 5) | 42 066 | **0** |
| deep (2 000, 8) | 167 498 | **0** |

4× the candidates, exactly zero gain.  **The re-spelling search is converged; the bounds are not the
lever.**  This is the strongest evidence in the turn that the ΧΕΙΡΩΝ tape is at a local optimum of
the current move set.

### SECOND-STAGE ΧΕΙΡΩΝ, RAISED METER, WIDENED SEPARATOR GATE

All previously falsified and not retried: ΧΕΙΡΩΝ on the shipped message (ΑΝΑΓΕΝΝΗΣΙΣ, above);
raising the ΧΕΙΡΩΝ work meter 64 M → 256 M (Δ = 0 on 29/29); widening ΧΕΙΡΩΝ's separator gate
(Δ = 0 on 29/29).

---

## 3. What has been missed this whole time — and it is not a codec

### The chain's output is not a pure function of (text, settings)

Three probes this turn and last reported three different `tagstackEncode` totals for what should be
the same configuration: **12 405** (`x102/diagraphe29` arm B), **12 415** (`x103/proagoge29` arm A),
**12 416** (`x103/anagennesis` base).

The cause is measured, not guessed.  `OMEGA_NO_MEMO` disables the **TAGSTACK** memo only
(`tagstack.ts:501, :538, :564`).  Two other process-global memos stay live:

* the **X67 OURA memo** (`oura.ts:494`, switched by `OMEGA_OURA_MEMO=0`), 24 entries, cleared when full
* the **ἔγγραμμα** memo (`engram.ts`, switched by `OMEGA_ENGRAM=0`)

`bench/x103/memoprobe.ts` → `receipts/memoprobe-*.json`, three lanes, one process per setting:

| lane | memo on | memo off |
|---|---|---|
| apt-real | 843 | **834** |
| code-ts | 970 | **968** |
| dpkg-l | 668 | 668 |

`oura.ts` documents the replay as *"Charging the recorded cost back makes the meter trajectory — and
therefore every later decision — identical to the uncached run; only wall clock work disappears."*
**That claim is falsified on two of three lanes.**

Worse, the effect depends on **process history**.  `bench/x103/memoab.ts` →
`receipts/memoab-0-15.json`, `receipts/memoab-15-29.json`, the full 29-lane interleaved A/B:

| lane | memo on | memo off |
|---|---|---|
| code-ts | 970 | 968 |
| dpkg-l | 668 | 667 |
| apt-real | 843 | **843** |
| **total** | **12 414** | **12 411** |

`apt-real` encodes to **834** in a three-lane process and **843** in a 29-lane process under the same
flags.  **The same input, the same settings, two different wires, decided by what else ran in the
process.**  The 29-lane memo effect is −3, not the −11 the three-lane probe suggested.

This is the correction the protocol requires, and it is kept rather than silently replaced:

* **The X102-recorded shipped total of 12 405 does not reproduce.**  Under the protocol that names it
  (`OMEGA_DET=1 OMEGA_NO_MEMO=1`) the reproducible full-chain total is **12 415** with ΠΡΟΑΓΩΓΗ off
  and **12 412** with it on, and the figure moves by a few tokens with process history.
* The X102 frontier receipt's **12 639 does not reproduce either.**  See §4.

### The ΧΕΙΡΩΝ tape is at a local optimum of the current move set

Four independent measurements this turn converge on the same conclusion: rule **addition** is closed
(Δ = 0, twice, 283 exact prices over the body ∪ rule values), rule **deletion** is ΔΙΑΓΡΑΦΗ's −5,
**re-spelling** is converged (deep bounds find 4× the candidates and gain 0), and **body
re-referencing** has an upper bound of 10 tokens.  The remaining headroom is not in the wire.

This is the measured face of the external bound already recorded: greedy BPE's worst-case compression
utility is ≤ (1 − e⁻²)/2 ≈ 0.4323 of optimal, because *"a merge with the largest immediate payoff can
destroy adjacent savings."*  Every gate in this stack is a **descent** step — accept iff strictly
smaller — so the stack is structurally a greedy climber, and a greedy climber cannot collect the
savings a better-planned sequence would.

### The AI-native idea a human researcher working on this stack is blind to

**The stack optimises the wire as a string, but the wire is read by a model, not by a parser.**  Every
mechanism in the stack is judged by `countTokens` — the tokenizer's price of the emitted characters.
Nothing in the stack measures what the *reader* has to do.  The contract (`Before ¶ k=v. expand
repeatedly; print only.`) is priced at ~12 tokens and treated as a fixed cost, but it is also the
entire specification of the decode procedure, and its price is the only thing the stack can see.

The concrete consequence, measured: **55.6 % of the ΧΕΙΡΩΝ wire is body literals** — text the tokenizer
prices and no rule covers.  A grammar-based compressor treats that as irreducible.  A model does not:
it reads it.  The gap between "the tokenizer's price of this text" and "what a reader needs to
reproduce it" is the one axis no codec in this repository has ever measured, because there is no model
API here to measure it with.  **That is a downgrade, not a claim: the decodability question was not
tested this turn, and it cannot be tested in this environment.**

---

## 4. Frontier: restated, not confirmed

`bench/x86/front.ts` measures `tagstackFrontier`, which calls `tagstackEncodeUncached` →
`tagstackEncodeInner`.  Registry arms are admitted inside `tagstackX74Chain`, a **sibling** of that
path.  Verified by reading the call graph:

```
tagstackFrontier -> tagstackEncodeUncached -> tagstackEncodeInner
tagstackX74Chain -> tagstackEncodeInner   (+ STICHOMYTHIA, PROSPHYSIS, ΣΥΜΦΥΪΑ, STOICHEION,
                                            ἸΣΟΜΟΡΦΪΑ, ΜΕΤΑΤΑΞΙΣ, ΣΥΝΔΥΑΣΜΟΣ, ΓΕΝΝΑΔΑΣ,
                                            ΔΙΑΓΡΑΦΗ, ΠΡΟΑΓΩΓΗ)
```

So **ΠΡΟΑΓΩΓΗ provably cannot move the frontier**, and the movement below is not a regression
introduced this turn.  The only source change to `tagstack.ts` is the import and the
`if (!proagogeDisabled())` block inside `tagstackX74Chain`.

| probe | setting | frontier |
|---|---|---|
| `bench/x102/receipts/frontier-runX102b.json` | (not named in the receipt beyond `det: "1"`) | **12 639** |
| `bench/x103/settle.ts` → `receipts/settle.json` | `OMEGA_DET=1 OMEGA_NO_MEMO=1` (X67 memo on) | **12 695** |
| `bench/x103/front2.ts` → `receipts/front2.json` | `OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_OURA_MEMO=0 OMEGA_ENGRAM=0` | **12 685** |

Both reproductions are **exact 29/29**.  Five lanes differ from the X102 receipt, and three of them
differ in the **parent codec**, which is a behavioural difference and not a rounding difference:

| lane | X102 receipt | reproduced | parent |
|---|---|---|---|
| code-ts | 969 | **981** | synkrisis → **apographe** |
| ps-aux-real | 1 042 | **1 055** | synkrisis → **apographe** |
| apt-real | 850 | **851** | synkrisis → **diastema** |
| ls-l-real | 1 476 | **1 496** | synkrisis |
| dpkg-l | 673 | 673 | parent differs |

**The frontier is therefore restated, not confirmed: 12 685 under
`OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_OURA_MEMO=0 OMEGA_ENGRAM=0`, and 12 695 with the X67 OURA memo
on.**  The X102 receipt's 12 639 does not reproduce under either setting and is recorded as stale.

---

## 5. Leaders, X103 configuration

`bench/x101/leaders-x101.ts` is unchanged in construction and remains the current table; it is a pure
join with zero frontier calls, so it cannot drift.  `raw` and `floor` are imported from
`bench/x90/receipts/leaders-x90.json`; `floor` is **not reachable by a readable codec and is only a
denominator**.  `shipped` below is the reproduced X103 figure (12 412), so the headroom column is
stated against a number this turn actually measured.

| category | lanes | raw | shipped | ratio | floor | headroom | price | leader |
|---|---|---|---|---|---|---|---|---|
| OPS TABLE | 11 | 4 135 | ~1 710 | 0.4134 | 1 272 | ~15.5 % | ~25.8 % | `kubectl-get-pods` 1 006 → 322 |
| OPS LISTING | 9 | 16 516 | 5 776 | 0.3497 | 4 420 | 11.2 % | 23.5 % | `ls-l-real` 5 194 → 1 380 |
| CODE / MARKUP | 3 | 3 152 | 2 053 | 0.6513 | 1 728 | 22.8 % | 15.8 % | `code-ts` 1 422 → 970 |
| DATA | 2 | 1 095 | 234 | 0.2137 | 209 | 2.8 % | 10.7 % | `prices.csv` 582 → 133 |
| PROSE | 4 | 3 117 | 2 639 | 0.8466 | 2 529 | **18.7 %** | 4.2 % | `node-help` 1 099 → 860 |

**Generalised local leaders.**  By category, the lane that is hardest for the stack relative to its own
floor:

* **ops listing** — `ls-l-real`: the largest single lane in the set and the one ΧΕΙΡΩΝ's work meter is
  96 % exhausted on.  ΠΡΟΑΓΩΓΗ's only BRING-FORWARD win lands here.
* **ops table** — `kubectl-get-pods`: the lowest ratio in the set (0.320) and a non-ΧΕΙΡΩΝ parent
  (`akolouthia2`), so the wire codecs see a ΧΕΙΡΩΝ frame that is nearly empty.
* **code / markup** — `code-ts`: the largest headroom fraction among the non-prose categories after
  OPS TABLE, and a lane where the base stack's parent *changed* this turn.
* **data** — `prices.csv`: essentially closed (2.8 % headroom).
* **prose** — `node-help`: the largest headroom **fraction** (18.7 %) and the smallest **absolute**
  one (110 tokens over four lanes).  No mechanism has been found that addresses it, and ΠΡΟΑΓΩΓΗ does
  not: both of its improved lanes are ops.

ΠΡΟΑΓΩΓΗ's two improved lanes are `findmnt` (ops listing) and `ls-l-real` (ops listing).  Consistent
with every previous turn: **the tape share separates the categories (25–40 % for ops, 9 % for prose),
and every mechanism that has ever paid has paid on a lane with a large tape.**

---

## 6. Model-readability — downgraded, not claimed

ΠΡΟΑΓΩΓΗ's output is an ordinary ΧΕΙΡΩΝ wire with the same rules in a different order and some values
spelled differently.  **It adds no operator, no contract clause and no decode rule**, so a reader who
could expand the incumbent can expand this by the same rule.

**There is no model API in this environment.  LLM decodability was not tested and is not claimed.**
What *is* verified is structural and is stated as such: the wire is self-contained (contract + tape +
body in one string), the tape is delimiter-free with a first-appearance key rule that the repository's
own `chironParseTape` implements, and every reference is backwards — which `chironDecode` enforces by
rejecting forward references.  A single chat input containing the message is therefore sufficient *in
principle*; that is a structural claim, not a measurement of a model.

---

## 7. Receipts

| probe | receipt |
|---|---|
| ΑΝΑΓΕΝΝΗΣΙΣ (second-stage ΧΕΙΡΩΝ) | `anagennesis.json` |
| population census, interior factors | `pop.json` |
| population census, body literals | `bodypop.json` |
| RESCORE (optimise every parent) | `rescore.json` |
| deep re-spelling bounds | `deeprespell.json` |
| margins (ΧΕΙΡΩΝ arm losing margin) | `margins.json` |
| ΠΡΟΑΓΩΓΗ 29-lane A/B | `proagoge29-0-15.json`, `proagoge29-15-29.json` |
| ΠΡΟΑΓΩΓΗ CPU, alternating medians | `procpu.json` |
| settle (frontier + A/B, one process) | `settle.json` |
| which memo moves the answer | `memoprobe-probe.json`, `memoprobe-engram-off.json`, `memoprobe-oura-off.json` |
| OURA memo 29-lane A/B | `memoab-0-15.json`, `memoab-15-29.json` |
| frontier re-confirmation | `front2.json` |
| per-codec cost / rule census | (`chronos2.ts`, run inline) |
