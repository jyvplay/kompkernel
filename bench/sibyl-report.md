# SIBYL — the rule class every grammar compressor proves is worthless

Research artifact for `src/lib/omega/sibyl.ts`.
Gates: `bench/chiron-redteam.ts` (three encoders, three readers).
Frontier: `bench/chiron-frontier.ts`. Third reader: `bench/chiron_decode.py`.

**Headline: the frontier moves 35 755 → 30 462 tokens (−14.80%), from −13.79%
after ARIADNE. SIBYL beats ARIADNE on 13/37 lanes and loses on 0, at 7.3× the
wall-clock. It passes 12 of 14 gates; the two failures are reported below and
the affected claims are downgraded, not hidden.**

---

## RUNTIME HONESTY

**Used:** Node v22.22.3, `tsc --noEmit`, Vite (`npm run build`), the live
`gpt-tokenizer` o200k_base encoder, **CPython 3.11.2**, git, web search.
**Available, broken:** `gh` / `git push` — the `GH_TOKEN` is expired.
**Not available, therefore never claimed:** any LLM API or local model, any
theorem prover, any agent fleet, any GPU, any parallelism. **No language model
read a wire in this work.** Every verification here is one program agreeing with
another program.

Tool calls that produced these numbers: `bench/tmp/word.ts`, `bench/tmp/cap.ts`,
`bench/tmp/cap2.ts`, `bench/tmp/poly.ts`, `bench/tmp/sb.ts`, `bench/tmp/det.ts`,
`bench/tmp/det2.ts`, `bench/tmp/rm.ts`, `bench/tmp/ceil.ts`,
`bench/chiron-frontier.ts`, `bench/chiron-redteam.ts`.

---

## A. FORMAL MODEL

**A1. Admissible objects.** A codec is `(E, D, C)` with `E, D : Σ* → Σ*` total,
`D(E(x)) = x` for all `x`, and `C` a contract compiler mapping a wire to the
prose a reader needs.

**A2. Access model.** `D` is a language model reading **one ordinary chat
message**: no system prompt, no `skills.md`, no prior turn, no tool, no
retrieval. The message is exactly `C(E(x)) ‖ E(x)`.

**A3. Resource.** o200k_base tokens of that whole string,
`M(x) = |T(C(E(x)) ‖ E(x))|`. Wire-only counts are diagnostic and never the
objective. Encoder wall-clock is a second, reported resource.

**A4. Success predicate, quantifiers explicit.**
∀x ∈ L : `D(E(x)) = x` **and** `M(x) ≤ |T(x)|`;
∃x ∈ L : `M_SIBYL(x) < min(|T(x)|, M_Ω, M_F, M_C, M_ARIADNE)(x) − k` for k "more
than a few".
Exactness and no-regression are universal; improvement is existential and
reported per lane. **SIBYL additionally satisfies ∀x : M_SIBYL(x) ≤ M_ARIADNE(x)
by construction** (§E6).

**A5. Regime.** 0–20 000 tokens. Units: tokens, integers, zero tolerance.
Equality is UTF-16 code-unit equality. Wall-clock in ms, single-threaded.

**A6. Adjacent problems not to substitute.** Byte compression (gzip/xz win and
cannot be read in a chat message); lossy prompt compression; soft-prompt
compression; dictionary-in-the-system-prompt (arXiv:2604.13066); fine-tuned
codecs (LTSC); fixed synthetic schemas; **and wire-length minimisation**, which
is not the objective and cost ARIADNE two lanes last turn.

---

## B. OUTCOME SPACE

* **H+** a rule class exists that the literature excludes by proof and that pays
  here.
* **H−** ARIADNE is at the mechanism limit; only leaving the contract helps.
* **H∂** it depends on reference density: mechanisms that only pay through
  merging need adjacency, which some lanes have and some do not.

**Resolved: H+ with an H∂ boundary.** Threshold declared in advance: a measured
mechanism (not argued), exactness through three independent readers, and no lane
regressed. All three met. The boundary is measured in §D.

---

## C. FRONTIER AND THE EXACT OPEN INTERFACE

| imported result | hypotheses needed | use |
|---|---|---|
| **Smallest grammar is NP-hard, no constant-factor approximation** (Charikar–Lehman–Liu–Panigrahy–Prabhakaran–Sahai–Shelat, STOC 2002 / IEEE TIT 51(7) 2005) | arbitrary alphabet, exact CFG for one string | no optimality claimed |
| **Re-Pair lower bound Ω(log n / log log n)** | binary alphabet family | greedy is known-suboptimal |
| **MR-RePair** (Furuya et al., *Algorithms* 13(4):103, 2020) | maximal repeats, offline | span mining, not bigram mining |
| **Gańczorz–Jeż** (DCC 2017) | LZ77 factorisation | never cross a BPE token border |
| **Two-part MDL / invariance** (Grünwald, CWI; arXiv:2509.22445) | finite data, fixed language | the contract is `L(model)` in the same units |
| **Koopmans–Beckmann QAP, keyboard-layout instance** `min_φ Σ t_kl f_{φ(k)φ(l)}` (van Vliet 2009; Gevezes–Pitsoulis, *Optim. Lett.* 2011) | pairwise objective, permutation feasible set | glyph assignment is exactly this; GRASP/iterated-greedy is the standard heuristic |
| **Optimal parsing in LZ coders** (zstd repcodes + FSE; brotli; `ulz -cu`) | fixed dictionary, additive cost | fix dictionary → shortest path → reprice |
| **SuperBPE** (COLM 2025, arXiv:2503.13423) | whitespace pretokenisation | BPE ≤ 4.68 bytes/token: the prose wall |

**The open interface, stated precisely.** Every achievability result bounds
*grammar size in symbols*. Every impossibility result bounds *approximation
ratio to the smallest grammar*. Neither speaks about the quantity actually paid,
`|T(render(grammar))| + |T(contract)|`, which depends on the **spelling** of the
grammar. The classical filter "rules must span ≥ 2 symbols" is a theorem about
symbol counts and is **false about token counts**, because a reference's cost is
not 1 when references are adjacent. SIBYL lives in that gap.

---

## D. NEGATIVE SPACE — 18 shapes, each measured this turn unless marked

1. **Dictionary-ising every distinct token.** For `dts0` (625 distinct) the tape
   alone costs ~1250 tokens against a 3991-token identity; total 3246 at density
   0.5, versus ARIADNE's 2183. The sweet spot is partial, and it is small:
   measured optimum 24–48 word rules on every lane tested.
2. **Ranking word rules by frequency.** Promotes common-but-isolated tokens and
   wastes both alphabet and tape. Replaced by adjacency ranking (§E2); measured
   `gh-prose` −27 → −39 from the change alone.
3. **Capping phrase rules to make alphabet room for words.** Measured on four
   lanes at caps 90/60/40/20: **always worse**, monotonically
   (`dts0` 2169 → 2231 → 2331 → 2438 → 2624).
4. **English prose beyond the wall.** `gh-prose` optimal parse with a *free*
   dictionary is 1415 against 1934 identity; charge the dictionary and it exceeds
   identity. 28.5% of its positions sit in a repeated bigram vs 82.9% for `dts0`.
   SIBYL gets it to 1793 — the remaining 378 tokens are not reachable by any
   dictionary mechanism.
5. **CJK as the big alphabet.** 2517 characters but only 2403 pair edges
   (density 0.04%) — ten times sparser than the pooled alphabet. Measured: `dts0`
   with 110 word rules on CJK is *worse* than with 48 on polyglot.
6. **Wide multi-line record templates** (prior turn): real JSON arrays have
   variable-length records; best wide block on `gh-api.json` gains 35, `json-pkg`
   −14.
7. **Optimal parsing alone** (prior turn): worse (2925 vs 2193) though 30×
   faster.
8. **Glyph-after-space absorption** (prior turn): exactly neutral.
9. **First-use rule binding** (prior turn): exactly break-even.
10. **Model-prior compression.** The largest theoretical prize and **unreachable
    in this sandbox** — no model to measure predictability with, and nothing
    could be verified. Not attempted, not claimed.
11. **LZ77-style distance/length back-references.** Character counting over
    kilobytes is an LLM's weakest operation and there is no behavioural verifier
    here. Downgraded.
12. **Few-shot contract instead of a prose clause.** Cheaper in tokens; its
    correctness is a model-behaviour claim with no verifier. Not shipped.
13. **Per-line operator prefixes** (prior turn): ~1 token/line.
14. **JSON-wrapped raw regions** (prior turn): +181…+202 tokens.
15. **Non-token-aligned candidates** (prior turn): doubles a 12-token sentence.
16. **Tiny lanes.** `MOSAIC_HANDTRACE_300`: free dictionary + optimal parse
    totals 107 against identity 118 — 11 tokens of headroom before any contract.
    `md-vite` 292 vs 274. Impossible, not untried.
17. **Letting the pooled alphabet leak into ARIADNE.** It would improve ARIADNE
    too and make the attribution meaningless; ARIADNE is held at its committed
    behaviour by an explicit `allowPolyglot` flag so the comparison is clean.
18. **Trusting a coarse ranking pass.** SIBYL's first version ranked
    configurations at 7% probe budget and then refined only the top two —
    and shipped a wire 21 tokens worse than ARIADNE on `gh-api.json`. §I.

---

## E. MECHANISM PORTFOLIO

### E1. Single-token rule admission ← the new idea
* **Lemma it violates.** "A rule whose expansion is one token costs 1 + 1 and
  saves 0 per use." True iff a reference costs one token. A maximal run of
  adjacent references is one pre-tokenizer chunk, so BPE merges inside it;
  therefore false.
* **Artifact.** `addWordRules` + the exact-render selection; `bench/tmp/word.ts`.
* **Proved portion.** These rules raise the symbol-space cost by exactly +2 each
  and lower it by exactly 0, so they can only ever be admitted by measurement —
  which is why no symbol-space search can find them.
* **Standalone evidence** (no grammar at all, top-K single tokens only):

  | lane | identity | K | script | total | vs identity |
  |---|---|---|---|---|---|
  | dts0 | 3991 | 110 | cyrillic | 3103 | **−888** |
  | doc11 | 3677 | 64 | cyrillic | 3250 | **−427** |
  | license | 1166 | 32 | cyrillic | 1017 | **−149** |
  | gh-prose | 1934 | 64 | cyrillic | 1870 | −64 |

* **Unresolved interface.** On top of a strong phrase grammar most of the
  frequency mass is already absorbed, so the marginal value falls to 24–48 rules
  worth 385 tokens across 14 lanes. **Gap: local.**
* **Cheapest falsification.** `noWords: true` reduces SIBYL to ARIADNE; the
  frontier `Δsib` column is the difference.

### E2. Adjacency ranking for word rules
* **Construction.** Score a literal symbol by how many of its positions sit
  beside something already a reference (or beside another copy of itself),
  re-scored greedily in batches of 8.
* **Artifact.** `rankByRunPotential`. **Falsification:** swap back to frequency
  ranking. **Gap: local.**

### E3. The pooled ("polyglot") alphabet
* **Construction.** Fourteen scripts — Greek, Hebrew, Armenian, Georgian, Thai
  and nine Indic — whose Unicode ranges are **disjoint from every single-script
  entry already in the wire language**, pooled into one alphabet. The first tape
  character therefore still identifies the alphabet unambiguously and no
  existing wire changes meaning.
* **Measured** (`bench/tmp/poly.ts`, full-vocabulary scan):

  | alphabet | 1-char | 2-char | 3-char | 4-char | 5-char |
  |---|---|---|---|---|---|
  | hangul | 679 | 389 | 41 | 12 | 2 |
  | cyrillic | 122 | 823 | 1733 | 935 | 422 |
  | cjk | 2517 | 2403 | 354 | 298 | 43 |
  | **polyglot** | **802** | **3419** | **3119** | **1439** | **404** |

  Both large and dense — the combination no single script offers.
* **Effect.** `dts0` assignment gain 98 (hangul) → 131 (polyglot) with no other
  change; with word rules, 218. **Gap: local.**

### E4. Run-spelling construction
* **Construction.** Place a whole run of 2–6 references onto one multi-character
  vocabulary token, most-valuable-pattern first, conflict-free by construction.
* **Artifact.** the run-spelling block in `renderBest`.
* **Result: NEGATIVE on ARIADNE-sized grammars** — identical output, because the
  targeted hill-climb already reaches at least as good a solution when reference
  density is low. Kept because it is free and becomes active at SIBYL's higher
  densities. Reported as a null result, not as a feature.

### E5. n-gram targeted assignment move
* **Construction.** Force a hot run of 3–5 references onto a real n-character
  single token, rather than only forcing pairs onto edges. **Gap: local.**

### E6. Superset selection (the anti-regression mechanism)
* **Construction.** SIBYL runs ARIADNE and takes its result whenever it wins.
* **Proved portion.** `M_SIBYL ≤ M_ARIADNE` by construction, subject only to
  ARIADNE's own reproducibility.
* **Why it exists.** Arms share one wall-clock envelope; an arm scheduled late
  gets a worse assignment. A codec that can lose to the codec it extends is not
  an improvement, and "usually better" is not a property you can gate on.
  **Frontier: loses on 0/37.**

---

## F. ARTIFACTS

Each branch returns an executable and a number. The rejected branches return
counterexamples: `bench/tmp/cap.ts` prints the monotone loss from capping phrase
rules; `bench/tmp/word.ts` prints the standalone single-token table; E4 returns a
null result with identical output on six lanes.

---

## G. SECOND-ORDER ADVERSARY

* **Against E1/E3:** payloads containing characters from all fourteen pooled
  scripts, forcing the alphabet below the rule count; `CHAOS_G_CJK`,
  `hangul-payload`, `all-scripts` in gate G8.
* **Against E3 specifically:** the pooled ranges must be disjoint from every
  pre-existing script or an old wire changes meaning. Verified by construction
  (Georgian 0x10A0–0x10FF vs Myanmar 0x1000–0x109F) and by G1–G3 passing on all
  282 encodes including every CHIRON and ARIADNE wire.
* **Against E6:** if ARIADNE itself is nondeterministic the superset guarantee is
  only probabilistic — G10 measures exactly this and reports `ariadne=0`.
* **Quantifier-order attack:** G6 is ∀, not average. The frontier reports
  per-lane losses, and "loses on 0" is the claim.
* **Vacuous-gate attack:** last turn G7 silently matched zero payloads and still
  printed PASS. It now asserts its own cardinality (120/120). This is the failure
  Mathlib's *Comparator* exists to catch in the 2026 Lean results.
* **The attack that landed this turn:** G10. See §I.

---

## H. VERIFICATION, WITH RECEIPTS

Three independent readers, two languages, two processes — library TypeScript, a
reader written from the contract prose alone, and CPython in a separate process.
All three were extended with the pooled alphabet.

```
CHIRON / ARIADNE / SIBYL RED TEAM
encode wall-clock: chiron=160.9s  ariadne=182.6s  sibyl=567.4s
PASS  G1   exact UTF-16 round-trip (library decoder)          282/282
PASS  G2   independent prompt-literal reader agrees           282/282
PASS  G3   external CPython reader agrees   CPython 3.11.2:   279/279
                                            (3 skipped: lone surrogates)
PASS  G4   decoder total; malformed frames return input       132 probes
PASS  G5   one-chat accounting exact; no unused clause        282 messages
PASS  G6   framed output never costs more than identity       224 framed, 0 violations
PASS  G7   adversarial payloads through both readers          120/120
PASS  G8   second-order adversary                             54 attacks, 3 encoders
PASS  G9   structured fuzz                                    1200/1200
FAIL  G10  every encoder is deterministic                     chiron=0, ariadne=0,
                                                              sibyl=1 (gh-prose)
PASS  G11  non-wires decode to themselves                     7 probes
FAIL  G12  speed budget (no lane over 30s)                    worst ariadne:pkg6 35.7s
PASS  G13  glyph assignment sound and never harmful           372 tokens, 0 contract cost
PASS  G14  symbol-space estimate tracks exact count           worst drift 8.93%
12/14 gates passed
```

`npx tsc --noEmit` clean. `npm run build` → `✓ built in 11.24s`.

### The two failures, stated plainly

**G10 — SIBYL is not fully deterministic.** On 1 of 12 sampled lanes
(`holdout/gh-prose.txt`) two consecutive encodes produce different wires. Cause:
the **grammar** phase is bounded by wall-clock, so a truncated search depends on
machine load. This turn I converted the *assignment* phase from a clock bound to
a work bound (probe count) and added a budget floor so the grammar phase is not
starved; both reduced the failure from 2 lanes to 1 but did not eliminate it.
**The determinism claim for SIBYL is downgraded: CHIRON and ARIADNE are
deterministic; SIBYL is not.** Correctness is unaffected — G1/G2/G3 pass on every
encode — but reproducibility of the *chosen* wire is not established. The fix is
to replace every `Date.now() < deadline` in the grammar loops with a work
counter; it is the first item in §J.

**G12 — one lane exceeded the 30 s threshold.** `ariadne:train/pkg6.txt` at
35.7 s, under load from running three codecs over 282 inputs in one process.
SIBYL's own worst lane is inside budget, but SIBYL is **7.28× ARIADNE's total
wall-clock** on the frontier (588 s vs 81 s). That is a genuine Pareto cost and
is reported as such rather than buried: SIBYL buys 1.25% of tokens with 7× of
time, and ARIADNE remains the speed choice.

---

## I. REPAIR — every patch re-gated, with a new attack per patch

| defect | how found | repair | re-measured | new attack |
|---|---|---|---|---|
| ARIADNE fell back to identity on `readme` whenever the block pre-pass ranked `\n` first | SIBYL beat ARIADNE by 159 on a lane it should have tied | never give up on one separator; fall through to the others | 843 → 684 | separator fallback exercised by the frontier |
| Word rules ranked by frequency | modest gains | adjacency ranking | `gh-prose` −27 → −39 | — |
| Assignment blind to n-grams | Cyrillic's 1896 trigrams unused | targeted n-gram move | part of the −385 | — |
| Alphabet too small **or** too sparse | capping phrase rules always lost | pooled 14-script alphabet | `dts0` asg 98 → 218 | G7 across all scripts; range-disjointness argued and tested |
| **SIBYL shipped a wire worse than ARIADNE** on `gh-api.json` (+21) | frontier `Δsib` column | parity arm scheduled **first**, then superset selection | loses on 0/37 | `Δsib` is now a standing per-lane gate |
| Assignment probe loop bounded by wall-clock | **G10** | converted to a work bound | 2 lanes → 1 | G10 now reports per-codec counts so it cannot be read as a blanket pass |
| Grammar phase starved at small budgets | G10 + `bench/tmp/det.ts` | budget floor | partial | **still failing — not claimed fixed** |

No repaired candidate inherited trust: the full 14-gate suite and the full
37-lane frontier were re-run after the last change.

---

## J. RESULT AND STOPPING

```
HERMES-F total M 51108
CHIRON  total M 31622   wall 122.6s
ARIADNE total M 30847   wall  80.8s
SIBYL   total M 30462   wall 588.2s   (1.25% fewer tokens than ARIADNE, 7.28x its wall-clock)
SIBYL beats ARIADNE on 13/37 lanes, loses on 0
single-token rules admitted on 14 lanes; worth 385 tokens there
frontier total  35755 -> 30462   (14.80% off the previous best-of-stack)
```

Lanes where SIBYL improves on ARIADNE:

| lane | ARIADNE | **SIBYL** | Δ | word rules |
|---|---|---|---|---|
| tr/dts3 | 2238 | **2170** | −68 | 48 |
| tr/dts5 | 2423 | **2364** | −59 | 24 |
| tr/dts0 | 2183 | **2135** | −48 | 48 |
| tr/doc11 | 2659 | **2613** | −46 | 48 |
| ho/gh-prose | 1827 | **1793** | −34 | 24 |
| tr/doc10 | 2646 | **2617** | −29 | 24 |
| tr/dts4 | 2285 | **2257** | −28 | 24 |
| ho/code-ts | 1083 | **1059** | −24 | 24 |
| tr/dts2 | 2183 | **2161** | −22 | 48 |
| ho/license | 1020 | **1009** | −11 | 24 |
| tr/dts1 | 1707 | **1701** | −6 | 24 |
| tr/doc3 | 541 | **536** | −5 | 24 |
| tr/doc8 | 668 | **663** | −5 | 24 |

Against the pre-CHIRON stack, the largest lane wins are BANYAN −540, dts0 −540,
dts4 −423, dts3 −404, doc11 −400, dts5 −238, dts2 −227, dts1 −183, doc10 −176,
code-ts −168, gh-api −162, json-log −159, csv −147, rle −142.

Eight lanes still decline honestly (`lic-mit`, `md-react`, `md-vite`,
`CHAOS_900`, `CHAOS_G_CJK`, `CHAOS_F_LLM_REPORT`, `MOSAIC_HANDTRACE_300`,
`prose`); §D.16 gives the measured reason.

**Stopping.** Not stopped because the problem is believed open — stopped because
the budget is spent. The success predicate holds for compression and exactness;
**two mandatory gates do not pass**, so this is returned as the strongest
verified artifact plus the exact remaining gap, per §J of the protocol.

### Remaining gap and the next highest-information tests

1. **Determinism (G10).** Replace every wall-clock deadline in the grammar loops
   (`buildOn`'s level loop, `greedyAdd`, `reparse`, `localSearch`) with a work
   counter. Mechanical, ~8 call sites, and it also makes the speed profile
   predictable. This is the single blocking defect.
2. **Speed (G12).** SIBYL is 7.3× ARIADNE. Most of it is redundant assignment
   work across arms; caching run-cost across arms that share a grammar prefix
   should remove most of it.
3. **Ask an actual LLM.** Still the only untested link in the entire chain, and
   the only one that matters to a real user.
4. **Adjacency-aware parsing.** Now that adjacency has value, the parse should
   *prefer* placing references next to each other — a second QAP coupled to the
   first.
5. **A better QAP heuristic.** Tabu search or GRASP with path-relinking, a
   drop-in replacement for one function.

---

## CITATIONS NEW TO THIS SYSTEM THIS TURN

* **van Vliet, W.** *Heuristics for the Quadratic Assignment Problem*, University
  of Groningen, 2009 — the Koopmans–Beckmann formulation and, specifically, the
  **keyboard-layout instance** `min_φ Σ t_kl f_{φ(k)φ(l)}`, which is exactly the
  glyph-assignment problem: letter-pair frequency ↔ adjacent-reference frequency,
  key-pair cost ↔ "is this character pair one token". GRASP and iterated greedy
  are the standard heuristics and are what SIBYL implements.
* **Gevezes, T. P. & Pitsoulis, L. S.** *A new greedy algorithm for the quadratic
  assignment problem*, **Optimization Letters** (Springer), 2011 — Greedy-Out
  construction for QAP; the "place the most valuable pattern first, conflict-free"
  shape of the run-spelling construction.
* **Nehi & Gelareh**, *A Survey of Meta-Heuristic Solution Methods for the
  Quadratic Assignment Problem*, Applied Mathematical Sciences, 2007 — the
  taxonomy (GRASP, tabu, SA) that names §J.5.
* **Matt Mahoney, Large Text Compression Benchmark** — `ulz` level `cu` and the
  LZ77 family entries: optimal parsing as a distinct, named lever separate from
  dictionary construction.
* **maskray.me, "Benchmarking compression programs" (2025)** and **Cloudflare,
  "New standards for a faster and more private Internet"** — zstd's three-repcode
  LZ77 plus FSE, and the reformulation of parsing as a priced shortest path,
  which is the shape of ARIADNE's Lagrangian loop that SIBYL inherits.
* **Furuya et al., MR-RePair**, *Algorithms* 13(4):103, 2020 — maximal repeats
  over frequent bigrams.
* **AI-mathematics, August–September 2026** — OpenAI *Astra*'s ten Lean-certified
  results (1 Aug), Anthropic's 13-million-line Lean formalisation of Fermat's Last
  Theorem (5 Sep), and the Navier-Stokes singularity (8 Sep, Quanta). The
  transferable content is not mathematics but **verification discipline**:
  Anthropic ran the Lean kernel, an independently written Rust `nanoda` kernel,
  *and* Mathlib's **Comparator**, which exists to confirm a formal statement is
  not a subtly weaker restatement of the claim. That is precisely the class of
  bug G7 had last turn and G10 has now — and it is why both are reported as
  failures here rather than quietly re-scoped.
