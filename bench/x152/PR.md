## X152 — HOMOSEMA: verified narrow token gain; full acceptance remains incomplete

**Keep this PR draft and unmerged.** X152 adds an experimental, unwired codec with
a real complete-message gain, but native-chat and significant speed gates remain
unmet. Earlier X145–X151 artifacts and limitations remain in their benchmark folders.

### New codec
`homosema.ts`: JSON parser-state terminal coalescing. Comma/colon and/or container
closing terminal spellings share an alphabet; grammar state reconstructs the exact
original punctuation. All string contents, escapes, numbers, duplicate keys and
layout bytes remain unchanged. Not JSON parse/stringify or value normalization.
`homosema-frontier.ts`: optional two-close-dialect whole-parent tournament with
source-reader gates and strict fallback; not wired into production TAGSTACK.

| Source | Full current incumbent | Selected HOMOSEMA |
|---|---:|---:|
| Canonical json-pkg | 653 | 653 (unchanged) |
| Chalk v5.6.2 manifest | 387 | 385 (−2) |
| VS Code JSON extension manifest | 915 | **895 (−20, 2.19%)** |

Full in-band restoration instruction is included. Header fusion removes duplicated
instructions, not metadata required for decoding. Fixture bytes are pinned/hashed.
These are narrow structured-data discovery results, not general prose improvement
or an unbiased held-out distribution benchmark. No runtime Pareto claim: eligible
encoding adds two parent calls.

### Verification
- Fresh default frontier: **29/29 wires identical to X151, 11962 tokens**, workers
  exit zero. Bounded project reader: 21 exact, 8 unsupported, not all-pass.
- 24 ordinary complete trials and 6 fused repricings of actual emitted parents.
  **30/30 independently Python-decoded to original bytes**, reference token pricing,
  UTF-8 and token-ID round trips. External baselines also independently source-read.
- 2231 unit/boundary assertions, 16 fusion attacks, 13 optional-selector replay checks.
- Fresh full public API execution recomputed the original and both transformed
  parents, returned the same 895-token wire and passed independent Python reading.
  See `full-api.json` for actual CPU/wall cost, not a speedup claim.
- TypeScript and production build pass. No manifests changed.
- Native single-chat model evaluation **NOT_RUN**; frozen packet/protocol in
  `bench/x152/native.md`. Program inverse is not behavioral evidence.

### Honest speed experiment
Allocation-free vocabulary rejection gives identical complete pool snapshots.
The first timing run overlapped a short compilation and is excluded. Clean isolated
ABBA whole-stack test: 12 cold processes, 3 lanes, exact canonical messages. Candidate
B/A aggregate CPU **1.015625**, process wall **1.012454**: predeclared >=10% reduction
and lane-nonregression gate **failed**. No production speed change applied.

### Research/docs
`README.md`: A–J framework, six distinct tracks, 20 deceptive shapes, repair history,
source/metric/adversary details, category leaders and next tests. `research.md`: fresh
sources, deeper OpenAI superstring comparator/solution distinction, scoped lab claims;
no exhaustive proof audit or Lean replay claimed. Codec specification updated in
`docs/codec-abbreviations.md` with bounds, greediness, citations and CPU/wall scope.

The verified artifact advances token cost on a real-work structured input; it does
not satisfy the full requested conjunction. Next gate is an independent basic-chat
read of the frozen 895-token VS Code wire, then a preregistered unseen manifest/schema
corpus and latency evaluation. Do not merge on the token result alone.
