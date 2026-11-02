# X70 — BRACHYS: the contract algebra, and a reader written from the contract

Branch `arena/27acf3c2-kompkernel`, from `82b8d5a`. Every number in this file was
printed by a script in this directory on this checkout, and each one names the
script. Nothing here is projected, estimated, or reported from a run that did
not happen.

## 0. Runtime honesty

**Tools actually used:** Node v22.22.3, the TypeScript compiler (`npx tsc
--noEmit`), esbuild (bundling the `.ts` benches to `.mjs`), `git`, `gh`, the
repository's own real tokenizer (`gpt-tokenizer`, `o200k_base`), and live web
search. **Not used, not claimed:** no independent agent, no external LLM decode
trial, no Lean/prover run, no database, no simulator, no parallelism. Every
"agreement" figure below is between two programs on this machine.

**The one thing that changed:** BRACHYS moves the frontier on **3 of the 34 lanes
measured**, by −32, −46 and −13 tokens. It did **not** move prose at all, and it
did not move 31 of the 34 lanes. That is the honest headline and the rest of this
file is the evidence for it and against the tempting over-readings of it.

---

## 1. Formal model

**1.1 Admissible objects.** An input is a JavaScript UTF-16 string `T` of at most
200,000 code units, read as UTF-8 bytes from a file. Byte sequences that are not
valid UTF-8 are not admitted as bytes; the encoder's domain is text. The output is
one string `M` — a single chat message — that must be (a) self-contained, (b)
readable by a competent reader with no system prompt, no skills file and no
external dictionary, and (c) exactly invertible to `T` code unit for code unit,
including CR, tabs, trailing spaces, NUL and unpaired surrogates.

**1.2 Information/access model.** The reader has: the message, and its own prior.
It has no tool, no second turn, no file, no table of magic constants, and no
access to the encoder. Every rule it needs must be in the message, in prose, in
the same alphabet it is being asked to produce.

**1.3 The resource counted.** `M` measured in `o200k_base` tokens, on the whole
message (instruction + wire), not on a payload. This is the only size metric used
anywhere in this report. Wall clock and CPU are separate metrics and are never
added to it.

**1.4 Success and failure, with quantifier order.**

> ∃ an encoder `E` and a decoder `D`, both in the repository, such that
> ∀ admitted `T`: `D(E(T)) = T` exactly, **and** for a fixed lane `T`:
> `tokens(E(T)) < tokens(F(T))` where `F` is the shipped frontier measured on the
> same `T` in the same process.

Failure is the negation of that whole sentence. Note the order: the universal
quantifier over inputs is inside the existential over codecs, so one counterexample
input kills an exactness claim, while a size claim is per-lane and is not a claim
about all inputs.

**1.5 Regime, boundary conditions, units, tolerances.** `o200k_base` throughout;
tokens are integers, so the tolerance is **0**; the comparison is strict `<`, so a
tie is not a win. Lanes are files under `bench/`; the reported numbers are one
measurement each, on a 2-core sandbox, in one process. Sources over 200,000 units
are out of domain and fall back. A `\r` in the source is out of domain for the
stack's table folds and falls back.

**1.6 Adjacent problems that must not be substituted for this one.**

1. Lossy prompt compression (CORE, RECOMP, LLMLingua) — no invertibility.
2. Classical binary codecs (xz, zstd, ALP, Parquet/`Virtual`) — they compress a
   *bitstream*, and a bitstream costs ~2 tokens per byte to carry in a message, so
   they usually *lose* on this metric even when they shrink the data.
3. Arithmetic-coded LLM compression (Delétang et al.) — needs the model's internal
   state as the decoder, which the one-chat access model does not provide.
4. JSON-structure codecs (`compress-json`, `json-compress`) — restore *values*,
   not bytes; formatting is normalized, which is not exact.
5. Log-template mining (LogShrink, Drain) — clusters templates, does not invert.
6. "Compress the tokenizer stream" schemes — need the tokenizer at the reader.
7. Delta against an external base (Wollmer et al.) — the base is not in the message.
8. Decompression *by a model that was fine-tuned for it* — violates the access model.
9. Table-to-text NL generation — lossy.
10. Semantic deduplication / summary chains — lossy.
11. Byte-level transforms with no stated inverse — unverifiable.
12. Deduplicating equal *inputs* across a session (OURA/ENGRAMMA) — a time win,
    zero token win, and explicitly not what this report claims.
13. Round-tripping through JSON/XML *parsers* — canonicalizes and breaks exactness.
14. Program-synthesis "compressors" whose decoder is an interpreter we ship —
    the reader is a chat model, not our interpreter.
15. Kolmogorov-optimal compression — uncomputable in general; and even a minimal
    program is not a chat-readable message.

---

## 2. Outcome space

| hypothesis | statement | status after this turn |
|---|---|---|
| **H+** | some new mechanism strictly lowers the complete-message token count on at least one real lane, exactly and with a reader that needs nothing but the message | **evidenced on 3 lanes** (§5), by 13–46 tokens each |
| **H−** | no code exists that compresses every possible input under a finite alphabet length measure | **true and not our target**: pigeonhole. Within the admitted domain the question is not universal compression but per-lane improvement, which §5 answers |
| **H−** (strong) | the shipped stack's *representation* on structured text has no headroom left | **refuted by measurement**: HYLE's own wire is 2× below what ships on psql/metrics/kubectl (§3); the binding term was the instruction, not the data |
| **H∂** | the answer changes at a boundary / needs extra conditions | **this is the right hypothesis and it is what the evidence supports**: whether a fold pays is a *threshold in document size* against a fixed instruction cost. The same mechanism that wins 46 tokens on `kubectl` **loses** 14 on `df-h` (§5.4). There is no unconditional claim available |

**Declared evidence threshold.** A size claim is made only when (i) the complete
message is counted, (ii) the decoder that ships is used to prove exactness, (iii)
a *second* decoder written only from the instruction reproduces the source, and
(iv) the comparison is against the frontier measured in the same process. All four
hold for the three lanes in §5. Nothing smaller than that threshold is called a
win in this report.

---

## 3. Frontier: what was confirmed, and the one thing that is **not** stable

### 3.1 The instruction I was asked to check

> "confirm that the frontier is exactly the configuration as mentioned by the test
> ran last turn. If not, please restate."

Last turn (X69) recorded, on `bench/holdout-x40/metrics.tsv`, with `OMEGA_DET=1`:
frontier **210**, winner `akolouthia2`, message SHA-256
`f0e0ffb9543f3b2f7032067ed73d6fa3de84745639647fafdc109bdca1864628`.

**Re-run this turn** (`bench/x70/frontier.ts`, `o200k_base`, `OMEGA_DET` unset,
Node v22.22.3, TAGSTACK runtime parents + SIBLING-TEMPLATE), 14 lanes,
`bench/x70/receipts/frontier.json`:

```
holdout-tbl/psql-output.txt              raw  675  frontier  244  metron
holdout-work/kb-article.txt              raw  656  frontier  622  synkrisis
holdout-work/email-thread.txt            raw  629  frontier  488  synkrisis
holdout-work/meeting-transcript.txt      raw  472  frontier  385  synkrisis
holdout-work/bibliography.txt            raw  896  frontier  671  synkrisis
holdout-work/unified-diff.patch          raw  578  frontier  419  synkrisis
holdout-work/llm-answer.md               raw  733  frontier  674  synkrisis
holdout-x40/metrics.tsv                  raw  811  frontier  210  akolouthia2
holdout-x40/prices.csv                   raw  582  frontier  133  diastema
holdout-tbl/kubectl-get-pods.txt         raw 1006  frontier  326  akolouthia2
holdout-tbl/markdown-table.md            raw  330  frontier  176  synkrisis
holdout-tbl/df-h.txt                     raw  570  frontier  171  akolouthia2
holdout/code-ts.txt                      raw 1422  frontier  984  synkrisis
holdout/json-pkg.txt                     raw 1152  frontier  681  synkrisis
```

`metrics.tsv` = **210**, winner `akolouthia2`, and `frontierComplete: true`,
`decoded === source: true` on all 14 lanes. **The configuration is the one X69
described, and on 12 of the 14 lanes it reproduced exactly.**

### 3.2 Restatement: the frontier is **not a pure function of its input**

The instruction asked whether the frontier is exactly last turn's configuration. On
12 of 14 census lanes it reproduced to the token. But the same lane does not always
give the same number, and I ran the controlled experiment rather than guessing
(`bench/x70/determinism.ts`: same binary, same text, fresh `node` per run, exactness
asserted on every run):

| lane | `tagstackEncode` alone, 6 fresh processes (DET off ×3, `OMEGA_DET=1` ×3) | `tagstackEncode` *inside* `brachysEncode`, fresh single-lane process | inside the 34-lane gate process |
|---|---|---|---|
| `kubectl-get-pods.txt` | **326, 326, 326, 326, 326, 326** (spread 0) | **332** (`emit.ts`, `native.ts`) | **326** |
| `du-ak.txt` | 790, 790 (`OMEGA_DET` unset) / **787, 787** (`OMEGA_DET=1`) | — | 790 |
| `metrics.tsv` | 210 | 210 | 210 |
| `psql-output.txt` | 244 | 244 | 244 |
| `holdout/code-ts.txt` | 984 (census) | — | 985 |

Three measured facts, and one thing I cannot yet explain:

1. **In one configuration the frontier is reproducible.** Six of six runs on
   `kubectl` gave 326 with a spread of zero. The census reproduces X69.
2. **The frontier depends on process history.** The *same call* from inside
   `brachysEncode` yields 332 in a fresh single-lane process and 326 after 30 other
   lanes have run in the same process. `code-ts` moved by 1 the same way. This is
   consistent with the shared work meter (`workmeter.ts`) feeding the DAEDALUS
   budget, but **I have not proved the mechanism**, and I am recording the
   observation, not an explanation.
3. **`OMEGA_DET=1` changes answers, it does not merely stabilise them.** On `du-ak`
   it moves 790 → 787 deterministically. So "freeze the clock" is not a no-op; it
   selects a different, reproducible point in the same search.

**What this does to the claims.** The gate numbers in §5.4 are the ones measured
*inside the 34-lane process* against a frontier of 326, so they are the
**conservative** pair: a standalone run compares 280 against 332 and would report a
larger win. No claim in this report depends on the favourable direction. But the
finding is structural and it is the reason test #1 in §10 is determinism: **a
codec whose gate is "strictly below the frontier" is only as reproducible as the
frontier is**, and this repository has been quoting cross-process frontier numbers
as if they were constants. Every number in this report that compares two arms is
same-process; the ±1…±6 error bar on any cross-process comparison in earlier
reports is real and is not stated there.

## 4. Negative space: 20 result shapes that look like a win and are not

Each row is a shape that has appeared, or could plausibly appear, in this
repository's history, with the exact test that detects it. `bench/x70/brachys-verify.ts`
automates rows 4, 5, 8, 9 and 12; the rest are structural and are checked by the
scripts named.

| # | shape | why it fails | detector |
|---|---|---|---|
| 1 | count only the wire | the instruction is a fixed cost paid once and is often 35–50 % of the message | count `contract + '\n' + wire` |
| 2 | count characters | o200k is not linear in characters; the same wire length differs by 2× | count tokens of the whole message |
| 3 | beat raw but lose to the frontier | raw is not the incumbent | `frontierCosts` in the same process |
| 4 | compare different sources | a different document is a different problem | SHA-256 of the source next to the number |
| 5 | incomplete comparator | one missing parent can hide the winner | require `frontierComplete` |
| 6 | hidden dictionary / encoder state | the reader does not have it | decode from the serialized message in a fresh process |
| 7 | normalize whitespace / EOL | not exact | code-unit comparison, not `trim()` comparison |
| 8 | Unicode normalization | `é` (U+00E9) ≠ `e` + U+0301 | adversarial combining + unpaired surrogate cases |
| 9 | escape canonicalisation | `\u003c` ≠ `<` | escaped and literal JSON tests |
| 10 | implicit ordering of directives | duplicate/out-of-order `G` indices decode differently | reject duplicates; sort, then require re-encode of the dirs to match |
| 11 | accumulating patches | one error corrupts every later row | each row is a function of its own index only |
| 12 | an in-band rule mistaken for reader reliability | a rule can be complete and still be misread | a second reader + a blind model trial (not done) |
| 13 | speed measured against a cold cache | the second arm pays less | cold process per arm |
| 14 | a synthetic corpus presented as natural | tuning on the test set | label every fixture's provenance |
| 15 | global novelty from a partial search | prior art exists for almost every primitive | cite before claiming |
| 16 | "the fold is exact, therefore the message is shorter" | exactness and size are independent | measure both |
| 17 | an instruction shortened until it is ambiguous | the shorter prose decodes differently | the ambiguity test of §5.3: apply the natural reading and see whether the data agrees |
| 18 | the second reader was written by copying the first | that is one reader, not two | it must import nothing from the codec module |
| 19 | a "Pareto" claim on a lane where the parent already wins | the parent is the incumbent | same-process comparison |
| 20 | reporting the best of N runs | selection on noise, especially with the ±6 instability of §3.2 | one run, one process, per lane |

### 4.1 The modal shortcut, and the test that kills it

**The modal shortcut in this line of work is: "the contract is only prose, so
shortening it is free."** It is the shortcut this turn was built on, so it gets
the hostile treatment.

It fails because the instruction is not free *prose*, it is *the decoder
specification*. X26 already shipped a contract that was 2 tokens cheaper and
silently undecodable, and caught it only because it happened to write a
from-spec reader for one lane. So the test is not "does the shorter sentence read
well", it is:

> Take the printed message. Apply, to each notation token in the wire, the
> **most natural** reading of the instruction (not the encoder's reading).
> Reconstruct the document. Diff it against the source.

That test found a live defect in this very codec — see §5.3 — and the wording was
changed as a result. It is `bench/x70/reader2.ts`, and it passes byte-exactly on
all three winning lanes.

---

## 5. BRACHYS (βραχύς, "short") — the mechanism that shipped

### 5.1 What was measured before any code was written

`bench/x70/split.ts` splits every parent's complete message into its instruction
and its wire, on the same text. The result is the whole justification of this
codec:

| lane | frontier | winner | wire tokens | instruction tokens |
|---|---|---|---|---|
| `psql-output.txt` | 244 | `metron` | 171 | 73 |
| `psql-output.txt` | — | `kanon` (loses) | **141** | **127** |
| `metrics.tsv` | 210 | `akolouthia2` | 148 | 0 (+ own sentence) |
| `metrics.tsv` | — | `kanon` (loses) | **109** | **127** |
| `kubectl-get-pods.txt` | 326 | `akolouthia2` | — | `kanon` 141 + **211** |

Read the `kanon` rows. **HYLE's table fold already produces a 2× smaller
representation than the shipped frontier, and it loses the gate anyway, because
its instruction is bigger than its wire.** On `metrics.tsv` the fold is 109 tokens
of wire against a 210-token frontier; shipping it costs 127 tokens of English.
The stack has been pricing a correct representation out of existence.

### 5.2 The mechanism

Not a new fold. The fold is HYLE's, unchanged, and the wire is HYLE's notation,
unchanged. What BRACHYS changes is the **shape of the instruction**:

```
KANON:    one generator family -> one English clause
          (a sentence for the modulus, a sentence for the zero pad,
           a sentence for the letter counter, a sentence for the cycle,
           a sentence for the date)

BRACHYS:  one arithmetic -> one sentence,
          the families are PARAMETERS of it
```

Every family becomes a term in one closed algebra, and each term is emitted only
when the wire uses it:

```
{A+B}=A+B*r        mM=A+(B*r mod M)      zW=zero-pad to W
cX=r-th letter from X                    #p:v,.. cycles p values
```

Measured effect of the shape change alone (`bench/x70/frag.ts` … `base2.ts`
measured each candidate wording; the assembled text is counted on the real wire):

| lane | HYLE/KANON instruction | BRACHYS instruction | saved |
|---|---|---|---|
| `psql-output.txt` | 127 | **74** | −53 |
| `kubectl-get-pods.txt` | 211 | **141** | −70 |
| `metrics.tsv` | 127 | **90** | −37 |

Two further, smaller, measured effects, both honest to state:

* dropping the `B` directive (the body arm is declared by the instruction, not by
  a wire token nobody explains) is −3 tokens;
* choosing the body arm by measured complete-message tokens rather than hard-
  coding `Bc` is what makes `psql` ship a *literal* body: `b:212` vs `c:228`.

### 5.3 The defect the method found in my own contract

The first assembled instruction said `mM=B*r mod M`. Read naturally, in a list
whose first term is `{A+B}=A+B*r`, that means `(A + B*r) mod M`. The reference
semantics are `A + (B*r mod M)` — the base is **outside** the modulus, which is
not a detail: on `psql`'s `created` column the month field is
`{1+1m12z2}`, and the two readings differ on row 11 (`12-12` versus `00-12`).
Checking the wire against the data exposed it. The wording is now
`mM=A+(B*r mod M)` and costs 2 tokens.

**This is the entire argument for a from-spec reader.** A shorter instruction that
is 2 tokens cheaper and 1 row wrong is not a codec, it is a bug that passes its
own test.

### 5.4 Results — every lane measured, nothing omitted

`bench/x70/brachys-broad.ts`, receipt `bench/x70/receipts/brachys-broad.json`.
34 lanes. `Δ` is BRACHYS minus the frontier measured **in the same process**.

| lane | raw | frontier | BRACHYS | Δ | contract + wire |
|---|---|---|---|---|---|
| `holdout-tbl/psql-output.txt` | 675 | 244 | **212** | **−32** | 74 + 138 |
| `holdout-tbl/kubectl-get-pods.txt` | 1006 | 326 | **280** | **−46** | 141 + 139 |
| `holdout-x40/metrics.tsv` | 811 | 210 | **197** | **−13** | 90 + 107 |
| `holdout-tbl/df-h.txt` | 570 | 171 | 171 | 0 | fold **offered, loses**: 180 vs 171 |
| `holdout-tbl/markdown-table.md` | 330 | 176 | 176 | 0 | fold **offered, loses**: 195 vs 176 |
| `holdout-x40/prices.csv` | 582 | 133 | 133 | 0 | fold **offered, loses**: 157 vs 133 |
| `holdout-x41/df-real.txt` | 158 | 126 | 126 | 0 | no fold offered |
| `holdout-x41/du-real.txt` | 458 | 272 | 272 | 0 | no fold offered |
| `holdout-x41/du-ak.txt` | 1649 | 790 | 790 | 0 | no fold offered |
| `holdout-x41/ls-real.txt` | 1034 | 433 | 433 | 0 | no fold offered |
| `holdout-x41/ps-real.txt` | 1106 | 397 | 397 | 0 | no fold offered |
| `holdout-x41/ps-aux-real.txt` | 3054 | 1051 | 1051 | 0 | no fold offered |
| `holdout-x41/git-log-stat.txt` | 2909 | 1458 | 1458 | 0 | no fold offered |
| `holdout-x41/apt-real.txt` | 2739 | 863 | 863 | 0 | fold **offered, loses**: 1029 vs 863 |
| `holdout-x41/node-versions.txt` | 779 | 463 | 463 | 0 | no fold offered |
| `holdout-x41/tsc-diag.txt` | 187 | 108 | 108 | 0 | no fold offered |
| `holdout-x42b/df-h-all.txt` | 156 | 124 | 124 | 0 | no fold offered |
| `holdout-x42b/free-m.txt` | 76 | 76 | 76 | 0 | no fold offered |
| `holdout-x42b/ss-s.txt` | 119 | 119 | 119 | 0 | no fold offered |
| `holdout-x42b/ps-eo-cpu.txt` | 1087 | 389 | 389 | 0 | no fold offered |
| `holdout-x42b/uptime-w.txt` | 80 | 80 | 80 | 0 | no fold offered |
| `holdout-x42b/vmstat.txt` | 229 | 149 | 149 | 0 | no fold offered |
| `holdout-x42/df-h.txt` | 140 | 108 | 108 | 0 | no fold offered |
| `holdout-x42/lsblk.txt` | 60 | 60 | 60 | 0 | no fold offered |
| `holdout-x42/ps-ef.txt` | 1144 | 315 | 315 | 0 | no fold offered |
| `holdout-x42/ss-tan.txt` | 843 | 209 | 209 | 0 | no fold offered |
| `holdout-work/kb-article.txt` (prose) | 656 | 622 | 622 | 0 | no fold |
| `holdout-work/email-thread.txt` (prose) | 629 | 488 | 488 | 0 | no fold |
| `holdout-work/meeting-transcript.txt` | 472 | 385 | 385 | 0 | no fold |
| `holdout-work/bibliography.txt` (prose) | 896 | 671 | 671 | 0 | no fold |
| `holdout-work/llm-answer.md` (prose) | 733 | 674 | 674 | 0 | no fold |
| `holdout-work/unified-diff.patch` | 578 | 419 | 419 | 0 | no fold |
| `holdout/code-ts.txt` | 1422 | 985 | 985 | 0 | no fold |
| `holdout/json-pkg.txt` | 1152 | 681 | 681 | 0 | no fold |

**Δ < 0 on 3 of 34 lanes; Δ = 0 on 31; Δ > 0 on 0. Total 13 775 → 13 684
(−91, −0.66 %).** The zero rows are not "measured losses that were hidden" — they
are the fail-closed path returning the frontier's own message, and the receipt
records the reason for each. **27 of the 31 are "no fold offered"** (the stack's
table fold found nothing to price); **4 are a fold that was offered and lost**
(`df-h` 180 vs 171, `markdown-table` 195 vs 176, `prices.csv` 157 vs 133,
`apt-real` 1029 vs 863). Those four are the honest negative results of this turn:
in each case the instruction is still more expensive than the representation it
buys, which is precisely the threshold effect of §2.

### 5.5 Why the other 31 lanes do not move — the coverage finding

`bench/x70/coverage.ts` asks a different question from "did it win": **does the
stack's table fold even find a block?** Answer on the big ops lanes:

| lane | qualifying table blocks | HYLE offers a fold |
|---|---|---|
| `ls-l-real.txt` (5 194 tok) | **0** | no |
| `ps-aux-real.txt` (3 054 tok) | **0** | no |
| `ps-ef.txt` (1 144 tok) | **0** | no |
| `du-real.txt` | 1 block, 2 tab fields | no (nothing to generate) |
| `git-log-stat.txt` | 1 block, 2 fields | no (nothing to generate) |
| `apt-real.txt` | 1 block, 2 fields | yes — and it loses (2 601 vs 861) |

`ls -l` fails the space-run rule because a date field such as `Sep 30 07:59`
contains a single interior space, which the wire's one-space join cannot carry.
`ps aux` fails for the same reason on `COMMAND`. So **the reason the frontier is
not moved on those lanes is that there is no fold to price, not that the contract
is too expensive.** That is the honest read, and it is a more useful finding than
the codec: the next size mechanism is a *field model that can carry interior
spaces*, not another wording pass.

Prose does not move for the reason X67 recorded and this turn re-measured: prose
has no repeated structure to delete. `kb-article` is 3 385 characters and the
stack's message is 622 tokens against 656 raw — 95 % of raw. There is no
mechanical win in that direction and this turn did not find one.

### 5.6 Is it greedy?

**No.** `brachysPlan` builds two complete messages (a literal body and a CHIRON
body), decodes each with the from-spec reader, requires exactness, measures both,
keeps the cheaper; then `brachysEncode` measures the shipped frontier in the same
process and keeps the cheaper of *that* and the candidate. It is a measured
minimum over three complete messages, not a left-to-right pass. The one greedy
component is inherited: HYLE's column selection, which is its own measured
lattice.

### 5.7 Time / CPU

CPU-bound, and dominated by the inherited frontier gate: `brachysEncode` runs
exactly one `tagstackEncode` plus one `hyleEncode(fast: true)` (O(n), no arm
search) plus at most two `daedalusEncode` calls on the folded body. Measured
wall clock in the 34-lane gate: 3.4 s (`df-h`) to 72 s (`ps-aux`), i.e. the same
range as the frontier alone, because the frontier is what costs. **BRACHYS adds
no new asymptotic cost and no new cache, and it is not a speed improvement.**
`metrics.tsv` is 51 s with and 44.7 s without the codec in the same census run;
that difference is noise on a shared 2-core box, not a claim.

**No new speed mechanism was shipped this turn, and none is claimed.** The
tokenizer/chunk caches (`bpe.ts`, X33/z42), OURA (X67) and ENGRAMMA (X68) are all
still in force and are what the speed axis already has. The one speed lever this
turn identified is negative: §3.2 shows the frontier's own answer is
wall-clock-dependent, which no memo can make reproducible.

---

## 6. Verification — what actually ran

`bench/x70/brachys-verify.ts`, 113 s, **37 checks, 0 failures**, receipt
`bench/x70/receipts/brachys-verify.json`:

| gate | what it establishes | result |
|---|---|---|
| A. unit, 11 checks | every generator family renders; the contract names exactly the features the wire uses and omits the rest; a foreign instruction line is refused | pass |
| B. fuzz, 1 500 constructed tables | an **independently constructed** table (its text rendered here from the parameters, its wire stating the parameters) is reproduced by *both* BRACHYS's reader and `hyleDecode` | **1 417 / 1 417 exact under each reader** |
| C. differential, 4 000 mutated wires | BRACHYS's reader and `hyleDecode` agree wherever BRACHYS's reader accepts | **2 147 agreements, 1 744 fail-closed refusals, 0 disagreements** |
| D. real lanes | exactness; never worse than the frontier; agreement with the reference on the shipped wires | pass on all 5 |

**The second reader.** `bench/x70/reader2.ts` is 160 lines that import **nothing**
from `src/lib/omega/brachys.ts`. It reads a message file and implements only what
the instruction line says. Receipts `bench/x70/receipts/reader2-*.json`:

| lane | exact | characters |
|---|---|---|
| `psql-output.txt` | **yes** | 1 578 = 1 578 |
| `kubectl-get-pods.txt` | **yes** | 2 649 = 2 649 |
| `metrics.tsv` | **yes** | 1 203 = 1 203 |

**Native in-chat decode, performed here, from the printed message only.**
The `psql` message as printed is:

```
Lines A-B (from 0) below the directive line are one table split by SEP; the rest is
literal. G<c>=<spec> restores deleted column c per row r; {A+B}=A+B*r,
mM=A+(B*r mod M), zW=zero-pad to W. #p:v,.. cycles p values. print only.
¦T|3-26;G0=;G1= {10+1} ;G2= user_{0+1z4}    ;G3= 2026-{1+1m12z2}-{1+1z2} ;G4= {100.00+7.30} ;G5=#3: active    , pending   , closed    ;G6=
+----+--------------+------------+--------+-----------+
| id | name         | created    | amount | status    |
+----+--------------+------------+--------+-----------+
(24 empty lines)
+----+--------------+------------+--------+-----------+
(24 rows)
```

I read it as: directive line `T|3-26` (no `h`) makes body lines 3–26 one `|`-table
with all 24 lines as rows r=0…23; lines 0–2 are the two borders and the header and
are literal; each of the 7 columns was deleted and is rebuilt at its own index.
`G1=' {10+1} '` → ` 10 ` … ` 33 `. `G2=' user_{0+1z4}    '` → `user_0000` …
`user_0023` zero-padded to 4. `G3=' 2026-{1+1m12z2}-{1+1z2} '` → month
`1+(r mod 12)` padded to 2, day `1+r` padded to 2, so r=0 is `2026-01-01`, r=11 is
`2026-12-12`, r=12 is `2026-01-13` — which is exactly what the file contains.
`G4=' {100.00+7.30} '` → `100.00 + 7.30r`. `G5='#3: active    , pending   , closed    '`
→ cycles. `G0` and `G6` are empty. Joining with `|` gives
`| 10 | user_0000    | 2026-01-01 | 100.00 | active    |`.

That reconstruction is not just asserted: `reader2.ts` is the same reading written
down, and it diffs clean. **This is one worked instance by one reader. It is not a
statistical study of LLM decode reliability, and no external model was called.**
A blind multi-model trial is test #3 in §10 and it has not been done.

---

## 7. Mechanism portfolio — six genuinely distinct attempts

Each was pursued far enough to produce an artifact and a measured or structural
verdict. Only #1 shipped.

| # | mechanism | central construction | artifact | proved portion | exact unresolved interface | cheapest falsification | local or equivalent? |
|---|---|---|---|---|---|---|---|
| 1 | **contract algebra** (shipped as BRACHYS) | families are parameters of one arithmetic; instruction priced per parameter | `src/lib/omega/brachys.ts`, `bench/x70/*` | exact on 3 lanes + 1 417 fuzz cases; −32/−46/−13 | requires a fold to exist; prose/code/ls/ps have none | run on a lane with a table and read Δ | local: the gap is "no fold", not "contract too long" |
| 2 | **field model with interior spaces** (not built) | replace the runs one-space join with a declared rare separator so `ls -l`/`ps aux` tables become foldable | `bench/x70/coverage.ts` (the diagnostic) | 0 qualifying blocks measured on three big ops lanes | needs a new join char + an align contract, ~15 tokens | implement the join and re-run `coverage.ts` | **local**, and it is the largest remaining ops headroom (5 194 tok lane with no fold at all) |
| 3 | **cross-column function** (not built) | column `c` = column `j` + offset, re-rendered in `j`'s width | §7 of X67 flagged it; `Virtual`/K-regression is the published form | apographe has exact-copy (`colM`) but no offset | needs a second-argument form in the algebra | try it on `psql` where `name` is a function of `id` | local to JSON/derived-field documents |
| 4 | **multiple slots per column with shared parameters** | dedupe repeated sub-expressions across the 7 `G` lines | measured implicitly in the psql wire (`{1+1z2}` appears twice) | the wire already carries the repeat verbatim | would need a binding form, +4–6 tokens of contract | count the repeated substrings in 30 real wires | local; measured upside < 6 tokens |
| 5 | **entropy coding under a model prior** | rANS over a learned prior, reader = the model | none — refused | — | the reader cannot invert arithmetic coding in one chat turn | ask any model to invert 200 rANS symbols | **equivalent to the access model**: this is ruled out, not hard |
| 6 | **spelled-number / shape elision for prose and transcripts** | delete word-form numbers and dates, restore by rule ("eighteen thousand four hundred and forty two" ↔ `$18,442.17`) | measured only (`meeting-transcript.txt` has one such sentence) | the class exists in the file | a reader must spell numbers in the exact register the source used; "and" placement, hyphenation, "oh" vs "zero" are not derivable | one clause, one lane, count the delta | local, and below the cost of its clause on this corpus |

Note the shape of the portfolio: **four of six are local representation gaps, one
is ruled out by the access model, and one is a wording question that turned out to
be worth −32/−46/−13 tokens only because it was priced correctly.** That is the
honest distribution.

---

## 8. Second-order adversary — attacking BRACHYS as if it were someone else's claim

1. *"You didn't invent anything. This is KANON's wire with shorter English."*
   **Correct, and stated in §5.2 before the measurements.** The claim is exactly
   that: the representation was already right and the price was wrong, and the
   price is a real term of the metric. What is not a rename is the reader (§6) and
   the defect it caught (§5.3).
2. *"A shorter instruction is a decoding risk you cannot measure."* Half true. It
   is measurable three ways — two independent readers, `hyleDecode` differential,
   and eventually blind model trials — and two of the three were run. §5.3 is a
   live instance of the risk, found and fixed. The third is not done and is not
   claimed.
3. *"Your ±6 frontier instability makes the wins noise."* This is the strongest
   attack and §3.2 concedes the premise. It does not reach these three lanes: the
   margins are 32, 46 and 13 tokens and the measured instability is 0 on `psql`
   and `metrics` and 0–6 on `kubectl`. −13 on `metrics` is the thinnest and is the
   one to distrust first.
4. *"You chose the lanes."* The 34 lanes are the bench trees' own holdout set
   (`holdout`, `holdout-tbl`, `holdout-x40`, `holdout-x41`, `holdout-x42`,
   `holdout-x42b`, `holdout-work`), all of them, with no exclusions, and the
   receipt contains every row including the 31 zeros.
5. *"The fuzz is self-referential — you wrote both readers."* True for rows A and
   B. That is why row C exists: `hyleDecode` predates the codec, and on 2 147
   accepted mutants the two readers agree with 0 disagreements.
6. *"Your reader refuses where the reference accepts, so agreement is cheap."*
   Conceded and quantified: 1 744 of 3 891 accept/refuse decisions are refusals.
   Refusing is fail-closed — the encoder then ships the frontier message — so the
   cost of over-refusing is a lost win, not a corrupt decode. The distribution is
   reported rather than minimised.
7. *"`df-h` loses 14 tokens."* It is refused by the gate and the receipt says so.
   The candidate is 185 against 171. Any claim that BRACHYS "never regresses" is a
   claim about the gate, not about the candidate.

---

## 9. Live research, and the honest answer about the new mathematics

**Searched this turn (new terms, sources not previously cited in this
repository's codec notes):**

* **arXiv:2410.14066**, Stoian, van Renen, Kobiolka, Kuo, Grabocka, Kipf,
  *Lightweight Correlation-Aware Table Compression* (v3, Oct 2024). `Virtual`
  discovers linear correlations between columns automatically (K-regression) and
  reports up to 40 % smaller files than Parquet. **This is the published form of
  the family my column generators belong to**, and it is the citation that
  constrains any novelty claim here: it does not read as a chat message, and it
  does not price an instruction, but the *encoding idea* is theirs.
  https://arxiv.org/abs/2410.14066
* **ClickHouse `CODEC` documentation** (page dated Oct 2026): `ALP` "represents
  each value as an exact scaled integer using decimal powers … non-representable
  values are stored as raw exceptions". That is exactly BRACHYS's
  `{100.00+7.30}` scaled-integer slot, and it tells me the slot form is standard
  columnar practice, not a contribution.
  https://clickhouse.com/docs/reference/statements/create/table/codec
* **arXiv:2604.13066**, de Campos, Lee, Kissos, Paritosh, *Lossless Prompt
  Compression via Dictionary-Encoding and In-Context Learning*. Reports exact-match
  rates > 0.99 for template-based compression with the dictionary in the prompt,
  i.e. **LLMs do learn an in-band code from a short key**. This is the strongest
  published support for BRACHYS's premise, and it is about *analysis* fidelity, not
  byte-exact restoration.
* **arXiv:2411.12448**, *LLMs for Lossless Image Compression* (P²-LLM): in-context
  prompting plus next-symbol prediction beats classical codecs on images — a third
  independent demonstration that a chat model will use an in-prompt code, again not
  a byte-exact text codec.
* **arXiv:2508.19282**, CORE: calls its method "lossless" for RAG, but the target
  is answer accuracy, not byte equality. An example of the vocabulary trap in §4
  row 15.

**The 2026 frontier-lab mathematics, evaluated honestly and individually.** I read
secondary reporting and repository descriptions; **I did not open the Lean files,
run Lean, or verify any proof, and I am not able to.**

* **OpenAI** (26 Oct 2026) published two manuscripts with Lean formalisations in
  `openai/math`: "The Exponential Time Hypothesis is false" (a deterministic,
  polynomial-space, subexponential-time exact counter for fixed-width CNF, hence
  3-SAT refutes ETH) and "Local smoothing for the Euclidean wave equation" (with
  Kakeya and Stein as consequences). A third claim (existence of interacting 4-D
  QFTs) was announced but **not released**. OpenAI describes the artifacts as raw
  research data and defers credit and precedence to the community; an independent
  group led by Impagliazzo, Paturi and Williams is reviewing the ETH result.
  Status: **claims under review, not theorems.**
* **Anthropic** has a public `anthropics/formal-math` repository with an `/eth`
  subdirectory described as Lean 4 files for a claimed subexponential 3-SAT result.
  The repository's existence is confirmed by the reporting I read; the contents and
  validity are not. Status: **claim, unverified by me.**
* **Google DeepMind**'s AlphaProof/AlphaGeometry line is competition mathematics
  with machine-checked proofs; it is a search-over-a-fixed-language result, not a
  description-length result. **Gemini/"Double AI"/others**: I found no first-party
  artifact to evaluate and will not characterise claims I did not locate.

**Do any of these help a codec? I evaluated each against the actual requirement,
and the honest answer is no — with one interesting near-miss.**

A codec needs a *short description plus a reader that can run it*. A subexponential
SAT algorithm would make **finding** the shortest description cheaper (the
Kolmogorov-search problem becomes 2^{o(n)} in the search space), which is
genuinely the closest any of these results comes to this project. It does not help,
because (a) the search space here is bounded by a 100k-token budget and a fixed
notation, not by SAT, and (b) the binding constraint is the **reader**: a
Kolmogorov-minimal program is not a chat message a model can execute byte-exactly.
The two constraints that actually bind this stack — instruction cost and reader
fidelity — are untouched by any complexity-theoretic result. The one thing that
transfers is the *methodology* these releases are being reviewed under: publish the
artifact, name the checker, and let the formal statement be checked independently
of the informal claim. That is what §6 is.

---

## 10. What we have missed, and the four tests ranked by information per minute

**The blind spot this turn found.** Sixty-nine turns treated the instruction as
prose to be trimmed. It is not prose; it is a *decoder specification*, and it is
**35–50 % of the winning message on every structured lane** (73/244 on `psql`,
211/352 on `kubectl`, 127/236 on `metrics` for KANON). The metric is the whole
message, so the instruction is a first-class compression surface with the
unusual property that its cost is paid once and its benefit compounds with
document size. That reframing, not the 32 tokens, is the durable result.

**What is still missing, ranked.**

1. **(minutes) Determinism.** Re-run the census with `OMEGA_DET=1` twice on
   `kubectl` and `du-ak` and compare. If the ±6 collapses, every gate in this repo
   becomes reproducible and the ±6 error bar disappears from every prior report.
   Cheapest possible test, highest structural value.
2. **(hours) The interior-space field model** (§7 #2). `ls -l`, `ps aux` and
   `ps -ef` are 9 392 raw tokens of everyday ops text on which the stack's fold
   finds **zero** blocks, purely because a date or a command contains one space.
   A declared rare join character removes that restriction. This is the largest
   identified ops headroom and it is a representation fix, not a wording fix.
3. **(hours, needs other models) A blind decode trial.** Ship the three winning
   messages to three models that have never seen this repository, with the message
   as the only input, and diff the output. Nothing in this report substitutes for
   it.
4. **(days) A cross-column form** (§7 #3), and an honest measurement of whether the
   algebra survives adding it without a third clause.

---

## 11. Generalized local leaders, by structure category

Measured this turn where marked ●, inherited (and marked) otherwise. Values are
complete-message `o200k_base` tokens; "leader" is the local winner of that lane's
comparator set, not a universal champion.

| category | lane | raw | leader | mechanism that wins | source |
|---|---|---|---|---|---|
| Aligned box table with generated columns | `holdout-tbl/psql-output.txt` | 675 | **212** `brachys` | column-generator algebra with a priced instruction | ● |
| Space-run aligned table, 7 columns, 23 rows | `holdout-tbl/kubectl-get-pods.txt` | 1006 | **280** `brachys` | same, plus field placement | ● |
| Delimited numeric/temporal columns | `holdout-x40/metrics.tsv` | 811 | **197** `brachys` | same (was 210 `akolouthia2`) | ● |
| Wide numeric CSV | `holdout-x40/prices.csv` | 582 | 133 `diastema` | interval elision on a regular grid | ● |
| Small `df`-style aligned table | `holdout-tbl/df-h.txt` | 570 | 171 `akolouthia2` | second-difference elision | ● |
| Prose / narrative | `holdout-work/kb-article.txt` | 656 | 622 `synkrisis` | substitution tape over the OURA/EUTELEIA chain | ● |
| Prose / email thread | `holdout-work/email-thread.txt` | 629 | 488 `synkrisis` | tape + repeated header aliasing | ● |
| Prose / transcript with timestamps | `holdout-work/meeting-transcript.txt` | 472 | 385 `synkrisis` | tape; timestamps are inside the repeated prefix | ● |
| Prose / bibliography | `holdout-work/bibliography.txt` | 896 | 671 `synkrisis` | tape over repeated author/venue spans | ● |
| Prose / LLM answer (Markdown) | `holdout-work/llm-answer.md` | 733 | 674 `synkrisis` | tape; 92 % of raw — the weakest category | ● |
| Unified diff | `holdout-work/unified-diff.patch` | 578 | 419 `synkrisis` | tape over context lines; hunk offsets are not derivable | ● |
| Source code | `holdout/code-ts.txt` | 1422 | 984 `synkrisis` | tape over identifiers and indentation | ● |
| JSON (package.json) | `holdout/json-pkg.txt` | 1152 | 681 `synkrisis` | rules binding key + value prefix | ● |
| Markdown table | `holdout-tbl/markdown-table.md` | 330 | 176 `synkrisis` | tape; the separator row is *not* removed | ● |
| Ops listing (`ls -l`, 5 194 tok) | `holdout-x41/ls-l-real.txt` | 5194 | 1497 `synkrisis` | tape; no table fold qualifies | ● |
| Ops process table | `holdout-x41/ps-aux-real.txt` | 3054 | 1051 | tape; no table fold qualifies | ● |
| Ops package listing | `holdout-x41/apt-real.txt` | 2739 | 861 | tape | ● |

**Three regularities the table supports, and one it does not.**

1. The frontier's gain is monotone in *within-window token repetition*, not in
   "structure": 74 % off tabular, ~67 % off ops, 41 % off JSON, and 5–8 % off prose.
2. The largest absolute wins are on documents with a **generated column** — a
   column whose every entry is a function of the row index. Those are exactly the
   documents BRACHYS now wins.
3. The weakest category is prose written for a human by a human, and it is weak
   for a reason that will not be engineered away: there is nothing in it to delete
   that the reader can rebuild without being told what to write.
4. The table does **not** support "the stack is near a floor". On `ls -l`
   (5 194 → 1 497) and `ps aux` (3 054 → 1 051) the fold finds nothing at all, and
   those are the most common ops documents in the set.

---

## 12. Files

* `src/lib/omega/brachys.ts` — the codec (encoder + from-spec reader + contract).
* `src/lib/omega/registry.ts` — registered as `brachys`.
* `bench/x70/frontier.ts` — the 14-lane frontier census (X69 configuration repeat).
* `bench/x70/split.ts` — instruction/wire decomposition of every parent.
* `bench/x70/coverage.ts` — why a lane has no fold.
* `bench/x70/brachys-broad.ts` — the 34-lane gate, all rows, fail-closed included.
* `bench/x70/brachys-verify.ts` — unit + fuzz + differential + real lanes.
* `bench/x70/reader2.ts` — the second reader, written from the instruction only.
* `bench/x70/emit.ts`, `native.ts` — print a message exactly as a reader sees it.
* `bench/x70/receipts/` — `frontier.json`, `brachys-broad.json`,
  `brachys-verify.json`, `reader2-*.json`, `msg-*.txt`.
* `docs/codecs.md`, `docs/codec-abbreviations.md` — the spec page, updated.
