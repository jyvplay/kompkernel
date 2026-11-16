# X121 — protocol, pre-registered before the X121 screens

Written 2026-11-14/16, branch `arena/d992d8de-kompkernel`, base `3e66e72`
(X120 merged as PR #63). The X120 screens are prior evidence, not X121 evidence,
and are cited as such.

## A–G. Formal model

**Admissible object.** One UTF-8 string `M` (the *message*) pasted into a single
plain chat turn. `M` must contain, in itself, every instruction needed to recover
the source: no system prompt, no `skills.md`, no tool, no retrieval, no model
weights, no second turn. The decoder is a competent LLM reading `M` once, plus
(for the code-decodable layer) the repository's executable reader.

**Access model.** Encoder sees the source `text`, the shipped stack, and the real
`o200k_base` tokenizer. Decoder sees `M` only. No shared state, no dictionary
outside `M`, no randomness, no wall clock in any decision (`OMEGA_DET=1`).

**Counted resource.** `countTokens(M, 'o200k_base')` — the complete message,
including contract line, tape and body. Not the body alone, not the wire alone,
not an estimate. Secondary: wall ms and CPU ms of `tagstackEncode`, measured in
the same process with balanced arm order and — learned this turn — **strictly
interleaved arms**, because this host's unpaired wall readings move by 1.9×.

**Success predicate (quantifier order).** ∃ mechanism `C` such that ∀ lanes `ℓ`
in the canonical 29: `decode(C(text_ℓ)) = text_ℓ` byte-exact **and**
`tokens(C(text_ℓ)) ≤ tokens(F₁₂₀(text_ℓ))`, **and** ∃ a lane with a strict
improvement, **and** aggregate wall/CPU does not regress. The universal quantifier
is over lanes and is checked after the witness is fixed; no per-lane tuning.

**Parameter regime / units / tolerances.** Tokens: integers, exact, zero
tolerance. Byte equality: exact. Timing: milliseconds on 2 vCPU / 3.8 GiB;
a speed claim needs ≥ 1.25× aggregate wall with identical message SHA-256 on all
29 lanes, and — new this turn — **≥ 8 interleaved samples per arm**, because the
first two "1.5×" readings of this turn were contention artifacts.

**Adjacent problems that must not be substituted.** (1) binary compression;
(2) lossy prompt compression; (3) tokenizer retraining (changes the counted
resource); (4) soft-prompt / KV compression; (5) fewer tokens ⇒ better downstream
accuracy; (6) body-only or wire-only counts; (7) speed bought by dropping an
exactness gate; (8) cross-message dictionaries; **(9) NEW — replacing
`countTokens` with a faster function that can return a different integer: the
counted resource is defined by the reference tokenizer, and any accelerator must
be checked against `countTokensExact` on every call it serves**; **(10) NEW —
"the wire is unchanged, so the mechanism is free": a scheduling-layer change that
moves no token is not a codec, and must not be reported as one.**

## H. Outcome space and evidence threshold (pre-registered)

- **H+** — a new mechanism ships that is Pareto-superior: no lane worse, ≥ 1 lane
  better, 29/29 byte-exact, ≥ 10 tokens on at least one lane.
- **H∂** — a mechanism ships that moves **no** token but is exactly
  behavior-preserving and removes measured work (this turn's shape, if the speed
  effect had been resolvable).
- **H−** — nothing admissible reaches the bar; ≥ 6 mechanism-distinct screens,
  each falsified by the whole-message price, plus an ownership census.

**Declared evidence threshold for X121:** a balanced 29-lane A/B whose arms differ
in one environment variable, identical token totals and identical message hashes,
an exactness suite checked against the unaccelerated reference on every call, an
independently written second implementation of the same quantity, a modal-shortcut
test proving the guard is load-bearing, and ≥ 8 interleaved timing samples per
arm for any speed claim.

**Result: H∂ / H−.** ΠΡΟΛΗΨΙΣ ships and is exact, but (i) it moves **zero
tokens** — it is scheduling-layer, not a codec — and (ii) its whole-stack speed
effect is **below this host's measurement floor**, so the ≥ 1.25× threshold for a
speed claim is not met.

**The gate it did pass.** Balanced 29-lane A/B (`bench/x121/receipts/ab2.json`):
Σ **12 133 → 12 133**, Δ **0**, better 0 / worse 0 / same 29, `exact true`,
`chironReachable true`, `samePriceHashStable true`, and **message SHA-256
identical on 29/29 lanes** both against the OFF arm and against the independent
frontier-verification receipt. The whole corpus is byte-for-byte the X120 wires,
so there is nothing new to decode and no cold-read or mutation battery is
required this turn — byte equality is a strictly stronger statement.

## I. Screens run this turn (≥ 6 mechanisms, each with a receipt)

| # | Mechanism | Construction | Artifact | Verdict |
|---|---|---|---|---|
| 1 | **ΠΡΟΛΗΨΙΣ** — prefix-anchored resumable fold | ring of anchors + stride marks + O(1) lcp gate; resume `total − tailTok + tokens(tail + rest)` | `src/lib/omega/prolepsis.ts`, `bench/x121/prolepsis-unit.ts` | **Exact, ships.** 0 tokens moved; 6.6 % of folded chars skipped; wall effect unmeasurable |
| 2 | **Residual rule mining** (dictionary axis) | mine rules from the residual after the shipped rule set | `bench/x121/residual.ts` | **CLOSED** — 0 on 10 078 tokens (0.00 %) |
| 3 | **ALLOGRAPHOS per-occurrence glyph** | re-spell one occurrence at a time | `bench/x121/alias-headroom.ts` | **SMALL** — 81 tokens over 3 991 sites, below the shipping bar |
| 4 | **Tape glue** (join adjacent tape values) | merge neighbouring tape entries | `bench/x121/tape-glue.ts` | **NEGATIVE** — −387 (−14.8 %): the tape is cheaper than its parts; per-value arithmetic overstates cost by ~15 % |
| 5 | **Rule deletion priced after ΒΕΛΤΙΣΤΟΣ re-parse** | delete rule *i* by literal write-back, then re-price | `bench/x121/probe-drop.ts` | **CLOSED** — node-help: base 852, 41 rules, every `afterReparse` delta ≥ 0, sum of negative deltas = 0 |
| 6 | **Column / continuation alignment** | absolute-column layout for aligned tables | `bench/x121/_align.ts` + `src/lib/omega/padtab.ts` | **~0 NET.** 447 gross tokens on raw source; the rule miner already eats those space runs (+1 031 estimated → −237 real on findmnt). PADTAB already exists and is unwired; it rejects ragged/hanging-indent continuation lines (26 aligned rows on node-help, 4 under a ≥3-run test) |
| 7 | **`chunkCountFast`** — one shared per-chunk counter for the fold, `tokenTail` and the short path | integer-keyed LUTs (X77) before the string Map | `src/lib/omega/bpe.ts` | **Exact, ships.** −45 % string-keyed Map probes/lane; wall effect unmeasurable |
| 8 | **Whitespace-run / digit glyph substitution** | census then substitute | `bench/x121/_ws.ts`, `_vals.ts` | **NEGATIVE** (carried from earlier turns: whitespace-run glyphs +1 031 est → −237 real) |
| 9 | **Prose-body attack** | per-lane composition | `bench/x121/_prose.ts` | **DIAGNOSIS, not a lever**: kb-article body = 553 of 620 tokens, email-thread 352 of 486; ~88 % of prose cost is un-dictionaried literal English where glyph substitution is already saturated |
| 10 | **Long-cache eviction / prefix-line reuse** | improve hit rate | measured in `_calls.ts` | **NOT RUN**: long hits 5 627 / 22 275 calls (25 %); even eliminating the entire fold caps at ~1.3× whole-stack, below the threshold |

## J. Negative result shapes (≥ 15 required; 18 recorded)

1. **ΠΡΟΛΗΨΙΣ does not speed up the whole stack** — 8 interleaved samples/arm,
   A 11 491–13 415 ms, B 11 649–12 661 ms, C 11 190–14 493 ms; CPU minima
   12 097 / 12 426 / 11 767 ms. Two earlier unpaired runs claimed 1.5×–1.6× and
   were retracted as contention.
2. **`chunkCountFast` does not speed up the whole stack**, despite removing 45 %
   of the string-keyed probes (2 762 755 → 1 519 189 per lane).
3. **The candidates are not prefix-local** — 26.5 % hit rate, 415 of 1 574 chars
   saved per hit ⇒ a prefix-anchored fold is capped at ~27 % of the fold.
4. **No suffix-side decomposition exists** — the pre-tokenizer is a greedy
   left-to-right scan, so a suffix's chunking depends on where the scan started.
5. **Residual rule mining = 0** over 10 078 tokens.
6. **Rule deletion after re-parse = 0** on node-help (all 41 deltas ≥ 0).
7. **Tape glue = −387** (−14.8 %).
8. **Column alignment ≈ 0 net** (447 gross on raw source, already eaten by the
   rule miner).
9. **Whitespace-run glyphs negative** (+1 031 est → −237 real on findmnt).
10. **The first profile walkers were wrong** — a naive inclusive walker reported
    10 767 % for the root (multi-parent double counting); a `Math.max` per name
    double-counted too. Only the memoized-DAG walker is admissible.
11. **The first unit test's "independent" implementation was wrong, not the
    module** — 8/220 samples, caused by mixing in-context and end-of-string
    chunk accounting.
12. **The first whitespace test used `charCodeAt(0) <= 32`**, which silently
    excludes U+00A0 and the Unicode space separators from `\s`; replaced by a
    lazily built 64 KiB code-point table.
13. **The first fold put a regex call in front of ~40 % of all chunks**
    (`WHITESPACE_ONLY.test(" word")`), which is why the first ΠΡΟΛΗΨΙΣ
    measurement showed a *loss*; fixed with a first-and-last-code-unit
    short-circuit.
14. **Δ=0 lanes are not all "no headroom"** — 4 of the 10 have no `§` frame at all
    (lsblk, uptime-w, free-m, cue-sheet); the other 6 (kb-article, email-thread,
    df-real, df-h, markdown-table, psql-output) are framed and genuinely flat.
15. **Prose is a body problem, not a tape problem** — 88 % of prose cost is the
    un-dictionaried body on text where glyph substitution is saturated; no
    tape-side lever can move it.
16. **Raising the long-cache budget was falsified in X75/X88** and partial
    eviction was not attempted this turn because the ceiling is too low to matter.
17. **The lcp gate is load-bearing** — the unguarded shortcut (resume from a mark
    even though the string diverges before it) is wrong on 29/36 early
    divergences; a version that skipped the check would be silently wrong.
18. **Early-divergence mutants correctly MISS** (28/28), so the mechanism is not
    vacuously accepting.

## Harness rules learned this turn (write them down or they get re-learned)

- **Never trust an unpaired wall-clock reading on this host.** A process measured
  while anything else is alive reads ~1.9× slow. Interleave arms within one shell
  loop and report minima over ≥ 8 samples; report CPU time alongside wall.
- **The pristine baseline must be a real checkout.** `git archive HEAD | tar -x -C
  /tmp/x120base` + `ln -s` the workspace `node_modules`, plus a copy of any new
  module the script imports, gives an arm that differs only in `src/lib/omega`.
- **esbuild renames symbols**, so a profile's `countTokens3` is `bpe.ts`'s
  `countTokens` (verified by grepping the bundle), and `prolepsisReset2` is
  `prolepsisReset`. Name-match profiles against the bundle, not the source.
