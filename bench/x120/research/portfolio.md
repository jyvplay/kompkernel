# X120 — mechanism portfolio, resolved

Companion to `protocol.md` (pre-registered). Every row below was **built and
run**, not argued. Each entry states the construction, the artifact that exists
on disk, what is actually proved, the interface that remains unresolved, the
cheapest experiment that could have falsified it, and the local-vs-global gap.

Runtimes actually available and used: Node v22.22.3 (esbuild → `/tmp` bundle via
`bench/x15/run.sh`), CPython 3.11.2, `npx tsc`, `node --cpu-prof`, git/gh. **No**
Lean/Coq/Z3, **no** model API, **no** brotli/zstd, 2 vCPU / 3.8 GiB. Nothing in
this file is a simulated or projected number.

---

## 1. ΒΕΛΤΙΣΤΟΣ — global shortest-path re-spelling (**SHIPPED**)

**Construction.** Nodes `(body position, emitted tail)`. Edges: emit one literal
character, or emit glyph `g` and advance `|value(g)|`. Weight
`T(ctx+piece) − T(ctx)` with the real `o200k_base` counter. Beam dedup by `ctx`;
a fixed ladder of `(context, beam)` rungs `[[24,8],[0,1],[32,16]]`, each priced as
a **complete message**. Stage 2 runs the same DP on each rule's own value using
only *earlier* glyphs (the wire grammar forbids forward references). Stage 3
deletes rules the new spelling no longer reaches, computing reachability through
the tape as well as the body.

**Artifact.** `src/lib/omega/veltistos.ts`; screens
`receipts/screen-shipped{,-lazy,-collapse,-2rung}.{json,jsonl,log}`; unit
`receipts/veltistos-unit.log` (16/16); attack `receipts/attack-lattice.json`.

**Proved / executed.** On every accepted candidate: contract prefix preserved
byte-for-byte, `chironDecode(candidate) === chironDecode(incumbent)`, and
`countTokens(candidate) < countTokens(incumbent)`. Optimal within the cost model
for the rung that produced it, beam permitting. Independent CPython reader agrees
on every win lane (`receipts/coldread.json`).

**Unresolved interface.** The cost model assumes no pre-tokenizer chunk reaches
back beyond `ctx`. A chunk longer than the window makes the DP *suboptimal*, never
wrong (the gate re-prices). Attack A1 feeds 300-character chunks and chunks
exactly at the window: all exact, all real wins.

**Cheapest falsification.** Price the DP's output with the real tokenizer and
compare to the incumbent — one `countTokens` call. That is exactly the admission
gate, so the mechanism cannot ship a loss.

**Shipped result.** Balanced A/B on all 29 lanes against the merged X118
configuration (`receipts/ab.json`): **12 270 → 12 133, Δ−137**, better 19 / worse
0 / same 10, exact 29/29, same-price hashes stable, wall **1.011×** / CPU
**1.015×**. Three lanes clear the >10-token bar: ps-aux-real −27, ls-l-real −16,
apt-real −14.

**Local vs global.** X119's local descent gets Δ−20 on the same wires; the global
parse with the exact state gets Δ−133 alone. Composition matters and was measured, not assumed
(`receipts/screen-order.json`): global→local **12 140**, local→global 12 145,
global alone 12 148, local alone 12 250. The shipped order is global→local.

**Prior art, honestly.** OptFSST (arXiv:2607.11271) already does DP over a fixed
symbol table; circuitpython#11369 already chooses per occurrence. The claim is
narrowed to the *conjunction*: context-carrying BPE-marginal state + complete-
message ladder + tape-side topological re-spelling with reachability pruning.

---

## 2. Dictionary induction on top of the global parse (**FALSIFIED**)

**Construction.** Propose new rules for repeated literal spans of the re-spelled
body (up to 6 per lane), price each by re-running the whole global parse.

**Artifact.** `receipts/screen-induct-*.json`, env `X120_INDUCT=6` (removed from
the shipped module).

**Result.** **0 admissions** on kb-article, email-thread, llm-answer, code-ts,
node-help. The dictionary is not the bottleneck on this corpus; the parse is.

**Unresolved interface.** Whether a *joint* table+parse search (NP-hard in
general, OptFSST §4) would pay. Not attempted: no admissible budget.

**Cheapest falsification.** Count admissions. Zero is decisive.

**Local vs global.** A rule can look profitable locally (it repeats) and still
lose globally because its glyph costs a key slot in the tape and perturbs merges.

---

## 3. ΒΑΘΥΣΥΝΕΔΡΙΑ — state-complete scoped nested replay (**FALSIFIED, REVERTED**)

**Construction.** Memoize nested DAEDALUS sub-encodes inside one council epoch.
v1 keyed by a work counter; v2 keyed by the *headroom lemma* (remaining budget +
exact input + arm), which is the state-complete key the X114 audit demanded.

**Artifact.** `receipts/speed-deep-headroom.json` (kept after the revert).

**Result.** v1: 2 hits, node-help ×0.939. v2: **0 hits on all six lanes**
(misses 15/15/40/40/40/17), TOTAL ×1.0620 with three regressions
(node-help ×0.917, dpkg-l ×0.913, findmnt ×0.879). `shaDiffering=0`.

**Why it fails.** Under a fresh epoch and a *varying* remaining budget, nested
keys essentially never repeat. The lemma was correct and the population was
empty — a correct cache with no hits is pure overhead.

**Reverted.** `daedalus.ts` restored from HEAD; the X120 block stripped from
`synedria.ts`; `git diff --stat` empty for both. Do not re-implement.

**Cheapest falsification.** Count hits before timing anything.

---

## 4. Scoped global ENGRAM (**MEASURED, NOT SHIPPABLE**)

**Construction.** Turn the existing global ENGRAM memo on for exactly one lane
at a time, cleared between runs — the most favourable possible population.

**Artifact.** `receipts/speed-engram.json`.

**Result.** TOTAL ×1.2723, `shaDiffering=0`, but dpkg-l **×0.930**, and the key
does not contain the remaining work budget, so a nested hit can return a result
computed under a different budget. Below the pre-registered 1.25× *aggregate*
bar only after the regression is counted, and unsound as a default. Not shipped.

**Cheapest falsification.** Per-lane speedup table, not just the total.

---

## 5. Node compression in the DP (**H∂ — OPT-IN ONLY**)

**Construction.** Collapse runs of positions that no rule can start at into one
node, so the DP visits fewer states.

**Artifact.** `receipts/screen-shipped-collapse.json`; flag
`OMEGA_VELTISTOS_COLLAPSE=1` (**default OFF**).

**Result.** 11 944 ms vs 18 380 ms, but Σ **12 154** vs **12 148**: node-help +2,
ps-aux +4. Faster and worse is not Pareto-superior, so the default stays
per-character and the flag is documented as a speed/quality trade.

**Local vs global.** Collapsing loses exactly the states whose *emitted tail*
differs — the same information the beam exists to keep.

---

## 6. Two-rung ladder (**H∂ — OPT-IN ONLY**)

**Construction.** Drop the `(32,16)` rung: `OMEGA_VELTISTOS_LADDER="24:8,0:1"`.

**Artifact.** `receipts/screen-shipped-2rung.json`.

**Result.** 6 461 ms (2.84× faster than the full ladder) for Σ **12 159** (Δ−111
instead of Δ−122), 17/29 lanes. A real, honest trade; not the default.

---

## 7. Line-boundary prefix reuse in `countTokens` (**FALSIFIED, REVERTED**)

**Construction.** `node --cpu-prof` put 26.5 % of samples in `countTokens` and
5.1 % in the o200k pre-tokenizer regex; `count-stats.json` showed 285 054
long-cache misses against 31 655 hits with the chunk cache already at 99.2 %.
Cache, for recent long strings, the positions `c` where `s[c−1] ∈ {\n,\r}` and
`s[c]` is a letter or digit, with the running token sum at each. Every alternative
of the o200k pattern forces a chunk boundary at such a `c`, so
`tokens(s) = tokens(s[..c)) + tokens(s[c..))` exactly.

**Artifacts (kept).** `receipts/speed-prefix-draft{1,2,3,4}.json`,
`receipts/prefix-verify.log` (the dual-compute audit of the era). The drivers
were removed with the mechanism.

**Four drafts, four honest outcomes.**
- draft 1 re-scanned the split to build the cut table: findmnt ×0.894. Worse, the
  enable flag was read at module load, so **both A/B arms ran ON** — the receipt
  is void as a comparison and survives only as evidence of the bug.
- draft 2 collected cuts inline and read the flag per call: TOTAL **×0.9377**,
  dpkg-l **×0.695** — 80 317 LCP attempts for 789 hits, and a 3 000-character LCP
  costs ~13 µs (measured), the same order as the work a reuse saves.
- draft 3 added a 128-code early rejection and 1-in-16 store sampling:
  TOTAL **×1.0533**.
- draft 4 added a worth-it gate (a reuse must cover ≥ half the query):
  TOTAL **×0.9855**. kb-article was **1.32–1.34× in every draft**; node-help,
  dpkg-l and findmnt were 0.86–0.89×. A lane with **zero** reuse activity moved
  **1.16×** between arms, which fixes the per-lane noise floor at roughly 15 %.

**Verdict.** Aggregate 0.94–1.05×, below the pre-registered 1.25× bar, with a
real but lane-family-conditional win. Then mechanism 9 removed the population it
was built for: with the exact chunk state the same lane makes ~15 000 long misses
instead of 285 054. **Reverted** rather than shipped as a flag — `bpe.ts` carries
only `tokenTail`. The identity itself was verified (420/420 boundary cases,
864/864 long reuse pairs, 15 831 dual-computed reuses, 0 mismatches); it is the
*economics* that failed, not the algebra.

**Cheapest falsification.** Per-lane wall table with a zero-activity control lane.
The control is what exposed the noise floor.

---

## 8. Composition order of the local and global passes (**SHIPPED**)

## 8. Composition order of the local and global passes (**SHIPPED**)

**Construction.** Run ΒΕΛΤΙΣΤΟΣ before ΔΙΓΛΩΣΣΙΑ instead of after.

**Artifact.** `receipts/screen-order.json`.

**Result.** With the shipped chunk state: Σ29 12 270 → **12 135** (global→local)
vs 12 136 (local→global) vs 12 137 (global alone) vs 12 250 (local alone), exact
on all 29. The global parse leaves a different and better set of local sites
behind it. No new operator, no new clause. (The window-state draft measured
12 140 / 12 145 / 12 148; both orders agree on which order wins.)

**Local vs global.** This row *is* the local-vs-global gap, measured: the same
two mechanisms in the two orders differ by 5 tokens.

---

## 9. Exact chunk state for the DP (**SHIPPED — the speed win**)

**Construction.** Replace the `(position, last 24/32 characters)` node by
`(position, tail(s))`, where `tail(s)` is the suffix of the emitted string
starting at its last non-whitespace pre-tokenizer chunk. `bpe.tokenTail` returns
`(total, tail, tailTokens)` with one regex pass and one memo entry, so an edge is
priced by a single lookup on `tail + piece` — typically 2–14 characters.

**Why this is the exact state.** Pre-tokenization is a left-to-right scan, so
appending cannot change a finished chunk. The exception is a trailing whitespace
run, which the greedy whitespace alternatives can re-partition and merge with
the whitespace chunk before it. Including the last non-whitespace chunk removes
the exception. The identity then holds for every appended string.

**The falsification that produced it.** The first version returned only the final
chunk. `bench/x120/tail-algebra.ts` checked
`tokens(s+p) = tokens(s) − tokens(tail(s)) + tokens(tail(s)+p)` against the
unaccelerated tokenizer on 104 976 adversarial triples and **failed 45**, all
whitespace tails, e.g. `s = "a\na\na\n "`, `p = "\n"`. After the correction:
**104 976/104 976 exact, 0 uncovered**.

**Artifact.** `src/lib/omega/bpe.ts` (`tokenTail`, `tailMemoStats`),
`src/lib/omega/veltistos.ts` (`shortestPathChunk`),
`receipts/tail-algebra.json`, `receipts/speed-state.json`,
`receipts/screen-shipped-chunkstate.json`.

**Measured.** Same 29 frozen wires, balanced arm order: window **12 148 tok /
18 511 ms**, chunk **12 137 tok / 2 617 ms** → **7.07× faster, 11 tokens better**,
4 lanes better, 2 worse, 0 inexact. Tail memo on findmnt: 227 978 hits / 56 293
misses. Against the X118 frontier the shipped screen is **12 270 → 12 137**
(19 wins, 0 worse, 0 inexact), and the full-chain balanced A/B is **12 270 →
12 133** at 1.011× wall / 1.015× CPU — the 7× state win pays for the extra pass,
so the token gain costs no measurable whole-stack time.

**Unresolved interface.** A chunk longer than the value cap, or a beam that pruned
the true optimum, can still make the path suboptimal. The tape-stage seed is also
still truncated to 32 characters, which can cut the last chunk of a long rule
value; removing that truncation would change the wire and is left for a turn that
can re-run the 34-minute balanced A/B. None of these can make the output wrong:
admission re-prices the whole message and re-decodes it.

**Local vs global.** The window draft was a *local* approximation of a *global*
state. Two lanes are worse under the exact state because the beam merges paths
differently; the aggregate is better and the gate keeps any lane from regressing
against the incumbent.

---

## 10. Wider beam in chunk mode (**FALSIFIED**)

`OMEGA_VELTISTOS_LADDER="24:8,0:1,32:16,32:32"` — a fourth rung at beam 32.
Artifact `receipts/screen-shipped-beam32.json`. Result: **identical 12 137**, same
19 wins, at roughly twice the edge count and wall time. The beam is not the
binding constraint once the state is exact. Not shipped.

---

## 11. Short-path threshold in `countTokens` (**FALSIFIED, REVERTED**)

The DP's 25–44-character window queries were one character over the hard-coded
24-character short-path threshold, so they paid a regex split instead of the
byte-index fast path. Routing them to the short path (`SHORT_MAX=48`) cut long
misses from 326 761 to 15 508 on node-help — and measured **×1.0403** over two
lanes, inside the noise floor, because `fastCount` runs the same regex. Reverted;
the threshold is 24 again. Mechanism 9 removed the query population instead.

---

## Second-order adversary (per shipped candidate)

`bench/x120/attack-lattice.ts` attacks ΒΕΛΤΙΣΤΟΣ with the failure modes its own
structure invites: chunks longer than the context window (A1), a key letter
smuggled into the payload through a `…` list item (A2 — the one reachable
collision path, and the reason the unit battery's fourth probe was rewritten),
overlapping and nested rule values (A3), forward-reference bait (A4), the modal
shortcut detector (A5: delete the tape from a winning message and require the
executable reader to fail — 25/25 fail, so the dictionary is load-bearing and
nothing is left to the reader's prior), source-argument independence (A6), and
the declared character cap (A7). Result: `silentWrong=0`, `claimedWinNotReal=0`,
`regressions=0`.

The chunk-state candidate's adversary is arithmetic rather than structural: the
104 976-case algebra probe is the attack, it is run against the unaccelerated
tokenizer rather than against the cache, and it already caught one real bug.
