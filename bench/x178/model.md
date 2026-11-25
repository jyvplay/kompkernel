# X178 formal contract and acceptance gates

## Objects, access, resources

Sources are all ASCII byte strings of length 0..50,000. Space and LF fieldizations
retain empty fields, including trailing ones, and do not normalize CRLF, NUL,
tabs, quoting or punctuation. Consecutive blocks contain exactly B fields except
possibly the last, with B∈{32,128}. String order is ASCII lexicographic order.
Each block is represented by an insertion tableau P and recording row word r.
The JSON wire transmits P and r as fixed-width decimal digits; width is the
number of decimal digits of P's largest zero-based row index, including one digit
for index zero. JSON escaping is in-band. No dictionary or source is given to the
decoder. Every decoded block must satisfy the exact shape/trace/inverse checks.

CPU milliseconds, wall milliseconds, complete o200k token count, peak RSS, source
coverage and native-model success are distinct resources. Full contract plus
actual parent wire is tokenized as one string. Parent search calls count even
when they lose; memoization is never a claim that new input is free. The direct
portfolio has four plans; paid search selects the best direct-price width for
each separator and calls the parent twice. This finite heuristic is not a global
optimization or proof that the omitted widths cannot win after the parent.

Available systems: Node, npm/esbuild, TypeScript compiler, Python, shell, git/gh,
web search/fetch and workspace JSON evidence files. No external agent, simulator,
native model API, theorem prover/kernel or expert reviewer was run. `command -v`
found no lean/lake/coqc. Python is a separately written implementation, not a
separate scientist or model. No external database participates in the codec.

## Quantifiers and hypotheses

Executable exactness: ∀ admitted x, ∀ emitted plan p, D(E_p(x))=x byte-for-byte.
Both E and D are fixed algorithms; D has only the complete message. The incumbent
must itself decode to x before any fallback is trusted. Unsupported is not pass.

Mechanism argument: insertion replaces the leftmost entry >x and bumps the old
entry into the next row; the terminal appended cell's row is recorded. Removing
that cell and successively replacing the rightmost entry <x in preceding rows
reverses one insertion. Weakly increasing rows and strictly increasing columns
supply the required order inequalities. Reverse the recording word to induct on
the number of insertions. Blocks preserve field count; joining with the exact
original separator preserves all source bytes. The implementation's canonical
reinsertion check rejects non-image pairs. Tests and this argument are not a
formal compiler/refinement proof.

Native goal: ∃ fixed contract/codec C, ∀ x in each declared evaluation setting,
a specified frozen model M in a fresh single user-message chat emits precisely x,
with no tool, system instruction, skill file, source leakage, external dictionary
or training. No available native endpoint has run this test. ∃ executable inverse
does not imply ∀ model M behavior. We cannot substitute a hand-picked self-answer
from an assistant that has already read the source.

H+: declared byte, paid, novelty, generality and native gates all pass. For this
session, meaningful generality requires >10 paid tokens saved on at least two
prose and two ops sources, including whole heldout material, with protected
fallback nonregression. This finite acceptance predicate is not a universal
terminal-codec theorem. Whole-stack speed separately requires aggregate CPU and
wall B/A≤0.90, every protected lane≤1, and identical output wires in isolated ABBA
runs. No timing-noise tolerance is silently added after observing results.

H−: candidate losses refute those candidate wins only. Universal injective
compression of all q^n length-n strings into at most k tokens is impossible when
Σ(i=0..k)V^i<q^n, where V is the finite token vocabulary size. This cardinality
bound assumes deterministic exact decoding and no extra side information. It
neither proves the existing frontier optimal nor forbids wins on natural text.

H∂: source distribution, total order, token vocabulary, block size, JSON framing,
parent search, cold/warm caches, and native model/context/output limits can change
the answer. A source outside ASCII is unsupported rather than normalized. The
native system itself is not specified/available enough for empirical acceptance.

## Non-substitutable adjacent tasks / false solution shapes

The executable `modal.py` retains 27 evidence-schema traps and concrete logical
countermodels. It detects explicitly supplied flags, not arbitrary natural
language proofs. The following are all disallowed substitutions:

1. Raw payload price for complete contract price.
2. Raw source for the actual parent frontier baseline.
3. Semantic equivalence for byte equality.
4. Encoder self-report for original-source comparison.
5. Executable inverse for native decoding.
6. Selected/training sources for blinded heldouts.
7. Symbol/run-count theorem for fixed-BPE token gains.
8. Free header/dictionary or shared prior source.
9. Free extra parent calls or free search.
10. Microbenchmark for whole-stack improvement.
11. Concurrent timing for isolated speed evidence.
12. Memoized replay for cold input runtime.
13. Timeout/unsupported/NOT_RUN for a passing gate.
14. Challenge statement or axiom for a proof/certificate execution.
15. Source inspection for theorem-kernel replay.
16. Repair inheriting pre-repair receipts.
17. Restricted-family gain for generality.
18. Finite test for universal proof.
19. Characters or bytes for o200k token cost.
20. Different source bytes for a baseline comparison.
21. Aggregate speed hiding protected regressions.
22. Implicit marker convention absent from the contract.
23. Known-source self-decoding for blinded native behavior.
24. Niche-only wins for everyday prose/ops gains.
25. Tableau existence for unique original sequence (recording trace is required).
26. Sorting-permutation RAM bound for a model-readable textual representation.
27. PR merge for scientific acceptance.

## Repairs and adversaries

Compact decimal trace is a wire repair to the initial JSON-integer-array version.
The old screen/independent receipts are archived as superseded. Fresh tests target
10/11 and 100/101 row transitions, leading zeros, wrong width, truncated traces,
invalid corners, repeated labels, empty fields, sorted/reversed inputs, blocks,
ASCII controls and injected delimiters. Each affected price/inverse/native prompt
must be regenerated. No old paid result is reused for a repaired contract.

The recording tape is the specific information bottleneck: omission creates a
concrete collision; compacting it cannot erase its information content. The
cheapest next falsifier is a complete paid parent on both separators for varied
sources. Even a paid win would leave native behavior and broad superiority open.
