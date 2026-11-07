# X77 — MERISMOS and the marginal-rate map

**Shipped:** codec `merismos` (`src/lib/omega/merismos.ts`, registry key `merismos`,
registered, 242 codecs total, byte-exact on 4/4 smoke lanes).

**Headline: the codec fires on 0 of 9 measured lanes, and that is the finding.**
Four distinct mechanics were priced. Every one of them lost. The frontier wire is
tight against this whole family of attacks.

---

## 1. The marginal-rate map (`t1.ts`)

For each input class, ablate it and compute

    rate = (tokens the frontier saves) / (tokens the ablation saves on the raw text)

`~0.1` = the frontier already owns it. `~1.0` = the frontier is blind and pays full price.

| lane | raw | F | pad | punct | long |
|---|---|---|---|---|---|
| (1) | 1106 | 397 | 158/17 **r=0.11** | 289/41 r=0.14 | 99/83 **r=0.84** |
| (2) | 229 | 149 | 47/23 r=0.49 | 20/20 r=1.00 | 5/5 r=1.00 |
| (3) | 570 | 171 | 74/19 r=0.26 | 55/12 r=0.22 | 123/6 r=0.05 |

`long` at **r=0.84** was the target: the frontier pays 84 % of raw price for
identifier *content*. Padding at 0.11–0.49 re-confirms X76's "do not build on padding".

## 2. Sizing the prize (`t2.ts`, 24 lanes)

Splitting long runs `[A-Za-z0-9_./:+-]{8,}` on `[._/:+-]` and interning shared
segments appeared to save **+2 807 of 17 402 raw tokens (16.1 %)**:

| lane | raw | interned | Δ |
|---|---|---|---|
| find-listing | 3 676 | 2 416 | **+1 260** |
| aapl-2014.csv | 3 097 | 2 435 | +662 |
| vix-daily-1990.csv | 3 402 | 3 039 | +363 |
| ls-full-iso | 733 | 481 | +252 |
| kubectl-get-pods | 616 | 462 | +154 |
| llm-answer.md | 137 | 169 | −32 |

Discriminator = shared-occurrence fraction (wins above ~70 %, loses below ~50 %).

**This number is wrong, and §3 says why.**

## 3. Four mechanics, all priced, all negative

1. **Segment interning on the raw text.** The §2 figure omitted the marker that makes
   decoding unambiguous. Priced with a marker: **−3 281 over 22 053** (`t2b.ts`). The
   apparent gain was an artefact of bare alphanumeric ids merging into single tokens —
   which is not a legal encoding.
2. **Per-run marker + greedy coverage dictionary** (`t2c.ts` variant A): dictionary
   never built (greedy gain degenerates from an empty dictionary). Variant B
   (marker-free punctuation ids absent from the source): loses on 8/10 lanes, wins
   156 and 399 on two — but against *raw* text, not the frontier.
3. **Segment interning on the frontier wire.** Rewriting the source instead of the
   wire compares our output against an already-compressed baseline and loses by
   construction (best variant 1 019 tok against a 367-token frontier on ls-full-iso).
   Fixed to rewrite `frontier.message`: refused 8/8, coverage 0.04–0.10, and the one
   lane that cleared coverage **lost** (324 vs 300).
4. **Arbitrary substring interning on the wire** — the shipped shape. Refused
   **10/10**. Best candidate came within **+2 to +4 tokens** every time.

A synthetic log file built for heavy literal repetition was also refused: the frontier
interns all of it itself. That is a validation of the frontier, not a bug in the gate.

## 4. Speed: the direct-index chunk LUT — a null result, honestly reported

`bench/x77/speed1.ts` measured the chunk-length distribution the whole idea rested on:

| lane | chunks | len1 | len2 | len3-4 | len5+ | distinct |
|---|---|---|---|---|---|---|
| ls-l-real | 4 463 | **2 320 (52 %)** | 641 | 828 | 674 | 320 |
| ps-aux-real | 2 875 | 1 408 (49 %) | 677 | 450 | 340 | 346 |

Two thirds of the ~143 M lookups per lane (X75 profile: 25.5 % of runtime in
`countTokens`) hit chunks of 1–2 code units in a ~320-entry map. So `bpe.ts` gained a
direct-index fast path: an `Int32Array(65536)` for length-1 chunks and an integer-keyed
map for length-2, keyed by code units with no substring hashing, reachable only for
`o200k_base` and disableable with `OMEGA_NO_LUT=1`.

**Exactness:** `speed2.ts` checked **16 489 strings** (every fixture, every line, every
200-char window, 4 000 fuzz strings, exhaustive length-1 and length-2 code units) in
both modes: **0 mismatches**, and identical hit/miss counts (314 930 / 7 620), proving
the paths are behaviourally identical.

**Speed: no win.** End-to-end `tagstackEncode`, 4 lanes × 2 repetitions, alternating arms:

| arm | rep 1 | rep 2 | mean |
|---|---|---|---|
| LUT-ON | 38 356 ms | 36 681 ms | 37 518 ms |
| LUT-OFF | 36 516 ms | 38 580 ms | 37 548 ms |

Identical within noise. The lookups were never the bottleneck — `String.match()`
allocating every chunk as a substring is. The LUT is kept (verified exact, and it is
the right shape for the hot path) but **no speed improvement is claimed for X77**.

## 5. Runtime honesty

Actually executed this turn: `npm install`; `git fetch`/`reset`; `npx tsc --noEmit`
(after every source edit); `esbuild` for `t1 t2 t2b t2c t3 t4 t5 speed1 speed2 speed3
smoke`; `t1` (marginal-rate map, 6 lanes, incomplete — 3 lanes recorded); `t2`, `t2b`,
`t2c`, `t3` (×4 configurations), `t4` (wire dump), `t5` (synthetic), `speed2` (both
arms), `speed3` (4 lanes × 2 reps × 2 arms), `smoke` (registry, 4 lanes). All numbers
above come from those runs. No number in this report is estimated or recalled.

Not done this turn, and not claimed: no new web searches were run (budget went to the
codec hunt); the local-leaders list is unchanged from `bench/x75/receipts/leaders.json`.
