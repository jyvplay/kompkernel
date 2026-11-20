# X145 — SCALAR experimental parent compiler

**Status: partial success; not eligible for the requested Pareto-gated merge.**

- New implementation: `src/lib/omega/scalar.ts`, optional TAGSTACK integration.
- Final Vite discovery lane: safe 274 → **260** complete o200k tokens (14 / 5.11%).
- Canonical baseline: 29 lanes, **11,962**, message-identical to X144b. Opt-in rerun is also message-identical: **zero canonical gains**.
- Additional package README trials: clsx 954→954; tailwind-merge 347→347. These are frozen installed-package sources, not a random/blind general-prose sample; clsx is a previously seen package with a larger extract than X144b.
- 8,222 unit assertions / 2,053 accepted grammar cases; 15 malformed-shape tests plus rule cap, exception cleanup, source isolation and header tests.
- Independent Python: **2,059 exact source reconstructions**, including synthetic test outputs. Not 2,059 distinct real-world documents, and not native LLM verification.
- Memo-off/on/off gate: 274/260/274 and repeated messages exact.
- TypeScript and production build passed. See final-gate.json for source reader coverage; unsupported inherited formats are explicit, not counted as source verification.
- Six mechanism routes: SCALAR, Brotli/base64, backward copies, numeric deltas, layout factorization, semantic normalization. Existing alternate controls: **zero wins** over their historical safe baseline. Semantic normalization has a proved collision.
- Isolated 24-call ABBA/BAAB timing gate **failed** (order effects reverse the apparent speedup). No demonstrated whole-stack speedup; no basic-chat native evaluator or proof kernel run. Default is unchanged.

## Reproduce
`npm ci`, then `bash bench/x145/run.sh`. Full sweeps can take tens of minutes.
The script was assembled from executed constituent commands and syntax-checked;
the combined serial script was not itself executed. Saved frontier timings were
concurrent and must not be used for isolated speed claims. Generated bundles
are ignored. Package manifests/lockfile are unchanged.

## Evidence map
- `REVIEW.md`: A–J formal scope, bounds, H+/H−, thresholds, six routes, invalid claims, attacks, release decision.
- `research.md`: fresh searches, classical ancestry, individual formal-statement inspection and replay limitations.
- `receipts/unit.json`, `attacks.json`, `memo.json`, `python.json`: targeted gates.
- `receipts/frontier*.jsonl`, `leaders*.json`, `summary.json`: canonical sweeps/category leaders.
- `receipts/integration-direct.jsonl`: superseded 257-token direct-selection design; retained only as history. **Not the final result.**
- `receipts/integration.jsonl`: final deferred 260-token design.

Highest-information missing test: blind basic-chat source reconstruction of the
final Vite message, no skills/system instructions/tools, byte-compared to source;
then isolated repeated ABBA whole-stack speed and genuinely new prose/ops data.

Final wire gate: **63** complete prices/transport/token-ID checks, **47** source-byte reads; **16** unsupported entries are the same eight inherited formats in two sweeps.
