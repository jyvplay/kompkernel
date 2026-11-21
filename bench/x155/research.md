# X155 — bounded live research and transfer audit

## Runtime honesty

Available and used: Node, npm/esbuild, TypeScript, Python, git, gh, web search,
workspace files and real subprocesses. No Lean/Lake executable was found; no
independent agent, simulator, model API, expert reviewer or proof kernel was run.
No database connector was used. Benchmark concurrency refers to Node workers,
not independent model reasoning. No claim to have audited ALL new mathematics.

## New literature searches

Queries included “grammar compression bidirectional macro schemes lexicographic
parsing relative Lempel Ziv natural language”, “JSON lossless compression structure
separation schema inference key value columnar paper”, and “OpenAI subexponential
SAT proof critique compilation polynomial space”. Newly consulted Brown and TUM
URLs were not found in the prior local bench markdown citation search.

- *Edit and Alphabet-Ordering Sensitivity of Lex-Parse* (MFCS2024):
  [1](https://drops.dagstuhl.de/storage/00lipics/lipics-vol306-mfcs2024/LIPIcs.MFCS.2024.75/LIPIcs.MFCS.2024.75.pdf).
  Reports tight logarithmic worst-case sensitivity to an edit or alphabet-order
  change, in the lex-parse **phrase-count** measure. This supports investigating
  representation sensitivity, not a bound on our full BPE messages. No theorem
  asserts that changing traversal improves every document or leaves runtime fixed.
- *Hierarchical Relative Lempel-Ziv Compression* (SEA2023):
  [4](https://drops.dagstuhl.de/storage/00lipics/lipics-vol265-sea2023/LIPIcs.SEA.2023.18/LIPIcs.SEA.2023.18.pdf).
  Input is a collection of similar strings. The reference hierarchy is a rooted
  arborescence; nonroots are RLZ-parsed against their parent; root and graph must
  be stored. Claimed genome improvements concern phrase counts and binary
  decompression, not direct model reading. Existing HOMOIOS/ANTIPHON/DIORTHOSI
  already cover related edit-reference mechanisms; simply renaming them was
  rejected during the repository audit.
- *Optimal-Time Text Indexing in BWT-runs Bounded Space* (2017/updated version):
  [5](https://arxiv.org/html/1705.10382v3). For a length-n text and a valid
  bidirectional macro scheme of b phrases, the reported relation
  z=O(b log(n/b)) concerns overlap-allowing LZ phrase counts. Validity requires
  every character eventually be determined. Cyclic unresolved copies are not
  admissible. The reported NP-completeness of smallest schemes is not an
  impossibility theorem for useful heuristics, readable headers, or this corpus.
  No free external reference or tokenizer-ID channel is imported.
- *Deep Models for Database Compression and Search* (2023 thesis), JPress chapter:
  [3](https://cs.brown.edu/media/filer_public/a8/fc/a8fc9da6-8295-4c09-bfcb-8cc85063d8b8/amir_rahimzadeh_ilkhechi_2023.pdf).
  Hierarchical JSON patterns and family encodings use learned structure and FSE.
  JSON-value/archival compression does not establish preservation of every original
  numeric lexeme, duplicate key or formatting byte in a directly readable message.
  Only search-extracted material was reviewed; model/training/decoder not executed.
- *JSON Tiles: Fast Analytics on Semi-Structured Data* (SIGMOD2021):
  [5](https://db.in.tum.de/~durner/papers/json-tiles-sigmod21.pdf).
  Frequent key-path extraction and column materialization target query scans;
  original JSONB and extra tiles may coexist. Its reported analytical speedup is
  not encoder wall-time improvement, and binary floating-point encodings need not
  preserve lexical number spellings. No tiles implementation was run here.
- *ONTO: A Token-Efficient Columnar Notation for LLM Input Optimization* (2026):
  [2](https://arxiv.org/html/2604.17512v1). Reports schema-once homogeneous records,
  Qwen2.5-7B task accuracy with format context, and synthetic operational datasets.
  Lookup/counting accuracy is not byte-exact reconstruction; a supplied system
  format prompt is not our single-message-only gate. Baseline is JSON, not the
  current TAGSTACK/HOMOSEMA/KENOMA/ARKESIS portfolio. Its headline savings cannot
  be assigned to STOIBAS.

These are prior-art/transfer inspections, not reproduced paper experiments. Level-
order tree representation is classical (see X154's succinct-tree references);
STOIBAS does not claim a new mathematical tree code or a uniquely AI-native idea.

## Repository novelty boundary

Inspected ARKESIS, KENOMA, GRAMMA, ROSETTA, TENSOR, PSIFIDA, NEST, schema/template
families, HOMOIOS, ANTIPHON and DIORTHOSI. Searched level-order/breadth-first/queue,
arity, structure separation, skeleton and edit-reference terminology. TENSOR's
actual implementation splits homogeneous key/value lines into two streams; its
fiber-bundle prose does not implement arbitrary-tree FIFO child assignment.
ROSETTA already removes quotes in flat KV objects; quotation removal **alone** is
not new. ARKESIS's recursive prefix stream interleaves object keys with subtrees.

STOIBAS changes the dependency schedule: a whole node's key list precedes all of
its children's records, deferred FIFO. Its number of keys supplies object degree,
so no numeric object count is sent. A line-typed arm additionally uses LF as the
end of raw JSON string content. This is a new bounded repository representation
among the inspected modules. It is not proof of absence of every semantically
similar algorithm throughout the stack. Both arms count as ONE mechanism family.

## Frontier-lab claims: concrete deeper inspections

### OpenAI378: SAT counting

Fetched SqrtLogSpace/Statement.lean and NativeLargeEntry.lean, following X154's
Final imports. Statement explicitly says it does **not** assert existence of the
finite counting program. Its numerical transport lemma requires width<=k,
n>=20, nonnegative C,A and exponent d; it translates the encoding-bit-length
runtime into a bound with factor C*(8k+7)^d, polynomial exponent2d and
2^((4A)*rho(n)). Thus the hidden k-dependent constants and input encoding remain
material. NativeLargeEntry imports NativeLeafContract and NativeOuterBudgets and
states a canonical large-input trace result. We did not replay those dependencies.
The fixed-k existential-machine quantifier from X154 cannot be changed into a
uniform fast solver with k growing with codec input. No practical SAT-based codec
optimizer was claimed, and no ETH-based impossibility argument is used.
Source: https://github.com/openai/math/tree/main/lean/OAI/Algorithms/SubexponentialSAT

### OpenAI128 and079: superstring and local smoothing

X154's retained Attachments theorem assumes substring closure and record supply,
with path/coverage/reserve costs; its import leads to Distribution. This is not a
BPE-cost approximation guarantee. X155 listed the actual LocalSmoothing modules,
including Definitions, DyadicAssembly and Main. A directory listing is not a
proof audit. The earlier inspected finite-real-p, Schwartz-data, n>=2,
epsilon-positive (except L2) statement remains the scope; no additional theorem
was verified or transferred. No claim to have checked every listed module.

### Anthropic / Claude: FLT

Fetched the actual Theorems/Thm_fermat_last_theorem.lean and its imported
P2M/Sol/S_fermat_last_theorem.lean, going beyond X154's comparator wrapper. The
first uses p2m_exact_reverting on the solution. The solution invokes
FLT.fermatLastTheorem and converts positive-natural hypotheses to nonzero via
ha.ne', hb.ne', hc.ne'. Large preceding attribute lists alter elaboration/simp
settings; they are not themselves proofs or evidence of failure. The deeper
FLT theorem, toolchain, comparator and nanoda were not run. Historically proved
FLT formalization supplies no token compression bound.
Source: https://github.com/anthropics/fermats-last-theorem

### DeepMind / Gemini: anchored last-iterate convergence

Freshly fetched LastIterateConvergence.lean and inspected bounded_iterates_D_exist.
It derives an iterate bound D=(sqrt(12)+1)*norm(z_init-z_star) using the previous
bounded_iterates_D result. Differentiability, monotone K-Lipschitz operator,
positive K, gamma>=2, exact initialization/schedule, saddle point and zero operator
are still hypotheses. Discrete finite glyph assignment has no demonstrated such
operator; bounded iteration does not import this convergence theorem. No replay.
Source: https://github.com/google-deepmind/alphaproof-nexus-results

### Double AI: high-girth graphs

Attempted `gh search code`; this installed gh does not expose that subcommand.
Retried through the actual GitHub search/code API: girth85 returned ten matches,
with the first five being news/notes; the extension:lean query returned zero.
Receipts retained. This bounded search did not locate a proof mirror and does not
prove none exists. The prior prime-power degree q^3+1 lower-girth claim and the
separate28-regular matching example remain publication claims, not locally
replayed certificates. No new graph theorem is assigned to this codec.

Other frontier labs and results were not exhaustively searched or verified.
Unsupported coverage is explicitly omitted rather than marked complete.
