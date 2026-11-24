# X172 — ICHNOS (experimental, unwired)

Scientific acceptance is **not established**. This turn adds an executable codec,
not just an essay. Token and runtime losses are not relabeled Pareto wins.

## Runtime honesty
Node/npm, Python, git/gh, TypeScript/esbuild, web search/fetch and process control
were used. No independent agent tool, simulator, external basic-chat model
endpoint or connected database was used. Lean/lake/coqc were absent. Compiled
inverse tests do not verify a language model. See research.md for individual
source-inspection scope, failures and unverified headlines.

## A. Formal model
Admissible source x is a UTF-8-stable string of at most50,000 UTF-16 code units.
The decoder gets only the complete in-band message, no original source, training,
skills.md, prior chat or hidden dictionary. A literal anchor is a maximal ASCII
letter run in a non-reference segment of the decoded payload. A reference is
`~` followed by a maximal ASCII letter run (1–100 letters). It names the **unique
distinct** anchor containing that fragment, case-sensitive, anywhere in the
payload, including later text. Duplicate occurrences of one anchor do not create
ambiguity. References are removed as word boundaries when collecting anchors;
replacement is simultaneous and output is not rescanned. Nonletters, CRLF,
Unicode, indentation and final-newline presence are literal. Invalid/ambiguous
or oversized expansions are refused.

All contract, reference, anchor and parent bytes are priced using o200k_base.
Anchors are an implicit paid dictionary, not free shared knowledge. Raw character
reduction, binary compression, downstream task accuracy, paraphrases, aggregate
BPE estimates and executable invertibility are adjacent but different problems.

Quantifiers: for every admitted x and every supplied incumbent b with a sound
reader R(b)=x, selector returns b or a fully priced candidate c whose reader
returns x and whose token count is strictly smaller. The claim is conditional
on R; it is not proof that any arbitrary parent decoder is sound. For native
success we need a fixed, identified basic-chat decoder L to reproduce original
bytes on preregistered heldouts, not merely existence of some executable D.
No universal shortening of all x or universal native success over all L is claimed.

## B. Outcome space and declared thresholds
H+: a novel mechanism can save >10 net tokens on multiple settings including
prose and ops, with independent original-byte verification, basic-chat native
decode success, and a significant whole-stack speed improvement.
Runtime threshold: six protected lanes in fresh-process ABBA order, identical
wire hashes, aggregate CPU and elapsed ratios<=0.90 and every lane<=1.0.
H− (universal impossibility) is NOT proved by failure of these candidates.
H-boundary: a format may be injective with an executable inverse yet fail native
readability or paid-token economics. Zero byte tolerance; no stripping output
fences or whitespace. Finite tests are not all-input theorems. A fallback gives
token nonregression but can still add encode time, so it is not Pareto by itself.

## C. Mechanism and bounded novelty review
ICHNOS: content-addressed **globally unique substrings of retained literal
words**. It transmits neither an assigned alias table nor occurrence tape.
A first literal occurrence of every original distinct word is retained, allowing
forward/backward references with the same static semantics. This differs from
MNEMA's latest-decoded-word prefix address: `~pha alpha` can refer forward here,
and `alpha alphabet ~pha` is rejected here rather than choosing the latest word.
It also differs from ANAPHORA explicit bindings, DEIKTIS occurrence choices,
KYKLOS cyclic state, METRIDA length constraints, GEFYRA neighbor insertion,
DIADOCHI successor queues, STOIBAS tree traversal and SYMFRAZ context sorting.
Search covered relevant terms across415modules and inspected nearby code; this
is not an exhaustive formal novelty proof or a new mathematical primitive.

Greedy: yes, local fragment choice. Rank24 frequent words (length<=100), enumerate
substrings of length1–4, require uniqueness among all original distinct words,
choose by isolated token cost, keep first occurrences, try margins0/1/2, then
price complete messages. Global best parsing/anchor placement is not solved.
At most one candidate reaches the expensive parent. The inverse scans distinct
anchors for each distinct fragment, O(F*n) character-search work in a simple
model, at most quadratic in the capped payload length, plus output. Planner
uses at most24*400 fragment proposals, each scanning the anchor vocabulary,
plus bounded token queries and source passes. Deterministic operation bounds,
not a guaranteed CPU/elapsed deadline; parent cost is additional.

## D. Negative space / modal firewall
`modal.py` executes27 deceptive-result shapes inherited from the prior schema:
payload-only pricing, weak baseline, normalization, self-report, program-as-native,
training leakage, symbol-to-token transfer, free header, free search, micro-as-whole,
contaminated timing, memo leakage, unsupported-as-pass, challenge-as-proof,
source-as-kernel, stale repair gates, restricted-family universalization,
finite-test universalization, character-as-token price, mismatched source,
aggregate-hidden regressions, NOT_RUN-as-pass, axiom-as-certificate,
undeclared-marker semantics, known-source-as-blind, niche-as-broad and repair trust.
It rejects an actual incomplete Pareto evidence record. Explicit decoder functions
show why `(exists D: D(c)=x)` does not imply `L(c)=x` for the target L. The schema
checks supplied flags; it does not parse arbitrary English or prove all omissions.

## E–G. Independent mechanism portfolio and structural attackers
Each arm starts from original sources, not another arm's alleged improvement.
Raw comparisons below are not incumbent comparisons. Full artifacts: portfolio.ts,
portfolio.json, weighted-test.ts, attractor.py, count/chunk gates and runtime logs.

| Branch | Construction and proved/tested part | Structure-specific attack / cheapest falsifier | Exact gap |
|---|---|---|---|
| ICHNOS | Unique content-addressed fragments; TS inverse and independent Python regex inverse | Two different anchors sharing fragment; lost-anchor cycles; forward refs; fragments spanning removed refs; case; >100-letter fragment | Paid parent/native gain is original target; shorter syntax is local repair |
| Weighted METRIDA | Sum(position*word length), bounded exhaustive assignments | Weights1+4=2+3 cause four-site collisions;5,858 oracle checks reject nonunique | Solves two-site swap only; longer uniqueness and paid overhead remain; not a new mechanism by renaming |
| Occurrence-choice tapes | Existing DEIKTIS;166plans with inverse checks | Missing/extra selector entries, skewed branch counts | Parent can already dictionary-compress; native tape accounting is original interface |
| Move-to-front recency | Local move-to-front queue,29plans and exact inverse | Repeated same word must move, punctuation must not alter queue; cold start | Numeric references cost tokens; not claimed novel |
| BWT/block sorting | Existing X165 transform,34 complete round trips | Repeated rotations / wrong primary index | Index and inversion contract paid; native inverse not shown |
| Colexicographic components | Existing COLEX involution,101plans | Empty components, separator collisions, punctuation scope | No new mathematics; one raw ops win is not broad frontier gain |
| Attractor coverage | Exact exhaustive subset search on510binary sources,9,762 checks | `aaaa` and `bbbb` both have attractor{0}; positions do not identify source | Must transmit literals/copy structure; full coding gap, not a local proof omission |
| Known-pretoken counting | Benchmark-only direct chunk counting instead of repeated splitting | Chunk partition vs arbitrary short input, contractions, whitespace, surrogates, stale buffers | Counts pass but runtime fails; production unchanged |

Existing MNEMA is also screened as the nearest control; its51plans outperform
ICHNOS on several raw comparisons. LEXARITHMOS has no eligible plans in this
portfolio. None of those prior mechanisms is advertised as newly invented.

## H. Evidence and independent verification
Current v2:9,322 unit/transport/token checks;3,231 saved inverse pairs;
37 corpus sources including three freshly retrieved whole documents. Independent
Python inverse:3,275checks including12complete base/candidate parent wires,
zero errors. Six paid-parent trials all lose: email486→563, KB620→687, ps381→462,
JSON653→713, TypeScript949→1019, diff411→472. Selector gate48checks passed.
Corpus screen:27plans, only one raw win (ls-l,211tokens), not a frontier win.
Fresh Python exceptions, Rust borrowing and Kubernetes service-debugging sources
are pinned with hashes/licenses; the Python source has no eligible plan, Rust
and Kubernetes inflate raw prices. They were not model-blinded.

Weighted control:218plans across34sources, zero raw wins; two-site swap repaired
but four-site collision persists. No claim of universal uniqueness.
Count gates A/B:16,192each; boundary target B:2,880; direct-chunk gate8,607checks
on2,869distinct observed chunks. Six-lane ABBA:24identical wires, CPU1.010512,
wall1.010013. **Speed rejected**, with protected-lane regressions. Source and
wire equality are necessary but not enough for performance acceptance.

## I. Repair ledger
v1 used `~fragment;`. Its semicolon cost limited eligible plans; original code,
tests and receipts are preserved under `ichnos-v1.ts.txt`, `test-v1.ts.txt`,
`independent-v1.py.txt` and receipts/v1. v2 uses maximal-letter references.
Unit, portfolio, independent inverse and paid-parent gates are rerun, not
inherited. New attack:101-letter reference must be rejected as a whole rather
than truncated into a100-letter reference plus literal suffix. Shorter syntax
still has no general gain. Repairs do not affect the separate count experiment.

## J. Decision / highest-information next tests
Keep production defaults unchanged unless every relevant gate passes. Native
handoff is a package, not an execution. A real blinded external basic-chat run
is required to close the native interface. For codec economics, next test is
exact paid anchor-placement optimization against MNEMA and current parent,
not increasing fragment search while ignoring the fixed contract. If the shorter
reference representation still loses after the parent, reject it rather than
claiming the raw ops reduction as a broad advance. Merge is requested regardless
of acceptance; repository integration is not scientific acceptance.

## Reproduction
After `npm ci`, `sh bench/x172/run-tests.sh` rebuilds and runs current unit,
portfolio, weighted, chunk and saved-parent gates. Full parent trials use the
X171 trial harness adapted to ICHNOS; see trial.ts and receipts/trials.log.
`speed-build.mjs` builds untouched-A/experimental-B bundles without modifying
production. `runtime-run.py ACTUAL_NODE_PID` validates and stops the actual
canonical Node process, runs six-lane ABBA, and resumes it in finally. No heavy
unit/build/trial jobs were run during that crossover. Subsequent canonical,
trial and Requests encodes were concurrent and are NOT speed comparisons.
`finalize.sh` checks a completed29lane replay; it must not run on partial files.
Native handoff verification hashes an externally supplied raw reply without
normalization. No such reply has been supplied or generated this turn.

### Conditional inverse argument
For an emitted plan, let W be the distinct maximal ASCII words of the source.
Every member retains its first literal occurrence. Replacing other whole words
and treating references as boundaries neither merges literal word fragments nor
adds anchor words; therefore the decoder's anchor set is exactly W. The planner
uses a fragment only when exactly one member of W contains it, namely the
replaced word. Simultaneous substitution restores each replaced span and leaves
all other source characters fixed. Thus the transform is injective on emitted
plans. This hand argument is backed by finite tests, not a theorem-kernel proof,
and says nothing about whether a particular LLM performs the specified inverse.

## Final frontier, category review and Requests result
Fresh canonical replay:29byte-identical wires vs X171,11,962tokens. Price/token
ID gates pass on all29. Independent Python parent reader22exact/7unsupported/
0mismatches; TypeScript21exact/8unsupported. Unsupported is not success.

The inherited category totals remain PROSE3429/word, OPS5580/glyph,
CODE2636/word, OTHER317/no tape. **That historical classification puts apt and
node-help under PROSE.** It must not be used as evidence of natural prose gains.
`category-review.py` adds an explicit source-role view without overwriting the
historical receipts:

| Source role | Lanes | Raw → frontier tokens |
|---|---:|---:|
| Prose (KB, email, answer) | 3 | 2018 → 1770 |
| Ops/tabular (including CLI help and system summaries) | 22 | 22332 → 8078 |
| Code/structured (TS, JSON, diff) | 3 | 3152 → 2013 |
| Other (cue sheet) | 1 | 513 → 101 |

Detailed local absolute/relative leaders and body-token-class census are in
receipts/source-role-leaders.json. This is fixture evidence, not a per-codec
ablation or globally best compressor claim.

Requests production A under900MiBV8heap aborted134with heap exhaustion. The
failure log is retained and is not a timing baseline. A fresh run of the earlier
X169bounded-cache D policy then completed:3539tokens,676807.719CPUms,
700690.53038elapsed ms,525348KiBmaxRSS. D passed fresh16,192count checks and its
size-policy check; it is benchmark-only, not production, and not validated as a
mixed-input server memory bound. Python independently recovered all19,213source
bytes; TypeScript marked this envelope unsupported. Wire hash matches the prior
Requests result. Concurrent canonical replay and a failed A run prevent a paired
speed claim. The700CPU-second limit was a run budget, not a proven runtime bound.

TypeScript noEmit exit0; production build exit0,24.31seconds. Native prompts35/36
are prepared but NOT_RUN. Summary acceptance remainsfalse. Broad paid-parent
compression gains, significant nonregressing speed and basic-chat native decoding
have not been established. No scientific success is implied by the requested merge.

Final verifier hardening: the independent replay script now exits nonzero on a
source mismatch or incomplete replay. A valid wire transplanted from another
source was actually tested and rejected; the original receipt was restored in
finally and the clean gate rerun (`reader-attack.json`). Staged whitespace checks
flag source-preserved Kubernetes/license/native whitespace and Vite's captured
log line; these evidence bytes are intentionally not normalized.
