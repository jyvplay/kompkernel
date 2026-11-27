# X191 — DIEXODOS: unique fixed-length graph bridges

## Decision and scope

A new experimental repo codec is implemented in `src/lib/omega/diexodos.ts`.
It is **unwired**. Broad fully-paid Pareto superiority, all-stack novelty and
native basic-chat decoding are **not established**. No production tokenizer or
codec selector is changed. Publishing this work is not acceptance of the user's
requested breakthrough.

DIEXODOS transmits a directed field-adjacency relation, literal gap endpoints,
and the count of missing fields. It erases a span only if there is exactly one
walk of the required length connecting its endpoints. The right endpoint can
resolve a genuine branch, rather than predict the next field causally. Every
label, edge, marker, key and parent instruction is paid.

MONODROMOS consumes an edge multiset at fixed multiplicities; DIEXODOS reuses
relation edges and constrains path length and endpoints instead. METRIDA already
uses unique constraint solutions; DIEXODOS does not invent constrained decoding.
`novelty.md` distinguishes these local operations and explains why 437 module
headers/hashes are not an all-stack semantic novelty certificate.

## Codec tests and repair

- 37-source screen; final planner creates **43 distinct plans**.
- **23,001 JS checks**, including 18,432 exhaustive comparisons of all directed
  three-vertex graphs, all endpoint pairs and gap lengths 1..4 against brute
  force; additional edge-pruning witness checks and boundary cases.
- **23 malformed frames rejected** by both TypeScript and the separately written
  Python inverse. Final Python results are in `receipts/independent.json`.
- Two newly fetched full documents—Git credentials and Rust structs—both produce
  no plan. This is negative discovery evidence, not held-out superiority.
- No standalone DIEXODOS complete message beats raw source on the tested corpus.

The first screen included unused graph edges. A repair keeps exactly the union
of edges on selected bridge witnesses. Deleting unused edges cannot introduce
another walk and preserves every selected path. The planner checks that property
again. New exhaustive witness-subgraph attacks were added, and the codec,
Python and paid-parent gates rerun. Initial receipts are under `receipts/initial`
and are **not attributed to the repaired implementation**. A test-file bracket
syntax error was caught by esbuild while adding boundary attacks, corrected,
and the affected tests rerun.

## Fully paid parent measurements

Both initial and repaired phases run the actual production TAGSTACK parent with
strict source-reader checks; each job has a 180-second cap and concurrency two.
The selected plan is the cheapest standalone plan, not an exhaustive parent-cost
search. Timeouts, reader refusals and exact candidates are reported separately.
Final totals and comparisons are in `receipts/summary.json`; source-readable
candidates are accepted for comparison only when the source bytes match.
Initial phase: 11 jobs, nine complete/two timeouts; seven readable and two
unsupported parent envelopes. None of its canonical readable candidates wins.

The two raw wins in the separate five-probe portfolio (last-seen distance on apt,
parity on metrics) are not DIEXODOS wins and not frontier wins. See `portfolio.md`.
Those classical probes are five independently implemented representation controls,
not five claimed new codec inventions. Together with DIEXODOS they test six
distinct mechanisms, but do not fulfill a claim of six all-stack-new ideas.

## Frontier and local leaders

The canonical replay is fresh, using the same deterministic configuration and
29-lane manifest as X190. `finalize.py` requires identical full messages, token
counts and original source bytes before emitting the final summary/leaders.
`leaders.json` groups the finite corpus into PROSE, OPS/TABULAR, CODE/STRUCT and
OTHER, with both absolute and relative savings. These are local leaders only,
not a universal optimality claim or a ranked database of every experimental codec.

## Speed: rejected, not shipped

A separate isolated-bundle experiment replaces the two-UTF16-chunk count Map
with bounded lazy 16+16-bit pages. Exact keys, values and cache-clear semantics
are retained; memory is capped at 128 × 65,536 byte pages plus the page index.
This is a cache experiment, not a changed token vocabulary or reduced search.
All count/vector/merge/threshold/pair gates passed for A and B; the new pair
attack has 18,612 checks including signed keys, page turnover, clears and both
encodings. Whole-stack six-lane ABBA produced **24 identical wires** but:

- CPU B/A **1.359957** (about 36% slower).
- Wall B/A **1.349171** (about 35% slower).
- Every tested lane regressed. The significant-speed gate **failed**.

No production patch adopted. Canonical replay nodes were explicitly paused for
the isolated runtime trial and resumed afterward; the node commands and states
are recorded. Overlapping frontier/paid/test timings are not speed evidence.

## Native one-chat gate

No independent fresh-chat model endpoint was exposed or invoked. The current
assistant cannot honestly certify its own source blindness or universally
confirm native decoding. Executable inverse success is not model behavior.

`native_eval.py` prepares a source-blind packet only after 29 distinct canonical
rows exist, adding repaired candidates that both executable readers accept.
The operator must give only public message bytes to a fresh basic chat, without
source files, skills, tools or system additions, retain raw unedited responses,
and supply model/configuration/time/isolation metadata. The private manifest and
repository are not for the participant. Metadata is operator-supplied, not
authenticated. Fourteen synthetic scorer/modal/frontier checks passed; none is
a model response. See `native/status.json` for packet counts and NOT_RUN status.

Highest-information next test is still a real isolated native read of the frozen
messages. Scoring program-generated responses would not complete that task.

## Formal/research artifacts

- `model.md`: A–J contract, quantifiers, H+/H−/H∂, inverse proof, bounds, 20 false
  solution shapes and structure-specific attackers.
- `portfolio.md`: six independent constructions, artifacts, proofs/gaps and
  falsifiers; 187 real-source control messages and 217 checks.
- `research.md`: fresh primary/secondary sources with exact retrieval limits;
  deeper OpenAI/Anthropic proof interfaces, doubleAI graph counterexample,
  DeepMind specification trust base and individual additional-lab queries.
- `math-sanity.py`: 2,916 finite exact-integer inertia-inequality checks plus
  concrete high-girth and modal counterexamples. Not a Lean/kernel replay.
- `receipts/environment.json`: actual tool versions. No independent agents,
  theorem prover, external expert or simulator used.

## Reproduction

```
npm ci --ignore-scripts
npx esbuild bench/x191/test.ts --bundle --platform=node --format=esm --outfile=bench/x191/test.mjs
node bench/x191/test.mjs
python3 bench/x191/portfolio.py
npx esbuild bench/x191/heldout.ts --bundle --platform=node --format=esm --outfile=bench/x191/heldout.mjs
node bench/x191/heldout.mjs
npx esbuild bench/x191/worker.ts --bundle --platform=node --format=esm --outfile=bench/x191/worker.mjs
python3 bench/x191/paid-run.py
python3 bench/x191/independent.py
node bench/x191/speed-build.mjs
# No competing benchmark/build jobs:
python3 bench/x191/runtime-run.py
python3 bench/x191/finalize.py
python3 bench/x191/native_eval.py selftest
# Build refuses an existing frozen packet:
python3 bench/x191/native_eval.py build
python3 bench/x191/retrieve-sources.py
python3 bench/x191/validate.py
python3 bench/x191/hashes.py --verify
```

Canonical runner resumes only missing rows. To intentionally repeat it, archive
the current receipts, initialize an empty frontier.jsonl, bundle
`bench/x164/frontier.ts` to `bench/x191/frontier.mjs`, and run
`python3 bench/x191/frontier-run.py`. Paid reruns overwrite their phase receipts;
each output file is removed before launching its job so a timeout cannot inherit
an old success. Archive first if retaining a phase. Generated bundles and retrieved
proof sources are ignored; pinned retrieval/hash scripts are included.

## Final measured ledger

Repaired paid phase: **11 jobs, ten complete, one timeout**. Nine completed
messages were byte-exact through both executable readers; one historical
heldout parent envelope was refused. **No canonical wins.**

| Source | Fresh canonical | Repaired DIEXODOS | Status |
|---|---:|---:|---|
| ps-aux-real.txt | 980 | 1118 | exact |
| ls-real.txt | 414 | 551 | exact |
| llm-answer.md | 664 | 816 | exact |
| email-thread.txt | 486 | 629 | exact |
| code-ts.txt | 949 | 1171 | exact |
| node-help.txt | 846 | 994 | exact |
| ps-ef.txt | 296 | 417 | exact |
| unified-diff.patch | 411 | 567 | exact |
| vmstat.txt | 144 | 264 | exact |
| git_git-recover-corrupted-blob-object.adoc | not replayed | 1373 | reader-refused |

Fresh canonical: **29 identical messages / 11,962 tokens**. Separate Python
parent reading: **23 exact, six unsupported, zero mismatches**. Unsupported
canonical reader forms are not promoted to verified native behavior. Category
totals: prose 1,770; ops/tabular 8,078; code/structured 2,013; other 101.
Local leaders remain email 486, ls-l 1,310, JSON 653 and cue-sheet 101; prices
118. Full absolute/relative rankings are in `receipts/leaders.json`.

Final Python DIEXODOS inverse: **64 checks and 23 rejected malformed frames**.
Final source-blind packet: **38 messages (29 canonical + nine candidates)**,
no model responses. Seven validation commands passed, including TypeScript and
production Vite build. No theorem-kernel or native-chat verification claimed.
