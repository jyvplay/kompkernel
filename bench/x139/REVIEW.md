# X139 A–J engineering / evidence ledger

## A. Formal model

Let C be the canonical 29 UTF-8 source files, plus separately labeled frozen
heldout documentation. F is TAGSTACK under the exact flags in `frontier.ts`:
OMEGA_DET=1, OMEGA_NO_MEMO=1, OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0,
OMEGA_NO_OROTHESIA=1, o200k_base, other defaults. An emitted object is one
ordinary chat message containing its contract and payload. D is a message-only
reader; equality means original UTF-8 bytes, zero tolerance.

## B. Admissible objects and domain

APOTOME accepts only the two recognized simple grammar parent headers, no
repeat/fill/list/range operators, <=128 rules, message <=100,000 UTF-16 units,
no original tilde and no surrogates in the wire, target <=20,000 units.
Expanded definitions are capped at 20,000 units; reconstructed body at 100,000.
Views use signed nonzero decimal lengths: positive retains a prefix, negative
a suffix, with absolute length no greater than the fully expanded target rule.
Forward view references are permitted, but the complete graph must be acyclic,
including unreachable rules. Unsupported inputs are refusals, not corrections.

## C. Access and runtime honesty

Encoder inspects source/tokenizer. Native reader gets only one basic user
message, no skills.md, source, previous context, external dictionary or decoder
tools. Verifier may compare source afterward. Tools actually used: shell,
git/gh, npm, Node, esbuild, TypeScript compiler, Python, web search/fetch.
Independent agents, simulators, theorem provers, model endpoints, database
experiments and external reviewers: none run. Lean/lake lookup found no binary.
Dependency reinstall was required because node_modules was absent; npm reported
four advisories. No package manifests changed, no audit-fix silently applied.

## D. Counted resources

All message tokens, including signed lengths, delimiters and contract, counted
against installed reference o200k_base. Runtimes include rejection work. Search
uses <=4 best-improvement passes, <=4,096 candidate probes, plus at most 66 pairs
from a top-12 pair pool per pass, all within the same probe cap. Single candidates
are enumerated over ordered rule pairs and both prefix/suffix choices. Ranking
the pair pool is a proxy; acceptance is complete-message price plus re-decode.
No wall-clock cutoff or optimality claim. CPU-bound; inherited parent cost is
separate. A naive full expansion costs at most the capped output/definition
sizes; each probe may reparse and expand all rules and tokenize its whole wire.
Memory includes memoized expansions, up to R*20,000 units, plus output and
candidate strings. These are structural caps, not a whole-stack CPU guarantee.

## E. Explicit success / quantifier order

For fixed encoder E and a predeclared corpus C: for every x in C,
D(E(x))=x and T(E(x))<=T(F(x)); for at least one real x, saving >10 tokens.
The requested runtime/Pareto and native-model gates additionally require a
non-regressing measured objective vector and a blinded response for a declared
model/version. One decoded candidate and a different cheap/fast candidate do
not jointly satisfy this predicate. Universal claims over every text or model
are strictly stronger and unestablished. No default integration, commit as a
winner or merge unless all mandatory gates pass.

## F–G. Boundaries / adjacent non-solutions

Not word count or bytes instead of BPE; not raw transformed text instead of full
wire; not dictionary-production count instead of token count; not semantic or
visual equivalence instead of source bytes; not program inversion instead of
native behavior; not shallow cycle detection instead of whole-graph validity;
not arbitrary-code execution by a reader; not pre-existing KREMA/SYNAPHE relabeled
as a new mechanism; not fast rejection called a faster whole stack; not subset
success used as universal success; not theorem validity mistaken for applicability.

## H. Outcome space

H+: useful new finite-corpus Pareto improvement is possible. Threshold: complete
wire >10-token improvement, independent exact source inverse, native trial and
controlled full-cost evidence. Not met here.
H−: fixed-alphabet injective coding cannot strictly shorten all finite strings
(counting). This does not rule out our finite-corpus goal. Failed trials reject
only these bounded candidate families.
H∂: domain, cost model, access, model behavior and search budget change the answer.
The native gate has no adequate evaluator in this runtime, so it remains NOT
RUN rather than presumed true. All-codec semantic novelty also remains incomplete.

## C. Frontier / theorem interface

The fresh full frontier is compared message-for-message against X138 in
`summarize.py`; outputs are not inferred from previous receipts. Experimental
KREMA, PTYCHE and SYNAPHE are separate from shipped configuration. Primary
paper hypotheses and lab proof limitations are in `research.md`. No externally
published theorem was locally kernel-checked or imported as a codec-speed proof.

## D. Negative space: 20 false result shapes and detectors

The modal detector records (object, quantifier, reader, evidence, cost boundary).
Changing any coordinate blocks promotion. The executable normalized-text
collision demonstrates why 'the reader can recover the meaning' does not imply
an injective byte codec.

1. Saved raw characters → whole-wire reference count.
2. Saved grammar rules → actual encoded indices/contract counted.
3. Saved tokens on a different candidate → one message binds all gates.
4. Encoder says exact → independent emitted-message Python decode.
5. Python succeeds ⇒ LLM succeeds → NOT RUN unless blind response retained.
6. Prefix of raw rule instead of expanded rule → nested-view unit tests.
7. Forward pointer interpreted as a new definition → framing tests.
8. Cyclic view looks productive → reject recursion even if slice is short.
9. Unused cyclic rule ignored → expand/check all definitions.
10. Negative/zero/out-of-bounds length silently clamped → explicit rejection tests.
11. UTF-16/codepoint disagreement → surrogate refusal and attack.
12. Unknown parent instructions discarded → recognized-header-only gate.
13. One illegal single move rejected ⇒ pair impossible → simultaneous-pair test.
14. Pair patch inherits trust → reprice all affected sources and new graph attack.
15. More dictionary candidates ⇒ better compression → 72 full-price trials.
16. Synthetic mechanism example ⇒ everyday gain → examples labeled attacks only.
17. Reader-state savings hide search cost → actual end-to-end rejection timing.
18. Concurrent clock delta ⇒ stack acceleration → separate isolated AB/BA test.
19. Formal specification/source ⇒ proof replay → external files labeled inspection.
20. News headline ⇒ all hypotheses verified → primary statements, scope and dates.

## E–F. Independent mechanism portfolio / concrete artifacts

| Mechanism | Construction and artifact | Established portion | Gap / cheapest falsifier | Gap locality |
|---|---|---|---|---|
| Expanded-rule views | APOTOME signed prefix/suffix references, probe + reader | exact acyclic interpreter, source comparisons | no improving cuts; full-wire price immediately rejects | local dictionary/search; native gate original problem |
| Overlap macros with jointly mined dictionary | X138 SYNAPHE operator, X139 joint_overlap.ts | same source from expanded candidate dictionaries | all tested batches lose; equal-budget concat control | local mining/search |
| Ordinary substitution grammar | same entries/budget, no overlap | exact comparative trial | output worse than parent; not a novel codec | local |
| Numeric prediction | existing DIAPHORA, delta_control.ts | 29 exact standalone inverses | contract/source price worse than frontier | local; composition untested here |
| Positional backward copying | reused controls.ts JSON references | 29 byte-exact program inverses | larger tokens and native-access difficulty | local plus behavioral boundary |
| General entropy compression | Brotli/base64 control | 29 exact byte inverses | larger token messages; external decompressor requirement | access-model boundary |
| Hanging reflow | existing KREMA on frozen docs | eligible transformed source exact | document trial loses; not a new mechanism | local/generalization |
| Residual-free semantics | normalization collision artifact | explicit noninjectivity counterexample | original bytes cannot be inferred uniquely | global for that map |

These are mechanisms, not six new codec names. Controls reuse existing code as
requested. Only APOTOME is a new module; joint mining is a new experiment on
SYNAPHE, not a renamed invention.

## G. APOTOME-specific adversary / correctness argument

An acyclic dependency graph permits topological evaluation. Ordinary references
concatenate expanded values. A view selects a uniquely bounded prefix or suffix
of a fully evaluated value. Thus every node denotes one finite string. The
framing scanner skips explicit ~gN| expressions when discovering rule heads;
a forward view does not accidentally declare its target. Encoder accepts a
rewrite only when that exact emitted message evaluates to its original parent
layer; source-level composition is checked separately with STELI where needed.
This argument is not a formal proof certificate and says nothing about native
model behavior or optimal token cost.

Specific patch attack: A views B while B originally references A, so one change
is cyclic. Simultaneously redirect B to a third rule C: the graph can become
acyclic and preserve source. The test verifies both rejection of the single
change and exactness of the paired one. Pair candidates include initially
invalid singles; final graph/source gates cannot be bypassed. The receipt field
`cycles` counts decoder exceptions during search, not separately classified
cycle proofs; no stronger interpretation is used.

## H–I. Verification and repair

Actual final unit count, 17 independent APOTOME source reconstructions and 72
joint-mining/control reconstructions are recorded in receipts. Real APOTOME
trials accepted **zero cuts**; the new operation itself is exercised in targeted
unit examples, not claimed successful on real workloads. The pair-search
extension was rebuilt and all canonical/heldout price and inverse gates rerun.
Compiler output retained. Independent means a second implementation in this
session, not another agent or external organization. No native response exists.

## J. Decision / next test

No accepted Pareto winner; no merge. The artifact is implemented, executable,
bounded and tested, with a finite negative result. Next highest-information
compression test: a prospectively specified richer view repertoire (interior
slices or source-mined view dictionaries), paired with ordinary containment
factoring under equal budgets, only after estimating whether the tape savings
can repay the contract. Do not keep shortening the instruction and call that a
new mechanism. Previous useful KREMA/PTYCHE messages still need a real blind
native evaluator; program tests cannot close that gap.
