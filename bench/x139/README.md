# X139 — expanded-rule views and joint dictionary mining

**Status: implemented experiment, no accepted winner. Draft PR 74 remains open;
no merge performed.** APOTOME is deliberately not wired into the default path.
The requested new Pareto-superior codec and significant whole-stack speedup
remain unmet. Native single-message model behavior is NOT RUN.

## Results

| Test | Observed result |
|---|---|
| Fresh shipped frontier | 29 lanes, 11,962 tokens, all messages identical to X138; 1,198,254ms |
| APOTOME canonical | 16 priced of 29 inputs; zero wins; aggregate +335 tokens |
| APOTOME heldout | graceful-fs 639→660; escalade ineligible |
| Pair-search extension | 1,684 probes across eligible canonical/heldout; zero accepted moves |
| Joint dictionary mining | 72 ordinary/overlap trials across canonical and distinct heldout; zero wins |
| Independent message-only implementations | APOTOME 17 exact; joint dictionary trials 72 exact |
| Unit assertions | 10,139 passed, including simultaneous cycle-breaking cuts |
| Standalone numeric delta control | 29 exact, zero wins; not parent composition |
| TypeScript / diff whitespace | passed |

Inputs, flags and source comparisons are retained in executable harnesses and
`receipts/`. `summarize.py` requires 29 completed frontier rows and byte-compares
all sources, compares every message with X138, and writes `summary.json`.
The broader frontier source comparison uses its recorded decoder output; the
independent reconstruction counts above are separate and must not be conflated.
No independently verified native-model result exists.

## Isolated timing

After frontier and heldout processes ended, `endtoend.ts` recomputed full parents
in AB/BA order for KB and LLM-answer, twice per arm. All eight rows retain the
same parent message, and all B trials reject APOTOME. Added extension work:
KB 10.19/4.02ms; LLM 42.49/19.59ms. First-run parent times are conspicuously higher;
lower B aggregate times do not establish acceleration. No optimization has been
wired, no significant whole-stack speedup is claimed. The full frontier runtime
above was not isolated and must not be compared causally with previous turns.

## Mechanism and limits

`src/lib/omega/apotome.ts` permits signed prefix/suffix references to expanded
rules with explicit framing and whole-graph cycle checks. It performs bounded
full-price greedy search, including pairs from a top-12 proxy pool. Real trials
accept no views: targeted adversarial unit examples, not these real outputs,
exercise the new operation. This distinction is important when interpreting
the independent source-exact count.

Joint mining extends the experiment on existing SYNAPHE, not the inventory of
new codecs. Equally budgeted ordinary concatenation is a required control.
The 362-file lexical/hash inventory is a reproducible screening aid, not an
exhaustive semantic novelty certificate. Collage-system ancestry is acknowledged.

Fresh leader census is `receipts/leaders.json`: PROSE 3,429; OPS/TABULAR 5,580;
CODE/STRUCT 2,636; OTHER 317. No shipped leader changed. The new documentation
holdouts favor their shipped parent over APOTOME and KREMA.

## Audit and reproduction

- `REVIEW.md`: formal objects/access/resources, quantifiers, H+/H−/H∂,
  twenty false-solution shapes, eight mechanism families and specific attacks.
- `research.md`: fresh primary-source scope audit; inspected source is not a
  locally replayed proof. Dates are evaluated against the session date,
  2026-11-14; later-dated claims are not accepted as contemporaneous evidence.
- `receipts/reference-prior-occurrences.json`: bounded prior-reference scan;
  YM is a revisited source, not a first-ever repository citation.
- `docs/codec-abbreviations.md`: APOTOME design/search limits and updated leaders.

Harnesses bundle with esbuild (`--bundle --platform=node --format=esm`) then run
under Node; generated mjs files are ignored. Python readers need no third-party
packages. `npx tsc --noEmit` passed after the pair-search patch. Package manifests
were not changed. Installed dependency audit reported four advisories; none was
silently upgraded.

Next high-information test is prospectively budgeted source-mined view
dictionaries/interior slices versus ordinary containment factoring. First test
whether gross tape savings can pay the contract before expensive parent runs.
Existing KREMA/PTYCHE candidates still need blind native evaluation; another
program inverse cannot meet that acceptance criterion. Negative search results
are not an impossibility theorem and do not fulfill the requested winner gate.
