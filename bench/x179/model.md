# X179 formal model, threshold and negative space

## Objects / access / costs

KLADOS admits UTF-8-roundtrip-stable strings of at most 50,000 UTF-16 code units,
no literal caret, at most 12,000 maximal ASCII words and 2,048 distinct words.
Unicode outside ASCII words is literal, without normalization. Exactness means
original UTF-8 bytes, not normalized text or encoder self-report. The decoder
receives only the complete same-message instruction and payload; its BST starts
empty. No skill file, system prompt, external dictionary, previous chat or training is
available. Comparisons between ASCII words are case-sensitive lexicographic.
Every literal word—including repetitions—updates the tree. A reference resolves
BEFORE promotion. Replacement words are not scanned again.

Complete o200k token count, CPU ms, wall ms, peak RSS, coverage and native model
behavior are separate resources. Local word-level token comparison is a proposal
heuristic only; actual whole-message instruction+parent tokenization determines
price. All extra parent calls count even if they lose. Eager/local is a two-plan
portfolio, not a global optimum. Bounded parent attempts have 30 s wall and 900
MiB V8 old-space limits, set before attempts. Timeout is not a price or a pass.
Parent diagnostics may contend with canonical replay; they are not speed trials.

## Quantifiers / H+ / H− / H∂

Executable target: for every admitted source x and every emitted policy p,
D(E_p(x))=x exactly. E and D both update the same initially empty state after the
same lexical event. Inductively a literal identifies/inserts the same word;
a reference's pre-update path identifies the same word; the same single rotations
then produce the same ordered tree. Separators are copied unchanged. The reader
has explicit expansion/access bounds. This is a structural argument plus finite
implementation tests, not a formal TypeScript refinement proof.

Native target: there exists one fixed contract C such that, for each declared
heldout source x in each setting, a specified frozen model M in a fresh single
user-message interaction emits precisely x, without any external help. There is
no exposed endpoint to execute this gate. An executable inverse, a source-aware
assistant answer, or a successful hand-picked example cannot establish it.

H+: byte gates, full paid >10-token gains on at least two ordinary prose and two
ops sources including heldout material, protected nonregression, meaningful
novelty and actual native behavior all pass. Significant whole-stack speed is a
separate claim requiring CPU and wall aggregate B/A≤0.90, each lane≤1.00, exact
wires in isolated ABBA runs. Scientific acceptance remains false unless all
required gates pass. A merged research PR does not change that predicate.

H−: if sum(i=0..k)V^i<q^n, no injective exact decoder maps all q^n length-n source
strings into at most k tokens of a V-token alphabet without side information.
This does not imply any existing codec is optimal. Individual losses and budget
failures do not establish impossibility of the user's original goal.

H∂: UTF-16 vs UTF-8 size, source distribution, vocabulary, access/dictionary
limits, update discipline, payload markers, parent search, hardware/GC, native
model/context/output limits and cold/warm process state all matter. Boundaries
are tested, not silently normalized. Native model specification/verification is
still missing. We do not transfer splay amortized bounds to move-to-root.

## Runtime honesty

Actually available: Node, npm/esbuild, TypeScript, Python, shell/git/gh, web
search/fetch and JSON/workspace evidence. No installed lean/lake/coqc was found.
No independent agent, simulator, external database, native-model invocation or
expert reviewer was run. The Python decoder is separately written code, not an
independent human or model. Real workers run concurrently only where logs show
it; isolated speed testing must wait for the paid runner and pause any remaining
canonical worker. Actual compilation/build outcomes are in receipts.

## False solution shapes (executable schema detector in modal.py)

1. Payload-only pricing. 2. Weak/raw baseline instead of frontier. 3. Semantic
rather than byte equality. 4. Encoder self-report. 5. Program inverse substituted
for native behavior. 6. Known training/selection sources called blinded heldouts.
7. Binary/symbol entropy theorem transferred to BPE tokens. 8. Free header or
external dictionary. 9. Free parent/search runtime. 10. Microbenchmark promoted
to whole-stack speed. 11. Concurrent timing used as isolated timing. 12. Memoized
replay called cold execution. 13. Unsupported/timeout called pass. 14. Challenge
statement called proof. 15. Source inspection called kernel replay. 16. Repairs
inheriting earlier trust. 17. Restricted family called general. 18. Finite tests
called universal proof. 19. Characters/bytes substituted for token price.
20. Different-source baseline. 21. Averages hiding protected regressions.
22. NOT_RUN called success. 23. Axiom route called certificate replay. 24. Undeclared
marker behavior. 25. Source-aware self-answer called native blinded decoding.
26. Niche-only gain called broad success. 27. Repaired output priced with old key.
28. Move-to-root called zig-zig splay to borrow an unrelated runtime bound.
29. BST ordering or sorted tableau mistaken for original occurrence order.

The detector recognizes explicitly supplied evidence flags, not arbitrary prose.
Its modal counterexample supplies two actual functions: one executable inverse
succeeds while another decoder does not. Thus existence of an inverse cannot
imply behavior of an arbitrary model. The tree-specific regression checks
`a b a ^1;` → `a b a b`: omitting updates on repeated literals invalidates the
reference, even though every literal remains readable. `a ^;b` tests no rescan.

## Repairs

A runtime policy-enum guard was added after the first screen. All affected tests
are rerun, with an invalid-policy attack and access/expansion limit attacks.
This does not alter the eager/local wire algorithm; only those declared policies
are ever used in paid jobs. No native evidence is inherited or asserted.

A TypeScript plan-array inference failure was later repaired with an explicit
return-derived element type. Before/after emitted JS is byte-identical; fresh
compiler, full validation and empty-plan/dedup tests passed. Original failure
log and equivalence hashes are retained. This is not inherited native trust.
