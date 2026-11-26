# X184 formal model, evidence thresholds, and adversaries

## A. Objects

Let D be the UTF-8 encodings of Unicode-scalar strings with at most 50,000 UTF-16
code units, excluding tokenizer-reserved special spellings rejected by the
repository's default reference encoder (for o200k: <|endoftext|> and
<|endofprompt|>). KARTES pricing supports D, not arbitrary binary files,
reserved-token inputs, or lone-surrogate JS strings. The structural transform
itself can preserve those spellings, but that does not make default pricing
admit them; explicit rejection tests cover this distinction. Splitting on the literal ASCII space retains empty fields; all tabs,
newlines, CRLF, NULs, combining marks and non-ASCII characters remain literal
inside fields. Candidate admission also requires the JSON frame cap; for example,
50,000 NUL characters require excessive JSON escaping and yield no plan (tested).
KARTES is an unwired candidate generator, not a universal source-to-wire API.
The correctness statement applies to every emitted candidate; identity fallback
belongs to the caller's existing frontier and is not a newly shipped dispatcher.

## B. Information/access

Encoder sees the whole source and the fixed tokenizer. Decoder sees one paid
user message only: header, any parent header, tree shapes, preorder fields.
No skill file, hidden dictionary, shared source, corpus lookup, system instruction,
or trained new vocabulary is assumed. The software inverse receives a bounded
parent reader. A native trial would require a separately identified model and
fresh single-chat execution; neither software tests nor this assistant's prior
access to the source establishes that trial.

## C. Counted resources

Primary cost T is exact o200k_base token count of the concatenated complete wire,
not sum of separately tokenized pieces. Also count encoder process CPU ms, elapsed
wall ms and peak RSS in isolated speed trials. Count source/output fidelity as
byte equality, not similarity or normalized Unicode equality. Concurrent paid
correctness trials are NOT speed measurements. Compiler output is not a runtime
benchmark. No fixed-latency bound follows from a work bound.

## D. Quantifier order and success

Freeze one encoder E, decoder contract D_E, tokenizer and source manifest BEFORE
running heldouts. For every admitted source x, require D_E(E(x))=x (construction
proof plus finite tests, not tests alone). For every protected benchmark source,
no accepted output may exceed its baseline cost or lose fidelity. There must exist
at least two prose and two ops sources, including heldouts, each saving >10 paid
tokens. Native acceptance additionally requires actual byte-exact single-chat
runs on declared evaluation models; one success is not a universal statement
about all LLMs. No sampling assumption defines a population-wide gain here.

Speed acceptance inherited from X182: six protected lanes × ABBA =24 isolated
fresh processes; identical wire hashes, aggregate CPU and wall B/A≤0.90 and each
protected lane CPU and wall B/A≤1.0. A conditional optimization is not promoted
without these gates. This demanding finite rule still is not a universal speed
proof. Baseline canonical target is29 wires/11,962 tokens from X183; fresh replay
must establish or replace this value.

## E. Regime and construction

KARTES enumerates field block widths32/128/512 × priority lexicographic Unicode
scalar order or scalar length. Equal priority keeps the leftmost as ancestor.
A monotone stack constructs the minimum Cartesian tree. Each node emits one
preorder flag:0 leaf,1 left,2 right,3 both. Values are emitted in preorder as a
space-joined string, including empty fields. JSON array of [shape,fields] blocks
is passed intact to the existing parent. All tree shape information is paid.

For a block with k fields, each node is pushed/popped at most once: O(k) priority
comparisons and O(k) traversal. Current comparisons materialize code-point arrays,
so worst-case work is O(kL), L maximum field length, not O(k) character work.
JSON/tokenization/parent search are extra. Decoder is iterative O(n+text length)
with explicit shape arity and slot checks, blocks≤1563, nodes/block≤512, frame
≤220,000 and output≤50,000 UTF-16 units. Encoding selection is finite enumeration,
NOT greedy paid optimization; monotone-stack construction is exact for its chosen
priority, not a globally optimal serialization or minimum-BPE tree.

## F. Proof and imported-theorem boundary

Preorder flags determine the unique ordered binary tree by consuming pending
child slots, right then left on a LIFO stack. Surplus/missing slots are rejected.
Preorder fields bijectively label its nodes. Inorder traversal recovers the source
order of a Cartesian tree; concatenate blocks and restore ASCII separators.
Because all other scalars are copied, UTF-8 bytes are equal on D. These are two
separate invariants: structural inverse and encoder Cartesian ordering.

The RMQ literature studies a quotient of sequences: increasing [a,b] and [c,d]
have the same Cartesian shape and every corresponding RMQ answer, but different
source bytes. Tree-only compression bounds cannot be imported as exact source
compression bounds. `test.ts` explicitly detects this modal shortcut. An RMQ
index does not need to recover node values; our codec does and pays for them.

## G. Adjacent problems excluded

RMQ answers; unordered/multiset equality; sorted records; semantic paraphrase;
lossy prompts; downstream-answer accuracy; shared/system dictionaries; binary
bit compression presented as BPE gain; uncharged IDs; trained model-specific
codebooks; schema reconstruction; software decoding presented as native reading;
CPU microbenchmarks presented as whole-stack performance; Lean source retrieval
presented as kernel verification; novel parameter choices presented as mechanisms.

## H. Outcome space

H+: A paid exact native-readable general improvement exists. Requires the gates,
not optimism. H−: no such codec exists under the frozen contract. Not inferred
from these failed trials. H∂: outcomes depend on source distribution, key budget,
model, tokenizer, representation and runtime limits; supported as a practical
possibility but not a blanket positive result.

A simple impossibility bound applies only to universal shortening: over a finite
wire alphabet of size V, there are Σ(i=0..b)V^i wires of length≤b. An injective
encoding of more source strings into those wires is impossible. It does NOT rule
out improvement on a restricted practical corpus, or prove global optimality of
this repository. The open interface is paid utility + native behavior, not the
existence of an invertible tree serialization.

## I. Negative space: 20 tempting failures

1 shape-only compression (different values same shape);
2 sorted values without order (different permutations);
3 free shape (complete-wire price);
4 free header (complete-wire price);
5 free parent/dictionary (complete-wire price);
6 separate-token-count sum (concatenated reference encode);
7 semantic equality (Buffer byte equality);
8 normalized Unicode (combining/astral tests);
9 lost empty fields (space-run exhaustive cases);
10 recursive stack overflow (iterative decoder,512-chain attacks);
11 missing child (slot exhaustion);
12 extra root (surplus-node rejection);
13 bogus digit (strict0–3 alphabet);
14 expansion bomb (UTF-16 cap, including astral attack);
15 six parameter settings as six mechanisms (separate six-family registry);
16 raw win as frontier win (paid parent comparison);
17 software inverse as native (NOT_RUN gate);
18 test pass as universal proof (construction proof plus bounded empirical claim);
19 non-systematic RMQ theorem as source recovery (modal counterexample);
20 better aggregate timing concealing protected regressions (per-lane gate).

`adversary.ts` executes six structure-specific rejection cases, boundary sources,
and sixteen Boolean acceptance-gate omissions. Boolean gate tests are logical
contract tests, not invented empirical verification.

## J. Repair and stopping

The first speed-attack harness failed because the reference tokenizer rejects a
literal special-token spelling by default. Repair explicitly prices it as ordinary
text with disallowedSpecial empty; no encoder semantics were changed. Both arms
and all affected count/vector/merge/stream gates were rebuilt and rerun; repeated
warm calls and regex-state checks are targeted attacks. No trust inherited from
prior receipts. Final results must record failed/time-limited/unsupported cases.
A resource-limited negative experiment returns its executable artifact and gaps;
it cannot honestly satisfy a demand to guarantee a breakthrough.
