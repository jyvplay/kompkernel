# X180 contract and evidence boundaries (A–J)

## A. Objects
APOUSIA admits UTF-8-roundtrip-stable strings with at most 50,000 UTF-16 units.
ASCII-space splitting retains empty fields; tabs, newlines, case and Unicode are
literal field content. Output equality is original UTF-8 byte equality. A frame
is JSON [field count, rules [context array,next field], residual string].

## B. Access
Decoder receives the complete key and payload in one user message. No external
dictionary, skill, source, system instruction or prior conversation is allowed.
Parent decoding precedes omission decoding. Native-model execution is NOT_RUN;
a Python or TypeScript interpreter is not a substitute.

## C. Resources and implementation
Widths 1/2/3; rule budgets 8/32/128; at most nine plans before deduplication.
Only contexts with at least three observed successors, all identical, qualify.
Heuristic ranking estimates character savings minus context cost; it is not
whole-wire greedy optimization. Final plans are ranked by complete raw o200k
price; only the best raw plan receives parent pricing in this bounded experiment.
That selection may miss a better paid plan. Rules, count, JSON, key and full
parent wire are charged. Frame cap 200,000 units, 128 rules, 50,001 output fields;
output expansion cap 50,000 units. Encoder scans and serializes O(n) context
characters per fixed width, then sorts up to O(n) contexts; comparisons can cost
O(n), so a conservative bound excluding tokenizer/parent is O(n² log n).
Decoder has at most 50,001 bounded-width lookups and capped output. Parent jobs
are wall-bounded at 180 s (frequency/control), 90 s (APOUSIA), V8 old space
1,100 MiB. This is not an RSS bound or a theorem about parent complexity.

## D. Quantifiers and proof gap
For every admitted source and emitted plan, the intended invariant is that the
reconstructed prefix equals the source prefix. A selected context has one
successor everywhere it occurs, so its forced symbol is correct. Otherwise the
next literal residual is correct. Count terminates even cyclic rules. Joining
retained empty fields preserves separators. Finite tests support, but do not
formally verify, this implementation argument. Ambiguous contexts must never
be forced. No native-model probability guarantee follows.

## E. H+
Byte and transport gates; full-paid >10-token gains on at least two ordinary
prose and two ops sources including heldout material; protected nonregression;
meaningful novelty against the existing stack; actual single-chat native decode.
Whole-stack speed is separately accepted only at CPU and wall aggregate B/A≤0.90,
all protected lane ratios≤1.00, identical wires in isolated cold ABBA runs.
Merge is not scientific acceptance.

## F. H− and H∂
If sum(i=0..k)V^i < q^n, a V-token alphabet cannot injectively represent every
q-ary length-n source in at most k tokens without side information. This says
nothing about frontier optimality on these fixtures. Losses and timeouts do not
prove impossibility. Distribution, tokenizer, paid contract, model access,
source-size caps, training leakage, timing contention and malformed-frame
semantics are material boundaries. Heldouts reused from X179 are not blinded.

## G. False solution shapes and modal shortcut
`modal.py` reuses and freshly executes the X179 evidence-schema detector: 27
flagged shapes including payload-only/free-dictionary pricing, weak baseline,
semantic equality, self-report, inverse-as-native, selection leakage, bit-to-token
transfer, free runtime, micro-as-whole speed, contended or memoized timing,
timeout-as-pass, statement-as-proof, source-as-kernel, stale repair trust,
restricted-as-general, finite-as-universal, characters-as-tokens, different
source, hidden protected regressions, NOT_RUN-as-pass, axiom-as-certificate,
undeclared markers, source-aware-as-blinded and niche-as-broad. It recognizes
supplied flags, not arbitrary natural-language claims. Executable countermodels
separate inverse existence from another decoder's behavior, Euler existence from
uniqueness, floor from truncation, and observed length from a universal bound.

## H. Distinct artifact branches
See portfolio.md and freshly executed portfolio.ts. These are mechanism branches,
not independent agents. Earlier mechanisms are controls, not new discoveries.

## I. Repairs and attacks
The key was clarified to specify nested rule rows before APOUSIA pricing.
Fresh full tests and independent decoding use that key. Attacks include empty
fields, deterministic cycles terminated by count, ambiguous successors, malformed
rows, duplicate contexts, under/over-consumption, invalid widths, Unicode and
expansion. No native trust is inherited. Speed patch is bundle-only and requires
fresh count/vector equivalence plus full-stack ABBA before any promotion.

## J. Actual execution limits
Node, TypeScript, Python and shell tools actually run; no independent agents or
formal kernels were invoked. Pricing overlaps builds/tests, so its CPU receipts
are diagnostics, not isolated speed evidence. The separate ABBA runner must wait
until the entire paid/frontier runner exits. Research findings are not proofs of
codec utility. Missing native access and broad paid wins remain open obligations.
