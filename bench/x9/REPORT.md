# X9 report: contract-language lever (partial turn)

Gate: a new mechanism-distinct codec that beats PARADEIGMA+DAEDALUS-D (A10) by more than a few tokens on at least one lane. **Not met this turn. No new codec was shipped.**

## Measured: contract language (o200k, rule semantics identical to the shipped DAEDALUS clause)
`lang-count.ts` → `receipt-lang-count.jsonl`

| variant | tokens | chars |
|---|---|---|
| EN shipped | 39 | 174 |
| EN short | 39 | 168 |
| ZH modern | 41 | 56 |
| ZH compact | 36 | 46 |
| ZH classical | 44 | 45 |
| JA | 63 | 76 |
| KO | 52 | 89 |
| DE | 44 | 195 |
| RU | 44 | 188 |
| mixed EN/ZH symbols | 35 | 43 |

Best saving is 3–4 tokens per DAEDALUS lane (ZH compact 36, mixed 35). Median contract share of M is 7.4%, so a wording change cannot move a lane by more than a few tokens. This is below the bar. It is not adopted. It is also a reader risk, so it stays out of the wire.

## Repo state at turn start
- Local branch was a stale clone at 7c7da87. It was moved to origin's `arena/95aaefc1-kompkernel` (e45c73e) with `git reset --mixed`; working-tree bytes were verified identical first.
- That tip already contains SYNARTESIS (170b0d3, 49c2a27) and DENDRON (e45c73e). The DENDRON trailing-newline patch is already applied (`denLines` refuses only `{},`).
- Valid DENDRON sweep: `bench/z51/receipts/sweep-dendron.jsonl` (14 rows). `git-ls-files-400` 1563→1461 (−6.5%), `find-bench-md` 1099→1080. Other lanes tie.
- `tsc --noEmit` exit 0.

## Not done this turn (no claim made)
- No new codec. No gate pass.
- Per-proof review of the openai/math proofs: not done (keyword pass only, from earlier).
- Fresh live web searches with new terms: not done this turn.
- LLM-native decode of any new wire: not done.
