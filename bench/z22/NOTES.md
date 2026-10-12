# z22 notes: headroom probes and the PHALANX-P4 legend experiment

All token counts: o200k_base, the repo's own `countTokens`. Each receipt is the raw output of the probe in this folder.

## Headroom on the P3 wire (headroom-probe.receipt.txt)
P3 total 36,223 tokens over 24 corpus files.
- hex IDs (>=16 chars): 626 tokens (32 IDs; 524 in openstack). Not a codec target: a base change to decimal or base-62 needs base arithmetic that a reader cannot do byte-exactly.
- URLs: 371 tokens (34).
- whole-line repeats (>=12 chars): 541 tokens (46 lines; 478 in package-lock).
- number runs >=9 digits: 574 tokens. Random fraction digits; no structure to fold.

## Per-stage rule-line cost (header-probe.receipt.txt)
Rule text tokens per stage: DITTO 37, DIRFOLD-A 24, UUIDFOLD 30, KOINE 59, RECALL 59.
Total rule-line overhead: 747 of 36,223 (2.1%). Peaks: openstack 129/1,397 (9.2%), ls-full-iso 38/677 (5.6%).

## VERITAS MIN_WIN is not a parameter
`veritas.ts` hard-codes 3-token windows (`toks[i+2]`). A 2-token phrase variant needs an encoder change, not a constant change. Not built. Would be a new stage with its own redteam.

## PHALANX-P4 experiment (phalanx4-probe.receipt.txt) -- NOT registered
Idea: one legend line replaces the per-stage rule headers. Chain the stages on prefix-free bodies; the decoder rebuilds each applied stage's header from the legend.
Measured on the same 24 files (exact on all 421 corpus+fuzz wires, 20 edge cases, 3,000 fuzz):
- Variant A, terse clauses, all five stages in the legend: -274 tokens (-0.76%) vs P3. Its clauses were NOT exact: they dropped the field-split definitions and the UUIDFOLD boundary rule, and DIRFOLD-A's "=name" applies only to the last field. Rejected as inaccurate.
- Variant B, same, with accurate clauses: +45 tokens (+0.12%) vs P3. Legend text costs as much as the original headers.
- Variant C (chosen as best): KOINE and RECALL in the legend; DITTO, DIRFOLD-A, UUIDFOLD keep inline P3 headers: -49 tokens (-0.14%).
Conclusion: exact, legend-decodable descriptions cost about as much as the headers they replace. Legend unification is not a real gain. Not adopted. Code kept in `experiments/phalanx4.ts`.
