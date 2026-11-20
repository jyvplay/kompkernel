# X138 A–J evidence ledger

## A–B. Formal model / admissible objects

Sources are finite valid UTF-8 byte strings interpreted as text. The shipped
baseline F is the exact TAGSTACK configuration in `frontier.ts`: OMEGA_DET=1,
OMEGA_NO_MEMO=1, OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0,
OMEGA_NO_OROTHESIA=1, o200k_base, other defaults. Experimental X134–X138
modules are not silently substituted for F. Whole single-chat messages include
all instructions/data; decoding means byte-exact output, zero tolerance.

SYNAPHE accepts only the two explicitly recognized simple grammar contracts,
acyclic CHIRON dictionaries without repeat/fill/range/list operators, <=128
rules, expanded rule length <=2,000 UTF-16 units, message <=100,000 units and
decoded target <=20,000 units without surrogates. The reader caps output at
100,000 units. Unsupported inputs return no candidate, not a lossy version.
Source containing literal macro glyphs is refused. This is not arbitrary Unicode
normalization or visual equivalence. Existing STELI composed inverses are
verified separately where relevant.

## C–D. Information/access and counted resources

Encoder sees source and installed tokenizer. Native decoder may see only the
one basic user message: no source, skills.md, extra system instructions, tools,
previous turns, external reference or custom vocabulary. Program verifier may
compare source afterward; this does not confer information on the native reader.
Count all emitted tokens with installed reference o200k_base. Record encoder
milliseconds including rejected trials; do not infer CPU improvement from clock
variation when other processes overlap. Search and dictionary/header costs are
not free. No decoding behavior is inferred from the encoder's `decoded` field.

Actual systems: shell/git/gh, Node, esbuild, TypeScript, Python, web search/page
retrieval. Independent agents: none. Simulator: none. Theorem prover: none run;
Lean/lake not found by command lookup. Model endpoint/blind evaluator: none
available. No database benchmark, GPU system or external expert was used.

## E. Success predicate and quantifier order

For a prospectively fixed corpus C, a fixed encoder E and message-only decoder D:
for every x in C, D(E(x))=x in bytes and T(E(x))<=T(F(x)); there exists a real
x in C saving >10 tokens. A declared measured runtime objective must also be
non-regressing with at least one strict improvement if Pareto in speed is claimed.
For a declared native model/version M, a separately blinded trial must show its
one-message response equals x. Universal claims over all texts or all models
are not licensed by finite observations. E may not be chosen anew after each
heldout answer. No commit/default integration/merge as a winner before all
mandatory gates pass.

## F–G. Boundaries / nearby problems that are not substitutes

Not bytes instead of tokens; not visual/semantic similarity instead of original
bytes; not a tool-enabled decoder instead of native chat; not old-codec wins
renamed as new; not raw transform savings before parent/header costs; not a
smaller dictionary without a cheaper complete message; not a repaired reader
that receives the original; not a tokenizer microbenchmark called stack speed;
not best-known universal/terminal compression from a finite search; not proof
of formalized statements equated with fidelity to the informal question.

## H. H+, H−, H∂ and thresholds

H+: a new representation can improve this finite frontier. Evidence required:
strict full-wire gain, independently reconstructed bytes, native behavior and
honest runtime. No X138 candidate meets this conjunction.
H−: all-input strict shortening is impossible under fixed finite-alphabet
injectivity by counting. That theorem does not decide finite-corpus existence.
Finite failed trials reject only the measured family/budget.
H∂: behavior, input domain, cost conventions and model version change the
answer. Native verification remains open, as does an exhaustive semantic
all-codec novelty audit. Inventory coverage is not proof of non-equivalence.

## C. Frontier / imported results

Fresh baseline is separately regenerated; final totals in README/summary.
X137 KREMA's 831-token Node message and X136 PTYCHE's 608-token KB message
remain unwired experimental comparators, not shipped configurations. New
live-paper hypotheses and limits are restated in `research.md`. No external
math theorem was compiled or used to certify a codec-speed conclusion.

## D. Negative space and modal-shortcut detector

Detector tuple: (quantifier, object, decoder, evidence mode, resource boundary).
Changing any coordinate invalidates promotion. Executable semantic collision
in `controls.ts` rejects the modal shortcut: 'the same meaning can be
reconstructed' does not entail 'the same bytes are reproduced'.

False solution shapes and their detectors:
1. Raw-token win → complete-wire reference count.
2. Byte-ratio win → o200k count, not byte length.
3. Semantic equivalence → two distinct strings with one normalized wire.
4. Encoder self-report → emitted-message Python inverse.
5. Program inverse ⇒ native response → explicit NOT RUN gate.
6. More macro edges ⇒ smaller message → actual count after every trial.
7. Overlap deletes genuine repeated text → full-overlap/no-progress attacks.
8. Longest prefix means any prefix → maximality exhaustive binary-string checks.
9. Unknown parent instructions discarded → patched refusal and targeted attack.
10. Same intermediate string ⇒ composed source without inverse → STELI source check.
11. Same dictionary plus better search called new operator → ordinary-concat control.
12. Better asymptotics ⇒ finite stack speed → no timing claim without complete A/B.
13. Standalone extension timing excludes parent → baseline+extension separated.
14. Failed candidate runtime omitted → all rejection timings retained.
15. Heldout same Node help ⇒ broad transfer → newly frozen curl/git-diff/tar sources.
16. Existing case factoring renamed → MORPH audit and measured control.
17. Lexical inventory ⇒ all-codec semantic novelty → explicitly incomplete.
18. Formal statement file ⇒ proof checked → EndStatement explicitly proves nothing.
19. Integer word-RAM theorem ⇒ real/bit complexity → quantifier/domain audit.
20. Conditional girth algebra ⇒ full graph theorem → hypotheses remain unchecked.
21. Construction-unit saving ⇒ everyday workload gain → attacks labeled synthetic.
22. Repaired code inherits tests → rebuild/reprice/independent inverse/compiler rerun.
23. Offline selector ⇒ free or default integration → unwired status and receipts.
24. Requested merge ⇒ authorization to waive gates → PR stays draft.

## E–F. Mechanism portfolio with concrete artifacts

These are distinct mechanisms, not six names for SYNAPHE; existing code is reused
as controls rather than falsely advertised as six new inventions.

| Approach | Construction / artifact | Established portion | Exact gap / cheapest falsifier | Locality |
|---|---|---|---|---|
| Overlap macros | maximal output-suffix / expansion-prefix cancellation; synaphe.ts + probe | executable inverse, exact tested sources | no price win; cheapest complete-wire trial already falsifies these candidates | local search/dictionary, original native gate still open |
| Ordinary straight-line grammar | same dictionary/search without overlap; probe false arm | same-source inverse and measured cost | no search improvement; refutes attributing generic reparse to new operator | local |
| Hanging layout prediction | reused KREMA, distinct command captures | source exact on measured new sources | full-parent cost and contract lose; old WRAPCANON control | local/generalization |
| Morphological family dictionary | reused MORPH; morph_control.ts | 29 source-exact program decodes | worse full-message total; no novel mechanism here | local negative |
| Positional backward copying | reused controls.ts JSON copy stream | 29 source-exact reconstructions | numeric/reference tax, native untested | local/native original interface |
| General byte entropy compression | Brotli+base64 control | 29 exact byte decodes | token price and external decoder requirement | violates native access unless independently proven |
| Residual-free semantics | normalization counterexample JSON | explicit noninjectivity proof | adding residual costs is mandatory | general impossibility for this map |

## G. Second-order adversary / correctness argument

Let s be output so far, v the recursively expanded macro. Define
k=max{j: suffix_j(s)=prefix_j(v)} and append v[k:]. Ordinary literal edges append
unchanged characters. During encoding every state at position i denotes exactly
target[0:i]. A macro edge is admitted only if v[k:] is a nonempty prefix of
remaining target; it advances by that length. Thus induction on increasing i
proves each retained path denotes its target prefix. Literal edges guarantee a
path on supported sources. One state per position is **not token-optimal**:
BPE future context can distinguish two prefixes with different emitted spelling.
The postcheck re-decodes the final message; the Python reader implements overlap
independently and compares original files. This is an algorithm argument plus
finite tests, not a theorem-prover certificate or native-model proof.

Attacks include full overlap (macro may append nothing in the reader), repeated
letters, unequal suffix lengths, no match, literal separators, nested definitions,
newline preservation, unsupported Unicode, missing contracts, oversized input,
and unknown parent instructions. The rule dictionary is expanded ordinarily;
applying overlap inside definitions would be a different, untested codec.

## H–I. Verification / repairs

TypeScript build, executed unit checks, differential reference token pricing,
message-only Python read and prospective heldout captures bind claims. The
initial public trial could discard an unknown header; repaired to explicit
recognized contracts, with a new malicious 'reverse decoded text' test. Added
message-length refusal with oversized-wire attack. Rebuilt and reran all 36
canonical price trials after repairs; reprice frozen heldout baselines separately.
Native model result remains NOT RUN. Independence means a second implementation
in this session, not an independent reviewer or organization.

## J. Decision

No accepted Pareto winner; no default wiring, commit as a winner, PR promotion or
merge. Keep the executable negative artifact and receipts. Highest-information
next experiment is not another header rename: mine overlap-compatible
rule dictionaries jointly, with equally budgeted ordinary grammar controls and
prospectively selected real material. Gate on tokens before spending a native
trial on a losing candidate. Previous 831/608-token native trials still need a
real blinded evaluator before either prior result can qualify.
