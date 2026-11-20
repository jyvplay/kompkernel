# X141 A–J adversarial ledger

## A — Objects and quantifiers
Source is a frozen UTF-8 file, encoder input its exact JS string; accepted outputs must reconstruct original bytes, not normalized text. M(x) includes every instruction, delimiter and dictionary. T is installed o200k_base reference tokenization. Baseline is deterministic shipped TAGSTACK on the same x. MNEMA domain excludes literal caret and caps input/output at 50,000 UTF-16 code units, words at 10,000, reference prefixes at 12 ASCII letters. Decoder has current message only. Encoder may inspect the whole input; no prior message, learned codebook, hidden source, vector channel or tool-assisted native reader is allowed. Measured finite-corpus statements do not quantify over all strings.

## B — Decision hypotheses
H+: byte-exact all-in token improvement against shipped frontier, preferably >10 on broad prose/ops, plus actual blind single-message native reading and no unaccepted runtime/fidelity regression. H−: a tested candidate loses or fails a gate on a specified instance; not impossibility of the family. H∂: mechanical exactness/token win with behavioral or Pareto gate untested. A negative or boundary result cannot be merged as H+.

## C — False-solution shapes and modal detector
Reject: (1) raw-only savings, (2) unpaid instructions, (3) free dictionaries, (4) encoder self-report only, (5) whitespace normalization, (6) Unicode normalization, (7) cached source in decoder, (8) cross-message history, (9) synthetic fixture sold as heldout gain, (10) cherry-picked thresholds without policy, (11) local token sums sold as global price, (12) changed parent search budget, (13) microbenchmark sold as whole-stack speedup, (14) concurrent wall times sold as causality, (15) program inverse sold as native reading, (16) renamed old mechanism sold as new mathematics, (17) green skipped CI sold as proof, (18) finite enumeration sold as universal lower bound, (19) unsupported reader cases silently accepted, (20) prompt text treated as evaluator instructions rather than source data.
Modal detector: any transition from “may/can on fixtures” to “does on heldouts”, from “exact inverse” to “LLM can read”, from “source/config inspected” to “proof checked”, or from “tested no win” to “impossible” requires an explicit new receipt.

## D — Mechanism-distinct approaches and falsifiers
| Approach | Concrete artifact / established part | Gap / falsifier |
|---|---|---|
| Lexical chronological prefix copy | mnema.ts, unit.ts, coldread.py; decoded words update history | all-in parent win absent; shadowed prefix or copied-word history bug falsifies exactness |
| Long transformed rule images | image_census.ts; 3–16-word,24–400-character family search | no pairs in census; not all transformations/lengths |
| Interior dictionary substring views | interior.ts, inherited independent reader | instruction/tape overhead; full repricing can defeat local gain |
| Source-run factoring control | controls.ts | classical factoring, not new; baseline superiority required |
| Numeric delta control | delta_control.ts | formatting/sign/units and metadata must survive; no unpaid side information |
| Full-parent representation search | parent.ts; run shipped encoder on MNEMA folded source | search interaction may erase gain; composition order/cost mandatory |
| Exact digit count acceleration | decimal-token-count.ts, decimal_unit.ts, speed.ts | tokenizer-specific invariant, not codec; full-stack timing and changed tokenizer falsify deployment |

## E — Structural attackers
Prefix shadowing, case changes, overlapping reference boundaries, caret injection, long/empty prefixes, copied word refreshing history, unpaired surrogates, CRLF, final newline, empty inputs, caps, source instruction injection, alternating calls and unsupported parents. Mechanical fixtures exercise references even where real samples select none. Copied words must be learned: authority authentication ^author ^a resolves the last two words to authority authority. Literal caret is a refusal, not silently escaped. Unknown parent wires remain unsupported independently.

## F — Repaired gates and fresh patch attacks
Local neighbor scoring proposes candidates only; whole-message reference tokenizer decides price. Every emitted supported wire is read without source and compared with filesystem bytes. Frozen documentation sources/version/hash policy precedes pricing. Production bpe.ts remains unchanged; decimal experiment is applied only while building an isolated bundle, then reversed by trap. Attack the patch with empty, newline, sign, decimal, exponent, non-ASCII digits, BOM and malformed surrogate cases. Numeric theorem relies on both regex digit partition and installed vocabulary, not a universal tokenizer property.

## G — Novelty audit scope
Repository inventory and near-neighbor inspection distinguish MNEMA from cross-message ANAMNESIS/CTXCOPY, explicit KAPPA binds, fixed dictionaries, and occurrence-index copies. Adaptive word dictionaries, prefix coding and recency are classical. Full source hashing/indexing is not exhaustive semantic auditing of every codec; no such completion claim is made. New implementation is experimental and unwired.

## H — Verification levels
TS inverse, independent Python chronological reader, installed reference tokenizer, typecheck and source-byte assertions are separate evidence levels. Parent readers have explicit unsupported cases. Native model testing is NOT RUN. Lean/comparator/kernel replay is NOT RUN. One vendor workflow was checked down to jobs and found to skip verification despite green status.

## I — Resources, stopping and reporting
Canonical frontier and composition jobs are concurrent: their timings are descriptive, not speed comparisons. Speed experiment must run only after both jobs exit, balanced ABBA/BAAB with equal cache reset, full encoder and byte/message identity. Four observations per arm/source are small-sample evidence, not broad performance certification. No external evaluator access or successful native trial is implied.

## J — Decision / next highest-information tests
No verified Pareto winner yet. Do not merge. Prior KREMA/PTYCHE token wins still need a real blind native trial before more niche optimizations can satisfy the contract. For MNEMA, classify paid contract overhead versus parent-disrupted repetition; do not repeat the same zero-win threshold sweep as if independent progress. Long transformed-phrase census yielded no opportunities in the frozen scope. Highest-information remaining behavioral test is the frozen, genuinely blind KREMA/PTYCHE single-message reconstruction trial; absent such a service, explicitly retain NOT RUN rather than simulate one.
