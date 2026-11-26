# X189 formal contract, evidence thresholds, and negative space

## A–G: model

**Objects.** Source x is a UTF-8-stable JavaScript string whose UTF-8 bytes are
compared exactly to the source file. No normalization, line-ending conversion,
semantic equivalence, or lost trailing whitespace is admissible. ANAPLASIS is
partial: source and complete parent message each ≤50,000 UTF-16 code units,
2–128 ordinary acyclic CHIRON rules, supported prefix/script, no `<|` in the
message. Parent expansion must equal x, not an intermediate layout program.
The original parent is retained by the caller when the experiment refuses.

**Access.** Encoder sees source and the complete parent message. Executable
reader sees only the complete message and public grammar. A native-chat reader
would see the same single message, no tools, skills, system instructions,
training changes, or prior source. We did not run such a separate model.

**Resources.** C(m) is the reference o200k_base encoding length of the entire
message, including instruction, rule names/values, separators, and body.
C(a+b) is measured jointly; isolated costs are ranking heuristics only. Runtime
is measured separately in CPU milliseconds, wall milliseconds, and maximum RSS.
Reference-token spellings that are refused cannot be counted as free tokens.

**Quantifiers.** Code correctness target: for every admitted (m,x), any returned
candidate m' must satisfy D(m')=x byte-for-byte, and C(m')≤C(m). The strict API
returns only strict improvements. Finite tests are evidence for this invariant,
not a proof for all inputs. A native model claim would separately require, for
a specified model/configuration and evaluation distribution, one-shot output
bytes to match x. Existence of an executable inverse does NOT imply that claim.

For broad engineering acceptance in this experiment, predeclare: >10 tokens
saved on at least one prose and one ops case, source-exact no-regression
fallback, independent held-out confirmation, all-stack novelty evidence, and
native-chat checks. This is deliberately stronger than celebrating a one-token
lane win. For speed: isolated full-stack ABBA with aggregate CPU and wall ratios
≤0.90, no per-lane regression, identical emitted wires and exact sources. These
finite gates do not imply universal performance. They are not relaxed after
seeing results. Additional encoder time is not hidden by reporting token cost
alone; a token-only improvement need not be a Pareto improvement in time.

**Regime/boundaries.** Width is fixed by implementation, not learned on test
files: 12 deletion candidates, pairs among six, at most 28 seed states, initial
plus 12 lowest-priced deletions retained. Every deletion may temporarily cost
more. One reconstructed move only; ≤4096 priced probes. New phrase lengths
2..24 UTF-16 units; surrogate-containing phrases are excluded. Fresh glyphs are
from the parent's script within U+0370..U+06FF, absent from source and wire;
up to four retained. Unsupported scripts may have no candidates. Prefix,
expansion and symbol-domain checks precede ordinary parent decoding.

Character ranking selects 32 from a 384-candidate frequency/length shortlist;
token ranking reorders that shortlist by an explicitly non-binding proxy;
boundary ranking additionally favors phrases touching whitespace. That last
filter does NOT promise whole-word boundaries or native readability. Final
pricing/decoding is unchanged across rankings. Ranking ablations are search
variants, not additional mechanisms.

## Outcome space

- **H+**: a sufficiently new, broadly useful, fully paid codec passes all gates.
- **H−**: no such codec exists under a precisely specified admissible family.
- **H∂**: achievable only after changing constraints or at size/data boundaries.

The current measurements do not establish H−. A local-search failure is not a
lower bound. The injectivity/counting argument only excludes compressing every
possible input into fewer distinct messages: with a finite output-token alphabet
V there are at most Σ(i=0..k)|V|^i token sequences of length ≤k. More distinct
sources cannot all map injectively into this set. This does not exclude broad
improvements on the user's everyday corpus, nor settle native model behavior.

## Adjacent problems not substituted

Binary compression; changed-tokenizer vocabulary training; semantic summaries;
external dictionaries; general-purpose decompression code execution; symbol-size
smallest grammar; shortest common superstring; lossless source recovery only
after an undocumented layout pass; a universal compressor; a trained decoder;
a mathematically existing inverse; one friendly in-context example; and an
encoder-only microbenchmark are all different from the user's contract.

## At least 15 deceptive result shapes and their rejecting gates

1. Missing instruction cost → whole-message reference count.
2. Free rule dictionary → charge all names and values.
3. Character savings called token savings → actual o200k count.
4. Raw representation win called parent win → compare canonical parent.
5. Normalized text called exact → byte equality including CRLF and NUL.
6. Parent-layer equality called source equality → strict x comparison.
7. Source-informed hand decoding called blind native test → NOT_RUN label.
8. Python inverse called model behavior → separate native gate.
9. One-token saving called breakthrough → >10-token broad gate.
10. New filename called new mechanism → ancestry audit, novelty unestablished.
11. Six rankings called six mechanisms → rankings distinguished from families.
12. Costly deletion discarded before joint evaluation → retain uphill seeds.
13. Overlap counts treated as a rigorous gain bound → final exact pricing.
14. Unicode surrogate halves silently replaced → transport-domain refusal.
15. Malformed decoder identity fallback called valid parsing → explicit rule validation.
16. Reserved-token spelling used for free tokens → conservative `<|` refusal.
17. Concurrent CPU work called speedup → isolated ABBA stage.
18. Warm-cache arm compared to cold → fresh processes, alternating order.
19. Downloaded Lean source called checked theorem → kernel NOT_RUN.
20. Symbol-length approximation called BPE approximation → unit-alignment check.
21. A partial RH result called full RH proof → scope/source distinction.
22. Repair inheriting earlier test trust → fresh final rerun and targeted attacks.
23. Changed output wire hidden by equal token total → compare full wire strings.
24. Unsupported/timeout cases omitted from denominator → explicit status.

## Modal shortcut and executable counterexample

Choosing the most probable expansion cannot ensure universal exactness. The
three distinct byte strings `the cat sat\n`, `the  cat sat\n`, and
`the cat sat\r\n` share the same whitespace-normalized message. Any deterministic
inverse of that message returns at most one of them; random choice cannot have
probability one on all three. `test.ts` asserts this collision. Linguistic
confidence is not missing information. A repair needs paid disambiguation or
an input-domain restriction, followed by all affected gates.
