# X144 contract, portfolio, adversaries, and stopping record

## A–B. Formal model
A source is a finite byte string which round-trips through UTF-8 without alteration. The public TypeScript codec also handles UTF-16 strings; lone surrogates are code-unit tests, NOT arbitrary-byte fidelity. PSIFIDA's transformed domain has <=50,000 UTF-16 units and no `~`; its reserved full instruction prefix is rejected by the standalone encoder to prevent identity/envelope ambiguity. Wider inputs use identity. A candidate consists of encoder E, exact program decoder D, a complete in-band instruction message, and a proposed native reader protocol. The decoder receives only that one message, no original text, file paths, per-user memory, model weights, tools, or side channel.

Count complete o200k_base message tokens using the reference tokenizer, source bytes, end-to-end encoder milliseconds, and native exact-match outcomes separately. No character/token or compressed-byte/token substitution. Finite fixture selection and resource limits are part of the claim. CPU-bound lexical scans have a size cap; TAGSTACK parent calls have inherited work budgets, not a new hard wall-time guarantee. Timings run with deterministic search, memo/engram/oura memo/orothesia disabled as in X143b; those environment choices are recorded in the harness.

Quantifiers: choose the implementation and test protocol first; for every source in the frozen evaluation set require source-byte equality and nonincreasing complete-message tokens, and require at least one lane to save >=11 tokens. Broad everyday gain additionally requires both prose and ops improvements, not a single constructed fixture. For a Pareto claim including speed, require isolated ABBA/BAAB timing totals <=0.90 of baseline on each of the three predeclared lanes, identical source/wire, and no selected median regression. Native gate: a separate reader gets only each frozen packet in one chat; every tested emitted candidate must return the exact source bytes. Neither this finite test nor program inversion proves all-model/all-input performance. If the native evaluator is absent the gate is NOT_RUN.

H+: all mandatory finite gates pass. H− universal compression: a total injective encoding cannot strictly shorten every finite message over a finite alphabet (pigeonhole; zero-length input is already a boundary counterexample). This does NOT rule out the user's corpus-specific target. H− candidate-local: an actually measured candidate loses the objective. H-boundary: token winner with untested native behavior, a finite empirical improvement, omitted parent arms, unproved statement equivalence, or a speed result confined to particular workloads. Negative trials do not prove global impossibility. Explicit counting argument: for a finite alphabet of size K>=2, there are sum(i=0..n) K^i strings of length <=n, but only sum(i=0..n-1) K^i shorter outputs; an injective total mapping cannot send the larger finite set into the smaller one. For token-length universality use the analogous finite sets of valid text strings having at most n tokens; the zero-token source alone already defeats a strict reduction on every input. This does not provide a useful lower bound for the finite prose/ops corpus.

Adjacent problems excluded: summarization; semantic equivalence; trained/new tokenizers; arithmetic coding with model-probability access; binary compression with external executable; reducing vocabulary size; partial-token log-probability optimizations; asymptotic SAT bounds as executable practical optimizers; source-aware decoding; bit-identical floats instead of original printed text; lossy noise removal; offline dictionary not transmitted; lower encoder runtime at a worse wire cost; improved microbenchmark instead of full stack.

## C. Frontier and open interface
Baseline is the actual TAGSTACK configuration rerun from X143b, not the best unwired historical result. Prior PTYCHE/KREMA packets remain frozen, and have no new blind evaluation. Reconfirmed totals and category leaders are written only after the frontier job completes. Public papers on shuffle compression apply to typed binary arrays and an actual executable decoder, not this native reader. The unresolved interface is whether a cheap self-contained textual inverse, the tokenizer's cost, and the parent's search distribution align on real prose/ops. No imported theorem closes that interface.

## D. False-solution shapes (modal detector)
1. Header-free price. 2. Parent tape omitted. 3. Compare to raw instead of shipped frontier. 4. Bytes called tokens. 5. Changed tokenizer. 6. Normalize source whitespace. 7. Drop invalid UTF-8. 8. Encoder self-report called independent replay. 9. Program decoding called native decoding. 10. Warm microbench called whole-stack speed. 11. Concurrent wall-times called speed comparison. 12. Favorable generated fixture called heldout data. 13. Rename existing codec as invention. 14. Local ranking called exhaustive optimization. 15. Unsupported reader called pass. 16. Formal challenge `sorry` called a failed submitted proof. 17. CI status called kernel replay. 18. A per-k machine called a uniform machine. 19. Faster SAT asymptotics called fast exact compression. 20. Partial research called exhaustive validation of all labs.

Modal shortcut: delete orthography and ask the model to infer it. Distinct byte strings can then have the same wire. `controls.ts` checks `Policy A.\n` versus `policy  A.`: normalization collides, so a deterministic reader cannot invert both. `receipts/semantic-collision.json` is the counterexample, not a compression result.

## E–G. Six mechanism-distinct tracks
These tracks have separate standalone artifacts before parent composition. Only PSIFIDA is a new module this turn; reusing prior controls is explicit.

| Track | Construction / concrete artifact | Established portion | Unresolved interface / cheapest falsifier / gap |
|---|---|---|---|
| PSIFIDA digit planes | `src/lib/omega/psifida.ts`, probe + parent + heldout | Position-wise transpose is invertible with preserved skeleton; unit and independent byte replay | Full metadata cost, parent response, native row weaving; full-price probe; original behavioral/performance gap |
| Positional copying | `controls.ts`, JSON literal/backreference stream | Source replay for nonoverlapping already-produced spans | Pointer/instruction tax and manual counting; price + one wrong offset attack; local format economics, original native gap |
| Entropy coding | `controls.ts`, Brotli/base64 control | Executable byte inverse | No unaided native decoder established; price and unavailable-executable detector; outside contract unless new behavioral evidence |
| Numeric prediction | `delta_control.ts`, DIAPHORA | Existing residual inverse checked against source | Irregular IDs, width, reset effects; actual prices and malformed differences; local model insufficiency |
| Transform images | `image_census.ts`, EIKON + SYNAPHE | Corpus census of case/other transformed phrase pairs; exactness where eligible | Long useful pairs may not exist; pair census is cheapest falsifier; absence here not a theorem |
| Layout prediction | `layout.ts`, PTYCHE | Existing greedy wrapping with boundary residuals reconstructed | Native exact line lengths; frozen packet blind evaluation; behavioral gap remains original |

The independent systems experiment is streaming pre-token traversal (`stream-experiment.patch`), not a seventh codec. It preserves the regex-defined partition, checks contiguous nonempty coverage, and sums exact cached chunk counts. Broad differential test is necessary but not sufficient for throughput superiority.

Specific attackers: PSIFIDA tilde collision, unequal column lengths, wrong hole count, non-ASCII digit lookalikes, leading zeros, signed/decimal numbers treated as digit runs rather than values, CRLF/NUL preservation, reserved envelope, huge expansion. Copy references attack future/overlapping ranges and codepoint/code-unit mismatch. Brotli attacks missing executable and full base64 cost. Delta attacks carry/width and random identifiers. Image transforms attack case collisions and insufficient pair support. Layout attacks consecutive spaces, long words, CR/LF, and exception placement. Streaming traversal attacks regex lastIndex leakage, empty/noncontiguous matches, Unicode boundaries, long chunks, and shared-cache contamination. Each has executable gates or explicitly remains unverified.

## H–J. Verification and repair policy
Available: shell, Node 22, TypeScript, esbuild/Vite, Python, Git/GitHub and live web tools. No independent agent, simulator, database service, blind native LLM API, Lean or Lake established. Existing Python readers provide implementation independence, not independent human expertise. Do not call a proof verified without a kernel run. Every repaired executable must rerun its gate and a patch-specific attack. Experimental speed code is compiled into isolated bundles then restored from production; no result is deployed merely because a differential test passes.

Stop with the actual finite experiments and exact gaps, not a claim that the problem is solved or impossible. The user's unconditional merge instruction in X143b does not carry forward: X144 requires superiority. Open a draft PR for the reproducible work; do not merge if native/Pareto gates remain unmet. The highest-information next test remains a real blind reader on the frozen PTYCHE/KREMA winners, not another encoder-self-report assertion.

## Gate escalation after heldout failure
The inherited Python frontier reader tried strict UTF-8 encoding of an unsupported
message before classification and raised UnicodeEncodeError on Vite. Investigation
confirmed a real unsafe wire, not merely a Python parsing limitation: an emoji
high surrogate lives in a grammar rule and low surrogates in the body. The TS
source equality gate had not tested wire transport. New gates classify this as
invalid wire, not unsupported syntax; all affected readers were rerun. A separate
opt-in transport guard is exhaustively tested on single UTF-16 units plus composed
surrogate attacks and the 32 fresh messages. It repairs transport by raw fallback
(253→274 tokens for Vite), but does not establish compression superiority or
intrinsic correctness of every other transport-stable grammar. Production selector
integration is deliberately not claimed. See transport-gate.json for 65,581 checks.
