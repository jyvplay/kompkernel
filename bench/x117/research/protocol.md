# X117 research protocol A–J (inherits X115/X116 A–J)

The X115/X116 protocols remain in force: formal model, H+/H−/H∂, ≥24 negative
shapes, ≥11 mechanism-distinct approaches, second-order adversary, repair
re-gating. X117 adds the following.

## A. Formal model addition

- **Contract CSE.** If a shipped message is `K1 LF K2 LF K3 LF B` and the three
  keys are independent inverse declarations over disjoint fields, a fused key
  `K` may replace them iff `K` parses to the same rule/marker/CRC/order and the
  composed inverse is unchanged. The token claim is `T(K LF B) < T(K1 LF K2 LF K3 LF B)`,
  measured on the complete message, not on isolated keys.
- **Single-pass conjunction.** If rewrites `r1,r2,r3` touch disjoint fields and
  commute, `F(r3(r2(r1(x))))` need be priced once. Nesting that re-enters the
  frontier per layer is search redundancy, not a different wire. The schedule
  is admissible only if the complete fused message is byte-exact and strictly
  cheaper than the incumbent.

## B. Outcome space / threshold

- **H+ (X117):** ΣΥΝΘΕΣΙΣ ships in the X74 chain and registry; `ls-l-real`
  complete-message tokens strictly drop versus X116 ON (1 348); Σ29 drops;
  29/29 exact; OFF arm hash-identical to X116 ON; independent cold reader +
  mutation battery pass; balanced A/B shows no token regression and an honest
  wall/CPU account that beats X116's 0.630× slowdown.
- **H−:** fused key is ambiguous/unreadable, body changes, exactness fails, or
  the complete message does not beat the incumbent.
- **H∂:** raw/key win but no shipped Pareto win, or speed still negative, or
  LLM-blind decode unverified.

Pre-registered cheap falsifier: the 35-token fused spelling is rejected if it
buys tokens by dropping `(1-based)`, `text after`, or `T+` — the exact clauses
X90/X115 paid to keep self-description. Primary target: `ls-l-real` three-line
48-token prefix.

## C. Frontier achievability / impossibility

- Merged frontier re-verification: X116 ON must reproduce 29/29 message and
  token-id hashes, Σ29 = 12 277 (`verify-frontier.ts`). The old “143” note for
  `metrics.tsv` is settled by the hash comparison: the lane is 200 (akolouthia2).
- Dense-wire law still binds: post-pass edits to dense CHIRON wires lose.
  ΣΥΝΘΕΣΙΣ is pre-frontier contract/schedule only; it does not edit the tape.
- Impossibility hypothesis: *contract already minimal*. If the three keys share
  no removable preamble, fusion loses. Detecting test: fusion ladders 1–5.

## D. Negative result shapes added (X116 count ≥24 → X117 ≥31)

26. **Sparse case channel.** caseMask raw Σ29 40 580 vs 28 015. Functionalizer
    prior art; multi-byte coordinates lose. Do not ship.
27. **Identifier case-shape dictionary.** idShapes 28 942; humps 29 897. Opcode/
    operand factoring is old and loses on o200k.
28. **Decimal group channel.** commaGroups 28 506. Canonical thousands grouping
    is already cheap in the parent.
29. **Exact quote-run elision.** quoteRuns raw 28 392; through the real frontier
    email-thread 486→506 (+20). SYNKRISIS already codes `>` repeats.
30. **Gapped identifier / link-stem templates.** gappedIds refused 28/29,
    inverse disagreed on code-ts; linkStems no win. Scattered parameterization
    is denser than the parent's dictionary.
31. **Ambiguous cheap fusion.** 35–38 token fused keys drop `(1-based)`,
    `text after`, or `T+`. Rejected despite price; shipped fusion is 40+LF=41
    and keeps every clause. The honest ceiling is −7, not −13.

## E. Mechanism-distinct approaches added (X116 count ≥11 → X117 ≥13)

12. **ΣΥΝΘΕΣΙΣ contract CSE + single-pass conjunction** (construction: fuse three
    disjoint-field entailment keys and price the fully rewritten body once;
    artifact: `src/lib/omega/synthesis.ts`; proved: canonical key parse, own
    inverse, CRC fail-closed, commute screen, independent CPython cold read,
    930-mutation battery; unresolved: balanced A/B speed; cheapest falsification:
    fusion ladder + ls-l-real complete message; local-vs-global: key 48→41).
13. **Independent fused cold reader + mutation battery** (construction: CPython
    reader from the printed grammar, no encoder import; artifact:
    `bench/x117/coldread.py`, `coldmut.py`; proved: SHA-256 match on ls-l-real,
    930 trials 0 silent-wrong; falsification: any silent-wrong mutation; gap:
    no external LLM-blind decode).

## F. Branch return types

ΣΥΝΘΕΣΙΣ branch returns executable design (module), proof (units/coldread),
experiment (screen/ladders/A/B), and bound (honest −7 key ceiling). Raw-screen
branch returns counterexamples (seven falsified mechanisms). No branch returns
only prose.

## G. Second-order adversary

- Source already contains λ or octal-form mode ⇒ constituent ambiguity refusal.
- Marker present in pre-body ⇒ next marker / refusal.
- Rule set not single empty-prefix tail ⇒ refuse (v1 scope).
- Fused key non-canonical / damaged ⇒ parser null; CRC fail-closed.
- Dense parent body fed without parent decoder ⇒ CRC throws, not silent guess.
- Constituent kill switch (`OMEGA_NO_ENALLAGE`, `OMEGA_NO_MEKOS`) ⇒ fusion refuses.
- Rewrites do not commute on a future domain ⇒ commute screen must catch before
  shipping; ls-l-real screen `commute=true`.

## H. External verification

Batches 5–6 recorded in `sources.md`. Functionalizer/LEAP/email/lexical sources
are prior art or inadmissible; frontier-lab math individually downgraded. No
Lean executed. Independent CPython cold read is local, not an external model.

## I. Repair discipline

Any edit to synthesis/tagstack/registry re-runs tsc, synthesis-unit,
enallage-unit, mekos-unit, synedria-chain-unit, coldread/coldmut, and the
balanced A/B. A/B hashes messages and token ids.

## J. Budget / stopping

Continue until H+ met with receipts or budget exhausted. Mandatory: ≥1 new
Pareto-superior codec in repo, docs §X117, leaders, PR merged.

## Repair log

- R1: first synthesis key used the 37-token `※tail` spelling. Semantic audit
  rejected it: `tail` is not defined in-band and `(1-based)` was dropped. Key
  changed to the 41-token fully clausal fusion; units/ladders/coldread re-run.
- R2: unit expected bare `tagstackDecode` to throw on an already-expanded
  pre-frontier body. That was a harness bug: the bare dispatcher correctly reads
  a plain body; the fail-closed test must feed a dense parent body. Fixed unit.
- R3: synthetic unit listing was too short for X90's raw greedy contract floor
  (chosen=[]). Lengthened names/rows; encode unit now fires with 12 hits.

## Results (fill after A/B)

- Merged frontier re-verification: pending ls-l-real at 05:08Z; 28/29 already
  hash-identical to X116 ON.
- Cheap screen: only ls-l-real reaches the conjunction; key 48→41 (Δ−7),
  raw 5 194→4 392, hits 149/58/52, CRC 25b707b9, own/commute/parse true.
- Units: 9 passed. Cold read: EXACT, SHA-256 matches. Coldmut: 930 trials,
  878 refused, 0 silent-wrong.
- Balanced A/B: pending.
