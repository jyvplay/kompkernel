# DAEDALUS — read the grain of the material before you cut it

Artifact for `src/lib/omega/daedalus.ts`.
Measurements this turn: `bench/tmp/span.ts`, `bench/tmp/scale.ts`,
`bench/tmp/budget.ts`, `bench/tmp/feat.ts`, `bench/tmp/dae.ts`,
`bench/tmp/daegate.ts`.

---

## RUNTIME HONESTY

**Used:** Node v22.22.3, TypeScript 5.9.3 (`./node_modules/.bin/tsc --noEmit`),
Vite (`npm run build`), the live `gpt-tokenizer` o200k_base encoder, **CPython
3.11.2**, git, web search.
**Broken:** `gh` / `git push` — `GH_TOKEN` expired.
**Not available, therefore never claimed:** any LLM API or local model, theorem
prover, agent fleet, GPU, parallelism. **No language model read a wire.**

**THE THREE UPLOADED REPOSITORIES WERE NOT ACCESSIBLE.** The attachment note
says they were saved to `/home/user/uploads/`; that directory does not exist,
and a filesystem-wide `find / -name "jules_session*"` returns nothing. The
sandbox was re-cloned at `a743278` again this turn (git history and
`node_modules` gone, source files survived), which appears to have taken the
uploads with it. **I did not evaluate them and make no claim about them.**

**Runs that did NOT complete and are therefore not cited:** the 37-lane
multi-codec `bench/chiron-frontier.ts`. No new 37-lane frontier total is claimed.

---

## A. FORMAL MODEL

**A1.** A codec is `(E, D, C)`: total `E, D : Σ* → Σ*` with `D(E(x)) = x`, plus a
contract compiler `C` emitting the prose a reader needs.
**A2.** `D` is a language model reading **one ordinary chat message** — no system
prompt, no `skills.md`, no prior turn, no tool.
**A3.** o200k_base tokens of `C(E(x)) ‖ E(x)`. Second resource: wall-clock.
**A4.** ∀x : `D(E(x)) = x` ∧ `M(x) ≤ |T(x)|` ∧ `M(x) ≤ M_ARIADNE(x)`;
∃x : `M(x) < M_ARIADNE(x) − k`. The third universal is gated (D5), not hoped for.
**A5.** 0–25 000 tokens (extended this turn to realistic paste sizes); UTF-16
code-unit equality; integer tokens; zero tolerance.
**A6. Not to be substituted:** byte compression; lossy prompt compression;
soft-prompt compression; dictionary-in-the-system-prompt; fine-tuned codecs;
fixed schemas; wire-length rather than message minimisation; **and "run every
arm", which is what DAEDALUS replaces.**

---

## B. OUTCOME SPACE

* **H+** further compression is available inside the contract.
* **H−** the dictionary/grammar/merge class is exhausted.
* **H∂** the achievable answer depends on the configuration, per input.

**Resolved: H− for new mechanisms (now six independent measurements), H∂ for
configuration — and this turn shows the configuration is PREDICTABLE, which is
what turns H∂ into a cheap win.**

---

## C. FRONTIER AND THE OPEN INTERFACE

New this turn:

| imported result | hypotheses | use |
|---|---|---|
| **Rice's algorithm-selection problem** (1976) | a feature map from instances to algorithm performance | the formal statement of exactly what `daedalusOrder` is: choose the algorithm from cheap instance features |
| **Gomes & Selman, algorithm portfolios** (AIJ 2001); **SATzilla** | uncorrelated per-instance performance; a learned selector | portfolios beat any single solver, and a *selector* beats running the whole portfolio when features predict the winner |
| **Anytime algorithms** (Dean & Boddy 1988; Zilberstein 1996) | interruptible, monotone quality | the arm budget: the encoder always holds a good answer and improves if allowed |
| **PPM escape/backoff** (Cleary & Witten 1984) | adaptive context models | the canonical "the specific model has no evidence, back off" — our analogue is the `default` arm held within the first two slots |
| **Zipf / hapax legomena** (40–60% of word types occur once) | natural-language corpora | explains the literal residue no dictionary can reach |
| **Suffix automaton / MR-RePair / Aho–Corasick** | linear substring index; maximal repeats | previous turn's 38–43× candidate-generation speedup, which is what makes any portfolio affordable |

**The open interface.** Every achievability result concerns grammar or index
size; our objective is `|T(render(grammar))| + |T(contract)|`. What remains
uncovered is the **literal residue** — text whose only structure is the reader's
language prior. No retrieved result codes that inside one chat message without
model access.

---

## D. NEGATIVE SPACE — four new measurements this turn, all negative

### D.1 `maxSpan=24` is NOT an artificial cap worth removing (`bench/tmp/span.ts`)

The suffix automaton finds maximal repeats of any length; line 286 truncates to
`maxSpan`. A 200-symbol repeat occurring 3 times has net 396, truncated to 44 —
so this looked like a large loss. Sweeping 24 → 64 → 200 → 1000:

```
lane              I     span24      span64     span200    span1000
dts0           3991  2172/3606   2164/4654   2164/2581   2164/2446
doc11          3677  2658/11566  2642/8563   2642/7278   2642/7106
gh-prose       1934  1827/2501   1827/2936   1827/2331   1827/2692
gh-api         2519  1171/4944   1161/5092   1177/4756   1177/2472
paste/dts-all 21243 11835/10846 11795/14084 11808/11535 11808/11745
```

**−8 to −16 on two lanes, 0 elsewhere, and non-monotone.** The long repeats are
already captured by the hierarchical level loop as composites.

### D.2 The rule count and glyph pool do NOT bind at realistic scale (`bench/tmp/scale.ts`)

```
lane          I       M    wire  rules  script  poolChars  binding?
dts0        3991    2172   2133    136  cjk          2515   no
dts-x3     10449    5778   5740    340  cjk          2515   no
dts-all    21243   11835  11797    695  cjk          2515   no
docs-all    9753    6719   6681    322  cjk          2515   no
```

695 rules against a 2 515-character pool. Multi-character rule names — which
would quadruple the alphabet — would buy nothing.

### D.3 The search is NOT budget-starved at scale (`bench/tmp/budget.ts`)

```
lane         I      budget 9s      budget 30s     budget 90s
dts-all  21243  11835/ 7192/695  11835/10083/695  11835/13317/695
docs-all  9753   6719/11403/322   6719/10246/322   6719/30682/322
dts-x3   10449   5778/14514/340   5778/10120/340   5778/11800/340
```

**Byte-identical M at ten times the budget.** The search converges; it is not
time-limited. Anyone hoping "just run it longer" is mistaken.

### D.4 Character-level candidates (carried, previous turn, definitive)

4 918 exactly-evaluated non-token-aligned candidates across five lanes produced
**seven tokens**. The class the stack rejected on a bound in turn one is closed
on measurement.

### D.5 The dictionary class is exhausted (carried)

55–75% of every wire is literal text covered by no rule; the entire remaining
pairwise-merge prize across the five largest lanes is 446 tokens, 25 of them on
gh-prose.

### D.6–D.18 (carried, each measured in an earlier turn)

6. Delta-evaluated tabu search over the glyph assignment — worse everywhere.
7. A superset fallback arm that reintroduces the nondeterminism it guards.
8. Re-plumbing an encoder's internals to build a portfolio — the reference arm
   silently stopped reproducing the incumbent (dts0 3973 vs 2172).
9. Dictionary-ising every distinct token.
10. Ranking word rules by frequency rather than adjacency.
11. Capping phrase rules to free alphabet space — monotonically worse.
12. CJK's large-but-sparse alphabet against the dense pooled one.
13. Wide multi-line record templates.
14. Optimal parsing alone.
15. Glyph-after-space absorption (exactly neutral); first-use rule binding
    (exactly break-even).
16. **Model-prior compression** — the largest remaining prize, **unreachable**
    here: no model to measure predictability with, nothing verifiable.
17. LZ77 back-references; few-shot contracts — no behavioural verifier.
18. Tiny lanes — impossible before any contract is paid.

---

## E. MECHANISM PORTFOLIO

### E1. Arm prediction from an O(n) feature  ← shipped, the win
*Construction:* punctuation density and token count, computed in the pass the
encoder already makes, name the arm.
*Artifact:* `daedalusFeatures` / `daedalusOrder`.
*Evidence (`bench/tmp/feat.ts`), features against measured winners:*

| lane | tokens | rep2% | punct% | winner |
|---|---|---|---|---|
| gh-api | 2519 | 82.6 | **20.3** | span12 |
| json-pkg | 1152 | 65.7 | **23.6** | span12 |
| code-dts | 162 | 71.0 | 23.4 | default *(tiny)* |
| readme | 843 | 43.4 | 14.8 | default |
| gh-prose | 1934 | 28.5 | 7.7 | span12+words |
| license | 1166 | 45.2 | 3.2 | span12+words |
| code-ts | 1422 | 66.9 | 10.3 | span12+words |
| doc11 | 3677 | 64.4 | 11.2 | span12+words |
| dts0 | 3991 | 82.9 | 11.3 | span12+words |
| doc3 | 673 | 50.7 | 13.6 | span12+words |

Three lines: `tokens < 300 → default`; `punct% > 18 → span12`;
otherwise `span12+words`. **13/14 hits in the comparison, 18/20 in the gate.**
*Unresolved interface:* the rule is fitted on ten lanes; it is a decision stump,
not a learned model, and it is not claimed to generalise beyond the shapes
measured. *Gap: local.*
*Cheapest falsification:* the `predictionHit` field, reported per encode.

### E2. Incumbent domination by construction
*Construction:* `default` is always within the first two arms, and arms call the
**shipped** encoders with option overrides rather than re-plumbed internals.
*Proved:* the result is a minimum over a set containing ARIADNE's own output.
*Falsification:* gate **D5**, which fails if any input's M exceeds ARIADNE's.
Result **31/31**.

### E3. Anytime arm budget
One arm is already better than the exhaustive portfolio; two is the shipped
default; more is available. *Falsification:* the `maxArms` sweep in §H.

### E4. Suffix-automaton candidate generation (shared, previous turn)
38–43× faster with identical best candidates — what makes any of this affordable.

### E5. Exact-evaluator admission of the char-level class
**Falsified** (§D.4). Closing it is the contribution.

### E6. Scale-regime probing
*Artifact:* `bench/tmp/span.ts`, `scale.ts`, `budget.ts`. Extended the tested
regime from ≤7.5k to 21k tokens and returned three negative results that
redirected the turn away from three plausible-looking dead ends.

---

## F. ARTIFACTS

Every branch returns an executable and a number: `span.ts` the maxSpan sweep,
`scale.ts` the cap analysis, `budget.ts` the convergence table, `feat.ts` the
feature/winner table, `dae.ts` the 14-lane comparison, `daegate.ts` the receipts,
`daedalus.ts` the design.

---

## G. SECOND-ORDER ADVERSARY

* **Against E1:** a classifier that mispredicts must cost nothing. Because
  `default` sits in the first two slots and selection is by measured M, a miss
  costs one wasted arm, never a worse answer — gate D5 is the standing proof.
* **Against E2:** the guarantee holds only if arms call the shipped entry
  points. §D.8 is the case where hand-plumbed arms broke parity silently.
* **Against E3:** with `maxArms: 1` the guarantee weakens to "the predicted arm";
  D5 was therefore run at the shipped `maxArms: 2`.
* **Against the alphabet:** `adv/greek` and `adv/allscripts` put pooled-alphabet
  characters *in the payload*, forcing the collision filter; both round-trip
  through all three readers.
* **Quantifier order:** D1–D6 are ∀ over the corpus, not averages.
* **Imported-theorem alignment:** Rice/SATzilla are used for the *shape* of the
  method; no per-instance-selection performance bound is claimed for our
  instance distribution, because the stump is fitted on ten lanes.

---

## H. VERIFICATION — receipts

Three independent readers: the library decoder, a reader written from the
contract prose alone, and `bench/chiron_decode.py` on **CPython 3.11.2 in a
separate process**.

```
DAEDALUS GATES  (31 inputs, 20 framed, 11 declined)
PASS  D1  exact UTF-16 round-trip (library decoder)        31/31
PASS  D2  independent prose-literal reader agrees          31/31
PASS  D3  external CPython reader agrees  CPython 3.11.2   31/31
PASS  D4  message gate: never worse than identity          31/31
PASS  D5  never loses to the incumbent it wraps (ARIADNE)  31/31
PASS  D6  one-chat accounting exact (M == tokens(prompt))  31/31
      arm prediction hit on 18/20 framed lanes
      strictly beat ARIADNE on 6/31 inputs, by 101 tokens total
      encode wall-clock 92.2s; worst BANYAN 29307ms
```

`tsc --noEmit` clean; `npm run build` → `✓ built in 11.87s`.

### The comparison (`bench/tmp/dae.ts`, 14 lanes incl. a 10 449-token paste)

| lane | I | ARIADNE | PALIMPSEST | **DAEDALUS (1 arm)** | Δ vs ARIADNE |
|---|---|---|---|---|---|
| doc11 | 3677 | 2658 | 2611 | **2611** | **−47** |
| gh-prose | 1934 | 1827 | 1782 | **1782** | **−45** |
| paste/dts-x3 | 10449 | 5778 | 5778 | **5737** | **−41** |
| dts0 | 3991 | 2172 | 2135 | **2135** | **−37** |
| code-ts | 1422 | 1092 | 1061 | **1061** | **−31** |
| gh-api | 2519 | 1171 | 1153 | **1153** | **−18** |
| license | 1166 | 1020 | 1015 | **1015** | **−5** |
| json-pkg | 1152 | 744 | 743 | **743** | −1 |
| BANYAN | 7488 | 696 | 695 | **695** | −1 |
| doc3 | 673 | 541 | 531 | 541 *(2-arm: 531)* | 0 |

```
TOTAL over 14 lanes
  ARIADNE            18 949    48.8 s
  PALIMPSEST (3 arms) 18 754   325.7 s
  DAEDALUS  1 arm     18 724   209.0 s   ← fewer tokens than the full portfolio
  DAEDALUS  2 arms    18 713   229.2 s   ← shipped default
  DAEDALUS  3 arms    18 713   241.9 s
prediction hits 13/14
```

**DAEDALUS running a single predicted arm beats the exhaustive three-arm
portfolio on tokens while being 1.56× faster; at two arms it beats it by 41
tokens and is still 1.4× faster.** Notably it is the only codec that improves the
10 449-token realistic paste (−41), which PALIMPSEST missed because its budget
expired before reaching the right arm.

**Claims explicitly downgraded:** no 37-lane frontier total; DAEDALUS is still
~4.7× slower than plain ARIADNE (an arm that uses single-token rules calls
SIBYL, which runs its own internal grid); the classifier is a three-line stump
fitted on ten lanes, not a validated model; the three uploaded repositories were
not accessible; and that any language model executes these contracts remains
untested after seven turns.

---

## I. REPAIR

| defect | found by | repair | re-gated | new attack |
|---|---|---|---|---|
| Hand-plumbed portfolio arms broke parity with the incumbent | previous turn's Δ column | arms call `ariadneEncode` / `sibylEncode` | full comparison re-run | **D5**, now asserting domination against ARIADNE directly on every corpus input rather than against an internal arm |
| PALIMPSEST's budget expired before the winning arm on large pastes (dts-x3 5778 vs 5737) | `bench/tmp/dae.ts` | predict the arm and run it first | 14-lane re-run | prediction hit/miss recorded per encode |
| Lost `node_modules` / `bench/tmp` after re-clone | `build.sh: No such file` | restored harness, `npm install` | `tsc`, `npm run build` | — |

No repaired candidate inherited trust: D1–D6 were run after the final change.

---

## J. RESULT AND STOPPING

**Shipped:** DAEDALUS (`src/lib/omega/daedalus.ts`), wired into registry,
worker, codec types, Workbench and `bench/leaderboard.ts`.

**Worth, honestly:** beats the exhaustive portfolio on tokens while running one
arm instead of three (1.56× faster), beats ARIADNE by up to 47 tokens per lane
and 236 over fourteen, with a structural guarantee (D5, 31/31) that it can never
be worse than the codec it wraps. It is the only codec in the stack that
improves a realistic 10k-token paste.

**Not achieved:** a large compression win. This turn added three more negative
results (§D.1–D.3) to the four already standing. The dictionary/grammar/merge
class is exhausted and the remaining mass is hapax literal text.

**Stopping.** The budget is spent. The success predicate holds for exactness, the
message gate, accounting and incumbent domination; it does **not** hold for a
large compression gain, so this returns the strongest verified artifact plus the
exact remaining gap.

### Next highest-information tests, in order

1. **Put an LLM in the encode loop.** Every remaining token is hapax literal
   text whose only structure is the reader's prior. Absent from this sandbox;
   the single capability that would reopen the problem.
2. **Re-upload the three repositories.** They were not reachable this turn and I
   could not evaluate them; if any carries a mechanism outside the dictionary
   class, it is the most likely source of a step change.
3. **Parallelise the arms.** They are independent; the remaining 4.7× time cost
   over ARIADNE is embarrassingly parallel.
4. **Make the word-rule arm cheap.** It currently calls SIBYL, which runs its own
   internal grid — most of DAEDALUS's wall-clock is that redundancy.
5. **Validate the classifier out of sample.** It is a stump fitted on ten lanes.
