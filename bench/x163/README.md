# X163 — LEXARITHMOS: grammatical numeral representations

## A–B. Formal model and admissible objects

Source x is a UTF8-stable string with at most50,000 UTF16 code units. Original file bytes, not an encoder's `decoded` field, define correctness. Text is not normalized. The explicit arm recognizes lowercase British cardinal phrases for100…999999, with hyphenated tens/units, `and` inside hundreds and before sub-100 thousand remainders, no commas. It emits `~N`; source `~` followed by any digit refuses. The contextual arm recognizes0…999999, remembering literal digit runs anywhere in the text; `^` reuses that number, `^N` names a number explicitly without changing literal history, and `^d` spells the last literal digit run digit-by-digit using comma-space separators. Source caret collisions refuse. The digit-list arm preserves leading zeroes; bare numeric reuse requires canonical decimal spelling. Digit lists are capped at100digits. All output-size checks are also50,000units.

The reader needs the complete in-band instruction and payload, no skills, system instructions, earlier chat, external lookup or training. English number names are ordinary language rather than a new codebook. No claim that a stock model actually followed this rule is made without a native test.

## C. Information/access and runtime honesty

Available and actually used: shell, git/gh, Node/npm, Python, TypeScript/esbuild/Vite, public search/fetch, downloaded public source files, num2words0.5.14 as an independent TEST verifier. No independent model endpoint, independent agents, simulator, Lean/lake, or expert review. Concurrent jobs are actual OS processes, not agents. No model decoding was simulated. The Python verifier is not a hidden decoder dependency.

## D–F. Resource, quantifier order, regime, boundaries and thresholds

T(m) is o200k_base tokens of the WHOLE message, including numeral instruction, parent contract, dictionary and body. Bytes and tokens have zero tolerance. Program exactness claim: one fixed decoder D, for every admitted source x, D(E(x))=x in original bytes. The argument below plus finite tests are not a machine-checked implementation proof. For each tested x, strict selection demands T(candidate)<T(verified incumbent), not merely raw-text savings. The baseline is the operational optional chain through KLIMAX, with HAPLOGRAPHE/KAMPYLI/AKROSTICHIS applicability checked. This is not a minimum over all404pre-existing modules.

A significant bounded token win requires there EXISTS a real source x with independent complete-wire byte reconstruction and T(candidate)≤T(baseline)−11. Strong requested H+ additionally requires native single-chat reconstruction, runtime non-regression, and broader prose/ops/everyday coverage. H− means an actual counterexample to a component or a correctly quantified impossibility theorem; failed hypotheses below do not prove every admissible codec impossible. H∂ means the answer depends on domain, decoder, cost or evidence boundary. Missing native evidence is H∂, not H+.

Speed gate fixed before measurement: at least10% lower aggregate encoder CPU AND process wall, no protected-lane regression in either metric, identical complete wires in12cold ABBA calls across kb-article/ps-real/json-pkg. Source/admission release gates are separate from scientific Pareto acceptance. Commit/merge is authorized only as an engineering artifact with truthful gate outcomes; unconditional user merge authorization does not turn a failed hypothesis into success.

Any injective code over a fixed finite alphabet cannot strictly shorten every finite input: the number of length≤n−1 outputs is smaller than the number of length≤n inputs. This elementary counting obstruction excludes universal strict shortening, not selected-family wins. Imported ETH statements are neither needed nor assumed. No terminal codec/global optimum is established.

## Construction, proof obligation and costs

A phrase is accepted only if parsing its value and rendering the specified grammar gives the original phrase exactly. Malformed conjunctions, capitalized variants, incompatible separators, suffixes and values outside the range stay literal. Boundaries prevent joining an encoded operand with a following source digit/identifier. Explicit-marker inversion is immediate from the render equality.

For contextual inversion use induction over the scan: the last literal digit run is unchanged in the folded stream; grammatical words and markers contain no literal digit run (explicit operands are skipped as operands). Both encoder and decoder therefore maintain identical literal-history state. Each selected cardinal or digit-list phrase is compared to its exact deterministic rendering before removal. Insertions never alter remaining source bytes. Round-trip equality is checked again. Leading-zero bare-cardinal reuse refuses, while digitwise reuse retains all zeroes. Domain stability lifts string equality to UTF8 bytes.

Search is deterministic left-to-right longest regex recognition, with greedy nonoverlapping replacement; it does NOT optimize segmentation globally. Per-site comparisons are grammar-exact, not semantic guesses. A conservative bound is polynomial in the50k input cap; regex backtracking/substring work has no demonstrated linear-time theorem here. Renderer recursion depth is bounded (thousands then hundreds); scratch/output are O(n). Each arm adds at most one parent encode; the combined selector pays up to two. Parent search dominates actual CPU/memory and has no newly claimed cheap bound. No timing-dependent codec decisions are added.

## G. Adjacent problems excluded

Not semantic summary/QA preservation, binary arithmetic coding, retrained tokenizer vocabulary, counting raw characters instead of tokens, free instructions/dictionaries, source truncation disguised as complete, encoder self-report as wire inversion, package-based inversion as native evidence, fixed-data correctness as correctness on all inputs, benchmark proof success as a compression theorem, source inspection as kernel replay, or a renamed existing mechanism. The explicit and contextual arms share one numeral grammar; they are NOT counted as two independent breakthrough ideas.

## H–I. Mechanism portfolio and structure-specific attacks

Concrete scripts/artifacts are retained even for failed branches. Early screens are independent of final parent scoring; raw proxies are not final wins.

|Approach|Construction/artifact and proved portion|Unresolved interface; cheapest attacker; gap class|
|---|---|---|
|Numeral grammar, explicit|`lexarithmos.ts`, number-unit/independent; render/parse equality on admitted phrases|Header/parent cost and native interpretation; noncanonical and/spacing/case, leading digits; local price gap, native behavioral gap|
|Numeral grammar, contextual|same grammar plus literal-history invariant; memory-unit/independent|Memory discipline and full parent; explicit operand must NOT update state, leading-zero digit lists, stale/missing memory, overflow; local implementation, behavioral reliability unverified|
|Heading-slug elision draft|`rejected/epigraphe.ts`,3035unit checks,113early Python checks|Novelty falsified by reading ENTHYMEME/EPAGOGE; full-price jobs stopped; this branch REJECTED, not production or a new result|
|STOIBAS normal/compact structural stacking|existing module independently screened in portfolio|Whole parent/native cost; malformed/ragged structures/collisions; local applicability, no new primitive claimed|
|PTYCHE paragraph wrapping|existing plan and exact undo screens|Variable wrap widths and hidden whitespace; raw proxy not parent proof; local price/interface gap|
|KENOMA whitespace/indent elision|existing hole/indent plan screens|Whitespace counts and mixed indent boundaries; exact undo before price; local coverage gap|
|HOMOSEMA terminal coalescing|existing plan screens and undo|Parser-state mismatch/Unicode punctuation; local applicability, not numeral grammar|
|DIATHESIS order carrier|existing fold screens|Carrier availability and whole-wire price; no free permutation/table; local representation gap|
|Streaming pretokenizer fold|benchmark-only speed-build and count-gate|16192reference checks/arm plus12whole calls; whitespace tails, surrogate/BOM/long-prefix attacks; ≥10% speed hypothesis falsified, no deployment|

The six-plus mechanism controls are reused existing approaches, not relabeled new codecs. Candidate-specific attacks include prefix digits (`one hundred123`), `_` suffixes, `hundredth`, lowercase/case ambiguity, leading-zero markers, huge operands, invalid Unicode, source-marker collisions, >50koutput expansion, explicit-operand memory poisoning and100-digit bounds. Revisions inherit no trust: the shortened marker syntax reran numeral unit/reference gates; the caret/digitwise extension has its own6033check suite and independent external renderer.

## Negative space and executable modal detector

`modal.py` rejects22 explicit deceptive shapes: payload-only, weak baseline, normalization, self-report, native substitution, training/selection leakage, symbol→token transfer, free header, free runtime, micro→whole promotion, timing contamination, cache leakage, incomplete-as-pass, challenge-as-proof, source-as-replay, stale repair, family-universal, finite-universal, char-as-token, source mismatch, aggregate hiding a lane regression, NOT_RUN-as-pass. Actual strong Pareto acceptance requires a conjunction. The detector consumes evidence flags; it does not infer omissions from arbitrary English.

The particularly tempting modal shortcut is: 'an executable inverse exists, therefore an unassisted LLM will reproduce the source.' Existence of one program establishes nothing about another decoder's output distribution. The detector's nativeSubstitute flag and incomplete Pareto conjunction catch that promotion; native remains NOT_RUN.

## Verification and current result ledger

- Canonical fresh29/29 wires identical to X162,11962tokens;29 reference-price/token-ID checks;21bounded source reads,8unsupported (not29inverse successes). All12speed wires match fresh canonical.
- Explicit numeral unit:43732checks,10000exhaustive values plus1000seeded values; contextual unit6033checks/2000generated sources. Generated cases are tests, not real-world gain evidence.
- Independent verifier uses num2words0.5.14 with commas removed for the exact selected dialect; full accepted claims must also compare parent-decoded bytes to pinned originals. Version and checks are in `number-independent.json`.
- Completed explicit small-source trials lose: full num2words English test850→907; Nigerian-English test451→502. Refused by strict selector, not hidden.
- Whole-stack streaming experiment: aggregate CPU ratio0.9840598, wall0.9772324; JSON wall1.0007627. Gate FAILS. Candidate patch stays benchmark-only. Other encoder jobs were SIGSTOPped and resumed by EXIT trap; light research work occurred during measurements, so not pristine-machine certification. Paused canonical wall times are not speed evidence.
- Initial large inflect baseline hit the800MBV8 heap limit; no receipt was treated as a pass. A separately logged1800MBretry of the same source/configuration also ended in V8OOM. A larger heap is not a claimed speed improvement.

## J. Frontier leaders and highest-information next tests

Inherited category totals: prose5856→3429(word body-token class), ops17278→5580(glyph), code4152→2636(word), other729→317(no tape class). Absolute-saving leaders: apt-real1926,ls-l-real3884,json-pkg499,cue-sheet412. Ops relative leader prices.csv79.73%. These are corpus-local classifications, not globally optimal per-codec ablations.

Next decisive native test: freeze the complete accepted packet and submit it as the sole user message to an independent ordinary chat; preserve raw output and compare exact bytes without trimming/fence removal/normalization. No endpoint here means this remains NOT_RUN. Next practical coverage test: pre-register whole unedited invoicing/accessibility/study documents with mixed numeral spellings, not generated examples, then price against the actual parent and protect ordinary prose/ops lanes. Next speed target: measured parent search/rendering and memory lifetime, not an unmeasured micro-optimization.

## Reproduction

Bundle TS runners via esbuild `--bundle --platform=node --format=esm`. Run number-unit, memory-unit, number-screen and memory-screen; install verifier with `python3 -m pip install --target .cache/x163/verify num2words==0.5.14`, then run number-independent.py. `research-checks.py` reuses the pinned X162Google source and makes new exact set/CNF/charge checks. Frontier scripts reuse X162 and X134leader classification. `speed-build.mjs` creates isolated A/B bundles; count-gate uses a fresh163seed. Run paired timing with competing encoder jobs stopped. Manifests unchanged; generated bundles/cache/profiles ignored.

Completed prospective heldout Ruby source (`markburns/numbers_in_words/spec/numbers_in_words_spec.rb`,4210bytes): contextual675→651,24tokens saved,35sites/20literal-value reuses. Independent complete-wire reconstruction passes. This is a small study/code regression-source gain, not broad prose. The only protected canonical eligibility is code-ts (one contextual site): candidate1018 vs canonical949, so refused. Original default frontier remains unchanged. The smaller Ruby writer file has no plan.

Header specialization removes the undeclared/unused digit-list clause when no ^d is emitted, retaining the exact existing parent wire. Ruby675→662 was the first completed price; its final price is651 (−24,3.56%). Original receipts are archived as `.original-contract.json`. Recontract.ts reprices the complete outer instruction+parent and reruns source readback; prior parent timings are explicitly NOT measurements of this header step. The short-contract reader rejects undeclared ^d; TS and independent Python attack gates rerun. Incumbents beginning with either new envelope are now rejected at the API boundary, preventing ambiguous outer-header dispatch; these reserved-envelope pairs are outside the admitted incumbent domain. Unit gates include targeted prefix-collision attacks.

The unbounded large inflect baseline failed at800MB and1800MB, and the contextual candidate failed at1700MB. No token price exists from those runs. A benchmark-only50000entry ARIADNE run-cost cache is now being investigated separately; it is not a default-route change. Protected12-call A/B yields CPU1.014223/wall1.015858, with regressions and NO evictions on those three inputs; this speed hypothesis also FAILS. Actual-class300158checks cross capacity with3evictions and test miss recomputation/zero values. All12additional wires equal canonical, giving24speed wires in total. Large-source bounded-cache follow-up is separate from the original canonical configuration and cannot inherit an unobserved large-source baseline price.

Candidate receipt `accepted:true` is the inherited trial schema's readback-valid flag, NOT a cheaper-message acceptance. Only `gate.json` applied/selected values establish strict admission. Strong native/runtime Pareto certification remains false. Initial build exited137 under concurrent memory pressure;1200MBisolated retry passed. Final code changes are recompiled before release.

Final bounded-cache large-source status: manually stopped after more than12minutes elapsed (last sampled baseline CPU12m46s,RSS1262624KiB). Baseline still had no receipt; sequential contextual arm never started. This is a resource/time-budget noncompletion, not an OOM or a measured token loss. No large-source gain is claimed.

Whole-parent allocation follow-up: Node --heap-prof on code-ts completed with949tokens, matching the canonical wire hash. `receipts/heap-profile.json` records255785704sampled live allocation bytes, led by fastCount Map.set58720296bytes, scoreRunCostDeltaSlots→countTokens Map.set29360168bytes, and scoreRunCostDeltaSlots23593600bytes. Sampling is not a dominator analysis or peak memory measurement. This points toward global token/chunk caches as well as per-assignment caches; it does not establish which fix improves runtime. Raw profile is ignored. Highest-information next tests remain the651token independent native packet and a controlled global-cache capacity experiment with whole-wire equality plus protected-lane ABBA timing.

Final release validation: TypeScript `tsc --noEmit` exit0; production `npm run build` exit0 (21.41s; CSS parser warnings retained in log). Fresh explicit43732/contextual6033/gate40checks and independent11227checks plus8complete wires pass. Canonical29prices/IDs and21bounded reads pass,8unsupported remain explicit.

Diff hygiene: upstream bash-guide.md contains a literal `=======` example that Git flags as a conflict marker; the pinned fixture is intentionally byte-preserved. Build-log trailing whitespace was stripped for repository hygiene (no exit/status text changed).

X164 follow-up: fresh29-lane replay retained every X163 wire byte-for-byte and
11962total tokens; see `../x164/receipts/frontier-compare.json`. New optional
KRYPTOLYSIS has two niche cipher-document gains, not broad/native certification;
ANTIKLEIS novelty was rejected as existing TAGSTACK. Production frontier unchanged.
