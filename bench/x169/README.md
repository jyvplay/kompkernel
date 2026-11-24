# X169 — GEFYRA: exact contextual insertion, no accepted Pareto claim

## A. Contract and thresholds

Source domain: UTF-8-stable JavaScript strings of at most50,000 UTF-16 units.
ASCII-space splitting retains empty fields; CR/LF, Unicode, punctuation and
trailing spaces remain literal. Wire/expansion caps enforced; arbitrary binary
and lone surrogates excluded, not normalized. Input bytes are read from original
files and compared with reconstructed bytes. Access: one in-band user message,
no hidden dictionary, skills, training or system instruction. Native decoding is
**NOT_RUN**: no independently administered basic-chat endpoint available.

H+: significant means >10tokens per accepted lane, demonstrated across prose
and ops against the full incumbent; every contract/table/parent token counted;
byte-exact independent reconstruction AND independently administered native
response required. Runtime acceptance: cold whole-stack CPU and elapsed ratios
both <=0.90, no protected-lane regression, identical wire/fidelity, and Requests
completion retained. H−: any byte mismatch, cheaper-raw-only comparison, hidden
cost, failed native behavior, or protected regression defeats the corresponding
claim. H∂: raw-only win, unsupported reader, finite fuzz pass, no endpoint,
noisy timing, or unfinished worker is partial evidence, not success.
Quantifier: reported finite manifest, never all strings or all LLMs. Universal
strict lossless shortening is impossible by injectivity/counting; fallback is
non-regression in price, not a strict gain or a runtime guarantee.

## B. New implementation

`src/lib/omega/gefyra.ts` is new and **unwired**. GEFYRA (Greek bridge) removes a
middle space-delimited field when a pair of retained neighbors triggers its
insertion. First line contains JSON `[left,right,middle]` rules. Reconstruction
visits adjacent ORIGINAL fields once, never recursively inserted fields. No
position list, replacement marker, per-occurrence choice or successor queue.
Unique trigger keys; <=64decoder rows. Encoder screens repeated triples with
fields <=100units, ranks frequency times middle length, keeps32; top8singletons
plus prefixes2/4/8/16/32: at most13groups. Within group deletion is greedy;
whole-group exact inversion rejects newly adjacent interference. Full token
price orders plans. Selector tests direct plans and at most ONE full parent
call; verifies incumbent first; strict-token improvement or exact fallback.

Correctness argument: output is concatenation of each retained original field
and the uniquely specified intervening field. Encoder admits only candidates
whose independently callable inverse equals source. On UTF8-stable strings
that equality implies original UTF8 bytes. This proves the guarded software
construction, not that arbitrary chat models execute its instructions.

Mechanism contrast: DIADOCHI consumes predecessor-routed FIFO successors;
THESI transmits positions; DEIKTIS transmits occurrence choices; BWT permutes;
LEXARITHMOS transmits ranks; ordinary dictionary codecs transmit symbols.
Headers including STOIBAS, KRYPTOLYSIS, SYMFRAZ and the broader repo were searched;
no all-history novelty proof. Classical contextual-grammar ancestry acknowledged.

## C. Fresh correctness and adversaries

`test.ts`:9,676 checks,3,104saved source/fold pairs,38real/heldout sources,
115plans;1,000seeded fuzz sources plus3,279 exhaustive ternary sequences length1–7.
Adversaries: empty fields, literal existing triggers, interacting rules,
nonrecursive insertion, duplicate keys, malformed/oversize rows, expansion cap,
surrogates, Unicode, wrong parent and transport/token-ID checks. `gate.ts`:
40checks re-run final selector against all5saved complete parent trials.
`independent.py`:3,229checks including10complete base/candidate wires,
zero unsupported/mismatches. Independently written Python neighbor loop reads
folded wires and original files, not encoder decoded fields. Parent grammar
reader reused from X159. Neither reader establishes native behavior.

Repairs are not grandfathered: cache policy boundaries freshly tested at
11,999/12,000/12,001UTF16units, astral Unicode byte/unit divergence, forced-large
arm. Three count arms each16,192checks produce identical hash. A previous build
was interrupted under aggregate memory pressure; its partial log is not a pass.

## D. Executable shortcut rejection

`modal.py` rejects27deceptive claim shapes; supplied flags are an explicit
claim-schema test, not an omniscient natural-language auditor. It also exhibits
a concrete exact decoder and a different nondecoding function: existence of
one inverse does not imply another decoder follows it. Covered omissions include
raw/weak baseline, omitted contract, hidden lookup, semantic-only fidelity,
program/native substitution, niche-only gain, unmeasured speed, unverifiable
proof, adaptive thresholds, and local-to-universal leaps. Actual Pareto claim
is rejected; honest bounded statements remain allowed.

## E. Six mechanism-distinct branches

All constructions executed via portfolio.ts on34sources. Detailed plan counts
and raw-win counts are in receipts/portfolio-summary.json. Raw wins are not
incumbent wins.

| Branch/artifact | Construction/proved part | Gap; falsifier/adversary |
|---|---|---|
| GEFYRA/new module | two-neighbor gap insertion; frozen-pair exact inverse | parent price/native; spontaneous trigger/overlap |
| DEIKTIS | occurrence choices conditioned on contexts; inverse checked | choice tape cost/native; alternating choices |
| BWT/x165 block-sort | stable cyclic block permutation + index; inverse checked | order/index and contract price; periodic text |
| COLEX | lexical dictionary candidate screen | this run prices only, no new inverse proof; singleton vocabulary |
| LEXARITHMOS | finite lexical enumeration/rank planner | no admissible plans on these sources; mixed punctuation |
| recency/portfolio.ts | move-to-front word references; exact local inverse | ref syntax/contract cost and native; all unique words |

GEFYRA raw wins: ls-l-real5194→4988, ps-aux-real3054→3050,
ps-ef1144→1059. The4token change does not meet significance. No prose raw win.
Five FULL parent trials (base→candidate): email486→553, code-ts949→1027,
ps-ef296→366, ps-real381→459, json-pkg653→718. All reject candidate and retain
base exactly. Candidate cost includes GEFYRA instruction plus complete parent.
No large varied-setting incumbent improvement found; no shipping promotion.

## F. Runtime and memory

`cache-build.mjs`: experimental cold-process D selects original Maps below
12,000UTF16units, otherwise X168C bounded/detached key caches. Both A/D pay initial
file read. Forced-large switch supports count testing. Not a general mixed-input
server policy, not a hard V8heap guarantee. Uses existing X164 speed worker.

ADDA crossover,3protected lanes,12identical wires; competing replay processes
paused/resumed during timing. D/A CPU1.0216496272, wall1.0162151016.
KB CPU1.04126/wall1.01697; JSON1.00850/1.01529; ps1.03121/1.01709.
**Rejected**: no significant speedup and all protected lanes regress in this
sample. Since small-input algorithms are unchanged this also exposes timing
variation; it does not prove a universal slowdown. Requests outcome recorded
separately when completed. A baseline completion was not remeasured; no speedup
may be inferred from historical OOM. CPU includes process work, elapsed includes
scheduling; the two are never interchanged. Runtime budget is empirical; parent
search under deterministic mode has no hard wall-time bound.

## G–H. Frontier, leaders and outside research

Fresh canonical replay uses unchanged29-lane manifest and X164 encoder bundle;
comparison, source/wire hashes, prices, independent reads and category leaders
are recorded in receipts after completion. Unsupported parent layouts remain
explicit, not counted as verified. Category labels inherited from X134 are not
per-codec ablations or globally optimal leaders. See `research.md` for fresh
publisher/source retrievals and individual OpenAI, Anthropic, Google DeepMind,
DoubleAI, Harmonic and ByteDance evaluations. 10,003local arithmetic/premise
checks are not external proof validation. Lean/lake/Rocq not installed.

## I. Reproduce

Install with npm ci; bundle TS harnesses with esbuild --bundle --platform=node
--format=esm. Generated bundles ignored. Run test, portfolio, trial, gate;
Python independent and modal. cache-build generates A/D speed/count/policy
workers. runtime-run accepts PIDs to pause while measuring ADDA (do not kill it
without resuming them). compare-frontier requires exactly29finished rows.
Reuse X134 leaders.ts and X159 independent parent reader. Native handoff script
prepares3heldout prompts and verifies unmodified external responses by bytes/hash;
no replies were supplied, and no model was simulated.

## J. Decision and next falsifier

New codec implemented with exact software evidence; requested broad Pareto and
native acceptance **not met**. D is not promoted. Next highest-information tests:
independently administered basic-chat decoding of saved prompts, and a genuinely
larger isolated crossover with a policy that improves measured hot allocation
rather than paying an input pre-read for unchanged small-input algorithms.
Record merge as delivery of experiments, not scientific acceptance. No result
is fabricated to satisfy the instruction to continue until a gain.


### Final completed replay receipts

Canonical:29/29identical X168 wires,11,962tokens. Token prices/ID transports
pass29; bounded TypeScript reader21exact/8unsupported. Separate Python reader:
21exact,3explicit unsupported layouts,**5source-byte mismatches**. The initial
assertion halted at markdown-table; repaired *reporting* now preserves each
mismatch rather than calling it unsupported. This is not a repaired inverse or
universal byte certification. Every mismatch belongs to the unchanged incumbent
wire, not a selected GEFYRA candidate. Five complete GEFYRA parent trials remain
independently exact. No result from a failed parser is accepted as native evidence.

Fresh category aggregates (raw→frontier/body token class leader):
PROSE5856→3429/word; OPS/TABULAR17278→5580/glyph;
CODE/STRUCT4152→2636/word; OTHER729→317/no tape leader.
Local largest absolute and relative savings are separately recorded in
receipts/local-leaders.json; not per-codec or global-optimal claims.

Requests D **completed**,3539tokens,536,514.033CPUms,1,271,292.163elapsed ms,
511,112KiB peak RSS with900MBV8heap and600CPU-second shell limit. Elapsed includes
explicit SIGSTOP pauses, competing workers, and build memory contention: it is
NOT an isolated speed baseline. Python inverse exactly recovers19,213source
bytes, SHA2565914de6a636d91ca2ca3a0df55ef8e57359e3fe364fb7176fdee60d231fe2e9f.
TypeScript bounded reader reports unsupported grammar; native NOT_RUN. D retains
completion but neither general memory guarantee nor speed superiority follows.

Build logistics: first build was killed after aggregate resident memory approached
4GiB while replay workers were resident. Its log retained. Final build runs alone
after all workers exited; final outcome is in build-final.log. TypeScript noEmit
completed with empty diagnostic log. This is a resource scheduling failure, not
an invented successful first execution.

Final isolated `npm run build`: exit0 (build-final.log); existing CSS warnings retained.
