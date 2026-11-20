# X147 — HORION: exact threshold-derived CSV column

**Result: a new experimental codec with a narrow 12-token real-data gain. Full requested acceptance is NOT met; PR76 remains draft/unmerged.**

## Measured result

| Source / gate | Result |
|---|---:|
| Public seaborn geyser CSV, complete incumbent message | 787 tokens |
| Initial threshold composite | 835 (loses 48) |
| Final compact threshold composite | **775 (saves 12 / 1.52%)** |
| Fresh wrapper and independent Python source reconstruction | PASS |
| Canonical 29-lane frontier | **11,962**, all messages identical to X146 |
| Canonical lanes eligible for HORION | **0** |
| Fresh optional SCALAR Vite | **260** |
| Native basic-chat reading | **NOT_RUN** |
| Significant whole-stack acceleration | **NOT ESTABLISHED** |
| Overall Pareto / merge gate | **FAIL** |

The frozen public table has 272 observations. `kind` is exactly `short` when `waiting < 68`, otherwise `long`. HORION removes that column, compresses the surviving CSV with the existing parent, and transmits the restoration rule in-band. The relation was discovered on this dataset; it is **not a pre-registered unseen validation set**, despite the conventional `heldout/` folder name. It is not an everyday-prose win.

Source/provenance: `receipts/geyser-api.json`, `receipts/provenance.json`, SHA256 `ce8f6bd15967c9a3dee345aaf268f6b92623abb1e1d313e04d79b720aa6b8bd6`. No generated synthetic dataset is represented as real.

## Implementation

- `src/lib/omega/horion.ts`: bounded exact decimal predicate discovery, standalone in-band message reader, strict token fallback helper.
- `src/lib/omega/horion-frontier.ts`: optional full-parent comparison/composition and compact append-column envelope. **Not wired into defaults.**
- Existing bounded parent reader in `ekdysis-frontier.ts` is exported and reused; its decoding behavior is unchanged.
- Narrow novelty: ordered threshold instead of SYLLOGISMOS arithmetic/finite lookup. Repository-wide keyword search plus selected related-module inspection is **not** a proof of exhaustive novelty. Functional-dependency compression is established prior art.

## Verification and resources

986 unit assertions, 8 composite assertions, 5 final compact-specific mutation attacks. Final message and parent source-read in TypeScript and independent Python. Python checks frozen API bytes too. All 29 canonical messages have fresh price/UTF8/token-ID checks; **21** have supported message-only source reads and **8 inherited formats remain unsupported**. The added candidate is a separate successful source read; don't call all canonical outputs independently decoded.

One complete wrapper run: baseline/planning phase **219.506 s**, total **296.159 s**, CPU **287.373 s**; total/base-phase **1.349×**. These are shared-machine, one-call measurements, not isolated ABBA or a statistically significant comparison. They provide no speedup evidence. Planner-only diagnostic: ten geyser plans took 58.9 ms wall total; ten 29-lane rejection sweeps took 4.22 ms total. Neither is whole-stack acceleration.

TypeScript **PASS**. Initial build exited **137**, cause not established. Recorded retry with 1536 MiB Node heap: **PASS**. Manifests unchanged. Fresh frontier took 1,503,407 ms summed lane wall time; this is not an isolated speed comparison.

## Reproduce / inspect

`run.sh` contains a serial replay using frozen data. The combined script was syntax-checked, **not executed as a single run**; constituent gates were executed. The suite can take tens of minutes. `summarize.py` generates `receipts/summary.json`. Six executable alternatives/control representations are in `controls.ts`; detailed A–J and repaired-gate ledger are in `REVIEW.md`; fresh scoped research is in `research.md`.

Native gate: submit **only** `native/geyser.txt` to a fresh basic chat, without decoder tools, system skills or source examples. Save the unedited response and run `python bench/x147/native_check.py response.txt`. No model evaluation has been fabricated or replaced with the program decoder.

## Reconfirmed local leaders

| Category | Tokens | Leading body-token class |
|---|---:|---|
| Prose | 3429 | wordlike |
| Ops/tabular | 5580 | glyph |
| Code/structured | 2636 | wordlike |
| Other | 317 | no shared tape leader |

These are local body-token classifications, not universal optimality claims. The default frontier is unchanged.

**Next highest-information gate:** the fresh-chat byte test above. A second independently sourced threshold table and isolated end-to-end timing would then test breadth and cost. The requested general native-readable, significantly faster Pareto-superior codec remains unachieved; a 12-token discovery win does not authorize merging.
