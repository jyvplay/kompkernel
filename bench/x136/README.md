# X136 — PTYCHE and a tokenizer correctness repair

**Measured compression improvement, not completion of the full acceptance contract.**
PTYCHE reduces one canonical prose lane from **620 to 608 tokens** with independent
byte-exact recovery. Native single-message LLM decoding, broad held-out gains,
and significant whole-stack acceleration remain unverified/unmet. No commit,
default codec wiring, or merge is justified under the declared gate; PR #74 stays
draft. ALLOMORPH and ANAKYKLI also remain unwired.

## What was added

`src/lib/omega/ptyche.ts` implements paragraph-local layout parameter
residualization. Each paragraph's exact greedy wrapping permits an interval of
widths. The planner chooses the smallest width supported by the most intervals,
emits `~|` for that default and `~W|` for exceptions, and gives the unwrapped text
to the existing full TAGSTACK parent. Its in-band inverse travels with the
message. The winning kb-article candidate selects 98 columns, unwraps six
paragraphs, and removes 31 internal line breaks. It is **not** a new wrapping
primitive: STICHOS/WRAPCANON already provide the single-width genus.

A separate optional arm transmits per-line word-count corrections and re-anchors
each greedy prediction at the corrected boundary. Its generic contract loses
on the tested real source. The winning candidate uses **zero line corrections**;
that result does not validate the residual arm's profitability.

The actual public entry point is `ptycheDefaultFromFrontier(text, baseMessage,
encodeParent, decodeParent, encoding)`. It makes at most one extra parent call,
requires a supported parent contract, checks full-source recovery from the
message, and returns null unless the complete message is strictly cheaper.
It is experimental and not called by shipped TAGSTACK.

## Frontier reconfirmation and results

| Test | Executed result |
|---|---|
| Fresh pre-repair frontier | 29 lanes, **11,962 tokens**, 1,167,083 ms; all 29 messages identical to X135 |
| Full repaired-counter frontier | 29 lanes, **11,962 tokens**, 1,147,890 ms; all 29 messages identical to fresh baseline; inherited mismatch 0 |
| Default-width PTYCHE, kb-article | **620 → 608 (−12, −1.94%)**, source-exact in TS and independent Python |
| Default-width PTYCHE, email | 486 → 503, rejected |
| Default-width PTYCHE, prices | 118 → 237, rejected |
| Frozen candidate aggregate | **11,950 tokens**, replacing only kb-article; NOT a wired full-stack run |
| Generic residual-layout contract | kb-article 620 → 655, rejected |
| Fused cyclic instruction follow-up | 24 supported X135 messages, best ties baseline; no strict win |
| Strong novelty ablations | Existing WRAPCANON with the same parent/fused-contract opportunity reaches **614**; marked single-width control also 614 |
| Held-out eligibility | 24 noncanonical files screened; only MIT license eligible; baseline 38, candidate rejected |
| Brotli+base64 control | 29 byte-exact machine round trips; **17,475 tokens**, no lane beats baseline |
| Same-message positional copy control | 29 exact round trips; **23,576 tokens**, no lane beats baseline |

Thus only **six tokens** distinguish mixed local widths from the equally
advantaged existing single-width mechanism; twelve are saved against shipped
defaults. This is a modest repository extension, not the requested broad,
wholly new, substantially superior compression mechanism. The held-out result
does not support generalization. Native readability remains a separate gate.

`endtoend.ts` additionally exercises the actual public API after computing the
full baseline in the same process, rather than relying solely on frozen prices;
its exact outputs and baseline/extension timings are in `receipts/endtoend.jsonl`.
It confirms kb-article **620 → 608**, with 6,485 ms baseline plus 6,383 ms
extension (12,868 ms total). Email stays at 486 after rejecting the candidate,
but pays 9,177 ms extra. This is a compression/runtime trade-off, **not dominance**.

## Tokenizer defect and repair

`bpe-fast.ts` previously passed long byte strings into a merge routine that still
used 1,024-byte scratch boundary/rank arrays. Out-of-range typed-array writes
silently lost data. Fourteen of twenty targeted tests produced incorrect counts
(e.g. 2,048 ASCII `a` characters priced at 1,151 instead of 256 tokens).
This was a **counting bug**, not a byte-decoder failure or a compression win.

The repaired scan allocates sufficiently large arrays. The default long-chunk
implementation now uses an adjacency heap with generation-based stale-edge
invalidation and leftmost tie breaking; short chunks retain the old fast path.
`OMEGA_LONG_BPE_SCAN=1` selects the repaired scan for comparison.

* Reused X72 differential suite: **323,192 strings, zero mismatches**.
* New long/multibyte/overlap/random-boundary suite: **235 checks**, matching the
  installed library under both repaired scan and heap modes.
* Original 20 boundary cases: all pass after repair.
* Final wire recount: **69 library-price checks** and three default-layout
  source checks pass.
* PTYCHE mechanical/admission tests: **366 checks pass**.
* `tsc --noEmit`: exit 0. Tracked build-info artifact restored.

On the constructed differential workload, warmed fast-counter time is 233 ms
for heap versus 4,368 ms for repaired scan (about **18.7×**). This is not a
whole-stack speed result, and is not a real-user compression benchmark. Heap
operation count is O(n log n), with O(n) memory; rank lookup/materialization cost
is additional. No theorem-prover validation was performed.

The two full-frontier clocks are not a controlled paired speed benchmark;
the repaired run overlapped brief layout/ablation experiments and tests. The
candidate also adds parent calls. Do **not** advertise the approximately 1.6%
clock difference as a causal stack speedup or claim Pareto dominance.

## Generalized local leaders

Counts are token classes in CHIRON bodies, not word frequencies or a lower bound
on compressibility. Regenerated using the existing X134 census.

| Category | Lanes | Raw → baseline | Glyph / word / numeric / other body tokens | Local leader |
|---|---:|---:|---|---|
| Prose | 5 | 5856 → 3429 | 839 / 1629 / 108 / 231 | word-like |
| Ops/tabular | 16 | 17278 → 5580 | 1202 / 1105 / 808 / 380 | glyph-bearing |
| Code/structured | 4 | 4152 → 2636 | 639 / 945 / 102 / 307 | word-like |
| Other | 4 | 729 → 317 | no CHIRON tapes | none inferred |

With the frozen PTYCHE replacement, prose becomes **3417** tokens; its body census
is 806 / 1625 / 110 / 228 and remains word-led. Other groups are unchanged.
Receipts: `leaders.json`, `candidate-leaders.json`.

## Fidelity and native-reader boundary

The reused independent CHIRON+STELI audit reconstructs **21/29 baseline files**;
the other eight are unsupported compositions, not declared corrupt. It does
not turn the inherited `.decoded` field into a message-reading proof.
All three default-layout trials independently recover source bytes in Python.

`receipts/candidate-message.txt` is the entire proposed one-chat input.
`receipts/native-trial.json` says **NOT RUN** and records hashes;
`verify_native.py` can byte-compare a separately collected raw model response.
It does not invoke a model or establish how a response was obtained. No
skills.md/system help is needed by the specified format, but actual blind
native behavior—including this assistant's—is **not confirmed**. The assistant
has seen source, so self-review would not be a blind trial.

## Research / formal audit

`REVIEW.md` contains the model, quantifiers, H+/H−/H∂, twenty false-solution
shapes, six independent mechanism families, candidate-specific attacks and
repair gates. `research.md` records new live searches and individual, bounded
OpenAI, Anthropic, doubleAI, Google, Harmonic and Axiom audits. It is not an
exhaustive survey of all proofs or a claim of novelty relative to training data.

One deeper external check was actually executed: python-chess replayed doubleAI's
190-ply witness and confirmed its final position has 63 legal moves, all giving
check. That verifies the finite witness, **not** the universal upper bound or a
codec theorem. Its repository discloses SAT-instance axioms/certificates, which
were not replayed here. Other lab formalization builds were not run.

## Reproduction and next highest-information tests

Use the installed esbuild to bundle a harness:
`node_modules/.bin/esbuild bench/x136/NAME.ts --bundle --platform=node --format=esm --outfile=bench/x136/NAME.mjs`.
Bundles are ignored. `frontier` was bundled before the counter repair;
`patched-frontier` afterward. Rebuilding both now tests the repaired counter,
not the old bug; original receipts preserve the before result. Reconstruct the
old implementation only in an isolated copy for a before experiment.

Run `default_layout`, `ablation`, `heldout`, and `endtoend` after the canonical
receipt exists. Run `unit`, `bpe_audit` (both modes), reused `bench/x72/ids.ts`,
`final_gate`, then `coldread.py` and `summarize.py`. Receipt filenames follow
harness names except the documented hyphenated variants. The source-only
baseline audit reuses `bench/x135/steli_audit.py` with the frontier path argument.
Chess reproduction: create a venv, install `receipts/chess-requirements.txt`,
then run `chess_audit.py`; it never downloads the large universal certificates.

Highest-information remaining test: a truly blinded one-message model trial of
the 608-token candidate, retaining model/version and unmodified response bytes.
Next compression test: prospectively selected real mixed-width study/operations
prose, compared against the **614-token-style single-width composition**, not
only shipped defaults. Next speed test: controlled, interleaved end-to-end
measurements including unsuccessful candidate calls. No merge until the
mandatory gates genuinely pass.
