# X140 — expanded-rule images, source preconditioning, and an exact cache experiment

**Implemented and tested; no accepted Pareto winner. No merge performed.**
EIKON is a new experimental module, not a successful replacement for APOTOME or
the shipped frontier. The requested >10-token useful gain, native single-message
model verification, and significant whole-stack acceleration remain unmet.
PR74 was checked and remains OPEN/DRAFT on the current branch.

## What changed

- `src/lib/omega/eikon.ts`: acyclic transformations of fully expanded rules,
  source-independent decoder, whole-wire best-improvement search including pairs.
- Source-mined image dictionaries, matched ordinary-grammar controls, interior
  views following X139's next test, and whole-parent source-alphabet preconditioning.
- `count-memo-generations.ts`: equal-key-budget two-generation memo experiment.
  The **production hook was removed** after negative timing. The helper is unwired;
  `memo-experiment.patch` / `build-memo.sh` preserve reproducibility.
- Fresh frontier/leader receipts, independent readers, adversarial tests, and
  bounded live research with deeper individual lab statement audits.

No package manifests changed. No new codec/default optimization was wired into
TAGSTACK. No commits or merge were made. Earlier X134–X139 working-tree changes
were preserved. `bpe.ts` is restored to its exact pre-X140 state.

## Fresh frontier and category leaders

Same flags as X139: `OMEGA_DET=1 OMEGA_NO_MEMO=1 OMEGA_ENGRAM=0
OMEGA_OURA_MEMO=0 OMEGA_NO_OROTHESIA=1`, o200k_base, remaining defaults.
All29 messages are byte-identical to X139; **11,962 tokens** total.
Recorded time **1,202,593ms** includes concurrent benchmarking and is NOT causal
speed evidence. Full source bytes checked; independent Python scope covers21/29
canonical lanes and both new heldouts. Eight composed contracts remain outside
that independent reader, explicitly listed in `frontier-independent.json`.

| Category | Lanes | Raw tokens | Frontier tokens | Largest classified body component |
|---|---:|---:|---:|---|
| Prose | 5 | 5,856 | 3,429 | word-like:1,629 |
| Ops/tabular | 16 | 17,278 | 5,580 | glyph-bearing:1,202 |
| Code/structured | 4 | 4,152 | 2,636 | word-like:945 |
| Other | 4 | 729 | 317 | no grammar tape |

These classes describe residual body tokens, not lower bounds. Per-source
census: `receipts/leaders.json`. No category's shipped leader changed.

## Compression results

| Experiment | Trials | Wins vs shipped parent | Other observations |
|---|---:|---:|---|
| EIKON, unchanged canonical dictionary | 16 eligible of29 | 0 | +495 tokens collectively |
| EIKON, two new documentation holdouts | 2 | 0 | dotenv502→533; next620→651 |
| Jointly mined ordinary/image dictionaries | 37 paired trials | 0 in either arm | identical values/budgets; no accepted images |
| Interior views, canonical/source-mined dictionaries | 45 | 0 | JSON overhead included; no accepted cuts |
| Full-parent source involutions | 12 | 0 | six-map screening, top2 on six sources |
| Existing positional delta control | 29 | 0 | standalone, not full-parent composition |
| Brotli/base64 and positional-copy controls | 29 each | 0 | exact program inverses, not native evidence |

All EIKON searches accepted **zero image operations**. The real-message inverse
checks therefore do not demonstrate successful image use on real documents;
seven targeted mechanics fixtures and the unit suite exercise the operator.
EIKON is not presented as globally novel mathematics. Its distinction from
APOTOME is character transformation rather than substring selection; MORPH,
STENTOR, line-edit and template codecs are acknowledged close relatives.

Two heldouts are first100 lines of installed dotenv/next README files, frozen
before any encoding. SHA256, exact package versions and provenance are in
`receipts/heldout-policy.json`. These are small transfer tests, not evidence of
population-level generalization.

## Verification

- **11,740** EIKON unit checks passed, including hidden cycles, nested images,
  forward references, ASCII/Unicode case boundaries and simultaneous replacement.
- Independent Python reconstructed **55 image-arm messages**, **37 ordinary-arm
  messages**, **45 interior-view messages**, and **12 source-swap messages** exactly.
  These are trial events, not that many distinct source files.
- Independent frontier reconstruction: **21 canonical +2 heldout**; eight canonical
  contracts explicitly unsupported. The shared TypeScript reader reaches the same
  supported count but is not an independent decoder implementation.
- **180 reference-tokenizer full-message prices** checked.
- **2,714,749 cache/counter checks** passed, mostly cache lookup probes rather than
  distinct tokenizer inputs. Both supported encodings, budget shrink/zero, oversized
  strings, BOM and surrogate adversaries were checked. Seven invalid-budget attacks
  were added after repairing constructor validation.
- Final TypeScript compilation and `git diff --check` passed.
- **Native LLM decoding: NOT RUN.** No source-free blind-model response was obtained.
  Source-aware reasoning and executable inverses cannot substitute for that gate.

## Isolated full-stack speed result — rejected

After all other benchmark processes exited, the speed harness warmed each
source once, then ran ABBA/BAAB with identical cache resets, four samples per arm.
Each run recomputed TAGSTACK, not merely token counts. All16 messages and sources
matched. A=existing cache, B=two-generation cache, equal2M key-character budgets.

| Source | A median ms | B median ms | Total B/A |
|---|---:|---:|---:|
| KB article | 4,515.23 | 4,523.94 | 1.0030 |
| LLM answer | 11,897.29 | 12,275.16 | 1.0302 |

No significant speedup is established. The result does not justify changing the
default cache; its hot-path modifications were removed. These timings are a
small controlled negative sample, not a universal slowdown theorem. The earlier
CPU profile was collected concurrently and is only a hotspot guide, not an
isolated latency comparison (`profile-top.json`).

## Reproduction

After the repository's existing dependencies are installed:

```sh
node_modules/.bin/esbuild bench/x140/unit.ts --bundle --platform=node --format=esm --outfile=bench/x140/unit.mjs
node bench/x140/unit.mjs
python3 bench/x140/coldread.py
python3 bench/x140/verify_controls.py
python3 bench/x140/verify_frontier.py
python3 bench/x140/summarize.py
npx tsc --noEmit
```

Harnesses `probe.ts`, `joint.ts`, `interior.ts`, `precondition.ts`, `heldout.ts`,
`final_gate.ts` and `frontier.ts` bundle with the same esbuild flags. The frontier
harness overwrites its receipt; heldout baseline/screen harnesses append, so move
existing receipts aside before deliberately repeating a run to avoid duplicate
trials. Generated mjs bundles and CPU profiles are ignored.

For the rejected speed experiment, run `bash bench/x140/build-memo.sh` to build
standalone `memo_unit.mjs` and `speed.mjs`; it temporarily applies the retained
patch and reverses it on exit. The TypeScript harnesses deliberately refuse to
run against an unpatched counter. Run `node bench/x140/memo_unit.mjs`, then
`node --max-old-space-size=1800 bench/x140/speed.mjs` with other benchmarks stopped.
No repository branch switching is involved.

`npm ci --ignore-scripts` reported four dependency advisories (3high,1critical).
No silent audit-fix or package update was made; this is not a security audit.

## Research, novelty and remaining gap

`research.md` records new author-hosted CoCo-trie material, contracting-SLP
results, HRLZ, and deeper OpenAI/Anthropic ETH interfaces, DeepMind trusted
semantics, doubleAI certificate boundaries, Axiom and Harmonic formulation
issues. None of the external proofs was locally kernel-replayed. The work is not
an exhaustive proof audit of every lab. Imported asymptotics are not speed data.

The363-file lexical inventory covers every then-existing top-level omega TS
file; final364-file hash manifest adds the memo helper. Neither is a semantic
novelty proof. Legacy modules' unqualified 'terminal', 'Pareto' or native-readable
comments are not adopted as verified claims in X140.

The exact remaining gap is a useful real-source price winner plus blind native
behavior and measured full-cost advantage. Next high-information test: identify
long transformed phrase families in a prospectively frozen everyday corpus and
measure whether their maximum achievable tape savings can pay the image contract
before spending another full-parent search. For existing price-winning KREMA or
PTYCHE messages, the missing high-information test is still a real blind model
trial—not another source-aware decoder. See `REVIEW.md` for the complete A–J ledger.
