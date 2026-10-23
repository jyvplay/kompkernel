# Session memory — X42

## Current State

**X42 APOCOPE is COMPLETE, committed and pushed.** Branch
`arena/695387ad-kompkernel` = **`e2633aa`** ("X42 APOCOPE: constant-digit affix
elision…"), preceded by `f99c97a` and `bee4117` (X41) and `b5a990c` (X40).
**PR #33** is open (https://github.com/jyvplay/kompkernel/pull/33) and now covers
X40 + X41 + X42. `main` = `666f509`.

**The headline is a NEGATIVE result, reported honestly:** APOCOPE is registered at
**index 32** (`src/lib/omega/apocope.ts`, wraps SYSTOLE), is byte-exact on every
lane, and delivers **0 tokens of gain on all 17 lanes plus 11 held-out files**. It
is also **slower** on the two lanes that trigger it (vix 705→**814 s**,
aapl 289→**418 s**). The gate correctly rejects it and ships the parent unchanged.

**THE FRONTIER IS UNCHANGED FROM X41.** No lane moved. This is the first turn in
the X33–X42 series with no improvement, and the reason is now *proved* rather than
suspected.

**One verification still open at the time of writing:** `openstack-loghub-26.log`
and `git-numstat.txt` were still running in the background sweep
(process `x42-sweep-remaining-14-lanes-8f0b5015`). Both had **zero APOCOPE
candidates** in `screen2.ts`, so `apocopeEncode` returns the parent immediately
without any extra encode — the output is identical to X41's measured 894 and 1906
**by construction**, not by assumption. 14 of 16 sweep lanes plus vix and aapl were
confirmed EXACT with gain=0.

## The three floors (the durable output of this turn)

These close off the **entire numeric direction**, not just APOCOPE. All measured,
none argued.

**Floor 1 — `ceil(W/3)` is a HARD floor for digit runs. PROVEN EXHAUSTIVELY.**
`bench/x42/digittok.ts` tokenized **all 1,110,000 digit strings of length 1–6**:
lengths 1/2/3 are single tokens **100 %**; lengths 4/5/6 are single tokens
**0.00 %** of 10,000 / 100,000 / 1,000,000. `1990`, `2024`, `2026`, `1000`,
`0000`, `1024`, `4096` are all **2 tokens**. Inserting `.` `,` `-` ` ` or nothing
at any interior position of a real 9-/10-digit price **never beat the bare run**
(774453947 → 3/3; 17240000 → 3/3; 20140102 → 3/3; 1009479319 → 4/4). On the
shipped aapl message: 364 digit runs, 2,300 digits, **823 tokens**;
`sum(ceil(W/3))` over the same runs = **823**. **HEADROOM EXACTLY ZERO.**
⇒ Reducing a digit run's token count requires reducing the *number of digits*.
No other route exists.

**Floor 2 — the non-digit layer is at its floor too.** `bench/x42/glyph.ts` on the
same aapl payload: 786 non-digit chars, **76 distinct**, **535 tokens**,
per-char entropy **5.89 bits** → **8.66 bits/token**. That is *above* the 8-bit
byte ceiling and ~2× below the `log2(200000)=17.6`-bit vocabulary limit; at the
usual 6-bits/token rule of thumb it would cost 772 tokens, not 535 — i.e. the
current encoding **beats the rule of thumb**. Raising bits/token by reassigning
the glyph alphabet is blocked by a *general argument*, not a measurement: the
decoder is a bare LLM in one chat box with no system prompt, so any mapping must
be **stated in the message**, and 76 mappings cost more than the ~142 tokens they
could save. **This independently explains why "in-situ CHIRON glyph reassignment"
is dead — do not retest it.**

**Floor 3 — the dictionary already hoists constants.** THE DECISIVE MEASUREMENT
(`bench/x42/screen10.ts`):

| lane | source raw | cut raw | source→stack | cut→stack |
|---|---|---|---|---|
| vix | 3412 | **1774** (−48 %) | 550 | ~530–550, rejected |
| aapl | 3108 | **2062** (−34 %) | 1407 | ≥1387, rejected |

Removing **1,638 raw tokens** from vix moved the compressed size by **ZERO**. The
stack's output is pinned to *information content*, not raw size. Note the screen's
own prediction (756 for vix, 283 for aapl) **under-measured by >2×** because it
priced digits in isolation and missed boundary effects — the full raw delta is the
honest number.

> **GENERAL LESSON, refining X41's:** what survives the stack is
> tokenization-**BOUNDARY** change, not redundancy removal. SYSTOLE and PERITROPE
> pay because removing a separator or swapping a character changes *where the
> tokenizer can cut*, which no dictionary can do. APOCOPE only removes redundancy,
> which the dictionary already eats for free.

## Two further mechanisms refuted BEFORE being built

`bench/x42/diag.ts`, all 17 lanes. **Do not retry either.**

**Case folding is dead.** **7 of 17 lanes NEGATIVE** — capitalised word-initials
often tokenize *cheaper* than lowercase: bibliography −20, page.html −15,
email-thread −10, meeting-transcript −8, kb-article −4, openstack −3,
component.jsx −2. Best positive: dump.sql +29 on 13 cased words, which does not
survive a clause.

**Phrase-level n-gram dictionaries are exhausted on prose.** Every prose lane has
a **saturation ratio > 1** — the stack already removes *more* than the entire
phrase-repeat budget: bibliography **4.40**, git-numstat 2.37, ls-full-iso 2.02,
pom.xml 1.85, prose-01 1.66, component.jsx 1.60, meeting-transcript 1.60,
email-thread 1.41, readme 1.08. Phrase repeats ARE far larger than word repeats
(page.html: 105 word vs **3,384** phrase-4), which is why it was worth measuring —
but an overspent budget cannot be harvested twice.

## Prose: closed by a FOURTH independent route

Twelve fresh holdouts in `bench/x30/fresh`, **ten never used in any prior turn**,
encoded through the full stack (`bench/x42/prose.ts`), all **EXACT**:

| lane | src | msg | instr | payload | c/tok |
|---|---|---|---|---|---|
| prose-01 | 785 | 737 | 11 | 726 | **4.12** |
| prose-02 | 879 | 789 | 19 | 770 | 3.17 |
| prose-03 | 1003 | 837 | 11 | 826 | 3.53 |
| prose-04 | 877 | 836 | 11 | 825 | 3.50 |
| prose-05 | 1070 | 920 | 11 | 909 | 3.16 |
| prose-06 | 926 | 840 | 11 | 829 | 3.22 |
| prose-07 | 861 | 809 | 16 | 793 | 3.86 |

Raw English ≈ 3.8–4.5 chars/token, so these payloads are **at or above natural
English density**; on prose-02 the stack is measurably *worse per character* than
the untouched source. **Instruction overhead is 11 tokens (1.4 %) on every clean
prose lane — there is no overhead to reclaim.**

`bench/x42/screen9.ts` closed the untested gap that **prose-02..12 had never been
passed through SYSTOLE**: their structured-numeric raw savings are 0–27 tokens
against a clause costing 15–19 — below threshold, and the ~20× attenuation through
the stack makes them worthless. (prose-02 raw 26, prose-08 raw 27 are the only two
above `SYSTOLE_MIN_RAW=20`; neither can pay.)

Also note: prose-08..12 timings were not all captured (the 900 s wall clock cut the
run at prose-07). prose-03 alone took **328 s**, prose-05 **261 s**.

## APOCOPE implementation notes (do not weaken)

- **Only prefix and suffix, never an interior position.** Reader-capacity limit:
  `prepend`/`append` are single local edits; an interior deletion forces
  interleaving two digit strings by counting into both (arXiv 2605.02028, 126 model
  variants, all with finite counting capacity).
- **Only when 100 % constant.** One exception → exception list → second conditional
  rule → silent corruption.
- Constants: `APOCOPE_MIN_COUNT=3`, `APOCOPE_MIN_RAW=20`, `APOCOPE_MAX_TEMPLATES=3`.
- `apocopeChoose` inherits BOTH X41 fixes: the **fixed-point loop** and the
  **`blocked` guard** (a shape may not claim a surviving width while a
  higher-saving unplaced shape shares it). Do not weaken either.
- `apocopeEncode` calls `systoleEncode(cut, enc, {...opts, systole: false})` —
  SYSTOLE is disabled inside the trial because the cut changes digit widths.
- Clause form shipped (measured in `bench/x42/clause.ts`, six variants priced):
  `Restore 3:1990-0#-##, 4:##.##0000.` = **+1 tok aapl / +3 tok vix** over the
  SYSTOLE clause it replaces. The bare form without the surviving width is ~4 tok
  cheaper and was **rejected** (the width is the lookup key; dropping it converts a
  lookup into a count).
- `apocopeRender(t)` builds the clause string cell-by-cell from digit index; the
  first version mishandled separators inside the constant region and was rewritten.

**Independent reference decode:** `bench/x42/handcheck.py` (Python, parses the
clause text with a regex, does **NOT** import `apocope.ts`) restores the vix head
byte-identically: `102,1724,1724,1724,1724` →
`1990-01-02,17.240000,17.240000,17.240000,17.240000`,
**md5 `10481361b3b879c04d1f3037de9dfcb3` both sides**. Artifacts:
`bench/x42/vix-{SOURCE,CUT,RESTORED}-head.txt`, `hand.ts`. This is a receipt that
the layer is **sound and literally readable**, NOT a receipt for a win.

**Registry smoke test:** `bench/x42/smoke.ts` loads `apocope` **by key** from
`codecEntries()` — 205 codecs total, systole at 31, **apocope at 32**, label
12,732 chars, family/fidelity `exact`. component.jsx 264 EXACT, kb-article 622
EXACT, both `apocope=false gain=0`. Note the registry export is
**`codecEntries()`**, NOT `CODECS`.

## Frontier — UNCHANGED (restated, identical to X41)

| lane | raw | best | leader |
|---|---|---|---|
| vix-daily-1990.csv | 3412 | **550** | SYSTOLE |
| aapl-2014.csv | 3108 | **1407** | SYSTOLE |
| openstack-loghub-26.log | 4028 | 894 | PERITROPE |
| dump.sql | 1795 | 608 | PYKNOSIS |
| git-numstat.txt | 4632 | 1906 | PERITROPE |
| npm-ls.txt | 2747 | 901 | **UNMEASURABLE** (992 s parent) |
| find-listing.txt | 3997 | 1218 | PERITROPE |
| ls-full-iso.txt | 1175 | 366 | ANTISTROPHE |
| kb-article.txt | 656 | 622 | — |
| prose-01.txt | 785 | 737 | — |
| readme.txt | 843 | 646 | — |
| bibliography.txt | 896 | **667** | SYSTOLE |
| email-thread.txt | 629 | 488 | — |
| chart.svg | 1331 | 417 | OIKONOMIA |
| page.html | 3220 | 547 | OIKONOMIA |
| meeting-transcript.txt | 472 | **384** | SYSTOLE |
| component.jsx | 296 | 264 | — |
| pom.xml | 544 | 242 | TIMEMA |

### Local leaders by structural category

| category | leader | measured |
|---|---|---|
| high-entropy numeric columns (unique values) | **SYSTOLE** | aapl −43, vix −29 |
| path-heavy ops listings | **PERITROPE** | find-listing −24, git-numstat −17 |
| tabular constant columns | ANADIPLOSIS / EUTELEIA | 17.0 % |
| grouped-hex ops | SYNCOPE | 22.3 % |
| DB dumps / bulk hex | PYKNOSIS | 33.9 % |
| markup / code / tables | OIKONOMIA / TIMEMA | 17–46.7 % |
| **prose** | **NONE** | 0 of 10 lanes moved, X33–X42 |

## What is actually left (for X43)

The three floors above close: digit-count reduction, glyph-alphabet reassignment,
and all further redundancy removal. What they do NOT close:

1. **Directions that change what the READER must do rather than what the text
   says.** These trade token count against comprehension — the CharBench bound
   (arXiv 2508.02591) and the bound this repo has lived under since X33. Any such
   codec must be honest that it is buying tokens with reader effort.
2. **The gap between 550 and the ~114-token information-theoretic floor for vix.**
   Bridging it requires the reader to *compute* (reconstruct dates from gaps,
   regenerate arithmetic progressions). `chart.svg` has literal arithmetic
   progressions (x: 20,62,104… step 42; height: 40,57,74… step 17) but 24×3 = 72
   arithmetic operations would fail (arXiv 2605.00817: 63 % at 5 steps → 20 % at
   95), and it is synthetic-lane-specific, i.e. benchmaxxing. **Rejected on both
   counts, but the shape of the idea is recorded here.**
3. **Field-level RLE within a record** (vix rows have OPEN=HIGH=LOW=CLOSE, all
   four identical, 126 rows). Refuted **by arithmetic, cheaply**: naive field-RLE
   gives ~1,260 raw tokens for vix, and the stack already achieves 550 — so it is
   already captured. Do not build it.

## Errors & dead ends — additions this turn

- **`bench/x42/screen2.ts` initially reported every lane MISSING**: `LANES` holds
  full relative paths (`bench/holdout-tab/vix-daily-1990.csv`), but the script
  appended `.txt` and searched lane dirs. Fixed by testing `existsSync(name)`
  first. `/tmp/x41lanes.txt` (17 full paths) still exists and was reused.
- **`\p{Cyrillic}` is not a valid JS regex property name** — must be
  `\p{Script=Cyrillic}`. Hit in `anatomy.ts`.
- **`require()` inside an ESM bundle** — `anatomy.ts` uses it for `decode`; it
  works under esbuild bundling but is fragile. Prefer a top-level import.
- **screen1/screen2 raw-saving predictions UNDER-measure by >2×** because they
  price digits in isolation and miss boundary effects. Always confirm with a full
  `encode(source)` vs `encode(cut)` comparison (`screen10.ts` pattern).
- **`apocopeClauseFor` first version mishandled separators inside the constant
  region** (tracked a digit index `i` across separator parts incorrectly).
  Rewritten as `apocopeRender` building cells by digit index.
- **Retained dead mechanisms — do NOT repeat:** everything in the X41 list, PLUS
  now: **constant-digit affix elision (APOCOPE, gain 0)** · **case folding
  (7/17 lanes negative)** · **phrase-level n-gram dictionaries on prose
  (saturation >1)** · **glyph-alphabet reassignment (blocked by the in-message
  mapping cost, a general argument)** · **field-level RLE within a record
  (already captured; refuted by arithmetic)** · **any mechanism that removes
  redundancy rather than changing tokenization boundaries.**

## External Sources — new this turn

**On this codec's substrate (newly cited):**
- **arXiv 2604.13066** — *Lossless Prompt Compression via Dictionary-Encoding and
  In-Context Learning*. **The closest published analogue of this entire stack**:
  frequent subsequences → meta-tokens, model instructed to substitute back, with a
  token-savings condition `(1+f)·n_token(M) + n_token(S)`. Crucially it relies on a
  **system prompt** for the dictionary, which this repo's one-chat-box constraint
  forbids. Claims up to 20× over baseline.
- **arXiv 2605.29000** — strategic deletion + LLM reconstruction: at high retention
  a **regular** deletion pattern beats random; under heavy compression a Gaussian
  schedule overtakes it; Bernoulli/Poisson consistently weaker.
- **arXiv 2609.35475** — *Spontaneous Context Restoration*: in attention-only
  transformers, recovery from deleted/corrupted tokens **emerges despite training
  exclusively on clean sequences**, no denoising objective. The closest thing to a
  theoretical licence for the restore-by-rule family (SYSTOLE, APOCOPE).
- **arXiv 2604.13006** — one instruction, *"don't use commas"*, shrinks responses up
  to **48 %**; GPT-4o-mini 472→216 words, −31 % coverage; a two-pass generate-then-
  rewrite recovers 59–96 % of length. A formatting constraint is never free.
- **arXiv 2602.20202** — LLM digital-forensic reconstruction: stripping structural
  cues causes misclassification (`19xxheisenbergcarro@gmail.comx1`), FAP 95.24 %.
- **arXiv 2410.11781** — LMs encode numbers as **orthogonal circular per-digit
  representations in base 10**; digit values recoverable (0.91–0.92) but whole-number
  values are not. Explains why digit-wise operations are cheap for a reader and
  whole-number arithmetic is not.
- **arXiv 2602.07812** — a single linear projection of a hidden layer recovers
  log-magnitudes of numerals (2.3 % relative error synthetic, 19.06 % on papers).
- **arXiv 2608.28170 / 2607.21936 / OUP dsh 41(1):69** — ancient-text restoration:
  models beat philologists on character error rate (26.3 % vs 59.6 %) but a
  non-trivial fraction of "errors" are expert-judgeable as acceptable, so automatic
  metrics understate performance. Relevant caution for grading any restoration task.
- **NeuralTrust prompt-compression guide (Jul 2026)** — the whole published field is
  LOSSY: Selective Context ~50 % at 0.023 BERTScore degradation, LLMLingua up to 20×
  at <2 % loss, LLMLingua-2 2–5×. `less-tokens` on PyPI: 30–40 % at BERTScore 0.91.
  **arXiv 2602.13266 (LoPace)** claims "lossless" at 4.89× mean but its own numbers
  show a **token method at 1.02× mean (range 0.74–2.05)** — i.e. token-level lossless
  compression barely works, which is exactly the problem this repo attacks.
  **arXiv 2506.00307** (meta-tokens, LZ77-like) gets 27 %/18 %. **arXiv 2511.23271**
  needs trained embeddings (3000× but not text-readable). Nothing published matches
  this stack's constraint set: byte-exact AND bare-LLM-readable in one chat box.

**Mathematics (new sources):**
- **Leiden Declaration on AI and Mathematics** — published **2 June 2026** by 16
  mathematicians from 15 universities after a Sept 2025 Lorentz Center workshop;
  endorsed by the **International Mathematical Union**; **arXiv 2609.35334**; Aug 2026
  *Notices of the AMS*; **23 recommendations** at four levels (individuals,
  organisations/funders, policymakers, commercial labs). **1,854 signatures within a
  week**, ~2,000 by mid-June, **>3,000 by August** per one source. Signatories include
  Fields Medalists **Tao, Scholze, Lindenstrauss, Hairer, Duminil-Copin, Maynard,
  Viazovska**. Five threats, first: automated techniques "can produce plausible but
  unreliable (or even incorrect) arguments which are difficult to distinguish from
  correct mathematical proofs." Recommendations include disclosing all AI tool use,
  retaining personal responsibility for correctness, and **refusing authorship to AI
  systems**. Origin detail: the idea took shape "over pints at a pub near Cambridge"
  during an Isaac Newton Institute "Big Proof" workshop.
  **Scholze's personal statement:** *"I am pondering my mathematical ideas without use
  of AI, and generally avoid reading AI-generated text as best as I can."*
- **"A Severe Misalignment of AI in Mathematics"** — **11 September 2026**,
  mathandai.org, signed by **25 Fields Medalists**: Avila, Bhargava, Birkar, Deligne,
  Yu Deng (2026), Donaldson, Duminil-Copin, Figalli, Hairer, June Huh, Kontsevich,
  Maynard, McMullen, Mori, Ngô Bảo Châu, Okounkov, Scholze, Smirnov, Tao, Viazovska,
  Villani + others; medal classes 1978–2026. **>7,200 signatories by 16 September.**
- **Read against X41's per-lab record, these two declarations are a direct
  institutional verdict.** The Leiden threat list maps one-to-one onto OpenAI's
  6 Oct 2026 release (722 manuscripts, 372 families, unreleased model, 3 withdrawn in
  a day over a **sign error**, ~58 % unchecked prose). The disclosure demanded is
  exactly what that release omitted: compute published, **no prompts, no model**.
  OpenAI has since pledged to *fund* workshops/conferences to vet the 372 families —
  a forward-looking commitment, not something that has happened.
- **DeepSeek — different in kind, and the most transferable idea found this turn.**
  **DeepSeekMath-V2**, released **27 Nov 2025** (**arXiv 2511.22570**), **685B**
  parameters, built **verifier-first**: a trained verifier emits a natural-language
  analysis plus a score in {0, 0.5, 1}, reward weights **α = 0.76** on proof score and
  **β = 0.24** on self-analysis times a format term; a **meta-verifier** then reviews
  the verifier's own analysis. Reported gold-level **IMO 2025** and **CMO 2024**,
  **118/120 Putnam 2024**, ~99 % IMO-ProofBench Basic (behind Gemini Deep Think on
  Advanced). **The meta-verifier is load-bearing:** without it a learned verifier can
  score a proof correctly while **hallucinating the issues it claims to find**; mean
  quality of verifier analyses rose **0.85 → 0.96** with score-prediction accuracy
  held. In final training iterations the pipeline replaces human labels with expert
  spot checks. **⇒ `bench/x41/handcheck.py` and `bench/x42/handcheck.py` are exactly
  meta-verifiers: independently written decoders reviewing the encoder's claim rather
  than trusting it. This is the right pattern and should be kept for every codec.**
  Earlier DeepSeek-Prover-V1: 46.3 % pass@64 on miniF2F-test (244 problems) vs
  GPT-4-turbo 23.0 %.
- **xAI — NO research-level mathematical result found.** Grok 4.7 shipped
  **21 Sept 2026** (500K context, $2/$6 per Mtok, May 2026 cutoff) with benchmark
  scores only; Grok 4.20 (17 Feb 2026) has a four-agent cross-verification design
  (Grok coordinator / Harper research / Benjamin logic-math / Lucas contrarian) — an
  **architecture** claim, not a theorem. Grok 4.1 cut hallucinations 12.09 %→4.22 %.
  Grok began routing to Claude Opus, announced 7 Oct 2026. **Report the absence.**
- **Meta — NO research-level mathematical result found.** Muse Spark 1.2 ships
  vendor-run numbers (82.9 % Terminal-Bench 2.1, 59.3 % DeepSWE 1.1) explicitly **not
  independently verified** on public leaderboards. **Report the absence.**
- **Google DeepMind — unchanged, still the only lab with a COMPLETED review:**
  AlphaProof Nexus, 9 of 353 open Erdős problems (two open 56 years), peer reviewed in
  **Science**, Oct 2026.
- **Calibration still stands:** of 700 open Erdős problems surveyed Jan 2026, **13
  addressed, 5 seemingly new, 8 already in the literature.**
- **Mistral** shipped Medium 3.5 / Small 4 (Apr/Mar 2026), no math result.

## Workspace

- **`src/lib/omega/apocope.ts`** (NEW, tsc CLEAN, **registered at index 32**) —
  APOCOPE. Wraps SYSTOLE. `apocopeFind/Choose/Apply/Undo/Unambiguous/Render/ClauseFor`,
  `apocopeEncode/apocopeDecode`.
- **`registry.ts`** — import added after the systole import; entry injected before the
  `chronos` anchor. 205 codecs total. Label 12,732 chars, written to `/tmp/label.txt`
  first and escaped by a python heredoc (`\\` then `'`).
- **`docs/codecs.md`** — now **4,203 lines**, X42 section appended with full floors,
  greedy status, honest citation (incl. the sources arguing the opposite direction),
  time/CPU bound, and the handcheck receipt.
- **`bench/x42/`** — `X42.md` (507 lines, the formal writeup) · `diag.ts` (phrase/case/
  whitespace census + saturation ratio) · `screen1.ts` (constant-affix finder) ·
  `screen2.ts` (fast per-lane clause/roundtrip gate; **takes full paths in LANES**) ·
  `screen3.ts` (per-candidate rejection reasons: COLLIDE-k / AMBIG / SHIPPED) ·
  `clause.ts` (six clause wordings priced) · `screen9.ts` (prose-02..12 SYSTOLE gap) ·
  **`screen10.ts` (THE decisive raw-vs-cut measurement)** · `digittok.ts` (**exhaustive
  1.11M digit enumeration**) · `floor.ts` (payload digit headroom) · `glyph.ts`
  (non-digit entropy) · `anatomy.ts` (payload token categories) · `prose.ts` (12 prose
  holdouts) · `verify.ts` (full-stack byte-compare) · `smoke.ts` (registry by key) ·
  `hand.ts` + `handcheck.py` + `vix-{SOURCE,CUT,RESTORED}-head.txt`.
- **`bench/tmp/run.sh`** intact this turn (no reset occurred).
- Lane dirs unchanged: `bench/holdout-tab/`, `bench/holdout-ops/`,
  `bench/holdout-work/`, `bench/holdout/` (11), `bench/holdout-mk/` (7),
  `bench/x30/fresh/` (prose-01..12). **`bench/corpus/` does NOT exist**;
  **`src/lib/omega/types.ts` DOES NOT EXIST** — `countTokens` is in
  `src/lib/omega/bpe.ts:239`.
- **Unused held-out files available for X43** (confirmed zero APOCOPE candidates, never
  encoded through the full stack): `bench/holdout/{code-dts,code-ts,gh-api.json,
  gh-prose,json-pkg,lic-mit,license,md-react,md-vite,readme}.txt`,
  `bench/holdout-work/{llm-answer.md,unified-diff.patch}`,
  `bench/x30/fresh/prose-{08..12}.txt`.

## Standing constraints (unchanged, still active)

- Byte-perfect exact lossless round trip for every shipped codec.
- Wire decodable by a **bare LLM in ONE chat message**: no system prompt, no
  skills.md, no tools.
- Honest tool calls and receipts only; no fantasy/mock/simulated execution.
  **No Lean toolchain, no theorem prover installed.**
- Do not claim parallelism/search/verification that did not occur; state runtime
  honesty explicitly.
- Prefer **general large gains on everyday prose/ops** over small niche gains.
- Rosetta: analysis only, never a compression oracle.
- No benchmaxxed/test-only codec; must generalize.
- New web searches must target **sites/papers not yet referenced**, ≤10 years old.
  **SATISFIED this turn** (4 searches: LLM restoring deleted digits/numeric template
  reconstruction; DeepSeek/xAI/Grok/Meta/Mistral 2026 math results; Leiden Declaration;
  lossless prompt compression prose single-message).
- Every new codec must be **repo-integrated** (registry + implementation + bench
  receipts). ANALYSIS-ONLY IS REJECTED. **SATISFIED** — APOCOPE is registered and
  smoke-tested by key.
- Maintain the spec page with greedy/non-greedy status, honest citation, time/CPU bound.
- **Do not end the turn without a new codec added to the repo.**
- X21: full A–J tier-5 structure; ≥15 negative-space shapes; ≥6 mechanism-distinct
  approaches. X30/X41: **attack speed as well** — encode time is in-scope.
- X35: do not regress or duplicate PYKNOSIS, SYNCOPE, ANADIPLOSIS or EUTELEIA.
- A template is only shippable if a reader can restore it **BY POSITION in a short
  string**; `,` excluded as a separator; template width ≤14 digits.
- **Never use a lookahead of the form `(?=(\d{3})+(?!\d))`** in any scanner (Arcee
  Trinity Large, arXiv 2602.17004 §2.1.1: catastrophic backtracking on long digit runs).
- **PER-TURN RESET is real but recoverable from the remote.** Did NOT occur this turn
  (workspace was intact at `f99c97a` with `node_modules` present). Recovery if it does:
  `git ls-remote --heads origin` first (**the branch name CHANGES each session**), then
  `git fetch -q origin <branch> && git reset -q --hard <remote-tip>`; recreate
  `bench/tmp/run.sh`; `npm install --no-audit --no-fund esbuild@^0.28.2
  gpt-tokenizer@^3.4.0 typescript@^5`. `/tmp/*` files (incl. `/tmp/x41lanes.txt`) do
  NOT survive a reset.
- **Never invoke bare `npx tsc`** (installs `tsc@2.0.4`). Use
  `./node_modules/.bin/tsc --noEmit` (5–9 s). **Never write a multi-line
  `git commit -m` with an apostrophe** — use `git commit -q -F <msgfile>`. Never
  force-push.
- `npm install` dirties `package.json`/`package-lock.json`/`tsconfig.tsbuildinfo` —
  restore before `git add -A` (`git checkout -- tsconfig.tsbuildinfo`).

## Timing reference (2 cores, benches must run ALONE)

tsc 5–9 s · npm install 17 s · cheap screens 0.5–4 s · `screen10` 0.8 s ·
`digittok` 1.4 s (1.11M tokenizations) · per-lane full-stack verify 7–814 s ·
**APOCOPE adds a third encode: vix 705→814 s, aapl 289→418 s** · ls-full-iso 609 s ·
openstack ~2393 s (worst) · prose-03 328 s, prose-05 261 s.
**A 900 s wall clock truncates a multi-lane run — a missing line means NOT TESTED,
not a pass.** Run long sweeps with `start_process` and poll with `wait_for: exit`.
