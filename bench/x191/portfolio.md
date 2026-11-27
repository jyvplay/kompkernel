# Six independent mechanisms and their falsifiers

These are six mechanism-distinct **experiments**, not six new inventions. They
start from the original source independently; no candidate consumes another's
output. Only DIEXODOS is proposed as the new repo codec. The five Python probes
are classical representation controls, not renamings claimed as discoveries.
All-stack novelty remains unestablished even for DIEXODOS.

## 1. Unique fixed-length graph bridge — DIEXODOS

- Construction: transmit a directed adjacency relation, surviving literal
  endpoints, and a bounded count of erased intermediate fields.
- Artifact: `src/lib/omega/diexodos.ts`, `test.ts`, paid workers and Python inverse.
- Proved abstract portion: saturated path-count recurrence detects uniqueness;
  surviving endpoints make local inverses compose. Finite verification enumerates
  18,432 graph/endpoint/length cases; it is not universal implementation proof.
- Gap: graph/key charges, parent compression, native execution and all-stack
  novelty. The pricing gap is local/measurable; native/broad gain is original-task
  difficulty, not resolved by mathematical invertibility.
- Cheapest falsifier: diamond-path ambiguity or duplicate-edge admission, then
  full-message token count. Stronger structural attacker: a high-girth tree with
  two backtracking walks. Tested explicitly; high girth cannot replace uniqueness.

## 2. Block permutation rank

- Construction: stable-sort each eight-field block; encode its original index
  permutation as a factorial-number-system rank. Rank includes duplicate indices
  even when their label values are equal; no unproved multiset optimization.
- Artifact: `portfolio.py`, family `rank`.
- Proved portion: standard rank/unrank of an n-element permutation are inverses;
  stable original indices preserve duplicates, joining blocks restores fields.
- Gap: rank plus sorted dictionary generally costs more; exact arithmetic burden
  is additional native-reader risk. Classical enumerative coding, not new math.
- Falsifier/attacker: swapping `a b` to `b a` defeats a no-rank variant; n! is an
  invalid rank. Both checked. Byte equality checked on every generated artifact.
- Gap classification: code cost local; scalable native arithmetic unresolved.

## 3. Single-scalar checksum erasure

- Construction: for each ≤16-Unicode-scalar block, keep all but the final scalar
  and its exact integer codepoint sum. Difference recovers that final scalar.
- Artifact: `portfolio.py`, family `checksum`.
- Proved portion: one unknown integer in a known exact sum is determined. No
  modular reduction or probabilistic hash is used.
- Gap: numeric sum costs and Unicode-codepoint reasoning; not a claimed practical
  native format. Keeping only a checksum with multiple unknowns would be lossy.
- Falsifier/attacker: `ab` and `ba` have identical sums. Executed collision test
  rejects the purported multi-erasure extension. Unicode transport round trips
  are checked, rather than treating scalar indices as UTF-16 indices.
- Gap classification: single erasure local and solved algebraically; usefulness
  negative in measured wire costs, native capability not established.

## 4. Numeric finite-difference tape

- Construction: replace eligible ASCII digit runs by markers, retain exact widths
  and successive signed integer differences, starting from zero.
- Artifact: `portfolio.py`, family `delta`.
- Proved portion: prefix sums reconstruct every original integer; zero-padding
  to the paid width reconstructs exact digit spellings, including leading zeros.
- Gap: width/marker/key costs and parent compatibility; familiar predictive coding,
  not a novel mechanism against DIASTEMA and related stack members.
- Falsifier/attacker: `000 999 001`, negative differences, and literal `~` collision.
  Inputs with the reserved marker refuse instead of silently confusing data.
- Gap classification: inverse local, utility measurable; no general-native claim.

## 5. Last-seen field distance

- Construction: first field occurrence literal; later occurrence encoded as the
  distance to its most recent occurrence in reconstructed output.
- Artifact: `portfolio.py`, family `distance`.
- Proved portion: induction on output index with strictly earlier references.
- Gap: numeric address overhead, JSON/key costs and classical LZ/recency ancestry.
- Falsifier/attacker: first-item distance 1 is invalid and tested; duplicates and
  empty fields tested. Not a free shared dictionary.
- Measured standalone raw win: apt-real 2,739→2,687, NOT a canonical-parent win.
  This artifact was not run through the parent or adopted as a new codec.
- Gap classification: local pricing; no claim to satisfy novelty or broad gain.

## 6. Even/odd scalar deinterleaving

- Construction: stable partition Unicode scalars by even/odd position, with both
  tapes in-band. This changes parent-visible adjacency without deleting data.
- Artifact: `portfolio.py`, family `parity`.
- Proved portion: alternating the tapes is exactly inverse, including odd lengths.
- Gap: natural-language/token adjacency is often destroyed; classical transposition
  ancestry overlaps existing stack ideas and is not certified new.
- Falsifier/attacker: odd length and supplementary Unicode; UTF-16 half splitting
  would be a different, transport-unsafe transform. Tests use full codepoints.
- Measured standalone raw win: metrics.tsv 811→798, NOT a frontier win or broad
  result. No parent trial or native decoding acceptance for this probe.
- Gap classification: transform solved; parent/native utility remains unestablished.

## Evidence and independence limits

Five probes produced 187 real-source messages with exact Python inversions;
217 checks include boundary cases and structural attacks. Pricing uses the live
reference tokenizer via `heldout.ts`, including complete natural-language keys.
Two newly fetched documents (Git credentials and Rust structs) plus 37 prior
sources are included. These are not independent model agents or trained systems.
No normalization, invented trial, benchmark simulation or optimistic score is
substituted for the recorded programs.

The two new sources yield no DIEXODOS plan; that refusal is negative discovery
evidence, not compression. The paid DIEXODOS trials are separately recorded and
must be compared against the fresh frontier. Broad superiority is not inferred
from any of these six invertible constructions.
