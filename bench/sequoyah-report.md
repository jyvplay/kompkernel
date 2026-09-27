# SEQUOYAH — a clock-free codec, and the measurement that says the merge mechanism is done

Artifact for `src/lib/omega/sequoyah.ts` and the `prepareRuns` / `runCostPrepared`
addition to `src/lib/omega/ariadne.ts`.
Gates: `bench/tmp/seqgate.ts` (three independent readers + determinism).

**This turn produced a small compression result and two large negative results.
Both negatives are reported as first-class findings, because they close off the
direction the previous three turns were travelling in.**

---

## RUNTIME HONESTY

**Used:** Node v22.22.3, TypeScript 5.9.3 (`./node_modules/.bin/tsc --noEmit`),
Vite (`npm run build`), the live `gpt-tokenizer` o200k_base encoder, **CPython
3.11.2**, git, web search.
**Broken:** `gh` / `git push` — `GH_TOKEN` expired.
**Not available, therefore never claimed:** any LLM API or local model, any
theorem prover, any agent fleet, any GPU, any parallelism. **No language model
read a wire in this work.**

**Sandbox note, stated because it affects what is reproducible:** the workspace
was re-cloned at `a743278` this turn and the git history of the previous three
turns was lost. The source files survived as untracked files; `npm install` was
re-run; `tsc --noEmit` and `npm run build` both pass. The previous turns' commits
are therefore re-committed here alongside SEQUOYAH.

**Runs that did NOT complete, and are therefore not cited:** the full 37-lane
`bench/chiron-frontier.ts` with four codecs exceeded a 28-minute wall twice, and
the 14-gate `bench/chiron-redteam.ts` was not re-run this turn. No frontier
number is claimed for SEQUOYAH across all 37 lanes. What is claimed is measured
on the lanes actually run, listed below.

---

## A. FORMAL MODEL

**A1.** A codec is `(E, D, C)`: `E, D : Σ* → Σ*` total, `D(E(x)) = x`, and a
contract compiler `C` producing the prose a reader needs.
**A2.** `D` is a language model reading **one ordinary chat message** — no system
prompt, no `skills.md`, no prior turn, no tool. The message is `C(E(x)) ‖ E(x)`.
**A3.** o200k_base tokens of that whole string, `M(x)`. Encoder wall-clock is a
second reported resource. **Determinism of `E` is a third**, and this turn it is
the one that moved.
**A4.** ∀x : `D(E(x)) = x` ∧ `M(x) ≤ |T(x)|` ∧ **`E(x)` is a pure function of x**;
∃x : `M(x)` beats the incumbent stack. The universal clauses are the gates; the
existential is reported per lane.
**A5.** 0–20 000 tokens; UTF-16 code-unit equality; integer tokens, no tolerance.
**A6.** Not to be substituted: byte compression; lossy prompt compression;
soft-prompt compression; dictionary-in-the-system-prompt; fine-tuned codecs;
fixed schemas; **wire-length minimisation** (the objective is the message);
and **"usually deterministic"**, which is not determinism.

---

## B. OUTCOME SPACE

* **H+** another mechanism exists with meaningful compression headroom.
* **H−** the merge/dictionary mechanism class is exhausted and the residue is
  incompressible under this contract.
* **H∂** it depends on where the mass sits: runs vs literals.

**Resolved this turn: H− for the merge mechanism, on measurement.** The evidence
threshold was set in advance — decompose real wires and compute the *ceiling*,
not the current value. §D.1 is that computation.

---

## C. FRONTIER, AND THE OPEN INTERFACE

New this turn:

| imported result | hypotheses | use |
|---|---|---|
| **Taillard's robust tabu search for QAP** (via Glover's repository copy; Misevičius' ETS) | pairwise-decomposable cost | a Δ-matrix makes a 2-exchange O(1) to evaluate, O(n) to update. **We cannot use it**: BPE merging is not pairwise-decomposable — a three-character token is not the sum of two pair merges — so the Δ must be recomputed by re-tokenizing. |
| **Paul, "Robust tabu search for sparse QAP", arXiv:1009.4880 (2010)** | sparse flow matrix | adjacency lists + priority queues take per-iteration cost from O(N²) to O(N). Our instance is sparse in both matrices (3419 merge edges over 802² = 0.53%). This motivated the delta evaluator in §E1. |
| **Sergienko, Shylo, Chupov et al., *Cybern. Syst. Anal.* 56 (2020)**; **Misevičius, iterated tabu search** | QAPLIB-style instances | iterated tabu with mutation is the state of the art for QAP; "intensification and diversification" beats random restarts. |
| **FunSearch** (Nature 2023), **CPro1** (arXiv:2505.23881, Aug 2026 review), **AutoModSAT** (2026), **MEoH** (AAAI 2025) | LLM proposes, external verifier scores | the Aug–Sep 2026 AI-mathematics wave (OpenAI Astra's ten Lean certificates, 1 Aug; Anthropic's FLT formalisation, 5 Sep; Navier-Stokes, 8 Sep) transfers **verification discipline**, not mathematics: a construction counts only when an independent checker in a different implementation says so. |

**The open interface, sharpened this turn.** The QAP literature assumes a
pairwise-decomposable objective. Ours is not: it is `Σ_runs T(run)` where `T` is
a greedy BPE over a learned merge table. Every O(1)-delta result in the
literature is therefore unavailable, and the best available move is
"re-tokenize the affected runs", which is O(occurrences) — good when references
are rare and **useless when they are frequent**, which is exactly the regime
where they matter. That is why §E1 failed.

---

## D. NEGATIVE SPACE — the two that matter, then sixteen more

### D.1 THE MERGE MECHANISM IS DONE — measured, not argued (`bench/tmp/head.ts`)

Decomposing real SIBYL wires into reference runs and literal text:

| lane | wire | tape | body | runs | runChars | runToks | density | ideal₂ | slack₂ | **literal** |
|---|---|---|---|---|---|---|---|---|---|---|
| dts0 | 2086 | 893 | 1191 | 542 | 1231 | 972 | 0.790 | 811 | 161 | **1114** |
| doc11 | 2568 | 661 | 1905 | 569 | 1025 | 832 | 0.812 | 725 | 107 | **1736** |
| gh-prose | 1769 | 239 | 1528 | 379 | 517 | 439 | 0.849 | 414 | **25** | **1330** |
| license | 960 | 189 | 769 | 265 | 486 | 394 | 0.811 | 337 | 57 | **566** |
| code-ts | 1010 | 276 | 732 | 223 | 633 | 479 | 0.757 | 383 | 96 | **531** |

`ideal₂` is the cost if **every** adjacent pair merged. The total remaining prize
across five lanes is **446 tokens**, and on gh-prose it is **25**. Average run
length is 2.3 characters, so 3–5-gram merging — where the big vocabulary lives —
has almost nothing to bite on.

Meanwhile **1114 of dts0's 2086 wire tokens, and 1330 of gh-prose's 1769, are
literal text covered by no rule at all.** That is the hapax mass. No dictionary,
no grammar, no merge and no permutation touches it. Combined with last turn's
free-dictionary parse floor for gh-prose (1415 against identity 1934, and worse
than identity once the dictionary is charged), **English prose is at the limit of
this mechanism class, and the limit is roughly where we already are.**

### D.2 DELTA-EVALUATED TABU SEARCH DOES NOT BEAT THE TARGETED HILL-CLIMB

Built in full (`RunAssigner`, `tabuAssign`, still in the module as a recorded
negative), with an inverted rule→runs index, run-pattern deduplication, tabu
tenure, aspiration, and n-gram placement moves. Measured against SIBYL:

| lane | SIBYL M | tabu, iterations 2 / 6 / 3 / 2 |
|---|---|---|
| license | 1009 | 1028 / 1028 / **1022** / 1028 |
| gh-prose | 1818 | 1831 / 1831 / **1822** / 1831 |
| code-ts | 1069 | 1115 / **1103** / 1114 / 1115 |

Worse on every configuration, and not faster. **Cause, diagnosed:** the delta is
O(occurrences of the swapped references), and the references worth moving are the
frequent ones, which occur in most runs. On `license` with 24 word rules a probe
cost ~0.95 ms against ~0.06 ms with phrase rules only — a 15× regression exactly
where the search needs to be cheap. Sparse-QAP delta evaluation assumes a sparse
*flow* matrix; ours is sparse in the distance matrix but **dense in flow**.

### D.3 A SUPERSET FALLBACK THAT DESTROYS ITS OWN GUARANTEE

The first SEQUOYAH ran ARIADNE and SIBYL as extra arms and kept the best, so it
could never lose on tokens. Measured: it inherited their clock-bounded search and
`gh-prose` became nondeterministic again, at 3–5× SIBYL's wall-clock. A
determinism guarantee destroyed by its own safety net is not a guarantee. Removed;
the frontier takes `min()` across codecs, which is what it is for.

### D.4–D.18 (carried forward, each measured in an earlier turn and unchanged)

4. Dictionary-ising every distinct token (dts0 tape alone ≈ 1250).
5. Ranking word rules by frequency rather than adjacency.
6. Capping phrase rules to free alphabet space — monotonically worse.
7. CJK's large-but-sparse alphabet vs the dense pooled one.
8. Wide multi-line record templates (real JSON arrays have variable-length records).
9. Optimal parsing alone (worse, though 30× faster).
10. Glyph-after-space absorption (exactly neutral).
11. First-use rule binding (exactly break-even).
12. Model-prior compression — the largest prize, **unreachable**: no model here to
    measure predictability with, nothing verifiable. Not attempted.
13. LZ77 distance/length back-references — LLM character counting, no verifier.
14. Few-shot contract instead of prose — cheaper, unverifiable.
15. Per-line operator prefixes (~1 token/line).
16. JSON-wrapped raw regions (+181…+202).
17. Non-token-aligned candidates (doubles a 12-token sentence).
18. Tiny lanes — impossible before any contract is paid (MOSAIC300 free-dictionary
    total 107 vs identity 118).

---

## E. MECHANISM PORTFOLIO

### E1. Delta-evaluated assignment with tabu search
*Construction:* inverted index reference → runs; probe cost O(occurrences).
*Artifact:* `RunAssigner`, `tabuAssign` in `sequoyah.ts` (retained, not shipped in
the default path). *Proved:* the delta is exact — it re-tokenizes precisely the
runs whose characters changed. *Unresolved:* nothing — it was **falsified**, §D.2.
*Gap:* local (a better QAP heuristic is a drop-in), but the ceiling it competes
for is only 446 tokens, §D.1.

### E2. Run-pattern deduplication  ← shipped, and the one clean win
*Construction:* identical reference sequences collapse to one pattern with a
multiplicity; the objective is a plain sum so the value is unchanged.
*Artifact:* `prepareRuns` / `runCostPrepared` in `ariadne.ts`, used by
`renderBest`, so **ARIADNE and SIBYL both get it**.
*Proved:* exact — `Σ_runs T(run) = Σ_patterns mult·T(pattern)`.
*Falsification:* outputs must be bit-identical to the pre-change encoder; they
are, because the probe sequence and RNG are untouched.
*Gap:* local.

### E3. Clock-free, iteration-capped search  ← shipped, and the gate repair
*Construction:* every loop in the underlying search already carries an integer
cap — levels, price iterations, fixed-point rounds, greedy-add rounds, re-parse
passes, local-search sweeps, inline passes, probe count. The wall clock was only
ever a safety valve. SEQUOYAH hands the search a deadline of 8.64e15 ms, so the
caps are the only bound and the wire becomes a pure function of the input.
*Artifact:* `NO_CLOCK` in `sequoyah.ts`.
*Proved:* determinism, **31/31 on the gate corpus** (gate S4), against SIBYL which
fails the same property.
*Gap:* local — the cost is unbounded worst-case time, mitigated only by the caps.

### E4. Zero-probe seeding construction
*Construction:* spell whole runs onto multi-character single tokens
most-valuable-first, conflict-free. *Artifact:* `seedAssignment`. *Proved:* never
worse than pool order, because it is kept only if it scores lower.

### E5. Single-token rule admission (SIBYL, carried)
Still the mechanism that unlocked prose; §D.1 now bounds how much is left.

### E6. Pooled 14-script alphabet (SIBYL, carried)
802 characters, 3419 two-char / 3119 three-char / 1439 four-char single tokens.

---

## F. ARTIFACTS

`bench/tmp/head.ts` returns the decomposition table (§D.1) — a quantitative bound,
not a status report. `bench/tmp/sq1.ts`, `sq2.ts`, `sq3.ts` return the tabu
comparison tables (§D.2) — counterexamples. `bench/tmp/seqgate.ts` returns the
gate receipts. `src/lib/omega/sequoyah.ts` is the executable design.

---

## G. SECOND-ORDER ADVERSARY

* **Against E3 (determinism):** encode every corpus input twice and compare wires
  — gate S4. The attack that found the earlier failure was exactly this, applied
  to the *fallback arm* rather than the main path (§D.3).
* **Against E2 (dedupe):** if the multiplicity were dropped anywhere the objective
  would silently change; the encoder's exact final count would then disagree with
  the search. Detected by S1/S5 (round-trip and gate) and by outputs matching the
  pre-change encoder.
* **Against the pooled alphabet:** `adv/greek` and `adv/allscripts` payloads put
  characters from the pooled ranges *in the text*, forcing the collision filter.
  Both round-trip through all three readers.
* **Quantifier order:** S1–S6 are ∀ over the corpus, not averages.
* **Imported-theorem alignment:** the QAP delta results are cited *and explicitly
  ruled out* for our objective (§C), rather than borrowed by analogy.

---

## H. VERIFICATION — receipts

Three independent readers: the library decoder, a reader written from the
contract prose alone (re-implemented in `bench/tmp/seqgate.ts` with the pooled
alphabet), and `bench/chiron_decode.py` on **CPython 3.11.2 in a separate
process**.

```
SEQUOYAH GATES  (31 inputs, 18 framed, 13 declined)
PASS  S1  exact UTF-16 round-trip (library decoder)            31/31
PASS  S2  independent prose-literal reader agrees              31/31
PASS  S3  external CPython reader agrees   CPython 3.11.2      31/31
PASS  S4  DETERMINISTIC (encode twice, identical wire)         31/31
PASS  S5  message gate: never worse than identity              31/31
PASS  S6  one-chat accounting exact (M == tokens(prompt))      31/31
      total encode wall-clock 183.7s; worst BANYAN 104371ms
```

Corpus: all 10 holdout files, the 5 chaos/mosaic/BANYAN fixtures, the 7 synthetic
op lanes, and 9 adversarial payloads (frame characters, all seven glyph scripts
including the pooled ranges, Greek-in-payload, astral, control characters, a
40 000-character run, CRLF, empty, single character).

`./node_modules/.bin/tsc --noEmit -p tsconfig.json` clean.
`npm run build` → `✓ built in 10.39s`.

**Claims explicitly downgraded:**
* No 37-lane frontier number for SEQUOYAH — the run did not complete (§ Runtime
  honesty). The last completed 37-lane frontier (previous turn) gave
  `35 755 → 30 462`, and CHIRON/ARIADNE/SIBYL are behaviourally unchanged here
  because the dedupe is exact, but that is an argument, not a fresh measurement.
* SEQUOYAH is **not** uniformly better on tokens. Measured on five lanes:
  license **−9**, code-ts +2, dts0 +3, readme +12, gh-prose +23 against SIBYL.
* SEQUOYAH is **not** faster. Worst lane 104 s (BANYAN).
* That a language model executes any of these contracts — still untested.

---

## I. REPAIR

| defect | found by | repair | re-gated | new attack |
|---|---|---|---|---|
| SIBYL nondeterministic (G10, previous turn) | encode-twice gate | clock-free iteration-capped search | S4 31/31 | S4 is now run over the whole corpus, not a 12-lane sample |
| Tabu delta evaluator slower than full rescan on frequent references | `bench/tmp/sq1.ts` probe timing | run-pattern dedupe; then the arm was abandoned | §D.2 table | — |
| Superset fallback reintroduced nondeterminism | `bench/tmp/sq3.ts` det column | fallback removed | S4 | S4 |
| Lost `bench/tmp` and `node_modules` after re-clone | `build.sh: No such file` | re-created harness, `npm install` | `tsc`, `npm run build` | — |

No repaired candidate inherited trust: S1–S6 were run after the last change.

---

## J. RESULT AND STOPPING

**What shipped:** SEQUOYAH — a deterministic, clock-free codec in the same
mechanism class, emitting the same wire language, read by the same contract and
validated by the same three independent readers. Plus `prepareRuns` /
`runCostPrepared`, an exact deduplication of the assignment objective that
benefits ARIADNE and SIBYL as well.

**What it is worth, honestly:** one gate repaired (determinism, 31/31 where SIBYL
fails), one lane improved (`license` −9 against SIBYL), four lanes worse, no
speed win. **This is a weak turn on compression and the reason is now measured
rather than guessed:** §D.1 shows the mechanism class has ~446 tokens of merge
headroom left across the five largest lanes, and 55–75% of every wire is literal
hapax text that nothing in this class can touch.

**Stopping.** Not because the problem is believed closed — because the budget is
spent and, for the first time, the *ceiling* is measured rather than the current
value. The success predicate holds for exactness, the gate, accounting and
determinism; it does **not** hold for a significant compression gain this turn,
so this is returned as the strongest verified artifact plus the exact remaining
gap.

### Next highest-information tests, in order

1. **Re-run the 37-lane frontier with four codecs** under a longer wall (it needs
   ~30 minutes). Nothing in this report depends on it, but the headline does.
2. **Attack the literal mass, or prove it cannot be attacked.** §D.1 says 55–75%
   of every wire is hapax text. The only known lever is the reader's own prior,
   which needs an LLM in the encode loop — currently unavailable, and the single
   highest-value capability to add to this sandbox.
3. **Ask an actual LLM to decode a wire.** Still the only untested link in four
   turns of work, and the only one a real user experiences.
4. **Make SIBYL clock-free too**, now that SEQUOYAH shows the caps suffice; that
   would repair G10 for the codec that currently holds most of the frontier.
5. **Contract floor.** ~40 tokens is paid on 29 lanes. Measured minimum viable
   prose is 33. A 20-token contract would flip two more declining lanes and is
   the last cheap structural win left.
