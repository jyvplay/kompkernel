# X183 model and acceptance boundaries

A. Domain: UTF-8-stable JS strings ≤50,000 UTF-16 units; no tilde for encoding. This is not a codec for all byte strings. Fallback remains existing frontier.
B. Wire: the literal GEITON instruction followed by a fully paid parent wire encoding JSON [rows,body]. At most 64 rows; each literal ASCII lexical word is 1–96 characters, or [earlierID,prefixLength,suffixLength,literalMiddle]. Roots are not shared out of band.
C. Inverse invariant: row j depends only on smaller indices. Inductively its parent is already reconstructed; nonoverlapping prefix/suffix and literal middle determine a unique word. Markers are replaced once. Encoder source forbids tilde, lexical words cannot contain tilde, and all other characters survive. This proves the software inverse on admitted sources, not model behavior.
D. Objective: countTokensExact(key + parent.message), never a sum of separately tokenized fields. Compare the existing canonical wire. Raw and free-key improvements are diagnostics only.
E. Search: cap 8/24/64 times unit/token row pricing, duplicate wires removed. Longest common prefix then nonoverlapping common suffix is greedy; row attachment is greedy. Neither is a minimum-BPE edit solver or optimal arborescence. Full-parent pricing currently tests selected plans, not every plan or composition.
F. Bounds: at most six plans; O(n + V log V + k² L) elementary work per plan excluding tokenizer, with k≤64,L≤96. Exact BPE calls and existing parent search add work; this is not a measured CPU/wall bound. Decoder bounded input and output sizes; JSON parsing still allocates the bounded frame. No whole-stack speed gain claimed.
G. Gate: >10 paid tokens saved on ≥2 prose and ≥2 ops including heldout, protected nonregression, exact independent reads, mechanism novelty review, and actual native chat trials. No qualifying win implies reject adoption, not universal impossibility.
H. Modal separation: POSSIBLE encoder inverse ≠ OBSERVED native decode; OBSERVED raw win ≠ paid Pareto gain; NOT_RUN ≠ pass. Flat and forced-edge ablations distinguish dictionary substitution from hierarchical edits.
I. Repair protocol: rerun unit, independent, malformed/expansion tests and affected parent gates after changes. Parent encoder self-report is asserted but is not independent verification; paid TS reader status is separately recorded.
J. Falsifiers: source mismatch, unsupported parent reader, any hidden key cost, heldout failure, ancestor equivalence, or protected speed regression blocks the corresponding claim. Highest-information next test is paid edge-vs-flat performance, not shortening the header blindly.

## Fifteen false solution shapes and their rejection test

1. Free dictionary: count whole wire.
2. Free root: include every literal row.
3. Free parent: include parent instruction.
4. Token additivity: tokenize concatenated wire.
5. Semantic equality: compare original bytes.
6. Unicode normalization: stable transport and byte comparison.
7. Recursive marker expansion: one-pass only; lexical rows exclude marker.
8. Forward/cyclic rows: earlier-index guard.
9. Overlapping edits: p+s≤parent.length.
10. Duplicate dictionary aliases: reject repeated expanded word.
11. Leading-zero marker: reject leftover tilde.
12. Expansion bomb: 50,000-unit guard.
13. Raw-only victory: compare canonical frontier.
14. Flat-dictionary win relabeled hierarchical: record edges; flat ablation.
15. Software inverse relabeled native: native explicitly NOT_RUN.
16. Greedy attachment relabeled optimal MST: no optimality claim.
17. Microbenchmark relabeled full-stack speed: no timing claim from overlapping processes.
18. Ineligible sources silently dropped: screen lists every source and eligibility.
19. Kernel source relabeled checked theorem: no Lean execution, no proof acceptance.
20. Six parameter settings relabeled six mechanisms: separate portfolio inventory; requirement not met by this grid.
