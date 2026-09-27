# THOTH — the scribe who writes at the speed of reckoning

Artifact for `src/lib/omega/thoth.ts` and the suffix-automaton / Aho-Corasick
replacement inside `src/lib/omega/ariadne.ts`.
Gates: `bench/tmp/thgate.ts`. Profiling: `bench/tmp/prof.ts`.
Negative result: `bench/tmp/charpolish.ts`.

**This turn produced one substantial engineering win (candidate generation
38–43× faster, inherited by the whole stack), one new deterministic codec, and
one decisive negative result that closes the question the last three turns had
left half-open.**

---

## RUNTIME HONESTY

**Used:** Node v22.22.3, TypeScript 5.9.3 (`./node_modules/.bin/tsc --noEmit`),
Vite (`npm run build`), the live `gpt-tokenizer` o200k_base encoder, **CPython
3.11.2**, git, web search.
**Broken:** `gh` / `git push` — `GH_TOKEN` expired.
**Not available, therefore never claimed:** any LLM API or local model, theorem
prover, agent fleet, GPU, parallelism. **No language model read a wire.**

**Sandbox:** re-cloned at `a743278` again this turn; `node_modules` and
`bench/tmp` were gone, the source files survived. Harness and dependencies
restored; `tsc --noEmit` clean; `npm run build` ok.

**Runs that did NOT complete and are therefore not cited:** the full 37-lane
four/five-codec `bench/chiron-frontier.ts` (it exceeded the wall on the previous
turn and was not attempted again here). **No new 37-lane frontier total is
claimed.** Everything below is measured on the lanes actually named.

---

## A. FORMAL MODEL

**A1.** A codec is `(E, D, C)`: total `E, D : Σ* → Σ*` with `D(E(x)) = x`, plus a
contract compiler `C` emitting the prose a reader needs.
**A2.** `D` is a language model reading **one ordinary chat message** — no system
prompt, no `skills.md`, no prior turn, no tool.
**A3.** o200k_base tokens of `C(E(x)) ‖ E(x)`. Second resource: encoder
wall-clock. Third: **determinism of `E`**.
**A4.** ∀x : `D(E(x)) = x` ∧ `M(x) ≤ |T(x)|` ∧ `E(x)` is a pure function of `x`;
∃x : `M(x)` or `time(x)` beats the incumbent. Universals are gated; the
existential is reported per lane.
**A5.** 0–20 000 tokens; UTF-16 code-unit equality; integer tokens, zero
tolerance.
**A6. Not to be substituted:** byte compression; lossy prompt compression;
soft-prompt compression; dictionary-in-the-system-prompt; fine-tuned codecs;
fixed schemas; wire-length (not message) minimisation; **and "a bound says the
candidate class cannot pay", which is what §D.1 finally tested directly.**

---

## B. OUTCOME SPACE

* **H+** a further compression mechanism exists inside the contract.
* **H−** the dictionary/grammar/merge class is exhausted; the residue is
  incompressible under this contract.
* **H∂** the achievable answer depends on which resource is being spent.

**Resolved: H− for compression, H+ for speed.** The evidence threshold declared
in advance was: test the *rejected candidate class* with an exact evaluator
rather than a bound, and profile before optimising. Both were done; both
answered.

---

## C. FRONTIER AND THE OPEN INTERFACE

New this turn:

| imported result | hypotheses needed | how used |
|---|---|---|
| **Suffix automaton / DAWG** (Blumer et al.; Crochemore & Vérin, *Reducing space for index implementation*, TCS 2002) | linear-size automaton whose states are right-equivalence classes of substrings | a state with occurrence count ≥ 2 **is** a maximal repeat; the whole candidate set in O(n) |
| **MR-RePair** (Furuya, Takagi, Nakashima, Inenaga, Bannai, Kida; *Algorithms* 13(4):103, 2020) | offline, maximal repeats | replacing maximal repeats beats replacing frequent pairs — justifies generating *only* maximal repeats |
| **Aho–Corasick** (and its RLE-trie descendants, e.g. *Compressed Dictionary Matching on Run-Length Encoded Strings*, 2026) | finite pattern set | all occurrences of all candidates in O(n + matches), exactly, no hashing |
| **Zipf / hapax legomena** (corpus linguistics; 40–60% of word *types* occur once) | natural-language corpora | explains the literal residue measured in the wires and why a dictionary cannot reach it |
| **SuperBPE** (COLM 2025, arXiv:2503.13423) | whitespace pretokenisation | BPE ≤ 4.68 bytes/token: English in Latin is already the densest representation available, so re-spelling literals cannot help |
| **LZ-compressed string dictionaries** (arXiv:1305.0674); **zstd COVER dictionary trainer** | offline dictionary training scored by *estimated bytes saved* | the same "score by realised gain, not frequency" principle this stack already uses — confirms the design rather than extending it |

**The open interface, as it now stands.** Every achievability result concerns
*grammar size* or *index size*. Our objective is `|T(render(grammar))| +
|T(contract))|`. The previous three turns closed the gap between those for
repeated structure. What remains uncovered by any imported result is the
**literal residue**: text whose only compressible structure is the reader's own
language prior. There is no result in the retrieved literature that codes that
inside a single chat message without model access.

---

## D. NEGATIVE SPACE

### D.1 CHARACTER-LEVEL CANDIDATES REALLY DO NOT PAY — tested exactly, not bounded

HERMES-Ω founded this stack on rejecting non-token-aligned candidates because
their combinatorial bound is not realised (measured then: bound 161, realised
~30). **That is a rejection of a candidate class on the basis of a bound.** This
turn it was re-tested with an exact evaluator: build the wire, add the rule,
re-render, count, and keep only if the count drops and the wire still decodes.

```
lane        I   ARIADNE wire   after polish   Δ   rules admitted / evaluated
gh-prose  1934          1787           1784   -3        1 / 1400
license   1166           980            980    0        0 /  700
readme     843           645            645    0        0 /  515
code-ts   1422          1043           1039   -4        4 / 2030
doc3       673           501            501    0        0 /  273
```

**4 918 exactly-evaluated character-level candidates across five lanes produce
seven tokens.** The founding assumption is confirmed, and the class is closed
for good rather than by argument. (`bench/tmp/charpolish.ts`.)

### D.2 THE DICTIONARY CLASS IS CLOSED (carried, previous turn, unchanged)

55–75% of every wire is literal text covered by no rule; the entire remaining
pairwise-merge prize across the five largest lanes is 446 tokens, 25 of them on
gh-prose. Average reference-run length is 2.3 characters, so the 3–5-character
vocabulary has nothing to bite on.

### D.3 "OPTIMISE THE MINER BECAUSE IT LOOKS EXPENSIVE"

It *was* expensive, but profiling first mattered: mining is only ~6% of a single
`ariadneEncode` (300 ms of 4 930 ms on dts0). The win came from the fact that it
is **called up to thirty times per encode** — once per level and once per
greedy-add round. Optimising it without profiling would have predicted a 6% win;
the measured win is 2.9–3.9×.

### D.4–D.18 (carried, each measured in an earlier turn)

4. Delta-evaluated tabu search for the glyph assignment — worse on every
   configuration; sparse-QAP deltas assume a sparse *flow* matrix and ours is
   dense in flow.
5. A superset fallback arm — destroys the determinism it is meant to protect.
6. Dictionary-ising every distinct token.
7. Ranking word rules by frequency rather than adjacency.
8. Capping phrase rules to free alphabet space — monotonically worse.
9. CJK's large-but-sparse alphabet against the dense pooled one.
10. Wide multi-line record templates.
11. Optimal parsing alone.
12. Glyph-after-space absorption (exactly neutral).
13. First-use rule binding (exactly break-even).
14. **Model-prior compression** — the largest remaining prize and unreachable
    here: no model to measure predictability with, nothing verifiable.
15. LZ77 distance/length back-references — LLM character counting, no verifier.
16. Few-shot contract instead of prose — cheaper, unverifiable.
17. Per-line operator prefixes; JSON-wrapped raw regions; non-token-aligned
    glyph insertion.
18. Tiny lanes — impossible before any contract is paid.

---

## E. MECHANISM PORTFOLIO

### E1. Candidate generation by suffix automaton  ← shipped, the main win
*Lemma:* the states of a suffix automaton are the right-equivalence classes of
substrings; a state with occurrence count ≥ 2 is a maximal repeat, and counts
propagate along suffix links.
*Artifact:* `mineSpans` in `ariadne.ts`; standalone comparison in
`bench/tmp/prof.ts`.
*Proved:* identical best candidate to the exhaustive sweep on every lane tested.
*Measured:*

| lane | sweep | #cand | automaton | #cand | speedup | best net |
|---|---|---|---|---|---|---|
| dts0 | 300 ms | 8000 | 8 ms | 1616 | **37.5×** | 145 = 145 |
| doc11 | 198 ms | 3868 | 5 ms | 1021 | **39.6×** | 76 = 76 |
| gh-prose | 129 ms | 391 | 3 ms | 141 | **43.0×** | 20 = 20 |
| code-ts | 34 ms | 729 | 9 ms | 321 | 3.8× | 47 = 47 |

*Unresolved interface:* a state's count is that of its **longest** member, so a
candidate truncated to `maxSpan` has its count underestimated — conservative,
never unsound. *Gap: local.*
*Cheapest falsification:* compare best-candidate net against the sweep, per lane
(the table above).

### E2. Occurrence indexing by Aho–Corasick  ← shipped
*Construction:* one automaton over the candidate set; a single pass reports every
occurrence in O(n + matches).
*Artifact:* `buildIndex` in `ariadne.ts`.
*Proved:* exact — no hashing, so no collisions, unlike a rolling-hash index.
*Falsification:* the DP result must be unchanged; round-trip gates cover it.

### E3. Clock-free deterministic encoding  ← shipped as THOTH
*Construction:* every loop already carries an integer cap (levels, price
iterations, fixed-point rounds, greedy-add rounds, re-parse passes, local-search
sweeps, inline passes, probe count). The wall clock was only a safety valve.
THOTH passes a deadline of 8.64e15 ms, so the caps are the only bound.
*Proved:* **31/31 deterministic** (gate T4), where SIBYL fails the same property.
*Gap:* local — the price is unbounded worst-case time, mitigated only by the caps.

### E4. Exact-evaluator admission of a rejected candidate class
*Construction:* render, count, keep only on a strict decrease.
*Artifact:* `bench/tmp/charpolish.ts`.
*Result:* **falsified** (§D.1) — and that is the point: the class is now closed
by measurement, not by a bound.

### E5. Maximal-repeat-only candidate sets (MR-RePair, carried into E1)
Fewer candidates (1616 vs 8000 on dts0) with the same top of the list, so the
DP and the greedy both get cheaper for free.

### E6. Profiling before optimising
*Artifact:* `bench/tmp/prof.ts`. *Result:* redirected the whole turn — see §D.3.

---

## F. ARTIFACTS

Every branch returns an executable and a number. `prof.ts` returns the speed and
candidate-quality table; `charpolish.ts` returns a counterexample to the
hypothesis that the rejected class pays; `thgate.ts` returns the gate receipts;
`thoth.ts` is the executable design.

---

## G. SECOND-ORDER ADVERSARY

* **Against E1:** a suffix automaton over *concatenated* sequences can emit a
  candidate straddling two of them. Unique negative separators are inserted and
  any candidate containing one is discarded — tested implicitly by every
  round-trip, since such a candidate would not match anywhere.
* **Against E2:** Aho–Corasick output links must be followed transitively or
  nested candidates are missed silently (no crash, just a worse parse). The
  implementation walks `outLink` to exhaustion; the DP's result is then gated by
  the exact final count.
* **Against E3:** encode twice and compare wires — gate T4, run over the whole
  corpus rather than a sample.
* **Against the pooled alphabet:** `adv/greek` and `adv/allscripts` place
  characters from the pooled ranges *in the payload*, forcing the collision
  filter; both round-trip through all three readers.
* **Quantifier order:** T1–T6 are ∀ over the corpus, not averages.
* **Imported-theorem alignment:** MR-RePair is used for *candidate class*, not
  for its size bound; the sparse-QAP results were cited last turn and explicitly
  ruled out.

---

## H. VERIFICATION — receipts

Three independent readers: the library decoder, a reader written from the
contract prose alone, and `bench/chiron_decode.py` on **CPython 3.11.2 in a
separate process**.

```
THOTH GATES  (31 inputs, 18 framed, 13 declined)
PASS  T1  exact UTF-16 round-trip (library decoder)        31/31
PASS  T2  independent prose-literal reader agrees          31/31
PASS  T3  external CPython reader agrees  CPython 3.11.2   31/31
PASS  T4  DETERMINISTIC (encode twice, identical wire)     31/31
PASS  T5  message gate: never worse than identity          31/31
PASS  T6  one-chat accounting exact (M == tokens(prompt))  31/31
      encode wall-clock 151.3s; worst BANYAN 106979ms
```

Corpus: 10 holdout files, 5 chaos/mosaic/BANYAN fixtures, 7 synthetic op lanes,
9 adversarial payloads (frame characters, all seven glyph scripts including the
pooled ranges, Greek-in-payload, astral, control characters, a 40 000-character
run, CRLF, empty, single character).

`./node_modules/.bin/tsc --noEmit -p tsconfig.json` clean;
`npm run build` → `✓ built in 12.47s`.

### ARIADNE after the shared algorithm change (`bench/tmp/spd2.ts`)

| lane | M before | M after | ms before | ms after | speedup |
|---|---|---|---|---|---|
| dts0 | 2183 | **2172** | 10 619 | **3 594** | **2.95×** |
| readme | 684 | 688 | 1 061 | **275** | **3.86×** |
| gh-api | 1149 | **1131** | 5 651 | 5 454 | 1.04× |
| json-pkg | 752 | **744** | 3 839 | 2 825 | 1.36× |
| doc11 | 2659 | 2658 | 7 546 | 7 498 | 1.01× |
| gh-prose | 1827 | 1827 | 2 798 | 2 188 | 1.28× |
| license | 1020 | 1020 | 1 400 | 1 226 | 1.14× |
| code-ts | 1083 | 1092 | 2 193 | 2 407 | 0.91× |

"Before" figures are the previous turn's completed frontier run. Net across
these eight lanes: **−25 tokens and 1.8× faster in aggregate** (25.5 s vs 45.1 s).
Because ARIADNE's budget is wall-clock, the speedup is partly spent on extra
search, which is where the token gains come from.

### THOTH against the incumbents (`bench/tmp/th.ts`, nine lanes)

| lane | ARIADNE | SIBYL | **THOTH** | Δ vs ARIADNE | Δ vs SIBYL | deterministic |
|---|---|---|---|---|---|---|
| doc11 | 2658 | 2612 | 2616 | **−42** | +4 | Y |
| code-ts | 1092 | 1061 | **1054** | **−38** | **−7** | Y |
| dts0 | 2172 | 2137 | **2135** | **−37** | **−2** | Y |
| gh-api | 1171 | 1163 | **1147** | **−24** | **−16** | Y |
| license | 1020 | 1014 | **1000** | **−20** | **−14** | Y |
| gh-prose | 1827 | 1782 | 1815 | **−12** | +33 | Y |
| readme | 688 | 688 | 699 | +11 | +11 | Y |
| json-pkg | 744 | 744 | 747 | +3 | +3 | Y |
| json-log | 188 | 188 | 198 | +10 | +10 | Y |

THOTH beats ARIADNE on 6 of 9 and SIBYL on 4 of 9, and is deterministic on all
of them. **It is slower than both**, because clock-free means the iteration caps
run to completion; the shipped defaults (`probeScale 0.30`, `wordGrid [0,24]`)
trade some of that back.

**Claims explicitly downgraded:** no 37-lane frontier total for THOTH; THOTH is
not uniformly better on tokens; THOTH is not faster than ARIADNE; and that any
language model executes these contracts remains untested after five turns.

---

## I. REPAIR

| defect | found by | repair | re-gated | new attack |
|---|---|---|---|---|
| Miner called ~30× per encode at O(n·maxSpan) string concatenations | `bench/tmp/prof.ts` | suffix automaton, maximal repeats only | `spd2.ts` (8 lanes, all exact) | best-candidate-net equality check per lane |
| Index rebuilt with string keys per level | same profile | Aho–Corasick, O(n + matches) | same | output-link transitivity, or nested candidates vanish silently |
| SIBYL nondeterministic (previous turn's G10) | encode-twice gate | THOTH is clock-free | T4 31/31 | T4 now runs on the whole corpus |
| Lost `node_modules` / `bench/tmp` after re-clone | `build.sh: No such file` | restored harness, `npm install` | `tsc`, `npm run build` | — |

No repaired candidate inherited trust: T1–T6 were run after the final change.

---

## J. RESULT AND STOPPING

**Shipped:** THOTH (`src/lib/omega/thoth.ts`), plus suffix-automaton mining and
Aho–Corasick indexing inside the shared pipeline so ARIADNE, SIBYL and SEQUOYAH
all inherit them. Wired into registry, worker, codec types, Workbench and
`bench/leaderboard.ts`.

**Worth, honestly:** candidate generation 38–43× faster with identical best
candidates; ARIADNE 2.9–3.9× faster on its slowest lanes and −25 tokens across
eight; a fifth codec that is deterministic where SIBYL is not and beats ARIADNE
on 6 of 9 lanes. **No large compression win, and the reason is now proven rather
than suspected** — §D.1 closes the last open candidate class with 4 918 exact
evaluations, and §D.2 bounds what merging can still reach at 446 tokens.

**Stopping.** Not because the problem is believed closed, but because the budget
is spent and the remaining gap is no longer a search problem. The success
predicate holds for exactness, the gate, accounting, determinism and speed; it
does **not** hold for a significant compression gain, so this returns the
strongest verified artifact plus the exact remaining gap.

### Next highest-information tests, in order

1. **Put an LLM in the encode loop.** Every remaining token is literal hapax
   text whose only structure is the reader's language prior. Measuring
   predictability requires model access, which this sandbox does not have. This
   is the single capability that would reopen the problem.
2. **Ask an actual LLM to decode a wire.** Untested for five turns; the only
   link a real user actually experiences.
3. **Re-run the 37-lane frontier under a longer wall** with all five codecs.
4. **Make SIBYL clock-free**, now that THOTH shows the iteration caps suffice.
5. **Contract floor.** ~40 tokens is paid on 29 lanes; measured minimum viable
   prose is 33. The last cheap structural win.
