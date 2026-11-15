# X120 — protocol, pre-registered before the X120 screens

Written 2026-11-14, branch `arena/7ce451f1-kompkernel`, base `2098c8f`.
Thresholds in §H are declared **before** any X120 screen was run. The X119
screens (inline / bypass / universal / tape-bypass / adopt / recoding) are prior
evidence, not X120 evidence, and are cited as such.

## A–G. Formal model

**Admissible object.** One UTF-8 string `M` (the *message*) pasted into a single
plain chat turn. `M` must contain, in itself, every instruction needed to recover
the source: no system prompt, no `skills.md`, no tool, no retrieval, no model
weights, no second turn. The decoder is a competent LLM reading `M` once, plus
(for the code-decodable layer) the repository's executable reader.

**Access model.** Encoder sees the source `text`, the shipped stack, and the real
`o200k_base` tokenizer. Decoder sees `M` only. No shared state, no dictionary
outside `M`, no randomness, no wall clock in any decision (`OMEGA_DET=1`).

**Counted resource.** `countTokens(M, 'o200k_base')` — the *complete* message,
including the contract line, the tape and the body. Not the body alone, not the
wire alone, not an estimate. Secondary resources: wall ms and CPU ms of
`tagstackEncode`, measured in the same process with balanced arm order.

**Success predicate (quantifier order).**
∃ codec `C` such that ∀ lanes `ℓ` in the canonical 29:
`decode(C(text_ℓ)) = text_ℓ` (byte-exact) **and**
`tokens(C(text_ℓ)) ≤ tokens(F₁₁₉(text_ℓ))`, **and**
∃ at least one lane with a strict improvement, **and** the aggregate wall/CPU
does not regress beyond noise. The universal quantifier is over lanes and is
checked *after* the existential witness is fixed; no per-lane tuning is allowed.

**Parameter regime / units / tolerances.** Tokens are integers, exact, zero
tolerance. Byte equality is exact, zero tolerance. Timing is milliseconds on
2 vCPU / 3.8 GiB, `OMEGA_DET=1`; a speed claim needs ≥ 1.25× aggregate wall with
**identical message SHA-256 on all 29 lanes** (a faster run that changes a wire is
a different codec, not a speedup). Search bounds are counted work units, never
seconds.

**Adjacent problems that must not be substituted.**
1. Binary compression (zstd/brotli/PAQ/cmix/AlphaZip) — output not chat-readable.
2. Lossy prompt compression (LLMLingua, ProCut, 500xCompressor) — not byte-exact.
3. Tokenizer retraining (BoundlessBPE, Parity-aware BPE, Fusion Token) — changes
   the counted resource instead of the message.
4. Soft-prompt / KV compression — needs weights.
5. Fewer tokens ⇒ better downstream task accuracy — a different objective.
6. Body-only or wire-only token counts — the contract is part of the price.
7. Encoder-side speed bought by dropping an exactness gate.
8. Cross-message dictionaries — violates the one-chat access model.

## H. Outcome space and evidence threshold (pre-registered)

- **H+** — a new mechanism ships that is Pareto-superior: no lane worse, ≥ 1 lane
  better, 29/29 byte-exact, and **≥ 10 tokens on at least one lane** (the user's
  bar for "not just a few"). Evidence required: balanced A/B on all 29 lanes with
  message hashes, an independent CPython cold read of a winning message, a
  mutation battery, and one new attack aimed at the mechanism's own structure.
- **H−** — no admissible mechanism reaches the bar. Evidence required: ≥ 6
  mechanism-distinct screens, each with a receipt, each falsified by the *whole
  message* price, plus an ownership census showing the remaining axes are already
  shipped.
- **H∂** — the gain exists but only under an extra condition (a lane family, a
  budget, a scope). Then the condition must be printed in the codec header, the
  registry label and the abbreviation page, and the gain may only be claimed
  inside that condition.

A separate, independent threshold for the **speed** axis: ≥ 1.25× aggregate wall,
identical hashes on 29/29, exact 29/29. Below that, report the measured number and
claim nothing.

## I. Verification ladder (strongest first)

1. Independent reader in another language (CPython) on the emitted message.
2. Balanced A/B with SHA-256 of message *and* token ids, arm order alternated.
3. `npx tsc --noEmit` and a unit battery with large synthetic fixtures.
4. Mutation battery: every single-character edit must be refused or be an
   identity; zero silent-wrong decodes.
5. A new second-order attack derived from the candidate's own structure.
6. Model self-review — weakest, used only for readability, never for exactness.

## J. Stopping

Stop when the shipped candidate passes every gate above and the PR is merged, or
when the turn's real budget is exhausted; in the latter case ship the strongest
verified artifact and print the exact remaining gap.

## Negative space — 15+ shapes that look like solutions and are not

1. **Contract deletion.** Replacing the parent's contract prefix with a generic
   one lowers tokens and deletes semantics (X119 universal screen, Δ−62 invalid).
2. **Body-only pricing.** A move that shrinks the body and grows the tape.
3. **Estimate pricing.** chars/4, unigram score, or a cached heuristic instead of
   the real tokenizer.
4. **Overlap corruption.** Two substitutions whose spans overlap; the inverse is
   then not a function (LTSC Algorithm 2's `I ← I \ Iswap` bug).
5. **Modal shortcut** — see below.
6. **Round-trip-only exactness.** `decode(encode(x)) = x` on the fixture while the
   *printed instruction* no longer describes the transform (X28's dump.sql bug).
7. **Identity fallback counted as a win.** A lane that returns the source is not
   a compression win.
8. **Cross-arm cache leakage.** Timing arm 2 after arm 1 warmed a global memo.
9. **Budget-free exactness.** Removing the work meter makes the search longer and
   the wire smaller; that is a different parameter regime, not a new mechanism.
10. **Unicode inflation.** A "shorter" string in characters that is longer in
    tokens (CJK packing).
11. **Glyph collision.** A key character that also occurs in the payload.
12. **Dead-rule accounting.** Deleting a rule still referenced by another rule.
13. **Non-idempotent contract rewrite.** A table whose replacement string already
    occurs in the line.
14. **Local optimality claimed as global.** A greedy pass reported as "optimal".
15. **Decoder-help smuggling.** Any instruction that lives outside `M`.
16. **Timing-only Pareto.** Faster but one token worse on one lane.
17. **Fixture-specific constants.** A rule table keyed on a fixture's own words.

### The modal shortcut, precisely

*Shortcut*: "an LLM can reconstruct the obvious continuation, so send the sketch
and let the model fill in the rest." It fails because the success predicate is
`∀ reader r ∈ admissible, decode_r(M) = text`, and a sketch admits exponentially
many continuations; the argmax of one model at one temperature is not a function
of `M`. It is a *lossy* channel with a hidden shared prior — exactly adjacent
problem 2/4. **Detector**: `bench/x120/attack-lattice.ts` probe A5 deletes the entire
dictionary from a winning message and asks the executable reader to decode; a codec that depended on the shortcut either throws or returns a
different string. A shipped codec must still decode byte-exactly from the clauses
that remain, because every clause it needs is printed.

## E. Mechanism portfolio (independent at entry)

| # | mechanism | artifact | status at pre-registration |
|---|-----------|----------|----------------------------|
| 1 | single-reference inlining | `bench/x119/receipts/screen-inline.json` | falsified, Δ0 |
| 2 | joint contextual bypass | `screen-bypass.json` | falsified, Δ−1 |
| 3 | universal cross-script alphabet | `screen-universal.json` | H∂ then falsified, Δ−4 |
| 4 | tape-value bypass | `screen-tape-bypass.json` | falsified, Δ−4 |
| 5 | per-occurrence adoption | `screen-adopt.json` | Δ−15, shipped as X119 ΔΙΓΛΩΣΣΙΑ |
| 6 | unified per-occurrence recoding | `screen-recoding.json` | Δ−20, 9 lanes, shipped |
| 7 | **global shortest-path re-spelling** (X120) | `bench/x120/screen-shipped.ts` | SHIPPED, Δ−122 alone |
| 8 | **state-complete scoped replay memo** (X120 speed) | `bench/x120/speed-deep.ts` | FALSIFIED, 0 hits, reverted |
| 9 | dictionary induction over the re-spelled body | `receipts/screen-induct-*.json` | FALSIFIED, 0 admissions |
| 10 | scoped global ENGRAM | `bench/x120/speed-engram.ts` | ×1.2723 but dpkg-l ×0.930, budget-blind key; not shipped |
| 11 | DP node compression | `receipts/screen-shipped-collapse.json` | H∂, opt-in flag, default OFF |
| 12 | two-rung ladder | `receipts/screen-shipped-2rung.json` | H∂, opt-in env |
| 13 | line-boundary prefix reuse (X120 speed) | `receipts/speed-prefix-draft{1,2,3,4}.json` | FALSIFIED, 0.94–1.05×, reverted |
| 15 | **exact chunk state for the DP** | `bench/x120/speed-state.ts` | SHIPPED, 7.07× faster and 11 tok better than the window draft |
| 16 | wider beam in chunk mode | `receipts/screen-shipped-beam32.json` | FALSIFIED, identical tokens at 2× cost |
| 17 | short-path threshold routing | two-lane probe | FALSIFIED, ×1.04, reverted |
| 14 | **composition order** local/global | `bench/x120/screen-order.ts` | SHIPPED, 12 135 vs 12 136 |

Each row's construction, proved portion, unresolved interface, cheapest
falsification and local-vs-global gap is recorded in
`bench/x120/research/portfolio.md` (written, all rows resolved).


---

## Outcome, recorded after the runs (not pre-registered)

**H+ met on the token axis.** ΒΕΛΤΙΣΤΟΣ with the exact chunk state ships:
Σ29 **12 270 → 12 133 (Δ−137)**, better 19 / worse 0 / same 10, exact 29/29,
same-price hashes stable, and three lanes above the −10 bar (ps-aux-real −27,
ls-l-real −16, apt-real −14). Evidence: balanced A/B with message and token-id
hashes, independent CPython cold read on 19/19 win lanes, a 12 580-trial mutation
battery, a 16/16 unit battery, and `attack-lattice` (seven structural probes plus
the modal-shortcut detector) with zero silent-wrong, zero claimed-win-not-real and
zero regressions.

**Speed axis: H∂, stated narrowly.** The pre-registered whole-stack bar was
≥1.25× aggregate wall with identical hashes. It was **not** met: the A/B measures
**1.011× wall / 1.015× CPU**, which is inside this box's noise. What *was* measured
above bar is the new stage against its own draft — **7.07×** (18 511 ms → 2 617 ms
on the same 29 frozen wires) **with 11 fewer tokens** — and that is what pays for
the extra pass, so the −137 tokens cost no measurable whole-stack time. Five
separate whole-stack speed mechanisms were built and falsified (§§3, 4, 7, 10, 11
of `portfolio.md`); none is claimed.

**Methodology results worth more than the win.** Two A/Bs were void because a
flag was read at module load while the probe set it after import; every flag in
the new module is now read per call. One per-lane speed table was void because a
lane with *zero* mechanism activity moved 1.16× between arms — the control lane
is what fixed the noise floor at ~15 %. And the load-bearing algebra of the
shipped mechanism was wrong in 45 of 104 976 cases until the probe was run.
