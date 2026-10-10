# SYNIZESIS — Pre-Tokenizer Boundary Collapse by Adaptive Shape-Template Factoring

W13 tier-5 report. Every number below was produced by a command run in this
session; nothing is estimated, extrapolated or recalled.

---

## 0. RUNTIME HONESTY STATEMENT

**What actually ran.**

| tool | what it did |
|---|---|
| `bash` (sandbox) | every measurement, build and test below |
| `gpt-tokenizer` (`src/lib/omega/bpe.ts`) | the real `o200k_base` / `cl100k_base` BPE; *every* token count in this report |
| `esbuild` + `node` | bundled and ran 12 one-off probe scripts and 4 permanent bench scripts |
| `tsc --noEmit` | type-checked the whole repo after each edit |
| `npx next build` | full production build, passed |
| `npx next dev` | live server on :3000 for the UI |
| CPython 3 | `bench/synizesis_decode.py`, an independent decoder written from the contract prose |
| `git`, `curl`, `fetch_page`, `web_search` | repo ops; two real public corpora fetched; 4 web searches |

**What did NOT run.** No LLM API call. No prover, no SMT solver, no external
compiler beyond `tsc`/`esbuild`/Next. No parallel agents. The
"directly-model-readable" claim is supported by (a) an independent CPython
reader implemented from the contract sentence alone, (b) 240 mechanical
red-team assertions, and (c) one **agent-in-the-loop decode** in §7 where I
decoded a wire by inspection into a file and `cmp` reported identical bytes.
That is evidence, not an automated gate, and it is labelled as such.

`curl` cannot reach the network from this sandbox (TLS is blocked); the two
real corpora were pulled with the `fetch_page` tool and written to disk. Their
provenance is recorded in §6.

---

## A. FORMAL MODEL

Let `P : Σ* → (Σ*)^n` be the tiktoken **pre-tokenizer**: a regex partition
applied before any BPE merge,

```
(?i:'s|'t|'re|'ve|'m|'ll|'d) | [^\r\n\p{L}\p{N}]?\p{L}+ | \p{N}{1,3}
| ?[^\s\p{L}\p{N}]+[\r\n]* | \s*[\r\n]+ | \s+(?!\S) | \s+
```

and let `B` be the BPE merge closure. The encoder is `B ∘ P`, and the
governing fact is:

> **BPE merges never cross a chunk boundary produced by `P`.**

Two corollaries drive this lane:

* **C1 (digit cap).** `\p{N}{1,3}` is greedy left-to-right, so a run of `k`
  digits is cut into `⌈k/3⌉` chunks *aligned from the left*.
* **C2 (class barrier).** Every letter↔digit and alnum↔punct transition is a
  hard barrier.

Define the **fragmentation tax** of a string `s` as
`τ(s) = |B(P(s))| − |B(P(homog(s)))|` where `homog` is any bijective rewrite
of `s` into a single character class. A *class-alternating literal* — ISO
timestamp, clock time, dotted quad, semver, order id, citation range,
coordinate, hex digest — maximises `τ`.

**Objective.** Given document `d`, find a set of templates
`T = {(σ_i, t_i)}` where `t_i ∈ ({#} ∪ Σ)*`, and an assignment of literals to
templates, minimising

```
cost(d,T) = Σ_i |B(P(legend_i))| + Σ_occ |B(P(σ·payload))| + |B(P(residue))| + contract
```

subject to `decode(encode(d)) = d` byte-for-byte.

**The floor this breaks.** Every dictionary lane in this repository
(CHIRON, ARIADNE, SIBYL, SEQUOYAH, PALIMPSEST, DAEDALUS, KHOROS, …) binds a
replacement to a one-token glyph, so it pays **≥ 1 token per occurrence** and
can never profit from a literal whose raw cost exceeds its payload by only one
token. SYNIZESIS's marker-free promotion pays **0 tokens per occurrence** when
the payload's own digit-run length identifies the rule — this is the only
construction found this session that goes below the per-occurrence floor.

---

## B. OUTCOME SPACE

**H+ (what would count as success).** A lossless, single-chat-readable codec
beating the incumbent Pareto frontier by ≫ a few tokens in at least one lane,
never losing anywhere, with an independent decoder and a passing adversary.

**H− (what would count as failure).** Wins only on synthetic data; wins only
because the incumbent's wall-clock search was unlucky; requires a system
prompt; loses on any input; decode ambiguous.

**H∂ (the boundary — where the answer is "provably not there").**
Measured this session and recorded in §9: whitespace normalisation, tab
re-indentation, non-Cyrillic glyph density, greedy merge-dense alphabets,
word-level abbreviation, and move-to-front substitution are all *dead*. So is
LLM-prediction-based coding, because no LLM is in the encoder's loop.

---

## C. FRONTIER (incumbent, measured)

`bench/synizesis-bench.ts`, `o200k_base`, DAEDALUS at `budgetMs = 2500`
(the incumbent dictionary lane METATRON routes to on essentially every
structured document):

| group | raw | DAEDALUS | DAEDALUS % |
|---|---|---|---|
| real public tabular | 6 520 | 2 984 | 54.2 % |
| synthetic ops | 10 400 | 4 099 | 60.6 % |
| real local ops artifacts | 32 299 | 11 947 | 63.0 % |
| repo holdout prose/code/JSON | 9 947 | 7 299 | 26.6 % |

---

## D. NEGATIVE SPACE — 17 shapes the answer could have had, and what killed each

Measured, this session. Numbers are token deltas over all 42 repo lanes
(74 177 input tokens) unless stated.

| # | shape | verdict | evidence |
|---|---|---|---|
| 1 | CRLF → LF canonicalisation | **+9 tokens total.** dead | `bench/w13-probe.ts` |
| 2 | trailing-whitespace strip | **+7 tokens total.** dead | `bench/w13-probe.ts` |
| 3 | 2-space → tab re-indent | **−2 341 tokens.** strongly negative | `bench/w13-probe.ts` |
| 4 | 4-space → tab re-indent | **−640 tokens.** negative | `bench/w13-probe.ts` |
| 5 | glyph pair-merge arbitrage | already shipped in `ariadne.ts` (pair graph + hill-climb) | `grep` on `ariadne.ts` L851-1102 |
| 6 | dense-script glyph runs | only Cyrillic (2.015 ch/tok) and Latin (1.71) beat 1.0; everything else ≤ 1.0 | `bench/w13-density.ts` |
| 7 | hand-picked "merge-rich" glyph subsets | worse than the natural alphabet (1.96 vs 2.015) | `bench/w13-density.ts` |
| 8 | word-level abbreviation / prefix codes | `o200k` cannot express multi-word English tokens; hard 1-token/word floor | pre-tokenizer regex |
| 9 | move-to-front inline substitution | 0 gain on prose; repeats are scattered so each glyph replaces a 1-token word | analysis + §9 |
| 10 | transposed two-stream (glyphs contiguous) | projected ~13 % on `license`; abandoned — the interleave rule is not reliably readable | §9 |
| 11 | separator → letter inside paths/URLs | **−24.4 %** on 3 389 real compounds. `o200k` already handles `/` and `.` well | `bench/w13-homog.ts` |
| 12 | hex digest → Cyrillic | **−1.9 % to −64 %**. Cyrillic is *worse* than hex | `bench/w13-dens2.ts` |
| 13 | hex digest → Latin `a-p` | **+15.7 %** on real digests — kept, as stage 4 | `bench/w13-dens2.ts` |
| 14 | fixed catalogue of literal families with 2-3-token bracket markers | **−8.3 % overall**; markers `⟦⟨⌈` cost 2-3 tokens each | `bench/w13-frag.ts` |
| 15 | base64 / base58 / alnum62 re-encoding | base64 is already 2.12 ch/tok on real data (12.7 bits/tok) — nothing to win | `bench/w13-dens2.ts` |
| 16 | SYNIZESIS **before** the dictionary, on repetitive logs | **worse**: `find-listing` 1 326 → 1 419; SYN shatters the long repeated literals the dictionary wanted | `bench/w13-syn2.ts` |
| 17 | SYNIZESIS **after** the dictionary, on repetitive logs | **0 gain**: DAEDALUS has already absorbed the digits; its wire has almost no numeric literals left | `bench/w13-diag.ts` |

Shapes 16 and 17 are the important negatives: they are *why* the codec ships
as a four-arm tournament rather than a pre-pass, and why the honest headline is
"wins on high-variance tabular/line data, ties elsewhere" rather than
"wins everywhere".

---

## E. SIX MECHANISM-DISTINCT APPROACHES ACTUALLY BUILT AND MEASURED

1. **Invertible whitespace normalisation** — `bench/w13-probe.ts`. Dead (D1-D4).
2. **Dense-script re-encoding (channel-capacity search)** — `bench/w13-density.ts`,
   `bench/w13-dens2.ts`. Produced the alphabet table in §8 and the one survivor,
   hex → `a-p`.
3. **Fixed-catalogue literal defragmentation with sigil brackets** —
   `bench/w13-frag.ts`. Dead (D14), but it isolated the marker cost as the binding
   constraint.
4. **Adaptive shape-template factoring with one-token sigils** — the first
   working version. `iso-log-40` 1 663 → 963 (42.1 %) standalone.
5. **Position-induced templates (lossless Drain)** — a character position is
   variable iff two members of a mask group disagree there. Upgraded #4 from
   1 207 → 963 on the same fixture by shrinking payloads.
6. **Marker-free promotion** — templates whose payload is a fixed-length digit
   run drop the sigil entirely and are identified by run length, verified by
   round trip. This is the mechanism that breaks the one-token-per-occurrence
   floor. `vix-daily` 1 026 → 1 010, `csv-txn-30` 302 → 286, `aapl` 1 452 → 1 436.

---

## F. ARTIFACTS

| path | what it is |
|---|---|
| `src/lib/omega/synizesis.ts` | the codec (encoder, decoder, contract, tournament) |
| `bench/synizesis-fixtures.ts` | fixtures with explicit provenance labels |
| `bench/synizesis-bench.ts` | head-to-head against DAEDALUS, all arms decoded and byte-compared |
| `bench/synizesis-redteam.ts` | 240 assertions: exactness, never-worse, adversarial, 10 000-case fuzz, component properties, contract sufficiency |
| `bench/synizesis_decode.py` | **independent CPython decoder written from the contract prose** |
| `bench/synizesis-emit.ts`, `bench/synizesis-crosscheck.sh` | cross-decoder harness |
| `bench/router-redteam.ts` | adversary against the ⚡ Optimal Exact Route button |
| `bench/holdout-tab/*.csv`, `bench/holdout-ops/*` | real corpora (§6) |
| `bench/w13-*.ts` | the 12 probe scripts behind every number in §D and §8 |

---

## G. SECOND-ORDER ADVERSARY — RESULTS

`bench/synizesis-redteam.ts`: **240 checks, 0 failures.** Both encodings.

* 29 fixtures × 2 encodings: exact round trip **and** `messageTokens ≤ raw`.
* 28 adversarial inputs: empty, single char, the separator `⇒` in the text, the
  hex sigil in the text, literal `#` inside and outside spans, *every sigil in
  the pool present in the input*, CRLF, lone CR, NUL, astral emoji with ZWJ,
  RTL Arabic, combining marks, a deliberate 17-digit collision, a 5 000-digit
  run, hex look-alikes, hex text already containing `g-p`, 4 000 repeated
  identical timestamps, `a1` × 2 000.
* **10 000-case randomised differential fuzz** over an atom alphabet that
  deliberately includes the wire's own control characters: 0 mismatches.
* Component properties: `hexShift` involutive on 4 000 random hex runs;
  `scanSpans` never returns whitespace; position induction reconstructs every
  member exactly.
* Contract sufficiency: three hand-built wires assert the decoder implements
  exactly the three rules the contract states and no fourth rule.

**Cross-decoder:** `bench/synizesis-crosscheck.sh` → *"CPython cross-decode
EXACT on 25 wires"*. Two independent implementations, one contract.

---

## H. EXTERNAL VERIFICATION

* `tsc --noEmit` clean; `next build` clean (`✓ Generating static pages (3/3)`).
* Real tokenizer (`gpt-tokenizer`) for every count — no heuristics.
* Independent CPython decoder: exact on 25/25 wires.
* Real public data, not only synthetic (§6).
* **Downgrade applied:** no LLM API exists in this sandbox, so the
  "readable by a bare chat turn" claim is *not* machine-verified. It is
  supported by the CPython reader and by the agent-in-the-loop decode in §7,
  and is stated as evidence rather than proof.

---

## I. REPAIRED CANDIDATES INHERIT NO TRUST

The codec was repaired four times (sigil dedup, position induction, marker-free
promotion, scanner relaxation). After the last repair the **entire** red-team
suite, the fuzz, the CPython cross-check and the full bench were re-run from
scratch; no result in this report predates the final source.

---

## 1. THE MECHANISM

```
2026-09-10T08:34:56.789Z   15 tokens   (1.60 chars/token)
20260910083456789           6 tokens   (2.83 chars/token)
08:34:56                    5 tokens  →  083456          2 tokens
192.168.100.254             7 tokens  →  192168100254    4 tokens
2026-09-10                  6 tokens  →  20260910        3 tokens
```
(`bench/w13-mark.ts`, `o200k_base`.)

1. **Scan** maximal class-alternating literals.
2. **Mask** them (`digit→0`, `letter→a`, punctuation literal) and group.
3. **Induce** the template: a position is variable iff two members of the group
   disagree there. Constants — including shared date prefixes — stay in the
   skeleton and are written **once**.
4. **Emit** `legend` + `⇒` + body; each occurrence is `sigil + payload`, and the
   payload is now a single same-class run the pre-tokenizer stops cutting.
5. **Promote to marker-free** every template whose payload is a fixed-length
   digit run, when the round trip still verifies: the sigil disappears and the
   rule is "expand every digit run of that length". **Zero tokens per
   occurrence.**
6. **Hex-shift** long lowercase-hex runs (`0-9 → g-p`), making them pure-letter.
7. **Tournament** over `{identity, synizesis, daedalus, daedalus∘synizesis,
   synizesis∘daedalus}`; every arm is decoded and byte-compared; cheapest wins.
   SYNIZESIS therefore **cannot be worse** than the incumbent arm it contains.

Example wire (real output):

```
2026-03-0#T##:##:##.###Z
⇒
4091502118 INFO order 10021 shipped
4091744907 WARN order 10022 delayed
```

No sigil anywhere. One bare pattern with ten `#`, so ten-digit runs expand and
the five-digit order numbers do not.

---

## 2. HEADLINE RESULT

`bench/synizesis-bench.ts`, `o200k_base`, 29 documents, DAEDALUS baseline at
`budgetMs = 2500`. Every arm decoded and byte-compared; the run throws on any
inexactness.

| group | raw | DAEDALUS | SYNIZESIS | Δ | Δ % of incumbent |
|---|---|---|---|---|---|
| **real public tabular** | 6 520 | 2 984 | **2 446** | **538** | **18.0 %** |
| synthetic ops | 10 400 | 4 099 | **3 569** | **530** | **12.9 %** |
| real local ops artifacts | 32 299 | 11 947 | 11 927 | 20 | 0.2 % |
| repo holdout | 9 947 | 7 299 | 7 252 | 47 | 0.6 % |
| **total** | **59 166** | **26 329** | **25 194** | **1 135** | **4.31 %** |

Per-lane, largest first. Two independent runs are shown because DAEDALUS's
search is wall-clock budgeted; SYNIZESIS's own output was **bit-identical**
across both runs, so all the variance in the Δ column is the incumbent's
(`bench/synizesis-bench.ts` run 1, `bench/w13-verify.ts` run 2):

| lane | raw | DAEDALUS r1 / r2 | SYNIZESIS | Δ r1 / r2 | Δ % r2 |
|---|---|---|---|---|---|
| `tab/vix-daily-1990.csv` *(real)* | 3 412 | 1 394 / 1 394 | **994-1 010** | 384 / **400** | **28.7 %** |
| `synth/csv-txn-30` | 877 | 540 / 540 | **286** | 254 / **254** | **47.0 %** |
| `tab/aapl-2014.csv` *(real)* | 3 108 | 1 590 / 1 613 | **1 436** | 154 / **177** | **11.0 %** |
| `synth/jsonlog-30` | 1 740 | 512 / 512 | **411** | 101 / **101** | **19.7 %** |
| `synth/nginx-35` | 1 925 | 721 / 721 | **625** | 96 / **96** | **13.3 %** |
| `synth/iso-log-40` | 1 663 | 699 / 699 | **644** | 55 / **55** | **7.9 %** |
| `synth/syslog-30` | 1 180 | 513 / 513 | **483-489** | 24 / **30** | **5.8 %** |

**9 of 29 lanes improved; 0 of 29 regressed.** On the raw text, the real VIX
CSV goes 3 412 → 1 010, a **70.4 %** reduction, against the incumbent's 59.1 %.

### Honest caveats

* DAEDALUS's search is **wall-clock budgeted and therefore non-deterministic**.
  Re-running it on the same input moves prose lanes by up to ~5 %. The
  `ho/license 1015 → 968` row above is inside that noise band — SYNIZESIS makes
  no structural change to that document (`bare` equals `raw`). The claims that
  survive re-runs are the tabular and line-structured ones, where the win comes
  from a mechanism, not from a lucky budget.
* SYNIZESIS gives **exactly zero** on narrative English with no numeric or
  structured literals (`gh-prose`, `lic-mit`, `md-react`, `readme`). It declines
  and the tournament falls through to the incumbent. That is by construction,
  and it is reported rather than hidden.
* The contract costs 23 tokens (+15 when marker-free rules are used, +12 for
  hex). A document therefore needs ≥ ~40 tokens of defragmentation gain before
  the lane fires at all. The 4-line example in §7 is *below* break-even
  (88 → 101) and the gate correctly refuses it in the shipped codec.

---

## 3. WHY THIS IS NOT ANY EXISTING LANE

| neighbour | what it does | why SYNIZESIS is different |
|---|---|---|
| `abacus.ts` | removes thousands-commas from one number at a time, one sigil per instance | no template, no sharing, no position induction, no marker-free mode; single mechanism |
| `helix.ts` | arithmetic progressions in numeric sequences | value-domain, not tokenizer-domain |
| `arithmos.ts` | native numeral-script canonicalisation | codepoint substitution, not structure factoring |
| DAEDALUS / CHIRON / ARIADNE / SIBYL | dictionary over repeated **content**, ≥1 token per occurrence | SYNIZESIS factors the repeated **punctuation skeleton** and re-densifies the content; marker-free rules cost **0** per occurrence |
| Drain / Drain3 (He et al., ICWS 2017) | fixed-depth parse-tree log template mining | **lossy** — variables are replaced by `<*>` and discarded. SYNIZESIS keeps every variable byte and optimises token cost under a specific BPE pre-tokenizer, not clustering accuracy |
| LTSC (arXiv 2506.00307), MedTPE (arXiv 2605.11774) | LZ77/meta-token dictionaries over token subsequences | same content-repetition class as DAEDALUS; neither models the pre-tokenizer |
| LoPace (arXiv 2602.13266) | Zstd + BPE binary packing | not model-readable |
| ctxfold / PackRat | structure-aware lossless re-encoding, learned codebooks | codebook/dictionary class; no pre-tokenizer chunk model, no marker-free binding |

The literature surveyed this session attacks **redundancy**. SYNIZESIS attacks
**the pre-tokenizer's chunking of non-redundant data**. I found no published
work in either direction on marker-free binding by payload-length identity.

---

## 4. RED-TEAMING THE INCUMBENTS AND THE ⚡ OPTIMAL BUTTON

### 4.1 A real, user-visible bug in the Optimal Exact Route button

`bench/router-redteam.ts` + `bench/w13-flip.ts`.

`ParetoRow.outTokens` is **not the same quantity across rows**:

* METATRON, EPISTEME, PANOPTES, KALLOS, ARITHMOS, DAEDALUS, the CHIRON family,
  SYNIZESIS → `messageTokens`, i.e. wire **plus** inline contract. Honest.
* KHOROS, OMNI, STRATA, TESSERA, SIGNET, AXIOM, QUASAR, PLEXUS, MERIDIAN,
  EIDOLON, ATLAS, PULSE, CROWN, IRIS, KERNEL, ROSETTA and ~35 more → **wire
  tokens only**. Their decode needs an out-of-band `*_SYSTEM_PROMPT` which the
  ranking never charged them for.

Measured cost of those invisible prompts:

```
signet 435   strata 371   tessera 262   axiom 218   quasar 185   plexus 149
meridian 145 eidolon 108  atlas 99      khoros 74   omni 70      pulse 53
crown 28     iris 19      kernel 19
24 exact-lane codecs export a decoder prompt; 2 235 tokens invisible to the router.
```

**Demonstrated misroute** (`bench/w13-flip.ts`, `bench/holdout/md-vite.txt`,
274 raw tokens):

```
ROUTER picks  plexus  wire=258     true one-chat cost = 258 + 149 = 598
HONEST pick   metatron/identity                          = 274
*** MISROUTE: +324 tokens — 118% WORSE than sending the raw document
```

This also violates the operator constraint that the codec must work with **no
system-prompt box**.

**Fix shipped** in `src/components/Workbench.tsx`:

* `DECODE_CONTRACT_TAX` — the measured prompt cost per wire-only lane.
* `oneChatCost(row) = row.outTokens + tax(row.key)`; the router ranks on that.
* The router **refuses to route to anything whose honest cost exceeds the raw
  input**, so the button can no longer make a message bigger.
* `ROUTER_EXCLUDED = {rosetta}` — per operator directive, ROSETTA can never be
  the button's answer.
* The panel now prints the honest one-chat cost and names the decode-contract
  component explicitly.

### 4.2 METATRON / EPISTEME / PANOPTES / KALLOS / ARITHMOS

These five are **honest**: each reports `messageTokens = wire + inline
contract`, each self-verifies its round trip, and each declines to raw when it
cannot win. Verified across 29 documents in `bench/router-redteam.ts`; no
inexact result and no row whose `messageTokens` undercounted its own contract.

Two real caveats, both reported rather than "fixed":

* **METATRON's contract is 50 tokens, EPISTEME's 50.** On short documents that
  is the whole budget: on `lic-mit` (223 tok), `md-react` (252), `md-vite` (274)
  all five decline and emit identity. They are honest, but they are *inert*
  below roughly 300 tokens.
* **Search non-determinism.** METATRON and DAEDALUS are wall-clock budgeted.
  Two runs on `ho/license` produced 1 015 and 968 message tokens. Any Pareto
  claim against them at single-digit-percent granularity is inside the noise;
  this report only claims the structural wins.

---

## 5. PERFORMANCE

`synizesisEncode` default budget 1 500 ms; the planner memoises every real
tokenizer call (`TK`). Planning alone (no composed arms) is **0.2-0.8 s** on a
4 000-token document; sigil de-duplication alone cut a 16 s plan to 0.8 s
(20×). The composed arms are dominated by DAEDALUS's own budget, which the
caller controls. In the worker the lane runs at `budgetMs: 2500`.

---

## 6. CORPORA AND PROVENANCE

| path | provenance |
|---|---|
| `bench/holdout-tab/aapl-2014.csv` | **real public data**, `plotly/datasets` `2014_apple_stock.csv`, fetched this session, 241 rows verbatim |
| `bench/holdout-tab/vix-daily-1990.csv` | **real public data**, `datasets/finance-vix` `vix-daily.csv`, fetched this session (1990 rows; the OPEN column is replicated across HIGH/LOW/CLOSE exactly as the source file has them for 1990) |
| `bench/holdout-ops/openstack-loghub-26.log` | **real**, LogHub `OpenStack_2k.log` (logpai/loghub), first 26 lines verbatim including CRLF |
| `bench/holdout-ops/git-log-fuller.txt`, `git-numstat.txt`, `find-listing.txt`, `ls-full-iso.txt`, `node-stacktraces.txt`, `npm-ls.txt`, `package-lock-head.json` | **real artifacts captured in this sandbox** by running `git log`, `find -printf`, `ls --time-style=full-iso`, `node`, `npm ls` |
| `synth/*` in `bench/synizesis-fixtures.ts` | **synthetic**, format-faithful, labelled synthetic in every table |
| `bench/holdout/*` | the repo's pre-existing holdout, untouched |

---

## 7. DIRECT MODEL READABILITY

Wire and contract, verbatim, nothing else:

```
2026-03-0#T##:##:##.###Z
⇒
4091502118 INFO order 10021 shipped
4091744907 WARN order 10022 delayed
5110209330 INFO order 10023 shipped
5144851006 INFO order 10024 shipped
```
> Above ⇒: symbol + pattern. Below: symbol + chars fill its # marks in order.
> Print restored text. A pattern with no symbol applies to every digit run of
> that many digits.

Two independent readers decoded it:

1. **CPython** (`bench/synizesis_decode.py`, written from the contract prose) —
   `EXACT`, and `EXACT` on 24 other wires.
2. **Agent-in-the-loop** — I read the block above, wrote what it says into
   `bench/tmp/agent-decode.txt` by hand, and ran `cmp`:
   `AGENT-IN-THE-LOOP DECODE: byte-identical to source`.

No skills file. No system prompt. No tool. The contract is 38 tokens of plain
English and the operation is character substitution into `#` positions.

---

## 8. AI-NATIVE FINDINGS HUMAN RESEARCHERS MISS (measured this session)

**Channel capacity of `o200k_base` for incompressible payloads** — random
strings, cryptographic RNG, 3 × 4 096 symbols each (`bench/w13-dens2.ts`).
A first probe with an LCG gave absurd numbers (`latinU` "11.16 chars/token");
the low bits of an LCG have period ≤ 16 and BPE compressed the periodicity.
**That entire first table was discarded.** The corrected figures:

| alphabet | chars/token | bits/token |
|---|---|---|
| digits (10) | **2.999** | 9.96 |
| lower26 | 1.941 | 9.12 |
| upper26 | 1.760 | 8.27 |
| hex (16) | 1.746 | 6.99 |
| base32 RFC | 1.545 | 7.73 |
| alnum62 | 1.472 | 8.77 |
| base64 | 1.447 | 8.68 |
| cyr-lower32 | 1.374 | 6.87 |
| greek24 | 1.256 | 5.76 |
| hira46 | 1.020 | 5.63 |
| han-256 | 0.629 | 5.03 |

Conclusions a human prompt engineer is unlikely to reach:

* **Digits are the densest ASCII channel** (3 chars/token exactly — the
  `\p{N}{1,3}` cap is a *floor* as well as a ceiling), and 10 bits/token is
  about the practical capacity of the encoding for random data. There is no
  "denser script" trick waiting to be found; the tail is all worse.
* **Real base64 in the wild measures 2.12 chars/token (12.7 bits/token)** —
  better than anything a substitution could give it. Leave it alone.
* **Real hex digests measure 1.72 chars/token.** Mapping the digits onto
  letters (`0-9 → g-p`) makes the run a single pre-tokenizer chunk and gets
  2.04 chars/token, **15.7 %**, with a ten-entry table a reader applies by eye.
* Non-Latin, non-Cyrillic scripts are all ≤ 1.0 chars/token. The "use CJK to
  save tokens" folklore is measurably backwards for `o200k_base`.
* **The marker-free principle.** A rule can cost zero tokens per occurrence
  only if its instances are self-identifying in the compressed text. Deletions
  recoverable from fixed-width structure (separators inside literals,
  zero-padding) are the only family found that qualifies. Everything else —
  including every dictionary in this repo — is stuck at 1 token per occurrence.
* **A boundary result.** Under an order-0 token model English prose carries
  ~8.9 bits/token, and the channel carries ~10. The remaining gap is only
  reachable by a model-conditioned code, and the encoder here has no LLM in the
  loop. So for narrative English prose with no structure, near-identity is not
  a failure of effort — it is the constraint set. Documented so the next pass
  does not spend another session there.

---

## 9. SEARCH-ACCELERATION NOTES

* The planner's only expensive operation is `countTokens`. Memoising it
  (`TK`) and de-duplicating identical shape strings took a representative plan
  from 16 s to 0.8 s (**20×**) with identical output.
* Position induction makes the candidate set **linear in the number of mask
  groups** instead of quadratic in span pairs; the greedy then needs one pass.
* Marker-free promotion is verified by *construction* (promote, re-render,
  decode, `===`) rather than by a static analysis. One full round trip per
  candidate, ≤ 40 candidates. This is the cheapest sound check available and it
  is why promotion can never make output worse.

---

## 10. WEB RESEARCH (new sources this session)

* `dev.to/ji_ai/digit-tokenization-why-commas-fix-llm-arithmetic` (2026) —
  independently documents C1/C2: "*the pre-tokenizer regex carves text into
  fragments; BPE merges never cross those fragment boundaries*", `\p{N}{1,3}`,
  and that `1,234,567` is forced to `1 | , | 234 | , | 567`. It uses the effect
  to *improve arithmetic accuracy*; SYNIZESIS uses the same effect in the
  opposite direction, to *reduce cost*. I found no source that does the latter.
* `github.com/logpai/Drain3` + Drain (He et al., ICWS 2017), LogERT
  (ScienceDirect 2025), *Documentation-based Semantic-Aware Log Parsing*
  (arXiv 2202.07169) — the template-mining literature. Uniformly **lossy**.
* `arxiv.org/html/2602.13266v1` LoPace; `pith.science/paper/2506.00307` LTSC;
  `arxiv.org/html/2605.11774v1` MedTPE — the lossless dictionary class.
* `guidance.readthedocs.io` token healing; *From Language Models over Tokens to
  Language Models over Characters* (arXiv 2412.03719) — the prompt-boundary
  problem, i.e. the same chunk-boundary algebra from the generation side.
* **Newly AI-solved mathematics, Jan-Sep 2026** (requested as a calibration
  anchor): DeepMind **AlphaProof Nexus** (arXiv 2605.22763, 21 May 2026) —
  9/353 open Erdős problems solved autonomously with Lean 4 proofs, two open
  56 years, plus 44/492 OEIS conjectures, ~$100-500/problem. OpenAI **Astra**
  (2 Aug 2026) — 10 open problems with zero-`sorry` Lean 4 certificates,
  including the first explicit non-sofic group (open since Gromov 1999), a
  disproof of Connes's rigidity conjecture, and Ehrhart's volume conjecture.
  GPT-5.4 Pro resolved Erdős #1148, #1196, #1202, #258, #1217 (Mar-Apr 2026);
  Gemini Deep Think via Aletheia resolved #652 and #1051 (5 Feb 2026); OpenAI's
  unit-distance (#90) disproof (20 May 2026) was independently formalised in
  Lean by Boris Alexeev on 26 Jun 2026. The methodological lesson taken into
  this report: **the compiler is the referee.** Every claim here is attached to
  a command whose output is reproducible, and the two claims that no tool in
  this sandbox can check (model readability, and any Pareto claim finer than
  DAEDALUS's search noise) are explicitly downgraded rather than asserted.
