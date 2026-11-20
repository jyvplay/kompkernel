# X134 live research ledger — bounded review, not an exhaustive proof audit

Web searches and page retrieval were actually executed. No Lean development was
built and no external theorem was independently proved in this session. Published
or author-reported results below remain attributed results, not locally verified
lemmas. None directly supplies an o200k-optimal, message-only-readable codec.

## Compression papers (within 2006–2026)

1. **Boncz, Neumann, Leis (2020), FSST: Fast Random Access String Compression.**
   New host found in this turn's scanned source/docs/research references:
   [1](https://ir.cwi.nl/pub/32922), DOI 10.14778/3407790.3407851.
   A static symbol table maps strings to compact byte symbols, supports individual
   string decompression and compressed query processing. Relevant interface:
   decouple table choice from parse choice. Not transferable as its byte-size or
   SIMD speed claim: our reader pays natural-language table costs and uses BPE,
   not an executable FSST decoder. FSST itself is known prior art in the stack;
   a new host is not a new result or a novelty claim.
2. **Díaz-Domínguez (SEA 2025), Efficient Terabyte-Scale Text Compression via
   Stable Local Consistency and Parallel Grammar Processing.**
   [2](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.SEA.2025.14).
   Under a shared fingerprint scheme with stable local consistency, independently
   parsed identical patterns have compatible cores and grammars can be merged.
   The reported scaling experiment is on large genomic collections. This does
   not imply an exact parallel split of our finite context-sensitive BPE search,
   nor a gain on one short chat message. No parallel grammar implementation was
   run here. Dagstuhl was already cited in X120: this is a new paper lookup, not
   a previously unused website.
3. **Heringer and Doerr (WABI 2025), Human Readable Compression of GFA Paths
   Using Grammar-Based Code.**
   [5](https://drops.dagstuhl.de/entities/document/10.4230/LIPIcs.WABI.2025.14).
   Grammar records for pangenome paths preserve a human-readable graph format;
   their results compare domain-specific graph encodings. Human-readable format
   does not certify byte-exact blind LLM execution. GFA path repetition also does
   not transfer to general prose with mostly nonrepeated content.
4. **Whittington, Bachmann, Pimentel (ACL 2025), Tokenisation is NP-Complete.**
   [3](https://aclanthology.org/2025.acl-long.1365/).
   Their decision problems choose a vocabulary or a sequence of merges to reach
   a target symbol count. Here the model vocabulary is fixed and candidate text
   changes instead. Their NP-completeness cannot be imported as an impossibility
   theorem for our finite search. ACL Anthology is already cited elsewhere in
   the repo; not a new website.
5. **Jeż (2015), Approximation of Grammar-Based Compression via Recompression.**
   [1](https://www.sciencedirect.com/science/article/pii/S0304397515004685).
   The stated bound is O(g log(N/g)) grammar size for a length-N string with
   optimal grammar size g. Linear-time construction assumes the alphabet embeds
   into integers 1..N^c for constant c; otherwise alphabet handling adds cost.
   Grammar-symbol count is not BPE message count. This theorem does not say
   re-running grammar induction must improve an already optimized parent.
6. **Sullivan and Koller (EMNLP 2026), Accelerating Constrained Decoding with
   Token Space Compression.**
   [1](https://aclanthology.org/2026.emnlp-main.749/).
   Search-space compression accelerates CFG-constrained generation engines; it
   needs such an engine. We do not control a model's token-generation loop.
   Not a permitted decoder under one ordinary chat message.

A search also returned *Tokenization with Split Trees*, arXiv:2605.22705,
explicitly marked **withdrawn** in its result. It is not used as evidence.
Additional targeted searches on research.aalto.fi and theoryofcomputing.org
returned other hosts; they do not count as successful new-host retrievals.
MDPI was found to be already referenced in mnemosyne.ts. A preliminary audit of
only codec-abbreviations.md was insufficient; the broader audit corrected this.

## Frontier laboratories: reviewed separately, no transfer-by-analogy

### OpenAI

Retrieved the official release page:
[1](https://openai.com/index/sharing-ai-progress-in-mathematics/), then used gh
against public `openai/math` to inspect the repository and retrieve history.md
(`receipts/openai-history.md`). The history explicitly records three withdrawals
on October 7 following a sign error, later repairs, and an October 26 release
claiming a subexponential exact #k-SAT algorithm/refutation of ETH. The latter is
an author-reported result under examination, **not a theorem verified here**.
Even if established, fixed-width CNF counting in subexponential time would not
imply a practical polynomial optimizer for our arbitrary BPE objective, supply a
CNF encoding of the complete codec contract, or guarantee a readable decoder.
No reduction, solver implementation, or resulting codec gain was executed.

The official unit-distance report states a construction of n planar points with
at least n^(1+δ) unit-distance pairs for a fixed δ>0 and infinitely many n:
[3](https://openai.com/index/model-disproves-discrete-geometry-conjecture/).
That is not a statement about character adjacency weights or compression ratios.
It offers no valid imported lemma for this implementation.

### Anthropic / Claude

Fetched the official detailed account:
https://www.anthropic.com/research/riemann-zeta . It reports a lower bound 67.2%
for the proportion of critical-line zeros, **not** a proof of RH, and links an
argument and a Lean formalization. The proposed method uses moment/rank control
of an indefinite quadratic form, retaining positive and negative subspaces.
Our candidate's signed token deltas are not such a quadratic form and we have
no moment inequality reducing the discrete optimization to this theorem.
Therefore no compression claim is imported. The page's subagents/compute are
that lab's reported activity, not tools or work performed in this session.

### Google DeepMind / Gemini

Reviewed the official AlphaProof/AlphaGeometry account:
[1](https://deepmind.google/blog/ai-solves-imo-problems-at-silver-medal-level/).
It describes formal reasoning in Lean plus geometry, with natural-to-formal
translation and training/search. This is a verifier-backed search architecture,
not a new information-theoretic compression bound. We do not have the service
or proof assistant running here. Third-party claims conflating informal Gemini
solutions with Lean proofs are not used to certify this codec.

### doubleAI

[1](https://www.doubleai.com/research/advancing-a-decades-old-problem-in-extremal-graph-theory)
reports, for each prime power q, infinite families of (q^3+1)-regular graphs of
girth at least (8/5) log_(q^3)(n)-O(1), with a Lean development. Its certificate
concerns det(w-I), congruence divisibility and displacement on a Bruhat–Tits tree.
The restricted degree family and asymptotic additive term matter. A BPE merge
graph is neither one of these regular graph families nor a free design variable.
Thus large girth is not evidence of a favorable tokenizer alias assignment.
No Lean files from this work were executed here.

### Harmonic

[1](https://arxiv.org/html/2510.01346v1) describes Aristotle (2025), combining
Lean proof search, informal lemma generation, and a geometry solver; the paper
reports formal solutions to five of six IMO 2025 problems. A search architecture
with mechanically checked proposals is relevant methodology, but its learned
proof-search policy is not available in this runtime. No Aristotle call occurred.

### Other labs and scope limit

The prior notes name Axiom, DeepSeek-Prover-V2 and Kimina. They were not freshly
verified individually in this turn; earlier summaries are not promoted into new
proof checks. No claim to have reviewed **all** newly solved problems from all
labs is made. That is an unbounded and changing set. The useful transfer from
the inspected work is explicit proof obligations and independent checking,
not an unsupported assertion that a mathematical breakthrough solves compression.
