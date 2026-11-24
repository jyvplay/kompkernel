# X166 — context-collated side streams and bounded memo experiment

## Runtime honesty

Executed tools: shell, git, GitHub CLI, filesystem, Node/esbuild, Python, npm,
web search/page retrieval. Python-chess 1.11.2 is an external deterministic chess
rules implementation used to replay a published witness; not an independent
agent, an LLM, or a simulation of model behavior. No independent agents,
simulators, databases, native basic-chat decoder endpoint, Lean or lake are
available. OS processes are actual workers, not reviewers. TypeScript/build
results and all incomplete runs are recorded separately. Date authority for
research cutoffs: 2026-11-14; observed GitHub/environment timestamps may differ.

## A–G: formal model and non-substitution boundary

Admissible input is a source/incumbent pair: the incumbent must decode to x,
be transport-stable, and not already carry a SYMFRAZ envelope. Reserved-envelope
incumbents are refused, not silently decoded as literal fallback. Source x is
the exact bytes of a UTF8-stable string, at most 50000 UTF16
units. Message m: one self-contained user message, including the entire
instruction, numeric data, skeleton, and any parent's complete message. No
external dictionary, skills file, previous conversation, training, hidden
system instruction or decoder-side tool is an allowed part of the wire.
UTF16 units bound resource use; Unicode code points define contexts; UTF8 bytes
define equality. LF, CRLF, leading zeros, combining marks and NUL are preserved.
Literal tilde reserves the hole marker and causes exact fallback, not escaping
by assumption. Parent/incumbent messages are capped at 51000 UTF16 units.

Algorithmic correctness: ∃ fixed E,D ∀ x in the admitted domain,
D(E(x))=x. Finite regression evidence is not that universal theorem. The new
transform's proof is the permutation/insertion argument below. Native behavior
is a separate predicate for an actual model M receiving m alone: M(m)=x byte
for byte. ∃ a program D does not imply this for M, much less for all models.

Resources: exact o200k_base tokens T(m), CPU milliseconds, process wall
milliseconds, retained memory, number of parent calls. Zero fidelity tolerance.
Strict per-message improvement is T(m)<T(P(x)); substantive improvement is at
least 11 tokens. Broad acceptance retains X165's threshold: ≥6 unedited whole
real sources in ≥3 ordinary-use domains, ≥2 ordinary prose sources, each saving
≥11 tokens and median saving ≥5%; no source/contract omission. Native gate is
mandatory for certification. Runtime adoption requires ≥10% aggregate CPU AND
wall reduction on cold ABBA tests, no protected-lane regression, identical wires
and a full frontier regression. The bounded memo experiment uses prose, code,
and ops; a wrong prose path is a failed run, not a zero-cost measurement.

The measured parent is TAGSTACK with OMEGA_DET=1, OMEGA_NO_MEMO=1,
OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0, OMEGA_NO_OROTHESIA=1, matching the canonical
X165 worker. A canonical replay is not a global minimization over every codec.
Saved X165 incumbents used by the trial must match the fresh replay before the
comparison is finalized. No weaker raw baseline is substituted for that gate.

Adjacent but different problems excluded: byte/archive compression; entropy
coding; semantic shortening; token-ID packing; minimum phrase grammar; shortest
superstring in symbols; model training; prompt task accuracy; memorized canonical
texts; external decoder programs; shared dictionaries; random-access indexes;
whole-document splitting; numeric-only synthetic demonstrations; proof-checker
performance; cached repeated-request throughput; microkernel speed; changing
work budgets; partially supported reader coverage; hypothetical model behavior.

## H+, H−, H∂ and evidence thresholds

- H+: an ordinary-use representation plus parent can pass every gate. Admit only
  after actual complete-message gains, independent byte checks, native behavioral
  evidence, and resource nonregression. A smaller intermediate is insufficient.
- H−: universal compression of every possible source past a fixed information
  capacity is impossible. For n arbitrary bytes and an alphabet of V wire tokens,
  an injective decoder using ≤m tokens needs sum(V^j,j=0..m)≥256^n. This counts
  messages, not natural-language semantics. It does NOT rule out broad practical
  improvements over our heuristic parent, and no such practical impossibility
  is claimed. No best-possible BPE lower bound has been proved here.
- H∂: transformed context regularity can help a backend but lose after header
  and reinsertion costs; exact inversion can pass while native behavior remains
  untested; memory bounds can improve while CPU regresses. These distinctions
  are retained, rather than using one positive component as acceptance.

## New module: SYMFRAZ (from συμφραζόμενα, context)

Decoder-visible context collation: replace selected maximal ASCII digit runs
with one tilde each. Freeze this skeleton. For each hole, form a tuple of its
preceding k and following k Unicode code points, truncated at boundaries. Sort
holes lexicographically by code-point values, shorter prefixes first, with
source-position tie breaking. Transmit the original digit strings in that order
on one space-delimited line, followed by the exact skeleton. Decode the same
ordering, assign values, then restore all holes simultaneously. Leading zeros
and variable widths are literal, never numeric conversions. k∈{1,4,12}; select
all digit runs or only runs of ≥4 digits, deduplicate, price all ≤6 plans. Offer
at most the raw-ranked best plan to the full parent. This is finite enumeration,
not greedy parsing or globally optimal search. All fallback candidates are
source-checked; malformed headers, ambiguous markers and parent failures refuse.

Proof: the skeleton and k are shared, so each side computes the same total order
on the same finite hole set. Stable tie order makes this a bijection even when
contexts coincide. The side stream lists precisely the original values under
that bijection. Assigning its inverse restores each replaced substring; all
other characters were unchanged. UTF8 stability converts string equality to
original-byte equality. The proof assumes keys are computed before any hole is
restored: mixing restored and skeleton contexts is invalid (targeted tests).

Resources: n source code points, h holes. Each of six arms costs O(n+kh log h)
comparisons/copies plus complete tokenization; O(n+kh) live memory. Sorting
comparisons inspect at most 2k code points. Decoder has the same sort bound.
Parent cost is additional, not hidden in O(n); at most one parent call. CPU-bound,
no wall-clock cutoff changes candidate selection. Output caps reject excess.

Novelty scope: all 410 omega TS modules are byte-inventoried, unrestricted lexical
matches retained in inventory.json. PSIFIDA transposes equal-width digit planes;
SYMFRAZ preserves variable-width strings and derives a stable permutation from
frozen surrounding context. Table-column codecs require row/column structure;
this does not. DEIKTIS references prior continuation content; this transmits
values separately and uses future as well as preceding skeleton context.
The closest external mechanism is explicitly STC (2026): this is a readable
text adaptation, NOT an AI-only invention or proof of unprecedented human
novelty. Lexical inventory is not exhaustive semantic equivalence checking.

## E–G: independent mechanism portfolio and structure-specific attacks

All artifacts are executable; familiar controls are labeled as such, not renamed
as new codecs. `screen.ts` keeps their candidate generation independent.

| Mechanism | Construction / concrete artifact | Proved or checked portion | Unresolved interface | Cheapest falsifier / attacker | Gap |
|---|---|---|---|---|---|
| SYMFRAZ | Context-derived stable permutation / src module | Inverse argument; TS and independent Python original bytes | Full-parent benefit, native sort execution, broad utility | Equal keys, emoji vs BMP order, restoring before key calculation, header price | Token test local; native/broad original gates |
| DEIKTIS control | Same-message suffix-context continuation copies / X165 module | Existing inverse plus fresh whole-source checks | Header and parent interaction, native copying | Latest context has too little following output; marker collision | Local benefit test, original native gate |
| Space-field BWT control | Cyclic rotation last-column transform / X165 block-sort | Fresh inverse checks | Parent exploitability and native stable sorting | Periodic equal rotations, empty fields, sort ambiguity | Local cost; original native gate |
| COLEX control | Separator-component reversal / existing module | Existing decoder contract; costs freshly evaluated | Parent savings and dictionary overhead | No separator locality, empty components, mixed separators | Local, not new mechanism |
| LEXARITHMOS control | Closed-set number-word arithmetic / existing module | Existing literal inverse specification | Complete in-band advantage on ordinary text | Near-miss word, noncanonical spelling, digits-as-text | Local cost, limited domain cannot establish breadth |
| Recency-word control | Online move-to-front word index / screen.ts | Decoder replay of every produced screen | Index token cost and native state tracking | Repeated separators, long recency gaps, case-distinct words | Local cost; classical mechanism, not novelty |

Runtime candidate is separate: bounded exact per-assignment ARIADNE run-cost
memo, 32768 entries and a key-unit threshold of 1048576. One oversized key
can exceed that threshold; the actual retained-key bound is max(threshold,
largest inserted key length), not a hard heap-byte bound. The targeted test
checks this exception explicitly. Eviction cannot change
countTokens(s,enc); it only causes recomputation. This does not change candidate
order, work credit, scorer bounds, tie-breaking or search arms. A capacity/revisit
attack is required independently of small scorer tests. No production edit is
implied by a benchmark-only bundle. `diagnostic-build.mjs` instead observes the
unbounded cache and parent-stage heaps to localize Requests memory exhaustion;
its timings cannot be compared with uninstrumented speed results.

## D: deceptive result shapes and executable modal test

`modal.py` reuses and reruns 27 explicit rejection shapes: payload-only price,
weak baseline, normalization, encoder self-report, program-as-native, training
leakage, symbols-as-tokens, free header/dictionary, free search, micro-as-whole,
contaminated time, memoized time, incomplete-as-pass, challenge-as-proof,
source-as-kernel, silent repair, restricted-family-as-universal, finite-as-universal,
character-as-token, changed source, aggregate hiding regression, NOT_RUN-as-pass,
axiom-as-certificate, wrong marker contract, known-source-as-blinded, niche-as-broad,
and repaired-inherits-trust. The detector takes structured flags; it is not an
English theorem prover. A concrete pair of functions is the modal countermodel:
one replaces `< >`-style markers correctly, the other returns its input. Existence
of the first does not constrain the second. No simulated LLM is involved.

## Verification, repair, and reproduction

- `npx esbuild bench/x166/screen.ts --bundle --platform=node --format=esm --outfile=bench/x166/screen.mjs && node bench/x166/screen.mjs`
- Bundle/run unit.ts the same way; `python3 bench/x166/independent.py`.
- Bundle X164 frontier.ts to x166/frontier.mjs; run with lanes.txt and an output
  JSONL. Compare to X165; run frontier-gate.ts, inherited X134 leaders, local-leaders.
- `node bench/x166/runtime-build.mjs`; run unit-A/B and target-A/B bundles.
  Runtime runner accepts an actual active replay PID to pause; never reuse a PID
  from another session. Cold ABBA arms require otherwise idle heavy workers.
- Bundle trial.ts and pass whole canonical file paths. Prices include the exact
  new instruction and actual parent output, even for rejected candidates.
- `python3 -m pip install --target .cache/x166-python python-chess==1.999` then
  `python3 bench/x166/research-checks.py`; `python3 bench/x166/modal.py`.

Repairs inherit no trust. The wrong runtime prose path is preserved as a failed
attempt; corrected calls must be separately logged and validated. Any changed
wire contract requires rerunning plan prices, inverse checks, independent checks
and affected full-parent gates. A failed native gate is never repaired by
substituting a programmatic reader.

Final measured outcome is appended after all workers complete. Merge, if
requested regardless of outcome, is administrative and is not Pareto acceptance.

### Resource guard repair

After the initial five timed parent trials, moved the wire-size/UTF8 check ahead
of candidate tokenization. An oversized/unstable callback result must be refused
before pricing or reader invocation. Added two malicious-parent tests (51001
characters and an unpaired surrogate), requiring zero reader calls. Fresh unit
checks: 8524 / 4245 pairs. Final gate reconstructs every saved parent candidate
with the repaired module: 40 checks. Independent Python full source/wire tests:
4392 supported checks, including 12 full-wire checks. Three findmnt wire checks
(base/candidate/selected) are explicitly unsupported by the Python layout reader.
The first full-wire Python run raised `ValueError: unsupported layout`; its
coverage repair now records that gap rather than calling it a pass. Saved parent
timings remain historical; no retiming is asserted.
The instruction and folded parent inputs were not changed by this resource repair.

### Completed representation and runtime trials

135 SYMFRAZ plans over 34 whole sources yield zero raw-complete wins. Six-family
screen counts are in screen-summary.json (465 total plans, including controls).
Five actual parent candidates: kb620→694, email486→570, JSON653→762,
findmnt385→459, ps-real381→462. Every incumbent retained; no niche win promoted.

Bounded local memo: 12 matching wires, CPU1.0070677× / wall1.0303299×, no qualifying
speedup. The initial wrong prose path generated four ENOENT failures, retained
separately. Eight unaffected successful code/ops calls were retained and four
corrected prose calls supplied; however TypeScript checking overlapped that
prose measurement, so timing isolation is explicitly not certified. The patch
is benchmark-only. Additional capacity/eviction tests: 360005 checks, including
the oversized-key exception. Baseline/patched scorer tests each12124 and targeted
checks each25440 pass. Passing scorer tests alone cannot establish runtime wins.

Allocation sampling on actual Requests, 45-second windows: early live allocations
include CHIRON decode/polish; later allocations are dominated by relayoutGlyphs→
countTokens→countLongRaw→match (19.51MB at the largest sampled leaf), with other
sampled sites in countTokens and prolepsis LCP. This is not a complete retained
heap census or proof of the unique OOM cause. The instrumented 900MB-heap worker
exited134 with V8 heap exhaustion; no completed baseline wire exists from it.

Detached-cache-key hypothesis: V8 slices may retain entire parent strings. A
2000-key generated allocation diagnostic measured40,189,624bytes of heap growth
versus225,760bytes for equal detached keys. This is NOT a compression corpus.
The intervention copies >12-unit keys on chunk/short cache misses only; values,
keys, eviction order and work counts remain identical. 18000 adversarial exact
count checks pass across both encodings, surrogate halves and chunk boundaries.

The separate, properly isolated, 12-call cold ABBA whole-stack test FAILS:
CPU1.0228312×/wall1.0154405×, all wires identical. Peak RSS is retained per call
and does not reproduce the microbenchmark's large improvement. Micro savings
therefore do not justify shipping this patch. Requests-specific completion is
measured separately, without interpreting instrumented timings as a fair speed
comparison. No production BPE or ARIADNE modification has been made.

The pre-price guard additionally has a mutation-control test (`guard-build.mjs`):
a countTokens-call counter detects oversized callback messages. The repaired
module passes; deleting only that guard causes the expected assertion failure.
This distinguishes the patch from reader-only refusal, rather than merely
repeating an edge case that both versions pass. No production counter is added.

Requests detached-key run also exited134 at900MB without a wire. The sampled
hypothesis therefore remains insufficient: neither the local-memo bound nor
small-key detachment is established as the actual memory fix. Exact logs and
source hash are in requests-status.json. Highest-information next memory test:
retained-heap dominators near the failing relayout/token-count phase, rather
than treating an allocation sample or slice microbenchmark as root-cause proof.

## Final outcome and canonical leaders

**Acceptance criteria unmet.** SYMFRAZ is a new optional repository module, not
an installed production codec, a proven broad gain, or a native-decoding result.
No production hot-path edit is installed. H+ has not met its evidence threshold;
H− is established only for the counting-capacity statement, not for practical
improvement. The live evidence currently supports boundary/failure outcomes.

Canonical: 29/29 X165 wires reproduced byte-for-byte;11962tokens. All29complete
prices and token-ID roundtrips pass. Separate bounded repository reader supports
21inverses and lists8unsupported, not29native or independent decodes. All5trial
incumbents and24speed wires bind to those fresh canonical wires. The long ls-l
worker was intentionally terminated only after its first complete receipt; a
separate worker completed the other28. Pauses and concurrency make canonical
worker wall times unsuitable for speed claims. Heap limits were1400MB for the
first worker and1000MB for the remaining worker; codec flags/search budgets are
unchanged. Resource limits are not hidden as identical runtime configurations.

| Inherited category | Whole-source raw tokens | Final tokens | Tape-body token-class leader |
|---|---:|---:|---|
| Prose |5856|3429|word|
| Ops/tabular |17278|5580|glyph|
| Code/structure |4152|2636|word|
| Other |729|317|not applicable (no tape)|

Fresh local-leaders.json lists largest absolute and relative fixture savings per
category. These are inherited benchmark labels and token classes, not an exhaustive
per-codec ablation or proof that an apt listing is ordinary prose. Strongest
absolute savings remain apt1926, ls-l3884, JSON499, cue412; prices.csv saves79.73%.

Final production build PASS (29.16s); TypeScript PASS. Unit8524checks/4245pairs,
resource mutation guard4checks, final cached-parent gate40checks, independent
Python4392supported checks (three findmnt wire checks unsupported). Research
replay independently validates190legal chess plies and63checks/23mates, plus
400prefix-code cases,2058power inequalities,512rational boundary sums and420affine
checks. No theorem-kernel or basic-chat behavioral certification is implied.
27deceptive result shapes and the modal counterexample were rerun.

Next highest-information work: obtain a genuinely separate one-basic-chat decoder
for held-out byte comparisons; profile retained-heap dominators in Requests'
failing relayout/token-count phase; search for an intervention that REPLACES
parent work rather than adding a second full compression call. Neither a niche
numeric example nor another cheaper intermediate answers these gates. PR merge is requested under the user's unconditional instruction, not because
acceptance passed.
