## X144 + X144b: repair UTF-8 wire admission; preserve negative codec trials

The latest user request asks for an end-of-turn merge. This PR does **not** claim a new Pareto-superior codec or native LLM verification.

### Production change
TAGSTACK admits only UTF-8-transport-stable complete messages at its base comparator, ordinary/parent-relative/table candidate admission, and direct rewrite sites. Invalid source surrogates reject; raw identity remains available if no valid base parent survives. Existing inverse/token gates remain. This fixes X144's real Vite README defect: an emoji's surrogate halves had been separated between a grammar rule and body. The valid selected message costs 274 tokens instead of the unsafe 253. Drizzle and git-log are unchanged.

### Experiments retained, not deployed
- X144 PSIFIDA: 67 prices, zero frontier wins.
- X144b COLEX lexical-component reversal: 93 prices, zero frontier wins. New source module and independent inverse; unwired.
- Six mechanism tracks, fresh heldouts, scoped live research and individual lab-statement inspections. No exhaustive proof review or Lean replay claimed.
- Speed experiment compares two exact implementations of the repaired admission predicate, not the old unsafe stack. Deployment decision follows its recorded gate; no broad acceleration claim without evidence.

### Verification
- Fresh 29-lane frontier remains 11,962 tokens, message-identical to X144.
- 74,131 codec/transport assertions; 171,072 dual-predicate transport comparisons; six actual encoder attack fixtures plus memo/invalid-input tests.
- All 93 COLEX messages independently reconstructed in Python from emitted instructions/payloads.
- Final gate: 127 complete prices, 127 UTF-8 transport and tokenizer-ID round trips, 119 source-byte reads; eight inherited reader formats remain unsupported, not passes.
- Frozen native packets rehashed, but blind native evaluation remains NOT_RUN.

See `bench/x144b/README.md`, `REVIEW.md`, `research.md`, and finalized receipts. X144's older report is historical and is superseded specifically where X144b integrates the formerly opt-in guard. Neither losing new codec is wired into production.

Final speed decision: reject the regex fast path (B/A totals 0.97985, 1.03268,
1.02127). Production retains the straightforward surrogate scan. The experiment
patch remains reproducible; affected unit, admission, wire/source, compiler and
build gates were rerun after removing the fast path. TypeScript/build PASS.
