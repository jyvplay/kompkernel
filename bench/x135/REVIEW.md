# X135 — ANAKYKLI: cyclic-cut parent preconditioning

## Runtime and evidence threshold

Real tools used: shell, Node/npm, esbuild, TypeScript, Python, git/gh, web search
and page retrieval. No independent agents, simulator, external model API, Lean,
Coq, SAT/ASP solver, or expert reviewer was run. A compiler check is not a proof
of model comprehension. npm ci preserved the lockfile and reported four security
advisories (three high, one critical); no dependency update was made.

The workspace initially had X134 files but HEAD at the older base commit. The
existing PR head was fetched and the **same branch** index/HEAD reconciled with
`git reset --mixed origin/arena/2f89cd0b-kompkernel`, preserving all working files;
the resulting status was clean before X135 edits. No other branch was used.

**Declared acceptance:** at least one real canonical lane saves >10 complete
message tokens, no accepted output regresses tokens or source bytes, independent
message-only decoding succeeds, native LLM execution is separately tested, and
an honest controlled whole-stack comparison establishes the requested speed
improvement. Until these gates pass, no new commit, ready-PR promotion, default
wiring, or merge is justified. X134's existing draft PR is not an accepted codec
baseline: ALLOMORPH remains unwired.

## A–F: model, access, resources, quantifiers

Inputs are finite valid UTF-8 text, represented without normalization; max
100,000 UTF-16 code units for this candidate. Let F be the shipped TAGSTACK
configuration, T the installed o200k_base count of the **entire message**,
and D a decoder that sees only that message. Source bytes are available to the
encoder and verifier, never to the decoder. No skill file, model vocabulary
extension, hidden dictionary, system prompt or fine-tuning is allowed.

For x=P Q and a marker m absent from x, R(x)=Q m P. Its inverse splits at the
unique m and returns P Q. At the first complete line, if x ends in LF, the
marker-free form R(x)=Q P is possible: the reader moves the last
newline-terminated line, including its newline, to the front. CRLF is retained
as source characters, not normalized. Arbitrary cuts through a surrogate pair
are refused. Collision or malformed marker multiplicity refuses, not guesses.

Candidate message is the explicit inverse instruction followed by F(R(x)).
The new API accepts it only if T(candidate)<T(base) and decoding the actual
message followed by inverse rotation equals x. Base is supplied rather than
re-encoded. Default candidates are four line-aligned phases (first line and
near quarter/half/three-quarter positions), deduplicated. The real-parent
screen tests the first two phases on seven real prose/code/ops fixtures. This
is a finite subset, not exhaustive rotation optimization.

Quantifiers: for every returned candidate on every invocation, actual decoded
text must equal source with zero tolerance; for every tested lane fallback is
available; at least one tested real lane must satisfy the substantial token
threshold. For behavioural certification, the chosen model must reconstruct
all declared test sources from single messages. No finite test establishes
correctness for all models or all possible inputs. Native LLM execution is
currently unverified, even if deterministic Python/TypeScript decoders agree.

Time is wall milliseconds and measured separately from tokens. The transform
is linear; search enumerates a fixed finite set, **not greedy descent**. Parent
calls dominate CPU and inherit the parent's work/clock limits. The selection
cost includes *all* trials, not merely the fastest or winning trial. It is not
honest to call F plus extra F calls a speedup without measuring the entire path.

H+: useful parent sensitivity can repay the inverse description. H−: universal
strict lossless compression is impossible (already the empty message cannot
have a negative token count); this does not settle our finite corpus. H∂:
benefit depends on boundaries, parent eligibility, grammar search and overhead.
The terminal universal-codec claim is not established by any local search.

## C: frontier protocol

Reuses X134's actual entry point and canonical `bench/x109/lanes29.txt` paths.
Flags: OMEGA_DET=1, OMEGA_NO_MEMO=1, OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0,
OMEGA_NO_OROTHESIA=1; other defaults unchanged. Full fresh encoder run, then
serial rotation trials. Unit tests during baseline are not additional frontier
encodes. The `.decoded` result attribute is explicitly distinguished from
independent emitted-message decoding.

Do not compare basenames alone: the corpus includes two df-h files. Baseline
receipts retain full paths, messages, source strings and elapsed times. Compare
actual receipts, not prior narrative recollections. Rotation benchmark's
message-only reader recognizes only two plain CHIRON instruction prefixes;
other composed messages fail the source gate rather than inheriting `.decoded`.
The independent Python reader implements the outer inverse from its instruction
and reuses `bench/chiron_decode.py` for the supported inner grammar.

## D: 18 non-solutions and the modal-shortcut detector

1. A cheaper raw transform that loses after F.
2. A wire-only price excluding inverse instructions.
3. A logical custom-token count substituted for actual o200k tokens.
4. Byte compression reported as token compression.
5. A source-aware decoder presented as message-only.
6. An inherited `.decoded` attribute presented as independent verification.
7. Layer equality presented as full-source reconstruction.
8. Moving lines without preserving their newlines.
9. Treating an empty line after a trailing LF as the line to move.
10. Splitting a UTF-16 surrogate pair.
11. Assuming the marker is absent without checking.
12. Treating malformed decoder passthrough as proof of validity.
13. Summarization/prediction without a complete residual.
14. Entropy coding requiring an unavailable executable reader.
15. Testing only the cheapest successful trial's runtime.
16. Calling a known MOSAIC partition a new mechanism.
17. Treating a failed finite phase sweep as impossibility.
18. Claiming all new mathematical proofs have been audited after a few searches.

The modal shortcut is #6. `coldread.py` reads candidate instructions, decodes
without source/cut metadata, and compares UTF-8 bytes read independently from
disk. It checks every tested trial, not just selected gains. Unit tests include
CRLF, empty final/initial lines, all four marker collisions, Unicode combining
characters and emoji, invalid marker counts, and invalid incomplete final lines.

## E–G: independent mechanism portfolio and adversaries

These are distinct mechanisms, not six names for rotation. Only A is proposed
as a repository-new preconditioning candidate. Existing ideas are explicitly
rejected as novelty claims instead of relabeled.

| Branch | Construction / concrete artifact | Proved or measured part | Structural attacker / cheapest test | Remaining gap |
|---|---|---|---|---|
| A: cyclic-cut preconditioning | `src/lib/omega/anakykli.ts`, real-parent `rotation.ts` | Swap inversion algebra; exact per-trial source gate | Destroy header recognition, contaminate grammar with marker, charge all inverse text; real F comparison | Local profitability; global model-behaviour gate |
| B: nonmonotonic alias packages | `packages.ts`, X134 follow-up | Simultaneous two-alias recoding and literal escaping invert to the exact original parent message | Escaped literals outweigh merges; joint full-message count over pairs of 96 ranked single proposals | Local search truncation, then reader validation if it pays |
| C: region-specialist partition | Existing `src/lib/omega/mosaic.ts` | Existing executable design already handles region/lane choices | Wrapper costs and duplicate global dictionaries; compare complete parent messages | **Novelty failure**, not a new X135 codec; not rerun or claimed as a new result |
| D: predictive whitespace elision | `controls.ts` exact deterministic eraser | Explicit unequal-source collision proves this eraser noninjective | `keep this\n` versus `keep  this\n` erase identically | Local flaw repairable only with additional information; no LLM simulation |
| E: entropy envelope | `controls.ts`, real gzip+base64 round-trip | Executed machine byte round-trip and actual full-message count | A tool-free model is not the gzip executable; count alone cannot certify reading | Contract/behaviour gap; existing entropy mechanisms, not novelty |
| F: token vocabulary redesign | `controls.ts`, actual count of `<T0>` vs asserted one custom token | Installed tokenizer measures real cost | Custom token is not in the installed vocabulary as a newly defined unit | Fixed-vocabulary constraint, not a permitted optimization |

For A, the relevant difference from arbitrary line permutation is that the
inverse describes **one cyclic boundary**, not an index per line. It changes
what the existing parent sees while preserving most ordinary literal text.
Search found no cyclic-cut codec in the inspected omega modules; this is a
repository-scoped observation, not proof of worldwide novelty or absence from
training data. Rotation itself is a standard reversible transformation.

## H–J: verification, repair, stopping

The line mode was repaired to avoid needlessly requiring a free marker; it has
no marker. The rebuilt unit suite now passes 111 checks, including a positive
marker-exhaustion regression and rejection of a corrupt parent decoder; tsc
passes. The message reader was repaired to undo STELI. Frozen messages were
re-audited with the repaired TS reader and independent Python implementation:
28/28 source-exact with independently recounted token prices. The extra 14
trials were generated using the repaired reader. No output gains are inherited
from earlier runs. Native model reading remains untested.

Final measurements: baseline 11,962 tokens, 1,217,179 ms, all 29 messages
identical to X134. All 28 cyclic trials regress (+3 to +36 tokens), despite
one inner parent output saving 11 before the inverse instruction. Joint alias
packages make 89,045 probes across 25 lanes with zero gain. Gzip envelopes cost
20,704 tokens versus baseline 11,962 and are not native-reader verified.
Independent baseline source coverage rises from 19/29 to 21/29 with STELI;
the other eight remain unsupported, not declared corrupt. See README.md and
receipts/summary.json. No Pareto advancement or whole-stack speedup is shown.

The fresh baseline, complete tested messages, actual library token prices,
message-only Python comparison and compiler exit status are the binding
artifacts. No compiler or theorem-prover result is fabricated. If the threshold
fails, leave source/tests/docs in the shared workspace and keep PR #74 draft;
do not commit or merge this as a successful Pareto advance.

## Live research and imported hypotheses

New searched hosts in the scanned repository references: `dkppl.de`,
`d-nb.info`, `kyushu-u.elsevierpure.com`. The Kyushu page fetch returned a 503
maintenance page; only its search-index abstract was available. This is not
reported as a successful full-paper read.

- **Badkobeh, Bannai, I, Köppl, Bijective BWT Based Compression Schemes (2026).**
  Author publication list [3](https://dkppl.de/), and fetched manuscript
  https://koeppl.github.io/bin/paper/tocs26bbwt.m.pdf (opening sections read).
  With n=|w|, z its LZ77 factor count and r_B the BBWT same-symbol run count,
  the manuscript states r_B=O(z log²n), a separation from ordinary BWT runs r,
  and min over rotations r_B≤r. Its optimal-rotation algorithms depend on the
  maximum left/right Lyndon-tree height h; the stated bounds include
  O(nh log n) time/O(n) space or O(nh log log n) time/O(nh) space. These concern
  BBWT runs over an ordered alphabet, **not** token counts of F plus a natural
  language inverse. They motivate measuring rotation sensitivity, not predicting
  an improvement here. We do not implement BWT inversion for the model.
- **Akagi, Funakoshi, Inenaga, Sensitivity of String Compressors and
  Repetitiveness Measures (2023), DOI 10.1016/j.ic.2022.104999.**
  [1](https://kyushu-u.elsevierpure.com/en/publications/sensitivity-of-string-compressors-and-repetitiveness-measures/).
  Sensitivity concerns the output-size change under a *single character edit*.
  A cyclic cut is not such an edit, and our parent is a portfolio of grammars
  and semantic transforms. No sensitivity bound is imported for TAGSTACK.
- The author's page also lists **Optimal Dictionary-Based Compression with
  Answer Set Programming (KR 2026)**, describing acyclic encodings of smallest
  SLP/bidirectional schemes. No ASP solver ran here; symbol-count optimization
  does not automatically encode contextual BPE or behavioural LLM correctness.

### Frontier labs, separately scoped

**OpenAI:** live gh retrieval of `openai/math/history.md` was unchanged from the
X134 saved snapshot after trimming trailing whitespace. The directory listing
confirmed `The-Exponential-Time-Hypothesis-is-False-October-25-2026`; presence is
not proof verification. No Lean files were compiled and no #SAT algorithm was
implemented. Subexponential fixed-width CNF counting, even if established,
would not supply a practical optimizer for this objective without a reduction,
a runtime bound at our sizes, and a separate reader proof.

**Anthropic/Claude:** live gh lookup of `anthropics/zeta-23-lean` resolves to
`anthropics/formal-math`. This was a repository lookup, not a rebuilt theorem.
A new search returned a Science report (11 November 2026) on Yang–Mills claims:
[2](https://www.science.org/content/article/ai-rivals-tackle-one-physics-deepest-mathematical-challenges).
The search excerpt explicitly distinguishes formal consistency evidence from
correctness of an unreleased proof. It supplies no codec lemma, and this session
did not read or validate that proof. The prior zeta-bound result is not RH.

**Google DeepMind/Gemini:** searched the official AlphaEvolve account
[1](https://deepmind.google/blog/alphaevolve-a-gemini-powered-coding-agent-for-designing-advanced-algorithms/).
It reports multiplication of 4×4 **complex-valued** matrices in 48 scalar
multiplications. That field/size-specific tensor decomposition neither prices
BPE nor provides a lossless text inverse. Evaluator-guided search is relevant
methodology; AlphaEvolve itself was not available/run here.

**doubleAI:** freshly fetched the official girth report at
https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory .
It claims (q³+1)-regular families for prime powers q, girth at least
(8/5)log_(q³)n−O(1), with a determinant/congruence certificate and Lean files.
Our glyph adjacency graph is not this family, so that theorem does not imply a
better assignment. No Lean validation was run. The page also lists an extremal
chess construction; no new compression claim is inferred from it.

Harmonic, Axiom and other labs were not independently re-audited in X135.
This is a bounded, attributed review, **not** a survey of ALL newly solved math
problems. None of the inspected external results closes the decoder or runtime
gates for this candidate.
