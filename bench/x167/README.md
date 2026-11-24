# X167 — THESI, cache ownership, and explicit acceptance boundaries

**Status: experimental, not registered in the production stack.** Adding a module and merging evidence does not establish the requested Pareto superiority. Native one-basic-chat byte reconstruction is NOT_RUN: this session has no independent model-call interface. A Python reader is not substituted for it.

## A. Object, access, resources, quantifiers

Source x is an original byte array that round-trips through UTF-8 and has at most 50,000 UTF-16 units. This excludes malformed UTF-8/lone surrogates rather than silently normalizing them. Sources containing `^` receive no THESI plans. ASCII words are maximal `[A-Za-z]+` runs; all other text remains literal. Case is significant. Dictionaries are carried in-band. No external vocabulary or trained skill is assumed.

The encoder sees x, an exact verified incumbent message, and an optional parent encoder/reader pair. It enumerates four length/frequency thresholds (4/8 letters × 3/5 occurrences), deduplicates identical folds, token-prices whole instructions plus data, and invokes the parent at most once on the best raw plan. The final selector verifies original-source equality and selects only a strict full-price improvement. A failed parent or reader leaves the last verified candidate unchanged. The caller must independently verify the incumbent; an encoder's decoded field alone is insufficient.

For every admitted x and valid plan p, the positional inverse reconstructs x. That is a program proposition. It does **not** imply ∀ native decoders D, D(message)=x, or even that a particular basic-chat D succeeds. A test suite fixes sources/settings before measuring; existential success on an adversarially selected source does not establish broad held-out improvement. No oracle gets uncharged state.

## B. Rival hypotheses and thresholds

* **H+ requested acceptance:** original bytes on every supported case, exact whole o200k price and token-ID round-trip, ≥11-token gains across varied prose and ops rather than a niche-only win, protected-source non-regression, independently observed basic-chat byte reconstruction, and ≥10% aggregate CPU AND wall reduction with no protected-lane regression. These are conjuncts, not interchangeable evidence.
* **H− local rejection:** no whole-frontier gains, any verified byte mismatch, or speed failing the gate rejects this candidate for production. It does not prove no useful codec exists.
* **H∂ boundary:** an unavailable native interface, unsupported independent parent layout, incomplete canonical run, OOM, or unread dependency graph is unknown/unsupported, never a pass. A raw-price win below the uncompressed source does not beat the existing stack.

## C. Mechanism and novelty boundary

`src/lib/omega/thesi.ts`: **THESI**, placement, sends an inverted occurrence index. Selected words become identical `^` holes; a JSON row gives the literal word and ordinal hole positions. Equal-step runs of at least three positions become `p/s/n`. The inverse checks a bijection between positions and holes before substitution. Missing, duplicated, out-of-range, nonpositive, malformed or excessive positions are rejected. Output expansion is capped.

This is classical positional-index ancestry, attributed in research.md; no information-theoretic novelty claimed. Relative to the inspected repository mechanisms, it differs from STOIBAS/LEXARITHMOS word-ID streams, KRYPTOLYSIS's arithmetic representation, DEIKTIS's relative pointer stream, SYMFRAZ's context-ranked numeric side stream, DIATHESIS's grammar permutations, EUTAXIA's source-key ordering, and HOMOIOS/ANTIPHON edit/copy streams. It changes where lexical identities are carried, not merely their names. Searches across current omega sources found internal inverted indexes used for optimization, not this same wire format; that search is not an exhaustive proof of novelty against every historical experiment.

Positions are monotonically assigned in source order, dictionary rows in first occurrence order. Arithmetic-run compression greedily takes the maximal equal-step run at its current cursor; it does not optimize token segmentation. Threshold enumeration and one-parent policy are deliberately bounded and not globally optimal. At fixed four plans, counting/scattering uses O(n) storage and nominal linear scans; sorting the constant plan set is bounded. Tokenizer/regex implementation costs and the parent search dominate actual resources; no newly kernel-proved runtime bound. Parent callback execution is not bounded by this module and can OOM. Admission caps bound accepted wire size, not total transient heap.

## D. Six mechanism-distinct approaches

Fresh executable portfolio is `portfolio.ts`, with `receipts/portfolio.json`. Existing implementations are controls, not renamed new codecs. For each, full raw contract pricing and source inverses are tested where available; none inherits native evidence.

| Approach | Construction/artifact and established portion | Unresolved interface; cheapest falsifier; original-target gap | Structure-specific adversary |
|---|---|---|---|
| THESI positional scatter | new module, four bounded plans, exact inverse | whole parent price/native; trial email and prose before adoption; raw saving is insufficient | alternating two high-frequency words with irregular long postings; literal ^; duplicate/out-of-range posting |
| DEIKTIS relative references | existing module re-executed, reversible pointer stream | pointer cost/native tracking; full contract price on short prose; existing control not novelty | long-distance references and many one-use words |
| Cyclic block sorting | X165 block-sort control, exact inverse and index | ordering recovery/native burden; header-inclusive tiny text; symbol clustering is not BPE superiority | unique/periodic strings, ambiguous rotation without index |
| COLEX predecessor front coding | existing plans, price control | dictionary+parent overhead; short word list; lexical common suffix is not broad prose improvement | unrelated words and costly dictionary order |
| LEXARITHMOS rank arithmetic | existing plan/control, charged key | arithmetic decode and complete price; short source; no new mechanism credited | large rank alphabet, incompressible indices |
| Recency-list references | inherited reversible bench construction | list-state cost/native; check repeated near/far words; benchmark prototype only | continually cycling vocabulary wider than useful reference span |

Heap-ownership optimization is a seventh engineering approach, not a seventh compression mechanism. Its candidate bypasses redundant inner-cache insertion when the outer chunk cache already owns the exact count. It is test-only via esbuild. Fresh exact-count and whole-stack timing gates reject production adoption below.

## E. Deceptive result shapes and modal detector

`modal.py` executes 27 deceptive shapes: payload-only price, weakened baseline, normalization for bytes, self-report, program-for-native substitution, train/held-out leakage, symbol-to-token transfer, free header, free search, micro-to-whole transfer, contaminated timing, memo leakage, incomplete-as-pass, challenge-as-proof, source-as-kernel-replay, silent repair, restricted-to-universal, finite-to-universal, character-to-token substitution, different source, aggregate hiding regressions, NOT_RUN-as-pass, axiom-as-certificate, undeclared marker, known-source-as-blinded, niche-as-broad, repaired-inherits-trust. The actual Pareto claim is rejected. A two-function countermodel demonstrates that existence of an exact algorithm does not imply success by another decoder. This checker accepts explicit evidence flags; it is not a natural-language theorem prover or a model simulator.

## F. Retained heap: actual ownership evidence

First Requests capture started near 408 MB heap at 10,000 relayout counts, then exited 137 during snapshot writing. The 72 MB partial snapshot was hashed and deleted; `heap-failed.json` records the failure. It is not analyzed as complete.

Repaired instrumentation captures earlier: 1,000 relayout counts, heapUsed 169,957,360 bytes. Snapshot completed, deliberate exit86. Strong-edge dominator analysis: 1,157,452 nodes, 1,157,444 reachable, five convergence passes, root self-size sum 166,385,954 bytes. The fast chunk cache individually retains 29,470,464 bytes; outer chunk cache 7,482,912. Removing BOTH from strong reachability makes **69,535,120 bytes** unreachable, exposing shared retention that separate dominator sizes miss. Raw snapshot is ignored scratch; sanitized receipt includes SHA256, node labels, ownership and cutsets, not arbitrary source strings.

This is a complete graph calculation for this instrumented snapshot, excluding weak edges. It is not a DevTools-validated retained-size implementation, an ECMAScript memory theorem, proof of the eventual OOM cause, or a completed Requests encode. Sliced-string ownership is recorded but not treated as a universal leak diagnosis. Repeated primary caches and static vocabulary both matter.

## G. Runtime experiment and repair discipline

`cache-build.mjs` creates A original and B test-only outer-owned cache bypass. Both arms freshly pass 16,192 reference count checks (both tokenizers, Unicode/surrogates, whitespace and prefix resumption). Isolated cold ABBA on prose, JSON and ops gives 12 identical wires. Canonical workers were SIGSTOPped during timing and resumed in finally; their wall times include this pause and are not speed comparisons.

Aggregate CPU B/A **0.998766**, wall **0.998719**: no significant speed gain. Prose CPU +2.516%, wall +2.199%; ops CPU +1.336%, wall +0.214%. **REJECTED**, production tokenizer unchanged. Even memory-motivated changes must clear whole-stack fidelity and timing gates; snapshot savings cannot be substituted for them.

## H. Fresh codec tests and parent logging repair

`test.ts` runs original-source byte inverses, library token counts and token-ID round-trips, seeded generated texts, invalid posting attacks, output/source caps, malformed UTF-16 and throwing/invalid parent fallbacks. Final test receipt records actual check count. Python positional reconstruction separately reads source bytes; it is not native chat.

Initial parent trial logging silently omitted a parent candidate when its independent reader mismatch threw inside the selector callback. Logging is repaired to retain generated parent wires and an explicit verified flag before refusal. The initial run also failed on the ls-l incumbent's reader mismatch; its log is preserved, not labeled a successful trial. Fresh affected trials rerun after repair. Unsupported parent layouts cannot become gains. Pure THESI parser was not relaxed to accommodate them.

## I. Research and strongest remaining test

Fresh source/quantifier reviews for OpenAI, Anthropic, Google, DoubleAI and an unsuccessful fresh ByteDance fetch are in research.md. No Lean/lake, comparator, Rocq, independent chat model, or extra research agents were run. Actual parallel Node processes are not independent reasoning agents.

The next decisive behavioral test is an independently administered single-user-message decode on unseen sources/settings with no tools/system skills/external dictionary, saving literal response bytes before comparison. This session cannot execute that test. For Requests, next isolate cache-policy memory behavior in a completed run with sufficient OS memory, rather than promoting the earlier snapshot to an OOM fix. Neither limitation justifies a superiority claim.

## J. Final results and reproducibility

Machine receipts and appended final summary are authoritative. Rebuild generated bundles with esbuild; generated .mjs bundles and raw snapshot are ignored. `npm ci` was run successfully. Baseline canonical flags come unchanged from `bench/x164/frontier.ts`. Final full-price/byte/leader checks use fresh X167 wires, not timing-instrumented outputs. Merging this ledger is explicitly separate from scientific acceptance.

### Completed final summary

* Canonical replay **29/29 identical to X166, 11,962 tokens**. Full library price
  and token-ID transport checks29/29; bounded independent repository reader21
  supported,8unsupported. These eight are not fidelity passes by that reader.
* THESI **34sources,71plans,1 raw-complete win**: ls-l5194→5005, still far above
  its1310token incumbent. No broad or whole-stack gain.
* Five fresh generated-parent trials: kb620→731 (reader mismatch), email486→561,
  code949→1163, ps381→529, llm-answer664→732 (reader mismatch). All refuse and
  retain incumbents. JSON's earlier trial had no accepted/generated logged
  candidate and is not counted among those five.
* Final unit/attack checks2493; saved-parent selector replay40. Separate Python:
  71raw folds and9complete supported wires exact; two candidate wires fail JSON
  framing. It tests these failures explicitly, not by skipping their wires.
* Six-control portfolio: THESI71plans/1raw-winning source; DEIKTIS166/20;
  block-sort34/8; COLEX101/1; LEXARITHMOS0/0; recency29/1. Raw controls do not
  establish parent gains. Native NOT_RUN for all.
* TypeScript and production build PASS (Vite38.84s).27deceptive schemas rejected.
  Generated bundles/snapshot excluded from Git; no default codec wiring changed.

| Inherited category | Raw tokens | Final tokens | Tape-body class leader |
|---|---:|---:|---|
| PROSE |5856|3429|word|
| OPS/TABULAR |17278|5580|glyph|
| CODE/STRUCT |4152|2636|word|
| OTHER |729|317|none|

Category labels are inherited, including apt-real classified as PROSE; these
aggregates are not proof of broad prose gains. `local-leaders.json` separately
reports largest absolute and relative fixture savings, not global codec winners.

**Verdict:** requested advantageous broadly useful Pareto-superior codec,
native-chat validation, and significant whole-stack speedup remain **unmet**.
This turn supplies a new experimental module, actual retained-ownership evidence,
fresh rejection tests and an auditable frontier refresh—not a successful claim.

### Rebuild / rerun commands

```
npm ci
node bench/x167/replay-build.mjs
node bench/x167/test.mjs
node bench/x167/portfolio.mjs
node bench/x167/gate.mjs
python3 bench/x167/independent.py
python3 bench/x167/modal.py
node bench/x167/frontier.mjs bench/x167/lanes.txt bench/x167/receipts/frontier.jsonl
python3 bench/x167/compare-frontier.py
node bench/x167/frontier-gate.mjs
node bench/x167/leaders.mjs bench/x167/receipts/frontier.jsonl > bench/x167/receipts/leaders.json
python3 bench/x167/local-leaders.py
```

Full canonical replay is expensive. For cache ABBA: build with `cache-build.mjs`,
run both count bundles, then `python3 bench/x167/runtime-run.py` in an otherwise
idle workspace (optional arguments are existing Node PIDs to pause/resume).
Heap capture: `heap-build.mjs`, then heap-worker.mjs with the Requests fixture;
expected diagnostic exit86, followed by `heap-analyze-build.mjs`. A killed capture
must not be treated as complete. Fresh parent trials use trial.mjs with explicit
source paths; gate.mjs only replays saved parent wires, not parent computation.
