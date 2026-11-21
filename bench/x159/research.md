# X159 live research: exact imported scope, not an exhaustive lab audit

New searches used hierarchical numbering/Dewey labels, prefix encoding,
verification of superstring algorithms, and AlphaEvolve construction verifiers.
The source inventory and hashes are in research/provenance.json. No paper result
is treated as a native-chat codec guarantee. No claim of reviewing ALL newly
solved problems is supportable in this run.

## Compression antecedents and the open interface

**Al Zadjali and North (2016), XML Labels Compression using Prefix-Encodings**,
WEBIST, pp69–75, DOI10.5220/0005755500690075. Fresh search and first PDF chunk
read from [1](https://eprints.whiterose.ac.uk/id/eprint/96826/1/webist%20uploaded%20version.pdf).
The study compares binary prefix encodings of Dewey/SCOOTER XML labels and
encoding/decoding cost; document structure/updates are hypotheses, compressed
binary size is its unit. It is not a proof about BPE or a language-model reader.
The useful relation is that an ordinal path contains predictable prefix state.
KLIMAX transmits a depth and reconstructs a successor vector in an in-band
textual contract instead of binary coding each label's integer components.

This is classical tree/label coding, not an AI-exclusive insight. The measured
open interface is whether eliminating predictable labels helps the actual
parent after paying the whole key. The first HTTP result answers that on one
real outline, not on general prose. An unchanged line must remain byte-identical,
so automatic renumbering or HTML/Markdown semantic equivalence is insufficient.

Additional fresh search found old LIPT/LIFT dictionary transforms and a2006
text-transformation paper. They require a dictionary or change the representation
before a binary compressor. They are neither new nor direct solutions here;
no reported numerical gains were imported. This prevents treating every search
hit as relevant recent evidence.

## OpenAI: superstring comparator → implemented theorem (deeper follow-up)

Pinned openai/math 4eaee87548250b2682affda7d05d947c05554bae.
`lean/ComparatorChallenges/Superstring.lean` states existence of a deterministic
algorithm on finite lists of explicitly encoded strings, common-superstring
coverage, length <=2× optimum in **symbols**, and polynomial finite-stack-machine
implementation in **input bits**. The comparator contains `sorry`: it is a target
statement, not a proof certificate. It would be wrong both to call it a proof
and to conclude that the separate implementation lacks one.

Inspected `lean/OAI/Computability/Superstring/Main.lean`: `answer` is
`Executable.solve`; `answer_poly` invokes `Executable.poly_solve`;
`answer_implementation` transports the polynomial certificate through the
explicit bit encodings; `answer_spec` invokes `Executable.solve_spec` and
`weight_le_opt_with`; `main` packages these. This identifies the next dependency
boundary (WalkOutput/Executable and its weight bound), not a kernel replay.
The old X124 suggestion to transfer a2-approximation to tape ordering is limited:
our objective is complete BPE message cost with declaration constraints, not
symbol-length unrestricted superstring. No approximation factor transfers.

A fresh external search also found a separate packaging effort,
[1](https://github.com/buberlo/veriscs), describing an executable Lean reference.
Its reported timings and machine-check claims were not executed here and are
not counted as our verification. Neither that source nor a repository filename
makes a new theorem true by itself.

## Anthropic: FreyPackage hypotheses, not just terminal wrapper

Pinned anthropics/fermats-last-theorem
6e837e75355538c7f80bab5b956861e86c4eacc2. X158 inspected the terminal wrapper and
its solution invoking Mazur_Frey/Wiles_Frey. X159 inspected
`Definitions/Def_FLTPrelim_FreyPackage.lean`: nonzero integers a,b,c; prime p>=5;
a^p+b^p=c^p; gcd(a,b)=1; a=3 mod4; b=0 mod2. The file derives gcd and parity
lemmas and defines integral/rational Frey curves with divided coefficients.
Thus eliminating a FreyPackage only yields a full FLT result after all reductions
to this normalized package and the Mazur/Wiles dependencies are established.
We did not rebuild those dependencies. No compression or runtime theorem follows
from this source inspection. This is a specific deeper dependency check, not a
claim to have audited all Claude mathematics.

## Google DeepMind: an actual independent exact verification

Pinned google-deepmind/alphaevolve
c42694909d50f92cb01c2d50916f022b1c7e74d1. Fresh README and
`matmul_tensor_decompositions/verification_rank.ipynb` inspection. The README
distinguishes numerical optimizer/fast float verification from rational proof
material; those are not interchangeable.

`verify-matmul.py` statically extracts the literal `decomposition_444` arrays;
it does NOT execute notebook code. Each coefficient is a Gaussian half-integer.
Multiply each factor by2 and represent it as a pair of exact Python integers.
Exhaustively check all16³=4096 tensor coefficients against8 times the4×4
matrix-multiplication tensor. All pass. Mutating one factor coefficient by1 in
the scaled integer representation is rejected. Receipt: matmul-exact.json.

The resulting finite coefficient identity proves this bilinear construction
computes4×4 complex matrix multiplication with48 bilinear multiplications:
expand both sides as polynomials and match every coefficient. It does NOT show
minimal rank, fastest real wall time, bit complexity with arbitrary precision,
a better tokenizer, or native model reconstruction. No random matrices or
floating-point tolerance substitute for the coefficient check. This is stronger
than a source-only review but narrower than a universal formal-methods audit.

## DoubleAI: boundary retained after a failed deeper retrieval

Fresh publisher page retrieved:
https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory .
It states, for prime powers q, infinite (q³+1)-regular graph families with girth
>= (8/5)log_(q³)n−O(1), and a matching upper bound for one28-regular family.
The described certificate has det(w−I) nonzero, divisible by level^4, bounded
through tree displacement. All-degree or all-graph claims would change its
quantifiers. Attempted PDF retrieval at /papers/girth85.pdf failed; GitHub code
search found news mirrors, not proof code. No fake proof audit or Lean replay is
claimed. A fixed finite graph verification would not establish the infinite-family
bound without the arithmetic argument. No codec gain is inferred.

## Other labs / impossible transfers

No additional lab is called audited merely to fill a list. Fresh search results
included future-dated secondary material relative to the session date; none is
used as verified fact. The relevant old impossibility is finite-alphabet counting
against universal strict shortening, not an impossibility of this selected-text
codec. The general shortest-description/terminal-codec objective is not solved
by any finite corpus win. The most useful method transferred from these sources
is precise verifier design, exemplified here by source-byte inverses, complete
pricing, mutation rejection and exact tensor coefficients—not unsupported claims
of private AI-native mathematical insight.
