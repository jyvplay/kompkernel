# X188 — SYNAIRESIS: simultaneous macro elimination

**Experimental negative result. Not accepted as a broadly superior codec.**
New unwired module: `src/lib/omega/synairesis.ts`. Production selection and
production tokenizer remain unchanged. Publication/merge is not acceptance.

## A. Objective and actual result

Use the existing parent grammar instead of paying for another routing layer.
Enumerate jointly deleted rules, inline their definitions, and price the whole
message. Email improves **486→485** tokens and vmstat **144→143**. Single
elimination finds neither saving; pairs find both; triples add nothing on
these trials. This is evidence of a small coupled move, not the requested
broad >10-token improvement. No such improvement was found.

## B. Specification and bounds

The input is a complete message with either supported CHIRON reader prefix.
Only ordinary macro rules are admitted; repeat/fill/range/split operators are
refused. Maximum input is 100,000 UTF-16 code units; at most 128 rules. Expand
sizes are checked before the parent decoder, including unused rules. Reserved
spellings are conservatively excluded by refusing any `<|` substring.

The pool is the last 12 rules in reverse order. Enumerate subsets of size
1 through width (width ∈ {1,2,3}); at width 3 this is at most
12+66+220=298 probes. Inline deleted rules later-first into all remaining
rules and the body. Reject oversize intermediates, an empty tape, or a changed
parent decode. Reprice **key+tape+body**, accepting only strict improvements.
One best-improvement move, no iterative fixed point. Non-greedy within the
bounded subset neighborhood, not a globally optimal grammar algorithm.

A conservative work bound is 298 candidate renders/decodes/tokenizations,
each bounded by the configured message/expansion caps; tokenizer runtime is
not a universal constant or a wall-time guarantee. Up to 128 separately
bounded expanded strings may be retained during the admission check.
`trials.json` records actual time and CPU, but runs concurrent with other
work are not speed evidence.

`trial` guarantees **parent-layer equivalence only**. The strict
`synairesisFromFrontier(message,source)` wrapper additionally requires exact
source equality and a saving. It refuses nested layout-bearing parents whose
full inverse this module does not implement. No Unicode normalization occurs.

## C. Fresh canonical replay

All **29 canonical wires identical**, total **11,962 tokens**, freshly rerun
through the existing X164 worker. Each worker asserts original source equality.
Three concurrent workers are execution parallelism, not independent agents or
speed measurements. Fresh trials use these new wires. Canonical category
leaders remain email (prose), ls-l (absolute ops), prices (relative ops), JSON
(code/structured), and cue sheet (other); numeric receipts in `leaders.json`.
The reused body-class census has a historical category taxonomy; final leaders
use the explicit X187 category definition, not that older taxonomy.

## D. Mechanism portfolio and novelty

Freshly executed the existing six-family screen on 37 sources:
DIAMERIS (stable partition), GEITON (lexical edit-reference forest), APOUSIA
(deterministic-context omission), DIADOCHI (predecessor-routed FIFO streams),
SYMFRAZ (context collation of numeric streams), ROPI (weighted deque bijection). The imported implementations are authoritative for their contracts.
10,305 checks, plus 204 DIAMERIS parent-message plans with no parent wins.
These are six **existing** mechanism artifacts, not six new inventions or six
fully optimized paid parent searches. Screen prices do not establish Pareto wins.

DIAGRAPHE already deletes single rules; SYNARMOGE already combines search
axes; APOTOME already tests paired slice changes. SYNAIRESIS is a bounded
macro-elimination search extension. All-stack semantic novelty is **not
established**, and renaming this extension does not make it a new primitive.

## E. Exactness and separate implementation

18 lanes admit the trial grammar. Of these, 16 directly decode to original
source; dpkg and findmnt retain a nested layout instruction. Those two are
layer-only, not source successes. The separate Python reader verifies
48 source-exact width/lane cases and reports six unsupported layout cases.
It is separately implemented code run by this same agent, not independent
personnel. Byte comparison is against files, not model self-report.

502 adversarial checks cover whitespace, CRLF, NUL, combining marks, emoji,
markers, mixed scripts, instruction-looking text, exponential expansion, and
reserved-token spelling refusal. Reference-tokenizer pricing is checked on
accepted generated cases. This does not prove universal malformed-input safety.

## F. Repair resets

1. Added expansion caps before parent decoding, then rebuilt and reran tests.
2. A reserved-special-token attack initially failed: the repository count path
   accepted a spelling refused by the reference tokenizer. Added conservative
   `<|` refusal, rebuilt and reran the affected tests and canonical-wire trials.
3. A stronger source assertion exposed dpkg's nested layout instructions.
   It was not counted as a corrupt macro transform or silently counted as source
   equality. Added a strict source-gated entry point, explicit layer/source
   status, and regression checks rejecting these parents through that wrapper.

Earlier exploratory results are superseded by final regenerated receipts.

## G. False-solution checklist

Reject: (1) omitted key cost; (2) omitted dictionary; (3) pricing a folded body
only; (4) semantic instead of byte equality; (5) layer equality called source
equality; (6) a reference reader called native behavior; (7) a one-token win
called significant; (8) pairwise search called globally optimal; (9) naming
called novelty; (10) inherited receipts called fresh runs; (11) concurrent
worker time called speedup; (12) cache warmup hidden; (13) timeout called loss;
(14) unsupported reader called pass; (15) tokenizer-training gains transferred
to fixed o200k; (16) partial RH result called full proof; (17) downloads called
kernel verification; (18) same-agent Python called independent personnel;
(19) post-repair tests inheriting old trust; (20) canonical frontier regression
hidden by experimental fallback selection.

## H. Speed experiment

Build-only null-prototype chunk-count cache versus production Map. Same
vocabulary and exact string keys; no dropped search arms. Both arms passed
16,192 count checks and 12,124 vector checks. Isolated full-stack ABBA trials
reuse the X187 runner on six lanes; results are in `runtime-summary.json`.
Final B/A CPU ratio **1.028716**, wall ratio **1.036318**; **24 identical wires**.
The change is slower overall, and rejected. The patch is not shipped in
production. Benchmark source: `speed-build.mjs`. Fresh typecheck and application
build passed; `validation.log` records the final repaired correctness rerun.

## I. Native behavior and research limits

Complete candidate messages are in `native/`, status **NOT_RUN**. No separate
basic-chat decoding evaluation was executed; executable inverses do not prove
that requirement. No independent agents, proof kernel, or expert adjudication
was used. Fresh bounded searches are documented in `research.md`; the requested
comprehensive per-lab and deeper proof audit remains incomplete.

## J. Decision and highest-information next test

Reject broad superiority, significant general gain, native-readability proof,
and all-stack novelty claims. Retain this unwired experiment for reproduction.
A useful next test is a **joint deletion-and-remining neighborhood**: deleting
rules exposes literal spans, then mining those spans within the same candidate
may pay where deletion alone does not. Audit it against SYNARMOGE before
implementing; there is a known substantial collision risk. Require fully paid
prose/ops gains and a fresh native-chat test before acceptance. No promise that
this will produce the requested breakthrough.

## Reproduction

`bash bench/x188/validate.sh` rebuilds and reruns correctness checks on recorded
fresh canonical wires. For a new canonical replay, remove only this experiment's
`receipts/frontier.jsonl` contents, build `bench/x164/frontier.ts` to
`bench/x188/frontier.mjs`, then run `python3 bench/x188/frontier-run.py`.
`node bench/x188/speed-build.mjs && python3 bench/x188/runtime-run.py`
repeats the isolated speed trial; do not run other CPU workloads concurrently.
