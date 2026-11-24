# X175 — STROFOS (completed during X176)

Status: experimental, unwired; **no acceptance or Pareto improvement established**. Current session date: 2026-11-14 UTC.

## Objects and gates

Source is the original UTF-8 file byte sequence. Candidate cost is exact o200k token count of the complete in-band instruction, metadata, and parent wire, not just the transformed payload. The baseline is X174's 29-lane / 11,962-token frontier; a fresh replay is required. Decoder implementations and native single-chat model decoding are separate gates. No native endpoint or theorem kernel is exposed in this session; neither is claimed executed.

H+: exact original bytes, significant (>10-token) paid gains across varied prose/ops settings, no protected frontier regression, and measured whole-stack speed gain with fidelity preserved. H−: a concrete failed inverse, paid loss, or runtime regression refutes the corresponding candidate claim, not every possible compressor. H∂: bounded exact executable transform with missing native or generality evidence. Current STROFOS evidence is H∂, not H+.

## New mechanism

`src/lib/omega/strofos.ts`: each selected maximal ASCII-letter word becomes its lexicographically least cyclic rotation, with explicit `~N:` orientation. Decode by rotating right N. Unlike KRYPTOLYSIS, positions rather than alphabet values change; unlike KYKLOS, no event cycle or dictionary chooses replacements. Unlike VALENCE, no arbitrary line-permutation rank is encoded. Classical necklace canonicalization is prior art, not a new mathematical discovery. Lexical repository searches found Lyndon terminology in METATRON/EPISTEME, but those searches are not an exhaustive semantic novelty proof.

Source cap 50,000 UTF-16 units; words 4–48 letters; four length/frequency threshold plans, deduplicated; exhaustive orbit minimum (quadratic per bounded word), not a claimed linear Booth implementation. Literal tilde, BOM, and unstable UTF-8 transport are refused. Parent callback at most once, selected by direct full price: this is a heuristic and is not parent-price optimal. Full executable inverse must match before adoption. No wall-clock search cutoff. Production defaults unchanged.

## Executed preliminary evidence

- Unit gate: 19,950 checks, 9,840 exhaustive ternary words, 37 source files, 97 plans; **zero raw-token wins**.
- Independent Python reader: 9,965 checks, including 10 baseline/candidate paid-parent wires against original file bytes; no unsupported primary wires.
- Five paid-parent candidates all lose: email 486→545, KB 620→684, ps 381→445, JSON 653→713, diff 411→482. Selector retains each baseline; this is not a runtime-Pareto win. Saved-wire gate: 40 checks.
- Targeted affordable malformed-parent attack: 18 checks. Initial test incorrectly expected the reader callback for an unpaired surrogate; transport validation correctly rejects before that callback. Failure log preserved, assertion repaired, unit/paid/independent gates rerun. No codec repair was needed.
- Sparse local lifting follow-up: 43,694 checks; weighted non-overlapping selection agrees with exhaustive search through length seven. This proves only its additive isolated-span objective, not whole-message/parent optimality. Four synthetic long-integer plans are not everyday-text gains.
- Portfolio artifacts: rotation, sparse lifting, whole-run lifting, XOR residuals, bounded ranked graph walks, BWT, and anchor-distance controls. These are distinct controls, not seven new discoveries. Detailed status in `receipts/portfolio.json`.
- Tokenizer speed experiment: eliminate tokenTail's per-chunk token array and suffix concatenation. Both count and vector receipts byte-match baseline. Isolated ABBA whole-stack experiment: 24 identical wires, CPU ratio 0.982312 and wall ratio 0.979443. **Rejected** against ≤0.90 aggregate and ≤1 protected-lane gates; diff CPU 1.029121 / wall 1.045890. Canonical replay was paused during timing and trials, then resumed. Production tokenizer unchanged.
- `npx tsc --noEmit` and `npm run build` passed.
- Inventory: 418 prior modules lexically scanned. Novel research hosts/identifiers checked against base commit; digit-context decomposition 2606.03570 was already cited in X166 and is not new repository research.
- Three native handoff prompts prepared; all **NOT_RUN**.

The canonical replay completed during X176: 29 identical wires / 11,962 tokens, Python 22 exact / 7 unsupported / 0 mismatches, TS 21 exact / 8 unsupported. X176 completed the two-source all-plan STROFOS follow-up; all seven candidates lose. Current source gates, final report/category updates and build checks passed under `bench/x176/validate.sh`. Generated bundles are ignored; build scripts and receipts persist. The attempted Kubernetes daemonset-document 404 is preserved in `heldout-first-attempt.json`; a whole service-debugging document was subsequently retrieved from the pinned commit and tested.

The highest-information next compression experiment is parent-price selection across all four orbit plans, with the unchanged source as a control and the full 42-token outer instruction paid. Current direct-price selection is only a heuristic. No benefit is promised; shortening the header alone cannot establish native decoding or broad gains.
