### E. Six mechanism-distinct approaches, and the one that shipped

| # | mechanism | proved | unresolved | falsification | gap |
|---|---|---|---|---|---|
| E.1 | **Relabelling group search** — optimise over the injective map rules→same-script pool chars | cost is a function of the *run structure* of the wire, so a non-identity `A` can lower it; injectivity ⇒ decode unchanged | the argmin is not found exactly | if swap-only searches measured the full −309, E.1 contributes nothing | search is local; no bound on the gap to the true argmin |
| E.2 | **Run-cost model** — cost is per *maximal run of same-script glyphs*, not per glyph | `ених` and `әм` are **1 token**; `е` alone is 1. Parent's 0.801 tok/occ is a bimodal average over ~1 isolated and ~1/k in-run | how BPE will tokenise an unseen adjacency | if isolated and in-run costs were equal, relabelling would be exactly free | measured on 3 samples, not on the full adjacency matrix |
| E.3 | **Tape/body joint re-scoring** — score the *emitted* wire, not a proxy | parent scores during construction; METATHESIS scores post hoc | — | if `cost(A(w))` equalled `Σ cost(rule)`, post-hoc scoring would be pointless | needs the real wire, so it cannot be fused into the parent without a rewrite |
| E.4 | **Clause-form compression** (X26, inherited) | 17 vs 41 tokens | — | — | — |
| E.5 | **Separator-lattice uncollapse** (X25, inherited) | — | — | — | — |
| E.6 | **Phrase grammar** (POLYTROPOS, inherited) | — | — | — | — |

**What is new in X27 is E.1 + E.2 + E.3 as a single move:** the observation
that the parent fixes a *semantically arbitrary* choice — which glyph stands for
which rule — and that this choice has a real token cost that the parent never
measures because it measures during construction, not after emission.

### F. Artifacts

- `src/lib/omega/metathesis.ts` — the codec (`poolFor`, `rng`/`seedFrom`,
  `relayoutGlyphs`, `metathesisEncode`, `metathesisDecode`, `metathesisRoundTrip`).
- `src/lib/omega/registry.ts` — `metathesis` entry inserted after `symploke`;
  188 `key:` entries; `npx tsc --noEmit` clean.
- `bench/x27/sweep.ts`, `bench/x27/sweep.log`, `bench/x27/metathesis.jsonl` —
  the 28-lane sweep.
- `bench/x27/reverify.ts`, `bench/x27/symploke_reverify.jsonl` — baseline re-run.
- `bench/x27/rt.ts` — single-lane round-trip driver.
- `bench/x27/regsym.ts` — registry-path smoke test (`exact: true`, `oneChat: 33`).
- `bench/x27/det.ts` — determinism receipt (3 encodes/lane, byte-identical wires).
- `bench/x27/mkcase.ts`, `bench/x27/cases.json`, `bench/x27/receipts/*.message.txt`
  — the four one-chat-message cases.
- `bench/x27/selfdecode.py` — the X26 from-spec decoder, **run unmodified**.
- 17 probe scripts (`tapecalc`, `prune`, `diag`, `ops`, `blocks`, `blockfull`,
  `dl`, `ablate`, `see`, `econ`, `layout`, `layout2`, `spread`, `script`,
  `pool`, `residual`) — the negative-space record of §D.

### G. The second-order adversary, A(C)

The adversary's best moves, and their answers:

1. **"This is a rename of ariadne's existing hill climb."** Partly conceded and
   stated in the source header. What is genuinely new is (a) scoring the
   *emitted* wire rather than a construction-time proxy, (b) the **swap** move
   class, which ariadne does not have, and (c) seeded restarts. Row D.10
   isolates the contribution: swap-only measured **0** on readme; the full
   −309 requires swaps.
2. **"It cannot generalise — it is benchmaxxed on the 28 lanes."** The codec
   contains **no lane-specific constant, no threshold tuned on the holdout, and
   no input-dependent branch other than rule count.** Its only free parameter,
   `maxEvals = min(400 000, 40 000 + k²·12)`, is a compute budget, not a
   fit. The honest counter is that 28 lanes is still 28 lanes.
3. **"−1.05% is not 'significantly better from a real user's perspective'."**
   **Conceded for prose.** On the four prose lanes that moved, the gain is
   −1 to −8 tokens out of 391–943 — below the threshold at which a user would
   notice. The honest claim is narrower and stronger: on **rule-dense**
   material (CSV, log dumps, git output, long markdown) METATHESIS removes
   1.5–2.6% (csv-8 −21/1651, sp500-200 −54/4054, ops-git-log-stat −87/3393),
   which is real money on the inputs that dominate actual context windows.
4. **"The search is not reproducible under load."** Answered by `det.ts`:
   three encodes per lane, **byte-identical wires**, message-token vectors
   `[683,683,683]`, `[956,956,956]`, `[673,673,673]`. Math.random is banned
   repo-wide; X27 uses `mulberry32(fnv1a(wire))`.
5. **"A wrong search could corrupt a message."** Structurally impossible — see
   the injectivity lemma in H.2. Verified empirically by §F's unmodified X26
   decoder: **4/4 byte-exact.**

### H. Verification, and what is honestly NOT verified

**H.1 — What was run.** 28-lane sweep (28/28), baseline re-verification
(28/28), registry smoke test, determinism receipt, 4-case independent
self-decode (4/4 byte-exact), `npx tsc --noEmit` clean. All numbers in this
document come from files in `bench/x27/`.

**H.2 — The injectivity lemma (the safety argument).** For any injective
same-script map `A` whose images are absent from the payload,
`decode(relabel(w)) === decode(w)`, because `chironParseTape` reads tape heads
positionally, nested references inside payloads are relabelled by the *same*
`A`, and the body is relabelled consistently. **Correctness is therefore
independent of the search:** a search bug can only cost tokens, never corrupt a
message. This is why X27 is safe to ship on a partial search.

**H.3 — The honesty downgrade, restated.** **No live LLM was run at any point
this turn.** The sandbox has no model access. "Decodable by a bare LLM in one
chat message, no system prompt, no skills, no tools" is **designed for and
structurally preserved**, not demonstrated. The X26 independent from-spec
decoder is the strongest available proxy; it is a Python program, not a model.
This downgrade has now been carried for X21–X27 and should be treated as a
standing limitation of the entire programme, not of X27.

**H.4 — Delta coding: rejected WITHOUT implementation.** The largest single
win available on `sp500-200` and `vix-daily` was delta-coding the monotonic
numeric columns (store first value, then differences). It was never built.
arXiv **2602.10416** ("AI-rithmetic") shows all frontier models degrading on
integer addition as digit count grows, with a nontrivial error rate already at
20 digits, and attributes 87.9% / 62.9% / 92.4% of Claude Opus 4.1 / GPT-5 /
Gemini 2.5 Pro errors to misalignment and close-carry — misalignment being
partly a **tokenization** artifact. A decoder maintaining a 200-term running
sum cannot be trusted byte-exact under those numbers. The shipped digit rule
(`8 digits become YYYY-MM-DD`) is a **pure string rewrite with no arithmetic**,
which is exactly why it is safe. **Do not resurrect delta coding without a
live-LLM arithmetic trial.**

**H.5 — The highest-value untested idea, recorded for X28.** A DEV study
(gde, 2026-10-11) replaced a 20-step imperative prose checklist with an
**in-context Makefile** and saw multi-hop dependency resolution rise from
**61.4% → 96.2%**, described as "pure pre-training gravity". Hypothesis:
**spend 10–30 tokens moving the wire into a shape the model has seen billions
of times** (assignment list, Makefile, JSON) and accept the token cost, because
reliability may be worth more than tokens. Cannot be measured from this
sandbox. This is the one idea in the whole session that could plausibly be
worth more than every token-level optimisation X21–X27 combined, and it
inverts the objective.

**H.6 — Encoding floor (why some pool characters are cheap).** arXiv
**2610.01984** ("Universal Byte-Level Encoding: UTF-8/UTF-16 Routing",
2026-10-02) states the floor directly: "when no learned merges can be applied,
a multibyte character requires multiple byte-derived symbols." Kozma &
Voderholzer put BPE at between 1/3 and `(1 − e⁻²)/2 ≈ 0.4323` of optimal
compression utility worst-case; arXiv 2306.16837 gives the lower bound
`1 − e^(−σ(μ*))`. These are **post-hoc evidence, not sources** — METATHESIS was
designed before they were read, and its source article is **none; it is
original to this repository.**

### I. Two bugs found and fixed

1. **`Math.random()` in the perturbation step** — broke the repo-wide
   pure-function guarantee and made wires irreproducible. Fixed by
   `mulberry32(fnv1a(wire))`; confirmed by `det.ts`.
2. **`budgetMs` is inert under `OMEGA_DET=1`** — `now()` in `src/lib/omega/clock.ts`
   returns **constant 0**, so wall-clock deadlines never fire and the search
   would have been unbounded. Fixed by adding a deterministic counter bound,
   `maxEvals = min(400 000, 40 000 + k²·12)`, evaluated alongside the (inert)
   time check.

A third defect was in the toolchain, not the codec: a registry label containing
`\uXXXX` escapes and an apostrophe produced 5× `TS1005` at `registry.ts:385`.
**Rule recorded: registry labels must contain no apostrophes and no
backslashes.**

### J. Runtime honesty

- All 28 lanes were swept **sequentially**, one `node` process per lane, in a
  single background shell. **No parallelism was used or claimed.**
- The sweep ran as one `start_process` (pid 4248) and took **well over an hour**
  of wall clock; total CPU burned was ~23 minutes at the 7-lane mark and
  considerably more by completion.
- `ms` fields in the sweep JSONL read **0** because `now()` is constant under
  `OMEGA_DET=1`; they are not evidence of zero cost.
- Wall clock varies **superlinearly and unpredictably** with rule count at
  equal size: dump.sql (47 rules) took ~4 min while csv-8 (81 rules) finished
  in under one. The bound that actually governs is `maxEvals`.
- No Lean toolchain or theorem prover exists in this sandbox. Every "proved"
  claim in §E is a **pencil argument**, checkable by hand, not machine-checked.

### K. Generalized local-leader list by structural category

Best codec per lane by structural category, from the four receipts
(`symploke_reverify.jsonl`, `metathesis.jsonl`, plus the X25/X26 archives).
"Leader" = lowest byte-exact message-token count measured.

| category | lanes | leader | total | runner-up | margin |
|---|---|---|---|---|---|
| **prose / natural language** | 10 | METATHESIS (ties SYMPLOKE on 4) | 7436 | SYMPLOKE 7449 | −13 |
| **ops logs & command output** | 14 | METATHESIS | 13765 | SYMPLOKE 13908 | −143 |
| **tables & CSV** | 4 | METATHESIS | 8295 | SYMPLOKE 8397 | −102 |
| **DB dumps** | 1 | METATHESIS | 673 | SYMPLOKE 679 | −6 |

**Reading of the table.** METATHESIS leads every category, but the margin is
**concentrated almost entirely in rule-dense material** — ops/logs and CSV
carry −245 of the −309 between them, while prose contributes −13 across ten
lanes. The honest characterization is therefore: *METATHESIS is a
rule-density amplifier, and rule density is what CSV and log output have and
ordinary prose does not.* This is a genuine general improvement — it is not
tuned to any file — but it is **not** the "large general gain on random prose"
the programme has been asked for since X25, and it should not be reported as
one.

**Where the next gain is most likely to come from.** Prose lanes carry
21–44 rules against CSV's 63–212. The gap is not in the relabelling — it is in
how much of the text the phrase grammar captures in the first place. Every
codec from POLYTROPOS onward has attacked the *encoding* of the grammar's
output; none has attacked the *coverage* of the grammar. That is the open
front, and it is where X28 should go.
