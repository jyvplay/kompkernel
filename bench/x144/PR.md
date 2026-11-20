## X144: digit-plane codec experiment and UTF-8 wire defect

This is a **draft**, not a Pareto-superior/native-verified codec release. Do not merge under X144's conditional merge instruction.

### Added
- Unwired PSIFIDA codec: width-bucketed decimal digit-position transposition with a source-position skeleton and a complete inline inverse.
- Unwired UTF-8 transport guard with conservative raw fallback; regression test for emoji surrogate halves split across an existing grammar's rule/body.
- Six mechanism tracks, frozen heldouts, independent readers, resource/quantifier review, scoped live research, refreshed category leaders and codec specifications.

### Measured
- Fresh canonical frontier: 29 lanes / 11,962 tokens; all messages identical to X143b.
- New codec: 67 complete prices, zero frontier wins. Remains experimental/unwired.
- 3,041 codec assertions; 323,192 counter differential checks; 65,581 transport assertions.
- Independent Python candidate replay: 65 exact, 2 unsupported.
- Final gate: 99 prices, 88 supported source-byte reads, 10 unsupported, **one unsafe heldout baseline wire**.
- Vite README's baseline is in-memory exact but fails UTF-8 wire transport. Guarded raw fallback costs 274 instead of unsafe 253 tokens. The default selector is unchanged; integration still required.
- 24 isolated whole-stack streaming-tokenizer timings: approximately -0.85%, +0.49%, -0.61%; fails the declared 10% speed gate. Patch preserved only as experiment; production tokenizer unchanged.
- TypeScript and serial application build pass. First concurrent build timed out under memory contention and was stopped; log retained.

### Remaining gates
Native LLM reading NOT_RUN; Lean replay NOT_RUN; exhaustive novelty/lab-proof review not claimed. Neither the requested new Pareto superiority nor significant broad stack acceleration was achieved. Correctness priority: reject transport-unsafe candidates during selection, then rerun affected gates. Behavioral priority: real blind single-chat evaluation of frozen KREMA/PTYCHE packets.

See `bench/x144/README.md`, `REVIEW.md`, `research.md`, and `receipts/summary.json`. `run.sh` is a serial reproducer; it was assembled from the individually executed commands, not itself rerun in this turn.
