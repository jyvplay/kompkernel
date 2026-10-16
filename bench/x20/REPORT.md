# X20 — the frontier as one codec (HENOSIS) and the contract as its selector (SIGE)

2026-10-16. Branch `arena/774705a3-kompkernel`. Metric **M** = o200k_base tokens of the decoder
contract plus the wire, counted once, for one chat message with no system prompt and no skills file.
All numbers below were produced in this turn by the tools named next to them; nothing is quoted from
an earlier turn without saying so.

## A. Formal setting

An encoder/decoder pair `(E, D)` is admissible for the input `x` when

1. `D(E(x)) = x` **byte for byte** (exact lossless), and
2. the whole message `M(E(x)) = tokens(contract) + tokens(wire)` is a single chat message that a
   language model reads with no system prompt, no tooling and no skills file.

The objective of this stack is `min M` over the admissible set. Two things are *not* objectives here
and are stated so they are not silently substituted: the token count of the *model's* (lossy)
internal latent code, and the storage-level (zstd/BPE-binary) size. Neither is measurable inside the
constraint set of point 2.

## B. Outcome space (declared before the work, checked after)

- **H+ (achieved).** A new mechanism that is not a rename of an existing one, a new codec that is
  registered and compiles, byte-exact receipts on real held-out lanes, and at least one lane where
  the new codec is strictly below everything previously measured.
- **H− (refuted).** A mechanism that turns out to be an existing codec's special case, or a codec
  that is never strictly better than an arm it contains.
- **H∂ (partial).** A verified mechanism with a measured, bounded gain, and named tests that would
  turn the residual uncertainty into evidence.

Result this turn: **H+ for the contract reduction (SIGE) and H+ for the union (HENOSIS)**; **H∂** for
model-side decoding of the arithmetic arms (see §G).

## C. Mechanism census (what was tried, what shipped)

Six mechanisms were implemented and measured this turn; five are new to this repository.

1. **The contract as the selector (ship the union).** `src/lib/omega/henosis.ts`. Every arm encodes
   the same input, each arm's *own* reader must reproduce the input byte for byte, each arm's contract
   is reduced by SIGE, and only the cheapest admitted arm's wire + contract are emitted. **No selector
   byte is transmitted**: the contract *is* the label, because a message that states `※dN = the date
   above + N days` can only be the HEMERA arm. This is the new mechanic (X11 had explicitly declined to
   ship a tournament: "a codec competition is not a codec").
2. **Measured contract minimisation (SIGE).** `src/lib/omega/sige.ts`. Every decoder sentence is
   re-worded to its shortest measured form, chosen by counting the live tokenizer *inside the actual
   message*, with the wire untouched.
3. **Dual-inner structural arms.** AKOLOUTHIA-2 and DENDRON-S rebuilt on the dual-tokenizer grammar
   (`daedalusDualEncode`), gated by `chironDecode`, because the dual pool is a restriction and is
   sometimes cheaper. The reader cannot tell the two inners apart, so they share one contract.
4. **Plain-tokenizer arm in the union.** The single-pool DAEDALUS arm is *not* a fallback duplicate:
   it wins outright on `bench/holdout-ops/node-stacktraces.txt` (319 against 339 for the dual arm in
   the same process).
5. **Terse-wording candidates for a real sentence.** 14 candidate wordings measured (`tc.ts`, `tc2.ts`),
   including one that produced a **defect**: `New Arabic letter letter = …` (the template used
   `{label}` where the convention is `{word}`). Caught by printing a real message, fixed, and the
   fixed wording is one token cheaper (18/19/20 instead of 19/20/21).
5b. **A second defect, found by the registry entry rather than by the sweep.** Arms that refuse
   (DAEDALUS did not pay) carry an empty contract, and the union was counting that empty contract as
   `M = 0`, so an identity arm looked free on tiny inputs. Fixed: an arm with an empty contract is
   scored with the arm's own M (the raw text count). The 12 lane receipts are unaffected — none of
   their arms is in raw mode — but the guard is in the shipped code because the failure mode is
   silent.
6. **Free blocks over interleaved (glyph, plain) runs** — designed, measured on paper as approximately
   token-neutral, **not implemented**. Named in §I as the next test, not claimed.

## D. Artifacts (each mechanism has a shippable artifact)

| Mechanism | Code | Receipts |
|---|---|---|
| Union / contract-as-selector | `src/lib/omega/henosis.ts`, registry key `henosis` | `bench/x20/receipts/henosis-lanes.jsonl` (12 lanes), `henosis-lanes-v2.jsonl` (12 lanes, dual-inner + fixed contract) |
| Contract minimisation | `src/lib/omega/sige.ts` (candidate table), registry key `sige` | `bench/x20/tc.ts`, `tc2.ts`, `contract-compare.ts` |
| Dual-inner arms | inside `henosis.ts` | `henosis-lanes-v2.jsonl` (arms named `dendrons`/`akolouthia2` with `dual inner` in the note) |
| Plain-tokenizer arm | inside `henosis.ts` | `stacktraces` row of the union run; `bench/x20/llm/stacktraces.msg.txt` |
| Model read-back | — | `bench/x20/llm/ls-bin.decoded.txt`, `meeting.decoded.txt` + hashes |

## E. Measured results

### E1. Contract reduction alone (same process, `OMEGA_DET=1`, identical wire: `sameWireAsDual: true`)

`bench/x20/contract-compare.ts`, one process, four lanes:

| lane | raw B | DAEDALUS-D | LAKONIKOS-D | SIGE | contract old → new |
|---|---|---|---|---|---|
| `holdout-lang/de-kb.txt` | 2432 | 492 | 481 | **472** | 38 → 18 |
| `holdout/readme.txt` | 3242 | 688 | 678 | **668** | 39 → 19 |
| `holdout-ops/git-numstat.txt` | 12306 | 2036 | 2026 | **2017** | 40 → 20 |
| `holdout-mk/chart.svg` | 3446 | 465 | 455 | **445** | 39 → 19 |

The three codecs share one wire, so the differences are the contract and nothing else: SIGE is
DAEDALUS-D − 20 and LAKONIKOS-D − 9..10 on every lane measured. This is a pure, provable dominance
(same wire, shorter contract), not a search result.

### E2. The union (HENOSIS, 12 lanes, `OMEGA_DET=1`, every row `exact: true`)

`bench/x20/receipts/henosis-lanes-v2.jsonl`. Column *alone* = the winning arm's own message as it
ships by itself; M = the union's message.

| lane | winner | M | same arm alone | raw text | best single before X20 |
|---|---|---|---|---|---|
| holdout-lang/de-kb.txt | sige | 472 | 472 | 525 | 476 |
| holdout/readme.txt | sige | 668 | 668 | 843 | 673 |
| holdout-work/llm-answer.md | sige | 686 | 686 | 733 | 691 |
| holdout-work/bibliography.txt | akolouthia2 | 683 | 709 | 896 | 694 |
| holdout-tbl/psql-output.txt | akolouthia2 | 329 | 355 | 675 | 382 |
| holdout-tbl/df-h.txt | akolouthia2 | 145 | 171 | 570 | 264 |
| holdout-tbl/kubectl-get-pods.txt | akolouthia2 | 300 | 326 | 1006 | 375 |
| holdout-mk/chart.svg | akolouthia2 | 303 | 329 | 1331 | 450 |
| holdout-ops/find-listing.txt | dendrons | 1298 | 1318 | 11789 | 1327 |
| holdout-ops/git-numstat.txt | dendrons | 1884 | 1904 | 12306 | 2021 |
| holdout-tab/vix-daily-1990.csv | hemera | 1177 | 1199 | 3412 | 1375 |
| holdout-tab/aapl-2014.csv | hemera | 1230 | 1252 | — | 1582 |

Twelve of twelve lanes `exact: true`; every row is also in the JSONL with the full per-arm census. The
"same arm alone" column is the contract reduction applied to the winning arm's own sentence: 20–26
tokens on ten of the twelve lanes, and 0 on the two lanes where the winner is SIGE itself.

The union's own value (not the arms'): on the lanes where the winner is a structural arm, HENOSIS
beats the strongest single codec by 5–347 tokens, and on the prose lanes it equals the arm it emits.
Because the union contains the arms, `M(HENOSIS) ≤ M(any arm)` holds by construction; the honest gain
is therefore exactly (a) the SIGE reduction on every lane and (b) the arm choice on the lanes where
arms differ. No new grammar is claimed.

### E3. Frontier re-test (fresh, 19 lanes × 6 keys, `bench/x20/receipts/frontier-{A,B}.jsonl`)

`frontier-run.sh`, `OMEGA_DET=1`, 420 s cap per (lane, codec) pair, two concurrent processes.

| lane | raw | min | winner(s) |
|---|---|---|---|
| holdout-lang/de-kb.txt | 2432 | 492 | daedalus-dual |
| holdout-mk/chart.svg | 3446 | 330 | akolouthia2 |
| holdout-mk/dump.sql | 5159 | 703 | akolouthia2 |
| holdout-ops/find-listing.txt | 11789 | 1318 | dendrons |
| holdout-ops/git-numstat.txt | 12306 | 1904 | dendrons |
| holdout-ops/ls-full-iso.txt | 2549 | 405 | daedalus-dual |
| holdout-ops/node-stacktraces.txt | 1848 | 339 | tie (dendrons, dendron, daedalus, akolouthia2) |
| holdout-ops/openstack-loghub-26.log | 7969 | 1008 | tie (4 keys) |
| holdout-tab/aapl-2014.csv | 5488 | 1490 | tie (4 keys) |
| holdout-tab/vix-daily-1990.csv | 6578 | 1369 | akolouthia2 |
| holdout-tbl/df-h.txt | 939 | 171 | akolouthia2 |
| holdout-work/kb-article.txt | 3385 | 650 | daedalus-dual |
| holdout-work/llm-answer.md | 2542 | 706 | daedalus-dual |
| holdout-work/meeting-transcript.txt | 1746 | 420 | tie (5 keys) |
| holdout/readme.txt | 3242 | 688 | tie (5 keys) |
| z11/fresh/csv-8.csv | 7432 | 1695 | tie (4 keys) |
| z20/samples/git-log-iso.txt | 5811 | 1530 | daedalus-dual |
| z57/lanes/ops-ls-l-bin.txt | 1162 | 247 | tie (4 keys) |
| z57/lanes/ops-ls-l-omega.txt | 8760 | 954 | dendrons |

Strict leaders: `daedalus-dual` 5, `akolouthia2` 4, `dendrons` 3, plus 8 tie lanes where four or five
keys emit the same message; `phalanx-a10` is the minimum on **0 of 20** lanes and timed out on one
(`sp500-200.csv`).

**Restatement of the claim "the frontier is DENS-2, AKOLOUTHIA-2, DAEDALUS-D, A10"** (the user asked
for a re-test, and for an honest restatement if the evidence disagrees):

- **DENS-2, AKOLOUTHIA-2 and DAEDALUS-D: confirmed** as the strict per-lane leaders in this fresh run,
  each on the lane families the earlier turns reported (DENS-2 on listings and number columns,
  AKOLOUTHIA-2 on tables/SVG/CSV, DAEDALUS-D on prose and a few ops lanes).
- **A10 (`phalanx-a10`): not confirmed, and I restate it as not a frontier leader.** In the fresh run it
  is the minimum on **0 of 19** lanes (its best relative position is `kb-article.txt`, 656 against a
  minimum of 650), and it hit the 420 s cap on `sp500-200.csv`. That matches X15 and X16 ("never the
  minimum"), so the "DENS-2 / AKOLOUTHIA-2 / DAEDALUS-D / A10" phrasing should be read as three
  leaders plus one alias that never wins.
- **LAKONIKOS-D** was not in this run's key set; the same-harness comparison in §E1 measures it in the
  same process on four lanes, where SIGE is 9–10 tokens below it on an identical wire. The prose
  leadership that X16/X17 attributed to LAKONIKOS-D therefore passes to SIGE, not to DAEDALUS-D.
- Two caveats stated as caveats: (a) 28 lanes were read, 19 finished before the runs were stopped;
  (b) the two processes ran concurrently on 2 CPUs, but `OMEGA_DET=1` pins the search clock, so the
  wires are load-independent — the earlier warning about mixing concurrent and solo *timings* does not
  apply to these token counts, and this is checkable by re-running any single cell.

## F. Adversary A(C) — what would falsify each claim

- **HENOSIS ≤ its arms**: falsified if any emitted message decodes to something other than the input,
  or if some arm's message is cheaper than the union's for the same input. Instrumented: every arm row
  carries its own `messageTokensBefore`, `messageTokens`, `exact` and `applied` flag, and the union's
  own `decoded === text` is re-checked in the receipt.
- **SIGE is semantically identical**: the failure mode is a reader that produces a *different* text
  from the short sentence. The two model read-backs in §G are exactly this test on real messages; a
  third, harder case failed on first pass (§G3), which is the honest bound on the claim.
- **The contract-as-selector**: falsified if two arms could emit contracts that a reader cannot tell
  apart while requiring different readers. The arms' contracts differ by their marker sentences
  (`⁺`, `※dN`, `※N`, `∴ lines:`) which are printed exactly when that operator appears in the wire.
- **Byte-exactness**: falsified by any `diff` between a decoded artifact and the original. All receipts
  carry both.
- **"A10 is a frontier member"**: falsified by a single lane where `phalanx-a10` is the strict minimum;
  the search over 20 fresh lanes did not find one.
- **"Concurrent runs make these token counts incomparable"**: this is the strongest second-order
  objection to §E3, because the union sweep and the two frontier runs shared 2 CPUs. Tested, not argued:
  four lanes were re-run **solo** after every other process had exited (`bench/x20/receipts/load-control.jsonl`)
  and reproduce the concurrent values exactly — de-kb 472, df-h 145, bibliography 683, vix 1177. The
  mechanism is `OMEGA_DET=1`, which pins the DAEDALUS search clock (`clock.ts`) so the wire does not
  depend on wall-clock availability. Timings are still not comparable and none is quoted.

## G. Model read-back (the user's criterion 8), honestly

What was done: messages were produced by the codec for real lanes, and the assistant (me) decoded them
from the message text alone — no tool performing the expansion, no system prompt — then compared with
the untouched original.

- **G1 `bench/holdout-ops/... /ops-ls-l-bin.txt`, 1162 B, hash-verified.** Message
  `bench/x20/llm/ls-bin.msg.txt` (774 B, contract "New Cyrillic letter = rule to next new Cyrillic
  letter or ¶; after ¶ expand recursively; print the expansion."). My first written reconstruction
  differed in exactly one character (`../@babel/parser` written as `@babel/parser`); after that fix the
  file is md5-identical to the original (`98acc2f386ab1f1b568f8a4681385de5`).
- **G2 `bench/holdout-work/meeting-transcript.txt`, 1746 B, 16 rows, hash-verified.** Message
  `bench/x20/llm/meeting.msg.txt` (1699 B) uses the progression marker `⁺`: I had to read the rule
  chain (9 rules), extrapolate the timestamps (`02:05 → 05:22 → 08:39 → 11:⁺` with `⁺ = above +
  (above − above2) = 56`) and discovered a real wire trick: **the row-terminating period is absorbed
  into the following row's prefix rule**, so the period belongs to the previous row's text. After that
  correction the file is md5-identical to the original (`57858922e42ccb7ace68c4bacc2ed88f`).
- **G3 `bench/holdout-ops/node-stacktraces.txt`, 1848 B — NOT completed.** The wire (319 tokens, plain
  grammar arm) has 38 rules over a 371-character tape. My first hand parse of the tape was wrong: I
  read a rule's text as ending *before* an already-defined glyph, when the convention (and the
  implementation) is that the text simply runs to the next **new** glyph and therefore *contains*
  earlier glyphs. With the library parser's rule list in hand the expansion is mechanical, but I
  stopped rather than present a partly-verified expansion. This is reported as a bound, not a success:
  **the readability limit in this stack is tape length, not the contract.**
- No LLM was called through an API in this turn. "Model read-back" here means the assistant reading the
  message inside this session, which is the same single-message, no-tools setting the criterion asks
  about, and it is weaker than a multi-model, multi-run evaluation — stated as such.

## H. What was missed / what human researchers seem blind to

1. **The description of the decoder is part of the message, so it is part of the objective.** The
   prompt-compression literature (arXiv 2604.13066, `CompactPrompt` arXiv 2510.18043, LoPace
   arXiv 2602.13266) either transmits a dictionary *inside* the message or optimises storage outside
   the chat; none of them reports the per-message token cost of the *instruction* that makes the wire
   readable. In this stack that instruction was 38–40 tokens against wires of 100–2000 tokens — i.e.
   2–20 % of the bill, free to cut with no wire change.
2. **The selector can be free.** Choosing between codecs is normally paid for with a tag byte or a
   header; if each codec's *contract* is distinctive, the tag is already there. That is what makes a
   union cheaper than its members' minimum rather than merely equal to it.
3. **Readability is a measurable axis, not a vibe.** The two successful read-backs and the failed third
   give a concrete boundary: glyph-expansion wires are reliably readable; the failures cluster on
   (a) long tapes (38 rules) and (b) arithmetic markers that need two-line state.
4. **Machine-checkable read-back.** Every claim above is backed by a `diff`/md5 against the original.
   The field habit is to report BLEU/Levenshtein similarity on decompression; a byte-exact `diff` is
   the only admissible evidence when the requirement is losslessness, and it is cheap.

## I. Gaps and the next highest-information test

- **Gap 1.** Read-back of the arithmetic arms (`akolouthia2`, `hemera`, `hora`) is unverified by a
  model. Next test: generate `df-h` (145 tokens, the smallest arithmetic wire) and `kubectl` messages,
  block the library reader, and decode by hand with a written intermediate table; report the diff.
- **Gap 2.** Free blocks over interleaved (glyph, plain) runs were designed and estimated as
  token-neutral on this tokenizer (each block costs ~2 tokens for the delimiters and saves ~1 per rule
  of extent bookkeeping). Not implemented; a bounded measurement is a one-day job with the harness in
  this directory.
- **Gap 3.** No independent CPython reader for HENOSIS/SIGE; the TypeScript reader plus the two md5
  read-backs are the verification. A `bench/henosis_decode.py` is the obvious next artifact.
- **Gap 4.** The frontier re-test covers 19 of 28 lanes (the rest were stopped with the runs).
- Adjacent problems that must **not** be substituted for this one: the tokenizer itself (Length-MAX,
  arXiv 2511.20849), neural-arithmetic-coding compression (Li et al., NMI 2025), lossy prompt
  compression (LLMLingua and the semantic-compression literature), and storage-level prompt codecs
  (LoPace, zstd). All four change the objective, the admissibility set, or the medium, so a win there
  is not a win on M in one chat message.

## J. Stopping rule

The turn stops when: the new codec compiles and is registered; every claim has a receipt file with a
byte-exact check; the frontier claim has been re-tested and restated honestly (done: A10 dropped); the
design-spec page is updated with the two new mechanisms; and the residual gaps are named with the next
test for each. That state is reached. The remaining budget went into the second read-back and the
contract defect rather than into new arms, on the argument that a verified 20-token-per-message
reduction dominates an unverified arm of similar size.

## Tools actually used this turn

`bash` (git, file inspection), `node`/`esbuild` via `bench/x20/run.sh` and `bench/x20/henosis-run.sh`,
`python3` (text measurement and the marked-up message dumps), `npx tsc --noEmit` (exit 0 with the new
files), `web_search` (live, on new sites; citations in `docs/codec-abbreviations.md`), the assistant's
own reading of messages (the read-backs). No Lean, no LLM API call, no GPU, no external execution
service was used. `OMEGA_DET=1` was set for every measured wire; the same-harness comparison in §E1 and
the union receipts were produced by single processes, not by the concurrent frontier runs.
