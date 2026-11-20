# X136 review: residual layout, counter correctness, and evidence boundaries

## Runtime honesty / declared gate

Actually used: shell, git/gh, npm, esbuild, Node/TypeScript, Python, web search and
page retrieval; python-chess installed in an isolated `.venv`. No independent
agents, model API, simulator, Lean kernel, SAT solver, GPU experiment, database,
or expert reviewer was run. Constructed strings below are adversarial unit
inputs, not simulated real-workload gains. `npm ci --ignore-scripts` reported
four advisories (three high, one critical); manifests were not changed. A first
system pip installation was refused by PEP 668; the isolated installation worked.

Workspace history again arrived at d8cbd9c despite files from X134/X135. Fetch and
mixed reset to the existing same-branch remote head 874fefc reconciled metadata,
without discarding files or switching branches. PR #74 was confirmed open/draft.

Acceptance, declared before outcome: a repository-distinct operation, >10 tokens
saved on at least one real canonical lane, byte-perfect recovery, independent
message-only inverse, blind native single-chat decoding without tools or hidden
instructions, and a measured whole-stack speed improvement without fidelity
loss. No commit, default codec integration, PR promotion, or merge until these
mandatory gates pass. A useful counter repair is not relabeled as that codec.

## A–F. Formal model and quantifiers

An admissible input is a finite valid-UTF-8 text file. The baseline F is the
TAGSTACK configuration from X135: OMEGA_DET=1, OMEGA_NO_MEMO=1,
OMEGA_ENGRAM=0, OMEGA_OURA_MEMO=0, OMEGA_NO_OROTHESIA=1, other defaults.
ALLOMORPH and ANAKYKLI remain unwired. Tests use full canonical paths from
`bench/x109/lanes29.txt`, including its two different df-h files.

An admissible wire is one ordinary chat message, all instructions and data
included. D receives only that message, not source, encoder metadata, prior
chat, skills.md, hidden system instructions, or a pretrained custom codebook.
Encoder may inspect source and run the installed tokenizer; verifier may compare
D(message) to source afterward. JS input strings with lone surrogates are tested
as tokenizer API attacks, not confused with valid-UTF-8 source files.

Cost T(m) is the installed o200k_base library token count, not bytes, word count,
logical custom tokens, or an estimate. Exactness means UTF-8 byte equality,
zero tolerance. Runtime is wall milliseconds with CPU/memory caveats stated;
noisy timings are not universal complexity bounds. Pareto improvement cannot
exclude search, verification, instructions, or startup costs.

Desired finite-corpus claim: there exists a fixed encoder E and message-only
reader D such that for every x in the declared corpus D(E(x))=x and
T(E(x))<=T(F(x)), and there exists a real x with improvement >10. Separately,
for a declared model/version and independently blinded trial protocol, its
one-message response must match source. Program equality does not imply this
behavioral condition. Generalizing to all everyday text, or all LLMs, is a
strictly stronger quantifier and is not established by these experiments.

PTYCHE domain: <=50,000 UTF-16 units, no CR or literal ↵. Transformed paragraphs
are printable ASCII, >=3 nonempty lines, single spaces between words and no
leading/trailing spaces. Other paragraphs stay literal. Width candidates are
<=32 observed nonfinal line lengths in [40,160]. Up to three corrected lines
per paragraph; no corpus-ID fits. Trailing LF multiplicity is preserved. Reader
rejects duplicate/unused corrections, invalid bounds, empty words, malformed
prefixes. Whole output must reconstruct source before admission.

## H+, H−, H∂ and imported frontier

H+: parent-sensitive representations or sparse prediction residuals can repay
their complete descriptions on some real text. H−: no injective encoding can
strictly shorten every finite token string over the same finite alphabet
(count strings up to a fixed length); in particular the empty string cannot
have negative token length. This is not an impossibility result for our corpus,
for nonuniform priors, or for selective transforms with fallback. H∂: benefits
change with layout, alphabet, message overhead, available decoder operations,
and input length. A bug in the token objective invalidates conclusions drawn
from that objective, even if a decoder remains exact.

Scoped imported results, NOT an exhaustive best-known survey:

* Kempa–Prezza, STOC 2018, string attractors: for T in Sigma^n with an attractor
  of size gamma, a bidirectional parse of O(gamma log(n/gamma)) phrases can be
  constructed (usual asymptotic regime/conventions near gamma=n). Search text
  also states hardness for smallest k-attractor, k>=3. This is a phrase-count
  measure over an alphabet, not whole-message BPE or native model decoding.
  Both primary PDF fetch attempts failed; only search-extracted statements were
  available, so no theorem verification is claimed.
  [1](https://backend.orbit.dtu.dk/ws/files/151671611/stoc18main_p125_p.pdf)
* Mao–Pirk–Xue 2025, next-token compression of LLM-generated text: sections 4.1–4.2
  explicitly use probability estimation followed by entropy coding. A decoder
  must reproduce the coding model/probabilities and entropy procedure; a basic
  chat response supplies neither interface. Reported >20x byte ratios on their
  datasets are not our token results. The correct expected coding identity is
  cross-entropy H(P,Q)=H(P)+KL(P||Q), assuming Q positive on P's support—not an
  arbitrary difference of entropies H(Q)-H(P). We do not import the extracted
  paper's loosely notated equation as a proof.
  [2](https://arxiv.org/pdf/2505.06297)
* X135's BBWT rotation bounds and edit-sensitivity claims retain their original
  hypotheses and limitations in `../x135/REVIEW.md`; no new BPE corollary follows.

Open interface: exploit *reproducible* prediction or grammar structure with a
short, completely specified natural-language inverse, while optimizing the
actual wire and charging end-to-end search. Neither phrase-size approximation
nor an arithmetic-coding byte result solves this interface.

## G / D. Adjacent problems and twenty false solutions

1. Raw transform improvement substituted for post-parent improvement.
2. Inner-wire saving excluding inverse instruction cost.
3. Bytes saved substituted for tokens saved.
4. Custom-token units substituted for installed vocabulary tokens.
5. Source-aware reconstruction substituted for message-only decoding.
6. Encoder `.decoded` metadata substituted for reading the emitted message.
7. Correct inner-layer expansion substituted for full-source recovery.
8. Program decoding substituted for blind LLM behavior.
9. Self-review after seeing source substituted for an independent reader trial.
10. Whitespace/case-normalized equality substituted for byte equality.
11. Lossy summarization or plausible regeneration without a complete residual.
12. Grammar phrase-count theorem substituted for BPE savings.
13. A local primitive microbenchmark substituted for whole-stack acceleration.
14. Incorrect fast-counter prices substituted for library prices.
15. New name or header wording substituted for a new mechanism.
16. Constructed repetitive test strings substituted for real-lane gains.
17. Timing with omitted trials/startup substituted for complete cost.
18. Finite failures substituted for an impossibility proof.
19. Formal proof announcement substituted for a checked theorem statement.
20. Independently checked finite witness substituted for its universal bound.

Modal shortcut remains #6/#8: `.decoded` can equal source even when the output
reader omits a layer. `layout.ts` reconstructs from parent message with an
explicit reader; `coldread.py` uses separate Python code; source is only compared
after decoding. `unit.ts` includes corrupt-parent rejection. New concrete #14
detector: `long_chunks.ts` compares actual library counts across byte/UTF-16
boundaries; old code fails 14/20 tests. Original performance tests missed that
its 'fresh long buffers' comment was not true of the boundary/rank arrays.

## E–G. Mechanism portfolio / strongest structural attackers

These are independent operator families, not six renames. Only PTYCHE is a new
codec module; the heap is a counter implementation repair. Existing genera are
explicitly labeled and not counted as discoveries.

| Approach | Construction/artifact | Verified portion | Strongest attacker and cheapest falsifier | Exact gap/type |
|---|---|---|---|---|
| Cyclic parent preconditioning + fused contract | Existing ANAKYKLI messages; `screen.ts` | 24 supported messages reconstructed and re-priced | Charge the fused header; nested inverse order; cheapest: frozen-wire library recount | Best tie; local wording/parent economics; not a new operation |
| Re-anchored layout residual | New `ptyche.ts`; `unit.ts`, `layout.ts`, `coldread.py` | Predictor plus line-word-count corrections invert exactly on tested inputs | A correction changes next prediction; trailing-LF loss; duplicate/unused corrections; new targeted tests | Native reading and net parent gain; local economics plus original behavioral gate |
| Exact long-chunk adjacency heap | `bpe-fast.ts`, `bpe_audit.ts`, reused X72 `ids.ts` | Counts agree with library; stale edges discarded by version; ties by left byte offset | Multibyte lengths overflow scratch, stale same-rank edges, overlapping equal ranks, lone surrogates | Micro speed does not imply whole-stack speed; runtime interface |
| Same-message positional copying | `controls.ts` | JSON literal/copy parts recover exact Unicode text on 29 lanes | Pointer/JSON overhead, overlapping references, code-point vs code-unit indexing | No token wins; known LZ genus, not new; local economics |
| Entropy envelope | Real Brotli+base64 in `controls.ts` | 29 machine round trips, complete token counts | Tool-free reader cannot invoke Brotli; envelope tax | No wins and native interface absent; contract-level gap |
| Semantic normalization | Explicit collision in `controls.ts` | Two distinct texts map to same normalized string | Case and double space erased; collision assertion | Noninjective without residual; local impossibility proof for this map |

For PTYCHE, induction on emitted lines proves the mechanical inverse: the
encoder compares actual word count k to greedy prediction g at the current
source boundary, emits delta=k-g, and both sides advance by k. Thus the next
prediction starts at the same word. The final boundary consumes the words;
unused or out-of-range corrections are errors. Exact width-only wrapping is
already STICHOS/WRAPCANON; only per-block residual/re-anchoring is the inspected
repository extension. The real winner uses zero line corrections, so its improvement does NOT
validate the line-residual hypothesis. A follow-up default-width arm selects the
smallest width covered by the most paragraph feasibility intervals, and uses
`~|` for that default or `~W|` for an exception. For ordinary single-space lines,
the interval lower bound is their maximum length and upper bound is the minimum
of (nonfinal line length + next line's first-word length). This follows from
the same greedy-wrap lemma already in STICHOS. Choosing among 121 widths is
finite enumeration, followed by first-fit exact paragraph width choices—not a
global parent-token optimum. Parameter residualization is standard coding; the
repository addition is mixed local widths under one shared default and parent.

The module's actual default-arm admission is exercised against frozen real
messages, including corrupt/throwing reader callbacks. Fresh parent runs give
kb-article 620 -> 608; email 486 -> 503 and prices 118 -> 237 are rejected.
The same-process end-to-end API test reproduces the prose win, but adds 6,383 ms
to its 6,485-ms baseline. It also charges 9,177 ms for the rejected email
candidate. This is a trade-off, not a Pareto dominance or whole-stack speedup.
Strongest novelty ablation:
give existing WRAPCANON the same TAGSTACK parent and fused-contract opportunity.
It reaches 614, as does a marked single-width control. Thus only SIX additional
tokens distinguish the mixed-width candidate from that equally advantaged
existing mechanism; the total gain against shipped defaults is twelve. This is
not evidence of a wholly new compression genus or broad everyday gain.
A separate 24-file noncanonical eligibility screen finds only the MIT license;
its existing baseline costs 38 tokens and the candidate is rejected. No held-out
win is established.

Heap argument: after each merge, only the edge at its left neighbor and the new
merged token can acquire a different rank. Heap holds every current finite-rank
edge, plus stale versions. Discarding stale entries then choosing minimum
(rank, original left offset) matches the scanning loop. Each merge removes one
token, at most n-1 times. Heap operations O(n log n), memory O(n); rank lookup
and materializing longer byte strings are additional costs, so no unsupported
O(n log n) bound for all work is claimed. Encoder search itself is not made
global-optimal by a faster evaluator.

## H–J. Verification and repair discipline

The long-counter repair first allocates correctly sized arrays for the scan;
a separate heap implementation is checked against that and the library.
`OMEGA_LONG_BPE_SCAN=1` selects the repaired scan for experiments. Heap starts
only above 1024 bytes, leaving short-chunk execution unchanged. X72's broad
323,192-string differential suite is reused, in addition to new long attacks.

PTYCHE trailing LF preservation was repaired and all affected mechanics rerun;
new attacks cover 0–4 trailing LFs. Real-source parent tests happen after repair.
No source checksum, token count, or successful TypeScript build establishes
native LLM comprehension. No native-model evaluator is available here, and this
assistant has seen the sources, so its self-decoding is not a blind experiment.

Latest exact measurements belong in README.md and receipts, not speculative
claims in this review. If the complete gate fails, preserve runnable artifacts
and explain the gap; do not commit/merge under a false success label. Next tests
must follow actual failures, not an assumed terminal-codec theorem.
