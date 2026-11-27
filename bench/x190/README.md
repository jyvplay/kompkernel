# X190 — DIPIGI: two-parent lexical splice experiment

## Decision

New experimental codec implemented, **not production-wired and not accepted as
broadly superior**. Every completed, source-readable paid trial loses against
the canonical frontier. Native basic-chat decoding is **NOT_RUN**. All-stack
novelty is **NOT_ESTABLISHED**. Publication is not scientific acceptance.

DIPIGI makes a dictionary word from a prefix of one earlier word, a literal
middle, and a suffix of a different earlier word. The complete instruction,
roots, row addresses, lengths, middle strings and parent message are paid.
This is a new implementation, not a new mathematical primitive. It extends
one-parent lexical borrowing; general DAG/relative-compression ancestry remains.

## Completed codec evidence

- 37-source, six-comparator screen: **1,996 checks**, 300 DIPIGI plans,
  145 plans actually using two parents (39 ordinary, 106 forced).
- Separate Python inverse: **646 checks**, **19 malformed attacks rejected**;
  9 paid messages exact, 3 unsupported parent envelopes. Same agent, different
  implementation—not independent personnel or a native model.
- 16 parent jobs, concurrency two, each capped at 180 seconds: **12 complete,
  4 timeouts** (both modes on ps-aux and ls-l). Timeouts are not token losses.
- Standalone wins over raw input only: ls-l 5,194→4,667 ordinary (4,691 forced),
  metrics.tsv 811→797. Neither establishes a win over the parent frontier.

| Source | Canonical | Selected DIPIGI | Forced DIPIGI |
|---|---:|---:|---:|
| Email | 486 | 623 exact | 853 reader-refused |
| KB article | 620 | 758 exact | 1,031 reader-refused |
| LLM answer | 664 | 813 exact | 1,031 reader-refused |
| ps-real | 381 | 524 exact | 631 exact |
| JSON package | 653 | 780 exact | 997 exact |
| Unified diff | 411 | 568 exact | 679 exact |

Reader-refused means the bounded strict parent reader cannot justify source
recovery; the number is not an accepted lossless candidate. No >10-token prose
or ops improvement, held-out broad gain, or Pareto superiority is established.

## Replay and speed

`receipts/frontier.jsonl` is the fresh canonical replay, not historical reuse.
Finalization requires 29 identical wires against X189 and original source bytes.
`summary.json` and `leaders.json` are generated only after that check and the
runtime trial complete. Category leaders describe this finite corpus—not a
universal best codec. Prior narrow experiments do not replace the production
frontier without their own acceptance gates.

The UTF-8 scratch experiment changes only isolated bundles: short non-ASCII
chunks use TextEncoder.encodeInto in the existing scratch buffer, with a safe
three-bytes-per-UTF16-unit bound and fallback. Production tokenizer unchanged.
Count/vector/merge/threshold/UTF8 gates passed in both arms. Whole-stack runtime
uses six lanes × ABBA = 24 cold processes; canonical replay's remaining node is
stopped during the trial and resumed in finally. `runtime-summary.json` contains
CPU/wall ratios, every per-lane ratio, exact-wire checks and the ≥10% gate.
Measured B/A: CPU **0.970872** (2.91% lower), wall **0.973625** (2.64% lower),
24 identical wires. JSON regresses and the aggregate reduction is below 10%:
**speed gate rejected**, no production patch adopted. This single trial is not
a statistically established speedup. No speed claim follows merely from
correctness or allocation reduction.

Fresh canonical replay completed: **29/29 identical wires, 11,962 tokens**.
Category totals: prose 1,770; ops/tabular 8,078; code/structured 2,013; other 101.
Finite-corpus leaders remain email 486, ls-l 1,310, JSON 653 and cue-sheet 101;
prices.csv remains 118. Full absolute/relative leaders are in `leaders.json`.

## Native one-chat handoff

`native_eval.py` implements random public IDs, source/prompt digest checking,
raw-byte response scoring and required operator/model/config/time/isolation
metadata. Eleven synthetic scorer/modal checks passed; these are **not model
responses**. The frozen packet contains 38 messages (29 canonical, 9 separately executable-
readable candidates), never expected source bytes in the public folder.
The private grader manifest and repository sources must be inaccessible to the
reader. Operator metadata cannot authenticate provenance. No separate basic-chat
model endpoint was available through this session's tools, and none was invoked.

Highest-information next test: have an independent operator deliver each public
message in a fresh basic chat with no source, tools, skills or system additions;
retain unedited raw response bytes and metadata, then run the offline scorer.
The present assistant cannot act as that source-blind participant.

## A–J obligations, resets and remaining gaps

`model.md` specifies domain/access/quantifiers, H+/H−/H∂, thresholds, a constructive
inverse argument, work bounds, six distinct existing comparators, and twenty
false-solution shapes. `research.md` separates live retrieval, source inspection,
three executed external comparator-function probes and unrun proof kernels.
The 436-module header inventory is not an all-stack semantic novelty proof.
The six comparators are not six genuinely new inventions; that stronger request
remains unmet. No exhaustive audit of all labs or all newly solved mathematics
is claimed, and no full RH certificate was verified.

Repairs: native scorer was hardened against source/prompt drift, stale challenge
folders and contradictory expectations; rerun selftests after repairs. Forced
DIPIGI mode was introduced to exercise two-parent rows rather than count ordinary
literal dictionaries as evidence for the new mechanism. It received fresh JS and
Python gates. It did not turn losing paid results into a success.

## Reproduction

Dependencies: `npm ci --ignore-scripts`. Generated bundles are ignored.

```
npx esbuild bench/x190/test.ts --bundle --platform=node --format=esm --outfile=bench/x190/test.mjs
node bench/x190/test.mjs
npx esbuild bench/x190/worker.ts --bundle --platform=node --format=esm --outfile=bench/x190/worker.mjs
python3 bench/x190/paid-run.py
python3 bench/x190/independent.py
node bench/x190/speed-build.mjs
# With no competing benchmark/build processes:
python3 bench/x190/runtime-run.py
python3 bench/x190/finalize.py
python3 bench/x190/native_eval.py selftest
# Build only once; refuses existing packet:
python3 bench/x190/native_eval.py build
python3 bench/x190/retrieve-sources.py
python3 bench/x190/metric-gap.py
python3 bench/x190/validate.py
python3 bench/x190/hashes.py --verify
```

Canonical runner resumes missing lanes from receipts. For an intentionally new
replay, archive receipts first, initialize an empty frontier.jsonl, bundle
`bench/x164/frontier.ts` into `bench/x190/frontier.mjs`, then run
`python3 bench/x190/frontier-run.py`. This can be expensive; concurrency is not
speed evidence. Paid reruns overwrite their receipts. Hash verification checks
published files, not the truth of claims or model provenance.

Final validation: all six commands passed, including fresh JS/Python gates,
native scorer selftest, `tsc --noEmit` and production Vite build.
