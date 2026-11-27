# X190 live research and verification ledger

Session date: 2026-11-14. Live search/fetch and authenticated `gh` retrieval were
used. Node, npm, Python, TypeScript and GitHub CLI availability/version receipts
are in `environment.json`; no Lean, lake or Z3 executable was found by the
recorded commands. No theorem prover, independent agent, simulator, external
expert or separate model-evaluation endpoint was invoked. Parallel tool calls
and benchmark workers are not independent researchers.

## New search terms, recent papers, and new-site check

Queries included `2024 2025 lossless compression multi reference dictionary
recombination phrases` and `2025 2026 language models lossless compression exact
reconstruction prompt evaluation`. Primary lab queries were made separately
for OpenAI, Anthropic, doubleAI and DeepMind. Searches are bounded, not an
exhaustive enumeration of every newly solved problem.

### Trie-based shared dictionaries, 2025

Adam et al., *Lossless Compression with Trie-Based Shared Dictionary for Omics
Data in Edge–Cloud Frameworks*, JSAN 14(2):41, DOI 10.3390/jsan14020041. The
article ID had no prior tracked source/docs/bench match. The primary first
chunk was actually fetched. It describes a global dictionary learned across
files, a lightweight index sent to edge nodes, and downstream binary codecs
such as Zstd/GZIP/LZ4. Those are important hypotheses: sharing dictionary costs
across files and running a binary decoder are not our one-message contract.
No theorem about our BPE cost or native decoding is imported. We did not run
its software or patient-data experiments.
[2](https://www.mdpi.com/2224-2708/14/2/41)

### New site: Rivne State University repository, 2025

Liashuk, Babych, Siaskyi and Kindrat, *Mechanisms and Prospects of Classical
Lossless Compression Algorithms in the Architecture of Operating Systems,
Software and Hardware Implementations of Computer-Physical Systems*, DOI
10.52058/2786-6025-2025-13(54)-1676-1688. PDF first chunk fetched from
`repository.rshu.edu.ua`; exact domain had no prior tracked repository match.
The article surveys classical RLE/Huffman/LZ mechanisms and hybrid systems.
It is not a new two-parent grammar theorem and supplies no paid chat-codec
advantage. A new site does not mean a new idea.
[1](https://repository.rshu.edu.ua/id/eprint/20352/1/1676-1688.pdf)

### RoundTripCodeEval, revised May 2026

Maveli, Vergari and Cohen, *Can LLMs Compress (and Decompress)? Evaluating Code
Understanding and Execution via Invertibility*, arXiv:2601.13398v2. First HTML
chunk freshly read; already cited in this repository, not a new discovery.
Its evaluated models/tasks and training/reflection variants do not establish
success or impossibility for our particular message grammar. The distinction
between executable invertibility and model performance is directly relevant.
[2](https://arxiv.org/html/2601.13398v2)

**New deeper inspection:** pinned author repository
https://github.com/Nickil21/round-trip-code-compression , files README,
`src/core/helper.py`, and `src/eval/check_io_pred_acc_mp.py`. Hashes and commit
are in `research-sources.json`. The evaluator parses structured answers,
normalizes tuples to lists, can compare floating values with tolerance, and
contains an AE-input fallback accepting a stripped trailing `EOF`. These are
task-specific semantics, not our raw output-byte equality.

`metric-gap.py` actually executes only three inspected, AST-extracted comparator
functions from that pinned file (normalize, maybe_literal_eval, deep_equal).
Three pairs of different byte strings compare equal under the function's
default settings: quoted/unquoted text, list/tuple notation, and close decimal
values. This is **not a full benchmark replication**, not a model run, and not
a claim about the exact CLI settings used in the published experiments. It
shows why importing an 'exact' label without its metric is unsafe. Our scorer
does not strip, repair, parse, normalize or numerically approximate responses.

Searches also found LoPace (arXiv:2602.13266), whose stated task is prompt storage
using binary compression, and a dictionary-prompt paper (arXiv:2604.13066) whose
dictionary is supplied in a system prompt. Neither is a drop-in proof of our
single-user-message condition. A Pith page contained explicitly simulated
review/rebuttal text; it was not used as real expert verification.
[1](https://arxiv.org/html/2602.13266v1)
[3](https://arxiv.org/html/2604.13066v1)

## Individual lab investigations, with exact limits

### OpenAI — deeper finite-pool obligations

Fresh search located the public math/preprints catalogue; it was not treated
as hundreds of independently checked proofs.
[2](https://github.com/openai/math/tree/main/preprints)

Pinned fresh source reads of `GroupSupply.lean` and `BlockClose.lean` at
`openai/math` commit recorded in `research-sources.json` extend the previous
Main/Model/WalkOutput inspection. No kernel replay occurred.

`GroupSupply.representative_eq_iff` requires a representation hypothesis
`Represents K C`; under that hypothesis equal representatives correspond to
SameText equivalence. It is not a free theorem about arbitrary text hashes.
`RecordCode.pool(q,M,t)` enumerates offsets and two bounded endpoint ranges.
`normalized_mem_pool` assumes positive period q, periodicity, a valid layer
record covering t, and a bound M on every member word's length. Those hypotheses
are what justify coverage of the finite search pool. Our top-eight parent
heuristic has no analogous completeness theorem.

`BlockClose.pool_complete` additionally requires substring closure, a rooted
walk, nonempty valid blocks and readiness. Its proof selects a maximal-rank
source block and separates already-rooted target, same-block target, and
another-block target cases, using one or two blocks and their reserve bounds.
It proves a good action exists **under those structural assumptions**. It does
not prove that a generic two-parent splice improves BPE tokens, nor that
pruning to eight candidates preserves a factor-two guarantee. The earlier
superstring result is in symbol length with a coded-machine complexity model,
not a guarantee for our JS latency or reader instruction costs.

### Anthropic — Riemann hypothesis

Fresh primary search returned the reported 41.6%→67.2% lower-bound improvement
for the fraction of zeta zeros satisfying RH. This is not a full RH statement.
[1](https://www.anthropic.com/research/riemann-zeta)

Search also returned a November 21 report of a broader claim, explicitly
unverified and later-dated than this session's supplied date. No full proof or
kernel certificate was checked here. The earlier partial result would not
refute a later full proof. We neither confirm nor adjudicate that broader
claim, and have established no reduction from it to a readable codec.
[2](https://phys.org/news/2026-11-anthropic-claude-math-greatest-riddle.html)

### doubleAI

Fresh primary search states a construction for **every prime power q** of an
infinite family of `(q^3+1)`-regular graphs with girth at least
`(8/5) log_(q^3)(n) - O(1)`, using arithmetic-group/tree quotients and a
nonzero determinant/divisibility certificate. The degree restriction matters;
it is not a theorem for every degree, every graph, or a prompt's BPE size.
Its released Lean proof and certificate were not executed locally.
[1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory)

### Google DeepMind / Gemini

The fresh domain-targeted query returned secondary Nexus reports pointing to
the already-known primary arXiv:2605.22763v1 and released Lean repository. We did
not treat secondary success counts as newly verified results, nor execute those
proofs. The previous-turn primary-source investigation is historical context,
not a fresh kernel check. No grammar-cost theorem is inherited from proof-search
benchmarks.

### Other labs and completeness

A complete fresh audit of Seed, Harmonic, xAI, Meta, Qwen, and all other labs was
not completed. Prior research notes remain available but do not count as new
executions. **ALL newly solved mathematics** is not a verified result of this
turn. Selected source statements and a comparator-function experiment are the
actual artifacts; no external expert review or universal proof validation is
claimed.

## Novelty and open interface

DIPIGI has two independently chosen earlier parents where GEITON has one;
that local graph distinction is real. Prefix/suffix sharing, edit scripts,
straight-line DAGs and interval dictionaries already exist in the stack and
literature. The 436-module header/hash inventory and keyword checks are not a
semantic proof of all-stack novelty. No all-stack-new mechanism is certified.

The open interface remains: pay every reference/root/contract in fixed BPE,
recover original bytes, improve multiple everyday categories, preserve useful
runtime, and actually pass source-blind native-chat decoding. No retrieved
result bridges that conjunction. Negative measurements are not an impossibility
proof for the user's broader research problem.
