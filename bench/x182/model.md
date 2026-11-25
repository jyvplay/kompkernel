# X182 A–J contract, outcomes and commit threshold

## A–D: objects, access and resources
ROPI admits UTF-8-roundtrip-stable strings of ≤50,000 UTF-16 units. ASCII-space
splitting retains empty fields; Unicode, tabs and line breaks remain literal
field content. Groups have 32,128 or 512 fields, last possibly shorter. A field's
integer weight is its Unicode code-point length minus k, k∈{2,5,10}. No normalization.
Source equality is original UTF-8 bytes, not semantic equality or encoder self-report.

Decoder receives one complete user message: in-band key plus parent payload.
No external vocabulary, skill, system input, source, prior chat or trained new
symbols are permitted. Every key and parent token is charged using o200k_base.
Native-model access is absent; this contract is a specification, not verified
model behavior. No simulator or independent agent substitutes for an endpoint.

Resources: complete message tokens, source bytes, encoder/decoder CPU ms, wall
ms, memory and supported-format coverage are distinct. Nine deterministic plans
are enumerated and identity/duplicate wires dropped; full raw token count ranks
them. Only the raw-best plan gets parent pricing. Non-greedy enumeration is not
an exhaustive paid optimum. Each transform is O(U+m) time and space for U source
units and m fields; a centered array implements deque insertion without shifts,
and the inverse uses two cursors. Constant nine-plan factor excludes tokenizer
and parent search. The group helper refuses >512 fields or >50,000 joined units.
Weights/sums are safely bounded integers. Parent attempts are 90 s wall and
1,000 MiB V8 old space (not RSS). Paid jobs overlap replay: diagnostic times are
not isolated speed measurements.

## E: quantifiers and inverse argument
For every admissible x and every declared (n,k), inverse(transform(x,n,k))=x.
After inserting a field, the total group weight equals the source prefix sum.
Positive means the most recently inserted field is at the left end; nonpositive
means it is at the right. Total weight is invariant under permutation, so the
inverse can recover that choice without an occurrence tape. Remove that field,
subtract its fixed weight and repeat. Induction recovers all fields backwards;
reversal and exact space joining recover x. Zero must use the nonpositive side.
Different fields with equal weights remain distinguishable literals; repeated
fields and zeros do not invalidate the invariant. Finite implementation tests
support this argument; no formal language refinement/kernel proof is claimed.

Native target: ∃ fixed contract C and specified frozen model M, ∀ declared test
sources x across ordinary settings, a fresh single-user-message execution M(C,E(x))
returns x exactly without outside help. Existence of program D with D(E(x))=x
is a different quantified statement and cannot establish that target.

## F: H+, H−, H∂
H+ requires byte/transport verification, >10 paid-token gains on at least two
ordinary prose and two ops sources including heldout material, protected
nonregression, meaningful mechanism novelty and actual native decoding. Speed
requires six-lane isolated cold ABBA CPU AND wall aggregate B/A≤0.90, every
protected lane≤1.00 and 24 identical wires. Extra search is never free.
H−: if Σ(i=0..t)V^i<q^N, an exact injective code cannot encode all q-ary N-symbol
sources in ≤t tokens from a V-symbol vocabulary without side information. This
does not prove existing frontier optimality or impossibility of gains on everyday
source distributions. Individual losses are not universal impossibility.
H∂: Unicode code points vs UTF16, zero-sum convention, block boundaries, tokenizer,
model/context/output limits, fixed source distribution, metadata/search budgets,
hardware/GC and selection leakage all matter. Reused fixtures are not new blinded
samples. Equality tolerances are zero bytes and zero token-count discrepancy.

## G: negative space / executable modal shortcut
Fresh modal.py reuses 27 explicit evidence flags: payload-only; weak baseline;
normalized text; encoder self-report; inverse-as-native; selection leakage;
binary-theorem-to-BPE; free header/dictionary; free search; micro-as-whole speed;
contended timing; cache-as-cold; timeout-as-pass; statement-as-proof;
source-as-kernel; stale repair evidence; niche-as-general; finite-as-universal;
characters-as-tokens; different-source comparison; hidden protected regressions;
NOT_RUN-as-pass; axiom-as-certificate; undeclared markers; source-aware-as-blinded;
niche-only gain; repaired-inherits-trust. The detector consumes evidence flags,
not arbitrary English. Executable countermodels distinguish inverse existence
from another decoder's behavior, Euler existence from unique reconstruction,
floor from truncation and an observed code from a universal length bound.

## H: distinct artifacts and adversaries
portfolio.ts freshly exercises ROPI plus FOTIA, APOUSIA, KLADOS, PINAKAS, BBWT,
ordinary BWT, XOR, lifting/sparse lifting, graph walk rank, anchors and subsequence
ambiguity. These are separately specified mechanisms, not independent agents;
existing constructions are controls, not new discoveries. portfolio.md records
construction, artifact, established portion, exact gap, locality and attacker.
ROPI attackers cover zero sums, mixed/one-sided drift, same-weight distinct fields,
empty fields, astral Unicode, oversized input and invalid parameters. Separate
Python uses collections.deque, not the TypeScript centered-array implementation.

## I: repair and global compatibility
GRAMMIKOS adds a bounded reader for existing integer/clock column programs. It
requires the exact key, n≤1000, advertised last row=n−1, ≤64 columns, safe lexical
bounds, non-crossing 24-hour clocks, and ≤50,000 output units. Unknown arithmetic
and missing literal entries refuse. Metadata consistency and expansion attacks
are explicit; previous readers ignored the declared row upper bound. This reader
is not a new wire operation and inherits no universal/native trust. Fresh source
comparisons and separate Python reconstruction test it.
The speed patch substitutes overlap-safe typed-array copyWithin for two shift
loops only when ≥32 boundaries remain. Rank search, tie order, updated neighbors
and candidate sets remain unchanged. Threshold, Unicode, scratch-buffer and
long-chunk attacks plus tokenizer reference gates precede isolated whole-stack
measurement. No production promotion unless the whole speed gate passes.

## J: runtime honesty and commit/stop rules
Actually executed systems: Node, Python, TypeScript/esbuild, app build, shell,
git/gh, web search/fetch and real background processes. No lean/lake executable
was found. No external expert, independent AI agent, simulated model or native
model invocation ran. Tests are concrete computations, not fabricated executions.
The engineering-record commit threshold is fresh codec/source/transport tests,
independent completed-wire checks, current-key receipt gates, frontier replay,
compiler/build and documented speed/reader failures. It is distinct from H+.
Unconditional merge publishes the record even if scientific acceptance is false;
it cannot satisfy a missing native gate or turn measured losses into a breakthrough.

Python reader repair: its expansion guard initially counted Python characters,
not UTF16 units. Changed input/output accounting to UTF16 units and added an
astral-literal expansion attack in BOTH readers. All affected gates are rerun;
valid emitted wires are unchanged, and no previous malformed-input trust is used.
