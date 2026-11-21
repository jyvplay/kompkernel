# X161: KAMPYLI exact finite-difference table codec

Adds optional KAMPYLI plan/undo/read/direct encode/strict-frontier selector.
Classical degree2–4 finite differences, distinct from existing affine counters
and driven same-row accumulators. No production/default routing change.

Complete-price results on exact first100-line published OEIS mirror excerpts:
- Squares271→87 (-184)
- Cubes334→89 (-245)
- Triangular272→87 (-185)
- Prospective post-freeze fourth powers354→91 (-263)

Verification:
-3232 unit checks;113 independent Python checks using a different algebraic
 implementation, including8 full baseline/candidate source-byte comparisons.
-32 selector/reference-price/source checks; protected29 lanes all no plan.
-Canonical29 wires unchanged11962;21 bounded source reads,8 unsupported.
-All24 speed-experiment wires equal fresh canonical. Two >=10% speed gates
 FAIL; no production optimization. Differential token-stream gate9156 per arm.
-HAPLOGRAPHE follow-up on complete real Sphinx commit798→797; both messages
 independently inverted, insignificant one-token gain.
-Fresh research ledger with pinned lab artifacts and independent verification
 of1084-point F3^9 cap set,586986 pairs and mutation rejection. No Lean replay.
-tsc --noEmit, npm run build and whitespace checks pass; manifests unchanged.

Limits: numerical study-family excerpts, NOT broad prose/ops gains or complete
OEIS documents. Native one-basic-chat verification NOT_RUN. No full Pareto or
terminal-codec certification. Initial column design rejected and repairs/gates
recorded. Unconditional merge explicitly requested by user, separate from
scientific acceptance.
