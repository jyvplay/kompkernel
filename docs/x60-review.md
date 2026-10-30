# X60 research record — EIRMOS (codec 224)

## Runtime honesty / available verification

Executed tools: Node.js 22, esbuild, TypeScript `tsc --noEmit`, CPython 3 (stdlib twin), the repository's o200k token counter and parent codecs, local Git/gh, and Arena live web search. No independent model agents, theorem prover, simulator, external database, or expert reviewer was available or used. Full-gate and speed claims are bound to local receipts; web-reported mathematics is attributed as lab/reporter claims, not certified here. The GitHub dataset fetch returned one public demo fixture, not live financial records.

## A. Formal model

### A1. Admissible objects

An input is a finite JavaScript string whose UTF-8-decoded textual contents are the exact source, accepted as one rectangular delimited table with header plus at least 12 data rows. EIRMOS currently considers comma/tab/semicolon/pipe, at most 400,000 UTF-16 code units, 20,000 data rows, 64 columns, ≤4 dropped targets, ≤3 exception cells per dropped target. Candidate law: for every non-exception data row, target field `T_i` equals a concatenation of literal strings and transformed same-row fields `F_{j,i}`; each source occurs as a template segment, with 1–3 source-field segments, transforms from a finite explicit set. It preserves row order, field values, delimiter, quote-field raw text for retained cells, and exact LF/CRLF/no-final-newline convention through the reducer/restore.

### A2. Information / access

The encoder may inspect the entire source table and local repository assets. The receiver gets only one basic chat message containing the parent codec's in-band instructions/wire, EIRMOS's natural-language contract, and the reduced text. No hidden prompt, `skills.md`, external parser, lookup table, source file, network, or side channel is admitted. The receiver may use ordinary language reasoning and string concatenation. The CPython twin consumes the same contract and reduced text as an independent executable check; it is not the receiver model.

### A3. Resource counted

Primary objective is total o200k token count of the complete single-chat message, including parent decoder instructions and EIRMOS clause, not raw-byte ratio, transformed-only saving, or token count of the reduced table alone. Exact fidelity is equality of the reconstructed JS string to input string (therefore preserving line terminators and every character); tolerance = **zero bytes / zero characters**. Runtime is wall-clock seconds on the supplied sandbox, CPU-bound; the search meter counts sampled source checks and full-row template checks, not every string allocation or segmentation branch. Parent/full-frontier encodes have no wrapper-wide wall-time cap.

### A4. Success / failure quantifiers

For the fixed measured lane `x` and codec implementation `C`, member success is: `C(x)` terminates, reports applied and exact, and `M_C(x) < M_P(x)` for the tested exact parent `P`, where both counts include each codec's own decoder clause. Full-frontier success is stronger: `C(x)` terminates and byte-decodes exactly, and `M_C(x) < min_{p∈F(x)} M_p(x)` for the runtime parent set plus SIBLING-TEMPLATE actually measured on the **same source**. Generalization is not inferred: claims quantify only over the named fixture / red-team cases. Repository novelty is narrower: no earlier table codec composes a per-slot substring/case transform *inside* a multi-source concatenation template for delimited-column elision. SYLLOGISMOS already owns raw literal+field concatenation (up to two sources), whole-field case, and split; PARADEIGMA owns JSON sibling templates. This is not a global invention claim, and plain `first + space + last` lane wins do not themselves establish the novel operator.

### A5. Parameter regime / boundaries

Token units: o200k tokens. Row / column / work limits above. Text comparison is exact; no Unicode normalization. String `first2`/`first3`/`initial` mean Unicode code points, not UTF-16 code units. Case transforms are accepted only where non-ASCII letters are absent, avoiding locale / Unicode case-fold ambiguity. Literals cannot contain double quote, backslash, CR, or LF. Exception values cannot contain contract separators/quotes/brackets/line breaks. The decoder twin tests astral code points. This is not a compressed arbitrary-binary file format.

### A6. Adjacent problems not substituted

1. Lossy schema cleaning or value normalization.
2. Approximate functional dependencies accepted by a confidence score.
3. Compression that requires an external dictionary/schema/model.
4. A two-message or prompt-plus-file protocol.
5. Small raw-wire savings excluding decoder instructions.
6. Parent-only comparison rather than same-source frontier.
7. A local string transform that changes bytes (case-folding, Unicode normalization).
8. Inference from names or semantics without exact row verification.
9. Sorting/reordering records and then assuming the original order.
10. Full-name splitting / name understanding (not the inverse of exact concatenation).
11. A finite map over low-cardinality values (SYLLOGISMOS lookup's territory).
12. Exact copies/duplicate columns (APOGRAPHE's territory).
13. Numeric arithmetic / rational / rank / recurrence laws (existing codecs).
14. Database normalization / relational factorization that changes the table shape.
15. Ordinary PBE as an interactive data-cleaning UI (not a one-chat codec).
16. Generative model reconstruction from learned world knowledge rather than in-band rule.
17. Throughput-only gains from a faster planner that loses fidelity.
18. A claim that one demo dataset proves prevalence in production CRM exports.

## B. Outcome space (not prematurely collapsed)

- **H+ (achievable):** the repo-new per-slot transform composition is exercised by generated `username = lowercase-initial(first) + lowercase(last)`, which the previous SYLLOGISMOS planner refuses and EIRMOS fully gates exact at **563 < 775**. Separately, the old plain-concat relation wins member-grade on public OpenPowerlifting records (AKO2 8,620 → 8,175, exact). This separates proof of the new operator from evidence of useful economics on an authentic public lane.
- **H− (failure on an instance):** if EIRMOS candidate ≥ source frontier, it must fall back; no theorem of universal impossibility follows. X59's fact/dimension normalization was an empirical negative (AKO2 18,250 → 18,707 tokens on its tested Superstore lane).
- **H∂ (boundary-dependent):** the generated full-name red-team case clears the complete TAGSTACK+SIBLING gate (629 < 1,017); the 193-KiB demo fixture exhausted Node's default heap and the 124-row public real-record gate exceeded 2,500 s. Whether a sufficiently narrow real-world lane clears full frontier, and whether production CRM exports have these exact laws, remains unmeasured. Economics depend on target length/cardinality and contract amortization.

## C. Frontier and exact open interface

Imported in-repository frontier: measured exact parents (AKOLOUTHIA-2, DAEDALUS, APOGRAPHE as the implementation selects) plus full TAGSTACK and SIBLING-TEMPLATE on the original source. The X60 fixed-suite frontier repeat is metrics.tsv, default environment/no OMEGA_DET, same six parent checks as #11. Its result remains 210 tokens (AKO2), exact, costs 237/236/210/237/237/237, repeatMatchesPreviousGate=true. This neither proves nor disputes the new clients lane.

Relevant external genus: FlashFill / BlinkFill synthesize concatenations of substring transforms and literals from examples; BlinkFill's 2016 VLDB paper reports a PBE system for cell filling. It is close mechanism prior art. It does not itself establish this repo's whole-message codec economics, byte-preserving removal/reinsertion of a source column, or single-chat contract. Direct paper citation for EIRMOS's exact realization: none.

**Open interface:** can the new mixed per-slot transform both occur and save enough *on a real source* that the best exact reduced parent plus rule is below every measured source frontier? A smaller transformed table is insufficient. Generated full-frontier gates pass for raw concat (629 < 1,017) and the novel mixed-transform username case (563 < 775); the actual public-record frontier attempt timed out at 2,500 s. The remaining boundary is real-world prevalence/runtime economics, not reconstruction exactness.

## D. Negative space — look-alikes and the detector

Modal shortcut: notice `target contains source` on a few sampled rows, assume concatenation law, remove target. This fails on near-matching text, exception-heavy patterns, semantic identity transforms, and ambiguous delimiters. Detector: generate a candidate only from seed segmentation, then evaluate exact equality for **every row**; count all mismatches, refuse above three, and restore exact full text before any token gate. A post-patch red-team test attacks semantic copies disguised as lowercase/uppercase/capfirst.

At least 15 non-solutions, with a falsifier for each:

| look-alike | why it fails contract | detector / artifact |
|---|---|---|
| One or two rows happen to concatenate | finite sample does not entail all rows | `full-name` + `random-target`; exhaustive verifier |
| Uppercase/lowercase is identity on the actual values | duplicate disguised as transform, not new information | `copy-disguise-upper`, `copy-disguise-capfirst` |
| First row is an exception | candidate generation can miss true rule if the first sample is atypical | `exception-first-row` |
| More than three anomalies | exception list becomes too costly / capped | `too-many-exceptions` |
| Pure field copy | not novel and belongs to duplicate-column codec | `pure-copy` |
| Low-cardinality one-source transform | finite mapping is shorter and already owned by SYLLOGISMOS | `upper-lowcard` |
| High-cardinality transform | may be legitimate, still has to pass economics | `upper-highcard` |
| Empty source fields | segment matching can be ambiguous or omit a piece | `empty-source-cells` |
| Quoted comma in source | raw-splitting would alter field boundaries | `quoted-source-comma` |
| Comma in target text | unquoted CSV invalid; decoder must quote/re-escape | `sortable-quoted`, `city-state` |
| Astral symbols in `first2` | UTF-16 slicing can split a surrogate pair unlike ordinary reader semantics | `astral-first2` + `eirmosApplyTransform` direct check + hand-authored CPython contract |
| Non-ASCII case conversion | model/runtime locale and Unicode conventions can diverge | `nonascii-case`, planner refuses |
| Overlapping repeated substrings | segmentation has multiple plausible alignments | `overlap-trap`, all-row verifier |
| Wrong insertion position | dropped target reinserted at wrong index corrupts every row | `target-first-col` |
| Multiple drops with dependency cycle | one removed target becomes another's source | source-protection / cycle prevention; `two-drops` |
| CRLF / TSV / absent final newline | parser/renderer normalizes a byte-level detail | `tsv-crlf`, `no-trailing-nl` |
| Tiny table | rule header costs more than saved data | `tiny` |
| Parent compresses the original better | transform-level gain is irrelevant | EIRMOS source precheck and same-source frontier gate |
| Malformed or unsupported contract syntax | test-time round-trip alone is not a natural-language guarantee | independent CPython twin over applied contracts |

## E. Mechanism portfolio (separate hypotheses; one accepted)

1. **Per-slot transformed concatenation (EIRMOS).** Construction: seed segmentation into literals/source transforms; all-row exact validation. Artifact: `src/lib/omega/eirmos.ts`, red team, `mechanism-delta.json`, `fullgate-username.json`, independent Python twin. Proved portion: planner compiles; `lowercase-initial(first) + lowercase(last)` is not representable by the old SYLLOGISMOS concat/case rules as one candidate (SYLLOGISMOS planner refuses), while EIRMOS is byte-exact and clears the strict full-source frontier **563 < 775**. Separate plain-concat member wins on a published demo fixture and public OpenPowerlifting data. Red team: 19 planner-applied cases + one hand-authored astral contract decoded byte-exactly in CPython; full generated suite 29/29 checks. Unresolved: no non-synthetic lane has yet shown this novel transform composition (real measured lane exercises the old concat genus); OpenPowerlifting full frontier timeout-dead at 2,500 s. Cheapest next falsification: find a real public data export with a high-value mixed string transform (username/email/code) and test exactness + full frontier. Gap: full-frontier is local/measurement gap; general prevalence remains equivalent to new corpus collection.
2. **Adjacent-row prefix-delta chain.** Construction: encode first value verbatim, then common-prefix code-point count + suffix for each next target; restore in original row order. Artifact/result: `bench/x60/mechanism-portfolio.ts` and `mechanism-portfolio.json`; exact inverse, **81,247 sketch tokens** (reduced table + clause + payload) vs 79,127 raw source. Proved portion: decoder round-trip; falsified as a raw-table sketch here (+2,120), before even parent cost. Unresolved: sorted inputs could make prefixes longer. Cheapest next falsification: same estimator on sorted and shuffled rows, then full parent gate. Gap: lane-local; achieving generic wins requires ordering-aware policies without reordering source rows.
3. **Dictionary plus occurrence indices for derived target.** Construction: ship distinct values once, replace target occurrences by indices. Artifact: same scout script, exact reconstruct and token costs. Proved portion: map/inverse exact. Artifact/result: same scout receipt gives **83,330 sketch tokens**, vs 79,127 raw; falsified here (+4,203). High-cardinality target has 1,024 distinct values in 1,026 rows, so the dictionary repeats nearly all target bytes and adds indices. Cheapest falsification: this exact count; reject on this lane. Gap: local economics.
4. **Common-affix extraction / shared substring palette.** Construction: mine substrings appearing in ≥k target strings, ship a palette and per-row segment IDs. Artifact: same scout script and exact inverse. Proved portion: deterministic reconstruction if segments are explicit. Artifact/result: **79,316 sketch tokens** (+189) with exact inverse; falsified on this fixture. The selected common prefix is empty; any common trailing text is too short to amortize. Cheapest falsification: exact whole-payload count in the scout. Gap: local economics.
5. **Common-substring palette.** Construction: mine one repeated 2–8-code-point substring, replace it with a reserved marker, and ship the inverse map. Artifact/result: scout reports exact inverse, **81,391 sketch tokens** (+2,264 vs raw) on the finance fixture; falsified on this lane. Unresolved: other documents may contain much more frequent repeated motifs. Cheapest falsification: check marker absence, all-row exact inverse, then tokenize map + full payload. Gap: local economics.
6. **Table dimension/fact normalization.** Construction: intern repeated categorical values into a dimension table and replace cells by IDs. Artifact: X59 Superstore factorization experiment documented in `docs/codecs.md`; token receipt: AKOLOUTHIA-2 18,250 original vs 18,707 factored. Proved portion: exact inverse can restore normalized table; measured parent economics are negative on that lane. Unresolved: other high-cardinality or repeated-entity lanes may differ. Cheapest falsification: same-source parent pricing after factoring. Gap: local/fixture-specific.
7. **Generic dictionary/grammar parent (DAEDALUS / AKOLOUTHIA-2).** Construction: infer repeated spans/substrings without a semantic rule. Artifact: measured member receipts and all registry parent codecs; on the finance demo lane, DAEDALUS source 43,207 and AKO2 source 41,565 exact. Proved portion: captures repeated textual structure and exact decoder. Unresolved interface: near-unique derived values remain costly, whereas EIRMOS sends one algebraic string law. Cheapest falsification: compare the same source with the whole frontier (not raw bytes). Gap: this is the original codec frontier, not a compression theorem.

## F. Artifacts / executable results

- `src/lib/omega/eirmos.ts` — production planner, contract, restore, measured gate.
- `src/lib/omega/registry.ts` — codec 224 registration.
- `bench/x60/redteam/gen.ts`, `run.ts`, `py-decode.py` — seeded TS plan suite and independent Python twin.
- `bench/x60/receipts/redteam-final.json`, `twin-final.txt`, `member-clients-det.json`, `frontier-repeat-x60.json`, `profile-metrics-parents.jsonl` — machine-readable measurements.
- `bench/x60/fullgate-clients.ts`, `fullgate-openpowerlifting.ts`, `fullgate-redteam-one.ts`, `fullgate-username.ts`, and receipts — default-heap OOM on large demo, 2,500 s no-result on real records, generated full-frontier PASSes at 629 < 1,017 and 563 < 775.

## G. Second-order adversary per candidate

- **EIRMOS**: adversary supplies an exception on the first row, case transform that is identity on all current values, empty sources, overlapping repeated substrings, quote/comma/newline literals, same target name repeated, a field reference that becomes ambiguous after removal, four interacting drops, target depending on another dropped target, or astral characters. Repairs: union-seed candidates; semantic identity rejection; safe literal/exception constraints; unique header ref or positional field index; source-protection; Unicode-codepoint transform; exhaustive restore. Attacks re-run in red team + independent twin.
- **Prefix delta**: adversary shuffles rows (prefix locality disappears), alternates unrelated names (prefix=0), or creates long runs of shared prefix but expensive indices. Falsifier: cost on original row order and shuffled rows.
- **Dictionary/index**: adversary makes all targets unique and IDs longer than values, or values collide after canonicalization. Falsifier: exact full mapping with unique IDs and full contract priced.
- **Affix palette**: adversary injects a common substring at a frequency too low to amortize, makes overlapping matches, or requires precedence rules. Falsifier: greedy/ambiguous overlap fixture and full palette costs.
- **Dimension normalization**: adversary uses all-unique categories and makes join keys expensive; row order and null/quote restoration must remain exact. Falsifier: restore hash and full parent pricing.
- **Generic parent**: adversary input with no repetitions; parent must fall back to identity, not hallucinate. Already enforced by parent codecs' exact decoder contracts.

## H. Independent verification / downgrade

Compiler: `npx tsc --noEmit` passes. Executable: esbuild bundles the fixtures and runners. Independent implementation: CPython stdlib re-parses one-chat contract and reconstitutes output byte-for-byte (fixture and 19 contract cases). This does not prove that every uninstrumented LLM follows the contract; direct model decoding was not available as an external verifier. Measured frontier repeat confirms exact benchmark output and same previous gate. Generated full-gate receipts confirm end-to-end exact frontier passes for both a raw-concat case and the new mixed-transform username case; public real-record gate timed out and remains member-grade. No Lean/theorem-prover proof applies to the codec's search or compression claim.

## I. Repairs and regression gates

Two attacks found real flaws: lowercase-as-identity was admitted as a disguised copy, and a first-seed exception could suppress a true template. The implementation was repaired; new `copy-disguise-upper`, `copy-disguise-capfirst`, and `exception-first-row` cases pass. A code-point-vs-UTF-16 audit then found transform boundary risk; `first2`/`initial` now use Unicode code points, with a new astral test and independently decoded manual contract. Repair trust is not inherited; full TypeScript/red-team/twin checks are rerun after changes.

## J. Stop decision

Current strongest claim: EIRMOS is shipped and registered; exact member-grade Pareto win on both the named generated-data demo fixture and a separate 124-row public OpenPowerlifting record table containing actual published lifter results (raw records not vendored; AGPL source URLs + reproducible fetch script). Its implementation contains a strict full-frontier acceptance/fallback gate. Generated frontier-grade is verified; do **not** say the real OpenPowerlifting source frontier is beaten (`fullgate-openpowerlifting` hit the configured 2,500 s timeout with no result). Keep that lane member-grade. Next highest-information test: find a smaller, narrower real public table with similarly valuable exact derived string field and a tractable frontier measurement; then seek a larger non-synthetic public business export with explicit redistribution terms. The X60 DIASTEMA Set-membership change has exact-wire parity and a measured 6→5 ms median planner-only improvement on `sysctl-proc`, but complete-codec metrics A/B was 149.6→150.1 s (noise-level, no speedup). Treat it as an asymptotic cleanup, not a significant whole-stack speed result; the X59 ARIADNE/CHIRON gains remain the stack's accepted speed evidence.

## Live research records (new X60 searches)

All statements below are summaries of the linked publishers' claims; no source proof was cloned or machine-checked in this workspace.

- OpenAI, *On the Navier–Stokes Millennium Prize Problem* (Sep 8, 2026), *Sharing AI progress in mathematics* (Oct 6), and *Working with academic communities…* (Oct 26): the September post claims a Lean-formalized finite-time singularity under a stated smooth forcing/finite-energy setup and reports very large agent compute; I did not inspect the statement against the complete Clay problem or replay its Lean build. The October releases include Lean artifacts for many claims; the Oct 26 post reports ETH falsity and all-dimensional local smoothing with Kakeya/restriction implications, while describing QCD/Yang–Mills formalization/release status separately. Claims have not been adjudicated here; the lab distinguishes formalization, expert discussion, and public release. No textual codec primitive follows from a theorem claim. Sources: https://openai.com/index/navier-stokes-solution/, https://openai.com/index/sharing-ai-progress-in-mathematics/, and https://openai.com/index/building-scientific-understanding-with-academic-communities/.
- Anthropic, *Formalizing Fermat's Last Theorem* (Sep 4, 2026): reports a Lean formalization following a simplified existing proof route, with 13M lines and roughly 29.5K intermediate theorems used in the final result; this is formalization-scale evidence, not a new proof of the classical theorem in the ordinary sense. *Riemann zeta* (Aug 10, 2026) reports a 67.2% lower bound from combining prior results, with a concise expert note and Lean comparator; the proof itself was not read here. This builds on the earlier-turn callout and adds primary-source detail, without compression transfer. Sources: https://www.anthropic.com/research/formalizing-fermats-last-theorem and https://www.anthropic.com/research/riemann-zeta.
- Google DeepMind: AlphaProof + AlphaGeometry 2 reported four of six IMO 2024 problems at silver level using formal systems; Gemini Deep Think's 2025 IMO gold result is reported as natural-language end-to-end; the 2026 FirstProof/Aletheia article says a research agent can generate, check, revise, with validation still a bottleneck. Distinguish competitions from research problems, and lab report from independent theorem audit. No compression transfer. Sources: https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/; https://deepmind.google/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/; https://deepmind.google/public-policy/conjecture-machines-ai-agents-and-the-new-validation-bottleneck-in-science/.
- Meta: HTPS describes Lean-coupled proof search; the current AutoformBench page reports 341 advanced formalization tasks sourced from 24 sources with Lean-experienced mathematicians auditing the statements. Fresh primary Meta pages list the Oct 2, 2026 paper *Semiabelian Groups Need Not Be Monomial* (counterexample group of order 384, an explicit disproof) and *String Two-Point Function = Height Function on a Curve* (a p-adic local-height / boundary-propagator equivalence); both list human authors, and the latter points to a statement of AI use. The broader claim that Meta released six AI-assisted math papers this date was found in secondary reporting; I did not establish the AI contribution or independently check the papers from the Meta abstracts alone. No theorem proof was audited here. Sources: https://ai.meta.com/research/publications/semiabelian-groups-need-not-be-monomial/ and https://ai.meta.com/research/publications/string-two-point-function-height-function-on-a-curve/. Sources: https://ai.meta.com/blog/ai-math-theorem-proving/ and https://ai.meta.com/research/publications/autoformbench-a-lean-formalization-benchmark-for-advanced-mathematics/.
- DeepSeek: official V3.2/V4 material reports contest/math performance (IMO/CMO/ICPC/IOI benchmark-level claims), but this search located no specific new machine-checked open-theorem proof; do not call a benchmark score a proof. Source: https://www.deepseek.com/en/news/v4-preview/.
- xAI: official Grok material reports math benchmark performance including AIME; this search found no specific newly solved theorem or formal proof artifact. Therefore no proof claim and no transfer. Source: https://x.ai/news/grok-3.
- Fresh literature: Singh, BlinkFill (VLDB 2016), directly supports the string-transformation synthesis genus and weakens any global novelty claim; FlashFill (2011) is a useful predecessor but outside the requested 10-year band. Le et al., *Interactive Program Synthesis* (arXiv:1703.03539, 2017), studies feedback/interaction for synthesis rather than automatic compression. Bille et al., *Dynamic Relative Compression, Dynamic Partial Sums, and Substring Concatenation* (arXiv:1504.07851, revised 2016), studies data structures for relative compression and concatenation, not a model-readable table law. A 2026 arXiv LLM database-normalization benchmark examines FD discovery/schema normalization; it does not provide byte-exact string-concat column elision. Sources: https://rishabhmit.bitbucket.io/papers/vldb16.pdf, https://arxiv.org/abs/1703.03539, https://arxiv.org/abs/1504.07851, and https://arxiv.org/html/2609.11141.
