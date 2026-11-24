# X174 — KYMATIA: reversible multiscale integer lifting

Experimental, unwired new repository codec: `src/lib/omega/kymatia.ts`.
**Scientific acceptance is not inferred from adding a module or merging.**
Final numerical results belong in `receipts/summary.json` and the results section
below; native basic-chat decoding remains NOT_RUN unless an actual reply exists.

## Runtime honesty
Actually available/used: shell, Node/npm, TypeScript/esbuild, Python, git/gh,
web search/page retrieval and OS process control. No independent-agent runtime,
simulator, GPU training, connected database, external basic-chat decoder endpoint,
Lean/Lake/Coq executable or mathematical expert verification was available here.
There are real background processes, not imagined parallel agents. Canonical
replay is paused by its actual Node PID during isolated speed crossovers. Later
concurrent compression trials are not timing evidence.

## A–B. Formal contract and outcome space
Admissible sources: UTF-8-stable strings, at most 50,000 UTF-16 code units.
Transformation requires 2–2,048 maximal ASCII digit runs, each at most 24digits.
Literal tildes refuse transformation. The repaired planner also refuses U+FEFF:
a two-encoding transport test detected loss of that character through the library
round trip. Source signs, decimal points, exponents, non-ASCII numerals, spacing,
CR/LF, quotes and all other bytes are literal. No semantic number normalization.
Original padded decimal spellings are preserved with explicit width metadata.

Encoder access: source, fixed public tokenizer, candidate inverse, incumbent
message and its explicitly supplied reader, optional parent encoder/reader.
Decoder access: only the complete single message, including its instructions,
coefficients, width metadata and any parent contract/dictionary. No skills.md,
new vocabulary, system instructions, trained extension or original source.

Resource: complete o200k_base message token count, separately cl100k_base boundary
tests; original UTF-8 bytes for fidelity; CPU ms, wall ms and peak RSS separately.
There is no conversion from transform coefficients, bits or characters to tokens.
Tolerance: zero byte errors. Cost of search and headers is never free.

For every admitted x and incumbent b such that supplied reader R(b)=x and b has
an exact token price, the optional selector returns b or a candidate c such that
D(c)=x and T(c)<T(b). This is conditional on reader soundness, not a theorem about
arbitrary external readers. Rejected candidates retain b; search cost is not zero.
For native acceptance, fix an identified chat decoder L **before** a heldout test
and observe L(c)=x in raw reply bytes. Existence of executable D does not imply
this equality for L, much less for every LLM.

H+: a mechanism satisfying the full target may exist.
H−: no general impossibility theorem under this contract has been established.
H-boundary: exact bijections can fail BPE economics, native reliability or speed.
Do not select H+ merely because a test inverse succeeds; do not select H− merely
because this candidate loses.

Acceptance threshold retained from X173: >10net tokens saved in varied everyday
settings including prose and ops, all in-band costs, original-byte verification,
actual basic-chat decoding, and significant whole-stack speed without fidelity
loss. Speed gate: six-lane fresh-process ABBA/ACCA, identical wires, aggregate
CPU/wall<=0.90 and every protected lane<=1.0. No post-hoc relaxed threshold.

Adjacent non-solutions: lossy prompt summaries, learned embeddings, entropy coding
with hidden probability access, machine-tool decompression, token-ID packing,
raw-only gains, numeric-image experiments, finite source family universality,
smaller bit counts, a theorem with undischarged premises, a microbenchmark, and
fallback token nonregression substituted for runtime Pareto improvement.

## C. Mechanism, prior art, greediness and bounds
KYMATIA (small waves) applies integer Haar lifting to decimal fields:

    d = b-a; s = a+floor(d/2)
    inverse: a = s-floor(d/2); b = a+d

At each active length n, pack ceil(n/2) lows followed by floor(n/2) details; carry
the final unpaired input into lows when n is odd. Recurse only on lows, stopping
after the advertised level count or at length1. Undo levels in reverse order.
The low is an exact integer floor-average, and coarse averages themselves enter
the next scale. This is not a flat previous-row delta, FIFO successor graph,
length-sum alias solver, lexical anchor or scalar checksum.

Proof: substituting d into s-floor(d/2) yields a exactly for every integer pair,
including negative odd d. Therefore b=a+d. Packing is a fixed permutation and an
odd tail is carried verbatim. Induct over levels to obtain bijection. Mapping
back through recorded field positions and widths reproduces source spellings.
This is a hand proof backed by differential tests, not a theorem-kernel result.

Two layouts: separate coefficient line plus skeleton holes; or coefficients at
original field positions. Inline ~N denotes a negative coefficient and ~[w]
records padding. The instructions define these operations; neither layout
presumes the reader has learned the word “Haar”. Complete instruction cost counts.
Search independently enumerates levels1/2/4/12 and both layouts, deduplicates exact
folded wires, checks inverses, then ranks by exact direct price. The optional
selector makes at most one parent call for the cheapest direct plan. It is a
**finite screen, not greedy path search and not global parent-price optimization**.

Arithmetic per plan is O(k) BigInt operations: active lengths form a geometric
series. Costs depend on operand bit length (bounded here by 24decimal digits for
admitted values/coefficient range), plus O(n) text scanning and exact tokenizer
work. Memory O(n+k). Parent cost is additional; size/work caps are not hard CPU
or wall-clock guarantees. Inverse refuses malformed, oversized, negative-source
or impossible-padding wires rather than repairing source text.

Classical integer lifting ancestry is explicit in `research.md`. Repository
lexical inventory covers all preexisting module files; nearby numeric, constraint,
context, graph and tree designs were inspected. This is evidence of repository
mechanism distinction, not a certificate of universal originality or knowledge
of model training data. No “AI-only” discovery is asserted.

## D. Negative space and executable modal test
`modal.py` retains 27 explicit deceptive-shape tests: payload-only pricing,
weak baseline, normalization, encoder self-report, program-as-native, selection
leakage, symbol-to-token transfer, free header, free search, micro-as-whole,
contaminated timing, memo leakage, unsupported-as-pass, challenge-as-proof,
source-as-kernel, stale repair trust, restricted-family universalization,
finite-test universalization, character pricing, mismatched sources,
aggregate-hidden regressions, NOT_RUN-as-pass, axiom-as-certificate,
undeclared markers, known-source-as-blind, niche-as-broad and inherited gates.

Concrete modal countermodel: one program expands a closing-tag abbreviation,
another leaves it unchanged. The first program's existence cannot establish the
second's behavior. These are functions, not simulated models. The schema detector
requires explicitly supplied evidence flags; it cannot detect every misleading
English claim. Additional countermodels separate Euler existence from uniqueness,
and integer floor from truncation toward zero.

## E–G. Independent mechanism portfolio and structural attackers
All arms begin with original source, not another arm's favorable output.
A branch may return a counterexample/bound rather than a winning codec. Existing
controls are labeled rather than renamed as new inventions.

| Arm | Concrete artifact and established portion | Structure-specific attacker / cheapest falsifier | Exact unresolved interface and gap |
|---|---|---|---|
| Integer lifting | New KYMATIA module, inline/side layouts, recursive independent inverse | Negative odd detail; odd list length; padding; 24digit boundary; BOM tokenizer transport | Paid parent price and native execution; original acceptance problem, not a local lemma |
| Bitwise residual | `portfolio.ts` XOR numeric-run experiment with independent reconstruction loop | High bit changing at carry boundaries; padding width lost; instruction tariff | Full paid price/native, original economics; XOR is classical, not new math |
| Paid graph ambiguity | Bounded rank of complete label walks over MONODROMOS transition graph | Two return cycles; indistinguishable parallel copies; stranded edge; factorial enumeration | Full rank+graph+header versus parent; finite bounded design, not scalable optimum |
| Subsequence cover | Executed same-cover/length/histogram ambiguity family and counting bound | Multiple embeddings with equal histogram; free embedding tape | Must transmit remaining order; this restores original information requirement |
| Block sorting | Existing X165 ordinary BWT control rerun, exact inverse | Repeated rotations, primary-index tariff, broken lexical tokens | Not BBWT implementation; complete price/native inversion remain original gap |
| Lexical anchors | Existing ICHNOS plans rerun with exact inverse | Fragment ambiguity and literal anchor availability | Known control, not new codec; paid metadata and parent objective remain |
| Rank hash speed | Bench-only multiplicative 24/32bit table starting buckets | Collisions, missing keys, exact sentinel/linear-probe semantics | Actual whole-stack significant speed gate, not lookup latency alone |
| UTF-8 scratch speed | Manual byte encoder; exhaustive scalar/surrogate oracle and stack crossover | Lone/reversed surrogates, scratch boundary, BOM, NUL | Full stack speed and equality, not “allocation-free” rhetoric |

Ranked graphs: <=12edges, <=50,000DFS nodes, <=512walks; over-budget means refuse,
not “no solution”. ASCII-only label ordering is explicitly priced. The selected
rank pays for the missing order from X173's highest-information follow-up.
Subsequence-cover family at length2m has binomial(2m-2,m-1) members; a fixed binary
side field needs at least ceiling(log2 of that number). This is not a general
compression impossibility theorem. Limits and receipts remain visible.

## H–I. Verification and repairs
Source-byte tests are distinct from encoder self-report; Python uses a recursive
inverse rather than copying the TypeScript active-prefix loop. Both encodings
are checked against the actual tokenizer. Paid parent wires use independent
parent readers; unsupported readers are not counted exact. Native handoffs are
plain single-user prompts with raw-byte/hash reply checking, not fabricated runs.

Initial transport gate failed on U+FEFF; v1 source/test and failing log are archived.
Planner now refuses any source containing U+FEFF. Patch-directed tests exercise
leading, middle and trailing BOM. All affected unit, independent inverse, price,
selector and paid-parent gates must be rerun; no v1 success is inherited. This
conservative restriction is not a universal transport fix or a claim that
untransformed incumbent messages are always token-roundtrip safe.

## J. Reproduction and stopping policy
`npm ci`; bundle test.ts, portfolio.ts, trial.ts, gate.ts with esbuild
--bundle --platform=node --format=esm. `test.ts` writes the inputs needed by
independent.py. Build speed A/B with speed-build.mjs and C with utf8-build.mjs;
runtime-run.py/runtime-C.py pause the actual canonical Node PID and resume in
finally. `finalize.sh` requires a completed29lane frontier. Native handoff does
not call any model. Preserve all failure receipts.

No finite budget can guarantee a breakthrough, audit every lab theorem, or prove
an LLM behavior without running that interface. Integration may be merged at the
user's explicit request while scientific acceptance remains false. A failed arm
is not a reason to manufacture success or declare the broad problem impossible.

## Additional representation tests
`stride.ts` composes the new lifting transform with periodic numeric-field
demultiplexing (strides2/3/4/5/6/7/8/10/12/16). This is an explicitly identified
composition control, not another new primitive. 964plans passed inversion and
complete pricing; none beats raw text. The separate Python inverse tests every
plan. Source roles and paid parent leaders must still be compared, not replaced
by these direct prices.

`parent-tournament.ts` exhausts all emitted levels/layouts for KB and process-list
sources, including separately factored coefficient streams. It reuses the saved
primary parent wire and freshly encodes alternatives. This tests whether cheap
direct price predicts paid parent price; no claim of globally optimal transforms
or isolated runtime is made. The module's one-parent-call budget is unchanged.

`prior-claim-audit.md` corrects two inherited inference limits: a Brotli output is
not a lower bound on all codecs, and arbitrary-permutation bit cost does not
universally disqualify every invertible reordering. These corrections do not
manufacture a positive codec result.

### Paid representation outcome and newly exposed reader boundary
The complete finite tournament tested10plans: KB2, process listing8. Nine passed
separate source-byte reading. On process listing the separate stream reduced the
candidate722→636tokens (**86tokens within the rejected candidate family**) but
still loses to381. KB's best remains759versus620. This disproves optimality of
choosing parent input solely by cheapest direct price; it is not a frontier win.
Even the primary transformed parent bodies, before the lifting header, are more
expensive than their incumbents in all six trials. Header shortening alone cannot
fix those measured representations.

One process-listing four-level inline parent had an unsupported instruction
envelope. The TypeScript reader returned that wire unchanged; the equality gate
failed and the candidate was refused. Python separately reports unsupported.
The first strict tournament gate's failing log is retained; the reporting harness
now distinguishes returned-wire mismatch from a thrown unsupported exception,
and asserts it was never labeled exact. The6-check refusal gate gives a malformed
parent an artificially expensive valid JSON-literal incumbent, forcing an actual
decode attempt rather than mere cost rejection; the malformed parent is rejected.
No production reader was patched and no unsupported wire is promoted to exact.

Highest-information next codec test: sparse, explicitly paid local lifting on
correlated field groups rather than transforming every numeric field, with an
independent unchanged-source arm and complete metadata cost screened first. The
86token representation difference makes paid parent price the necessary objective;
it does not predict success. Actual blinded native single-chat trials remain a
separate mandatory interface, not something more program inverses can establish.

## Final executed results

**Scientific acceptance: false. Production defaults unchanged.** New codec is
experimental/unwired; neither speed patch is promoted. Machine-readable ledger:
`receipts/summary.json`.

| Gate | Actual outcome |
|---|---|
| Unit/transport/adversarial |13,873checks;13,212array inversions;37sources/234plans;0raw wins |
| Independent Python |14,499checks,12primary parent wires;964stride plans;9tournament wires;0errors;1unsupported tournament envelope |
| Primary selector |48checks;6paid-parent losses |
| Paid parent costs |email486→688; KB620→759; ps381→722; JSON653→851; TS949→1119; diff411→606 |
| Finite parent tournament |10plans;9exact;1refused. Best ps636, still255above frontier |
| Structure portfolio |952checks; cover multiplicities2/6/20/70/252 for lengths4/6/8/10/12 |
| Periodic grouping |964round trips;0fully priced raw wins |
| Hash speed |24identical ABBA wires; CPU0.977090/wall0.976687; rejected |
| UTF-8 speed |24identical ACCA wires; CPU0.973409/wall0.972958; rejected |
| UTF-8 byte oracle |1,114,121checks, including all Unicode code points and surrogate cases |
| Count/vector oracles |16,192count checks per A/B/C;12,124vector checks per A/B/C; equal outputs |
| Fresh frontier |29identical wires/11,962tokens versus X173 |
| Frontier independent readers |Python22exact/7unsupported/0mismatches; TS21exact/8unsupported |
| Native / theorem kernel |NOT_RUN / NOT_RUN |
| TypeScript, build, finalize |PASS; build retains existing CSS warnings |

The speed ratios are experiment-specific, not additive. Protected email
regression is about0.1%CPU in hash and3.8%CPU in UTF-8. No significant whole-stack
speed result is claimed. Canonical timing includes explicit pauses and cannot be
used as a throughput measurement.

### Generalized local leaders, explicit source roles
These summarize the measured fixture frontier, not global codec optimality or
per-codec causal ablations. Word references lead observed tape-body token classes
in prose, ops and code; OTHER has no tape-class leader.

| Source role | Lanes | Raw→frontier tokens | Largest absolute saving | Largest relative saving |
|---|---:|---:|---|---|
| PROSE |3|2018→1770|email-thread629→486|same |
| OPS/TABULAR |22|22332→8078|ls-l-real5194→1310|prices582→118 |
| CODE/STRUCT |3|3152→2013|json-pkg1152→653|same |
| OTHER |1|513→101|cue-sheet513→101|same |

The inherited category census is retained separately, but apt/node-help/dpkg are
ops, not natural prose. See source-role-leaders.json, local-leaders.json and
leaders.json for complete per-lane details. The fresh29lane result exactly
reconfirms X173; there is no new category leader attributable to KYMATIA.

Final local validation command: `sh bench/x174/validate.sh` (passed). It rebuilds
current codec gates and checks saved paid-parent/frontier receipts, then runs
tsc/build. It does not silently rerun the long canonical encode or native models.
`receipts/validation.json` binds successful local gates to source hashes.
Whitespace warnings in pinned Kubernetes/license bytes, corresponding native
prompts and captured Vite output are preserved intentionally, not normalized.
