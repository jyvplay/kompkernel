# X189 ANAPLASIS — bounded non-monotone grammar reconstruction

**Status: experimental; broad superiority NOT established.**
New module: `src/lib/omega/anaplasis.ts`. It is not wired into production.
The requested new, broadly Pareto-superior, independently native-readable codec
has **not** been demonstrated. Publishing this record is not acceptance.

## What was actually built

ANAPLASIS retains some temporarily more expensive rule deletions, then tries
one reconstruction move before comparing against the original parent. It emits
the **existing CHIRON grammar and existing paid reader key**, not another
external routing layer. Six implemented move families: delete, body remining,
tape factoring, fresh-name replacement, legal tape relocation, and
context-selected aliases. See `portfolio.md` for each construction, concrete
artifact, ancestry, unresolved interface, and structural falsifier.

SYNARMOGE already combines deletion and remining but only accepts each move if
it improves cost. This experiment tests a bounded non-monotone extension. It
is not evidence of a new compression primitive. ANANKE, VELTISTOS, ALLOMORPH,
METATAXIS and other optimizers have substantial adjacent mechanisms. All-stack
semantic novelty remains **NOT_ESTABLISHED**.

## Fresh frontier and paid results

Fresh canonical replay using the existing X164 worker: **29 identical wires,
11,962 tokens**, including original-source byte checks. Concurrent replay
workers are not independent agents or speed evidence.

Final repaired experiment: **290 cells**, **240,959 priced probes**;
**160 source-exact cells**, **130 unsupported cells** (16/29 direct-source
parents, repeated across six families and four ranking ablations). Unsupported
parents are not successes. All accepted costs are checked using the reference
o200k tokenizer over the complete message.

| Lane | Canonical | Best experimental | Saving | Winning move |
|---|---:|---:|---:|---|
| ps-aux-real | 980 | 979 | 1 | tape relocation |
| node-help | 846 | 845 | 1 | tape relocation |
| unified-diff | 411 | 410 | 1 | body remining |

No prose gain. No >10-token gain. No winning candidate crossed an uphill
intermediate-state barrier. The intended advantage of the new search extension
is therefore **not demonstrated**. These one-token moves do not satisfy the
user's request. Experimental aggregate selection is not installed as a new
canonical frontier. The comparator here is the canonical production configuration,
not the minimum over every historical experimental receipt; no claim of
Pareto dominance over that larger database is made.

Character, token-proxy, and whitespace-touching rankings are ablations, **not
three extra mechanisms**. Initial exploration used the prior turn's wires;
final results use this turn's freshly recomputed wires. Earlier `exploratory`
and `pilot` receipts are not the final gates.

## Local leaders (not universal category optima)

The final `receipts/leaders.json` uses the prior turn's explicit category
classification. Canonical aggregate totals remain prose **2018→1770**, ops
**22332→8078**, code/structured **3152→2013**, other **513→101**.
Largest absolute savings: prose email **629→486**; ops ls-l **5194→1310**;
code/structured JSON **1152→653**; other cue sheet **513→101**. Ops' strongest
relative saving is prices **582→118**. This lists test-suite-local leaders,
not an assertion about every document in those categories. The reused
body-token census has an older taxonomy and is not used to classify leaders.

## Formal model and A–J gates

- **A–G model:** `model.md` defines objects, access, exact whole-message resource,
  quantifiers, boundaries, tolerances, and adjacent problems not substituted.
- **Outcome space:** H+, H−, H∂ remain explicit. Local failure is not global
  impossibility. A counting argument only excludes universal strict compression.
- **Frontier:** fresh measured replay plus bounded recent literature and deeper
  pinned superstring-source inspection in `research.md`.
- **Negative space:** 24 false-solution shapes; modal shortcut has an executable
  three-source collision test in `test.ts`.
- **Portfolio/artifacts:** six separately executed move families, final rows,
  exact source checks, and fully paid candidate messages.
- **Adversaries:** dependency cycles/ordering, literal name capture, overlapping
  repeats, mixed scripts, surrogate transport, instruction-like content, NUL,
  CRLF, huge expansion, malformed input, reserved-token spellings and prototype
  property names. No claim that the finite attack set is exhaustive.
- **Verification:** 126 unit assertions covering 114 family/source cases;
  separate Python implementation verifies **274 byte-exact cases**, no
  unsupported cases among those admitted final trials/unit outputs. It is
  separate code, not independent personnel. Native model evaluation NOT_RUN.
- **Repair:** explicit acyclic/nonempty rule validation and UTF-8 transport guards
  were added before final tests; self-reference, empty rule and unused lone
  surrogate attacks target those guards. Ranking changes and the probe-cap
  early exit were rebuilt and rerun across all affected final cells. Earlier
  exploration supplies no inherited trust.
- **Stopping:** no scientific acceptance. Bounded budgets were actually spent;
  no claim that the full research problem or all possible ideas are exhausted.

## Runtime and CPU bounds

Input/expansion cap: 50,000 UTF-16 units, 2–128 rules. At most 28 seed states;
retain initial plus 12 deletion states; ≤4096 candidate prices. Phrase lengths
2..24, a 384-item shortlist, 32 final spans and up to four fresh glyphs. One
best joint move, no iterative fixed point. Non-greedy across the selected
intermediate states; heuristic pruning, not global optimization.

Mining uses at most 23 substring lengths at each position of each retained
state, plus sorting and full-string operations; the substring map can contain
O(24N) entries. A retained state's tape+body is capped; bounded expansion may
retain up to 128 capped strings. Tokenization runtime is not treated as O(1).
There is a deterministic **work/probe bound**, not a universal seconds guarantee.
The strict entry point returns only a source-exact improvement. The caller must
retain the original parent on refusal. Added search time is not hidden by
reporting token savings alone.

## Whole-stack speed experiment

Build-only regex streaming replaces a materialized match array and reuses the
first regex match in `fastCount`. No search arms, vocabulary, or decoder are
removed. Existing count/vector/merge/threshold tests run in both arms. The
isolated ABBA stage starts only after canonical and candidate work exit;
`runtime-summary.json` records CPU, wall time, per-lane ratios and wire hashes.
Both arms passed 16,192 count, 12,124 vector, 4,119 merge and 544 threshold
checks. Final B/A CPU ratio **1.009193**, wall ratio **1.007094**, with **24
identical wires**. The patch is slightly slower overall and fails the ≥10%
whole-stack speed gate. It is **rejected; production remains unchanged**.

## Native decoding, research, and honest limitations

Complete winning handoffs are in `native/`, with **NOT_RUN** status. We cannot
confirm that any particular LLM natively decodes these messages byte-perfectly
in one basic chat. Knowing the grammar or running an inverse is not that test.
No separate model-evaluation endpoint, independent research agents, simulator,
Lean kernel, comparator or external expert was used.

Live searches covered individual OpenAI, Anthropic, doubleAI, DeepMind and Seed
results. A new domain/article path was explored for the 2025 GraSS paper, with
successful PMC method retrieval after a PDF fetch failed. The comprehensive
ALL-labs/ALL-new-proofs request remains incomplete. No full Riemann-hypothesis
proof was verified here. See `research.md` for source scopes and dates.

Two additional inputs were selected after design freeze: a pinned Click README
and actual local `git help -a` output. They are held out from this search's
parameter selection, not model-blinded. Both parent encodes completed (403 and
1745 tokens). **All 12 new-source family trials refused; zero held-out wins.**
Click's parent is literal rather than a macro tape; git-help needs a nested
layout restoration. The existing full reader recovered both sources exactly,
but ANAPLASIS deliberately admits only a direct-source ordinary-macro parent.
`heldout-domain.json` records that distinction. This is a generality failure,
not evidence that the existing stack cannot decode those files. These results
are separate from the 29-lane canonical totals.

## Highest-information next test

Before claiming a terminal model-readable frontier, run an **independent,
source-blind, one-chat byte-exact decoding evaluation of the existing canonical
messages**. This is a mandatory but still unmeasured interface. For algorithmic
work, record exact full-message costs and contextual token boundaries for
unprofitable deletion/reconstruction pairs, then test whether contextual
candidate ranking (rather than this isolated-span proxy) finds a barrier-crossing
move. First audit against VELTISTOS and SYNARMOGE. No guarantee of a breakthrough
or novelty follows from this suggestion.

## Reproduction

`bash bench/x189/run-final.sh` rebuilds codec trials, reruns all final candidates
on recorded fresh canonical wires, checks the Python inverse, rebuilds the
census, and runs isolated speed trials (requires `node bench/x189/speed-build.mjs`
first). Do not run other CPU workloads during the speed stage.

For a fresh canonical run, build `bench/x164/frontier.ts` to
`bench/x189/frontier.mjs`, clear only this experiment's `frontier.jsonl`, then run
`python3 bench/x189/frontier-run.py`. The runner resumes completed lanes, so
without clearing the receipt it is a resume, not a fresh replay.
`python3 bench/x189/finalize.py` assembles final summaries and leaders.
