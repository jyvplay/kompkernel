# X80 — PARATAXIS

Codec `parataxis` (`src/lib/omega/parataxis.ts`), registered before `sphragis`;
**245 codecs**. Registry smoke **PASS 8/8 byte-exact**.

```
npm install
npx esbuild bench/x80/p.ts --bundle --platform=node --format=esm --outfile=bench/x80/p.mjs
node bench/x80/p.mjs <lanes...>
```

## 1. Result

| lane | frontier | PARATAXIS | Δ | chars removed | lines touched |
|---|---:|---:|---:|---:|---:|
| `findmnt.txt` | 444 | **422** | **−22** (−5.0 %) | 1 189 | 23/28 |
| `kubectl-get-pods.txt` | 326 | **304** | **−22** (−6.7 %) | 791 | 23/24 |
| `dpkg-l.txt` | 673 | **651** | **−22** (−3.3 %) | 1 677 | 35/42 |

Declined — all byte-exact, all for a measured reason: `df-h.txt` (183 vs 171),
`ps-aux-real.txt` (1 102 vs 1 051), `ls-l-real.txt` (1 563 vs 1 496). On these the padding
is too thin to repay the contract plus the marker.

## 2. The negative that matters more than the result

The naive transform — collapse every run of ≥2 spaces to one — is **LOSSY**, and it scored
**−75 tokens on findmnt** (`bench/x80/arms.ts`). That number is discarded information, not
compression.

| `findmnt.txt` (frontier 444) | tokens | Δ |
|---|---:|---:|
| collapse only (**LOSSY — not a codec**) | 369 | −75 |
| collapse + short contract | 384 | −60 |
| collapse + range contract | 389 | −55 |
| **PARATAXIS as shipped (lossless)** | **422** | **−22** |

Of the apparent −75, ~53 tokens were information. This is X79's alphabet-remap lesson in a
new guise, and it is why the round-trip gate is first.

The residue is real but smaller, and for a known reason: **X76 was right that the frontier
largely owns padding** (marginal rate 0.11). The frontier can record the padding for about
what declaring the widths costs. What is genuinely new is ~22 tokens that come from the
frontier's column machinery firing *better* on normalised text.

**X76 already tried this lane and lost (461 vs 444).** PARATAXIS reaches 422. The
difference is the marker — see §3.

## 3. The change that made it work: collapse to a TAB, not a space

Splitting on a space cannot distinguish a column boundary from a space *inside* a column,
so the first version refused every table whose columns contain internal single spaces —
`df-h`'s `Mounted on`, `ps`'s `COMMAND`, `ls -l`'s filenames. That is most tables.

| version | lanes | result |
|---|---|---|
| collapse to one space | 2 | −4 (findmnt), −7 (kubectl) |
| collapse to a tab | **3** | **−22, −22, −22** |

Verified geometry (`bench/x80/dbg2.ts`): findmnt aligned at 56/74/86 on 23 of 28 lines;
kubectl at all six offsets on 23 of 24; ps-aux at 5 of 8 offsets on all 56.

## 4. Two hypotheses for a free contract — both falsified

- **"re-align each column to its max content width"** — `bench/x80/align.ts`:
  `restore_by_maxwidth=false` on all 8 lanes. findmnt pads TARGET to 56; widest entry 51.
- **"width = max content + k"** — `bench/x80/maxw.ts`: true on `df-h` (**18/18**, k=2, and
  it equals the observed truth) but **0/24** on findmnt and **0/23** on kubectl.

So the widths are transmitted explicitly. (The df-h case is the tantalising one: a rule
that works there would make the contract free.)

## 5. Broad screen of representation transforms (all negative)

`bench/x80/screen.ts`, measured *through* the frontier on 8 lanes.

| transform | outcome |
|---|---|
| rotate last field to front | +10..+20 on every lane |
| reverse field order | +10..+20 on every lane |
| right-align lines to a common width | +20..+34 (psql, findmnt, df-h) |
| tab→pipe / pipe→tab | +4..+13 |
| strip trailing whitespace, blank lines, CR | n/a on every lane |
| dedupe adjacent identical lines | n/a on every lane |
| **collapse 2+ spaces to one (lossy)** | **−61 findmnt, −9 vmstat — but LOSSY, see §2** |

Also measured and dead: **newline elision**. `bench/x80/budget.ts` shows newline tokens in
the frontier's output are already 0–5 per lane (metrics 2, psql 0, kb-article 2, dpkg-l 4,
ls-l-real 5). The frontier has already eliminated them.

## 6. Where the frontier's budget goes (`bench/x80/budget.ts`)

| lane | F | NL | ws | punct | digit | letter | mix |
|---|---:|---:|---:|---:|---:|---:|---:|
| metrics.tsv | 210 | 2 | 11 | 20 | 44 | 69 | 64 |
| psql-output | 244 | 0 | 10 | 39 | 44 | 73 | 78 |
| kb-article | 622 | 2 | 1 | 10 | 2 | 249 | 358 |
| dpkg-l | 673 | 4 | 27 | 48 | 40 | 289 | 265 |
| ls-l-real | 1 496 | 5 | 41 | 115 | 285 | 834 | 216 |

## 7. Frontier — confirmed

Re-measured over the same 29 lanes with 245 codecs registered
(`bench/x80/front.mjs`, `OMEGA_DET=1`):

```
FRONTIER 29 TOTAL 12639 exact 29/29
```

Identical to X78 and X79. **The frontier is exactly the configuration last measured.**

**Correction to X79.** X79 claimed 12639 is "a control, not the frontier". That was wrong:
`tagstackFrontier` is `tagstackEncodeUncached` plus memoization — the same function
`bench/x74/gate73.ts` calls — so 12639 *is* the frontier. The weaker, still-useful point
survives: because the frontier is the **base** stack, adding a registry codec cannot move
12639, so 12639 confirms the base and nothing else. (`tagstackEncode` →
`tagstackX74Chain` is a larger stack — base plus the X74 candidate chain — and is a
separate, unmeasured number.)

## 8. Speed — honest status

Profile of three lanes (`bench/x80/prof.mjs`, `--cpu-prof`), self time:

```
17.0%  rankAt             (BPE inner loop, bpe-fast.ts)
16.2%  countTokens3
14.5%  scoreRunCostDelta
11.6%  renderBest
 7.0%  mergeCount
 5.7%  (garbage collector)
 4.3%  fastChunkCount
```

**One verified win this turn, and it is local, not stack-wide.** PARATAXIS's greedy prune
was measured never to improve a result (`pruned=0` on every lane) while costing two full
frontier encodes per candidate lane. It now runs only *after* the cheap gates pass.
Verified result-preserving: the three applied lanes and three refusals are numerically
identical before and after.

**No stack-wide speed win is claimed — seven turns running (X75–X80).** The caches are
already deep (`CHUNK_CACHE`, `LUT1`, `LUT2`, `SHORT_CACHE`, `LONG_CACHE`, plus X68's
`ENGRAM` sub-encode memo), and what remains is spread across the BPE inner loop and the
search scoring. A real win still needs an architectural change — an O(1) prefix-sum index
over chunk boundaries — not micro-optimisation.

## 9. Sources found this turn (previously unreferenced)

- **arXiv:2505.06297** (Mao, Pirk, Xue) — LLM next-token probabilities driving arithmetic
  coding, 14.6–23.8× vs gzip ~3×. **This is the AI-native compressor everyone reaches for,
  and it is exactly the one that cannot satisfy this stack's contract**: arithmetic coding
  needs byte-identical conditional probabilities at decode, and §4.4 of the paper concedes
  LLM inference is not bit-stable (fp precision, MoE routing, hardware). No round trip, no
  decoder specified. Our `decode(message) === source` gate is precisely what it cannot pass.
- **arXiv:2407.07723** (LMCompress) — same paradigm, images/video/audio, same limitation.
- **LM-GC, NeurIPS 2024** — lossless (the model is frozen and deterministic). Its
  transferable empirical finding: serialising into "recognizable symbols" with "proper
  separators" moved compression by up to **70 %** and **40 %** — direct corroboration that
  separator choice is the right axis, which is what PARATAXIS exploits.

**Newly-solved mathematics, reviewed as instructed.** The frontier-lab results are real and
unusually well verified: an internal OpenAI model **disproved the Erdős planar unit-distance
conjecture** (posed 1946) in May 2026 — verified by Noga Alon, Melanie Wood and Thomas
Bloom, with Timothy Gowers indicating it merits a top journal; a new infinite family via
Golod–Shafarevich and class field towers beating the grid to n^(1+δ), δ refined to 0.014 by
Will Sawin. **Erdős #1196** was resolved by GPT-5.4 Pro from a bare problem statement
(Liam Price), in a paper with Terence Tao and Jared Duker Lichtman, via a downward Markov
chain weighted by the von Mangoldt function. **#728, #729, #1148, #258** were resolved with
**Lean formalisation** (OpenAI + Harmonic's Aristotle).

**None of these yields a new compression algorithm, and I will not pretend otherwise.**
They are combinatorial geometry and analytic number theory. The one transferable idea is
*methodological*: several were machine-verified in Lean rather than merely peer-reviewed.
That is what this stack's byte-exact gates already are, and the Erdős episode argues for
keeping them — the first GPT-5 claim (ten problems "solved") collapsed because the model
had rediscovered existing literature, and it was caught only because someone checked.
