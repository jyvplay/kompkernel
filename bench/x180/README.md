# X180 — APOUSIA deterministic-context omission

**Scientific acceptance: false. Experimental/unwired; production unchanged.**
This is a concrete codec implementation and measured negative result, not the
requested broad Pareto breakthrough. It follows X179 KLADOS without renaming it.

## Construction

`src/lib/omega/apousia.ts` transmits deterministic context→successor rules, a
field count and an ordered residual. Reconstruct left to right: a matching
context emits its successor without consuming residual; otherwise consume one
residual field. Split/join on ASCII spaces retaining empties. Widths 1/2/3 and
rule budgets 8/32/128 yield at most nine plans. All rules, JSON, count, key and
parent tokens are priced. Ranking is a character-savings heuristic followed by
complete raw-wire token comparison—not global paid optimization.

Unlike DIADOCHI, no successor queue entry is transmitted for each forced site.
Unlike MONODROMOS, there is no Euler-walk uniqueness solver. Nonetheless it has
classical finite-context/prediction/antidictionary ancestry, and novelty against
all stack semantics has **not** been established. See research.md and model.md.

## Paid outcomes

| Source | Existing frontier | APOUSIA full paid tokens | Outcome |
|---|---:|---:|---|
| email | 486 | 612 | exact, loses 126 |
| ps | 381 | 509 | exact, loses 128 |
| JSON | 653 | 785 | exact, loses 132 |
| TypeScript | 949 | 1133 | exact, loses 184 |
| ps-ef | 296 | 448 | exact, loses 152 |
| ls-l | 1310 | — | 90-second timeout |
| knowledge-base prose | 620 | — | ineligible |
| diff | 411 | — | ineligible |

Only the best raw plan per source was parent-priced; this is not an exhaustive
paid-plan tournament. The two raw-winning ops plans were subsequently tested: ls-l timed out at
90 seconds and ps-ef lost at 448 versus 296. Longer frequency trials on ps-aux, ls-l and Python all timed out
at 180 seconds, as did the Python source control. Those four prices are unknown,
not losses or impossible cases. The prior completed six-plan ps-ef frequency
tournament was deliberately not repeated.

## Evidence and reproduction

- `receipts/summary.json`: final counts, paid prices, frontier and speed results.
- `test.ts`: exhaustive small ternary field strings, 2,000 seeded cases,
  Unicode/spacing, ambiguous successors, deterministic cycles, malformed frames,
  expansion and invalid-width attacks. 32 source fixtures are screened.
- `independent.py`: separately written Python omission decoder; explicitly reuses
  earlier independent LF and bounded-parent readers. Checks original bytes.
- `receipt-gate.ts`: verifies completed receipts against current plans and key,
  full token prices, tokenizer roundtrip and original bytes.
- `finalize.sh`: fresh 29-lane frontier comparison, tokenizer checks, separate
  bounded reader coverage and generalized source-role leader census.
- `portfolio.ts`, `portfolio.md`, `modal.py`: distinct executable mechanism
  controls and adversaries, not invented independent agents.
- `native/`: three prepared single-message prompts, all **NOT_RUN**. The verifier
  does not trim or repair responses. Program inversion is not native behavior.
- `speed-build.mjs`: bundle-only checkpoint-tail materialization experiment.
  Count/vector gates precede isolated cold ABBA trials on six whole-stack lanes.
  The patch is not applied to production, regardless of its local result.
- `receipts/hashes.json`: content hashes; generated bundles are ignored.

Fresh pricing: `npx esbuild bench/x180/worker.ts --bundle --platform=node
--format=esm --outfile=bench/x180/worker.mjs`, bundle x164/frontier.ts into
x180/frontier.mjs, then `python3 bench/x180/run.py`. Do not overwrite receipts
while another run is active. `sh bench/x180/validate.sh` validates completed
receipts; `python3 bench/x180/runtime-run.py` must run without competing work;
`python3 bench/x180/summarize.py` refreshes summary and hashes.

## Fresh frontier and verification correction

All **29 wires are identical**, totaling **11,962 tokens**. Source-role totals:
PROSE 2018→1770; OPS 22332→8078; CODE/STRUCT 3152→2013; OTHER 513→101.
Largest absolute source savings remain email, ls-l, JSON and cue respectively;
ops relative leader is prices 582→118. This is fixture description, not codec
ablation or a global optimum.

Final source/unit screen: **5,941 checks / 32 sources**. Separate Python omission
checks: **5,821**, including all five completed paid wires. Python frontier
reader: **22 exact / 7 unsupported / 0 mismatches**.

**Correction to earlier TypeScript coverage reporting:** `readPlainParent`
returns non-source bytes on eight frontier envelopes rather than throwing:
**21 exact / 0 exceptions / 8 mismatches**. `antikleisParentRead` gives
**23 exact / 0 exceptions / 6 mismatches**. These bounded readers can pass through
unhandled grammar, so treating every return as a successful decode is wrong.
The earlier harness's “unsupported” label concealed that distinction. The first
stricter X180 gate failed on df-h; its failure log is retained. The revised
harness explicitly records all mismatches and reports `allReaderBytesPass=false`;
its successful process exit certifies price/transport checks and completion of
diagnostics, **not** an all-source reader pass. Production reader code is
unchanged. Neither canonical self-report nor unchanged wires fixes this gap.

## Whole-stack speed outcome

The bounded-tail materialization patch is **rejected**: 24 identical ABBA wires,
aggregate CPU B/A **1.010697**, wall B/A **1.007261**, with protected-lane
regressions. It is slightly slower overall in this run, not a significant speed
improvement. The count gate covered 16,192 checks across both tokenizers; A/B
count and vector outputs match. TypeScript compilation and the app build pass.
No speed patch is promoted. Isolated ABBA started after pricing, canonical replay
and validation finished; only lightweight receipt/document inspection overlapped.

## Unclosed obligations

No broad paid gains, direct native execution, exhaustive all-stack originality,
or exhaustive lab-proof validation. Pricing CPU measurements overlap build/test
work and are not isolated performance evidence. Exact canonical replay and a
merged PR cannot close these gaps. Highest-information next engineering test is a bounded parent-search profile
on the unresolved ls-l case, identifying which proposal stages consume its
budget before choosing another timeout. Any narrow ops win would still leave
the missing prose and native gates. Blindly increasing timeouts again is lower
information than diagnosing the parent bottleneck.
