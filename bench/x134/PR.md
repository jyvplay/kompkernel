## Research draft — acceptance threshold not met; do not merge as a frontier advance

Adds experimental `allomorphFromFrontier` in `src/lib/omega/allomorph.ts`.
It introduces occurrence-conditioned aliases (`h=g`), retaining the original
name at other sites. Unlike global bijective renaming, one meaning has multiple
spellings. It uses the existing substitution decoder and remains **unwired**.

### Executed evidence

- Full canonical frontier: raw 28,015 -> **11,962** tokens on 29 lanes.
  Prior receipt was 11,961; only ls-real differs, 413 -> 414.
- ALLOMORPH: **−2 total**, kb-article −1 and ps-aux-real −1. Both accepted
  messages independently reconstruct source UTF-8 bytes with the existing
  CPython reader. Library tokenizer counts agree on 29/29 probe outputs.
- Stronger alias beam search reuses VELTISTOS and finds the same two wins.
- Eviction −1; specialization −5 (related grammar induction, not claimed novel).
  These are separate alternatives, not additive wins.
- Escaped Latin naming has no paying candidate; reversal/case-plane/line-order
  controls lose +6,319/+2,730/+1,000 before fallback.
- 34 adversarial unit cases pass; TypeScript no-emit compilation passes.
- Requested neighbor census: 4,493 glyph sites. Refreshed prose/ops/structured
  local leaders are recorded with actual wire-declared rule names.

### Important verification corrections

The baseline encoder's `.decoded` attribute matches on 29/29, but the independent
CHIRON reader directly recovers source on **19/29**; ten composed lanes require
additional parent inversion. This is not 29 independent full-message decodes.
Both new winning messages do independently decode to their source bytes.

No external LLM API reader was available or run. No whole-stack speedup was
established: the new search costs additional work. The baseline elapsed time
is not a controlled speed comparison. Corrects stale X133 comments claiming
retracted rule-drop gains, finite-window exactness, and a ~0.1-second search.

### Why this stays draft

The requested >10-token real-lane gain, significant stack speedup, and blind
model decoding gates are unmet. No substantial Pareto-superior result is claimed.
Live literature/lab review is explicitly bounded; no external Lean proofs were
executed, and no claim of exhaustive review or training-data novelty is made.

Formal A–J model, 18 failure shapes, six-mechanism portfolio, reproducible
experiments, and exact remaining gaps are in `bench/x134/README.md`,
`results.md`, `research.md`, and `receipts/summary.json`. The design abbreviation
and measured outcome are appended to `docs/codec-abbreviations.md`.
