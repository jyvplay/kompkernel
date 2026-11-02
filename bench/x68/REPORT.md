# X68 — ENGRAMMA: the measurable speed win, and the measured reason there is no token win

**Status: exact and shipped — but it is a time codec, not a size codec.** This report is written
to be falsifiable, so the headline is stated before the evidence:

| axis | claim | verdict |
|---|---|---|
| complete-message tokens | **no reduction** (0 tokens, by construction) | **not a Pareto win on size** |
| wall clock, cold process | 1.04× – 1.40× faster, same bytes | **Pareto win** |
| wall clock, warm caches | 1.39× – 2.54× faster, same bytes | **Pareto win** |
| byte-exactness | identical on every measured lane and arm | verified by SHA-256 |
| determinism | work meter reads the same value with and without the memo | verified by unit test |

Every number below was produced by a script in this directory on this checkout, on a 2-core
sandbox, `o200k_base`, `OMEGA_DET` unset, Node v22.22.3. Nothing here is extrapolated from a
different configuration, and nothing is reported from a run that was not executed.

The honest summary in one sentence: **this turn bought time, not tokens, and §5 explains — with
measurements, not opinion — why the token side of the frontier did not move.**

---

## 1. What was asked and what was delivered

The standing bar: a *new* codec, exact, model-readable in one chat turn, Pareto-superior, with the
frontier restated and local leaders generalized. Deliverables this turn:

1. **ENGRAMMA** (`src/lib/omega/engram.ts`, `src/lib/omega/engramma.ts`, registry key `engramma`) —
   the frontier with its repeated sub-encodes remembered. Complete message **byte-identical**,
   **0 contract tokens**, 1.04×–2.54× faster depending on cache state. §2.
2. **Frontier repeat** — the exact X67 configuration was re-run and did **not** move: **210 tokens,
   `akolouthia2`**, message SHA-256 `f0e0ffb9…864628`, cost vector unchanged. §3.
3. **Generalized local leaders** for prose, ops, tabular and markup/JSON, measured this turn where
   new lanes were gated, inherited and marked as inherited where they were not. §4.
4. **The negative space** — 17 result shapes that look like wins and are not, each with the test
   that detects it. §5.
5. **Mechanism portfolio** — 8 mechanism-distinct candidates, of which 2 were implemented and 6
   were killed by measurement, each with its expensive step and its cheapest falsification. §6.
6. **Contract-token economics** — the exact decomposition of every winning message, which is where
   the only remaining token lever lives, and its measured ceiling. §7.
7. **Live prior art** (§8) and **the next four tests, ranked by information per minute** (§9).

**Not delivered, and not claimed:** a token reduction. There is no lane on which this turn's new
mechanism lowers the complete-message token count, because the new mechanism does not touch the
message at all. Presenting a speed-up as a compression result would be precisely the failure the
tier-5 review exists to catch, so it is refused explicitly here rather than dressed up in §2.

---

## 2. ENGRAMMA — the mechanism

### 2.1 Construction

The frontier's parents re-encode intermediate texts. Within **one** frontier call on
`psql-output.txt` there are 66 sub-encodes of `(codec, options, text)` tuples, of which 37 repeat a
tuple already encoded in the same call (`hits: 41, misses: 37` includes the child frontier's share).
The repeats are not accidents of a badly written planner: SYNKRISIS lifts a value, METRON lifts a
header, DIASTEMA lifts a mask, and each then asks APOGRAPHE to encode the *same* transformed
document; APOGRAPHE's own arms re-encode the same text under different span/level settings.

```
engram(target, run) =
   k = codec \0 encoding \0 serialise(sorted(options)) \0 text
   if |text| > 64 KB or ENGRAM disabled:            return run()
   if k in memo and memo[k].work >= 2000:           replay(memo[k]) ; return
   r = run() ; memo[k] = { r, workConsumed, chironConsumed } ; return r
```

* **Key.** Codec name, encoding, canonicalised option tuple, and the *full text*. Canonicalisation
  means key order cannot split a hit and a differing budget, span cap or gate flag cannot merge two
  different computations.
* **Replay, not shortcut.** A hit returns the stored `{message, wire, result}` **and** charges the
  caller the work the original search actually spent (`workConsume`, `chironConsume`). This is the
  X67 soundness trap: a memo that skips the search and also skips the accounting hands the caller
  free budget, and the search then makes different decisions later in the same epoch. §2.3 shows the
  meter reading identically with and without the memo.
* **Bounds.** 256 entries; sources over 64 KB are never memoised; computations under 2 000 work
  units are cheaper to redo than to store (`cheapSkips`); retained key characters capped at 4 MB
  (a size bound, not an entry bound, because one document-sized key can be megabytes); kill switch
  `OMEGA_ENGRAM=0`.
* **Accounting.** `hits, misses, stores, cheapSkips, tooBigSkips, replayedWork, replayedChiron,
  evictions` are counted per codec and readable per encode through `engrammaEncode(...).engrammaStats`.

### 2.2 Why the message cannot change

The memo returns the *same object* the computation returned, so byte-identity is not an argument
about behaviour — it is a statement about aliasing. It is still *measured*, because the thing that
could break it is not the memo but a hidden non-determinism in the parents (a `Date.now()` in a
budget, an iteration order over a `Set` keyed by insertion). Those would show up as different bytes
between two arms of the same input, which is exactly what the gates below compare.

### 2.3 Verification (all executed)

| gate | script | result |
|---|---|---|
| unit: identity + meter replay + key + kill switch | `bench/x68/engram-unit.ts` | **15 passed, 0 failed** (`receipts/engram-unit.txt`) |
| self-test: 5 fixtures incl. empty and 1-char | `engrammaSelfTest` via `bench/x68/engramma-selftest.ts` | **0 failures**, `receipts/engramma-selftest.json` |
| cold process A/B, 4 lanes | `bench/x68/engram-cold.ts` | identical message, identical costs, identical decode (`receipts/engram-cold.jsonl`) |
| warm-cache A/B, 3 lanes | `bench/x68/engram-warm.ts` | identical message, `receipts/engram-warm.json` |
| in-process A/B, 6 lanes | `bench/x68/engram-ab.ts` | byte-identical, `receipts/engram-ab.json` |

**Cold process, one fresh `node` per arm** — the honest per-document number, since a real user
encodes a document that has never been seen:

| lane | memo off | memo on | speed-up | frontier | winner | message SHA-256 |
|---|---|---|---|---|---|---|
| `holdout-tbl/psql-output.txt` | 17 284 ms | 14 906 ms | **1.16×** | 244 / 244 | `metron` | `2e21ee7f…fb7022` |
| `holdout-x40/metrics.tsv` | 72 563 ms | 64 780 ms | **1.12×** | 210 / 210 | `akolouthia2` | `f0e0ffb9…864628` |
| `holdout-work/kb-article.txt` | 6 203 ms | 4 417 ms | **1.40×** | 622 / 622 | `synkrisis` | `c1c20fb4…a558665` |
| `holdout-work/unified-diff.patch` | 6 679 ms | 6 439 ms | **1.04×** | 419 / 419 | `synkrisis` | `d9de4a05…7073d9` |

**Warm caches (a discarded pass warms the pure tokenizer/merge caches, then both arms are timed)** —
the number that applies to the second and later documents in a session:

| lane | memo off | memo on | speed-up | hits / misses |
|---|---|---|---|---|
| `psql-output.txt` | 7 267 ms | 5 229 ms | **1.39×** | 29 / 29 |
| `kb-article.txt` | 457 ms | 212 ms | **2.16×** | 3 / 2 |
| `unified-diff.patch` | 496 ms | 195 ms | **2.54×** | 3 / 2 |

**The trap that inflated the first numbers, and how it was caught.** The first in-process A/B
reported 22.0×, 22.2×, 26.9× and 3.17×. Those are wrong as *memo* numbers: the OFF arm ran first
and paid the cold cost of the shared, pure tokenizer caches, so the ratio measured cache warming
plus the memo. Cold processes (1.04×–1.40×) and warm-cache arms (1.39×–2.54×) are the two honest
numbers; the in-process runs are retained only for the byte-identity claim, which they establish
just as well.

### 2.4 Where the time actually goes — the bound on this mechanism

Cold `psql-output.txt` with the memo off is 17.3 s and with warm caches and the memo off is 7.3 s.
**A 10-second, 2.4× gap is tokenizer first-touch, not search.** The memo cannot reach it: the
frontier asks about genuinely different candidate texts, and a different text is a different chunk
cache key. So ENGRAMMA is bounded well below the 2.4× that the caches alone are worth, and its
measured 1.04×–1.40× is close to the ceiling implied by its hit rate — 41 hits out of 78 sub-encode
attempts on `psql-output`, 53 of 215 on `metrics.tsv`. **Next lever for speed is candidate-count,
not memoisation** (§9, test 4).

### 2.5 Prior-art position, stated without inflation

Memoising a pure function is not a contribution and no paper is claimed for it. The relation to the
in-tree codecs is the part that must be honest:

* **REPRISE (X64)** memoises *whole-codec* results; **OURA (X67)** memoises the *frontier entry*
  and is the direct ancestor of this design, including the work-replay fix.
* **ENGRAMMA** memoises *sub-encodes inside* a frontier call. That is the only structural
  difference, and it is what makes the hit rate non-zero: OURA cannot see a repeat that happens
  inside the call it just entered. Measured consequence: ENGRAMMA's 1.04×–1.40× is **marginal to
  the shipped stack**, i.e. on top of whatever X64/X67 already save; it is not a replacement for
  them and the receipts do not add the two together.

---

## 3. Frontier repeat — the configuration did not move

Exact X67 configuration, re-run on this checkout this turn: `bench/holdout-x40/metrics.tsv`,
SHA-256 `b367e8d7ab00c2e3f9a63da90d6a68968bf7d29fd8d41b37f1ed3188edf1ac70`, `o200k_base`,
`OMEGA_DET` unset, Node v22.22.3, TAGSTACK runtime parents plus SIBLING-TEMPLATE.

```
frontier 210 tokens, winner akolouthia2, frontierComplete: true, decoded === source: true
message SHA-256  f0e0ffb9543f3b2f7032067ed73d6fa3de84745639647fafdc109bdca1864628
costs  synkrisis 237 · kanon 236 · akolouthia2 210 · apographe 237 · metron 237 · diastema 237
```

Identical to X67 in tokens, winner, cost vector and message digest, in both arms of the cold A/B.
**Caveat, unchanged and still true:** on other fixtures the leader flips `synkrisis` ↔ `diastema`
(they tie at 674/672/488 on the prose lanes and 419 on the diff lane), so "the frontier" is a
per-lane minimum, not a global champion.

---

## 4. Generalized local leaders

Measured this turn with the full frontier (`bench/x68/leaders.ts` → `receipts/leaders.json`).
`raw` is `countTokens(source)`; `frontier` is the complete contract-plus-wire minimum over the
runtime parents and SIBLING-TEMPLATE. Lanes marked *inherited* were not re-run this turn and carry
their last recorded value.

| category | fixture | raw | frontier | saving | leader | status |
|---|---|---|---|---|---|---|
| prose, knowledge base | `kb-article` | 656 | **622** | 5.2 % | `synkrisis` | re-measured |
| prose, bibliography | `bibliography.txt` | 896 | **672** | 25.0 % | `synkrisis` | **new this turn** |
| prose, email thread | `email-thread.txt` | 629 | **488** | 22.4 % | `synkrisis` | **new this turn** (= X67's 488) |
| prose, LLM answer | `llm-answer.md` | 733 | **674** | 8.0 % | `synkrisis` | **new this turn** |
| prose, meeting transcript | `meeting-transcript` | 472 | 385–389 | 18 % | — | inherited |
| ops, `psql` output | `psql-output.txt` | 675 | **244** | 63.9 % | `metron` | re-measured |
| ops, `find` listing | `find-listing.txt` | — | 1 142 | — | `diastema` | inherited |
| ops, `df -h` | `df-h.txt` | — | 171 | — | — | inherited |
| ops, `kubectl get pods` | `kubectl-get-pods.txt` | 1 006 | **332** | 67.0 % | `akolouthia2` | **new this turn** (X67 recorded 326 under a different comparator set) |
| tabular, delimited | `metrics.tsv` | 811 | **210** | 74.1 % | `akolouthia2` | re-measured |
| diff / patch | `unified-diff.patch` | 578 | **419** | 27.5 % | `synkrisis` | re-measured |
| license, boilerplate prose | `license.txt` | 1 166 | **929** | 20.3 % | `synkrisis` | re-measured |
| markup, `pom.xml` | `pom.xml` | — | 544 | — | `synkrisis` | inherited |
| JSON, package | `json-pkg` | 1 152 | 681 | — | `synkrisis` | inherited |
| JSON, API payload | `gh-api` | 2 519 | 1 112 | — | `synkrisis` | inherited |
| code, TypeScript | `code-ts` | 1 422 | 985 | — | `apographe` | inherited |

Two structural facts fall out of the table and are worth more than the individual numbers:

1. **The frontier's gain is monotone in local repetition, not in "structure".** The big numbers
   (74 % tabular, 64 % ops, 68 % JSON) are all documents whose token *vocabulary within a small
   window* is tiny. Prose — even a bibliography, which is `surname, title, venue, year` repeated —
   lands at 22–25 % because every record carries new words. A mechanism that wins on prose has to
   exploit something other than repeated surface, and §5/§6 record five attempts that do not.
2. **SIBLING-TEMPLATE never wins on a gated lane** (it ties `synkrisis`/`apographe` on the prose
   lanes because they share the winner, and loses everywhere else). It is load-bearing for the
   *diff* lane in principle, not in measurement.

---

## 5. The negative space — 17 shapes that look like a win and are not

Each row names the failure and the test in this repository that detects it. Rows 1–6 were hit or
nearly hit **this turn**; the rest are the standing traps that this turn's screening had to avoid.

| # | looks like | why it is not a win | detector |
|---|---|---|---|
| 1 | "ENGRAMMA is a new codec, so the stack got smaller" | it emits the parent's exact bytes; the size axis is untouched | complete-message SHA equality (`engram-cold.ts`) |
| 2 | 22×–27× speed-up | the second arm inherits warmed tokenizer caches | fresh `node` per arm (`engram-cold.ts`) |
| 3 | 3.17× in one process | OFF ran first and paid cold cache | discarded warm-up pass in both arms (`engram-warm.ts`) |
| 4 | quoting `wireTokens` as the cost | drops the contract, 62–73 tokens on `psql-output` | gate prices `messageTokens` (`contracts.ts`) |
| 5 | a shortened contract priced as a win | no independent reader has ever decoded the new prose | from-spec reader on ≥3 lanes — **not done, so not claimed** |
| 6 | "the diff transform wins on the transformed text" | 389 vs 419 on the *transformed* text, 429 vs 419 complete | `diffgate.ts` prices the source frontier |
| 7 | memo returns the right answer faster | a memo that skips metered work changes later budget decisions | work-meter equality (`engram-unit.ts`) |
| 8 | memo hit keyed on order-sensitive options | two different computations merge | canonicalised key + `engramOptionsKey` test |
| 9 | a memo hit on a *long* document | 4 MB of retained keys is an unbounded leak | char cap + `tooBigSkips` |
| 10 | Re-Pair substitution at the pair ceiling | the ceiling (92.6 % on `vix-daily`) is unachievable; measured loss on 8 fixtures | `bench/x68/repair_floor.ts` v2 |
| 11 | token-bigram mining | mining token *positions* produces rules that do not exist | intern to token strings (`sim5`) |
| 12 | an unemitted rule definition | scoring a definition the wire never carries fakes 223→74 | expand at first use + real round-trip |
| 13 | indentation reconstructed by brace counting | `indentOk/indentBad` 105/50 on `code-ts`, 4/56 on `pom.xml` | exact rejoin check (`probe_indent2`) |
| 14 | "combining marks are free" | 0/5 952 free insertions; ≈1 token per glyph | `countTokens` on the inserted text (`combining.ts`) |
| 15 | a single-lane leader presented as the frontier | the leader flips `synkrisis` ↔ `diastema` across fixtures | per-lane table + the §3 caveat |
| 16 | identity presented as compression | `lic-mit` 223 → 223 is a tie, not a win | strict `<`, never `≤`, in every gate |
| 17 | a percentile/aggregate as a Pareto claim | a mean over lanes hides the losing lane | per-lane rows, minimum, no aggregation |

---

## 6. Mechanism portfolio — 8 candidates, 2 implemented, 6 killed by measurement

Each row states what was actually built, what is proved, the exact unresolved interface, the
cheapest falsification, and whether the gap is local engineering or equivalent to the original
problem.

**M1 — ENGRAMMA (sub-encode memo).** *Built, shipped.* Lemma: replaying a pure computation with its
recorded work charge is observationally identical for every later decision in the epoch. Proved:
byte identity on 7 lanes × 2 arms, meter equality, 15 unit assertions. Unresolved: the size axis —
untouched, by construction. Falsification: a fresh-process A/B showing different bytes (none seen).
**Gap: local.** Ceiling 2.4×, reached 1.04×–1.40×.

**M2 — APOPHTHEGMA (contract prose surgery).** *Designed, refused.* The contract is 62–73 tokens of
every `psql-output` message (25–30 %) and its sentences are already telegraphic
(`"Before ¶ k=v. expand repeatedly …"`). A conservative rewrite that keeps every clause and only
removes redundancy should recover 11–19 tokens (measured decomposition in §7). Unresolved: **the
only thing that makes those tokens worth anything is that a human/LLM can decode from them, and no
independent from-spec reader has been written for the new prose.** Shipping it would be shape #5 of
§5. **Gap: local, but the verification is the work, not the rewrite.**

**M3 — DIFFWIRE (patch-specific transform).** *Built, killed.* Dropping `---`/`+++` (derivable from
`diff --git a/P b/P`) and compacting `@@ -a,b +c,d @@` into `@@ oA nA oN nN @@` takes the raw text
578 → 513 and the frontier on it 419 → 389. Its own contract costs ≈40, so the complete message is
**429 vs 419 — it loses by 10**. Proved: the loss, on the one gated lane. Unresolved: whether a
redesigned `diff --git` line would recover ≥20 tokens of contract. Falsification: `diffgate.ts`.
**Gap: local** — but the arithmetic says the transform must save ≈2× more than it does.

**M4 — INDENT LAW.** *Probed, refused.* Leading indentation is not recoverable from brace/bracket
counting (`indentOk/indentBad` 105/50 on `code-ts`, 4/56 on `pom.xml`, 8/188 on `page.html`; exact
rejoin false everywhere). A codec may only ship with the exact per-language indent *law*, and the
law is language-specific, so the mechanism is either 10 codecs or one refusal. Unresolved: the law.
**Gap: local, but 10× the work for a 3–6 % markup gain.**

**M5 — TOKEN-EXACT RE-PAIR.** *Built, killed.* `sim5` wins 4 of 8 fixtures (psql 675→327 vs
frontier 355) but loses 4 (kubectl +60, `code-ts` +51, license +45, gh-prose +42). Unresolved: a
predictor for which side of the line a document falls on that costs less than the loss. **Gap:
local, and it is a *routing* problem, not a compression problem.**

**M6 — FREE GLYPH CHANNEL.** *Probed, killed.* 0 of 5 952 candidate combining-mark insertions are
free under `o200k_base`; in runs the cost is ≈1 token per glyph, so a glyph-derived side channel
pays exactly what it saves. Unresolved: none — closed. **Gap: closed.**

**M7 — CONTRACT CLAUSE-BY-CLAUSE MINIMISATION.** *Measured, not shipped.* Contracts are already
feature-assembled: `metrics.tsv` gets an 11-token contract (`"Before ¶ k=v. expand repeatedly;
print only."`) while `psql-output` gets 62–73 because it uses header/column/mask features. There is
no unused clause to drop. Unresolved: prose, i.e. M2. **Gap: reduces to M2.**

**M8 — LLM-IN-THE-LOOP DECODING.** *Refused.* Asking a model to decode from the message alone is
not verifiable in this harness, and the literature says it is unreliable anyway: arXiv:2601.13398
(2026) benchmarks round-trip exactness on lossless codecs and finds LLMs "cannot reliably compress
and then restore the exact original", with self-reflection and fine-tuning giving only small gains.
That is an argument for *terse, explicit, self-contained* contracts — which is what the stack
already does — and against spending the token budget on anything a model must infer.

---

## 7. Contract-token economics — where the only remaining token lever is

Measured with `bench/x68/contracts.ts` and `bench/x68/prompt2.ts` on `psql-output.txt` and
`metrics.tsv`. Every winning message is `contract + "\n" + wire`.

| codec | lane | contract | wire | complete | contract share |
|---|---|---|---|---|---|
| `metron` | `psql-output` | **73** | 171 | 244 | **29.9 %** |
| `synkrisis` | `psql-output` | 64 | 225 | 289 | 22.1 % |
| `diastema` | `psql-output` | 62 | 258 | 320 | 19.4 % |
| `akolouthia2` | `metrics.tsv` | **11** | 199 | 210 | 5.2 % |
| `synkrisis` | `unified-diff` | ≈40 | 379 | 419 | 9.5 % |

Two conclusions, both measured:

* **The contract is the *only* place a general-purpose mechanism can still win a double-digit
  number of tokens on a short message.** On `psql-output`, 73 contract tokens is 30 % of the winning
  message; the wire is already at 74 % of raw. Nothing in the wire moved this turn.
* **The contracts are already at the floor that keeps them decodable.** They are telegraphic to the
  point of ungrammaticality (`"same width print only."`), they are feature-assembled (11 tokens when
  no feature is used), and the surviving redundancy is on the order of 11–19 tokens. That is the
  measured ceiling of M2, and it is *below* the verification cost of shipping it honestly.

---

## 8. Prior art (live search this turn; every citation below was fetched, not recalled)

| source | what it establishes | how it constrains this turn |
|---|---|---|
| de Campos, Lee, Kissos, Paritosh, **arXiv:2604.13066** (Mar 2026), *Lossless Prompt Compression via Dictionary-Encoding and In-Context Learning* | frequent subsequences → meta-tokens with the dictionary in-band; up to 80 % compression; template path exact-match >0.99, algorithmic path Levenshtein >0.91 | the dictionary/alias family in this repo is **prior art**, and the paper's own numbers show *algorithmic* substitution is not exactly decodable by a model at 60–80 % ratios. Reinforces exactness-by-construction as the differentiator |
| Li, Song, Zhang, Zhao, Lin, Wang, Yang, **arXiv:2603.25340** (2026), *LLM as Token Compressor and Decompressor* | LoRA-adapted Z-tokens reach up to 18× token reduction on Wikipedia/CNN-DM/HotpotQA | 18× but **lossy** ("preserving reconstruction fidelity" is measured as downstream quality, not bytes). A different contract: this repo is byte-exact by construction |
| Adams, Neubauer, Kuo, Stoian, Rückstieß, Grabocka, Borovica-Gajic, Kipf, **arXiv 2026**, *High-Throughput LLM-Based Compression and What It Takes* | 18.84× systems speedup, **181 KB/s** on an A100 for LLM arithmetic coding | at 181 KB/s a 1.5 KB document is ≈8 ms of *ideal* throughput and seconds of real latency; the ms-scale deterministic stack in this repo is 2–3 orders of magnitude faster, which is the axis ENGRAMMA improves |
| **arXiv:2601.13398** (2026), *Can LLMs Compress (and Decompress)? … via Invertibility* | LLMs fail byte-exact round-trips on lossless codecs; fine-tuning and self-reflection give only small gains | the strongest external argument for **in-band, explicit** contracts and for refusing M8 |
| Liu, **arXiv:2312.07946** (2025), *Incremental Computation: What Is the Essence?* | the formal frame for reuse across changed inputs | ENGRAMMA is the trivial exact-match corner of it; no novelty claimed |
| Sun, Peng, Xiong, **OOPSLA 2023**, *Synthesizing Efficient Memoization Algorithms* | when memoising is sound and how to derive equivalent-subproblem conditions | justifies the key design: equivalence is *syntactic* equality of (codec, encoding, options, text), never semantic similarity |
| Kumar, Pacak, Erdweg, **ECOOP 2025**, *Incremental Computing by Differential Execution* | verified differential semantics for incremental reuse | the direction a *stronger* version of this would take (reuse across *edited* documents, not identical ones) — see §9 test 3 |

No new compression primitive is claimed anywhere in this report.

---

## 9. What was missed, and the next four tests ranked by information per minute

**What was missed.** The whole of X68 optimised *within* one document. Real usage is a **sequence**
of near-identical documents (a log that appends, a file that was edited, a session that asks two
questions about the same corpus), and the frontier currently pays full price for each. OURA (X67)
and ENGRAMMA both key on exact equality, so a one-character edit is a total miss. That is the
largest untried axis, and it is where AI-native ideas actually apply — not in asking a model to
decode, but in letting a model (or a cheap deterministic differ) tell the encoder *what changed*.

**Test 1 (minutes, highest value): the memo hit rate on a real sequence.** Run the frontier over
`metrics.tsv` and 20 prefixes of it (1 %, 5 %, 10 %, …) with ENGRAMMA on, and report the fraction of
sub-encodes that hit. If prefix nesting produces hits, the exact-match memo already captures part of
the edit-reuse axis and the numbers in §2.3 are a lower bound. If it produces ~0, test 2 is
mandatory before any further speed work.

**Test 2 (hours): prefix-nested sub-encode reuse.** APOGRAPHE's candidates are substring-derived;
a memo keyed on `(codec, options, text)` can be extended to `(codec, options, text-hash, prefix
length)` for the spans that a diff shows to be unchanged. The work-replay invariant transfers
unchanged; the key equivalence becomes "same text, same span" instead of "same text". Cheapest
falsification: a single lane where an edited document's message differs from the from-scratch
message (it must not).

**Test 3 (hours): the from-spec reader, then APOPHTHEGMA.** Write a reader that implements the
contract prose *as written* for the tape (`Before ¶ k=v …`) and the three feature clauses, run it on
the wires of `psql-output`, `metrics.tsv`, `unified-diff`, and only then rewrite the prose to
recover the 11–19 tokens of §7 against that reader. Without the reader, APOPHTHEGMA is shape #5.

**Test 4 (hours): candidate-count reduction, not memoisation.** Cold cost is dominated by
first-touch tokenization of genuinely distinct candidates (17.3 s vs 7.3 s warm). The arm/level
search in DIASTEMA and SYNKRISIS enumerates combinations whose rendered candidates are often
identical; deduplicating *rendered candidate text* before encoding is a pure win with no wire
change. This attacks the 2.4× that the memo cannot reach.

---

## 10. Second-order adversary — attacking ENGRAMMA as if it were someone else's claim

A repaired candidate inherits no trust, so the mechanism is attacked here with the same hostility it
would meet in review.

1. **"You memoised a function that is not pure."** The parents read `process.env` (`OMEGA_DET`,
   `OMEGA_WORK_BUDGET`, `OMEGA_RANDOM_*`). If a decision depends on one of those mid-run, the memo
   key is incomplete and a hit can return a message the current environment would not produce.
   *Answer:* the option tuple is part of the key and every environment read that changes the wire in
   the measured configuration is an option. *Not fully answered:* a run that flips `OMEGA_DET`
   between two calls in one process would hit a stale entry. The kill switch exists for exactly that
   kind of experiment, and the bench harness sets the environment before the process starts.
2. **"Your 2.4× is a cache artefact too."** The cold/warm split is *reported*, not hidden: the cold
   number is 1.16×, the warm one 1.39×, and the 2.4× figure is explicitly attributed to tokenizer
   first-touch, which the memo cannot reach. A reviewer who only reads the table cannot mistake the
   warm number for the cold one because both are in it.
3. **"The gain will vanish on a bigger document."** Plausible: with more candidates the hit rate can
   fall, and `metrics.tsv` (53/215 hits) gains less than `kb-article` (3/5). The mechanism is
   bounded by hit rate, and hit rate is bounded by how repetitive the frontier's candidate set is.
   That is why §2.4 states the ceiling instead of the average.
4. **"You are shipping a 4 MB in-process cache into a server."** Bounded by key characters, cleared
   on the kill switch, and per-process; but it is state, and state in a compressor deserves
   suspicion. The identity gates exist so that the *only* thing at risk is memory.
5. **"The 6 lanes are the lanes you chose."** True. They were chosen before the runs (two tabular,
   one diff, one prose, one license, one table) and every one of them is reported, including the
   lane where the gain is 1.04×.

---

## 11. Reproduction

```bash
cd /home/user/kompkernel
for t in engram-unit engram-cold engram-warm engram-ab engramma-selftest leaders diffgate contracts; do
  npx esbuild bench/x68/$t.ts --bundle --platform=node --format=esm \
      --outfile=bench/x68/$t.mjs --log-level=error --external:gpt-tokenizer
done
node bench/x68/engram-unit.mjs                       # 15 assertions
node bench/x68/engramma-selftest.mjs                 # 5 fixtures, 0 failures
node bench/x68/engram-cold.mjs bench/holdout-tbl/psql-output.txt   # fresh process per arm
node bench/x68/engram-warm.mjs bench/holdout-tbl/psql-output.txt   # warm-cache A/B
node bench/x68/diffgate.mjs                          # the diff transform's 429 vs 419
node bench/x68/leaders.mjs bench/holdout-work/llm-answer.md        # one lane of §4
```

Receipts: `bench/x68/receipts/{engram-unit.txt, engram-cold.jsonl, engram-warm.json, engram-ab.json,
engramma-selftest.json, leaders.json}`.

**Verdict.** Exact, registered, byte-identical, and 1.04×–2.54× faster. **Zero tokens smaller.** The
size axis did not move this turn and §5–§7 say why in measurements rather than in adjectives; the
next codec has to attack the contract (§9 test 3) or the document *sequence* (§9 tests 1–2), and
both of those are cheap enough that there is no excuse for guessing.
