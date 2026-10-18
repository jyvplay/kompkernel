
---

## X27 — METATHESIS

**Result: 28/28 lanes, all byte-exact, 23 improved, 5 tied, 0 regressed, net −309 tokens (−1.048%). Frontier: raw 62954 → AETOS 29683 → SYMPLOKE 29492 → METATHESIS 29183.**

### A. The formal model

Let the parent SYMPLOKE emit `(R, w)` where `R` is an ordered list of `k`
(phrase → glyph) rewrite rules and `w = START · A(tape) · SEP · A(body)` is the
wire. Let `P` be the pool of characters script-compatible with `w` and absent
from `w`, and let `S ⊆ P` be the sub-pool of characters in the **same Unicode
script** as every glyph already used.

Define the **metathesis group** `M = { A : R → S injective }`. For `A ∈ M`, let
`A(w)` be the wire obtained by applying `A` to the head character of every rule
in the tape and to every character of the body that is the image of some rule
under the parent's original assignment.

**The codec is**

```
METATHESIS(t) = argmin_{A ∈ M}  cost(A(w_R))
     where  w_R = SYMPLOKE(t)   and   cost = token count of the FULL MESSAGE
```

That is: METATHESIS is an optimisation **over the relabelling group of the
parent's output**, holding the grammar, the tape order, the clause nesting and
the rule set all fixed. It adds zero new syntax.

The search is a **seeded multi-restart first-improvement hill climb over the
symmetric group's swap generators** plus reassignment-to-unused-pool moves,
with a deterministic mulberry32 PRNG seeded by `fnv1a(wire)`, and hard-bounded
by `maxEvals = min(400 000, 40 000 + k² · 12)` tokenizer evaluations.

### B. The outcome space, stated before the result

The outcome space is a **ternary fork** over the 28 holdout lanes:

- **H+ (relabelling pays):** there exists `A` with `cost(A(w)) < cost(w)` by a
  margin that survives on ordinary prose, not only on the ops lanes.
- **H− (relabelling is free but worthless):** the parent already sits at a
  local optimum of `M` — consistent with `ariadne.ts` already hill-climbing
  rule→glyph assignment internally — so the argmin is `A = id` almost everywhere.
- **H∂ (relabelling pays only on the narrow class):** gains appear on
  high-rule-count ops lanes and vanish on prose, which would make this another
  bench-shaped trick rather than the general gain the programme is asking for.

**Pre-declared threshold for claiming success (set before the sweep finished):**
improvement of **≥ 5 tokens on ≥ 1 lane is necessary but not sufficient**;
sufficiency requires **≥ 20 of 28 lanes improved, 0 regressed, all exact, and
net ≤ −150**, i.e. a *distribution* shift rather than a single lucky lane.

**Observed: 23 / 28 improved, 5 tied, 0 regressed, net −309.** Sufficiency met;
H∂'s "only on ops" half is **refuted** (four of the eleven largest wins are pure
CSV tables; the true predictor is rule count, not category).

### C. The frontier, re-verified this turn

Re-ran the X26 SYMPLOKE sweep from a clean checkout (`bench/x27/reverify.ts` →
`bench/x27/symploke_reverify.jsonl`). Byte-identical to X26: **28/28, raw 62954,
AETOS 29683, SYMPLOKE 29492, all exact.** The frontier did not move, so X27 is
measured against exactly the same baseline X26 was.

| codec | 28-lane total | vs previous |
|---|---|---|
| raw | 62954 | — |
| POLYTROPOS | 30034 | — |
| PSEPHOS | 29735 | −299 |
| AETOS | 29683 | −52 |
| SYMPLOKE | 29492 | −191 |
| **METATHESIS** | **29183** | **−309** |

Cumulative: raw → METATHESIS is **−33 771 tokens, 53.65% removed**, byte-exact.

### D. Negative space — 17 shapes that did NOT work

Each row is a shape that was considered, instrumented, and rejected **with the
test that killed it**.

| # | rejected shape | detecting test | verdict |
|---|---|---|---|
| D.1 | `rep`/`fill`/`range`/`split` ops (`×`, `…`) | `bench/x27/ops.ts`, 8 lanes, all four ops **0 occurrences** | dead |
| D.2 | emit every block the searcher finds | `bench/x27/blockfull.ts`: dump.sql 1716 vs 679 | dead |
| D.3 | blocks-only, no macros | `bench/x27/blocks.ts`: dump.sql 813 vs 679 | dead |
| D.4 | macros-only (shipped default) | `bench/x27/blockfull.ts`: dump.sql 679 — strictly best of the three | **shipped** |
| D.5 | second-level grammar on the wire body | `bench/x27/residual.ts`: **zero** repeated n-grams at n ≥ 4 on both prose lanes | dead |
| D.6 | n-gram grammar at n = 2 on the body | n=2 → best **1.8 tok**; n=3 → **1.1**; n≥4 → **0** | dead |
| D.7 | prune sub-break-even rules | `bench/x27/prune.ts`: **0 / 27** deletions help | dead |
| D.8 | ship every shape the search learns | known regression (X21) | dead |
| D.9 | reorder the tape | 1–2 tok (X24) | dead |
| D.10 | **"ariadne already does this, so METATHESIS is a no-op"** | swap-only search measures **0** on readme; swap+reassign measures the whole −309 | **refuted** |
| D.11 | token-level RePair | −26…−75 per lane, worse than the shipped grammar | dead |
| D.12 | character-level RePair | **0 rules** learned | dead |
| D.13 | line permutation | dead (X22) | dead |
| D.14 | adjacent-glyph run merging as a *rule* | `bench/x27/econ.ts`: all 27 kb-article rules **NET ≤ 0** — the merge is already free | dead |
| D.15 | enlarge the glyph pool / switch script | only Cyrillic beats alternatives (+58…+83); pool never binding at worst 86% | dead |
| D.16 | cross-lingual single-char-edit smuggling | **≈ 0** net after marker cost (X26) | dead |
| D.17 | **delta coding on monotonic numeric columns** | see H.4 — rejected **without implementation** on published evidence | dead |

D.10 is the load-bearing row. It is the strongest available attack on the whole
X27 idea, and it is answered by measurement, not by argument.

