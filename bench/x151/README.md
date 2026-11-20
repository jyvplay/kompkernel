# X151 — grammar-order carrier and scorer boundary repair

**No Pareto improvement established; do not merge PR 76.** New experimental repo
codec: `src/lib/omega/diathesis.ts`, unwired. The genuine result is a negative
complete-parent experiment plus two reproduced and repaired scorer defects.
No significant whole-stack acceleration or native single-chat decoding is claimed.

## A–B. Formal model and admissible objects

Sources are UTF-8-stable strings backed by fixture bytes. E produces a complete
ordinary-text message including every instruction. D must reconstruct the original
bytes from that message alone, without encoder state, external dictionary, skill,
system prompt or trained vocabulary. Domain of DIATHESIS: at most 50,000 JS code
units, no `~`, a lowercase 7–16-hex fragment containing both letters and digits,
and a supported source-readable parent with an independent contiguous rule window.
Unsupported cases fail closed. This is a partial experimental transform with an
incumbent fallback, not a total universal compressor.

## C–F. Access, cost, success, boundaries

The encoder may inspect source, current whole-stack incumbent and folded parent.
The decoder receives only final message. Count `o200k_base` tokens of the COMPLETE
message; separately record CPU milliseconds, wall milliseconds and tested fidelity.
No free protocol, custom token-ID submission, amortized dictionary, source-supplied
answer, or hidden repair is permitted. Zero byte errors are tolerated.

Existential compression target: there exists one implemented mechanism E such that
for every evaluated input its selected output has exact source recovery and no
higher full-message token cost, and for at least one ordinary-work held-out lane it
saves >10 tokens against the whole incumbent. Native reading additionally needs an
independent basic single-chat test on emitted wires; a program inverse does not
satisfy it. Speed superiority additionally needs isolated comparable repeated
whole-stack runs, unchanged search budgets and exact wires, not a favorable profile.
No theorem or experiment in this turn establishes all these conditions.

H+: a qualifying codec exists — still possible, not established here.
H−: impossible under the complete contract — not established for this fixture domain.
H∂: permutation capacity exists but net gains/readability depend on protocol cost,
parent topology and tokenizer adjacency — demonstrated boundary, not full success.
Evidence threshold for deployment is all mandatory gates, not majority votes.

Adjacent problems not substituted: byte compression, lossy summary, semantic answer
accuracy, capacity/steganography, tokenizer retraining, custom segmentation, oracle
model prediction, dictionary amortization, mathematical proof search, raw pre-fold
savings, synthetic comparator wins and local microbenchmark acceleration.

## Results and receipts

Baseline reconfirmation before scorer patch: **29/29 wires identical to X150;
11,962 tokens**, both workers exit zero, 877,105 ms elapsed. See
`receipts/frontier-compare.json` and `receipts/frontier-wall.txt`. This concurrent run is
not a speed comparison. `frontier-gate.json`: all 29 prices/token round trips pass;
bounded repository reader matches original bytes on 21, reports 8 unsupported.

| Real lane | Incumbent | Folded parent | Complete DIATHESIS | Decision |
|---|---:|---:|---:|---|
| ps-aux-real | 980 | 994 | 1062 | reject: 82 tokens worse |
| kubectl-get-pods | 300 | 319 | unavailable | no supported feasible carrier |

`independent.py` independently reads the actual ps-aux envelope into 6,590 source
bytes, SHA-256 `b54eaf4147ffa2c62b3a0e4f4f3abbe4ec81ff4b5faf086ca4d1f23a99fbd07f`.
It also reads the unit envelope. This reader supports only a narrow Cyrillic,
operator-free parent subset. DIATHESIS units: 5,928 assertions. The 126-token
synthetic result and deliberately inflated comparator are NOT frontier evidence.
Native-chat gate remains **NOT_RUN**; factoradic arithmetic is a substantial risk.

### Scorer repair, not speed claim

Generation stamp previously exceeded signed Int32 range: injected initial counter
2147483646, unchanged algorithm gave expected 13 at the boundary but erroneous 21
on the next call. `generation-boundary-before.json`. Capacity 65,537 previously
threw `state2.patternSlots[i] is not iterable`. These are executable boundary
states, not a claim to have run 2^31 production calls.

Repair: dynamically grow all four scratch arrays and clear generation stamps before
signed overflow. Both reproducers pass afterward. 70 additional checks cover both
scorers, 0/1/65535/65536/65537/70000/3 patterns, duplicate changed slots, committed
cost arrays, no-op and large-then-small reuse. This adds a capacity check; it is not
a speed optimization. Full repaired frontier rerun completed: **29/29 byte-identical wires, 11,962
tokens**, both workers exit zero, 884,245 ms concurrent wall time; see
`receipts/repaired-compare.json` and `repaired-wall.txt`. This is fidelity evidence,
not controlled speed evidence. TypeScript and Vite build pass; CSS warnings remain in build output.

## E–G. Six mechanism-distinct research tracks

These tracks are distinct constructions, not six new implemented codecs. Only the
first is a new codec module; duplication and negative results are retained.

| Track / central construction | Concrete artifact and established portion | Gap; cheapest falsifier; structure-specific attacker |
|---|---|---|
| Permutation slack in grammar | DIATHESIS module, real parent trials, independent Python reader; independent rules commute and rank stores 28 bits | Net cost/readability (original goal); full-wire trial already falsifies gain on ps-aux. Attack dependencies, marker collisions, order/rank ambiguity and leading zeroes. |
| Decoder-contract shortening | `contracts.ts`, `receipts/contracts.log`: isolated alternative costs 9 vs 10 tokens | Semantic equivalence and full-parent price (local plus behavioral gap); ambiguous replacement scope is cheapest falsifier. Attacker uses nested keys and literal `=`. Not deployed. |
| Checksum redundancy | Repository x55/x56 audit, `research.md`; known ISBN modulo rule | Existing idea, invalid/rounded data and fixed-key overhead; counterexample: arbitrary identifier whose last digit differs from checksum must be retained. No gain claim or invented ground truth. |
| Prose initialism entailment | Holdout census found only md-vite HMR; counterexample: `Hot Module Replacement (hmr)` vs `(HMR)` | Capitalization and exception residual (local); dropping acronym case merges different byte sources. Existing semantic codecs complicate novelty; not implemented anew. |
| Cross-column prediction | LogReducer/LogBlock audit; previous POLYSTELI split receipts (1046 vs 980 complete ps-aux) | Existing grid/delta coverage, protocol and exceptions; independent numeric mismatch destroys zero-residual assumption. Raw fold is not full-parent improvement. |
| Token segmentation/control | PathPiece/optimal segmentation source assessment; exact host interface counterexample below | Access-model boundary, not missing search. A different segmentation of identical text cannot change the server's deterministic tokenizer output. No custom token-ID access in basic chat. |

Token-interface counterexample/causal model: if the UI submits only string s and
server tokenizer is T, choosing client segmentation P(s) leaves the received T(s)
unchanged. Thus optimization of P alone has zero causal effect on counted tokens.
A server supporting explicit token IDs would be a different access model.

All candidates are attacked against global parent compatibility, not merely their
local inverse. A rank-capacity theorem has no implication that a model executes
that arithmetic, or that n! equivalent grammars have equal token price.

## D. Deceptive results and modal-shortcut detector

Reject: (1) raw fold savings; (2) dictionary excluded; (3) synthetic inflated
incumbent; (4) encoder `exact` self-report; (5) byte count instead of tokens;
(6) lossy semantic accuracy; (7) parser inverse as model behavior; (8) incomplete
frontier; (9) changed source; (10) normalized newline/case; (11) memo-warmed timing;
(12) concurrent timing as isolated speed; (13) larger search budget disguised as
codec gain; (14) old codec rename; (15) unsupported reader counted as pass;
(16) theorem without hypotheses; (17) static theorem statement called proof;
(18) repaired code inheriting old receipts; (19) infinite arithmetic as reliable
single-chat capability; (20) reordered grammar presumed token-cost invariant.

Modal shortcut: “There exists a program inverse, therefore a basic-chat LLM can
reliably decode every emitted wire.” This changes both verifier and quantifiers.
`modal-gate.py` rejects both real trials despite synthetic invertibility; its
receipt explicitly marks native verification NOT_RUN. It detects evidentiary
substitution, not model errors. The missing behavioral test must be run independently.

## H–J. Verification, repair and next tests

Available and actually used: shell, git/gh, Node, esbuild/TypeScript, Python, Vite,
live web search and CPU profiler. Two frontier workers actually ran concurrently.
No independent agents, theorem provers, simulator, GPU or native model evaluation
was executed. See `research.md` for individual lab claims and unresolved checks.

Reproduction: bundle each `.ts` entry with `npx esbuild ... --bundle --platform=node
--format=esm --outfile=...mjs`; run with Node. `build-boundary.mjs` additionally
injects only the counter's initial state. Independent reader uses Python stdlib.
Parent trials use `parent-trial.ts`; canonical flags are set inside it and the
reused x149 worker. `compare-frontier.py` requires all 29 rows before comparison.
Generated bundles and profiler data are ignored, manifests unchanged.

Next highest-information test is NOT a larger factoradic benchmark: first find a
short self-contained order-carrier instruction whose meaning a fresh one-chat
reader actually executes, then rerun full-parent trials with all protocol included.
If no such contract survives, abandon this mechanism for the stated interface.
The present 82-token loss cannot be relabeled a Pareto gain. Keep the PR draft.

## Local leaders

Because all baseline wires match, `receipts/local-leaders.json` and `leaders.json`
are carried forward with that explicit identity check, not claimed as new ablations.
Prose: 5 lanes, 5856 raw / 3429 output, tape-body word class leader. Ops/tabular:
16 lanes, 17278 / 5580, glyph leader. Code/structured: 4 lanes, 4152 / 2636, word
leader. Other: 4 lanes, 729 / 317, no tape. Largest absolute savings include apt-real
2739→813, ls-l 5194→1310, json-pkg 1152→653, cue-sheet 513→101. These are category
fixture leaders relative to raw, not proof of globally optimal codecs.
