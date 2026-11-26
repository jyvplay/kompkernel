# DESMI formal model and design

## A–B. Objects and admissibility
A source is a UTF-8-stable JavaScript string of at most 50,000 UTF-16 units. Encoder refuses literal tilde sources. The wire is a complete decoder instruction plus JSON `[pool,ranges,body]`. Pool is printable ASCII, at most 12,288 characters. Up to 96 ranges `[start,length]` use zero-based starts and lengths 1..128; overlapping ranges are intentional. Body references `~N;` use one-based range numbers, no leading zeros. Literal tilde outside valid references refuses. Frame cap 220,000 units; body and decoded output cap 50,000. Output equality means exact UTF-8 bytes, not normalized text.

## C–D. Access and accounting
An executable reader receives only wire and fixed parsing rules; the behavioral target is a fresh basic single-message chat with the entire decoder text in that message, no tool, skill, system addition, source access or trained vocabulary. That behavioral test is NOT_RUN. Cost is exact o200k_base token count of the complete envelope, including JSON escaping, pool, ranges, body and parent contract. Character savings, phrase counts, free keys and uncharged metadata are not substitutes. CPU and wall are measured separately, not inferred from token size.

## E–F. Quantifiers and regime
Desired existence claim: there exists a single fixed codec/selector and decoder contract such that for every admitted source the specified inverse returns the exact source, and on the prespecified evaluation suite the selected paid frontier never regresses, with >10-token improvements on at least two prose and two ops lanes, plus held-out support and actual native-chat fidelity observations. This finite-suite predicate is not universal generalization. A fallback preserves baseline only when baseline fidelity is independently established; it does not create an improvement.

Native claim requires observations for a named model/version/configuration, with original response bytes compared to source bytes. There is no implication from program inversion to those observations. Runtime promotion requires identical wires and at least 10% aggregate CPU and wall reduction on six isolated ABBA lanes, with no per-lane regression. All numerical equality tolerances are zero; timing thresholds are empirical, not mathematical guarantees.

## Construction / proved portion
Select repeated matches of `[A-Za-z][A-Za-z0-9_/-]{3,127}` (bounded lexical chunks, not necessarily maximal words). Six plans combine minimum lengths 8/12/20 with frequency 2/3. Rank by length times repeats minus one, retain at most 96. Remove contained strings for packing, then greedily merge the ordered pair with greatest suffix-prefix overlap, capped at 128 characters; deterministic index tie order. Store each original selected word's first interval in the resulting shared reservoir. Replace selected source chunks by their range IDs. Prices rank complete plans; local packing is not token-optimal.

Invariant: every packing merge preserves all substrings already represented in both operands; containment removal also preserves coverage. For each body substitution the interval contains the exact removed chunk. One-pass nonrecursive substitution therefore reconstructs source bytes. ASCII-only pool avoids byte/codepoint/UTF16 indexing disagreement; all other source characters stay in the literal body. Tests are evidence for implementation conformance, not a formal kernel proof.

With K≤96, M≤128, source length N and pool length L≤KM: conservative packing work O(K³M²+K²L), memory O(KM); selection additionally scans O(N), sorts at most O(N) distinct chunks, performs up to six packings and exact tokenizations. Decoder is O(frame size + emitted size), with bounded-range slicing. Parent encoding is separate, potentially dominant, and trial-limited to90 seconds. No unconditional wall-clock bound is claimed.

## G. Adjacent problems not substituted
Shortest superstring symbol length; fixed-dictionary token segmentation; string-set storage without order; free-decoder compression; semantic summaries; grammar/phrase count; random-access indexes; lossless binary compression requiring a tool; known-source puzzle decoding; adaptive training; per-lane hand-tuned formats; cache-only repeated-input latency; tests on a generated toy corpus; invertibility without native behavior; finite-suite improvement without generalization.

## H. Outcome space and evidence threshold
H+: a broad paid native-readable gain remains possible; not established by this experiment. H−: universal strict shortening over every finite string is ruled out by counting for an injective representation over a fixed finite token alphabet (there are fewer strings below a length bound than strings at that bound). This does not rule out distributional gain. H∂: cap/marker exclusions, metadata costs, workload and model behavior can change outcomes. Do not infer global impossibility from these failed greedy plans.

## Novelty and attribution
New repository module/wire, not a claimed new mathematical primitive. Related to shortest-superstring dictionary packing and explicit substring addressing. GEITON stores parent-word prefix/suffix edits; DESMI stores arbitrary intervals in a shared possibly overlapping reservoir. PERAS copies from prior event ends; DESMI addresses a transmitted pool. Existing nested CHIRON/VERITAS dictionaries and prior superstring discussions limit novelty claims. All-stack semantic novelty is NOT_ESTABLISHED.

Englert–Matsakis–Veselý, ISAAC2023, DOI10.4230/LIPIcs.ISAAC.2023.29: approximation guarantees concern full maximum-overlap greedy and symbol length, not DESMI's capped merge heuristic, token price, decoder fidelity or parent composition. No theorem is inherited merely from using overlaps.
