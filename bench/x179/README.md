# X179 — KLADOS adaptive tree-address codec

**Scientific acceptance: false. Experimental/unwired; production unchanged.**
This work adds a new repository module, not a demonstrated Pareto-superior codec.
It follows PINAKAS (the user called it PINKAS), preserving all earlier receipts.

## Construction and verification

`src/lib/omega/klados.ts` addresses repeated ASCII words by paths in a dynamic
binary search tree. First occurrences remain literal; every insertion/access is
promoted to the root through single rotations. It is **not** zig-zig splaying,
fixed dictionary aliases, MNEMA prefix lookup, PINAKAS bumping or BBWT LF cycles.
Classical adaptive-tree ancestry is explicit; semantic novelty against every
possible existing codec is not proved. No AI-only discovery is claimed.

- 7,627 source/unit/transport checks across 35 files, with 29 eligible sources.
- Eager and local-token-greedy policies; complete contract and parent wire charged.
- One raw-price win: ls-l 5,194→5,172. This is not a win against its 1,310-token
  parent frontier. Its bounded 90-second parent attempt timed out.
- 3,310 independent Python checks, including nine exact paid wires (three KLADOS,
  six frequency-order), with no unsupported paid parents or mismatches. The tree
  reader uses word-keyed maps rather than TypeScript node objects; the LF and
  bounded-parent readers are explicitly reused independent implementations.
- Literal-update, root/path, no-rescan, case, Unicode, maximum length, malformed
  marker and resource-bound attacks are included.
- A TypeScript inference error was fixed with an explicit plan-array type.
  Emitted JavaScript before/after that type-only fix is byte-identical. Fresh
  validation passed with targeted empty-plan/dedup tests. The failed compiler log
  remains archived rather than concealed.
- Two native single-message handoffs are **NOT_RUN**. Neither program inversion
  nor source-aware assistant review confirms native LLM behavior.

## Paid KLADOS outcomes

Three completed paid candidates are exact and lose:

| Source / policy | Existing parent | Complete KLADOS |
|---|---:|---:|
| ps-real / local | 381 | 503 |
| ps-real / eager | 381 | 602 |
| unified diff / eager | 411 | 663 |

Of the initial twelve policy attempts, five are ineligible and four time out at
30 seconds. Ineligible is not an exact paid candidate. There are no demonstrated
prose gains. Caret collisions deliberately decline rather than ambiguously escape.

## Frequency-order follow-up

All 24 declared width/order plans on the four prior raw-winning sources were
actually attempted in fresh processes with 30-second / 900 MiB limits. **All 24
timed out**, so this is NOT complete paid pricing. The whole CPython control also
timed out. Fresh canonical controls are reused wherever available rather than
recomputing the expensive unchanged source.

After isolated speed testing, a 180-second-budget retry of ps-ef's prior best
raw-ranked plan completed. An isolated 90-second-per-plan follow-up then completed
all five remaining plans. **All six are byte-exact and lose against the fresh
296-token control**: width32 increasing/decreasing 559/549; width128 537/521;
width512 505/505. The complete ps-ef tournament is now closed, not pending.
Its statuses/prices are in `ps-ef-processes.json`, `paid-38..43.json`, and
`summary.json`. The other three sources remain unpriced after their bounded
attempts. This escalation does not erase the earlier timeouts.

## Speed experiment

A benchmark-only fixed-128-unit native substring LCP scan was compared against
the original scalar LCP. 20,012 UTF-16/limit/boundary tests pass; A/B count/vector
outputs match. Isolated ABBA: 24 identical wires; aggregate CPU B/A
**1.0029935174**, wall **0.9998280550**. ps-real, diff and other protected metrics
regress. The declared significant-speed gate fails; no production patch.

## Fresh frontier and generalized local leaders

One new X179 replay completed: **29 identical wires / 11,962 tokens** against
X177/X178. All prices and transport checks pass. Bounded TS reader:21 exact /8
unsupported. Independent Python:22 exact /7 unsupported /0 mismatches. Unsupported
is not independently verified exactness; encoder self-report is labeled separately.

| Role | Lanes | Raw → frontier | Largest absolute-saving fixture |
|---|---:|---:|---|
| Prose | 3 | 2,018 → 1,770 | email 629→486 |
| Ops/tabular | 22 | 22,332 → 8,078 | ls-l 5,194→1,310 |
| Code/structured | 3 | 3,152 → 2,013 | JSON 1,152→653 |
| Other | 1 | 513→101 | cue sheet 513→101 |

Ops' relative-saving leader remains prices.csv 582→118. Word-reference tape-body
classes lead prose/ops/code descriptively, not as a causal per-codec ablation or
proof of global optimality. See `source-role-leaders.json` and provenance.

## Research and remaining interface

`research.md` records new live adaptive-code literature, explicit hypotheses and
individual OpenAI/Anthropic/DoubleAI/DeepMind/Harmonic/Seed follow-ups. Nine pinned
files were fetched. A prior Google statement gap was narrowed: `HasPosDensity`
requires an existing positive limiting density, not merely positive limsup.
No theorem kernel was run; the DoubleAI girth PDF fetch failed; this is not an
exhaustive all-labs proof audit.

`model.md` defines H+/H−/H∂, objects/access/resources/quantifiers, boundaries and
29 false-solution shapes. `modal.py` executes 27 inherited evidence-schema tests
and concrete countermodels; it is not a natural-language theorem prover.
`portfolio.md` and its executable harness cover eleven distinct mechanism/control
branches; reused controls are not presented as new discoveries or external agents.

The requested broad, native-readable, significant Pareto improvement remains
unachieved. Next useful work is completing longer-budget parent pricing on the
remaining raw-winning sources, not repeating unchanged-source controls or
mistaking raw token savings for frontier gains. Native model access and blinded
byte-exact behavior tests remain separate mandatory gates even if a paid win
appears. No new commit or merge is scientific acceptance.

Reproduce with `sh bench/x179/validate.sh` after the recorded worker stages.
The final validation, summary and artifact hashes bind the completed claims.
