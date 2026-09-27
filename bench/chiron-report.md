# CHIRON — a two-part-MDL text program for one ordinary chat message

Research artifact for `src/lib/omega/chiron.ts`, `bench/chiron-frontier.ts`,
`bench/chiron-redteam.ts`, `bench/chiron_decode.py`.
All numbers below were produced by running those files on this branch with the
live `gpt-tokenizer` `o200k_base` encoder, Node v22.22.3, CPython 3.11.2.
Nothing here is estimated, extrapolated, or simulated.

---

## A. FORMAL MODEL

Fix a tokenizer `T` (o200k_base). A codec is a pair of total functions
`E : Σ* → Σ*`, `D : Σ* → Σ*` with `D(E(x)) = x` for all `x`.

The contract of this repository is that `D` is **an LLM reading one chat
message** — no system prompt, no prior turn, no skills file, no tool. So the
message must carry the reader's instructions with it. Define the **prose
contract** `C(w) ∈ Σ*` produced for a wire `w`, and the honest cost

```
M(x) = |T( C(E(x)) ‖ E(x) )|        (contract and wire in ONE message)
```

A codec is useful on `x` only when `M(x) < |T(x)|`. This is precisely the
**two-part code** of the Minimum Description Length principle,
`L(model) + L(data | model)` — with one property the compression literature
never has to confront: **the model term is natural-language prose, billed in
the same tokenizer units as the data.**

Kolmogorov's invariance theorem says the machine-dependence of description
length is an additive constant `c_{U,V}` that vanishes asymptotically
(Li–Vitányi; Grünwald's MDL tutorial, CWI). At chat scale the object being
compressed is 10²–10⁴ tokens and the constant measured on this branch is
**128 tokens for HERMES-Ω, 70–130 for HERMES-F**. The invariance constant is
not a footnote here; it is 30–60% of everything the codec saves, and on ten of
thirty-seven measured lanes it is the *entire* reason the codec declines to
identity. CHIRON's thesis is therefore one sentence:

> **Treat the interpreter description as a decision variable of the search, not
> as a fixed preamble.**

Three consequences, each implemented:

1. **Contract-aware operator admission.** An operator ships only if
   `tokens_saved(op) > tokens(clause(op))`. `chironEncode` re-runs the whole
   search with each operator family disabled and emits the lowest measured `M`.
2. **Syntax chosen for the cost of its own explanation.** Every syntactic
   decision (delimiter-free tape vs line tape vs `x=y`; self-declared blank and
   separator characters vs fixed ones; `a..b` vs a step operator) was written in
   several forms, measured against the live tokenizer, and the cheapest
   *sum of wire and clause* was kept.
3. **Raw stays raw.** Unstructured regions are copied verbatim — no JSON
   escaping (measured tax: +181 to +202 tokens on gh-prose/json-pkg/code-ts for
   HERMES-F), no per-line operator prefix (measured: ~1 token per line), no
   length headers.

### The wire

```
§  RULES  ¶  BODY
```

| element | meaning |
|---|---|
| `§` U+00A7 | frame start, 1 token. A string not starting with `§` decodes to itself. |
| `¶` U+00B6 | ends the rule tape, 1 token. Rule texts never contain it; the body may, because the tape ends at the **first** `¶`. |
| RULES | delimiter-free tape. Each rule is **one new letter of a declared one-token script** followed by its text, which runs to the next new letter of that script or to `¶`. No separators, no numbering, no length prefix. |
| BODY | the payload with admitted phrases replaced by their letters. |

A rule's text is literal unless it begins with one of exactly two operators:

| form | meaning |
|---|---|
| `×btnL…` | **repeat / fill.** Write `t`'s text (or `t` itself if it has no rule) `n` times. In copy *i*, the *k*-th occurrence of the character `b` becomes item *i* of list *k*; the lists are the letters after `n`, in order, cycling if short. |
| `…a..b` | the integers `a` through `b`. |
| `…cX` | the items of `X` separated by the character `c` that sits right after `…`. |

`b` (the blank) and `c` (the list separator) are **declared inside the wire**,
one character each. A payload containing any particular blank or separator can
therefore never force a decline — the self-declaration costs 1 token and buys
collision-freedom that a fixed choice cannot have.

Rules only reference rules defined earlier (enforced by topological rendering),
so expansion terminates with no cycle check, and `chironDecode` is **total**:
every malformed frame returns its input unchanged.

### The generated contract (this is the entire reader instruction)

Base form, 33 tokens of prose:

> Every new Hangul letter before ¶ starts a rule whose text runs to the next new
> letter or to ¶. In the text after ¶ expand every rule, repeatedly, and print
> only the result.

plus, **only when the wire uses them**:

> `×btn`: t written n times. Any letters after n are lists; in copy i the k-th b
> is item i of list k, cycling. `…a..b` = integers a to b. Otherwise the
> character after `…` separates the items.

Measured contract cost in the shipped encoder: **39–41 tokens** for macro-only
wires, **48–50** with plain repeat, **83–92** with fill blocks and lists.
HERMES-Ω pays **128 flat** (184 with counters) and HERMES-F **70–130 plus the
JSON-escape tax**.

---

## B. OUTCOME SPACE

**H+ (what would count as success)** — a wire+contract that beats
`min(identity, HERMES-Ω, HERMES-F, HERMES-C)` by more than a handful of tokens
on at least one lane, with exact round-trip and no lane made worse.

**H− (what would count as failure)** — any of: gains only from a fixed phrase
table; gains that vanish once the contract is billed; a mechanism the prose
cannot describe in fewer tokens than it saves; a decoder that can invent text;
a wire that only the encoder's own decoder can read.

**H∂ (the boundary, i.e. what is genuinely uncertain)** — whether a *real* LLM
executes the contract reliably. That is a behavioural question about models,
not about this code, and **it was not run here**; see §I "what is not claimed".
The nearest external evidence is de Campos et al. (arXiv:2604.13066), who
measure **exact-match > 0.99** for template-based in-context dictionary
decompression with Claude 3.7 Sonnet on LogHub 2.0 — but with the dictionary in
the *system prompt*, which this contract forbids.

---

## C. FRONTIER — measured, 37 lanes

`./bench/tmp/build.sh bench/chiron-frontier.ts`
`I` identity · `Wo/Mo` HERMES-Ω wire/message · `Wf/Mf` HERMES-F · `Mc` HERMES-C ·
`Wx/Mx` CHIRON · `bestOld = min(I,Mo,Mf,Mc)` · `Δ = Mx − bestOld`.
Every row asserts exact UTF-16 round-trip for all four codecs.

```
lane                       I     Wo     Mo     Wf     Mf     Mc     Wx     Mx   bestOld   best    Δ    ms
ho/code-dts            162    162    261    162    307    162     70    109      162    109   -53    78
ho/code-ts            1422   1099   1227   1422   1567   1422   1098   1138     1227   1138   -89  2316
ho/gh-api.json        2519   1183   1311   2519   2664   2519   1158   1198     1311   1198  -113  4506
ho/gh-prose           1934   1801   1929   1934   2079   1934   1799   1839     1929   1839   -90  3167
ho/json-pkg           1152    755    882   1152   1297   1152    755    794      882    794   -88  2258
ho/lic-mit             223    223    322    223    368    223    223    223      223    223     0     1
ho/license            1166    998   1126   1166   1311   1166    998   1038     1126   1038   -88  1296
ho/md-react            252    252    351    252    397    252    252    252      252    252     0     0
ho/md-vite             274    274    373    274    419    274    274    274      274    274     0     1
ho/readme              843    665    792    843    988    843    665    704      792    704   -88   638
CHAOS_900              288    288    387    288    433    288    288    288      288    288     0     1
CHAOS_G_CJK            385    385    484    385    530    385    385    385      385    385     0     1
CHAOS_F_LLM_REPORT     261    261    360    261    406    261    261    261      261    261     0     1
MOSAIC_HANDTRACE_300   118    118    217    118    263    118    118    118      118    118     0     0
BANYAN_INTERLEAVED    7488   1106   1233   1362   1507   1486    645    734     1233    734  -499  4931
json-log-40           1600    220    347    432    577    562    103    192      347    192  -155   293
csv-60                 726    289    417    289    434    413    179    269      413    269  -144   719
chat-48                480    122    249     49    194    158     48    128      158    128   -30   579
grid-30                270     30    157     30    175    131     22     69      131     69   -62    16
rle-1400               252     18    202    252    397    252     14     62      202     62  -140    22
idrun-200              600     16    200    600    745    600     21    102      200    102   -98    41
prose                   24     24    123     24    169     24     24     24       24     24     0     0
agent-turn             823    230    357    232    377    355    137    226      355    226  -129   200
two-regime             850    317    445    325    470    448    250    340      445    340  -105   418
three-regime           485    175    302    159    304    276    175    214      276    214   -62    57
tr/doc10              3836   2666   2793   3836   3981   3836   2640   2679     2793   2679  -114 13976
tr/doc11              3677   2885   3013   3677   3822   3677   2681   2721     3013   2721  -292 22759
tr/doc2                267    267    366    267    412    267    267    267      267    267     0     0
tr/doc3                673    505    633    673    818    673    505    545      633    545   -88   810
tr/doc5                490    328    455    490    635    490    328    367      455    367   -88   643
tr/doc8                807    650    777    807    952    807    653    692      777    692   -85   771
tr/dts0               3991   2547   2675   3991   4136   3991   2193   2233     2675   2233  -442  8512
tr/dts1               3280   1757   1884   3280   3425   3280   1740   1779     1884   1779  -105  6238
tr/dts2               3177   2261   2388   3177   3322   3177   2201   2240     2388   2240  -148  9791
tr/dts3               3504   2446   2574   3504   3649   3504   2256   2296     2574   2296  -278 10677
tr/dts4               3808   2552   2680   3808   3953   3808   2299   2339     2680   2339  -341 11855
tr/dts5               3480   2475   2602   3480   3625   3480   2444   2483     2602   2483  -119 11070
TOTAL                55587         36894         51108  46694         31622    35755  31622 -4133 118642
```

* **28 / 37 lanes strictly improved. 0 lanes regressed.**
* Frontier total `35 755 → 31 622` tokens, **−11.56%** off the previous
  best-of-stack.
* CHIRON alone `31 622` vs HERMES-Ω `36 894` — **−14.29%**, and −43.1% vs
  identity (`55 587`).
* Speed: 118.6 s for all 37 lanes; worst single lane 22.8 s (`tr/doc11`,
  15 KB). The same 37 lanes under an earlier CHIRON revision took 309 s, and
  HERMES-Ω needs 11 s for `dts0` alone against CHIRON's 8.5 s for a wire that
  is 354 tokens smaller.

Largest wins, with the mechanism responsible:

| lane | bestOld → CHIRON | Δ | mechanism |
|---|---|---|---|
| BANYAN_INTERLEAVED | 1233 → 734 | **−499** | 6 fill blocks + 16 column lists + 21 macros |
| tr/dts0 | 2675 → 2233 | **−442** | macro tape with sliding candidate window; 134 rules |
| tr/dts4 | 2680 → 2339 | −341 | macro tape, 121 rules |
| tr/doc11 | 3013 → 2721 | −292 | macro tape, 128 rules |
| tr/dts3 | 2574 → 2296 | −278 | macro tape, 105 rules |
| json-log-40 | 347 → 192 | **−155** | 1 fill block, 3 lists (wire 103 vs HERMES-Ω 220) |
| csv-60 | 413 → 269 | −144 | 1 fill block, 3 lists, column splitting |
| rle-1400 | 202 → 62 | **−140** | 2 repeats, 48-token contract |
| agent-turn | 355 → 226 | −129 | 2 fill blocks over two prose-separated regimes |
| idrun-200 | 200 → 102 | −98 | discovered `,` unit separator + integer range |
| ho/code-dts | 162 → 109 | −53 | **lane flipped from declining to winning** purely by contract shrink |

Two results are worth separating out because they answer the brief directly.

**Ops.** The ops-shaped lanes (`json-log-40`, `csv-60`, `agent-turn`,
`two-regime`, `three-regime`, `rle`, `idrun`, `grid`, `BANYAN`) improve by
30–66% against the previous best, i.e. between 30 and 499 tokens each. That is
the fill-block plus list machinery doing work no codec in the stack could do.

**General prose.** `gh-prose −90`, `readme −88`, `license −88`, `doc10 −114`,
`doc11 −292`, `doc3/doc5/doc8 −85…−88`, `code-dts −53`. Every prose lane that
was already framed improves by ~88 tokens from the contract compression alone,
and `doc11` improves by 292 from the search fix. One prose lane
(`ho/code-dts`) crosses from declining to winning. Eight prose/chaos lanes
still honestly decline — see §D.

---

## D. NEGATIVE SPACE — 18 shapes CHIRON cannot or must not compress

Each was measured, not assumed.

1. **Token-dense English prose.** `prose` (24 tok), `md-react` (252),
   `md-vite` (274), `lic-mit` (223), `doc2` (267) all decline to identity.
   Root cause is structural: with a 200k vocabulary nearly every
   whitespace-delimited English word is already one token, so a 1-token glyph
   can only pay on *multi-word* spans — and multi-word spans that repeat ≥3
   times inside a single short document are rare. SuperBPE (COLM 2025,
   arXiv:2503.13423) states the same wall from the other side: BPE with
   whitespace pretokenization cannot exceed 4.68 bytes/token, so the headroom a
   glyph substitution can recover is bounded by how often *superword* spans
   repeat.
2. **Kolmogorov-random text.** `CHAOS_900` (288) and `CHAOS_F_LLM_REPORT` (261)
   decline. Correct behaviour; a codec that "won" here would be lying.
3. **CJK payloads.** `CHAOS_G_CJK` (385) declines. The glyph pool survives
   (Hangul is free there) but the payload has no repeated token spans.
4. **Short inputs.** Anything under ~16 characters, and in practice anything
   whose framed wire is within 40 tokens of identity, cannot pay the base
   contract. `MOSAIC_HANDTRACE_300` (118) is the clean example: the framed wire
   saves 17 tokens against a 40-token clause.
5. **Non-unit arithmetic columns.** `…a..b` covers step ±1 only. A column
   `0,3,6,…` falls back to an item list. The step operator was written and
   deleted: its clause costs ~8 tokens against a saving that needs ~4 uses.
6. **Columns whose values contain every candidate separator.** `listBodyFor`
   tries `, · space · ; · | · tab · / · :` and three control characters, then
   gives up and the block is rejected.
7. **Records wider than 3 lines.** `MAX_UNIT_WIDTH = 3`. `gh-api.json` is
   pretty-printed with ~20-line records and gets **no** blocks; it is carried
   entirely by the macro tape (2519 → 1198).
8. **Nested/recursive structure.** There is no tree operator. JSON nesting is
   compressed only as repeated *text*, never as repeated *shape*.
9. **Near-repetition below line granularity.** Two sentences differing by one
   word inside a paragraph are invisible to both mechanisms.
10. **Reordered repetition.** A permuted list of the same items compresses only
    through the macro tape, never through the block.
11. **Payload scripts that exhaust the glyph pool.** A payload containing all
    six one-token scripts and >220 useful phrases would exhaust the usable
    alphabet; the encoder stops adding rules and emits what it has.
12. **Payload that is itself a valid CHIRON program.** Handled by a 2-token
    `§¶` wrapper — the one case where `M > I` is unavoidable and permitted
    (red-team gate G6 asserts it only fires when genuinely necessary; on the 94
    corpus inputs it fires zero times).
13. **Lone surrogates.** Round-trip through the library and prompt-literal
    readers is exact, but the CPython gate skips them (not JSON-representable).
14. **Per-line operator prefixes.** Measured directly: prefixing 10 CSV lines
    with `>` or `| ` moves 109 tokens to 119. Rejected; the body is verbatim.
15. **JSON-wrapped raw regions.** Measured: `+196` gh-prose, `+202` json-pkg,
    `+181` code-ts. This is HERMES-F's largest single loss and CHIRON does not
    do it.
16. **Marker glyphs inserted mid-text.** Replacing spaces with `가` or `§`
    doubles a 12-token sentence to 24 tokens. Any mechanism that is not
    token-aligned is dead on arrival; this is why candidates are mined over the
    tokenizer's own segments.
17. **A char-cycle operator (`…` with no separator).** Written, measured,
    deleted: saves ~6 tokens per use against a ~9-token clause, i.e. needs >1.5
    uses per wire to break even and usually does not get them.
18. **A dedicated character-run operator.** Deleted: `×b<char>n` with a
    one-character template already covers it at zero extra clause cost.

---

## E. SIX-PLUS MECHANISM-DISTINCT APPROACHES, EACH WITH AN ARTIFACT

| # | mechanism | artifact | measured outcome | shipped? |
|---|---|---|---|---|
| 1 | **Contract as an optimisation target** — write the reader instruction many ways and score each with the live tokenizer | `bench/tmp/prose.ts` | base clause `70 → 33` tokens; repeat clause `49 → 31`; no-fill repeat `21 → 8`; list clause `24 → 19`; dropping the "if it does not start with §…" branch `−16` | **yes** |
| 2 | **Wire syntax as a decision variable** — delimiter-free tape vs newline-delimited vs `g=text` | `bench/tmp/micro2.ts` | 20 rules: **143** / 162 / 182 tokens | **yes** (delimiter-free) |
| 3 | **Host-language wire** — emit restricted Python, contract = "Output only the exact stdout of:" | `bench/tmp/micro.ts` | contract collapses to **7–10 tokens**, but every variable reference costs 3 tokens against 1 for a glyph, and JSON payloads need brace doubling → fatal on prose/code lanes | **no** (measured loss) |
| 4 | **Token-aligned SLP with a sliding candidate window** | `src/lib/omega/chiron.ts` §7, `bench/tmp/d11.ts` | not stopping at the first empty epoch: `doc11 3107 → 2721`, `dts0 2431 → 2193` | **yes** |
| 5 | **Repeat/fill block over discovered line units with per-column lists** (Drain-style template mining, but token-scored and derived per input) | `chironFindBlocks`, `bench/tmp/dbg.ts` | `json-log-40` wire `220 → 103`; `csv-60` `289 → 179` | **yes** |
| 6 | **Discovered unit separator** (not hard-coded to `\n`) | `chironSeparators` | `idrun-200` M `200 → 102`; the `,`-separated single-line lane becomes blockable at all | **yes** |
| 7 | **Template widening: greedy per-slot digit absorption + column splitting** | `widenSlot`, `splitColumns` | `json-log` run length `10 → 39` units and the 3-column template appears; `csv` slot `"0,0"` splits into an integer range plus a short list | **yes** |
| 8 | **Provisional (unremapped) wire scoring during search** | `provisionalWire` | 4× faster (`dts0` 45 s → 8.5 s) with *better* compression, because the budget buys more candidates instead of O(rules²) remaps | **yes** |
| 9 | **Rule-cap sweep on the incumbent** (is HERMES-Ω simply under-searched?) | `bench/tmp/sweep.ts` + `bench/tmp/hermes-var.ts` | `MAX_RULES` 96→220 moves `dts0` 2547→2270 but costs 9 s→36 s; 220→400 gains 2 tokens. Informed CHIRON's cap of 220 *and* proved the cap was not the whole story (CHIRON reaches 2193 in 8.5 s) | informed design |
| 10 | **Counted raw regions with per-line op prefixes** | `bench/tmp/micro.ts` | ~1 token per line; rejected | **no** |

---

## F. SECOND-ORDER ADVERSARY

Gate **G8** in `bench/chiron-redteam.ts` attacks the three mechanisms CHIRON
itself introduces — not the ones it inherited. 18 targeted payloads, all
passing:

* **Block tail invariant** (`tail-1…4`): with and without a trailing separator,
  for `\n` and `,`. A unit owns the separator that *follows* it, and is legal
  only when a separator really follows, so the final piece can never be
  swallowed. Tested both ways because the first implementation got this wrong
  and silently appended a newline — caught by round-trip, not by inspection.
* **Separator exhaustion** (`sep-exhaust`): every candidate list separator
  appears inside every value.
* **Range shadowing** (`range-collision`, `range-collision-2`): payload text
  that looks exactly like `a..b`. The encoder refuses to emit a split-list whose
  body would match the range regex.
* **Cycle fabrication** (`cycle-break`, `cycle-almost`): a column that is
  periodic for 40 of 41 values. Period detection must not extrapolate.
* **Digit widening** across powers of ten, upward, downward, and through zero
  into negatives; plus `leading-zeros`, where `0000…0039` must never be
  normalised into a range.
* **Blank-marker flood**: a payload containing all 14 blank candidates.
* **Frame characters inside templates** and **rule text beginning with an
  operator character**.
* **Moving field** (the classic Drain failure mode): the variable part changes
  position between lines.

---

## G. EXTERNAL VERIFICATION, WITH RECEIPTS

Three independent readers. Agreement across them is evidence about the
*specification*, not about one implementation.

1. `chironDecode` in `src/lib/omega/chiron.ts` — the library decoder.
2. `promptLiteralDecode` in `bench/chiron-redteam.ts` — written from the
   generated contract prose only, sharing no code with the library.
3. `bench/chiron_decode.py` — **CPython**, a different language in a different
   process, also written from the prose.

`./bench/tmp/build.sh bench/chiron-redteam.ts`:

```
PASS  G1   exact UTF-16 round-trip (library decoder)              94/94 exact
PASS  G2   independent prompt-literal reader agrees               94/94
PASS  G3   external CPython reader agrees                         CPython 3.11.2: 93/93 byte-identical
                                                                  (1 skipped: lone surrogates are not JSON-representable)
PASS  G4   decoder is total; malformed frames return input        132 probes, 0 anomalies, re-decode stable
PASS  G5   one-chat accounting exact; no unused clause            94 messages checked
PASS  G6   message gate never costs more than identity            76 framed, 18 raw, 0 forced-wrap; violations=0
PASS  G7   adversarial payloads through both readers              40 payloads (frame chars, 6 scripts,
                                                                  control/astral/surrogate/bidi, CRLF, 50k run)
PASS  G8   second-order adversary                                 18 targeted attacks
PASS  G9   structured fuzz                                        400/400
PASS  G10  encoder is deterministic                               16 inputs encoded twice
PASS  G11  non-wires decode to themselves (no invention)          7 probes
PASS  G12  speed budget (no lane over 26s)                        total 163.7s over 94 inputs; worst 19.4s
============================================================================
12/12 gates passed
```

Compiler receipts: `npx tsc --noEmit -p tsconfig.json` → clean.
`npm run build` → `✓ built in 10.61s`, `dist/index.html 8,580.65 kB`.

**G5 deserves emphasis.** It asserts that `messageTokens == tokens(decoderPrompt)`
for every input — i.e. the reported cost is the literal token count of the
literal message a user would paste — *and* that the prompt never contains a
clause for an operator the wire does not use. A codec that quietly under-reports
its contract is the single easiest way to fake a Pareto win, so it is gated.

---

## H. REPAIR RE-GATING

Every repair below was re-run through the full 12-gate suite and the 37-lane
frontier, not just the test that caught it.

| defect found | how it was found | repair | re-measured effect |
|---|---|---|---|
| Block units claimed a trailing newline that did not exist at EOF | `decoded !== text` inside `buildCandidate`, which silently discarded the whole variant → "0 blocks" everywhere | unit legality requires `s+width < lines.length` | json-log blocks appear at all |
| Anchors derived from two units die at the first field-width change | `blockCandidateAt` returned 10 units on a 40-line log | greedy per-slot digit widening | run 10 → 39 units; `json-log` M 261 → 194 |
| A composite slot (`"0,0"`) makes both columns expensive | csv template showed only 2 slots | `splitColumns` | `csv-60` wire 283 → 179 |
| LCS threshold of 2 refused a 1-character trailing separator | `idrun` produced no width-1 candidate | threshold → 1 | `idrun-200` M 448 → 102 |
| Candidate list sliced **before** sorting, keeping an arbitrary 1600 map entries | code review during the speed rewrite | rank by char-saving proxy, then exact token bound, then slice | `dts0` 2471 → 2233 |
| Search stopped at the first epoch with no accepted candidate | `doc11` was the single regressing lane (+94) | slide the ranked window instead of stopping | `doc11` 3107 → 2721; last regression eliminated |
| Forced `§¶` wrapper applied to any payload starting with `§`, even inert ones | G6 + 6 fuzz failures | wrap only when `chironDecode(text) !== text` | G6 and G9 to 0 violations |
| Per-variant time budget let one input spend 5× the cap | G12 at 19 s and rising | single wall-clock envelope across the variant sweep | frontier 213 s → 119 s |

---

## I. WHAT IS NOT CLAIMED

* **No LLM was asked to decode a CHIRON wire in this work.** Three programs
  agree byte-for-byte; whether a given model executes the prose is untested here
  and is the highest-value next experiment. The closest published evidence is
  arXiv:2604.13066 (exact-match > 0.99 for template dictionaries, but in the
  system prompt) and arXiv:2506.00307 (LTSC, but with fine-tuning).
* **No optimality.** The smallest-grammar problem is NP-hard and hard to
  approximate within a constant factor (Charikar, Lehman, Liu, Panigrahy,
  Prabhakaran, Sahai, Shelat — STOC 2002 / IEEE TIT 2005). CHIRON is a greedy
  heuristic with an exact final gate.
* **No universality.** Eight of 37 lanes decline to identity and the codec says
  so in its own `notes`.
* **No compression-ratio claim against real compressors.** `gzip`/`xz` beat
  every codec here on bytes; they are simply not readable by an LLM in one chat
  message, which is the whole constraint.
* **No claim that `Δ` on a declining lane is zero because CHIRON is good.** It
  is zero because CHIRON refuses to ship, and the frontier keeps the old best.

---

## J. STOPPING CONDITION

The search stops when all of the following hold, and they do:

1. Every mechanism that survived measurement is implemented and shipping.
2. Every mechanism that was deleted has a recorded measurement explaining why
   (§D 5, 14, 15, 17, 18; §E 3, 10).
3. No lane regresses against the previous frontier (0/37).
4. All 12 gates pass, including an external-process verifier.
5. The remaining headroom is identified and is *not* reachable by another
   operator — it is reachable only by leaving the contract (a real arithmetic
   coder plus a model, per Delétang et al. ICLR 2024), which this repository's
   one-chat rule forbids.

### Remaining open interface (highest-information next tests)

1. **Ask an actual LLM.** Paste `chironDecoderPrompt(wire)` for `json-log-40`
   (192 tokens) into a fresh chat and diff the output. This is the only untested
   link in the chain.
2. **Records wider than three lines.** `gh-api.json` gets zero blocks because
   its records are ~20 lines. A width search driven by the repeat period of the
   line-hash sequence would likely find them.
3. **Maximal-repeat selection.** CHIRON picks the highest-bound token span;
   MR-RePair (Furuya et al., *Algorithms* 13(4):103, 2020) shows that replacing
   the most frequent **maximal repeat** instead of the most frequent pair yields
   grammars down to 55% of Re-Pair's on repetitive text. CHIRON's spans are
   maximal-ish by accident, not by construction.
4. **Cross-region block sharing.** `BANYAN` emits 6 blocks and 16 lists; several
   of those lists are near-duplicates that a shared-column pass could merge.

---

## CITATIONS

New to this system (none of these are referenced by any existing codec in the
repository):

* **Grünwald, P.** *A Tutorial Introduction to the Minimum Description Length
  Principle.* CWI. — the two-part code `L(M) + L(S|M)`, and the explicit warning
  that for short data the choice of description language is *not* asymptotically
  negligible. This is CHIRON's objective function.
  <https://homepages.cwi.nl/~paulv/course-kc/mdlintro.pdf>
* **Bridging Kolmogorov Complexity and Deep Learning**, arXiv:2509.22445 (2025)
  — universal two-part codes and the invariance theorem restated for practical
  model-selection; used for the framing that the interpreter constant is bounded
  but real.
* **Furuya, Takagi, Nakashima, Inenaga, Bannai, Kida.** *Practical Grammar
  Compression Based on Maximal Repeats* (MR-RePair), *Algorithms* 13(4):103,
  2020 — replacing maximal repeats instead of frequent bigrams; grammar size to
  55% of Re-Pair on repetitive text. Directly motivates §J.3.
  <https://doi.org/10.3390/a13040103>
* **Gańczorz & Jeż.** *Improvements on Re-Pair Grammar Compressor* (DCC 2017) —
  disfavour bigrams that cross LZ77 factorisation borders. CHIRON's exact
  analogue: never propose a phrase that crosses a BPE token border.
* **Furuya et al.** *Practical Repetition-Aware Grammar Compression*
  (RL-MR-RePair) — run-length CFG rules `A → B^t`. CHIRON's `×` is a run-length
  rule *with holes*.
* **Navarro, Olivares, Urbina.** *Generalized Straight-Line Programs*,
  arXiv:2404.07057 / *Acta Informatica* 2025 — a grammar rule may be an
  arbitrary *program*; ISLP rules `A → Π B^{i^c}` provably break the δ lower
  bound on some families. CHIRON's `×b t n L…` is a deliberately tiny,
  LLM-executable instance.
* **logpai/Drain3** and **"Preprocessing is All You Need"**, arXiv:2412.05254 —
  a log line is a constant template plus ordered variable parameters, and the
  *masking regexes* (not the parser) dominate template accuracy (Drain FTA
  0.282 → 0.581). CHIRON derives the mask per input from the tokenizer instead
  of shipping a regex table.
* **de Campos, Lee, Kissos, Paritosh.** *Lossless Prompt Compression via
  Dictionary-Encoding and In-Context Learning*, arXiv:2604.13066 — exact-match
  > 0.99 on LogHub 2.0 with Claude 3.7 Sonnet, plus an explicit
  "token-savings optimization criterion that prevents dictionary overhead from
  exceeding savings". Same admission principle, but the dictionary lives in the
  **system prompt**, which this repository's contract forbids.
* **Liu, Hofmann, et al.** *SuperBPE: Space Travel for Language Models*,
  COLM 2025, arXiv:2503.13423 — BPE with whitespace pretokenization cannot
  exceed 4.68 bytes/token. This is the quantitative statement of the density
  wall that makes English prose lanes decline (§D.1).
* **BPE Stays on SCRIPT**, arXiv:2505.24689 (2025) — the o200k pretokenization
  regex yields 5 193 partial-UTF-8 tokens; early merges cascade across character
  boundaries. Corroborates the measured merge-breaking result (§D.16).
* **AlphaEvolve** (Novikov et al., DeepMind 2025) and the 2026 Erdős-problem
  results (#397, #728, #1196), formally verified in Lean — not a compression
  idea, but the transferable one: *no construction counts until an external
  machine checks it.* That is why this codec ships with a CPython verifier and
  a compiler receipt rather than a narrative.

Restated from the incumbent modules because the argument needs them:

* **Charikar, Lehman, Liu, Panigrahy, Prabhakaran, Sahai, Shelat.** *The
  Smallest Grammar Problem*, STOC 2002 / IEEE TIT 51(7), 2005.
* **Delétang et al.** *Language Modeling Is Compression*, ICLR 2024 — the
  out-of-contract upper bound.
* **Harvill et al.** LTSC, arXiv:2506.00307 — token-aligned dictionary
  expansion, but with fine-tuning.
