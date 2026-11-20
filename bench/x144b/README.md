# X144b — transport-safe admission and COLEX

This continues X144 without overwriting its negative PSIFIDA receipts. It implements the prior highest-priority correctness task and adds a separately tested new codec candidate. **No native LLM verification or new Pareto superiority is claimed.**

## Production correctness repair
TAGSTACK now rejects transport-unstable complete candidate messages at the base comparator, table candidate, ordinary and parent-relative admission, and the three direct rewrite sites. If no valid base parent remains, it retains raw identity. It rejects lone-surrogate source strings. The check is independent of existing `decoded === source` checks: an inverse in JavaScript does not ensure a wire survives UTF-8.

Freshly re-encoding the three previous heldouts gives Vite **253 unsafe → 274 safe**, Drizzle **643→643**, git-log **43→43**. Vite's new result is raw identity selected from the valid alternatives, not a token improvement. Memo on/off checks reproduce the safe result. Six extra end-to-end surrogate/CRLF/NUL/ZWJ/boundary-scalar attacks pass. The previous opt-in guard is now part of candidate selection; unsafe competitors cannot displace an already valid incumbent.

## New codec: COLEX
`src/lib/omega/colex.ts` reverses separator-delimited components inside maximal ASCII lexemes. Separator choices are slash, hyphen, underscore and dot; empty components are preserved. This is an involution: reverse the same component list twice. It differs from document rotation, field permutation, history-based lexical edits and digit-plane weaving. It has classical suffix/colex-locality ancestry; no claim of novel mathematics, training-data novelty, or exhaustive absence of all equivalent stack mechanisms.

Non-greedy standalone enumeration of four separators, complete instruction-inclusive token pricing, identity fallback. Parent trial allocation is heuristic (best standalone arm on each fixed prose/ops source); it is not an optimal search over all representations. Input cap 50,000 UTF-16 units; CPU-bound O(4L) scans plus tokenizer calls, parent runtime dominated by inherited TAGSTACK work. Invalid UTF-8 sources and reserved envelopes reject. New codec remains **unwired**.

Canonical parent prices:

| Lane | Shipped | COLEX composed |
|---|---:|---:|
| apt | 813 | 881 |
| KB prose | 620 | 661 |
| email | 486 | 536 |
| du | 266 | 324 |

Standalone: 81 trials, zero wins. Fresh clsx README and actual npm-ls heldouts add six standalone and two composed trials: clsx 523→560, npm-ls 126→165. Thus **93 new complete prices / zero frontier wins**. No winner is deployed.

## Validation and tools
74,131 codec/transport unit assertions over 510 text fixtures plus single-code-unit transport tests; six end-to-end admission fixtures and memo checks; actual source/UTF-8-message/reference-tokenizer gates; independent Python message reader. Unsupported reader cases remain unsupported, not passes. The reused probe initially omitted COLEX's separator argument, threw, and was corrected; a missing-separator attack was added and all affected probes rerun.

Available tools: shell, Node/TypeScript, esbuild/Vite, Python, Git/GitHub, web tools. No independent agent, simulator, external database, installed Lean/Lake, or blind native LLM endpoint was established. Frozen KREMA/PTYCHE packet hashes match, but native trials remain NOT_RUN.

Six mechanism tracks were rerun using existing scripts: COLEX; positional copying; Brotli/base64; numeric differences; transformed phrase images; paragraph layout. `REVIEW.md` supplies formal objects, quantifier order, thresholds, 21 false-solution shapes, specific adversaries and exact gaps. `research.md` records new searches and carefully scoped individual lab-statement checks; it is not an exhaustive proof review.

## Speed and final frontier
The safety predicate's optional native-regex fast path is compared against its JavaScript scan in isolated ABBA/BAAB *whole encoder* calls. This comparison measures two implementations of the repaired gate, not a comparison against the old unsafe stack. Timings are warm-process, deterministic, with the same memo configuration; no microbench is substituted for whole-stack evidence. Final numbers and category leaders are in receipts.

Merge permission is taken from the latest explicit end-of-turn merge request; it does not certify a compression breakthrough. Merge the tested correctness repair and research artifacts, keep losing codecs unwired, and state all remaining gates. The most informative missing behavioral test is still a genuine blind one-chat read of the frozen KREMA/PTYCHE packets.

Fast-scan acceptance is declared before its timing run: all three lane totals
must not regress, and at least one must improve by >=5%; a *broad significant*
claim additionally requires >=10% on every lane. Otherwise preserve the simple
scan in production and retain the optimized comparator only as an experiment.

## Final gates and deployment decision
Fresh canonical frontier: **29 lanes / 11,962 tokens**, all messages identical to
X144. Category totals unchanged: PROSE 3429 (wordlike leader), OPS/TABULAR 5580
(glyph leader), CODE/STRUCT 2636 (wordlike leader), OTHER 317 (no tape-class
leader). These empirical categories are not compression lower bounds.

All **93 COLEX candidate messages** reconstruct source bytes under the independent
Python reader. Final gate: **127 full-message prices, 127 UTF-8 wire round trips,
127 tokenizer-ID round trips, 119 supported source-byte reads, 8 unsupported
inherited formats**. Unsupported formats do not count as verification passes.
74,131 unit assertions and 171,072 two-arm transport-predicate comparisons pass;
TypeScript and the serial production build pass.

The native-regex fast scan **failed** its predeclared speed gate: full-stack B/A
totals were 0.97985 (KB), 1.03268 (ps), 1.02127 (metrics), with identical messages
and sources in all 24 timing calls. The fast path was removed from production;
only its reproducible experiment patch remains. Both predicate arms, the actual
encoder repair/memo attacks, unit gates, final wire/source gates, TypeScript and
build were rerun after removal. The production fix uses the simple surrogate
scan. No significant broad speedup is established.

The actual result is a transport-admission correctness repair and another
negative codec experiment, **not** the requested new Pareto-superior codec.
Native LLM reconstruction and theorem-prover verification remain NOT_RUN.

The measured parent-payload-only savings were at most six tokens (clsx), while
the observed additional COLEX instruction cost was 43 tokens in each composed
trial. Even inadmissibly omitting that instruction would not produce an >10-token
win on these measured arms. This is not a theorem about all possible keys or
representations; it explains why header shortening alone has weak evidence here.
`receipts/header-audit.json` records the exact decomposition.

Reproduction: after `npm ci`, `bash bench/x144b/run.sh` runs the experiments
serially. This combined script was assembled and syntax-checked; its constituent
commands were executed individually this turn, not the combined script itself.
