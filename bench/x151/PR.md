## X151 update — research remains draft; do not merge

New experimental, unwired **DIATHESIS** codec embeds a seven-hex-digit fragment
in an existing independent CHIRON rule window's permutation rank. This is a new
repository combination, not new permutation mathematics (VALENCE/METATAXIS and
external antecedents are explicitly acknowledged).

### Honest result
- ps-aux complete candidate **1062 vs 980** tokens: rejected.
- kubectl folded parent 319 vs 300, no supported feasible carrier: rejected.
- 5928 synthetic unit assertions; independent Python reconstruction of unit wire
  and actual 6590-byte ps-aux wire. **Not native model verification.**
- No demonstrated >10-token gain, no significant whole-stack speedup, native
  one-basic-chat gate **NOT_RUN**. Mandatory acceptance conditions are unmet.

### Correctness repairs
ARIADNE affected-pattern scratch previously miscounted after signed Int32 generation
overflow (expected 13, got 21) and threw at 65537 distinct patterns. Dynamically
growing all scratch arrays and resetting stamps before overflow fixes both measured
reproducers. 70 targeted regression checks cover both scorer APIs and committed
costs. These repairs are not advertised as compression or speed improvements.

### Verification
- Pre-repair baseline: all **29/29 wires identical to X150, 11962 tokens**;
  both workers exit zero, 877105 ms concurrent wall time (not speed evidence).
- Bounded source reader: 21/29 matches, 8 unsupported; all 29 token prices and
  token-ID round trips pass.
- Post-repair full frontier completed: **29/29 identical wires, 11962 tokens**,
  both workers exit zero; 884245 ms concurrent wall time, not a speed comparison.
  See `bench/x151/receipts/repaired-compare.json` and `repaired-wall.txt`.
- TypeScript, Vite build, 44 prior-codec assertions, new units and independent
  Python inverses pass. Manifests unchanged.

Documentation: `bench/x151/README.md` (A–J framework, six distinct tracks,
20 deceptive shapes, modal gate, leaders, next test), `research.md` (live sources
and individually scoped lab claims), `docs/codec-abbreviations.md` (technical
specification, search policy, citations and CPU/wall distinctions).

Earlier X145–X150 work and limits remain documented in their respective benchmark
directories. Keep this PR draft; the requested Pareto/native-readability/speed merge
gates have not passed. No exhaustive frontier-lab proof audit is claimed.
