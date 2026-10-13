# Z40 receipts: DAEDALUS-D (dual-tokenizer glyph pool)

## What was built
- `src/lib/omega/daedalus-dual.ts`: `daedalusDualEncode(text)`. Same wire, decoder and decoder instruction as DAEDALUS. Encoder-only change: glyphs must cost ONE token under both `o200k_base` and `cl100k_base`. Exactness gate: `chironDecode(wire) === text`, else identity.
- Plumbing: `dualTokenizer` option through `ariadne.ts` (`scriptPool(script, enc, dual)` keeps only strings that are one cl100k token), `sibyl.ts` (forwarded to `renderBest`), `daedalus.ts` (forwarded to arms), and a default `false` in `sequoyah.ts` and `thoth.ts`. Default behaviour (dual off) is unchanged.
- Registry entry `daedalus-dual`.

## Corpus run (151 files, `bench/z34/receipts/vxr-eval-151.jsonl` list, `dual-151.jsonl`)
Message tokens = decoder instruction with wire embedded (`chironDecoderPrompt`), counted per tokenizer. Tools: `bench/z40/dual-151.ts` (bundled with esbuild, run with node, 2 shards).

| lane | n | DAEDALUS o200k | DAEDALUS-D o200k | DAEDALUS cl100k | DAEDALUS-D cl100k |
|---|---|---|---|---|---|
| ALL | 151 | 305603 | 307273 (+0.55%) | 374183 | 330806 (-11.6%) |
| fresh | 111 | 231982 | 233117 (+0.49%) | 281926 | 250646 (-11.1%) |
| wrapped_docs | 6 | 35349 | 35637 (+0.81%) | 44857 | 37531 (-16.3%) |
| code | 4 | 3065 | 3114 (+1.6%) | 3927 | 3295 (-16.1%) |
| ops | 11 | 16718 | 16833 (+0.69%) | 20624 | 18577 (-9.9%) |
| ops_real | 10 | 10860 | 10920 (+0.55%) | 14248 | 12845 (-9.9%) |
| prose | 6 | 4234 | 4233 (-0.02%) | 4819 | 4390 (-8.9%) |
| realjson | 3 | 3395 | 3419 (+0.71%) | 3782 | 3522 (-6.9%) |

- Byte-exact: 151/151 for DAEDALUS and 151/151 for DAEDALUS-D (decode of the wire equals the input).
- o200k: DAEDALUS-D is larger on 76 files, smaller on 32, equal on 43. So it is NOT Pareto-superior on the o200k frontier.
- cl100k: DAEDALUS-D smaller on 105, larger on 14, equal on 32. Codec output larger than raw input on cl100k: DAEDALUS 32 files, DAEDALUS-D 9.
- Joint o200k+cl100k: 679786 -> 638079 (-6.1%).

## Comparison with A10 and VERITAS-Q under cl100k (subset, NOT the full corpus)
`bench/z40/cl-compare.ts`, rows in `cl100k-a10-vq-subset.jsonl`. The run was cut for time: A10 and VERITAS-Q are much slower than DAEDALUS. It covers 20 files: prose 6, wrapped_docs 6, code 3 (of 4), ops 5 (partial, from an earlier unrestricted pass). All outputs were checked against the input (`decoded === text`) and all passed.

| lane | n | raw | DAEDALUS | A10 | VERITAS-Q | DAEDALUS-D | D vs DAE | D vs A10 | D vs VQ |
|---|---|---|---|---|---|---|---|---|---|
| prose | 6 | 4699 | 4819 | 4573 | 4286 | 4390 | -8.9% | -4.0% | +2.4% |
| wrapped_docs | 6 | 41824 | 44857 | 38195 | 38887 | 37531 | -16.3% | -1.7% | -3.5% |
| code | 3 | 2683 | 2565 | 2268 | 1973 | 2079 | -18.9% | -8.3% | +5.4% |
| ops | 5 | 21760 | 8760 | 7428 | 7204 | 7858 | -10.3% | +5.8% | +9.1% |
| ALL | 20 | 70966 | 61001 | 52464 | 52350 | 51858 | -15.0% | -1.2% | -0.9% |

Reading: under cl100k, A10 and VERITAS-Q already beat DAEDALUS by about 14%. DAEDALUS-D recovers most of that gap, but it does not beat A10 or VERITAS-Q by a large margin. The acceptance bar (large margin in one lane over DAEDALUS, A10 and VERITAS-Q) is NOT met.

## Not done
- No LLM decode test: the sandbox has no outbound route to a model endpoint (allowed hosts: github, npm, pypi). No LLM-readability claim is made.
- No Claude or Gemini tokenizer count: neither is available offline (Anthropic count_tokens endpoint not reachable).
- Lean was not run (no Lean toolchain installed; `lean`, `lake`, `elan` absent).
- A10 and VERITAS-Q under cl100k were not run on the full 151-file corpus.

## Diagnostic findings (bench/z40)
- `fast-glob` README: DAEDALUS returns identity. Cause: `chironDecode` returns the whole wire because a body glyph resolves to a list rule (`…` operator), so body expansion gives null. `consider()` then rejects every candidate. This is an encoder bug, not a time limit. Not fixed in this turn.
- Front coding of sorted listings under DAEDALUS (`frontcode-probe.ts`): +1.5% on find-listing, 0 on dpkg, ls, ls-iso, -2.3% on du. Negative. Not used.
- Oracle over DAEDALUS, VERITAS-P and VERITAS-Q per file on o200k: -0.7% total, almost all from the fast-glob bug. The o200k family is close to saturated.
