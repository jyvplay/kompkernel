# X155 — STOIBAS: FIFO tree records with typed line framing

Experimental, unwired. This is a bounded token advance, **not a certified terminal
codec or full Pareto solution**. Native basic-chat behavior remains NOT_RUN.

## A–G. Formal model and contract

Sources are exact UTF-8-stable strings. STOIBAS admits JSON only when its lexical
tree renders exactly to the original source with width1/2/4, canonical colon/comma
spacing, LF and final LF. Limits:50000 UTF16 source/folded/output units,10000 nodes,
depth128. Source JSON parsing validates syntax; serialization uses copied **raw
lexemes**, so -0,1e309, escape spellings, duplicate keys and key order survive.
Bare-key removal is allowed only for a specified ASCII-safe spelling; exceptional
keys remain quoted. No source files or corpus manifests were normalized.

Access: encoder sees source, tokenizer and parent modules. Native decoder receives
only the full emitted message—no source, system prompt, skills, examples, external
dictionary or new trained vocabulary. Python/TypeScript inversion is a separate
verification layer. Actual tools and missing verifiers are in research.md.

Cost vector: entire o200k_base message tokens, exact source bytes, encoder wall/CPU,
and decoder behavior. All instructions and parent representation are counted;
extra parent encodes and memory are not free. Native tolerance is zero differing
bytes; token counts are exact integers. A timing ratio is not a universal runtime
bound or an inference-latency measurement.

Quantifier order: for each source x with a verified incumbent, choose the cheapest
admissible exact candidate or retain that incumbent. Thus selected token cost is
<=incumbent for every such invocation. A measured gain on one x is an existential
result, not `exists C forall sources/models all metrics improve`. A full native
claim would first fix model/version and a blind trial protocol, then test exact
outputs on the declared domain/distribution. No such model was called here.

Comparator is TAGSTACK plus X152 HOMOSEMA, X153 KENOMA and X154 ARKESIS—not raw
text or a weaker parent. Canonical flags: OMEGA_DET=1, OMEGA_NO_MEMO=1,
OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0, OMEGA_NO_OROTHESIA=1.

Adjacent problems excluded: JSON-value equality; normalization; summarization;
payload-only pricing; shorter character strings; phrase-count approximation;
changing tokenizer/vocabulary; hidden source access; model task accuracy instead
of exact reconstruction; program inverse instead of a native trial; microbenchmarks
instead of complete encoders; shortest partial programs instead of this bounded
explicit decoder.

## H. Hypotheses and evidence thresholds

- H+: a different source representation can improve the existing parent's complete
  message. Accept only a >10-token measured win with disk-source byte verification,
  reference pricing and transport gates. This supports only a bounded token claim.
- H−: the requested whole conjunction is impossible. Not established. With V token
  symbols there are at most sum(i=0..t)V^i codewords of length<=t. This elementary
  injectivity bound prevents arbitrary universal shortening past capacity, but says
  nothing against structured-file wins. No ETH-based impossibility is assumed.
- H∂: result changes at layout/model/size/parent boundaries. Losses, refusals and
  missing behavior tests remain visible instead of being relabeled successes.

Deployment threshold for speed, predeclared in reused speed-run.py: >=10% reduction
in both aggregate process wall and encoder CPU, no per-lane regression, identical
wires in12 cold-process ABBA calls across three fixed lanes. Full success also
needs native behavior and the requested useful breadth. Do not merge without it.

## New construction and its proof boundary

The fully quoted arm writes one node per LF-delimited record in breadth-first
order. `{` records contain quoted object keys, `[N` is an N-element array, and
other records are raw JSON scalar lexemes. Object cardinality is the number of
keys, not a separately transmitted count. Child records fill pending slots FIFO.

The typed-line arm writes safe keys bare in their known-key channel and writes a
string scalar as `=` followed by its literal JSON content without outer quotes.
The LF boundary supplies the string end. These changes alter the representation
seen by the parent, not merely the final instruction wording. Both arms are one
mechanism family, not two independent discoveries.

Queue invariant: begin with one pending root slot. Each record consumes one slot
and appends exactly its degree in ordered child slots. Before each record the
pending count must be positive; at EOF it must be zero. Assigning records FIFO
therefore specifies one ordered rooted tree, with no reference cycles. Each key
and scalar's raw lexeme is copied, and exact-render admission binds the reconstructed
layout to source bytes. This is a construction argument plus executable gates,
not a proof about a language model following the instructions.

ARKESIS consumes a recursive prefix stream with explicit object counts; STOIBAS
groups each object's keys and defers all children. TENSOR/ROSETTA and other close
ancestors were inspected; novelty is scoped to this repository implementation,
not a new general tree-serialization principle or an exhaustive equivalence audit.
See research.md for classical level-order and related compression literature.

Search: non-greedy finite width enumeration and complete-message argmin with strict
fallback. The main optional wrapper offers the typed arm; the losing quoted arm
is retained as an experiment. Equal folded payloads share one parent call across
widths. CPU-bound transformations, conservatively O(N²) character-copying work
under substring/immutable-string implementations and fixed depth caps; inherited
parent searches dominate and have no wrapper-wide wall-time guarantee.

## Six mechanism-distinct tracks

`portfolio.ts` freshly screens29 canonical lanes; these are distinct mechanisms,
**not six new inventions**. The successful STOIBAS arm does not validate the rest.

| Track | Construction / artifact / established portion | Remaining interface | Cheapest structural attacker / gap |
|---|---|---|---|
| FIFO typed trees | stoibas.ts, unit/compact-unit/gate; lexical tree reconstruction | native queue execution, breadth, added runtime | nested siblings, wrong counts, = inside strings; local format/behavior gap |
| Recursive cardinalities | existing arkesis.ts, fresh portfolio and617 existing unit checks | same native/runtime gaps | scalar/array count mismatch and duplicate-key normalization; local |
| Layout-derived closures | existing kenoma.ts, fresh exact inverse screens | noncanonical layouts and model behavior | blank lines/dedent with unusual close spacing; local |
| Permutation channel | existing diathesis.ts, eligibility screen | carrier/full header and native rank decoding | repeated entries/order ambiguity; local candidate gap, original broad target unresolved |
| Function-derived fields | existing mekos.ts, fresh inverse screens | sparse eligibility/header payoff | UTF8 target byte length versus character count; local |
| Numeric pair-cost cache | speed-build.mjs and scorer-gate.ts; exact delta scores | whole-stack speed threshold | encoding mix, signed keys, surrogates, multi-unit fallback and pruning; local implementation gap |

Ordinary prose is outside STOIBAS's domain; no general prose gain is claimed.
The canonical prose/ops screens and protected timing lane were retained rather
than selecting only favorable JSON tests.

## Negative space and repair

The22-shape executable modal detector rejects omitted headers, weaker baselines,
semantic normalization, encoder self-report, program-as-native substitution,
training-as-heldout, symbol-to-token transfer, free dictionary/search, micro-as-whole
speed, contaminated/memo timings, unsupported-as-pass, challenge-as-proof,
source-as-kernel-replay, stale repaired gates, family-to-universal claims,
character-as-token counts, source mismatch, hidden lane regressions and NOT_RUN
as pass. It also rejects an X155 full-Pareto claim. It checks explicit structured
flags—not arbitrary English proofs. The central shortcut, `program exact inverse
=> native model exact inverse`, is rejected rather than silently accepted.

A real repair was required: candidate builders initially admitted a parent string
containing an unpaired surrogate when an adversarial callback returned the correct
folded payload. `transport-before.json` records both failures. Both builders now
reject UTF8-unstable parents. Six targeted surrogate attacks pass; all affected
candidate wires are freshly rebuilt with the repaired code and repriced/read, and
both codec test suites plus typed-line attacks were rerun. No old candidate gate
is inherited without replay. Actual measured parent wires were already stable.

A separate test-harness defect classified variants from receipt filenames and
failed on heldout.jsonl. It now classifies from the actual message header and binds
incumbents by source path. All seven wires were rerun; the targeted attack mixes
quoted, typed and heldout records in a filename without `compact`. It passes and
is retained as envelope-mixed.jsonl/gate-repair.json. The independent reader also
explicitly skips non-STOIBAS incumbent records; skipped records are not passes.

## Completed full-wire results

| Source | Full incumbent | Quoted arm | Typed-line arm | Strict selected saving |
|---|---:|---:|---:|---:|
| Canonical json-pkg |653|718|653|0, tie retains incumbent|
| VS Code JSON manifest |822|862|**805**|**17 (2.07%)**|
| VS Code HTML manifest |826|858|**802**|**24 (2.91%)**|
| Prospectively selected typescript-eslint parser manifest |412|not offered|425|0, fallback|

The unrelated-project heldout completed against a freshly computed full ARKESIS
incumbent. Its13-token loss is evidence against broadening the two same-project
wins into a general JSON/prose advantage. Source/ref/license and the pre-pricing
plan are retained.

Seven independent Python reads match source bytes. Quoted617 + typed616 unit checks,
108 typed-line attacks and44 independent replay/negative checks pass. Six transport
repair attacks,11 wrapper attacks and8 resource-boundary checks pass. Full parent wire pricing uses the reference tokenizer;
UTF8 transport and token-ID reconstruction are checked separately.

Fresh canonical frontier:29/29 wires identical to X154, total11962. Bounded project
reader21/29, eight unsupported; all29 price/token-ID/transport checks pass. Category
leaders are unchanged and identity-bound in leaders.json/local-leaders.json:
prose5 lanes5856→3429 (word), ops16 lanes17278→5580 (glyph), code4 lanes4152→2636
(word), other4 lanes729→317 (no tape). Classes describe body BPE tokens, not word
counts or universal optimal-codec labels. External gains are not silently inserted
into the canonical total.

## Whole-stack speed result

A new A/B-only optimization uses an injective signed32 key for two UTF16 code units
in the hot assignment-cost scorer, with separate bounded caches for each encoding.
Longer glyphs keep the original string path.3064 scorer checks against the old
scorer and reference tokenizer pass in each build; accepted costs and commit vectors
agree, and A/B receipts match. Deterministic workTick and pruning rules are retained.

After other heavy jobs exited,12 cold complete-encoder ABBA calls produced identical
wires. B/A aggregate CPU0.979054, wall0.977531; prose regresses (CPU1.017097,
wall1.019690). The >=10%/nonregression gate **FAILS**. Approximately2% aggregate
movement is not significant acceleration under the declared criterion. Not deployed;
no production ARIADNE optimization was made. Full candidate29 regression is not
claimed for a speed patch that failed its deployment gate.

## Reproduction / remaining decisive gate

Bundle TS runners with esbuild --bundle --platform=node --format=esm; execute node.
Run independent.py over trials.jsonl and compact-trials.jsonl. Rebuild speed A/B
with speed-build.mjs; run speed-run.py only after heavy jobs exit. modal.py and
compare-frontier.py are direct Python scripts. Generated bundles are ignored.

Native test protocol and exact packet are in native.md/receipts/native-packet.txt.
An independent basic-chat endpoint remains the highest-information missing verifier.
No all-lab proof audit or Lean replay occurred. Positive token evidence does not
justify merging while native behavior, broad useful gains and speed gates are unmet.

## Fresh API and final gates

Fresh full API, including every incumbent stage, reproduces822→805 with one
additional STOIBAS parent call. After the width-cap repair, recorded314244.394mswall/330614.704msCPU. These are cost observations, never paired speed evidence. The earlier overlapping run is retained separately and is not the repaired API receipt. The entire message matches the native packet exactly and its
reference token price/source bytes pass. Typecheck and production build pass.

The declared native verifier is unavailable, the speed gate failed, and general
prose/ops advancement was not demonstrated. These are exact unmet conditions,
not a claim that the overall research goal is impossible. PR must remain draft
and unmerged. Next highest-information test: blind native reconstruction using
native.md; next breadth test should be an unrelated prose/ops mechanism, not more
same-project JSON positives.

### Width-cap repair and mandatory replay

A late boundary test found a false-negative admission bug: trying width4 could
exceed the output cap and discard a valid width1 plan. The width trials now reject
individually. Positive depth128/10000-node cases and negative depth129/10001-node
cases pass. All transform, full-wire, independent, wrapper and transport gates,
portfolio screens, typecheck/build were rerun; the earlier API receipt is explicitly
renamed full-api-before-width-repair.json and the fresh full API after the
patch also passes805tokens, source bytes and packet identity. This was an admission loss, not a byte-corrupting accepted message. No prior
receipt silently certifies the repaired code.
