# X174 research ledger — 2026-11-14 task date

## Evidence discipline
Live web searches and page fetches occurred this turn; pinned GitHub files were
retrieved with `gh api`. Search snippets are leads, not proof validation. The
local Lean/Lake/Coq availability check found none. No theorem kernel, LRAT
checker, independent mathematical expert or external chat decoder ran. A source
file containing `#print axioms` is not a receipt of executing that command.
The OpenAI recursive tree response was **truncated**; it is not a complete audit.
Artifact identities, byte sizes and hashes: `receipts/research-artifacts.json`.
Repository-wide lexical triage and prior citation matches: `inventory.py`.

## New search directions and imported results

### Integer lifting, not lossy wavelet quantization
Search: “integer Haar lifting transform lossless compression prediction update
2012 2023”. New primary paper inspected: Lanz, Schilling, Kaup (2023), *Scalable
Lossless Coding of Dynamic Medical CT Data Using Motion Compensated Wavelet
Lifting with Denoised Prediction and Update*, arXiv:2302.01589. It explicitly
uses rounded prediction/update integer transforms and warns that prefiltering
alone loses exact reconstruction. Its up-to-4.4% file-size result concerns its
CT experiments, not text, BPE, chat or this implementation.
[1](https://arxiv.org/pdf/2302.01589)

Our special case is the elementary reversible pair map d=b-a,
s=a+floor(d/2), with inverse a=s-floor(d/2), b=a+d. No motion compensation,
learned denoising, CT data, entropy coder or real-valued quantization is borrowed.
Integer arithmetic and the same rounding function at both ends are required.
Recursing on lows produces a multiscale tree, not repeated flat chronological
differences. The lemma proves a bijection, not any compression inequality.
Negative odd details are the strongest rounding attacker. Source signs, decimal
points, exponents and punctuation are literal separators, not semantic numbers.

Additional 2017 lead: Chen et al., *Invertible update-then-predict integer lifting
wavelet for lossless image compression*, DOI 10.1186/s13634-016-0443-y. Search
results describe invertible normalization/scaling conditions. Full proof not
inspected; we do not claim to implement its new wavelet family.
[2](https://www.researchgate.net/publication/312350685_Invertible_update-then-predict_integer_lifting_wavelet_for_lossless_image_compression)

### Subsequence covers versus source descriptions
Search: “lossless text compression sparse subsequence covers shuffle string
factorization 2023 2024 2025”. Charalampopoulos et al. (2025), *Subsequence Covers
of Words*, arXiv:2509.05827v1; fetched introduction and Section 2 interface.
A word C is an s-cover of S when every position belongs to some subsequence
occurrence of C. Membership testing is linear time **over a polynomially bounded
integer alphabet**; shortest-cover construction is linear for **constant-sized
alphabet**, not arbitrary variable vocabularies. Disjoint shuffle membership is
a different problem, with hardness results; do not substitute its hardness for
s-cover hardness. Paper ancestry includes SPIRE 2022.
[1](https://www.researchgate.net/publication/395355556_Subsequence_Covers_of_Words)
Primary: https://arxiv.org/html/2509.05827v1

Compression gap: cover membership is not unique decoding. Our executed finite
counterfamily fixes C=ab, length, alphabet, histogram, first a and last b, yet
admits many distinct texts. Each a has a later b, each b has an earlier a, so
all are covered. For length 2m there are binomial(2m-2,m-1) such sources; a
fixed-length binary distinguishing field needs ceiling(log2 of that count).
This is a conditional finite counting bound, not a BPE bound or impossibility
of all compressed representations. A free embedding/choice tape is invalid.

### BBWT and text indexing are not native compression
Search: “text compression bijective transformations word order bijective burrows
wheeler extended 2020 2024”. Bannai et al., *Constructing and Indexing the
Bijective and Extended Burrows–Wheeler Transform* (Information and Computation,
2024). Fetched author-hosted paper introduction and model. Linear construction
is in word RAM over a polynomially bounded integer alphabet; the self-index
uses O(|P| log |P|) backward-search steps. Lyndon factorization avoids the primary
index needed for ordinary cyclic BWT; it does not prove fewer BPE tokens.
[1](https://koeppl.github.io/bin/paper/infcomp24bbwt.m.pdf)

Badkobeh, Bannai, Köppl, SPIRE 2024, arXiv:2406.16475v2: a bidirectional macro
scheme of O(r_B), and r_B=O(z log^2 n), relate BBWT runs and LZ77 factors. A
family has r_B=Omega(log n) while ordinary BWT has r=2; minimum r_B over cyclic
rotations is at most r. The abstract says subquadratic optimal-rotation search
remains open; all-rotation Lyndon factorizations in linear time do not themselves
solve it. These are run/factor counts, not paid model-token bounds.
[5](https://arxiv.org/abs/2406.16475)
Our executed portfolio uses the existing ordinary BWT control, explicitly not
an implementation of the paper's BBWT or linear-time construction.

### Excluded adjacent solutions
LTSC meta-token compression introduces meta-tokens and fine-tunes models;
LLMZip needs shared model probability access and an arithmetic/rank decoder.
Neither establishes basic single-chat native byte reconstruction under this
contract. We did not rerun these external systems.
[3](https://arxiv.org/html/2506.00307)
[5](https://arxiv.org/pdf/2306.04050)

## Individual laboratory investigations

### OpenAI — follow the selection premise, not the headline
Refetched `LiveRatedRowCharges.lean` at the prior pinned commit. Its
`RatedSelection.chosenRows_packed` transports report bounds given RatedSelection,
worker-table equality, n>=2048 and degree/label/width/depth/terminal hypotheses.
Newly followed `CompressorDefaultSelection.lean`: a **noncomputable**
`defaultSelection` constructs the zero supply vector from a PassOrigin and
MotifAdmission's zero-energy case. Context includes a field k, commutative ring R,
BlockSchedule, entry solution f/hf, state and pass. This is a local admissible
choice, not a constructive optimum, not a discharged RatedSelection, and not a
proof that arbitrary text has a smaller paid representation. No whole VP/VNP,
ETH, local-smoothing or physics proof is certified by this inspection.

Live search additionally surfaced October ETH/local-smoothing announcements and
secondary commentary. We do not promote those headlines to verified theorems.
[2](https://ccleaks.com/news/openai-ai-proofs-eth-kakeya-yang-mills-oct-2026)

### Anthropic — distinguish definitions, assembled bridge and FLT target
Refetched ETH `CountedToPadded/Defs.lean`, then followed **Main.lean and
RunFor.lean**, rather than repeating only the definitions inspection.
Main actually imports the component proofs and assembles solverOfMachineLevels;
its own statement still requires a query machine with polynomial-time steps
that evaluates all clique levels within the printed bound. RunFor proves
fold_reaches by induction on a given bounded run, assuming room>=7S+2 and
unary fuel length>=T. This is real source-level proof structure, not merely an
unproved definition, but polynomiality in padded resources is not automatically
polynomiality in the original input length. Neither constants nor premise
construction are free. No Lean build was run.

A fresh primary announcement was fetched in full enough to locate its repository:
*Formalizing Fermat's Last Theorem* (Sep 4, 2026). It reports a largely autonomous
formalization and distinguishes verification novelty from new FLT mathematics.
[1](https://www.anthropic.com/research/formalizing-fermats-last-theorem)
New pinned repo `anthropics/fermats-last-theorem` at
6e837e75355538c7f80bab5b956861e86c4eacc2: inspected README, PROOF-PATH,
formalization.yaml and FinalCheck.lean. FinalCheck imports the terminal theorem,
contains an axiom guard listing propext/Classical.choice/Quot.sound, states
n>=3 and positive natural a,b,c, and wraps it as Mathlib's FermatLastTheorem.
The written dependency route goes prime-exponent reduction -> Frey package ->
irreducibility/modularity/level lowering -> no weight-2 form at level 2.
These files identify a meaningful target and check procedure; **we did not
execute the guard, transitive proof build or comparator**. The named classical
components may be specialized to the argument, as PROOF-PATH explicitly warns.
No compression method follows from the FLT statement.

### Google DeepMind
Refetched erdos_741.parts.i.lean at its pinned commit. The examined partition
and density arguments need their disjoint partition, existence of densities,
and positivity conditions. Formalizing the wrong sequence or dropping those
hypotheses would not solve the advertised density problem. The code is not an
unconditional native compression result. New search results on AlphaProof Nexus
are leads, not an exhaustive audit of its 53 reported results.
[1](https://xenospectrum.com/en/alphaproof-nexus-math-proof-science/)

### DoubleAI
Refetched All63/Final, Trust and Axioms. The upper bound is for reachable chess
positions where **every legal move gives check**. Final still invokes
allcheck_le_63_of routeB_facts; Axioms carries 7,224 explicit unsatisfiability
axioms. Route A accepts concrete LRAT bytes only under lratBytesOk bytes=true;
we have no receipt discharging those checks. No refutation is inferred: this is
an unexercised trust boundary. The graph-girth announcement was freshly searched:
(q^3+1)-regular families for prime powers q, girth >= (8/5) log_(q^3)n-O(1),
with an upper match for one 28-regular family. Announced determinant certificates
are not checked here and do not yield unique Euler walks or free ranks.
[1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory)
[2](https://www.doubleai.com/research/maxwell-chess-record-63-checks)

### Harmonic and ByteDance Seed, separately
Harmonic: refetched IMO2025P3, where the finite-S constraint needs isBonza and
finite nonempty S. Seed: refetched its IMO2025P3, where lte_2_3n_minus_1 requires
positive integer n and separates odd/even cases. Neither covers the zero/empty
boundary by omission. These are contest-proof artifacts, not new compression
or asymptotic hardness theorems; no kernel replay of either occurred.

## What remains genuinely open here
None of these results closes: complete paid BPE price + byte-exact direct
single-chat decoding + varied everyday gains + significant whole-stack speed.
No all-laboratory or all-new-mathematics audit is claimed. Search results dated
Nov 20–24 are later than the supplied task date and are not current-date evidence.
No new mechanism can be certified absent from all human thought or training
from a finite search. The useful transfer is verifier/premise separation and
reversible integer structure, not a borrowed claim of mathematical omniscience.

### Additional fresh repository host, dated primary artifact
A follow-up search for “lossless integer wavelet text log compression Haar
lifting numerical fields 2020 2024” found Md. Mehedi Hasan's **May2019** PhD
thesis, *Lossless and Low-Cost Integer-Based Lifting Wavelet Transform*, at
University of Saskatchewan. The fetched title/abstract establishes the date
within20years. It distinguishes near-lossless early variants from a later exact
construction and identifies lossy scaling as a separate obstacle: rounded
lifting steps do not automatically make an entire scaled transform reversible.
We inspected the title/abstract, not every theorem or hardware experiment; no
hardware cost or generalized-factorization claim is imported into KYMATIA.
[1](https://harvest.usask.ca/server/api/core/bitstreams/df17f6ba-78d8-4f6b-bce2-f2e7d61bae93/content)
The base-tree citation check found no harvest.usask.ca reference. Conversely,
koeppl.github.io was previously cited in X135; it is a new paper here, not a new
host. See prior-claim-audit.md for two inherited overbroad impossibility claims.
