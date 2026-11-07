# X81 — HARMOS (ἁρμός)

**Separator-as-geometry inside a compound token.**

Machine output is dense with timestamps, and a timestamp is mostly punctuation.
`2026-11-07` is eight digits of information carrying two hyphens; `00:03:12` is six
digits carrying two colons; `Apr 14  2017` is a month, a day and a year carrying two
runs of spaces. Every one of those hyphens, colons and padding runs is its own o200k
token carrying no information the digits do not already carry.

HARMOS deletes the separators and declares the shape once.

## Result: 3 of 10 candidate lanes, −66 tokens total, every round trip byte-exact

Measured cold against the real frontier (`tagstackFrontier`), o200k_base, by
`bench/x81/verify.ts` driving the shipped `src/lib/omega/harmos.ts`:

| lane | frontier | HARMOS | Δ | applied | rt |
|---|---:|---:|---:|:--:|:--:|
| psql-output.txt | 244 | **193** | **−51** | yes | exact |
| cue-sheet.md | 163 | **152** | **−11** | yes | exact |
| metrics.tsv | 210 | **206** | **−4** | yes | exact |
| prices.csv | 133 | 133 | +0 | REFUSED | — |
| ls-l-real.txt | 1497 | 1497 | +0 | REFUSED | — |
| ps-ef.txt | 315 | 315 | +0 | REFUSED | — |
| ps-aux-real.txt | 1051 | 1051 | +0 | REFUSED | — |
| ps-real.txt | 397 | 397 | +0 | REFUSED | — |
| email-thread.txt | 488 | 488 | +0 | REFUSED | — |
| ls-real.txt | 433 | 433 | +0 | REFUSED | — |

`rt` is the full two-layer round trip: frontier-decode, then HARMOS-decode, compared
byte-for-byte against the source. It holds on every lane, including the refusals.

## The refusals are the informative half of that table

ps-ef has **larger** raw savings than cue-sheet (−156 vs −84) and still loses. So does
ls-l-real (−185). The frontier already prices their punctuation away, because their
timestamps are repetitive in a way the frontier's own row machinery can see — ps-ef's
START column repeats one date 39 times.

HARMOS only wins where the timestamps **vary**. That asymmetry *is* the mechanism, and
it is why the win is measured per lane rather than asserted globally.

## Packing and unpacking

Forms are applied **sequentially**, each to the output of the previous, most specific
first. Unpacking applies the inverses in **exact reverse order**. Every shape is tagged
by its marker **and** by the length of the digit run that follows, and a longer run is
always matched before a shorter one, so no inverse can consume another shape's payload:

```
2026-11-07T14:22:01  ->  %20261107142201      % + 14 digits
2026-11-07 14:22:01  ->  ~20261107142201      ~ + 14 digits
2026-11-07T14:22     ->  %202611071422        % + 12 digits
2026-11-07 14:22     ->  ~202611071422        ~ + 12 digits
Apr 14  2017         ->  &Apr14!2017          & + Mon + DD + ! + YYYY
Jan  2 08:00         ->  @Jan0208:00          @ + Mon + DD + HH:MM
2026-11-07           ->  ~20261107            ~ +  8 digits
00:03:12             ->  ^000312              ^ +  6 digits
08:00                ->  ^0800                ^ +  4 digits
```

**G1** closes the last hole: if the source already contains a marker character the lane
is refused outright rather than escaped, so a decoder never wonders whether a marker it
sees was in the original.

## The day field

The one part not recoverable from the digits is the day, because `ls -l` right-justifies
it to width 2 (`Jan  2` has two spaces, `Jan 15` one). Rather than transmit it, HARMOS
observes that it is a **function of the day**: a day below ten is padded to two columns.
The day is stored zero-padded and the inverse re-derives the spacing. Verified on all
149 dates of ls-l-real.txt — `rt=true` even though that lane is refused on cost.

## The contract decides everything

The packing is nearly free and the contract is the whole cost. Measured on the **same
transform on the same lane** (`bench/x81/receipts/chrono4.json`):

| lane | contract 34 tok | contract 9–13 tok |
|---|---:|---:|
| psql-output.txt | −27 | **−52** |
| cue-sheet.md | +12 | **−8** |
| metrics.tsv | +21 | **−4** |

So the contract names **only** the shapes a lane actually contains, in terse form. A lane
with nothing but ISO dates pays nine tokens. An earlier draft with one fixed contract for
all shapes (`bench/x81/receipts/chrono.json`) paid 95 and lost on **every** lane, by +17
to +65.

An even earlier draft used no marker characters at all and was faster to write and
strictly worse: without markers the inverse is a guess, because a bare 8-digit run in the
source is indistinguishable from a packed date.

## Greedy? Time- or CPU-bound? Source?

- **Greedy.** The *rewrite* is not — it is a deterministic ordered pass, and the packed
  text is a fixed function of the source. What *is* greedy is the acceptance search:
  shapes are admitted in specificity order and the set is trimmed by a bounded repair
  loop (drop the least specific shape, re-test) while the result does not beat the
  frontier. Bounded at two iterations, so the codec is deterministic and terminating,
  and it can return a locally-but-not-globally-optimal shape set.
- **CPU-bound.** The scan is a handful of linear regex passes. A single frontier encode
  costs orders of magnitude more than the entire HARMOS analysis; there is no I/O and no
  waiting anywhere in the codec.
- **Source.** Empirical and measured here, not borrowed. The property exploited — that a
  separator between digit groups forces the tokenizer to restart a numeric chunk — is
  documented in Singh & Strouse, *Tokenization counts* (arXiv:2402.14903) and in
  *Getting the most out of your tokenizer* (arXiv:2402.01035). No compression result from
  either is claimed or used; they are cited for the tokenizer behaviour only.

## Receipts

| file | what |
|---|---|
| `bench/x81/receipts/harmos.json` | the shipped codec, 10 lanes, per-lane Δ/forms/rt |
| `bench/x81/receipts/chrono4.json` | contract-length sweep, terse vs full |
| `bench/x81/receipts/chrono3.json` | sequential packing, reverse-order unpack |
| `bench/x81/receipts/chrono2.json` | first adaptive-contract draft |
| `bench/x81/receipts/chrono.json` | fixed-contract draft that lost everywhere |
| `bench/x81/receipts/iso.json` | ISO-date-only probe |
| `bench/x81/receipts/date2.json` | ls-date packing, padding derived from the day |

## Known limits

Three lanes, and the largest is −51. It cannot help a lane whose timestamps the frontier
already models, it refuses any source containing `% ~ & @ ^`, and the terse contract
assumes a reader that can expand a shape from a nine-token declaration — which is exactly
the competence this stack is built to rely on, but it is an assumption.
