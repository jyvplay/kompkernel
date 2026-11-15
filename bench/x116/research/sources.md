# X116 external sources and proof status

Live searches run 2026-11-14 (UTC). Only sources actually returned by the search
tool are listed. Claims are downgraded when the primary checked artifact was not
inspected in this sandbox. No Lean, Lake, Coq, Z3, or model API is available here.

## Mechanism source: symlink size is target byte length

ΜΗΚΟΣ does not claim a new POSIX fact. It uses the standard `lstat(2)` semantics
of a symbolic link: `st_size` is the length in bytes of the pathname stored in the
link, without a terminating NUL. The listing also prints that pathname after
` -> `, so the size cell is functionally determined by a sibling cell.

| Source | What it supports | Status |
|---|---|---|
| [3](https://linux.die.net/man/2/lstat) `lstat(2)` Linux man page | "The size of a symbolic link is the length of the pathname it contains, without a terminating null byte." Conforms to POSIX.1-2001. | Primary normative wording returned by search; not fetched as a local file. |
| [2](https://www.pdl.cmu.edu/posix/docs/POSIX-stat-manpages.pdf) POSIX stat manpages mirror | `st_size` for regular file or symlink is bytes; symlink size is pathname length without trailing NUL. | Primary mirror returned by search. |
| [1](https://unix.stackexchange.com/questions/609474/actual-content-of-a-symlink-file) Unix & Linux SE | `lstat` on symlink returns target length; fast symlinks <60 B stored in inode; `readlink` returns the bytes passed to `symlink`. | Community explanation, corroborates man page. |
| [4](https://github.com/fufurobot/msys2-tree-size/issues/5) msys2-tree-size issue #5 (2026-10-04) | Recent bug report explicitly pins `os.lstat(link).st_size == len(target path)` and distinguishes metadata length from payload. | Recent executable bug report; not a paper. |
| [5](https://ratatoskr.run/git/2025/12/8025269/t) Git mingw lstat patch thread | Quotes POSIX: `st_size` shall be set to length of pathname contained in symlink, no terminating NUL; computes correct symlink size on Windows. | Mailing-list patch quoting POSIX. |

New sites this batch not previously referenced in the stack: `linux.die.net`,
`pdl.cmu.edu`, `ratatoskr.run`.

## Related prior art: functional dependencies and lossless decomposition

The general idea that one attribute can determine another is classical relational
dependency theory, not an X116 invention. X116's contribution is the one-chat,
byte-exact, parent-frontier-gated application to a printed ops listing.

| Source | Relevance | Admissible? |
|---|---|---|
| [5](https://www.db-book.com/slides-dir/PDF-dir/ch7.pdf) Silberschatz/Korth/Sudarshan, Database System Concepts 7th ed., ch. 7 | Lossless decomposition via functional dependencies; `R1∩R2 → R1` or `R2`. | Textbook, older than 10 years; background only. |
| [1](https://cs.uwaterloo.ca/~ilyas/papers/IlyasFnTDB2015.pdf) Ilyas & Chu, Trends in Cleaning Relational Data (2015) | Functional dependencies as integrity constraints; deduplication/consistency. | Survey, background; not a readable text-wire codec. |
| [2](https://www.dcs.warwick.ac.uk/~wmb/CS319/pdf/decomp.pdf) Warwick lossless-join decomposition notes | Lossless join iff common attributes determine a component. | Teaching notes, background. |
| [4](https://arxiv.org/pdf/cs/0611024) relational functional decomposition (2006) | Information-lossless decomposition of logic circuits via FD/MVD. | Older preprint; mechanism-distinct from text wire. |

None of these is a directly LLM-readable, byte-exact, single-chat text codec with
an in-band inverse and a complete-message token gate. They are cited honestly as
the classical dependency-theory backdrop, not as the source of the codec.

## Recent checked-artifact prior art (from X116 batch 2, retained)

| Source | What it is | Overlap with ΜΗΚΟΣ |
|---|---|---|
| [kim-em/lean-zip](https://github.com/kim-em/lean-zip) | Kernel-checked DEFLATE encode/decode inverses in Lean 4 (Aug 2026). | Binary entropy codec, not readable text wire; no symlink measure entailment. |
| [eth-sri/lean-lean](https://github.com/eth-sri/lean-lean) / [paper](https://files.sri.inf.ethz.ch/website/papers/rognvaldsson2026leanlean.pdf) | LeanLean proof-code compression, score = Lean-token reduction, Comparator. | Proof-code compression, not ops/prose readable wire; no MEKOS overlap. |

## Frontier-lab math claims: individually reviewed, all downgraded

Live batch 3 searched the October 2026 OpenAI announcements specifically. The
table records each claimed result separately. "Lean-checked" below means the
announcement or reporting says a Lean artifact exists; it does **not** mean this
sandbox checked it. No primary Lean file was executed here.

| Lab / claim | Date claimed | Public artifact claimed | Independent status | Local verdict |
|---|---|---|---|---|
| OpenAI — ETH is false (deterministic subexponential poly-space exact #SAT for fixed-width CNF; 3-SAT refutes ETH) | found 2026-10-16, Lean 2026-10-17, announced 10-26 | paper + Lean in `openai/math` GitHub ([4](https://aicoder.com/news/news-20261026-openai-ai-proofs-eth-false-local-smoothing-kakeya-qcd-existence), [5](https://www.technology.org/2026/10/28/openai-exponential-time-hypothesis-disproof-lean-kakeya/)) | Impagliazzo/Paturi/Williams organizing review; reviewers say role is not certification ([5](https://www.technology.org/2026/10/28/openai-exponential-time-hypothesis-disproof-lean-kakeya/)). Formal statement must still be matched to the conjecture. | **Unverified here.** No Lean. Downgrade to claimed Lean-checked artifact. |
| OpenAI — local smoothing for Euclidean wave equation in all dimensions n≥2; implies Kakeya maximal/dimension, Nikodym, Stein restriction, Bochner–Riesz | output 2026-10-18, Lean 10-19, paper 10-25 (59 pp), announced 10-26 | paper + Lean scope page ([3](https://www.progressiverobot.com/2026/10/27/openai-discoveries-mathematics-computer-science-physics/), [1](https://tech-insider.org/openai-three-science-discoveries-eth-kakeya-qcd-2026/)) | No completed independent peer review as of reporting ([2](https://markgrid.ai/resources/openai-ai-math-physics-claims-eth-yang-mills-explained)). | **Unverified here.** Consequences are conditional on the local-smoothing proof. |
| OpenAI / Anthropic concurrent provenance note — Claude research model found core local-smoothing algorithm 2026-10-16, 14M output tokens, no human input; OpenAI claims similar result independently | reported in paper provenance section ([3](https://www.progressiverobot.com/2026/10/27/openai-discoveries-mathematics-computer-science-physics/)) | provenance note in paper | Secondary reporting of a provenance section; primary paper not executed here. | **Provenance claim only.** Do not treat as two independent verified proofs. |
| OpenAI — existence of 4D interacting QFTs with gauge fields/fermions, including QCD and pure Yang–Mills | natural-language 2026-09-09 / 09-18, Yang–Mills Lean 10-16; announced 10-26 | materials withheld by external group led by David Gross ([4](https://aicoder.com/news/news-20261026-openai-ai-proofs-eth-false-local-smoothing-kakeya-qcd-existence), [3](https://www.progressiverobot.com/2026/10/27/openai-discoveries-mathematics-computer-science-physics/)) | No full public artifact; expert group writing up. | **Weakest.** Withheld artifacts cannot be checked; downgrade to announcement. |
| OpenAI Oct 6 bulk math manuscripts (377 results / 722 manuscripts / 372 families; 3 withdrawn) | 2026-10-06 | manuscripts, partial Lean | Fully-verified share unconfirmed; withdrawals reported (X116 batch 2 sources). | **Aggregate claim, not individual proofs.** No per-theorem local check. |

Deeper pass on the prior-turn called-out proofs: the ETH claim is the most
checkable in principle because a Lean artifact is said to be public, but the
critical gap is statement fidelity (does the formal theorem actually express ETH
as the community states it?) and the algorithm's uniformity/fixed-width scope.
The local-smoothing claim is a chain of implications; each corollary (Kakeya
maximal, Kakeya dimension, Nikodym, Stein restriction, Bochner–Riesz) must be
checked as a separate formal statement, not inherited from the headline. The
Yang–Mills/QCD claim is not admissible as verified while artifacts are withheld.
This is exactly the discipline ΜΗΚΟΣ applies locally: the admissible unit is the
checked inverse and the complete-message A/B, not the headline.

## Batch 4: other frontier labs, individually (22:45Z)

| Lab / claim | Artifact claimed | Local verdict |
|---|---|---|
| Anthropic — `A 2^o(n) Time Algorithm for 3-SAT` (Claude, 49 pp; core algorithm 2026-10-16, 14M output tokens, no human input; Lean 1,050 modules + second independent checker; `MainResults.lean` states ETH false and counting bound) | [2](https://www.emergentmind.com/exponential-time-hypothesis), [4](https://aipolix.com/en-us/news/anthropic-claude-eth-refutation-3-sat-lean-proof) | **Unverified here.** Reporting notes the formal theorem asserts a constant exists and the asymptotic bound beats brute force only beyond ~10^10,000 variables in the 5-clause case; statement-fidelity and scope are the checkable gaps. No Lean executed. |
| Anthropic / Alman–Vassilevska Williams — truly subquadratic 3SUM O(n^1.9992) and subcubic APSP O(n^2.9995), deterministic; arXiv 2610.06783 (2026-10-05); Lean `EndStatement.lean` 139 lines, five headline claims; randomized real-number results NOT formalized | [5](https://cellcog.ai/blog/claude-3sum-apsp-algorithm/) | **Partial artifact claimed.** Deterministic headline Lean-checked per reporting; real-number randomized part paper-only. Downgraded; no local build. |
| Anthropic / Theorem — ~180M lines of Rocq proof code for 123 OSS-Fuzz libraries; independent Rocq checker; "formally verified ≠ error-free" | [3](https://the-decoder.com/anthropics-claude-now-writes-code-and-proves-it-safe-automatically/) | **Software-verification claim**, not a new open theorem. Checker object exists per reporting; not run here. |
| Anthropic / DAPLab Prove2Me — Claude formalization of Fermat's Last Theorem, 11 days, 29,500 intermediate theorems, 13M lines Lean 4; Kevin Buzzard reviewed | [5](https://daplab.cs.columbia.edu/general/2026/09/09/fermats-last-theorem-agents.html) | **Formalization of a known theorem**, not a new mathematical result. Primary lab page returned by search; no local Lean build. |
| Google DeepMind — AlphaProof Nexus: 9 open Erdős problems (of 353), 44 OEIS conjectures (of 492), Hilbert-functions question, convex-optimization bound; arXiv 2026-05-21; Gemini 3.1 Pro + Lean; GitHub successful proofs only | [3](https://winbuzzer.com/2026/05/26/google-deepmind-says-alphaproof-nexus-is-still-not-agi-xcxwbn/), [1](http://www.techtimes.com/articles/317447/20260530/ai-math-proof-milestone-deepmind-cracks-9-erds-problems-magnetar-confirmed.htm) | **Machine-checkable artifacts claimed public.** Success-only publication bias noted; 97%+ catalog remains open. Not built here. |
| Google DeepMind — AlphaProof + Gemini Deep Think IMO gold-standard 35/42 with Lean 4 formal verification | [2](https://news.syncflo.xyz/2026-08-20-google-deepmind-alphaproof-gemini-deep-think-formal-reasoning.html) | **Benchmark claim**, secondary editorial source; downgraded. |
| Google DeepMind / Gemini — new algebraic-geometry theorem, arXiv 2601.07222; Ravi Vakil verified key original insights | [4](https://eu.36kr.com/en/p/3641249893518976) | **Secondary hype source.** Primary arXiv not fetched/executed; downgrade to claimed expert-reviewed preprint. |
| doubleAI — Double Agent improved a 38-year-old extremal graph/code girth bound (4/3 toward 8/5) for <$2,000, full Lean formalization, infinitely many degrees | [1](https://startupfortune.com/an-israeli-ai-startup-says-it-cracked-a-38-year-old-graph-theory-bound-for-2000/), [2](https://www.calcalistech.com/ctechnews/article/hswjujwr5) | **Lean artifact claimed checkable.** "First improvement in 38 years" is vendor framing until independent mathematicians weigh in. Not built here. |
| Shanghai AI Lab / Shusheng-S2 — 3D Ghys conjecture (31 years), 550,000 lines Lean public; model/infrastructure closed | [3](https://www.techtimes.com/articles/329134/20261016/chinese-ai-model-helps-prove-31-year-old-math-conjecture-machine-verified-lean-proof.htm) | **Proof public, method closed.** Reporting also notes a 2026 Lean kernel bug briefly allowed a false Collatz disproof — kernel trust is not absolute. Not built here. |
| OpenAI — Erdős unit distance conjecture disproof (2026-05-20), human mathematicians verified/refined | [5](https://memeburn.com/ai-math-breakthrough-openai-disproves-80-year-erdos-conjecture/), [4](https://techjacksolutions.com/ai-brief/ai-math-reasoning-milestones-30-days-research-automation/) | **Expert-refined claim**, secondary reporting; no local artifact. |

Fractal detail on the ETH pair (prior-turn called-out proof, deeper): OpenAI's
67-page paper and Anthropic's 49-page paper both date the core algorithm to
2026-10-16 and both headline `2^O(n log log n / sqrt(log n))`, but reporting says
OpenAI's Lean bound is the weaker `2^O(n (log log n)^2 / sqrt(log n))` while
Anthropic's Lean proves the main theorem's bound ([1](https://www.progressiverobot.com/2026/10/27/openai-discoveries-mathematics-computer-science-physics/),
[2](https://www.emergentmind.com/exponential-time-hypothesis)). The admissible
unit is therefore each formal statement separately: (i) does it express ETH as
the community states it, (ii) decision vs counting, (iii) uniformity/fixed-width
scope, (iv) asymptotic constant existence vs practical speedup. Fortnow's "toast"
quote is explicitly not a personal verification. ΜΗΚΟΣ adopts the same discipline:
the checked inverse and complete-message A/B are the unit, not the headline.

## Search batches actually run

- Batch 1 (X116, 22:09–10Z): CompactPrompt/LoPace/SIPIT/bit-level BPE/SCRIPT-BPE/freq-ordered tokenization/ACL style-compress. None admissible as readable+byte-exact+no-external-state.
- Batch 2 (X116, 22:14–15Z): frontier-lab math Oct 2026; Lean compression GitHub; symlink st_size semantics.
- Batch 3 (X116, 22:28Z): POSIX lstat symlink st_size (new sites linux.die.net, pdl.cmu.edu, ratatoskr.run); lossless compression functional dependencies relational columns; OpenAI Oct 2026 local smoothing/Kakeya/ETH Lean proof ETH disproof.
- Batch 4 (X116, 22:45Z): Anthropic Claude ETH/3SUM/APSP/Rocq/FLT formalization; Google DeepMind AlphaProof Nexus Erdős/OEIS/IMO/Gemini algebraic geometry; doubleAI girth bound; Shanghai AI Lab Ghys conjecture. New sites: emergentmind.com, aipolix.com, the-decoder.com, cellcog.ai, daplab.cs.columbia.edu, winbuzzer.com, techtimes.com, news.syncflo.xyz, eu.36kr.com, startupfortune.com, calcalistech.com, memeburn.com, techjacksolutions.com.

No search result was used to claim a local execution that did not occur.
