# X136 live research ledger (14 November 2026)

This is a bounded audit, not a claim to have read ALL newly solved problems,
all proofs from every frontier lab, or material demonstrably absent from model
training. No inspected result is used as a theorem establishing codec success.
New queries covered attractors/bidirectional parsing, residual layout, next-token
lossless compression, and each lab separately. Newly consulted domains included
backend.orbit.dtu.dk and axiommath.ai; the DTU PDF fetch failed. Search snippets
are lower-grade evidence than fetched primary artifacts.

## OpenAI — deeper artifact status check

Fetched current `openai/math/history.md` via authenticated GitHub CLI into
`receipts/openai-history.md`. It still records three withdrawals for a sign error,
14 repairs, dependent updates, and a later comparator namespace fix. It reports
new local-smoothing and fixed-width CNF counting results on October 26, with an
independent group to examine the latter. We did not build the formalizations or
inspect all theorem dependencies. In particular we do **not** use the claimed
ETH refutation to assume polynomial-time grammar optimization, remove an NP-hard
barrier, or promise practical SAT speed. Subexponential fixed-width SAT would
not itself make a whole-message BPE problem polynomial-time.

Source: https://github.com/openai/math/blob/main/history.md . Search also returned
secondary pages making stronger claims about Hodge/Navier–Stokes/Jacobian;
these were not adopted as verified facts. Artifact repair history is more useful
here than a headline count of purported solved problems.

## Anthropic / Claude — FLT vs novel results, statement vs build

Fetched official FLT announcement and repository README (saved `receipts/flt.md`):
https://www.anthropic.com/research/formalizing-fermats-last-theorem
https://github.com/anthropics/fermats-last-theorem .

The README states the theorem with natural n>=3 and positive a,b,c:
a^n+b^n != c^n. It reports a pinned Lean/Mathlib build, comparison with a
Mathlib-only challenge, and an independent nanoda replay; it also discloses
four nanoda patches (progress output and definitional-equality optimization).
That disclosure matters: 'independent checker' does not mean an unmodified
checker was used. We read these claims, did not reproduce those builds, and do
not present FLT (a theorem proved in the 1990s) as a newly discovered theorem.
No reduction from FLT to token layout or glyph cost is available.

The freshly fetched `anthropics/formal-math` README (`receipts/anthropic-math.md`)
lists zeta23, 3SUM/APSP, and ETH subprojects. It specifies polynomial-size integer
word-RAM assumptions for the reported 3SUM O(n^1.9992) / APSP O(n^2.99942)
programs. Its ETH claim quantifies one deterministic TM, every k-CNF with m>=2,
n>=4 and all variables occurring, with a displayed subexponential bound.
It also says documentation-only CI verifies nothing and full verification is a
separate workflow. We did not confuse README existence with a passing run.
The zeta statement concerns more than two thirds of zeros simple/on the line,
not the Riemann Hypothesis. None of these statements certifies an LLM's byte
copying behavior. https://github.com/anthropics/formal-math .

## doubleAI — actual independent finite-witness verification

Fetched the official 63-check chess page and GitHub README/PGN:
[3](https://www.doubleai.com/research/maxwell-chess-record-63-checks)
https://github.com/double-ai/double-check .

Unlike the earlier announcement-only audit, X136 **executed** an independent
python-chess library check (`chess_audit.py`). Starting from the standard initial
position, all 190 PGN plies are legal, the resulting FEN equals the published
FEN, and all **63 legal moves give check**. Receipts include exact package
versions and the PGN. This verifies a finite lower-bound witness, NOT the claim
that 64 is impossible.

Crucial qualification from the fetched repository README: Lean's two theorems
are stated **modulo one axiom per SAT instance**, 7,224 cases for the 63 bound
and 6,921 for the consecutive-check bound. README says LRAT proofs were accepted
by three checkers and describes hash correspondence and full/sample checking.
We did not download/replay the multi-terabyte certificates, run Lean, or verify
its universal upper bound. This is precisely why a witness check must not be
reported as a full proof audit. The previous girth result's algebraic family
likewise does not instantiate our token adjacency graph. Useful method:
separate a cheap independently executable witness from the stronger theorem.

## Google DeepMind / Gemini — new asymptotic result, not old 4x4 headline

Retrieved the primary arXiv abstract of Dupont et al., submitted 17 August 2026:
https://arxiv.org/abs/2608.16884 . It reports reformulated combination-loss
optimization plus AlphaEvolve, yielding the arithmetic matrix exponent bound
omega<2.371177 versus 2.371339. This is an asymptotic matrix arithmetic result,
not practical text-processing speed. Full proof/certificate and all algebraic
model details were not audited here, so it is not imported as an executable
algorithm or theorem for our counter. The useful research distinction is
objective evaluation vs optimization strategy: improving a search policy does
not change what a valid solution is. No AlphaEvolve system was run.

A search returned a wiki page dated November 16, later than this session date;
it was not used as current evidence. Secondary exaggerated discovery counts
were not treated as a substitute for the primary abstract.

## Harmonic — mathematical statement and actual limits

Fetched opening sections of Nat Sothanaphan's January 2026 writeup:
[1](https://arxiv.org/pdf/2601.07421) . For every 0<C1<C2 and 0<epsilon<1/2,
it states infinitely many natural triples (a,b,n) with
epsilon*n<=a,b<=(1-epsilon)*n,
a!b! dividing n!(a+b-n)!, and
C1 log n < a+b-n < C2 log n.
The argument uses Kummer carry counts for binomial valuations, simultaneous
carry-rich choices and avoidance of unusually large prime-power divisibility.
The paper also discusses earlier literature and stronger follow-up observations.
We did not run Aristotle or validate the Lean proof. Such number-theoretic
existence does not supply a cheap encoding for arbitrary text or an efficient
text decoder. It does illustrate why the quantifier 'infinitely many specially
constructed inputs' cannot replace improvement on the fixed real corpus.

## Axiom — checked scope of a fresh primary page

Fetched https://axiommath.ai/research/blog/ and
https://axiommath.ai/research/faster-is-not-nearer/ . The latter describes
Lyons–White rate monotonicity: symmetric-rate continuous-time walks on dihedral
groups (and inversion extensions of finite abelian groups), starting at identity,
with distance from uniform measured in Lp. It reports monotonicity for even
positive integer p and counterexamples for other finite p, with a choice of
group/rates/time—not failure of every walk. Extracted web math lost symbols, so
we do not import a formally precise theorem from this rendering or claim to
have checked its Lean files. Our BPE search is not that Markov walk or norm.

The blog index exposed timestamps beyond November 14 on some entries; those
future-dated entries are excluded from current findings. New Faltings/CFSG/Weil
formalization headlines were seen but their full proofs were not audited.
'All frontier labs and all newly solved problems' remains unmet, rather than
being fabricated from an index of announcements.

## Compression papers and applicability

See REVIEW.md for the 2018 string-attractor hypotheses and unavailable primary
PDF, and the fetched 2025 next-token-compression sections. The latter explicitly
separates probability inference and entropy coding; same-message natural reading
cannot silently substitute for the required numerical model interface. The
Brotli and positional-copy controls in this turn test actual envelopes instead
of projecting byte ratios onto token costs.

No inspected paper is a source for a claimed new PTYCHE theorem. The design is a
local engineering application of deterministic wrapping plus standard predictive
residuals. The heap uses standard priority-queue ranked merges, not frontier-lab
mathematics. Honest provenance is more important than attaching an unrelated
recent theorem to either implementation.
