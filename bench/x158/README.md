# X158 — BEMATISMOS: periodic tab-stop transduction

Experimental, optional, not on the production TAGSTACK path. This is classical
fixed tab-stop coding, not new mathematics. The initial experimental name
STATHMOS collided with X17's decimal codec; that original file was restored
byte-for-byte before final validation. BEMATISMOS is a different mechanism,
not a replacement for X17. Receipts generated before the correction describe
the same tab-stop algorithm; they do not describe X17.

## A. Model and information access

Source alphabet: printable ASCII plus LF, at most 50000 characters. Source TAB,
CR, non-ASCII and malformed UTF16 are refused. All characters count as one
column; LF resets to zero. The encoder has the whole source and exact o200k
pricing. The decoder gets only the complete key and parent message, no source,
external vocabulary or schema. Native model behavior has not been measured.

For width w in {4,8,16} and phase p in [0,w), a TAB advances column c by
`w - ((c-p+w) mod w)`. This is strictly positive, including at a stop. The
encoder replaces spaces only when at least two spaces reach that stop. It
copies remaining spaces, all printable characters and all LF bytes.

## B. Claim and quantifiers

For every admitted source and every generated plan, software expansion equals
the original source. Proof sketch: induction on source position and output
column; a literal preserves the state, LF resets both, and a substituted tab
expands to exactly the consumed positive number of spaces. No claim is made
that every source shrinks, that this is globally optimal, or that a language
model executes the instructions reliably. The 50000-character output bound
makes adversarial expansion terminate by refusal.

## C. Objective and cost

Price is o200k of the entire key plus parent message, including LF separators.
`bematismosSelect` verifies the supplied incumbent through the supplied reader,
tries at most 28 plans, and returns a strictly smaller verified candidate or
the original incumbent. It is not wired into TAGSTACK because this bounded
search adds substantial CPU. Domain scanning/each transform/inverse is O(n)
with O(n) storage; 28 is fixed. Parent and tokenizer costs are additional;
there is no proven linear bound for the whole parent encoder. Greedy space
replacement is deterministic; parameter selection is exhaustive over this
small family, not over all possible placements or codecs.

## D. Acceptance regions

H+: source-file byte equality under an independent inverse, complete-message
saving >10 tokens versus the actual strongest incumbent, native blind reading,
and measured whole-stack CPU/wall nonregression; a significant speed result
requires >=10% aggregate improvement in both metrics with no tested lane
regression. Broad everyday claims additionally require independent prose/ops
holdouts, not discovery-selected examples.

H−: wrong bytes, unpriced key, stronger incumbent wins, or protected runtime
regresses. H-boundary: unsupported parent, timeout, native NOT_RUN, discovery
selection, partial canonical refresh. These cannot be promoted to H+.

`accepted` in trial receipts means software-readable, NOT a token win.

## E. Adversaries and executable modal audit

`unit.ts` exercises 500 deterministic generated sources over every phase,
stop boundaries, line resets, large expansion, source tabs/CR/Unicode/NUL,
invalid parameters, parent mismatch and unstable transport. Generated data is
correctness testing, never benchmark evidence. `independent.py` uses external
GNU expand 9.1 (including phase-shifted stops) and a separately implemented
Python parent reader, comparing to source files. `modal.py` rejects 22 supplied
misleading evidence shapes and a conjunctive Pareto claim lacking native or
runtime evidence; it is not a natural-language theorem prover. Any repair
requires rebuilding and rerunning the affected gates.

## F. Mechanism portfolio and novelty boundary

`portfolio.ts` freshly runs existing mechanisms on all 29 canonical sources;
`screen.ts` adds this new mechanism. Raw prices are screening only.

| Mechanism / concrete artifact | Established portion | Gap / falsifier / adversary |
|---|---|---|
| Periodic geometric stops / BEMATISMOS | inverse induction, unit + GNU expand | parent may cost more; phase and LF attacks |
| Fixed hole deletion / KENOMA | executable inverse assertions | overhead; irregular hole sizes |
| Punctuation context / HOMOSEMA | executable inverse assertions | full-parent price; literal collision |
| Affix numeral formatting / MEKOS | executable inverse assertions | irregular numeric spellings |
| Absolute position alignment / ARKESIS | executable inverse assertions | weak raw baseline; varying widths |
| Multiline run structure / STOIBAS | plans and priced raw screens only here | no new independent inverse assertion; escapes |
| Quoted linkage / SYNECHEIA | executable inverse assertions | grammar mismatch / unsupported carrier |
| Cross-hunk conservation / ISOSTATHMIA | executable inverse assertions | malformed hunks, native behavior |
| Indentation inheritance / PTYCHE, DIATHESIS | PTYCHE inverse, DIATHESIS plans | parent-specific grammar, not raw admissibility |

Prior stack audit includes STATHMOS (decimal zeros), PADTAB/PADTAB2
(absolute alignment anchors/free tails), TABMIN (table/transposition selection),
STELI/POLYSTELI (column layout), PLATOS (width), STOIBAS, ARKESIS and ISOSTATHMIA.
Periodic modular stops without a per-column schema are the local implementation
difference. This is not an exhaustive semantic equivalence proof over every
codec in the repository. Classical tabs preclude a research-novelty claim.

## G. Experimental boundaries

Fresh canonical workers use the existing X154 harness and X157 lane lists.
`compare-frontier.py` refuses partial/duplicate refreshes; `frontier-gate.ts`
checks complete prices, token IDs, transport and bounded readers. Unsupported
readers remain explicit. `local-leaders.py` describes fixture/token-class
leaders, not universally optimal codecs.

The isolated speed experiment reuses X157's coverage-loop fusion hypothesis,
not the failed streaming-regex change. A/B bundles differ only in summing
coverage inside the existing chunk pricing loop. Both reference BPE gates
are run. Whole-stack timing must run after competing benchmark workers exit;
parallel wall timings are not admitted as a speed claim. No speed patch is
installed in production merely because it is byte-correct.

## H–J. Research, reproducibility, disposition

See research.md and machine-readable receipts. No Lean toolchain or blind
native-chat endpoint was available; source inspection and software inverses
are not substitutes. Merge is authorized regardless of scientific outcome,
not certification of the requested Pareto result. No dependency manifest
changes are required. Generated bundles are ignored; builder is retained.

Commands: build TypeScript harnesses with esbuild `--bundle --platform=node
--format=esm`; run unit, independent, modal, portfolio; run trial with
`<source> <width> <receipt> [phase]`. Run canonical workers, then comparison
and frontier gate. Build speed bundles with `node bench/x158/speed-build.mjs`
and run `python3 bench/x158/speed-run.py` only in isolation.

## Final observed outcome

| Source | Incumbent | Complete candidate | Result |
|---|---:|---:|---|
| ps-aux-real, width8 phase6 | 980 | 1027 | loss47; byte-exact |
| code-ts, width4 phase0 | 949 | 997 | loss48; byte-exact |
| ps-real, width4 phase0 | 381 | 420 | loss39; byte-exact |
| ls-l-real, width4 phase0 | 1310 | — | timeout1800s; no complete result |

No advantageous new codec was established. The optional gate would retain each
incumbent above. Canonical29/29 unchanged at11962; software bounded-reader21,
eight unsupported. Unit15387; independent714; modal22. TypeScript passes;
first build killed under concurrent load, heap-bounded retry passes.

Coverage fusion ABBA12 calls: aggregate CPU ratio0.9999556763, wall0.9986189647.
The10% significance/nonregression gate FAILS; json-pkg regresses CPU2.41% and
wall2.06%. All12 wires equal the fresh frontier; each BPE arm passes6487 checks.
No heavy benchmark ran concurrently, although brief Python verification
intersected initial timing. No speed benefit is claimed; no patch deployed.
Native NOT_RUN, broad gains unestablished, full Pareto uncertified.

The highest-information next codec test is a mechanism that removes
reconstructible information the incumbent cannot already pool, rather than
another layout normalization. Repeating the same long listing trial without
a new hypothesis is lower value than testing a new independent everyday
holdout mechanism. A basic-chat endpoint remains necessary for the separate
native gate. User-authorized merge records this negative result, not success
on the unmet requirements.
