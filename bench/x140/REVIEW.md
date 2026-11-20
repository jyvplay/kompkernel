# X140 A–J evidence ledger

## A–B. Model / admissible objects

Source x is one finite UTF-8 document. F(x) is the shipped TAGSTACK result with
`OMEGA_DET=1`, `OMEGA_NO_MEMO=1`, `OMEGA_ENGRAM=0`, `OMEGA_OURA_MEMO=0`,
`OMEGA_NO_OROTHESIA=1`, o200k_base, remaining defaults. The fixed canonical
corpus has29 lanes; two first100-line installed-package documents were frozen
before pricing as separate transfer tests. Source hashes and versions are saved.

A compressed object is ONE ordinary message, including its entire decoding
contract and dictionary. EIKON's grammar permits concatenation plus images of
fully expanded rules: ASCII uppercase/lowercase and simultaneous one-character
substitution. References may point forward but the whole graph must be acyclic.
The encoder accepts only three explicitly recognized simple-grammar parent
headers and refuses parents using repeat/fill/list/range operations, tildes or
surrogates. Trial may return a larger diagnostic wire; `eikonFromFrontier` admits
only strict full-message token savings. No default integration.

## C. Access model / actual tools

Encoder sees source and tokenizer. Decoder gets only the message: no source,
external dictionary, skills.md, system-prompt rulebook, tools or training changes.
Scoring can read source afterward. A program inverse and an ordinary model's
behavior are separate predicates. Source-aware reasoning by this assistant is
not a blind test, so native behavior remains NOT RUN.

Actually used: shell, git/gh, npm, esbuild, Node/TypeScript compiler, Python,
Node CPU profiler, web search/fetch and GitHub API. Parallel tool calls and
concurrently running local benchmark processes occurred; they are not parallel
independent agents. No agent-spawning tool or blind-model endpoint was available.
No Lean/lake binary found, theorem prover run, external expert review, database
benchmark, physical experiment or simulator executed. Generated unit adversaries
are real tests of code, not claimed real-world compression workloads.

## D. Resources / boundaries

Cost T is reference o200k_base tokens for the COMPLETE message. Source equality
is UTF-8 byte equality, zero tolerance. Record full parent CPU/wall work including
rejected variants; concurrent timing is not causal speed evidence. Decoder cap:
128 rules, 20,000 expanded UTF-16 units per definition, 100,000 body/output units;
encoder restricts the wire to BMP, hence code-unit/codepoint consistency. It
refuses larger domains, rather than silently truncating or normalizing.

EIKON: at most4 improvement passes and4096 decoded/priced candidates, pair pool12
(at most66 pairs/pass). Enumeration is separately up to4 R² K image comparisons,
K=10, each proportional to capped expanded length. Thus4096 is NOT a cap on all
CPU work. Decoding materializes at most R*20,000 cached units, plus output and
candidate strings. Full-message BPE pricing can dominate. CPU-bound structural
limits, no wall-clock cutoff and no optimality theorem. Source dictionary mining
uses1..4 lexical chunks, length6..120, selects at most16 added values, total rule
cap128. Proxy selection is heuristic; all reported prices are full messages.

Source involution control swaps both characters simultaneously, then sends the
result through the FULL parent and reverses after full parent decode. Six source
maps are screened by raw tokens; two are run for each selected real source. Raw
ranking is not an oracle for parent gains. Timing includes the full parent but
not a claim that a pre-pass alone accelerated it.

Generational memo experiment: exact (encoding,text)->integer values, same2M
retained-key-character budget PER encoding and50k entry cap. Each generation gets
half; keys larger than half are not stored. This bounds retained key length, not
V8 RSS/object overhead. The default hot-path hook was removed after the negative
speed test; `memo-experiment.patch` and `build-memo.sh` reproduce it in standalone
bundles. No shipped compression or memo-policy change remains.

## E. Quantifiers and decision threshold

Fix encoder E, declared model/version M, source corpus C, configuration F and a
controlled timing protocol BEFORE accepting a claim. Require:
(1) for every x in C, independent D(E(x)) equals x in bytes;
(2) for every x in C, T(E(x))<=T(F(x));
(3) for some real prose/ops x, T(F(x))−T(E(x))>10;
(4) a blind single-message M trial reproduces source exactly on declared test
    messages, without auxiliary state;
(5) full-cost objective vector is non-regressing under the declared measurement
    and shows a strict benefit, not just smaller emitted text after expensive search.
No single finite native trial proves all future models or inputs. A per-source
selector can preserve token non-regression but still adds latency. No default
promotion/merge unless all mandatory gates pass. None are presumed from a name.

## F–G. Adjacent problems and negative space

Twenty shortcuts, with detection:
1. Bytes/chars shrink, tokens grow → reference full-message price.
2. Tape shrinks, contract dominates → compare against original F, not new header.
3. Input-like output looks right → UTF-8 comparison with frozen source.
4. Encoder-reported `decoded` alone → independent emitted-wire implementation.
5. Program inverse proves model behavior → explicit native NOT RUN field.
6. Cached prior-turn message called fresh → fresh frontier process and full diff.
7. More candidate rules imply improvement → matched ordinary/image trials.
8. One winning candidate supplies price, another supplies runtime → bind message/hash.
9. Case normalization without residual → `semantic-collision.json` executable collision.
10. Unicode case applied to ASCII operation → ß/dotless-i/é unit adversary.
11. Transform wire glyphs instead of expanded value → nested transformation test.
12. Sequential replacement rather than one-step image → `abab`, a→b test.
13. Forward reference parsed as new rule → explicit expression framing tests.
14. Hidden unreachable cycle ignored → expand/check all definitions.
15. Two individually cheap image rules assumed compatible → U/L reciprocal-cycle attack.
16. Synthetic test benefit labeled everyday gain → mechanics fixture labels.
17. Faster cache microbenchmark called whole-stack speedup → full-parent ABBA/BAAB.
18. Larger memo called free speed → equal key-character budgets; RSS not asserted equal.
19. External challenge `sorry` called proof failure/success → distinguish challenge/library.
20. Asymptotic theorem applied to arbitrary costs → imported-result interface ledger.

The modal failure is (5)/(9): deterministic source-aware reconstruction is not
unique recovery by an ordinary model. `Policy A.\n` and `policy  A.` have the
same normalized representation; no decoder of that representation alone can
recover both. More reasoning cannot repair missing distinguishing bits.

## H. Outcome space

H+: finite-corpus substantial useful gains may exist. Evidence threshold is the
five gates above, not an optimistic theoretical analogy. Not established.
H−: all finite strings cannot strictly shorten under a fixed finite-alphabet
injective code. Counting distinct outputs proves this; it does not rule out
our corpus. Failed finite search is not a global impossibility theorem.
H∂: output token model, available decoder state, source class, native-model
behavior and budgets change the answer. Shared-dictionary binary compressors
and theorem-prover-equipped agents solve different access-model problems.

## C. Frontier / theorem interface

Fresh29-lane confirmation is separately summarized from experimental trials.
Literature hypotheses, proof/code boundaries and newly visited sources are in
`research.md`. Best-known statements retrieved here are bounded literature
coverage, not a certified exhaustive frontier of all mathematics/compression.
No imported proof was used to assert a native codec or a measured speedup.

## E–F. Mechanism portfolio — independent artifacts

| Mechanism | Construction/artifact | Established part | Gap / cheapest falsifier | Gap scope |
|---|---|---|---|---|
| Expanded-rule image grammar | `eikon.ts`, probe/joint/unit/Python reader | deterministic capped acyclic semantics and exact emitted outputs | full wire price rejects; native NOT RUN | local search + behavioral gate |
| Interior-substring grammar | `interior.ts` JSON rules and source-mined dictionaries | explicit indexed view inverse, hidden-cycle/end-bound attacks | larger full wire; not a novel rename of APOTOME | local repertoire/framing |
| Ordinary concatenation | same literal value dictionaries, reused SYNAPHE control parser | matched control source inverses | may absorb same structure more cheaply; no new mechanism credit | local search |
| Source-alphabet involution | `precondition.ts`, six-map screen and full parent trials | exact inverse even when both symbols occur | raw-rank not parent rank; measured full prices | local representation |
| Numeric prediction | existing DIAPHORA, `delta_control.ts` |29 exact standalone inverses | standalone not composed parent; full cost rejects | local composition |
| Positional copy | `controls.ts` explicit source-offset copies |29 exact inverses, prior-text-only bounds | addressing/contract overhead and native behavior | local + access/model |
| Entropy coding | Brotli/base64 control |29 byte-perfect roundtrips | binary decoder is outside native reasoning model | access boundary |
| Two-generation memo | optional `count-memo-generations.ts`, memo_unit/speed | exact key/value behavior and budgets | need causal full-stack measurements, not cache intuition | local optimization |

These are independent mechanism families, not eight new codec names. Only EIKON
is presented as a new experimental codec module. Existing components are reused
and identified. Ordinary/image arms share source-mined values to control for
search-budget advantages. Test scripts, not narrative proposals, are retained.

## G. Structural attacks / repair

EIKON correctness argument: a finite acyclic dependency graph can be evaluated
in topological order. Every reference has a unique expanded value; ASCII case
and one-character replacement are total deterministic functions of that value.
Concatenation therefore gives a unique output. Encoder verifies every emitted
rewrite against the original expanded parent layer, then tests source-level
STELI composition independently. Image operations need not themselves be
injective: their inputs and requested operations are already carried by the
code. Source-to-wire injectivity follows only where the full inverse gate holds.

Counterexamples to shortcuts: transforming `а` in the wire need not transform
the ASCII letters of its expansion; Unicode `toUpperCase` would change ß contrary
to our contract; two image rules can create a cycle even if their strings match
wanted outputs individually. All are targeted in unit.ts. Real EIKON searches
accepted no images; their inverse tests do NOT exercise successful real-world
use of the new operator. Seven targeted mechanics fixtures do.

Interior harness initially failed to bundle due to a missing bracket in an
attack assertion. Fixed, rebuilt, executed, and added an end-out-of-bounds
substring attack. A successful compile before this repair was not claimed.
Memo constructor initially lacked direct-API NaN/Infinity validation; repaired
with explicit rejection and seven new invalid-budget tests. Full unit/counter
gates rerun; optional runtime benchmark must use the repaired build.

## H–I. Verification boundaries

Compiler output, actual unit totals, independently implemented Python readers,
full wires and source comparison receipts are retained. Independence means a
second implementation in this session, not another person/agent. Fresh heldout
files were frozen prospectively, but their number is small and no population
claim follows. Native evaluator, external proof replay and exhaustive semantic
novelty audit remain unavailable/incomplete, not implicitly passed.

## J. Decision / next highest-information test

No terminal codec claim. No merge without acceptance. The most informative
remaining question is whether long repeated *transformed phrases* exist in a
prospectively frozen everyday corpus at enough frequency to pay the operator
contract; current parent dictionaries and source-mined short phrases do not.
Do not keep renaming slice variants or shrinking instructions and call it new
mechanism evidence. If speed testing shows no robust benefit, leave the new
cache disabled. For any previously price-winning KREMA/PTYCHE candidate, a real
blind native-model response remains the indispensable missing experiment.
