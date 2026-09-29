# PALIMPSEST — the search hyperparameters are decision variables

Artifact for `src/lib/omega/palimpsest.ts`.
Measurements: `bench/tmp/abl.ts` (ablation), `bench/tmp/pal.ts` (13-lane
comparison), `bench/tmp/palgate.ts` (gates), `bench/tmp/charpolish.ts` (negative),
`bench/tmp/prof.ts` (profile).

---

## RUNTIME HONESTY

**Used:** Node v22.22.3, TypeScript 5.9.3 (`./node_modules/.bin/tsc --noEmit`),
Vite (`npm run build`), the live `gpt-tokenizer` o200k_base encoder, **CPython
3.11.2**, git, web search.
**Broken:** `gh` / `git push` — `GH_TOKEN` expired.
**Not available, therefore never claimed:** any LLM API or local model, theorem
prover, agent fleet, GPU, parallelism. **No language model read a wire.**

**Sandbox:** re-cloned at `a743278` again; `node_modules` and `bench/tmp` gone,
source survived. Restored; `tsc` clean; `npm run build` ok.

**Runs that did NOT complete and are therefore not cited:** the 37-lane
multi-codec `bench/chiron-frontier.ts`. **No new 37-lane frontier total is
claimed.** All numbers below are on the lanes actually named.

---

## A. FORMAL MODEL

**A1.** A codec is `(E, D, C)`: total `E, D : Σ* → Σ*` with `D(E(x)) = x`, plus a
contract compiler `C`.
**A2.** `D` is a language model reading **one ordinary chat message** — no system
prompt, no `skills.md`, no prior turn, no tool.
**A3.** o200k_base tokens of `C(E(x)) ‖ E(x)`. Second resource: wall-clock.
**A4.** ∀x : `D(E(x)) = x` ∧ `M(x) ≤ |T(x)|` ∧ **`M(x) ≤ M_incumbent(x)`**;
∃x : `M(x) < M_incumbent(x) − k`. The third universal is new this turn and is
gated (P5) rather than hoped for.
**A5.** 0–20 000 tokens; UTF-16 code-unit equality; integer tokens; zero tolerance.
**A6. Not to be substituted:** byte compression; lossy prompt compression;
soft-prompt compression; dictionary-in-the-system-prompt; fine-tuned codecs;
fixed schemas; wire-length rather than message minimisation; **and "one
hyperparameter setting is the right one", which §D.1 disproves.**

---

## B. OUTCOME SPACE

* **H+** further compression is available inside the contract.
* **H−** the dictionary/grammar/merge class is exhausted.
* **H∂** the achievable answer depends on the *configuration*, per input.

**Resolved: H− for new mechanisms, H∂ for configuration.** Declared threshold:
test the last open candidate class with an exact evaluator, and profile before
optimising. Both done; both answered.

---

## C. FRONTIER AND THE OPEN INTERFACE

New this turn:

| imported result | hypotheses | use |
|---|---|---|
| **Algorithm portfolios / per-instance algorithm selection** (Rice's 1976 algorithm-selection problem; Gomes & Selman, *Algorithm portfolios*, AIJ 2001; SATzilla) | a family of solvers with uncorrelated per-instance performance | exactly our situation: no configuration dominates, so run several and keep the best measured |
| **Anytime algorithms** (Dean & Boddy 1988; Zilberstein 1996) | monotone quality profile, interruptible | the portfolio is ordered so arm 0 is the incumbent; the encoder always holds a stack-quality answer and can be cut off |
| **PPM escape/backoff** (Cleary & Witten 1984; Moffat 1990) | adaptive context models | the canonical answer to "the specific model has no evidence" — backoff. Our analogue is arm 0 as the fallback, not a probability escape |
| **Estimating compressibility without compressing** (practitioner consensus: sample ~10 KB from the *middle*, not the head) | representative sampling | considered as an arm-pruning heuristic and **not shipped**: at our input sizes a sample is not cheaper than an arm |
| **Suffix automaton / DAWG**; **MR-RePair** (Furuya et al., *Algorithms* 13(4):103, 2020); **Aho–Corasick** | linear-size substring index; maximal repeats | last turn's 38–43× candidate-generation speedup, which is what makes a portfolio affordable |
| **Zipf / hapax legomena** (40–60% of word types occur once) | natural-language corpora | explains the literal residue the dictionary class cannot reach |

**The open interface.** Every achievability result concerns grammar or index
size; our objective is `|T(render(grammar))| + |T(contract)|`. What remains
uncovered by any retrieved result is the **literal residue** — text whose only
structure is the reader's language prior. No result codes that inside one chat
message without model access.

---

## D. NEGATIVE SPACE

### D.1 THERE IS NO SINGLE GOOD CONFIGURATION — the ablation (`bench/tmp/abl.ts`)

Running the incumbent with one hyperparameter changed at a time:

| lane | default M | maxSpan=12 | levels=1 | topK=800 |
|---|---|---|---|---|
| gh-api | 1171 | **1153** | 1161 | 1169 |
| doc11 | 2658 | **2648** | 2663 | 2654 |
| dts0 | 2172 | 2190 | 2181 | **2171** |
| gh-prose | 1827 | 1827 | **1825** | 1827 |

The shipped default is beaten on **every lane tested**, by a **different**
setting on each, by up to 18 tokens. Shipping one setting is leaving tokens on
the table on essentially every input.

### D.2 CHARACTER-LEVEL CANDIDATES — the last open class, now closed exactly

HERMES-Ω founded this stack by rejecting non-token-aligned candidates **on a
bound**. Re-tested with an exact evaluator (render, count, keep only on a strict
decrease plus verified round-trip), applied as a polish pass:

| lane | wire | after polish | Δ | admitted / evaluated |
|---|---|---|---|---|
| gh-prose | 1787 | 1784 | −3 | 1 / 1400 |
| license | 980 | 980 | 0 | 0 / 700 |
| readme | 645 | 645 | 0 | 0 / 515 |
| code-ts | 1043 | 1039 | −4 | 4 / 2030 |
| doc3 | 501 | 501 | 0 | 0 / 273 |

**4 918 exactly-evaluated candidates → 7 tokens.** The rejection was correct.

### D.3 RE-PLUMBING AN ENCODER'S INTERNALS TO BUILD A PORTFOLIO

PALIMPSEST's first revision called `buildOn`/`renderBest` by hand per arm. Arm
zero silently stopped reproducing the incumbent: **dts0 came back at 3973 against
ARIADNE's 2172, gh-api 1665 against 1171, code-dts fell to raw.** The portfolio
lost on 9 of 13 lanes. A portfolio whose reference arm is not literally the
incumbent has no guarantee at all. Repaired by calling the shipped encoders
(§I), and gated by P5.

### D.4 "PROFILE-FREE OPTIMISATION"

Mining is only ~6% of one encode; optimising it blind predicts a 6% win. It is
called ~30 times per encode, so the measured win was 2.9–3.9×. Conversely the
**assignment is ~50% of the time** (dts0 3257 ms → 1487 ms with `noAssign`) and
is **worth 45–98 tokens**, so cutting it would have been a large loss.

### D.5–D.18 (carried, each measured in an earlier turn)

5. Delta-evaluated tabu search for glyph assignment — worse on every setting.
6. A superset fallback arm that re-imports the fallback's nondeterminism.
7. Dictionary-ising every distinct token.
8. Ranking word rules by frequency rather than adjacency.
9. Capping phrase rules to free alphabet space — monotonically worse.
10. CJK's large-but-sparse alphabet against the dense pooled one.
11. Wide multi-line record templates (real JSON arrays have variable-length records).
12. Optimal parsing alone (worse, though 30× faster).
13. Glyph-after-space absorption (exactly neutral).
14. First-use rule binding (exactly break-even).
15. **Model-prior compression** — largest remaining prize, **unreachable** here.
16. LZ77 distance/length back-references — no behavioural verifier.
17. Few-shot contract instead of prose — cheaper, unverifiable.
18. Tiny lanes — impossible before any contract is paid.

---

## E. MECHANISM PORTFOLIO

### E1. Configuration portfolio scored on the whole message  ← shipped
*Construction:* a sequence of complete configurations (span limit, level count,
candidate cap, single-token rule count, block pass) each scored on `M`; keep the
minimum. *Artifact:* `PORTFOLIO` + `runArm` in `palimpsest.ts`.
*Proved:* arm 0 **is** the incumbent encoder called with default options, so the
result is `min` over a set containing the incumbent — it cannot be worse.
*Falsification (cheapest):* gate **P5**, which fails if any framed lane's `M`
exceeds its own arm-zero `M`. Result **20/20**.
*Gap:* local.

### E2. Anytime ordering
*Construction:* arms ordered strongest-default-first, with a wall-clock envelope;
later arms are skipped, never the first. *Proved:* the encoder holds a
stack-quality answer from the first arm onward. *Falsification:* run with
`maxArms: 1` and confirm parity with ARIADNE.

### E3. Suffix-automaton candidate generation (this stack, shared)
38–43× faster with identical best candidates; this is what makes E1 affordable.

### E4. Aho–Corasick occurrence indexing (shared)
O(n + matches), exact, replacing an O(n·maxSpan) string-key sweep.

### E5. Exact-evaluator admission of the rejected char-level class
**Falsified** (§D.2) — and closing it is the point.

### E6. Ablation-driven hyperparameter discovery
*Artifact:* `bench/tmp/abl.ts`. Produced the portfolio's arms 1, 2 and 4 directly
from measurement rather than intuition.

---

## F. ARTIFACTS

Every branch returns an executable and a number: `abl.ts` the ablation table,
`pal.ts` the 13-lane comparison, `charpolish.ts` a counterexample, `prof.ts` the
profile, `palgate.ts` the receipts, `palimpsest.ts` the design.

---

## G. SECOND-ORDER ADVERSARY

* **Against E1:** the guarantee "can only tie or beat the incumbent" is only true
  if arm zero *is* the incumbent. §D.3 is the case where it was not, and P5 is
  the standing gate that detects it.
* **Against E2:** if the budget expires mid-arm the arm must be discarded, not
  half-used — arms are only recorded after a verified round-trip.
* **Against the whole stack:** `adv/greek` and `adv/allscripts` place pooled-
  alphabet characters *in the payload*, forcing the collision filter; both
  round-trip through all three readers.
* **Quantifier order:** P1–P6 are ∀ over the corpus, not averages.
* **Imported-theorem alignment:** portfolio/anytime results are used for
  *scheduling*, and no per-instance-selection performance bound is claimed for
  our instance distribution.

---

## H. VERIFICATION — receipts

Three independent readers: the library decoder, a reader written from the
contract prose alone, and `bench/chiron_decode.py` on **CPython 3.11.2 in a
separate process**.

```
PALIMPSEST GATES  (31 inputs, 20 framed, 11 declined)
PASS  P1  exact UTF-16 round-trip (library decoder)        31/31
PASS  P2  independent prose-literal reader agrees          31/31
PASS  P3  external CPython reader agrees  CPython 3.11.2   31/31
PASS  P4  message gate: never worse than identity          31/31
PASS  P5  portfolio never worse than its own arm zero      20/20
PASS  P6  one-chat accounting exact (M == tokens(prompt))  31/31
      encode wall-clock 78.5s; worst ho/license.txt 17357ms
```

Corpus: 10 holdout files, 5 chaos/mosaic/BANYAN fixtures, 7 synthetic op lanes,
9 adversarial payloads. **The gate suite runs at a reduced budget**
(`budgetMs: 4000, maxArms: 3`) so it completes; at that budget the portfolio beat
arm zero on only 1/20 lanes by 5 tokens. The compression numbers below are at
the shipped default budget. Both are stated because they differ.

`tsc --noEmit` clean; `npm run build` → `✓ built in 11.36s`.

### PALIMPSEST at its default budget (`bench/tmp/pal.ts`, 13 lanes)

| lane | ARIADNE | SIBYL | **PALIMPSEST** | Δ vs ARIADNE | winning arm |
|---|---|---|---|---|---|
| doc11 | 2658 | 2612 | **2611** | **−47** | span12+words |
| gh-prose | 1827 | 1782 | **1782** | **−45** | span12+words |
| dts0 | 2172 | 2137 | **2135** | **−37** | span12+words |
| code-ts | 1092 | 1061 | **1061** | **−31** | span12+words |
| gh-api | 1171 | 1163 | **1153** | **−18** | span12 |
| doc3 | 541 | 541 | **531** | **−10** | span12+words |
| license | 1020 | 1014 | 1015 | −5 | span12+words |
| json-pkg | 744 | 744 | **743** | −1 | span12 |
| BANYAN | 696 | 696 | **695** | −1 | span12 |
| json-log | 188 | 188 | **187** | −1 | span36 |
| readme / code-dts / csv | 688 / 108 / 266 | same | same | 0 | default |

**Beats ARIADNE on 10/13 lanes and loses on 0.** Total over the 13 lanes:
ARIADNE 13 171, SIBYL 13 000, **PALIMPSEST 12 975**. Wall-clock 293 s against
ARIADNE's 33 s — **the cost is ~9× time**, and that is the honest trade.

**Claims explicitly downgraded:** no 37-lane frontier total; PALIMPSEST is not
faster (it is a portfolio, so it is slower by construction); the reduced-budget
gate configuration does not reproduce the full-budget gains; and that any
language model executes these contracts remains untested after six turns.

---

## I. REPAIR

| defect | found by | repair | re-gated | new attack |
|---|---|---|---|---|
| Hand-rolled arms broke parity with the incumbent (dts0 3973 vs 2172) | `bench/tmp/pal.ts` Δ column | arms call `ariadneEncode` / `sibylEncode` with option overrides | full 13-lane re-run: 10 wins, 0 losses | **P5** — a standing gate asserting the portfolio never exceeds its own arm zero |
| Miner called ~30×/encode at O(n·maxSpan) | `bench/tmp/prof.ts` | suffix automaton (previous turn) | `spd2.ts` | best-candidate-net equality per lane |
| Lost `node_modules`/`bench/tmp` after re-clone | `build.sh: No such file` | restored harness, `npm install` | `tsc`, `npm run build` | — |

No repaired candidate inherited trust: P1–P6 were run after the final change.

---

## J. RESULT AND STOPPING

**Shipped:** PALIMPSEST (`src/lib/omega/palimpsest.ts`), wired into registry,
worker, codec types, Workbench and `bench/leaderboard.ts`.

**Worth, honestly:** beats ARIADNE on 10 of 13 lanes and loses on 0, by up to 47
tokens, with a structural guarantee (P5) that it can never be worse than the
codec it wraps. It is ~9× slower. The mechanism is not a new operator — it is the
recognition, backed by an ablation, that **no single hyperparameter setting is
right for every input**, and that measuring is cheap now that candidate
generation is 38–43× faster.

**Not achieved:** a large compression win. §D.1 and §D.2 now bound why — the
dictionary class is closed, the character-level class is closed, and 55–75% of
every wire is hapax literal text.

**Stopping.** The budget is spent. The success predicate holds for exactness, the
message gate, accounting and incumbent-domination; it does **not** hold for a
large compression gain, so this returns the strongest verified artifact plus the
exact remaining gap.

### Next highest-information tests, in order

1. **Put an LLM in the encode loop.** Every remaining token is hapax literal text
   whose only structure is the reader's prior. This is the one capability that
   would reopen the problem, and it is absent from this sandbox.
2. **Ask an actual LLM to decode a wire.** Untested for six turns.
3. **Widen the portfolio and parallelise it.** Arms are independent; the 9× time
   cost is embarrassingly parallel and would collapse to ~1× on multiple workers.
4. **Learn the arm.** The ablation shows which arm wins correlates with input
   shape (span12 wins on JSON/code, default on markdown). A cheap classifier
   over repeat-mass would pick one arm instead of running three.
5. **Contract floor.** ~40 tokens on ~29 lanes; measured minimum viable prose 33.
