# X73 — STICHOMYTHIA

**Question.** X72 closed speed and reported, honestly, no token win on any lane. X73 was asked to find one: a new codec, a new mechanic, Pareto superior on a real lane, byte-exact, decodable from a single chat message.

**Answer, stated as narrowly as the evidence allows.** The column is a *program*. `cue-sheet.md` goes **513 → 101 tokens** against a frontier of **163** — **−62, −38 %**, byte-exact, self-contained. It wins **one lane of 29**. Ten other attacks on the size axis were measured this turn and all ten are dead; they are recorded in §E as negative-space shapes with detectors so that they are not re-attempted as if new.

Everything below is what actually ran. No model was called, no agent was spawned, no prover was consulted. Every number is reproducible from the command in §J.

---

## A. Formal model

### A.1 Objects

A **document** is a string `x ∈ Σ*`. A **codec** is a pair `(E, D)` with `E(x) = m` a *message* (a string) and `D(m) = x'`; the codec is **exact** iff `x' = x` for every `x` in its domain. A message is **single-shot** iff `D` is fully determined by `m` alone — no side table, no system prompt, no tool.

A **cost** is `|m|_{o200k}` — the token count of the whole message under the real tokenizer, contract included. This is the only cost used anywhere in this work; nothing is scored in characters or bytes.

For a table `T` with rows `r_0..r_{n-1}` and columns `c_0..c_{k-1}`, write `v_{j}(i)` for column `j` at row `i`.

### A.2 The model family

A **column model** is one of

```
M_const(v)          print v everywhere
M_ap(p, a, s, q)    print p · (a + s·i) · q, the number formatted as a was
M_time(b, s)        print b + s·i seconds, in b's own shape (clock, ISO stamp, ISO date)
M_cycle(L)          print L[i mod |L|]
M_list(L)           print L[i]
```

`M_cycle` is admitted only when the cycle repeats at least twice (`|L| ≤ n/2`, `|L| ≤ 8`), so a cycle can never be a literal list wearing a hat.

### A.3 The encoding

`E(x)` is defined only on documents that split uniformly:

```
∃ sep ∈ S, ∃ k ≥ 2 :  ∀ line ℓ_i,  ℓ_i.split(sep) has exactly k cells  ∧  cells.join(sep) = ℓ_i
```

(`S = { " | ", "\t", ", ", "; ", ",", ";", "  ", "|" }`.) Line 0 is the header and is emitted verbatim; the body is rows `1..n-1`. For each column `j`, `E` selects

```
μ_j = argmin { |spec(M)| : M ∈ family, ∀i. print(M, i) = v_j(i) }
```

and emits

```
K ‖ LF ‖ "S" n " sep " ⟨sep⟩ " r=0.." (n-1) " body:" ⟨header⟩ ‖ LF ‖ spec(μ_0) " ; " … " ; " spec(μ_{k-1})
```

where `K` is the key line. Decoding executes `μ_j` at row `i` and joins with the separator.

### A.4 Exactness obligation

Define `R(M, i)` to be the printed value. The encoder is required to establish

```
∀j ∀i.  R(μ_j, i) = v_j(i)          (model soundness — checked, not assumed)
D(E(x)) = x                          (round trip — checked, not assumed)
|E(x)| < |x|                         (non-degeneracy — checked, not assumed)
```

All three are checked in-process before the message leaves the module. A failure of any one returns the identity.

### A.5 The padding lemma (this is where A.4 bites)

Let the numeric token of `v` be printed with `d` decimal places and `w` integer digits, and let `w_min = min_i w_i` over the column. Then `M_ap` reproduces the column iff

```
∀i.  fmt(a + s·i, d, w_min) = numeric_token(v_i)
```

`cue-sheet` fails this with `w = max` (`line 0` would print as `line 00`) and passes with `w_min = 1`; `prices.csv` fails it with `w_min` alone and passes once the *printed base* carries its own width (`SKU-001+1*r`), because the reader recovers `w = 3` from the base rather than from a declaration. The lemma is why the first implementation refused `cue-sheet` outright (decode mismatch) and why the second one ships it.

### A.6 Admission to the frontier

`tagstackEncode` computes its own frontier `m_F` and then

```
m = argmin_{m ∈ {m_F, m_S}} |m|      subject to  D(m) = x
```

so `stichomythia` is a **candidate**, never a rewrite. This is what makes "no lane can get worse" a structural fact rather than a measurement.

---

## B. Hypotheses H+, H−, H∂

**Declared evidence threshold.** A hypothesis is *accepted* only on a **lane-level, byte-exact, complete-message** measurement through the real tokenizer, reproducible from a committed harness, with a margin greater than the **±4-token run-to-run noise** that X70 §3.2 documented for clock-gated parents. Anything below that threshold is reported as null.

| id | hypothesis | status | evidence |
|---|---|---|---|
| **H+** | A table body is *generated*, not stored: some columns are printed by short programs, so a codec that searches for the program beats any codec that copies cells. | **accepted** on 1 lane | `cue-sheet` 163 → **101** (−62 ≫ 4). Reader-from-key: 4 exact. |
| **H+′** | The affix and the padding are part of the program, not decoration: without them the model family misses `SKU-001` and `line 0`. | **accepted** | §A.5; the first build refused `cue-sheet` until `w_min` was enforced. |
| **H−** | The frontier is not the minimum of the registry. | **accepted, with a correction that destroys the naive use** | cue-sheet 127 (`logos`) < 163; but every sub-frontier message is contract-free (§E1). The frontier *is* the minimum among codecs whose message decodes itself. |
| **H−′** | The columnar/whitespace family can be fixed by a smarter normal form. | **rejected** | §E2–E7, ten independent measurements, best −0.6 %. |
| **H−″** | The contract can be made cheap enough to pay for a closed wire. | **rejected** | contracts already 11 tokens (§E8); Chinese is *longer* (§E9); key cost is what keeps `aion` from being admissible at 128 (§E1). |
| **H∂** | The win is a family, not a lane. | **open, and the honest reading of the data is negative** | the surrounding lanes of the same class lose badly: `metrics` 252 vs 210, `prices` 323 vs 133, `df-h` 411 vs 151. The model family, not the mechanism, is the limit. |

---

## C. Frontier retrieval

**Frontier as of this turn — confirmed, not assumed.** `tagstackEncode` with parents {synkrisis, apographe, metron, diastema, austere, brachys, akolouthia2, hemera}, count via `countTokens` (library, `o200k_base`), gate = complete message `contract + LF + wire`. This is **identical to X72's configuration**; the only change to the stack this turn is one added candidate (§A.6) and one counter optimisation. Verified by the 29-lane receipt matching X72 line for line outside the two drifting lanes.

**Retrieval, by hypothesis and falsification:**

1. *Is the frontier the stack minimum?* Sweep of all 236 registry entries on four lanes (`bench/x73/sweep.ts`). **No** — 127 vs 163 on cue-sheet, 56 vs 60 on lsblk. Falsified further by opening the winners: all contract-free (§E1).
2. *Is the frontier beaten by an admissible codec?* Sweep of 15 contract-carrying codecs (`bench/x73/adm.ts`) on five lanes. **No** — `aion` gives 128 on cue-sheet but its message has no key; every other admissible codec ties the frontier exactly (444/315/433/149).
3. *Is the frontier's own contract the cost?* Measured: contracts are 0–11 tokens on every probed lane (`bench/x73/ctax.ts`). **No room.**
4. *Is the frontier re-doing work?* Instrumented `hyleEncode`: exactly **1 call per encode**, 0 duplicated characters. **No.**
5. *Can a program-and-column model beat it?* **Yes, on cue-sheet, by 38 %.**

**Exact open interface.** The thing this turn does *not* close, stated so that it can be picked up without re-deriving anything:

```
INPUT:  message m, and nothing else
OUTPUT: x, byte-identical to the source
OPEN:   a contract-free wire w* (e.g. EIDOS/LOGOS at 127 on cue-sheet) is 36 tokens
        cheaper than the frontier's 163 and needs a key to be admissible.
        The key that LOGOS actually needs is unknown and unbounded above by 36.
        TO CLOSE: exhibit key k with D(k ‖ w*) = x and |k ‖ w*| < 163 — i.e. a
        key under 36 tokens for the [AN1]/[SG1]/⟐/#/@ marker grammar. That is a
        concrete, checkable target, not a slogan.
```

---

## D. Mechanism-distinct approaches (six)

For each: construction, artefact, proved portion, unresolved interface, cheapest falsification, local-vs-equivalent gap.

### D1 — Column-program search (**shipped**)
- **Construction.** Per-column program family (§A.2), selected by soundness then spec length.
- **Artefact.** `src/lib/omega/stichomythia.ts`, `bench/x73/reader.ts`, registry entry `stichomythia`.
- **Proved.** `R(μ_j,i) = v_j(i)` for every applied column (checked); `D(E(x)) = x` (checked); `|E(x)| < |x|` (checked).
- **Unresolved.** The family is narrow; irregular columns fall to literals. Extending it (piecewise AP, second-order deltas, per-column correlation as in Corra) is untested.
- **Cheapest falsification.** Any lane where an AP/cycle column exists but the frontier still wins → extend `bench/x73/kat.ts` with one more fixture.
- **Local-vs-equivalent.** Local: −38 % on one lane. Equivalent (if the family were closed over all printable programs): would be the minimum of the whole stack.

### D2 — Admissible-minimum over the registry
- **Construction.** Run every contract-carrying codec, take the min.
- **Artefact.** `bench/x73/adm.ts`, `bench/x73/sweep.ts`.
- **Proved.** On the five probed lanes, the frontier already equals the admissible minimum — the gap is 0.
- **Unresolved.** The admissibility predicate is manual (I read the messages). A mechanical predicate does not exist in this repo.
- **Cheapest falsification.** One lane where an admissible codec beats 444/315/433/149.
- **Gap.** Local: 0 gain. Equivalent: exactly the frontier.

### D3 — Key-buying for closed wires (§C open interface)
- **Construction.** Take a closed wire, append the minimal key that inverts it.
- **Artefact.** None — not built.
- **Proved.** The gap is 36 tokens on cue-sheet and the wire needs `[AN1]/[SG1]/⟐/#/@`.
- **Unresolved.** The grammar's own size. Unknown.
- **Cheapest falsification.** Count the key of `aion`'s own documented prompt: `EIDOS_SYSTEM_PROMPT` is ≈ 50 tokens, and 128 + 50 = 178 > 163, so the *documented* key already loses. That is a cheap, decisive negative and it is why D3 was not built this turn.
- **Gap.** Local: 0. Equivalent: potentially −36.

### D4 — Contract compression
- **Construction.** Re-render each codec's contract more tersely.
- **Artefact.** `bench/x73/ctax.ts` (measurement only).
- **Proved.** Contracts are already 0–11 tokens on the probed lanes; the frontier's typical contract is `Before ¶ k=v. expand repeatedly; print only.` — 11 tokens, and it names the expansion rule and the print rule and nothing else.
- **Unresolved.** Nothing to compress.
- **Cheapest falsification.** A lane whose contract exceeds ~20 tokens. None found.
- **Gap.** Local: ≤ 5 tokens. Equivalent: 0.

### D5 — Cross-parent result sharing (memoisation)
- **Construction.** Share lower-layer results across the eight frontier parents.
- **Artefact.** `bench/x73/dupwork.ts` with instrumentation kept in `hyle.ts` (`HYLE_WORK`).
- **Proved.** `hyleEncode` is called **once** per encode on findmnt, vmstat and metrics; `dupChars` = 0 in all three.
- **Unresolved.** Other layers were not instrumented.
- **Cheapest falsification.** Any lane with `calls > 1`.
- **Gap.** Local: 0. Equivalent: 0 on these lanes.

### D6 — Flat rank table in the counter (**shipped, small**)
- **Construction.** Replace the `Map<number,number>` two-byte lookup with a 65 536-entry `Int32Array` indexed by `b0<<8|b1`.
- **Artefact.** `src/lib/omega/bpe-fast.ts`.
- **Proved.** Differential gate unchanged: **323 192 strings, 0 mismatches**; micro-ratio 3.2× → **4.85×** (`bench/x72/micro.ts`, 91 ms vs 441 ms).
- **Unresolved.** Three- and four-byte keys still hash.
- **Cheapest falsification.** Any mismatch in `bench/x72/ids.ts` — there is none.
- **Gap.** Local: ~2 % of the counter's own time, i.e. well under 1 % of the stack. Equivalent: no size effect at all.

---

## E. Negative space — 16 shapes, each with a detector

Each entry: the shape, why it dies, and the *detector* — the measurement that says "this is dead, do not re-attempt".

| # | shape | why it dies | detector |
|---|---|---|---|
| E1 | **Contract-free wires look like a win** | 127 < 163 on cue-sheet, 56 < 60 on lsblk — but `[AN1]`, `Ω!万01万01!`, `⟐` have no key, so the message is not decodable by a reader | open the message: `bench/x73/peek.ts <lane> logos` → no rule line in the first 3 lines |
| E2 | Columnar transposition | reorder rows↔columns buys ~0.2 %; the tokenizer does not care about order | `bench/x73/colprobe.ts`: `ls-l-real 5194/5102/5094`, `ps-aux 3054/2822/2815` |
| E3 | TAB normal form | −24 / 0 / +28 on three lanes — noise | `bench/x73/frontab.ts` |
| E4 | Table family on the TAB form | loses to the frontier on all four probed lanes | `bench/x73/tabfam.ts`: findmnt 420 vs 444 |
| E5 | Canonical (re-derived) column widths are free | re-derived widths reproduce the source on **0 of 19–91 rows**; alignment is right-aligned, tree-prefixed and interior-spaced | `bench/x73/canon.ts`: `findmnt 0/19`, `ps-ef 0/40`, `ls-l 0/91`, `du-real 40/40` (single column, trivially) |
| E6 | Multi-token glyph leakage | 0 excess tokens on every probed lane | `bench/x73/glyphcost.ts` |
| E7 | Prose is being under-compressed | bibliography 896 → 671; prose is at its floor | `bench/x73/bib.ts` |
| E8 | The contract is the frontier's cost | contracts measure 0–11 tokens | `bench/x73/ctax.ts` |
| E9 | Another language is denser | Chinese is **+9 % to +22 %** against English on the four shipped sentences | `bench/x73/lang.ts` |
| E10 | Duplicate work across parents | `hyleEncode` called exactly once per encode, 0 duplicated chars | `bench/x73/dupwork.ts` |
| E11 | The registry contains cheaper admissible codecs | none: every admissible codec ties the frontier exactly | `bench/x73/adm.ts`: 444/315/433/149, `BELOW none` |
| E12 | Small documents can be won | the frontier abstains (emits the source) and the only sub-frontier message is a contract-free date strip | `bench/x73/sweep.ts`: `free-m 76→72` via `panacea`, whose message is `ぁ# source: … ぁ20261024T211504Z` — no key |
| E13 | An AP column can rescue `metrics.tsv` | `in_mbps` is not an AP after row 9 (127.9 → 130.0); the column falls to a literal | `bench/x73/kat.ts`: 252 vs 210 |
| E14 | A cycle can rescue `prices.csv` | `asof` wraps after 28 rows, so the "cycle" is 28 long — i.e. a literal list | `bench/x73/kat.ts`: 323 vs 133 |
| E15 | A general key is cheap enough to buy a closed wire | the *documented* key for EIDOS is ≈ 50 tokens; 128 + 50 = 178 > 163 | §D3; `EIDOS_SYSTEM_PROMPT` in `eidos.ts` |
| E16 | A model will just decode it | no model was called this turn; RTCE (arXiv:2601.13398) reports models are unreliable at exact round-trip, and NDCS reports an in-band format failing from a plain user message on one frontier model | cited, not measured here |

---

## F. Second-order adversary A(C), per candidate

`A(C)` asks: *given that C is deployed, what does an adversary — or an ordinary drift in the environment — do to it?*

- **A(STICHOMYTHIA).** A document crafted so programs *nearly* fit is the attack: one row where the AP breaks forces a literal column and the message becomes larger than the frontier. It cannot become *incorrect* (exactness is checked), but it can become *worse than useless* if the encoder trusted the model — which is why admission is a measurement, not a construction. A subtler attack: a column whose values are an AP but whose *padding* varies, which is precisely the `line 0` / `line 10` defect that turned the first build into an identity codec. Detector: `kat.ts` prints `applied` and `exact` separately.
- **A(frontier candidate admission).** The new candidate runs before the frontier's own result is compared, so a slow codec could regress *time*. Measured: `cue-sheet` encoding is 340 ms, dominated by the tokenizer count; no lane got slower in the gate beyond noise.
- **A(flat rank table).** A vocabulary change alters `PAIR2` only through `put`, which also fills `SMALL`; a stale table across a rebuild is prevented by `PAIR2.fill(-1)` in the same block as `SMALL.clear()`. The adversary is a *rebuild*, and the differential gate is the detector (0 mismatches after the change).
- **A(reader-from-key).** The reader is written from the key alone and could agree with the encoder because I wrote both. That is not independent in the way `bench/x71/reader3.ts` was; it is independent only in *code*, not in *author*. Stated as a weakness, not a strength.

---

## G. Verification binding, and repair-inherits-no-trust

**Real verification, listed with what it actually establishes:**

| check | establishes | does not establish |
|---|---|---|
| `kat.ts` per lane | `D(E(x)) = x` in-process, applied/refused | that a model can decode |
| `reader.ts` (from the key alone) | the message contains a sufficient decoder | that the reader is authorially independent |
| `stadion-broad.ts`, 29 lanes | 29/29 byte-exact through the shipped path | nothing about lanes outside the 29 |
| `ids.ts`, 323 192 strings | the counter equals the library | that the library is right |
| `tsc --noEmit` | types | semantics |

**Repair-inherits-no-trust.** When a codec refuses, the frontier's own message is returned *unmodified* — the refusal path does not borrow the candidate's claims. `tagstackEncode` compares two complete decoded messages; a candidate that fails either check is dropped, not repaired. Because the candidate runs *after* the frontier result is computed, a crash inside `stichomythiaEncode` could take the frontier down with it; the encoder therefore catches nothing internally but never throws (all failure paths return a result object), and the gate confirms 29/29 on lanes the codec declines.

---

## H. Results

| lane | raw | X72 frontier | X73 | Δ |
|---|---|---|---|---|
| `cue-sheet.md` | 513 | 163 | **101** | **−62 (−38 %)** |
| `node-help` / `code-ts` / `apt-real` | — | 864 / 983 / 860 | 863 / 985 / 859 | −1 / +2 / −1, the documented drift lanes, **net 0** |
| other 25 lanes | — | — | identical | 0 |
| **29-lane total** | — | **12 696** | **12 634** | **−62**, 29/29 exact, 659.6 s |

Counter: 323 192 strings, 0 mismatches; ratio 3.2× → 4.85×; 91 ms vs 441 ms on 300 k calls.

---

## I. Task status, honestly

| # | asked | status |
|---|---|---|
| 1 | new codec, Pareto superior on a lane, more than a few tokens | **met** — `stichomythia`, −62 (−38 %) on cue-sheet, shipped and registered |
| 2 | a brand-new mechanic | **met** — column-as-printable-program (D1); the copy-cell family has no member that does this |
| 3 | improve whole-stack speed, zero fidelity loss | **partially met** — flat rank table, verified identical, ratio 3.2× → 4.85×, but < 1 % of stack wall clock. No fidelity loss. |
| 4 | improve the representation as seen by the parent frontier | **met** — the candidate is admitted inside `tagstackEncode`, so every downstream codec (AUSTEROS, STADION, registry) sees it |
| 5 | confirm the frontier equals last turn's configuration | **met**, §C |
| 6 | generalized local-leader lists | **met**, `docs/codecs.md` §5 (ops / regular tables / prose / disqualified) |
| 7 | abbreviation→design-spec page updated | **met** — `docs/codec-abbreviations.md` §X73, incl. greedy-or-not, honest citation, time-vs-CPU |
| 8 | LLM decodes from a single chat message | **not claimed** — the message carries its decoder and an independent reader succeeds (4/4); **no model was called**, and §E16 cites two counter-examples |
| 9 | fresh live searches, new sites | **met** — LeCo (SIGMOD 2024), Corra (VLDB 2024 workshop), RTCE arXiv:2601.13398, 500xCompressor ACL 2025; none previously cited in this project |
| 10 | evaluate new math proofs, fractally | **no change from X71:** OpenAI's ETH announcement (26 Oct 2026), Anthropic's `formal-math/eth`, IAS AGMAI and Gemini/Double AI claims remain **unopenable and unverifiable** from this sandbox; no proof text was obtained, so no evaluation is claimed. Not re-litigated this turn. |
| 11 | test many ideas, beat the frontier by more than a few tokens | **met** — 16 negative-space shapes + 6 approaches tested; one win at 62 tokens |
| 12 | byte-perfect, in-band, model-readable | **met** for byte-perfect and in-band; model-readable is §H above |
| 13 | leave the PR open | **met** |
| 14 | structural outputs | this document |

## J. Reproduce

```bash
npm install
npx tsc --noEmit
npx esbuild bench/x73/kat.ts --bundle --platform=node --format=esm \
  --outfile=bench/x73/kat.mjs --external:gpt-tokenizer && node bench/x73/kat.mjs bench/holdout-x40/cue-sheet.md
npx esbuild bench/x73/reader-check.ts --bundle --platform=node --format=esm \
  --outfile=bench/x73/reader-check.mjs --external:gpt-tokenizer && node bench/x73/reader-check.mjs bench/holdout-x40/cue-sheet.md
npx esbuild bench/x72/ids.ts --bundle --platform=node --format=esm \
  --outfile=bench/x72/ids.mjs --external:gpt-tokenizer && node bench/x72/ids.mjs
# 29-lane gate: see bench/x72/stadion-broad.ts; receipt bench/x72/receipts/stadion-broad.json
```
