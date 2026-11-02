# X67 JSON fixtures — provenance

All four files are unmodified captures from the live GitHub REST API (`gh api`, authenticated
CLI, 2026-11-01), written to disk exactly as the API returned them: compact single-line JSON,
UTF-8, one trailing LF. They are canonical with `unit=''` under
`JSON.stringify(JSON.parse(text), null, '')`, which is what PROBOLE's domain check verifies
byte for byte before it will consider a plan.

| file | bytes | endpoint | measured raw tokens (`o200k_base`) |
| --- | --- | --- | --- |
| `gh-labels-50.json` | 14,670 | `GET /repos/nodejs/node/labels?per_page=50` | 4,371 |
| `gh-commits-4.json` | 21,293 | `GET /repos/nodejs/node/commits?per_page=4` | 7,777 |
| `gh-commits-8.json` | 40,471 | `GET /repos/nodejs/node/commits?per_page=8` | 14,334 |
| `gh-tags-60.json` | 24,128 | `GET /repos/nodejs/node/tags?per_page=60` | 9,890 |

Reproduce a capture with, for example:

```sh
gh api "/repos/nodejs/node/labels?per_page=50" > bench/x67/fixtures/gh-labels-50.json
```

The API returns a live snapshot, so a later capture will differ; the receipts in
`bench/x67/receipts/` record the source SHA-256 of the exact bytes that were measured.
