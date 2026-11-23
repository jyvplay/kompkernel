# X165 — context-addressed copies and exact search acceleration

## Runtime honesty / predeclared contract

Available and used: shell/git/gh, filesystem, Node, Python, npm, esbuild, TypeScript,
Vite, web search and page retrieval. Independent agents: none. Simulators: none.
No database queried. Lean/lake absent; native independent single-chat model API
not exposed. Concurrent OS workers are real processes, not independent reviewers.
Speed experiments pause other heavy workers. Programmatic inverses are not tests
of model behavior, and the current assistant's knowledge of the source prevents
calling an illustrative reconstruction a blinded native test.

## A–F. Formal model

Objects: finite UTF8-stable source strings x, at most50000UTF16units; a complete
self-contained message m with decoder instructions, parameters and any parent
wire in-band. Source bytes are read from pinned whole original files. No semantic
normalization, invisible side channels, external word lists, earlier chat, skills
files, training or decoder system prompt is admitted. One fixed documented
algorithmic decoder D must handle every emitted candidate in its domain.

Counted resources: exact o200k_base tokens of the complete message (not summed
separately), source bytes, encoder CPUms, process wallms, bounded retained memory,
parent-call count. Deterministic parent flags match X164. Strict token acceptance
means >=1token saved; a substantive lane improvement means >=11tokens. Bytes have
zero tolerance. Speed gate is >=10%lower aggregate encoder CPU AND process wall
on12cold ABBA calls, with no regression on any of3protected lanes. A microbenchmark
alone cannot pass this gate.

Quantifiers: algorithmic correctness is ∃fixed E,D ∀x in domain D(E(x))=x.
Admission requires actual D(m)=x AND T(m)<T(incumbent). Incumbent source correctness
is checked first. For broad utility, predeclare ≥6unedited real inputs across
≥3ordinary-use domains with ≥11tokens saved each, at least two ordinary prose
inputs, median saving≥5%, and exact fallback on all controls. This is finite
experimental evidence, not ∀documents. Native reliability needs an actual
independent basic-chat decoder receiving only m, with responses saved and compared
byte-for-byte. No such result is inferred from ∃program D. Strong Pareto requires
native/fidelity gates AND measured resource nonregression, not just smaller m.

Boundaries: Unicode scalar copying versus UTF16transport cap; LF/CRLF and empty
strings; literal marker collisions; repeated contexts; copies must lie entirely
inside the already decoded prefix, so no forward/self-overlap dependency;
4096scalar maximum per copy; context widths4/8/16. A greedy copy cannot promise
minimum full-parent cost. Instructions themselves cost tokens.

Adjacent problems not substituted: lossy summaries, binary entropy coding,
retokenization requiring a changed vocabulary, model fine-tuning, semantic task
accuracy, previous-chat memory, compressed files with executable decompressors,
minimum phrase count, optimal grammar size, source-only proxies, cached warm
runtime, and mere existence of short programs.

## H outcome space and evidence thresholds

H+: a broad non-niche native Pareto improvement exists. Accept only after all
above gates. H−: impossible under these constraints. Requires a genuine lower
bound for this decoder/cost/access model; failed searches do not establish it.
H∂: usefulness depends on source repetition, contract size, parent behavior and
native decoder reliability. Exact restricted gains support this weaker outcome.
No optimization theorem imported below establishes H+ or H− for chat decoding.

Universal strict shortening is excluded by injectivity/counting: for a finite
alphabet of q≥2symbols, there are q^nstrings of length n but only
Σ(i=0..n−1)q^i shorter strings. The pigeonhole argument concerns a fixed injective
code on all strings, not practical compression of selected prose. Uncomputability
of shortest programs does not imply this bounded search is impossible.

## Mechanism portfolio (early-independent artifacts)

1. Suffix-context copy lengths / DEIKTIS. Last k decoded characters select the
latest earlier context; ~N; copies its following Ncharacters. Artifact: module,
unit pairs, independent inverse, raw and full-parent trials. Proved part: induction
on output prefix plus bounded snapshot copy gives exact reconstruction for admitted
matches. Gap: raw improvements need not survive parent compression; native output
is untested. Cheapest falsifier: complete price on existing prose/diff/control
lanes. Adversary: latest-context shadowing, overlap, scalar counts, marker syntax.
Gap local for concrete wires, original behavioral problem for native reliability.
2. Sparse long-context copying. Same decoder, independent proposal arm, not a
second novelty claim. Remove only matches≥64/128characters to preserve parent
short-rule locality. Artifact: deduplicated finite plan tournament. Parent tests,
not raw price, determine whether this repair works. Patch attacker: earlier short
context hides a longer older match; refusing it must not change the decoder rule.
3. Orthographic word-boundary transfer. Camel-joining lower-case word pairs would
move a space into a case transition. Executed raw screen in portfolio.ts; counterexample
literal camelCase without escape shows naive inverse not injective. Contextual
case is already PROTASIS/STENTOR; novelty cannot be asserted just by renaming it.
4. Suffix-first lexical permutation. Reuse COLEX as control, not new. Exact
involution on separator-delimited lexemes; gap is full contract/parent price.
Adversary empty path components, non-ASCII boundaries, mixed separators.
5. Numeral grammatical transduction. Reuse LEXARITHMOS as control, not new.
Canonical grammar roundtrip is exact, but sparse numeral occurrences cannot
amortize a header. Adversary noncanonical hyphen/and/case and huge expansion.
6. Block-sorting context clustering. Classical BWT on space-separated fields can
cluster predictable successors without a dictionary; it needs primary index,
exact token-boundary convention and sorting order. A sorting-based inverse is
not evidence that a model executes it reliably. Executed block-sort.ts/portfolio.ts and five full-parent negative trials;
cheapest falsifier is full contract price then native gate, not entropy estimates.
7. Exact paged short-run scoring. Encoder-only direct numeric address for≤2BMP
units, avoiding candidate-string construction on hits. Artifact: isolated A/B
bundles, scorer/reference checks and cold whole-stack runs. Exact caching follows
from encoding+characters being a sufficient key; gap is speed, not codec fidelity.
Adversary cross-encoding keys, singleton/pair collision, surrogate halves, eviction.

Items1/2are ONE mechanism. At least six distinct genera are represented by
1,3,4,5,6,7; older genera are explicitly controls rather than new codecs.

## G–J. Adversary, repair, and stopping

Every repair receives fresh affected gates; tests and old failed receipts remain.
The24-shape modal test from X164 is reused and extended with source-free native
claims, transformed-document selection, and repaired-candidate trust inheritance.
Exact source, parent price, external verifier, native behavior, novelty and speed
are separate flags; no shortcut can satisfy their conjunction.

Operational merge is requested unconditionally. It is not a scientific acceptance
gate. The report must preserve any unmet target rather than declaring victory.
No finite run establishes a terminal codec or that humans missed a classical idea.

## Exactness argument and bounded work

DEIKTIS encoder indexes, before position i, each k-scalar context by its latest
end j<i. It emits a reference only if source[j:j+N]=source[i:i+N] and j+N≤i.
Inductively the decoded prefix equals source[:i]. Decoder indexes every appended
scalar, including copied ones, and queries before inserting the current context;
therefore it finds the same j. A snapshot of already decoded[j:j+N] is exactly
the next source block. Literal steps preserve the invariant. UTF8transport
stability plus scalar equality implies original-byte equality. The fully
composed parent is checked separately, not inferred from this lemma.

Candidate search is greedy longest eligible match, then finite mode/threshold
ranking, not a global optimum. Contexts4/8/16and thresholds12/32/64/128make≤12plans;
deduplicate equal(k,folded)plans. At most2actual parent calls, one raw-ranked arm
and one sparse≥64arm. Worst-case match comparisons O(12n·4096), plus context
construction O(12n·16), local tokenizer prices and parent work. Decoder is
O(n·16)scalar copying/indexing and O(n·16)map-key storage. CPU-bound with finite
input/copy caps, no wall-clock stopping rule. It does not invent a new LZ theory.

Patch record: unit expectation `abcdXabcd~2;` was initially marked invalid, but
correctly copies `Xa` entirely from already output text. The test, not the
algorithm, was wrong; replaced by unavailable six-character copy and retained
positive scalar/overlap controls. Source compiler found an implicit-any plan
array; explicit plan type fixes it without changing the wire. Later added
incumbent/candidate caps before expensive token pricing and a true below-cap
input/output-amplification attack. All affected gates must be rerun.

## Completed runtime experiments: no production acceleration admitted

Three12cold-process ABBA experiments retained exact canonical wires on all36calls.
1. Original paged short-run memo: aggregate CPU3.945637×,wall2.991836×. Severe
   regression. Extra maps/allocation and capacity behavior defeated the proposed
   saved concatenations; that causal explanation is a hypothesis, not a profiler
   attribution.12124scorer checks per arm pass.
2. Repaired direct-address bounded pages: CPU0.970507×,wall0.977587×; ps-real
   regresses1.008792×CPU/1.017786×wall.12124scorer checks and25440new
   page/encoding/surrogate/capacity-targeted checks per arm pass. Speed gateFAIL.
3. Combined direct pages + fused optimistic-bound accumulation + X164 rollback
   specialization: CPU0.983710×,wall0.983452×; prose and ops regress slightly.
   Fresh12124scorer checks and25440targeted checks pass. GateFAIL.

The bound accumulation fusion retains set membership/order and integer summands;
rollback preserves search state by the prior audited invariant. Neither a proof
of same cost nor a correct unit test proves a speedup. No production hot-path
changes were made. Timestamped process-isolation lists and full wires are saved.
Build initially hit a resource kill while three compression workers retained
large heaps; that attempt is not a successful build and requires an isolated retry.

## Reproduction

Install with `npm ci --ignore-scripts`. Bundle TypeScript workers using
`npx esbuild <entry> --bundle --platform=node --format=esm --outfile=<bundle.mjs>`.
Existing parent worker reused unchanged: `bench/x164/frontier.ts` takes
`bench/x165/lanes.txt bench/x165/receipts/frontier.jsonl`.
Run `unit.ts`, `portfolio.ts`, `independent.py`, `modal.py`, `research-checks.py`.
`trial.ts source receipt.json --bwt` runs a real source baseline and≤2DEIKTIS
parent candidates, optionally one BWT arm. `bwt-trial.ts` uses the recorded X164
canonical baseline for its five ordinary input trials, separately replayed by
this turn's canonical job. Both original and sparse proposals are exploratory,
not held-out model-generalization evidence. Speed build/run scripts retain failed
arms; process-group IDs in runners are session-specific and must be replaced by
actual current worker IDs, never guessed, before reuse.

### Completed ordinary-input negative results

Initial fixed-context copy trial complete prices (old45token instruction):
unified-diff411→476; email486→557; code-ts949→1103; findmnt385→528. These
losses motivated the sparse arm and shorter, still explicit instruction; they
are not silently replaced with revised prices. Initial raw-screen refusal on
any tilde was relaxed only to reserve tilde-followed-by-digit; ordinary tilde
characters now roundtrip literally, with matching fresh scalar/marker tests.

Classical space-field BWT plus the actual parent also loses on all five completed
canonical tests: kb620→712, llm-answer664→731, email486→571, JSON653→794,
code949→1062. Their whole messages and source-byte inverses are retained. BWT
is not promoted to src or called native-readable. Case-boundary transfer adds
markers and loses in the raw screens; COLEX and LEXARITHMOS are explicit old
mechanism controls, not relabeled innovations.

### Novelty boundary

All409current omega TypeScript modules, including wrappers and backup variants,
were inventoried by hash/exports. Unrestricted searches are retained in
novelty-scan.json. MNEMA addresses a completed word by an explicit lexical prefix;
METABOLE edits a bucketed prior lexeme; CTXCOPY requires earlier-chat anchor
text; DEIKTIS addresses a continuation through the immediately preceding decoded
context and carries only its length. LZP is the classical ancestor. This is a
specific new repository operation found by the bounded audit, not proof that
no semantic equivalent exists anywhere in the405+module stack. No exclusion of
TAGSTACK-style wrappers was used. BWT is mentioned in existing comments/citations
but no executable rotation-column transform was found; its experimental artifact
remains in bench because both token and native gates are unresolved/negative.

Further contract repair: changed ambiguous “Unicode characters” to explicit
“Unicode code points”, including context width. Combining-mark attack added.
Parent inputs/outputs are unchanged; old timed receipts keep their original
wording. A separate final-contract gate must reprice complete messages and
recheck every declined candidate against original bytes, not just the fallback.
No old timing is claimed as a timing of header replacement.

## Final outcome

Acceptance criteria **unmet**. New optional repository module DEIKTIS is not
registered or installed in production. No broad whole-parent token gain, native
basic-chat byte-exact decode, or qualifying whole-stack speed gain is certified.
The unconditional merge request is administrative, not acceptance evidence.

Canonical replay: 29/29 identical X164 wires, 11962 tokens; 21 supported separate
reader inverses, eight explicitly unsupported. Category/local leaders refreshed.
Final code-point-explicit gate: 31 checks; independent CPython: 3857 checks;
unit: 8830 checks / 3797 pairs. All completed checks pass, but cannot certify
native behavior. UV keeps its 2041-token incumbent; see final-contract.json for
repriced candidates and historical timing separation. Requests whole-document
trial aborted with V8 heap exhaustion at 1200 MB (exit 134); no final receipt or
performance/compression inference is available. Full log: receipts/whole-document.log.

All three speed arms fail the preregistered gate; 36 full wires match. No hot-path
change shipped. Production build and TypeScript checks pass; two earlier build
attempts exited 137 under concurrent memory pressure, retained in receipts.
27 deceptive evidence shapes and the explicit modal countermodel were rerun;
3138 finite lab-interface checks pass without theorem-kernel replay.

Highest-information next tests: isolate the Requests parent memory amplification
before rerunning its full source; obtain a real basic-chat decoder endpoint and
measure original bytes on held-out ordinary prose/ops with the complete in-band
contract. Neither shortening the source to a niche excerpt nor substituting the
program decoder answers these open gates.
