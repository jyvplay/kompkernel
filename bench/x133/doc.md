
## X133 — ΣΥΝΑΡΜΟΓΗ / SYNARMOGE (joint span / existence / assignment search)

**One line.** Every post-frontier codec optimized ONE axis with the others frozen.
These axes are not separable — extending a rule moves every token boundary that
touches its glyph — so a pipeline stops at a coordinate optimum. ΣΥΝΑΡΜΟΓΗ runs
one local search over all of them against one objective.

### A. Formal model

**B. Admissible objects.** A frontier message `M = pre ‖ tape ‖ body`, where

```
pre   the decoder instruction line (English, ends before the first `§`)
tape  = § g₁ v₁ g₂ v₂ … gₙ vₙ      a straight-line grammar, topologically ordered
body  = ¶ + the payload, in which glyphs may appear
```

A *rule* is a pair `(gᵢ, vᵢ)`. `vᵢ` is a string over the source alphabet ∪
`{g₁..gᵢ₋₁}` — a value may reference only EARLIER glyphs (`wellFormed`). The
tape is delimiter-free: the first occurrence of each glyph begins its
definition and the text runs to the next *new* glyph, so a rule costs one
character of structure. An admissible transformation is a bijection-preserving
edit of `(gᵢ, vᵢ)ᵢ` and of `body` such that `expandContent` is unchanged.

**C. Information/access model.** The encoder sees the source exactly once and
may call the real tokenizer `countTokens` on any candidate string. The reader is
a pretrained LLM with **no fine-tuning, no system prompt, no skills file, no
added vocabulary, and a single chat message**. The reader is therefore a
*substitution machine plus an instruction follower*: it can resolve a
delimiter-free dictionary reliably (that is the frontier's own contract, and
X132 verified it), and it cannot be trusted with positional arithmetic.

**D. Resource counted.** `countTokens(message, o200k_base)` — the length of the
single delivered message. Nothing else: not bytes, not characters, not the
encoder's time.

**E. Success and failure.** Quantifier order, stated explicitly:

> ∃ a wired codec `C` such that ∀ 29 benchmark lanes `ℓ`, `C(ℓ)` is
> byte-exact **and** `countTokens(C(ℓ)) ≤ countTokens(frontier(ℓ))`,
> **and** ∃ at least one lane where the inequality is strict,
> **and** Σ over lanes is strictly lower.

ΣΥΝΑΡΜΟΓΗ meets this: Σ 12 020 → 11 961, 13 lanes improved, 0 regressed,
`exact 29/29`. It does **not** claim optimality, and §E below shows why the
remaining gap is not reachable by any substitution codec.

**F. Parameter regime.** 29 lanes, 60–5 194 raw tokens (Σ 28 015). Budgets:
`OMEGA_SYNARMOGE_MS` = 20 000 ms/lane, dated **after** the frontier encode
(which alone costs 5.5–43 s/lane). Extension candidates capped at 14 characters;
shrinks at 3; re-mine substrings 3–24 characters, top 40 by `(occ−1)·len`;
glyph candidate pool 192 characters. Tolerance: **zero** — a move that is not
byte-exact is reverted, never kept.

**G. Adjacent problems that must not be substituted.**
(i) *Tokenizer design* (BoundlessBPE, ByteSampler, Pruned BPE) — we may not
change the tokenizer.
(ii) *Lossy prompt compression* (LLMLingua, LongLLMLingua, 500xCompressor) —
wrong comparison class; a leading lossy compressor falls below 1 % Exact Match
on information-dense code completion, which is the LTSC paper's own measurement.
(iii) *Bit-level entropy coding* (arithmetic coding with an LLM prior) — reaches
20× but requires the decoder to reproduce byte-identical conditional
probabilities, which the literature itself concedes LLM inference does not
guarantee.
(iv) *Fine-tuned meta-token dictionaries* (LTSC) — we may not fine-tune.
(v) *Grammar-based compression as an offline file compressor* (Re-Pair,
RLZ-RePair) — the object there is bytes on disk with a program decoder; here the
decoder is an LLM and the cost is tokens of a self-describing message.

### H. Outcome space

- **H+ (achievable):** a strict, byte-exact Σ improvement by joint search.
  **HELD.** ΣΔ −59, measured, `exact 29/29`.
- **H− (impossible under the constraints):** a *large* further gain from any
  substitution codec. **HELD, and this turn's most important result.** X129's
  one-token floor — `gain = c·(t−1) − (1+t)`, i.e. −2 for every `c` when `t = 1`
  — is a theorem about substitution, and prose is dominated by one-token words.
  This turn additionally falsified all four known escape routes from it
  (§D items 3, 4, 5, 6). Any codec that beats the floor must stop being a
  substitution codec.
- **H∂ (boundary):** the answer changes at script/structure boundaries. The
  alphabet sweep (§D4) shows the shipped Cyrillic pool beats Georgian by +62 on
  `kb-article` and Latin-Extended-A by +450 on `code-ts` — the alphabet question
  is *decided*, not open, but it is decided per-corpus, not universally.

### C. Frontier — the open interface

**Achievability (this turn, and restated with all hypotheses).**
- Frontier, re-confirmed this turn, identical to last turn:
  **`SIGMA raw=28015 out=12020 preamble=736 tape=2915 body=8370 mismatch=0`**
  (`OMEGA_DET=1`, `OMEGA_NO_MEMO=1`, `OMEGA_ENGRAM=0`, `OMEGA_OURA_MEMO=0`,
  `OMEGA_NO_OROTHESIA=1`, 29 lanes of `bench/x109/lanes29.txt`,
  `bench/x133/receipts/x133-confirm.log`). **The frontier is exactly the
  configuration X132 reported; nothing drifted.**
- X132 ΕΥΡΟΣ (span retuning alone): ΣΔ **−41**, 11 better / 0 worse.
- **X133 ΣΥΝΑΡΜΟΓΗ (joint, wired): ΣΔ −59**, 13 better / 0 worse, `exact 29/29`
  (`bench/x133/receipts/x133-synarmoge.log`, `x133-verify29.log`).

**Impossibility.** X129's one-token floor, restated with its hypotheses: for a
value costing `t = countTokens(v)` occurring `c` times, a substitution rule
changes the message by `c·(t−1) − (1+t)`, *assuming the glyph reference costs
exactly one token and the value is spelled out once in the tape*. Under those
hypotheses `t = 1 ⇒ −2` for every `c`. The hypothesis that can fail — and is the
only route past the floor — is *the reference costs one token*: if the reference
is absorbed into a neighbouring token it costs zero, and a one-token value with
`c ≥ 3` becomes profitable.

**The exact open interface.** Glyph↔glyph adjacency: on `kb-article`, **71 of 82**
adjacent glyph pairs already merge in the shipped alphabet (X130). Glyph↔literal
adjacency: **falsified this turn across 28 scripts** (§D4). So the interface is
now: *make a glyph reference cost zero when its neighbour is ordinary text*, or
*abandon substitution*. Both remain open; this turn closes the second one's easy
variants.

### D. Negative space — sixteen shapes that look like solutions and are not

1. **A rule whose value costs one token.** Floor: −2 for every `c`. `kb-article`
   ships 24 of 27 rules of this kind (`е = " the"`, `и = " is"`, `я = "."`); they
   pay only through adjacency merges, never through occurrence count.
2. **Re-mining the body for repeated substrings.** X132's re-mine: ~0.
   This turn's token-level re-mine with **no length cap** (n ≤ 32) and
   `(occ−1)·(len−1) − 1 > 0`: **0–8 candidates per lane**, and after true pricing
   0 adds on every lane tested.
3. **True-priced rule elimination.** The obvious win, and it is real in
   principle: X131's *estimated* marginal clearing reported ~0 while the
   *measured* version of this turn appeared to find 1/18 rules on `df-h` (2 tok),
   3/23 on `psql-output` (7), 1/20 on `metrics.tsv` (3), 1/27 on `kubectl`, 1/11
   on `prices.csv`. **Those numbers are RETRACTED.** The first probe derived the
   glyph alphabet as "any character in the message absent from the source", which
   classifies the format's own markers (`=`, `k`, `H`, `,`, `;`) as glyphs and
   then "drops" them — a mis-parse whose measured gain is meaningless because no
   exactness check was run. The re-run with the miners' real alphabet
   (`bench/x133/purge.ts`) gives **0 on every lane tested**. *Detector:* any rule
   drop must be gated on `expandContent` being unchanged; without that gate a
   mis-parse reports free tokens.
4. **Changing the glyph's script.** Untested by X130 except for one
   Hebrew/Arabic trial (+63). This turn swept **28 blocks** — Cyrillic, Greek,
   Greek Extended, Latin Ext-A/B, IPA, Hebrew, Arabic, Arabic Ext, Armenian,
   Georgian, Devanagari, Bengali, Thai, Hiragana, Katakana, Hangul (Jamo and
   syllables), Fullwidth Latin (upper/lower), CJK, superscripts, Mathematical
   Alphanumerics, Braille, Ogham, Runic, Cherokee. **Every one loses**, from
   +62 (Georgian, kb-article) to +450 (LatinExtA, code-ts)
   (`bench/x133/receipts/x133-alphasweep.log`). The hypothesis that a glyph
   should share the *source's* script is **false**; glyph↔glyph merges dominate.
5. **Fusing adjacent glyph pairs** (Re-Pair on the body). Pairs already merge
   token-wise, so the fusion buys nothing.
6. **Fusing glyph RUNS of length ≥ 3.** Re-Pair only fuses pairs, so a 5-glyph
   run like `енихя` costs k = 5 tokens and looks fusable. **Falsified with a
   census**: on six lanes, 49–107 runs each, 47–101 distinct, and **every single
   recurring run has occurrence count 1** (`bench/x133/runs.ts`). Gain
   `c·(k−1) − (1+k)` is therefore −2 everywhere. The frontier has already
   collapsed every run that recurs.
7. **Tape self-encapsulation** (X131 ΕΓΚΙΒΩΤΙΣΜΌΣ): ΣΔ −4.
8. **Containment factoring**: ~0, and its candidate generation cost 30 s on
   `dpkg-l`. Deliberately excluded.
9. **Second full passes** (X131): 0.
10. **Glyph relabelling as a terminal stage** (X130): −8, space exhausted in ~5 s.
11. **Body / tape / message n-grams** (X131): 0.
12. **Derived-column elision, order tax, tape ordering** (X131): 0.
13. **Micro-optimising `scoreRunCostDeltaSlots`** (X132): output-identical by
    SHA-256 but **3.1 % slower** (77 634 ms vs 75 327 ms). Discarded. *Detector:*
    a speed claim must clear BOTH an output hash and a wall clock.
14. **Prose as a generative program.** Tempting because the stack's best lanes
    are all generative (`cue-sheet.md` 513→101, 5.1×; `prices.csv` 582→119,
    4.9×). But prose has no schema to generate from, and reconstruction from
    world knowledge is not byte-exact.
15. **Arithmetic / positional back-references** (LZ77-style, RLZ-style). The
    reader must not be trusted with positional arithmetic: frontier models are
    56–60 % at mechanical arithmetic (arXiv 2605.00817) and 50.7 % at strict
    instruction-following (MathIF, arXiv 2505.14810). Substitution is safe;
    computation is not. *This is why RLZ — Relative Lempel-Ziv — does not
    transfer here despite being the strongest new grammar-compression idea in the
    recent literature (RLZ-RePair, PMC12330530, 2025).*
16. **Speed via memoisation.** Measured: `OMEGA_NO_MEMO` on vs off is
    5 529/39 810/22 223/21 499 ms vs 5 892/42 820/22 967/21 259 ms on four lanes
    — memo is *slowly negative*, because the strings priced are almost all
    unique. Memoisation cannot help this workload.

### E. Mechanism portfolio — six distinct approaches

| # | construction | artifact | proved | unresolved interface | cheapest falsification | gap |
|---|---|---|---|---|---|---|
| 1 | span retuning: `v → v+x` legal iff every occurrence shares `x` | `euros.ts` | every move byte-exact by construction | requires unanimity across occurrences | count occurrences-with-shared-neighbour; 0 ⇒ dead | local |
| 2 | glyph assignment: rename/swap, priced on the whole message | `metonomasia` (X130) | relabelling is semantics-preserving | only within one script | sweep scripts (done: all worse) | local |
| 3 | rule elimination priced against the real tokenizer | `bench/x133/purge.ts` | drop is exact iff expansion unchanged | none — measured 0 | gate on `expandContent` | **closed (0)** |
| 4 | alphabet substitution | `bench/x133/alphasweep.ts` | bijection preserves semantics | none — measured worse | 28-block sweep (done) | **closed (negative)** |
| 5 | re-mine the body the moves just made | `synarmoge.ts` `reminePass` | new rule is exact by construction | none — measured 0 adds | token n-gram census (done) | **closed (0)** |
| 6 | **joint iterated search over 1+3+5** | `src/lib/omega/synarmoge.ts` | monotone: only strict improvements admitted; worst case is the unmodified frontier | the choice of move ORDER and pass count | run the pipeline and the joint search on the same lanes (done: −41 vs −59) | local |

Only #6 ships. #3, #4, #5 ship as *negative* artifacts with receipts, which is
the point: they are what tells the next turn not to go there.

### F–J. Artifact, adversary, verification, repair, stopping

**F. Artifacts.** `src/lib/omega/synarmoge.ts` (wired into `tagstack.ts` behind
`OMEGA_NO_SYNARMOGE=1`); receipts in `bench/x133/receipts/`:
`x133-confirm.log` (frontier re-confirmation), `x133-synarmoge.log`
(29-lane A/B vs ΕΥΡΟΣ), `x133-verify29.log` (wired, with exactness and wall
clock), `x133-alphasweep.log`, `x133-headroom.log`, `x133-leaders.json`,
plus probes `bench/x133/{headroom,purge,alphasweep,joint,runs,census,arms}.ts`.

**G. Second-order adversary.** The strongest attacker on a *joint* search is
that its extra freedom is just noise: if the axes really were separable, the
joint search must return exactly the pipeline's answer. Attacked directly by
running both on the same 29 lanes in the same process: **−57 vs −41**, with the
difference concentrated where the theory says it should be — `ls-real` −9 vs −4
(4 renames + 1 swap, unlocked after 4 extensions), `ps-aux-real` −8 vs −5
(1 drop + 1 orphan + 1 rename + 1 swap), `ls-l-real` −13 vs −11 (2 drops).
A second attacker: the joint search's `renamePass` prices `O(rules × pool)`
candidates by rebuilding the **whole** message, so on the 121-rule lane it is the
codec's dominant cost. Mitigated by the budget gate, and measured (§speed).

**H. Verification.** Byte-exactness is checked three ways, not one:
(1) `expandContent(rules, body)` must equal the target *after every admitted
move*, and a cheaper-but-inexact move is reverted; (2) where expanding the
frontier's own tape+body reproduces the source byte-for-byte the target is
**the source itself** — an absolute check against ground truth (true on
`kb-article`, `json-pkg`, `node-help`, `apt-real`); (3) at admission into the
chain, the incumbent's ΧΕΙΡΩΝ-layer expansion must be byte-identical under the
repository's own decoder, which is the chain's standard gate and is strictly
stronger than comparing `decoded` fields.

**I. Repair.** A repaired candidate inherits no trust — every gate is re-run and
one new attack is aimed at the patch. The patch that mattered this turn was the
retractions in §D3: after discovering that the glyph alphabet had been derived
too loosely, the drop test was re-implemented with the miners' real alphabet
**and** an exactness gate, and the previously reported 14–25 tokens were
withdrawn rather than shipped.

**J. Stopping.** Not stopped on "it's open". Two axes were pushed to a measured
verdict rather than an opinion (28-script sweep; 6-lane run census). What
remains open is named precisely in §C's "exact open interface", and the next
highest-information test is: *measure, per lane, the token cost of a glyph
reference as a function of its left and right neighbour class*, which converts
"make a reference cost zero" from a hope into a search over a table.

### Greedy or not?

**Greedy, and provably not optimal.** Each pass takes the first strictly
improving move per rule and iterates to a fixed point over four families. The
joint selection — which rules exist, what each covers, which character names it
— is a packing problem, and no local search is exact for it. What the greediness
*does* buy is safety: every admitted move is verified byte-exact and strictly
cheaper, so the result can never be worse than the identity, and the worst case
is the unmodified frontier. This is the same bargain X132 struck, and it is
deliberate.

### Time- or cpu-bound?

**CPU-bound.** Cost is whole-message `countTokens` probes (the profile is flat —
no frame above 5 % self time; the tokenizer family `countLongRaw`/`chunkCountFast`/
`rankAt`/`mergeCount`/`countTokens3` accounts for ~20–25 % and GC ~5 %), dominated
by `renamePass` at `O(rules × 192)` probes per sweep. Budget
`OMEGA_SYNARMOGE_MS` (default 20 000 ms), dated **after** the frontier encode —
dating it before meant the search never ran on the slow lanes, which is exactly
where it has most to look at. Opt out with `OMEGA_NO_SYNARMOGE=1`.

**Adoption cost, and the speed claim.** `synarmogeFromFrontier(base, text, enc)`
takes the frontier result the caller already holds — it must have it anyway,
since the codec returns `null` whenever it cannot beat the frontier — so the
whole joint search costs **one** frontier encode, not two. That is the same 44 %
saving X132 measured for the shared entry point (`bench/x132/speed2.ts`:
125 120 ms → 70 051 ms on 6 lanes, 6/6 identical messages), and ΣΥΝΑΡΜΟΓΗ
inherits it. Measured end-to-end overhead of the wired codec is in
`bench/x133/receipts/x133-verify29.log`.

### Result — 29 lanes, `OMEGA_DET=1`

**Σ A 12 020 → B 11 961, ΣΔ −59, 13 better / 0 worse, `exact 29/29`**
(`bench/x133/receipts/x133-verify29b.log`), and **−57** measured standalone
against the un-wired frontier (`x133-synarmoge.log`). The two differ because the
wired codec also gets to improve the message TACHYGRAFIA and the other late
chain stages have already touched.
Frontier re-confirmed: `raw=28015 out=12020 preamble=736 tape=2915 body=8370 mismatch=0`.

| lane | A | ΕΥΡΟΣ | ΣΥΝΑΡΜΟΓΗ | moves that ΕΥΡΟΣ could not make |
|---|---|---|---|---|
| ls-l-real | 1323 | −11 | **−13** | drop 2 |
| ps-aux-real | 988 | −5 | **−8** | drop 1, orphan 1, rename 1, swap 1 |
| ls-real | 422 | −4 | **−9** | rename 4, swap 1 (after 4 extensions) |
| node-help | 852 | −5 | **−6** | rename 1 |
| json-pkg | 657 | −4 | −4 | — |
| ps-ef | 299 | −3 | −3 | — |
| kubectl-get-pods | 303 | −3 | −3 | — |
| apt-real | 816 | −2 | **−3** | drop 1 |
| code-ts | 950 | 0 | **−1** | rename 1 |
| metrics.tsv | 198 | 0 | **−1** | rename 1 |
| psql-output | 230 | 0 | **−1** | rename 1 |
| dpkg-l | 624 | −1 | −1 | — |
| prices.csv | 119 | −1 | −1 | — |

**−59 is 1.44× X132's −41 and 7× X130's −8**, and unlike X132 the improvement is
not confined to the lanes ΕΥΡΟΣ already won: four lanes move from no-gain to
gain.

### Can the LLM decode it natively?

ΣΥΝΑΡΜΟΓΗ changes only three things: which characters name the rules, how far
each rule's span reaches, and whether a rule exists. **The contract is
untouched** — the same `k=v`, delimiter-free, "expand repeatedly" format, the
same instruction line, the same single chat message, no skills file and no
system prompt. The tape is still topologically ordered (`wellFormed`), so the
reader still resolves it left to right with one substitution pass. Relative to
the frontier, the reader is asked to do *less* work where a rule is dropped
(fewer substitutions) and the *same* work everywhere else.

### Generalized local leaders — prose, code/structured, ops/tabular

Body-token census over the 27 lanes that emit a tape, classified with a
**derived** glyph alphabet (a glyph is a character present in the message and
absent from the source — the same rule the miners use to pick ids, so
non-Cyrillic alphabets are not missed the way X131 missed them). Receipt:
`bench/x133/receipts/x133-headroom.log`, table `x133-leaders.json`.

| lane | category | body | glyph % | word % | num % | other % | leader |
|---|---|---:|---:|---:|---:|---:|---|
| kb-article | PROSE | 554 | 30.0 | **67.0** | 0.4 | 2.7 | word |
| email-thread | PROSE | 353 | 26.1 | **60.6** | 7.4 | 5.9 | word |
| llm-answer.md | PROSE | 568 | 21.0 | **57.4** | 3.7 | 18.0 | word |
| node-help | PROSE | 725 | 22.2 | **66.3** | 1.8 | 9.7 | word |
| apt-real | PROSE | 621 | **49.6** | 39.1 | 7.4 | 3.9 | **glyph** |
| **PROSE subtotal** | | **2821** | **30 %** | **58 %** | **4 %** | **8 %** | **word** |
| code-ts | CODE/STRUCT | 703 | 36.6 | **44.5** | 0.6 | 18.3 | word |
| json-pkg | CODE/STRUCT | 514 | 36.6 | **51.4** | 4.3 | 7.8 | word |
| dpkg-l | CODE/STRUCT | 517 | 25.0 | **56.9** | 5.4 | 12.8 | word |
| unified-diff | CODE/STRUCT | 272 | 26.1 | **29.8** | 17.6 | 26.5 | word |
| **CODE/STRUCT subtotal** | | **2006** | **32 %** | **47 %** | **5 %** | **15 %** | **word** |
| vmstat | OPS | 98 | 19.4 | **32.7** | 19.4 | 28.6 | word |
| df-h | OPS | 60 | 25.0 | **35.0** | 15.0 | 25.0 | word |
| df-real | OPS | 78 | 20.5 | **32.1** | 20.5 | 26.9 | word |
| du-real | OPS | 177 | 28.2 | 18.6 | **41.8** | 11.3 | **num** |
| findmnt | OPS | 283 | 17.7 | **60.1** | 9.5 | 12.7 | word |
| ps-ef | OPS | 210 | 37.6 | **40.0** | 17.1 | 5.2 | word |
| ps-real | OPS | 283 | 32.2 | **37.1** | 15.5 | 15.2 | word |
| ps-aux-real | OPS | 668 | **40.1** | 33.4 | 17.5 | 9.0 | **glyph** |
| kubectl-get-pods | OPS | 210 | 32.9 | 26.2 | **37.6** | 3.3 | **num** |
| psql-output | OPS | 107 | **54.2** | 8.4 | 28.0 | 9.3 | **glyph** |
| markdown-table | OPS | 114 | **41.2** | 21.9 | 28.1 | 8.8 | **glyph** |
| prices.csv | OPS | 49 | **40.8** | 22.4 | 24.5 | 12.2 | **glyph** |
| metrics.tsv | OPS | 123 | **55.3** | 12.2 | 25.2 | 7.3 | **glyph** |
| ls-real | OPS | 258 | **39.5** | 34.1 | 22.9 | 3.5 | **glyph** |
| ls-l-real | OPS | 727 | **47.7** | 17.5 | 29.6 | 5.2 | **glyph** |
| **OPS subtotal** | | **3445** | **38 %** | **30 %** | **23 %** | **9 %** | **glyph** |
| **ALL** | | **8272** | **34 %** | **44 %** | **12 %** | **10 %** | word |

Read it as a statement about which mechanism can still bite where:

- **PROSE is word-dominated (58 %) and that is exactly the part no dictionary
  can reach.** Four of five prose lanes are `word`-led at 57–67 %, and those are
  the four lanes with the worst ratios in the whole corpus (kb-article 1.06×,
  llm-answer 1.10×, email-thread 1.29×, node-help 1.29×). `apt-real` is the
  exception at 49.6 % glyph and is the best-compressing prose lane.
- **OPS is glyph-dominated (38 %) with a strong `num` tail (23 %)**, and its
  leadership splits three ways — `glyph` on 7 lanes, `word` on 5, `num` on 2.
  This is where the dictionary earns its keep, and it is where the corpus's best
  ratios live.
- **CODE/STRUCT is the `other`-richest group (15 %)** — punctuation, symbols and
  indentation — and is `word`-led. `code-ts` is 18.3 % `other`, the single
  largest `other` share in the corpus.
- **The frontier's strength tracks the leader, not the size.** Every lane whose
  leader is `glyph` or `num` compresses ≥ 2.4×; every lane whose leader is
  `word` with >55 % word share compresses ≤ 1.3×. That is the one-token floor
  showing up in the data.

(Caveat, stated rather than hidden: this census classifies the format's own
markers `¶` and `§` as glyph characters, since they too are absent from the
source. X132's `anatomy.ts` excludes them and reports glyph 2 701 (32 %) against
this run's 2 790 (34 %). The two agree to within 3 %; the leaders are unchanged.)

### Frontier-lab mathematics, evaluated individually and honestly (read 2026-11-14)

The standing question is whether any of it licenses a new compression
mechanism. **It does not, and the honest reason is worth stating:** every one of
these results is a *theorem-proving* achievement, and a codec is not a theorem.
What transfers is the **verification discipline**, not any result.

**OpenAI** — 6 Oct 2026, 721–722 manuscripts in 372–373 result families from an
unreleased model. Headline: the **quasi-Riemann hypothesis**, no zeta zeros with
real part > 7/8 (199 pages, Lean-verified) and a companion 1/12–11/12 strip
(49 pages, **not** Lean-verified, human-edited by someone OpenAI has not named).
Also claimed: Unique Games Conjecture, Mahler (both forms, all dimensions),
Kaplansky zero-divisor (disproved), free-group-factor isomorphism, plus a
Basic-SDP NP-hardness result that **bypasses** UGC and rests on P ≠ NP alone.
**Scorecard:** ~42 % of top-line results have machine-checked Lean entries;
**3 manuscripts withdrawn the next day** (Weil classes, Kuga-Satake, rational
Hodge for K3 products) because **one sign error broke one paper and the two that
depended on it**; 14 more revised within 24 hours. Stanford's Jared Duker
Lichtman calls the quasi-Riemann result the most significant AI mathematics
achievement so far; Princeton's Peter Sarnak declines to call it a theorem until
humans check every detail. **The Riemann hypothesis is not proved** — the Clay
Institute still lists it Unsolved (read 2026-11-14), and Anthropic says its own
technique has no path to it.

**Anthropic / Claude** — 10 Aug 2026, raised the proven share of zeta zeros on
the critical line from **41.6 % → 67.2 %** (Lean, reviewed internally by Alpöge
and Furman, externally by Conrey and Goldston). A real bound; **not** the
hypothesis. Jul 2026: the **Jacobian conjecture disproved in dimension ≥ 3**,
found by Levent Alpöge with Claude Fable 5, Lean by Paul Lezeau — the strongest
counterexample on the list because it is a single map anyone can check.
Sep 2026: FLT formalised in Lean (~13 M lines) — *verification, not discovery*.

**Google DeepMind** — 9/353 Erdős problems and 44/492 OEIS conjectures via
AlphaProof Nexus, at a few hundred dollars per problem; IMO 2025 gold (35/42),
graded by IMO coordinators. Erdős #1051 and #652 via Aletheia (Gemini Deep
Think). AlphaEvolve: 67 problems, 23 improved, 36 matched, 8 not matched.

**Harmonic (Aristotle)** — IMO 2025 gold, **5 of 6 problems with formally
verified Lean proofs**; Erdős #124 solved in ~6 hours with the Lean check taking
about a minute; #1 on ProofBench. Notably, on 27 Oct 2026 Harmonic extended the
same machinery from theorems to **code**: 96.8 % on VERINA (a UC Berkeley/Meta
benchmark), proving 160 of 189 C specifications correct and **finding 23
false**; the DIII-D fusion lab rebuilt part of its reactor-control software in
four hours from one paper and a 254-word prompt.

**Axiom Math (AxiomProver)** — Carina Hong's lab, $264 M raised at a $1.6 B
valuation. Fel's conjecture on syzygies of numerical semigroups; Conjecture A.10
in "Parity of k-differentials"; "almost all primes are partially regular"; a
130-year-old problem; a disproof of a 30-year-old conjecture; and (Fortune,
June 2026) a formal verification of an economics theorem taught for ~50 years
that nobody had ever actually proved.

**Others** — DeepSeek-Prover-V2 (arXiv 2504.21801): 88.9 % on MiniF2F-test,
49/658 PutnamBench. Kimina-Prover (Numina/Kimi, arXiv 2504.11354) built its
informal↔formal alignment set with Claude, noting that of several LLMs tried
"only Claude's performance is satisfying". The Erdős–Gallai cycle-decomposition
conjecture now has a preprint by Kim (ChatGPT + Claude assistance) *and* a
separate AI-generated, Lean-formalized route from OpenAI. The **bunkbed
conjecture is false** — an explicit 7 222-vertex planar graph, peer-reviewed,
with no disclosed AI role.

**What actually transfers — three things, all methodological.**

1. **A claimed gain is not a verified gain.** Three manuscripts died of one sign
   error; 14 were revised in a day. Our analogue is the check this turn ran and
   then *retracted*: a rule-drop probe reported 14–25 tokens of gain until the
   glyph alphabet was derived correctly and an exactness gate was added, at
   which point the gain was 0 (§D3). Both are the same lesson. Tao's community
   hub (24 Oct 2026) exists precisely because the write-ups "can be difficult to
   understand and can have incomplete citations" — which is also why this repo
   logs receipts next to claims.
2. **Make the check mechanical, then trust it absolutely.** Harmonic's move from
   theorems to C code (96.8 % VERINA, and 23 specs *falsified*) is the same
   instinct as `expandContent == source`: an oracle that can say no is worth
   more than a model that says yes.
3. **The capability asymmetry is unchanged, and it is the design constraint.**
   Frontier models are superb at semantic and symbolic reasoning and still only
   **56–60 % at mechanical arithmetic** (arXiv 2605.00817) and **50.7 % at
   strict instruction-following** (MathIF, arXiv 2505.14810). **Substitution is
   safe; computation is not.** That single fact is why RLZ — Relative Lempel-Ziv,
   the strongest recent idea in grammar compression (RLZ-RePair, PMC12330530,
   2025) — does **not** transfer here: its phrases are `(start, length)` pairs
   into a reference string, and resolving them is exactly the positional
   arithmetic an LLM cannot be trusted with. It is also why every move in
   ΣΥΝΑΡΜΟΓΗ is pure substitution verified by full expansion.

### Source citation (honest)

No paper was imported into the mechanism; the joint search is not in the
literature because the literature has no "post-frontier codec for a frozen LLM
reader" setting. What is real prior art, and what is ours:

- **LTSC — Lossless Token Sequence Compression via Meta-Tokens** (arXiv
  2506.00307). The closest analogue. It derives the same profitability
  inequality this stack uses — a subsequence of length ℓ occurring n times costs
  ℓ·n tokens versus ℓ+n with a dictionary entry — and reports 18–27 % length
  reduction. **Two honest caveats that make our problem strictly harder:** it
  fine-tunes the reader, and it adds vocabulary. We may do neither. Against
  that, this frontier reaches 2.33× overall.
- **Grammar-based compression**: Re-Pair (Larsson & Moffat 1999), the smallest
  grammar problem, and **RLZ-RePair** (PMC12330530, 2025) — the closest recent
  work, and the one that most nearly fits, except that its phrases are numeric
  pointers and therefore unusable by an LLM reader (see above).
- **Bieniawski, "Assembly Theory and the Smallest Grammar Problem"**
  (arXiv 2608.19228) — the nearest framing in print for treating a grammar's
  tied-digram resolution order as a searchable degree of freedom, which is the
  abstract ancestor of the joint move here.
- **Tokenizer-boundary work** (BoundlessBPE ~20 % better bytes/token;
  ByteSampler arXiv 2506.14123; Pruned BPE arXiv 2608.00837) — all *tokenizer
  design* papers; the transfer to a reversible pre-stage is X129's and is not
  repeated as a citation of support.
- **Ours**: the joint formulation; the measurement that the axes are coupled
  (−57 vs −41 on the same lanes); the 28-script alphabet sweep; the glyph-run
  occurrence census; the retraction in §D3; and the local-window rename screen.

### Speed: the codec costs 5.2 %, not 100 %

The obvious way to write a post-frontier codec is `codec(text)`: encode with the
frontier, then search. That costs **two** frontier encodes. Since the frontier
encode is 5.5–43 s per lane and dominates the stack, that would double the
stack's runtime. `synarmogeFromFrontier(base, text, enc)` instead takes the
frontier result the caller already holds — and it must hold one anyway, because
the codec returns `null` whenever it cannot beat the frontier and the caller has
to fall back to it.

Measured (`bench/x133/tune.ts`, frontier encode `F` and search `S` timed
separately on the un-optimized frontier):

| lane | F (frontier) | S (search) | naive 2F+S | shipped F+S | saving |
|---|---:|---:|---:|---:|---:|
| node-help | 22 356 ms | 1 837 ms | 46 549 ms | 24 193 ms | **48.0 %** |
| ps-aux-real | 67 263 ms | 6 582 ms | 141 108 ms | 73 845 ms | **47.7 %** |
| apt-real | 118 153 ms | 3 445 ms | 239 751 ms | 121 598 ms | **49.3 %** |
| code-ts | 39 953 ms | 4 650 ms | 84 556 ms | 44 603 ms | **47.3 %** |

**~48 % cheaper to adopt the codec than the naive form** — the same order as the
44 % X132 measured for the shared entry point on ΕΥΡΟΣ.

End-to-end, wired, over all 29 lanes (`bench/x133/receipts/x133-verify29b.log`):

```
WALL CLOCK  A(no SYNA)=1013927ms  B(SYNA)=1066623ms  overhead=5.20%
```

So the full joint search — four move families, up to eight passes, priced on the
real tokenizer — costs **5.2 %** of the stack while returning −59 tokens.

**A speed hypothesis that failed, recorded.** The rename pass rebuilds and
tokenizes the whole message for every (rule × candidate) pair, which measured
**+12 s on node-help, a 55 % overhead**. It was attacked with a local-window
screen: BPE merges are local, so price a ±32-character window around the glyph's
occurrences and only price the full message for the candidates the screen ranks
first. **Measured neutral** (node-help 22 121→34 297 ms before, 22 059→35 056 ms
after). The screen is kept — it is a safe ranking heuristic and the winner is
still priced and admitted on the full message — but it is **not** claimed as a
speed win. The cost turned out to be spread across all four move families, each
doing full-message prices, not concentrated in the rename pass. Pass count and
pool size are exposed as `OMEGA_SYNARMOGE_PASSES` and `OMEGA_SYNARMOGE_POOL`:
measured `4/96` retains the full gain on 3 of 4 lanes at 1.4–2.5× less cost but
**loses code-ts's −1**, so the default stays at `8/192`.

### Codec design-spec table (the abbreviation decoded)

| field | value |
|---|---|
| Greek name | ΣΥΝΑΡΜΟΓΗ — "joint fitting", "articulation" |
| file | `src/lib/omega/synarmoge.ts` |
| entry point | `synarmogeFromFrontier(base, text, enc)` |
| wired | last stage of `tagstackX74ChainMeasured`, under the chain's ΧΕΙΡΩΝ-expansion gate |
| greedy? | **yes** — steepest-ascent over a bounded neighbourhood, 4 families, ≤8 passes; **not** optimal (joint rule selection is a packing problem) |
| move families | span extend/shrink · rule drop · glyph rename/swap · re-mine the current body |
| objective | `countTokens(whole message, o200k_base)`, one shared objective for all families |
| admission | well-formed **and** byte-exact **and** strictly cheaper; else reverted |
| exactness target | the **source itself** where the frontier's tape+body expands to it (measured true on kb-article, json-pkg, node-help, apt-real); else the frontier's own expansion |
| time- or cpu-bound? | **cpu-bound** — whole-message `countTokens` probes |
| budget | `OMEGA_SYNARMOGE_MS` = 20 000 ms/lane, dated **after** the frontier encode |
| opt out | `OMEGA_NO_SYNARMOGE=1` |
| debug | `OMEGA_SYNARMOGE_DEBUG=1` |
| knobs | `OMEGA_SYNARMOGE_PASSES` (8), `OMEGA_SYNARMOGE_POOL` (192) |
| worst case | the unmodified frontier message — no lane can regress |

### What the next turn should do

The substitution paradigm is at a measured local optimum, and this turn closed
four of the routes out of it (§D 2, 3, 4, 6). The one that remains open is named
precisely in §C. The next highest-information test is cheap and concrete:

> For every lane, tabulate `countTokens` of a glyph reference as a function of
> the **class** of its left and right neighbour (Latin word / digit / punctuation
> / newline / another glyph). That converts "make a glyph reference cost zero"
> from a hope into a search over a table, and it is the only remaining way past
> X129's one-token floor inside this contract.
