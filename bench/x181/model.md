# X181 formal contract and evidence thresholds (A–J)

## A–B. Admissible objects
UTF-8-roundtrip-stable strings of ≤50,000 UTF-16 units. Split on ASCII space,
retaining every empty field; every other character stays inside its field.
FOTIA operates on consecutive blocks of 16,64,256 fields (last block shorter),
with a fixed Unicode-scalar lexicographic total order, shorter prefixes first.
It preserves the multiset of fields, their bytes and the number of separators.
The exported block helper also refuses >256 fields or >50,000 joined units.

## C. Information/access model
A receiver gets only a single user-message contract and payload. The contract
fully states grouping, total order and rotations; no dictionary, source, skill,
training or external prompt is assumed. Parent instructions are in-band too.
A program inverse is available. No native-model endpoint is exposed; no claim
that an LLM reliably executes these quadratic rotations is established.

## D. Resources
Full o200k_base message tokens, original bytes, CPU milliseconds, wall milliseconds,
V8 old-space allowance and decoder/model coverage are separate resources.
Source byte length is not token cost. Six plans (three widths × two directions),
minus identity/duplicate plans, are fully raw-priced; the raw-best plan alone is
parent-priced. This is deterministic enumeration, not greedy or global paid
optimization. No learned alphabet or free rank table is used.
For b fields and maximum scalar field length L, a block costs O(b² L) using this
literal implementation; total O(m b L) for m fields, plus tokenization and parent
search. Temporary lists are bounded by one block, besides source/output arrays.
Parent attempts: 90-second wall limits and 1,000 MiB V8 old space (not RSS).
The unresolved APOUSIA profile has a 180-second wall limit. Diagnostic pricing
and sampled profiles overlap canonical replay: none supplies isolated speed proof.

## E. Quantifiers and proof obligation
For every admitted x, every declared block width b and direction d,
D_(b,d)(E_(b,d)(x))=x in original UTF-8 bytes. At each forward insertion x, every
block ends in a field on the same comparison side as the old last field. Rotating
that ending to the front makes the boundaries recognizable from the first field
and x. Inverse removes x, rotates those starts back to ends, then repeats. Length
strictly decreases; equality belongs to the <= class. Empty fields obey the same
total order. This is an implementation argument plus exhaustive/seeded tests,
not a kernel-checked TypeScript refinement proof.

Native target: ∃ one fixed contract C and frozen model M such that ∀ declared
heldout x across the required settings, M(C,E(x)) emits exactly x in a fresh basic
chat with no outside help. Neither ∃ a program D nor ∃ a favorable example
establishes this quantified behavior. Source-aware self-answering is not blinded.

## F. H+, H−, H∂
H+: full byte and transport gates; >10-token paid gains on at least two ordinary
prose and two ops fixtures including heldouts; protected nonregression; meaningful
stack novelty; actual native chat execution. An optional selector paying extra
parent calls is not a runtime Pareto gain merely because it preserves token price.
Separate speed threshold: six-lane cold ABBA CPU and wall B/A≤0.90, every protected
lane≤1.00, 24 identical wires. No production promotion without these gates.
H−: if Σ(i=0..k)V^i<q^n, exact injective coding of every q-ary n-symbol source into
≤k V-ary tokens is impossible absent side information. This is not a proof that
our frontier is optimal, or that better distribution-dependent codes are impossible.
H∂: tokenizer, group boundary, equality convention, Unicode order, source domain,
message/output limits, search budget, training exposure, native model identity
and hardware/GC change the claim. Raw screen losses do not imply paid losses.

## G. Negative space and modal adversary
Freshly executed modal.py reuses 27 explicit evidence-shape detectors: payload-only,
weak baseline, normalized equality, self-report, program-as-native, leaked heldout,
bit-to-token transfer, free dictionary/header, free search, micro-as-whole speed,
contended timing, memoized-as-cold, timeout-as-pass, statement-as-proof,
source-as-kernel, stale repair trust, niche-as-general, finite-as-universal,
characters-as-tokens, different-source baseline, hidden lane regressions,
NOT_RUN-as-pass, axiom-as-certificate, undeclared markers, known-source-as-blinded,
niche-only gain and repaired evidence inheritance. These supplied flags are not
an English proof checker. Executable countermodels show why existence of one
inverse does not constrain another decoder; graph existence does not imply
unique order; floor differs from truncation; an observed code length is an upper,
not universal lower, bound. Foata's maj/inv identity is additionally checked, but
neither statistic is a token-price theorem.

## H. Portfolio / external verification
portfolio.ts executes mechanism-distinct controls: FOTIA, omission rules,
adaptive trees, insertion tableaux, LF cycles, ordinary BWT+index, XOR residuals,
lifting, sparse lifting, graph walk ranks, anchors and subsequence ambiguity.
They are code branches, not independent agents. Details and attackers are in
portfolio.md. Python FOTIA uses separate list/block code; its parent reader is
explicitly reused. Compiler/build output, fixtures and receipts bind claims.

## I. Repair loses trust
AKRIBOS adds a fail-closed bounded reader, not a new wire codec or production
change. It recognizes the fused decimal envelope and applies declared layout
restoration after progression. An added missing-dictionary guard gets a targeted
attack; all reader fixtures and fresh frontier gates rerun. FOTIA's block-helper
size guard gets oversized-field and 257-field attacks; all source/byte/transport,
independent and current-receipt gates rerun. No native evidence is inherited.
The two preexisting readers keep their mismatch diagnostics; refusals are not
silently called success.

## J. Commit/stop predicates and runtime honesty
The engineering-record commit threshold is complete source/transport tests,
independent checks of completed paid wires (unsupported explicitly excluded),
fresh frontier pricing/comparison, compiler/build, targeted repair attacks and
recorded failures. This is distinct from scientific acceptance H+. Unconditional
merge authorizes publishing a negative record, not claiming a breakthrough.
Node, TypeScript/esbuild, Python, shell/git/gh, web search/fetch and background
workers actually run. No lean/lake kernel, external expert, independent AI agent,
simulator or native-model invocation runs. Profiles are samples, not causal proofs.
When acceptance fails, report exact gaps and the highest-information next test;
no universal impossibility or terminal codec claim is justified.
