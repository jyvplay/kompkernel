# X146 — EKDYSIS

**New codec delivered; overall Pareto acceptance is NOT met.**

EKDYSIS removes complete canonical JSON quoting layers before parent compression,
then restores them from an in-band instruction. It is a new repository
implementation of a standard serialization inverse, not a novel mathematical
compression theorem. It remains optional and does not change the default frontier.

## Results
| Gate | Result |
|---|---|
| HTTPX PyPI JSON-quoted description | **1040 → 1024** complete tokens, **16 / 1.54%** saved |
| Current final wrapper | Reproduces the 1024-token message, source/transport exact |
| Canonical frontier | **29 / 11962**, every message identical to X145; no EKDYSIS plans |
| SCALAR Vite confirmation | **260**, unchanged |
| Additional completed final candidate prices | 3 full API responses lose 33–40; quoted Jieba loses 2 |
| Larger trials | Pypinyin killed (137); Rich heap exhausted (134); FastAPI not reached |
| New codec latency | **1.887× baseline** on warmed isolated HTTPX comparison |
| Separate config-scope experiment | **2–5%** wall improvement on KB/metrics; significant 10% gate fails |
| Basic-chat native decoder | **NOT_RUN**, no clean-chat model endpoint established |
| TypeScript / production build | PASS |

The HTTPX source is an exact contiguous JSON string token from an actual PyPI
API response. A second fetch matched it; the full response and SHA-256 provenance
are saved. It is not generated text or an independently sampled benchmark suite.
Other discovery snapshots and extracted body fields are explicitly identified;
fields extracted from the same response are not independent documents.

## Code and use
- `src/lib/omega/ekdysis.ts`: planner, standalone encoder/decoder.
- `src/lib/omega/ekdysis-frontier.ts`: optional full parent composition and
  bounded message-only decoder. Non-applied results retain their parent decoder.
- `src/lib/omega/prolepsis.ts`: explicit synchronous config-scope experiment;
  not automatically applied to existing calls.
- `docs/codec-abbreviations.md`: design, greediness, citations, resource bounds,
  refreshed category totals and generalized local leaders.

## Verification
8,208 unit assertions / 2,047 accepted diagnostic representations; 1,008 scope
checks. Independent Python reconstructs 2,079 emitted representations (mostly
synthetic/repeated), not 2,079 real documents. Final gate: 36 complete message
prices and UTF-8/token-ID round trips; 28 supported source-byte reads and eight
unsupported inherited frontier formats. Composite-reader attacks cover cycles,
expansion bombs, huge layout padding, reserved envelopes and source-aware ambiguity.

See `REVIEW.md` for A–J, six mechanism-distinct experiments, 18 invalid result
shapes, quantifiers, H+/H−/boundary conditions and the repair ledger. See
`research.md` for fresh primary sources and the limits of individual lab audits.
No Lean/agent/expert/model verification is claimed.

## Reproduce
After `npm ci`, run `bash bench/x146/run.sh`. The serial script was assembled
from executed constituent commands and syntax-checked; the entire combined
script was not itself executed. It uses frozen inputs and keeps the expensive
known-failing large trials opt-in with `RUN_LARGE=1`. The saved initial frontier
and discovery trials ran concurrently; their timings are not isolated speed
comparisons. `speed.jsonl` and `codec-speed.jsonl` were separately isolated and
warmed. Manifests and lockfile are unchanged.

## Missing acceptance gate
Use `native/httpx.txt` as the sole input in a fresh basic chat without tools,
extra instructions or source access, save the actual response verbatim, then
run `python3 bench/x146/native_check.py httpx response.txt`. The checker does
not call a model and cannot authenticate that an inference occurred. SCALAR's
prior highest-information test is also prepared as `native/scalar-vite.txt`.

**Do not merge as a breakthrough:** native reliability is untested, the new
codec's encoder latency regresses, significant acceleration failed, and the
canonical prose/ops frontier did not improve. The verified artifact is a narrow
16-token size/fidelity improvement plus a modest independent speed experiment.

Additional baseline audit: Python also reconstructs nine saved baseline messages.
Two repeated entries for the same Node API baseline use an unsupported reader
format; the winning HTTPX baseline is supported and source-byte verified.
