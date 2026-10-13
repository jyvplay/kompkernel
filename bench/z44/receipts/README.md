# Z44 receipts — provenance

All rows are `o200k_base`, `OMEGA_DET=1`, produced by tools in `bench/z44/`.
`oneChat` is M(x) = tokens(contract + wire) measured on the emitted message, never wire-only.

| file | producer | build state | what it is |
|---|---|---|---|
| `codec-eval-gramma.jsonl` | `bench/z43/codec-eval.ts` (KEYS=daedalus,gramma,stichos) | final | **canonical** 8 files × 3 codecs; every row `exact=true` |
| `gramma-set2.jsonl` | `bench/z44/gramma.ts` | final | 8 files, per-dialect candidate tables for the same run |
| `gramma-set.jsonl` | `bench/z44/gramma.ts` | pre-repair | 12 files, taken BEFORE the block-comment and 1-space-JSON repairs; valid only for the lanes it lists that contain no block comments or 1-space JSON (readme, gh-prose, ps-eo, ls-usr-lib, linux-coding-style) |
| `gramma-smoke.jsonl` | `bench/z44/gramma.ts` | pre-repair | first smoke run (json-pkg, code-ts) |
| `onechat-gh-api.message.txt` | `bench/z44/gramma-prompt.mjs.ts` | final | the literal one-chat message for `holdout/gh-api.json.txt` (winner `json1`) |
| `onechat-gh-api.expected.txt` | idem | final | the exact bytes that message must decode to |

Superseded rows are kept rather than deleted so that the repairs are auditable; where the report cites a number, it
cites `codec-eval-gramma.jsonl` or `gramma-set2.jsonl`.
