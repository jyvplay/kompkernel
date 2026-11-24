# X170 — KYKLOS and parent-reader/runtime experiments

## Runtime honesty / available systems

Actual systems: local Node, npm, esbuild, TypeScript, Python, Git, authenticated
gh, OS process controls, web search/fetch. No independent agents, native decoder
endpoint, theorem kernels (lean/lake/coqc/rocq absent), simulator or external
expert reviewer. Test vectors are software tests, not claimed LLM simulations.
X169 GEFYRA—not DIADOCHI—was the immediate predecessor. Base653017a… .

## A–B. Formal model, domain and outcome space

D: UTF8-stable strings <=50,000UTF16code units, including empty strings, CR/LF,
Unicode and whitespace; arbitrary binary and unpaired surrogates are excluded.
Source bytes from original files are the truth. E(x) includes ALL instructions,
JSON rules, markers, parent header/tape/body. Decoder receives ONE user message,
no skills/system dictionary/training/tool. R is a separately written executable
inverse; L is an independently administered native chat decoder. R(E(x))=x does
NOT imply L(E(x))=x. No L was available or tested; mandatory native gate unmet.

Primary resource M: canonical o200k_base token count of entire E(x). Also count
CPUms, elapsed ms, process peak RSSKiB, source bytes and UTF16units separately.
Canonical IDs roundtrip; exact-count library is reference, not chars/4.

Quantifier order: fix domain, corpus, incumbent, candidates, price metric and
thresholds BEFORE observed trial results; then for every accepted corpus lane,
require original-byte equality and no price regression. H+ requires >10token
incumbent gains on multiple varied real prose/ops workloads, no protected price
or runtime regression, significant whole-stack speed gain (both aggregate CPU
and elapsed ratio<=0.90), and externally administered native byte recovery.
Finite tests cannot certify all possible sources/models. The fallback price
lemma assumes an exactly verified incumbent and bounds price, not runtime.

H−: universal strict shortening is impossible already on the empty input with
zero-token identity; a fixed finite-alphabet injection cannot shorten every
length-n string (there are fewer shorter strings). This elementary bound does
NOT prove that practical prose/ops gains are impossible, nor substitute bits for
BPE tokens. Failed candidates reject those candidates, not the research goal.
H∂: missing native endpoint, unsupported grammar, finite fuzz, timing noise,
raw-only wins, incomplete workers or source-size boundaries remain partial.
No tolerance for changed bytes; token significance >10, not >=10. Timing gates
are empirical decisions, not statistical confidence intervals or hard bounds.

Adjacent different problems NOT substituted: semantic summary; task-score
preservation; latent soft prompts; tokenizer changes; trained meta-tokens;
external dictionaries; multi-turn teaching; arbitrary token-ID injection;
binary compressed size; amortized repeated-request caches; raw-only savings;
synthetic periodic-text gains; single-document specialization; encoder self-report;
program decode instead of native behavior; asymptotic time instead of measured
CPU; elapsed time instead of CPU; key-unit cap instead of hard heap cap.

## C. Frontier and exact open interface

Fresh canonical replay runs X164 worker with X16929-lane manifest, deterministic
flags unchanged. Fresh final comparison and category/local leaders are committed
in receipts after completion. The incumbent is the actual emitted wire, not a
weaker standalone codec. Frozen X169 parent wires are used during trials and
must agree with replay. Parent decoding is bounded, with unsupported cases stated.

New reader extension addresses one previously failed grammar: fused OURA decimal
insertion. It reconstructs markdown-table from the actual message. Frozen-wire
fresh gate:62checks,22exact/7unsupported. The remaining five X169mismatches were
investigated: decimal (now supported), column model, masked delta, generated
cue-sheet and chmod/sibling wrapper. Unknown instruction envelopes now fail
closed instead of identity-passing. This does NOT repair those four unsupported
inverses. Preserve the old receipt; do not retroactively label old failures passes.
Fresh X170 wires receive a separate gate after replay. Source/math frontier
limits and hypotheses are in research.md. No global-optimal codec is claimed.

## D. Negative space / executable modal counterexample

`modal.py` re-executes27deceptive claim-shape tests (explicit schema flags, not a
free-prose truth oracle). At least these fail: hidden contract, omitted table,
weak baseline, raw-only win, semantic equality, self-reported decode, program-to-
native leap, single-lane-to-general leap, cherry-picked timing, warm-cache/cold
comparison, incomplete baseline, OOM-as-fast result, unpriced parent, fictional
proof kernel, future/source-summary-as-proof, altered statement, omitted initial
state, uncharged final state, untested repairs, and threshold retuning.
Modal counterexample: an executable inverse returns the source while the identity
decoder returns the encoded string. Existence of one successful decoder cannot
universally quantify over other decoders. This is a mathematical countermodel,
not a simulated LLM. Actual Pareto claim remains rejected absent native evidence.

## E–F. New codec and mechanism portfolio

`src/lib/omega/kyklos.ts`: KYKLOS (cycle) replaces words by markers whose meanings
cycle independently through a transmitted word list. Words are maximal ASCII
letter runs; nonletters are copied byte-for-byte. Each marker has its own cursor.
Literal exceptions do NOT advance any cursor. Replacements are never rescanned.
This makes a periodic SUBSEQUENCE of word events cheap without assuming the whole
text or even every occurrence of a word is periodic.

Construction: top24words with frequency>=3 and length<=100; all276pairs and
253restricted triples at most. Cycle order is first occurrence. Greedy earliest
matching expected word emits marker; unmatched words remain literal. Require at
least3cycle turns. Rank by a character heuristic, test top8single families and
up to7greedily disjoint cumulative groups (<=15plans). All candidates invert and
are fully token-priced; <=1parent call, strict verified-incumbent fallback.
Decoder caps8rules and cycle lengths2–4. Planner generates2/3, decoder tests4.

Proof sketch: induction over original word events. Literal exceptions reproduce
the original event without changing cursor. On a marked event the encoder chose
the current cycle element, so the decoder emits exactly that word and advances
the same family cursor. Markers are absent as source words, excluding accidental
transitions. Separators are copied; outputs are not reinterpreted. Induction plus
UTF8stability gives original-byte recovery. This is a software construction proof,
not a native behavior proof or a global token optimality proof.

Time: frequency sort O(U log U), <=529linear family screens and<=15linear rewrites
plus tokenization. Fixed caps give O(n+U log U) operations under bounded word
length; source scanning and memory O(n+U). Full parent search dominates and has
no hard deterministic CPU/elapsed bound. Greedy subsequence matching maximizes
match count for a fixed ordered cycle, NOT canonical-token savings. Final plans
are a bounded search, not a single greedy codec or an exhaustive tournament.

| Branch / artifact | Proved or executed part | Remaining interface; cheapest structure-specific attacker; gap |
|---|---|---|
| KYKLOS/new module | per-family finite-state marker cycles with literal exceptions; dual-language exact inverse | parent/native cost; a literal family word must NOT advance, and interleaved counters must stay independent; local software, native is original problem |
| DEIKTIS/portfolio | context-conditioned occurrence-choice tape; executable inverse checked | choice cost/native; alternating ambiguous choices; local pricing, original behavioral gap |
| BWT/x165 block-sort | cyclic permutation plus primary index; executable inverse checked | original order/index and contract cost; periodic rotations; local pricing |
| COLEX/portfolio | lexical dictionary candidate screen with measured complete costs | no fresh inverse proof here; unique short words erase savings; local |
| LEXARITHMOS/portfolio | constrained finite lexical rank planner executes | no admitted plans on manifest; punctuation/out-of-alphabet input; local eligibility |
| recency/portfolio | move-to-front ASCII word references and exact inverse | marker collisions/cost/native; all-distinct words; local software |
| hash B/hash-build | different open-address rank hash, exact count checks | CPU locality vs extra multiply; collision-heavy/Unicode inputs; local runtime |
| slice C/slice-build | one byte-string view per merge, slice rather than rebuilding long rank strings | shared scratch reset and Unicode bytes; alternating inputs around1024bytes; local runtime |

These branches were separate implementations; controls reused existing artifacts
rather than inventing six renamed KYKLOS variants. Repository mechanism scan is
bounded, not proof of novelty against all historical literature. Explicitly
compare DIADOCHI queues, GEFYRA gap insertion, STOIBAS BFS, KRYPTOLYSIS rotation,
SYMFRAZ collation, DEIKTIS choices, Rosetta stride rows, KANNABOS periodic numbers.

## G–I. Adversary, verification and repair ledger

First exact-cycle draft had only1raw-winning source. It was broadened to literal
exceptions (same decoder semantics; clarified in-band contract). Archived draft
source and receipts remain under v1-exact-cycle. Only its email parent trial
completed (486→556); its remaining worker was stopped, not counted. Repaired
planner inherits NO results: fresh real/fuzz/exhaustive tests, parent trials,
Python inverse and new literal-exception/counter-state attacks were executed.

Final test:30,256checks,11,309saved pairs,41sources,438plans. Includes1,000seeded
fuzz inputs,9,840ternary enumerations length1–8 and5,000decoder-generated cases
with2/3/4cycles. Many enumerated inputs have no candidate; do not count them as
successful compressed examples. Original-byte, canonical-price, token transport,
malformed/duplicate rows, caps, partial cycles, nonrecursive output, marker
collisions, Unicode separators and wrong-parent refusal all tested. Python
independent result and final selector gate are in separate receipts.

Fresh heldouts are COMPLETE pinned Python venv tutorial, Rust ownership chapter,
and Kubernetes pod debugging document, with hashes/licenses. All45plans inflate
raw: Python1861→1935; Rust6065→6116; Kubernetes1879→1946(best plan each).
No heldout gain or parent supremacy is inferred. Native handoff has3single-message
prompts, raw-response byte/hash checker, and NO responses: NOT_RUN.

## Runtime integrity and resources

B changes3/4byte hash index; A/B16,192reference counts match. C reuses ASCII
strings or a lazy Latin1byte-string per merge for long rank lookups; C/D reference
counts also match. All four arms pass2,880targeted count checks at1023/1024/1025
units with fresh ASCII, Unicode, surrogates and reversed inputs. D composes C
with X168bounded/detached maps and receives its own gates, not inherited trust.

The first B crossover was INVALID: wrapper PID paused, actual Node kept running.
Quarantined in invalid-shell-pause. Corrected harness verifies node cmdline and
T(stopped)state. Fresh B ABBA12wires: CPU1.02286267/wall1.02234567, rejected.
Fresh C ACCA12wires initially CPU0.95660851/wall0.95842641; protected lanes did
not regress in that sample, but it misses the declared10%aggregate threshold.
Expanded C adds3more lanes/12wires; combined24wire outcome recorded separately.
A metadata-only copy collision overwrote first C's pause receipt; disclosed in
pause-metadata-note.txt. Timing outputs were separate and unchanged. Extra output
path repaired; no missing contemporaneous receipt fabricated.

Requests D runs under900MBV8heap/600CPU-second shell limit. It is a completion and
exact-wire test, NOT an isolated speed comparison: workers and explicit timing
pauses affect its elapsed result. No hard heap bound or original-A speedup claim.
Never run the production build concurrently with resident large benchmark workers
(the X169memory contention failure is intentionally avoided).

## J. Reproduction and stopping boundary

Build TS harnesses via esbuild --bundle --platform=node --format=esm. Reuse
X164frontier/cache-speed, X163count-gate, X134leaders, X159Python parent machinery.
Generated bundles ignored. Run test/portfolio/trial/gate, independent.py,
reader-gate.py, modal.py, transfer-checks.py. Run hash/slice/memory-slice builders
before runtime scripts. Pass actual Node PIDs, not shell PIDs. Final replay needs
exactly29rows before compare/frontier-gate/leaders. Math fetches pin commits;
fixtures include upstream provenance/licenses. No execution claims for unrun tools.

No terminal codec or unaided native decoder certificate was found. A new repo
codec exists, but broad >10token incumbent gains, native behavior and significant
whole-stack speed acceptance cannot be manufactured. Merge follows the user's
unconditional final instruction, not scientific acceptance. Highest-information
next test: independently administered native replies to frozen prompts; for
engineering, profile long-rank misses and test slice optimization at larger scale
without weakening byte, price, resource or protected-lane gates.


## Final completed results

Canonical replay: **29identical X169wires,11,962tokens**. Library prices and
canonical token transport pass29. TypeScript bounded reader21exact/8unsupported;
new independent Python reader22exact/7unsupported/0mismatches. This is bounded
support, not an all-codec decoder certificate. Decimal-envelope repair adds one
exact lane; fail-closed handling reclassifies unsupported instructions without
claiming reconstruction. Frozen62attack checks and fresh-wire gates both pass.

Category aggregates (raw→frontier; body token-class leader):
PROSE5856→3429/word; OPS/TABULAR17278→5580/glyph;
CODE/STRUCT4152→2636/word; OTHER729→317/no tape class. Labels inherited from X134,
including apt under PROSE; they do not demonstrate real prose generalization.
Local largest absolute AND relative savings are separately listed in
receipts/local-leaders.json; no per-codec optimality inference.

KYKLOS six parent trials: email486→563, code949→1036, KB620→698,
ps381→476, JSON653→729, apt813→898. **All rejected**, exact incumbent retained.
Final selector48checks; Python11,759checks including12complete base/candidate
wires,0errors. Raw screen335plans/34sources,5raw winners:
ls-l5194→4951, ls1034→996, apt2739→2579, findmnt787→759,
ripgrep10430→10424. The6token ripgrep result is not significant; none proves
incumbent or broad prose gain. Fresh heldout plans remain all losses.

Expanded C crossover24identical wires: aggregate CPU0.985183309 and
elapsed0.985065131 relative to A. Unified-diff CPU1.01696/wall1.04219;
node-help1.03709/1.03191. **Rejected** for threshold and protected regressions.
The originally promising12wire sample was not selectively reported as acceptance.

Requests D **completed**:3539tokens,475,280.115CPUms,696,186.213elapsed ms,
540,548KiBpeak RSS under900MBheap/600CPU-second limit. Python independently
restores19,213source bytes, SHA256
5914de6a636d91ca2ca3a0df55ef8e57359e3fe364fb7176fdee60d231fe2e9f.
Wire SHA256 matches X169; TypeScript bounded reader unsupported, nativeNOT_RUN.
Elapsed includes explicit pauses and concurrent work. Earlier-turn timings are
not a paired baseline: no11%or other speed claim is made from them.

TypeScript noEmit exit0 recorded. Production build runs only after all benchmark
workers exited; final build log is the verification receipt. Summary.json binds
acceptance=false to six losing trials, runtime rejection and nativeNOT_RUN.
The new codec and experiments are delivered; requested Pareto success remains
**unmet**. No production defaults changed.

Final isolated production build: exit0,17.40seconds (existing CSS warnings retained).

Whitespace check reports only upstream Kubernetes fixture/license and its native prompt: intentional original-byte preservation, not a clean diff-check claim. See receipts/diff-check.json.
