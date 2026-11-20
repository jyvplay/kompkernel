# X134 — ALLOMORPH / ΑΛΛΟΜΟΡΦΗ: occurrence-conditioned aliases

**Research candidate, not an accepted frontier addition.** No claim of a new
Pareto-superior codec is made without the gates below. The new module exists in
`src/lib/omega/allomorph.ts`; it is deliberately **not wired** into TAGSTACK.
The last shipped addition was X133 SYNARMOGE, not X132 EUROS alone.

See [final results](results.md), [research ledger](research.md), and
[aggregate receipt](receipts/summary.json).

## Runtime honesty and reproducibility

Executed tools: shell, Node 22, npm, esbuild, TypeScript, Python 3, git, gh,
web search and page retrieval. GCC is installed but was not used. No independent
agents, simulator, expert reviewer, external model API, Lean, Lake, Coq, or Z3
was run. `command -v` found no installed Lean/Lake/Coq/Z3. Concurrent shell jobs
are not independent research agents. npm ci reported nine dependency security
advisories (eight high, one critical); dependency versions were not changed.

The baseline was built before any runtime changes and ran with:
`OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_ENGRAM=0 OMEGA_OURA_MEMO=0
OMEGA_NO_OROTHESIA=1`, o200k_base. Other switches use repository defaults.
Canonical paths are read from `bench/x109/lanes29.txt`, never reconstructed from
basenames. In particular there are two different df-h fixtures.

The full frontier run overlapped some small post-processing experiments.
Therefore its elapsed time is a receipt of this run, **not a controlled speed
comparison**. Subsequent candidates consume frozen baseline messages without
rerunning the expensive parent. No speedup of the whole stack was established.
X133's hypothetical avoidance of a second parent encode is not a speedup versus
the previously shipped stack: its measured A/B was +5.20% time.

Rebuild (bundles are ignored, never trust a stale .mjs):

```sh
npm ci --ignore-scripts
for f in frontier probe unit evict specialize latin matrix orthogonal beam leaders; do
  node_modules/.bin/esbuild bench/x134/$f.ts --bundle --platform=node \
    --format=esm --outfile=bench/x134/$f.mjs
done
# Long run; use a process manager, not overlapping encoder invocations.
node --max-old-space-size=2400 bench/x134/frontier.mjs
# Only AFTER the baseline completes:
node --max-old-space-size=2400 bench/x134/probe.mjs
node --max-old-space-size=2400 bench/x134/evict.mjs
node --max-old-space-size=2400 bench/x134/specialize.mjs
node --max-old-space-size=2400 bench/x134/latin.mjs
node bench/x134/beam.mjs
node bench/x134/leaders.mjs
node bench/x134/matrix.mjs
node bench/x134/orthogonal.mjs
node bench/x134/unit.mjs
python3 bench/x134/coldread.py
node_modules/.bin/tsc --noEmit
```

## A–F. Formal contract

An input is a finite UTF-8 text fixture x. The existing encoder F emits a plain
message m including its decoding instructions, with a declared CHIRON script
and a topologically ordered rule tape when applicable. A candidate transforms
m, not a hidden model state. The new search currently accepts Cyrillic and
Arabic CHIRON scripts, at most 65,536 UTF-16 code units in m; larger or unsupported
inputs refuse. This is a work boundary, not a correctness claim about all sizes.
Zero numeric tolerance is allowed. UTF-8 byte equality is the ultimate target;
JavaScript string comparisons alone are labeled as such.

The decoder may use only the emitted message and ordinary reading/reasoning.
No source, remembered dictionary, skills.md, system prompt, tokenizer table,
model fine-tuning, arithmetic coder, or tool execution is supplied to the model.
The encoder may inspect x, the frozen m, and the installed o200k tokenizer.
The executable verifier may use source bytes as a ground-truth oracle, but the
source must not help it parse the emitted alphabet. ALLOMORPH now uses the
existing wire parser, not `characters(message) minus characters(source)`.

Counted resource: **all o200k_base tokens in the emitted message**, including
instructions, dictionary, escapes, and framing. Separate resources are wall
milliseconds, CPU work, memory, and behavioural decoding reliability. A token
win with increased time is not domination in all resources.

Acceptance quantifiers, declared before a success claim:

1. For every tested input x, candidate C either refuses or emits m' with
   `T(m') < T(F(x))`; refusal keeps F(x) unchanged.
2. For every accepted m', the actual emitted CHIRON layer decodes identically
   to F(x)'s layer, and the full composition must separately recover x's bytes.
3. For the fixed canonical corpus, at least one **real** lane must improve by
   more than ten tokens to meet the requested substantial-gain target. A sum of
   tiny wins and constructed unit witnesses do not meet this threshold.
4. To claim full Pareto domination including speed: a controlled end-to-end
   comparison must not increase total runtime and must materially improve it
   for the additional speed requirement. No hypothetical naive implementation
   is an admissible baseline.
5. To claim unaided native model decoding: an independent blind single-message
   model test must reproduce the source bytes. This tool is unavailable here.
   Neither the encoder's `decoded` field nor the author's self-review satisfies
   this gate. No universal quantifier over all LLMs can be certified by a finite
   benchmark.

H+: a new representation gives material measured gains under these gates.
H−: no universal strict lossless compressor exists over all finite strings
(counting/injectivity), but this **does not** prove the finite task impossible.
H∂: wins may depend on glyph vacancies, tokenizer, source size, parent format,
search budget, or model decoding reliability. Current experiments support
boundary-sensitive/local results, not a terminal codec theorem.

## C. Frontier and the exact open interface

The previous receipt was 28,015 raw -> 11,961 shipped tokens on 29 lanes, with
12,020 for SYNA disabled. Its `exact` column tests an encoder result attribute;
it is not an independent complete-message decoder run. X134 refreshes both the
message totals and the **scope** of the exactness claim. See `summary.json` and
`coldread.json` in receipts.

A CHIRON-layer equality is a valid compositional invariant only when the
unchanged outer inverse is correct. It is not by itself a source reconstruction
for generative-parent lanes. The existing independent CPython reader is reused
for source comparisons, and unresolved parent inversions are counted rather
than asserted away.

The earlier formula `c(t-1)-(1+t)` is an **additive isolated-rule model**, not
an impossibility theorem for contextual BPE. Its conclusion for t=1 requires
one-token references, independently additive body costs, and the stated tape
cost. Cross-boundary merges invalidate those hypotheses. Likewise a bounded
maximum token length does not imply a fixed character-window influence radius.
Window screens here are heuristics; admission uses full-message pricing.

The open interface is: can a new readable representation change the remaining
cross-boundary costs enough to repay its full in-band explanation and dictionary
cost, without changing what the existing parent decoder sees?

## D. Negative space (18 traps)

1. Raw-token gain instead of improvement over the entire parent.
2. Omitting the dictionary or decoder instructions from the price.
3. Counting bytes instead of model tokens.
4. Fine-tuning or installing a new model vocabulary.
5. Arithmetic coding that requires an external decoder.
6. Source-derived rule names available only to the verifier.
7. Treating encoder `.decoded` as an independently decoded emitted message.
8. CHIRON-layer equality promoted to full-source equality without parent inversion.
9. Calling a semantic paraphrase byte-exact.
10. Treating 95% reconstruction as lossless.
11. Accepting a local-window cost instead of the whole-message cost.
12. Assuming a decoder's unchanged-input fallback certifies a valid program.
13. Counting an unexecuted research idea as an experiment.
14. Comparing speed to a hypothetical deliberately redundant implementation.
15. Calling a different alphabet/parameter setting a new mechanism.
16. Calling constructed positive unit tests real-workload gains.
17. Calling a clock-limited search deterministic because OMEGA_DET is set.
18. Calling a finite search failure an impossibility proof.

**Modal shortcut detector:** `coldread.py` reconstructs from message text with
the existing independent Python parser and compares bytes read from disk. It
never consumes `.decoded` or a source-derived alphabet. The distinction between
19/28 direct source reconstructions in its interim run and the encoder's 28/28
flags illustrates why the shortcut is invalid; the final receipt supersedes
these interim counts. Nonmatches need their parent inverses, not optimistic
relabeling as exact.

## E–G. Mechanism portfolio and structure-specific attackers

| Branch | Construction / artifact | Proved portion | Unresolved interface and cheapest attack | Gap |
|---|---|---|---|---|
| A: homophonic aliases | `allomorph.ts`, `probe.ts`: append h=g; replace only profitable occurrences of g with h | Backward-reference alias has the same expansion; actual decoder gate checks it | Sparse free alphabet, overlapping windows, list operands; complete-message reprice and cold decode | Local profitability; behavioural decoding remains global |
| A repair: glyph eviction | `evict.ts`: rename or inline a victim, then reuse its valuable glyph as a selective alias | Each rename/inline/alias is proposed together and layer-checked | Displacement may cost more than selective merges save; all costs retained | Local; same family, not counted as independent mechanism |
| B: partial-context specialization | `specialize.ts`: add a rule for an existing glyph plus context seen at only some sites, sweep its spelling | The actual decoder preserves the expanded layer | Two-character spans omitted by prior re-mine; actual header/tape tax; overlaps use nonoverlapping replace | Local; related to existing grammar induction, **not claimed wholly novel** |
| C: escaped shared alphabet | `latin.ts`: permit Latin names even when literals collide, escaping collisions | Explicit escape channel is invertible in principle | Billing all escaped literal occurrences and the new outer contract | Local price; executable inverse and model validation not completed because price fails |
| D: reversal | `orthogonal.ts`: reverse full parent carrier, transmit inverse instruction | Code-point reversal is an involution; tested | English word token destruction; full-message bill | Local; known transform, negative control |
| E: case-plane separation | `orthogonal.ts`: lowercase ASCII and transmit uppercase positions | Restore listed code-point positions; tested equality | Index cost, Unicode case expansion, one-based ambiguity; ASCII-only forward map | Local price; positional computation is a model-readability concern |
| F: line permutation | `orthogonal.ts`: sort full lines with explicit inverse permutation | Explicit permutation restores bytes; tested | Order tax must be paid; no implicit guessed source ordering | Local; prior art/negative control, not a new-codec claim |

These are independently specified transformations; A's variants are not six
renames presented as six mechanisms. D–F are intentionally inexpensive controls,
not claims that the stack had never considered reversal, casing, or ordering.
No successful known mechanism is renamed as X134.

## F. ALLOMORPH design specification

Meaning: *alternate forms of one symbol*. For an acyclic string grammar G,
append a fresh name h with rule h -> g. Replace a subset S of g's occurrences
in the body with h. For each replaced occurrence, expansion(h)=expansion(g).
All other expansions are unchanged, proving equality by concatenation. For
program-valued rules, the implementation additionally requires actual CHIRON
decoder equality; a list reference must not be assumed to be an ordinary string.

Existing renaming is a bijection applied everywhere. This construction is
**one-to-many spelling**, chosen per occurrence, while retaining the same
ordinary substitution decoder. It is not a new information-theoretic code or
a claim to invention of homophonic coding. Repository novelty is limited to
this candidate move in the surveyed post-frontier modules.

Greedy: **yes**, at most four strict-improvement passes. Candidate pool: unused
characters in the wire-declared Cyrillic/Arabic block, excluding source and
message characters. At least two sites must improve the ±12-character ranking
screen; each assembled candidate is whole-message-priced and decoded. This is
not an exhaustive search over subsets and can miss cooperative improvements.
CPU-bound, bounded work/size, **no wall-clock cutoff**. It uses the installed
ordinary tokenizer, not new model tokens. Malformed programs, unsupported
scripts, oversized messages, and no-win cases return null. No registry entry
or default-on chain modification is made without a genuine corpus win.

Source citation: this construction is an engineering hypothesis in this turn,
not attributed to a theorem in the external papers. General dictionary coding
and homophonic spellings are older ideas. Nothing can establish that an idea
was absent from a model's training data; that claim is explicitly not made.

## H–I. Verification and repair discipline

- TypeScript compiler is run with exit status preserved (not piped to head).
- The library tokenizer independently recounts probe output, separately from
  the optimized countTokens path.
- Existing CPython CHIRON decoder tests emitted messages against source bytes.
- Positive *constructed unit tests* exercise alias admission; they are marked
  as unit tests, not fabricated real-world gains.
- The parser repair replaced source-relative glyph discovery with wire-declared
  script parsing; Arabic support and unchanged-input refusal were added.
  The full corpus probe and unit gates must be rerun after this patch.
- No LLM API decoding test was run. The representation adds no new decoding
  operation, but this is structural compatibility, not a behavioural guarantee.

## J. Stop / continuation criteria

Do not merge or advertise a new frontier unless the acceptance threshold is met.
An experimental module, a negative result, or a two-token induction improvement
is not enough to satisfy the user's requested new substantial Pareto gain.
Preserve the real artifacts and exact gaps rather than inventing success.
The next high-information step depends on the final receipts: test any paying
context pattern on held-out actual workloads, and obtain a message-only model
reader before certifying native decoding. Whole-stack speed remains separately
unmet; caching or a hypothetical extra encode is not an answer.
