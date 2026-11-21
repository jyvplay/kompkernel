## Experimental codecs — draft, acceptance incomplete

This branch contains earlier experimental SCALAR, HORION and EPITYPOS work and
X149/X150 investigations. **Do not merge:** no new X150 Pareto-superior codec,
fresh-chat readability test, or significant identical-output whole-stack speedup
has been demonstrated.

### X150 corrections and measurements

- X149's ΠΟΛΥΣΤΗΛΗ emitted the original padded row rather than its compact row;
  inverse-only tests missed the no-op. The previously reported opt-in 29-lane
  comparison was incomplete. Its 138/237 lossy rewrite deltas were not general
  upper bounds and the 13→11 diff diagnostic omitted shared text. Documentation
  now explicitly corrects those claims.
- The grid transform is repaired, still default-off. A patch-targeted near-cap
  test found and fixed an exception in the public encoder. Post-repair final
  opt-in wires were unchanged on three lanes, but ps-aux **989 vs 980** and
  kubectl **316 vs 300** remain regressions; ps-ef is 296 vs 296. The
  two-grid ps-aux complete candidate was **1046 vs 980**. No claim of a
  shipping advantage.
- CHRISMATA is a new, unwired Git colored-diff SGR codec with 44 total tests
  across both experimental codecs and separate Python source-byte inverses.
  Completed full-parent trials refused 499→580, 617→704, 721→806, and a
  correlated prefix 1188→1269. The large full-diff trial timed out at 1200 s;
  its large raw saving is not a full-parent result.
- Fresh default-off 29-lane run finished with both workers exit 0 and every
  wire identical to X149: **11,962 tokens**. A bounded project wire reader
  source-checks 21; the remaining eight are explicitly unsupported. Category
  leaders and scope are in `bench/x150/receipts/`.
- TypeScript, patch-targeted tests, Python inverses and build passed after the
  last repair. An earlier concurrent build was killed 137 before the successful
  retry; CSS warnings remain. 935,816 ms batch wall time is not a controlled
  isolated speedup. No fresh-chat LLM or Lean kernel replay was available.

Next: establish a genuine held-out complete-parent gain and controlled
identical-output CPU/wall acceleration, run native single-chat byte and reasoning
gates, and complete independent source verification for every relevant wire.
See `bench/x150/README.md`, `research.md`, `native.md`, and receipts. Earlier
niche gains on the branch retain their own documented limitations.
