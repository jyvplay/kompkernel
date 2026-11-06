# X75 — BRACHYLOGIA: the decoder instruction is a named part of the message

New codec: `src/lib/omega/brachylogia.ts`, registry key `brachylogia`.
Gate: **X74 12 495 → X75 12 441 (−54)**, 3/29 lanes fire, **29/29 byte-exact**,
`OMEGA_DET=1`, both arms in one process (`receipts/gate75-det.json`).

---

## 1. Frontier configuration: confirmed, exactly

Two controls were rerun this turn on the same 29 lanes under `OMEGA_DET=1`:

| arm | last turn | this turn | verdict |
|---|---|---|---|
| X73 identity control (`gate73.ts`) | 12 639 | **12 639** | identical |
| X74 chain (`tagstackEncode`) | 12 495 | **12 495** | identical |

The frontier is exactly the configuration reported last turn. No restatement needed.

## 2. The measurement that redirected the turn

`bench/x75/t12.ts` → `receipts/contract-audit.json`, all 29 lanes:

| instruction region | lanes | instruction tokens |
|---|---|---|
| long CHIRON rules clause | **3/29** | 62 (`df-h`, `metrics.tsv`, `kubectl`) |
| metron legend | 2/29 | 73 (`psql-output`, `cue-sheet`) |
| short contract | 22/29 | ~11 (synkrisis majority) |
| none detected | 2/29 | 0 |

The rules clause alone is **39 tokens of a 171-token message** on `df-h`.

### An overclaim was found and removed

The first draft of this report claimed "14 % of the gate is the decoder's own prose",
from an audit selecting "any line over 40 characters ending in a full stop". That
selector cannot distinguish an INSTRUCTION from English DATA, so it counted
`kb-article` (388), `llm-answer` (158) and `code-ts` (147) — which are documents being
compressed, not instructions. The corrected structural audit is the table above, and it
reverses the conclusion: **the instruction is not the general lever**, because on 22 of
29 lanes the parent already pays ~11 tokens.

## 3. The mechanic

Every previous codec treats the decoder instruction as a **constant** — authored once,
quoted verbatim, paid in full. BRACHYLOGIA re-expresses it, keeping every load-bearing
element and dropping English grammar:

```
39 tok  Every new Cyrillic letter before ¶ starts a rule whose text runs to the next
        new letter or to ¶. In the text after ¶ expand every rule, repeatedly, and
        print only the result.
25 tok  Before ¶ a new Cyrillic letter names text to the next new letter or ¶.
        After ¶ expand repeatedly; print only.
```

Kept: which characters name a rule (a **new Cyrillic letter**), where the tape ends
(**¶**), how far a name's text runs (**to the next new letter or ¶**), where expansion
applies (**after ¶**), that it recurses (**repeatedly**), what to emit (**print only**).

The substitution table is fixed, ordered and idempotent — a **total function**, not a
search. There is no hill-climb over wordings, deliberately: a search over English needs
an objective, and no program here scores "an LLM still reads this the same way".

## 4. Verification — what is checkable, and what is not

The wire is decoded by **code**; the contract is decoded by **comprehension**. An early
draft gated on `chironDecode(message) === source`. That gate failed even on the
*unmodified* frontier message — which was the useful discovery, since it proved the
composed decoder is not `chironDecode`, and weakening the gate until it passed would
have been the dishonest move. Rebuilt:

| gate | check | executed |
|---|---|---|
| 1 | **invertibility** — undoing every edit reproduces the frontier message byte-for-byte | every encode |
| 2 | **wire immunity** — no edited line carries `§` | every encode |
| 3 | **data guard** — never edit a line that occurs verbatim in the source | every encode |
| 4 | **element coverage** — each rule declares keywords its replacement must contain | every encode |
| 5 | **strict win** — complete message strictly smaller | every encode |
| 6 | **cold read** — a reader holding only the message decodes it | this turn, §5 |

Gates 1–5 are **necessary and provably not sufficient**: all five pass on a sentence no
reader understands. Gate 6 is the admission test.

## 5. Cold read (Gate 6) — performed, half passed

`bench/holdout-x40/metrics.tsv` was contracted and **only the message** printed
(`cold.ts` never prints the source). From the contracted 25-token sentence alone the
tape's rule table was extracted by hand and checked against `chironParseTape`:

```
rules hand-extracted 18, parser rules 18, mismatches 0
GATE 6 (rule-extraction half): PASS
```

The half the contraction actually governs passed. The byte-level `⁺` arithmetic over
11 rows was **not** completed by hand this turn, so the reconstruction half of Gate 6
is **not claimed**.

## 6. Results

| lane | X74 | X75 | delta | instruction |
|---|---|---|---|---|
| `df-h.txt` | 171 | **153** | −18 (−10.5 %) | 62 → 44 |
| `metrics.tsv` | 210 | **192** | −18 (−8.6 %) | 62 → 44 |
| `kubectl-get-pods.txt` | 326 | **308** | −18 (−5.5 %) | 62 → 44 |
| other 26 | — | — | 0 | nothing to contract |

Gate: **−54 on 12 495 (0.4 %)**, 3/29 lanes, 29/29 exact.

## 7. Generalized local leaders (`t45`-derived, `receipts/leaders.json`)

Ratio is frontier tokens ÷ unreadable floor (brotli −q11 at 14.8 bits/token).

| class | lanes | tokens | floor | ratio |
|---|---|---|---|---|
| ops: delimited metrics | 1 | 192 | 130 | **×1.48** |
| ops: listing | 2 | 1 827 | 1 271 | **×1.44** |
| ops: query output | 1 | 244 | 166 | ×1.47 |
| ops: aligned table | 5 | 844 | 636 | ×1.33 |
| ops: process table | 3 | 1 754 | 1 313 | ×1.34 |
| source: TypeScript | 1 | 969 | 812 | ×1.19 |
| structured: JSON | 1 | 681 | 592 | ×1.15 |
| **prose: article** | 1 | 622 | 608 | **×1.02** |
| **prose: markdown** | 1 | 674 | 626 | **×1.08** |
| **prose: email** | 1 | 488 | 443 | **×1.10** |

**The structural finding of this turn:** prose is at **×1.02–1.10** of an *unreadable*
floor. There is essentially no headroom left in prose — a "general prose gain" would
have to beat brotli while remaining model-readable. The remaining headroom is entirely
in **ops** (×1.3–1.5).

## 8. Speed — measured, found null, reported as null

The count memo skipped strings over 4 096 characters, exactly the ops message range.
Raised to 65 536 (`OMEGA_NO_COUNT_MEMO=1` restores old behaviour), `speed.ts`:

```
ARM old(4096)    lanes 4 tokens 4049 wall 452202 ms
ARM memo(65536)  lanes 4 tokens 4049 wall 468645 ms
```

**No gain.** A CPU profile of `ls-l-real` (230 s) shows why: 25.5 % `countTokens`,
14.2 % `rankAt`, 9.6 % `scoreRunCostDelta`, on ~230 000 distinct candidate measurements
per lane, with the chunk cache already at **99.4 %** hits (`cache.ts`). Speeding the
stack up means **measuring fewer candidates**, not counting faster — and that is a
fidelity question, not a caching question. **No speed win is claimed this turn.**

## 9. Adversary

| probe | cases | result |
|---|---|---|
| `t30.ts` — structural A(C) + 400-doc fuzz | 15 + 400 | **0 failures, 0 non-inverts** |
| `t31.ts` — applied path + 40 synthetic tables | 6 + 40 | **0 failures, 0 non-inverts** |

`t30`'s fuzz produced 0 applied, so it only exercised refusal — the safe branch. `t31`
was written to attack the branch that can actually fail, and confirms: the invertibility
detector is **not vacuous** (it catches a corrupted message), all 9 elements survive the
contraction, and the `⁺` clause keeps its column reference. Honest limit: the applied
path was exercised on **one** document (`df-h`), because the 40 synthetic tables did not
trigger the tape arm.

## 10. Dead ends, recorded

- **KEYLINE** (`k=` hoist, `t9`/`t10`): **always loses, +3 tokens.** With one occurrence
  of a sentence, a header that quotes it repeats it. Needs ≥2 body occurrences of the
  same instructional line; the frontier emits one. The gate refused it on every lane for
  the right reason. Module deleted rather than shipped as a codec that never fires.
- **Arithmetic derived columns** (`t4`/`t5`): `df` `Use%=Used/Size*100` fits 18/19 rows,
  but the all-rows + ≥2-distinct-values filter leaves **nothing admissible on any of 8
  lanes**. Dead.
- **`t3` is too slow for wide lanes** (167 s `kubectl`, 267 s `ls-l-real`) — use `t7`.
- **`chironDecode` is not the composed decoder** — do not use it to verify a composed
  message; it fails on the unmodified frontier message.

## 11. What is not claimed

- **3 of 29 lanes.** −54 on the gate (0.4 %). Lane-targeted, not general.
- **Gate 6 is half passed.**
- **No speed win** — measured, null, reported as null.
- **No model was called by the encoder.** The cold read was the operator.
- **No general prose gain.** The leaders table says prose is at ×1.02–1.10 of an
  unreadable floor; claiming more would require beating brotli.

## 12. Next highest-information test

The ops headroom (×1.3–1.5) is where the stack is worst, and `metrics.tsv` (×1.48) is the
single worst lane. The cheapest discriminating experiment: take `metrics.tsv` and measure
the frontier's message against a **hand-written optimal encoding** of the same 11 rows, to
separate "the codec family is wrong" from "the search is not finding the right arm". If the
hand encoding is within a few tokens of the frontier, the lane is exhausted; if it is 30 %
below, the search is the problem.
