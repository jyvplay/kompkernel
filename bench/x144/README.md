# X144 — PSIFIDA, digit-position weaving

**Experimental; not a verified native/Pareto winner.** See `receipts/summary.json`
for finalized measurements and `REVIEW.md` for formal gates and six tracks.

## New repository module
`src/lib/omega/psifida.ts` gathers maximal ASCII digit runs of one selected width
(2–12) from arbitrary text, transposes their characters into digit-position
columns, and keeps a `~` hole at each original position. This is not METABOLE's
lexical suffix copying and not field/record-column transposition. It is a
repository extension of classical shuffle coding, **not** a new mathematical
primitive or certified exhaustive novelty claim. A hash inventory and targeted
search record the scope of the audit.

The inverse reads the first line as equally long digit columns, transposes them,
and inserts the successive rows into successive holes. Source bytes, leading
zeros, separators, signs, CR/LF, and Unicode outside ASCII digit runs are not
normalized. Exactness invariant: the ith hole receives exactly the ith selected
source digit run; all other code units remain in order. No arithmetic conversion
of the numbers occurs. Input/expanded strings are capped at 50,000 UTF-16 units,
columns at 12, selected runs at 10,000. A marker collision refuses transformation;
a reserved full instruction envelope is rejected by the standalone encoder.

Non-greedy standalone search: enumerate all 11 widths, choose lowest complete
message price, admit only below raw identity. This does **not** mean below
TAGSTACK: the separate benchmark compares against the actual shipped frontier.
Parent trials: cheapest standalone plan per source, top six by raw folded-token
savings; one plan per each frozen heldout source. This is a heuristic allocation,
not an exhaustive parent optimum or safe bound on omitted candidates. CPU-bound
O(11L) scans plus tokenizer calls; parent search dominates and has only inherited
work budgets. Folded character length is exactly L + number-of-holes + width;
that expansion alone is not a token-cost lower bound.

## Representation and speed experiments
Six separate tracks rerun: digit planes; literal/backreference copying;
Brotli/base64; numeric differences; transformed-phrase images; paragraph layout.
Only the first is a new codec module. Binary decompression is a negative-access
control, not a native-readable deliverable. Frozen PTYCHE/KREMA packet hashes
were reconfirmed; no blind evaluator was available, so native remains NOT_RUN.

An isolated experimental patch streams pre-token matches rather than materializing
and walking a match array. It changes no tokenizer vocabulary or merge ordering.
The broad reference differential audit passed 323,192 strings before timing. Timings follow one unmeasured warmup per lane with persistent deterministic chunk caches; they measure full encoder calls, not cold process startup or native decoding latency.
`build-speed.sh` applies the patch only to build benchmark bundles and then
restores production. Isolated ABBA/BAAB whole-stack timing determines whether it
is deployable; concurrent frontier/parent wall times are not speed evidence.

## Validation and repairs
`unit.ts` checks 3,041 assertions across 1,010 generated plans and explicit attacks.
`verify.py` independently decodes actual emitted messages in Python. Both final
readers classify unsupported parent formats rather than treating them as passes.
The final gate was hardened to decode the actual emitted wire instead of trusting
an auxiliary `parentMessage` field; a mismatched auxiliary-payload attack was
added. The UTF-8 gate rejects replacement-character normalization of invalid
bytes as evidence of arbitrary-byte exactness. Full gate results are receipts.

An initial production build timed out while competing for memory with two
large parent/frontier jobs. It was explicitly stopped; a later serial build is
required before reporting PASS. The initial log is retained. No timing from that
contention is used for speed claims.

## Research and limitations
Fresh searches, paper excerpts, and individual OpenAI, Anthropic, DeepMind,
doubleAI and Axiom statement inspections are in `research.md`. No exhaustive
review of all lab results, no Lean replay, and no independent agent occurred.
No result here establishes native LLM reconstruction or a terminal codec.
If superiority remains unverified, open a draft PR and do not merge under X144's
conditional merge instruction. This is different from X143b's unconditional merge.

## Final result
- Canonical frontier: **29 lanes / 11,962 tokens**, every message identical to X143b.
- PSIFIDA: **59 standalone + 6 parent + 1 heldout standalone + 1 heldout parent = 67 prices, zero frontier wins**.
- Parent A→B: ls-l 1310→1439; ps-aux 980→1038; prices 118→191;
  ls 414→477; metrics 197→263; psql 229→277.
- Heldout baselines: Vite 253 (unsafe wire, see below), Drizzle 643, git-log 43.
  Only git-log admitted PSIFIDA; composed result 91. This one-line log is not broad ops coverage.
- Independent Python candidate reader: **65 exact / 2 unsupported**.
- Final gate: **99 reference-tokenizer prices, 88 supported source-byte reads,
  10 unsupported formats, 1 invalid UTF-8 transport wire**. Not an all-pass fidelity result.
- Streaming patch: **24 isolated timings**, wire/source identical; B/A totals
  0.99155 / 1.00494 / 0.99387 for KB / ps / metrics. Fails the declared 10% gate;
  not deployed. TypeScript and serial application build pass.
- Category totals unchanged: PROSE 3429, OPS/TABULAR 5580, CODE/STRUCT 2636,
  OTHER 317. Wordlike body tokens lead prose/code; glyphs lead ops. These are
  empirical token classes, not lower bounds or native-reader evidence.

## New transport counterexample and conservative repair candidate
The Vite README exposes an existing grammar bug: `\ud83d` is put into a rule and
its low-surrogate emoji halves remain in the body. JavaScript CHIRON expansion
reassembles the original source; UTF-8 encoding of the **wire** replaces the lone
halves, after which CHIRON does not recover the source. The first Python frontier
reader crashed on encoding this wire. It now reports `invalidWire`, separately
from unsupported syntax; no replacement normalization is accepted as a pass.

`transport_gate.ts` reproduces both successful in-memory expansion and failed
transported expansion. New reusable helper `src/lib/omega/utf8-wire.ts` rejects
unsafe sources and offers an opt-in raw-source fallback for unsafe messages.
It passes **65,581 assertions**, including all single UTF-16 units, adversarial
surrogate sequences, and all 32 fresh canonical/heldout message snapshots.
Only Vite falls back; its safe raw message costs **274**, not the unsafe 253.
This is a fidelity repair candidate, **not a token improvement**, and is not
wired into TAGSTACK. No existing production code or default selection changed.

The immediate correctness task is to admit only transport-stable candidates
inside selection, preserving the best safe alternative rather than raw fallback,
then rerun all affected frontier/native gates. The highest-information missing
behavioral test remains independent single-chat reading of the frozen KREMA/PTYCHE
packets. Neither a Pareto-superior new codec nor native verification was achieved.
Open a draft PR; **do not merge** under X144's conditional instruction.
