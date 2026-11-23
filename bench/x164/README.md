# X164 — KRYPTOLYSIS, compact TAGSTACK refinement, and rejected hypotheses

## Final mechanism correction and primary result

**KRYPTOLYSIS** (`src/lib/omega/kryptolysis.ts`) adds cyclic ASCII-alphabet preconditioning: enumerate25inverse shifts, price every complete direct form, then offer the two best raw-ranked representations to the unchanged parent. The winning wire includes the exact inverse shift. It is a new operation in the inspected repository, **not** an AI invention: Caesar/ROT13 substitution is classical human prior art. It does not satisfy the aspiration for a human-blind new compression theory or broad ordinary-prose gains.

Whole, unedited public IOCCC explanatory documents already stored as ROT13:

|Source|Bytes|Prior complete frontier|New complete message|Saved|
|---|---:|---:|---:|---:|
|2015/burton/src.doc.rot13|2158|870|622|248 (28.51%)|
|2018/burton2/src.doc.rot13|1882|714|549|165 (23.11%)|

Both use inverse13. CPython's standard `codecs.rot_13` independently reconstructs original bytes after a separate Python parent decoder. These are exploratory encoded study/code explanations, **not** unencoded everyday prose gains. In45raw-complete screens, only these two improved;43controls did not. Complete-parent claims cover these two, not all45.

KRYPTOLYSIS model: UTF8-stable strings≤50000UTF16units, shifts1…25, only ASCII A–Z/a–z transformed, case class and every non-ASCII/other byte preserved. For a fixed inverse k, encoder applies26−k and decoder k, so composition is identity modulo26 on each ASCII alphabet and identity elsewhere. Thus length and UTF8byte count are preserved before parent compression. Stronger claims depend on the actual parent/reader and behavioral gates below. No secret key or external vocabulary is hidden: k and the alphabet are in-band.

Search is finite heuristic ranking, **not greedy character substitution**, and not a global minimum over all25parent encodes. All25direct messages and at most2parent candidates compete against the verified incumbent. Work is25alphabet transforms plus token prices and≤2full parent calls; retained candidate text O(25n), decoder O(n), CPU-bound, no wall-clock cutoff. The adversary is wrong shift direction, wrapping/case errors, non-ASCII corruption, malformed/ambiguous headers, cap overflow, unsupported parent and an attractive raw ranking that loses after the parent. Tests exercise every shift, ASCII boundaries, Unicode, strict selection and exact full wires.

**Novelty failure retained:** the initial ANTIKLEIS candidate rediscovered an operation already present in `tagstack.ts`, overlooked because a grep incorrectly excluded that file as an aggregator. The sdk.props baseline exposed the mistake. Its novelty claim is rejected, not repaired by renaming. It remains only an optional compact-marker/contract refinement with separate measured value. HYSTERON's forward Python-comprehension binder references were then screened on8whole files; all six eligible raw forms lost, two refused. It remains under `rejected/`, not a production success.

The A–J framework below applies to the whole investigation; its detailed markup model describes the **TAGSTACK refinement**, not the new mechanism. KRYPTOLYSIS shares the exact-byte, complete-price, fallback, native and runtime gates.

## A–F. Model, access, resource, quantifiers and boundaries

Admissible source x is an exact UTF8-stable string, at most50000UTF16code units, in a deliberately restricted balanced-markup lexical grammar: ASCII names `[A-Za-z_][A-Za-z0-9_.:-]*`, quoted attributes, exact case-sensitive nesting, depth≤128. XML comments, CDATA and processing instructions are opaque and preserved. Self-closing tags do not push. DTDs, HTML implicit closes/void-tag conventions, names outside the ASCII grammar, invalid Unicode and existing `<>`/`</>` collisions refuse. No XML entity expansion, attribute reordering, whitespace normalization, newline conversion or DOM reprinting occurs. Closing-tag whitespace is preserved literally rather than folded. The domain allows balanced fragments, not only valid one-root XML; real fixture validity is additionally checked with Expat.

Encoding replaces each canonical `</name>` with `<>`, then offers that representation to the unchanged parent. The older `</>` dialect is retained for reading archived trials. The complete ordinary-language instruction precedes the parent message. No vocabulary table, skills.md, system prompt or package is required by the specified decoder. This is a **specification property**, not a behavioral certificate for an LLM. A simple worked example `<a><b>x<><>` expands to `<a><b>x</b></a>`; this illustration is not an independent native test.

Tools actually used: shell/git/gh, Node/npm, TypeScript/esbuild/Vite, Python stdlib including Expat, search/fetch, real OS subprocesses. No independent agents, simulator, Lean/lake, model endpoint or expert verifier. The X163651token native packet remains NOT_RUN because no independent chat endpoint is exposed; preparing a new packet cannot fix that access limitation. Timed experiments explicitly pause competing encoder process groups and resume them in a finally block. Light inspection/file work may occur, so these are not pristine-machine certifications.

T(m) counts o200k_base tokens of the complete in-band instruction + parent contract + dictionary + body. Ground truth is original source bytes. The finite observations have zero byte/token tolerance. Input size, output expansion and depth caps apply to both readers; unsupported parent operations fail closed. The bounded date8 parent extension recognizes one exact existing header and restores maximal ASCII8digit runs only after dictionary expansion; it adds no new wire operation.

Quantifiers:
1. Intended exactness: one fixed D, for every admitted x, D(E(x))=x in UTF8bytes. The induction below and tests are not a kernel-checked implementation proof.
2. Selection: for every supported verified incumbent I of x, T(select(x,I))≤T(I); if applied, strict inequality. Ties retain I. Unsupported or losing candidates never replace I.
3. Bounded token target: there EXISTS a pinned, whole, non-generated real source x with independently read complete message and T(new)≤T(baseline)−11.
4. Strong requested target adds broader prose/ops coverage, independent native one-chat byte reconstruction, and runtime non-regression. These conjuncts must not be replaced with (3).

H+: strong conjunction established only when every gate passes. H−: a component counterexample or an applicable quantified impossibility result, not “experiments failed therefore no codec exists.” H∂: outcome depends on grammar/reader/source family/resource/evidence boundary. Missing native evidence is H∂. Finite-alphabet counting rules out strict shortening of every finite source by an injective code; it does not forbid this selected-family gain or establish any terminal codec.

**Pre-commit engineering threshold:** ≥11complete tokens on a real whole source, independent original-byte inversion, source/marker/parent attacks, reproducible receipts, passing TypeScript/build, and no default-frontier change. Strong scientific Pareto certification is a separate threshold and remains false unless its additional gates pass. The user's unconditional merge instruction authorizes an engineering artifact, not a scientific acceptance claim.

## Construction, proof obligation and costs

Invariant: after each lexical token, encoder and decoder have the same ordered stack of names. Literal start tags push exactly their retained name; self-closing tags and opaque regions do not alter it; canonical end tags pop a checked matching name. At a marker the decoder prints that exact name between `</` and `>`, then pops. Other bytes are copied. Induction on lexical tokens establishes the intended inverse on the admitted grammar. No dictionary of tag names is required. Transport stability lifts string equality to UTF8byte equality.

No greedy compression search is performed in the transform: all eligible canonical closes are folded deterministically. The final selector takes a strict complete-price minimum over verified incumbent, direct marked text and one parent encoding of marked text. It is not a global optimum over marker placement, dialects or all405modules. The parser scans bounded input; regex/JSstring allocation implementation has no newly machine-proved linear-time bound (conservative polynomial work under50kcap). Stack memory is O(depth plus stored names), emitted text O(n). One extra parent call dominates CPU/wall; byte equality and token monotonicity do not make that search free.

ANTIKLEIS novelty was falsified by the actual existing TAGSTACK contract; see the correction above and receipts/novelty-correction.json. Its value is narrower marker/contract representation, not a new stack operation. The measured markup baseline includes TAGSTACK, SIBLING-TEMPLATE and NEST on exactly the same source. Recent optional KLIMAX/HAPLOGRAPHE/KAMPYLI/AKROSTICHIS/LEXARITHMOS eligibility gates are checked separately. No baseline is described as a global minimum over all experimental compositions.

## G. Adjacent problems explicitly excluded

Semantic summarization; normalized DOM equality; minification that loses bytes; entity decoding that changes spelling; lossy whitespace/CRLF conversion; new tokenizer/model training; free headers/dictionaries; raw-only or payload-only pricing; isolated transform timing promoted to full-stack speed; program inversion substituted for native chat; subset selection presented as held-out generalization; source inspection called kernel replay; local template factoring renamed as a new universal primitive; byte/storage compression substituted for prompt tokens; faster approximate search changing fidelity/frontier.

## H–I. Mechanism portfolio and adversaries

Each branch retains an executable artifact; reused controls are not counted as newly invented codecs. Initial representations are independently screened before expensive parent trials.

|Mechanism|Construction / artifact / established portion|Unresolved interface / strongest cheap attacker / gap|
|---|---|---|
|Compact TAGSTACK dialect|refinement module, unit.ts, independent.py, trial.ts; arbitrary-name token-stack induction and exact finite tests|whole-parent price/native behavior; mismatched case/nesting, quoted `>`, opaque fake tags, depth and expansion bombs; local implementation + original behavioral gap|
|NEST sibling template|existing recursive repeated-sibling topology, exercised as actual baseline in trial.ts|irregular sibling shapes, unique names; paying candidate vs complete parent; local applicability|
|STOIBAS breadth-first queue|existing JSON child-slot FIFO, independently screened by portfolio.ts|key arity/orphans/order; not a new primitive; local format/price gap|
|KENOMA whitespace residuals|existing holes/indent parameter plans and exact undo|tabs/mixed indentation and literal markers; raw proxy not final win; local representation gap|
|PTYCHE local wrap widths|existing paragraph feasible-width plans and exact undo|unmatched wraps, variable spaces/Unicode; no model formatting guarantee; local coverage/interface|
|DIATHESIS permutation carrier|existing rule-order information carrier in portfolio.ts|dependency constraints/carrier scarcity and full cost; behavioral reliability remains original gap|
|HOMOSEMA terminal coalescing|existing JSON parser-state inversion, portfolio.ts|duplicate keys/escaped strings/malformed nesting; exact preservation unlike DOM rewrite; local syntax/price|
|Fail-first run scoring|speed-build.mjs and actual scorer differential tests|integer bound unchanged but ordering overhead; whole-encoder ABBA; speed hypothesis falsified if protected lane regresses|
|Bounded global token cache|cache-build.mjs, fresh reference counts and whole ABBA|cache-thrashing and allocation peaks; exact key/value recomputation preserves counts, does not promise speed; local engineering|
|Rollback state specialization|rollback-build.mjs and actual closure invariant audit|skip/accept/reject/duplicate-write paths, stale trial buffer; whole-wire ABBA and source-byte checks required; local state invariant|

Initial full `</>` trials and repaired `<>` trials are distinct evidence: original receipts are archived, both headers are recognized, and wrong-marker/wrong-header attacks are added. The shortened contract uses ordinary XML matching semantics and does not authorize an undeclared marker. New opaque-decoy/self-close attacks rerun; original parent timings remain original observations, not timings of header repricing. A separate date-header reader extension was required when the independent baseline reader returned an unsupported envelope literally; that failure was not counted as a pass, and byte gates rerun after the extension.

## Negative space and executable modal shortcut test

Extend X163's22-shape modal detector to24shapes with X164 evidence flags. It rejects omitted contracts, weak baselines, normalized equality, self-report, native substitution, training-as-heldout, symbol→token transfer, free headers/runtime, micro→whole claims, contaminated or memoized timing, incomplete-as-pass, challenge-as-proof, source-as-replay, stale repairs, family/finite universalization, characters-as-tokens, different-source comparisons, aggregate-hidden regressions and NOT_RUN-as-pass. Add explicit trust-route and marker-contract mismatch cases for this turn.

Modal failure: ∃program D with D(E(x))=x does not imply that a different untested model M returns x from E(x), much less ∀models or ∀sources. A model can output the unchanged wire while the program succeeds. An executable countermodel accompanies the evidence-schema detector; neither is an English-language theorem prover.

## Verification / current outcome ledger

Receipts are authoritative; all final completed values are summarized below before release. Native remains NOT_RUN. Speed gate is fixed at≥10%lower aggregate encoder CPU AND process wall, with no per-lane regression in either and identical full wires,12cold ABBA calls on kb-article/ps-real/json-pkg. Source correctness and engineering release gates are separate.

## Reproduction and next decisive tests

Use npm ci --ignore-scripts. Bundle TypeScript entrypoints using esbuild --bundle --platform=node --format=esm; generated bundles are ignored. Reused frontier/count/scorer/ABBA/portfolio scripts retain provenance in comments. Run unit.ts → independent.py → gate.ts; rerun independent/gate after all trials finish. Original fixtures are pinned by repo/revision/path/SHA256 in receipts/provenance.json; no transformed/truncated source is called a whole-source result.

Highest-information native test: submit the frozen shortest accepted complete packet as the sole user message to an independent basic chat. Preserve raw output and compare UTF8bytes without trim/fence removal. Highest-information coverage test: preregister whole manuals/configuration files from different publishers and plain prose/ops controls, then price against the same frontier. All scanned fixtures in this turn are exploratory, not blind held-out claims. Highest-information runtime test: actual rollback-state invariant audit plus identical-wire whole-stack ABBA, followed by all29candidate frontier wires if the speed gate passes.


## Completed verification and runtime outcomes

- KRYPTOLYSIS6078unit checks;3033independent checks, including both complete winning wires and all four parent outputs;34strict gate/eligibility checks. Original source files, not encoder decoded fields, define correctness.
- Compact TAGSTACK:20073unit checks;4045independent checks including12complete original/candidate wires, with **Expat-driven independent inversion** of all6candidate markup streams. Final source/price gate includes recent optional baseline eligibility checks.
- Compact TAGSTACK source prices: files-browse809→798(−11), wireless812→801(−11), terminal586→576(−10), sdk1262→1237(−25), shell-introduction1502→1471(−31); NuGet236→237 loses and retains236. The31token manual-page gain is an existing-mechanism refinement, not a new primitive.
-24deceptive shapes and the invalid program-existence→arbitrary-decoder implication are tested. Native basic-chat decoding remains **NOT_RUN** for both new and prior packets. No package/program verifier is called a native test.
- Fail-first affected-run order:12ABBA whole encodes, CPUratio0.986250/wall0.991724; protected regressions,10%gateFAIL.
- Global fast-chunk cache2,097,152→65,536:12ABBA whole encodes, CPU0.979076/wall0.977216; protected regressions,10%gateFAIL. Fresh reference16192counts/arm match. Actual70,100checks/arm cross capacity; revisiting100old keys yields100hits in A versus100misses in B, with identical tokenizer values. Memory observations are recorded, not a universal memory/speed theorem.
- Rollback-state specialization:12ABBA whole encodes, CPU0.979014/wall0.976945; protected regressions,10%gateFAIL. Actual closure audits assert trial=committed assignment at261558/1245915/1269003probe starts on three sources and reproduce canonical wires. No production speed patch is installed.
- All36timed wires and3audit wires are compared with canonical messages, not merely totals. Parent trials that were paused during speed gates are not used as wall-time comparisons.
- TypeScript and production build pass; native reliability, significant whole-stack acceleration, broad ordinary-prose gains and strong Pareto certification remain unestablished.

Run `kryptolysis-unit.ts`, `kryptolysis-independent.py` and `kryptolysis-gate.ts` for the primary codec. `hysteron-screen.ts` is a negative screen only. `recontract.ts` archives old compact-marker contracts and preserves original parent timing scope. The final canonical replay/leader receipts are recorded separately when all29lanes complete.

## Final canonical replay

All29fresh wires equal X163 byte-for-byte; total11962unchanged. Every receipt's
source/decoded field matches the actual original file; that field alone is only
self-report. The separate bounded repository reader reconstructs21wires and
reports8unsupported, while all29complete token prices and token-ID roundtrips
pass. See frontier-compare.json and frontier-gate.json. Category totals and local
leaders were freshly recomputed with the existing X134 classifier in leaders.json
and local-leaders.json: prose5856→3429, ops17278→5580, code4152→2636,
other729→317. Largest absolute savings: apt1926, ls-l3884, JSON499, cue412;
ops relative leader prices.csv79.73%. No production frontier improvement claimed.

The unconditional merge request is operational only. Broad everyday gains,
native exact decoding, significant runtime gains and the complete Pareto
conjunction remain unfulfilled. The next discriminating test is a blinded
single-basic-chat decode of each complete packet, scored against source bytes,
not another programmatic inverse or semantic summary.

X165 replay: all29canonical wires remain byte-identical, total11962. Saved
KRYPTOLYSIS full-wire/independent gates replay unchanged. X165's experimental
DEIKTIS is not a broad/native Pareto certification; see the X165 ledger.
