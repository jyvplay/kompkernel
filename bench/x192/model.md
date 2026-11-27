# X192 acceptance contract and adversarial ledger

## A–J
A. Objects: UTF-8 transport-stable sources of at most 50,000 UTF-16 units, ASCII words at most 96 units, at most 10,000 word/reference events. MARTYS reserves ^; encoder refuses sources containing it. It does not assert coverage of arbitrary byte buffers.
B. Access: encoder sees source and tokenizer; executable inverse sees only complete payload. Native participant must see only public prompt bytes, not source, tools, skills or repository.
C. Resources: 16 configurations (two word caps, two fragment widths, two anchors, two local thresholds), at most 64 selected words, fragments up to four ASCII letters. Decoder caches at most one answer per distinct reference fragment. No external vocabulary.
D. Quantifiers: for every admitted encoder plan, literal word set is preserved (one witness per distinct word), every reference has exactly one distinct witness, and original separators survive. Thus executable inverse equals source by substitution at each original word span. This is a mathematical argument, not a Lean theorem or evidence about model behavior.
E. Paid objective: exact o200k tokens of MARTYS key plus complete parent message, including parent rules; compare same source to fresh canonical winner. Local token choices are heuristics, never a proof of whole-message optimality. Runtime is measured separately.
F. H+: significant (>10-token), broad prose/ops frontier improvement, source-blind native exactness, mechanism novelty and significant whole-stack speed improvement jointly. No component implies the others.
G. H−: a counterexample to a universal implementation claim or paid/native failure on a specified lane. No finite failure proves all future codec designs impossible.
H. H∂: executable source equality with unresolved native interface; timeout, unsupported parent reader, partial inventory or absent external review remain unresolved, not successes.
I. Repair rule: any encoder/key/decoder change invalidates affected test, paid, native, hash and speed evidence. Rebuild bundles; clear stale job outputs; regenerate frozen handoffs explicitly rather than silently reuse IDs. Decoder word-cap mismatch was fixed before the first unit execution; no pre-repair result is reported.
J. Access actually used: shell, local Node/Python compilers, Git/GitHub, web retrieval. No independent agent, theorem kernel, outside expert or second model endpoint was invoked. Parallel subprocesses are not independent agents.

## Structural attacks and deceptive result shapes
Each row gives the seductive claim and cheapest defeating experiment. These are obligations, not fifteen successful external validations.

1. Shorter folded body → add the full decoder key and parent rules.
2. Beats raw → compare the canonical parent winner, not raw source.
3. Executable inverse → send frozen prompt to an isolated basic-chat model.
4. One exact answer → include CRLF, double spaces, tabs, trailing newline and NUL.
5. Modal reconstruction is exact → `a b\n`, `a  b\n`, `a b\r\n` collapse under whitespace normalization. Native scorer rejects this substitute.
6. Self-consistent reference → `^ana ^banana` has no literal witness; must refuse.
7. Unique occurrence → `banana banana ^ana` is valid despite duplicate occurrences; uniqueness is over distinct words.
8. A fragment identifies a word → `^ana banana bandana` must refuse ambiguity.
9. Global scan equals recency → `^ana banana` is forward-decodable here, not under MNEMA.
10. Recency always implies global uniqueness → adding `bandana` later invalidates global `ana` even if latest-word rules could decode it.
11. Linear parsing means bounded expansion → repeat a reference to a 96-character witness beyond 50,000 output units; refuse.
12. Unicode strings mean byte transport → lone surrogate is refused; valid emoji and combining characters remain literal.
13. Corpus-selected best means general → 39-source screening is discovery, not blinded heldout evaluation; inherited heldouts are known.
14. Concurrent wall time proves speed → run paired whole-stack ABBA in isolation with identical-wire hashes.
15. Repaired implementation inherits trust → rerun all affected gates, freeze new artifacts.
16. Kernel theorem proves real-world claim → inspect imported definitions, assumptions, comparator and machine semantics.
17. Density-one zeros prove RH → a density-zero exceptional set can be nonempty; a proportion bound is not universal quantification.
18. Large girth guarantees unique walks → tree a—b and a—c admits a-b-a and a-c-a, even without cycles.
19. Six aliases are six approaches → use rank, checksum, numeric delta, distance copy, parity layout and literal-witness addressing, each with different inverse.
20. Merged PR means acceptance → publication is independent from every scientific gate.

## Complexity
With n source units, W distinct words, total distinct-word length L, Q distinct reference fragments, and B(m) exact tokenizer cost on m units: indexing at most four fragments per position costs O(L) expected map operations (bounded fragment width); ranking costs O(W log W). Sixteen configurations examine at most 64×96×4 alias candidates and n local sites, each priced on bounded-size strings; full-message pricing adds 16 B(n+key). This is a bound on calls, not a claim about the tokenizer's internal asymptotics. Decoder matching costs O(Q L) worst-case character work with bounded word/fragment sizes, plus output size, and O(L+n) storage. There is no hard CPU deadline inside the planner; paid subprocesses have 180-second wall caps. Reference selection is greedy local; first/last anchoring and configuration selection are enumerated non-greedily, not globally optimized.
