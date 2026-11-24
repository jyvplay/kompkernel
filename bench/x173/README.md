# X173 — MONODROMOS (unique route; experimental and unwired)

**Scientific acceptance: false.** New executable codec and experiments are
provided; no broad Pareto advantage or native-chat decoding success is claimed.
Production defaults remain unchanged. Machine-readable results: receipts/summary.json.

## Runtime honesty
Actually used: Node/npm, TypeScript/esbuild, Python, git/gh, web search/page
retrieval and OS process control. No independent-agent tool, simulator,
external basic-chat model endpoint, connected database or GPU training run.
Lean, Lake and Coq were absent; no theorem kernel or LRAT checker ran. Parallel
web calls and background processes are real tool executions, not imagined agents.

## A. Formal model / admissible objects
Source x: UTF-8-stable text, <=50,000 UTF-16 units. A graph-eligible line is split
on ASCII spaces, retaining empty fields; it has2–65fields. Each field excludes
ASCII space and LF but may contain CR, tabs, Unicode, quotes or other characters.
A graph block is a `~` line holding JSON `[start,rows [from,edges [to,count]]]`.
Counts are integers1–64, total multiplicity<=64; duplicate rows/targets refuse.
Every edge copy must be consumed. Parallel copies with identical endpoints are
indistinguishable; uniqueness concerns the emitted field sequence, not edge IDs.
Other lines are literal. The planner conservatively refuses sources with a line
starting `~`. Whole input/output cap50k; isolated surrogates refuse. No whitespace,
Unicode or final-newline normalization is permitted.

Decoder information: only the complete in-band key, graph labels/counts, literals
and any complete parent message. No source, skills.md, system dictionary, model
training, prior chat or unpriced reference material. All header/dictionary/parent
costs count in o200k_base tokens; source equality is measured in original UTF-8
bytes. Encoder CPU, elapsed time and RSS are separate quantities.

Quantifier order: for every admitted x and supplied incumbent b with a sound
reader R(b)=x, the selector returns b or a verified candidate c with D(c)=x and
T(c)<T(b). Soundness is conditional on the supplied reader. For native evidence,
a fixed identified chat decoder L must actually reproduce bytes on heldouts;
`exists D, D(c)=x` does not entail `L(c)=x`. No all-model or all-input native
guarantee is inferred from finite tests. Zero byte-error tolerance.

## B. H+, H−, H-boundary and thresholds
Inherited X172 acceptance threshold, not relaxed after measurement: >10net tokens
saved across varied settings including prose and ops, original-byte verification,
complete price, actual basic single-chat decode, and significant honest whole-
stack speed improvement. Speed gate: six-lane fresh-process ABBA, identical
hashes, aggregate CPU/wall<=0.90 and every protected lane<=1.0.
H+: a suitable mechanism may satisfy that conjunction.
H−: impossibility under those constraints remains unproved; failed candidates
are not an impossibility theorem.
H-boundary: exact unique graph reconstruction may hold while token economics,
native reliability or runtime fail. Fallback prevents token loss, not search cost.

Do not substitute raw savings for incumbent gains, bits/chars for tokens, a
semantic paraphrase for bytes, a program for a model, a definition for a proof,
a theorem with premises for a discharged application, or a single-lane timing
for a whole-stack speed improvement.

## C. Construction, novelty boundary, greediness and costs
MONODROMOS drops successor order and keeps only transition multiplicities. It
reconstructs only when exactly one complete directed walk begins at start.
Unlike DIADOCHI, rows are NOT FIFO queues; their order is semantically irrelevant.
Unlike KYKLOS there is no cyclic schedule; unlike METRIDA there is no scalar sum;
unlike ICHNOS there is no content-fragment anchor matching. Classical Euler-trail
and shingle-reconstruction ancestry is explicit (research.md). Repository review
searched relevant terms and inspected nearby mechanisms; not universal originality.

Existence test: on residual edges, require weak connectivity of non-isolated
vertices and balanced degrees (circuit), or start+1/end−1 with all others0.
Start must be non-isolated unless no edges remain. For each distinct outgoing
target, consume one edge temporarily and test residual existence from the target.
Two viable targets imply two different texts: refuse. One is forced. Repeat.
This is **not greedy path guessing**. It is a uniqueness test with a forced move.

Proof sketch: add end→start in the open case. A balanced weakly connected active
graph has an Euler circuit; removing the added edge yields the required trail.
Thus residual feasibility is equivalent to a completion. Any two viable next
labels yield distinct completions; a single viable label is necessary for every
completion. Induction reconstructs the unique sequence. Space-joining is
injective because labels exclude spaces and empty fields are retained. Tests
back this hand argument; no theorem-prover certification is claimed.

Planner: finite independent screen over edge caps8/16/32/64 and repeated-edge
thresholds0/1/3, rejecting nonunique lines. It does not optimize arbitrary line
subsets, graph layouts or parent price globally. At most one parent call, selected
by complete direct price. Decoder work per graph is O(E*T*(T+V)) graph operations
for E edge copies, T distinct edges and V labels, all bounded by64/64/65; label
comparison/hashing costs must also be counted. Not the linear-time algorithm of
the cited paper. Parent runtime is additional; caps are not CPU/wall guarantees.

## D. Negative space
`modal.py` executes27 explicitly flagged deceptive shapes: payload-only price,
weak baseline, normalization, encoder self-report, program-as-native, selection
leakage, symbol-to-token transfer, free header, free search, micro-as-whole,
contaminated timing, memo leakage, unsupported-as-pass, challenge-as-proof,
source-as-kernel, stale repair gates, restricted-family universalization,
finite-test universalization, char-as-token price, mismatched sources,
aggregate-hidden regressions, NOT_RUN-as-pass, axiom-as-certificate,
undeclared-marker semantics, known-source-as-blind, niche-as-broad and inherited
repair trust. This is an evidence-schema detector, not an English theorem prover.
Two executable functions refute program-existence⇒native success. Additionally,
`a b a c a` and `a c a b a` have the same start/transition multiset but differ:
Euler existence is not unique reconstruction.

## E–G. Mechanism portfolio and specific adversaries
Independent arms start from original source text. Controls are identified as
existing mechanisms, not renamed new codecs. Concrete results live in portfolio,
anchor-search, ambiguity-bound, vector and runtime receipts.

| Branch | Artifact / established portion | Strong structural attack and cheapest test | Remaining gap |
|---|---|---|---|
| MONODROMOS | New module; residual-feasibility inverse and independent DFS | Two reorderable return cycles; disconnected residual loop; wrong start; duplicate edge rows; indistinguishable parallels | Paid parent/native gains: original target, not merely local syntax |
| ICHNOS anchor placement | Exact Cartesian search over <=4chosen words, <=6occurrences each, fixed reference spelling | Anchor moved after reference; missing last literal anchor; complete-message price vs isolated word cost | Exact only in stated subspace; full parent optimization remains original economics |
| Weighted length constraint | Existing X172 weighted METRIDA control, complete round trips | Equal weighted sums for different assignments, e.g. weights1+4=2+3 | Scalar ambiguity and instruction cost; not a new mechanism by renaming |
| Occurrence-choice tape | Existing DEIKTIS control with explicit inverse | Missing/extra selector entry; paid choice alphabet | Native choice tracking and incumbent comparison |
| Move-to-front recency | Executed numeric recency transform and inverse | Updating wrong word after a reference; cold-start index; punctuation counted as words | Reference cost and parent redundancy; no novelty claim |
| Block/BWT transform | Existing X165 block sort and inverse | Periodic rotations, primary-index cost, byte boundaries | Paid permutation/index and native inversion |
| Colexicographic components | Existing COLEX involution | Empty components and separators at both ends | General gains vs rare path spelling; no novelty claim |
| Short-pattern scorer specialization | Bench-only identical string assembly for lengths0–4 and general indexed loop | Empty strings, surrogate pairs, long patterns, duplicate changed slots and finite cutoffs | Exactness passes; whole speed fails |

An independent finite information bound complements the graph tests:9,837
sequences yield3,129graphs, max ambiguity20. In that graph, distinguishing every
source needs at least5bits in a fixed-length binary side field. This is not a
BPE-token lower bound or proof of global compressor impossibility.

## H. Executed verification
* Current codec:6,018checks; exhaustive oracle9,837sequences /3,129graph classes,
  1,065unique accepted,2,064ambiguous rejected. Row/edge order reversal tested.
*37corpus sources (including3fresh whole documents),97plans; preliminary
 34source portfolio89plans, zero raw wins. Fresh Python classes, Rust slices
 and Kubernetes StatefulSet debugging documents are pinned with licenses/hashes.
* Independent DFS:1,691checks including12complete base/candidate parent wires,
  zero errors/unsupported; separate ICHNOS inverse14anchor results. DFS has a
 200k-node cap and explicitly reports unsupported rather than claiming success.
* Six fully priced parent trials: email486→580, KB620→750, ps381→487,
 JSON653→747, TypeScript949→1077, diff411→548. All losses; selector retains base.
 Saved-parent gate48checks.
* ICHNOS anchor search1,425checks: only JSON and ps-ef improve, one direct token
 each. This does not meet>10tokens and was not promoted to a parent win.
* Count A/B16,192checks each. Scorer oracle12,124checks per arm; long/empty-
 pattern attack6,089per arm. A/B outputs agree.
* Six-lane ABBA24identical wires: CPU0.998243, wall0.996369. Protected regressions
 include process listing (~7.9%); **speed rejected**. No production patch.
* Native handoff prepares3prompts, NOT_RUN. No native success claim.

## I. Repair and trust policy
A pricing-boundary repair was required: literal tokenizer special-token spellings
raised under both encodings. Graph JSON now escapes `<` as `\u003c`; standard
JSON decoding preserves the original bytes. Unpriceable literal spans refuse the
plan; an unpriceable supplied incumbent still lies outside selector admission.
Pricing uses countTokensExact, avoiding environment-dependent estimates. Archived
v1 sources/receipts retain the failure. Fresh unit, 28-check two-encoding pricing,
independent inverse, six paid-parent and 48-check selector gates passed after repair.
Native remains NOT_RUN and is not inherited as a pass. Additional
attacks (combined expansion, escaped surrogate, duplicate rows, space/LF labels,
BOM/NUL/quoted data, instruction-looking literals) were added and gates rerun.
The trial harness was hardened before trials to preserve unsupported parent wires
rather than losing the candidate receipt when the reader throws. This is not
permission to count unsupported as exact. Any future codec repair needs fresh
unit, independent inverse, complete price, native and targeted-patch gates.

## J. Decision and next highest-information test
Keep MONODROMOS unwired and the scorer patch benchmark-only. Do not infer that
a more compact graph is broadly useful merely because it is invertible. Next
codec test: a paid ambiguity-resolution/graph-label representation against the
current parent, first rejecting it on complete metadata cost before expensive
search. The remaining native interface requires an actual external blinded
single-message decoder run. Merge is requested independently of acceptance;
integration is not a Pareto result. Exhaustive frontier-lab proof verification
was not performed; source hypotheses/trust layers are in research.md.

## Reproduction
`npm ci`; bundle test.ts, portfolio.ts, anchor-search.ts, trial.ts and gate.ts
with esbuild --bundle --platform=node --format=esm; execute the resulting tools.
`independent.py`, `ambiguity-bound.py`, `modal.py` and native-handoff.py use their
saved inputs. speed-build.mjs generates A/B without modifying production.
runtime-run.py validates and pauses the ACTUAL canonical Node PID, then resumes
it in finally. No heavy builds/tests/trials ran during that crossover. Later
canonical, parent and Requests replays are concurrent and not speed comparisons.
finalize.sh requires a completed29lane replay; never call partial evidence a pass.

## Final frontier and build
Fresh replay:29identical wires/11,962tokens against X172. Independent Python
22exact/7unsupported/0mismatches; TypeScript21exact/8unsupported. These partial
readers do not certify the unsupported formats. Source-role leaders remain
PROSE2018→1770(3lanes), OPS22332→8078(22), CODE3152→2013(3), OTHER513→101(1).
Requests bounded-cache replay completed and independently reconstructed19,213bytes;
concurrent timing is not speed evidence. finalize.sh, tsc and build passed. The
first build was killed while replay workers ran; the post-replay retry passed
with existing CSS warnings.
