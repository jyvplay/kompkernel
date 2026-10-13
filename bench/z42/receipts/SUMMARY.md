# Z42 receipts

Speed fix: gpt-tokenizer merge cache disabled (`setMergeCacheSize(0)`) in `src/lib/omega/bpe.ts`.

Tools actually run: node (--cpu-prof), esbuild bundles of bench/z42/*.ts, `npx vite build` (exit 0), `npm ci`, bench/z37/rebuild-z31-docs.py (111/111 rebuilt).

| Test | Result |
|---|---|
| 14-file sample (`cache-identity.jsonl`), serial, maxArms 1 | total encode 256 s (default cache) -> 81 s (cache off), 0.32x |
| Prompt identity, same 14 files | identical on 13/14; dpkg-l differs (see below) |
| Round-trip exact (decoded === input) | true on all 14, both modes |
| dpkg-l under OMEGA_DET=1 | cache on and off: same wire hash bcd1de9b5a12a0e2, o200k 4664 |
| ajv README CPU profile | 65.6% of CPU in addToMergeCache (default cache) |
| bpe.ts ids vs library | identical on 5 sample strings (o200k and cl100k) |

Why dpkg-l differs in wall-clock mode: daedalus.ts and several sub-codecs (ariadne, sibyl, aion, akribeia) gate search on Date.now() deadlines. A faster run lets more search finish, so the default-cache run (4690) and the cache-off run (4664) differ. Under OMEGA_DET=1 the two agree. Round trip is exact in both.

Not done this turn: LLM decode test (no endpoint reachable).
