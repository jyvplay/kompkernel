
---

## X28 — SYNTOMOS

### A. The formal model

**1. Admissible objects.** A message is a pair `M = (w, c)` where `w` is a *wire*
(a string) and `c` is a *contract* (an English instruction). The pair is
admissible iff a competent reader, given `M` alone in one chat turn, produces a
unique string `decode(M)`. The codec is a map `E: Σ* → M` with
`decode(E(x)) = x` for all `x` (byte-perfect, exact lossless).

The wire is `§ · tape · ¶ · body`, where `tape = g₁P₁ g₂P₂ … gₖPₖ` is a
**straight-line program** (SLP): each glyph `gᵢ` is a variable defined as the
string `Pᵢ`, and `Pᵢ` may contain glyphs `gⱼ` with `j < i`. The body is the text
with occurrences of the defined strings replaced by their glyphs.

**2. Information/access model.** The encoder knows the source text and the
tokenizer. The decoder is **one chat message**: no system prompt, no skills.md,
no tools, no prior context, no shared codebook. It has only its pretraining plus
`M`. In particular the encoder may NOT assume any state carried between messages.

**3. The resource counted.** `cost(M) = tokens(w) + tokens(c)` under o200k_base.
Both terms are counted; a wire-only count would be dishonest.

**4. Success and failure — quantifier order.** Let `B` be the incumbent
(METATHESIS). SYNTOMOS succeeds iff:

> **∀** lanes `L` in the 28-lane holdout: `∃` an admissible `(w,c)` produced by
> SYNTOMOS with `decode(w,c) = L` exactly **and** `cost(w,c) ≤ cost(B(L))`,
> **and** **∃** at least one lane with `cost < cost(B(L))`.

Note the order: exactness is a **universal** requirement checked *before* any
cost comparison, and the improvement is **existential**. A single regression
falsifies the claim regardless of the total. Pre-declared threshold: the
improvement must hold on **all 28 lanes** (it is a per-message overhead change,
so a lane-specific win would indicate a bug, not a mechanism).

**5. Parameter regime, units, tolerances.** 28 held-out lanes, 368–21 112 bytes,
143–7 209 input tokens. Token counts are integers measured by the repo's own BPE
(`countTokens`), not estimated. Tolerance is zero: any inequality in the round
trip is a failure. Time is bounded by `budgetMs = min(11 000, 800 + 1.1·len)`
inherited from the parent.

**6. Adjacent problems that must not be substituted.**
- *Summarisation / paraphrase* — not byte-perfect; excluded.
- *Learned compression* (e.g. arXiv 2603.25340, an autoencoder mapping text to
  compressed Z-tokens) — requires training a compressor; our decoder is frozen
  and untrained, and no model is available in this sandbox.
- *Better tokenizers* (ToaST, arXiv 2605.22705, −11% vs BPE) — we cannot change
  the decoder's tokenizer; it is fixed to o200k_base.
- *Bit-level entropy coding* — an LLM cannot execute arithmetic decoding; the
  SLP information-theoretic floor (2n + log₂ n! bits, Maruyama et al. SPIRE'13)
  is therefore an unreachable bound, not a target.
- *Prompt compaction by deletion* — lossy.

### B. The outcome space

- **H+**: the instruction overhead is not a constant but a function of the
  features a given wire needs, so a per-message choice strictly beats the fixed
  contract on every lane.
- **H−**: the fixed contract is already minimal, and no admissible per-message
  variant is cheaper.
- **H∂**: some savings exist but only for a subset (e.g. only untaped messages,
  or only non-nested tapes), and the general claim fails.

**Declared evidence threshold, set before the sweep:** report success only if
**28/28 exact**, **zero regressions**, and **net ≤ −50** across the suite; and
report H∂ explicitly if the per-lane deltas are not uniform. **Observed: 28/28
exact, 0 regressions, net −81, uniform −3 on every taped lane.** H+ confirmed on
the overhead question; and — importantly — H∂ is confirmed for the *original*
research question, see §D.

### C. The frontier

Re-verified this turn by re-running the full X27 sweep from a clean checkout
(`bench/x28/reverify.ts` → `bench/x28/metathesis_reverify.jsonl`):

| codec | 28-lane total |
|---|---|
| raw | 62954 |
| AETOS | 29683 |
| SYMPLOKE | 29492 |
| METATHESIS | 29172 |

**This is NOT the number X27 reported.** X27 reported 29183. The re-run gives
29172, an 11-token difference, and the difference is **not** a coding error —
see §I.1: the parents gate their search on raw `Date.now()`, which the repo's
`OMEGA_DET` flag does *not* stub, so results drift with machine load. The
re-run is the more trustworthy number (it ran on an otherwise idle machine), and
it is the one SYNTOMOS is measured against *inside the same process* so that
drift cannot contaminate the comparison.

**Restated imported results, with hypotheses.**
- *SYMPLOKE clause braiding* (X26): holds only when the tape is present; X26
  itself records the correctness fix for the no-tape case.
- *METATHESIS relabelling transparency* (X27): for any injective same-script
  map `A`, `decode(relabel(w)) = decode(w)`. Requires the map's images to be
  absent from the payload. SYNTOMOS relies on this because it re-uses the
  relabelled wire untouched.
- *SLP derivation depth* (arXiv 2107.00446): an SLP of size `g` can be
  transformed in linear time into an equivalent SLP of size `O(g)` whose
  derivation tree has height `O(log N)`. Imported because "expand repeatedly"
  recursion depth is exactly derivation-tree height.

**The exact open interface.** Between the token-floor of the *dictionary* side
(measured: exhausted, §D) and the token-floor of the *instruction* side
(measured: 3 tokens of slack, §E). Nothing connects them — no mechanism found
this turn moves mass from one to the other.

### D. Negative space — 17 shapes that do NOT work

Every row was implemented and measured this turn. "Test" names the detecting
experiment in `bench/x28/`.

| # | rejected shape | detecting test | verdict |
|---|---|---|---|
| D.1 | better rule coverage (more grammar) | `coverage.ts`: all repeated substrings, len 4–40, count ≥3 — **0** with positive net | dead |
| D.2 | better relabelling by more search | `budget.ts`: 50× maxEvals and 20× restarts, kb-article and vix-daily **byte-identical** | saturated |
| D.3 | bigram-locked glyph assignment | `probe_blga.ts`: graph labelling into the 805 one-token Cyrillic bigrams → **+108** | dead |
| D.4 | tape-side factoring of shared substrings | `tapegram.ts` / `tape2.ts` / `tape3.ts`: **0** profitable candidates; rebuild costs **+25** | dead |
| D.5 | zero-margin attachable glyphs | `margin.ts`: every ASCII/punctuation candidate costs **+1.00** trailing | dead |
| D.6 | merge glyph into preceding word | `merge.ts`: best Latin letter 0.87, but Latin glyphs are unusable (payload collisions) | dead |
| D.7 | ordinal / canonical glyph ordering | `ordinal.ts`: Cyrillic 0.87 ratio at N=60, already inside METATHESIS's search | dead |
| D.8 | occurrence-selective substitution | `select.ts`: **0** occurrences where reverting helps (148 where it hurts) | dead |
| D.9 | glyph-sequence composition in the body | `comp.ts`: **0** profitable repeated run-sequences or sub-sequences | dead |
| D.10 | rule pruning with the true tokenizer | `prune2.ts`: **0** removable rules with gain | dead |
| D.11 | raise `maxRules` above 220 | `mr.ts`: sp500-200 emits 212 rules at caps 220/400/700 — cap not binding | dead |
| D.12 | SLP balancing to cut derivation depth | `depth.ts`: measured depth is already **1–5** | dead |
| D.13 | hardened (non-expiring) parent budget | `harden.ts`: identical wire at `budgetMs = 1e9` | dead |
| D.14 | shorter shape clause ("drop any ^") | `shape.ts`: −6 tokens but **omits that ^-marked digits are exempt** | rejected |
| D.15 | explicit-delimiter tape + minimal contract | arithmetic: costs 1 tok/rule, saves ≤15 → only pays below ~13 rules (2 lanes) | dead |
| D.16 | de-nesting for its own sake | `denest.ts`: costs 187 (ls-full-iso), 61 (readme), 39 (email-thread) | dead |
| D.17 | **the modal shortcut: "just shorten the contract"** | see below | **fails, detected** |

**D.17, the modal shortcut, in detail.** The tempting move is: *the contract is
20 tokens, so rewrite it to be shorter.* The failure mode is that "shorter" and
"still says the necessary thing" are not the same, and — crucially — **the
TypeScript round trip cannot tell them apart**, because `symplokeUncollapse`
reads its shape table from `stats`, not from the contract text. An early draft of
this very codec did exactly this, re-synthesised the shape clause with a regex,
and on `dump.sql` reported a **−28 token gain while having silently deleted the
entire digit rule** from the message an LLM would actually read. The contract
still said "print result only"; it no longer said what the digits meant.

*The detecting test* is `bench/x26/selfdecode.py` (copied and extended in
`bench/x28/`): a from-spec Python decoder that is handed nothing but the message
and re-derives the shape table **by parsing the contract text**. It refuses to
guess a width and refuses to proceed if the number of parsed widths does not
equal the number of parsed patterns. It is the only gate in this repository that
sees that bug class, and it is why the shipped implementation performs a strict
**prefix rewrite** of the parent contract and never a reconstruction.

This is the same failure mode as the disputed Unique Games formalisation (§H.6):
a verifier checking an internal representation rather than the artifact the
consumer actually reads.

