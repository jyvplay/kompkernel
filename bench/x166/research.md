# X166 research: bounded source inspections, not an all-mathematics audit

Live searches actually issued included:
- text compression reversible preprocessing move to front word frequency transform 2024 2025 paper
- site.drops.dagstuhl.de 2024 2025 string attractors grammar compression approximation optimal
- separate OpenAI, Anthropic, DoubleAI, Google DeepMind, DeepSeek, ByteDance and xAI math/proof queries.

No claim of exhausting ALL labs, newly solved problems, or the assistant's training
corpus is possible. Search snippets are discovery aids, not mathematical proof.
The ETH Research Collection was a newly inspected host in this turn. Primary
GitHub proof sources were fetched at the prior pinned revisions for deeper
interface comparison, not represented as the latest releases. Tree API results
are path discovery only and can be truncated; inventory counts from those trees
are NOT used to claim complete lab coverage.

## Compression papers (within 20 years)

### STC, Du et al., 2026 — actual mechanism lead

Fetched the first HTML chunk of arXiv:2606.03570v3. It describes replacing digit
bytes by placeholders, length/context-conditioned side streams, stable order
recoverable from the normalized main stream, and a fixed BWT/M03-like backend.
Authors report full-enwik9 archive 157388188 bytes, decoder source 183174 bytes,
and a same-coder reduction of 2629561 bytes versus no split. These are author
measurements, not our rerun, not BPE tokens, and not native decoder evidence.
The page mixes June version metadata with an August manuscript date; both are
2026, and no precise priority conclusion is drawn. SYMFRAZ explicitly adapts
this prior art; it uses one hole per variable-width string and a readable textual
side stream, rather than claiming discovery of the STC idea.
[3](https://arxiv.org/html/2606.03570v3)

### Online String Attractors, Whittington, 2024

Fetched introductory chunk of both arXiv HTML and the ETH Library PDF. An
attractor Γ⊆[1,n] must cross an occurrence of every distinct substring (or those
of length ≤k). In the ONLINE problem, the input arrives left-to-right and the
choice whether to mark the current position is irrevocable before the next
position is revealed. The abstract states matching O(log n)/Ω(log n) competitive
bounds for unrestricted attractors and tight strict k-competitiveness for
k-attractors. Constant-size offline Fibonacci/Thue–Morse attractors explain the
adversary. These are costs in marked POSITIONS, not decoder instructions, tokens,
or native execution. SYMFRAZ is offline and uses right context, so it cannot
inherit an online guarantee. The PDF retains CVIT template metadata: cite the
2024 working paper, not a fictitious CVIT publication.
[1](https://www.research-collection.ethz.ch/server/api/core/bitstreams/b0f485e3-8895-4683-b04c-a6a65e69f55f/content)
[2](https://arxiv.org/html/2407.15599)

### The 2-Attractor Problem Is NP-Complete, Fuchs–Whittington, STACS 2024

Publisher abstract fetched. Given finite T∈Σ^n, cover occurrences of every
substring of length ≤k with a selected position set; minimizing its cardinality
is NP-complete/APX-hard for k≥2, with the k=2 gap addressed via colorful edge
cover. This does not prove an impossibility of improving a heuristic compressor,
and does not imply that any constant BPE approximation is hard without a
cost-preserving reduction. No reduction or Lean verification was performed here.
Primary DOI: https://doi.org/10.4230/LIPIcs.STACS.2024.35 .

The exact open interface across these results: a compact combinatorial object
must become a complete, self-describing BPE message that a basic-chat model
actually reconstructs byte-perfectly, while competing with the measured parent
and paying all encoder costs. None of these papers discharges that interface.

## Individual lab follow-ups

### OpenAI — representation boundary, not a slogan about solved superstrings

Freshly downloaded ComparatorChallenges/Superstring.lean, actual Superstring/
Main.lean, Model.lean and PolynomialTime.lean at
4eaee87548250b2682affda7d05d947c05554bae; hashes in research/provenance.json.
The comparator intentionally has `sorry`: it is a challenge statement, not the
implementation proof. The actual Main defines answer=Executable.solve,
constructs a finite-stack-machine polynomial certificate through bit encodings,
and combines solve_spec with weight≤opt to assert a factor-two bound in SYMBOL
length. Symbols are lists of booleans; words and instances are nested lists.
Prefix-marker encodings preserve the list spine including its final boundary.
The implementation and statement must be aligned; scanning only the comparator
would falsely report either a proof or a defect in the actual proof.

Deeper executable check: 400 finite nested prefix-code instances are distinct;
naive concatenation loses boundaries. A one-symbol word carrying a 100-character
codeword can cost more than two one-character codewords. This counterexample is
to automatic transfer of symbol count, not to their theorem or an actual o200k
lower bound. PolynomialTime's certificate restricts ambient register names to
finite support; source inspection is not compilation of that construction.
Lean/kernel/dependency-closure replay: NOT_RUN. No claim that the full result is
verified locally, nor that it supplies a weighted-BPE solver.

### Anthropic — recurse into the numeric clauses

Freshly downloaded CountedInstance/Pairs.lean at
16a5ce41304fcdaea4e0be7c132e1c361dc26da5. Prior Main chooses x0=c+18 and
C=max(C0,10). Pairs requires x0≥18,C0≥10, uses ρ=1/√2, K_l≥2,
K_l<K_(l+1)≤K_l^10≤K_l^C0, and a computable rational in [e_l,2e_l]. Imported
PartAUse, Between and Asymptotic facts carry the numerical/algorithmic work;
they are not silently treated as trivial. The exact finite attack checks 2058
K^10≤K^C cases and exhibits failure at K=2,C=9. That verifies the boundary
inequality only, not the subexponential SAT recursion or whole ETH claim.
No running-time constant for our compressor follows.

Separately fetched the first chunk of Anthropic's FLT announcement. It describes
a formalization of an existing theorem (positive integer a,b,c, exponent n>2),
not a newly discovered counterexample or compression construction. Its reported
large proof and expert quotation are publisher evidence, not our local replay.
[1](https://www.anthropic.com/research/formalizing-fermats-last-theorem)

### DoubleAI — stronger external witness check this turn

Freshly fetched All63/Attained.lean and All63/Trust.lean at
d2fc22e3bc0b675acc18dd53d8e3003c8eceae3a. Attained contains a 190-ply UCI game,
checks each move belongs to legalMoves, normalizes board-array representation,
and invokes native_decide for ok63. Its proposition combines reachability,
all legal moves giving check, and exactly 63 legal moves. Trust's route A
requires accepted LRAT bytes for each member of the 7224-formula family; no
proof bytes were fetched or validated here. Earlier axiom-route material is
not substituted for those missing certificates.

**Actual independent rules replay:** python-chess 1.11.2 accepted all 190 plies
from the initial board; the final FEN matches the published position; it has
63 legal moves, all give check, 23 mate. Receipt: research-checks.json. This is
substantially stronger witness evidence than counting declarations. It does
NOT certify the 64-impossibility bound, Lean's implementation, or all chess
rule formalizations. The primary article states the 63 witness and certificate
approach; its remaining proof claims stay author-reported.
[1](https://www.doubleai.com/research/maxwell-chess-record-63-checks)

Transfer: candidate discovery and a separate replay can establish a finite
witness. It does not imply that a different decoder (an LLM) runs our codec.

### Google / Gemini — distinguish evaluator from model

Fetched primary AlphaEvolve article, first chunk, which gives original date
May 14, 2025 (secondary search pages misleadingly relabel the event 2026).
It describes code proposals plus automated evaluators and reports infrastructure
optimizations. These are publisher measurements, not local benchmark results.
https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/

Prior sum/difference witness interface: 420 exact finite affine transforms with
nonzero integer scale preserve cardinalities; zero scale collapses the set.
No new Google witness or theorem kernel was replayed this turn. Cardinality
invariance does not imply BPE invariance, and a successful evaluator does not
establish native inverse behavior. No all-Google-math audit is claimed.

### ByteDance

Fresh primary Seed search identifies lemma-style whole-proof reasoning with
Lean feedback, rather than native decoding without tools. Reported benchmark
performance is not reproduced here.
[1](https://seed.bytedance.com/en/public_papers/seed-prover-deep-and-broad-reasoning-for-automated-theorem-proving)

Prior pinned Erdős 1051 interface revisited via 512 exact rational boundary
checks: sum(1/(k(k+1)),k=1..n)=n/(n+1). At asymptotic ratio 1, rational limiting
behavior is possible; strict growth hypothesis cannot be silently weakened.
These checks are not the infinite theorem or a Lean replay.

### DeepSeek

Fresh search returned the primary Prover-V2 paper (2025). Its AIME comparison
distinguishes proving a supplied correct answer in Lean from finding an answer
in natural language. This is precisely an access-model boundary: checker and
answer access cannot be smuggled into the basic-chat codec contract. No new
DeepSeek proof replay or novel theorem verification was executed.
[1](https://arxiv.org/html/2504.21801v1)
[2](https://ar5iv.labs.arxiv.org/html/2504.21801)

### xAI / other frontier systems

Dedicated x.ai query did not yield a usable primary proof artifact in the
returned results; secondary mathematical claims were not accepted as proofs.
This is a search limitation, not a claim that xAI has no relevant work. Other
labs and all newly solved mathematical problems remain incompletely covered.
Sensational secondary OpenAI/Google stories likewise do not certify any theorem.

## What actually transfers

Useful: decoder-visible state avoids transmitting a permutation; exact witness
replay is distinct from an upper bound; finite-support/resource interfaces matter;
verification of the statement's encoding is essential. Not useful as evidence:
AI branding, proof length, model confidence, novelty adjectives, or a theorem
whose objective/access model differs from complete-message native compression.
