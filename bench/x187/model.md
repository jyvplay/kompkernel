# A–B. DIAMERIS model and technical specification

DIAMERIS is a new experimental module (`src/lib/omega/diameris.ts`), not a new theoretical primitive and not proven novel against every semantic operation in this large stack. Its ancestry is stable binary partition plus run-length routing, related to wavelet-tree bitvectors. It is not DESMI reservoir addressing, PERAS prior-event copying or THESI word postings.

## Admissible objects / access / units
Transform input: UTF-8-stable strings, at most50,000 UTF16 units. Priced planning additionally requires the reference tokenizer to accept the candidate spellings; its reserved-special-token refusals are propagated, not bypassed. This is a partial experimental encoder, not a total encoder over all Unicode strings. Unicode normalization is forbidden. Encoder partitions Unicode scalar values (code points), never UTF16 halves or grapheme clusters. Three classification predicates: ASCII letters, ASCII digits, or U+0400..U+052F range. Three block widths:256,1024,50000 code points. Each block serializes `[counts,A,B]` in JSON. Counts describe alternating runs from A and B, starting with A; only the first count may be zero. Both streams must be exhausted exactly. Concatenate blocks with no added separators.

Decoder needs no classification predicate or width: the streams and counts completely specify the inverse. These unsent encoder parameters are therefore not hidden information. Limits: frame400,000UTF16 units;≤196blocks;≤50,001counts/block,≤50,200counts overall; each count integer0..50000, later counts positive. Combined stream/output size≤50,000UTF16 units. UTF8 instability, malformed arrays, bool/fractional counts, underflow and leftovers refuse.

The native target is a fresh basic single-message chat containing the entire paid instructions and wire, with no skills, extra system prompt, tools, source access or trained vocabulary. No such receiver was executed. The program reader is not behavioral evidence.

## Resource and explicit success quantifiers
For fixed tokenizer o200k_base, charge exact tokens of the whole instruction+JSON+parent envelope, including escapes and all routing metadata. Require zero byte-error tolerance. Desired claim: there exists one fixed codec/selector and decoder contract such that for every admitted source its specified inverse is exact, and on the predeclared suite complete paid selection never regresses, improves by>10tokens in at least two prose and two ops lanes plus heldout support, and passes actual unassisted native receiver trials. This finite-suite predicate is stronger than one niche win and weaker than universal generalization.

Whole-stack speed gate: same complete wires, ≤0.9aggregate CPU and wall ratios in six-lane isolated ABBA measurements, no lane regression. Timing observations are not worst-case proofs. Research/publication evidence is a separate threshold: reproducible tests and honest negative-result labels are sufficient to publish but never to promote.

## Construction, proof and bounds
Stable partition preserves the internal order of both streams; run counts identify exactly which original contiguous pieces to consume. By induction over runs, the inverse emits the original prefix after each count and advances precisely that stream's cursor. Complete exhaustion excludes omitted or surplus characters. Independent Python uses native codepoint slicing; TypeScript uses spread-to-codepoints. UTF8-stability checks turn string equality into byte equality for this domain. This is an informal invariant, not a Lean proof.

Search is **not greedy**: enumerate at most9fixed (predicate,width) configurations, deduplicate identical folds and rank their complete exact token prices. There is no optimality claim outside that menu. Encoder/decoder fixed-plan scans and JSON serialization use O(N+R) abstract character work/storage, with R routing counts; at most9 scans and9tokenizations. Parent search is additional and potentially dominant; trials have90second wall limits, not guaranteed CPU completion bounds.

## Adjacent problems not substituted
Changing the tokenizer/vocabulary; binary rank/select indexes; unordered stream recovery; free routing; semantic summaries; character-length savings; original-source compression instead of parent gain; source-aware native reconstruction; executable inverse instead of model behavior; microbenchmarks instead of complete-stack speed; a finite sample instead of all inputs; discovery of an old mechanism under a new name; mathematical existence without practical implementation; error-correcting redundancy instead of compression; theorem statement without its dependency proof.

## H+, H−, H∂
H+: broad gains under the contract remain possible, not established here. H−: on a common finite alphabet with length cost, an injective map cannot strictly shorten every string (counting argument); this does not rule out gains on practical distributions or prove failure under the actual mixed tokenizer domain. H∂: costs and applicability change with routing density, block size, Unicode units, decoder behavior and caps. Failure of this finite menu is not an impossibility theorem.

References and exact retrieval limits are in `research.md`. No hybrid-bitvector space/query bound is inherited by this decimal-JSON representation.
