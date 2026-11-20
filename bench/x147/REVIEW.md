# X147 A–J adversarial review

## A — Statement and quantifiers
Let D be stable-UTF8, unquoted LF rectangular CSV, 8–1000 data rows, 2–16 columns, ≤40,000 UTF16 code units; numeric predictors are signed canonical integer parts with ≤30 digits and optional 1–30 fractional digits. The implementation conservatively excludes all surrogate code units, including valid supplementary characters. D is a restricted subset, not all natural text.
For every admitted plan p on x∈D, require `read(message(p)) === x`, including raw numeric spelling, row order, header placement, empty values and final-LF status. A threshold plan exists only when one numeric column separates exactly two labels without a tied numeric value crossing labels. Quantification is over observed rows, not future data/generalization.

Complete o200k_base message costs include all instructions and metadata. Optional selection returns a candidate only if source-exact and strictly cheaper than the supplied/full TAGSTACK parent. Parent fallback exactness remains an inherited obligation, not proven for all formats here. The user acceptance also requires independently tested basic-chat reading, significant full-stack speed and broad usefulness; those do NOT follow from the token gate.

## B — Resources and greediness
At most 16×15 ordered predictor/target pairs, each at most 1000 rows. Sorting is O(C² R log R); comparisons use bounded BigInts (not float rounding); serialization/pricing adds O(C² N) work in the worst eligible case. No timing deadline changes the result. Parent composition searches only the cheapest standalone plan, at most one additional parent call; this is greedy across representations, NOT globally optimal. The inherited parent search is substantially more expensive and is not bounded by this local analysis. Reader caps are 41k message and 40k restored characters; the reused parent reader has its own 100k expansion/128-rule caps. No practical whole-stack acceleration is proved.

## C — H+, H− and boundaries
H+: a compact numeric predicate can replace repeated categories with less metadata than a value lookup. H−: existing parents already compress those labels and threshold instructions erase all gains. Real geyser data supports H+ narrowly after contract repair: 787→775. Initial 835 supports the importance of H−. No canonical lane is eligible. A single conflicting row, equal-value/conflicting labels, three categories, quoted fields, CRLF, multiline CSV, exponents, oversized numerals or row limits makes the plan unavailable. Duration is NOT a predictor in this dataset: class ranges overlap. Waiting is separable at 68. This is discovered on this source, not a pre-registered holdout validation.

## D — Six executable branches
`controls.ts` saves complete messages and exact source reconstruction for six mechanisms in `receipts/controls.json`:
1. Threshold predicate: initial standalone 1874; revised composed 775. Proved only finite tested reconstruction/prices. Falsifier: one contradicting label or clean-chat byte failure.
2. Finite lookup: 2023. Existing SYLLOGISMOS family, not novel. Gap: full parent/native comparison absent. Falsifier: overhead exceeds incumbent (it does standalone).
3. Run lengths: 2756. Exact run expansion. Gap: native untested. Falsifier: frequent alternation/high overhead.
4. Sparse row exceptions: 2023. Exact positions. Gap: no parent composition. Falsifier: dense exceptions.
5. Binary label stream: 1917. Exact symbol mapping. Gap: custom mapping/native behavior. Falsifier: symbol alignment error or overhead.
6. Brotli/base64: 868. Program inverse exact. Gap: opaque decoder and no native test; not an accepted solution. Falsifier: inability to reconstruct with sole basic-chat message.
These are controls, not six new inventions and not six proof-certified solutions.

## E — Eighteen invalid solution shapes
1. Raw-token saving without parent comparison. 2. Omitted contract price. 3. Discarded final LF. 4. CRLF normalization. 5. Floating-point threshold rounding. 6. Ignoring a contradictory row. 7. Encoder `decoded` as sole oracle. 8. Private table needed to decode. 9. Program inverse mislabeled native behavior. 10. Trained vocabulary assumed preinstalled. 11. Brotli decoder hidden in tools. 12. Existence of some decoder promoted to this model's ability. 13. Discovery source called unseen validation. 14. Shared-load timings called isolated speed gains. 15. Conditional token fallback called runtime Pareto dominance. 16. Failed build called passed. 17. Reading a Lean file called kernel certification. 18. Fixed-width existential machine treated as a uniform all-width solver. `gates.py` explicitly rejects the modal shortcut; its assertion is a bookkeeping safeguard, not a behavioral theorem.

## F — Candidate-specific attacks
986 unit assertions include rotated source/target placement, large exact decimals, negative zero, negative fractions, missing LF, invalid metadata/indices, conflicting tied numeric values, malformed CSV/UTF16, and bounds. Composite tests add unsupported envelopes, expansion size, ambiguous headers, and real contradictory rows. Final compact-envelope attacks target punctuation, threshold lexical validity, missing predictors, and duplicate predictor names. The final message and baseline are source-read in both TypeScript and independent Python; Python uses Decimal and a separately implemented grammar decoder.

## G — External verification and downgrade
Fresh real-source API bytes/provenance retained; their decoded bytes and SHA256 are checked against the frozen file. Python independence is implementation independence, not a separate person/model audit. No external expert, clean-chat reader, Lean replay or independent agent was used. Native test packet and strict byte comparator are prepared, status NOT_RUN. No invented execution. The supplementary code-only checks do not discharge native comprehension.

## H — Repair ledger
Initial composite 835 loses by48. Specific append-column contract reduces cost to775; does not change observed threshold or payload. Only identifier labels/headers and unique predictor header qualify; numeric comparison remains exact in the program reader. Compact parser punctuation and decimal syntax were tightened before the final tests. Standalone fallback is evaluated before a possibly unsupported composite, and the composite reader explicitly supports standalone messages. Rebuilt/reran unit, composite and final source/transport gates after changes; five compact-specific mutation attacks passed. Full-wrapper integration is recorded separately, not inferred from repricing. First build exited137 under concurrent workloads; cause not established. A retry must have its own receipt, not erase the failure.

## I — Obstructions and next highest-information test
The finite count 95^100 > Σ(i=0..10) 1,000,000^i rules out universal injective compression of that finite domain into ≤10 tokens under that vocabulary bound. It does NOT show HORION or TAGSTACK is optimal or that useful special-case wins are impossible. Most informative missing test: give `native/geyser.txt` alone to a fresh basic chat, save unedited response and use `native_check.py`. Any byte mismatch blocks acceptance. A second independently sourced threshold table and separate isolated end-to-end timing design are needed before breadth/runtime claims.

## J — Decision
A new experimental repository codec and a narrow 12-token source-verified real-data gain exist. This does not satisfy the requested general everyday-prose/ops gain, demonstrated native reading, or significant whole-stack acceleration. No general Pareto-superiority claim. PR76 must remain draft/unmerged under the conditional-merge instruction. The user's full requested outcome is still unmet; no acceptance criteria have been weakened to manufacture success.
