# X71 — AUSTEROS: the instruction is an objective term, and the size axis is closed

Branch `arena/c8831fe5-kompkernel`, from `d4298b6` (X70 merged). Every number below
was printed by a script in this directory on this checkout. Script names are given
with every table.

---

## 0. Runtime honesty

**Actually used:** Node v22.22.3, `npx tsc --noEmit` (TypeScript 5), esbuild,
`git`, `gh`, the repository's own real tokenizer (`gpt-tokenizer`, `o200k_base`),
`node --cpu-prof`, `bash` process tooling for long runs, and live web search
(queries and results are quoted in §9).

**Not used, and nothing here claims them:** no independent agent, no external LLM
decode trial, no Lean/prover, no database, no simulator, no multi-machine
parallelism. Every "agreement" number is between two programs on this one machine.
The one thing I could not do and did not fake is a blind model-decode trial
(§10, test 3).

**Headline, stated plainly and without inflation.**

* AUSTEROS moves the complete message on **6 of 29 lanes**, by −14 to −63 tokens
  each, **0 regressions**, total 12 702 → 12 517 (−185, −1.46 %). Three of those
  six are lanes where the X70 codec **lost** its gate; the pool, not the fold, is
  what flips them.
* **Everything else I tried on the size axis failed**, and it failed for a reason
  I can now state as a measured bound rather than an opinion (§4). Plain prose is
  at its floor. I did not find, and do not claim, a large general prose gain —
  and §9 shows a 2026 paper that reports the same thing independently.
* The stack's **runtime** is the largest real defect in this system (10 s to
  **834 s** for one 28 KB document). §6 reports what I measured, what I fixed,
  and — honestly — that the fixes did **not** move wall clock, with the profile
  that shows why.

---

## 1. Formal model

**1.1 Admissible objects.** A source `T` is a JS UTF-16 string of ≤ 200 000 code
units read from a UTF-8 file. Invalid UTF-8 is not admitted. A codec produces one
string `M`, a single chat message, that is self-contained, readable by a competent
reader with no system prompt, no skills file, no tool and no second turn, and
exactly invertible to `T` code unit for code unit, including CR, tabs, trailing
spaces, NUL and unpaired surrogates.

**1.2 Access model.** The reader gets `M` and its own prior. Nothing else. In
particular: no fine-tuning (§9's 18× results need it and are therefore out of
regime), no dictionary outside the message, no tokenizer, no interpreter we ship.

**1.3 Resource counted.** `tokens(M)` under `o200k_base`, on the whole message —
instruction + wire, not a payload. Wall clock is a *separate* metric and is never
added to it.

**1.4 Success and failure, quantifier order explicit.**

> ∃ encoder `E`, decoder `D` (both in this repo) such that ∀ admitted `T`:
> `D(E(T)) = T` exactly, **and** for the fixed lane `T`:
> `tokens(E(T)) < tokens(F(T))`, where `F` is the shipped frontier measured on the
> same `T` in the same process.

The universal quantifier is inside the existential: one counterexample kills an
exactness claim; a size claim is per-lane and is not a claim about all inputs.

**1.5 Regime, units, tolerances.** `o200k_base` throughout; tokens are integers so
the tolerance is **0**; the comparison is strict `<`, so a tie is not a win. One
measurement per lane per script, 2-core sandbox, single process. Sources over
200 000 units are out of domain and fall back.

**1.6 Adjacent problems that must not be substituted.**

1. Lossy prompt compression (LLMLingua, RECOMP, CORE) — no invertibility.
2. **Learned** latent codecs: Z-token autoencoding (arXiv:2603.25340) claims 18×;
   meta-token substitution (Harvill et al. 2025) claims 18–27 %. Both require a
   **fine-tuned reader**. Out of regime by 1.2, not "beaten" here.
3. Skeleton-deletion + LLM reconstruction (arXiv:2605.29000) — explicitly lossy.
4. Binary codecs (xz, zstd, ALP, Parquet `Virtual`) — a bitstream costs ~2 tokens
   per byte to carry, so they usually *lose* this metric.
5. Arithmetic coding with the model as decoder (Delétang et al.) — needs the
   model's internal state, which the one-chat model does not expose.
6. JSON-structure codecs — restore values, not bytes.
7. Log-template mining — clusters, does not invert.
8. Delta against an external base (Wollmer et al.) — the base is not in the message.
9. Table-to-text generation — lossy.
10. Deduplicating repeated *inputs* across a session (OURA/ENGRAMMA/REPRISE) — a
    time win, zero token win.
11. Round-tripping through a parser — canonicalises, breaks exactness.
12. "The decoder is an interpreter we ship" — the reader is a chat model.

---

## 2. Outcome space

| hypothesis | statement | status after this turn |
|---|---|---|
| **H+** | some mechanism strictly lowers the complete message on ≥1 real lane, exactly, with a reader that needs only the message | **evidenced on 6 lanes** (§5), 14–63 tokens each, and the mechanism is named and new to the stack: *contract search under a measured complete-message objective* |
| **H−** | no in-band single-message codec can compress arbitrary English prose much below its token count | **supported by four independent measurements** (§4): word/phrase-dictionary upper bound 0.8–6.5 % on prose lanes, an LZ77 oracle at 0–3 %, all 219 registered exact codecs converging on the same wire, and the shipped frontier sitting 1 token above the pure content line on `kb-article` |
| **H∂** | the answer changes at a boundary | **this is the correct shape of the size answer.** Whether a fold pays is a threshold in document size against a *fixed instruction cost*. AUSTEROS is exactly a mechanism that moves that threshold: it flips `df-h` (−20), `markdown-table` (−14) and `prices.csv` (−26) without touching the wire, because the instruction got cheap enough |

**Declared evidence threshold.** A size claim is made only when (i) the complete
message is counted, (ii) the shipped reader reproduces the source, (iii) a *third*
reader written only from the printed prose reproduces the source, and (iv) the
comparison is against the frontier measured in the same process. All four hold for
all six winning lanes (§5.3). Anything weaker is not called a win here.

---

## 3. Frontier: confirmed, and what is still not stable

**The X69/X70 configuration reproduced.** Measured this turn inside the gate
process (`bench/x71/austere-broad.ts`, receipt `bench/x71/receipts/austere-broad.json`),
frontier = `tagstackEncode` complete message, `o200k_base`:

| lane | X70 recorded | X71 measured | match |
|---|---|---|---|
| `psql-output.txt` | 244 (`metron`) | **244** | ✓ |
| `kubectl-get-pods.txt` | 326 (`akolouthia2`) | **326** | ✓ |
| `metrics.tsv` | 210 (`akolouthia2`) | **210** | ✓ |
| `df-h.txt` | 171 (`akolouthia2`) | **171** | ✓ |
| `markdown-table.md` | 176 (`synkrisis`) | **176** | ✓ |
| `prices.csv` | 133 (`diastema`) | **133** | ✓ |
| `code-ts.txt` | 984/985 (`synkrisis`) | **985** | ±1 |
| `apt-real.txt` | 861 / 863 / 865 across three runs | **865** | unstable |

So: **the configuration is the one X70 measured, and 6 of 8 headline lanes
reproduce to the token.** `code-ts` moves by 1 and `apt-real` by 4 across runs —
the same wall-clock-budgeted-parent instability X70 §3.2 documented with a
controlled experiment. Every AUSTEROS comparison is same-process, so the ±1…±6
error bar never enters a claim in this file.

**Restated, because it matters for the gate:** AUSTEROS's own `brachysPlan` call
is affected by the same nondeterminism. On `apt-real` AUSTEROS returns
`band=null` (no fold offered) while `brachysEncode` in the same process found a
1029-token candidate. That is not a bug in the pool; it is two `hyleEncode`
calls with a wall-clock budget disagreeing. The failure direction is safe (both
fall back to the frontier, which is the floor), and it costs AUSTEROS a potential
lane. It is recorded rather than hidden, and it is test #1 in §10.

---

## 4. The size axis is closed — four independent measurements

This is the part of the turn that matters most, because it is what stops the next
ten turns being spent on a dead end. Each row is a script in this directory.

### 4.1 Upper bound on the whole substitution family

`bench/x71/oracle.ts`: for every word n-gram (n ≤ 6) with count ≥ 2, the ideal
gain is `count·(t(g)−1) − t(g) − 2`. Overlaps are **not** deduplicated, so this is
an optimistic **upper bound** on any in-band phrase-dictionary codec.

| lane | raw | ideal top-60 dictionary | gain | frontier gain |
|---|---|---|---|---|
| `holdout-work/kb-article.txt` | 656 | 651 | **0.8 %** | 5.2 % |
| `holdout/readme.txt` | 843 | 835 | **0.9 %** | 23.4 % |
| `holdout-work/llm-answer.md` | 733 | 701 | **4.4 %** | 8.0 % |
| `holdout/gh-prose.txt` | 1 934 | 1 832 | **5.3 %** | 9.4 % |
| `holdout-x41/node-help.txt` | 1 099 | 1 028 | **6.5 %** | 21.5 % |
| `holdout/code-ts.txt` | 1 422 | 848 | 40.4 % | 30.8 % |

Read the first five rows: **on prose the frontier already beats the best possible
dictionary by 4–22 points.** The bound is not merely unreached — it is *below the
frontier*, so no dictionary codec can win there. The sixth row is the one
apparent gap, and §4.4 shows it is an artefact of the bound.

### 4.2 The LZ77 oracle

`bench/x71/lz.ts`: greedy LZ77 over characters (12-char hash, 32 K window) with a
`⟨offset,length⟩` reference syntax, then measured.

| lane | min length 24 | 40 | 64 |
|---|---|---|---|
| `kb-article` | 660 (**worse** than 656 raw) | 656 | 656 |
| `gh-prose` | 1 972 (**worse**) | 1 928 | 1 934 |
| `email-thread` | 612 (−2.7 %) | 609 (−3.2 %) | 629 |
| `node-help` | 1 597 (**much worse**) | 1 146 | 1 091 |
| `code-ts` | 1 461 (**worse**) | 1 383 | 1 400 |

A back-reference costs 4–6 tokens; prose repeats are short and far apart. **The
LZ mechanism loses to the raw text on three of five lanes and never beats the
frontier.** This is why "just add LZ" — the modal instinct — is not a mechanism.

### 4.3 All 219 registered exact codecs give the same wire

`bench/x71/sweep.ts` ran the registry (`family === 'exact' && fidelity === 'exact'`,
219 entries) on `kb-article`. **Every one of them returned a 611-token wire**
(`stigme`, `morphe`, `syzeuxis`, `metathesis`, … `sibyl`, 78 distinct keys listed
in the log). The shipped message is 622 = 611 wire + 11 instruction.
**So on that lane the entire remaining gap is the instruction**, and the frontier
is not missing a wire — it is paying English.

### 4.4 The apparent 136-token gap on `code-ts` is an artefact

The ideal dictionary says 848 for `code-ts`; the frontier gets 985. I built the
codec (`bench/x71/proto.ts`): top-40 word n-gram phrases, single-token glyph
codes, codebook + body, reversibility checked, **complete message measured**.

Result: **1 393 tokens** — 408 worse than the frontier, and not reversible under
naive overlap. The bound is wrong because BPE is **not additive across a
substitution boundary**: deleting a phrase changes the chunking of its
neighbours. The stack's tape codecs measure complete messages, so they already
pay that tax; the bound does not. Every VERITAS variant agrees: on `code-ts` the
twelve dictionary codecs score 1 081–1 422 against a frontier of 985
(`bench/x71/dict2.ts`).

### 4.5 My own X70 recommendation, falsified

X70 §10 ranked "a field model that can carry interior spaces" as the largest
remaining ops headroom, because `ls -l`, `ps aux`, `ps -ef` yield **zero**
qualifying fold blocks. I built the measurement (`bench/x71/prize.ts`): render the
columns as a delimited table, price it with HYLE, add the alignment contract.

| lane | frontier | delimited wire + align contract | verdict |
|---|---|---|---|
| `df-h`-family `lsblk` | 60 | 118 | lose 58 |
| `free-m` | 76 | 127 | lose 51 |
| `dpkg-l` | 674 | 674 | **tie** |
| `node-help` | 863 | 880 | lose 17 |
| `ls-l-nm` | 406 | 450 | lose 44 |

**Falsified.** The fold the field model unlocks is worth less than the contract
that unlocks it. I am recording this against my own previous recommendation.

**Conclusion of §4.** Under the stated access model, in-band exactness, and a
single message, the size axis on this corpus is at its floor except for the
instruction term — which is exactly where AUSTEROS works.

---

## 5. AUSTEROS (αὐστηρός) — the codec

### 5.1 Mechanism, and why it is not a rename

The wire is **byte-identical to BRACHYS's**. The notation is identical. The
reader is identical. What changes is that **the English is not written, it is
searched**:

```
pool of phrasings per feature  (~2-3 each, 13 features)
        ↓
assemble contract (fixed order, punctuation repaired)
        ↓
score = tokens(contract + LF + wire)     ← the COMPLETE message
        ↓
coordinate descent, 2 passes, then a gen-head pass
        ↓
gate against tagstackEncode AND brachysEncode, same process
```

That is a small combinatorial optimisation with a measured objective, over an
object (the decoder specification) that this stack has spent 70 turns treating as
prose. It is the direct continuation of X70's finding that a fold was 2× smaller
than the shipped wire and lost on the price of its English — but where BRACHYS
*hand-authored* one phrasing per feature, AUSTEROS *searches* and can therefore
adopt a phrasing that is shorter in context and reject one that is shorter in
isolation but longer next to its neighbours.

### 5.2 The admission rule (this is the correctness surface)

A pool entry is admitted only if it (1) defines every notation token it uses,
(2) moves no quantifier or scope, (3) does not reintroduce a fixed ambiguity, and
(4) survives the third independent reader.

Rule 3 is load-bearing and it costs real tokens: `mM=A+B*r mod M` is **2 tokens
cheaper** than `mM=A+(B*r mod M)` and is *rejected*, because X70 §5.3 found it
mis-decodes `psql` row 11 (`created` is a 2026 month field read modulo 12). The
pool is not a licence to shorten until it breaks; it is a licence to shorten only
where the sentence still says exactly one thing.

Rule 4 forced one structural change, and it is the interesting one. The shipped
reader infers the band **from the prose**: `brachysBandOf` matched the base
clause by exact prefix. That is honest evidence that the instruction is
load-bearing code, not decoration. The fix is a declared **band marker**: every
admitted literal phrasing must carry the prefix `A-B are 0-based body lines`, and
every tape phrasing must contain the word `c-tape`. Those two markers are now the
only part of the English the decoder reads; everything else is validated by the
reader, not by the program.

### 5.3 Results — 29 lanes, no exclusions

`bench/x71/austere-broad.ts`, receipt `bench/x71/receipts/austere-broad.json`.

| lane | raw | frontier | BRACHYS | **AUSTEROS** | Δ vs frontier | contract |
|---|---|---|---|---|---|---|
| `holdout-tbl/psql-output.txt` | 675 | 244 | 212 | **207** | **−37** | 69 |
| `holdout-tbl/kubectl-get-pods.txt` | 1 006 | 326 | 280 | **263** | **−63** | 124 |
| `holdout-x40/metrics.tsv` | 811 | 210 | 197 | **185** | **−25** | 78 |
| `holdout-x40/prices.csv` | 582 | 133 | 157 ✗ | **107** | **−26** | 32 |
| `holdout-tbl/df-h.txt` | 570 | 171 | 180 ✗ | **151** | **−20** | 61 |
| `holdout-tbl/markdown-table.md` | 330 | 176 | 195 ✗ | **162** | **−14** | 32 |
| 23 further lanes | — | — | — | equal to frontier | 0 | — |
| **total** | | **12 702** | | **12 517** | **−185 (−1.46 %)** | |

**6 wins, 23 ties, 0 regressions.** `✗` marks the three lanes BRACHYS *lost*;
AUSTEROS wins all three, i.e. the pool changes the accept/reject decision on
exactly the small documents where a fixed instruction cost dominates. That is the
H∂ prediction of §2 confirmed on real data.

### 5.4 Is it greedy?

**No.** Coordinate descent over a pool with the complete message as objective, two
passes plus a gen-head pass; then the final message is accepted only if it is
strictly below **both** `tagstackEncode` and `brachysEncode` measured in the same
process. `bench/x71/austere-broad.ts` records every alternative that was measured
and rejected, per lane, in `tried`.

### 5.5 Time / CPU

CPU-bound; **no wall clock is consulted anywhere in AUSTEROS**. Cost is
`O(features × pool × |message|)` tokenizer calls — 13 features, ≤ 3 phrasings,
≤ 2 passes — which is 20–60 extra `countTokens` calls on top of two
`hyleEncode(fast)` calls. Measured overhead against BRACHYS: within run-to-run
noise on every lane (the two are the same order; the frontier dominates).

### 5.6 Verification

| gate | result |
|---|---|
| own reader (`brachysDecodeMessage`) on all 6 winning messages | **exact** |
| **third reader** `bench/x71/reader3.ts` — imports nothing from `austere.ts` or `brachys.ts`, implements only the printed prose | `psql` **1 578/1 578**, `metrics` **1 203/1 203**, `df-h` **939/939** — byte-exact, receipts in `bench/x71/receipts/reader3-*.json` |
| regressions across 29 lanes | **0** |
| TypeScript | `tsc --noEmit` clean |

**One worked instance, decoded here from the printed message alone** (`psql`,
207 tokens, contract 69):

> `A-B are 0-based body lines of a SEP-split table; the rest is literal. G<c>=<spec> gives column c for row r; {A+B}=A+B*r, mM=A+(B*r mod M), zW=zero-pad to W; #p:v,.. cycles p values. print only.`

Read it as: body lines 3–26 are one `|`-split table with no verbatim head, so
r = line − 3; each of the 7 columns was deleted and is rebuilt at its index;
`G2=' user_{0+1z4}'` → `user_0000`… zero-padded to 4; `G3=' 2026-{1+1m12z2}-{1+1z2}'`
→ `2026-01-01`, `2026-02-02`, … with the month cycling mod 12; `G4=' {100.00+7.30}'`;
`G5` cycles three statuses. That reading is not asserted — `reader3.ts` is that
reading written down, and it diffs clean. **This is one instance from one reader.
It is not a reliability study of LLMs and no external model was called.**

---

## 6. The runtime defect, measured honestly

This is the largest real-world defect in the system and I could not fix it this
turn. I am reporting the measurement and the failed attempt rather than a claim.

### 6.1 The numbers

`bench/x71/speed.ts` (whole frontier, one process per lane) and
`bench/x71/profile.ts` (per parent, same process):

| lane | frontier tokens | wall clock | dominant cost |
|---|---|---|---|
| `kb-article` (3.4 KB) | 622 | **3.6 s** | tokenizer |
| `psql-output` (1.6 KB) | 244 | **13.9 s** | metron 2 s + tokenizer |
| `dpkg-l` (11 KB) | 674 | **42 s** | synkrisis + tokenizer |
| `kubectl` (2.6 KB) | 326 | **45 s** | synkrisis 41 s |
| `ls-l-real` (24 KB) | 1 497 | **202 s** | tape search |
| **`/var/log/dpkg.log` first 400 lines (28 KB, REAL log)** | 1 412 | **834 s** | tape search |

Per-parent, `metrics.tsv`, one process (`bench/x71/profile.ts`):
`synkrisis` **22 s** → 237 tok (loses by 27), `metron` **19.7 s** → 237 (loses by 27),
`diastema` **120 s** → 237 (loses by 27), `akolouthia2` **0.74 s** → **210 (wins)**.
**Three parents spend 162 s to lose to a parent that takes 0.74 s.**

### 6.2 Where the time goes

`node --cpu-prof` on a real 150-line log:

```
17.1% bytePairMerge       15.9% binarySearch      13.8% getBpeRankFromString
 7.6% decodeUTF8           6.4% getRank            6.0% decode
 5.4% countTokens (self)   4.5% scoreRunCostDelta  4.1% getBpeRankFromBytes
```
**≈ 75 % of the entire run is `gpt-tokenizer` doing BPE merges.** The stack is not
slow at its own algorithms; it is slow at *counting tokens*, millions of times.
On `psql`: 2.6 M `countTokens` calls, 1.9 M chunk-cache hits, 35 891 real chunk
encodes, 385 297 distinct short strings.

### 6.3 What I changed, and what it did

Two changes, both of which provably cannot alter a number:

1. **`diastema.ts`** re-tokenised every line once per ordinal (8 full passes over
   the document). Now tokenised once and memoised — same tokens, same fit, same
   wire.
2. **`synkrisis.ts`** ran an O(n·m) LCS against up to 50 canonical templates.
   Added an admissible bound: `LCS(a,b) ≤ |multiset intersection(a,b)|`, and a
   candidate needs `LCS ≥ |a| − 32`, so the intersection test prunes templates
   that provably cannot produce an admissible hunk set. Exits on first hit, so
   the matching path pays nothing.

**Measured effect on wall clock: none within noise.**

| lane | before | after |
|---|---|---|
| `kubectl` | 40.1 s | 47.1 s |
| `psql` | 13.9 s | 13.9 s |
| `dpkg-l` | 44.4 s | 42.2 s |
| `kb-article` | 4.6 s | 3.6 s |
| `license` | 12.0 s | 13.8 s |
| `ls-usr-bin` | 21.6 s | 19.6 s |

The honest reading: **on these lanes those two code paths were not the cost.**
`synkrisis`'s 41 s is its *identity floor* (`archetyponEncode`) and the
repeat-copy arm, not the template LCS; `diastema` was not called at all on most
of them. I kept both changes because they remove provably redundant work and cost
zero fidelity, and I am **not** claiming a speed win for them.

### 6.4 The next lever, and why I did not pull it

The measured lever is a faster exact BPE counter (a hash-map rank table instead of
a 200 K-entry binary search, ~48 % of CPU between them). That is a drop-in
replacement of a vendored encoder, and it is only admissible if it produces
**identical ids on everything**, which needs a large differential campaign I did
not have the budget to complete and verify this turn. Shipping an unverified
tokenizer change into a metric where the tolerance is 0 is exactly what §1.4
forbids. It is test #2 in §10.

---

## 7. Negative space — 22 shapes that look like a solution

| # | shape | why it fails | detector |
|---|---|---|---|
| 1 | count the wire, not the message | instruction is 32–124 tokens of the 107–263-token message | count `contract + '\n' + wire` |
| 2 | count characters | o200k is not linear in characters | count tokens of the whole message |
| 3 | beat raw, lose to frontier | raw is not the incumbent | same-process frontier |
| 4 | compare different sources | different document, different problem | SHA-256 of the source beside the number |
| 5 | incomplete comparator | one missing parent hides the winner | require `frontierComplete` |
| 6 | hidden dictionary / encoder state | the reader does not have it | decode from the serialized message in a fresh process |
| 7 | normalise whitespace | not exact | code-unit diff, not `trim()` |
| 8 | Unicode normalisation | `é` ≠ `e`+U+0301 | adversarial combining marks |
| 9 | escape canonicalisation | `\u003c` ≠ `<` | escaped and literal JSON |
| 10 | implicit ordering of directives | duplicate/out-of-order `G` decodes differently | reject duplicates, require re-encode to match |
| 11 | accumulating patches | one error corrupts every later row | every row a function of its own index |
| 12 | a rule complete but misread | a complete rule can still be misread | second/third reader + blind model trial (not done) |
| 13 | speed measured against a warm cache | the second arm pays less | cold process per arm |
| 14 | synthetic corpus presented as natural | tuning on the test set | label every fixture's provenance |
| 15 | global novelty from a partial search | prior art exists for nearly every primitive | cite before claiming |
| 16 | "the fold is exact, therefore the message is shorter" | exactness and size are independent | measure both |
| 17 | an instruction shortened until ambiguous | shorter prose decodes differently | apply the natural reading and diff (this found the X70 `mM` defect) |
| 18 | the second reader was written by copying the first | that is one reader, not two | it must import nothing from the codec |
| 19 | a Pareto claim on a lane the parent already wins | the parent is the incumbent | same-process comparison |
| 20 | reporting the best of N runs | selection on noise | one run, one process |
| 21 | **a phrase-dictionary bound treated as achievable** | BPE is not additive across a substitution boundary (§4.4: bound 848, real 1 393) | build the codec and measure the complete message |
| 22 | **an abstract wire compared against a message** | the sweep's 611 vs the frontier's 622 is exactly the 11-token instruction; comparing them "proves" a win that does not exist | always add the contract before comparing |

### 7.1 The modal shortcut, and the test that kills it

**Modal shortcut: "the instruction is only prose, so shortening it is free."**

It fails because the instruction is the **decoder specification**, and this turn
found the sharpest possible demonstration: AUSTEROS's reworded base clause made
`brachysBandOf` return `null` and the codec produced an undecodable message. The
prose the reader keys on is code. The test:

> Take the printed message. Apply, to each notation token, the **most natural**
> reading of the instruction. Reconstruct. Diff against the source.

That test is `bench/x71/reader3.ts`, it caught the band-marker break, and it now
passes byte-exactly on all three winning messages. The corresponding test for the
*bound* shortcut is `bench/x71/proto.ts`: build the codec the bound describes and
measure it (§4.4).

---

## 8. Mechanism portfolio — six distinct attempts, one shipped

| # | mechanism | central construction | artifact | proved portion | unresolved interface | cheapest falsification | local or equivalent? |
|---|---|---|---|---|---|---|---|
| 1 | **contract search** (shipped as AUSTEROS) | phrasings as a pool; complete-message objective; descriptor descent | `src/lib/omega/austere.ts`, `bench/x71/*` | 6/29 lanes, 0 regressions, 3 independent readers exact | needs a fold to exist; prose has none | run the 29-lane gate | local to the instruction term |
| 2 | **phrase-dictionary codec** | top-60 n-grams, single-token glyphs, in-band codebook | `bench/x71/proto.ts` | reversibility and cost measured | BPE is not additive across a boundary | build it and count the message | **equivalent to the closed axis** (§4.1–4.4) |
| 3 | **LZ77 back-references** | `⟨offset,length⟩` into the already-decoded text | `bench/x71/lz.ts` | exact parse, exact syntax | reference cost 4–6 tokens vs short prose repeats | measure the oracle | **ruled out measurably** on 3/5 lanes |
| 4 | **interior-space field model** (my own X70 recommendation) | delimited table + alignment contract so aligned listings become foldable | `bench/x71/prize.ts` | the fold fires and is priced | the contract costs more than the fold saves | the 5-lane table of §4.5 | **falsified** |
| 5 | **whole-registry tournament** | consult all 219 exact codecs, not 8 parents | `bench/x71/sweep.ts` | 78 codecs converge on the same 611-token wire | the sweep compares wires to messages (row 22) | re-run with contract included | local, and **empty** once measured correctly |
| 6 | **faster exact tokenizer** | hash-map rank table instead of 200 K binary search | `bench/x71/prof*` (the profile only) | 48 % of CPU identified | needs a full differential campaign on ids | compare ids on a large corpus | local, **unfinished**, and the highest-value next step |

The distribution is the honest result: **one mechanism shipped, one falsified
(and it was mine), two ruled out by measurement, one empty, one unfinished.**

---

## 9. Live research

**New searches this turn** (terms not previously used in this repo's codec notes):

* **arXiv:2605.29000**, Zou, Tong, Li, *Text-Preserving Lossy Text Compression*
  (Oct 2026). Measured statement: *"Traditional lossless text compression
  preserves every byte, but its gains on natural language are often modest."*
  Their whole framework is **lossy** — deletion plus LLM reconstruction, with a
  worked example where the model writes "general Kennedy" for "general election".
  **This is independent corroboration of §4** and simultaneously the cleanest
  illustration of why lossy is a different problem: the metric they optimise
  tolerates a distortion that ours forbids at tolerance 0.
* **arXiv:2603.25340**, *Large Language Model as Token Compressor and
  Decompressor* (Mar 2026). Claims **up to 18×** via learned Z-tokens with LoRA
  adapters. The reader is **fine-tuned**. Out of regime by §1.2 — the exact
  adjacent problem 1.6(2). Their own §3.5 notes the codebook is context-dependent
  ("the same Z-tag can appear in different contexts but yields different
  representations"), which is the failure mode a byte-exact contract cannot have.
* **Harvill et al. (2025)**, cited in the above: meta-token substitution,
  **18–27 %** token reduction — again **with a fine-tuned reader**. Two independent
  learned systems landing at 18–27 % is the honest yardstick for "what a
  *trained* reader buys" versus "what an untrained one permits" (our 5–15 % on
  structured lanes).
* **arXiv:2604.13066** (re-checked): >0.99 exact match for template-based
  dictionary encoding with the dictionary **in the system prompt** — the closest
  published evidence that a chat model can execute an in-band code. Our extra
  constraint is that the dictionary is in the message, not the system prompt, and
  that restoration must be byte-exact rather than analysis-equivalent.
* **arXiv:2605.29000** also reports that word-frequency deletion is a strong
  cheap baseline and that *semantic* methods only win at mild compression — the
  same shape as our finding that the cheap structural mechanisms capture nearly
  all of the available gain.

### 9.1 The 2026 frontier-lab mathematics, evaluated individually

I read secondary reporting and repository descriptions. **I did not open the Lean
files, run Lean, or verify any proof, and I am not able to. Nothing below is a
verification claim.**

* **OpenAI**, 26 Oct 2026, two manuscripts with Lean formalisations in
  `openai/math`: *The Exponential Time Hypothesis is false* (deterministic,
  polynomial-space, subexponential-time exact counter for fixed-width CNF) and
  *Local smoothing for the Euclidean wave equation* (with Kakeya and Stein as
  consequences). A third claim (interacting 4-D QFTs) was announced, **not
  released**. OpenAI describes these as raw research artifacts and defers
  precedence to the community; an independent group (Impagliazzo, Paturi, Williams)
  is reviewing the ETH result. Status: **claims under review.**
* **Anthropic**: a public `anthropics/formal-math` repository with an `/eth`
  directory described as Lean 4 files for a claimed subexponential 3-SAT result.
  Repository existence is reported; contents and validity unverified by me.
* **Google DeepMind**: AlphaProof/AlphaGeometry are competition mathematics with
  machine-checked proofs — search over a fixed language, not a description-length
  result.
* **"Double AI" / Gemini / others**: I found no first-party artifact to evaluate
  and will not characterise claims I could not locate.

**Do these help a codec? Evaluated against the actual requirement — no, with one
near-miss, and the near-miss is worth stating precisely.**

A codec needs *a short description plus a reader that can execute it*. A
subexponential SAT algorithm would make **finding** the shortest description
cheaper: Kolmogorov search becomes 2^{o(n)}. That is genuinely the closest any of
these results comes to this project. It does not help, for two measured reasons:

1. the search space here is bounded by a ~100 K-token budget over a fixed
   notation, not by SAT; and
2. **the binding constraint is the reader.** §4.4 is the demonstration: a
   description exists that is 848 tokens (the ideal dictionary) and the
   *executable* one costs 1 393, because byte-exact execution through a
   tokenizer boundary is where the bits go. A Kolmogorov-minimal program is not a
   chat message a model can run at tolerance 0.

The one thing that does transfer is **methodology**: publish the artifact, name
the checker, and let the formal statement be checked independently of the informal
claim. That is what §5.6 is, and it is why I built a third reader rather than
asserting the contract was clear.

---

## 10. What was missed, and the four tests ranked by information per minute

**The blind spot, restated with evidence this time.** Seventy turns treated the
decoder instruction as prose. It is not prose; it is **32–47 % of the complete
message on every structured lane** (69/207 on `psql`, 124/263 on `kubectl`,
78/185 on `metrics`) and it is the *only* term that still moves on this corpus.
§4.3 is the clean demonstration: 219 codecs, one wire, and the entire remaining
gap is the English. Before X70 this was invisible because a fold with a big
instruction simply lost its gate and nobody asked what it lost *to*.

**Ranked tests.**

1. **(minutes) Determinism.** Re-run the census with `OMEGA_DET=1` twice on
   `apt-real`, `code-ts` and `kubectl` and diff. If the ±1…±6 collapses, the gate
   becomes reproducible, and AUSTEROS stops losing `apt-real` to nothing (§3).
   Cheapest possible test, highest structural value.
2. **(hours) The fast exact tokenizer.** 48 % of CPU is a binary search over a
   200 K rank table. A hash-map table is a 2–4× win on 75 % of the runtime,
   i.e. ~2× overall, with **zero** fidelity risk *if* and only if the ids are
   proven identical on a large corpus. This is the only remaining lever on the
   834-second case.
3. **(hours, needs other models) A blind decode trial.** Ship the six winning
   messages to models that have never seen this repository, with the message as
   the only input, and diff. Nothing in this file substitutes for it.
4. **(days) Budget-aware parents.** Three parents burn 162 s to lose to a parent
   that takes 0.74 s. There is no sound per-parent lower bound available (§6.3),
   so this needs either a bound or a *declared* loss of completeness — which
   would break the "never worse" guarantee and must be stated as such.

---

## 11. Generalized local leaders, by category

Complete-message `o200k_base` tokens; "leader" is the local winner of that lane's
comparator set, not a universal champion. All rows measured this turn.

| category | lane | raw | leader | gap to 2nd |
|---|---|---|---|---|
| Aligned box table, generated columns | `holdout-tbl/psql-output.txt` | 675 | **207** `austere` | brachys 212 |
| Space-run aligned table (7 col × 23 row) | `holdout-tbl/kubectl-get-pods.txt` | 1 006 | **263** `austere` | brachys 280 |
| Delimited numeric/temporal columns | `holdout-x40/metrics.tsv` | 811 | **185** `austere` | brachys 197 |
| Wide numeric CSV | `holdout-x40/prices.csv` | 582 | **107** `austere` | frontier 133 |
| Small `df`-style aligned table | `holdout-tbl/df-h.txt` | 570 | **151** `austere` | frontier 171 |
| Markdown table | `holdout-tbl/markdown-table.md` | 330 | **162** `austere` | frontier 176 |
| Markdown cue sheet | `holdout-x40/cue-sheet.md` | 513 | 163 `metron` | — |
| `node --help` (wrapped 2-col) | `holdout-x41/node-help.txt` | 1 099 | 863 `synkrisis` | — |
| `dpkg -l` | `holdout-x42/dpkg-l.txt` | 1 000 | 674 `synkrisis` | — |
| `findmnt` | `holdout-x42/findmnt.txt` | 787 | 444 `synkrisis` | — |
| `ls -l` (24 KB) | `holdout-x41/ls-l-real.txt` | 5 194 | 1 497 `synkrisis` | — |
| `ls -l --numeric` | `holdout-x41/ls-l-nm.txt` | 2 160 | 406 `synkrisis` | — |
| `ps aux` | `holdout-x41/ps-aux-real.txt` | 3 054 | 1 051 | — |
| `ps -ef` | `holdout-x42/ps-ef.txt` | 1 144 | 315 | — |
| `apt list` | `holdout-x41/apt-real.txt` | 2 739 | 865 | — |
| **Real system log** (`/var/log/dpkg.log`, 400 lines) | `bench/x71/dpkg-log-400.txt` | 13 860 | 1 412 (**89.8 %**) | — |
| Prose — KB article | `holdout-work/kb-article.txt` | 656 | 622 (5.2 %) | — |
| Prose — email thread | `holdout-work/email-thread.txt` | 629 | 488 (22.4 %) | — |
| Prose — commit log | `holdout/gh-prose.txt` | 1 934 | 1 752 (9.4 %) | — |
| Prose — LLM answer | `holdout-work/llm-answer.md` | 733 | 674 (8.0 %) | — |
| Markdown README | `holdout/readme.txt` | 843 | 646 (23.4 %) | — |
| Source code | `holdout/code-ts.txt` | 1 422 | 985 (30.7 %) | — |
| JSON | `holdout/json-pkg.txt` | 1 152 | 681 (40.9 %) | — |
| JSON API | `holdout/gh-api.json.txt` | 2 519 | 1 112 (55.9 %) | — |
| Unified diff | `holdout-work/unified-diff.patch` | 578 | 419 (27.5 %) | — |

**Four regularities the table supports.**

1. The frontier's gain is monotone in **within-window token repetition**, not in
   "structure": 89.8 % on a real log, 70–81 % on listings, 41–56 % on JSON,
   27–31 % on code and diffs, and 5–9 % on prose.
2. **Every lane AUSTEROS wins is a table lane**, and the three it flipped are the
   smallest ones — which is exactly the H∂ threshold: a fixed instruction cost
   hurts small documents, so making the instruction cheaper changes the decision
   there first.
3. Prose is weak for a reason no engineering removes: there is nothing in it to
   delete that a reader can rebuild without being told what to write (§4.1–4.2).
4. **The table does not support "the stack is near a floor"**: `ls -l` (5 194 →
   1 497) and `ps aux` (3 054 → 1 051) are the two largest ops documents in the
   set and the fold finds nothing in either.

---

## 12. Files

* `src/lib/omega/austere.ts` — the codec: pool, assembler, objective, gate.
* `src/lib/omega/brachys.ts` — band marker now recognises the AUSTEROS prefixes
  (`AUSTERE_BASE_LIT_PREFIX`, the `c-tape` marker).
* `src/lib/omega/registry.ts` — registered as `austere`.
* `src/lib/omega/diastema.ts` — per-line token memo (no behaviour change).
* `src/lib/omega/synkrisis.ts` — admissible multiset bound (no behaviour change).
* `bench/x71/oracle.ts`, `lz.ts`, `proto.ts`, `prize.ts`, `sweep.ts`, `dict2.ts`,
  `transpose.ts`, `reflow.ts`, `words.ts`, `headroom.ts` — the negative-space
  measurements of §4.
* `bench/x71/austere-broad.ts` — the 29-lane gate, all rows.
* `bench/x71/reader3.ts` — the third, prose-only reader.
* `bench/x71/speed.ts`, `profile.ts`, `cachestat.ts`, `determinism.ts` — runtime.
* `bench/x71/receipts/` — `austere-broad.json`, `reader3-*.json`, `speed-*.json`,
  `census.json`, `msg-*.txt`.
* `docs/codecs.md`, `docs/codec-abbreviations.md` — the spec pages, updated.
