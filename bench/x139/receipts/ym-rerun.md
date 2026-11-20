# Reproducing the checks

The runner needs only the files in this submission package, public pinned dependencies, and installed build tools. It does not read a sibling checkout or require access to the group's other private repositories. It leaves `submission/` source files unchanged and writes each run into a new directory under this package's `runs/`.

## Prerequisites

Use macOS or Linux with Git, Python 3.10 or newer, [Elan](https://github.com/leanprover/elan), and the native build tools required by Lean. On macOS these include the Command Line Tools. Put Elan's `bin` directory on `PATH`. No Python packages are needed.

Internet access is needed initially to obtain the pinned Lean toolchains, Mathlib dependencies/cache, and Comparator tools. The first build is substantial: the recorded October source build took approximately three hours on the recorded Mac, using a Mathlib cache but no existing project build. Allow considerable disk space; a local completed October dependency and build tree occupied about 52 GiB, and tools and Comparator temporary files require additional space. Resource use varies by platform. `LEAN_NUM_THREADS` can be set to limit concurrency.

The submission and our checks use **Lean 4.32.0**. The pinned Comparator itself uses **Lean 4.34.0**, and its exporter targets **Lean 4.32.0**. Those versions serve different roles. Do not replace the submission's toolchain or run `lake update` to upgrade its dependencies.

## Complete replay from a fresh clone

From this submission package's root (`submissions/openai-20261028/` in the repository):

```sh
python3 scripts/verify.py integrity
python3 scripts/verify.py all
```

The full command performs these steps in order:

1. Check every original submitted file, the imported review modules and the packaged verification inputs against their hashes. Compare the four independent OS declarations with the bundled upstream snapshots.
2. Download the pinned dependency cache, check dependency Git revisions, and run `lake build WilsonReference WilsonConstruction` in `submission/`.
3. Compile the 43 review modules into a fresh object directory, require zero warnings, and audit the 13 expected declarations for unapproved axioms.
4. Fetch and build Comparator and `lean4export` at the commits in `verification/tool-pins.json`.
5. Run the four Comparator controls. A rejected negative control is a success only when the expected diagnostic is also present.
6. Run Comparator on `YangMills.jointExistence`, `YMReview.Acceptance.combined_acceptance`, and `YMReview.OPE.constructed`, each against its own reference statement.
7. Recheck the input hashes and save the result, commands, tool information and logs.

The runner prints the path of its `result.json`. A completed successful run has `status: "passed"`. A stopped or failed run is not a successful verification; inspect the stage log named in the record. Do not replace historical evidence with a new result without retaining its date, inputs and scope.

## Running individual stages

These commands create separate evidence directories. They are useful when resuming after a dependency download failure or examining one check:

```sh
python3 scripts/verify.py build
python3 scripts/verify.py review
python3 scripts/verify.py tools
python3 scripts/verify.py controls
python3 scripts/verify.py comparator --target submission
python3 scripts/verify.py comparator --target acceptance
python3 scripts/verify.py comparator --target ope
```

`review` needs an already built submission. It always builds fresh review objects. `comparator` needs built tools and can reuse the submission build; it creates a fresh review project and runs the controls before the requested endpoint. `prepare` only creates that review project and does not claim a compilation or Comparator result.

Optional arguments are `--lake /path/to/lake`, `--tools-dir /path/to/pinned/tools`, `--source /path/to/exact/submission`, and `--run-dir /path/to/new/output`. The runner uses `runs/cache/mathlib` for downloaded Mathlib cache files by default; set `MATHLIB_CACHE_DIR` to reuse another writable cache directory. The source override must match every original input, including its reports. Tool overrides must have the pinned commits and no tracked modifications. Generated Lake manifests may contain absolute paths for that run; no such machine-specific path is required in the committed configuration.

A run with an existing submission build is incremental, and the result records that fact. For an independent source rebuild, use a new clone with no `submission/.lake/build` directory. The Mathlib cache can still be obtained normally. Keep the original import manifests unchanged. Intentional revisions to the review sources require a new documented snapshot and hashes; the integrity check should not be disabled to accommodate edits.

## What Comparator does, and the platform limitation

The pinned tool compares the solution with the reference statement, checks reachable definitions and permitted axioms, and rechecks the exported solution with its default Lean kernel. The exact configurations are in `verification/`. Reference placeholders and deliberately forbidden axioms in the negative controls are expected; they are not admissions in the solution endpoints.

Our portable runner deliberately reproduces the recorded macOS mode: upstream `scripts/fake-landrun.sh`, with no external kernel. This launcher does **not** provide the Linux/Landrun isolation used by Comparator for adversarial submissions. The recorded runs therefore establish the documented statement/definition, axiom and kernel checks in that environment; they do not establish that hostile compilation was isolated. Read the [pinned Comparator instructions](https://github.com/leanprover/comparator/blob/d03acab154d269c06e60e4de7e4cc85deebff94b/README.md) before arranging a separate isolated Linux run or an additional-kernel check. Record either as a different verification mode.

## Warnings and human review

The original build has 2,453 recorded warnings, summarized in `evidence/historical/build/warning-summary.json`. Most concern unused variables, section variables, simplifier arguments or tactics; 66 are deprecations. One warning is the intentional reference `sorry`. These are distinguished from admissions in the proof's dependencies by the axiom and Comparator checks. New source-build logs are retained without silently discarding warnings; our review modules are required to compile without warnings.

Reproduction checks the formal statements that are actually present. It does not replace expert review of their definitions or establish a physical claim absent from those statements. The group's [assessment](../../../docs/assessment-1.pdf) describes that review and its conclusions.
