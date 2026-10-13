# PR codec review and frontier correction (2026-10-10)

Scope: this turn's receipts for open PR codecs and the current frontier. No new codec was
accepted in this turn. Every number below comes from the commands listed; the raw KAIROS and
starlight/kalligraphos rows are in `bench/pr-frontier-receipts-2026-10-10.jsonl`.

## Repo state (verified)

- Local `arena/da2b9818-kompkernel` was stale at `594b8a5` (main). Reset to
  `origin/arena/da2b9818-kompkernel` = `6999ebc` (ANTIPHON) → `b7f55c4` (KAIROS) → `6d21368`.
  The two uncommitted files (`chiron.ts`, `registry.ts`) were byte-identical to origin, so the
  reset lost no work. Backups were kept at `/home/user/backup-turn4/`.
- `npm install` ran; `node_modules/.bin/tsc --noEmit -p .` exits 0.
- Corpus regenerated with `python3 bench/periodos-fetch.py`: 185/185 files match
  `bench/periodos-corpus-manifest.json` (sha256).

## Frontier correction

The earlier frontier comparisons used CHIRON/KAIROS as the reference. That was wrong. Main's
registry already contains DAEDALUS (`key: 'daedalus'`, `src/lib/omega/daedalus.ts`), which
beats KAIROS on every lane measured here (o200k_base message tokens, one chat, exact):

| file | raw | KAIROS (32M units) | DAEDALUS (main) | DAEDALUS − KAIROS |
|---|---:|---:|---:|---:|
| bench/holdout/readme.txt | 843 | 704 | 688 | −16 |
| bench/holdout-work/email-thread.txt | 629 | 558 | 538 | −20 |
| /home/user/corpus/licenses/gpl-3.0.txt | 7737 | 6673 | 6447 | −226 |
| bench/holdout-ops/find-listing.txt | 3997 | 1382 | 1326 | −56 |

So any new codec must beat `min(registry)`, not KAIROS alone. DAEDALUS is also wall-clock
bounded (`budgetMs = min(20000, 1200 + len*1.1)` in `daedalus.ts`), so its output is not
machine-independent. A deterministic version would be a reproducibility change, not a token gain.

## PR #2 (STARLIGHT family, +2347 lines)

The six codecs `starlight`, `starlight-prime`, `pallas`, `yggdrasil`, `oblivion`,
`chronos-x1` are wrappers around `cjkContractorEncode` with different sentinels and option
names (e.g. `starlight.ts` lines 12–31). Same algorithm under six names.
Measured on starlight (the representative): message = wire + 174-token `STARLIGHT_SYSTEM_PROMPT`.

| file | KAIROS msg | starlight msg (wire + prompt) |
|---|---:|---:|
| readme | 704 | 911 |
| email-thread | 558 | 761 |
| gpl-3.0 | 6673 | 7615 |
| find-listing | 1382 | 1736 |

Worse on 4/4 and it requires a system prompt, which violates the single-chat, no-system-prompt
constraint. Verdict: negative. Do not merge the family as-is.

## PR #23 (kalligraphos / optimal / arithmos, +1440/−66)

`kalligraphosEncode` (`kalligraphos.ts`) reports `mode: daedalus` on all 4 files, so its
winning arm is DAEDALUS. Message tokens, run 1 (`prcodec-eval`, in the receipts jsonl) vs run 2
(`dae-eval`, not saved to the receipts file):

| file | DAEDALUS (run 2) | kalligraphos run 1 | kalligraphos run 2 |
|---|---:|---:|---:|
| readme | 688 | 688 | — |
| email-thread | 538 | 525 | 525 |
| gpl-3.0 | 6447 | 6468 | — |
| find-listing | 1326 | 1326 | 1346 |

Kalligraphos beats DAEDALUS only on email (−13, 2.4%). It is +21 on GPL (run 1) and +20 on
find-listing (run 2). Its find-listing output changed between two runs of identical input
(1326 vs 1346). That points to the wall-clock deadline in the DAEDALUS arm search, so the
result is not reproducible. Verdict: no Pareto gain over DAEDALUS on these lanes, and the
math-alphabet arm never won. `optimal.ts` is a selection layer over arms (a tournament); not
evaluated further.

## Not done this turn (honest gaps)

- No new codec was accepted; the requirement for a Pareto-superior commit was not met.
- Blind LLM-readability was not re-run on any new codec. The ANTIPHON harness (3/3 self-decodes)
  is in `bench/llm-blind-*.ts`, from the previous turn.
- The full registry frontier was not measured; only KAIROS, DAEDALUS, starlight, kalligraphos on
  4 files. Every frontier claim is limited to those lanes.
- The openai/math proof-by-proof review and new web searches were not done this turn.
