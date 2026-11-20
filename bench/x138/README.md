# X138 — SYNAPHE overlap-macro experiment

**Implemented, tested, unwired. No new Pareto winner; do not merge.**

## Fresh shipped frontier — reconfirmed

The full TAGSTACK run completed with exit 0: **29 lanes, 11,962 tokens,
902,805 ms**. Every emitted message is identical to X137. All 29 inherited
`decoded` values match source bytes; the independent Python CHIRON/STELI
reader still covers **21/29**, not all composed formats. The unsupported eight
are not declared corrupt. Timing variation is not claimed as acceleration.

This is the shipped configuration, not PTYCHE's experimental 11,950-token
selection or KREMA's offline 11,947-token selection. X138 does not wire either
experimental codec into defaults.

## New repository codec: SYNAPHE (junction)

File: `src/lib/omega/synaphe.ts`.

Ordinary macros concatenate expansions. SYNAPHE instead scans the body and,
for each macro, removes from its expansion the **longest prefix already equal
to a suffix of the output so far**. Dictionary definitions themselves still
expand ordinarily and recursively. Literal characters append unchanged.

Example (unit attack, not a real workload gain): definitions a=abc, b=bcd;
ordinary ab yields abcbcd, overlap ab yields abcd. Repeated a may append nothing;
this is why the encoder checks exact source-prefix transitions rather than
silently applying the operator to an existing body.

The encoder reuses the parent's dictionary and reparses its decoded layer with
exact-prefix-price heuristic search. One emitted spelling is retained per
source position, so it is **not a globally BPE-optimal dynamic program**. Every
trial is fully repriced by the reference tokenizer and decoded. Public
admission is strictly below the complete input message, otherwise null/fallback.

This is different from merely allowing overlapping candidates during mining,
which still emits disjoint ordinary substitutions, or CTXCOPY's external-chat
reference. Suffix-prefix overlap itself is old. All 361 top-level TS files were
hashed and lexically screened; focused comparisons include MORPH, ALLOMORPH,
CTXCopy, EUROS, VELTISTOS, SYNKRISIS and the layout family. **An exhaustive
all-codec semantic novelty proof is not complete.** No world-first or hidden
“AI-only” discovery is claimed.

## New codec results: negative, including matched controls

On 18 eligible canonical lanes (11 unsupported):

| Trial family | Trials | Wins | Sum of candidate-minus-baseline tokens |
|---|---:|---:|---:|
| Ordinary concatenation, same dictionary/search, original parent header | 18 | 0 | +400 |
| SYNAPHE maximal overlap | 18 | 0 | +1,089 |

These sums are over eligible trials, not a new 29-lane frontier. Strict admission
retains the original messages. Canonical overlap examples: KB article 620→656,
Node help 846→949, email 486→537, LLM answer 664→734. Extra opportunities in the
parse graph do not by themselves pay for the contract or outperform the parent's
existing wire optimization.

## Prospective heldout tests: a useful old-codec result, not a new-codec win

Three real command captures were frozen before eligibility/pricing: `curl
--help all`, `git diff -h`, `tar --help`, LC_ALL=C, first 120 lines. Full captures,
SHA-256 hashes, cap policy and the corrected stderr capture for Git are retained.
These are distinct from the overlapping Node fixtures used last turn.

| Source | Shipped parent | New SYNAPHE | Existing KREMA | Existing WRAPCANON |
|---|---:|---:|---:|---:|
| curl help | 1,425 | 1,478 | 1,467 | 1,442 |
| git diff help | 316 | 361 | 359 | 332 |
| tar help | 1,028 | 1,117 | **1,007** | 1,044 |

**The −21-token tar result belongs to X137 KREMA**, not SYNAPHE. Both layout
controls use the same parent and the selected width, with fused contracts.
The independent Python layout reader verifies all three KREMA candidates.
This is real additional heldout evidence for KREMA, but not general prose
coverage or native LLM verification.

The existing fast KREMA arm produces tar at **1,038**, worse than the 1,028-token
baseline despite less computation; it is ineligible on the other two. Full
KREMA tar trial observed ~49,741 ms baseline plus ~27,998 ms candidate-parent
work (planning not included in those two numbers). Hence the compressed
candidate is not a whole-stack Pareto speedup. Those heldout times overlapped
the frontier run and are not a causal speed comparison.

## Verification, controls and timing

- **16,167 checks**, mostly exhaustive small binary-pair overlap attacks; these
  are not manufactured workload wins.
- **21** independently implemented Python SYNAPHE message reconstructions:
  18 canonical + 3 heldout, source-byte exact.
- **4** independent existing-layout reconstructions: 3 full KREMA + tar fast arm.
- Full-message reference-token checks and TypeScript compiler pass.
- Reused 29-source Brotli/base64 control: **17,475 tokens**; backward-copy JSON:
  **23,576**; existing MORPH: **28,207**, all with executable exact inverses.
  None establishes native readability. MORPH's existing prompt explicitly asks
  reasoning in shorthand rather than exact reproduction: its applied arm is
  **contract-ineligible**, not an admissible native-output competitor. Semantic
  normalization has an explicit noninjectivity counterexample rather than a fake gain.
- `endtoend.ts` runs full baseline versus full baseline plus SYNAPHE in AB/BA
  order, including rejected search, after frontier/heldout processes have exited.
  Final measurements are in `receipts/endtoend.jsonl` / `timing-summary.json`.
  KB mean A/B: 4,260.5/3,698.7 ms; LLM-answer: 10,133.6/9,330.9 ms.
  B added 270.3/241.6 ms of rejected candidate work yet happened to have lower
  total clocks: parent warm-up/variation dominates this two-sample comparison.
  Neither source changes tokens. These observations do **not** establish causal
  whole-stack acceleration, a universal CPU bound, or Pareto superiority.

The public codec was repaired to reject unknown parent instructions rather than
discard them. A new reverse-instruction attack covers this fix. Input-length
refusal has an oversized-wire attack. All affected canonical and heldout prices
were rebuilt/recomputed; old raw trial receipts remain for comparison.

## Native decoding: not verified

No blind native-model endpoint was available. This assistant's source-aware
self-review is not a blind one-message experiment. Program inverses do **not**
confirm that an LLM, including this assistant, will reproduce every byte unaided.

The independently program-checked, useful **existing KREMA tar** message is
prepared in `receipts/native-existing-krema-message.txt`, with hashes/protocol in
`native-trial.json` marked **NOT RUN**. Reused `verify_native.py` scores a supplied
raw response; it does not invoke a model or establish blind collection. Previous
831-token KREMA and 608-token PTYCHE native packages remain separate unanswered
questions. Do not merge on their programmatic checks alone.

## Generalized local leaders

Regenerated `receipts/leaders.json` from the fresh 29 messages:

| Category | Lanes | Raw tokens | Shipped tokens | Leading body-token class |
|---|---:|---:|---:|---|
| PROSE | 5 | 5,856 | 3,429 | word-like 1,629 |
| OPS/TABULAR | 16 | 17,278 | 5,580 | glyph-bearing 1,202 |
| CODE/STRUCT | 4 | 4,152 | 2,636 | word-like 945 |
| OTHER | 4 | 729 | 317 | no dictionary tapes |

These inherited category labels are retained for comparability (including Node
help in PROSE). Each lane's classes/costs are in JSON. For the new OPS/help set,
local token-price leaders are parent for curl/Git and KREMA for tar; behavioral
and runtime dimensions remain separate. Body classes are not lower bounds.

## Reproduce / inspect

Bundle any TS harness with installed esbuild:
`node_modules/.bin/esbuild bench/x138/NAME.ts --bundle --platform=node
--format=esm --outfile=bench/x138/NAME.mjs`, then run Node. Bundles are ignored.
`frontier.ts` overwrites its receipt. `heldout.ts` appends baseline rows; use a
fresh output file for deliberate repeat experiments. `probe.ts` uses frozen X137
messages, checked identical by the fresh run; output goes to probe-repaired.
`reprice_heldout.ts` repeats final-code trials on saved heldout baselines.
Run `unit.ts`, `coldread.py`, `summarize.py`; leaders and baseline-independent
checks reuse X134/X135 harnesses. Exact commands/outputs are preserved by scripts
and receipt files. Manifests are unchanged.

`REVIEW.md` contains A–J formal/access/resource/quantifier model, seven mechanism
branches, 24 false-solution forms, candidate-specific attacks, repairs and gates.
`research.md` contains live references, deeper lab statement/proof-scope audits
and explicit non-verification. No theorem checker or independent agent ran.

## Decision / next highest-information test

No new Pareto-superior codec has been demonstrated. SYNAPHE is an executable
negative result, not an accepted winner. PR #74 remains open/draft; no commit,
promotion or merge. The next useful new-mechanism experiment is jointly mining
an overlap-compatible dictionary versus an equally budgeted concatenative one,
not relabeling the successful existing KREMA tar result. First gate token price;
only a price winner merits the unavailable blinded native trial and a larger
isolated end-to-end timing study.
