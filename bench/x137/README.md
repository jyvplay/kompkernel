# X137 — KREMA hanging-layout experiment

**Status: implemented, unwired; compression gate partly passes, mandatory Pareto/native gates do not. No merge.**

## Measured results

Fresh shipped frontier: **29 lanes, 11,962 tokens, 897,526 ms**; all 29 emitted
messages equal the repaired X136 baseline. Encoder-reported decoded bytes equal
source on 29/29; independent Python CHIRON/STELI coverage remains **21/29**.
The other eight are unsupported by that reader, not declared corrupt. This is
separate from the unwired PTYCHE 11,950-token comparator.

| Experiment | Baseline | Candidate | Difference |
|---|---:|---:|---:|
| Canonical Node help, overflow KREMA | 846 | **831** | **−15** |
| Canonical Node help, marked KREMA | 846 | 853 | +7 |
| Canonical Node help, existing WRAPCANON control | 846 | 863 | +17 |
| Fresh capped Node help, overflow | 844 | **822** | **−22** |
| Fresh capped Node help, marked | 844 | 841 | −3 |
| Fresh capped Node help, WRAPCANON | 844 | 861 | +17 |
| Fresh Git help, overflow | 464 | 508 | +44 |
| Fresh Python help, overflow | 535 | 574 | +39 |

Fresh ls help was ineligible. Canonical LLM answer, package JSON and TS-code
trials lost. Every priced new-layout trial recorded source equality. The
independent Python message-only inverse checks **19 overflow/fast/refined
messages**, not a model's behavior. Unit harness: **81 checks**. `tsc --noEmit`
passes. No package-manifest changes.

The four held-out files were captured from actual installed commands, preserved
in full, then capped at 120 lines before measurements. Policy, hashes and
versions are in receipts. **The fresh Node help heavily overlaps the canonical
fixture; it is not evidence of broad independent generalization.** Width 69,
margin 30 was selected by the same bounded coverage heuristic, not hand-injected
into the encoder. Nearby width trials lose on canonical Node help.

An offline strict-price selector over shipped baseline plus these KREMA trials
is **11,947 tokens**. This is not a production benchmark or a free selector.
The PTYCHE candidate remains separately 11,950; a combined 11,935 sum would be
an unmeasured composition and is not reported as a new executed frontier.

## Runtime: do not mistake the saving for Pareto dominance

Actual public full-parent API, including search and rejections:

| Source | Baseline ms | Additional ms | Total ms | Parent calls | Result |
|---|---:|---:|---:|---:|---|
| Node help | 20,677.8 | 45,147.8 | 65,825.6 | 3 | 846→831 |
| LLM answer | 12,115.7 | 35,282.7 | 47,398.4 | 2 | rejected, 664 retained |

Other experiments ran concurrently during parts of these measurements. Therefore
these are observed end-to-end costs, **not a controlled speed ratio**. Added
candidate work is substantial; the lower fresh 29-lane baseline time versus
X136 is also not attributed to a codec speedup.

A separate `kremaFast` arm uses CHIRON without block operators, at most two
alphabets, then existing SYNARMOGE refinement. It does not compute TAGSTACK or
claim its quality: canonical Node help **841** (~7,055 ms), fresh Node help
**832** (~5,874 ms), gains only 5 and 12 versus their baselines. These are
exploratory timings, not whole-stack controlled acceleration. The public
frontier arm and fast arm are both unwired.

## Representation and novelty

KREMA preserves a literal label/padding prefix and greedily wraps the description
relative to its current column, with an independent hanging continuation margin.
Overflow mode activates only on lines longer than W; original long literal
lines receive an escape. Marked mode explicitly annotates each folded run.
Full-wire pricing, not raw newline removal, decides admission.

**Overflow triggering plus literal escape already exists in WRAPCANON.** The
added operation is prefix/current-column hanging reflow, not that trigger, not
a new compression genus. Existing WRAPCANON, given the same full parent and
fused-contract advantage at W=69, cannot fold either Node source (folded text
unchanged); paying its contract loses 17 tokens. This rules out that concrete
control, not every possible equally tuned old-codec composition.

All 360 top-level omega TS files were hashed and lexically screened in
`novelty-inventory.json`. Targeted layout-family inspection does not constitute
an all-codec semantic equivalence proof. Strong novelty acceptance remains open.

## Artifacts and reproduction

- `src/lib/omega/krema.ts`: plans, inverses, search, strict frontier selector,
  separate fast arm.
- `screen.ts`, `probe.ts [--heldout] [--overflow]`: eligibility and full-wire trials.
- `unit.ts`, `coldread.py`: mechanical/adversarial and independent-byte checks.
- `control.ts`: equally fused existing wrap control on both Node sources.
- `fast_parent.ts`, `refine.ts`, `fast.ts`: cheap-parent progression, including losses.
- `endtoend.ts`: real baseline plus public extension, admission and rejection.
- `frontier.ts`, `summarize.py`, reused `bench/x134/leaders.ts`: fresh baseline,
  offline selector, category census.
- `receipts/candidate-message.txt`, `native-trial.json`: 831-token blind test
  package, explicitly **NOT RUN**. No tools or additional decoder instructions
  may be supplied to that native trial.
- `REVIEW.md`: A–J evidence boundaries and falsifiers. `research.md`: scoped
  current papers/lab audit, with fetched primary GitHub texts.

Bundle TS using `node_modules/.bin/esbuild bench/x137/NAME.ts --bundle
--platform=node --format=esm --outfile=bench/x137/NAME.mjs`, then run Node.
Bundles are ignored. Frontier overwrites its receipt; probe held-out baselines
append (the file contains repeated deliberate measurements). Run Python
coldread/summarize after receipts exist. No model invocation or formal proof
build is hidden in these commands.

## Next decisive work

1. Execute the blinded one-message 831-token trial on an available native model,
   retain unmodified response/model/version, compare ground-truth bytes. Also
   retain the previous PTYCHE 608-token native trial as a separate question.
2. Freeze genuinely different hanging-layout prose/ops sources before selection;
   compare equally tuned prior layout compositions, not only WRAPCANON W=69.
3. Only if behavior and breadth pass, run isolated interleaved end-to-end A/B
   including planning, fallback and rejection. Current results do not justify
   default integration, PR promotion, or merge.
