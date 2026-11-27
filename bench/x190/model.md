# Formal model, outcome space, proof obligations and adversaries

## A–G: admissible objects, access and resources

Source x is a UTF-8-stable string of at most 50,000 UTF-16 code units. No
normalization is permitted. Source equality means equality of original UTF-8
bytes, not parsed values, visual similarity or linguistic meaning. DIPIGI
selects ASCII lexemes matching `[A-Za-z0-9_./-]+`, of length 6..96; everything
else stays literal. Inputs containing `~` or `<|` produce no plans. This is a
partial encoder, with caller-owned canonical fallback, not a total priced
encoder for every possible Unicode string.

A message contains its complete decoder instruction, a JSON entries/body frame,
and all dictionary roots. The encoder may see source and canonical parent;
the reader gets only one complete message. No external dictionary, new model
vocabulary, skills file, system instructions or previous chat is allowed.

Entry i is either a literal ASCII word or `[l,p,m,r,s]`, with l,r strictly
smaller than i. It means prefix_p(entry_l) + m + suffix_s(entry_r), where
suffix_0 is empty. p and s are nonnegative safe integers, individually bounded
by their respective parent's length; the reconstructed word must have length
1..96 and be unique. The decoder allows same-parent tuples as a grammar
boundary case; the encoder only constructs distinct-parent tuples. There is no
notion of overlapping positions between two different parents. Body markers
are replaced once, without rescanning. Malformed/unknown markers are refused.

C(M) is reference o200k_base encoding length of the **whole** message, jointly
measured, including key, JSON framing, roots, row indices, lengths, middle
strings, and body. A parent-compressed payload additionally pays the full
parent message. An isolated row cost is merely an encoder heuristic. CPU and
wall milliseconds and peak RSS are separate resources; adding parent searches
is not a speed improvement just because a message has fewer tokens.

## Success, quantifiers and thresholds

Correctness target: for every admitted x and emitted M, the executable inverse
must return bytes(x). Finite tests do not prove this universal implementation
claim. Engineering acceptance requires meaningful fully paid gains (>10 tokens
on a prose and an ops case), no source fidelity regression, held-out replication,
novelty evidence against the stack, and a specified native basic-chat model
passing source-blind exact-byte evaluation. A codec promising a model will
succeed is not evidence that that model did succeed.

The native claim is distinct: for a fixed model/configuration and a fresh chat,
output(M(x))=bytes(x), under the declared evaluation conditions. The current
assistant has seen code and source context and cannot act as an independent,
source-blind native reader. No separate model invocation occurred. The offline
scorer accepts raw response files and reports exactness conditional on operator-
supplied provenance; it cannot authenticate who generated those bytes.

Speed threshold: ≥10% improvement in both aggregate CPU and wall time on the
isolated six-lane ABBA trial, no per-lane regression, and identical full wires.
A microbenchmark or parallel run is not this gate. Search subprocesses have a
180-second cap; timeouts are not successful encodes, correctness failures, or
proofs of inevitable token loss.

## H+, H−, H∂

H+: a sufficiently new readable codec achieves the requested broad gains.
H−: no codec in a precisely specified family can satisfy the predicate.
H∂: results change with input size, dictionary charge, model, or another boundary.
No branch is selected merely because it sounds plausible. Negative tests here
do not establish H− for all readable codecs. Counting only proves that an
injective encoder cannot shorten every possible input into a smaller finite
message set; it does not rule out improvements on everyday text distributions.
There is no established 'terminal codec' under all user-relevant tradeoffs.

## Constructive inverse argument (not kernel verification)

Induct on dictionary index. A literal row supplies its word. In a tuple row,
both referenced words are already uniquely determined by the induction
hypothesis; bounded prefix/suffix extraction and literal concatenation uniquely
determine the new word. Thus the entire dictionary is unambiguous and acyclic.
The encoder emits a tuple only after constructing exactly the original lexeme
from its two parents and middle. Its p/s choice satisfies p+s≤length(child),
so the child's literal middle is well-defined. Distinct lexical spans selected
by the encoder's regex do not overlap. Replacing each complete span by its index
and reversing those replacements therefore restores all spans and all untouched
characters. Reserved-marker refusal avoids ambiguity. This establishes the
abstract construction, not a formally checked JS compiler or native LLM proof.

## Six independent comparison mechanisms and the actual novelty limit

Concrete executable comparators are GEITON (single-parent lexical forest),
DESMI (overlap reservoir with interval addresses), DIAMERIS (stable partition
with routing), APOUSIA (context omission), DIADOCHI (predecessor FIFO routing),
and ROPI (weighted deque rearrangement). Each is independently run from the
original source; their outputs are not fed to one another. DIPIGI is the new
implementation under test. These are six existing comparator artifacts, **not
six new inventions**. The user's six genuinely new approaches requirement is
not claimed fulfilled by this screen.

For each comparator the cheapest falsifier is paid source reconstruction and
cost against the canonical parent; the artifacts are source/plan rows in
`screen.json` and the imported inverse executions in `test.ts`. Their distinct
structural attackers are respectively parent-cycle/affix bounds, interval
bounds, routing exhaustion, ambiguous omitted context, stream-order underflow,
and forward/inverse endpoint choice. Their abstract inverses do not solve the
original native-reader problem. New targeted adversarial execution this turn
focuses on DIPIGI and the native scorer; comparator inverses are regression
checks, not fresh exhaustive attacks on all six.

DIPIGI's distinct-parent DAG differs from GEITON's one-parent forest. This is a
local operational distinction only. ANAPHORA-FOLD, HOMOIOS, ANTIPHON, APOTOME,
DESMI and general macro grammars already have related sharing/edit operations.
A multi-parent straight-line construction is classical, not new mathematics.
No complete semantic novelty proof against MONODROMOS, STOIBAS, LEXARITHMOS,
KRYPTOLYSIS, DEIKTIS, SYMFRAZ, KYKLOS, METRIDA, KLADOS, FOTIA and the rest of the
stack was established. A new filename or absence of a keyword hit is not one.

## Negative space: 20 false solutions and rejection tests

1. Free dictionary roots → charge JSON entries in full.
2. Free second parent → charge both indices and both lengths.
3. Free instruction → charge the entire key plus parent.
4. Character reduction called token reduction → reference tokenizer.
5. Raw-input win called canonical win → compare full parent receipts.
6. Row-local improvement called globally optimal → price complete messages.
7. Identical JSON values called byte-exact → file-byte comparison.
8. CRLF/trailing whitespace discarded → adversarial and native scorer tests.
9. `s=0` treated as whole suffix → explicit empty-suffix test matrix.
10. Forward/cyclic reference → earlier-index refusal.
11. True/float indices treated as integers → type/range attacks in JS and Python.
12. Expansion bomb → word, dictionary and output caps.
13. Literal tilde confused with reference → source refusal and marker attacks.
14. Most-probable text called exact inverse → modal collision counterexample.
15. Native test populated by a Python inverse → synthetic test fixtures explicitly NOT_RUN.
16. Scorer accepting a changed prompt/source → digest-drift attacks.
17. Self-reported model metadata called authenticated provenance → explicit limitation.
18. Timeout/unsupported reader hidden → explicit process and reader statuses.
19. Six parameter settings called six mechanisms → distinguish plans from comparators.
20. Binary, shared-dictionary, or changed-tokenizer theorem transferred to chat → hypothesis audit.

The modal shortcut fails because `a b\n`, `a  b\n`, and `a b\r\n` collapse to
the same normalized text. No deterministic decoder can return all three from
one message. The native scorer's whitespace/line-ending unit attacks detect
this substitution. A model's confidence does not restore discarded information.

## Work bounds

At most 64 selected words. Six cap/order plans per mode; two tested modes
(normal and forced structural). Each row examines at most 8×8 parent pairs.
Thus ≤4096 row-pair probes per plan, plus at most 64 literal prices and one
complete-message price. Dictionary reconstruction is bounded by 64×96 ASCII
characters. The decoder frame cap is 150,000 UTF-16 units, output cap 50,000.
Sorting and tokenizer costs are not constant-time. This is work-bounded,
greedy per-entry search, not a universal wall-time guarantee or approximation
theorem. Forced mode chooses coverage rather than local token cost to ensure
the new two-parent mechanism is actually exercised; it is not presumed better.
