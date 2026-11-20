# X145 review — SCALAR (experimental)

## A. Model and claim
Input x is UTF-8 source bytes that round-trip through JavaScript. The parent is a finite backward-reference CHIRON grammar under one of four explicitly recognized plain expansion headers. Objective is complete o200k_base message cost, not tape length. SCALAR composes the grammar with a pending-high-surrogate transducer. Output uses the inherited contract; no novel decoding vocabulary. This is a new repository implementation of classical grammar/transducer composition, not a new general mathematical algorithm.

For every accepted repair m with supplied source x, the implementation checks Decode(m)=x and UTF8RoundTrip(m)=m. For the optional deferred selector, complete token cost is strictly less than the returned base before replacement. This does NOT quantify over all possible encodings, all corpora, runtime, or native model accuracy.

## B. Resources / trust
Bounds: 100,000 UTF-16 units per input, expanded rule and wire; 128 input rules; 256 context variants; 2,000,000 walked units; 32 distinct rejected parents collected per synchronous top-level call. All rule expansions, including unreachable definitions, are bounded before inherited decoding. Up to 128 bounded expanded strings are retained, so the expansion storage bound is O(128*100000), not O(input length). Grammar recursion depth is at most 128. BPE, inherited parser and decoder remain trusted components; Python replay provides an implementation-diverse check, not proof-kernel certification. Collector cleanup uses finally and memo keys distinguish opt-in mode.

## C. H+ / H− / thresholds
H+: split-scalar rejection can hide useful grammar parents. Historical Vite establishes existence; it is discovery data, not blind validation.
H−: scalar-stable parents need no repair; extra variants or costly symbols can erase gains. The two additional package README lanes show no token gains.
Admission threshold: strict full-message improvement over safe incumbent; tie keeps base. Preferred user threshold is >10 tokens: final deferred Vite 274→260 qualifies narrowly. Earlier direct-selection 257 is superseded because it changed subsequent search. Historical fixed unsafe parent repairs to 258, a different experiment.
No universal token compression theorem or worst-case speed improvement follows.

## D. Six mechanism-distinct routes
| Route | Executable/artifact | Established | Gap / falsifier |
|---|---|---|---|
| Grammar × scalar-state compiler | scalar.ts; unit.ts; attacks.ts; integration.ts | context variants; byte-exact measured repair | independent reader mismatch or full-message regression |
| Entropy coding | controls.ts / controls.jsonl Brotli columns | byte inverse, complete base64 price | native reader unsupported; any claim of native success needs blind test |
| Indexed backward copying | controls.ts / copy columns | code-point index reader reconstructs exact source | index arithmetic may fail in basic chat; price can exceed incumbent |
| Integer prediction/deltas | delta_control.ts | existing DIAPHORA inverse and whole standalone price | not new; not parent-composed; source or price counterexample |
| Layout factorization | layout.ts | existing PTYCHE reversible eligible lanes | header overhead and native interpretation; ineligible lanes |
| Semantic normalization | semantic-collision.json | explicit distinct-input collision | disproves residual-free byte-exactness; needs residual channel |

Controls are rerun on the historical 29-lane source set with historical baseline prices; their results do not certify a current frontier win. Only SCALAR is a new repository compiler. Six experiments are not six new codecs, and synthetic boundary cases are not corpus wins.

## E. Invalid-result shapes and modal shortcut
Reject these claims: (1) unsafe low token cost; (2) source self-report only; (3) payload-only price; (4) invalid source UTF-8; (5) missing header cost; (6) unsupported reader called verified; (7) native inferred from program; (8) fixed heldout called blind; (9) one lane called universal; (10) microbenchmark called stack speed; (11) renamed existing mechanism called novel; (12) unbounded acyclic expansion called safe; (13) default disabled called shipped enabled; (14) altered search called identical frontier; (15) unrun proof called certified; (16) totals hiding lane regressions; (17) earlier unrepaired result inherited as trust; (18) controls called new codecs.
Modal shortcut is invalid: 'it might be readable' does not imply 'a basic-chat model read it exactly'. A matching header is only interface compatibility. Native status remains NOT_RUN.

## F. Adversarial gates
unit.ts crosses all 1024 high-surrogate values with varying low halves, two incoming states for one rule, nested boundary transitions, empty-output rules, NUL/CRLF, wrong supplied source and expansion bombs. attacks.ts covers 15 malformed shapes, rule-count refusal, four headers, collector deduplication/source isolation, exception cleanup. Independent Python reads emitted unit wires and actual source files. The 256-variant and 2m-work exact boundary points have not been exhaustively exercised; boundedness checks exist but this is not formal coverage certification. Unreachable expansion is checked before inherited decode, fixing an initial denial-of-service gap.

## G. Novelty / parent representations
SYNARMOGE already performs greedy edge shrinking, dropping, renaming and remine. SCALAR instead memoizes (rule,pending high) and may create distinct versions of a shared rule. A two-context test demands two variants. KAIROS/EIRMOS already use transduction ideas, so no broad 'first transducer' claim. Repository search was scoped, not an exhaustive semantic equivalence proof. Final selection is greedy over at most 32 collected parents, not globally optimal.

## H. External checks
Python replay is independent program verification only. No independent agent, basic-chat evaluator, Lean replay or third-party certification was executed. See research.md for separately scoped lab artifact inspection. Compiler/build gates do not substitute for semantic or behavioral gates.

## I. Speed and repaired trust
Deferred collection preserves base search and avoids pricing during its decision process; it is a search-isolation design, NOT demonstrated acceleration. Costs include collection, expansion, compilation, pricing and validation. Frontier timings run concurrently and cannot serve as isolated A/B speed evidence. The historical regex speed experiment failed and is not revived. Separate isolated 24-call ABBA/BAAB measurements were subsequently run. ABBA B/A wall ratios were 0.871/0.887/0.835 (Vite/KB/metrics); fresh-process BAAB reversed them to 1.191/1.060/1.129. The schedule-robust Pareto timing gate fails. No broad speedup claim is supported.
Repaired code reran unit, direct historical probe, integration, Python, attacks, TypeScript and production build. Canonical baseline and opt-in frontier sweeps have separate receipts; consult summary.json for completion, not this prose.

## J. Release decision / highest-information next test
Keep OMEGA_SCALAR opt-in. Do not merge under the user's conditional Pareto criterion until basic-chat source reconstruction, isolated whole-stack speed, and broad everyday prose/ops gains pass. A 14-token discovery-lane win is real but insufficient for all requested axes. Next highest-information test is a blinded native reconstruction of the final 260-token Vite wire with exact byte comparison and no external decoder; then better warmed, randomized whole-stack timing; the initial isolated ABBA/BAAB gate has now failed. No resources for that behavioral evaluator are established in this session. This is a partial implementation, not fulfillment of the requested comprehensive breakthrough.

### Conditional correctness argument (human proof sketch, not kernel-checked)
Let E be the backward-reference grammar expansion. Define T(s,w) as the
UTF-16 scan of w starting with pending high half s (empty or one of 1024 high
halves), emitting only complete scalars and returning the final pending half.
It is undefined for a low half without a high half, interrupted/consecutive
high halves, or an unfinished root. The composition law is
T(s,uv) = let (a,t)=T(s,u), (b,r)=T(t,v) in (ab,r).
For every memoized pair (g,s), induction over the input rule order and this law
shows that expanding its emitted wire yields the completed-output component of
T(s,E(g)), with its returned state equal to the pending component. Newly emitted
rules reference only already emitted rules; glyph allocation excludes source
terminals and already used symbols. Empty completed outputs emit no rule, but
retain the state transition. Concatenating the body with initial empty state
therefore gives the original root expansion whenever the final state is empty.
Fresh output symbols are ordinary non-surrogate script glyphs and every literal
emission is a complete scalar, hence the output tape/body is UTF-8 stable.
The actual implementation additionally decodes and compares against the supplied
source, and reprices the whole message. This sketch assumes parser/decoder
agreement and operation-free grammar semantics; unsupported operators reject.
It proves neither BPE savings nor a model's ability to perform the expansion.
Caps may reject otherwise valid grammars; they do not weaken accepted equality.
