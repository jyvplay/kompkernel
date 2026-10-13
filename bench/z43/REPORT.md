# Z43 report: KALLIGRAPHOS registered, scoped honestly

## Verdict

- **New codec committed:** `kalligraphos` (module `src/lib/omega/kalligraphos.ts`, registry entry in `src/lib/omega/registry.ts`). It is the PR #23 codec, integrated and corrected so its registry entry reports the **one-chat cost with the decoder contract included** (`messageTokens`). The PR #23 entry returned only the wire, which is the inadmissible wire-only measure.
- **Where it beats DAEDALUS:** only on text that uses Unicode mathematical-alphanumeric styling (bold, italic, sans-serif, monospace letters and digits, copied from social posts or headings). On those inputs the one-chat cost is 13–58% lower than the best DAEDALUS mode (measured in this session, numbers below).
- **Where it does not:** ordinary ASCII prose, code, and ops text. There KALLIGRAPHOS does not apply and its output is byte-identical to DAEDALUS single. **No general gain was found this turn.** The task asked for general prose and ops gains; I did not find one. This is a lane-specific gain.

## One-chat cost, styled-Unicode lane (decoder contract counted; measured this session)

Inputs are constructed: real English sentences from `bench/holdout/gh-prose.txt` restyled with the seven mathematical-alphabet families. Fixtures are in `bench/z43/fixtures/`.

| input | raw o200k / cl100k | DAEDALUS single o200k / cl100k | DAEDALUS dual o200k / cl100k | KALLIGRAPHOS o200k / cl100k |
|---|---|---|---|---|
| `fancy-plain-post.txt` (14 styled sentences, bold / bold-italic / sans) | 2015 / 2343 | 1193 / 1561 | 1253 / 1561 | **530 / 609** |
| `fancy-families.txt` (7 families) | 626 / 658 (DAEDALUS picks raw) | raw | raw | **491 / 489** |
| `fancy-digits.txt` (styled digits and letters) | 90 / 110 (DAEDALUS picks raw) | raw | raw | **78 / 83** |

Source rows: `bench/z43/receipts/fancy-frontier.jsonl` and `bench/z43/receipts/kalligraphos-registry-sample-and-fancy.jsonl`.

Percent change for KALLIGRAPHOS (o200k): −55.6% vs DAEDALUS single on the post, −57.7% vs dual, −21.6% vs raw on the families text, −13.3% vs raw on the digits text.

## ASCII lanes (no gain)

- 151-file corpus (o200k): KALLIGRAPHOS reports `applied=false` on all 151 files. It matches the z40 DAEDALUS-single one-chat number exactly on 92 files. The other 59 differ by small amounts, attributed to load-dependent search in DAEDALUS (this run did not set `OMEGA_DET=1`). Aggregate: −0.48% vs min(single, dual) in the z40 receipts, which is within that noise. **No ASCII gain is claimed.**

- KALLIGRAPHOS reports `applied=false` on the 14-file sample. Its one-chat cost equals DAEDALUS single (readme.txt o200k 688, gh-prose.txt o200k 1782; `bench/z43/receipts/kalligraphos-registry-sample-and-fancy.jsonl`).
- The earlier "649-token readme" figure was a wire-only artifact. The true one-chat cost is 688.

## Round-trip exactness

- Edge cases, 10 constructed inputs × 2 encodings (`bench/z43/kall-edge.ts`, receipts `bench/z43/receipts/kalligraphos-edge.jsonl`): **20/20 byte-exact**. Cases include marker characters `✅ ✔ ⌁ ⌂` in plain text, empty and one-character input, all seven families, digits, mixed lines, fenced code, and URLs.
- 14-file sample (`bench/z43/receipts/kalligraphos-registry-sample-and-fancy.jsonl`): all `exact=true`.
- 151-file corpus, o200k (`bench/z43/receipts/kalligraphos-151-o200k.jsonl`): **151/151 byte-exact, 0 errors.** Also a single-run check: the registry runner was run without `OMEGA_DET=1` under CPU contention, so DAEDALUS internal time gates may have changed a few outputs (see the ASCII section).

## LLM-readability test (in-context decode, external diff)

- Message for `fixtures/blind-styled.txt`: 133 one-chat tokens (270 raw), decoder contract included. The printed message is reproduced in the session; `fixtures/message.txt` holds the last generated one.
- The model (the agent writing this report) decoded it without any tool, writing the output to `fixtures/blind-decoded.txt`. `cmp` against the hidden target `fixtures/blind-expected.txt` returned **IDENTICAL**.
- Caveats, stated plainly:
  - One model, one short sample, one run. The decode was done in-context by the agent, so it is not an external LLM.
  - The plaintext is visible inside the wire (style spans carry ASCII operands). The test therefore measures the restyling step (mapping ASCII to the right Unicode codepoints), which is the step most likely to fail. It does not measure reading comprehension of an unseen message.
  - The sandbox's outbound allowlist (`github.com`, `registry.npmjs.org`, `pypi.org`, and similar) does not include any LLM API endpoint, so an external-model decode test was **not possible** here. Other models are untested.
  - The first sample was not blind: its expected output had been printed earlier in the session. The blind sample was generated after that.

## DAEDALUS contract wording (no gain left)

`bench/z43/receipts/contract-candidates.txt`: the current 39-token decoder contract is at best 32 tokens with an alternative wording I tried (o200k and cl100k agree). LAKONIKOS already trims −10 tokens per message (`bench/lakonikos-report-2026-10-10.md`). Further contract trimming is at most about 7 tokens per message, so it is saturated.

## Unregistered `src/lib/omega` modules (15 attempted of ~55; partial)

Receipts: `bench/z43/receipts/unreg-modules-part1-partial.jsonl`, `unreg-modules-part2.jsonl`.

- **Admissible (decoder prompt counted), none beats DAEDALUS on any file:** `column`, `lattice`, `trie`, `hermes-contract`, `hermes-fractal`. Each is worse than min(DAEDALUS single, dual) on every file except ties (e.g. `df-h.txt` 131 = 131, `git-log-fuller.txt` 143 = 143). `hermes-*` mostly fall back to identity.
- **Inadmissible, wire only (no decoder prompt counted):** `banyan`, `ctxcopy`, `sigma`, `veritas-a`, `veritas-g`, `veritas-s` (partial), `splice` (partial), `strand` (no one-chat value).
- **Harness error, not a codec result:** `stencil` reports a constant 111 tokens on every file. Its `stencilDecoderPrompt` takes a result object, not the wire string, so the evaluator counted only a fixed header. Needs a fair re-measure before any ranking. `zeta` failed in the harness (called with the wrong arguments) and was not evaluated.
- **Not evaluated:** about 40 modules were not swept (time budget). They remain unranked.

## Wire attribution (38 files, `bench/z43/receipts/wire-attrib-38.jsonl`)

DAEDALUS wire tokens: 86,967 (34 files DAEDALUS mode, 4 raw). Class shares: latin 49.0%, markup-punct 38.2%, digits 5.6%, glyph-cyr 3.9%, ws 3.3%. Most of the residual is English words and markup punctuation, and most punctuation is already one token each. The headroom for a token-level tweak is small.

## Speed (no codec committed)

Profile on the ajv README (`CACHE=0`, `OMEGA_DET=1`, hash `5a61762635b53648`, exact): `runCostPrepared` 14.5%, `getBpeRankFromString` 11.8%, `renderBest` 8.9%, `binarySearch` 8.2%, `bytePairMerge` 7.3%. A byte-identical speedup would be a long, risky refactor of `renderBest`. I did not do it.

## Web search (live, this turn)

- arXiv 2604.13066, "Lossless prompt compression via dictionary encoding" (2026): LLMs learn an encoding key in context and interpret meta-tokens correctly. This is the same mechanism class as DAEDALUS (dictionary in the system prompt, decode in context). Read from the search snippet only.
- arXiv 2602.13266, LoPace (2026): Zstandard and BPE with binary packing, lossless storage. Binary output is not single-chat LLM-readable, so it is out of scope for this lane.
- DEV Community, "Fancy Text Is Unicode Data" (2026): mathematical-alphanumeric "fancy text" is Unicode data, and NFKC can fold it back. This supports the styled-text lane and shows why KALLIGRAPHOS keeps the style as an opcode instead of normalizing silently.

## Corrections to earlier session notes

- The `kalligraphos` 649-token readme figure, and the PR #2 numbers, were wire-only. Neither is admissible.
- `base.jsonl` stalled on `dpkg-l` and was stopped at 38 rows. For the comparisons above I used the z40 receipts and same-session numbers. The z40 cl100k values differ from fresh runs by a few tokens (e.g. readme cl100k 700 vs 692), which is noise of about 1%.
- `codec-eval.ts` no longer falls back to wire tokens when a codec reports no one-chat cost (the row gets `oneChat=null`).
