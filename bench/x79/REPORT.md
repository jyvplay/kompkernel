# X79 — SPHRAGIS

Commit `0528797`. Codec `sphragis` (`src/lib/omega/sphragis.ts`), registered immediately
before `kerma`; **244 codecs**. PR #46 OPEN.

```
npm install
npx esbuild bench/x79/s.ts --bundle --platform=node --format=esm --outfile=bench/x79/s.mjs
node bench/x79/s.mjs <lanes...>
```

---

## 1. The result

`psql-output.txt`, the only lane either shape-elider fires on:

| | tokens | Δ |
|---|---:|---:|
| raw | 675 | — |
| frontier (`tagstackFrontier`, 243 codecs, X78) | 244 | −431 |
| KERMA (X78) | 172 | −72 |
| **SPHRAGIS (X79)** | **169** | **−75** |
| brotli −q11 floor (1578 bytes @ 14.8 bits/tok) | **165** | — |

**−75.0 % from raw, and within 4 tokens (2.4 %) of a general-purpose compressor's entropy
floor** — while staying byte-exact and directly LLM-readable.

Two-layer smoke through the registry (`bench/x79/smoke.mjs`): **PASS — 5 of 5 byte-exact**
(`psql-output` 169, `df-h` 171, `metrics.tsv` 210, `vix-daily-1990.csv` 461,
`kb-article` 622). On the four lanes where SPHRAGIS declines, the value shown is the
frontier's own output, unchanged.

## 2. What it is, stated honestly

**This is a generalisation of KERMA (X78), not an unrelated mechanism.** It widens the
shape grammar in four ways:

| | KERMA (X78) | SPHRAGIS (X79) |
|---|---|---|
| group alphabet | digits only | digits **and hex** `[0-9a-fA-F]` |
| separators | `[-:./]` | `[-:./,]` |
| groups per run | ≤ 4 | ≤ 6 |
| word-boundary guard | none | run may not abut a hex character |
| contract | `§KERMA #:char, fill: …` | `§SPHRAGIS …` |

A shape is one `#` per run character plus literal separators (`####-##-##`, `###.##`).
Decoding is purely positional. Gates: width uniqueness · no bare collision · no merge ·
word boundary · byte-exact round trip through **both** layers · comma safety · strict win.

## 3. The four generalisations are all measured negative

This is the interesting result and it is reported as such.

| lane | outcome |
|---|---|
| `aapl-2014.csv` | comma shapes found, but `####-##-##,##.########` and `####-##-##,###.#######` are **both width 18** → G1 refuses the lane |
| `vix-daily-1990.csv` | comma shape clears every guard and still loses **822 vs 461** — packing a CSV's field separators destroys its column alignment |
| `git-log-fuller.txt` | `####-##-##` and `##:##:##` collide with bare hex runs (commit hashes) → G2 refuses |
| `metrics.tsv` | candidate shapes collide with bare small integers → G2 refuses |
| `df-h.txt` | no runs survive the boundary guard |

**Conclusion:** SPHRAGIS's entire advantage over its parent is a **shorter contract
(−3 tokens)**. The shape-elision family is close to exhausted; the next win needs a
different mechanism, not a wider grammar.

## 4. Nine further measured negatives

Screens in `bench/x79/` (`.ts` sources, `.mjs` bundles gitignored).

**Alphabet remap — DISPROVEN, and the reason matters.** `alpha.ts` made it look large:
32 ids in ASCII text cost **69** tokens written with ASCII glyphs vs **96** with Cyrillic.
It is an artefact. `remap2.ts` measured the same substitution on real frontier wires and
it is **harmful even with no contract at all**: **+20** (psql-output), **+22**
(kb-article), **+9** (findmnt). Only 36 of 126 non-ASCII characters on psql-output's wire
have ASCII on both sides; the rest sit inside Cyrillic **runs** that pack at 0.56
tok/char, and injecting ASCII splits them. `remap.ts` with a full contract: **+148 / 7
lanes**. The wire's alphabet is already well chosen.

**Whitespace elision round separators.** `key: value` = 3 tok vs `key:value` = 2, so
−1/occurrence looked available. `sep.ts` measured five forms; only `comma-space` ever
passes its invertibility guard, and it is **positive on every lane** (+3 `license.txt` to
**+32** `ru-kb.txt`), because `,word` tokenises worse than `, word`.

**Bullet / list-marker elision.** A general raw win (≈0.9 tok/bullet; −111 on
`Y8_LETHE`, −130 on `Y9_ORACLE`), but **0 of 4 lanes fire through the frontier** —
ANAPHORA already hoists repeated line prefixes. Reinforces the standing rule: only
tokenisation changes survive the frontier; redundancy elimination gets eaten.

**Tab indentation** (units 2 and 4, which ANAGNORISIS's unit-8 does not cover): −17 and
−13 on `code-ts`, but **+137** and **+105** on `json-pkg`. Per-lane gating only.

Also carried forward as dead: markdown rule-row deletion (+1..+11 everywhere), blank-run
collapse (n/a — no `\n{3,}` in any fixture).

## 5. Why shape elision is the one thing that survives

It changes **tokenisation**, not redundancy. It pays no pointer, marker or id per
occurrence — one clause per *shape*. The frontier is very good at capturing redundancy and
cannot undo a tokenisation change it never made; every dictionary-like mechanic
(MERISMOS, interning, normalisation, remapping) fights the frontier for the same
redundancy and loses.

## 6. Two data corrections

**(a) The leaders table's brotli floor for psql-output was wrong.** The X78 row filled
that column with KERMA's *stack* value (172) instead of the floor. Recomputed directly
this turn: the floor is **165**. The other rows reproduce exactly (metrics 130,
ls-l-real 943, ps-aux 743, ls-real 328, dpkg-l 591, free-m 75, lsblk 61, kb-article 608,
uptime-w 70), so only psql-output was affected. Its ratio is **1.02, not 1.47**.

Consequence: `psql-output.txt` is no longer the ops headroom leader — it is the lane where
the stack has *caught up with entropy*. Realistic remaining headroom there is under 3 %.
The live ops targets are **`metrics.tsv` (1.48)** and **`ls-l-real.txt` (1.48)**.

**(b) "The frontier" number carried since X76 is a control.** `LANES73 29 TOTAL 12639
exact 29/29` comes from `bench/x74/gate73.ts`, whose own header says it runs **"the X73
IDENTITY ONLY (`tagstackEncodeUncached`, no X74 candidates)"**. It is the control arm of
the X74 experiment: it deliberately excludes every candidate codec, so it **cannot** move
when one is added, and confirming it does not confirm the frontier. Re-run this turn with
SPHRAGIS registered it returns the identical 12639 — the expected result for a control.
Frontier costs quoted here are measured with `tagstackFrontier`.

## 7. Sources (previously unreferenced, found this turn)

- **arXiv:2402.01035** — *Getting the most out of your tokenizer for pre-training and
  domain adaptation.* The **pre-tokenization regex**, not vocabulary size, is the dominant
  lever on compression; a "Punct" variant that forbids tokens starting with `.` trades
  compression for composition. Same lever SPHRAGIS pulls, but by editing text rather than
  the tokenizer.
- **Singh & Strouse, arXiv:2402.14903** — *Tokenization counts.* GPT tokenizers chunk
  numbers into ≤3 digits **left-to-right**, and commas force right-to-left 3-digit chunks.
  **This is the direct reason eliding a separator is worth tokens**: it releases a hard
  L2R chunking and lets BPE re-chunk freely.
- **MedTPE, arXiv:2505.09388** — merges co-occurring token pairs for lossless
  compression. Related in aim (lossless, token-count driven) but changes the tokenizer.

None is prior art: all three assume control of, or a change to, the tokenizer. In-repo
ancestors: STIGME (X19), MORPHE (X20), APOGRAPHE (X39) — *elide what the width
determines* — and KERMA (X78).

## 8. Status of standing items

- **Speed: no win.** Six consecutive turns now (X75–X79). The X78 profile stands:
  `countTokens3` 15.5 %, `scoreRunCostDelta` 14.9 %, `renderBest` 12.0 %, `rankAt` 8.0 %.
  A real win needs an O(1) prefix-sum index over chunk boundaries — architectural, not micro.
- **Cold read** (no skills.md/system prompt): not re-run this turn for SPHRAGIS. The
  contract is one line and every transform is a declared rule about digit counts, but the
  claim is not asserted without a measurement.
- **Docs:** §X79 added to `docs/codec-abbreviations.md` and `docs/codecs.md`; leaders list
  refreshed with corrected floors.
- **Directly model-readable:** yes — one contract line plus the packed wire.
- **Greedy?** Yes, only in the prune (bounded, ≤ 24 full token counts, kept only on strict
  improvement). **CPU-bound**, deterministic; no clock enters any decision.
